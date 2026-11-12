// Compare padded native Unity renders; diagnostic images are not replacement assets.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';
const out='VFXWork/Previews/EnergyCluster/V6/HaloBoundsFix';
const names=['Dark','Black','Light','Halo','Shell','GameSize','Close','SizeClamp'];
const results=[];
for(const name of names){
 const a=await loadImage(`${out}/Before_${name}.png`),b=await loadImage(`${out}/After_${name}.png`);
 const c=createCanvas(512,512),ctx=c.getContext('2d');ctx.drawImage(a,0,0);const x=ctx.getImageData(0,0,512,512).data;ctx.clearRect(0,0,512,512);ctx.drawImage(b,0,0);const y=ctx.getImageData(0,0,512,512).data;
 const at=(data,px,py)=>Array.from(data.slice((py*512+px)*4,(py*512+px)*4+3));
 const size=name==='GameSize'?4.9:name==='Close'?1.28:name==='SizeClamp'?.64:2.56;
 const originalHalf=Math.min(256,1.28*256/size);
 let unchanged=0,total=0,maxOriginalQuadDelta=0,edgeMax=0;
 for(let py=0;py<512;py++)for(let px=0;px<512;px++){
  const i=(py*512+px)*4,delta=Math.max(...[0,1,2].map(k=>Math.abs(x[i+k]-y[i+k])));
  if(delta===0)unchanged++;total++;
  if(Math.abs(px+.5-256)<originalHalf&&Math.abs(py+.5-256)<originalHalf)maxOriginalQuadDelta=Math.max(maxOriginalQuadDelta,delta);
  if(px===64||px===447||py===64||py===447)edgeMax=Math.max(edgeMax,...[0,1,2].map(k=>Math.abs(y[i+k]-y[k])));
 }
 results.push({name,unchanged,total,maxOriginalQuadDelta,expandedQuadEdgeDeltaFromBackground:name==='Halo'?edgeMax:null,beforeOldSide:[at(x,127,256),at(x,128,256)],afterOldSide:[at(y,127,256),at(y,128,256)],newSide:[at(y,63,256),at(y,64,256)]});
}
const before=JSON.parse(readFileSync(`${out}/Before.json`)),after=JSON.parse(readFileSync(`${out}/After.json`));
const serializedDiff=[];
function diff(a,b,path){if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],`${path}.${k}`);}else serializedDiff.push({path,before:a,after:b});}
for(let i=0;i<before.prefab.systems.length;i++)for(const key of ['json','renderer'])diff(JSON.parse(before.prefab.systems[i][key]),JSON.parse(after.prefab.systems[i][key]),`${before.prefab.systems[i].name}.${key}`);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const board=createCanvas(1056,564),cx=board.getContext('2d');cx.fillStyle='#11141a';cx.fillRect(0,0,1056,564);cx.font='18px sans-serif';cx.fillStyle='#d8e4ff';cx.fillText('Before',16,30);cx.fillText('After - native Unity render',544,30);cx.drawImage(await loadImage(`${out}/Before_Dark.png`),8,44);cx.drawImage(await loadImage(`${out}/After_Dark.png`),536,44);writeFileSync(`${out}/Comparison.png`,board.toBuffer('image/png'));
const report={results,serializedDiff,camerasUnchanged:JSON.stringify(before.cameras)===JSON.stringify(after.cameras),sceneOverridesUnchanged:JSON.stringify(before.sceneInstances.map(x=>x.overrides))===JSON.stringify(after.sceneInstances.map(x=>x.overrides)),sceneFileUnchanged:hash('Assets/Scenes/VFXWorkbench.unity')===hash(`${out}/VFXWorkbench.unity.before`),textures:['EnergyCluster_ShellGrayAlpha.asset','EnergyCluster_Profiles.asset'].map(n=>({name:n,hash:hash(`Assets/PixelFX/EnergyCluster/Textures/${n}`)}))};
writeFileSync(`${out}/EdgeValidation.json`,JSON.stringify(report,null,2));
const perfBefore=JSON.parse(readFileSync(`${out}/PerformanceBefore/PerformanceSummary.json`)),perfAfter=JSON.parse(readFileSync(`${out}/PerformanceAfter/PerformanceSummary.json`));
const performance={environmentMatched:JSON.stringify(perfBefore.environment)===JSON.stringify(perfAfter.environment),environment:perfAfter.environment,groups:perfBefore.groups.map(a=>({instances:a.instances,spread:a.spread,before:a,after:perfAfter.groups.find(b=>b.instances===a.instances&&b.spread===a.spread)})),coverage:{haloQuadAreaRatio:2.25,totalFiveQuadAreaRatio:1.25,note:'Geometric area only, not measured GPU time or effective overdraw.'},limitations:['Whole-frame Editor timings are noisy; not isolated per-effect GPU cost.','32 overlapping instances showed higher GPU median after padding; no performance improvement is claimed.','Exact batch merge/break detail and target PC Player budget remain unverified.']};
writeFileSync(`${out}/PerformanceComparison.json`,JSON.stringify(performance,null,2));
const original=JSON.parse(readFileSync('VFXWork/Exports/EnergyCluster/V6/manifest.json'));
const changedPaths=['Assets/PixelFX/EnergyCluster/Shaders/EnergyClusterHybrid.shader','Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab'];
const manifest={effect:'EnergyCluster',revision:'V6 HaloBoundsFix',authorization:'User: 修复该问题 (square halo cutoff)',supersedesRuntimeAssetsOf:'VFXWork/Exports/EnergyCluster/V6/manifest.json',logicalCoordinates:{mainQuadWidth:2.56,haloQuadWidth:3.84,haloPadding:1.5,haloMaxParticleSize:1.5,othersMaxParticleSize:1},changedAssets:changedPaths.map(p=>({path:p,before:original.hashes[p],after:hash(p)})),unchangedSourceInputs:Object.entries(original.hashes).filter(([p])=>!changedPaths.includes(p)).map(([path,previous])=>({path,hash:hash(path),matches:hash(path)===previous})),evidence:out,noNewTextures:true,noNewParticles:true,noRuntimeScripts:true,explosionImported:false};
writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({edges:results.map(x=>({name:x.name,maxOriginalQuadDelta:x.maxOriginalQuadDelta,expandedQuadEdgeDeltaFromBackground:x.expandedQuadEdgeDeltaFromBackground})),serializedDiff,camerasUnchanged:report.camerasUnchanged,sceneOverridesUnchanged:report.sceneOverridesUnchanged,sceneFileUnchanged:report.sceneFileUnchanged,environmentMatched:performance.environmentMatched,sourceInputsUnchanged:manifest.unchangedSourceInputs.every(x=>x.matches)},null,2));
