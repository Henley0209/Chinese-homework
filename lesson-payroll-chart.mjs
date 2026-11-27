import {calculatePayroll} from './lesson-payroll.mjs';

export function payrollGroup({rate60,rate90}){
 if(rate60>=10000||rate90>=10000)return 'vietnam';
 if(rate60!=null&&rate90!=null)return 'china';
 return null;
}

export function monthlyPayroll(accounts,attendance,today){
 const currentMonth=today.slice(0,7);
 const byMonth=new Map();
 for(const record of attendance){
  const month=record.date.slice(0,7);
  if(month>=currentMonth)continue;
  if(!byMonth.has(month))byMonth.set(month,[]);
  byMonth.get(month).push(record);
 }
 const date=new Date(currentMonth+'-01T00:00:00Z');
 date.setUTCMonth(date.getUTCMonth()-1);
 const previous=date.toISOString().slice(0,7);
 const first=[...byMonth.keys()].sort()[0]??previous;
 date.setTime(Date.parse(first+'-01T00:00:00Z'));
 const totals=[];
 while(date.toISOString().slice(0,7)<currentMonth){
  const month=date.toISOString().slice(0,7);
  const records=byMonth.get(month)??[];
  const {results,missingDuration,conflictingDuration,unresolved}=calculatePayroll(accounts,records,month+'-01',month+'-31');
  let total=0;
  let incomplete=Boolean(missingDuration||conflictingDuration||unresolved);
  for(const row of results){
   const group=payrollGroup(row.account);
   if(group==='china')total+=row.total*3900;
   if(group==='vietnam')total+=row.total;
   if(row.missingRates||(!group&&(row.counts[60]||row.counts[90])))incomplete=true;
  }
  totals.push({label:month.replace('-',''),total,incomplete});
  date.setUTCMonth(date.getUTCMonth()+1);
 }
 return totals;
}
