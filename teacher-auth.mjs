// Static UI verification; this is not server authorization.
const teacherDigest='605241b419d122752eb1878fa7b13dee955ec9f4c0e9530fe16491a9976c7120';

export async function isTeacherPassword(value){
 if(typeof value!=='string')return false;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')===teacherDigest;
}
