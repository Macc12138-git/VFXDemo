import * as burst from '../src/hd/energy-burst-v4.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
window.addEventListener('error',e=>$('#error').textContent=e.message);
window.addEventListener('unhandledrejection',e=>$('#error').textContent=String(e.reason));
const review=new URLSearchParams(location.search).has('review');
const orbHold=.96,orbOffset=.144,gap=.50,hero=$('#hero'),g=hero.getContext('2d');
const renderer=burst.createRenderer(hero),stills=['chargeShot','spreadShot','flowShot'].map(k=>burst.createRenderer($('#'+k)));
let time=0,running=true,speed=1,last=0,orbRenderer,orbCanvas;
const read=()=>Object.fromEntries([...all('[data-param]').map(e=>[e.dataset.param,Number(e.value)]),...all('[data-color]').map(e=>[e.dataset.color,e.value]),['layers',Object.fromEntries(all('[data-layer]').map(e=>[e.dataset.layer,e.checked]))]]);
const view=()=>({background:$('#background').value});
const total=()=>read().duration+(review?orbHold+gap:gap),offset=()=>review?orbHold:0;
const setRunning=v=>{running=v;$('#play').textContent=v?'暂停':'播放';};
function paint(){
 const o=read(),local=time-offset();
 if(review&&time<orbHold&&orbRenderer){
  orbRenderer.render(orbOffset+time,{}, {...view(),frameSize:256});g.drawImage(orbCanvas,0,0);
  $('#phase').textContent='能量团 V6 · 原稿';$('#localClock').textContent=`距触发 ${(orbHold-time).toFixed(3)}s`;
 }else{
  renderer.render(Math.max(0,local),o,view());
  $('#phase').textContent='独立爆炸 V4 · '+burst.phase(Math.max(0,local),o);
  $('#localClock').textContent=`爆炸年龄 ${Math.max(0,local).toFixed(3)}s`;
 }
 $('#timeline').max=total();$('#timeline').value=time;$('#clock').textContent=`${time.toFixed(3)} / ${total().toFixed(2)}s`;
 $('#modeCaption').textContent=`${review?'两效果联播':'独立爆炸'} / R ${o.radius} px`;
}
function update(){
 const o=read();all('[data-value]').forEach(e=>e.textContent=o[e.dataset.value]+(['radius'].includes(e.dataset.value)?' px':['duration','charge'].includes(e.dataset.value)?' s':''));
 [o.charge*.87,o.charge+.11,o.charge+.35].forEach((t,i)=>stills[i].render(t*o.duration/burst.meta.duration,o,{...view(),scale:.62}));
 time=Math.min(time,total());paint();
}
const seek=t=>{setRunning(false);time=Math.max(0,Math.min(total(),t));paint();};
$('#play').onclick=()=>{if(!running&&time>=total())time=0;setRunning(!running);paint();};
$('#restart').onclick=()=>{time=0;setRunning(true);paint();};
$('#prev').onclick=()=>seek(time-1/60);$('#next').onclick=()=>seek(time+1/60);$('#timeline').oninput=e=>seek(Number(e.target.value));
all('[data-speed]').forEach(el=>el.onclick=()=>{speed=Number(el.dataset.speed);all('[data-speed]').forEach(q=>q.classList.toggle('active',q===el));});
all('[data-seek]').forEach(el=>el.onclick=()=>{const o=read(),poses={charge:o.charge*.87,release:o.charge+.022,spread:o.charge+.11,flow:o.charge+.35,fade:o.charge+.54,end:burst.meta.duration};seek(offset()+poses[el.dataset.seek]*o.duration/burst.meta.duration);});
all('[data-param],[data-layer],[data-color]').forEach(el=>el.oninput=update);$('#background').onchange=update;
$('#onlyFlow').onclick=()=>{all('[data-layer]').forEach(e=>e.checked=['flow','glow'].includes(e.dataset.layer));const o=read();seek(offset()+(o.charge+.35)*o.duration/burst.meta.duration);update();};
$('#reset').onclick=()=>{all('[data-param]').forEach(e=>e.value=burst.meta.options[e.dataset.param]);all('[data-color]').forEach(e=>e.value=burst.meta.options[e.dataset.color]);all('[data-layer]').forEach(e=>e.checked=true);update();};
function tick(now){try{if(last&&running&&!document.hidden){time+=Math.min(.08,(now-last)/1000)*speed;if(time>=total()){if($('#repeat').checked)time%=total();else{time=total();setRunning(false);}}}last=now;paint();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}}
try{
 if(review){
  $('#modeLink').href='?';$('#modeLink').textContent='仅看独立爆炸 V4 ↗';
  $('#stageFoot').textContent='仅连续审阅：能量团 V6（WebGL）→ 独立爆炸 V4（Canvas2D）· 同中心、同逻辑倍率 · 不合并 / 不叠加 / 不改 V6';
  const orb=await import('../src/hd/energy-cluster-v6.js'),data=await orb.loadData('/output/hd/EnergyCluster/V6/final/');
  orbCanvas=document.createElement('canvas');orbCanvas.width=720;orbCanvas.height=560;orbRenderer=orb.createWebGL(orbCanvas,data);
 }
 update();$('#status').textContent='CANVAS2D LIVE GEOMETRY / NO RING / NO FLIPBOOK / NOT UNITY';requestAnimationFrame(tick);
}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}
