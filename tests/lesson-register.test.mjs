import assert from 'node:assert/strict';
import test from 'node:test';
import worker,{LessonRegister} from '../backend/conversation/worker.mjs';
import {attendanceDates,parseStudentPaste} from '../lesson-data.mjs';

const classId='00000000-0000-4000-8000-000000000001';
const otherClass='00000000-0000-4000-8000-000000000002';
const lessonDate='2026-11-26';
const course={id:classId,code:'C01',name:'中文一班',teacher:'李老师',days:'',time:'',start:lessonDate,
 end:'2027-01-15',hours:4,room:'',notes:''};
const headings='学员编号\t学生姓名\t联系电话\t班级编号\t所在班级\t报名日期\t已消耗课时';
const input='S01\t张同学\t0900123456\tC01\t中文一班\t2026/11/26\t0';

test('Excel preview accepts the template header and preserves phone text',()=>{
 const data={students:[],classes:[course]};
 const [record]=parseStudentPaste('培训中心 · 学员管理\r\n\r\n'+headings+'\r\n'+input,data);
 assert.deepEqual({...record,id:undefined},{id:undefined,name:'张同学',phone:'0900123456',classId,enrolled:lessonDate});
 const [unassigned]=parseStudentPaste('王同学\t\t\t2026年11月26日',data);
 assert.equal(unassigned.classId,'');
 assert.equal(unassigned.enrolled,lessonDate);
 const [phoneOnly]=parseStudentPaste('联系电话\n0900765432',data);
 assert.deepEqual({...phoneOnly,id:undefined},{id:undefined,name:'',phone:'0900765432',classId:'',enrolled:''});
 const sameNames=parseStudentPaste('张同学\n张同学',data);
 assert.notEqual(sameNames[0].id,sameNames[1].id);
 assert.throws(()=>parseStudentPaste(headings+'\n'+input.replace('C01','UNKNOWN'),data),/无法唯一匹配/);
 assert.throws(()=>parseStudentPaste(headings+'\n'+input.replace('2026/11/26','2026/02/30'),data),/报名日期无效/);
});

test('attendance dates roll over at midnight in Bangkok',()=>{
 assert.deepEqual(attendanceDates(new Date('2026-12-31T16:59:59Z')),['2026-12-31','2027-01-01']);
 assert.deepEqual(attendanceDates(new Date('2026-12-31T17:00:00Z')),['2027-01-01','2027-01-02']);
});

