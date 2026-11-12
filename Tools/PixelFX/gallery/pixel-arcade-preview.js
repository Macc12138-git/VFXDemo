import { createFrame, clearFrame, painterFor, composite } from "../src/core/index.js";
import * as fire from "../src/fx/fire/arcade-fireball.js";
import * as impact from "../src/fx/explosions/arcade-fireball-impact.js";

const $=id=>document.getElementById(id),FPS=fire.meta.fps,FLIGHT_FRAMES=20,IMPACT_FRAMES=8;
const canvas=$("stage");canvas.width=150;canvas.height=94;
const frame=createFrame(150,94),image=new ImageData(150,94),ctx=canvas.getContext("2d");
const small=createFrame(80,50),smallImage=new ImageData(80,50);
let time=0,playing=true,last=null;
const mode=()=>$("mode").value;
const end=()=>mode()==="flight"?6:mode()==="impact"?IMPACT_FRAMES:FLIGHT_FRAMES+IMPACT_FRAMES;
function setPlaying(value){playing=value;$("play").textContent=value?"暂停":"播放";}
function state(){
  const n=Math.min(end(),Math.floor(time*FPS+1e-6));
  const isFire=mode()==="flight"||mode()==="sequence"&&n<FLIGHT_FRAMES;
  const pose=isFire?n%6:mode()==="impact"?n:n-FLIGHT_FRAMES;
  return {n,isFire,pose,done:!isFire&&pose>=IMPACT_FRAMES};
}
function drawAt(p,s,x,y){
  if(s.done)return;
  const mod=s.isFire?fire:impact;
  mod.draw(p.place(x,y),s.pose/FPS,{...mod.meta.options,...(s.isFire?{pulse:$("pulse").checked?1:0}:{})});
}
function paint(){
  const s=state();
  clearFrame(frame);
  // One head moves upwards; at the same point it is replaced, never overlapped, by its impact.
  const y=s.isFire&&mode()==="sequence"?Math.round(72-28*s.n/FLIGHT_FRAMES):s.isFire?40:44;
  drawAt(painterFor(frame),s,75,y);
  composite(frame,image.data,null);ctx.putImageData(image,0,0);
  clearFrame(small);drawAt(painterFor(small),s,40,s.isFire?19:25);
  composite(small,smallImage.data,null);
  for(const id of ["native","double"])$(id).getContext("2d").putImageData(smallImage,0,0);
  $("time").value=s.n;
  $("clock").value=`${(s.n/FPS).toFixed(3)} / ${(end()/FPS).toFixed(2)} s`;
  $("phase").textContent=s.done?"爆炸结束 · 已清空":s.isFire?`火球循环 · ${s.pose+1} / 6`:`爆炸一次 · ${s.pose+1} / 8`;
  $("status").textContent=s.done?"已结束 · 点击重新播放":playing?"播放中 · 单枚":"已暂停 · 单枚";
  canvas.dataset.phase=s.done?"ended":s.isFire?"flight":"impact";
  canvas.dataset.pose=String(s.pose+1);canvas.dataset.playing=String(playing);
}
function sizing(){const z=Number($("zoom").value);canvas.style.width=`${150*z}px`;canvas.style.height=`${94*z}px`;canvas.parentElement.style.height=`${Math.max(390,94*z)}px`;}
function background(){
  document.querySelectorAll(".stage,.native").forEach(el=>{el.classList.remove("gray","light","checker");if($("bg").value!=="dark")el.classList.add($("bg").value);});
}
function reset(){time=0;last=null;$("time").max=end();setPlaying(true);paint();}
$("mode").onchange=reset;$("replay").onclick=reset;
$("sequence").onclick=()=>{$("mode").value="sequence";reset();};
$("play").onclick=()=>{if(time*FPS>=end())time=0;setPlaying(!playing);paint();};
$("step").onclick=()=>{setPlaying(false);const n=Math.floor(time*FPS+1e-6)+1;time=(mode()==="flight"?n%6:Math.min(end(),n))/FPS;paint();};
$("time").oninput=()=>{setPlaying(false);time=Number($("time").value)/FPS;paint();};
$("zoom").onchange=sizing;$("bg").onchange=background;$("pulse").onchange=paint;
const params=new URLSearchParams(location.search);
if(["flight","impact","sequence"].includes(params.get("mode")))$("mode").value=params.get("mode");
if(params.has("bg"))$("bg").value=params.get("bg");
if(params.has("speed"))$("speed").value=params.get("speed");
$("time").max=end();
if(params.has("frame")){time=Math.min(end(),Math.max(0,Number(params.get("frame"))))/FPS;setPlaying(false);}
sizing();background();paint();
function tick(now){
  if(last!==null&&playing){
    time+=Math.min((now-last)/1000,.05)*Number($("speed").value);
    if(mode()==="flight")time%=fire.meta.duration;
    else if(time*FPS>=end()){time=end()/FPS;setPlaying(false);}
    paint();
  }
  last=now;requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
