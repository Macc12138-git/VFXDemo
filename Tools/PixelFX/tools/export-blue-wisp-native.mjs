#!/usr/bin/env node
// Authorized V3.0.2 export: capture the real curve painter as static geometry, not images.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {draw,meta} from '../src/hd/blue-wisp-v3.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),out=join(root,'VFXWork/Exports/BlueWisp/V3');
const source=readFileSync(join(root,'Tools/PixelFX/src/hd/blue-wisp-v3.js'));
const sourceHash=createHash('sha256').update(source).digest('hex');
assert.equal(sourceHash,'5544592adce52f7642784c7fe17f17e54f9862260988012668748cd5e65aa45c');
const palette=['edge','blue','cyan','pale','core'],ppu=100;
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
class Capture{
 constructor(){this.m=[1,0,0,1,0,0];this.stack=[];this.polygons=[];this.fillStyle='';}
 point(x,y){const m=this.m;return[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
 save(){this.stack.push({m:[...this.m],c:this.fillStyle});}restore(){const s=this.stack.pop();this.m=s.m;this.fillStyle=s.c;}
 translate(x,y){this.m=mul(this.m,[1,0,0,1,x,y]);}scale(x,y){this.m=mul(this.m,[x,0,0,y,0,0]);}
 beginPath(){this.points=[];}moveTo(x,y){this.points.push(this.point(x,y));}closePath(){}
 bezierCurveTo(x1,y1,x2,y2,x3,y3){
  const add=(a,b,c,d,depth=0)=>{const len=Math.max(.0001,Math.hypot(d[0]-a[0],d[1]-a[1]));
   if(depth>10||Math.max(Math.abs(cross(a,d,b)),Math.abs(cross(a,d,c)))/len<.18){this.points.push(d);return;}
   const ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),p=mid(abc,bcd);add(a,ab,abc,p,depth+1);add(p,bcd,cd,d,depth+1);};
  add(this.points.at(-1),this.point(x1,y1),this.point(x2,y2),this.point(x3,y3));
 }
 // All color shapes are captured in source painter order. The inset cyan boundary
 // is independently tessellated; its original clip is checked by offline comparison.
 clip(){}
 fill(){this.polygons.push({points:this.points,color:this.fillStyle});}
}
function triangulate(input){
 const pts=input.filter((p,i)=>i===0||Math.hypot(p[0]-input[i-1][0],p[1]-input[i-1][1])>1e-6);
 if(Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])<1e-6)pts.pop();
 const area=pts.reduce((s,p,i)=>s+p[0]*pts[(i+1)%pts.length][1]-pts[(i+1)%pts.length][0]*p[1],0),sign=Math.sign(area);
 const indices=pts.map((_,i)=>i),triangles=[];
 const inside=(p,a,b,c)=>sign*cross(a,b,p)>1e-9&&sign*cross(b,c,p)>1e-9&&sign*cross(c,a,p)>1e-9;
 for(let guard=0;indices.length>3&&guard<pts.length*pts.length;guard++){
  let cut=false;for(let i=0;i<indices.length;i++){
   const a=indices[(i+indices.length-1)%indices.length],b=indices[i],c=indices[(i+1)%indices.length];
   if(sign*cross(pts[a],pts[b],pts[c])<=1e-9)continue;
   if(indices.some(j=>j!==a&&j!==b&&j!==c&&inside(pts[j],pts[a],pts[b],pts[c])))continue;
   triangles.push(a,b,c);indices.splice(i,1);cut=true;break;
  }if(!cut)throw Error('Non-simple source curve; inspect rather than substituting a circle');
 }if(indices.length===3)triangles.push(...indices);return{pts,triangles,sign};
}
const mesh={name:'BlueWisp_AuthoredPoses',vertices:[],uv:[],uv2:[],alpha:[],triangles:[]},captures=[];
const v=(point,pose,role,alpha=1)=>{const i=mesh.vertices.length;mesh.vertices.push([point[0]/ppu,-point[1]/ppu,0]);mesh.uv.push([pose,role]);mesh.uv2.push([0,0]);mesh.alpha.push(alpha);return i;};
for(let pose=0;pose<4;pose++){
 const c=new Capture();draw(c,pose*.07,{buffer:'color'});captures.push(c.polygons);
 for(const polygon of c.polygons){
  const role=palette.findIndex(key=>meta.options[key]===polygon.color);assert(role>=0);
  const{pts,triangles,sign}=triangulate(polygon.points),offset=mesh.vertices.length;
  for(const point of pts)v(point,pose,role);mesh.triangles.push(...triangles.map(i=>i+offset));
  // Narrow static coverage fringe; this is edge antialiasing, not an animated halo.
  const ring=[];for(let i=0;i<pts.length;i++){
   const a=pts[(i+pts.length-1)%pts.length],b=pts[i],c=pts[(i+1)%pts.length];
   const normal=(p,q)=>{const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.max(1e-6,Math.hypot(dx,dy));return[sign*dy/l,-sign*dx/l];};
   const n=normal(a,b),m=normal(b,c),dx=n[0]+m[0],dy=n[1]+m[1],den=Math.max(.3,dx*n[0]+dy*n[1]);
   ring.push(v([b[0]+dx*.45/den,b[1]+dy*.45/den],pose,role,0));
  }for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;mesh.triangles.push(offset+i,ring[i],ring[j],offset+i,ring[j],offset+j);}
 }
}
const glow={name:'BlueWisp_StaticGlow',vertices:[[-2.2727,-2.158,.001],[2.089,.001-2.158,.001],[2.089,2.204,.001],[-2.2727,2.204,.001]],uv:[[0,0],[1,0],[1,1],[0,1]],uv2:[[0,0],[0,0],[0,0],[0,0]],alpha:[1,1,1,1],triangles:[0,1,2,0,2,3]};
mkdirSync(out,{recursive:true});
const write=(name,data)=>{const file=join(out,name),bytes=Buffer.from(typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');if(!existsSync(file)||!readFileSync(file).equals(bytes))writeFileSync(file,bytes);};
write('native-recipe.json',{effect:'BlueWisp',version:meta.version,sourceHash,options:meta.options,ppu,duration:.28,poseMs:70,meshes:[mesh,glow]});
write('manifest.json',{effect:'BlueWisp',version:meta.version,authorization:'将该特效导入到unity',sourceHash,assetsRoot:'Assets/PixelFX/BlueWisp/V3',ppu,anchor:'Canvas source origin; source Y down -> Unity Y up; XY plane, faces -Z',textures:[],animationTextures:false,runtimeScripts:0,clock:'Native AgePercent with 0.28-second lifetime; 4 authored geometry poses, each 0.25 normalized age. No global _Time.',implementation:'One native Mesh ParticleSystem for all authored color shapes; one native static additive glow particle. Source painter captured with adaptive cubic tessellation and semantic palette IDs.',approximations:['Cubic curves tessellated to <=0.18 source pixels; 0.45px static antialias fringe.','Canvas clipping of inset cyan is tessellated separately; offline image difference must be checked.','Canvas sRGB additive glow approximated in linear Unity; independently calibrated.'],targetBudget:'Not provided; exploratory local Editor baseline, not device approval.'});
write('blue-wisp-v3.source.js',source.toString());
// Re-render captured geometry at exactly the source scale; quantitative diagnostic only.
const canvasModule=process.argv[2];if(canvasModule){
 const{createCanvas}=await import(pathToFileURL(resolve(canvasModule)).href);const comparisons=[];
 for(let pose=0;pose<4;pose++){
  const a=createCanvas(600,500),b=createCanvas(600,500),ga=a.getContext('2d'),gb=b.getContext('2d');ga.translate(240,250);gb.translate(240,250);draw(ga,pose*.07,{buffer:'color'});
  for(const p of captures[pose]){gb.beginPath();p.points.forEach(([x,y],i)=>i?gb.lineTo(x,y):gb.moveTo(x,y));gb.closePath();gb.fillStyle=p.color;gb.fill();}
  const aa=ga.getImageData(0,0,600,500).data,bb=gb.getImageData(0,0,600,500).data;let sum=0,pixels=0;for(let i=0;i<aa.length;i+=4){let d=0;for(let k=0;k<4;k++)d+=Math.abs(aa[i+k]-bb[i+k]);sum+=d;if(d>48)pixels++;}
  comparisons.push({pose,rgbaMae:sum/aa.length,pixelsOver48: pixels,fraction:pixels/(600*500)});writeFileSync(join(out,`Tessellated_P${pose+1}.png`),b.toBuffer('image/png'));
 }write('geometry-comparison.json',comparisons);assert(comparisons.every(x=>x.fraction<.004),'Capture mismatch too large');
}
console.log(JSON.stringify({out,sourceHash,vertices:mesh.vertices.length,triangles:mesh.triangles.length/3},null,2));
