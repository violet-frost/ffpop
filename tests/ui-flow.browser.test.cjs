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
 assert.equal(await evaluate('document.querySelectorAll(".bottom-nav button").length'),4);
 assert.equal(await evaluate('Array.from(document.querySelectorAll(".bottom-nav button span"),n=>n.textContent).join(",")'),'主页,关卡,成就,好友');
 assert.equal(await evaluate('document.querySelectorAll(".home-side-left [data-action=placeholder]").length'),2);
 assert.equal(await evaluate('document.querySelectorAll(".home-side-right [data-action=placeholder]").length'),1);
 await shot('redesign-home');
 for(const title of ['任务','活动','商店','成就','好友']){await click(`[data-action="placeholder"][data-title="${title}"]`);assert(await evaluate('document.querySelector("dialog").open'));assert.equal(await evaluate('document.querySelector(".dialog-body").textContent.trim()'),'');await click('[data-action="close"]');}
 await click('.home-settings');assert(await evaluate('document.querySelector("dialog").open'));await shot('redesign-settings');await click('[data-action="help"]');assert(await evaluate('document.querySelector("dialog").textContent.includes("彩虹")'));await shot('redesign-help');await click('[data-action="close"]');
 await click('.bottom-nav [data-action="levels"]');assert.equal(await evaluate('BloomDemo.page'),'map');assert.equal(await evaluate('document.querySelectorAll(".level-node").length'),10);assert(await evaluate('document.querySelector(".map-scroll").scrollHeight>document.querySelector(".map-scroll").clientHeight'));await shot('redesign-map');
 for(let ch=1;ch<5;ch++){await click(`.chapter-arrow[data-chapter="${ch}"]`);assert.equal(await evaluate('Number(document.querySelector(".map-world").dataset.chapter)'),ch);assert.equal(await evaluate('document.querySelectorAll(".level-node").length'),10);}
 await click('[data-level="50"]');assert(await evaluate('document.querySelector("dialog").open'));assert.equal(await evaluate('document.querySelectorAll(".preview-goals .goal").length'),4);assert.equal(await evaluate('BloomDemo.page'),'map');await shot('redesign-level-preview');await click('[data-action="close"]');
 await click('.bottom-nav [data-action="home"]');await click('.home-start');assert(await evaluate('document.querySelector("dialog").open'));assert.equal(await evaluate('BloomDemo.page'),'home');await click('[data-action="start"]');assert.equal(await evaluate('BloomDemo.page'),'game');
 assert(await evaluate('!!document.querySelector(".wood-hud")'));assert.equal(await evaluate('document.querySelectorAll("[data-cell]").length'),72);assert.equal(await evaluate('document.querySelectorAll(".game-controls button").length'),5);await shot('redesign-game');
 for(const [width,height]of [[320,568],[360,592],[360,640],[360,800],[393,873],[412,915]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await sleep(80);
  const layout=await evaluate('({scroll:document.documentElement.scrollWidth,board:document.querySelector(".board-wrap").getBoundingClientRect().toJSON(),hud:document.querySelector(".wood-hud").getBoundingClientRect().toJSON(),tools:document.querySelector(".game-controls").getBoundingClientRect().toJSON()})');
  assert(layout.scroll<=width);assert(layout.hud.bottom<layout.board.top,JSON.stringify(layout));assert(layout.board.bottom<layout.tools.top,JSON.stringify(layout));assert(layout.tools.bottom<=height,JSON.stringify(layout));await shot('redesign-game-'+width+'x'+height,0);
 }
 console.log('PASS home entries, empty placeholders, four navigation tabs, scrollable five-chapter map, preview confirmation, themed settings/help, and six phone layouts');
 // Complete chapter one through a real turn after restoring the first nine completed levels.
 await click('.hud-mascot');await evaluate(`(()=>{const key=BloomData.CONFIG.storageKey;const data={stars:{},sound:false,announcedChapters:[]};for(let i=1;i<=9;i++)data.stars[i]=3;localStorage.setItem(key,JSON.stringify(data));})()`);await send('Page.reload');await waitUntil('!!window.BloomDemo && !!document.querySelector(".home-start")');await click('.home-start');await click('[data-action="start"]');assert.equal(await evaluate('BloomDemo.game.level.id'),10);
 const move=await evaluate('(()=>{const g=BloomDemo.game,h=g.hint(),t=g.board[h.index];g.level={...g.level,goals:[{kind:"color",color:t.color,target:1}]};return h;})()');
 await click(`[data-cell="${move.index}"]`);if(move.target!==undefined)await click(`[data-cell="${move.target}"]`);await waitTurn();await waitUntil('BloomDemo.page==="result"');await shot('redesign-victory');await click('[data-action="result-continue"]');assert(await evaluate('document.querySelector("dialog").open'));assert(await evaluate('document.querySelector("dialog").textContent.includes("解锁新章节")'));await shot('redesign-chapter-unlock');await click('[data-action="unlock-continue"]');assert.equal(await evaluate('BloomDemo.page'),'map');assert.equal(await evaluate('Number(document.querySelector(".map-world").dataset.chapter)'),1);
 await send('Page.reload');await waitUntil('!!document.querySelector(".home-start")');assert.equal(await evaluate('document.querySelector(".home-start").dataset.level'),'11');assert(await evaluate('JSON.parse(localStorage.getItem(BloomData.CONFIG.storageKey)).announcedChapters.includes(1)'));
 console.log('PASS actual chapter completion, victory ribbon, unlock popup, continue to next chapter, and persistence');
 assert.deepEqual(errors,[]);console.log('PASS no JavaScript exceptions');await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Browser tests timed out');proc.kill();process.exit(1);},180000);
run().then(()=>{clearTimeout(timeout);console.log('Browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
