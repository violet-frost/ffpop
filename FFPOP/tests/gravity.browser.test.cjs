'use strict';
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'bloom-demo-test-'));
const proc=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;const errors=[];let id=0,sessionId;const pending=new Map();
async function run(){
 let port;for(let i=0;i<100;i++){try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break;}catch{}await sleep(100);}assert(port,'browser did not start');
 const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();
 ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);};
 function send(method,params={},sid=sessionId){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(sid?{sessionId:sid}:{})}));});}
 const target=await send('Target.createTarget',{url:'about:blank'},null);sessionId=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await send('Runtime.enable');await send('Page.enable');
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const click=async selector=>{assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`),'missing '+selector);await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);};
 const shot=async (name,delay=450)=>{await sleep(delay);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.mkdirSync(path.join(__dirname,'screenshots'),{recursive:true});fs.writeFileSync(path.join(__dirname,'screenshots',name+'.png'),Buffer.from(r.data,'base64'));};
 const waitUntil=async (expression,timeout=12000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await sleep(35);}throw new Error('Timed out: '+expression);};
 const waitTurn=()=>waitUntil('!BloomDemo.locked || BloomDemo.page!=="game"');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'../index.html')).href});
 for(let n=0;n<100;n++){if(await evaluate('!!window.BloomDemo'))break;await sleep(50);}

 await send('Emulation.setDeviceMetricsOverride',{width:393,height:873,deviceScaleFactor:1,mobile:true});
 async function setup(kinds){
  if(await evaluate('BloomDemo.page!=="home"'))await click('.hud-mascot');
  await click('.home-start');await click('[data-action="start"]');
  await evaluate(`(()=>{const g=BloomDemo.game;g.level={...g.level,goals:[{kind:'color',color:5,target:999}]};g.moves=40;g.status='playing';g.board=g.board.map((_,i)=>g.tile(i%5));const kinds=${JSON.stringify(kinds)};for(const [index,kind,axis]of kinds)g.board[index]={kind,axis:axis||'h',color:1,id:++g.serial};for(let i=0;i<g.board.length;i++){const t=g.board[i],n=document.querySelector('[data-cell="'+i+'"]');n.className='cell '+(t.kind==='normal'?'c'+t.color:'special');n.dataset.tileId=t.id;n.innerHTML=t.kind==='normal'?Art.token(t.color):Art.special(t.kind,t.axis);}document.querySelector('#moves strong').textContent=g.moves;document.querySelector('#toast').classList.remove('visible');})()`);
 }

 async function prepare(wall=false){await setup([]);return evaluate(`(()=>{const g=BloomDemo.game;g.level={...g.level,gravity:'flow'};g.boosters={hammer:2,glove:0,watering:0,dice:0,maxUses:2};g.boosterUses=0;const indices=${wall?'[24,25,26,27,28,29,30,31]':'[27]'};for(const i of indices){g.board[i]={kind:'box',id:++g.serial};const n=document.querySelector('[data-cell="'+i+'"]');n.className='cell box';n.innerHTML=Art.box();}g.board[0].color=g.board[1].color;document.querySelector('[data-cell="0"]').innerHTML=Art.token(g.board[0].color);document.querySelector('[data-booster="hammer"]').disabled=false;return {donor:g.board[26].id,above:g.board[19].id};})()`);}
 const first=await prepare();await click('[data-booster="hammer"]');await click('[data-cell="35"]');assert.equal(await evaluate('BloomDemo.game.board[35].id'),first.donor);await waitUntil('BloomDemo.phase==="fall"');await waitUntil(`!!document.querySelector('[data-fall-id="${first.donor}"]')`);const route=await evaluate(`(()=>{const n=document.querySelector('[data-fall-id="${first.donor}"]');return{frames:n.getAnimations()[0].effect.getKeyframes().map(k=>k.transform),mask:getComputedStyle(document.querySelector('.flow-layer')).clipPath}})()`);assert(route.frames[0].includes('-'));assert(route.frames.at(-1).replaceAll(' ','').includes('0px,0px'));assert(route.mask.startsWith('path('));await shot('gravity-diagonal-flow',80);await waitTurn();assert.equal(await evaluate('document.querySelectorAll(".fall-clip,.flow-inlet-clip,.falling-tile").length'),0);console.log('PASS diagonal model route is rendered through a masked path and cleaned up');
 const wall=await prepare(true);await click('[data-booster="hammer"]');await click('[data-cell="43"]');await waitTurn();assert.equal(await evaluate('BloomDemo.game.board[35]'),null);assert(await evaluate('document.querySelector(".cell.empty").dataset.cell==="35"'));assert.equal(await evaluate('BloomDemo.game.isHole(4,3)'),false);await shot('gravity-blocked-empty',0);await click('[data-booster="hammer"]');await click('[data-cell="27"]');await waitTurn();assert.equal(await evaluate('BloomDemo.game.board[35].id'),wall.above);assert(await evaluate('BloomDemo.game.board[27]'));console.log('PASS blocked lower region stays empty, then refills through a broken box');
 await prepare();await click('[data-booster="hammer"]');await click('[data-cell="35"]');await waitUntil('BloomDemo.phase==="fall"');await click('.hud-mascot');assert.equal(await evaluate('BloomDemo.page'),'home');assert.equal(await evaluate('document.querySelectorAll(".fall-clip,.flow-inlet-clip,.falling-tile").length'),0);console.log('PASS leaving during routed gravity cancels every animation layer');

 await prepare();await evaluate(`(()=>{const g=BloomDemo.game;g.level={...g.level,layout:g.level.layout.map((r,ri)=>r.map((t,c)=>ri===3?'.':t))};for(let i=24;i<32;i++){g.board[i]=null;document.querySelector('[data-cell="'+i+'"]').outerHTML='<span class="cell hole"></span>';}})()`);await click('[data-booster="hammer"]');await click('[data-cell="43"]');await waitUntil('BloomDemo.phase==="fall"');const inlet=await evaluate(`(()=>{const g=BloomDemo.game,p=g.fallPaths.find(p=>p.spawn&&p.entry===4),n=document.querySelector('[data-fall-id="'+p.id+'"]');return {entry:p.entry,parent:n.parentElement.className,top:n.parentElement.getBoundingClientRect().top,limit:document.querySelector('[data-cell="35"]').getBoundingClientRect().top,holes:g.board.slice(24,32).every(t=>t===null)};})()`);assert.equal(inlet.entry,4);assert.equal(inlet.parent,'flow-inlet-clip');assert(inlet.top>=inlet.limit-2);assert(inlet.holes);await waitTurn();console.log('PASS lower static-region inlet is clipped below its gap rather than spawning through the upper board');
 await prepare();await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('[data-booster="hammer"]');await click('[data-cell="35"]');await waitTurn();assert.equal(await evaluate('BloomDemo.game.boosterUses'),1);assert.equal(await evaluate('document.querySelectorAll(".fall-clip,.flow-inlet-clip,.falling-tile").length'),0);assert.deepEqual(errors,[]);console.log('PASS reduced motion and no browser exceptions');await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Gravity browser tests timed out');proc.kill();process.exit(1);},120000);
run().then(()=>{clearTimeout(timeout);console.log('Gravity browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});

