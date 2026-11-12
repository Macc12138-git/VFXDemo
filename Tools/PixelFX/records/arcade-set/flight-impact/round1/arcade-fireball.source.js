import { fit, mix } from "../../core/index.js";

export const meta = {
  name: "Arcade fireball · six heat poses",
  desc: "One round fire head with a quiet conical violet tail. Six stepped core-heat poses; the shell, tail and silhouette stay fixed.",
  tags: ["fire", "projectile", "arcade", "pixel", "single", "loop"],
  size: [36,48], origin: [18,19], duration: 0.24, loop: true, fps: 25, bg: "dark",
  options: {
    palette: ["#48204f", "#72345f", "#a44f42", "#c77550", "#d69c59", "#c8b65d", "#e5dd83", "#fff9c5"],
    pulse: 1, seed: 17,
  },
};

// Original geometry, not pixels extracted from the supplied game capture.
export function draw(p,t,o) {
  const C = fit(o.palette,8);
  const pose = Math.floor((((t%meta.duration)+meta.duration)%meta.duration)*25+1e-6)%6;
  const heat = 1-o.pulse*(1-[0.95,0.56,0.12,0.34,0.78,1][pose]);
  // Quiet cone, not three separate streamers.
  p.poly([[-7,0],[7,0],[6,6],[4,11],[1,18],[0,19],[-2,16],[-4,10],[-6,5]],C[0]);
  p.poly([[-6,0],[6,0],[4,7],[1,14],[0,16],[-2,12],[-4,6]],C[1]);
  p.poly([[-5,0],[5,0],[4,5],[2,10],[0,13],[-1,10],[-3,6]],C[2]);
  p.poly([[-4,0],[3,0],[3,4],[1,8],[0,9],[-2,5]],C[3]);
  p.shade(-8,-12,8,5,(x,y)=>{
    const r=Math.hypot(x,y+4);
    if(r>7.8)return;
    if(r>6.7)return y<-6?C[4]:x>4||y>0?C[2]:C[3];
    return y>0?C[2]:x>4||y>-1?C[3]:C[4];
  });
  const warm=mix(C[4],C[6],heat*.74),hot=mix(C[5],C[7],heat);
  p.poly([[-3,-10],[1,-10],[4,-7],[4,-4],[2,-1],[-1,0],[-4,-3],[-5,-6]],warm);
  p.poly([[-2,-9],[1,-9],[3,-7],[2,-4],[0,-2],[-2,-3],[-3,-5]],hot);
  p.rect(-2,-7,2,3,mix(C[5],C[7],Math.min(1,heat*1.25)));
  p.px(1,-8,hot);
  p.line(-5,-6,-5,-3,C[5]);
  p.px(-4,-2,C[4]);
}
