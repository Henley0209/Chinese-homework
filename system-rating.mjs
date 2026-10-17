// Shared anonymous totals only; never send student information or cookies.
export const RATING_BASE='https://countapi.mileshilliard.com/api/v1';
export const RATING_KEYS=Object.freeze({like:'henley0209_chinese_homework_rating_like_20261017_f8c2',dislike:'henley0209_chinese_homework_rating_dislike_20261017_f8c2',dislikeUndo:'henley0209_chinese_homework_rating_dislike_undo_20261017_f8c2'});
export const UNDO_WINDOW=60*60*1000;
const receiptKey='qinglan-rating-dislike-receipts-v2',cacheKey='qinglan-rating-shared-cache-v2';
export function createRatingCounter({fetchFn=globalThis.fetch,storage,render=()=>{},timeout=8000,now=Date.now,withLock=fn=>fn()}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 let remote={like:null,dislike:null,dislikeUndo:null},busy=0,stale=false,queue=Promise.resolve(),memoryReceipts=[];
 try{const cache=JSON.parse(storage?.getItem(cacheKey)||'{}');for(const k of Object.keys(remote))if(Number.isSafeInteger(cache[k])&&cache[k]>=0)remote[k]=cache[k];}catch{}
 function receipts(){try{const r=JSON.parse(storage?.getItem(receiptKey)||JSON.stringify(memoryReceipts));return Array.isArray(r)?r.filter(t=>Number.isFinite(t)&&t<=now()&&now()-t<UNDO_WINDOW):[];}catch{return memoryReceipts.filter(t=>t<=now()&&now()-t<UNDO_WINDOW);}}
 function saveReceipts(r){memoryReceipts=r;try{storage?.setItem(receiptKey,JSON.stringify(r));}catch{}}
 function cache(){try{storage?.setItem(cacheKey,JSON.stringify(remote));}catch{}}
 function show(){const r=receipts();render({like:{value:remote.like,stale},dislike:{value:remote.dislike===null||remote.dislikeUndo===null?null:Math.max(0,remote.dislike-remote.dislikeUndo),stale},busy:busy>0,canUndo:r.length>0,undoCount:r.length,undoUntil:r.length?Math.max(...r)+UNDO_WINDOW:null,stale});}
 async function request(kind,action){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{
  const response=await fetchFn(RATING_BASE+'/'+action+'/'+RATING_KEYS[kind]+'?t='+now(),{method:action==='hit'?'POST':'GET',mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});const data=await response.json();
  if(action==='get'&&response.status===404&&data.error==='Key not found')return 0;
  const value=typeof data.value==='string'&&/^\d+$/.test(data.value)?Number(data.value):data.value;
  if(!response.ok||!Number.isSafeInteger(value)||value<0)throw Error('rating counter unavailable');return value;
 }finally{clearTimeout(timer);}}
 async function refresh(){try{const values=await Promise.all(Object.keys(remote).map(async k=>[k,await request(k,'get')]));remote=Object.fromEntries(values);stale=false;cache();}catch{stale=true;}show();}
 function enqueue(fn){const task=queue.then(fn);queue=task.catch(()=>{});return task;}
 async function mutate(kind,undo=false){busy++;show();try{return await withLock(async()=>{
  const r=receipts();if(undo&&!r.length)return false;
  const clickedAt=now();remote[kind]=await request(kind,'hit');stale=false;
  if(kind==='dislike'){r.push(clickedAt);saveReceipts(r);}else if(undo){r.pop();saveReceipts(r);}
  cache();await refresh();return true;
 });}catch{stale=true;return false;}finally{busy--;show();}}
 show();return {load:()=>enqueue(refresh),refreshEligibility:show,
  click(kind){if(!['like','dislike'].includes(kind))return Promise.reject(Error('Unknown rating'));return enqueue(()=>mutate(kind));},
  undoDislike:()=>enqueue(()=>mutate('dislikeUndo',true))};
}
export function initSystemRating(doc=globalThis.document){
 const widget=doc?.querySelector('#system-rating');if(!widget)return;
 const rain=doc.querySelector('#rating-celebration'),undo=widget.querySelector('[data-rating-undo]'),status=widget.querySelector('.rating-status');let rainfall,dismiss,expiry;
 const preview=new URLSearchParams(globalThis.location?.search||'').has('appearance-preview');
 const counter=createRatingCounter({withLock:fn=>globalThis.navigator?.locks?globalThis.navigator.locks.request('qinglan-rating-mutation',fn):fn(),render:state=>{
  for(const kind of ['like','dislike']){const label=widget.querySelector('[data-rating-count="'+kind+'"]'),s=state[kind];label.textContent=s.value===null?'…':s.value.toLocaleString('zh-CN');label.title=s.stale?'等待网络同步 / Đang chờ đồng bộ':'全站累计 / Tổng trên mọi thiết bị';label.dataset.scope='site';widget.querySelector('[data-rating="'+kind+'"]').disabled=state.busy;}
  clearTimeout(expiry);if(state.canUndo)expiry=setTimeout(()=>counter.refreshEligibility(),Math.max(1,state.undoUntil-Date.now()+1));
  undo.hidden=!state.canUndo;undo.disabled=state.busy;undo.title='1小时内可撤销本设备的心碎评价 / Hủy trong 1 giờ trên thiết bị này';
  status.textContent=state.stale?'暂未同步，请稍后重试 / Chưa đồng bộ, hãy thử lại':state.busy?'正在同步… / Đang đồng bộ…':state.canUndo?'1小时内可撤销 / Có thể hủy trong 1 giờ':'';
 }});
 function hide(){clearInterval(rainfall);clearTimeout(dismiss);rain.hidden=true;rain.replaceChildren();}
 function celebrate(){
  hide();if(doc.hidden)return;rain.hidden=false;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function drop(count){for(let i=0;i<count;i++){const heart=doc.createElement('span');heart.textContent='❤️';heart.style.cssText=`left:${Math.random()*96}%;font-size:${14+Math.random()*19}px;--drift:${Math.random()*80-40}px;--turn:${Math.random()*90-45}deg;animation-duration:${1.3+Math.random()*.7}s`;heart.addEventListener('animationend',()=>heart.remove(),{once:true});rain.append(heart);}}
  drop(8);if(!reduced)rainfall=setInterval(()=>drop(4),120);
  dismiss=setTimeout(hide,4000);
 }

 for(const kind of ['like','dislike'])widget.querySelector('[data-rating="'+kind+'"]').onclick=()=>{if(!preview)void counter.click(kind);if(kind==='like')celebrate();};
 undo.onclick=()=>{if(!preview)void counter.undoDislike();};
 function refresh(){counter.refreshEligibility();if(!preview&&!doc.hidden&&!widget.closest('[hidden]'))void counter.load();}
 globalThis.addEventListener?.('pagehide',hide);globalThis.addEventListener?.('pageshow',refresh);globalThis.addEventListener?.('focus',refresh);globalThis.addEventListener?.('online',refresh);globalThis.addEventListener?.('storage',event=>{if([receiptKey,cacheKey].includes(event.key))refresh();});doc.addEventListener('visibilitychange',()=>{if(doc.hidden)hide();else refresh();});
 setInterval(refresh,15000);if(!preview)void counter.load();else for(const label of widget.querySelectorAll('[data-rating-count]'))label.textContent='—';
}
if(typeof document!=='undefined')initSystemRating();
