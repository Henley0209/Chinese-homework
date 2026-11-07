// Uses the same temporary, expiring deployment credential as homework verification.
import fs from 'node:fs';
import {coursewareSource,fillCourseware,validateCoursewarePart} from '../courseware-generation.mjs';
import {coursewareSlides} from '../courseware-core.mjs';
const token=process.env.HOMEWORK_VERIFY_TOKEN;
if(!token)throw Error('Missing temporary deployment verification token');
const config=JSON.parse(fs.readFileSync('conversation-config.json')),endpoint=new URL(config.endpoint);endpoint.pathname='/courseware';endpoint.search='';
const catalog=JSON.parse(fs.readFileSync('exercise-catalog.json')).exercises;
async function request(batch){
 // Worker secret changes can take a moment to reach all isolates.
 for(let i=0;;i++){
  const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(70000),headers:{Origin:'https://henley0209.github.io','Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(batch)});
  const data=await response.json();
  if(response.status===401&&i<4){await new Promise(r=>setTimeout(r,4000));continue;}
  if(!response.ok){console.log('Verification retry:',batch.phase,batch.attempt||0,data.error);if(data.diagnostic){fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/courseware-invalid-'+batch.phase+'-'+(batch.attempt||0)+'.json',JSON.stringify(data.diagnostic,null,2));}const e=Error(data.error||'HTTP '+response.status);e.status=response.status;throw e;}
  return data.part;
 }
}
const entry=catalog.find(e=>e.id==='hsk1-2-topic-04'),source=coursewareSource(entry,entry.bank);
const deck=await fillCourseware(source,{},request,{onProgress:({phase})=>console.log('Verify full courseware:',phase)});
console.log('Verified complete lesson',deck.id,coursewareSlides(deck).length,'slides');
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/courseware-live-sample.json',JSON.stringify(deck,null,2));
for(const bank of ['hsk3','hsk4','hsk5','daily','factory']){
 const entry=catalog.find(e=>e.bank===bank&&e.id.includes('-topic-'));
 const source=coursewareSource(entry,bank),part=await request({phase:'overview',source});
 validateCoursewarePart('overview',part);fs.writeFileSync('work/courseware-overview-'+bank+'.json',JSON.stringify({source,part},null,2));console.log('Verified courseware bank:',bank,entry.id);
}
