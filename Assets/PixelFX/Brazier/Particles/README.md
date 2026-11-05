# Brazier 原生粒子版

推荐使用本目录中的新版。旧版整幅序列帧和旧展示场景保留用于对照，没有覆盖。

## 直接使用

- `Prefabs/BrazierFlameParticles.prefab`：只有特效，锚点位于火源底部，可放进自己的 3D 火盆。
- `Prefabs/BrazierParticles.prefab`：附带原像素铁架、碗的完整版本，锚点位于盆脚。
- `Scenes/BrazierParticlesShowcase.unity`：复制原展示场景的已保存布置，只替换两个特效实例。
- 打开场景，在 Game 窗口点击 Play。也可选中粒子系统，用 Unity 自带的粒子预览面板播放。

## 独立分层

```
BrazierFlameParticles
├── 01_Flames    原配方十一处火舌根部 + 脱落小火舌 + 火焰小团
├── 02_Sparks    快速上升的火星 + 缓慢漂浮的余烬
├── 03_Smoke     主烟柱 + 火焰小团冷却后的烟团
└── 04_Glow      暖色光晕 + 火源核心光晕，均为 Additive 粒子
```

完整火盆另有 `00_BrazierProp`，只有静态铁架、碗的图像，不含烘焙火焰。
每层可单独关闭、复制、调参，不依赖其他层存在。四层关闭任一层不会停掉其他层的模拟。

粒子由 Unity Shuriken 的 Emission / Lifetime / Velocity / Noise / Size over Lifetime /
Color over Lifetime 模块驱动，不使用整幅特效序列帧，也没有脚本逐帧设置粒子位置。
FlameVariants 的八行是独立静态火舌形状：粒子出生时随机选一行，生命周期内不播放贴图动画。
材质只负责采样单粒子贴图、颜色、透明或叠加混合；没有时间驱动的特效动画代码。

## 摄像机朝向材质开关

选中 `Materials/Flames.mat`、`Sparks.mat`、`Smoke.mat` 或 `Glow.mat`，勾选：

`Always Face Camera (View Billboard)`

- 开：Shuriken 原生 `View` Billboard，每台摄像机分别对齐，跟随摄像机俯仰；禁用额外 Roll，不再只有绕世界 Y 轴转向。
- 关：使用 `Local` 对齐，面片方向由粒子系统的本地平面决定。
- 默认全部开启；火焰、烟雾、火星没有 Rotation over Lifetime，不会随机歪斜。
- 四个主材质分别控制整层。`FlamePuffs.mat` 只负责火焰小团的贴图渲染，朝向由 `Flames.mat` 统一控制；
  子系统 `ParticleMaterialFacing.Alignment Material` 与层根的 Facing Material 应指向同一个主材质。
- `ParticleMaterialFacing` 是材质开关和原生 Renderer 对齐模式间的桥接组件，编辑器和运行时均有效；
  不旋转整个特效根节点，不复制材质，也不驱动粒子运动。复制粒子系统时请保留此组件。
- `ParticleLayerFacing` 让各层的发射布局也按当前摄像机平面对齐，避免俯视时火舌根部错位或烟柱被压扁；
  渲染后恢复原变换，场景根节点和原始层偏移保持不变。层根上的 Facing Material 是该层布局的开关来源。
- 材质是共享的，同一材质的开关会影响所有引用它的粒子系统；需要单独控制时先复制材质。

## 从原始配方抓取的参数

`Textures/BrazierSourceRecipe.json` 来自 pixelfx 的 `src/fx/fire/brazier.js` 和 `fire/_lib.js`，
同时保留来源 SHA256、原始运动说明和映射限制。Build 读取这个文件生成粒子参数，不再单独手填一套运动数值。
提取脚本为 pixelfx 项目的 `tools/export-brazier-particle-stamps.mjs`。

| 发射器 | 发射率（个/秒） | 寿命（秒） | 初始上升速度（Unity 单位/秒） | 原始水平/竖直阻尼（1/秒） |
| --- | ---: | --- | --- | --- |
| 快速火星 | 20 | 0.7–1.7 | 2.1875–4.6875 | 1.9 / 1.9 |
| 漂浮余烬 | 10 | 1.1–2.4 | 0.78125–1.875 | 1.6 / 1.6 |
| 主烟雾 | 14 | 1.6–2.4 | 0.3125–0.53125 | 1.6 / 1 |
| 火焰小团 | 88（11 × 8） | 0.14–0.3 | 0.46875–0.9375 | 5 / 3.2 |
| 脱落火舌 | 44（11 × 4） | 0.26 | 0.375–0.6875 | 0 / 0 |

原火星是 3 秒循环中的 60 个出生点，因此对应平均发射率为 20/秒，不是 60/秒。
火焰小团有 45% 冷却为烟，独立烟层以平均 39.6/秒近似；不是严格逐粒子转型。
坐标按 32 像素/Unity 单位换算，Y 方向反转，时间保持秒；原始起点范围、加速度也写入粒子模块。

原 `drift()` 的阻尼运动被转换为 Velocity over Lifetime 的速度曲线：
`v(t) = a/k + (v0 - a/k) × exp(-k × t)`，无阻尼时为 `v0 + a × t`。
曲线使用平均寿命归一化，所以随机寿命粒子的真实秒数阻尼是近似，Unity Noise 也不等同于原版正弦摆动。

主火舌不是原始粒子发射器，而是 `flameTongue()` 逐行变形的程序化图形。
本版抓取其 11 处根部、高宽比例，以静态形状变体、发射、尺寸和噪声近似；
主火舌的发射率/寿命属于 Unity 重组参数，不冒称从原版直接抓取。
移动火舌顶端的出生位置、随机数序列、火团转烟及光晕外观也不保证与原版逐像素一致。

## 发光与调节

特效 Prefab 中没有 `Light` 组件，所有粒子的 Lights 模块也都关闭。
`04_Glow` 只靠软圆贴图和 `SrcAlpha / One` 叠加粒子发光；不会照亮真实场景物体。
舞台原有方向光仅用于显示地面，不属于火焰发光。

- 火焰：调各 Tongue 的 Emission、Start Lifetime、Start Size 与 Noise。
- 火星：调 Rising sparks / Floating embers 的 Emission、Velocity over Lifetime 曲线与 Noise；未启用额外 Limit Velocity，避免重复阻尼。
- 烟雾：调 Start Lifetime、Size over Lifetime、Color over Lifetime 的 Alpha。
- 光晕：调 Halo / Core 的 Start Color、Emission、Size，或材质 Brightness。

这是保留原像素火焰语言的原生粒子重组，不保证与原整幅序列帧逐像素一致；粒子形态与运动可独立编辑。

工具菜单：`Tools > PixelFX > Brazier Particles`。
Build 重新生成本目录的 Prefab 与材质，但不覆盖已有的粒子展示场景布置。
Validate 检查四层、Light 禁用、材质朝向开关，以及原配方的发射率、寿命和初始速度映射；
Capture 输出组合、55°斜视及分层预览到工程根目录的 `BrazierParticlePreviews/`。

来源：pixelfx `fire/brazier` 与 `fire/_lib.js`；Patch / Hugo Duprez，MIT。
许可证见上级目录 `LICENSE.txt`。生成贴图脚本位于 pixelfx 项目的 `tools/export-brazier-particle-stamps.mjs`。
