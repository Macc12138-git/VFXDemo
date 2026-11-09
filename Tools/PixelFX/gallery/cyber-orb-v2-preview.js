import {draw,meta,positionAt} from '../src/hd/cyber-orb-v2.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={time:1.3,absoluteTime:1.3,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,rate:1,previous:performance.now(),options:{...meta.options,layers:{}}};
const hero=$('#hero'),flight=$('#flight'),hg=hero.getContext('2d'),fg=flight.getContext('2d');
function playing(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function render(){
  const o=state.options,t=state.time;hg.clearRect(0,0,hero.width,hero.height);hg.save();hg.translate(770,210);hg.scale(4,4);draw(hg,t,o);hg.restore();
  fg.clearRect(0,0,flight.width,flight.height);const rate=+$('#rate').value,latest=Math.floor(state.absoluteTime*rate);let count=0;
  // Preview-only emitter. Each shot has one short trail and no secondary spawn.
  for(let n=latest;n>=0;n--){
    const born=n/rate,age=state.absoluteTime-born,x=-70+age*o.speed;if(x>flight.width+100)break;
    const small={...o,radius:6},p=positionAt(age,small);fg.save();fg.translate(x,104+p[1]);draw(fg,age,small);fg.restore();count++;
  }
  $('#timeline').value=t;$('#clock').value=`${t.toFixed(3)} / 4.000 s`;
  $('#flightCaption').textContent=`${rate} 发/秒 · 核心直径 12px（画布逻辑尺寸）`;
  $('#status').textContent=`V${meta.version} · ${count} SHOTS · LIVE CANVAS`;
  $('#status').dataset.time=String(t);$('#status').dataset.playing=String(state.playing);
}
function freeze(t){state.time=Math.max(0,Math.min(4,t));state.absoluteTime=state.time;playing(false);render();}
$('#play').onclick=()=>{playing(!state.playing);render();};$('#restart').onclick=()=>{state.time=state.absoluteTime=0;playing(true);render();};
$('#timeline').oninput=e=>freeze(+e.target.value);$('#prev').onclick=()=>freeze(state.time-1/60);$('#next').onclick=()=>freeze(state.time+1/60);
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.rate=+b.dataset.speed;$$('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));});
$('#background').onchange=e=>{$$('.stage').forEach(el=>{for(const c of ['dark','light','checker','warm'])el.classList.toggle(c,c===e.target.value);});render();};
$('#motion').onchange=e=>{state.options.motion=e.target.value;render();};$('#rate').onchange=render;
$$('[data-layer]').forEach(el=>el.onchange=()=>{state.options.layers[el.dataset.layer]=el.checked;render();});
for(const key of ['speed','tailLength','glow'])$('#'+key).oninput=e=>{const v=state.options[key]=+e.target.value;e.target.nextElementSibling.value=key==='tailLength'?(v/2).toFixed(1)+'D':key==='speed'?v:v.toFixed(2);render();};
for(const key of ['core','rim','trail'])$('#'+key).oninput=e=>{state.options[key]=e.target.value;render();};
function tick(now){const dt=Math.min(.05,(now-state.previous)/1000);state.previous=now;if(state.playing){state.time=(state.time+dt*state.rate)%4;state.absoluteTime+=dt*state.rate;render();}requestAnimationFrame(tick);}
try{playing(state.playing);render();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
