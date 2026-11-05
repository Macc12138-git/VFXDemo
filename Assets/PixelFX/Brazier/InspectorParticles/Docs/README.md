# 原生像素火焰使用说明

打开 `Assets/Scenes/VFXWorkbench.unity`，将所需预制体拖入场景。
以下资源路径相对于 `InspectorParticles/`。

- `Prefabs/BrazierInspectorParticles.prefab`：带火盆的完整效果。
- `Prefabs/BrazierInspectorFlameParticles.prefab`：独立火焰，根节点放在模型火口。
- 点击 Unity 的 Play，或使用粒子系统自带的 Play/Restart。

## Inspector 调参

展开 `Firemouth - fixed anchor`，选择具体子粒子系统：

| 分组 | 调整位置 |
| --- | --- |
| `01_Flames/Tongue_*` 核心火舌 | Main、Emission > Burst、Texture Sheet Animation |
| `01_Flames/Puffs_*` 火团 | Emission、Main Lifetime、Shape、Velocity、Sub Emitters > Death |
| `01_Flames/Licks_*` 脱落火舌 | Emission、Main Lifetime、Shape、Velocity |
| `02_Sparks` 火星与余烬 | Emission、Velocity、Noise、Color/Size over Lifetime、Renderer |
| `03_Smoke/Rising smoke` 主烟 | Emission、Velocity、Size/Color over Lifetime |
| `03_Smoke/SpentSmoke_*` 死亡转烟 | 对应火团的 Death 链接与概率，以及烟系统的 Lifetime、Inherit Velocity、Force、Noise |
| `04_Glow` 光晕 | Start Color Alpha、Start Size、Color over Lifetime |

朝向使用原生 Renderer > Render Alignment = View，Allow Roll 关闭。
核心、火团和烟雾使用单粒子图集；调整寿命时同时检查 Texture Sheet Animation 的播放。
保留 Puffs 与 SpentSmoke 的子发射链接。完成后保存 Prefab Overrides 或 Variant。
