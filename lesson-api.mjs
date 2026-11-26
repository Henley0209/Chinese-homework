import {homeworkApi} from './homework-api.mjs';

export function lessonApi(action,values={}){
 return homeworkApi('/lesson-register',{body:{...values,action}});
}
