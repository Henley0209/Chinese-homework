import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {validateQuestions,paperLines,selectNewQuestions,questionKey} from '../homework-core.mjs';
import {makeDocx} from '../homework-docx.mjs';
import {fillHomework,missingQuestions} from '../homework-generation.mjs';
import worker,{PublishedHomework} from '../backend/conversation/worker.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const question=(kind,i)=>kind==='judgment'?{text:`第${i}组有两位同学。`,answer:'正确',explanation:'课堂记录说明每组人数。'}:kind==='fill'?{text:`第${i}组有________位同学。`,answer:'两',explanation:'根据课堂记录填空。'}:kind==='order'?{text:`我 / 今天 / 买了${i}本书`,answer:`我今天买了${i}本书。`,explanation:'按时间和动作排序。'}:kind==='translation'?{text:`Hôm nay tôi muốn mua ${i} quyển sách cho các bạn.`,answer:`我买${i}本书。`,explanation:'本是书的量词。'}:{text:`词语${i}${kind==='choice'?'________':''}`,options:['选项一','选项二','选项三'],answer:'B',explanation:'第二项正确。'};
const vocabularyQuestions=[
 {text:'行政部',options:['phòng hành chính','phòng kế toán','phòng nhân sự'],answer:'A',explanation:'行政部对应 phòng hành chính。'},
 {text:'phòng kế toán',options:['行政部','会计部','生产部'],answer:'B',explanation:'phòng kế toán 对应会计部。'}
];

test('Chinese–Vietnamese vocabulary validates both directions and exports as a choice group',()=>{
 const questions=validateQuestions(vocabularyQuestions,'vocabulary',2);
 assert.throws(()=>validateQuestions([{...questions[0],options:['行政部','phòng kế toán','phòng nhân sự']}],'vocabulary',1));
 assert.throws(()=>validateQuestions([{...questions[1],text:'phòng kế toán?'}],'vocabulary',1));
 const lines=paperLines({title:'公司部门',bank:'HSK3',questions}).map(line=>line.text).join('\n');
 assert.match(lines,/中越词语选择题/);
 assert.match(lines,/A\. phòng hành chính/);
 assert.doesNotMatch(lines,/参考答案/);
});

test('validates all six kinds, count, duplicates, options and ordering tokens',()=>{
 for(const kind of ['pinyin','choice','order','translation','judgment','fill'])assert.equal(validateQuestions([question(kind,1)],kind,1).length,1);
 assert.throws(()=>validateQuestions([], 'pinyin',5));
 assert.throws(()=>validateQuestions([question('pinyin',1),question('pinyin',1)],'pinyin',2));
 assert.throws(()=>validateQuestions([{...question('pinyin',1),answer:'D'}],'pinyin',1));
 assert.throws(()=>validateQuestions([{...question('order',1),answer:'我买书。'}],'order',1));
});
test('student paper omits answers and zero-count groups, teacher paper includes answers',async()=>{
 const paper={title:'测试<&>',bank:'HSK3',questions:[...validateQuestions([question('choice',1)],'choice',1),...validateQuestions([question('translation',1)],'translation',1)]};
 const student=paperLines(paper).map(p=>p.text).join('\n'),teacher=paperLines(paper,true).map(p=>p.text).join('\n');
 assert.match(student,/满分：4分/);assert.doesNotMatch(student,/参考答案|拼音选择题|句子排序题/);assert.match(teacher,/参考答案：B/);
 const blob=makeDocx(paper);assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const data=new Uint8Array(await blob.arrayBuffer());assert.deepEqual([...data.slice(0,4)],[80,75,3,4]);
 assert.match(new TextDecoder().decode(data),/测试&lt;&amp;&gt;/);
});
test('optional pinyin is exported under Chinese without supplying pronunciation quiz answers',()=>{
 const questions=[
  {...question('pinyin',1),kind:'pinyin',text:'图书馆',options:['tú shū guǎn','tǔ shū guǎn','tú shù guǎn']},
  {...vocabularyQuestions[1],kind:'vocabulary'},
  {...question('translation',1),kind:'translation',answer:'学校'},
 ];
 const paper={title:'测试',bank:'HSK3',questions};
 const output=(showPinyin,answers)=>paperLines({...paper,showPinyin},answers).map(line=>line.text).join('\n');
 assert.doesNotMatch(output(false,true),/xué xiào|kuài jì bù/);
 assert.match(output(true,true),/参考答案：学校\nxué xiào/u);
 assert.match(output(true,true),/参考答案：B · 会计部（kuài jì bù）/u);
 assert.match(output(true,false),/B\. 会计部（kuài jì bù）/u);
 assert.doesNotMatch(output(true,false),/图书馆（　　）\ntú shū guǎn|xué xiào/u);
});

