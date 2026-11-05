import {courseTasks} from './homework-plan.mjs?v=homework-rules1';
import {extractChinese} from './homework-courseware.mjs?v=courseware-fix2';
const han=/\p{Script=Han}/u;
const headings=/^(?:口语练习|练习|词语|生词|词汇|对话|课文|请回答下面的问题|请回答问题|汉语|中文|答案|原因)$/u;
export function coursewareTasks(text,exercises=[]){
 const content=extractChinese(text),readings=new Map();
 // Reuse only verified readings of exact words present in this courseware.
 for(const exercise of exercises)for(const t of courseTasks(exercise).pinyin)if(t.reading&&content.includes(t.word)&&!readings.has(t.word))readings.set(t.word,t.reading);
 const sentences=[...new Set(content.split(/[\n。！？；]+/u).map(s=>s.replace(/^[，、：\s]+|[，、：\s]+$/gu,'')).filter(s=>[...s].filter(c=>han.test(c)).length>=5&&s.length<=180&&!headings.test(s)))];
 const words=new Set();
 const segmenter=new Intl.Segmenter('zh-CN',{granularity:'word'});
 for(const part of segmenter.segment(content))if(/^\p{Script=Han}{2,8}$/u.test(part.segment)&&!headings.test(part.segment))words.add(part.segment);
 // Known compounds supplement segmentation without importing unrelated bank words.
 for(const word of readings.keys())if(word.length>=2&&word.length<=8&&!headings.test(word))words.add(word);
 const multi=[...words];
 for(const part of segmenter.segment(content))if(/^\p{Script=Han}$/u.test(part.segment))words.add(part.segment);
 const vocabulary=[...words].slice(0,120).map((word,i)=>({id:'cw-word:'+i,word,reading:readings.get(word)||'',sentence:sentences.find(s=>s.includes(word))||'',options:[],explanation:''}));
 const pinyin=[...vocabulary].sort((a,b)=>Number(Boolean(b.reading))-Number(Boolean(a.reading))||Number(b.word.length>1)-Number(a.word.length>1));
 const choice=vocabulary.filter(t=>t.word.length>1).map(t=>({...t,id:'cw-choice:'+t.id,options:multi.filter(w=>w!==t.word).slice(0,2)}));
 const sentenceTargets=sentences.map((sentence,i)=>({id:'cw-sentence:'+i,word:multi.find(w=>sentence.includes(w))||'',sentence,options:[],explanation:''}));
 // A word without a sentence asks AI to compose a fresh sentence around that word.
 const expanded=[...sentenceTargets,...vocabulary.map(t=>({...t,sentence:''}))];
 return {pinyin,choice,order:expanded.map((t,i)=>({...t,id:'cw-order:'+i})),translation:expanded.map((t,i)=>({...t,id:'cw-translation:'+i}))};
}
export function checkCoursewareCounts(tasks,counts){
 const labels={pinyin:'拼音选择题',choice:'填空选择题',order:'句子排序题',translation:'翻译题'};
 const errors=Object.keys(labels).filter(k=>(counts[k]||0)>tasks[k].length).map(k=>`${labels[k]}需要${counts[k]}个目标，当前课件可用${tasks[k].length}个`);
 if(errors.length)throw Error(errors.join('；')+'。请减少相应题数或上传更多中文内容。');
}
