import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate,grade} from '../grading.mjs';
import {validateCatalog,loadCatalog,listExercises,getExercise} from '../exercise-store.mjs';
import {studentExercises} from '../exercise-options.mjs';
import {progressKey,saveProgress,loadProgress} from '../exercise-progress.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('exercise-catalog.json'),manifest=read('hsk5-30/manifest.json');
assert.equal(manifest.length,30);assert.equal(validateCatalog(catalog).exercises.length,149);
const sentences=new Set(),letters=s=>[...s.replace(/[。.]/gu,'')].sort().join('');
for(const m of manifest){
 const d=validate(read('hsk5-30/'+m.file));assert.equal(d.questions.length,20);
 assert.deepEqual(d.questions.map(q=>q.id),Array.from({length:20},(_,i)=>i+1));
 const entry=catalog.exercises.find(e=>e.id==='hsk5-topic-'+String(m.lesson).padStart(2,'0'));
 assert.equal(entry.bank,'hsk5');assert.deepEqual(entry.exercise,d);
 assert.equal(grade(d,{}).score,0);
 assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,q.answers[0]]))).score,100);
 assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,'错误答案']))).score,0);
 for(const [i,q] of d.questions.entries()){
  assert.equal(q.points,5);assert.ok(q.pinyin&&q.vietnamese&&q.explanation);
  assert.ok(!/[\u4e00-\u9fff]/u.test(q.pinyin));
  assert.equal(q.section,i<5?'拼音选择':i<10?'四选一词语填空':'句子排序');
  if(q.type==='choice'){
   assert.equal(new Set(Object.values(q.options)).size,4);
   for(const key of 'ABCD')assert.equal(grade({questions:[q]},{[q.id]:key}).score,q.answers[0]===key?5:0);
   if(i<5)assert.ok(q.pinyin.includes('____'));
   else{assert.equal((q.text.match(/____/g)||[]).length,1);for(const key of 'ABCD')assert.ok(q.optionPinyin[key]);}
  }else{
   assert.ok(!sentences.has(q.answers[0]));sentences.add(q.answers[0]);
   const chunks=q.text.split('\n')[1].split(' / ');assert.ok(chunks.length>=4);
   assert.notEqual(chunks.join(''),q.answers[1]);
   for(const answer of q.answers){assert.equal(letters(answer),letters(chunks.join('')));assert.equal(grade({questions:[q]},{[q.id]:answer}).score,5);}
  }
 }
}
assert.equal(sentences.size,300);
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(catalog)});
await loadCatalog();const lessons=studentExercises(listExercises('hsk5'));assert.equal(lessons.length,30);
assert.deepEqual(lessons.map(e=>e.id),manifest.map(m=>'hsk5-topic-'+String(m.lesson).padStart(2,'0')));
const last=lessons[29],key=progressKey('测试学生','hsk5',last.id);
const answers=Object.fromEntries(last.exercise.questions.slice(0,7).map(q=>[q.id,q.answers[0]]));
assert.equal(saveProgress(key,last.exercise,answers,{index:7,offset:0}),true);
const resumed=loadProgress(key,getExercise('hsk5',last.id));assert.equal(resumed.position.index,7);for(const q of last.exercise.questions)assert.equal(resumed.answers[q.id],answers[q.id]||'');
console.log('通过：HSK5 30课600题、300个独立排序句、评分、选课、答案恢复；149份题库完整。');
