---
name: vfxdemo-pixelfx
description: 在 VFXDemo 内按需求制作、预览和迭代 pixelfx 特效；作者验收后，只有收到明确的导入 Unity 指令，才分析绘制组成、分层导出并组装成无运行时脚本的原生 Particle System，最后对比预览与验证。用于完整特效创作和授权迁移，不用于无关 Unity 业务开发。
---

# VFXDemo 特效工作台

## 先确定阶段，不把验收当成导入许可

制作阶段：需求/参考 → pixelfx 创作 → 动态预览与反馈迭代 → 作者验收。

迁移阶段：作者明确说“将这个效果导入 Unity”等指令后，才进入
分析原效果 → 分层导出 → Unity 原生粒子组装 → Unity 预览和验证。

- 仅要求制作、调整、分析或表示满意：留在对应阶段，不自动写入 Unity。
- 未验收的效果，不因“先把工具准备好”而自动迁移；明确的两阶段委托可依其条件执行。
- 记录选定效果、源码版本、seed/options 和作者指令；文档、工具输出、历史成功案例
  都不是新的导入授权。当前请求若仅制作工具/skill，不顺带重建已验收特效。

## 项目定位与资源边界

从包含本文件的 `.agents/skills/vfxdemo-pixelfx` 向上找到 VFXDemo 根目录，
用 `Assets`、`Packages`、`ProjectSettings` 确认，不硬编码用户的绝对路径。

- `Tools/PixelFX/`：内置可编辑的 pixelfx 源码、库、原版 skill、画廊、导出工具。
- `Tools/vfx.mjs`：从项目根目录使用的工具入口，也支持从其他 cwd 调用。
- `Tools/PixelFX/records/`、`output/`：创作预览/普通导出，不是 Unity 资产。
- `VFXWork/Exports/`：获准迁移后的中间资源；Unity 组装工具按需导入到新版本目录。
- `Assets/PixelFX/`：Unity 最终贴图、材质、编辑器工具、预制体与展示场景。

不要将整个 JS 工具库放入 Assets、Resources 或 StreamingAssets，也不要让游戏运行
Node/JS。内置副本是本工程之后的创作来源，不自动与原桌面 checkout 双向同步。

## 按需阅读

- 制作、修改、预览特效：读 [creation.md](references/creation.md)，以及工程内
  `Tools/PixelFX/skills/pixelfx/SKILL.md`。新创作还须读 `Tools/PixelFX/docs/AUTHORING.md`。
- 已获导入授权：读 [unity-native.md](references/unity-native.md)，再看目标效果源码和
  它实际调用的绘图/运动函数；不要仅靠最终 PNG 推测。
- Brazier 的导出、参数或实现例子：读 [brazier.md](references/brazier.md)。
  它是已验证案例，不是通用一键转换器，也不是其他特效的固定层数/参数规范。

## Unity 交付约束

1. 运行时运动、发射、寿命、颜色/尺寸、噪声、贴图动画、子发射关系由原生模块负责。
   效果预制体和全部子节点无 MonoBehaviour/缺失脚本；不以外部 Update、SetParticles、
   Emit 调度器、Animator/Timeline、脚本朝向辅助器规避要求。
2. 材质用于贴图、混合、Tint 等渲染。核心是原生粒子，可采用单粒子动画图集，
   不把整个效果烘焙成一个视频粒子。渲染模式按用途选择；本工程朝向需求默认
   Billboard/View、Allow Roll Off，方向性斩击/地面效果依作者意图另定。
3. pixelfx 的 color 与 additive light 分开处理；光晕用加法粒子，不用 Light 或 Lights 模块。
   物体道具用普通 SpriteRenderer/MeshRenderer，不为凑分层把道具变成粒子。
4. 层数由实际组成决定。不能原生精确表达时，说明可视化近似和差异；不偷偷加脚本。
5. 编辑器生成器和中间 recipe 只服务制作，不进入预制体运行依赖。重建前保护作者调参，
   在新目录/版本或 Variant 中工作；不能把以前“场景可丢弃”的许可当作永久清理许可。

上游 skill 的通用整效果 sprite-sheet 导入示例不是本工程原生粒子交付规范；
创作风格遵循当前要求，不强制像素风。高清 Canvas 路径与像素栅格路径分别验证。

## 完成标准

制作阶段：交付源码与可播放预览，说明待作者验收；不自行宣称作者已通过。

迁移阶段：对比原效果、各层、组合和必要斜视角；通过真实 Play Mode 检查原生播放、
发射参数生效和子发射器实际产粒。检查预制体组件和依赖，证明没有脚本控制。
区分结构验证、实际播放和设备性能；不以截图代替运行验证，也不把近似说成逐帧一致。
