#!/usr/bin/env node
// Static parametric element topology, NOT time samples or animation frames.
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {meta,createFrameGeometry} from '../src/hd/lightning-nova.js';
import {rand} from '../src/core/math.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),out=join(root,'VFXWork/Exports/LightningNova/V1.3');
const source=readFileSync(join(root,'Tools/PixelFX/src/hd/lightning-nova.js'));
const sourceHash=createHash('sha256').update(source).digest('hex');
if(sourceHash!=='0fae2726a83fdac40a742a7510d6dc89cdc23f4199bbaba8937da57e2c28b664')throw Error('Approved V1.3 source changed.');
const meshes=[];
function mesh(name){const m={name,data:[]};meshes.push(m);return m;}
const v=(kind,id,p,q=0,a=0,b=0,c=0,d=0)=>[p,q,kind,id,a,b,c,d];
function tri(m,...points){m.data.push(...points.flat());}
function quad(m,a,b,c,d){tri(m,a,b,c);tri(m,a,c,d);}
function tube(m,kind,id,segments,sides=6,layers=1){for(let layer=0;layer<layers;layer++)for(let j=0;j<segments;j++)for(let k=0;k<sides;k++){
 const at=(p,q)=>v(kind,id,p,q/sides,layer,j);
 quad(m,at(j,k),at(j,k+1),at(j+1,k+1),at(j+1,k));
}}
for(const[kind,name,count]of [[0,'OrbitOuter',3],[1,'OrbitInner',2],[2,'DescendingWhips',2]]){
 const m=mesh(name);
 for(let id=0;id<count;id++){
  const s=meta.options.seed+(kind===1?23:kind===2?80:0)+id;
  const span=kind===0?[1.35,1.8,1.6][id]+rand(s,4)*.2:kind===1?[1.8,2.3][id]+rand(s,4)*.2:id?2.8:3.4;
  const n=Math.ceil(span*12);
  for(let i=0;i<n;i++)for(let k=0;k<4;k++){
   const at=(j,corner)=>v(kind,id,j/n,corner,n,(i+.5)/n);
   quad(m,at(i,k),at(i+1,k),at(i+1,(k+1)%4),at(i,(k+1)%4));
  }
  // A short branch is part of each independent orbital brush, not an entire-effect bake.
  for(let i=0;i<3;i++)for(let k=0;k<4;k++){
   const at=(p,q)=>v(14,id,p,q/4,kind,n,i);
   quad(m,at(i,k),at(i,k+1),at(i+1,k+1),at(i+1,k));
  }
 }
}
tube(mesh('MainBolt'),3,0,12,6,3);tube(mesh('Leader'),10,0,12,4);
const crown=mesh('Crown');for(let i=0;i<11;i++)for(let k=1;k<5;k++)tri(crown,v(4,i,0),v(4,i,k),v(4,i,k+1));
const hit=mesh('Impact');
for(let i=0;i<10;i++)tri(hit,v(5,i,0),v(5,i,1),v(5,i,2));
for(let i=0;i<4;i++){tri(hit,v(6,0,i),v(6,0,(i+1)%4),v(6,0,4));tri(hit,v(6,0,(i+1)%4),v(6,0,i),v(6,0,5));}
for(let i=0;i<9;i++)tube(hit,7,i,3,4,2);
for(let i=0;i<18;i++)for(let plane=0;plane<2;plane++){const at=p=>v(8,i,p,plane);quad(hit,at(0),at(1),at(2),at(3));}
for(let i=0;i<64;i++){if(i%16>12)continue;const at=(j,side)=>v(9,0,j/64,side,i);quad(hit,at(i,0),at(i+1,0),at(i+1,1),at(i,1));}
const spark=mesh('Spark');for(let plane=0;plane<2;plane++){const at=p=>v(11,0,p,plane);quad(spark,at(0),at(1),at(2),at(3));}
for(let variant=0;variant<2;variant++){const m=mesh(variant?'GroundFlash':'GroundCharge');for(let i=0;i<64;i++)tri(m,v(12,variant,0,0),v(12,variant,1,i/64),v(12,variant,1,(i+1)/64));}
tube(mesh('Arc'),13,0,4,4,2);
const orbitalLight=mesh('OrbitalLight');
for(const[name,offset]of [['OrbitOuter',0],['OrbitInner',.028],['DescendingWhips',.017]]){const data=meshes.find(m=>m.name===name).data;for(let i=0;i<data.length;i+=8){const vert=data.slice(i,i+8);vert[7]=offset;orbitalLight.data.push(...vert);}}
mkdirSync(out,{recursive:true});
function write(name,data){const file=join(out,name),bytes=Buffer.from(JSON.stringify(data,null,2));if(!existsSync(file)||!readFileSync(file).equals(bytes))writeFileSync(file,bytes);}
write('native-recipe.json',{effect:'LightningNova',version:'V1.3',sourceHash,options:meta.options,meshes,clock:'Native AgePercent / InvStartLifetime. No global shader clock.',vertexLayout:'8 static floats per vertex -> UV0..UV3. Position=0; Normal=up; Tangent=right. Native streams then AgePercent/InvStartLifetime/StableRandomXY/SizeXYZ.',referenceLayers:createFrameGeometry(.165).layers});
write('manifest.json',{effect:'LightningNova',version:'V1.3',authorization:'导入到unity中',source:'Tools/PixelFX/src/hd/lightning-nova.js',sourceHash,options:meta.options,assetsRoot:'Assets/PixelFX/LightningNova',units:'Source world unit = Unity unit, pivot = strike landing point',duration:1.2,staticFrames:1,animationTextures:false,textures:[],implementation:'Static parametric element meshes + age-driven URP vertex shader + native Particle System births/lifetimes/motion. Independent 2D flattened and spatial 3D prefabs.',approximations:['Native secondary arc/spark distributions preserve behavior, not particle identities.','Ring vertex current and path equations are ported; browser per-brush transparency sorting differs from Unity mesh transparency.','2D is a fixed 24 degree source projection encoded in the material, not a camera-facing billboard.'],targetBudget:'Not provided; local Editor exploratory measurements only.'});
console.log(JSON.stringify({out,sourceHash,meshes:meshes.map(m=>({name:m.name,vertices:m.data.length/8,triangles:m.data.length/24}))},null,2));
