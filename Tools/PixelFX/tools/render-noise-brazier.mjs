#!/usr/bin/env node
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCPU,meta,presets} from '../src/hd/noise-brazier.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const out=resolve(flags.out??'Tools/PixelFX/output/hd/noise-brazier'),width=+(flags.width??512),height=Math.round(width*1.25);mkdirSync(out,{recursive:true});
const art='Tools/PixelFX/src/hd/noise-brazier-art/',imgs=await Promise.all(['FlowNoise','PropBack','PropFront','SmokePuff','SparkStreak'].map(x=>loadImage(art+x+'.png')));
const noiseCanvas=createCanvas(1024,1024);noiseCanvas.getContext('2d').drawImage(imgs[0],0,0);
const c=createCanvas(width,height),g=c.getContext('2d'),render=createCPU(c,noiseCanvas.getContext('2d').getImageData(0,0,1024,1024),{back:imgs[1],front:imgs[2],smoke:imgs[3],spark:imgs[4]});
const opts={...meta.options,...(flags.opts?JSON.parse(flags.opts):{})},contact=createCanvas(1024,688),cg=contact.getContext('2d');
const capture=async(t,o)=>{render(t,o);return loadImage(c.toBuffer('image/png'));};
for(let i=0;i<8;i++){
  const img=await capture(i,opts),x=i%4*256,y=Math.floor(i/4)*344;cg.fillStyle=i<4?'#151820':'#bbb7b1';cg.fillRect(x,y,256,344);cg.drawImage(img,x,y+24,256,320);
  cg.font='12px sans-serif';cg.fillStyle=i<4?'#c5b7a6':'#50443c';cg.fillText(i+'.00s / '+(i<4?'DARK':'LIGHT'),x+12,y+17);
}
writeFileSync(out+'/contact.png',contact.toBuffer('image/png'));
render(1.25,opts);writeFileSync(out+'/transparent.png',c.toBuffer('image/png'));
const poster=createCanvas(width,height),pg=poster.getContext('2d');pg.fillStyle='#151820';pg.fillRect(0,0,width,height);pg.drawImage(c,0,0);writeFileSync(out+'/poster.png',poster.toBuffer('image/png'));
const variants=createCanvas(960,440),vg=variants.getContext('2d');let k=0;for(const [id,preset] of Object.entries(presets)){
  const x=k++*320;vg.fillStyle='#151820';vg.fillRect(x,0,320,440);vg.drawImage(await capture(1.25,preset),x,40,320,400);vg.fillStyle='#d0b28a';vg.font='16px sans-serif';vg.fillText(id.toUpperCase(),x+16,28);
}writeFileSync(out+'/presets.png',variants.toBuffer('image/png'));
const layers=createCanvas(1024,688),lg=layers.getContext('2d');
for(let i=0;i<8;i++){
  const layer=['fire','sparks','smoke','combined'][i%4],x=i%4*256,y=Math.floor(i/4)*344;
  lg.fillStyle=i<4?'#151820':'#bbb7b1';lg.fillRect(x,y,256,344);lg.drawImage(await capture(1.25,{...opts,layer}),x,y+24,256,320);
  lg.fillStyle=i<4?'#c5b7a6':'#50443c';lg.font='12px sans-serif';lg.fillText(layer.toUpperCase(),x+12,y+17);
}writeFileSync(out+'/layers.png',layers.toBuffer('image/png'));
if(flags.frames==='true'){
  mkdirSync(out+'/frames',{recursive:true});for(let i=0;i<120;i++){render(i/15,opts);writeFileSync(out+'/frames/frame-'+String(i).padStart(3,'0')+'.png',c.toBuffer('image/png'));}
}
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
writeFileSync(out+'/authoring.json',JSON.stringify({...meta,options:opts,source:'Tools/PixelFX/src/hd/noise-brazier.js',shader:'Tools/PixelFX/src/hd/noise-brazier.frag',
  sourceSha256:hash('Tools/PixelFX/src/hd/noise-brazier.js'),shaderSha256:hash('Tools/PixelFX/src/hd/noise-brazier.frag'),
  noise:'Tools/PixelFX/src/hd/noise-brazier-art/FlowNoise.png',noiseSha256:hash(art+'FlowNoise.png'),
  additionalStaticTextures:[{file:'SmokePuff.png',size:[256,256]},{file:'SparkStreak.png',size:[64,64]}],
  approvedFlameUnchanged:true,secondarySource:'Tools/PixelFX/src/hd/noise-brazier-secondary.js',
  authorizedStage:'authoring-and-preview-only',unityModified:false,textureFrames:1,atlas:false,previewFramesOnly:flags.frames==='true',
  method:'User static grayscale image sampled at multiple scroll speeds; vertical UV stretch, domain warp, tapered plume mask, threshold erosion, temperature color ramp. Browser executes WebGL fragment shader. Offline CPU reference is for QA media, not runtime flipbook.'},null,2));
console.log('Rendered '+out);
