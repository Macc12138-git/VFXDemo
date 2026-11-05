# 已验收案例：Brazier InspectorParticles

作者于本次对话认可的原生版本，用于说明方法，不把其参数强加给其他特效。

## 工程内的真源文件

- `Tools/PixelFX/src/fx/fire/brazier.js`：主绘制函数、火盆和 11 根火舌的配置。
- `Tools/PixelFX/src/fx/fire/_lib.js`：flameTongue/firePuff/lick/smokePuff、解析运动和 looped。
- `Tools/PixelFX/tools/export-brazier-animated-particles.mjs`：实际单粒子绘制导出器；
  其中事件表只作为编辑器采样分析输入，最终原生版不能运行它的 source scheduler。
- `Tools/PixelFX/tools/export-brazier-inspector.mjs`：本工作台的原生版 staging 包装器，
  修正火星长度轴并补充 Inspector-only manifest。不是其他特效的一键导出器。
- `Assets/PixelFX/Brazier/InspectorParticles/Editor/BrazierInspectorSetup.cs`：已验证的 Editor 组装与 QA。
- 同目录 `Shaders/BrazierInspectorParticle.shader`：无时间动画和朝向控制的 URP 采样混合材质。
- `Prefabs/BrazierInspectorFlameParticles.prefab`：给已有 3D 火盆使用。
- `Prefabs/BrazierInspectorParticles.prefab`：带普通 SpriteRenderer 火盆。
- `Scenes/BrazierInspectorShowcase.unity`：展示场景；`README.md` 提供逐模块编辑位置。

最后四项均位于 `Assets/PixelFX/Brazier/InspectorParticles/` 下。

## 制作原理和 native 映射

源画布 112×148，origin=(56,136)，循环 3s、30fps、seed=8；本例 PPU=32，
源火口 y=-25。全火盆实例将火口上移 25/32，独立特效根节点就是火口。

| 元素 | 源参数 / 已验收表达 |
| --- | --- |
| 核心火舌 | 11 个独立图集；各 64² 单元、90 帧、10×9；单粒子寿命/循环 3s，Size=2，pivot.y=60/64-.5 |
| 火焰团 | 每根 8/s，寿命 .14–.3s；32²、64帧/8×8；可编辑平均火尖 Box 出生域 |
| 脱落火舌 | 每根 4/s，寿命 .26s；24²、64帧/8×8 |
| 快火星 | 左右各 10/s，寿命 .7–1.7；速度+Noise+颜色曲线；原生 Stretched Billboard |
| 慢余烬 | 10/s，寿命 1.1–2.4；速度衰减、Noise、颜色曲线 |
| 主烟柱 | 14/s，寿命 1.6–2.4；32²、64帧/8×8；轻微 Noise |
| 火焰死亡转烟 | 11 组 Death Sub Emitter，概率 .45；寿命 .8–1.4，World 模拟空间，Initial Inherit Velocity .6 |
| 光晕 | 4 个持久加法粒子，半径 87/58/18.56/8px；Color over Lifetime 闪烁；不用 Light |
| 火盆 | 2 个普通 SpriteRenderer；不由粒子模拟 |

总计每个 prefab 53 个 ParticleSystem（含不发射的根控制入口），纯原生 Play/Restart
控制子发射器。不是移动端优化后的预算，不应把 53 设成通用目标。

## 实际踩坑与取舍

- 原版不是一个 Unity PS，而是纯时间/seed 的解析绘制；11 个核心火舌内有逐行噪声形变。
  只用静态火苗贴片丢失这些轮廓。单火舌图集保留形变，原生模块负责生命周期和次级运动。
- 所有火舌图集已烘焙各自偏移且共享火口锚点，不要在节点再叠加 tongue.dx/y。
- 原精确活动火尖用平均出生 Box 近似；正弦和源 RNG 用 Noise/原生随机替代；
  阻力用按参考寿命采样的 33 key 曲线近似。保留这项差异说明，别偷用 SetParticles 校正。
- 火团、脱落火舌和烟雾图集已包含单粒子冷却/尺寸/透明度，不再重复乘同一 envelope。
- Stretched Billboard 长度方向与旧竖向火星 stamp 不同。最终 Spark 为 16² 画布上
  横向 3 白像素，Renderer lengthScale=.65、velocityScale=.01，Size over Lifetime X 收短；
  否则曾出现横向大短条。火星朝向检查必须看实际渲染。
- linear Unity additive 与源 8bit RGB 加法并不等价；亮度和烟火轨迹是近似，不承诺逐帧一致。
- 不创建 Q/W 等易与系统退出/关窗冲突的快捷键；用明确菜单执行。

## 重用与授权

只有明确获准重新迁移 Brazier 时才运行：

```sh
node Tools/vfx.mjs export-brazier
```

输出 `VFXWork/Exports/brazier-inspector/`，不写 Assets、不触发 Unity Build。
本次集成的测试导出只验证工具，不是作者对将来所有效果的导入许可。

现有组装工具的 Art 指向工程内旧的 `AnimatedParticles/Textures`，且 Verify 包含
原机器的绝对路径校验。现有已验收 prefab 不依赖该旧目录或脚本即可运行，
本次打包没有重建它们。需要采用新 staging 或移动工程后重建时，先确认实际 Editor
身份，再在新版本工具中改为读取 staging 并导入必要 PNG；不要直接覆盖旧素材或移除校验。

菜单：Tools > PixelFX > Brazier Inspector Only。Build 会覆盖本版本生成配置；
已有人工调整时先保存/创建新版本。Validate、Capture 和 Verify Live Playback 是 QA。

## 已保存的验证证据

2026-11-05 的本次已验收版本，非当前每次打开都重新验证：

- [结构报告](evidence/brazier-structure.json)：两个 prefab 和实例均无挂载脚本、
  无 Animator、无运行 recipe/旧版依赖，11 组 Death 子发射器。
- [真实播放报告](evidence/brazier-playback.json)：核心 11 粒，Death smoke 49 粒，
  慢余烬 16 → Emission=0 后 0 → 恢复后 18，运动及发射测试通过。
- `BrazierInspectorPreviews/BrazierInspector.gif` 为原生系统采样动画；
  工具画廊 `/output/unity-preview/brazier-inspector.gif` 留有这次结果的浏览器副本。

这些历史证据不能替代修改后的重新编译、Play Mode 与视觉验证。
