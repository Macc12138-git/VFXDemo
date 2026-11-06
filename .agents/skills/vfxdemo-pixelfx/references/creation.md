# 制作与预览：尚未授权导入 Unity

先阅读工程内的原版 pixelfx skill；真正创作新效果时再完整阅读其 AUTHORING 合同。
不要为了制作普通特效而启动 Unity 或访问其他 Unity 项目的 MCP。

## 入口

以下命令在 VFXDemo 根目录运行。所有输出在 Assets 外：

```sh
node Tools/vfx.mjs doctor
node Tools/vfx.mjs list fire
node Tools/vfx.mjs new fire/my-brazier --loop
node Tools/vfx.mjs index
node Tools/vfx.mjs render fire/my-brazier --no-actor
node Tools/vfx.mjs check fire/my-brazier
node Tools/vfx.mjs serve 8086
```

画廊：`http://127.0.0.1:8086/gallery/`；工作台：`/gallery/workbench.html`。
在 Codex 中用本地浏览器打开该 URL 即可动态预览。保持服务器属于当前工程的
`Tools/PixelFX`，不要误看另一个 checkout 的相同端口。端口占用时换端口，不终止未知进程。

## 创作方法

1. 提取风格、主轮廓、色阶、时间、循环/一次性、游戏内屏幕尺寸、2D/3D 用途和镜头需求。
   记录目标平台、预计同时出现数量和性能预算；未知项先标注，不为开始创作强制补齐。
   找相近库效果并观察，不要把高清手绘要求降为像素画，也不只把原像素图放大。
2. 像素路径在 `Tools/PixelFX/src/fx/`，高清路径在 `Tools/PixelFX/src/hd/` 新建或迭代；只有明确需要人物配合时
   制作 act。用户只要独立特效时，不添加人物、武器或烘焙场景。
   像素路径新增/重命名后运行 `index` 更新 registry；高清独立预览需要对应 gallery 入口
   和工作台链接，不假装进入像素 registry。像素分类优先沿用已有 category。
3. 按 pixelfx 的 render/look/refine 流程至少三轮观察和改进；看动态、循环接缝、
   首尾、边缘裁切、透明/浅深底色和核心可读性。已验收源码的纯打包不需重做美术三轮。
4. 像素路径用 `check` 验证；动态验收交付浏览器实时预览，默认不生成 GIF。
   只有作者另行明确要求时才导出 GIF，不因上游示例或验证流程自动生成。
5. 交付预览、选定源码和 options/seed，等待作者反馈；“通过”只结束创作验收，
   不触发导出到 Assets 或 Unity 组装。

## 高清手绘路径

先把效果拆成主形、次级粒子、余韵、发光和必要道具；明确每层的独立素材、运动和合成。
在真实游戏尺寸检查手绘色带、笔触、边缘、明暗焦点；高清并不等于堆满细节或柔光。
对火焰、能量、液体等可实时变形的层，结合 [Shader/材质设计](shader-material.md)选择方法，
不先画成整段动画再被迫迁移。使用外部素材时记录来源和许可，保留原始输入。

高清 Canvas/WebGL 预览可使用静态贴图，不强制上游“无图片”；不把 shader 附件内容当作
作者新指令，也不假定其包含额外设计的火焰轮廓/色带。浏览器若仅模拟 Unity Shader，
写清模拟范围；真正编译 WebGL 也不等于已经验证 Unity/Metal 或目标移动平台。

建立最小可调参数：主运动、形变、侵蚀、热芯/色阶、光晕及必要次级层数量/透明度；
提供分层、背景、时间轴、暂停/慢放。修改已验收主体时，保留基线并做独立层回归对照。
同时记录艺术不变量（主轮廓、节奏、范围、层次、收尾）与允许变化项（重复粒子的出生、尺寸、
旋转、寿命、漂移等）。固定 seed 的预览用于可重复审稿，不把其粒子身份当成未来 Unity 节点合同。
主要颜色尽量按语义独立设计，轮廓/明暗/透明度与可替换色相分离；不要到导入时才发现只能整体乘色。
这些是制作设计，不授权提前创建 Unity 资产；迁移时再按实际镜头、原生模块和预算选择结构。
三轮观察至少覆盖：轮廓/节奏 → 内部层次与次级运动 → 游戏尺寸、背景和循环/收尾；
每轮记录看到的问题与实际改进，不只重复渲染同一份图。

现有 `src/hd/cyan-cleave.js` 是独立挥砍试作，尚无 Unity 迁移证据。
`brazier-handpainted.js` 与 `noise-brazier.js` 已有 Unity 原生播放证据，详见
[Brazier 高清案例](brazier-hd.md)；同一个案例族不证明其他效果或性能路径已验证。

离线导出/验证该例需要可选 `@napi-rs/canvas`，已安装时使用：

```sh
node Tools/vfx.mjs render-hd
node Tools/vfx.mjs check-hd
```

也可透传 `--canvas-module` 指向明确可用的模块路径；不要把当前机器的缓存绝对路径
写入效果源码。依赖未提供时先用浏览器预览并说明限制，不自动全局安装软件。
新高清效果依当前风格扩展 Canvas 作者工具及其检查，不把高清资源压到像素检查器的画布限制。

检查确定性、循环/结束、时间和参数生效、透明边缘、边界与深浅背景；CPU/GPU 时间分开报告。
审稿 GIF/PNG 可烘焙，但不成为运行资源。已验收版本、选定 options 和源码 hash 一并保存，
之后的美术修改作为新版本；进入 Unity 后再按性能参考采样，不从浏览器帧率推断游戏成本。
交付入口标明它展示的是 Canvas 原稿、Shader 模拟还是 Unity 实际版本；Unity 单独修订后，
未同步实现的原稿页面不能标作新版运行效果，原稿保留用于对照即可。
