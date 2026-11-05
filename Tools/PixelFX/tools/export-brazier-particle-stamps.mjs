#!/usr/bin/env node
// Single-particle artwork adapted from pixelfx / Sprite Fusion fire, MIT, Hugo Duprez 2026.
// These are independent static stamps, NOT a baked animation of the complete effect.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { createFrame, painterFor, fit, hex, mix, WHITE } from '../src/core/index.js';
import { flameTongue, noiseFor, hotFirst, BIG_LAYERS, smokePuff, firePuff } from '../src/fx/fire/_lib.js';
import * as brazier from '../src/fx/fire/brazier.js';
import { encodePNG } from './lib/png.mjs';

const target = resolve(process.argv[2] ?? 'output/unity/BrazierParticles');
mkdirSync(target, { recursive: true });
const H = hotFirst(fit(brazier.meta.options.palette, 9));
function rgba(frame) {
  const bytes = new Uint8Array(frame.w * frame.h * 4);
  frame.color.forEach((c, i) => {
    bytes[i * 4] = c & 255; bytes[i * 4 + 1] = c >>> 8 & 255;
    bytes[i * 4 + 2] = c >>> 16 & 255; bytes[i * 4 + 3] = c >>> 24;
  });
  return bytes;
}
function save(name, w, h, data) { writeFileSync(join(target, name + '.png'), encodePNG(w, h, data)); }

// Each row is one fixed flame silhouette. Shuriken chooses a row when a particle is born;
// lifetime, emission, movement, noise, color and size are all simulated in Unity.
const fw = 32, fh = 48, variants = 8, atlas = new Uint8Array(fw * fh * variants * 4);
for (let i = 0; i < variants; i++) {
  const f = createFrame(fw, fh), p = painterFor(f), nl = noiseFor(3), t = i * 0.31;
  const n = (rate, seed = 0, off = 0) => nl(t, rate, seed, off);
  flameTongue(p, 16, 45, 35 + (i % 3) * 2, 5.2, (i % 5 - 2) * 1.3, n, 71 + i * 19, H, BIG_LAYERS, 0.42, 1.2);
  atlas.set(rgba(f), i * fw * fh * 4);
}
save('FlameVariants', fw, fh * variants, atlas);

const smoke = createFrame(32, 32);
smokePuff(painterFor(smoke), 16, 17, 0.62, 9, hex('#bcb6c4'), true, 1.8);
save('SmokePuff', 32, 32, rgba(smoke));
const puff = createFrame(16, 16);
firePuff(painterFor(puff), 8, 9, 0.8, 4, 0.1, H, 0);
save('FirePuff', 16, 16, rgba(puff));

const spark = createFrame(8, 16), sp = painterFor(spark);
sp.rect(3, 4, 2, 7, hex('#ff9c37')); sp.rect(3, 4, 2, 4, hex('#ffeaa3'));
sp.rect(3, 4, 2, 2, WHITE);
save('SparkStreak', 8, 16, rgba(spark));
const ember = createFrame(8, 8), ep = painterFor(ember);
ep.rect(3, 2, 2, 4, hex('#ffce64')); ep.rect(2, 3, 4, 2, hex('#ffce64'));
ep.rect(3, 3, 2, 2, WHITE);
save('Ember', 8, 8, rgba(ember));
const sparkVariants = createFrame(16, 32), sv = painterFor(sparkVariants);
sv.rect(7, 3, 2, 8, hex('#ff9c37')); sv.rect(7, 3, 2, 4, hex('#ffeaa3')); sv.rect(7, 3, 2, 2, WHITE);
sv.rect(7, 22, 2, 4, hex('#ffce64')); sv.rect(6, 23, 4, 2, hex('#ffce64')); sv.rect(7, 23, 2, 2, WHITE);
save('SparkVariants', 16, 32, rgba(sparkVariants));

// Alpha carries a smooth radial falloff; RGB is white. Glow is an additive particle, never a Light.
const glow = new Uint8Array(128 * 128 * 4);
for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
  const d = Math.hypot((x + 0.5 - 64) / 64, (y + 0.5 - 64) / 64);
  const k = d >= 1 ? 0 : Math.pow(1 - d, 3);
  const j = (y * 128 + x) * 4;
  glow[j] = glow[j + 1] = glow[j + 2] = 255; glow[j + 3] = Math.round(k * 255);
}
save('SoftGlow', 128, 128, glow);

