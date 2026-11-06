# BuildFX V2 · 独立调色与原生随机烟雾

2026-11-05。作者要求按已确认的理解修改现有组装：颜色尽量独立可调，
烟雾按实际使用进行受控随机，而非逐个照搬固定 seed 的烟团。
本轮范围仅 BuildFX 资产、原工作场景对应实例、说明及工作流案例。
原 Canvas 艺术原稿未修改，也没有生成 GIF。

## 保留与交付

- 默认 `Assets/PixelFX/BuildFX/Prefabs/BuildFX.prefab` 保持 GUID，更新为 V2。
- 原版复制为同目录 `BuildFX_V1.prefab`；原版纹理、网格、Shader、材质均不覆盖。
- 新增专属资源分类放在 `Assets/PixelFX/BuildFX/V2/{Textures,Meshes,Shaders,Materials}/`。
- 唯一工作场景 `Assets/Scenes/VFXWorkbench.unity`，保留本轮开始时的 Main Camera 和
  BuildFX 位置 (0,-1.3,0)、活动状态、缩放；不恢复作者此前已移走的其他作品。
- 导入前备份 `VFXWork/Backups/BuildFX/V2/before-v2.tar.gz`；现场读取见 `Before.json`。
- 无专属 Editor/运行脚本、窗口、菜单、Light 或帧动画。

## 颜色改造

保留真正原稿 painter 生成的轮廓 Mesh、烟和微光明暗、透明度，新增一张 1024×512
RGBA32 线性数据 atlas。Bilinear / Clamp / 无 mip / 无压缩 / 不可读。
烟与光为中性明暗数据，几何色块编码 role/shade/alpha，而非固定黄白色。
两种共享材质使用同一 URP Unlit Shader，分别 Alpha 与 Additive：

- Alpha：Smoke / Flash Main / Flash Highlight / Sweeping Arcs / Stars / Chips。
- Additive：Glow / Glow Intensity。
- 原生 Start Color / Color over Lifetime 继续作为乘色与淡出，不通过脚本改材质。

七个分区 Alpha=0 的实际像素差均非零：77748 / 22689 / 11899 / 3820 / 244 / 150 / 49077。
`V2_CoolPalette_026.png` 实测跨色相蓝色闪片、青烟、紫弧、红星点；没有覆盖默认材质。
这是真正的分区换色，不是只暴露一个整体 Tint。所有调参入口见资源内 Docs。

## 烟雾重组

17 个固定 Puff 系统 → 一个 `01_Smoke/SmokeRandom`，总系统 28 → 12（均含根入口）。
原生 Burst：0.075s 7–9 个、0.47s 4–6 个、0.69s 3–5 个；
Box 出生域中心 (0,1,0)、尺寸 (2.5,1.35,0)，三种静态 Mesh 烟形随机选择。
随机尺寸 1.05–1.65、Z旋转±0.65rad、X速度±0.32、Y速度0.3–0.6；
轻微 Noise X=.08、Y=.06、Z=0。没有额外的3D散布或逐帧外部修正。
Main 双寿命曲线前长后短，最后一轮寿命 .36–.46s，保留约1.2s收尾。
场景展示实例仍1.6s循环，其 SmokeRandom 的寿命曲线横轴按1.6s重新归一化。
三次闪片起点0.16 / 0.50 / 0.71s及前后层次保持；不强求烟团身份/具体轨迹相同。

烟、星点、碎屑默认开启 Auto Random Seed。真实重新播放测得不同 seed：
648657903 / 1851065695 / 2775330257。循环由原生引擎管理，不保证每个 loop 都换独立 seed。
固定 seed 仅用于审稿和性能对照，不写回交付资产。

## 视觉与真实播放

静态审稿使用临时内存 preview scene，不创建场景资产，不写坏工作场景。
相机与预览对象在同一 preview scene，还需显式 Camera.scene 指定该 scene；
否则可能得到只有背景的截图，不能把空图当作参数端点通过。
最初的空图已被有画面的重测覆盖；RGBA 参数端点依据实际像素变化判定。

- seed 22 / 71 / 143 / 329，分别检查0.21 / 0.54 / 0.75s，分布变化可见，Z维持0。
- 烟、前闪片独层，深浅底、55°斜视、1.2s尾部；见 `VisualAndStructure.json` 和 PNG。
- `RandomSeeds.png`、`V1Left_V2Right.png` 是静态对照，不是实时播放或帧动画资源。
- `LivePlayback.json` 是真正 Play Mode：引擎帧、时钟、位置与年龄推进；无 Simulate/Emit/SetParticles。
  关闭发射后0粒子，恢复后重新产粒，一次性游戏年龄1.3s后0粒子，无运行错误。
