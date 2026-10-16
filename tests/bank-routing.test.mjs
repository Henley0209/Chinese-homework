import assert from 'node:assert/strict';
import fs from 'node:fs';
import {banks,resolveBank} from '../bank-access.mjs';
import {validate,grade} from '../grading.mjs';
const root=new URL('../',import.meta.url);
for(const bank of banks){
 assert.equal(resolveBank(bank.id,bank.password).file,bank.file);
 assert.equal(resolveBank(bank.id,'').id,'intro');
 for(const other of banks)if(other.id!==bank.id)assert.throws(()=>resolveBank(bank.id,other.password));
 const data=validate(JSON.parse(fs.readFileSync(new URL(bank.file,root),'utf8')));
 assert.equal(grade(data,Object.fromEntries(data.questions.map(q=>[q.id,q.answers[0]]))).score,100);
 assert.equal(grade(data,{}).score,0);
}
console.log('通过：原六组题库密码、错配拦截和评分规则。');
await import('./roles-and-exercises.test.mjs');
