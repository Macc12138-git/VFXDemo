# BuildFX V1 · Unity 导入记录

2026-11-05。作者明确要求“以后不生成 GIF，接下来导入到 Unity，文件夹命名为 BuildFX”。
交付级别：原生可播放版、本地 Editor 基线已测；不是目标设备预算通过版。
本次没有生成 GIF，也没有覆盖原有作品或修改全局渲染设置。

## 锁定输入与边界

- 原稿：`Tools/PixelFX/src/hd/mortar-assembly.js`，v1 / seed 22，未修改。
- SHA256：`c8d6914c4d583d5481b7e9d927f2d3c6acb7bcf4d0ae54ce693446d97fe032aa`。
- 原画布 1024×768，锚点 (512,594)，128 pixels/unit；一次性 1.2s。
- 三次脉冲 0.16 / 0.50 / 0.71s。无角色、道具、炮体或背景。
- Unity 资源只在 `Assets/PixelFX/BuildFX/`，按 Textures / Materials / Shaders / Meshes / Prefabs / Docs 分类。
- 唯一场景 `Assets/Scenes/VFXWorkbench.unity`；新增实例位置 (-7,-1.3,0)。
  原有 Brazier 两实例、相机及其布置保留，见 `Import.json`。
- Prefab 一次性；场景实例通过原生 Main 覆盖为 1.6s 循环，含空白展示间隔。
- 未提供业务并发、目标设备及帧预算；1/8/32 仅本机探查。

## 实现

| 层 | 静态资源和原生表达 | 近似与边界 |
| --- | --- | --- |
| 烟 | 原稿 3 种烟印章、17 个单粒子系统；Burst / 速度 / 尺寸 / 旋转 / 透明度曲线 | 速度积分受实际步长影响；曲线包络近似，不保证每个像素或极低帧率下相同 |
| 前后闪片 | 调用真正原稿 painter，捕获三轮轮廓并三角化为 Mesh；原生尺寸和透明度 | 衰减时用非等比缩放，不是逐顶点重画 |
| 白弧 | 原稿薄带几何，局部 XY Mesh；原生膨胀和淡出 | 静态薄带整体缩放，不逐帧重算曲线/宽度 |
| 星点/碎屑 | 原稿 Mesh；Burst、Box 出生域、速度/力/旋转/尺寸/颜色模块 | 原生 seed 范围，不逐个复制原稿出生抖动和随机身份 |
| 微光 | 原稿径向静态 stamp、独立 additive 材质 | 线性空间不同于 Canvas，最终 Tint Alpha 校准为 0.1 |

一张 1024×512 RGBA32/sRGB 静态 atlas，Bilinear、Clamp、无 mip、无压缩、不可读。
含烟/微光/颜色采样块，不是动画图集；14 个 Mesh、2 个共享材质。
28 个 ParticleSystem 含一个不发射的根入口；27 个可见层系统。
只有 Transform、ParticleSystem、ParticleSystemRenderer，无 MonoBehaviour/缺失脚本、
Animator、Timeline、Light、Texture Sheet Animation 或运行 recipe。
固定 XY 的 2.5D 表达，斜视会压缩，不是体积烟或任意视角的地环。

## 迭代与验证

1. 首轮组装：静态 atlas、轮廓 Mesh 和原生模块。Shader 在 URP/Metal 编译支持。
2. Unity 控制台指出 XYZ 速度模式不一致：将常量零/一变成同类型常量曲线，
   不改变所需数值，连同旋转/尺寸轴一起检查；复测没有运行错误。
3. 同尺度对照三次峰值、烟/闪片/白弧独层、深浅背景、55°斜视、1.19s 尾部。
   将加法材质 Tint Alpha 从 1 降至 0.1，减轻线性空间微光过亮。
   对照图使用固定步长 Edit Mode Simulate，只是静态审稿证据，不冒充真实播放。

