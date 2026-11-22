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

 await send('Emulation.setCPUThrottlingRate',{rate:4});
 await send('Performance.enable');
 const results=[];
 for(const [name,kinds] of [['normal',[]],['rainbow-rocket',[[27,'rainbow'],[28,'rocket','v']]],['rainbow-bomb',[[27,'rainbow'],[28,'bomb']]],['rainbow-rainbow',[[27,'rainbow'],[28,'rainbow']]]]){
  await setup(kinds);
  if(name==='normal')await evaluate("BloomDemo.game.board[1].color=BloomDemo.game.board[0].color");
  await sleep(350);
  const dom=await evaluate("({nodes:document.querySelectorAll('#board *').length,markup:document.querySelector('#app').innerHTML.length})");
  await evaluate("(()=>{window.perfProbe={frames:[],longTasks:[],peakAnimations:0,peakEffects:0,active:true};const p=perfProbe;p.observer=new PerformanceObserver(list=>{for(const e of list.getEntries())p.longTasks.push(e.duration)});p.observer.observe({type:'longtask'});let last=performance.now();function frame(now){if(!p.active)return;p.frames.push(now-last);last=now;p.peakAnimations=Math.max(p.peakAnimations,document.getAnimations().length);p.peakEffects=Math.max(p.peakEffects,document.querySelectorAll('.turn-effects *').length);requestAnimationFrame(frame)}requestAnimationFrame(frame);})()");
  const before=Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  await click(name==='normal'?'[data-cell="0"]':'[data-cell="27"]');
  if(name!=='normal')await click('[data-cell="28"]');
  await waitTurn();await sleep(80);
  const after=Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const sample=await evaluate("(()=>{const p=perfProbe;p.active=false;p.observer.disconnect();const f=p.frames.slice(1).sort((a,b)=>a-b);return {frames:f.length,p95FrameMs:f[Math.floor(f.length*.95)],maxFrameMs:f.at(-1),over50ms:f.filter(x=>x>50).length,longTaskMs:p.longTasks,peakAnimations:p.peakAnimations,peakEffects:p.peakEffects,clean:!document.querySelector('.turn-effects,.fall-clip')}})()");
  const metrics={};for(const key of ['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'])metrics[key]=+(after[key]-before[key]).toFixed(5);
  assert(sample.clean,'turn must release all layers');
  assert(dom.markup<100000,'images must reuse compact URLs rather than embed base64 in the DOM');
  assert(sample.peakAnimations<=400,'combo animation budget exceeded');
  assert(sample.peakEffects<=800,'combo SVG node budget exceeded');
  results.push({name,...dom,...sample,...metrics});
 }
 assert.deepEqual(errors,[]);
 const report={cpuSlowdown:4,viewport:'393x873',htmlBytes:fs.statSync(path.resolve(__dirname,'../index.html')).size,results};
 console.log(JSON.stringify(report,null,2));
 if(process.env.PERF_OUTPUT)fs.writeFileSync(process.env.PERF_OUTPUT,JSON.stringify(report,null,2)+'\n');
 await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{proc.kill();process.exit(1)},120000);
run().then(()=>{clearTimeout(timeout);ws?.close();proc.kill()}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1});
