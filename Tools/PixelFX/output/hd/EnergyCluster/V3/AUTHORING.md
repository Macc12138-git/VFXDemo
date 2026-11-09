# EnergyCluster V3 · 参考转制序列帧

作者拒绝 V1 的程序带状结构及 V2 的实时噪声版，明确要求“使用序列帧的方式”。
本次按该授权转制作者提供的原始 GIF，不将原参考归为新绘制或 AI 原创动画。
没有导入 Unity，没有生成新的 GIF；V1、V2 的文件均保留。

## 制作输入与复现

- 输入：`codex-clipboard-5032fe0e-6c69-4a34-aec3-1bf80ddefba3.gif`，793×793，20 帧，每帧 40ms。
- 固定帧序：从原始 GIF 首帧至末帧，不插帧、不改变时间、不逐帧重定中心。
- 处理工具：`Tools/PixelFX/tools/export-energy-cluster-sequence.py`。
- 全画幅统一缩放至 504×504，四周补 4px 透明留边，单元格为 512×512。
- 蓝黑底色估计为每帧四边像素中值 [5,7,22]；通过 `C=aF+(1-a)B` 最低不透明度反解
  Straight RGBA，保留浅蓝柔光，不简单删除黑像素，也不保留不透明黑底。
- Lanczos 缩放，Alpha=0 区域 RGB 清零；每格留边防止相邻帧在线性采样时串色。
- 原图风格、颜色、光晕、能量壳和电弧都已烘焙，不能据此声称可以分区独立调色。

## 输出与播放

- `Textures/EnergyCluster_Sequence.png`：2560×2048，5 列×4 行，完整 20 帧。
- `Frames/EnergyCluster_000.png` 至 `EnergyCluster_019.png`：独立透明帧。
- `manifest.json`：源文件及图集 hash、帧序、FPS、统一裁切、Alpha、过滤与留边。
- 预览：`http://127.0.0.1:8086/gallery/hd-energy-cluster-v3.html`。
- 原生时间：25 FPS、0.8 秒循环，pivot=(.5,.5)。暂停和逐帧读取同一个 PNG 图集，
  不是在预览中继续播放 GIF 冒充序列帧；旁边的原始 GIF 只用于对照。
- 默认正常透明合成，在参考底色重建原画；可切换纯黑、浅底、棋盘和暖底，以及加法合成。
- 以 PC 为目标，图集保持 NPOT 原尺寸，Bilinear、Clamp、无 Mipmap。512² RGBA×20 的
  未压缩像素容量约 20MiB；这不是实测 Unity 内存，后续可按实际屏幕尺寸与目标平台另定压缩。

## 校验与边界

1. `QA/reference-comparison.png`：原始第 6 帧与透明帧重新叠回相同底色的同尺度对照。
2. `QA/contact.png`：完整 20 帧，检查顺序、锚点、范围和原始运动。
3. `QA/backgrounds.png`：原始底色、黑底、浅底与棋盘，检查残底与光晕。
4. 自动检查图集每格与独立帧逐字节一致、帧数/时间不变、透明边缘与 Alpha=0 的 RGB。
5. 浏览器实际加载 PNG 图集播放；验证了第 7 帧定格为 0.240s、末帧逐帧接回首帧，
   棋盘底上无不透明黑色矩形，恢复参考底色后继续播放。截图见 `QA/browser-sequence-preview.jpg`。

以作者提供的原始动图为当前形态基准，循环接缝继承其原始首尾，不伪造为新的无缝重绘。
素材来自作者附件；未额外核验其商业使用权。若要进入商业项目，需要作者确认来源许可。
当前仅交付制作预览和图集；没有 Unity 真实播放、合批、CPU/GPU 或 Player 预算结论。
