import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePinyinQuestion,translationWordCount,validateQuestions,conflictsWithPaper,completedSentence,selectNewQuestions,paperLines,questionKey} from '../homework-core.mjs';
import {referenceQuestion,plannedQuestions} from '../homework-plan.mjs';
import {fillHomework} from '../homework-generation.mjs';
const choice={kind:'choice',text:'请把________放在办公室的桌子上。',options:['本子','公司','事情'],answer:'A',explanation:'应填本子。'};
const order=answer=>({kind:'order',text:answer,answer,explanation:'按语序排列。'});
test('fuzzy initials take priority over tone-only distractors without changing the correct answer',()=>{
 for(const [reading,expected]of [['gōng sī','gōng shī'],['běn zi','běn zhi'],['shū jià','sū jià'],['cè shì','chè shì']]){
  const q=preparePinyinQuestion({options:['wrong',reading,'other'],answer:'B'});
  assert.equal(q.options[1],reading);assert.ok(q.options.includes(expected));assert.equal(new Set(q.options).size,3);
  const reference=referenceQuestion('pinyin',{id:'t',word:'测试',reading,options:['tone one','tone two']});
  assert.ok(reference.options.includes(expected));assert.equal(reference.options['ABC'.indexOf(reference.answer)],reading);
 }
 const q=preparePinyinQuestion({options:['zǒng cái','wrong','other'],answer:'A'});
 assert.deepEqual(q.options,['zǒng cái','zhǒng cái','zǒng chái']);
});
test('translation length boundaries count accented Vietnamese and ignore punctuation',()=>{
 for(const count of [9,10,15,16]){
  const text=Array(count).fill('được').join(' ')+'.';
  assert.equal(translationWordCount(text),count);
  const validate=()=>validateQuestions([{text,answer:'请把本子放在桌子上。',explanation:'译文。'}],'translation',1);
  if(count===10||count===15)assert.equal(validate().length,1);else assert.throws(validate,/10—15/);
 }
 assert.equal(translationWordCount('Hôm nay, tôi muốn mua một quyển sách mới cho bạn.'),11);
 assert.equal(translationWordCount('Hôm nay'.normalize('NFD')),2);
});
test('translation uses the generated matching Chinese answer when the source sentence is expanded',()=>{
 const target={id:'t',word:'本子',sentence:'这是本子。',options:[]};
 const answer='今天我想给你买一个新的本子。';
 const result=plannedQuestions('translation',[target],[{id:'t',text:'Hôm nay tôi muốn mua một quyển vở mới cho bạn.',answer}]);
 assert.equal(result.questions[0].answer,answer);
 assert.equal(plannedQuestions('translation',[target],[{id:'t',text:'Đây là vở.',answer}]).questions.length,0);
});
test('fill-in and ordering cannot reuse the same sentence or a near copy',()=>{
 const same=order('请把本子放在办公室的桌子上。');
 assert.equal(completedSentence(choice),same.answer);
 assert.ok(conflictsWithPaper(same,[choice]));assert.ok(conflictsWithPaper(choice,[same]));
 assert.ok(conflictsWithPaper(order('请把本子放在办公室的桌子上！'),[choice]));
 assert.ok(conflictsWithPaper(order('请把本子放在办公室的桌子上面。'),[choice]));
 assert.equal(conflictsWithPaper(order('下班以后我们一起去商店买书架。'),[choice]),false);
});
test('generation sends completed fill-in context, rejects overlapping orders and fills only the rejected slot',async()=>{
 const paper={questions:[choice]};let calls=0;
 await fillHomework(paper,{choice:1,order:2},async({count,avoid})=>{
  assert.ok(avoid.includes(completedSentence(choice)));calls++;
  if(calls===1)return {questions:[order(completedSentence(choice)),order('经理今天下午要和客户一起开会。')]};
  assert.equal(count,1);return {questions:[order('下班以后我们一起去商店买书架。')]};
 });
 assert.equal(calls,2);assert.equal(paper.questions.length,3);
 assert.ok(paper.questions.every(q=>!conflictsWithPaper(q,paper.questions)));
});

