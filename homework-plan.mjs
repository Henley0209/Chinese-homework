import {cleanQuestionText,preparePinyinQuestion,selectNewQuestions} from './homework-core.mjs?v=homework4';
const han=s=>typeof s==='string'&&/[\p{Script=Han}]/u.test(s);
export function courseTasks(exercise,related=[]){
 const vocabulary=new Map(),choice=[],order=[];
 for(const q of exercise.questions||[]){
  const correct=q.answers?.[0],options=q.options||{},value=options[correct];
  const word=q.targetWord||(/拼音/.test(q.section||q.text)?q.text.match(/[“「"]([^”」"]+)[”」"]/u)?.[1]:'')||(han(value)&&value.length<=12?value:'');
  if(word){
   const previous=vocabulary.get(word)||{};
   const reading=/拼音/.test(q.section||q.text)?value:q.optionPinyin?.[correct];
   vocabulary.set(word,{...previous,id:'word:'+word,word,sentence:'',reading:reading||previous.reading||'',options:/拼音/.test(q.section||q.text)?Object.values(options):previous.options||[],explanation:(q.explanation||'').slice(0,600)});
   for(const [key,pinyin]of Object.entries(q.optionPinyin||{})){const candidate=options[key];if(han(candidate)&&candidate.length<=12&&!vocabulary.has(candidate))vocabulary.set(candidate,{id:'word:'+candidate,word:candidate,sentence:'',reading:pinyin,options:[],explanation:''});}
  }
  if(q.completeSentence&&word)choice.push({id:'choice:'+q.id,word,sentence:q.completeSentence,options:Object.values(options),explanation:(q.explanation||'').slice(0,600)});
  else if(q.type==='choice'&&!/拼音/.test(q.section||q.text)&&han(value)&&/[_＿]{2,}/u.test(q.text))choice.push({id:'choice:'+q.id,word:value,sentence:cleanQuestionText(q.text).replace(/[_＿]+/u,value),options:Object.values(options),explanation:(q.explanation||'').slice(0,600)});
  if(q.type==='fill'&&/排序/.test(q.section||q.text)&&han(correct))order.push({id:'order:'+q.id,word:'',sentence:correct,options:[],explanation:(q.explanation||'').slice(0,600)});
 }
 const content=JSON.stringify(exercise);
 for(const other of related){
  if(other===exercise)continue;
  for(const item of courseTasks(other).pinyin)if(item.word.length>=2&&content.includes(item.word)&&!vocabulary.has(item.word)&&vocabulary.size<60)vocabulary.set(item.word,item);
 }
 const words=[...vocabulary.values()];
 for(const item of words)if(!choice.some(t=>t.word===item.word))choice.push({id:'choice-word:'+item.word,word:item.word,sentence:order.find(q=>q.sentence.includes(item.word))?.sentence||'',options:words.filter(w=>w.word!==item.word).slice(0,2).map(w=>w.word),explanation:''});
 choice.sort((a,b)=>Number(Boolean(b.sentence))-Number(Boolean(a.sentence)));
 const sentences=[...new Map([...order,...choice.filter(q=>q.sentence)].map(q=>[q.sentence.replace(/[\p{P}\p{Z}\s]/gu,''),q])).values()];
 const expanded=[...sentences,...words.filter(w=>!sentences.some(s=>s.word===w.word))];
 return {pinyin:words.sort((a,b)=>Number(Boolean(b.reading))-Number(Boolean(a.reading))),choice,order:expanded.map((q,i)=>({...q,id:'order:'+i})),translation:expanded.map((q,i)=>({...q,id:'translation:'+i}))};
}
function optionsFor(correct,alternatives){
 const values=[correct,...alternatives.filter(v=>v!==correct)];
 const options=[...new Set(values)].slice(0,3);if(options.length<3)return null;
 const shift=Math.floor(Math.random()*3);for(let i=0;i<shift;i++)options.push(options.shift());
 return {options,answer:'ABC'[options.indexOf(correct)]};
}
export function referenceQuestion(kind,task){
 if(kind==='pinyin'&&task.word&&task.reading){
  let q={text:task.word,options:[task.reading,task.reading,task.reading],answer:'A',explanation:`“${task.word}”读作 ${task.reading}。`};
  q=preparePinyinQuestion(q);const opts=optionsFor(task.reading,[...(task.options||[]),...q.options]);
  return opts?{...q,...opts,source:'course-vocabulary',targetId:task.id}:null;
 }
 if(kind==='choice'&&task.sentence&&task.word&&task.sentence.includes(task.word)){
  const opts=optionsFor(task.word,task.options||[]);if(!opts)return null;
  return {text:task.sentence.replace(task.word,'________'),...opts,explanation:task.explanation||`应填“${task.word}”。完整句子：${task.sentence}`,source:'course-reference',targetId:task.id};
 }
 if(kind==='order'&&task.sentence)return {text:task.sentence,answer:task.sentence,explanation:task.explanation||'按照主语、谓语、宾语和修饰语的关系排列。',source:'course-reference',targetId:task.id};
 return null;
}
export function plannedQuestions(kind,targets,items,avoid=[],limit=5,{referenceOnly=false}={}){
 const questions=[];let rejected=0;
 const add=raw=>{const [q]=selectNewQuestions([raw],kind,[...avoid,...questions.map(q=>q.text)],1);if(q)questions.push(q);return Boolean(q);};
 for(let index=0;index<targets.length&&questions.length<limit;index++){
  const task=targets[index];
  const item=items.find(q=>q?.id===task.id)||items[index];let raw=null;
  if(item&&!referenceOnly){
   if(kind==='pinyin'&&typeof item.reading==='string')raw=referenceQuestion(kind,{...task,reading:item.reading});
   if(kind==='choice'&&typeof item.text==='string'){
    const sentence=item.text.includes(task.word)?item.text:item.text.replace(/[_＿]+/u,task.word);
    const opts=optionsFor(task.word,task.options||[]);
    if(opts&&sentence.includes(task.word))raw={text:sentence.replace(task.word,'________'),...opts,explanation:`应填“${task.word}”。完整句子：${sentence}`};
   }
   if(kind==='order'&&han(item.text))raw={text:item.text,answer:item.text,explanation:'根据句子成分及修饰关系排列，字词不能增减。'};
   if(kind==='translation'&&typeof item.text==='string'&&!han(item.text)&&item.text.trim().length>=5&&(task.sentence||han(item.answer)))raw={text:item.text,answer:task.sentence||item.answer,explanation:'注意中文词序；意思相同且语法正确的译法也可得分。'};
   if(raw){raw={...raw,source:'ai',targetId:task.id};if(add(raw))continue;}
   rejected++;
  }
  const fallback=referenceQuestion(kind,task);if(fallback)add(fallback);
 }
 return {questions,rejected};
}