// Reuse only the non-moving iron stand/bowl portion; hide the original flame, smoke and spark draws
// by drawing the prop's source functions separately. No animated pixels are present in this stamp.
const body = createFrame(48, 40), bp = painterFor(body).place(24, 37);
const I = fit(brazier.meta.options.iron, 5), fl = 0.8;
const leg = (x0, y0, x1, y1) => {
  bp.line(x0, y0, x1, y1, I[0]); bp.line(x0 + 1, y0, x1 + 1, y1, I[2]); bp.line(x0 + 2, y0, x1 + 2, y1, I[0]);
};
bp.ellipse(0, -9, 9, 1.8, d => d > 0.6 ? I[2] : 0);
leg(-6, -17, -12, -1); leg(4, -17, 10, -1);
bp.rect(-14, -1, 5, 1, I[2]); bp.rect(-15, 0, 6, 1, I[0]); bp.px(-15, -1, I[3]);
bp.rect(9, -1, 5, 1, I[2]); bp.rect(9, 0, 6, 1, I[0]); bp.px(13, -1, I[3]);
bp.rect(-1, -16, 3, 15, I[0]); bp.rect(0, -16, 1, 15, mix(I[3], H[4], 0.15 * fl));
bp.rect(-2, -1, 5, 1, I[2]); bp.rect(-2, 0, 5, 1, I[0]);
bp.ellipse(0, -9, 9, 1.8, (d, a) => Math.sin(a) > 0 && d > 0.55 ? d > 0.85 ? I[0] : I[3] : 0);
bp.ellipse(0, -25, 15, 3, (d, a) => Math.sin(a) < 0 && d > 0.7 ? I[d > 0.88 ? 0 : 3] : 0);
bp.ellipse(0, -26, 14, 3, (d) => d < 0.85 ? H[6] : I[1]);
bp.shade(-16, -26, 16, -16, (x, y) => {
  const v = (y + 25) / 9, hw = 15 * Math.sqrt(Math.max(0, 1 - v * v * 0.9)) - (v > 0.5 ? (v - 0.5) * 6 : 0);
  if (Math.abs(x) > hw + 0.5 || y < -25) return;
  if (Math.abs(x) > hw - 0.5 || v > 0.92) return I[0];
  if (y < -24) return mix(I[3], H[4], 0.5 * fl);
  if (y < -23) return I[2];
  if (y < -22) return Math.round(x) % 4 === 0 ? mix(I[4], H[4], 0.25 * fl) : I[0];
  return x < -6.75 ? I[2] : x < 3.75 ? I[1] : I[0];
});
save('BrazierProp', 48, 40, rgba(body));
writeFileSync(join(target, 'ParticleStamps.json'), JSON.stringify({
  flame: { columns: 1, rows: variants, frameSize: [fw, fh], animation: false, selection: 'random fixed row at birth' },
  simulation: 'Unity Shuriken: independent particles, not whole-effect flipbook',
  layers: ['Flames', 'Sparks', 'Smoke', 'Glow'], lightComponents: 0,
  source: 'pixelfx fire/brazier + fire/_lib.js; Patch / Hugo Duprez; MIT',
}, null, 2));

