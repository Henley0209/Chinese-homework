# Run from the repository root. Requires Python, NumPy, and ffmpeg.
# Source recordings: David A. V. Infield, Unlicense / public domain.
# Cache originals in work/teaching-source using the URLs recorded in sources.json.
import json,subprocess,urllib.request
from pathlib import Path
import numpy as np
initials=dict(zip('b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(),'bo po mo fo de te ne le ge ke he ji qi xi zhi chi shi ri zi ci si yi wu'.split()))
finals=dict(zip('a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong ia ua uo uai iao ian uan üan iang uang iong'.split(),'a bo e yi wu yu ai ei wei ao ou you ye yue er an en yin wen yun ang feng ying gong ya wa wo wai yao yan wan yuan yang wang yong'.split()))
out=Path('pronunciation/isolated');notes=json.loads((out/'sources.json').read_text())
for category,entries in [('initials',initials),('finals',finals)]:
 for symbol,syllable in entries.items():
  # Keep the previously isolated o/eng/ong: this source has no zero-initial clips for them.
  if category=='finals' and symbol in ['o','eng','ong']:
   notes[category+'/'+symbol]['mode']='isolated-final';continue
  key=syllable+'1';source=Path('work/teaching-source')/(key+'.mp3')
  if not source.exists():
   source.parent.mkdir(parents=True,exist_ok=True)
   with urllib.request.urlopen('https://raw.githubusercontent.com/davinfifield/mp3-chinese-pinyin-sound/master/mp3/'+key+'.mp3',timeout=30) as response:source.write_bytes(response.read())
  decoded=subprocess.run(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ac','1','-ar','24000','pipe:1'],stdout=subprocess.PIPE,check=True).stdout
  y=np.frombuffer(decoded,np.float32).copy()
  # Preserve the entire natural utterance; fades only affect its outermost 2 ms.
  fade=min(48,len(y)//8);y[:fade]*=np.linspace(0,1,fade);y[-fade:]*=np.linspace(1,0,fade)
  peak=max(abs(y));assert peak>.0001
  y=y*(.82/peak);y=np.pad(y,(2400,4800))
  target=out/(category+'-'+symbol.replace('ü','v')+'.mp3')
  subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar','24000','-ac','1','-i','pipe:0','-b:a','64k','-y',str(target)],input=y.astype(np.float32).tobytes(),check=True)
  notes[category+'/'+symbol]={'file':str(target),'sourceKey':key,'sourceUrl':'https://raw.githubusercontent.com/davinfifield/mp3-chinese-pinyin-sound/master/mp3/'+key+'.mp3','trim':[None,None],'mode':'teaching-initial' if category=='initials' else 'zero-initial-final','duration':round(len(y)/24000,3)}
(out/'sources.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2)+'\n')
print('Built complete teaching initials and zero-initial finals; preserved three isolated finals')
