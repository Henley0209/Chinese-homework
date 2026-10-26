import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topicProfile,topicInstruction,topicViolation} from '../conversation-topic.mjs';
import {lessonTopics} from '../conversation-topics.mjs';
const manifest=JSON.parse(readFileSync(new URL('../conversation-banks/manifest.json',import.meta.url)));
const lesson=(title,bank='日常交际')=>({title,bank,description:'',questions:[]});
test('all published courses have an explicit scope, goals and grade-aware instructions',()=>{
 assert.equal(lessonTopics.length,manifest.totalExercises);
 for(const course of manifest.exercises){const p=topicProfile(course);assert.equal(p.published,true,course.title);assert.notEqual(p.domain,'custom');assert.ok(p.goals.length>=3);assert.ok(p.allowed.includes(p.domain));assert.ok(topicInstruction(course).includes(course.title));}
 assert.match(topicInstruction(lesson('HSK5 第16课 科技与人工智能','HSK5')),/课程等级HSK5/);
});
test('each published scope blocks irrelevant salary questions, but income lessons permit them',()=>{
 for(const course of manifest.exercises){const p=topicProfile(course),value=topicViolation('你今天赚了多少钱？',course);
  assert.equal(!!value,!['budget','career','negotiation'].includes(p.domain),course.title);
 }
});
test('shopping permits price and product questions without permitting personal earnings',()=>{
 const l=lesson('HSK1-2 第19课 这个多少钱？','HSK1-2');
 assert.equal(topicViolation('你想买多少钱的衣服？',l),'');
 assert.equal(topicViolation('你喜欢什么颜色？',l),'');
 assert.ok(topicViolation('你今天赚了多少钱？',l));assert.ok(topicViolation('你最近有没有发烧？',l));
});
test('weather, health and factory scopes reject recognized unrelated topics',()=>{
 const weather=lesson('HSK1-2 第21课 今天的天气怎么样？','HSK1-2');
 assert.equal(topicViolation('你那边下雨了吗？',weather),'');assert.ok(topicViolation('你想吃什么菜？',weather));
 const health=lesson('HSK3 第10课 去医院看医生','HSK3');
 assert.equal(topicViolation('哪里不舒服？',health),'');assert.ok(topicViolation('你想买哪件衣服？',health));
 const factory=lesson('汉语工厂 第21课 设备状态与异常报告','汉语工厂');
 assert.equal(topicViolation('设备出现什么报警？',factory),'');assert.ok(topicViolation('你想喝咖啡还是茶？',factory));
});
test('natural elliptical follow-ups and related costs remain valid',()=>{
 const dining=lesson('HSK4 第26课 在中国餐厅点菜','HSK4');
 assert.equal(topicViolation('要热的还是冰的？',dining),'');assert.equal(topicViolation('这道菜多少钱？',dining),'');
 assert.equal(topicViolation('几个人？',dining),'');
 const rental=lesson('日常交际 第22课 我想租一套房子');assert.equal(topicViolation('你能接受多少房租？',rental),'');
 assert.ok(topicViolation('你每个月工资是多少？',rental));
});
test('all domains reject repeated questions despite punctuation and greeting prefixes',()=>{
 for(const course of manifest.exercises)assert.ok(topicViolation('你好！你有什么计划？',course,[{role:'assistant',content:'你有什么计划?'}]));
});
test('teacher drafts derive scope from the course title and do not follow student topic changes',()=>{
 const l=lesson('老师自编课：餐厅点菜');assert.equal(topicProfile(l).domain,'dining');
 assert.equal(topicViolation('你喜欢吃什么菜？',l),'');assert.ok(topicViolation('你今天赚了多少钱？',l));
 assert.equal(topicProfile(lesson('老师自编课：宇宙探索')).domain,'custom');
});
