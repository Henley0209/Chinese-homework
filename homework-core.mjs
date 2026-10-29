export const kinds={pinyin:'拼音选择题',choice:'填空选择题',order:'句子排序题',translation:'翻译题'};
export function validateQuestions(value,kind,count){
 if(!Object.hasOwn(kinds,kind)||!Array.isArray(value)||value.length!==count)throw Error('AI返回题数不正确，请重新生成。');
 const seen=new Set();
 return value.map(q=>{
  const text=(v,max=600)=>typeof v==='string'&&v.trim()&&v.length<=max;
  if(!text(q?.text)||!text(q.answer)||!text(q.explanation))throw Error('题目或参考答案不完整。');
  const key=q.text.replace(/\s/g,'');if(seen.has(key))throw Error('AI返回重复题目，请重新生成。');seen.add(key);
  const result={kind,text:q.text.trim(),answer:q.answer.trim(),explanation:q.explanation.trim()};
  if(['pinyin','choice'].includes(kind)){
   if(!Array.isArray(q.options)||q.options.length!==3||q.options.some(o=>!text(o,200))||new Set(q.options.map(o=>o.trim())).size!==3||!['A','B','C'].includes(q.answer))throw Error('选择题选项或答案无效。');
   result.options=q.options.map(o=>o.trim());
  }
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
  const qs=paper.questions.filter(q=>q.kind===kind);if(!qs.length)continue;
  lines.push({text:`${['一','二','三','四'][group++]}、${label}（共${qs.length}题，每题2分，共${qs.length*2}分）`,bold:true});
  if(!answers)lines.push({text:kind==='order'?'将词语排列成通顺的句子，不得增减词语。':kind==='translation'?'请将下列越南语翻译成中文。':'请选择正确答案，将字母填入括号内。'});
  qs.forEach((q,i)=>{
   lines.push({text:`${i+1}. ${q.text}${q.options?'（　　）':''}`});
   if(q.options)lines.push({text:q.options.map((o,j)=>`${'ABC'[j]}. ${o}`).join('       ')});
   if(answers)lines.push({text:`参考答案：${q.answer}\n解析：${q.explanation}`});
   else if(!q.options)lines.push({text:'________________________________________________________________'});
  });
 }
 return lines;
}
