// Mouth shapes are pedagogical illustrations; recordings are example syllables.
export const mouthShapes={
 closed:[.04,.85,.2], open:[.85,.85,.15], round:[.55,.44,.2], narrow:[.28,.95,.18], flat:[.2,1,.25], curled:[.38,.72,.85], teeth:[.18,.9,.65], back:[.45,.75,.45], high:[.2,.7,.6], pinch:[.22,.42,.55], nasal:[.25,.8,.7]
};
const groups={
 lips:['closed','open','双唇先闭合，再放开。','Khép hai môi rồi mở ra.'],
 lipteeth:['teeth','narrow','上齿轻触下唇，让气流从缝隙通过。','Răng trên chạm nhẹ môi dưới, đẩy hơi qua khe.'],
 tip:['nasal','open','舌尖抵上齿龈，再放开。','Đầu lưỡi chạm lợi trên rồi hạ xuống.'],
 root:['back','open','舌根抬向软腭，再放开。','Nâng gốc lưỡi về ngạc mềm rồi thả ra.'],
 front:['high','flat','舌尖抵下齿背，舌面前部靠近硬腭。','Đầu lưỡi chạm sau răng dưới, nâng mặt lưỡi trước.'],
 curl:['curled','curled','舌尖翘起靠近硬腭前部，不要抵住上齿。','Cong đầu lưỡi về phía ngạc cứng trước.'],
 dental:['teeth','flat','舌尖靠近上齿背，气流从窄缝通过。','Đầu lưỡi gần mặt sau răng trên, hơi qua khe hẹp.']
};
const initials=[
 ['b','bā','lips','不送气，轻轻放开双唇。','Không bật hơi mạnh.'],['p','pá','lips','送气，放开双唇时有明显气流。','Bật hơi mạnh khi mở môi.'],['m','mā','lips','双唇闭合，声音从鼻腔出来。','Khép môi, âm đi qua mũi.'],['f','fā','lipteeth','持续送气，声带不振动。','Thổi hơi liên tục, không rung dây thanh.'],
 ['d','dā','tip','不送气，舌尖快速放开。','Không bật hơi mạnh.'],['t','tā','tip','送气，舌尖放开时气流明显。','Bật hơi mạnh.'],['n','ná','tip','舌尖保持抵住齿龈，气流走鼻腔。','Giữ đầu lưỡi ở lợi, hơi qua mũi.'],['l','lā','tip','舌尖抵住上齿龈，气流从舌两侧出来。','Hơi đi qua hai bên lưỡi.'],
 ['g','gē','root','不送气，舌根快速放开。','Không bật hơi mạnh.'],['k','kē','root','送气，舌根放开时气流明显。','Bật hơi mạnh.'],['h','hē','root','舌根靠近软腭，让气流摩擦通过。','Hơi cọ qua khe giữa gốc lưỡi và ngạc mềm.'],
 ['j','jī','front','先阻气再摩擦放开，不送气。','Chặn rồi xát hơi, không bật hơi mạnh.'],['q','qī','front','先阻气再放开，明显送气。','Chặn rồi bật hơi mạnh.'],['x','xī','front','保持窄缝，持续摩擦送气。','Giữ khe hẹp, thổi hơi xát liên tục.'],
 ['zh','zhī','curl','先阻气再摩擦放开，不送气。','Chặn rồi xát hơi, không bật hơi mạnh.'],['ch','chī','curl','先阻气再摩擦放开，明显送气。','Chặn rồi bật hơi mạnh.'],['sh','shī','curl','保持舌尖翘起，气流持续摩擦。','Giữ đầu lưỡi cong, thổi hơi xát.'],['r','rì','curl','舌尖翘起，声带振动。','Cong đầu lưỡi và rung dây thanh.'],
 ['z','zì','dental','先阻气再摩擦放开，不送气。','Chặn rồi xát hơi, không bật hơi mạnh.'],['c','cì','dental','先阻气再摩擦放开，明显送气。','Chặn rồi bật hơi mạnh.'],['s','sī','dental','保持窄缝，持续送气。','Giữ khe hẹp, thổi hơi liên tục.'],
 ['y','yī','front','拼写字母：示范 yī，口型同 i。','Chữ ghép âm: yī có khẩu hình như i.'],['w','wū','lips','拼写字母：示范 wū，双唇拢圆同 u。','Chữ ghép âm: wū có khẩu hình tròn như u.']
].map(([symbol,pinyin,group,zh,vi])=>{
 const g=groups[group];let shapes=[g[0],g[1]];if(symbol==='m')shapes=['closed','closed'];if(symbol==='n')shapes=['nasal','nasal'];if(symbol==='w')shapes=['round','round'];if(symbol==='y')shapes=['flat','flat'];
 return {symbol,pinyin,shapes,zh:g[2]+' '+zh,vi:g[3]+' '+vi};
});
const finals=[
 ['a','ā','open','open','张大嘴，舌位低，双唇自然放松。','Mở miệng rộng, hạ lưỡi, thả lỏng môi.'],
 ['o','bō','round','round','双唇拢圆，舌头稍向后。','Tròn môi, lưỡi hơi lùi sau.'],
 ['e','ē','back','back','嘴半开，不圆唇，舌头稍向后。','Hé miệng, không tròn môi, lưỡi hơi lùi sau.'],
 ['i','yī','flat','flat','双唇展开，舌面抬高，舌尖抵下齿背。','Kéo ngang môi, nâng lưỡi, đầu lưỡi chạm răng dưới.'],
 ['u','wū','round','round','双唇向前拢圆，舌面后部抬高。','Chu môi tròn, nâng phần sau lưỡi.'],
 ['ü','yú','pinch','pinch','先做 i 的舌位，再将双唇拢圆。','Giữ lưỡi như i rồi tròn môi.'],
 ['ai','ǎi','open','flat','从 a 滑向 i，开口逐渐变小。','Từ a sang i, thu nhỏ miệng dần.'],
 ['ei','bēi','back','flat','从 e 滑向 i，唇形逐渐展开。','Từ e sang i, kéo ngang môi dần.'],
 ['ui','guī','round','flat','ui 是 uei 的缩写，从 u 经 e 滑向 i。','ui viết tắt của uei: từ u qua e sang i.'],
 ['ao','ào','open','round','从 a 滑向 o，嘴由大到小。','Từ a sang o, thu miệng và tròn môi.'],
 ['ou','ǒu','round','round','从 o 滑向 u，双唇进一步收拢。','Từ o sang u, thu tròn môi hơn.'],
 ['iu','jiǔ','flat','round','iu 是 iou 的缩写，从 i 经 o 滑向 u。','iu viết tắt của iou: từ i qua o sang u.'],
 ['ie','jiē','flat','open','从 i 滑向 ê，口腔逐渐打开。','Từ i sang ê, mở miệng dần.'],
 ['üe','yuè','pinch','open','从 ü 滑向 ê，圆唇逐渐放开。','Từ ü sang ê, mở và thả môi dần.'],
 ['er','ěr','back','curled','嘴半开，舌尖向上卷起。','Hé miệng, cuộn đầu lưỡi lên.'],
 ['an','ān','open','nasal','先发 a，再用舌尖抵上齿龈，收前鼻音 n。','Đọc a rồi chạm đầu lưỡi vào lợi trên, kết thúc bằng n.'],
 ['en','běn','back','nasal','先发 e，再用舌尖抵上齿龈，收 n。','Đọc e rồi chạm đầu lưỡi vào lợi trên, kết thúc bằng n.'],
 ['in','yīn','flat','nasal','先发 i，舌尖抵上齿龈收 n。','Đọc i rồi kết thúc bằng n ở lợi trên.'],
 ['un','wēn','round','nasal','un 是 uen 的缩写，从 u 经 e 到 n。','un viết tắt của uen: từ u qua e đến n.'],
 ['ün','yún','pinch','nasal','先发 ü，再用舌尖抵上齿龈收 n。','Đọc ü rồi kết thúc bằng n ở lợi trên.'],
 ['ang','bāng','open','back','先发 a，再抬舌根贴软腭，收后鼻音 ng。','Đọc a, nâng gốc lưỡi đến ngạc mềm, kết thúc bằng ng.'],
 ['eng','fēng','back','back','先发 e，再抬舌根贴软腭，收 ng。','Đọc e, nâng gốc lưỡi, kết thúc bằng ng.'],
 ['ing','yīng','flat','back','先发 i，再抬舌根，收 ng；不加 g 的爆破音。','Đọc i rồi kết thúc bằng ng, không bật âm g.'],
 ['ong','gōng','round','back','双唇拢圆，舌根抬起，收 ng。','Tròn môi, nâng gốc lưỡi, kết thúc bằng ng.'],
 ['ia','jiā','flat','open','从 i 快速滑向 a，嘴逐渐张大。','Từ i sang a, mở miệng rộng dần.'],
 ['ua','guā','round','open','从 u 滑向 a，圆唇逐渐打开。','Từ u sang a, mở môi tròn dần.'],
 ['uo','guō','round','round','从 u 滑向 o，保持圆唇并略张开。','Từ u sang o, giữ môi tròn và mở nhẹ.'],
 ['uai','kuài','round','flat','从 u 经 a 滑向 i，先开再收。','Từ u qua a sang i, mở rồi thu miệng.'],
 ['iao','jiāo','flat','round','从 i 经 a 滑向 o，先开再拢圆。','Từ i qua a sang o, mở rồi tròn môi.'],
 ['ian','jiān','flat','nasal','从 i 过渡到较前的 a，再用舌尖收 n。','Từ i sang a ở phía trước, kết thúc bằng n.'],
 ['uan','guān','round','nasal','从 u 经 a 到 n，最后舌尖抵上齿龈。','Từ u qua a đến n, đầu lưỡi chạm lợi trên.'],
 ['üan','yuán','pinch','nasal','从 ü 滑向较前的 a，再收 n。','Từ ü sang a ở phía trước, kết thúc bằng n.'],
 ['iang','jiāng','flat','back','从 i 经 a 到 ng，最后舌根抬起。','Từ i qua a đến ng, nâng gốc lưỡi.'],
 ['uang','chuāng','round','back','从 u 经 a 到 ng，最后舌根抬起。','Từ u qua a đến ng, nâng gốc lưỡi.'],
 ['iong','xióng','pinch','back','舌面前部抬高，双唇拢圆，收 ng。','Nâng mặt lưỡi trước, tròn môi, kết thúc bằng ng.']
].map(([symbol,pinyin,from,to,zh,vi])=>({symbol,pinyin,shapes:[from,to],zh,vi}));
const tones=[
 ['ˉ','yī','第一声 · 高平调','Thanh 1: cao và ngang','20,25 180,25'],
 ['ˊ','yí','第二声 · 从中音升到高音','Thanh 2: từ giữa lên cao','20,95 180,25'],
 ['ˇ','yǐ','第三声 · 单念时先降后升','Thanh 3: đọc riêng thì xuống thấp rồi lên','20,85 90,155 180,55'],
 ['ˋ','yì','第四声 · 从高音快速下降','Thanh 4: từ cao xuống thấp nhanh','20,25 180,155'],
 ['·','yi','轻声 · 短而轻，音高随前字变化','Thanh nhẹ: ngắn, nhẹ; cao độ tùy âm trước','70,95 130,95']
].map(([symbol,pinyin,zh,vi,contour])=>({symbol,pinyin,zh,vi,contour,shapes:['flat','flat']}));
export const phoneticCategories=[{id:'initials',zh:'声母',vi:'Phụ âm đầu',items:initials},{id:'finals',zh:'韵母',vi:'Vần',items:finals},{id:'tones',zh:'声调',vi:'Thanh điệu',items:tones}];
