import assert from 'node:assert/strict';
import fs from 'node:fs';
import {studentExercises} from '../exercise-options.mjs';
const published=JSON.parse(fs.readFileSync(new URL('../exercise-catalog.json',import.meta.url))).exercises;
for(const [bank,count] of [['hsk1-2',30],['hsk3',40],['hsk4',1],['hsk5',1],['daily',1],['factory',1]]){
 const items=published.filter(e=>e.bank===bank),visible=studentExercises(items);assert.equal(visible.length,count);
 if(['hsk4','hsk5'].includes(bank))assert.ok(visible[0].exercise.title.includes('演示练习'));else assert.ok(visible.every(e=>!e.exercise.title.includes('演示练习')));
}
const demo={id:'demo',exercise:{title:'HSK4 · 演示练习'}},draft={id:'draft',draft:true,exercise:{title:'HSK4 第一课'}};
assert.deepEqual(studentExercises([demo]),[demo]);assert.deepEqual(studentExercises([demo,draft]),[draft]);assert.deepEqual(studentExercises([]),[]);assert.equal([demo,draft].length,2);
console.log('通过：有正式题目隐藏演示、无正式题目保留演示、新草稿切换及空列表。');
