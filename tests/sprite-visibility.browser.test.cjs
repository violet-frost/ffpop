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


 // Reproduce the animation contract: hide originals while their visible clones move.
 await evaluate(`(()=>{
  const host=document.createElement('div');host.id='sprite-probe';
  host.style.cssText='position:fixed;left:0;top:0;width:1100px;height:130px;background:#20413e;z-index:9999;display:flex';
  const originals=document.createElement('div'); originals.id='probe-originals';
  for(let color=0;color<6;color++){
   const source=document.createElement('div');source.style.cssText='width:100px;height:100px';source.innerHTML=Art.token(color);
   originals.append(source);const clone=source.cloneNode(true);clone.className='sprite-copy';host.append(clone);
  }
  const rocket=document.createElement('div');rocket.style.cssText='width:100px;height:100px';rocket.innerHTML=Art.special('rocket','h');originals.append(rocket);
  host.append(rocket.cloneNode(true));document.body.append(originals,host);
  originals.style.visibility='hidden';
 })()`);
 await sleep(100);
 const rects=await evaluate('Array.from(document.querySelector("#sprite-probe").children,n=>n.getBoundingClientRect().toJSON())');
 async function pixels(){
  const capture=await send('Page.captureScreenshot',{format:'png'});
  return evaluate(`(async()=>{
   const img=new Image();img.src='data:'+ 'image/png;base64,'+${JSON.stringify(capture.data)};await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   return ${JSON.stringify(rects)}.map(r=>{
    const data=ctx.getImageData(Math.round(r.x+10),Math.round(r.y+10),80,80).data;let count=0;
    for(let i=0;i<data.length;i+=4)if(data[i]>95||data[i+2]>140)count++;
    return count;
   });
  })()`);
 }
 const hiddenSourcePixels=await pixels();
 // A control showing the exact same copies while the original definition is visible.
 await evaluate('document.querySelector("#probe-originals").style.visibility="visible"');
 const controlPixels=await pixels();
 console.log({hiddenSourcePixels,controlPixels});
 for(let n=0;n<controlPixels.length;n++){
  assert(controlPixels[n]>700,'control sprite must render');
  assert(hiddenSourcePixels[n]>controlPixels[n]*.9,'sprite '+n+' disappears when its original is hidden during animation');
 }
 await evaluate('document.querySelector("#sprite-probe").remove();document.querySelector("#probe-originals").remove()');
 assert.deepEqual(errors,[]);
 console.log('PASS actual rendered pixels: all six fruits/flowers and flying rocket remain visible with hidden originals');
 await send('Browser.close',{},null).catch(()=>{});
}
const timeout=setTimeout(()=>{console.error('Browser tests timed out');proc.kill();process.exit(1);},180000);
run().then(()=>{clearTimeout(timeout);console.log('Browser checks complete.');ws?.close();proc.kill();}).catch(e=>{clearTimeout(timeout);console.error(e);ws?.close();proc.kill();process.exitCode=1;});
