import {lessonApi} from './lesson-api.mjs?v=1';
import {lessonToday as today,parseStudentPaste,studentLabels,studentName,classLabel,classLabels,lessonDate} from './lesson-data.mjs?v=4';

import {calculatePayroll,formatPay,payBands,readPayRate} from './lesson-payroll.mjs?v=1';

import {monthlyPayroll,payrollGroup} from './lesson-payroll-chart.mjs?v=1';

const storageKey='qinglan-lesson-management-v1';
const durationOptions=[[60,'1 小时'],[90,'1.5 小时']];
const statuses=['出勤','补课','缺勤','请假'];
const tabs={overview:'管理看板',students:'学员管理',classes:'班级课程',attendance:'上课签到',accounts:'授课教师',payroll:'工资计算'};
const fields={
 students:[
  ['name','学生姓名','text',false],['phone','联系电话','tel',false],
  ['classId','所在班级','classes',false],['enrolled','报名日期','date',false]
 ],
 classes:[
  ['code','班级编号','text',false],['name','班级名称','text',false],['teacher','授课教师','text',false],
  ['days','每周上课日','text',false],['time','上课时间','text',false],
  ['start','开课日期','date',false],['end','预计结课日期','date',false],['hours','总课时','number',false],
  ['room','教室','text',false],['notes','备注','textarea',false]
 ],
 attendance:[
  ['date','上课日期','date'],['classId','班级','classes'],['studentId','学员','students'],
  ['lesson','课次','number'],['teacher','授课教师','text',false],
  ['topic','上课主题','text',false],['content','本节课学习内容','textarea',false],
  ['status','出勤状态','status'],['durationMinutes','上课时长','duration',false]
 ]
};
const recordNames={students:'学员',classes:'班级',attendance:'签到'};
const panels=new WeakMap();
const searchLabels={students:'搜索学员',classes:'搜索班级',attendance:'搜索签到记录'};
const searchText=value=>String(value??'').normalize('NFKC').toLowerCase();

function element(tag,text){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 return node;
}

function button(label,action,className='quiet'){
 const node=element('button',label);
 node.type='button';
 node.className=className;
 node.addEventListener('click',action);
 return node;
}

function readData(){
 const empty={students:[],classes:[],attendance:[]};
 const raw=localStorage.getItem(storageKey);
 if(raw===null)return empty;
 const data=JSON.parse(raw);
 if(!data||!Object.keys(empty).every(key=>Array.isArray(data[key])))throw Error('无法读取课时管理记录。');
 return data;
}

function studentProgress(data){
 const counts=new Map();
 for(const record of data.attendance){
  const key=record.studentId+' '+record.classId;
  const count=counts.get(key)??{attended:0,absent:0,leave:0};
  if(record.status==='出勤'||record.status==='补课')count.attended++;
  if(record.status==='缺勤')count.absent++;
  if(record.status==='请假')count.leave++;
  counts.set(key,count);
 }
 const currentDate=today();
 return data.students.map(student=>{
  const course=data.classes.find(item=>item.id===student.classId);
  const {attended,absent,leave}=counts.get(student.id+' '+student.classId)??{attended:0,absent:0,leave:0};
  const total=course?.hours||null;
  const used=attended+absent;
  const remaining=total===null?null:Math.max(0,total-used);
  const progress=total?Math.round(used/total*100)+'%':'—';
  const status=!course?'待分班':remaining===0?'已结课':course.end&&course.end<currentDate?'计划已到期':'学习中';
  return {student,course,total,attended,absent,leave,used,remaining,progress,status};
 });
}

function table(title,headers,rows,emptyText){
 if(!rows.length)return element('p',emptyText);
 const wrap=element('div');
 wrap.className='lesson-table';
 wrap.tabIndex=0;
 wrap.setAttribute('role','region');
 wrap.setAttribute('aria-label',title);
 const grid=element('table');
 const head=grid.createTHead().insertRow();
 for(const label of headers){
  const cell=element('th',label);
  cell.scope='col';
  head.append(cell);
 }
 const body=grid.createTBody();
 for(const row of rows){
  const line=body.insertRow();
  for(const value of row){
   const cell=line.insertCell();
   if(value instanceof Node)cell.append(value);
   else cell.textContent=value===''||value==null?'—':value;
  }
 }
 wrap.append(grid);
 return wrap;
}

