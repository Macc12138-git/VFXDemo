// Independent HD authoring study from the supplied construction GIF, not extracted game art.
// Uses pixelfx's seeded RNG; shapes and choreography are newly authored, with no actor or prop.
import { Rng, fbm } from '../core/math.js';

export const meta = {
  id: 'hd/mortar-assembly', name: '迫击炮制造 · 独立装配闪爆', version: 'v1',
  size: [1024, 768], pivot: [512, 594], duration: 1.2, referenceDuration: 1.03,
  fps: 60, loop: false, actor: false, prop: false,
  pulses: [0.16, 0.50, 0.71],
  options: { seed: 22, scale: 1, flash: 1, smoke: 1, glow: 0.35, layer: 'combined' },
};
export const layers = ['smoke', 'flash', 'arcs', 'sparks', 'debris', 'glow'];
const TAU = Math.PI * 2;
const clamp = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const out = u => 1 - Math.pow(1 - clamp(u), 3);
const cache = new Map();
const stamps = new WeakMap();

function artwork(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const rng = new Rng(seed), puffs = [], chips = [], stars = [], flashes = [];
  const clouds = [
    [0.065, -115, -120, 78], [0.08, -40, -176, 86], [0.095, 54, -142, 83],
    [0.105, 130, -91, 65], [0.09, -143, -40, 55], [0.13, -52, -52, 67],
    [0.12, 54, -54, 59], [0.16, 12, -216, 54],
    [0.46, -93, -112, 73], [0.47, 0, -165, 78], [0.49, 89, -116, 61],
    [0.50, -130, -35, 46], [0.52, 43, -53, 51],
    [0.68, -74, -108, 65], [0.69, 20, -155, 64], [0.71, 115, -76, 47],
    [0.73, -121, -37, 43],
  ];
  for (const [born, x, y, radius] of clouds) {
    puffs.push({ born, x, y, radius, life: born < 0.2 ? rng.range(0.57, 0.74) : rng.range(0.38, 0.46),
      drift: rng.range(-23, 21), lift: rng.range(36, 68), rotation: rng.range(-0.6, 0.6),
      phase: rng.range(0, TAU) });
  }
  meta.pulses.forEach((born, beat) => {
    flashes.push({ born, beat, rotation: rng.range(-0.055, 0.055) });
    for (let i = 0; i < 10; i++) {
      const a = rng.range(-Math.PI, 0.12), r = rng.range(72, 215);
      stars.push({ born: born + rng.range(0.015, 0.07), life: rng.range(0.13, 0.27),
        x: Math.cos(a) * r, y: -18 + Math.sin(a) * r * 0.65,
        vx: Math.cos(a) * rng.range(38, 135), vy: rng.range(-85, -28),
        size: rng.range(3, 8), rotation: rng.range(-0.5, 0.5), phase: rng.range(0, TAU) });
    }
    for (let i = 0; i < 5; i++) {
      chips.push({ born: born + rng.range(0.025, 0.075), life: rng.range(0.22, 0.35),
        x: rng.range(-135, 135), y: rng.range(-95, -30), vx: rng.range(-185, 185),
        vy: rng.range(-330, -190), size: rng.range(4, 9), spin: rng.range(-10, 10),
        angle: rng.range(0, TAU), light: rng.next() > 0.5 });
    }
  });
  const data = { puffs, chips, stars, flashes };
  if (cache.size > 12) cache.clear();
  cache.set(seed, data);
  return data;
}

function polygon(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (const p of pts.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
}

function smokeStamp(ctx, variant) {
  let bank = stamps.get(ctx);
  if (!bank) { bank = new Map(); stamps.set(ctx, bank); }
  if (bank.has(variant)) return bank.get(variant);
  const size = 192;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size)
    : ctx.canvas.ownerDocument ? ctx.canvas.ownerDocument.createElement('canvas') : new ctx.canvas.constructor(size, size);
  c.width = c.height = size;
  const g = c.getContext('2d'), image = g.createImageData(size, size);
  const lobes = [[-.20,-.10,.62],[.22,-.20,.52],[-.27,.22,.47],[.23,.24,.46],[0,.01,.65]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + .5) / size * 2 - 1, ny = (y + .5) / size * 2 - 1;
    const coarse = fbm(nx * 1.7 + 4, ny * 1.7 + 8, 30 + variant, 2) * 0.5 + 0.5;
    let distance = 1;
    for (const [cx, cy, r] of lobes) distance = Math.min(distance, Math.hypot(nx-cx, ny-cy)-r);
    const alpha = (1 - smooth(-0.11, 0.065, distance + (coarse - .5) * .09)) * (1 - smooth(.86, .99, Math.hypot(nx,ny)));
    const value = clamp(.49 - .18 * ny + (coarse - .5) * .20);
    const i = (y * size + x) * 4;
    image.data[i] = 105 + value * 63; image.data[i+1] = 102 + value * 61;
    image.data[i+2] = 116 + value * 57; image.data[i+3] = alpha * 228;
  }
  g.putImageData(image, 0, 0); bank.set(variant, c); return c;
}

