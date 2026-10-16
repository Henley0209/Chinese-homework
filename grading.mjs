export const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
export function validate(data){
 if(!data || typeof data.title!=='string'||!data.title.trim()||!Array.isArray(data.questions)||data.questions.length<10||data.questions.length>50) throw Error('题库需要标题和10—50道题。');
 const ids=new Set();
 for(const q of data.questions){
  if(!q||!['choice','fill'].includes(q.type)||!Number.isInteger(q.id)||ids.has(q.id)||typeof q.text!=='string'||!q.text.trim()||!Number.isFinite(q.points)||q.points<=0||!Array.isArray(q.answers)||!q.answers.length||q.answers.some(a=>typeof a!=='string'||!normalize(a))) throw Error('题目编号、题型、题干、分值或答案格式有误。');
  ids.add(q.id);
  for(const key of ['pinyin','vietnamese','explanation']) if(q[key]!==undefined && typeof q[key]!=='string') throw Error('拼音、越南语和解析必须是文本。');
  if(q.type==='choice'&&(!q.options||Object.keys(q.options).length!==4||!'ABCD'.split('').every(k=>typeof q.options[k]==='string'&&q.options[k].trim())||q.answers.length!==1||!Object.hasOwn(q.options,q.answers[0]))) throw Error('选择题必须包含A、B、C、D四个选项和一个正确答案。');
 }
 return data;
}
export function grade(data,answers){
 const details=data.questions.map(q=>{const answer=String(answers[q.id]??'');const correct=!!normalize(answer)&&q.answers.some(a=>normalize(a)===normalize(answer));return {id:q.id,answer,correct,earned:correct?q.points:0};});
 return {score:details.reduce((s,d)=>s+d.earned,0),total:data.questions.reduce((s,q)=>s+q.points,0),correct:details.filter(d=>d.correct).length,details};
}
