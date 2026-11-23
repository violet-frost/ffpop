# 第二轮：点击与掉落专项优化（2026-11-23）

本轮使用更严格的手机模拟：393×873、设备像素比 3、触摸事件、CPU 降速 6 倍；Chrome 无界面模式且禁用 GPU。基线是第一轮优化后的本地网页，不是更早的原始版本。本轮聚焦首次点击、底部 24 格消除引发整盘掉落、重复掉落和骰子重排。未收到线上网址、手机型号和浏览器信息，未核对实际部署版本或真机。

## 证据与修改

- 首次主页点击处理从 1146.2ms 降到 181.5ms，进入游戏处理从 846.9ms 降到 52.3ms。此前音乐将约 2 MB PCM 字节逐个经过迭代回调转换，阻塞输入；现在使用定长数组、分块循环和任务间让出主线程，解码仍复用缓存并保留音乐淡入淡出与用户手势解锁。
- 每回合原来重建 72 个格子，现在保留全部 72 个格子，只修改身份、标签与发生变化的美术。新回合提交前统一取消旧动画，避免保留的格子继承上回合的缩放、透明或隐藏状态。
- 掉落原来克隆约 72 套棋子 DOM，现在将现有美术节点暂存于轻量动画容器，结束或取消时归还原格子。新增断言验证零克隆、格子身份保留、美术归还和无残留动画层。
- 分列/重排动画在写入前一次性测量几何，使用缓存的格子矩形，取消未使用的列遮罩；重排布局由 84 次降到 6 次。本轮测试所有掉落分支均限制每格只测量一次几何。
- 无障碍棋盘使用矩形裁切；有木箱、缺口时继续采用原路径遮罩和下区域入口裁切。先构造容器、节点与关键帧，再批量挂载和启动。
- 花果图集在后台生成最多 12 张 192×192 的透明小图缓存，保持现有 SVG 接口、朝向和花果素材；减少每个棋子反复裁切整个图集的开销。原图集回退立即可用，缓存失败不阻止游戏。
- 消除阶段先读取全部透明度，再安排动画，避免读样式与写动画交错。阴影滤镜对照实验没有给出充分收益证据，因此保留现有阴影效果。

## 最终单次复测

| 场景 | 同步点击处理 ms，前 → 后 | 掉落最大帧间隔 ms，前 → 后 | 布局次数，前 → 后 |
| --- | ---: | ---: | ---: |
| bottom-clear | 43.3 → 21.8 | 216.7 → 150.0 | 6 → 7 |
| bottom-clear-repeat | 10.5 → 10.5 | 150.0 → 99.9 | 6 → 6 |
| segment-shuffle | 63.2 → 63.9 | 300.0 → 116.7 | 84 → 6 |

最终实际触摸事件 pointerup 到 click 间隔约 25.1ms，当前模拟浏览器未复现额外 300ms 点击等待，未另外引入触摸事件抢占或双触发风险。

单次时序随宿主负载波动，仍有 100–150ms 左右的偶发掉落长帧，以上不代表真机稳定 60 FPS。结构预算（零复制、格子保留、一次几何读取）比单次时序更适合作为回归门槛。没有把等待动画完成的正常操作锁当作丢失点击而取消，也没有更改步数、种子、规则、50 关配置或原动画时长。

原始数据：`tests/mobile-input-before.json`、`tests/mobile-input-after.json`。中间实验数据保存在同目录 `mobile-input-*.json`。既有组合性能另存 `tests/performance-v2-after.json`。

## 验证与部署

规则、50 关可完成性、1043 回合旧规则对照、彩虹、辅助工具、重力、关卡编写、构建一致性均通过；浏览器完整游玩、六种手机布局、掉落中暂停恢复/退出、六种组合、重力遮罩、真实截图像素、实际音乐信号和编辑器回归通过。新增 `node tests/mobile-input.browser.test.cjs` 检查高像素比的点击/掉落结构预算；既有 `node tests/performance.browser.test.cjs` 检查组合特效预算。

已运行 `python build.py`，重新生成 `index.html` 和共享美术代码对应的 `level-editor.html`。本次未推送或远程部署；线上需要替换本轮 `FFPOP/index.html` 并重新加载获取新内容。HTML 传输体积仍约 10.8 MB，网络加载速度不在此次本地测量结论内。

