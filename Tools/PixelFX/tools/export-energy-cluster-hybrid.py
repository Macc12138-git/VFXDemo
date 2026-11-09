#!/usr/bin/env python3
"""Extract only the reference shell as an R8 signed-distance flipbook.

Core, blue volume, glow and detached motes are rebuilt in the realtime study.
This is an approximate brightness/connected-component separation, not access
to the reference artist's original semantic layers. No Unity writes or GIFs.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse
import hashlib
import json
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V3'))
parser.add_argument('--output', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V4.3'))
args = parser.parse_args()
src, out = args.source, args.output
assert not out.exists(), 'Use a new output directory to preserve prior authoring versions.'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
base = json.loads((src / 'manifest.json').read_text())
assert base['frameCount'] in [12, 20] and base['cellSize'] in [[256, 256], [512, 512]]
count = base['frameCount']
source_paths = [src / 'manifest.json', src / 'Textures/EnergyCluster_Sequence.png']
source_paths += [src / 'Frames' / f'EnergyCluster_{i:03}.png' for i in range(count)]
hashes = {str(p): sha(p) for p in source_paths}
for folder in ['Textures', 'QA']:
    (out / folder).mkdir(parents=True, exist_ok=True)

cell, cols, rows, span = 256, (5 if count == 20 else 4), (4 if count == 20 else 3), 10.0
yy, xx = np.mgrid[:cell, :cell].astype(float)
rad = np.hypot(xx + .5 - cell / 2, yy + .5 - cell / 2)
atlas = Image.new('L', (cell * cols, cell * rows))
contact = Image.new('RGB', (cell * cols, (cell + 20) * rows), (5, 7, 22))
draw = ImageDraw.Draw(contact)

def sdf(mask):
    # Exact Euclidean distance up to the encoded span, with a half-pixel boundary.
    dist = np.full(mask.shape, span + .5)
    offsets = sorted((np.hypot(dx, dy), dx, dy) for dy in range(-11, 12) for dx in range(-11, 12)
                     if 0 < np.hypot(dx, dy) <= span + .5)
    for d, dx, dy in offsets:
        other = np.roll(mask, (dy, dx), axis=(0, 1))
        np.minimum(dist, np.where(mask != other, d, span + .5), out=dist)
    return np.clip((dist - .5) * np.where(mask, 1, -1), -span, span)

def keep_components(mask, minimum=26):
    # Detached subpixel sparks are replaced with a few continuously moving strokes.
    pending = set(map(tuple, np.argwhere(mask)))
    result = np.zeros(mask.shape, dtype=bool)
    while pending:
        root = pending.pop()
        component, queue = [root], [root]
        while queue:
            y, x = queue.pop()
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                q = (y + dy, x + dx)
                if q in pending:
                    pending.remove(q)
                    component.append(q)
                    queue.append(q)
        if len(component) >= minimum:
            for y, x in component:
                result[y, x] = True
    return result

coverages = []
for i, path in enumerate(source_paths[2:]):
    frame = Image.open(path).convert('RGBA').resize((256, 256), Image.Resampling.LANCZOS)
    rgba = np.array(frame, dtype=float) / 255
    red = rgba[..., 0] * rgba[..., 3]
    # Separate the blue volume/halo from neutral bright ribbons, and remove the central white dot.
    mask = keep_components((red > .56) & (rad > 11.5))
    distance = sdf(mask)
    encoded = np.rint((distance / span * .5 + .5) * 255).astype(np.uint8)
    assert not mask[:4].any() and not mask[-4:].any() and not mask[:, :4].any() and not mask[:, -4:].any()
    tile = Image.fromarray(encoded)
    atlas.paste(tile, (i % cols * cell, i // cols * cell))
    coverage = np.clip(distance + .5, 0, 1)
    coverages.append(float(coverage.sum()))
    debug = np.empty((cell, cell, 3), dtype=np.uint8)
    debug[:] = (5, 7, 22)
    debug = np.rint(debug * (1 - coverage[..., None]) + np.array([230, 245, 255]) * coverage[..., None]).astype(np.uint8)
    x, y = i % cols * cell, i // cols * (cell + 20)
    contact.paste(Image.fromarray(debug), (x, y + 20))
    draw.text((x + 8, y + 4), f'{i:02} / SHELL ONLY / 256px', fill=(150, 192, 221))

atlas_path = out / 'Textures/EnergyCluster_ShellSDF.png'
atlas.save(atlas_path)
contact.save(out / 'QA/shell-contact.png')
assert Image.open(atlas_path).mode == 'L'
baseline = src.parent / 'V3.2'
comparison = json.loads((baseline / 'manifest.json').read_text())
old_bytes = comparison['atlasSize'][0] * comparison['atlasSize'][1] * 4
new_bytes = atlas.width * atlas.height
manifest = {
    'effect': 'EnergyCluster', 'version': '4.3-hybrid-20-shell-sdf', 'stage': 'authoring / not Unity',
    'provenance': 'Approximate shell mask derived from author-supplied reference; realtime core/volume/glow/motes reconstructed.',
    'sourceVersion': base['version'], 'sourceAtlasSha256': base['atlasSha256'],
    'sourceFrameIndices': base.get('sourceFrameIndices', list(range(count))), 'frameCount': count, 'fps': count / .48, 'duration': .48,
    'loop': True, 'cellSize': [cell, cell], 'columns': cols, 'rows': rows, 'atlasSize': list(atlas.size),
    'order': base['order'], 'pivot': [.5, .5], 'seed': 37,
    'textures': [{'file': 'Textures/EnergyCluster_ShellSDF.png', 'pngMode': 'L', 'targetFormat': 'R8 UNorm',
                  'colorSpace': 'linear data (sRGB off)', 'channel': 'R: signed distance, inside positive',
                  'decode': '(R * 2 - 1) * 10 pixels', 'filter': 'bilinear', 'wrap': 'clamp', 'mipmaps': False,
                  'sha256': sha(atlas_path), 'pngBytes': atlas_path.stat().st_size}],
    'animation': {'shell': f'{count} shape frames with signed-distance interpolation; no optical-flow texture',
                  'core': 'analytic disc, continuous size/intensity pulse',
                  'volume': 'analytic sphere falloff + continuously orbiting cyan lobes',
                  'glow': 'analytic radial additive light, independent intensity',
                  'motes': 'deterministic short-life native-style line particles; no frame textures',
                  'clock': f'per-instance seconds; frame phase = age * {count / .48}; loop 0.48 seconds',
                  'interpolationLimit': 'Distance interpolation removes hold steps/alpha double-images but is not optical flow; fast topology changes may still contract.'},
    'separationLimit': 'Threshold/component approximation; connected jagged tips remain with shell. Not original artist layers or pixel-identical reconstruction.',
    'resources': {'baselineRGBA8NoMipsBytes': old_bytes, 'R8NoMipsBytes': new_bytes,
                  'R8ReductionPercent': 100 * (1 - new_bytes / old_bytes),
                  'RGBA8FallbackNoMipsBytes': new_bytes * 4,
                  'baselineVersion': comparison['version'],
                  'baselinePngBytes': (baseline / 'Textures/EnergyCluster_Sequence.png').stat().st_size, 'shellPngBytes': atlas_path.stat().st_size,
                  'note': 'R8 capacity only; actual Unity format/platform memory and GPU sampling cost untested. RGBA fallback has no raw-memory saving.'},
    'checks': {'shellCoveragePixels': coverages, 'sourceFilesUnchanged': True, 'noNewGIF': True},
}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
assert hashes == {str(p): sha(p) for p in source_paths}
print(json.dumps({'output': str(out), 'resources': manifest['resources']}, ensure_ascii=False))
