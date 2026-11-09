// Fresh electrical burst: gathering knot -> branching discharge -> travelling return currents.
// No expanding ring, membrane-front field, animation sheet, or EnergyCluster runtime dependency.
import {Rng} from '../core/math.js';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,u)=>a+(b-a)*u;
const smooth=(a,b,v)=>{const u=clamp((v-a)/(b-a));return u*u*(3-2*u);};
const out=u=>1-Math.pow(1-clamp(u),3),lerp=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
export const meta={id:'hd/energy-burst-v4',name:'电流能量爆炸 · 重设计',version:'4.0',duration:.96,loop:false,fps:60,
 options:{seed:37,radius:180,duration:.96,charge:.15,intensity:1,flow:1,glow:.65,coreColor:'#ffffff',bodyColor:'#2458ff',edgeColor:'#adcaff',glowColor:'#1440ff'}};
export const layerNames=['charge','core','discharge','flow','glow'];
export function options(input={}){return {...meta.options,...input,layers:Object.fromEntries(layerNames.map(k=>[k,input.layers?.[k]??true]))};}
export const backgrounds={original:'#050716',black:'#000000',light:'#dce0e4',warm:'#5f4e41'};
const cache=new Map();
function recipe(seed){
 if(cache.has(seed))return cache.get(seed);
 const r=new Rng(seed),arms=Array.from({length:8},(_,i)=>({angle:i*TAU/8+r.range(-.23,.23),reach:r.range(.65,.94),bend:r.range(-.34,.34),phase:r.range(0,TAU),delay:r.range(0,.032),width:r.range(9,16),jitter:Array.from({length:23},()=>r.range(-1,1))}));
 const forks=arms.flatMap((a,i)=>Array.from({length:2},(_,j)=>({arm:i,root:.32+j*.24+r.range(-.04,.04),turn:(j?1:-1)*r.range(.55,1.05),reach:r.range(.17,.32),phase:r.range(0,TAU),width:r.range(2.1,4.2)})));
 const scatter=Array.from({length:25},(_,i)=>({arm:i%8,root:r.range(.30,.87),born:r.range(.10,.39),life:r.range(.11,.24),turn:r.range(-1.1,1.1),reach:r.range(.07,.16),phase:r.range(0,TAU)}));
 const result={arms,forks,scatter};cache.set(seed,result);return result;
}
const bound=(p,R)=>{const d=Math.hypot(...p),k=d>R*.92?R*.92/d:1;return p.map(v=>v*k);};
function armPoints(a,R,t){
 return Array.from({length:23},(_,i)=>{
  const u=i/22,angle=a.angle+a.bend*Math.sin(u*Math.PI)+.15*Math.sin(u*8+a.phase),rad=R*(.025+a.reach*u);
  const jig=R*.047*a.jitter[i]*Math.sin(Math.PI*u)+R*.010*Math.sin(t*62+i*2.9+a.phase)*Math.sin(Math.PI*u);
  return bound([Math.cos(angle)*rad-Math.sin(angle)*jig,Math.sin(angle)*rad+Math.cos(angle)*jig],R);
 });
}
function at(points,u){const q=clamp(u)*(points.length-1),i=Math.min(points.length-2,Math.floor(q));return lerp(points[i],points[i+1],q-i);}
function slice(points,lo,hi){
 lo=clamp(lo);hi=clamp(hi);if(hi<=lo)return [];
 const n=points.length-1,pts=[at(points,lo)];for(let i=Math.floor(lo*n)+1;i<hi*n;i++)pts.push(points[i]);pts.push(at(points,hi));return pts;
}
function forkPoints(root,angle,reach,phase,time,R){
 return Array.from({length:8},(_,j)=>{const u=j/7,a=angle+.20*Math.sin(u*3+phase),z=R*.020*Math.sin(j*2.8+phase+time*42)*Math.sin(Math.PI*u);
  return bound([root[0]+Math.cos(a)*reach*u-Math.sin(a)*z,root[1]+Math.sin(a)*reach*u+Math.cos(a)*z],R);});
}
export function phase(time,input={}){const o=options(input),t=time*meta.duration/o.duration,a=t-o.charge;return time>=o.duration?'完全消散':t<o.charge?'高光聚集':a<.09?'电流爆发':a<.30?'分叉扩散':a<.60?'路径窜流':'断裂消散';}
export function createFrame(time,input={}){
 const o=options(input),f={paths:[],blobs:[],phase:phase(time,o),time,options:o};
 if(time<=0||time>=o.duration||o.intensity<=0)return f;
 const t=time*meta.duration/o.duration,a=t-o.charge,R=o.radius,S=R/180,b=recipe(o.seed);
 const path=(pts,width,alpha,hot,layer)=>{if(pts.length>1&&alpha>.002&&o.layers[layer])f.paths.push({points:pts,width,alpha:clamp(alpha*o.intensity),hot:clamp(hot),layer});};
 const blob=(x,y,r,alpha,hot,layer)=>{if(r>0&&alpha>.002&&o.layers[layer])f.blobs.push({x,y,r,alpha:clamp(alpha*o.intensity),hot,layer});};
 if(t<o.charge+.045){
  const q=clamp(t/o.charge),fade=smooth(0,.018,t)*(1-smooth(o.charge,o.charge+.045,t));
  const r=mix(62,28,out(q))*S;
  blob(0,0,r,fade*(.60+.35*q),.18+.40*q,'charge');
  blob(-r*.08,-r*.1,r*(.12+.70*q),fade*(.35+.65*q*q),1,'charge');
  for(let i=0;i<6;i++){
  const aa=b.arms[i].angle,head=mix(70,9,out(q)),tail=head+21*(1-q*.65),pts=[];
   for(let j=0;j<7;j++){const u=j/6,d=mix(tail,head,u)*S,theta=aa+.26*Math.sin(u*2+i+t*7),k=Math.sin(j*3.1+i)*4*S;
    pts.push([Math.cos(theta)*d-Math.sin(theta)*k,Math.sin(theta)*d+Math.cos(theta)*k]);}
   path(pts,(1.0+1.5*q)*S,fade*.85,.5+.5*q,'charge');
  }
 }
 const flash=smooth(-.010,.004,a)*(1-smooth(.025,.105,a));
 blob(0,0,(24+30*out(clamp(a/.028)))*S,flash,.72,'core');
 blob(-2*S,-3*S,(13+15*out(clamp(a/.020)))*S,flash,1,'core');
 if(a<=0)return f;
 const full=b.arms.map(arm=>armPoints(arm,R,a));
 for(const [i,arm]of b.arms.entries()){
  const age=a-arm.delay;if(age<=0)continue;
  const head=out(age/.245),tail=smooth(.22,.55,age)*.88,fade=smooth(0,.012,age)*(1-smooth(.26,.58,age));
  const pulse=.72+.28*Math.sin(age*73+i*2.4);
  path(slice(full[i],tail,head),arm.width*S*(1-.30*head),fade*pulse,.87,'discharge');
  // A moving hot packet visibly travels from the gathering knot out to the fork tips.
  const packet=clamp(age/.25);
  path(slice(full[i],Math.max(tail,packet-.16),Math.min(head,packet+.035)),arm.width*S*.90,fade,.98,'discharge');
 }
 for(const fork of b.forks){
  const arm=b.arms[fork.arm],age=a-arm.delay-fork.root*.10;if(age<=0)continue;
  const root=at(full[fork.arm],fork.root),angle=arm.angle+fork.turn;
  const pts=forkPoints(root,angle,R*fork.reach,fork.phase,a,R),head=out(age/.18),tail=smooth(.21,.45,age)*.9;
  const fade=smooth(0,.014,age)*(1-smooth(.18,.46,age));
  path(slice(pts,tail,head),fork.width*S,fade*(.66+.34*Math.sin(a*64+fork.phase)),.85,'discharge');
 }
 // Folded, open local discharges travel out with the leading energy. These are
 // short branching curls, never a circular perimeter or a closed shock ring.
 for(let i=0;i<5;i++){
  const arm=b.arms[(i*3)%8],age=a-.018-i*.009;if(age<=0||age>.35)continue;
  const q=out(age/.23),root=at(full[(i*3)%8],.12+q*.50),pts=[];
  for(let j=0;j<9;j++){
   const u=j/8,theta=arm.angle-1.1+u*2.4,rr=R*(.035+.10*q)*(1-.48*u),zig=1+.17*Math.sin(j*2.5+arm.phase+a*35);
   pts.push(bound([root[0]+Math.cos(theta)*rr*zig,root[1]+Math.sin(theta)*rr*zig],R));
  }
  path(pts,(2.8+Math.sin(i)*.7)*S,smooth(0,.025,age)*(1-smooth(.14,.35,age))*.75,.95,'discharge');
 }
 if(o.flow>0)for(const [i,s]of b.scatter.entries()){
  const age=a-s.born;if(age<=0||age>=s.life)continue;
  const q=age/s.life,arm=b.arms[s.arm],travel=clamp(s.root+q*.18),root=at(full[s.arm],travel);
  const pts=forkPoints(root,arm.angle+s.turn,R*s.reach,s.phase,a,R),tail=clamp((q-.42)*1.6),head=out(q*2);
  const fade=smooth(0,.06,q)*(1-smooth(.48,1,q))*(.68+.32*Math.sin(a*91+s.phase))*o.flow;
  path(slice(pts,tail,head),(1.7+.65*Math.sin(i))*S,fade,.98,'flow');
  // Return current runs over a short section of the original expansion route.
  path(slice(full[s.arm],Math.max(.05,travel-.18),travel+.05),3.2*S,fade*.90,.98,'flow');
 }
 return f;
}
const rgba=(hex,a)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return `rgba(${c},${clamp(a)})`;};
function channel(g,p,color,width,alpha){
 if(alpha<.002||p.points.length<2)return;
 g.lineJoin='bevel';g.lineCap='round';g.strokeStyle=rgba(color,alpha*p.alpha);
 const n=p.points.length-1;
 for(let i=0;i<n;i++){
  const u=(i+.5)/n,taper=(.34+.66*Math.sin(Math.PI*(.10+.84*u)))*(1-.58*u),grain=.78+.22*Math.sin(i*2.37+p.points[0][0]);
  g.lineWidth=Math.max(.22,width*p.width*taper*grain);
  g.beginPath();g.moveTo(...p.points[i]);g.lineTo(...p.points[i+1]);g.stroke();
 }
}
export function renderFrame(canvas,frame,view={}){
 const g=canvas.getContext('2d'),o=frame.options,scale=view.scale??1;g.resetTransform();g.globalCompositeOperation='source-over';g.clearRect(0,0,canvas.width,canvas.height);
 if(!view.transparent){if(view.background==='checker'){for(let y=0;y<canvas.height;y+=16)for(let x=0;x<canvas.width;x+=16){g.fillStyle=((x+y)/16)%2?'#223445':'#142130';g.fillRect(x,y,16,16);}}
  else{g.fillStyle=backgrounds[view.background??'original'];g.fillRect(0,0,canvas.width,canvas.height);}}
 g.save();g.translate(canvas.width/2,canvas.height/2);g.scale(scale,scale);
 if(o.layers.glow&&o.glow>0){g.globalCompositeOperation='lighter';
  for(const p of frame.paths)channel(g,p,o.glowColor,3.8,.13*o.glow);
  for(const b of frame.blobs){const r=b.r*2.0,gr=g.createRadialGradient(b.x,b.y,0,b.x,b.y,r);gr.addColorStop(0,rgba(o.glowColor,b.alpha*.65*o.glow));gr.addColorStop(1,rgba(o.glowColor,0));g.fillStyle=gr;g.beginPath();g.arc(b.x,b.y,r,0,TAU);g.fill();}
 }
 g.globalCompositeOperation='source-over';
 for(const b of frame.blobs){const gr=g.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);gr.addColorStop(0,rgba(o.coreColor,b.alpha));gr.addColorStop(Math.min(.70,b.hot),rgba(b.hot>.9?o.coreColor:o.edgeColor,b.alpha));gr.addColorStop(.82,rgba(o.bodyColor,b.alpha*.84));gr.addColorStop(1,rgba(o.bodyColor,0));g.fillStyle=gr;g.beginPath();g.arc(b.x,b.y,b.r,0,TAU);g.fill();}
 for(const p of frame.paths){channel(g,p,o.bodyColor,1.5,.84);channel(g,p,o.edgeColor,.95,.96);channel(g,p,o.coreColor,.60,p.hot);}
 g.restore();
}
export function createRenderer(canvas){return {render(time,input={},view={}){renderFrame(canvas,createFrame(time,input),view);},info:{renderer:'Canvas 2D / live branching geometry / NO RING / not Unity',unity:false}};}
