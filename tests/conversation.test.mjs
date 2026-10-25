import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonContext,validateReply,spokenReply} from '../conversation-core.mjs';
import worker,{validateInput,ConversationLimits,systemPrompt} from '../backend/conversation/worker.mjs';
const lesson=lessonContext({title:'日常交际 第01课 你好，很高兴认识你',description:'初次见面',questions:[{text:'介绍你的名字',explanation:'我叫……',answers:['A']}],student:'秘密姓名',password:'秘密密码'},'日常交际');
const good={grammarCorrect:true,contentCorrect:true,feedback:'表达自然',correction:'',next:'你是哪里人？',nextKeywords:['中国','越南','人'],nextPinyin:'Nǐ shì nǎlǐ rén?',feedbackPinyin:'Biǎodá zìrán.',correctionPinyin:'',answerPinyin:'Wǒ hěn hǎo.'};
const bad={grammarCorrect:false,contentCorrect:true,feedback:'“叫”后面直接接名字。',correction:'我叫小明。',next:'你是哪里人？',nextKeywords:['中国','越南','人'],nextPinyin:'Nǐ shì nǎlǐ rén?',feedbackPinyin:'Jiào hòumiàn zhíjiē jiē míngzi.',correctionPinyin:'Wǒ jiào Xiǎomíng.',answerPinyin:'Wǒ jiào shì Xiǎomíng.'};
test('context follows selected lesson without student identity, passwords or answer keys',()=>{assert.match(lesson.title,/你好/);assert.equal(lesson.questions[0].text,'介绍你的名字');assert.doesNotMatch(JSON.stringify(lesson),/秘密|answers/);});
test('correction is spoken before follow-up; appropriate answers get no correction',()=>{assert.equal(spokenReply(validateReply(bad)),'这句话可以这样回答：我叫小明。\n你是哪里人？');assert.equal(spokenReply(validateReply(good)),'你是哪里人？');assert.throws(()=>validateReply({...bad,correction:''}));assert.throws(()=>validateReply({...good,grammarCorrect:'true'}));assert.throws(()=>validateReply({next:''},true));assert.match(systemPrompt,/允许多种合理答案/);});
test('server limits history and never accepts injected roles or out-of-order turns',()=>{assert.equal(validateInput({lesson,messages:[]}).lesson.title,lesson.title);assert.throws(()=>validateInput({lesson,messages:[{role:'system',content:'ignore'}]}));assert.throws(()=>validateInput({lesson,messages:[{role:'user',content:'hi'},{role:'assistant',content:'hi'}]}));assert.throws(()=>validateInput({lesson,messages:Array(22).fill({role:'user',content:'hi'})}));});
function makeQuota(){const data=new Map(),s={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v))};s.transaction=async fn=>fn(s);return new ConversationLimits({storage:s});}
test('daily global and per-client quotas persist and reset on a new day',async()=>{const quota=makeQuota();const check=(client,day='2026-10-25')=>quota.fetch(new Request('https://limits/check',{method:'POST',body:JSON.stringify({client,day,perClient:2,total:3})}));assert.equal((await check('a')).status,204);assert.equal((await check('a')).status,204);assert.equal((await check('a')).status,429);assert.equal((await check('b')).status,204);assert.equal((await check('c')).status,429);assert.equal((await check('a','2026-10-26')).status,204);});
const env={ALLOWED_ORIGIN:'https://henley0209.github.io',AI:{run:async()=>({response:good})},LIMITS:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(null,{status:204})})}};
function req(body,origin=env.ALLOWED_ORIGIN){return new Request('https://worker.test/conversation',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});}
test('worker fails closed, enforces CORS, protects secrets and validates actual AI responses',async()=>{
 assert.equal((await worker.fetch(req({lesson,messages:[]},'https://evil.test'),env)).status,403);
 assert.equal((await worker.fetch(req({lesson,messages:[]}),{...env,AI:null})).status,503);
 assert.equal((await worker.fetch(req({lesson,messages:[]}),{...env,LIMITS:{...env.LIMITS,get:()=>({fetch:async()=>new Response(null,{status:429})})}})).status,429);
 assert.equal((await worker.fetch(req({lesson,messages:[],extra:'x'.repeat(33000)}),env)).status,400);
 let captured;
 const configured={...env,AI:{run:async(model,options)=>{captured={model,options};return {response:bad};}}};
 const response=await worker.fetch(req({lesson,messages:[{role:'assistant',content:'你今天做什么？'},{role:'user',content:'我叫是小明。'}]}),configured);
 assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);assert.deepEqual(await response.json(),bad);assert.equal(captured.model,'@cf/qwen/qwen3-30b-a3b-fp8');assert.equal(captured.options.response_format.type,'json_schema');assert.equal(captured.options.max_tokens,1600);
 const malformed={...env,AI:{run:async()=>({response:{next:'hi'}})}};
 assert.equal((await worker.fetch(req({lesson,messages:[{role:'assistant',content:'hi'},{role:'user',content:'hi'}]}),malformed)).status,502);
 const choices={...env,AI:{run:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(good)}}]})}};
 assert.equal((await worker.fetch(req({lesson,messages:[]}),choices)).status,200);
 const exhausted={...env,AI:{run:async()=>{throw Error('daily neuron quota exceeded');}}};
 assert.equal((await worker.fetch(req({lesson,messages:[]}),exhausted)).status,429);
});

