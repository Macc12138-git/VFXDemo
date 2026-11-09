// Independently authored one-shot. No dependency on the EnergyCluster animation or its textures.
// pixelfx provides deterministic RNG/tile noise; shape and release choreography are new.
import {Rng,tileFbm} from '../core/math.js';
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export const meta={id:'hd/energy-burst',name:'湛蓝能量爆炸',version:'1.0-r1',duration:.82,loop:false,fps:60,
 options:{seed:37,radius:180,duration:.82,initialSize:28,strength:1,glow:.65,
 hotColor:'#f8fcff',bodyColor:'#235fff',edgeColor:'#75caff',glowColor:'#164bff'}};
export const layerNames=['flash','front','shards','rays','glow'];
export const backgrounds={original:[5,7,22],black:[0,0,0],light:[220,224,228],warm:[95,78,65]};
export function options(input={}){return {...meta.options,...input,layers:Object.fromEntries(layerNames.map(k=>[k,input.layers?.[k]??true]))};}
export function prepare(input={}){
 const o=options(input),rng=new Rng(o.seed);
 const petals=Array.from({length:10},(_,i)=>[(i+.15+rng.range(-.25,.25))/10*TAU,rng.range(0,TAU),rng.range(.66,.95),rng.range(.65,1)]);
 return {...o,hot:rgb(o.hotColor),body:rgb(o.bodyColor),edge:rgb(o.edgeColor),light:rgb(o.glowColor),petals};
}
let noiseCache;
export function makeNoise(){
 if(noiseCache)return noiseCache;
 const data=new Uint8Array(256*256*4);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4;
  data[i]=(tileFbm(x/256*8,y/256*8,8,8,137,3)*.5+.5)*255;
  data[i+1]=(tileFbm(x/256*18+3,y/256*18+5,18,18,71,2)*.5+.5)*255;
  data[i+2]=(tileFbm(x/256*32,y/256*32,32,32,211,2)*.5+.5)*255;
  data[i+3]=255;
 }
 noiseCache=data;return data;
}
export function noiseSampler(data=makeNoise()){
 return (x,y,k=0)=>{
  const xx=((x%1+1)%1)*256-.5,yy=((y%1+1)%1)*256-.5,ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;
  const at=(a,b)=>data[(((b%256+256)%256)*256+(a%256+256)%256)*4+k]/255;
  return mix(mix(at(ix,iy),at(ix+1,iy),fx),mix(at(ix,iy+1),at(ix+1,iy+1),fx),fy);
 };
}
export function phase(time,input={}){
 const o=options(input),u=time/o.duration;
 return time<0?'未播放':time>=o.duration?'已消散':u<.12?'核心爆发':u<.43?'能量扩散':'破碎消散';
}
// Return premultiplied color, coverage and additive light separately, in authoring display RGB.
export function field(x,y,time,o,noise){
 const empty={c:[0,0,0],a:0,l:[0,0,0]};
 if(time<=0||time>=o.duration||o.strength<=0)return empty;
 const u=time/o.duration,r=Math.hypot(x,y),R=o.radius;
 if(r>=R*1.08)return empty;
 const qx=x/R,qy=y/R,theta=Math.atan2(y,x),start=Math.min(o.initialSize,R*.32);
 const grow=(1-Math.exp(-6*clamp(u/.86)))/(1-Math.exp(-6));
 const rad=start+(R*.94-start)*grow;
 const n=noise(qx*.43+.173+u*.055,qy*.43+.37-u*.031,0);
 const detail=noise(qx*.71+.51-u*.045,qy*.71+.19,1);
 const warp=.94+.035*Math.sin(theta*3+1.8)+.018*Math.sin(theta*7-.4)+.07*(n-.5);
 const front=rad*warp,width=R*(.13-.08*smooth(.05,.75,u));
 const d=(r-front)/Math.max(1,width);
 const cut=.18+.62*smooth(.12,.9,u);
 const keep=smooth(cut-.055,cut+.055,detail);
 const band=smooth(-1.25,-.93,d)*(1-smooth(-.02,.13,d));
 const frontFade=smooth(0,.025,u)*(1-smooth(.40,.86,u));
 let a=0,c=[0,0,0],light=[0,0,0];
 const over=(alpha,col)=>{alpha=clamp(alpha*o.strength);c=c.map((v,k)=>v*(1-alpha)+col[k]*alpha);a=a*(1-alpha)+alpha;};
 const add=(v,col)=>{for(let k=0;k<3;k++)light[k]+=v*col[k]*o.glow*o.strength;};
 if(o.layers.front){
  const rim=Math.exp(-Math.pow((d+.10)*12,2));
  const inner=Math.exp(-Math.pow((d+.96)*16,2));
  const heat=clamp(rim*.95+inner*.65+smooth(.62,.8,n)*.6);
  over(band*keep*frontFade*.92,o.body.map((v,k)=>mix(v,o.hot[k],heat)));
  if(o.layers.glow)add(Math.exp(-d*d*1.2)*keep*frontFade*.28,o.light);
 }
 if(o.layers.shards){
  for(let i=0;i<10;i++){
   const [angle,ph,reach,life]=o.petals[i],p=clamp((u-.012*(i%3))/life);
   if(p<=0||p>=1)continue;
   const g=(1-Math.exp(-7*p))/(1-Math.exp(-7));
   const aa=angle+.12*Math.sin(ph+p*2),ca=Math.cos(aa),sa=Math.sin(aa);
   const center=start*.6+(R*reach*.84-start*.6)*g;
   const len=R*(.13+.05*Math.sin(ph))*(1-smooth(.13,.9,p));
   const lx=(x*ca+y*sa-center)/Math.max(1,len);
   if(Math.abs(lx)>1.2)continue;
   const w=R*(.035+.018*Math.cos(ph))*(1-smooth(.18,.9,p));
   const ly=(-x*sa+y*ca-Math.sin(lx*2+ph+p*3)*w*.7)/Math.max(.6,w);
   if(Math.abs(ly)>2)continue;
   const sd=Math.abs(ly)+Math.pow(Math.abs(lx),1.65)-1;
   const hole=Math.hypot((lx+.12)*2.5,(ly-.10)*1.35);
   const membrane=(1-smooth(-.10,.08,sd))*smooth(.46,.64,hole);
   const erosion=smooth(.13+.56*smooth(.2,.95,p)-.045,.13+.56*smooth(.2,.95,p)+.045,detail+.12*Math.sin(ph));
   const fade=smooth(0,.045,p)*(1-smooth(.48,1,p));
   const edge=Math.exp(-Math.pow(sd*10,2))*.9+Math.exp(-Math.pow((hole-.64)*12,2))*.8;
   over(membrane*erosion*fade*.82,o.body.map((v,k)=>mix(v,o.hot[k],clamp(edge+.15))));
   if(o.layers.glow)add(Math.exp(-Math.max(0,sd)*4)*membrane*erosion*fade*.10,o.light);
  }
 }
 if(o.layers.rays){
  const count=18,aa=theta/TAU*count,cell=Math.floor(aa+.5),local=(aa-cell)*TAU/count;
  const jitter=Math.sin(cell*17.17+o.seed)*.12;
  const drift=rad*(.92+.06*Math.sin(cell*7.3));
  const length=R*(.16+.08*Math.sin(cell*9.7))*(1-smooth(.02,.65,u));
  const transverse=Math.abs(local-jitter)*Math.max(r,10);
  const ray=Math.exp(-transverse*transverse/Math.max(.8,R*.012)**2)*smooth(drift-length,drift-length*.3,r)*(1-smooth(drift,drift+1.5,r));
  const fade=smooth(.005,.03,u)*(1-smooth(.12,.62,u));
  over(ray*fade*.85,o.edge);if(o.layers.glow)add(ray*fade*.2,o.light);
 }
 if(o.layers.flash){
  const f=smooth(0,.012,u)*(1-smooth(.05,.19,u));
  const rr=start*(.65+.6*smooth(0,.05,u));
  const core=(1-smooth(rr*.50,rr,r))*f;
  over(core,o.hot);
  if(o.layers.glow)add(Math.exp(-r*r/(rr*rr*5))*f*.8,o.light);
 }
 if(o.layers.glow){
  const hole=smooth(.11,.34,u);
  const body=Math.exp(-Math.pow(r/Math.max(1,rad*.75),4))*(1-hole)*smooth(0,.02,u)*(1-smooth(.13,.45,u));
  add(body*.7,o.light);
 }
 const bound=1-smooth(R,R*1.08,r);
 return {c:c.map(v=>v*bound),a:a*bound,l:light.map(v=>v*bound)};
}
export function renderCPU(canvas,time,input={},view={}){
 const o=prepare(input),noise=noiseSampler(),g=canvas.getContext('2d'),im=g.createImageData(canvas.width,canvas.height),scale=view.scale??1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const f=field((x+.5-canvas.width/2)/scale,(y+.5-canvas.height/2)/scale,time,o,noise),i=(y*canvas.width+x)*4;
  if(view.transparent){
   const alpha=clamp(Math.max(f.a,...f.l));
   for(let k=0;k<3;k++)im.data[i+k]=alpha>0?clamp((f.c[k]+f.l[k])/alpha)*255:0;
   im.data[i+3]=alpha*255;
  }else{
   const bg=view.background==='checker'?((Math.floor(x/16)+Math.floor(y/16))%2?[34,52,69]:[20,33,48]):backgrounds[view.background??'original'];
   for(let k=0;k<3;k++)im.data[i+k]=clamp(bg[k]/255*(1-f.a)+f.c[k]+f.l[k])*255;
   im.data[i+3]=255;
  }
 }g.putImageData(im,0,0);
}
const vs='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
const fs=`precision highp float;
uniform sampler2D noiseMap;uniform vec2 resolution;uniform float time,duration,radius,initialSize,strength,glow,seed,scale,background;
uniform vec3 hotColor,bodyColor,edgeColor,glowColor;uniform vec4 layers;uniform float glowLayer;uniform vec4 petals[10];
const float TAU=6.28318530718;
vec3 c=vec3(0.),light=vec3(0.);float alpha=0.;
void over(float a,vec3 col){a=clamp(a*strength,0.,1.);c=c*(1.-a)+col*a;alpha=alpha*(1.-a)+a;}
void add(float v){light+=v*glowColor*glow*strength;}
void main(){vec2 q=(gl_FragCoord.xy-resolution*.5)/scale;q.y=-q.y;float r=length(q),u=time/duration,R=radius;
vec3 bg=vec3(5.,7.,22.)/255.;if(background>.5&&background<1.5)bg=vec3(0.);if(background>1.5&&background<2.5)bg=vec3(220.,224.,228.)/255.;
if(background>2.5&&background<3.5)bg=mix(vec3(20.,33.,48.),vec3(34.,52.,69.),mod(floor(gl_FragCoord.x/16.)+floor((resolution.y-gl_FragCoord.y)/16.),2.))/255.;if(background>3.5)bg=vec3(95.,78.,65.)/255.;
if(time<=0.||time>=duration||r>=R*1.08||strength<=0.){gl_FragColor=vec4(bg,1.);return;}
float theta=atan(q.y,q.x),start=min(initialSize,R*.32),grow=(1.-exp(-6.*clamp(u/.86,0.,1.)))/(1.-exp(-6.)),rad=start+(R*.94-start)*grow;
float n=texture2D(noiseMap,q/R*.43+vec2(.173+u*.055,.37-u*.031)).r;
float detail=texture2D(noiseMap,q/R*.71+vec2(.51-u*.045,.19)).g;
float warp=.94+.035*sin(theta*3.+1.8)+.018*sin(theta*7.-.4)+.07*(n-.5),front=rad*warp,width=R*(.13-.08*smoothstep(.05,.75,u));
float d=(r-front)/max(1.,width),cut=.18+.62*smoothstep(.12,.9,u),keep=smoothstep(cut-.055,cut+.055,detail);
float band=smoothstep(-1.25,-.93,d)*(1.-smoothstep(-.02,.13,d)),frontFade=smoothstep(0.,.025,u)*(1.-smoothstep(.40,.86,u));
if(layers.y>.5){float rim=exp(-pow((d+.10)*12.,2.)),inner=exp(-pow((d+.96)*16.,2.));float heat=clamp(rim*.95+inner*.65+smoothstep(.62,.8,n)*.6,0.,1.);
over(band*keep*frontFade*.92,mix(bodyColor,hotColor,heat));if(glowLayer>.5)add(exp(-d*d*1.2)*keep*frontFade*.28);}
if(layers.z>.5){for(int i=0;i<10;i++){vec4 v=petals[i];float p=clamp((u-.012*mod(float(i),3.))/v.w,0.,1.);if(p<=0.||p>=1.)continue;
float g=(1.-exp(-7.*p))/(1.-exp(-7.)),aa=v.x+.12*sin(v.y+p*2.);vec2 dir=vec2(cos(aa),sin(aa));float center=start*.6+(R*v.z*.84-start*.6)*g;
float len=R*(.13+.05*sin(v.y))*(1.-smoothstep(.13,.9,p)),lx=(dot(q,dir)-center)/max(1.,len);if(abs(lx)>1.2)continue;
float w=R*(.035+.018*cos(v.y))*(1.-smoothstep(.18,.9,p)),ly=(dot(q,vec2(-dir.y,dir.x))-sin(lx*2.+v.y+p*3.)*w*.7)/max(.6,w);if(abs(ly)>2.)continue;
float sd=abs(ly)+pow(abs(lx),1.65)-1.,hole=length(vec2((lx+.12)*2.5,(ly-.10)*1.35));
float membrane=(1.-smoothstep(-.10,.08,sd))*smoothstep(.46,.64,hole),th=.13+.56*smoothstep(.2,.95,p);
float erosion=smoothstep(th-.045,th+.045,detail+.12*sin(v.y)),fade=smoothstep(0.,.045,p)*(1.-smoothstep(.48,1.,p));
float edge=exp(-pow(sd*10.,2.))*.9+exp(-pow((hole-.64)*12.,2.))*.8;
over(membrane*erosion*fade*.82,mix(bodyColor,hotColor,clamp(edge+.15,0.,1.)));if(glowLayer>.5)add(exp(-max(0.,sd)*4.)*membrane*erosion*fade*.10);}}
if(layers.w>.5){float aa=theta/TAU*18.,cell=floor(aa+.5),local=(aa-cell)*TAU/18.,jitter=sin(cell*17.17+seed)*.12;
float drift=rad*(.92+.06*sin(cell*7.3)),len=R*(.16+.08*sin(cell*9.7))*(1.-smoothstep(.02,.65,u)),transverse=abs(local-jitter)*max(r,10.);
float ray=exp(-transverse*transverse/pow(max(.8,R*.012),2.))*smoothstep(drift-len,drift-len*.3,r)*(1.-smoothstep(drift,drift+1.5,r));
float fade=smoothstep(.005,.03,u)*(1.-smoothstep(.12,.62,u));over(ray*fade*.85,edgeColor);if(glowLayer>.5)add(ray*fade*.2);}
if(layers.x>.5){float f=smoothstep(0.,.012,u)*(1.-smoothstep(.05,.19,u)),rr=start*(.65+.6*smoothstep(0.,.05,u));
over((1.-smoothstep(rr*.50,rr,r))*f,hotColor);if(glowLayer>.5)add(exp(-r*r/(rr*rr*5.))*f*.8);}
if(glowLayer>.5){float hole=smoothstep(.11,.34,u),body=exp(-pow(r/max(1.,rad*.75),4.))*(1.-hole)*smoothstep(0.,.02,u)*(1.-smoothstep(.13,.45,u));add(body*.7);}
float bound=1.-smoothstep(R,R*1.08,r);gl_FragColor=vec4(clamp(bg*(1.-alpha*bound)+(c+light)*bound,0.,1.),1.);}`;
export function createWebGL(canvas){
 const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
 const gl=surface.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL 不可用');
 const shader=(type,s)=>{const sh=gl.createShader(type);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
 const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,makeNoise());
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 const names=['resolution','time','duration','radius','initialSize','strength','glow','seed','scale','background','hotColor','bodyColor','edgeColor','glowColor','layers','glowLayer','petals[0]'];
 const loc=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)])),g=canvas.getContext('2d');
 return {render(time,input={},view={}){
  const o=prepare(input);gl.viewport(0,0,surface.width,surface.height);gl.uniform2f(loc.resolution,surface.width,surface.height);
  gl.uniform1f(loc.time,time);for(const k of ['duration','radius','initialSize','strength','glow','seed'])gl.uniform1f(loc[k],o[k]);
  gl.uniform1f(loc.scale,view.scale??1);gl.uniform1f(loc.background,{original:0,black:1,light:2,checker:3,warm:4}[view.background??'original']);
  gl.uniform4f(loc.layers,+o.layers.flash,+o.layers.front,+o.layers.shards,+o.layers.rays);gl.uniform1f(loc.glowLayer,+o.layers.glow);
  for(const k of ['hotColor','bodyColor','edgeColor','glowColor'])gl.uniform3fv(loc[k],rgb(o[k]));
  gl.uniform4fv(loc['petals[0]'],new Float32Array(o.petals.flat()));gl.drawArrays(gl.TRIANGLES,0,6);g.drawImage(surface,0,0);
 },info:{renderer:'WebGL procedural membrane front / erosion / independent one-shot',unity:false}};
}
