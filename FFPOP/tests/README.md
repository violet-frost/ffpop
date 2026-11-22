# 测试入口

- `node tests/engine.test.cjs`：18 项核心规则检查及 50 关自动试玩。
- `node tests/parity.test.cjs`：保留 1410 回合旧基准，校验 50 个初始棋盘及主动彩虹变更前的 1043 回合。
- `python tests/test_build.py`：生成物一致性、模板引用、配置和离线交付检查。
- `node tests/browser.test.cjs`：独立 Chrome 中运行实际 UI、动画与手机尺寸检查。Node 22+，默认 Chrome 路径为 `C:/Program Files/Google/Chrome/Application/chrome.exe`。

浏览器测试生成 `tests/screenshots/`。`reference_turns.json` 是重组前原版引擎的固定行为基准；调整玩法或关卡时应说明差异，而不是直接覆盖基准。

- `node tests/rainbow.test.cjs`：彩虹目标交换、无效输入、冰层及火箭方向回归。
- `node tests/effects.browser.test.cjs`：选中发光、取消、交换、双方向飞行、六种组合、动画中止和减少动态效果。

50 关测试固定使用原配置种子；新彩虹规则改变后允许采用不同合法操作策略重新尝试，不修改种子或关卡难度。

- `node tests/ui-flow.browser.test.cjs`：参考图改版后的主页、空白入口、道路地图、目标确认、木质 HUD、六种手机布局、胜利与章节解锁完整流程。

方案一新增：`node tests/authoring.test.cjs`、`python tests/test_level_io.py`、`node tests/editor.browser.test.cjs`。Excel生成使用`python tools/export_workbook.py`；完整流程见`docs/LEVEL_EDITOR.md`。

- `node tests/sprite-visibility.browser.test.cjs`：实际截图像素回归，模拟掉落时隐藏原格子、显示副本，检查六类花果与横向火箭仍能正常绘制。防止 SVG 裁切定义继承原格子的隐藏状态而使动画副本消失。

## 四种辅助道具

运行 node tests/boosters.test.cjs（11项规则边界）与 node tests/boosters.browser.test.cjs（真实UI和6种手机尺寸）。编辑器浏览器测试增加四种工具配置/使用/重开，Excel测试增加配额往返与总次数拒绝。validate_levels.cjs独立记录无辅助和辅助各800路程序策略，均不是人类通关率。

## 障碍绕流

node tests/gravity.test.cjs验证8组规则边界；node tests/gravity.browser.test.cjs验证路径、遮罩、封闭空格、破箱、缺口下入口与动画取消。50关使用gravity=flow；历史fixtures省略gravity，继续segment基准。参考检索超出16路的部分单独记录，不计入策略比例。

- `node tests/play-layout.browser.test.cjs`：四道具底栏、六种手机棋盘布局、消除与掉落阶段的动画时钟暂停/继续、退出取消/确认及重进清理。原提示、玩法、重开和设置从右上角暂停菜单进入。

- `node tests/audio.browser.test.cjs`：用户指定规则文本、首页与局内真实音频信号、七种道具音效、音量滑块/静音/持久化、切歌与音频节点清理。
