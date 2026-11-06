import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractChinese,readCourseware,coursewareContext} from '../homework-courseware.mjs';
import {coursewareTasks,checkCoursewareCounts} from '../homework-courseware-plan.mjs';
import {fillHomework} from '../homework-generation.mjs';
import {validateQuestions,questionKey} from '../homework-core.mjs';
import worker from '../backend/conversation/worker.mjs';
const bilingual=fs.readFileSync(new URL('./fixtures/courseware-bilingual.txt',import.meta.url),'utf8');
test('bilingual documents keep only Chinese, including inline labels, before truncation and sending',async()=>{
 const text=extractChinese(bilingual);assert.doesNotMatch(text,/\p{Script=Latin}|\d/u);assert.match(text,/住院/);assert.match(text,/你请过事假吗/);
 assert.equal(extractChinese(text),text);assert.equal(extractChinese('Only English\nChỉ tiếng Việt\n123'),'');
 const blob=Object.assign(new Blob(['English '.repeat(2000)+bilingual]),{name:'课件.txt'});
 const parsed=await readCourseware(blob);assert.match(parsed.text,/年假/);assert.doesNotMatch(parsed.text,/English/);
 assert.equal(JSON.parse(coursewareContext(bilingual)).content,text);
 await assert.rejects(readCourseware(Object.assign(new Blob(['Tiếng Việt only']),{name:'课件.txt'})),/汉字/);
});
test('short documents report capacity rather than repeatedly requesting duplicate vocabulary',()=>{
 const tasks=coursewareTasks('你好');assert.throws(()=>checkCoursewareCounts(tasks,{pinyin:15}),/减少相应题数/);
});
test('screenshot 15/15/15/5 completes via actual worker target route with explicit vocabulary and sentence targets',async()=>{
 const tasks=coursewareTasks(bilingual),counts={pinyin:15,choice:15,order:15,translation:5};checkCoursewareCounts(tasks,counts);
 const env={HOMEWORK_VERIFY_TOKEN:Date.now()+'.'+'b'.repeat(64),ALLOWED_ORIGIN:'https://henley0209.github.io',AI:{run:async(model,params)=>{
  const input=JSON.parse(params.messages[1].content);return {response:{questions:input.targets.map((t,i)=>({id:t.id,reading:'xué xí',text:t.id.startsWith('cw-translation:')?`Hôm nay tôi muốn cùng bạn tìm hiểu câu số ${input.attempt * 5 + i + 1}.`:t.id.startsWith('cw-choice:')?`第${input.attempt * 5 + i + 1}位员工正在认真学习${t.word}的用法。`:t.sentence||`老师要求学生认真学习${t.word}这个词语。`,answer:t.sentence||`老师要求学生认真学习${t.word}这个词语。`}))}};
 }},LIMITS:{idFromName:v=>v,get:()=>({fetch:async()=>new Response('')})}};
 const paper={bank:'HSK3',title:'请假',questions:[]};let calls=0;
 await fillHomework(paper,counts,async batch=>{
  assert.ok(batch.targets?.length);assert.equal(batch.count,batch.targets.length);calls++;
  for(const t of batch.targets)assert.doesNotMatch(t.word+t.sentence,/\p{Script=Latin}/u);
  const request=new Request('https://worker.test/homework',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,Authorization:'Bearer '+env.HOMEWORK_VERIFY_TOKEN,'CF-Connecting-IP':'127.0.0.1','Content-Type':'application/json'},body:JSON.stringify({...batch,bank:paper.bank,title:paper.title,context:coursewareContext(bilingual)})});
  const response=await worker.fetch(request,env),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;
 },{tasks});
 assert.equal(paper.questions.length,50);assert.ok(calls<30);
 for(const [kind,count]of Object.entries(counts)){
  const questions=paper.questions.filter(q=>q.kind===kind);assert.equal(validateQuestions(questions,kind,count).length,count);
  assert.equal(new Set(questions.map(q=>questionKey(q.text,kind))).size,count);
 }
});
test('one stalled question type does not block the remaining types; retries keep existing progress',async()=>{
 const paper={questions:[]};const counts={pinyin:5,choice:5};
 await assert.rejects(fillHomework(paper,counts,async({kind,count})=>({questions:kind==='pinyin'?[]:Array.from({length:count},(_,i)=>({text:`今天________词语${i}`,options:['学习','工作','休息'],answer:'A',explanation:'选择学习。'}))})),/拼音选择题/);
 assert.equal(paper.questions.filter(q=>q.kind==='choice').length,5);
});
