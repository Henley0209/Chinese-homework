import {paperLines} from './homework-core.mjs?v=homework4';
const encoder=new TextEncoder();
const xml=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
// A standards-compliant ZIP using stored entries; no network or external library needed.
export function zipFiles(files){
 const chunks=[],central=[];let offset=0,centralSize=0;
 const header=(length,values)=>{const b=new Uint8Array(length),v=new DataView(b.buffer);for(const [at,size,value]of values)size===2?v.setUint16(at,value,true):v.setUint32(at,value,true);return b;};
 for(const [path,text]of Object.entries(files)){
  const name=encoder.encode(path),data=text instanceof Uint8Array?text:encoder.encode(text),crc=crc32(data);
  const local=header(30,[[0,4,0x04034b50],[4,2,20],[6,2,0x800],[14,4,crc],[18,4,data.length],[22,4,data.length],[26,2,name.length]]);
  chunks.push(local,name,data);
  central.push(header(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,0x800],[16,4,crc],[20,4,data.length],[24,4,data.length],[28,2,name.length],[42,4,offset]]),name);
  centralSize+=46+name.length;offset+=30+name.length+data.length;
 }
 return new Blob([...chunks,...central,header(22,[[0,4,0x06054b50],[8,2,Object.keys(files).length],[10,2,Object.keys(files).length],[12,4,centralSize],[16,4,offset]])],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
export function makeDocx(paper,answers=false){
 const paragraphs=paperLines(paper,answers).map(p=>`<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="宋体" w:hAnsi="Times New Roman"/>${p.bold?'<w:b/>':''}<w:sz w:val="${p.size||24}"/></w:rPr>${p.text.split('\n').map(t=>`<w:t xml:space="preserve">${xml(t)}</w:t>`).join('<w:br/>')}</w:r></w:p>`).join('');
 return zipFiles({
 '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
 '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/document.xml':`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`
 });
}
