import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as fx from '../src/hd/energy-burst-v6.js';
import * as old from '../src/hd/energy-burst-v5.js';
const arg=(k,d)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:d;
const out=arg('--out','Tools/PixelFX/output/hd/EnergyBurst/V6/round1'),lib=arg('--canvas-module','@napi-rs/canvas');
const {createCanvas}=await import(lib.startsWith('/')?pathToFileURL(lib).href:lib);await mkdir(out+'/QA',{recursive:true});
const noise=fx.noiseSampler(),none=Object.fromEntries(fx.layerNames.map(k=>[k,false]));
const contact=createCanvas(1280,560),g=contact.getContext('2d'),times=[0,.06,.13,.18,.25,.36,.48,.62,.80,1.02];
for(const [i,t]of times.entries()){const c=createCanvas(256,256);fx.renderCPU(c,t,{}, {scale:.60});g.drawImage(c,i%5*256,Math.floor(i/5)*280+24);g.fillStyle='#c4deed';g.font='12px monospace';g.fillText(t.toFixed(3)+' s',i%5*256+8,Math.floor(i/5)*280+16);}
await writeFile(out+'/QA/contact.png',contact.toBuffer('image/png'));
const peak=createCanvas(560,480);fx.renderCPU(peak,.36);await writeFile(out+'/QA/peak.png',peak.toBuffer('image/png'));
const compare=createCanvas(1280,280),cg=compare.getContext('2d');
for(const [i,fn,opt] of [[0,old.renderCPU,{}],[1,fx.renderCPU,{}],[2,fx.renderCPU,{layers:{...none,volume:true,glow:true}}],[3,fx.renderCPU,{layers:{...none,folds:true}}]]){const c=createCanvas(320,256);fn(c,.36,opt,{scale:.68});cg.drawImage(c,i*320,24);cg.fillStyle='#b4d4eb';cg.font='12px monospace';cg.fillText(['V5 baseline','V6 revised','V6 blue mist only','V5 white retained'][i],i*320+8,16);}
await writeFile(out+'/QA/comparison.png',compare.toBuffer('image/png'));
let checks=0,whiteRegression=0;
for(const seed of [37,8,92])for(const radius of [90,180,220])for(const t of times){const o=fx.prepare({seed,radius}),s=fx.state(t,o);
 for(let y=-1.1;y<=1.1;y+=.18)for(let x=-1.1;x<=1.1;x+=.18){const f=fx.field(x*radius,y*radius,s,o,noise);assert([...f.c,f.a,...f.l].every(Number.isFinite));assert(f.a>=0&&f.a<=1);if(t===0||t===1.02)assert.equal(f.a+f.l.reduce((a,b)=>a+b,0),0);checks++;}
 for(let y=-1;y<=1;y+=.2)for(let x=-1;x<=1;x+=.2){const layers={...none,folds:true},p=fx.prepare({seed,radius,layers}),b=old.prepare({seed,radius,layers});assert.deepEqual(fx.field(x*radius,y*radius,s,p,noise),old.field(x*radius,y*radius,s,b,noise));whiteRegression++;}
 assert.deepEqual(fx.electricPaths(t,o),old.electricPaths(t,o));
}
const frozen={layers:{...none,volume:true,glow:true},flow:0,pulse:0},moving={...frozen,flow:1,pulse:1};
const energy=o=>fx.mistField(110,55,fx.state(.36,o),fx.prepare(o),noise);assert.notDeepEqual(energy(moving),energy(frozen));
// Per-layer controls must not contaminate the retained highlight contract.
let parameterChecks=0;
for(const t of [.06,.18,.25,.36,.62,.95])for(const pulse of [0,1,2])for(const flow of [0,1,2]){
 const p=fx.prepare({pulse,flow}),s=fx.state(t,p),blank=fx.prepare({pulse,flow,layers:none});
 for(const [x,y]of [[0,0],[45,-65],[110,55],[-130,40],[170,-20]]){
  const f=fx.field(x,y,s,p,noise);assert([...f.c,f.a,...f.l].every(Number.isFinite));
  assert.deepEqual(fx.field(x,y,s,blank,noise),{c:[0,0,0],a:0,l:[0,0,0]});
  const layers={...none,folds:true},white=fx.prepare({pulse,flow,mistColor:'#f85383',layers}),base=old.prepare({layers});
  assert.deepEqual(fx.field(x,y,s,white,noise),old.field(x,y,s,base,noise));parameterChecks++;
 }
}
const blueDefault=fx.prepare(),blueChanged=fx.prepare({mistColor:'#f85383'}),cs=fx.state(.36,blueDefault);
let recolored=0;for(let y=-170;y<=170;y+=17)for(let x=-170;x<=170;x+=17){const a=fx.mistField(x,y,cs,blueDefault,noise),b=fx.mistField(x,y,cs,blueChanged,noise);assert.equal(a.a,b.a);assert.deepEqual(a.l,b.l);if(a.c.some((v,k)=>v!==b.c[k]))recolored++;}assert(recolored>0);
for(const t of [.13,.18,.25,.36,.5,.8]){const o=fx.prepare(),s=fx.state(t,o),b=fx.state(t*.5,{duration:.51});assert.equal(s.radius,b.radius);assert.deepEqual(fx.mistField(75,50,s,o,noise),fx.mistField(75,50,b,fx.prepare({duration:.51}),noise));}
const bgc=createCanvas(1024,768),bg=bgc.getContext('2d');for(const [i,background]of ['original','black','checker','light'].entries())for(const [j,scale]of [.60,.30,.15].entries()){const c=createCanvas(256,256);fx.renderCPU(c,.36,{}, {scale,background});bg.drawImage(c,i*256,j*256);}await writeFile(out+'/QA/background-scale.png',bgc.toBuffer('image/png'));
let maxAlphaR=0;for(const radius of [90,180,220])for(const t of [0,.13,.25,.48,.8,1.02]){const c=createCanvas(256,256);fx.renderCPU(c,t,{radius},{transparent:true,scale:.45});const p=c.getContext('2d').getImageData(0,0,256,256).data;let active=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(p[(y*256+x)*4+3]>2){active++;maxAlphaR=Math.max(maxAlphaR,Math.hypot(x+.5-128,y+.5-128)/(.45*radius));assert(x>0&&x<255&&y>0&&y<255);}if(t===0||t===1.02)assert.equal(active,0);}assert(maxAlphaR<1.12);
const src=await readFile('Tools/PixelFX/src/hd/energy-burst-v6.js'),hash=createHash('sha256').update(src).digest('hex');await copyFile('Tools/PixelFX/src/hd/energy-burst-v6.js',out+'/QA/energy-burst-v6.source.js');
const report={result:'PASS',sourceSha256:hash,checks,whiteRegression,parameterChecks,recolored,maxAlphaR,meta:fx.meta,checksPassed:['finite arbitrary-age field','starts and ends empty','V5 isolated white highlights exact equality','V5 electric paths unchanged','pulse and flow change blue energy','all layers off empty and pulse/flow endpoints finite','mist color changes only blue color, not coverage/light/white','duration scaling','visible alpha bounded without clipping'],limitations:['CPU authoring checks; browser WebGL separately inspected','not Unity or PC performance']};
await writeFile(out+'/QA/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/manifest.json',JSON.stringify({...fx.meta,sourceSha256:hash,baseVersion:'V5 white folds / charge / current paths',texture:'same 128px static noise, no new atlas',unity:false},null,2)+'\n');console.log(JSON.stringify(report));
