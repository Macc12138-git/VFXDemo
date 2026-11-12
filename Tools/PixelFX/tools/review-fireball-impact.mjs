import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import assert from "node:assert/strict";
import { ROOT, loadEffect, renderFrames, contactSheet, save, canvas, upscale } from "./lib/fxlib.mjs";
import { createFrame, painterFor, composite, hex } from "../src/core/index.js";

const round=process.argv[2]??"round1";
if(!/^[a-z0-9-]+$/i.test(round))throw new Error("Use a simple review label");
const dest=join(ROOT,"records/arcade-set/flight-impact",round);
mkdirSync(dest,{recursive:true});
const effects=await Promise.all(["fire/arcade-fireball","explosions/arcade-fireball-impact"].map(id=>loadEffect(id)));
const hash=src=>createHash("sha256").update(src).digest("hex");
function raw(fx,t,opts={}){
  const f=createFrame(...fx.meta.size);
  fx.mod.draw(painterFor(f).place(...fx.meta.origin),t,{...fx.meta.options,...opts});
  return f.color;
}
const mask=b=>b.map(c=>c?1:0);
function components(b,w){
  const todo=new Set(Array.from(b,(c,i)=>c?i:-1).filter(i=>i>=0));
  let count=0;
  while(todo.size){
    count++;const stack=[todo.values().next().value];todo.delete(stack[0]);
    while(stack.length){
      const at=stack.pop(),x=at%w;
      for(const k of [x>0?at-1:-1,x<w-1?at+1:-1,at-w,at+w])if(todo.delete(k))stack.push(k);
    }
  }
  return count;
}
function region(b,w,x0,y0,x1,y1){
  const a=[];
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)a.push(b[y*w+x]);
  return a;
}
function luma(a){
  return a.reduce((v,c)=>v+(c?(.2126*(c&255)+.7152*((c>>>8)&255)+.0722*((c>>>16)&255)):0),0)/a.length;
}
const [fire,impact]=effects,FPS=fire.meta.fps,fw=fire.meta.size[0],[fx,fy]=fire.meta.origin;
const first=raw(fire,0),tail=region(first,fw,0,fy+5,fw,fire.meta.size[1]),levels=[];
const uniqueFire=new Set(),uniqueImpact=new Set();
for(let i=0;i<6;i++){
  const b=raw(fire,i/FPS);
  assert.deepEqual(mask(b),mask(first),"Flight silhouette changed");
  assert.equal(components(b,fw),1,"More than one connected flight sprite");
  assert.deepEqual(region(b,fw,0,fy+5,fw,fire.meta.size[1]),tail,"Tail animated");
  assert.deepEqual(raw(fire,i/FPS,{pulse:0}),raw(fire,0,{pulse:0}),"Heat toggle changes geometry");
  levels.push(luma(region(b,fw,fx-4,fy-9,fx+4,fy-1)));
  uniqueFire.add(hash(b));
}
assert.equal(uniqueFire.size,6,"Not six unique heat states");
assert.ok(Math.max(...levels)/Math.min(...levels)>1.35,"Core bright/dim contrast too weak");
assert.deepEqual(first,raw(fire,fire.meta.duration),"Loop endpoint");
for(const effect of effects){
  const n=effect===fire?6:8;
  for(let i=0;i<n;i++)for(const seed of [1,11,17,23]){
    const b=raw(effect,i/FPS,{seed});
    assert.deepEqual(b,raw(effect,i/FPS,{seed}),"Nondeterministic");
    const [w,h]=effect.meta.size;
    for(let x=0;x<w;x++)assert.ok(!b[x]&&!b[(h-1)*w+x],"Vertical clipping");
    for(let y=0;y<h;y++)assert.ok(!b[y*w]&&!b[y*w+w-1],"Horizontal clipping");
    if(effect===impact&&seed===17){assert.ok(b.some(Boolean),"Empty impact pose");uniqueImpact.add(hash(b));}
  }
}
assert.equal(uniqueImpact.size,8,"Not eight unique impact states");
assert.ok(raw(impact,impact.meta.duration).every(c=>!c),"Impact does not clear");
const report={round,unityImported:false,referenceFrameNumbering:"one-based",referenceRange:[30,60],
  timing:{artFps:FPS,flightPoses:6,flightLoopSeconds:fire.meta.duration,impactPoses:8,impactSeconds:impact.meta.duration,note:"GIF frames are 20ms. Flight heat appears to repeat after six GIF frames; impact is an eight-pose reconstruction, not an exact isolated source animation"},
  checks:{deterministic:true,singleConnectedFlightSprite:true,sixUniqueHeatStates:true,fixedFlightSilhouette:true,unchangedTail:true,exactLoopEndpoint:true,eightVisibleImpactStates:true,emptyImpactEndpoint:true,unclipped:true,coreLuma:levels,coreBrightDimRatio:Math.max(...levels)/Math.min(...levels)},effects:[]};
for(const effect of effects){
  const name=effect.id.split("/")[1],src=readFileSync(effect.file,"utf8");
  save(join(dest,name+".source.js"),src);
  save(join(dest,name+"-contact.png"),contactSheet(effect,renderFrames(effect,{actor:false}),{max:9,zoom:4,width:1500}));
  report.effects.push({id:effect.id,source:effect.file,sha256:hash(src),meta:effect.meta});
}
// Review images only; not runtime animation atlases.
const sheet=canvas(14*104+8,3*112+26),backgrounds=["#140b21","#87848f","#e1ddd8"];
for(let row=0;row<3;row++)for(let j=0;j<14;j++){
  const effect=j<6?fire:impact,index=j<6?j:j-6,frame=createFrame(50,50);
  effect.mod.draw(painterFor(frame).place(25,j<6?20:25),index/FPS,effect.meta.options);
  const rgba=composite(frame,new Uint8ClampedArray(50*50*4),hex(backgrounds[row]));
  sheet.paste(upscale(rgba,50,50,2),100,100,8+j*104,26+row*112);
  sheet.text(`${j<6?"F":"X"}${index+1}`,14+j*104,12+row*112,1);
}
save(join(dest,"background-comparison.png"),sheet.png());
writeFileSync(join(dest,"manifest.json"),JSON.stringify(report,null,2));
console.log(dest+"; core luminance ratio "+report.checks.coreBrightDimRatio.toFixed(2));
