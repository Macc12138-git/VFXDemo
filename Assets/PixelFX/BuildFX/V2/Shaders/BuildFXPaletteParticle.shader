Shader "PixelFX/BuildFX/Editable Palette URP"
{
    Properties
    {
        [MainTexture] _MainTex ("Static masks and palette IDs (linear data)", 2D) = "white" {}
        [MainColor] _TintColor ("Overall tint / opacity", Color) = (1,1,1,1)
        [Header(Independent effect colors)]
        _SmokeColor ("Smoke", Color) = (.608,.588,.643,1)
        _FlashColor ("Flash main", Color) = (1,.914,.345,1)
        _HighlightColor ("Flash highlight", Color) = (1,.984,.722,1)
        _ArcColor ("Sweeping arcs", Color) = (1,.957,.859,1)
        _SparkColor ("Stars", Color) = (1,.941,.459,1)
        _DebrisColor ("Chips", Color) = (.835,.816,.835,1)
        [Header(Additive glow material)]
        [HDR] _GlowColor ("Glow", Color) = (1,.945,.592,1)
        _GlowIntensity ("Glow intensity", Range(0,2)) = .1
        [Enum(One,1,OneMinusSrcAlpha,10)] _DstBlend ("Destination blend", Float) = 10
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Cull Off ZWrite Off ZTest LEqual
        Blend SrcAlpha [_DstBlend]
        Pass
        {
            Tags { "LightMode"="SRPDefaultUnlit" }
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            CBUFFER_START(UnityPerMaterial)
                half4 _TintColor;
                half4 _SmokeColor;
                half4 _FlashColor;
                half4 _HighlightColor;
                half4 _ArcColor;
                half4 _SparkColor;
                half4 _DebrisColor;
                half4 _GlowColor;
                half _GlowIntensity;
                half _DstBlend;
            CBUFFER_END
            struct Attributes { float4 positionOS:POSITION; half4 color:COLOR; float2 uv:TEXCOORD0; };
            struct Varyings { float4 positionCS:SV_POSITION; half4 color:COLOR; float2 uv:TEXCOORD0; };
            Varyings Vert(Attributes i)
            {
                Varyings o;
                o.positionCS=TransformObjectToHClip(i.positionOS.xyz);
                o.color=i.color*_TintColor;
                o.uv=i.uv;
                return o;
            }
            half4 Frag(Varyings i):SV_Target
            {
                half4 mask=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.uv);
                half4 color;
                if(i.uv.x < .625)
                {
                    color=i.uv.y > .60 ? _SmokeColor : _GlowColor;
                    color.rgb*=mask.r;
                    if(i.uv.y <= .60) color.rgb*=_GlowIntensity;
                }
                else
                {
                    int role=(int)round(mask.r*8.0h);
                    color=role==1 ? _FlashColor : role==2 ? _HighlightColor :
                          role==3 ? _ArcColor : role==4 ? _SparkColor : _DebrisColor;
                    color.rgb*=mask.g;
                }
                color.a*=mask.a;
                return color*i.color;
            }
            ENDHLSL
        }
    }
}
