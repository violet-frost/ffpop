function cellHTML(t,i,old){if(!t)return game.isHole(game.row(i),game.col(i))?`<span class="cell hole" role="presentation"></span>`:`<button class="cell empty" data-cell="${i}" disabled aria-label="空格，等待上方或侧上方花果流入"></button>`;const label=(t.ice?'冰层中的':'')+(t.kind==='normal'?NAMES[t.color]:t.kind==='box'?'木箱':SPECIAL_NAMES[t.kind]);return /* VIEW:board/Cell.html */;}
// Keep grid slots and unchanged artwork alive across turns. Motion owns all transforms.
function updateBoard(before){
 const board=$('#board');
 if(!before||board.children.length!==game.board.length){board.innerHTML=game.board.map((t,i)=>cellHTML(t,i)).join('');return;}
 const slots=Array.from(board.children);
 for(let i=0;i<game.board.length;i++){
  const t=game.board[i],previous=before[i],node=slots[i],hole=game.isHole(game.row(i),game.col(i));
  if(hole){if(!node.classList.contains('hole'))node.outerHTML=cellHTML(t,i);continue;}
  if(node.tagName!=='BUTTON'){node.outerHTML=cellHTML(t,i);continue;}
  node.className='cell '+(!t?'empty':t.kind==='box'?'box':t.kind==='normal'?'c'+t.color:'special')+(t?.ice?' iced':'');
  node.disabled=!t;
  if(!t){node.removeAttribute('data-tile-id');node.removeAttribute('aria-disabled');node.setAttribute('aria-label','空格，等待上方或侧上方花果流入');node.replaceChildren();continue;}
  node.dataset.tileId=t.id;node.setAttribute('role','gridcell');
  if(t.kind==='box')node.setAttribute('aria-disabled','true');else node.removeAttribute('aria-disabled');
  const label=(t.ice?'冰层中的':'')+(t.kind==='normal'?NAMES[t.color]:t.kind==='box'?'木箱':SPECIAL_NAMES[t.kind]);
  node.setAttribute('aria-label',`第${game.row(i)+1}行第${game.col(i)+1}列，${label}`);
  if(!previous||previous.kind!==t.kind||previous.color!==t.color||previous.axis!==t.axis||!!previous.ice!==!!t.ice)
   node.innerHTML=(t.kind==='normal'?token(t.color):t.kind==='box'?box():special(t.kind,t.axis))+(t.ice?Art.ice():'');
 }
}
function update(before){$('#moves').classList.toggle('low',game.moves<=5);$('#moves strong').textContent=game.moves;$('#goals').innerHTML=game.level.goals.map(g=>goalHTML(g)).join('');$('#score').textContent=game.score.toLocaleString();updateMeter();updateBoard(before);updateBoosters();}
