// Review reference: only the two blade arcs from src/fx/melee/heavy-cleave.js.
// The original sweep, palette, width profile and cooling expressions are preserved.
// Adapted from Sprite Fusion's open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import {createFrame,painterFor,composite,fit,clamp,smooth,ease} from '../core/index.js';
import {swing,onSwing,smear,glowAlong} from '../fx/melee/_lib.js';
import {meta as original} from '../fx/melee/heavy-cleave.js';
import {meta,SOURCE_SCALE,background} from './heavy-cleave-v3.js';
const A=swing({cx:3,cy:-22,R:37,sy:.88,rot:.32,a0:-2.45,dir:1});
let U1=0;while(onSwing(A,A.R,U1)[1]<-.5&&U1<4)U1+=.005;
const E={...A,R:A.R*.76},C=fit(original.options.palette,8),n=C.length;
export function referencePixels(t){
  const f=createFrame(...original.size,-original.origin[0],-original.origin[1]),p=painterFor(f);
  // Source t=.20 starts the isolated slash. Charge and impact have been excluded.
  const time=t+.2,HIT=.335,HOLD=.05,TRAIL=.22;
  const head=tt=>ease.inQuad(clamp((tt-.2)/.135)),passedAt=u=>.2+.135*Math.sqrt(clamp(u));
  const arc=(s,w0,lag,rim)=>{
    const tt=time-lag,U=U1*head(tt),T=U1*smooth(HIT+HOLD,HIT+HOLD+TRAIL,tt);
    if(U<.02||T>=U-.02)return;
    const gone=smooth(HIT+HOLD,HIT+HOLD+TRAIL,tt),shrink=1-.75*gone;
    smear(p,s,T,U,w0,(u,r,out)=>{
      const age=Math.max(0,tt-passedAt(u/U1)),v=(u-T)/(U-T);
      const w=w0*shrink*Math.pow(Math.sin(Math.PI*Math.pow(v,2.2)),.6);if(w<.4)return;
      const q=(s.R-r)/w;if(q<0||q>1)return;
      const ci=rim&&q<.22&&age<.12?0:Math.round(q*(n-1)*.62+age*7+Math.max(0,tt-HIT)*10-v*.8+(rim?.7:1.7));
      out.c=C[n-1-clamp(ci,0,n-1)];out.a=Math.min(1,v/.35)*(1.2-gone);
    });
    if(rim)glowAlong(p,s,s.R-w0*.4,T,U,7+w0*.5,C[4],u=>.26*Math.exp(-Math.max(0,tt-passedAt(u/U1))/.2)*((u-T)/(U-T)));
  };
  arc(E,5,.02,false);arc(A,16,0,true);
  return{width:f.w,height:f.h,data:composite(f,new Uint8ClampedArray(f.w*f.h*4))};
}
const cache=new WeakMap();
export function renderReference(canvas,t,makeCanvas,view={}){
  const pixels=referencePixels(t),g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,k=Math.min(W/1024,H/768);
  let small=cache.get(canvas);if(!small){small=makeCanvas(pixels.width,pixels.height);cache.set(canvas,small);}
  const c=small.getContext('2d'),data=c.createImageData(pixels.width,pixels.height);data.data.set(pixels.data);c.putImageData(data,0,0);
  background(g,W,H,view.background??'dark');g.save();g.imageSmoothingEnabled=false;
  g.drawImage(small,(meta.pivot[0]-original.origin[0]*SOURCE_SCALE)*k,(meta.pivot[1]-original.origin[1]*SOURCE_SCALE)*k,pixels.width*SOURCE_SCALE*k,pixels.height*SOURCE_SCALE*k);g.restore();
}
