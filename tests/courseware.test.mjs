import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCourseware,coursewareSlides,pilotIds,hanziCount,coursewareBrand} from '../courseware-core.mjs';
import {makeCoursewarePptx} from '../courseware-pptx.mjs';
import {makeCoursewareDocx} from '../courseware-docx.mjs';
for(const id of pilotIds)test(id+' has the requested exact content and page order',async()=>{
 const deck=validateCourseware(JSON.parse(fs.readFileSync(`courseware/data/${id}.json`)));
 for(const group of deck.groups){
  const text=group.dialogue.map(t=>t.zh).join('');if(deck.schemaVersion!==2)assert.equal(hanziCount(text),300);
  for(const word of group.vocabulary)assert.ok(text.includes(word.zh),word.zh+' should occur in its dialogue');
  assert.equal(group.vocabulary.length,deck.schemaVersion===2?8:10);assert.equal(group.exercises.length,5);
  for(const e of group.exercises){assert.equal((e.zh.match(/____/g)||[]).length,1);assert.ok(group.vocabulary.some(w=>w.zh===e.answer.zh));}
 }
 if(deck.number===2){assert.equal(deck.groups[1].dialogue[4].speaker,'C');assert.equal(deck.groups[1].roles.C,'小文');}
 const slides=coursewareSlides(deck);
 assert.equal(slides[0].type,'cover');
 assert.equal(slides[1].title.zh,'学习目标');
 assert.ok(slides.some(s=>s.type==='lesson'&&s.title.zh.includes('热身')));
 assert.ok(slides.some(s=>s.type==='lesson'&&s.title.zh==='课后任务'));
 assert.deepEqual(slides.filter(s=>s.type==='dialogue').flatMap(s=>s.turns),deck.groups.flatMap(g=>g.dialogue));
 assert.deepEqual(slides.filter(s=>s.type==='vocabulary').flatMap(s=>s.words),deck.groups.flatMap(g=>g.vocabulary));
 assert.ok(slides.filter(s=>s.type==='dialogue').every(s=>s.turns.length<=3));
 const blob=await makeCoursewareDocx(deck,{imageBytes:new Uint8Array(fs.readFileSync('courseware/assets/beginner-scenes.png'))});
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const word=await storedZip(blob);
 assert.ok(word['word/header1.xml'].includes(coursewareBrand));
 assert.ok(word['word/footer1.xml'].includes(coursewareBrand));
 for(const label of ['学习目标','热身','课后任务'])assert.ok(word['word/document.xml'].includes(label));
 assert.ok(!word['word/document.xml'].includes('小语课堂'));
 const ppt=await makeCoursewarePptx(deck,{imageBytes:new Uint8Array(fs.readFileSync('courseware/assets/beginner-scenes.png'))});
 assert.equal(ppt.type,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
 const files=await storedZip(ppt),slideFiles=Object.keys(files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));
 assert.equal(slideFiles.length,slides.length);
 for(const path of slideFiles){assert.equal(files[path].split(coursewareBrand).length-1,2);assert.ok(files[path].includes('F58B24'));}

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

async function storedZip(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),v=new DataView(bytes.buffer),decode=new TextDecoder(),files={};let offset=0;
 while(v.getUint32(offset,true)===0x04034b50){
  const size=v.getUint32(offset+18,true),nameLength=v.getUint16(offset+26,true),extra=v.getUint16(offset+28,true),start=offset+30+nameLength+extra;
  const name=decode.decode(bytes.slice(offset+30,offset+30+nameLength));
  if(name.endsWith('.xml')||name.endsWith('.rels'))files[name]=decode.decode(bytes.slice(start,start+size));
  offset=start+size;
 }
 return files;
}
test('new lesson content rejects malformed modules and ambiguous gaps',()=>{
 const deck=JSON.parse(fs.readFileSync('courseware/data/hsk1-2-topic-03.json'));
 const invalid=structuredClone(deck);invalid.groups[0].grammar[0].items[0].vi=null;assert.throws(()=>validateCourseware(invalid));
 const gap=structuredClone(deck);gap.groups[0].exercises[0].zh+='____';assert.throws(()=>validateCourseware(gap));
 const translation=structuredClone(deck);translation.groups[1].dialogue[0].vi='';assert.throws(()=>validateCourseware(translation));
 const overflow=structuredClone(deck);overflow.groups[0].dialogue[0].zh='你'.repeat(121);assert.throws(()=>validateCourseware(overflow));
});

test('wrong AI pinyin is corrected in preview, Word and PPT without changing source text',async()=>{
 const deck=JSON.parse(fs.readFileSync('courseware/data/hsk1-2-topic-03.json'));
 const target={zh:'学习请假、调班与加班的常用表达',pinyin:'xué xí qǐ jià',vi:'Học cách xin nghỉ và đổi ca.'};
 deck.objectives=[target];
 const expected='xué xí qǐng jià、 tiáo bān yǔ jiā bān de cháng yòng biǎo dá';
 const slides=coursewareSlides(deck);
 const objective=slides.find(s=>s.type==='lesson'&&s.title.zh==='学习目标').items[0];
 assert.equal(objective.pinyin,expected);assert.equal(objective.zh,target.zh);assert.equal(objective.vi,target.vi);
 assert.equal(target.pinyin,'xué xí qǐ jià');
 const imageBytes=new Uint8Array(fs.readFileSync('courseware/assets/beginner-scenes.png'));
 const word=await storedZip(await makeCoursewareDocx(deck,{imageBytes}));
 assert.ok(word['word/document.xml'].includes(expected));
 const ppt=await storedZip(await makeCoursewarePptx(deck,{imageBytes}));
 assert.ok(Object.entries(ppt).some(([path,xml])=>/^ppt\/slides\/slide\d+\.xml$/.test(path)&&xml.includes(expected)));
});
