# Brazier 使用说明

1. 打开 `Assets/Scenes/VFXWorkbench.unity`，点击 Unity 的 Play。
2. 将所需版本的 `Prefabs/` 中的预制体拖入工作场景；不带火盆的版本放在已有模型的火口。
3. 选中粒子子节点或材质，在 Inspector 中调整。日常使用不需要 Editor 脚本或工具菜单。

| 版本 | 适合的用法 | 说明 |
| --- | --- | --- |
| NoiseRealtime | 噪声火焰、火星与轻烟；材质和原生粒子调参 | [用法](../NoiseRealtime/Docs/README.md) |
| HandPaintedRealtime | 手绘火舌、实时扭曲溶解；材质和原生粒子调参 | [用法](../HandPaintedRealtime/Docs/README.md) |
| InspectorParticles | 像素风火焰、Death 子发射烟雾；原生粒子调参 | [用法](../InspectorParticles/Docs/README.md) |
| Particles | 早期静态贴图粒子版 | [用法](../Particles/Docs/README.md) |
| AnimatedParticles | 保留源事件时序的旧版 | [用法](../AnimatedParticles/Docs/README.md) |
| Flipbook | 整幅序列帧版 | [用法](../Flipbook/Docs/README.md) |

需要直接调整原生发射量、寿命和轨迹时，使用前三个版本。
调整场景实例后，通过 Prefab Overrides 保存到预制体，或创建 Variant 保留独立参数。
材质是共享资源；需要只改变某个实例时，先复制材质再赋给该实例。
