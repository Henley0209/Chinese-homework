// Content similarity only. Text recognition cannot measure tones or phonemes.
export function normalizeReading(text){
 return String(text??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
}
export function scoreReading(reference,transcript){
 const expected=[...normalizeReading(reference)],heard=[...normalizeReading(transcript)];
 if(!expected.length)throw Error('课文不能为空。');
 if(!heard.length)throw Error('没有识别到朗读内容，请重新阅读后再打分。');
 if(expected.length>4000||heard.length>4000)throw Error('朗读内容过长，请重新阅读。');
 const rows=Array.from({length:expected.length+1},()=>new Uint16Array(heard.length+1));
 for(let i=0;i<=expected.length;i++)rows[i][0]=i;
 for(let j=0;j<=heard.length;j++)rows[0][j]=j;
 for(let i=1;i<=expected.length;i++)for(let j=1;j<=heard.length;j++){
  rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(expected[i-1]===heard[j-1]?0:1));
 }
 let i=expected.length,j=heard.length;const differences=[],counts={correct:0,substitution:0,missing:0,extra:0};
 while(i||j){
  if(i&&j&&rows[i][j]===rows[i-1][j-1]+(expected[i-1]===heard[j-1]?0:1)){
   const type=expected[i-1]===heard[j-1]?'correct':'substitution';counts[type]++;differences.push({type,expected:expected[--i],heard:heard[--j]});
  }else if(i&&rows[i][j]===rows[i-1][j]+1){counts.missing++;differences.push({type:'missing',expected:expected[--i],heard:''});}
  else{counts.extra++;differences.push({type:'extra',expected:'',heard:heard[--j]});}
 }
 const distance=rows[expected.length][heard.length];
 return {score:Math.max(0,Math.round(100*(1-distance/Math.max(expected.length,heard.length)))),distance,expectedCount:expected.length,heardCount:heard.length,counts,differences:differences.reverse()};
}
