# CyberOrb V3.2 · Unity 导入记录

2026-11-07 后续调整：依作者“演示预制不需要”移除 `CyberOrb_Shot.prefab` 及场景实例 `CyberOrb_Demo/NativeFlight_ToImpact`。当前仅交付 `CyberOrb_ProjectileVisual`、`CyberOrb_Impact`，两者、共享材质、Mesh、Shader及剩余场景组件均未修改；使用说明同步更新。删除前保留可恢复快照于 `VFXWork/Backups/CyberOrb/V3.2/RemoveDemo-2026-11-07/`，结果见 `DemoRemoval-2026-11-07.json`。以下为导入时的历史验证记录；其中 Shot 相关样本、脚本和哈希不代表当前交付资源，未重写或重新生成历史证据。

日期：2026-11-06。作者明确指令：`导入到unity`。

## 输入、范围与环境

- 锁定最新浅色单圈描边与小范围光晕稿：`Tools/PixelFX/src/hd/cyber-orb-v3-2.js`，版本 3.2.2。
- 源码 SHA256：`2c2c883a4a53931d287b4a32b7b0729ce421bb08723e38a83050ba5644b6450d`。
- `cyber-orb-v3-1.js` SHA256：`4987e9c991270955c18d5528deb01e9582ade69c4a76a3876fbaad2312a6231b`。
- `cyber-orb-v3.js` SHA256：`768180dff97adf5fcaab8107745997ea2d1b0c295428de20506473c95403da79`。
- 原稿 options/seed、元素几何和合同见 `../../../Exports/CyberOrb/V3.2/manifest.json` 与 `native-recipe.json`。100 源像素/Unity 单位，XY 平面，+X 向前；半径 14px→0.14 单位。
- Unity 6000.3.19f1 / URP 17.3.0 / Linear / Metal / Apple M5 / 本机 Editor。实际工程 `Application.dataPath=/Users/user/Desktop/VFXDemo/VFXDemo/Assets`，产品 VFXDemo。
- 使用既有 `Assets/Scenes/VFXWorkbench.unity`；导入前场景只有 Main Camera，未恢复作者先前删除的旧展示物。相机和原场景备份见 `Before.json`、`VFXWork/Backups/CyberOrb/V3.2/VFXWorkbench-before.snapshot`。
- 原场景备份 SHA256：`4f3964be0cf5b1c6589b903f09561917e998a6c01595a0a9c3bf987243cdb11f`。与 Git HEAD 的既有差异属于作者，不作回滚。
- 最终 Shader、材质、Mesh、Prefab、使用说明的 SHA256 见 `AssetHashes.sha256`。
- 资源仅新增于 `Assets/PixelFX/CyberOrb/`；制作脚本、导出和验证全部留在 Assets 外。旧稿及其他特效保留。
- 目标设备、业务 FPS/预算、正常并发未知；1/8/32 仅为探查，不是推荐数量或验收上限。未构建、安装或修改项目全局渲染配置。

## 原生实现与近似

| 层 | 素材/Shader | 原生模块 | 差异与约束 |
| --- | --- | --- | --- |
| 白芯、单圈浅蓝描边、单短尾 | 一个静态元素 Mesh，解析遮罩/渐变，预乘 Alpha | 单粒子，4s 寿命/循环，局部 XY | 尾长 2.8R、宽 .63R；固定弹头局部短尾，不记录弯曲轨迹。核心呼吸幅度 .008，原生粒子年龄驱动 |
| 紧凑柔光 | 独立静态 Mesh + Additive，强度 .55、外径半径 1.35R | 与主体同发射/寿命 | 非真实 Light，无全局 Bloom；Canvas sRGB 加法与 Unity Linear 有校准差异 |
| 命中瞬闪 | 实际源 drawImpact 轮廓导出的双层四芒 Mesh | .085s 寿命，Size/Color over Lifetime | 蓝边白芯，非序列帧；曲线采样近似原解析包络 |
| 四枚短碎芒 | 原生 Stretch Billboard + 菱形解析材质 | Birth 子发射，Burst4，左半圆出生、.13–.18s、3.3–4.5 速度、原生减速和收缩 | 保留紧凑左偏爆发，非固定 seed 逐碎片复刻；交付 shards Auto Random Seed 开启 |
| 残尾 | 静态短尾 Mesh + 同源颜色函数 | Birth 子发射，.035s，X 线性/Y 平方根收缩与 Alpha 淡出 | 约35ms收尾 |
| 飞行→命中示例 | 复用以上资源 | 速度 X12，寿命 .5s，Death→Impact→Birth 子发射器 | 不做碰撞、伤害或目标跟踪。游戏宿主移动 ProjectileVisual，命中时播放 Impact |

