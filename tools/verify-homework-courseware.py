import asyncio,json,zipfile,io
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':900,'height':1000})
  await page.goto('http://127.0.0.1:8765/')
  await page.evaluate('''async()=>{document.body.innerHTML='<select id="user-role"><option>teacher</option></select><button id="open-homework"></button><dialog id="tools" open></dialog>';const {initHomework}=await import('./homework-generator.mjs');initHomework({requireTeacher(){},getPassword(){return 'fixture';}});}''')
  await page.locator('[data-hw-file]').set_input_files({'name':'餐厅.txt','mimeType':'text/plain','buffer':'服务员：您想吃什么？顾客：我要一碗面条。词语：菜单、点菜、面条。'.encode()})
  await page.wait_for_function("document.querySelector('[data-hw-content]').value.includes('面条')")
  assert await page.locator('[data-hw-exercise]').is_disabled()
  await page.locator('[data-hw-content]').fill('课件修改：今天学习点菜和面条。服务员拿来菜单，顾客想喝热水。BÀI TẬP Luyện nói English' )
  for kind in ['pinyin','order','translation']:await page.locator(f'[data-hw-count="{kind}"]').select_option('0')
  await page.locator('[data-hw-count="choice"]').select_option('5')
  requests=[]
  async def ai(route):
   body=route.request.post_data_json;requests.append(body)
   await route.fulfill(json={'questions':[{'text':f'请给我{i}碗________。','options':['面条','学校','医生'],'answer':'A','explanation':'面条是食物。'} for i in range(1,6)]})
  await page.route('**/homework',ai)
  await page.locator('[data-hw-generate]').click()
  await page.wait_for_function("!document.querySelector('[data-hw-result]').hidden")
  assert len(await page.locator('[data-hw-preview] fieldset').all())==5
  assert requests[0]['targets'] and 'English' not in requests[0]['context'] and 'BÀI' not in requests[0]['context'] and '课件修改' in requests[0]['context'] and requests[0]['title']=='餐厅'
  await page.locator('[data-hw-remove]').click()
  assert not await page.locator('[data-hw-exercise]').is_disabled()
  for ext,path,xml in [('pptx','ppt/slides/slide1.xml','<a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:r><a:t>课件词语：你好</a:t></a:r></a:p>'),('docx','word/document.xml','<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r><w:t>课件词语：学习</w:t></w:r></w:p>')]:
   b=io.BytesIO()
   with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:z.writestr(path,xml)
   await page.locator('[data-hw-file]').set_input_files({'name':'课程.'+ext,'mimeType':'application/octet-stream','buffer':b.getvalue()})
   await page.wait_for_function("document.querySelector('[data-hw-file-status]').textContent.includes('已读取') && !document.querySelector('[data-hw-upload]').disabled")
   assert '课件词语' in await page.locator('[data-hw-content]').input_value()
   await page.locator('[data-hw-remove]').click()
  # Minimal text PDF with valid object offsets and xref table.
  objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  stream=b'BT /F1 12 Tf 72 700 Td (Restaurant lesson noodles) Tj ET'
  objects.append(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream')
  pdf=b'%PDF-1.4\n';offsets=[]
  for i,obj in enumerate(objects,1):offsets.append(len(pdf));pdf+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
  xref=len(pdf);pdf+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{o:010} 00000 n \n'.encode() for o in offsets)+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(xref).encode()+b'\n%%EOF'
  await page.locator('[data-hw-file]').set_input_files({'name':'lesson.pdf','mimeType':'application/pdf','buffer':pdf})
  await page.wait_for_function("document.querySelector('[data-hw-file-status]').textContent.includes('未提取到可用汉字')")
  assert await page.locator('[data-hw-remove]').is_hidden()
  for width in [390,900]:
   await page.set_viewport_size({'width':width,'height':950})
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await browser.close();print('PASS: TXT/PPTX/DOCX/PDF parsing, edited-context AI request, Chinese-only explicit targets, preview, removal, mobile layout')
asyncio.run(main())
