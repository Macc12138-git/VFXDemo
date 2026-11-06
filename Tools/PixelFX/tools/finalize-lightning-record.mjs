#!/usr/bin/env node
// Evidence-only finalization; does not edit Unity assets or the workbench.
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const out=join(root,'VFXWork/Previews/LightningNova/V1.3');
const read=p=>readFileSync(join(root,p),'utf8');
const hash=p=>createHash('sha256').update(readFileSync(join(root,p))).digest('hex');
const json=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n');
const blocks=p=>new Map([...read(p).matchAll(/^--- !u!(\d+) &(-?\d+)\n([\s\S]*?)(?=^--- !u!|(?![\s\S]))/gm)].map(m=>[m[2],{type:m[1],text:m[0]}]));
const before=blocks('VFXWork/Backups/LightningNova/V1.3/VFXWorkbench-before.unity'),after=blocks('Assets/Scenes/VFXWorkbench.unity');
const changed=[...before].filter(([id,b])=>after.get(id)?.text!==b.text).map(([id,b])=>({id,type:b.type,present:after.has(id)}));
const scene={beforeBlocks:before.size,afterBlocks:after.size,changed,added:[...after.keys()].filter(id=>!before.has(id)),existingBlocksPreserved:changed.every(b=>b.type==='1660057539'),scope:'Only SceneRoots list and two added PrefabInstance blocks may differ. Camera, Transform, GameObject and scene settings compared verbatim against this turn backup.'};
json('SceneFileComparison.json',scene);
if(!scene.existingBlocksPreserved)throw Error('Existing scene blocks changed; review required.');
function files(path){return readdirSync(join(root,path)).flatMap(name=>{const p=join(path,name);return statSync(join(root,p)).isDirectory()?files(p):[p];});}
const assets=files('Assets/PixelFX/LightningNova').filter(p=>!p.endsWith('.meta')).map(p=>({path:p,sha256:hash(p),bytes:statSync(join(root,p)).size}));
const visual=JSON.parse(read('VFXWork/Previews/LightningNova/V1.3/VisualAndStructure.json'));
const live=JSON.parse(read('VFXWork/Previews/LightningNova/V1.3/LivePlayback.json'));
const performance=JSON.parse(read('VFXWork/Previews/LightningNova/V1.3/PerformanceSummary.json'));
const fd=JSON.parse(read('VFXWork/Previews/LightningNova/V1.3/FrameDebuggerEvents.json'));
if(!live.success||!performance.success||visual.shaderErrors.some(x=>x.severity===0)||visual.paletteTests.some(x=>x.changedPixels===0))throw Error('Required checks failed.');
json('DeliveryManifest.json',{effect:'LightningNova',version:'V1.3',authorization:'导入到unity中',sourceHash:hash('Tools/PixelFX/src/hd/lightning-nova.js'),mathHash:hash('Tools/PixelFX/src/core/math.js'),assets,scene,prefabs:assets.filter(a=>a.path.endsWith('.prefab')).map(a=>a.path),stage:'Real-playback validated, local Editor performance baseline measured; Unity final visual acceptance pending author.',staticReview:'2D/3D key phases, 5/24/60/85 degree elevations, four native distribution seeds, isolated rings/sparks, light/dark background, four palette alpha endpoints and cross-hue render.',live:live.success,performance:performance.success,frameEvents:fd.reports.map(r=>({instances:r.instances,total:r.totalEvents,effectGeometry:r.events.filter(e=>e.type==='DynamicGeometry').length,detailAvailable:r.events.some(e=>e.dataOk)})),pending:['Author Unity final visual acceptance','Target Player/API variants and device performance budget','Per-pass GPU/overdraw','Detailed event batch break reasons','Long-term pool/memory trend'],approximations:['Native secondary currents and ejected charges do not preserve source particle identities.','Main path geometry and current equations retained; small double filaments and disconnected endpoint sparks are approximated by native secondary bursts.','Fixed transparent Mesh triangle ordering differs from source per-brush camera sorting.','Both restrikes use native .04s/.28 alpha; source two followups use differing strengths.','Outer ground pool retained and calibrated in linear lighting; small source secondary core pool is represented by impact core rather than a separate pool.']});
const fmt=x=>x?.median===undefined?'unavailable':`${x.median.toFixed(3)} / ${x.p95.toFixed(3)}`;
const table=['# Local Editor performance','',`Unity ${performance.environment.unity}, ${performance.environment.device}, ${performance.environment.api}, ${performance.environment.width}x${performance.environment.height}; all CPU/GPU values are whole-frame Editor median / P95, not effect-only. 2 repetitions, 1.7s warmup / 3.3s sample.`, '', '| Variant / count | Frames | Batches P95 / max | Draws P95 / max | SetPass P95 | Main ms | Render ms | GPU ms | Particle Update ms | Peak particles | GC median bytes |','| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
for(const g of performance.groups)table.push(`| ${g.variant} / ${g.instances}${g.stagger?' staggered':''} | ${g.frames} | ${g.batches.p95} / ${g.batches.max} | ${g.draws.p95} / ${g.draws.max} | ${g.setPass.p95} | ${fmt(g.mainMs)} | ${fmt(g.renderMs)} | ${fmt(g.gpuMs)} | ${fmt(g.particleMs)} | ${g.particles.max} | ${g.gcBytes.median} |`);
table.push('','The burst is short and most of a 1.9s loop is empty; median draw/particle count hides its peak. This is exploratory 0/1/8/32, not a production concurrency budget. Baseline differences are estimates only. GC includes Editor/probe overhead.',`Shared resource runtime memory: meshes ${visual.resourceMemory.meshes} bytes, materials ${visual.resourceMemory.materials} bytes (Unity Profiler runtime size, not total GPU allocation). No textures.`, '', 'Detailed batch reasons, per-pass GPU/overdraw, target Player variants/device budget and long-run memory remain unverified. No algorithm-performance optimization claim is made; BeforeLightCalibration records the earlier visual calibration baseline.');
writeFileSync(join(out,'PerformanceTable.md'),table.join('\n')+'\n');
console.log(JSON.stringify({scenePreserved:scene.existingBlocksPreserved,assets:assets.length,live:live.success,performance:performance.success,groups:performance.groups.length}));
