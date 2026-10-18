import {resolveBank} from './bank-access.mjs?v=banks-8';
export function resolveReadingAccess(bank,password,exerciseId){
 if(!String(password??'').trim())throw Error('请输入所选题库的密码。 / Vui lòng nhập mật khẩu ngân hàng câu hỏi đã chọn.');
 const route=resolveBank(bank,password);
 if(!String(exerciseId??''))throw Error('请先选择对应的练习题。 / Vui lòng chọn bài luyện tập.');
 return {...route,exerciseId:String(exerciseId)};
}
export function findReadingPassage(catalog,bank,exerciseId){
 if(catalog?.version!==1||!Array.isArray(catalog.passages))throw Error('课文数据格式无效，请刷新重试。');
 const passage=catalog.passages.find(p=>p.bank===bank&&p.exerciseId===exerciseId);
 if(!passage)throw Error('试用版目前开放 HSK1-2 第01课“你好！”和第02课“你叫什么名字？”，请选择这两课之一。 / Bản dùng thử hiện có bài 01 và bài 02 của HSK1-2.');
 const count=[...String(passage.chinese||'')].filter(c=>/\p{Script=Han}/u.test(c)).length;
 if(count!==catalog.lengths?.[bank]||count!==passage.hanziCount||!passage.pinyin||!passage.vietnamese||!passage.title)throw Error('课文数据不完整，请刷新重试。');
 return passage;
}
