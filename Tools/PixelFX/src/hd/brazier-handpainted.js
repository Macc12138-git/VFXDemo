// Brazier layout and staggered looping embers adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
// HD Canvas authoring study. Does not run the Unity shader or write Unity assets.
export const meta = {
  id: 'hd/brazier-handpainted', name: 'Brazier · 高清手绘火焰', version: 3,
  size: [1024, 1280], pivot: [512, 855], duration: 4, fps: 30, loop: true, actor: false,
  options: { seed: 8, distortion: 1, dissolve: 0, roughness: 0.65, glow: 0.65, prop: true },
  description: '橙红外焰、金黄笔触和浅黄热芯；上升卷曲、噪声侵蚀、干笔边缘、火星与薄烟。',
};
const W=1024, H=1280, RIM=855, TAU=Math.PI*2, FIELD=256;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,x)=>a+(b-a)*x, fract=x=>x-Math.floor(x), wrap=(x,n)=>((x%n)+n)%n;
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const hash=(x,y=0,seed=8)=>fract(Math.sin(x*127.1+y*311.7+seed*74.17)*43758.5453);

function tileNoise(x,y,period,seed){
  const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y);
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const h=(dx,dy)=>hash(wrap(ix+dx,period),wrap(iy+dy,period),seed);
  return mix(mix(h(0,0),h(1,0),u),mix(h(0,1),h(1,1),u),v);
}
const fieldCache=new Map();
function fields(seed){
  if(fieldCache.has(seed))return fieldCache.get(seed);
  const noise=new Float32Array(FIELD*FIELD),distort=new Float32Array(FIELD*FIELD);
  for(let y=0;y<FIELD;y++)for(let x=0;x<FIELD;x++){
    const u=x/FIELD,v=y/FIELD,i=y*FIELD+x;
    noise[i]=0.68*tileNoise(u*8,v*8,8,seed)+0.23*tileNoise(u*16,v*16,16,seed+1)+0.09*tileNoise(u*32,v*32,32,seed+2);
    distort[i]=0.8*tileNoise(u*6,v*6,6,seed+21)+0.2*tileNoise(u*12,v*12,12,seed+22);
  }
  const result={noise,distort};fieldCache.set(seed,result);return result;
}
function sample(field,x,y){
  const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
  const x0=ix&255,x1=(ix+1)&255,y0=(iy&255)<<8,y1=((iy+1)&255)<<8;
  return mix(mix(field[y0+x0],field[y0+x1],u),mix(field[y1+x0],field[y1+x1],u),v);
}
function surface(ctx,width,height){
  if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);
  if(ctx.canvas.ownerDocument){const c=ctx.canvas.ownerDocument.createElement('canvas');c.width=width;c.height=height;return c;}
  return new ctx.canvas.constructor(width,height);
}
const surfaceCache=new WeakMap();
function buffers(ctx){
  if(!surfaceCache.has(ctx)){
    const raw=surface(ctx,W,H),shaded=surface(ctx,W,H);
    surfaceCache.set(ctx,{raw,rawCtx:raw.getContext('2d',{willReadFrequently:true}),shaded,shadedCtx:shaded.getContext('2d')});
  }
  return surfaceCache.get(ctx);
}
function polygon(ctx,points,color,alpha=1){
  ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();ctx.fill();
}
function ellipse(ctx,x,y,rx,ry,color,alpha=1){
  ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();
}
function stroke(ctx,points,color,width,alpha=1){
  ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.stroke();
}

