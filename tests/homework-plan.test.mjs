import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {courseTasks,plannedQuestions,referenceQuestion} from '../homework-plan.mjs';
import {validTargets} from '../backend/conversation/homework-planned.mjs';
import {fillHomework,missingQuestions} from '../homework-generation.mjs';
import {validateQuestions} from '../homework-core.mjs';
import {validateHistory} from '../change-history.mjs';
import worker from '../backend/conversation/worker.mjs';
function course(folder,file){const exercise=JSON.parse(fs.readFileSync(folder+'/'+file));const related=fs.readdirSync(folder).filter(f=>/^lesson-\d+\.json$/.test(f)).map(f=>JSON.parse(fs.readFileSync(folder+'/'+f)));return {exercise,tasks:courseTasks(exercise,related)};}
function environment(){return {HOMEWORK_VERIFY_TOKEN:Date.now()+'.'+'a'.repeat(64),ALLOWED_ORIGIN:'https://henley0209.github.io',AI:{run:async(model,params)=>{
 const input=JSON.parse(params.messages[1].content);
 return {response:{questions:input.targets.map((t,i)=>({id:t.id,text:input.targets[0].id.startsWith('translation:')?`Bản dịch ${t.id}`:t.sentence||`我们应该认真理解${t.word}的含义。`,answer:t.sentence||`我们认真理解${t.word}。`}))}};
 }},LIMITS:{idFromName:v=>v,get:()=>({fetch:async()=>new Response('')})}};}
function request(env,body){return new Request('https://worker.test/homework',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,Authorization:'Bearer '+env.HOMEWORK_VERIFY_TOKEN,'CF-Connecting-IP':'127.0.0.1','Content-Type':'application/json'},body:JSON.stringify(body)});}
test('selected HSK4 and HSK5 courses supply enough different targets and verified readings',()=>{
 for(const [folder,file]of [['hsk4-40','lesson-08.json'],['hsk5-30','lesson-11.json']]){
  const {tasks}=course(folder,file);
  for(const kind of Object.keys(tasks)){assert.ok(tasks[kind].length>=20);assert.ok(validTargets(tasks[kind].slice(0,5),5));}
  for(const target of tasks.pinyin.slice(0,20)){const q=referenceQuestion('pinyin',target);assert.ok(q);assert.equal(q.options['ABC'.indexOf(q.answer)],target.reading);}
 }
});
test('real course 50-question flow survives repeated AI text and invalid batches without losing slots',async()=>{
 for(const [bank,folder,file]of [['HSK4','hsk4-40','lesson-08.json'],['HSK5','hsk5-30','lesson-11.json']]){
  const {exercise,tasks}=course(folder,file),env=environment();const original=env.AI.run;let aiCalls=0;
  env.AI.run=async(model,params)=>{aiCalls++;const input=JSON.parse(params.messages[1].content);if(input.targets[0].id.startsWith('translation:'))return original(model,params);return {response:{questions:input.targets.map(t=>({id:t.id,text:'父母应该认真听取孩子的意见。'}))}};};
  const counts={pinyin:15,choice:15,order:15,translation:5},paper={bank,title:exercise.title,questions:[]};
  await fillHomework(paper,counts,async batch=>{const response=await worker.fetch(request(env,{bank,title:paper.title,context:'',...batch}),env);const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error),{status:response.status});return data;},{tasks});
  assert.equal(paper.questions.length,50);assert.equal(missingQuestions(paper,counts),0);assert.ok(aiCalls>0);
  assert.equal(paper.questions.filter(q=>q.source==='course-vocabulary').length,15);assert.ok(paper.questions.some(q=>q.source==='course-reference'));
  for(const [kind,count]of Object.entries(counts))validateQuestions(paper.questions.filter(q=>q.kind===kind),kind,count);
 }
});
test('diagnostic authorization expires and never accepts a missing or wrong credential',async()=>{
 const env=environment(),{exercise,tasks}=course('hsk4-40','lesson-08.json');
 const body={bank:'HSK4',title:exercise.title,kind:'pinyin',count:5,context:'',targets:tasks.pinyin.slice(0,5)};
 assert.equal((await worker.fetch(request(env,body),env)).status,200);
 const old=env.HOMEWORK_VERIFY_TOKEN;env.HOMEWORK_VERIFY_TOKEN=(Date.now()-16*60*1000)+'.'+'a'.repeat(64);
 assert.equal((await worker.fetch(request(env,body),env)).status,401);
 env.HOMEWORK_VERIFY_TOKEN=old;const req=request(env,body);req.headers.delete('Authorization');assert.equal((await worker.fetch(req,env)).status,401);
});
test('target validation rejects oversized or malformed references and translation never uses reference text as Vietnamese',()=>{
 assert.equal(validTargets([{id:'a',word:'美',sentence:'生活不缺少美',options:[]}],1),true);
 assert.equal(validTargets([{id:'a',word:'美',sentence:'x'.repeat(601),options:[]}],1),false);
 const targets=[{id:'t',word:'美',sentence:'生活不缺少美',options:[]}];
 assert.deepEqual(plannedQuestions('translation',targets,[{id:'t',text:'生活不缺少美'}]).questions,[]);
});
test('history contains every imported version, stable numbering from V0001, timestamp and current changes',()=>{
 const data=JSON.parse(fs.readFileSync('change-history.json'));const entries=validateHistory(data);assert.ok(entries.length>=201);assert.equal(entries[0].version,'V0001');assert.ok(entries.some(e=>e.version==='V0201'&&e.changes.some(t=>t.includes('变更记录'))));
 assert.throws(()=>validateHistory({entries:[{...entries[0],version:'V0002'}]}));
});
