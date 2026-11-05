#!/usr/bin/env node
// HD Canvas effects intentionally do not use the pixel renderer or its 480px validation limit.
// node tools/render-hd.mjs [--canvas-module /absolute/path/to/@napi-rs/canvas/index.js]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { draw, meta } from '../src/hd/cyan-cleave.js';

const flags = {};
for (let i = 2; i < process.argv.length; i += 2) flags[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const { createCanvas, loadImage } = await import(flags['canvas-module'] ? pathToFileURL(resolve(flags['canvas-module'])).href : '@napi-rs/canvas');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(flags.out ?? join(root, 'output/hd/cyan-cleave'));
const size = +(flags.size ?? meta.size[0]), fps = meta.fps, count = Math.round(meta.duration * fps) + 1;
mkdirSync(join(out, 'frames'), { recursive: true });
const c = createCanvas(size, size), g = c.getContext('2d');
const pageCapacity = 16, pageColumns = 4, pages = [], frames = [];
const contact = createCanvas(5 * 260, 5 * 282), cg = contact.getContext('2d');
cg.fillStyle = '#111921'; cg.fillRect(0, 0, contact.width, contact.height);
const start = performance.now(); let peak = null;
for (let i = 0; i < count; i++) {
  const t = i / fps; draw(g, t, { size });
  const filename = `cleave-${String(i).padStart(3, '0')}.png`;
  const encoded = c.toBuffer('image/png');
  writeFileSync(join(out, 'frames', filename), encoded);
  // Freeze each frame before drawing it into another Canvas: mutable Canvas sources can be recorded lazily.
  const snapshot = await loadImage(encoded);
  const page = Math.floor(i / pageCapacity), cell = i % pageCapacity;
  if (!pages[page]) {
    const n = Math.min(pageCapacity, count - page * pageCapacity);
    const sheet = createCanvas(pageColumns * size, Math.ceil(n / pageColumns) * size);
    pages[page] = { canvas: sheet, ctx: sheet.getContext('2d'), file: `cleave-atlas-${page + 1}.png` };
  }
  const x = (cell % pageColumns) * size, y = Math.floor(cell / pageColumns) * size;
  pages[page].ctx.drawImage(snapshot, x, y);
  frames.push({ filename: `frames/${filename}`, page, frame: { x, y, w: size, h: size }, time: t, duration: 1000 / fps });
  const cx = (i % 5) * 260, cy = Math.floor(i / 5) * 282;
  cg.drawImage(snapshot, cx, cy + 22, 260, 260); cg.fillStyle = '#a8bdc9'; cg.font = '14px sans-serif';
  cg.fillText(`${String(i).padStart(2, '0')}   ${t.toFixed(3)} s`, cx + 10, cy + 17);
  if (i === 7) peak = encoded;
}
for (const p of pages) writeFileSync(join(out, p.file), p.canvas.toBuffer('image/png'));
writeFileSync(join(out, 'peak.png'), peak);
writeFileSync(join(out, 'contact.png'), contact.toBuffer('image/png'));
const data = { ...meta, size: [size, size], pivot: [size / 2, size / 2], pivotNormalized: [0.5, 0.5],
  format: 'RGBA8 straight alpha', filtering: 'bilinear', frameCount: count,
  textures: pages.map(p => ({ image: p.file, width: p.canvas.width, height: p.canvas.height })), frames,
  notes: ['Standalone VFX only; no actor, weapon, environment, or background.',
    'Intended as a transparent flipbook on an oriented quad in a 3D scene, not a volumetric 3D asset.',
    'Time is in seconds. t=0 and t=0.4 are empty. Last empty frame terminates the one-shot.',
    'Use the same normalized center pivot for all frames. Atlas rows are top-to-bottom.'],
};
writeFileSync(join(out, 'cleave.json'), JSON.stringify(data, null, 2));
writeFileSync(join(out, 'README.md'), `# 青蓝挥砍 · 第一段\n\n高清抗锯齿手绘风剑光，无人物、武器和场景。参考用户视频的第一段挥砍，非原视频素材抠图。\n\n- 单帧：${size} × ${size}，RGBA PNG，${count} 帧，60 fps，0.4 秒。首尾为空。\n- frames/：独立透明序列帧。\n- cleave-atlas-*.png：分成不超过 4096 × 4096 的图集（默认 1024 单帧）。\n- cleave.json：帧矩形、时间、图集和中心锚点。不是 Aseprite 单图集格式。\n- peak.png / contact.png：峰值透明图和深色背景逐帧预览。\n\n## 3D 场景接入\n\n将序列帧播放在透明 Quad / Billboard 上，中心 Pivot=(0.5,0.5)，根据挥砍方向旋转 Quad。使用双面透明材质、Bilinear 过滤、关闭纹理压缩和 Mipmap；先按普通 Alpha Blend 检查。它是具有固定斜向透视外观的二维 Flipbook，不是真正体积特效或任意视角的 3D 网格。\n\n没有烘焙地面亮斑、人物或待机时间；重复播放间隔只属于预览页面。\n\n## 源码与预览\n\n源码：src/hd/cyan-cleave.js。运行 node tools/serve.mjs 后打开 /gallery/hd-cleave.html。\n\n导出：node tools/render-hd.mjs；需要 @napi-rs/canvas，或通过 --canvas-module 指定已有模块路径。\n`);
console.log(`${count} frames · ${size}x${size} · ${pages.length} atlases · ${(performance.now() - start).toFixed(0)}ms\n${out}`);
