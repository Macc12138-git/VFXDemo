#!/usr/bin/env node
// HD geometry checks, intentionally separate from the low-resolution pixel checker.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {meta,createFrameGeometry,makeCamera,projectPoint,sortColorGeometry,currentAt} from '../src/hd/lightning-nova.js';
const digest=f=>createHash('sha256').update(JSON.stringify([f.color,f.light])).digest('hex');
const names=['bolt','impact','crown','rings','arcs','sparks','light'];
let maxTriangles=0,maxWorld=0,bounds={};
for(const seed of [1,69,206])for(let n=0;n<=144;n++){
  const t=n/120,f=createFrameGeometry(t,{seed});
  assert.equal(digest(f),digest(createFrameGeometry(t,{seed})),'deterministic');
  for(const list of [f.color,f.light]){
    assert.equal(list.length%21,0);
    for(let i=0;i<list.length;i+=7){
      assert(list.slice(i,i+7).every(Number.isFinite),'finite vertices');
      assert(list[i+6]>=0&&list[i+6]<=1,'alpha range');
      maxWorld=Math.max(maxWorld,...list.slice(i,i+3).map(Math.abs));
    }
  }
  maxTriangles=Math.max(maxTriangles,(f.color.length+f.light.length)/21);
  let covered=0;
  for(const group of f.color.groups){
    assert.equal(group.start,covered,'paint groups cover color geometry without overlap');
    assert(group.end>group.start&&(group.end-group.start)%21===0);
    assert(group.anchor.every(Number.isFinite));covered=group.end;
  }
  assert.equal(covered,f.color.length,'all color vertices participate in spatial ordering');
  // All effect geometry fits default views (excluding the optional ground grid).
  if(seed===69)for(const flat of [true,false]){
    const key=flat?'2D':'3D',c=makeCamera({flat,aspect:1.16,yaw:flat?0:-22,elevation:flat?24:30});
    const b=bounds[key]??=[Infinity,Infinity,-Infinity,-Infinity];
    for(const list of [f.color,f.light])for(let i=0;i<list.length;i+=7){
      if(list[i+6]<0.01)continue;
      const[x,y,z]=projectPoint(list.slice(i,i+3),c);assert(z>0,'in front of camera');
      b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);
    }
  }
}
for(const t of [0,meta.duration,meta.duration+1]){
  const f=createFrameGeometry(t);assert.equal(f.color.length+f.light.length,0,'ends empty');
}
for(const [key,b]of Object.entries(bounds))assert(b.every(v=>Math.abs(v)<0.99),`${key} clipped: ${b}`);
for(const name of names){
  const t=['impact','bolt','crown','light'].includes(name)?.13:.24,f=createFrameGeometry(t,{layers:{[name]:false}});
  assert(!f.layers[name]);assert.notEqual(digest(f),digest(createFrameGeometry(t)),`layer switch ${name}`);
}
const empty=createFrameGeometry(0.24,{layers:Object.fromEntries(names.map(k=>[k,false]))});assert.equal(empty.color.length+empty.light.length,0);
for(const [key,v]of Object.entries({seed:206,radius:1.5,intensity:0.5,glow:0,density:0.4,core:'#ff4488',body:'#55ff55',edge:'#ff5522',spark:'#ff00ff'}))assert.notEqual(digest(createFrameGeometry(.165,{[key]:v})),digest(createFrameGeometry(.165)),`option ${key}`);
assert.equal(createFrameGeometry(0.24,{glow:0}).light.length,0,'zero glow');
// Keep the accepted V1.2 spatial centerlines and nominal widths, independent of current.
const pathHash=f=>createHash('sha256').update(JSON.stringify(f.ringPaths)).digest('hex');
const pathBaseline={1:['0c2afccc5e4d92d42f68c44c6e55f926e7f198c2faadff226e56ed698c526fdd','6346882bf5e6a8bef6d73634044b177370d100079798e7b5b32247427203eb38','6d0ea07d804f9f56632006b621604ea19703f69c801df38583a13dc0685d5df7'],69:['96170fc4c9f3a3ddb025c161ff2699213854694144cb09b9aa4d0477b5ffd0d8','4a52fd3768f1dfb807bd7d04d96c99d9508a39bbe9bec7aa5eee954197b124d7','c73386be99db066d02b0479ff2632d5b642a40da0a59db9032385d964451bfe8'],206:['a5d0cc11d5701eac5bd70dff57de010d05d3182ca80ccd9b4fe29bb78c283a2f','dfac3a8d9d395e9d9ef4f190e0dac3554a3409746e5df77e9b29c8c9be79c057','591fca6fdf5dcd19ed958707471566eda8dde86a0bd7ef89c2316068dd9c32d6']};
for(const seed of [1,69,206])for(const[i,t]of [.18,.24,.32].entries())assert.equal(pathHash(createFrameGeometry(t,{seed})),pathBaseline[seed][i],`accepted ring paths ${seed}/${t}`);
const only=(name,t)=>createFrameGeometry(t,{layers:Object.fromEntries(names.map(k=>[k,k===name]))});
assert.equal(only('impact',.099).color.length,0,'no premature impact');assert(only('impact',.112).color.length>0);assert.equal(only('impact',.34).color.length,0);assert.equal(only('crown',.28).color.length,0,'crown clears quickly');
const sparkBaseline={1:'f6a85a9fbec89a1f49fdd5154e6b8403c4b482a5c6a380eca079d0e54bcd1e55',69:'0a1d9fe227d65df487b044b01126869256a5869d8275b8dc4625d6cc33fa9b3a',206:'af0f7f920c81a4595ad6b32e3c0dba64ac05debd0f0026b05561fe3ba8d49946'};
for(const seed of [1,69,206])assert.equal(digest(createFrameGeometry(.24,{seed,layers:Object.fromEntries(names.map(k=>[k,k==='sparks']))})),sparkBaseline[seed],`preserved sparks ${seed}`);
const currentSamples={};
for(const time of [0,.02,.06,.14,.2,.28,.4]){
  const states=Array.from({length:24},(_,i)=>currentAt(time,(i+.5)/24,69));
  for(const s of states)for(const k of ['alpha','hot','width'])assert(Number.isFinite(s[k])&&s[k]>=0&&s[k]<=1);
  currentSamples[time]={active:states.filter(s=>s.alpha>.1).length,hot:states.filter(s=>s.hot>.4).length};
}
assert.equal(currentSamples[0].active,0);assert(currentSamples[.02].active>0&&currentSamples[.02].active<24,'travelling birth');assert(currentSamples[.06].hot>0,'moving pulse');assert(currentSamples[.2].active>0&&currentSamples[.2].active<24,'fragmented burnout');assert.equal(currentSamples[.4].active,0);
const spatial={};
for(const seed of [1,69,206]){
  const f=createFrameGeometry(.24,{seed}),pts=f.ringPaths.flatMap(p=>p.points),heights=pts.map(p=>p[1]),widths=f.ringPaths.flatMap(p=>p.widths);
  assert.equal(f.ringPaths.length,7,'five open orbital strokes plus two descending whips');
  assert(Math.max(...widths)<.08,'narrow filament diameter, not a broad floor ribbon');
  assert(Math.max(...heights)>1.1&&Math.min(...heights)<.2,'high and low spatial layers');
  assert(f.ringPaths.some(p=>Math.max(...p.points.map(v=>v[1]))-Math.min(...p.points.map(v=>v[1]))>.8),'individual paths change height');
  assert(f.ringPaths.some(p=>p.points.some(v=>v[2]>.3)&&p.points.some(v=>v[2]<-.3)),'a stroke passes around both sides of the center');
  for(const elevation of [8,30,89]){
    const c=makeCamera({yaw:-22,elevation}),sorted=sortColorGeometry(f.color,c);
    assert.equal(sorted.length,f.color.length);assert(sorted.every(Number.isFinite));
  }
  spatial[seed]={paths:f.ringPaths.length,maxDiameter:Math.max(...widths),heightRange:[Math.min(...heights),Math.max(...heights)]};
}
// A compound brush preserves its internal hot-core order; farther brushes precede nearer ones.
const marks=[...Array(21).fill(1),...Array(21).fill(2),...Array(21).fill(3)];
marks.groups=[{start:0,end:21,anchor:[0,0,1]},{start:21,end:42,anchor:[0,0,-1]},{start:42,end:63,anchor:[0,0,1]}];
assert.deepEqual([...sortColorGeometry(marks,makeCamera({elevation:0}))],[...Array(21).fill(2),...Array(21).fill(1),...Array(21).fill(3)]);
// Compare projected circle axis ratios at different elevations, never changing world radius.
const circleRatios={};
for(const elevation of [8,30,89]){
  const c=makeCamera({elevation,aspect:1}),pts=Array.from({length:360},(_,i)=>projectPoint([2.5*Math.cos(i*Math.PI/180),0,2.5*Math.sin(i*Math.PI/180)],c));
  const w=Math.max(...pts.map(p=>p[0]))-Math.min(...pts.map(p=>p[0])),h=Math.max(...pts.map(p=>p[1]))-Math.min(...pts.map(p=>p[1]));circleRatios[elevation]=h/w;
}
assert(circleRatios[89]>0.98&&circleRatios[8]<0.3&&circleRatios[30]>circleRatios[8]);
const source=await readFile(new URL('../src/hd/lightning-nova.js',import.meta.url),'utf8');
assert(!/Math\.random|Date\(/.test(source));
console.log(JSON.stringify({result:'PASS',seeds:[1,69,206],samples:435,maxTriangles,maxWorld,bounds,circleRatios,spatial,currentSamples,sourceSha256:createHash('sha256').update(source).digest('hex'),checks:['determinism','finite mesh','ends empty','default framing','seven layer toggles','nine options','zero glow','world circle projection','nine V1.2 path regressions','three sparks regressions','narrow spatial filaments','high-low wrap paths','complete paint groups','camera depth ordering','compound core order','impact timing','travelling birth','moving current pulse','fragmented burnout']},null,2));
