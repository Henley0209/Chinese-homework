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
 const pinyin=key=>{if(typeof value[key]!=='string'||value[key].length>2000)throw Error('AI 拼音格式不正确，请重试。');return value[key].trim();};
 const nextPinyin=pinyin('nextPinyin'),feedbackPinyin=pinyin('feedbackPinyin'),correctionPinyin=pinyin('correctionPinyin'),answerPinyin=pinyin('answerPinyin');
 if(!nextPinyin||(!opening&&value.feedback.trim()&&!feedbackPinyin)||(needsCorrection&&!correctionPinyin))throw Error('AI 未提供对应拼音，请重试。');
 return {next:value.next.trim(),nextPinyin,feedback:opening?'':value.feedback.trim(),feedbackPinyin:opening?'':feedbackPinyin,needsCorrection,correction:needsCorrection?value.correction.trim():'',correctionPinyin:needsCorrection?correctionPinyin:'',answerPinyin:opening?'':answerPinyin};
}
export function spokenReply(reply){return [reply.needsCorrection?'这句话可以这样回答：'+reply.correction:'',reply.next].filter(Boolean).join('\n');}
