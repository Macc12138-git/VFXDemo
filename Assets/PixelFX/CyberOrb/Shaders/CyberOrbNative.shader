Shader "PixelFX/Cyber Orb Native URP"
{
 Properties
 {
  _Core("White-hot core",Color)=(.957,.996,1,1)
  _Outline("Pale blue outline",Color)=(.620,.875,1,1)
  _Rim("Wake / shard cyan",Color)=(.396,.898,1,1)
  _Trail("Wake / impact blue",Color)=(.149,.455,1,1)
  _OutlineWidth("Single outline width / radius",Range(.04,.18))=.14
  _TailLength("Wake length / radius",Range(1.5,2.8))=2.8
  _TailWidth("Wake half-width / radius",Range(.4,.8))=.63
  _TailOpacity("Wake opacity",Range(0,1))=1
  _Glow("Compact glow intensity",Range(0,1))=.55
  _GlowRadius("Glow outer radius / core radius",Range(1.15,1.35))=1.35
  [Enum(BodyAndWake,0,Glow,1,ImpactFlash,2,Shard,3,ResidualWake,4)] _Role("Element role",Float)=0
  [Enum(One,1,OneMinusSrcAlpha,10)] _DstBlend("Destination blend",Float)=10
 }
 SubShader
 {
  Tags{"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
  Cull Off ZWrite Off ZTest LEqual
  Blend One [_DstBlend], One OneMinusSrcAlpha
  Pass
  {
   Name "NativeElement"
   Tags{"LightMode"="SRPDefaultUnlit"}
   HLSLPROGRAM
   #pragma target 3.5
   #pragma vertex Vert
   #pragma fragment Frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
   CBUFFER_START(UnityPerMaterial)
    float4 _Core,_Outline,_Rim,_Trail;
    float _OutlineWidth,_TailLength,_TailWidth,_TailOpacity,_Glow,_GlowRadius,_Role,_DstBlend;
   CBUFFER_END
   struct Attributes{float4 positionOS:POSITION;float4 color:COLOR;float4 uv:TEXCOORD0;float2 clock:TEXCOORD1;};
   struct Varyings{float4 positionCS:SV_POSITION;float4 color:COLOR;float2 p:TEXCOORD0;float2 clock:TEXCOORD1;float tag:TEXCOORD2;};
   Varyings Vert(Attributes v){Varyings o;o.positionCS=TransformObjectToHClip(v.positionOS.xyz);o.color=v.color;o.p=v.uv.xy;o.tag=v.uv.z;o.clock=v.clock;return o;}
   float4 Over(float4 top,float4 bottom){return float4(top.rgb*top.a+bottom.rgb*(1-top.a),top.a+bottom.a*(1-top.a));}
   float4 Wake(float2 p){
    float u=saturate((-p.x-.45)/_TailLength),x=1-u;
    float w=_TailWidth*pow(1-u,1.05),aa=max(fwidth(p.y),.002);
    float a=(1-smoothstep(w-aa,w+aa,abs(p.y)))*step(p.x,-.45)*step(-.45-_TailLength,p.x);
    float4 c;
    if(x<.17)c=float4(_Trail.rgb,lerp(0,.55,x/.17)*_Trail.a);
    else if(x<.48)c=lerp(float4(_Trail.rgb,.55*_Trail.a),float4(_Rim.rgb,.93*_Rim.a),(x-.17)/.31);
    else if(x<.8)c=lerp(float4(_Rim.rgb,.93*_Rim.a),_Rim,(x-.48)/.32);
    else c=lerp(_Rim,_Core,(x-.8)/.2);
    c.a*=a*_TailOpacity;return float4(c.rgb*c.a,c.a);
   }
   half4 Frag(Varyings i):SV_Target{
    float4 c=0;
    float age=i.clock.x/max(i.clock.y,.0001),pulse=1+.008*sin(age*TWO_PI*3/4+42*.17);
    if(_Role<.5){
     c=Wake(i.p);float d=length(i.p)/pulse,aa=max(fwidth(d),.003);
     float coreA=1-smoothstep(.97-aa,1+aa,d);
     c=Over(float4(_Core.rgb,coreA*_Core.a),c);
     float rimA=1-smoothstep(_OutlineWidth*.5-aa,_OutlineWidth*.5+aa,abs(d-.97));
     c=Over(float4(_Outline.rgb,rimA*_Outline.a),c);
    }
    else if(_Role<1.5){
     float q=saturate((length(i.p)/pulse-.72)/(_GlowRadius-.72));float a;
     if(q<.38)a=lerp(.38,.3,q/.38);else if(q<.72)a=lerp(.3,.04,(q-.38)/.34);else a=lerp(.04,0,(q-.72)/.28);
     a*=step(length(i.p)/pulse,_GlowRadius)*_Glow*_Outline.a*i.color.a;
     // Decode the source sRGB light contribution once in this Linear project.
     return half4(SRGBToLinear(LinearToSRGB(_Outline.rgb*i.color.rgb)*a),a);
    }
    else if(_Role<2.5){float4 color=i.tag>.5?_Core:_Trail;c=float4(color.rgb*color.a,color.a);}
    else if(_Role<3.5){
     float2 p=i.p*2-1;float aa=max(fwidth(p.x),.01),edge=abs(p.x)+abs(p.y);
     float4 color=lerp(_Trail,_Rim,saturate(i.p.y));color.a*=1-smoothstep(1-aa,1+aa,edge);c=float4(color.rgb*color.a,color.a);
    }
    else c=Wake(i.p);
    c.rgb*=i.color.rgb*i.color.a;c.a*=i.color.a;return c;
   }
   ENDHLSL
  }
 }
}
