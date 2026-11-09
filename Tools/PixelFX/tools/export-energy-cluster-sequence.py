#!/usr/bin/env python3
"""Author-supplied GIF -> fixed-pivot straight-RGBA frames and a uniform atlas.

This is a reference conversion, not a newly drawn animation. Does not write Assets,
launch Unity, or generate GIFs. All frames share one crop; no per-frame recentering.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse
import hashlib
import json
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path('Tools/PixelFX/output/hd/EnergyCluster/V3'))
args = parser.parse_args()
out = args.output
for name in ['Frames', 'Textures', 'QA']:
    (out / name).mkdir(parents=True, exist_ok=True)
source = Image.open(args.source)
assert source.size == (793, 793), 'Re-evaluate crop for a different reference.'
crop = (0, 0, 793, 793)
cell = 512
padding = 4
columns = 5
count = source.n_frames
rows = (count + columns - 1) // columns
atlas = Image.new('RGBA', (columns * cell, rows * cell))
frames, originals, durations, matte_colors, reconstruction = [], [], [], [], []
for i in range(count):
    source.seek(i)
    im = source.convert('RGB')
    raw = np.asarray(im, dtype=np.float32)
    border = np.concatenate([raw[:4].reshape(-1, 3), raw[-4:].reshape(-1, 3),
                             raw[:, :4].reshape(-1, 3), raw[:, -4:].reshape(-1, 3)])
    matte = np.median(border, axis=0)
    delta = np.maximum(0, raw - matte)
    # Minimum-opacity matte reconstruction: C = a*F + (1-a)*B.
    # Unlike deleting black pixels, this preserves soft blue light and removes the blue-black matte.
    alpha = np.max(delta / np.maximum(1, 255 - matte), axis=2)
    rgb = matte + delta / np.maximum(alpha[..., None], 1e-8)
    rgba = np.concatenate([np.clip(rgb, 0, 255), np.clip(alpha[..., None] * 255, 0, 255)], axis=2)
    rgba = np.rint(rgba).astype(np.uint8)
    rgba[rgba[..., 3] == 0, :3] = 0
    full = Image.fromarray(rgba)
    rebuilt = rgba[..., :3].astype(float) * rgba[..., 3:4] / 255 + matte * (1 - rgba[..., 3:4] / 255)
    reconstruction.append(float(np.abs(rebuilt - raw).mean()))
    content = full.crop(crop).resize((cell - 2 * padding, cell - 2 * padding), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (cell, cell))
    frame.paste(content, (padding, padding))
    # Explicitly clear RGB for alpha=0 after resampling too.
    data = np.array(frame)
    data[data[..., 3] == 0, :3] = 0
    frame = Image.fromarray(data)
    frame.save(out / 'Frames' / f'EnergyCluster_{i:03}.png')
    atlas.paste(frame, ((i % columns) * cell, (i // columns) * cell))
    frames.append(frame)
    original = Image.new('RGB', (cell, cell), tuple(matte.astype(int)))
    original.paste(im.crop(crop).resize((cell - 2 * padding, cell - 2 * padding), Image.Resampling.LANCZOS), (padding, padding))
    originals.append(original)
    durations.append(source.info.get('duration', 40))
    matte_colors.append(matte.astype(int).tolist())
assert count == 20 and all(t == 40 for t in durations)
atlas.save(out / 'Textures' / 'EnergyCluster_Sequence.png')

# Contact sheet: all frames, original ordering, not an exported animation.
contact = Image.new('RGB', (5 * 256, 4 * 276), (5, 7, 22))
d = ImageDraw.Draw(contact)
for i, frame in enumerate(frames):
    tile = Image.new('RGBA', (256, 256), (5, 7, 22, 255))
    tile.alpha_composite(frame.resize((256, 256), Image.Resampling.LANCZOS))
    x, y = i % 5 * 256, i // 5 * 276
    contact.paste(tile.convert('RGB'), (x, y + 20))
    d.text((x + 10, y + 4), f'{i:02} / {i * .04:.2f}s', fill=(150, 192, 221))
contact.save(out / 'QA' / 'contact.png')

# Inspect original matte reconstruction, black, light and transparency checker.
board = Image.new('RGB', (1280, 660), (7, 12, 27))
bd = ImageDraw.Draw(board)
for j, bg in enumerate([(5, 7, 22), (0, 0, 0), (220, 224, 228), None]):
    for k, idx in enumerate([0, 6]):
        tile = Image.new('RGBA', (320, 320), (0, 0, 0, 255))
        if bg is None:
            td = ImageDraw.Draw(tile)
            for yy in range(0, 320, 16):
                for xx in range(0, 320, 16):
                    c = (34, 52, 69, 255) if (xx // 16 + yy // 16) % 2 else (20, 33, 48, 255)
                    td.rectangle((xx, yy, xx + 15, yy + 15), fill=c)
        else:
            tile.paste(bg + (255,), (0, 0, 320, 320))
        tile.alpha_composite(frames[idx].resize((320, 320), Image.Resampling.LANCZOS))
        board.paste(tile.convert('RGB'), (j * 320, k * 330 + 10))
board.save(out / 'QA' / 'backgrounds.png')

# Original GIF frame and reconstructed frame, same crop/scale/matte.
comparison = Image.new('RGB', (1024, 540), (5, 7, 22))
comparison.paste(originals[6], (0, 28))
reconstructed = Image.new('RGBA', (512, 512), (5, 7, 22, 255))
reconstructed.alpha_composite(frames[6])
comparison.paste(reconstructed.convert('RGB'), (512, 28))
cd = ImageDraw.Draw(comparison)
cd.text((16, 8), 'REFERENCE / ORIGINAL FRAME 06', fill=(170, 205, 225))
cd.text((528, 8), 'RGBA SEQUENCE / RECOMPOSITED', fill=(170, 205, 225))
comparison.save(out / 'QA' / 'reference-comparison.png')

edge_max = 0
for i, frame in enumerate(frames):
    a = np.array(frame)
    edge_max = max(edge_max, int(a[:2, :, 3].max()), int(a[-2:, :, 3].max()),
                   int(a[:, :2, 3].max()), int(a[:, -2:, 3].max()))
    assert np.all(a[a[..., 3] == 0, :3] == 0)
    tile = atlas.crop(((i % columns) * cell, (i // columns) * cell,
                      (i % columns + 1) * cell, (i // columns + 1) * cell))
    assert tile.tobytes() == frame.tobytes(), 'Atlas cell mismatch.'
assert edge_max == 0, 'Crop trims visible energy; increase global padding.'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = {
    'effect': 'EnergyCluster', 'version': '3.0-reference-sequence',
    'provenance': 'Author-supplied reference GIF converted into frames; not a new drawing.',
    'sourceFile': args.source.name, 'sourceSha256': sha(args.source), 'sourceSize': list(source.size),
    'sourceFrameCount': count, 'frameCount': count, 'fps': 25, 'duration': .8,
    'loop': True, 'frameDurationsMs': durations, 'cellSize': [cell, cell],
    'atlasSize': list(atlas.size), 'columns': columns, 'rows': rows,
    'order': 'left-to-right, top-to-bottom', 'pivot': [.5, .5], 'uniformSourceCrop': list(crop), 'cellPaddingPx': padding,
    'colorSpace': 'sRGB color', 'alpha': 'straight RGBA, blue-black matte removed',
    'matteColorsRGB': matte_colors, 'recommendedPreviewBlend': 'source-over',
    'mipmaps': False, 'filter': 'bilinear', 'wrap': 'clamp', 'npot': 'keep original size; PC target',
    'atlasSha256': sha(out / 'Textures' / 'EnergyCluster_Sequence.png'),
    'checks': {'atlasCellsEqualFrames': True, 'edgeMaxAlpha': edge_max,
               'meanOriginalReconstructionErrorRGB8': sum(reconstruction) / count},
    'unity': 'Not imported; no Unity runtime/performance validation.',
}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'output': str(out), 'frames': count, 'fps': 25, 'atlas': list(atlas.size),
                  'edgeMaxAlpha': edge_max, 'reconstructionRGB8': manifest['checks']['meanOriginalReconstructionErrorRGB8']}, ensure_ascii=False))
