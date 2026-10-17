import {banks} from './bank-access.mjs?v=banks-8';
export const writingLevels=Object.freeze(['hsk1-2','hsk3','hsk4']);
export function resolveWritingLevel(password,selected='hsk1-2'){
 const code=String(password??'').trim();
 if(!code)throw Error('请输入题库密码 / Vui lòng nhập mật khẩu ngân hàng câu hỏi');
 const match=banks.find(bank=>bank.password===code);
 if(!match)throw Error('题库密码不正确，请重新输入 / Mật khẩu không đúng');
 return writingLevels.includes(selected)?selected:writingLevels.includes(match.id)?match.id:'hsk1-2';
}
