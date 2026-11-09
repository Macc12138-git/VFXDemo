import { meta, options, makeSurfaceData, createWebGL } from '../src/hd/energy-cluster-v5.js';
const $ = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
window.addEventListener('error', e => $('#error').textContent = e.message);
window.addEventListener('unhandledrejection', e => $('#error').textContent = String(e.reason));
try {
  const texture = makeSurfaceData(), renderers = ['hero', 'shell', 'native', 'game'].map(id => createWebGL($('#' + id), texture));
  let time = .42, running = true, speed = 1, last = 0, o = options();
  const wrap = t => ((t % meta.duration) + meta.duration) % meta.duration;
  function paint() {
    const background = $('#background').value;
    renderers.forEach((r, i) => r.render(time, i === 1 ? { ...o, layers: { ...o.layers, core: false, volume: false, glow: false } } : o,
      { background, diameter: [300, 300, 112, 56][i] }));
    $('#phase').textContent = `${time.toFixed(2)} s · FLOW MAP`;
    $('#timeline').value = time; $('#clock').textContent = `${time.toFixed(3)} / 2.400 s`;
  }
  function state(v) { running = v; $('#play').textContent = v ? '暂停' : '播放'; }
  function sync() {
    all('[data-layer]').forEach(el => el.checked = o.layers[el.dataset.layer]);
    all('[data-color]').forEach(el => el.value = o[el.dataset.color]);
    all('[data-param]').forEach(el => { el.value = o[el.dataset.param]; $(`[data-value="${el.dataset.param}"]`).textContent = o[el.dataset.param].toFixed(3); });
  }
  function seek(t) { state(false); time = wrap(t); paint(); }
  $('#play').onclick = () => { state(!running); paint(); };
  $('#restart').onclick = () => { time = 0; state(true); paint(); };
  $('#pose').onclick = () => seek(.42);
  $('#prev').onclick = () => seek(time - 1 / 120); $('#next').onclick = () => seek(time + 1 / 120);
  $('#timeline').oninput = e => seek(Number(e.target.value)); $('#background').onchange = paint;
  all('[data-param]').forEach(el => el.oninput = () => { o[el.dataset.param] = Number(el.value); $(`[data-value="${el.dataset.param}"]`).textContent = Number(el.value).toFixed(3); paint(); });
  all('[data-color]').forEach(el => el.oninput = () => { o[el.dataset.color] = el.value; paint(); });
  all('[data-layer]').forEach(el => el.onchange = () => { o.layers[el.dataset.layer] = el.checked; paint(); });
  all('[data-speed]').forEach(el => el.onclick = () => { speed = Number(el.dataset.speed); all('[data-speed]').forEach(q => q.classList.toggle('active', q === el)); });
  for (const [id, side] of [['frontOnly', 'front'], ['backOnly', 'back']]) $('#' + id).onclick = () => {
    o.layers = { front: side === 'front', back: side === 'back', core: false, volume: false, glow: false }; sync(); paint();
  };
  $('#reset').onclick = () => { o = options(); sync(); paint(); };
  function tick(now) {
    try { if (last && running && !document.hidden) time = wrap(time + Math.min(.1, (now - last) / 1000) * speed); last = now; paint(); requestAnimationFrame(tick); }
    catch (e) { $('#error').textContent = e.stack; $('#status').textContent = 'ERROR'; }
  }
  sync(); paint(); $('#status').textContent = 'WEBGL SPHERE / FRONT + BACK / STATIC DATA 256² / NOT UNITY'; requestAnimationFrame(tick);
} catch (e) { $('#error').textContent = e.stack; $('#status').textContent = 'ERROR'; }
