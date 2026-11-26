import {isTeacherPassword} from '../../teacher-auth.mjs';
import {attendanceDates,lessonDate} from '../../lesson-data.mjs';
import {payBands,readPayRate} from '../../lesson-payroll.mjs';

const groups=['classes','students','attendance'];
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
const hash=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const id=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const text=(value,max)=>typeof value==='string'&&value.length<=max;
const filled=(value,max)=>text(value,max)&&Boolean(value.trim());
const lessonDuration=value=>value===60||value===90;
const integer=(value,max)=>Number.isInteger(value)&&value>0&&value<=max;
const reply=(error,status=400)=>Response.json({error},{status});
const same=(a,b)=>a.length===b.length&&Array.from(a).reduce((diff,c,i)=>diff|(c.charCodeAt(0)^b.charCodeAt(i)),0)===0;

async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256));
}

export async function handleLessonRegister(request,env,json,readBytes){
 if(!env.LESSON_REGISTER)return json({error:'课时共享服务尚未启用。'},503);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'需要 JSON 请求。'},415);
 let body;
 try{body=JSON.parse(new TextDecoder().decode(await readBytes(request,1500000)));}
 catch{return json({error:'请求格式无效或内容过大。'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'请求格式无效。'},400);
 try{
  const store=env.LESSON_REGISTER.get(env.LESSON_REGISTER.idFromName('training-center'));
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip)return json({error:'无法确认登录来源。'},403);
  const response=await store.fetch('https://lesson-register/api',{
   method:'POST',body:JSON.stringify({body,client:await hash(ip)})
  });
  return json(await response.json(),response.status);
 }catch{return json({error:'课时共享服务暂时不可用，请稍后重试。'},503);}
}

async function rows(storage,group){
 return [...(await storage.list({prefix:group+':'})).values()];
}

async function snapshot(storage){
 const data=Object.fromEntries(await Promise.all(groups.map(async group=>[group,await rows(storage,group)])));
 data.classes=data.classes.map(courseRecord).sort((a,b)=>a.code.localeCompare(b.code,'zh',{numeric:true}));
 data.students=data.students.map(studentRecord).sort(compareStudents);
 data.attendance.sort((a,b)=>b.date.localeCompare(a.date)||b.lesson-a.lesson);
 return {data,revision:await storage.get('revision')??0};
}

function validRecord(group,item){
 if(!id(item?.id))return false;
 if(group==='classes')return ['code','name','teacher','days','time','room'].every(key=>text(item[key],120))&&
  ['start','end'].every(key=>item[key]===''||lessonDate(item[key]))&&(!item.start||!item.end||item.start<=item.end)&&
  (item.hours===null||integer(item.hours,10000))&&text(item.notes,1000);
 if(group==='students')return text(item.name,120)&&text(item.phone,120)&&
  (item.classId===''||id(item.classId))&&(item.enrolled===''||lessonDate(item.enrolled));
 return id(item.classId)&&id(item.studentId)&&lessonDate(item.date)&&integer(item.lesson,10000)&&
  ['出勤','补课','缺勤','请假'].includes(item.status)&&text(item.teacher,120)&&text(item.topic,120)&&text(item.content,1000)&&(item.durationMinutes==null||lessonDuration(item.durationMinutes));
}

const columns={
 classes:['id','code','name','teacher','days','time','start','end','hours','room','notes'],
 students:['id','name','phone','classId','enrolled'],
 attendance:['id','date','studentId','classId','lesson','teacher','topic','content','status','durationMinutes','teacherUsername']
};
const select=(item,keys)=>Object.fromEntries(keys.map(key=>[key,item[key]]));
function courseRecord(item){
 const course=select(item??{},columns.classes);
 for(const key of columns.classes.slice(1))course[key]??=key==='hours'?null:'';
 return course;
}
function studentRecord(item){
 return {id:item?.id,name:item?.name??'',phone:item?.phone??'',classId:item?.classId??'',enrolled:item?.enrolled??''};
}
function compareStudents(a,b){
 return (a.name??'').localeCompare(b.name??'','zh',{numeric:true})||a.id.localeCompare(b.id);
}
const attendanceKey=item=>[item.studentId,item.classId,item.date,item.lesson].join(':');

