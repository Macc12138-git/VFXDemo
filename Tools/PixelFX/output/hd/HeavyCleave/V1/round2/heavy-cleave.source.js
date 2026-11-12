// Sword light isolated from pixelfx melee/heavy-cleave; no character or impact layers.
// Swing / cooling choreography derives from Sprite Fusion's slash recipe,
// MIT License, Copyright (c) 2026 Hugo Duprez. The HD brush geometry is newly drawn.
export const meta = {
  id: 'hd/heavy-cleave', name: '重击剑光 · 高清手绘', version: '1.0.1',
  size: [1024, 768], pivot: [440, 635], duration: .52, fps: 60, loop: false, actor: false,
  options: {
    seed: 5, scale: 1, thickness: 1, brush: .78, glow: .55,
    shadow: '#9a292c', body: '#f47732', hot: '#ffd578', edge: '#fff9df',
    layers: { echo: true, body: true, brush: true, edge: true, glow: true },
  },
};
export const timing = { sweep: .135, hold: .05, trail: .22, end: .52 };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { const u = clamp((t - a) / (b - a)); return u*u*(3-2*u); };
const fract = v => v - Math.floor(v);
const hash = (i, seed) => fract(Math.sin(i * 127.1 + seed * 31.7) * 43758.5453);
const rgb = c => c.replace('#', '').match(/../g).map(v => parseInt(v, 16));
const mix = (a, b, u) => { const A=rgb(a), B=rgb(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*u)).join(',')})`; };
const C = Math.cos(.32), S = Math.sin(.32), R = 320, SY = .88, A0 = -2.45;
export function onArc(s, inset = 0, ratio = 1) {
  const a = A0 + SPAN*s, r = R*ratio-inset, x = Math.cos(a)*r, y = Math.sin(a)*r*SY;
  return [26+x*C-y*S, -190+x*S+y*C];
}
// The original blade stops just above its virtual contact plane; that plane is never drawn.
let span = 0;
while (-22 + Math.cos(A0+span)*37*S + Math.sin(A0+span)*37*SY*C < -.5 && span < 4) span += .005;
export const SPAN = span;
export function options(input = {}) {
  return { ...meta.options, ...input,
    layers: { ...meta.options.layers, ...input.layers },
  };
}
export function sample(t, input = {}, lag = 0) {
  const o = options(input), tt = t-lag;
  const head = clamp(tt / timing.sweep)**2;
  const gone = smooth(timing.sweep+timing.hold, timing.sweep+timing.hold+timing.trail, tt);
  return { head, tail: gone, gone, shrink: 1-.75*gone,
    opacity: (1-smooth(.31,.47,tt))*smooth(0,.012,tt),
    active: tt > 0 && t < meta.duration && head > gone+.001,
    o, t: tt,
  };
}
function poly(g, points) {
  g.beginPath(); g.moveTo(...points[0]);
  for (const p of points.slice(1)) g.lineTo(...p);
  g.closePath();
}
function profile(s, state, width) {
  const u = clamp((s-state.tail)/Math.max(.00001,state.head-state.tail));
  const lens = Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(u,2.2))),.6);
  const nick=(center,reach)=>Math.pow(clamp(1-Math.abs(s-center)/reach),2);
  const rake=1-state.o.brush*(.19*nick(.32,.065)+.15*nick(.61,.048)+.23*nick(.83,.07));
  const brush = 1+.021*Math.sin(s*19+1)+.012*Math.sin(s*47+2);
  const early=Math.min(1,Math.sqrt(state.head/.45));
  return width*state.o.thickness*state.shrink*lens*brush*rake*early;
}
function ribbon(g, state, { from=state.tail, to=state.head, width=138, ratio=1, offset=0, band=1, color, alpha=1, wobble=0 }) {
  from = Math.max(from,state.tail); to = Math.min(to,state.head);
  if (to-from < .001 || alpha <= .001 || !state.active) return;
  const out=[], inside=[], n=Math.max(12,Math.ceil((to-from)*160));
  for(let i=0;i<=n;i++) {
    const u=i/n, s=from+(to-from)*u, w=profile(s,state,width);
    const off=typeof offset==='function'?offset(s,u,w):offset*w;
    const b=typeof band==='function'?band(s,u,w):band*w;
    const rough=wobble*state.o.brush*(Math.sin(s*37+1.6)+.36*Math.sin(s*91));
    out.push(onArc(s,off+rough,ratio)); inside.push(onArc(s,off+b+rough,ratio));
  }
  poly(g,out.concat(inside.reverse()));g.fillStyle=color;g.globalAlpha=alpha*state.opacity;g.fill();
}
function paint(g, state, echo=false) {
  if(!state.active)return;
  const o=state.o, width=echo?40:138, ratio=echo?.76:1;
  const cool=smooth(.18,.38,state.t), a=echo?.72:1;
  // Broad unequal pigment bands preserve the weight of the blade at game size.
  const bands=echo?
    [[1,o.shadow],[.77,o.body],[.34,o.hot]]:
    [[1,o.shadow],[.86,mix(o.shadow,o.body,.56)],[.71,o.body],[.48,mix(o.body,o.hot,.45)],[.27,o.hot],[.13,mix(o.hot,o.edge,.7)]];
  for(const [q,c]of bands) {
    ribbon(g,state,{width,ratio,band:(s,u,w)=>w*q*(1+.055*Math.sin(s*17+q*11)),color:mix(c,o.shadow,cool*.7),alpha:a,wobble:echo?.2:.75});
  }
}
function brush(g,state) {
  if(!state.active)return;
  const o=state.o, strength=o.brush;
  // Long uneven strokes follow the swing. All marks belong to the blade, never independent particles.
  for(let i=0;i<9;i++) {
    const h=hash(i+4,o.seed), from=.04+hash(i+19,o.seed)*.64;
    const to=Math.min(.99,from+.17+hash(i+49,o.seed)*.27), q=.27+h*.58;
    ribbon(g,state,{from,to,
      offset:(s,u,w)=>w*(q+.035*Math.sin(u*4+i)),
      band:(s,u,w)=>w*(.028+hash(i+83,o.seed)*.09)*Math.pow(Math.sin(Math.PI*u),.65),
      color:i%3===0?o.shadow:i%3===1?o.hot:o.body,
      alpha:strength*(i%3===0?.7:.66),wobble:.25,
    });
  }
  // Sparse dry bristles within the warm body, locked to the same sweep coordinates.
  for(let i=0;i<28;i++) {
    const from=.13+hash(i+311,o.seed)*.73,to=Math.min(.98,from+.035+hash(i+433,o.seed)*.18);
    ribbon(g,state,{from,to,offset:.28+hash(i+534,o.seed)*.62,
      band:(s,u,w)=>(.3+hash(i+615,o.seed)*1.3)*Math.sin(Math.PI*u),
      color:i%3?o.hot:o.shadow,alpha:strength*(.14+hash(i+707,o.seed)*.26),
    });
  }
  // Three slender hooked strokes sit inside the main slash, separated by clear negative space.
  for(let i=0;i<3;i++) {
    const from=.30+i*.15, to=.89+i*.035;
    ribbon(g,state,{from,to,
      offset:(s,u,w)=>w*(.79+i*.07)+7*Math.sin(u*Math.PI),
      band:(s,u,w)=>(8-i*1.6)*Math.sin(Math.PI*u)*state.shrink,
      color:i?o.body:o.hot,alpha:.7*strength,
    });
  }
}
function edge(g,state) {
  if(!state.active)return;
  const o=state.o,cool=smooth(.19,.35,state.t);
  ribbon(g,state,{band:.07,color:mix(o.edge,o.hot,cool),wobble:.35,alpha:1-cool*.6});
  // Interrupted, tapered highlights; avoid a uniform neon outline.
  for(const [from,to,q]of [[.07,.24,.19],[.31,.54,.24],[.63,.94,.16]]) {
    ribbon(g,state,{from,to,offset:q,
      band:(s,u,w)=>Math.min(6,w*.065)*Math.pow(Math.sin(Math.PI*u),.6),
      color:o.edge,alpha:.73*(1-cool),wobble:.25,
    });
  }
}
function glow(g,state) {
  if(!state.active||state.o.glow<=0)return;
  const o=state.o, c=rgb(o.body), heat=1-smooth(.16,.33,state.t);
  if(heat<=0)return;
  g.globalCompositeOperation='lighter';
  for(let i=0;i<=20;i++) {
    const s=state.tail+(state.head-state.tail)*i/20, w=profile(s,state,138);
    if(w<2)continue;
    const [x,y]=onArc(s,w*.18),r=25+w*.24;
    const k=.045*o.glow*heat*Math.sin(Math.PI*i/20);
    const light=g.createRadialGradient(x,y,0,x,y,r);
    light.addColorStop(0,`rgba(${c},${k})`);light.addColorStop(.38,`rgba(${c},${k*.5})`);light.addColorStop(1,`rgba(${c},0)`);
    g.globalAlpha=state.opacity;g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);
  }
  g.globalCompositeOperation='source-over';
}
// Draw into the caller's existing transform, local anchor (0,0). Color and additive light stay separable.
export function draw(g,t,input={}) {
  const o=options(input),state=sample(t,o),echo=sample(t,o,.02);
  if(t<=0||t>=meta.duration)return;
  g.save();g.scale(o.scale,o.scale);
  if(input.buffer!=='light') {
    if(o.layers.echo)paint(g,echo,true);
    if(o.layers.body)paint(g,state);
    if(o.layers.brush)brush(g,state);
    if(o.layers.edge)edge(g,state);
  }
  if(o.layers.glow&&input.buffer!=='color')glow(g,state);
  g.restore();
}
export function background(g,W,H,kind='dark') {
  g.clearRect(0,0,W,H);
  if(kind==='transparent')return;
  g.fillStyle=({dark:'#11151e',gray:'#535b68',light:'#dce0e5',warm:'#75665e',checker:'#38414c'})[kind]??'#11151e';g.fillRect(0,0,W,H);
  if(kind==='checker') {
    g.fillStyle='#46515e';for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24)if((x/24+y/24)%2===0)g.fillRect(x,y,24,24);
  }
}
export function render(canvas,t,input={},view={}) {
  const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  background(g,W,H,view.background??'dark');
  const fit=Math.min(W/1024,H/768)*(view.zoom??1);
  g.save();g.translate((W-1024*fit)/2+meta.pivot[0]*fit,(H-768*fit)/2+meta.pivot[1]*fit);g.scale(fit,fit);
  draw(g,t,input);g.restore();
}
