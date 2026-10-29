import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {validateQuestions,paperLines,selectNewQuestions,questionKey} from '../homework-core.mjs';
import {makeDocx} from '../homework-docx.mjs';
import {fillHomework,missingQuestions} from '../homework-generation.mjs';
import worker from '../backend/conversation/worker.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const question=(kind,i)=>kind==='order'?{text:`我 / 今天 / 买了${i}本书`,answer:`我今天买了${i}本书。`,explanation:'按时间和动作排序。'}:kind==='translation'?{text:`Tôi mua ${i} quyển sách.`,answer:`我买${i}本书。`,explanation:'本是书的量词。'}:{text:`词语${i}`,options:['选项一','选项二','选项三'],answer:'B',explanation:'第二项正确。'};
test('validates all four kinds, count, duplicates, options and ordering tokens',()=>{
 for(const kind of ['pinyin','choice','order','translation'])assert.equal(validateQuestions([question(kind,1)],kind,1).length,1);
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
 for(const kind of ['pinyin','choice','order','translation']){result={questions:Array.from({length:5},(_,i)=>question(kind,i+1))};const response=await worker.fetch(request({kind}),env);assert.equal(response.status,200);assert.equal((await response.json()).questions.length,5);}
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
