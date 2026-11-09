// V4 hybrid study: reference-derived shell SDF + continuous analytic color/light.
// This is an authoring renderer, not a Unity shader or a pixel-identical reference reconstruction.
const TAU = Math.PI * 2;
const mod = (x, n) => ((x % n) + n) % n;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
export const meta = { name: '能量团 · 混合分层', version: '4.3', duration: .48, fps: 20 / .48, frameCount: 20, loop: true,
  options: { seed: 37, interpolation: 'distance', glow: .72, pulse: .018,
    coreColor: '#f2ffff', innerColor: '#28c9ff', bodyColor: '#164aff', shellColor: '#e6f3ff', arcColor: '#c7eaff' } };
export function options(input = {}) {
  return { ...meta.options, ...input, layers: { core: true, volume: true, shell: true, glow: true, motes: true, ...input.layers } };
}
export function makeSampler({ data, width = 1280, height = 1024 }) {
  return (x, y, index) => {
    const sx = clamp(x + 127.5, 0, 255), sy = clamp(y + 127.5, 0, 255);
    const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
    const ox = mod(index, 5) * 256, oy = Math.floor(mod(index, 20) / 5) * 256;
    const at = (a, b) => (data[(oy + Math.min(b, 255)) * width + ox + Math.min(a, 255)] / 255 * 2 - 1) * 10;
    return mix(mix(at(ix, iy), at(ix + 1, iy), fx), mix(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy);
  };
}
export function shellAt(x, y, time, sampler, mode = 'distance', feather = .65) {
  const frame = mod(time, meta.duration) * meta.fps, index = Math.floor(frame), blend = frame - index;
  const a = sampler(x, y, index), b = sampler(x, y, mod(index + 1, meta.frameCount));
  if (mode === 'step') return { alpha: sm(-feather, feather, a), distance: a };
  if (mode === 'alpha') return { alpha: mix(sm(-feather, feather, a), sm(-feather, feather, b), blend), distance: mix(a, b, blend) };
  const distance = mix(a, b, blend);
  return { alpha: sm(-feather, feather, distance), distance };
}
export const backgrounds = { original: [5, 7, 22], black: [0, 0, 0], light: [220, 224, 228], warm: [101, 83, 70] };
export function field(x, y, time, input, sampler, background, feather = .65) {
  const o = options(input), phase = mod(time, meta.duration) / meta.duration * TAU;
  const r = Math.hypot(x, y), pulse = 1 + o.pulse * Math.sin(phase);
  const C = Object.fromEntries(['core', 'inner', 'body', 'shell'].map(k => [k, rgb(o[k + 'Color'])]));
  let col = background.map(v => v / 255);
  const over = (c, a) => { col = col.map((v, k) => mix(v, c[k], a)); };
  const add = (c, a) => { col = col.map((v, k) => v + c[k] * a); };
  if (o.layers.glow) add(C.body, Math.exp(-r * r / 4400) * .24 * o.glow * pulse);
  if (o.layers.volume) {
    let lobe = 0;
    for (let i = 0; i < 3; i++) {
      const a = phase + i * TAU / 3, dx = x - Math.cos(a) * 17, dy = y - Math.sin(a) * 13;
      lobe += Math.exp(-(dx * dx + dy * dy) / 310) * .20;
    }
    const cyan = clamp(Math.exp(-r * r / 650) * .72 + lobe);
    over(C.body.map((v, k) => mix(v, C.inner[k], cyan)), (1 - sm(35, 54, r)) * .84);
  }
  if (o.layers.glow && o.layers.core) add(C.inner, Math.exp(-r * r / 380) * .58 * o.glow * pulse);
  if (o.layers.core) over(C.core, 1 - sm(9.4 * pulse - feather, 9.4 * pulse + feather, r));
  if (o.layers.shell) {
    const shell = shellAt(x, y, time, sampler, o.interpolation, feather);
    if (o.layers.glow) add(C.body, Math.exp(-Math.abs(shell.distance) * .5) * .17 * o.glow * (1 - sm(7, 9, Math.abs(shell.distance))));
    over(C.shell, shell.alpha * .99);
  }
  return col.map(v => clamp(v));
}
const hash = (seed, i, k) => mod(Math.sin(seed * 17.213 + i * 91.731 + k * 43.159) * 43758.5453, 1);
export function sampleMotes(time, input = {}) {
  const o = options(input), t = mod(time, meta.duration), strokes = [];
  if (!o.layers.motes) return strokes;
  for (let i = 0; i < 12; i++) {
    const age = mod(t - i * meta.duration / 12, meta.duration), life = .07 + hash(o.seed, i, 0) * .055;
    if (age >= life) continue;
    const u = age / life, alpha = sm(0, .17, u) * (1 - sm(.45, 1, u));
    const angle = hash(o.seed, i, 1) * TAU + u * .1, length = 6 + hash(o.seed, i, 2) * 10;
    const points = [];
    for (let k = 0; k < 5; k++) {
      const f = k / 4, radius = 51 + u * 3 + length * f;
      const side = (hash(o.seed, i, 3 + k) - .5) * 7 * Math.sin(Math.PI * f) + Math.sin(u * TAU + k) * .6;
      points.push([Math.cos(angle) * radius - Math.sin(angle) * side, Math.sin(angle) * radius + Math.cos(angle) * side]);
    }
    strokes.push({ points, alpha, width: .45 + hash(o.seed, i, 9) * .35 });
  }
  return strokes;
}
function paintMotes(g, time, input, size) {
  const o = options(input), strokes = sampleMotes(time, o), color = rgb(o.arcColor).map(v => Math.round(v * 255));
  g.save(); g.translate(g.canvas.width / 2, g.canvas.height / 2); g.scale(size / 256, size / 256);
  g.lineCap = 'round'; g.lineJoin = 'miter';
  for (const s of strokes) {
    g.beginPath(); s.points.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p));
    if (o.layers.glow) { g.globalCompositeOperation = 'lighter'; g.lineWidth = s.width * 3; g.strokeStyle = `rgba(30,100,255,${s.alpha * .14 * o.glow})`; g.stroke(); }
    g.globalCompositeOperation = 'source-over'; g.lineWidth = s.width; g.strokeStyle = `rgba(${color},${s.alpha * .8})`; g.stroke();
  }
  g.restore();
}
export function renderCPU(canvas, time, input, sampler, { background = 'original', frameSize = 256 } = {}) {
  const g = canvas.getContext('2d'), image = g.createImageData(canvas.width, canvas.height), { data } = image;
  const o = options(input);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const bg = background === 'checker' ? ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? [34, 52, 69] : [20, 33, 48]) : backgrounds[background];
    const col = field((x + .5 - canvas.width / 2) * 256 / frameSize, (y + .5 - canvas.height / 2) * 256 / frameSize,
      time, o, sampler, bg, Math.max(.65, 128 / frameSize));
    const i = (y * canvas.width + x) * 4;
    for (let k = 0; k < 3; k++) data[i + k] = Math.round(col[k] * 255);
    data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0); paintMotes(g, time, o, frameSize);
}
export const vertexShader = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
export const fragmentShader = `precision highp float;
uniform sampler2D u_shell;
uniform vec2 u_resolution;
uniform vec4 u_layers;
uniform vec3 u_coreColor,u_innerColor,u_bodyColor,u_shellColor;
uniform float u_time,u_size,u_mode,u_glow,u_pulse,u_background;
const float TAU=6.28318530718;
float distanceAt(vec2 q,float index){
 vec2 pixel=clamp(q+vec2(128.),vec2(.5),vec2(255.5));
 vec2 origin=vec2(mod(index,5.),floor(index/5.))*256.;
 return (texture2D(u_shell,(origin+pixel)/vec2(1280.,1024.)).r*2.-1.)*10.;
}
void main(){
 vec2 q=(gl_FragCoord.xy-u_resolution*.5)*256./u_size;q.y=-q.y;
 float r=length(q),phase=mod(u_time,.48)/.48*TAU,pulse=1.+u_pulse*sin(phase),feather=max(.65,128./u_size);
 vec3 bg=vec3(5.,7.,22.)/255.;
 if(u_background>.5&&u_background<1.5)bg=vec3(0.);
 if(u_background>1.5&&u_background<2.5)bg=vec3(220.,224.,228.)/255.;
 if(u_background>2.5&&u_background<3.5)bg=mix(vec3(20.,33.,48.),vec3(34.,52.,69.),mod(floor(gl_FragCoord.x/16.)+floor((u_resolution.y-gl_FragCoord.y)/16.),2.))/255.;
 if(u_background>3.5)bg=vec3(101.,83.,70.)/255.;
 vec3 c=bg;
 if(u_layers.w>.5)c+=u_bodyColor*exp(-r*r/4400.)*.24*u_glow*pulse;
 if(u_layers.y>.5){float lobe=0.;for(int i=0;i<3;i++){float a=phase+float(i)*TAU/3.;vec2 d=q-vec2(cos(a)*17.,sin(a)*13.);lobe+=exp(-dot(d,d)/310.)*.20;}
 float cyan=clamp(exp(-r*r/650.)*.72+lobe,0.,1.);c=mix(c,mix(u_bodyColor,u_innerColor,cyan),(1.-smoothstep(35.,54.,r))*.84);}
 if(u_layers.w>.5&&u_layers.x>.5)c+=u_innerColor*exp(-r*r/380.)*.58*u_glow*pulse;
 if(u_layers.x>.5)c=mix(c,u_coreColor,1.-smoothstep(9.4*pulse-feather,9.4*pulse+feather,r));
 if(u_layers.z>.5){float f=mod(u_time,.48)*(20./.48),i=floor(f),b=fract(f),d0=distanceAt(q,i),d1=distanceAt(q,mod(i+1.,20.));
 float d=mix(d0,d1,b),a=smoothstep(-feather,feather,d);
 if(u_mode>.5&&u_mode<1.5){a=smoothstep(-feather,feather,d0);d=d0;}
 if(u_mode>1.5)a=mix(smoothstep(-feather,feather,d0),smoothstep(-feather,feather,d1),b);
 if(u_layers.w>.5)c+=u_bodyColor*exp(-abs(d)*.5)*.17*u_glow*(1.-smoothstep(7.,9.,abs(d)));
 c=mix(c,u_shellColor,a*.99);}
 gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;
export async function loadShellData(url) {
  const image = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = url; });
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const g = canvas.getContext('2d'); g.drawImage(image, 0, 0);
  const rgba = g.getImageData(0, 0, image.width, image.height).data, data = new Uint8Array(image.width * image.height);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
  return { data, width: image.width, height: image.height };
}
export function createWebGL(canvas, atlas) {
  const surface = document.createElement('canvas'); surface.width = canvas.width; surface.height = canvas.height;
  const gl = surface.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw Error('WebGL 不可用，未自动降级为逐帧效果。');
  const compile = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  const program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)); gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, atlas.width, atlas.height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, atlas.data);
  for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, axis, gl.CLAMP_TO_EDGE);
  for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, 'u_shell'), 0);
  const loc = Object.fromEntries(['resolution', 'layers', 'time', 'size', 'mode', 'glow', 'pulse', 'background', 'coreColor', 'innerColor', 'bodyColor', 'shellColor'].map(k => [k, gl.getUniformLocation(program, 'u_' + k)]));
  const g = canvas.getContext('2d');
  return { render(time, input = {}, { background = 'original', frameSize = 256 } = {}) {
    const o = options(input); gl.viewport(0, 0, surface.width, surface.height);
    gl.uniform2f(loc.resolution, surface.width, surface.height);
    gl.uniform4f(loc.layers, +o.layers.core, +o.layers.volume, +o.layers.shell, +o.layers.glow);
    gl.uniform1f(loc.time, mod(time, meta.duration)); gl.uniform1f(loc.size, frameSize);
    gl.uniform1f(loc.mode, { distance: 0, step: 1, alpha: 2 }[o.interpolation]);
    gl.uniform1f(loc.glow, o.glow); gl.uniform1f(loc.pulse, o.pulse);
    gl.uniform1f(loc.background, { original: 0, black: 1, light: 2, checker: 3, warm: 4 }[background]);
    for (const key of ['coreColor', 'innerColor', 'bodyColor', 'shellColor']) gl.uniform3fv(loc[key], rgb(o[key]));
    gl.drawArrays(gl.TRIANGLES, 0, 6); g.clearRect(0, 0, canvas.width, canvas.height); g.drawImage(surface, 0, 0);
    paintMotes(g, time, o, frameSize);
  }, info: { renderer: 'WebGL signed-distance interpolation + Canvas line particles', shaderCompiled: true,
             texture: '1280x1024 LUMINANCE UNSIGNED_BYTE, one-channel linear data, no mips', unity: false } };
}
