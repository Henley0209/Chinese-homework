import {progressKey,saveProgress,loadProgress,clearProgress} from '../exercise-progress.mjs';
import {studentExercises} from '../exercise-options.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto,randomUUID} from 'node:crypto';
import {validate,grade,normalize} from '../grading.mjs';
import {resolveBank} from '../bank-access.mjs';
import {isTeacherPassword} from '../teacher-auth.mjs';
import * as store from '../exercise-store.mjs';
const root=new URL('../',import.meta.url),published=JSON.parse(fs.readFileSync(new URL('exercise-catalog.json',root),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(published)});
const memory=new Map();let full=false;
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(full)throw Error('空间不足');memory.set(k,v);},removeItem:k=>memory.delete(k)};
await store.loadCatalog();
if(process.env.QINGLAN_TEACHER_PASSWORD)assert.equal(await isTeacherPassword(process.env.QINGLAN_TEACHER_PASSWORD),true);
for(const p of ['','wrong','teacher-test-only','trailing-space '])assert.equal(await isTeacherPassword(p),false);
for(const e of published.exercises){validate(e.exercise);const answers=Object.fromEntries(e.exercise.questions.map(q=>[q.id,q.answers[0]]));assert.equal(grade(e.exercise,answers).score,100);}
assert.throws(()=>store.getExercise('hsk3','hsk1-2-1'));
const hsk3Published=published.exercises.filter(e=>e.bank==='hsk3').length;
const changed=structuredClone(published.exercises.find(e=>e.bank==='hsk3'));changed.id='hsk3-new';changed.exercise.title='新增的HSK3练习';
store.saveExercise(changed);assert.equal(store.listExercises('hsk3').length,hsk3Published+1);assert.equal(store.listExercises('hsk3').find(e=>e.exercise.title===changed.exercise.title).draft,true);assert.equal(store.draftCount(),1);
assert.equal(store.validateCatalog(JSON.parse(JSON.stringify(store.catalog()))).exercises.length,published.exercises.length+1);
assert.throws(()=>store.saveExercise({...changed,id:'invalid',exercise:{title:'坏题库',questions:[]}}));
assert.equal(store.draftCount(),1);
full=true;assert.throws(()=>store.saveExercise({...changed,id:'quota-fail'}));full=false;assert.equal(store.listExercises('hsk3').length,hsk3Published+1);
store.discardDrafts();assert.equal(store.listExercises('hsk3').length,hsk3Published);
function node(tag='div'){return {tag,hidden:false,textContent:'',value:'',disabled:false,open:false,fd:{},children:[],handlers:{},
 addEventListener(k,v){this.handlers[k]=v;},append(...ns){this.children.push(...ns);if(this.tag==='select'&&!this.value&&ns[0])this.value=ns[0].value;},
 replaceChildren(...ns){this.children=[];if(this.tag==='select')this.value='';this.append(...ns);},setAttribute(){},focus(){},scrollIntoView(){},querySelector(){return this.button??(this.button=node('button'));},
 getBoundingClientRect(){return {top:0,bottom:100};},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}};}
const nodes=new Map(),selects=new Set(['#user-role','#question-bank','#exercise-select','#upload-bank','#upload-mode','#upload-target']);
const $=s=>{if(!nodes.has(s))nodes.set(s,node(selects.has(s)?'select':'div'));return nodes.get(s);};
$('#user-role').value='student';$('#question-bank').value='hsk1-2';$('#upload-mode').value='add';$('#teacher-login').hidden=true;
const crypto={subtle:webcrypto.subtle,randomUUID};
const loginEvents=[];
const context={initRememberedEntry:()=>()=>{},initQuizMusic:()=>({start(){},stop(){}}),progressKey,saveProgress,loadProgress,clearProgress,studentExercises,initWriting:()=>{},initPictureWords:()=>{},initConversation(){},initPhonetics:()=>{},showFeedback:()=>{},stopFeedback:()=>{},recordLogin:role=>{loginEvents.push(role);},recordPracticeEntry:mode=>{assert.equal(mode,'quiz');loginEvents.push('student');},...store,isTeacherPassword:value=>Promise.resolve(value==='teacher-test-only'),resolveBank,validate,grade,normalize,crypto,structuredClone,TextEncoder,Uint8Array,URL,Blob,confirm:()=>true,setTimeout,console,
 document:{querySelector:$,createElement:tag=>node(tag)},FormData:class{constructor(f){this.values=f.fd;}get(k){return this.values[k]??null;}}};
