// Static review frames and scoped technical checks, not a runtime atlas exporter.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { render, stateAt, options, meta } from '../src/hd/energy-shockwave.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canvasArg = process.argv.indexOf('--canvas-module');
if (canvasArg < 0) throw Error('Pass --canvas-module with your available @napi-rs/canvas path');
const { createCanvas } = await import(process.argv[canvasArg + 1]);
const roundArg = process.argv.indexOf('--round'), round = roundArg < 0 ? 'final' : process.argv[roundArg + 1];
if (!/^[a-z0-9-]+$/i.test(round)) throw Error('Invalid review folder');
const dest = path.join(root, 'output/hd/EnergyBurst/Current', round); fs.mkdirSync(dest, { recursive: true });
const times = [.035, .09, .17, .27, .4, .54, .7, .84, .94];
const sheet = createCanvas(1200, 1290), sg = sheet.getContext('2d');
sg.fillStyle = '#101823'; sg.fillRect(0, 0, sheet.width, sheet.height);
for (let i = 0; i < times.length; i++) {
  const frame = createCanvas(640, 640); render(frame, times[i], {}, { background: 'black' });
  sg.drawImage(frame, i % 3 * 400, Math.floor(i / 3) * 430 + 24, 400, 400);
  sg.fillStyle = '#bcd6f2'; sg.font = '13px sans-serif'; sg.fillText(`${times[i].toFixed(3)} s`, i % 3 * 400 + 12, Math.floor(i / 3) * 430 + 17);
}
fs.writeFileSync(path.join(dest, 'contact.png'), sheet.toBuffer('image/png'));
const hero = createCanvas(640, 640); render(hero, .27); fs.writeFileSync(path.join(dest, 'hero.png'), hero.toBuffer('image/png'));
const rim = createCanvas(640,640);render(rim,.27,{layers:{flash:false,flow:false,front:true,electric:false}},{background:'black'});
fs.writeFileSync(path.join(dest,'rim-only.png'),rim.toBuffer('image/png'));
const arcs = createCanvas(1280,640), ag = arcs.getContext('2d');
for (const [i,time] of [.17,.27].entries()) {
  const c=createCanvas(640,640);render(c,time,{layers:{flash:false,front:false,electric:false}},{background:'black'});
  ag.drawImage(c,i*640,0);
}
fs.writeFileSync(path.join(dest,'flow-only.png'),arcs.toBuffer('image/png'));
function hash(time, o = {}) { const c = createCanvas(640, 640); render(c, time, o, { background: 'transparent' }); return crypto.createHash('sha256').update(c.toBuffer('image/png')).digest('hex'); }
function metrics(time, o = {}, size = 640) {
  const c = createCanvas(size, size); render(c, time, o, { background: 'transparent', scale: size / 640 });
  const pixels = c.getContext('2d').getImageData(0, 0, size, size).data; let count = 0, edge = 0, max = 0;
  let left=size,top=size,right=-1,bottom=-1;
  for (let i = 0; i < pixels.length; i += 4) { const a = pixels[i + 3]; max = Math.max(max, a); if (a > 3) { count++; const x = i / 4 % size, y = Math.floor(i / 4 / size);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y); if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) edge++; } }
  return { count, edge, max, bounds:count?[left,top,right,bottom]:null, aspect:count?(right-left+1)/(bottom-top+1):null };
}
const sample = Array.from({ length: 113 }, (_, i) => i / 120), values = sample.map(t => metrics(t));
const report = { meta, options: options(), renderer: 'Canvas2D procedural geometry authoring preview',
  deterministic: hash(.27) === hash(.27), differentSeed: hash(.27) !== hash(.27, { seed: 14 }),
  emptyStart: metrics(0).count === 0, emptyEnd: metrics(.94).count === 0,
  endsEmptyForDurations: [.4, .94, 2].every(duration => metrics(duration, { duration }).count === 0),
  invisibleBeforeStart: metrics(-.1).count === 0, arbitrarySeek: hash(.54) === (hash(.1), hash(.54)),
  noClipping: values.every(v => v.edge === 0), maxCoverage: Math.max(...values.map(v => v.count)) / (640 * 640),
  rangeNoClipping: [4, 37, 92].every(seed => [100, 270].every(radius => [.09, .27, .54, .8].every(t => metrics(t, { seed, radius }).edge === 0))),
  parameters: { radiusChanges: hash(.27, { radius: 140 }) !== hash(.27), noPerspective: hash(.27, { projection: .3 }) === hash(.27),
    circularEnvelope: [.17,.27,.4,.54].every(t=>{const a=metrics(t).aspect;return a>.9&&a<1.1;}),
    frontKeepsAdvancing: [.09,.17,.27,.4,.54,.7].every((t,i,a)=>i===0||stateAt(t).radius>stateAt(a[i-1]).radius),
    pulseChanges: hash(.27,{pulse:0})!==hash(.27,{pulse:1}),
    bodyColorChanges: hash(.27,{bodyColor:'#f06020'})!==hash(.27),
    flowColorChanges: hash(.27,{flowColor:'#ff80a0'})!==hash(.27),
    hotColorChanges: hash(.27,{hotColor:'#88ff44'})!==hash(.27),
    electricAmountChanges: hash(.27,{electric:0})!==hash(.27),
    postFlashThinCoverage: [.27,.4,.54].every(t=>metrics(t,{layers:{flash:false}}).count/(640*640)<.04),
    durationPreservesPhase: hash(.27) === hash(.54, { duration: 1.88 }), allLayersOffEmpty: metrics(.27, { layers: { flash: false, flow: false, front: false, electric: false } }).count === 0 },
  layers: Object.fromEntries(['flash', 'flow', 'front', 'electric'].map(key => [key,
    metrics(key === 'flash' ? .09 : .27, { layers: { flash: false, flow: false, front: false, electric: false, [key]: true } }).count > 0])),
  samples: times.map(t => ({ time: t, ...stateAt(t) })), resources: { newTextures: 0, newFlipbooks: 0 },
  validation: 'Geometry/PNG checks only. Dynamic browser review separate. No Unity, PC Player or GPU/CPU budget certification.' };
