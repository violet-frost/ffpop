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


 await send('Emulation.setDeviceMetricsOverride',{width:393,height:873,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('BloomAudio.state'),'locked');assert.equal(await evaluate('document.querySelectorAll("dialog .settings-help").length'),0);
 await click('[data-action="rules"]');
 const paragraphs=await evaluate('Array.from(document.querySelectorAll(".rules-intro p"),p=>p.innerText)');
 assert.equal(paragraphs.length,3);assert(paragraphs[0].includes('在规定的步数内，点击两个及以上相连的同色花、果来消除，完成指定目标即可过关。'));
 assert(!paragraphs.join('').includes('花园障碍'));await click('[data-action="close"]');
 await click('.home-settings');assert.equal(await evaluate('document.querySelectorAll("[data-volume]").length'),3);assert.equal(await evaluate('document.querySelector("[data-volume=master]").value'),'80');assert.equal(await evaluate('document.querySelectorAll("dialog [data-action=help]").length'),0);
 async function volume(channel,value){await evaluate(`(()=>{const input=document.querySelector('[data-volume="${channel}"]');input.value=${value};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);assert.equal(await evaluate(`document.querySelector('[data-volume-output="${channel}"]').textContent`),value+'%');}
 await volume('master',100);await volume('music',100);await volume('effects',0);
 await waitUntil('BloomAudio.state==="running"&&BloomAudio.playing==="home"');
 const signal=async()=>{let max=0;for(let i=0;i<6;i++){await sleep(70);max=Math.max(max,await evaluate('BloomAudio.level()'));}return max;};
 const homeLevel=await signal();assert(homeLevel>.0001,'home music must produce actual audio '+homeLevel);
 await volume('master',0);await sleep(450);const muted=await signal();assert(muted<homeLevel*.005+1e-7,'master 0 must mute signal '+muted);
 await volume('master',100);await volume('music',0);await sleep(450);assert((await signal())<.000001,'music 0 must mute music bus');
 await volume('master',67);await volume('music',32);await volume('effects',58);await shot('audio-settings',100);
 await send('Page.reload');await waitUntil('!!window.BloomAudio&&!!document.querySelector(".home-settings")');
 assert.deepEqual(await evaluate('BloomAudio.volumes'),{master:67,music:32,effects:58});assert.equal(await evaluate('BloomAudio.state'),'locked');
 await click('.home-settings');assert.equal(await evaluate('document.querySelector("[data-volume=music]").value'),'32');
 await volume('master',100);await volume('music',0);await volume('effects',100);await click('[data-action="close"]');
 await click('.home-start');await click('[data-action="start"]');await waitUntil('BloomAudio.playing==="game"');
 assert(await evaluate('BloomAssets.music_home!==BloomAssets.music_game'),'different scene cues required');
 await click('[data-action="pause"]');await click('[data-action="settings"]');await volume('music',100);await volume('effects',0);await sleep(450);assert((await signal())>.0001,'in-game music must produce actual audio');await volume('music',0);await volume('effects',100);await sleep(450);await click('[data-action="close"]');
 await evaluate('BloomDemo.game.level={...BloomDemo.game.level,goals:[{kind:"color",color:5,target:999}]};BloomDemo.game.moves=80');
 async function setupSpecial(kind){
  await evaluate(`(()=>{
   const g=BloomDemo.game;g.board=g.board.map((_,i)=>g.tile(i%5));g.board[1]=g.tile(0);g.board[6]=g.tile(2);g.board[7]=g.tile(2);if(${JSON.stringify(kind)}!=='normal')g.board[27]={kind:${JSON.stringify(kind)},axis:'h',color:1,id:++g.serial};
   for(let i=0;i<g.board.length;i++){const t=g.board[i],n=document.querySelector('[data-cell="'+i+'"]');n.className='cell';n.dataset.tileId=t.id;n.innerHTML=t.kind==='normal'?Art.token(t.color):Art.special(t.kind,t.axis);}
  })()`);
 }
 for(const kind of ['rocket','bomb','rainbow']){
  await setupSpecial(kind);await click('[data-cell="27"]');if(kind==='rainbow')await click('[data-cell="28"]');
  await waitUntil('BloomAudio.lastEffect==='+JSON.stringify(kind));assert((await signal())>.0001,kind+' must generate an audible signal');await waitTurn();
 }
 for(const kind of ['hammer','glove','watering','dice']){
  await setupSpecial('normal');
  await evaluate('BloomDemo.game.boosters={hammer:1,glove:1,watering:1,dice:1,maxUses:20};document.querySelectorAll(".booster-button").forEach(n=>n.disabled=false)');
  await click('[data-booster="'+kind+'"]');
  if(kind==='dice')await click('[data-booster="dice"]');
  else{
   const index=await evaluate(`BloomDemo.game.board.findIndex((t,i)=>BloomDemo.game.boosterTargets('${kind}',i).length)`);
   assert(index>=0);await click('[data-cell="'+index+'"]');
   if(kind==='watering')await click('[data-cell="'+index+'"]');
   if(kind==='glove'){const target=await evaluate(`BloomDemo.game.boosterTargets('glove',${index})[0]`);await click('[data-cell="'+target+'"]');}
  }
  await waitUntil('BloomAudio.lastEffect==='+JSON.stringify(kind));assert((await signal())>.0001,kind+' must generate an audible signal');await waitTurn();
 }
 await sleep(800);assert.equal(await evaluate('BloomAudio.voices'),0,'finished one-shots must clean up');
 await click('.hud-mascot');await waitUntil('BloomAudio.playing==="home"');
 await evaluate("(()=>{const key=BloomData.CONFIG.storageKey,data=JSON.parse(localStorage.getItem(key));delete data.audioProfile;data.audio.master=79;localStorage.setItem(key,JSON.stringify(data));})()");await send('Page.reload');await waitUntil('!!window.BloomAudio');assert.equal(await evaluate('BloomAudio.volumes.master'),80);
 await click('.home-settings');await click('[data-action="sound"]');assert.equal(await evaluate('document.querySelector(".sound-toggle").getAttribute("aria-pressed")'),'false');
 await send('Page.reload');await waitUntil('!!window.BloomAudio');await click('.home-settings');assert.equal(await evaluate('document.querySelector(".sound-toggle").getAttribute("aria-pressed")'),'false');
 assert.deepEqual(errors,[]);console.log('PASS exact rules, two actual music signals, all seven tool signals, independent 0% mute, live percentages, persisted volumes, track switching and voice cleanup');
 await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Browser tests timed out');proc.kill();process.exit(1);},180000);
run().then(()=>{clearTimeout(timeout);console.log('Browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
