// Only learning content is sent; never include student names or course passwords.
export function lessonContext(exercise,bank){
 if(!exercise?.title||!Array.isArray(exercise.questions))throw Error('请先选择有效的练习题。');
 return {bank:String(bank).slice(0,40),title:exercise.title.slice(0,200),description:String(exercise.description||'').slice(0,500),questions:exercise.questions.slice(0,30).map(q=>({text:String(q.text||'').slice(0,300),explanation:String(q.explanation||'').slice(0,200)}))};
}
export function validateReply(value,opening=false){
 if(!value||typeof value.next!=='string'||!value.next.trim()||value.next.length>500)throw Error('AI 回答格式不正确，请重试。');
 if(!opening&&(typeof value.grammarCorrect!=='boolean'||typeof value.contentCorrect!=='boolean'||typeof value.feedback!=='string'||value.feedback.length>500))throw Error('AI 评估格式不正确，请重试。');
 const needsCorrection=!opening&&(!value.grammarCorrect||!value.contentCorrect);
 if(needsCorrection&&(typeof value.correction!=='string'||!value.correction.trim()||value.correction.length>500))throw Error('AI 未提供示范回答，请重试。');
 return {next:value.next.trim(),feedback:opening?'':value.feedback.trim(),needsCorrection,correction:needsCorrection?value.correction.trim():''};
}
export function spokenReply(reply){return [reply.needsCorrection?'这句话可以这样回答：'+reply.correction:'',reply.next].filter(Boolean).join('\n');}
