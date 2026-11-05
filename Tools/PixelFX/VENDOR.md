# VFXDemo 内置 pixelfx

本目录是从本地 pixelfx checkout 复制的独立可编辑工作副本，不是 Unity runtime package。
上游：`https://github.com/patch-gg/pixelfx`，package 0.3.0，基线 commit
`a84159688af3ca37a4be05a0d422b94451b2e24e`。
2026-11-05 同时保留了本工程会话中的未提交扩展：高清青蓝斩击、Brazier 单粒子导出器等；
不能把这些扩展声称为该上游 commit 自带。

保留 LICENSE 与 NOTICE.md，以及源码中的归属。上游的 Patch Pixel 字体声明为
All rights reserved，不在 MIT 内；本副本不包含该字体二进制，画廊改用系统等宽字体。
保留原始字体 NOTICE 说明来源差异。没有复制 .git、node_modules 或编辑器插件配置。

本地集成改动：

- `tools/serve.mjs` 只监听 loopback，避免将制作库暴露到局域网。
- `gallery/workbench.html` 为 VFXDemo 入口；`style.css` 移除私有字体引用。
- `tools/export-brazier-inspector.mjs` 为本案例的 native staging 适配器。
- 单粒子导出器增添 `--inspector` 火星图案分支，保留默认旧版导出结果；避免重复运行时
  先写旧竖向纹理再覆盖，保持未变文件的时间戳。
- 高清预览产物及已验收 Unity 动画保留为本地参考，不代表已导入新的效果。

`tools/export-brazier-unity.mjs`、`export-brazier-particle-stamps.mjs` 是之前试验工具，
不作为默认原生粒子交付路线。主入口和项目 skill 采用 Inspector-only 方案。

后续在此目录创作；不会自动改写或同步桌面上原 pixelfx 项目。更新上游应先查看本地修改，
不能直接覆盖本工程扩展或作者已验收的稿件。
