# 蓝色光球 V3

## 放置与播放

将 `Prefabs/VFX_BlueWisp_V3_Loop.prefab` 拖入场景，点击 Play 即可循环播放。
公共工作场景 `Assets/Scenes/VFXWorkbench.unity` 已放置一份，名称为 `VFX_BlueWisp_V3_Loop`。
也可选中该节点，使用 Unity 粒子系统原生预览的 Play / Pause / Restart。

这是固定 XY 平面的特效，默认朝向 -Z 镜头，碎焰朝右；不自动朝向摄像机。
用根节点 Transform 调整位置、旋转和整体缩放，子节点 MicroGlow 一起跟随。

## Inspector 参数

- **整体大小**：根节点 Transform → Scale。
- **播放速度**：同时选择根节点和 MicroGlow，调整 Particle System → Main → Simulation Speed。
  默认每姿态70ms、四姿态280ms循环；建议通过 Simulation Speed 一起变速。
- **循环与时长**：两处 Main → Looping / Duration / Start Lifetime。
  默认 Duration 与 Start Lifetime 都是0.28；手改时保持二者一致，且父子系统同步，避免周期空隙或相位错开。
- **独立调色**：根节点 Renderer → Material → `BlueWisp_Colors`，调整 Deep blue edge、Blue interruptions、
  Cyan body、Pale cyan shapes、Left white nucleus。颜色的 Alpha 可隐藏对应色区。
- **整体颜色/透明度**：Main → Start Color；它会乘到所有色区，独立换色优先使用上面的材质颜色。
- **微光**：MicroGlow → Renderer → `BlueWisp_Glow` 的 Glow strength / Glow color。
  不需要微光时停用 MicroGlow 子节点。
- **暂停与重新开始**：使用根节点粒子系统的原生播放控制，包含子系统；不要用改变 Duration 代替暂停。

## 注意事项

材质为共享资源，修改会影响所有引用实例。仅改单个实例时，先复制相应材质再赋给该实例。
主形与微光分别使用 Alpha / Additive 混合，保留两份材质。
保留 Mesh 与 Renderer 的 Vertex Streams；高级 Shader 选项 Static glow geometry 和 Destination blend
分别对应两种材质用途，通常不需要调整。
特效本身只有原生粒子及渲染组件，不依赖脚本、Animator、外部控制器或 Build 菜单。
