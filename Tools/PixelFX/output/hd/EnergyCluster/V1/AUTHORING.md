# EnergyCluster · V1 制作记录

状态：Canvas 动态美术原稿，等待作者验收；未授权导入本效果到 Unity。

## 选定输入与目标

- 作者输入：`codex-clipboard-5032fe0e-6c69-4a34-aec3-1bf80ddefba3.gif`，793×793、20 帧、40ms/帧。仅作为视觉参考，未将其作为运行贴图。
- 方向：独立悬浮的白热核心 + 蓝青能量体积 + 不规则白蓝流动壳 + 少量短促电弧。
- 平台：沿用 PC 目标。预计同屏数量、游戏内实际尺寸和运行预算尚未指定。
- 不增加：角色、道具、场景、飞行拖尾或命中爆炸；不修改既有 CyberOrb。

## 源码与复现

- 源码：`Tools/PixelFX/src/hd/energy-cluster.js`。
- 预览：`http://127.0.0.1:8086/gallery/hd-energy-cluster.html`。
- 选定版本：V1.0，seed=37，options 见 `round-3/report.json` 的 `meta.options`。
- 源码 SHA256：`c20c6070ea7314114fc57079781dec498dd3094feb46e6848381c9993338cee9`。
- 时间：纯时间函数，4 秒完整周期；所有形变与电弧事件均周期化。页面速度独立控制时间，不改变几何。
- 颜色、覆盖和加法光分离；亮核、内青、主体蓝、白蓝壳、电弧可分别替换颜色。
- 层级：core / volume / shell / arcs / light，均有可见开关。
- 允许变化：同 seed 可复现；不同 seed 改变壳层形态、放电位置与时机。不锁定未来 Unity 中的逐粒子身份。
- 艺术不变量：稳定圆亮核、球形体积、厚薄变化的破碎壳片、间歇短放电；无刚性金属环或长尾。

## 三轮 render / look / refine

1. `round-1`：观察到球形和核心可读，但壳线过细；逐片绘制留下抗锯齿接缝，像编织网。光晕默认取景有裁切，检查未通过。
2. `round-2`：加宽、变化壳片厚度；连续闭合多边形替代独立四边形消除细缝；外围从等宽线改为破碎膜片，降低外层蓝的不透明度；收小预览比例保留完整光晕。默认边缘检查通过，深浅、暖底与缩小尺寸可读。
3. `round-3`：增加短而渐尖的翻卷壳边、电弧分叉和局部不同步形变；保持稳定亮核及稀疏短放电。完成游戏尺寸与背景检查、真实页面播放/暂停、亮壳定格、分层和柔光调节；页面新增高呼吸参数的自适应取景，避免裁边。

每轮保留 source snapshot、contact、hero、transparent、background-scale；没有生成新的 GIF。
`round-3/report.json` 记录最终离线检查。`reference-contact.png` 是作者参考的静态采样，不是新效果序列帧。

## 验证范围与边界

- 已测：3 seeds × 120 times 的有限坐标及默认取景透明边缘、确定性、循环端点与近接缝、5 层开关、13 参数、加法光与颜色覆盖独立。
- 可播放浏览器中观察了壳层运动、电弧显隐；核对亮壳定格 0.330s、壳层独立关闭与恢复、浅底和柔光归零。
- 小尺寸展示为名义 96/64/40px 球体主体，外放电弧和柔光不计入主体直径。
- 本次所有新增内容在 Assets 外；不创建 Unity 资产、预制体、场景、脚本或 Shader。
- Canvas 8-bit 合成不是 Unity 线性/HDR 结果。没有 Unity Shader、真实 Play Mode、DrawCall、CPU/GPU/内存或 Player 性能结论。
- 后续明确获准导入后再确定静态数据素材、实时 Shader 和原生粒子/几何分工，不把整个预览烘焙为运行帧动画。

## 检查命令

`node Tools/PixelFX/tools/check-energy-cluster.mjs --canvas-module <已安装的 @napi-rs/canvas 入口> --round round-3`

工具只生成离线审稿 PNG 与 JSON；不会写入 Assets、启动 Unity 或生成 GIF。