function validData(data){
 const courses=new Set(data.classes.map(item=>item.id));
 const students=new Set(data.students.map(item=>item.id));
 for(const group of groups){
  const ids=new Set();
  const keys=new Set();
  for(const item of data[group]){
   if(!validRecord(group,item))return false;
   if(ids.has(item.id))return false;
   ids.add(item.id);
   if(group==='attendance'||(group==='classes'&&item.code)){
    const key=group==='attendance'?attendanceKey(item):item.code.toLowerCase();
    if(keys.has(key))return false;
    keys.add(key);
   }
  }
 }
 return data.students.every(item=>!item.classId||courses.has(item.classId))&&
  data.attendance.every(item=>courses.has(item.classId)&&students.has(item.studentId));
}

function classLesson(records,date){
 let latest=0,scheduled=0;
 for(const record of records){
  latest=Math.max(latest,record.lesson);
  if(record.date===date)scheduled=Math.max(scheduled,record.lesson);
 }
 return scheduled||latest+1;
}

export class LessonRegister {
 constructor(state){this.storage=state.storage;}

 async rateLimit(client){
  // A rolling window per IP covers both teacher and administrator login attempts.
  return this.storage.transaction(async storage=>{
   const key='attempt:'+client;
   const now=Date.now();
   const old=await storage.get(key);
   const attempt=old?.until>now?old:{count:0,until:now+300000};
   if(attempt.count>=12)return false;
   await storage.put(key,{...attempt,count:attempt.count+1});
   return true;
  });
 }

 async fetch(request){
  const {body,client}=await request.json();
  const {action}=body;
  if(action==='admin-login'||action==='teacher-login'){
   if(!await this.rateLimit(client))return reply('尝试次数过多，请五分钟后重试。',429);
   if(!filled(body.password,128))return reply('用户名或密码不正确。',401);
   if(action==='admin-login'){
    if(!await isTeacherPassword(body.password))return reply('教师工具密码不正确。',401);
    return this.session('admin');
   }
   const username=String(body.username??'').trim().toLowerCase();
   const account=/^[a-z0-9._-]{3,40}$/.test(username)?await this.storage.get('account:'+username):null;
   const digest=await passwordHash(body.password,account?.salt??'unregistered-account');
   if(!account||account.disabled||!same(digest,account.digest))return reply('用户名或密码不正确。',401);
   return this.session(username,account.salt);
  }
  if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return reply('请先登录。',401);
  const sessionKey='session:'+await hash(body.token);
  const auth=await this.storage.get(sessionKey);
  if(!auth||auth.expires<=Date.now()){
   if(auth)await this.storage.delete(sessionKey);
   return reply('登录已过期，请重新登录。',401);
  }
  if(action==='logout'){
   await this.storage.delete(sessionKey);
   return Response.json({});
  }
  if(auth.user==='admin')return this.admin(body);
  return this.teacher(body,auth);
 }

 async session(user,salt){
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const lifetime=user==='admin'?8*3600000:30*86400000;
  await this.storage.put('session:'+await hash(token),{user,salt:salt??null,expires:Date.now()+lifetime});
  return Response.json({token});
 }