// A long source sentence must not force a long Vietnamese translation.
test('translation generation receives a compact word target and a Vietnamese-first schema',async()=>{
 const {generatePlannedBatch}=await import('../backend/conversation/homework-planned.mjs');
 let called=false;
 const env={AI:{run:async(_model,params)=>{
  called=true;
  const input=JSON.parse(params.messages[1].content);
  assert.equal(input.targets[0].sentence,'');
  assert.equal(input.targets[0].word,'生活');
  assert.deepEqual(Object.keys(params.response_format.json_schema.properties.questions.items.properties),['id','text','answer']);
  return {response:{questions:[{id:'t',answer:'今天我要给公司买一个新的本子。',text:'Hôm nay tôi cần mua một quyển vở mới cho công ty.'}]}};
 }}};
 const result=await generatePlannedBatch(env,{bank:'HSK4',title:'生活',kind:'translation',count:1,targets:[{id:'t',word:'',sentence:'生活中并不是缺少美而是我们常常忘了用心观察。',options:[]}],avoid:[],attempt:0},(data)=>data);
 assert.ok(called);assert.equal(result.questions.length,1);
});
test('translation repair receives actual word counts and preserves already valid items',async()=>{
 const {generatePlannedBatch}=await import('../backend/conversation/homework-planned.mjs');let calls=0;
 const valid={id:'a',answer:'今天我要给公司买一个新的本子。',text:'Hôm nay tôi cần mua một quyển vở mới cho công ty.'};
 const env={AI:{run:async(_model,params)=>{
  calls++;if(calls===1)return {response:{questions:[valid,{id:'b',answer:'这是我的本子。',text:'Đây là vở.'}]}};
  const input=JSON.parse(params.messages[1].content);
  assert.equal(input.feedback[0].words,3);assert.deepEqual(input.targets.map(t=>t.id),['b']);
  assert.equal(params.response_format.json_schema.properties.questions.minItems,1);
  assert.deepEqual(Object.keys(params.response_format.json_schema.properties.questions.items.properties),['id','text','answer']);
  return {response:{questions:[{id:'b',answer:valid.answer,text:'Ngày mai tôi cần mua một quyển vở mới cho công ty.'}]}};
 }}};
 const result=await generatePlannedBatch(env,{bank:'HSK1-2',title:'本子',kind:'translation',count:2,targets:['a','b'].map(id=>({id,word:'本子',sentence:'这是我的本子。',options:[]})),avoid:[],attempt:0},data=>data);
 assert.equal(calls,2);assert.equal(result.questions.length,2);assert.equal(result.questions[0].text,valid.text);
});

