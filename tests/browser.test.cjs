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
 const click=async selector=>{if(['[data-action="settings"]','[data-action="restart"]','[data-action="hint"]'].includes(selector)&&!await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))await click('[data-action="pause"]');assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`),'missing '+selector);await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);};
 const shot=async (name,delay=450)=>{await sleep(delay);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.mkdirSync(path.join(__dirname,'screenshots'),{recursive:true});fs.writeFileSync(path.join(__dirname,'screenshots',name+'.png'),Buffer.from(r.data,'base64'));};
 const waitUntil=async (expression,timeout=12000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await sleep(35);}throw new Error('Timed out: '+expression);};
 const waitTurn=()=>waitUntil('!BloomDemo.locked || BloomDemo.page!=="game"');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'../index.html')).href});
 for(let n=0;n<100;n++){if(await evaluate('!!window.BloomDemo'))break;await sleep(50);}

 async function confirmHome(){await click('.home-start');assert(await evaluate('document.querySelector("dialog").open'));await click('[data-action="start"]');}
 async function openLevel(id){
  if(await evaluate('document.querySelector("dialog").open'))await click('[data-action="close"]');
  const current=await evaluate('BloomDemo.page');if(current==='game')await click('.hud-mascot');else if(current==='result')await click('[data-action="levels"]');
  if(await evaluate('BloomDemo.page==="home"'))await click('.bottom-nav [data-action="levels"]');
  const target=Math.floor((id-1)/10);let ch=await evaluate('Number(document.querySelector(".map-world").dataset.chapter)');
  while(ch!==target){ch+=ch<target?1:-1;await click(`.chapter-arrow[data-chapter="${ch}"]`);}
  await click(`.level-node[data-level="${id}"]`);await click('[data-action="start"]');
 }
 await confirmHome();assert.equal(await evaluate('BloomDemo.page'),'game');assert.equal(await evaluate('document.querySelectorAll("[data-cell]").length'),72);await shot('game-desktop');
 await click('[data-action="settings"]');await click('[data-action="sound"]');assert.equal(await evaluate('document.querySelector(".sound-toggle").getAttribute("aria-pressed")'),'false');await click('[data-action="help"]');assert(await evaluate('document.querySelector("dialog").open'));await click('[data-action="close"]');console.log('PASS start confirmation, settings, sound, and help');
 await openLevel(3);
 const h=await evaluate('BloomDemo.game.level.opening.index'),oldIds=await evaluate('Array.from(document.querySelectorAll("[data-tile-id]")).map(x=>x.dataset.tileId).join(",")');
 const movesBefore=await evaluate('BloomDemo.game.moves');await click(`[data-cell="${h}"]`);assert(await evaluate('BloomDemo.locked'));assert.equal(await evaluate('document.querySelector("#board").getAttribute("aria-busy")'),'true');assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-tile-id]")).map(x=>x.dataset.tileId).join(",")'),oldIds);
 await click(`[data-cell="${h}"]`);assert.equal(await evaluate('BloomDemo.game.moves'),movesBefore-1);await waitUntil('BloomDemo.phase==="fall" && document.querySelectorAll(".falling-tile").length>0');assert(await evaluate('Array.from(document.querySelectorAll(".falling-tile")).some(x=>getComputedStyle(x).transform!=="none")'));await shot('portrait-falling',0);await waitTurn();assert.equal(await evaluate('document.querySelectorAll(".fall-clip").length'),0);assert.equal(await evaluate('document.querySelectorAll("#board [style*=hidden]").length'),0);console.log('PASS staged clear, visible gravity, cleanup, and rapid-tap lock');
 const rocket=await evaluate('BloomDemo.game.board.findIndex(x=>x?.kind==="rocket")');assert(rocket>=0);const specialStart=Date.now();await click(`[data-cell="${rocket}"]`);assert.equal(await evaluate('BloomDemo.phase'),'charge');await waitUntil('BloomDemo.phase==="release"');assert(await evaluate('document.querySelectorAll(".flying-rocket").length>0'));await shot('portrait-rocket',100);await waitUntil('BloomDemo.phase==="fall"');assert(Date.now()-specialStart>=700);await waitTurn();
 const cancelHint=await evaluate('BloomDemo.game.hint().index');await click(`[data-cell="${cancelHint}"]`);await waitUntil('BloomDemo.phase==="fall"');await click('.hud-mascot');await sleep(400);assert.equal(await evaluate('BloomDemo.page'),'home');await confirmHome();assert.equal(await evaluate('BloomDemo.locked'),false);console.log('PASS rocket release and returning home cancels animation');
 const moves=await evaluate('BloomDemo.game.moves');await click('[data-action="hint"]');assert(await evaluate('document.querySelectorAll(".hinted").length>0'));assert.equal(await evaluate('BloomDemo.game.moves'),moves);
 for(let t=0;t<50;t++){const state=await evaluate('({status:BloomDemo.game.status,...BloomDemo.game.hint()})');if(state.status!=='playing')break;await click(`[data-cell="${state.index}"]`);if(state.target!==undefined){await click(`[data-cell="${state.target}"]`);await waitUntil('BloomDemo.phase==="release"');await shot('portrait-rainbow',100);}await waitTurn();}
 await waitUntil('BloomDemo.page==="result"');assert.equal(await evaluate('BloomDemo.game.status'),'won');await shot('result-win');await click('[data-action="result-continue"]');assert(await evaluate('document.querySelector("dialog").open'));assert.equal(await evaluate('BloomDemo.page'),'result');await click('[data-action="start"]');assert.equal(await evaluate('BloomDemo.game.level.id'),2);await click('[data-action="restart"]');await click('[data-action="retry"]');assert.equal(await evaluate('BloomDemo.game.moves'),12);console.log('PASS actual click-to-win, themed result, next-level confirmation, and restart');
 await openLevel(6);const bh=await evaluate('BloomDemo.game.level.opening.index');await click(`[data-cell="${bh}"]`);await waitTurn();const bomb=await evaluate('BloomDemo.game.board.findIndex(x=>x?.kind==="bomb")');assert(bomb>=0);await click(`[data-cell="${bomb}"]`);await waitUntil('BloomDemo.phase==="release" && document.querySelectorAll(".blast-ring").length>0');await shot('portrait-bomb',100);await waitTurn();
 await openLevel(50);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(let t=0;t<55;t++){const state=await evaluate(`(()=>{const g=BloomDemo.game;let index=-1,small=100;for(let i=0;i<g.board.length;i++){if(g.board[i]?.kind!=='normal')continue;const n=g.group(i).length;if(n>=2&&n<small){small=n;index=i;}}return{status:g.status,...(index<0?g.hint():{index})};})()`);if(state.status!=='playing')break;await click(`[data-cell="${state.index}"]`);if(state.target!==undefined)await click(`[data-cell="${state.target}"]`);await waitTurn();}
 await waitUntil('BloomDemo.page==="result"');assert.equal(await evaluate('BloomDemo.game.status'),'lost');await shot('result-loss');await click('[data-action="retry"]');assert.equal(await evaluate('BloomDemo.game.moves'),28);await send('Emulation.setEmulatedMedia',{features:[]});console.log('PASS bomb, reduced motion, actual loss, and retry');
 const androidUA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';await send('Network.setUserAgentOverride',{userAgent:androidUA});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 for(const [width,height]of [[320,568],[360,592],[360,640],[360,800],[393,873],[412,915]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await sleep(80);const bounds=await evaluate('({board:document.querySelector(".board-wrap").getBoundingClientRect().toJSON(),tools:document.querySelector(".game-controls").getBoundingClientRect().toJSON(),hud:document.querySelector(".wood-hud").getBoundingClientRect().toJSON(),scroll:document.documentElement.scrollWidth})');assert(bounds.scroll<=width);assert(bounds.hud.bottom<bounds.board.top);assert(bounds.board.bottom<bounds.tools.top);assert(bounds.tools.bottom<=height);await shot('android-'+width+'x'+height,0);
 }
 await shot('game-mobile');await click('.hud-mascot');await shot('home-mobile');assert.equal(await evaluate('document.querySelector(".home-start").dataset.level'),'2');await send('Page.reload');await waitUntil('!!document.querySelector(".home-start")');assert.equal(await evaluate('document.querySelector(".home-start").dataset.level'),'2');console.log('PASS Android touch layouts and saved progress');
 await openLevel(50);const rh=await evaluate('BloomDemo.game.hint().index');await click(`[data-cell="${rh}"]`);await waitUntil('BloomDemo.phase==="fall"');await send('Emulation.setDeviceMetricsOverride',{width:393,height:800,deviceScaleFactor:1,mobile:true});await waitTurn();assert.equal(await evaluate('document.querySelectorAll(".fall-clip").length'),0);assert.equal(await evaluate('document.querySelectorAll("[data-cell]").length'),72);console.log('PASS resizing during fall');
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript exceptions');await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Browser tests timed out');proc.kill();process.exit(1);},180000);
run().then(()=>{clearTimeout(timeout);console.log('Browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
