# EnergyCluster V3.2 · 256 单帧序列

作者要求图集更小，单帧改为 256×256。本版只降低空间分辨率，保留 V3.1 的帧序与时间。
来源仍是作者提供的参考 GIF 转制，不是重新绘制；不生成新 GIF，不修改 Unity 资产或场景。

## 选定参数

- 版本：V3.2 / `3.2-256-reference-sequence`；源版本为 V3.1。
- 12 帧、25 FPS、0.48 秒循环不变，无新增抽帧、插帧、混帧或时间变速。
- 原始参考帧索引不变：0, 2, 3, 5, 7, 8, 10, 12, 13, 15, 17, 18。
- 单帧从 512×512 缩为 256×256，固定中心 pivot=(.5,.5)，2px 透明留边。
- Pillow RGBA Lanczos 使用预乘 Alpha 过滤，输出仍为 Straight RGBA；透明像素 RGB 清零。
- 排列仍为 4 列×3 行，图集从 2048×1536 缩为 1024×768，像素量减少 75%。
- PNG 从 2,090,656 字节缩为 577,139 字节（约 564 KiB），减少约 72.39%。
- 无 Mipmap 的 RGBA8 像素容量从 12 MiB 降为 3 MiB；不是 Unity 实测显存或性能数据。
- 缩小会简化细小纹理，不宣称无损；颜色与光晕仍烘焙在同一帧内。

## 预览与复现

- 默认 / `?version=compact`：256 单帧版。
- `?version=512`：V3.1 的 12×512 单帧对照版。
- `?version=full`：V3 的 20×512 原始节奏版。
- 页面：`http://127.0.0.1:8086/gallery/hd-energy-cluster-v3.html`。
- 主窗口放大显示；`QA/contact.png` 和 `QA/backgrounds.png` 以单帧实际 256px 展示。
- 工具：`Tools/PixelFX/tools/resize-energy-cluster-sequence.py`，默认读取 V3.1，输出至新目录 V3.2。
  工具拒绝覆盖已有输出；复现时用 `--output` 指定另一个新目录。
- 输出：12 张 `Frames/EnergyCluster_*.png`、`Textures/EnergyCluster_Sequence.png` 和 `manifest.json`。

## 校验

- 12 张帧图均为 256×256 RGBA；图集解码后的各格与独立帧逐像素一致。
- 各帧外围 2px Alpha 全为 0，Alpha=0 的 RGB 全为 0；无帧格串色或边界裁切。
- V3.1 的 manifest、图集和全部 12 张源帧在处理前后 SHA256 均不变。
- 循环末帧到首帧的重合成 RGB 平均像素差为 4.679/255，小于最大内部步进 8.865/255；
  仅用于排查异常接缝，不代替视觉验收。
- 静态实看覆盖所有帧及参考底、纯黑、浅色与棋盘底；原有能量轮廓和亮芯保留，
  小细节经缩小后更柔和。浏览器验证记录另见 `QA/browser-check.md`。
- 未导入 Unity，未测运行端批次、CPU/GPU 或目标 PC 显存预算。
