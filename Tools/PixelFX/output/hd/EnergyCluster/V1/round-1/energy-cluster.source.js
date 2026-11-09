// EnergyCluster — original, code-native HD authoring study, reference supplied by the author.
// Geometry/coverage and semantic colors are separate; light is an independent additive pass.
const TAU = Math.PI * 2;
const mod = (x, n) => ((x % n) + n) % n;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const hash = (seed, i, k = 0) => mod(Math.sin(seed * 17.213 + i * 91.731 + k * 43.159) * 43758.5453, 1);
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${clamp(a)})`;

export const meta = {
  name: '湛蓝能量团', version: '1.0', duration: 4, loop: true, fps: 60,
  size: [640, 640], origin: [320, 320],
  description: '白热亮核、蓝青体积、流转的破碎能量壳和短促外放电弧。独立悬浮循环，无飞行/命中。',
  options: { seed: 37, radius: 100, coreSize: .205, pulse: .035, distortion: 1,
    shellWidth: 1, arcAmount: 1, glow: .75,
    core: '#f5ffff', inner: '#29cfff', body: '#1552ff', shell: '#e6f8ff', arc: '#c8eeff' },
};
export function options(input = {}) {
  const o = { ...meta.options, ...input, layers: { core: true, volume: true, shell: true, arcs: true, light: true, ...input.layers } };
  o.radius = clamp(o.radius, 45, 145); o.coreSize = clamp(o.coreSize, .1, .32);
  o.distortion = clamp(o.distortion, 0, 1.8); o.shellWidth = clamp(o.shellWidth, .4, 1.6);
  o.arcAmount = clamp(o.arcAmount, 0, 1.8); o.glow = clamp(o.glow, 0, 1.4);
  return o;
}
function rotate([x, y, z], yaw, roll, tilt) {
  let a = x * Math.cos(yaw) + z * Math.sin(yaw), b = -x * Math.sin(yaw) + z * Math.cos(yaw);
  let c = y * Math.cos(tilt) - b * Math.sin(tilt), d = y * Math.sin(tilt) + b * Math.cos(tilt);
  return [a * Math.cos(roll) - c * Math.sin(roll), a * Math.sin(roll) + c * Math.cos(roll), d];
}
function shape(a, p, seed, distortion) {
  return 1 + distortion * (.034 * Math.sin(5 * a - 2 * p + seed) + .019 * Math.sin(9 * a + 3 * p + seed * .3) + .012 * Math.sin(17 * a - 4 * p));
}
function ribbonPoint(a, side, j, p, o) {
  const seed = o.seed * .17 + j * 2.7;
  const latitude = .1 * Math.sin(3 * a + 2 * p + seed) + .04 * Math.sin(7 * a - p) * o.distortion;
  const width = .048 * o.shellWidth * (.72 + .45 * Math.sin(3 * a - 3 * p + seed) + .26 * Math.sin(7 * a + 2 * p));
  const w = latitude + side * Math.max(.012, width);
  const r = shape(a, p, seed, o.distortion);
  return rotate([Math.cos(a) * Math.cos(w) * r, Math.sin(a) * Math.cos(w) * r, Math.sin(w) * r],
    p * 2 + j * 1.17, .3 + j * .94 + .12 * Math.sin(p * 2 + j), .38 + j * .73);
}

export function sample(time, input = {}) {
  const o = options(input), t = mod(time, meta.duration), p = t / meta.duration * TAU;
  const pulse = 1 + o.pulse * (Math.sin(p * 3) + .35 * Math.sin(p * 7 + .4));
  const r = o.radius * pulse, faces = [], rim = [], arcs = [];
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU, b = (i + 1) / 180 * TAU;
      const gate = .6 + .4 * Math.sin(5 * a + p * 3 + j * 4.7 + o.seed * .1);
      if (gate < .16) continue;
      const points = [ribbonPoint(a, -1, j, p, o), ribbonPoint(b, -1, j, p, o), ribbonPoint(b, 1, j, p, o), ribbonPoint(a, 1, j, p, o)];
      const z = points.reduce((s, q) => s + q[2], 0) / 4;
      faces.push({ points: points.map(q => [q[0] * r, q[1] * r]), z, alpha: (.6 + .4 * smooth(.1, .45, gate)) * (z < 0 ? .35 : 1), j });
    }
  }
  faces.sort((a, b) => a.z - b.z);
  for (let i = 0; i <= 240; i++) {
    const a = i / 240 * TAU;
    const radius = r * shape(a, p, o.seed * .31, o.distortion);
    const a2 = a + .008 * Math.sin(a * 13 + p * 3);
    rim.push([Math.cos(a2) * radius, Math.sin(a2) * radius,
      (.5 + .5 * Math.sin(a * 7 - p * 4 + o.seed)) > .2]);
  }
  const count = Math.round(16 * o.arcAmount);
  for (let i = 0; i < count; i++) {
    const start = hash(o.seed, i, 1) * meta.duration;
    const age = mod(t - start, meta.duration), life = .22 + .18 * hash(o.seed, i, 2);
    if (age > life) continue;
    const u = age / life, alpha = smooth(0, .12, u) * (1 - smooth(.55, 1, u));
    const a = hash(o.seed, i, 3) * TAU + .08 * Math.sin(p * 3 + i), len = r * (.25 + .33 * hash(o.seed, i, 4));
    const epoch = Math.floor(u * 4), points = [];
    for (let k = 0; k < 9; k++) {
      const v = k / 8, d = r * .97 + len * v;
      const side = Math.sin(Math.PI * v) * (hash(o.seed + epoch, i, 5 + k) - .5) * r * .3;
      points.push([Math.cos(a) * d - Math.sin(a) * side, Math.sin(a) * d + Math.cos(a) * side]);
    }
    arcs.push({ points, alpha, width: .85 + .6 * hash(o.seed, i, 17) });
  }
  return { time: t, phase: p, r, pulse, faces, rim, arcs, o };
}
function path(g, pts, close = false) {
  g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); if (close) g.closePath();
}
function disc(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function radial(g, x, y, r, stops) {
  const q = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, c, a] of stops) q.addColorStop(at, rgba(c, a));
  disc(g, x, y, r, q);
}
function paintFaces(g, f, front) {
  for (const face of f.faces) {
    if ((face.z >= 0) !== front) continue;
    path(g, face.points, true);
    g.fillStyle = rgba(f.o.shell, face.alpha); g.fill();
  }
}
export function drawColor(g, time, input = {}, frame) {
  const f = frame ?? sample(time, input), { o, r, phase: p } = f;
  g.save(); g.globalCompositeOperation = 'source-over';
  if (o.layers.shell) paintFaces(g, f, false);
  if (o.layers.volume) {
    radial(g, 0, 0, r * 1.06, [[0, o.inner, .95], [.26, o.inner, .9], [.57, o.body, .9], [.88, o.body, .62], [1, o.body, 0]]);
    // Asymmetric plasma lobes: volume, not a flat opaque blue plate.
    for (let j = 0; j < 4; j++) {
      const a = j * TAU / 4 - p * 2, d = r * .38;
      radial(g, Math.cos(a) * d, Math.sin(a) * d, r * .49, [[0, o.inner, .22], [.45, o.inner, .08], [1, o.body, 0]]);
    }
  }
  if (o.layers.shell) {
    paintFaces(g, f, true);
    g.lineWidth = 2.7 * o.shellWidth; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = rgba(o.shell, .94);
    let points = [];
    for (const pt of f.rim) {
      if (pt[2]) points.push(pt);
      else if (points.length) { path(g, points); g.stroke(); points = []; }
    }
    if (points.length) { path(g, points); g.stroke(); }
  }
  if (o.layers.core) {
    radial(g, 0, 0, r * .43, [[0, o.core, 1], [.3, o.inner, .85], [1, o.inner, 0]]);
    disc(g, 0, 0, r * o.coreSize, rgba(o.core, 1));
  }
  if (o.layers.arcs) {
    g.lineCap = 'round'; g.lineJoin = 'miter';
    for (const arc of f.arcs) {
      path(g, arc.points); g.strokeStyle = rgba(o.arc, arc.alpha); g.lineWidth = arc.width; g.stroke();
    }
  }
  g.restore(); return f;
}
export function drawLight(g, time, input = {}, frame) {
  const f = frame ?? sample(time, input), { o, r } = f;
  if (!o.layers.light || o.glow <= 0) return f;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (o.layers.volume) radial(g, 0, 0, r * 1.95, [[0, o.inner, .3 * o.glow], [.4, o.body, .27 * o.glow], [.64, o.body, .09 * o.glow], [1, o.body, 0]]);
  if (o.layers.core) radial(g, 0, 0, r * .64, [[0, o.core, .48 * o.glow], [.3, o.inner, .24 * o.glow], [1, o.inner, 0]]);
  if (o.layers.shell) {
    g.lineWidth = 9; g.strokeStyle = rgba(o.body, .14 * o.glow);
    for (const face of f.faces) if (face.z > .2) { path(g, [face.points[0], face.points[1]]); g.stroke(); }
  }
  if (o.layers.arcs) for (const a of f.arcs) {
    path(g, a.points); g.strokeStyle = rgba(o.body, a.alpha * .2 * o.glow); g.lineWidth = a.width * 5; g.stroke();
  }
  g.restore(); return f;
}
export function draw(g, time, input = {}) {
  const f = sample(time, input);
  drawLight(g, time, input, f); drawColor(g, time, input, f);
  return f;
}