export function openLessonManagement(dialog,requireTeacher,getPassword){
 if(!panels.has(dialog))panels.set(dialog,createPanel(dialog,requireTeacher,getPassword));
 panels.get(dialog).open();
}

function createPanel(dialog,requireTeacher,getPassword){
 const searches={};
 const payPeriod={start:'',end:''};
 let view='overview',token='',shared=null,loading=false,busy=false,opening=0;
 const panel=element('section');
 panel.id='lesson-management';
 panel.setAttribute('aria-labelledby','lesson-management-title');
 const header=element('header');
 const title=element('h2','学员课时管理看板');
 title.id='lesson-management-title';
 title.tabIndex=-1;
 const close=button('返回教师工具',()=>{
  reset();
  dialog.classList.remove('lesson-management-open');
  panel.hidden=true;
  content.replaceChildren();
  message.textContent='';
  dialog.querySelector('#open-lesson-management').focus();
 });
 header.append(title,close);
 const nav=element('nav');
 nav.setAttribute('aria-label','课时管理');
 const navigation=Object.entries(tabs).map(([key,label])=>[key,button(label,()=>{
  view=key;
  render();
 })]);
 nav.append(...navigation.map(([,link])=>link));
 const content=element('div');
 const message=element('p');
 message.className='lesson-message';
 message.setAttribute('role','status');
 const sync=element('div');
 sync.className='lesson-toolbar lesson-sync';
 panel.append(header,nav,sync,content,message);
 panel.hidden=true;
 dialog.append(panel);
 dialog.addEventListener('close',()=>{
  if(dialog.open)return;
  reset();
  dialog.classList.remove('lesson-management-open');
  panel.hidden=true;
  content.replaceChildren();
  message.textContent='';
 });

 function render(editor,notice=''){
  message.textContent=notice;
  content.replaceChildren();
  for(const [key,link] of navigation){
   if(key===view)link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  }
  try{
   requireTeacher();
   const local=readData();
   const hasLocal=Object.values(local).some(records=>records.length);
   const hasShared=shared&&Object.values(shared.data).some(records=>records.length);
   const controls=[element('span',loading?'正在读取共享数据…':shared?'已连接共享课时库':'共享课时库未连接')];
   if(!loading)controls.push(button('刷新共享数据',()=>refresh()));
   if(shared&&hasLocal&&!localRecordsTransferred(local,shared.data)){
    controls.push(button('迁移本机记录到共享库',()=>mutate('admin-migrate',
     {revision:shared.revision,data:local},'已迁移本机记录。'),'primary'));
    if(hasShared)controls.push(element('span','此浏览器还有旧记录可迁移。'));
   }
   if(hasLocal&&!hasShared)controls.push(element('span','当前显示本机旧记录。迁移后授课教师可读取名单。'));
   sync.replaceChildren(...controls);
   const data=hasShared?shared.data:hasLocal?local:shared?.data??local;
   if(view==='overview')renderOverview(data);
   else if(view==='accounts')renderAccounts(data,editor);
   else if(view==='payroll')renderPayroll();
   else if(editor==='paste')renderPaste(data);
   else if(editor)renderForm(data,editor);
   else renderRecords(data);
  }catch(error){
   message.textContent=error.message;
  }
 }

 function localRecordsTransferred(local,data){
  return Object.keys(local).every(group=>{
   const ids=new Set(data[group].map(record=>record.id));
   return local[group].every(record=>ids.has(record.id));
  });
 }

 function reset(){
  opening++;
  for(const page of Object.keys(searchLabels))delete searches[page];
  if(token)lessonApi('logout',{token}).catch(()=>{});
  token='';
  shared=null;
  loading=false;
  busy=false;
  sync.replaceChildren();
 }

 async function refresh(notice='',epoch=opening){
  if(loading||busy)return;
  loading=true;
  render(undefined,notice);
  try{
   const activeToken=token||(await lessonApi('admin-login',{password:getPassword()})).token;
   if(epoch!==opening){lessonApi('logout',{token:activeToken}).catch(()=>{});return;}
   const result=await lessonApi('admin-read',{token:activeToken});
   if(epoch!==opening){lessonApi('logout',{token:activeToken}).catch(()=>{});return;}
   token=activeToken;
   shared=result;
  }catch(error){
   if(epoch!==opening)return;
   token='';
   shared=null;
   notice='连接共享课时库失败。'+error.message;
  }
  if(epoch!==opening)return;
  loading=false;
  render(undefined,notice);
 }

 function requireWritable(data){
  if(!shared)throw Error('请先连接共享课时库。');
  if(data!==shared.data)throw Error('请先点击「迁移本机记录到共享库」。');
 }

 async function mutate(action,body,notice){
  if(busy||loading)return false;
  busy=true;
  const epoch=opening;
  try{
   await lessonApi(action,{...body,token});
  }catch(error){
   if(epoch===opening)message.textContent=error.message;
   return false;
  }finally{
   if(epoch===opening)busy=false;
  }
  if(epoch===opening)await refresh(notice,epoch);
  return true;
 }

 function renderPaste(data){
  const form=element('form');
  form.className='lesson-paste';
  const label=element('label','从 Excel 复制后粘贴');
  const field=element('textarea');
  field.rows=8;
  field.required=true;
  field.placeholder='姓名\t联系电话\t班级编号\t报名日期';
  label.append(field);
  const note=element('p','支持带表头的新旧 Excel 学员管理表。无表头时请按姓名、联系电话、班级编号或名称、报名日期的顺序粘贴。各项均可留空，空白行会跳过。');
  const preview=element('div');
  const actions=element('div');
  actions.className='lesson-toolbar';
  const confirm=button('确认导入',async()=>{
   confirm.disabled=true;
   try{
    requireWritable(data);
    const success=await mutate('admin-save',{revision:shared.revision,group:'students',records:entries},'已导入 '+entries.length+' 位学员。');
    if(!success)confirm.disabled=false;
   }catch(error){message.textContent=error.message;confirm.disabled=false;}
  },'primary');
  confirm.hidden=true;
  const check=element('button','预览导入');
  check.type='submit';
  check.className='primary';
  let entries=[];
  field.addEventListener('input',()=>{
   entries=[];
   confirm.hidden=true;
   preview.replaceChildren();
   message.textContent='';
  });
  form.addEventListener('submit',event=>{
   event.preventDefault();
   try{
    entries=parseStudentPaste(field.value,data);
    preview.replaceChildren(element('p','待导入 '+entries.length+' 位学员'),
     table('导入预览',['姓名','联系电话','班级','报名日期'],entries.map(item=>[
      studentName(item),item.phone,item.classId?classLabel(data.classes.find(course=>course.id===item.classId)):'待分班',item.enrolled
     ]),''));
    confirm.hidden=false;
    message.textContent='';
   }catch(error){message.textContent=error.message;}
  });
  actions.append(check,confirm,button('取消',()=>render()));
  form.append(label,actions,preview);
  content.append(element('h3','粘贴 Excel 学员名单'),note,form);
  field.focus();
 }

 function renderAccounts(data,account){
  const url=new URL('teacher-attendance.html',location.href);
  const link=element('a','打开教师点名页');
  link.href=url;
  link.target='_blank';
  link.rel='noopener';
  const copy=button('复制点名链接',async()=>{
   try{await navigator.clipboard.writeText(url.href);message.textContent='已复制点名链接。';}
   catch{message.textContent='请打开点名页，从地址栏复制链接。';}
  });
  const toolbar=element('div');
  toolbar.className='lesson-toolbar';
  toolbar.append(element('h3','授课教师账号'),link,copy);
  content.append(toolbar);
  if(!shared||!shared.data.classes.length){
   content.append(element('p','请先在共享库添加班级或迁移本机名单，再创建授课教师账号。'));
   return;
  }
  if(!account){
   content.append(button('新增教师账号',()=>render({}),'primary'),
    table('授课教师账号',['用户名','教师姓名','授权班级','1 小时费用','1.5 小时费用','操作'],shared.accounts.map(item=>{
     const actions=element('div');
     actions.append(button('编辑或重设密码',()=>render(item)));
     if(item.disabled)actions.append(element('span','已停用'));
     else actions.append(button('停用',()=>{
      if(window.confirm('确定停用「'+item.username+'」？'))mutate('admin-disable',{username:item.username},'账号已停用。');
     }));
     return [item.username,item.name,data.classes.filter(course=>item.classIds.includes(course.id)).map(classLabel).join('、'),
      ...payBands.map(({field})=>formatPay(item[field])),actions];
    }),'暂无授课教师账号。'));
   return;
  }
  const form=element('form');
  form.className='lesson-form';
  for(const [key,label,value] of [
   ['username','用户名（字母、数字、点、下划线或连字符）',account.username],
   ['name','教师姓名',account.name],
   ['password',account.username?'新密码（留空则保留原密码）':'密码（至少 10 位）']
  ]){
   const wrapper=element('label',label);
   const field=element('input');
   field.name=key;
   field.required=key!=='password'||!account.username;
   field.value=value??'';
   field.maxLength=key==='username'?40:key==='name'?80:128;
   if(key==='username'){
    field.pattern='[a-zA-Z0-9._\\-]{3,40}';
    field.readOnly=Boolean(account.username);
   }
   if(key==='password'){field.type='password';field.minLength=10;field.autocomplete='new-password';}
   wrapper.append(field);
   form.append(wrapper);
  }
  for(const {field,label} of payBands){
   const wrapper=element('label',label+'费用');
   const input=element('input');
   input.name=field;
   input.inputMode='decimal';
   input.maxLength=12;
   input.value=account[field]==null?'':String(account[field]/100);
   wrapper.append(input);
   form.append(wrapper);
  }
  const classes=element('fieldset');
  classes.className='lesson-checklist';
  const classActions=element('div');
  classActions.className='lesson-toolbar lesson-roster-actions';
  function selectClasses(checked){
   for(const check of classes.querySelectorAll('input[name="classIds"]'))check.checked=checked;
  }
  classActions.append(button('全选',()=>selectClasses(true)),button('全取消',()=>selectClasses(false)));
  classes.append(element('legend','授权班级'));
  const courseLabels=classLabels(data.classes);
  for(const [i,course] of data.classes.entries()){
   const label=element('label');
   const check=element('input');
   check.type='checkbox';
   check.name='classIds';
   check.value=course.id;
   check.checked=account.classIds?.includes(course.id)??false;
   label.append(check,document.createTextNode(courseLabels[i]));
   classes.append(label);
  }
  const actions=element('div');
  actions.className='lesson-toolbar';
  const save=element('button','保存账号');
  save.type='submit';
  save.className='primary';
  actions.append(save,button('取消',()=>render()));
  form.append(classes,classActions,actions);
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   const values=new FormData(form);
   const classIds=values.getAll('classIds');
   if(!classIds.length){message.textContent='请至少授权一个班级。';return;}
   const rates=Object.fromEntries(payBands.map(({field})=>[field,values.get(field).trim()]));
   try{for(const value of Object.values(rates))readPayRate(value);}
   catch(error){message.textContent=error.message;return;}
   save.disabled=true;
   const success=await mutate('admin-account',{username:values.get('username'),name:values.get('name'),
    password:values.get('password'),classIds,...rates,replace:Boolean(account.username)},'教师账号已保存。');
   if(!success)save.disabled=false;
  });
  content.append(form);
 }

 function renderPayroll(){
  content.append(element('h3','工资计算'));
  if(!shared){
   content.append(element('p','连接共享课时库后可查询工资。'));
   return;
  }
  const date=today();
  const totals=monthlyPayroll(shared.accounts,shared.data.attendance,date);
  const monthly=element('section');
  monthly.className='lesson-payroll-group';
  monthly.append(element('h4','每月总费用'),
   element('p','每月 1 日起显示上月汇总。中国老师工资 × 3900 + 越南老师工资。'),
   drawPayrollChart('每月总费用柱状图',totals,true));
  const incompleteMonths=totals.filter(row=>row.incomplete).map(row=>row.label);
  if(incompleteMonths.length)monthly.append(element('p','以下月份有未计入记录：'+incompleteMonths.join('、')+'。'));
  content.append(monthly);
  const filters=element('div');
  filters.className='lesson-form';
  const results=element('div');
  const inputs={};
  for(const [key,label,value] of [['start','签到开始日期',date.slice(0,7)+'-01'],['end','签到截止日期',date]]){
   const wrapper=element('label',label);
   const input=element('input');
   input.type='date';
   input.name='payroll-'+key;
   input.value=payPeriod[key]||value;
   input.addEventListener('input',update);
   inputs[key]=input;
   wrapper.append(input);
   filters.append(wrapper);
  }
  const summary=element('p');
  summary.setAttribute('role','status');
  content.append(filters,summary,results);

  function update(){
   const start=inputs.start.value;
   const end=inputs.end.value;
   payPeriod.start=start;
   payPeriod.end=end;
   results.replaceChildren();
   if(!lessonDate(start)||!lessonDate(end)||start>end){
    summary.textContent='请选择有效的开始和截止日期。';
    return;
   }
   const {results:teachers,missingDuration,conflictingDuration,unresolved}=
    calculatePayroll(shared.accounts,shared.data.attendance,start,end);
   if(!teachers.length){summary.textContent='暂无授课教师账号。';return;}
   const incomplete=teachers.reduce((sum,row)=>sum+row.missingRates,0);
   const notes=[];
   if(incomplete)notes.push(incomplete+' 节待设置费用');
   if(missingDuration)notes.push(missingDuration+' 节缺少上课时长');
   if(conflictingDuration)notes.push(conflictingDuration+' 节的上课时长不一致');
   if(unresolved)notes.push(unresolved+' 节无法匹配教师账号');
   const groups={china:[],vietnam:[]};
   let unclassified=0;
   for(const row of teachers){
    const group=payrollGroup(row.account);
    if(group)groups[group].push(row);
    else unclassified++;
   }
   summary.textContent=notes.length?'以下为已计入的工资。暂未计入：'+notes.join('、')+'。':'各组按综合工资从高到低排列。';

   results.append(payrollChart('中国老师',groups.china),payrollChart('越南老师',groups.vietnam));
   if(unclassified)results.append(element('p',unclassified+' 位老师的费用资料不足以分组，可在下方查看工资明细。'));
   results.append(table('教师工资明细',['授课教师','1 小时次数','1.5 小时次数','综合工资','待设置费用次数'],
    teachers.map(({account,counts,total,missingRates})=>[
     account.name+' · '+account.username,counts[60],counts[90],formatPay(total),missingRates
    ]),'暂无工资记录。'));
  }

  update();
 }

 function payrollChart(label,teachers){
  const section=element('section');
  section.className='lesson-payroll-group';
  section.append(element('h4',label+'工资'));
  if(!teachers.length){
   section.append(element('p','该组暂无教师。'));
   return section;
  }
  section.append(drawPayrollChart(label+'工资柱状图',teachers.map(({account,total})=>({
   label:account.name+' · '+account.username,total
  }))));
  return section;
 }

 function drawPayrollChart(label,entries,monthly=false){
  const chart=element('div');
  chart.className='lesson-payroll-chart';
  chart.tabIndex=0;
  chart.setAttribute('role','region');
  chart.setAttribute('aria-label',label);
  const max=entries.reduce((largest,entry)=>Math.max(largest,entry.total),0);
  if(monthly){
   const scale=element('div');
   scale.className='lesson-payroll-column lesson-payroll-scale';
   const ticks=element('div');
   ticks.className='lesson-payroll-ticks';
   for(const value of max?[max,Math.round(max/2),0]:[0])ticks.append(element('span',formatPay(value)));
   scale.append(element('strong','总工资'),ticks,element('span','月份'));
   chart.append(scale);
  }
  for(const entry of entries){
   const {total}=entry;
   const column=element('div');
   column.className='lesson-payroll-column';
   const bar=element('div');
   bar.className='lesson-payroll-bar';
   bar.style.height=(max?total/max*100:0)+'%';
   const track=element('div');
   track.className='lesson-payroll-track';
   track.setAttribute('aria-hidden','true');
   track.append(bar);
   column.append(element('strong',formatPay(total)),track,
    element('span',entry.label));
   chart.append(column);
  }
  return chart;
 }

 function renderOverview(data){
  const students=studentProgress(data);
  const upcoming=students.filter(row=>row.remaining>0&&row.remaining<=3);
  const stats=element('dl');
  stats.className='lesson-stats';
  for(const [label,count] of [
   ['学员总数',students.length],
   ['学习中',students.filter(row=>row.status==='学习中').length],
   ['即将结课（≤3课时）',upcoming.length],
   ['已结课',students.filter(row=>row.status==='已结课').length]
  ]){
   const card=element('div');
   card.append(element('dt',label),element('dd',count));
   stats.append(card);
  }
  content.append(stats,element('h3','即将结课学员'),
   table('即将结课学员',['学生姓名','所在班级','剩余课时','预计结束日期'],
    upcoming.sort((a,b)=>a.remaining-b.remaining).map(row=>[studentName(row.student),classLabel(row.course),row.remaining,row.course.end]),
    '暂无剩余 1–3 课时的学员。'),
   element('p','共享库中的签到会自动计入课时。出勤、补课和缺勤各计 1 课时，请假只记录次数。'));
 }

 function renderRecords(data){
  const toolbar=element('div');
  toolbar.className='lesson-toolbar';
  const heading=element('h3',tabs[view]);
  const add=button('新增'+recordNames[view],()=>render({}),'primary');
  const actions=element('div');
  actions.className='lesson-record-actions';
  actions.append(add);
  if(view==='students')actions.append(button('粘贴 Excel',()=>render('paste')));
  toolbar.append(heading,actions);
  content.append(toolbar);
  function edit(item){
   return button('编辑',()=>render(item));
  }
  let headers;
  let rows;
  if(view==='students'){
   headers=['学生姓名','联系电话','所在班级','报名日期','总课时','已上课时','缺勤课时','请假次数','已消耗课时','剩余课时','课程进度','预计结束日期','学习状态'];
   rows=studentProgress(data).map(row=>[
    studentName(row.student),row.student.phone,row.course?classLabel(row.course):'',row.student.enrolled,
    row.total,row.attended,row.absent,row.leave,row.used,row.remaining,row.progress,row.course?.end,row.status,edit(row.student)
   ]);
  }else{
   headers=fields[view].map(([,label])=>label);
   rows=data[view].map(item=>[
    ...fields[view].map(([key,,type])=>type==='students'?studentName(data.students.find(record=>record.id===item[key])):
     type==='classes'?classLabel(data.classes.find(record=>record.id===item[key])):
     type==='duration'?durationOptions.find(([minutes])=>minutes===item[key])?.[1]:item[key]),
    edit(item)
   ]);
  }
  const page=view;
  const empty='暂无'+recordNames[page]+'记录。';
  const columns=[...headers,'操作'];
  const label=searchLabels[page];
  if(!label){
   content.append(table(tabs[page],columns,rows,empty));
   return;
  }
  const search=element('input');
  search.type='search';
  search.className='lesson-record-search';
  search.placeholder=label+'…';
  search.setAttribute('aria-label',label);
  search.value=searches[page]??'';
  actions.append(search);
  const results=element('div');
  const searchableRows=rows.map(row=>row.slice(0,-1).map(searchText).join(' '));
  function filter(){
   searches[page]=search.value;
   const terms=searchText(search.value).trim().split(/\s+/).filter(Boolean);
   const matches=terms.length?rows.filter((row,i)=>terms.every(term=>searchableRows[i].includes(term))):rows;
   results.replaceChildren(table(tabs[page],columns,matches,rows.length?'没有找到匹配的记录。':empty));
  }
  search.addEventListener('input',filter);
  content.append(results);
  filter();
 }

 function renderForm(data,item){
  const batch=view==='attendance'&&!item.id;
  if(batch&&!data.classes.length){
   const nextView='classes';
   const guide='请先创建班级，再在学员管理中为学员分班。';
   const heading=element('h3','新增签到');
   heading.tabIndex=-1;
   const actions=element('div');
   actions.className='lesson-toolbar';
   actions.append(button('前往'+tabs[nextView],()=>{
    view=nextView;
    render();
    content.querySelector('h3').tabIndex=-1;
    content.querySelector('h3').focus();
   },'primary'),button('返回签到列表',()=>render()));
   content.append(heading,element('p',guide),actions);
   heading.focus();
   return;
  }
  const form=element('form');
  form.className='lesson-form';
  const heading=element('h3',(item.id?'编辑':'新增')+recordNames[view]);
  const controls={};
  const roster=batch?element('fieldset'):null;
  for(const [key,label,type='text',required=true] of fields[view]){
   if(batch&&key==='studentId'){
    roster.className='lesson-checklist lesson-attendance-roster';
    form.append(roster);
    continue;
   }
   const group=element('label',label);
   const records=type==='students'?[]:data[type];
   const courseLabels=type==='classes'?classLabels(records):[];
   const options=records?records.map((record,i)=>[record.id,courseLabels[i]]):
    type==='status'?statuses.map(status=>[status,status]):type==='duration'?durationOptions:null;
   const input=element(options?'select':type==='textarea'?'textarea':'input');
   if(options){
    input.append(new Option(view==='students'&&key==='classId'?'待分班':'请选择',''),...options.map(([id,name])=>new Option(name,id)));
   }else if(type==='textarea'){
    input.rows=3;
    input.maxLength=1000;
   }else{
    input.type=type;
    input.maxLength=120;
    if(type==='number'){
     input.min=1;
     input.max=10000;
     input.step=1;
    }
   }
   input.required=required;
   input.name=key;
   input.value=item[key]??(key==='date'?today():'');
   controls[key]=input;
   group.append(input);
   form.append(group);
  }
  if(view==='attendance'){
   function showRoster(currentStudent=''){
    const classId=controls.classId.value;
    const students=classId?data.students.filter(student=>student.classId===classId||
     (item.classId===classId&&item.studentId===student.id)):[];
    const labels=studentLabels(students);
    if(!batch){
     controls.studentId.replaceChildren(new Option('请选择',''),
      ...students.map((student,i)=>new Option(labels[i],student.id)));
     controls.studentId.value=students.some(student=>student.id===currentStudent)?currentStudent:'';
     return;
    }
    const legend=element('legend','班级学员（可多选）');
    if(!students.length){
     roster.replaceChildren(legend,element('p',classId?'该班级暂无学员，请先在学员管理中分班。':'请选择班级，名单会自动显示。'));
     return;
    }
    const checks=students.map(student=>{
     const check=element('input');
     check.type='checkbox';
     check.name='studentId';
     check.value=student.id;
     return check;
    });
    const summary=element('span');
    summary.setAttribute('role','status');
    const summarize=()=>{summary.textContent='已选 '+checks.filter(check=>check.checked).length+' / '+checks.length+' 位';};
    const toggle=checked=>{
     for(const check of checks)check.checked=checked;
     summarize();
    };
    const toolbar=element('div');
    toolbar.className='lesson-toolbar lesson-roster-actions';
    toolbar.append(button('全选',()=>toggle(true)),button('取消全选',()=>toggle(false)),summary);
    const list=element('div');
    list.className='lesson-roster-list';
    for(const [i,check] of checks.entries()){
     const label=element('label');
     label.append(check,document.createTextNode(labels[i]));
     check.addEventListener('change',summarize);
     list.append(label);
    }
    summarize();
    roster.replaceChildren(legend,toolbar,list);
   }
   controls.classId.addEventListener('change',()=>{
    controls.teacher.value=data.classes.find(course=>course.id===controls.classId.value)?.teacher??'';
    showRoster();
    message.textContent='';
   });
   showRoster(item.studentId);
  }
  const actions=element('div');
  actions.className='lesson-toolbar';
  const save=element('button','保存');
  save.type='submit';
  save.className='primary';
  actions.append(save,button('取消',()=>render()));
  form.append(actions);
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   try{
    requireTeacher();
    requireWritable(data);
    const latest=data;
    const records=latest[view];
    const entry={id:item.id??crypto.randomUUID()};
    for(const [key,,type,required=true] of fields[view]){
     if(batch&&key==='studentId')continue;
     const value=controls[key].value.trim();
     if(required&&!value)throw Error('请填写所有必填字段。');
     entry[key]=type==='number'||type==='duration'?(value?Number(value):null):value;
    }
    if(item.id&&!records.some(record=>record.id===item.id))throw Error('这条记录已不存在，请重新打开列表。');
    if(view==='classes'&&entry.code&&records.some(record=>record.id!==entry.id&&record.code?.toLowerCase()===entry.code.toLowerCase())){
     throw Error('此班级编号已存在，请使用其他编号。');
    }
    if(view==='classes'&&entry.start&&entry.end&&entry.end<entry.start)throw Error('预计结课日期须等于或晚于开课日期。');
    if(entry.classId&&!latest.classes.some(record=>record.id===entry.classId))throw Error('请选择有效班级。');
    let pending=[entry];
    let notice='已保存'+recordNames[view]+'记录。';
    if(view==='attendance'){
     const selected=batch?new FormData(form).getAll('studentId'):[entry.studentId];
     if(!selected.length||selected.length>500)throw Error('请选择 1–500 位学员。');
     const students=new Map(latest.students.map(student=>[student.id,student]));
     if(selected.some(studentId=>!students.has(studentId)||
      (students.get(studentId).classId!==entry.classId&&(item.studentId!==studentId||item.classId!==entry.classId)))){
      throw Error('请选择该班级的学员。');
     }
     const existing=new Set(records.filter(record=>record.id!==entry.id&&record.classId===entry.classId&&
      record.date===entry.date&&record.lesson===entry.lesson).map(record=>record.studentId));
     const duplicates=selected.filter(studentId=>existing.has(studentId)).map(studentId=>studentName(students.get(studentId)));
     if(duplicates.length)throw Error(duplicates.slice(0,3).join('、')+(duplicates.length>3?'等学员':'')+
      '当天的此课次已有签到。请取消勾选或编辑原记录。');
     if(batch){
      pending=selected.map(studentId=>({...entry,id:crypto.randomUUID(),studentId}));
      notice='已保存 '+pending.length+' 位学员的签到记录。';
     }
    }
    save.disabled=true;
    const success=await mutate('admin-save',{revision:shared.revision,group:view,records:pending},notice);
    if(!success)save.disabled=false;
   }catch(error){
    message.textContent=error.message;
   }
  });
  content.append(heading,form);
  Object.values(controls)[0].focus();
 }

 return {open(){
  view='overview';
  dialog.classList.add('lesson-management-open');
  panel.hidden=false;
  refresh();
  dialog.scrollTop=0;
  title.focus();
 }};
}
