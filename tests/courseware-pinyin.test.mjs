import test from 'node:test';
import assert from 'node:assert/strict';
import {coursewarePinyin,correctCoursewarePinyin} from '../courseware-pinyin.mjs';
test('dictionary readings cover screenshot errors and contextual polyphones',()=>{
 for(const [zh,expected]of [
  ['请','qǐng'],['请假','qǐng jià'],['申请','shēn qǐng'],['审批流程','shěn pī liú chéng'],
  ['调班','tiáo bān'],['调整','tiáo zhěng'],['调查','diào chá'],['岗位','gǎng wèi'],
  ['银行行长','yín háng háng zhǎng'],['长大','zhǎng dà'],['了解','liǎo jiě'],
  ['掌握请假申请与审批流程用语','zhǎng wò qǐng jià shēn qǐng yǔ shěn pī liú chéng yòng yǔ']
 ])assert.equal(coursewarePinyin(zh),expected,zh);
});
test('cloze answers supply reading context without revealing the answer',()=>{
 assert.equal(coursewarePinyin('你____了吗？','请假'),'nǐ ____ le ma？');
 assert.equal(coursewarePinyin('我在____工作。','银行'),'wǒ zài ____ gōng zuò。');
 assert.equal(coursewarePinyin('____假需要提前申请。','请'),'____ jià xū yào tí qián shēn qǐng。');
});
test('all nested teaching fields and answers are corrected; optional omissions and source remain intact',()=>{
 const bad={zh:'请假',pinyin:'qǐ jià',vi:'Xin nghỉ'};
 const source={title:bad,objectives:[bad],groups:[{dialogue:[bad],vocabulary:[bad],grammar:[{title:bad,items:[bad]}],exercises:[{...bad,answer:bad}]}],optional:{...bad,pinyin:''}};
 const result=correctCoursewarePinyin(source);
 assert.equal(result.title.pinyin,'qǐng jià');assert.equal(result.objectives[0].pinyin,'qǐng jià');
 for(const field of ['dialogue','vocabulary'])assert.equal(result.groups[0][field][0].pinyin,'qǐng jià');
 assert.equal(result.groups[0].grammar[0].items[0].pinyin,'qǐng jià');
 assert.equal(result.groups[0].exercises[0].answer.pinyin,'qǐng jià');
 assert.equal(result.optional.pinyin,'');assert.equal(source.title.pinyin,'qǐ jià');
 assert.equal(result.title.zh,source.title.zh);assert.equal(result.title.vi,source.title.vi);
 assert.deepEqual(correctCoursewarePinyin(result),result);
});
