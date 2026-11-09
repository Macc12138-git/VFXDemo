import * as orb from '../src/hd/energy-cluster-v6.js';
import * as burst from '../src/hd/energy-burst-v2.js';
import {review,reviewEnd,reviewDuration,sampleReview} from './energy-continuity-model.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
window.addEventListener('error',e=>$('#error').textContent=e.message);
window.addEventListener('unhandledrejection',e=>$('#error').textContent=String(e.reason));
try{
 const data=await orb.loadData('/output/hd/EnergyCluster/V6/final/');
 const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const orbCanvas=surface(720,560),burstCanvas=surface(720,560);
 const orbRenderer=orb.createWebGL(orbCanvas,data),burstRenderer=burst.createWebGL(burstCanvas);
 const beforeRenderer=orb.createWebGL($('#before'),data),firstRenderer=burst.createWebGL($('#first')),expandedRenderer=burst.createWebGL($('#expanded'));
 const hero=$('#hero'),g=hero.getContext('2d');let time=0,running=true,last=0,speed=1;
 const radius=()=>Number($('#radius').value),view=()=>({background:$('#background').value});
 function stills(){
  beforeRenderer.render(review.orbOffset+review.orbHold-1/60,{}, {...view(),frameSize:256*.48});
  firstRenderer.render(1/60,{radius:radius()},{...view(),scale:.48});
  expandedRenderer.render(.20,{radius:radius()},{...view(),scale:.48});
  $('#radiusValue').textContent=radius()+' px';
 }
 function paint(){
  const sample=sampleReview(time);
  if(sample.stage==='orb'){
   orbRenderer.render(sample.time,{}, {...view(),frameSize:256});g.drawImage(orbCanvas,0,0);
   $('#phase').textContent='能量团 V6 · 循环';$('#localClock').textContent=`切换倒计时 ${(review.orbHold-time).toFixed(3)}s`;
  }else{
   burstRenderer.render(sample.time,{radius:radius()},{...view(),scale:1});g.drawImage(burstCanvas,0,0);
   $('#phase').textContent=sample.stage==='gap'?'已消散 · 联播间隔':'独立爆炸 V2 · '+burst.phase(sample.time);
   $('#localClock').textContent=`爆炸年龄 ${sample.time.toFixed(3)}s`;
  }
  $('#timeline').value=time;$('#clock').textContent=`${time.toFixed(3)} / ${reviewDuration.toFixed(2)}s`;
 }
 const state=v=>{running=v;$('#play').textContent=v?'暂停':'播放';};
 const seek=t=>{state(false);time=Math.max(0,Math.min(reviewDuration,t));paint();};
 $('#play').onclick=()=>{if(!running&&time>=reviewDuration)time=0;state(!running);paint();};
 $('#restart').onclick=()=>{time=0;state(true);paint();};
 $('#prev').onclick=()=>seek(time-1/60);$('#next').onclick=()=>seek(time+1/60);$('#timeline').oninput=e=>seek(Number(e.target.value));
 const poses={before:review.orbHold-1/60,first:review.orbHold+1/60,expanded:review.orbHold+.20,end:reviewEnd};
 all('[data-seek]').forEach(el=>el.onclick=()=>seek(poses[el.dataset.seek]));
 all('[data-speed]').forEach(el=>el.onclick=()=>{speed=Number(el.dataset.speed);all('[data-speed]').forEach(q=>q.classList.toggle('active',q===el));});
 $('#background').onchange=()=>{stills();paint();};$('#radius').oninput=()=>{stills();paint();};
 $('#resetRadius').onclick=()=>{$('#radius').value=burst.meta.options.radius;stills();paint();};
 function tick(now){try{
  if(last&&running&&!document.hidden){time+=Math.min(.1,(now-last)/1000)*speed;if(time>=reviewDuration){if($('#repeat').checked)time%=reviewDuration;else{time=reviewDuration;state(false);}}}
  last=now;paint();requestAnimationFrame(tick);
 }catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}}
 $('#timeline').max=reviewDuration;stills();paint();$('#status').textContent='WEBGL / REVIEW-ONLY SEQUENCER / V6 UNCHANGED / INDEPENDENT ROUND V2 / NO BLEND OR AUTO-FIT';requestAnimationFrame(tick);
}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}
