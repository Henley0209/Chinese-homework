import assert from 'node:assert/strict';
import {createRecordedPlayer,fixedVoices,recordingKey} from '../listening/recorded-player.mjs';
const segment={role:'narrator',text:'你好'},manifest={voices:fixedVoices,clips:{[recordingKey(segment)]:{file:'a'.repeat(32)+'.mp3',voice:fixedVoices.narrator,duration:1}}};
let finishPrime,media,realPlays=0;
class PrimedAudio{constructor(){media=this;}pause(){}removeAttribute(){this.src='';}load(){}play(){if(this.src.startsWith('data:'))return new Promise(resolve=>{finishPrime=resolve;});realPlays++;this.onplaying?.();return Promise.resolve();}}
const p=createRecordedPlayer({AudioClass:PrimedAudio,fetchManifest:async()=>manifest});const pending=p.play([segment]);await new Promise(r=>setImmediate(r));assert.equal(realPlays,0,'real clip must wait until gesture priming finishes');finishPrime();await pending;assert.equal(realPlays,1);assert.equal(media.playbackRate,.8);p.stop();
const events=new EventTarget(),statuses=[];let calls=0;
class BlockedOnceAudio{pause(){}removeAttribute(){this.src='';}load(){}play(){calls++;if(calls<=2)return Promise.reject(Object.assign(Error(),{name:'NotAllowedError'}));this.onplaying?.();return Promise.resolve();}}
const retry=createRecordedPlayer({AudioClass:BlockedOnceAudio,fetchManifest:async()=>manifest,gestureTarget:events,onStatus:s=>statuses.push(s)});await retry.play([segment]);await new Promise(r=>setImmediate(r));assert.match(statuses.at(-1),/首次触屏/);events.dispatchEvent(new Event('pointerup'));await new Promise(r=>setImmediate(r));assert.match(statuses.at(-1),/正在播放/,'first ordinary interaction retries autoplay without a replay-button click');retry.stop();
let blockedCalls=0;class AlwaysBlockedAudio extends BlockedOnceAudio{play(){blockedCalls++;return Promise.reject(Object.assign(Error(),{name:'NotAllowedError'}));}}
const stopped=createRecordedPlayer({AudioClass:AlwaysBlockedAudio,fetchManifest:async()=>manifest,gestureTarget:events});await stopped.play([segment]);await new Promise(r=>setImmediate(r));stopped.stop();const before=blockedCalls;events.dispatchEvent(new Event('pointerup'));await new Promise(r=>setImmediate(r));assert.equal(blockedCalls,before,'stopping cancels deferred autoplay');
console.log('PASS: cold-load media priming, first-gesture automatic recovery and stop cancellation.');
