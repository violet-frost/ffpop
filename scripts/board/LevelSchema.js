(function(root){
'use strict';
const kinds={i:'normal',h:'rocket',v:'rocket',b:'bomb',r:'rainbow'};
function decode(token){
 if(token==='.')return null;if(token==='#')return{kind:'box'};
 if(typeof token==='string'&&/^[0-5]$/.test(token))return{kind:'normal',color:Number(token)};
 if(typeof token==='string'&&/^[ihvbr][0-5]$/.test(token))return{kind:kinds[token[0]],color:Number(token[1]),...(token[0]==='i'?{ice:true}:{}),...(/[hv]/.test(token[0])?{axis:token[0]}:{})};
 throw new Error('未知棋盘编码：'+String(token));
}
function encode(t){if(!t)return'.';if(t.kind==='box')return'#';return(t.ice?'i':t.kind==='normal'?'':t.kind==='rocket'?t.axis:t.kind==='bomb'?'b':'r')+t.color;}
function validate(l){const errors=[];const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
 if(!l||typeof l!=='object'||Array.isArray(l))return['关卡必须为对象'];
 if(!int(l.id,1,50))errors.push('id须为1—50整数');
 if(l.chapter!==Math.floor((l.id-1)/10))errors.push('chapter与关卡编号不匹配');
 if(l.rows!==9||l.cols!==8)errors.push('棋盘必须为9行8列');
 if(!int(l.moves,1,99))errors.push('步数须为1—99整数');
 if(!int(l.colors,3,6))errors.push('色数须为3—6整数');
 if(!int(l.seed,0,4294967295))errors.push('种子须为无符号32位整数');
 if(l.gravity!==undefined&&!['segment','flow'].includes(l.gravity))errors.push('gravity须为segment或flow');
 if(!int(l.shape,0,4))errors.push('shape须为0—4整数');
 let boxes=0,ice=0,active=0;const decoded=[];
 if(!Array.isArray(l.layout)||l.layout.length!==9||l.layout.some(row=>!Array.isArray(row)||row.length!==8))errors.push('layout必须为9×8编码数组');
 else l.layout.flat().forEach((token,i)=>{try{const t=decode(token);decoded[i]=t;if(t)active++;if(t?.kind==='box')boxes++;if(t?.ice)ice++;if(t?.color>=l.colors)errors.push('第'+(i+1)+'格色号超出colors');}catch(e){errors.push(e.message+'，第'+(i+1)+'格');}});
 if(boxes!==l.boxes)errors.push('boxes与布局木箱数不一致');if(ice!==l.ice)errors.push('ice与布局冰层数不一致');
 const adj=i=>[...(i>=8?[i-8]:[]),...(i<64?[i+8]:[]),...(i%8?[i-1]:[]),...(i%8<7?[i+1]:[])];
 if(decoded.length===72&&!decoded.some((t,i)=>t&&(['rocket','bomb'].includes(t.kind)||(t.kind==='normal'&&adj(i).some(j=>decoded[j]?.kind==='normal'))||(t.kind==='rainbow'&&adj(i).some(j=>decoded[j]&&decoded[j].kind!=='box'&&!decoded[j].ice)))))errors.push('布局没有可消除的相邻格或可触发道具');
 if(active<12)errors.push('有效格不可少于12个');
 if(!Array.isArray(l.goals)||l.goals.length<1||l.goals.length>4)errors.push('目标须为1—4项');
 else{const seen=new Set();for(const g of l.goals){if(!g||!['color','box','ice'].includes(g.kind)||!int(g.target,1,999)){errors.push('目标类型或数量无效');continue;}const key=g.kind+String(g.color??'');if(seen.has(key))errors.push('目标重复');seen.add(key);if(g.kind==='color'&&!int(g.color,0,l.colors-1))errors.push('目标色号无效');if(g.kind==='box'&&g.target>boxes)errors.push('木箱目标超过初始数量');if(g.kind==='ice'&&g.target>ice)errors.push('冰层目标超过初始数量');}}
 if(l.boosters!==undefined){const b=l.boosters;if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['hammer','glove','watering','dice','maxUses'].includes(k))||['hammer','glove','watering','dice'].some(k=>!int(b[k],0,3))||!int(b.maxUses,0,8)||b.maxUses>['hammer','glove','watering','dice'].reduce((n,k)=>n+(b[k]||0),0))errors.push('辅助道具配额无效：每种0—3，总使用上限0—8且不超过配额总和');}
 if(l.boosterTutorial!==undefined&&!['hammer','glove','watering','dice'].includes(l.boosterTutorial))errors.push('辅助道具教学类型无效');
 if(l.refill!==undefined&&(!Array.isArray(l.refill)||l.refill.length>10000||l.refill.some(c=>!int(c,0,l.colors-1))))errors.push('refill必须为有效色号数组，最多10000项');
 if(l.design!==undefined){if(!l.design||typeof l.design!=='object'||typeof l.design.title!=='string'||l.design.title.length>60||typeof l.design.intent!=='string'||l.design.intent.length>300||!int(l.design.difficulty,1,5)||!['teach','practice','twist','test','rest','showcase'].includes(l.design.beat))errors.push('design字段无效');}
 if(l.tutorial!==undefined){if(!Array.isArray(l.tutorial)||l.tutorial.length>20)errors.push('tutorial必须为数组');else for(const t of l.tutorial)if(!t||!int(t.turn,0,99)||typeof t.text!=='string'||t.text.length>150||!Array.isArray(t.cells)||t.cells.some(i=>!int(i,0,71)||!decoded[i]))errors.push('教学文字、回合或坐标无效');}
 if(l.demonstration!==undefined&&(!Array.isArray(l.demonstration)||l.demonstration.length>99||l.demonstration.some(a=>!a||!int(a.index,0,71)||(a.target!==undefined&&!int(a.target,0,71)))))errors.push('demonstration操作无效');
 if(l.opening!==undefined){const a=l.opening;if(!a||!int(a.index,0,71)||(a.target!==undefined&&!int(a.target,0,71)))errors.push('opening坐标无效');}
 return errors;
}
function normalize(l){const n=JSON.parse(JSON.stringify(l));if(Array.isArray(n.layout)){n.boxes=n.layout.flat().filter(t=>t==='#').length;n.ice=n.layout.flat().filter(t=>/^i[0-5]$/.test(t)).length;}return n;}
function pack(input){const list=Array.isArray(input)?input:input?.levels||[input];if(!list.length||list.length>50)throw new Error('须导入1—50关');const ids=new Set();return list.map(l=>{const errors=validate(l);if(ids.has(l?.id))errors.push('关卡编号重复');ids.add(l?.id);if(errors.length)throw new Error('第'+String(l?.id??'?')+'关：'+errors.join('；'));return JSON.parse(JSON.stringify(l));});}
const api={decode,encode,validate,normalize,pack};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BloomSchema=api;
})(typeof globalThis!=='undefined'?globalThis:this);
