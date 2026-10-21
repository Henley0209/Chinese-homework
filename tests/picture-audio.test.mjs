import assert from 'node:assert/strict';
import {createWordAudio,wordVoice} from '../picture-words-audio.mjs';
import {wordRecordings} from '../picture-words/audio-index.mjs';
import {buildCorpus,voice} from '../tools/picture-audio-corpus.mjs';
const corpus=buildCorpus();assert.equal(wordVoice,voice);assert.equal(Object.keys(wordRecordings).length,corpus.length);
for(const clip of corpus)assert.equal(wordRecordings[clip.text],clip.file);
let gesture=false,ready=0,unavailable=0,paused=0;const instances=[],played=[];
class MobileAudio{
 constructor(){instances.push(this);}
 setAttribute(){} removeAttribute(){this.src='';}load(){}
 pause(){paused++;}
 play(){
  // Model mobile browsers which reject playback after the click handler returns.
  assert.ok(gesture,'The real MP3 must play inside the active user click');
  assert.ok(this.src.endsWith('.mp3'),'Do not play a silent unlock clip');
  played.push(this.src);this.onplaying?.();return Promise.resolve();
 }
}
const click=fn=>{gesture=true;try{return fn();}finally{gesture=false;}};
const flush=()=>new Promise(r=>setImmediate(r));
const first=corpus[0],second=corpus[1],player=createWordAudio({AudioClass:MobileAudio,onReady:()=>ready++,onUnavailable:()=>unavailable++});
player.prepare([first.text,second.text]);assert.equal(played.length,0);assert.equal(instances.length,2);
assert.equal(click(()=>player.speak(first.text)),true);
// No awaiting required: even the first real word must already be playing.
assert.equal(played.length,1);assert.ok(played[0].endsWith(first.file));assert.equal(ready,1);
click(()=>player.speak(first.text));click(()=>player.speak(second.text));assert.ok(played.at(-1).endsWith(second.file));assert.ok(paused>=2);
const stale=instances.at(-1).onerror;player.stop();stale();assert.equal(unavailable,0);
assert.equal(click(()=>player.speak('不存在的词语')),false);assert.equal(unavailable,1);
assert.equal(createWordAudio({AudioClass:null,onUnavailable:()=>unavailable++}).speak(first.text),false);assert.equal(unavailable,2);
// A late rejection from an old tap must not overwrite the current playback state.
let rejectOld;
class DelayedAudio extends MobileAudio{
 play(){super.play();if(!rejectOld)return new Promise((resolve,reject)=>{rejectOld=reject;});return Promise.resolve();}
}
const racing=createWordAudio({AudioClass:DelayedAudio,onUnavailable:()=>unavailable++});
click(()=>racing.speak(first.text));click(()=>racing.speak(second.text));rejectOld(Error('interrupted'));await flush();assert.equal(unavailable,2);
class BlockedAudio extends MobileAudio{play(){return Promise.reject(Error('blocked'));}}
const blocked=createWordAudio({AudioClass:BlockedAudio,onUnavailable:()=>unavailable++});click(()=>blocked.speak(first.text));await flush();assert.equal(unavailable,3);
console.log(`通过：${corpus.length}词静态索引、手机首次点击同步播放真实MP3、四选项预加载、快速切换、退出取消和失败提示。`);