// Same eleven root positions as Brazier; newly drawn anti-aliased brush silhouettes.
const tongues=[
  {x:-72,h:245,w:29,lean:-32,back:true},{x:72,h:265,w:28,lean:46,back:true},
  {x:-32,h:385,w:43,lean:-48,back:true},{x:36,h:350,w:39,lean:47,back:true},
  {x:-121,h:125,w:24,lean:-21},{x:120,h:148,w:24,lean:22},
  {x:-88,h:230,w:33,lean:-45},{x:87,h:240,w:31,lean:43},
  {x:-47,h:315,w:49,lean:-39},{x:48,h:290,w:48,lean:42},{x:0,h:445,w:74,lean:26},
];
function tonguePoints(q,phase,widthShare=1,heightShare=1,inset=0){
  const left=[],right=[],h=q.h*(0.93+0.07*Math.sin(phase*3+q.id*1.7));
  const rootX=512+q.x+inset,rootY=q.y??RIM+5;
  const sway=Math.sin(phase*2+q.id*1.9),turn=Math.sin(phase*3+q.id*2.4),n=74;
  for(let i=0;i<=n;i++){
    const v=i/n,u=v*heightShare;
    const cx=rootX+q.lean*u*u+21*sway*u*u
      +(17+8*turn)*Math.sin(u*8-phase*3+q.id)*Math.pow(u,1.15)
      +32*Math.sin(phase*2+q.id)*Math.pow(u,5);
    const undulation=1+0.12*Math.sin(u*17-phase*5+q.id)+0.05*Math.sin(u*35-phase*8+q.id*3)
      +0.018*Math.sin(u*137-phase*8+q.id*7);
    const w=q.w*widthShare*Math.pow(1-v,0.76)*(0.78+0.38*Math.sin(v*Math.PI))*undulation,y=rootY-h*u;
    left.push([cx-w*(1+0.11*Math.sin(u*10+phase*3)),y]);
    right.push([cx+w*(1-0.11*Math.sin(u*10+phase*3+1)),y]);
  }
  return left.concat(right.reverse());
}
function paintTongue(ctx,q,phase){
  const ramp=q.back?['#b43725','#e95123','#ff9a35','#ffd765']:['#d94524','#ff7428','#ffb83e','#ffe276','#fff1b0'];
  const layers=q.back?[[1,1],[0.83,0.93],[0.54,0.72],[0.22,0.39]]:[[1,1],[0.86,0.94],[0.64,0.81],[0.40,0.59],[0.15,0.28]];
  layers.forEach(([w,h],i)=>polygon(ctx,tonguePoints(q,phase,w,h,-i*0.6),ramp[i]));
  if(!q.back&&q.h>250)polygon(ctx,tonguePoints({...q,x:q.x-q.w*0.18,w:q.w*0.055},phase+0.12,1,0.56),'#fff5c7',0.74);
  if(q.h>200){
    // Slightly broken pigment strokes keep large color bands from reading as perfect vector fills.
    const silhouette=tonguePoints(q,phase);ctx.save();ctx.beginPath();ctx.moveTo(...silhouette[0]);
    for(const p of silhouette.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.clip();
    for(let mark=0;mark<5;mark++){
      const offset=(hash(mark,q.id,19)-0.5)*q.w*0.7,share=0.25+hash(mark,q.id,20)*0.45;
      const brush={...q,x:q.x+offset,w:1.2+hash(mark,q.id,21)*2.2};
      polygon(ctx,tonguePoints(brush,phase+0.07,1,share),mark%2?'#f37b32':'#fff2b2',0.16+hash(mark,q.id,22)*0.15);
    }
    ctx.restore();
  }
}
function paintFlames(ctx,t,o){
  ctx.clearRect(0,0,W,H);const phase=t/meta.duration*TAU;
  for(let i=0;i<tongues.length;i++)paintTongue(ctx,{...tongues[i],id:i+o.seed*0.13},phase);
  // Detached licks have zero-sized endpoints, so the wrap never pops.
  for(let i=0;i<12;i++){
    const age=wrap(t-hash(i,13,o.seed)*meta.duration,meta.duration),life=0.68+hash(i,14,o.seed)*0.5;
    if(age>=life)continue;
    const u=age/life,k=Math.sin(Math.PI*u),side=hash(i,15,o.seed)*2-1;
    paintTongue(ctx,{id:i+25,x:side*86+side*age*28,y:650-hash(i,16,o.seed)*210-age*110,
      h:(35+hash(i,17,o.seed)*36)*k,w:(8+hash(i,18,o.seed)*7)*k,lean:side*15,back:false},phase);
  }
}

// CPU authoring analogue of EffectDissolveDistort: warped color sampling, noise threshold,
// straight-alpha coverage and derivative-based rough ink. Directional bias and root anchoring
// are authoring additions, NOT features already present in the attached Unity shader.
function shadeFlames(ctx,t,o){
  const {rawCtx,shaded,shadedCtx}=buffers(ctx);paintFlames(rawCtx,t,o);
  const x0=260,y0=220,width=510,height=660;
  const source=rawCtx.getImageData(x0,y0,width,height).data,result=shadedCtx.createImageData(width,height),out=result.data;
  const {noise,distort}=fields(o.seed),scroll=t/meta.duration*FIELD,amountOverride=clamp(o.dissolve);
  for(let y=1;y<height-1;y++){
    const py=y+y0,rise=clamp((RIM-py)/440),anchor=smooth(0,0.6,rise);
    const amount=amountOverride>=1?1:clamp(amountOverride+0.14+0.40*smooth(0.20,0.97,rise));
    const dyTex=py*0.14+scroll;
    for(let x=1;x<width-1;x++){
      const px=x+x0;
      const dx=(sample(distort,px*0.28,py*0.16+scroll)-0.5)*33*o.distortion*anchor;
      const dy=(sample(distort,px*0.23+89,py*0.18+scroll)-0.5)*13*o.distortion*anchor;
      const sx=x+dx,sy=y+dy,ix=Math.floor(sx),iy=Math.floor(sy);
      if(ix<0||iy<0||ix>=width-1||iy>=height-1)continue;
      const u=sx-ix,v=sy-iy,j=(iy*width+ix)*4,j1=j+width*4;
      const a00=source[j+3],a10=source[j+7],a01=source[j1+3],a11=source[j1+7];
      const a=mix(mix(a00,a10,u),mix(a01,a11,u),v);if(a<0.5)continue;
      const nx=px*0.30+dx*0.3,ny=dyTex+dy*0.14,n=sample(noise,nx,ny);
      // For an authored R=.2+.8*n, the source's max(R,.2) and inverse remap cancel.
      const coverage=amount>=1?0:clamp((n-amount)/0.07);if(coverage<=0)continue;
      const gx=sample(noise,nx+0.30,ny)-n,gy=sample(noise,nx,ny+0.14)-n;
      const distance=(n-amount)/Math.max(Math.hypot(gx,gy),0.00001);
      const grain=sample(noise,px*4,py*0.55),inkWidth=1.9*mix(1,0.55+grain,o.roughness);
      const ink=(1-smooth(Math.max(0,inkWidth-0.65),inkWidth,distance))*mix(1,smooth(0.18,0.48,grain),o.roughness)*0.75;
      const i=(y*width+x)*4,warmInk=[161,52,25];
      for(let channel=0;channel<3;channel++){
        const c=mix(mix(source[j+channel]*a00,source[j+channel+4]*a10,u),mix(source[j1+channel]*a01,source[j1+channel+4]*a11,u),v)/a;
        out[i+channel]=mix(c*(0.92+grain*0.14),warmInk[channel],ink);
      }
      out[i+3]=a*Math.max(coverage,ink);
    }
  }
  shadedCtx.clearRect(0,0,W,H);shadedCtx.putImageData(result,x0,y0);return shaded;
}

function glowDisc(ctx,x,y,rx,ry,strength,rgb='255,143,52'){
  ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);
  g.addColorStop(0,`rgba(${rgb},${strength})`);g.addColorStop(0.3,`rgba(${rgb},${strength*0.52})`);
  g.addColorStop(0.68,`rgba(${rgb},${strength*0.12})`);g.addColorStop(1,`rgba(${rgb},0)`);
  ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();
}
function paintSmoke(ctx,t,o){
  for(let i=0;i<16;i++){
    const life=1.6+hash(i,41,o.seed)*1.2,age=wrap(t-hash(i,40,o.seed)*meta.duration,meta.duration);if(age>=life)continue;
    const u=age/life,side=hash(i,42,o.seed)*2-1,x=512+side*55+side*age*17+Math.sin(age*2+i)*14;
    const y=610-age*(100+hash(i,43,o.seed)*32),r=14+u*31,alpha=Math.sin(u*Math.PI)*0.065;
    glowDisc(ctx,x,y,r*1.3,r*1.9,alpha*1.7,'105,91,98');
    glowDisc(ctx,x-r*0.28,y+r*0.25,r,r*1.4,alpha*0.7,'147,109,88');
  }
}
function paintSparks(ctx,t,o,lightOnly=false){
  for(let i=0;i<34;i++){
    const age=wrap(t-hash(i,51,o.seed)*meta.duration,meta.duration),life=0.85+hash(i,52,o.seed)*1.5;if(age>=life)continue;
    const u=age/life,side=hash(i,53,o.seed)*2-1,x=512+side*100+side*35*age+9*Math.sin(age*2.7+i);
    const y=810-(240+hash(i,54,o.seed)*190)*(1-Math.exp(-age*1.15)),lift=age*90;
    const fade=smooth(0,0.06,u)*(1-smooth(0.45,1,u)),size=0.9+hash(i,55,o.seed)*1.6;
    if(lightOnly){glowDisc(ctx,x,y-lift,size*7,size*7,0.18*fade*o.glow);continue;}
    const color=u<0.3?'#fff2ad':u<0.65?'#ffc65b':'#e77237';
    stroke(ctx,[[x-side*1.5,y-lift+(9-5*u)*size],[x,y-lift]],'#ee813b',size*1.7,fade*0.42);
    stroke(ctx,[[x-side,y-lift+(5-3*u)*size],[x,y-lift]],color,size,fade*0.95);
  }
}
function paintStand(ctx){
  polygon(ctx,[[501,927],[522,929],[531,1125],[518,1151],[501,1149]],'#28252c');
  stroke(ctx,[[508,956],[510,1118],[506,1138]],'#625255',3);
  ctx.globalAlpha=1;ctx.strokeStyle='#25232c';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(512,1058,96,16,0,Math.PI,TAU);ctx.stroke();
  for(const side of [-1,1]){
    const p=x=>512+x*side;
    polygon(ctx,[[p(69),929],[p(85),934],[p(126),1116],[p(144),1133],[p(148),1144],[p(118),1143],[p(111),1122]],'#29272f');
    stroke(ctx,[[p(72),945],[p(118),1123],[p(132),1137]],'#645353',4);
    stroke(ctx,[[p(82),960],[p(123),1117]],'#151820',5);
    polygon(ctx,[[p(113),1137],[p(150),1136],[p(157),1144],[p(116),1148]],'#211f28');
    stroke(ctx,[[p(121),1138],[p(149),1139]],'#625057',2);
  }
  ctx.strokeStyle='#51434a';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(512,1058,96,16,0,0,Math.PI);ctx.stroke();
  stroke(ctx,[[493,1148],[533,1148]],'#24212a',10);
}
function paintCoals(ctx,t,seed){
  ellipse(ctx,512,RIM-1,143,28,'#211d25');
  for(let row=0;row<3;row++)for(let col=0;col<9;col++){
    const id=row*9+col,x=403+col*26+hash(id,80,seed)*9+(row%2)*7,y=RIM-16+row*12,sx=(x-512)/134;
    if(Math.abs(sx)>0.96)continue;
    const r=11+hash(id,81,seed)*6,heat=0.5+0.5*Math.sin(t/meta.duration*TAU*3+id);
    const p=[[x-r,y+3],[x-r*0.55,y-r*0.6],[x+r*0.3,y-r*0.75],[x+r,y-1],[x+r*0.6,y+r*0.6],[x-r*0.5,y+r*0.7]];
    polygon(ctx,p,heat>0.7?'#ae462b':'#65302b');
    polygon(ctx,p.map(([px,py])=>[mix(px,x,0.23),mix(py,y,0.23)]),'#33252b');
    stroke(ctx,[[x-r*0.5,y+1],[x,y-r*0.3],[x+r*0.45,y-r*0.2]],'#ff9a42',1.3,0.3+heat*0.5);
  }
}
function paintBowl(ctx,t){
  const fl=0.8+0.1*Math.sin(t/meta.duration*TAU*3)+0.08*Math.sin(t/meta.duration*TAU*7);
  ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(363,RIM+4);
  ctx.bezierCurveTo(377,915,403,950,468,961);ctx.bezierCurveTo(509,969,558,966,589,950);
  ctx.bezierCurveTo(633,932,650,900,661,RIM+4);ctx.closePath();ctx.fillStyle='#24212b';ctx.fill();
  polygon(ctx,[[374,878],[416,886],[444,940],[477,956],[424,938],[398,913]],'#3d323b');
  polygon(ctx,[[416,888],[480,896],[488,957],[452,945]],'#49363c');
  polygon(ctx,[[480,896],[548,895],[536,961],[489,958]],'#352a34');
  polygon(ctx,[[548,895],[638,877],[606,928],[568,949],[536,961]],'#1e1d28');
  stroke(ctx,[[391,898],[403,916],[430,935]],'#785348',3,0.65);
  stroke(ctx,[[439,914],[447,930]],'#725047',2,0.6);stroke(ctx,[[462,942],[478,947]],'#765046',2,0.4);
  stroke(ctx,[[576,945],[596,933]],'#4f3b40',2,0.6);
  // Near rim only: a full opaque ellipse here would look like a lid over the coals.
  ctx.fillStyle='#352a33';ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(363,RIM);
  ctx.bezierCurveTo(405,RIM+31,614,RIM+31,661,RIM);ctx.lineTo(657,RIM+25);
  ctx.bezierCurveTo(586,RIM+53,433,RIM+54,367,RIM+25);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#a66a45';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(512,RIM,147,20,0,0,Math.PI);ctx.stroke();
  ctx.strokeStyle='#e1a16b';ctx.lineWidth=3;ctx.globalAlpha=fl*0.8;
  ctx.beginPath();ctx.ellipse(512,RIM,145,19,0,0.08,Math.PI-0.08);ctx.stroke();
  for(let i=0;i<11;i++){
    const a=0.18+i/10*(Math.PI-0.36),x=512+Math.cos(a)*139,y=RIM+18+Math.sin(a)*22;
    ellipse(ctx,x,y,3.5,3.5,'#191923');ellipse(ctx,x-0.8,y-1,1.7,1.3,'#ab7b5c',fl*0.7);
  }
  ctx.globalAlpha=1;
}
export function draw(ctx,time,options={}){
  const o={...meta.options,...options},t=wrap(time,meta.duration),width=o.width??ctx.canvas.width,height=o.height??ctx.canvas.height;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.scale(width/W,height/H);ctx.globalCompositeOperation='source-over';
  const color=o.layer!=='glow',light=o.layer!=='color',visible=1-clamp(o.dissolve);
  if(light&&o.glow>0){
    const breath=0.9+0.08*Math.sin(t/meta.duration*TAU*3)+0.04*Math.sin(t/meta.duration*TAU*7);
    glowDisc(ctx,512,720,305,364,0.12*o.glow*breath*visible);
    glowDisc(ctx,512,825,205,143,0.13*o.glow*breath*visible,'255,188,79');
    if(o.prop)glowDisc(ctx,512,1153,235,39,0.13*o.glow*visible);
    paintSparks(ctx,t,o,true);
  }
  if(color){
    paintSmoke(ctx,t,o);
    if(o.prop){paintStand(ctx);ellipse(ctx,512,RIM-1,151,27,'#2a232b');
      stroke(ctx,[[365,RIM-4],[409,RIM-20],[510,RIM-29],[603,RIM-19],[657,RIM-4]],'#795443',4);paintCoals(ctx,t,o.seed);}
    ctx.globalAlpha=1;ctx.drawImage(shadeFlames(ctx,t,o),0,0);
    if(o.prop)paintBowl(ctx,t);paintSparks(ctx,t,o);
  }
  ctx.restore();
}
