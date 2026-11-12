import { render, options, stateAt, draw } from '../src/hd/energy-shockwave.js';
import * as orb from '../src/hd/energy-cluster-v6.js';
const $ = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
const canvas = $('#hero'), ctx = canvas.getContext('2d');
let o = options(), time = 0, running = true, speed = 1, last = 0, mode = new URLSearchParams(location.search).has('review') ? 'continuity' : 'burst';
let orbRenderer = null, orbCanvas = null, orbLoading = null;
window.addEventListener('error', e => $('#error').textContent = e.message);
window.addEventListener('unhandledrejection', e => $('#error').textContent = String(e.reason));
async function loadOrb() {
  if (!orbLoading) orbLoading = orb.loadData('/output/hd/EnergyCluster/V6/final/').then(data => {
    orbCanvas = document.createElement('canvas'); orbCanvas.width = orbCanvas.height = 640;
    orbRenderer = orb.createWebGL(orbCanvas, data);
  }).catch(e => { $('#error').textContent = `原能量球加载失败：${e.message}`; });
  await orbLoading;
}
const total = () => (mode === 'continuity' ? 1.1 : 0) + o.duration;
const label = t => t < .065 ? '能量压紧 / 高光聚集' : t < .17 ? '白热闪爆 / 能量释放' : t < .53 ? '冲击前沿外推 / 电流穿出' : t < .93 ? '中心清空 / 分段退光' : '消散完成';
function paint() {
  const background = $('#background').value, start = mode === 'continuity' ? 1.1 : 0, burstTime = time - start;
  render(canvas, burstTime, o, { background });
  if (mode === 'continuity' && time < start && orbRenderer) {
    orbRenderer.render(time, {}, { background: background === 'dark' ? 'original' : background, frameSize: 256 });
    ctx.drawImage(orbCanvas, 0, 0);
  }
  if (mode === 'continuity' && time >= start && burstTime < .045 && orbRenderer) {
    orbRenderer.render(time, {}, { background: background === 'dark' ? 'original' : background, frameSize: 256 });
    ctx.save(); ctx.globalAlpha = 1 - burstTime / .045; ctx.drawImage(orbCanvas, 0, 0); ctx.restore();
    ctx.save(); ctx.translate(320, 320); draw(ctx, burstTime, o); ctx.restore();
  }
  $('#phase').textContent = burstTime < 0 ? '原能量球 · 独立原稿' : label(stateAt(burstTime, o).t);
  $('#clock').textContent = `${Math.min(time, total()).toFixed(3)} / ${total().toFixed(2)} s`;
  $('#timeline').max = total(); $('#timeline').value = time;
  $('#modeTag').textContent = mode === 'continuity' ? '独立双效果联播' : '独立爆炸';
}
function play(v) { running = v; $('#play').textContent = v ? '暂停' : '播放'; }
function seek(t) { time = Math.max(0, Math.min(total(), t)); play(false); paint(); }
function sync() {
  $('#mode').value = mode;
  all('[data-param]').forEach(el => { const key = el.dataset.param; el.value = o[key]; $(`[data-value="${key}"]`).textContent = key === 'radius' ? `${o[key]} px` : o[key].toFixed(2) + (key === 'duration' ? ' s' : ''); });
  all('[data-layer]').forEach(el => el.checked = o.layers[el.dataset.layer]);
  all('[data-color]').forEach(el => el.value = o[el.dataset.color]);
}
$('#play').onclick = () => { if (!running && time >= total()) time = 0; play(!running); paint(); };
$('#restart').onclick = () => { time = 0; play(true); paint(); };
$('#prev').onclick = () => seek(time - 1 / 60); $('#next').onclick = () => seek(time + 1 / 60);
$('#timeline').oninput = e => seek(Number(e.target.value)); $('#background').onchange = paint;
$('#mode').onchange = async e => { mode = e.target.value; time = 0; if (mode === 'continuity') await loadOrb(); paint(); };
all('[data-speed]').forEach(el => el.onclick = () => { speed = Number(el.dataset.speed); all('[data-speed]').forEach(b => b.classList.toggle('active', b === el)); });
all('[data-param]').forEach(el => el.oninput = () => { const phase = time / total(); o[el.dataset.param] = Number(el.value); time = phase * total(); sync(); paint(); });
all('[data-layer]').forEach(el => el.onchange = () => { o.layers[el.dataset.layer] = el.checked; paint(); });
all('[data-color]').forEach(el => el.oninput = () => { o[el.dataset.color] = el.value; paint(); });
$('#reset').onclick = () => { o = options(); sync(); paint(); };
sync(); if (mode === 'continuity') await loadOrb(); paint();
$('#status').textContent = 'LIVE CANVAS GEOMETRY / NOT UNITY';
function tick(now) {
  try { if (last && running && !document.hidden) { time += Math.min(.06, (now - last) / 1000) * speed; if (time > total() + .4) time = 0; } last = now; paint(); requestAnimationFrame(tick); }
  catch (e) { $('#error').textContent = e.stack; $('#status').textContent = 'ERROR'; }
}
requestAnimationFrame(tick);
