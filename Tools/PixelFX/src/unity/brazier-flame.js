// Flame-only adapter of pixelfx fire/brazier (Patch, MIT).
// Flame recipes adapted from Sprite Fusion, Copyright (c) 2026 Hugo Duprez, MIT.
// Removes only the iron stand, bowl, coals and baked floor light; preserves flame / smoke / spark timings.
import { fit, mix, WHITE } from '../core/index.js';
import { noiseFor, hotFirst, burn, looped, drift, spark, ember } from '../fx/fire/_lib.js';
import { meta as original } from '../fx/fire/brazier.js';

export const meta = { ...original, name: 'Brazier flame', origin: [56, 111] };
const D = original.duration, NL = noiseFor(D), RIM = -25;
const TONGUES = [
  [-7, -1.5, 0.5, 2.0, 1], [7.2, -1.5, 0.55, 2.0, 1],
  [-3, -2.5, 0.84, 2.2, 1], [3.3, -2.5, 0.86, 2.2, 1],
  [-11.5, 0.5, 0.2, 1.5, 0], [11.5, 0.5, 0.22, 1.5, 0],
  [-8.3, 0, 0.34, 2.0, 0], [8.5, 0, 0.38, 2.0, 0],
  [-4.7, -0.5, 0.6, 2.8, 0], [4.9, -0.5, 0.64, 2.8, 0], [0, -1, 1, 3.6, 0],
];

export function draw(p, t, o) {
  // Render with the original frame origin; metadata puts the Unity pivot at the fire's base instead of its feet.
  const oldY = p.ty; p.ty += 25;
  const H = hotFirst(fit(o.palette, 9)), S = o.seed;
  const SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]];
  burn(p, t, TONGUES, {
    H, D, NL, S, x: 0, y: RIM, height: 32, lean: 0.1, spread: 7,
    puffs: 8, licks: 4, smoke: 14, smokeSize: 3, smokeLife: [1.6, 2.4],
    embers: 10, glowR: 58, glow: 1.4, wind: 3,
  });
  looped(t, D, 60, S + 600, (r) => {
    const side = r.range(-1, 1);
    return { x: side * 8, y: RIM - r.range(4, 18), vx: side * r.range(10, 40),
      vy: -r.range(70, 150), life: r.range(0.7, 1.7), a: r.range(0, 6.3),
      w: r.range(1.8, 3.2), m: r.range(3, 8), big: r.chance(0.12) };
  }, (q, age) => {
    const [x, y, vx, vy] = drift(q.x, q.y, q.vx, q.vy, age, 0, -22, 1.9, 1.9);
    const k = 1 - age / q.life;
    const wob = q.m * (Math.sin(age * q.w + q.a) - Math.sin(q.a)) * Math.min(1, age * 1.5);
    const wv = q.m * q.w * Math.cos(age * q.w + q.a) * Math.min(1, age * 1.5);
    if (Math.hypot(vx + wv, vy) > 40) spark(p, x + wob, y, vx + wv, vy, k, SPARKS);
    else ember(p, x + wob, y, k, q.big ? 2 : 1, EMB, age * 40 + q.a);
  });
  p.ty = oldY;
}
