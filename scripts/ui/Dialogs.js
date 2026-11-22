function showDialog(title,body,kind=''){dialog.className=kind;dialog.setAttribute('aria-label',title);dialog.innerHTML=`<div class="dialog-head"><h2>${title}</h2><button class="close-button" data-action="close" aria-label="关闭弹窗">×</button></div><div class="dialog-body">${body}</div>`;if(!dialog.open)dialog.showModal();}
function settings(){showDialog('花园设置',`<div class="settings-row"><div><b>游戏音效</b><p>消除和道具的轻快声音</p></div><button class="icon-btn sound-toggle" data-action="sound" aria-label="${saved.sound?'关闭':'开启'}音效" aria-pressed="${saved.sound}">${icon(saved.sound?'sound':'mute')}</button></div><button class="settings-help secondary" data-action="help">${icon('help')}玩法说明</button>`);}
function help(){showDialog('花园怎么玩？',`<p>轻点 <b>2 个及以上</b>横向或纵向相邻的同色花果即可消除。每次有效点击消耗 1 步；对角相邻不计入。</p>${guides()}<p>火箭清除一行或一列，花瓣炸弹清除周围 3 × 3，点击彩虹花使边缘发光，再点击上下左右相邻棋子交换，消除全盘同类花果；点击其他位置取消，不消耗步数。冰冻棋子需先融化才能交换。连锁命中的彩虹花自动清除数量最多的一类。相邻的特殊道具会组合：双火箭清十字、炸弹加火箭清三行三列、双炸弹清 5 × 5、双彩虹清全盘。</p><p>在木箱旁消除花果可击碎木箱。花果先直落，再从侧上方斜落绕过障碍；新花果只从每个静态区域的顶部入口补充，木箱下方不自行生成。封闭处保留空格，破箱后贯通；缺口下方是独立区域入口。冰层需先命中一次，融化后花果保留。达到上方全部目标即可过关，收获分数不影响过关。无解时自动重排，不额外耗步。</p><p>下方四种花园工具不耗步，按本关配额与总次数使用，重开恢复：木锤敲除单格，冰层只融冰；手套交换相邻未冻结棋子；花洒把十字相邻普通花果染成中心色，预览后再次点击中心确认；骰子再次点击确认后重新排列所有有效格里的花果、特殊棋子、木箱与冰层，缺口不变。交换、染色、骰子均不会自动消除或增加目标进度。工具选中后可取消或按Esc。</p><p>星级取决于剩余步数：保留至少 35% 获 3 星，至少 15% 获 2 星，其余为 1 星。方向键移动焦点，回车或空格消除。</p>`);}
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

function rulesIntro(){showDialog('游戏规则简介',`<div class="rules-intro"><p><b>点击收获</b><br>点击横向或纵向相邻的 2 个及以上同色花果即可消除；每次有效消除消耗 1 步。在步数用完前完成上方全部目标即可过关。</p><p><b>特殊道具</b><br>一次消除 5 / 7 / 9 个及以上花果，分别生成火箭、炸弹和彩虹花。火箭清除一行或一列，炸弹清除周围 3 × 3。先点击彩虹花选中，再点击相邻花果交换，可消除全盘同类花果；点击其他位置取消。相邻特殊道具可触发组合效果。</p><p><b>花园障碍</b><br>消除木箱旁的花果或使用道具可击碎木箱。冰层需先命中一次才能融化。花果会向下掉落，并从侧上方绕过障碍。</p><p><b>四种花园工具</b><br>木锤处理单格，手套交换相邻棋子，花洒将十字范围花果染成中心色，骰子重排棋盘。工具不耗步，按本关可用次数使用。</p></div>`,'rules-dialog');}