const officeBlanks=[
 {text:'________里的办公用品',options:['公司','办公','用品'],answer:'A'},
 {text:'公司里的________用品',options:['公司','用品','办公'],answer:'C'},
 {text:'公司里的办公________',options:['用品','办公','公司'],answer:'A'}
].map(q=>({...q,kind:'choice',explanation:'办公室用品。'}));
const lessonBlanks=[
 {text:'这段课文________是什么事情',options:['讲的','公司','办公'],answer:'A'},
 {text:'这段课文讲的是________事情',options:['办公','什么','公司'],answer:'B'},
 {text:'这段课文讲的是什么________',options:['办公','事情','公司'],answer:'B'}
].map(q=>({...q,kind:'choice',explanation:'课文内容。'}));
test('both screenshot examples keep only one question when the blank moves',()=>{
 for(const group of [officeBlanks,lessonBlanks]){
  assert.equal(selectNewQuestions(group,'choice').length,1);
  assert.throws(()=>validateQuestions(group,'choice',3),/重复题目/);
  assert.throws(()=>paperLines({title:'公司办公用品',bank:'HSK1-2',questions:group}),/重复题目/);
 }
});
test('completed sentence deduplication spans requests and preserves valid new slots',async()=>{
 const paper={questions:[officeBlanks[0]]};let calls=0;
 const newQuestion={kind:'choice',text:'请帮我买三张________。',options:['打印纸','电脑','胶水'],answer:'A',explanation:'打印需要纸。'};
 await fillHomework(paper,{choice:2},async({avoid,count})=>{
  assert.ok(avoid.includes('公司里的办公用品'));assert.equal(count,1);calls++;
  return {questions:[calls===1?officeBlanks[1]:newQuestion]};
 });
 assert.equal(calls,2);assert.equal(paper.questions.length,2);
 assert.equal(new Set(paper.questions.map(q=>questionKey(completedSentence(q),'choice'))).size,2);
});
test('courseware titles and classroom prompts cannot be used as reference fill-ins',async()=>{
 const {coursewareTasks}=await import('../homework-courseware-plan.mjs');
 const tasks=coursewareTasks('公司里的办公用品\n这段课文讲的是什么事情？\n请用打印机打印明天开会的资料。\n请把本子放在书架上。');
 assert.ok(tasks.choice.length>0);
 assert.ok(tasks.choice.every(t=>t.sentence===''));
 assert.ok(tasks.choice.every(t=>!['讲的','事情','什么'].includes(t.word)));
 for(const task of tasks.choice)assert.equal(referenceQuestion('choice',task),null);
 const fallback=referenceQuestion('choice',{id:'cw-choice:title',word:'公司',sentence:'公司里的办公用品',options:['办公','用品']});
 assert.equal(fallback,null);
});
test('screenshot double blanks and zero-blank choices are rejected before export',()=>{
 const base={...choice,text:'________室的________很齐全，包括电脑和打印机。',options:['办公','公司','用品'],answer:'A'};
 for(const text of [base.text,'＿＿＿＿室的________很齐全。','办公室的用品很齐全。']){
  const q={...base,text};
  assert.throws(()=>validateQuestions([q],'choice',1),/只能有一个空/);
  assert.deepEqual(selectNewQuestions([q],'choice'),[]);
  assert.throws(()=>paperLines({title:'办公用品',bank:'HSK1-2',questions:[q]}),/只能有一个空/);
 }
 assert.equal(validateQuestions([{...base,text:'办公室的＿＿＿＿很齐全。'}],'choice',1).length,1);
});
test('planned fill-ins never mask a model sentence that already contains a blank',()=>{
 const task={id:'cw-choice:office',word:'办公',sentence:'',options:['公司','用品']};
 for(const text of ['办公室的________很齐全，包括电脑和打印机。','________室的________很齐全。','办公用品和办公设备都在这里。']){
  assert.deepEqual(plannedQuestions('choice',[task],[{id:task.id,text}]).questions,[]);
 }
 const preblanked=plannedQuestions('choice',[task],[{id:task.id,text:'________室的用品很齐全，包括电脑和打印机。'}]);
 assert.equal(preblanked.questions.length,1);assert.equal((preblanked.questions[0].text.match(/[_＿]+/gu)||[]).length,1);
 const result=plannedQuestions('choice',[task],[{id:task.id,text:'办公室的用品很齐全，包括电脑和打印机。'}]);
 assert.equal(result.questions.length,1);
 assert.equal((result.questions[0].text.match(/[_＿]+/gu)||[]).length,1);
 assert.equal(referenceQuestion('choice',{...task,id:'choice:bad',sentence:'办公室的________很齐全。'}),null);
});
test('a double-blank AI item is discarded and only its missing slot is refilled',async()=>{
 const paper={questions:[]};let calls=0;
 await fillHomework(paper,{choice:1},async()=>{
  calls++;
  return {questions:[{...choice,text:calls===1?'请把________放在________上。':'请把________放在办公室的桌子上。'}]};
 });
 assert.equal(calls,2);assert.equal(paper.questions.length,1);
 assert.equal((paper.questions[0].text.match(/[_＿]+/gu)||[]).length,1);
});
