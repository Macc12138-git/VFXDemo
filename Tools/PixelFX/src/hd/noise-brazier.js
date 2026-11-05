// Brazier prop and seeded rising spark composition adapted from Sprite Fusion fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT, Copyright (c) 2026 Hugo Duprez.
// New material/noise study: the user's ONE static grayscale image generates the fire.
// Authoring-only. No sprite frames, Unity writes or dependency on the older animated flame.
import {secondaryDefaults,drawSmoke,drawSparks} from './noise-brazier-secondary.js';
export const meta={id:'hd/noise-brazier',name:'Brazier · 噪声火焰与烟火',version:4,size:[1024,1280],pivot:[512,855],duration:8,fps:30,loop:true,actor:false,
  options:{seed:8,flow:1,scale:1.35,stretch:2.8,distortion:.9,dissolve:.22,softness:.055,core:.55,glow:.5,steps:.15,prop:true,layer:'combined',...secondaryDefaults}};
export const presets={
  natural:{name:'自然燃烧',...meta.options},
  painted:{name:'手绘色阶',...meta.options,scale:1.1,stretch:3.9,distortion:.6,dissolve:.19,softness:.035,core:.5,steps:.8,glow:.4},
  fierce:{name:'旺盛翻卷',...meta.options,flow:1.45,scale:1.7,stretch:2.7,distortion:1.15,dissolve:.13,softness:.065,core:.8,glow:.65},
};
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
const hash=(x,s=8)=>{const r=Math.sin(x*127.1+s*74.17)*43758.5453;return r-Math.floor(r);};
export function makeNoise(image){
  const {width:w,height:h,data}=image,gray=new Float32Array(w*h);
  for(let i=0;i<gray.length;i++)gray[i]=data[i*4]/255;
  const mirror=(v,n)=>{let a=((v%(2*n))+2*n)%(2*n);return a<n?a:2*n-1-a;};
  return (u,v)=>{
    const x=u*w-.5,y=v*h-.5,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const x0=mirror(ix,w),x1=mirror(ix+1,w),y0=mirror(iy,h)*w,y1=mirror(iy+1,h)*w;
    return clamp((mix(mix(gray[y0+x0],gray[y0+x1],fx),mix(gray[y1+x0],gray[y1+x1],fx),fy)-.13)/.62);
  };
}
// CPU reference for offline review. Browser uses the equivalent real fragment shader below.
export function field(x,y,time,o,noise){
  const h=(855-y)/460,px=(x-512)/147,t=time*o.flow,phase=t*TAU/8;
  if(h<-.012||h>1.32||Math.abs(px)>1.65)return [0,0,0];
  const uvx=px*o.scale*.43+.31,uvy=h*o.scale/o.stretch-t*.5;
  const wx=noise(uvx*.64+.12,uvy*.8+t*.15)-.48;
  const wy=noise(uvx*.71+.67,uvy*.7-t*.15)-.48;
  const xd=px+wx*o.distortion*(.10+.78*clamp(h))+Math.sin(h*7-phase*2)*.055*h;
  const n0=noise(uvx+wx*.13,uvy+wy*.08),n1=noise(uvx*1.91+.42,uvy*1.53+t*.265),n2=noise(uvx*4.17+.13,uvy*3.31+t*.155);
  const n=n0*.64+n1*.26+n2*.10;
  const centers=[-.73,-.34,.02,.40,.76],heights=[.49,.80,1.06,.76,.44],widths=[.28,.34,.46,.34,.27];
  let body=-9;
  for(let i=0;i<5;i++){
    const hi=heights[i]*(.94+.06*Math.sin(phase*(2+i%2)+i*2.3));
    const center=centers[i]+Math.sin(h*6-phase*2+i*1.9)*h*.18;
    body=Math.max(body,1-Math.pow(Math.abs(xd-center)/widths[i],1.35)-Math.pow(Math.max(h,0)/hi,1.6));
  }
  // A connected hot fuel bed stops the five lobes reading as parallel candles.
  body=Math.max(body,.88-Math.pow(Math.abs(xd)/1.08,2)*.68-Math.max(h,0)*2.6);
  const erosion=o.dissolve*.95+smooth(.65,1,o.dissolve)*.8;
  const fuel=body+(n-.43)*1.12-erosion;
  // The base stays inside the bowl even when the hot fuel bed is turbulent.
  const mouth=mix(1-smooth(.96,1.035,Math.abs(px)),1,smooth(.05,.28,h));
  const alpha=smooth(0,o.softness,fuel)*(1-smooth(1.12,1.30,h))*smooth(-.012,.012,h)*mouth;
  const heat=clamp(fuel*.82+o.core*.35*(1-clamp(h))+(n1-.5)*.12);
  return [alpha,heat,clamp(body)];
}
const ramp=[[155,28,9],[232,55,6],[255,110,12],[255,178,38],[255,224,113],[255,249,213]];
function color(heat,steps){const q=mix(heat,Math.round(heat*5)/5,steps)*5,i=Math.min(4,Math.floor(q)),f=q-i;return ramp[i].map((v,k)=>mix(v,ramp[i+1][k],f));}
function glow(ctx,x,y,rx,ry,strength,color='255,132,35'){
  ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);
  g.addColorStop(0,`rgba(${color},${strength})`);g.addColorStop(.35,`rgba(${color},${strength*.35})`);g.addColorStop(1,`rgba(${color},0)`);
  ctx.fillStyle=g;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();
}
export function drawScene(ctx,time,options,assets,fireImage){
  const o={...meta.options,...options},w=ctx.canvas.width,h=ctx.canvas.height;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.scale(w/1024,h/1280);
  const visible=1-smooth(.75,1,o.dissolve),withColor=o.layer==='combined';
  if(o.layer==='combined'||o.layer==='glow'){
    ctx.globalCompositeOperation='lighter';const breath=.92+.08*Math.sin(time*o.flow*TAU/8*3);
    glow(ctx,512,720,268,350,.085*o.glow*breath*visible);
    glow(ctx,512,833,182,125,.14*o.glow*visible,'255,180,67');
    if(o.prop)glow(ctx,512,1153,230,32,.14*o.glow*visible);
    drawSparks(ctx,time,o,assets,true);ctx.globalCompositeOperation='source-over';
  }
  if(withColor||o.layer==='smoke'||o.layer==='secondary')drawSmoke(ctx,time,o,assets);
  if(withColor&&o.prop)ctx.drawImage(assets.back,256,768);
  if(['combined','fire','noise','mask'].includes(o.layer))ctx.drawImage(fireImage,0,0,1024,1280);
  if(withColor&&o.prop)ctx.drawImage(assets.front,256,768);
  if(withColor||o.layer==='sparks'||o.layer==='secondary')drawSparks(ctx,time,o,assets);
  ctx.restore();
}
export function createCPU(canvas,noiseImage,assets){
  const ctx=canvas.getContext('2d'),noise=makeNoise(noiseImage),c=new canvas.constructor(canvas.width,canvas.height),g=c.getContext('2d');
  // Offline target may be smaller; evaluate the identical logical source coordinates.
  const w=c.width,h=c.height,pixels=g.createImageData(w,h),s=w/1024;
  return (time,options={})=>{
    const o={...meta.options,...options},data=pixels.data;data.fill(0);time=(((time*o.flow)%8+8)%8)/o.flow;
    const x0=Math.max(0,Math.floor(270*s)),x1=Math.min(w,Math.ceil(755*s)),y0=Math.floor(238*s),y1=Math.ceil(862*s);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const xx=(x+.5)/s,yy=(y+.5)/s,[a,heat,mask]=field(xx,yy,time,o,noise),i=(y*w+x)*4;
      if(o.layer==='noise'){const n=noise((xx-512)/294*o.scale+.5,(855-yy)/460*o.scale/o.stretch-time*o.flow*.5);data[i]=data[i+1]=data[i+2]=n*255;data[i+3]=255;}
      else if(o.layer==='mask'){data[i]=data[i+1]=data[i+2]=mask*255;data[i+3]=255;}
      else if(a>0){const rgb=color(heat,o.steps);data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=a*255;}
    }
    g.putImageData(pixels,0,0);drawScene(ctx,time,o,assets,c);
  };
}
export async function createWebGL(canvas){
  const fire=document.createElement('canvas');fire.width=canvas.width;fire.height=canvas.height;
  const gl=fire.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('此预览需要 WebGL；离线 CPU 预览仍可查看。');
  const source=await (await fetch(new URL('./noise-brazier.frag',import.meta.url))).text();
  const compile=(type,text)=>{const shader=gl.createShader(type);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,source));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const load=url=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=new URL(url,import.meta.url).href;});
  const [noise,back,front,smoke,spark]=await Promise.all(['FlowNoise','PropBack','PropFront','SmokePuff','SparkStreak'].map(n=>load('./noise-brazier-art/'+n+'.png')));
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,noise);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.MIRRORED_REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.MIRRORED_REPEAT);
  gl.uniform1i(gl.getUniformLocation(program,'u_noise'),0);
  const locations=Object.fromEntries(['time','resolution','flow','scale','stretch','distortion','dissolve','softness','core','steps','layer'].map(k=>[k,gl.getUniformLocation(program,'u_'+k)]));
  const ctx=canvas.getContext('2d'),assets={back,front,smoke,spark};
  return {render(time,options={}){const o={...meta.options,...options};time=(((time*o.flow)%8+8)%8)/o.flow;gl.viewport(0,0,fire.width,fire.height);gl.uniform2f(locations.resolution,fire.width,fire.height);gl.uniform1f(locations.time,time);
    for(const k of ['flow','scale','stretch','distortion','dissolve','softness','core','steps'])gl.uniform1f(locations[k],o[k]);
    gl.uniform1i(locations.layer,o.layer==='noise'?1:o.layer==='mask'?2:0);gl.drawArrays(gl.TRIANGLES,0,6);drawScene(ctx,time,o,assets,fire);},
    info:{renderer:'WebGL flame + static particle stamps',texture:'User-supplied static FlowNoise.png',additionalStaticTextures:['SmokePuff.png','SparkStreak.png'],textureFrames:1,atlas:false,unityModified:false}};
}