test('homework endpoint checks origin, method, teacher authorization, limits and generated output',async t=>{
 const real=crypto.subtle.digest.bind(crypto.subtle);
 t.mock.method(crypto.subtle,'digest',async(algorithm,data)=>new TextDecoder().decode(data)==='teacher-fixture'?Uint8Array.from('605241b419d122752eb1878fa7b13dee955ec9f4c0e9530fe16491a9976c7120'.match(/../g).map(h=>parseInt(h,16))).buffer:real(algorithm,data));
 let calls=0,quota=true,result;
 const env={ALLOWED_ORIGIN:'https://henley0209.github.io',AI:{run:async()=>{calls++;return {response:result};}},LIMITS:{idFromName:v=>v,get:()=>({fetch:async()=>new Response('',{status:quota?200:429})})}};
 const body={password:'teacher-fixture',bank:'HSK3',title:'你有什么爱好？',kind:'choice',count:5,context:'运动和爱好',avoid:[]};
 const request=(patch={},origin=env.ALLOWED_ORIGIN)=>new Request('https://example.com/homework',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({...body,...patch})});
 assert.equal((await worker.fetch(request({},'https://bad.example'),env)).status,403);
 assert.equal((await worker.fetch(request({password:'wrong'}),env)).status,401);assert.equal(calls,0);
 assert.equal((await worker.fetch(request({count:20}),env)).status,400);
 quota=false;assert.equal((await worker.fetch(request(),env)).status,429);quota=true;
 for(const kind of ['pinyin','choice','order','translation','judgment','fill']){result={questions:Array.from({length:5},(_,i)=>question(kind,i+1))};const response=await worker.fetch(request({kind}),env);assert.equal(response.status,200);assert.equal((await response.json()).questions.length,5);}
 result={questions:vocabularyQuestions};
 for(const context of ['行政部负责后勤，会计部管理账目。',JSON.stringify({description:'公司部门',vocabulary:['行政部','会计部']})]){
  const response=await worker.fetch(request({kind:'vocabulary',count:2,context}),env);
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).questions,validateQuestions(vocabularyQuestions,'vocabulary',2));
 }
 result={};assert.equal((await worker.fetch(request(),env)).status,502);
 result={questions:[]};const empty=await worker.fetch(request(),env);assert.equal(empty.status,200);assert.equal((await empty.json()).needsMore,true);
 result={questions:Array.from({length:5},(_,i)=>question('choice',i+1))};const partial=await worker.fetch(request({avoid:['词语1']}),env);assert.equal(partial.status,200);const kept=await partial.json();assert.equal(kept.questions.length,4);assert.equal(kept.needsMore,true);
 result={questions:[question('choice',1),question('choice',1),{text:'无效'}]};const mixed=await worker.fetch(request(),env);assert.equal(mixed.status,200);assert.equal((await mixed.json()).questions.length,1);
 result={questions:Array(5).fill(question('choice',1))};const repeated=await worker.fetch(request({avoid:['词语1']}),env);assert.equal(repeated.status,200);assert.deepEqual((await repeated.json()).questions,[]);
});

