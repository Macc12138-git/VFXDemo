#!/usr/bin/env node
// Offline authoring stills and deterministic checks. Not Unity runtime/performance validation.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { draw, drawColor, drawLight, sample, meta } from '../src/hd/energy-cluster.js';
const arg = key => process.argv[process.argv.indexOf(key) + 1];
const modulePath = process.argv.includes('--canvas-module') ? arg('--canvas-module') : '@napi-rs/canvas';
const { createCanvas } = await import(modulePath.startsWith('/') ? pathToFileURL(modulePath).href : modulePath);
const round = process.argv.includes('--round') ? arg('--round') : 'final';
const out = resolve('Tools/PixelFX/output/hd/EnergyCluster/V1', round);
await mkdir(out, { recursive: true });
const digest = data => createHash('sha256').update(data).digest('hex');
function render(t, opts = {}, bg, size = 640, scale = 1.45, pass = draw) {
  const c = createCanvas(size, size), g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
  g.translate(size / 2, size / 2); g.scale(scale * size / 640, scale * size / 640); pass(g, t, opts);
  return c;
}
const times = [0, .13, .33, .67, 1, 1.4, 2, 2.6, 3.4];
const contact = createCanvas(1080, 1140), cg = contact.getContext('2d');
cg.fillStyle = '#080d1b'; cg.fillRect(0, 0, 1080, 1140);
for (const [i, t] of times.entries()) {
  const c = render(t, {}, '#070c1b', 360);
  cg.drawImage(c, i % 3 * 360, Math.floor(i / 3) * 380 + 20);
  cg.fillStyle = '#b7ccdf'; cg.font = '13px monospace'; cg.fillText(`${t.toFixed(2)}s`, i % 3 * 360 + 12, Math.floor(i / 3) * 380 + 19);
}
await writeFile(`${out}/contact.png`, contact.toBuffer('image/png'));
await writeFile(`${out}/hero.png`, render(.33, {}, '#070c1b').toBuffer('image/png'));
await writeFile(`${out}/transparent.png`, render(.67).toBuffer('image/png'));
const board = createCanvas(1280, 820), bg = board.getContext('2d');
for (const [i, color] of ['#070c1b', '#dedfdf', '#655346', '#26323f'].entries()) {
  bg.fillStyle = color; bg.fillRect(i * 320, 0, 320, 820);
  bg.drawImage(render(.67, {}, undefined, 320), i * 320, 0);
  for (const [j, px] of [128, 80, 48].entries()) {
    const c = render(.67, {}, undefined, 320, px / 200 * 2);
    bg.drawImage(c, i * 320, 300 + j * 135);
    bg.fillStyle = i === 1 ? '#222' : '#c7d3dd'; bg.font = '12px monospace'; bg.fillText(`${px}px body`, i * 320 + 14, 346 + j * 135);
  }
}
await writeFile(`${out}/background-scale.png`, board.toBuffer('image/png'));
await copyFile(new URL('../src/hd/energy-cluster.js', import.meta.url), `${out}/energy-cluster.source.js`);
const pixels = (t, o = {}, pass = draw) => render(t, o, undefined, 320, 1.45, pass).getContext('2d').getImageData(0, 0, 320, 320).data;
assert.equal(digest(pixels(.67)), digest(pixels(.67)), 'determinism');
assert.equal(digest(pixels(0)), digest(pixels(meta.duration)), 'exact loop endpoints');
const before = pixels(meta.duration - .001), after = pixels(.001);
const seamMean = before.reduce((sum, v, i) => sum + Math.abs(v - after[i]), 0) / before.length;
assert(seamMean < .5, 'near-loop continuity, including lightning events');
let maxExtent = 0, edgePixels = 0, minAlpha = 255, maxAlpha = 0;
for (const seed of [1, 37, 206]) for (let i = 0; i < 120; i++) {
  const f = sample(i / 30, { seed });
  for (const pt of [...f.faces.flatMap(x => x.points), ...f.arcs.flatMap(x => [...x.points, ...(x.branch ?? [])]), ...f.tongues.flatMap(x => x.points), ...f.rim]) {
    assert(pt.slice(0, 2).every(Number.isFinite)); maxExtent = Math.max(maxExtent, Math.abs(pt[0]), Math.abs(pt[1]));
  }
  const px = pixels(i / 30, { seed });
  for (let k = 0; k < px.length; k += 4) {
    const x = k / 4 % 320, y = Math.floor(k / 4 / 320), a = px[k + 3];
    minAlpha = Math.min(minAlpha, a); maxAlpha = Math.max(maxAlpha, a);
    if ((x < 2 || y < 2 || x > 317 || y > 317) && a > 0) edgePixels++;
  }
}
assert.equal(edgePixels, 0, 'no cropped color/light'); assert.equal(minAlpha, 0); assert.equal(maxAlpha, 255);
const names = ['core', 'volume', 'shell', 'arcs', 'light'];
for (const name of names) {
  // Arcs are intermittent; find an event before testing its switch.
  const t = name === 'arcs' ? Array.from({ length: 120 }, (_, i) => i / 30).find(t => sample(t).arcs.length) : .67;
  assert.notEqual(digest(pixels(t)), digest(pixels(t, { layers: { [name]: false } })), `switch ${name}`);
}
const none = pixels(.67, { layers: Object.fromEntries(names.map(k => [k, false])) });
assert(none.every(x => x === 0), 'all layers off clears');
const variants = { seed: 206, radius: 80, coreSize: .3, pulse: .1, distortion: 0, shellWidth: .5, arcAmount: 0, glow: 0, core: '#ff2266', inner: '#ff22ff', body: '#11ff55', shell: '#ff8811', arc: '#ff4422' };
for (const [key, value] of Object.entries(variants)) {
  const t = ['arc', 'arcAmount'].includes(key) ? Array.from({ length: 120 }, (_, i) => i / 30).find(t => sample(t).arcs.length) : .67;
  assert.notEqual(digest(pixels(t)), digest(pixels(t, { [key]: value })), `option ${key}`);
}
assert(pixels(.67, { glow: 0 }, drawLight).every(x => x === 0), 'light off is empty');
assert.equal(digest(pixels(.67, {}, drawColor)), digest(pixels(.67, { glow: 0 }, drawColor)), 'glow cannot change color coverage');
const source = await readFile(new URL('../src/hd/energy-cluster.js', import.meta.url), 'utf8');
assert(!/Math\.random|\bDate\b/.test(source), 'pure seeded authoring');
const report = { result: 'PASS', stage: 'Canvas authoring only', round, sourceSha256: digest(source), meta,
  checks: ['3 seeds / 360 times', 'determinism', 'exact loop endpoints', 'near-loop continuity', 'finite geometry', 'transparent alpha', 'no cropped default edges', '5 layer switches', `${Object.keys(variants).length} options`, 'independent light pass'],
  maxExtent, edgePixels, seamMean, unity: 'not imported; no Unity performance claim' };
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ result: report.result, round, out, maxExtent, edgePixels, sourceSha256: report.sourceSha256 }, null, 2));
