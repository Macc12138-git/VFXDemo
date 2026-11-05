# 整幅序列帧版使用说明

打开 `Assets/Scenes/VFXWorkbench.unity`，将本版 `Prefabs/` 下的预制体拖入场景。

- `Brazier.prefab`：完整火盆，根节点在盆脚。
- `BrazierFlame.prefab`：独立火焰，根节点在火源底部。
- 点击 Unity 的 Play 播放。

## Inspector 调参

在根节点的 `BrazierFlipbook` 组件调整：

- Speed：播放速度；Phase Offset：起始相位。
- Billboard：绕世界 Y 轴朝向相机。
- Light Intensity：本版点光源强度。
- Preview In Editor：编辑状态预览。

整体大小使用 Transform Scale。保留 Color Layer、Glow Layer 和贴图引用。
本版为整幅序列帧，不能逐层调整粒子；需要原生粒子调参时使用同族其他版本。
完成调整后保存 Prefab Overrides 或 Variant。