test('deduplication normalizes punctuation and keeps valid items from mixed batches',()=>{
 assert.equal(questionKey(' ＡＢＣ， 方法！','pinyin'),questionKey('abc方法','pinyin'));
 assert.equal(questionKey('今天 / 我 / 去学校','order'),questionKey('去学校 / 今天 / 我','order'));
 const valid=question('choice',2);
 assert.deepEqual(selectNewQuestions([question('choice',1),valid,valid,{text:'坏题'}],'choice',['词语1'],5),validateQuestions([valid],'choice',1));
});
test('screenshot configuration completes all 55 questions despite duplicate and invalid items',async()=>{
 const paper={title:'HSK4 第05课 找到适合自己的方法',bank:'HSK4',questions:[]};
 const counts={pinyin:15,choice:20,order:15,translation:5};let calls=0;
 await fillHomework(paper,counts,async({kind,count,avoid,attempt})=>{
  assert.equal(attempt,calls++);
  const generated=Array.from({length:count},(_,i)=>question(kind,calls*100+i));
  if(avoid.length&&calls%2===0)generated[0]={...generated[0],text:avoid.at(-1)};
  if(calls%3===0)generated[generated.length-1]={text:'无效题'};
  return {questions:generated};
 });
 assert.equal(paper.questions.length,55);assert.equal(missingQuestions(paper,counts),0);
 for(const [kind,count]of Object.entries(counts))assert.equal(validateQuestions(paper.questions.filter(q=>q.kind===kind),kind,count).length,count);
 assert.ok(calls>11,'requests only fill missing slots after filtering');
});
test('repeated empty batches stop within a bound and preserve progress for resume',async()=>{
 const paper={questions:[]},counts={pinyin:10,choice:0,order:0,translation:0};let calls=0;
 await assert.rejects(fillHomework(paper,counts,async({count})=>({questions:++calls===1?Array.from({length:count},(_,i)=>question('pinyin',i)):[]})),/补题未完成/);
 assert.equal(calls,5);assert.equal(paper.questions.length,5);const first=structuredClone(paper.questions);
 assert.equal(missingQuestions(paper,counts),5);
 await fillHomework(paper,counts,async({count,avoid,attempt})=>{assert.equal(attempt,5);assert.equal(avoid.length,5);return {questions:Array.from({length:count},(_,i)=>question('pinyin',i+10))};});
 assert.equal(paper.questions.length,10);assert.deepEqual(paper.questions.slice(0,5),first);
});
test('authorization/quota failures are not retried; canceled batches never modify draft',async()=>{
 for(const status of [400,401,403,429]){
  let calls=0;const paper={questions:[]};await assert.rejects(fillHomework(paper,{pinyin:5},async()=>{calls++;throw Object.assign(Error('失败'),{status});}));assert.equal(calls,1);assert.equal(paper.questions.length,0);
 }
 const paper={questions:[]},controller=new AbortController();
 await assert.rejects(fillHomework(paper,{pinyin:5},async()=>{controller.abort();return {questions:Array.from({length:5},(_,i)=>question('pinyin',i))};},{signal:controller.signal}),{name:'AbortError'});
 assert.equal(paper.questions.length,0);
});
test('screenshot labels and repeated option letters are removed before preview and Word export',()=>{
 const raw={text:'1.【拼音选择】请选择“理解”的正确读音。',options:['A. A. lǐ jiě','B. B. lí jiě','C. C. lǐ jié'],answer:'答案：A',explanation:'理解读lǐ jiě。'};
 const [q]=validateQuestions([raw],'pinyin',1);assert.equal(q.text,'请选择“理解”的正确读音。');assert.deepEqual(q.options,['lǐ jiě','lí jiě','lǐ jié']);assert.equal(q.answer,'A');
 for(const answers of [false,true]){
  const lines=paperLines({title:'家庭关系与代际沟通',bank:'HSK5',questions:[{...raw,kind:'pinyin'}]},answers).map(p=>p.text).join('\n');
  assert.doesNotMatch(lines,/【拼音选择】|A\. A\.|B\. B\.|C\. C\./);assert.match(lines,/A\. lǐ jiě/);
 }
 assert.throws(()=>validateQuestions([{...raw,options:['A. lǐ jiě','B. lǐ jiě','C. lǐ jiě']}],'pinyin',1),'duplicate readings must never survive formatting cleanup');
 const [repaired]=selectNewQuestions([{...raw,options:['A. lǐ jiě','B. lǐ jiě','C. lǐ jiě']}],'pinyin');
 assert.equal(new Set(repaired.options).size,3);assert.equal(repaired.options[0],'lǐ jiě');
});
test('sorting questions use one complete sentence, preserving every word after segmentation and shuffle',()=>{
 const sentence='父母应该尊重孩子的选择，并且认真听取他们的意见。';
 const [q]=selectNewQuestions([{text:'【句子排序】父母 / 孩子 / 选择',answer:sentence,explanation:'尊重彼此的选择。'}],'order');
 assert.equal(q.answer,sentence);assert.ok(q.text.split('/').length>=3);assert.equal(validateQuestions([q],'order',1).length,1);
 const [full]=selectNewQuestions([{text:sentence,answer:sentence,explanation:'尊重彼此的选择。'}],'order');
 assert.equal(questionKey(q.text,'order'),questionKey(full.text,'order'));
 assert.deepEqual(selectNewQuestions([{text:sentence,answer:sentence,explanation:'同义题'}],'order',[q.text]),[]);
});
test('HSK5 50-question configuration tolerates labeled pinyin duplicates and full-sentence sorting output',async()=>{
 const paper={title:'HSK5 第11课 家庭关系与代际沟通',bank:'HSK5',questions:[]};let calls=0;
 const counts={pinyin:15,choice:15,order:15,translation:5};
 await fillHomework(paper,counts,async({kind,count})=>({questions:Array.from({length:count},(_,i)=>{
  const n=++calls;
  if(kind==='pinyin')return {text:`【拼音选择】词语${n}`,options:['A. lǐ jiě','B. lǐ jiě','C. lǐ jiě'],answer:'A',explanation:'注意声调。'};
  if(kind==='order'){const answer=`这个家庭每周交流${n}次，认真听取彼此的意见。`;return {text:answer,answer,explanation:'句子语序。'};}
  return question(kind,n);
 })}));
 assert.equal(paper.questions.length,50);assert.equal(missingQuestions(paper,counts),0);
 for(const kind of Object.keys(counts)){const qs=paper.questions.filter(q=>q.kind===kind);validateQuestions(qs,kind,counts[kind]);}
});

