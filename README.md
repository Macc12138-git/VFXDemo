# VFXDemo

基于 pixelfx 的特效创作与 Unity 原生粒子展示工程。

- `Tools/PixelFX/`：工程内独立可编辑的 pixelfx 源码、绘制库、画廊与导出工具。
- `.agents/skills/vfxdemo-pixelfx/`：特效制作、预览及授权迁移工作流。
- `Assets/PixelFX/`：Unity 特效资产、编辑器工具与展示场景。

工作流：制作与预览 → 作者验收 → 明确授权导入 Unity → 分层导出、原生粒子组装与验证。
验收通过不等于导入授权。

## 特效工作台

需要 Node.js 18+，在项目根目录运行：

```sh
node Tools/vfx.mjs doctor
node Tools/vfx.mjs serve 8086
```

打开 <http://127.0.0.1:8086/gallery/workbench.html>。

完整说明见 [VFX_WORKBENCH.md](VFX_WORKBENCH.md)。
pixelfx 来源及许可说明见 [Tools/PixelFX/VENDOR.md](Tools/PixelFX/VENDOR.md)。
