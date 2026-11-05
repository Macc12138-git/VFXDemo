# VFXDemo 特效工作台

## 在 Unity 中使用

1. 打开唯一工作场景 `Assets/Scenes/VFXWorkbench.unity`。
2. 从 `Assets/PixelFX/<特效名>/<版本>/Prefabs/` 拖入需要的特效。
3. 点击 Play，或使用粒子系统自带的播放预览。
4. 在 Inspector 中调整粒子模块、材质和 Transform。保存到原预制体或创建 Variant。

现有 Brazier 各版的预制体选择和参数位置见
[Brazier 使用说明](Assets/PixelFX/Brazier/Docs/README.md)。

制造装配闪爆使用 `Assets/PixelFX/BuildFX/Prefabs/BuildFX.prefab`，
放置和原生模块调参见 [BuildFX 使用说明](Assets/PixelFX/BuildFX/Docs/README.md)。

独立火焰的根节点放在模型火口。只调整某个实例的材质时，先复制材质再赋给该实例，
避免影响其他共用实例。效果目录不含场景和 Editor 脚本，使用时不需要 Build 菜单。

## pixelfx 动态预览

需要 Node.js 18+，在项目根目录运行：

```sh
node Tools/vfx.mjs doctor
node Tools/vfx.mjs serve 8086
```

打开 <http://127.0.0.1:8086/gallery/workbench.html>，选择效果查看动态预览。
服务只监听本机；端口占用时换一个端口。
以后默认通过此界面验收动态效果，不再自动生成 GIF；已有预览文件保留。

可以在 Codex 中直接提出制作或修改需求，例如：

> 制作一个高清手绘的蓝白色冰霜爆发，独立特效，不带人物，先给动态预览。

根据预览继续修改。“满意/通过”结束创作验收；只有明确说“导入 Unity”才导入。
导入后仍使用同一个工作场景，并通过 Inspector 调整参数。
