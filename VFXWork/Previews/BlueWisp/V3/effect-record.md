# BlueWisp V3 · Unity 导入与验证

2026-11-12。作者明确指令：“将该特效导入到unity”。选定输入为当前 V3.0.2；
本次按该指令执行导入，不把它扩展为目标设备性能验收。

## 输入、目标与范围

- Canvas 源码：`Tools/PixelFX/src/hd/blue-wisp-v3.js`。
- SHA256：`5544592adce52f7642784c7fe17f17e54f9862260988012668748cd5e65aa45c`。
- options：radius132、glow0.28，五个原色及六层保持源码默认；无随机项，原生固定 seed13 不改变造型。
- 四个手绘几何姿态各保持 70ms，周期 280ms，不插值、不加整体缩放。
- 显式端点 `http://127.0.0.1:8766/mcp` 验证为 VFXDemo / `Assets/Scenes/VFXWorkbench.unity`。
  默认 MCP 实际指向其他项目，因此只作只读身份核验，未用于写入。
- Unity6000.3.19f1、URP17.3、Linear、Metal、Apple M5。本机 Editor，不是 Player/手机测试。
- 场景相对 Git 已有作者改动；导入前 Editor 场景已保存且不脏。保留相机、已有作品及作者布置。
  `Before.json`、`VFXWorkbench-before.snapshot` 保存导入前状态；导入时 63 个既有组件逐项序列化比对不变。
- 新资源仅位于 `Assets/PixelFX/BlueWisp/V3/`；公共工作场景新增一个实例，最终位置(-6,2.1,0)。
  初放(-4,2.1,0)与已有 CyberOrb 路径接近，复看后只将新增实例左移，既有作品不动。
  不建场景，不更改管线/PlayerSettings，不附加运行时/Editor 脚本，不生成 GIF。
- 游戏平台、预计并发与帧预算未指定，0/1/8/32 仅为探查规模。

## 表达与取舍

| 层 | 静态资源 | 实时/原生职责 | 边界 |
| --- | --- | --- | --- |
| 主形、色块、白核、碎焰 | 同一 Mesh 内四组手工曲线的三角化几何，UV 记录姿态与语义色区 | 原生 Burst=1、Lifetime/Duration=.28s 循环；Shader 按 AgePercent 选择四姿态，非当前姿态退化为无面积三角形 | 没有姿态贴图或整效果帧动画，几何与边缘仍有近似 |
| 微光 | 独立静态 Quad Mesh | 原生循环粒子；Shader 静态径向函数、低强度 Additive | Canvas sRGB 加法与 Unity 线性混合存在微小差异 |

复用真实 `draw()` 捕获曲线、变换及色块绘制顺序，不用近似圆球替代核心。
源像素 100px=1 Unity 单位，源 Y 下转 Unity Y 上；XY 固定平面朝 -Z，不随镜头自动转向。
曲线自适应细分容差 0.18源像素；0.45px 静态边缘覆盖带。源 cyan clip 独立三角化，
其偏差通过同尺度离线图诊断，四姿态全画布超阈值像素比例约0.076%–0.134%，
不是作者视觉通过率。色块 Mesh8208顶点、12178三角形；Glow4顶点、2三角形，资源共享。

Shader 顶点流：Position、Color、UV、UV2、AgePercent。
UV+UV2→TEXCOORD0，AgePercent→TEXCOORD1.x，BakeMesh 数据已核对。
颜色通过 Mesh Color32 与原生 Start Color/Color over Lifetime 相乘；五个语义色独立材质属性。
颜色 Pass 为预乘 Alpha，微光 Pass 为 Additive；同一 Shader、两份共享材质，不使用全局 _Time。

## 验证证据

- `Import.json`：资源、组件白名单、源 hash、Shader 编译支持与既有对象保护。
- `VisualAndStructure.json`：四姿态与回环静态采样、浅深底色、45°、颜色/微光分层，
  五个语义颜色分别 Alpha=0 及跨色相端点均改变有效像素；材质克隆测试后销毁。
- `CanvasUnityComparison.png/json`：同尺度、同锚点、同相位 Canvas/Unity；
  默认前景 RGB 平均绝对差约2.53–2.97/255，主要为抗锯齿和微光差异，不据此替代视觉验收。
- `LivePlayback.json` 与 `Live_Pose1..4.png`：实际 Play Mode 原生年龄推进，四姿态实际渲染；
  Emission 关闭后粒子耗尽，恢复后2粒子；暂停年龄保持、恢复、Stop/Play、根节点重用及镜头外返回。
  测试未用 Simulate/Emit/SetParticles；Edit Mode 静态采样与真实播放分开记录。
- `FrameDebuggerEvents.json`：独立诊断的1实例2条、8实例16条 DynamicGeometry 事件。
  未观察跨实例 Draw 合并；逐事件详细数据不可获取，具体 batch break reason 未确认。
  颜色与光晕 Blend 不同，保留两层及其成本，不以共享材质或 SRP Batcher 声称合成一批。
- 资源内存快照：Mesh820992 bytes，Materials2480 bytes；无贴图，不等于完整系统或总GPU内存。
- 性能表与采样限制见 `Performance.md`，原始与聚合数据见相应 JSON；计时与截图/FrameDebugger 分开。
- `FinalState.json`、`SceneProtection.json`：最终 Edit Mode 场景干净；与导入前快照相比仅新增
  一份 PrefabInstance 和 SceneRoots 引用（58行新增、0行删除），其余原有序列化块不变。
- `SceneLiveVsSaved.json`：位置调整后的延迟未保存标记另行核验，当前与磁盘场景150条规范化
  记录无差异、无新增/删除。仅在本轮 Undo 组名与完全等价条件下结束记录并保存，
  保存后场景SHA256仍与前次完全相同；未清空脏标记或覆盖其他对象的修改。

## 可用性和未测边界

交付为原生播放验证版及本机 Editor 探查基线，Unity 最终视觉仍可由作者继续调整。
目标 Player/图形 API 变体、手机性能、业务并发预算、每 Pass GPU/overdraw、长期池化内存未测。
未发现需要改变已认可主形的性能依据，不为降低系统数而合并不同混合层或重画造型。

使用说明仅放在 `Assets/PixelFX/BlueWisp/V3/Docs/README.md`；源码、导出合同、测试和本记录均留 Assets 外。
本案例可复用的是“真实 painter→静态几何/语义色区→原生年龄时钟→同尺度对照”的方法，
四姿态/70ms 和几何规模只适用于本例；不证明任意 Canvas 代码都能一键迁移。