- 2/3/5 个 Particle System 分别对应 ProjectileVisual/Impact/Shot。只含 Transform、ParticleSystem、ParticleSystemRenderer；无运行时/缺失脚本、Lights、Animator、Timeline、纹理或图集。
- 4 个元素 Mesh，5 个共享材质，1 个 URP Shader。没有动画纹理或纹理采样，元素为静态几何 + 实时 Shader。
- 颜色材质 `_Core/_Outline/_Rim/_Trail` 独立可调，原生顶点色与 Alpha 继续相乘。Glow 单独 `_Glow/_GlowRadius`，角色和 Blend 不应任意互换。
- 顶点流：Position / Color / UV / UV2 / AgePercent / InvStartLifetime；TEXCOORD0.xy=逻辑坐标、.zw=元素标记/UV2，TEXCOORD1.xy=归一化年龄、寿命倒数。无全局 `_Time` 调度。
- 普通色材质 Blend One / OneMinusSrcAlpha，光晕 One / One；ZWrite Off，Cull Off，透明队列。静态 Mesh 的边界限制尾长 Inspector 最大 2.8R，光晕最大 1.35R。
- Prefab 自身：视觉4s循环，Impact .2s非循环，Shot 1.1s duration/非循环、飞行寿命.5s。展示场景仅将 Impact 改为1.1s循环、Shot 主体和光晕循环，不缩放归一化年龄包络或 Burst 秒数。

## 视觉与播放证据

| 项目 | 结论 | 证据 |
| --- | --- | --- |
| 源稿设计 | 保留白圆芯、单浅色描边、小光晕、短尾及短促命中；Unity 最终视觉待作者验收 | 原稿浏览器预览不是 Unity 运行画面 |
| Shader/结构 | Metal 支持，无编译错误；预制体组件白名单通过 | `VisualAndStructure.json`、`Import.json` |
| 深浅底、分层/调色端点 | 通过；核心像素 244/254/255，暗底 8/16/32；四项颜色换色/局部禁用均生效，Glow=0 改变可见像素 | `Flight_Dark.png`、`Flight_Light.png` 与调色采样图片/JSON |
| 静态确定性分时 | .016s flash1/shards4/tail1；.09s仅4碎芒；.21s全空；多seed可见不同分布 | `Impact_16.png`、`Impact_90.png`、`VisualAndStructure.json` |
| 真正 Play Mode | 通过：飞行→Death命中→Birth碎芒，maxShards4、shotHits4；一次性耗尽为0；关闭Emission等待耗尽0，恢复后2 | `LivePlayback.json` |
| 重启/启停/镜头外返回 | 已连续观察真实引擎帧与粒子数据；无脚本逐帧修正 | `LivePlayback.json` 的 restart / root_disable_enable / return_from_offscreen |
| 真正实播截图 | 首轮以 Time.timeScale=.25 观察85ms短闪；实际取样 .02515s / .07504s，随后恢复原速做耗尽与复用测试 | `Live_Workbench.png`、`Live_Impact_Detail.png` |
| 最终保存/清理 | 场景只含 Main Camera、CyberOrb_Demo；相机与原始JSON一致，场景已保存且不脏，背景运行false、timeScale1；无QA节点留存 | `FinalState.json` |

Unity自动将碎芒未使用的Start Size Y/Z曲线模式同步为X的TwoConstants，产生四项实例序列化覆盖。只校正本次Impact/Shot资产中的这些模式，并移除相应冗余覆盖；保留全部43项已保存展示覆盖，不修改可见尺寸范围。修改前另存快照，详见 `SerializationReconcile.json`。校正后重新执行静态分层/参数/生命周期回归，画面及粒子数未变。

补充检查：`git diff --check` 与工具JS语法检查通过。旧创作阶段的 `check-cyber-orb-v3-2.mjs` 默认调用缺少可选 `@napi-rs/canvas`，本次未重跑其Canvas像素断言；该旧检查还锁定“尚未导入”的原场景哈希，不适合作为导入后Unity场景验收。未为此安装包或改动旧检查。Unity结构、调色、分时渲染及真实播放由本目录的独立证据覆盖，不把旧检查报为通过。

静态审稿使用 Simulate .002s 小步推进，以使子发射器几何正确前进；这不是实播验证。实播回调只观察/原生 Stop、Play、Emission、启停，不使用 Simulate/Emit/SetParticles。初次截图错过短闪的取样方案已修正为真实慢放并重测；不把早先空截图当成材质缺陷或有效瞬闪证据。

## 本地性能与批次

性能采样和 Frame Debugger 诊断分开。环境为上述 Editor，Game View 2340×1080，正交4.9，Render Scale1，HDR/MSAA关，vSync0、targetFrameRate=-1；PC_RPAsset 的 SRP Batcher 开、Dynamic Batching 关。未修改这些全局配置。原管线的 SSAO、CopyColor 和 FinalBlit 保留在空场景基线内。

