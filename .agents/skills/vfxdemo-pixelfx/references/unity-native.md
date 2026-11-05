# 明确授权后的分层迁移

## 0. 固定批准的输入与实际目标

在人的导入指令覆盖的范围内操作。记录被验收的源码、seed、options、尺寸、fps、
循环周期和文件 hash；若随后改了视觉，区分新稿和已验收稿，不默默替换输入。

检查项目路径、Unity 版本、渲染管线和现有改动。连接 Editor 后读回
Application.dataPath、productName、activeScene；多项目时不使用未验证的默认 MCP。
对脏场景先保护或征询，不默认清空。只访问作者指定工程。

## 1. 从实际绘制组成推导粒子，不是把图分成几张

读目标模块及其 helper。区分纯时间函数 `draw(p,t,o)` 与 `create/update/draw` 模拟；
前者的 cycle/looped/seeded births 也可能是解析粒子，并不表示只能做整效果 flipbook。

建立实际组成到模块的映射，记录：发射率/时间或 burst、寿命分布、出生域、初速、
重力/拖曳、尺寸/颜色/透明度包络、轨迹噪声、冷却或死亡后继、绘制顺序、blend。
先标记哪些形变属于单粒子内部图案，哪些属于发射器和粒子的运动。

| 原始行为 | 优先采用的原生表达 |
| --- | --- |
| 持续出生、爆发、延迟 | Emission Rate/Burst、Duration/Loop/Start Delay |
| 出生范围 | Shape、子节点 Transform；移动解析出生点可近似成可编辑出生域 |
| 速度、加速度、阻力 | Start Speed、Velocity/Force/Limit Velocity over Lifetime、Drag |
| 尺寸、冷却、透明度 | Main 随机范围、Size/Color over Lifetime，或已烘焙的单粒子包络 |
| 单粒子轮廓复杂形变 | 透明单粒子图集 + Texture Sheet Animation |
| 随机摆动/风 | Noise、速度曲线；与源正弦/RNG 的差异需说明 |
| 生命周期结束变为另一种粒子 | Death Sub Emitter、概率、继承速度/属性 |
| 发光 | 低强度加法粒子，与普通 Alpha 粒子分材质 |
| 道具、模型 | 普通 SpriteRenderer/MeshRenderer，不强行粒子化 |

涉及源坐标 x 右/y 下时，位置和速度均换为 Unity y 上；定义 pixelsPerUnit，
尺寸、速度和加速度都按比例换算。对曲线，明确其横轴是粒子归一化年龄还是系统时间。
随机寿命 + 固定参考寿命曲线属于近似，不能称为解析原样重现。

## 2. 导出合同

在 Assets 外编写/运行效果专用 exporter，复用真正的 helper draw，不用近似圆点替换
已被作者认可的核心形状。每张图表达单粒子/独立元素，不烘焙道具+火焰+烟+光为整段电影。
普通整效果预览图允许用于比较，不能冒充最终核心粒子资源。

输出 PNG 与仅供制作的 manifest/recipe。至少明确：来源 hash、options/seed、
单位比例、锚点、帧宽高、列行数、有效帧数、帧顺序、fps/生命周期映射、循环模式、
Alpha/Additive、过滤、透明 padding、已烘焙的尺寸/透明度包络及未能还原的部分。

像素资源通常 Point，无压缩/无 mip；高清通常 Bilinear，依用途决定。图集单元尺寸
一致，边缘留透明区，检查锚点和 Unity UV 行序。不要再叠加同一组已烘焙的衰减包络。
不重写未变文件时间戳，避免 Unity 无谓重导入；不要在 Unity 截图时重新导出整批贴图。

## 3. 编辑器组装，原生运行

只在授权的新版本目录导入所需资源。用 Editor-only 工具把参数写入序列化模块，
运行时不读 JSON/源事件表、不播放 JS、不逐帧修正粒子。工具可重用，但不是挂载组件。

示例组件白名单为 Transform、ParticleSystem、ParticleSystemRenderer、普通道具渲染器；
按实际必要性审查额外原生组件，不能放入自定义脚本、缺失脚本或隐藏外部驱动。
本工程光晕不使用 Light、Particle System Lights。材质只承担必要渲染。

朝向在 Renderer 配置。Billboard/View + Allow Roll Off 可用于摄像机正向效果；
Stretched Billboard 的纹理长度轴必须实测，Brazier 用 texture X。不能为了修朝向
再挂 facing helper 或每帧旋转整个布局。锚点固定在模型火口/技能出生点。

不要覆盖旧版或作者调参；明确“重新 Build 会覆盖该版本生成的参数”，需要时先做 Variant。

## 4. 验证与交付

- 比较原稿、核心单层、次级层、组合和必要镜头角度，在同一尺度/时相观察。
  保留实际改进记录；迁移不是承诺每条随机轨迹或线性色彩混合与源逐像素相同。
- 同时检查保存的 prefab 和场景实例：无 MonoBehaviour/缺失脚本、无运行 recipe、
  无旧版本控制器依赖；导入过滤/压缩、材质混合、排序和朝向正确。
- 真正进入 Play Mode，观察运动、出生和循环；临时改变原生 Emission，等待旧粒子耗尽，
  再恢复并观察新粒子，证明 Inspector 参数有效。只在 Play Mode 测试，不保存临时改动。
- 子发射器必须实际产粒，而不只是序列化链接存在。检查概率、位置、速度继承与模拟空间。
- 输出本地动态预览、对比图、目标 prefab/scene 路径、差异与测试结果。
  性能需另测，不把 Editor 粒子数或桌面截图当移动端性能保证。

无法原生表达的行为先说明取舍；不把工作变成脚本控制版本后仍称“原生可编辑”。
