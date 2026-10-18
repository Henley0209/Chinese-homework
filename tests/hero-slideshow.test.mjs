import assert from 'node:assert/strict';
import {validateSlideshow} from '../hero-slideshow.mjs';
assert.deepEqual(validateSlideshow({slides:['assets/classroom/one.jpg','assets/classroom/one.jpg','assets/classroom/two.webp']}),{slides:['assets/classroom/one.jpg','assets/classroom/two.webp'],initialDelay:3000,interval:2000,fade:700});
for(const value of [null,{}, {slides:['https://unrelated.example/photo.jpg']},{slides:['assets/classroom/../../private.jpg']},{slides:['javascript:bad']},{slides:Array(51).fill('assets/classroom/one.jpg')}])assert.throws(()=>validateSlideshow(value));
assert.deepEqual(validateSlideshow({slides:[]}).slides,[]);

const fs=await import('node:fs');const config=validateSlideshow(JSON.parse(fs.readFileSync(new URL('../hero-slideshow.json',import.meta.url))));assert.equal(config.slides.length,7);for(const src of config.slides)assert.ok(fs.statSync(new URL('../'+src,import.meta.url)).size>1000);
