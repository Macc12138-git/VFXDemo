#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCPU,meta,presets} from '../src/hd/noise-brazier.js';
import {smokeParticles} from '../src/hd/noise-brazier-secondary.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root='Tools/PixelFX/src/hd/noise-brazier-art/',imgs=await Promise.all(['FlowNoise','PropBack','PropFront','SmokePuff','SparkStreak'].map(x=>loadImage(root+x+'.png')));
assert.equal(imgs[0].width,1024);assert.equal(imgs[0].height,1024);
const hash=createHash('sha256').update(readFileSync(root+'FlowNoise.png')).digest('hex');
assert.equal(hash,'325b9dffbe60f65fbade5c83c4239a5e3bf6a09da0113e53a7f3508810b6e50d','User texture must not be replaced by procedural substitute.');
const n=createCanvas(1024,1024);n.getContext('2d').drawImage(imgs[0],0,0);
const assets={back:imgs[1],front:imgs[2],smoke:imgs[3],spark:imgs[4]},noiseData=n.getContext('2d').getImageData(0,0,1024,1024);
const c=createCanvas(256,320),g=c.getContext('2d'),render=createCPU(c,noiseData,assets);
const frame=(t,o={})=>{render(t,o);return Buffer.from(g.getImageData(0,0,c.width,c.height).data);};
const a=frame(1.25),b=frame(1.25);assert.ok(a.equals(b),'Determinism');assert.ok(!a.equals(frame(1.6)),'Time must change image');
const paramChecks={};for(const [key,value] of Object.entries({flow:.5,scale:.75,stretch:5,distortion:0,dissolve:.8,softness:.15,core:1,steps:1,glow:0,sparkDensity:0,smokeDensity:0,smokeOpacity:0,wind:-.7})){
  paramChecks[key]=!a.equals(frame(1.25,{[key]:value}));assert.ok(paramChecks[key],key+' has no visible effect');
}
const first=frame(0),last=frame(8);assert.ok(first.equals(last),'Default loop endpoints');
for(const preset of Object.values(presets))assert.ok(frame(0,preset).equals(frame(8/preset.flow,preset)),'Preset loop endpoints');
const fire=frame(1.25,{layer:'fire',dissolve:1});assert.equal(fire.filter((_,i)=>i%4===3).reduce((s,v)=>s+v,0),0,'Dissolve=1 must fully remove flame');
const empty=p=>p.every((x,i)=>i%4!==3||x===0);
assert.ok(empty(frame(1.25,{layer:'sparks',sparkDensity:0})),'Spark density zero must remove the layer');
assert.ok(empty(frame(1.25,{layer:'smoke',smokeDensity:0})),'Smoke density zero must remove the layer');
const old=await import(pathToFileURL(resolve('Tools/PixelFX/output/hd/noise-brazier/flame-v3/source.js')).href);
const baselineCanvas=createCanvas(256,320),baseline=old.createCPU(baselineCanvas,noiseData,assets);
for(const t of [0,.5,1.25,2.5,4,5.75,7.9]){baseline(t,{layer:'fire'});assert.ok(frame(t,{layer:'fire'}).equals(Buffer.from(baselineCanvas.getContext('2d').getImageData(0,0,256,320).data)),'Approved fire pixels changed at '+t);}
const shaderHash=createHash('sha256').update(readFileSync('Tools/PixelFX/src/hd/noise-brazier.frag')).digest('hex');
assert.equal(shaderHash,'a36f84f4acd50234ffecd5dab89eaf3528172920e33f74bc81024808b168127f','Approved fire shader must stay unchanged');
const p0=smokeParticles(1,meta.options),p1=smokeParticles(1.1,meta.options),common=p0.map(q=>[q,p1.find(p=>p.id===q.id)]).filter(([a,b])=>b&&b.age>a.age);
assert.ok(common.length>0&&common.every(([a,b])=>b.y<a.y&&b.size>a.size),'Smoke must rise and expand');
let maxBorder=0,minVisible=1e9,maxVisible=0;const timings=[],changes=[];let previous;
const delta=(x,y)=>{let s=0;for(let i=3;i<x.length;i+=4)s+=Math.abs(x[i]-y[i]);return s/(c.width*c.height*255);};
for(let i=0;i<240;i++){
  const t=performance.now(),pixels=frame(i/30);timings.push(performance.now()-t);let visible=0,border=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const alpha=pixels[(y*c.width+x)*4+3];if(alpha>2)visible++;if((x<2||y<2||x>=c.width-2||y>=c.height-2)&&alpha>2)border++;}
  maxBorder=Math.max(maxBorder,border);minVisible=Math.min(minVisible,visible);maxVisible=Math.max(maxVisible,visible);
  if(previous)changes.push(delta(previous,pixels));previous=pixels;
}
assert.equal(maxBorder,0,'Canvas edge clipping');assert.ok(minVisible>1400,'Unexpectedly empty full effect');
const seam=delta(previous,first);changes.sort((x,y)=>x-y);assert.ok(seam<.035,'Large loop seam');
timings.sort((x,y)=>x-y);const report={passed:true,size:[256,320],sampledFrames:240,sourceNoiseSha256:hash,
  textureFrames:1,atlas:false,unityModified:false,deterministic:true,timeChanges:true,exactLoopEndpoints:true,
  parameterChanges:paramChecks,allPresetsLoop:true,dissolveOneEmpty:true,noEdgeClipping:true,minVisible,maxVisible,
  approvedFlamePixelsUnchanged:true,approvedShaderHash:shaderHash,additionalStaticTextures:2,secondaryZeroRemovesLayers:true,smokeRisesAndExpands:true,
  seamAlphaDelta:seam,medianStepAlphaDelta:changes[Math.floor(changes.length/2)],medianCpuMs:timings[Math.floor(timings.length/2)],
  scope:'Offline CPU reference at 256x320, not browser GPU timing, Unity validation, or device-performance guarantee.'};
const out=resolve(flags.out??'Tools/PixelFX/output/hd/noise-brazier');mkdirSync(out,{recursive:true});writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
