# EnergyCluster V6 · 光晕方边修复

授权：作者要求“修复该问题”，仅修复已导入能量球的光晕裁切；不改设计、不导入爆炸。

## 原因与最小修改

原 Halo 与主体同用 2.56 单位面片，逻辑坐标范围 ±128，但径向光晕在面片四边仍有非零蓝光，因此被直线截断。
壳层图集外缘原本透明，不是序列帧脏边。

- Halo 原生 Start Size：2.56 → 3.84（1.5 倍），覆盖逻辑坐标 ±192。
- Shader 仅对 Halo 将 UV 对应的逻辑坐标同乘 1.5，原光晕物理尺寸、强度、颜色不变。
- Halo Renderer Max Particle Size：1 → 1.5，防止近景先触发尺寸上限导致光晕相对主体缩小。
- 其余四层、材质、贴图、寿命、循环交接和场景文件未改；仍为一个 prefab、五层原生粒子、无运行时脚本。

`manifest.json` 记录本次运行资产 hash 与原导入版本的关系。原导入 manifest/QA 不覆盖。

## 视觉与播放

Unity 6000.3.19f1，URP PC_RPAsset，Linear / Metal，Apple M5。
目标身份：VFXDemo，`Assets/Scenes/VFXWorkbench.unity`，显式 MCP 8766。

- `Before/After_*.png`：512×512、无 HDR/MSAA 的 Unity 原生静态对照；默认视野宽 5.12 单位，完整露出原面片和扩大后的面片四边。
- 黑底、深灰底、浅底：原 256×256 面片范围的最大 RGB 像素差为 0；新增区域只有自然延续的光晕。
- Halo 单层扩大后四条边相对背景 RGB 差为 0；原左边蓝通道从 32→39 的硬跳变变为 39→39 的连续采样。
- Shell 单层整张截图逐像素一致；游戏视距原区域最大量化差 1/255；近景和屏幕尺寸上限测试一致。
- 多时相静态采样覆盖 .024/.144/.288/.456/.492 秒，截图不是实际播放证明。
- `LivePlayback.json`：真实 Play Mode 的年龄推进、Emission 关闭耗尽至 0、恢复至 5 粒子、Stop/Play、根节点启停与移出镜头再返回通过；未使用 Simulate/Emit/SetParticles 驱动真实播放。
- `RenderedContinuity.json`：真实主相机渲染后观察 49 帧、约 5 秒，初始化后最低 5 粒子，无空帧。
- `Live_Early/Late.png`：实际引擎播放中的原生渲染截图，留出足够边界，非 GIF。

## 批次、成本和限制

同一 Editor 相机，2340×1080、Ortho 4.9、HDR/MSAA Off、VSync 0；前后各运行九阶段，0/1/8/32 重叠两轮及 8 分散实例。
每阶段暖机 .8 秒、采样 2.2 秒；计时期间没有截图或 Frame Debugger。并发是探查值，不是业务需求。
下表为全帧中位数，含 Editor 与探针开销，不是单特效独占耗时。

| 并发 | Draws 前/后 | Batches 前/后 | CPU Main ms 前/后 | GPU ms 前/后 |
| --- | --- | --- | --- | --- |
| 0 | 6 / 6 | 6 / 6 | 2.813 / 3.144 | 3.911 / 3.062 |
| 1 | 11 / 11 | 11 / 11 | 3.079 / 3.439 | 4.400 / 3.183 |
| 8 重叠 | 46 / 46 | 11 / 11 | 3.259 / 3.372 | 3.982 / 3.964 |
| 32 重叠 | 166 / 166 | 11 / 11 | 4.191 / 4.103 | 5.978 / 8.754 |
| 8 分散 | 46 / 46 | 11 / 11 | 3.468 / 3.315 | 4.631 / 4.012 |

SetPass 与 Batches 的上述中位数相同。粒子数量上限、材质与纹理资源数均未增加。
Halo 几何面积为原来的 2.25 倍，五张等尺寸面片合计面积增加 25%；这只是几何覆盖估计，不是精确 overdraw 或 GPU 增幅。
32 重叠压力组实测 GPU 中位数上升；其余组及空基线也有明显波动，不能声称修复无 GPU 成本或性能改善。
原始逐帧样本和 P95 保存在 PerformanceBefore/After，汇总见 `PerformanceComparison.json`。

Frame Debugger 与计时分开运行：1/8 实例均取得 12 个元数据事件；单实例明确包含 Volume/Halo/Core/ShellGlow/Shell 五个透明 DynamicGeometry 事件。
多实例原生逐事件详情仍不可取得，不能据事件元数据推断精确合批或 break reason。

资源原始输入 hash 未改，纹理运行时内存见 FinalState；无新贴图、材质或粒子系统。
目标 PC Player、业务并发预算、单 Pass GPU/精确 overdraw、长期池化内存仍未测，不宣称目标性能验收通过。

## 状态保护

修复前快照在本目录 `.before` 文件；本次不保存、重建或清理场景。
`EdgeValidation.json` 验证场景文件、相机和实例 overrides 不变，prefab 仅两项 Halo 数值变化。
`FinalState.json` 为退出 Play 后的最终状态，确认临时对象移除、无新增脚本或爆炸依赖。
