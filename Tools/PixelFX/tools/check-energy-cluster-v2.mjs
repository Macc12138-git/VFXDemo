#!/usr/bin/env node
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { meta, makeNoise, noiseAt, renderCPU, context, field } from '../src/hd/energy-cluster-v2.js';
const arg = k => process.argv[process.argv.indexOf(k) + 1];
const round = process.argv.includes('--round') ? arg('--round') : 'final';
const path = process.argv.includes('--canvas-module') ? arg('--canvas-module') : '@napi-rs/canvas';
const { createCanvas } = await import(path.startsWith('/') ? pathToFileURL(path).href : path);
const out = `Tools/PixelFX/output/hd/EnergyCluster/V2/${round}`; await mkdir(out, { recursive: true });
const noise = makeNoise(), small = (time, opts = {}, background = 'dark', size = 320, diameter = 165) => { const c = createCanvas(size, size); renderCPU(c, time, opts, { background, diameter, noise }); return c; };
const sheet = createCanvas(960, 1014), g = sheet.getContext('2d'), times = [0, .16, .32, .5, .8, 1.2, 2, 2.8, 3.6];
g.fillStyle = '#070c1b'; g.fillRect(0, 0, 960, 1014);
for (const [i, t] of times.entries()) { const x = i % 3 * 320, y = Math.floor(i / 3) * 338; g.drawImage(small(t), x, y + 18); g.fillStyle = '#b3cddd'; g.font = '12px monospace'; g.fillText(`${t.toFixed(2)} s`, x + 12, y + 18); }
await writeFile(`${out}/contact.png`, sheet.toBuffer('image/png'));
await writeFile(`${out}/hero.png`, small(.32, {}, 'dark', 640, 310).toBuffer('image/png'));
await writeFile(`${out}/transparent.png`, small(.32, {}, 'transparent', 640, 310).toBuffer('image/png'));
const board = createCanvas(960, 940), b = board.getContext('2d');
for (const [i, background] of ['dark', 'light', 'checker'].entries()) { b.drawImage(small(.32, {}, background), i * 320, 0); for (const [j, diameter] of [96, 56, 32].entries()) { const c = createCanvas(320, 200); renderCPU(c, .32, {}, { background, diameter, noise }); b.drawImage(c, i * 320, 330 + j * 200); } }
await writeFile(`${out}/background-scale.png`, board.toBuffer('image/png'));
const tex = createCanvas(noise.size, noise.size), tg = tex.getContext('2d'), im = tg.createImageData(noise.size, noise.size); im.data.set(noise.data); tg.putImageData(im, 0, 0); await writeFile(`${out}/FlowNoise.png`, tex.toBuffer('image/png'));
await copyFile(new URL('../src/hd/energy-cluster-v2.js', import.meta.url), `${out}/energy-cluster-v2.source.js`);
const source = await (await import('node:fs/promises')).readFile(new URL('../src/hd/energy-cluster-v2.js', import.meta.url));
const hash = x => createHash('sha256').update(x).digest('hex');
assert(!/Math\.random|\bDate\b/.test(source.toString()));
assert.equal(hash(makeNoise(37).data), hash(noise.data)); assert.notEqual(hash(makeNoise(1).data), hash(noise.data));
for (const [u, v] of [[0, 0], [.2, .71], [-.13, 2.17]]) assert(Math.abs(noiseAt(noise, u, v) - noiseAt(noise, u + 1, v + 1)) < 1e-10, 'tile wrap');
let finiteSamples = 0, maxShell = 0, seamError = 0;
for (const seed of [1, 37, 206]) {
  const tex = makeNoise(seed);
  for (const t of [0, .08, .32, .65, 1.2, 2, 2.7, 3.6, 3.999]) {
    const f = context(t, {seed}, tex), f0 = context(0, {seed}, tex), f4 = context(4, {seed}, tex);
    const before = context(3.9999, {seed}, tex), after = context(.0001, {seed}, tex);
    for (let y = -1.8; y <= 1.8; y += .08) for (let x = -1.8; x <= 1.8; x += .08) {
      const s = field(x, y, f); assert([...s.col, s.alpha, ...s.light, s.shell].every(Number.isFinite));
      assert(s.alpha >= 0 && s.alpha <= 1 && s.shell >= 0 && s.shell <= 1); finiteSamples++;
      if (t === 0) {
        assert.deepEqual(field(x, y, f0), field(x, y, f4), 'exact field loop');
        const a = field(x, y, before), b = field(x, y, after);
        seamError += Math.abs(a.alpha - b.alpha) + a.col.reduce((sum, v, k) => sum + Math.abs(v - b.col[k]), 0);
      }
      if (s.shell > .1) maxShell = Math.max(maxShell, Math.hypot(x, y));
    }
  }
}
assert(maxShell < 1.25, 'controlled shell bounds');
const none = { core:false, volume:false, shell:false, arcs:false, light:false };
const ctx = context(.32), ctxLight = context(.32, {glow:0}), ctxOff = context(.32, {layers:none});
const ctxGone = context(.32, {dissolve:1}), ctxSolid = context(.32, {dissolve:0});
let solidCoverage = 0, erodedCoverage = 0;
for (let y = -1.1; y <= 1.1; y += .04) for (let x = -1.1; x <= 1.1; x += .04) {
  const a = field(x,y,ctx), b = field(x,y,ctxLight), off = field(x,y,ctxOff);
  assert.deepEqual(a.col,b.col); assert.equal(a.alpha,b.alpha, 'glow independent of coverage'); assert(b.light.every(v=>v===0));
  assert.equal(off.alpha,0); assert(off.light.every(v=>v===0));
  assert.equal(field(x,y,ctxGone).shell,0, 'dissolve=1 clears shell');
  solidCoverage += field(x,y,ctxSolid).shell; erodedCoverage += a.shell;
}
assert(solidCoverage > erodedCoverage * 1.15, 'threshold actually erodes the shell');
const cParity = createCanvas(800, 640); renderCPU(cParity,.32,{}, {background:'dark',diameter:300,noise});
await writeFile(`${out}/cpu-browser-parity.png`,cParity.toBuffer('image/png'));
const shell = createCanvas(960,320), sh = shell.getContext('2d');
for(const [i,dissolve] of [0,meta.options.dissolve,1].entries()) sh.drawImage(small(.32,{dissolve,layers:{core:false,volume:false,shell:true,arcs:false,light:false}}),i*320,0);
await writeFile(`${out}/dissolve-endpoints.png`,shell.toBuffer('image/png'));
const report = { result:'PASS',round, stage: 'CPU reference for real WebGL authoring shader', sourceSha256: hash(source), meta, finiteSamples,maxShell,seamError,
  checks:['3 seeds','deterministic static noise','repeat sampling','finite field and alpha','exact and near loop','controlled shell bounds','dissolve endpoints','empty disabled layers','independent color and light','default background and scale contact sheets'],unity:'not imported; WebGL compile/playback is validated separately' };
if (process.argv.includes('--study')) {
  const study = createCanvas(960, 680), st = study.getContext('2d'); st.fillStyle = '#070c1b'; st.fillRect(0, 0, 960, 680);
  for (const [i, dissolve] of [.35, .4, .43, .46, .49, .52].entries()) { st.drawImage(small(.32, {dissolve}), i % 3 * 320, Math.floor(i / 3) * 340 + 20); st.fillStyle = '#abcddd'; st.font = '12px monospace'; st.fillText(`dissolve=${dissolve}`, i % 3 * 320 + 10, Math.floor(i / 3) * 340 + 18); }
  await writeFile(`${out}/dissolve-study.png`, study.toBuffer('image/png'));
}
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ out, hash: report.sourceSha256 }));
