# 迫击炮制造 · 独立装配闪爆 / v1

仅重建用户提供 GIF 中的特效，不含角色、工具、炮体、背景或固定地面投影。
作者已明确要求导入 Unity，Unity 资源根目录为 `Assets/PixelFX/BuildFX/`。
本目录保留已选定的 Canvas 原稿，原生粒子版通过公共 VFXWorkbench 场景查看。

## 原稿与播放

- 源码：`src/hd/mortar-assembly.js`，`draw(ctx, timeSeconds, options)`。
- 高清逻辑画布：1024 × 768；根锚点：(512, 594)，X 向右、Y 向下。
- seed：22；版本：v1；60 fps 时间轴；一次性 1.20 秒，首尾全透明。
- 原 GIF：400 × 200、25 帧、约 1.03 秒。烟雾约 0.065 秒开始；
  爆闪起点 0.16 / 0.50 / 0.71 秒，峰值约 0.21 / 0.54 / 0.75 秒。
- 参考 GIF 结束时仍有余烟，本版延长少量淡出到 1.20 秒，保证独立特效干净结束。
- 页面重播间隔 0.40 秒属于审稿工具，不属于特效本身。

启动本工程 `node Tools/vfx.mjs serve 8086`，打开
`http://127.0.0.1:8086/gallery/hd-mortar-assembly.html`。
可以逐帧、慢放、拖动时间轴、切深浅/暖色/透明棋盘背景，独立开关六层。

## 分层和参数

烟团：新绘制的三种静态柔边噪声印章，解析位置、尺寸和透明度；不是烟雾帧动画。
爆闪：新绘制的不规则黄白多边形，后侧闪片→烟团→前侧闪片，三个脉冲独立消失。
白弧：断开的扁椭圆扫掠和不对称的侧边薄尾迹；没有完整魔法阵。
星点：少量十字/菱形火星，短距离抛散。
碎屑：少量灰白多边形，旋转和抛物线运动，晚于爆闪退场。
微光：独立低强度暖色层，可独立导出检查。

默认参数见 `meta.options`；`flash` 调闪片幅度，`smoke` 调烟团浓度，`glow` 调微光。
`layer` 可选 combined / color / smoke / flash / arcs / sparks / debris / glow；
`layers` 对象可按名称分别禁用。任意时间重绘不依赖先前帧，seed 控制随机变化。

## 渲染与检查

```sh
node Tools/vfx.mjs render-mortar-assembly --canvas-module /已有/canvas/index.js
node Tools/vfx.mjs check-mortar-assembly --canvas-module /已有/canvas/index.js
```

只使用已有 @napi-rs/canvas，不自动安装依赖。结果位于
`output/hd/mortar-assembly/v1/`。按作者偏好默认通过动态页面验收，不再生成 GIF/逐帧序列；
已有文件保留。透明 PNG 保留完整画布和锚点。
选定版本、options、源码 SHA-256 见历史 `authoring.json`；后续导入授权和映射记录位于
工程根目录 `VFXWork/Exports/BuildFX/V1/manifest.json`。

## 迭代与边界

1. round-1：完成三脉冲时序与六层；观察到硬边烟团像石块、底部尖角过于等距。
2. round-2：烟团改静态柔边噪声印章，闪片改非等距断片，拆出前后关系；
   观察到烟雾内部纹理偏花、脉冲后黄色残影过长。
3. round-3 / 选定 v1：降低烟内细碎对比，缩短闪片退场时间，第二脉冲翻转轮廓；
   检查深浅底、独立分层、首尾透明、边界、确定性与参数响应。

参考是合成后 GIF，被遮挡部分为新绘补全，不声称逐像素复原。
这是 Canvas CPU 创作预览，不是 Unity 窗口直播，也不是体积 3D 特效；
微光的透明 PNG 合成不等于 Unity 线性空间加法。
Unity 检查记录位于 `VFXWork/Previews/BuildFX/V1/`。目标平台、业务同屏数量与性能预算待确定，
本机 Editor 测试不代表真机预算通过。Prefab 的用法见 `Assets/PixelFX/BuildFX/Docs/README.md`。