---

# 手机网页卡顿优化记录

已复现表现层性能瓶颈：彩虹＋火箭组合重复创建大量扫射和火花动画，页面还会重复解析大段图片数据。已合并重复特效、限制装饰花瓣，并缓存图片 URL；规则与关卡数据未改动。

同一桌面 Chrome 手机模拟条件（393×873、像素比 1、CPU 降速 4 倍、禁用 GPU）下，组合动画峰值从 2066 降为 321；最终复测 p95 帧间隔由约 217ms 降为 33ms，最慢帧约 583ms 降为 117ms。不同轮次的 p95 约为 17–33ms，仍有偶发长帧，不能据此承诺手机真机稳定 60 帧。

已重新生成 index.html 和 level-editor.html。线上需要替换 FFPOP/index.html 后刷新获取新版本；本次未推送或远程部署。文件下载体积仍约 10.8MB；未收到线上网址与机型，因此未验证网络加载、托管响应头及真机 GPU。

规则、构建、六种组合、重力路径、截图像素、手机布局、暂停、编辑器已验证。编辑器测试在并发回归时出现过一次重载时序失败，单独重跑全部通过。下面保留技术测量、原始数据位置和复测命令。

# Mobile rendering performance, 2026-11-23

## Findings and changes

A deterministic rainbow + rocket scene reproduced the stall locally. The release phase created repeated full-row/column sweeps and six separate animations per impact spark. It reached 2066 simultaneous/scheduled Web Animations and 2778 effect SVG descendants. Backgrounds, the piece atlas, and four booster crops also inserted repeated base64 strings; game app markup measured 8,427,055 characters.

- MotionSystem.js shares one cosmetic sweep per row/column per release, shares one spark per position, animates six spark rays as a single SVG path, and limits decorative petals to 48 per release.
- Art.js caches one Blob URL per raster asset for the document lifetime. GardenTheme.js uses those same URLs for backgrounds and portraits. Embedded originals remain available for fully offline use. The four known raster images bound the cache; page transitions reuse its entries.
- BoardModel.js, seeds, hits, goals, quotas, gravity routes and motion duration configuration were not changed. Pause, cancel, reduced motion and cleanup are covered by existing browser checks.

## Before and after

Chrome headless, GPU disabled, local file URL, 393 x 873 viewport, device scale factor 1, 4x CPU slowdown, same deterministic 72-cell scene. These measurements isolate gameplay rendering; they are not a real Android GPU benchmark or a hosted-network test. Frame samples come from requestAnimationFrame; Performance domain metrics include polling and sampling overhead. Single-run timings vary with host load.

| Rainbow + rocket | Before | Final run |
| --- | ---: | ---: |
| Peak animations (including scheduled/fill animations) | 2066 | 321 |
| Peak SVG effect descendants | 2778 | 608 |
| Frame interval p95 | 216.7 ms | 33.4 ms |
| Maximum sampled frame interval | 583.3 ms | 116.6 ms |
| Sampled intervals over 50 ms | 20 | 3 |
| App markup before the turn | 8,427,055 chars | 32,037 chars |

The final run also covers ordinary clears, rainbow + bomb and rainbow + rainbow. Raw results: tests/performance-before.json, tests/performance-effects.json (effects-only intermediate), tests/performance-after.json. HTML download size remains approximately 10.8 MB; this change targets gameplay stutter, not network transfer time. The remaining occasional long frame means stable 60 FPS on actual phones has not been established.

## Repeatable check

Run from FFPOP:

```powershell
$env:PERF_OUTPUT='tests/performance-after.json'
node tests/performance.browser.test.cjs
```

The check enforces structural budgets (at most 400 animations, 800 SVG effect descendants and 100,000 app markup characters in each tested scene) and layer cleanup. It does not assert unstable wall-clock timings. Chrome and Node 22+ are required only for verification.

## Delivery

index.html and level-editor.html were regenerated with python build.py. Replace the hosted FFPOP/index.html with this build, then reload the phone page to obtain it. No remote deployment or repository push was performed. A deployment URL, handset model and browser were not supplied, so hosting headers, transfer speed and true device GPU behavior remain unverified.
