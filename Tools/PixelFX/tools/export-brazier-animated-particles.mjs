#!/usr/bin/env node
// Individual particle artwork/recipes adapted from pixelfx and Sprite Fusion fire,
// MIT License, Copyright (c) 2026 Hugo Duprez. Never bakes the complete fire into a particle.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createFrame, painterFor, composite, fit, rng, clamp, hex, mix, WHITE } from '../src/core/index.js';
import { noiseFor, flameTongue, hotFirst, LAYERS, BIG_LAYERS, BACK_LAYERS, firePuff, lick, smokePuff, drift } from '../src/fx/fire/_lib.js';
import { encodePNG } from './lib/png.mjs';

const target = resolve(process.argv[2] ?? 'output/unity/BrazierAnimatedParticles');
mkdirSync(target, {recursive:true});
const source = readFileSync(new URL('../src/fx/fire/brazier.js', import.meta.url), 'utf8');
const library = readFileSync(new URL('../src/fx/fire/_lib.js', import.meta.url), 'utf8');
// Expose the original private prop functions without changing the effect's source file.
const moduleText = source.replace('"../../core/index.js"', JSON.stringify(new URL('../src/core/index.js',import.meta.url).href))
  .replace('"./_lib.js"', JSON.stringify(new URL('../src/fx/fire/_lib.js',import.meta.url).href)) + '\nexport { TONGUES, stand, bowl, coals };';
const original = await import('data:text/javascript;base64,'+Buffer.from(moduleText).toString('base64'));
const D=3, S=8, PPU=32, NL=noiseFor(D), H=hotFirst(fit(original.meta.options.palette,9));
const R=rng(S,77), TT=original.TONGUES.map(([dx,y,h,w,back],i)=>({dx:dx+R.range(-.3,.3),y,h:2+32*h*R.range(.92,1.08),w:w*R.range(.92,1.08),back,env:h,n:(S*7+i)*13}));
const flicker=t=>.74+.16*NL(t,7.3,S+1)+.1*NL(t,19,S+2);
const lean=t=>NL(t,.67,S+90)*.1;
const height=(q,t)=>(q.h+.25*q.h*NL(t,3.3,q.n)+q.h*Math.max(0,NL(t,2.6,q.n+70)-.55)*1.4)*(.9+.1*flicker(t));
const sweep=(q,t,h)=>NL(t,2.2,q.n+40)*(1+h*.08)+lean(t)*h*.9-clamp(q.dx*.3,-2.5,2.5);
const tip=(i,t)=>{const q=TT[i],h=height(q,t);return [q.dx+sweep(q,t,h)*.85,q.y-h*.88+3];};
const colorBytes=f=>{const b=new Uint8Array(f.w*f.h*4);f.color.forEach((c,i)=>{b[i*4]=c&255;b[i*4+1]=c>>>8&255;b[i*4+2]=c>>>16&255;b[i*4+3]=c>>>24;});return b;};
// Keep unchanged files' timestamps: rewriting while Unity generates previews can stall its import worker.
const writeChanged=(path,data)=>{const bytes=Buffer.from(data);if(!existsSync(path)||!readFileSync(path).equals(bytes))writeFileSync(path,bytes);};
const save=(name,w,h,b)=>writeChanged(join(target,name+'.png'),encodePNG(w,h,b));
const atlases=[];
function atlas(name,w,h,frames,cols,draw,pivot=[w/2,h/2]) {
  const rows=Math.ceil(frames/cols), data=new Uint8Array(w*cols*h*rows*4);
  for(let i=0;i<frames;i++){
    const f=createFrame(w,h);draw(painterFor(f),i,frames);
    const b=colorBytes(f);
    for(let y=0;y<h;y++) data.set(b.subarray(y*w*4,(y+1)*w*4),((Math.floor(i/cols)*h+y)*w*cols+i%cols*w)*4);
  }
  save(name,w*cols,h*rows,data);
  atlases.push({name,width:w,height:h,frames,cols,rows,pivot});
}
for(let i=0;i<TT.length;i++){
  const q=TT[i];
  atlas('Tongue_'+String(i+1).padStart(2,'0'),64,64,90,10,(p,f)=>{
    const t=f/30,h=height(q,t),N=(rate,seed=0,off=0)=>NL(t,rate,seed,off);
    flameTongue(p,32+q.dx,60+q.y,h,q.w,sweep(q,t,h),N,q.n,H,q.back?BACK_LAYERS:q.w>2.2?BIG_LAYERS:LAYERS,.5,1.1+h*.04);
  },[32,60]);
}
// Life-normalized single-particle animation. Canvas includes transparent padding, fixed center.
// These are actual helper draws, including their cooling/shrink/opacity envelopes (not doubled in Unity).
atlas('FirePuff',32,32,64,8,(p,i,n)=>firePuff(p,16,16,1-i/(n-1),2,.5,H,0));
atlas('DetachedLick',24,24,64,8,(p,i,n)=>lick(p,12,12,1-i/(n-1),2,H));
const smokeColor=mix(hex('#5b5566'),H[6],.25);
atlas('SmokePlume',32,32,64,8,(p,i,n)=>smokePuff(p,16,16,1-i/(n-1),3,smokeColor));
atlas('SmokeSpent',32,32,64,8,(p,i,n)=>smokePuff(p,16,16,1-i/(n-1),3,0));
const glow=new Uint8Array(128*128*4);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){const d=Math.hypot((x+.5-64)/64,(y+.5-64)/64),j=(y*128+x)*4;glow[j]=glow[j+1]=glow[j+2]=255;glow[j+3]=Math.round(Math.max(0,1-d)**2*255);}
save('SoftGlow',128,128,glow);
const spark=createFrame(16,16),sp=painterFor(spark);
// Inspector-only staging uses texture X as native Stretched Billboard's length axis.
if(process.argv.includes('--inspector'))sp.rect(7,8,3,1,WHITE);else sp.rect(7,7,1,7,WHITE);
save('Spark',16,16,colorBytes(spark));
const ember=createFrame(8,8);painterFor(ember).px(4,4,WHITE);save('Ember',8,8,colorBytes(ember));
const cross=createFrame(8,8),cp=painterFor(cross);cp.line(3,4,5,4,WHITE);cp.line(4,3,4,5,WHITE);save('EmberCross',8,8,colorBytes(cross));
for(const [name,front] of [['PropBack',false],['PropFront',true]]){
  const f=createFrame(48,40),p=painterFor(f).place(24,37),I=fit(original.meta.options.iron,5),t=.8,fl=flicker(t);
  if(front){original.coals(p,I,H,t,S);original.bowl(p,I,H,fl);}
  else {original.stand(p,I,H,fl);p.ellipse(0,-25,15,3,(d,a)=>Math.sin(a)<0&&d>.7?(d>.88?I[0]:mix(I[3],H[4],.3*fl)):0);}
  save(name,48,40,colorBytes(f));
}

