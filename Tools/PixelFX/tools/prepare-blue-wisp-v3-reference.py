"""Native-size reference analysis tiles. Never used by the redrawn effect renderer."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument("gif")
p.add_argument("--out", required=True)
a = p.parse_args()
dest = Path(a.out)
dest.mkdir(parents=True, exist_ok=True)
im = Image.open(a.gif)
sheet = Image.new("RGB", (600, 135))
records = []
for i in range(4):
    im.seek(i)
    crop = im.convert("RGB").crop((300, 130, 450, 265))
    sheet.paste(crop, (i * 150, 0))
    records.append({"pose": i + 1, "startMs": i * 70, "holdMs": 70,
                    "cropSha256": hashlib.sha256(crop.tobytes()).hexdigest()})
sheet.save(dest / "four-pose-reference.png")
(dest / "four-pose-reference.json").write_text(json.dumps({
    "source": a.gif, "crop": [300, 130, 450, 265], "durationMs": 280,
    "purpose": "Reference comparison UI only, not redrawn effect playback artwork",
    "poses": records,
}, indent=2) + "\n")
