#!/usr/bin/env node
// HD authoring QA, with still images only. Never generates a flipbook or GIF.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {draw,meta,sample,previewScale} from '../src/hd/cyber-orb.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=flags.round??'final',out=resolve(root,'output/hd/CyberOrb/V1');
await mkdir(out,{recursive:true});
const hash=data=>createHash('sha256').update(data).digest('hex');
const c=createCanvas(1400,560),g=c.getContext('2d');
function image(t,o={},bg=null,scale=previewScale(o)) {
  g.clearRect(0,0,1400,560);if(bg){g.fillStyle=bg;g.fillRect(0,0,1400,560);}
  g.save();g.translate(970,280);g.scale(scale,scale);draw(g,t,o);g.restore();return c.toBuffer('image/png');
}
let frames=0;
for(const seed of [1,42,179])for(const motion of ['straight','curve'])for(let n=0;n<=120;n++) {
  const t=n/30,a=sample(t,{seed,motion}),b=sample(t,{seed,motion});assert.deepEqual(a,b,'determinism');
  for(const p of a.history)assert([p.x,p.y,p.nx,p.ny,p.width].every(Number.isFinite));
  for(const [x,y] of a.rim)assert(Math.hypot(x,y)<meta.options.radius,'internal electric edge is contained');
  assert(a.history.every(p=>p.x<0),'wake is behind the projectile');frames++;
}
assert.deepEqual(sample(0),sample(4),'exact loop seam');
assert.equal(hash(image(0)),hash(image(4)),'raster loop seam');
assert.equal(hash(image(1.3)),hash(image(1.3)),'raster determinism');
assert.notEqual(hash(image(1.3)),hash(image(2.3)),'real time variation');
const raw=t=>{image(t);return Uint8Array.from(g.getImageData(0,0,1400,560).data);};
const distance=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
const seamDelta=distance(raw(4-1/240),raw(0)),normalDelta=distance(raw(1.3-1/240),raw(1.3));
assert(seamDelta<Math.max(.06,normalDelta*2.5),'adjacent loop frames have no hidden reset');
assert.notEqual(hash(image(1.3,{seed:1})),hash(image(1.3,{seed:42})),'seed affects particles');
assert.notEqual(hash(image(1.3,{motion:'straight'})),hash(image(1.3,{motion:'curve'})),'trajectory affects tail');
for(const key of ['body','rim','trail','core'])assert.notEqual(hash(image(1.3)),hash(image(1.3,{[key]:'#ff4488'})),key+' recolor');
for(const [key,value] of Object.entries({speed:780,trailLife:.32,turbulence:0,glow:0}))assert.notEqual(hash(image(1.3)),hash(image(1.3,{[key]:value})),key+' control');
for(const name of ['orb','trail','sparks','glow'])assert.notEqual(hash(image(1.3)),hash(image(1.3,{layers:{[name]:false}})),name+' layer');
image(1.3,{layers:{orb:false,trail:false,sparks:false,glow:false}});
assert.equal(g.getImageData(0,0,1400,560).data.some(v=>v!==0),false,'all layers off is transparent');
image(1.3,{},null);let edges=0;const pixels=g.getImageData(0,0,1400,560).data;
for(let x=0;x<1400;x++)edges+=pixels[x*4+3]+pixels[((559*1400+x)*4)+3];
for(let y=0;y<560;y++)edges+=pixels[(y*1400)*4+3]+pixels[(y*1400+1399)*4+3];
assert.equal(edges,0,'default hero is not clipped');
for(const speed of [320,800])for(const trailLife of [.3,.95])for(const t of [.1,1.1,2.1,3.1]){
  image(t,{speed,trailLife});const d=g.getImageData(0,0,1400,560).data;let clipped=0;
  for(let x=0;x<1400;x++)clipped+=d[x*4+3]+d[(559*1400+x)*4+3];
  for(let y=0;y<560;y++)clipped+=d[(y*1400)*4+3]+d[(y*1400+1399)*4+3];
  assert.equal(clipped,0,`displayed control endpoints fit the hero canvas: speed=${speed}, life=${trailLife}, t=${t}`);
}
for(const [name,t,bg] of [['hero',1.3,'#0a1322'],['light',2.6,'#d6dce0'],['checker',.7,null],['turn',3.6,'#0a1322']])await writeFile(resolve(out,`${round}-${name}.png`),image(t,{},bg));
// Multi-time contact is QA only, never a runtime animation sheet.
const contact=createCanvas(1400,640),cg=contact.getContext('2d');cg.fillStyle='#090e17';cg.fillRect(0,0,1400,640);
for(let i=0;i<4;i++){
  const still=await loadImage(image(i+.25,{},i===3?'#d6dce0':'#0a1322'));
  const x=i%2*700,y=Math.floor(i/2)*320;
  cg.drawImage(still,x,y+30,700,280);
  cg.fillStyle='#7da7c7';cg.font='14px sans-serif';cg.fillText(`${(i+.25).toFixed(2)}s / ${i===3?'light background':'curve / follow view'}`,x+20,y+21);
}
await writeFile(resolve(out,`${round}-contact.png`),contact.toBuffer('image/png'));
const times=[];for(let i=0;i<100;i++){const begin=performance.now();image(i/30);times.push(performance.now()-begin);}times.sort((a,b)=>a-b);
const report={version:meta.version,round,seed:42,options:meta.options,modelSamples:frames,tests:'PASS',
  sourceSha256:hash(await readFile(resolve(root,'src/hd/cyber-orb.js'))),
  raster:{size:[1400,560],loopSeam:'exact endpoints + adjacent-frame delta',seamDelta,normalDelta,deterministic:true,defaultClipping:false},
  canvasCPU:{medianMs:times[50],p95Ms:times[95],environment:'local Node + @napi-rs/canvas; includes PNG encoding; NOT Unity performance'},
  notTested:['Unity rendering/compilation','Unity native Particle System assembly','batches / batching','target-device CPU / GPU / memory'],
};
await writeFile(resolve(out,`${round}-qa.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));console.log(out);
