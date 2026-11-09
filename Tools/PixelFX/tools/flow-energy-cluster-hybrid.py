#!/usr/bin/env python3
"""Small offline bidirectional flow field for the shell-only animation.

NumPy pyramidal local least squares; no new external dependencies. Flow is
an approximation, especially around appearing/disappearing surface features.
The binary is raw RGBA8 data (not color/alpha) for a 256x192 texture.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json
import numpy as np

root = Path('Tools/PixelFX/output/hd/EnergyCluster/V4')
manifest = json.loads((root / 'manifest.json').read_text())
atlas = np.asarray(Image.open(root / 'Textures/EnergyCluster_ShellSDF.png'), dtype=float) / 255
images = [atlas[i // 4 * 256:(i // 4 + 1) * 256, i % 4 * 256:(i % 4 + 1) * 256] for i in range(12)]

def resize(a, size):
    return np.asarray(Image.fromarray(a.astype(np.float32)).resize((size, size), Image.Resampling.BILINEAR), dtype=float)

def blur(a):
    p = np.pad(a, ((0, 0), (2, 2)), mode='edge')
    a = sum(p[:, i:i + a.shape[1]] * w for i, w in enumerate([1, 4, 6, 4, 1])) / 16
    p = np.pad(a, ((2, 2), (0, 0)), mode='edge')
    return sum(p[i:i + a.shape[0]] * w for i, w in enumerate([1, 4, 6, 4, 1])) / 16

def warp(a, u, v):
    yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
    x, y = np.clip(xx + u, 0, a.shape[1] - 1), np.clip(yy + v, 0, a.shape[0] - 1)
    ix, iy = x.astype(int), y.astype(int)
    jx, jy = np.minimum(ix + 1, a.shape[1] - 1), np.minimum(iy + 1, a.shape[0] - 1)
    fx, fy = x - ix, y - iy
    return (a[iy, ix] * (1 - fx) + a[iy, jx] * fx) * (1 - fy) + (a[jy, ix] * (1 - fx) + a[jy, jx] * fx) * fy

def flow(a, b):
    # Match soft coverage, not wide, saturated far-field SDF values.
    a = np.clip((a - .5) * 10 + .5, 0, 1)
    b = np.clip((b - .5) * 10 + .5, 0, 1)
    u, v = np.zeros((16, 16)), np.zeros((16, 16))
    for size in [16, 32, 64, 128]:
        if size != 16:
            u, v = resize(u, size) * 2, resize(v, size) * 2
        aa, bb = blur(resize(a, size)), blur(resize(b, size))
        by, bx = np.gradient(bb)
        for _ in range(28):
            ix, iy = warp(bx, u, v), warp(by, u, v)
            error = aa - warp(bb, u, v)
            xx, yy, xy = blur(ix * ix) + .0002, blur(iy * iy) + .0002, blur(ix * iy)
            xt, yt = blur(ix * error), blur(iy * error)
            det = xx * yy - xy * xy
            du, dv = (yy * xt - xy * yt) / det, (xx * yt - xy * xt) / det
            u += np.clip(du, -.7, .7) * .7
            v += np.clip(dv, -.7, .7) * .7
            u, v = u * .94 + blur(u) * .06, v * .94 + blur(v) * .06
            u, v = np.clip(u, -24, 24), np.clip(v, -24, 24)
    return resize(u, 64) * 2, resize(v, 64) * 2

raw = np.empty((192, 256, 4), dtype=np.uint8)
metrics = []
board = Image.new('RGB', (4 * 256, 3 * 276), (5, 7, 22))
draw = ImageDraw.Draw(board)
for i, a in enumerate(images):
    b = images[(i + 1) % 12]
    fx, fy = flow(a, b)
    bx, by = flow(b, a)
    tile = np.stack([fx, fy, bx, by], axis=-1)
    raw[i // 4 * 64:(i // 4 + 1) * 64, i % 4 * 64:(i % 4 + 1) * 64] = np.rint(np.clip(tile / 48 * .5 + .5, 0, 1) * 255).astype(np.uint8)
    # Shape-preserving midway preview using the same field reconstruction as the realtime shader.
    fx, fy, bx, by = [resize(q, 256) for q in [fx, fy, bx, by]]
    midway = (warp(a, -fx * .5, -fy * .5) + warp(b, -bx * .5, -by * .5)) * .5
    coverage = np.clip(((midway - .5) * 20 + .65) / 1.3, 0, 1)
    coverage = coverage * coverage * (3 - 2 * coverage)
    color = np.rint(np.array([5, 7, 22]) * (1 - coverage[..., None]) + np.array([230, 245, 255]) * coverage[..., None]).astype(np.uint8)
    x, y = i % 4 * 256, i // 4 * 276
    board.paste(Image.fromarray(color), (x, y + 20))
    draw.text((x + 8, y + 4), f'{i:02} -> {(i + 1) % 12:02} / FLOW MID', fill=(150, 192, 221))
    roi = (a > .2) | (b > .2)
    metrics.append({'pair': [i, (i + 1) % 12], 'meanFlowPixels': float(np.hypot(fx, fy)[roi].mean()),
                    'alignmentSDFErrorBefore': float(np.abs(a - b)[roi].mean()),
                    'alignmentSDFErrorAfter': float(np.abs(a - warp(b, fx, fy))[roi].mean())})
    print(f'pair {i:02}: mean flow {metrics[-1]["meanFlowPixels"]:.2f}px', flush=True)

path = root / 'Textures/EnergyCluster_ShellFlow64.rgba8'
path.write_bytes(raw.tobytes())
board.save(root / 'QA/flow-midpoints.png')
manifest['version'] = '4.1-hybrid-motion-sdf'
manifest['textures'] = [t for t in manifest['textures'] if t['file'].endswith('.png')]
manifest['textures'].append({'file': 'Textures/EnergyCluster_ShellFlow64.rgba8', 'size': [256, 192],
    'cellSize': [64, 64], 'targetFormat': 'RGBA8 UNorm', 'colorSpace': 'linear data (sRGB off)',
    'channels': 'RG: forward XY pixels, BA: backward XY pixels for each interval',
    'decode': '(RGBA * 2 - 1) * 48 pixels in the original 256px frame',
    'fileFormat': 'raw RGBA8, row-major top-to-bottom; NOT an RGBA color image',
    'filter': 'bilinear', 'wrap': 'clamp', 'mipmaps': False, 'bytes': path.stat().st_size,
    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
r = manifest['resources']
r['flowRGBA8NoMipsBytes'] = raw.nbytes
r['totalUncompressedNoMipsBytes'] = r['R8NoMipsBytes'] + raw.nbytes
r['totalReductionPercent'] = 100 * (1 - r['totalUncompressedNoMipsBytes'] / r['baselineRGBA8NoMipsBytes'])
r['totalFileBytes'] = r['shellPngBytes'] + raw.nbytes
r['fileReductionPercent'] = 100 * (1 - r['totalFileBytes'] / r['baselinePngBytes'])
r['RGBA8FallbackNoMipsBytes'] = r['R8NoMipsBytes'] * 4 + raw.nbytes
manifest['animation']['shell'] = '12 shape frames, low-res bidirectional motion compensation + signed-distance interpolation'
manifest['animation']['interpolationLimit'] = 'Approximate optical flow; new/disappearing topology can still contract. Not equivalent to newly drawn intermediate frames.'
manifest['checks']['motionAlignment'] = metrics
(root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(r))
