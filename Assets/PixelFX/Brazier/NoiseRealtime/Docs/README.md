# 噪声火焰使用说明

打开 `Assets/Scenes/VFXWorkbench.unity`。以下资源路径相对于 `NoiseRealtime/`。

- `Prefabs/BrazierNoiseRealtime.prefab`：完整火盆、火焰、火星、余烬、轻烟和光晕。
- `Prefabs/BrazierNoiseFlameRealtime.prefab`：独立火焰，根节点放在模型火口。
- 点击 Unity 的 Play，或使用选中粒子系统后的原生播放预览。

## Inspector 调参

| 要调整的表现 | 位置 |
| --- | --- |
| 火舌密度、拉伸、翻卷、侵蚀、柔边和颜色层次 | `Materials/Flame.mat` 的 Scale、Stretch、Distortion、Dissolve、Softness、Core、Steps |
| 火焰速度 | Flame 材质 Flow；同时将 Core 的 Main Duration、Start Lifetime 和 Custom1.x 曲线终值设为 `8 / Flow` |
| 火星、余烬数量 | `02_Sparks` 下对应系统的 Emission |
| 火星飞散方向、速度和长度 | Shape、Velocity over Lifetime、Noise，以及 Renderer 的 Stretched Billboard |
| 烟量、浓度、扩散 | `03_Smoke` 的 Emission、Color over Lifetime、Size over Lifetime 和 Velocity over Lifetime |
| 光晕强度、范围 | `04_Glow` 的 Start Color Alpha、Start Size，或 Glow 材质 Tint |
| 次级粒子整体速度 | 各系统的 Main > Simulation Speed |
| 朝向 | Renderer > Render Alignment；默认 View，Allow Roll 关闭 |

改小 Emission 后，已有粒子会按寿命自然消失。需要立即重播时使用原生 Stop/Restart。
完成调整后保存 Prefab Overrides 或 Variant；材质只需改当前实例时先复制。
