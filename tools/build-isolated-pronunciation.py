# Run from the repository root. Requires Python, NumPy, and ffmpeg.
import json,subprocess,io,wave
from pathlib import Path
import numpy as np
manifest=json.loads(Path('pronunciation/index.json').read_text())
out=Path('pronunciation/isolated');out.mkdir(exist_ok=True)
# Seconds measured against decoded waveforms/spectrograms, excluding the following vowel.
initials={
'b':('ba1',.018,.085),'p':('pa2',.20,.335),'m':('ma1',.035,.112),'f':('fa1',.025,.091),
'd':('da1',.025,.093),'t':('ta1',.19,.29),'n':('na1',.025,.105),'l':('la1',.13,.215),
'g':('ge1',.19,.215),'k':('ke1',.045,.185),'h':('he1',.04,.22),
'j':('ji1',.04,.225),'q':('qi1',.255,.40),'x':('xi1',.10,.35),
'zh':('zhi1',.40,.495),'ch':('chi1',.06,.33),'sh':('shi1',.10,.44),'r':('ri4',.18,.29),
'z':('zi4',.185,.265),'c':('ci4',.13,.23),'s':('si1',.08,.40),
'y':('yi1',None,None),'w':('wu1',None,None)
}
finals={
'a':('a1',None,None),'o':('bo1',.12,.57),'e':('e1',None,None),'i':('yi1',None,None),'u':('wu1',None,None),'ü':('yu2',None,None),
'ai':('ai3',None,None),'ei':('bei1',.15,.62),'ui':('wei1',None,None),'ao':('ao4',None,None),'ou':('ou3',None,None),'iu':('you1',None,None),
'ie':('ye2',None,None),'üe':('yue4',None,None),'er':('er3',None,None),'an':('an1',None,None),'en':('ben3',.16,.58),'in':('yin1',None,None),
'un':('wen1',None,None),'ün':('yun2',None,None),'ang':('bang1',.16,None),'eng':('feng1',.27,.68),'ing':('ying1',None,None),'ong':('gong1',.24,.73),
'ia':('ya1',None,None),'ua':('wa4',None,None),'uo':('wo3',None,None),'uai':('wai4',None,None),'iao':('yao1',None,None),'ian':('yan1',None,None),
'uan':('wan2',None,None),'üan':('yuan2',None,None),'iang':('yang2',None,None),'uang':('wang3',None,None),'iong':('yong3',None,None)
}
notes={}
for category,entries in [('initials',initials),('finals',finals)]:
 for symbol,(key,start,end) in entries.items():
  if key not in manifest:raise ValueError(key)
  clip=manifest[key];raw=Path('pronunciation',clip['file']).read_bytes()[clip['offset']:clip['offset']+clip['length']]
  decoded=subprocess.run(['ffmpeg','-v','error','-i','pipe:0','-f','f32le','-ac','1','-ar','24000','pipe:1'],input=raw,stdout=subprocess.PIPE,check=True).stdout
  y=np.frombuffer(decoded,np.float32).copy()
  if start is not None:y=y[int(start*24000):int(end*24000) if end is not None else None]
  # Short edge fades prevent edit clicks, with comfortable padding around the isolated sound.
  fade=min(48,len(y)//8);y[:fade]*=np.linspace(0,1,fade);y[-fade:]*=np.linspace(1,0,fade)
  peak=max(abs(y));assert peak>.0001,(symbol,peak)
  y=y*(.82/peak);y=np.pad(y,(2400,4800))
  target=out/(category+'-'+symbol.replace('ü','v')+'.mp3')
  subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar','24000','-ac','1','-i','pipe:0','-b:a','64k','-y',str(target)],input=y.astype(np.float32).tobytes(),check=True)
  notes[category+'/'+symbol]={'file':str(target),'sourceKey':key,'trim':[start,end],'duration':round(len(y)/24000,3)}
Path('pronunciation/isolated/sources.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2)+'\n')
print('Built',len(notes),'standalone phoneme recordings')
