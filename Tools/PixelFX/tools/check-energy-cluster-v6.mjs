#!/usr/bin/env node
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {meta,makeSampler,options,field,shellAt,renderCPU} from '../src/hd/energy-cluster-v6.js';
const arg=k=>process.argv[process.argv.indexOf(k)+1],modulePath=arg('--canvas-module');
const {createCanvas,loadImage}=await import(modulePath.startsWith('/')?pathToFileURL(modulePath).href:modulePath);
const root='Tools/PixelFX/output/hd/EnergyCluster/V6/final',out=root+'/QA';await mkdir(out,{recursive:true});
const data=new Uint8Array(await readFile(root+'/Textures/EnergyCluster_ShellGrayAlpha.rg')),profiles=new Uint8Array(await readFile(root+'/Textures/EnergyCluster_Profiles.rgba'));
assert.equal(data.length,1280*1024*2);assert.equal(profiles.length,256*3*4);
const sampler=makeSampler({data,profiles});
const original=await loadImage('Tools/PixelFX/output/hd/EnergyCluster/V3/Textures/EnergyCluster_Sequence.png');
const ref=createCanvas(1280,1024),rg=ref.getContext('2d');
for(let i=0;i<20;i++)rg.drawImage(original,i%5*512+80,Math.floor(i/5)*512+80,352,352,i%5*256,Math.floor(i/5)*256,256,256);
await writeFile(out+'/Reference_Transparent.png',ref.toBuffer('image/png'));
const none={shell:false,core:false,volume:false,glow:false};
const small=(t,o={},background='original',frameSize=256)=>{const c=createCanvas(256,256);renderCPU(c,t,o,sampler,{background,frameSize});return c;};
const board=createCanvas(1024,768),bg=board.getContext('2d');
for(const [i,b]of ['original','black','light','checker'].entries())for(const [j,size]of [256,128,64].entries())bg.drawImage(small(.144,{},b,size),i*256,j*256);
await writeFile(out+'/background-scale.png',board.toBuffer('image/png'));
const layers=createCanvas(1024,256),lg=layers.getContext('2d');
for(const [i,layer]of Object.keys(none).entries())lg.drawImage(small(.144,{layers:{...none,[layer]:true}}),i*256,0);
await writeFile(out+'/layers.png',layers.toBuffer('image/png'));
const comp=createCanvas(1024,560),cg=comp.getContext('2d');cg.fillStyle='#050716';cg.fillRect(0,0,1024,560);
for(const [j,i]of [6,12].entries()){
 const y=j*280+24;cg.drawImage(ref,i%5*256,Math.floor(i/5)*256,256,256,0,y,256,256);
 cg.drawImage(small(i/meta.fps),256,y);cg.drawImage(small(i/meta.fps,{layers:{...none,shell:true}}),512,y);
 cg.drawImage(small(i/meta.fps,{layers:{shell:false}}),768,y);
 for(const [k,label]of ['REFERENCE','HYBRID','SHELL ONLY','REALTIME ONLY'].entries()){cg.fillStyle='#a3c4db';cg.font='11px monospace';cg.fillText(`${label} / ${i}`,k*256+8,y-7);}
}
await writeFile(out+'/runtime-comparison.png',comp.toBuffer('image/png'));
let samples=0,maxLoop=0,nearBoundary=0;
for(const mode of ['short','alpha','step'])for(let i=0;i<20;i++)for(let y=-100;y<=100;y+=8)for(let x=-100;x<=100;x+=8){
 const t=i/meta.fps,o={interpolation:mode};
 const a=shellAt(x,y,t,o,sampler),b=shellAt(x,y,t+meta.duration,o,sampler);
 maxLoop=Math.max(maxLoop,Math.abs(a.alpha-b.alpha),...a.color.map((v,k)=>Math.abs(v-b.color[k])));
 assert([a.alpha,...a.color].every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 if(mode==='short')nearBoundary+=Math.abs(shellAt(x,y,t-1e-7,o,sampler).alpha-shellAt(x,y,t+1e-7,o,sampler).alpha);
 samples++;
}
assert(maxLoop<1e-10);
for(let y=-120;y<=120;y+=8)for(let x=-120;x<=120;x+=8){
 assert.deepEqual(field(x,y,.144,{layers:none},sampler),[5/255,7/255,22/255]);
 const off={layers:{shell:false}};assert.deepEqual(field(x,y,.144,{...off,shellHot:'#ff2200'},sampler),field(x,y,.144,off,sampler));
 assert.deepEqual(field(x,y,.144,{shellOpacity:0},sampler),field(x,y,.144,off,sampler));
 const c=field(x,y,.144,{},sampler);assert(c.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
}
for(const [row,name]of ['volume','halo','core'].entries())assert.deepEqual(sampler.profile(300,row),[0,0,0,0],`${name} must end empty`);
const source=await readFile('Tools/PixelFX/src/hd/energy-cluster-v6.js'),sha=b=>createHash('sha256').update(b).digest('hex');
assert(!/Math\.random|\bDate\b/.test(source.toString()));
await copyFile('Tools/PixelFX/src/hd/energy-cluster-v6.js',out+'/energy-cluster-v6.source.js');
const report={result:'PASS',samples,maxLoop,meanNearBoundaryAlphaDelta:nearBoundary/(samples/3),sourceSha256:sha(source),rawSha256:sha(data),meta,
 checks:['finite field and all 20 frame boundaries','exact cyclic repeat','short premultiplied transitions continuous','disabled layers empty','shell opacity 0 equals shell off','disabled-shell color independence','radial profiles end empty','deterministic source'],
 limits:['Not optical-flow interpolation or new inbetween shapes','CPU reference only; WebGL playback/controls verified separately','No Unity or target PC performance claim']};
await writeFile(out+'/runtime-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
