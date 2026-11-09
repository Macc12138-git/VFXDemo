#!/usr/bin/env python3
"""Downsample the approved 12-frame flipbook; preserve timing and source assets.

Outputs stay outside Assets. No Unity writes and no new GIF generation.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse
import hashlib
import json
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V3.1'))
parser.add_argument('--output', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V3.2'))
args = parser.parse_args()
src, out = args.source, args.output
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest_path = src / 'manifest.json'
source_atlas = src / 'Textures' / 'EnergyCluster_Sequence.png'
base = json.loads(manifest_path.read_text())
assert base['frameCount'] == 12 and base['cellSize'] == [512, 512]
count, columns, rows, fps = base['frameCount'], base['columns'], base['rows'], base['fps']
cell, padding = 256, 2
assert not out.exists(), 'Use a new output directory; do not overwrite a previous version.'
source_paths = [manifest_path, source_atlas] + [src / 'Frames' / f'EnergyCluster_{i:03}.png' for i in range(count)]
before_hashes = {str(p): sha(p) for p in source_paths}
for folder in ['Frames', 'Textures', 'QA']:
    (out / folder).mkdir(parents=True, exist_ok=True)

atlas = Image.new('RGBA', (columns * cell, rows * cell))
frames, frame_hashes = [], []
edge_max = 0
for i in range(count):
    original = Image.open(source_paths[i + 2]).convert('RGBA')
    # Pillow resizes RGBA using premultiplied-alpha filtering, then returns straight RGBA.
    data = np.array(original.resize((cell, cell), Image.Resampling.LANCZOS))
    data[data[..., 3] == 0, :3] = 0
    frame = Image.fromarray(data)
    edge_max = max(edge_max, int(data[:padding, :, 3].max()), int(data[-padding:, :, 3].max()),
                   int(data[:, :padding, 3].max()), int(data[:, -padding:, 3].max()))
    assert edge_max == 0, 'Resampling leaked into transparent edge padding.'
    dest = out / 'Frames' / f'EnergyCluster_{i:03}.png'
    frame.save(dest)
    frame_hashes.append(sha(dest))
    atlas.paste(frame, ((i % columns) * cell, (i // columns) * cell))
    frames.append(frame)
atlas_path = out / 'Textures' / 'EnergyCluster_Sequence.png'
atlas.save(atlas_path)
decoded = Image.open(atlas_path).convert('RGBA')
for i, frame in enumerate(frames):
    tile = decoded.crop(((i % columns) * cell, (i // columns) * cell,
                         (i % columns + 1) * cell, (i // columns + 1) * cell))
    assert tile.tobytes() == frame.tobytes(), 'Atlas cell mismatch.'

# All 12 frames shown at their native 256px resolution.
contact = Image.new('RGB', (columns * cell, rows * (cell + 20)), (5, 7, 22))
draw = ImageDraw.Draw(contact)
for i, frame in enumerate(frames):
    tile = Image.new('RGBA', (cell, cell), (5, 7, 22, 255))
    tile.alpha_composite(frame)
    x, y = (i % columns) * cell, (i // columns) * (cell + 20)
    contact.paste(tile.convert('RGB'), (x, y + 20))
    draw.text((x + 8, y + 4), f'{i:02} / {i / fps:.2f}s / 256px', fill=(150, 192, 221))
contact.save(out / 'QA' / 'contact.png')

backgrounds = Image.new('RGB', (4 * cell, 2 * (cell + 24)), (7, 12, 27))
bd = ImageDraw.Draw(backgrounds)
for j, (label, bg) in enumerate([('REFERENCE', (5, 7, 22)), ('BLACK', (0, 0, 0)),
                                ('LIGHT', (220, 224, 228)), ('CHECKER', None)]):
    for k, idx in enumerate([0, 6]):
        tile = Image.new('RGBA', (cell, cell), (0, 0, 0, 255))
        if bg is None:
            td = ImageDraw.Draw(tile)
            for y in range(0, cell, 16):
                for x in range(0, cell, 16):
                    c = (34, 52, 69, 255) if (x // 16 + y // 16) % 2 else (20, 33, 48, 255)
                    td.rectangle((x, y, x + 15, y + 15), fill=c)
        else:
            tile.paste(bg + (255,), (0, 0, cell, cell))
        tile.alpha_composite(frames[idx])
        x, y = j * cell, k * (cell + 24)
        backgrounds.paste(tile.convert('RGB'), (x, y + 24))
        bd.text((x + 8, y + 6), f'{label} / FRAME {idx:02} / 1:1', fill=(150, 192, 221))
backgrounds.save(out / 'QA' / 'backgrounds.png')

background = np.array([5, 7, 22], dtype=np.float32)
recomposited = []
for frame in frames:
    data = np.asarray(frame, dtype=np.float32)
    recomposited.append(data[..., :3] * data[..., 3:4] / 255 + background * (1 - data[..., 3:4] / 255))
steps = [float(np.abs(recomposited[(i + 1) % count] - a).mean()) for i, a in enumerate(recomposited)]
assert steps[-1] <= max(steps[:-1]) * 1.25, 'Loop jump is out of line with the animation.'
reduction = {
    'oldFrameCount': count, 'newFrameCount': count, 'oldDuration': base['duration'], 'newDuration': base['duration'],
    'oldCellSize': base['cellSize'], 'newCellSize': [cell, cell],
    'oldAtlasSize': base['atlasSize'], 'newAtlasSize': list(atlas.size),
    'oldPixels': base['atlasSize'][0] * base['atlasSize'][1], 'newPixels': atlas.width * atlas.height,
    'oldRGBA8BytesNoMips': base['atlasSize'][0] * base['atlasSize'][1] * 4,
    'newRGBA8BytesNoMips': atlas.width * atlas.height * 4,
    'oldPngBytes': source_atlas.stat().st_size, 'newPngBytes': atlas_path.stat().st_size,
}
reduction['pixelReductionPercent'] = 100 * (1 - reduction['newPixels'] / reduction['oldPixels'])
reduction['pngReductionPercent'] = 100 * (1 - reduction['newPngBytes'] / reduction['oldPngBytes'])
manifest = {**base, 'version': '3.2-256-reference-sequence', 'cellSize': [cell, cell],
            'cellPaddingPx': padding, 'atlasSize': list(atlas.size), 'atlasSha256': sha(atlas_path),
            'frameSha256': frame_hashes, 'derivedFromVersion': base['version'],
            'derivedFromAtlasSha256': before_hashes[str(source_atlas)],
            'resampling': 'Pillow RGBA Lanczos (premultiplied-alpha filtering); zero-alpha RGB cleared',
            'reduction': reduction,
            'checks': {'atlasCellsEqualFrames': True, 'edgeMaxAlpha': edge_max, 'zeroAlphaRGBCleared': True,
                       'adjacentFrameMeanDifferenceRGB8': steps, 'seamDifferenceRGB8': steps[-1],
                       'frameOrderAndTimingUnchanged': True, 'sourceFilesUnchanged': True}}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
assert before_hashes == {str(p): sha(p) for p in source_paths}, 'Source changed.'
print(json.dumps({'output': str(out), 'reduction': reduction, 'edgeMaxAlpha': edge_max,
                  'seamDifferenceRGB8': steps[-1], 'maxInternalStepRGB8': max(steps[:-1])}, ensure_ascii=False))
