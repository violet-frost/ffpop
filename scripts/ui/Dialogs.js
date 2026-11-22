function showDialog(title,body,kind=''){dialog.className=kind;dialog.setAttribute('aria-label',title);dialog.innerHTML=`<div class="dialog-head"><h2>${title}</h2><button class="close-button" data-action="close" aria-label="关闭弹窗">×</button></div><div class="dialog-body">${body}</div>`;if(!dialog.open)dialog.showModal();}
function settings(){showDialog('花园设置',`<div class="audio-settings">${[['master','总音量'],['music','背景音乐'],['effects','音效']].map(([channel,label])=>`<label class="volume-control"><span><b>${label}</b><output data-volume-output="${channel}" for="volume-${channel}">${saved.audio[channel]}%</output></span><input id="volume-${channel}" type="range" min="0" max="100" step="1" value="${saved.audio[channel]}" data-volume="${channel}" aria-label="${label}"></label>`).join('')}</div><div class="settings-row"><div><b>游戏音效</b><p>消除和道具的轻快声音</p></div><button class="icon-btn sound-toggle" data-action="sound" aria-label="${saved.sound?'关闭':'开启'}音效" aria-pressed="${saved.sound}">${icon(saved.sound?'sound':'mute')}</button></div>`,'audio-dialog');}
function rulesContent(){return `<div class="rules-intro"><p><b>点击收获</b><br>在规定的步数内，点击两个及以上相连的同色花、果来消除，完成指定目标即可过关。</p><p><b>特殊道具</b><br>一次消除 5 / 7 / 9 个及以上花果，分别生成火箭、炸弹和彩虹花。<br>火箭清除一行或一列，炸弹清除周围 3 × 3。先点击彩虹花选中，再点击相邻花果交换，可消除全盘同类花果；点击其他位置取消。相邻特殊道具可触发组合效果。</p><p><b>四种花园工具</b><br>木锤处理单格，手套交换相邻棋子，花洒将十字范围花果染成中心色，骰子重排棋盘。工具不耗步，按本关可用次数使用。</p></div>`;}
function help(){showDialog('花园怎么玩？',rulesContent(),'rules-dialog');}
function levelDialog(ch=Math.floor((nextLevel()-1)/10)){showMap(ch);}
function restart(){showDialog('重新种下这一关？',/* VIEW:ui/PausePanel.html */);}

function pauseGame(){
 if(page!=='game')return;
 BloomMotion.pause();
 showDialog('游戏暂停',`<div class="pause-menu"><button class="primary" data-action="close">继续游戏</button><div class="pause-options">${button('hint','提示','secondary')}${button('help','玩法','secondary')}${button('restart','重新开始','secondary')}${button('settings','设置','secondary')}</div><button class="secondary" data-action="exit">退出关卡</button></div>`,'pause-dialog');
}
function exitGame(){
 if(page!=='game')return;
 BloomMotion.pause();
 showDialog('退出关卡？',`<p>退出后，本关尚未完成的进度不会保留。</p><div class="dialog-buttons">${button('close','继续游戏','secondary')}${button('home','退出关卡','primary')}</div>`,'exit-dialog');
}

function rulesIntro(){showDialog('游戏规则简介',rulesContent(),'rules-dialog');}
