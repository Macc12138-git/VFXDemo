#!/usr/bin/env node
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { meta, makeSampler, renderCPU, sampleMotes, shellAt, field, options } from '../src/hd/energy-cluster-v4.js';
const arg = k => process.argv[process.argv.indexOf(k) + 1];
const round = process.argv.includes('--round') ? arg('--round') : 'final';
const canvasPath = process.argv.includes('--canvas-module') ? arg('--canvas-module') : '@napi-rs/canvas';
const { createCanvas, loadImage } = await import(canvasPath.startsWith('/') ? pathToFileURL(canvasPath).href : canvasPath);
const root = 'Tools/PixelFX/output/hd/EnergyCluster/V4.3', out = `${root}/QA/${round}`;
await mkdir(out, { recursive: true });
const image = await loadImage(`${root}/Textures/EnergyCluster_ShellSDF.png`);
const atlas = createCanvas(image.width, image.height), ag = atlas.getContext('2d'); ag.drawImage(image, 0, 0);
const rgba = ag.getImageData(0, 0, image.width, image.height).data, data = new Uint8Array(image.width * image.height);
for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
const sampler = makeSampler({ data, width: image.width, height: image.height });
const small = (time, input = {}, background = 'original', frameSize = 256, width = 256, height = width) => {
  const canvas = createCanvas(width, height); renderCPU(canvas, time, input, sampler, { background, frameSize }); return canvas;
};
const contact = createCanvas(1280, 1104), cg = contact.getContext('2d'); cg.fillStyle = '#050716'; cg.fillRect(0, 0, 1280, 1104);
for (let i = 0; i < 20; i++) { const x = i % 5 * 256, y = Math.floor(i / 5) * 276; cg.drawImage(small((i + .5) / meta.fps), x, y + 20); cg.fillStyle = '#abcddd'; cg.font = '11px monospace'; cg.fillText(`${i} -> ${(i + 1) % 20} / MIDPOINT`, x + 8, y + 14); }
await writeFile(`${out}/contact-midpoints.png`, contact.toBuffer('image/png'));
const board = createCanvas(1024, 768), bg = board.getContext('2d'); bg.fillStyle = '#050716'; bg.fillRect(0, 0, 1024, 768);
for (const [i, background] of ['original', 'black', 'light', 'checker'].entries()) {
  bg.drawImage(small(.18, {}, background), i * 256, 0);
  bg.drawImage(small(.18, {}, background, 128), i * 256, 256);
  bg.drawImage(small(.18, {}, background, 64), i * 256, 512);
}
await writeFile(`${out}/background-scale.png`, board.toBuffer('image/png'));
const layers = createCanvas(1280, 256), lg = layers.getContext('2d');
const none = { shell: false, core: false, volume: false, glow: false, motes: false };
for (const [i, layer] of ['shell', 'core', 'volume', 'glow', 'motes'].entries()) lg.drawImage(small(.18, { layers: { ...none, [layer]: true } }), i * 256, 0);
await writeFile(`${out}/layers.png`, layers.toBuffer('image/png'));
const modes = createCanvas(768, 512), mg = modes.getContext('2d');
for (const [i, interpolation] of ['step', 'alpha', 'distance'].entries()) {
  mg.drawImage(small(.18, { interpolation }, 'original'), i * 256, 0);
  mg.drawImage(small(.18, { interpolation, layers: { ...none, shell: true } }, 'original'), i * 256, 256);
}
await writeFile(`${out}/interpolation-modes.png`, modes.toBuffer('image/png'));
let nearBoundaryDelta = 0, stepBoundaryDelta = 0, fieldCount = 0;
for (let i = 0; i < 20; i++) for (let y = -85; y <= 85; y += 3) for (let x = -85; x <= 85; x += 3) {
  const t = i / meta.fps;
  nearBoundaryDelta += Math.abs(shellAt(x, y, t - .000001, sampler).alpha - shellAt(x, y, t + .000001, sampler).alpha);
  stepBoundaryDelta += Math.abs(shellAt(x, y, t - .000001, sampler, 'step').alpha - shellAt(x, y, t + .000001, sampler, 'step').alpha);
  assert.deepEqual(shellAt(x, y, 0, sampler), shellAt(x, y, .48, sampler));
  for (const mode of ['distance', 'step', 'alpha']) assert(Object.values(shellAt(x, y, t + .02, sampler, mode)).every(Number.isFinite));
  const off = field(x, y, t, { layers: none }, sampler, [5, 7, 22]);
  assert.deepEqual(off, [5 / 255, 7 / 255, 22 / 255]);
  assert(field(x, y, t + .02, {}, sampler, [5, 7, 22]).every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  const noGlow = { layers: { glow: false, motes: false } };
  assert.deepEqual(field(x, y, t, { ...noGlow, glow: 0 }, sampler, [5, 7, 22]), field(x, y, t, { ...noGlow, glow: 1.4 }, sampler, [5, 7, 22]));
  const noShell = { layers: { shell: false, motes: false } };
  assert.deepEqual(field(x, y, t, { ...noShell, shellColor: '#ff8844' }, sampler, [5, 7, 22]), field(x, y, t, noShell, sampler, [5, 7, 22]));
  fieldCount++;
}
assert(nearBoundaryDelta < stepBoundaryDelta * .01, 'Interpolation must remove the hold discontinuity.');
for (const seed of [1, 37, 206]) for (const time of [0, .02, .18, .479999]) {
  const motes = sampleMotes(time, { seed }); assert(motes.length <= 5);
  const loopMotes = sampleMotes(time + .48, { seed });
  assert(motes.length === loopMotes.length && motes.every((m, i) => Math.abs(m.alpha - loopMotes[i].alpha) < 1e-10));
  for (const mote of motes) assert(mote.points.flat().every(Number.isFinite) && mote.alpha >= 0 && mote.alpha <= 1);
}
const source = await readFile('Tools/PixelFX/src/hd/energy-cluster-v4.js');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert(!/Math\.random|\bDate\b/.test(source.toString()));
await copyFile('Tools/PixelFX/src/hd/energy-cluster-v4.js', `${out}/energy-cluster-v4.source.js`);
const report = { result: 'PASS', round, sourceSha256: hash(source), meta, fieldCount,
  nearBoundaryMeanAlphaDelta: nearBoundaryDelta / fieldCount, stepBoundaryMeanAlphaDelta: stepBoundaryDelta / fieldCount,
  checks: ['CPU finite field', 'disabled layers empty', '20 subframe contacts', 'all-background scale samples',
           'shell exact loop', 'motes 3 seeds and loop', 'distance interpolation continuity', 'independent disabled-layer color/glow', 'deterministic authoring'],
  limitation: 'Continuity is not proof of perceptual quality, correspondence or target GPU performance. Browser shader/playback checked separately.' };
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
