export const payBands=[
 {minutes:60,label:'1 小时',field:'rate60'},
 {minutes:90,label:'1.5 小时',field:'rate90'}
];

const amountFormat=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2});
export const formatPay=cents=>cents==null?'—':amountFormat.format(cents/100);

export function readPayRate(value){
 if(value===''||value==null)return null;
 if(typeof value!=='string'||!/^\d{1,9}(?:\.\d{1,2})?$/.test(value)){
  throw Error('费用须为非负数，最多 9 位整数和 2 位小数。');
 }
 const [whole,fraction='']=value.split('.');
 return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}

const teacherName=value=>String(value??'').trim().normalize('NFKC').toLowerCase();

export function calculatePayroll(accounts,attendance,start,end){
 const results=accounts.map(account=>({account,counts:{60:0,90:0},total:0,missingRates:0}));
 const byUsername=new Map(results.map(row=>[row.account.username,row]));
 const byName=new Map();
 for(const row of results){
  const name=teacherName(row.account.name);
  if(name)byName.set(name,[...(byName.get(name)??[]),row]);
 }
 const sessions=new Map();
 const unresolved=new Set();
 for(const record of attendance){
  if(record.date<start||record.date>end)continue;
  const name=teacherName(record.teacher);
  const candidates=byName.get(name)??[];
  const teacher=record.teacherUsername?byUsername.get(record.teacherUsername):candidates.length===1?candidates[0]:null;
  const lessonKey=[record.classId,record.date,record.lesson];
  if(!teacher){
   unresolved.add(JSON.stringify([...lessonKey,record.teacherUsername||name]));
   continue;
  }
  const key=JSON.stringify([...lessonKey,teacher.account.username]);
  const session=sessions.get(key)??{teacher,durations:new Set()};
  if(payBands.some(band=>band.minutes===record.durationMinutes))session.durations.add(record.durationMinutes);
  sessions.set(key,session);
 }
 let missingDuration=0;
 let conflictingDuration=0;
 for(const {teacher,durations} of sessions.values()){
  if(durations.size===0){missingDuration++;continue;}
  if(durations.size>1){conflictingDuration++;continue;}
  teacher.counts[durations.values().next().value]++;
 }
 for(const row of results){
  for(const {minutes,field} of payBands){
   const count=row.counts[minutes];
   const rate=row.account[field];
   if(rate==null)row.missingRates+=count;
   else row.total+=count*rate;
  }
 }
 results.sort((a,b)=>b.total-a.total||a.account.name.localeCompare(b.account.name,'zh')||
  a.account.username.localeCompare(b.account.username));
 return {results,missingDuration,conflictingDuration,unresolved:unresolved.size};
}
