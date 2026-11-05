# 手绘火焰使用说明

打开 `Assets/Scenes/VFXWorkbench.unity`，将所需预制体拖入场景。
以下资源路径相对于 `HandPaintedRealtime/`。

- `Prefabs/BrazierHandPaintedRealtime.prefab`：带静态火盆的完整效果。
- `Prefabs/BrazierHandPaintedFlameRealtime.prefab`：独立火焰，根节点放在模型火口。
- 点击 Unity 的 Play，或使用粒子系统自带的播放预览。

## Inspector 调参

| 要调整的表现 | 位置 |
| --- | --- |
| 火舌整体大小、数量和循环 | `01_Core` 下各系统的 Main、Emission |
| 火舌轮廓 | 对应核心材质的 `_TongueShape` |
| 扭曲、溶解、边缘笔触 | 核心材质的 `_DistortStrength`、`_DissolveAmount`、`_BaseDissolve`、`_TipDissolve`、`_Soft_Dissolve`、`_InkWidth`、`_InkRoughness` |
| 核心循环时长 | 同步修改 Main Duration、Start Lifetime、Custom1.x 曲线终值及材质 `_LoopDuration` |
| 脱落火舌和火星 | `02_Detached` 下对应系统的 Emission、Velocity、Noise、Size/Color over Lifetime |
| 烟量与扩散 | `03_Smoke` 的 Emission、Velocity、Size/Color over Lifetime |
| 光晕强弱与范围 | `04_Glow` 的 Start Color Alpha、Start Size、Color over Lifetime |
| 朝向 | Renderer > Render Alignment；火星使用 Stretched Billboard |

保留核心 Renderer 的 Position、Color、UV、UV2、Custom1XYZW 顶点流，
以及 Custom Data 中用于粒子年龄的 Custom1.x；它们供材质计算动画。
完成调整后保存 Prefab Overrides 或 Variant；材质需要独立变化时先复制。
