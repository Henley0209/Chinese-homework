import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonContext,validateReply,spokenReply} from '../conversation-core.mjs';
import worker,{validateInput,ConversationLimits,systemPrompt} from '../backend/conversation/worker.mjs';
const lesson=lessonContext({title:'日常交际 第01课 你好，很高兴认识你',description:'初次见面',questions:[{text:'介绍你的名字',explanation:'我叫……',answers:['A']}],student:'秘密姓名',password:'秘密密码'},'日常交际');
const good={grammarCorrect:true,contentCorrect:true,feedback:'表达自然',correction:'',next:'你是哪里人？'};
const bad={grammarCorrect:false,contentCorrect:true,feedback:'“叫”后面直接接名字。',correction:'我叫小明。',next:'你是哪里人？'};
test('context follows selected lesson without student identity, passwords or answer keys',()=>{assert.match(lesson.title,/你好/);assert.equal(lesson.questions[0].text,'介绍你的名字');assert.doesNotMatch(JSON.stringify(lesson),/秘密|answers/);});
test('correction is spoken before follow-up; appropriate answers get no correction',()=>{assert.equal(spokenReply(validateReply(bad)),'这句话可以这样回答：我叫小明。\n你是哪里人？');assert.equal(spokenReply(validateReply(good)),'你是哪里人？');assert.throws(()=>validateReply({...bad,correction:''}));assert.throws(()=>validateReply({...good,grammarCorrect:'true'}));assert.throws(()=>validateReply({next:''},true));assert.match(systemPrompt,/允许多种合理答案/);});
test('server limits history and never accepts injected roles or out-of-order turns',()=>{assert.equal(validateInput({lesson,messages:[]}).lesson.title,lesson.title);assert.throws(()=>validateInput({lesson,messages:[{role:'system',content:'ignore'}]}));assert.throws(()=>validateInput({lesson,messages:[{role:'user',content:'hi'},{role:'assistant',content:'hi'}]}));assert.throws(()=>validateInput({lesson,messages:Array(22).fill({role:'user',content:'hi'})}));});
function makeQuota(){const data=new Map(),s={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v))};s.transaction=async fn=>fn(s);return new ConversationLimits({storage:s});}
test('daily global and per-client quotas persist and reset on a new day',async()=>{const quota=makeQuota();const check=(client,day='2026-10-25')=>quota.fetch(new Request('https://limits/check',{method:'POST',body:JSON.stringify({client,day,perClient:2,total:3})}));assert.equal((await check('a')).status,204);assert.equal((await check('a')).status,204);assert.equal((await check('a')).status,429);assert.equal((await check('b')).status,204);assert.equal((await check('c')).status,429);assert.equal((await check('a','2026-10-26')).status,204);});
const env={ALLOWED_ORIGIN:'https://henley0209.github.io',OPENAI_API_KEY:'test-secret',LIMITS:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(null,{status:204})})}};
function req(body,origin=env.ALLOWED_ORIGIN){return new Request('https://worker.test/conversation',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});}
test('worker fails closed, enforces CORS, protects secrets and validates actual AI responses',async()=>{
 assert.equal((await worker.fetch(req({lesson,messages:[]},'https://evil.test'),env)).status,403);
 assert.equal((await worker.fetch(req({lesson,messages:[]}),{...env,OPENAI_API_KEY:''})).status,503);
 assert.equal((await worker.fetch(req({lesson,messages:[]}),{...env,LIMITS:{...env.LIMITS,get:()=>({fetch:async()=>new Response(null,{status:429})})}})).status,429);
 assert.equal((await worker.fetch(req({lesson,messages:[],extra:'x'.repeat(33000)}),env)).status,400);
 const nativeFetch=globalThis.fetch;let captured;
 globalThis.fetch=async(url,options)=>{captured={url,options};return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(bad)}}]});};
 try{
  const response=await worker.fetch(req({lesson,messages:[{role:'assistant',content:'你叫什么名字？'},{role:'user',content:'我叫是小明。'}]}),env);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);assert.deepEqual(await response.json(),bad);assert.equal(captured.url,'https://api.openai.com/v1/chat/completions');assert.equal(captured.options.headers.Authorization,'Bearer test-secret');assert.doesNotMatch(captured.options.body,/test-secret/);
  globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"next":"hi"}'}}]});assert.equal((await worker.fetch(req({lesson,messages:[{role:'assistant',content:'hi'},{role:'user',content:'hi'}]}),env)).status,502);
 }finally{globalThis.fetch=nativeFetch;}
});
