(function(root){
'use strict';
// Presentation only: the deterministic rule engine is never delayed or modified.
const TIMING=Object.freeze(globalThis.BloomData.MOTION);
let paused=false;
const activeAnimations=new Set(),activeWaits=new Set();
function pause(){if(paused)return;paused=true;activeAnimations.forEach(a=>{if(a.playState==='running')a.pause();});activeWaits.forEach(w=>w.pause());}
function resume(){if(!paused)return;paused=false;activeWaits.forEach(w=>w.resume());activeAnimations.forEach(a=>{if(a.playState==='paused')a.play();});}
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
async function run({game,before,response,clicked,commit,signal,onPhase}){
 const board=document.querySelector('#board'),wrap=board.closest('.board-wrap');
 const animations=[],layers=[],hidden=[];
 const displayed=before.slice();
 const old=new Map();
 before.forEach((tile,index)=>{const node=board.querySelector(`[data-cell="${index}"]`);if(tile&&node)old.set(tile.id,{tile,index,node,rect:node.getBoundingClientRect()});});
 const check=()=>{if(signal.aborted)throw new DOMException('Turn cancelled','AbortError');};
 const wait=ms=>new Promise((resolve,reject)=>{
  check();let remaining=reduced()?0:ms,timer,started;
  const finish=()=>{activeWaits.delete(clock);signal.removeEventListener('abort',stop);resolve();};
  const clock={
   pause(){if(timer!==undefined){clearTimeout(timer);timer=undefined;remaining=Math.max(0,remaining-(performance.now()-started));}},
   resume(){if(timer!==undefined)return;started=performance.now();timer=setTimeout(finish,remaining);}
  };
  const stop=()=>{clearTimeout(timer);activeWaits.delete(clock);signal.removeEventListener('abort',stop);reject(new DOMException('Turn cancelled','AbortError'));};
  activeWaits.add(clock);signal.addEventListener('abort',stop,{once:true});if(!paused)clock.resume();
 });
 const animate=(node,frames,options)=>{if(reduced())return;const a=node.animate(frames,options);animations.push(a);activeAnimations.add(a);if(paused)a.pause();return a;};
 const phase=name=>{check();board.dataset.phase=name;onPhase?.(name);};
 const byIndex=index=>old.get(displayed[index]?.id);
 const makeFX=()=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const box=wrap.getBoundingClientRect(),r={left:box.left+wrap.clientLeft,top:box.top+wrap.clientTop,width:wrap.clientWidth,height:wrap.clientHeight};svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);svg.setAttribute('class','turn-effects');svg.setAttribute('aria-hidden','true');wrap.append(svg);layers.push(svg);return {svg,rect:r};};
 const shape=(svg,tag,attrs)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));svg.append(node);return node;};
 async function swap(){
  if(!response.swap)return;
  phase('swap');const {from,to}=response.swap,a=byIndex(from),b=byIndex(to);
  if(!a||!b)return;
  const ar=a.rect,br=b.rect,dx=br.left-ar.left,dy=br.top-ar.top;
  animate(a.node,[{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx/2}px,${dy/2}px) scale(1.16)`,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(1)`}],{duration:TIMING.swap,easing:'ease-in-out',fill:'forwards'});
  animate(b.node,[{transform:'translate(0,0)'},{transform:`translate(${-dx}px,${-dy}px)`}],{duration:TIMING.swap,easing:'ease-in-out',fill:'forwards'});
  await wait(TIMING.swap);[displayed[from],displayed[to]]=[displayed[to],displayed[from]];
  a.rect=br;a.index=to;b.rect=ar;b.index=from;
 }
 function release(){
  if(reduced())return 0;
  const {svg,rect}=makeFX();let endTime=0,petalCount=0;
  const sparked=new Set(),launched=new Set();
  const palette=['#ef92b1','#f4ce6f','#9ecb7d','#85d2c4','#b39ade','#94c8ed'];
  const point=index=>{const item=byIndex(index);return item?{x:item.rect.left+item.rect.width/2-rect.left,y:item.rect.top+item.rect.height/2-rect.top,size:item.rect.width,item}:null;};
  const fx=(node,frames,duration,delay=0,easing='ease-out')=>{animate(node,frames,{duration,delay,easing,fill:'both'});endTime=Math.max(endTime,delay+duration);return node;};
  const fade=[{opacity:0},{opacity:1,offset:.18},{opacity:.8,offset:.65},{opacity:0}];
  function spark(x,y,size,delay,color='#fff1a0'){
   // One burst per position per release; six rays share one animated path.
   const key=`${Math.round(x)},${Math.round(y)}`;if(sparked.has(key))return;sparked.add(key);
   const g=shape(svg,'g',{'class':'impact-spark',transform:`translate(${x} ${y})`});
   const d=Array.from({length:6},(_,n)=>{const a=n*Math.PI/3,c=Math.cos(a),s=Math.sin(a);return `M${c*size*.1} ${s*size*.1}L${c*size*.32} ${s*size*.32}`;}).join('');
   const ray=shape(g,'path',{d,fill:'none',stroke:color,'stroke-width':2,'stroke-linecap':'round'});
   fx(ray,[{transform:'scale(.3)',opacity:0},{transform:'scale(1)',opacity:1,offset:.3},{transform:'scale(1.6)',opacity:0}],TIMING.impact,delay);
  }
  function wave(x,y,radius,delay,color='#ffe6a0',layersCount=2){
   for(let n=0;n<layersCount;n++){
    const ring=shape(svg,'circle',{'class':'blast-ring',cx:x,cy:y,r:radius,fill:n?'none':color+'33',stroke:color,'stroke-width':n?2:5});ring.style.transformOrigin=`${x}px ${y}px`;
    fx(ring,[{transform:'scale(.08)',opacity:0},{transform:'scale(.55)',opacity:1,offset:.32},{transform:'scale(1.12)',opacity:0}],TIMING.launch,delay+n*65);
   }
   for(let n=0;n<10&&petalCount<48;n++,petalCount++){const a=n*2.3999,dx=Math.cos(a)*radius,dy=Math.sin(a)*radius;const petal=shape(svg,'ellipse',{cx:x,cy:y,rx:3,ry:6,fill:palette[n%6]});petal.style.transformOrigin=`${x}px ${y}px`;fx(petal,[{transform:'translate(0,0) rotate(0deg)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${dx}px,${dy}px) rotate(${n*63}deg)`,opacity:0}],TIMING.launch,delay);}
  }
  function power(kind,axis,x,y,size,cls){
   const g=shape(svg,'g',{'class':cls});const nested=new DOMParser().parseFromString(Art.special(kind,axis),'image/svg+xml').documentElement;
   nested.setAttribute('x',-size/2);nested.setAttribute('y',-size/2);nested.setAttribute('width',size);nested.setAttribute('height',size);g.append(document.importNode(nested,true));
   const anchor=shape(svg,'g',{transform:`translate(${x} ${y})`});anchor.append(g);return g;
  }
  function launch(index,axis,delay=0){
   const p=point(index);if(!p)return;
   // Share overlapping combo sweeps; all hits still resolve in BoardModel.
   const key=axis+':'+(axis==='h'?game.row(index):game.col(index));if(launched.has(key))return;launched.add(key);
   const {x,y,size}=p,h=axis==='h';
   // Two visible, oppositely oriented noses sweep the complete row/column from the source.
   for(const direction of [1,-1]){
    const dx=h?(direction===1?rect.width+size-x:-size-x):0,dy=h?0:(direction===1?-size-y:rect.height+size-y),distance=Math.hypot(dx,dy);
    const beam=shape(svg,'line',{'class':'rocket-trail',x1:x,y1:y,x2:x+dx,y2:y+dy,stroke:'#ffe48b','stroke-width':size*.19,'stroke-linecap':'round','stroke-dasharray':distance,'stroke-dashoffset':distance});
    fx(beam,[{strokeDashoffset:String(distance),opacity:0},{strokeDashoffset:String(distance*.92),opacity:1,offset:.15},{strokeDashoffset:'0',opacity:.8,offset:.86},{strokeDashoffset:'0',opacity:0}],TIMING.launch,delay,'cubic-bezier(.45,0,.85,.7)');
    const core=shape(svg,'line',{x1:x,y1:y,x2:x+dx,y2:y+dy,stroke:'#fffef0','stroke-width':2,'stroke-dasharray':distance});
    fx(core,[{strokeDashoffset:String(distance),opacity:0},{strokeDashoffset:'0',opacity:1,offset:.9},{opacity:0}],TIMING.launch,delay);
    const rocket=power('rocket',axis,x,y,size*1.1,'flying-rocket');
    // h artwork points right; v artwork points up. Reverse nose and exhaust together.
    const angle=direction===1?0:180;
    const flame=shape(rocket,'ellipse',{cx:h?-size*.33:0,cy:h?0:size*.33,rx:h?size*.2:size*.1,ry:h?size*.1:size*.2,fill:'#ffcc5c'});rocket.prepend(flame);
    fx(rocket,[{transform:`translate(0,0) rotate(${angle}deg) scale(.8)`,opacity:0},{opacity:1,offset:.06},{transform:`translate(${dx}px,${dy}px) rotate(${angle}deg) scale(1.05)`,opacity:1,offset:.94},{transform:`translate(${dx}px,${dy}px) rotate(${angle}deg)`,opacity:0}],TIMING.launch,delay,'cubic-bezier(.45,0,.85,.7)');
   }
   displayed.forEach((t,j)=>{if(!t)return;const q=point(j);if(!q)return;if(h?game.row(j)===game.row(index):game.col(j)===game.col(index)){const distance=h?Math.abs(q.x-x)/rect.width:Math.abs(q.y-y)/rect.height;spark(q.x,q.y,size,delay+TIMING.launch*(.18+distance*.65));}});
  }
  function link(index,targets,delay=0){
   const p=point(index);if(!p)return;
   targets.forEach((j,n)=>{const q=point(j);if(!q||j===index)return;const path=shape(svg,'path',{'class':'rainbow-link',d:`M${p.x} ${p.y} Q${(p.x+q.x)/2+22} ${(p.y+q.y)/2-28} ${q.x} ${q.y}`,fill:'none',stroke:palette[n%6],'stroke-width':3,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':1});
    fx(path,[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:1,offset:.6},{strokeDashoffset:0,opacity:0}],TIMING.rainbowLink,delay+Math.min(n*8,120));spark(q.x,q.y,q.size,delay+TIMING.rainbowLink*.7+Math.min(n*8,120),palette[n%6]);
   });
  }
  function fusion(event,delay){
   const p=point(event.index),q=point(event.partner);if(!p||!q)return;
   const mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2};
   for(const source of [p,q]){const orb=shape(svg,'circle',{'class':'fusion-orb',cx:source.x,cy:source.y,r:source.size*.24,fill:'#fff4bf'});orb.style.transformOrigin=`${source.x}px ${source.y}px`;fx(orb,[{transform:'translate(0,0) scale(.7)',opacity:0},{opacity:1,offset:.25},{transform:`translate(${mid.x-source.x}px,${mid.y-source.y}px) scale(1.35)`,opacity:0}],TIMING.comboFuse,delay);}
   spark(mid.x,mid.y,p.size*1.7,delay+TIMING.comboFuse*.6);return p;
  }
  const events=response.effects||response.fired.map(index=>({...displayed[index],index}));
  events.forEach((event,order)=>{
   const p=point(event.index);if(!p)return;let delay=Math.min(order*TIMING.comboStagger,330);
   if(event.kind==='combo'){
    fusion(event,delay);delay+=TIMING.comboFuse;const kinds=event.combo.split('+');
    if(kinds.every(k=>k==='rainbow')){
     wave(p.x,p.y,Math.max(rect.width,rect.height),delay,'#fff1be',3);link(event.index,event.targets,delay);event.targets.forEach((j,n)=>{const q=point(j);if(q)spark(q.x,q.y,q.size,delay+Math.min(n*9,340),palette[n%6]);});
    }else if(kinds.includes('rainbow')){
     const rainbowIndex=displayed[event.index]?.kind==='rainbow'?event.index:event.partner;
     link(rainbowIndex,event.converted,delay);
     const convertAt=delay+TIMING.rainbowLink+120;
     event.converted.forEach((j,n)=>{
      const q=point(j);if(!q)return;const at=convertAt+Math.min(n*TIMING.comboStagger,275),ghost=power(event.sourceKind,'h',q.x,q.y,q.size,'converted-power');
      animate(q.item.node,[{opacity:1},{opacity:0}],{duration:TIMING.comboFuse*.6,delay:at,fill:'forwards'});
      fx(ghost,[{transform:'scale(.2)',opacity:0},{transform:'scale(1.2)',opacity:1,offset:.35},{transform:'scale(1)',opacity:1,offset:.85},{opacity:0}],TIMING.comboFuse,at);
      if(event.sourceKind==='rocket'){launch(j,'h',at+TIMING.comboFuse);launch(j,'v',at+TIMING.comboFuse);}else wave(q.x,q.y,q.size*1.5,at+TIMING.comboFuse);
     });
     // The partner also fires even when no ordinary tile shares its color.
     const partner=displayed[event.index]?.kind==='rainbow'?event.partner:event.index,q=point(partner);
     if(event.sourceKind==='rocket'){launch(partner,'h',convertAt);launch(partner,'v',convertAt);}else if(q)wave(q.x,q.y,q.size*1.5,convertAt);
    }else if(kinds.every(k=>k==='rocket')){
     launch(event.index,'h',delay);launch(event.index,'v',delay+TIMING.comboStagger);launch(event.partner,displayed[event.partner].axis,delay+TIMING.comboStagger);
    }else if(kinds.every(k=>k==='bomb')){
     wave(p.x,p.y,p.size*2.5,delay,'#ffe2a0',3);const q=point(event.partner);if(q)wave(q.x,q.y,q.size*1.5,delay+TIMING.comboStagger,'#f5b7cb');
    }else{
     wave(p.x,p.y,p.size*1.15,delay,'#ffe2a0',2);
     for(let offset=-1;offset<=1;offset++){
      const r=game.row(event.index)+offset,c=game.col(event.index)+offset;
      if(r>=0&&r<game.rows)launch(r*game.cols+game.col(event.index),'h',delay+TIMING.impact+Math.abs(offset)*TIMING.comboStagger);
      if(c>=0&&c<game.cols)launch(game.row(event.index)*game.cols+c,'v',delay+TIMING.impact+Math.abs(offset)*TIMING.comboStagger);
     }
    }
   }else if(event.kind==='rocket')launch(event.index,event.axis,delay);
   else if(event.kind==='bomb')wave(p.x,p.y,p.size*1.5,delay);
   else if(event.kind==='rainbow'){wave(p.x,p.y,p.size*.8,delay,'#efd0ef');link(event.index,event.targets,delay);}
  });
  // Hide consumed launch bodies; the layer carries their moving copies until clear.
  for(const index of response.fired){const p=point(index);if(p&&displayed[index]?.kind==='rocket'&&response.removed.includes(index)){p.item.node.style.visibility='hidden';hidden.push(p.item.node);}}
  return endTime;
 }
 async function fallFlow(){
  const bounds=wrap.getBoundingClientRect(),left=bounds.left+wrap.clientLeft,top=bounds.top+wrap.clientTop,slots=Array.from(board.children,n=>n.getBoundingClientRect()),pitchX=slots[1].left-slots[0].left,pitchY=slots[game.cols].top-slots[0].top;
  const layer=document.createElement('div');layer.className='fall-clip flow-layer';layer.setAttribute('aria-hidden','true');layer.style.cssText='inset:0;width:100%;height:100%';
  // Mask holes and intact boxes, while allowing paths to cross between neighboring columns.
  const mask=slots.flatMap((r,i)=>game.isHole(game.row(i),game.col(i))||game.board[i]?.kind==='box'?[]:[`M${r.left-left-1.5} ${r.top-top-1.5}h${r.width+3}v${r.height+3}h${-r.width-3}Z`]).join(' ');layer.style.clipPath=`path('${mask}')`;wrap.append(layer);layers.push(layer);
  const routes=new Map(response.fallPaths.map(p=>[p.id,p])),entries=new Map();let longest=0;
  for(const node of board.querySelectorAll('[data-cell]')){const index=Number(node.dataset.cell),tile=game.board[index];if(!tile||tile.kind==='box')continue;const route=routes.get(tile.id),origin=old.get(tile.id);
   if(!route){if(!origin&&tile.kind!=='normal')animate(node,[{transform:'scale(.3)',opacity:0},{transform:'scale(1.15)',opacity:1,offset:.75},{transform:'scale(1)',opacity:1}],{duration:TIMING.fallMin,easing:'ease-out'});continue;}
   const end=slots[index];let parent=layer,entryTop=0;
   if(route.spawn&&route.entry>0){entryTop=slots[route.entry*game.cols].top-top-1.5;if(!entries.has(route.entry)){const clip=document.createElement('div');clip.className='flow-inlet-clip';clip.style.cssText=`position:absolute;left:0;right:0;top:${entryTop}px;bottom:0;overflow:hidden`;layer.append(clip);entries.set(route.entry,clip);}parent=entries.get(route.entry);}
   const clone=node.cloneNode(true);for(const a of ['data-cell','data-tile-id','role','aria-label'])clone.removeAttribute(a);clone.tabIndex=-1;clone.classList.add('falling-tile');clone.dataset.fallId=tile.id;clone.classList.remove('hinted','changed','lesson-cell');clone.style.cssText=`position:absolute;left:${end.left-left}px;top:${end.top-top-entryTop}px;width:${end.width}px;height:${end.height}px;`;parent.append(clone);node.style.visibility='hidden';hidden.push(node);
   const points=route.points.map(p=>({x:(p.col-game.col(index))*pitchX,y:(p.row-game.row(index))*pitchY})),lengths=[0];for(let k=1;k<points.length;k++)lengths.push(lengths[k-1]+Math.hypot(points[k].x-points[k-1].x,points[k].y-points[k-1].y));const distance=lengths.at(-1),duration=Math.min(TIMING.fallMax*1.8,TIMING.fallMin+distance/Math.max(1,end.height)*TIMING.fallPerRow),delay=game.col(index)*TIMING.columnDelay;
   const frames=points.map((p,k)=>({transform:`translate(${p.x}px,${p.y}px)`,offset:distance?lengths[k]/distance:1,opacity:1}));animate(clone,frames,{duration,delay,easing:'linear',fill:'both'});longest=Math.max(longest,duration+delay);
  }
  await wait(Math.max(longest,TIMING.fallMin)+TIMING.settle);
 }
 async function fall(){
  commit();check();
  if(reduced())return;
  if(response.fallPaths&&!response.shuffled)return fallFlow();
  const outer=wrap.getBoundingClientRect(),bounds={left:outer.left+wrap.clientLeft,top:outer.top+wrap.clientTop},elements=new Map(),slots=Array.from(board.children,node=>node.getBoundingClientRect());board.querySelectorAll('[data-cell]').forEach(node=>elements.set(Number(node.dataset.cell),node));
  const clips=new Map(),segments=new Map();
  // A clip per column segment makes replacements emerge below boxes and gaps.
  for(let c=0;c<game.cols;c++){let part=[];const flush=()=>{if(!part.length)return;const first=elements.get(part[0]).getBoundingClientRect(),last=elements.get(part[part.length-1]).getBoundingClientRect();const clip=document.createElement('div');clip.className='fall-clip';clip.setAttribute('aria-hidden','true');clip.style.cssText=`left:${first.left-bounds.left}px;top:${first.top-bounds.top}px;width:${first.width}px;height:${last.bottom-first.top+4}px;`;wrap.append(clip);layers.push(clip);const data={clip,left:first.left,top:first.top,newCount:part.filter(j=>!old.has(game.board[j]?.id)&&game.board[j]?.kind==='normal').length};part.forEach(j=>segments.set(j,data));part=[];};for(let r=0;r<game.rows;r++){const i=r*game.cols+c;if(!elements.has(i)||game.board[i]?.kind==='box')flush();else part.push(i);}flush();}
  if(response.shuffled){const clip=document.createElement('div');clip.className='fall-clip';clip.setAttribute('aria-hidden','true');clip.style.cssText=`inset:0;width:100%;height:100%`;wrap.append(clip);layers.push(clip);clips.set('shuffle',{clip,left:bounds.left,top:bounds.top,newCount:0});}
  let longest=0;
  for(const [index,node]of elements){const tile=game.board[index];if(!tile)continue;if(tile.kind==='box'&&!response.shuffled)continue;const end=node.getBoundingClientRect(),origin=old.get(tile.id);let dx=origin?slots[origin.index].left-end.left:0,dy=origin?slots[origin.index].top-end.top:0;
   const segment=response.shuffled?clips.get('shuffle'):segments.get(index);if(!segment)continue;
   if(!origin){if(response.created===tile.kind&&tile.kind!=='normal'){const clickedRect=slots[clicked];dx=clickedRect.left-end.left;dy=clickedRect.top-end.top;}else{const pitch=end.height+parseFloat(getComputedStyle(board).rowGap);dy=-(segment.newCount+.65)*pitch;}}
   if(Math.abs(dx)<.5&&Math.abs(dy)<.5){if(!origin)animate(node,[{transform:'scale(.4)',opacity:0},{transform:'scale(1.12)',opacity:1,offset:.75},{transform:'scale(1)',opacity:1}],{duration:TIMING.fallMin,easing:'ease-out'});continue;}
   const clone=node.cloneNode(true);clone.removeAttribute('data-cell');clone.removeAttribute('data-tile-id');clone.removeAttribute('role');clone.removeAttribute('aria-label');clone.tabIndex=-1;clone.classList.remove('hinted','changed');clone.classList.add('falling-tile');clone.style.cssText=`position:absolute;left:${end.left-segment.left}px;top:${end.top-segment.top}px;width:${end.width}px;height:${end.height}px;`;segment.clip.append(clone);node.style.visibility='hidden';hidden.push(node);
   const distance=Math.hypot(dx,dy)/Math.max(1,end.height),duration=Math.min(TIMING.fallMax,TIMING.fallMin+distance*TIMING.fallPerRow),delay=game.col(index)*TIMING.columnDelay;
   const impact=Math.min(4,end.height*.09);
   animate(clone,[{transform:`translate(${dx}px,${dy}px) scale(1,1.02)`,opacity:origin?1:.9},{transform:`translate(0,${impact}px) scale(1.025,.965)`,opacity:1,offset:.86},{transform:'translate(0,0) scale(1,1)',opacity:1}],{duration,delay,easing:'cubic-bezier(.4,0,.68,1)',fill:'both'});longest=Math.max(longest,duration+delay);
  }
  await wait(Math.max(longest,TIMING.fallMin)+TIMING.settle);
 }
 board.classList.add('locked');board.setAttribute('aria-busy','true');
 const cleanup=()=>{animations.forEach(a=>{activeAnimations.delete(a);a.cancel();});layers.forEach(node=>node.remove());hidden.forEach(node=>node.style.removeProperty('visibility'));};
 signal.addEventListener('abort',cleanup,{once:true});
 try{
  await swap();
  const powered=response.fired.length>0;
  phase(powered?'charge':'select');
  const source=byIndex(response.swap?.to??clicked);
  if(source)animate(source.node,[{transform:'scale(1)'},{transform:`scale(${powered?1.18:1.08})`},{transform:'scale(1)'}],{duration:powered?TIMING.charge:TIMING.tap,easing:'ease-in-out'});
  await wait(powered?TIMING.charge:TIMING.tap);
  if(powered){phase('release');const delay=release();await wait(delay);}
  phase('clear');let maxDelay=0;
  for(const index of response.removed){const item=byIndex(index);if(!item)continue;const delay=Math.min((Math.abs(game.row(index)-game.row(clicked))+Math.abs(game.col(index)-game.col(clicked)))*12,95);maxDelay=Math.max(maxDelay,delay);const opacity=Number(getComputedStyle(item.node).opacity);animate(item.node,[{transform:'scale(1)',opacity},{transform:'scale(1.13)',opacity,offset:.25},{transform:'scale(.35)',opacity:0}],{duration:TIMING.clear,delay,easing:'ease-in',fill:'forwards'});}
  for(const index of response.changed||[]){const item=byIndex(index);if(item)animate(item.node,[{filter:'brightness(1)'},{filter:'brightness(1.8) saturate(1.5)',transform:'scale(1.12)',offset:.5},{filter:'brightness(1)',transform:'scale(1)'}],{duration:TIMING.clear});}
  for(const index of response.melted){const item=byIndex(index);if(item)animate(item.node,[{filter:'brightness(1)'},{filter:'brightness(1.5)',offset:.4},{filter:'brightness(1)'}],{duration:TIMING.clear,easing:'ease-in-out'});}
  await wait(TIMING.clear+maxDelay);phase('pause');await wait(TIMING.breath);
  phase('fall');await fall();check();phase('idle');
 }finally{signal.removeEventListener('abort',cleanup);cleanup();if(board.isConnected){board.removeAttribute('aria-busy');board.classList.remove('locked');}}
}
root.BloomMotion={run,TIMING,pause,resume,get paused(){return paused;}};
})(globalThis);
