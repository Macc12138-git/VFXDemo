import {draw,render,background,meta} from '../src/hd/blue-wisp-v2.js';
import {draw as oldDraw} from '../src/hd/blue-wisp.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={t:.175,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,rate:1,previous:performance.now(),options:{...meta.options,layers:{...meta.options.layers}}};
function playing(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function paint(){
  const o={...state.options,buffer:$('#buffer').value},bg=$('#background').value;
  render($('#hero'),state.t,o,{background:bg});for(const id of ['heroStage','smallStage'])$('#'+id).dataset.bg=bg;
  const c=$('#small'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);background(g,c.width,c.height,bg);
  for(const [i,size]of [48,80,128].entries()){
    g.save();g.translate(150+i*305,105);g.scale(size/224,size/224);draw(g,state.t,o);g.restore();
    g.fillStyle=bg==='light'?'#42667d':'#7b9fb3';g.font='11px monospace';g.fillText(`${size}px`,130+i*305,174);
  }
  $('#comparePanel').hidden=!$('#compare').checked;
  if($('#compare').checked){
    const c=$('#comparison'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);background(g,c.width,c.height,bg);
    for(const [i,fn]of [oldDraw,draw].entries()){g.save();g.translate(205+i*480,163);g.scale(.95,.95);fn(g,state.t,i?o:{});g.restore();}
    g.strokeStyle='#355367';g.beginPath();g.moveTo(480,0);g.lineTo(480,330);g.stroke();
  }
  const period=meta.duration/o.flow;$('#timeline').max=period;$('#timeline').value=state.t;
  $('#clock').textContent=`${state.t.toFixed(3)} / ${period.toFixed(3)} s`;
  $('#status').textContent=`V${meta.version} · SEED ${o.seed} · LIVE CANVAS`;
  $('#status').dataset.time=String(state.t);$('#status').dataset.playing=String(state.playing);
}
function seek(t){state.t=Math.max(0,Math.min(meta.duration/state.options.flow,t));playing(false);paint();}
$('#play').onclick=()=>{playing(!state.playing);paint();};$('#restart').onclick=()=>{state.t=0;playing(true);paint();};
$('#timeline').oninput=e=>seek(+e.target.value);$('#prev').onclick=()=>seek(state.t-1/60);$('#next').onclick=()=>seek(state.t+1/60);
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.rate=+b.dataset.speed;$$('[data-speed]').forEach(q=>q.classList.toggle('active',q===b));});
for(const id of ['background','compare','buffer'])$('#'+id).onchange=paint;
$$('[data-layer]').forEach(e=>e.onchange=()=>{state.options.layers[e.dataset.layer]=e.checked;paint();});
for(const id of ['flow','localMotion','glow'])$('#'+id).oninput=e=>{state.options[id]=+e.target.value;e.target.nextElementSibling.value=(+e.target.value).toFixed(2);state.t%=meta.duration/state.options.flow;paint();};
for(const id of ['shadow','body','flame','core'])$('#'+id).oninput=e=>{state.options[id]=e.target.value;paint();};
$('#seed').onchange=e=>{state.options.seed=+e.target.value;paint();};
function tick(now){const dt=Math.min(.05,(now-state.previous)/1000);state.previous=now;if(state.playing){state.t=(state.t+dt*state.rate)%(meta.duration/state.options.flow);paint();}requestAnimationFrame(tick);}
try{playing(state.playing);paint();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