 async admin(body){
  if(body.action==='admin-read'){
   const state=await this.storage.transaction(snapshot);
   const accounts=[...(await this.storage.list({prefix:'account:'})).values()].map(item=>select(item,['username','name','classIds','disabled',...payBands.map(band=>band.field)]));
   return Response.json({...state,accounts});
  }
  if(body.action==='admin-account'){
   const username=String(body.username??'').trim().toLowerCase();
   const password=body.password??'';
   const changingPassword=password!=='';
   if(!/^[a-z0-9._-]{3,40}$/.test(username)||username==='admin'||!filled(body.name,80)||
    (!body.replace&&!changingPassword)||(changingPassword&&(!filled(password,128)||password.length<10))||!Array.isArray(body.classIds)||
    body.classIds.length>100||!body.classIds.length||!body.classIds.every(id)){
    return reply('请填写有效用户名、姓名、至少 10 位密码并选择班级。');
   }
   const rates={};
   try{
    for(const {field} of payBands){
     if(Object.hasOwn(body,field))rates[field]=readPayRate(body[field]);
    }
   }catch(error){return reply(error.message);}
   const newSalt=changingPassword?crypto.randomUUID():null;
   const newDigest=newSalt?await passwordHash(password,newSalt):null;
   return this.storage.transaction(async storage=>{
    for(const classId of body.classIds){
     if(!await storage.get('classes:'+classId))return reply('所选班级已不存在。');
    }
    const existing=await storage.get('account:'+username);
    if(Boolean(existing)!==Boolean(body.replace))return reply(existing?'该用户名已存在，请编辑原账号。':'账号已不存在，请刷新后重试。',409);
    await storage.put('account:'+username,{username,name:body.name.trim(),classIds:[...new Set(body.classIds)],
     salt:newSalt??existing.salt,digest:newDigest??existing.digest,disabled:existing?.disabled??false,
     ...Object.fromEntries(payBands.map(({field})=>[field,Object.hasOwn(rates,field)?rates[field]:existing?.[field]??null]))});
    return Response.json({});
   });
  }
  if(body.action==='admin-disable'){
   if(!/^[a-z0-9._-]{3,40}$/.test(body.username??''))return reply('用户名无效。');
   return this.storage.transaction(async storage=>{
    const key='account:'+body.username;
    const account=await storage.get(key);
    if(!account)return reply('账号已不存在。',404);
    await storage.put(key,{...account,disabled:true});
    return Response.json({});
   });
  }
  if(!['admin-save','admin-migrate'].includes(body.action))return reply('操作无效。',404);
  const migration=body.action==='admin-migrate';
  if(migration?!groups.every(group=>Array.isArray(body.data?.[group])):
   !groups.includes(body.group)||!Array.isArray(body.records)||!body.records.length||body.records.length>500){
   return reply('记录格式无效。');
  }
  return this.storage.transaction(async storage=>{
   const current=await snapshot(storage);
   if(current.revision!==body.revision)return reply('其他设备刚更新了数据，请刷新共享数据后重试。',409);
   const incoming=migration?groups.map(group=>{
    const ids=new Set(current.data[group].map(item=>item.id));
    return [group,body.data[group].filter(item=>!ids.has(item?.id))];
   }):[[body.group,body.records]];
   const changes=incoming.map(([group,records])=>{
    if(group==='students')return [group,records.map(studentRecord)];
    if(group==='classes')return [group,records.map(courseRecord)];
    const oldRecords=new Map(current.data.attendance.map(record=>[record.id,record]));
    return [group,records.map(item=>{
     if(!item)return item;
     const old=oldRecords.get(item.id);
     return {...item,durationMinutes:Object.hasOwn(item,'durationMinutes')?item.durationMinutes:old?.durationMinutes??null,
      teacherUsername:old?.teacher===item.teacher?old?.teacherUsername:undefined};
    })];
   });
   if(changes.every(([,records])=>!records.length))return Response.json({revision:current.revision});
   for(const [group,records] of changes){
    if(records.some(item=>!validRecord(group,item))||new Set(records.map(item=>item.id)).size!==records.length){
     return reply('记录格式无效。');
    }
    const merged=new Map(current.data[group].map(item=>[item.id,item]));
    for(const item of records)merged.set(item.id,item);
    current.data[group]=[...merged.values()];
   }
   if(!validData(current.data))return reply('记录、班级编号或签到重复，或引用了无效班级或学员。');
   for(const [group,records] of changes){
    for(const item of records)await storage.put(group+':'+item.id,select(item,columns[group]));
   }
   const revision=current.revision+1;
   await storage.put('revision',revision);
   return Response.json({revision});
  });
 }

