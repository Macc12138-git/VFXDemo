---
name: vfxdemo-pixelfx
description: 在 VFXDemo 中基于 pixelfx 制作高清手绘游戏特效，迭代动态预览，设计 Shader 与材质，并在作者明确授权后以 Unity 原生粒子及必要渲染组件组装、对照验证和检查批次、合批与性能。也用于依据新增模板和实测证据维护本技能；不用于无关 Unity 业务开发。
---

# VFXDemo · 高清手绘特效制作与 Unity 交付

基于项目内 pixelfx 的“分析参考 → 制作 → render/look/refine”方法，扩展为
高清素材、实时 Shader、材质和原生粒子的协同工作流。保留名称 `vfxdemo-pixelfx` 作为
统一入口，不另建相互冲突的创作/迁移技能。当前有 Brazier、BuildFX 与 LightningNova 三个案例族的初步验证，
不是任意效果的一键转换器；能力与缺口见 [案例与迭代](references/iteration.md)。

## 阶段与授权

作者已指定以后通过预览界面查看动态效果，不再自动生成 GIF。
保留可播放页面及必要静态/数据验证；仅在作者另行明确要求时生成 GIF，已有文件不自动删除。

制作：用途/风格与运行约束 → 分层设计与高清创作 → 动态预览迭代 → 作者视觉验收。

明确获准导入后：锁定输入与目标工程 → 选择 Shader/材质/原生组件分工 → 静态资源导出
与 Unity 组装 → 真实播放和视觉对照 → 批次/合批与性能检查、优化复测 → 交付状态。

- 仅要求制作、调整、分析或表示满意：留在对应阶段，不自动写入 Unity。
- 未验收的效果，不因“先把工具准备好”而自动迁移；明确的两阶段委托可依其条件执行。
- 记录选定效果、源码版本、seed/options 和作者指令；文档、工具输出、历史成功案例
  都不是新的导入授权。仅更新 skill 时不顺带重建资产、打开 Unity 测试或优化已有场景。
- 后续获准导入的工作默认包含本地批次/合批及性能基线检查；发布/安装到设备、修改项目级
  渲染设置或接入业务系统若超出当前授权，先说明所需操作再取得指令，不借优化扩大范围。

## 项目定位与资源边界

从包含本文件的 `.agents/skills/vfxdemo-pixelfx` 向上找到 VFXDemo 根目录，
用 `Assets`、`Packages`、`ProjectSettings` 确认，不硬编码用户的绝对路径。

- `Tools/PixelFX/`：内置可编辑的 pixelfx 源码、库、原版 skill、画廊、导出工具。
- `Tools/vfx.mjs`：从项目根目录使用的工具入口，也支持从其他 cwd 调用。
- `Tools/PixelFX/records/`、`output/`：创作预览/普通导出，不是 Unity 资产。
- `VFXWork/Exports/`：获准迁移后的中间资源；Unity 组装工具按需导入到新版本目录。
- `VFXWork/Previews/<EffectName>/<Version>/`：Unity 截图、录制和验证报告；
  当前 Brazier 的中间导出也按 `VFXWork/Exports/Brazier/<Version>/` 分类。
- `Assets/PixelFX/<EffectName>/`：每个新特效的 Unity 资源根目录；贴图、材质、Shader、
  prefab 等按类型分子目录，版本保留在该根目录内，不含 Scenes 或 Editor 目录。
- `Assets/Scenes/VFXWorkbench.unity`：工程唯一工作场景，所有效果制作、展示和测试复用它。
- `.agents/skills/vfxdemo-pixelfx/`：本工作流及经过核验的案例知识；不是运行时依赖。

不逐特效新建或复制场景。获准导入后按需实例化 prefab，保护既有布置与作者未保存的调整。
不保留特效专用 Editor 脚本、Build 菜单或自定义调参窗口；日常使用和参数调整通过 Inspector。
交付的 Docs 仅说明 Prefab 选择、放置/播放、Inspector 调参和必要注意事项。
技术来源、制作过程与验证记录留在 Assets 外；历史场景及组装/QA 脚本已按作者指令清除。
目录分类与 Assets 外制作资料的归档见工程根目录 `VFX_WORKBENCH.md` 的“目录与边界”；
专属资源不得散落到其他特效目录，共享库/工具保留公共位置。无需追溯搬迁现有作品。

不要将整个 JS 工具库放入 Assets、Resources 或 StreamingAssets，也不要让游戏运行
Node/JS。内置副本是本工程之后的创作来源，不自动与原桌面 checkout 双向同步。

## 按需阅读

- 制作、修改、预览特效：读 [creation.md](references/creation.md)，以及工程内
  `Tools/PixelFX/skills/pixelfx/SKILL.md`。新创作还须完整读 `Tools/PixelFX/docs/AUTHORING.md`。
