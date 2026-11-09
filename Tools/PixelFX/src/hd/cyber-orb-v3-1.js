// V3.1 adds one static body outline only. V3 flight/hit remain the baseline.
import {meta as baseMeta,draw as drawBase,sample as sampleBase,options as baseOptions} from './cyber-orb-v3.js';
export {positionAt,hitMeta,sampleImpact,drawImpact} from './cyber-orb-v3.js';
export const meta={...baseMeta,name:'赛博能量弹 · 单圈描边',version:'3.1.3',
  options:{...baseMeta.options,outlineWidth:.14,outline:'#258bff'}};
export const options=input=>baseOptions({...meta.options,...input});
export const sample=(t,input={})=>sampleBase(t,options(input));
export function draw(g,t,input={}){
  const o=options(input),f=drawBase(g,t,o);
  if(o.layers.core===false||o.layers.outline===false||o.outlineWidth<=0)return f;
  const r=o.radius*f.pulse;
  g.save();g.globalCompositeOperation='source-over';
  g.beginPath();g.arc(0,0,r*.97,0,Math.PI*2);
  g.lineWidth=r*o.outlineWidth;g.strokeStyle=o.outline;g.stroke();
  g.restore();return f;
}
