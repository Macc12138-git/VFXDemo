#!/usr/bin/env node
// Source-vs-engine review only. Never generates runtime textures.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCPU,presets} from '../src/hd/noise-brazier.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root='VFXWork/Previews/Brazier/NoiseRealtime',art='Tools/PixelFX/src/hd/noise-brazier-art/';
const images=await Promise.all(['FlowNoise','PropBack','PropFront','SmokePuff','SparkStreak'].map(n=>loadImage(art+n+'.png')));
const n=createCanvas(1024,1024);n.getContext('2d').drawImage(images[0],0,0);
const source=createCanvas(1024,1280),render=createCPU(source,n.getContext('2d').getImageData(0,0,1024,1024),{back:images[1],front:images[2],smoke:images[3],spark:images[4]});
const c=createCanvas(1024,1328),g=c.getContext('2d');
for(let row=0;row<2;row++){
 const time=row===0?.8:1.8,y=row*664;g.fillStyle='#151820';g.fillRect(0,y,1024,664);render(time,presets.fierce);g.drawImage(source,0,y+24,512,640);
 g.drawImage(await loadImage(root+'/SourcePhase_'+time.toFixed(1)+'.png'),512,y+24,512,640);g.font='14px sans-serif';g.fillStyle='#c9b49c';
 g.fillText('PIXELFX SOURCE / '+time+'s',16,y+17);g.fillText('UNITY NATIVE + REALTIME SHADER / '+time+'s',528,y+17);
}
writeFileSync(root+'/Comparison.png',c.toBuffer('image/png'));
// Preserve a source reference at the engine layer capture's exact authored phase.
render(.8,{...presets.fierce,layer:'fire'});writeFileSync(root+'/SourceFire_0.8.png',source.toBuffer('image/png'));
const layers=createCanvas(960,840),lg=layers.getContext('2d');lg.fillStyle='#151820';lg.fillRect(0,0,960,840);
for(const [i,name] of ['01_Fire','02_Sparks','03_Smoke','04_Glow','05_Prop','Oblique30deg'].entries()){
 const x=i%3*320,y=Math.floor(i/3)*420;lg.drawImage(await loadImage(root+'/'+name+'.png'),x,y+20,320,400);lg.font='12px sans-serif';lg.fillStyle='#c9b49c';lg.fillText(name,x+12,y+15);
}
writeFileSync(root+'/LayersAndOblique.png',layers.toBuffer('image/png'));
const probePixels=async name=>{const im=await loadImage(root+'/'+name+'.png'),c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data,bg=[d[0],d[1],d[2]];let visible=0;for(let i=0;i<d.length;i+=4)if(Math.max(...bg.map((v,k)=>Math.abs(d[i+k]-v)))>3)visible++;return visible;};
const dissolvedPixels=await probePixels('Dissolve1'),noisePixels=await probePixels('NoiseData');
const checks={passed:dissolvedPixels===0&&noisePixels>1000,materialDissolveOneClears:dissolvedPixels===0,noiseDataLayerVisible:noisePixels>1000,dissolvedPixels,noisePixels,
 scope:'Unity Edit Mode camera captures from cloned QA material; actual Play Mode results recorded separately in LivePlayback.json. Source/Unity random secondary particles are not pixel-identical.'};
writeFileSync(root+'/MaterialChecks.json',JSON.stringify(checks,null,2));if(!checks.passed)throw Error('Unity material parameter probe failed.');
console.log(root+'/Comparison.png');
