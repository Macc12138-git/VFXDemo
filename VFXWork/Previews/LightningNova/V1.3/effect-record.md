# LightningNova · V1.3 Unity 原生导入记录

日期：2026-11-05。独立雷霆环爆案例，原稿 2D / 空间 3D 两版；作者明确指令“导入到unity中”。
不将浏览器预览自动当作 Unity 最终视觉验收。

## 输入与边界

- 源码：`Tools/PixelFX/src/hd/lightning-nova.js`，SHA256 `0fae2726a83fdac40a742a7510d6dc89cdc23f4199bbaba8937da57e2c28b664`。
- seed69、radius2.5、intensity1、glow0.65、density1；Core #f5ffff、Body #73eaff、Edge #387bfa、Spark #bcf7ff；1.2s 单次，源单位=Unity单位，根原点=落雷点。
- 作者迭代目标：雷环更细、保留高低空间穿绕；命中爆发/消散冲击；电流局部通电、脉冲、烧断及弱复燃。浏览器三轮记录在 `Tools/PixelFX/records/hd/lightning-nova/`。
- 目标：当前 VFXDemo / Unity6000.3.19f1 / URP17.3 / Linear / Metal / Apple M5。手机型号、FPS预算和正常并发未提供；不宣称目标设备通过。
- Unity 资源根：`Assets/PixelFX/LightningNova/`；专属 Meshes/Materials/Shaders/Prefabs/Docs，无 Scenes/Editor、无纹理或帧动画。运行仅依赖 URP。
- 唯一工作场景：`Assets/Scenes/VFXWorkbench.unity`。开始时 Editor sceneDirty=false，实际根节点只有 Main Camera；仅新增两版展示实例，原有相机/场景设置逐块与本轮备份比较。
- 导出：`VFXWork/Exports/LightningNova/V1.3/manifest.json`、`native-recipe.json`。源与最终 Shader、资产 hash 见 `DeliveryManifest.json`。

## 分层与原生映射

| 行为层 | 表达 | 原生职责 | Shader/材质职责 |
| --- | --- | --- | --- |
| 先导、主雷、两次弱补闪 | 静态参数化 tube Mesh | Emission Burst、Start Lifetime/Color | 年龄驱动折线、宽度、局部缺口、分区配色 |
| 白热内核、冠状尖芒、放射/压力波 | 静态参数化三角与线管 Mesh | 命中时 Burst、寿命 | 命中膨胀、尖芒展开、快速淡出 |
| 外环、内环、下降甩光 | 三组独立空间细线 Mesh | 独立出生时序/寿命 | 源路径公式、传播出生、局部烧断、复燃、移动热包 |
| 主雷光晕、轨道光、地面光池 | 共享参数 Mesh | 独立 additive 系统 | 加法颜色与强度；将源 sRGB 预乘光贡献解码一次后送线性管线 |
| 次级电流与尾部短弧 | 一种静态短弧 Mesh、多轮Burst | Circle/Sphere出生域、随机旋转/寿命、尾部低强度Burst | 年龄驱动短弧缺口和局部闪烁 |
| 飞散电荷 | 双平面菱形 Mesh | 三轮Burst、随机尺寸/寿命/速度、重力、拖曳、Size/Color over Lifetime | 形状与 Spark 配色 |

每版16个 Particle System（含一个无发射入口）、12个共享 Mesh、每版 Color/Additive 两个材质；无脚本、缺失组件、Animator/Timeline、Light、纹理序列或运行 JSON。
2D 在材质内作固定24°投影并落到本地 XY；3D 保留 XZ 圆环与高低路径。Renderer 使用 Local，而不是 View/Billboard。
顶点 UV0..UV3 各2维：p/q、kind/id、aux0/aux1、aux2/aux3；原生流打包至TEXCOORD0/1，AgePercent/InvStartLifetime/StableRandomXY 至TEXCOORD2，SizeXYZ 至TEXCOORD3。POSITION=0，Normal/Tangent 恢复原生粒子旋转基底；Bounds 覆盖 Shader 变形。

## 参数与随机

材质独立 Core/Body/Edge/Spark 颜色及Alpha；颜色与原生顶点色/Alpha相乘。两版材质各自共享，多实例改色需自行复制并赋材质，不自动生成实例材质。
主环路径固定seed69；次级电流、碎光、尾弧 Auto Random Seed，真实 Stop/Play 已读回不同seed。固定seed22/69/143/329仅审稿/采样使用，不承诺每个loop刷新seed。
Prefab duration1.2/nonloop；展示实例1.9/loop；所有Burst为秒数，Main无按系统时间采样的随机曲线，无横轴重映射需求。原生 Size/Color over Lifetime 按粒子归一化年龄。
时钟来自粒子年龄秒数 `AgePercent / InvStartLifetime`，不用 `_Time`。Start Lifetime 也影响内部进度，不能当成整体变速按钮。
使用说明只在 `Assets/PixelFX/LightningNova/Docs/README.md` 记录使用和 Inspector，不放技术合同。

