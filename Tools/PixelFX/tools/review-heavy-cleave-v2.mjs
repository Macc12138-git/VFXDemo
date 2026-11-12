// Art review stills and meaningful image checks; never exports a playback flipbook or GIF.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {meta,render,draw,options,sample,pointAt,widthAt} from '../src/hd/heavy-cleave-v2.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=flags.round??'final';assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/HeavyCleave/V2',round);await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
function image(t,o={},bg='dark',W=1024,H=768){const c=createCanvas(W,H);render(c,t,o,{background:bg});return c;}
const raw=(t,o={})=>image(t,o,'transparent').getContext('2d').getImageData(0,0,1024,768).data;
const signature=(t,o={})=>hash(raw(t,o));
assert(raw(0).every(v=>v===0)&&raw(meta.duration).every(v=>v===0),'first and last frames empty');
assert.equal(signature(.16),signature(.16),'determinism');assert.notEqual(signature(.06),signature(.135),'swing advances');
const off=Object.fromEntries(Object.keys(meta.options.layers).map(k=>[k,false]));
assert(raw(.16,{layers:off}).every(v=>v===0),'all layers off');
for(const key of Object.keys(off))assert.notEqual(signature(.16),signature(.16,{layers:{[key]:false}}),key+' is visible');
for(const key of ['body','shadow','edge'])assert.notEqual(signature(.16),signature(.16,{[key]:'#4899d9'}),key+' recolors');
assert.notEqual(signature(.16),signature(.16,{tear:0}),'cuts change real negative space');
// Measure the rendered leading cross-section, slightly behind its antialiased cap.
const f=sample(.16),d=raw(.16,{buffer:'color'});let leadingPixels=0;
for(let r=0;r<widthAt(.008,f);r++){
  const p=pointAt(.008,r,f),x=Math.round(p[0]+512),y=Math.round(p[1]+384);
  if(d[(y*1024+x)*4+3]>200)leadingPixels++;
}
assert(leadingPixels>meta.options.bladeLength*.80,'front keeps a full blade-length face');
let boundaryAlpha=0;
for(const bladeLength of [140,192,240])for(let i=0;i<=26;i++){
  const bytes=raw(i*meta.duration/26,{bladeLength});
  for(let x=0;x<1024;x++)boundaryAlpha+=bytes[x*4+3]+bytes[((768-1)*1024+x)*4+3];
  for(let y=0;y<768;y++)boundaryAlpha+=bytes[y*1024*4+3]+bytes[(y*1024+1023)*4+3];
}
assert.equal(boundaryAlpha,0,'blade-length endpoints fit');
const histogram=new Map();let opaque=0;
for(let i=0;i<d.length;i+=4)if(d[i+3]===255){const key=`${d[i]},${d[i+1]},${d[i+2]}`;histogram.set(key,(histogram.get(key)??0)+1);opaque++;}
const top=[...histogram].sort((a,b)=>b[1]-a[1]);const majorColorCoverage=top.slice(0,3).reduce((n,p)=>n+p[1],0)/opaque;
assert(majorColorCoverage>.94,'three principal colors cover the opaque painting');
await writeFile(resolve(out,'hero.png'),image(.16).toBuffer('image/png'));
await writeFile(resolve(out,'color.png'),image(.16,{buffer:'color'},'transparent').toBuffer('image/png'));
const times=[.025,.06,.10,.135,.175,.23,.29,.35,.405,.52];
const sheet=createCanvas(1600,544),sg=sheet.getContext('2d');sg.fillStyle='#101219';sg.fillRect(0,0,1600,544);
for(const [i,t]of times.entries()){
  const x=i%5*320,y=Math.floor(i/5)*272;sg.drawImage(image(t,{},'dark',640,480),x,y+26,320,240);sg.fillStyle='#cfc0ad';sg.font='13px sans-serif';sg.fillText(t.toFixed(3)+' s',x+12,y+18);
}
await writeFile(resolve(out,'contact.png'),sheet.toBuffer('image/png'));
for(const [name,items]of [['backgrounds',['dark','gray','light','warm','checker','transparent']],['layers',['combined',...Object.keys(off)]]]){
  const sheet=createCanvas(1536,836),g=sheet.getContext('2d');
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
const referencePath=resolve(root,'output/hd/HeavyCleave/References/slash-shape-template.jpg');
const reference=await loadImage(await readFile(referencePath)),comparison=createCanvas(1536,624),cg=comparison.getContext('2d');
cg.fillStyle='#2d2d2d';cg.fillRect(0,0,1536,624);
// Shared radius and center: supplied template center (274,290), outer radius 184.
const k=300/184*.75;cg.drawImage(reference,384-274*k,312-290*k,reference.width*k,reference.height*k);
cg.drawImage(image(.16,{},'transparent',768,576),768,24);
cg.fillStyle='#ded1c0';cg.font='16px sans-serif';cg.fillText('Shape template / supplied reference',24,26);cg.fillText('V2 / 3 colors + sharp rim',792,26);
await writeFile(resolve(out,'reference-comparison.png'),comparison.toBuffer('image/png'));
const canvas=createCanvas(1024,768),g=canvas.getContext('2d'),cpu=[];
for(let i=0;i<90;i++){g.clearRect(0,0,1024,768);g.save();g.translate(512,384);const start=performance.now();draw(g,(i%30)/30*.44);cpu.push(performance.now()-start);g.restore();}cpu.sort((a,b)=>a-b);
const report={effect:meta.id,version:meta.version,round,checks:'PASS',options:options(),leadingPixels,majorColorCoverage,
  principalColors:top.slice(0,3),boundaryAlpha,firstAndLastEmpty:true,deterministic:true,
  sourceSha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave-v2.js'))),preservedV1Sha256:hash(await readFile(resolve(root,'src/hd/heavy-cleave.js'))),referenceSha256:hash(await readFile(referencePath)),
  scope:'Blade light only. Stable outer arc, full-width front, torn inner side and trailing strips.',newFlipbooks:0,newGifs:0,
  canvasDrawCPU:{medianMs:cpu[45],p95Ms:cpu[85],condition:'Local Node + napi Canvas 1024x768; excludes encoding and browser compositing. Not Unity performance.'},
  notTested:['Unity assembly and playback','target device CPU/GPU/memory and batching']};
await copyFile(resolve(root,'src/hd/heavy-cleave-v2.js'),resolve(out,'heavy-cleave-v2.source.js'));
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,checks:report.checks,leadingPixels,majorColorCoverage,boundaryAlpha},null,2));
