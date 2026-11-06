# BuildFX · 制造装配闪爆

日期：2026-11-05。独立短爆发案例族，不含迫击炮/人物模型；与 Brazier 无运行依赖。
作者明确授权导入并指定 `Assets/PixelFX/BuildFX/`，之后默认动态页面验收、不再生成 GIF。

当前默认是下文 V2；V1 仅保留为历史对照，不再把17个 Puff系统作为新迁移的默认结构。

## V1：初次组装（历史基线）

### 已验证的范围

- 原稿 `Tools/PixelFX/src/hd/mortar-assembly.js` / v1 / seed22 / 1.2s / PPU128。
- `Tools/PixelFX/tools/export-buildfx-native.mjs` 直接调用原稿 painter，
  导出 1024×512 静态 atlas、轮廓 Mesh 与 Assets 外 recipe，非序列帧。
- 17 个原生烟粒子系统、前后闪片、白弧、星点、碎屑和 additive 微光；
  含根入口共 28 个系统、14 个 Mesh、2 个材质，没有挂载脚本或自定义窗口。
- URP Unlit Shader，原生 Position/Normal/Color/UV，局部 XY 的 2.5D 效果；
  正面、55°斜视和深浅背景已静态检查，不能当作体积烟/任意视角地环模板。
- Prefab 一次性 1.2s；公共工作场景实例用原生 Main 覆盖为 1.6s 循环。
- 真实 Play 检查时钟、运动、一次性收尾、Emission 关闭耗尽/恢复，
  与 Edit Mode 固定步长 Simulate 审稿证据分开记录。
- Apple M5 / Metal / Unity 6000.3.19f1 / URP 17.3，
  隔离 0/1/8/32 同步重叠并发，暖机1.7s/采样4.9s，重复两轮。
  whole-frame CPU/GPU 与 UnityStats 可测，具体数值见作品记录，不形成统一预算。

### 本案例发现与修正

1. Unity 报 `Particle Velocity curves must all be in the same mode`：
   XYZ 包括“数值为零”的轴也须使用一致 mode；本例将常量扩成恒值 Curve/TwoCurves。
   同时检查 Rotation/Size 的独立轴，不因某轴不运动就忽略其序列化类型。
2. 使用解析位置的导数做 Velocity over Lifetime 仍是积分近似：
   大步长会影响烟团展开，不能称逐轨迹/逐像素原样。静态对照用固定步长；
   真实 Play 仍须独立观测，不拿 Simulate 图证明播放。
3. Canvas 与线性 additive 混合不同：本例将微光材质 Tint Alpha 校准为 0.1，
   保留 Main strength .35；这是单案例视觉值，不是所有效果的亮度换算公式。
4. 一次性收尾应按实际游戏/粒子年龄判断，不按 MCP 指令发出后的墙钟时间判断；
   临时对象初始化与 Editor 卡顿会造成偏差。
5. Frame Debugger 内部命名空间在该版本为
   `UnityEditorInternal.FrameDebuggerInternal.FrameDebuggerUtility`；
   Enable 的目标应来自当前 Profiler 连接，不能把 0 当通用本地目标。
   本例 bounded capture 仍未获得事件，故仅记录“批次数已采样、合批机制未确认”。

### 差异和未验证项

闪片衰减/弧线几何用原生缩放近似；星点与碎屑为原生随机出生范围，非相同随机身份。
烟分布和混合存在可见差异，Unity 原生版最终视觉还需作者在工作场景验收。
UnityStats Batches 与 DrawCalls 数字不同，不能只取较小值声称实际每层已合批。
Editor 数据不等于目标 Player；缺精确逐事件合批、每 Pass GPU/overdraw、目标设备预算、
变体剔除与长期复用内存数据。没有算法性能优化 A/B，不声称已优化或低端机通过。

### 证据入口

- 完整记录：`VFXWork/Previews/BuildFX/V1/effect-record.md`。
- 静态结构/视觉：同目录 `StructureAndStaticVisual.json`、`SourceLeft_UnityRight.png`。
- 真播放：`LivePlayback.json`、`ReusePlayback.json`。
- 性能：`PerformanceRaw.json`、`PerformanceSummary.json`。
- 导出合同：`VFXWork/Exports/BuildFX/V1/manifest.json`。
- 使用：`Assets/PixelFX/BuildFX/Docs/README.md`。

上述是本项目真实案例证据，不是跨效果通用的一键导入参数。

## V2：面向实际使用的组装修订

