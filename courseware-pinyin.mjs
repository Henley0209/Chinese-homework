import {pinyin} from './vendor/pinyin-pro.mjs';
// Use dictionary word segmentation, with citation tones for 一/不 in teaching text.
// Complete a cloze before reading it so adjacent polyphones keep their context.
export function coursewarePinyin(zh,answer=''){
 const gap=zh.indexOf('____');
 const completed=gap>=0&&answer?zh.slice(0,gap)+answer+zh.slice(gap+4):zh;
 let offset=0;
 const tokens=[];
 for(const token of pinyin(completed,{type:'all',toneSandhi:false,nonZh:'consecutive'})){
  const start=offset;offset+=token.origin.length;
  if(gap>=0&&answer&&start>=gap&&start<gap+answer.length){if(start===gap)tokens.push('____');continue;}
  tokens.push(token.result);
 }
 return tokens.join(' ').replace(/\s+([，。！？；：、,.!?;:])/gu,'$1').replace(/\s+/gu,' ').trim();
}
// Return a copy: callers may retain an AI draft or a checked-in source fixture.
// Empty optional pinyin stays empty; validation still rejects required omissions.
export function correctCoursewarePinyin(value){
 if(Array.isArray(value))return value.map(correctCoursewarePinyin);
 if(!value||typeof value!=='object')return value;
 const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,correctCoursewarePinyin(item)]));
 if(typeof result.zh==='string'&&typeof result.pinyin==='string'&&result.pinyin.trim()&&/\p{Script=Han}/u.test(result.zh))result.pinyin=coursewarePinyin(result.zh,result.answer?.zh);
 return result;
}
