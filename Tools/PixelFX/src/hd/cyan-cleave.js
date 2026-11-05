// High-resolution, anti-aliased brush ribbons. Independent of the pixel painter and stock character.
// Art direction: the first cyan / white diagonal crescent in the user's supplied reference video.
export const meta = {
  id: 'hd/cyan-cleave', name: '青蓝挥砍 · 第一段',
  size: [1024, 1024], pivot: [512, 512], fps: 60, duration: 0.4,
  loop: false, actor: false,
  description: '白热外刃、青蓝弯月、内侧分叉笔触与少量碎光；无人物、无武器、无场景。',
};

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const random = (i) => { const n = Math.sin(i * 127.1 + 41.7) * 43758.5453; return n - Math.floor(n); };
const START = -1.36, SPAN = -4.97, SWEEP = 0.095, ROT = 0.64;
const CA = Math.cos(ROT), SA = Math.sin(ROT);

function point(s, inset = 0, expand = 1) {
  const a = START + SPAN * s, c = Math.cos(a), sn = Math.sin(a);
  let nx = c / 350, ny = sn / 195;
  const l = Math.hypot(nx, ny); nx /= l; ny /= l;
  const x = c * 350 * expand - nx * inset, y = sn * 195 * expand - ny * inset;
  return [512 + x * CA - y * SA, 490 + x * SA + y * CA];
}

function path(ctx, points, close = false) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  if (close) ctx.closePath();
}

function ribbon(ctx, { from, to, offset = 0, width, color, alpha = 1, expand = 1 }) {
  if (to <= from || alpha <= 0) return;
  const a = [], b = [], n = Math.max(12, Math.ceil((to - from) * 240));
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = from + (to - from) * u;
    const off = typeof offset === 'function' ? offset(s, u) : offset;
    const w = typeof width === 'function' ? width(s, u) : width;
    a.push(point(s, off, expand)); b.push(point(s, off + w, expand));
  }
  path(ctx, a.concat(b.reverse()), true);
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill();
}

