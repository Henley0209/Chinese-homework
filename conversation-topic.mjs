import {toSimplified} from './vendor/chinese-simplified.mjs';
import {topicDomains,lessonTopics} from './conversation-topics.mjs?v=scopes1';
const normalize=text=>toSimplified(String(text||'')).normalize('NFKC').replace(/[\p{P}\p{Z}\p{S}\s]/gu,'');
const questionKey=text=>{
 let key=normalize(String(text||'').replace(/^[^，,：:]{1,12}[，,：:]/u,'').split(/[。！？!?；;]/u).filter(s=>s.trim()).at(-1)||text)
  .replace(/^(?:你好|您好|谢谢|好的|早上好|下午好|晚上好)+/u,'');
 // A learner's name, an optional subject and a greeting do not create a new question.
 key=key.replace(/^你(?!们)/u,'').replace(/过的/gu,'过得');
 if(/^(?:今天|今日)?过得(?:怎么样|如何|好吗)$/u.test(key))return 'day-wellbeing';
 if(/^(?:今天|最近|现在)?(?:好不好|好吗|怎么样)$/u.test(key))return 'wellbeing';
 return key;
};
const profileKey=lesson=>normalize(lesson?.bank)+'|'+normalize(lesson?.title);
const profiles=new Map(lessonTopics.map(profile=>[profileKey(profile),profile]));
const patterns=Object.entries(topicDomains).map(([id,domain])=>[id,new RegExp(domain.pattern,'u')]);
export function isGreetingLesson(lesson){return /HSK\s*1\s*[-—–]\s*2/i.test(lesson?.bank||'')&&/第\s*0?1\s*课.*你好/.test(lesson?.title||'');}
export function topicProfile(lesson){
 const existing=profiles.get(profileKey(lesson));
 // Teacher drafts and new lessons derive scope from their own title, not student messages.
 const title=String(lesson?.title||'').replace(/^.*?第\s*\d+\s*课\s*/u,'').split(/[：:]/u).at(-1);
 const inferred=patterns.map(([id,pattern])=>({id,match:pattern.exec(title)})).filter(x=>x.match).sort((a,b)=>b.match[0].length-a.match[0].length||a.match.index-b.match.index)[0]?.id;
 const id=existing?.domain||(isGreetingLesson(lesson)?'greeting':inferred);
 const domain=topicDomains[id];
 return {title:String(lesson?.title||''),domain:id||'custom',scope:domain?.scope||title,goals:domain?.goals||['围绕课程核心词语交流','交流相关经历和需求','确认与课程相关的下一步'],allowed:domain?[id,...domain.related]:[],published:!!existing};
}
export function topicInstruction(lesson){
 const p=topicProfile(lesson);
 const level=/HSK\s*([345])/i.exec(lesson?.bank||'')?.[1];
 const difficulty=level?`课程等级HSK${level}：词汇与句式遵守该等级，按学生回答逐步加入原因、比较、经历和观点。`:'初级或应用口语：从课程熟悉词语和简短问句开始，再逐步加入情境表达。';
 const greeting=p.domain==='greeting'?'只练习打招呼、问候、姓名介绍、认识朋友、感谢、道歉、礼貌邀请和告别。':'';
 return `本课主题数据：${JSON.stringify({title:p.title,scope:p.scope,goals:p.goals})}。${greeting}${difficulty}每一轮只选择一个本课内尚未完成的交流目标，开场直接进入该主题。承接学生真实回复中的具体信息；已确认的信息不得反复询问。学生答非所问或要求换主题时，简短引回本课并换一个相关目标。不要转为其他课程的问候、收入或购物话题；只有课程范围涉及这些内容时才能讨论。历史中偏题的问题不是本课主题。`;
}
export function topicViolation(question,lesson,messages=[]){
 const next=normalize(question),p=topicProfile(lesson);
 if(!next)return '';// Output shape is validated separately.
 if(messages.some(m=>m.role==='assistant'&&questionKey(m.content)===questionKey(question)))return '下一句重复了已问过的问题';
 const income=/赚.*钱|挣钱|收入|工资|薪水|薪资|存款|盈利|利润|报酬/u;
 const financeScope=['budget','career','negotiation'].includes(p.domain)||/收入|工资|薪资|理财|赚钱/u.test(p.title);
 if(income.test(next)&&!financeScope)return '下一句偏离本课主题，询问了收入或赚钱';
 const priceScope=['dining','drinks','shopping','returns','payment','budget','transport','travel','hotel','home','repair','delivery','telecom','career','negotiation','medicine','health'].includes(p.domain);
 if(/多少钱|价格|票价|租金|房租|收费|多少[元块]/u.test(next)&&p.allowed.length&&!priceScope)return '下一句偏离本课主题，询问了价格或费用';
 const detected=patterns.filter(([,pattern])=>pattern.test(next)).map(([id])=>id);
 // Only reject a recognized foreign domain. Elliptical natural follow-ups remain valid.
 if(p.allowed.length&&detected.length&&!detected.some(id=>p.allowed.includes(id)))return '下一句偏离本课主题：'+p.scope;
 return '';
}