证据：`StructureAndStaticVisual.json`、`SourceLeft_UnityRight.png`、`Unity_*.png`。
源/Unity 的烟分布、混合、白弧末端和星点随机轨迹仍有可见差异；不是逐像素复刻。
Unity 原生版最终视觉尚待作者亲自在场景中验收。

真实 Play：`LivePlayback.json`，引擎帧连续推进，时钟/粒子位置/年龄持续推进；
关闭 Emission 后耗尽为 0，恢复后产生新粒子，一次性实例 1.35s 游戏年龄后为 0；
无 Simulate、Emit、SetParticles 或运行时外部调度器。临时后台运行开关已恢复。
`ReusePlayback.json` 另记录暂停、恢复、清空重播、启停、缩放及出入镜探查。

## 本地性能基线

Unity 6000.3.19f1 / URP 17.3.0 / Linear / Metal / Apple M5 / Editor。
采样时 Game View 1648×1028，PC_RPAsset，vSync=0，targetFrameRate=-1。
同一工作场景，临时关闭其他作品，保留相机；每阶段暖机 1.7s + 采样 4.9s，
0/1/8/32 个同步、同位置重叠实例，重复两轮，测试对象已清除、原作品活动状态恢复。
无 Frame Debugger/截图录制混入计时；数据为整帧，含 Editor 与诊断回调成本。

下表为 median / P95，峰值粒子为 max。DrawCalls 和 Batches 均为 UnityStats 原值，
两者口径不同，不用 Batches 冒充实际每 Renderer 提交次数。

| 并发 | 样本帧 | Batches | DrawCalls | SetPass | CPU 主 ms | GPU 整帧 ms | 粒子 Update ms | 峰值粒子 |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: |
| 0 | 5662 | 6 / 6 | 6 / 6 | 6 / 6 | 1.607 / 2.994 | 1.143 / 1.717 | .0017 / .0030 | 0 |
| 1 | 4523 | 7 / 8 | 13 / 25 | 8 / 8 | 1.906 / 3.511 | 1.302 / 2.220 | .0182 / .0327 | 46 |
| 8 | 3474 | 7 / 8 | 62 / 158 | 8 / 8 | 2.511 / 4.538 | 1.714 / 3.012 | .1297 / .2364 | 368 |
| 32 | 2046 | 8 / 11 | 198 / 614 | 11 / 11 | 4.643 / 6.950 | 2.786 / 4.306 | .6192 / .7976 | 1472 |

GC median 约 22–23 KiB/frame，基线同样存在；诊断反射和 Editor 污染，不据此声称特效零 GC。
资产内存：Texture 4,195,200B、Mesh 合计 90,308B、Material 合计 2,400B，
来自 Editor `Profiler.GetRuntimeMemorySizeLong`，不是 GPU 真实驻留或完整峰值内存。
原始 atlas RGBA 数据为 2MiB。未采集长期复用内存趋势。
原始采样、分轮统计、限制见 `PerformanceRaw.json` / `PerformanceSummary.json`。

Frame Debugger 本机 API 可加载，但两轮限时异步捕获与即时 Render 均未得到事件。
因此实际 Renderer/Pass 合批、拆批原因仍未确认，不能用同材质、SRP Batcher 或统计计数器
代替逐事件证据。没有开启项目 Dynamic Batching 或宣称合成一批。

本次保留必要分层和透明顺序，无算法性能优化 A/B。微光校准在计时后，几何/Shader/纹理/
系统拓扑不变，但不宣称校准有性能收益。压力并发成本上升，不能推断手机预算通过。
待测：目标设备 Player、变体剔除、准确渲染事件、每 Pass GPU/overdraw、渲染线程及长期内存。

## 交付

使用 `Assets/PixelFX/BuildFX/Prefabs/BuildFX.prefab`，日常调参通过原生 Inspector；
用法仅写在资源内 `Docs/README.md`。无专属 Editor 脚本/菜单或运行依赖。
制作源码/manifest/中间导出和本记录均留在 Assets 外。
以后默认直接查看可播放页面，不再自动生成 GIF；原有 GIF 不删除。
