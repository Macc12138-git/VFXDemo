// Heavy cleave's original clockwise overhead-to-floor motion, redrawn as HD brush geometry.
// Motion adapted from Sprite Fusion's open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash),
// MIT License, Copyright (c) 2026 Hugo Duprez. No reference bitmap is used during playback.
export const meta={
  id:'hd/heavy-cleave-v3',name:'重击刀光 · 原版轨迹手绘',version:'3.0.2',
  size:[1024,768],pivot:[388,650],duration:.52,fps:60,loop:false,actor:false,
  options:{bladeLength:176,tear:1,glow:.12,body:'#f47732',shadow:'#9d302b',edge:'#fff3d1',
    layers:{echo:true,body:true,shadow:true,tail:true,edge:true,glow:true}},
};
export const timing={sweep:.135,hold:.05,trail:.22,end:.52};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,t)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const SOURCE_SCALE=320/37;
const R=37,C=Math.cos(.32),S=Math.sin(.32),A0=-2.45,SY=.88;
// Identical floor termination to the original Heavy cleave, in original pixel coordinates.
let span=0;
while(-22+Math.cos(A0+span)*R*S+Math.sin(A0+span)*R*SY*C<-.5&&span<4)span+=.005;
export const SPAN=span;
export function onArc(s,inset=0,ratio=1){
  const a=A0+SPAN*s,r=R*SOURCE_SCALE*ratio-inset,x=Math.cos(a)*r,y=Math.sin(a)*r*SY;
  return[3*SOURCE_SCALE+x*C-y*S,-22*SOURCE_SCALE+x*S+y*C];
}
export function options(input={}){return{...meta.options,...input,layers:{...meta.options.layers,...input.layers}};}
export function sample(t,input={},lag=0){
  const o=options(input),tt=t-lag,head=clamp(tt/timing.sweep)**2;
  const tail=smooth(timing.sweep+timing.hold,timing.sweep+timing.hold+timing.trail,tt);
  return{o,head,tail,span:SPAN*Math.max(0,head-tail),
    bladeLength:o.bladeLength*(1-.75*tail)*Math.min(1,Math.sqrt(head/.45)),
    opacity:smooth(0,.012,tt)*(1-smooth(.31,.47,tt)),
    active:tt>0&&t<meta.duration&&head-tail>.001};
}
// u=0 is the current leading face; u=1 is the oldest end. Motion is never reversed.
export function widthAt(u,f){return f.bladeLength*Math.pow(Math.max(0,1-u),1.32);}
export function pointAt(u,inset,f,ratio=1){return onArc(f.head-(f.head-f.tail)*u,inset,ratio);}
const at=(u,q,f)=>pointAt(u,widthAt(u,f)*q,f);
const move=(g,p)=>g.moveTo(...p),line=(g,p)=>g.lineTo(...p);
const curve=(g,a,b,c)=>g.bezierCurveTo(...a,...b,...c);
function ribbon(g,f,from,to,outer,inner,ratio=1){
  const n=Math.max(8,Math.ceil((to-from)*f.span*90)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const u=from+(to-from)*i/n;
    a.push(pointAt(u,typeof outer==='function'?outer(u):outer,f,ratio));
    b.push(pointAt(u,typeof inner==='function'?inner(u):inner,f,ratio));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));g.closePath();
}
function hull(g,f){
  const end=.93,n=Math.max(12,Math.ceil(end*f.span*90)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const u=end*i/n,w=widthAt(u,f)*clamp((end-u)/.065);
    a.push(pointAt(u,0,f));b.push(pointAt(u,w,f));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));
  // Deliberate two-plane cap across a whole blade length; no pointed leading tip.
  const p=pointAt(0,0,f),q=onArc(f.head+.001),dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);
  for(const [v,lead]of [[.69,7],[.27,3]]){
    const a=at(0,v,f);line(g,[a[0]+dx/length*lead,a[1]+dy/length*lead]);
  }g.closePath();
}
function tearPaths(g,f){
  const cut=(u,q)=>at(u,1+(q-1)*f.o.tear,f);
  // The clean front third carries the blow; tears open toward the older upper-left wake.
  move(g,cut(.30,1.28));curve(g,cut(.34,.88),cut(.43,.54),cut(.56,.36));
  line(g,cut(.47,.73));curve(g,cut(.48,.69),cut(.42,1.02),cut(.39,1.38));g.closePath();
  move(g,cut(.61,1.43));curve(g,cut(.65,.82),cut(.75,.39),cut(.88,.22));
  line(g,cut(.79,.54));curve(g,cut(.77,.69),cut(.71,1.01),cut(.69,1.48));g.closePath();
}
function clippedBody(g,f,paint){
  g.save();hull(g,f);g.clip();
  if(f.o.tear>0){g.beginPath();g.rect(-1200,-1200,2400,2400);tearPaths(g,f);g.clip('evenodd');}
  paint();g.restore();
}
function shadow(g,f){
  g.fillStyle=f.o.shadow;
  g.beginPath();move(g,at(0,.81,f));curve(g,at(.1,.66,f),at(.22,.66,f),at(.32,.92,f));
  line(g,at(.35,1.4,f));line(g,at(0,1.4,f));g.closePath();g.fill();
  g.beginPath();move(g,at(.43,.8,f));curve(g,at(.49,.61,f),at(.58,.66,f),at(.68,.95,f));
  line(g,at(.71,1.4,f));line(g,at(.44,1.4,f));g.closePath();g.fill();
}
function edge(g,f){
  g.fillStyle=f.o.edge;ribbon(g,f,0,.86,0,u=>(5.7-4.3*u)*(1-.6*f.tail));g.fill();
  const p=at(0,0,f),q=at(0,.16,f),a=onArc(f.head+.001),dx=a[0]-p[0],dy=a[1]-p[1],n=Math.hypot(dx,dy);
  g.beginPath();move(g,p);line(g,q);line(g,[q[0]+dx/n*2,q[1]+dy/n*2]);line(g,[p[0]+dx/n*2,p[1]+dy/n*2]);g.closePath();g.fill();
}
function tail(g,f){
  g.fillStyle=f.o.body;ribbon(g,f,.944,.983,0,u=>4.5*(1-(u-.944)/.039));g.fill();
  g.fillStyle=f.o.shadow;ribbon(g,f,.99,1,0,u=>1.8*(1-(u-.99)/.01));g.fill();
  if(f.o.tear<=0)return;
  g.beginPath();move(g,at(.56,1.08,f));
  curve(g,at(.60,1.01,f),at(.65,1.04,f),at(.68,1.12,f));
  line(g,at(.73,.96,f));line(g,at(.69,1.35,f));
  curve(g,at(.75,1.15,f),at(.81,.86,f),at(.86,.75,f));
  curve(g,at(.77,1.44,f),at(.67,1.68,f),at(.60,1.42,f));g.closePath();g.fill();
}
function echo(g,f){
  g.fillStyle=f.o.shadow;
  // Preserve the original inner echo, but break the older end into two unequal brush strokes.
  for(const [from,to,width]of [[.16,.55,34],[.61,.89,23]]){
    ribbon(g,f,from,to,u=>3*u,u=>3*u+width*Math.pow(1-u,1.3)*clamp((u-from)/.10)*clamp((to-u)/.025)*(1-.75*f.tail),.76);g.fill();
  }
}
function glow(g,f){
  if(f.o.glow<=0)return;
  const c=f.o.body.replace('#','').match(/../g).map(x=>parseInt(x,16)),k=f.o.glow*.1;
  g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<12;i++){
    const u=i/12*.8,[x,y]=pointAt(u,3,f),r=18,light=g.createRadialGradient(x,y,0,x,y,r);
    light.addColorStop(0,`rgba(${c},${k*(1-u)})`);light.addColorStop(1,`rgba(${c},0)`);
    g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);
  }g.restore();
}
export function draw(g,t,input={}){
  const f=sample(t,input);if(!f.active||f.opacity<=0)return;
  g.save();g.globalAlpha=f.opacity;
  if(input.buffer!=='light'){
    if(f.o.layers.echo){const e=sample(t,input,.02);if(e.active)echo(g,e);}
    clippedBody(g,f,()=>{
      if(f.o.layers.body){g.fillStyle=f.o.body;hull(g,f);g.fill();}
      if(f.o.layers.shadow)shadow(g,f);
      if(f.o.layers.edge)edge(g,f);
    });
    if(f.o.layers.tail)tail(g,f);
  }
  if(f.o.layers.glow&&input.buffer!=='color')glow(g,f);
  g.restore();
}
export function background(g,W,H,kind='dark'){
  g.clearRect(0,0,W,H);if(kind==='transparent')return;
  g.fillStyle=({dark:'#15171e',gray:'#53565e',light:'#e0e1e4',warm:'#77685f',checker:'#39414a'})[kind]??'#15171e';g.fillRect(0,0,W,H);
  if(kind==='checker'){g.fillStyle='#47515c';for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24)if((x/24+y/24)%2===0)g.fillRect(x,y,24,24);}
}
export function render(canvas,t,input={},view={}){
  const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,k=Math.min(W/1024,H/768);
  background(g,W,H,view.background??'dark');g.save();g.translate(meta.pivot[0]*k,meta.pivot[1]*k);g.scale(k,k);draw(g,t,input);g.restore();
}
