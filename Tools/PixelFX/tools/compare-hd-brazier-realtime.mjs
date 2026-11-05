#!/usr/bin/env node
// Comparison outputs only. Never imports images into Unity or builds runtime animation.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {draw,meta} from '../src/hd/brazier-handpainted.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const out=resolve(flags.out??'VFXWork/Previews/Brazier/HandPaintedRealtime');mkdirSync(out,{recursive:true});
const source=createCanvas(1024,1280);draw(source.getContext('2d'),+(flags.time??0.7666667),meta.options);
const composite=createCanvas(1024,1280),bg=composite.getContext('2d');bg.fillStyle='#151820';bg.fillRect(0,0,1024,1280);bg.drawImage(source,0,0);
writeFileSync(out+'/PixelFX_Source.png',composite.toBuffer('image/png'));
const comparison=createCanvas(1024,684),ctx=comparison.getContext('2d');ctx.fillStyle='#151820';ctx.fillRect(0,0,1024,684);
ctx.drawImage(composite,0,44,512,640);ctx.drawImage(await loadImage(readFileSync(out+'/SourcePhase_0.8.png')),512,44,512,640);
ctx.fillStyle='#c0b3a6';ctx.font='16px sans-serif';ctx.fillText('PIXELFX / APPROVED HAND-PAINTED SOURCE',20,28);ctx.fillText('UNITY / REALTIME SHADER + NATIVE PARTICLES',532,28);
writeFileSync(out+'/Comparison.png',comparison.toBuffer('image/png'));
console.log('Source and Unity comparison: '+out+'/Comparison.png');
