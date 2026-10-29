import {zipFiles} from './homework-docx.mjs?v=courseware2';
import {coursewareSlides} from './courseware-core.mjs?v=courseware2';
const nsA='http://schemas.openxmlformats.org/drawingml/2006/main',nsP='http://schemas.openxmlformats.org/presentationml/2006/main',nsR='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const emu=n=>Math.round(n*914400),palette={ink:'203B39',green:'1E5B57',orange:'B36A45',muted:'6C7B72',paper:'FAF7F0',line:'E2E5D9'};
const group='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const transform=(x,y,w,h)=>`<a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>`;
function slideXml(deck,slide,index,total){
 let shapes='',id=2;
 const box=(x,y,w,h,fill='FFFFFF',line=fill)=>{shapes+=`<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Card"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${transform(x,y,w,h)}<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln w="9000"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln></p:spPr></p:sp>`;};
 const text=(value,x,y,w,h,size=14,color=palette.ink,bold=false,align='l')=>{shapes+=`<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="${xml(String(value).slice(0,30))}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${transform(x,y,w,h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="ctr"/><a:lstStyle/>${String(value).split('\n').map(line=>`<a:p><a:pPr algn="${align}"><a:buNone/></a:pPr><a:r><a:rPr lang="zh-CN" sz="${Math.round(size*100)}" b="${bold?1:0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Arial"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Arial"/></a:rPr><a:t>${xml(line)}</a:t></a:r><a:endParaRPr lang="zh-CN" sz="${Math.round(size*100)}"/></a:p>`).join('')}</p:txBody></p:sp>`;};
 const triple=(t,x,y,w,{py=12,zh=22,vi=12,center=false,gap=.27}={})=>{const align=center?'ctr':'l';text(t.pinyin,x,y,w,.22,py,palette.orange,false,align);text(t.zh.replaceAll('____','（　　）'),x,y+gap,w,.36,zh,palette.ink,true,align);text(t.vi,x,y+gap+.39,w,.37,vi,palette.muted,false,align);};
 const image=(scene,x,y,w,h)=>{const col=scene%3,row=Math.floor(scene/3);shapes+=`<p:pic><p:nvPicPr><p:cNvPr id="${id++}" name="Dialogue scene ${scene+1}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:srcRect l="${Math.round(col/3*100000)}" r="${Math.round((2-col)/3*100000)}" t="${row*50000}" b="${(1-row)*50000}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${transform(x,y,w,h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;};
 text(`HSK1–2  /  主题 ${String(deck.number).padStart(2,'0')}`,.6,.25,6,.2,9,'658079');text('Tiếng Trung Cô Nga',9.1,.25,3.6,.2,9,'658079',false,'r');
 text('拼音 → 汉字 → Tiếng Việt',.6,7.07,8,.2,8,'7E8C83');text(`${index+1} / ${total}`,11.2,7.07,1.5,.2,8,'7E8C83',false,'r');
 if(slide.type==='cover'){
  text('从一句话，开始交流',.65,1.05,6.3,.3,15,palette.green);
  text(deck.title.pinyin,.65,2.0,6.4,.4,23,palette.orange);text(deck.title.zh,.65,2.65,6.6,1.05,deck.number===2?35:42,palette.green,true);text(deck.title.vi,.65,3.95,6.6,.55,24,palette.muted);
  text('2组对话 × 300字   /   20个生词   /   10道填空',.65,5.3,6.6,.4,13,palette.green);text(deck.difficulty,.65,5.9,6.6,.3,12,palette.muted);image(slide.scene,8.0,1.25,4.65,4.65);
 }else if(slide.type==='dialogue'){
  image(slide.scene,.6,1.35,3.1,3.1);triple(slide.title,.6,4.85,3.1,{py:11,zh:19,vi:11});text(Object.entries(slide.roles).map(([id,name])=>`${id} · ${name}`).join('  /  '),.6,6.15,3.1,.5,10,palette.muted);text(`对话 ${slide.groupIndex+1} · 300字 · ${slide.page}/${slide.pages}`,.6,.8,5,.3,13,palette.green,true);
  slide.turns.forEach((turn,i)=>{const y=1.0+i*1.12;box(4.05,y+.28,.27,.27,'E7EBE0');text(turn.speaker,4.05,y+.28,.27,.27,9,palette.green,true,'ctr');triple(turn,4.48,y,8.15,{py:10.5,zh:18.5,vi:11,gap:.23});});
 }else if(slide.type==='vocabulary'){
  text(`生词 · 10个  /  对话 ${slide.groupIndex+1}`,.6,.8,12,.5,25,palette.green,true);
  slide.words.forEach((word,i)=>{const x=.6+(i%5)*2.46,y=1.75+Math.floor(i/5)*2.35;box(x,y,2.26,2.02,'FFFFFF','E6E3D9');triple(word,x+.12,y+.38,2.02,{py:13,zh:25,vi:12,center:true,gap:.36});});
 }else{
  text(`填空练习 · 5题  /  对话 ${slide.groupIndex+1}`,.6,.8,12,.45,25,palette.green,true);
  box(.6,1.47,12.1,.85,'EAF0E6');const bank=[...slide.exercises].reverse();bank.forEach((e,i)=>triple(e.answer,.78+i*2.38,1.53,2.12,{py:9,zh:15,vi:9,center:true,gap:.18}));
  slide.exercises.forEach((e,i)=>{const y=2.55+i*.82;text(String(i+1).padStart(2,'0'),.8,y+.2,.5,.3,14,palette.orange,true);triple(e,1.52,y,10.95,{py:10.5,zh:18,vi:11,gap:.18});});
 }
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="${nsA}" xmlns:r="${nsR}" xmlns:p="${nsP}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${palette.paper}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
export async function makeCoursewarePptx(deck,{imageBytes}={}){
 const slides=coursewareSlides(deck);
 if(!imageBytes){const response=await fetch(deck.image);if(!response.ok)throw Error('课件图片读取失败，请稍后重试。');imageBytes=new Uint8Array(await response.arrayBuffer());}
 const rels=items=>`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id,type,target])=>`<Relationship Id="${id}" Type="${nsR}/${type}" Target="${target}"/>`).join('')}</Relationships>`;
 const files={
 '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`,
 '_rels/.rels':rels([['rId1','officeDocument','ppt/presentation.xml']]),
 'ppt/presentation.xml':`<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="${nsA}" xmlns:r="${nsR}" xmlns:p="${nsP}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${emu(13.333333)}" cy="${emu(7.5)}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
 'ppt/_rels/presentation.xml.rels':rels([['rId1','slideMaster','slideMasters/slideMaster1.xml'],...slides.map((_,i)=>[`rId${i+2}`,'slide',`slides/slide${i+1}.xml`])]),
 'ppt/slideMasters/slideMaster1.xml':`<?xml version="1.0" encoding="UTF-8"?><p:sldMaster xmlns:a="${nsA}" xmlns:r="${nsR}" xmlns:p="${nsP}"><p:cSld><p:spTree>${group}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
 'ppt/slideMasters/_rels/slideMaster1.xml.rels':rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]),
 'ppt/slideLayouts/slideLayout1.xml':`<?xml version="1.0" encoding="UTF-8"?><p:sldLayout xmlns:a="${nsA}" xmlns:r="${nsR}" xmlns:p="${nsP}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
 'ppt/slideLayouts/_rels/slideLayout1.xml.rels':rels([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]),
 'ppt/media/scenes.png':imageBytes
 };
 const scheme=[['dk1','203B39'],['lt1','FAF7F0'],['dk2','1E5B57'],['lt2','EAF0E6'],['accent1','1E5B57'],['accent2','B36A45'],['accent3','6C7B72'],['accent4','D5C8AD'],['accent5','E7EBE0'],['accent6','998C77'],['hlink','1E5B57'],['folHlink','B36A45']];
 const fills='<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
 files['ppt/theme/theme1.xml']=`<?xml version="1.0" encoding="UTF-8"?><a:theme xmlns:a="${nsA}" name="Chinese classroom"><a:themeElements><a:clrScheme name="Warm classroom">${scheme.map(([name,color])=>`<a:${name}><a:srgbClr val="${color}"/></a:${name}>`).join('')}</a:clrScheme><a:fontScheme name="Classroom"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Classroom"><a:fillStyleLst>${fills.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${`<a:ln w="9525">${fills}<a:prstDash val="solid"/></a:ln>`.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fills.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
 slides.forEach((slide,i)=>{files[`ppt/slides/slide${i+1}.xml`]=slideXml(deck,slide,i,slides.length);files[`ppt/slides/_rels/slide${i+1}.xml.rels`]=rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','image','../media/scenes.png']]);});
 const zip=zipFiles(files);return new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}
