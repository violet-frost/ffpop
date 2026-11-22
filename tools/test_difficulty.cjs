'use strict';
// Reproducible policy evaluation. Does not alter any game or level source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Game,LEVELS,random}=require('../scripts/board/BoardModel.js');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const profiles=[{key:'skilled',name:'熟练策略',error:.05},{key:'standard',name:'标准策略',error:.20},{key:'exploratory',name:'探索策略',error:.45}];
function wilson(w,n){if(!n)return[null,null];const z=1.959963984540054,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return[Math.max(0,c-h),Math.min(1,c+h)];}
function legal(g){const out=[];g.board.forEach((t,index)=>{if(!t||t.kind==='box')return;if(t.kind==='normal'){if(g.group(index).length>=2)out.push({index});}else if(t.kind==='rainbow'){if(!t.ice)for(const target of g.neighbors(index)){const x=g.board[target];if(x&&x.kind!=='box'&&!x.ice)out.push({index,target});}}else out.push({index});});return out;}
function need(g,kind,color){return g.level.goals.some(x=>x.kind===kind&&(kind!=='color'||x.color===color)&&g.progress(x)<x.target);}
function boosterChoice(g){
 const options=[];
 if(g.boosterAvailable('hammer'))g.board.forEach((t,index)=>{if(!g.boosterTargets('hammer',index).length)return;let value=0;if(t.ice&&need(g,'ice'))value=7;else if(t.kind==='box'&&need(g,'box'))value=6;else if(!t.ice&&t.kind==='normal'&&need(g,'color',t.color)){const goal=g.level.goals.find(x=>x.kind==='color'&&x.color===t.color);if(goal.target-g.progress(goal)<=3||g.moves<=2)value=2;}if(value)options.push({kind:'hammer',index,value});});
 if(g.boosterAvailable('watering'))g.board.forEach((t,index)=>{const ns=g.boosterTargets('watering',index);if(!ns.length)return;const before=g.group(index).length,colors=ns.map(i=>g.board[i].color);ns.forEach(i=>g.board[i].color=t.color);const after=g.group(index).length;ns.forEach((i,j)=>g.board[i].color=colors[j]);if(after>=5&&after-before>=2)options.push({kind:'watering',index,value:after-before+((after>=9)?4:(after>=7)?2:0)});});
 if(g.boosterAvailable('glove'))g.board.forEach((t,index)=>{for(const target of g.boosterTargets('glove',index)){if(target<index)continue;const x=g.board[target];if(t.kind!=='normal'||x.kind!=='normal')continue;const before=Math.max(g.group(index).length,g.group(target).length);[g.board[index],g.board[target]]=[x,t];const after=Math.max(g.group(index).length,g.group(target).length);[g.board[index],g.board[target]]=[t,x];if(after>=5&&after-before>=2)options.push({kind:'glove',index,target,value:after-before+((after>=9)?4:0)});}});
 if(g.boosterAvailable('dice'))options.push({kind:'dice',value:.1});
 options.sort((a,b)=>b.value-a.value||a.index-b.index);return options;
}
function simulate(l,profile,sample,assisted,guided=true,trace=false){
 const g=new Game(l),prefix=guided?(l.demonstration||(l.opening?[l.opening]:[])):[],actions=[];
 let combo=0,created=0,randomActions=0,stall=false;const kinds={hammer:0,glove:0,watering:0,dice:0};
 for(let guard=0;g.status==='playing'&&guard<l.moves+g.boosters.maxUses+3;guard++){
  if(assisted&&g.turns>=prefix.length&&g.turns>=Math.ceil(l.moves*.5)+g.boosterUses&&g.boosterUses<g.boosters.maxUses){let used=false;for(const a of boosterChoice(g)){const r=g.useBooster(a.kind,a.index,a.target);if(r.valid){kinds[a.kind]++;if(trace)actions.push({type:'booster',kind:a.kind,index:a.index,target:a.target});used=true;break;}}if(used)continue;}
  let a=g.turns<prefix.length?prefix[g.turns]:g.hint();if(!a){stall=true;break;}
  // Per-turn keyed noise: off/on paired samples share the same decision variates even if tools change the board.
  const rng=random((20261123^Math.imul(l.id,1000003)^Math.imul(sample+1,9176)^Math.imul(g.turns+1,2654435761))>>>0);
  if(g.turns>=prefix.length&&rng()<profile.error){const choices=legal(g);if(choices.length){a=choices[Math.floor(rng()*choices.length)];randomActions++;}}
  const r=g.click(a.index,a.target);if(!r.valid)throw new Error(`Invalid evaluation action L${l.id} ${JSON.stringify(a)}`);if(r.combo)combo++;if(r.created)created++;if(trace)actions.push({type:'click',index:a.index,target:a.target});
 }
 if(g.status==='playing')stall=true;
 const progress=g.level.goals.map(x=>g.progress(x)/x.target),won=g.status==='won';
 return{id:l.id,profile:profile.key,sample,assisted,guided,won,turns:g.turns,remaining:g.moves,progress:progress.reduce((a,b)=>a+b,0)/progress.length,minGoalProgress:Math.min(...progress),shuffles:g.shuffles,uses:g.boosterUses,...kinds,combo,created,randomActions,stall,...(trace?{actions}:{})};
}
function percentile(a,p){if(!a.length)return null;const sorted=[...a].sort((a,b)=>a-b);return sorted[Math.ceil(p*sorted.length)-1];}
function aggregate(runs){const wins=runs.filter(x=>x.won),fails=runs.filter(x=>!x.won),mean=(a,k)=>a.length?a.reduce((s,x)=>s+x[k],0)/a.length:null;const n=runs.length,w=wins.length;return{n,wins:w,winRate:w/n,winCI95:wilson(w,n),difficulty:100*(1-w/n),meanWinTurns:mean(wins,'turns'),medianWinTurns:percentile(wins.map(x=>x.turns),.5),p90WinTurns:percentile(wins.map(x=>x.turns),.9),meanWinRemaining:mean(wins,'remaining'),meanFailProgress:mean(fails,'progress'),meanUses:mean(runs,'uses'),stalls:runs.filter(x=>x.stall).length,usesByKind:Object.fromEntries(['hammer','glove','watering','dice'].map(k=>[k,runs.reduce((s,x)=>s+x[k],0)]))};}
function main(){const n=Number(process.argv[2]||200);if(!Number.isInteger(n)||n<1)throw new Error('samples must be positive integer');const out=path.resolve(root,process.argv[3]||'../outputs/difficulty-test-20261123');fs.mkdirSync(out,{recursive:true});const start=Date.now(),raw=[],levelResults=[],replays=[];const hashes=Object.fromEntries(['scripts/board/BoardModel.js','scripts/board/LevelSchema.js','scripts/managers/LevelRepository.cjs'].map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
 for(const l of LEVELS){const result={id:l.id,title:l.design.title,beat:l.design.beat,focus:l.design.focus,designDifficulty:l.design.difficulty,moves:l.moves,colors:l.colors,seed:l.seed,levelHash:sha(JSON.stringify(l)),profiles:{}};
  for(const p of profiles){result.profiles[p.key]={};for(const assisted of [false,true]){const rows=Array.from({length:n},(_,i)=>simulate(l,p,i,assisted));raw.push(...rows);result.profiles[p.key][assisted?'assisted':'baseline']=aggregate(rows);if(p.key==='standard'){for(const won of [false,true]){const found=rows.find(x=>x.won===won);if(found)replays.push(simulate(l,p,found.sample,assisted,true,true));}}}
   const a=raw.slice(-2*n,-n),b=raw.slice(-n);result.profiles[p.key].paired={rescued:a.filter((x,i)=>!x.won&&b[i].won).length,harmed:a.filter((x,i)=>x.won&&!b[i].won).length};
  }
  if(l.id<=20){result.unguidedStandard={};for(const assisted of [false,true]){const rows=Array.from({length:n},(_,i)=>simulate(l,profiles[1],i,assisted,false));raw.push(...rows);result.unguidedStandard[assisted?'assisted':'baseline']=aggregate(rows);}}
  levelResults.push(result);if(l.id%10===0)console.log(`L${l.id}: ${raw.length} runs, ${((Date.now()-start)/1000).toFixed(1)}s`);
 }
 const meta={date:'2026-11-23',samplesPerCell:n,totalRuns:raw.length,profiles,sourceHashes:hashes,levelSetHash:sha(JSON.stringify(LEVELS)),runnerHash:sha(fs.readFileSync(__filename)),runtime:process.version,durationSeconds:(Date.now()-start)/1000,policy:'Guided configured demonstration/opening, then Game.hint with keyed per-turn legal random action probability. Fixed shipped board/refill seed. Tool heuristic at 50% spent moves, goal-aware hammer/group-growth glove and watering, dice fallback; no lookahead. Unguided standard is first20 sensitivity only.',score:'100*(1-standard guided baseline wins/N). Higher is harder for this policy only.',uncertainty:'Wilson 95% interval conditional on policy noise and fixed layout/refill; not a human win-rate interval.'};
 const report={meta,levels:levelResults};fs.writeFileSync(path.join(out,'difficulty-results.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,'replays.json'),JSON.stringify(replays,null,2));
 const fields=Object.keys(raw[0]);fs.writeFileSync(path.join(out,'runs.csv'),'\uFEFF'+fields.join(',')+'\n'+raw.map(x=>fields.map(k=>x[k]??'').join(',')).join('\n')+'\n');
 const flat=[];for(const l of levelResults)for(const p of profiles)for(const m of ['baseline','assisted'])flat.push({id:l.id,profile:p.key,mode:m,...l.profiles[p.key][m]});console.log(JSON.stringify({runs:raw.length,seconds:meta.durationSeconds,stalls:raw.filter(x=>x.stall).length,overall:profiles.map(p=>({profile:p.key,baseline:aggregate(raw.filter(x=>x.profile===p.key&&!x.assisted&&x.guided)).winRate,assisted:aggregate(raw.filter(x=>x.profile===p.key&&x.assisted&&x.guided)).winRate})),hardest:levelResults.sort((a,b)=>b.profiles.standard.baseline.difficulty-a.profiles.standard.baseline.difficulty).slice(0,10).map(x=>({id:x.id,base:x.profiles.standard.baseline.winRate,assist:x.profiles.standard.assisted.winRate}))},null,2));
 for(const [f,h]of Object.entries(hashes))if(sha(fs.readFileSync(path.join(root,f)))!==h)throw new Error('Source changed during test');if(sha(JSON.stringify(LEVELS))!==meta.levelSetHash)throw new Error('Level objects mutated');
}
module.exports={simulate,aggregate,wilson,profiles,boosterChoice,legal};if(require.main===module)main();
