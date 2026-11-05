# Brazier — Inspector-only / no attached scripts

## 中文快速使用

- 打开 `Scenes/BrazierInspectorShowcase.unity`，点击 Unity 的 Play。
- 接入已有 3D 火盆模型：使用 `Prefabs/BrazierInspectorFlameParticles.prefab`，
  根节点放在火盆口；带示例火盆版本为 `BrazierInspectorParticles.prefab`。
- 展开 `Firemouth - fixed anchor`，四个分组分别为火焰、火星、烟雾、光晕。
  选中具体子发射器，在原生 Particle System 模块中调整发射量、寿命、尺寸、
  速度曲线、Noise、颜色与贴图动画；没有运行时脚本回写参数。
- 朝向改用 Renderer > Render Alignment = View、Allow Roll = Off；
  不再保留需要脚本配合的材质朝向开关。火盆本体是普通 SpriteRenderer。
- 这是原生可编辑的近似还原，不是原版逐帧复刻：烟火随机轨迹、光晕合成和
  斜视角下的层间重叠会有差异。每个效果有 53 个粒子系统，尚未做移动端性能优化。
- 编辑器生成工具只在制作和检查资源时运行，不挂载到预制体，也不进入构建。
  手工调好参数后请勿重新 Build 覆盖，可先创建 Prefab Variant。

已验证：预制体及其子节点无 MonoBehaviour / Animator / Light；实际 Play Mode
中 11 根核心火舌正常循环，Death 子发射器生成烟雾；将原生 Emission 从 10/s
改为 0/s 后余烬耗尽，再恢复后重新发射。检查报告保存在 Library 下。

Open `Scenes/BrazierInspectorShowcase.unity`, press Play. The showcase has the full
brazier on the left and the standalone flame on the right. Previous versions remain
unchanged, but are **not dependencies** of these prefabs.

Use `Prefabs/BrazierInspectorFlameParticles.prefab` at a 3D model's firemouth.
Use `Prefabs/BrazierInspectorParticles.prefab` for the included 2D iron bowl/stand.
The bowl is two ordinary SpriteRenderers, never particles.

## Runtime contract

All prefab components are native: Transform, ParticleSystem,
ParticleSystemRenderer, SpriteRenderer. No MonoBehaviour (including facing
helpers), missing script, Animator, Timeline, Update, source-event scheduler,
recipe JSON or per-frame SetParticles/Emit bridge. No Light component or
ParticleSystem Lights module.

The root contains an invisible, non-emitting native ParticleSystem so selecting it
provides Unity's standard particle Play/Restart/Stop controls for its children.
Play On Awake starts all regular emitters. Death sub-emitters do not emit on awake.
This also works in a build without any editor assembly.

## Where to edit in Inspector

| Object under `Firemouth - fixed anchor` | Native controls |
| --- | --- |
| `01_Flames/Tongue_01..11 - animated core` | One particle per 3s loop, Emission > Burst 1, Main > Start Size, Texture Sheet Animation > 10x9 / Lifetime |
| `01_Flames/Puffs_01..11 - tip volume` | Emission 8/s per tongue, Main > Lifetime .14–.3, Shape > Box, Velocity over Lifetime > decay curves, Sub Emitters > Death 45% |
| `01_Flames/Licks_01..11 - tip volume` | Emission 4/s per tongue, Lifetime .26, Shape > Box, Velocity over Lifetime, 8x8 life animation |
| `02_Sparks/Fast sparks - left/right` | Emission 10/s each, Lifetime .7–1.7, velocity curves, Noise, Color over Lifetime, Size over Lifetime > X shortening, Renderer > Stretched Billboard (length .65, velocity .01) |
| `02_Sparks/Floating embers` | Emission 10/s, Lifetime 1.1–2.4, velocity curves, Noise, Color over Lifetime |
| `03_Smoke/Rising smoke` | Emission 14/s, Lifetime 1.6–2.4, Size .7–1.1, velocity curves, Noise, 8x8 life animation |
| `03_Smoke/SpentSmoke_01..11` | Only emitted by a matching puff's native Death link, Lifetime .8–1.4, Inherit Velocity > Initial .6, Force, Limit Velocity > Drag, Noise |
| `04_Glow/*` | Four additive single-particle glows; Main > Start Color alpha/Size, Color over Lifetime > flicker alpha keys |

Every layer can be enabled/disabled in the hierarchy. The smoke sub-emitters live
in `03_Smoke` and are referenced by `Puffs_*`, so disabling Smoke hides both kinds.

The core uses individual source-drawn tongue flipbooks, not one whole-fire movie.
Puff, lick and smoke atlases already contain their own cooling/shrink/fade. Do not
double those envelopes with Size/Color over Lifetime unless intentionally changing
the art. Fire/smoke alpha blending and glow additive blending are separated.

## Facing

All visible ParticleSystemRenderers use View alignment with Allow Roll disabled.
Core tongues and smoke are Billboard; sparks are native Stretched Billboard.
There is no material `_FaceCamera` toggle: the previous script-mediated checkbox
is replaced by the **native Renderer > Render Alignment** setting. Material/shader
only samples the texture, multiplies tint and blends; no shader animation or
camera/layout control is hidden there. The firemouth does not orbit when the
camera moves. Secondary particle positions are genuinely in 3D world/local space,
not a script-rotated flat plane, so oblique views alter their overlap naturally.

## Deliberate fidelity tradeoffs

The moving exact source tip is replaced by an editable volume around each tongue's
sampled mean tip. Source RNG/event order and exact sine trajectories are replaced
by native emission, curves and Noise. Velocity decay curves use the source formula
at a reference lifetime; random lifetimes therefore differ from the analytic source.
Smoke still begins at the actual death position of its parent puff via Sub Emitters.
There is no source-wide 3-second scheduler forcing all secondary particles to repeat.
The static bowl coals are fixed artwork; source spark shapes are simplified.

This fidelity baseline deliberately exposes 53 native systems per prefab instead
of hiding behavior in a controller. It has not been mobile-performance optimized.

## Editor-only tooling

`Editor/BrazierInspectorSetup.cs` generates serialized native modules and captures
QA images. It is not a component, is never attached, and is excluded from builds.
Rebuilding overwrites **this version's** generated prefab/module settings; make
prefab variants/copies before rebuilding if you have manually tuned them.

Menus: Tools > PixelFX > Brazier Inspector Only:

- Build Script-Free Version
- Validate Script-Free Prefabs
- Capture Native Preview
- Capture Native Motion
- Verify Live Playback and Emission (run in Play Mode; temporarily switches one
  ember emitter to 0/s, waits for old particles to expire, restores 10/s and checks
  native movement, 11 core particles and live Death smoke; never saves test edits)

Validation checks both saved prefabs and live scene objects, component allow-list,
native death links and absence of old-version/script/recipe dependencies.

Artwork adapted from pixelfx / Sprite Fusion fire, MIT License,
Copyright (c) 2026 Hugo Duprez.
