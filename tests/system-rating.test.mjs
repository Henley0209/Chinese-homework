import assert from 'node:assert/strict';
import {createRatingCounter,RATING_KEYS} from '../system-rating.mjs';
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
let state;const requests=[],totals={like:10,dislike:2};
const fetchFn=async(url,options)=>{requests.push({url,options});const kind=url.includes(RATING_KEYS.like)?'like':'dislike';if(url.includes('/hit/'))totals[kind]++;return {ok:true,status:200,json:async()=>({value:String(totals[kind])})};};
const counter=createRatingCounter({fetchFn,storage,render:s=>state=s});await counter.load();assert.equal(state.like.value,10);assert.equal(state.dislike.value,2);
await Promise.all([counter.click('like'),counter.click('like'),counter.click('dislike')]);assert.equal(state.like.value,12);assert.equal(state.dislike.value,3);assert.equal(state.like.local,false);
for(const r of requests){assert.equal(r.options.credentials,'omit');assert.equal(r.options.referrerPolicy,'no-referrer');assert.equal(r.options.method,r.url.includes('/hit/')?'POST':'GET');assert.equal(r.options.body,undefined);}
const offline=createRatingCounter({fetchFn:async()=>{throw Error('offline');},storage,render:s=>state=s});await offline.load();assert.equal(state.like.value,2);assert.equal(state.dislike.value,1);assert.equal(state.like.local,true);await offline.click('dislike');assert.equal(state.dislike.value,2);
const restored=createRatingCounter({fetchFn:async()=>({ok:false,status:404,json:async()=>({error:'Key not found'})}),storage,render:s=>state=s});await restored.load();assert.equal(state.like.value,0);assert.equal(state.dislike.value,0);
const blocked=createRatingCounter({fetchFn:async()=>{throw Error('offline');},storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},render:s=>state=s});await blocked.load();await blocked.click('like');assert.equal(state.like.value,1);
console.log('通过：红心/心碎独立累计、连续点击、公开聚合请求、刷新保存、离线本机计数和存储受限。');