## Unity 三轮校正

| 轮次 | 发现 | 修正与证据 |
| --- | --- | --- |
| 编译/初渲染 | `point` 为 Metal/HLSL 保留标识符；初稿偏暗纯蓝、3D跟随视角 | 改名node；BakeMesh标量探查发现Color变成(0,0,128,63)，对应Float32白色位模式；将源Mesh顶点色改为UNorm8 Color32。Renderer改Local，重跑全套静态图 |
| 时相与审稿 | fixedTimeStep使.112s样本落在发射边界而空图；首轮真实审稿受编译首帧卡顿影响 | 静态用2ms精确小步采样，仅作审稿；真实测试暖机后Stop/Play，记录实际引擎年龄，不调用Simulate/Emit/SetParticles |
| 光晕与空间 | Linear additive使外光池偏白偏亮，遮住细线 | 外光池恢复Body语义；先在sRGB预乘光，再转线性。深浅底、单层、5/24/60/85°视角、四色端点与最终性能重新采样 |

一次性诊断曾因 Newtonsoft 直接序列化 Unity Color/Vector 的递归属性触发 Editor 堆栈溢出。此前资产/场景已保存，重开同工程后只序列化标量数组；不是交付 Prefab 的运行依赖。重开后的身份、场景与资产重新核验。

最终后台Editor回调较稀疏，LivePlayback里的oneshot标签是目标阈值，不是精确捕获时间，须读engineAge。`Live_Workbench_Observed.png`实际约0.302s，是动态播放观测图，不冒充0.17s峰值；精确.112/.165等静态审稿图独立标注为Edit Mode采样。

## 验证状态

| 项目 | 状态和证据 |
| --- | --- |
| Unity 最终视觉 | 静态关键帧、独层、深浅背景与空间视角已检查；仍待作者在Unity验收。浏览器页面仍是艺术原稿，不是Unity直播 |
| Shader/材质 | Metal实际渲染，四种颜色Alpha=0均有非零像素变化；跨色相红/紫/绿测试见Palette图、`VisualAndStructure.json`。保留整数mod性能警告，不是编译错误 |
| 结构/非序列帧 | Prefab和场景实例均检查；原生组件，无运行脚本/纹理动画/Lights |
| 真播放/复用 | `LivePlayback.json`：先导/命中/展开实际年龄推进，.94/1.3秒无粒子；Emission关→耗尽0→开启产粒，Stop/Play随机seed变化、镜头外返回与再触发通过 |
| 子发射器 | 不适用，本设计未使用 |
| 渲染事件 | `FrameDebuggerEvents.json`：代表命中时相单体11、8体88条DynamicGeometry事件；GetFrameEventData未能取得详情，不从代表名称推断完整合批关系或具体break reason |
| 本地性能 | `PerformanceRaw.json`、`PerformanceSummary.json`、`PerformanceTable.md`：0/1/8/32同步重叠及8体错峰，两轮，1.7s暖机+3.3s采样，统计与抓图/FrameDebugger隔离。光晕校准前记录保留在BeforeLightCalibration，不当作最终值 |
| 设备/构建 | 目标Player Shader变体、手机预算、每Pass GPU/overdraw、长期池化内存未验证；未擅自构建/发布或改项目级渲染设置 |
| 场景保护/清理 | `SceneFileComparison.json`、`FinalState.json`：相机及原有场景块保持，仅新增两个PrefabInstance及SceneRoots条目；临时Play对象/回调/ProfilerRecorder和后台运行设置清理恢复 |

性能具体数值以最终 `PerformanceTable.md` 为准。Editor整帧CPU/GPU、GC含引擎/UI/诊断开销，不是纯特效成本；1.9s循环有长空白，median粒子/Draw可能低于峰值，须看P95/max。无独立算法性能优化结论，不把视觉光晕校准当成优化达标。

## 已知差异及交付层级

原生次级电流/碎光维持表现目标，不复制源固定随机身份；Mesh透明三角排序不同于浏览器小笔触排序。
主环路径/电流公式保留，细双丝与断端碎光由次级Burst近似；两次弱补闪统一.04s/.28alpha。源第二个小白核光池由命中内核表达，不另拆系统。
本次为“真实播放验证 + 本地Editor基线已测版”，不是作者Unity视觉已验收或目标设备预算通过版。
后续由作者在公共工作场景验收两版，若调整继续保留现有手调、使用新版本或Variant，不自动重建覆盖。
