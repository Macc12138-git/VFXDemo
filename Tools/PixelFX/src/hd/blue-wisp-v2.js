// V2: a stable painted nucleus with local shedding, not a globally warped orb.
// Original realtime geometry. Reference frames are not used as artwork.
export const meta = {
  id: 'hd/blue-wisp-v2', name: '苍蓝灵火 · 稳定亮核', version: '2.0.2',
  size: [960,640], origin: [390,320], duration: 1.4, fps: 60, loop: true,
  options: {seed: 13, radius: 112, flow: 1, localMotion: .7, glow: .4,
    shadow: '#0873ed', body: '#00caff', flame: '#4cfcff', core: '#eeffff',
    layers: {body:true,brush:true,core:true,tongues:true,flecks:true,glow:true}},
};
const TAU=Math.PI*2,fract=x=>x-Math.floor(x),clamp=x=>Math.max(0,Math.min(1,x));
const hash=(s,i,k=0)=>fract(Math.sin(s*12.9898+i*78.233+k*36.71)*43758.5453);
const rgba=(c,a)=>`rgba(${[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)).join(',')},${clamp(a)})`;
const mix=(a,b,u)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-u)+parseInt(b.slice(i,i+2),16)*u).toString(16).padStart(2,'0')).join('');
export const options=(input={})=>({...meta.options,...input,layers:{...meta.options.layers,...input.layers}});
export function sample(t,input={}){
  const o=options(input),phase=fract(t*o.flow/meta.duration);
  const tongues=[[-.64,3,.13],[.02,4,.47],[.64,5,.76]].map(([y,cycles,offset],i)=>{
    const u=fract(phase*cycles+offset),envelope=Math.sin(Math.PI*u)**2;
    return {u,y,alpha:envelope,shift:u*.055*o.localMotion,
      bend:(u-.5)*.035*o.localMotion,length:.32+.065*envelope*o.localMotion,i};
  });
  const flecks=Array.from({length:4},(_,i)=>{
    const u=fract(phase*(3+i%2)+hash(o.seed,i)),side=i%2?1:-1;
    return {u,x:1.12+u*(.57+hash(o.seed,i,1)*.13),y:side*(.48+hash(o.seed,i,2)*.24+u*.09),
      length:(.06+hash(o.seed,i,3)*.045)*Math.sin(Math.PI*u),alpha:Math.sin(Math.PI*u)**2*.88,side};
  });
  return {o,phase,scale:1,center:[0,0],coreCenter:[-.34,-.035],coreScale:1,tongues,flecks};
}
function paint(g,c,commands,a=1){
  g.beginPath();for(const [op,...args]of commands)g[op](...args);g.closePath();
  g.fillStyle=c;g.globalAlpha=a;g.fill();g.globalAlpha=1;
}
function polygon(g,c,points,a=1){paint(g,c,[['moveTo',...points[0]],...points.slice(1).map(p=>['lineTo',...p])],a);}
// Fixed silhouette: the front hemisphere, nucleus and anchoring never oscillate.
function silhouette(g){
  g.beginPath();g.moveTo(-1.0,-.025);
  g.bezierCurveTo(-1.015,-.43,-.76,-.81,-.43,-.94);
  g.bezierCurveTo(-.22,-1.035,.04,-1.01,.22,-.985);
  g.bezierCurveTo(.37,-.96,.48,-1.015,.62,-.98);
  g.bezierCurveTo(.60,-.88,.44,-.87,.46,-.79);
  g.bezierCurveTo(.62,-.66,.77,-.68,.91,-.69);
  g.bezierCurveTo(.88,-.57,.72,-.55,.76,-.43);
  g.bezierCurveTo(.81,-.28,.93,-.19,.97,-.09);
  g.bezierCurveTo(1.02,-.01,1.10,.01,1.17,.015);
  g.bezierCurveTo(1.09,.11,.91,.13,.86,.25);
  g.bezierCurveTo(.80,.37,.83,.43,1.00,.46);
  g.bezierCurveTo(.91,.56,.78,.49,.70,.60);
  g.bezierCurveTo(.62,.70,.71,.79,.83,.82);
  g.bezierCurveTo(.65,.90,.54,.82,.39,.91);
  g.bezierCurveTo(.13,1.045,-.12,1.015,-.36,.95);
  g.bezierCurveTo(-.76,.85,-.995,.46,-1.0,-.025);g.closePath();
}
function fixedBlob(g,c,x,y,r,sx=1,sy=1,offset=0){
  const p=[];for(let i=0;i<120;i++){
    const a=i/120*TAU,d=r*(1+.021*Math.sin(a*5+offset)+.013*Math.sin(a*9+.7));
    p.push([x+Math.cos(a)*d*sx,y+Math.sin(a)*d*sy]);
  }polygon(g,c,p);
}
function arcPaint(g,c,{a,span,r,width,alpha=1}){
  const outer=[],inner=[];
  for(let i=0;i<=90;i++){
    const u=i/90,ang=a+span*u,rr=r+.009*Math.sin(u*16)+.004*Math.sin(u*39);
    const w=width*Math.sin(Math.PI*u)**.7*(1+.12*Math.sin(u*11+.4));
    outer.push([Math.cos(ang)*(rr+w*.3),Math.sin(ang)*(rr+w*.3)]);
    inner.push([Math.cos(ang)*(rr-w*.7),Math.sin(ang)*(rr-w*.7)]);
  }polygon(g,c,[...outer,...inner.reverse()],alpha);
}
function body(g,o){
  silhouette(g);g.fillStyle=o.shadow;g.fill();
  g.save();silhouette(g);g.clip();
  g.save();g.translate(-.012,-.01);g.scale(.96,.958);silhouette(g);g.fillStyle=o.body;g.fill();g.restore();
  fixedBlob(g,o.flame,-.20,-.025,.835,.97,1.03);
  // Broad hand-shaped light and shade, no moving rings or glass-like interior.
  paint(g,mix(o.body,o.flame,.45),[['moveTo',-.66,-.53],['bezierCurveTo',-.40,-.82,-.08,-.75,.22,-.68],
    ['bezierCurveTo',.48,-.60,.52,-.41,.75,-.30],['bezierCurveTo',.47,-.25,.32,-.55,.04,-.55],
    ['bezierCurveTo',-.21,-.57,-.44,-.47,-.66,-.53]]);
  paint(g,o.body,[['moveTo',.31,-.73],['bezierCurveTo',.59,-.50,.63,-.26,.63,-.04],
    ['bezierCurveTo',.60,.27,.38,.53,.26,.68],['bezierCurveTo',.50,.65,.66,.45,.76,.30],
    ['bezierCurveTo',.89,.09,.88,-.18,.72,-.40],['bezierCurveTo',.57,-.59,.47,-.64,.31,-.73]]);
  paint(g,mix(o.body,o.shadow,.23),[['moveTo',-.57,.71],['bezierCurveTo',-.12,.95,.15,.79,.46,.73],
    ['bezierCurveTo',.66,.69,.70,.80,.83,.82],['bezierCurveTo',.50,1.02,-.17,1.02,-.57,.71]]);
  g.restore();
}
function brushwork(g,o){
  g.save();silhouette(g);g.clip();
  arcPaint(g,mix(o.flame,o.core,.28),{a:2.28,span:.61,r:.87,width:.075});
  arcPaint(g,mix(o.flame,o.core,.20),{a:3.03,span:.88,r:.87,width:.056});
  arcPaint(g,o.flame,{a:1.18,span:1.37,r:.91,width:.08});
  arcPaint(g,mix(o.body,o.flame,.52),{a:3.92,span:.94,r:.72,width:.095});
  paint(g,o.flame,[['moveTo',.15,-.71],['bezierCurveTo',.42,-.83,.46,-.56,.71,-.52],
    ['bezierCurveTo',.56,-.46,.36,-.68,.15,-.71]]);
  paint(g,mix(o.flame,o.core,.22),[['moveTo',.34,-.39],['bezierCurveTo',.65,-.44,.66,-.16,.94,-.08],
    ['bezierCurveTo',.75,-.10,.62,-.27,.45,-.29],['quadraticCurveTo',.40,-.32,.34,-.39]]);
  paint(g,o.flame,[['moveTo',.34,.44],['bezierCurveTo',.59,.27,.65,.37,.89,.25],
    ['bezierCurveTo',.76,.49,.57,.40,.34,.44]]);
  paint(g,o.flame,[['moveTo',.16,.74],['bezierCurveTo',.35,.68,.46,.59,.57,.65],
    ['bezierCurveTo',.44,.68,.35,.85,.16,.74]]);
  // Static fine bristle ends. These provide texture, not a field of animated noise.
  for(let i=0;i<11;i++)arcPaint(g,i%3===0?o.core:o.flame,{a:2.05+i*.20,span:.10+(i%3)*.04,
    r:.78+(i%4)*.024,width:.007+(i%3)*.003,alpha:.15+(i%3)*.07});
  g.restore();
}
function nucleus(g,o){
  // Asymmetric underpainting avoids stacked, uniform target-like rings.
  paint(g,mix(o.flame,o.core,.27),[['moveTo',-.80,-.16],['bezierCurveTo',-.77,-.43,-.53,-.60,-.32,-.54],
    ['bezierCurveTo',-.11,-.51,.04,-.28,.045,-.05],['bezierCurveTo',.03,.17,-.08,.26,-.20,.40],
    ['bezierCurveTo',-.39,.52,-.66,.39,-.73,.21],['bezierCurveTo',-.79,.09,-.80,-.01,-.80,-.16]]);
  paint(g,mix(o.flame,o.core,.66),[['moveTo',-.74,-.11],['bezierCurveTo',-.74,-.32,-.54,-.43,-.36,-.44],
    ['bezierCurveTo',-.18,-.45,-.10,-.28,-.01,-.14],['bezierCurveTo',.045,.02,-.07,.12,-.12,.25],
    ['bezierCurveTo',-.24,.40,-.44,.38,-.59,.26],['bezierCurveTo',-.70,.17,-.74,.05,-.74,-.11]]);
  fixedBlob(g,o.core,-.34,-.035,.345,.96,1.065,.3);
  paint(g,mix(o.flame,o.core,.35),[['moveTo',-.30,-.48],['bezierCurveTo',-.10,-.42,-.10,-.30,.045,-.27],
    ['bezierCurveTo',-.07,-.26,-.19,-.36,-.30,-.48]]);
  paint(g,mix(o.flame,o.core,.56),[['moveTo',-.77,-.36],['bezierCurveTo',-.78,-.14,-.77,.04,-.70,.20],
    ['bezierCurveTo',-.80,.04,-.84,-.20,-.77,-.36]]);
}
function localTongues(g,f){
  const {o}=f;
  for(const p of f.tongues){
    const root=p.i===1?.73:.53,x=root+p.shift,y=p.y+p.bend;
    const len=p.length,thick=p.i===1?.095:.073,side=p.i===0?-1:1;
    g.save();g.translate(x,y);
    paint(g,o.body,[['moveTo',-.12,-thick],['bezierCurveTo',len*.28,-thick*.9,len*.65,-thick*.4,len,-thick*.2],
      ['bezierCurveTo',len*.60,thick*.15,len*.25,thick*1.2,-.12,thick]],p.alpha*.92);
    paint(g,o.flame,[['moveTo',-.07,-thick*.42],['bezierCurveTo',len*.24,-thick*.30,len*.64,side*thick*.3,len*.94,-thick*.2],
      ['bezierCurveTo',len*.57,thick*.52,len*.2,thick*.33,-.07,-thick*.42]],p.alpha*.86);
    g.restore();
  }
}
function chips(g,f){
  for(const [i,p]of f.flecks.entries()){
    g.save();g.translate(p.x,p.y);const l=p.length;
    // A blue underpaint and a short cyan cap survive 48px and pale backgrounds.
    paint(g,f.o.shadow,[['moveTo',-l,0],['quadraticCurveTo',-l*.22,-l*.72,l,-l*.14],
      ['quadraticCurveTo',l*.63,l*.62,-l,0]],p.alpha*.94);
    paint(g,i%2?f.o.body:f.o.flame,[['moveTo',-l*.68,-l*.07],['quadraticCurveTo',-l*.1,-l*.49,l*.92,-l*.14],
      ['quadraticCurveTo',l*.42,l*.38,-l*.68,-l*.07]],p.alpha);g.restore();
  }
}
function glow(g,f){
  const radial=(x,y,r,c,k)=>{
    const q=g.createRadialGradient(x,y,0,x,y,r);
    q.addColorStop(0,rgba(c,k));q.addColorStop(.48,rgba(c,k*.40));q.addColorStop(.78,rgba(c,k*.07));q.addColorStop(1,rgba(c,0));
    g.fillStyle=q;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  };
  radial(-.12,0,1.48,f.o.body,.32*f.o.glow);
  radial(-.34,-.035,.68,f.o.flame,.11*f.o.glow);
  if(f.o.layers.flecks)for(const p of f.flecks)radial(p.x,p.y,.13,f.o.body,p.alpha*.13*f.o.glow);
}
export function draw(g,t,input={}){
  const f=sample(t,input),{o}=f,L=o.layers;
  g.save();g.scale(o.radius*(input.flip?-1:1),o.radius);
  if(input.buffer!=='light'){
    if(L.body)body(g,o);if(L.brush)brushwork(g,o);if(L.core)nucleus(g,o);
    if(L.tongues)localTongues(g,f);if(L.flecks)chips(g,f);
  }
  if(input.buffer!=='color'&&L.glow&&o.glow>0){g.globalCompositeOperation='lighter';glow(g,f);}
  g.restore();return f;
}
export function background(g,W,H,bg){
  if(bg==='transparent')return;
  const colors={dark:'#0b1523',gray:'#454545',light:'#e0e7eb',warm:'#695446',checker:'#263440'};
  g.fillStyle=colors[bg]??bg;g.fillRect(0,0,W,H);
  if(bg==='checker'){g.fillStyle='#1d2833';for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24)if((x/24+y/24)%2===0)g.fillRect(x,y,24,24);}
}
export function render(canvas,t,input={},view={}){
  const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  g.resetTransform();g.clearRect(0,0,W,H);background(g,W,H,view.background??'dark');
  const scale=view.scale??Math.min(W/960,H/640);
  g.save();g.translate(W*(view.anchorX??.405),H*.5);g.scale(scale,scale);draw(g,t,input);g.restore();
}
