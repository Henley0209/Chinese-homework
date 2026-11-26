import {lessonApi} from './lesson-api.mjs?v=2';
import {attendanceDates,lessonDate,studentLabels,classLabels} from './lesson-data.mjs?v=5';

const $=id=>document.getElementById('teacher-attendance-'+id);
const login=$('login');
const form=$('form');
const controls=form.elements;
const roster=$('roster');
const progress=$('progress');
const status=$('status');
const submit=$('save');
const logout=$('logout');
const rememberedKey='qinglan-teacher-attendance-session-v1';
let token='',rosterRequest=0,submitting=false;
let retry=null;
const tell=message=>{status.textContent=message;};

function dates(){
 return Object.fromEntries(['start','end','date'].map(key=>[key,controls[key].value]));
}

function selected(){
 return [...roster.querySelectorAll('input:checked:not(:disabled)')].map(check=>check.value);
}

function rememberedToken(){
 try{return localStorage.getItem(rememberedKey)??'';}catch{return '';}
}

function rememberToken(value){
 try{
  if(value)localStorage.setItem(rememberedKey,value);
  else localStorage.removeItem(rememberedKey);
 }catch{}
}

function showLogin(){
 token='';
 rosterRequest++;
 roster.replaceChildren();
 submitting=false;
 retry=null;
 submit.disabled=true;
 form.reset();
 for(const control of form.querySelectorAll('input, select, textarea'))control.disabled=false;
 form.hidden=true;
 logout.hidden=true;
 login.hidden=false;
 login.elements.username.focus();
}

logout.addEventListener('click',()=>{
 const currentToken=token;
 rememberToken('');
 showLogin();
 tell('已退出登录。');
 lessonApi('logout',{token:currentToken}).catch(()=>{});
});

async function openSession(sessionToken){
 const result=await lessonApi('teacher-classes',{token:sessionToken});
 token=sessionToken;
 rememberToken(sessionToken);
 $('name').textContent='当前教师：'+result.name;
 const labels=classLabels(result.classes);
 controls.classId.replaceChildren(new Option('请选择班级',''),
  ...result.classes.map((course,i)=>new Option(labels[i],course.id)));
 const [today,yesterday]=attendanceDates();
 controls.date.replaceChildren(new Option('今天 · '+today,today),new Option('昨天 · '+yesterday,yesterday));
 controls.start.value=today;
 controls.end.value=today;
 login.reset();
 login.hidden=true;
 form.hidden=false;
 logout.hidden=false;
 tell('');
 await loadRoster();
 controls.start.focus();
}

function sessionError(error){
 if(error.status===401){
  rememberToken('');
  showLogin();
 }
 tell(error.message);
}

const loginButton=login.querySelector('button');
login.addEventListener('submit',async event=>{
 event.preventDefault();
 if(loginButton.disabled)return;
 loginButton.disabled=true;
 tell('正在登录…');
 try{
  const auth=await lessonApi('teacher-login',{
   username:login.elements.username.value,password:login.elements.password.value
  });
  await openSession(auth.token);
 }catch(error){sessionError(error);}
 finally{loginButton.disabled=false;}
});

async function restoreSession(){
 const saved=rememberedToken();
 if(!saved)return;
 loginButton.disabled=true;
 tell('正在恢复登录…');
 try{await openSession(saved);}
 catch(error){
  if(error.status===401)sessionError(error);
  else tell('暂时无法恢复登录。请刷新后重试，或重新登录。');
 }finally{loginButton.disabled=false;}
}

async function loadRoster(){
 const request=++rosterRequest;
 const classId=controls.classId.value;
 const {start,end,date}=dates();
 progress.hidden=true;
 roster.textContent='';
 submit.disabled=true;
 if(!classId){roster.textContent=controls.classId.options.length>1?'请选择班级。':'当前账号暂无授权班级，请联系管理员。';return;}
 if(![start,end,date].every(lessonDate)||date<start||date>end){
  roster.textContent='请先填写有效的日期范围和实际签到日期。';
  return;
 }
 roster.textContent='正在读取班级名单…';
 try{
  const {students,lesson,remaining}=await lessonApi('teacher-roster',{token,classId,date});
  if(request!==rosterRequest)return;
  if(Number.isInteger(lesson)){
   const day=date===controls.date.options[0].value?'今天':'昨天';
   progress.textContent=day+'是第 '+lesson+' 课时，'+(Number.isInteger(remaining)?'本班级还剩 '+remaining+' 课时':'本班级尚未设置总课时');
   progress.hidden=false;
  }
  if(!students.length){roster.textContent='该班级暂无学员，请联系管理员。';return;}
  const labels=studentLabels(students);
  roster.replaceChildren(...students.map((student,i)=>{
   const label=document.createElement('label');
   const check=document.createElement('input');
   check.type='checkbox';
   check.value=student.id;
   check.disabled=Boolean(student.recorded);
   label.append(check,document.createTextNode(labels[i]+(student.recorded?'（已有签到）':'')));
   return label;
  }));
 }catch(error){
  if(request!==rosterRequest)return;
  if(error.status===401)sessionError(error);
  else roster.textContent=error.message;
 }
}

for(const key of ['start','end','date','classId']){
 controls[key].addEventListener('change',()=>{
  if(key==='start'&&controls.start.value>controls.end.value)controls.end.value=controls.start.value;
  if(key==='date'){
   const {start,end,date}=dates();
   if(!start||date<start)controls.start.value=date;
   if(!end||date>end)controls.end.value=date;
  }
  tell('');
  loadRoster();
 });
}
roster.addEventListener('change',()=>{submit.disabled=submitting||!selected().length;});
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const studentIds=selected();
 if(submitting||!studentIds.length)return;
 const values={...dates(),classId:controls.classId.value,studentIds,
  topic:controls.topic.value.trim(),content:controls.content.value.trim()};
 if(!values.topic||!values.content){tell('请填写上课主题和学习内容。');return;}
 const signature=JSON.stringify(values);
 if(retry?.signature!==signature)retry={signature,id:crypto.randomUUID()};
 const currentToken=token;
 submitting=true;
 submit.disabled=true;
 const fieldsets=[...form.querySelectorAll('input, select, textarea')].filter(field=>!field.disabled);
 for(const field of fieldsets)field.disabled=true;
 tell('正在保存签到…');
 try{
  const result=await lessonApi('teacher-submit',{...values,token:currentToken,submissionId:retry.id});
  if(token!==currentToken)return;
  retry=null;
  tell('已保存 '+result.count+' 位学员的出勤记录。');
  await loadRoster();
 }catch(error){
  if(token===currentToken)sessionError(error);
 }finally{
  if(token===currentToken){
   for(const field of fieldsets)field.disabled=false;
   submitting=false;
   submit.disabled=!selected().length;
  }
 }
});

restoreSession();
