// EnergyCluster V5: authored curved membrane data advected over a deformed sphere.
// WebGL authoring prototype, no flipbook, no dependency on reference animation frames.
const TAU = Math.PI * 2;
const mod = (x, n = 1) => ((x % n) + n) % n;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const norm = a => { const d = Math.hypot(...a) || 1; return a.map(v => v / d); };
const torus = x => mod(x + .5) - .5;
export const meta = { name: '能量团 · 球面流动膜', version: '5.0', duration: 2.4, loop: true, fps: 60,
  options: { seed: 37, flow: .18, dissolve: .18, width: .48, deform: .055, glow: .55,
    yaw: .35, pitch: -.25, frontAlpha: .98, backAlpha: .68,
    frontColor: '#edf6ff', backColor: '#80b2fa', edgeColor: '#7ec6ff',
    coreColor: '#f3ffff', innerColor: '#34caff', bodyColor: '#184aff' } };
export function options(input = {}) {
  const o = { ...meta.options, ...input, layers: { front: true, back: true, core: true, volume: true, glow: true, ...input.layers } };
  for (const [k, lo, hi] of [['flow', 0, .35], ['dissolve', 0, 1], ['width', .2, .75], ['deform', 0, .12], ['glow', 0, 1.2], ['frontAlpha', 0, 1], ['backAlpha', 0, 1]]) o[k] = clamp(o[k], lo, hi);
  return o;
}
export function makeSurfaceData(seed = 37, size = 256) {
  const data = new Uint8Array(size * size * 4), phase = (seed - 37) * .037;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rawU = (x + .5) / size, rawV = (y + .5) / size;
    // Shared broad curl and a few sharp notches keep the shapes connected, not noise-generated.
    const u = rawU + .019 * Math.sin(TAU * (rawV * 5 + rawU * 2)) + .009 * Math.sin(TAU * (rawU * 11 - rawV * 7));
    const v = rawV + .018 * Math.sin(TAU * (rawU * 4 - rawV * 3)) * Math.sin(rawV * Math.PI);
    // Authored variable-width S strokes, a branching hook and an open membrane loop.
    const c0 = .18 + .13 * Math.sin(TAU * v + .4) + .035 * Math.sin(TAU * v * 2 + 1.3);
    const w0 = .030 + .075 * (.5 + .5 * Math.sin(TAU * v * 2 - .6)) ** 2;
    const s0 = 1 - sm(w0 - .006, w0 + .012, Math.abs(torus(u - c0)));
    const c1 = .36 + .16 * Math.sin(TAU * u - .9) + .038 * Math.sin(TAU * u * 2 + .2);
    const w1 = .020 + .055 * (.5 + .5 * Math.sin(TAU * u * 3 + 1)) ** 2;
    const gate = 1 - sm(.31, .45, Math.abs(torus(u - .58)));
    const s1 = (1 - sm(w1 - .005, w1 + .011, Math.abs(torus(v - c1)))) * gate;
    const ex = torus(u - .65) / .19, ey = torus(v - .61) / .22;
    const angle = Math.atan2(ey, ex), rr = Math.hypot(ex, ey);
    const target = .92 + .11 * Math.sin(angle * 3) + .07 * Math.cos(angle * 5);
    const w2 = .11 + .23 * (.5 + .5 * Math.sin(angle * 2 - 1)) ** 2;
    const s2 = (1 - sm(w2, w2 + .065, Math.abs(rr - target))) * sm(-.95, -.55, Math.sin(angle + .2));
    const c3 = .82 + .07 * Math.sin(TAU * v * 2 + .7), w3 = .008 + .022 * sm(.25, .7, v);
    const s3 = (1 - sm(w3, w3 + .009, Math.abs(torus(u - c3)))) * sm(.17, .27, v) * (1 - sm(.71, .83, v));
    const c4 = .76 + .10 * Math.sin(TAU * u + .3) + .028 * Math.cos(TAU * u * 3);
    const w4 = .012 + .035 * (.5 + .5 * Math.sin(TAU * u * 2 - .2)) ** 2;
    const s4 = (1 - sm(w4 - .004, w4 + .010, Math.abs(torus(v - c4)))) * (1 - sm(.27, .39, Math.abs(torus(u - .3))));
    let structure = Math.max(s0, s1, s2, s3, s4);
    // Two deliberate teardrop apertures stop intersections becoming solid white plates.
    for (const [cx, cy, rx, ry] of [[.22, .36, .035, .070], [.65, .50, .044, .080], [.16, .69, .032, .05]]) {
      const dx = torus(u - cx) / rx, dy = torus(v - cy) / ry;
      structure *= sm(.65, 1.15, Math.hypot(dx + .16 * dy, dy));
    }
    structure *= sm(.02, .11, v) * (1 - sm(.89, .98, v));
    const edge = clamp(.5 + .19 * Math.sin(TAU * (7 * u + 3 * v) + phase) * Math.sin(TAU * (4 * u - 6 * v))
      + .10 * Math.sin(TAU * (17 * u + 9 * v) + .8));
    // Directed transport plus a divergence-free periodic curl. These are vectors, not frame indices.
    const fx = .58 + .26 * Math.sin(TAU * u) * Math.cos(TAU * v) + .12 * Math.cos(TAU * (2 * u - v));
    const fy = .08 - .26 * Math.cos(TAU * u) * Math.sin(TAU * v) + .24 * Math.cos(TAU * (2 * u - v));
    const i = (y * size + x) * 4;
    data[i] = Math.round(clamp(fx * .5 + .5) * 255); data[i + 1] = Math.round(clamp(fy * .5 + .5) * 255);
    data[i + 2] = Math.round(clamp(structure) * 255); data[i + 3] = Math.round(edge * 255);
  }
  return { data, size, seed };
}
export function sampleData(texture, u, v) {
  const { size, data } = texture, x = mod(u) * size - .5, y = mod(v) * size - .5, ix = Math.floor(x), iy = Math.floor(y);
  const at = (a, b, k) => data[(mod(b, size) * size + mod(a, size)) * 4 + k] / 255;
  return [0, 1, 2, 3].map(k => mix(mix(at(ix, iy, k), at(ix + 1, iy, k), x - ix), mix(at(ix, iy + 1, k), at(ix + 1, iy + 1, k), x - ix), y - iy));
}
export function membrane(u, v, time, input = {}, texture) {
  const o = options(input), phase = mod(time, meta.duration) / meta.duration;
  const base = [u + phase, v], flow = sampleData(texture, ...base), vx = flow[0] * 2 - 1, vy = (flow[1] * 2 - 1) * Math.sin(Math.PI * v);
  const t = mod(phase * 5), t1 = mod(t + .5), blend = Math.abs(t * 2 - 1);
  const warp = .018 * Math.sin(TAU * (v * 3 + phase * 2));
  const a = sampleData(texture, base[0] + warp - vx * t * o.flow * .55, base[1] - vy * t * o.flow * .55);
  const b = sampleData(texture, base[0] + warp - vx * t1 * o.flow * .55, base[1] - vy * t1 * o.flow * .55);
  const value = mix(a[2], b[2], blend), edge = mix(a[3], b[3], blend);
  const threshold = o.width + (edge - .5) * .16 + o.dissolve * .17;
  const coverage = sm(threshold - .035, threshold + .035, value) * (1 - sm(.94, 1, o.dissolve));
  return { coverage, thickness: sm(threshold + .03, .97, value), edge, value };
}
function rotate(p, yaw, pitch) {
  const [x, y, z] = p, xx = x * Math.cos(yaw) + z * Math.sin(yaw), zz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  return [xx, y * Math.cos(pitch) - zz * Math.sin(pitch), y * Math.sin(pitch) + zz * Math.cos(pitch)];
}
function inverseRotate(p, yaw, pitch) {
  const [x, y, z] = p, yy = y * Math.cos(pitch) + z * Math.sin(pitch), zz = -y * Math.sin(pitch) + z * Math.cos(pitch);
  return [x * Math.cos(yaw) - zz * Math.sin(yaw), yy, x * Math.sin(yaw) + zz * Math.cos(yaw)];
}
export function radiusAt(n, time, deform) {
  const p = mod(time, meta.duration) / meta.duration * TAU;
  return 1 + deform * (.6 * Math.sin(n[0] * 5 + n[1] * 3 - n[2] * 4 + p * 3) + .4 * Math.sin(n[0] * 11 - n[1] * 7 + n[2] * 5 - p * 5));
}
export function makeSphere(longitudes = 64, latitudes = 32) {
  const vertices = [], indices = [];
  for (let j = 0; j <= latitudes; j++) for (let i = 0; i <= longitudes; i++) {
    const u = i / longitudes, v = j / latitudes, p = v * Math.PI, a = u * TAU;
    vertices.push(Math.sin(p) * Math.cos(a), Math.cos(p), Math.sin(p) * Math.sin(a), u, v);
  }
  for (let j = 0; j < latitudes; j++) for (let i = 0; i < longitudes; i++) {
    const a = j * (longitudes + 1) + i, b = a + 1, c = a + longitudes + 1, d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices), longitudes, latitudes };
}
export const backgrounds = { original: [5, 7, 22], black: [0, 0, 0], light: [220, 224, 228], warm: [101, 83, 70] };
function over(dst, color, alpha) { return dst.map((v, k) => mix(v, color[k], alpha)); }
function surfaceColor(f, cameraNormal, o, back) {
  const edge = rgb(o.edgeColor), target = rgb(back ? o.backColor : o.frontColor);
  const light = clamp(.94 + cameraNormal[0] * -.06 + cameraNormal[1] * .06 + Math.abs(cameraNormal[2]) * .05);
  return edge.map((v, k) => mix(v, target[k], .55 + .45 * f.thickness) * (back ? .90 : light));
}
export function field(x, y, time, input, texture, background = [5, 7, 22]) {
  const o = options(input), r = Math.hypot(x, y), phase = mod(time, meta.duration) / meta.duration * TAU;
  let c = background.map(v => v / 255);
  const add = (col, power) => { c = c.map((v, k) => v + col[k] * power); };
  if (o.layers.glow) add(rgb(o.bodyColor), Math.exp(-r * r / 1.5) * .27 * o.glow);
  const hit = sign => {
    let z = sign * Math.sqrt(Math.max(0, 1 - r * r)), n, local, radius = 1;
    for (let i = 0; i < 3; i++) { n = norm([x, -y, z]); local = inverseRotate(n, o.yaw, o.pitch); radius = radiusAt(local, time, o.deform); z = sign * Math.sqrt(Math.max(0, radius * radius - r * r)); }
    if (r >= radius) return null;
    n = norm([x, -y, z]); local = inverseRotate(n, o.yaw, o.pitch);
    const f = membrane(mod(Math.atan2(local[2], local[0]) / TAU), Math.acos(clamp(local[1], -1, 1)) / Math.PI, time, o, texture);
    return { f, n, edge: 1 - sm(radius - .012, radius + .006, r) };
  };
  const back = o.layers.back ? hit(-1) : null;
  if (back) c = over(c, surfaceColor(back.f, back.n, o, true), back.f.coverage * o.backAlpha * back.edge);
  if (o.layers.volume) {
    const dx = x - Math.cos(phase * 2) * .16, dy = y - Math.sin(phase * 2) * .13;
    const cyan = clamp(Math.exp(-r * r / .27) * .65 + Math.exp(-(dx * dx + dy * dy) / .17) * .2);
    const col = rgb(o.bodyColor).map((v, k) => mix(v, rgb(o.innerColor)[k], cyan));
    c = over(c, col, (1 - sm(.65, 1.01, r)) * .66);
  }
  if (o.layers.glow && o.layers.core) add(rgb(o.innerColor), Math.exp(-r * r / .13) * .65 * o.glow);
  if (o.layers.core) c = over(c, rgb(o.coreColor), 1 - sm(.182, .205, r));
  const front = o.layers.front ? hit(1) : null;
  if (front) {
    c = over(c, surfaceColor(front.f, front.n, o, false), front.f.coverage * o.frontAlpha * front.edge);
    if (o.layers.glow) add(rgb(o.edgeColor), sm(o.width - .30, o.width + .02, front.f.value) * .24 * o.glow * (1 - sm(.94, 1, o.dissolve)));
  }
  return c.map(v => clamp(v));
}
export function renderCPU(canvas, time, input, texture, { background = 'original', diameter = 220 } = {}) {
  const g = canvas.getContext('2d'), image = g.createImageData(canvas.width, canvas.height), o = options(input);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const bg = background === 'checker' ? ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? [34, 52, 69] : [20, 33, 48]) : backgrounds[background];
    const col = field((x + .5 - canvas.width / 2) / (diameter / 2), (y + .5 - canvas.height / 2) / (diameter / 2), time, o, texture, bg);
    const i = (y * canvas.width + x) * 4; for (let k = 0; k < 3; k++) image.data[i + k] = col[k] * 255; image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
}
const sphereVertex = `attribute vec3 position;attribute vec2 texcoord;
uniform vec2 resolution;uniform float radius,time,deform,yaw,pitch;
varying vec2 uv;varying vec3 normal;
const float TAU=6.28318530718;
void main(){vec3 n=position;float p=mod(time,2.4)/2.4*TAU;
 float d=1.+deform*(.6*sin(dot(n,vec3(5.,3.,-4.))+p*3.)+.4*sin(dot(n,vec3(11.,-7.,5.))-p*5.));
 vec3 q=vec3(n.x*cos(yaw)+n.z*sin(yaw),n.y,-n.x*sin(yaw)+n.z*cos(yaw));
 q=vec3(q.x,q.y*cos(pitch)-q.z*sin(pitch),q.y*sin(pitch)+q.z*cos(pitch));
 normal=q;uv=texcoord;gl_Position=vec4(q.xy*d*radius/(resolution*.5),-q.z*.1,1.);}`;
