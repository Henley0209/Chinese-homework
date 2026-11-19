export async function homeworkApi(path,{body,signal}={}){
 const config=await fetch('./conversation-config.json',{signal,cache:'no-store'});
 if(!config.ok)throw Error('作业服务配置读取失败。');
 const url=new URL((await config.json()).endpoint);
 if(url.protocol!=='https:')throw Error('作业服务地址无效。');
 url.pathname=path;url.search='';url.hash='';
 const response=await fetch(url,{
  method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
 });
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'作业服务暂不可用。');
 return data;
}
