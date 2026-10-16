import {validate} from './grading.mjs';
export const bankLabels=Object.freeze({'intro':'入门练习','hsk1-2':'HSK1-2','hsk3':'HSK3','hsk4':'HSK4','hsk5':'HSK5','daily':'日常交际','factory':'汉语工厂'});
const storageKey='qinglan-exercise-drafts-v1';let published=[],drafts=[],promise,loading=false;const listeners=new Set();
export function titleKey(title){return String(title).normalize('NFKC').replace(/\s+/gu,'').toLowerCase();}
function key(entry){return entry.bank+'|'+titleKey(entry.exercise.title);}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(k==='title'?titleKey(value[k]):value[k])]));
 return value;
}
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
export function validateEntry(entry){
 if(!entry||typeof entry.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(entry.id)||!Object.hasOwn(bankLabels,entry.bank))throw Error('练习编号或所属题库无效。');
 validate(entry.exercise);return {id:entry.id,bank:entry.bank,exercise:structuredClone(entry.exercise)};
}
function uniqueByTitle(entries){
 const map=new Map();for(const e of entries){const prev=map.get(key(e));map.set(key(e),prev?{...e,id:prev.id}:e);}return [...map.values()];
}
export function validateCatalog(value){
 if(!value||value.version!==1||!Array.isArray(value.exercises)||value.exercises.length>100)throw Error('题库文件格式无效或超过100份练习。');
 const ids=new Set(),entries=value.exercises.map(v=>{const e=validateEntry(v);if(ids.has(e.id))throw Error('练习编号重复。');ids.add(e.id);return e;});
 const unique=uniqueByTitle(entries);
 for(const bank of Object.keys(bankLabels))if(!unique.some(e=>e.bank===bank))throw Error('题库缺少练习：'+bankLabels[bank]);
 return {version:1,exercises:unique};
}
function reconcile(values){
 const map=new Map();
 for(const raw of values){
  const e=validateEntry(raw),base=published.find(p=>p.id===e.id)||published.find(p=>key(p)===key(e));
  if(base&&base.bank!==e.bank)continue;
  const existing=map.get(key(e)),id=base?.id||existing?.id||e.id;
  if(base&&same(base.exercise,e.exercise)){map.delete(key(e));continue;}
  map.set(key(e),{...e,id});
 }
 return [...map.values()];
}
function combined(){
 const map=new Map(published.map(e=>[e.id,e]));for(const e of drafts)map.set(e.id,e);return uniqueByTitle([...map.values()]);
}
export function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
function notify(){for(const fn of listeners)fn();}
export async function loadCatalog({refresh=false}={}){
 if(promise&&(!refresh||loading))return promise;
 loading=true;
 promise=(async()=>{
 const r=await fetch('./exercise-catalog.json?updated='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('练习列表加载失败，请刷新重试。');
 const c=validateCatalog(await r.json());published=c.exercises;
 try{const saved=localStorage.getItem(storageKey);
 if(saved){const v=JSON.parse(saved);if(!Array.isArray(v)||v.length>100)throw Error();drafts=reconcile(v);validateCatalog({version:1,exercises:combined()});
 // Remove duplicate and already-published drafts on this device, retaining genuine unpublished changes.
 try{if(JSON.stringify(v)!==JSON.stringify(drafts))localStorage.setItem(storageKey,JSON.stringify(drafts));}catch{}
 }else drafts=[];
 }catch{drafts=[];}
 notify();return catalog();
 })().catch(e=>{promise=undefined;throw e;}).finally(()=>{loading=false;});return promise;
}
export function catalog(){return validateCatalog({version:1,exercises:combined()});}
export function listExercises(bank){return combined().filter(e=>e.bank===bank).map(e=>({...structuredClone(e),draft:drafts.some(d=>d.id===e.id)}));}
export function getExercise(bank,id){const e=combined().find(e=>e.bank===bank&&e.id===id);if(!e)throw Error('请重新选择与题库对应的练习。');return structuredClone(e.exercise);}
export function introExercise(){const e=listExercises('intro')[0];if(!e)throw Error('入门练习未加载。');return structuredClone(e.exercise);}
export function saveExercise(entry){
 const value=validateEntry(entry),all=combined(),byId=all.find(e=>e.id===value.id),byTitle=all.find(e=>key(e)===key(value)),existing=byId||byTitle;
 if(byId&&byId.bank!==value.bank)throw Error('不能把已有练习移动到其他题库，请新建练习。');
 if(byId&&byTitle&&byId.id!==byTitle.id)throw Error('此题库已存在该名称，请直接上传更新同名练习。');
 value.id=existing?.id||value.id;
 const next=reconcile(drafts.filter(e=>e.id!==value.id&&key(e)!==key(value)).concat(value));
 validateCatalog({version:1,exercises:[...new Map([...published,...next].map(e=>[e.id,e])).values()]});
 localStorage.setItem(storageKey,JSON.stringify(next));drafts=next;notify();
 return {...value,draft:drafts.some(e=>e.id===value.id),updated:!!existing};
}
export function discardDrafts(){localStorage.removeItem(storageKey);drafts=[];notify();}
export function draftCount(){return drafts.length;}
// Mobile browsers may restore an old tab from memory without a normal reload.
if(typeof window!=='undefined')window.addEventListener('pageshow',e=>{if(e.persisted)loadCatalog({refresh:true}).catch(()=>{});});
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadCatalog({refresh:true}).catch(()=>{});});
