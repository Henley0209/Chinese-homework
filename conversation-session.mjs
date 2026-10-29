const prefix='chinese-dialogue-session-v1:';
function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.codePointAt(0),16777619)>>>0;return h.toString(16);}
export function sessionKey(lesson,student=''){return prefix+hash(JSON.stringify([lesson.bank,lesson.title,String(student).trim().slice(0,50)]));}
// Keep fixed-bank progress intact when entering the live topic conversation.
export function topicSessionKey(lesson,student=''){return sessionKey(lesson,student)+':topic-v1';}
export function lessonFingerprint(lesson){return hash(JSON.stringify(lesson));}
const short=(s,max)=>typeof s==='string'&&s.length<=max;
export function validateSession(value,lesson){
 if(!value||value.version!==1||value.lesson!==lessonFingerprint(lesson)||!Array.isArray(value.turns)||value.turns.length>200||!Number.isInteger(value.cursor)||value.cursor<0||value.cursor>=value.turns.length)throw Error('Invalid session');
 for(const t of value.turns){if(!short(t.question,500)||!t.question.trim()||!short(t.pinyin,2000)||!short(t.answer,500)||!Number.isInteger(t.number)||t.number<1)throw Error('Invalid question');if(t.assessment){const a=t.assessment;if(!short(a.feedback,500)||!short(a.feedbackPinyin,2000)||!short(a.correction,500)||!short(a.correctionPinyin,2000)||!short(a.answerPinyin,2000)||typeof a.needsCorrection!=='boolean')throw Error('Invalid feedback');}}
 for(const t of value.turns){if(t.referenceAnswer!==undefined&&(!short(t.referenceAnswer,260)||!short(t.referencePinyin,2000)))throw Error('Invalid reference');if(t.keywords===undefined)t.keywords=[];if(!Array.isArray(t.keywords)||t.keywords.length>12||t.keywords.some(k=>!short(k,20)))throw Error('Invalid keywords');}
 if(value.pendingAction!==null&&!['answer','next','open'].includes(value.pendingAction))throw Error('Invalid pending action');
 if(!Array.isArray(value.playlist)||value.playlist.length>2||value.playlist.some(s=>!short(s,1200))||!Number.isInteger(value.playIndex)||value.playIndex<0||value.playIndex>value.playlist.length)throw Error('Invalid playback');
 return {version:1,lesson:value.lesson,turns:structuredClone(value.turns),cursor:value.cursor,pendingAction:value.pendingAction,playlist:[...value.playlist],playIndex:value.playIndex,scroll:Math.max(0,Math.min(1000000,Number(value.scroll)||0))};
}
export function readSession(storage,key,lesson){try{const raw=storage.getItem(key);return raw?validateSession(JSON.parse(raw),lesson):null;}catch{return null;}}
export function writeSession(storage,key,session,lesson){try{storage.setItem(key,JSON.stringify(validateSession(session,lesson)));return true;}catch{return false;}}
export function questionHistory(turns,cursor,{answer=false}={}){
 const messages=[];for(let i=0;i<cursor;i++){const t=turns[i];if(t.answer)messages.push({role:'assistant',content:t.question},{role:'user',content:t.answer});}
 const current=turns[cursor];messages.push({role:'assistant',content:current.question});if(answer)messages.push({role:'user',content:current.answer});return messages.slice(answer?-20:-19);
}
export function learningProgress(turns,cursor){return {questionNumber:turns[cursor]?.number||1,correctAnswers:turns.slice(0,cursor).filter(t=>t.assessment&&!t.assessment.needsCorrection).length};}


// The same turns render the dialogue and supply context; ungraded answers are still real answers.
export function conversationTranscript(turns,cursor){
 return turns.slice(Math.max(0,cursor-19),cursor+1).map(t=>({question:t.question,answer:t.answer||''}));
}
export function continuationAction(model){
 const turn=model?.turns[model.cursor];
 if(!turn)return 'open';
 if(turn.answer&&!turn.assessment)return 'answer';
 return model.pendingAction==='open'?'next':model.pendingAction;
}
