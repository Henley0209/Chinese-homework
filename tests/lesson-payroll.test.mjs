import assert from 'node:assert/strict';
import test from 'node:test';
import {calculatePayroll,readPayRate} from '../lesson-payroll.mjs';

test('rates distinguish missing values from zero and preserve cents',()=>{
 assert.equal(readPayRate(''),null);
 assert.equal(readPayRate('0'),0);
 assert.equal(readPayRate('123.05'),12305);
 for(const value of ['-1','1.001','1e3','1000000000'])assert.throws(()=>readPayRate(value));
});

test('payroll counts lessons once, ranks by total and flags incomplete lessons',()=>{
 const accounts=[
  {username:'a',name:'改名后的李老师',rate60:10025,rate90:16000},
  {username:'b',name:'王老师',rate60:20000,rate90:30000,disabled:true},
  {username:'c',name:'赵老师',rate60:0}
 ];
 const record={date:'2026-11-26',classId:'class1',lesson:1,teacher:'李老师',teacherUsername:'a',durationMinutes:60};
 const attendance=[
  record,{...record,studentId:'another-student'},
  {...record,lesson:2,durationMinutes:90},
  {...record,lesson:3,teacher:'王老师',teacherUsername:undefined,durationMinutes:90},
  {...record,lesson:4,teacherUsername:'c',durationMinutes:90},
  {...record,lesson:5,teacherUsername:undefined,teacher:'找不到的老师'},
  {...record,lesson:6,durationMinutes:undefined},
  {...record,lesson:7},{...record,lesson:7,durationMinutes:90},
  {...record,date:'2026-11-27'}
 ];
 const {results,unresolved,missingDuration,conflictingDuration}=calculatePayroll(accounts,attendance,'2026-11-26','2026-11-26');
 assert.deepEqual(results.map(row=>[row.account.username,row.total,row.counts[60],row.counts[90],row.missingRates]),[
  ['b',30000,0,1,0],['a',26025,1,1,0],['c',0,0,1,1]
 ]);
 assert.deepEqual([unresolved,missingDuration,conflictingDuration],[1,1,1]);
});
