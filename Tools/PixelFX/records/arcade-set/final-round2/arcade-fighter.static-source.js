// Original top-down arcade study; reference supplied by the author, redrawn as pixel geometry.
import { fit } from "../core/index.js";

export const meta = {
  name: "Arcade fighter · static image guide",
  desc: "A single static airframe drawing for exhaust placement. No animation, exhaust, firing or movement.",
  size: [80, 80], origin: [40, 39], static: true,
  options: {
    palette: ["#241e32", "#42394e", "#655c71", "#92909e", "#c4c0c9", "#efebde"],
    stripe: ["#82434b", "#ba6250", "#e29b75"],
    canopy: ["#25323e", "#40555d", "#739594", "#c4d7cf"],
  },
};

export function draw(p, _t, o) {
  const C = fit(o.palette, 6), A = fit(o.stripe, 3), G = fit(o.canopy, 4);
  // This source is rendered once to a PNG, never animated by the live effect.
  p.poly([[-5,-19],[-3,-23],[2,-23],[5,-19],[5,-5],[16,-5],[16,-8],[20,-8],[20,15],[16,15],[16,11],[5,11],[5,19],[3,22],[-3,22],[-5,19],[-5,11],[-16,11],[-16,15],[-20,15],[-20,-8],[-16,-8],[-16,-5],[-5,-5]], C[0]);
  // Wing slabs and inset panel seams.
  for (const s of [-1, 1]) {
    const x = s < 0 ? -16 : 5;
    p.rect(x,-4,11,14,C[2]); p.rect(x,-4,11,2,C[4]);
    p.rect(x,-2,11,10,C[3]); p.rect(x,8,11,2,C[1]);
    p.rect(s < 0 ? -14 : 10,-2,4,10,A[0]);
    p.rect(s < 0 ? -14 : 10,-2,3,9,A[1]);
    p.rect(s < 0 ? -14 : 10,-2,1,8,A[2]);
    p.rect(s < 0 ? -7 : 6,-3,1,12,C[5]);
    // Recessed ribs and a bevel give the broad wings a metal, not flat-card, read.
    p.rect(s < 0 ? -16 : 14,-2,2,9,C[4]);
    p.rect(s < 0 ? -10 : 8,-2,1,10,C[1]);
    p.rect(s < 0 ? -15 : 6,7,9,1,C[4]);
    p.px(s < 0 ? -15 : 15,-3,C[5]);
    // Long wingtip pods, dark muzzle sockets, ivory end caps.
    const px = s < 0 ? -20 : 17;
    p.rect(px,-9,3,25,C[1]); p.rect(px,-7,1,20,C[4]);
    p.rect(px+1,-5,1,17,C[3]); p.rect(px,-10,3,3,C[4]);
    p.rect(px,-10,2,2,C[5]); p.rect(px,12,3,3,C[2]);
  }
  // Central fuselage, stepped nose, orange bands.
  p.rect(-4,-19,8,38,C[2]); p.rect(-3,-22,6,4,C[4]);
  p.rect(-2,-23,4,3,C[5]); p.rect(-4,-18,8,4,C[4]);
  p.rect(-4,-14,8,2,A[0]); p.rect(-4,-14,7,1,A[2]);
  p.rect(-4,-18,1,4,C[5]); p.rect(3,-18,1,4,C[1]);
  p.rect(-3,-12,6,1,C[1]); p.rect(-1,-20,2,4,C[3]);
  p.rect(-5,-11,10,8,C[3]); p.rect(-5,-10,9,2,C[4]);
  p.rect(-5,-8,10,2,A[1]); p.rect(-5,-8,9,1,A[2]);
  p.rect(-5,-5,10,17,C[1]); p.rect(-5,-5,2,15,C[4]);
  p.rect(4,-4,1,14,C[2]);
  // A dark narrow canopy, lit at its upper-left edge.
  p.poly([[-2,-6],[1,-6],[3,-3],[3,7],[1,10],[-2,10],[-3,7],[-3,-3]],G[0]);
  p.rect(-2,-4,3,10,G[1]); p.rect(-2,-4,1,8,G[2]);
  p.rect(-1,-4,2,3,G[3]); p.rect(1,0,1,7,G[2]);
  p.rect(-1,8,2,2,C[2]); p.rect(-4,12,8,6,C[3]);
  p.rect(-5,0,1,7,C[5]); p.rect(3,0,1,8,C[0]);
  p.rect(-4,13,8,2,A[0]); p.rect(-4,13,7,1,A[2]);
  p.rect(-3,17,6,4,C[1]); p.rect(-3,17,5,1,C[4]);
  p.rect(-1,15,2,2,C[5]); p.rect(-2,18,1,2,C[2]);
  // Tiny tail nozzle, not an added weapon effect.
  p.rect(-2,20,4,2,C[0]); p.rect(-2,20,3,1,C[3]);
}
