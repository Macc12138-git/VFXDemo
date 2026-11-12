import { fit } from "../../core/index.js";

export const meta = {
  name: "Arcade engine exhaust · flame only",
  desc: "An independent tiny downward jet: an ivory hot nozzle, a pale-yellow taper and a short orange edge. The airframe is not part of the effect.",
  tags: ["scifi", "engine", "exhaust", "pixel", "loop"],
  size:[32,32],origin:[16,8],duration:1,loop:true,fps:24,bg:"dark",
  options:{palette:["#a65b56","#e8b75f","#fff2a5","#ffffe4"],thrust:1,seed:11},
};

// Anchor is the engine mouth; local +y is the short rear exhaust. No body drawing.
export function draw(p,t,o) {
  if(o.thrust<=0)return;
  const C=fit(o.palette,4),fr=Math.floor(t*12+1e-6),beat=(fr+o.seed)%4;
  const len=(4+[0,1,3,1][beat])*o.thrust,lean=[0,0,1,-1][beat];
  p.poly([[-2,0],[2,0],[2,2],[1+lean,len-1],[lean,len],[-1,len-1],[-2,2]],C[0]);
  p.poly([[-1,0],[1,0],[1,3],[lean,len-1],[-1,3]],C[1]);
  p.rect(-1,0,2,3,C[2]);p.rect(-1,0,2,beat===1?2:1,C[3]);
  p.px(0,3+(beat===2?1:0),C[2]);
  p.glow(0,2,5,C[1],0.06+beat*0.01);
}
