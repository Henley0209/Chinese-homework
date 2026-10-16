import {validate} from './grading.mjs';
export const bankLabels=Object.freeze({'intro':'入门练习','hsk1-2':'HSK1-2','hsk3':'HSK3','hsk4':'HSK4','hsk5':'HSK5','daily':'日常交际','factory':'汉语工厂'});
const storageKey='qinglan-exercise-drafts-v1';let published=[],drafts=[],promise;const listeners=new Set();
export function validateEntry(entry){
 if(!entry||typeof entry.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(entry.id)||!Object.hasOwn(bankLabels,entry.bank))throw Error('练习编号或所属题库无效。');
 validate(entry.exercise);return {id:entry.id,bank:entry.bank,exercise:structuredClone(entry.exercise)};
}
export function validateCatalog(value){
 if(!value||value.version!==1||!Array.isArray(value.exercises)||value.exercises.length>100)throw Error('题库文件格式无效或超过100份练习。');
 const ids=new Set(),entries=value.exercises.map(v=>{const e=validateEntry(v);if(ids.has(e.id))throw Error('练习编号重复。');ids.add(e.id);return e;});
 for(const bank of Object.keys(bankLabels))if(!entries.some(e=>e.bank===bank))throw Error('题库缺少练习：'+bankLabels[bank]);
 return {version:1,exercises:entries};
}
function combined(){const map=new Map(published.map(e=>[e.id,e]));for(const e of drafts)map.set(e.id,e);return [...map.values()];}
export function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
function notify(){for(const fn of listeners)fn();}
export async function loadCatalog(){
 if(promise)return promise;
 promise=(async()=>{
 const r=await fetch('./exercise-catalog.json',{cache:'no-store'});if(!r.ok)throw Error('练习列表加载失败，请刷新重试。');
 const c=validateCatalog(await r.json());published=c.exercises;
 try{const saved=localStorage.getItem(storageKey);if(saved){const v=JSON.parse(saved);if(!Array.isArray(v)||v.length>100)throw Error();const loaded=v.map(validateEntry);validateCatalog({version:1,exercises:[...new Map([...published,...loaded].map(e=>[e.id,e])).values()]});drafts=loaded;}}catch{drafts=[];}
 notify();return catalog();
 })().catch(e=>{promise=undefined;throw e;});return promise;
}
export function catalog(){return validateCatalog({version:1,exercises:combined()});}
export function listExercises(bank){return combined().filter(e=>e.bank===bank).map(e=>({...structuredClone(e),draft:drafts.some(d=>d.id===e.id)}));}
export function getExercise(bank,id){const e=combined().find(e=>e.bank===bank&&e.id===id);if(!e)throw Error('请重新选择与题库对应的练习。');return structuredClone(e.exercise);}
export function introExercise(){const e=listExercises('intro')[0];if(!e)throw Error('入门练习未加载。');return structuredClone(e.exercise);}
export function saveExercise(entry){
 const value=validateEntry(entry),existing=combined().find(e=>e.id===value.id);
 if(existing&&existing.bank!==value.bank)throw Error('不能把已有练习移动到其他题库，请新建练习。');
 const next=drafts.filter(e=>e.id!==value.id).concat(value);
 validateCatalog({version:1,exercises:[...new Map([...published,...next].map(e=>[e.id,e])).values()]});
 localStorage.setItem(storageKey,JSON.stringify(next));drafts=next;notify();return value;
}
export function discardDrafts(){localStorage.removeItem(storageKey);drafts=[];notify();}
export function draftCount(){return drafts.length;}
