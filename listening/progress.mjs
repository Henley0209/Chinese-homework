const STORAGE_KEY='chinese-listening-progress-v1';
const categoryIds=['hsk','daily','factory'];
const rates=[.65,.8,.85,1];
function normalizeSession(value){
 if(!value||value.dataVersion!=='fixed4'||!Array.isArray(value.questions)||value.questions.length!==10)return null;
 const questions=[];
 for(const q of value.questions){
  if(!q||typeof q.text!=='string'||!q.text||q.text.length>2000||typeof q.question!=='string'||!q.question||q.question.length>500||!Array.isArray(q.options)||q.options.length!==4||!q.options.every(s=>typeof s==='string'&&s.length>0&&s.length<=500)||!Number.isInteger(q.answer)||q.answer<0||q.answer>3)return null;
  questions.push({text:q.text,question:q.question,options:[...q.options],answer:q.answer});
 }
 if(!Number.isInteger(value.index)||value.index<0||value.index>=questions.length||!Array.isArray(value.answers)||value.answers.length!==questions.length||!value.answers.every(a=>a===null||(Number.isInteger(a)&&a>=0&&a<4)))return null;
 if(value.finished&&!value.answers.every(Number.isInteger))return null;
 return {dataVersion:'fixed4',questions,index:value.index,answers:[...value.answers],finished:value.finished===true,rate:rates.includes(value.rate)?value.rate:.8};
}
export function createListeningProgress(storage){
 function read(){try{const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(value?.version===1&&value.sessions&&typeof value.sessions==='object'&&!Array.isArray(value.sessions))return value;}catch{}return {version:1,lastCategory:null,sessions:{}};}
 function load(category){if(!categoryIds.includes(category))return null;return normalizeSession(read().sessions[category]);}
 function last(){const value=read(),category=value.lastCategory;if(!categoryIds.includes(category))return null;const session=normalizeSession(value.sessions[category]);return session?{category,session}:null;}
 function save(category,session){
  const normalized=normalizeSession({...session,dataVersion:'fixed4'});if(!categoryIds.includes(category)||!normalized)return false;
  try{if(!storage)return false;const data=read();data.lastCategory=category;data.sessions[category]=normalized;storage.setItem(STORAGE_KEY,JSON.stringify(data));return true;}catch{return false;}
 }
 return {load,last,save};
}
