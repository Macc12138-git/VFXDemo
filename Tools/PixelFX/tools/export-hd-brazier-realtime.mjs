#!/usr/bin/env node
// Static elements only. Never reads the preview frames or makes an animation atlas.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const library=resolve(dirname(fileURLToPath(import.meta.url)),'..'),project=resolve(library,'../..');
const out=resolve(flags.out??join(project,'VFXWork/Exports/Brazier/HandPaintedRealtime'));
if(out===join(project,'Assets')||out.startsWith(join(project,'Assets')+'/'))throw Error('Staging must be outside Assets.');
const source=readFileSync(join(library,'src/hd/brazier-handpainted.js'),'utf8');
// Bind the actual approved helper functions without modifying the approved source file.
const bound=source+'\nexport const exportHelpers={tongues,paintTongue,paintStand,paintBowl,paintCoals,glowDisc,fields};';
const {meta,exportHelpers:a}=await import('data:text/javascript;base64,'+Buffer.from(bound).toString('base64'));
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
mkdirSync(out,{recursive:true});
const write=(name,bytes)=>{const path=join(out,name);if(!existsSync(path)||!readFileSync(path).equals(Buffer.from(bytes)))writeFileSync(path,bytes);};
const image=(name,w,h,draw)=>{const c=createCanvas(w,h);draw(c.getContext('2d'));write(name,c.toBuffer('image/png'));};
const tongues=[];
for(let i=0;i<a.tongues.length;i++){
  const q=a.tongues[i],id=i+meta.options.seed*0.13,file=`Tongue_${String(i+1).padStart(2,'0')}.png`;
  image(file,256,512,g=>{g.translate(128-512,480);a.paintTongue(g,{...q,x:0,y:0,id},0);});
  tongues.push({...q,id,file,textureWidth:256,textureHeight:512,rootX:128,rootY:480,
    sourceX:512+q.x,sourceY:860,sortingOrder:10+i});
}
image('DetachedLick.png',128,256,g=>{g.translate(64-512,235);a.paintTongue(g,{x:0,y:0,h:150,w:28,lean:10,id:25,back:false},0);});
const prop=(name,paint)=>image(name,512,512,g=>{g.translate(-256,-768);paint(g);});
prop('PropBack.png',g=>{a.paintStand(g);g.fillStyle='#2a232b';g.beginPath();g.ellipse(512,854,151,27,0,0,Math.PI*2);g.fill();a.paintCoals(g,0,meta.options.seed);});
prop('PropFront.png',g=>a.paintBowl(g,0));
image('SoftGlow.png',256,256,g=>a.glowDisc(g,128,128,124,124,1,'255,255,255'));
image('Smoke.png',256,256,g=>{a.glowDisc(g,128,128,107,118,1,'255,255,255');a.glowDisc(g,101,151,83,87,0.35,'255,255,255');});
image('Spark.png',32,32,g=>{g.lineCap='round';g.lineWidth=5;g.strokeStyle='white';g.beginPath();g.moveTo(8,16);g.lineTo(24,16);g.stroke();});
const f=a.fields(meta.options.seed);
for(const [name,field] of [['DissolveNoise.png',f.noise],['DistortionNoise.png',f.distort]])image(name,256,256,g=>{
  const data=g.createImageData(256,256);for(let i=0;i<field.length;i++){
    const value=name.startsWith('Dissolve')?0.2+0.8*field[i]:field[i];
    data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=Math.round(value*255);data.data[i*4+3]=255;
  }g.putImageData(data,0,0);
});
const manifest={version:1,source:'Tools/PixelFX/src/hd/brazier-handpainted.js',sourceVersion:meta.version,
  sourceSha256:createHash('sha256').update(source).digest('hex'),seed:meta.options.seed,options:meta.options,
  authorInstruction:'将该特效导入到unity，注意该特效的制作方式，不要以帧动画的方式在unity中体现',
  pixelsPerUnit:128,duration:4,textureAnimation:false,framesPerTexture:1,atlas:false,
  tongues,prop:{files:['PropBack.png','PropFront.png'],width:512,height:512,rootX:256,rootY:87},
  mapping:{core:'11 static hand-painted tongues; GPU inverse contour warp reproduces the source time/height/width/lean functions; native Custom1.x supplies age seconds.',
    dissolve:'Source noise field and remap plus tip bias, root-anchored UV distortion and derivative-based rough edge; no image sequence.',
    licks:'3/s native emission, .68–1.18s lifetime, upward velocity, sine size curve and Custom1.y dissolution.',
    smoke:'4/s native emission, 1.6–2.8s lifetime, upward velocity + native Noise, growing size and sine alpha.',
    sparks:'8.5/s native emission, .85–2.35s lifetime, exponentially decreasing native velocity curves and stretched billboards.',
    glow:'Three separate low-intensity additive native particles; no Light component.',prop:'Two ordinary static SpriteRenderers.'},
  differences:['Native RNG and Noise approximate the analytic birth/trajectory distribution, not exact source particle identities.',
    'Static pigment marks travel with the warped tongue rather than being independently redrawn.',
    'Coals and metal highlights are static; glow breathes through native Color over Lifetime.',
    'Unity linear-space alpha/additive rendering is tuned visually, not claimed pixel-identical to Canvas.'],
};
write('manifest.json',JSON.stringify(manifest,null,2));console.log(`${out}\n${tongues.length} static tongues + 8 independent static elements; ZERO animation frames.`);
