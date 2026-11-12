// Original hand-painted-style Canvas study of the central orb in the author's GIF.
// Continuous contour/brush geometry, not resized pixels or an animation flipbook.
export const meta = {
  id: 'hd/blue-wisp', name: '苍蓝灵火 · Blue Wisp', version: '1.0.1',
  size: [960, 640], origin: [390, 320], duration: .84, fps: 60, loop: true,
  options: {seed: 13, radius: 112, flow: 1, turbulence: 1, tail: 1, glow: .55,
    shadow: '#0866ed', body: '#00c6ff', flame: '#4ff9ff', core: '#e8ffff',
    layers: {body: true, brush: true, core: true, flecks: true, glow: true}},
};
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const fract = x => x - Math.floor(x);
const hash = (s, i, k = 0) => fract(Math.sin(s * 12.9898 + i * 78.233 + k * 36.71) * 43758.5453);
export const options = (o = {}) => ({...meta.options, ...o, layers: {...meta.options.layers, ...o.layers}});
export const rgba = (hex, alpha) => `rgba(${[1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(',')},${clamp(alpha)})`;
const mix = (a,b,u) => '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-u)+parseInt(b.slice(i,i+2),16)*u).toString(16).padStart(2,'0')).join('');

export function sample(t, input = {}) {
  const o = options(input), phase = fract(t * o.flow / meta.duration), w = phase * TAU;
  const bend = Math.sin(w * 2) * .08 * o.turbulence;
  const flecks = Array.from({length: 7}, (_, i) => {
    const u = fract(phase * (2 + i % 2) + hash(o.seed, i));
    const side = i % 2 ? 1 : -1;
    return {x: .72 + u * (1.48 + hash(o.seed, i, 1) * .3),
      y: side * (.48 + hash(o.seed, i, 2) * .28 + u * .22) + .1 * Math.sin(u * 5 + i),
      length: (.08 + hash(o.seed,i,3) * .14) * Math.sin(Math.PI * u),
      alpha: Math.pow(Math.sin(Math.PI * u), 1.1) * (.5 + hash(o.seed,i,4)*.4),
      angle: side * (.2 + u * .45), u};
  });
  return {o, phase, w, bend, pulse: 1 + .022 * Math.sin(w * 2 + .4), flecks};
}
function fill(g, color, commands, alpha = 1) {
  g.beginPath();
  for (const [op, ...args] of commands) g[op](...args);
  g.closePath(); g.fillStyle = color; g.globalAlpha = alpha; g.fill(); g.globalAlpha = 1;
}
function contour(g, f) {
  const {w, bend:b, o} = f, n = o.turbulence;
  const a = Math.sin(w*2)*.065*n, c = Math.cos(w*2+.7)*.06*n;
  const tip = 1.13 + (.12 + Math.sin(w*2+1)*.16) * o.tail;
  g.beginPath();g.moveTo(-1.01,-.03);
  g.bezierCurveTo(-1.04+c*.15,-.47,-.72+a*.2,-.88,-.35,-.96);
  g.bezierCurveTo(-.05,-1.10,.17,-1.00,.36,-1.02);
  g.bezierCurveTo(.55,-1.06,.68,-1.14,.89+a,-1.06+c);
  g.bezierCurveTo(.81,-.92,.55,-.86,.60,-.76);
  g.bezierCurveTo(.72,-.65,.86,-.70,1.10+a,-.70+b);
  g.bezierCurveTo(1.00,-.55,.82,-.51,.90,-.41);
  g.bezierCurveTo(1.12,-.27,tip-.20,-.22,tip,.02+b);
  g.bezierCurveTo(tip-.10,.11+b,1.06,.22,1.01,.31);
  g.bezierCurveTo(.93,.45,1.20+c,.42,1.30+c,.47);
  g.bezierCurveTo(1.17,.57,.92,.54,.80,.64);
  g.bezierCurveTo(.72,.76,.87,.82,1.07+a,.81);
  g.bezierCurveTo(.99,1.00,.65,.89,.51,.99);
  g.bezierCurveTo(.27,1.12,.08,1.02,-.16,1.01);
  g.bezierCurveTo(-.65,1.01,-1.01,.57,-1.01,-.03);g.closePath();
}
function blob(g, x, y, r, w, color, sx = 1, sy = 1) {
  const pts=[];
  for(let i=0;i<96;i++){
    const a=i/96*TAU, d=r*(1+.045*Math.sin(a*5+w*2)+.025*Math.sin(a*9-w*2));
    pts.push([x+Math.cos(a)*d*sx,y+Math.sin(a)*d*sy]);
  }
  fill(g,color,[['moveTo',...pts[0]],...pts.slice(1).map(p=>['lineTo',...p])]);
}
// A tapered paint ribbon, never a constant-width outlined circle.
function brush(g, f, {a, span, r, width, color, drift=1, alpha=1}) {
  const outer=[],inner=[], w=f.w;
  for(let i=0;i<=70;i++){
    const u=i/70, ang=a+span*u;
    const ripple=(.02*Math.sin(u*13-w*2*drift)+.012*Math.sin(u*27+w*2))*f.o.turbulence;
    const rr=r+ripple+.02*Math.sin(w*2+a), taper=Math.pow(Math.sin(Math.PI*u),.75);
    const thick=width*taper*(1+.18*Math.sin(u*10-w*2));
    outer.push([Math.cos(ang)*(rr+thick*.32),Math.sin(ang)*(rr+thick*.32)]);
    inner.push([Math.cos(ang)*(rr-thick*.68),Math.sin(ang)*(rr-thick*.68)]);
  }
  const pts=[...outer,...inner.reverse()];
  fill(g,color,[['moveTo',...pts[0]],...pts.slice(1).map(p=>['lineTo',...p])],alpha);
}
function plume(g, f, side, color, inset=0) {
  const {w,o}=f, yy=side*(.52+inset), flutter=Math.sin(w*2+side)*.14*o.turbulence;
  const reach=(1.13+.24*Math.sin(w*2+side*.8))*o.tail;
  fill(g,color,[['moveTo',.18,yy],['bezierCurveTo',.68,yy+side*.20,.70+reach*.22,yy-side*.12,reach,yy+flutter],
    ['bezierCurveTo',reach-.26,yy+side*.18+flutter,.96,yy+side*.12,.72,yy+side*.31],
    ['bezierCurveTo',.50,yy+side*.38,.20,yy+side*.18,.18,yy]]);
}
function flowMarks(g,f){
  const {o,phase,w}=f;
  // Pigment slivers advect out of the hot face and disappear before rebirth.
  // A fade envelope makes respawns invisible and keeps the loop continuous.
  for(let i=0;i<5;i++){
    const u=fract(phase*2+i/5),side=i%2?1:-1;
    const x=-.58+u*1.57,y=side*(.28+.16*Math.sin(u*Math.PI+i*.7));
    const thick=.025+.045*Math.sin(Math.PI*u),length=.22+.14*Math.sin(Math.PI*u);
    const alpha=Math.pow(Math.sin(Math.PI*u),1.6)*.68;
    fill(g,i%3===0?mix(o.flame,o.core,.32):mix(o.body,o.flame,.42),[
      ['moveTo',x-length,y],['bezierCurveTo',x-length*.35,y-side*.10,x+length*.45,y-side*.07,x+length,y-side*.18],
      ['bezierCurveTo',x+length*.4,y+thick,x-length*.3,y+thick,x-length,y]],alpha);
  }
  // Broken dry-brush ends catch light, rather than stippling the entire fill.
  for(let i=0;i<8;i++){
    const a=2.0+i*.25+.04*Math.sin(w*2+i),rr=.79+hash(o.seed,i,8)*.11;
    brush(g,f,{a,span:.10+hash(o.seed,i,9)*.14,r:rr,width:.009+hash(o.seed,i,10)*.009,
      color:i%3?o.flame:o.core,alpha:.20+hash(o.seed,i,11)*.20});
  }
}
function lights(g,f) {
  const {o}=f;
  const radial=(x,y,r,c,k)=>{
    const q=g.createRadialGradient(x,y,0,x,y,r);
    q.addColorStop(0,rgba(c,k));q.addColorStop(.38,rgba(c,k*.43));q.addColorStop(.7,rgba(c,k*.12));q.addColorStop(1,rgba(c,0));
    g.fillStyle=q;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  };
  radial(0,0,1.68,o.body,.28*o.glow);
  radial(-.26,-.05,.88,o.flame,.13*o.glow);
  for(const p of f.flecks)radial(p.x,p.y,.13,o.body,p.alpha*.12*o.glow);
}

