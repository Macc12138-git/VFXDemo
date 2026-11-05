# Brazier · 单张噪声材质火焰试作

本轮只在 pixelfx 中制作和预览，**未导入、未修改 Unity 版本**。作者的要求是尝试使用其提供的灰度贴图，
通过材质参数得到更接近火焰的表现；不是对新版本的 Unity 导入授权。

## 输入和方法

- 原图原样保存于 `noise-brazier-art/FlowNoise.png`，1024×1024 RGB。
- SHA256：`325b9dffbe60f65fbade5c83c4239a5e3bf6a09da0113e53a7f3508810b6e50d`，没有用另一张生成噪声替换。
- 火焰只使用这一张静态灰度噪声，重复多次采样；不使用任何序列帧。
- `PropBack/PropFront.png` 沿用上版 Brazier 的独立静态手绘火盆，不包含火焰动画。
- 灰度贴图本身没有火焰语义。将其纵向拉伸、分速率上移，以慢噪声扰动主 UV，
  再与多峰、根部连接的火焰遮罩结合，阈值侵蚀形成火尖和断裂。
- 以剩余燃料密度/高度映射红、橙、黄、浅白热芯。加法光晕和普通颜色层分开。
- 同一图使用 Mirrored Repeat，以避免输入图边缘未经验证无缝时直接 Repeat 产生硬接缝。
  噪声采样为数据值，不把灰度数据作为 sRGB 颜色运算。
- 火星和烟雾是 seed 8 的独立解析循环粒子，使用两张静态贴图；没有烘焙进噪声图。

浏览器 `/gallery/noise-brazier.html` 实际运行 `noise-brazier.frag` 的 WebGL 片元着色器，
不是播放 GIF。离线 `createCPU` 使用同一套逻辑制作对照图/GIF，仅为审稿媒体。
WebGL 与 CPU 的浮点/抗锯齿/透明合成不承诺逐像素相同。

## 参数和预设

默认自然燃烧：flow 1、scale 1.35、stretch 2.8、distortion .9、dissolve .22、
softness .055、core .55、steps .15、glow .5。其余预设是“手绘色阶”和“旺盛翻卷”。

| 参数 | 作用 |
| --- | --- |
| 上升速度 / flow | 多层 UV 的整体时间速率；基础循环 8s，实际循环为 8/flow |
| 纵向拉伸 / stretch | 拉长细胞噪声，减少圆形网格观感，形成火丝 |
| 噪声密度 / scale | 噪声在火焰区的采样密度，改变火舌大小 |
| 翻卷扰动 / distortion | 慢层噪声扭曲快层 UV 与形状，让上部弯曲 |
| 溶解侵蚀 / dissolve | 阈值去除燃料，火焰变稀；1 时火焰完全消失 |
| 边缘柔和 / softness | 轮廓从硬边到半透明软边 |
| 热芯亮度 / core | 增加低处的浅黄/白热区域，不是全局曝光 |
| 手绘色阶 / steps | 将连续温度色彩压成少量色带，0 自然、1 色阶化 |
| 独立光晕 / glow | 加法暖光，关闭也不改变主火焰轮廓 |

原附件 EffectDissolveDistort 提供扭曲和噪声溶解思路；此试作还包含火焰遮罩和温度色带。
若后续获准导入 Unity，需要把这些逻辑适配到材质/Shader，不能声称原附件仅调几个数值就原样包含它们。
届时仍应遵守单张静态噪声 + 实时 Shader，不用本轮的预览帧/GIF 作为运行资源。

## 三轮迭代和验证

1. 单图多速率 UV + 多峰遮罩，观察深浅底色和三个预设；发现火根平行亮条、上部细长。
2. 加强横向扰动，连接底部热燃料区，减少僵硬并行感；完善溶解末端。
3. 收紧火口根部遮罩，去掉盆沿外侧游离火点，降低中心过白，固定循环时钟和独立图层。

