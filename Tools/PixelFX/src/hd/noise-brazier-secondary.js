// Analytic seeded particle authoring. Two static stamps, no atlas or frame scheduling.
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,u)=>a+(b-a)*u;
const hash=(x,s)=>{const f=Math.sin(x*127.1+s*74.17)*43758.5453;return f-Math.floor(f);};
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
export const secondaryDefaults={sparkDensity:1,smokeDensity:1,smokeOpacity:.18,wind:.12};
export function sparkParticles(time,o){
  const t=time*o.flow,result=[],visibility=1-smooth(.6,1,o.dissolve);
  for(let i=0;i<128;i++){
    if(hash(i+411,o.seed)>=o.sparkDensity/2)continue;
    const age=((t-hash(i+12,o.seed)*8)%8+8)%8,ember=i%4===0;
    const life=ember?1.9+hash(i+73,o.seed)*1.15:.9+hash(i+73,o.seed)*1.25;if(age>=life)continue;
    const u=age/life,side=hash(i+94,o.seed)*2-1,drag=ember?.9:1.35;
    const vx=side*(ember?56:112),up=ember?140:225+hash(i+18,o.seed)*125,e=Math.exp(-drag*age);
    const sway=(ember?16:9)*(Math.sin(age*2.6+i)-Math.sin(i))*clamp(age*2);
    const x=512+side*102+vx*(1-e)/drag+o.wind*age*34+sway;
    const y=806-hash(i+162,o.seed)*140-up*(1-e)/drag-age*(ember?65:94);
    const dx=vx*e+o.wind*34+(ember?16:9)*2.6*Math.cos(age*2.6+i);
    const dy=-up*e-(ember?65:94);
    const alpha=smooth(0,.07,u)*(1-smooth(.40,1,u))*visibility;
    const width=((ember?3.4:2.3)+hash(i+213,o.seed)*(ember?2.0:1.3))*(ember?.62+.38*Math.abs(Math.sin(age*6+i)):1);
    const length=ember?width*(1.1+.6*Math.abs(Math.sin(age*7+i))):mix(15+hash(i+231,o.seed)*13,5,u);
    result.push({id:i,x,y,age,u,ember,width,length,rotation:Math.atan2(dy,dx),alpha,
      color:u<.3?'#fff1b2':u<.65?'#ffc258':'#e86c2e'});
  }
  return result;
}
export function smokeParticles(time,o){
  const t=time*o.flow,result=[],visibility=1-smooth(.6,1,o.dissolve);
  for(let i=0;i<56;i++){
    if(hash(i+341,o.seed)>=o.smokeDensity/2)continue;
    const age=((t-hash(i+305,o.seed)*8)%8+8)%8,life=2.3+hash(i+317,o.seed)*.70;if(age>=life)continue;
    const u=age/life,side=hash(i+389,o.seed)*2-1;
    const x=512+side*46+(side*10+o.wind*42)*age+Math.sin(age*1.8+i)*20*clamp(age);
    const y=620-hash(i+332,o.seed)*70-age*(95+hash(i+365,o.seed)*25)-age*age*4.5;
    const size=(74+hash(i+373,o.seed)*26)*(1+u*1.4);
    const alpha=smooth(0,.20,u)*(1-smooth(.5,1,u))*o.smokeOpacity*visibility;
    result.push({id:i,x,y,age,u,size,alpha,rotation:(hash(i+391,o.seed)-.5)*TAU+age*(.10+side*.10),color:u<.26?'#9d8370':u<.6?'#817d80':'#747985'});
  }
  return result;
}
const caches=new WeakMap();
function tinted(ctx,image,color){
  let images=caches.get(image);if(!images){images=new Map();caches.set(image,images);}if(images.has(color))return images.get(color);
  const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(image.width,image.height):ctx.canvas.ownerDocument?ctx.canvas.ownerDocument.createElement('canvas'):new ctx.canvas.constructor(image.width,image.height);
  c.width=image.width;c.height=image.height;
  const g=c.getContext('2d');g.drawImage(image,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);images.set(color,c);return c;
}
export function drawSmoke(ctx,time,o,assets){
  if(!assets.smoke||o.smokeDensity<=0)return;
  for(const q of smokeParticles(time,o)){
    ctx.save();ctx.globalAlpha=q.alpha;ctx.translate(q.x,q.y);ctx.rotate(q.rotation);
    const w=q.size*(.90+q.u*.55),h=q.size*1.15;
    ctx.drawImage(tinted(ctx,assets.smoke,q.color),-w/2,-h/2,w,h);ctx.restore();
  }
}
export function drawSparks(ctx,time,o,assets,light=false){
  if(!assets.spark||o.sparkDensity<=0)return;
  for(const q of sparkParticles(time,o)){
    ctx.save();ctx.globalAlpha=q.alpha*(light?.14*o.glow:.92);ctx.translate(q.x,q.y);ctx.rotate(q.rotation);
    // Stamp's alpha occupies 86% of X and ~9% of Y; dimensions below are visible size.
    const w=q.length/.86,h=q.width/.09;
    const spread=light?3.5:1;
    ctx.drawImage(tinted(ctx,assets.spark,light?'#ff9d40':q.color),-w/2,-h*spread/2,w,h*spread);
    if(!light&&!q.ember){
      ctx.globalAlpha=q.alpha;const head=q.u<.45?'#fff4cd':'#ffd277';
      ctx.drawImage(tinted(ctx,assets.spark,head),w*.12,-h*.34,w*.24,h*.68);
    }
    ctx.restore();
  }
}
