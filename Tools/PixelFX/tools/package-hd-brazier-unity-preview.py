"""Package Unity QA screenshots as review media; never produces runtime assets."""
import argparse
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("--root", type=Path, default=Path("VFXWork/Previews/Brazier/HandPaintedRealtime"))
args = parser.parse_args()
root = args.root
frames = sorted((root / "LiveMotion").glob("Frame_*.png"))
if not frames:
    raise SystemExit("No actual Play Mode capture frames yet")
report = json.loads((root / "LivePlayback.json").read_text())
images = [Image.open(p).convert("RGB") for p in frames]
# Capture is observational and wall-clock paced, not a deterministic animation timeline.
duration = max(20, round((report["elapsedSeconds"] - 3.95) * 1000 / len(images) / 10) * 10)
palette = images[0].quantize(colors=224, method=Image.Quantize.MEDIANCUT)
gif = [im.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for im in images]
gif[0].save(root / "BrazierHandPaintedRealtime-Live.gif", save_all=True, append_images=gif[1:], duration=duration, loop=0, disposal=2)

entries = ["01_Core", "02_Detached", "03_Smoke", "04_Glow", "05_Prop", "Oblique35deg"]
contact = Image.new("RGB", (960, 840), "#151820")
draw = ImageDraw.Draw(contact)
for i, name in enumerate(entries):
    im = Image.open(root / (name + ".png")).convert("RGB")
    im.thumbnail((320, 400), Image.Resampling.LANCZOS)
    x, y = (i % 3) * 320, (i // 3) * 420
    contact.paste(im, (x, y + 20))
    draw.text((x + 12, y + 4), name, fill="#c0b3a6")
contact.save(root / "LayersAndOblique.png")
gallery = Path("Tools/PixelFX/output/unity-preview/brazier-handpainted-realtime")
gallery.mkdir(parents=True, exist_ok=True)
for name in ["BrazierHandPaintedRealtime-Live.gif", "Comparison.png", "LayersAndOblique.png", "Structure.json", "LivePlayback.json"]:
    shutil.copyfile(root / name, gallery / name)
print(json.dumps({"gif": str(root / "BrazierHandPaintedRealtime-Live.gif"), "frames": len(images), "durationMs": duration, "actualPlayModePassed": report["passed"]}))
