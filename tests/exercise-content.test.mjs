import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validate,grade} from '../grading.mjs';
import {saveProgress,loadProgress} from '../exercise-progress.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalog=read('exercise-catalog.json');
const visible=catalog.exercises.filter(e=>!e.exercise.title.includes('演示练习'));
const audit=read('exercise-content-audit.json');
const normalize=s=>s.replace(/[^\p{Script=Han}A-Za-z0-9]/gu,'');
assert.equal(visible.length,213);
assert.equal(audit.courseCount,213);
assert.deepEqual(audit.courses.map(c=>c.id),visible.map(e=>e.id));

let total=0;
for(const entry of visible){
 const exercise=validate(entry.exercise),label=entry.id;
 assert.equal(exercise.contentDiversityVersion,1,label);
 total+=exercise.questions.length;
 const p=exercise.questions.filter(q=>q.section==='拼音选择').map(q=>q.targetWord);
 const f=exercise.questions.filter(q=>q.type==='choice'&&/填空/.test(q.section||''));
 assert.ok(!f.some(q=>p.includes(q.targetWord)),label+': pronunciation and fill targets overlap');
 assert.equal(new Set(p).size,p.length,label+': pronunciation targets repeat');
 assert.equal(new Set(f.map(q=>q.targetWord)).size,f.length,label+': fill targets repeat');
 const seen=new Map(),sortKeys=new Set();
 for(const q of exercise.questions){
  let full=q.completeSentence;
  if(q.type==='fill'&&q.section==='句子排序'){
   full=q.answers[0];sortKeys.add(normalize(full));
   assert.ok(q.grammarFocus,label+': missing sorting grammar');
   assert.ok(q.explanation.includes(q.grammarFocus),label+': missing explanation');
  }
  if(full){const k=normalize(full);assert.ok(!seen.has(k),`${label}: questions ${seen.get(k)} and ${q.id} repeat a complete sentence`);seen.set(k,q.id);}
  if(q.type==='choice'){
   assert.equal(new Set(Object.values(q.options)).size,4,label);
   assert.ok(q.answers.every(a=>a in q.options),label);
  }
 }
 for(const q of exercise.questions.filter(q=>q.section==='情境应答')){
  assert.ok(!Object.values(q.options).some(o=>sortKeys.has(normalize(o))),label+': situation options reveal a sorting answer');
 }
 const answers=Object.fromEntries(exercise.questions.map(q=>[q.id,q.answers[0]]));
 assert.equal(grade(exercise,answers).score,100,label);
 assert.equal(grade(exercise,{}).score,0,label);
 assert.equal(grade(exercise,Object.fromEntries(exercise.questions.map(q=>[q.id,'故意错误']))).score,0,label);
}
assert.equal(total,8665);

for(const [group,dir] of Object.entries({'hsk1-2':'hsk1-2-30',hsk3:'hsk3-40',hsk4:'hsk4-40',hsk5:'hsk5-30',daily:'daily-35',electronics:'electronics-35'})){
 const manifest=read(dir+'/manifest.json');
 for(const m of manifest){
  const id=group+'-topic-'+String(m.lesson).padStart(2,'0');
  const d=catalog.exercises.find(e=>e.id===id).exercise;
  assert.deepEqual(read(dir+'/'+m.file),d,id+': standalone copy drift');
  assert.deepEqual(m.pinyinTargetWords,d.questions.filter(q=>q.section==='拼音选择').map(q=>q.targetWord));
  assert.deepEqual(m.fillTargetWords,d.questions.filter(q=>q.type==='choice'&&/填空/.test(q.section||'')).map(q=>q.targetWord));
  assert.deepEqual(m.sortingSentences,d.questions.filter(q=>q.section==='句子排序').map(q=>q.answers[0]));
 }
}
for(const [id,path] of [['daily-lesson12-workday','banks/lesson12-workday.json'],['factory-3d7a8ec0-f828-4e4c-b02c-d547448a50f8','exercises/lesson11-work-abnormalities.json']]){
 assert.deepEqual(read(path),catalog.exercises.find(e=>e.id===id).exercise,id);
}

// Publishing revised content must never apply an old answer letter to a new question.
const revised=visible.find(e=>e.id==='hsk1-2-topic-01').exercise;
const old=structuredClone(revised);old.questions[15].text='旧版词语题';
const memory=new Map(),storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};
assert.equal(saveProgress('version-check',old,{16:'A'},{index:15,offset:0},storage),true);
assert.equal(loadProgress('version-check',revised,storage),null);
assert.equal(saveProgress('version-check',revised,{16:'A'},{index:15,offset:0},storage),true);
assert.equal(loadProgress('version-check',revised,storage).answers[16],'A');
console.log(`通过：${visible.length}门课程、${total}题，题型目标分工、整句去重、防答案泄漏、评分、文件同步与旧进度隔离。`);
