#!/usr/bin/env node
// Two static particle stamps only. Never creates animation frames or writes Assets.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeNoise} from '../src/hd/noise-brazier.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root='Tools/PixelFX/src/hd/noise-brazier-art/',input=await loadImage(root+'FlowNoise.png'),source=createCanvas(1024,1024);
source.getContext('2d').drawImage(input,0,0);const noise=makeNoise(source.getContext('2d').getImageData(0,0,1024,1024));
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
function stamp(name,size,alpha){
  const c=createCanvas(size,size),g=c.getContext('2d'),im=g.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=Math.round(clamp(alpha((x+.5)/size,(y+.5)/size))*255);
  }
  g.putImageData(im,0,0);const path=root+name+'.png',bytes=c.toBuffer('image/png');
  let old;try{old=readFileSync(path);}catch{}if(!old||!old.equals(bytes))writeFileSync(path,bytes);console.log(path+' / ONE static '+size+'x'+size+' image');
}
stamp('SmokePuff',256,(u,v)=>{
  const x=(u-.5)*2,y=(v-.5)*2;
  const lobes=[[-.22,-.10,.55],[.18,-.20,.51],[-.27,.26,.42],[.24,.24,.46],[0,.04,.66]];
  let field=0;for(const [cx,cy,r] of lobes){const d=Math.hypot((x-cx)/r,(y-cy)/r);field=Math.max(field,1-smooth(.24,1,d));}
  const detail=noise(u*1.8+.31,v*1.8+.57),fine=noise(u*4.1+.76,v*4.1+.13);
  return field*(.50+.50*detail)*(.82+.18*fine)*(1-smooth(.80,.97,Math.hypot(x,y)));
});
stamp('SparkStreak',64,(u,v)=>{
  const x=(u-.5)/.43,y=(v-.5)/(.044*(1-.55*Math.abs(x)));
  return Math.pow(clamp(1-x*x),.5)*Math.exp(-y*y*1.8)*(1-smooth(.83,1,Math.abs(x)));
});
