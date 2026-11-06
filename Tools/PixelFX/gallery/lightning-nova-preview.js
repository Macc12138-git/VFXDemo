import {meta,createFrameGeometry,makeCamera,NovaRenderer} from '../src/hd/lightning-nova.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={time:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,speed:1,orbit:false,previous:performance.now(),options:{...meta.options,layers:{}},camera:{yaw:-22,elevation:30,distance:9.5}};
let left,right;
function playing(v){state.playing=v;$('#play').textContent=v?'暂停':'播放';}
function cameraUI(){for(const n of ['yaw','elevation','distance']){$('#'+n).value=state.camera[n];$('#'+n).nextElementSibling.value=state.camera[n].toFixed(n==='distance'?1:0)+(n==='distance'?'':'°');}}
function show(){
  const t=Math.min(state.time,meta.duration),frame=createFrameGeometry(t,state.options),settings={grid:$('#grid').checked,background:$('#background').value,layer:$('#blend').value};
  left.render(frame,makeCamera({flat:true,yaw:0,elevation:24,aspect:1.16}),settings);right.render(frame,makeCamera({...state.camera,aspect:1.16}),settings);
  $('#timeline').value=t;$('#clock').value=`${t.toFixed(3)} / ${meta.duration.toFixed(3)} s`;
  $('#phase').textContent=t<.1?'先导 / 击穿':t<.14?'白热 / 冲击':t<.23?'能量外冲':t<.4?'断流 / 复燃':t<.86?'残余电荷':'消散完成';
  $('#status').textContent=`${meta.version} · SEED ${state.options.seed} · ${(frame.color.length+frame.light.length)/21|0} TRIANGLES`;
  $('#viewLabel').textContent=`XZ WORLD / YAW ${state.camera.yaw.toFixed(0)}° / ELEV ${state.camera.elevation.toFixed(0)}°`;
  $('#status').dataset.glError=String(left.stats.error||right.stats.error);$('#status').dataset.vertices=String(left.stats.colorVertices+left.stats.lightVertices);
}
function freeze(t){state.time=t;playing(false);show();}
$('#play').onclick=()=>playing(!state.playing);$('#replay').onclick=()=>{state.time=0;playing(true);show();};
$('#hit').onclick=()=>freeze(.112);$('#hero').onclick=()=>freeze(.165);$('#spread').onclick=()=>freeze(.24);$('#cut').onclick=()=>freeze(.305);$('#timeline').oninput=e=>freeze(+e.target.value);
$('#prev').onclick=()=>freeze(Math.max(0,Math.min(state.time,1.2)-1/60));$('#next').onclick=()=>freeze(Math.min(1.2,state.time+1/60));
$$('.speed').forEach(b=>b.onclick=()=>{state.speed=+b.dataset.speed;$$('.speed').forEach(x=>x.classList.toggle('active',x===b));});
$('#background').onchange=e=>{$$('.stage').forEach(x=>x.className='stage '+e.target.value);show();};for(const id of ['blend','grid'])$('#'+id).onchange=show;
$$('[data-layer]').forEach(el=>el.onchange=()=>{state.options.layers[el.dataset.layer]=el.checked;show();});
for(const key of ['radius','intensity','glow','density'])$('#'+key).oninput=e=>{state.options[key]=+e.target.value;e.target.nextElementSibling.value=(+e.target.value).toFixed(2);show();};
for(const key of ['core','body','edge','spark'])$('#'+key).oninput=e=>{state.options[key]=e.target.value;show();};
$('#seed').onchange=e=>{state.options.seed=+e.target.value;show();};$('#reseed').onclick=()=>{state.options.seed=(state.options.seed+137)%99999||1;$('#seed').value=state.options.seed;show();};
for(const key of ['yaw','elevation','distance'])$('#'+key).oninput=e=>{state.camera[key]=+e.target.value;cameraUI();show();};
$$('[data-camera]').forEach(b=>b.onclick=()=>{Object.assign(state.camera,({oblique:{yaw:-22,elevation:30,distance:9.5},top:{yaw:0,elevation:89,distance:9.5},low:{yaw:-22,elevation:8,distance:10.4}})[b.dataset.camera]);cameraUI();show();});
$('#orbit').onclick=()=>{state.orbit=!state.orbit;$('#orbit').classList.toggle('active',state.orbit);};let drag;
$('#view3d').onpointerdown=e=>{drag=[e.clientX,e.clientY,state.camera.yaw,state.camera.elevation];e.target.setPointerCapture(e.pointerId);};
$('#view3d').onpointermove=e=>{if(!drag)return;state.camera.yaw=((drag[2]+(e.clientX-drag[0])*0.35+540)%360)-180;state.camera.elevation=Math.max(5,Math.min(89,drag[3]+(e.clientY-drag[1])*0.25));cameraUI();show();};
$('#view3d').onpointerup=()=>drag=null;$('#view3d').onpointercancel=()=>drag=null;
$('#view3d').addEventListener('wheel',e=>{e.preventDefault();state.camera.distance=Math.max(7.5,Math.min(14,state.camera.distance+e.deltaY*0.006));cameraUI();show();},{passive:false});
function tick(now){const dt=Math.min((now-state.previous)/1000,0.05);state.previous=now;
  if(state.playing){state.time+=dt*state.speed;if(state.time>meta.duration+0.7){if($('#loop').checked)state.time=0;else{state.time=meta.duration;playing(false);}}}
  if(state.orbit){state.camera.yaw=((state.camera.yaw+dt*19+540)%360)-180;cameraUI();}if(state.playing||state.orbit)show();requestAnimationFrame(tick);
}
try{left=new NovaRenderer($('#view2d'));right=new NovaRenderer($('#view3d'));playing(state.playing);cameraUI();show();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.message;console.error(e);}
