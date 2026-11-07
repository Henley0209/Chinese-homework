export const coursewareBanks={'hsk1-2':'HSK1-2','hsk3':'HSK3','hsk4':'HSK4','hsk5':'HSK5','daily':'日常交际','factory':'汉语工厂'};
export const coursewareLevels={'hsk1-2':'从问候、短句到基础情境表达','hsk3':'从日常叙述到连贯表达','hsk4':'从情境交流到说明、比较与讨论','hsk5':'从复杂叙述到观点、理由与深入交流','daily':'从基础生活问答到复杂日常情境','factory':'从岗位词语、操作指令到异常处理与协作沟通'};
export const pilotIds=['hsk1-2-topic-01','hsk1-2-topic-02','hsk1-2-topic-03'];
export const coursewareBrand='Tiếng Trung Cô Nga -Zalo:0966795638';
export const hanziCount=text=>[...text.matchAll(/\p{Script=Han}/gu)].length;
export function validateCourseware(data){
 const triple=t=>t&&['pinyin','zh','vi'].every(k=>typeof t[k]==='string'&&t[k].trim());
 if(!data||!pilotIds.includes(data.id)||!triple(data.title)||!Array.isArray(data.groups)||data.groups.length!==2)throw Error('课件格式无效。');
 const lesson=b=>b&&typeof b.title?.zh==='string'&&typeof b.title?.vi==='string'&&Array.isArray(b.items)&&b.items.length>0&&b.items.length<=30&&b.items.every(t=>typeof t.zh==='string'&&t.zh.trim()&&typeof t.vi==='string'&&typeof t.pinyin==='string')&&(b.scene===undefined||Number.isInteger(b.scene)&&b.scene>=0&&b.scene<=5);
 if(data.objectives&&(!Array.isArray(data.objectives)||!lesson({title:{zh:'目标',vi:'Mục tiêu'},items:data.objectives})))throw Error('学习目标格式无效。');
 for(const key of ['warmup','communication','introduction','culture','homework'])if(data[key]&&!lesson(data[key]))throw Error('教学栏目格式无效：'+key);
 if(data.practice&&(!Array.isArray(data.practice)||!data.practice.every(lesson)))throw Error('综合练习格式无效。');
 for(const g of data.groups){
  if(g.grammar&&(!Array.isArray(g.grammar)||!g.grammar.every(lesson)))throw Error('语法讲解格式无效。');
  if(g.comprehension&&!lesson(g.comprehension))throw Error('课文理解格式无效。');
  if(!triple(g.title)||!Number.isInteger(g.scene)||g.scene<0||g.scene>5||!Array.isArray(g.dialogue)||g.dialogue.some(t=>!triple(t)||!Object.hasOwn(g.roles||{},t.speaker))||(data.schemaVersion===2?(g.dialogue.length<1||g.dialogue.length>40||g.dialogue.some(t=>t.zh.length>120||t.pinyin.length>600||t.vi.length>600)):g.dialogue.reduce((n,t)=>n+hanziCount(t.zh),0)!==300))throw Error('对话长度或格式无效，须逐句提供拼音、汉字及越南语。');
  if(!Array.isArray(g.vocabulary)||(data.schemaVersion===2?(g.vocabulary.length<1||g.vocabulary.length>20):g.vocabulary.length!==10)||g.vocabulary.some(t=>!triple(t))||new Set(g.vocabulary.map(t=>t.zh)).size!==g.vocabulary.length)throw Error('每组需包含不同的生词，并提供拼音及越南语。');
  if(!Array.isArray(g.exercises)||g.exercises.length!==5||g.exercises.some(t=>!triple(t)||!triple(t.answer)||(t.zh.match(/____/g)||[]).length!==1||!g.vocabulary.some(w=>w.zh===t.answer.zh)))throw Error('每组需包含5道填空题，答案取自本组生词。');
 }
 return data;
}
// Shared pagination keeps browser, PPT and Word on the same teaching sequence.
export function coursewareSlides(deck){
 validateCourseware(deck);
 const slides=[{type:'cover',title:deck.title,scene:deck.groups[0].scene}];
 const lesson=block=>{
  const chunks=[];let chunk=[],weight=0;
  for(const item of block.items){
   const n=Math.max(1,Math.ceil(item.zh.length/32))+Math.ceil(item.vi.length/70)+(item.pinyin?1:0);
   if(chunk.length&&(chunk.length===3||weight+n>9)){chunks.push(chunk);chunk=[];weight=0;}
   chunk.push(item);weight+=n;
  }
  if(chunk.length)chunks.push(chunk);
  chunks.forEach((items,i)=>slides.push({type:'lesson',title:block.title,scene:block.scene,items,page:i+1,pages:chunks.length}));
 };
 if(deck.objectives)lesson({title:{zh:'学习目标',vi:'Mục tiêu'},items:deck.objectives});
 if(deck.warmup)lesson(deck.warmup);
 deck.groups.forEach((group,groupIndex)=>{
  // Long turns get a page of their own, rather than overflowing a fixed five-row layout.
  const chunks=[];let chunk=[],weight=0;
  for(const turn of group.dialogue){
   const n=Math.max(Math.ceil(turn.pinyin.length/88),Math.ceil(turn.zh.length/24),Math.ceil(turn.vi.length/88));
   if(chunk.length&&(chunk.length===3||weight+n>4)){chunks.push(chunk);chunk=[];weight=0;}
   chunk.push(turn);weight+=n;
  }
  if(chunk.length)chunks.push(chunk);
  chunks.forEach((turns,i)=>slides.push({type:'dialogue',groupIndex,title:group.title,scene:group.scene,roles:group.roles,turns,page:i+1,pages:chunks.length}));
  for(let i=0;i<group.vocabulary.length;i+=5)slides.push({type:'vocabulary',groupIndex,title:group.title,scene:group.scene,words:group.vocabulary.slice(i,i+5),page:Math.floor(i/5)+1,pages:Math.ceil(group.vocabulary.length/5)});
  if(group.comprehension)lesson(group.comprehension);
  for(const block of group.grammar||[])lesson(block);
  slides.push({type:'exercise',groupIndex,title:group.title,scene:group.scene,exercises:group.exercises});
 });
 for(const block of deck.practice||[])lesson(block);
 for(const key of ['communication','introduction','culture','homework'])if(deck[key])lesson(deck[key]);
 return slides;
}
