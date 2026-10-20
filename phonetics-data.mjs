// Static photographic-style mouth references. Shared poses illustrate visible lip/tongue positions.
export const mouthPhotos={closed:0,open:1,round:2,back:3,flat:4,u:5,pinch:6,lipteeth:7,nasal:8,curled:9,teeth:10,high:11,narrow:11};
const groups={
 lips:['closed','open','双唇先闭合，再放开。','Khép hai môi rồi mở ra.'],
 lipteeth:['lipteeth','lipteeth','上齿轻触下唇，让气流从缝隙通过。','Răng trên chạm nhẹ môi dưới, đẩy hơi qua khe.'],
 tip:['nasal','open','舌尖抵上齿龈，再放开。','Đầu lưỡi chạm lợi trên rồi hạ xuống.'],
 root:['back','open','舌根抬向软腭，再放开。','Nâng gốc lưỡi về ngạc mềm rồi thả ra.'],
 front:['high','flat','舌尖抵下齿背，舌面前部靠近硬腭。','Đầu lưỡi chạm sau răng dưới, nâng mặt lưỡi trước.'],
 curl:['curled','curled','舌尖翘起靠近硬腭前部，不要抵住上齿。','Cong đầu lưỡi về phía ngạc cứng trước.'],
 dental:['teeth','flat','舌尖靠近上齿背，气流从窄缝通过。','Đầu lưỡi gần mặt sau răng trên, hơi qua khe hẹp.']
};
const initials=[
 ['b','lips','不送气，轻轻放开双唇。','Không bật hơi mạnh.'],['p','lips','送气，放开双唇时有明显气流。','Bật hơi mạnh khi mở môi.'],['m','lips','双唇闭合，声音从鼻腔出来。','Khép môi, âm đi qua mũi.'],['f','lipteeth','持续送气，声带不振动。','Thổi hơi liên tục, không rung dây thanh.'],
 ['d','tip','不送气，舌尖快速放开。','Không bật hơi mạnh.'],['t','tip','送气，舌尖放开时气流明显。','Bật hơi mạnh.'],['n','tip','舌尖抵住上齿龈，保持位置，气流走鼻腔。','Giữ đầu lưỡi ở lợi, hơi qua mũi.'],['l','tip','舌尖抵住上齿龈，气流从舌两侧出来。','Hơi đi qua hai bên lưỡi.'],
 ['g','root','不送气，舌根快速放开。','Không bật hơi mạnh.'],['k','root','送气，舌根放开时气流明显。','Bật hơi mạnh.'],['h','root','舌根靠近软腭，让气流摩擦通过。','Hơi cọ qua khe giữa gốc lưỡi và ngạc mềm.'],
 ['j','front','先阻气再摩擦放开，不送气。','Chặn rồi xát hơi, không bật hơi mạnh.'],['q','front','先阻气再放开，明显送气。','Chặn rồi bật hơi mạnh.'],['x','front','保持窄缝，持续摩擦送气。','Giữ khe hẹp, thổi hơi xát liên tục.'],
 ['zh','curl','先阻气再摩擦放开，不送气。','Chặn rồi xát hơi, không bật hơi mạnh.'],['ch','curl','先阻气再摩擦放开，明显送气。','Chặn rồi bật hơi mạnh.'],['sh','curl','保持舌尖翘起，气流持续摩擦。','Giữ đầu lưỡi cong, thổi hơi xát.'],['r','curl','舌尖翘起，声带振动。','Cong đầu lưỡi và rung dây thanh.'],
 ['z','dental','先阻气再摩擦放开，不送气。','Chặn rồi xát hơi, không bật hơi mạnh.'],['c','dental','先阻气再摩擦放开，明显送气。','Chặn rồi bật hơi mạnh.'],['s','dental','保持窄缝，持续送气。','Giữ khe hẹp, thổi hơi liên tục.'],
 ['y','front','拼写字母，发音同 i。','Chữ ghép âm, phát âm như i.'],['w','lips','拼写字母，双唇拢圆，发音同 u。','Chữ ghép âm, phát âm như u.']
].map(([symbol,group,zh,vi])=>{
 const g=groups[group];let shapes=[g[0],g[1]];if(symbol==='m')shapes=['closed','closed'];if(symbol==='n')shapes=['nasal','nasal'];if(symbol==='w')shapes=['u','u'];if(symbol==='y')shapes=['flat','flat'];
 const standalone=['m','n','l','h','y','w'].includes(symbol);
 return {symbol,shapes,zh:standalone?zh:g[2]+' '+zh,vi:standalone?vi:g[3]+' '+vi};
});
const finals=[
 ['a','open','open','张大嘴，舌位低，双唇自然放松。','Mở miệng rộng, hạ lưỡi, thả lỏng môi.'],
 ['o','round','round','双唇拢圆，舌头稍向后。','Tròn môi, lưỡi hơi lùi sau.'],
 ['e','back','back','嘴半开，不圆唇，舌头稍向后。','Hé miệng, không tròn môi, lưỡi hơi lùi sau.'],
 ['i','flat','flat','双唇展开，舌面抬高，舌尖抵下齿背。','Kéo ngang môi, nâng lưỡi, đầu lưỡi chạm răng dưới.'],
 ['u','round','round','双唇向前拢圆，舌面后部抬高。','Chu môi tròn, nâng phần sau lưỡi.'],
 ['ü','pinch','pinch','先做 i 的舌位，再将双唇拢圆。','Giữ lưỡi như i rồi tròn môi.'],
 ['ai','open','flat','从 a 滑向 i，开口逐渐变小。','Từ a sang i, thu nhỏ miệng dần.'],
 ['ei','back','flat','从 e 滑向 i，唇形逐渐展开。','Từ e sang i, kéo ngang môi dần.'],
 ['ui','round','flat','ui 是 uei 的缩写，从 u 经 e 滑向 i。','ui viết tắt của uei: từ u qua e sang i.'],
 ['ao','open','round','从 a 滑向 o，嘴由大到小。','Từ a sang o, thu miệng và tròn môi.'],
 ['ou','round','round','从 o 滑向 u，双唇进一步收拢。','Từ o sang u, thu tròn môi hơn.'],
 ['iu','flat','round','iu 是 iou 的缩写，从 i 经 o 滑向 u。','iu viết tắt của iou: từ i qua o sang u.'],
 ['ie','flat','open','从 i 滑向 ê，口腔逐渐打开。','Từ i sang ê, mở miệng dần.'],
 ['üe','pinch','open','从 ü 滑向 ê，圆唇逐渐放开。','Từ ü sang ê, mở và thả môi dần.'],
 ['er','back','curled','嘴半开，舌尖向上卷起。','Hé miệng, cuộn đầu lưỡi lên.'],
 ['an','open','nasal','先发 a，再用舌尖抵上齿龈，收前鼻音 n。','Đọc a rồi chạm đầu lưỡi vào lợi trên, kết thúc bằng n.'],
 ['en','back','nasal','先发 e，再用舌尖抵上齿龈，收 n。','Đọc e rồi chạm đầu lưỡi vào lợi trên, kết thúc bằng n.'],
 ['in','flat','nasal','先发 i，舌尖抵上齿龈收 n。','Đọc i rồi kết thúc bằng n ở lợi trên.'],
 ['un','round','nasal','un 是 uen 的缩写，从 u 经 e 到 n。','un viết tắt của uen: từ u qua e đến n.'],
 ['ün','pinch','nasal','先发 ü，再用舌尖抵上齿龈收 n。','Đọc ü rồi kết thúc bằng n ở lợi trên.'],
 ['ang','open','back','先发 a，再抬舌根贴软腭，收后鼻音 ng。','Đọc a, nâng gốc lưỡi đến ngạc mềm, kết thúc bằng ng.'],
 ['eng','back','back','先发 e，再抬舌根贴软腭，收 ng。','Đọc e, nâng gốc lưỡi, kết thúc bằng ng.'],
 ['ing','flat','back','先发 i，再抬舌根，收 ng；不加 g 的爆破音。','Đọc i rồi kết thúc bằng ng, không bật âm g.'],
 ['ong','round','back','双唇拢圆，舌根抬起，收 ng。','Tròn môi, nâng gốc lưỡi, kết thúc bằng ng.'],
 ['ia','flat','open','从 i 快速滑向 a，嘴逐渐张大。','Từ i sang a, mở miệng rộng dần.'],
 ['ua','round','open','从 u 滑向 a，圆唇逐渐打开。','Từ u sang a, mở môi tròn dần.'],
 ['uo','round','round','从 u 滑向 o，保持圆唇并略张开。','Từ u sang o, giữ môi tròn và mở nhẹ.'],
 ['uai','round','flat','从 u 经 a 滑向 i，先开再收。','Từ u qua a sang i, mở rồi thu miệng.'],
 ['iao','flat','round','从 i 经 a 滑向 o，先开再拢圆。','Từ i qua a sang o, mở rồi tròn môi.'],
 ['ian','flat','nasal','从 i 过渡到较前的 a，再用舌尖收 n。','Từ i sang a ở phía trước, kết thúc bằng n.'],
 ['uan','round','nasal','从 u 经 a 到 n，最后舌尖抵上齿龈。','Từ u qua a đến n, đầu lưỡi chạm lợi trên.'],
 ['üan','pinch','nasal','从 ü 滑向较前的 a，再收 n。','Từ ü sang a ở phía trước, kết thúc bằng n.'],
 ['iang','flat','back','从 i 经 a 到 ng，最后舌根抬起。','Từ i qua a đến ng, nâng gốc lưỡi.'],
 ['uang','round','back','从 u 经 a 到 ng，最后舌根抬起。','Từ u qua a đến ng, nâng gốc lưỡi.'],
 ['iong','pinch','back','舌面前部抬高，双唇拢圆，收 ng。','Nâng mặt lưỡi trước, tròn môi, kết thúc bằng ng.']
].map(([symbol,from,to,zh,vi])=>({symbol,shapes:symbol==='u'?['u','u']:[from,to],zh,vi}));
const tones=[
 ['ˉ','yī','第一声 · 高平调','Thanh 1: cao và ngang','20,25 180,25'],
 ['ˊ','yí','第二声 · 从中音升到高音','Thanh 2: từ giữa lên cao','20,95 180,25'],
 ['ˇ','yǐ','第三声 · 单念时先降后升','Thanh 3: đọc riêng thì xuống thấp rồi lên','20,85 90,155 180,55'],
 ['ˋ','yì','第四声 · 从高音快速下降','Thanh 4: từ cao xuống thấp nhanh','20,25 180,155'],
 ['·','yi','轻声 · 短而轻，音高随前字变化','Thanh nhẹ: ngắn, nhẹ; cao độ tùy âm trước','70,95 130,95']
].map(([symbol,pinyin,zh,vi,contour])=>({symbol,pinyin,zh,vi,contour,shapes:['flat','flat']}));
export const phoneticCategories=[{id:'initials',zh:'声母',vi:'Phụ âm đầu',items:initials.map(item=>({...item,audio:'pronunciation/isolated/initials-'+item.symbol+'.mp3'}))},{id:'finals',zh:'韵母',vi:'Vần',items:finals.map(item=>({...item,audio:'pronunciation/isolated/finals-'+item.symbol.replace('ü','v')+'.mp3'}))},{id:'tones',zh:'声调',vi:'Thanh điệu',items:tones}];
