// Original HD pixelfx study. Reference: the author's blue/cyan energy-sphere image.
// Pure time-sampled Canvas authoring model; no flipbooks or Unity runtime controller.
export const meta = {
  name: '赛博能量弹 · CYBER ORB', version: '1.0.3', duration: 4, loop: true, fps: 60,
  size: [1400, 560], origin: [970, 280],
  options: {seed: 42, radius: 64, speed: 560, trailLife: .78, glow: .7, turbulence: 1,
    motion: 'curve', body: '#2465f2', rim: '#65edff', trail: '#2877ff', core: '#ddffff'},
};
const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const fract = n => n - Math.floor(n);
const hash = (seed, i, k = 0) => fract(Math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453);
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${clamp(a)})`;
const mix = (a,b,k) => '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-k)+parseInt(b.slice(i,i+2),16)*k).toString(16).padStart(2,'0')).join('');
export const options = o => ({...meta.options, ...o, layers: {...o?.layers}});
let layoutKey='',layoutScale=1.35;
// Stable framing for the whole loop; do not zoom in/out as fragments are born.
export function previewScale(input={}) {
  const o=options(input),key=JSON.stringify([o.seed,o.speed,o.trailLife,o.radius,o.motion,o.turbulence]);
  if(key===layoutKey)return layoutScale;
  let left=o.radius*2.45,vertical=left;
  for(let i=0;i<48;i++) {
    const f=sample(i*meta.duration/48,o);
    for(const p of f.history){left=Math.max(left,-p.x+Math.abs(p.nx)*p.width*1.6);vertical=Math.max(vertical,Math.abs(p.y)+Math.abs(p.ny)*p.width*1.6);}
    for(const p of f.sparks){left=Math.max(left,-p.x+p.size*5);vertical=Math.max(vertical,Math.abs(p.y)+p.size*5);}
  }
  layoutKey=key;layoutScale=Math.min(1.35,870/(left+16),248/(vertical+16));return layoutScale;
}

// World-space history, not a tail rotated rigidly with the current heading.
export function positionAt(t, input = {}) {
  const o = options(input), a = t * TAU / meta.duration;
  return [t * o.speed, o.motion === 'straight' ? 0 : (112 * Math.sin(a) + 28 * Math.sin(a * 2 + .5))];
}
export function sample(t, input = {}) {
  const o = options(input), phase = ((t % meta.duration) + meta.duration) % meta.duration;
  const w = phase * TAU / meta.duration, head = positionAt(phase, o), R = o.radius;
  const tangent = age => {
    const p = positionAt(phase - age, o), v = positionAt(phase - age + .001, o);
    const angle = Math.atan2(v[1] - p[1], v[0] - p[0]);
    return {x: p[0] - head[0], y: p[1] - head[1], nx: -Math.sin(angle), ny: Math.cos(angle), angle};
  };
  const history = [];
  for (let i = 0; i <= 100; i++) {
    const u = i / 100, age = R * .47 / o.speed + u * o.trailLife;
    const p = tangent(age), ripple = Math.sin(u * 21 - w * 4) * R * .045 * Math.sin(Math.PI * u) * o.turbulence;
    history.push({...p, x: p.x + p.nx * ripple, y: p.y + p.ny * ripple, u,
      width: R * .53 * Math.pow(1 - u, 1.08) * (1 + .09 * Math.sin(u * 27 - w * 4))});
  }
  const rim = [];
  for (let i = 0; i <= 320; i++) {
    const a = i * TAU / 320, n = Math.sin(a * 19 + w * 3) * .43 + Math.sin(a * 37 - w * 5) * .27 + Math.sin(a * 71 + w * 7) * .18;
    const r = R * (.93 + n * .035 * o.turbulence);
    rim.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const sparks = [];
  for (let i = 0; i < 23; i++) {
    // Four-second integer cycles keep the visual seam exact, including fragment respawns.
    const u = fract(phase / meta.duration * (5 + i % 3) + hash(o.seed, i)), age = u * o.trailLife;
    const side = hash(o.seed, i, 1) > .5 ? 1 : -1, p = tangent(age + R * .8 / o.speed);
    const offset = side * R * (.36 + hash(o.seed, i, 2) * .42 + u * .34);
    sparks.push({x: p.x + p.nx * offset, y: p.y + p.ny * offset, angle: p.angle,
      size: R * (.025 + hash(o.seed, i, 3) * .035), length: R * (.08 + hash(o.seed, i, 4) * .22),
      alpha: Math.sin(Math.PI * u) * Math.pow(1 - u, .8) * .8, digital: i % 3 === 0});
  }
  return {o, phase, w, history, rim, sparks, heading: tangent(0).angle};
}
function path(g, pts, close = false) {
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); if (close) g.closePath();
}
function disc(g, x, y, r, c) {g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=c;g.fill();}
function stroke(g, pts, color, width) {path(g,pts);g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.stroke();}
function ribbon(g, h, offset, scale, fill) {
  const side = sign => h.map(p => [p.x + p.nx * (offset(p) + sign * p.width * scale), p.y + p.ny * (offset(p) + sign * p.width * scale)]);
  path(g, [...side(1), ...side(-1).reverse()], true);g.fillStyle=fill;g.fill();
}
function radial(g, x,y,r,c,k) {
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,rgba(c,k));q.addColorStop(.36,rgba(c,k*.48));q.addColorStop(1,rgba(c,0));disc(g,x,y,r,q);
}
function tailColor(g, f) {
  const {o, history:h, w} = f, R=o.radius;
  const grad=g.createLinearGradient(h.at(-1).x,0,h[0].x,0);
  grad.addColorStop(0,rgba(o.trail,0));grad.addColorStop(.2,rgba(o.trail,.07));grad.addColorStop(.65,rgba(o.trail,.42));grad.addColorStop(1,rgba(o.rim,.7));
  ribbon(g,h,()=>0,1,grad);
  const spine=g.createLinearGradient(h.at(-1).x,0,h[0].x,0);
  spine.addColorStop(0,rgba(o.trail,0));spine.addColorStop(.55,rgba(o.trail,.28));spine.addColorStop(1,rgba(o.rim,.8));
  ribbon(g,h,p=>Math.sin(p.u*15-w*3)*R*.045*p.u,.18,spine);
  for (const side of [-1,1]) {
    const pts=h.map(p=>[p.x+p.nx*side*p.width*.83,p.y+p.ny*side*p.width*.83]);
    const q=g.createLinearGradient(h.at(-1).x,0,h[0].x,0);q.addColorStop(0,rgba(o.trail,0));q.addColorStop(.4,rgba(o.trail,.16));q.addColorStop(1,rgba(o.rim,.64));
    stroke(g,pts,q,R*.022);
  }
  // Three broken ion filaments, deliberately not a dense bundle of laser lines.
  for(let j=0;j<3;j++) {
    const pts=[];
    for(let i=0;i<52;i++) {
      const u=.12+i/65, p=h[Math.min(99,Math.round(u*100))];
      const d=(j-1)*R*.21*(1-u)+Math.sin(u*28-w*4+j*2)*R*.04*(1-u);
      pts.push([p.x+p.nx*d,p.y+p.ny*d]);
    }
    const end=(.5+.5*Math.sin(w*3+j*2));
    stroke(g,pts.slice(4+Math.floor(end*8),44+Math.floor(end*7)),rgba(j===1?o.core:o.rim,j===1?.26:.4),R*(j===1?.018:.012));
  }
  // A few rectilinear data packets interrupt the otherwise continuous wake.
  for(let j=0;j<6;j++) {
    const u=fract(w/TAU*6+j/6),p=h[Math.round((.14+u*.7)*100)],side=j%2?1:-1;
    const d=side*p.width*.6,alpha=Math.sin(u*Math.PI)*.52;
    g.save();g.translate(p.x+p.nx*d,p.y+p.ny*d);g.rotate(p.angle);
    g.fillStyle=rgba(o.rim,alpha);g.fillRect(-R*.17,0,R*(j%2?.16:.09),R*.018);g.restore();
  }
}
function orbColor(g,f) {
  const {o,w,rim}=f,R=o.radius;
  g.save();g.beginPath();g.arc(0,0,R,0,TAU);g.clip();
  const volume=g.createRadialGradient(-R*.34,-R*.38,R*.04,R*.08,R*.13,R*1.23);
  volume.addColorStop(0,mix(o.body,o.rim,.18));volume.addColorStop(.58,o.body);volume.addColorStop(.83,mix(o.body,'#0b245b',.2));volume.addColorStop(1,mix(o.body,o.trail,.2));
  disc(g,0,0,R,volume);
  // Broad painterly current bands; never fill the sphere with a white-hot disc.
  for(let j=0;j<7;j++) {
    const a=w*(j%2?1:-1)+j*2.399, d=R*(.18+(j%3)*.19),x=Math.cos(a)*d,y=Math.sin(a)*d;
    g.save();g.translate(x,y);g.rotate(a);g.scale(1,.42);
    radial(g,0,0,R*(.4+j*.025),j%2?o.rim:o.trail,j%2?.105:.21);g.restore();
  }
  // Subtle circuit fragments rotate inside the contained plasma, not an external HUD.
  g.save();g.rotate(w);
  for(let i=0;i<5;i++) {
    const a=i*TAU/5, r=R*(.32+(i%2)*.15),x=Math.cos(a)*r,y=Math.sin(a)*r;
    g.save();g.translate(x,y);g.rotate(a+.3);stroke(g,[[-R*.13,0],[0,0],[R*.06,-R*.06],[R*.14,-R*.06]],rgba(o.rim,.18),R*.011);
    g.fillStyle=rgba(o.rim,.3);g.fillRect(R*.13,-R*.075,R*.03,R*.03);g.restore();
  }
  const hex=[];for(let i=0;i<6;i++){const a=i*TAU/6;hex.push([Math.cos(a)*R*.19,Math.sin(a)*R*.19]);}
  stroke(g,hex.slice(0,3),rgba(o.rim,.25),R*.014);stroke(g,hex.slice(3),rgba(o.rim,.18),R*.014);
  g.restore();
  // An uneven interior ionization edge preserves the reference's bright rim / blue center.
  stroke(g,rim,rgba(o.rim,.25),R*.13);stroke(g,rim,rgba(o.rim,.64),R*.041);
  for(let j=0;j<8;j++) {
    const start=(j*39+Math.floor((Math.sin(w*2+j)*.5+.5)*10))%300;
    stroke(g,rim.slice(start,start+12+j%3*4),rgba(j%3?o.rim:o.core,.62),R*.024);
  }
  g.restore();
  g.beginPath();g.arc(0,0,R,0,TAU);g.strokeStyle=rgba(o.trail,.92);g.lineWidth=R*.055;g.stroke();
  g.beginPath();g.arc(0,0,R*.989,0,TAU);g.strokeStyle=rgba(o.rim,.92);g.lineWidth=R*.018;g.stroke();
  // Tiny segmented containment traces give a technological, rather than magical, accent.
  for(let j=0;j<3;j++) {
    const a=j*TAU/3-w+.2;g.beginPath();g.arc(0,0,R*1.065,a,a+.38);
    g.strokeStyle=rgba(o.rim,.46);g.lineWidth=R*.014;g.stroke();
    const x=Math.cos(a+.4)*R*1.065,y=Math.sin(a+.4)*R*1.065;disc(g,x,y,R*.016,rgba(o.core,.9));
  }
}
function fragments(g,f,light=false) {
  const {o,sparks}=f;
  for(const p of sparks) {
    g.save();g.translate(p.x,p.y);g.rotate(p.angle);
    if(light)radial(g,0,0,p.size*5,o.rim,p.alpha*.14*o.glow);
    else if(p.digital) {g.fillStyle=rgba(o.rim,p.alpha);g.fillRect(-p.length*.35,-p.size*.5,p.length*.45,p.size);}
    else stroke(g,[[-p.length,0],[0,0]],rgba(o.rim,p.alpha),p.size*.5);
    g.restore();
  }
}
// Draw at the caller's origin; callers own clear/position/scale. Color and light can be inspected separately.
export function draw(g,t,input={}) {
  const f=sample(t,input),{o,w}=f,R=o.radius,L=o.layers,buffer=o.buffer??'combined';
  g.save();
  if(buffer!=='light') {
    g.globalCompositeOperation='source-over';
    if(L.trail!==false)tailColor(g,f);
    if(L.sparks!==false)fragments(g,f);
    if(L.orb!==false)orbColor(g,f);
  }
  if(buffer!=='color'&&o.glow>0&&L.glow!==false) {
    g.globalCompositeOperation='lighter';
    if(L.trail!==false) {
      const h=f.history,q=g.createLinearGradient(h.at(-1).x,0,h[0].x,0);
      q.addColorStop(0,rgba(o.trail,0));q.addColorStop(.65,rgba(o.trail,.035*o.glow));q.addColorStop(1,rgba(o.rim,.15*o.glow));
      g.save();
      if(L.orb!==false) {
        g.beginPath();g.rect(h.at(-1).x-R*4,-R*8,-h.at(-1).x+R*8,R*16);
        g.moveTo(R,0);g.arc(0,0,R,0,TAU);g.closePath();g.clip('evenodd');
      }
      ribbon(g,h,()=>0,1.55,q);g.restore();
    }
    if(L.orb!==false) {
      radial(g,0,0,R*2.45,o.trail,.27*o.glow);radial(g,0,0,R*1.22,o.rim,.14*o.glow);
      stroke(g,f.rim,rgba(o.rim,.13*o.glow),R*.11);
      const a=-1.1+.1*Math.sin(w*3),x=Math.cos(a)*R*.95,y=Math.sin(a)*R*.95;
      radial(g,x,y,R*.22,o.core,.35*o.glow);
    }
    if(L.sparks!==false)fragments(g,f,true);
  }
  g.restore();return f;
}