// Store actual sampled events, not just min/max ranges. Consume birth RNG first exactly as looped().
const events=[];
function schedule(count,seed,make,convert){for(let j=0;j<count;j++){const r=rng(seed,j),born=r.next()*D,q=make(r,j);convert(q,born,j);}}
const push=(kind,born,life,x,y,vx,vy,s,extra={})=>events.push({id:events.length,kind,born,life,x,y,vx,vy,s,...extra});
schedule(42,S+300,r=>({x:r.range(-7,7)*.7,y:-25.6-r.range(0,6),vx:r.range(-2,2),vy:-r.range(10,17),life:r.range(1.6,2.4),s:r.range(.7,1.1)*3}),
  (q,b)=>push('plume',b,q.life,q.x,q.y,q.vx,q.vy,q.s,{sway:NL(b,.8,S+60)}));
schedule(264,S+200,(r,j)=>{const i=j%11,fire=r.range(.14,.3),smokes=r.chance(.45);return {i,fire,smokes,sl:r.range(.8,1.4),ox:r.range(-1,1),oy:r.range(0,4),vx:r.range(-4,4),vy:-r.range(15,30),s:r.range(.8,1.6)*(.8+.6*TT[i].env),f:r.next()};},(q,b)=>{
  const [tx,ty]=tip(q.i,b),x=tx+q.ox,y=ty+q.oy,parent=events.length;
  push('puff',b,q.fire,x,y,q.vx,q.vy,q.s,{tongue:q.i,heat:q.f});
  if(q.smokes){const [sx,sy,vx,vy]=drift(x,y,q.vx,q.vy,q.fire,0,-95,5,3.2);push('spent',b+q.fire,q.sl,sx,sy,vx*.6,vy*.6-6,q.s*.7,{parent,tongue:q.i});}
});
schedule(132,S+220,(r,j)=>({i:j%11,vx:r.range(-3,3),vy:-r.range(12,22),s:r.range(.9,1.6)*(.8+.5*TT[j%11].env)}),(q,b)=>{const [x,y]=tip(q.i,b);push('lick',b,.26,x,y-2,q.vx,q.vy,q.s,{tongue:q.i});});
schedule(30,S+500,r=>({x:r.range(-7,7),y:-r.range(9.6,25.6),vx:r.range(-15,15),vy:-r.range(25,60),life:r.range(1.1,2.4),s:r.chance(.15)?2:r.range(1,1.6),a:r.range(0,6.3),b:r.range(0,6.3)}),
  (q,b)=>push('ember',b,q.life,q.x,q.y,q.vx,q.vy,q.s,{a:q.a,b:q.b,big:q.s>=2}));
