# 网页工程协作约定

- 本项目使用原生 HTML / CSS / JavaScript；不引入 Godot、Unity、构建框架或网络依赖。
- 保持现有花果画风、Android 竖屏布局、首页全屏花园、50 关、核心玩法和三类页面。
- 不增加体力、货币、养成、商城、活动、社交等外围系统。
- `index.html` 是构建产物。修改 `scenes/`、`scripts/`、`data/`、`assets/textures/` 后执行 `python build.py`，不要单独修改产物。
- `scenes/**/*.html` 为构建期模板片段，其中 `${...}` 是 JavaScript 模板表达式，不是独立网页；只能直接打开根目录的 `index.html`。
- `/* VIEW:路径 */` 由构建器展开为模板字符串；`/* SCRIPT:路径 */` 在同一闭包中展开为脚本片段。不要使用 eval 或运行时 fetch 来加载模板。
- `data/levels/level_001.json` 至 `level_050.json` 是唯一关卡配置源，`data/config/motion.json` 是唯一动画时长配置源（毫秒）。
- `BoardModel.js` 只负责确定性规则。保留种子、随机数序列、遍历顺序和道具判定，避免重构改变关卡。
- `MotionSystem.js` 只负责表现。保留动画锁、取消处理、按实际位移的分段掉落及结果页延迟。
- 美术在 `assets/textures/` 修改；`scripts/entities/Art.js` 提供原有 SVG 接口。图标保留 currentColor。
- 验证：`node tests/engine.test.cjs`、`node tests/parity.test.cjs`、`python tests/test_build.py`。涉及页面或动画时运行 `node tests/browser.test.cjs`。
- Node 22+ 用于浏览器测试（内置 WebSocket），Python 3 用于构建；游玩不需要安装二者。浏览器测试使用独立临时配置。

## 方案一关卡与编辑管线

- 新关卡使用显式layout；旧规则数据仍在tests/fixtures/legacy-levels.json上执行原基准，不改reference_turns.json。
- LevelSchema.js是游戏、编辑器和命令行导入的共享校验器。新参数优先在此定义。
- python build.py同时生成index.html和level-editor.html；编辑器源码在tools/editor/，不要单独修改产物。
- Excel和JSON导入使用tools/level_io.py；验证使用tools/validate_levels.cjs；Excel由tools/export_workbook.py调用build_workbook.mjs读取同一JSON源生成。
- 改关卡后运行authoring.test.cjs与test_level_io.py；改编辑器后运行editor.browser.test.cjs。验证报告和解法按配置哈希匹配，禁止以旧快照充当新配置结果。
