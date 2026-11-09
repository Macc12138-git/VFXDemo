#!/usr/bin/env node
// HD design QA and still images only; no GIF, atlas, Unity asset, or scene writes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {meta,hitMeta,sample,sampleImpact,draw,drawImpact} from '../src/hd/cyber-orb-v3.js';
import {draw as drawV2} from '../src/hd/cyber-orb-v2.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'output/hd/CyberOrb/V3'),round=flags.round??'final';await mkdir(out,{recursive:true});
const c=createCanvas(640,360),g=c.getContext('2d'),digest=x=>createHash('sha256').update(x).digest('hex');
function image(fn,t,o={},bg=null){g.clearRect(0,0,640,360);if(bg){g.fillStyle=bg;g.fillRect(0,0,640,360);}g.save();g.translate(360,180);g.scale(3,3);fn(g,t,o);g.restore();return c.toBuffer('image/png');}
const raw=()=>Uint8Array.from(g.getImageData(0,0,640,360).data),empty=()=>raw().every(v=>v===0);
for(const seed of [1,42,179])for(const motion of ['straight','curve'])for(let i=0;i<=120;i++){
  const t=i/30,f=sample(t,{seed,motion});assert.deepEqual(f,sample(t,{seed,motion}));
  for(const p of f.h)assert([p.x,p.y,p.width,p.nx,p.ny].every(Number.isFinite));
}
for(const seed of [1,42,179])for(let i=0;i<=200;i++){
  const t=i/1000,f=sampleImpact(t,{seed});assert.deepEqual(f,sampleImpact(t,{seed}));assert(f.shards.length<=4);
  for(const p of f.shards)assert(Object.values(p).every(Number.isFinite));
}
assert.equal(digest(image(draw,0)),digest(image(draw,4)),'projectile loop seam');
for(const t of [-.01,.2,.3]){image(drawImpact,t);assert(empty(),'one-shot ends empty');}
assert.notEqual(digest(image(drawImpact,.016)),digest(image(drawImpact,.09)),'impact phases move');
assert.notEqual(digest(image(drawImpact,.09,{seed:1})),digest(image(drawImpact,.09,{seed:42})),'impact seeded variation');
image(draw,1,{layers:{trail:false}});const corePixels=raw();
for(let y=0;y<360;y++)for(let x=0;x<640;x++)if(Math.hypot(x+.5-360,y+.5-180)>44)assert.equal(corePixels[(y*640+x)*4+3],0,'no pixels in the former halo region');
let fills=0,radial=0;const count=new Proxy(g,{get(target,k){const v=Reflect.get(target,k,target);return typeof v==='function'?function(...args){if(k==='fill')fills++;if(k==='createRadialGradient')radial++;return v.apply(target,args);}:v;},set(target,k,v){return Reflect.set(target,k,v,target);}});
draw(count,1);assert.equal(fills,2,'one short trail and one core only');assert.equal(radial,1,'core edge gradient only, no halo gradient');
const alphaSum=fn=>{image(fn,1,{layers:{core:false,glow:false}});return raw().reduce((s,v,i)=>s+(i%4===3?v:0),0);};
const tailAlphaV2=alphaSum(drawV2),tailAlphaV3=alphaSum(draw);assert(tailAlphaV3>tailAlphaV2*1.5,'tail is materially more visible than V2');
for(const key of ['core','rim','trail'])assert.notEqual(digest(image(draw,1)),digest(image(draw,1,{[key]:'#ff4477'})),key+' control');
for(const key of ['core','trail'])assert.notEqual(digest(image(draw,1)),digest(image(draw,1,{layers:{[key]:false}})),key+' layer');
for(const key of ['flash','shards'])assert.notEqual(digest(image(drawImpact,.03)),digest(image(drawImpact,.03,{layers:{[key]:false}})),key+' layer');
image(draw,1,{layers:{core:false,trail:false}});assert(empty(),'projectile all off');
image(drawImpact,.016,{layers:{flash:false,shards:false,trail:false}});assert(empty(),'hit all off');
const tailX=speed=>sample(1,{speed}).h.at(-1).x;assert(Math.abs(tailX(800)-tailX(2200))<1e-8,'speed does not elongate tail');
for(const tailLength of [1.5,4])for(const tailWidth of [.4,.8]){
  image(draw,1,{tailLength,tailWidth});const d=raw();let edge=0;
  for(let x=0;x<640;x++)edge+=d[x*4+3]+d[(359*640+x)*4+3];
  for(let y=0;y<360;y++)edge+=d[(y*640)*4+3]+d[(y*640+639)*4+3];assert.equal(edge,0,'projectile fits at UI size endpoints');
}
for(const hitScale of [.6,1,1.4])for(const t of [0,.016,.05,.1,.18]){
  image(drawImpact,t,{hitScale});const d=raw();let edge=0;
  for(let x=0;x<640;x++)edge+=d[x*4+3]+d[(359*640+x)*4+3];
  for(let y=0;y<360;y++)edge+=d[(y*640)*4+3]+d[(y*640+639)*4+3];assert.equal(edge,0,'impact fits at UI size endpoints');
}
for(const [name,fn,t,bg] of [['flight',draw,1,'#081020'],['hit',drawImpact,.016,'#081020'],['hit-light',drawImpact,.016,'#d9dfe3'],['hit-transparent',drawImpact,.016,null]])await writeFile(resolve(out,`${round}-${name}.png`),image(fn,t,{},bg));
const contact=createCanvas(1280,720),cg=contact.getContext('2d');cg.fillStyle='#081020';cg.fillRect(0,0,1280,720);
for(const [i,t] of [0,.016,.05,.09,.15,.2].entries()){
  const snap=await loadImage(image(drawImpact,t,{},'#081020')),x=i%3*426,y=Math.floor(i/3)*360;
  cg.drawImage(snap,147,0,426,360,x,y,426,360);cg.fillStyle='#86adc7';cg.font='16px sans-serif';cg.fillText(`${(t*1000).toFixed(0)} ms`,x+20,y+30);
}
await writeFile(resolve(out,`${round}-contact.png`),contact.toBuffer('image/png'));
const design=createCanvas(1280,420),dg=design.getContext('2d');dg.fillStyle='#081020';dg.fillRect(0,0,1280,420);
for(const [x,fn,t] of [[350,draw,1],[1000,drawImpact,.016]]){dg.save();dg.translate(x,220);dg.scale(3,3);fn(dg,t);dg.restore();}
await writeFile(resolve(out,`${round}-design.png`),design.toBuffer('image/png'));
const report={version:meta.version,round,tests:'PASS',seed:42,options:meta.options,sourceSha256:digest(await readFile(resolve(root,'src/hd/cyber-orb-v3.js'))),
  samples:{projectile:726,impact:603},halo:'zero alpha outside core when trail is disabled',tail:{alphaSumV2:tailAlphaV2,alphaSumV3:tailAlphaV3,ratio:tailAlphaV3/tailAlphaV2},
  projectileCanvasFills:fills,impactDuration:hitMeta.duration,impactMaxShards:4,
  note:'Canvas shape counts are not Unity draw calls; previews are not performance evidence.',
  notTested:['Unity native Particle System / Shader','Unity batches / batching','target-device CPU / GPU / memory']};
await writeFile(resolve(out,`${round}-qa.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
