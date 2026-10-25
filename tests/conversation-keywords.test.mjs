import test from 'node:test';
import assert from 'node:assert/strict';
import {toSimplified} from '../vendor/chinese-simplified.mjs';
import {matchedKeyword,cleanKeywords,inferredKeywords} from '../conversation-keywords.mjs';
test('simplified Chinese preserves names and phrase exceptions',()=>{assert.equal(toSimplified('老師您好，我在學習漢語，頭髮很長。Anna 2026'), '老师您好，我在学习汉语，头发很长。Anna 2026');assert.equal(toSimplified('乾隆皇帝，乾乾淨淨。'),'乾隆皇帝，干干净净。');});
test('keywords accept partial phrases and ASR spacing, without generic filler matches',()=>{assert.equal(matchedKeyword('我很好是，谢谢。',['好','不错']),'好');assert.equal(matchedKeyword('我在學 習中文。',['学习']),'学习');assert.equal(matchedKeyword('明天下雨。',['好','忙']),'');assert.deepEqual(cleanKeywords(['我','是','忙','忙']),['忙']);assert.throws(()=>cleanKeywords(['x'.repeat(21)]));assert.ok(inferredKeywords('你今天还好吗？').includes('好'));});
