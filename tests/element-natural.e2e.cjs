// Fixed mixed-party battle scenario uses production spawns, HP, movement and combat.
// Successful Good hatches are scheduled; the isolated preview never subscribes profile writes.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const root=process.env.GAME_ROOT||path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hook=`
window.__elementQa={
 setup(){app.loop.stop();app.closeModal();app.sim=new Simulation(734123);app.sim.start('defense');app.renderer.reset();this.ticks=0;this.log=[];this.saved=JSON.stringify(localStorage);app.sim.events.on(e=>{this.log.push({...e,time:app.sim.time});app.renderer.event(e,app.sim)});this.draw()},
 draw(){app.updateUI();app.renderer.draw(app.sim,1)},
 step(){if(this.ticks%300===0)app.sim.handleEgg({kind:'hatch',egg:0,unitCount:1,grade:'good',perfect:false,material:'crack',reward:12});this.ticks++;app.sim.update(1/60);app.renderer.update(1/60,true)},
 read(){return {snapshot:app.sim.snapshot(),log:this.log,storageUnchanged:this.saved===JSON.stringify(localStorage),errors:app.metrics.errors}},
 warmup(){this.setup();while(this.ticks<40*60)this.step();this.draw()},
 play(){this.warmup();let previous=performance.now(),carry=0;const frame=now=>{carry+=Math.min((now-previous)/1000,.1);previous=now;while(carry>=1/60){this.step();carry-=1/60}this.draw();if(this.ticks>=54*60){this.running=false;return}requestAnimationFrame(frame)};this.running=true;requestAnimationFrame(frame)},
 gallery(){const c=document.createElement('canvas');c.width=1000;c.height=250;const ctx=c.getContext('2d');ctx.fillStyle='#f7f1e6';ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<5;i++){ctx.drawImage(app.sprites.unit(i,false),i*200+15,12,170,170);drawLabel(ctx,Config.units[i].name,i*200+100,205,{size:18,color:'#455d4a'});drawLabel(ctx,Config.units[i].role,i*200+100,232,{size:13})}return c.toDataURL('image/png')}
};
`;
const serve=process.argv.includes('--serve'),html=source.replace('const app=new App();','const app=new App();'+hook+(serve?'__elementQa.play();':''));
const out=process.env.SCREENSHOT_DIR||path.join(root,'artifacts','element-combat');fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',scope:'Fixed natural mixed-party battle, with scripted Good hatches every five simulation seconds',errors:[],results:[]};
let server,browser;const timer=setTimeout(()=>{console.error('180 second QA limit');process.exit(1)},180000);
(async()=>{
 server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});await new Promise(r=>server.listen(serve?Number(process.env.PORT||8772):0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 if(serve){clearTimeout(timer);console.log('Element battle preview: '+url+' (40–54 simulation seconds, actual wave combat)');return}
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});report.browser=browser.version();report.htmlSha256=crypto.createHash('sha256').update(source).digest('hex');
 for(const mobile of [false,true]){
  const mode=mobile?'mobile':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:path.join(out,mode),size:mobile?{width:390,height:844}:{width:1365,height:900}}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(mode+': '+e.message));await page.goto(url);await page.waitForFunction(()=>window.__elementQa);await page.evaluate(async()=>{await document.fonts.ready;__elementQa.warmup();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));__elementQa.draw()});
  if(!mobile){const gallery=await page.evaluate(()=>__elementQa.gallery());fs.writeFileSync(path.join(out,'characters.png'),Buffer.from(gallery.split(',')[1],'base64'))}
  await page.evaluate(()=>__elementQa.play());const seen=new Set();const wallStart=Date.now();await page.waitForTimeout(80);await page.screenshot({path:path.join(out,mode+'-party.png')});
  while(await page.evaluate(()=>__elementQa.running)){const s=await page.evaluate(()=>__elementQa.read());const moving=s.snapshot.projectiles.find(p=>p.hop>0&&p.phase==='flight');if(moving&&!seen.has('bounce')){seen.add('bounce');await page.screenshot({path:path.join(out,mode+'-bounce.png')})}for(const p of s.snapshot.projectiles){if(p.payload.reaction&&p.hop>0&&!seen.has(p.payload.reaction)){seen.add(p.payload.reaction);await page.screenshot({path:path.join(out,mode+'-'+p.payload.reaction+'.png')})}}await page.waitForTimeout(40);if(Date.now()-wallStart>25000)throw Error('Real-time battle preview exceeded 25 seconds')}
  const state=await page.evaluate(()=>__elementQa.read()),hits=state.log.filter(e=>e.kind==='projectileHit'),bounces=state.log.filter(e=>e.kind==='projectileBounce'),reactions=state.log.filter(e=>e.kind==='elementReaction');
  assert.ok(bounces.length>0,'Basic attacks must visibly bounce in natural waves');assert.deepEqual([...new Set(reactions.map(e=>e.reaction))].sort(),['conduction','freeze','steam']);assert.ok(seen.has('bounce'),'A moving bounced projectile must be captured');assert.equal(state.storageUnchanged,true);assert.equal(state.errors.length,0);
  for(const id of new Set(hits.map(e=>e.shot))){const chain=hits.filter(e=>e.shot===id);assert.ok(chain.length<=4);assert.equal(new Set(chain.map(e=>e.target)).size,chain.length);for(let i=1;i<chain.length;i++)assert.ok(chain[i].time>chain[i-1].time)}
  const viewport=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(viewport.width,viewport.scrollWidth);report.results.push({viewport:mode,bounces:bounces.length,reactions:reactions.map(e=>({type:e.reaction,time:e.time,shot:e.shot})),captured:[...seen],storageUnchanged:true,recordedSimulationSeconds:14,wallSeconds:(Date.now()-wallStart)/1000});
  await context.close();const video=fs.readdirSync(path.join(out,mode)).find(n=>n.endsWith('.webm'));fs.copyFileSync(path.join(out,mode,video),path.join(out,mode+'-battle.webm'));
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';report.limitations=['Successful hatches are scripted; human hatch input is covered by npm test','Physical mobile hardware, human audio listening and full five-wave balance not checked','Videos require visual review; assertions do not establish aesthetics'];console.log(JSON.stringify(report,null,2));
})().catch(e=>{report.status='FAIL';report.errors.push(e.stack);process.exitCode=1;console.error(e)}).finally(async()=>{if(!serve){clearTimeout(timer);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser?.close();server?.close()}});
