const $ = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
const version = new URLSearchParams(location.search).get('version');
const full = version === 'full', halfK = version === '512';
const small = !full && !halfK;
const label = full ? 'V3' : halfK ? 'V3.1' : 'V3.2';
const base = `/output/hd/EnergyCluster/${full ? 'V3' : halfK ? 'V3.1' : 'V3.2'}/`;
const m = await (await fetch(base + 'manifest.json')).json();
const atlas = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = base + 'Textures/EnergyCluster_Sequence.png'; });
const canvas = $('#hero'), g = canvas.getContext('2d');
document.title = `能量团 ${label} · ${full ? '原版' : small ? '256 轻量' : '512 精简'}序列帧`;
$('#title').textContent = full ? '能量团 · 原版序列帧' : small ? '能量团 · 256 轻量序列帧' : '能量团 · 512 精简序列帧';
$('#eyebrow').textContent = `PIXELFX / ENERGY CLUSTER · FLIPBOOK ${label}`;
$('#description').textContent = full ? '参考转制原版，保留 20 帧与原始节奏。' : small ? '单帧缩为 256×256；12 帧、0.48 秒节奏不变。主窗口为放大检查。' : '完整循环均匀抽帧，保留 512×512 分辨率的对照版本。';
$('#spec').textContent = `${m.frameCount} 帧 · ${m.fps} FPS · ${m.duration} 秒循环 · 固定中心`;
$('#timeline').max = m.frameCount - 1;
$('#referenceNote').textContent = full ? '从参考中提取完整 20 帧，移除蓝黑底色；未重新绘制。' : small ? '沿用精简版的 12 帧与帧序，仅将单帧从 512 缩至 256，细节会相应简化；未重新绘制或生成新的 GIF。' : '从原 20 帧中均匀选取 12 帧，仍覆盖完整动作循环，播放节奏加快。未重新绘制或生成新的 GIF。';
$('#assetStats').textContent = `单帧 ${m.cellSize[0]} × ${m.cellSize[1]}\n图集 ${m.atlasSize[0]} × ${m.atlasSize[1]} / ${m.columns} × ${m.rows}\n直通 Alpha · 四周留边\n循环 ${m.duration} 秒 / ${m.fps} FPS${full ? '' : small ? '\n较 512 精简版减少 75% 像素' : '\n较 20 帧原版减少 40% 像素'}`;
$('#atlasLink').href = base + 'Textures/EnergyCluster_Sequence.png';
$('#manifestLink').href = base + 'manifest.json';
$('#versionLink').href = small ? '?version=512' : '?version=compact';
$('#versionLink').textContent = small ? '512 单帧对照 ↗' : '返回 256 轻量版 ↗';
$('#footerCopy').textContent = `PNG 序列帧 / ${m.cellSize[0]}px 单帧 / ${m.frameCount} 帧 / 未导入 Unity`;
let time = 0, running = true, speed = 1, last = 0;
const wrap = value => ((value % m.duration) + m.duration) % m.duration;
function paint() {
  const frame = Math.min(m.frameCount - 1, Math.floor(wrap(time) * m.fps + 1e-7)), [w, h] = m.cellSize;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const background = $('#background').value;
  if (background === 'checker') {
    for (let y = 0; y < canvas.height; y += 24) for (let x = 0; x < canvas.width; x += 24) {
      g.fillStyle = (x / 24 + y / 24) % 2 ? '#223445' : '#142130'; g.fillRect(x, y, 24, 24);
    }
  } else { g.fillStyle = { original:'#050716', black:'#000000', light:'#dce0e4', warm:'#655346' }[background]; g.fillRect(0,0,canvas.width,canvas.height); }
  g.save(); g.globalCompositeOperation = $('#blend').value;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(atlas, frame % m.columns * w, Math.floor(frame / m.columns) * h, w, h, 80, 0, 640, 640); g.restore();
  $('#timeline').value = frame; $('#frame').textContent = `FRAME ${String(frame + 1).padStart(2,'0')} / ${m.frameCount}`;
  $('#clock').textContent = `${(frame / m.fps).toFixed(3)} / ${m.duration.toFixed(3)} s`;
}
function state(play) { running = play; $('#play').textContent = play ? '暂停' : '播放'; }
function seek(frame) { state(false); time = ((frame % m.frameCount + m.frameCount) % m.frameCount) / m.fps; paint(); }
$('#play').onclick = () => { state(!running); paint(); }; $('#restart').onclick = () => { time = 0; state(true); paint(); };
$('#prev').onclick = () => seek(Number($('#timeline').value) - 1); $('#next').onclick = () => seek(Number($('#timeline').value) + 1);
$('#timeline').oninput = e => seek(Number(e.target.value));
all('[data-speed]').forEach(el => el.onclick = () => { speed = Number(el.dataset.speed); all('[data-speed]').forEach(q => q.classList.toggle('active', q === el)); });
$('#background').onchange = () => { const stage = document.querySelector('.stage'); stage.className = 'stage'; if ($('#background').value !== 'original') stage.classList.add($('#background').value); paint(); };
$('#blend').onchange = paint;
function tick(now) { if (last && running && !document.hidden) time = wrap(time + Math.min(.1,(now-last)/1000)*speed); last = now; paint(); requestAnimationFrame(tick); }
window.addEventListener('error', e => $('#error').textContent = e.message);
paint(); $('#status').textContent = `PNG FLIPBOOK / ${m.frameCount}F @ ${m.fps} FPS`; requestAnimationFrame(tick);
