# BuildFX · 制造装配闪爆 V1

日期：2026-11-05。独立短爆发案例族，不含迫击炮/人物模型；与 Brazier 无运行依赖。
作者明确授权导入并指定 `Assets/PixelFX/BuildFX/`，之后默认动态页面验收、不再生成 GIF。

## 已验证的范围

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

## 本案例发现与修正

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

## 差异和未验证项

闪片衰减/弧线几何用原生缩放近似；星点与碎屑为原生随机出生范围，非相同随机身份。
烟分布和混合存在可见差异，Unity 原生版最终视觉还需作者在工作场景验收。
UnityStats Batches 与 DrawCalls 数字不同，不能只取较小值声称实际每层已合批。
Editor 数据不等于目标 Player；缺精确逐事件合批、每 Pass GPU/overdraw、目标设备预算、
变体剔除与长期复用内存数据。没有算法性能优化 A/B，不声称已优化或低端机通过。

## 证据入口

- 完整记录：`VFXWork/Previews/BuildFX/V1/effect-record.md`。
- 静态结构/视觉：同目录 `StructureAndStaticVisual.json`、`SourceLeft_UnityRight.png`。
- 真播放：`LivePlayback.json`、`ReusePlayback.json`。
- 性能：`PerformanceRaw.json`、`PerformanceSummary.json`。
- 导出合同：`VFXWork/Exports/BuildFX/V1/manifest.json`。
- 使用：`Assets/PixelFX/BuildFX/Docs/README.md`。

上述是本项目真实案例证据，不是跨效果通用的一键导入参数。
