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


 await click('.home-start');await click('[data-action="start"]');
 assert.equal(await evaluate('document.querySelectorAll(".game-controls .booster-button").length'),4);
 assert.equal(await evaluate('document.querySelectorAll(".game-controls .tool-button").length'),0);
 for(const [width,height]of [[320,568],[360,592],[360,640],[360,800],[393,873],[412,915]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await sleep(80);
  const b=await evaluate(`(()=>{
   const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();
   return {board:r('.board-wrap'),hud:r('.wood-hud'),tools:r('.booster-shelf'),menu:r('.play-top-actions'),width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth};
  })()`);
  assert(b.scroll<=width,JSON.stringify(b));assert(b.menu.bottom<=b.hud.top,JSON.stringify(b));
  assert(b.hud.bottom<b.board.top,JSON.stringify(b));assert(b.board.bottom<b.tools.top,JSON.stringify(b));assert(b.tools.bottom<=height,JSON.stringify(b));
  assert(b.board.height>=Math.min((b.tools.width-20)*9/8+20,b.tools.top-b.hud.bottom-65), 'board should use reclaimed space '+JSON.stringify(b));
  await shot('tools-layout-'+width+'x'+height,0);
 }
 await evaluate('BloomDemo.game.level={...BloomDemo.game.level,goals:[{kind:"color",color:0,target:999}]}');
 const h=await evaluate('BloomDemo.game.hint().index');await click('[data-cell="'+h+'"]');
 await waitUntil('BloomDemo.locked');
 await click('[data-action="pause"]');assert.equal(await evaluate('BloomMotion.paused'),true);
 await sleep(80);
 const state=await evaluate('({phase:BloomDemo.phase,moves:BloomDemo.game.moves,board:JSON.stringify(BloomDemo.game.board),times:document.querySelector(".board-wrap").getAnimations({subtree:true}).map(a=>a.currentTime)})');
 await sleep(1300);
 assert.deepEqual(await evaluate('({phase:BloomDemo.phase,moves:BloomDemo.game.moves,board:JSON.stringify(BloomDemo.game.board),times:document.querySelector(".board-wrap").getAnimations({subtree:true}).map(a=>a.currentTime)})'),state);
 await click('[data-cell="0"]');assert.equal(await evaluate('BloomDemo.game.moves'),state.moves);
 await shot('tools-pause',0);await click('[data-action="close"]');await waitTurn();assert.equal(await evaluate('BloomMotion.paused'),false);
 const nextFall=await evaluate('BloomDemo.game.hint().index');await click('[data-cell="'+nextFall+'"]');await waitUntil('BloomDemo.phase==="fall"');
 await click('[data-action="pause"]');const fallingPhase=await evaluate('BloomDemo.phase');await sleep(1000);assert.equal(await evaluate('BloomDemo.phase'),fallingPhase);assert.equal(fallingPhase,'fall');
 await click('[data-action="close"]');await waitTurn();
 await click('[data-action="exit"]');assert.equal(await evaluate('BloomMotion.paused'),true);await click('[data-action="close"]');assert.equal(await evaluate('BloomDemo.page'),'game');
 await click('[data-action="exit"]');await click('dialog [data-action="home"]');assert.equal(await evaluate('BloomDemo.page'),'home');await sleep(80);assert.equal(await evaluate('BloomMotion.paused'),false);
 await click('.home-start');await click('[data-action="start"]');assert.equal(await evaluate('BloomMotion.paused'),false);
 const next=await evaluate('BloomDemo.game.hint().index');await click('[data-cell="'+next+'"]');await waitTurn();
 assert.deepEqual(errors,[]);
 console.log('PASS single bottom tool shelf, six enlarged layouts, paused animation clocks, resume, exit cancel/confirm and clean reentry');
 await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Browser tests timed out');proc.kill();process.exit(1);},180000);
run().then(()=>{clearTimeout(timeout);console.log('Browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