test('teachers can only read authorized rosters and save selected students once',async()=>{
 const [today,tomorrow]=attendanceDates();
 const values=new Map();
 const storage={
  get:async key=>values.get(key),
  put:async(key,value)=>values.set(key,value),
  delete:async key=>values.delete(key),
  list:async({prefix})=>new Map([...values].filter(([key])=>key.startsWith(prefix))),
  transaction:async callback=>callback(storage)
 };
 const durable=new LessonRegister({storage});
 const namespace={idFromName:id=>id,get:()=>({fetch:(url,init)=>durable.fetch(new Request(url,init))})};
 const origin='https://school.example';
 const endpoint='https://worker.example/lesson-register';
 async function call(action,payload={},expected=200,requestOrigin=origin){
  const response=await worker.fetch(new Request(endpoint,{method:'POST',headers:{
   'Content-Type':'application/json',Origin:requestOrigin,'CF-Connecting-IP':'192.0.2.2'
  },body:JSON.stringify({...payload,action})}),{ALLOWED_ORIGIN:origin,LESSON_REGISTER:namespace});
  assert.equal(response.status,expected,JSON.stringify(await response.clone().json()));
  return response.json();
 }
 await call('teacher-classes',{},401);
 await call('teacher-classes',{},403,'https://other.example');
 await call('admin-login',{password:'invalid-fixture'},401);
 const admin='a'.repeat(64);
 const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(admin))).toString('hex');
 values.set('session:'+digest,{user:'admin',expires:Date.now()+60000});
 const students=parseStudentPaste([headings,input,input.replace('S01','S02').replace('张同学','王同学')].join('\n'),{classes:[course],students:[]});
 const data={classes:[course,{...course,id:otherClass,code:'C02'}],
  students:students.map((student,i)=>({...student,code:'old-'+i})),attendance:[]};
 await call('admin-migrate',{token:admin,revision:0,data});
 assert.deepEqual(await call('admin-migrate',{token:admin,revision:1,data}),{revision:1});
 const teacher={username:'teacher01',name:'李老师',classIds:[classId]};
 await call('admin-account',{...teacher,token:admin},400);
 await call('admin-account',{...teacher,token:admin,password:'example-pass-123'});
 await call('teacher-login',{username:'teacher01',password:'wrong-pass'},401);
 const {token}=await call('teacher-login',{username:'TEACHER01',password:'example-pass-123'});
 await call('admin-read',{token},403);
 const profile=await call('teacher-classes',{token});
 assert.deepEqual(profile.classes,[{id:classId,code:'C01',name:'中文一班'}]);
 assert.deepEqual(profile.dates,[today,tomorrow]);
 await call('admin-account',{...teacher,token:admin,name:'新姓名',replace:true,password:''});
 assert.equal((await call('teacher-classes',{token})).name,'新姓名');
 await call('teacher-login',{username:'teacher01',password:'example-pass-123'});
 await call('admin-account',{...teacher,token:admin,replace:true});
 await call('teacher-roster',{token,classId:otherClass,date:today},403);
 await call('teacher-roster',{token,classId,date:'2000-01-01'},400);
 const roster=await call('teacher-roster',{token,classId,date:today});
 assert.deepEqual([roster.lesson,roster.remaining],[1,3]);
 assert.deepEqual(new Map(roster.students.map(student=>[student.id,student])),
  new Map(students.map(({id,name})=>[id,{id,name,recorded:false}])));
 const entry={token,classId,date:today,start:today,end:tomorrow,studentIds:[students[0].id],
  submissionId:crypto.randomUUID(),topic:'自我介绍',content:'姓名、国籍和问候语'};
 await call('teacher-submit',{...entry,date:'2000-01-01',start:'2000-01-01'},400);
 assert.deepEqual(await call('teacher-submit',entry),{count:1});
 assert.deepEqual(await call('teacher-submit',entry),{count:1});
 await call('teacher-submit',{...entry,submissionId:crypto.randomUUID()},409);
 const state=await call('admin-read',{token:admin});
 assert.deepEqual(state.data.attendance.map(({id,...item})=>item),[{
  classId,date:today,studentId:students[0].id,lesson:1,teacher:'李老师',topic:'自我介绍',
  content:'姓名、国籍和问候语',status:'出勤'
 }]);
 const updated=await call('teacher-roster',{token,classId,date:today});
 assert.deepEqual([updated.lesson,updated.remaining],[1,3]);
 const next=await call('teacher-roster',{token,classId,date:tomorrow});
 assert.deepEqual([next.lesson,next.remaining],[2,2]);
 assert.deepEqual(updated.students.filter(student=>student.recorded).map(student=>student.id),[students[0].id]);
 assert.ok(state.data.students.every(student=>!('code' in student)));
 await call('admin-save',{token:admin,revision:1,group:'students',records:[students[0]]},409);
 const blank={id:crypto.randomUUID()};
 await call('admin-save',{token:admin,revision:state.revision,group:'students',
  records:[blank,{id:students[0].id,classId}]});
 const saved=await call('admin-read',{token:admin});
 assert.deepEqual(saved.data.students.find(student=>student.id===blank.id),{...blank,name:'',phone:'',classId:'',enrolled:''});
 assert.equal(saved.data.attendance[0].studentId,students[0].id);
 const unnamed=await call('teacher-roster',{token,classId,date:today});
 assert.deepEqual(unnamed.students.find(student=>student.id===students[0].id),{id:students[0].id,name:'',recorded:true});
 await call('admin-account',{...teacher,token:admin,replace:true,password:'replacement-example'});
 await call('teacher-classes',{token},401);
 await call('teacher-login',{username:'teacher01',password:'example-pass-123'},401);
 const renewed=await call('teacher-login',{username:'teacher01',password:'replacement-example'});
 await call('teacher-submit',{...entry,token:renewed.token,date:tomorrow,submissionId:crypto.randomUUID()});
 await call('admin-disable',{token:admin,username:'teacher01'});
 await call('teacher-classes',{token:renewed.token},401);
});
