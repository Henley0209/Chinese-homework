import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildCorpus,voice} from './picture-audio-corpus.mjs';
const manifest=JSON.parse(readFileSync(new URL('../picture-words/audio/manifest.json',import.meta.url),'utf8'));
const recordings={};
for(const clip of buildCorpus()){
 const entry=manifest.clips[clip.key];assert.equal(entry?.voice,voice);assert.equal(entry?.file,clip.file);assert.ok(entry.duration>0);recordings[clip.text]=entry.file;
}
writeFileSync(new URL('../picture-words/audio-index.mjs',import.meta.url),'// Generated from verified Xiaoxiao recordings; available before the first tap.\nexport const wordRecordings=Object.freeze('+JSON.stringify(recordings)+');\n');
console.log(`Prepared synchronous playback index for ${Object.keys(recordings).length} Xiaoxiao recordings`);
