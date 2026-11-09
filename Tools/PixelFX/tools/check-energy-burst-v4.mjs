import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {meta,options,createFrame,createRenderer,layerNames} from '../src/hd/energy-burst-v4.js';
const arg=(k,d)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:d;
const out=arg('--out','Tools/PixelFX/output/hd/EnergyBurst/V4/round1');
const lib=arg('--canvas-module','@napi-rs/canvas'),{createCanvas}=await import(lib.startsWith('/')?pathToFileURL(lib).href:lib);
await mkdir(out+'/QA',{recursive:true});
const times=[0,.055,.13,.18,.26,.38,.50,.68,.83,.96],board=createCanvas(1280,560),g=board.getContext('2d');
for(const [i,t] of times.entries()){const c=createCanvas(256,256);createRenderer(c).render(t,{}, {scale:.62});g.drawImage(c,(i%5)*256,Math.floor(i/5)*280+24);g.fillStyle='#a8cddd';g.font='12px monospace';g.fillText(t.toFixed(3)+' s',(i%5)*256+8,Math.floor(i/5)*280+17);}
await writeFile(out+'/QA/contact.png',board.toBuffer('image/png'));
const hero=createCanvas(720,560);createRenderer(hero).render(.26);await writeFile(out+'/QA/peak.png',hero.toBuffer('image/png'));
const bg=createCanvas(1024,768),bgc=bg.getContext('2d');
for(const [i,background]of ['original','black','checker','light'].entries())for(const [j,scale]of [.6,.3,.15].entries()){const c=createCanvas(256,256);createRenderer(c).render(.26,{}, {background,scale});bgc.drawImage(c,i*256,j*256);}
await writeFile(out+'/QA/background-scale.png',bg.toBuffer('image/png'));
const none=Object.fromEntries(layerNames.map(k=>[k,false]));let frames=0,maxRadius=0;
for(const seed of [37,8,92])for(const radius of [90,180,240])for(let i=0;i<=96;i++){
 const t=i*.01,f=createFrame(t,{seed,radius});assert.deepEqual(f,createFrame(t,{seed,radius}));
 if(i===0||i===96)assert.equal(f.paths.length+f.blobs.length,0);
 for(const p of f.paths){assert(p.alpha>=0&&p.alpha<=1);for(const xy of p.points){assert(xy.every(Number.isFinite));maxRadius=Math.max(maxRadius,Math.hypot(...xy)/radius);assert(Math.hypot(...xy)<=radius*.921);}}
 frames++;
}
assert.equal(createFrame(.26,{intensity:0}).paths.length,0);assert.equal(createFrame(.26,{layers:none}).paths.length,0);assert.equal(createFrame(.10,{layers:none}).blobs.length,0);
assert(createFrame(.13).blobs.some(b=>b.layer==='charge'&&b.alpha>.7));assert(createFrame(.26).paths.some(p=>p.layer==='discharge'));assert(createFrame(.50).paths.some(p=>p.layer==='flow'));
assert(!createFrame(.50,{flow:0}).paths.some(p=>p.layer==='flow'));
for(const t of [.05,.13,.18,.26,.5,.8]){const a=createFrame(t),b=createFrame(t*.5,{duration:.48});assert.deepEqual(a.paths,b.paths);assert.deepEqual(a.blobs,b.blobs);}
assert.notDeepEqual(createFrame(.50).paths.filter(p=>p.layer==='flow'),createFrame(.52).paths.filter(p=>p.layer==='flow'));
let maxVisibleRadius=0,rasterFrames=0;
const scan=createCanvas(720,560),scanRenderer=createRenderer(scan),scanG=scan.getContext('2d');
for(const radius of [90,180,240])for(const seed of [37,92])for(const t of times){
 scanRenderer.render(t,{radius,seed},{transparent:true});const pixels=scanG.getImageData(0,0,720,560).data;let active=0;
 for(let y=0;y<560;y++)for(let x=0;x<720;x++)if(pixels[(y*720+x)*4+3]>1){
  active++;const d=Math.hypot(x+.5-360,y+.5-280)/radius;maxVisibleRadius=Math.max(maxVisibleRadius,d);assert(d<1.08,'visible alpha exceeds radius padding');
  assert(x>0&&x<719&&y>0&&y<559,'clipped visible alpha');
 }
 if(t===0||t===.96)assert.equal(active,0);rasterFrames++;
}
for(const duration of [.48,1.4])for(const charge of [.08,.22])assert.equal(createFrame(duration,{duration,charge}).paths.length,0);
const mono=key=>{const o={layers:{...none,discharge:true},coreColor:'#ff0000',bodyColor:'#00ff00',edgeColor:'#0000ff'};o[key]='#ffffff';scanRenderer.render(.26,o,{transparent:true});return scan.toBuffer('image/png');};
assert(!mono('coreColor').equals(mono('bodyColor')));assert(!mono('edgeColor').equals(mono('bodyColor')));
const src=await readFile('Tools/PixelFX/src/hd/energy-burst-v4.js'),hash=createHash('sha256').update(src).digest('hex');
await copyFile('Tools/PixelFX/src/hd/energy-burst-v4.js',out+'/QA/energy-burst-v4.source.js');
const report={result:'PASS',frames,rasterFrames,maxRadius,maxVisibleRadius,sourceSha256:hash,meta,checks:['deterministic arbitrary time','starts and ends empty in geometry and transparent raster','finite bounded branching geometry','high-light gathering before release','discharge paths then independent return currents','flow independently disabled and visibly moving','duration normalization and control endpoints','transparent bounds under 1.08R with no clipping','semantic colors separately affect rendered output'],limitations:['Canvas authoring, not Unity performance','not a 3D arbitrary-view effect']};
await writeFile(out+'/QA/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/manifest.json',JSON.stringify({effect:'EnergyBurst',...meta,sourceSha256:hash,renderer:'Canvas live geometry',textureBytes:0,newFlipbook:false,noRing:true},null,2)+'\n');console.log(JSON.stringify(report));
