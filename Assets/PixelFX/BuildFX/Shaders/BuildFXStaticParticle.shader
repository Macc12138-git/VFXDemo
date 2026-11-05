Shader "PixelFX/BuildFX/Static Particle URP"
{
    Properties
    {
        [MainTexture] _MainTex ("Static particle atlas (not animation)", 2D) = "white" {}
        [MainColor] _TintColor ("Tint / opacity", Color) = (1,1,1,1)
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
                return SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.uv)*i.color;
            }
            ENDHLSL
        }
    }
}
