# LightningNova · 空间雷环命中

2026-11-05，第三个独立案例族。原稿 V1.3，seed69、1.2s，作者明确授权导入。
Unity6000.3.19f1 / URP17.3 / Linear / Metal / Apple M5。本例不是通用JS→Unity转换器。

## 已验证映射

- 2D固定24°投影落到XY，3D保留XZ圆形范围和高低空间穿绕；两份Prefab、每版16原生系统。
- 静态参数Mesh，无纹理/序列帧；Shader从AgePercent/InvStartLifetime得到粒子年龄，不用全局_Time。
- 先导、主雷/补闪、冲击尖芒、三组轨道与光晕由独立Burst/寿命控制；Shader只处理内部路径、通电、热包、烧断和复燃。
- 次级电流、飞散电荷、尾弧按行为分组；原生Shape/随机旋转/寿命/速度/重力/拖曳/Size与Color over Lifetime，不按源粒子身份逐个建节点。
- 四色局部Alpha端点与跨色相、多seed、独层、深浅底色、低角度和俯视实际渲染；真Play验证出生/年龄、.94秒干净尾部、Emission耗尽/恢复、Stop/Play换seed和镜头外返回。
- 本机Editor两轮0/1/8/32同步重叠与8体错峰基线；CPU主/渲染、GPU、粒子Update、GC、UnityStats和资源内存有记录。预算未给，不等于手机或Player通过。
- Frame Debugger官方Enable路径得到单体11、8体88条DynamicGeometry事件；逐事件数据/break reason不可获取，不据代表Renderer推断完整合批关系。

## 本例踩坑与窄范围结论

1. 此版本原生Mesh粒子将Float32 Mesh Color首4字节当UNorm8读取：白色1.0f位模式变成(0,0,128,63)，画面偏蓝偏暗。BakeMesh标量采样定位后改Mesh.colors32，复测恢复。仅作该版本Mesh流的实测注意，不规定全部Mesh必须同格式。
2. Mesh Renderer默认View仍会朝向相机，不能因renderMode=Mesh就声称空间朝向正确。本例改Local并用5/24/60/85°实际渲染确认。
3. 固定步长Simulate会将.112s命中采样落到发射边界。静态改2ms精确小步；真实播放另用暖机后的Stop/Play和实际引擎年龄，不能用Simulate替代真Play。
4. 源sRGB加法与Unity线性alpha不同；本例将预乘后的sRGB光贡献解码一次，恢复Body光池语义，避免大灰白光池盖住细线。不是全效果通用Glow倍率。
5. Newtonsoft不要直接递归序列化Unity Color/Vector属性作为诊断输出；本轮曾触发Editor堆栈溢出。改标量数组并重开同项目，重新核验身份与保存状态。

## 交付边界和证据

实际交付为“真实播放 + 本地Editor基线已测”，Unity最终视觉仍待作者验收。
未验证目标Player Shader变体/设备预算、每Pass GPU/overdraw、精确合批原因和长期池化内存。
原生次级分布、固定透明Mesh排序、弱补闪强度和小白核光池有明确近似，不能声称逐像素重现。

- 完整记录：`VFXWork/Previews/LightningNova/V1.3/effect-record.md`。
- 结构/静态：`VisualAndStructure.json`、2D/3D关键帧和视角图。
- 真播放：`LivePlayback.json`、`Live_Workbench_Observed.png`；以JSON实际引擎年龄为准，不把采样目标标签当作精确捕获时相。
- 性能：`PerformanceRaw.json`、`PerformanceSummary.json`、`PerformanceTable.md`、`FrameDebuggerEvents.json`。
- 保存保护：`SceneFileComparison.json`、`FinalState.json`、`DeliveryManifest.json`。
- 使用：`Assets/PixelFX/LightningNova/Docs/README.md`。
- 实际调用的导出工具：`Tools/PixelFX/tools/export-lightning-native.mjs`；一次性组装/QA代码留Assets外，不是Prefab运行依赖，也不是可覆盖作者手调的一键重建工具。
