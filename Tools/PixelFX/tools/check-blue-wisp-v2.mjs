// Static authoring review and motion invariants; no animation atlas or Unity output.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {draw,render,background,sample,options,meta} from '../src/hd/blue-wisp-v2.js';
import {draw as oldDraw} from '../src/hd/blue-wisp.js';
const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(args['canvas-module']?pathToFileURL(resolve(args['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=args.round??'final';
assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/BlueWisp/V2',round);await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const blank=Object.fromEntries(Object.keys(meta.options.layers).map(k=>[k,false]));
function image(t,o={},bg='transparent',W=960,H=640){const c=createCanvas(W,H);render(c,t,o,{background:bg});return c;}
function raw(t,o={}){return image(t,o).getContext('2d').getImageData(0,0,960,640).data;}
const fingerprint=(t,o={})=>hash(raw(t,o));
function delta(a,b){let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;}
assert.equal(fingerprint(0),fingerprint(meta.duration),'exact loop seam');
assert.equal(fingerprint(.175),fingerprint(.175),'determinism');
assert.notEqual(fingerprint(.175),fingerprint(.375),'local motion exists');
assert.notEqual(fingerprint(.175),fingerprint(.175,{seed:91}),'seed affects flecks');
assert.equal(fingerprint(.175),fingerprint(.35,{flow:.5}),'flow preserves phase');
const stableLayers={...blank,body:true,brush:true,core:true};
const stableHash=fingerprint(0,{layers:stableLayers});
for(let i=0;i<=60;i++){
  const t=i*meta.duration/60,f=sample(t);
  assert.equal(f.scale,1);assert.equal(f.coreScale,1);assert.deepEqual(f.center,[0,0]);
  assert.equal(fingerprint(t,{layers:stableLayers}),stableHash,'body/brush/core are pixel-exact stable');
  // No moving paint or light may cross onto the leading hemisphere.
  const c=image(t),g=c.getContext('2d'),part=g.getImageData(245,200,145,240).data;
  const ref=image(0).getContext('2d').getImageData(245,200,145,240).data;
  assert.equal(hash(part),hash(ref),'front hemisphere is pixel-exact stable');
}
assert(raw(.175,{layers:blank}).every(v=>v===0),'all layers off is transparent');
for(const key of Object.keys(blank))assert.notEqual(fingerprint(.175),fingerprint(.175,{layers:{[key]:false}}),key+' visible');
for(const key of ['shadow','body','flame','core'])assert.notEqual(fingerprint(.175),fingerprint(.175,{[key]:'#ff7b40'}),key+' recolor');
for(const [key,value]of Object.entries({flow:1.5,localMotion:0,glow:0,radius:80}))assert.notEqual(fingerprint(.175),fingerprint(.175,{[key]:value}),key+' control');
const seamDelta=delta(raw(meta.duration-1/600),raw(0));
const ordinaryDelta=delta(raw(.175-1/600),raw(.175));
assert(seamDelta<Math.max(.02,ordinaryDelta*4),'adjacent seam has no reset flash');
let samples=0,edgeAlpha=0,maxLocalShift=0,maxLocalBend=0;
for(const seed of [1,13,91])for(const localMotion of [0,.7,1])for(let i=0;i<32;i++){
  const t=i*meta.duration/32,o={seed,localMotion},f=sample(t,o),d=raw(t,o),W=960,H=640;
  for(const p of f.tongues){maxLocalShift=Math.max(maxLocalShift,p.shift);maxLocalBend=Math.max(maxLocalBend,Math.abs(p.bend));}
  for(let x=0;x<W;x++)edgeAlpha+=d[x*4+3]+d[((H-1)*W+x)*4+3];
  for(let y=0;y<H;y++)edgeAlpha+=d[y*W*4+3]+d[(y*W+W-1)*4+3];samples++;
}
assert.equal(edgeAlpha,0,'parameter endpoints stay inside frame');
assert(maxLocalShift<=.055&&maxLocalBend<=.0175,'local displacement is bounded');
await writeFile(resolve(out,'hero.png'),image(.175,{},'dark').toBuffer('image/png'));
// Straight RGBA cannot encode arbitrary-background additive light. Save color only.
await writeFile(resolve(out,'transparent-color.png'),image(.175,{buffer:'color'}).toBuffer('image/png'));
const times=[0,.175,.35,.525,.70,.875,1.05,1.225],sheet=createCanvas(1440,700),g=sheet.getContext('2d');
g.fillStyle='#101c2b';g.fillRect(0,0,1440,700);
for(const [i,t]of times.entries()){
  const c=createCanvas(360,326);render(c,t,{}, {background:'gray',scale:.94,anchorX:.37});
  const x=i%4*360,y=Math.floor(i/4)*350;g.drawImage(c,x,y+24);
  g.fillStyle='#aad8e5';g.font='13px sans-serif';g.fillText(`${t.toFixed(3)} s`,x+14,y+18);
}
await writeFile(resolve(out,'contact.png'),sheet.toBuffer('image/png'));
const contexts=createCanvas(1440,740),cg=contexts.getContext('2d');
for(const [i,bg]of ['dark','gray','light','warm','checker','transparent'].entries()){
  const x=i%3*480,y=Math.floor(i/3)*370;cg.drawImage(image(.175,bg==='transparent'?{buffer:'color'}:{},bg),x,y+24,480,320);
  cg.fillStyle='#7e99ad';cg.font='13px sans-serif';cg.fillText(bg==='transparent'?'transparent / color only':bg,x+12,y+18);
}
await writeFile(resolve(out,'backgrounds.png'),contexts.toBuffer('image/png'));
const layers=createCanvas(1440,640),lg=layers.getContext('2d');
for(const [i,key]of Object.keys(blank).entries()){
  const c=createCanvas(480,320);render(c,.175,{layers:{...blank,[key]:true}},{background:'dark',scale:.80,anchorX:.40});
  const x=i%3*480,y=Math.floor(i/3)*320;lg.drawImage(c,x,y);lg.fillStyle='#8db6c6';lg.font='13px sans-serif';lg.fillText(key,x+15,y+22);
}
await writeFile(resolve(out,'layers.png'),layers.toBuffer('image/png'));
const small=createCanvas(960,240),sg=small.getContext('2d');background(sg,960,240,'gray');
for(const [i,size]of [48,80,128].entries()){
  sg.save();sg.translate(145+i*310,105);sg.scale(size/224,size/224);draw(sg,.175);sg.restore();
  sg.fillStyle='#bdd8e5';sg.font='13px sans-serif';sg.fillText(`${size}px`,130+i*310,222);
}
await writeFile(resolve(out,'game-size.png'),small.toBuffer('image/png'));
const compare=createCanvas(1200,470),q=compare.getContext('2d');background(q,1200,470,'gray');
for(const [i,fn]of [oldDraw,draw].entries()){
  q.save();q.translate(250+i*600,240);q.scale(1.35,1.35);fn(q,.175);q.restore();
  q.fillStyle='#c1dce7';q.font='15px sans-serif';q.fillText(i?'V2 / stable nucleus + local shedding':'V1 / periodic contour deformation',25+i*600,30);
}
await writeFile(resolve(out,'comparison.png'),compare.toBuffer('image/png'));
const c=createCanvas(960,640),ctx=c.getContext('2d'),cpu=[];
for(let i=0;i<90;i++){ctx.clearRect(0,0,960,640);const start=performance.now();ctx.save();ctx.translate(390,320);draw(ctx,i/90*meta.duration);ctx.restore();cpu.push(performance.now()-start);}cpu.sort((a,b)=>a-b);
const report={version:meta.version,round,seed:13,options:options(),sourceSha256:hash(await readFile(resolve(root,'src/hd/blue-wisp-v2.js'))),
  preservedV1Sha256:hash(await readFile(resolve(root,'src/hd/blue-wisp.js'))),checks:'PASS',samples,
  stableBodyRaster:true,stableCoreRaster:true,stableLeadingHemisphere:true,globalScale:1,
  motion:{maxLocalShiftR:maxLocalShift,maxLocalBendR:maxLocalBend,detachedFlecks:4},
  loop:{endpointExact:true,seamDelta,ordinaryDelta},edgeAlpha,newFlipbooks:0,referenceFramesInPlayback:0,
  canvasDrawCPU:{medianMs:cpu[45],p95Ms:cpu[85],condition:'local Node + napi Canvas 960x640; excludes PNG. NOT Unity performance.'},
  alpha:'Transparent still is color only. Live preview adds light after drawing the selected background.',
  notTested:['Unity compilation/native assembly','Unity batches / batching','target CPU/GPU/memory budget'],
};
await copyFile(resolve(root,'src/hd/blue-wisp-v2.js'),resolve(out,'blue-wisp-v2.source.js'));
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,...report},null,2));
