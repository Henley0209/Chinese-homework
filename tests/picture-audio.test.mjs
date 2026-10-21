import assert from 'node:assert/strict';
import {createWordAudio,wordVoice} from '../picture-words-audio.mjs';
import {buildCorpus,voice} from '../tools/picture-audio-corpus.mjs';
const corpus=buildCorpus();assert.equal(wordVoice,voice);assert.ok(corpus.length>1000);
assert.equal(new Set(corpus.map(c=>c.text)).size,corpus.length);
const manifest={voices:{female:voice},clips:Object.fromEntries(corpus.map(c=>[c.key,{voice,file:c.file,duration:1}]))};
const played=[];let ready=0,unavailable=0;
class AudioMock{
 play(){played.push(this.src);this.onplaying?.();return Promise.resolve();}
 pause(){} removeAttribute(){this.src='';} load(){}
}
const flush=()=>new Promise(r=>setImmediate(r));
const player=createWordAudio({AudioClass:AudioMock,fetchManifest:async()=>manifest,onReady:()=>ready++,onUnavailable:()=>unavailable++});
const first=corpus[0],second=corpus[1];
assert.equal(player.speak(first.text),true);await flush();assert.equal(ready,1);
assert.ok(played.at(-1).endsWith(first.file));assert.equal(unavailable,0);
// Rapid taps play only the latest pending vocabulary clip.
const mark=played.length;player.speak(first.text);player.speak(second.text);await flush();assert.equal(played.length-mark,1);assert.ok(played.at(-1).endsWith(second.file));
const next=played.length;player.speak(first.text);player.stop();await flush();assert.equal(played.length,next);
player.speak('不存在的词语');await flush();assert.equal(unavailable,1);
const missing=createWordAudio({AudioClass:null,fetchManifest:async()=>manifest,onUnavailable:()=>unavailable++});assert.equal(missing.speak(first.text),false);assert.equal(unavailable,2);
const wrong=createWordAudio({AudioClass:AudioMock,fetchManifest:async()=>({...manifest,voices:{female:'zh-CN-YunxiNeural'}}),onUnavailable:()=>unavailable++});wrong.speak(first.text);await flush();assert.equal(unavailable,3);
let attempts=0;const retry=createWordAudio({AudioClass:AudioMock,fetchManifest:async()=>{if(++attempts===1)throw Error('offline');return manifest;},onUnavailable:()=>unavailable++});
await flush();retry.speak(first.text);await flush();assert.ok(played.at(-1).endsWith(first.file));
console.log(`通过：${corpus.length}词晓晓音色索引、固定录音、快速切换、退出取消、缺失录音、错误音色和断网重试。`);
