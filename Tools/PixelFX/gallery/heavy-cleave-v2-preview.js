import {render,meta} from '../src/hd/heavy-cleave-v2.js';
const $=s=>document.querySelector(s),canvas=$('#effect');
let playing=true,t=0,previous=performance.now();
function parameters(){
  const o={layers:{}};document.querySelectorAll('[data-layer]').forEach(e=>o.layers[e.dataset.layer]=e.checked);
  document.querySelectorAll('[data-color]').forEach(e=>o[e.dataset.color]=e.value);
  for(const key of ['bladeLength','tear','glow'])o[key]=+$('#'+key).value;return o;
}
function show(){
  const mode=$('#size').value,size=mode==='full'?1024:+mode;
  if(canvas.width!==size){canvas.width=size;canvas.height=size*3/4;}
  canvas.style.width=mode==='full'?'100%':size+'px';canvas.style.margin='auto';
  render(canvas,Math.min(t,meta.duration),parameters(),{background:$('#bg').value});
  $('#time').value=Math.min(t,meta.duration);$('#clock').value=`${Math.min(t,meta.duration).toFixed(3)} / ${meta.duration.toFixed(3)} s`;
}
function setPlaying(v){playing=v;$('#play').textContent=v?'暂停':'播放';}
function seek(value){t=Math.max(0,Math.min(meta.duration,value));setPlaying(false);show();}
$('#play').onclick=()=>{if(t>=meta.duration)t=0;setPlaying(!playing);};
$('#again').onclick=()=>{t=0;setPlaying(true);show();};
$('#prev').onclick=()=>seek(t-1/meta.fps);$('#next').onclick=()=>seek(t+1/meta.fps);
$('#time').oninput=e=>seek(+e.target.value);
document.querySelectorAll('[data-time]').forEach(e=>e.onclick=()=>seek(+e.dataset.time));
document.querySelectorAll('input,select').forEach(e=>{if(e.id!=='time')e.addEventListener('input',show);});
$('#reset').onclick=()=>{
  document.querySelectorAll('[data-layer]').forEach(e=>e.checked=true);
  document.querySelectorAll('[data-color]').forEach(e=>e.value=meta.options[e.dataset.color]);
  for(const key of ['bladeLength','tear','glow'])$('#'+key).value=meta.options[key];show();
};
$('#referenceToggle').onclick=()=>$('#reference').classList.toggle('open');
function tick(now){const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(playing){t+=dt*+$('#speed').value;if(t>meta.duration+.65){if($('#repeat').checked)t=0;else{t=meta.duration;setPlaying(false);}}show();}
  requestAnimationFrame(tick);
}show();requestAnimationFrame(tick);
