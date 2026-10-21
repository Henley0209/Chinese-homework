import assert from 'node:assert/strict';
import {createVisitCounter,createCounterTransport,COUNTER_KEY,USER_PREFIX,normalizeName,encodeName,decodeName,nameKey} from '../visit-counter.mjs';
const server=new Map(),calls=[];
const request=async(action,key,value)=>{
 calls.push({action,key,value});
 if(action==='hit'){const next=BigInt(server.get(key)||0)+1n;server.set(key,String(next));return String(next);}
 if(action==='set'){server.set(key,String(value));return String(value);}
 return server.get(key)||null;
};
const make=options=>createVisitCounter({request,...options});
server.set(COUNTER_KEY,'177');const computer=make();
await Promise.all([computer.open('Nguyễn An'),computer.open('Nguyễn An')]);assert.equal(server.get(COUNTER_KEY),'178');
const id=await nameKey('Nguyễn An'),userKey=USER_PREFIX+'_count_'+id;
assert.equal(server.get(userKey),'1');
await computer.load();await computer.refreshUsers();await computer.recordName('另一个名字');assert.equal(server.get(COUNTER_KEY),'178');assert.equal(server.get(userKey),'1');
const phone=make();await phone.open('Nguyễn An');assert.equal(server.get(userKey),'2');assert.equal(server.get(COUNTER_KEY),'179');
const refresh=make();await refresh.open('Nguyễn An');assert.equal(server.get(userKey),'3');assert.equal(server.get(COUNTER_KEY),'180');
assert.equal(server.get(USER_PREFIX+'_users'),'1');
const anonymous=make();await anonymous.open();assert.equal(server.get(COUNTER_KEY),'181');
await Promise.all([anonymous.recordName('学生乙'),anonymous.recordName('学生乙')]);assert.equal(server.get(USER_PREFIX+'_count_'+await nameKey('学生乙')),'1');assert.equal(server.get(COUNTER_KEY),'181');
assert.equal(server.get(USER_PREFIX+'_users'),'2');
let visible;const otherBrowser=make({renderUsers:s=>visible=s});await otherBrowser.refreshUsers();assert.deepEqual(visible.rows,[{name:'Nguyễn An',count:3},{name:'学生乙',count:1}]);
// Concurrent first visits may share a registry slot or publish duplicate labels;
// the public list must merge by name, and both real page opens still count.
await Promise.all([make().open('陈同学'),make().open('陈同学')]);
await otherBrowser.refreshUsers();assert.equal(visible.rows.filter(r=>r.name==='陈同学').length,1);assert.equal(visible.rows.find(r=>r.name==='陈同学').count,2);
assert.equal(server.get(COUNTER_KEY),'183');
for(const name of ['Nguyễn Thị Hồng','越南学生甲','👩🏻‍🏫 An','<img src=x onerror=alert(1)>'])assert.equal(decodeName(encodeName(name)),name);
assert.equal(normalizeName('  An   Nguyễn  '),'An Nguyễn');assert.equal(await nameKey('ＡＮ'),await nameKey('an'));
let failed=0;const offline=createVisitCounter({request:async()=>{failed++;throw Error('offline');}});await offline.open();await offline.open();assert.equal(failed,1);
// An older read must not overwrite a newer total.
let finish;const racing=createVisitCounter({request:action=>action==='get'?new Promise(r=>finish=r):Promise.resolve('10')});const pending=racing.load();await racing.open();finish('9');await pending;assert.equal(racing.current(),10);
// Paging must reach every registered name, rather than just local or recent users.
const paged=make({pageSize:1,renderUsers:s=>visible=s});for(let i=0;i<6;i++)await paged.refreshUsers();assert.equal(visible.rows.length,3);
const transportCalls=[];const rawName=encodeName('Nguyễn Thị Hồng');
const http=createCounterTransport({spacing:0,fetchFn:async(url,options)=>{transportCalls.push({url,options});return {ok:true,status:200,text:async()=>'{"value":'+rawName+'}'};}});
assert.equal(await http('get','test-index'),rawName);await http('set','test-index',rawName);await http('hit','test-counter');
assert.ok(transportCalls.every(c=>c.options.credentials==='omit'&&c.options.referrerPolicy==='no-referrer'&&!c.options.body));assert.equal(transportCalls[2].options.method,'POST');
assert.equal(new URL(transportCalls[1].url).searchParams.get('value'),rawName);
const missing=createCounterTransport({spacing:0,fetchFn:async()=>({ok:false,status:404,text:async()=>'{"error":"Key not found"}'})});assert.equal(await missing('get','missing'),null);
console.log('通过：每页打开+1、刷新+1、同页去重、练习不加数、姓名跨设备合并、首次填名归属、共享滚动列表、并发注册去重、Unicode姓名精度、分页全量与断网容错。');
