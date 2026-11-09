// Pale single outline + one compact soft light layer. No arcs or new particles.
import {meta as baseMeta,draw as drawBase,sample as sampleBase,options as baseOptions} from './cyber-orb-v3-1.js';
export {positionAt,hitMeta,sampleImpact,drawImpact} from './cyber-orb-v3-1.js';
export const meta={...baseMeta,name:'赛博能量弹 · 浅色描边 / 小光晕',version:'3.2.2',
  options:{...baseMeta.options,outline:'#9edfff',glow:.55,glowRadius:1.35}};
export const options=input=>baseOptions({...meta.options,...input});
export const sample=(t,input={})=>sampleBase(t,options(input));
const rgba=(hex,a)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${Math.max(0,Math.min(1,a))})`;
export function draw(g,t,input={}){
  const o=options(input),f=sampleBase(t,o),r=o.radius*f.pulse;
  if(o.layers.core!==false&&o.layers.glow!==false&&o.glow>0){
    g.save();g.globalCompositeOperation='lighter';
    const q=g.createRadialGradient(0,0,r*.72,0,0,r*o.glowRadius);
    q.addColorStop(0,rgba(o.outline,.38*o.glow));q.addColorStop(.38,rgba(o.outline,.3*o.glow));
    q.addColorStop(.72,rgba(o.outline,.04*o.glow));q.addColorStop(1,rgba(o.outline,0));
    g.beginPath();g.arc(0,0,r*o.glowRadius,0,Math.PI*2);g.fillStyle=q;g.fill();g.restore();
  }
  return drawBase(g,t,o);
}
