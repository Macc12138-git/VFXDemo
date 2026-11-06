# 雷霆环爆

## 选择和播放

- `Prefabs/LightningNova_2D.prefab`：固定 XY 平面投影，适合正视相机。
- `Prefabs/LightningNova_3D.prefab`：圆环在 XZ 平面展开，闪电沿本地 +Y 下劈，可绕视角查看。

把 Prefab 拖到需要的落雷点，根 Transform 原点就是命中锚点。默认一次播放，周期 1.2 秒，各子系统开启 Play On Awake；进入 Play Mode 自动播放。可通过启停整个根对象重播。不要只播放空的 `Playback` 子节点，它不负责驱动其他系统。

公共场景 `Assets/Scenes/VFXWorkbench.unity` 已放入左侧 2D、右侧 3D 两个展示实例；展示实例循环周期为 1.9 秒。3D 展示实例为便于当前正视相机观察而倾斜，Prefab 自身保持正常世界朝向。不要将展示实例的倾斜直接当作地面放置角度。

## Inspector 调整

材质位于 `Materials/`。每个版本使用一份 Color、一份 Additive 材质；若要统一换色，两份都要调整。共用材质会影响所有引用实例；只改一个实例时，先复制这两份材质并重新赋值。

| 材质参数 | 用途 |
| --- | --- |
| White-hot core | 主雷白热内芯、命中尖芒 |
| Electric cyan | 雷环主体、电流和光池 |
| Cool blue edge | 主雷外缘、雷环冷边 |
| Residual charge | 飞散电荷碎光 |
| Range radius | 环形扩散半径，默认 2.5；不改变主雷高度或原生碎光出生域 |
| Strike intensity | 主雷宽度及命中强度 |
| Additive intensity | 加法光晕强度 |

各颜色 Alpha 可单独关闭该颜色区域，再与原生 Start Color / Color over Lifetime 透明度相乘。保持 Fixed 2D Projection、Light-only Geometry、Destination Blend 及主路径 Seed 的默认配置。

子节点按行为命名：`Leader` 先导、`MainStrike` 主雷、`Restrikes` 补闪、`CrownRelease` / `ImpactRelease` 命中、`OrbitOuter` / `OrbitInner` / `DescendingWhips` 空间环、`SecondaryCurrents` 次级电流、`EjectedCharges` 飞散电荷、`ResidualSnap` 尾部短弧。光晕对应带 Glow、Ground 名称的系统。

- 时序和数量：Particle System → Emission → Bursts。
- 寿命：Main → Start Lifetime。寿命变化会改变 Shader 内部进度；不是整体播放速度。
- 飞散范围和运动：Shape、Velocity over Lifetime、Limit Velocity over Lifetime、Main → Gravity Modifier。
- 碎光淡出：Color over Lifetime、Size over Lifetime。
- 整体尺寸/朝向：根 Transform；推荐等比缩放。
- 循环：各子系统 Main → Looping / Duration 一起调整；Burst 使用秒数，改 Duration 不会自动缩放下劈时序。

## 注意

需要 URP。2D 不是自动朝向相机的 Billboard；3D 地面环无需挂朝向脚本。不要修改 Renderer 的本地空间对齐或自定义顶点流，否则会破坏年龄驱动形变。主环采用固定路径，次级电流与碎光启用 Auto Random Seed；重新播放可以变化，不承诺每个循环重新换 seed。

效果本身不包含相机、灯光或播放脚本。静态网格经 Shader 变形，剔除 Bounds 已留余量；超大幅度改变尺寸/路径时，应检查镜头边缘是否被剔除。
