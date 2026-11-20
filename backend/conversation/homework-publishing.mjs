import {isTeacherPassword} from '../../teacher-auth.mjs';
import {validateQuestions,maxHomeworkQuestions} from '../../homework-core.mjs';
import {grade} from '../../grading.mjs';

export async function handlePublishedHomework(path,request,env,json,readBytes){
 if(!env.PUBLISHED_HOMEWORK)return json({error:'作业发布服务尚未配置。'},503);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'需要JSON'},415);
 let body;
 try{body=JSON.parse(new TextDecoder().decode(await readBytes(request,400000)));}
 catch{return json({error:'请求过大或格式无效。'},400);}
 if(!body||typeof body!=='object')return json({error:'请求格式无效。'},400);

 let id=body.id,payload;
 if(path==='/homework-publish'){
  if(typeof body.password!=='string'||body.password.length>100||!await isTeacherPassword(body.password)){
   return json({error:'教师密码不正确，请重新验证。'},401);
  }
  const {title,bank,questions}=body;
  if(typeof title!=='string'||!title.trim()||title.length>200||
   typeof bank!=='string'||!bank.trim()||bank.length>40||
   !Array.isArray(questions)||!questions.length||questions.length>maxHomeworkQuestions){
   return json({error:'请填写作业标题并提供有效题目。'},400);
  }
  try{payload={title:title.trim(),bank,...(body.showPinyin===true?{showPinyin:true}:{}),questions:questions.map(q=>validateQuestions([q],q?.kind,1)[0])};}
  catch(error){return json({error:error.message},400);}
  id=crypto.randomUUID();
 }else if(typeof id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id)){
  return json({error:'作业链接无效。'},400);
 }
 try{
  const store=env.PUBLISHED_HOMEWORK.get(env.PUBLISHED_HOMEWORK.idFromName(id));
  const response=await store.fetch('https://published-homework'+path,{
   method:'POST',body:JSON.stringify(payload??{answers:body.answers})
  });
  if(path==='/homework-publish'&&response.ok)return json({id},201);
  return json(await response.json(),response.status);
 }catch{return json({error:'作业服务暂不可用，请重试。'},503);}
}

export class PublishedHomework {
 constructor(state){this.storage=state.storage;}

 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path==='/homework-publish'){
   const paper=await request.json();
   const saved=await this.storage.transaction(async storage=>{
    if(await storage.get('paper'))return false;
    await storage.put('paper',paper);
    return true;
   });
   return saved?Response.json({}, {status:201}):Response.json({error:'发布冲突，请重试。'},{status:409});
  }

  const paper=await this.storage.get('paper');
  if(!paper)return Response.json({error:'找不到这份作业，请核对链接。'},{status:404});

  if(path==='/homework-open'){
   const {title,bank,questions,showPinyin}=paper;
   return Response.json({title,bank,...(showPinyin?{showPinyin:true}:{}),questions:questions.map(({kind,text,options})=>({kind,text,options}))});
  }

  const {answers}=await request.json();
  if(!Array.isArray(answers)||answers.length!==paper.questions.length||
   answers.some(answer=>typeof answer!=='string'||answer.length>600)){
   return Response.json({error:'答题内容无效。'},{status:400});
  }

  // Translation can have multiple valid wordings, so show the reference without scoring it.
  const questions=paper.questions.flatMap((q,id)=>q.kind==='translation'?[]:[{id,points:2,answers:[q.answer]}]);
  const normalizeOrder=value=>value.replace(/[\p{P}\s]/gu,'');
  const submitted=answers.map((answer,i)=>paper.questions[i].kind==='order'?normalizeOrder(answer):answer);
  for(const question of questions){
   if(paper.questions[question.id].kind==='order')question.answers=question.answers.map(normalizeOrder);
  }
  const {score,total,details}=grade({questions},submitted);
  const graded=new Map(details.map(d=>[d.id,d.correct]));
  return Response.json({score,total,details:paper.questions.map(({answer,explanation},i)=>({
   answer,explanation,correct:graded.get(i)??null
  }))});
 }
}
