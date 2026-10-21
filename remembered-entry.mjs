import {banks} from './bank-access.mjs?v=banks-8';
const key='practice-remembered-entry-v1';
export function readEntry(storage){
 try{const value=JSON.parse(storage.getItem(key));if(!value||typeof value!=='object')return {};
 return {name:typeof value.name==='string'?value.name.slice(0,50):'',bank:banks.some(b=>b.id===value.bank)?value.bank:'hsk1-2',password:banks.some(b=>b.password===value.password)?value.password:''};
 }catch{return {};}
}
export function writeEntry(storage,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function initRememberedEntry(target=document){
 const name=target.querySelector('[name=student]'),bank=target.querySelector('#question-bank'),password=target.querySelector('#bank-password');
 if(!name||!bank||!password)return ()=>{};
 let storage;try{storage=window.localStorage;}catch{return ()=>{};}
 const saved=readEntry(storage);if(saved.name)name.value=saved.name;if(saved.bank)bank.value=saved.bank;if(saved.password)password.value=saved.password;
 function save(){
  const current=readEntry(storage),code=password.value.trim();
  return writeEntry(storage,{name:name.value.trim().slice(0,50),bank:bank.value,password:!code?'':banks.some(b=>b.password===code)?code:current.password||''});
 }
 name.addEventListener('input',save);password.addEventListener('input',save);bank.addEventListener('change',save);
 const row=target.createElement('div');row.className='remembered-entry note';
 const hint=target.createElement('span');hint.textContent='姓名和密码自动保存在此浏览器，共用设备请清除。 / Tên và mật khẩu được lưu trên trình duyệt này. Hãy xóa khi dùng thiết bị chung.';
 const clear=target.createElement('button');clear.type='button';clear.className='quiet';clear.textContent='清除保存信息 / Xóa thông tin đã lưu';
 clear.onclick=()=>{try{storage.removeItem(key);}catch{}name.value='';password.value='';hint.textContent='已清除本机保存的姓名和密码。 / Đã xóa tên và mật khẩu đã lưu.';};
 row.append(hint,clear);target.querySelector('.start-row')?.before(row);
 return save;
}
