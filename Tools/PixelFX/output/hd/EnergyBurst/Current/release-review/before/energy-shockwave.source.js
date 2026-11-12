// Front-facing 2D energy release. The orb supplies the brush language, not its geometry.
// No perspective, sphere surface, long radial spokes, flipbook or Unity dependencies.
import { Rng } from '../core/math.js';
const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const meta = {
  name: '赛博能量爆炸 · 平面电浆', duration: .94, loop: false,
  size: [640, 640], origin: [320, 320],
  options: { seed: 37, radius: 230, duration: .94, pulse: .55,
    intensity: 1, electric: 1, bodyColor: '#2458ff', flowColor: '#85b5ff', hotColor: '#ffffff' }
};
export function options(input = {}) {
  const o = { ...meta.options, ...input, radius: clamp(input.radius ?? 230, 40, 270),
    duration: clamp(input.duration ?? .94, .4, 2),
    pulse: clamp(input.pulse ?? .55),
    layers: { flash: true, flow: true, front: true, electric: true, ...input.layers } };
  delete o.projection;
  return o;
}
const rgba = (hex, alpha) => 'rgba(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',') + ',' + clamp(alpha) + ')';
const cache = new Map();
function pattern(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const rng = new Rng(seed), ribbons = [], traces = [], sparks = [], folds = [], rim = [];
  for (let i = 0; i < 10; i++) ribbons.push({
    a: (i + rng.range(-.10, .10)) / 10 * TAU, span: rng.range(.38, .58),
    r: rng.range(.86, .93), width: rng.range(.024, .034), phase: rng.range(0, TAU),
    drift: rng.range(-.06, .06), end: rng.range(.52, .88)
  });
  for (let i = 0; i < 18; i++) traces.push({
    a: rng.range(0, TAU), r: rng.range(.65, .98), span: rng.range(.15, .28),
    phase: rng.range(0, TAU), width: rng.range(.003, .013), birth: rng.range(.01, .26), life: rng.range(.26, .51)
  });
  for (let i = 0; i < 8; i++) folds.push({
    a: (i+rng.next())/8*TAU,span:rng.range(.32,.58),r:1,
    width:rng.range(.018,.028),phase:rng.range(0,TAU),drift:rng.range(-.10,.10),
    birth:rng.range(.005,.10),life:rng.range(.29,.47),end:1
  });
  for (let i = 0; i < 18; i++) sparks.push({
    a: rng.range(0, TAU), birth: rng.range(.06, .42), life: rng.range(.13, .25),
    r: rng.range(.75, 1), span: rng.range(.12, .25), phase: rng.range(0, TAU)
  });
  for(let i=0;i<6;i++)rim.push({a:(i+.1)/6*TAU,span:rng.range(.52,.86),width:rng.range(.005,.012),phase:rng.range(0,TAU)});
  const p = { ribbons, traces, sparks, folds, rim }; cache.set(seed, p); return p;
}
export function stateAt(time, input = {}) {
  const o = options(input), t = time / o.duration, u = clamp((t - .045) / .955);
  const expansion = (1 - Math.exp(-7.4 * u)) / (1 - Math.exp(-7.4));
  const radius = o.radius * (.17 + .83 * expansion);
  const hole = radius * mix(.10, .96, smooth(.08, .95, u));
  return { t, u, radius, hole, envelope: smooth(0, .035, u) * (1 - smooth(.43, .99, u)),
    active: time > 0 && time < o.duration };
}
function line(g, pts, color, width, alpha) {
  if (alpha <= .0001 || pts.length < 2) return;
  g.beginPath(); pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
  g.strokeStyle = rgba(color, alpha); g.lineWidth = width; g.stroke();
}
function fill(g, pts, color, alpha) {
  if (alpha <= .0001) return;
  g.beginPath(); pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
  g.closePath(); g.fillStyle = rgba(color, alpha); g.fill();
}
// Hard circular brush: constant-radius centreline and broad pressure variation.
// Ends stay blunt; no taper-to-point, notch, jitter, polygon shard or radial knot.
function ribbon(g, v, r, u, o, color, alpha, widthScale = 1) {
  const side = [[], []], n = 64, d = r * v.r;
  const pressure = 1 + .06 * Math.sin(v.phase - u * 4) * o.pulse;
  for (let j = 0; j <= n; j++) {
    const z = j / n, a = v.a + v.span * (z - .5) + v.drift * u;
    const w = r * v.width * (.62 + .38 * Math.sin(Math.PI * z)) * pressure * widthScale;
    side[0].push([Math.cos(a) * (d - w), Math.sin(a) * (d - w)]);
    side[1].push([Math.cos(a) * (d + w), Math.sin(a) * (d + w)]);
  }
  fill(g, [...side[0], ...side[1].reverse()], color, alpha);
}
function rimRadius(a,r){return r;}
function hardRim(g,v,r,u,o,color,alpha,widthScale=1){
  ribbon(g,{...v,r:1,drift:0},r,u,o,color,alpha,widthScale);
}
export function draw(g, time, input = {}) {
  const o = options(input), s = stateAt(time, o);
  if (!s.active) return;
  const { t, u, radius: r, envelope: env, hole } = s, p = pattern(o.seed);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.layers.flow && u > 0) {
    // Brief blue energy body: receding from the centre, without depth shading.
    const bodyEnv=env*(1-smooth(.61,.90,u));
    const inner = Math.min(r*.98, hole), grad=g.createRadialGradient(0,0,inner,0,0,r*1.035);
    grad.addColorStop(0,rgba(o.bodyColor,0));
    grad.addColorStop(.3,rgba(o.bodyColor,bodyEnv*.20*o.intensity));
    grad.addColorStop(.8,rgba(o.bodyColor,bodyEnv*.29*o.intensity));
    grad.addColorStop(.94,rgba(o.flowColor,bodyEnv*.09*o.intensity));
    grad.addColorStop(1,rgba(o.bodyColor,0));
    g.fillStyle=grad;g.beginPath();g.arc(0,0,r*1.04,0,TAU);g.fill();
    // Blue energy remains local to the outgoing strokes, never a painted disc.
    for (const v of p.ribbons) {
      const k = env * o.intensity * (1 - smooth(v.end - .17, v.end + .13, u));
      ribbon(g, v, r, u, o, o.bodyColor, k * .38, 1.3);
      ribbon(g, v, r, u, o, o.bodyColor, k * .60, .95);
      ribbon(g, v, r, u, o, o.flowColor, k * .60, .72);
      ribbon(g, v, r, u, o, o.hotColor, k * .65, .30);
    }
    for(const v of p.folds){
      const age=(u-v.birth)/v.life;if(age<=0||age>=1)continue;
      const rr=r*mix(.27,.94,1-(1-age)**1.8),k=Math.sin(Math.PI*age)*env*o.intensity;
      // Fade energy, not the geometry: late arcs must not collapse into needles.
      const width=mix(1,.55,smooth(.45,1,age));
      ribbon(g,v,rr,u,o,o.bodyColor,k*.5,width*1.6);
      ribbon(g,v,rr,u,o,o.flowColor,k*.7,width*.8);
      ribbon(g,v,rr,u,o,o.hotColor,k*.82,width*.28);
    }
    for (const v of p.traces) {
      const age = (u - v.birth) / v.life;
      if (age <= 0 || age >= 1) continue;
      const rr = r * mix(v.r * .65, 1.01, age);
      if (rr < hole) continue;
      const a = v.a + age * .09;
      const pts = Array.from({length:19}, (_,j) => {
        const angle = a + v.span * (j/18 - .5);
        return [Math.cos(angle)*rr,Math.sin(angle)*rr];
      });
      const k = Math.sin(age * Math.PI) * env * o.intensity;
      line(g,pts,o.bodyColor,r*v.width*1.8,k*.45);
      line(g,pts,o.flowColor,r*v.width,k*.4);
    }
  }
  if (o.layers.front && u > 0) {
    const k=env*o.intensity*(1-smooth(.62,.94,u));
    const outline=Array.from({length:193},(_,j)=>{const a=j/192*TAU,d=rimRadius(a,r);return[Math.cos(a)*d,Math.sin(a)*d];});
    line(g,outline,o.bodyColor,3.5,k*.16);line(g,outline,o.flowColor,.8,k*.16);
    for(const v of p.rim){
      hardRim(g,v,r,u,o,o.bodyColor,k*.15,3);
      hardRim(g,v,r,u,o,o.flowColor,k*.72,1);
      hardRim(g,v,r,u,o,o.hotColor,k*.55,.4);
    }
  }
  if (o.layers.electric && u > 0) {
    for (const spark of p.sparks) {
      const age = (u - spark.birth) / spark.life;
      if (age <= 0 || age >= 1) continue;
      const rr = r * (spark.r + age * .09), a = spark.a + age * .05;
      const pts = Array.from({length:25}, (_,j) => {
        const angle = a + (j/24-.5)*spark.span;
        return [Math.cos(angle)*rr,Math.sin(angle)*rr];
      });
      const k = Math.sin(Math.PI*age)*env*o.intensity*o.electric;
      line(g,pts,o.bodyColor,3.5,k*.3); line(g,pts,o.hotColor,1.1,k*.9);
    }
  }
  if (o.layers.flash && t < .29) {
    const k = smooth(0,.025,t)*(1-smooth(.095,.29,t)), rr=o.radius*(.14+.08*smooth(0,.13,t));
    const gradient=g.createRadialGradient(0,0,0,0,0,rr*1.8);
    gradient.addColorStop(0,rgba(o.flowColor,k*.65)); gradient.addColorStop(.18,rgba(o.bodyColor,k*.8));
    gradient.addColorStop(.42,rgba(o.bodyColor,k*.75)); gradient.addColorStop(1,rgba(o.bodyColor,0));
    g.fillStyle=gradient;g.fillRect(-rr*1.8,-rr*1.8,rr*3.6,rr*3.6);
    const impulse=smooth(.035,.06,t)*(1-smooth(.09,.145,t));
    const core=rr*(.18+.58*impulse)*(1-smooth(.15,.245,t));
    const white=smooth(0,.025,t)*(1-smooth(.18,.245,t));
    g.fillStyle=rgba(o.hotColor,white);g.beginPath();g.arc(0,0,core,0,TAU);g.fill();
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
