import {meta,options,loadData,createWebGL,backgrounds} from '../src/hd/energy-cluster-v6.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],base='/output/hd/EnergyCluster/V6/final/';
window.addEventListener('error',e=>$('#error').textContent=e.message);
window.addEventListener('unhandledrejection',e=>$('#error').textContent=String(e.reason));
try{
 const data=await loadData(base),reference=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=base+'QA/Reference_Transparent.png';});
 const renderers=['hero','shell','live','native','game'].map(id=>createWebGL($('#'+id),data));
 const none={shell:false,core:false,volume:false,glow:false};
 let time=.144,running=true,speed=1,last=0,o=options();const wrap=t=>((t%meta.duration)+meta.duration)%meta.duration;
 const canvas=$('#reference'),g=canvas.getContext('2d');
 function paint(){
  const background=$('#background').value;
  renderers.forEach((r,i)=>r.render(time,i===1?{...o,layers:{...none,shell:o.layers.shell}}:i===2?{...o,layers:{...o.layers,shell:false}}:o,{background,frameSize:[448,384,384,256,128][i]}));
  if(background==='checker'){for(let y=0;y<512;y+=16)for(let x=0;x<512;x+=16){g.fillStyle=(x/16+y/16)%2?'#223445':'#142130';g.fillRect(x,y,16,16);}}
  else{g.fillStyle=`rgb(${backgrounds[background]})`;g.fillRect(0,0,512,512);}
  const f=wrap(time)*meta.fps,i=Math.floor(f),b=f-i;g.imageSmoothingEnabled=true;
  g.drawImage(reference,i%5*256,Math.floor(i/5)*256,256,256,32,32,448,448);
  $('#phase').textContent=`${String(i).padStart(2,'0')} → ${String((i+1)%20).padStart(2,'0')} · ${b.toFixed(2)}`;
  $('#timeline').value=time;$('#clock').textContent=`${time.toFixed(3)} / 0.480 s`;
 }
 function state(v){running=v;$('#play').textContent=v?'暂停':'播放';}
 function sync(){all('[data-layer]').forEach(el=>el.checked=o.layers[el.dataset.layer]);all('[data-color]').forEach(el=>el.value=o[el.dataset.color]);
  all('[data-param]').forEach(el=>{el.value=o[el.dataset.param];$(`[data-value="${el.dataset.param}"]`).textContent=o[el.dataset.param].toFixed(2);});$('#interpolation').value=o.interpolation;}
 function seek(t){state(false);time=wrap(t);paint();}
 $('#play').onclick=()=>{state(!running);paint();};$('#restart').onclick=()=>{time=0;state(true);paint();};$('#pose').onclick=()=>seek(6/meta.fps);
 $('#prev').onclick=()=>seek(time-1/120);$('#next').onclick=()=>seek(time+1/120);$('#timeline').oninput=e=>seek(Number(e.target.value));$('#background').onchange=paint;
 $('#interpolation').onchange=e=>{o.interpolation=e.target.value;paint();};
 all('[data-layer]').forEach(el=>el.onchange=()=>{o.layers[el.dataset.layer]=el.checked;paint();});
 all('[data-color]').forEach(el=>el.oninput=()=>{o[el.dataset.color]=el.value;paint();});
 all('[data-param]').forEach(el=>el.oninput=()=>{o[el.dataset.param]=Number(el.value);$(`[data-value="${el.dataset.param}"]`).textContent=Number(el.value).toFixed(2);paint();});
 all('[data-speed]').forEach(el=>el.onclick=()=>{speed=Number(el.dataset.speed);all('[data-speed]').forEach(q=>q.classList.toggle('active',q===el));});
 $('#shellOnly').onclick=()=>{o.layers={...none,shell:true};sync();paint();};$('#liveOnly').onclick=()=>{o.layers={...none,core:true,volume:true,glow:true};sync();paint();};
 $('#reset').onclick=()=>{o=options();sync();paint();};
 function tick(now){try{if(last&&running&&!document.hidden)time=wrap(time+Math.min(.1,(now-last)/1000)*speed);last=now;paint();requestAnimationFrame(tick);}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}}
 sync();paint();$('#status').textContent='WEBGL GRAY + ALPHA / PREMULTIPLIED FRAME BLEND / STATIC RADIAL PROFILES / NOT UNITY';requestAnimationFrame(tick);
}catch(e){$('#error').textContent=e.stack;$('#status').textContent='ERROR';}
