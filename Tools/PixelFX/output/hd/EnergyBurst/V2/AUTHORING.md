# EnergyBurst V2 · 近圆形扩散

2026-11-07，作者要求将爆炸改为接近圆形。本轮只修改独立爆炸的形态，保留 V1、已验收的 EnergyCluster V6 及原工作场景，不导入 Unity、不新增 GIF。

## 入口与选定版本

- 独立预览：`/gallery/hd-energy-burst-v2.html`
- 联播：`/gallery/hd-energy-continuity-v2.html`；能量团和爆炸仍是两份独立效果，联播不做叠加或淡变。
- 源码：`src/hd/energy-burst-v2.js`，版本 2.0，选定数据 `final/manifest.json`。
- 数值及图像检查：`tools/check-energy-burst-v2.mjs`，输出 `final/QA/`。

## 本轮变化

主前沿采用径向圆轮廓，小幅起伏，不再作大幅三瓣/多瓣扭曲。角向厚度差缩小。
8 片膜片变短、变窄，放在接近同一扩散半径的位置，朝向贴合圆周，避免长尖片破坏圆形。
12 条碎芒仍存在，但缩短、减弱并收敛到接近一致的到达半径，只略领先前沿。
侵蚀在前半段较轻，主要圆形先读清，再在后半段断裂消散。不是一个完全平滑的硬圆。

保留原来的蓝白配色、亮核、0.82 秒时长和控制项：radius=180、initialSize=28、strength=1、glow=0.65、seed=37。
R 在 UI 中可调 90～240 逻辑 px，主要覆盖范围不超过 R，低强度光不超过 1.08R；它仅是视觉范围，不包含伤害判定。
没有顺带重做起爆尺寸、蓝色内部体积或其他联播连续性问题；本轮是圆形轮廓修订，等待作者验收。

## 表达与资源

沿用一张 256×256 RGBA8 确定性静态噪声：R=粗结构、G=侵蚀、B=备用、A=255。
线性数据、Repeat、Bilinear、无 Mipmap，理论 256 KiB；无新增序列帧。
CPU 参考与 WebGL Shader 同步修改。按独立特效年龄计算，起点 t=0 与 t>=duration 为空。
颜色覆盖与加法光分开；作者显示 RGB 合成，未声称已完成 Unity Linear/HDR 校准。

## render / look / refine

1. `round1/`：收敛主前沿扭曲和角向宽度。实际观察接触图与 WebGL：主环已近圆，但长尖膜片仍单独突出，轮廓语言不统一。
2. `round2/`：膜片缩小、改为切向贴圆周，收敛到达距离；前期侵蚀减轻。观察：圆周明显清楚，长刀片感减少；0.065s 的碎芒仍形成星形尖角。
3. `final/`：碎芒缩短、减弱，并降低领先速度、收敛目标半径。观察接触图与深浅底/小尺寸：起爆到扩散均以圆形读取，后期仍自然断裂，不是完全封闭的恒定圆环。

## 检查边界

`final/QA/report.json`：48672 个主要场样本通过，涵盖 3 种 seed、3 个 R 和 8 个时间点；另验证确定性、全层关闭、强度 0、时长归一化、初始亮核独立、颜色层隔离、半径与首尾空帧。
浏览器用于核验 WebGL 编译、联播与实际画面，静态证据存于 `final/QA/browser-*.png`。
浅色底上的白热层仍偏淡。当前为正面 2D 作者预览，不是任意视角的 3D 球形爆炸。
未修改 Unity 资产、Prefab、场景或项目渲染设置；Unity 实播、批次/合批、CPU/GPU/内存及目标 PC 性能均未测。

保留基线 SHA-256：

```text
3fae51f92d2f11a9cfa446325f7ab87af37e56723500a057dc30e427b1b0b8f7  src/hd/energy-cluster-v6.js
8f779a9affe59a28272438c3142e91d5293f048bd38be4e499d6cad4b49a3007  src/hd/energy-burst.js
d0d1e73523c73b9b6d259ec615d1f2ccb5df68304a1c664c8be087226686c8ad  Assets/Scenes/VFXWorkbench.unity
```
