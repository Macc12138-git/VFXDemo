// Reference-derived gray+alpha shell with static radial profiles and live color controls.
// Approximate layer separation, not a new drawing or the original artist's source layers.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mod=(x,n)=>((x%n)+n)%n;
const mix=(a,b,t)=>a+(b-a)*t;
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export const meta={name:'能量团 · 灰阶壳层混合版',version:'6.0',duration:.48,fps:20/.48,frameCount:20,loop:true,
 options:{seed:37,interpolation:'short',glow:1,volume:1,shellOpacity:1,
 shellHot:'#ffffff',shellCool:'#0073ff',coreColor:'#fbfcff',bodyColor:'#2458ff',innerColor:'#45b5ff',glowColor:'#1440ff'}};
export const backgrounds={original:[5,7,22],black:[0,0,0],light:[220,224,228],warm:[101,83,70]};
export function options(input={}){return {...meta.options,...input,layers:{shell:true,core:true,volume:true,glow:true,...input.layers}};}
export function makeSampler({data,width=1280,height=1024,profiles}){
 const at=(x,y,i,k)=>data[((Math.floor(mod(i,20)/5)*256+clamp(y,0,255))*width+mod(i,5)*256+clamp(x,0,255))*2+k]/255;
 return {shell(x,y,index){
  if(x< -128||x>128||y< -128||y>128)return [0,0];
  const xx=clamp(x+127.5,0,255),yy=clamp(y+127.5,0,255),ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;
  return [0,1].map(k=>mix(mix(at(ix,iy,index,k),at(ix+1,iy,index,k),fx),mix(at(ix,iy+1,index,k),at(ix+1,iy+1,index,k),fx),fy));
 },profile(radius,row){
  const x=clamp(radius-.5,0,255),ix=Math.floor(x),f=x-ix;
  return [0,1,2,3].map(k=>mix(profiles[(row*256+ix)*4+k],profiles[(row*256+Math.min(255,ix+1))*4+k],f)/255);
 },info:{width,height}};
}
function blendAt(time,mode){const f=mod(time,meta.duration)*meta.fps,i=Math.floor(f),b=f-i;return {i,b:mode==='step'?0:mode==='short'?sm(.75,1,b):b};}
export function shellAt(x,y,time,input,sampler){
 const o=options(input),{i,b}=blendAt(time,o.interpolation),hot=rgb(o.shellHot),cool=rgb(o.shellCool);
 const a=sampler.shell(x,y,i),n=sampler.shell(x,y,mod(i+1,20));
 const alpha=mix(a[1],n[1],b)*o.shellOpacity;
 const color=hot.map((h,k)=>mix(mix(cool[k],h,a[0])*a[1],mix(cool[k],h,n[0])*n[1],b)*o.shellOpacity);
 return {alpha,color,energy:mix(a[0]*a[1],n[0]*n[1],b)*o.shellOpacity};
}
export function field(x,y,time,input,sampler,background=[5,7,22]){
 const o=options(input),r=Math.hypot(x,y+2.5454545)*352/256;
 const v=sampler.profile(r,0),h=sampler.profile(r,1),core=sampler.profile(r,2)[0];
 let c=background.map(v=>v/255);
 const glow=rgb(o.glowColor),baseGlow=rgb(meta.options.glowColor);
 if(o.layers.volume){
  const body=rgb(o.bodyColor),inner=rgb(o.innerColor),b0=rgb(meta.options.bodyColor),i0=rgb(meta.options.innerColor),iw=Math.exp(-r*r/2200),alpha=clamp(v[3]*o.volume);
  const col=v.slice(0,3).map((p,k)=>clamp(p+(mix(body[k]-b0[k],inner[k]-i0[k],iw))*v[3]*.75));
  c=c.map((p,k)=>p*(1-alpha)+col[k]*(v[3]>0?alpha/v[3]:0));
 }
 if(o.layers.glow)c=c.map((p,k)=>p+h[k]*glow[k]/baseGlow[k]*o.glow);
 if(o.layers.core)c=c.map((p,k)=>mix(p,rgb(o.coreColor)[k],core));
 if(o.layers.shell){
  const s=shellAt(x,y,time,o,sampler);
  if(o.layers.glow){let bloom=0;for(const [dx,dy] of [[-2,-2],[2,-2],[-2,2],[2,2]])bloom+=shellAt(x+dx,y+dy,time,o,sampler).energy/4;
   c=c.map((p,k)=>p+glow[k]*bloom*.30*o.glow);
  }
  c=c.map((p,k)=>p*(1-s.alpha)+s.color[k]);
 }
 return c.map(v=>clamp(v));
}
export function renderCPU(canvas,time,input,sampler,{background='original',frameSize=256}={}){
 const g=canvas.getContext('2d'),im=g.createImageData(canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const bg=background==='checker'?((Math.floor(x/16)+Math.floor(y/16))%2?[34,52,69]:[20,33,48]):backgrounds[background];
  const c=field((x+.5-canvas.width/2)*256/frameSize,(y+.5-canvas.height/2)*256/frameSize,time,input,sampler,bg),i=(y*canvas.width+x)*4;
  for(let k=0;k<3;k++)im.data[i+k]=c[k]*255;im.data[i+3]=255;
 }g.putImageData(im,0,0);
}
export async function loadData(base){
 const [data,profiles]=await Promise.all(['Textures/EnergyCluster_ShellGrayAlpha.rg','Textures/EnergyCluster_Profiles.rgba'].map(async path=>{
  const response=await fetch(base+path);if(!response.ok)throw Error(`素材加载失败 ${path}: ${response.status}`);return new Uint8Array(await response.arrayBuffer());
 }));
 if(data.length!==1280*1024*2||profiles.length!==256*3*4)throw Error('灰阶/透明度或静态色带数据长度不匹配');
 return {data,width:1280,height:1024,profiles};
}
const vertexShader='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
const fragmentShader=`precision highp float;
uniform sampler2D shell,profiles;uniform vec2 resolution;uniform vec4 layers;
uniform float time,frameSize,mode,glow,volume,opacity,background;
uniform vec3 shellHot,shellCool,coreColor,bodyColor,innerColor,glowColor;
vec2 at(vec2 q,float i){if(abs(q.x)>128.||abs(q.y)>128.)return vec2(0.);
 vec2 pixel=clamp(q+128.,vec2(.5),vec2(255.5)),origin=vec2(mod(i,5.),floor(i/5.))*256.;
 vec4 s=texture2D(shell,(origin+pixel)/vec2(1280.,1024.));return vec2(s.r,s.a);}
vec4 surface(vec2 q,float i,float b){vec2 a=at(q,i),n=at(q,mod(i+1.,20.));
 return vec4(mix(mix(shellCool,shellHot,a.x)*a.y,mix(shellCool,shellHot,n.x)*n.y,b),mix(a.y,n.y,b))*opacity;}
float energy(vec2 q,float i,float b){vec2 a=at(q,i),n=at(q,mod(i+1.,20.));return mix(a.x*a.y,n.x*n.y,b)*opacity;}
void main(){vec2 q=(gl_FragCoord.xy-resolution*.5)*256./frameSize;q.y=-q.y;
 float r=length(q+vec2(0.,2.5454545))*352./256.;float u=clamp(r/256.,.5/256.,255.5/256.);
 vec4 v=texture2D(profiles,vec2(u,1./6.)),h=texture2D(profiles,vec2(u,.5));float core=texture2D(profiles,vec2(u,5./6.)).r;
 vec3 c=vec3(5.,7.,22.)/255.;if(background>.5&&background<1.5)c=vec3(0.);
 if(background>1.5&&background<2.5)c=vec3(220.,224.,228.)/255.;
 if(background>2.5&&background<3.5)c=mix(vec3(20.,33.,48.),vec3(34.,52.,69.),mod(floor(gl_FragCoord.x/16.)+floor((resolution.y-gl_FragCoord.y)/16.),2.))/255.;
 if(background>3.5)c=vec3(101.,83.,70.)/255.;
 if(layers.z>.5){float iw=exp(-r*r/2200.),alpha=clamp(v.a*volume,0.,1.);
 vec3 col=clamp(v.rgb+mix(bodyColor-vec3(36.,88.,255.)/255.,innerColor-vec3(69.,181.,255.)/255.,iw)*v.a*.75,0.,1.);
 c=c*(1.-alpha)+col*(v.a>0.?alpha/v.a:0.);}
 if(layers.w>.5)c+=h.rgb*glowColor/(vec3(20.,64.,255.)/255.)*glow;
 if(layers.y>.5)c=mix(c,coreColor,core);
 if(layers.x>.5){float f=mod(time,.48)*(20./.48),i=floor(f),b=fract(f);if(mode<.5)b=smoothstep(.75,1.,b);if(mode>1.5)b=0.;
 vec4 s=surface(q,i,b);if(layers.w>.5){float bloom=(energy(q+vec2(-2.,-2.),i,b)+energy(q+vec2(2.,-2.),i,b)+energy(q+vec2(-2.,2.),i,b)+energy(q+vec2(2.,2.),i,b))*.25;
 c+=glowColor*bloom*.30*glow;}c=c*(1.-s.a)+s.rgb;}
 gl_FragColor=vec4(clamp(c,0.,1.),1.);}`;
