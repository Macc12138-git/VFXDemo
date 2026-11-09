// Original HD pixelfx authoring study, V3. White point + one readable short wake.
// No soft halo / bloom, external electric ring, smoke, flipbook, or Unity runtime code.
export const meta={name:'赛博能量弹 · 无光晕 / 命中',version:'3.0.2',duration:4,loop:true,fps:60,
  size:[1280,420],origin:[350,220],
  options:{seed:42,radius:14,speed:1200,tailLength:2.8,tailWidth:.63,tailOpacity:1,
    motion:'straight',core:'#f4feff',rim:'#65e5ff',trail:'#2674ff',hitScale:1}};
export const hitMeta={name:'短促能量命中',duration:.2,loop:false,fps:60,size:[256,256],origin:[128,128]};
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n)),out=n=>1-(1-clamp(n))**3;
const rand=(s,i,k=0)=>{const n=Math.sin(s*12.9898+i*78.233+k*37.719)*43758.5453;return n-Math.floor(n);};
const rgba=(hex,a)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${clamp(a)})`;
export const options=input=>({...meta.options,...input,layers:{...input?.layers}});
export function positionAt(t,input={}){const o=options(input);return[t*o.speed,o.motion==='curve'?42*Math.sin(t*TAU/4):0];}
export function sample(t,input={}){
  const o=options(input),phase=((t%4)+4)%4,head=positionAt(phase,o),h=[],r=o.radius;
  for(let i=0;i<=16;i++){
    const u=i/16,age=r*(.45+o.tailLength*u)/o.speed,p=positionAt(phase-age,o),v=positionAt(phase-age+.0001,o),a=Math.atan2(v[1]-p[1],v[0]-p[0]);
    h.push({x:p[0]-head[0],y:p[1]-head[1],nx:-Math.sin(a),ny:Math.cos(a),u,width:r*o.tailWidth*Math.pow(1-u,1.05)});
  }
  return{o,phase,h,pulse:1+.008*Math.sin(phase*TAU*3/4+o.seed*.17)};
}
function polygon(g,pts,fill){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=fill;g.fill();}
function disc(g,r,fill){g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle=fill;g.fill();}
function ribbon(g,h,fill){polygon(g,[...h.map(p=>[p.x+p.nx*p.width,p.y+p.ny*p.width]),...h.slice().reverse().map(p=>[p.x-p.nx*p.width,p.y-p.ny*p.width])],fill);}
export function draw(g,t,input={}){
  const f=sample(t,input),{o,h,pulse}=f,r=o.radius;g.save();g.globalCompositeOperation='source-over';
  if(o.layers.trail!==false){
    const q=g.createLinearGradient(h.at(-1).x,0,h[0].x,0);
    q.addColorStop(0,rgba(o.trail,0));q.addColorStop(.17,rgba(o.trail,.55*o.tailOpacity));q.addColorStop(.48,rgba(o.rim,.93*o.tailOpacity));q.addColorStop(.8,rgba(o.rim,o.tailOpacity));q.addColorStop(1,rgba(o.core,o.tailOpacity));ribbon(g,h,q);
  }
  if(o.layers.core!==false){
    const q=g.createRadialGradient(0,0,r*.2,0,0,r);q.addColorStop(0,o.core);q.addColorStop(.88,o.core);q.addColorStop(.97,rgba(o.core,.98));q.addColorStop(1,rgba(o.core,0));disc(g,r*pulse,q);
  }
  g.restore();return f;
}
export function sampleImpact(t,input={}){
  const o=options(input),r=o.radius*o.hitScale;
  if(t<0||t>=hitMeta.duration)return{o,t,flash:null,shards:[]};
  const flash=t<.085?{scale:(.7+.3*out(t/.012))*(1-.55*clamp(t/.085)),alpha:1-clamp((t-.022)/.063)}:null;
  const shards=[];
  for(let i=0;i<4;i++){
    const delay=.006+i*.002,life=.125+rand(o.seed,i,1)*.055,a=t-delay;if(a<0||a>=life)continue;
    const q=a/life,angle=[-2.55,-1.55,1.7,2.6][i]+(rand(o.seed,i,2)-.5)*.18;
    const d=r*(.3+(1.15+rand(o.seed,i,3)*.5)*out(q));
    shards.push({x:Math.cos(angle)*d,y:Math.sin(angle)*d,angle,length:r*(.58+rand(o.seed,i,4)*.14)*(1-q*.7),width:r*.14*(1-q*.8),alpha:(1-q)**.85});
  }
  return{o,t,flash,shards};
}
// Contact is a separate one-shot; no baked frames, no broad additive light disc.
export function drawImpact(g,t,input={}){
  const f=sampleImpact(t,input),{o,flash,shards}=f,r=o.radius*o.hitScale;
  if(t<0||t>=hitMeta.duration)return f;g.save();g.globalCompositeOperation='source-over';
  if(o.layers.tailFade!==false&&o.layers.trail!==false&&t<.035){const k=1-t/.035;g.save();g.globalAlpha*=k;g.scale(k,Math.sqrt(k));draw(g,.5,{...o,layers:{...o.layers,core:false}});g.restore();}
  if(o.layers.flash!==false&&flash){
    const k=flash.scale,pts=[[0,-r*1.9],[-r*.23,-r*.34],[-r*1.55,0],[-r*.25,r*.3],[0,r*1.45],[r*.2,r*.28],[r*.82,0],[r*.21,-r*.32]].map(p=>p.map(v=>v*k));
    polygon(g,pts,rgba(o.trail,flash.alpha));polygon(g,pts.map(p=>p.map(v=>v*.72)),rgba(o.core,flash.alpha));
  }
  if(o.layers.shards!==false)for(const p of shards){
    g.save();g.translate(p.x,p.y);g.rotate(p.angle);
    const q=g.createLinearGradient(-p.length*.55,0,p.length*.5,0);q.addColorStop(0,rgba(o.trail,p.alpha));q.addColorStop(1,rgba(o.rim,p.alpha));
    polygon(g,[[-p.length*.55,0],[0,-p.width],[p.length*.5,0],[0,p.width]],q);g.restore();
  }
  g.restore();return f;
}
