# Brazier — source-driven animated particles

Open `Scenes/BrazierAnimatedShowcase.unity` and enter Play Mode.

Prefabs:

- `BrazierAnimatedParticles`: fire + ordinary SpriteRenderer iron bowl/stand.
- `BrazierAnimatedFlameParticles`: standalone fire; origin is the firemouth.

Four independently switchable child layers under `Firemouth - fixed world anchor`:
`01_Flames`, `02_Sparks`, `03_Smoke`, `04_Glow`.
No Unity Light component or ParticleSystem Lights module is used by either prefab.

## What changed

Eleven persistent core particles each use a separate 90-frame / 3-second atlas,
drawn with the original flameTongue noise, width, height, sweep and color layers.
These are **individual tongues**, not a recording of the whole effect.
Texture Sheet Animation is Shuriken's native lifetime-normalized 10x9 grid.

Fire puffs, detached licks, plume smoke and spent smoke use 64-frame individual
life atlases. Cooling, shrink and fade are already in the artwork and are not
applied a second time by Size/Color over Lifetime.

`BrazierAnimatedRecipe.json` contains 639 sampled source events per 3-second loop:
264 puffs, 132 licks, 42 plume puffs, 30 embers, 60 fast sparks and 111 linked
smoke continuations. RNG consumption includes the original birth phase first.
Puffs and licks are born at their own tongue's actual source tip. Spent smoke
starts at its parent puff's final position and inherits its final velocity at
60 percent plus the original upward kick, rather than an unrelated emitter.

`BrazierSourceParticles` emits native particles on the source schedule, manually
advances Shuriken on one clock, and corrects their positions with the original
closed-form drag/sine equations. Lifetime expiry, UV animation and billboard
geometry remain native. This deliberately requires a small runtime bridge;
all motion cannot be represented faithfully by Inspector random ranges alone.
Stopping/disabling that bridge stops the coordinated effect. Use the root
component's playbackSpeed, previewPaused, previewTime/Seek and glowStrength.

## Camera facing

Each layer's control material exposes `Always Face Camera (View Billboard)`.
Flames: `Tongue_01`; Sparks: `Sparks`; Smoke: `SmokePlume`; Glow: `Glow`.
`ParticleMaterialFacing` maps it to native View/Local alignment (roll disabled).
`BrazierCameraLayout` rotates only the zero-offset XY particle layout for each
camera. It never rotates the world firemouth offset around the basin.
For existing 3D braziers, use the standalone prefab at the model's opening.

## Re-export / rebuild

From `/Users/user/Desktop/pixelfx`:

```
node tools/export-brazier-animated-particles.mjs /Users/user/Desktop/VFXDemo/VFXDemo/Assets/PixelFX/Brazier/AnimatedParticles/Textures
```

Unity menus: `Tools > PixelFX > Brazier Animated Particles`:
Build Source Driven Version, Validate, Capture Comparison.
Build replaces this version's showcase effect instances, using the saved original
stage on first build. It discards unsaved scene edits as explicitly authorized
for this task. Previous version assets and saved scenes are not overwritten.

## Known visual limits

This is a fidelity baseline, not yet a mobile draw-call optimized production asset.
There are 19 systems per effect (11 core + 7 secondary + 1 glow).
Puff heat uses a middle-value atlas rather than an atlas per random heat value.
Individual puff/smoke sizes are scaled from reference stamps, so subpixel raster
details differ; smoke alpha and glow are composited in Unity's linear pipeline
rather than pixelfx's 8-bit RGB buffers. Spark streak color/shape is simplified.
The ordinary prop's coal illumination is fixed at source time 0.8 seconds.
Do not describe this as pixel-identical or as a fully Inspector-only simulation.

Artwork and trajectories adapted from pixelfx/Sprite Fusion fire, MIT License,
Copyright (c) 2026 Hugo Duprez.
