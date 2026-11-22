const assert=require('node:assert/strict');
const reference=require('./reference_turns.json');
const {Game}=require('../scripts/board/BoardModel.js');
const LEVELS=require('./fixtures/legacy-levels.json');
const stamp=g=>g.board.map(t=>t?`${t.kind}:${t.color??'-'}:${t.axis??'-'}:${t.ice?1:0}:${t.id}`:'_').join('|');
let count=0,changedBranches=0;
assert.equal(reference.length,50);
for(const ref of reference){
 const g=new Game(LEVELS[ref.id-1]);
 assert.equal(stamp(g),ref.initial,`level ${ref.id} initial board`);
 for(const turn of ref.turns){
  if(g.board[turn.index]?.kind==='rainbow'){changedBranches++;break;}
  if(!g.board.some(t=>t?.kind==='rainbow'))assert.equal(g.hint().index,turn.index,`level ${ref.id} hint`);
  const {effects,...res}=g.click(turn.index);
  assert.deepEqual({...res,created:res.created??'',combo:res.combo??'',shuffled:!!res.shuffled},turn.response);
  assert.equal(stamp(g),turn.board,`level ${ref.id} turn ${g.turns} gravity`);
  assert.equal(g.score,turn.score);assert.equal(g.moves,turn.moves);
  assert.deepEqual(g.collected,turn.collected);assert.equal(g.status,turn.status);
  count++;
 }
 if(g.status==='won')assert.equal(g.stars(),ref.stars);else assert(g.board[ref.turns[g.turns].index]?.kind==='rainbow');
}
console.log(`PASS unchanged-rule parity: ${reference.length} initial boards / ${count} original turns; ${changedBranches} branches stop at intentionally changed rainbow input`);
