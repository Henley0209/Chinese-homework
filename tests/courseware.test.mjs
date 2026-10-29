import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCourseware,coursewareSlides,pilotIds,hanziCount} from '../courseware-core.mjs';
import {makeCoursewarePptx} from '../courseware-pptx.mjs';
for(const id of pilotIds)test(id+' has the requested exact content and page order',async()=>{
 const deck=validateCourseware(JSON.parse(fs.readFileSync(`courseware/data/${id}.json`)));
 for(const group of deck.groups){
  const text=group.dialogue.map(t=>t.zh).join('');assert.equal(hanziCount(text),300);
  for(const word of group.vocabulary)assert.ok(text.includes(word.zh),word.zh+' should occur in its dialogue');
  assert.equal(group.vocabulary.length,10);assert.equal(group.exercises.length,5);
  for(const e of group.exercises){assert.equal((e.zh.match(/____/g)||[]).length,1);assert.ok(group.vocabulary.some(w=>w.zh===e.answer.zh));}
 }
 const slides=coursewareSlides(deck);assert.equal(slides.length,13);
 assert.deepEqual(slides.map(s=>s.type),['cover','dialogue','dialogue','dialogue','dialogue','vocabulary','exercise','dialogue','dialogue','dialogue','dialogue','vocabulary','exercise']);
 const blob=await makeCoursewarePptx(deck,{imageBytes:new Uint8Array(fs.readFileSync('courseware/assets/beginner-scenes.png'))});
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
 assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).slice(0,4)],[80,75,3,4]);
});
test('both homepage entries expose exactly the requested four buttons in order',()=>{
 for(const file of ['index.html','homepage-v4.html']){
  const html=fs.readFileSync(file,'utf8'),toolbar=html.match(/<div id="teacher-tool-actions"[^>]*>(.*?)<\/div>/s)?.[1];assert.ok(toolbar);
  assert.deepEqual([...toolbar.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map(m=>m[1]),['AI 设计课件','AI 生成作业','上传练习题','变更记录']);
  assert.match(html,/<section id="teacher-upload-panel"[^>]* hidden>/);
 }
});
test('courseware validation rejects missing translations, incorrect counts and vocabulary mismatch',()=>{
 const deck=JSON.parse(fs.readFileSync('courseware/data/'+pilotIds[0]+'.json'));
 const missing=structuredClone(deck);missing.groups[0].dialogue[0].vi='';assert.throws(()=>validateCourseware(missing));
 const count=structuredClone(deck);count.groups[0].dialogue[0].zh+='你好';assert.throws(()=>validateCourseware(count));
 const answers=structuredClone(deck);answers.groups[0].exercises[0].answer.zh='不在词表中';assert.throws(()=>validateCourseware(answers));
});
