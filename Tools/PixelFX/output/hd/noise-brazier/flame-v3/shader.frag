precision highp float;
uniform sampler2D u_noise;
uniform vec2 u_resolution;
uniform float u_time,u_flow,u_scale,u_stretch,u_distortion,u_dissolve,u_softness,u_core,u_steps;
uniform int u_layer;
float n(vec2 p){return clamp((texture2D(u_noise,p).r-.13)/.62,0.,1.);}
float plume(float x,float h,float c,float height,float w,float id,float phase){
  float hi=height*(.94+.06*sin(phase*(2.+mod(id,2.))+id*2.3));
  float center=c+sin(h*6.-phase*2.+id*1.9)*h*.18;
  return 1.-pow(abs(x-center)/w,1.35)-pow(max(h,0.)/hi,1.6);
}
vec3 ramp(float heat){
  float q=mix(heat,floor(heat*5.+.5)/5.,u_steps)*5.;
  vec3 a=vec3(155.,28.,9.),b=vec3(232.,55.,6.),c=vec3(255.,110.,12.);
  vec3 d=vec3(255.,178.,38.),e=vec3(255.,224.,113.),f=vec3(255.,249.,213.);
  if(q<1.)return mix(a,b,q)/255.;if(q<2.)return mix(b,c,q-1.)/255.;
  if(q<3.)return mix(c,d,q-2.)/255.;if(q<4.)return mix(d,e,q-3.)/255.;return mix(e,f,q-4.)/255.;
}
void main(){
  vec2 pixel=vec2(gl_FragCoord.x/u_resolution.x,1.-gl_FragCoord.y/u_resolution.y)*vec2(1024.,1280.);
  float h=(855.-pixel.y)/460.,x=(pixel.x-512.)/147.,t=u_time*u_flow,phase=t*6.28318530718/8.;
  if(h<-.012||h>1.32||abs(x)>1.65){gl_FragColor=vec4(0.);return;}
  vec2 uv=vec2(x*u_scale*.43+.31,h*u_scale/u_stretch-t*.5);
  float wx=n(uv*vec2(.64,.8)+vec2(.12,t*.15))-.48;
  float wy=n(uv*vec2(.71,.7)+vec2(.67,-t*.15))-.48;
  float xd=x+wx*u_distortion*(.10+.78*clamp(h,0.,1.))+sin(h*7.-phase*2.)*.055*h;
  float n0=n(uv+vec2(wx*.13,wy*.08)),n1=n(uv*vec2(1.91,1.53)+vec2(.42,t*.265)),n2=n(uv*vec2(4.17,3.31)+vec2(.13,t*.155));
  float noise=n0*.64+n1*.26+n2*.10;
  float body=plume(xd,h,-.73,.49,.28,0.,phase);
  body=max(body,plume(xd,h,-.34,.80,.34,1.,phase));body=max(body,plume(xd,h,.02,1.06,.46,2.,phase));
  body=max(body,plume(xd,h,.40,.76,.34,3.,phase));body=max(body,plume(xd,h,.76,.44,.27,4.,phase));
  body=max(body,.88-pow(abs(xd)/1.08,2.)*.68-max(h,0.)*2.6);
  if(u_layer==1){float value=n(vec2((pixel.x-512.)/294.*u_scale+.5,h*u_scale/u_stretch-t*.5));gl_FragColor=vec4(vec3(value),1.);return;}
  if(u_layer==2){gl_FragColor=vec4(vec3(clamp(body,0.,1.)),1.);return;}
  float erosion=u_dissolve*.95+smoothstep(.65,1.,u_dissolve)*.8;
  float fuel=body+(noise-.43)*1.12-erosion;
  float mouth=mix(1.-smoothstep(.96,1.035,abs(x)),1.,smoothstep(.05,.28,h));
  float alpha=smoothstep(0.,u_softness,fuel)*(1.-smoothstep(1.12,1.30,h))*smoothstep(-.012,.012,h)*mouth;
  float heat=clamp(fuel*.82+u_core*.35*(1.-clamp(h,0.,1.))+(n1-.5)*.12,0.,1.);
  gl_FragColor=vec4(ramp(heat),alpha);
}
