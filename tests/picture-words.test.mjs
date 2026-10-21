import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePictureCatalog,pictureOptions,pictureProgress,createPictureFeedback} from '../picture-words-core.mjs';
import {resolveWritingLevel} from '../writing-access.mjs';
import {banks} from '../bank-access.mjs';
const root=new URL('../',import.meta.url),catalog=JSON.parse(fs.readFileSync(new URL('picture-words/catalog.json',root)));
assert.equal(validatePictureCatalog(catalog),catalog);assert.equal(catalog.categories.length,27);
const fruit=catalog.categories[0];assert.equal(fruit.name,'水果');assert.equal(fruit.vietnamese,'Trái cây');assert.equal(fruit.words.length,58);
for(const [id,name]of Object.entries({alcohol:'酒',drinks:'饮料',barber:'理发工具','shoe-machinery':'鞋厂设备',food:'食物'})){const category=catalog.categories.find(c=>c.id===id);assert.equal(category.name,name);assert.equal(category.words.length,54);}
const hashes=new Set(),positions=new Set(),files=new Map();
const allWords=catalog.categories.flatMap(c=>c.words);
for(const [word,reading]of Object.entries({'干衣机':'gān yī jī','铺布机':'pū bù jī','包缝机':'bāo féng jī','绷缝机':'bēng féng jī','散粉':'sǎn fěn','绗缝机':'háng féng jī','蒸呢机':'zhēng ní jī','分子模型':'fēn zǐ mó xíng','直发夹':'zhí fà jiā','削笔器':'xiāo bǐ qì','干邑':'gān yì','桑葚酒':'sāng shèn jiǔ','烫发杠':'tàng fà gàng','耐折试验机':'nài zhé shì yàn jī'}))assert.equal(allWords.find(w=>w.chinese===word).pinyin,reading);
assert.equal(catalog.categories.reduce((n,c)=>n+c.words.length,0),1322);
for(const category of catalog.categories){assert.ok(category.words.length>=(category.id.endsWith("-equipment")?16:50)&&category.words.length<=100);}
for(const category of catalog.categories)for(const [i,word]of category.words.entries()){
 const file=files.get(word.image)||fs.readFileSync(new URL(word.image,root));files.set(word.image,file);assert.deepEqual([...file.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.ok(file.readUInt32BE(16)>=1000);assert.ok(file.readUInt32BE(20)>=1000);hashes.add(word.image+':'+(word.sprite?.index??'whole'));
 assert.ok(word.pinyin&&word.vietnamese);if(word.sprite){assert.ok([4,6].includes(word.sprite.columns));assert.ok(word.sprite.index<word.sprite.columns*word.sprite.rows);}
 for(const random of [()=>0,()=>.25,()=>.5,()=>.999]){
  const options=pictureOptions(category,i,random);assert.equal(options.length,4);assert.equal(new Set(options.map(w=>w.id)).size,4);assert.ok(options.some(w=>w.id===word.id));assert.ok(options.every(w=>category.words.includes(w)));if(word.contrastGroup)assert.ok(options.every(w=>w.id===word.id||w.contrastGroup!==word.contrastGroup));positions.add(options.findIndex(w=>w.id===word.id));
 }
}
assert.equal(hashes.size,1322);assert.ok(positions.size>=3);
const source=JSON.parse(fs.readFileSync(new URL('picture-words/source.json',root)));
for(const atlas of source.atlases){
 assert.equal(atlas.words.length,atlas.columns*atlas.rows);
 for(const [i,entry]of atlas.words.entries()){
  const word=allWords.find(w=>w.image===`assets/picture-words/${atlas.id}/atlas.png`&&w.sprite?.index===i);
  assert.ok(word,atlas.id+':'+i);assert.equal(word.chinese,entry.chinese);assert.equal(word.vietnamese,entry.vietnamese);
 }
}

const duplicate=structuredClone(catalog);duplicate.categories[0].words[1].id=duplicate.categories[0].words[0].id;assert.throws(()=>validatePictureCatalog(duplicate),/无效/);
const unsafe=structuredClone(catalog);unsafe.categories[0].words[0].image='https://example.com/unrelated.png';assert.throws(()=>validatePictureCatalog(unsafe),/无效/);
assert.throws(()=>pictureOptions(fruit,100),/足够/);
assert.throws(()=>pictureOptions({words:fruit.words.slice(0,4).map(w=>({...w,contrastGroup:'same'}))},0),/足够/);
assert.equal(pictureProgress('8',10),8);for(const v of [-1,10,'broken',1.5])assert.equal(pictureProgress(v,10),0);
// Password acceptance deliberately matches writing practice, including cross-bank passwords.
for(const bank of banks)assert.doesNotThrow(()=>resolveWritingLevel(bank.password,'hsk1-2'));
assert.throws(()=>resolveWritingLevel(''),/密码/);assert.throws(()=>resolveWritingLevel('wrong'),/密码/);
let now=0,nextId=0,timers=new Map(),advances=0;const changes=[];
const schedule=(fn,delay)=>{const id=++nextId;timers.set(id,{at:now+delay,fn});return id;};
function tick(delta){const end=now+delta;while(true){const next=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;}
const feedback=createPictureFeedback({onChange:s=>changes.push({...s,time:now}),onAdvance:()=>advances++,schedule,unschedule:id=>timers.delete(id)});
assert.equal(feedback.choose(false),true);assert.equal(changes.at(-1).emoji,'😢');assert.equal(feedback.choose(true),false);
tick(999);assert.equal(feedback.phase,'wrong');tick(1);assert.equal(feedback.phase,'ready');assert.equal(changes.at(-1).emoji,'');assert.equal(advances,0);
assert.equal(feedback.choose(true),true);assert.equal(changes.at(-1).emoji,'👍');tick(1000);assert.equal(feedback.phase,'waiting');assert.equal(changes.at(-1).emoji,'');tick(1999);assert.equal(advances,0);tick(1);assert.equal(advances,1);
feedback.reset();feedback.choose(true);tick(1000);feedback.cancel();tick(10000);assert.equal(advances,1);
feedback.reset();feedback.choose(false);feedback.reset();tick(1000);assert.equal(feedback.phase,'ready');
for(const page of ['index.html','homepage-v4.html']){
 const source=fs.readFileSync(new URL(page,root),'utf8');assert.equal((source.match(/id="practice-pictures"/g)||[]).length,1);assert.equal((source.match(/id="picture-practice"/g)||[]).length,1);
}
console.log('通过：27类1322张物品图、同类四选一、写字同款密码、1秒表情+2秒翻页、错误重选、导航取消计时和每个词的普通话播放。');