16个阶段：每阶段1.1s暖机 + 3.3s采样，每隔一个真实引擎帧观察；两轮0/1/8/32探查，主体/Shot完全重叠，另测8个主体纵向分散。固定审稿seed42+i×13。计时不截图、不启用Frame Debugger。主/渲染/GPU均为整帧Editor计数器，ParticleSystem.Update也是该marker全局值，不是独立效果CPU/GPU耗时。

| 测试 | 样本帧 | Batches / DrawCalls / SetPass 中位数 | CPU 主 / 渲染 ms 中位数(P95) | GPU ms 中位数(P95) | 粒子峰值 | ParticleSystem.Update ms 中位数(P95) |
| --- | ---: | --- | --- | --- | ---: | --- |
| 无特效 | 32 | 6 / 6 / 6 | 1.306(3.143) / 1.133(3.088) | 2.987(5.446) | 0 | .005(.013) |
| 单个主体 | 33 | 8 / 8 / 8 | 1.339(3.262) / .977(2.556) | 3.134(5.813) | 2 | .019(.040) |
| 单个Shot循环演示 | 803 | 8 / 8 / 8 | .455(1.001) / .628(.815) | .846(1.633) | 6 | .008(.017) |
| 8个主体重叠 | 1249 | 8 / 22 / 8 | .521(.797) / .695(.853) | .927(1.424) | 16 | .010(.015) |
| 8个Shot重叠 | 1214 | 8 / 22 / 8 | .561(.733) / .709(.848) | .951(1.400) | 48 | .030(.041) |
| 32个主体重叠 | 959 | 8 / 70 / 8 | .653(.963) / .739(.932) | 1.012(1.674) | 64 | .029(.042) |
| 32个Shot重叠 | 692 | 8 / 70 / 8 | 1.100(1.924) / .893(1.399) | 1.561(3.077) | 192 | .150(.250) |
| 8个主体分散 | 859 | 8 / 22 / 8 | .797(1.269) / .926(1.377) | 1.252(2.385) | 16 | .014(.024) |

峰值：32 Shot 的 DrawCalls102、SetPass11、Batches9。数据为 `PerformanceRaw.json`、`PerformanceSummary.json`，表中是合并样本帧的统计，不按重复次数等权。

**时序噪声限制：** 首轮各阶段仅16–17个样本，第二轮后半阶段为676–1232个样本；存在Editor后台节流/焦点时序差异。空场景两轮主线程中位数2.634/1.156ms，单主体1.173/2.028ms。不能将表中的“32实例小于基线”解释成负成本，不能通过差分宣布优化收益或低端机适配。该轮仅形成真实计数和带噪声的本机趋势探查，不是有效的同条件优化A/B。

资源：4个共享Mesh运行资源内存9184字节，5个材质6320字节，纹理0；这是资源测量，不含全部粒子缓存、Shader代码、Editor/设备开销。采样期间整Editor分配约340–360MB、保留757MB；GC中位数约9.8–10.1KB/帧，含Editor/UI和临时观察器，不能归因于特效，也不能据“无运行脚本”宣称零GC。长时间对象池、Native/GPU buffer及目标设备内存未测。

Frame Debugger：`FrameDebuggerEvents.json` 中单体和8主体均观察到 Main Camera / DrawTransparentObjects 下的 CompactGlow 与 BodyAndWake DynamicGeometry 代表事件；总事件9，含清屏、SSAO、CopyColor、FinalBlit。单体统计Draw8，8体Draw22。**GetFrameEventData有限尝试未成功**，所以没有逐Draw详情或break reason；两个代表事件不证明16个Renderer合为两次Draw。当前主体与光晕采用不同Blend/材质，保留必要拆分；没有证据宣称跨实例已合批，也没有为降低计数破坏透明排序。

没有发现可凭这轮噪声数据确认的CPU/GPU瓶颈，未进行猜测性结构重构。若业务需要大量同时存活的弹丸，下一步应在实际Player和镜头覆盖下验证逐实例提交与填充，再决定粒子集中发射/游戏宿主等集成方案；本次不擅自接入业务控制器。

## 交付状态

- 可复用 Prefab：`CyberOrb_ProjectileVisual` / `CyberOrb_Impact` / `CyberOrb_Shot`。
- 公共工作场景中新增 `CyberOrb_Demo`：放大外观、命中、原生自动飞行示例。
- 使用说明：`Assets/PixelFX/CyberOrb/Docs/README.md`。无制作哈希或验证报告混入使用说明。
- 未接入业务碰撞、伤害、对象池；目标 Player 的 Shader 变体和设备性能未测。需具体平台、真实并发/覆盖和帧预算才能做目标验收。
- 本次没有更新 skill；仅遵循其原生交付与分层验证要求。
- 本地验证分级：播放验证版 + 本机计数/性能探查已测；Unity最终视觉仍待作者验收，目标设备预算未通过（未提供设备/预算），精确合批机制未确认。
