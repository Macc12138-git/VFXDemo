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

const LOBES=[[-.45,-.28,.56],[.13,-.47,.59],[.51,-.09,.54],[.34,.43,.58],[-.29,.46,.56],[-.55,.09,.48],[0,0,.71]];
const RADII=[5,10,16,18,18,17,15,12];

export function draw(p,t,o) {
  if(t<0||t>=meta.duration)return;
  const f=Math.min(7,Math.floor(t*25+1e-6)),C=fit(o.palette,8),R=RADII[f];
  const spread=[.7,.8,.9,1,1.03,1.08,1.24,1.38][f];
  const shrink=[1,1,1,1,1,.82,.5,.24][f];
  const shift=((o.seed|0)%5-2)*.08;
  p.shade(-26,-26,26,26,(x,y)=>{
    let d=Infinity,nearest=0,localX=0,localY=0;
    if(f<3)d=Math.hypot(x,y)-R;
    else for(let i=0;i<LOBES.length;i++){
      if(f>=6&&i===6||f===7&&i%2===1)continue;
      const [cx,cy,r]=LOBES[i],dx=x-(cx+shift)*R*spread,dy=y-cy*R*spread;
      const q=Math.hypot(dx,dy)-r*R*shrink;
      if(q<d){d=q;nearest=i;localX=dx;localY=dy;}
    }
    if(d>0)return;
    if(f<3)return d>-.9?C[4]:d>-1.9?C[5]:C[7];
    if(d>-.8)return C[1];
    if(d>-1.7)return C[3];
    const arc=Math.hypot(localX+1.5,localY+1.5);
    if(f===3)return d<-3?C[7]:C[5];
    if(f===4)return d<-4?C[6]:d<-2.2?C[4]:C[3];
    if(f===5)return arc<2.3?C[6]:localY<-1.5?C[4]:C[2];
    return d<-1.8&&nearest%2===0?C[4]:C[2];
  });
}
