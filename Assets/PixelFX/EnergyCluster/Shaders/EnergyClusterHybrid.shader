Shader "PixelFX/Energy Cluster Hybrid URP"
{
 Properties
 {
  [NoScaleOffset] _Shell("Shell gray + opacity (linear RG)",2D)="black"{}
  [NoScaleOffset] _Profiles("Static volume / halo / core profiles",2D)="black"{}
  _ShellHot("Shell highlights",Color)=(1,1,1,1)
  _ShellCool("Shell blue",Color)=(0,.451,1,1)
  _CoreColor("Core",Color)=(.984,.988,1,1)
  _BodyColor("Body",Color)=(.141,.345,1,1)
  _InnerColor("Inner light",Color)=(.271,.710,1,1)
  _GlowColor("Glow",Color)=(.078,.251,1,1)
  _Opacity("Shell opacity",Range(0,1))=1
  _Volume("Volume strength",Range(0,2))=1
  _Glow("Glow strength",Range(0,2))=1
  [Enum(Short,0,Blend,1,Step,2)] _Interpolation("Shell frame transition",Float)=0
  [HideInInspector] _Role("Layer",Float)=0
  [HideInInspector] _Cycle("Shell cycle seconds",Float)=.48
  [HideInInspector] _DstBlend("Destination blend",Float)=10
 }
 SubShader
 {
  Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
  Cull Off ZWrite Off ZTest LEqual
  Blend One [_DstBlend], One OneMinusSrcAlpha
  Pass
  {
   Name "EnergyCluster"
   Tags {"LightMode"="SRPDefaultUnlit"}
   HLSLPROGRAM
   #pragma target 3.5
   #pragma vertex Vert
   #pragma fragment Frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
   TEXTURE2D(_Shell); SAMPLER(sampler_Shell);
   TEXTURE2D(_Profiles); SAMPLER(sampler_Profiles);
   CBUFFER_START(UnityPerMaterial)
    float4 _ShellHot,_ShellCool,_CoreColor,_BodyColor,_InnerColor,_GlowColor;
    float _Opacity,_Volume,_Glow,_Interpolation,_Role,_Cycle,_DstBlend;
   CBUFFER_END
   // UV + UV2 occupy TEXCOORD0; native AgePercent/InvStartLifetime occupy TEXCOORD1.
   struct Attributes {float4 positionOS:POSITION;float4 color:COLOR;float4 uv:TEXCOORD0;float2 clock:TEXCOORD1;};
   struct Varyings {float4 positionCS:SV_POSITION;float4 color:COLOR;float2 q:TEXCOORD0;float2 clock:TEXCOORD1;};
   Varyings Vert(Attributes v){
    Varyings o;o.positionCS=TransformObjectToHClip(v.positionOS.xyz);o.color=v.color;
    // Halo has a 1.5x padded quad (including its screen-size cap).
    // Expand logical coordinates equally so the original glow scale is unchanged.
    float padding=(_Role>.5&&_Role<1.5)?1.5:1;
    o.q=(v.uv.xy-.5)*float2(256,-256)*padding;o.clock=v.clock;return o;
   }
   float3 Display(float3 c){return LinearToSRGB(c);}
   float3 Decode(float3 c){return SRGBToLinear(max(c,0));}
   float2 ShellAt(float2 q,float index){
    if(any(abs(q)>128))return 0;
    float2 pixel=clamp(q+128,.5,255.5),origin=float2(fmod(index,5),floor(index/5))*256;
    return SAMPLE_TEXTURE2D(_Shell,sampler_Shell,(origin+pixel)/float2(1280,1024)).rg;
   }
   float4 Shell(float2 q,float index,float blend){
    float2 a=ShellAt(q,index),b=ShellAt(q,fmod(index+1,20));
    float3 hot=Display(_ShellHot.rgb),cool=Display(_ShellCool.rgb);
    float aOpacity=lerp(_ShellCool.a,_ShellHot.a,a.x),bOpacity=lerp(_ShellCool.a,_ShellHot.a,b.x);
    return lerp(float4(lerp(cool,hot,a.x)*a.y*aOpacity,a.y*aOpacity),float4(lerp(cool,hot,b.x)*b.y*bOpacity,b.y*bOpacity),blend)*_Opacity;
   }
   float Energy(float2 q,float index,float blend){float2 a=ShellAt(q,index),b=ShellAt(q,fmod(index+1,20));return lerp(a.x*a.y,b.x*b.y,blend)*_Opacity;}
   half4 Frag(Varyings i):SV_Target
   {
    float radius=length(i.q+float2(0,2.5454545))*352/256;
    float profileU=clamp(radius/256,.5/256,255.5/256);
    float age=i.clock.x/max(i.clock.y,.00001);
    float frame=frac(age/max(_Cycle,.001))*20,index=floor(frame),blend=frac(frame);
    if(_Interpolation<.5)blend=smoothstep(.75,1,blend);else if(_Interpolation>1.5)blend=0;
    float3 c=0;float alpha=0;
    if(_Role<.5){
     float4 v=SAMPLE_TEXTURE2D(_Profiles,sampler_Profiles,float2(profileU,1./6.));
     float weight=exp(-radius*radius/2200);
     float3 shift=lerp(Display(_BodyColor.rgb)-float3(36,88,255)/255,Display(_InnerColor.rgb)-float3(69,181,255)/255,weight);
     float3 col=saturate(v.rgb+shift*v.a*.75);
     alpha=saturate(v.a*_Volume*lerp(_BodyColor.a,_InnerColor.a,weight));
     c=Decode(col*(alpha/max(v.a,.00001)));
    }
    else if(_Role<1.5){
     float3 halo=SAMPLE_TEXTURE2D(_Profiles,sampler_Profiles,float2(profileU,.5)).rgb;
     c=Decode(halo*Display(_GlowColor.rgb)/(float3(20,64,255)/255)*_Glow*_GlowColor.a);
    }
    else if(_Role<2.5){
     alpha=SAMPLE_TEXTURE2D(_Profiles,sampler_Profiles,float2(profileU,5./6.)).r*_CoreColor.a;
     c=Decode(Display(_CoreColor.rgb)*alpha);
    }
    else if(_Role<3.5){
     float bloom=(Energy(i.q+float2(-2,-2),index,blend)+Energy(i.q+float2(2,-2),index,blend)+Energy(i.q+float2(-2,2),index,blend)+Energy(i.q+float2(2,2),index,blend))*.25;
     c=Decode(Display(_GlowColor.rgb)*bloom*.30*_Glow*_GlowColor.a);
    }
    else {float4 s=Shell(i.q,index,blend);c=Decode(s.rgb);alpha=s.a;}
    c*=i.color.rgb*i.color.a;alpha*=i.color.a;
    return half4(c,alpha);
   }
   ENDHLSL
  }
 }
}
