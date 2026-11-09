import {draw,meta,positionAt,previewScale} from '../src/hd/cyber-orb.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={t:1.1,flightTime:1.1,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,rate:1,previous:performance.now(),options:{...meta.options,layers:{}}};
const hero=$('#hero'),flight=$('#flight'),hg=hero.getContext('2d'),fg=flight.getContext('2d');
function setPlaying(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function grid(g,c){
  g.clearRect(0,0,c.width,c.height);if(!$('#grid').checked)return;
  g.strokeStyle=$('#background').value==='light'?'#728a9b30':'#648eaf16';g.lineWidth=1;g.beginPath();
  for(let x=0;x<c.width;x+=56){g.moveTo(x,0);g.lineTo(x,c.height);}for(let y=0;y<c.height;y+=56){g.moveTo(0,y);g.lineTo(c.width,y);}g.stroke();
}
function render(){
  const o={...state.options,buffer:$('#buffer').value},t=state.t;
  const scale=previewScale(o);grid(hg,hero);hg.save();hg.translate(970,280+Math.sin(t*Math.PI/2)*14);hg.scale(scale,scale);draw(hg,t,o);hg.restore();
  const gameScale=14/64,flightTime=state.flightTime,p=positionAt(flightTime,o);
  grid(fg,flight);const x=-120+(p[0]*gameScale)%(flight.width+360);
  fg.save();fg.translate(x,98+p[1]*gameScale);fg.scale(gameScale,gameScale);draw(fg,flightTime,o);fg.restore();
  $('#timeline').value=t;$('#clock').value=`${t.toFixed(3)} / 4.000 s`;
  $('#status').textContent=`V${meta.version} · SEED ${o.seed} · LIVE CANVAS`;
  $('#status').dataset.time=String(t);$('#status').dataset.playing=String(state.playing);
}
function freeze(t){state.t=Math.max(0,Math.min(4,t));state.flightTime=state.t;setPlaying(false);render();}
$('#play').onclick=()=>{setPlaying(!state.playing);render();};$('#restart').onclick=()=>{state.t=0;state.flightTime=0;setPlaying(true);render();};
$('#timeline').oninput=e=>freeze(+e.target.value);$('#prev').onclick=()=>freeze(state.t-1/60);$('#next').onclick=()=>freeze(state.t+1/60);
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.rate=+b.dataset.speed;$$('[data-speed]').forEach(q=>q.classList.toggle('active',q===b));});
$('#motion').onchange=e=>{state.options.motion=e.target.value;render();};
$('#background').onchange=e=>{$$('.stage').forEach(el=>{for(const n of ['dark','light','warm','checker'])el.classList.toggle(n,n===e.target.value);});render();};
for(const key of ['buffer','grid'])$('#'+key).onchange=render;
$$('[data-layer]').forEach(el=>el.onchange=()=>{state.options.layers[el.dataset.layer]=el.checked;render();});
for(const key of ['speed','trailLife','turbulence','glow'])$('#'+key).oninput=e=>{const v=state.options[key]=+e.target.value;e.target.nextElementSibling.value=key==='speed'?v:key==='trailLife'?v.toFixed(2)+'s':v.toFixed(2);render();};
for(const key of ['body','rim','trail','core'])$('#'+key).oninput=e=>{state.options[key]=e.target.value;render();};
$('#seed').onchange=e=>{state.options.seed=+e.target.value;render();};
function tick(now){const dt=Math.min(.05,(now-state.previous)/1000);state.previous=now;if(state.playing){state.t=(state.t+dt*state.rate)%meta.duration;state.flightTime+=dt*state.rate;render();}requestAnimationFrame(tick);}
try{setPlaying(state.playing);render();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
