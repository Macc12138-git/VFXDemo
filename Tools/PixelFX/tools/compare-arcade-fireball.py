"""Static author review only; reference crops never become effect resources."""
import argparse
from pathlib import Path
from PIL import Image,ImageDraw

p=argparse.ArgumentParser();p.add_argument("closeup");p.add_argument("review");args=p.parse_args()
dest=Path(args.review)
shot=Image.open(args.closeup).convert("RGB").crop((4,49,44,118))
shot.save(dest/"author-focus.png")
sheet=Image.new("RGB",(660,430),"#13042a");pen=ImageDraw.Draw(sheet)
for i,(label,im)in enumerate([("AUTHOR / REFERENCE",shot.convert("RGBA")),("V4 / DIM",Image.open(dest/"dim.png").convert("RGBA")),("V4 / BRIGHT",Image.open(dest/"bright.png").convert("RGBA"))]):
    if i:im=im.crop(im.getbbox())
    height=330;width=round(im.width*height/im.height)
    im=im.resize((width,height),Image.Resampling.NEAREST)
    sheet.paste(im,(i*220+(220-width)//2,55),im)
    pen.text((i*220+15,16),label,fill="#e8d4b6")
pen.text((15,408),"Matched full height for review; not identical source-frame attribution",fill="#b8a7bf")
sheet.save(dest/"reference-comparison.png")
