import {recordLogin} from './visit-counter.mjs?v=visits15';
import {isTeacherPassword} from './teacher-auth.mjs?v=visits15';
import {bankLabels,loadCatalog,listExercises,saveExercise,catalog,discardDrafts,draftCount,subscribe} from './exercise-store.mjs?v=hsk4-40';
import {validate} from './grading.mjs';
const $=s=>document.querySelector(s);let authenticated=false,attempt=0,uploading=false;
const message=t=>$('#teacher-status').textContent=t;
export function teacherActive(){return $('#user-role').value==='teacher';}
function lock(){authenticated=false;attempt++;$('#teacher-password').value='';$('#teacher-error').textContent='';$('#open-teacher-tools').hidden=true;$('#teacher-auth-state').textContent='';if($('#tools').open)$('#tools').close();}
function requireTeacher(){if(!authenticated||!teacherActive())throw Error('请先完成教师验证。');}
function openTools(){requireTeacher();$('#tools').showModal();}
function updateTargets(){if($('#upload-bank').value==='intro')$('#upload-mode').value='replace';const select=$('#upload-target'),previous=select.value;select.replaceChildren();for(const e of listExercises($('#upload-bank').value)){const o=document.createElement('option');o.value=e.id;o.textContent=e.exercise.title+(e.draft?'（本机草稿）':'');select.append(o);}if(listExercises($('#upload-bank').value).some(e=>e.id===previous))select.value=previous;$('#replace-wrap').hidden=$('#upload-mode').value!=='replace';$('#teacher-draft-count').textContent='待发布草稿：'+draftCount()+' 份';}
$('#user-role').addEventListener('change',()=>{lock();const teacher=teacherActive();$('#teacher-login').hidden=!teacher;$('#student-entry').hidden=teacher;if(teacher)$('#teacher-password').focus();});
async function authenticate(quiet=false){
 if(authenticated){try{await loadCatalog();if(teacherActive())openTools();}catch(e){$('#teacher-error').textContent=e.message;}return;}
 const token=++attempt;const value=$('#teacher-password').value;
 try{const correct=await isTeacherPassword(value);if(token!==attempt||!teacherActive())return;
 if(!correct){if(!quiet)$('#teacher-error').textContent='教师密码不正确，请重新输入。';return;}
 authenticated=true;$('#teacher-password').value='';$('#teacher-error').textContent='';$('#teacher-auth-state').textContent='教师验证通过';$('#open-teacher-tools').hidden=false;
 await loadCatalog();if(token!==attempt||!teacherActive()||!authenticated)return;updateTargets();openTools();recordLogin('teacher');
 }catch(e){if(token===attempt){authenticated=false;$('#open-teacher-tools').hidden=true;$('#teacher-auth-state').textContent='';$('#teacher-error').textContent=e.message;}}
}
$('#teacher-login').addEventListener('submit',e=>{e.preventDefault();authenticate();});
$('#teacher-password').addEventListener('input',()=>{if(authenticated){authenticated=false;$('#open-teacher-tools').hidden=true;$('#teacher-auth-state').textContent='';}$('#teacher-error').textContent='';authenticate(true);});
$('#open-teacher-tools').onclick=async()=>{try{requireTeacher();await loadCatalog();requireTeacher();updateTargets();openTools();}catch(e){$('#teacher-error').textContent=e.message;}};
$('#close-tools').onclick=()=>$('#tools').close();
$('#tools').addEventListener('close',()=>{$('#import').value='';});
for(const [id,label]of Object.entries(bankLabels)){const option=document.createElement('option');option.value=id;option.textContent=label;$('#upload-bank').append(option);}
$('#upload-bank').value='hsk1-2';$('#upload-bank').onchange=updateTargets;$('#upload-mode').onchange=updateTargets;subscribe(updateTargets);
$('#import').onchange=async e=>{
 const file=e.target.files[0];if(!file||uploading)return;uploading=true;$('#import').disabled=true;
 const bank=$('#upload-bank').value,mode=$('#upload-mode').value,target=$('#upload-target').value;
 try{requireTeacher();if(file.size>1000000)throw Error('练习文件不能超过1MB。');
 const exercise=validate(JSON.parse(await file.text()));requireTeacher();
 if(mode==='replace'&&!target)throw Error('请选择要替换的练习。');
 const id=mode==='replace'?target:bank+'-'+crypto.randomUUID();
 const result=saveExercise({id,bank,exercise});
 if(!result.draft)message('该练习与已发布内容一致，未新增重复项。手机打开或刷新网页即可读取已发布题目。');
 else message((result.updated?'已更新同名练习“':'已新增练习“')+exercise.title+'”（本机草稿，手机暂不可见）。请下载题库发布文件并上传GitHub，发布后才能同步到其他设备。');
 }catch(err){message('导入失败：'+err.message);}finally{uploading=false;$('#import').disabled=false;e.target.value='';}
};
$('#export-exercises').onclick=()=>{try{requireTeacher();const data=catalog();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='exercise-catalog.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('已下载 exercise-catalog.json。将它上传到GitHub仓库首页并替换同名文件，等待部署后学生即可看到更新。');}catch(e){message(e.message);}};
$('#discard-exercises').onclick=()=>{try{requireTeacher();if(!confirm('清除本机未发布草稿，恢复网站已发布的题目？'))return;discardDrafts();message('已清除本机草稿，网站已发布的题库不受影响。');}catch(e){message(e.message);}};

