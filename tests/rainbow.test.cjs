const assert=require('node:assert/strict');
const {Game}=require('../scripts/board/BoardModel.js');
function fixture(){const g=new Game({rows:5,cols:5,colors:6,moves:20,boxes:0,ice:0,shape:0,seed:12,goals:[{kind:'color',color:5,target:999}]});g.board=Array.from({length:25},(_,i)=>g.tile(i%4));g.board[12]={kind:'rainbow',color:0,id:++g.serial};return g;}
let g=fixture(),before=JSON.stringify(g.board),moves=g.moves;
assert.equal(g.click(12).valid,false,'rainbow requires a selected adjacent target');
assert.equal(JSON.stringify(g.board),before);assert.equal(g.moves,moves);
for(const target of [0,6,12,24,-1,1.5]){g=fixture();before=JSON.stringify(g.board);assert.equal(g.click(12,target).valid,false);assert.equal(JSON.stringify(g.board),before);assert.equal(g.moves,20);}
g=fixture();g.board[13]={kind:'box',id:++g.serial};before=JSON.stringify(g.board);assert.equal(g.click(12,13).valid,false);assert.equal(JSON.stringify(g.board),before);
g=fixture();const color=g.board[13].color;const expected=g.board.flatMap((t,i)=>t.kind==='normal'&&t.color===color?[i]:[]).filter(i=>i!==13).concat(12,13).sort((a,b)=>a-b);
let result=g.click(12,13);assert(result.valid);assert.deepEqual(result.swap,{from:12,to:13});assert.deepEqual([...result.removed].sort((a,b)=>a-b),expected);assert.equal(g.moves,19);assert.equal(g.collected['color'+color],expected.length-1);assert(g.board.every(Boolean));
g=fixture();g.board[12].ice=true;before=JSON.stringify(g.board);assert.equal(g.click(12,13).valid,false,'frozen rainbow cannot be swapped');assert.equal(JSON.stringify(g.board),before);
g=fixture();g.board[13].ice=true;before=JSON.stringify(g.board);assert.equal(g.click(12,13).valid,false,'frozen neighbor cannot be swapped');assert.equal(JSON.stringify(g.board),before);
for(const kind of ['rocket','bomb','rainbow']){g=fixture();g.board[13]={kind,axis:'v',color:1,id:++g.serial};result=g.click(12,13);assert(result.valid);assert(result.combo.includes(kind));assert(result.effects.some(e=>e.kind==='combo'));assert(g.board.every(Boolean));assert.equal(g.moves,19);}
for(const axis of ['h','v']){g=fixture();g.board[12]={kind:'rocket',axis,color:0,id:++g.serial};const expected=axis==='h'?[10,11,12,13,14]:[2,7,12,17,22];result=g.click(12);assert.deepEqual([...result.removed].sort((a,b)=>a-b),expected);assert.equal(result.effects[0].axis,axis);}
g=fixture();const hint=g.hint();if(g.board[hint.index].kind==='rainbow')assert(g.neighbors(hint.index).includes(hint.target));
console.log('PASS rainbow swap targeting, invalid input, ice, all rainbow combinations, and unchanged rocket row/column rules');
