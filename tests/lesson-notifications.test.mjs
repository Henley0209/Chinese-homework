import assert from 'node:assert/strict';
import test from 'node:test';
import {processAttendanceNotice,queueAttendanceNotice} from '../backend/conversation/lesson-notifications.mjs';

test('Telegram delivery is opt-in and retries throttled notifications',async t=>{
 const messages=new Map();
 let alarm=null;
 const storage={
  put:async(key,value)=>messages.set(key,value),delete:async key=>messages.delete(key),
  getAlarm:async()=>alarm,setAlarm:async when=>{alarm=when;},
  list:async({prefix,limit})=>new Map([...messages].filter(([key])=>key.startsWith(prefix)).sort().slice(0,limit)),
  transaction:async work=>work(storage)
 };
 const summary={teacher:'李老师',course:'K32',date:'2026-11-27',minutes:90,count:8};
 await queueAttendanceNotice(storage,{},'test',summary);
 assert.equal(messages.size,0);
 const env={TELEGRAM_BOT_TOKEN:'123:fixture',TELEGRAM_CHAT_ID:'-1234'};
 let time=2000;
 t.mock.method(Date,'now',()=>time);
 await queueAttendanceNotice(storage,env,'test',summary);
 assert.equal(alarm,3000);
 time=alarm;
 let attempts=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  attempts++;
  assert.equal(url,'https://api.telegram.org/bot123:fixture/sendMessage');
  const payload=JSON.parse(options.body);
  assert.equal(payload.chat_id,'-1234');
  assert.match(payload.text,/K32[\s\S]*李老师[\s\S]*2026\/11\/27[\s\S]*1.5 小时｜出勤：8 人/);
  return attempts===1?Response.json({ok:false,error_code:429,parameters:{retry_after:40}},{status:429}):
   Response.json({ok:true});
 });
 await processAttendanceNotice(storage,env);
 assert.equal(messages.size,1);
 assert.equal(alarm,43000);
 time=alarm;
 await processAttendanceNotice(storage,env);
 assert.equal(messages.size,0);
 assert.equal(attempts,2);
});