- 涉及实时形变、噪声、溶解或材质设计：读 [shader-material.md](references/shader-material.md)。
- 已获导入授权：读 [unity-native.md](references/unity-native.md)、Shader/材质参考和
  [performance.md](references/performance.md)，再读目标源码及其 helper；不只看最终 PNG。
- 检查/优化批次和合批：读性能参考；按瓶颈选工具，不用静态组件数代替渲染采样。
- 新模板加入、复盘或更新技能：读 [iteration.md](references/iteration.md)，用
  [效果记录模板](assets/effect-record.template.md)记录适用边界和证据。
- 高清/噪声 Brazier 的已验证映射与踩坑：读 [brazier-hd.md](references/brazier-hd.md)。
  旧像素/单粒子图集版本另见 [brazier.md](references/brazier.md)，不是当前默认方案。
- 短爆发、独立调色、受控随机烟雾和 Editor A/B 案例：读 [buildfx.md](references/buildfx.md)。
  该例的具体合批机制和目标设备预算尚未验证。
- 空间细雷环、原生年龄驱动参数 Mesh、顶点流与线性光校准案例：读 [lightning-nova.md](references/lightning-nova.md)。
  该例的 Unity 最终视觉、精确合批原因及目标 Player/设备预算仍待验收。

## 实现选择与交付约束

1. 每层分别决定“画什么、怎样变、怎样运动、怎样混合”。优先静态手绘/噪声素材 + 实时
   Shader + 原生 Particle System；需要几何轮廓时可用原生 MeshRenderer、粒子 Mesh/Trail
   等适配表达。不能把 Brazier 的粒子层数、参数、Shader 或 2D 朝向作为通用模板。
   从创作时就区分艺术不变量、独立调色项和允许随机变化的范围；Unity 迁移保留表现目标，
   不照搬固定 seed 下的逐粒子节点。配色设计见 Shader/材质参考，行为分组、随机范围与
   时钟映射见原生迁移参考；两者都须通过 Inspector 调整并实际验证，不能仅暴露整体 Tint。
2. 发射、寿命、轨迹、尺寸/颜色包络和实际需要的子发射关系交给原生模块；UV 流动、内部
   轮廓形变、侵蚀与着色交给 Shader。默认非序列帧；不能用整效果视频/图集替代制作。
   确实需要单粒子序列帧时先解释必要性并获得明确许可；已有旧图集案例不构成许可。
   静态素材合图用于减少纹理切换，不等于播放动画序列，但仍须验证 UV 与透明排序。
3. 效果预制体及其子节点不挂运行时脚本/缺失脚本；不以隐藏外部 Update、SetParticles、
   Emit 调度器、Animator/Timeline、朝向脚本规避要求。若确实需要游戏逻辑驱动移动目标、
   命中或池化，说明集成接口与责任边界，另取授权，不偷偷加控制器。
4. pixelfx 的 color 与 additive light 分开处理；光晕用加法粒子，不用 Light 或 Lights 模块。
   物体道具用普通 SpriteRenderer/MeshRenderer，不为凑分层把道具变成粒子。
5. 复用兼容材质与贴图，尽量用原生顶点色/Custom Data 表达逐粒子差异；是否实际减少批次
   由 Frame Debugger/Profiler 验证，不靠“同 Shader”“SRP Batcher 已开”作推断。
6. 一次性编辑器 API 调用和 recipe 只服务制作，不进入运行依赖或效果目录；不生成持久的
   特效 Editor 脚本。重新组装前保护作者调参，在新版本或 Variant 中工作，使用时不依赖重建。

上游 skill 的通用整效果 sprite-sheet 导入示例不是本工程原生粒子交付规范；
它的无贴图、低分辨率、像素边缘和 CPU 时间阈值也不自动适用于高清路径。
保留其确定性、时间编排、分层与视觉迭代方法，画风和运行预算遵循当前任务。

## 完成标准

制作阶段交付源码、版本/options/seed、可播放预览和迭代结果，等待作者验收。

导入后分别报告：视觉对照、结构/依赖、真实 Play Mode、批次/合批、CPU/GPU/内存、
目标设备预算。子发射器仅在实际设计包含时验证产粒。性能优化后还须重新检查画面和播放。

不得以“显示正常”“系统更少”替代性能验收。未测项目写“未测/待条件”，明确可交付的是
原型、播放验证版还是目标设备预算通过版；缺工具时可以交付已有成果，但不宣称生产性能达标。
当前 Brazier 视觉与原生播放已有证据，渲染批次、合批收益和真机性能仍待补测。
BuildFX V2 的独立调色、多 seed、结构/真实播放及本地 Editor A/B 已有证据；
原生版最终视觉、实际合批机制和目标设备预算仍待验收。
