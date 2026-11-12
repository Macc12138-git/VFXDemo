// Independent front-facing 2D plasma release; no perspective, flipbook or Unity dependency.
// A single fine electrical front and outward filaments. No filled bands after the flash.
import { Rng } from '../core/math.js';
const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const meta = {
  name: '赛博能量爆炸 · 细线电流', duration: .94, loop: false,
  size: [640, 640], origin: [320, 320],
  options: { seed: 37, radius: 230, duration: .94, pulse: .55,
    intensity: 1, electric: 1, bodyColor: '#2458ff', flowColor: '#85b5ff', hotColor: '#ffffff' }
};
export function options(input = {}) {
  const o = { ...meta.options, ...input, radius: clamp(input.radius ?? 230, 40, 270),
    duration: clamp(input.duration ?? .94, .4, 2), pulse: clamp(input.pulse ?? .55),
    layers: { flash: true, flow: true, front: true, electric: true, ...input.layers } };
  delete o.projection;
  return o;
}
const rgba = (hex, alpha) => 'rgba(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',') + ',' + clamp(alpha) + ')';
const cache = new Map();
function pattern(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const rng = new Rng(seed), wakes = [], currents = [], arcs = [], corona = [];
  const phases = Array.from({ length: 6 }, () => rng.range(0, TAU));
  for (let i = 0; i < 9; i++) wakes.push({
    a: rng.range(0, TAU), span: rng.range(.30, .83), width: rng.range(.75, 1.10),
    birth: rng.range(.015, .12), life: rng.range(.29, .48),
    lag: rng.range(.26, .62), phase: rng.range(0, TAU)
  });
  for (let i = 0; i < 34; i++) currents.push({
    a: (i + rng.range(-.40, .40)) / 34 * TAU, birth: rng.range(.015, .45), life: rng.range(.17, .29),
    start: rng.range(.20, .50), reach: rng.range(.98, 1.10), length: rng.range(.11, .24),
    width: rng.range(.65, 1.05), bends: Array.from({length: 7}, () => rng.range(-1, 1))
  });
  for (let i = 0; i < 15; i++) arcs.push({
    a: rng.range(0, TAU), span: rng.range(.12, .30), birth: rng.range(.025, .47),
    life: rng.range(.10, .18), phase: rng.range(0, TAU), width: rng.range(.65, 1.10)
  });
  for (let i = 0; i < 14; i++) corona.push({
    a:rng.range(0,TAU),span:rng.range(.08,.25),width:rng.range(.60,.95),
    birth:rng.range(.03,.44),life:rng.range(.12,.23),phase:rng.range(0,TAU)
  });
  const p = { phases, wakes, currents, arcs, corona }; cache.set(seed, p); return p;
}
export function stateAt(time, input = {}) {
  const o = options(input), t = time / o.duration, u = clamp((t - .065) / .935);
  const expansion = 1 - (1 - u) ** 2.7;
  const radius = o.radius * (.13 + .87 * expansion);
  const hole = radius * mix(.12, .97, smooth(.03, .72, u));
  return { t, u, radius, hole, envelope: smooth(0, .045, u) * (1 - smooth(.51, .98, u)),
    active: time > 0 && time < o.duration };
}
function line(g, pts, color, width, alpha) {
  if (alpha <= .0001 || pts.length < 2) return;
  g.beginPath(); pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
  g.strokeStyle = rgba(color, alpha); g.lineWidth = width; g.stroke();
}
const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
// Broad angular fields, not noise-texture stippling. Radius deviations stay below 1.4%.
function field(a, u, p) {
  const f = p.phases;
  return clamp(.56 + .20 * Math.sin(a*3+f[0]) + .15 * Math.sin(a*7+f[1])
    + .10 * Math.sin(a*13+f[2]) + .09 * Math.sin(a*19+f[3]+u*18));
}
function frontRadius(a, r, u, p, pulse) {
  return r * (1 + pulse * (.008 * Math.sin(a*7+p.phases[1]+u*3)
    + .004 * Math.sin(a*17+p.phases[3]-u*6) + .004*Math.sin(a*29+p.phases[2]+u*17)
    + .003*Math.sin(a*53+p.phases[4]-u*23) + .001*Math.sin(a*89+p.phases[5]+u*29)));
}
// Widths are authoring pixels, not radius-proportional filled strips.
function filament(g,pts,o,k,width=1,heat=.9){
  const w=width*clamp(o.radius/230,.60,1.18);
  line(g,pts,o.bodyColor,w*6,k*.18);
  line(g,pts,o.bodyColor,w*3,k*.45);
  line(g,pts,o.flowColor,w*1.7,k*.85);
  line(g,pts,o.hotColor,w,k*heat);
  line(g,pts,o.hotColor,w*.65,k*heat*.35);
}
function frontTrace(g, s, p, o) {
  let points=[], energy=0, previousBin=-1;
  const cutoff=.18+smooth(.30,.90,s.u)*.56;
  const flush=()=>{
    if(points.length>1){
      const e=energy/points.length;
      const heat=.9*(1-smooth(.45,.78,s.u));
      filament(g,points,o,s.envelope*o.intensity*(.35+.65*e),1+.35*e,heat);
    }
    points=[];energy=0;
  };
  for (let j = 0; j <= 480; j++) {
    const a = j / 480 * TAU, f = field(a,s.u,p);
    if(f<cutoff){flush();previousBin=-1;continue;}
    const bin=Math.floor(f*4),pt=polar(a,frontRadius(a,s.radius,s.u,p,o.pulse));
    if(previousBin!==bin&&points.length>1){
      const last=points[points.length-1];flush();points.push(last);energy=f;
    }
    points.push(pt);energy+=f;previousBin=bin;
  }
  flush();
}
function arcPoints(v,r,age,o){
  const span=v.span*(1-.18*smooth(.55,1,age));
  return Array.from({length:65},(_,j)=>{
    const z=j/64,a=v.a+(z-.5)*span;
    const d=r+Math.sin(z*11+v.phase-age*7)*o.pulse*.75;
    return polar(a,d);
  });
}
function disc(g,r,color,alpha) {
  if(r<=0||alpha<=0)return;
  g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle=rgba(color,alpha);g.fill();
}
function glow(g,r,color,alpha){
  if(r<=0||alpha<=0)return;
  const grad=g.createRadialGradient(0,0,0,0,0,r);
  grad.addColorStop(0,rgba(color,alpha));grad.addColorStop(.30,rgba(color,alpha*.6));grad.addColorStop(1,rgba(color,0));
  g.fillStyle=grad;g.fillRect(-r,-r,r*2,r*2);
}
export function draw(g, time, input = {}) {
  const o=options(input),s=stateAt(time,o);if(!s.active)return;
  const {t,u,radius:r,envelope:env}=s,p=pattern(o.seed),power=env*o.intensity;
  g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
  if(o.layers.flow&&u>0){
    // Only narrow trailing current lines; no blue membrane, fog or nested colour bands.
    for(const v of p.wakes){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const rr=r*mix(1-v.lag,.98,age**1.1),a=Math.sin(Math.PI*age)*power*(1-smooth(.50,.8,u));
      filament(g,arcPoints(v,rr,age,o),o,a*.72,v.width,.78);
    }
  }
  if(o.layers.front&&u>0){
    frontTrace(g,s,p,o);
  }
  if(o.layers.electric&&u>0){
    for(const v of p.currents){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const head=r*mix(v.start,v.reach,smooth(0,.63,age));
      const length=r*v.length*(.4+.6*Math.sin(Math.PI*age));
      const pts=v.bends.map((b,j)=>{
        const z=j/(v.bends.length-1),d=head-length*(1-z);
        return polar(v.a+b*.032*Math.sin(Math.PI*z)*o.pulse,d);
      });
      const k=Math.sin(Math.PI*age)*power*o.electric;
      filament(g,pts,o,k*.8,v.width,.35);
      line(g,pts.slice(2),o.hotColor,v.width*.7,k*.92);
      if(v.width>.9){
        const branch=[pts[3],polar(v.a+.045,head-length*.1),polar(v.a+.052,head+length*.08)];
        filament(g,branch,o,k*.50,v.width*.55,.65);
      }
    }
    for(const v of p.arcs){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const pts=Array.from({length:33},(_,j)=>{
        const z=j/32,a=v.a+(z-.5)*v.span;
        const d=frontRadius(a,r,u,p,o.pulse)+r*.004*Math.sin(z*12+v.phase-u*15)*o.pulse;
        return polar(a,d);
      });
      const k=Math.sin(Math.PI*age)*power*o.electric;
      filament(g,pts,o,k,v.width,.95);
    }
    // Short curved discharges leave the edge and die; they do not orbit the centre.
    for(const v of p.corona){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const rr=Math.min(o.radius*1.08,r*(.98+.12*smooth(0,.8,age)));
      const k=Math.sin(Math.PI*age)*power*o.electric;
      filament(g,arcPoints(v,rr,age,o),o,k*.85,v.width,.85);
    }
  }
  if(o.layers.flash&&t<.29){
    const gather=smooth(0,.035,t)*(1-smooth(.055,.10,t));
    const impulse=smooth(.055,.079,t)*(1-smooth(.09,.17,t));
    const cooling=1-smooth(.12,.27,t);
    glow(g,o.radius*(.24-.08*smooth(0,.06,t)),o.bodyColor,gather*.70*o.intensity);
    disc(g,o.radius*mix(.06,.035,smooth(0,.06,t)),o.flowColor,gather*.85*o.intensity);
    glow(g,o.radius*(.18+.26*impulse),o.bodyColor,impulse*.9*o.intensity);
    glow(g,o.radius*.24,o.flowColor,impulse*.8*o.intensity);
    disc(g,o.radius*(.02+.19*impulse)*cooling,o.flowColor,(gather*.35+impulse*.9)*o.intensity);
    disc(g,o.radius*(.018+.15*impulse)*cooling,o.hotColor,(gather*.3+impulse)*o.intensity);
  }
  g.restore();
}
export const backgrounds = { dark: '#050716', black: '#000000', light: '#cbd1da', warm: '#655346' };
export function render(canvas, time, input = {}, view = {}) {
  const g=canvas.getContext('2d'),{background='dark',scale=1}=view;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);
  if(background==='checker'){
    for(let y=0;y<canvas.height;y+=20)for(let x=0;x<canvas.width;x+=20){
      g.fillStyle=(x/20+y/20)%2?'#263345':'#172333';g.fillRect(x,y,20,20);
    }
  }else if(background!=='transparent'){g.fillStyle=backgrounds[background]??background;g.fillRect(0,0,canvas.width,canvas.height);}
  g.save();g.translate(canvas.width/2,canvas.height/2);g.scale(scale,scale);draw(g,time,input);g.restore();
}
