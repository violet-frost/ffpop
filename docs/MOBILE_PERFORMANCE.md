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
