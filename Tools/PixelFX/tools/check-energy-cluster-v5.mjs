#!/usr/bin/env node
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { meta, options, makeSurfaceData, membrane, radiusAt, makeSphere, field, renderCPU } from '../src/hd/energy-cluster-v5.js';
const arg = k => process.argv[process.argv.indexOf(k) + 1];
const round = process.argv.includes('--round') ? arg('--round') : 'final';
const canvasPath = process.argv.includes('--canvas-module') ? arg('--canvas-module') : '@napi-rs/canvas';
const { createCanvas } = await import(canvasPath.startsWith('/') ? pathToFileURL(canvasPath).href : canvasPath);
const root = 'Tools/PixelFX/output/hd/EnergyCluster/V5', out = `${root}/QA/${round}`;
await mkdir(out, { recursive: true }); await mkdir(`${root}/Textures`, { recursive: true });
const texture = makeSurfaceData(), hash = bytes => createHash('sha256').update(bytes).digest('hex');
// PNG encoder preserves all four independent data channels; no premultiplied Canvas round-trip.
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ 0xffffffff) >>> 0; };
function chunk(type, bytes) { const t = Buffer.from(type), buf = Buffer.alloc(bytes.length + 12); buf.writeUInt32BE(bytes.length, 0); t.copy(buf, 4); bytes.copy(buf, 8); buf.writeUInt32BE(crc32(Buffer.concat([t, bytes])), bytes.length + 8); return buf; }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(texture.size, 0); ihdr.writeUInt32BE(texture.size, 4); ihdr[8] = 8; ihdr[9] = 6;
const scan = Buffer.alloc(texture.size * (texture.size * 4 + 1));
for (let y = 0; y < texture.size; y++) Buffer.from(texture.data.buffer, y * texture.size * 4, texture.size * 4).copy(scan, y * (texture.size * 4 + 1) + 1);
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(scan)), chunk('IEND', Buffer.alloc(0))]);
await writeFile(`${root}/Textures/EnergyCluster_SurfaceData.png`, png);
await writeFile(`${root}/Textures/EnergyCluster_SurfaceData.rgba`, texture.data);
const none = { front: false, back: false, core: false, volume: false, glow: false };
const shell = { layers: { ...none, front: true, back: true } };
const small = (time, input = {}, background = 'original', diameter = 150) => { const c = createCanvas(224, 224); renderCPU(c, time, input, texture, { background, diameter }); return c; };
const contact = createCanvas(896, 936), cg = contact.getContext('2d'); cg.fillStyle = '#050716'; cg.fillRect(0, 0, 896, 936);
for (let i = 0; i < 8; i++) {
  const t = i * .3 + .12, x = i % 4 * 224, y = Math.floor(i / 4) * 468;
  cg.fillStyle = '#abcddd'; cg.font = '11px monospace'; cg.fillText(`t=${t.toFixed(2)} COMPOSITE / SHELL`, x + 8, y + 14);
  cg.drawImage(small(t), x, y + 20); cg.drawImage(small(t, shell), x, y + 244);
}
await writeFile(`${out}/contact.png`, contact.toBuffer('image/png'));
const board = createCanvas(896, 672), bg = board.getContext('2d');
for (const [i, background] of ['original', 'black', 'light', 'checker'].entries()) {
  bg.drawImage(small(.42, {}, background, 150), i * 224, 0);
  bg.drawImage(small(.42, {}, background, 112), i * 224, 224);
  bg.drawImage(small(.42, {}, background, 56), i * 224, 448);
}
await writeFile(`${out}/background-scale.png`, board.toBuffer('image/png'));
const layers = createCanvas(1120, 224), lg = layers.getContext('2d');
for (const [i, layer] of Object.keys(none).entries()) lg.drawImage(small(.42, { layers: { ...none, [layer]: true } }), i * 224, 0);
await writeFile(`${out}/layers.png`, layers.toBuffer('image/png'));
const channels = createCanvas(1024, 256), tg = channels.getContext('2d'), ci = tg.createImageData(1024, 256);
for (let k = 0; k < 4; k++) for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
  const v = texture.data[(y * 256 + x) * 4 + k], i = (y * 1024 + k * 256 + x) * 4; ci.data.set([v, v, v, 255], i);
}
tg.putImageData(ci, 0, 0); await writeFile(`${out}/data-channels.png`, channels.toBuffer('image/png'));
let count = 0, seamDelta = 0, nearLoop = 0, moving = 0;
for (let v = .01; v < 1; v += .03) for (let u = 0; u < 1; u += .025) {
  const a = membrane(u, v, 0, {}, texture), b = membrane(u, v, meta.duration, {}, texture);
  assert.deepEqual(a, b); assert.equal(membrane(u, v, .42, { dissolve: 1 }, texture).coverage, 0);
  assert(Object.values(a).every(Number.isFinite));
  seamDelta = Math.max(seamDelta, Math.abs(membrane(0, v, .42, {}, texture).coverage - membrane(1, v, .42, {}, texture).coverage));
  nearLoop += Math.abs(membrane(u, v, meta.duration - 1e-6, {}, texture).coverage - a.coverage);
  moving += Math.abs(membrane(u, v, .42, {}, texture).coverage - membrane(u, v, .42 + 1 / 60, {}, texture).coverage);
  count++;
}
for (const width of [.2, .48, .75]) for (const dissolve of [0, .5, .95, 1]) for (let v = .05; v < 1; v += .15) for (let u = 0; u < 1; u += .08) {
  assert(Object.values(membrane(u,v,.42,{width,dissolve},texture)).every(Number.isFinite));
}
assert(seamDelta < 1e-10); assert(nearLoop / count < .0001); assert(moving > 1);
for (let y = -1.2; y < 1.2; y += .08) for (let x = -1.2; x < 1.2; x += .08) {
  assert.deepEqual(field(x, y, .42, { layers: none }, texture), [5/255, 7/255, 22/255]);
  const c = field(x, y, .42, {}, texture); assert(c.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  const off = { layers: { ...none, front: true } };
  assert.deepEqual(field(x,y,.42,{...off,backColor:'#ff4400'},texture), field(x,y,.42,off,texture));
}
for (const seed of [1, 37, 206]) assert.equal(hash(makeSurfaceData(seed).data), hash(makeSurfaceData(seed).data));
const mesh = makeSphere(); assert(mesh.indices.every(i => i < mesh.vertices.length / 5));
assert.equal(radiusAt([0, 0, 1], 0, .055), radiusAt([0, 0, 1], meta.duration, .055));
const source = await readFile('Tools/PixelFX/src/hd/energy-cluster-v5.js'); assert(!/Math\.random|\bDate\b/.test(source.toString()));
await copyFile('Tools/PixelFX/src/hd/energy-cluster-v5.js', `${out}/energy-cluster-v5.source.js`);
const manifest = { effect: 'EnergyCluster', version: meta.version, stage: 'authoring WebGL prototype - no Unity import', meta,
  source: 'src/hd/energy-cluster-v5.js', sourceSha256: hash(source), seed: 37,
  assets: { texture: 'Textures/EnergyCluster_SurfaceData.png', raw: 'Textures/EnergyCluster_SurfaceData.rgba', dimensions: [256,256], channels: { R:'U vector encoded 0..1', G:'V vector encoded 0..1', B:'authored curved membrane structure', A:'edge erosion data, NOT opacity' },
    colorSpace: 'linear non-color data', alpha:'independent data, must NOT premultiply', uv:'U=atan2(z,x)/TAU wrapped; V=acos(y)/PI, north pole V=0. PNG row0=V0. Raw upload without Y flip.', wrap:'Repeat', filter:'Bilinear', mipmaps:false, pngBytes:png.length, rgba8NoMipsBytes:256*256*4, dataSha256:hash(texture.data) },
  mesh:{vertices:mesh.vertices.length/5,trianglesPerFullSpherePass:mesh.indices.length/3},
  material:{blend:'ONE / ONE_MINUS_SRC_ALPHA (premultiplied output)',depthWrite:false,depthTest:false,geometry:'unit radius sphere centered at origin, orthographic authoring view',colors:'CSS display RGB in WebGL prototype, not Unity linear/HDR-calibrated',order:['background/halo quad','back membrane culled front','volume/core quad','front membrane culled back']},
  timing:{fullLoopSeconds:2.4,localFlowPhaseSeconds:.48,meaning:'looping preview clock, not lifetime',flow:'local UV distortion, main longitudinal transport remains enabled'},
  sourceType:'new curve-authored mask and analytic flow, NOT literal hand-painted artwork, NOT reference flipbook',
  limitations:['CPU screenshots approximate sphere intersections, not exact GPU mesh parity','WebGL prototype, Unity shader/API/Player not validated','No PC GPU/CPU/batching budget claim','Orthographic authoring camera; Unity scene depth/sorting unvalidated'] };
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest,null,2)+'\n');
const report = { result:'PASS',round,sourceSha256:hash(source), count,seamMax:seamDelta,nearLoopMean:nearLoop/count,mean60HzCoverageChange:moving/count,
  checks:['static deterministic data','exact loop','UV U seam','dissolve=1 shell cleared','finite field','all layers disabled','disabled-back-color independence','indexed mesh bounds'],
  limitation:'CPU approximation only; actual WebGL visual/controls/playback checked separately. Not a Unity performance validation.' };
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report));
