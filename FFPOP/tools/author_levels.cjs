'use strict';
// Authoring aid. Running this explicitly replaces the 50 JSON levels with scheme A.
const fs=require('node:fs'),path=require('node:path');
const R=path.resolve(__dirname,'..');const {Game,random}=require('../scripts/board/BoardModel.js');const S=require('../scripts/board/LevelSchema.js');
const titles=['初见花果','挑选收获','火箭发芽','纵向开路','木箱小考','花瓣绽放','晨冰初融','再收一次','十字花火','一起绽放','彩虹初见','选对颜色','两侧花圃','三行三列','先融后收','轻松丰收','让道具落下','彩虹花雨','两种解法','花园协奏','溪谷缺口','上下两段','拆箱接通','两岸备花','溪谷小考','双瓣盛放','一消多箱','先冰后箱','中路或两翼','空间协奏','五色初晴','先收哪种','彩虹取舍','冰中花色','颜色小考','花火小憩','各有所长','落差相逢','连锁花径','道具协奏','三片花圃','小消蓄花','开路落花','连锁先后','秘境挑战','繁花小憩','分区融冰','组合任选','精打细算','繁花终曲'];
const intents=['相邻同色两个即可收集，先完成草莓目标','根据目标选颜色，单个点击不扣步','在指定位置生成火箭，注意道具留在点击处','纵火箭对准一列木箱，比远处大消除更有效','通过邻消和直线道具解决木箱','七个连通花果生成炸弹，利用集中范围','冰层首次命中仅融化，花果需后续消除','先融化冰层，再规划下一次收集','相邻双火箭组合覆盖十字目标区','先生成火箭，再与相邻炸弹组合','九个连通花果生成彩虹，再选择相邻目标','比较两种目标缺口，决定彩虹清哪种','两侧目标均可先做，比较当前可用组合','火箭与炸弹组合清除三行三列','融冰与颜色目标分开计算，保留收集机会','用熟悉机制轻松完成，回落学习压力','消掉道具下方花果，让道具落向目标区域','指定相邻彩虹与炸弹，观察同色转化','两侧都可开路，比较道具覆盖效率','先生成炸弹，再组合开路，完成复合目标','缺口切断重力，两个区段各自补齐','同一列上下区段互不跨越缺口','木箱拆除后上下区段连通','分别在两岸生成道具再使用','用分区布局检验空间理解','双炸弹覆盖更宽目标区，短关回落','同一色块邻接多个木箱，一步兼顾','先融化关键色块，再处理附近木箱','中央突破或两侧推进均可完成','综合缺口、木箱与冰层的空间挑战','增加第五色，减轻目标压力适应变化','根据剩余目标选择收集顺序','目标缺口比当前数量更重要','先融化冰中目标色，避免浪费彩虹','综合颜色选择与障碍处理','低压组合消除，回落挑战压力','直线目标用火箭，集中目标用炸弹','利用道具下方空隙制造相邻组合','先触发覆盖多个道具的关键点','综合六类道具组合的适用位置','三块目标区需要分配处理顺序','小群消除调整连通，为大群留空间','打开木箱后再调整道具落点','触发点改变连锁覆盖与目标效率','多区复合目标综合挑战','集中目标与预置道具形成放松关','分区分别融冰，选择先做的一侧','火箭、炸弹和彩虹路线均可完成','用更紧步数检验每手目标贡献','综合已有机制完成终局，不引入新规则'];
const budgets=[10,12,12,12,14,13,14,15,15,17,14,15,17,17,18,15,18,19,20,22,18,19,20,21,24,18,21,22,23,24,20,21,22,23,25,20,23,24,25,26,23,24,25,26,28,22,25,26,27,28];
const boxCounts=[0,0,4,6,8,8,0,0,10,10,0,0,10,12,0,8,12,10,14,12,4,6,8,8,10,10,12,8,12,12,4,4,0,4,8,8,12,10,12,12,12,8,12,10,14,8,12,12,14,14];
const iceCounts=[0,0,0,0,0,0,6,8,0,6,0,0,0,0,10,0,0,10,0,10,6,6,4,8,8,0,0,10,6,10,4,6,8,10,10,4,4,8,8,12,10,8,10,12,12,6,14,12,14,16];
const colorGoals={1:[[0,12]],2:[[1,10],[2,10]],4:[[0,14]],7:[[0,12]],9:[[2,16]],11:[[2,20]],12:[[0,16],[2,16]],15:[[0,18]],20:[[0,20]],31:[[0,16]],32:[[1,18],[2,16]],33:[[2,22]],34:[[3,18]],35:[[0,18],[2,18]],41:[[1,20]],42:[[0,22]],43:[[2,20]],44:[[3,20]],45:[[0,22],[2,18]],47:[[1,22]],48:[[2,24]],49:[[0,24],[3,18]],50:[[1,24],[4,22]]};
const motifSets=[
 [24,25,30,31,32,39,48,49,54,55,56,63,64,71,40,47],
 [26,27,28,29,34,35,36,37,42,43,44,45,50,51,52,53],
 [24,31,32,39,40,47,48,55,56,63,64,71,25,30,49,54],
 [40,41,42,43,44,45,46,47,48,55,56,63,64,71,32,39],
 [27,28,35,36,43,44,51,52,59,60,67,68,34,37,42,45]
];
function create(id,seed){const k=id-1,colors=id<=2?3:id<=30?4:5,rng=random(seed),layout=Array.from({length:9},()=>Array.from({length:8},()=>String(Math.floor(rng()*colors))));
 const L={id,chapter:Math.floor(k/10),rows:9,cols:8,moves:budgets[k],colors,boxes:boxCounts[k],ice:iceCounts[k],shape:0,seed,goals:[],layout,refill:[],design:{title:titles[k],intent:intents[k],difficulty:id<=2?1:id%10===0?Math.min(5,Math.floor(id/10)+2):[6,11,16,26,31,36,46].includes(id)?2:id<20?3:id<40?4:5,beat:[10,20,50].includes(id)?'showcase':id%5===0?'test':[1,3,4,6,7,9,11,14,18,21,22,23,26,31].includes(id)?'teach':[16,36,46].includes(id)?'rest':id%5===4?'twist':'practice',focus:id<=5?'基础与火箭':id<=10?'冰层与组合':id<=20?'彩虹与空间':id<=30?'分段重力':id<=40?'颜色与组合':'综合策略'},tutorial:[]};
 const at=i=>layout[Math.floor(i/8)][i%8],set=(i,t)=>layout[Math.floor(i/8)][i%8]=t;
 const holes=id===22?[24,25,26,27,28,29,30,31]:id===23?[]:id===24?Array.from({length:9},(_,r)=>[r*8+3,r*8+4]).flat():id>=21&&id<=25?[0,7,24,31,32,39]:id>=27&&id<=30?[0,1,6,7,35,36]:id===24?[]:id>=37&&id%3===1?[0,7,32,39,64,71]:[];holes.forEach(i=>set(i,'.'));
 const protectedCells=new Set();const neighbors=i=>[i-8,i+8,...(i%8?[i-1]:[]),...(i%8<7?[i+1]:[])].filter(j=>j>=0&&j<72);
 function group(indices,color){const ins=new Set(indices);for(const i of indices){set(i,String(color));protectedCells.add(i);}for(const i of indices)for(const j of neighbors(i))if(!ins.has(j)&&at(j)!=='.'){set(j,String((color+1+Math.floor(rng()*(colors-1)))%colors));protectedCells.add(j);}}
 function special(i,t){set(i,t);protectedCells.add(i);}
 if(id===1)group([65,66,67],0);
 if(id===2){group([64,65,66],1);group([69,70,71],2);}
 if(id<=2){for(let r=0;r<9;r++)for(let c=0;c<8;c++)layout[r][c]=String((Math.floor(r/2)+Math.floor(c/2)+id-1)%3);}
 if(id===3){group([65,66,67,68,69],0);L.opening={index:67,created:'rocket'};}
 if(id===4){special(19,'v0');L.opening={index:19};}
 if(id===6){group([42,43,44,50,51,52,59],1);L.opening={index:51,created:'bomb'};}
 if(id===7){group([42,43,44],0);set(42,'i0');set(43,'i0');L.opening={index:44};}
 if(id===9){special(35,'h0');special(36,'v1');L.opening={index:35,combo:'rocket+rocket'};}
 if(id===10){group([65,66,67,68,69],0);special(59,'b1');L.opening={index:67,created:'rocket'};L.demonstration=[{index:67},{index:67}];}
 if(id===11){group([41,42,43,49,50,51,57,58,59],2);L.opening={index:50,created:'rainbow'};}
 if(id===12){special(51,'r0');set(50,'0');set(52,'2');protectedCells.add(50);protectedCells.add(52);}
 if(id===14){special(43,'v0');special(44,'b1');L.opening={index:43,combo:'rocket+bomb'};}
 if(id===17){group([35,43,51],1);special(27,'h0');L.opening={index:51};}
 if(id===18){special(59,'r0');special(60,'b1');L.opening={index:59,target:60,combo:'rainbow+bomb'};}
 if(id===20){group([57,58,59,65,66,67,68],0);special(51,'v1');L.opening={index:59,created:'bomb'};L.demonstration=[{index:59},{index:67}];}
 if(id===38){group([35,43,51],1);special(27,'h0');special(50,'b2');L.opening={index:51};}
 if([26,36,46].includes(id)){special(43,'b0');special(44,'b1');}
 if(id>=27&&!([31,32,34,42].includes(id))){const pos=id%2?19:51;if(!protectedCells.has(pos)&&at(pos)!=='.')special(pos,id%3===0?'r1':id%3===1?'v0':'b2');}
 let boxPos=motifSets[k%5].filter(i=>!protectedCells.has(i)&&at(i)!=='.');
 if(id===23)boxPos=[32,33,34,35,36,37,38,39];
 if(id===4)boxPos=[27,35,43,51,59,67];
 if(id===9)boxPos=[32,33,34,37,38,39,11,19,51,59];
 if(id===17)boxPos=[56,57,58,59,60,61,62,63,64,65,70,71];
 const all=Array.from({length:48},(_,i)=>i+24).filter(i=>!protectedCells.has(i)&&at(i)!=='.');
 boxPos=[...new Set([...boxPos,...all])].slice(0,L.boxes);boxPos.forEach(i=>set(i,'#'));
 let icePos=Array.from({length:72},(_,i)=>i).filter(i=>/^i/.test(at(i)));const candidates=[...motifSets[(k+2)%5],...all].filter(i=>!protectedCells.has(i)&&/^\d$/.test(at(i)));
 for(const i of [...new Set(candidates)]){if(icePos.length>=L.ice)break;set(i,'i'+at(i));icePos.push(i);}
 // Some teaching cells carry ice explicitly; targets reflect the actual authored layout.
 L.boxes=layout.flat().filter(t=>t==='#').length;L.ice=layout.flat().filter(t=>/^i/.test(t)).length;
 if(L.boxes)L.goals.push({kind:'box',target:L.boxes});if(L.ice)L.goals.push({kind:'ice',target:L.ice});for(const [color,target]of colorGoals[id]||[])L.goals.push({kind:'color',color,target});
 L.tutorial=[{turn:0,text:intents[k],cells:L.opening?[L.opening.index,...(L.opening.target!==undefined?[L.opening.target]:[])]:[]}];
 if(id===7)L.tutorial.push({turn:1,text:'冰已经融化，里面的草莓还在。继续消除才能计入草莓目标。',cells:[]});
 if(id===10)L.tutorial.push({turn:1,text:'火箭留在了点击位置。点击它，与相邻炸弹一起绽放！',cells:[67,59]});
 if(id===20)L.tutorial.push({turn:1,text:'炸弹已经落到火箭旁。点击炸弹，用组合打通目标区。',cells:[59,67]});
 if(id===11)L.tutorial.push({turn:1,text:'先点击彩虹，再选上下左右相邻的花果，决定消除颜色。',cells:[]});
 L.boosters={hammer:id>=5?1:0,glove:id>=12?1:0,watering:id>=16?1:0,dice:id>=19?1:0,maxUses:id<5?0:id>=21&&L.design.beat!=='test'?2:1};if([5,12,16,19].includes(id))L.boosterTutorial={5:'hammer',12:'glove',16:'watering',19:'dice'}[id];if([12,16,19].includes(id))for(const k of ['hammer','glove','watering','dice'])if(k!==L.boosterTutorial)L.boosters[k]=0;
 L.gravity='flow';
 return L;
}
function play(l,mode=0){const g=new Game(l),rng=random(9821+mode*101),actions=[];let combos=0;const prefix=l.demonstration||(l.opening?[l.opening]:[]);
 for(let t=0;t<l.moves&&g.status==='playing';t++){let h=t<prefix.length?prefix[t]:g.hint();if(!h)break;if(mode&&t>=prefix.length&&rng()<.16){const options=[];for(let i=0;i<72;i++){const x=g.board[i];if(x?.kind==='normal'&&g.group(i).length>=2||x?.kind==='rocket'||x?.kind==='bomb')options.push({index:i});}if(options.length)h=options[Math.floor(rng()*options.length)];}
 const r=g.click(h.index,h.target);if(!r.valid)break;if(t===0&&l.opening?.created&&r.created!==l.opening.created)return{status:'bad-opening'};if(t===0&&l.opening?.combo&&r.combo!==l.opening.combo)return{status:'bad-opening'};
 actions.push({index:h.index,...(h.target!==undefined?{target:h.target}:{} )});if(r.combo)combos++;
 }return{status:g.status,turns:g.turns,remaining:g.moves,combos,actions};}
