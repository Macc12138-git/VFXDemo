import {draw,render,meta} from '../src/hd/blue-wisp.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={t:.105,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,rate:1,previous:performance.now(),options:{...meta.options,layers:{...meta.options.layers}}};
function playing(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function paint(){
  const o={...state.options,flip:$('#flip').checked,buffer:$('#buffer').value},bg=$('#background').value;
  render($('#hero'),state.t,o,{background:bg});$('#heroStage').dataset.bg=bg;
  const c=$('#small'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
  g.fillStyle=({dark:'#0b1523',gray:'#454545',light:'#e0e7eb',warm:'#695446',checker:'#233241'})[bg];g.fillRect(0,0,c.width,c.height);
  for(const [i,size]of [48,80,128].entries()){
    g.save();g.translate(145+i*305,108);g.scale(size/224,size/224);draw(g,state.t,o);g.restore();
    g.fillStyle=bg==='light'?'#42667d':'#6f9bb3';g.font='11px monospace';g.fillText(`${size}px`,125+i*305,174);
  }
  const period=meta.duration/state.options.flow;$('#timeline').max=period;$('#timeline').value=state.t;
  $('#clock').textContent=`${state.t.toFixed(3)} / ${period.toFixed(3)} s`;
  $('#status').textContent=`V${meta.version} · SEED ${state.options.seed} · LIVE CANVAS`;
  $('#status').dataset.time=String(state.t);$('#status').dataset.playing=String(state.playing);
}
function seek(t){state.t=Math.max(0,Math.min(meta.duration/state.options.flow,t));playing(false);paint();}
$('#play').onclick=()=>{playing(!state.playing);paint();};$('#restart').onclick=()=>{state.t=0;playing(true);paint();};
$('#timeline').oninput=e=>seek(+e.target.value);$('#prev').onclick=()=>seek(state.t-1/60);$('#next').onclick=()=>seek(state.t+1/60);
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.rate=+b.dataset.speed;$$('[data-speed]').forEach(q=>q.classList.toggle('active',q===b));});
for(const id of ['background','flip','buffer'])$('#'+id).onchange=paint;
$$('[data-layer]').forEach(e=>e.onchange=()=>{state.options.layers[e.dataset.layer]=e.checked;paint();});
for(const id of ['flow','turbulence','tail','glow'])$('#'+id).oninput=e=>{state.options[id]=+e.target.value;e.target.nextElementSibling.value=(+e.target.value).toFixed(2);state.t%=meta.duration/state.options.flow;paint();};
for(const id of ['shadow','body','flame','core'])$('#'+id).oninput=e=>{state.options[id]=e.target.value;paint();};
$('#seed').onchange=e=>{state.options.seed=+e.target.value;paint();};
function tick(now){const dt=Math.min(.05,(now-state.previous)/1000);state.previous=now;if(state.playing){state.t=(state.t+dt*state.rate)%(meta.duration/state.options.flow);paint();}requestAnimationFrame(tick);}
try{playing(state.playing);paint();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
