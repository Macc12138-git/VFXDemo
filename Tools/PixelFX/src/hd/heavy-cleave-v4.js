// HD painted surface study over Heavy cleave's preserved V3 motion and silhouette.
// Motion derives from Sprite Fusion's open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash),
// MIT License, Copyright (c) 2026 Hugo Duprez. All surface strokes are authored geometry.
import * as base from './heavy-cleave-v3.js';
export const {timing,clamp,SOURCE_SCALE,SPAN,onArc,pointAt,widthAt,background}=base;
export const meta={...base.meta,id:'hd/heavy-cleave-v4',name:'重击刀光 · 手绘明暗与笔触',version:'4.0.2',
  options:{...base.meta.options,shade:.8,detail:.8,deform:.7,highlight:'#ffc477',
    layers:{...base.meta.options.layers,highlight:true,detail:true}},
};
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const rgb=c=>c.replace('#','').match(/../g).map(v=>parseInt(v,16));
const rgba=(c,a)=>`rgba(${rgb(c)},${clamp(a)})`;
export function options(input={}){return{...meta.options,...input,layers:{...meta.options.layers,...input.layers}};}
export function sample(t,input={}){
  const o=options(input),f=base.sample(t,o);
  // A single pull-and-release, driven by the strike age. No repeating waves on the silhouette.
  return{...f,o,fold:o.deform*(smooth(.035,.145,t)-smooth(.19,.39,t))};
}
const move=(g,p)=>g.moveTo(...p),line=(g,p)=>g.lineTo(...p);
const curve=(g,a,b,c)=>g.bezierCurveTo(...a,...b,...c);
const rawAt=(u,q,f)=>pointAt(u,widthAt(u,f)*q,f);
const at=(u,q,f)=>rawAt(u,q+f.fold*.14*4*u*(1-u)*q*(1-q),f);
const allOff=Object.fromEntries(Object.keys(base.meta.options.layers).map(k=>[k,false]));
function baseLayers(g,t,o,layers,buffer='color'){base.draw(g,t,{...o,buffer,layers:{...allOff,...layers}});}
// Exact V3 hull and negative space, kept separate from the painted surface's small deformation.
function hull(g,f){
  const end=.93,n=Math.max(12,Math.ceil(end*f.span*90)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const u=end*i/n,w=widthAt(u,f)*clamp((end-u)/.065);
    a.push(pointAt(u,0,f));b.push(pointAt(u,w,f));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));
  const p=pointAt(0,0,f),q=onArc(f.head+.001),dx=q[0]-p[0],dy=q[1]-p[1],nrm=Math.hypot(dx,dy);
  for(const [v,lead]of [[.69,7],[.27,3]]){const a=rawAt(0,v,f);line(g,[a[0]+dx/nrm*lead,a[1]+dy/nrm*lead]);}g.closePath();
}
function cutouts(g,f){
  const p=(u,q)=>rawAt(u,1+(q-1)*f.o.tear,f);
  move(g,p(.30,1.28));curve(g,p(.34,.88),p(.43,.54),p(.56,.36));
  line(g,p(.47,.73));curve(g,p(.48,.69),p(.42,1.02),p(.39,1.38));g.closePath();
  move(g,p(.61,1.43));curve(g,p(.65,.82),p(.75,.39),p(.88,.22));
  line(g,p(.79,.54));curve(g,p(.77,.69),p(.71,1.01),p(.69,1.48));g.closePath();
}
function clip(g,f){
  hull(g,f);g.clip();if(f.o.tear>0){g.beginPath();g.rect(-1200,-1200,2400,2400);cutouts(g,f);g.clip('evenodd');}
}
function crossGradient(g,f,u,from,to,stops){
  const a=at(u,from,f),b=at(u,to,f),gradient=g.createLinearGradient(...a,...b);
  for(const [v,c]of stops)gradient.addColorStop(v,c);return gradient;
}
function shadow(g,f){
  const {o}=f;g.save();g.globalAlpha=f.opacity*clamp(o.shade);
  // Broad inner shade creates a curved surface across the formerly flat forward face.
  g.fillStyle=crossGradient(g,f,.12,0,1,[[0,rgba(o.shadow,0)],[.31,rgba(o.shadow,.02)],[.67,rgba(o.shadow,.28)],[1,rgba(o.shadow,.82)]]);
  g.fillRect(-700,-900,1400,1200);
  // A large unequal shadow mass: soft on the blade face, decisive at its torn inner edge.
  g.beginPath();move(g,at(0,.66,f));
  curve(g,at(.08,.47,f),at(.19,.51,f),at(.32,.74,f));
  curve(g,at(.40,.92,f),at(.52,.63,f),at(.70,.90,f));
  line(g,at(.74,1.4,f));line(g,at(0,1.4,f));g.closePath();
  g.fillStyle=crossGradient(g,f,.13,.42,1,[[0,rgba(o.shadow,0)],[.45,rgba(o.shadow,.15)],[1,rgba(o.shadow,.85)]]);g.fill();
  g.restore();
}
function highlight(g,f){
  const {o}=f;g.save();g.globalAlpha=f.opacity;
  // One broad, feathered warm reflection. Its two ends and thickness are deliberately unequal.
  g.beginPath();move(g,at(.026,.08,f));
  curve(g,at(.07,.035,f),at(.25,.09,f),at(.43,.18,f));
  curve(g,at(.30,.23,f),at(.19,.42,f),at(.065,.30,f));
  curve(g,at(.04,.24,f),at(.035,.14,f),at(.026,.08,f));g.closePath();
  g.fillStyle=crossGradient(g,f,.13,.04,.46,[[0,rgba(o.highlight,0)],[.3,rgba(o.highlight,.44)],[.65,rgba(o.highlight,.21)],[1,rgba(o.highlight,0)]]);g.fill();
  // A smaller reflected brush mark, separated from the bright rim.
  g.beginPath();move(g,at(.04,.41,f));
  curve(g,at(.12,.34,f),at(.23,.30,f),at(.33,.33,f));
  curve(g,at(.24,.34,f),at(.12,.41,f),at(.075,.45,f));g.closePath();
  g.fillStyle=crossGradient(g,f,.13,.29,.48,[[0,rgba(o.highlight,0)],[.45,rgba(o.highlight,.32)],[1,rgba(o.highlight,0)]]);g.fill();
  g.restore();
}
function brushStroke(g,f,{from,to,q,width,color,alpha,bend=0}){
  const n=Math.max(18,Math.ceil((to-from)*f.span*100)),a=[],b=[];
  for(let i=0;i<=n;i++){
    const v=i/n,u=from+(to-from)*v;
    // A single bowed brush pull, rather than periodic contour noise.
    const center=q+bend*4*v*(1-v)+f.fold*.045*(1-v);
    const w=width*Math.pow(Math.max(0,4*v*(1-v)),.8)*(1-.45*v);
    a.push(at(u,center-w*.5,f));b.push(at(u,center+w*.5,f));
  }
  g.beginPath();move(g,a[0]);a.slice(1).forEach(p=>line(g,p));b.reverse().forEach(p=>line(g,p));g.closePath();
  g.fillStyle=color;g.globalAlpha=f.opacity*f.o.detail*alpha;g.fill();
}
function detail(g,f){
  const {o}=f;g.save();
  // Sparse flow strokes: different widths, lengths and values; no uniform nested color bands.
  for(const stroke of [
    {from:.018,to:.31,q:.51,width:.065,color:o.shadow,alpha:.47,bend:-.08},
    {from:.15,to:.36,q:.27,width:.026,color:o.shadow,alpha:.31,bend:.03},
    {from:.44,to:.69,q:.18,width:.028,color:o.shadow,alpha:.41,bend:.045},
    {from:.015,to:.16,q:.76,width:.027,color:o.shadow,alpha:.52,bend:-.03},
    {from:.07,to:.28,q:.61,width:.035,color:o.highlight,alpha:.35,bend:-.04},
    {from:.17,to:.35,q:.46,width:.022,color:o.highlight,alpha:.36,bend:.025},
    {from:.38,to:.67,q:.31,width:.027,color:o.highlight,alpha:.32,bend:-.02},
  ])brushStroke(g,f,stroke);
  g.restore();
}
export function draw(g,t,input={}){
  const f=sample(t,input),{o}=f;if(!f.active||f.opacity<=0)return;
  if(input.buffer!=='light'){
    baseLayers(g,t,o,{echo:o.layers.echo,body:o.layers.body});
    g.save();clip(g,f);
    if(o.layers.shadow)shadow(g,f);
    if(o.layers.highlight)highlight(g,f);
    if(o.layers.detail)detail(g,f);
    g.restore();
    baseLayers(g,t,o,{tail:o.layers.tail,edge:o.layers.edge});
  }
  if(o.layers.glow&&input.buffer!=='color')baseLayers(g,t,o,{glow:true},'light');
}
export function render(canvas,t,input={},view={}){
  const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,k=Math.min(W/1024,H/768);
  background(g,W,H,view.background??'dark');g.save();g.translate(meta.pivot[0]*k,meta.pivot[1]*k);g.scale(k,k);draw(g,t,input);g.restore();
}
