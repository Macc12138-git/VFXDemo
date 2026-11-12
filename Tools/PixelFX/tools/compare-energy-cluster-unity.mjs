#!/usr/bin/env node
// Static authoring/Unity comparison and explicit source/asset provenance, outside Assets.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {meta,makeSampler,renderCPU} from '../src/hd/energy-cluster-v6.js';
const modulePath=process.argv[process.argv.indexOf('--canvas-module')+1];
const {createCanvas,loadImage}=await import(pathToFileURL(modulePath));
const author='Tools/PixelFX/output/hd/EnergyCluster/V6/final',out='VFXWork/Previews/EnergyCluster/V6',staging='VFXWork/Exports/EnergyCluster/V6';
await mkdir(staging,{recursive:true});
const data=new Uint8Array(await readFile(author+'/Textures/EnergyCluster_ShellGrayAlpha.rg'));
const profiles=new Uint8Array(await readFile(author+'/Textures/EnergyCluster_Profiles.rgba'));
const sampler=makeSampler({data,profiles}),board=createCanvas(1024,560),g=board.getContext('2d');
g.fillStyle='#050716';g.fillRect(0,0,board.width,board.height);
const comparisons=[];
for(const [row,time] of [.144,.288].entries()){
 const reference=createCanvas(256,256);renderCPU(reference,time,{},sampler);
 const filename=time===.144?'Unity_Default':'Unity_Time288';
 const unity=await loadImage(out+'/'+filename+'.png'),rendered=createCanvas(256,256);rendered.getContext('2d').drawImage(unity,0,0);
 const pixels=reference.getContext('2d').getImageData(0,0,256,256).data,actual=rendered.getContext('2d').getImageData(0,0,256,256).data;
 let error=0,active=0,core=0;for(let i=0;i<pixels.length;i+=4){if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>35){active++;for(let k=0;k<3;k++)error+=Math.abs(pixels[i+k]-actual[i+k]);}if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>200)core++;}
 comparisons.push({time,activePixels:active,sourceBrightPixels:core,meanAbsoluteRGB8WithinSource:error/(active*3),limits:'Linear-alpha/additive Unity composition differs from author display-space layering; not an exact pixel port.'});
 const y=row*280+24;g.drawImage(reference,0,y);g.drawImage(unity,256,y);
 const a=await loadImage(out+'/Layer_Shell.png'),b=await loadImage(out+'/Layer_Halo.png');if(row===0){g.drawImage(a,512,y);g.drawImage(b,768,y);}else{g.drawImage(await loadImage(out+'/Unity_Light.png'),512,y);g.drawImage(await loadImage(out+'/Unity_GameSize.png'),768,y);}
 for(const [col,label] of ['AUTHOR V6','UNITY NATIVE',row===0?'SHELL ONLY':'LIGHT BACKGROUND',row===0?'HALO ONLY':'GAME SIZE'].entries()){g.fillStyle='#a3c4db';g.font='11px monospace';g.fillText(label,col*256+8,y-7);}
}
await writeFile(out+'/Author-Unity-Comparison.png',board.toBuffer('image/png'));
await writeFile(out+'/Comparison.json',JSON.stringify({comparisons},null,2)+'\n');
const sourceFiles=['Tools/PixelFX/src/hd/energy-cluster-v6.js',author+'/manifest.json',author+'/Textures/EnergyCluster_ShellGrayAlpha.rg',author+'/Textures/EnergyCluster_Profiles.rgba','Assets/PixelFX/EnergyCluster/Shaders/EnergyClusterHybrid.shader','Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab'];
const hashes={};for(const file of sourceFiles)hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
await copyFile('Tools/PixelFX/src/hd/energy-cluster-v6.js',staging+'/energy-cluster-v6.source.js');
await writeFile(staging+'/manifest.json',JSON.stringify({effect:'EnergyCluster',version:'V6 Hybrid Native',authorization:'User: 将能量球导入到unity，爆炸效果不要',targetProject:'VFXDemo',prefab:'Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab',author:meta,hashes,
 layers:[{name:'Volume',source:'static radial profile row 0',blend:'premultiplied alpha'},{name:'Halo',source:'static radial profile row 1',blend:'additive'},{name:'Core',source:'static radial profile row 2',blend:'premultiplied alpha'},{name:'ShellGlow',source:'four diagonal local shell energy taps',blend:'additive'},{name:'Shell',source:'previously approved 20-frame gray/alpha shell only',blend:'premultiplied alpha, short frame interpolation'}],
 resources:{shell:{format:'RG16 (linear RG8)',size:[1280,1024],cellSize:[256,256],frames:20,grid:[5,4],colorSpace:'linear data',readWrite:false,wrap:'Clamp',filter:'Bilinear',mipmaps:false,rawRowOrder:'source top row loaded into Unity bottom row; shader samples source-down coordinates'},profiles:{size:[256,3],format:'RGBA32 linear data',temporalFrames:1,readWrite:false}},
 unit:{pixelsPerUnit:100,particleQuadWidth:2.56,pivot:[.5,.5],coreOffsetSource:[0,-2.5454545]},clock:'Native AgePercent / InvStartLifetime (seconds), modulo .48; no global _Time',seed:37,nativeTiming:{duration:.48,lifetime:.50,maxParticlesPerLayer:2,alphaHandoffSeconds:.02,prewarm:false},
 noRuntimeScripts:true,explosionImported:false,limitations:['Reference-derived shell separation; commercial source permission not verified','Display-space composition vs Unity linear blending has documented visual differences','Target PC Player/device budget not certified; see local evidence separately']},null,2)+'\n');
console.log(JSON.stringify({comparisons,hashes},null,2));
