# Brazier 高清手绘与噪声火焰：初步验证案例

2026-11-05 制作记录与本地报告核验。此处总结已发生的工作，不是授权重新执行 Build。
作者对视觉与制作方式满意；这是一个案例族的多版探索，不足以证明所有特效都能转换。

当前所有版本复用 `Assets/Scenes/VFXWorkbench.unity`。历史独立场景与 Editor 组装/QA
脚本已按作者指令清除；下列报告仍保留采样当时的路径，不当作新的播放或性能测试。
日常使用只需 Prefab、材质和原生 Inspector，操作说明位于各版 `Docs/README.md`。

## 从需求到两种实时表达

先理解作者提供的 EffectDissolveDistort：UV 扭曲与噪声阈值溶解。
该 Shader 不自动提供手绘火舌轮廓、温度色带或粒子运动；这些需要单独设计。
沿用 Brazier 作为参考，先在 pixelfx 进行高清手绘创作、至少三轮动态观察迭代；
只有明确导入指令后才建立新的 Unity 目录，不覆盖旧 InspectorParticles 与手调场景。

### A. 高清手绘轮廓版

- 真源：`Tools/PixelFX/src/hd/brazier-handpainted.js`，version 3 / seed 8，4s 循环。
- 11 根不同高度/宽度/弯曲的火舌，保留手绘色带和笔触；根部少扰动、上部侵蚀/翻卷。
- 三轮主要修正：并排细火舌和过满盆沿 → 主形错落/火口连接 → 干笔边缘和低透明烟。
- 导出：`Tools/PixelFX/tools/export-hd-brazier-realtime.mjs`，19 张独立静态 PNG。
  单根火舌静态笔触通过 GPU 解析轮廓变化；没有火舌动画帧。
- Unity：`Assets/PixelFX/Brazier/HandPaintedRealtime/`。
  参数已保存在 Prefab 与材质中，不依赖历史组装/QA 工具；
  `Shaders/BrazierHandPaintedRealtime.shader` 处理轮廓、扭曲、侵蚀与干笔边缘。
- 完整版/独立火焰版为 18/17 个 ParticleSystem（包含无发射根入口），11 个主火舌粒子。
  次级运动由原生模块承担，Custom1 数据供 Shader 使用；无挂载运行脚本。

已有证据（工程根相对路径）：

- [结构](../../../../VFXWork/Previews/Brazier/HandPaintedRealtime/Structure.json)：19 张静态图、组件/依赖检查通过。
- [真实播放](../../../../VFXWork/Previews/Brazier/HandPaintedRealtime/LivePlayback.json)：
  核心 11 粒、时钟推进、火星位移；原生火星 Emission 关闭-耗尽-恢复为 14 → 0 → 11。
- 画廊 `/gallery/hd-brazier-unity.html`，原稿 `/gallery/hd-brazier.html`。

### B. 单张噪声火焰 + 两张次级贴图

作者随后提供灰度图，希望以材质参数得到更像火焰的表现；满意后要求增加火星/烟雾，
最后明确要求导入 Unity。它是新一轮表达选择，不是把 A 版简单减层后的等价优化。

- 真源：`Tools/PixelFX/src/hd/noise-brazier.js` version 4、`noise-brazier.frag`、
  `noise-brazier-secondary.js`，seed 8。采用当前预览“旺盛翻卷”参数：Flow 1.45，
  基础周期 8s / 实际核心周期约 5.517s。完整参数在导出 manifest。
- 保留原始 `FlowNoise.png` 1024²，SHA256
  `325b9dffbe60f65fbade5c83c4239a5e3bf6a09da0113e53a7f3508810b6e50d`。
  多速率上移/纵向拉伸 → 慢噪声扭曲主 UV → 连根多峰遮罩 → 阈值侵蚀 → 温度色带。
  浏览器实际编译 WebGL 片元 Shader；CPU reference 只做审稿图。
- 在已认可火焰上只增加 `SparkStreak.png` 64² 和 `SmokePuff.png` 256²。
  飞散火星/缓慢余烬由速度、阻力和冷却表现；烟在火焰后上升、转动、扩张、淡出。
  次级层也三轮迭代：消除孤立棉团感、强化侧向火星、减薄上部烟，不遮主火舌。
- 主火焰独立层对 archived version 3 的 7 个时刻做像素回归，浏览器 Shader 未改；
  此项是 pixelfx 内部回归，不等于 Unity 与浏览器逐像素一致。
- `Tools/PixelFX/tools/export-noise-brazier-unity.mjs` 导出共 6 张静态 PNG：上述三张，
  沿用的火盆前/后两层和一张独立 SoftGlow。不是“只有两张运行资源”，也没有烘焙火焰动画。