const sphereFragment = `precision highp float;varying vec2 uv;varying vec3 normal;
uniform sampler2D surface;uniform float time,flow,width,dissolve,back,opacity,glow;
uniform vec3 frontColor,backColor,edgeColor;
void main(){float phase=mod(time,2.4)/2.4;vec2 base=uv+vec2(phase,0.);
 vec2 dir=texture2D(surface,base).rg*2.-1.;dir.y*=sin(uv.y*3.14159265359);
 float p=fract(phase*5.),q=fract(p+.5),blend=abs(p*2.-1.);
 float warp=.018*sin(6.28318530718*(uv.y*3.+phase*2.));
 vec4 a=texture2D(surface,base+vec2(warp,0.)-dir*p*flow*.55),b=texture2D(surface,base+vec2(warp,0.)-dir*q*flow*.55);
 vec4 m=mix(a,b,blend);float threshold=width+(m.a-.5)*.16+dissolve*.17;
 float coverage=smoothstep(threshold-.035,threshold+.035,m.b)*(1.-smoothstep(.94,1.,dissolve));
 float thick=smoothstep(threshold+.03,.97,m.b);
 vec3 n=normalize(normal);float light=clamp(.94-n.x*.06+n.y*.06+abs(n.z)*.05,0.,1.);
 vec3 color=mix(edgeColor,mix(frontColor,backColor,back),.55+.45*thick)*mix(light,.90,back);
 float alpha=coverage*opacity;vec3 emission=edgeColor*smoothstep(width-.30,width+.02,m.b)*.24*glow*(1.-back)*(1.-smoothstep(.94,1.,dissolve));
 gl_FragColor=vec4(color*alpha+emission,alpha);}`;
const quadVertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
const quadFragment = `precision highp float;
uniform vec2 resolution;uniform float radius,time,stage,background,glow;
uniform vec4 layers;uniform vec3 coreColor,innerColor,bodyColor;
void main(){vec2 q=(gl_FragCoord.xy-resolution*.5)/radius;q.y=-q.y;float r=length(q),p=mod(time,2.4)/2.4*6.28318530718;
 if(stage<.5){vec3 bg=vec3(5.,7.,22.)/255.;
 if(background>.5&&background<1.5)bg=vec3(0.);if(background>1.5&&background<2.5)bg=vec3(220.,224.,228.)/255.;
 if(background>2.5&&background<3.5)bg=mix(vec3(20.,33.,48.),vec3(34.,52.,69.),mod(floor(gl_FragCoord.x/16.)+floor((resolution.y-gl_FragCoord.y)/16.),2.))/255.;
 if(background>3.5)bg=vec3(101.,83.,70.)/255.;gl_FragColor=vec4(bg+bodyColor*exp(-r*r/1.5)*.27*glow*layers.z,1.);}
 else{vec3 c=vec3(0.);float alpha=0.;
 if(layers.x>.5){vec2 d=q-vec2(cos(p*2.)*.16,sin(p*2.)*.13);float cyan=clamp(exp(-r*r/.27)*.65+exp(-dot(d,d)/.17)*.2,0.,1.);alpha=(1.-smoothstep(.65,1.01,r))*.66;c=mix(bodyColor,innerColor,cyan)*alpha;}
 if(layers.z>.5&&layers.y>.5)c+=innerColor*exp(-r*r/.13)*.65*glow;
 if(layers.y>.5){float a=1.-smoothstep(.182,.205,r);c=c*(1.-a)+coreColor*a;alpha=alpha*(1.-a)+a;}
 gl_FragColor=vec4(c,alpha);}}`;
