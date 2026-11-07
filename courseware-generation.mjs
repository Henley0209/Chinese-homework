import {coursewareBanks,coursewareLevels,validateCourseware} from './courseware-core.mjs?v=courseware6';
export const coursewarePhases=['overview','group1','group2','closing'];
export const phaseLabels={overview:'学习目标与热身',group1:'课文一、生词与语法',group2:'课文二、生词与语法',closing:'综合练习、交际与课后任务'};
const text=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const triple=t=>t&&text(t.zh,120)&&text(t.vi,350)&&typeof t.pinyin==='string'&&t.pinyin.length<=600;
const spoken=t=>triple(t)&&text(t.pinyin,600);
const block=b=>b&&triple(b.title)&&Array.isArray(b.items)&&b.items.length>=1&&b.items.length<=4&&b.items.every(triple);
export function validateCoursewarePart(phase,part){
 if(!part||!coursewarePhases.includes(phase))throw Error('AI课件格式无效。');
 if(phase==='overview'){
  if(!spoken(part.title)||!text(part.difficulty,180)||!Array.isArray(part.objectives)||part.objectives.length<2||part.objectives.length>4||!part.objectives.every(triple)||!block(part.warmup))throw Error('学习目标或热身内容不完整。');
 }else if(phase==='closing'){
  if(!Array.isArray(part.practice)||part.practice.length<1||part.practice.length>2||!part.practice.every(block)||!['communication','culture','homework'].every(k=>block(part[k])))throw Error('综合练习或课后任务不完整。');
 }else{
  if(!spoken(part.title)||!Array.isArray(part.dialogue)||part.dialogue.length<6||part.dialogue.length>8||!part.dialogue.every(t=>spoken(t)&&['A','B'].includes(t.speaker))||new Set(part.dialogue.map(t=>t.speaker)).size!==2)throw Error('课文须包含两人三语对话。');
  if(!Array.isArray(part.vocabulary)||part.vocabulary.length!==8||part.vocabulary.some(t=>!spoken(t)||!text(t.pos,20))||new Set(part.vocabulary.map(t=>t.zh)).size!==8)throw Error('生词须包含8个不同词语、拼音、词性及越南语。');
  const full=part.dialogue.map(t=>t.zh).join('');
  if(part.vocabulary.some(t=>!full.includes(t.zh)))throw Error('生词必须出现在本组课文中。');
  if(!Array.isArray(part.exercises)||part.exercises.length!==5)throw Error('必须返回5道填空题。');
  for(const [i,t]of part.exercises.entries()){
   if(!spoken(t)||!spoken(t.answer))throw Error(`第${i+1}题缺少对应拼音或越南语。`);
   if((t.zh.match(/____/g)||[]).length!==1)throw Error(`第${i+1}题必须恰有一个____空缺。`);
   if(!part.vocabulary.some(w=>w.zh===t.answer.zh))throw Error(`第${i+1}题答案“${t.answer.zh}”不在本组生词中；可用：${part.vocabulary.map(w=>w.zh).join('、')}。`);
  }
  if(new Set(part.exercises.map(t=>t.zh.replace('____',t.answer.zh))).size!==5)throw Error('填空题重复。');
  if(!Array.isArray(part.grammar)||part.grammar.length<1||part.grammar.length>2||!part.grammar.every(block)||!block(part.comprehension))throw Error('语法讲解或课文理解不完整。');
 }
 return part;
}
export function coursewareSource(entry,bank){
 if(!entry||!Object.hasOwn(coursewareBanks,bank)||entry.bank!==bank||!/^[-\w]{1,100}$/.test(entry.id))throw Error('请选择课件主题。');
 const exercise=entry.exercise,title=exercise.title;
 const q=exercise.questions||[];
 const samples=[...q.filter(t=>t.targetWord).slice(0,8),...q.filter(t=>t.completeSentence).slice(0,6),...q.filter(t=>t.type==='fill').slice(0,4)];
 const context=JSON.stringify({description:exercise.description,examples:samples.map(t=>({text:t.text,target:t.targetWord,grammar:t.grammarFocus,example:t.completeSentence,vi:t.vietnamese}))}).slice(0,6500);
 return {id:entry.id,bank,title,context,number:Number(title.match(/第\s*(\d+)\s*课/)?.[1]||0)};
}
export function assembleCourseware(source,parts){
 for(const phase of coursewarePhases)validateCoursewarePart(phase,parts[phase]);
 const overview=parts.overview;
 return validateCourseware({...overview,...parts.closing,schemaVersion:2,id:source.id,bank:source.bank,number:source.number,difficulty:coursewareLevels[source.bank]+'；'+overview.difficulty,image:'courseware/assets/beginner-scenes.png',origin:'ai-generated',groups:['group1','group2'].map(key=>({...parts[key],scene:null,roles:{A:'A',B:'B'}}))});
}
// Completed phases survive errors; credentials are never retained in the draft.
export async function fillCourseware(source,parts,request,{signal,onProgress=()=>{}}={}){
 const check=()=>{if(signal?.aborted)throw new DOMException('已取消生成','AbortError');};
 for(const phase of coursewarePhases){
  check();if(parts[phase]){validateCoursewarePart(phase,parts[phase]);continue;}
  onProgress({phase,done:Object.keys(parts).length});
  let repair='';
  for(let attempt=0;;attempt++){
   try{
    const part=await request({phase,source,overview:parts.overview,previous:phase==='group2'?parts.group1:undefined,attempt,repair});check();
    validateCoursewarePart(phase,part);parts[phase]=part;break;
   }catch(error){check();repair=String(error.message||'').slice(0,500);if([400,401,403,429].includes(error.status)||attempt>=2)throw error;}
  }
 }
 check();return assembleCourseware(source,parts);
}
