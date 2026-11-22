function starText(n){return '★'.repeat(n)+'☆'.repeat(3-n);}
function button(action,label,cls='secondary',symbol='',extra=''){return `<button class="${cls}" data-action="${action}" ${extra}>${symbol?icon(symbol):''}${label}</button>`;}
function header(){return '';}
function render(content){document.body.dataset.page=page;app.innerHTML=`<main class="shell">${Art.spriteDefs()}${header()}${content}</main>`;}
function goalIcon(goal){return goal.kind==='color'?token(goal.color):goal.kind==='box'?box():`<div class="ice-icon" style="width:100%;height:100%">${token(5)}${Art.ice()}</div>`;}
function goalHTML(goal,result=false){const done=game.progress(goal)>=goal.target;return `<div class="goal ${done?'done':''}" aria-label="${goal.kind==='color'?NAMES[goal.color]:goal.kind==='box'?'木箱':'冰层'}：${game.progress(goal)} / ${goal.target}"><div class="goal-icon">${goalIcon(goal)}</div><div class="goal-count">${result?`<b>${game.progress(goal)}</b> / ${goal.target}`:done?'完成':`<b>${goal.target-game.progress(goal)}</b>`}</div></div>`;}
function guides(){return ['rocket','bomb','rainbow'].map((k,i)=>`<div class="power-guide"><div>${special(k)}</div><div><b>${[5,7,9][i]} 个及以上</b><p>生成${SPECIAL_NAMES[k]}</p></div></div>`).join('');}
