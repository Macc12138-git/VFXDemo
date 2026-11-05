#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { draw, meta } from '../src/hd/brazier-handpainted.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(flags.out??join(root,'output/hd/brazier-handpainted'));
const [w,h]=meta.size,c=createCanvas(w,h),g=c.getContext('2d'),timings=[],frames=[];
const render=(t,o={})=>{draw(g,t,o);return Buffer.from(g.getImageData(0,0,w,h).data);};
const delta=(a,b)=>{let sum=0;for(let i=0;i<a.length;i+=4){sum+=Math.abs(a[i+3]-b[i+3]);}return sum/(w*h*255);};
let maxBorder=0;
for(let i=0;i<meta.duration*meta.fps;i++){
  const start=performance.now(),pixels=render(i/meta.fps);timings.push(performance.now()-start);
  let count=0,border=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const alpha=pixels[(y*w+x)*4+3];if(alpha>1)count++;
    if((x<2||y<2||x>=w-2||y>=h-2)&&alpha>1)border++;
  }
  assert.equal(border,0,`frame ${i}: clipped border`);assert.ok(count>15000,`frame ${i}: unexpectedly empty`);
  maxBorder=Math.max(maxBorder,border);if(i===0||i===meta.duration*meta.fps-1)frames.push(pixels);
}
const first=render(0),loop=render(meta.duration);assert.ok(first.equals(loop),'loop endpoints differ');
const sample=render(1);assert.ok(sample.equals(render(1)),'not deterministic');
assert.ok(!sample.equals(render(1,{seed:19})),'seed has no effect');
assert.ok(!render(1,{distortion:0}).equals(render(1,{distortion:2})),'distortion has no effect');
assert.ok(!render(1,{roughness:0}).equals(render(1,{roughness:1})),'roughness has no effect');
const seamDelta=delta(frames[0],frames[1]),stepDelta=delta(render(1),render(1+1/meta.fps));
assert.ok(seamDelta<0.025,`large visible loop step: ${seamDelta}`);
const countCore=pixels=>{let n=0;for(let y=660;y<840;y++)for(let x=370;x<655;x++){
  const i=(y*w+x)*4;if(pixels[i+3]>128&&pixels[i]>140&&pixels[i+1]>60)n++;
}return n;};
const core=countCore(render(1,{prop:false,glow:0})),dissolved=countCore(render(1,{prop:false,glow:0,dissolve:1}));
assert.ok(dissolved<core*0.05,'dissolve=1 does not remove the core flames');
if(existsSync(join(out,'authoring.json'))){
  const data=JSON.parse(readFileSync(join(out,'authoring.json'),'utf8'));assert.equal(data.unityImported,false);
  assert.equal(data.options.seed,meta.options.seed);assert.deepEqual(data.size,[w,h]);
}
timings.sort((a,b)=>a-b);
const report={pass:true,frames:meta.duration*meta.fps,size:[w,h],seed:meta.options.seed,
  noEdgeClipping:maxBorder===0,deterministic:true,exactLoopEndpoints:true,seamAlphaDelta:seamDelta,
  ordinaryStepAlphaDelta:stepDelta,coreVisiblePixels:core,corePixelsAtDissolveOne:dissolved,
  distortionChangesPixels:true,roughnessChangesPixels:true,seedChangesPixels:true,
  medianMs:timings[Math.floor(timings.length/2)],maxMs:timings.at(-1),
  scope:'Desktop Node Canvas authoring checks only; not Unity playback or device performance.'};
mkdirSync(out,{recursive:true});writeFileSync(join(out,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
