import assert from 'node:assert/strict';
import test from 'node:test';
import {monthlyPayroll,payrollGroup} from '../lesson-payroll-chart.mjs';

test('payroll groups use both rates and treat 100 as Vietnam',()=>{
 assert.equal(payrollGroup({rate60:9999,rate90:9500}),'china');
 assert.equal(payrollGroup({rate60:10000,rate90:9500}),'vietnam');
 assert.equal(payrollGroup({rate60:9000,rate90:10000}),'vietnam');
 assert.equal(payrollGroup({rate60:9000,rate90:null}),null);
});

test('monthly totals include completed months in date order and convert only Chinese fees',()=>{
 const accounts=[
  {username:'cn',name:'甲',rate60:6000,rate90:8000},
  {username:'vn',name:'乙',rate60:15000,rate90:20000}
 ];
 const lesson={classId:'class-1',lesson:1,date:'2026-10-31',teacherUsername:'cn',durationMinutes:60};
 const records=[lesson,{...lesson,studentId:'another-student'},
  {...lesson,teacherUsername:'vn',durationMinutes:90},
  {...lesson,date:'2026-12-31',durationMinutes:null},
  {...lesson,date:'2027-01-01'}];
 assert.deepEqual(monthlyPayroll(accounts,records,'2027-01-01'),[
  {label:'202610',total:23420000,incomplete:false},
  {label:'202611',total:0,incomplete:false},
  {label:'202612',total:0,incomplete:true}
 ]);
 assert.deepEqual(monthlyPayroll(accounts,records,'2026-10-31'),[{label:'202609',total:0,incomplete:false}]);
});
