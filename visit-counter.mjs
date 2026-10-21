// Public totals and the display names explicitly used by the visitor ticker only.
// Never send passwords, answers, grades, or cookies to the counter service.
export const COUNTER_BASE='https://countapi.mileshilliard.com/api/v1';
// Preserve the site's existing total; change only how future visits are counted.
export const COUNTER_KEY='henley0209_chinese_homework_login_total_20261016_54a619d3';
export const USER_PREFIX='henley0209_chinese_homework_named_visits_20261021_v1';
export const normalizeName=name=>String(name||'').normalize('NFKC').trim().replace(/\s+/gu,' ').slice(0,50);
export async function nameKey(name){
 const bytes=new TextEncoder().encode(normalizeName(name).toLowerCase());
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
// CountAPI supports integer values. Encode the PUBLIC display-name index as an
// integer; parse raw decimal strings to avoid JSON Number rounding of Unicode names.
export function encodeName(name){const hex=[...new TextEncoder().encode(normalizeName(name))].map(b=>b.toString(16).padStart(2,'0')).join('');return BigInt('0x01'+hex).toString();}
export function decodeName(value){
 let hex=BigInt(value).toString(16);if(hex.length%2)hex='0'+hex;
 if(!hex.startsWith('01')||hex.length>402)throw Error('Invalid name index');
 const bytes=Uint8Array.from(hex.slice(2).match(/.{2}/g)||[],h=>parseInt(h,16));
 const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(!name||normalizeName(name)!==name)throw Error('Invalid display name');return name;
}
export function createCounterTransport({fetchFn=globalThis.fetch,base=COUNTER_BASE,timeout=8000,spacing=220}={}){
 let queue=Promise.resolve(),last=0;
 return function request(action,key,value){
  const job=queue.then(async()=>{
   const wait=spacing-(Date.now()-last);if(wait>0)await new Promise(r=>setTimeout(r,wait));last=Date.now();
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{
    const url=new URL(base+'/'+action+'/'+encodeURIComponent(key));url.searchParams.set('t',Date.now());if(action==='set')url.searchParams.set('value',String(value));
    const response=await fetchFn(url.href,{method:action==='hit'?'POST':'GET',mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
    const raw=await response.text();
    if(action==='get'&&response.status===404&&JSON.parse(raw).error==='Key not found')return null;
    if(!response.ok)throw Error('Counter service unavailable');
    const match=raw.match(/"value"\s*:\s*(?:"(\d+)"|(\d+))/);if(!match)throw Error('Invalid counter data');
    return match[1]||match[2];
   }finally{clearTimeout(timer);}
  });queue=job.catch(()=>{});return job;
 };
}
const countOf=value=>{const n=Number(value||0);if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid count');return n;};
export function createVisitCounter({request=createCounterTransport(),key=COUNTER_KEY,prefix=USER_PREFIX,render=()=>{},renderUsers=()=>{},hashName=nameKey,pageSize=20}={}){
 let value=null,opened,identified,userTotal=0,cursor=1;const labels=new Map(),rows=new Map();let refreshing;
 function show(error=false){render({value,error});}
 function merge(n){value=value===null?n:Math.max(value,n);show();return value;}
 async function total(action){try{return merge(countOf(await request(action,key)));}catch{show(true);return null;}}
 const userCounter=id=>prefix+'_count_'+id;
 async function recordName(name){
  name=normalizeName(name);if(!name)return null;
  if(identified)return identified;
  // Reserve this page's attribution before any async work; input changes and
  // multiple form submissions cannot count this page under a second name.
  identified=(async()=>{
   try{
    const id=await hashName(name),count=countOf(await request('hit',userCounter(id)));
    rows.set(id,{name,count});renderUsers({rows:[...rows.values()],error:false});
    const slotKey=prefix+'_slot_'+id;let slot=await request('get',slotKey);
    if(!slot){
     slot=await request('hit',prefix+'_users');
     await request('set',prefix+'_name_'+slot,encodeName(name));
     await request('set',slotKey,slot);
    }
    labels.set(countOf(slot),{id,name});return count;
   }catch{renderUsers({rows:[...rows.values()],error:true});return null;}
  })();return identified;
 }
 async function refreshUsers(){
  if(refreshing)return refreshing;
  refreshing=(async()=>{
   try{
    userTotal=countOf(await request('get',prefix+'_users'));
    if(cursor>userTotal)cursor=1;
    // Rotate through the complete registry, rather than showing just this browser
    // or capping the list to the most recent users. Duplicate concurrent registry
    // entries merge by the same name hash and never duplicate the person's count.
    const end=Math.min(userTotal,cursor+pageSize-1);
    for(let i=cursor;i<=end;i++){
     let label=labels.get(i);
     if(!label){const encoded=await request('get',prefix+'_name_'+i);if(!encoded)continue;const name=decodeName(encoded);label={name,id:await hashName(name)};labels.set(i,label);}
     const count=countOf(await request('get',userCounter(label.id)));if(count)rows.set(label.id,{name:label.name,count});
    }
    cursor=end>=userTotal?1:end+1;
    renderUsers({rows:[...rows.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),error:false});
   }catch{renderUsers({rows:[...rows.values()],error:true});}
   finally{refreshing=null;}
  })();return refreshing;
 }
 return {open(name){if(!opened)opened=(async()=>{await total('hit');if(normalizeName(name))await recordName(name);return value;})();return opened;},load:()=>total('get'),recordName,refreshUsers,current:()=>value};
}
export function mountVisitCounter(doc=globalThis.document,win=globalThis.window){
 const total=doc?.querySelector('#visit-total'),container=doc?.querySelector('#visit-counter'),track=doc?.querySelector('#visit-users-track'),status=doc?.querySelector('#visit-users-status');
 if(!total||!container)return;
 if(new URLSearchParams(win.location.search).has('appearance-preview')){total.textContent='—';if(status)status.textContent='编辑预览不计数';return;}
 const live=createVisitCounter({render:({value,error})=>{
  total.textContent=value===null?(error?'暂不可用':'…'):value.toLocaleString('zh-CN');container.title=error?'访问次数暂未同步；不影响答题。':'每次打开或刷新网页计1次；进入练习、切换题目和切回标签不重复计数。';container.dataset.state=error?'unavailable':'ready';
 },renderUsers:({rows,error})=>{
  if(!track)return;track.replaceChildren();
  for(let copy=0;copy<2;copy++){
   const group=doc.createElement('span');group.className='visit-users-group';if(copy)group.setAttribute('aria-hidden','true');
   for(const row of rows){const item=doc.createElement('span');item.className='visit-user';item.textContent=`${row.name} · 累计访问 ${row.count.toLocaleString('zh-CN')} 次`;group.append(item);}
   track.append(group);
  }
  track.style.setProperty('--visit-scroll-duration',Math.max(5,rows.length*3)+'s');
  if(status)status.textContent=error?'用户次数暂未完全同步 / Chưa đồng bộ đầy đủ':rows.length?'按姓名累计 · 自动向上循环 / Theo tên · Tự động cuộn lên':'输入姓名后计入个人累计 / Nhập tên để ghi nhận lượt cá nhân';
 }});
 let saved='';try{saved=normalizeName(JSON.parse(win.localStorage.getItem('practice-remembered-entry-v1')||'{}').name);}catch{}
 const input=doc.querySelector('[name=student]');if(!saved)saved=normalizeName(input?.value);
 void live.open(saved).then(()=>live.refreshUsers());
 const identify=()=>{const name=normalizeName(input?.value);if(name)void live.recordName(name).then(()=>live.refreshUsers());};
 input?.addEventListener('change',identify);input?.addEventListener('blur',identify);
 doc.querySelector('#identity')?.addEventListener('submit',identify);
 let timer,last=0;
 function refresh(){if(doc.visibilityState==='hidden'||Date.now()-last<15000)return;last=Date.now();void live.load();void live.refreshUsers();}
 doc.addEventListener('visibilitychange',refresh);win.addEventListener('pageshow',refresh);win.addEventListener('online',refresh);
 function startTimer(){win.clearInterval(timer);timer=win.setInterval(refresh,45000);}
 startTimer();win.addEventListener('pagehide',()=>win.clearInterval(timer));win.addEventListener('pageshow',event=>{if(event.persisted)startTimer();});
 return live;
}
if(typeof document!=='undefined')mountVisitCounter();
