#!/usr/bin/env python3
"""Lossless spatial repack + temporal decimation of the reference flipbook.

Keep the full V3 source untouched. No Unity writes and no new GIF generation.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from shutil import copyfile
import argparse
import hashlib
import json
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V3'))
parser.add_argument('--output', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V3.1'))
args = parser.parse_args()
src, out = args.source, args.output
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
old_manifest = src / 'manifest.json'
old_atlas = src / 'Textures' / 'EnergyCluster_Sequence.png'
before_hashes = (sha(old_manifest), sha(old_atlas))
base = json.loads(old_manifest.read_text())
assert base['frameCount'] == 20 and base['cellSize'] == [512, 512]
count, columns, rows, fps = 12, 4, 3, 25
cell = 512
indices = [round(i * base['frameCount'] / count) for i in range(count)]
assert len(set(indices)) == count and indices[0] == 0 and indices[-1] < base['frameCount']
for folder in ['Frames', 'Textures', 'QA']:
    (out / folder).mkdir(parents=True, exist_ok=True)
atlas = Image.new('RGBA', (columns * cell, rows * cell))
frames = []
edge_max = 0
for i, source_index in enumerate(indices):
    source_path = src / 'Frames' / f'EnergyCluster_{source_index:03}.png'
    dest = out / 'Frames' / f'EnergyCluster_{i:03}.png'
    copyfile(source_path, dest)
    assert sha(source_path) == sha(dest), 'Retained frames must be byte-identical.'
    frame = Image.open(dest).convert('RGBA')
    assert frame.size == (cell, cell)
    a = np.asarray(frame)
    edge_max = max(edge_max, int(a[:4, :, 3].max()), int(a[-4:, :, 3].max()),
                   int(a[:, :4, 3].max()), int(a[:, -4:, 3].max()))
    assert np.all(a[a[..., 3] == 0, :3] == 0)
    atlas.paste(frame, ((i % columns) * cell, (i // columns) * cell))
    frames.append(frame)
assert edge_max == 0
atlas_path = out / 'Textures' / 'EnergyCluster_Sequence.png'
atlas.save(atlas_path)
decoded = Image.open(atlas_path).convert('RGBA')
for i, frame in enumerate(frames):
    tile = decoded.crop(((i % columns) * cell, (i // columns) * cell,
                         (i % columns + 1) * cell, (i // columns + 1) * cell))
    assert tile.tobytes() == frame.tobytes(), 'Atlas cell mismatch.'

contact = Image.new('RGB', (columns * 256, rows * 276), (5, 7, 22))
draw = ImageDraw.Draw(contact)
for i, frame in enumerate(frames):
    tile = Image.new('RGBA', (256, 256), (5, 7, 22, 255))
    tile.alpha_composite(frame.resize((256, 256), Image.Resampling.LANCZOS))
    x, y = (i % columns) * 256, (i // columns) * 276
    contact.paste(tile.convert('RGB'), (x, y + 20))
    draw.text((x + 8, y + 4), f'{i:02} / {i / fps:.2f}s / source {indices[i]:02}', fill=(150, 192, 221))
contact.save(out / 'QA' / 'contact.png')

# Color/alpha is exactly the same; this only diagnoses the new temporal sampling.
background = np.array([5, 7, 22], dtype=np.float32)
recomposited = []
for frame in frames:
    a = np.asarray(frame, dtype=np.float32)
    recomposited.append(a[..., :3] * a[..., 3:4] / 255 + background * (1 - a[..., 3:4] / 255))
steps = [float(np.abs(recomposited[(i + 1) % count] - a).mean()) for i, a in enumerate(recomposited)]
seam = steps[-1]
assert seam <= max(steps[:-1]) * 1.25, 'Loop jump is out of line with the retained animation.'
reduction = {
    'oldFrameCount': base['frameCount'], 'newFrameCount': count,
    'oldDuration': base['duration'], 'newDuration': count / fps,
    'oldAtlasSize': base['atlasSize'], 'newAtlasSize': list(atlas.size),
    'oldPixels': base['atlasSize'][0] * base['atlasSize'][1], 'newPixels': atlas.width * atlas.height,
    'oldRGBA8BytesNoMips': base['atlasSize'][0] * base['atlasSize'][1] * 4,
    'newRGBA8BytesNoMips': atlas.width * atlas.height * 4,
    'oldPngBytes': old_atlas.stat().st_size, 'newPngBytes': atlas_path.stat().st_size,
}
reduction['pixelReductionPercent'] = 100 * (1 - reduction['newPixels'] / reduction['oldPixels'])
reduction['pngReductionPercent'] = 100 * (1 - reduction['newPngBytes'] / reduction['oldPngBytes'])
manifest = {**base, 'version': '3.1-compact-reference-sequence', 'frameCount': count,
            'fps': fps, 'duration': count / fps, 'frameDurationsMs': [1000 // fps] * count,
            'columns': columns, 'rows': rows, 'atlasSize': list(atlas.size), 'atlasSha256': sha(atlas_path),
            'sourceFrameIndices': indices, 'derivedFromVersion': base['version'],
            'matteColorsRGB': [base['matteColorsRGB'][i] for i in indices],
            'derivedFromAtlasSha256': before_hashes[1],
            'timeScaleVsOriginal': base['duration'] / (count / fps),
            'reduction': reduction,
            'checks': {'retainedFramesByteIdentical': True, 'atlasCellsEqualFrames': True,
                       'edgeMaxAlpha': edge_max, 'adjacentFrameMeanDifferenceRGB8': steps,
                       'seamDifferenceRGB8': seam, 'allRetainedFrameIndicesUnique': True}}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
assert before_hashes == (sha(old_manifest), sha(old_atlas)), 'Full V3 source changed.'
print(json.dumps({'output': str(out), 'sourceFrameIndices': indices, 'reduction': reduction,
                  'seamDifferenceRGB8': seam, 'maxInternalStepRGB8': max(steps[:-1])}, ensure_ascii=False))