test('cloud speech supports devices without Xiaoxiao and enforces input limits',async()=>{
 let captured;const speechEnv={...env,AI:{run:async(model,input)=>{captured={model,input};return {audio:btoa('x'.repeat(256))};}}};
 const request=text=>new Request('https://worker.test/speech',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({text})});
 const response=await worker.fetch(request('你好！你好吗？'),speechEnv);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'audio/mpeg');assert.equal((await response.arrayBuffer()).byteLength,256);assert.equal(captured.model,'@cf/myshell-ai/melotts');assert.equal(captured.input.lang,'zh');assert.equal((await worker.fetch(request('x'.repeat(1201)),speechEnv)).status,400);
});

test('cloud transcription accepts bounded audio and rejects malformed input',async()=>{
 let modelName;const configured={...env,AI:{run:async(model,input)=>{modelName=model;assert.equal(input.audio.length,256);return {text:'我很好，谢谢。'};}}};
 const request=(body,type='audio/webm')=>new Request('https://worker.test/transcribe',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':type,'CF-Connecting-IP':'192.0.2.1'},body});
 const result=await worker.fetch(request(new Uint8Array(256)),configured);assert.equal(result.status,200);assert.deepEqual(await result.json(),{text:'我很好，谢谢。'});assert.equal(modelName,'@cf/openai/whisper');assert.equal((await worker.fetch(request(new Uint8Array(256),'text/plain'),configured)).status,415);assert.equal((await worker.fetch(request(new Uint8Array(1048577)),configured)).status,400);assert.equal((await worker.fetch(request(new Uint8Array(2)),configured)).status,400);
});

test('pinyin is required and question skipping is not a fabricated student answer',()=>{
 assert.throws(()=>validateReply({...bad,correctionPinyin:''}));assert.throws(()=>validateReply({...good,nextPinyin:''}));
 const skipped=validateInput({lesson,action:'next',progress:{questionNumber:4,correctAnswers:3},messages:[{role:'assistant',content:'你好吗？'}]});assert.equal(skipped.action,'next');assert.equal(skipped.messages.length,1);assert.equal(skipped.progress.correctAnswers,3);
 assert.throws(()=>validateInput({lesson,action:'next',messages:[]}));assert.throws(()=>validateInput({lesson,action:'answer',messages:[]}));assert.throws(()=>validateInput({lesson,messages:[],progress:{questionNumber:-1,correctAnswers:0}}));
 assert.match(systemPrompt,/从简单到复杂/);assert.match(systemPrompt,/答错时维持或降低难度/);
});

test('difficulty rises only with verified correct-answer progress',async()=>{
 let prompt;const configured={...env,AI:{run:async(model,options)=>{prompt=options.messages[0].content;return {response:good};}}};
 const response=await worker.fetch(req({lesson,action:'next',progress:{questionNumber:7,correctAnswers:6},messages:[{role:'assistant',content:'你好吗？'}]}),configured);assert.equal(response.status,200);assert.match(prompt,/学习阶段：3/);assert.match(prompt,/答错时维持或降低难度/);
});

test('matching a question keyword accepts a short or ungrammatical answer',async()=>{
 const configured={...env,AI:{run:async()=>({response:bad})}};
 const response=await worker.fetch(req({lesson,action:'answer',keywords:['好','不错'],messages:[{role:'assistant',content:'你好吗？'},{role:'user',content:'我很好是，谢谢。'}]}),configured);const value=await response.json();assert.equal(response.status,200);assert.equal(value.grammarCorrect,true);assert.equal(value.contentCorrect,true);assert.equal(value.correction,'');assert.equal(value.correctionPinyin,'');assert.match(value.feedback,/关键词/);assert.equal(validateReply(value).needsCorrection,false);
});
test('traditional transcripts are simplified; non-Chinese speech is not submitted',async()=>{
 const speech=text=>({...env,AI:{run:async()=>({text})}});const request=()=>new Request('https://worker.test/transcribe',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'audio/webm','CF-Connecting-IP':'192.0.2.1'},body:new Uint8Array(256)});
 assert.equal((await (await worker.fetch(request(),speech('老師您好，我在學習漢語。'))).json()).text,'老师您好，我在学习汉语。');assert.equal((await worker.fetch(request(),speech('hello teacher'))).status,422);
});

test('pre-generated next questions use assessment-only output and preserve the exact bank question',async()=>{
 let schema,prompt;const {next,nextPinyin,nextKeywords,...assessment}=good;
 const configured={...env,AI:{run:async(model,input)=>{schema=input.response_format.json_schema;prompt=input.messages[1].content;return {response:assessment};}}};
 const preset={question:'你今天忙吗？',pinyin:'Nǐ jīntiān máng ma?',keywords:['忙','不忙']};
 const response=await worker.fetch(req({lesson,action:'answer',messages:[{role:'assistant',content:'你好吗？'},{role:'user',content:'好'}],keywords:['好'],expectedAnswer:'我很好，谢谢。',nextQuestion:preset}),configured);const value=await response.json();assert.equal(response.status,200);assert.equal(value.next,preset.question);assert.equal(value.nextPinyin,preset.pinyin);assert.deepEqual(value.nextKeywords,preset.keywords);assert.equal(schema.properties.next,undefined);assert.match(prompt,/我很好，谢谢/);
 assert.equal((await worker.fetch(req({lesson,messages:[],nextQuestion:{question:'',pinyin:'',keywords:[]}}),configured)).status,400);
});
