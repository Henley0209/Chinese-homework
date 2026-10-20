import assert from 'node:assert/strict';
import fs from 'node:fs';
import {phoneticCategories,mouthShapes} from '../phonetics-data.mjs';
import {pinyinKey} from '../pronunciation.mjs';
import {resolveWritingLevel} from '../writing-access.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../pronunciation/index.json',import.meta.url)));
for(const category of phoneticCategories){
 assert.equal(new Set(category.items.map(x=>x.symbol)).size,category.items.length);
 for(const item of category.items){
  assert.ok(item.zh&&item.vi);
  assert.ok(item.shapes.every(shape=>mouthShapes[shape]));
  const clip=manifest[pinyinKey(item.pinyin)];
  assert.ok(clip,`${item.symbol}: recording must exist for ${item.pinyin}`);
  assert.ok(clip.file,'Use local recordings, independent of installed speech voices');
  const pack=fs.statSync(new URL('../pronunciation/'+clip.file,import.meta.url));
  assert.ok(clip.offset>=0&&clip.length>0&&clip.offset+clip.length<=pack.size);
 }
}
assert.throws(()=>resolveWritingLevel(''));
assert.throws(()=>resolveWritingLevel('invalid'));
console.log('通过：全部 63 项示范音节均有有效本地录音，口型与中越说明完整。');
