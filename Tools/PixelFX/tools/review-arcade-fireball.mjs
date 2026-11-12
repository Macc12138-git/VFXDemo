import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ROOT,loadEffect,renderFrames,contactSheet,save,canvas,upscale } from "./lib/fxlib.mjs";
import { createFrame,painterFor,composite,hex } from "../src/core/index.js";
import { encodePNG } from "./lib/png.mjs";

const round=process.argv[2]??"round1";
if(!/^[a-z0-9-]+$/.test(round))throw new Error("Simple round label required");
const dest=join(ROOT,"records/arcade-set/fireball-v4",round);mkdirSync(dest,{recursive:true});
const fx=await loadEffect("fire/arcade-fireball"),[w,h]=fx.meta.size,[ox,oy]=fx.meta.origin;
const sha=data=>createHash("sha256").update(data).digest("hex");
const heat=new Set(fx.meta.options.heatPalette.map(c=>hex(c)>>>0));
function frameAt(t,options={}){
  const frame=createFrame(w,h);fx.mod.draw(painterFor(frame).place(ox,oy),t,{...fx.meta.options,...options});return frame;
}
function components(b){
  const q=new Set(Array.from(b,(c,i)=>c?i:-1).filter(i=>i>=0));let n=0;
  while(q.size){n++;const stack=[q.values().next().value];q.delete(stack[0]);while(stack.length){const k=stack.pop(),x=k%w;for(const j of [x?k-1:-1,x<w-1?k+1:-1,k-w,k+w])if(q.delete(j))stack.push(j);}}return n;
}
const frames=Array.from({length:6},(_,i)=>frameAt(i/fx.meta.fps)),metrics=[];
for(let i=0;i<6;i++){
  const b=frames[i].color,prev=frames[(i+5)%6].color;
  assert.equal(components(b),1,"Must remain one connected fireball");
  let corePixels=0,coreSum=0,coreChanged=0,tailChanged=0,hotPixels=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=y*w+x,c=b[k];
    if(heat.has(c)){corePixels++;coreSum+=(c&255)*.2126+((c>>>8)&255)*.7152+((c>>>16)&255)*.0722;}
    if(c===(hex(fx.meta.options.heatPalette[3])>>>0)||c===(hex(fx.meta.options.heatPalette[4])>>>0))hotPixels++;
    if(c!==prev[k]){if(y<oy+1)coreChanged++;else tailChanged++;}
    if(x===0||y===0||x===w-1||y===h-1)assert.equal(c,0,"Clipping");
  }
  metrics.push({pose:i+1,corePixels,hotPixels,coreIntegratedLuma:coreSum,coreMeanLuma:coreSum/corePixels,coreChangedPixels:coreChanged,tailChangedPixels:tailChanged});
  for(const seed of [1,11,17,23])assert.deepEqual(frameAt(i/fx.meta.fps,{seed}).color,frameAt(i/fx.meta.fps,{seed}).color,"Determinism");
}
assert.equal(new Set(frames.map(f=>sha(f.color))).size,6,"Six distinct poses");
assert.ok(new Set(metrics.map(v=>v.corePixels)).size>=4,"Core area must change, not just brightness");
assert.deepEqual(frames[0].color,frameAt(fx.meta.duration).color,"Loop endpoint");
for(let i=0;i<6;i++){
  const b=frameAt(i/fx.meta.fps,{pulse:0}).color,first=frameAt(0,{pulse:0}).color;
  for(let y=0;y<oy+1;y++)for(let x=0;x<w;x++)assert.equal(b[y*w+x],first[y*w+x],"Heat pause changed core");
}
const impactFile=join(ROOT,"src/fx/explosions/arcade-fireball-impact.js");
const impactBaseline=JSON.parse(readFileSync(join(ROOT,"records/arcade-set/flight-impact/final/manifest.json"),"utf8")).effects.find(e=>e.id==="explosions/arcade-fireball-impact");
assert.equal(sha(readFileSync(impactFile)),impactBaseline.sha256,"Explosion was modified");
const src=readFileSync(fx.file,"utf8");save(join(dest,"arcade-fireball.source.js"),src);
save(join(dest,"contact.png"),contactSheet(fx,renderFrames(fx,{actor:false}),{max:6,zoom:6,width:1600}));
for(const [label,i]of [["bright",5],["dim",2]])save(join(dest,label+".png"),encodePNG(w,h,composite(frames[i],new Uint8ClampedArray(w*h*4),null)));
const sheet=canvas(6*150+8,3*172+24),backgrounds=["#13042a","#87848f","#e1ddd8"];
for(let row=0;row<3;row++)for(let j=0;j<6;j++){
  sheet.text(`F${j+1}`,14+j*150,10+row*172,1);
  const rgba=composite(frames[j],new Uint8ClampedArray(w*h*4),hex(backgrounds[row]));
  sheet.paste(upscale(rgba,w,h,3),w*3,h*3,28+j*150,24+row*172);
}
save(join(dest,"backgrounds.png"),sheet.png());
writeFileSync(join(dest,"manifest.json"),JSON.stringify({version:"V4",round,id:fx.id,source:fx.file,sha256:sha(src),meta:fx.meta,metrics,checks:{deterministic:true,singleConnectedSprite:true,sixDistinctPoses:true,coreAreaChanges:true,corePause:true,loopEndpoint:true,unclipped:true,explosionUnchanged:true},unityImported:false,scope:"Repaint the single fireball only; explosion retained as historical draft, not newly accepted"},null,2));
console.log(dest);console.log(metrics);
