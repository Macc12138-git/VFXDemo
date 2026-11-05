# 青蓝挥砍 · 第一段

高清抗锯齿手绘风剑光，无人物、武器和场景。参考用户视频的第一段挥砍，非原视频素材抠图。

- 单帧：1024 × 1024，RGBA PNG，25 帧，60 fps，0.4 秒。首尾为空。
- frames/：独立透明序列帧。
- cleave-atlas-*.png：分成不超过 4096 × 4096 的图集（默认 1024 单帧）。
- cleave.json：帧矩形、时间、图集和中心锚点。不是 Aseprite 单图集格式。
- peak.png / contact.png：峰值透明图和深色背景逐帧预览。

## 3D 场景接入

将序列帧播放在透明 Quad / Billboard 上，中心 Pivot=(0.5,0.5)，根据挥砍方向旋转 Quad。使用双面透明材质、Bilinear 过滤、关闭纹理压缩和 Mipmap；先按普通 Alpha Blend 检查。它是具有固定斜向透视外观的二维 Flipbook，不是真正体积特效或任意视角的 3D 网格。

没有烘焙地面亮斑、人物或待机时间；重复播放间隔只属于预览页面。

## 源码与预览

源码：src/hd/cyan-cleave.js。运行 node tools/serve.mjs 后打开 /gallery/hd-cleave.html。

导出：node tools/render-hd.mjs；需要 @napi-rs/canvas，或通过 --canvas-module 指定已有模块路径。
