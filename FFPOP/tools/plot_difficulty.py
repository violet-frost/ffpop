"""Plot measured policy difficulty with ReportLab's standard LinePlot charts."""
import json, math, pathlib, statistics
from reportlab.graphics.shapes import Drawing, String, Rect, Line
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics import renderSVG, renderPDF
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'outputs'/'difficulty-test-20261123'
d=json.loads((OUT/'difficulty-results.json').read_text(encoding='utf-8-sig')); levels=d['levels']; n=d['meta']['samplesPerCell']
pdfmetrics.registerFont(TTFont('YaHei','C:/Windows/Fonts/msyh.ttc'))
W,H=1120,940; dr=Drawing(W,H); dr.add(Rect(0,0,W,H,fillColor=HexColor('#FAFBF8'),strokeColor=None))
ink='#263C33'; pine='#315E44'; pink='#C25D7E'; blue='#687DB0'
def label(x,y,s,size=12,color=ink):dr.add(String(x,y,s,fontName='YaHei',fontSize=size,fillColor=HexColor(color)))
label(40,898,'花果点点乐 · 50关难度测试',28)
label(40,867,f'2026-11-21 | 当前 flow 掉落规则 | 每组 {n} 次 | 共 {d["meta"]["totalRuns"]:,} 局程序测试',12)
label(40,842,'难度 = 标准策略失败比例 × 100；数值越高，当前策略越难通关。并非真人通关率。',12)
def chart(y,h,maxlevel,series,ci=False,shade=False):
 x,w=80,990
 if shade:dr.add(Rect(x,y,w*19/49,h,fillColor=HexColor('#E9F0E4'),strokeColor=None))
 for v in range(0,101,20):dr.add(Line(x,y+h*v/100,x+w,y+h*v/100,strokeColor=HexColor('#DEE5DD'),strokeWidth=.6))
 lp=LinePlot();lp.x=x;lp.y=y;lp.width=w;lp.height=h;lp.data=[[(l['id'],fn(l)) for l in levels[:maxlevel]] for _,_,fn in series]
 lp.xValueAxis.valueMin=1;lp.xValueAxis.valueMax=maxlevel;lp.xValueAxis.valueSteps=([1,5,10,15,20,25,30,35,40,45,50] if maxlevel==50 else list(range(1,21)))
 lp.yValueAxis.valueMin=0;lp.yValueAxis.valueMax=100;lp.yValueAxis.valueSteps=list(range(0,101,20))
 for axis in [lp.xValueAxis,lp.yValueAxis]:axis.labels.fontName='YaHei';axis.labels.fontSize=10;axis.strokeColor=HexColor('#9BAA9E')
 for i,(_,color,_) in enumerate(series):lp.lines[i].strokeColor=HexColor(color);lp.lines[i].strokeWidth=2
 if ci:
  for l in levels[:maxlevel]:
   a=l['profiles']['standard']['baseline'];lo,hi=a['winCI95'];xx=x+w*(l['id']-1)/(maxlevel-1);dr.add(Line(xx,y+h*(1-hi),xx,y+h*(1-lo),strokeColor=HexColor('#B8CDB7'),strokeWidth=3))
 dr.add(lp)
 label(x-41,y+h+12,'难度',11);label(x+w-20,y-30,'关卡',11)
 lx=x
 for name,color,_ in series:
  dr.add(Line(lx,y+h+32,lx+24,y+h+32,strokeColor=HexColor(color),strokeWidth=2));label(lx+32,y+h+28,name,11);lx+=280
 return x,w
