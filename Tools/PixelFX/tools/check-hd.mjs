#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { draw, meta } from '../src/hd/cyan-cleave.js';

const flags = {};
for (let i = 2; i < process.argv.length; i += 2) flags[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const { createCanvas, loadImage } = await import(flags['canvas-module'] ? pathToFileURL(resolve(flags['canvas-module'])).href : '@napi-rs/canvas');
const size = meta.size[0], canvas = createCanvas(size, size), ctx = canvas.getContext('2d');
const count = Math.round(meta.duration * meta.fps) + 1, timings = [];
let visible = 0, maxPixels = 0;
for (let i = 0; i < count; i++) {
  const t = i / meta.fps, before = performance.now(); draw(ctx, t);
  timings.push(performance.now() - before);
  const bytes = ctx.getImageData(0, 0, size, size).data;
  let pixels = 0, border = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = bytes[(y * size + x) * 4 + 3];
    if (a) pixels++;
    if ((x < 2 || y < 2 || x >= size - 2 || y >= size - 2) && a > 1) border++;
  }
  assert.equal(border, 0, `frame ${i} clips its border`);
  if (i === 0 || i === count - 1) assert.equal(pixels, 0, `endpoint ${i} is not empty`);
  else { assert.ok(pixels > 0, `frame ${i} is unexpectedly empty`); visible++; }
  maxPixels = Math.max(maxPixels, pixels);
  if (i === 7) {
    const a = Buffer.from(bytes); draw(ctx, t);
    assert.ok(a.equals(Buffer.from(ctx.getImageData(0, 0, size, size).data)), 'drawing is not deterministic');
  }
}
const folder = resolve(flags.out ?? 'output/hd/cyan-cleave');
const data = JSON.parse(readFileSync(`${folder}/cleave.json`, 'utf8'));
assert.equal(data.frameCount, count); assert.equal(data.frames.length, count);
assert.equal(data.actor, false); assert.deepEqual(data.pivotNormalized, [0.5, 0.5]);
for (const texture of data.textures) {
  assert.ok(texture.width <= 4096 && texture.height <= 4096, 'atlas exceeds 4096');
  const image = await loadImage(`${folder}/${texture.image}`);
  assert.equal(image.width, texture.width); assert.equal(image.height, texture.height);
}
// Confirm an actual exported atlas cell is identical to its transparent standalone PNG.
for (const i of [0, 7, 16, count - 1]) {
  const f = data.frames[i], a = await loadImage(`${folder}/${f.filename}`);
  const b = await loadImage(`${folder}/${data.textures[f.page].image}`);
  ctx.clearRect(0, 0, size, size); ctx.drawImage(a, 0, 0);
  const standalone = Buffer.from(ctx.getImageData(0, 0, size, size).data);
  ctx.clearRect(0, 0, size, size); ctx.drawImage(b, f.frame.x, f.frame.y, size, size, 0, 0, size, size);
  assert.ok(standalone.equals(Buffer.from(ctx.getImageData(0, 0, size, size).data)), `atlas cell ${i} differs`);
}
timings.sort((a,b)=>a-b);
console.log(`PASS ${count} frames · ${visible} visible · empty endpoints · no edge clipping · deterministic · atlas cells match`);
console.log(`Canvas draw median=${timings[Math.floor(timings.length/2)].toFixed(1)}ms, max=${Math.max(...timings).toFixed(1)}ms (desktop Node only; not a Unity benchmark)`);
