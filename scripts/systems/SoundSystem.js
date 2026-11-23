// Original offline cues, separate music/SFX buses and a perceptual volume taper.
const audioMix={context:null,master:null,music:null,effects:null,analyser:null,noise:null,buffers:new Map(),track:null,scene:'home',ticket:0,unlocked:false,voices:new Set(),lastEffect:null,lastEffectAt:-Infinity};
const volumeGain=value=>value<=0?0:Math.pow(value/100,2);
function applyAudioSettings(){
 if(!audioMix.context)return;
 const now=audioContext.currentTime,v=saved.audio;
 audioMix.master.gain.setTargetAtTime(volumeGain(v.master)*.8,now,.025);
 audioMix.music.gain.setTargetAtTime(volumeGain(v.music)*.55,now,.025);
 audioMix.effects.gain.setTargetAtTime(saved.sound?volumeGain(v.effects)*.30:0,now,.015);
}
function unlockAudio(){
 try{
  if(!audioMix.context){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
   audioContext=new Context();audioMix.context=audioContext;
   for(const key of ['master','music','effects'])audioMix[key]=audioContext.createGain();
   const limiter=audioContext.createDynamicsCompressor();
   limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=12;limiter.attack.value=.004;limiter.release.value=.18;
   audioMix.analyser=audioContext.createAnalyser();audioMix.analyser.fftSize=1024;
   audioMix.music.connect(audioMix.master);
   const effectsLow=audioContext.createBiquadFilter(),effectsHigh=audioContext.createBiquadFilter();
   effectsLow.type='lowpass';effectsLow.frequency.value=1600;effectsLow.Q.value=.5;
   effectsHigh.type='highpass';effectsHigh.frequency.value=140;effectsHigh.Q.value=.5;
   audioMix.effects.connect(effectsHigh);effectsHigh.connect(effectsLow);effectsLow.connect(audioMix.master);
   audioMix.master.connect(limiter);limiter.connect(audioMix.analyser);audioMix.analyser.connect(audioContext.destination);
   audioMix.noise=audioContext.createBuffer(1,audioContext.sampleRate*.65,audioContext.sampleRate);
   const noise=audioMix.noise.getChannelData(0);for(let i=0;i<noise.length;i++)noise[i]=Math.random()*2-1;
   applyAudioSettings();
  }
  audioMix.unlocked=true;
  if(audioContext.state==='suspended'&&!document.hidden)audioContext.resume().catch(()=>{});
  void playMusic();
  return true;
 }catch{return false;}
}
async function musicBuffer(scene){
 if(!audioMix.buffers.has(scene)){
  // Yield between bounded chunks; first gestures and scene changes can paint immediately.
  const pending=(async()=>{
   await new Promise(resolve=>setTimeout(resolve,0));
   const encoded=BloomAssets['music_'+scene].split(',')[1];
   const padding=encoded.endsWith('==')?2:encoded.endsWith('=')?1:0,bytes=new Uint8Array(encoded.length/4*3-padding);
   let offset=0;
   for(let start=0;start<encoded.length;start+=65536){
    const raw=atob(encoded.slice(start,start+65536));
    for(let i=0;i<raw.length;i++)bytes[offset++]=raw.charCodeAt(i);
    if(start+65536<encoded.length)await new Promise(resolve=>setTimeout(resolve,0));
   }
   return audioContext.decodeAudioData(bytes.buffer);
  })().catch(()=>null);
  audioMix.buffers.set(scene,pending);
 }
 return audioMix.buffers.get(scene);
}
async function playMusic(){
 if(!audioMix.unlocked||!audioMix.context||audioMix.track?.scene===audioMix.scene)return;
 const ticket=++audioMix.ticket,scene=audioMix.scene,buffer=await musicBuffer(scene);
 if(!buffer||ticket!==audioMix.ticket||scene!==audioMix.scene)return;
 const now=audioContext.currentTime,previous=audioMix.track;
 if(previous){previous.gain.gain.cancelScheduledValues(now);previous.gain.gain.setValueAtTime(previous.gain.gain.value,now);previous.gain.gain.linearRampToValueAtTime(0,now+.3);previous.source.stop(now+.32);}
 const source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;source.loop=true;
 source.connect(gain);gain.connect(audioMix.music);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.4);
 source.onended=()=>{source.disconnect();gain.disconnect();};
 audioMix.track={scene,source,gain};source.start(now);
}
function setMusicScene(scene){
 audioMix.scene=scene==='game'?'game':'home';
 if(audioMix.unlocked)void playMusic();
}
function audioVoice(source,gain,start,duration){
 // Bound simultaneous one-shots and release their graph connections when finished.
 if(audioMix.voices.size>=16){source.disconnect();gain.disconnect();return;}
 audioMix.voices.add(source);source.onended=()=>{audioMix.voices.delete(source);source.disconnect();gain.disconnect();};
 source.start(start);source.stop(start+duration);
}
function audioTone(freq,offset=0,duration=.18,volume=.1,shape='sine',endFreq=freq){
 const now=audioContext.currentTime+offset,source=audioContext.createOscillator(),gain=audioContext.createGain();
 source.type=shape;source.frequency.setValueAtTime(freq,now);source.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+duration);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.025);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 source.connect(gain);gain.connect(audioMix.effects);audioVoice(source,gain,now,duration+.02);
}
function audioNoise(offset,duration,volume,from,to,filterType='lowpass'){
 const now=audioContext.currentTime+offset,source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
 source.buffer=audioMix.noise;filter.type=filterType;filter.frequency.setValueAtTime(from,now);filter.frequency.exponentialRampToValueAtTime(to,now+duration);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 source.connect(filter);filter.connect(gain);gain.connect(audioMix.effects);
 source.onended=null;
 if(audioMix.voices.size>=16){source.disconnect();filter.disconnect();gain.disconnect();return;}
 audioMix.voices.add(source);source.onended=()=>{audioMix.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
 source.start(now);source.stop(now+duration+.02);
}
function sound(type){
 if(!unlockAudio()||!saved.sound||saved.audio.effects===0||saved.audio.master===0)return;
 const stamp=audioContext.currentTime;
 if(type===audioMix.lastEffect&&stamp-audioMix.lastEffectAt<.09)return;
 audioMix.lastEffect=type;audioMix.lastEffectAt=stamp;
 const chord=(notes,spacing=.065,duration=.2,volume=.1)=>notes.forEach((freq,i)=>audioTone(freq,i*spacing,duration,volume));
 if(type==='rocket'){audioNoise(0,.32,.065,420,1100,'bandpass');audioTone(330,0,.32,.075,'sine',660);}
 else if(type==='bomb'){audioTone(220,0,.30,.09,'sine',165);audioNoise(.035,.23,.055,650,300);}
 else if(type==='rainbow'){chord([349,440,523,698],.10,.32,.065);}
 else if(type==='hammer'){audioTone(330,0,.16,.09,'sine',220);audioNoise(0,.08,.035,850,400);}
 else if(type==='glove'){audioNoise(0,.22,.04,550,850,'bandpass');chord([392,523],.12,.22,.06);}
 else if(type==='watering'){audioNoise(0,.38,.045,750,1200,'bandpass');chord([349,440,523],.10,.24,.055);}
 else if(type==='dice'){chord([330,392,440,523],.09,.16,.065);}
 else if(type==='combo'){chord([262,349,440,523],.09,.34,.07);audioNoise(0,.24,.035,700,350);}
 else if(type==='win')chord([349,440,523,698],.16,.46,.075);
 else if(type==='create'||type==='special')chord([349,440,523],.10,.28,.06);
 else if(type==='bad')audioTone(220,0,.16,.045,'sine',196);
 else chord([349,440],.055,.16,.05);
}
function setAudioVolume(channel,value){
 if(!['master','music','effects'].includes(channel))return;
 saved.audio[channel]=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
 persist();applyAudioSettings();
 const output=document.querySelector('[data-volume-output="'+channel+'"]');if(output)output.textContent=saved.audio[channel]+'%';
}
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('keydown',unlockAudio,{passive:true});
document.addEventListener('input',event=>{const node=event.target.closest('[data-volume]');if(node)setAudioVolume(node.dataset.volume,node.value);});
document.addEventListener('change',event=>{const node=event.target.closest('[data-volume]');if(node&&node.dataset.volume==='effects')sound('pop');});
document.addEventListener('visibilitychange',()=>{if(!audioMix.context)return;if(document.hidden)audioContext.suspend().catch(()=>{});else if(audioMix.unlocked)audioContext.resume().catch(()=>{});});
// Inspection is read-only; analyser samples also verify the actual audio signal in tests.
globalThis.BloomAudio={
 get scene(){return audioMix.scene;},
 get playing(){return audioMix.track?.scene||null;},
 get state(){return audioMix.context?.state||'locked';},
 get volumes(){return {...saved.audio};},
 get voices(){return audioMix.voices.size;},
 get lastEffect(){return audioMix.lastEffect;},
 level(){if(!audioMix.analyser)return 0;const data=new Float32Array(1024);audioMix.analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);}
};

