import { meta, createWebGL } from '../src/hd/energy-cluster-v2.js';
const $ = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
let t = .32, running = true, speed = 1, last = 0, o = { ...meta.options, layers: {} };
const wrap = x => ((x % 4) + 4) % 4;
const renderers = ['hero', 'detail', 'game'].map(id => createWebGL($('#' + id)));
function paint() {
  const background = $('#background').value;
  renderers.forEach((r, i) => r.render(t, o, { background, diameter: [300, 104, 48][i] }));
  $('#timeline').value = t; $('#clock').textContent = `${t.toFixed(3)} / 4.000 s`;
  $('#phase').textContent = `4s LOOP / SEED ${o.seed}`;
}
function state(value) { running = value; $('#play').textContent = value ? '暂停' : '播放'; }
function seek(value) { state(false); t = wrap(value); paint(); }
function sync() {
  all('[data-knob]').forEach(el => { el.value = o[el.dataset.knob]; el.nextElementSibling.textContent = Number(el.value).toFixed(el.step === '0.005' ? 3 : 2); });
  all('[data-layer]').forEach(el => el.checked = o.layers[el.dataset.layer] !== false);
  all('[data-color]').forEach(el => el.value = o[el.dataset.color]);
}
$('#play').onclick = () => { state(!running); paint(); };
$('#restart').onclick = () => { t = 0; state(true); paint(); };
$('#freeze').onclick = () => seek(.32);
$('#prev').onclick = () => seek(t - 1 / 60); $('#next').onclick = () => seek(t + 1 / 60);
$('#timeline').oninput = e => seek(Number(e.target.value));
$('#background').onchange = paint;
all('[data-speed]').forEach(el => el.onclick = () => { speed = Number(el.dataset.speed); all('[data-speed]').forEach(q => q.classList.toggle('active', q === el)); });
all('[data-knob]').forEach(el => el.oninput = () => { o[el.dataset.knob] = Number(el.value); sync(); paint(); });
all('[data-layer]').forEach(el => el.onchange = () => { o.layers[el.dataset.layer] = el.checked; paint(); });
all('[data-color]').forEach(el => el.oninput = () => { o[el.dataset.color] = el.value; paint(); });
$('#solid').onclick = () => { o.dissolve = 0; sync(); paint(); };
$('#shellOnly').onclick = () => { o.layers = { core: false, volume: false, shell: true, arcs: false, light: true }; sync(); paint(); };
$('#reset').onclick = () => { o = { ...meta.options, layers: {} }; sync(); paint(); };
window.addEventListener('error', e => $('#error').textContent = e.message);
function tick(now) {
  try { if (last && running && !document.hidden) t = wrap(t + Math.min(.05, (now - last) / 1000) * speed); last = now; paint(); requestAnimationFrame(tick); }
  catch (e) { $('#error').textContent = e.stack; $('#status').textContent = 'ERROR'; }
}
sync(); paint(); $('#status').textContent = 'WEBGL DISSOLVE · V2.0 · NOT UNITY'; requestAnimationFrame(tick);
