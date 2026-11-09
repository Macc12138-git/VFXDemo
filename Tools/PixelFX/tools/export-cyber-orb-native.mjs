#!/usr/bin/env node
// Static element geometry only; no frames, scene, prefab, or Unity writes.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {meta,hitMeta,sample,drawImpact,sampleImpact} from '../src/hd/cyber-orb-v3-2.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),out=join(root,'VFXWork/Exports/CyberOrb/V3.2');mkdirSync(out,{recursive:true});
const sha=p=>createHash('sha256').update(readFileSync(join(root,p))).digest('hex');
const source='Tools/PixelFX/src/hd/cyber-orb-v3-2.js',sourceHash=sha(source);
if(sourceHash!=='2c2c883a4a53931d287b4a32b7b0729ce421bb08723e38a83050ba5644b6450d')throw Error('Approved source changed');
const meshes=[];
function mesh(name,polygons){const vertices=[],uv=[],tags=[],triangles=[];for(const [poly,tag] of polygons){const start=vertices.length/3,center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);for(const [x,y] of [center,...poly]){vertices.push(x*.14,-y*.14,0);uv.push(x,-y);tags.push(tag,0);}for(let i=0;i<poly.length;i++)triangles.push(start,start+1+i,start+1+(i+1)%poly.length);}meshes.push({name,vertices,uv,tags,triangles});}
function rect(name,x0,y0,x1,y1){const p=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];mesh(name,[[p,0]]);}
const f=sample(.5),r=meta.options.radius,tailEnd=f.h.at(-1).x/r;
rect('BodyTrail',tailEnd-.04,-1.08,1.08,1.08);rect('CompactGlow',-1.38,-1.38,1.38,1.38);rect('ResidualTail',tailEnd-.04,-.65,-.44,.65);
// Record the two real helper-drawn polygons instead of redrawing an approximation.
const shapes=[];let path=[];const recorder={save(){},restore(){},beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},closePath(){},fill(){shapes.push(path);}};
drawImpact(recorder,0,{layers:{tailFade:false,shards:false}});const k=sampleImpact(0).flash.scale;
mesh('ImpactFlash',shapes.map((p,i)=>[p.map(([x,y])=>[x/r/k,y/r/k]),i]));
const recipe={effect:'CyberOrb',version:'V3.2',source,sourceHash,options:meta.options,ppu:100,radius:.14,meshes};
writeFileSync(join(out,'native-recipe.json'),JSON.stringify(recipe,null,2)+'\n');
writeFileSync(join(out,'manifest.json'),JSON.stringify({effect:'CyberOrb',version:'V3.2',authorization:'导入到unity',sourceHash,
  helpers:['cyber-orb-v3.js','cyber-orb-v3-1.js','cyber-orb-v3-2.js'].map(n=>({path:'Tools/PixelFX/src/hd/'+n,sha256:sha('Tools/PixelFX/src/hd/'+n)})),
  options:meta.options,seed:42,units:'100 source pixels per Unity unit; XY plane, local +X flight direction; head pivot at origin',
  staticFrames:1,animationTextures:false,textures:[],meshes:meshes.map(m=>({name:m.name,vertices:m.vertices.length/3,triangles:m.triangles.length/3})),
  implementation:'Static element meshes + analytic URP color/additive shader + native Particle Systems. Separate projectile visual and impact. Native shot demonstration uses velocity and Death/Birth sub-emitters, not runtime code.',
  timing:{visualLoop:4,demonstrationFlight:.5,demonstrationSpeed:12,impact:hitMeta.duration},
  approximations:['Default straight short wake is head-local, not a history-following curved trail.','Native four-shard shape/lifetime/velocity ranges preserve the compact left-biased burst, not fixed-seed per-shard identity.','Native demo death is a 0.5s flight demonstration, not gameplay collision logic.','Canvas sRGB/additive and Unity Linear/Metal need visual calibration.'],
  targetBudget:'Not supplied; local Editor 0/1/8/32 exploratory baselines, not device acceptance.'},null,2)+'\n');
console.log(JSON.stringify({out,sourceHash,meshes:meshes.map(m=>m.name)},null,2));
