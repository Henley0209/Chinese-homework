import {lessonApi} from './lesson-api.mjs?v=1';
import {lessonDate,lessonToday,studentLabels} from './lesson-data.mjs?v=2';

const $=id=>document.getElementById('teacher-attendance-'+id);
const login=$('login');
const form=$('form');
const controls=form.elements;
const roster=$('roster');
const status=$('status');
const submit=$('save');
const logout=$('logout');
let token='',rosterRequest=0,submitting=false;
let retry=null;
const tell=message=>{status.textContent=message;};

function dates(){
 return Object.fromEntries(['start','end','date'].map(key=>[key,controls[key].value]));
}

function selected(){
 return [...roster.querySelectorAll('input:checked:not(:disabled)')].map(check=>check.value);
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
 showLogin();
 tell('已退出登录。');
 lessonApi('logout',{token:currentToken}).catch(()=>{});
});

login.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=login.querySelector('button');
 button.disabled=true;
 tell('正在登录…');
 try{
  const auth=await lessonApi('teacher-login',{
   username:login.elements.username.value,password:login.elements.password.value
  });
  const result=await lessonApi('teacher-classes',{token:auth.token});
  token=auth.token;
  $('name').textContent='当前教师：'+result.name;
  controls.classId.replaceChildren(new Option('请选择班级',''),
   ...result.classes.map(course=>new Option(course.code+' · '+course.name,course.id)));
  for(const key of ['start','end','date'])controls[key].value=lessonToday();
  login.reset();
  login.hidden=true;
  form.hidden=false;
  logout.hidden=false;
  tell('');
  await loadRoster();
  controls.start.focus();
 }catch(error){tell(error.message);}
 finally{button.disabled=false;}
});

async function loadRoster(){
 const request=++rosterRequest;
 const classId=controls.classId.value;
 const {start,end,date}=dates();
 controls.date.min=start;
 controls.date.max=end;
 roster.textContent='';
 submit.disabled=true;
 if(!classId){roster.textContent=controls.classId.options.length>1?'请选择班级。':'当前账号暂无授权班级，请联系管理员。';return;}
 if(![start,end,date].every(lessonDate)||date<start||date>end){
  roster.textContent='请先填写有效的日期范围和实际签到日期。';
  return;
 }
 roster.textContent='正在读取班级名单…';
 try{
  const {students}=await lessonApi('teacher-roster',{token,classId,date});
  if(request!==rosterRequest)return;
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
  roster.textContent=error.message;
 }
}

for(const key of ['start','end','date','classId']){
 controls[key].addEventListener('change',()=>{
  if(key==='start'&&controls.start.value>controls.end.value)controls.end.value=controls.start.value;
  if(key==='start'||key==='end'){
   const {start,end,date}=dates();
   if(date<start||date>end)controls.date.value=start<=end?start:'';
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
  if(token===currentToken)tell(error.message);
 }finally{
  if(token===currentToken){
   for(const field of fieldsets)field.disabled=false;
   submitting=false;
   submit.disabled=!selected().length;
  }
 }
});