- `ReusePlayback.json` 检查暂停/恢复、清空重播、启停、半尺寸与出入镜；测试后恢复现场。

最终保存前逐属性比较当前工作场景与磁盘版本：除临时对象引用 ID 外，只有新烟系统的
Start Size Y/Z 与 Start Rotation X/Y 四个轴的 minMaxState 被 Unity 播放自动校正为 TwoConstants。
将其一致写入 Prefab 后清理旧 Puff 删除所留下的51条失效覆盖；相机、摆放和其他设置未变。
比较与保存证据见 `FinalSceneComparison.json`、`SceneFinalization.json`，最终读回见 `FinalState.json`。

当前是固定 XY 的2.5D效果；默认配色保持原黄白/灰紫方向，但随机分布不与原稿逐像素一致。
最终 V2 视觉仍待作者在 Unity 中验收。

## 性能 A/B

Unity 6000.3.19f1 / URP PC_RPAsset / Metal / Apple M5 / Linear / Editor，
1648×1028，vSync=0、targetFrameRate=-1。未改全局 batching/render 设置。
同一场景同一相机，关闭交付实例，用临时 V1/V2 同时触发重叠实例探查：
0 → V1/V2各1 → V1/V2各8 → V1/V2各32，交错顺序、重复两轮；
每阶段暖机1.7s + 采样3.3s，每两个实际引擎帧采一次。
计时期间不截图、不开 Frame Debugger；第一段诊断与计时重叠的部分运行已明确废弃，
只采用后续完整、恢复成功的70秒运行（`PerformanceRaw.json` / `PerformanceSummary.json`）。

以下为 median / P95。CPU/GPU是整帧 Editor 口径，含UI、引擎和诊断回调；不是效果独占时间。

| 并发/版本 | 样本帧 | UnityStats Batches | UnityStats DrawCalls | CPU主 ms | 粒子Update ms | GPU整帧 ms | 峰值粒子 |
| --- | ---: | --- | --- | --- | --- | --- | ---: |
| 空场景 | 689 | 6 / 6 | 6 / 6 | 3.860 / 9.647 | .0053 / .0142 | 1.719 / 3.347 | 0 |
| 1 / V1 | 698 | 7 / 8 | 13 / 25 | 4.367 / 7.935 | .0403 / .0761 | 1.918 / 3.327 | 43 |
| 1 / V2 | 695 | 7 / 8 | 9 / 13 | 4.336 / 7.679 | .0253 / .0470 | 1.956 / 3.259 | 38 |
| 8 / V1 | 567 | 7 / 8 | 61 / 158 | 5.510 / 8.372 | .2539 / .3555 | 2.289 / 3.661 | 333 |
| 8 / V2 | 462 | 7 / 8 | 25 / 62 | 4.571 / 8.001 | .1009 / .1573 | 1.850 / 3.484 | 296 |
| 32 / V1 | 390 | 8 / 11 | 205 / 614 | 8.193 / 12.203 | .9911 / 1.3128 | 2.956 / 4.552 | 1328 |
| 32 / V2 | 453 | 8 / 9 | 97 / 230 | 6.866 / 11.040 | .4611 / .6545 | 2.592 / 4.137 | 1206 |

本机对照测到多实例粒子 Update 与绘制提交计数降低；单体GPU median略升0.038ms，
不声称各项都更快。V2的分布、寿命、数量与Shader也有变化，不把全部收益归因于减少系统。
目标并发/设备预算未知，不能据此宣称手机达标。
SetPass、GC、分轮数据与资产内存见 JSON；GC不是效果独占分配，也没有证明长期复用零增长。

通过官方 FrameDebuggerWindow.EnableFrameDebugger 路径，获得1体/8体透明Pass的实际事件元数据
（`FrameDebuggerEvents.json`），均9个总事件，包含 SoftGlow、Stars 等代表Renderer。
逐事件 GetFrameEventData 未返回完整详情，因此材质/变体/具体合批对象和break reason仍不完整；
不以代表对象名推断其他 Renderer 被合并，也不把 Batches 与 DrawCalls 口径混用。

未测：目标 Player/移动设备预算、打包变体剔除、每Pass GPU/overdraw、渲染线程与长期复用内存。
交付级别：功能/播放验证、同条件本地 Editor A/B已测；不是目标设备预算通过版。

## 工作流复盘

此次已将作者的配色与受控随机原则补入项目 skill：先定义艺术不变量与允许变化的范围，
再决定 Unity 原生结构；颜色和随机化应可通过 Inspector 使用和验收。
具体七色编码、Burst数值与12个系统只是 BuildFX 案例，不升级成其他效果的固定结构。
