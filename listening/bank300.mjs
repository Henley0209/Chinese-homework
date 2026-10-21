import {hskQuestions as originalHSK,shuffle} from './data.mjs?v=fixed4';
import {hskScenarios} from './topics/hsk.mjs';
import {dailyScenarios} from './topics/daily.mjs';
import {factoryScenarios} from './topics/factory.mjs';
export const contentVersion='bank300v1';
export const questionCount=300;
export const categories=[{id:'hsk',zh:'HSK',vi:'Luyện nghe HSK',icon:'📘',questionCount,note:'HSK 3—4 · 300 题 / 300 câu'},{id:'daily',zh:'日常交际',vi:'Giao tiếp hằng ngày',icon:'💬',questionCount,note:'300 题 · 生活情境 / Đời sống'},{id:'factory',zh:'汉语工厂',vi:'Tiếng Trung trong nhà máy',icon:'🏭',questionCount,note:'300 题 · 工作情境 / Công việc'}];
const cache=new Map();
const fill=(text,value)=>text.replaceAll('{value}',value);
function createQuestion(scenario,variant,dialogue,maleFirst){
 const value=scenario.values[variant],others=scenario.values.filter((_,i)=>i!==variant),text=dialogue?(maleFirst?'男：':'女：')+scenario.ask+(maleFirst?'女：':'男：')+fill(scenario.reply,value):fill(scenario.single,value);
 return {text,question:scenario.question,options:[value,...others.slice(0,3)],answer:0,format:dialogue?'dialogue':'monologue',topic:scenario.topic};
}
function putAnswerAt(q,position){const correct=q.options[q.answer],options=q.options.filter((_,i)=>i!==q.answer);options.splice(position,0,correct);return {...q,options,answer:position};}
export function buildBank(category){
 if(cache.has(category))return cache.get(category);
 const scenarios={hsk:hskScenarios,daily:dailyScenarios,factory:factoryScenarios}[category];if(!scenarios)throw Error('Unknown listening category');
 const questions=[];
 if(category==='hsk'){
  for(const [i,q] of originalHSK.entries())questions.push({...q,options:[...q.options],format:i%2?'dialogue':'monologue',topic:'HSK 综合理解'});
  questions[1].text='女：这件衬衫现在卖多少钱？男：这件衬衫原价两百元，现在比原来便宜五十元。';
 }
 for(let variant=0;variant<5;variant++)for(const [topicIndex,scenario] of scenarios.entries()){
  questions.push(createQuestion(scenario,variant,false,false));
  questions.push(createQuestion(scenario,(variant+2)%5,true,(topicIndex+variant)%2===1));
 }
 if(questions.length!==questionCount)throw Error('Incorrect bank size: '+category);
 const counts=[0,0,0,0];
 const balanced=questions.map((q,index)=>{
  if(category==='hsk'&&index<10){counts[q.answer]++;return q;}
  let target=index%4;while(counts[target]>=75)target=(target+1)%4;counts[target]++;return putAnswerAt(q,target);
 }).map((q,index)=>({...q,id:`${category}-${String(index+1).padStart(3,'0')}`}));
 cache.set(category,balanced);return balanced;
}
export function generateQuestions(category,{randomize=false}={}){
 const bank=buildBank(category);let questions=bank;
 if(randomize){const single=shuffle(bank.filter(q=>q.format==='monologue')),dialogue=shuffle(bank.filter(q=>q.format==='dialogue'));
  // Shuffle distractors without changing which answer text is correct.
  questions=single.flatMap((q,i)=>[q,dialogue[i]]).map((q,index)=>{const correct=q.options[q.answer],options=shuffle(q.options),position=index%4;return putAnswerAt({...q,options,answer:options.indexOf(correct)},position);});
 }
 return questions.map(q=>({...q,options:[...q.options]}));
}
