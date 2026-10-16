// Public aggregate counter only: never send names, passwords, exercise content or cookies.
export const COUNTER_BASE='https://countapi.mileshilliard.com/api/v1';
export const COUNTER_KEY='henley0209_chinese_homework_login_total_20261016_54a619d3';
export function createLoginCounter({fetchFn=globalThis.fetch,render=()=>{},base=COUNTER_BASE,key=COUNTER_KEY,timeout=8000}={}){
 let value=null;const loggedIn=new Set();
 function show(error=false){render({value,error});}
 async function request(action){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const url=base+'/'+action+'/'+encodeURIComponent(key)+'?t='+Date.now();
   const response=await fetchFn(url,{method:action==='hit'?'POST':'GET',mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
   const data=await response.json();
   if(action==='get'&&response.status===404&&data.error==='Key not found')return 0;
   if(!response.ok)throw Error('计数服务暂不可用');
   const count=typeof data.value==='string'&&/^\d+$/.test(data.value)?Number(data.value):data.value;
   if(!Number.isSafeInteger(count)||count<0)throw Error('计数数据格式无效');
   return count;
  }finally{clearTimeout(timer);}
 }
 async function update(action){
  try{const count=await request(action);value=value===null?count:Math.max(value,count);show();return value;}
  catch{show(true);return null;}
 }
 return {
  load:()=>update('get'),
  recordLogin(role){
   if(!['student','teacher'].includes(role)||loggedIn.has(role))return Promise.resolve(value);
   // Mark before sending: retries and concurrent clicks must not submit a second increment.
   loggedIn.add(role);return update('hit');
  },
  resetSession(){loggedIn.clear();},
  current:()=>value
 };
}
let live;
const preview=typeof location!=='undefined'&&new URLSearchParams(location.search).has('appearance-preview');
if(typeof document!=='undefined'){
 const total=document.querySelector('#visit-total'),container=document.querySelector('#visit-counter');
 if(total&&container){
  if(preview){total.textContent='—';container.title='编辑预览不参与访问计数';}
  else{
   live=createLoginCounter({render:({value,error})=>{
    total.textContent=value===null?(error?'暂不可用':'…'):value.toLocaleString('zh-CN');
    container.title=error?'全站计数暂未同步；不影响答题。':'全站累计：学生成功进入练习或教师验证通过计1次；刷新不计数。';
    container.dataset.state=error?'unavailable':'ready';
   }});
   live.load();
   document.querySelector('#user-role')?.addEventListener('change',()=>live.resetSession());
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')live.load();});
   window.addEventListener('pageshow',e=>{if(e.persisted)live.load();});
  }
 }
}
export function recordLogin(role){return live?live.recordLogin(role):Promise.resolve(null);}
