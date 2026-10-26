import {toSimplified} from './vendor/chinese-simplified.mjs';
// This scope is specific to the published HSK greeting lesson, not all HSK courses.
export function isGreetingLesson(lesson){return /HSK\s*1\s*[-—–]\s*2/i.test(lesson?.bank||'')&&/第\s*0?1\s*课.*你好/.test(lesson?.title||'');}
export function topicInstruction(lesson){return isGreetingLesson(lesson)?'本课是HSK第一课“你好！”。只练习打招呼、问候、姓名介绍、认识朋友、感谢、道歉、礼貌邀请和告别。禁止询问赚钱、收入、工资、价格或消费等其他课程内容。即使学生谈到钱，也用一句简短中文引回问候主题。不得把历史中偏题的问题当作本课主题。':'';}
const normalize=text=>toSimplified(String(text||'')).normalize('NFKC').replace(/[\p{P}\p{Z}\p{S}\s]/gu,'');
const questionKey=text=>normalize(String(text||'').split(/[。！？!?；;]/u).filter(s=>s.trim()).at(-1)||text).replace(/^(?:你好|您好|谢谢|好的|早上好|下午好|晚上好)+/u,'');
export function topicViolation(question,lesson,messages=[]){
 const next=normalize(question);
 if(isGreetingLesson(lesson)&&/钱|赚|收入|工资|薪水|薪资|价格|消费|挣钱|盈利|利润|报酬|多少[元块]/.test(next))return '下一句偏离第一课问候主题';
 if(next&&messages.some(m=>m.role==='assistant'&&questionKey(m.content)===questionKey(question)))return '下一句重复了已问过的问题';
 return '';
}
