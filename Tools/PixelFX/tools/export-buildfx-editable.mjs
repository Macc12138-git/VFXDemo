#!/usr/bin/env node
// BuildFX V2 adaptation: neutral masks + mesh role palette, not animation frames.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const library=resolve(dirname(fileURLToPath(import.meta.url)),'..'),project=resolve(library,'../..');
const from=join(project,'VFXWork/Exports/BuildFX/V1'),out=resolve(flags.out??join(project,'VFXWork/Exports/BuildFX/V2'));
if(out.startsWith(join(project,'Assets')))throw Error('Staging must stay outside Assets.');
const recipe=JSON.parse(readFileSync(join(from,'native-recipe.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(hash(readFileSync(join(library,'src/hd/mortar-assembly.js')))!==recipe.sourceHash)throw Error('Selected authoring source has changed.');
const {createCanvas,loadImage}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
const canvas=createCanvas(1024,512),ctx=canvas.getContext('2d');ctx.drawImage(await loadImage(join(from,'BuildFX_StaticAtlas.png')),0,0);
const img=ctx.getImageData(0,0,1024,512),p=img.data;
for(let variant=0;variant<3;variant++)for(let y=8;y<200;y++)for(let x=8+variant*200;x<200+variant*200;x++){
 const i=(y*1024+x)*4;const gray=Math.min(255,Math.round((p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/160*255));p[i]=p[i+1]=p[i+2]=gray;
}
for(let y=216;y<376;y++)for(let x=8;x<328;x++){
 const i=(y*1024+x)*4,gray=Math.round(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722);p[i]=p[i+1]=p[i+2]=gray;
}
const swatches=[['#ffe958',1,1],['#ffed68',1,1],['#fff784',2,.96],['#fffbb8',2,1],['#fff4db',3,1],['#fff5e6',3,1],['#fff075',4,1],['#d5d0d5',5,1],['#85828f',5,.36]]
 .map(([hex,role,shade])=>({hex,role,shade,rgb:[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}));
const palette=[];
for(let slot=0;slot<160;slot++){
 const x=640+(slot%16)*20,y=8+Math.floor(slot/16)*20,i=((y+8)*1024+x+8)*4;if(p[i+3]===0)continue;
 const sample=[p[i],p[i+1],p[i+2]],near=swatches.reduce((a,b)=>sample.reduce((s,v,k)=>s+(v-a.rgb[k])**2,0)<sample.reduce((s,v,k)=>s+(v-b.rgb[k])**2,0)?a:b);
 palette.push({slot,sourceRGB:sample,role:near.role,shade:near.shade,alpha:p[i+3]/255});
 for(let py=y;py<y+16;py++)for(let px=x;px<x+16;px++){const j=(py*1024+px)*4;if(p[j+3]===0)continue;p[j]=Math.round(near.role/8*255);p[j+1]=Math.round(near.shade*255);p[j+2]=0;}
}
ctx.putImageData(img,0,0);mkdirSync(out,{recursive:true});
function write(name,bytes){const file=join(out,name),b=Buffer.from(bytes);if(!existsSync(file)||!readFileSync(file).equals(b))writeFileSync(file,b);}
write('BuildFX_Masks.png',canvas.toBuffer('image/png'));
const meshes=recipe.meshes.map(m=>m.name.startsWith('Smoke')?{...m,vertices:m.vertices.map(([x,y,z])=>[x,y*.88,z])}:m);
write('native-recipe.json',JSON.stringify({...recipe,version:2,meshes,colorAtlas:'BuildFX_Masks.png',palette,
 smoke:{systems:1,variantMeshes:['Smoke0','Smoke1','Smoke2'],bursts:[{time:.075,count:[7,9]},{time:.47,count:[4,6]},{time:.69,count:[3,5]}],autoRandomSeed:true,
  shape:{type:'Box',position:[0,1.0,0],scale:[2.5,1.35,0]},sizeRange:[1.05,1.65],lifetimeBySystemTime:[[.075,.57,.70],[.47,.40,.50],[.69,.36,.46]],
  velocityX:[-.32,.32],velocityY:[.30,.60],planarNoise:[.08,.06,0],seedReview:[22,71,143,329]},
 defaultColors:{smoke:'#9b96a4',flash:'#ffe958',highlight:'#fffbb8',arc:'#fff4db',spark:'#fff075',debris:'#d5d0d5',glow:'#fff197'},glowIntensity:.1},null,2));
write('manifest.json',JSON.stringify({effectName:'BuildFX',version:'V2',authorInstruction:'按照理解修改本次组装的特效：颜色独立可调、烟雾使用原生受控随机分布。',
 source:'Tools/PixelFX/src/hd/mortar-assembly.js',sourceHash:recipe.sourceHash,sourceUnmodified:true,
 geometrySource:'V1 native-recipe (captured actual source painter); retain contours and UV layout, planar smoke mesh aspect .88.',
 texture:{name:'BuildFX_Masks.png',size:[1024,512],frames:1,animation:false,sRGB:false,format:'RGBA8 data atlas: neutral smoke/glow shading plus palette role/shade/alpha blocks',
  sha256:hash(readFileSync(join(out,'BuildFX_Masks.png'))),filter:'Bilinear',wrap:'Clamp',mips:false,compression:'Uncompressed baseline'},
 maskContract:{smoke:'UV.x<.625 and UV.y>.60: neutral RGB shading, original alpha',glow:'UV.x<.625 and UV.y<=.60: neutral radial RGB, original alpha',palette:'UV.x>=.625: role=round(R*8), G=shade, A=source element opacity',roles:{1:'Flash',2:'Highlight',3:'Arc',4:'Spark',5:'Debris'}},
 nativeAdaptation:'One smoke system, three timed bursts, random box domain in local XY, random mesh/size/lifetime/velocity/rotation and small planar Noise. Keep three flash timings; no per-puff fixed nodes.',
 colors:'Material palette parameters define independent roles; native Start Color and Color over Lifetime multiply them. Two shared blend materials, no per-role material proliferation.',
 boundaries:['Fixed-plane 2.5D remains intentional.','Random layouts preserve range and timing, not source particle identities.','Default live stochastic systems use Auto Random Seed; fixed seeds are only for comparison.'],
 unityAssetRoot:'Assets/PixelFX/BuildFX',gifGenerated:false},null,2));
console.log(JSON.stringify({out,meshes:meshes.length,paletteSwatches:palette.length,smokeSystems:1,sourceHash:recipe.sourceHash}));
