# EnergyCluster V6 — Unity 导入记录

## 授权和目标

2026-11-09，作者明确要求“将能量球导入到unity，爆炸效果不要”。只导入已满意的 V6 灰阶壳层混合版。
目标通过指定 HTTP MCP 8766 读回：VFXDemo / 当前工程 Assets / Assets/Scenes/VFXWorkbench.unity。
Unity 6000.3.19f1、URP PC_RPAsset、Linear、Metal、Apple M5。开始前工程资产和工作场景无未提交修改。
没有操作另一个 Unity 工程。原能量球制作源码、旧子弹/命中和爆炸制作预览不修改。

## 运行组成和取舍

唯一预制体：Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab。
五个原生系统依次为 Volume / Halo / Core / ShellGlow / Shell，各一个共享材质；无运行时或丢失脚本。
体积/核心使用静态径向数据，外光和贴壳光是加法层，壳层沿用作者此前明确选择的 20 帧灰阶与 Alpha 数据。
没有烘焙整效果的新图集，也没有把原球改为爆炸、加入命中或飞行控制器。
壳层 1280×1024 RG16，5×4、单帧 256；静态 profile 256×3 RGBA32。
两张纹理均为线性数据、Bilinear / Clamp、无 mip、不可读写；实际 RG16 支持已核验。
灰阶与 Alpha 在 Shader 中分开重建蓝白颜色，相邻帧先预乘后短过渡。
时钟来自原生 AgePercent / InvStartLifetime，不使用全局 _Time；可原生暂停、重播和变速。
制作源/资源 hash、单位、UV 行序和近似边界见 VFXWork/Exports/EnergyCluster/V6/manifest.json。

Unity 线性混合不等于作者显示空间混合。相同时相/尺度的对照图保存在 Author-Unity-Comparison.png；
.144/.288s 源有效区域 RGB8 平均绝对差约 8.86 / 8.14，形状保持但局部光晕、灰阶和透明边有差别。
这不是逐像素复现，Unity 最终美术仍待作者验收。
壳层为上传参考的近似拆层衍生数据；参考的商用授权未核验。

## 验证和实际修正

- 初次近景捕获发现 Billboard 默认 maxParticleSize=.5 限制半屏大小；改为 1，正常视距与近景均重新观察。
- 原生出生周期和寿命均为 .48、Max Particles=1 时发现交界空帧；单独将上限改为 2 仍不足。
- 最终用 Duration=.48、Lifetime=.50、Max Particles=2，原生 Color over Lifetime 首尾各 .02s 交接。
  实际壳层周期仍是 .48s；最多 10 个原生粒子，通常为 5。交接是小范围实现近似，不产生新造型或新帧。
- 静态 .12/.60s 同相循环对照，RGB 差异阈值检查为 0；检查的是稳定期而非首次淡入与稳态的强行等同。
- 六项语义颜色逐项 Alpha=0 和跨色相克隆材质测试全部产生对应变化；深浅底、分层、游戏尺寸已截图。
- 真 Play：原生出生/年龄、关闭 Emission 后清空、恢复发射、Stop/Play、根启停和离屏返回通过；不以 Simulate 代替真播放。
- 独立 endCameraRendering 连续观察 5 秒、48 个实际主相机渲染帧，跳过最初 .1 秒初始化后最少 5 粒子，无空帧。
  Editor update 是渲染前观察点，其性能原始行中的暂态 0 不等于相机实际绘制为空；连续性以 RenderedContinuity.json 为证。
- BeforeLoopFix 和 BeforeLifetimeOverlap 仅保留修正前诊断，不是用户候选版本，不能当作有效同画面优化基线。

证据：VisualAndStructure.json、LivePlayback.json、RenderedContinuity.json、静态 Unity_*.png、Live_*.png。

## 本地 Editor 性能基线

环境：2340×1080、主正交相机尺寸 4.9、HDR/MSAA 关闭，vsync=0。
实际 Play；0/1/8/32 重叠，各两轮，另 8 体分散；每阶段 .8s 预热 + 2.2s 采样，每隔一引擎帧记录。
最终共 98 个短期样本。采样期间没有截图和 Frame Debugger；数值是含 Editor/UI/探针的全帧开销，不是每个球的成本。
并发数量只是未知业务预算下的探查，样本量小且后台 Editor 节奏较慢，不代表目标 PC Player 性能。

| 实例 | Draw Calls 中位 | Batches 中位 | SetPass 中位 | Main ms 中位 / P95 | GPU ms 中位 / P95 |
|---|---:|---:|---:|---:|---:|
| 0 | 6 | 6 | 6 | 2.642 / 3.102 | 4.870 / 5.962 |
| 1 | 11 | 11 | 11 | 2.883 / 3.193 | 4.912 / 5.171 |
| 8 重叠 | 46 | 11 | 11 | 2.925 / 3.351 | 5.700 / 6.009 |
| 32 重叠 | 166 | 11 | 11 | 3.773 / 4.422 | 6.002 / 8.647 |
| 8 分散 | 46 | 11 | 11 | 3.134 / 3.621 | 4.162 / 6.051 |

Main/Render/GPU、ParticleSystem.Update、GC、资源/全局内存原始值见 PerformanceRaw.json / PerformanceSummary.json。
GC 包含 Editor 和探针，不能作为效果自身的 GC；短期全局内存波动不是长期池化泄漏证据。
纹理 payload 为 2,624,512 bytes；本机 Profiler.GetRuntimeMemorySizeLong 合计 5,250,816 bytes，
两者不同口径，不把 RG16 原始容量或磁盘 YAML 大小当作实际 GPU 内存。

最终 Frame Debugger 单体与 8 体均读取到 5 条 DynamicGeometry 元数据，单体标识对应五层。
逐事件原生详情不可获取；多体 Stats Draw Calls 仍随实例增加，不能据事件组数/Batches 推断已合并为 5 次 Draw。
相同材质、不同角色/Blend/排序的五层保留其视觉顺序，不为数字强制合并。
当前证据没有显示需要牺牲表现进行额外结构重建；本轮修正解决循环正确性，不宣称性能优化收益。

交付级别：真实播放 + 本地 Editor 短期基线。未测：PC Player Shader 变体、目标显卡与业务预算、每 Pass GPU/Overdraw、
精确批次合并/拆分原因、长期池化和回收内存。不宣称生产性能已达标。

## 场景与交付边界

公共工作场景只新增本预制体实例，位置 (0,-1.4,0)，不创建/复制新场景。
已有 Main Camera 和 CyberOrb_Demo 的状态、变换、组件不改；Before.json 和 .snapshot 为制作备份。
使用说明只保留选 Prefab、播放和 Inspector 调参，位于效果 Docs；本记录、来源和验证留在 Assets 外。
不创建演示预制体、特效 Editor 菜单或运行时控制器；不导入爆炸。
