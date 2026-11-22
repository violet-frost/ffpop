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
 await setup([[27,'rainbow']]);
 const initial=await evaluate('({moves:BloomDemo.game.moves,board:JSON.stringify(BloomDemo.game.board)})');

 await click('[data-cell="27"]');
 assert.equal(await evaluate('document.querySelector(".rainbow-selected").dataset.cell'),'27');
 assert((await evaluate('getComputedStyle(document.querySelector(".rainbow-selected .fruit")).filter')).includes('drop-shadow'));
 assert.deepEqual(await evaluate('({moves:BloomDemo.game.moves,board:JSON.stringify(BloomDemo.game.board)})'),initial);
 await shot('rainbow-selected',450);
 await click('[data-cell="0"]');assert.equal(await evaluate('document.querySelectorAll(".rainbow-selected").length'),0);assert.equal(await evaluate('BloomDemo.game.moves'),initial.moves);assert.equal(await evaluate('JSON.stringify(BloomDemo.game.board)'),initial.board);
 await click('[data-cell="27"]');await click('.board-wrap');assert.equal(await evaluate('document.querySelectorAll(".rainbow-selected").length'),0);assert.equal(await evaluate('BloomDemo.game.moves'),40);
 await click('[data-cell="27"]');await click('[data-cell="28"]');assert.equal(await evaluate('BloomDemo.phase'),'swap');await shot('rainbow-swap',80);await waitUntil('BloomDemo.phase==="release"');assert(await evaluate('document.querySelectorAll(".rainbow-link").length>0'));await shot('rainbow-targeted',160);await waitTurn();assert.equal(await evaluate('BloomDemo.game.moves'),39);assert(await evaluate('BloomDemo.game.collected.color3>=1'));assert.equal(await evaluate('document.querySelectorAll(".rainbow-selected").length'),0);
 console.log('PASS selection glow, nonadjacent/outside cancellation, unchanged state, exchange, matching-color links, and single move cost');
 for(const axis of ['h','v']){
  await setup([[27,'rocket',axis]]);await click('[data-cell="27"]');await waitUntil('BloomDemo.phase==="release"');
  assert.equal(await evaluate('document.querySelectorAll(".flying-rocket").length'),2);
  await sleep(180);const transforms=await evaluate('Array.from(document.querySelectorAll(".flying-rocket"),n=>new DOMMatrix(getComputedStyle(n).transform)).map(m=>({x:m.m41,y:m.m42}))');
  assert(transforms.some(t=>axis==='h'?Math.abs(t.x)>1&&Math.abs(t.y)<1:Math.abs(t.y)>1&&Math.abs(t.x)<1));await shot('rocket-flight-'+axis,0);await waitTurn();
  const ids=await evaluate('BloomDemo.game.board.map(t=>t.id)');assert.equal(new Set(ids).size,72);
 }
 console.log('PASS horizontal and vertical rocket bodies fly along their arrow axes');
 for(const [a,b,selector]of [['rocket','rocket','.flying-rocket'],['bomb','rocket','.flying-rocket'],['bomb','bomb','.blast-ring'],['rainbow','rocket','.converted-power'],['rainbow','bomb','.converted-power'],['rainbow','rainbow','.rainbow-link']]){
  await setup([[27,a,'h'],[28,b,'v']]);await click('[data-cell="27"]');if(a==='rainbow')await click('[data-cell="28"]');await waitUntil('BloomDemo.phase==="release"');assert(await evaluate('document.querySelectorAll(".fusion-orb").length===2'));
  await waitUntil(`document.querySelectorAll(${JSON.stringify(selector)}).length>0`);
  await shot('combo-'+a+'-'+b, a==='rainbow'?850:300);await waitTurn();assert.equal(await evaluate('document.querySelectorAll(".turn-effects,.fall-clip").length'),0);assert.equal(await evaluate('BloomDemo.game.moves'),39);
 }
 console.log('PASS all six combinations show fusion and their own flight/conversion/blast effects, then clean up');
 await setup([[27,'rainbow'],[28,'bomb']]);await click('[data-cell="27"]');await click('[data-cell="28"]');await waitUntil('BloomDemo.phase==="release"');await click('.hud-mascot');await sleep(400);assert.equal(await evaluate('document.querySelectorAll(".turn-effects,.fall-clip,.rainbow-selected").length'),0);assert.equal(await evaluate('BloomDemo.page'),'home');
 await setup([[27,'rainbow']]);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('[data-cell="27"]');await click('[data-cell="28"]');await waitTurn();assert.equal(await evaluate('BloomDemo.game.moves'),39);assert.equal(await evaluate('document.querySelectorAll(".turn-effects,.fall-clip").length'),0);
 console.log('PASS mid-combo cancellation and reduced-motion exchange');
 assert.equal(await evaluate('getComputedStyle(document.querySelector("#board .cell")).backgroundColor'),'rgba(0, 0, 0, 0)');
 await shot('sculpted-fruit-board',0);assert.deepEqual(errors,[]);console.log('PASS transparent cells and no browser exceptions');await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Browser tests timed out');proc.kill();process.exit(1);},180000);
run().then(()=>{clearTimeout(timeout);console.log('Browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
