# EnergyCluster V3.1 · 精简序列帧

作者要求缩减时长与帧数，以减小图集。本版保持 V3 的单帧画面不变，只做时间抽帧和重排。
V3 原始 20 帧、图集与 manifest 不修改；所有内容仍在 Assets 外，未操作 Unity。

## 选定参数

- 源版本：V3 / `3.0-reference-sequence`，源图集 SHA256 见 `manifest.json`。
- 新版本：V3.1 / `3.1-compact-reference-sequence`。
- 抽取源帧（0-based）：0, 2, 3, 5, 7, 8, 10, 12, 13, 15, 17, 18。
- 从完整 20 帧循环均匀抽取，而非截取前 12 帧；无插帧、混帧或重新绘制。
- 20 → 12 帧，25 FPS 不变，0.8 → 0.48 秒；动作相当于加速约 1.667 倍。
- 单帧仍为 512×512 Straight RGBA，中心 pivot=.5,.5、4px 透明留边不变。
- 5×4 排列改为 4×3，2560×2048 → 2048×1536，像素量减少 40%。
- PNG 文件 3,291,881 → 2,090,656 字节，减少约 36.49%。
- 无压缩、无 Mipmap 的 RGBA8 像素容量 20 → 12 MiB；不是 Unity 实测显存。

## 预览与复现

- 默认精简版：`http://127.0.0.1:8086/gallery/hd-energy-cluster-v3.html`。
- 原版对照：同页加 `?version=full`，仍读取 V3 原图集与参数。
- 工具：`Tools/PixelFX/tools/compact-energy-cluster-sequence.py`。
- 输出：`Textures/EnergyCluster_Sequence.png`、12 张独立帧、`manifest.json`。
- `QA/contact.png` 覆盖所有保留帧并标出源帧索引。

## 校验边界

- 12 张独立帧与各自 V3 源 PNG 的 SHA256 完全一致，未缩小或重复编码；图集解码后每格
  与独立帧逐像素一致，Alpha=0 的 RGB 仍为 0，4px 外围 Alpha 全为 0。
- V3 图集和 manifest 在处理前后的 SHA256 未变。
- 浏览器验证默认版为 12 帧 / 0.48s，末帧定格为 0.440s；继续一步回到第 1 帧的 0.000s。
  棋盘底检查、原 20 帧版跳转与返回、恢复播放均已实看。截图见 `QA/browser-compact-preview.jpg`。
- 重合成参考底色后，循环末尾→首帧平均像素差约 4.756/255，小于最强内部跳帧约
  8.970/255。该数据只用于筛查异常接缝，不代替作者对加速动作的观感验收。
- 不生成 GIF，不重做美术三轮：这是保留原图的抽帧与重新打包。
- 颜色与光晕仍烘焙在贴图内，不宣称有语义分区独立调色；运行端性能与导入待明确授权后验证。
