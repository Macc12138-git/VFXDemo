import { draw, meta } from '../src/hd/energy-cluster.js';
const $ = s => document.querySelector(s);
const all = s => [...document.querySelectorAll(s)];
const hero = $('#hero'), sizes = $('#sizes'), g = hero.getContext('2d'), sg = sizes.getContext('2d');
let t = .33, running = true, speed = 1, last = 0, o = { ...meta.options, layers: {} };
const wrap = x => ((x % meta.duration) + meta.duration) % meta.duration;
function paint() {
  g.clearRect(0, 0, hero.width, hero.height);
  const fit = Math.min(1.45, 300 / (o.radius * (1 + o.pulse * 1.35) * 1.95));
  g.save(); g.translate(400, 320); g.scale(fit, fit); draw(g, t, o); g.restore();
  sg.clearRect(0, 0, sizes.width, sizes.height);
  const light = $('#background').value === 'light';
  for (const [i, px] of [96, 64, 40].entries()) {
    const x = 150 + i * 250;
    sg.save(); sg.translate(x, 160); sg.scale(px / 200, px / 200); draw(sg, t, o); sg.restore();
    sg.fillStyle = light ? '#42617a' : '#698fae'; sg.font = '11px monospace'; sg.textAlign = 'center'; sg.fillText(`${px}px 主体`, x, 271);
  }
  $('#timeline').value = t; $('#clock').textContent = `${t.toFixed(3)} / 4.000 s`;
  $('#phase').textContent = `4.00s LOOP · SEED ${o.seed}`;
}
function state(play) { running = play; $('#play').textContent = play ? '暂停' : '播放'; }
function seek(time) { t = wrap(time); state(false); paint(); }
$('#play').onclick = () => { state(!running); paint(); };
$('#restart').onclick = () => { t = 0; state(true); paint(); };
$('#freeze').onclick = () => seek(.33);
$('#prev').onclick = () => seek(t - 1 / 60);
$('#next').onclick = () => seek(t + 1 / 60);
$('#timeline').oninput = e => seek(Number(e.target.value));
all('[data-speed]').forEach(el => el.onclick = () => {
  speed = Number(el.dataset.speed); all('[data-speed]').forEach(q => q.classList.toggle('active', q === el));
});
$('#background').onchange = () => {
  all('.stage').forEach(el => { el.classList.remove('light', 'checker', 'warm'); if ($('#background').value !== 'dark') el.classList.add($('#background').value); }); paint();
};
all('[data-layer]').forEach(el => el.onchange = () => { o.layers[el.dataset.layer] = el.checked; paint(); });
all('[data-knob]').forEach(el => el.oninput = () => {
  o[el.dataset.knob] = Number(el.value); el.nextElementSibling.textContent = Number(el.value).toFixed(el.step === '0.005' ? 3 : 2); paint();
});
all('[data-color]').forEach(el => el.oninput = () => { o[el.dataset.color] = el.value; paint(); });
$('#seed').onchange = e => { o.seed = Math.max(1, Math.min(9999, Number(e.target.value) || 37)); e.target.value = o.seed; paint(); };
$('#reseed').onclick = () => { o.seed = o.seed % 9973 + 83; $('#seed').value = o.seed; paint(); };
$('#reset').onclick = () => {
  o = { ...meta.options, layers: {} }; $('#seed').value = o.seed;
  all('[data-knob]').forEach(el => { el.value = o[el.dataset.knob]; el.dispatchEvent(new Event('input')); });
  all('[data-color]').forEach(el => el.value = o[el.dataset.color]); all('[data-layer]').forEach(el => el.checked = true); paint();
};
window.addEventListener('error', e => { $('#error').textContent = e.message; });
function tick(now) {
  try { if (last && running && !document.hidden) t = wrap(t + Math.min(.05, (now - last) / 1000) * speed); last = now; paint(); requestAnimationFrame(tick); }
  catch (e) { $('#error').textContent = e.stack; $('#status').textContent = 'ERROR'; }
}
paint(); $('#status').textContent = `CANVAS ORIGINAL · V${meta.version}`; requestAnimationFrame(tick);
