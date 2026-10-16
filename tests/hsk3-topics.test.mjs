import assert from 'node:assert/strict';import fs from 'node:fs';import{validate,grade}from '../grading.mjs';
const root=new URL('../',import.meta.url),out=new URL('../hsk3-40/',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,out)));
const manifest=read('manifest.json'),catalog=JSON.parse(fs.readFileSync(new URL('exercise-catalog.json',root)));
assert.equal(manifest.length,40);assert.ok(catalog.exercises.length>=79);assert.equal(new Set(catalog.exercises.map(e=>e.id)).size,catalog.exercises.length);

const strip=s=>s.replace(/[，。！？、：；,.!?;:]/gu,''),han=s=>[...s].filter(c=>/[\u4e00-\u9fff]/u.test(c)).length;
let total=0,sorting=0;const sentences=new Set();
for(const m of manifest){
 const d=validate(read(m.file));assert.equal(d.questions.length,50);assert.equal(grade(d,{}).score,0);assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,q.answers[0]]))).score,100);
 assert.deepEqual(d.questions.map(q=>q.id),Array.from({length:50},(_,i)=>i+1));assert.equal(new Set(d.questions.map(q=>q.text)).size,50);
 assert.equal(new Set(m.pinyinTargetWords).size,15);assert.equal(new Set(m.fillTargetWords).size,15);assert.ok(!m.pinyinTargetWords.some(w=>m.fillTargetWords.includes(w)));
 assert.deepEqual(catalog.exercises.find(e=>e.id==='hsk3-topic-'+String(m.lesson).padStart(2,'0')).exercise,d);
 for(const [i,q]of d.questions.entries()){
  total++;assert.equal(q.points,2);assert.ok(q.vietnamese&&q.pinyin);assert.ok(!/[\u4e00-\u9fff]/u.test(q.pinyin));
  assert.equal(q.section,i<15?'拼音选择':i<30?'四选一词语填空':'句子排序');
  if(q.type==='choice'){
   assert.equal(new Set(Object.values(q.options)).size,4);
   for(const key of 'ABCD')assert.equal(grade({questions:[q]},{[q.id]:key}).score,key===q.answers[0]?2:0);
   if(i<15)assert.ok(q.pinyin.includes('____'));
   else for(const k of 'ABCD')assert.ok(q.optionPinyin[k]);
  }else{
   sorting++;assert.ok(!sentences.has(q.answers[0]));sentences.add(q.answers[0]);
   const count=han(q.answers[0]);assert.ok(count>=15&&count<=20);assert.equal(count,q.hanziCount);
   const chunks=q.text.split('\n')[1].split(' / ');assert.ok(chunks.length>=4);assert.equal(han(chunks.join('')),count);
   const letters=[...chunks.join('')].sort().join('');assert.notEqual(chunks.join(''),strip(q.answers[0]));
   for(const a of q.answers){assert.equal([...strip(a)].sort().join(''),letters);assert.equal(han(a),count);assert.equal(grade({questions:[q]},{[q.id]:a}).score,2);}
  }
 }
}
assert.equal(total,2000);assert.equal(sorting,800);
console.log('通过：40课、2000题、800个不重复排序句；每句15—20汉字、词块完整、每课100分、正确/错误/空卷评分、拼音与填空目标词分开。');
