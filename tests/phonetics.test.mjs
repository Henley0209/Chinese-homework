import assert from 'node:assert/strict';
import fs from 'node:fs';
import {phoneticCategories,mouthPhotos} from '../phonetics-data.mjs';
import {pinyinKey} from '../pronunciation.mjs';
import {resolveWritingLevel} from '../writing-access.mjs';
import {createIsolatedAudio} from '../phonetics-audio.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../pronunciation/index.json',import.meta.url)));
const sources=JSON.parse(fs.readFileSync(new URL('../pronunciation/isolated/sources.json',import.meta.url)));
for(const category of phoneticCategories){
 assert.equal(new Set(category.items.map(x=>x.symbol)).size,category.items.length);
 for(const item of category.items){
  assert.ok(item.zh&&item.vi);
  assert.ok(item.shapes.every(shape=>Number.isInteger(mouthPhotos[shape])));
  if(category.id!=='tones'){
   assert.equal(item.pinyin,undefined,'No full example syllable in standalone practice');
   const source=sources[category.id+'/'+item.symbol];assert.equal(source.file,item.audio);
   assert.ok(fs.statSync(new URL('../'+item.audio,import.meta.url)).size>500);
   assert.ok(source.duration>.3&&source.duration<3);
   if(category.id==='initials'){assert.equal(source.mode,'teaching-initial');assert.deepEqual(source.trim,[null,null],'Teaching initials preserve complete recorded pronunciation');}
   if(category.id==='finals'&&!['o','eng','ong'].includes(item.symbol))assert.deepEqual(source.trim,[null,null],'Zero-initial finals preserve complete recordings');
  }else assert.ok(manifest[pinyinKey(item.pinyin)]);
 }
}
const teachingKeys={b:'bo1',p:'po1',m:'mo1',f:'fo1',d:'de1',t:'te1',n:'ne1',l:'le1',g:'ge1',k:'ke1',h:'he1',j:'ji1',q:'qi1',x:'xi1',zh:'zhi1',ch:'chi1',sh:'shi1',r:'ri1',z:'zi1',c:'ci1',s:'si1',y:'yi1',w:'wu1'};
for(const [symbol,key] of Object.entries(teachingKeys))assert.equal(sources['initials/'+symbol].sourceKey,key,'Correct teaching recording for '+symbol);
assert.throws(()=>resolveWritingLevel(''));assert.throws(()=>resolveWritingLevel('invalid'));
let instance,started=0,ended=0,unavailable=0,reject;
class AudioMock{
 constructor(){instance=this;}
 play(){this.paused=false;return new Promise((resolve,r)=>{reject=r;});}
 pause(){this.paused=true;}
 removeAttribute(){this.src='';}
 load(){}
}
const audio=createIsolatedAudio({AudioClass:AudioMock,onStart:()=>started++,onEnd:()=>ended++,onUnavailable:()=>unavailable++});
assert.equal(audio.play('pronunciation/isolated/initials-n.mp3'),true);
assert.match(instance.src,/initials-n.mp3/);instance.onplaying();assert.equal(started,1);
const staleEnd=instance.onended,staleError=instance.onerror;
audio.play('pronunciation/isolated/finals-o.mp3');staleEnd();staleError();assert.equal(ended,0);assert.equal(unavailable,0);
instance.onended();assert.equal(ended,1);audio.stop();assert.equal(instance.paused,true);
assert.equal(audio.play('pronunciation/isolated/finals-a.mp3'),true);reject(Error('blocked'));await Promise.resolve();assert.equal(unavailable,1);
assert.equal(audio.play('pronunciation/na.mp3'),false,'Never fall back to a full syllable');assert.equal(unavailable,2);
console.log('通过：58 项完整教学声母及韵母录音、静态口型映射、无示范音节、声调录音、手机同步播放、切换停止、过期事件和失败重试。');
