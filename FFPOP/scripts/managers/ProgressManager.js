let migrateAudio=false;
let saved={stars:{},sound:true,audioProfile:2,audio:{master:80,music:45,effects:75},announcedChapters:[]};try{const data=JSON.parse(localStorage.getItem(BloomData.CONFIG.storageKey));if(data&&typeof data.stars==='object'&&data.stars){for(const [key,value]of Object.entries(data.stars))if(Number(key)>=1&&Number(key)<=50&&Number.isInteger(value)&&value>=1&&value<=3)saved.stars[key]=value;}if(Array.isArray(data?.announcedChapters))saved.announcedChapters=[...new Set(data.announcedChapters.filter(n=>Number.isInteger(n)&&n>=1&&n<=4))];if(typeof data?.sound==='boolean')saved.sound=data.sound;for(const channel of ['master','music','effects'])if(typeof data?.audio?.[channel]==='number'&&Number.isFinite(data.audio[channel]))saved.audio[channel]=Math.max(0,Math.min(100,Math.round(data.audio[channel])));if(data?.audioProfile!==2){saved.audio.master=80;migrateAudio=true;}}catch{}
function persist(){try{localStorage.setItem(BloomData.CONFIG.storageKey,JSON.stringify(saved));}catch{}}
if(migrateAudio)persist();
function nextLevel(){for(let n=1;n<=50;n++)if(!saved.stars[n])return n;return 50;}
function completeCount(){return Object.keys(saved.stars).length;}
