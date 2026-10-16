import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {banks,resolveBank} from '../bank-access.mjs';
import {validate,grade,normalize} from '../grading.mjs';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const intro=validate(read('questions.json'));
for(const b of banks){
 assert.equal(resolveBank(b.id,b.password).file,b.file);
 assert.equal(resolveBank(b.id,'').id,'intro');
 for(const other of banks)if(other.id!==b.id)assert.throws(()=>resolveBank(b.id,other.password));
 const d=validate(read(b.file));assert.equal(d.questions.length,10);assert.match(d.title,new RegExp(b.label));
 const answers=Object.fromEntries(d.questions.map(q=>[q.id,q.answers[0]]));assert.equal(grade(d,answers).score,100);assert.equal(grade(d,{}).score,0);assert.equal(grade(d,Object.fromEntries(d.questions.map(q=>[q.id,'错误']))).score,0);
}
assert.throws(()=>resolveBank('unknown','NgaZhu1122'));assert.throws(()=>resolveBank('hsk3','ngazhu1133'));
function node(){return {hidden:false,textContent:'',value:'',disabled:false,children:[],handlers:{},fd:{},addEventListener(k,f){this.handlers[k]=f;},append(...n){this.children.push(...n);},replaceChildren(...n){this.children=n;},setAttribute(){},scrollIntoView(){},focus(){},querySelector(){return this.button??(this.button=node());}};}
const nodes=new Map();const $=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
let fail=false,fetches=[];const fetch=async path=>{fetches.push(path);if(fail)return {ok:false};return {ok:true,json:async()=>read(path.replace(/^\.\//,''))};};
const context={validate,grade,normalize,resolveBank,document:{querySelector:$,createElement:node},FormData:class{constructor(f){this.data=f.fd;}get(k){return this.data[k]??null;}},fetch,window:{confirm:()=>true},console};
const script=fs.readFileSync(new URL('app.js',root),'utf8').replace(/^import .*;\n/gm,'');
await vm.runInNewContext('(async()=>{'+script+'})()',context);
const form=$('#identity');const submit=()=>form.handlers.submit({preventDefault(){},target:form});
form.fd={student:'An',className:'A1',questionBank:'hsk5',bankPassword:''};await submit();assert.equal($('#bank-badge').textContent,'入门练习');assert.equal($('#count').textContent,15);
for(const b of banks){
 form.fd={student:'An',className:'A1',questionBank:b.id,bankPassword:b.password};await submit();assert.equal($('#bank-badge').textContent,b.label);assert.equal($('#count').textContent,10);assert.match($('#title').textContent,/演示练习/);assert.equal($('#bank-password').value,'');assert.equal($('#exercise').hidden,false);
}
form.fd={student:'An',className:'A1',questionBank:'hsk3',bankPassword:'NgaZhu1122'};const before=fetches.length;await submit();assert.equal(fetches.length,before);assert.match($('#bank-error').textContent,/不匹配/);
form.fd={student:' ',className:'A1',questionBank:'hsk3',bankPassword:'NgaZhu1133'};await submit();assert.match($('#bank-error').textContent,/姓名和班级/);
form.fd={student:'An',className:'A1',questionBank:'hsk3',bankPassword:'NgaZhu1133'};fail=true;await submit();assert.match($('#bank-error').textContent,/无法开始答题/);assert.equal($('#start').disabled,false);fail=false;
const count=fetches.length;await Promise.all([submit(),submit()]);assert.equal(fetches.length,count+1);
console.log('通过：六组密码匹配、30组题库错配、空密码入门、大小写错误、全部题库100/0分、界面切换、姓名校验、加载失败恢复、重复点击拦截。');
