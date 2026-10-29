export const coursewareBanks={'hsk1-2':'HSK1-2','hsk3':'HSK3','hsk4':'HSK4','hsk5':'HSK5','daily':'日常交际','factory':'汉语工厂'};
export const coursewareLevels={'hsk1-2':'从问候、短句到基础情境表达','hsk3':'从日常叙述到连贯表达','hsk4':'从情境交流到说明、比较与讨论','hsk5':'从复杂叙述到观点、理由与深入交流','daily':'从基础生活问答到复杂日常情境','factory':'从岗位词语、操作指令到异常处理与协作沟通'};
export const pilotIds=['hsk1-2-topic-01','hsk1-2-topic-02','hsk1-2-topic-03'];
export const hanziCount=text=>[...text.matchAll(/\p{Script=Han}/gu)].length;
export function validateCourseware(data){
 const triple=t=>t&&['pinyin','zh','vi'].every(k=>typeof t[k]==='string'&&t[k].trim());
 if(!data||!pilotIds.includes(data.id)||!triple(data.title)||!Array.isArray(data.groups)||data.groups.length!==2)throw Error('课件格式无效。');
 for(const g of data.groups){
  if(!triple(g.title)||!Number.isInteger(g.scene)||g.scene<0||g.scene>5||!Array.isArray(g.dialogue)||g.dialogue.some(t=>!triple(t)||!Object.hasOwn(g.roles||{},t.speaker))||g.dialogue.reduce((n,t)=>n+hanziCount(t.zh),0)!==300)throw Error('每组对话必须包含300个汉字，并逐句提供拼音及越南语。');
  if(!Array.isArray(g.vocabulary)||g.vocabulary.length!==10||g.vocabulary.some(t=>!triple(t))||new Set(g.vocabulary.map(t=>t.zh)).size!==10)throw Error('每组需包含10个不同生词。');
  if(!Array.isArray(g.exercises)||g.exercises.length!==5||g.exercises.some(t=>!triple(t)||!triple(t.answer)||!t.zh.includes('____')||!g.vocabulary.some(w=>w.zh===t.answer.zh)))throw Error('每组需包含5道填空题，答案取自本组生词。');
 }
 return data;
}
export function coursewareSlides(deck){
 const slides=[{type:'cover',title:deck.title,scene:deck.groups[0].scene}];
 deck.groups.forEach((group,groupIndex)=>{
  for(let i=0;i<group.dialogue.length;i+=5)slides.push({type:'dialogue',groupIndex,title:group.title,scene:group.scene,roles:group.roles,turns:group.dialogue.slice(i,i+5),page:Math.floor(i/5)+1,pages:Math.ceil(group.dialogue.length/5)});
  slides.push({type:'vocabulary',groupIndex,title:group.title,scene:group.scene,words:group.vocabulary});
  slides.push({type:'exercise',groupIndex,title:group.title,scene:group.scene,exercises:group.exercises});
 });
 return slides;
}