function gradientColor(q, heat, fade) {
  const stops = [
    [0, [246, 255, 255, 1]], [0.13, [226, 255, 255, 1]],
    [0.33, [100, 249, 255, 1]], [0.7, [0, 190, 231, 0.95]],
    [1, [0, 92, 148, 0.58]],
  ];
  let i = 0; while (i < stops.length - 2 && q > stops[i + 1][0]) i++;
  const [a, A] = stops[i], [b, B] = stops[i + 1], u = clamp((q - a) / (b - a));
  const c = A.map((v, j) => v + (B[j] - v) * u);
  const cool = [0, 65 + (1 - q) * 28, 115 + (1 - q) * 20];
  for (let j = 0; j < 3; j++) c[j] = cool[j] + (c[j] - cool[j]) * heat;
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3] * fade})`;
}

export function draw(ctx, t, { size = 1024, layer = 'combined', glow = 1 } = {}) {
  ctx.save(); ctx.setTransform(size / 1024, 0, 0, size / 1024, 0, 0);
  ctx.clearRect(0, 0, 1024, 1024);
  if (t <= 0 || t >= meta.duration) { ctx.restore(); return; }
  const head = smooth(0, SWEEP, t);
  const decay = 1 - smooth(0.17, 0.4, t);
  const bright = 1 - smooth(0.12, 0.335, t);
  const expand = 0.98 + 0.025 * smooth(0, 0.22, t);
  const thickness = (s) => {
    const end = clamp((head - s) / 0.045);
    const profile = Math.pow(clamp(s / 0.16), 0.7) * Math.pow(clamp((1.035 - s) / 0.15), 0.35);
    const brush = 1 + 0.09 * Math.sin(s * 16) + 0.045 * Math.sin(s * 37 + 1.2);
    return (20 + 91 * Math.pow(s, 0.8)) * profile * brush * Math.pow(end, 0.32) * (0.48 + 0.52 * decay);
  };

  if (layer !== 'color' && glow > 0) {
    ctx.globalCompositeOperation = 'source-over';
    // Explicit soft light, rather than Canvas shadows (whose alpha differs between native and browser renderers).
    for (let i = 0; i <= 54; i++) {
      const s = i / 54;
      if (s > head || bright <= 0) continue;
      const [x, y] = point(s, 7, expand), r = 72 + 19 * s;
      const k = 0.075 * bright * glow * smooth(0, 0.08, s) * (1 - 0.4 * smooth(0.94, 1, s));
      const light = ctx.createRadialGradient(x, y, 0, x, y, r);
      light.addColorStop(0, `rgba(77,235,255,${k})`);
      light.addColorStop(0.28, `rgba(35,206,250,${k * 0.7})`);
      light.addColorStop(0.7, `rgba(10,164,235,${k * 0.16})`);
      light.addColorStop(1, 'rgba(0,140,220,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = light; ctx.fillRect(x-r,y-r,r*2,r*2);
    }
  }

  if (layer !== 'glow') {
    ctx.globalCompositeOperation = 'source-over';
    // A broad translucent blue underpainting, followed by a narrow white-hot cutting edge.
    for (let j = 47; j >= 0; j--) {
      const q = j / 48;
      const pigment = ctx.createLinearGradient(300, 190, 690, 790);
      for (let k = 0; k <= 6; k++) {
        const s = k / 6, heat = 1 - smooth(0.12, 0.31, t - s * 0.065);
        const erase = 1 - smooth(0.19 + s * 0.07, 0.33 + s * 0.07, t);
        pigment.addColorStop(s, gradientColor(q, heat, decay * erase));
      }
      ribbon(ctx, { from: 0, to: head, expand,
        offset: (s) => thickness(s) * q,
        width: (s) => thickness(s) / 48 + 0.6,
        color: pigment,
      });
    }
    // Sweeping pointed interior brush marks. Their tips curl ahead of the broad crescent.
    for (const [i, from, end, inset, w] of [[0, 0.53, 1.04, 41, 22], [1, 0.69, 1.075, 69, 16], [2, 0.82, 1.105, 89, 11]]) {
      const to = Math.min(end, head + 0.11 * smooth(0.7, 1, head));
      const phase = (s) => clamp((s - from) / (end - from));
      ribbon(ctx, { from, to, expand,
        offset: (s) => inset * (1 - 0.3 * phase(s)) + 8 * Math.sin(phase(s) * Math.PI),
        width: (s) => w * Math.pow(Math.sin(Math.PI * phase(s)), 0.75) * (0.5 + 0.5 * decay),
        color: i === 0 ? '#9fffff' : '#23dff5', alpha: decay * (0.9 - i * 0.12),
      });
    }
    // Sparse sweeping white slivers: broken brushwork, not an even neon ring.
    for (const [i, a, b] of [[0, 0.06, 0.19], [1, 0.33, 0.42], [2, 0.55, 0.71], [3, 0.78, 0.985]]) {
      const to = Math.min(b, head);
      ribbon(ctx, { from: a, to, expand, offset: (s) => thickness(s) * (0.30 + i * 0.035),
        width: (s, u) => (3 + i) * Math.sin(Math.PI * u), color: '#edffff', alpha: bright * 0.9,
      });
    }
    // The release-frame fan fattens behind the moving tip, then falls back into the thin edge.
    const burst = (1 - smooth(0.065, 0.115, t)) * smooth(0, 0.026, t);
    if (burst > 0) {
      ribbon(ctx, { from: Math.max(0, head - 0.25), to: head, expand,
        offset: 0, width: (s, u) => 90 * Math.sin(Math.PI * u) * burst,
        color: '#f1ffff', alpha: burst,
      });
    }
  }

  if (layer !== 'glow') {
    const glint = smooth(0.055, 0.085, t) * (1 - smooth(0.10, 0.16, t));
    if (glint > 0) {
      const [x, y] = point(0.48, 30, expand), r = 34 * glint;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.38); ctx.globalAlpha = glint;
      ctx.fillStyle = '#f5ffff'; ctx.shadowColor = '#73edff'; ctx.shadowBlur = 12;
      path(ctx, [[0, -r], [2, -2], [r * 0.6, 0], [2, 2], [0, r], [-2, 2], [-r * 0.6, 0], [-2, -2]], true);
      ctx.fill(); ctx.restore();
    }
    // A few leaf-shaped chips of light; no explosion, impact burst, or character.
    for (let i = 0; i < 8; i++) {
      const s = 0.12 + random(i + 1) * 0.78, born = 0.025 + s * 0.065;
      const age = t - born, life = 0.12 + random(i + 21) * 0.12;
      if (age <= 0 || age >= life || head < s) continue;
      const u = age / life, [x, y] = point(s, -12 - u * (16 + random(i + 9) * 15), expand);
      const len = (5 + random(i + 51) * 9) * Math.sin(Math.PI * u);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ROT + START + SPAN * s + 0.8);
      ctx.globalAlpha = Math.sin(Math.PI * u) * decay; ctx.fillStyle = '#eaffff';
      ctx.shadowColor = '#60eaff'; ctx.shadowBlur = 8;
      path(ctx, [[-len, 0], [0, -1.5], [len, 0], [0, 1.5]], true); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}