export function createWebGL(canvas, texture) {
  const surface = document.createElement('canvas'); surface.width = canvas.width; surface.height = canvas.height;
  const gl = surface.getContext('webgl', { alpha: false, antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw Error('WebGL 不可用，球面网格预览未启用。');
  const compile = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  const program = (v, f, names) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, v)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p)); return { p, loc: Object.fromEntries(names.map(k => [k, gl.getUniformLocation(p, k)])) }; };
  const sphere = program(sphereVertex, sphereFragment, ['resolution', 'radius', 'time', 'deform', 'yaw', 'pitch', 'surface', 'flow', 'width', 'dissolve', 'back', 'opacity', 'glow', 'frontColor', 'backColor', 'edgeColor']);
  const quad = program(quadVertex, quadFragment, ['resolution', 'radius', 'time', 'stage', 'background', 'glow', 'layers', 'coreColor', 'innerColor', 'bodyColor']);
  const mesh = makeSphere(), vb = gl.createBuffer(), ib = gl.createBuffer(), qb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texture.size, texture.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture.data);
  for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, axis, gl.REPEAT);
  for (const f of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, f, gl.LINEAR);
  const g = canvas.getContext('2d');
  function attrib(p, name, n, stride, offset) { const loc = gl.getAttribLocation(p, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, offset); }
  return { render(time, input = {}, { background = 'original', diameter = 220 } = {}) {
    const o = options(input); gl.viewport(0, 0, surface.width, surface.height); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    function drawQuad(stage) {
      gl.useProgram(quad.p); gl.disable(gl.CULL_FACE); gl.bindBuffer(gl.ARRAY_BUFFER, qb); attrib(quad.p, 'position', 2, 0, 0);
      const l = quad.loc; gl.uniform2f(l.resolution, surface.width, surface.height); gl.uniform1f(l.radius, diameter / 2); gl.uniform1f(l.time, mod(time, meta.duration));
      gl.uniform1f(l.stage, stage); gl.uniform1f(l.background, { original: 0, black: 1, light: 2, checker: 3, warm: 4 }[background]);
      gl.uniform1f(l.glow, o.glow); gl.uniform4f(l.layers, +o.layers.volume, +o.layers.core, +o.layers.glow, 0);
      for (const key of ['coreColor', 'innerColor', 'bodyColor']) gl.uniform3fv(l[key], rgb(o[key]));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    function drawShell(back) {
      gl.useProgram(sphere.p); gl.enable(gl.CULL_FACE); gl.frontFace(gl.CCW); gl.cullFace(back ? gl.FRONT : gl.BACK);
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); attrib(sphere.p, 'position', 3, 20, 0); attrib(sphere.p, 'texcoord', 2, 20, 12); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      const l = sphere.loc; gl.uniform2f(l.resolution, surface.width, surface.height); gl.uniform1f(l.radius, diameter / 2);
      gl.uniform1f(l.time, mod(time, meta.duration)); gl.uniform1i(l.surface, 0);
      for (const k of ['deform', 'yaw', 'pitch', 'flow', 'width', 'dissolve']) gl.uniform1f(l[k], o[k]);
      gl.uniform1f(l.back, +back); gl.uniform1f(l.opacity, back ? o.backAlpha : o.frontAlpha); gl.uniform1f(l.glow, o.layers.glow ? o.glow : 0);
      for (const k of ['frontColor', 'backColor', 'edgeColor']) gl.uniform3fv(l[k], rgb(o[k]));
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.BLEND); drawQuad(0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (o.layers.back) drawShell(true); drawQuad(1); if (o.layers.front) drawShell(false);
    g.clearRect(0, 0, canvas.width, canvas.height); g.drawImage(surface, 0, 0);
  }, info: { renderer: 'Real WebGL UV sphere, GPU vertex deformation, separate front/back passes, no flipbook',
    trianglesPerHemispherePass: mesh.indices.length / 3, vertices: mesh.vertices.length / 5,
    texture: `${texture.size}x${texture.size} RGBA8 linear data, Repeat/Bilinear, no mips`, unity: false } };
}
