const storageKey='qinglan-lesson-management-v1';
const statuses=['出勤','补课','缺勤','请假'];
const tabs={overview:'管理看板',students:'学员管理',classes:'班级课程',attendance:'上课签到'};
const fields={
 students:[
  ['code','学员编号'],['name','学生姓名'],['phone','联系电话','tel',false],
  ['classId','所在班级','classes'],['enrolled','报名日期','date']
 ],
 classes:[
  ['code','班级编号'],['name','班级名称'],['teacher','授课教师'],
  ['days','每周上课日','text',false],['time','上课时间','text',false],
  ['start','开课日期','date'],['end','预计结课日期','date'],['hours','总课时','number'],
  ['room','教室','text',false],['notes','备注','textarea',false]
 ],
 attendance:[
  ['date','上课日期','date'],['studentId','学员','students'],['classId','班级','classes'],
  ['lesson','课次','number'],['teacher','授课教师','text',false],
  ['topic','上课主题','text',false],['content','本节课学习内容','textarea',false],
  ['status','出勤状态','status']
 ]
};
const recordNames={students:'学员',classes:'班级',attendance:'签到'};
const panels=new WeakMap();

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

function today(){
 const now=new Date();
 return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
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
  const total=Number(course?.hours??0);
  const used=attended+absent;
  const remaining=Math.max(0,total-used);
  const progress=total?Math.round(used/total*100)+'%':'—';
  const status=!course?'待分班':remaining===0?'已结课':course.end<currentDate?'计划已到期':'学习中';
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

export function openLessonManagement(dialog,requireTeacher){
 if(!panels.has(dialog))panels.set(dialog,createPanel(dialog,requireTeacher));
 panels.get(dialog).open();
}

function createPanel(dialog,requireTeacher){
 let view='overview';
 const panel=element('section');
 panel.id='lesson-management';
 panel.setAttribute('aria-labelledby','lesson-management-title');
 const header=element('header');
 const title=element('h2','学员课时管理看板');
 title.id='lesson-management-title';
 title.tabIndex=-1;
 const close=button('返回教师工具',()=>{
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
 panel.append(header,nav,content,message);
 panel.hidden=true;
 dialog.append(panel);
 dialog.addEventListener('close',()=>{
  if(dialog.open)return;
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
   const data=readData();
   if(view==='overview')renderOverview(data);
   else if(editor)renderForm(data,editor);
   else renderRecords(data);
  }catch(error){
   message.textContent=error.message;
  }
 }

 function renderOverview(data){
  const students=studentProgress(data);
  const upcoming=students.filter(row=>row.remaining>0&&row.remaining<=3);
  const stats=element('dl');
  stats.className='lesson-stats';
  for(const [label,count] of [
   ['在读及结课学员',students.length],
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
    upcoming.sort((a,b)=>a.remaining-b.remaining).map(row=>[row.student.name,row.course.name,row.remaining,row.course.end]),
    '暂无剩余 1–3 课时的学员。'),
   element('p','记录保存在当前浏览器。出勤、补课和缺勤各计 1 课时，请假只记录次数。'));
 }

 function renderRecords(data){
  const prerequisites=view==='students'&&!data.classes.length?'请先在班级课程添加班级。':
   view==='attendance'&&!data.students.length?'请先在学员管理添加学员。':'';
  const toolbar=element('div');
  toolbar.className='lesson-toolbar';
  const heading=element('h3',tabs[view]);
  const add=button('新增'+recordNames[view],()=>render({}),'primary');
  add.disabled=Boolean(prerequisites);
  toolbar.append(heading,add);
  content.append(toolbar);
  if(prerequisites)content.append(element('p',prerequisites));
  function edit(item){
   return button('编辑',()=>render(item));
  }
  let headers;
  let rows;
  if(view==='students'){
   headers=['学员编号','学生姓名','联系电话','所在班级','报名日期','总课时','已上课时','缺勤课时','请假次数','已消耗课时','剩余课时','课程进度','预计结束日期','学习状态'];
   rows=studentProgress(data).map(row=>[
    row.student.code,row.student.name,row.student.phone,row.course?.name,row.student.enrolled,
    row.total,row.attended,row.absent,row.leave,row.used,row.remaining,row.progress,row.course?.end,row.status,edit(row.student)
   ]);
  }else{
   headers=fields[view].map(([,label])=>label);
   rows=data[view].map(item=>[
    ...fields[view].map(([key,,type])=>fields[type]?data[type].find(record=>record.id===item[key])?.name:item[key]),
    edit(item)
   ]);
  }
  content.append(table(tabs[view],[...headers,'操作'],rows,'暂无'+recordNames[view]+'记录。'));
 }

 function renderForm(data,item){
  const form=element('form');
  form.className='lesson-form';
  const heading=element('h3',(item.id?'编辑':'新增')+recordNames[view]);
  const controls={};
  for(const [key,label,type='text',required=true] of fields[view]){
   const group=element('label',label);
   const options=fields[type]?data[type].map(record=>[record.id,record.code+' · '+record.name]):
    type==='status'?statuses.map(status=>[status,status]):null;
   const input=element(options?'select':type==='textarea'?'textarea':'input');
   if(options){
    input.append(new Option('请选择',''),...options.map(([id,name])=>new Option(name,id)));
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
   input.value=item[key]??(key==='date'||key==='enrolled'?today():'');
   controls[key]=input;
   group.append(input);
   form.append(group);
  }
  if(view==='attendance'){
   controls.studentId.addEventListener('change',()=>{
    const student=data.students.find(record=>record.id===controls.studentId.value);
    const course=data.classes.find(record=>record.id===student?.classId);
    controls.classId.value=course?.id??'';
    controls.teacher.value=course?.teacher??'';
   });
  }
  const actions=element('div');
  actions.className='lesson-toolbar';
  const save=element('button','保存');
  save.type='submit';
  save.className='primary';
  actions.append(save,button('取消',()=>render()));
  form.append(actions);
  form.addEventListener('submit',event=>{
   event.preventDefault();
   try{
    requireTeacher();
    const latest=readData();
    const records=latest[view];
    const entry={id:item.id??crypto.randomUUID()};
    for(const [key,,type,required=true] of fields[view]){
     const value=controls[key].value.trim();
     if(required&&!value)throw Error('请填写所有必填字段。');
     entry[key]=type==='number'?Number(value):value;
    }
    if(item.id&&!records.some(record=>record.id===item.id))throw Error('这条记录已不存在，请重新打开列表。');
    if(entry.code&&records.some(record=>record.id!==entry.id&&record.code.toLowerCase()===entry.code.toLowerCase())){
     throw Error('此编号已存在，请使用其他编号。');
    }
    if(view==='classes'&&entry.end<entry.start)throw Error('预计结课日期须等于或晚于开课日期。');
    if(entry.classId&&!latest.classes.some(record=>record.id===entry.classId))throw Error('请选择有效班级。');
    if(view==='attendance'){
     const student=latest.students.find(record=>record.id===entry.studentId);
     if(!student)throw Error('请选择有效学员。');
     const sameAssignment=item.studentId===entry.studentId&&item.classId===entry.classId;
     if(student.classId!==entry.classId&&!sameAssignment)throw Error('请选择该学员当前所在的班级。');
     if(records.some(record=>record.id!==entry.id&&record.studentId===entry.studentId&&
      record.classId===entry.classId&&record.date===entry.date&&record.lesson===entry.lesson)){
      throw Error('该学员当天的此课次已有签到，请编辑原记录。');
     }
    }
    latest[view]=item.id?records.map(record=>record.id===item.id?entry:record):[...records,entry];
    localStorage.setItem(storageKey,JSON.stringify(latest));
    render(undefined,'已保存'+recordNames[view]+'记录。');
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
  render();
  dialog.scrollTop=0;
  title.focus();
 }};
}
