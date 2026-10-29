import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {validateQuestions,paperLines} from '../homework-core.mjs';
import {makeDocx} from '../homework-docx.mjs';
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
 result={questions:[]};assert.equal((await worker.fetch(request(),env)).status,502);
 result={questions:Array.from({length:5},(_,i)=>question('choice',i+1))};assert.equal((await worker.fetch(request({avoid:['词语1']}),env)).status,502);
});
