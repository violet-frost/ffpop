'use strict';
const assert=require('node:assert/strict');
const {Game,LEVELS}=require('../scripts/board/BoardModel.js');
const {simulate,aggregate,wilson,profiles,boosterChoice,legal}=require('../tools/test_difficulty.cjs');
assert.deepEqual(wilson(0,0),[null,null]);assert(wilson(0,500)[1]<.008);assert(wilson(500,500)[0]>.992);assert(Math.abs(wilson(250,500)[0]+wilson(250,500)[1]-1)<1e-10);
for(const id of [5,12,16,19,20,24,38,49,50]){
 const l=LEVELS[id-1];const a=simulate(l,profiles[1],7,true,true,true),b=simulate(l,profiles[1],7,true,true,true);assert.deepEqual(a,b,'reproducible L'+id);
 const g=new Game(l);for(const x of a.actions){const r=x.type==='booster'?g.useBooster(x.kind,x.index,x.target):g.click(x.index,x.target);assert(r.valid,'replay L'+id);}assert.equal(g.status==='won',a.won);assert.equal(g.turns,a.turns);assert.equal(g.boosterUses,a.uses);
 const h=new Game(l),copy=JSON.stringify(h.board),c=new Game(l);boosterChoice(h);assert.equal(JSON.stringify(h.board),copy,'candidate scoring restores board');const first=h.hint();assert.deepEqual(h.click(first.index,first.target),c.click(first.index,first.target),'candidate scoring preserves RNG');
 for(const x of legal(new Game(l))){const t=new Game(l);assert(t.click(x.index,x.target).valid,'enumerated action legal');}
}
const rows=[simulate(LEVELS[48],profiles[1],1,false),simulate(LEVELS[48],profiles[1],2,true)];const a=aggregate(rows);assert.equal(a.n,2);assert.equal(a.wins,rows.filter(x=>x.won).length);assert.equal(a.difficulty,100*(1-a.wins/a.n));console.log('Difficulty methodology checks passed: deterministic routes, replay, candidate purity, legal actions, sample accounting, Wilson limits.');
