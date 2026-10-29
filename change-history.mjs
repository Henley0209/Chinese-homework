export function validateHistory(data){
 if(!data||!Array.isArray(data.entries)||data.entries.length>10000)throw Error('变更记录格式无效');
 const seen=new Set();
 const entries=data.entries.map((e,index)=>{
  if(e.version!=='V'+String(index+1).padStart(4,'0')||seen.has(e.version)||!Number.isFinite(Date.parse(e.updatedAt))||!Array.isArray(e.changes)||!e.changes.length||e.changes.some(s=>typeof s!=='string'||!s.trim()))throw Error('变更记录版本或内容无效');
  seen.add(e.version);return e;
 });
 return entries;
}
export function initChangeHistory({requireTeacher}){
 const tools=document.querySelector('#tools');if(!tools)return;
 const button=document.createElement('button');button.type='button';button.className='quiet';button.textContent='变更记录';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','teacher-change-history');
 const panel=document.createElement('section');panel.id='teacher-change-history';panel.className='teacher-change-history';panel.hidden=true;panel.setAttribute('aria-label','网站变更记录');
 const heading=document.createElement('h3');heading.textContent='变更记录';const status=document.createElement('p');status.setAttribute('role','status');
 const label=document.createElement('label');label.textContent='查找版本或更新内容';const search=document.createElement('input');search.type='search';search.placeholder='例如 V0001、作业、拼音';label.append(search);
 const list=document.createElement('div');list.className='change-history-list';panel.append(heading,status,label,list);
 tools.querySelector('.section-top').after(button,panel);let entries=null,loading=false;
 const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 function render(){
  const query=search.value.trim().toLowerCase();const filtered=entries.filter(e=>/^v\d{4,}$/i.test(query)?e.version.toLowerCase()===query:(e.version+' '+e.changes.join(' ')).toLowerCase().includes(query));list.replaceChildren();
  status.textContent=`当前版本 ${entries.at(-1)?.version||'—'} · 共 ${entries.length} 条，显示 ${filtered.length} 条。时间为 UTC+7；历史记录根据仓库提交回填。`;
  for(const entry of [...filtered].reverse()){
   const item=document.createElement('article'),title=document.createElement('h4'),time=document.createElement('time'),changes=document.createElement('ul');
   title.textContent=entry.version;time.dateTime=entry.updatedAt;time.textContent='更新时间：'+date.format(new Date(entry.updatedAt));
   for(const text of entry.changes){const li=document.createElement('li');li.textContent=text;changes.append(li);}item.append(title,time,changes);list.append(item);
  }
 }
 search.addEventListener('input',()=>{if(entries)render();});
 button.onclick=async()=>{
  try{
   requireTeacher();panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(panel.hidden)return;
   if(entries){render();return;}if(loading)return;loading=true;status.textContent='正在读取变更记录…';
   const response=await fetch('./change-history.json?v=homework4',{cache:'no-store'});if(!response.ok)throw Error('变更记录加载失败，请再次点击重试。');
   entries=validateHistory(await response.json());requireTeacher();render();
  }catch(e){status.textContent=e.message;}finally{loading=false;}
 };
 document.querySelector('#user-role').addEventListener('change',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');});
}