async function script(name,append=''){let s=fs.readFileSync(new URL(name,root),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');await vm.runInNewContext('(async()=>{'+s+'\n'+append+'})()',context);}
await script('teacher-tools.mjs','globalThis.teacherActive=teacherActive;');await script('app.js');
assert.equal($('#exercise-select').value,'hsk1-2-topic-01');assert.equal($('#teacher-login').hidden,true);
const form=$('#identity');const submit=()=>form.handlers.submit({preventDefault(){},target:form});
form.fd={student:'An',questionBank:'hsk3',exerciseId:'hsk3-1',bankPassword:''};await submit();assert.match($('#student-label').textContent,/入门练习/);assert.equal($('#progress').max,15);assert.equal(loginEvents.length,0);
for(const [id,pass]of [['hsk1-2','NgaZhu1122'],['hsk3','NgaZhu1133'],['hsk4','NgaZhu1144'],['hsk5','NgaZhu1155'],['daily','NgaZhu1166'],['factory','NgaZhu1177']]){
 $('#question-bank').value=id;$('#question-bank').handlers.change();assert.equal($('#exercise-select').value,studentExercises(store.listExercises(id))[0].id);
 form.fd={student:'An',className:'A1',questionBank:id,exerciseId:id+'-1',bankPassword:pass};await submit();assert.equal($('#progress').max,10);assert.equal($('#bank-error').textContent,'');
}
form.fd={student:'An',className:'A1',questionBank:'hsk3',exerciseId:'hsk1-2-1',bankPassword:'NgaZhu1133'};await submit();assert.match($('#bank-error').textContent,/对应的练习/);assert.equal(loginEvents.length,0);
const file={size:100,text:async()=>JSON.stringify(changed.exercise)},event={target:{files:[file],value:'file'}};
await $('#import').onchange(event);assert.match($('#teacher-status').textContent,/先完成教师验证/);assert.equal(store.draftCount(),0);
$('#user-role').value='teacher';$('#user-role').handlers.change();assert.equal($('#teacher-login').hidden,false);assert.equal($('#student-entry').hidden,true);
$('#teacher-password').value='wrong';$('#teacher-login').handlers.submit({preventDefault(){}});
const tick=()=>new Promise(r=>setTimeout(r,15));await tick();assert.equal($('#tools').open,false);assert.equal(loginEvents.filter(r=>r==='teacher').length,0);
$('#teacher-password').value='teacher-test-only';$('#teacher-password').handlers.input();
for(let i=0;i<80&&!$('#tools').open;i++)await tick();
assert.equal($('#tools').open,true);assert.equal($('#teacher-password').value,'');assert.equal(loginEvents.filter(r=>r==='teacher').length,0);
$('#tools').close();await $('#open-teacher-tools').onclick();assert.equal(loginEvents.filter(r=>r==='teacher').length,0);
$('#upload-bank').value='hsk3';$('#upload-mode').value='add';await $('#import').onchange({target:{files:[file],value:'file'}});
assert.equal(store.listExercises('hsk3').length,hsk3Published+1);assert.equal($('#exercise-select').children.length,studentExercises(store.listExercises($('#question-bank').value)).length);
$('#user-role').value='student';$('#user-role').handlers.change();
$('#question-bank').value='hsk3';$('#question-bank').handlers.change();
const uploaded=store.listExercises('hsk3').find(e=>e.draft);
form.fd={student:'An',className:'A1',questionBank:'hsk3',exerciseId:uploaded.id,bankPassword:'NgaZhu1133'};await submit();
assert.equal($('#bank-error').textContent,'');assert.equal($('#progress').max,10);
assert.equal($('#tools').open,false);assert.equal($('#teacher-login').hidden,true);assert.equal($('#student-entry').hidden,false);
await $('#import').onchange({target:{files:[file],value:'file'}});assert.match($('#teacher-status').textContent,/先完成教师验证/);
$('#user-role').value='teacher';$('#user-role').handlers.change();assert.equal($('#open-teacher-tools').hidden,true);
// A late authentication result must never reopen tools after switching back to student.
$('#teacher-password').value='teacher-test-only';$('#teacher-password').handlers.input();$('#user-role').value='student';$('#user-role').handlers.change();await tick();assert.equal($('#tools').open,false);
console.log('通过：教师密码精确验证、正确后自动弹窗、默认学生、切换退出和异步验证竞态；禁止未验证导入；新增/替换/导出题库及空间不足保护；六类练习匹配、空密码入门、跨库练习拦截和所有题库评分。');