作者指出 V1 的颜色主要烘焙在素材中，且 17 个确定烟团不应自动对应 17 个系统。
当前默认 `Prefabs/BuildFX.prefab` 已修订，旧版保留为 `Prefabs/BuildFX_V1.prefab`，
旧素材不覆盖；本次新增资源集中于 `Assets/PixelFX/BuildFX/V2/`，仍不建 Scenes 或 Editor。

- 颜色：复用原轮廓与透明度，将烟/光晕变成中性明暗数据，几何颜色区存 palette role/shade。
  两个材质支持 Smoke、Flash Main、Flash Highlight、Arcs、Stars、Chips、Glow 独立颜色和透明度。
  七个颜色 Alpha=0 的实际像素变化已测；蓝色配色已实际渲染，不只是形式上暴露 Tint。
- 烟：一个原生系统、三轮 Burst，Box 出生范围、随机数量/尺寸/寿命/旋转/速度、轻微平面 Noise，
  三种静态 Mesh/UV 烟形随机选择；Z 厚度/速度/噪声为0。烟系统17→1，总系统28→12。
- 寿命：前长后短的原生 Main 双曲线使用系统归一化时间；场景实例 Duration=1.6 的曲线
  必须对应缩放横轴，不能直接复用 Prefab Duration=1.2 的归一化坐标。
- 随机：烟/星点/碎屑使用 Auto Random Seed，真实 Stop/Play 测得不同 seed；固定 seed 仅用于
  多种分布及 A/B 对照。自动 seed 不等于承诺每个 loop 都独立重播随机数。
- 验证：seed 22/71/143/329 三次峰值、独层、深浅底和55°斜视，真实 Emission 关-耗尽-恢复、
  一次性1.3秒游戏年龄后无粒子。多个 seed 都需保留中心辨识度、范围和干净收尾。
- Frame Debugger：通过该版本官方窗口 Enable 路径可得到单体/8体的实际透明 Draw 事件元数据；
  但逐事件 `GetFrameEventData` 尚未返回详情，不能依据代表 Renderer 名称推断完整合批关系。

### V2 收尾踩坑与边界

- 静态截图的相机与对象应同属内存 preview scene，本例还需指定 `Camera.scene`；
  最初只得到背景，纠正后重跑覆盖。七色端点通过依据是有目标图层的实际渲染与像素变化，不是空图。
- Unity 6000.3.19f1 播放后将新烟系统 Start Size Y/Z、Start Rotation X/Y 的
  `minMaxState` 从 Constant 自动校正成 TwoConstants。逐属性比较确认其他场景设置未变后，
  将四轴校正写入 Prefab，并清理本轮删除 Puff 留下的51条失效覆盖；不能泛化成所有效果都填同一mode。
- 原版纹理/材质/网格/Shader hash 未变；保留副本仅因 CopyAsset 将根名称改为 BuildFX_V1
  而与原 Prefab 原始 hash 不同，排除该命名差异后其余序列化内容一致。
- 原 Canvas 页面仍为固定 seed 艺术原稿，并非 Unity V2 直播；新版配色与随机化在 Unity 验收。

### V2 实测与证据

Apple M5 / Metal / URP / Editor，同相机1648×1028、交错 V1/V2 各1/8/32重叠实例，两轮，
每阶段暖机1.7s/采样3.3s。本机多实例粒子 Update 与 DrawCalls 计数降低；
单体GPU median由1.918ms变为1.956ms，并非所有项都更快。数量、寿命、分布与Shader也变化，
不能将全部收益归因于系统数。最初与诊断重叠的计时运行已废弃，仅采用后续独立采样。
这些是 Editor 同条件 A/B，不代表目标 Player/手机预算、每Pass GPU/overdraw或长期复用内存通过。

V2 证据在 `VFXWork/Previews/BuildFX/V2/`：`VisualAndStructure.json`、`LivePlayback.json`、
`ReusePlayback.json`、`FrameDebuggerEvents.json`、`PerformanceRaw.json`、`PerformanceSummary.json`、
`SceneFinalization.json`、`FinalState.json`、`DeliveryManifest.json`；解释与测量口径见 `effect-record.md`。

V2 导出工具：`Tools/PixelFX/tools/export-buildfx-editable.mjs`；
导出合同：`VFXWork/Exports/BuildFX/V2/manifest.json`，与 V1 记录分开。
本例说明迁移应保持艺术目标、重设计可用结构，而非一比一复制固定 seed 下的每个粒子。
