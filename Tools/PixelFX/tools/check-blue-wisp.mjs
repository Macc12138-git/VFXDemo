// Still-only authoring QA. No GIF, sprite sheet, Unity assets, or runtime export.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {draw,render,sample,options,meta} from '../src/hd/blue-wisp.js';
const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas}=await import(args['canvas-module']?pathToFileURL(resolve(args['canvas-module'])).href:'@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=args.round??'final';
assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/BlueWisp/V1',round);await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
function raster(t,o={},bg='transparent',W=960,H=640){const c=createCanvas(W,H);render(c,t,o,{background:bg});return c;}
function pixels(t,o={}){return raster(t,o).getContext('2d').getImageData(0,0,960,640).data;}
function fingerprint(t,o={}){return hash(pixels(t,o));}
function delta(a,b){let n=0;for(let i=0;i<a.length;i++)n+=Math.abs(a[i]-b[i]);return n/a.length;}
const endpoint=fingerprint(0)===fingerprint(meta.duration);
assert(endpoint,'exact endpoint loop seam');
assert.equal(fingerprint(.19),fingerprint(.19),'raster determinism');
assert.notEqual(fingerprint(.19),fingerprint(.38),'real motion');
assert.notEqual(fingerprint(.19),fingerprint(.19,{seed:99}),'seed affects detached flecks');
const layerNames=Object.keys(meta.options.layers),blank=Object.fromEntries(layerNames.map(k=>[k,false]));
assert(pixels(.19,{layers:blank}).every(v=>v===0),'all layers disabled is transparent');
for(const key of layerNames)assert.notEqual(fingerprint(.19),fingerprint(.19,{layers:{[key]:false}}),key+' layer affects image');
for(const key of ['shadow','body','flame','core'])assert.notEqual(fingerprint(.19),fingerprint(.19,{[key]:'#ff8055'}),key+' recolor');
for(const [key,value]of Object.entries({flow:1.5,turbulence:0,tail:.5,glow:0,radius:80}))assert.notEqual(fingerprint(.19),fingerprint(.19,{[key]:value}),key+' control');
const seamDelta=delta(pixels(meta.duration-1/600),pixels(0));
const ordinaryDelta=delta(pixels(.20-1/600),pixels(.20));
assert(seamDelta<Math.max(.035,ordinaryDelta*3),'no hidden adjacent-frame loop reset');
assert.equal(fingerprint(.19),fingerprint(.095,{flow:2}),'speed preserves phase');
let samples=0,edgePixels=0;
for(const seed of [1,13,91])for(const tail of [.5,1.4])for(const turbulence of [0,1.5])for(let i=0;i<32;i++){
  const t=i*meta.duration/32,o={seed,tail,turbulence},f=sample(t,o);
  assert(f.flecks.every(p=>[p.x,p.y,p.length,p.alpha].every(Number.isFinite)));
  const d=pixels(t,o),W=960,H=640;
  for(let x=0;x<W;x++)edgePixels+=d[x*4+3]+d[((H-1)*W+x)*4+3];
  for(let y=0;y<H;y++)edgePixels+=d[y*W*4+3]+d[(y*W+W-1)*4+3];samples++;
}
assert.equal(edgePixels,0,'visible parameter endpoints stay in the canvas');
await writeFile(resolve(out,'hero.png'),raster(.105,{},'dark').toBuffer('image/png'));
await writeFile(resolve(out,'transparent.png'),raster(.105).toBuffer('image/png'));
const times=[0,.105,.21,.315,.42,.525,.63,.735],sheet=createCanvas(1440,700),g=sheet.getContext('2d');
g.fillStyle='#101c2b';g.fillRect(0,0,1440,700);
for(const [i,t]of times.entries()){
  const x=i%4*360,y=Math.floor(i/4)*350,c=createCanvas(360,326);
  render(c,t,{}, {background:'gray',scale:.85,anchorX:.36});g.drawImage(c,x,y+24);
  g.fillStyle='#a3d9ef';g.font='13px sans-serif';g.fillText(`${t.toFixed(3)}s`,x+14,y+18);
}
await writeFile(resolve(out,'contact.png'),sheet.toBuffer('image/png'));
const contexts=createCanvas(1440,960),cg=contexts.getContext('2d');
for(const [i,bg]of ['dark','gray','light','warm','checker','transparent'].entries()){
  const x=i%3*480,y=Math.floor(i/3)*480;cg.drawImage(raster(.315,{},bg),x,y+24,480,320);
  cg.fillStyle='#7e99ad';cg.font='13px sans-serif';cg.fillText(bg,x+12,y+18);
}
await writeFile(resolve(out,'backgrounds.png'),contexts.toBuffer('image/png'));
const layers=createCanvas(1440,640),lg=layers.getContext('2d');
lg.fillStyle='#0b1523';lg.fillRect(0,0,1440,640);
for(const [i,name]of layerNames.entries()){
  const c=raster(.315,{layers:{...blank,[name]:true}}),x=i%3*480,y=Math.floor(i/3)*320;
  lg.drawImage(c,x,y,480,320);lg.fillStyle='#96b6cc';lg.font='13px sans-serif';lg.fillText(name,x+16,y+24);
}
await writeFile(resolve(out,'layers.png'),layers.toBuffer('image/png'));
const small=createCanvas(960,240),sg=small.getContext('2d');sg.fillStyle='#454545';sg.fillRect(0,0,960,240);
for(const [i,size]of [48,80,128].entries()){
  sg.save();sg.translate(140+i*310,110);sg.scale(size/224,size/224);draw(sg,.315);sg.restore();
  sg.fillStyle='#b6d3e5';sg.font='13px sans-serif';sg.fillText(`head diameter ${size}px`,70+i*310,222);
}
await writeFile(resolve(out,'game-size.png'),small.toBuffer('image/png'));
const c=createCanvas(960,640),ctx=c.getContext('2d'),cpu=[];
for(let i=0;i<120;i++){ctx.clearRect(0,0,960,640);const start=performance.now();ctx.save();ctx.translate(390,320);draw(ctx,i/120*meta.duration);ctx.restore();cpu.push(performance.now()-start);}
cpu.sort((a,b)=>a-b);
const report={version:meta.version,round,seed:13,options:options(),sourceSha256:hash(await readFile(resolve(root,'src/hd/blue-wisp.js'))),
  samples,checks:'PASS',deterministic:true,loop:{endpointExact:endpoint,seamDelta,ordinaryDelta},edgePixels,
  newFlipbooks:0,referenceFramesUsedInPlayback:0,canvasDrawCPU:{medianMs:cpu[60],p95Ms:cpu[114],excludesPNG:true},
  conditions:'local Node + @napi-rs/canvas, 960x640. Not browser FPS or Unity performance.',
  notTested:['Unity compilation/rendering/native assembly','Unity batches/batching','target platform CPU/GPU/memory budgets'],
};
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');
await copyFile(resolve(root,'src/hd/blue-wisp.js'),resolve(out,'blue-wisp.source.js'));
console.log(JSON.stringify({out,...report},null,2));
