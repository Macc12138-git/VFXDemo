#!/usr/bin/env python3
"""Optional Pillow GIF preview, not a Unity asset exporter."""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
args = parser.parse_args()
files = sorted((args.directory / 'frames').glob('brazier-*.png'))
if not files:
    parser.error('Render frames with render-hd-brazier --frames true first.')
frames = []
for path in files:
    with Image.open(path) as image:
        # Portrait close-up for chat delivery; the full transparent PNG remains 1024 x 1280.
        crop = image.convert('RGBA').crop((192, 176, 832, 1200))
        background = Image.new('RGBA', crop.size, '#151820')
        background.alpha_composite(crop)
        frame = background.convert('RGB').resize((400, 640), Image.Resampling.LANCZOS)
        frames.append(frame)
# One shared palette avoids frame-to-frame color quantization flicker.
samples = frames[::12]
swatches = Image.new('RGB', (400, 640 * len(samples)))
for index, frame in enumerate(samples):
    swatches.paste(frame, (0, index * 640))
palette = swatches.quantize(colors=256)
frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
# GIF has 10 ms timing granularity: alternate 30/30/40 ms for an exact 4-second loop.
frames[0].save(args.directory / 'preview.gif', save_all=True, append_images=frames[1:],
               duration=[30, 30, 40] * (len(frames) // 3), loop=0, optimize=False, disposal=2)
print(f'{len(frames)} frames / 4 seconds -> {args.directory / "preview.gif"}')
