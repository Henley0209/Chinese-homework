import assert from 'node:assert/strict';
import test from 'node:test';
import worker,{LessonBackup,LessonRegister} from '../backend/conversation/worker.mjs';

function storage(){
 const values=new Map();
 const store={
  get:async key=>values.get(key),put:async(key,value)=>values.set(key,value),
  delete:async key=>values.delete(key),
  list:async({prefix})=>new Map([...values].filter(([key])=>key.startsWith(prefix))),
  transaction:async callback=>callback(store)
 };
 return store;
}

function binding(object){
 return {idFromName:name=>name,get:()=>({fetch:(url,init)=>object.fetch(new Request(url,init))})};
}

test('scheduled lesson backups replace only older copies and exports omit credentials',async()=>{
 const source=storage();
 const backup=storage();
 const origin='https://school.example';
 const env={ALLOWED_ORIGIN:origin,LESSON_BACKUP:binding(new LessonBackup({storage:backup}))};
 env.LESSON_REGISTER=binding(new LessonRegister({storage:source},env));
 const teacher='teacher01';
 await source.put('account:'+teacher,{username:teacher,name:'李老师',classIds:[],rate60:1000,salt:'salt',digest:'private'});
 await source.put('revision',1);
 const token='a'.repeat(64);
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 await source.put('session:'+hash,{user:'admin',expires:Date.now()+60000});
 const teacherToken='b'.repeat(64);
 const teacherHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(teacherToken))).toString('hex');
 await source.put('session:'+teacherHash,{user:teacher,salt:'salt',expires:Date.now()+60000});
 const call=(action,token,path='/lesson-register')=>worker.fetch(new Request('https://worker.example'+path,{
  method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'CF-Connecting-IP':'192.0.2.2'},
  body:JSON.stringify({action,token})
 }),env);

 assert.equal((await call('admin-backup',token)).status,404);
 assert.equal((await call('admin-backup',null,'/internal/backup')).status,404);
 await worker.scheduled({scheduledTime:1000},env);
 assert.equal((await call('admin-backup')).status,401);
 assert.equal((await call('admin-backup',teacherToken)).status,403);
 assert.equal((await call('/internal/backup',token)).status,404);
 const first=await (await call('admin-backup',token)).json();
 assert.equal(first.revision,1);
 assert.deepEqual(first.accounts,[{username:teacher,name:'李老师',classIds:[],rate60:1000}]);
 assert.equal(first.scheduledTime,1000);
 const stored=JSON.parse(await backup.get('chunk:0'));
 assert.equal(stored.accounts[0].digest,'private');
 assert.equal(stored.session,undefined);

 await source.put('revision',2);
 await worker.scheduled({scheduledTime:2000},env);
 await source.put('revision',3);
 await worker.scheduled({scheduledTime:1500},env);
 const latest=await (await call('admin-backup',token)).json();
 assert.equal(latest.revision,2);
 assert.equal(latest.scheduledTime,2000);
});
