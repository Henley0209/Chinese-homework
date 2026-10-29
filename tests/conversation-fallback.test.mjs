import test from 'node:test';
import assert from 'node:assert/strict';
import {fallbackQuestion} from '../conversation-fallback.mjs';
import {topicViolation} from '../conversation-topic.mjs';
import {lessonTopics} from '../conversation-topics.mjs';
test('every published course has an in-scope continuation and avoids already asked fallback questions',()=>{
 for(const lesson of lessonTopics){
  const history=[{role:'assistant',content:'刚才的问题？'},{role:'user',content:'我的回答。'}];
  for(let i=0;i<4;i++){
   const q=fallbackQuestion(lesson,history);assert.ok(q,lesson.title);assert.equal(topicViolation(q.next,lesson,history),'');assert.ok(q.nextPinyin);assert.doesNotMatch(q.nextPinyin,/[\p{Script=Han}]/u);
   history.push({role:'assistant',content:q.next},{role:'user',content:'好。'});
  }
 }
});
test('school-time dialogue gets a new scheduling detail rather than repeating the confirmed time',()=>{
 const lesson={bank:'HSK1-2',title:'HSK1-2 第20课 你几点起床？'};
 const history=[{role:'assistant',content:'你明天几点去学校？'},{role:'user',content:'明天也是8点去学校'}];
 const q=fallbackQuestion(lesson,history);assert.ok(q);assert.notEqual(q.next,history[0].content);assert.equal(topicViolation(q.next,lesson,history),'');
});
