#!/usr/bin/env node
// Authorized BuildFX staging export: static atlas + native mesh/particle recipe. No animation frames/GIFs.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const library=resolve(dirname(fileURLToPath(import.meta.url)),'..'),project=resolve(library,'../..');
const out=resolve(flags.out??join(project,'VFXWork/Exports/BuildFX/V1'));
if(out.startsWith(join(project,'Assets')))throw Error('Staging must stay outside Assets.');
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const sourcePath=join(library,'src/hd/mortar-assembly.js'),source=readFileSync(sourcePath,'utf8');
const sourceHash=createHash('sha256').update(source).digest('hex');
const approved=JSON.parse(readFileSync(join(library,'output/hd/mortar-assembly/v1/authoring.json'),'utf8'));
if(sourceHash!==approved.sourceSha256)throw Error('Approved source has changed.');
// Expose the actual private painters only inside this authoring exporter; the approved file is untouched.
const moduleSource=source.replace("from '../core/math.js'",`from '${pathToFileURL(join(library,'src/core/math.js')).href}'`)
  +'\nexport {artwork, smokeStamp, flash, arcs, sparks, debris, glow};';
const fx=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
const ppu=128,[width,height]=fx.meta.size;
mkdirSync(out,{recursive:true});
const write=(name,bytes)=>{const path=join(out,name),b=Buffer.from(bytes);if(!existsSync(path)||!readFileSync(path).equals(b))writeFileSync(path,b);};
const atlas=createCanvas(1024,512),ag=atlas.getContext('2d'),meshes=[],palette=new Map();
const paint=createCanvas(width,height),pg=paint.getContext('2d');
const rgba=(hex,a=1)=>{const s=hex.slice(1);return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16),a];};
function colorUV(color,alpha=1){
  const key=color+':'+alpha.toFixed(5);
  if(!palette.has(key)){
    const i=palette.size,x=640+(i%16)*20,y=8+Math.floor(i/16)*20;
    if(y>192)throw Error('Palette overflow');
    ag.fillStyle=color;ag.globalAlpha=alpha;ag.fillRect(x,y,16,16);ag.globalAlpha=1;
    palette.set(key,[(x+8)/1024,1-(y+8)/512]);
  }
  return palette.get(key);
}
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
class Capture {
  constructor(){this.m=[1,0,0,1,0,0];this.globalAlpha=1;this.fillStyle='#ffffff';this.stack=[];this.polygons=[];}
  save(){this.stack.push({m:[...this.m],a:this.globalAlpha,c:this.fillStyle});}
  restore(){const s=this.stack.pop();this.m=s.m;this.globalAlpha=s.a;this.fillStyle=s.c;}
  translate(x,y){this.m=mul(this.m,[1,0,0,1,x,y]);}
  scale(x,y){this.m=mul(this.m,[x,0,0,y,0,0]);}
  rotate(a){this.m=mul(this.m,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);}
  beginPath(){this.points=[];}
  moveTo(x,y){this.lineTo(x,y);}
  lineTo(x,y){const m=this.m;this.points.push([m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);}
  closePath(){}
  fill(){this.polygons.push({points:this.points,color:this.fillStyle,alpha:this.globalAlpha});}
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function triangulate(input){
  const pts=input.filter((p,i)=>i===0||Math.hypot(p[0]-input[i-1][0],p[1]-input[i-1][1])>1e-7);
  if(Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])<1e-7)pts.pop();
  const area=pts.reduce((s,p,i)=>s+p[0]*pts[(i+1)%pts.length][1]-pts[(i+1)%pts.length][0]*p[1],0);
  const sign=Math.sign(area),indices=pts.map((_,i)=>i),triangles=[];
  const inside=(p,a,b,c)=>sign*cross(a,b,p)>1e-8&&sign*cross(b,c,p)>1e-8&&sign*cross(c,a,p)>1e-8;
  for(let guard=0;indices.length>3&&guard<pts.length*pts.length;guard++){
    let cut=false;
    for(let i=0;i<indices.length;i++){
      const a=indices[(i+indices.length-1)%indices.length],b=indices[i],c=indices[(i+1)%indices.length];
      if(sign*cross(pts[a],pts[b],pts[c])<=1e-8)continue;
      if(indices.some(j=>j!==a&&j!==b&&j!==c&&inside(pts[j],pts[a],pts[b],pts[c])))continue;
      triangles.push(a,b,c);indices.splice(i,1);cut=true;break;
    }
    if(!cut)throw Error('Non-simple source polygon cannot be triangulated');
  }
  if(indices.length===3)triangles.push(...indices);
  return {pts,triangles};
}
function capturedMesh(name,fn,units=ppu){
  const c=new Capture();fn(c);
  const mesh={name,vertices:[],uv:[],triangles:[]};
  for(const p of c.polygons){
    const {pts,triangles}=triangulate(p.points),offset=mesh.vertices.length,uv=colorUV(p.color,p.alpha);
    mesh.vertices.push(...pts.map(([x,y])=>[x/units,-y/units,0]));
    mesh.uv.push(...pts.map(()=>uv));mesh.triangles.push(...triangles.map(i=>i+offset));
  }
  meshes.push(mesh);return mesh;
}
function quad(name,rect,uvRect){
  const [x,y,w,h]=rect,[u,v,uw,vh]=uvRect;
  const mesh={name,vertices:[[x,y,0],[x+w,y,0],[x+w,y+h,0],[x,y+h,0]],
    uv:[[u,v],[u+uw,v],[u+uw,v+vh],[u,v+vh]],triangles:[0,1,2,0,2,3]};
  meshes.push(mesh);return mesh;
}
for(let i=0;i<3;i++){
  const x=8+i*200,y=8;ag.drawImage(fx.smokeStamp(pg,i),x,y);
  quad('Smoke'+i,[-.5,-.5,1,1],[x/1024,1-(y+192)/512,192/1024,192/512]);
}
const data=fx.artwork(22);
for(let beat=0;beat<3;beat++){
  const d={flashes:[{...data.flashes[beat],born:0,rotation:0}]};
  capturedMesh('FrontFlash'+beat,c=>fx.flash(c,d,.05,1,false));
  capturedMesh('BackFlash'+beat,c=>fx.flash(c,d,.05,1,true));
}
capturedMesh('SweepArcs',c=>fx.arcs(c,.21));
capturedMesh('Star',c=>fx.sparks(c,{stars:[{born:0,life:1,size:.5,x:0,y:-17.5,vx:0,vy:0,rotation:0}]},.5),1);
for(const light of [false,true])capturedMesh(light?'ChipLight':'ChipDark',c=>fx.debris(c,{chips:[{
  born:0,life:1,size:1,x:0,y:-37.8,vx:0,vy:0,spin:0,angle:0,light}]},.3),1);
