import * as fx from '../src/hd/energy-burst-v6.js';
import * as old from '../src/hd/energy-burst-v5.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
window.addEventListener('error',e=>$('#error').textContent=e.message);window.addEventListener('unhandledrejection',e=>$('#error').textContent=String(e.reason));
const review=new URLSearchParams(location.search).has('review'),orbHold=.96,orbOffset=.144,gap=.50,hero=$('#hero'),g=hero.getContext('2d');
let time=0,running=true,speed=1,last=0,orbRenderer,orbCanvas,renderer,oldRenderer,mistRenderer,whiteRenderer;
const none=Object.fromEntries(fx.layerNames.map(k=>[k,false]));
const read=()=>fx.options(Object.fromEntries([...all('[data-param]').map(e=>[e.dataset.param,Number(e.value)]),...all('[data-color]').map(e=>[e.dataset.color,e.value]),['layers',Object.fromEntries(all('[data-layer]').map(e=>[e.dataset.layer,e.checked]))]]));
const view=()=>({background:$('#background').value}),offset=()=>review?orbHold:0,total=()=>read().duration+offset()+gap;
const setRunning=v=>{running=v;$('#play').textContent=v?'暂停':'播放';if(v)$('#regression').textContent='';};
function compare(local,o){const t=Math.max(0,local),v={...view(),scale:.60};oldRenderer.render(t,{...o,layers:Object.fromEntries(fx.layerNames.map(k=>[k,true]))},v);mistRenderer.render(t,{...o,layers:{...none,volume:true,glow:true}},v);whiteRenderer.render(t,{...o,layers:{...none,folds:true}},v);$('#compareAge').textContent=`爆炸年龄 ${t.toFixed(3)}s · 共用 0.60 倍逻辑倍率 · 跃动与外流只影响蓝色扩散。`;}
function paint(){const o=read(),local=time-offset();
 if(review&&time<orbHold&&orbRenderer){orbRenderer.render(orbOffset+time,{}, {...view(),frameSize:256});g.drawImage(orbCanvas,0,0);$('#phase').textContent='原能量球 · 翻卷与跳动参考';$('#age').textContent=`距爆炸 ${(orbHold-time).toFixed(3)}s`;compare(.36*o.duration/fx.meta.duration,o);}
 else{renderer.render(Math.max(0,local),o,view());$('#phase').textContent='独立爆炸 V6 · '+fx.phase(Math.max(0,local),o);$('#age').textContent=`爆炸年龄 ${Math.max(0,local).toFixed(3)}s`;compare(local,o);}
 $('#timeline').max=total();$('#timeline').value=time;$('#clock').textContent=`${time.toFixed(3)} / ${total().toFixed(2)}s`;$('#modeCaption').textContent=`${review?'两效果联播':'独立爆炸'} / R ${o.radius} px`;
}
function update(){const o=read();$('#regression').textContent='';all('[data-value]').forEach(e=>e.textContent=o[e.dataset.value]+(e.dataset.value==='radius'?' px':e.dataset.value==='duration'?' s':''));time=Math.min(time,total());paint();}
const seek=t=>{setRunning(false);$('#regression').textContent='';time=Math.max(0,Math.min(total(),t));paint();};
$('#play').onclick=()=>{if(!running&&time>=total())time=0;setRunning(!running);paint();};$('#restart').onclick=()=>{time=0;setRunning(true);paint();};
$('#prev').onclick=()=>seek(time-1/60);$('#next').onclick=()=>seek(time+1/60);$('#timeline').oninput=e=>seek(Number(e.target.value));
all('[data-speed]').forEach(el=>el.onclick=()=>{speed=Number(el.dataset.speed);all('[data-speed]').forEach(q=>q.classList.toggle('active',q===el));});
all('[data-pose]').forEach(el=>el.onclick=()=>{const o=read(),poses={charge:o.charge*.9,flash:o.charge+.028,spread:o.charge+.11,pulse:o.charge+.22,fade:o.charge+.53,end:fx.meta.duration};seek(offset()+poses[el.dataset.pose]*o.duration/fx.meta.duration);});
all('[data-param],[data-layer],[data-color]').forEach(el=>el.oninput=update);$('#background').onchange=update;
$('#mistOnly').onclick=()=>{all('[data-layer]').forEach(e=>e.checked=['volume','glow'].includes(e.dataset.layer));update();};$('#whiteOnly').onclick=()=>{all('[data-layer]').forEach(e=>e.checked=e.dataset.layer==='folds');update();};
$('#reset').onclick=()=>{all('[data-param]').forEach(e=>e.value=fx.meta.options[e.dataset.param]);all('[data-color]').forEach(e=>e.value=fx.meta.options[e.dataset.color]);all('[data-layer]').forEach(e=>e.checked=true);$('#regression').textContent='';update();};
$('#regress').onclick=()=>{setRunning(false);const o=read(),t=Math.max(.001,Math.min(o.duration-.001,time-offset())),v={...view(),scale:.60},layers={...none,folds:true};oldRenderer.render(t,{...o,layers},v);whiteRenderer.render(t,{...o,layers},v);const a=$('#oldShot').getContext('2d').getImageData(0,0,300,250).data,b=$('#whiteShot').getContext('2d').getImageData(0,0,300,250).data;let changed=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d>0)changed++;max=Math.max(max,d);}$('#regression').textContent=`白色层核对：${changed} 通道差异 / 最大差 ${max}/255`;};
function tick(now){try{if(last&&running&&!document.hidden){time+=Math.min(.08,(now-last)/1000)*speed;if(time>=total()){if($('#repeat').checked)time%=total();else{time=total();setRunning(false);}}}last=now;if(running)paint();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}}
try{renderer=fx.createWebGL(hero);oldRenderer=old.createWebGL($('#oldShot'));mistRenderer=fx.createWebGL($('#mistShot'));whiteRenderer=fx.createWebGL($('#whiteShot'));
 if(review){$('#modeLink').href='?';$('#modeLink').textContent='仅看独立爆炸 V6 ↗';$('#stageFoot').textContent='原能量球 → 独立爆炸联播 / 仅参考其局部跳动，不改原球 / 白色高亮保留 / 未导入 Unity';const orb=await import('../src/hd/energy-cluster-v6.js'),data=await orb.loadData('/output/hd/EnergyCluster/V6/final/');orbCanvas=document.createElement('canvas');orbCanvas.width=720;orbCanvas.height=500;orbRenderer=orb.createWebGL(orbCanvas,data);}
 update();$('#status').textContent='WEBGL LIVE BLUE DIFFUSION / RETAINED V5 WHITE HIGHLIGHTS / AUTHORING ONLY';requestAnimationFrame(tick);
}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}