const qa = createCanvas(1200, 840), q = qa.getContext('2d'); q.fillStyle = '#101823'; q.fillRect(0, 0, 1200, 840);
for (const [i, bg] of ['dark', 'black', 'light', 'checker', 'warm', 'transparent'].entries()) {
  const c = createCanvas(640, 640); render(c, .3, {}, { background: bg }); q.drawImage(c, i % 3 * 400, Math.floor(i / 3) * 420 + 20, 400, 400);
  q.fillStyle = '#a6bad0'; q.font = '14px sans-serif'; q.fillText(bg, i % 3 * 400 + 12, Math.floor(i / 3) * 420 + 18);
}
fs.writeFileSync(path.join(dest, 'backgrounds.png'), qa.toBuffer('image/png'));
const small = createCanvas(900, 620), smg = small.getContext('2d'); smg.fillStyle = '#050716'; smg.fillRect(0, 0, 900, 620);
for (const [i, size] of [128, 192, 256].entries()) for (const [j, time] of [.27, .54].entries()) {
  const c = createCanvas(size, size); render(c, time, {}, { scale: size / 640 }); smg.drawImage(c, i * 300 + (300 - size) / 2, j * 300 + 25);
  smg.fillStyle = '#9aadc6'; smg.font = '12px sans-serif'; smg.fillText(`${size}px / ${time}s`, i * 300 + 20, j * 300 + 20);
}
fs.writeFileSync(path.join(dest, 'game-size.png'), small.toBuffer('image/png'));
report.sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'src/hd/energy-shockwave.js'))).digest('hex');
fs.copyFileSync(path.join(root,'src/hd/energy-shockwave.js'),path.join(dest,'energy-shockwave.source.js'));
fs.writeFileSync(path.join(dest, 'checks.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ dest, checks: { deterministic: report.deterministic, emptyStart: report.emptyStart, emptyEnd: report.emptyEnd, noClipping: report.noClipping, ...report.parameters } }, null, 2));
if (![report.deterministic, report.differentSeed, report.emptyStart, report.emptyEnd,
  report.endsEmptyForDurations, report.invisibleBeforeStart, report.arbitrarySeek, report.noClipping,
  report.rangeNoClipping, ...Object.values(report.parameters), ...Object.values(report.layers)].every(Boolean)) process.exitCode = 1;
