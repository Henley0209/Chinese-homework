import test from 'node:test';
import assert from 'node:assert/strict';
import {readCourseware,coursewareContext,maxCoursewareBytes} from '../homework-courseware.mjs';
import {officeXml} from '../homework-zip.mjs';
import {makeDocx} from '../homework-docx.mjs';
const file=(name,text)=>Object.assign(new Blob([text]),{name});
test('text courseware preserves Chinese, bounds AI context and rejects invalid files',async()=>{
 const result=await readCourseware(file('点菜.txt','菜单\r\n面条\t 米饭'));
 assert.equal(result.title,'点菜');assert.equal(result.text,'菜单\n面条米饭');
 assert.equal(JSON.parse(coursewareContext(result.text)).content,result.text);
 const long=await readCourseware(file('长课件.md','汉'.repeat(7100)));assert.equal(long.text.length,7000);assert.equal(long.truncated,true);
 await assert.rejects(readCourseware(file('空.txt','  ')),/未提取/);
 await assert.rejects(readCourseware(file('旧.ppt','data')),/新版格式/);
 await assert.rejects(readCourseware({name:'大.txt',size:maxCoursewareBytes+1}),/20MB/);
 assert.throws(()=>coursewareContext(' '));assert.throws(()=>coursewareContext('汉'.repeat(7001)));
});
test('Office reader selects document XML and rejects corrupt ZIP files',async()=>{
 const doc=makeDocx({title:'课件',bank:'HSK3',questions:[]});
 const entries=await officeXml(await doc.arrayBuffer(),'docx');assert.equal(entries.length,1);assert.equal(entries[0].name,'word/document.xml');assert.match(entries[0].text,/课件/);
 await assert.rejects(officeXml(new ArrayBuffer(0),'pptx'));
});
