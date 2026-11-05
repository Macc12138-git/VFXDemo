Shader "PixelFX/Brazier Handpainted Realtime Dissolve URP"
{
    Properties
    {
        [MainTexture] _MainTex ("Static hand-painted element (ONE image)", 2D) = "white" {}
        [MainColor] _TintColor ("Tint", Color) = (1,1,1,1)
        _Intensity ("Brightness", Range(0,2)) = 1
        [ToggleUI] _UseParticleData ("Native Custom1 clock / dissolve", Float) = 1
        _LoopDuration ("Contour loop (seconds)", Float) = 4
        [ToggleUI] _MorphEnabled ("Realtime analytical tongue contour", Float) = 1
        _TongueShape ("Source height / width / lean / identity", Vector) = (445,74,26,11.04)
        _TextureRect ("Texture width / height / root X / root Y", Vector) = (256,512,128,480)
        _SourceOrigin ("Logical source root X / Y", Vector) = (512,860,0,0)
        [ToggleUI] _EnableDistortion ("UV Distortion", Float) = 1
        _DistortTex ("Static distortion field", 2D) = "gray" {}
        _DistortStrength ("Distortion (source pixels)", Range(0,66)) = 33
        [ToggleUI] _EnableDissolve ("Noise Dissolve", Float) = 1
        _Dissolve ("Static dissolve field", 2D) = "white" {}
        _DissolveAmount ("Additional dissolve", Range(0,1)) = 0
        _BaseDissolve ("Root dissolve threshold", Range(0,1)) = 0.14
        _TipDissolve ("Additional tip erosion", Range(0,1)) = 0.40
        _Soft_Dissolve ("Soft dissolve", Range(0,1)) = 0.28
        [ToggleUI] _HandDrawnEdge ("Hand drawn edge", Float) = 1
        _InkColor ("Warm dry-paint edge", Color) = (0.3564,0.0343,0.0097,0.75)
        _InkWidth ("Edge width (screen pixels)", Range(0.1,8)) = 1.9
        _InkRoughness ("Dry brush roughness", Range(0,1)) = 0.65
        _PigmentGrain ("Pigment variation", Range(0,1)) = 1
        [Enum(One,1,OneMinusSrcAlpha,10)] _DstBlend ("Destination blend", Float) = 10
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Cull Off ZWrite Off ZTest LEqual
        Blend SrcAlpha [_DstBlend]
        Pass
        {
            Name "RealtimeDissolve"
            Tags { "LightMode"="SRPDefaultUnlit" }
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            TEXTURE2D(_Dissolve); SAMPLER(sampler_Dissolve);
            TEXTURE2D(_DistortTex); SAMPLER(sampler_DistortTex);
            CBUFFER_START(UnityPerMaterial)
                float4 _TintColor, _TongueShape, _TextureRect, _SourceOrigin, _InkColor;
                float _Intensity, _UseParticleData, _LoopDuration, _MorphEnabled;
                float _EnableDistortion, _DistortStrength, _EnableDissolve, _DissolveAmount;
                float _BaseDissolve, _TipDissolve, _Soft_Dissolve;
                float _HandDrawnEdge, _InkWidth, _InkRoughness, _PigmentGrain;
            CBUFFER_END
            struct Attributes
            {
                float4 positionOS:POSITION;
                half4 color:COLOR;
                float4 uv:TEXCOORD0; // UV.xy + padding UV2.xy; NO frame blending/atlas.
                float4 custom:TEXCOORD1; // Native Custom1: clock seconds, dissolve, strength, phase offset.
            };
            struct Varyings { float4 positionCS:SV_POSITION; float2 uv:TEXCOORD0; float4 custom:TEXCOORD1; half4 color:COLOR; };
            Varyings Vert(Attributes input)
            {
                Varyings o; o.positionCS=TransformObjectToHClip(input.positionOS.xyz);
                o.uv=input.uv.xy; o.custom=input.custom; o.color=input.color*_TintColor; return o;
            }
            float Smooth(float a,float b,float x){float t=saturate((x-a)/(b-a));return t*t*(3-2*t);}
            float2 FieldUV(float2 sourcePixels){return float2(sourcePixels.x,-sourcePixels.y)/256.0;}
            float Noise(float2 sourcePixels)
            {
                float r=SAMPLE_TEXTURE2D(_Dissolve,sampler_Dissolve,FieldUV(sourcePixels)).r;
                // Same legacy floor/remap as EffectDissolveDistort, data texture is LINEAR.
                return saturate((max(r,0.2)-0.2)/0.8);
            }
            float3 Contour(float u,float phase)
            {
                float h=_TongueShape.x,w=_TongueShape.y,lean=_TongueShape.z,id=_TongueShape.w;
                float sway=sin(phase*2+id*1.9),turn=sin(phase*3+id*2.4);
                float center=lean*u*u+21*sway*u*u+(17+8*turn)*sin(u*8-phase*3+id)*pow(u,1.15)
                    +32*sin(phase*2+id)*pow(u,5);
                float undulation=1+0.12*sin(u*17-phase*5+id)+0.05*sin(u*35-phase*8+id*3)+0.018*sin(u*137-phase*8+id*7);
                float width=w*pow(max(1-u,0),0.76)*(0.78+0.38*sin(u*PI))*undulation;
                return float3(center,width*(1+0.11*sin(u*10+phase*3)),width*(1-0.11*sin(u*10+phase*3+1)));
            }
            float2 WarpContour(float2 p,float phase,out float valid)
            {
                float id=_TongueShape.w;
                float liveHeight=_TongueShape.x*(0.93+0.07*sin(phase*3+id*1.7));
                float referenceHeight=_TongueShape.x*(0.93+0.07*sin(id*1.7));
                float rawU=p.y/max(liveHeight,0.001),u=clamp(rawU,0,0.99999);
                valid=step(0,rawU)*step(rawU,1);
                float3 live=Contour(u,phase),reference=Contour(u,0);
                float fromCenter=p.x-live.x;
                float oldWidth=fromCenter<0?reference.y:reference.z;
                float newWidth=fromCenter<0?live.y:live.z;
                float refX=reference.x+fromCenter*oldWidth/max(newWidth,0.02);
                return float2((refX+_TextureRect.z)/_TextureRect.x,
                    1-_TextureRect.w/_TextureRect.y+u*referenceHeight/_TextureRect.y);
            }
            half4 Frag(Varyings input):SV_Target
            {
                float clock=_UseParticleData>0.5?input.custom.x+input.custom.w:_Time.y;
                float scroll=clock/max(_LoopDuration,0.001)*256;
                float phase=clock/max(_LoopDuration,0.001)*TWO_PI;
                float2 local=float2(input.uv.x*_TextureRect.x-_TextureRect.z,
                    (input.uv.y-(1-_TextureRect.w/_TextureRect.y))*_TextureRect.y);
                float2 logical=float2(_SourceOrigin.x+local.x,_SourceOrigin.y-local.y);
                float rise=saturate((855-logical.y)/440),anchor=Smooth(0,0.6,rise);
                float strength=_DistortStrength*(_UseParticleData>0.5?input.custom.z:1);
                float2 distortion=0;
                if(_EnableDistortion>0.5)
                {
                    float r=SAMPLE_TEXTURE2D(_DistortTex,sampler_DistortTex,FieldUV(float2(logical.x*0.28,logical.y*0.16+scroll))).r;
                    float g=SAMPLE_TEXTURE2D(_DistortTex,sampler_DistortTex,FieldUV(float2(logical.x*0.23+89,logical.y*0.18+scroll))).r;
                    distortion=float2((r-0.5)*strength,(g-0.5)*strength*(13.0/33.0))*anchor;
                }
                float2 distortedLocal=local+float2(distortion.x,-distortion.y);
                float valid=1;
                float2 uv=input.uv+float2(distortion.x,-distortion.y)/_TextureRect.xy;
                if(_MorphEnabled>0.5)uv=WarpContour(distortedLocal,phase,valid);
                half4 color=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,uv)*input.color;
                float noise=Noise(float2(logical.x*0.30+distortion.x*0.30,logical.y*0.14+scroll+distortion.y*0.14));
                // Evaluate derivatives before all material-dependent branches.
                float gradient=max(length(float2(ddx(noise),ddy(noise))),0.00001);
                float grain=Noise(float2(logical.x*4,logical.y*0.55));
                float extra=saturate(_DissolveAmount+(_UseParticleData>0.5?input.custom.y:0));
                float amount=saturate(extra+_BaseDissolve+_TipDissolve*Smooth(0.20,0.97,rise));
                half coverage=1,ink=0;
                if(_EnableDissolve>0.5)
                {
                    coverage=extra>=1?0:saturate((noise-amount)/max(_Soft_Dissolve*0.25,0.001));
                    if(_HandDrawnEdge>0.5 && extra<1)
                    {
                        float width=max(_InkWidth*lerp(1,0.55+grain,_InkRoughness),0.1);
                        float distance=(noise-amount)/gradient;
                        ink=step(0,distance)*(1-smoothstep(max(0,width-0.65),width,distance));
                        ink*=lerp(1,smoothstep(0.18,0.48,grain),_InkRoughness)*_InkColor.a;
                    }
                }
                color.rgb*=lerp(1,0.92+grain*0.14,_PigmentGrain)*_Intensity;
                color.rgb=lerp(color.rgb,_InkColor.rgb,ink);
                color.a*=valid*max(coverage,ink);
                return color;
            }
            ENDHLSL
        }
    }
}
