import assert from 'node:assert/strict';
import fs from 'node:fs';
import {progressIndex,pronunciationText} from '../writing-practice.mjs';
import {scoreEmoji} from '../result-feedback.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../writing-catalog.json',import.meta.url)));
const expected=JSON.parse(fs.readFileSync(new URL('hsk-character-coverage.json',import.meta.url)));assert.deepEqual([...new Set(Object.values(catalog).flat().map(e=>e.character))].sort(),expected);
for(const [bank,entries] of Object.entries(catalog)){
 const strokes=JSON.parse(fs.readFileSync(new URL('../writing-strokes-'+bank+'.json',import.meta.url)));
 assert.ok(entries.length>=50);assert.equal(new Set(entries.map(e=>e.character)).size,entries.length);
 for(const [i,e] of entries.entries()){
  const d=strokes[e.character];
  assert.equal(d.strokes.length,e.strokes);assert.equal(d.medians.length,e.strokes);assert.ok(e.vietnamese);assert.ok(e.pinyin.length);
  if(i)assert.ok(entries[i-1].strokes<=e.strokes);
 }
}
assert.equal(progressIndex(null,50),0);for(const n of [-1,50,NaN,2.5])assert.equal(progressIndex(n,50),0);assert.equal(progressIndex('12',50),12);
assert.equal(scoreEmoji(59),'😢');assert.equal(scoreEmoji(60),'🙂');assert.equal(scoreEmoji(99),'🙂');assert.equal(scoreEmoji(100),'😆');assert.equal(scoreEmoji(50,50),'😆');
const poly=catalog['hsk1-2'].find(e=>e.character==='长');assert.deepEqual(poly.pinyin,['cháng','zhǎng']);assert.equal(pronunciationText(poly,0),'cháng');assert.equal(pronunciationText(poly,1),'zhǎng');
console.log('通过：三个分级字库、真实笔顺数据、笔画排序、多音字、进度边界、表情分档。');
