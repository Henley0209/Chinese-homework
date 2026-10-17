import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessHandwriting,INK_WIDTH,FINISH_DELAY} from '../handwriting.mjs';
import {pinyinKey} from '../pronunciation.mjs';
const source=Object.assign({},...['hsk1-2','hsk3','hsk4'].map(b=>JSON.parse(fs.readFileSync(new URL('../writing-strokes-'+b+'.json',import.meta.url)))));
const ink=ch=>source[ch].medians.map(s=>s.map(([x,y])=>[x,-y]));
for(const ch of ['一','二','十','人','口','好','学','想','谢','赢']){
 assert.equal(assessHandwriting(ink(ch),source[ch].medians).correct,true,ch+' complete');
 const loose=ink(ch).map(s=>s.map(([x,y],i)=>[x*.65+y*.12+20+Math.sin(i)*16,y*1.4-40+Math.cos(i)*12]));assert.equal(assessHandwriting(loose,source[ch].medians).correct,true,ch+' slanted, narrow and imprecise');
 const reversed=ink(ch).slice().reverse().map(s=>s.slice().reverse());assert.equal(assessHandwriting(reversed,source[ch].medians).correct,true,ch+' free stroke order');
 const transformed=ink(ch).map(s=>s.map(([x,y])=>[x*.6+50,y*.6+30]));assert.equal(assessHandwriting(transformed,source[ch].medians).correct,true,ch+' position/size');
 const split=ink(ch).flatMap(s=>{const n=Math.floor(s.length/2);return [s.slice(0,n+1),s.slice(n)];});assert.equal(assessHandwriting(split,source[ch].medians).correct,true,ch+' split strokes');
}
// Approximate centerlines from the reported screenshot; no original pointer data.
const handwrittenGong=[[[378,1006],[362,1050],[334,1087],[312,1127],[274,1156]],[[505,937],[536,973],[586,1012],[627,1040],[668,1055]],[[501,1103],[467,1155],[430,1201],[372,1276],[456,1277],[513,1277],[583,1277]],[[574,1227],[585,1260],[612,1314],[633,1340]]];
assert.equal(assessHandwriting(handwrittenGong,source['公'].medians).correct,true,'reported handwritten 公');
for(const sample of [handwrittenGong.slice().reverse().map(s=>s.slice().reverse()),handwrittenGong.map(s=>s.map(([x,y])=>[x*.65+18,y*.65-30]))])assert.equal(assessHandwriting(sample,source['公'].medians).correct,true,'公 order and canvas size');
for(let i=0;i<4;i++)assert.equal(assessHandwriting(handwrittenGong.filter((_,n)=>n!==i),source['公'].medians).correct,false,'公 missing stroke '+i);
for(const ch of ['六','八','父','只'])assert.equal(assessHandwriting(ink(ch),source['公'].medians).correct,false,ch+' is not 公');
assert.equal(assessHandwriting([...handwrittenGong,[[280,950],[650,950]]],source['公'].medians).correct,false,'公 extra horizontal');
// The reaction obscures part of 分; the covered segment is approximated.
const handwrittenFen=[[[430,894],[399,942],[367,995],[331,1034],[287,1051]],[[580,887],[597,912],[606,946],[626,978],[666,997]],[[377,1092],[455,1090],[533,1085],[608,1085],[623,1107],[626,1186],[613,1248],[594,1297],[574,1314]],[[506,1104],[499,1150],[478,1201],[446,1247],[417,1275]]];
for(const sample of [handwrittenFen,handwrittenFen.slice().reverse().map(s=>s.slice().reverse()),handwrittenFen.map(s=>s.map(([x,y])=>[x*.55-20,y*.55+10]))])assert.equal(assessHandwriting(sample,source['分'].medians).correct,true,'reported 分, short upper stroke and shifted lower stroke');
for(let i=0;i<4;i++)assert.equal(assessHandwriting(handwrittenFen.filter((_,n)=>n!==i),source['分'].medians).correct,false,'分 missing stroke '+i);
assert.equal(assessHandwriting(ink('八'),source['分'].medians).correct,false,'八 is incomplete for 分');
for(const ch of ['二','十','人','口','好','学'])assert.equal(assessHandwriting(ink(ch).slice(0,1),source[ch].medians).correct,false,ch+' incomplete');
assert.equal(assessHandwriting(ink('一'),source['十'].medians).correct,false);assert.equal(assessHandwriting(ink('三'),source['二'].medians).correct,false);assert.equal(assessHandwriting([],source['一'].medians).correct,false);assert.ok(INK_WIDTH>=18);assert.equal(FINISH_DELAY,2000);
for(const [p,k] of [['cháng','chang2'],['zhǎng','zhang3'],['lǜ','lv4'],['nǚ','nv3'],['lüè','lve4'],['de','de5']])assert.equal(pinyinKey(p),k);
console.log('通过：整字结构、位置和缩放、分段笔画、未完成和错字、粗笔画、多音字音节。');
const catalog=JSON.parse(fs.readFileSync(new URL('../writing-catalog.json',import.meta.url))),audio=JSON.parse(fs.readFileSync(new URL('../pronunciation/index.json',import.meta.url)));
for(const entries of Object.values(catalog))for(const e of entries)for(const py of e.pinyin){const clip=audio[pinyinKey(py)];assert.ok(clip,'recording '+py);if(clip.speech){assert.equal([...clip.speech].length,1);}else{const file=fs.readFileSync(new URL('../pronunciation/'+clip.file,import.meta.url));assert.ok(clip.offset>=0&&clip.offset+clip.length<=file.length);assert.ok(clip.length>100);}}
console.log('通过：全部拼音具备单音节录音或单字发音，录音索引范围完整。');
