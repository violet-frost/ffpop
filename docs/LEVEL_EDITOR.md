# 关卡编辑器与Excel使用

## 直接打开

- `index.html`：重新设计的50关游戏，离线可用。
- `level-editor.html`：离线编辑器，使用与游戏相同的规则和美术。推荐Chrome或Edge桌面浏览器。
- `../outputs/level-redesign-20261123/花果点点乐-关卡配置表.xlsx`：关卡总览、参数、450行棋盘布局、验证与试玩记录、使用说明。

## 编辑器

左侧选择关卡，中央编辑或试玩，右侧修改参数、目标与画笔。支持拖动绘制、一次笔画撤销、重做、浏览器草稿持久化、导入单关或整包JSON、导出本关或50关。

冰层画笔保留已有普通花果颜色，再次涂同格移除冰层；拖动经过同格仅处理一次。道具画笔使用画笔颜色。木箱、冰层数量自动统计；目标需自行调整。改布局会清除失效的教学首步/演示标记；教学坐标若变为缺口会从高亮列表移除。

“试玩本关”不改变配置。彩虹先选中再点相邻棋子；提示、执行一步和自动验证均使用游戏规则。自动验证失败只表示该提示路线未通关，不代表无解。

浏览器草稿并不自动写入工程。可以选择“保存JSON目录”，选择工程的`data/levels`目录；不支持目录保存或希望保留导入前备份时，导出50关JSON，使用下面的命令导入。

## JSON与Excel导入

在FFPOP目录执行（先校验，再写入）：

```powershell
python tools/level_io.py import "你的配置.json" --dry-run
python tools/level_io.py import "你的配置.json"
python tools/level_io.py import "你的配置表.xlsx" --dry-run
python tools/level_io.py import "你的配置表.xlsx"
```

Excel中编辑“关卡配置”浅黄色字段、“棋盘布局”的C—J列。保留英文字段行和关卡编号。每关9行布局，row从1开始；章节chapter从0开始。目标最多4项；未使用目标的kind/color/target全部留空。高级教学与补充序列使用JSON单元格。

导入先读取并校验全部候选配置，再写入；写入前在`tools/backups`保存50关回滚JSON。导入完成自动重建游戏和编辑器。校验失败不改动原配置。仅导出整包JSON：

```powershell
python tools/level_io.py export "50关配置.json"
```

## 验证与重新生成Excel

```powershell
node tools/validate_levels.cjs
python build.py
python tools/export_workbook.py
```

Excel生成器使用桌面应用提供的`@oai/artifact-tool`。当前`tools/node_modules`连接到本机官方运行库；迁移工程后请重新定位运行库。游戏、编辑器、JSON/Excel导入和规则测试不依赖该库；Excel生成才需要它。

Excel总览通过公式读取参数与布局统计，修改步数、目标、节奏或木箱编码会联动；验证记录是生成时的固定快照，不会因修改配置而重新执行游戏。导入后重新运行验证、重新生成Excel；不要把旧策略成功比例视为新版配置已验证。

`node tools/author_levels.cjs`是方案一的初始关卡创作脚本，会覆盖50关JSON；日常编辑不要运行它。

## 验证命令

```powershell
node tests/engine.test.cjs
node tests/rainbow.test.cjs
node tests/parity.test.cjs
node tests/authoring.test.cjs
python tests/test_build.py
python tests/test_level_io.py
node tests/browser.test.cjs
node tests/ui-flow.browser.test.cjs
node tests/effects.browser.test.cjs
node tests/editor.browser.test.cjs
```

Chrome浏览器测试使用临时配置，Node 22+；结果截图保存在`tests/screenshots`。真人试玩仍需单独记录，所有交付关卡暂标“待真人试玩”。
