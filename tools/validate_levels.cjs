'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const R=path.resolve(__dirname,'..');const {Game,LEVELS,random}=require('../scripts/board/BoardModel.js'),S=require('../scripts/board/LevelSchema.js');
const hash=l=>crypto.createHash('sha256').update(JSON.stringify(l)).digest('hex');
const report=[],solutions=[];
for(const l of LEVELS){const errs=S.validate(l);if(errs.length)throw new Error(l.id+': '+errs.join(';'));let reference=null,wins=0;
 for(let mode=0;mode<16;mode++){const g=new Game(l),rng=random(9821+mode*101),actions=[];let combos=0;const prefix=l.demonstration||(l.opening?[l.opening]:[]);
  while(g.status==='playing'&&g.turns<l.moves){let h=actions.length<prefix.length?prefix[actions.length]:g.hint();if(!h)break;if(mode&&actions.length>=prefix.length&&rng()<.16){const options=[];for(let i=0;i<72;i++){const t=g.board[i];if(t?.kind==='normal'&&g.group(i).length>=2||t?.kind==='rocket'||t?.kind==='bomb')options.push({index:i});}if(options.length)h=options[Math.floor(rng()*options.length)];}const res=g.click(h.index,h.target);if(!res.valid)break;if(!actions.length&&l.opening?.created&&res.created!==l.opening.created)throw new Error(l.id+' teaching creation failed');if(!actions.length&&l.opening?.combo&&res.combo!==l.opening.combo)throw new Error(l.id+' teaching combo failed');if(res.combo)combos++;actions.push({index:h.index,...(h.target!==undefined?{target:h.target}:{})});}
  if(g.status==='won'){wins++;if(!reference)reference={turns:g.turns,remaining:g.moves,combos,actions};}
 }
 if(!reference)throw new Error('No successful sampled route for level '+l.id);
 report.push({id:l.id,title:l.design.title,hash:hash(l),moves:l.moves,referenceTurns:reference.turns,remaining:reference.remaining,combos:reference.combos,policyWins:wins,policyRuns:16,policyDescription:'固定种子，教学首步后采用提示策略；其余15路按16%概率偏离提示。不是人类通关率。',humanStatus:'待真人试玩'});solutions.push({id:l.id,seed:l.seed,hash:hash(l),actions:reference.actions});
}
fs.writeFileSync(path.join(R,'data/validation/level-report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(R,'tests/redesign-solutions.json'),JSON.stringify(solutions,null,2)+'\n');console.log('Verified 50 levels, 800 policy runs; all have a replayable winning route.');console.log('First 20 reference actions:',report.slice(0,20).reduce((s,r)=>s+r.referenceTurns,0));
