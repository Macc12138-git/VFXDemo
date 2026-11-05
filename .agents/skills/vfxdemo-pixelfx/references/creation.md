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

1. 提取需求中的风格、主轮廓、层次、色阶、时间、循环/一次性、3D 中用途和镜头需求。
   找相近库效果并观察，不要把用户的高清手绘要求自动降为像素画。
2. 在内置副本 `Tools/PixelFX/src/fx/` 新建或迭代源文件；只有明确需要人物配合时
   制作 act。用户只要独立特效时，不添加人物、武器或烘焙场景。
   新增/重命名后运行 `index` 更新静态 registry，再刷新画廊；仅创建 JS 文件不会
   自动出现在画廊。优先沿用已有 category；新分类还需维护 `src/fx/categories.js`。
3. 按 pixelfx 的 render/look/refine 流程至少三轮观察和改进；看动态、循环接缝、
   首尾、边缘裁切、透明/浅深底色和核心可读性。已验收源码的纯打包不需重做美术三轮。
4. 像素路径用 `check` 验证；明确说明 ffmpeg 不可用时 GIF/MP4 可能未生成，
   浏览器实时预览仍可用，不能给出不存在的动画链接。
5. 交付预览、选定源码和 options/seed，等待作者反馈；“通过”只结束创作验收，
   不触发导出到 Assets 或调用 Unity Build 菜单。

## 高清手绘路径

工程已包含 `src/hd/cyan-cleave.js` 和 `/gallery/hd-cleave.html`，浏览器 Canvas
动态预览不需要安装 Node Canvas 包。它是本工程此前的独立高清试作，不代表每种
像素效果都能无损一键变高清，亦未验证过原生粒子迁移。

离线导出/验证该例需要可选 `@napi-rs/canvas`，已安装时使用：

```sh
node Tools/vfx.mjs render-hd
node Tools/vfx.mjs check-hd
```

也可透传 `--canvas-module` 指向明确可用的模块路径；不要把当前机器的缓存绝对路径
写入效果源码。依赖未提供时先用浏览器预览并说明限制，不自动全局安装软件。
新高清效果依当前风格扩展 Canvas 作者工具及其检查，不把高清资源压到像素检查器的画布限制。
