// Read only the XML entries needed for Office documents; bound decompression.
export async function officeXml(buffer,extension){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer),decode=new TextDecoder();
 const fail=()=>{throw Error('课件文件损坏或格式无效，请重新导出。');};
 let end=bytes.length-22;
 for(;end>=Math.max(0,bytes.length-65557);end--)if(view.getUint32(end,true)===0x06054b50)break;
 if(end<0||view.getUint32(end,true)!==0x06054b50)fail();
 let offset=view.getUint32(end+16,true),total=0;const entries=[];
 for(let i=0;i<view.getUint16(end+10,true);i++){
  if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)fail();
  const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true),nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const name=decode.decode(bytes.subarray(offset+46,offset+46+nameLength));offset+=46+nameLength+extra+comment;
  if(!(extension==='pptx'?/^ppt\/slides\/slide\d+\.xml$/.test(name):name==='word/document.xml'))continue;
  total+=size;if(total>10*1024*1024)throw Error('课件解压后的文本过大，请拆分后上传。');
  if(flags&1||![0,8].includes(method)||local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)fail();
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);if(start+compressed>bytes.length)fail();
  let data=bytes.subarray(start,start+compressed);
  if(method===8){
   let stream;try{stream=new DecompressionStream('deflate-raw');}catch{throw Error('当前浏览器不支持Office课件解析，请更新浏览器或另存为TXT上传。');}
   const reader=new Blob([data]).stream().pipeThrough(stream).getReader(),chunks=[];let length=0;
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>size||length>10*1024*1024){await reader.cancel();fail();}chunks.push(value);}
   data=new Uint8Array(await new Blob(chunks).arrayBuffer());
  }
  if(data.length!==size)fail();entries.push({name,text:decode.decode(data)});
 }
 return entries.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
}
