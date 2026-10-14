// Isolated deterministic fixture uses the production Simulation + Renderer.
// No test hooks are shipped in index.html; profile writes/audio are not subscribed.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const root=process.env.GAME_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hook=`
window.__knotQa={
 setup(){app.loop.stop();app.closeModal();const sim=new Simulation(734123);sim.start('defense');sim.wave.index=2;sim.wave.stage='active';sim.wave.spawned=Config.waves[2].count;sim.nest.attack.left=999;sim.enemies=[];sim.allies=[];app.sim=sim;app.renderer.reset();this.log=[];
 sim.events.on(e=>{this.log.push({...e,time:sim.time});app.renderer.event(e,sim)});
 for(const x of [140,195,250,305,360]){sim.spawnEnemy(0);const e=sim.enemies.at(-1);e.position={x,y:290};e.previous={...e.position};e.movement.speed=0;}
 sim.addAlly({type:1});const prep=sim.allies[0];prep.position={x:250,y:340};prep.previous={...prep.position};prep.home={x:250,y:340,leash:200};
 for(const enemy of sim.enemies){sim.fire(prep,enemy);for(let i=0;i<60&&sim.projectiles.length;i++){sim.time+=1/60;sim.updateProjectiles(1/60);app.renderer.update(1/60,true)}}
 prep.attack.left=999;sim.addAlly({type:0});const heavy=sim.allies[1];heavy.position={x:140,y:320};heavy.previous={...heavy.position};heavy.home={x:140,y:320,leash:200};
 this.draw();return this.read();
 },
 draw(){app.updateUI();app.renderer.draw(app.sim,1)},
 read(){return {snapshot:app.sim.snapshot(),log:this.log,health:app.sim.enemies.map(e=>({id:e.id,hp:e.health.current})),errors:app.metrics.errors}},
 normals(){const s=app.sim,a=s.allies[1],e=s.enemies[0];for(let i=0;i<3;i++)s.fire(a,e);a.attack.left=0;this.draw();return this.read()},
 step(n=1){for(let i=0;i<n;i++){const s=app.sim;s.time+=1/60;s.updateCombat(1/60);app.renderer.update(1/60,true)}this.draw();return this.read()}
};
`;
const html=source.replace('const app=new App();','const app=new App();'+hook);
const out=process.env.SCREENSHOT_DIR||path.join(root,'artifacts','knot-chain');fs.mkdirSync(out,{recursive:true});
let server,browser;const errors=[],results=[];
const timer=setTimeout(()=>{console.error('120 second limit exceeded');process.exit(1)},120000);
(async()=>{
 server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__knotQa);const prefix=mobile?'mobile':'desktop';
 let state=await page.evaluate(()=>__knotQa.setup());assert.equal(state.snapshot.knots.length,5);assert.equal(state.snapshot.knotChains.length,0);await page.screenshot({path:path.join(out,prefix+'-prepared.png')});
 state=await page.evaluate(()=>__knotQa.normals());assert.equal(state.snapshot.knots.length,5);assert.equal(state.snapshot.knotChains.length,0);
 state=await page.evaluate(()=>__knotQa.step());assert.ok(state.snapshot.allies[1].windup);await page.screenshot({path:path.join(out,prefix+'-windup.png')});
 for(let i=0;i<30&&!state.log.some(e=>e.kind==='knotCompress');i++)state=await page.evaluate(()=>__knotQa.step());assert.ok(state.log.some(e=>e.kind==='knotCompress'));await page.screenshot({path:path.join(out,prefix+'-compress.png')});
 for(let i=0;i<10&&!state.log.some(e=>e.kind==='knotFlight');i++)state=await page.evaluate(()=>__knotQa.step());state=await page.evaluate(()=>__knotQa.step(3));await page.screenshot({path:path.join(out,prefix+'-thread-flight.png')});
 state=await page.evaluate(()=>__knotQa.step(60));const unwind=state.log.filter(e=>e.kind==='knotUnwind');assert.equal(unwind.length,5);assert.equal(new Set(state.log.filter(e=>e.kind==='knotCompress').map(e=>e.target)).size,5);assert.equal(state.snapshot.knotChains.length,0);assert.equal(state.snapshot.knots.length,0);
 for(let i=1;i<unwind.length;i++)assert.ok(Math.abs(unwind[i].time-unwind[i-1].time-11/60)<.001); // Four compression + seven flight fixed ticks.
 assert.equal(state.errors.length,0);results.push({viewport:prefix,steps:unwind.length,beats:unwind.map(e=>e.time),initialEnemyHp:30*1.62,prepDamage:12,heavyDamage:7*1.6,burstDamage:12});await context.close();
 }
 assert.equal(errors.length,0);const result={status:'PASS',browser:browser.version(),htmlSha256:crypto.createHash('sha256').update(source).digest('hex'),results,errors,limitations:['Controlled wave-3 density with stationary enemies and nest fire suppressed; not full five-wave balance','Separate tests/play.e2e.cjs checks real user input and normal gameplay','Physical phone and human audio listening not checked']};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{clearTimeout(timer);await browser?.close();server?.close()});