 async teacher(body,auth){
  return this.storage.transaction(async storage=>{
   const account=await storage.get('account:'+auth.user);
   if(!account||account.disabled||auth.salt!==account.salt)return reply('账号已停用或更新，请重新登录。',401);
   const classes=[];
   for(const classId of account.classIds){
    const course=await storage.get('classes:'+classId);
    if(course)classes.push(select(course,['id','code','name']));
   }
   const dates=attendanceDates();
   if(body.action==='teacher-classes')return Response.json({name:account.name,classes,dates});
   if(!classes.some(course=>course.id===body.classId))return reply('该班级未授权给当前教师。',403);
   const classRecords=async()=> (await rows(storage,'attendance')).filter(item=>item.classId===body.classId);
   const students=(await rows(storage,'students')).filter(student=>student.classId===body.classId)
    .sort(compareStudents);
   if(body.action==='teacher-roster'){
    if(!dates.includes(body.date))return reply('实际签到日期只可选择今天或昨天。');
    const records=await classRecords();
    const course=await storage.get('classes:'+body.classId);
    const lesson=classLesson(records,body.date);
    const recorded=new Set(records.filter(item=>item.date===body.date).map(item=>item.studentId));
    return Response.json({lesson,remaining:course.hours?Math.max(0,course.hours-lesson):null,
     students:students.map(item=>({...select(item,['id','name']),recorded:recorded.has(item.id)}))});
   }
   if(body.action!=='teacher-submit')return reply('操作无效。',404);
   const {date,start,end,topic,content,submissionId,durationMinutes}=body;
   if(!lessonDate(date)||!lessonDate(start)||!lessonDate(end)||date<start||date>end||!id(submissionId)||
    (durationMinutes!==undefined&&!lessonDuration(durationMinutes))||!filled(topic,120)||!filled(content,1000)||!Array.isArray(body.studentIds)||!body.studentIds.length||
    body.studentIds.length>500||new Set(body.studentIds).size!==body.studentIds.length){
    return reply('请核对上课日期、点名名单、上课主题和学习内容。');
   }
   const submissionKey='submission:'+auth.user+':'+submissionId;
   const signature=JSON.stringify([body.classId,date,start,end,topic,content,body.studentIds,...(durationMinutes===undefined?[]:[durationMinutes])]);
   const previous=await storage.get(submissionKey);
   if(previous)return previous.signature===signature?Response.json({count:previous.count}):reply('提交内容已更改，请重新点名。',409);
   if(!dates.includes(date))return reply('实际签到日期只可选择今天或昨天。');
   const studentIds=new Set(students.map(item=>item.id));
   if(body.studentIds.some(studentId=>!studentIds.has(studentId)))return reply('班级名单已变化，请重新选择班级。',409);
   const records=await classRecords();
   const present=new Set(records.filter(item=>item.date===date).map(item=>item.studentId));
   if(body.studentIds.some(studentId=>present.has(studentId))){
    return reply('所选学员中有人当天已有签到，请去掉已签到学员，或请管理员更正原记录。',409);
   }
   const lesson=classLesson(records,date);
   if(!integer(lesson,10000))return reply('课次已达到上限，请联系管理员。',409);
   for(const studentId of body.studentIds){
    const record={id:crypto.randomUUID(),date,studentId,classId:body.classId,lesson,teacher:account.name,teacherUsername:account.username,
     topic:topic.trim(),content:content.trim(),status:'出勤',...(durationMinutes===undefined?{}:{durationMinutes})};
    await storage.put('attendance:'+record.id,record);
   }
   await storage.put('revision',(await storage.get('revision')??0)+1);
   await storage.put(submissionKey,{signature,count:body.studentIds.length});
   return Response.json({count:body.studentIds.length});
  });
 }
}
