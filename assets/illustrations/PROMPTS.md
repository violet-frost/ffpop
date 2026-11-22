# 场景素材与生成提示词

2026-11-23，使用内置 imagegen 生成。工程中的 JPEG 是原图的压缩副本；构建时内嵌到 index.html，无运行时联网依赖。

## 文件

- `garden_home.jpg`：主页、局内白猫头像、目标确认与结算白猫场景；768 × 1152。
- `garden_map.jpg`：道路关卡地图、局内环境与章节预览；720 像素宽的纵向场景。

原图保留在 `C:/Users/薄荷味霜/.codex/generated_images/01a20456-76fa-70f1-bf87-586792918c29/`，工程最终素材以本目录文件为准。

## 主页生成提示

Create a polished mobile casual match puzzle game HOME BACKGROUND illustration, portrait 2:3 aspect ratio, 1024x1536. Original high-end cozy storybook 3D-painted casual game art, vibrant saturated greens, golden warm sunlight, bright blue sky, warm terracotta cottage roof, lush cottage flower garden. Layout: leafy tree canopy frames upper corners; airy blue sky upper 20%; charming honey-colored timber cottage and small windmills in mid-distance at upper-center around 42%; winding golden garden path from cottage towards bottom center; exuberant rounded pink, yellow and white flowers and layered sculpted leaves along both sides. A lovable WHITE CAT gardener wearing a straw sunhat with pink flower and sage-green neckerchief, fluffy white fur, pink inner ears, gentle smiling face, closed happy eyes, sits proudly centered at 62% height on the path, fully visible, friendly round proportions, cuddly mascot. Keep lower 24% relatively open sandy path for a green play button and bottom navigation to be drawn by application; keep side edges of upper half uncluttered enough for vertical activity buttons. Rich detailed painterly depth, glossy dimensional rendering, clear forms, not flat vectors. Entire image fills screen edge to edge. NO text, NO letters, NO numbers, NO UI, NO buttons, NO panels, NO currencies, NO border, NO watermark.

## 地图生成提示

Create a mobile casual match-puzzle LEVEL MAP BACKGROUND illustration, very tall portrait 1:3, 1024x3072. High-end 3D-painted storybook fantasy flower garden, rounded sculpted glossy plants, warm colorful fairytale casual-game art. Bird's-eye tilted isometric overview. Fill edge to edge with a verdant magical valley, giant pink cherry blossom trees, yellow and pink flower clusters, ferns, mushrooms, miniature warm timber cottage at right middle, a turquoise stream winding along the right side with a luminous waterfall near middle-right, small footbridge near upper third, leafy trees framing corners. A broad gentle pale GOLDEN WINDING PATH should occupy the central open corridor and snake up the map from lower center towards upper center, making generous S curves left and right around flowerbeds; path at approximate normalized positions bottom 90% x46%, y83% x64%, y76% x50%, y68% x29%, y60% x32%, y52% x55%, y44% x67%, y36% x48%, y27% x29%, y19% x44%. The road must stay unobstructed, wide and smooth enough for level buttons to be OVERLAID LATER by application. Rich dense detailed scenery beside path, leafy shaded outer edges, warm sunlight pools on the sandy path, magical depth, pink blossom canopy. Distinct beautiful scenery landmarks along both sides, no mascot. NO UI, NO buttons, NO level markers, NO numbers, NO letters, NO banners, NO panels, NO text, NO border, NO watermark.


## 花果与道具统一素材（2026-11-23）

使用内置 imagegen 生成，garden_home.jpg 仅作风格参考。最终文件：`../textures/garden_pieces.png`，1448 × 1086，带 alpha 的 4 列 × 3 行图集，每格 362 × 362。顺序为草莓、柠檬、葡萄、粉花、向日葵、蓝花、朝上火箭、炸弹、彩虹花、木箱、花纹木锤、玩法手册。保留透明背景；横向火箭由同一素材旋转 90 度。SVG 接口共享同一内嵌纹理，目标、棋盘与运动特效使用同一套图案。冰层为 Art.js 中的透明晶面 SVG。

生成提示词：

Use case: stylized-concept. Asset type: ONE transparent game sprite atlas for a cozy flower garden match puzzle. Reference image is STYLE ONLY: match its rich dimensional storybook 3D illustration, golden sunlight upper left, soft organic rounded forms, warm greens, tactile petals, painted wood, premium polished mobile game art. Create a precisely aligned 4 column by 3 row square atlas on genuine transparent background, equal square cells with generous transparent gutters, every object centered and fully inside its own cell, occupies about 78% of cell, front view with subtle depth. NO text, labels, grid, borders, scenery, pedestals, UI, floor or background. Exactly 12 distinct sprites in this strict order: row1 col1 red ripe strawberry green leaf crown and tiny golden seeds; col2 bright yellow whole lemon with one green leaf; col3 purple grape bunch with green leaf; col4 pink five-petal garden blossom with golden center. Row2 col1 golden yellow sunflower with rich amber seed disk; col2 sky-blue five-petal blossom golden center; col3 a single cute UPWARD POINTING garden toy rocket, pointed terracotta-red nose at TOP, cream wooden body, brass bands, green fins at BOTTOM, tiny gold flame below, clearly straight vertical; col4 round deep plum garden bomb with brass flower medallion and short curved cord fuse on TOP, little gold spark. Row3 col1 magical rainbow blossom with six thick softly sculpted rainbow petals and glowing gold center; col2 warm honey wooden crate with diagonal wooden cross brace and dimensional wood grain; col3 small garden hammer with wooden handle diagonally lower left, chunky brass head decorated with pink petal motif upper right; col4 small rounded green book with cream pages and golden question-mark-shaped embossing for help. Maintain large clean silhouettes readable at 40px. Flowers are natural dimensional satin petals, fruit organic dimensional matte skin with soft highlights, props handmade wood/brass, all same art direction. Do not use flat vector, candy square tiles, neon plastic, heavy outlines. Each sprite isolated with alpha, keep empty gutters at every cell boundary.


## 用户提供的替换图集（2026-11-23）

当前 assets/textures/garden_pieces.png 已直接替换为用户上传的 codex-clipboard-5135ed19-958e-4853-8368-c638d02031ae.png 原文件。尺寸 1448 × 1086，透明 PNG，4 列 × 3 行，每格 362 × 362；排列与原图集相同。本次未生成或重绘，保留上传图片原样，复用既有 SVG 裁切、旋转与动画接口。上节生成提示词仅记录前一版素材来源。
