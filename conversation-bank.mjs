import {lessonFingerprint} from './conversation-session.mjs?v=bank2001';
import {cleanKeywords} from './conversation-keywords.mjs';
let manifestPromise;
export function validateDialogueBank(value,context){
 if(value?.version!==1||value.count!==200||value.sourceHash!==lessonFingerprint(context)||!Array.isArray(value.items)||value.items.length!==200)throw Error('对话题库格式不正确');
 const ids=new Set(),questions=new Set();let previousLevel=0;
 for(const [index,item] of value.items.entries()){
  if(typeof item.id!=='string'||ids.has(item.id)||item.number!==index+1||typeof item.question!=='string'||!item.question||item.question.length>300||questions.has(item.question)||typeof item.pinyin!=='string'||!item.pinyin||item.pinyin.length>2000||typeof item.referenceAnswer!=='string'||!item.referenceAnswer||item.referenceAnswer.length>260||typeof item.referencePinyin!=='string'||!item.referencePinyin||item.referencePinyin.length>2000||![1,2,3].includes(item.level)||item.level<previousLevel)throw Error('对话题目内容无效');
  item.keywords=cleanKeywords(item.keywords);if(!item.keywords.length||item.keywords.some(k=>!item.referenceAnswer.includes(k)))throw Error('参考回答缺少关键词');
  ids.add(item.id);questions.add(item.question);previousLevel=item.level;
 }
 return value;
}
export async function loadDialogueBank(context){
 try{
  if(!manifestPromise)manifestPromise=fetch(new URL('./conversation-banks/manifest.json',import.meta.url),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(error=>{manifestPromise=null;throw error;});
  const manifest=await manifestPromise,entry=manifest.exercises?.find(e=>e.bank===context.bank&&e.title===context.title&&e.sourceHash===lessonFingerprint(context));if(!entry)return null;
  if(!/^[a-zA-Z0-9_-]+\.json$/.test(entry.file))throw Error();const r=await fetch(new URL('./conversation-banks/'+entry.file+'?v='+entry.sourceHash,import.meta.url),{cache:'no-store'});if(!r.ok)throw Error();return validateDialogueBank(await r.json(),context);
 }catch{return null;}
}
export const completionQuestion={question:'本课200组对话已完成。你可以回到前面的题目复习，也可以从头练习。',pinyin:'Běn kè liǎng bǎi zǔ duìhuà yǐ wánchéng. Nǐ kěyǐ huí dào qiánmiàn de tímù fùxí, yě kěyǐ cóngtóu liànxí.',keywords:[]};
