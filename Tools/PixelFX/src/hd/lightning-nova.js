// Original HD lightning nova. Project-local pixelfx helpers, no external assets or frame animation.
import { clamp, smooth, ease, rand, TAU } from '../core/math.js';
export const meta={id:'hd/lightning-nova',name:'雷霆环爆',version:'V1.3',duration:1.2,fps:60,loop:false,actor:false,
  options:{seed:69,radius:2.5,intensity:1,glow:0.65,density:1,core:'#f5ffff',body:'#73eaff',edge:'#387bfa',spark:'#bcf7ff'}};
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1)),color=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255),alpha=(c,a)=>[...c,clamp(a)];
const point=(r,a,h=0.055)=>[r*Math.cos(a),h,r*Math.sin(a)],lerp3=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
// Sort small spatial brush marks, keeping the color passes of one tube segment together.
// Depth-testing nested opaque tubes would hide their white inner channel instead.
function paint(out,anchor,draw){const start=out.length,previous=out.painting;out.painting=true;draw();out.painting=previous;if(out.groups)out.groups.push({start,end:out.length,anchor});}
function tri(out,a,b,c,ca,cb=ca,cc=ca){const start=out.length;out.push(...a,...ca,...b,...cb,...c,...cc);if(out.groups&&!out.painting)out.groups.push({start,end:out.length,anchor:mul(add(add(a,b),c),1/3)});}
function quad(out,a,b,c,d,ca,cb=ca,cc=ca,cd=ca){tri(out,a,b,c,ca,cb,cc);tri(out,a,c,d,ca,cc,cd);}