const report=[],solutions=[];
for(let id=1;id<=50;id++){let chosen,best=-Infinity;for(let attempt=0;attempt<180;attempt++){const l=create(id,120000+id*1009+attempt*7919);const errors=S.validate(l);if(errors.length)throw new Error(id+': '+errors.join(';'));const ref=play(l);if(ref.status!=='won')continue;if(id===10&&ref.combos===0)continue;
 let checkedWins;if(id<=20||[31,36,46].includes(id)){checkedWins=0;for(let m=0;m<16;m++)if(play(l,m).status==='won')checkedWins++;if(checkedWins<(id===20?10:[31,36,46].includes(id)?10:12))continue;}
 const fraction=ref.turns/l.moves;const score=-Math.abs(fraction-(id<=2?.45:l.design.beat==='rest'?.5:.68));if(score>best){best=score;chosen={l,ref};}if(score>-.06)break;}
 if(!chosen)throw new Error('No verified layout for level '+id);const {l,ref}=chosen;let wins=0;for(let m=0;m<16;m++)if(play(l,m).status==='won')wins++;
 const row={id,title:l.design.title,moves:l.moves,referenceTurns:ref.turns,remaining:ref.remaining,combos:ref.combos,policyWins:wins,policyRuns:16,policyDescription:'固定种子，教学首步后采用提示策略；其余15路按16%概率偏离提示。不是人类通关率。',humanStatus:'待真人试玩'};report.push(row);solutions.push({id,seed:l.seed,actions:ref.actions});
 fs.writeFileSync(path.join(R,'data/levels/level_'+String(id).padStart(3,'0')+'.json'),JSON.stringify(l,null,2)+'\n');console.log(id,l.design.title,'moves='+l.moves,'reference='+ref.turns,'policies='+wins+'/16');
}
fs.mkdirSync(path.join(R,'data/validation'),{recursive:true});fs.writeFileSync(path.join(R,'data/validation/level-report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(R,'tests/redesign-solutions.json'),JSON.stringify(solutions,null,2)+'\n');
