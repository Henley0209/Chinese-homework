import {pictureProgress} from './picture-words-core.mjs?v=objects2';
export const pictureStateKey='picture-last-screen-v2';
export function loadPictureState(catalog,storage){
 try{
  storage??=globalThis.localStorage;
  const raw=storage.getItem(pictureStateKey);
  if(!raw){
   // Migrate the original fruit-only version without resetting its last page.
   const old=storage.getItem('picture-progress:fruits'),fruit=catalog.categories.find(c=>c.id==='fruits');
   if(old!==null&&fruit){const index=pictureProgress(old,fruit.words.length);return {view:'question',categoryId:fruit.id,wordId:fruit.words[index].id,index,outcome:'ready'};}
   return {view:'categories'};
  }
  const state=JSON.parse(raw);if(state?.version!==2)return {view:'categories'};
  const position=Number.isFinite(state.offset)?{offset:Math.max(0,Math.min(20000,state.offset))}:{};
  if(state.view==='categories')return {view:'categories',...position};
  const category=catalog.categories.find(c=>c.id===state.categoryId);if(!category)return {view:'categories'};
  const index=category.words.findIndex(w=>w.id===state.wordId);if(index<0)return {view:'categories'};
  const ids=new Set(category.words.map(w=>w.id));
  const options=Array.isArray(state.optionIds)&&state.optionIds.length===4&&new Set(state.optionIds).size===4&&state.optionIds.every(id=>ids.has(id))&&state.optionIds.includes(state.wordId)?state.optionIds:undefined;
  const solved=options&&state.selectedId===state.wordId&&['right','waiting','complete'].includes(state.outcome);
  return {view:'question',...position,categoryId:category.id,wordId:state.wordId,index,optionIds:options,selectedId:solved?state.wordId:null,outcome:solved?'complete':'ready'};
 }catch{return {view:'categories'};}
}
export function savePictureState(state,storage){
 try{storage??=globalThis.localStorage;storage.setItem(pictureStateKey,JSON.stringify({...state,version:2}));return true;}catch{return false;}
}
