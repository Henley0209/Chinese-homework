import {generateQuestions,contentVersion,questionCount} from './bank300.mjs?v=bank300v1';
const STORAGE_KEY='chinese-listening-progress-v1';
const categoryIds=['hsk','daily','factory'];
const rates=[.65,.8,.85,1];
function normalizeSession(value){
 if(!value||value.dataVersion!==contentVersion||!Array.isArray(value.questions)||value.questions.length!==questionCount)return null;
 const questions=[];
 for(const [i,q] of value.questions.entries()){
  if(!q||typeof q.text!=='string'||!q.text||q.text.length>2000||typeof q.question!=='string'||!q.question||q.question.length>500||!Array.isArray(q.options)||q.options.length!==4||!q.options.every(s=>typeof s==='string'&&s.length>0&&s.length<=500)||!Number.isInteger(q.answer)||q.answer<0||q.answer>3||q.format!==(i%2?'dialogue':'monologue'))return null;
  questions.push({id:q.id,topic:q.topic,format:q.format,text:q.text,question:q.question,options:[...q.options],answer:q.answer});
 }
 if(!Number.isInteger(value.index)||value.index<0||value.index>=questions.length||!Array.isArray(value.answers)||value.answers.length!==questions.length||!value.answers.every(a=>a===null||(Number.isInteger(a)&&a>=0&&a<4)))return null;
 if(value.finished&&!value.answers.every(Number.isInteger))return null;
 return {dataVersion:contentVersion,questions,index:value.index,answers:[...value.answers],finished:value.finished===true,rate:rates.includes(value.rate)?value.rate:.8};
}
function migrate(category,old){
 if(old?.dataVersion!=='fixed4'||!Array.isArray(old.questions)||old.questions.length!==10||!Array.isArray(old.answers)||old.answers.length!==10)return null;
 const questions=generateQuestions(category),answers=Array(questionCount).fill(null),positions=[];
 for(const [i,q] of old.questions.entries()){
  if(!q||!Array.isArray(q.options)||!Number.isInteger(q.answer))continue;
  const found=questions.findIndex(candidate=>candidate.question===q.question&&candidate.options[candidate.answer]===q.options[q.answer]&&(candidate.text===q.text||category==='hsk'));
  positions[i]=found;
  if(found>=0&&Number.isInteger(old.answers[i])){const selected=questions[found].options.indexOf(q.options[old.answers[i]]);if(selected>=0)answers[found]=selected;}
 }
 const firstUnanswered=answers.findIndex(a=>a===null),previous=positions[old.index];
 return {dataVersion:contentVersion,questions,answers,index:!old.finished&&previous>=0?previous:Math.max(0,firstUnanswered),finished:false,rate:rates.includes(old.rate)?old.rate:.8};
}
export function createListeningProgress(storage){
 function read(){try{const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(value?.version===1&&value.sessions&&typeof value.sessions==='object'&&!Array.isArray(value.sessions))return value;}catch{}return {version:1,lastCategory:null,sessions:{}};}
 function load(category){if(!categoryIds.includes(category))return null;const value=read().sessions[category];return normalizeSession(value)||migrate(category,value);}
 function last(){const value=read(),category=value.lastCategory;if(!categoryIds.includes(category))return null;const session=load(category);return session?{category,session}:null;}
 function save(category,session){
  const normalized=normalizeSession({...session,dataVersion:contentVersion});if(!categoryIds.includes(category)||!normalized)return false;
  try{if(!storage)return false;const data=read();if(data.sessions[category]?.dataVersion==='fixed4'){if(!data.legacySessions||typeof data.legacySessions!=='object')data.legacySessions={};data.legacySessions[category]=data.sessions[category];}data.lastCategory=category;data.sessions[category]=normalized;storage.setItem(STORAGE_KEY,JSON.stringify(data));return true;}catch{return false;}
 }
 return {load,last,save};
}
