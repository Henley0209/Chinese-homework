// Keep each student's exercise independent; invalidate saved answers when questions change.
export function progressKey(name, bank, id) {
 return 'qinglan-exercise-progress-v1:'+JSON.stringify([name.trim(),bank,id]);
}
export function saveProgress(key, exercise, answers, position, storage=globalThis.localStorage) {
 try {
  storage.setItem(key,JSON.stringify({version:1,exercise:JSON.stringify(exercise),answers,position}));
  return true;
 } catch { return false; }
}
export function loadProgress(key, exercise, storage=globalThis.localStorage) {
 try {
  const value=JSON.parse(storage.getItem(key));
  if(value?.version!==1||value.exercise!==JSON.stringify(exercise)||!value.answers||typeof value.answers!=='object')return null;
  const answers={};
  for(const q of exercise.questions){
   const answer=value.answers[q.id];
   answers[q.id]=typeof answer==='string'&&(q.type!=='choice'||'ABCD'.includes(answer)&&answer.length===1)?answer.slice(0,200):'';
  }
  const p=value.position;
  const position=p&&Number.isInteger(p.index)&&p.index>=0&&p.index<exercise.questions.length&&Number.isFinite(p.offset)?{index:p.index,offset:p.offset}: {index:0,offset:0};
  return {answers,position};
 } catch { return null; }
}
export function clearProgress(key, storage=globalThis.localStorage) {
 try {storage.removeItem(key);return true;}catch{return false;}
}