// Six-sided channel: a real spatial tube, not an entire effect billboard.
function channel(out,pts,width,c,a,seed=0){
  if(a<0.002||width<=0)return;
  for(let i=0;i<pts.length-1;i++){
    const t=unit(sub(pts[i+1],pts[i])),x=unit(cross(t,Math.abs(t[1])>0.9?[0,0,1]:[0,1,0])),y=unit(cross(t,x));
    const profile=j=>0.48+1.32*rand(seed,j,4);
    const r0=width*profile(i),r1=width*profile(i+1);
    const off=(angle,r)=>add(mul(x,Math.cos(angle)*r),mul(y,Math.sin(angle)*r));
    paint(out,lerp3(pts[i],pts[i+1],0.5),()=>{for(let k=0;k<6;k++){
      const a0=k*TAU/6,a1=(k+1)*TAU/6,C=alpha(c,a);
      quad(out,add(pts[i],off(a0,r0)),add(pts[i],off(a1,r0)),add(pts[i+1],off(a1,r1)),add(pts[i+1],off(a0,r1)),C);
    }});
  }
}
function bolt(seed,epoch,height=4.5,bottom=0.12,lean=0){
  return Array.from({length:13},(_,i)=>{const q=i/12,s=Math.sin(Math.PI*q);
    return [lean*(1-q)+(rand(seed,epoch,i,1)-0.5)*0.62*s,height*(1-q)+bottom*q,(rand(seed,epoch,i,2)-0.5)*0.42*s];});
}
// Leader -> hot return current -> unequal local burnouts -> short residual restrikes.
// Each cell has a different lifetime, so the stroke never fades as one uniform ring.
export function currentAt(age,u,seed){
  const cell=Math.floor(u*12),a=age-.024*u-rand(seed,cell,80)*.008,burn=.11+rand(seed,cell,81)*.085;
  const live=smooth(0,.006,a)*(1-smooth(burn,burn+.018,a));
  const epoch=Math.floor(Math.max(0,a)*55),flicker=.58+.42*rand(seed,cell,epoch,82);
  const surge=Math.exp(-Math.pow((a-(.035+u*.045))/.011,2));
  const restrikeAt=burn+.024+rand(seed,cell,83)*.035;
  const restrike=smooth(restrikeAt,restrikeAt+.003,a)*(1-smooth(restrikeAt+.009,restrikeAt+.018,a))*.75;
  return {alpha:Math.max(live*flicker,restrike),hot:Math.max(live*surge,restrike),width:.55+.45*Math.max(live,surge),breakAge:a-burn};
}
function ringStroke(out,light,{radius,angle,span,width,height,tilt=[0,0],bow=0,fall=0,spiral=0,seed,opacity,time=0},C,glow){
  // A tapered diamond-section electric filament follows a 3D path, not a radial floor strip.
  const n=Math.ceil(Math.abs(span)*12),pts=[],sections=[];
  for(let i=0;i<=n;i++){
    const u=i/n,a=angle+span*u,kink=(rand(seed,i,72)-0.5)*0.045+(i%8===4?.09+rand(seed,i,75)*.06:0);
    const r=radius*(1-spiral+spiral*u+.02*Math.sin(a*3+seed))+kink,p=point(r,a);
    p[1]=Math.max(0.055,height+tilt[0]*p[0]+tilt[1]*p[2]+bow*Math.sin(Math.PI*u)+fall*(1-u)+.1*Math.sin(u*TAU)+(rand(seed,i,73)-0.5)*0.035);
    pts.push(p);
  }
  for(let i=0;i<=n;i++){
    const u=i/n,t=unit(sub(pts[Math.min(n,i+1)],pts[Math.max(0,i-1)])),side=unit(cross(t,[0,1,0])),up=unit(cross(side,t));
    const w=width*Math.pow(Math.max(0,Math.sin(Math.PI*u)),0.65)*(0.65+0.45*rand(seed,i,74)+.45*Math.exp(-Math.pow((u-.72)/.09,2)));
    sections.push({side,up,w,p:pts[i],corners:[add(pts[i],mul(side,-w*.5)),add(pts[i],mul(up,w*.35)),add(pts[i],mul(side,w*.5)),add(pts[i],mul(up,-w*.35))]});
  }
  for(let i=0;i<n;i++){
    const a=sections[i],b=sections[i+1],flow=currentAt(time,(i+.5)/n,seed),strength=opacity*flow.alpha;
    if(strength<.012)continue;
    const corner=(s,k)=>lerp3(s.p,s.corners[k],flow.width),ramp=[C.edge,flow.hot>.45?C.core:C.body,C.body,C.edge];
    // Unlike the nested legacy bolt, this is a single shell: sort its individual faces.
    for(let k=0;k<4;k++){const next=(k+1)%4,c=alpha(ramp[k],strength),d=alpha(ramp[next],strength);quad(out,corner(a,k),corner(b,k),corner(b,next),corner(a,next),c,c,d,d);}
    if(glow>0){const off=(s,k)=>add(s.p,mul(s.side,s.w*k)),hot=alpha(C.body,strength*glow*(.035+.09*flow.hot)),cold=alpha(C.edge,0);
      quad(light,off(a,-2.2),off(b,-2.2),b.p,a.p,cold,cold,hot,hot);
      quad(light,a.p,b.p,off(b,2.2),off(a,2.2),hot,hot,cold,cold);}
  }
  if(opacity>.12){
    const j=Math.floor(n*.67),p=pts[j],radial=unit([p[0],0,p[2]]),tangent=unit(sub(pts[j+1],pts[j-1]));
    const fork=[p,add(p,add(mul(radial,.15),[0,.075,0])),add(p,add(mul(tangent,.1),[0,.12,0])),add(p,add(mul(radial,.3),[0,.2,0]))];
    const flow=currentAt(time,.67,seed),epoch=Math.floor(time*35);
    fork[2][1]+=(rand(seed,epoch,84)-.5)*.12;
    channel(out,fork,.006,C.body,opacity*flow.alpha*(epoch%3===1?.15:1),seed);
    // Hot packets peel short double filaments away; broken ends spit tiny moving charges.
    for(let i=2;i<n-2;i+=5){const u=i/n,s=sections[i],f=currentAt(time,u,seed),v=unit(sub(pts[i+1],pts[i-1]));
      if(f.hot>.45){const off=mul(s.up,.04),p=add(s.p,off),end=add(pts[i+2],off);channel(out,[p,add(lerp3(p,end,.5),mul(s.side,.04)),end],.004,C.core,opacity*f.hot,seed+i);}
      if(f.breakAge>0&&f.breakAge<.045){const q=f.breakAge/.045,p=add(s.p,add(mul(s.side,q*.13),[0,q*.09,0]));shard(out,p,add(v,s.up),.045*(1-q),.008,C.spark,(1-q)*opacity);}
    }
  }
  if(out.paths)out.paths.push({points:pts,widths:sections.map(s=>s.w)});
}
function pool(out,r,y,c,a){if(a<0.001)return;for(let i=0;i<72;i++)tri(out,[0,y,0],point(r,i*TAU/72,y),point(r,(i+1)*TAU/72,y),alpha(c,a),alpha(c,0),alpha(c,0));}
function shard(out,p,v,len,w,c,a){
  const d=unit(v),side=unit(cross(d,Math.abs(d[1])>0.9?[0,0,1]:[0,1,0])),up=unit(cross(d,side)),tip=add(p,mul(d,len)),tail=add(p,mul(d,-len*0.6));
  quad(out,tail,add(p,mul(side,w)),tip,add(p,mul(side,-w)),alpha(c,a));
  quad(out,tail,add(p,mul(up,w*0.7)),tip,add(p,mul(up,-w*0.7)),alpha(c,a*0.7));
}
export function createFrameGeometry(t,options={}){
  const o={...meta.options,...options},frame={color:[],light:[],layers:{},ringPaths:[],time:t};frame.color.groups=[];frame.color.paths=frame.ringPaths;
  if(t<=0||t>=meta.duration)return frame;
  const C=Object.fromEntries(['core','body','edge','spark'].map(k=>[k,color(o[k])])),seed=o.seed|0,age=t-0.1;
  const layer=(name,fn)=>{if(o.layers?.[name]===false)return;const c=frame.color.length,l=frame.light.length;fn();frame.layers[name]={colorVertices:(frame.color.length-c)/7,lightVertices:(frame.light.length-l)/7};};
  layer('light',()=>{
    const charge=smooth(0,0.075,t)*(1-smooth(0.09,0.105,t)),flash=smooth(0.1,0.104,t)*(1-smooth(0.125,0.225,t));
    pool(frame.light,(0.5+o.radius*1.1)*(0.25+0.75*smooth(.1,.155,t)),0.012,C.body,(0.08*charge+0.9*flash)*o.glow);
    pool(frame.light,0.65,0.025,C.core,0.85*flash*o.glow);
  });
  layer('bolt',()=>{
    [{start:0.1,life:0.108,k:1},{start:0.23,life:0.04,k:0.36},{start:0.355,life:0.04,k:0.18}].forEach((s,j)=>{
      const a=t-s.start;if(a<0||a>s.life)return;const q=a/s.life,epoch=Math.floor(a*24),flick=[1,0.84,1,0.6,0.88,0.35][epoch%6];
      const k=s.k*flick*(1-smooth(.2,1,q))*o.intensity,pts=bolt(seed,j*7+epoch,4.5,0.18,0.26);
      // The hot return stroke climbs upward; later current breaks into separate channels.
      for(let i=0;i<pts.length-1;i++){
        const segment=pts.slice(i,i+2),hot=smooth((1-i/12)*.013,(1-i/12)*.013+.003,a),cut=j===0&&a>.065&&rand(seed,i,epoch,90)>.62;
        if(cut)continue;const w=k*(.7+.3*rand(seed,i,91));
        channel(frame.color,segment,.105*w,C.edge,.85,seed+i);channel(frame.color,segment,.08*w,C.body,1,seed+i);channel(frame.color,segment,.055*w,C.core,hot,seed+i);
        if(o.glow>0)channel(frame.light,segment,.16*w,C.body,.075*o.glow*hot,seed+i);
      }
      for(let b=0;b<3;b++){const origin=pts[3+b*2],dir=b%2?-1:1,end=add(origin,[dir*(0.45+rand(seed,b)*0.32),0.4,0.35*(b-1)]),mid=lerp3(origin,end,0.45);mid[1]-=0.15;
        channel(frame.color,[origin,mid,add(mid,[dir*0.06,0.22,0.03]),end],0.013*k,C.body,k,seed+b);}
    });
    if(t>0.055&&t<0.1){const pts=bolt(seed,0),head=smooth(.055,.1,t)*12,i=Math.min(11,Math.floor(head)),leader=[...pts.slice(0,i+1),lerp3(pts[i],pts[i+1],head-i)];channel(frame.color,leader,.011,C.body,.7,seed);shard(frame.color,leader.at(-1),[0,-1,0],.12,.024,C.core,.85);}
  });
  layer('impact',()=>{
    if(age<0||age>.175)return;
    const flash=smooth(0,.003,age)*(1-smooth(.023,.057,age))*o.intensity;
    const coreFlash=smooth(0,.003,age)*(1-smooth(.018,.037,age))*o.intensity,rCore=(.1+.22*ease.outCubic(clamp(age/.013)))*(1-smooth(.018,.04,age));
    if(coreFlash>.01)for(let i=0;i<4;i++){
      const a=point(rCore,i*TAU/4,.28),b=point(rCore,(i+1)*TAU/4,.28),c=alpha(C.core,coreFlash);
      tri(frame.color,a,b,[0,.28+rCore*1.3,0],c);tri(frame.color,b,a,[0,.065,0],c);
    }
    // A brief three-dimensional white-hot star, immediately followed by negative space.
    if(flash>.002)for(let i=0;i<10;i++){
      const a=i*TAU/10+rand(seed,i,100)*.15,reach=(.42+rand(seed,i,101)*.55)*(.35+.65*ease.outCubic(clamp(age/.018)));
      const p=point(.12,a,.25),tip=point(reach,a,.18+rand(seed,i,102)*.9),side=point(.08,a+Math.PI/2,0);
      tri(frame.color,add(p,side),tip,sub(p,side),alpha(C.core,flash));
    }
    for(let i=0;i<18;i++){
      const delay=rand(seed,i,103)*.018,a=age-delay;if(a<0||a>.155)continue;
      const q=a/.155,theta=i*2.399,r=o.radius*(.05+.92*ease.outCubic(q)),h=.1+Math.sin(q*Math.PI)*(.08+rand(seed,i,104)*.35),p=point(r,theta,h);
      shard(frame.color,p,[Math.cos(theta),.08,Math.sin(theta)],(.16+rand(seed,i,105)*.32)*(1-q),.025*(1-q),i%3?C.core:C.body,(1-smooth(.28,1,q))*o.intensity);
    }
    // Broken radial jets carry the hit out of the core; they are gone before the ring cools.
    if(age>.006&&age<.11)for(let i=0;i<9;i++){
      const q=clamp((age-.006)/.104),theta=i*TAU/9+rand(seed,i,106)*.18,r=o.radius*(.08+.77*ease.outCubic(q)),length=(.35+rand(seed,i,107)*.55)*(1-q),h=.1+Math.sin(q*Math.PI)*(.12+rand(seed,i,108)*.4),w=.018*(1-q);
      const pts=[point(Math.max(.05,r-length),theta,h*.65),point(r-length*.45,theta+.035,h),point(r-length*.52,theta-.02,h*.8),point(r,theta,h*.6)],strength=(1-smooth(.15,1,q))*o.intensity;
      channel(frame.color,pts,w*1.5,C.body,strength,seed+i+100);channel(frame.color,pts,w*.65,C.core,strength,seed+i+100);
    }
    const q=clamp((age-.008)/.14),r=o.radius*(.07+.96*ease.outCubic(q)),fade=smooth(.008,.015,age)*(1-smooth(.075,.16,age));
    if(fade>.002)for(let i=0;i<64;i++){
      if(i%16>12)continue;
      const a=i*TAU/64,next=(i+1)*TAU/64,k=1+.016*Math.sin(i*2.4+seed),w=.014*(1-q),c=alpha(C.body,fade*.8),tail=alpha(C.edge,0);
      quad(frame.color,point(r*k,a,.035),point(r*k,next,.035),point(r*k-w,next,.035),point(r*k-w,a,.035),c,c,c,c);
      if(o.glow>0)quad(frame.light,point(r*k,a,.034),point(r*k,next,.034),point(Math.max(0,r*k-.12),next,.034),point(Math.max(0,r*k-.12),a,.034),alpha(C.body,fade*.1*o.glow),alpha(C.body,fade*.1*o.glow),tail,tail);
    }
  });
  layer('crown',()=>{
    if(age<0||age>0.175)return;const a=(1-smooth(0.035,0.16,age))*smooth(0,0.008,age),release=smooth(.025,.15,age);
    for(let i=0;i<11;i++){
      const angle=i*TAU/11+rand(seed,i,9)*0.28,height=(0.5+rand(seed,i,10)*1.15)*(0.6+0.4*ease.outCubic(clamp(age/0.055))),reach=0.13+rand(seed,i,11)*0.42;
      const root=point(.06+release*.4,angle,.14),elbow=point(reach*(.85+release),angle,.3+height*.22),notch=point(reach*(.35+release),angle+.05,.28+height*.42),tip=point(reach*(1.4+release*2),angle,.24+height*(1-release*.5)),side=point((.085+rand(seed,i,12)*.08)*(1-release),angle+Math.PI/2,0);
      const pts=[root,add(elbow,side),notch,tip,add(notch,mul(side,-0.6)),add(elbow,mul(side,-1))];
      for(let k=1;k<pts.length-1;k++)tri(frame.color,pts[0],pts[k],pts[k+1],alpha(i%3?C.body:C.core,a));
      channel(frame.color,[root,elbow,notch,tip],0.012,C.core,a,seed+i);
    }
  });
  layer('rings',()=>{
    for(let band=0;band<2;band++){
      const a=age-0.018-band*0.028;if(a<0||a>0.36)continue;const u=clamp(a/0.16),r=o.radius*(0.11+0.89*ease.outCubic(u))*(1-band*0.27),opacity=(1-smooth(0.13,0.36,a))*smooth(0,0.016,a);
      const count=band?2:3;
      for(let i=0;i<count;i++){const s=seed+band*23+i;
        ringStroke(frame.color,frame.light,{radius:r*(0.97+rand(s,2)*0.055),angle:i*TAU/count+0.1+rand(s,3)*0.16+band*0.47+a*(band?-2.8:3.2),span:(band?[1.8,2.3][i]:[1.35,1.8,1.6][i])+rand(s,4)*.2,width:(0.048+rand(s,1)*0.018)*(1-0.25*u),height:(band?.8:.46)*smooth(0,.08,a),tilt:band?[-.16,.34]:[.1,-.15],bow:band?.18:.12,seed:s,opacity:opacity*(band?.9:1),time:a-i*.004},C,o.glow);}
    }
    if(age>0.035&&age<0.27)for(let i=0;i<2;i++){
      const q=clamp((age-0.035)/.235);
      ringStroke(frame.color,frame.light,{radius:o.radius*(.24+.5*ease.outCubic(q)),angle:i?1+q*.7:-2.1+q*2,span:i?2.8:3.4,width:.048*(1-q*.6),height:.14,tilt:[.04,-.02],bow:.12,fall:(i?.8:1.35)*(1-q*.5),spiral:.68,seed:seed+80+i,opacity:(1-smooth(.35,1,q))*.9,time:age-.035-i*.009},C,o.glow*.4);
    }
    // Broken tangential splinters catch the burst. These are not extra complete circles.
    if(age>0.04&&age<0.26)for(let i=0;i<7;i++){
      const q=(age-0.04)/0.22,a=i*2.399+0.4,r=o.radius*(0.2+0.7*ease.outCubic(q)),p=point(r,a,0.15);
      const v=[-Math.sin(a)+0.5*Math.cos(a),0.08,Math.cos(a)+0.5*Math.sin(a)];
      shard(frame.color,p,v,0.16*(1-q),0.014*(1-q),C.core,1-smooth(0.3,1,q));
    }
  });
  layer('arcs',()=>{
    for(let i=0;i<Math.round(17*o.density);i++){
      const start=0.15+rand(seed,i,30)*0.11,life=0.15+rand(seed,i,31)*0.21,a=t-start;if(a<=0||a>=life)continue;
      const q=a/life,angle=i*2.399+rand(seed,i,32)*0.3,r=o.radius*(0.53+rand(seed,i,33)*0.42),epoch=Math.floor(a*22),h=0.15+rand(seed,i,34)*0.5;
      const pts=[point(r,angle),point(r-0.13,angle+0.03,h*0.45),point(r+0.1,angle+0.055,h*0.55),point(r-0.04,angle+0.08,h),point(r+0.2,angle+0.13,h*0.8)];pts[2][1]+=rand(seed,i,epoch)*0.12;
      // Mix upright forks, low tangential crawlers and radial jumping discharges.
      if(i%3===1)for(let j=0;j<5;j++)pts[j]=point(r+(j%2?.07:-.05),angle+j*.07,.075+(j%2?.12:.02));
      if(i%3===2)for(let j=0;j<5;j++)pts[j]=point(r*(.78+j*.065)+(j%2?.08:-.04),angle+(j%2?.03:-.02),.1+Math.sin(j*Math.PI/4)*h*.45);
      const k=(1-smooth(.5,1,q))*(epoch%3===1?.18:1);
      for(let j=0;j<4;j++){const f=currentAt(a,j/4,seed+i+200),segment=pts.slice(j,j+2),w=i%3===0?.0075:.0055;
        channel(frame.color,segment,w*2,C.edge,k*f.alpha,seed+i);channel(frame.color,segment,w,f.hot>.35?C.core:C.body,k*f.alpha,seed+i);}
      if(i%3===0&&epoch%3!==1){const end=add(pts[2],[.15,.16+rand(seed,i,epoch)*.1,-.1]);channel(frame.color,[pts[2],add(pts[2],[-.06,.07,-.04]),end],.005,C.body,k*currentAt(a,.5,seed+i+200).alpha,seed+i);}
    }
    if(t>.42&&t<.86)for(let i=0;i<3;i++){
      const k=(1-smooth(.5,.86,t))*(Math.floor(t*35+i)%5===0?.7:0),p=point(0.22,i*2.1+t*2,0.16+i*0.15);
      channel(frame.color,[p,add(p,[0.07,0.16,0]),add(p,[-0.1,0.21,0.03]),add(p,[0.06,0.33,0.02])],0.007,C.spark,k,seed+i);
    }
  });
  layer('sparks',()=>{
    for(let i=0;i<Math.round(38*o.density);i++){
      const born=0.13+rand(seed,i,40)*0.13,life=0.25+rand(seed,i,41)*0.46,a=t-born;if(a<0||a>=life)continue;
      const q=a/life,angle=rand(seed,i,42)*TAU,sp=2+rand(seed,i,43)*3.5,d=(1-Math.exp(-a*5))*sp*0.58,h=0.25+a*(1+rand(seed,i,44)*2.5)-a*a*4.8;
      shard(frame.color,point(d,angle,Math.max(0.045,h)),[Math.cos(angle),0.6-2*q,Math.sin(angle)],(0.035+rand(seed,i,45)*0.08)*(1-q),0.009+rand(seed,i,46)*0.008,i%3?C.spark:C.body,(1-smooth(0.1,1,q))*smooth(0,0.055,a));
    }
  });
  return frame;
}
export function makeCamera({yaw=0,elevation=26,distance=9.5,aspect=1,flat=false}={}){
  const y=yaw*Math.PI/180,e=elevation*Math.PI/180,forward=[-Math.sin(y)*Math.cos(e),-Math.sin(e),-Math.cos(y)*Math.cos(e)],right=[Math.cos(y),0,-Math.sin(y)],up=cross(right,forward),target=[0,1.25,0];
  return {forward,right,up,eye:sub(target,mul(forward,distance)),aspect,flat,distance,focal:1/Math.tan(43*Math.PI/360),ortho:6.5};
}
export function projectPoint(p,c){const d=sub(p,c.eye),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),z=dot(d,c.forward),scale=c.flat?2/c.ortho:c.focal/z;return[dot(d,c.right)*scale/c.aspect,dot(d,c.up)*scale,z];}
export function sortColorGeometry(vertices,camera){
  if(!vertices.groups?.length)return vertices;
  const depth=p=>sub(p,camera.eye).reduce((s,v,i)=>s+v*camera.forward[i],0);
  const groups=vertices.groups.map((g,i)=>({...g,depth:depth(g.anchor),order:i})).sort((a,b)=>b.depth-a.depth||a.order-b.order),out=new Float32Array(vertices.length);
  let at=0;for(const g of groups){out.set(vertices.slice(g.start,g.end),at);at+=g.end-g.start;}return out;
}
const VERT=`attribute vec3 a_position;attribute vec4 a_color;uniform vec3 u_eye,u_right,u_up,u_forward;uniform vec4 u_projection;varying vec4 v_color;
void main(){vec3 d=a_position-u_eye;float z=dot(d,u_forward);float w=mix(z,1.0,u_projection.z);float s=mix(u_projection.x,2.0/u_projection.w,u_projection.z);gl_Position=vec4(dot(d,u_right)*s/u_projection.y,dot(d,u_up)*s,0.98*w-0.1,w);v_color=a_color;}`;
const FRAG=`precision mediump float;varying vec4 v_color;void main(){gl_FragColor=vec4(v_color.rgb*v_color.a,v_color.a);}`;
export class NovaRenderer{
  constructor(canvas){
    this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)throw new Error('当前浏览器不支持 WebGL，无法显示空间预览。');
    const compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const p=this.program=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,VERT));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    this.buffer=gl.createBuffer();this.loc={};for(const n of ['u_eye','u_right','u_up','u_forward','u_projection'])this.loc[n]=gl.getUniformLocation(p,n);this.position=gl.getAttribLocation(p,'a_position');this.color=gl.getAttribLocation(p,'a_color');
  }
  render(frame,camera,{grid=true,background='dark',layer='combined'}={}){
    const gl=this.gl,{width,height}=this.canvas;gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(this.color);gl.vertexAttribPointer(this.color,4,gl.FLOAT,false,28,12);
    for(const n of ['eye','right','up','forward'])gl.uniform3fv(this.loc['u_'+n],camera[n]);gl.uniform4f(this.loc.u_projection,camera.focal,camera.aspect,camera.flat?1:0,camera.ortho);
    gl.enable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);
    const draw=(v,additive=false)=>{if(!v.length)return;gl.blendFuncSeparate(gl.ONE,additive?gl.ONE:gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,v.length/7);};
    if(grid){const v=[],c=background==='light'?[0.25,0.34,0.4,0.15]:[0.38,0.54,0.63,0.13];for(let i=-8;i<=8;i++){const d=i*0.5,w=i===0?0.009:0.004;
      quad(v,[-4,-0.015,d-w],[4,-0.015,d-w],[4,-0.015,d+w],[-4,-0.015,d+w],c);quad(v,[d-w,-0.015,-4],[d+w,-0.015,-4],[d+w,-0.015,4],[d-w,-0.015,4],c);}draw(v);}
    if(layer!=='light')draw(sortColorGeometry(frame.color,camera));if(layer!=='color')draw(frame.light,true);
    this.stats={colorVertices:frame.color.length/7,lightVertices:frame.light.length/7,error:gl.getError()};
  }
}
