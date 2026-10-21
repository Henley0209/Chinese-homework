import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate,grade} from '../grading.mjs';
import {validateCatalog,loadCatalog,listExercises,getExercise} from '../exercise-store.mjs';
import {studentExercises} from '../exercise-options.mjs';
import {progressKey,saveProgress,loadProgress} from '../exercise-progress.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('exercise-catalog.json'),manifest=read('hsk4-40/manifest.json');
const textbookTitles=['简单的爱情','真正的朋友','工作再忙也别忘了锻炼','不要太着急买','找到适合自己的方法','一分钱一分货','最好的医生是自己','生活中不缺少美','阳光总在风雨后','幸福的标准','读书好，读好书，好读书','用心发现世界','喝着茶看京剧','保护地球母亲','教育孩子的艺术','生活可以更美好','人与自然','科技与世界','生活的味道','路上的风景'];
assert.equal(manifest.length,40);assert.deepEqual(manifest.slice(0,20).map(m=>m.title),textbookTitles);
assert.equal(validateCatalog(catalog).exercises.length,catalog.exercises.length);
assert.equal(catalog.exercises.filter(e=>!/^(daily|electronics)-topic-\d{2}$/.test(e.id)&&(e.bank!=='hsk5'||!e.id.startsWith('hsk5-topic-'))).length,119);
const sentences=new Set(),keys='ABCD',han=s=>[...s].filter(c=>/[\u4e00-\u9fff]/u.test(c)).length;
const letters=s=>[...s.replace(/[，。！？、：；,.!?;:]/gu,'')].sort().join('');
for(const m of manifest){
 const d=validate(read('hsk4-40/'+m.file));
 assert.equal(d.questions.length,50);assert.deepEqual(d.questions.map(q=>q.id),Array.from({length:50},(_,i)=>i+1));
 assert.equal(new Set(d.questions.map(q=>q.text)).size,50);
 assert.equal(new Set(m.pinyinTargetWords).size,15);assert.equal(new Set(m.fillTargetWords).size,15);
 assert.ok(!m.pinyinTargetWords.some(w=>m.fillTargetWords.includes(w)));
 const entry=catalog.exercises.find(e=>e.id==='hsk4-topic-'+String(m.lesson).padStart(2,'0'));
 assert.equal(entry.bank,'hsk4');assert.deepEqual(entry.exercise,d);
 assert.equal(grade(d,{}).score,0);assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,q.answers[0]]))).score,100);
 for(const [i,q]of d.questions.entries()){
  assert.equal(q.points,2);assert.ok(q.pinyin&&q.vietnamese&&q.explanation);assert.ok(!/[\u4e00-\u9fff]/u.test(q.pinyin));
  assert.equal(q.section,i<15?'拼音选择':i<30?'四选一词语填空':'句子排序');
  if(q.type==='choice'){
   assert.equal(new Set(Object.values(q.options)).size,4);
   for(const key of keys)assert.equal(grade({questions:[q]},{[q.id]:key}).score,q.answers[0]===key?2:0);
   if(i<15){assert.ok(q.pinyin.includes('____'));assert.ok(!/[\u4e00-\u9fff]/u.test(Object.values(q.options).join('')));}
   else{assert.equal((q.text.match(/____/g)||[]).length,1);for(const key of keys)assert.ok(q.optionPinyin[key]);}
  }else{
   assert.ok(!sentences.has(q.answers[0]));sentences.add(q.answers[0]);
   assert.ok(q.hanziCount>=15&&q.hanziCount<=28);assert.equal(han(q.answers[0]),q.hanziCount);
   const chunks=q.text.split('\n')[1].split(' / ');assert.ok(chunks.length>=4);
   assert.equal(han(chunks.join('')),q.hanziCount);assert.notEqual(chunks.join('')+'。',q.answers[0]);
   for(const answer of q.answers){assert.equal(letters(answer),letters(chunks.join('')));assert.equal(grade({questions:[q]},{[q.id]:answer}).score,2);}
   assert.equal(grade({questions:[q]},{[q.id]:'不相关的答案'}).score,0);
  }
 }
}
assert.equal(sentences.size,800);
// Load the actual merged catalog through the same store used by the student selector.
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(catalog)});
await loadCatalog();const lessons=studentExercises(listExercises('hsk4'));
assert.equal(lessons.length,40);assert.deepEqual(lessons.map(e=>e.id),manifest.map(m=>'hsk4-topic-'+String(m.lesson).padStart(2,'0')));
for(const e of lessons)assert.deepEqual(getExercise('hsk4',e.id),e.exercise);
const last=lessons[39],answers=Object.fromEntries(last.exercise.questions.slice(0,19).map(q=>[q.id,q.answers[0]]));
const key=progressKey('测试学生','hsk4',last.id);assert.equal(saveProgress(key,last.exercise,answers,{index:19,offset:0}),true);
const resumed=loadProgress(key,getExercise('hsk4',last.id));assert.equal(resumed.position.index,19);
for(const q of last.exercise.questions.slice(0,19))assert.equal(resumed.answers[q.id],q.answers[0]);
const invalid={version:1,exercises:Array.from({length:501},()=>catalog.exercises[0])};assert.throws(()=>validateCatalog(invalid),/500/);
console.log('通过：40课2000题、800个独立排序句、全部评分、原119份题库完整保留、学生选课及第20题进度恢复。');
