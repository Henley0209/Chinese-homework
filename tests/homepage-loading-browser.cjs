const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const scenario of ['normal','slow-config','failed-module']){
   const context=await browser.newContext(),page=await context.newPage(),errors=[];let pendingConfig;
   page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.hostname!=='practice.test')return route.abort();
    if(scenario==='slow-config'&&u.pathname==='/site-config.json'){pendingConfig=route;return;}
    if(scenario==='failed-module'&&u.pathname==='/appearance-v4.mjs')return route.abort();
    const file=path.resolve('.',decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');
    if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
    const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
    return route.fulfill({contentType:mime,body:fs.readFileSync(file)});
   });
   await page.goto('https://practice.test/',{waitUntil:'commit'});
   await page.waitForFunction(()=>!document.documentElement.classList.contains('appearance-loading')&&!document.querySelector('#site-loading'),{},{timeout:12000});
   assert.equal(await page.locator('#identity').isVisible(),true,scenario);
   await page.waitForFunction(()=>!document.querySelector('#start').disabled,{},{timeout:20000});
   assert.ok(await page.locator('#exercise-select option').count()>0,scenario+': app and courses load');
   if(scenario==='slow-config'){
    await page.waitForTimeout(4500); // The 8-second request deadline also settles the appearance module.
    await page.waitForFunction(()=>document.title.includes('Tiếng Trung Cô Nga'));
    await pendingConfig?.fulfill({contentType:'application/json',body:fs.readFileSync('site-config.json')}).catch(()=>{});
   }
   assert.deepEqual(errors,[],scenario+': no JavaScript exceptions');
   console.log('PASS: '+scenario+' reveals usable homepage and loads exercises');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
