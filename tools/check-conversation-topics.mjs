// Run against the real configured Worker after deployment; no credentials required.
import {readFileSync} from 'node:fs';
import {lessonTopics} from '../conversation-topics.mjs';
import {topicProfile,topicViolation} from '../conversation-topic.mjs';
import {validateReply} from '../conversation-core.mjs';
const {endpoint}=JSON.parse(readFileSync(new URL('../conversation-config.json',import.meta.url)));
const cases=[
 ['日常交际 第17课 服务员，我们要点菜','我想吃米饭和蔬菜，不要太辣。'],
 ['HSK1-2 第19课 这个多少钱？','我想买一件蓝色衣服，预算两百元。'],
 ['HSK1-2 第21课 今天的天气怎么样？','今天晴天，气温二十五度。'],
 ['HSK3 第10课 去医院看医生','我有点咳嗽，想去医院看看。'],
 ['HSK4 第14课 保护地球母亲','我平时会给垃圾分类，少用塑料袋。'],
 ['HSK5 第16课 科技与人工智能','人工智能可以帮助我学习，但我会保护个人信息。'],
 ['HSK5 第06课 消费观与理财','我每个月存五百元，先做预算。'],
 ['汉语工厂 第21课 设备状态与异常报告','设备有报警，请工程师检查。'],
];
for(const [title,answer] of cases){
 const course=lessonTopics.find(p=>p.title===title);if(!course)throw Error('Missing probe course: '+title);
 const profile=topicProfile(course),lesson={title,bank:course.bank,description:profile.scope,questions:profile.goals.map(text=>({text,explanation:''}))};
 const history=[];let keywords=[];
 for(const action of ['open','answer']){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://henley0209.github.io'},body:JSON.stringify({lesson,action,messages:history,keywords,progress:{questionNumber:1,correctAnswers:0}}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error(`${title}: HTTP ${response.status}: ${await response.text()}`);
  const raw=await response.json(),reply=validateReply(raw,action==='open');
  const reason=topicViolation(reply.next,lesson,history);if(reason)throw Error(`${title}: ${reason}: ${reply.next}`);
  if(action==='open'){history.push({role:'assistant',content:reply.next},{role:'user',content:answer});keywords=reply.nextKeywords;}
  console.log(`Verified topic ${title} [${action}]: ${reply.next}`);
 }
}
console.log(`Verified ${cases.length} representative topics with real AI openings and follow-ups.`);
