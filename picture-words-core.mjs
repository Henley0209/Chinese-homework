export function validatePictureCatalog(value){
 if(value?.version!==1||!Array.isArray(value.categories)||!value.categories.length)throw Error('图片词库格式无效。');
 const categories=new Set();
 for(const category of value.categories){
  if(!category?.id||categories.has(category.id)||!category.name||!category.vietnamese||!Array.isArray(category.words)||category.words.length<10||category.words.length>100)throw Error('图片分类或词数无效。');
  categories.add(category.id);const ids=new Set(),words=new Set();
  for(const word of category.words){
   if(!word?.id||ids.has(word.id)||!word.chinese||words.has(word.chinese)||!word.pinyin||!word.vietnamese||!/^assets\/picture-words\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(word.image))throw Error('图片词条格式无效。');
   ids.add(word.id);words.add(word.chinese);
  }
 }
 return value;
}
function shuffle(items,random){
 const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function pictureOptions(category,index,random=Math.random){
 const answer=category.words[index];if(!answer||category.words.length<4)throw Error('没有足够的同类选项。');
 return shuffle([answer,...shuffle(category.words.filter(word=>word.id!==answer.id),random).slice(0,3)],random);
}
export function pictureProgress(value,length){const index=Number(value);return Number.isInteger(index)&&index>=0&&index<length?index:0;}
export function createPictureFeedback({onChange=()=>{},onAdvance=()=>{},schedule=setTimeout,unschedule=clearTimeout}={}){
 let phase='ready',generation=0,timers=[];
 function emit(){onChange({phase,emoji:phase==='right'?'👍':phase==='wrong'?'😢':''});}
 function cancel(){generation++;for(const timer of timers)unschedule(timer);timers=[];phase='ready';}
 function choose(correct){
  if(phase!=='ready')return false;
  const token=generation;phase=correct?'right':'wrong';emit();
  timers.push(schedule(()=>{
   if(token!==generation)return;
   phase=correct?'waiting':'ready';emit();
   if(correct)timers.push(schedule(()=>{if(token!==generation)return;phase='complete';onAdvance();},2000));
  },1000));return true;
 }
 return {choose,cancel,reset(){cancel();emit();},get phase(){return phase;}};
}
