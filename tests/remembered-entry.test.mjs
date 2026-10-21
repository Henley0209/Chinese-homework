import assert from 'node:assert/strict';
import {readEntry,writeEntry,initRememberedEntry} from '../remembered-entry.mjs';
import {banks} from '../bank-access.mjs';
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
class Node{value='';events={};children=[];addEventListener(k,f){this.events[k]=f;}append(...nodes){this.children.push(...nodes);}before(node){this.inserted=node;}}
function form(){const nodes=Object.fromEntries(['[name=student]','#question-bank','#bank-password','.start-row'].map(k=>[k,new Node()]));nodes['#question-bank'].value='hsk1-2';return {nodes,querySelector:k=>nodes[k],createElement:()=>new Node()};}
globalThis.window={localStorage:storage};
const first=form();initRememberedEntry(first);first.nodes['[name=student]'].value='学生甲';first.nodes['[name=student]'].events.input();first.nodes['#bank-password'].value=banks[0].password;first.nodes['#bank-password'].events.input();
const second=form();initRememberedEntry(second);assert.equal(second.nodes['[name=student]'].value,'学生甲');assert.equal(second.nodes['#bank-password'].value,banks[0].password);
second.nodes['#bank-password'].value='incorrect';second.nodes['#bank-password'].events.input();assert.equal(readEntry(storage).password,banks[0].password);
second.nodes['.start-row'].inserted.children[1].onclick();assert.deepEqual(readEntry(storage),{});assert.equal(second.nodes['#bank-password'].value,'');assert.equal(second.nodes['[name=student]'].value,'');
assert.deepEqual(readEntry({getItem:()=>'{broken'}),{});assert.deepEqual(readEntry({getItem:()=>{throw Error();}}),{});assert.equal(writeEntry({setItem:()=>{throw Error();}},{}),false);
console.log('通过：姓名和密码跨页面恢复、无效密码不覆盖、清除保存、存储损坏和禁用容错。');
