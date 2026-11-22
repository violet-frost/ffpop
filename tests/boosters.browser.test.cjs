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

 await confirmHome();assert.equal(await evaluate('document.querySelectorAll(".booster-button").length'),4);assert(await evaluate('Array.from(document.querySelectorAll(".booster-button")).every(n=>n.disabled)'));
 for(const [level,kind]of [[5,'hammer'],[12,'glove'],[16,'watering'],[19,'dice']]){
  await openLevel(level);const moves=await evaluate('BloomDemo.game.moves');const before=await evaluate('JSON.stringify(BloomDemo.game.board)');
  await click(`[data-booster="${kind}"]`);assert.equal(await evaluate('BloomDemo.game.boosterUses'),0);
  if(kind==='dice'){await click('[data-action="cancel-booster"]');assert.equal(await evaluate('JSON.stringify(BloomDemo.game.board)'),before);await click('[data-booster="dice"]');await click('[data-booster="dice"]');}
  else{const index=await evaluate(`BloomDemo.game.board.findIndex((t,i)=>BloomDemo.game.boosterTargets('${kind}',i).length)`);assert(index>=0);await click(`[data-cell="${index}"]`);if(kind==='watering'){assert.equal(await evaluate('BloomDemo.game.boosterUses'),0);assert(await evaluate('document.querySelectorAll(".booster-preview").length>0'));await click(`[data-cell="${index}"]`);}if(kind==='glove'){assert.equal(await evaluate('BloomDemo.game.boosterUses'),0);const target=await evaluate(`BloomDemo.game.boosterTargets('glove',${index})[0]`);await click(`[data-cell="${target}"]`);}}
  assert(await evaluate('BloomDemo.locked'));await waitTurn();assert.equal(await evaluate('BloomDemo.game.moves'),moves);assert.equal(await evaluate('BloomDemo.game.turns'),0);assert.equal(await evaluate('BloomDemo.game.boosterUses'),1);assert(await evaluate('Array.from(document.querySelectorAll(".booster-button")).every(n=>n.disabled)'));await shot('booster-'+kind,0);
  await click('[data-action="restart"]');await click('[data-action="retry"]');assert.equal(await evaluate('BloomDemo.game.boosterUses'),0);assert.equal(await evaluate(`BloomDemo.game.boosters['${kind}']`),1);console.log('PASS '+kind+' tutorial, preview/confirmation, free use, shared cap and restart');
 }
 await openLevel(20);await click('[data-booster="glove"]');await click('[data-action="cancel-booster"]');await click('[data-cell="59"]');await waitTurn();assert.equal(await evaluate('BloomDemo.game.boosterUses'),0);assert.equal(await evaluate('BloomDemo.game.turns'),1);console.log('PASS cancelled tool returns to ordinary game controls');
 for(const [width,height]of [[320,568],[360,592],[360,640],[360,800],[393,873],[412,915]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await sleep(80);const bounds=await evaluate(`(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width}};return {hud:r('.wood-hud'),board:r('.board-wrap'),shelf:r('.booster-shelf'),controls:r('.game-controls'),height:innerHeight,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}})()`);assert(bounds.hud.bottom<=bounds.board.top,JSON.stringify(bounds));assert(bounds.board.bottom<=bounds.shelf.top,JSON.stringify(bounds));assert.equal(bounds.shelf.top,bounds.controls.top,JSON.stringify(bounds));assert(bounds.controls.bottom<=height,JSON.stringify(bounds));assert(bounds.scroll<=bounds.client);await shot('boosters-phone-'+width+'x'+height,0);}console.log('PASS four supplied reference icons and 6 portrait layouts');
 // Navigate away while dice is animating; new game must retain a clean inventory and no motion layers.
 await openLevel(50);await click('[data-booster="dice"]');await click('[data-booster="dice"]');await click('.hud-mascot');assert.equal(await evaluate('BloomDemo.page'),'home');await confirmHome();assert.equal(await evaluate('document.querySelectorAll(".fall-clip,.turn-effects").length'),0);assert.equal(await evaluate('BloomDemo.game.boosterUses'),0);assert.deepEqual(errors,[]);await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Booster browser tests timed out');proc.kill();process.exit(1);},120000);
run().then(()=>{clearTimeout(timeout);console.log('Booster browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
