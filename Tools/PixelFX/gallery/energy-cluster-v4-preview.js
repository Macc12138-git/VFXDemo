import { meta, options, loadShellData, createWebGL, backgrounds } from '../src/hd/energy-cluster-v4.js';
const $ = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
const base = '/output/hd/EnergyCluster/V4.3/';
const manifest = await (await fetch(base + 'manifest.json')).json();
const atlas = await loadShellData(base + 'Textures/EnergyCluster_ShellSDF.png');
const original = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = '/output/hd/EnergyCluster/V3.2/Textures/EnergyCluster_Sequence.png'; });
const renderers = ['hero', 'native', 'game'].map(id => createWebGL($('#' + id), atlas));
let time = 0, running = true, speed = 1, last = 0, o = options();
const wrap = t => ((t % meta.duration) + meta.duration) % meta.duration;
const baseline = $('#baseline'), g = baseline.getContext('2d');
function paint() {
  const background = $('#background').value;
  renderers.forEach((r, i) => r.render(time, o, { background, frameSize: [512, 256, 128][i] }));
  if (background === 'checker') {
    for (let y = 0; y < 512; y += 16) for (let x = 0; x < 512; x += 16) { g.fillStyle = (x / 16 + y / 16) % 2 ? '#223445' : '#142130'; g.fillRect(x, y, 16, 16); }
  } else { g.fillStyle = `rgb(${backgrounds[background]})`; g.fillRect(0, 0, 512, 512); }
  const f = wrap(time) * meta.fps, frame = Math.floor(f), baselineFrame = Math.floor(wrap(time) * 25);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(original, baselineFrame % 4 * 256, Math.floor(baselineFrame / 4) * 256, 256, 256, 0, 0, 512, 512);
  $('#phase').textContent = `SHELL ${String(frame + 1).padStart(2, '0')} → ${String((frame + 1) % 20 + 1).padStart(2, '0')} · ${(f % 1).toFixed(2)}`;
  $('#timeline').value = time; $('#clock').textContent = `${time.toFixed(3)} / 0.480 s`;
}
function state(v) { running = v; $('#play').textContent = v ? '暂停' : '播放'; }
function sync() {
  all('[data-layer]').forEach(el => el.checked = o.layers[el.dataset.layer]);
  all('[data-color]').forEach(el => el.value = o[el.dataset.color]);
  $('#interpolation').value = o.interpolation;
  $('#glow').value = o.glow; $('#glowValue').textContent = o.glow.toFixed(2);
}
function seek(t) { state(false); time = wrap(t); paint(); }
$('#play').onclick = () => { state(!running); paint(); };
$('#restart').onclick = () => { time = 0; state(true); paint(); };
$('#midpoint').onclick = () => seek(.18);
$('#prev').onclick = () => seek(time - 1 / 120); $('#next').onclick = () => seek(time + 1 / 120);
$('#timeline').oninput = e => seek(Number(e.target.value));
$('#background').onchange = paint;
$('#glow').oninput = e => { o.glow = Number(e.target.value); $('#glowValue').textContent = o.glow.toFixed(2); paint(); };
$('#interpolation').onchange = e => { o.interpolation = e.target.value; paint(); };
all('[data-layer]').forEach(el => el.onchange = () => { o.layers[el.dataset.layer] = el.checked; paint(); });
all('[data-color]').forEach(el => el.oninput = () => { o[el.dataset.color] = el.value; paint(); });
all('[data-speed]').forEach(el => el.onclick = () => { speed = Number(el.dataset.speed); all('[data-speed]').forEach(q => q.classList.toggle('active', q === el)); });
$('#shellOnly').onclick = () => { o.layers = { shell: true, core: false, volume: false, glow: false, motes: false }; sync(); paint(); };
$('#liveOnly').onclick = () => { o.layers = { shell: false, core: true, volume: true, glow: true, motes: true }; sync(); paint(); };
$('#reset').onclick = () => { o = options(); sync(); paint(); };
$('#assetStats').textContent = `壳层图集 ${manifest.atlasSize.join(' × ')}，${manifest.frameCount} 帧，每帧 256×256。PNG ${(manifest.resources.shellPngBytes / 1024).toFixed(1)} KiB（旧整帧图集 ${(manifest.resources.baselinePngBytes / 1024).toFixed(1)} KiB）。其他实时层没有动画贴图。`;
window.addEventListener('error', e => $('#error').textContent = e.message);
window.addEventListener('unhandledrejection', e => $('#error').textContent = String(e.reason));
function tick(now) {
  try { if (last && running && !document.hidden) time = wrap(time + Math.min(.1, (now - last) / 1000) * speed); last = now; paint(); requestAnimationFrame(tick); }
  catch (e) { $('#error').textContent = e.stack; $('#status').textContent = 'ERROR'; }
}
sync(); paint(); $('#status').textContent = 'WEBGL SDF × 2 SAMPLES / CONTINUOUS LIVE LAYERS / NOT UNITY'; requestAnimationFrame(tick);
