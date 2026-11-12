// Review the two active pixel projectiles; aircraft work is stopped and is never generated here.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { ROOT, loadEffect, renderFrames, contactSheet, save } from "./lib/fxlib.mjs";
import { createFrame, painterFor, composite, hex } from "../src/core/index.js";
import { encodePNG } from "./lib/png.mjs";

const round=process.argv[2]??"pulse-round1";
if(!/^[a-z0-9-]+$/i.test(round))throw new Error("Use a simple review round label");
const dest=join(ROOT,"records/arcade-set",round);
mkdirSync(dest,{recursive:true});
const ids=["fire/arcade-fireball","projectiles/arcade-round"];
const effects=await Promise.all(ids.map(id=>loadEffect(id)));
const ledger={version:round,authoring:"pixel geometry / bright-dark fireball / no animation sheets",unityImported:false,aircraft:"stopped; historical files retained, not generated or previewed",effects:[]};
function raw(fx,t,options={}){
  const f=createFrame(...fx.meta.size);
  fx.mod.draw(painterFor(f).place(...fx.meta.origin),t,{...fx.meta.options,...options});
  return f.color;
}
function components(buf,w){
  const todo=new Set(Array.from(buf,(c,i)=>(c>>>24)?i:-1).filter(i=>i>=0));
  let n=0;
  while(todo.size){
    n++;const stack=[todo.values().next().value];todo.delete(stack[0]);
    while(stack.length){
      const k=stack.pop(),x=k%w;
      for(const v of [x>0?k-1:-1,x<w-1?k+1:-1,k-w,k+w])if(todo.delete(v))stack.push(v);
    }
  }
  return n;
}
const mask=buf=>buf.map(c=>(c>>>24)?1:0);
function meanLuma(buf){
  let sum=0,n=0;
  for(const c of buf)if(c>>>24){sum+=(c&255)*0.2126+((c>>>8)&255)*0.7152+((c>>>16)&255)*0.0722;n++;}
  return sum/n;
}
for(const fx of effects)for(const seed of [1,2,3,11,17,23]){
  assert.deepEqual(raw(fx,0,{seed}),raw(fx,1,{seed}),fx.id+": loop endpoint");
  assert.deepEqual(raw(fx,0.37,{seed}),raw(fx,0.37,{seed}),fx.id+": deterministic");
}
const silhouette=mask(raw(effects[0],0)),steady=raw(effects[0],0,{pulse:0}),brightness=[];
for(let i=0;i<24;i++){
  const fire=raw(effects[0],i/24);
  assert.deepEqual(mask(fire),silhouette,"fireball silhouette moved");
  assert.deepEqual(steady,raw(effects[0],i/24,{pulse:0}),"disabled pulse still changes");
  assert.equal(components(fire,effects[0].meta.size[0]),1,"fireball is not one connected sprite");
  assert.equal(components(raw(effects[1],i/24),effects[1].meta.size[0]),1,"round is not one connected sprite");
  brightness.push({t:i/24,meanLuma:meanLuma(fire)});
}
const ratio=Math.max(...brightness.map(v=>v.meanLuma))/Math.min(...brightness.map(v=>v.meanLuma));
assert.ok(ratio>1.35,"bright and dim phases are not distinct enough");
const hash=src=>createHash("sha256").update(src).digest("hex");
const baseline=JSON.parse(readFileSync(join(ROOT,"records/arcade-set/final-round3/manifest.json"),"utf8"));
assert.equal(hash(readFileSync(effects[1].file,"utf8")),baseline.effects.find(v=>v.id===ids[1]).sha256,"small round changed");
ledger.checks={exactLoopEndpoints:true,fixedFireballSilhouette:true,singleFireballAndRound:true,pulseToggle:true,deterministic:true,smallRoundUnchanged:true,brightDimRatio:ratio,brightness};
for(const fx of effects){
  const src=readFileSync(fx.file,"utf8"),name=fx.id.split("/")[1];
  save(join(dest,name+".source.js"),src);
  save(join(dest,name+"-contact.png"),contactSheet(fx,renderFrames(fx,{actor:false}),{max:12,zoom:4}));
  ledger.effects.push({id:fx.id,source:fx.file,sha256:hash(src),meta:fx.meta});
}
// Bright / dim phase comparisons, not a multi-shot asset.
const W=180,H=64,scale=4,sheet=new Uint8Array(W*scale*H*3*scale*4);
for(let row=0;row<3;row++){
  const frame=createFrame(W,H),p=painterFor(frame);
  effects[0].mod.draw(p.place(32,32),0,effects[0].meta.options);
  effects[0].mod.draw(p.place(90,32),1/6,effects[0].meta.options);
  effects[1].mod.draw(p.place(148,32),0.25,effects[1].meta.options);
  p.place(0,0);
  const label=hex(row===2?"#403249":"#efdcbb");
  p.text("BRIGHT",32,4,label,{align:"center"});
  p.text("DIM",90,4,label,{align:"center"});
  p.text("SINGLE",148,4,label,{align:"center"});
  const rgba=composite(frame,new Uint8ClampedArray(W*H*4),hex(["#140b21","#8a8997","#dedbd8"][row]));
  for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){
    const a=(Math.floor(y/scale)*W+Math.floor(x/scale))*4,b=((row*H*scale+y)*W*scale+x)*4;
    sheet.set(rgba.subarray(a,a+4),b);
  }
}
save(join(dest,"background-comparison.png"),encodePNG(W*scale,H*3*scale,sheet));
writeFileSync(join(dest,"manifest.json"),JSON.stringify(ledger,null,2));
console.log(dest+"; bright/dim luminance ratio "+ratio.toFixed(2));
