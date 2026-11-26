import {homeworkApi} from './homework-api.mjs?v=attendance-status1';

export function lessonApi(action,values={}){
 return homeworkApi('/lesson-register',{body:{...values,action}});
}
