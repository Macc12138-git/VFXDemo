// Static review evidence, not a runtime atlas or GIF.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {meta,render,options,sample,pointAt,widthAt,onArc,SPAN,SOURCE_SCALE,timing} from '../src/hd/heavy-cleave-v3.js';
import {renderReference} from '../src/hd/heavy-cleave-reference.js';
import {swing,onSwing} from '../src/fx/melee/_lib.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=flags.round??'final';assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/HeavyCleave/V3',round);await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
function image(t,o={},bg='dark',W=1024,H=768){const c=createCanvas(W,H);render(c,t,o,{background:bg});return c;}
function reference(t,W=1024,H=768){const c=createCanvas(W,H);renderReference(c,t,createCanvas);return c;}
const raw=(t,o={})=>image(t,o,'transparent').getContext('2d').getImageData(0,0,1024,768).data;
const signature=(t,o={})=>hash(raw(t,o));
assert(raw(0).every(v=>v===0)&&raw(meta.duration).every(v=>v===0),'first and last empty');
assert.equal(signature(.16),signature(.16),'determinism');assert.notEqual(signature(.06),signature(.135),'swing advances');
const off=Object.fromEntries(Object.keys(meta.options.layers).map(k=>[k,false]));
assert(raw(.16,{layers:off}).every(v=>v===0),'all layers off');
for(const key of Object.keys(off))assert.notEqual(signature(.16),signature(.16,{layers:{[key]:false}}),key+' visible');
for(const key of ['body','shadow','edge'])assert.notEqual(signature(.16),signature(.16,{[key]:'#4899d9'}),key+' recolors');
assert.notEqual(signature(.16),signature(.16,{tear:0}),'real negative-space cuts');
// Compare against the original melee helper, independently from the new contour implementation.
const source=swing({cx:3,cy:-22,R:37,sy:.88,rot:.32,a0:-2.45,dir:1});
let sourceSpan=0;while(onSwing(source,source.R,sourceSpan)[1]<-.5&&sourceSpan<4)sourceSpan+=.005;
assert.equal(SPAN,sourceSpan);assert.deepEqual([timing.sweep,timing.hold,timing.trail],[.135,.05,.22]);
let maxTrajectoryError=0;const path=[];
for(const t of [.025,.06,.10,.135,.175,.23,.29,.35]){
  const f=sample(t),s=Math.min(1,Math.max(0,t/.135))**2,p=onSwing(source,source.R,sourceSpan*s),q=pointAt(0,0,f);
  maxTrajectoryError=Math.max(maxTrajectoryError,Math.hypot(q[0]-p[0]*SOURCE_SCALE,q[1]-p[1]*SOURCE_SCALE));
  path.push({time:t,sourceTime:t+.2,head:f.head,tail:f.tail,leadingPoint:q});
}
assert(maxTrajectoryError<1e-9,'original direction, tilt, anchor and path preserved');
assert(onArc(1)[0]>onArc(0)[0]&&onArc(1)[1]>onArc(0)[1],'overhead-left to lower-right');
const f=sample(.16),d=raw(.16,{buffer:'color'});let leadingPixels=0;
for(let r=0;r<widthAt(.008,f);r++){
  const p=pointAt(.008,r,f),x=Math.round(p[0]+meta.pivot[0]),y=Math.round(p[1]+meta.pivot[1]);
  if(d[(y*1024+x)*4+3]>200)leadingPixels++;
}assert(leadingPixels>meta.options.bladeLength*.8,'broad leading face');
let boundaryAlpha=0;
for(const bladeLength of [140,176,192,240])for(let i=0;i<=26;i++){
  const bytes=raw(i*meta.duration/26,{bladeLength});
  for(let x=0;x<1024;x++)boundaryAlpha+=bytes[x*4+3]+bytes[((768-1)*1024+x)*4+3];
  for(let y=0;y<768;y++)boundaryAlpha+=bytes[y*1024*4+3]+bytes[(y*1024+1023)*4+3];
}assert.equal(boundaryAlpha,0,'no frame-edge clipping');
const histogram=new Map();let opaque=0;
for(let i=0;i<d.length;i+=4)if(d[i+3]===255){const key=`${d[i]},${d[i+1]},${d[i+2]}`;histogram.set(key,(histogram.get(key)??0)+1);opaque++;}
const top=[...histogram].sort((a,b)=>b[1]-a[1]),majorColorCoverage=top.slice(0,3).reduce((n,p)=>n+p[1],0)/opaque;
assert(majorColorCoverage>.94,'three principal paint colors');
await writeFile(resolve(out,'hero.png'),image(.16).toBuffer('image/png'));
await writeFile(resolve(out,'color.png'),image(.16,{buffer:'color'},'transparent').toBuffer('image/png'));
const times=[.025,.06,.10,.135,.175,.23,.29,.35,.405,.52];
const sheet=createCanvas(1600,544),sg=sheet.getContext('2d');sg.fillStyle='#101219';sg.fillRect(0,0,1600,544);
for(const [i,t]of times.entries()){
  const x=i%5*320,y=Math.floor(i/5)*272;sg.drawImage(image(t,{},'dark',640,480),x,y+26,320,240);sg.fillStyle='#cfc0ad';sg.font='13px sans-serif';sg.fillText(t.toFixed(3)+' s',x+12,y+18);
}await writeFile(resolve(out,'contact.png'),sheet.toBuffer('image/png'));
for(const [name,items]of [['backgrounds',['dark','gray','light','warm','checker','transparent']],['layers',['combined',...Object.keys(off)]]]){
  const sheet=createCanvas(1536,Math.ceil(items.length/3)*418),g=sheet.getContext('2d');
  for(const [i,key]of items.entries()){
    const x=i%3*512,y=Math.floor(i/3)*418;g.fillStyle='#15171e';g.fillRect(x,y,512,418);
    const o=name==='layers'&&key!=='combined'?{layers:{...off,[key]:true}}:key==='transparent'?{buffer:'color'}:{};
    g.drawImage(image(.16,o,name==='backgrounds'?key:'dark',512,384),x,y+28);g.fillStyle='#bfb3a6';g.font='13px sans-serif';g.fillText(key,x+14,y+19);
  }await writeFile(resolve(out,name+'.png'),sheet.toBuffer('image/png'));
}
const small=createCanvas(800,360),sm=small.getContext('2d');sm.fillStyle='#53565e';sm.fillRect(0,0,800,360);
for(const [i,size]of [96,192,384].entries()){
  const x=[20,150,390][i];sm.drawImage(image(.16,{},'gray',size,size*3/4),x,40);sm.fillStyle='#eee4d7';sm.font='13px sans-serif';sm.fillText(size+' px canvas',x,340);
}await writeFile(resolve(out,'game-size.png'),small.toBuffer('image/png'));
const comparison=createCanvas(1536,624),cg=comparison.getContext('2d');cg.fillStyle='#15171e';cg.fillRect(0,0,1536,624);
cg.drawImage(reference(.135,768,576),0,36);cg.drawImage(image(.135,{},'dark',768,576),768,36);
cg.fillStyle='#ded1c0';cg.font='16px sans-serif';cg.fillText('Original Heavy cleave / isolated blade / source t=0.335',24,26);cg.fillText('HD / same pivot, scale and phase / t=0.135',792,26);
await writeFile(resolve(out,'reference-comparison.png'),comparison.toBuffer('image/png'));
const motion=createCanvas(1600,544),mg=motion.getContext('2d');mg.fillStyle='#15171e';mg.fillRect(0,0,1600,544);
for(const [i,t]of [.06,.10,.135,.23,.32].entries())for(const row of [0,1]){
  mg.drawImage(row?image(t,{},'dark',320,240):reference(t,320,240),i*320,row*272+28);
  mg.fillStyle='#ded1c0';mg.font='13px sans-serif';mg.fillText((row?'HD':'Original')+' '+t.toFixed(3)+' s',i*320+12,row*272+19);
}await writeFile(resolve(out,'motion-comparison.png'),motion.toBuffer('image/png'));
const report={effect:meta.id,version:meta.version,round,checks:'PASS',options:options(),leadingPixels,majorColorCoverage,principalColors:top.slice(0,3),boundaryAlpha,
  firstAndLastEmpty:true,deterministic:true,trajectory:{direction:'clockwise, overhead-left to lower-right',maxErrorHDUnits:maxTrajectoryError,span:SPAN,sourceScale:SOURCE_SCALE,sourceTimeOffset:.2,path},
  sourceSha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave-v3.js'))),originalSha256:hash(await readFile(resolve(root,'src/fx/melee/heavy-cleave.js'))),
  preservedV1Sha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave.js'))),preservedV2Sha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave-v2.js'))),
  scope:'Original Heavy cleave motion. Style sample only informs brush, color blocks and edges. Blade light only.',newFlipbooks:0,newGifs:0,
  notTested:['Unity assembly and playback','target device CPU/GPU/memory and batching']};
await copyFile(resolve(root,'src/hd/heavy-cleave-v3.js'),resolve(out,'heavy-cleave-v3.source.js'));
await copyFile(resolve(root,'src/hd/heavy-cleave-reference.js'),resolve(out,'heavy-cleave-reference.source.js'));
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,checks:report.checks,leadingPixels,majorColorCoverage,maxTrajectoryError,boundaryAlpha},null,2));
