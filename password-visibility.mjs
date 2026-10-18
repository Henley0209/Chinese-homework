const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOff='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3.2 4M6.2 6.2A23 23 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.1-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
export function initPasswordVisibility(doc=document){
 const controls=new Map();
 function enhance(){
  for(const input of doc.querySelectorAll('input[type="password"],#bank-password,#teacher-password')){
   if(controls.has(input))continue;
   input.type='password';
   const wrapper=doc.createElement('span');wrapper.className='password-field';input.before(wrapper);wrapper.append(input);
   const toggle=doc.createElement('button');toggle.type='button';toggle.className='password-toggle';
   const mask=()=>{input.type='password';update();};
   function update(){const visible=input.type==='text';toggle.innerHTML=visible?eyeOff:eye;toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',visible?'隐藏密码 / Ẩn mật khẩu':'显示密码 / Hiện mật khẩu');toggle.title=toggle.getAttribute('aria-label');}
   toggle.addEventListener('click',event=>{event.preventDefault();const start=input.selectionStart,end=input.selectionEnd;input.type=input.type==='password'?'text':'password';update();input.focus({preventScroll:true});if(start!==null&&end!==null)input.setSelectionRange(start,end);});
   input.addEventListener('input',()=>{if(!input.value)mask();});
   input.form?.addEventListener('reset',mask);
   controls.set(input,mask);wrapper.append(toggle);update();
  }
 }
 enhance();const observer=new MutationObserver(enhance);observer.observe(doc.body,{childList:true,subtree:true});
 const maskAll=()=>{for(const mask of controls.values())mask();};
 doc.addEventListener('practice:enter',maskAll);doc.defaultView?.addEventListener('pagehide',maskAll);
 return {maskAll,disconnect(){observer.disconnect();doc.removeEventListener('practice:enter',maskAll);doc.defaultView?.removeEventListener('pagehide',maskAll);}};
}
if(typeof document!=='undefined')initPasswordVisibility();
