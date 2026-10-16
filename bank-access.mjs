export const banks=Object.freeze([
 {id:'hsk1-2',label:'HSK1-2',password:'NgaZhu1122',file:'banks/hsk1-2.json'},
 {id:'hsk3',label:'HSK3',password:'NgaZhu1133',file:'banks/hsk3.json'},
 {id:'hsk4',label:'HSK4',password:'NgaZhu1144',file:'banks/hsk4.json'},
 {id:'hsk5',label:'HSK5',password:'NgaZhu1155',file:'banks/hsk5.json'},
 {id:'daily',label:'日常交际',password:'NgaZhu1166',file:'banks/daily.json'},
 {id:'factory',label:'汉语工厂',password:'NgaZhu1177',file:'banks/factory.json'}
]);
export function resolveBank(id,password){
 const code=String(password??'').trim();
 if(!code)return {id:'intro',label:'入门练习',file:'questions.json'};
 const bank=banks.find(b=>b.id===id);
 if(!bank||bank.password!==code)throw Error('密码与所选题库不匹配，请检查题库和密码。留空密码可进入入门练习。 / Mật khẩu không khớp với ngân hàng câu hỏi.');
 return {id:bank.id,label:bank.label,file:bank.file};
}
