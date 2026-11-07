import {correctCoursewarePinyin} from '../courseware-pinyin.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixtureParts} from './fixtures/courseware-ai.mjs';
import {coursewareSource,fillCourseware,assembleCourseware,validateCoursewarePart,coursewarePhases} from '../courseware-generation.mjs';
import {coursewareSlides,coursewareLabel} from '../courseware-core.mjs';
import worker from '../backend/conversation/worker.mjs';
const catalog=JSON.parse(fs.readFileSync('exercise-catalog.json')).exercises;
const entry=catalog.find(e=>e.id==='hsk3-topic-01'),source=coursewareSource(entry,entry.bank);
test('all 210 published formal themes and legacy lessons support the same template',()=>{
 const formal=catalog.filter(e=>e.id.includes('-topic-'));assert.equal(formal.length,210);
 for(const entry of catalog.filter(e=>e.bank!=='intro')){
  const source=coursewareSource(entry,entry.bank),deck=assembleCourseware(source,fixtureParts());
  assert.equal(deck.id,entry.id);assert.equal(deck.bank,entry.bank);assert.equal(coursewareLabel(deck),{'hsk1-2':'HSK1-2',hsk3:'HSK3',hsk4:'HSK4',hsk5:'HSK5',daily:'日常交际',factory:'汉语工厂'}[entry.bank]);
  assert.ok(source.context.length<=6500);assert.ok(coursewareSlides(deck).length>13);
 }
});
test('generation resumes completed phases, validates before storage and preserves cancellation',async()=>{
 const parts=fixtureParts(),draft={};let failed=true,calls=[];
 await assert.rejects(fillCourseware(source,draft,async({phase})=>{calls.push(phase);if(phase==='group2'&&failed)throw Error('temporary');return parts[phase];}));
 assert.deepEqual(Object.keys(draft),['overview','group1']);failed=false;calls=[];
 const deck=await fillCourseware(source,draft,async({phase})=>{calls.push(phase);return parts[phase];});assert.deepEqual(calls,['group2','closing']);assert.equal(deck.bank,'hsk3');
 const controller=new AbortController(),canceled={};
 await assert.rejects(fillCourseware(source,canceled,async()=>{controller.abort();return parts.overview;},{signal:controller.signal}),{name:'AbortError'});assert.deepEqual(canceled,{});
 let authCalls=0;await assert.rejects(fillCourseware(source,{},async()=>{authCalls++;const e=Error('wrong');e.status=401;throw e;}));assert.equal(authCalls,1);
 const bad=fixtureParts().group1;bad.vocabulary[0].zh='从未出现的词';assert.throws(()=>validateCoursewarePart('group1',bad));
});
test('courseware API checks origin, teacher access, bounds, quota and every generated phase',async t=>{
 const real=crypto.subtle.digest.bind(crypto.subtle);
 t.mock.method(crypto.subtle,'digest',async(algorithm,data)=>new TextDecoder().decode(data)==='teacher-fixture'?Uint8Array.from('605241b419d122752eb1878fa7b13dee955ec9f4c0e9530fe16491a9976c7120'.match(/../g).map(h=>parseInt(h,16))).buffer:real(algorithm,data));
 let quota=true,calls=0,part=fixtureParts().overview;
 const env={ALLOWED_ORIGIN:'https://henley0209.github.io',AI:{run:async(_model,params)=>{calls++;if(params.response_format.json_schema.properties.exercises){assert.deepEqual(params.response_format.json_schema.properties.exercises.items.properties.answer.enum,part.vocabulary.map(w=>w.zh));return {response:{exercises:part.exercises.map(e=>({...e,answer:e.answer.zh}))}};}return {response:part};}},LIMITS:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('',{status:quota?200:429})})}};
 const body={source,password:'teacher-fixture',phase:'overview'};
 const request=(patch={},origin=env.ALLOWED_ORIGIN)=>new Request('https://example.com/courseware',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({...body,...patch})});
 assert.equal((await worker.fetch(request({},'https://bad.example'),env)).status,403);
 assert.equal((await worker.fetch(request({password:'bad'}),env)).status,401);assert.equal(calls,0);
 assert.equal((await worker.fetch(request({source:{...source,bank:'bad'}}),env)).status,400);
 assert.equal((await worker.fetch(request({source:{...source,context:'x'.repeat(7001)}}),env)).status,400);
 assert.equal((await worker.fetch(request({phase:'group1'}),env)).status,400);
 quota=false;assert.equal((await worker.fetch(request(),env)).status,429);quota=true;
 const parts=fixtureParts();
 for(const phase of coursewarePhases){part=parts[phase];const res=await worker.fetch(request({phase,overview:parts.overview}),env);assert.equal(res.status,200,phase);validateCoursewarePart(phase,(await res.json()).part);}
 part=structuredClone(parts.overview);
 part.objectives[0]={zh:'学习请假、调班与加班的常用表达',pinyin:'xué xí qǐ jià',vi:'Học cách xin nghỉ và đổi ca.'};
 const correctedResponse=await worker.fetch(request(),env);
 assert.equal(correctedResponse.status,200);
 assert.equal((await correctedResponse.json()).part.objectives[0].pinyin,'xué xí qǐng jià、 tiáo bān yǔ jiā bān de cháng yòng biǎo dá');
 // Reproduce the reported overview/length failure, then recover each field.
 const normalRun=env.AI.run;let recoveryCalls=0;
 env.AI.run=async(_model,params)=>{
  recoveryCalls++;
  const keys=Object.keys(params.response_format.json_schema.properties);
  if(keys.length>1)return {choices:[{finish_reason:'length',message:{content:'{"title":'}}]};
  assert.match(params.messages.at(-1).content,new RegExp(keys[0]));
  return {choices:[{finish_reason:'stop',message:{content:JSON.stringify({[keys[0]]:parts.overview[keys[0]]})}}]};
 };
 const recovered=await worker.fetch(request(),env);assert.equal(recovered.status,200);
 assert.deepEqual((await recovered.json()).part,correctCoursewarePinyin(parts.overview));assert.equal(recoveryCalls,5);
 // Recurring truncation must stay bounded and must not invent a valid lesson.
 recoveryCalls=0;env.AI.run=async()=>{recoveryCalls++;return {choices:[{finish_reason:'length',message:{content:'{"title":'}}]};};
 assert.equal((await worker.fetch(request(),env)).status,502);assert.equal(recoveryCalls,2);
 env.AI.run=normalRun;
 part={};assert.equal((await worker.fetch(request(),env)).status,502);
 const noAI={...env,AI:null};assert.equal((await worker.fetch(request(),noAI)).status,503);
 const old=env.COURSEWARE_VERIFY_TOKEN=(Date.now()-900001)+'.'+'a'.repeat(64);
 const req=new Request('https://example.com/courseware',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'1','Authorization':'Bearer '+old},body:JSON.stringify({...body,password:'bad'})});assert.equal((await worker.fetch(req,env)).status,401);
});
