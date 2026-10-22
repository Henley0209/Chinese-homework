import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate,grade} from '../grading.mjs';
import {validateCatalog,loadCatalog,listExercises,getExercise} from '../exercise-store.mjs';
import {studentExercises} from '../exercise-options.mjs';
import {progressKey,saveProgress,loadProgress} from '../exercise-progress.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('exercise-catalog.json'),manifest=read('electronics-35/manifest.json');
assert.equal(manifest.length,35);assert.equal(validateCatalog(catalog).exercises.length,219);
assert.equal(catalog.exercises.filter(e=>!/^electronics-topic-\d{2}$/.test(e.id)).length,184);
const expected=['第一天到工厂报到','认识部门和工作岗位','认识车间和厂区设施','工作时间与考勤','请假、调班与加班','穿戴工作服与防护用品','无尘车间与静电防护','听懂车间常用指令','不明白时怎样确认','认识电子产品和零部件','数字、单位与规格','核对料号、型号与版本','领取物料与退回余料','缺料、错料与来料异常','认识工单与生产任务','看懂作业指导书','工具、设备与工位准备','生产线装配沟通','螺丝锁付与连接检查','焊接与焊点检查用语','设备状态与异常报告','换线、换型与首件确认','首件、巡检与抽检','外观检查与缺陷描述','功能测试与结果反馈','合格品与不良品管理','返工、返修与复检','包装、标签与装箱','仓储、盘点与出货','产量、进度与工作汇报','交接班与生产记录','现场整理与5S沟通','安全提醒与紧急求助','与班组长、工程师沟通','团队合作与改善建议'];
assert.deepEqual(manifest.map(m=>m.title),expected);
const sentences=new Set(),letters=s=>[...s.replace(/[。.？?]/gu,'')].sort().join('');let count=0;
for(const m of manifest){
 const d=validate(read('electronics-35/'+m.file));assert.equal(d.questions.length,50);count+=d.questions.length;
 assert.equal(m.bank,'factory');assert.equal(m.totalPoints,100);assert.equal(new Set(m.targetWords).size,10);
 assert.deepEqual(d.questions.map(q=>q.id),Array.from({length:50},(_,i)=>i+1));
 const entry=catalog.exercises.find(e=>e.id==='electronics-topic-'+String(m.lesson).padStart(2,'0'));
 assert.equal(entry.bank,'factory');assert.ok(d.title.startsWith('汉语工厂 第'));assert.ok(!d.title.includes('电子工厂'));assert.deepEqual(entry.exercise,d);
 assert.equal(grade(d,{}).score,0);assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,q.answers[0]]))).score,100);
 assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,'错误答案']))).score,0);
 assert.equal(new Set(d.questions.map(q=>q.text)).size,50);
 for(const [i,q] of d.questions.entries()){
  assert.equal(q.points,2);assert.ok(q.pinyin&&q.vietnamese&&q.explanation);assert.ok(!/[\u4e00-\u9fff]/u.test(q.pinyin));
  assert.equal(q.section,i<10?'拼音选择':i<20?'四选一词语填空':i<35?'情境应答':'句子排序');
  if(q.type==='choice'){
   assert.equal(new Set(Object.values(q.options)).size,4);
   for(const key of 'ABCD')assert.equal(grade({questions:[q]},{[q.id]:key}).score,q.answers[0]===key?2:0);
   if(i<10)assert.ok(q.pinyin.includes('____'));
   else for(const key of 'ABCD')assert.ok(q.optionPinyin[key]);
   if(i>=10&&i<20)assert.equal((q.text.match(/____/g)||[]).length,1);
   if(i>=20)assert.equal(q.options[q.answers[0]],m.sortingSentences[i-20]);
  }else{
   assert.ok(!sentences.has(q.answers[0]));sentences.add(q.answers[0]);
   const chunks=q.text.split('\n')[1].split(' / ');assert.ok(chunks.length>=4);assert.notEqual(chunks.join(''),q.answers[0]);
   for(const answer of q.answers){assert.equal(letters(answer),letters(chunks.join('')));assert.equal(grade({questions:[q]},{[q.id]:answer}).score,2);}
  }
 }
}
assert.equal(count,1750);assert.equal(sentences.size,525);
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(catalog)});
await loadCatalog();const visible=studentExercises(listExercises('factory'));assert.equal(visible.length,36);
const lessons=visible.filter(e=>/^electronics-topic-\d{2}$/.test(e.id));assert.equal(lessons.length,35);
assert.deepEqual(lessons.map(e=>e.id),manifest.map(m=>'electronics-topic-'+String(m.lesson).padStart(2,'0')));
assert.equal(listExercises('daily').filter(e=>/^electronics-topic-/.test(e.id)).length,0);
const last=lessons[34],key=progressKey('测试学生','factory',last.id),answers=Object.fromEntries(last.exercise.questions.slice(0,25).map(q=>[q.id,q.answers[0]]));
assert.equal(saveProgress(key,last.exercise,answers,{index:25,offset:0}),true);
const resumed=loadProgress(key,getExercise('factory',last.id));assert.equal(resumed.position.index,25);
for(const q of last.exercise.questions)assert.equal(resumed.answers[q.id],answers[q.id]||'');
console.log('通过：汉语工厂35课1750题、525句排序、每日50题100分、汉语工厂选课与第26题恢复。');
