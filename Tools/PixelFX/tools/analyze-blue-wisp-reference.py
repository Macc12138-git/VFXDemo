"""Inspect the author-supplied GIF as static review images, never runtime artwork."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument("gif")
p.add_argument("--out", required=True)
a = p.parse_args()
dest = Path(a.out)
dest.mkdir(parents=True, exist_ok=True)
im = Image.open(a.gif)
sheet = Image.new("RGB", (880, 436), "#171e29")
pen = ImageDraw.Draw(sheet)
durations = []
for i in range(im.n_frames):
    im.seek(i)
    durations.append(im.info.get("duration", 0))
    # Only the central blue sphere; enlarged with nearest sampling for inspection.
    crop = im.convert("RGB").crop((300, 130, 450, 265))
    x, y = i % 4 * 220, i // 4 * 218
    sheet.paste(crop.resize((210, 189), Image.Resampling.NEAREST), (x + 5, y + 22))
    pen.text((x + 8, y + 4), f"F{i + 1:02d} / {sum(durations[:-1])} ms", fill="#d5ecff")
sheet.save(dest / "central-orb-contact.png")
(dest / "reference.json").write_text(json.dumps({
    "source": a.gif, "size": im.size, "frames": im.n_frames,
    "durationsMs": durations, "crop": [300, 130, 450, 265],
    "use": "Visual reference only; no extracted frames used in the effect",
}, indent=2) + "\n")
print(dest / "central-orb-contact.png")
