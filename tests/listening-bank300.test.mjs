import assert from 'node:assert/strict';
import {categories,buildBank,generateQuestions} from '../listening/bank300.mjs';
import {questionSegments} from '../listening/speech.mjs';
import {hskQuestions} from '../listening/data.mjs';
const total=new Set();
for(const category of categories){
 const bank=buildBank(category.id);assert.equal(bank.length,300);assert.equal(new Set(bank.map(q=>q.text)).size,300,'every question has a distinct listening passage');
 const counts=[0,0,0,0];for(const [i,q] of bank.entries()){
  assert.equal(q.format,i%2?'dialogue':'monologue');assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.options[q.answer]);assert.ok(!q.text.includes('{value}'));counts[q.answer]++;assert.ok(!total.has(q.id));total.add(q.id);
  const roles=questionSegments(q.text).map(s=>s.role);
  if(i%2)assert.deepEqual(new Set(roles),new Set(['male','female']));else assert.deepEqual(roles,['narrator']);
 }
 assert.deepEqual(counts,[75,75,75,75]);
 for(let n=0;n<5;n++)for(const [i,q] of generateQuestions(category.id,{randomize:true}).entries()){
  assert.equal(q.format,i%2?'dialogue':'monologue');const original=bank.find(x=>x.id===q.id);assert.equal(q.options[q.answer],original.options[original.answer]);
 }
 console.log(`${category.id}: 300 unique passages, 150 monologues, 150 dialogues, 75 answers per letter.`);
}
for(let i=0;i<10;i++){const q=buildBank('hsk')[i];assert.equal(q.question,hskQuestions[i].question);assert.equal(q.options[q.answer],hskQuestions[i].options[hskQuestions[i].answer]);}
assert.equal(total.size,900);
