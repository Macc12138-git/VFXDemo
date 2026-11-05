"""Package actual Unity QA captures for review, never for runtime playback."""
import json
import shutil
from pathlib import Path
from PIL import Image

root = Path("VFXWork/Previews/Brazier/NoiseRealtime")
report = json.loads((root / "LivePlayback.json").read_text())
if not report["passed"] or not report["actualPlayMode"]:
    raise SystemExit("Actual Play Mode QA has not passed")
paths = sorted((root / "LiveMotion").glob("Frame_*.png"))
if len(paths) != report["capturedFrames"]:
    raise SystemExit("Incomplete native playback capture")
frames = [Image.open(p).convert("RGB") for p in paths]
palette = frames[0].quantize(colors=224, method=Image.Quantize.MEDIANCUT)
quantized = [im.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for im in frames]
duration = max(20, round(report["captureSeconds"] * 1000 / len(frames) / 10) * 10)
name = "BrazierNoiseRealtime-Live.gif"
quantized[0].save(root / name, save_all=True, append_images=quantized[1:], duration=duration, loop=0, disposal=2)
gallery = Path("Tools/PixelFX/output/unity-preview/brazier-noise-realtime")
gallery.mkdir(parents=True, exist_ok=True)
for file in [name, "Comparison.png", "LayersAndOblique.png", "SourcePhase_0.8.png", "Structure.json", "LivePlayback.json", "MaterialChecks.json"]:
    shutil.copyfile(root / file, gallery / file)
print(json.dumps({"gif": str(root / name), "frames": len(paths), "durationMs": duration, "actualPlayModePassed": True}))
