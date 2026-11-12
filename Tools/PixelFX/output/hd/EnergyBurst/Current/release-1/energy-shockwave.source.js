// Independent front-facing 2D plasma release; no perspective, flipbook or Unity dependency.
// A single advancing pressure front, local brush wakes, and short outward electrical currents.
import { Rng } from '../core/math.js';
const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const meta = {
  name: '赛博能量爆炸 · 电浆释放', duration: .94, loop: false,
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
  const rng = new Rng(seed), wakes = [], currents = [], arcs = [];
  const phases = Array.from({ length: 6 }, () => rng.range(0, TAU));
  for (let i = 0; i < 9; i++) wakes.push({
    a: rng.range(0, TAU), span: rng.range(.30, .83), width: rng.range(.014, .035),
    birth: rng.range(.015, .12), life: rng.range(.29, .48),
    lag: rng.range(.09, .28), phase: rng.range(0, TAU)
  });
  for (let i = 0; i < 24; i++) currents.push({
    a: (i + rng.range(-.35, .35)) / 24 * TAU, birth: rng.range(.015, .43), life: rng.range(.15, .27),
    start: rng.range(.30, .65), reach: rng.range(.90, 1.07), length: rng.range(.07, .18),
    width: rng.range(.003, .006), bends: Array.from({length: 6}, () => rng.range(-1, 1))
  });
  for (let i = 0; i < 15; i++) arcs.push({
    a: rng.range(0, TAU), span: rng.range(.12, .30), birth: rng.range(.025, .47),
    life: rng.range(.10, .18), phase: rng.range(0, TAU), width: rng.range(.003, .006)
  });
  const p = { phases, wakes, currents, arcs }; cache.set(seed, p); return p;
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
function fill(g, pts, color, alpha) {
  if (alpha <= .0001 || pts.length < 3) return;
  g.beginPath(); pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
  g.closePath(); g.fillStyle = rgba(color, alpha); g.fill();
}
const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
// Broad angular fields, not noise-texture stippling. Radius deviations stay below 1.4%.
function field(a, u, p) {
  const f = p.phases;
  return clamp(.56 + .20 * Math.sin(a*3+f[0]) + .15 * Math.sin(a*7+f[1])
    + .10 * Math.sin(a*13+f[2]) + .05 * Math.sin(a*19+f[3]+u*5));
}
function frontRadius(a, r, u, p, pulse) {
  return r * (1 + pulse * (.008 * Math.sin(a*7+p.phases[1]+u*3)
    + .004 * Math.sin(a*17+p.phases[3]-u*6)));
}
// One shared front for blue body and white-hot edge; local fading progressively opens gaps.
function frontStrip(g, s, p, o, color, alpha, offset, width, threshold = -1) {
  let inner = [], outer = [];
  const flush = () => { if(inner.length > 1) fill(g, [...inner, ...outer.reverse()], color, alpha); inner = []; outer = []; };
  for (let j = 0; j <= 480; j++) {
    const a = j / 480 * TAU, f = field(a,s.u,p);
    const breakup = smooth(.39,.92,s.u);
    const alive = threshold < 0 || f > threshold + breakup * .47;
    if (!alive) { flush(); continue; }
    const d = frontRadius(a,s.radius,s.u,p,o.pulse) + s.radius * offset;
    const pressure = mix(.45,1.40,f);
    const w = Math.max(.35, s.radius * width * pressure);
    inner.push(polar(a,d-w)); outer.push(polar(a,d+w));
  }
  flush();
}
function brushArc(g,v,r,age,o,color,alpha,widthScale=1) {
  const inner=[],outer=[];
  const span=v.span*(1-.18*smooth(.55,1,age));
  for(let j=0;j<=64;j++){
    const z=j/64,a=v.a+(z-.5)*span;
    const w=r*v.width*(.42+.58*Math.sin(Math.PI*z))*(1+.05*Math.sin(v.phase+age*6)*o.pulse)*widthScale;
    inner.push(polar(a,r-w));outer.push(polar(a,r+w));
  }
  fill(g,[...inner,...outer.reverse()],color,alpha);
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
    // Narrow blue wake under the advancing front, never a filled or shaded sphere.
    const k=power*(1-smooth(.57,.90,u));
    frontStrip(g,s,p,o,o.bodyColor,k*.12,-.07,.10,.02);
    frontStrip(g,s,p,o,o.bodyColor,k*.26,-.045,.058,.08);
    frontStrip(g,s,p,o,o.bodyColor,k*.38,-.025,.033,.16);
    for(const v of p.wakes){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const rr=r*(1-v.lag*(1-age)),a=Math.sin(Math.PI*age)*power*(1-smooth(.56,.9,u));
      brushArc(g,v,rr,age,o,o.bodyColor,a*.50,1.7);
      brushArc(g,v,rr,age,o,o.flowColor,a*.50,.64);
      brushArc(g,v,rr,age,o,o.hotColor,a*.60,.20);
    }
  }
  if(o.layers.front&&u>0){
    frontStrip(g,s,p,o,o.bodyColor,power*.12,-.005,.047);
    frontStrip(g,s,p,o,o.bodyColor,power*.65,-.005,.024,.02);
    frontStrip(g,s,p,o,o.flowColor,power*.72,0,.010,.10);
    frontStrip(g,s,p,o,o.hotColor,power*.92,.002,.0038,.20);
    // Sparse extra-hot patches are embedded in the same contour, not separate concentric rings.
    frontStrip(g,s,p,o,o.hotColor,power*.32,.002,.006,.52);
  }
  if(o.layers.electric&&u>0){
    for(const v of p.currents){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const head=r*mix(v.start,v.reach,1-(1-age)**1.4);
      const length=r*v.length*(.4+.6*Math.sin(Math.PI*age));
      const pts=v.bends.map((b,j)=>{
        const z=j/(v.bends.length-1),d=head-length*(1-z);
        return polar(v.a+b*.012*Math.sin(Math.PI*z)*o.pulse,d);
      });
      const k=Math.sin(Math.PI*age)*power*o.electric;
      line(g,pts,o.bodyColor,r*v.width*3.8,k*.38);
      line(g,pts,o.flowColor,r*v.width*1.5,k*.75);
      line(g,pts,o.hotColor,Math.max(.6,r*v.width*.55),k*.85);
    }
    for(const v of p.arcs){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const pts=Array.from({length:33},(_,j)=>{
        const z=j/32,a=v.a+(z-.5)*v.span;
        const d=frontRadius(a,r,u,p,o.pulse)+r*.004*Math.sin(z*12+v.phase-u*15)*o.pulse;
        return polar(a,d);
      });
      const k=Math.sin(Math.PI*age)*power*o.electric;
      line(g,pts,o.bodyColor,r*v.width*4,k*.4);
      line(g,pts,o.hotColor,Math.max(.7,r*v.width),k*.95);
    }
  }
  if(o.layers.flash&&t<.29){
    const gather=smooth(0,.035,t)*(1-smooth(.055,.10,t));
    const impulse=smooth(.055,.079,t)*(1-smooth(.09,.17,t));
    const cooling=1-smooth(.12,.27,t);
    glow(g,o.radius*(.24-.08*smooth(0,.06,t)),o.bodyColor,gather*.70*o.intensity);
    disc(g,o.radius*mix(.06,.035,smooth(0,.06,t)),o.flowColor,gather*.85*o.intensity);
    glow(g,o.radius*(.18+.18*impulse),o.bodyColor,impulse*.9*o.intensity);
    glow(g,o.radius*.16,o.flowColor,impulse*.8*o.intensity);
    disc(g,o.radius*(.02+.11*impulse)*cooling,o.flowColor,(gather*.35+impulse*.9)*o.intensity);
    disc(g,o.radius*(.018+.085*impulse)*cooling,o.hotColor,(gather*.3+impulse)*o.intensity);
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
