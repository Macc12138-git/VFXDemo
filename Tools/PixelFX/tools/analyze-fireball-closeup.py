"""Reference-only static inspection; never changes effect artwork or Unity assets."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("gif")
parser.add_argument("closeup")
parser.add_argument("--out", required=True)
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
shot = Image.open(args.closeup).convert("RGB")
shot.resize((shot.width * 6, shot.height * 6), Image.Resampling.NEAREST).save(out / "author-closeup-6x.png")
arr = np.asarray(shot)
colors = shot.getcolors(shot.width * shot.height)
print("Closeup:", shot.size, "colors:", len(colors) if colors else "many")
print("Most common:", sorted(colors, reverse=True)[:12])

# Match only the head: neighboring tails and the empty sky must not dictate identity.
# Try capture scale changes too; a match is evidence to inspect, not automatic attribution.
gif = Image.open(args.gif)
ranked = []
for scale in [0.5, 2/3, 0.75, 1.0]:
    cut = shot.crop((4, 47, 44, 101))
    target = cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
    ta = np.asarray(target, dtype=np.int16)
    th,tw = ta.shape[:2]
    warm = (ta[:,:,0] > 85) & (ta[:,:,1] > 48) & (ta[:,:,0] > ta[:,:,2]*1.15)
    points = np.argwhere(warm)
    points = points[np.linspace(0, len(points)-1, min(24,len(points)),dtype=int)]
    for frame_number in range(30,61):
        gif.seek(frame_number-1)
        frame = np.asarray(gif.convert("RGB"),dtype=np.int16)
        h,w = frame.shape[:2]
        score = np.zeros((h-th+1,w-tw+1),dtype=np.float32)
        for yy,xx in points:
            delta = frame[yy:yy+h-th+1,xx:xx+w-tw+1] - ta[yy,xx]
            score += np.abs(delta).mean(axis=2)
        y,x = np.unravel_index(score.argmin(),score.shape)
        ranked.append({"frame":frame_number,"scale":scale,"x":int(x),"y":int(y),
                       "headPatchSize":[tw,th],"meanAbsoluteError":float(score[y,x]/len(points))})
ranked.sort(key=lambda row: row["meanAbsoluteError"])
print("Head match candidates:", ranked[:8])
(out/"match-candidates.json").write_text(json.dumps(ranked[:20],indent=2))
for i,row in enumerate(ranked[:3]):
    gif.seek(row["frame"]-1)
    frame=gif.convert("RGB")
    x,y=row["x"],row["y"]
    pw,ph=row["headPatchSize"]
    crop=frame.crop((x-10,y-15,x+pw+10,y+ph+20))
    crop.resize((crop.width*5,crop.height*5),Image.Resampling.NEAREST).save(out/f"match-{i+1}-F{row['frame']:03d}.png")

# Explicit visual A/B, same full-sprite display height. Diagnostic image only.
current = out / "current-dim.png"
if current.exists():
    draft = Image.open(current).convert("RGBA")
    draft = draft.crop(draft.getbbox())
    source = shot.crop((3,47,45,120))
    comparison = Image.new("RGB", (540, 470), "#13042a")
    labels = ImageDraw.Draw(comparison)
    labels.text((28,18), "AUTHOR CLOSEUP", fill="#ecd9b6")
    labels.text((295,18), "CURRENT DRAFT / DIM", fill="#ecd9b6")
    for item,cx in [(source.convert("RGBA"),130),(draft,400)]:
        height = 365
        width = round(item.width*height/item.height)
        enlarged = item.resize((width,height),Image.Resampling.NEAREST)
        comparison.paste(enlarged,(cx-width//2,58),enlarged)
    labels.text((38,440), "Equal overall height; not an art revision", fill="#b4a4ba")
    comparison.save(out/"reference-vs-current.png")

# Re-centre the previously chosen central shot by its warm upper head, not by
# the background or the side-projectile tails. Keep those occlusions visible.
aligned = Image.new("RGB", (6*145, 226), "#17121d")
labels = ImageDraw.Draw(aligned)
for i,number in enumerate(range(30,36)):
    gif.seek(number-1)
    image=gif.convert("RGB")
    cx=round(319-(number-30)*4.8)
    cy=round(758-(number-30)*21.2)
    nearby=np.asarray(image.crop((cx-12,cy-17,cx+12,cy+9)))
    warm=(nearby[:,:,0]>110)&(nearby[:,:,0]>nearby[:,:,2]*1.25)&(nearby[:,:,1]>58)
    yy,xx=np.where(warm)
    if len(xx):
        cx += round((int(xx.min())+int(xx.max()))/2)-12
        cy += int(yy.min())-17+13
    region=image.crop((cx-20,cy-17,cx+20,cy+36))
    aligned.paste(region.resize((120,159),Image.Resampling.NEAREST),(i*145+12,24))
    labels.text((i*145+12,7),f"F{number:03d}",fill="white")
    labels.rectangle((i*145+15,24,i*145+129,183),outline="#8a7f94")
labels.text((12,198), "Same tracked shot, six consecutive GIF frames; adjacent tails remain visible.", fill="#d7c3ac")
aligned.save(out/"F030-F035-aligned-reference.png")
