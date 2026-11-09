# CyberOrb V3.1 · 弹体贴边能量描边

作者最初指令：「子弹主体的能量描边加上」。随后明确：「仅做一个描边即可，不需要增加效果」。最终只保留一圈静态纯色细描边；继续保留 V3 的白热圆形弹体、短单尾、紧凑命中，不新增动画或装饰。仅制作与预览，未获 Unity 导入授权。

## 选定稿

- 源码：`Tools/PixelFX/src/hd/cyber-orb-v3-1.js`，版本 `3.1.3`。
- SHA256：`4987e9c991270955c18d5528deb01e9582ade69c4a76a3876fbaad2312a6231b`。
- 基线源码：`src/hd/cyber-orb-v3.js`，保持不变；SHA256 `768180dff97adf5fcaab8107745997ea2d1b0c295428de20506473c95403da79`。
- 固定 seed：42；完整默认 options 见 `simple-qa.json`。新增 `outlineWidth=.14`（半径比例）、`outline=#258bff`；原有 `rim` 不参与描边。
- 动态页面：`http://127.0.0.1:8086/gallery/hd-cyber-orb-v3.html`。入口继续使用 V3 页面，内容标识 V3.1；不是 Unity 运行效果。
- 页面新增描边开关、粗细和独立蓝边颜色；关闭描边可还原 V3。

## 分层与时间

基线的拖尾及白芯完成后，只叠加一次圆形 stroke。纯色、固定粗细比例；没有第二条内沿、噪声、流动、电弧、渐变或粒子。无 shadowBlur、外扩光晕或加法光球。

描边只跟随基线弹体尺寸与移动，没有独立时间动画；基线循环仍为 4 秒。命中直接复用 V3 的独立 one-shot 函数，0.2 秒收尾，不给命中新增圆环或碎片。Canvas 路径为创作表达，未生成序列帧运行素材、Shader 或 Unity 资产。

## Render / look / refine

1. `3.1.0` / round1：蓝色单描边已能分离白芯，但放大看是均匀平面圆线，游戏小尺寸下偏薄。记录 `round1-review.png` 与 `round1-qa.json`。
2. `3.1.1` / round2：描边由 .10R 增到 .14R，叠加紧贴表面的青色微动内沿；主体仍为白点，无外部电环。深浅底和 12px 直径样本可辨认。观察到内沿过于均匀，蓝青层次仍偏平。记录 `round2-review.png` 与 QA。
3. `3.1.2` / final：青色内沿增加方向性色阶，轻微提高表面扰动并保持圆形外轮廓；不增加装饰弧、光晕或粒子。复核深色、浅色、暖色、棋盘背景；实时预览检查 16/64 发每秒重叠、描边开关及粗细端点，恢复默认后保留播放页面。截图 `preview-ui.png`。
4. 作者追加「仅做一个描边」后，`3.1.3` / simple 删除上述青色内沿、扰动与色阶，只保留一次圆形描边。当前交付证据以 `simple-review.png`、`simple-qa.json`、`simple-ui.png` 为准；此前 round1/round2/final 图是被取代的历史试稿。

## 回归与边界

- 描边关闭、单独拖尾、独立命中：与 V3 对应图像逐像素一致。
- 当前描边只有一次 stroke；无新增渐变、独立时间动画或粒子。
- 多 seed / 时间采样确定；4 秒循环首尾完全一致。
- 半径 6/14、粗细 .04R～.18R：无外围光晕，含抗锯齿采样外界不超过约 1.10R。
- 参数改色、粗细、分层开关生效；静态图包括原尺寸小弹体、命中首尾与浅深底。
- `Assets/Scenes/VFXWorkbench.unity` 保持作者原状，SHA256 `4f3964be0cf5b1c6589b903f09561917e998a6c01595a0a9c3bf987243cdb11f`。
- 未生成 GIF；未导入 Unity。Unity 真实视觉、批次/合批及 CPU/GPU/内存和目标设备性能均未测，连发预览不是性能验收。

复查命令：`node Tools/PixelFX/tools/check-cyber-orb-v3-1.mjs --canvas-module <可用的 @napi-rs/canvas 入口> --round simple`。
