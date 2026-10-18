import assert from 'node:assert/strict';
import {parseLrc,lyricAt,youtubeEmbedUrl} from '../quiz-music.mjs';
const lines=parseLrc('[ti:测试文字]\n[00:04.25]练习乙\n[00:01.00][00:07.00]练习甲\n[00:09.00]\n[01:62]无效时间\n[ar:作者]');
assert.deepEqual(lines,[{time:1,text:'练习甲'},{time:4.25,text:'练习乙'},{time:7,text:'练习甲'},{time:9,text:''}]);
assert.equal(lyricAt(lines,0),'');assert.equal(lyricAt(lines,1),'练习甲');assert.equal(lyricAt(lines,4.24),'练习甲');assert.equal(lyricAt(lines,4.25),'练习乙');assert.equal(lyricAt(lines,8),'练习甲');assert.equal(lyricAt(lines,9),'');
assert.deepEqual(parseLrc('[offset:500]\n[00:01]测试'),[{time:1.5,text:'测试'}]);assert.deepEqual(parseLrc('[offset:-2000]\n[00:01]测试'),[{time:0,text:'测试'}]);assert.deepEqual(parseLrc('没有时间的文字'),[]);
console.log('通过：歌词多时间标签、排序、偏移、空行、无效时间和按播放时间切换。');

const embed=new URL(youtubeEmbedUrl('S1ElLh_hf3k'));assert.equal(embed.hostname,'www.youtube-nocookie.com');assert.equal(embed.pathname,'/embed/S1ElLh_hf3k');assert.equal(embed.searchParams.get('autoplay'),'1');assert.equal(embed.searchParams.get('cc_load_policy'),'1');assert.throws(()=>youtubeEmbedUrl('../invalid'),/无效/);