function smoke(ctx, data, t, density) {
  for (const [index, p] of data.puffs.entries()) {
    const age = t - p.born, u = age / p.life;
    if (u <= 0 || u >= 1) continue;
    const swell = out(age / 0.15), fade = smooth(0, 0.035, age) * (1 - smooth(0.38, 1, u));
    const radius = p.radius * (0.30 + swell * 0.80 + 0.20 * u);
    ctx.save();
    ctx.translate(p.x * swell + p.drift * age, p.y * swell - p.lift * age);
    ctx.rotate(p.rotation + Math.sin(age * 3 + p.phase) * 0.07);
    ctx.scale(radius, radius * 0.88);
    ctx.globalAlpha = Math.min(1, fade * density * 0.64);
    ctx.drawImage(smokeStamp(ctx, index % 3), -1.2, -1.2, 2.4, 2.4);
    ctx.restore();
  }
}

function flashEnvelope(age) {
  return smooth(0, 0.030, age) * (1 - smooth(0.075, 0.135, age));
}

function flash(ctx, data, t, strength, back = false) {
  for (const f of data.flashes) {
    const age = t - f.born, a = flashEnvelope(age);
    if (age <= 0 || age >= 0.155 || a <= 0) continue;
    const grow = 0.69 + 0.31 * out(age / 0.047), decay = smooth(0.06, 0.155, age);
    ctx.save(); ctx.rotate(f.rotation); ctx.scale(grow * (f.beat === 1 ? -1 : 1), grow);
    ctx.globalAlpha = a * Math.min(1, strength);
    if (!back) {
      const shards = [
        [[-259,-23],[-258,-91],[-239,-48],[-218,-62],[-204,-5],[-170,12],[-127,16],[-145,-16],[-133,-49],[-109,-4],[-88,-12],[-60,22],[-29,35],[-74,46],[-156,36],[-215,15]],
        [[18,42],[62,25],[78,-18],[96,-3],[114,-85],[130,-45],[144,5],[179,-13],[197,-77],[213,-55],[230,-108],[240,-38],[218,18],[151,42],[70,52]],
        [[-32,28],[-15,3],[6,12],[20,-15],[30,18],[56,26],[21,40],[-6,42]],
      ];
      shards.forEach((points, i) => {
        const sway = Math.sin(f.beat * 2 + i) * 9;
        const p = points.map(([x,y])=>[x + decay * Math.sign(x) * 22, y * (1 - decay * .65) * strength + sway]);
        polygon(ctx,p); ctx.fillStyle = '#ffe958'; ctx.fill();
        ctx.save(); ctx.scale(1, .46); ctx.translate(0, 34);
        polygon(ctx,p.map(([x,y])=>[x*.98,y])); ctx.fillStyle='#fffbb8'; ctx.fill(); ctx.restore();
      });
    }
    const upper = [
      [-170, -143, -0.48, 0.80], [68, -246, 0.19, 1], [204, -106, 0.56, 0.72],
    ];
    if (back) upper.forEach(([x, y, rot, s], i) => {
      const drift = decay * 25;
      ctx.save(); ctx.translate(x + drift * Math.sign(x), y - drift); ctx.rotate(rot + f.rotation);
      ctx.scale(s * strength * (1 - decay * 0.4), s * strength);
      polygon(ctx, [[-34,25],[-22,-8],[-12,-50],[8,-61],[12,-40],[30,-43],[28,15],[14,7],[-5,25]]);
      ctx.fillStyle = i === 1 ? '#fff784' : '#ffed68'; ctx.fill(); ctx.restore();
    });
    ctx.restore();
  }
}

function ribbon(ctx, pts, width, alpha, color) {
  if (alpha <= 0) return;
  const outer = [], inner = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0], dy = next[1] - prev[1], len = Math.hypot(dx, dy) || 1;
    const w = width * Math.pow(Math.sin(Math.PI * i / (pts.length - 1)), 0.8);
    outer.push([pts[i][0] - dy / len * w, pts[i][1] + dx / len * w]);
    inner.push([pts[i][0] + dy / len * w, pts[i][1] - dx / len * w]);
  }
  polygon(ctx, outer.concat(inner.reverse()));
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill();
}

