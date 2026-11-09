#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {meta,sample,draw} from '../src/hd/cyber-orb-v2.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'output/hd/CyberOrb/V2'),round=flags.round??'final';await mkdir(out,{recursive:true});
const c=createCanvas(1280,420),g=c.getContext('2d'),digest=x=>createHash('sha256').update(x).digest('hex');
function image(t,o={},bg=null){g.clearRect(0,0,1280,420);if(bg){g.fillStyle=bg;g.fillRect(0,0,1280,420);}g.save();g.translate(770,210);g.scale(4,4);draw(g,t,o);g.restore();return c.toBuffer('image/png');}
for(const seed of [1,42,179])for(const motion of ['straight','curve'])for(let i=0;i<=240;i++){
  const t=i/60,f=sample(t,{seed,motion});assert.deepEqual(f,sample(t,{seed,motion}),'pure time / seed determinism');
  for(const p of f.h){assert([p.x,p.y,p.width,p.nx,p.ny].every(Number.isFinite));assert(p.x<0,'tail stays behind head');}
  assert(f.h.length===17,'single low-subdivision wake');
}
assert.equal(digest(image(0)),digest(image(4)),'exact raster loop seam');
for(const seed of [1,42])assert.equal(digest(image(1.23,{seed})),digest(image(1.23,{seed})),'raster deterministic');
assert.notEqual(digest(image(1.23,{seed:1})),digest(image(1.23,{seed:42})),'seed phase responds');
for(const key of ['core','rim','trail'])assert.notEqual(digest(image(1.23)),digest(image(1.23,{[key]:'#ff3388'})),key+' recolor');
for(const key of ['core','trail','glow'])assert.notEqual(digest(image(1.23)),digest(image(1.23,{layers:{[key]:false}})),key+' independent toggle');
const len=speed=>Math.abs(sample(1,{speed}).h.at(-1).x);
assert(Math.abs(len(800)-len(2200))<1e-9,'fixed short length independent of speed');
image(1,{layers:{core:false,trail:false,glow:false}});assert.equal(g.getImageData(0,0,1280,420).data.some(v=>v),false,'all off transparent');
for(const tailLength of [1,2.4,4])for(const motion of ['straight','curve']){
  image(1.3,{tailLength,motion});const d=g.getImageData(0,0,1280,420).data;let edge=0;
  for(let x=0;x<1280;x++)edge+=d[x*4+3]+d[(419*1280+x)*4+3];
  for(let y=0;y<420;y++)edge+=d[(y*1280)*4+3]+d[(y*1280+1279)*4+3];assert.equal(edge,0,'control ranges fit canvas');
}
let fills=0;const instrumented=new Proxy(g,{get(target,k){const v=Reflect.get(target,k,target);return typeof v==='function'?function(...args){if(k==='fill')fills++;return v.apply(target,args);}:v;},set(target,k,v){return Reflect.set(target,k,v,target);}});
draw(instrumented,1.3);assert.equal(fills,3,'one tail + one core + one halo, no extra decoration');
for(const [name,bg] of [['hero','#081020'],['light','#d9dfe3'],['transparent',null]])await writeFile(resolve(out,`${round}-${name}.png`),image(1.3,{},bg));
const contact=createCanvas(1280,990),cg=contact.getContext('2d');cg.fillStyle='#090e18';cg.fillRect(0,0,1280,990);
for(let i=0;i<3;i++){const still=await loadImage(image(i+.2,{},i===2?'#d9dfe3':'#081020'));cg.drawImage(still,0,60,1280,300,0,i*330+30,1280,300);cg.fillStyle='#8bb0c9';cg.font='16px sans-serif';cg.fillText(['single / dark','single / next phase','light background'][i],20,i*330+23);}
await writeFile(resolve(out,`${round}-contact.png`),contact.toBuffer('image/png'));
const report={version:meta.version,round,tests:'PASS',sourceSha256:digest(await readFile(resolve(root,'src/hd/cyber-orb-v2.js'))),seed:42,options:meta.options,
  modelSamples:1446,core:'round white-hot center; no exterior ring',tail:'one wake; 17 cross sections; fixed short length',authoringFillOperations:fills,
  note:'Canvas shape operations are not Unity Draw Calls. No Unity/device performance claim.',
  notTested:['Unity native assembly','Unity draw calls / batching','target-device CPU / GPU / memory'],};
await writeFile(resolve(out,`${round}-qa.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