schedule(60,S+600,r=>{const side=r.range(-1,1);return {x:side*8,y:-r.range(4,18),vx:side*r.range(10,40),vy:-r.range(70,150),life:r.range(.7,1.7),a:r.range(0,6.3),w:r.range(1.8,3.2),m:r.range(3,8),big:r.chance(.12)};},
  (q,b)=>push('spark',b,q.life,q.x,q.y,q.vx,q.vy,q.big?2:1,{a:q.a,w:q.w,m:q.m,big:q.big}));
const recipe={version:2,duration:D,fps:30,pixelsPerUnit:PPU,seed:S,atlases,tongues:TT,events,
  flicker:Array.from({length:90},(_,i)=>flicker(i/30)),lean:Array.from({length:90},(_,i)=>lean(i/30)),
  tips:TT.map((_,i)=>Array.from({length:90},(_,j)=>tip(i,j/30))),
  palette:original.meta.options.palette,sourceHashes:{brazier:createHash('sha256').update(source).digest('hex'),library:createHash('sha256').update(library).digest('hex')},
  notes:['Native Shuriken single-particle animation, lifetime and billboards; source event scheduler + analytic motion correction.','11 independent core tongues, never a whole-fire atlas. Firemouth is a fixed world anchor.','Puff heat uses middle variant; raster subpixel/alpha/additive linear-space compositing may differ. Prop coals fixed at 0.8 seconds.']};
writeChanged(join(target,'BrazierAnimatedRecipe.json'),JSON.stringify(recipe));
{
  const f=createFrame(112,148);original.draw(painterFor(f).place(56,136),.8,original.meta.options);
  const bytes=new Uint8Array(112*148*4);composite(f,bytes,hex('#24222b'));
  save('SourcePhase_0.8',112,148,bytes);
}
// Reference panels: source and isolated tongues at matching times. These also catch atlas clipping.
const times=[0,.4,.8,1.2,1.6,2,2.4,2.8],pw=112,ph=148,zoom=3,cw=pw*8,ch=ph*2,contact=new Uint8Array(cw*ch*4);
for(let k=0;k<times.length;k++)for(let row=0;row<2;row++){
  const f=createFrame(pw,ph),p=painterFor(f).place(56,136),t=times[k];
  if(!row)original.draw(p,t,original.meta.options);else for(const q of TT){const h=height(q,t);flameTongue(p,q.dx,-25+q.y,h,q.w,sweep(q,t,h),(rate,seed=0,off=0)=>NL(t,rate,seed,off),q.n,H,q.back?BACK_LAYERS:q.w>2.2?BIG_LAYERS:LAYERS,.5,1.1+h*.04);}
  const b=new Uint8Array(pw*ph*4);composite(f,b,hex('#24222b'));
  for(let y=0;y<ph;y++)contact.set(b.subarray(y*pw*4,(y+1)*pw*4),((row*ph+y)*cw+k*pw)*4);
}
const enlarged=new Uint8Array(cw*zoom*ch*zoom*4);
for(let y=0;y<ch*zoom;y++)for(let x=0;x<cw*zoom;x++){const si=(Math.floor(y/zoom)*cw+Math.floor(x/zoom))*4;enlarged.set(contact.subarray(si,si+4),(y*cw*zoom+x)*4);}
save('SourceAndCoreContact',cw*zoom,ch*zoom,enlarged);
console.log(`Exported 11 animated tongues, 4 life atlases, non-particle prop, ${events.length} source events → ${target}`);
