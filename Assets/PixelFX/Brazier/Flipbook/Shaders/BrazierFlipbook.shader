Shader "PixelFX/Brazier Flipbook URP"
{
    Properties
    {
        [NoScaleOffset] _MainTex ("Padded Flipbook", 2D) = "white" {}
        _Tint ("Tint", Color) = (1,1,1,1)
        _Intensity ("Intensity", Float) = 1
        _Frame ("Frame", Float) = 0
        _Grid ("Columns, Rows, Frames, Unused", Vector) = (10,9,90,0)
        _FramePixels ("Width, Height, Padding, Unused", Vector) = (112,148,2,0)
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 5
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Transparent" "Queue"="Transparent" }
        Pass
        {
            Name "Flipbook"
            Tags { "LightMode"="SRPDefaultUnlit" }
            Blend [_SrcBlend] [_DstBlend]
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);
            CBUFFER_START(UnityPerMaterial)
                float4 _Tint;
                float4 _Grid;
                float4 _FramePixels;
                float _Intensity;
                float _Frame;
                float _SrcBlend;
                float _DstBlend;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };
            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv;
                return output;
            }
            half4 Frag(Varyings input) : SV_Target
            {
                float frame = fmod(floor(_Frame), _Grid.z);
                float2 cell = float2(fmod(frame, _Grid.x), _Grid.y - 1 - floor(frame / _Grid.x));
                float2 cellPixels = _FramePixels.xy + 2 * _FramePixels.z;
                // PNG rows are top-to-bottom; Unity UVs start at the bottom.
                float2 uv = (cell * cellPixels + _FramePixels.z + saturate(input.uv) * _FramePixels.xy)
                    / (cellPixels * _Grid.xy);
                half4 color = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);
                // The JS light buffer contains display-space RGB. Import it without automatic
                // conversion, then decode explicitly for additive blending in a linear project.
                #ifndef UNITY_COLORSPACE_GAMMA
                    if (_SrcBlend < 1.5) color.rgb = SRGBToLinear(color.rgb);
                #endif
                color *= _Tint;
                color.rgb *= _Intensity;
                return color;
            }
            ENDHLSL
        }
    }
}
