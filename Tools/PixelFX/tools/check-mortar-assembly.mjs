#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { draw, meta, layers } from '../src/hd/mortar-assembly.js';
const flags = {};
for (let i = 2; i < process.argv.length; i += 2) flags[process.argv[i].replace(/^--/, '')] = process.argv[i+1];
const { createCanvas } = await import(flags['canvas-module'] ? pathToFileURL(resolve(flags['canvas-module'])).href : '@napi-rs/canvas');
const [w,h] = meta.size, c=createCanvas(w,h), g=c.getContext('2d'), times=[];
const hash = bytes=>createHash('sha256').update(bytes).digest('hex');
const pixels = (t,o={})=>{draw(g,t,o);return Buffer.from(g.getImageData(0,0,w,h).data);};
const visible = bytes=>{let n=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>2)n++;return n;};
assert.equal(meta.actor,false);assert.equal(meta.prop,false);assert.equal(meta.loop,false);
draw(g,.21); // Warm the static stamps before CPU drawing measurements.
let clipped=0, maxPixels=0;
for(let frame=0;frame<=meta.fps*meta.duration;frame++){
  const t=frame/meta.fps,start=performance.now();draw(g,t);times.push(performance.now()-start);
  const p=Buffer.from(g.getImageData(0,0,w,h).data);maxPixels=Math.max(maxPixels,visible(p));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)
    if((x<4||x>=w-4||y<4||y>=h-4)&&p[(y*w+x)*4+3]>2)clipped++;
}
assert.equal(clipped,0,'Default animation touches canvas padding');
assert.equal(visible(pixels(0)),0,'First frame not empty');
assert.equal(visible(pixels(meta.duration)),0,'Last frame not empty');
assert.equal(visible(pixels(meta.duration+0.2)),0,'One-shot continues after duration');
const baseline=hash(pixels(.21));pixels(.75);pixels(.08);
assert.equal(baseline,hash(pixels(.21)),'Scrub is not deterministic');
assert.notEqual(baseline,hash(pixels(.21,{seed:23})),'Seed has no effect');
for(const [parameter,value] of [['flash',0],['smoke',0],['glow',0],['scale',.8]])
  assert.notEqual(baseline,hash(pixels(.21,{[parameter]:value})),`${parameter} has no effect`);
const layerTimes={smoke:.30,flash:.21,arcs:.30,sparks:.26,debris:.28,glow:.21};
for(const layer of layers)assert.ok(visible(pixels(layerTimes[layer],{layer}))>0,`${layer} is empty at its sample time`);
assert.equal(visible(pixels(.21,{layers:Object.fromEntries(layers.map(layer=>[layer,false]))})),0,'Layer switches leave pixels');
const pulses=meta.pulses.map(born=>visible(pixels(born+.045,{layer:'flash'})));
assert.ok(pulses.every(n=>n>5000),'Missing main pulse');
for(const t of [.38,.67,.94])assert.equal(visible(pixels(t,{layer:'flash'})),0,`Flash remains between pulses at ${t}`);
times.sort((a,b)=>a-b);
const report={pass:true,version:meta.version,seed:meta.options.seed,size:meta.size,
  checkedFrames:meta.duration*meta.fps+1,emptyFirstAndLast:true,paddingClear:true,deterministicScrub:true,
  seedAndControlsWork:true,layers:layers.length,threeSeparatePulses:pulses,maxVisiblePixels:maxPixels,
  canvasDrawMedianMs:times[Math.floor(times.length/2)],canvasDrawMaxMs:times.at(-1),
  scope:'Desktop Node Canvas drawing only; excludes readback/encoding. Not Unity CPU/GPU, batches, memory, or device performance.'};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(flags.out??resolve(root,'output/hd/mortar-assembly/v1'));
if(out.split(/[\\/]/).includes('Assets'))throw new Error('Checks must stay outside Assets.');
mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'checks.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
