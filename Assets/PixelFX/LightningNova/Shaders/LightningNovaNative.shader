Shader "PixelFX/Lightning Nova Native URP"
{
 Properties
 {
  _Core("White-hot core",Color)=(.961,1,1,1)
  _Body("Electric cyan",Color)=(.451,.918,1,1)
  _Edge("Cool blue edge",Color)=(.220,.482,.980,1)
  _Spark("Residual charge",Color)=(.737,.969,1,1)
  _Radius("Range radius (source units)",Range(1.4,3))=2.5
  _Intensity("Strike intensity",Range(.4,1.5))=1
  _Glow("Additive intensity",Range(0,1.5))=.65
  _Seed("Main path seed (topology authored for 69)",Float)=69
  [ToggleUI] _Flat("Fixed 2D projection",Float)=0
  [ToggleUI] _Additive("Light-only geometry",Float)=0
  [Enum(One,1,OneMinusSrcAlpha,10)] _DstBlend("Destination blend",Float)=10
 }
 SubShader
 {
  Tags{"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
  Cull Off ZWrite Off ZTest LEqual
  Blend One [_DstBlend], One OneMinusSrcAlpha
  Pass
  {
   Name "NativeAgeDriven"
   Tags{"LightMode"="SRPDefaultUnlit"}
   HLSLPROGRAM
   #pragma target 4.5
   #pragma vertex Vert
   #pragma fragment Frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
   CBUFFER_START(UnityPerMaterial)
    float4 _Core,_Body,_Edge,_Spark;
    float _Radius,_Intensity,_Glow,_Seed,_Flat,_Additive,_DstBlend;
   CBUFFER_END
   struct Attributes{float4 vertex:POSITION;float3 normal:NORMAL;float4 tangent:TANGENT;float4 color:COLOR;float4 uv0:TEXCOORD0;float4 uv1:TEXCOORD1;float4 clock:TEXCOORD2;float3 size:TEXCOORD3;};
   struct Varyings{float4 positionCS:SV_POSITION;half4 color:COLOR;};
   float S(float a,float b,float t){float q=saturate((t-a)/(b-a));return q*q*(3-2*q);}
   float E(float u){return 1-pow(1-saturate(u),3);}
   uint H(uint h,int x){h=(h^asuint(x))*0x85ebca6bu;h^=h>>13;h*=0xc2b2ae35u;h^=h>>16;return h;}
   float R(int a,int b){return H(H(0x9e3779b9u,a),b)/4294967296.0;}
   float R(int a,int b,int c){return H(H(H(0x9e3779b9u,a),b),c)/4294967296.0;}
   float R(int a,int b,int c,int d){return H(H(H(H(0x9e3779b9u,a),b),c),d)/4294967296.0;}
   float3 P(float r,float a,float h){return float3(r*cos(a),h,r*sin(a));}
   float3 Safe(float3 p){return p*rsqrt(max(dot(p,p),1e-10));}
   float4 Current(float age,float u,int seed){int cell=(int)floor(u*12);float a=age-.024*u-R(seed,cell,80)*.008,burn=.11+R(seed,cell,81)*.085;
    float live=S(0,.006,a)*(1-S(burn,burn+.018,a)),flick=.58+.42*R(seed,cell,(int)floor(max(0,a)*55),82),surge=exp(-pow((a-(.035+u*.045))/.011,2));
    float at=burn+.024+R(seed,cell,83)*.035,re=S(at,at+.003,a)*(1-S(at+.009,at+.018,a))*.75;
    return float4(max(live*flick,re),max(live*surge,re),.55+.45*max(live,surge),a-burn);}
   void RingParams(int kind,int id,float age,out float radius,out float angle,out float span,out float width,out float height,out float2 tilt,out float bow,out float fall,out float spiral,out int seed,out float opacity){
    seed=(int)_Seed+(kind==1?23:kind==2?80:0)+id;float u=saturate(age/.16);radius=_Radius*(.11+.89*E(u))*(kind==1?.73:1)*( .97+R(seed,2)*.055);
    angle=id*TWO_PI/(kind==0?3:2)+.1+R(seed,3)*.16+(kind==1?.47:0)+age*(kind==1?-2.8:3.2);
    span=(kind==1?(id==0?1.8:2.3):(id==0?1.35:id==1?1.8:1.6))+R(seed,4)*.2;
    width=(.048+R(seed,1)*.018)*(1-.25*u);height=(kind==1?.8:.46)*S(0,.08,age);tilt=kind==1?float2(-.16,.34):float2(.1,-.15);bow=kind==1?.18:.12;fall=0;spiral=0;
    opacity=(1-S(.13,.36,age))*S(0,.016,age)*(kind==1?.9:1);
    if(kind==2){float q=saturate(age/.235);radius=_Radius*(.24+.5*E(q));angle=id==1?1+q*.7:-2.1+q*2;span=id==1?2.8:3.4;width=.048*(1-q*.6);height=.14;tilt=float2(.04,-.02);bow=.12;fall=(id==1?.8:1.35)*(1-q*.5);spiral=.68;opacity=(1-S(.35,1,q))*.9;}
   }
   float3 RingP(int kind,int id,float u,float n,float age){
    float r,a,span,w,h,bow,fall,spiral,opacity;float2 tilt;int seed;RingParams(kind,id,age,r,a,span,w,h,tilt,bow,fall,spiral,seed,opacity);
    int i=(int)round(u*n);a+=span*u;r=r*(1-spiral+spiral*u+.02*sin(a*3+seed))+(R(seed,i,72)-.5)*.045+(i%8==4?.09+R(seed,i,75)*.06:0);
    float3 p=P(r,a,0);p.y=max(.055,h+dot(tilt,p.xz)+bow*sin(PI*u)+fall*(1-u)+.1*sin(u*TWO_PI)+(R(seed,i,73)-.5)*.035);return p;
   }
   float3 BoltP(float node,int epoch){float q=node/12,s=sin(PI*q);return float3(.26*(1-q)+(R((int)_Seed,epoch,(int)node,1)-.5)*.62*s,4.5*(1-q)+.18*q,(R((int)_Seed,epoch,(int)node,2)-.5)*.42*s);}
   float3 Tube(float3 a,float3 b,float3 p,float angle,float width){float3 t=Safe(b-a),x=Safe(cross(t,abs(t.y)>.9?float3(0,0,1):float3(0,1,0))),y=Safe(cross(t,x));return p+(cos(angle)*x+sin(angle)*y)*width;}
   float3 CrownP(int i,int p,float age){int seed=(int)_Seed;float a=i*TWO_PI/11+R(seed,i,9)*.28,h=(.5+R(seed,i,10)*1.15)*(.6+.4*E(age/.055)),reach=.13+R(seed,i,11)*.42,release=S(.025,.15,age);
    float3 root=P(.06+release*.4,a,.14),elbow=P(reach*(.85+release),a,.3+h*.22),notch=P(reach*(.35+release),a+.05,.28+h*.42),tip=P(reach*(1.4+release*2),a,.24+h*(1-release*.5)),side=P((.085+R(seed,i,12)*.08)*(1-release),a+PI/2,0);
    return p==0?root:p==1?elbow+side:p==2?notch:p==3?tip:p==4?notch-side*.6:elbow-side;
   }
   float3 JetP(int i,int p,float age){int seed=(int)_Seed;float q=saturate((age-.006)/.104),a=i*TWO_PI/9+R(seed,i,106)*.18,r=_Radius*(.08+.77*E(q)),len=(.35+R(seed,i,107)*.55)*(1-q),h=.1+sin(q*PI)*(.12+R(seed,i,108)*.4);
    return p==0?P(max(.05,r-len),a,h*.65):p==1?P(r-len*.45,a+.035,h):p==2?P(r-len*.52,a-.02,h*.8):P(r,a,h*.6);}
   float3 ArcP(int id,int p,float age){float h=.2+R((int)_Seed,id,34)*.4;if(id%3==1)return float3(p*.14,(p%2==1?.12:.02),p%2==1?.07:-.05);
    if(id%3==2)return float3(p*.15,(.1+sin(p*PI/4)*h*.45),p%2==1?.09:-.04);
    return float3(p*.08+(p%2==1?-.1:.1),h*p/4,p%2==1?.08:-.05);}
   Varyings Vert(Attributes v){
    Varyings o;int kind=(int)round(v.uv0.z),id=(int)round(v.uv0.w),seed=(int)_Seed;float u=v.uv0.x,q=v.uv0.y,age=v.clock.x/max(v.clock.y,.001),a=1;float3 p=0;float4 c=_Body;float light=_Additive;
    if(kind<=2||kind==14)age-=v.uv1.w;
    if(kind<=2){float radius,angle,span,w,h,bow,fall,spiral,opacity;float2 tilt;int s;RingParams(kind,id,age,radius,angle,span,w,h,tilt,bow,fall,spiral,s,opacity);
     float n=v.uv1.x;float3 base=RingP(kind,id,u,n,age),t=Safe(RingP(kind,id,min(1,u+1/n),n,age)-RingP(kind,id,max(0,u-1/n),n,age)),side=Safe(cross(t,float3(0,1,0))),up=Safe(cross(side,t));
     float4 f=Current(age-id*(kind==2?.009:.004),v.uv1.y,s);w*=pow(max(0,sin(PI*u)),.65)*(.65+.45*R(s,(int)round(u*n),74)+.45*exp(-pow((u-.72)/.09,2)))*f.z;
     p=base+(q==0?-side*.5:q==1?up*.35:q==2?side*.5:-up*.35)*w*(light>0?3:1);c=q==1?(f.y>.45?_Core:_Body):q==2?_Body:_Edge;a=opacity*f.x*(light>0?(.035+.09*f.y)*_Glow:1);
    }
    else if(kind==14){int parent=(int)v.uv1.x;float n=v.uv1.y;float r,angle,span,w,h,bow,fall,spiral,opacity;float2 tilt;int s;RingParams(parent,id,age,r,angle,span,w,h,tilt,bow,fall,spiral,s,opacity);
     float3 root=RingP(parent,id,.67,n,age),radial=Safe(float3(root.x,0,root.z)),t=Safe(RingP(parent,id,.7,n,age)-RingP(parent,id,.63,n,age));
     float3 end=root+radial*.3+float3(0,.2,0);p=u==0?root:u==1?root+radial*.15+float3(0,.075,0):u==2?root+t*.1+float3(0,.12,0):end;
     p=Tube(root,end,p,q*TWO_PI,.006);a=opacity*Current(age,.67,s).x*((int)floor(age*35)%3==1?.15:1);c=_Body;if(light>0)a*=.04*_Glow;
    }
    else if(kind==3||kind==10){int epoch=(int)floor(age*24),j=(int)v.uv1.y;float3 pa=BoltP(j,epoch),pb=BoltP(j+1,epoch);float k=_Intensity*(1-S(.2,1,v.clock.x))*v.color.a;
     float hot=S((1-j/12.0)*.013,(1-j/12.0)*.013+.003,age),cut=age>.065&&R(seed,j,epoch,90)>.62?0:1,layer=v.uv1.x;
     float width=(layer<.5?.105:layer<1.5?.08:.055)*k*(.7+.3*R(seed,j,91))*(.48+1.32*R(seed+j,(int)u,4));
     if(kind==10){width=.011;cut=step(u/12,S(0,.045,age));hot=1;}
     p=Tube(pa,pb,BoltP(u,epoch),q*TWO_PI,width*(light>0?2:1));c=layer<.5?_Edge:layer<1.5?_Body:_Core;a=cut*(layer<.5?.85:layer<1.5?1:hot);if(kind==10){c=_Body;a*=.7;}if(light>0){c=_Body;a*=.035*_Glow;}
    }
    else if(kind==4){p=CrownP(id,(int)u,age);a=(1-S(.035,.16,age))*S(0,.008,age);c=id%3==0?_Core:_Body;if(light>0)a*=.04*_Glow;}
    else if(kind==5){float angle=id*TWO_PI/10+R(seed,id,100)*.15,reach=(.42+R(seed,id,101)*.55)*(.35+.65*E(age/.018));float3 root=P(.12,angle,.25),side=P(.08,angle+PI/2,0);p=u==0?root+side:u==1?P(reach,angle,.18+R(seed,id,102)*.9):root-side;c=_Core;a=S(0,.003,age)*(1-S(.023,.057,age))*_Intensity;if(light>0)a*=.08*_Glow;}
    else if(kind==6){float r=(.1+.22*E(age/.013))*(1-S(.018,.04,age));p=u<4?P(r,u*TWO_PI/4,.28):u<5?float3(0,.28+r*1.3,0):float3(0,.065,0);c=_Core;a=S(0,.003,age)*(1-S(.018,.037,age))*_Intensity;if(light>0)a*=.1*_Glow;}
    else if(kind==7){float t=saturate((age-.006)/.104),j=v.uv1.y,w=.018*(1-t);p=Tube(JetP(id,j,age),JetP(id,j+1,age),JetP(id,(int)u,age),q*TWO_PI,w*(v.uv1.x<.5?1.5:.65));c=v.uv1.x<.5?_Body:_Core;a=step(.006,age)*(1-S(.15,1,t))*_Intensity;if(light>0)a*=.04*_Glow;}
    else if(kind==8){float local=age-R(seed,id,103)*.018,t=saturate(local/.155),theta=id*2.399,r=_Radius*(.05+.92*E(t)),h=.1+sin(t*PI)*(.08+R(seed,id,104)*.35);float3 center=P(r,theta,h),d=Safe(float3(cos(theta),.08,sin(theta))),side=Safe(cross(d,float3(0,1,0))),up=Safe(cross(d,side));float len=(.16+R(seed,id,105)*.32)*(1-t),w=.025*(1-t);p=center+(u==0?-d*len*.6:u==2?d*len:(q<.5?side:up*.7)*w*(u==1?1:-1));c=id%3==0?_Body:_Core;a=step(0,local)*(1-S(.28,1,t))*_Intensity;if(light>0)a*=.04*_Glow;}
    else if(kind==9){float t=saturate((age-.008)/.14),r=_Radius*(.07+.96*E(t))*(1+.016*sin(v.uv1.x*2.4+seed)),w=light>0?.12:.014*(1-t);p=P(r-w*q,u*TWO_PI,.035);c=_Body;a=S(.008,.015,age)*(1-S(.075,.16,age))*(light>0?.1*_Glow*(1-q):.8);}
    else if(kind==11){float3 d=float3(1,0,0),side=q<.5?float3(0,1,0):float3(0,0,.7);p=u==0?-d*.6:u==2?d:side*.15*(u==1?1:-1);c=_Spark;a=1;if(light>0)a*=.08*_Glow;}
    else if(kind==12){float r=id==0?.7:(_Radius*1.1+.5)*(.25+.75*S(0,.055,age));p=P(r*u,q*TWO_PI,.015);c=_Body;a=(1-u)*(id==0?.08*S(0,.075,age)*(1-S(.09,.1,age)):.9*S(0,.004,age)*(1-S(.025,.125,age)))*_Glow;}
    else if(kind==13){int index=(int)floor(v.clock.z*99),j=(int)v.uv1.y;float4 f=Current(age,j/4.0,seed+index+200);float w=index%3==0?.0075:.0055;float3 pa=ArcP(index,j,age),pb=ArcP(index,j+1,age);p=Tube(pa,pb,ArcP(index,(int)u,age),q*TWO_PI,w*(v.uv1.x<.5?2:1));c=v.uv1.x<.5?_Edge:f.y>.35?_Core:_Body;a=f.x*(1-S(.5,1,v.clock.x))*((int)floor(age*22)%3==1?.18:1);if(light>0)a*=.04*_Glow;}
    if(_Flat>.5)p=float3(p.x,.913545*p.y-.406737*p.z,0);
    float3 x=Safe(v.tangent.xyz),y=Safe(v.normal),z=Safe(cross(x,y));float3 size=max(v.size,float3(.00001,.00001,.00001));
    float3 position=v.vertex.xyz+x*p.x*size.x+y*p.y*size.y+z*p.z*size.z;
    o.positionCS=TransformObjectToHClip(position);o.color=float4(c.rgb*v.color.rgb,saturate(c.a*a*v.color.a));return o;
   }
   half4 Frag(Varyings i):SV_Target{
    // The source additive pass blends premultiplied sRGB. Decode that light
    // contribution once, rather than decoding the color and brightening its alpha.
    half3 rgb=_Additive>.5?SRGBToLinear(LinearToSRGB(i.color.rgb)*i.color.a):i.color.rgb*i.color.a;
    return half4(rgb,i.color.a);
   }
   ENDHLSL
  }
 }
}
