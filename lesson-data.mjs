export function lessonDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value);
 return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
}

export function lessonToday(){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok'}).format(new Date());
}

function spreadsheetRows(text){
 const rows=[];
 let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(quoted){
   if(char==='"'&&text[i+1]==='"'){cell+='"';i++;}
   else if(char==='"')quoted=false;
   else cell+=char;
  }else if(char==='"'&&!cell)quoted=true;
  else if(char==='\t'){row.push(cell);cell='';}
  else if(char==='\n'||char==='\r'){
   if(char==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);rows.push(row);row=[];cell='';
  }else cell+=char;
 }
 if(quoted)throw Error('复制内容有未闭合的引号，请重新从 Excel 复制。');
 rows.push([...row,cell]);
 return rows.map(row=>row.map(cell=>cell.trim())).filter(row=>row.some(Boolean));
}

const headings={
 code:['学员编号','学生编号','编号'],name:['学员姓名','学生姓名','姓名'],
 phone:['联系电话','手机号','电话'],classId:['班级编号','所在班级','班级名称','班级'],
 enrolled:['报名日期','入学日期']
};
function pastedDate(value){
 const match=/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/.exec(value);
 if(match)return [match[1],match[2].padStart(2,'0'),match[3].padStart(2,'0')].join('-');
 if(/^\d{5}$/.test(value))return new Date(Date.UTC(1899,11,30)+Number(value)*86400000).toISOString().slice(0,10);
 return value;
}

export function parseStudentPaste(value,data){
 if(value.length>200000)throw Error('复制内容过长，请分批导入。');
 const rows=spreadsheetRows(value.replace(/^\uFEFF/,''));
 if(!rows.length)throw Error('请先粘贴 Excel 学员行。');
 const headerIndex=rows.slice(0,5).findIndex(row=>
  row.some(cell=>headings.code.includes(cell))&&row.some(cell=>headings.name.includes(cell)));
 const header=headerIndex>=0;
 const headerRow=rows[headerIndex]??[];
 const columns=Object.fromEntries(Object.entries(headings).map(([key,labels])=>[key,headerRow.findIndex(cell=>labels.includes(cell))]));
 const classColumn=headerRow.indexOf('班级编号');
 if(classColumn>=0)columns.classId=classColumn;
 if(!header)Object.assign(columns,{code:0,name:1,phone:2,classId:3,enrolled:4});
 const entries=rows.slice(headerIndex+1);
 if(!entries.length||entries.length>500)throw Error('每次请粘贴 1–500 位学员。');
 const codes=new Set(data.students.map(item=>item.code.toLowerCase()));
 return entries.map((row,i)=>{
  const get=key=>row[columns[key]]??'';
  const code=get('code'),name=get('name'),phone=get('phone'),className=get('classId');
  const enrolled=get('enrolled')?pastedDate(get('enrolled')):lessonToday();
  const courses=data.classes.filter(item=>item.code.toLowerCase()===className.toLowerCase());
  const matches=courses.length?courses:data.classes.filter(item=>item.name===className);
  const fail=message=>{throw Error('第 '+(i+headerIndex+2)+' 行：'+message);};
  if(!code||!name||[code,name,phone].some(cell=>cell.length>120))fail('学员编号和姓名必填，每项最多 120 字。');
  if(codes.has(code.toLowerCase()))fail('学员编号「'+code+'」已存在。');
  if(className&&matches.length!==1)fail('班级「'+className+'」无法唯一匹配，请核对班级编号。');
  if(!lessonDate(enrolled))fail('报名日期无效，请使用 YYYY-MM-DD。');
  codes.add(code.toLowerCase());
  return {id:crypto.randomUUID(),code,name,phone,classId:matches[0]?.id??'',enrolled};
 });
}
