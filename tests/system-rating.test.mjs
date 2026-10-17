import assert from 'node:assert/strict';
import {createRatingCounter,RATING_KEYS,UNDO_WINDOW} from '../system-rating.mjs';
const makeStorage=()=>{const memory=new Map();return {getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};};
const requests=[],totals={like:10,dislike:2,dislikeUndo:0};let clock=100000,offline=false;
const fetchFn=async(url,options)=>{requests.push({url,options});if(offline)throw Error('offline');const kind=Object.keys(RATING_KEYS).find(k=>url.includes('/'+RATING_KEYS[k]+'?'));assert.ok(kind);if(url.includes('/hit/'))totals[kind]++;return {ok:true,status:200,json:async()=>({value:String(totals[kind])})};};
let phoneState,desktopState;const phoneStorage=makeStorage();
const phone=createRatingCounter({fetchFn,storage:phoneStorage,now:()=>clock,render:s=>phoneState=s});
const desktop=createRatingCounter({fetchFn,storage:makeStorage(),now:()=>clock,render:s=>desktopState=s});
await Promise.all([phone.load(),desktop.load()]);assert.equal(phoneState.like.value,10);assert.equal(desktopState.dislike.value,2);
await Promise.all([phone.click('like'),desktop.click('like'),phone.click('dislike')]);
await Promise.all([phone.load(),desktop.load()]);assert.equal(phoneState.like.value,12);assert.equal(desktopState.like.value,12);assert.equal(desktopState.dislike.value,3);assert.equal(phoneState.canUndo,true);assert.equal(desktopState.canUndo,false);
// Refreshing the original device preserves the one-hour undo receipt.
let restoredState;const restored=createRatingCounter({fetchFn,storage:phoneStorage,now:()=>clock,render:s=>restoredState=s});
assert.equal(restoredState.canUndo,true);clock+=UNDO_WINDOW-1;assert.equal(await restored.undoDislike(),true);
await desktop.load();assert.equal(desktopState.dislike.value,2,'undo propagates to another device');assert.equal(restoredState.canUndo,false);
assert.equal(await restored.undoDislike(),false,'cannot undo twice');assert.equal(totals.dislikeUndo,1);
await phone.click('dislike');clock+=UNDO_WINDOW;phone.refreshEligibility();assert.equal(phoneState.canUndo,false);assert.equal(await phone.undoDislike(),false,'strict one-hour expiry');
// Concurrent clicks and undo must not lose totals or undo one receipt twice.
await desktop.click('dislike');await desktop.click('dislike');assert.equal(desktopState.undoCount,2);
await Promise.all([desktop.undoDislike(),desktop.undoDislike(),desktop.undoDislike()]);assert.equal(totals.dislikeUndo,3);assert.equal(desktopState.canUndo,false);
const before=phoneState.dislike.value;offline=true;assert.equal(await phone.click('dislike'),false);assert.equal(phoneState.stale,true);assert.equal(phoneState.dislike.value,before,'offline failure does not invent a local-only total');offline=false;await phone.load();assert.equal(phoneState.stale,false);
for(const r of requests){assert.equal(r.options.credentials,'omit');assert.equal(r.options.referrerPolicy,'no-referrer');assert.equal(r.options.method,r.url.includes('/hit/')?'POST':'GET');assert.equal(r.options.body,undefined);}
let blockedState;const blocked=createRatingCounter({fetchFn,storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},now:()=>clock,render:s=>blockedState=s});await blocked.click('dislike');assert.equal(blockedState.canUndo,true);assert.equal(await blocked.undoDislike(),true);
let missingState;const missing=createRatingCounter({fetchFn:async()=>({ok:false,status:404,json:async()=>({error:'Key not found'})}),storage:makeStorage(),render:s=>missingState=s});await missing.load();assert.equal(missingState.dislike.value,0);
console.log('通过：跨设备共享累加/撤销、1小时边界、刷新保留撤销、重复撤销保护、离线状态、受限存储。');
