# BuildFX · 制造装配闪爆

## 选择与放置

使用 `Prefabs/BuildFX.prefab`。将根节点放到制造位置，根节点是效果底部中心。
特效不含角色、工具或迫击炮本体。

这是固定局部 XY 平面的 2.5D 效果；从根节点的正面观看。
需要改变整体朝向时旋转根 Transform；尺寸通过根 Transform 的等比 Scale 调整。
斜视会产生平面透视压缩，不是体积烟雾或任意视角的 3D 地面圆环。

## 播放

Prefab 为一次性效果，约 1.2 秒，Play On Awake 已开启。
在 Unity 粒子预览中选中根节点，使用原生播放/重播；运行时可由现有游戏逻辑调用
根 Particle System 的 `Play(true)`，重复使用前先 `Stop(true, StopEmittingAndClear)`。
Prefab 本身不需要任何挂载脚本。

公共工作场景 `Assets/Scenes/VFXWorkbench.unity` 中的 BuildFX 实例为展示用途：
通过原生 Main 模块覆盖为 1.6 秒循环，包含末尾空白间隔。
需要游戏中的一次性效果时，使用 Prefab 资产，不要复制展示实例的循环覆盖。

## Inspector 调参

- 整体尺寸/朝向：根节点 Transform。
- 三次闪爆时机：`02_BackFlashes`、`03_FrontFlashes` 子节点的 Emission → Bursts → Time。
  同步调整 `00_Glow/SoftGlow` 和 `04_Sweeps/GroundAndSideArcs` 的对应 Burst 时间。
- 烟团：`01_Smoke/Puff_*` 的 Main → Start Size、Start Lifetime；
  Color over Lifetime 调浓度/淡出，Size over Lifetime 调膨胀，Velocity over Lifetime 调展开和上升。
- 闪片：Main 和 Size over Lifetime 调尺寸，Color over Lifetime 调闪现/消失。
- 星点/碎屑：`05_SparksAndChips` 的 Emission → Bursts → Count、Main → Start Size / Lifetime；
  Velocity / Force / Rotation over Lifetime 调运动。
- 微光：`00_Glow/SoftGlow` 的 Main → Start Color 中的 Alpha 调强度。
- 整体颜色：Materials 中相应材质的 Tint / Opacity。
  修改共享材质会影响所有实例，只调整某个实例时先复制材质。

粒子系统和材质已序列化保存，使用时无需 Build 菜单、Editor 脚本或自定义调参窗口。
