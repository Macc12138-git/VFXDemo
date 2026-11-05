#!/usr/bin/env node
// Authoring-only previews. No Unity files, runtime atlases, or imported assets are created.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { draw, meta, layers } from '../src/hd/mortar-assembly.js';

const flags = {};
for (let i = 2; i < process.argv.length; i += 2) flags[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const { createCanvas, loadImage } = await import(flags['canvas-module'] ? pathToFileURL(resolve(flags['canvas-module'])).href : '@napi-rs/canvas');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(flags.out ?? join(root, 'output/hd/mortar-assembly/v1'));
if (target.split(/[\\/]/).includes('Assets')) throw new Error('Authoring output must stay outside Assets.');
mkdirSync(target, { recursive: true });
const width = +(flags.width ?? 1024), height = width * 3 / 4;
const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
const opts = { ...meta.options };
export function background(g, w, h, mode) {
  g.fillStyle = { dark: '#252630', light: '#e2ddd7', warm: '#c28155', checker: '#969396' }[mode];
  g.fillRect(0, 0, w, h);
  if (mode === 'checker') {
    g.fillStyle = '#b6b2b3';
    for (let y = 0; y < h; y += 24) for (let x = 0; x < w; x += 24)
      if ((x / 24 + y / 24) % 2 === 0) g.fillRect(x, y, 24, 24);
  }
}
const times = [0, 0.08, 0.16, 0.21, 0.30, 0.42, 0.50, 0.54, 0.63, 0.75, 0.91, 1.2];
const tileW = 320, tileH = 264, sheet = createCanvas(tileW * 4, tileH * 3), sg = sheet.getContext('2d');
for (let i = 0; i < times.length; i++) {
  draw(ctx, times[i], opts);
  const snapshot = await loadImage(canvas.toBuffer('image/png'));
  const x = i % 4 * tileW, y = Math.floor(i / 4) * tileH;
  sg.save(); sg.translate(x, y); background(sg, tileW, tileH, i < 8 ? 'dark' : 'light');
  sg.drawImage(snapshot, 0, 24, 320, 240); sg.font = '13px sans-serif';
  sg.fillStyle = i < 8 ? '#bdb9ad' : '#57535a'; sg.fillText(`${times[i].toFixed(2)} s`, 14, 20); sg.restore();
}
writeFileSync(join(target, 'contact.png'), sheet.toBuffer('image/png'));
draw(ctx, 0.21, opts);
const peak = canvas.toBuffer('image/png'), snapshot = await loadImage(peak);
writeFileSync(join(target, 'preview.png'), peak);
for (const bg of ['dark', 'light', 'warm', 'checker']) {
  const poster = createCanvas(width, height), pg = poster.getContext('2d');
  background(pg, width, height, bg); pg.drawImage(snapshot, 0, 0);
  writeFileSync(join(target, `poster-${bg}.png`), poster.toBuffer('image/png'));
}
const split = createCanvas(960, 528), lg = split.getContext('2d');
const sampleTimes = { smoke: 0.30, flash: 0.21, arcs: 0.30, sparks: 0.26, debris: 0.28, glow: 0.21 };
for (let i = 0; i < layers.length; i++) {
  const layer = layers[i]; draw(ctx, sampleTimes[layer], { ...opts, layer });
  const snapshot = await loadImage(canvas.toBuffer('image/png'));
  writeFileSync(join(target, `${layer}.png`), canvas.toBuffer('image/png'));
  const x = i % 3 * 320, y = Math.floor(i / 3) * 264;
  lg.save(); lg.translate(x, y); background(lg, 320, 264, 'dark'); lg.drawImage(snapshot, 0, 24, 320, 240);
  lg.font = '13px sans-serif'; lg.fillStyle = '#bdb9ad'; lg.fillText(`${layer.toUpperCase()}  /  ${sampleTimes[layer].toFixed(2)} s`, 14, 20); lg.restore();
}
writeFileSync(join(target, 'layers.png'), split.toBuffer('image/png'));
if (flags.frames === 'true') {
  mkdirSync(join(target, 'frames'), { recursive: true });
  for (let i = 0; i <= meta.duration * meta.fps; i++) {
    draw(ctx, i / meta.fps, opts);
    writeFileSync(join(target, 'frames', `assembly-${String(i).padStart(3, '0')}.png`), canvas.toBuffer('image/png'));
  }
}
const source = 'src/hd/mortar-assembly.js';
writeFileSync(join(target, 'authoring.json'), JSON.stringify({ ...meta, options: opts, source,
  sourceSha256: createHash('sha256').update(readFileSync(join(root, source))).digest('hex'),
  authorRequest: '制作该特效；仅 GIF 中制造迫击炮的独立特效，不含角色、工具、炮体或场景。',
  reference: 'User-supplied 400x200 GIF, 25 frames / 1.03s; reconstructed, not extracted pixels.',
  authorizedStage: 'authoring-and-preview-only', status: 'awaiting-author-review', unityImported: false,
  outputSize: [width, height], previewFramesOnly: true,
  differences: ['Occluded shapes are newly drawn; no claim of pixel-identical extraction.',
    'The reference cuts off with residual smoke; this one-shot adds a short fade to end empty at 1.2s.',
    'Canvas CPU authoring preview, not a compiled Unity Shader, imported prefab, or device-performance test.'],
}, null, 2));
console.log(`${meta.name} / ${meta.version} / seed=${opts.seed}\n${target}`);