export function createWebGL(canvas,atlas){
 const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
 const gl=surface.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL 不可用');
 const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexShader));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentShader));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const p=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
 for(const [unit,name,format,w,h,bytes]of [[0,'shell',gl.LUMINANCE_ALPHA,1280,1024,atlas.data],[1,'profiles',gl.RGBA,256,3,atlas.profiles]]){
  gl.activeTexture(gl.TEXTURE0+unit);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,format,w,h,0,format,gl.UNSIGNED_BYTE,bytes);
  for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
  for(const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program,name),unit);
 }
 const keys=['resolution','layers','time','frameSize','mode','glow','volume','opacity','background','shellHot','shellCool','coreColor','bodyColor','innerColor','glowColor'];
 const loc=Object.fromEntries(keys.map(k=>[k,gl.getUniformLocation(program,k)])),g=canvas.getContext('2d');
 return {render(time,input={}, {background='original',frameSize=256}={}){
  const o=options(input);gl.viewport(0,0,surface.width,surface.height);gl.uniform2f(loc.resolution,surface.width,surface.height);
  gl.uniform4f(loc.layers,+o.layers.shell,+o.layers.core,+o.layers.volume,+o.layers.glow);gl.uniform1f(loc.time,mod(time,meta.duration));gl.uniform1f(loc.frameSize,frameSize);
  gl.uniform1f(loc.mode,{short:0,alpha:1,step:2}[o.interpolation]);gl.uniform1f(loc.glow,o.glow);gl.uniform1f(loc.volume,o.volume);gl.uniform1f(loc.opacity,o.shellOpacity);
  gl.uniform1f(loc.background,{original:0,black:1,light:2,checker:3,warm:4}[background]);
  for(const key of ['shellHot','shellCool','coreColor','bodyColor','innerColor','glowColor'])gl.uniform3fv(loc[key],rgb(o[key]));
  gl.drawArrays(gl.TRIANGLES,0,6);g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(surface,0,0);
 },info:{renderer:'WebGL grayscale+opacity flipbook, premultiplied frame mixing, static radial profiles',unity:false}};
}
