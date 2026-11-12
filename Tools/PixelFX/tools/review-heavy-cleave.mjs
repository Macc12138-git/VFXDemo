// Static art review only: no GIF, animation atlas, Unity output or runtime screenshots.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { render, draw, meta, options } from '../src/hd/heavy-cleave.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=flags.round??'final';assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/HeavyCleave/V1',round);await mkdir(out,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex');
function image(t,o={},bg='dark',W=1024,H=768){const c=createCanvas(W,H);render(c,t,o,{background:bg});return c;}
const raw=(t,o={})=>image(t,o,'transparent',512,384).getContext('2d').getImageData(0,0,512,384).data;
const fingerprint=(t,o={})=>hash(raw(t,o));
assert(raw(0).every(v=>v===0),'first frame transparent');assert(raw(meta.duration).every(v=>v===0),'last frame transparent');
assert.equal(fingerprint(.16),fingerprint(.16),'determinism');
assert.notEqual(fingerprint(.08),fingerprint(.13),'swing develops');
const off=Object.fromEntries(Object.keys(meta.options.layers).map(k=>[k,false]));
assert(raw(.16,{layers:off}).every(v=>v===0),'all layers off');
for(const layer of Object.keys(off))assert.notEqual(fingerprint(.16),fingerprint(.16,{layers:{[layer]:false}}),layer+' visible');
for(const key of ['shadow','body','hot','edge'])assert.notEqual(fingerprint(.16),fingerprint(.16,{[key]:'#3c90ed'}),key+' independent color');
let boundaryAlpha=0;
for(const thickness of [.7,1,1.3])for(let i=0;i<=32;i++){
  const t=i*meta.duration/32,d=raw(t,{thickness});
  for(let x=0;x<512;x++)boundaryAlpha+=d[x*4+3]+d[((384-1)*512+x)*4+3];
  for(let y=0;y<384;y++)boundaryAlpha+=d[y*512*4+3]+d[(y*512+511)*4+3];
}
assert.equal(boundaryAlpha,0,'thickness endpoints never touch frame edge');
const times=[.025,.06,.10,.135,.175,.23,.29,.35,.405,.52];
const contact=createCanvas(1600,544),cg=contact.getContext('2d');cg.fillStyle='#0d1017';cg.fillRect(0,0,1600,544);
for(const [i,t]of times.entries()){
  const x=i%5*320,y=Math.floor(i/5)*272;cg.drawImage(image(t,{},'dark',640,480),x,y+26,320,240);
  cg.fillStyle='#c9b6a1';cg.font='13px sans-serif';cg.fillText(t.toFixed(3)+' s',x+12,y+19);
}
await writeFile(resolve(out,'contact.png'),contact.toBuffer('image/png'));
await writeFile(resolve(out,'hero.png'),image(.16).toBuffer('image/png'));
await writeFile(resolve(out,'color.png'),image(.16,{buffer:'color'},'transparent').toBuffer('image/png'));
const bgSheet=createCanvas(1536,836),bg=bgSheet.getContext('2d');
for(const [i,kind]of ['dark','gray','light','warm','checker','transparent'].entries()){
  const x=i%3*512,y=Math.floor(i/3)*418;bg.fillStyle='#171b23';bg.fillRect(x,y,512,418);
  bg.drawImage(image(.16,kind==='transparent'?{buffer:'color'}:{},kind,512,384),x,y+28);
  bg.fillStyle='#aab3be';bg.font='13px sans-serif';bg.fillText(kind,x+14,y+19);
}
await writeFile(resolve(out,'backgrounds.png'),bgSheet.toBuffer('image/png'));
const layerSheet=createCanvas(1536,836),lg=layerSheet.getContext('2d');
for(const [i,key]of ['combined',...Object.keys(off)].entries()){
  const x=i%3*512,y=Math.floor(i/3)*418;lg.fillStyle='#11151e';lg.fillRect(x,y,512,418);
  lg.drawImage(image(.16,key==='combined'?{}:{layers:{...off,[key]:true}},'dark',512,384),x,y+28);
  lg.fillStyle='#c6b49f';lg.font='13px sans-serif';lg.fillText(key,x+14,y+19);
}
await writeFile(resolve(out,'layers.png'),layerSheet.toBuffer('image/png'));
const small=createCanvas(800,360),sg=small.getContext('2d');sg.fillStyle='#535b68';sg.fillRect(0,0,800,360);
for(const [i,size]of [96,192,384].entries()){
  const x=[20,150,390][i];sg.drawImage(image(.16,{},'gray',size,size*3/4),x,40);
  sg.fillStyle='#eee4d5';sg.font='13px sans-serif';sg.fillText(size+' px canvas',x,340);
}
await writeFile(resolve(out,'game-size.png'),small.toBuffer('image/png'));
const c=createCanvas(1024,768),g=c.getContext('2d'),cpu=[];
for(let i=0;i<100;i++){g.clearRect(0,0,1024,768);g.save();g.translate(...meta.pivot);const start=performance.now();draw(g,(i%30)/30*.45);cpu.push(performance.now()-start);g.restore();}cpu.sort((a,b)=>a-b);
const report={effect:meta.id,version:meta.version,round,checks:'PASS',options:options(),sourceSha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave.js'))),
  referenceSha256:hash(await readFile(resolve(root,'src/fx/melee/heavy-cleave.js'))),boundaryAlpha,firstAndLastEmpty:true,deterministic:true,
  scope:'Sword arc, inner echo, painted edge and attached low light only.',
  newFlipbooks:0,newGifs:0,canvasDrawCPU:{medianMs:cpu[50],p95Ms:cpu[95],condition:'Local Node + napi Canvas 1024x768; excludes PNG encoding and browser compositing. Not Unity performance.'},
  notTested:['Unity native assembly','target CPU/GPU/memory and batching'],};
await copyFile(resolve(root,'src/hd/heavy-cleave.js'),resolve(out,'heavy-cleave.source.js'));
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({out,checks:report.checks,boundaryAlpha,cpu:report.canvasDrawCPU},null,2));