// Draw at the caller's origin. Canvas is a creation preview, not a Unity shader claim.
export function draw(g,t,input={}) {
  const f=sample(t,input),{o,w}=f,L=o.layers;
  g.save();g.scale(o.radius*f.pulse,o.radius*f.pulse);
  if(input.flip){g.scale(-1,1);}
  const color=input.buffer!=='light',light=input.buffer!=='color';
  if(color){
    if(L.body){
      contour(g,f);g.fillStyle=o.shadow;g.fill();
      g.save();contour(g,f);g.clip();
      g.translate(-.025,-.008);g.scale(.955,.95);contour(g,f);g.fillStyle=o.body;g.fill();
      g.restore();
      // Broad cyan underpainting: the nucleus remains left, the wake peels right.
      g.save();contour(g,f);g.clip();
      blob(g,-.18,-.015,.82,w,o.flame,.99,1.04);
      plume(g,f,-1,o.body);plume(g,f,1,o.flame,.02);
      const curl=.10*Math.sin(w*2);
      fill(g,o.body,[['moveTo',.26+curl,-.64],['bezierCurveTo',.75,-.45,.59+curl,-.18,.99,-.05],
        ['bezierCurveTo',.65,.03,.61+curl,.20,.55,.46],['bezierCurveTo',.42,.69,.17,.63,.29,.41],
        ['bezierCurveTo',.49+curl,.09,.54,-.24,.26+curl,-.64]]);
      g.restore();
    }
    if(L.brush){
      g.save();contour(g,f);g.clip();
      brush(g,f,{a:1.38,span:2.70,r:.87,width:.105,color:o.flame});
      brush(g,f,{a:2.34,span:1.80,r:.72,width:.065,color:mix(o.flame,o.core,.5)});
      brush(g,f,{a:-1.75+.06*Math.sin(w*2),span:1.05,r:.64,width:.17,color:o.flame});
      brush(g,f,{a:-1.48,span:1.20,r:.90,width:.075,color:o.flame});
      brush(g,f,{a:.20,span:1.09,r:.81,width:.13,color:o.body,drift:-1});
      // Hand-cut filaments turn into pointed, broken edges rather than concentric rings.
      const d=.09*Math.sin(w*2);
      fill(g,mix(o.flame,o.core,.22),[['moveTo',.18,-.56],['bezierCurveTo',.62,-.69,.72,-.38+d,.92,-.37+d],
        ['bezierCurveTo',.68,-.25,.46,-.54,.18,-.56]]);
      fill(g,o.flame,[['moveTo',.48,.13],['bezierCurveTo',.73,.06,1.01,.20+d,1.31,.02+d],
        ['bezierCurveTo',1.08,.30,.80,.36,.48,.13]]);
      flowMarks(g,f);
      g.restore();
    }
    if(L.core){
      blob(g,-.32,-.02,.43+.018*Math.sin(w*2),w,mix(o.flame,o.core,.65),1.02,1.02);
      blob(g,-.36,-.045,.345+.017*Math.sin(w*2+1),w,o.core,.97,1.08);
      // A small white-hot leading chip, no star or lens flare added to the reference.
      brush(g,f,{a:2.62,span:1.28,r:.68,width:.04,color:o.core,alpha:.78});
    }
    if(L.flecks)for(const [i,p]of f.flecks.entries()){
      g.save();g.translate(p.x,p.y);g.rotate(p.angle);const len=p.length;
      fill(g,i%3===0?o.shadow:i%2?o.body:o.flame,[['moveTo',-len,0],['quadraticCurveTo',0,-len*.42,len,0],
        ['quadraticCurveTo',len*.1,len*.35,-len,0]],p.alpha);g.restore();
    }
  }
  if(light&&L.glow&&o.glow>0){g.globalCompositeOperation='lighter';lights(g,f);}
  g.restore();return f;
}

export function render(canvas,t,input={},view={}){
  const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  g.resetTransform();g.clearRect(0,0,W,H);
  const bg=view.background??'dark';
  if(bg==='checker'){
    const s=24;g.fillStyle='#24313f';g.fillRect(0,0,W,H);g.fillStyle='#1b2632';
    for(let y=0;y<H;y+=s)for(let x=0;x<W;x+=s)if((x/s+y/s)%2===0)g.fillRect(x,y,s,s);
  }else if(bg!=='transparent'){
    g.fillStyle=({dark:'#0b1523',gray:'#454545',light:'#e0e7eb',warm:'#695446'})[bg]??bg;g.fillRect(0,0,W,H);
  }
  g.save();g.translate(W*(view.anchorX??.405),H*.5);g.scale(view.scale??Math.min(W/960,H/640),view.scale??Math.min(W/960,H/640));
  draw(g,t,input);g.restore();
}
