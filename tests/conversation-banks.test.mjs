import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDialogueBank} from '../conversation-bank.mjs';
import {lessonContext} from '../conversation-core.mjs';
import {matchedKeyword} from '../conversation-keywords.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const manifest=read('conversation-banks/manifest.json'),catalog=read('exercise-catalog.json').exercises.filter(e=>!e.exercise.title.includes('演示练习'));
const labels={intro:'入门练习','hsk1-2':'HSK1-2',hsk3:'HSK3',hsk4:'HSK4',hsk5:'HSK5',daily:'日常交际',factory:'汉语工厂'};
test('each visible exercise has 200 grounded, unique and graded question-answer pairs',()=>{
 assert.equal(manifest.totalExercises,catalog.length);assert.equal(manifest.totalDialogues,catalog.length*200);assert.equal(manifest.exercises.length,catalog.length);
 for(const exercise of catalog){const entry=manifest.exercises.find(e=>e.id===exercise.id);assert.ok(entry,exercise.id);const bank=validateDialogueBank(read('conversation-banks/'+entry.file),lessonContext(exercise.exercise,labels[exercise.bank]));
  assert.equal(bank.items.length,200);assert.deepEqual([1,2,3].map(level=>bank.items.filter(q=>q.level===level).length),[60,80,60]);assert.equal(bank.items[0].level,1);assert.equal(bank.items.at(-1).level,3);
  for(const item of bank.items){assert.ok(matchedKeyword(item.referenceAnswer,item.keywords),item.id);assert.doesNotMatch(item.pinyin,/[\p{Script=Han}]/u,item.id+' question pinyin');assert.doesNotMatch(item.referencePinyin,/[\p{Script=Han}]/u,item.id+' answer pinyin');assert.ok(item.sourceQuestionIds.length,item.id+' sources');}
 }
});
test('HSK lesson 1 standalone page resolves to the same bank as the exercise picker',()=>{const lesson=read('hsk1-2-30/lesson-01.json'),context=lessonContext(lesson,'HSK1-2');const entry=manifest.exercises.find(e=>e.title===lesson.title&&e.bank==='HSK1-2');assert.ok(entry);assert.equal(validateDialogueBank(read('conversation-banks/'+entry.file),context).items.length,200);});
