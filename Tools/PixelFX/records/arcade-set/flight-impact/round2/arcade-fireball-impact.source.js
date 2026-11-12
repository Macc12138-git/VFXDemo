import { fit } from "../../core/index.js";

export const meta = {
  name: "Arcade fireball · eight impact poses",
  desc: "A single cream impact flash swells into an orange rolled cloud, splits into cooling fragments and clears. Eight geometric poses; no beam, ring chains or enemy sprite.",
  tags: ["explosion", "fire", "arcade", "pixel", "single", "one-shot"],
  size: [60,60], origin: [30,30], duration: 0.32, loop: false, fps: 25, bg: "dark",
  options: {
    palette: ["#542b42","#874333","#ac563d","#cd7752","#df9d68","#e7c58c","#fff0bf","#fffde5"],
    seed: 17,
  },
};

const LOBES=[[-.40,-.22,.64],[.08,-.43,.65],[.50,-.03,.49],[.25,.39,.60],[-.31,.41,.53],[-.56,.07,.42],[.02,.02,.63]];
const RADII=[5,10,16,18,18,17,15,12];

export function draw(p,t,o) {
  if(t<0||t>=meta.duration)return;
  const f=Math.min(7,Math.floor(t*25+1e-6)),C=fit(o.palette,8),R=RADII[f];
  const spread=[.7,.8,.9,1,1.04,1.09,1.12,1.2][f];
  const shrink=[1,1,1,1,1,.86,.56,.23][f];
  const shift=((o.seed|0)%5-2)*.08;
  p.shade(-26,-26,26,26,(x,y)=>{
    let d=Infinity,nearest=0,localX=0,localY=0,localR=R;
    if(f<3)d=Math.hypot(x,y)-R;
    else for(let i=0;i<LOBES.length;i++){
      if(f>=6&&i===6||f===6&&i===2||f===7&&![0,3,5].includes(i))continue;
      const [cx,cy,r]=LOBES[i],dx=x-(cx+shift)*R*spread,dy=y-cy*R*spread;
      const q=Math.hypot(dx,dy)-r*R*shrink;
      if(q<d){d=q;nearest=i;localX=dx;localY=dy;localR=r*R*shrink;}
    }
    if(d>0)return;
    if(f<3)return d>-.9?C[4]:d>-1.9?C[5]:C[7];
    if(d>-.8)return C[1];
    if(d>-1.7)return C[3];
    const arc=Math.hypot(localX+localR*.13,localY+localR*.22);
    if(f===3)return d<-2.3?C[7]:C[5];
    const angle=Math.atan2(localY,localX);
    const curl=Math.abs(arc-localR*.5)<.9&&angle<2.2;
    if(f===4)return arc<localR*.49?C[6]:localY<-1?C[4]:C[3];
    if(f===5)return curl?C[6]:arc<localR*.23?C[4]:localY<-1?C[3]:C[2];
    if(f===6)return curl&&nearest%2===0?C[5]:localY<-.5?C[3]:C[2];
    return localY<0?C[3]:C[1];
  });
}
