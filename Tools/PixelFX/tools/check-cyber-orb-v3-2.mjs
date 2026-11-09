#!/usr/bin/env node
// Canvas authoring QA: still images and regression data, no Unity/GIF writes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {meta,draw,drawImpact,sample} from '../src/hd/cyber-orb-v3-2.js';
import {draw as drawBase,drawImpact as hitBase,meta as baseMeta} from '../src/hd/cyber-orb-v3-1.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'output/hd/CyberOrb/V3_2'),round=flags.round??'final';
await mkdir(out,{recursive:true});const hash=v=>createHash('sha256').update(v).digest('hex');
function frame(fn,t,o={}){const c=createCanvas(360,220),g=c.getContext('2d');g.translate(210,110);g.scale(3,3);fn(g,t,o);return{c,data:g.getImageData(0,0,360,220).data};}
const pixels=(fn,t,o)=>hash(frame(fn,t,o).data);
for(const t of [0,.016,.05,.09,.15,.2,.7,1,4]){
  assert.equal(pixels(draw,t,{glow:0,outline:baseMeta.options.outline}),pixels(drawBase,t,{}),'old palette + no glow equals V3.1');
  assert.equal(pixels(draw,t,{layers:{core:false}}),pixels(drawBase,t,{layers:{core:false}}),'trail unchanged');
  assert.equal(pixels(drawImpact,t,{}),pixels(hitBase,t,{}),'impact unchanged');
}
assert.equal(pixels(draw,1,{layers:{glow:false}}),pixels(drawBase,1,{outline:meta.options.outline}),'glow toggle independent');
assert.notEqual(pixels(draw,1),pixels(draw,1,{glow:0}),'glow visible');
for(const [key,value] of [['outline','#ff4477'],['glow',.2],['glowRadius',1.2]])assert.notEqual(pixels(draw,1),pixels(draw,1,{[key]:value}),key+' control');
for(const seed of [1,42,179])for(const t of [0,.25,1,2,3.99]){assert.deepEqual(sample(t,{seed}),sample(t,{seed}));assert.equal(pixels(draw,t,{seed}),pixels(draw,t,{seed}));}
assert.equal(pixels(draw,0),pixels(draw,4),'exact loop');
let strokes=0,radial=0,linear=0,additive=0;
const probe=createCanvas(360,220).getContext('2d'),counted=new Proxy(probe,{get(target,key){const value=Reflect.get(target,key,target);return typeof value==='function'?function(...args){if(key==='stroke')strokes++;if(key==='createRadialGradient')radial++;if(key==='createLinearGradient')linear++;return value.apply(target,args);}:value;},set(target,key,value){if(key==='globalCompositeOperation'&&value==='lighter')additive++;return Reflect.set(target,key,value,target);}});
draw(counted,1);assert.equal(strokes,1,'one outline only');assert.equal(radial,2,'core edge + one halo');assert.equal(linear,1,'unchanged trail');assert.equal(additive,1,'single additive light layer');
let maxRadius=0,outerAlpha=0;
for(const radius of [6,14])for(const t of [0,.25,.5,1,2,3.99]){
  const{data}=frame(draw,t,{radius,layers:{trail:false}});
  for(let y=0;y<220;y++)for(let x=0;x<360;x++)if(data[(y*360+x)*4+3]){
    const d=Math.hypot(x+.5-210,y+.5-110),a=data[(y*360+x)*4+3];maxRadius=Math.max(maxRadius,d/(radius*3));
    assert(d<=radius*3*meta.options.glowRadius*1.01+1,'compact halo bounds');if(d>radius*3*1.08)outerAlpha+=a;
  }
}
assert(outerAlpha>0,'small exterior soft light exists');
for(const glowRadius of [1.15,1.5])for(const glow of [0,1])for(const radius of [6,14]){
  const{data}=frame(draw,1,{glowRadius,glow,radius,layers:{trail:false}});
  for(let y=0;y<220;y++)for(let x=0;x<360;x++)if(data[(y*360+x)*4+3])assert(Math.hypot(x+.5-210,y+.5-110)<=radius*3*glowRadius*1.01+1,'UI endpoints remain compact and unclipped');
}
const sheet=createCanvas(1280,640),g=sheet.getContext('2d'),bgs=['#081020','#d9dfe3','#6e5546','checker'];
for(let i=0;i<4;i++){
  const x=i%2*640,y=Math.floor(i/2)*320;g.fillStyle=bgs[i]==='checker'?'#152334':bgs[i];g.fillRect(x,y,640,320);
  if(bgs[i]==='checker'){g.fillStyle='#22384a';for(let a=0;a<640;a+=16)for(let b=0;b<320;b+=16)if((a/16+b/16)%2)g.fillRect(x+a,y+b,16,16);}
  g.fillStyle=i===1?'#3d5970':'#86adc7';g.font='16px sans-serif';g.fillText(['DARK / 3x + GAME SIZE','LIGHT / 3x + GAME SIZE','WARM / 3x + GAME SIZE','ALPHA CHECKER / 3x + GAME SIZE'][i],x+24,y+30);
  for(const [px,scale,o] of [[240,3,{}],[440,1,{radius:6}],[500,1,{radius:6}],[560,1,{radius:6}]]){g.save();g.translate(x+px,y+145);g.scale(scale,scale);draw(g,1,o);g.restore();}
  for(const [j,t] of [0,.016,.07,.15,.2].entries()){g.save();g.translate(x+90+j*120,y+255);g.scale(1.5,1.5);drawImpact(g,t,{radius:10});g.restore();}
}
await writeFile(resolve(out,`${round}-review.png`),sheet.toBuffer('image/png'));
await writeFile(resolve(out,`${round}-transparent.png`),frame(draw,1).c.toBuffer('image/png'));
const design=createCanvas(1280,420),dg=design.getContext('2d');dg.fillStyle='#081020';dg.fillRect(0,0,1280,420);
for(const [x,fn,t] of [[350,draw,1],[1000,drawImpact,.016]]){dg.save();dg.translate(x,220);dg.scale(3,3);fn(dg,t);dg.restore();}
await writeFile(resolve(out,`${round}-design.png`),design.toBuffer('image/png'));
const baselineHash=hash(await readFile(resolve(root,'src/hd/cyber-orb-v3-1.js'))),sceneHash=hash(await readFile(resolve(root,'../../Assets/Scenes/VFXWorkbench.unity')));
assert.equal(baselineHash,'4987e9c991270955c18d5528deb01e9582ade69c4a76a3876fbaad2312a6231b','V3.1 preserved');
assert.equal(sceneHash,'4f3964be0cf5b1c6589b903f09561917e998a6c01595a0a9c3bf987243cdb11f','user scene untouched');
const report={version:meta.version,round,tests:'PASS',seed:42,options:meta.options,sourceSha256:hash(await readFile(resolve(root,'src/hd/cyber-orb-v3-2.js'))),baselineHash,sceneHash,
  maxRadiusRatioIncludingAntialias:maxRadius,canvasLayers:{outlineStrokes:strokes,additiveLightLayers:additive},regression:'trail and impact pixel-identical to V3.1',
  notTested:['Unity visuals / batches / CPU / GPU / memory','target-device performance']};
await writeFile(resolve(out,`${round}-qa.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