chart(492,270,50,[('无道具 · 跟随教学',pine,lambda l:l['profiles']['standard']['baseline']['difficulty']),('允许道具 · 跟随教学',pink,lambda l:l['profiles']['standard']['assisted']['difficulty'])],True,True)
label(80,448,'浅绿底：重点体验的前20关。竖线：无道具失败比例的95% Wilson区间。',11)
label(80,427,'区间只描述固定关卡、固定策略下的抽样波动，不覆盖真人差异或其他补充种子。',11)
chart(123,230,20,[('无道具 · 跟随教学',pine,lambda l:l['profiles']['standard']['baseline']['difficulty']),('允许道具 · 跟随教学',pink,lambda l:l['profiles']['standard']['assisted']['difficulty']),('无道具 · 不跟随教学',blue,lambda l:l['unguidedStandard']['baseline']['difficulty'])])
label(80,76,'前20关放大：不跟随教学仅是敏感性测试，不能据此认定玩家会忽略提示。',11)
label(80,50,'三档策略偏离提示概率：熟练5% / 标准20% / 探索45%；所有结果来自当前实际游戏引擎。',11)
renderSVG.drawToFile(dr,str(OUT/'难度曲线.svg'));renderPDF.drawToFile(dr,str(OUT/'难度曲线.pdf'))
def avg(ls,p='standard',mode='baseline',scope='profiles'):return sum((l[scope][p][mode] if scope=='profiles' else l[scope][mode])['wins'] for l in ls)/(len(ls)*n)
first=levels[:20]; later=levels[20:]
summary={'runs':d['meta']['totalRuns'],'first20':{},'all50':{},'chapters':[]}
for name,ls in [('first20',first),('all50',levels)]:
 for p in ['skilled','standard','exploratory']:summary[name][p]={m:avg(ls,p,m) for m in ['baseline','assisted']}
for i in range(5):
 ls=levels[i*10:(i+1)*10];summary['chapters'].append({'range':f'{i*10+1}—{i*10+10}','baseline':avg(ls),'assisted':avg(ls,mode='assisted')})
summary['first20Unguided']={m:sum(l['unguidedStandard'][m]['wins'] for l in first)/(20*n) for m in ['baseline','assisted']}
summary['topHard']=[l['id'] for l in sorted(levels,key=lambda x:x['profiles']['standard']['baseline']['difficulty'],reverse=True)[:10]]
summary['topFirst20']=[l['id'] for l in sorted(first,key=lambda x:x['profiles']['standard']['baseline']['difficulty'],reverse=True)[:5]]
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
pct=lambda x:f'{x:.1%}'
lines=['# 花果点点乐 · 50关难度测试报告','','测试日期：2026-11-23。关卡与引擎版本见 difficulty-results.json 的 SHA256；本次没有修改任何关卡配置。','','## 结果口径','',f'- 共 {d["meta"]["totalRuns"]:,} 局。50关 × 3档策略 × 2种道具条件 × {n} 次，另加前20关 × 2种道具条件 × {n} 次不跟随教学的敏感性测试。', '- 布局、补充种子、步数和目标使用发布配置。随机的是操作选择，没有随机生成新关卡。', '- 熟练、标准、探索分别以5%、20%、45%概率选择随机合法操作，其他操作采用游戏内 Game.hint。随机操作在合法点击位置/彩虹相邻目标中均匀抽取；同色大组可能包含多个点击位置，因此不是均匀抽取消除组。', '- 主测试执行配置中的 demonstration / opening，之后自行决策；它代表跟随指定开局的情况，不代表强制教学。前20关另测完全不执行指定开局。', '- 标准策略难度分 = 100 × (1 - 通关数/样本数)，只用于本报告，未叠加主观权重或设计标注难度。允许道具曲线使用同一公式独立计算。', '- 道具在消耗至少50%普通步数后按关卡配额使用；木锤优先未完成目标，手套/花洒优先扩大可制造特殊棋子的色块，骰子作为候选不足时的后备。不是最优道具求解器；道具可能破坏既有优势布局。', '- 成对条件在同关、同样本、同普通回合共享决策随机数；仅比较当前启发式使用道具的效果。', '- 95% Wilson区间仅衡量固定策略/固定种子下的抽样不确定性，不代表人类通关率区间。不能用各关平均通关率推断连续打过20关的概率。', '- 所有用步分位数只统计胜局；败局目标完成度按各目标完成比例等权平均。未通关样本不混入胜局用步。','','## 测得的难度节奏','','|范围|标准策略无道具通关比例|允许道具通关比例|','|---|---:|---:|']
for c in summary['chapters']:lines.append(f'|{c["range"]}关|{pct(c["baseline"])}|{pct(c["assisted"])}|')
lines+=['',f'前20关标准策略：无道具 {pct(summary["first20"]["standard"]["baseline"])}，允许道具 {pct(summary["first20"]["standard"]["assisted"])}。不跟随教学：无道具 {pct(summary["first20Unguided"]["baseline"])}，允许道具 {pct(summary["first20Unguided"]["assisted"])}。','','## 重点复核关卡','','|关卡|标题 / 节奏|无道具通关|允许道具通关|无道具难度分|胜局P90用步 / 预算|','|---|---|---:|---:|---:|---:|']
ids=set(summary['topHard']+summary['topFirst20'])
for l in levels:
 if l['id'] not in ids:continue
 a=l['profiles']['standard']['baseline'];b=l['profiles']['standard']['assisted'];lines.append(f'|{l["id"]}|{l["title"]} / {l["beat"]}|{pct(a["winRate"])}|{pct(b["winRate"])}|{a["difficulty"]:.1f}|{a["p90WinTurns"] if a["p90WinTurns"] is not None else "无胜局"} / {l["moves"]}|')
