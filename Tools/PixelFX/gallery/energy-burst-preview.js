import {meta,options,phase,createWebGL,layerNames} from '../src/hd/energy-burst.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
window.addEventListener('error',e=>$('#error').textContent=e.message);
window.addEventListener('unhandledrejection',e=>$('#error').textContent=String(e.reason));
try{
 const canvases=['hero','native','game'].map(id=>$('#'+id)),renderers=canvases.map(c=>createWebGL(c));
 let o=options(),time=.2,running=true,last=0,speed=1;
 const setRunning=v=>{running=v;$('#play').textContent=v?'暂停':'播放';};
 function paint(){
  const t=Math.min(time,o.duration),background=$('#background').value;
  renderers.forEach((r,i)=>r.render(t,o,{background,scale:[1,.35,.175][i]}));
  if($('#bounds').checked){const g=canvases[0].getContext('2d');g.save();g.strokeStyle='#86c4e677';g.setLineDash([5,7]);g.lineWidth=1;g.beginPath();g.arc(360,280,o.radius,0,Math.PI*2);g.stroke();g.fillStyle='#a7cbe2';g.font='11px monospace';g.fillText(`R ${o.radius}px`,365,280-o.radius-9);g.restore();}
  $('#phase').textContent=time>o.duration?'播放间隔':phase(time,o);$('#stageStats').textContent=`${o.duration.toFixed(2)} s / R ${o.radius} px`;
  $('#clock').textContent=`${t.toFixed(3)} / ${o.duration.toFixed(2)} s`;$('#timeline').value=t;
  $('#nativeCaption').textContent=`范围直径 ${Math.round(o.radius*.7)}px · 原尺寸显示`;
  $('#gameCaption').textContent=`范围直径 ${Math.round(o.radius*.35)}px · 原尺寸显示`;
 }
 function sync(){
  all('[data-param]').forEach(el=>{el.value=o[el.dataset.param];$(`[data-value="${el.dataset.param}"]`).textContent=el.dataset.param==='duration'?o.duration.toFixed(2)+' s':Number.isInteger(o[el.dataset.param])?String(o[el.dataset.param]):o[el.dataset.param].toFixed(2);});
  all('[data-layer]').forEach(el=>el.checked=o.layers[el.dataset.layer]);all('[data-color]').forEach(el=>el.value=o[el.dataset.color]);$('#timeline').max=o.duration;
 }
 function seek(t){setRunning(false);time=Math.max(0,Math.min(o.duration,t));paint();}
 $('#play').onclick=()=>{if(!running&&time>=o.duration)time=0;setRunning(!running);};
 $('#restart').onclick=()=>{time=0;setRunning(true);paint();};
 $('#prev').onclick=()=>seek(time-1/60);$('#next').onclick=()=>seek(time+1/60);
 $('#timeline').oninput=e=>seek(Number(e.target.value));$('#background').onchange=paint;$('#bounds').onchange=paint;
 all('[data-pose]').forEach(el=>el.onclick=()=>seek(Number(el.dataset.pose)*o.duration));
 all('[data-speed]').forEach(el=>el.onclick=()=>{speed=Number(el.dataset.speed);all('[data-speed]').forEach(q=>q.classList.toggle('active',q===el));});
 all('[data-param]').forEach(el=>el.oninput=()=>{const p=time/o.duration;o[el.dataset.param]=Number(el.value);if(el.dataset.param==='duration')time=p*o.duration;sync();paint();});
 all('[data-layer]').forEach(el=>el.onchange=()=>{o.layers[el.dataset.layer]=el.checked;paint();});
 all('[data-color]').forEach(el=>el.oninput=()=>{o[el.dataset.color]=el.value;paint();});
 const solo=k=>{o.layers=Object.fromEntries(layerNames.map(n=>[n,n===k]));sync();paint();};
 $('#onlyFront').onclick=()=>solo('front');$('#onlyShards').onclick=()=>solo('shards');
 $('#reset').onclick=()=>{o=options();time=Math.min(time,o.duration);sync();paint();};
 function tick(now){try{
  if(last&&running&&!document.hidden){time+=Math.min(.1,(now-last)/1000)*speed;if(time>=o.duration){if($('#repeat').checked){if(time>=o.duration+.5)time=0;}else{time=o.duration;setRunning(false);}}}
  last=now;paint();requestAnimationFrame(tick);
 }catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}}
 sync();paint();$('#status').textContent='WEBGL / INDEPENDENT ONE-SHOT / STATIC NOISE + LIVE EROSION / NOT UNITY';requestAnimationFrame(tick);
}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}
