export const kinds={pinyin:'拼音选择题',choice:'填空选择题',order:'句子排序题',translation:'翻译题'};
export function cleanQuestionText(value){
 if(typeof value!=='string')return value;
 return value.trim().replace(/^(?:(?:第\s*)?\d+\s*[.．、)）]\s*)?(?:[【\[（(]\s*(?:拼音选择题?|填空选择题?|选词填空|句子排序题?|翻译题?)\s*[】\]）)]\s*[:：]?\s*)+/u,'').trim();
}
export function cleanOption(value){
 return typeof value==='string'?value.normalize('NFC').trim().replace(/^(?:[（(【\[]?\s*[A-DＡ-Ｄ]\s*(?:[）)】\]]\s*[.．、:：]?|[.．、:：])\s*)+/u,'').trim():value;
}
function normalizeQuestion(q){
 if(!q||typeof q!=='object')return q;
 let answer=typeof q.answer==='string'?q.answer.trim().replace(/^(?:参考答案|正确答案|答案)\s*[:：]\s*/u,''):q.answer;
 if(Array.isArray(q.options)&&typeof answer==='string'){
  const match=answer.normalize('NFKC').match(/^([A-D])(?:[.、:：)）\s]|$)/i);if(match)answer=match[1].toUpperCase();
 }
 return {...q,text:cleanQuestionText(q.text),answer,options:Array.isArray(q.options)?q.options.map(cleanOption):q.options};
}
export function preparePinyinQuestion(q){
 if(!Array.isArray(q?.options)||![3,4].includes(q.options.length)||!['A','B','C','D'].includes(q.answer))return q;
 const correctIndex='ABCD'.indexOf(q.answer),correct=q.options[correctIndex];
 if(typeof correct!=='string'||!correct.trim())return q;
 // Prefer fuzzy initials, keeping the original finals and tones intact.
 const candidates=[];
 const syllables=correct.split(/(\s+|['’])/u);
 for(const pattern of [/^(zh|ch|sh|z|c|s)/iu,/^(n|l|f|h)/iu]){
  for(let i=0;i<syllables.length;i++){
   const match=syllables[i].match(pattern);if(!match)continue;
   const pairs={z:'zh',zh:'z',c:'ch',ch:'c',s:'sh',sh:'s',n:'l',l:'n',f:'h',h:'f'};
   const parts=[...syllables],initial=match[0],replacement=pairs[initial.toLowerCase()];
   parts[i]=(initial[0]===initial[0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement)+parts[i].slice(initial.length);
   candidates.push(parts.join(''));
  }
  if(candidates.length>=q.options.length-1)break;
 }
 // If only one initial can be confused, vary its tone for a second fuzzy option.
 if(candidates.length===1){
  const fuzzy=candidates[0];
  for(const tones of ['āáǎà','ēéěè','īíǐì','ōóǒò','ūúǔù','ǖǘǚǜ']){
   const index=[...fuzzy].findIndex(c=>tones.includes(c.toLowerCase()));if(index<0)continue;
   for(const tone of tones){const chars=[...fuzzy];chars[index]=chars[index]===chars[index].toUpperCase()?tone.toUpperCase():tone;const option=chars.join('');if(option!==fuzzy)candidates.push(option);}
   break;
  }
 }
 candidates.push(...q.options.filter(o=>typeof o==='string'&&o.trim()&&o!==correct));
 for(const tones of ['āáǎà','ēéěè','īíǐì','ōóǒò','ūúǔù','ǖǘǚǜ']){
  const index=[...correct].findIndex(c=>tones.includes(c.toLowerCase()));if(index<0)continue;
  for(const tone of tones){const chars=[...correct];chars[index]=chars[index]===chars[index].toUpperCase()?tone.toUpperCase():tone;const option=chars.join('');if(option!==correct)candidates.push(option);}
 }
 const unique=[...new Set(candidates)];if(unique.length<q.options.length-1)return q;
 const options=q.options.map((_,i)=>i===correctIndex?correct:unique.shift());
 return {...q,options};
}
export function prepareOrderQuestion(q){
 if(typeof q?.answer!=='string')return q;
 const sentence=q.answer.trim();
 if(!/[\p{Script=Han}]/u.test(sentence)||sentence.length>200)return q;
 const tokens=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('zh-CN',{granularity:'word'}).segment(sentence)].map(s=>s.segment.replace(/[\p{P}\p{Z}\s]/gu,'')).filter(Boolean):[...sentence.replace(/[\p{P}\p{Z}\s]/gu,'')];
 if(tokens.length<3)return q;
 const shuffled=[...tokens];
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 if(shuffled.join('')===tokens.join(''))shuffled.push(shuffled.shift());
 return {...q,text:shuffled.join(' / ')};
}
export function questionKey(text,kind){
 const normalize=s=>cleanQuestionText(s).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,'');
 return kind==='order'?text.split('/').map(normalize).sort().join('|'):normalize(text);
}
// Keep good questions even when another item in the same AI response is unusable.
export function selectNewQuestions(value,kind,avoid=[],limit=5){
 if(!Array.isArray(value)||value.length>20)throw Error('AI返回题目格式无效，请重试。');
 const seen=new Set(avoid.map(text=>questionKey(text,kind))),questions=[];
 for(const raw of value){
  let q;try{let normalized=normalizeQuestion(raw);if(kind==='order'){try{validateQuestions([normalized],kind,1);}catch{normalized=prepareOrderQuestion(normalized);}}if(kind==='pinyin')normalized=preparePinyinQuestion(normalized);[q]=validateQuestions([normalized],kind,1);}catch{continue;}
  const key=questionKey(q.text,kind);if(seen.has(key))continue;
  seen.add(key);questions.push(q);if(questions.length===limit)break;
 }
 return questions;
}
export function translationWordCount(text){
 return (text.match(/\p{L}[\p{L}\p{M}\p{N}]*(?:['’-][\p{L}\p{M}\p{N}]+)*|\p{N}+/gu)||[]).length;
}
export function completedSentence(q){
 if(q.kind==='order')return q.answer;
 if(q.kind==='choice'&&q.options)return q.text.replace(/[_＿]+/u,q.options['ABCD'.indexOf(q.answer)]||'');
 return q.text;
}
export function sentenceOverlap(a,b){
 const normalize=s=>s.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
 a=normalize(a);b=normalize(b);
 if(Math.min(a.length,b.length)<6)return a===b;
 if(a.includes(b)||b.includes(a))return true;
 const grams=s=>new Set(Array.from({length:s.length-2},(_,i)=>s.slice(i,i+3)));
 const left=grams(a),right=grams(b);
 return [...left].filter(g=>right.has(g)).length/Math.min(left.size,right.size)>=.8;
}
export function conflictsWithPaper(q,questions){
 return questions.some(other=>((q.kind==='order'&&other.kind==='choice')||(q.kind==='choice'&&other.kind==='order'))&&sentenceOverlap(completedSentence(q),completedSentence(other)));
}
export function validateQuestions(value,kind,count){
 if(!Object.hasOwn(kinds,kind)||!Array.isArray(value)||value.length!==count)throw Error('AI返回题数不正确，请重新生成。');
 const seen=new Set();
 return value.map(raw=>{
  const q=normalizeQuestion(raw);
  const text=(v,max=600)=>typeof v==='string'&&v.trim()&&v.length<=max;
  if(!text(q?.text)||!text(q.answer)||!text(q.explanation))throw Error('题目或参考答案不完整。');
  const key=questionKey(q.text,kind);if(seen.has(key))throw Error('AI返回重复题目，请重新生成。');seen.add(key);
  const result={kind,text:q.text.trim(),answer:q.answer.trim(),explanation:q.explanation.trim()};
  if(['ai','course-vocabulary','course-reference'].includes(q.source))result.source=q.source;
  if(typeof q.targetId==='string'&&q.targetId.length<=100)result.targetId=q.targetId;
  if(['pinyin','choice'].includes(kind)){
   if(!Array.isArray(q.options)||![3,4].includes(q.options.length)||q.options.some(o=>!text(o,200))||new Set(q.options.map(o=>o.trim())).size!==q.options.length||!('ABCD'.slice(0,q.options.length)).includes(q.answer)||q.answer.length!==1)throw Error('选择题选项或答案无效。');
   result.options=q.options.map(o=>o.trim());
  }
  if(kind==='translation'&&(translationWordCount(q.text)<10||translationWordCount(q.text)>15||/\p{Script=Han}/u.test(q.text)))throw Error('翻译题须为10—15个词的越南语句子。');
  if(kind==='order'){
   const tokens=q.text.split('/').map(t=>t.trim());
   const normalize=s=>s.replace(/[\p{P}\p{Z}\s]/gu,'');
   const chars=s=>[...normalize(s)].sort().join('');
   if(tokens.length<3||tokens.some(t=>!t)||chars(tokens.join(''))!==chars(q.answer))throw Error('排序题词语与参考答案不一致。');
  }
  return result;
 });
}
export function paperLines(paper,answers=false){
 const total=paper.questions.length;
 const lines=[{text:paper.title,bold:true,size:32},{text:'姓名：_______________                    分数：_______________'}, {text:`考试范围：${paper.bank} · ${paper.title}    满分：${total*2}分`}, {text:answers?'教师参考答案（翻译题及排序题允许合理的等义答案）':'每题2分，请在答题处作答。'}];
 let group=0;
 for(const [kind,label]of Object.entries(kinds)){
  const raw=paper.questions.filter(q=>q.kind===kind);if(!raw.length)continue;
  const qs=validateQuestions(raw,kind,raw.length);
  lines.push({text:`${['一','二','三','四'][group++]}、${label}（共${qs.length}题，每题2分，共${qs.length*2}分）`,bold:true});
  if(!answers)lines.push({text:kind==='order'?'将词语排列成通顺的句子，不得增减词语。':kind==='translation'?'请将下列越南语翻译成中文。':'请选择正确答案，将字母填入括号内。'});
  qs.forEach((q,i)=>{
   lines.push({text:`${i+1}. ${q.text}${q.options?'（　　）':''}`});
   if(q.options)lines.push({text:q.options.map((o,j)=>`${'ABCD'[j]}. ${o}`).join('       ')});
   if(answers)lines.push({text:`参考答案：${q.answer}\n解析：${q.explanation}`});
   else if(!q.options)lines.push({text:'________________________________________________________________'});
  });
 }
 return lines;
}
