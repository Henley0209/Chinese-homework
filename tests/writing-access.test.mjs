import assert from 'node:assert/strict';
import {banks} from '../bank-access.mjs';
import {resolveWritingLevel,writingLevels} from '../writing-access.mjs';
for(const selected of banks.map(b=>b.id))for(const bank of banks){const level=resolveWritingLevel(bank.password,selected);assert.ok(writingLevels.includes(level));if(writingLevels.includes(selected))assert.equal(level,selected);}
for(const value of ['',null,'   '])assert.throws(()=>resolveWritingLevel(value,'factory'),/请输入题库密码/);
for(const value of ['wrong','invalid-course-code'])assert.throws(()=>resolveWritingLevel(value,'hsk3'),/不正确/);
assert.equal(resolveWritingLevel(' '+banks[1].password+' ','factory'),'hsk3');
console.log('通过：六组密码在所有题库入口均可使用，空密码提示、错误密码拦截和默认练习级别。');
