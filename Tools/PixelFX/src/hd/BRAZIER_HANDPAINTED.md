# Brazier 高清手绘火焰 · 制作版本 3

作者要求：以 Brazier 为例改成高清手绘风格，火舌参考 EffectDissolveDistort 的效果；
本轮指令为“先绘制该特效”，并明确要求使用 pixelfx-skill。

当前阶段为创作与动态预览，等待作者验收。未获导入 Unity 指令；没有修改 Assets、
原版 Brazier 源码、已验收预制体或场景。

## 选定版本

- 源码：`src/hd/brazier-handpainted.js`，`meta.version=3`；seed=8。
- 画布：1024×1280，30fps，4 秒无缝循环；120 帧不重复尾帧。
- options：源码 `meta.options` 和生成的 `authoring.json` 为准；manifest 同时记录源码 SHA-256。
- 预览：`/gallery/hd-brazier.html`；工作台有独立入口，不冒充像素 painter registry 效果。
- 源图保留透明背景；GIF 是深色背景、裁切近景的便捷预览，不是交付 Unity 的整效果图集。
- 可检查完整效果、颜色层和光晕层；显示火盆开关用于独立观察火焰。

## pixelfx render / look / refine

1. round-1：渲染并检查八个时刻的深浅底色，以及完整高清图。发现火舌过于细长并排、
   火盆口全椭圆覆盖像盖子，烟雾圆形边界明显。
2. round-2：拓宽主火舌，错开高度、增强弯曲与尖端侵蚀，只绘前侧盆沿，提升火星高度。
   再次观察 contact 和高清图，保留清晰色阶，避免白热过曝。
3. round-3：增加窄笔触和轻微干笔起伏，烟雾改为低透明柔边。检查 contact、高清图、
   浏览器播放和参数交互，再运行独立的高清检查器。

各轮图在 `output/hd/brazier-handpainted/round-N/`；最终图和检查报告位于该效果输出根目录。
以上是制作观察与检查，不是作者已验收的声明。

## Shader 关系与明确差异

浏览器没有加载或编译 Unity Shader。CPU 制作预览模拟了扭曲贴图驱动 UV 偏移、
噪声阈值溶解、近似像素宽度的粗糙边缘、直通 Alpha 覆盖率。

以下是本次美术创作的额外设计，不是附件 shader 原本自动提供的能力：

- 火舌主体的生长、弯曲和多色带来自重新绘制的 Canvas 轮廓。
- 根部扭曲较弱、尖端侵蚀较强，属于本版方向性设计。
- 脱离火舌、烟雾、火星和盆体高光各有独立节奏。
- “额外溶解进度=1”只移除火舌；独立火星、烟雾和火盆仍显示。
- PNG/浏览器的光晕合成不等价于 Unity 线性空间的加法与 Bloom。

未来只有作者明确授权导入后，才选择纹理与原生粒子/材质的实际分工并在 Unity 验证。
不宣称现在已经实现无运行脚本的原生粒子，也不宣称附件 shader 可逐像素还原本预览。

## 重现

从工程根目录：

```sh
node Tools/vfx.mjs render-hd-brazier --frames true
node Tools/vfx.mjs check-hd-brazier
node Tools/vfx.mjs serve 8086
```

离线渲染需要可选的 `@napi-rs/canvas`，可用 `--canvas-module` 指定已有模块。
GIF 可选运行 `python3 Tools/PixelFX/tools/preview-hd-brazier.py Tools/PixelFX/output/hd/brazier-handpainted`，
需要 Pillow。浏览器直接预览不依赖以上离线包。

检查覆盖 120 帧可见性、边界、确定性、循环首尾、seed/扭曲/粗糙边缘生效和溶解端点。
计时仅为桌面 Node Canvas，不是 Unity 或移动设备性能结论。
