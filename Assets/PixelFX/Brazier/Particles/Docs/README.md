# 静态贴图粒子版使用说明

打开 `Assets/Scenes/VFXWorkbench.unity`，将本版 `Prefabs/` 下的预制体拖入场景。

- `BrazierParticles.prefab`：带火盆的完整效果。
- `BrazierFlameParticles.prefab`：独立火焰，放在模型火口。
- 点击 Unity 的 Play，或使用粒子系统的原生播放预览。

## Inspector 调参

- 火焰数量、大小和运动：`01_Flames` 各子系统的 Emission、Main、Velocity、Noise。
- 火星数量和轨迹：`02_Sparks` 的 Emission、Velocity、Noise、Color/Size over Lifetime。
- 烟量和扩散：`03_Smoke` 的 Emission、Velocity、Size/Color over Lifetime。
- 光晕：`04_Glow` 的 Start Color Alpha、Start Size，或材质 Brightness。
- 朝向：主材质的 `Always Face Camera`；本版需保留已有 ParticleMaterialFacing、ParticleLayerFacing 组件。

完成调整后保存 Prefab Overrides 或 Variant。需要无桥接组件的原生版本时，使用同族的
`InspectorParticles/`、`HandPaintedRealtime/` 或 `NoiseRealtime/`。
