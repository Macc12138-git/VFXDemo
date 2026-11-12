Shader "PixelFX/BlueWisp Authored Geometry URP"
{
 Properties
 {
  _Edge("Deep blue edge",Color)=(.0549,.3294,.7961,1)
  _Blue("Blue interruptions",Color)=(.0627,.5882,1,1)
  _Cyan("Cyan body",Color)=(.0627,.9333,1,1)
  _Pale("Pale cyan shapes",Color)=(.7098,1,1,1)
  _Core("Left white nucleus",Color)=(1,1,1,1)
  _GlowColor("Glow color",Color)=(.0627,.6863,1,1)
  _Glow("Glow strength",Range(0,.6))=.28
  [ToggleUI] _LightOnly("Static glow geometry",Float)=0
  [Enum(One,1,OneMinusSrcAlpha,10)] _DstBlend("Destination blend",Float)=10
 }
 SubShader
 {
  Tags{"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
  Cull Off ZWrite Off ZTest LEqual
  Blend One [_DstBlend], One OneMinusSrcAlpha
  Pass
  {
   Name "NativeParticleAge"
   Tags{"LightMode"="SRPDefaultUnlit"}
   HLSLPROGRAM
   #pragma target 3.5
   #pragma vertex Vert
   #pragma fragment Frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
   CBUFFER_START(UnityPerMaterial)
    float4 _Edge,_Blue,_Cyan,_Pale,_Core,_GlowColor;
    float _Glow,_LightOnly,_DstBlend;
   CBUFFER_END
   // Native UV + UV2 pack into TEXCOORD0; AgePercent follows in TEXCOORD1.x.
   struct A{float4 vertex:POSITION;float4 color:COLOR;float4 uv:TEXCOORD0;float age:TEXCOORD1;};
   struct V{float4 positionCS:SV_POSITION;half4 color:COLOR;float2 uv:TEXCOORD0;};
   V Vert(A v){
    V o;o.positionCS=TransformObjectToHClip(v.vertex.xyz);o.uv=v.uv.xy;
    if(_LightOnly<.5){
     int active=min(3,(int)floor(saturate(v.age)*4));
     if(abs(v.uv.x-active)>.1)o.positionCS=float4(0,0,-1,1);
     int role=(int)round(v.uv.y);float4 c=role==0?_Edge:role==1?_Blue:role==2?_Cyan:role==3?_Pale:_Core;
     o.color=float4(c.rgb*v.color.rgb,c.a*v.color.a);
    }else{o.color=float4(_GlowColor.rgb*v.color.rgb,_GlowColor.a*v.color.a);}
    return o;
   }
   half4 Frag(V i):SV_Target{
    if(_LightOnly>.5){
     float d=length(i.uv-.5)*38;
     float a=d<1?.26:d<10.9?lerp(.26,.12,(d-1)/9.9):d<15.4?lerp(.12,.025,(d-10.9)/4.5):lerp(.025,0,saturate((d-15.4)/3.6));
     a*=step(d,19)*_Glow*i.color.a;
     return half4(SRGBToLinear(LinearToSRGB(i.color.rgb)*a),0);
    }
    return half4(i.color.rgb*i.color.a,i.color.a);
   }
   ENDHLSL
  }
 }
}
