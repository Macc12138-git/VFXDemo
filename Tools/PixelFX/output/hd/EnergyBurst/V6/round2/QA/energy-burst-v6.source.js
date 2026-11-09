// V5's approved white folds / flash / current paths are retained; only blue diffusion is redesigned.
// This is an authoring preview, not Unity rendering. No new animation sheets or textures.
import * as base from './energy-burst-v5.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const u=clamp((v-a)/(b-a));return u*u*(3-2*u);};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export const meta={...base.meta,id:'hd/energy-burst-v6',name:'圆形能量爆炸 · 跃动扩散',version:'6.0',options:{...base.meta.options,pulse:1,flow:1,mistColor:'#508cff'}};
export const {layerNames,backgrounds,makeNoise,noiseSampler,state,phase,electricPaths,drawElectric}=base;
export function options(input={}){return base.options({...meta.options,...input});}
export function prepare(input={}){const o=base.prepare(options(input));return {...o,mist:rgb(o.mistColor)};}
export function mistField(x,y,s,o,noise){
 const empty={c:[0,0,0],a:0,l:[0,0,0]};
 if(!s.alive||s.isCharge||o.strength<=0||Math.hypot(x,y)>o.radius*1.10)return empty;
 const r=Math.hypot(x,y)/s.radius,theta=Math.atan2(y,x),a=s.a,clock=a*o.flow,seed=o.seed*.013;
 const beat=.58*Math.sin(theta*4-clock*29+seed)+.28*Math.sin(theta*7+clock*39-seed);
 const turn=theta+.18*Math.sin(r*4.5-clock*16)*o.pulse;
 const adv=r-clock*.85,ux=Math.cos(turn)*adv,uy=Math.sin(turn)*adv;
 const n=noise(ux*.44+.13+seed+clock*.06,uy*.44+.47-clock*.05);
 const fine=noise(ux*.68+.36-clock*.17,uy*.68+.23+clock*.11,1);
 const bend=(n-.5)*.26+beat*.070*o.pulse;
 const front=.93+bend,width=.10+.075*(.5+.5*Math.sin(theta*5+clock*27));
 const frontBand=Math.exp(-Math.pow((r-front)/width,2));
 const trailBand=Math.exp(-Math.pow((r-(.70+bend*.8+beat*.055*o.pulse))/.16,2));
 const cut=.28+.19*smooth(.12,.60,a),density=smooth(cut-.10,cut+.14,n*.84+fine*.16);
 const stripes=1-smooth(.015,.075,Math.abs(n+.075*Math.sin(theta*4-r*8+clock*18)-.50));
 const outward=smooth(.12,.45,r),fade=smooth(0,.020,a)*(1-smooth(.27,.78,a));
 const pockets=.42+.58*smooth(-.4,.65,beat),mask=frontBand*(.20+.80*density)+trailBand*density*(.32+.34*stripes);
 const alpha=clamp(mask*outward*pockets*fade*.78*o.body*o.strength)*(o.layers.volume?1:0);
 const lightness=clamp(.30+.55*stripes+.07*fine),color=o.blue.map((v,k)=>mix(v,o.mist[k],lightness));
 const light=o.layers.glow?mask*outward*pockets*fade*(.11+.13*stripes)*o.glow*o.strength:0;
 const bound=1-smooth(o.radius,o.radius*1.08,Math.hypot(x,y));
 return {c:color.map(v=>v*alpha*bound),a:alpha*bound,l:o.light.map(v=>v*light*bound)};
}
export function field(x,y,s,o,noise){
 if(s.isCharge)return base.field(x,y,s,o,noise);
 const kept=base.field(x,y,s,{...o,layers:{...o.layers,volume:false,glow:false}},noise),mist=mistField(x,y,s,o,noise);
 return {c:kept.c.map((v,k)=>v+mist.c[k]*(1-kept.a)),a:kept.a+mist.a*(1-kept.a),l:mist.l};
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
uniform vec2 resolution;uniform sampler2D noiseMap;uniform float time,duration,radius,charge,strength,body,glow,seed,scale,background,pulse,flow;
uniform vec3 hotColor,bodyColor,edgeColor,glowColor,mistColor;uniform vec4 layers;uniform vec2 otherLayers;
vec3 c=vec3(0.),light=vec3(0.);float alpha=0.;
void over(float a,vec3 col){a=clamp(a*strength,0.,1.);c=c*(1.-a)+col*a;alpha=alpha*(1.-a)+a;}
void add(float v){light+=v*glowColor*glow*strength;}
void main(){vec2 q=(gl_FragCoord.xy-resolution*.5)/scale;q.y=-q.y;float t=time*1.02/duration,a=t-charge,R=radius,S=R/180.,cq=clamp(t/charge,0.,1.);
vec3 bg=vec3(5.,7.,22.)/255.;if(background>.5&&background<1.5)bg=vec3(0.);if(background>1.5&&background<2.5)bg=vec3(220.,224.,228.)/255.;
if(background>2.5&&background<3.5)bg=mix(vec3(20.,33.,48.),vec3(34.,52.,69.),mod(floor(gl_FragCoord.x/16.)+floor((resolution.y-gl_FragCoord.y)/16.),2.))/255.;if(background>3.5)bg=vec3(95.,78.,65.)/255.;
if(time<=0.||time>=duration||length(q)>R*1.10||strength<=0.){gl_FragColor=vec4(bg,1.);return;}
bool gathering=a<0.;float expand=1.-pow(1.-clamp(a/.30,0.,1.),3.),rad=gathering?mix(64.,34.,1.-pow(1.-cq,3.))*S:mix(34.*S,R*.91,expand),fade=gathering?smoothstep(0.,.018,t):1.-smoothstep(.19,.72,a);
vec2 p=q/rad;float r0=length(p),theta=atan(p.y,p.x),sd=seed*.013;
float n0=texture2D(noiseMap,p*.28+vec2(sd+t*.065,.31-t*.047)).r,n1=texture2D(noiseMap,p*.40+vec2(.51-t*.045,sd+t*.06)).g;
vec2 w=p+vec2(n0-.5,n1-.5)*.30+.07*vec2(sin(p.y*4.+t*8.),sin(p.x*3.-t*6.));
float n=texture2D(noiseMap,w*.38+vec2(.13+sd+t*.15,.53-t*.17)).r,fine=texture2D(noiseMap,w*.60+vec2(.43-t*.13,.11+t*.15)).g;
float contour=1.+.018*sin(theta*5.+sd)+.014*sin(theta*9.-sd)+.065*(n0-.5),r=r0/contour,inside=1.-smoothstep(.984,1.012,r),gather=smoothstep(0.,.018,t),ba=max(0.,a);
if(gathering){if(layers.x>.5){float core=(1.-smoothstep(.10+.12*cq,.38+.18*cq,r0))*gather,folds=(1.-smoothstep(.018,.065,abs(n-.51)))*inside;
over(inside*gather*(.48+.2*cq),bodyColor);over(folds*gather*.40,edgeColor);over(core*(.52+.48*cq),hotColor);}if(otherLayers.y>.5)add(exp(-r0*r0*2.8)*gather*.7);
}else{
// New blue diffusion: advected pockets, alternating local swell/collapse and soft outward-torn edges.
float clock=a*flow,beat=.58*sin(theta*4.-clock*29.+sd)+.28*sin(theta*7.+clock*39.-sd),turn=theta+.18*sin(r0*4.5-clock*16.)*pulse,adv=r0-clock*.85;
vec2 uv=vec2(cos(turn),sin(turn))*adv;
float mn=texture2D(noiseMap,uv*.44+vec2(.13+sd+clock*.06,.47-clock*.05)).r,mf=texture2D(noiseMap,uv*.68+vec2(.36-clock*.17,.23+clock*.11)).g;
float bend=(mn-.5)*.26+beat*.070*pulse,front=.93+bend,width=.10+.075*(.5+.5*sin(theta*5.+clock*27.)),frontBand=exp(-pow((r0-front)/width,2.)),trailBand=exp(-pow((r0-(.70+bend*.8+beat*.055*pulse))/.16,2.));
float cut=.28+.19*smoothstep(.12,.60,a),density=smoothstep(cut-.10,cut+.14,mn*.84+mf*.16),stripes=1.-smoothstep(.015,.075,abs(mn+.075*sin(theta*4.-r0*8.+clock*18.)-.50));
float outward=smoothstep(.12,.45,r0),mfad=smoothstep(0.,.020,a)*(1.-smoothstep(.27,.78,a)),pockets=.42+.58*smoothstep(-.4,.65,beat),mask=frontBand*(.20+.80*density)+trailBand*density*(.32+.34*stripes);
float mistBound=1.-smoothstep(R,R*1.08,length(q)),ma=clamp(mask*outward*pockets*mfad*.78*body*strength,0.,1.)*(layers.z>.5?1.:0.)*mistBound;
vec3 mc=mix(bodyColor,mistColor,clamp(.30+.55*stripes+.07*mf,0.,1.));c=mc*ma;alpha=ma;
if(otherLayers.y>.5)light+=glowColor*mask*outward*pockets*mfad*(.11+.13*stripes)*glow*strength*mistBound;
// V5 white highlight formulas and timing retained verbatim, composed above the new blue field.
float erosion=smoothstep(.12,.37,ba),oldCut=.28+.29*smoothstep(.16,.65,ba)+.17*smoothstep(.50,.81,ba),keep=mix(1.,smoothstep(oldCut-.045,oldCut+.045,n*.72+fine*.28),erosion),clear=mix(1.,smoothstep(.28,.72,r),smoothstep(.025,.17,ba));
if(layers.w>.5){float marble=n+.065*sin(w.x*3.-w.y*2.-t*7.),ridge=1.-smoothstep(.012,.040,abs(marble-.53)),edge=exp(-pow((r-.973)/.017,2.))*smoothstep(.43,.57,n),front=exp(-pow((r-(.82+.035*sin(theta*5.-t*5.)+.07*(fine-.5)))/(.032+.016*n),2.))*(.38+.62*smoothstep(.32,.59,n1));
float fold=ridge*inside*smoothstep(.12,.32,r)*(1.-smoothstep(.88,1.02,r)),heat=clamp(.38+ridge*.58+edge*.85+front*.9,0.,1.);over((fold*.70+edge*.22+front*.94)*keep*fade*(.5+.5*clear),mix(bodyColor,hotColor,heat));}
if(layers.y>.5){float flash=(1.-smoothstep(.025,.115,ba))*smoothstep(0.,.009,ba),core=(1.-smoothstep(.20,.68,r0))*flash;over(core,hotColor);}
}
float bound=1.-smoothstep(R*.99,R*1.06,length(q));gl_FragColor=vec4(clamp(bg*(1.-alpha*bound)+c*bound+light,0.,1.),1.);}`;
export function createWebGL(canvas){
 const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
 const gl=surface.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL 不可用');
 const shader=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
 const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,128,128,0,gl.RGBA,gl.UNSIGNED_BYTE,makeNoise());
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.REPEAT);
 const names=['resolution','time','duration','radius','charge','strength','body','glow','seed','scale','background','pulse','flow','hotColor','bodyColor','edgeColor','glowColor','mistColor','layers','otherLayers'];
 const loc=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)])),g=canvas.getContext('2d');
 return {render(time,input={},view={}){const o=prepare(input);gl.viewport(0,0,surface.width,surface.height);gl.uniform2f(loc.resolution,surface.width,surface.height);gl.uniform1f(loc.time,time);
 for(const k of ['duration','radius','charge','strength','body','glow','seed','pulse','flow'])gl.uniform1f(loc[k],o[k]);gl.uniform1f(loc.scale,view.scale??1);gl.uniform1f(loc.background,{original:0,black:1,light:2,checker:3,warm:4}[view.background??'original']);
 gl.uniform4f(loc.layers,+o.layers.charge,+o.layers.flash,+o.layers.volume,+o.layers.folds);gl.uniform2f(loc.otherLayers,+o.layers.electric,+o.layers.glow);for(const k of ['hotColor','bodyColor','edgeColor','glowColor','mistColor'])gl.uniform3fv(loc[k],rgb(o[k]));
 gl.drawArrays(gl.TRIANGLES,0,6);g.drawImage(surface,0,0);drawElectric(canvas,time,o,view);
 },info:{renderer:'WebGL pulsing advected blue energy + retained V5 white highlights / authoring only',unity:false}};
}