function arcs(ctx, t) {
  meta.pulses.forEach((born, beat) => {
    const age = t - born, u = age / 0.39;
    if (u <= 0 || u >= 1) return;
    const r = 211 + 107 * out(u), a = smooth(0, 0.035, age) * (1 - smooth(0.12, 0.39, age));
    for (const [from, to, w, k] of [[0.03, 1.14, 2.6, 0.40], [1.42, 2.85, 2.6, 0.34], [3.21, 4.4, 1.8, 0.17], [5.30, 6.23, 2.0, 0.22]]) {
      const pts = Array.from({ length: 55 }, (_, i) => {
        const q = from + (to - from) * i / 54 + beat * 0.025;
        return [Math.cos(q) * r, Math.sin(q) * r * 0.205 + 4];
      });
      ribbon(ctx, pts, w * (1 - u * 0.7), a * k, '#fff4db');
    }
    for (const side of [-1, 1]) {
      const pts = Array.from({ length: 35 }, (_, i) => {
        const s = i / 34;
        return [side * (r - 10 + (side > 0 ? 54 : 30) * s - 17 * s * s), 12 - (side > 0 ? 112 : 65) * Math.pow(s, 1.7) - 30 * u * s];
      });
      ribbon(ctx, pts, 4.2 * (1 - u), a * 0.35, '#fff5e6');
    }
  });
}

function sparks(ctx, data, t) {
  for (const s of data.stars) {
    const age = t - s.born, u = age / s.life;
    if (u <= 0 || u >= 1) continue;
    const a = Math.pow(Math.sin(Math.PI * u), 0.5), r = s.size * a;
    ctx.save(); ctx.translate(s.x + s.vx * age, s.y + s.vy * age + 70 * age * age);
    ctx.rotate(s.rotation); ctx.globalAlpha = a;
    polygon(ctx, [[0, -r], [r * 0.22, -r * 0.2], [r * 0.75, 0], [r * 0.2, r * 0.21],
      [0, r], [-r * 0.2, r * 0.2], [-r * 0.75, 0], [-r * 0.2, -r * 0.2]]);
    ctx.fillStyle = '#fff075'; ctx.fill(); ctx.restore();
  }
}

function debris(ctx, data, t) {
  for (const p of data.chips) {
    const age = t - p.born, u = age / p.life;
    if (u <= 0 || u >= 1) continue;
    const drag = (1 - Math.exp(-age * 3)) / 3;
    ctx.save(); ctx.translate(p.x + p.vx * drag, p.y + p.vy * age + 420 * age * age);
    ctx.rotate(p.angle + age * p.spin); ctx.scale(p.size, p.size);
    ctx.globalAlpha = smooth(0, 0.025, age) * (1 - smooth(0.55, 1, u)) * 0.76;
    polygon(ctx, [[-0.7, -0.7], [0.8, -0.3], [0.4, 0.95], [-0.1, 0.2]]);
    ctx.fillStyle = p.light ? '#d5d0d5' : '#85828f'; ctx.fill(); ctx.restore();
  }
}

function glow(ctx, t, strength) {
  for (const born of meta.pulses) {
    const age = t - born, a = flashEnvelope(age) * strength;
    if (a <= 0) continue;
    ctx.save(); ctx.scale(1, 0.48); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(0, -15, 3, 0, -15, 330);
    g.addColorStop(0, '#fff19755'); g.addColorStop(0.35, '#ffce3720'); g.addColorStop(1, '#ffc52a00');
    ctx.fillStyle = g; ctx.fillRect(-330, -345, 660, 660); ctx.restore();
  }
}

// Canvas-only authoring analogue. Does not claim Unity Shader parity or engine performance.
// Color and glow can be rendered separately for later adaptation; no flipbook is required to run this study.
export function draw(ctx, t, options = {}) {
  const o = { ...meta.options, ...options }, [w, h] = meta.size;
  const active = name => (o.layer === 'combined' || o.layer === name || (o.layer === 'color' && name !== 'glow'))
    && o.layers?.[name] !== false;
  ctx.save(); ctx.resetTransform(); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!(t > 0 && t < meta.duration)) { ctx.restore(); return; }
  ctx.scale(ctx.canvas.width / w, ctx.canvas.height / h);
  ctx.translate(...meta.pivot); ctx.scale(o.scale, o.scale);
  const data = artwork(o.seed);
  if (active('glow') && o.glow > 0) glow(ctx, t, o.glow);
  if (active('flash') && o.flash > 0) flash(ctx, data, t, o.flash, true);
  if (active('smoke') && o.smoke > 0) smoke(ctx, data, t, o.smoke);
  if (active('flash') && o.flash > 0) flash(ctx, data, t, o.flash);
  if (active('arcs')) arcs(ctx, t);
  if (active('debris')) debris(ctx, data, t);
  if (active('sparks')) sparks(ctx, data, t);
  ctx.restore();
}