lines+=['','## 全部50关','','|关卡|节奏|设计标注1—5|实测难度0—100|无道具通关数|允许道具通关数|道具净提升百分点|','|---|---|---:|---:|---:|---:|---:|']
for l in levels:
 a=l['profiles']['standard']['baseline'];b=l['profiles']['standard']['assisted'];lines.append(f'|{l["id"]}|{l["beat"]}|{l["designDifficulty"]}|{a["difficulty"]:.1f}|{a["wins"]}/{n}|{b["wins"]}/{n}|{(b["winRate"]-a["winRate"])*100:+.1f}|')
lines+=['','## 如何使用结论','','- 优先检查前20关的尖峰、教学开局依赖，以及休息关是否确实形成难度回落；后30关再检查挑战峰值和阶段提升。', '- Game.hint 是单步启发式，可能重复偏向局部较优路线。探索策略有时胜过熟练策略，应视为策略依赖信号，不能解读为水平越低越容易通关。', '- 对尖峰关先做小幅增加步数、减少一个目标或强化机制提示的候选版本，再用同组策略复测。当前测试没有直接改变游戏平衡。', '- HR体验前建议至少做数位首次接触玩家的前20关试玩，记录首败关、重试数、单局时长、提示/道具使用和误操作，再校准策略及难度目标。此处没有虚构真人数据。','','## 可复现与审计','','- 在 FFPOP 目录运行 `node tests/difficulty.test.cjs`，再运行 `node tools/test_difficulty.cjs 500 ../outputs/difficulty-test-20261123`。', '- `runs.csv`：每局状态、步数、目标完成比例、道具类型使用次数等17万行原始记录。', '- `difficulty-results.json`：每关每策略汇总、置信区间、成对救回/损失样本、配置与引擎哈希。', '- `replays.json`：标准策略每关每条件首个胜局/败局的操作轨迹，供定位复核；不是所有局的完整轨迹。', '- Excel的原始汇总页来自上述JSON，比例、难度、净提升由公式计算，并带原生可编辑折线图。', '- 图中所有曲线为逐关原始结果，未做平滑处理。']
findings=['## 策划判断与调整优先级','','1. 前20关整体平缓，但第8、15、19、20关标准策略无道具通关分别为83.0%、82.0%、80.6%、75.0%。第20关允许道具后为92.8%，建议优先真人复核该关的组合引导与可读性，再决定是否放宽步数。','2. 第20关低偏离提示策略仅46.8%通关，标准策略75.0%，探索策略60.0%。说明程序提示的局部选择对结果影响很大，不能把这张曲线直接解释为真人能力梯度；需要复盘提示路线。','3. 第22、24关无道具通关46.0%、29.8%，随后第25关考核关反而94.4%。建议复核空间机制教学、任务量和考核节奏，避免练习/变化关先成为断层。','4. 第36关标注回落关，无道具通关63.6%，允许道具97.0%；相比第46关回落关的92.6%无道具通关，第36关的轻松体验更依赖辅助道具。','5. 第41、47、49关无道具通关11.4%、18.8%、4.6%，允许道具65.6%、42.8%、25.4%。优先复核目标叠加、分区通路和道具投放，第49关为最高优先级。','6. 当前结果只支持发现疑似难度断点；没有做步数/目标量的因果对照实验，因此不把“加几步”写成已验证的解决方案。','','']
insert_at=lines.index('## 全部50关')
lines[insert_at:insert_at]=findings
(OUT/'难度测试报告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))

