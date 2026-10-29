import {zipFiles} from './homework-docx.mjs?v=courseware3';
import {validateCourseware} from './courseware-core.mjs?v=courseware3';
const xml=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const colors={ink:'203B39',green:'1E5B57',orange:'B36A45',muted:'6C7B72'};
function paragraph(text,{size=20,color=colors.ink,bold=false,after=60,before=0,keep=false,center=false,pageBreak=false,lang='zh-CN'}={}){
 return `<w:p><w:pPr>${keep?'<w:keepNext/>':''}<w:keepLines/>${pageBreak?'<w:pageBreakBefore/>':''}<w:spacing w:before="${before}" w:after="${after}" w:line="240" w:lineRule="auto"/>${center?'<w:jc w:val="center"/>':''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:lang w:val="${lang}" w:eastAsia="zh-CN"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}
function triple(t,{prefix='',center=false,title=false,compact=false}={}){
 return paragraph(prefix+t.pinyin,{size:title?28:19,color:colors.orange,after:20,keep:true,center,lang:'en-US'})+paragraph(t.zh.replaceAll('____','（　　）'),{size:title?46:compact?24:24,color:title?colors.green:colors.ink,bold:true,after:20,keep:true,center})+paragraph(t.vi,{size:title?28:19,color:colors.muted,after:compact?50:110,center,lang:'vi-VN'});
}
function illustration(scene,id){
 const col=scene%3,row=Math.floor(scene/3),size=2377440;
 return `<w:p><w:pPr><w:keepNext/><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${size}" cy="${size}"/><wp:docPr id="${id}" name="Dialogue scene ${scene+1}" descr="与本组对话相关的课堂情境图"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="scenes.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImage"/><a:srcRect l="${Math.round(col/3*100000)}" r="${Math.round((2-col)/3*100000)}" t="${row*50000}" b="${(1-row)*50000}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size}" cy="${size}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
function vocabularyTable(words){
 const rows=[];
 for(let i=0;i<words.length;i+=2){rows.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${words.slice(i,i+2).map(w=>`<w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/><w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>${triple(w,{compact:true})}</w:tc>`).join('')}</w:tr>`);}
 return `<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="DDE5DA"/>`).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4800"/><w:gridCol w:w="4800"/></w:tblGrid>${rows.join('')}</w:tbl>`;
}
export async function makeCoursewareDocx(value,{imageBytes}={}){
 const deck=validateCourseware(value);
 if(!imageBytes){const response=await fetch(deck.image);if(!response.ok)throw Error('课件图片读取失败，请稍后重试。');imageBytes=new Uint8Array(await response.arrayBuffer());}
 let body=paragraph(`HSK1-2 · 第${String(deck.number).padStart(2,'0')}课`,{size:20,color:colors.green,bold:true,center:true,keep:true})+triple(deck.title,{center:true,title:true})+paragraph('两组对话，每组300个汉字 · 每组10个生词与5道填空',{size:19,color:colors.muted,center:true,after:120});
 deck.groups.forEach((group,index)=>{
  body+=paragraph(`第${index+1}组 · 对话（300字）`,{size:30,color:colors.green,bold:true,keep:true,before:180,after:100,pageBreak:index>0})+triple(group.title)+illustration(group.scene,index+1)+paragraph(Object.entries(group.roles).map(([id,name])=>`${id}：${name}`).join('　　'),{size:18,color:colors.muted,after:120,keep:true});
  for(const turn of group.dialogue)body+=triple(turn,{prefix:turn.speaker+' · '});
  body+=paragraph(`第${index+1}组 · 生词（10个）`,{size:30,color:colors.green,bold:true,keep:true,pageBreak:true,after:120})+vocabularyTable(group.vocabulary);
  body+=paragraph(`第${index+1}组 · 填空练习（5题）`,{size:28,color:colors.green,bold:true,keep:true,before:200,after:80})+paragraph('请从本组生词中选择合适的词语填空。',{size:19,color:colors.muted,after:100,keep:true});
  group.exercises.forEach((exercise,i)=>{body+=triple(exercise,{prefix:`${i+1}. `});});
 });
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const files={
 '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
 '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/scenes.png"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
 'word/header1.xml':`<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="${ns}">${paragraph('Tiếng Trung Cô Nga　|　HSK1-2 三语课件',{size:16,color:colors.muted,after:80})}</w:hdr>`,
 'word/footer1.xml':`<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="${ns}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="6C7B72"/></w:rPr><w:t>— </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t> —</w:t></w:r></w:p></w:ftr>`,
 'word/media/scenes.png':imageBytes,
 'word/document.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1050" w:right="1050" w:bottom="1050" w:left="1050" w:header="420" w:footer="420"/></w:sectPr></w:body></w:document>`
 };
 return zipFiles(files);
}
