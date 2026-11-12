import { fit } from "../../core/index.js";

export const meta = {
  name: "Arcade fireball · copper body / violet wrap",
  desc: "One plump copper fireball, layered violet flame wrapping its lower body, and six changing yellow-green heat shapes. A quiet blunt tail, not a circle attached to a needle.",
  tags: ["fire", "projectile", "arcade", "pixel", "single", "loop"],
  size: [36,48], origin: [18,19], duration: .12, loop: true, fps: 50, bg: "dark",
  options: {
    palette: ["#75383c","#a84e3b","#bb624b","#ce7d65","#df987a"],
    tailPalette: ["#231331","#5d0e5e","#671b70","#79358a"],
    heatPalette: ["#be9149","#cfaa50","#bdca5d","#e5e598","#fff6c6"],
    pulse: 1, seed: 17,
  },
};

// Original span geometry and heat contours; no capture pixels or animation textures.
// Copper silhouette, top (-12) to bottom (+12), right edge exclusive.
const BODY = [
  [-2,2],[-4,4],[-6,6],[-7,7],[-8,8],[-9,8],[-9,9],[-9,9],
  [-9,9],[-9,9],[-9,9],[-9,9],[-9,9],[-9,9],[-8,8],[-8,8],
  [-8,7],[-7,7],[-7,6],[-6,6],[-6,5],[-5,4],[-4,4],[-3,3],[-2,2],
];
const TAIL = [[-9,9],[-9,9],[-9,9],[-9,9],[-9,9],[-9,9],[-8,8],[-8,8],[-8,8],[-7,8],[-7,7],[-7,7],[-6,7],[-6,6],[-6,6],[-5,5],[-5,5],[-4,4],[-4,3],[-3,3],[-2,2]];

// Six different heat boundaries: swelling, cooling, hollowing and rekindling.
const HEAT = [
  [[-3,-10],[1,-10],[1,-9],[3,-9],[3,-7],[4,-7],[4,-5],[2,-5],[2,-2],[-1,-2],[-1,-3],[-4,-3],[-4,-6],[-5,-6],[-5,-8],[-3,-8]],
  [[-2,-10],[1,-10],[1,-9],[2,-9],[2,-5],[1,-5],[1,-2],[-2,-2],[-2,-3],[-3,-3],[-3,-8],[-2,-8]],
  [[-2,-10],[1,-10],[1,-8],[2,-8],[2,-3],[0,-3],[0,-2],[-3,-2],[-3,-5],[-4,-5],[-4,-8],[-2,-8]],
  [[-2,-10],[1,-10],[1,-9],[2,-9],[2,-6],[3,-6],[3,-4],[1,-4],[1,-2],[-1,-2],[-1,-3],[-3,-3],[-3,-7],[-2,-7]],
  [[-3,-11],[0,-11],[0,-10],[2,-10],[2,-8],[3,-8],[3,-5],[2,-5],[2,-2],[0,-2],[0,0],[-2,0],[-2,-3],[-4,-3],[-4,-6],[-5,-6],[-5,-8],[-3,-8]],
  [[-3,-11],[1,-11],[1,-10],[3,-10],[3,-8],[4,-8],[4,-5],[2,-5],[2,-3],[0,-3],[0,-1],[-2,-1],[-2,-3],[-4,-3],[-4,-8],[-3,-8]],
];
const CUTS = [[1,-5,.4,.7],[.5,-7,.35,.8],[.5,-6,.35,1.1],[-1,-8,.35,.7],[1,-6,.35,1.0],[-2,-5,.35,.7]];
function inside(poly,x,y){
  let yes=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,ay]=poly[i],[bx,by]=poly[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)yes=!yes;
  }
  return yes;
}

export function draw(p,t,o){
  const S=fit(o.palette,5),T=fit(o.tailPalette,4),H=fit(o.heatPalette,5);
  const tick=Math.floor((((t%meta.duration)+meta.duration)%meta.duration)*meta.fps+1e-6)%6;
  const pose=o.pulse>0?tick:2;
  // A layered cupping flame underneath the same body, with only a one-pixel curl breathing.
  p.shade(-10,-1,10,22,(x,y)=>{
    const row=Math.floor(y);
    if(row<0||row>=TAIL.length)return;
    const [a,b]=TAIL[row];
    if(x<a||x>=b)return;
    if(x-a<1||b-x<1)return T[0];
    const bend=(tick===3||tick===4)&&row>12&&x<-1?.6:0;
    const lip=12.8-.105*(x+.4)**2+bend;
    return y<lip?T[2]:y<lip+3?T[3]:y<18?T[2]:T[1];
  });
  // One continuous, elongated front volume. No horizontal circle/cone joint.
  p.shade(-10,-13,10,13,(x,y)=>{
    const row=Math.floor(y)+12;
    if(row<0||row>=BODY.length)return;
    const [a,b]=BODY[row];
    if(x<a||x>=b)return;
    const side=Math.min(x-a,b-x);
    if(side<.8)return y<-8?S[1]:S[0];
    if(y<-10)return S[2];
    if(side<1.7||y>9)return S[1];
    if(x<-5&&y>1&&y<4||x>4&&y>4&&y<7)return S[1];
    const front=(Math.abs(x+.5)/7.6)**4+((y+2)/10.7)**2;
    if(front>1||x>6)return S[2];
    if(x<-5&&y>-9&&y<-4)return S[4];
    return S[3];
  });
  const bright=[.92,.15,.04,.42,.88,1][pose],poly=HEAT[pose];
  const [cx,cy,rx,ry]=CUTS[pose];
  p.shade(-7,-12,6,2,(x,y)=>{
    const row=Math.floor(y)+12,span=BODY[row];
    if(!span||y<-11||x<span[0]+1||x>span[1]-1)return;
    x=(x+.5)/(bright>.75?1.4:1.6)-.5+((o.seed|0)%3-2)*.16;y=(y+6.5)/1.18-6.5;
    if(!inside(poly,x,y))return;
    // Internal copper/ochre slots are real gaps in the hot shape, not noise flecks.
    if(Math.abs(x-cx)<rx&&Math.abs(y-cy)<ry)return H[1];
    const rim=!inside(poly,x-1,y)||!inside(poly,x+1,y)||!inside(poly,x,y-1)||!inside(poly,x,y+1);
    if(rim)return bright>.75?H[1]:x<-1.7?H[1]:H[2];
    const q=Math.hypot((x+.7)/2.4,(y+7.3)/3.0);
    if(bright>.75&&q<.58)return H[4];
    if(bright>.55&&q<1.1)return H[3];
    return H[2];
  });
}
