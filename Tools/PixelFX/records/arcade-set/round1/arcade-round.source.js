import { fit, TAU } from "../../core/index.js";

export const meta = {
  name: "Arcade round · single",
  desc: "Exactly one compact upward-facing round with an ivory-pink cap, warm orange body and short violet tail. Not the five-round volley in the reference.",
  tags: ["projectile", "bullet", "arcade", "pixel", "single", "loop"],
  size: [24,32], origin: [12,14], duration: 1, loop: true, fps: 24, bg: "dark",
  options: {
    palette: ["#4a2356", "#79416c", "#b56975", "#df937e", "#f6b99a", "#fff0cb"],
    seed: 23,
  },
};

export function draw(p,t,o) {
  const C = fit(o.palette,6), fr = Math.floor(t*12+1e-6), k = (fr+o.seed)%4;
  p.rect(-2,-5,4,10,C[0]);
  p.rect(-2,-4,4,6,C[2]); p.rect(-1,-5,3,2,C[4]);
  p.rect(-1,-5,2,1,C[5]); p.rect(-2,-3,3,3,C[4]);
  p.rect(-1,-3,2,2,C[5]); p.rect(-2,0,3,2,C[3]);
  p.rect(-1,2,2,2,C[1]); p.px(-1,4+(k===1 ? 1 : 0),C[1]);
  p.px(0,4+(k===3 ? 1 : 0),C[2]);
}
