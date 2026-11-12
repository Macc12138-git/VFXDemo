import { fit, mix, TAU } from "../../core/index.js";

export const meta = {
  name: "Arcade fireball · bright-dark pulse",
  desc: "One stationary pixel fireball cycles between a yellow-orange bright phase and a red-violet dim phase. Its silhouette stays fixed; no overlapping shots or explosion.",
  tags: ["fire", "projectile", "arcade", "pixel", "single", "loop"],
  size: [40,56], origin: [20,26], duration: 1, loop: true, fps: 24, bg: "dark",
  options: {
    palette: ["#35163e", "#642356", "#8b2f5b", "#b94d50", "#dc784e", "#efa45c", "#f3d36d", "#fff2a0"],
    pulse: 1, seed: 17,
  },
};

function lobe(p, x, y, r, h, phase, C, power) {
  r *= 1 + Math.sin(phase*2)*0.035*power;
  const sway = Math.sin(phase) * 0.55 * power;
  // Three short uneven streamers, connected to the body rather than a long comet wake.
  for (let i=0;i<3;i++) {
    const tx=x+(i-1)*r*0.53;
    const end=y+h+Math.round((1+Math.sin(phase+i*2))*power);
    p.poly([[tx-2,y+h*0.5],[tx+2,y+h*0.5],[tx+1+sway,end-1],[tx+sway,end],[tx-1+sway,end-1]],C[i===1?1:0]);
    p.line(tx-0.5,y+h*0.55,tx+sway,end-2,C[2]);
  }
  p.shade(x-r-2,y-h-1,x+r+2,y+h+7,(px,py) => {
    const yy = py-y, q = yy / h;
    const tail = Math.max(0,q);
    const w = r * Math.sqrt(Math.max(0,1-((q+0.12)/1.22)**2));
    const cx = x + sway * tail + Math.sin(q*5-phase)*0.45*tail*power;
    const d = Math.abs(px-cx);
    if (d > w || q < -1.08 || q > 1.08) return;
    const edge = w-d;
    if (edge < 0.9) return C[q < -0.5 ? 3 : 1];
    const cool = q + Math.sin((px-x)*0.65-phase)*0.075*power;
    if (cool > 0.7) return C[1];
    const heat = 1 - Math.hypot((px-x+1.2+Math.sin(phase)*0.3*power)/(r*0.93),(yy+h*0.25)/(h*0.85));
    const rolled = Math.sin(q*6 + (px-x)*0.35 - phase)*0.08*power;
    const k = heat + rolled;
    return C[k > 0.8 ? 7 : k > 0.59 ? 6 : k > 0.28 ? 5 : cool < 0.18 && edge > 1.4 ? 4 : cool < 0.48 ? 3 : 2];
  });
}

export function draw(p,t,o) {
  const base = fit(o.palette,8), tick = Math.floor(t*12+1e-6);
  const level = (1 + Math.cos(tick/12*TAU*3))/2;
  const cool = (1-level)*0.65*o.pulse;
  const C = base.map((c,i)=>mix(c,base[Math.max(0,i-3)],cool));
  // Brightness is the animation: one fixed silhouette, no wobble or scaling.
  lobe(p,0,-2,7.3,11.2,o.seed*0.31,C,0);
}