// Extract the actual source recipe, with hashes and explicit mapping limitations. Fail on
// changed source patterns instead of silently exporting stale hand-tuned simulation numbers.
const source = readFileSync(new URL('../src/fx/fire/brazier.js', import.meta.url), 'utf8');
const library = readFileSync(new URL('../src/fx/fire/_lib.js', import.meta.url), 'utf8');
const block = (text, start, end) => {
  const begin = text.indexOf(start), finish = text.indexOf(end, begin + start.length);
  if (begin < 0 || finish < 0) throw new Error('Source recipe block changed: ' + start);
  return text.slice(begin, finish);
};
const match = (text, regex) => { const m = text.match(regex); if (!m) throw new Error('Source recipe pattern changed: ' + regex); return m; };
const range = (text, name) => match(text, new RegExp(name + '\\s*[:=]\\s*-?r\\.range\\((-?[\\d.]+),\\s*(-?[\\d.]+)\\)')).slice(1,3).map(Number);
const optionText = block(source, 'burn(p, t, TONGUES, {', 'mid:');
const option = name => Number(match(optionText, new RegExp('\\b' + name + ':\\s*([\\d.]+)'))[1]);
const ppu = 32, u = values => values.map(x => x / ppu);
const tongueData = JSON.parse(match(source, /const TONGUES = (\[[\s\S]*?\n\]);/)[1].replace(/,\s*]/g, ']'));
const fast = block(source, 'looped(t, D, 60', '\n  });');
const plume = block(library, '// the plume:', '// flame puffs shed');
const puffs = block(library, '// flame puffs shed', 'for (let i = 0; i < TT.length;');
const licks = block(library, '// licks torn off', 'for (const [x, y, k, s, f]');
const embers = block(library, '// embers carried', '// light: a broad');
const smokeLife = match(optionText, /smokeLife:\s*\[([\d.]+),\s*([\d.]+)\]/).slice(1,3).map(Number);
const velocity = (text, key) => u(range(text, key));
const fastSpeedY = velocity(fast, 'vy');
const fastY = u(match(fast, /y: RIM - r.range\(([\d.]+),\s*([\d.]+)\)/).slice(1,3).map(Number));
const fastDrag = match(fast, /age, 0, (-?[\d.]+), ([\d.]+), ([\d.]+)\)/).slice(1).map(Number);
const emberDrag = match(embers, /age, 0, (-?[\d.]+), ([\d.]+), ([\d.]+)\)/).slice(1).map(Number);
const smokeDrag = match(plume, /o.wind \?\? [\d.]+, (-?[\d.]+), ([\d.]+), ([\d.]+)\)/).slice(1).map(Number);
const puffDrag = match(puffs, /q.fire\), 0, (-?[\d.]+), ([\d.]+), ([\d.]+)\)/).slice(1).map(Number);
const smokeContinuationDrag = match(puffs, /o.wind \?\? [\d.]+, (-?[\d.]+), ([\d.]+), ([\d.]+)\)/).slice(1).map(Number);
const smokeProbability = Number(match(puffs,/smokes = r.chance\(([\d.]+)\)/)[1]);
const fireLife = range(puffs,'fire'), meanFireLife = (fireLife[0]+fireLife[1])*0.5;
const driftVelocity = (v,a,k,t) => a/k + (v-a/k)*Math.exp(-k*t);
const recipe = {
  source: 'pixelfx/src/fx/fire/brazier.js + fire/_lib.js',
  sourceHashes: { brazier: createHash('sha256').update(source).digest('hex'), library: createHash('sha256').update(library).digest('hex') },
  duration: brazier.meta.duration, fps: brazier.meta.fps, seed: brazier.meta.options.seed, pixelsPerUnit: ppu,
  coordinateConversion: 'Unity x = JS x / 32, Unity y = -JS y / 32; time remains seconds; drag remains 1/s',
  palette: brazier.meta.options.palette,
  tongues: tongueData.map(([x,y,h,w,back]) => ({ x: x/ppu, y: -y/ppu, height: (2 + option('height')*h)/ppu, halfWidth: w/ppu, back: !!back })),
  sparks: {
    rate: Number(match(fast, /looped\(t, D, (\d+)/)[1]) / brazier.meta.duration,
    lifetime: range(fast,'life'), startX: [-8/ppu,8/ppu], startY: fastY,
    velocityX: [-40/ppu,40/ppu], velocityY: fastSpeedY,
    accelerationX: 0, accelerationY: -fastDrag[0]/ppu, dragX: fastDrag[1], dragY: fastDrag[2],
    sourceMotion: 'vx = side * range(10,40); same side also sets x. Lateral wobble amplitude 3..8 px, frequency 1.8..3.2 rad/s.',
  },
  embers: {
    rate: option('embers'), lifetime: range(embers,'life'), startX: [-option('spread')/ppu,option('spread')/ppu],
    startY: [option('height')*0.3/ppu,option('height')*0.8/ppu],
    velocityX: velocity(embers,'vx'), velocityY: velocity(embers,'vy'),
    accelerationX: 0, accelerationY: -emberDrag[0]/ppu, dragX: emberDrag[1], dragY: emberDrag[2],
    sourceMotion: 'Additional x sine drift 7 px at 2.3 rad/s, y sine drift 2 px at 3 rad/s; 15 percent cross-shaped embers.',
  },
  smoke: {
    rate: option('smoke'), lifetime: smokeLife,
    startX: [-option('spread')*0.7/ppu,option('spread')*0.7/ppu], startY: [option('height')*0.8/ppu,(option('height')*0.8+6)/ppu],
    velocityX: velocity(plume,'vx'), velocityY: velocity(plume,'vy'),
    accelerationX: option('wind')/ppu, accelerationY: -smokeDrag[0]/ppu, dragX: smokeDrag[1], dragY: smokeDrag[2],
    radius: [option('smokeSize')*0.7/ppu,option('smokeSize')*1.1/ppu],
    sourceMotion: 'Puff radius multiplier 0.65 + min(1,age*2.5)*0.45 + age*0.4; opacity envelope min(1,age*12)*min(1,remaining*2.4)*0.58.',
  },
  flamePuffs: {
    rate: tongueData.length * option('puffs'), lifetime: fireLife, startX: [-0.25,0.25], startY: [0.2,1],
    spawnPositionIsNativeApproximation: true,
    velocityX: velocity(puffs,'vx'), velocityY: velocity(puffs,'vy'),
    accelerationX: 0, accelerationY: -puffDrag[0]/ppu, dragX: puffDrag[1], dragY: puffDrag[2],
    smokeProbability,
    sourceMotion: 'Born at an individual animated tongue tip; 45 percent continue as smoke for 0.8..1.4 seconds.',
  },
  detachedLicks: {
    rate: tongueData.length * option('licks'), lifetime: [0.26,0.26], startX: [-0.2,0.2], startY: [0.2,1],
    velocityX: velocity(licks,'vx'), velocityY: velocity(licks,'vy'),
    accelerationX: 0, accelerationY: 0, dragX: 0, dragY: 0,
    spawnPositionIsNativeApproximation: true,
    sourceMotion: 'Born at an animated tongue tip; shrinks over 0.26 seconds.',
  },
  smokeFromPuffs: {
    rate: tongueData.length * option('puffs') * smokeProbability,
    lifetime: range(puffs,'sl'), startX: [-0.25,0.25], startY: [0.35,1.15],
    spawnPositionIsNativeApproximation: true,
    velocityX: velocity(puffs,'vx').map(v => v * Math.exp(-puffDrag[1]*meanFireLife)*0.6),
    velocityY: velocity(puffs,'vy').map(v => driftVelocity(v,-puffDrag[0]/ppu,puffDrag[2],meanFireLife)*0.6+6/ppu),
    accelerationX: option('wind')/ppu, accelerationY: -smokeContinuationDrag[0]/ppu,
    dragX: smokeContinuationDrag[1], dragY: smokeContinuationDrag[2],
    sourceMotion: 'Original type conversion is approximated as an independent smoke layer emitter. Initial velocity evaluated at mean fire lifetime, inherited at 60 percent plus upward 6 px/s.',
  },
  glow: { radiusPx: option('glowR'), strength: option('glow'), flameHeightPx: option('height'), implementation: 'Soft additive particles; no Unity Light component or ParticleSystem Lights module' },
  nativeMappingLimits: [
    'Core flame tongues are procedural row-by-row shapes, not source particle emitters. Static tongue variants plus native size/noise/emission approximate their deformation.',
    'Shuriken normalized velocity curves use the source analytic drag equation at mean lifetime. Random per-particle lifetimes and source sinusoidal lateral wobble are approximated.',
    'Shape modules approximate the source correlations and moving tongue-tip spawn positions. Noise is not the same as source seeded loopNoise.',
    'Source flame-to-smoke transitions are represented by an independent smoke emitter, not an exact shared-particle type conversion.',
    'Static prop coals and glow shapes are visual adaptations; original pixel-buffer glow radius/strength are retained as reference, not mislabeled as Unity Light settings.',
  ],
};
writeFileSync(join(target, 'BrazierSourceRecipe.json'), JSON.stringify(recipe, null, 2));
console.log('Exported static flame variants, smoke, sparks, ember, glow and prop to ' + target);
