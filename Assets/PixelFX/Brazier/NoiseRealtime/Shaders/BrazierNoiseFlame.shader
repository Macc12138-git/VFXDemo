Shader "PixelFX/Brazier Noise Flame URP"
{
    Properties
    {
        [MainTexture] _MainTex ("Original static grayscale FlowNoise", 2D) = "gray" {}
        _Flow ("Flow (match native lifetime to 8 / Flow)", Range(.25,2)) = 1.45
        _Stretch ("Vertical stretch", Range(1.2,6)) = 2.7
        _Scale ("Noise scale", Range(.6,2.5)) = 1.7
        _Distortion ("Curl distortion", Range(0,1.8)) = 1.15
        _Dissolve ("Dissolve erosion", Range(0,1)) = .13
        _Softness ("Edge softness", Range(.01,.18)) = .065
        _Core ("Hot core", Range(0,1.2)) = .8
        _Steps ("Hand painted color steps", Range(0,1)) = .15
        _SourceRect ("Source crop X Y W H", Vector) = (270,238,485,624)
        [Enum(Fire,0,Noise,1,Mask,2)] _Layer ("Debug layer", Float) = 0
    }
    SubShader
    {
        Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
        Cull Off ZWrite Off ZTest LEqual Blend SrcAlpha OneMinusSrcAlpha
        Pass
        {
            Tags {"LightMode"="SRPDefaultUnlit"}
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            CBUFFER_START(UnityPerMaterial)
                float4 _SourceRect;
                float _Flow,_Stretch,_Scale,_Distortion,_Dissolve,_Softness,_Core,_Steps,_Layer;
            CBUFFER_END
            struct Attributes {float4 positionOS:POSITION;half4 color:COLOR;float4 uv:TEXCOORD0;float4 custom:TEXCOORD1;};
            struct Varyings {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;float clock:TEXCOORD1;half4 color:COLOR;};
            Varyings Vert(Attributes i){Varyings o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.uv=i.uv.xy;o.clock=i.custom.x;o.color=i.color;return o;}
            float N(float2 p){return saturate((SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,float2(p.x,1-p.y)).r-.13)/.62);}
            float Plume(float x,float h,float c,float height,float w,float id,float phase)
            {
                float hi=height*(.94+.06*sin(phase*(2+fmod(id,2))+id*2.3));
                float center=c+sin(h*6-phase*2+id*1.9)*h*.18;
                return 1-pow(abs(x-center)/w,1.35)-pow(max(h,0)/hi,1.6);
            }
            float3 Ramp(float heat)
            {
                float q=lerp(heat,floor(heat*5+.5)/5,_Steps)*5;
                float3 a=float3(155,28,9),b=float3(232,55,6),c=float3(255,110,12);
                float3 d=float3(255,178,38),e=float3(255,224,113),f=float3(255,249,213);
                float3 rgb=q<1?lerp(a,b,q):q<2?lerp(b,c,q-1):q<3?lerp(c,d,q-2):q<4?lerp(d,e,q-3):lerp(e,f,q-4);
                rgb/=255;
                #if !defined(UNITY_COLORSPACE_GAMMA)
                    rgb=SRGBToLinear(rgb);
                #endif
                return rgb;
            }
            half4 Frag(Varyings i):SV_Target
            {
                float2 pixel=_SourceRect.xy+float2(i.uv.x,1-i.uv.y)*_SourceRect.zw;
                float h=(855-pixel.y)/460,x=(pixel.x-512)/147,t=i.clock*_Flow,phase=t*TWO_PI/8;
                if(h<-.012||h>1.32||abs(x)>1.65)return 0;
                float2 uv=float2(x*_Scale*.43+.31,h*_Scale/_Stretch-t*.5);
                float wx=N(uv*float2(.64,.8)+float2(.12,t*.15))-.48;
                float wy=N(uv*float2(.71,.7)+float2(.67,-t*.15))-.48;
                float xd=x+wx*_Distortion*(.10+.78*saturate(h))+sin(h*7-phase*2)*.055*h;
                float n0=N(uv+float2(wx*.13,wy*.08)),n1=N(uv*float2(1.91,1.53)+float2(.42,t*.265)),n2=N(uv*float2(4.17,3.31)+float2(.13,t*.155));
                float noise=n0*.64+n1*.26+n2*.10;
                float body=Plume(xd,h,-.73,.49,.28,0,phase);
                body=max(body,Plume(xd,h,-.34,.80,.34,1,phase));body=max(body,Plume(xd,h,.02,1.06,.46,2,phase));
                body=max(body,Plume(xd,h,.40,.76,.34,3,phase));body=max(body,Plume(xd,h,.76,.44,.27,4,phase));
                body=max(body,.88-pow(abs(xd)/1.08,2)*.68-max(h,0)*2.6);
                if(_Layer>.5){float v=_Layer<1.5?N(float2((pixel.x-512)/294*_Scale+.5,h*_Scale/_Stretch-t*.5)):saturate(body);return half4(v,v,v,1);}
                float erosion=_Dissolve*.95+smoothstep(.65,1,_Dissolve)*.8,fuel=body+(noise-.43)*1.12-erosion;
                float mouth=lerp(1-smoothstep(.96,1.035,abs(x)),1,smoothstep(.05,.28,h));
                float alpha=smoothstep(0,_Softness,fuel)*(1-smoothstep(1.12,1.30,h))*smoothstep(-.012,.012,h)*mouth;
                float heat=saturate(fuel*.82+_Core*.35*(1-saturate(h))+(n1-.5)*.12);
                return half4(Ramp(heat)*i.color.rgb,alpha*i.color.a);
            }
            ENDHLSL
        }
    }
}
