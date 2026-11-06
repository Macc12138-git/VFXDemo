# BuildFX · 制造装配闪爆

## 选择与放置

使用 `Prefabs/BuildFX.prefab`。将根节点放到制造位置，根节点是效果底部中心。
特效不含角色、工具或迫击炮本体。
`Prefabs/BuildFX_V1.prefab` 是保留的旧版；日常使用请选择默认 `BuildFX.prefab`。

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
- 烟团：`01_Smoke/SmokeRandom` 是一个原生粒子系统，不再逐个摆放 Puff 子节点。
  Shape → Position / Scale 调整局部 XY 出生范围；Emission → Bursts 调三轮数量范围和时间。
  Main → Start Size / Rotation 调大小和角度范围，Start Lifetime 的双曲线控制前长后短的寿命范围；
  Color over Lifetime 调浓度/淡出，Size over Lifetime 调膨胀，Velocity over Lifetime 调漂移和上升，
  Noise 调轻微不规则运动。保持 Shape 的 Z 厚度、Z 速度和 Z 噪声为 0，以保留平面表现。
  Renderer → Meshes 中三种静态烟形随机选用，不是帧动画。
- 闪片：Main 和 Size over Lifetime 调尺寸，Color over Lifetime 调闪现/消失。
- 星点/碎屑：`05_SparksAndChips` 的 Emission → Bursts → Count、Main → Start Size / Lifetime；
  Velocity / Force / Rotation over Lifetime 调运动。
- 微光：`00_Glow/SoftGlow` 的 Main → Start Color 中的 Alpha 调透明度，
  加法材质的 Glow Intensity 调亮度。

## 独立调色

默认版本使用 `V2/Materials/` 中的两个材质：

- `BuildFX_Alpha.mat`：Smoke、Flash Main、Flash Highlight、Sweeping Arcs、Stars、Chips
  分别控制烟、闪片主色、闪片高光、白弧、星点和碎屑；各颜色的 Alpha 可单独控制该部分透明度。
- `BuildFX_Additive.mat`：Glow 与 Glow Intensity 控制微光颜色和亮度。
- Overall Tint / Opacity 是相应材质的整体乘色；局部调整应优先使用上面的分区颜色。
- 每个粒子的 Main → Start Color、Color over Lifetime 仍会与材质颜色相乘，
  可用于少量色差和淡出。白色表示不额外偏色。

无需重画纹理即可把黄色闪片改为蓝色等其他色相，高光也可独立保留或换色。
修改共享材质会影响所有实例；只调整某个实例的配色时先复制两个材质，再赋给对应 Renderer。

## 随机变化与复现

烟、星点和碎屑开启 Auto Random Seed，重新播放时允许不同分布。
循环展示中的随机序列仍由引擎管理，不保证每一轮都产生独立 seed。
需要稳定对照时，在相应 Particle System 关闭 Auto Random Seed，填写相同 Random Seed；
日常使用恢复 Auto Random Seed 即可，不需要脚本。

一次性 Prefab 的粒子寿命曲线按 1.2 秒 Duration 编排，展示实例已对应调整到 1.6 秒。
修改 Duration 或 Burst 时间时，应同步检查 Start Lifetime 曲线及最后一轮的收尾，避免留下余烟。

粒子系统和材质已序列化保存，使用时无需 Build 菜单、Editor 脚本或自定义调参窗口。
