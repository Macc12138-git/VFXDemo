// V2: only the white-hot center of the author's GIF, not its large exterior electric ring.
// A compact round core, one short wake and a tight additive halo. Original procedural art.
export const meta={name:'赛博能量弹 · 白热核心',version:'2.0.2',duration:4,loop:true,fps:60,
  size:[1280,420],origin:[770,210],options:{seed:42,radius:14,speed:1200,tailLength:2.4,glow:.65,
    motion:'straight',core:'#f4feff',rim:'#48caff',trail:'#2264ff'}};
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n));
const rgba=(hex,a)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${clamp(a)})`;
export const options=input=>({...meta.options,...input,layers:{...input?.layers}});
export function positionAt(t,input={}){const o=options(input);return[t*o.speed,o.motion==='curve'?42*Math.sin(t*TAU/4):0];}
export function sample(t,input={}){
  const o=options(input),phase=((t%4)+4)%4,head=positionAt(phase,o),r=o.radius;
  const h=[];
  for(let i=0;i<=16;i++){
    const u=i/16,age=r*(.5+o.tailLength*u)/o.speed,p=positionAt(phase-age,o),v=positionAt(phase-age+.0001,o);
    const a=Math.atan2(v[1]-p[1],v[0]-p[0]);
    h.push({x:p[0]-head[0],y:p[1]-head[1],nx:-Math.sin(a),ny:Math.cos(a),u,width:r*.47*Math.pow(1-u,1.25)});
  }
  return{o,phase,h,pulse:1+.012*Math.sin(phase*TAU*3/4+o.seed*.17)};
}
function disc(g,r,fill){g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle=fill;g.fill();}
function ribbon(g,h,fill){
  g.beginPath();for(let i=0;i<h.length;i++){const p=h[i],x=p.x+p.nx*p.width,y=p.y+p.ny*p.width;i?g.lineTo(x,y):g.moveTo(x,y);}
  for(let i=h.length-1;i>=0;i--){const p=h[i];g.lineTo(p.x-p.nx*p.width,p.y-p.ny*p.width);}g.closePath();g.fillStyle=fill;g.fill();
}
// Caller owns clear/transform. No particles, noise texture, external arcs, packet sparks, or flipbooks.
export function draw(g,t,input={}){
  const f=sample(t,input),{o,h,pulse}=f,r=o.radius,L=o.layers,buffer=o.buffer??'combined';g.save();
  if(buffer!=='light'){
    g.globalCompositeOperation='source-over';
    if(L.trail!==false){
      const q=g.createLinearGradient(h.at(-1).x,0,h[0].x,0);
      q.addColorStop(0,rgba(o.trail,0));q.addColorStop(.3,rgba(o.trail,.16));q.addColorStop(.75,rgba(o.rim,.65));q.addColorStop(1,rgba(o.core,.93));ribbon(g,h,q);
    }
    if(L.core!==false){
      const q=g.createRadialGradient(0,0,r*.25,0,0,r);
      q.addColorStop(0,o.core);q.addColorStop(.8,o.core);q.addColorStop(.92,rgba(o.core,.98));q.addColorStop(1,rgba(o.core,0));disc(g,r*pulse,q);
    }
  }
  if(buffer!=='color'&&L.glow!==false&&o.glow>0&&L.core!==false){
    g.globalCompositeOperation='lighter';
    const q=g.createRadialGradient(0,0,r*.25,0,0,r*2.5);
    q.addColorStop(0,rgba(o.rim,.5*o.glow));q.addColorStop(.37,rgba(o.rim,.34*o.glow));q.addColorStop(.6,rgba(o.trail,.22*o.glow));q.addColorStop(1,rgba(o.trail,0));disc(g,r*2.5,q);
  }
  g.restore();return f;
}
