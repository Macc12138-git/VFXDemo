"""Build review GIFs from authoring frames, not a runtime flipbook or Unity asset."""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args()
folder = Path(args.out).resolve()
if 'Assets' in folder.parts:
    raise ValueError('Review GIFs must stay outside Assets')
files = sorted((folder / 'frames').glob('assembly-*.png'))[::2]
for filename, color in [('preview.gif', '#252630'), ('preview-warm.gif', '#c28155')]:
    frames = []
    for path in files:
        with Image.open(path) as original:
            rgba = original.convert('RGBA').crop((120, 170, 920, 714)).resize((640, 435), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', rgba.size, color)
        frame.alpha_composite(rgba)
        frames.append(frame.convert('RGB'))
    # Include the empty end frame as a deliberate 400 ms review pause.
    durations = [round((i + 1) * 100 / 3) // 10 * 10 - round(i * 100 / 3) // 10 * 10 for i in range(len(frames))]
    durations[-1] = 400
    frames[0].save(folder / filename, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, optimize=False, disposal=2)
    print(folder / filename)
