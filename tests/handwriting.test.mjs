import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessHandwriting,INK_WIDTH} from '../handwriting.mjs';
import {pinyinKey} from '../pronunciation.mjs';
const source=Object.assign({},...['hsk1-2','hsk3','hsk4'].map(b=>JSON.parse(fs.readFileSync(new URL('../writing-strokes-'+b+'.json',import.meta.url)))));
const ink=ch=>source[ch].medians.map(s=>s.map(([x,y])=>[x,-y]));
for(const ch of ['一','二','十','人','口','好','学','想','谢','赢']){
 assert.equal(assessHandwriting(ink(ch),source[ch].medians).correct,true,ch+' complete');
 const transformed=ink(ch).map(s=>s.map(([x,y])=>[x*.6+50,y*.6+30]));assert.equal(assessHandwriting(transformed,source[ch].medians).correct,true,ch+' position/size');
 const split=ink(ch).flatMap(s=>{const n=Math.floor(s.length/2);return [s.slice(0,n+1),s.slice(n)];});assert.equal(assessHandwriting(split,source[ch].medians).correct,true,ch+' split strokes');
}
for(const ch of ['二','十','人','口','好','学'])assert.equal(assessHandwriting(ink(ch).slice(0,1),source[ch].medians).correct,false,ch+' incomplete');
assert.equal(assessHandwriting(ink('一'),source['十'].medians).correct,false);assert.equal(assessHandwriting(ink('三'),source['二'].medians).correct,false);assert.equal(assessHandwriting([],source['一'].medians).correct,false);assert.ok(INK_WIDTH>=18);
for(const [p,k] of [['cháng','chang2'],['zhǎng','zhang3'],['lǜ','lv4'],['nǚ','nv3'],['lüè','lve4'],['de','de5']])assert.equal(pinyinKey(p),k);
console.log('通过：整字结构、位置和缩放、分段笔画、未完成和错字、粗笔画、多音字音节。');
const catalog=JSON.parse(fs.readFileSync(new URL('../writing-catalog.json',import.meta.url))),audio=JSON.parse(fs.readFileSync(new URL('../pronunciation/index.json',import.meta.url)));
for(const entries of Object.values(catalog))for(const e of entries)for(const py of e.pinyin){const clip=audio[pinyinKey(py)];assert.ok(clip,'recording '+py);if(clip.speech){assert.equal([...clip.speech].length,1);}else{const file=fs.readFileSync(new URL('../pronunciation/'+clip.file,import.meta.url));assert.ok(clip.offset>=0&&clip.offset+clip.length<=file.length);assert.ok(clip.length>100);}}
console.log('通过：全部拼音具备单音节录音或单字发音，录音索引范围完整。');
