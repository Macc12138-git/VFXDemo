"""Static GIF inspection only. Frame numbers in all output are one-based."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("gif")
parser.add_argument("--out", required=True)
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
im = Image.open(args.gif)
durations = []
for i in range(im.n_frames):
    im.seek(i)
    durations.append(im.info.get("duration", 0))
frames = [30, 35, 40, 45, 50, 55, 60]
sheet = Image.new("RGB", (276 * 4, 469 * 2), "#17121d")
pen = ImageDraw.Draw(sheet)
for i, number in enumerate(frames):
    im.seek(number - 1)
    image = im.convert("RGB")
    image.save(out / f"F{number:03d}.png")
    x, y = (i % 4) * 276, (i // 4) * 469
    sheet.paste(image.resize((276, 447), Image.Resampling.NEAREST), (x, y))
    pen.text((x + 5, y + 449), f"F{number:03d} / {sum(durations[:number-1])}ms", fill="white")
sheet.save(out / "F030-F060-overview.png")
events = Image.new("RGB", (240 * 6, 270 * 3), "#17121d")
labels = ImageDraw.Draw(events)
for i, number in enumerate(range(43, 61)):
    im.seek(number - 1)
    x, y = (i % 6) * 240, (i // 6) * 270
    events.paste(im.convert("RGB").crop((100, 250, 340, 500)), (x, y))
    labels.text((x + 5, y + 252), f"F{number:03d}", fill="white")
events.save(out / "F043-F060-impact-neighborhood.png")
follow = Image.new("RGB", (180 * 5, 195 * 3), "#17121d")
labels = ImageDraw.Draw(follow)
for i, number in enumerate(range(46, 61)):
    im.seek(number - 1)
    cx = round(242 - (number - 45) * 6.6)
    cy = 367
    region = im.convert("RGB").crop((cx - 45, cy - 40, cx + 45, cy + 50))
    x, y = (i % 5) * 180, (i // 5) * 195
    follow.paste(region.resize((180, 180), Image.Resampling.NEAREST), (x, y))
    labels.rectangle((x + 70, y + 65, x + 110, y + 105), outline="#00ffba", width=1)
    labels.text((x + 5, y + 181), f"F{number:03d} near ({cx},{cy})", fill="white")
follow.save(out / "F046-F060-follow-center-shot.png")
flight = Image.new("RGB", (150 * 6, 200), "#17121d")
labels = ImageDraw.Draw(flight)
centers = [(30,319,758),(32,310,716),(34,301,673),(36,290,630),(38,280,589),(40,271,547)]
for i, (number, cx, cy) in enumerate(centers):
    im.seek(number - 1)
    region=im.convert("RGB").crop((cx-22,cy-20,cx+22,cy+36))
    flight.paste(region.resize((132,168),Image.Resampling.NEAREST),(i*150+9,5))
    labels.rectangle((i*150+33,23,i*150+117,149),outline="#00ffba")
    labels.text((i*150+6,177),f"F{number:03d} ({cx},{cy})",fill="white")
flight.save(out / "F030-F040-central-fireball.png")
consecutive = Image.new("RGB", (112 * 6, 160 * 2), "#17121d")
labels = ImageDraw.Draw(consecutive)
for i, number in enumerate(range(30, 42)):
    im.seek(number - 1)
    cx = round(319 - (number - 30) * 4.8)
    cy = round(758 - (number - 30) * 21.2)
    region = im.convert("RGB").crop((cx - 18, cy - 16, cx + 18, cy + 30))
    x, y = (i % 6) * 112, (i // 6) * 160
    consecutive.paste(region.resize((108, 138), Image.Resampling.NEAREST), (x + 2, y))
    labels.text((x + 4, y + 141), f"F{number:03d} / {(number-30)*20}ms", fill="white")
consecutive.save(out / "F030-F041-consecutive-flight.png")
(out / "reference.json").write_text(json.dumps({
    "source": args.gif, "frameNumbering": "one-based", "size": im.size,
    "frames": im.n_frames, "durationsMs": durations,
    "purpose": "Reference analysis only; not runtime sprites or animation sheets",
}, indent=2))
print(out / "F030-F060-overview.png")
