import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {meta,prepare,state,field,noiseSampler,makeNoise,electricPaths,renderCPU,layerNames} from '../src/hd/energy-burst-v5.js';
const arg=(k,d)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:d;
const out=arg('--out','Tools/PixelFX/output/hd/EnergyBurst/V5/round1'),lib=arg('--canvas-module','@napi-rs/canvas');
const {createCanvas}=await import(lib.startsWith('/')?pathToFileURL(lib).href:lib);await mkdir(out+'/QA',{recursive:true});
const times=[0,.06,.13,.18,.25,.36,.48,.62,.80,1.02],board=createCanvas(1280,560),g=board.getContext('2d');
for(const [i,t]of times.entries()){const c=createCanvas(256,256);renderCPU(c,t,{}, {scale:.62});g.drawImage(c,i%5*256,Math.floor(i/5)*280+24);g.fillStyle='#b1cde0';g.font='12px monospace';g.fillText(t.toFixed(3)+' s',i%5*256+8,Math.floor(i/5)*280+16);}
await writeFile(out+'/QA/contact.png',board.toBuffer('image/png'));
const peak=createCanvas(560,560);renderCPU(peak,.25);await writeFile(out+'/QA/peak.png',peak.toBuffer('image/png'));
const backdrop=createCanvas(1024,768),bg=backdrop.getContext('2d');
for(const [i,background]of ['original','black','checker','light'].entries())for(const [j,scale]of [.62,.31,.16].entries()){const c=createCanvas(256,256);renderCPU(c,.25,{}, {scale,background});bg.drawImage(c,i*256,j*256);}
await writeFile(out+'/QA/background-scale.png',backdrop.toBuffer('image/png'));
const split=createCanvas(1024,256),sg=split.getContext('2d'),none=Object.fromEntries(layerNames.map(k=>[k,false]));
for(const [i,layers]of [{...none,volume:true},{...none,folds:true},{...none,electric:true},Object.fromEntries(layerNames.map(k=>[k,k!=='electric']))].entries()){const c=createCanvas(256,256);renderCPU(c,.25,{layers},{scale:.62});sg.drawImage(c,i*256,0);}
await writeFile(out+'/QA/layers.png',split.toBuffer('image/png'));
const noise=noiseSampler();let checks=0,maxPathR=0;
for(const seed of [37,8,92])for(const radius of [90,180,240])for(const t of [0,.06,.13,.18,.25,.36,.48,.62,.8,1.02]){
 const o=prepare({seed,radius}),s=state(t,o),paths=electricPaths(t,o);assert.deepEqual(paths,electricPaths(t,o));
 for(const p of paths)for(const xy of p.points){assert(xy.every(Number.isFinite));maxPathR=Math.max(maxPathR,Math.hypot(...xy)/radius);assert(Math.hypot(...xy)<radius*1.04);}
 for(let y=-1.1;y<=1.1;y+=.15)for(let x=-1.1;x<=1.1;x+=.15){const f=field(x*radius,y*radius,s,o,noise);assert([...f.c,f.a,...f.l].every(Number.isFinite));assert(f.a>=0&&f.a<=1);if(t===0||t>=meta.duration)assert.equal(f.a+f.l.reduce((a,b)=>a+b,0),0);checks++;}
}
// Main round body must remain present without electricity: not a renamed lightning star.
for(const t of [.20,.25,.36]){const o=prepare({layers:{electric:false}}),s=state(t,o);let covered=0;for(let i=0;i<16;i++){const angle=i*Math.PI/8;let hit=false;for(let r=.5;r<1;r+=.05)hit ||=field(Math.cos(angle)*s.radius*r,Math.sin(angle)*s.radius*r,s,o,noise).a>.15;covered+=hit;}assert(covered>=14,'circular energy coverage lost with electricity off');}
assert.equal(electricPaths(.25,{electric:0}).length,0);
for(const t of [.06,.18,.25,.5,.8]){const a=state(t),b=state(t*.5,{duration:.51});assert.equal(a.radius,b.radius);assert.deepEqual(electricPaths(t),electricPaths(t*.5,{duration:.51}));}
for(const t of [.06,.18,.25,.5]){const o=prepare({layers:none}),s=state(t,o);assert.equal(field(0,0,s,o,noise).a,0);assert.equal(field(0,0,s,o,noise).l.reduce((a,b)=>a+b,0),0);assert.equal(electricPaths(t,o).length,0);}
let maxRasterRadius=0,transparentFrames=0;
for(const radius of [90,180,220])for(const t of [0,.13,.25,.48,1.02]){
 const c=createCanvas(256,256);renderCPU(c,t,{radius},{transparent:true,scale:.45});const pixels=c.getContext('2d').getImageData(0,0,256,256).data;let active=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>2){active++;const r=Math.hypot(x+.5-128,y+.5-128)/(.45*radius);maxRasterRadius=Math.max(maxRasterRadius,r);assert(r<1.10);assert(x>0&&x<255&&y>0&&y<255);}
 if(t===0||t===meta.duration)assert.equal(active,0);transparentFrames++;
}
const sample=o=>field(125,-30,state(.25,o),prepare(o),noise);
assert.notDeepEqual(sample({bodyColor:'#ff2200'}),sample({}));
for(const duration of [.55,1.5])for(const charge of [.08,.20]){const o=prepare({duration,charge});assert.equal(field(0,0,state(duration,o),o,noise).a,0);assert.equal(electricPaths(duration,o).length,0);}
const src=await readFile('Tools/PixelFX/src/hd/energy-burst-v5.js'),hash=createHash('sha256').update(src).digest('hex');await copyFile('Tools/PixelFX/src/hd/energy-burst-v5.js',out+'/QA/energy-burst-v5.source.js');
const report={result:'PASS',checks,maxPathR,maxRasterRadius,transparentFrames,sourceSha256:hash,noiseSha256:createHash('sha256').update(makeNoise()).digest('hex'),meta,checksPassed:['finite deterministic field and detail paths','starts and ends empty including transparent renders','bound secondary electricity','round energy body exists with electricity disabled','duration scaling and endpoints','electricity disabled independently','all layers can be disabled','body color independently affects field','visible alpha bounds and no canvas-edge clipping'],limitations:['CPU authoring reference only; WebGL requires browser visual check','not Unity or PC performance evidence']};
await writeFile(out+'/QA/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/manifest.json',JSON.stringify({effect:'EnergyBurst',...meta,sourceSha256:hash,texture:{size:[128,128],format:'RGBA8 linear data',bytes:65536,wrap:'repeat',filter:'bilinear',mipmap:false},flipbook:false,unity:false},null,2)+'\n');console.log(JSON.stringify(report));
