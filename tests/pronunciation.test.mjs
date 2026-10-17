import assert from 'node:assert/strict';
import {createPronunciationPlayer} from '../pronunciation.mjs';
const original={Audio:globalThis.Audio,fetch:globalThis.fetch};
let gesture=false,created=[];
class MobileAudio{
 constructor(){this.paused=true;this.ended=false;this.authorized=false;created.push(this);}
 play(){
  if(gesture)this.authorized=true;
  if(!this.authorized)return Promise.reject(Object.assign(new Error('gesture required'),{name:'NotAllowedError'}));
  this.paused=false;this.ended=false;return Promise.resolve();
 }
 pause(){this.paused=true;}
 removeAttribute(name){if(name==='src')this.src='';}
 load(){}
}
const entry={character:'一',pinyin:['yī']};
let deferPack,failIndex=false;
globalThis.Audio=MobileAudio;
globalThis.fetch=async url=>{
 if(url.includes('index.json'))return {ok:!failIndex,json:async()=>({yi1:{file:'test.bin',offset:0,length:4}})};
 if(deferPack)return deferPack;
 return {ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer};
};
try{
 let unavailable=0;
 const p=createPronunciationPlayer({onUnavailable:()=>unavailable++});
 gesture=true;p.unlock();gesture=false;await Promise.resolve();
 assert.equal(created.length,1,'unlock creates the reusable audio element');
 assert.equal(await p.play(entry),true,'asynchronous download retains the unlocked element');
 assert.equal(created.length,1);
 assert.equal(await p.play(entry),false,'do not overlap active recordings');
 p.stop();assert.equal(await p.play(entry),true,'switching letters reuses audio permission');p.stop();
 assert.equal(unavailable,0);
 const blocked=createPronunciationPlayer({onUnavailable:()=>unavailable++});
 assert.equal(await blocked.play(entry),false,'a browser can reject autoplay');
 assert.equal(unavailable,1);
 gesture=true;blocked.unlock();gesture=false;await Promise.resolve();
 assert.equal(await blocked.play(entry),true,'a later interaction recovers blocked playback');blocked.stop();
 let resolvePack;deferPack=new Promise(r=>resolvePack=r);
 const canceled=createPronunciationPlayer({onUnavailable:()=>unavailable++});
 const pending=canceled.play(entry);await Promise.resolve();await Promise.resolve();canceled.stop();
 resolvePack({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 assert.ok(!await pending,'a canceled download must not start stale audio');deferPack=null;
 failIndex=true;
 const retry=createPronunciationPlayer({onUnavailable:()=>unavailable++});
 assert.equal(await retry.play(entry),false);failIndex=false;
 gesture=true;retry.unlock();gesture=false;await Promise.resolve();
 assert.equal(await retry.play(entry),true,'a failed index load is retried');retry.stop();
 console.log('通过：手机点击启用播放器、下载后复用、播放拦截恢复、停止过期播放、网络失败重试。');
}finally{Object.assign(globalThis,original);}
