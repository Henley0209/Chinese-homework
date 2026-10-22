import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate,grade} from '../grading.mjs';
import {validateCatalog,loadCatalog,listExercises,getExercise} from '../exercise-store.mjs';
import {studentExercises} from '../exercise-options.mjs';
import {progressKey,saveProgress,loadProgress} from '../exercise-progress.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('exercise-catalog.json'),manifest=read('daily-35/manifest.json');
assert.equal(manifest.length,35);assert.equal(validateCatalog(catalog).exercises.filter(e=>!/^electronics-topic-\d{2}$/.test(e.id)).length,184);
assert.equal(catalog.exercises.filter(e=>!/^(daily|electronics)-topic-\d{2}$/.test(e.id)).length,149);
assert.ok(catalog.exercises.some(e=>e.id==='daily-lesson12-workday'&&e.exercise.title==='第12课 我每天的工作'));
const expected=['你好，很高兴认识你','你最近怎么样','介绍我的家人','我的兴趣爱好','我的一天','你什么时候有空','今天天气怎么样','周末一起去哪儿','这附近有地铁站吗','坐公交还是坐地铁','师傅，请到这个地址','我想买一张车票','这个多少钱','我想试一下这件衣服','去超市买东西','这个商品可以退换吗','服务员，我们要点菜','你想喝点什么','请你尝尝越南菜','今天我们自己做饭','我想订一个房间','我想租一套房子','家里的空调坏了','我的快递到哪儿了','我想办一张电话卡','可以扫码付款吗','我最近有点不舒服','这个药怎么吃','我想预约理发','喂，请问你找谁','来我家做客吧','谢谢你，麻烦你了','对不起，我来晚了','我觉得这样更合适','遇到问题，怎样求助'];
assert.deepEqual(manifest.map(m=>m.title),expected);
const sentences=new Set(),letters=s=>[...s.replace(/[。.？?]/gu,'')].sort().join('');
for(const m of manifest){
 const d=validate(read('daily-35/'+m.file));assert.equal(d.questions.length,20);
 assert.deepEqual(d.questions.map(q=>q.id),Array.from({length:20},(_,i)=>i+1));
 const entry=catalog.exercises.find(e=>e.id==='daily-topic-'+String(m.lesson).padStart(2,'0'));
 assert.equal(entry.bank,'daily');assert.deepEqual(entry.exercise,d);
 assert.equal(grade(d,{}).score,0);assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,q.answers[0]]))).score,100);
 assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,'错误答案']))).score,0);
 assert.equal(new Set(d.questions.map(q=>q.text)).size,20);
 for(const [i,q] of d.questions.entries()){
  assert.equal(q.points,5);assert.ok(q.pinyin&&q.vietnamese&&q.explanation);assert.ok(!/[\u4e00-\u9fff]/u.test(q.pinyin));
  assert.equal(q.section,['拼音选择','四选一词语填空','情境应答','句子排序'][Math.floor(i/5)]);
  if(q.type==='choice'){
   assert.equal(new Set(Object.values(q.options)).size,4);
   for(const key of 'ABCD')assert.equal(grade({questions:[q]},{[q.id]:key}).score,q.answers[0]===key?5:0);
   if(i<5)assert.ok(q.pinyin.includes('____'));
   if(i>=5)for(const key of 'ABCD')assert.ok(q.optionPinyin[key]);
   if(i>=5&&i<10)assert.equal((q.text.match(/____/g)||[]).length,1);
   if(i>=10)assert.ok(q.options[q.answers[0]]===m.sortingSentences[i-10]);
  }else{
   assert.ok(!sentences.has(q.answers[0]));sentences.add(q.answers[0]);
   const chunks=q.text.split('\n')[1].split(' / ');assert.ok(chunks.length>=4);assert.notEqual(chunks.join(''),q.answers[1]);
   for(const answer of q.answers){assert.equal(letters(answer),letters(chunks.join('')));assert.equal(grade({questions:[q]},{[q.id]:answer}).score,5);}
  }
 }
}
assert.equal(sentences.size,175);
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(catalog)});
await loadCatalog();const visible=studentExercises(listExercises('daily'));
assert.equal(visible.length,36);const lessons=visible.filter(e=>/^daily-topic-\d{2}$/.test(e.id));assert.equal(lessons.length,35);
assert.deepEqual(lessons.map(e=>e.id),manifest.map(m=>'daily-topic-'+String(m.lesson).padStart(2,'0')));
const last=lessons[34],key=progressKey('测试学生','daily',last.id),answers=Object.fromEntries(last.exercise.questions.slice(0,12).map(q=>[q.id,q.answers[0]]));
assert.equal(saveProgress(key,last.exercise,answers,{index:12,offset:0}),true);
const resumed=loadProgress(key,getExercise('daily',last.id));assert.equal(resumed.position.index,12);
for(const q of last.exercise.questions)assert.equal(resumed.answers[q.id],answers[q.id]||'');
console.log('通过：日常交际35主题700题、175个完整表达、评分、选课、进度恢复；原149份题库保留。');
