import {draw,background,meta,poseAt} from '../src/hd/blue-wisp-v3.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={t:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,rate:1,previous:performance.now(),options:{...meta.options,layers:{...meta.options.layers}}};
const reference=new Image();reference.src='/output/hd/BlueWisp/References/four-pose-reference.png';
function playing(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function paint(){
 const o={...state.options,buffer:$('#buffer').value},bg=$('#background').value,p=poseAt(state.t),c=$('#hero'),g=c.getContext('2d');
 g.clearRect(0,0,c.width,c.height);background(g,c.width,c.height,bg);
 const scale=2.85,x=85,y=55;
 if(reference.complete&&reference.naturalWidth){g.imageSmoothingEnabled=false;g.drawImage(reference,p*150,0,150,135,x,y,150*scale,135*scale);g.imageSmoothingEnabled=true;}
 g.save();g.translate(x+600+66*scale,y+68*scale);g.scale(scale*46/o.radius,scale*46/o.radius);draw(g,state.t,o);g.restore();
 g.strokeStyle=bg==='light'?'#7d96a8':'#778d9955';g.beginPath();g.moveTo(600,0);g.lineTo(600,500);g.stroke();
 const s=$('#small'),sg=s.getContext('2d');sg.clearRect(0,0,s.width,s.height);background(sg,s.width,s.height,bg);
 for(const[j,size]of[48,88,132].entries())for(let i=0;i<4;i++){
   sg.save();sg.translate(i*300+115,[45,155,320][j]);sg.scale(size/(o.radius*2),size/(o.radius*2));draw(sg,i*.07,o);sg.restore();
   sg.fillStyle=bg==='light'?'#45677b':'#a5bccb';sg.font='10px monospace';sg.fillText(`${size}px / P${i+1}`,i*300+219,[50,160,325][j]);
 }
 $('#timeline').value=state.t;$('#clock').textContent=`姿态 ${p+1} · ${(state.t*1000).toFixed(0)} / 280ms`;
 $$('[data-pose]').forEach(e=>e.classList.toggle('active',+e.dataset.pose===p));
 $('#status').textContent=`V${meta.version} · 4 POSES × 70ms · LIVE GEOMETRY`;
 $('#status').dataset.pose=String(p);$('#status').dataset.playing=String(state.playing);
}
function seek(t){state.t=((t%.28)+.28)%.28;playing(false);paint();}
$('#play').onclick=()=>{playing(!state.playing);paint();};$('#restart').onclick=()=>{state.t=0;playing(true);paint();};
$('#prev').onclick=()=>seek(((poseAt(state.t)+3)%4)*.07);$('#next').onclick=()=>seek(((poseAt(state.t)+1)%4)*.07);
$$('[data-pose]').forEach(e=>e.onclick=()=>seek(+e.dataset.pose*.07));$('#timeline').oninput=e=>seek(+e.target.value);
$$('[data-speed]').forEach(e=>e.onclick=()=>{state.rate=+e.dataset.speed;$$('[data-speed]').forEach(b=>b.classList.toggle('active',b===e));});
for(const id of ['background','buffer'])$('#'+id).onchange=paint;
$('#glow').oninput=e=>{state.options.glow=+e.target.value;paint();};
$$('[data-layer]').forEach(e=>e.onchange=()=>{state.options.layers[e.dataset.layer]=e.checked;paint();});
for(const key of ['edge','blue','cyan','pale','core'])$('#'+key).oninput=e=>{state.options[key]=e.target.value;paint();};
reference.onload=paint;reference.onerror=()=>{$('#error').textContent='参考对照图加载失败';};
function tick(now){const dt=Math.min(.1,(now-state.previous)/1000);state.previous=now;if(state.playing){state.t=(state.t+dt*state.rate)%.28;paint();}requestAnimationFrame(tick);}
try{playing(state.playing);paint();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
