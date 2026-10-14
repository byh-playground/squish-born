// Repeatable live-wave visual review. Only successful hatch inputs are scheduled;
// positions, health, enemy spawning/movement, all attacks and nest fire are production.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=process.env.GAME_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hook=`
window.__naturalQa={
 setup(){app.loop.stop();app.closeModal();app.sim=new Simulation(734123);app.sim.start('defense');app.renderer.reset();this.ticks=0;this.log=[];this.saved=JSON.stringify(localStorage);app.sim.events.on(e=>{if(e.kind.startsWith('knot'))this.log.push({...e,time:app.sim.time});app.renderer.event(e,app.sim)});this.draw()},
 draw(){app.updateUI();app.renderer.draw(app.sim,1)},
 step(n=1){for(let i=0;i<n;i++){if(this.ticks%720===0)app.sim.handleEgg({kind:'hatch',egg:0,unitCount:1,grade:'good',perfect:false,material:'crack',reward:10});this.ticks++;app.sim.update(1/60);app.renderer.update(1/60,true)}this.draw();return this.read()},
 read(){return {snapshot:app.sim.snapshot(),log:this.log,storageUnchanged:this.saved===JSON.stringify(localStorage),errors:app.metrics.errors}},
 play(){this.setup();this.step(18*60);let previous=performance.now(),carry=0;const frame=now=>{carry+=Math.min((now-previous)/1000,.1);previous=now;while(carry>=1/60){this.step();carry-=1/60}if(this.ticks>=34*60){this.setup();this.step(18*60)}requestAnimationFrame(frame)};requestAnimationFrame(frame)}
};
`;
const serve=process.argv.includes('--serve');
const html=source.replace('const app=new App();','const app=new App();'+hook+(serve?'__naturalQa.play();':''));
let server,browser;
(async()=>{
 server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});await new Promise(r=>server.listen(serve?Number(process.env.PORT||8771):0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 if(serve){console.log('Natural seeded combat replay: '+url+' (18–34 seconds; scripted Good hatch every 12 seconds; all combat unchanged)');return}
 const out=process.env.SCREENSHOT_DIR||path.join(root,'artifacts','natural-chain');fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{channel:process.env.BROWSER_CHANNEL||'msedge'}),headless:true});
 const errors=[],results=[];
 for(const mobile of [false,true]){
  const prefix=mobile?'mobile':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:path.join(out,prefix),size:mobile?{width:390,height:844}:{width:1365,height:900}}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.waitForFunction(()=>window.__naturalQa);await page.evaluate(async()=>{await document.fonts.ready;__naturalQa.setup();__naturalQa.step(18*60);await new Promise(r=>requestAnimationFrame(r));__naturalQa.draw()});
  let state,first=false,transfer=false;
  // At real-time playback speed, watch anticipation, chain and receiver response.
  for(let i=0;i<16*30;i++){state=await page.evaluate(()=>__naturalQa.step(2));if(!first&&state.snapshot.knotChains.some(c=>c.phase==='compress')){await page.screenshot({path:path.join(out,prefix+'-natural-impact.png')});first=true}if(!transfer&&state.snapshot.knotChains.some(c=>c.phase==='flight'&&c.left<.12)){await page.screenshot({path:path.join(out,prefix+'-natural-transfer.png')});transfer=true}await page.waitForTimeout(1000/30)}
  assert.ok(first&&transfer,'Live waves must reach impact and visible transfer');assert.ok(state.log.some(e=>e.kind==='knotSlack'&&e.steps>=3),'Live waves must reach at least three linked enemies');assert.ok(state.storageUnchanged,'Review fixture must not save hatch rewards');assert.equal(state.errors.length,0);results.push({viewport:prefix,chains:state.log.filter(e=>e.kind==='knotSlack').map(e=>({time:e.time,steps:e.steps})),storageUnchanged:state.storageUnchanged});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'PASS',browser:browser.version(),results,errors,limitations:['Hatch rewards are scripted at 0/12/24 seconds, not human timing','Real wave spawns, movement, combat, nest fire and health are unmodified','Videos and screenshots require human visual review; assertions do not prove aesthetics']},null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(!serve)server?.close()});
