// Public aggregate ratings only; no names, passwords, answers, or cookies are sent.
export const RATING_BASE='https://countapi.mileshilliard.com/api/v1';
export const RATING_KEYS=Object.freeze({like:'henley0209_chinese_homework_rating_like_20261017_f8c2',dislike:'henley0209_chinese_homework_rating_dislike_20261017_f8c2'});
const localKey='qinglan-system-rating-clicks-v1';
export function createRatingCounter({fetchFn=globalThis.fetch,storage,render=()=>{},timeout=8000}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 let local={like:0,dislike:0};try{const saved=JSON.parse(storage?.getItem(localKey)||'{}');for(const kind of Object.keys(local))if(Number.isSafeInteger(saved[kind])&&saved[kind]>=0)local[kind]=saved[kind];}catch{}
 const remote={like:null,dislike:null},pending={like:0,dislike:0},unavailable={like:false,dislike:false},queues={like:Promise.resolve(),dislike:Promise.resolve()};
 function show(){render(Object.fromEntries(Object.keys(local).map(kind=>[kind,{value:unavailable[kind]||(remote[kind]===null&&pending[kind]>0)?local[kind]:remote[kind]===null?null:remote[kind]+pending[kind],local:unavailable[kind]||(remote[kind]===null&&pending[kind]>0),pending:pending[kind]}])));}
 async function request(kind,action){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{
  const response=await fetchFn(RATING_BASE+'/'+action+'/'+RATING_KEYS[kind]+'?t='+Date.now(),{method:action==='hit'?'POST':'GET',mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});const data=await response.json();
  if(action==='get'&&response.status===404&&data.error==='Key not found')return 0;
  const value=typeof data.value==='string'&&/^\d+$/.test(data.value)?Number(data.value):data.value;if(!response.ok||!Number.isSafeInteger(value)||value<0)throw Error('rating counter unavailable');return value;
 }finally{clearTimeout(timer);}}
 async function loadOne(kind){try{const value=await request(kind,'get');remote[kind]=Math.max(remote[kind]??0,value);unavailable[kind]=false;}catch{unavailable[kind]=true;}show();}
 show();return {
  load:()=>Promise.all(Object.keys(local).map(loadOne)),
  click(kind){if(!Object.hasOwn(local,kind))return Promise.reject(Error('Unknown rating'));local[kind]++;try{storage?.setItem(localKey,JSON.stringify(local));}catch{}pending[kind]++;show();
   queues[kind]=queues[kind].then(async()=>{try{const value=await request(kind,'hit');remote[kind]=Math.max(remote[kind]??0,value);unavailable[kind]=false;}catch{unavailable[kind]=true;}finally{pending[kind]--;show();}});return queues[kind];
  }
 };
}
export function initSystemRating(doc=globalThis.document){
 const widget=doc?.querySelector('#system-rating');if(!widget)return;
 const popup=doc.querySelector('#rating-celebration'),image=popup.querySelector('img');let dismiss;
 const preview=new URLSearchParams(globalThis.location?.search||'').has('appearance-preview');
 const counter=createRatingCounter({render:state=>{for(const kind of Object.keys(RATING_KEYS)){const label=widget.querySelector('[data-rating-count="'+kind+'"]'),s=state[kind];label.textContent=s.value===null?'…':(s.local?'本机 ':'')+s.value.toLocaleString('zh-CN');label.title=s.local?'计数服务暂未同步，显示本机累计 / Số lượt trên thiết bị này':'累计点击次数 / Tổng lượt nhấn';label.dataset.scope=s.local?'device':'site';}}});
 function hide(){clearTimeout(dismiss);popup.hidden=true;image.onload=null;image.onerror=null;}
 function celebrate(){clearTimeout(dismiss);const show=()=>{image.onload=null;image.onerror=null;if(doc.hidden)return;popup.hidden=false;dismiss=setTimeout(hide,2000);};if(image.complete)show();else{image.onload=show;image.onerror=show;}}
 for(const kind of Object.keys(RATING_KEYS))widget.querySelector('[data-rating="'+kind+'"]').onclick=()=>{if(!preview)void counter.click(kind);if(kind==='like')celebrate();};
 popup.onclick=hide;globalThis.addEventListener?.('pagehide',hide);if(!preview)void counter.load();else for(const label of widget.querySelectorAll('[data-rating-count]'))label.textContent='—';
 image.loading='eager';
}
if(typeof document!=='undefined')initSystemRating();
