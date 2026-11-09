// EnergyCluster V2 — realtime domain-warped dissolve membrane, not a rotating ribbon cage.
// Authoring only. Shared static noise data and separate color/light math for CPU / WebGL review.
import { drawColor as drawV1Color, drawLight as drawV1Light } from './energy-cluster.js';
const TAU = Math.PI * 2, mod = (x, n = 1) => ((x % n) + n) % n;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const meta = { name: '湛蓝能量团 · 溶解流动', version: '2.0', duration: 4, fps: 60, loop: true,
  options: { seed: 37, dissolve: .46, distortion: .7, noiseScale: 1.45, edgeWidth: .07, glow: .7, pulse: .025,
    coreSize: .205, arcAmount: .7, core: '#f5ffff', inner: '#2bd7ff', body: '#1650ff', shell: '#eafaff', arc: '#c8eeff' } };
export function options(input = {}) {
  const o = { ...meta.options, ...input, layers: { core: true, volume: true, shell: true, arcs: true, light: true, ...input.layers } };
  for (const [key, lo, hi] of [['dissolve', 0, 1], ['distortion', 0, 1.5], ['noiseScale', .7, 2.5], ['edgeWidth', .015, .14], ['glow', 0, 1.4], ['coreSize', .1, .3], ['pulse', 0, .08], ['arcAmount', 0, 1.8]]) o[key] = clamp(o[key], lo, hi);
  return o;
}
function random(x, y, seed) {
  let v = Math.imul(x + seed * 197, 374761393) + Math.imul(y + seed * 41, 668265263);
  v = Math.imul(v ^ v >>> 13, 1274126177); return ((v ^ v >>> 16) >>> 0) / 4294967295;
}
function lattice(x, y, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const at = (a, b) => random(mod(a, period), mod(b, period), seed);
  return mix(mix(at(ix, iy), at(ix + 1, iy), u), mix(at(ix, iy + 1), at(ix + 1, iy + 1), u), v);
}
export function makeNoise(seed = 37, size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let k = 0; k < 3; k++) {
    let n = 0, weight = 0;
    for (const [freq, w] of [[4, .58], [8, .29], [16, .1], [32, .03]]) {
      n += lattice((x + .5) / size * freq, (y + .5) / size * freq, freq, seed + k * 79) * w; weight += w;
    }
    data[(y * size + x) * 4 + k] = Math.round(clamp(.5 + (n / weight - .5) * 1.5) * 255);
    data[(y * size + x) * 4 + 3] = 255;
  }
  return { data, size, seed };
}
export function noiseAt(noise, u, v, channel = 0) {
  const { size, data } = noise, x = mod(u) * size - .5, y = mod(v) * size - .5, ix = Math.floor(x), iy = Math.floor(y);
  const at = (a, b) => data[(mod(b, size) * size + mod(a, size)) * 4 + channel] / 255;
  return mix(mix(at(ix, iy), at(ix + 1, iy), x - ix), mix(at(ix, iy + 1), at(ix + 1, iy + 1), x - ix), y - iy);
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const palette = o => Object.fromEntries(['core', 'inner', 'body', 'shell'].map(k => [k, rgb(o[k])]));
export function context(time, input = {}, noise) {
  const o = options(input), phase = mod(time, meta.duration) / meta.duration;
  return { o, phase, p: phase * TAU, colors: palette(o), noise: noise?.seed === o.seed ? noise : makeNoise(o.seed), pulse: 1 + o.pulse * Math.sin(phase * TAU * 3) };
}
export function field(x, y, f) {
  const { o, phase: t, p, colors: C, noise } = f;
  x /= f.pulse; y /= f.pulse;
  const r = Math.hypot(x, y), a = Math.atan2(y, x), z = Math.sqrt(Math.max(0, 1 - Math.min(1, r * r)));
  const u = Math.atan2(x, z) / TAU * 2.2, v = Math.asin(clamp(y, -1, 1)) / Math.PI * .55;
  const bx = u * o.noiseScale, by = v * o.noiseScale;
  const wx = noiseAt(noise, bx * .61 - t, by * .61 + 2 * t, 0) - .5;
  const wy = noiseAt(noise, bx * .61 - t, by * .61 + 2 * t, 1) - .5;
  const n0 = noiseAt(noise, bx - 2 * t + wx * o.distortion, by + t + wy * o.distortion, 2);
  const n1 = noiseAt(noise, bx * 2.3 + 3 * t + wy * .25, by * 2.3 - 2 * t + wx * .25, 0);
  const n = n0 * .87 + n1 * .13;
  const rimNoise = noiseAt(noise, Math.cos(a) * .63 - t, Math.sin(a) * .63 + t, 1);
  const outer = .97 + (rimNoise - .5) * .28 + .018 * Math.sin(a * 13 - p * 3);
  const silhouette = 1 - smooth(outer - .025, outer + .018, r);
  const threshold = mix(-.035, 1.035, o.dissolve), soft = .015;
  const holes = smooth(.58, .60, n1) * smooth(.05, .3, o.dissolve);
  const membrane = smooth(threshold, threshold + soft, n) * (1 - holes) * silhouette * smooth(.27, .41, r);
  const depth = outer - r, rimWidth = .018 + .065 * smooth(.3, .7, rimNoise);
  const rim = smooth(-.008, .006, depth) * (1 - smooth(rimWidth, rimWidth + .018, depth)) * smooth(threshold - .15, threshold + .03, rimNoise);
  const shell = Math.max(membrane, rim) * (1 - smooth(.96, 1, o.dissolve));
  const edge = 1 - smooth(threshold + o.edgeWidth, threshold + o.edgeWidth * 1.8, n);
  let col = [0, 0, 0], alpha = 0;
  const over = (c, a) => { if (a <= 0) return; const out = a + alpha * (1 - a); col = col.map((v, k) => (c[k] * a + v * alpha * (1 - a)) / Math.max(.00001, out)); alpha = out; };
  if (o.layers.volume) {
    const cyan = Math.exp(-r * r / .13), volume = (1 - smooth(.64, outer + .13, r)) * (.59 + .15 * n);
    over(C.body.map((v, k) => mix(v, C.inner[k], cyan)), volume);
  }
  if (o.layers.shell) over(C.inner.map((v, k) => mix(v, C.shell[k], .91 + edge * .09)), shell * .98);
  if (o.layers.core) over(C.core, 1 - smooth(o.coreSize - .005, o.coreSize + .005, r));
  const light = [0, 0, 0];
  if (o.layers.light && o.glow > 0) {
    for (let k = 0; k < 3; k++) {
      const halo = Math.pow(Math.max(0, 1 - r / 1.9), 2) * .65 + Math.exp(-((r - 1) ** 2) / .035) * .18;
      const center = Math.exp(-r * r / .11) * .45;
      const border = (1 - smooth(.03, .11, Math.abs(r - outer))) * .14;
      const erosion = (1 - smooth(.015, o.edgeWidth * 1.2, Math.abs(n - threshold))) * silhouette * smooth(.28, .4, r) * .13;
      light[k] = o.glow * ((o.layers.volume ? C.body[k] * halo : 0) + (o.layers.core ? C.inner[k] * center : 0) + (o.layers.shell ? C.body[k] * (border + erosion) * (1 - o.dissolve) : 0));
    }
  }
  return { col, alpha, light, shell, n, membrane, rim };
}
export const vertexShader = 'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
export const fragmentShader = `
precision highp float;
varying vec2 uv;
uniform sampler2D u_noise;
uniform vec2 u_resolution;
uniform float u_radius,u_phase,u_dissolve,u_distortion,u_noiseScale,u_edgeWidth,u_glow,u_coreSize,u_pulse,u_background;
uniform vec4 u_layers;
uniform vec3 u_core,u_inner,u_body,u_shell;
const float TAU=6.28318530718;
float sm(float a,float b,float x){return smoothstep(a,b,x);}
void over(inout vec3 c,inout float alpha,vec3 src,float a){float outA=a+alpha*(1.-a);c=(src*a+c*alpha*(1.-a))/max(.00001,outA);alpha=outA;}
void main(){
 vec2 q=(gl_FragCoord.xy-u_resolution*.5)/u_radius;q.y=-q.y;
 float pulse=1.+u_pulse*sin(u_phase*TAU*3.);q/=pulse;
 float r=length(q),a=atan(q.y,q.x),z=sqrt(max(0.,1.-min(1.,r*r)));
 vec2 base=vec2(atan(q.x,z)/TAU*2.2,asin(clamp(q.y,-1.,1.))/3.14159265359*.55)*u_noiseScale;
 vec2 warp=texture2D(u_noise,base*.61+vec2(-u_phase,2.*u_phase)).rg-.5;
 float n0=texture2D(u_noise,base+vec2(-2.*u_phase,u_phase)+warp*u_distortion).b;
 float n1=texture2D(u_noise,base*2.3+vec2(3.*u_phase,-2.*u_phase)+warp.yx*.25).r;
 float n=n0*.87+n1*.13;
 float rn=texture2D(u_noise,vec2(cos(a),sin(a))*.63+vec2(-u_phase,u_phase)).g;
 float outer=.97+(rn-.5)*.28+.018*sin(a*13.-u_phase*TAU*3.), silhouette=1.-sm(outer-.025,outer+.018,r);
 float threshold=mix(-.035,1.035,u_dissolve);
 float holes=sm(.58,.60,n1)*sm(.05,.3,u_dissolve);
 float membrane=sm(threshold,threshold+.015,n)*(1.-holes)*silhouette*sm(.27,.41,r);
 float depth=outer-r,rimWidth=.018+.065*sm(.3,.7,rn);
 float rim=sm(-.008,.006,depth)*(1.-sm(rimWidth,rimWidth+.018,depth))*sm(threshold-.15,threshold+.03,rn);
 float shell=max(membrane,rim)*(1.-sm(.96,1.,u_dissolve));
 float edge=1.-sm(threshold+u_edgeWidth,threshold+u_edgeWidth*1.8,n);
 vec3 c=vec3(0.);float alpha=0.;
 if(u_layers.y>.5){float cyan=exp(-r*r/.13),volume=(1.-sm(.64,outer+.13,r))*(.59+.15*n);over(c,alpha,mix(u_body,u_inner,cyan),volume);}
 if(u_layers.z>.5)over(c,alpha,mix(u_inner,u_shell,.91+edge*.09),shell*.98);
 if(u_layers.x>.5)over(c,alpha,u_core,1.-sm(u_coreSize-.005,u_coreSize+.005,r));
 vec3 light=vec3(0.);
 if(u_layers.w>.5){float halo=pow(max(0.,1.-r/1.9),2.)*.65+exp(-(r-1.)*(r-1.)/.035)*.18,center=exp(-r*r/.11)*.45;
 float border=(1.-sm(.03,.11,abs(r-outer)))*.14;
 float erosion=(1.-sm(.015,u_edgeWidth*1.2,abs(n-threshold)))*silhouette*sm(.28,.4,r)*.13;
 light=u_glow*(u_layers.y*u_body*halo+u_layers.x*u_inner*center+u_layers.z*u_body*(border+erosion)*(1.-u_dissolve));}
 vec3 bg=vec3(.02745,.04706,.10588);
 if(u_background>.5&&u_background<1.5)bg=vec3(.87059,.87451,.87451);
 if(u_background>1.5&&u_background<2.5)bg=mix(vec3(.07843,.13725,.2),vec3(.14118,.22353,.29804),mod(floor(gl_FragCoord.x/16.)+floor(gl_FragCoord.y/16.),2.));
 if(u_background>2.5)bg=vec3(.39608,.32549,.27451);
 gl_FragColor=vec4(c*alpha+bg*(1.-alpha)+light,1.);
}`;
export const backgrounds = { dark: [7, 12, 27], light: [222, 223, 223], warm: [101, 83, 70] };
export function renderCPU(canvas, time, input = {}, { background = 'dark', diameter = 300, noise } = {}) {
  const f = context(time, input, noise), g = canvas.getContext('2d'), { width: w, height: h } = canvas;
  const pixels = g.createImageData(w, h), data = pixels.data, r = diameter / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = field((x + .5 - w / 2) / r, (y + .5 - h / 2) / r, f), i = (y * w + x) * 4;
    const bg = background === 'checker' ? ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? [36, 57, 76] : [20, 35, 51]) : backgrounds[background];
    if (background === 'transparent') {
      const a = Math.max(s.alpha, ...s.light); for (let k = 0; k < 3; k++) data[i + k] = clamp((s.col[k] * s.alpha + s.light[k]) / Math.max(.00001, a)) * 255; data[i + 3] = a * 255;
    } else {
      for (let k = 0; k < 3; k++) data[i + k] = clamp(s.col[k] * s.alpha + bg[k] / 255 * (1 - s.alpha) + s.light[k]) * 255; data[i + 3] = 255;
    }
  }
  g.putImageData(pixels, 0, 0); paintArcs(g, time, f.o, w / 2, h / 2, diameter);
  return f;
}
function paintArcs(g, time, o, x, y, diameter) {
  if (!o.layers.arcs || o.arcAmount <= 0) return;
  const arcs = { ...o, radius: 100, layers: { core: false, volume: false, shell: false, arcs: true, light: o.layers.light } };
  g.save(); g.translate(x, y); g.scale(diameter / 200, diameter / 200);
  drawV1Light(g, time, arcs); drawV1Color(g, time, arcs); g.restore();
}
export function createWebGL(canvas) {
  const surface = document.createElement('canvas'); surface.width = canvas.width; surface.height = canvas.height;
  const gl = surface.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw Error('WebGL 不可用，请查看离线 CPU 对照；没有自动降为旧的带状版本。');
  const compile = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  const program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)); gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const keys = ['resolution', 'radius', 'phase', 'dissolve', 'distortion', 'noiseScale', 'edgeWidth', 'glow', 'coreSize', 'pulse', 'background', 'layers', 'core', 'inner', 'body', 'shell'];
  const locations = Object.fromEntries(keys.map(k => [k, gl.getUniformLocation(program, 'u_' + k)]));
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, axis, gl.REPEAT);
  for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, 'u_noise'), 0);
  const g = canvas.getContext('2d'); let lastSeed, noise;
  return { render(time, input = {}, { background = 'dark', diameter = 300 } = {}) {
    const o = options(input);
    if (lastSeed !== o.seed) { noise = makeNoise(o.seed); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noise.size, noise.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise.data); lastSeed = o.seed; }
    gl.viewport(0, 0, surface.width, surface.height); gl.uniform2f(locations.resolution, surface.width, surface.height);
    gl.uniform1f(locations.radius, diameter / 2); gl.uniform1f(locations.phase, mod(time, meta.duration) / meta.duration);
    for (const k of ['dissolve', 'distortion', 'noiseScale', 'edgeWidth', 'glow', 'coreSize', 'pulse']) gl.uniform1f(locations[k], o[k]);
    gl.uniform1f(locations.background, { dark: 0, light: 1, checker: 2, warm: 3 }[background] ?? 0);
    gl.uniform4f(locations.layers, +o.layers.core, +o.layers.volume, +o.layers.shell, +o.layers.light);
    for (const k of ['core', 'inner', 'body', 'shell']) gl.uniform3fv(locations[k], rgb(o[k]));
    gl.drawArrays(gl.TRIANGLES, 0, 6); g.clearRect(0, 0, canvas.width, canvas.height); g.drawImage(surface, 0, 0);
    paintArcs(g, time, o, canvas.width / 2, canvas.height / 2, diameter);
  }, info: { renderer: 'WebGL fragment shader + native Canvas electric strokes', noise: '128x128 RGBA static, 3 independent channels, Repeat/Linear', unity: false } };
}
