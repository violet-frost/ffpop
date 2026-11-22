const safeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const menuIcon=name=>name==='hint'?icon('spark'):name==='help'?Art.sprite('book','menu-art'):BloomAssets['ui_'+name]||icon(name);
const catPortrait=()=>`<div class="cat-art illustrated-cat">${sceneImage('home')}</div>`;
const sceneImage=(name,cls='')=>`<img class="scene-image ${cls}" src="${Art.assetURL('garden_'+name)}" alt="" draggable="false">`;
const chapterStars=ch=>LEVELS.filter(l=>l.chapter===ch).reduce((sum,l)=>sum+(saved.stars[l.id]||0),0);
const bottomNav=active=>`<nav class="bottom-nav" aria-label="主导航">${[['home','主页','home'],['levels','关卡','map'],['placeholder','成就','achievement'],['placeholder','好友','friends']].map(([action,label,symbol])=>`<button data-action="${action}" data-title="${label}" class="${active===label?'active':''}" ${active===label?'aria-current="page"':''}>${menuIcon(symbol)}<span>${label}</span></button>`).join('')}</nav>`;
function endTurnView(){BloomMotion.resume();cancelBooster();cancelRainbow();turnAbort?.abort();session++;clearTimeout(turnTimer);clearTimeout(resultTimer);clearTimeout(toastTimer);$('#toast').classList.remove('visible');locked=false;}
const MAP_POINTS=[[48,89],[64,80],[42,71],[28,62],[55,54],[46,46],[32,37.5],[52,29.5],[27,21.3],[47,14.2]];
function mapNodes(ch){return LEVELS.filter(l=>l.chapter===ch).map((level,n)=>{const [x,y]=MAP_POINTS[n],stars=saved.stars[level.id]||0,current=level.id===nextLevel();return `<button class="level-node ${stars?'completed':''} ${current?'current':''}" data-action="preview" data-level="${level.id}" style="left:${x}%;top:${y}%" aria-label="第 ${level.id} 关，${stars?'已获'+stars+'星':current?'当前关卡':'未完成'}"><span class="node-stars" aria-hidden="true">${stars?'★'.repeat(stars):''}</span><strong>${level.id}</strong>${current?'<span class="node-current">开始</span>':''}${[3,10,20].includes(level.id)?'<span class="node-highlight">'+safeText(level.design?.title||'')+'</span>':''}</button>`;}).join('');}
function showMap(ch=Math.floor((nextLevel()-1)/10)){
 if(!Number.isInteger(ch)||ch<0||ch>=CHAPTERS.length)return;dialog.close();endTurnView();chapter=ch;page='map';
 render(/* VIEW:menu/LevelSelect.html */);
 const scroller=$('.map-scroll');const next=Math.min(ch*10+10,Math.max(ch*10+1,nextLevel()));const node=$(`[data-level="${next}"]`);if(node)scroller.scrollTop=node.offsetTop-scroller.clientHeight*.67;
}
function previewLevel(id){
 if(locked||!Number.isInteger(id)||id<1||id>50)return;
 const level=LEVELS[id-1];showDialog(`第 ${id} 关`,`<div class="preview-goals" aria-label="本关目标">${level.goals.map(goal=>previewGoal(goal)).join('')}</div><p class="preview-caption">${safeText(level.design?.title||'完成全部目标')}</p><p class="preview-strategy">${safeText(level.design?.intent||'')}</p><button class="primary confirm-start" data-action="start" data-level="${id}">开始游戏</button>`,'level-preview');
}
function previewGoal(goal){return `<div class="goal"><div class="goal-icon">${goalIcon(goal)}</div><div class="goal-count">${goal.target}</div></div>`;}
function showEmpty(title){showDialog(title,'<div class="empty-content" aria-label="空白内容"></div>','placeholder-dialog');}
function goalPercent(){if(!game)return 0;const total=game.level.goals.reduce((s,g)=>s+g.target,0);return Math.round(game.level.goals.reduce((s,g)=>s+game.progress(g),0)/Math.max(1,total)*100);}
function updateMeter(){const fill=$('#score-fill'),meter=$('.harvest-meter');if(fill)fill.style.width=goalPercent()+'%';if(meter)meter.setAttribute('aria-valuenow',goalPercent());}
function continueResult(){
 if(pendingChapter!==null){const ch=pendingChapter;pendingChapter=null;saved.announcedChapters.push(ch);persist();showDialog('解锁新章节！',`<div class="chapter-preview">${sceneImage('map')}</div><h3 class="chapter-unlocked-name">第 ${ch+1} 章 ${CHAPTERS[ch].name}</h3><button class="primary" data-action="unlock-continue" data-chapter="${ch}">继续</button>`,'chapter-unlock');return;}
 if(game.status==='won'&&game.level.id<50)previewLevel(game.level.id+1);else showMap(game.level.chapter);
}

