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

 await send('Emulation.setDeviceMetricsOverride',{width:393,height:873,deviceScaleFactor:3,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await send('Emulation.setCPUThrottlingRate',{rate:6});
 await send('Performance.enable');
 await send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'../index.html')).href});
 await waitUntil('!!window.BloomDemo');
 const cold=[];
 for(const sel of ['.home-start','[data-action="start"]'])cold.push(await evaluate(`(()=>{const t=performance.now();document.querySelector(${JSON.stringify(sel)}).click();return {selector:${JSON.stringify(sel)},handlerMs:performance.now()-t}})()`));
 await sleep(700);
 const results=[];
 for(const name of ['bottom-clear','bottom-clear-repeat','segment-shuffle']){
  await evaluate(`(()=>{const g=BloomDemo.game;g.level={...g.level,goals:[{kind:'color',color:5,target:999}]};g.status='playing';g.moves=40;g.board=g.board.map((_,i)=>g.tile(i%5));for(let i=48;i<72;i++)g.board[i]=g.tile(0);for(let i=0;i<72;i++){const t=g.board[i],n=document.querySelector('[data-cell="'+i+'"]');n.className='cell c'+t.color;n.dataset.tileId=t.id;n.innerHTML=Art.token(t.color);}if(${JSON.stringify(name)}==='segment-shuffle'){g.boosters={hammer:0,glove:0,watering:0,dice:1,maxUses:1};g.boosterUses=0;document.querySelector('[data-booster="dice"]').disabled=false;}})()`);
  await sleep(150);
  await evaluate(`(()=>{const p=window.mobileProbe={frames:[],reads:{},longTasks:[],phases:[],replaced:0,clones:0,active:true,originals:Array.from(document.querySelector('#board').children)};p.observer=new PerformanceObserver(list=>{for(const e of list.getEntries())p.longTasks.push({start:e.startTime,ms:e.duration})});p.observer.observe({type:'longtask'});p.mutation=new MutationObserver(list=>{for(const e of list){if(e.type==='attributes')p.phases.push({phase:document.querySelector('#board').dataset.phase,time:performance.now()});else p.replaced+=e.removedNodes.length;}});p.mutation.observe(document.querySelector('#board'),{childList:true,attributes:true,attributeFilter:['data-phase']});const read=Element.prototype.getBoundingClientRect;p.read=read;Element.prototype.getBoundingClientRect=function(...args){const phase=document.querySelector('#board')?.dataset.phase||'idle';p.reads[phase]=(p.reads[phase]||0)+1;return read.apply(this,args)};const clone=Node.prototype.cloneNode;p.clone=clone;Node.prototype.cloneNode=function(...args){p.clones++;return clone.apply(this,args)};let last=performance.now();const frame=now=>{if(!p.active)return;p.frames.push({ms:now-last,phase:document.querySelector('#board')?.dataset.phase||'idle'});last=now;requestAnimationFrame(frame)};requestAnimationFrame(frame);})()`);
  const before=Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const handlerMs=await evaluate(`(()=>{const t=performance.now();${name==='segment-shuffle'?`document.querySelector('[data-booster="dice"]').click();document.querySelector('[data-booster="dice"]').click();`:`document.querySelector('[data-cell="48"]').click();`}return performance.now()-t})()`);
  await waitTurn();await sleep(50);
  const after=Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const sample=await evaluate(`(()=>{const p=mobileProbe;p.active=false;p.observer.disconnect();p.mutation.disconnect();Element.prototype.getBoundingClientRect=p.read;Node.prototype.cloneNode=p.clone;const byPhase={};for(const f of p.frames.slice(1)){(byPhase[f.phase]??=[]).push(f.ms);}for(const [key,frames]of Object.entries(byPhase)){frames.sort((a,b)=>a-b);byPhase[key]={samples:frames.length,p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)}}return {reads:p.reads,replaced:p.replaced,clones:p.clones,preservedCells:p.originals.filter(n=>n.isConnected).length,artworkRestored:Array.from(document.querySelectorAll('#board [data-cell]')).every(n=>!BloomDemo.game.board[Number(n.dataset.cell)]||!!n.querySelector('.fruit')),longTasks:p.longTasks,byPhase,clean:!document.querySelector('.fall-clip,.falling-tile')}})()`);
  const metrics={};for(const k of ['LayoutCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'])metrics[k]=+(after[k]-before[k]).toFixed(5);
  assert(sample.clean,'animation layers must be cleared');
  assert(sample.clones===0,'falling must reuse artwork instead of cloning it');
  assert(sample.preservedCells===72&&sample.replaced===0,'turn must preserve all 72 grid slots');
  assert(sample.artworkRestored,'moving artwork must return to every occupied slot');
  assert((sample.reads.fall||0)<=80,'fall geometry must be measured once per slot');
  results.push({name,handlerMs,...sample,...metrics});
 }
 const touchPoint=await evaluate(`(()=>{window.touchProbe={};document.addEventListener('pointerup',()=>touchProbe.pointerup=performance.now(),{once:true,capture:true});document.addEventListener('click',()=>touchProbe.click=performance.now(),{once:true,capture:true});const r=document.querySelector('[data-cell="0"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});
 await sleep(30);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await waitUntil('!!window.touchProbe.click');
 const touch=await evaluate('({pointerupToClickMs:touchProbe.click-touchProbe.pointerup})');
 await waitTurn();
 assert.deepEqual(errors,[]);
 const report={viewport:'393x873',deviceScaleFactor:3,cpuSlowdown:6,cold,touch,results};
 console.log(JSON.stringify(report,null,2));
 if(process.env.PERF_OUTPUT)fs.writeFileSync(process.env.PERF_OUTPUT,JSON.stringify(report,null,2)+'\n');
 await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{proc.kill();process.exit(1)},120000);
run().then(()=>{clearTimeout(timeout);ws?.close();proc.kill()}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1});
