# VFXDemo 特效工作台

这里现在同时包含 pixelfx 的创作工具和 Unity 的原生粒子展示工程，不依赖桌面上另一份 pixelfx。

## 给 Codex 的用法

在 Codex 中打开这个 VFXDemo 工程，直接提出特效需求；项目 AGENTS 会指向本地 skill。
也可以显式说：

> 使用 $vfxdemo-pixelfx 制作一个蓝白色冰霜爆发，独立特效，不带人物。先给我动态预览。

根据预览继续提修改意见。你说“满意/通过”之后，AI 应停在创作验收完成状态。
只有你再明确说：

> 将刚才通过的冰霜爆发导入 Unity，使用原生 Particle System，预制体不挂脚本。

才开始分析组成、分层导出、原生粒子组装和 Unity 对比验证。
自动使用 skill 并不等于自动授权迁移；浏览器预览也不会触发 Unity 导入。

## 本地工具

需要 Node.js 18+。基础库创作、PNG 渲染与画廊无需安装 npm 包。

```sh
node Tools/vfx.mjs doctor
node Tools/vfx.mjs list fire
node Tools/vfx.mjs render fire/brazier --no-actor
node Tools/vfx.mjs check fire/brazier
node Tools/vfx.mjs serve 8086
```

预览工作台：<http://127.0.0.1:8086/gallery/workbench.html>。
在 Codex 中要求“打开 VFXDemo 特效工作台预览”即可使用内置浏览器。
服务只监听本机；端口占用时换一个，不会代替你退出其他项目的服务。

新建效果：`node Tools/vfx.mjs new fire/my-effect --loop`，之后由 AI 按需求修改源文件，
渲染/观察/调整，不是输入一条提示词就能由独立 Node CLI 调用模型生成。
AI 的 skill 负责创作判断和代码工作，pixelfx 提供绘制库与可验证工具。
新增/改名后运行 `node Tools/vfx.mjs index` 更新画廊目录，再刷新浏览器。

像素效果在 `Tools/PixelFX/src/fx/`；已有高清独立斩击在 `src/hd/`。
高清浏览器预览无需额外依赖；离线 `render-hd/check-hd` 可选 `@napi-rs/canvas`。
GIF/MP4 导出依赖可选 ffmpeg；macOS 另保留 Swift 预览转换工具。

## 目录与边界

| 位置 | 用途 |
| --- | --- |
| `.agents/skills/vfxdemo-pixelfx/` | 创作/授权迁移 skill、原生模块映射、Brazier 案例和验证记录 |
| `Tools/PixelFX/` | 工程内独立可编辑的源码、库、原版 skill、画廊、工具与许可 |
| `Tools/PixelFX/records/`、`output/` | 创作预览；Unity 不导入这些目录 |
| `VFXWork/Exports/` | 明确授权后的分层中间资源，仍在 Assets 外 |
| `Assets/PixelFX/` | 最终 Unity 资产；编辑器组装，不由 JS 或运行时脚本播放 |

已验证 Brazier 示例可用 `node Tools/vfx.mjs export-brazier` 导出到中间目录；
这不是通用自动转换器，也不会重建现有预制体。迁移其他效果时，AI 仍须分析源码、
编写对应导出/编辑器配置并实际检查。

本次已验收资源：`Assets/PixelFX/Brazier/InspectorParticles/`。
使用其中 `BrazierInspectorShowcase.unity` 播放；已有 3D 模型用纯火焰 prefab。
53 个系统/版本尚未优化；Brazier 的具体层数、率值和图集不作为其他效果的硬性模板。

本次工作台打包不重建、迁移或覆盖已验收效果。来源、局部修改和字体许可说明见
`Tools/PixelFX/VENDOR.md`。原桌面 checkout 保留，后续两份源码不自动同步。
