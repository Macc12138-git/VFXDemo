# Brazier — Unity URP

> 原生粒子拆层新版位于 `Particles/`，请优先使用 `Particles/Prefabs/BrazierFlameParticles.prefab`。
> 本文以下记录的是旧整幅序列帧版本，保留作对照。

## 预览与使用

- 打开 `Scenes/BrazierShowcase.unity`，切换 Game 窗口，点击 Play。非播放状态也支持动画预览。
- `Prefabs/Brazier.prefab`：完整像素火盆，含铁架、炭、火焰、烟雾、火星、光晕和点光源。
- `Prefabs/BrazierFlame.prefab`：只有火焰、烟雾、火星、光晕和点光源，可放在自己的 3D 火盆模型上。
- 直接将 Prefab 拖到场景中；完整火盆锚点在盆脚，纯火焰锚点在火源底部。
- `BrazierFlipbook` 中可调 Speed、Phase Offset、Billboard、Light Intensity。
- Billboard 在播放时仅绕世界 Y 轴朝向相机。这是用于 3D 场景的 2.5D 序列帧，不是可俯视任意角度的体积火焰。
- 展示场景中的石台仅供展示，不属于纯火焰 Prefab。

## 导入规格

90 帧 / 30 FPS / 3 秒循环 / 单帧 112×148 / 32 像素每单位。
两张无损图集分别承载 straight-alpha 颜色和 additive RGB 光效。
网格 10×9；每格 116×152，含 2px 外扩；图集 1160×1368。
颜色图使用 sRGB 导入；光效图关闭自动 sRGB 转换，由 Shader 在线性工程中显式解码，避免光晕过曝。Point / Clamp / 无压缩 / 无 Mipmap / 不缩放 NPOT。
两个 Renderer 分开绘制，避免 URP 多 Pass 限制；使用 MaterialPropertyBlock 同步帧号，不复制材质。
原始元数据位于 `Textures/*.json`，接触表位于 `Textures/*_Preview.png`。

工具菜单：`Tools > PixelFX > Brazier`。组装只写本目录，不覆盖 SampleScene，不改工程渲染配置。
`Assemble Prefabs and Showcase` 会重新生成本目录中的 Prefab、材质、网格和展示场景；自定义前请复制。
`Validate Current Assembly` 检查 Shader、Prefab 引用及图集导入，结果写到 Library。

## 来源

pixelfx `fire/brazier`，https://github.com/patch-gg/pixelfx ，MIT。
火焰算法改编自 Hugo Duprez / Sprite Fusion： https://www.spritefusion.com/pixel-art-vfx/fire 。
原始许可证见 LICENSE.txt。
