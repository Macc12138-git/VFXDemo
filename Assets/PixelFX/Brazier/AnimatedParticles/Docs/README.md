# 源时序粒子版使用说明

打开 `Assets/Scenes/VFXWorkbench.unity`，将本版 `Prefabs/` 下的预制体拖入场景。

- `BrazierAnimatedParticles.prefab`：带火盆的完整效果。
- `BrazierAnimatedFlameParticles.prefab`：独立火焰，放在模型火口。
- 点击 Unity 的 Play 播放。

## Inspector 调参

- 根节点 `BrazierSourceParticles` 的 Playback Speed：整体播放速度。
- Preview Paused：暂停时序推进；Glow Strength：光晕强度。
- 各层材质：颜色、亮度及 Always Face Camera。
- `01_Flames`、`02_Sparks`、`03_Smoke`、`04_Glow`：分别启停对应层。

本版由已有 Runtime 组件按源时序调度，需保留组件与 Source Recipe 引用；
不要通过改 Emission 与它竞争。需要直接在原生模块调整发射和轨迹时，使用
`InspectorParticles/`、`HandPaintedRealtime/` 或 `NoiseRealtime/`。
完成调整后保存 Prefab Overrides 或 Variant。
