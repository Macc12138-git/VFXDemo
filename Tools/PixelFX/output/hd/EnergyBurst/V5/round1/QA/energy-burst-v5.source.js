// Round volumetric energy explosion. Electricity is a subordinate passing detail.
// Original authoring geometry/material; no runtime dependency on any older burst or EnergyCluster.
import {Rng,tileFbm} from '../core/math.js';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const out=v=>1-Math.pow(1-clamp(v),3),rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export const meta={id:'hd/energy-burst-v5',name:'圆形能量爆炸 · 电流内流',version:'5.0',duration:1.02,loop:false,fps:60,
 options:{seed:37,radius:180,duration:1.02,charge:.14,strength:1,body:1,electric:1,glow:.65,hotColor:'#ffffff',bodyColor:'#2458ff',edgeColor:'#a7c6ff',electricColor:'#f1f6ff',glowColor:'#1440ff'}};
export const layerNames=['charge','flash','volume','folds','electric','glow'];
export const backgrounds={original:[5,7,22],black:[0,0,0],light:[220,224,228],checker:null,warm:[95,78,65]};
export function options(input={}){return {...meta.options,...input,layers:Object.fromEntries(layerNames.map(k=>[k,input.layers?.[k]??true]))};}
export function prepare(input={}){const o=options(input);return {...o,hot:rgb(o.hotColor),blue:rgb(o.bodyColor),edge:rgb(o.edgeColor),light:rgb(o.glowColor)};}
export function state(time,input={}){
 const o=options(input),t=time*meta.duration/o.duration,a=t-o.charge,R=o.radius,S=R/180,q=clamp(t/o.charge),isCharge=a<0;
 const expand=out(a/.36),radius=isCharge?mix(64,34,out(q))*S:mix(34*S,R*.91,expand);
 const gather=smooth(0,.018,t),fade=isCharge?gather:1-smooth(.30,.80,a);
 return {t,a,q,isCharge,radius,expand,fade,alive:time>0&&time<o.duration,phase:time>=o.duration?'完全消散':isCharge?'高光聚集':a<.065?'圆形能量爆发':a<.29?'能量团向四周扩张':a<.55?'内部窜流与破碎':'余能消散'};
}
export const phase=(time,input={})=>state(time,input).phase;
let noiseData;
export function makeNoise(){
 if(noiseData)return noiseData;const d=new Uint8Array(128*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;d[i]=(tileFbm(x/16,y/16,8,8,123,3)*.5+.5)*255;d[i+1]=(tileFbm(x/8+3,y/8+5,16,16,411,2)*.5+.5)*255;d[i+2]=(tileFbm(x/4,y/4,32,32,75,2)*.5+.5)*255;d[i+3]=255;}
 return noiseData=d;
}
export function noiseSampler(d=makeNoise()){
 return (x,y,c=0)=>{x=((x%1+1)%1)*128-.5;y=((y%1+1)%1)*128-.5;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const at=(a,b)=>d[(((b%128+128)%128)*128+(a%128+128)%128)*4+c]/255;
 return mix(mix(at(ix,iy),at(ix+1,iy),fx),mix(at(ix,iy+1),at(ix+1,iy+1),fx),fy);};
}
// Display-RGB premultiplied coverage plus independent additive light. Authoring, not Unity linear light.
export function field(x,y,s,o,noise){
 const empty={c:[0,0,0],a:0,l:[0,0,0]};if(!s.alive||o.strength<=0||Math.hypot(x,y)>o.radius*1.08)return empty;
 const px=x/s.radius,py=y/s.radius,r0=Math.hypot(px,py),theta=Math.atan2(py,px),seed=o.seed*.013;
 const n0=noise(px*.28+seed+s.t*.065,py*.28+.31-s.t*.047),n1=noise(px*.40+.51-s.t*.045,py*.40+seed+s.t*.06,1);
 const wx=px+(n0-.5)*.24,wy=py+(n1-.5)*.24;
 const n=noise(wx*.38+.13+seed+s.t*.04,wy*.38+.53-s.t*.06),fine=noise(wx*.60+.43-s.t*.09,wy*.60+.11+s.t*.08,1);
 const contour=1+.018*Math.sin(theta*5+seed)+.014*Math.sin(theta*9-seed)+.065*(n0-.5),r=r0/contour;
 const inside=1-smooth(.984,1.012,r);if(inside<=0&&r>1.18)return empty;
 let a=0,c=[0,0,0],l=[0,0,0];
 const over=(alpha,col)=>{alpha=clamp(alpha*o.strength);c=c.map((v,k)=>v*(1-alpha)+col[k]*alpha);a=a*(1-alpha)+alpha;};
 const add=(v)=>{for(let k=0;k<3;k++)l[k]+=v*o.light[k]*o.glow*o.strength;};
 const gather=smooth(0,.018,s.t),burstAge=Math.max(0,s.a);
 if(s.isCharge){
  if(o.layers.charge){
   const core=(1-smooth(.10+.12*s.q,.38+.18*s.q,r0))*gather;
   const folds=(1-smooth(.018,.065,Math.abs(n-.51)))*inside;
   over(inside*gather*(.48+.2*s.q),o.blue);over(folds*gather*.40,o.edge);over(core*(.52+.48*s.q),o.hot);
  }
  if(o.layers.glow)add(Math.exp(-r0*r0*2.8)*gather*.7);
 }else{
  const erosion=smooth(.12,.37,burstAge),cut=.28+.29*smooth(.16,.65,burstAge)+.17*smooth(.50,.81,burstAge);
  const keep=mix(1,smooth(cut-.045,cut+.045,n*.72+fine*.28),erosion),fade=s.fade;
  const depth=.32+.34*Math.pow(Math.max(0,1-r),.5)+.16*n;
  if(o.layers.volume)over(inside*keep*fade*depth*o.body,o.blue.map((v,k)=>mix(v,o.edge[k],.10+.12*(1-r))));
  if(o.layers.folds){
   const marble=n+.065*Math.sin(wx*3-wy*2-s.t*7),ridge=1-smooth(.018,.057,Math.abs(marble-.53));
   const edge=Math.exp(-Math.pow((r-.973)/.017,2))*(.25+.75*smooth(.36,.60,n));
   const fold=ridge*inside*smooth(.12,.32,r)*(1-smooth(.88,1.02,r));
   const heat=clamp(.38+ridge*.58+edge*.85);
   over((fold*.83+edge*.88)*keep*fade,o.blue.map((v,k)=>mix(v,o.hot[k],heat)));
  }
  if(o.layers.flash){
   const flash=(1-smooth(.025,.115,burstAge))*smooth(0,.009,burstAge),core=(1-smooth(.14,.45,r0))*flash;
   over(core,o.hot);if(o.layers.glow)add(Math.exp(-r0*r0*4)*flash*.6);
  }
  if(o.layers.glow)add((Math.exp(-Math.pow(r0,4)*1.8)*inside*.34+Math.exp(-Math.pow((r-1)/.10,2))*.13)*keep*fade);
 }
 const bound=1-smooth(o.radius*.99,o.radius*1.06,Math.hypot(x,y));
 return {c:c.map(v=>v*bound),a:a*bound,l:l.map(v=>v*bound)};
}
const recipeCache=new Map();
function recipe(seed){
 if(recipeCache.has(seed))return recipeCache.get(seed);const r=new Rng(seed);
 const arcs=Array.from({length:30},(_,i)=>({angle:r.range(0,TAU),born:r.range(.035,.44),life:r.range(.10,.21),rad:i%3===0?r.range(.35,.73):r.range(.79,1.01),span:r.range(.22,.56),turn:r.range(-.18,.18),width:r.range(1.0,2.0),phase:r.range(0,TAU),zig:Array.from({length:11},()=>r.range(-1,1))}));
 recipeCache.set(seed,arcs);return arcs;
}
export function electricPaths(time,input={}){
 const o=options(input),s=state(time,o);if(!s.alive||!o.layers.electric||o.electric<=0)return [];
 const paths=[],S=o.radius/180;
 if(s.isCharge){for(let i=0;i<5;i++){const aa=i*TAU/5+s.t*.8,rr=s.radius*(1+.12*Math.sin(i*3+s.t*15));paths.push({points:Array.from({length:8},(_,j)=>{const a=aa+j*.055;return [Math.cos(a)*(rr+Math.sin(j*3+i)*2*S),Math.sin(a)*(rr+Math.sin(j*3+i)*2*S)];}),width:1.25*S,alpha:smooth(0,.035,s.t)*.55*o.electric});}return paths;}
 for(const [i,p] of recipe(o.seed).entries()){
  const age=s.a-p.born;if(age<=0||age>=p.life)continue;const q=age/p.life;
  const rad=Math.min(o.radius*.97,s.radius*p.rad+q*o.radius*.025),head=clamp(q*2.4),tail=clamp((q-.38)*1.6),pts=[];
  for(let j=0;j<=10;j++){const u=mix(tail,head,j/10),a=p.angle+(u-.5)*p.span+s.a*p.turn,rr=rad+S*(3.7*p.zig[j]+1.7*Math.sin(j*2.1+s.t*63+p.phase));pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
  const alpha=smooth(0,.06,q)*(1-smooth(.50,1,q))*(.8+.2*Math.sin(s.t*82+p.phase))*o.electric*(1-smooth(.50,.85,s.a));
  paths.push({points:pts,width:p.width*S,alpha});
  if(i%4===0){const root=pts[5],aa=Math.atan2(root[1],root[0])+p.span*.6;paths.push({points:Array.from({length:6},(_,j)=>{const d=j*S*3.2,a=aa+j*.12;return [root[0]-Math.cos(a)*d+Math.sin(j*2.5)*S*2,root[1]-Math.sin(a)*d];}),width:p.width*S*.68,alpha:alpha*.6});}
 }
 return paths;
}
const rgba=(hex,a)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return `rgba(${c},${clamp(a)})`;};
export function drawElectric(canvas,time,input={},view={}){
 const o=options(input),g=canvas.getContext('2d');g.save();g.translate(canvas.width/2,canvas.height/2);g.scale(view.scale??1,view.scale??1);g.lineJoin='bevel';g.lineCap='round';
 for(const p of electricPaths(time,o))for(const [color,w,alpha]of [[o.glowColor,4.4,.16*(o.layers.glow?o.glow:0)],[o.bodyColor,2.2,.6],[o.electricColor,1,1]]){
  g.strokeStyle=rgba(color,p.alpha*alpha*o.strength);g.lineWidth=p.width*w;g.beginPath();p.points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
 }g.restore();
}
export function renderCPU(canvas,time,input={},view={}){
 const o=prepare(input),s=state(time,o),noise=noiseSampler(),g=canvas.getContext('2d'),im=g.createImageData(canvas.width,canvas.height),scale=view.scale??1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const f=field((x+.5-canvas.width/2)/scale,(y+.5-canvas.height/2)/scale,s,o,noise),i=(y*canvas.width+x)*4;
  if(view.transparent){const alpha=clamp(Math.max(f.a,...f.l));for(let k=0;k<3;k++)im.data[i+k]=alpha?clamp((f.c[k]+f.l[k])/alpha)*255:0;im.data[i+3]=alpha*255;}
  else{const bg=view.background==='checker'?((Math.floor(x/16)+Math.floor(y/16))%2?[34,52,69]:[20,33,48]):backgrounds[view.background??'original'];for(let k=0;k<3;k++)im.data[i+k]=clamp(bg[k]/255*(1-f.a)+f.c[k]+f.l[k])*255;im.data[i+3]=255;}
 }g.putImageData(im,0,0);drawElectric(canvas,time,o,view);
}
const vs='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
const fs=`precision highp float;
uniform vec2 resolution;uniform sampler2D noiseMap;uniform float time,duration,radius,charge,strength,body,glow,seed,scale,background;
uniform vec3 hotColor,bodyColor,edgeColor,glowColor;uniform vec4 layers;uniform vec2 otherLayers;
vec3 c=vec3(0.),light=vec3(0.);float alpha=0.;
void over(float a,vec3 col){a=clamp(a*strength,0.,1.);c=c*(1.-a)+col*a;alpha=alpha*(1.-a)+a;}
void add(float v){light+=v*glowColor*glow*strength;}
void main(){vec2 q=(gl_FragCoord.xy-resolution*.5)/scale;q.y=-q.y;float t=time*1.02/duration,a=t-charge,R=radius,S=R/180.,cq=clamp(t/charge,0.,1.);
vec3 bg=vec3(5.,7.,22.)/255.;if(background>.5&&background<1.5)bg=vec3(0.);if(background>1.5&&background<2.5)bg=vec3(220.,224.,228.)/255.;
if(background>2.5&&background<3.5)bg=mix(vec3(20.,33.,48.),vec3(34.,52.,69.),mod(floor(gl_FragCoord.x/16.)+floor((resolution.y-gl_FragCoord.y)/16.),2.))/255.;if(background>3.5)bg=vec3(95.,78.,65.)/255.;
if(time<=0.||time>=duration||length(q)>R*1.08||strength<=0.){gl_FragColor=vec4(bg,1.);return;}
bool gathering=a<0.;float expand=1.-pow(1.-clamp(a/.36,0.,1.),3.),rad=gathering?mix(64.,34.,1.-pow(1.-cq,3.))*S:mix(34.*S,R*.91,expand),fade=gathering?smoothstep(0.,.018,t):1.-smoothstep(.30,.80,a);
vec2 p=q/rad;float r0=length(p),theta=atan(p.y,p.x),sd=seed*.013;
float n0=texture2D(noiseMap,p*.28+vec2(sd+t*.065,.31-t*.047)).r,n1=texture2D(noiseMap,p*.40+vec2(.51-t*.045,sd+t*.06)).g;
vec2 w=p+vec2(n0-.5,n1-.5)*.24;
float n=texture2D(noiseMap,w*.38+vec2(.13+sd+t*.04,.53-t*.06)).r,fine=texture2D(noiseMap,w*.60+vec2(.43-t*.09,.11+t*.08)).g;
float contour=1.+.018*sin(theta*5.+sd)+.014*sin(theta*9.-sd)+.065*(n0-.5),r=r0/contour,inside=1.-smoothstep(.984,1.012,r),gather=smoothstep(0.,.018,t),ba=max(0.,a);
if(gathering){if(layers.x>.5){float core=(1.-smoothstep(.10+.12*cq,.38+.18*cq,r0))*gather,folds=(1.-smoothstep(.018,.065,abs(n-.51)))*inside;
over(inside*gather*(.48+.2*cq),bodyColor);over(folds*gather*.40,edgeColor);over(core*(.52+.48*cq),hotColor);}if(otherLayers.y>.5)add(exp(-r0*r0*2.8)*gather*.7);
}else{
float erosion=smoothstep(.12,.37,ba),cut=.28+.29*smoothstep(.16,.65,ba)+.17*smoothstep(.50,.81,ba),keep=mix(1.,smoothstep(cut-.045,cut+.045,n*.72+fine*.28),erosion),depth=.32+.34*pow(max(0.,1.-r),.5)+.16*n;
if(layers.z>.5)over(inside*keep*fade*depth*body,mix(bodyColor,edgeColor,.10+.12*(1.-r)));
if(layers.w>.5){float marble=n+.065*sin(w.x*3.-w.y*2.-t*7.),ridge=1.-smoothstep(.018,.057,abs(marble-.53)),edge=exp(-pow((r-.973)/.017,2.))*(.25+.75*smoothstep(.36,.60,n));
float fold=ridge*inside*smoothstep(.12,.32,r)*(1.-smoothstep(.88,1.02,r)),heat=clamp(.38+ridge*.58+edge*.85,0.,1.);over((fold*.83+edge*.88)*keep*fade,mix(bodyColor,hotColor,heat));}
if(layers.y>.5){float flash=(1.-smoothstep(.025,.115,ba))*smoothstep(0.,.009,ba),core=(1.-smoothstep(.14,.45,r0))*flash;over(core,hotColor);if(otherLayers.y>.5)add(exp(-r0*r0*4.)*flash*.6);}
if(otherLayers.y>.5)add((exp(-pow(r0,4.)*1.8)*inside*.34+exp(-pow((r-1.)/.10,2.))*.13)*keep*fade);
}
float bound=1.-smoothstep(R*.99,R*1.06,length(q));gl_FragColor=vec4(clamp(bg*(1.-alpha*bound)+c*bound+light*bound,0.,1.),1.);}`;
export function createWebGL(canvas){
 const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
 const gl=surface.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL 不可用');
 const shader=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
 const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,128,128,0,gl.RGBA,gl.UNSIGNED_BYTE,makeNoise());
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 const names=['resolution','time','duration','radius','charge','strength','body','glow','seed','scale','background','hotColor','bodyColor','edgeColor','glowColor','layers','otherLayers'];
 const loc=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)])),g=canvas.getContext('2d');
 return {render(time,input={},view={}){const o=prepare(input);gl.viewport(0,0,surface.width,surface.height);gl.uniform2f(loc.resolution,surface.width,surface.height);gl.uniform1f(loc.time,time);
 for(const k of ['duration','radius','charge','strength','body','glow','seed'])gl.uniform1f(loc[k],o[k]);gl.uniform1f(loc.scale,view.scale??1);gl.uniform1f(loc.background,{original:0,black:1,light:2,checker:3,warm:4}[view.background??'original']);
 gl.uniform4f(loc.layers,+o.layers.charge,+o.layers.flash,+o.layers.volume,+o.layers.folds);gl.uniform2f(loc.otherLayers,+o.layers.electric,+o.layers.glow);
 for(const k of ['hotColor','bodyColor','edgeColor','glowColor'])gl.uniform3fv(loc[k],rgb(o[k]));gl.drawArrays(gl.TRIANGLES,0,6);g.drawImage(surface,0,0);drawElectric(canvas,time,o,view);
 },info:{renderer:'WebGL round energy volume + Canvas secondary currents / authoring only',unity:false}};
}
