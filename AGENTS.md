# VFXDemo 制作约定

这是特效制作与展示工程。使用项目内的 pixelfx 创作工具，不依赖桌面上的另一份 checkout。

涉及制作、预览、修改 pixelfx 特效，或把已通过的效果导入 Unity 时，先完整阅读
`.agents/skills/vfxdemo-pixelfx/SKILL.md`，再按任务阶段读取其中链接的参考。
该 skill 可以按任务自动使用，也可明确调用 `$vfxdemo-pixelfx`。

流程必须区分两次决定：

1. 作者验收 pixelfx 中的特效表现。
2. 作者明确下达该特效的“导入 Unity”指令。

“满意”“通过”“效果不错”不等于导入授权。没有第二步，留在制作/预览阶段，
不创建或修改 Unity 的资产、预制体、场景。不要把准备好导入或工具可用视为授权。

Unity 迁移默认采用原生 Particle System 的可视化模块；效果预制体及其子物体不挂
运行时脚本，不用隐藏控制器代替模块。编辑器工具可生成序列化配置、校验和截图，
不能成为效果的运行依赖。现有已验收版本和作者手工调整应保留。

用户快速入口：`VFX_WORKBENCH.md`。工具入口：`node Tools/vfx.mjs help`。

若发现 `.codegraph/`，理解和定位代码时先用 CodeGraph；否则不自行创建索引。
