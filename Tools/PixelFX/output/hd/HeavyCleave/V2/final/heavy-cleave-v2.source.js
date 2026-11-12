// Reference-led redraw: a full blade-length leading face, clean cutting edge and torn inner wake.
// Timing is based on pixelfx Heavy cleave / Sprite Fusion's slash choreography,
// MIT License, Copyright (c) 2026 Hugo Duprez. All V2 contours are newly authored geometry.
export const meta={
  id:'hd/heavy-cleave-v2',name:'重击刀光 · 宽刃撕裂',version:'2.0.2',
  size:[1024,768],pivot:[512,384],duration:.52,fps:60,loop:false,actor:false,
  options:{bladeLength:192,tear:1,glow:.12,body:'#f36b32',shadow:'#9d302b',edge:'#fff3d1',
    layers:{body:true,shadow:true,tail:true,edge:true,glow:true}},
};
export const timing={sweep:.135,hold:.05,trail:.25,end:.52};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,t)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
const R=300,FINAL=-2.95,START=2.48,SPAN=START-FINAL;
export function options(input={}){return{...meta.options,...input,layers:{...meta.options.layers,...input.layers}};}
export function sample(t,input={}){
  const o=options(input),head=clamp(t/timing.sweep)**2;
  const tail=smooth(timing.sweep+timing.hold,timing.sweep+timing.hold+timing.trail,t);
  return{o,head,tail,leadingAngle:START-SPAN*head,span:SPAN*Math.max(0,head-tail),
    bladeLength:o.bladeLength*(1-.38*tail),
    opacity:smooth(0,.018,t)*(1-smooth(.265,.445,t)),
    active:t>0&&t<meta.duration&&head-tail>.0005};
}
// u=0 is the wide leading face; u=1 is the oldest end of the stroke.
export function widthAt(u,f){return f.bladeLength*Math.pow(Math.max(0,1-u),1.32);}
export function pointAt(u,inset,f){
  const a=f.leadingAngle+f.span*u,r=R-inset;
  return[Math.cos(a)*r,Math.sin(a)*r];
}
const at=(u,q,f)=>pointAt(u,widthAt(u,f)*q,f);
const move=(g,p)=>g.moveTo(...p),line=(g,p)=>g.lineTo(...p);
const curve=(g,a,b,c)=>g.bezierCurveTo(...a,...b,...c);
function angularRibbon(g,f,from,to,outer,inner){
  const n=Math.max(8,Math.ceil((to-from)*f.span*70)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const u=from+(to-from)*i/n;
    a.push(pointAt(u,typeof outer==='function'?outer(u):outer,f));
    b.push(pointAt(u,typeof inner==='function'?inner(u):inner,f));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));g.closePath();
}
function hull(g,f){
  const end=.86,n=Math.max(10,Math.ceil(end*f.span*70)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const u=end*i/n,w=widthAt(u,f)*clamp((end-u)/.065);
    a.push(pointAt(u,0,f));b.push(pointAt(u,w,f));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));
  // Two decisive planes across the blade face; the full radial width is retained.
  const angle=f.leadingAngle,tx=-Math.sin(angle),ty=Math.cos(angle);
  for(const [q,lead]of [[.69,-7],[.27,-3]]){
    const p=at(0,q,f);line(g,[p[0]+tx*lead,p[1]+ty*lead]);
  }g.closePath();
}
function tearPaths(g,f){
  // The broad leading face stays intact. These cuts open only from the concave side.
  const cut=(u,q)=>at(u,1+(q-1)*f.o.tear,f);
  move(g,cut(.105,1.27));
  curve(g,cut(.125,.83),cut(.19,.53),cut(.31,.38));
  line(g,cut(.235,.69));
  curve(g,cut(.265,.66),cut(.18,.98),cut(.175,1.38));g.closePath();
  move(g,cut(.40,1.43));
  curve(g,cut(.435,.81),cut(.535,.38),cut(.67,.22));
  line(g,cut(.585,.51));
  curve(g,cut(.572,.65),cut(.495,.99),cut(.48,1.48));g.closePath();
  // One small hard cut, with unequal sides: a stroke break, not repeated scallops.
  move(g,cut(.315,1.18));line(g,cut(.342,.79));line(g,cut(.373,.71));
  line(g,cut(.349,.96));line(g,cut(.357,1.3));g.closePath();
}
function clippedBody(g,f,paint){
  g.save();hull(g,f);g.clip();
  if(f.o.tear>0){
    // Complement clip subtracts real negative space without erasing the selected background.
    g.beginPath();g.rect(-900,-900,1800,1800);tearPaths(g,f);g.clip('evenodd');
  }
  paint();g.restore();
}
function body(g,f){
  g.fillStyle=f.o.body;hull(g,f);g.fill();
}
function shadow(g,f){
  g.fillStyle=f.o.shadow;
  // Two large, locally placed shadow strokes; neither follows the entire outer arc.
  g.beginPath();move(g,at(0,.77,f));
  curve(g,at(.075,.67,f),at(.17,.62,f),at(.265,.91,f));
  line(g,at(.29,1.4,f));line(g,at(0,1.4,f));g.closePath();g.fill();
  g.beginPath();move(g,at(.37,.8,f));
  curve(g,at(.43,.6,f),at(.51,.63,f),at(.575,.94,f));
  line(g,at(.60,1.4,f));line(g,at(.38,1.4,f));g.closePath();g.fill();
}
function edge(g,f){
  g.fillStyle=f.o.edge;
  angularRibbon(g,f,0,.815,0,u=>(5.6-3.7*u)*(1-.25*f.tail));g.fill();
  // A short cut highlight on the broad front; it does not wrap the whole cap.
  const a=f.leadingAngle,p=at(0,0,f),q=at(0,.19,f),tx=-Math.sin(a)*2.2,ty=Math.cos(a)*2.2;
  g.beginPath();move(g,p);line(g,q);line(g,[q[0]+tx,q[1]+ty]);line(g,[p[0]+tx,p[1]+ty]);g.closePath();g.fill();
}
function fragment(g,f,from,to,width,color,inset=0){
  const n=Math.max(8,Math.ceil((to-from)*f.span*70)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const v=i/n,u=from+(to-from)*v;
    // A straight cut at the first end and a long sharp brush exit at the last.
    const w=width*Math.pow(1-v,.8),off=inset*(1-v);
    a.push(pointAt(u,off,f));b.push(pointAt(u,off+w,f));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));g.closePath();g.fillStyle=color;g.fill();
}
function tail(g,f){
  // Each strip follows the same stroke history and stays in the blade's wake.
  fragment(g,f,.876,.952,5.2,f.o.body,-2);
  fragment(g,f,.968,1,2.1,f.o.shadow,0);
}
function detachedInnerStroke(g,f){
  // A forked inner brush split, with a hard break and unequal pointed exits.
  g.beginPath();move(g,at(.48,1.08,f));
  curve(g,at(.53,1.01,f),at(.57,1.04,f),at(.60,1.12,f));
  line(g,at(.64,.96,f));line(g,at(.609,1.35,f));
  curve(g,at(.665,1.15,f),at(.715,.86,f),at(.78,.75,f));
  curve(g,at(.69,1.44,f),at(.58,1.68,f),at(.52,1.42,f));
  g.closePath();g.fillStyle=f.o.shadow;g.fill();
}
function glow(g,f){
  if(f.o.glow<=0)return;
  const c=f.o.body.replace('#','').match(/../g).map(x=>parseInt(x,16)),k=f.o.glow*.10;
  g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<15;i++){
    const u=i/15*.72,[x,y]=pointAt(u,3,f),r=18;
    const light=g.createRadialGradient(x,y,0,x,y,r);
    light.addColorStop(0,`rgba(${c},${k*(1-u)})`);light.addColorStop(1,`rgba(${c},0)`);
    g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);
  }g.restore();
}
export function draw(g,t,input={}){
  const f=sample(t,input);if(!f.active||f.opacity<=0)return;
  g.save();g.globalAlpha=f.opacity;
  if(input.buffer!=='light'){
    clippedBody(g,f,()=>{
      if(f.o.layers.body)body(g,f);
      if(f.o.layers.shadow)shadow(g,f);
      if(f.o.layers.edge)edge(g,f);
    });
    if(f.o.layers.tail){tail(g,f);if(f.o.tear>0)detachedInnerStroke(g,f);}
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
  background(g,W,H,view.background??'dark');g.save();g.translate(W/2,H/2);g.scale(k,k);draw(g,t,input);g.restore();
}
