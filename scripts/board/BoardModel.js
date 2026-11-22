(function(root){
'use strict';
// Browser data are embedded by build.py; Node tests read the same JSON files.
const Schema=typeof module!=='undefined'&&module.exports?require('./LevelSchema.js'):root.BloomSchema;
const {CHAPTERS,LEVELS}=typeof module!=='undefined'&&module.exports
 ? require('../managers/LevelRepository.cjs').load() : root.BloomData;
function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
class Game{
 constructor(level,seed){this.level=level;this.rows=level.rows;this.cols=level.cols;this.rng=random(seed===undefined?level.seed:seed);this.moves=level.moves;this.score=0;this.turns=0;this.collected={};this.status='playing';this.shuffles=0;this.serial=0;this.board=[];this.refillIndex=0;
 if(level.layout){const errors=Schema.validate(level);if(errors.length)throw new Error(errors.join('；'));this.board=level.layout.flat().map(code=>{const t=Schema.decode(code);return t?{...t,id:++this.serial}:null;});this.ensureMoves();return;}
 for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++){const hole=this.isHole(r,c);this.board.push(hole?null:this.tile());}
 const spots=this.board.map((t,i)=>t&&this.row(i)>1?i:-1).filter(i=>i>=0);this.mix(spots);
 for(const i of spots.slice(0,level.boxes))this.board[i]={kind:'box',id:++this.serial};
 for(const i of spots.slice(level.boxes,level.boxes+level.ice))this.board[i].ice=true;
 this.ensureMoves();
 }
 row(i){return Math.floor(i/this.cols);} col(i){return i%this.cols;}
 isHole(r,c){if(this.level.layout)return this.level.layout[r]?.[c]==='.';const s=this.level.shape;return (s===1&&(r===0||r===8)&&(c===0||c===7))||(s===2&&(r===0||r===8)&&(c<2||c>5))||(s===3&&((r===3||r===4)&&(c===0||c===7)))||(s===4&&((r===0&&(c<2||c>5))||(r===8&&(c===3||c===4))));}
 tile(color){if(color===undefined)color=this.level.refill&&this.refillIndex<this.level.refill.length?this.level.refill[this.refillIndex++]:Math.floor(this.rng()*this.level.colors);return{kind:'normal',color,id:++this.serial};}
 mix(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 neighbors(i){const r=this.row(i),c=this.col(i),out=[];if(r)out.push(i-this.cols);if(r<this.rows-1)out.push(i+this.cols);if(c)out.push(i-1);if(c<this.cols-1)out.push(i+1);return out;}
 group(i){const start=this.board[i];if(!start||start.kind!=='normal')return[];const seen=new Set([i]),queue=[i];for(let p=0;p<queue.length;p++)for(const n of this.neighbors(queue[p])){const t=this.board[n];if(t&&t.kind==='normal'&&t.color===start.color&&!seen.has(n)){seen.add(n);queue.push(n);}}return queue;}
 hasMove(){return this.board.some((t,i)=>t&&t.kind!=='box'&&((t.kind==='rainbow'?!t.ice&&this.neighbors(i).some(n=>this.board[n]&&this.board[n].kind!=='box'&&!this.board[n].ice):t.kind!=='normal')||this.neighbors(i).some(n=>this.board[n]?.kind==='normal'&&this.board[n].color===t.color)));}
 ensureMoves(){if(this.hasMove())return false;const indices=this.board.map((t,i)=>t?.kind==='normal'?i:-1).filter(i=>i>=0);for(let k=0;k<20&&!this.hasMove();k++){const tiles=this.mix(indices.map(i=>this.board[i]));indices.forEach((i,j)=>this.board[i]=tiles[j]);}if(!this.hasMove()){for(const i of indices){const n=this.neighbors(i).find(n=>this.board[n]?.kind==='normal');if(n!==undefined){this.board[n].color=this.board[i].color;break;}}}this.shuffles++;return true;}
 add(kind,count=1){this.collected[kind]=(this.collected[kind]||0)+count;}
 progress(goal){return Math.min(goal.target,this.collected[goal.kind==='color'?'color'+goal.color:goal.kind]||0);}
 won(){return this.level.goals.every(g=>this.progress(g)>=g.target);}
 area(i,radius){const a=[];for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++)if(Math.abs(r-this.row(i))<=radius&&Math.abs(c-this.col(i))<=radius)a.push(r*this.cols+c);return a;}
 line(i,width=0,both=false){const a=[];const t=this.board[i];for(let j=0;j<this.board.length;j++)if((both||t?.axis==='h')&&Math.abs(this.row(j)-this.row(i))<=width||(both||t?.axis!=='h')&&Math.abs(this.col(j)-this.col(i))<=width)a.push(j);return a;}
 effect(i,selectedColor){const t=this.board[i];if(!t)return[];if(t.kind==='rocket')return this.line(i);if(t.kind==='bomb')return this.area(i,1);if(t.kind==='rainbow'){const counts=Array(this.level.colors).fill(0);this.board.forEach(x=>{if(x?.color!==undefined)counts[x.color]++;});const color=selectedColor===undefined?counts.indexOf(Math.max(...counts)):selectedColor;return this.board.map((x,j)=>x?.color===color?j:-1).filter(j=>j>=0).concat(i);}return[];}
 collapse(){for(let c=0;c<this.cols;c++){let segment=[];const flush=()=>{const tiles=segment.map(i=>this.board[i]).filter(Boolean);for(let j=segment.length-1;j>=0;j--)this.board[segment[j]]=tiles.length?tiles.pop():this.tile();segment=[];};for(let r=0;r<this.rows;r++){const i=r*this.cols+c;if(this.isHole(r,c)||this.board[i]?.kind==='box')flush();else segment.push(i);}flush();}}
 click(i,target){
 if(this.board[i]?.kind==='rainbow'){
  const other=this.board[target];
  if(this.status!=='playing'||!Number.isInteger(i)||!Number.isInteger(target)||!this.neighbors(i).includes(target)||!other||other.kind==='box'||other.ice||this.board[i].ice)return{valid:false,reason:'rainbow-target'};
  [this.board[i],this.board[target]]=[other,this.board[i]];
  return this.resolve(target,{from:i,to:target},other.kind==='normal'?other.color:undefined,i);
 }
 return this.resolve(i);
 }
 resolve(i,swap=null,rainbowColor,chosenPartner){if(this.status!=='playing'||!Number.isInteger(i)||i<0||i>=this.board.length)return{valid:false};const tile=this.board[i];if(!tile||tile.kind==='box')return{valid:false};const isSpecial=t=>t&&t.kind!=='normal'&&t.kind!=='box';let group=[],created=null,combo=null,targets=[],effects=[],comboPartner;
 if(tile.kind==='normal'){group=this.group(i);if(group.length<2)return{valid:false,reason:'single'};targets=group.slice();if(!tile.ice){if(group.length>=9)created={kind:'rainbow',color:tile.color};else if(group.length>=7)created={kind:'bomb',color:tile.color};else if(group.length>=5)created={kind:'rocket',axis:this.rng()<.5?'h':'v',color:tile.color};}}
 else {const partner=swap?(isSpecial(this.board[chosenPartner])?chosenPartner:undefined):this.neighbors(i).find(n=>isSpecial(this.board[n]));if(partner!==undefined){comboPartner=partner;const other=this.board[partner];const kinds=[tile.kind,other.kind];combo=kinds.join('+');if(kinds.every(k=>k==='rainbow'))targets=this.board.map((_,j)=>j);else if(kinds.includes('rainbow')){const source=tile.kind==='rainbow'?other:tile;const colored=this.board.map((x,j)=>x?.color===source.color?j:-1).filter(j=>j>=0);targets=[i,partner,...colored];for(const j of colored)targets.push(...(source.kind==='bomb'?this.area(j,1):this.line(j,0,true)));}else if(kinds.includes('bomb')&&kinds.includes('rocket'))targets=this.line(i,1,true).concat(partner);else if(kinds.every(k=>k==='bomb'))targets=this.area(i,2).concat(partner);else targets=this.line(i,0,true).concat(partner);}else targets=this.effect(i,rainbowColor);}
 if(combo){const other=this.board[comboPartner],source=tile.kind==='rainbow'?other:tile;effects.push({kind:'combo',combo,index:i,partner:comboPartner,targets:[...new Set(targets)],sourceKind:source.kind,color:source.color,converted:combo.includes('rainbow')&&source.kind!=='rainbow'?this.board.flatMap((x,j)=>x?.kind==='normal'&&x.color===source.color?[j]:[]):[]});}
 const queue=targets.slice(),seen=new Set(),removed=[],melted=[],boxes=new Set(),fired=[];
 for(let p=0;p<queue.length;p++){const j=queue[p];if(seen.has(j)||!this.board[j])continue;seen.add(j);const t=this.board[j];if(t.kind==='box'){boxes.add(j);continue;}if(t.ice){delete t.ice;this.add('ice');melted.push(j);continue;}if(isSpecial(t)){fired.push(j);const hit=this.effect(j,j===i?rainbowColor:undefined);queue.push(...hit);if(!combo||j!==i&&j!==comboPartner)effects.push({kind:t.kind,index:j,axis:t.axis,targets:hit});}this.add('color'+t.color);removed.push(j);for(const n of this.neighbors(j))if(this.board[n]?.kind==='box')boxes.add(n);}
 for(const j of removed)this.board[j]=null;
 for(const j of boxes){this.board[j]=null;removed.push(j);this.add('box');}
 if(created)this.board[i]={...created,id:++this.serial};
 this.moves--;this.turns++;this.score+=removed.length*60+fired.length*150+(combo?300:0);this.collapse();this.status=this.won()?'won':this.moves<=0?'lost':'playing';const shuffled=this.status==='playing'&&this.ensureMoves();
 return{valid:true,...(swap?{swap}:{}),effects,removed,melted,fired,created:created?.kind,combo,shuffled,count:removed.length,status:this.status};
 }
 stars(){if(this.status!=='won')return 0;const ratio=this.moves/this.level.moves;return ratio>=.35?3:ratio>=.15?2:1;}
 hint(){let best=null;const visited=new Set();for(let i=0;i<this.board.length;i++){const t=this.board[i];if(!t||t.kind==='box'||visited.has(i))continue;const group=t.kind==='normal'?this.group(i):[i];group.forEach(j=>visited.add(j));if(t.kind==='normal'&&group.length<2)continue;let target;
 if(t.kind==='rainbow'){
  if(t.ice)continue;
  const options=this.neighbors(i).filter(n=>this.board[n]&&this.board[n].kind!=='box'&&!this.board[n].ice);
  if(!options.length)continue;
  const value=n=>{const other=this.board[n];let targets=this.effect(i,other.color);if(other.kind==='rainbow')targets=this.board.map((_,j)=>j);else if(other.kind!=='normal'){targets=targets.concat(n);for(const j of targets.slice())targets.push(...(other.kind==='bomb'?this.area(j,1):this.line(j,0,true)));}const boxes=new Set();let score=0;for(const j of new Set(targets)){const x=this.board[j];if(!x)continue;if(x.kind==='box'){boxes.add(j);continue;}score+=x.ice?5:.6;if(!x.ice&&this.level.goals.some(goal=>goal.kind==='color'&&goal.color===x.color&&this.progress(goal)<goal.target))score+=3;for(const k of this.neighbors(j))if(this.board[k]?.kind==='box')boxes.add(k);}return score+boxes.size*4;};
  target=options.reduce((a,b)=>value(b)>value(a)?b:a);
 }
 const targets=t.kind==='normal'?group:this.effect(i,target===undefined?undefined:this.board[target].color);const seen=new Set(targets),boxes=new Set();if(t.kind!=='normal'){const partner=this.neighbors(i).find(n=>this.board[n]&& !['normal','box'].includes(this.board[n].kind));if(partner!==undefined)for(const j of this.effect(partner))seen.add(j);}let value=0;for(const j of seen){const x=this.board[j];if(!x)continue;if(x.kind==='box'){boxes.add(j);continue;}if(x.ice){value+=5;continue;}value+=.6;const goal=this.level.goals.find(g=>g.kind==='color'&&g.color===x.color&&this.progress(g)<g.target);if(goal)value+=3;for(const n of this.neighbors(j))if(this.board[n]?.kind==='box')boxes.add(n);}value+=boxes.size*4;if(t.kind==='normal'&&group.length>=5)value+=group.length>=9?12:group.length>=7?8:5;if(!best||value>best.value)best={index:i,group:target===undefined?group:[i,target],value,...(target===undefined?{}:{target})};}return best;}

}
const API={Game,LEVELS,CHAPTERS,random};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.Bloom=API;
})(typeof globalThis!=='undefined'?globalThis:this);
