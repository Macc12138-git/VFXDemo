#!/usr/bin/env node
// Lossless, padded color + additive-light atlases for the Unity URP Brazier prefab.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createFrame, painterFor, composite } from '../src/core/index.js';
import { renderFrames, contactSheet, edgeFade } from './lib/fxlib.mjs';
import { encodePNG } from './lib/png.mjs';
import * as brazier from '../src/fx/fire/brazier.js';
import * as flame from '../src/unity/brazier-flame.js';

const target = resolve(process.argv[2] ?? 'output/unity/Brazier');
mkdirSync(target, { recursive: true });
for (const [name, mod] of [['Brazier', brazier], ['BrazierFlame', flame]]) {
  const [w, h] = mod.meta.size, frames = 90, cols = 10, rows = 9, gutter = 2;
  const cw = w + gutter * 2, ch = h + gutter * 2, aw = cols * cw, ah = rows * ch;
  const color = new Uint8Array(aw * ah * 4), light = new Uint8Array(color.length);
  const opts = { ...mod.meta.options }, f = createFrame(w, h);
  for (let i = 0; i < frames; i++) {
    f.color.fill(0); f.light.fill(0);
    const p = painterFor(f).place(...mod.meta.origin);
    mod.draw(p, i / 30, opts); edgeFade(f);
    for (let y = -gutter; y < h + gutter; y++) for (let x = -gutter; x < w + gutter; x++) {
      const sx = Math.min(w - 1, Math.max(0, x)), sy = Math.min(h - 1, Math.max(0, y));
      const c = f.color[sy * w + sx], l = f.light[sy * w + sx];
      const ax = (i % cols) * cw + gutter + x, ay = Math.floor(i / cols) * ch + gutter + y;
      const j = (ay * aw + ax) * 4;
      color[j] = c & 255; color[j + 1] = (c >>> 8) & 255; color[j + 2] = (c >>> 16) & 255; color[j + 3] = c >>> 24;
      light[j] = l & 255; light[j + 1] = (l >>> 8) & 255; light[j + 2] = (l >>> 16) & 255;
      light[j + 3] = (l & 0xffffff) ? 255 : 0;
    }
  }
  writeFileSync(join(target, `${name}_Color.png`), encodePNG(aw, ah, color));
  writeFileSync(join(target, `${name}_Light.png`), encodePNG(aw, ah, light));
  writeFileSync(join(target, `${name}.json`), JSON.stringify({
    source: name === 'Brazier' ? 'pixelfx/fire/brazier' : 'pixelfx/src/unity/brazier-flame.js',
    frameSize: [w, h], pivotTopLeft: mod.meta.origin, pixelsPerUnit: 32,
    fps: 30, duration: 3, frames, cols, rows, gutter, cellSize: [cw, ch], atlasSize: [aw, ah],
    rowOrder: 'top-to-bottom', color: 'straight alpha, sRGB', light: 'additive RGB, linear import',
  }, null, 2));
  const r = renderFrames({ mod, meta: mod.meta, id: name }, { bg: 'ground' });
  writeFileSync(join(target, `${name}_Preview.png`), contactSheet({ meta: mod.meta, id: name }, r, { max: 12, zoom: 2 }));
  console.log(`${name}: ${frames} frames @ 30 fps, ${aw}x${ah}, color + light -> ${target}`);
}