pg.clearRect(0,0,width,height);pg.save();pg.translate(...fx.meta.pivot);fx.glow(pg,.21,1);pg.restore();
const glowRect=[182,428,660,318],gx=8,gy=216,gw=320,gh=160;
ag.drawImage(paint,...glowRect,gx,gy,gw,gh);
quad('SoftGlow',[(glowRect[0]-512)/ppu,(594-glowRect[1]-glowRect[3])/ppu,glowRect[2]/ppu,glowRect[3]/ppu],
  [gx/1024,1-(gy+gh)/512,gw/1024,gh/512]);
write('BuildFX_StaticAtlas.png',atlas.toBuffer('image/png'));
const recipe={version:1,effectName:'BuildFX',ppu,duration:1.2,previewDuration:1.6,seed:22,
  puffs:data.puffs,flashes:data.flashes,pulses:fx.meta.pulses,meshes,
  colorAtlas:'BuildFX_StaticAtlas.png',sourceHash,options:approved.options};
write('native-recipe.json',JSON.stringify(recipe,null,2));
write('manifest.json',JSON.stringify({
  effectName:'BuildFX',version:'V1',source:'Tools/PixelFX/src/hd/mortar-assembly.js',sourceHash,
  sourceUnmodified:true,helper:'Tools/PixelFX/src/core/math.js',helperHash:createHash('sha256').update(readFileSync(join(library,'src/core/math.js'))).digest('hex'),
  authorInstruction:'以后不需要生成 GIF；接下来导入到 Unity，文件夹命名为 BuildFX。',
  pixelsPerUnit:ppu,sourceSize:fx.meta.size,pivot:fx.meta.pivot,options:approved.options,
  texture:{name:'BuildFX_StaticAtlas.png',size:[1024,512],frames:1,animation:false,
    sha256:createHash('sha256').update(readFileSync(join(out,'BuildFX_StaticAtlas.png'))).digest('hex'),
    format:'RGBA8 straight alpha; sRGB color; three static smoke stamps, one glow stamp, solid-color palette; not a flipbook',
    wrap:'Clamp',filter:'Bilinear',mipmaps:false,compression:'Uncompressed baseline; device budget not set'},
  nativeMapping:{smoke:'17 one-burst native particles: original lifetimes, analytic position derivatives sampled into native velocity curves, original static puff painter; size/alpha/rotation modules.',
    flash:'Source front/back polygon painters captured into triangulated Mesh particles, native size and alpha curves; three timed pulses. No flash animation atlas.',
    arcs:'Original thin sweep geometry, fixed local XY mesh rather than View billboard; native expansion/fade approximates the analytic sweep.',
    sparks:'Original star mesh, native burst/box spawn/velocity/force, size and alpha envelope.',
    debris:'Original two gray chip meshes, native burst/box/drag-approximation curves/gravity/rotation/fade.',
    glow:'Actual original radial glow, separate additive native particle; no Light components.'},
  differences:['Fixed-plane 2.5D effect: root XY is the reference view; not a volumetric cannon or world-XZ ring.',
    'Flash decay is approximated with native nonuniform scale; its main contours/colors use the approved painter.',
    'Arc expansion scales the approved static sweep rather than recomputing each ribbon vertex over time.',
    'Stars/chips use native seeded spawn ranges; their individual original random identities/birth jitter are not reproduced.',
    'Unity linear-space alpha/additive mixing differs from Canvas; visual calibration is validated separately.'],
  unityAssetRoot:'Assets/PixelFX/BuildFX',scene:'Assets/Scenes/VFXWorkbench.unity',
  authorization:'explicit-unity-import',status:'staged-for-native-assembly',gifGenerated:false,
},null,2));
console.log(JSON.stringify({out,staticTextures:1,atlas:[1024,512],meshes:meshes.length,vertices:meshes.reduce((n,m)=>n+m.vertices.length,0),triangles:meshes.reduce((n,m)=>n+m.triangles.length/3,0),sourceHash}));
