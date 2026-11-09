# 赛博能量弹

## 预制体选择

- `Prefabs/CyberOrb_ProjectileVisual.prefab`：白热圆芯、单圈浅冰蓝描边、紧凑柔光与短尾。作为实际子弹物体的视觉子节点使用。
- `Prefabs/CyberOrb_Impact.prefab`：独立一次性命中，白蓝瞬闪、四枚短碎芒和快速残尾，约 0.2 秒消失。

公共工作场景 `Assets/Scenes/VFXWorkbench.unity` 中的 `CyberOrb_Demo` 提供子弹放大外观和命中预览。场景实例的循环设置不影响独立一次性预制体。

## 放置与播放

效果固定在本地 XY 平面，+X 为飞行/短尾朝向；旋转整个根节点的 Z 轴改变方向。默认圆芯直径约 0.28 单位，可用根节点 Scale 调整。需要贴近摄像机平面的 2D/2.5D 视角；侧面观察会变薄。

将 `ProjectileVisual` 放到你的子弹物体下，由现有游戏逻辑负责移动和朝向。命中时清除或停用子弹视觉，在接触点播放 `Impact`。这里不附带移动、碰撞、伤害、池化脚本。

短尾是跟随弹头的固定短形，不会记录弯曲轨迹。视觉默认持续循环；快速停用时对整个根节点停用或使用粒子原生 Stop → Stop Emitting and Clear。只停止发射会让已有视觉粒子等待其寿命结束。

## Inspector 调参

- 整体大小/方向：根节点 `Transform`。
- 持续视觉的寿命/循环：`BodyAndWake`、`CompactGlow` 的 Particle System → Main；两者寿命、循环、发射时刻保持一致。
- 单圈描边、白芯和短尾颜色/形状：`Materials/BodyAndWake.mat` 中的 White-hot core、Pale blue outline、Wake / shard cyan、Wake / impact blue、Single outline width、Wake length/half-width/opacity。短尾长度范围为 1.5–2.8R；主体与残尾需要同步修改。
- 柔光：`Materials/CompactGlow.mat` 的 Pale blue outline、Compact glow intensity、Glow outer radius；颜色需要与描边同步修改。也可直接关闭 `CompactGlow` 节点。保持光晕范围小于或等于 1.35R。
- 命中白芯/蓝边：`Materials/ImpactFlash.mat` 的 White-hot core、Wake / impact blue。Main → Start Lifetime 和 Size/Color over Lifetime 控制瞬闪。
- 碎芒：`Shards` 的 Emission → Burst Count、Main → Start Lifetime/Speed/Size、Shape → Arc；材质为 `Materials/Shards.mat`。默认只产生四枚。
- 残尾：`ResidualWake` 的 Main → Start Lifetime、Size/Color over Lifetime 和 `Materials/ResidualWake.mat`。

材质由实例共享，直接修改会影响所有引用对象。只调整某个实例时，先复制对应材质再赋给该实例。不要把材质的 Element role / Destination blend 改成其他用途。

命中的 Flash → Birth 子发射器负责短碎芒与残尾，不要手动增加一份同样的发射。原生 Play/Stop/根节点启停可用于重复使用。