- Unity：`Assets/PixelFX/Brazier/NoiseRealtime/`；参数已保存在 Prefab 与材质中。
  `Shaders/BrazierNoiseFlame.shader` 移植原稿算法，
  `BrazierNoiseParticle.shader` 采样静态粒子/道具。

| 层 | Unity 实现 |
| --- | --- |
| 主火焰 | 一个原生 burst 粒子；Custom1.x 年龄时钟 + 同一灰度噪声驱动的 URP Shader |
| 快火星 | 原生 Emission + Box + 衰减速度曲线/Noise + 颜色衰减，Stretched Billboard |
| 慢余烬 | 同一静态 stamp，原生慢速度/摆动和尺寸/颜色变化 |
| 轻烟 | 一张静态烟团，原生发射、升力、旋转、扩张和 Alpha 包络 |
| 光晕 | 低强度 Additive 原生粒子，不用 Light |
| 火盆 | 两个普通静态 SpriteRenderer，非 3D 模型 |

完整/独立火焰 prefab 为 8/7 个系统（含根入口），PPU=128，根为火口。
没有 Texture Sheet Animation、Animator、视频或挂载脚本；没有原稿并不需要的子发射器。

已有证据：

- [导出合同](../../../../VFXWork/Exports/Brazier/NoiseRealtime/manifest.json)：源码/helper/Shader/纹理 hash、参数、锚点及近似。
- [结构](../../../../VFXWork/Previews/Brazier/NoiseRealtime/Structure.json)：保存的 prefab 与场景实例组件/依赖通过。
- [真实播放](../../../../VFXWork/Previews/Brazier/NoiseRealtime/LivePlayback.json)：核心 1 粒、原生时钟推进、
  火星位移、烟上升并增大；火星 9 → 0 → 9，烟雾 10 → 0 → 7，关发射后确实耗尽再恢复。
- [材质端点](../../../../VFXWork/Previews/Brazier/NoiseRealtime/MaterialChecks.json)：临时克隆材质的
  dissolve=1 火焰清空；噪声调试层有效。它是 Edit Mode 截图测试，不冒充真实播放。
- [同尺度/同相位对照](../../../../VFXWork/Previews/Brazier/NoiseRealtime/Comparison.png) 与
  [分层/斜视角](../../../../VFXWork/Previews/Brazier/NoiseRealtime/LayersAndOblique.png)。
  图像工具：`Tools/PixelFX/tools/compare-noise-brazier-unity.mjs`。
- `/gallery/noise-brazier-unity.html` 展示真实播放录制与上述对照；GIF 仅审稿，不是运行输入。

## 可迁移经验与适用范围

1. **从实际绘制方法迁移**：主轮廓解析变化适合 Shader，粒子出生/轨迹适合原生模块。
   这验证了两种火焰表达，不证明所有图案都可只调几项噪声参数。
2. **锁定基线再加层**：新增次级层用原始主形独立层回归；新版本和原作者手调隔离。
3. **颜色空间要分来源**：移植时修正过重复线性化导致的灰烟过暗、线性加法光晕过强。
   这个案例的校准数值不能直接作为其他材质的通用乘数。
4. **稳态对比 ≠ 冷启动**：解析循环 t=0 已有前一周期粒子。Edit Mode 对照先暖机；
   真实播放另测自然出生和循环，不用 Simulate 伪造播放。
5. **真实帧推进才能判定运动**：Editor callback 可能在游戏帧前被调用；连续观察引擎帧，
   检查后台暂停并恢复临时设置，不能只拿两次 callback 判失败或手动移动粒子。
6. **时钟/几何合同不可漏**：坐标 Y 翻转、裁切/锚点、颜色空间、Mirror、Custom Data 顶点流、
   Flow 与寿命耦合、streak 长度轴都需要实际验证，不能只编译代码。

## 尚未覆盖 / 不能外推

原生随机出生和 Noise 近似源解析轨迹；随机寿命下用参考寿命速度曲线不逐粒子一致。
A 版静态笔触随轮廓变形，不等于独立重绘；B 版火星高温头部用静态贴图和冷却颜色近似。
原稿与 Unity 线性混合存在小差异；平面道具的斜视表现不等于 3D 火盆。

**两版都没有测得 Batches、SetPass、Frame Debugger 合批机制、GPU 成本或目标设备预算。**
系统数/贴图数下降只是不同实现规模，不构成性能已优化的证据。
也没有证明 Mesh/Trail、地面/命中/投射物、深度/软粒子、池化集成或跨移动 API 的路径。
以后按 [性能验证](performance.md)补测当前案例，按 [案例迭代](iteration.md)吸收新模板，
不能追溯填上“性能通过”或把本案例工具当作通用一键导入器。
