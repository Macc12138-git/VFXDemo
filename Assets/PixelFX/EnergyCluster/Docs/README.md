# 能量球使用说明

使用 `Prefabs/VFX_EnergyCluster_Loop.prefab`。这是独立循环能量球，不包含爆炸、命中、相机或演示控制器。

## 导入其他项目

此资源使用 URP Shader，需要目标项目已安装并启用 Universal Render Pipeline，不适用于 Built-in 或 HDRP。
当前验证环境为 Unity 6000.3.19f1、URP 17.3.0、Linear 颜色空间；其他版本尚未验证。
通过 Assets → Import Package → Custom Package 导入整个包，保留同目录的材质、Shader 和贴图。
导入后使用 `Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab`。

## 放置与播放

将预制体拖入场景，进入 Play 自动播放；编辑时也可用 Unity 粒子预览。
根节点控制整体位置和尺寸，主体默认单元宽度 2.56 Unity 单位，粒子面向相机。
Halo 的面片为 3.84 单位，预留光晕自然淡出的空间；不要将它的 Start Size 改成其他层的 2.56。
移动根节点即可让整个能量球跟随；没有自动飞行或命中逻辑。
关闭根节点停止显示。回收或重播时，对所有子 Particle System 使用原生 Stop（StopEmittingAndClear）和 Play。

## Inspector 调整

- 整体尺寸：根节点 Transform Scale。
- 播放速度：同时选中五个子节点，在 Main → Simulation Speed 调整相同倍数。
- 图层开关：Volume（体积）、Halo（外光）、Core（亮核）、ShellGlow（贴壳光）、Shell（动画壳层）。
- 体积颜色：Volume 材质的 Body、Inner light；Volume strength 控制强度。
- 亮核：Core 材质的 Core 颜色。
- 壳层：Shell 材质的 Shell highlights、Shell blue、Shell opacity；Shell frame transition 默认 Short。
- 光晕：Halo 与 ShellGlow 材质各自的 Glow 颜色和 Glow strength。两层可分别调节。

材质为共享资源，修改会影响所有引用实例；单独调色先复制对应材质，再赋给该实例。
壳层亮暗颜色的 Alpha 可局部退去相应色阶，粒子 Start Color Alpha 控制整层透明度。
保持各子节点的 Main Duration 为 0.48、Start Lifetime 为 0.50，五层同步；使用 Simulation Speed 变速。
Color over Lifetime 用首尾各 0.02 秒做短交接，Max Particles 为 2，避免循环边界空帧；不要压回 1。
这是循环特效，临时生成的游戏物体需要由项目自身管理停止或回收。
