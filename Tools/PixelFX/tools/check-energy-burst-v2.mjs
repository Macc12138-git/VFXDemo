#!/usr/bin/env node
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {meta,options,prepare,field,makeNoise,noiseSampler,renderCPU,layerNames} from '../src/hd/energy-burst-v2.js';
const arg=(k,fallback)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:fallback;
const out=arg('--out','Tools/PixelFX/output/hd/EnergyBurst/V2/round1'),module=arg('--canvas-module','@napi-rs/canvas');
const {createCanvas,loadImage}=await import(module.startsWith('/')?pathToFileURL(module).href:module);
await mkdir(out+'/QA',{recursive:true});await mkdir(out+'/Textures',{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),data=makeNoise(),noise=noiseSampler(data);
await writeFile(out+'/Textures/EnergyBurst_Noise.rgba',data);
const tex=createCanvas(256,256),tg=tex.getContext('2d'),ti=tg.createImageData(256,256);ti.data.set(data);tg.putImageData(ti,0,0);
await writeFile(out+'/Textures/EnergyBurst_Noise.png',tex.toBuffer('image/png'));
const times=[0,.025,.065,.12,.20,.29,.40,.54,.68,.82],board=createCanvas(1280,560),bg=board.getContext('2d');
for(const [i,t]of times.entries()){
 const c=createCanvas(256,256);renderCPU(c,t,{}, {scale:.62});const snap=await loadImage(c.toBuffer('image/png'));
 bg.drawImage(snap,i%5*256,Math.floor(i/5)*280+24);bg.fillStyle='#a8cddd';bg.font='12px monospace';bg.fillText(`${t.toFixed(3)} s`,i%5*256+8,Math.floor(i/5)*280+17);
}
await writeFile(out+'/QA/contact.png',board.toBuffer('image/png'));
const hero=createCanvas(720,560);renderCPU(hero,.20);await writeFile(out+'/QA/peak.png',hero.toBuffer('image/png'));
let samples=0,maxOutside=0;
for(const seed of [37,8,92])for(const R of [90,180,240])for(const t of [0,.01,.065,.2,.4,.68,.82,.9]){
 const o=prepare({seed,radius:R});
 for(let y=-R*1.15;y<=R*1.15;y+=R/11)for(let x=-R*1.15;x<=R*1.15;x+=R/11){
  const f=field(x,y,t,o,noise);assert([f.a,...f.c,...f.l].every(Number.isFinite));assert(f.a>=0&&f.a<=1);
  if(t<=0||t>=o.duration)assert.deepEqual(f,{c:[0,0,0],a:0,l:[0,0,0]});
  if(Math.hypot(x,y)>=R){assert.equal(f.a,0);assert.deepEqual(f.c,[0,0,0]);}
  if(Math.hypot(x,y)>=R*1.08){maxOutside=Math.max(maxOutside,f.a,...f.c,...f.l);assert.equal(maxOutside,0);}
  samples++;
 }
}
const none=Object.fromEntries(layerNames.map(k=>[k,false])),empty={c:[0,0,0],a:0,l:[0,0,0]};
for(let x=0;x<=40;x++)assert.deepEqual(field(x,0,.045,prepare({radius:90,initialSize:40,layers:{...none,flash:true}}),noise),field(x,0,.045,prepare({radius:240,initialSize:40,layers:{...none,flash:true}}),noise));
for(let y=-180;y<=180;y+=12)for(let x=-180;x<=180;x+=12){
 assert.deepEqual(field(x,y,.2,prepare({layers:none}),noise),empty);
 assert.deepEqual(field(x,y,.2,prepare({strength:0}),noise),empty);
 const a=field(x,y,.2,prepare(),noise),b=field(x,y,.2,prepare(),noise);assert.deepEqual(a,b);
 assert.deepEqual(field(x,y,.2,prepare({layers:{front:false,shards:false,flash:false},hotColor:'#ff0055'}),noise),field(x,y,.2,prepare({layers:{front:false,shards:false,flash:false}}),noise));
 // Duration changes the clock, not the same normalized pose; R doesn't alter the starting core.
 assert.deepEqual(field(x,y,.2,prepare(),noise),field(x,y,.1,prepare({duration:.41}),noise));
}
const regression=createCanvas(1024,768),rg=regression.getContext('2d');
for(const [i,background]of ['original','black','checker','light'].entries())for(const [j,scale]of [.6,.3,.15].entries()){
 const c=createCanvas(256,256);renderCPU(c,.18,{}, {scale,background});rg.drawImage(await loadImage(c.toBuffer('image/png')),i*256,j*256);
}
await writeFile(out+'/QA/background-scale.png',regression.toBuffer('image/png'));
const layerBoard=createCanvas(1280,280),lg=layerBoard.getContext('2d');
for(const [i,layer]of layerNames.entries()){
 const c=createCanvas(256,256);renderCPU(c,layer==='flash'?.045:.18,{layers:{...none,[layer]:true}}, {scale:.62});
 lg.drawImage(await loadImage(c.toBuffer('image/png')),i*256,24);lg.fillStyle='#a8cddd';lg.font='12px monospace';lg.fillText(layer,i*256+8,17);
}
await writeFile(out+'/QA/layers.png',layerBoard.toBuffer('image/png'));
const limits=createCanvas(1024,280),lm=limits.getContext('2d');
for(const [i,radius]of [90,140,180,240].entries()){
 const c=createCanvas(256,256);renderCPU(c,.20,{radius},{scale:.46});
 lm.drawImage(await loadImage(c.toBuffer('image/png')),i*256,24);lm.fillStyle='#a8cddd';lm.font='12px monospace';lm.fillText(`R ${radius}`,i*256+8,17);
}
await writeFile(out+'/QA/radius.png',limits.toBuffer('image/png'));
assert(!/energy-cluster|EnergyCluster/.test((await readFile('Tools/PixelFX/src/hd/energy-burst-v2.js','utf8')).split('\n').slice(2).join('\n')));
const src=await readFile('Tools/PixelFX/src/hd/energy-burst-v2.js');await copyFile('Tools/PixelFX/src/hd/energy-burst-v2.js',out+'/QA/energy-burst-v2.source.js');
const report={result:'PASS',samples,maxOutside,sourceSha256:sha(src),noiseSha256:sha(data),meta,
checks:['one-shot ends empty','finite field at seeds/radii/time endpoints','maximum support <= 1.08 R','all layers off','strength zero','deterministic','disabled hot layers independent','no EnergyCluster runtime dependency'],
limits:['CPU authoring check, not Unity/PC performance','Browser WebGL playback and controls checked separately','Radius is visual, not gameplay damage']};
await writeFile(out+'/QA/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/manifest.json',JSON.stringify({effect:'EnergyBurst',stage:'authoring only / NOT Unity',...meta,sourceSha256:sha(src),noiseSha256:sha(data),dataTexture:{size:[256,256],channels:'R=coarse shape noise, G=erosion, B=fine detail reserve, A=255',space:'linear data',filter:'bilinear',wrap:'repeat',mipmap:false,bytes:data.length},bounds:'main body within R, low light padding <= 1.08 R',newFlipbook:false},null,2)+'\n');
console.log(JSON.stringify(report));
