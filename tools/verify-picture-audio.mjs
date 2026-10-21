import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {buildCorpus,voice} from './picture-audio-corpus.mjs';
const base=new URL('../picture-words/audio/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
assert.equal(manifest.voices.female,voice);
for(const clip of buildCorpus()){
 const entry=manifest.clips[clip.key];assert.ok(entry,clip.text);assert.equal(entry.voice,voice);assert.equal(entry.file,clip.file);assert.ok(entry.duration>0);assert.ok(statSync(new URL(entry.file,base)).size>=1000);
}
console.log(`Verified all ${buildCorpus().length} Xiaoxiao vocabulary recordings`);