`output/hd/noise-brazier/round-1..3/` 保留每轮图。最终 version 3，seed 8。
离线检查在 256×320 采样 240 帧：可重复、三个预设首尾一致、无画布边缘裁切、
时间和九个参数均影响画面、dissolve=1 主火焰 Alpha 全空。报告位于 `checks.json`。
浏览器实际 WebGL 编译和控件另行目视验证；CPU 检查时间不代表 GPU 或设备性能。
本轮未做 Unity 编译/播放测试，也不覆盖上一版的验证状态。

## 工具

从 VFXDemo 根目录执行（可用 `--canvas-module` 指定本机已有的 @napi-rs/canvas 模块）：

```sh
node Tools/PixelFX/tools/render-noise-brazier.mjs --frames true
node Tools/PixelFX/tools/check-noise-brazier.mjs
python3 Tools/PixelFX/tools/preview-noise-brazier.py
```

这一路径是高清材质研究，因使用用户提供的静态纹理而有别于原 pixelfx 纯程序像素图形。
仍使用项目内 pixelfx 的来源、分层和 render/look/refine 流程，没有降低为像素风。

## Version 4 · 飞散火星与轻烟

作者认可燃烧效果后，要求增加少量贴图实现火星和烟雾。当前仍是 pixelfx 创作预览阶段，
未收到这个新版本的 Unity 导入指令，未创建或修改 Unity 资产。

只新增两张独立静态 RGBA 贴图，由 `tools/make-noise-brazier-secondary-art.mjs` 生成：

- `noise-brazier-art/SparkStreak.png`：64×64，白色细长火星，以粒子运动方向旋转拉伸。
- `noise-brazier-art/SmokePuff.png`：256×256，软边云状透明度，用粒子颜色染成灰烟。

火星从燃烧区向上和两侧飞出，阻力使其减速，随寿命由浅黄冷却为橙色、淡出；
混入少量缓慢摆动的余烬。烟雾在火焰后方上升、旋转和膨胀，受侧向气流影响，
淡入后逐渐散开。一个粒子始终采样同一张图，没有图集、序列帧或整效果视频。

新增独立参数：火星数量 `sparkDensity=1`、烟雾数量 `smokeDensity=1`、
烟雾浓度 `smokeOpacity=.18`、侧向气流 `wind=.12`。数量为 0 可分别关闭图层。
主火焰的九项材质参数与三个预设不变；页面支持仅火星、仅烟雾及两者组合的检查。

三轮 render/look/refine 的对照保存在 `output/hd/noise-brazier/secondary-round-1..3/`：
第一轮检查云团和火星大小，第二轮增加横向飞散和高温亮点、连接烟团，
第三轮降低烟雾浓度并扩宽上部薄烟，避免遮挡火舌。

已认可的 version 3 保存在 `output/hd/noise-brazier/flame-v3/`。
自动检查对 7 个时刻的主火焰独立层进行精确像素对比，均与 version 3 相同；
片元 Shader 的 SHA256 仍为 `a36f84f4acd50234ffecd5dab89eaf3528172920e33f74bc81024808b168127f`。
240 帧检查通过确定性、循环首尾、无边缘裁切、13 项参数生效、数量为 0 清空对应图层，
并验证烟雾持续上升和扩张。浏览器检查记录于 `browser-checks.json`。
GIF 和导出的 PNG 帧只供审稿，不作为运行资源；未做 Unity 或设备性能验证。

## 后续明确授权的 Unity 迁移

作者之后明确要求“接下来导入到unity中”。该指令授权 version 4 噪声火焰及新增火星/轻烟
导入独立目录 `Assets/PixelFX/Brazier/NoiseRealtime/`，不覆盖前面的已验收版本。
选用当前预览“旺盛翻卷”参数，seed 8。原稿及上面的创作阶段记录保留。

`tools/export-noise-brazier-unity.mjs` 仅导出 6 张静态资源和 manifest；火焰本身没有烘焙贴图。
原始 WebGL 算法移植到 URP Shader，原生 Custom1.x 提供时钟；原生发射/运动/生命周期
模块表达火星、余烬和烟雾，静态火盆由普通 SpriteRenderer 表达。
各层映射、可编辑参数、近似差异和验证路径见新目录 README。
审稿画廊 `/gallery/noise-brazier-unity.html`；真实播放 GIF 只供查看，不是运行输入。
