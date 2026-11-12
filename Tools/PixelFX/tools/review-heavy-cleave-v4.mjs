// Review stills and checks for the painted surface. Never produces a playback atlas or GIF.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as fx from '../src/hd/heavy-cleave-v4.js';
import * as old from '../src/hd/heavy-cleave-v3.js';
import {renderReference} from '../src/hd/heavy-cleave-reference.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=flags.round??'final';assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/HeavyCleave/V4',round);await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
function image(t,o={},bg='dark',W=1024,H=768,mod=fx){const c=createCanvas(W,H);mod.render(c,t,o,{background:bg});return c;}
const raw=(t,o={})=>image(t,o,'transparent').getContext('2d').getImageData(0,0,1024,768).data;
const signature=(t,o={})=>hash(raw(t,o));
assert(raw(0).every(v=>v===0)&&raw(fx.meta.duration).every(v=>v===0),'first and last empty');
assert.equal(signature(.16),signature(.16),'determinism');assert.notEqual(signature(.06),signature(.135),'motion advances');
const off=Object.fromEntries(Object.keys(fx.meta.options.layers).map(k=>[k,false]));
assert(raw(.16,{layers:off}).every(v=>v===0),'all layers off');
for(const key of Object.keys(off))assert.notEqual(signature(.16),signature(.16,{layers:{[key]:false}}),key+' visible');
for(const key of ['body','shadow','highlight','edge'])assert.notEqual(signature(.16),signature(.16,{[key]:'#4899d9'}),key+' recolors');
for(const key of ['shade','detail','deform'])assert.notEqual(signature(.16),signature(.16,{[key]:0}),key+' affects surface');
assert.deepEqual(fx.timing,old.timing);assert.deepEqual(fx.meta.pivot,old.meta.pivot);
let maxTrajectoryError=0;
for(const t of [.025,.06,.10,.135,.175,.23,.29,.35]){
  const a=fx.sample(t),b=old.sample(t);assert.equal(a.head,b.head);assert.equal(a.tail,b.tail);
  for(const u of [0,.2,.6,1]){
    const p=fx.pointAt(u,0,a),q=old.pointAt(u,0,b);maxTrajectoryError=Math.max(maxTrajectoryError,Math.hypot(p[0]-q[0],p[1]-q[1]));
  }
}assert.equal(maxTrajectoryError,0,'direction and outer arc preserve V3');
const f=fx.sample(.16),d=raw(.16,{buffer:'color'}),baseline=image(.16,{buffer:'color'},'transparent',1024,768,old).getContext('2d').getImageData(0,0,1024,768).data;
let leadingPixels=0;for(let r=0;r<fx.widthAt(.008,f);r++){
  const p=fx.pointAt(.008,r,f),x=Math.round(p[0]+fx.meta.pivot[0]),y=Math.round(p[1]+fx.meta.pivot[1]);
  if(d[(y*1024+x)*4+3]>200)leadingPixels++;
}assert(leadingPixels>fx.meta.options.bladeLength*.8,'wide leading face');
// Sample the marked front face in swing coordinates, excluding the rim and concave cutout.
let samples=0,changed=0;const values=[];
for(const u of [.025,.05,.08,.12,.16,.20])for(const q of [.12,.22,.32,.42,.52,.62,.72]){
  const p=fx.pointAt(u,fx.widthAt(u,f)*q,f),x=Math.round(p[0]+fx.meta.pivot[0]),y=Math.round(p[1]+fx.meta.pivot[1]),i=(y*1024+x)*4;
  if(d[i+3]<250||baseline[i+3]<250)continue;
  samples++;if(Math.hypot(d[i]-baseline[i],d[i+1]-baseline[i+1],d[i+2]-baseline[i+2])>12)changed++;
  values.push(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);
}const frontChangedRatio=changed/samples,frontLuminanceRange=Math.max(...values)-Math.min(...values);
assert(frontChangedRatio>.55,'detail reaches the formerly flat anterior face');assert(frontLuminanceRange>35,'front has meaningful broad shading');
let boundaryAlpha=0;
for(const bladeLength of [140,176,240])for(let i=0;i<=20;i++){
  const bytes=raw(i*fx.meta.duration/20,{bladeLength});
  for(let x=0;x<1024;x++)boundaryAlpha+=bytes[x*4+3]+bytes[((768-1)*1024+x)*4+3];
  for(let y=0;y<768;y++)boundaryAlpha+=bytes[y*1024*4+3]+bytes[(y*1024+1023)*4+3];
}assert.equal(boundaryAlpha,0,'no frame-edge clipping');
await writeFile(resolve(out,'hero.png'),image(.16).toBuffer('image/png'));
await writeFile(resolve(out,'color.png'),image(.16,{buffer:'color'},'transparent').toBuffer('image/png'));
const times=[.025,.06,.10,.135,.175,.23,.29,.35,.405,.52];
const contact=createCanvas(1600,544),cg=contact.getContext('2d');cg.fillStyle='#15171e';cg.fillRect(0,0,1600,544);
for(const [i,t]of times.entries()){
  const x=i%5*320,y=Math.floor(i/5)*272;cg.drawImage(image(t,{},'dark',640,480),x,y+26,320,240);cg.fillStyle='#d4c5b1';cg.font='13px sans-serif';cg.fillText(t.toFixed(3)+' s',x+12,y+18);
}await writeFile(resolve(out,'contact.png'),contact.toBuffer('image/png'));
for(const [name,items]of [['backgrounds',['dark','gray','light','warm','checker','transparent']],['layers',['combined',...Object.keys(off)]]]){
  const sheet=createCanvas(1536,Math.ceil(items.length/3)*418),g=sheet.getContext('2d');
  for(const [i,key]of items.entries()){
    const x=i%3*512,y=Math.floor(i/3)*418;g.fillStyle='#15171e';g.fillRect(x,y,512,418);
    const o=name==='layers'&&key!=='combined'?{layers:{...off,[key]:true}}:key==='transparent'?{buffer:'color'}:{};
    g.drawImage(image(.16,o,name==='backgrounds'?key:'dark',512,384),x,y+28);g.fillStyle='#c6b9a7';g.font='13px sans-serif';g.fillText(key,x+14,y+19);
  }await writeFile(resolve(out,name+'.png'),sheet.toBuffer('image/png'));
}
const comparison=createCanvas(1536,624),g=comparison.getContext('2d');g.fillStyle='#15171e';g.fillRect(0,0,1536,624);
g.drawImage(image(.16,{},'dark',768,576,old),0,36);g.drawImage(image(.16,{},'dark',768,576),768,36);
g.fillStyle='#e1d1ba';g.font='16px sans-serif';g.fillText('V3 / flat front face',24,26);g.fillText('V4 / painted shade, reflection and flow strokes',792,26);
await writeFile(resolve(out,'v3-comparison.png'),comparison.toBuffer('image/png'));
const close=createCanvas(1200,640),z=close.getContext('2d');z.fillStyle='#15171e';z.fillRect(0,0,1200,640);
for(const [i,mod]of [old,fx].entries()){
  z.drawImage(image(.16,{},'dark',1024,768,mod),510,285,245,375,i*600+115,48,360,550);
  z.fillStyle='#dfcfb7';z.font='16px sans-serif';z.fillText(i?'V4 / anterior paint detail':'V3 / anterior baseline',i*600+24,26);
}await writeFile(resolve(out,'front-comparison.png'),close.toBuffer('image/png'));
const small=createCanvas(800,360),sm=small.getContext('2d');sm.fillStyle='#53565e';sm.fillRect(0,0,800,360);
for(const [i,size]of [96,192,384].entries()){
  const x=[20,150,390][i];sm.drawImage(image(.16,{},'gray',size,size*3/4),x,40);sm.fillStyle='#eee4d7';sm.font='13px sans-serif';sm.fillText(size+' px canvas',x,340);
}await writeFile(resolve(out,'game-size.png'),small.toBuffer('image/png'));
const reference=createCanvas(1536,624),rg=reference.getContext('2d');rg.fillStyle='#15171e';rg.fillRect(0,0,1536,624);
const source=createCanvas(768,576);renderReference(source,.135,createCanvas);rg.drawImage(source,0,36);rg.drawImage(image(.135,{},'dark',768,576),768,36);
rg.fillStyle='#dfcfb7';rg.font='16px sans-serif';rg.fillText('Original Heavy cleave / isolated blade',24,26);rg.fillText('V4 / same phase, pivot, direction and scale',792,26);
await writeFile(resolve(out,'reference-comparison.png'),reference.toBuffer('image/png'));
const canvas=createCanvas(1024,768),cpu=[];
for(let i=0;i<70;i++){const start=performance.now();fx.render(canvas,(i%30)/30*.4);cpu.push(performance.now()-start);}cpu.sort((a,b)=>a-b);
const report={effect:fx.meta.id,version:fx.meta.version,round,checks:'PASS',options:fx.options(),leadingPixels,boundaryAlpha,maxTrajectoryError,
  anterior:{samples,changed,frontChangedRatio,frontLuminanceRange,conditions:'At t=.16, u=.025 to .20 and inset .12 to .72 of blade width; excludes thin rim.'},
  firstAndLastEmpty:true,deterministic:true,sourceSha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave-v4.js'))),preservedV3Sha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave-v3.js'))),
  scope:'Only blade light. Same V3 trajectory and silhouette; new broad painted shading, local reflection, directional strokes and internal pull/release.',newFlipbooks:0,newGifs:0,
  canvasCPU:{medianMs:cpu[35],p95Ms:cpu[66],condition:'Local Node+napi Canvas, 1024x768, includes background fill. Not Unity or device performance.'},
  notTested:['Unity assembly and playback','target device CPU/GPU/memory and batching']};
await copyFile(resolve(root,'src/hd/heavy-cleave-v4.js'),resolve(out,'heavy-cleave-v4.source.js'));
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,checks:report.checks,leadingPixels,frontChangedRatio,frontLuminanceRange,maxTrajectoryError,boundaryAlpha},null,2));
