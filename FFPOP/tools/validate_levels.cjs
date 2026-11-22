'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const R=path.resolve(__dirname,'..');const {Game,LEVELS,random}=require('../scripts/board/BoardModel.js'),S=require('../scripts/board/LevelSchema.js');
const hash=l=>crypto.createHash('sha256').update(JSON.stringify(l)).digest('hex');
// A separate, reproducible assist policy. Its results are samples, not human difficulty measurements.
function assistSample(l,mode){const g=new Game(l),rng=random(9821+mode*101),prefix=l.demonstration||(l.opening?[l.opening]:[]);let guard=0;
 while(g.status==='playing'&&guard++<l.moves+9){
  if(g.turns>=prefix.length&&g.turns>=Math.ceil(l.moves*.4)+g.boosterUses&&g.boosterUses<g.boosters.maxUses){
   const kinds=['hammer','glove','watering','dice'];let used=false;
   for(let offset=0;offset<4&&!used;offset++){const kind=kinds[(l.id+g.boosterUses+offset)%4];if(!g.boosterAvailable(kind))continue;
    if(kind==='dice'){used=g.useBooster(kind).valid;continue;}
    const options=g.board.flatMap((t,index)=>g.boosterTargets(kind,index).map(target=>({index,target,value:kind==='hammer'?(t.ice?4:t.kind==='box'?5:l.goals.some(goal=>goal.kind==='color'&&goal.color===t.color&&g.progress(goal)<goal.target)?3:1):kind==='watering'?g.boosterTargets(kind,index).length:Math.abs((g.hint()?.index??index)-target)}))).sort((a,b)=>b.value-a.value);
    for(const a of options)if(g.useBooster(kind,a.index,a.target).valid){used=true;break;}
   }
   if(used)continue;
  }
  let h=g.turns<prefix.length?prefix[g.turns]:g.hint();if(!h)break;
  if(mode&&g.turns>=prefix.length&&rng()<.16){const choices=g.board.flatMap((t,index)=>t&&(t.kind==='normal'&&g.group(index).length>=2||t.kind==='rocket'||t.kind==='bomb')?[{index}]:[]);if(choices.length)h=choices[Math.floor(rng()*choices.length)];}
  if(!g.click(h.index,h.target).valid)break;
 }
 return {won:g.status==='won',uses:g.boosterUses};
}
const report=[],solutions=[];
for(const l of LEVELS){const errs=S.validate(l);if(errs.length)throw new Error(l.id+': '+errs.join(';'));let reference=null,wins=0;
 for(let mode=0;mode<16||!reference&&mode<256;mode++){const g=new Game(l),rng=random(9821+mode*101),actions=[];let combos=0;const prefix=l.demonstration||(l.opening?[l.opening]:[]);
  while(g.status==='playing'&&g.turns<l.moves){let h=actions.length<prefix.length?prefix[actions.length]:g.hint();if(!h)break;if(mode&&actions.length>=prefix.length&&rng()<.16){const options=[];for(let i=0;i<72;i++){const t=g.board[i];if(t?.kind==='normal'&&g.group(i).length>=2||t?.kind==='rocket'||t?.kind==='bomb')options.push({index:i});}if(options.length)h=options[Math.floor(rng()*options.length)];}const res=g.click(h.index,h.target);if(!res.valid)break;if(!actions.length&&l.opening?.created&&res.created!==l.opening.created)throw new Error(l.id+' teaching creation failed');if(!actions.length&&l.opening?.combo&&res.combo!==l.opening.combo)throw new Error(l.id+' teaching combo failed');if(res.combo)combos++;actions.push({index:h.index,...(h.target!==undefined?{target:h.target}:{})});}
  if(g.status==='won'){if(mode<16)wins++;if(!reference)reference={sample:mode,turns:g.turns,remaining:g.moves,combos,actions};}
 }
 if(!reference)throw new Error('No successful sampled route for level '+l.id);
 const assisted=Array.from({length:16},(_,mode)=>assistSample(l,mode));
 report.push({boosterPolicyWins:assisted.filter(s=>s.won).length,boosterPolicyRuns:16,boosterPolicyUses:assisted.reduce((n,s)=>n+s.uses,0),boosterPolicyDescription:'完成教学操作并消耗40%步数后，在配额内选用辅助道具；同样16路策略样本，不是人类通关率。',id:l.id,title:l.design.title,hash:hash(l),moves:l.moves,referencePolicyMode:reference.sample,referenceTurns:reference.turns,remaining:reference.remaining,combos:reference.combos,policyWins:wins,policyRuns:16,policyDescription:'固定种子，教学首步后采用提示策略；其余15路按16%概率偏离提示。不是人类通关率。',humanStatus:'待真人试玩'});solutions.push({id:l.id,seed:l.seed,hash:hash(l),actions:reference.actions});
}
fs.writeFileSync(path.join(R,'data/validation/level-report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(R,'tests/redesign-solutions.json'),JSON.stringify(solutions,null,2)+'\n');console.log('Verified 50 levels, 800 baseline + 800 assisted policy runs; all have a replayable winning route; additional reference search modes are recorded separately.');console.log('First 20 reference actions:',report.slice(0,20).reduce((s,r)=>s+r.referenceTurns,0));
