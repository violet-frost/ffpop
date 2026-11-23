(function(){
'use strict';
const {Game,LEVELS,CHAPTERS}=Bloom,{icon,token,special,box,garden,homeScene,flower,wrap}=Art;
/* SCRIPT:entities/TileDefinitions.js */
const $=s=>document.querySelector(s),app=$('#app'),dialog=$('#dialog');

let selectedRainbow=null,pendingChapter=null;
let game=null,page='home',chapter=0,locked=false,session=0,toastTimer,turnTimer,resultTimer,audioContext,turnAbort;
/* SCRIPT:ui/GardenTheme.js */
/* SCRIPT:ui/HeaderRenderer.js */
/* SCRIPT:board/BoardRenderer.js */
/* SCRIPT:ui/Dialogs.js */
/* SCRIPT:systems/SoundSystem.js */
/* SCRIPT:systems/FeedbackSystem.js */
/* SCRIPT:managers/ProgressManager.js */
/* SCRIPT:ui/BoosterUI.js */
function levelCards(ch,cls='level-grid'){return `<div class="${cls}">${LEVELS.filter(l=>l.chapter===ch).map(l=>`<button class="level-card ${l.id===nextLevel()?'current':''} ${saved.stars[l.id]?'completed':''}" data-action="start" data-level="${l.id}" aria-label="第${l.id}关${saved.stars[l.id]?'，已获'+saved.stars[l.id]+'星':''}">${saved.stars[l.id]?icon('leaf','tiny-leaf'):''}<strong>${String(l.id).padStart(2,'0')}</strong><span class="${saved.stars[l.id]?'level-stars':'level-label'}">${saved.stars[l.id]?starText(saved.stars[l.id]):l.id===nextLevel()?'从这里开始':'点击试玩'}</span></button>`).join('')}</div>`;}
function tabs(action='chapter',ch=chapter,cls='chapter-tabs'){return `<div class="${cls}" role="group" aria-label="选择章节">${CHAPTERS.map((c,i)=>`<button data-action="${action}" data-chapter="${i}" class="chapter-tab ${ch===i?'active':''}" style="--chapter:${c.color}" aria-pressed="${ch===i}"><span class="tab-dot"></span>${c.name}</button>`).join('')}</div>`;}
function home(){
 dialog.close();endTurnView();page='home';const level=nextLevel(),current=CHAPTERS[Math.floor((level-1)/10)];
 render(/* VIEW:menu/MainMenu.html */);window.scrollTo(0,0);
}

function start(id){BloomMotion.resume();pendingChapter=null;cancelBooster();cancelRainbow();if(!Number.isInteger(id)||id<1||id>50)return;turnAbort?.abort();session++;clearTimeout(turnTimer);clearTimeout(resultTimer);dialog.close();game=new Game(LEVELS[id-1]);page='game';locked=false;const ch=CHAPTERS[game.level.chapter],done=LEVELS.filter(l=>l.chapter===game.level.chapter&&saved.stars[l.id]).length;
 render(/* VIEW:game/Game.html */);window.scrollTo(0,0);updateBoosters();showLevelLesson();showBoosterLesson();}
function showLevelLesson(){if(selectedBooster)return;if(game.boosterUses>0){const tip=$('#board-tip');if(tip)tip.textContent='观察新布局，继续收获目标花果';return;}const lesson=game.level.tutorial?.find(t=>t.turn===game.turns),tip=$('#board-tip');if(lesson&&tip){tip.textContent=lesson.text;for(const i of lesson.cells)$(`[data-cell="${i}"]`)?.classList.add('lesson-cell');}}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
async function play(i,target,booster){
 if(locked||page!=='game'||dialog.open||BloomMotion.paused)return;
 const cell=$(`[data-cell="${i}"]`),rect=cell?.getBoundingClientRect(),before=game.board.map(t=>t?{...t}:null),res=booster?game.useBooster(booster,i,target):game.click(i,target);
 if(!res.valid){if(booster){toast('这次道具操作无效，未消耗次数，请重新选择');updateBoosters();return;}if(res.reason==='single'){cell?.classList.remove('invalid');void cell?.offsetWidth;cell?.classList.add('invalid');toast('再找一位同色伙伴吧，至少相邻两个才能消除');sound('bad');}return;}
 locked=true;updateBoosters();turnAbort?.abort();turnAbort=new AbortController();const signal=turnAbort.signal,current=session;
 document.querySelectorAll('.hinted').forEach(node=>node.classList.remove('hinted'));
 const tip=$('#board-tip');tip.textContent=res.booster?BOOSTERS[res.booster].name+'正在施展…':res.fired.length?'道具正在绽放…':'正在收获花果…';
 $('#moves strong').textContent=game.moves;$('#moves').classList.toggle('low',game.moves<=5);
 try{
  await BloomMotion.run({game,before,response:res,clicked:i,signal,commit:()=>update(before),onPhase:phase=>{
   if(phase==='swap'&&res.booster==='glove')sound('glove');
   if(phase==='select'||phase==='release'){if(phase==='select'){if(res.booster!=='glove')sound(res.booster||'pop');}else{const kinds=new Set((res.effects||[]).map(e=>e.kind));if(res.combo)kinds.add('combo');if(!kinds.size)kinds.add('special');for(const kind of kinds)sound(kind);}if(rect)particles(rect.x+rect.width/2,rect.y+rect.height/2,res.combo?24:10);}
   if(phase==='clear'){if(res.created)sound('create');if(res.combo)praise('一起绽放！');else if(res.created)praise({rocket:'火箭发芽！',bomb:'花瓣绽放！',rainbow:'彩虹盛开！'}[res.created]);else if(res.count>=8)praise('好一场丰收！');}
   if(phase==='fall')tip.textContent='花果正在轻轻落下…';
  }});
  if(session!==current||signal.aborted||page!=='game')return;
  $('#board-tip').textContent=res.melted.length?'冰层融化了，继续收获花果':'相邻同色，两个就能消除';showLevelLesson();
  $('#live').textContent=res.booster?`${BOOSTERS[res.booster].name}已使用，不耗步。剩余${game.moves}步，本关还可使用${game.boosters.maxUses-game.boosterUses}次辅助道具。`:`消除${res.count}个，剩余${game.moves}步。${res.created?'生成'+SPECIAL_NAMES[res.created]+'。':''}`;
  // Keep focus only for keyboard users; touch play must not jump the viewport.
  if(document.activeElement===document.body&&window.matchMedia('(hover:hover)').matches)$(`[data-cell="${i}"]`)?.focus({preventScroll:true});
  if(res.shuffled)toast('没有可消除的组合，已自动重排，不消耗步数');
  if(game.status==='playing'){locked=false;updateBoosters();if(res.booster)toast(BOOSTERS[res.booster].name+'已使用，不消耗步数');return;}
  if(game.status==='won'){const stars=game.stars();saved.stars[game.level.id]=Math.max(saved.stars[game.level.id]||0,stars);const ch=game.level.chapter;if(ch<4&&LEVELS.filter(l=>l.chapter===ch).every(l=>saved.stars[l.id])&&!saved.announcedChapters.includes(ch+1))pendingChapter=ch+1;persist();}
  resultTimer=setTimeout(()=>{if(session===current&&!signal.aborted)result();},BloomMotion.TIMING.resultPause);
 }catch(error){if(error.name!=='AbortError'){console.error(error);if(session===current&&page==='game'){update();locked=false;updateBoosters();toast('动画已恢复，可以继续游戏');}}}
}

function result(){if(BloomMotion.paused){resultTimer=setTimeout(result,100);return;}locked=false;page='result';const won=game.status==='won',stars=game.stars();render(/* VIEW:ui/ResultPanel.html */);window.scrollTo(0,0);$('.result-actions button')?.focus({preventScroll:true});if(won){sound('win');particles(window.innerWidth/2,110,55,true);}}

function hint(){cancelBooster();cancelRainbow();const h=game.hint();if(!h)return;document.querySelectorAll('.hinted').forEach(el=>el.classList.remove('hinted'));for(const i of h.group)$(`[data-cell="${i}"]`)?.classList.add('hinted');const t=game.board[h.index];toast(t.kind==='normal'?`看看这些${NAMES[t.color]}，试着让它们一起绽放`:t.kind==='rainbow'?'先选中发光彩虹花，再点击旁边提示的花果':'试试这个'+SPECIAL_NAMES[t.kind]);}
function cancelRainbow(){
 selectedRainbow=null;
 document.querySelectorAll('.rainbow-selected,.rainbow-neighbor').forEach(node=>{node.classList.remove('rainbow-selected','rainbow-neighbor');node.removeAttribute('aria-selected');});
 const tip=$('#board-tip');if(tip)tip.textContent='相邻同色，两个就能消除';
}
function chooseCell(i){
 if(locked||page!=='game'||dialog.open||BloomMotion.paused)return;
 if(selectedBooster){useBoosterCell(i);return;}
 if(selectedRainbow!==null){const from=selectedRainbow,t=game.board[i],valid=game.neighbors(from).includes(i)&&t&&t.kind!=='box'&&!t.ice;cancelRainbow();if(valid)play(from,i);return;}
 if(game.board[i]?.kind==='rainbow'){
  if(game.board[i].ice){toast('先消除旁边的花果，融化冰层吧');return;}
  selectedRainbow=i;const node=$(`[data-cell="${i}"]`);node.classList.add('rainbow-selected');node.setAttribute('aria-selected','true');
  for(const n of game.neighbors(i)){const t=game.board[n];if(t&&t.kind!=='box'&&!t.ice)$(`[data-cell="${n}"]`)?.classList.add('rainbow-neighbor');}
  $('#board-tip').textContent='点击相邻花果交换，点击其他位置取消';$('#live').textContent='已选中彩虹花，请点击上下左右相邻棋子。';return;
 }
 play(i);
}
function act(event){unlockAudio();const cell=event.target.closest('[data-cell]');if(cell){chooseCell(Number(cell.dataset.cell));return;}if(selectedRainbow!==null)cancelRainbow();const target=event.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;if(action==='booster'){selectBooster(target.dataset.booster);return;}if(action==='cancel-booster'){cancelBooster();cancelRainbow();showLevelLesson();return;}cancelBooster();if(action==='sound'){saved.sound=!saved.sound;persist();applyAudioSettings();document.querySelectorAll('.sound-toggle').forEach(el=>{el.innerHTML=icon(saved.sound?'sound':'mute');el.setAttribute('aria-label',(saved.sound?'关闭':'开启')+'音效');el.setAttribute('aria-pressed',String(saved.sound));});if(saved.sound)sound('pop');}else if(action==='pause')pauseGame();else if(action==='exit')exitGame();else if(action==='home'){dialog.close();home();}else if(action==='preview')previewLevel(Number(target.dataset.level||nextLevel()));else if(action==='placeholder')showEmpty(target.dataset.title||'');else if(action==='result-continue')continueResult();else if(action==='map-chapter')showMap(Number(target.dataset.chapter));else if(action==='unlock-continue')showMap(Number(target.dataset.chapter));else if(action==='start')start(Number(target.dataset.level||nextLevel()));else if(action==='rules')rulesIntro();else if(action==='help')help();else if(action==='settings')settings();else if(action==='chapter'){chapter=Number(target.dataset.chapter);document.querySelector('.chapter-tabs').outerHTML=tabs();$('#home-levels').innerHTML=levelCards(chapter);}else if(action==='dialog-chapter'){levelDialog(Number(target.dataset.chapter));}else if(action==='close')dialog.close();else if(action==='levels')showMap();else if(action==='retry')start(game.level.id);else if(action==='restart')restart();else if(action==='hint'&&page==='game'&&!locked){dialog.close();BloomMotion.resume();hint();}}
dialog.addEventListener('close',()=>{if(!dialog.open)BloomMotion.resume();});
document.addEventListener('click',act);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectedBooster){cancelBooster();cancelRainbow();showLevelLesson();return;}if(e.key==='Escape'&&selectedRainbow!==null){cancelRainbow();return;}if(dialog.open||page!=='game')return;const cell=e.target.closest('[data-cell]');if(!cell||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const delta={ArrowUp:-8,ArrowDown:8,ArrowLeft:-1,ArrowRight:1}[e.key];let i=Number(cell.dataset.cell);for(let n=0;n<72;n++){const prev=i;i+=delta;if(i<0||i>=72)return;if((delta===1||delta===-1)&&game.row(i)!==game.row(prev))return;const next=$(`[data-cell="${i}"]`);if(next){next.focus();return;}}});
chapter=Math.floor((nextLevel()-1)/10);home();
// Read-only interface for demo verification and inspection.
window.BloomDemo={get game(){return game;},get page(){return page;},get locked(){return locked;},get phase(){return $('#board')?.dataset.phase||'idle';}};
})();
