import {draw,drawImpact,meta,hitMeta} from '../src/hd/cyber-orb-v3-2.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const D=1.1,HIT=.5,state={time:.49,absoluteTime:1.5,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,rate:1,previous:performance.now(),options:{...meta.options,layers:{}}};
const hero=$('#hero'),flight=$('#flight'),hg=hero.getContext('2d'),fg=flight.getContext('2d');
function playing(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function at(g,x,y,scale,fn,t,o){g.save();g.translate(x,y);g.scale(scale,scale);fn(g,t,o);g.restore();}
function guide(g,x,y,h){g.save();g.strokeStyle=$('#background').value==='light'?'#5d79964a':'#678eac35';g.lineWidth=1;g.setLineDash([4,7]);g.beginPath();g.moveTo(x,y-h);g.lineTo(x,y+h);g.stroke();g.restore();}
function render(){
  const o=state.options,t=state.time;hg.clearRect(0,0,1280,420);
  hg.strokeStyle='#638ca21e';hg.beginPath();hg.moveTo(640,28);hg.lineTo(640,392);hg.stroke();
  at(hg,350,220,3,draw,state.absoluteTime,o);
  hg.save();hg.beginPath();hg.rect(660,85,620,335);hg.clip();guide(hg,1002,220,82);
  const age=t-HIT,x=1000+age*o.speed*3;
  if(age<0&&x>620)at(hg,x,220,3,draw,t,o);else if(age>=0)at(hg,1000,220,3,drawImpact,age,o);hg.restore();
  fg.clearRect(0,0,1280,180);const rate=+$('#rate').value,latest=Math.floor(state.absoluteTime*rate),hitAge=1230/o.speed;let bullets=0,hits=0;
  guide(fg,1162,112,40);
  for(let n=latest;n>=0;n--){
    const born=n/rate,a=state.absoluteTime-born;if(a>hitAge+hitMeta.duration)break;
    const small={...o,radius:6,seed:o.seed+n};
    if(a<hitAge){at(fg,-70+a*o.speed,112,1,draw,a,small);bullets++;}
    else{at(fg,1160,112,1,drawImpact,a-hitAge,small);hits++;}
  }
  $('#timeline').value=t;$('#clock').value=`${t.toFixed(3)} / ${D.toFixed(3)} s`;
  $('#phase').textContent=age<0?'飞行':age<.035?'接触瞬闪':age<hitMeta.duration?'碎芒消散':'结束 / 等待';
  $('#flightCaption').textContent=`${rate} 发/秒 · 同点命中重叠示意，非性能验收`;
  $('#status').textContent=`V${meta.version} · ${bullets} SHOTS / ${hits} HITS · PALE RIM / COMPACT GLOW`;
  $('#status').dataset.time=String(t);$('#status').dataset.playing=String(state.playing);
}
function freeze(t){state.time=Math.max(0,Math.min(D,t));state.absoluteTime=1+state.time;playing(false);render();}
$('#play').onclick=()=>{playing(!state.playing);render();};$('#restart').onclick=()=>{state.time=.4;state.absoluteTime=1.4;playing(true);render();};
$('#contact').onclick=()=>freeze(.516);$('#scatter').onclick=()=>freeze(.57);$('#end').onclick=()=>freeze(.69);
$('#timeline').oninput=e=>freeze(+e.target.value);$('#prev').onclick=()=>freeze(state.time-1/60);$('#next').onclick=()=>freeze(state.time+1/60);
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.rate=+b.dataset.speed;$$('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));});
$('#background').onchange=e=>{$$('.stage').forEach(el=>{for(const c of ['dark','light','checker','warm'])el.classList.toggle(c,c===e.target.value);});render();};$('#rate').onchange=render;
$$('[data-layer]').forEach(el=>el.onchange=()=>{state.options.layers[el.dataset.layer]=el.checked;render();});
for(const key of ['tailLength','tailWidth','tailOpacity','hitScale','outlineWidth','glow','glowRadius'])$('#'+key).oninput=e=>{const v=state.options[key]=+e.target.value;e.target.nextElementSibling.value=key==='tailLength'?(v/2).toFixed(1)+'D':['tailWidth','outlineWidth','glowRadius'].includes(key)?v.toFixed(2)+'R':v.toFixed(2);render();};
for(const key of ['core','rim','trail','outline'])$('#'+key).oninput=e=>{state.options[key]=e.target.value;render();};
function tick(now){const dt=Math.min(.05,(now-state.previous)/1000);state.previous=now;if(state.playing){state.time=(state.time+dt*state.rate)%D;state.absoluteTime+=dt*state.rate;render();}requestAnimationFrame(tick);}
try{playing(state.playing);render();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