test('teachers publish a fixed homework snapshot and students open and submit without credentials',async t=>{
 const digest=crypto.subtle.digest.bind(crypto.subtle);
 t.mock.method(crypto.subtle,'digest',(algorithm,data)=>new TextDecoder().decode(data)==='teacher-fixture'
  ?Promise.resolve(Uint8Array.from(Buffer.from('605241b419d122752eb1878fa7b13dee955ec9f4c0e9530fe16491a9976c7120','hex')).buffer)
  :digest(algorithm,data));
 const stored=new Map();
 const env={
  ALLOWED_ORIGIN:'https://henley0209.github.io',
  PUBLISHED_HOMEWORK:{
   idFromName:id=>id,
   get(id){
    if(!stored.has(id))stored.set(id,new Map());
    const items=stored.get(id);
    const storage={get:key=>items.get(key),put:(key,value)=>items.set(key,value)};
    storage.transaction=update=>update(storage);
    const object=new PublishedHomework({storage});
    return {fetch:(url,init)=>object.fetch(new Request(url,init))};
   }
  }
 };
 const call=(path,body)=>worker.fetch(new Request('https://example.com/homework-'+path,{
  method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(body)
 }),env);
 const questions=['choice','judgment','fill','translation'].map(kind=>({...question(kind,1),kind}));
 questions.push({...vocabularyQuestions[0],kind:'vocabulary'});
 const draft={title:'课堂作业',bank:'HSK3',questions};
 assert.equal((await call('publish',draft)).status,401);
 const publish=paper=>call('publish',{...paper,password:'teacher-fixture'});
 assert.equal((await publish({...draft,questions:[{...questions[1],answer:'也许'}]})).status,400);
 const published=await publish(draft);
 assert.equal(published.status,201);
 const {id}=await published.json();
 draft.title='修改过的作业';
 assert.notEqual((await (await publish(draft)).json()).id,id);
 const opened=await call('open',{id});
 assert.equal(opened.status,200);
 const paper=await opened.json();
 assert.equal(paper.title,'课堂作业');
 assert.equal(paper.showPinyin,undefined);
 const pinyinId=(await (await publish({...draft,showPinyin:true})).json()).id;
 const withPinyin=await (await call('open',{id:pinyinId})).json();
 assert.equal(withPinyin.showPinyin,true);
 assert.ok(withPinyin.questions.every(q=>!Object.hasOwn(q,'answer')));
 assert.deepEqual(paper.questions.map(q=>q.kind),questions.map(q=>q.kind));
 assert.ok(paper.questions.every(q=>!Object.hasOwn(q,'answer')&&!Object.hasOwn(q,'explanation')));
 assert.equal((await call('submit',{id,answers:['B']})).status,400);
 assert.deepEqual(await (await call('submit',{id,answers:['B','错误',' 两 ','我要买书','A']})).json(),{
  score:6,total:8,
  details:questions.map(({answer,explanation},i)=>({answer,explanation,correct:[true,false,true,null,true][i]}))
 });
 assert.equal((await call('open',{id:crypto.randomUUID()})).status,404);
});
