using System;
using UnityEngine;

namespace PixelFX.Brazier.AnimatedParticles
{
    [Serializable] public sealed class BrazierParticleRecipe
    {
        public float duration, pixelsPerUnit;
        public int fps;
        public float[] flicker, lean;
        public BrazierParticleEvent[] events;
    }

    [Serializable] public sealed class BrazierParticleEvent
    {
        public int id, tongue, parent;
        public string kind;
        public float born, life, x, y, vx, vy, s, heat, sway, a, b, w, m;
        public bool big;
    }

    /// <summary>Source timing and analytic trajectory bridge, not a whole-effect flipbook player.
    /// Shuriken owns particles, life expiry, UV animation and per-camera billboard geometry.
    /// This bridge retains correlations which native random emission/noise cannot express.</summary>
    [DisallowMultipleComponent]
    public sealed class BrazierSourceParticles : MonoBehaviour
    {
        public TextAsset sourceRecipe;
        public ParticleSystem[] tongues;
        public ParticleSystem puffs, licks, plume, spentSmoke, sparks, embers, crosses, glow;
        [Min(0)] public float playbackSpeed = 1;
        public bool previewPaused;
        [Range(0,3)] public float previewTime = .8f;
        [Range(0,2)] public float glowStrength = .45f;
        public float TimeSeconds { get; private set; }
        BrazierParticleRecipe recipe;
        ParticleSystem[] secondary;
        readonly ParticleSystem.Particle[] buffer = new ParticleSystem.Particle[1024];
        readonly ParticleSystem.Particle[] glowBuffer = new ParticleSystem.Particle[512];
        int glowCount;
        readonly Color hot = new Color(1,.953f,.651f), warm = new Color(1,.886f,.42f), cool = new Color(1,.541f,.165f);
        bool initialized;

        void OnEnable() { if (sourceRecipe && tongues != null && tongues.Length == 11) Initialize(); }
        void Initialize()
        {
            recipe = JsonUtility.FromJson<BrazierParticleRecipe>(sourceRecipe.text);
            secondary = new[] { puffs, licks, plume, spentSmoke, sparks, embers, crosses };
            initialized = true;
            Seek(previewTime);
        }

        void LateUpdate()
        {
            if (!initialized) return;
            if (!previewPaused) Advance(Mathf.Min(Time.deltaTime,.1f)*playbackSpeed);
        }

        public void Seek(float time)
        {
            if (!initialized) { if (!sourceRecipe) return; recipe=JsonUtility.FromJson<BrazierParticleRecipe>(sourceRecipe.text); secondary=new[]{puffs,licks,plume,spentSmoke,sparks,embers,crosses}; initialized=true; }
            TimeSeconds = Mathf.Max(0,time);
            foreach (var ps in tongues) { ps.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear); ps.Simulate(Mathf.Repeat(TimeSeconds,recipe.duration),false,true,false); ps.Pause(false); }
            foreach (var ps in secondary) { ps.Simulate(.00001f,false,true,false); ps.Pause(false); }
            foreach (var e in recipe.events)
            {
                float born = e.born + Mathf.Floor((TimeSeconds-e.born)/recipe.duration)*recipe.duration;
                float age = TimeSeconds-born;
                if (age < e.life) Emit(e,age);
            }
            UpdateParticles(); UpdateGlow();
        }

        void Advance(float dt)
        {
            float previous=TimeSeconds; TimeSeconds+=dt;
            foreach (var ps in tongues) { ps.Simulate(dt,false,false,false); ps.Pause(false); }
            foreach (var ps in secondary) { ps.Simulate(dt,false,false,false); ps.Pause(false); }
            foreach (var e in recipe.events)
            {
                float born=e.born+Mathf.Floor((TimeSeconds-e.born)/recipe.duration)*recipe.duration;
                if (born > previous && born <= TimeSeconds) Emit(e,TimeSeconds-born);
            }
            UpdateParticles(); UpdateGlow();
        }

        public void StepForPreview(float seconds) { if(initialized) Advance(seconds); }

        ParticleSystem SystemFor(BrazierParticleEvent e)
        {
            switch(e.kind)
            {
                case "puff": return puffs; case "lick": return licks; case "plume": return plume;
                case "spent": return spentSmoke; case "spark": return sparks;
                default: return e.big ? crosses : embers;
            }
        }

        void Emit(BrazierParticleEvent e,float age)
        {
            var ps=SystemFor(e);
            var ep=new ParticleSystem.EmitParams { startLifetime=e.life, startColor=Color.white,
                startSize=1, randomSeed=(uint)(e.id+1), velocity=Vector3.zero, position=Vector3.zero };
            ps.Emit(ep,1);
            // Set remaining life, not atlas startFrame: native lifetime-normalized UVs stay correct.
            int count=ps.GetParticles(buffer);
            for(int i=0;i<count;i++) if(buffer[i].randomSeed==e.id+1) buffer[i].remainingLifetime=e.life-age;
            ps.SetParticles(buffer,count); ps.Pause(false);
        }

        static float Along(float x,float v,float a,float drag,float t)
        {
            return drag<=0 ? x+v*t+.5f*a*t*t : x+a/drag*t+(v-a/drag)*(1-Mathf.Exp(-drag*t))/drag;
        }
        static float Speed(float v,float a,float drag,float t) { return a/drag+(v-a/drag)*Mathf.Exp(-drag*t); }

        void UpdateParticles()
        {
            foreach(var ps in secondary)
            {
                int count=ps.GetParticles(buffer);
                for(int i=0;i<count;i++)
                {
                    var p=buffer[i]; var e=recipe.events[(int)p.randomSeed-1];
                    float age=e.life-p.remainingLifetime, k=Mathf.Clamp01(1-age/e.life), x=e.x, y=e.y;
                    float vx=e.vx,vy=e.vy,ax=0,ay=0,kx=0,ky=0;
                    switch(e.kind)
                    {
                        case "puff": ay=-95;kx=5;ky=3.2f;break;
                        case "plume": ax=3;ay=-20;kx=1.6f;ky=1;break;
                        case "spent": ax=3;ay=-16;kx=1.6f;ky=1.2f;break;
                        case "ember": ay=-30;kx=ky=1.6f;break;
                        case "spark": ay=-22;kx=ky=1.9f;break;
                    }
                    x=Along(x,vx,ax,kx,age); y=Along(y,vy,ay,ky,age);
                    if(e.kind=="plume") x+=e.sway*(1.5f+2.5f*age);
                    if(e.kind=="ember") {x+=7*(Mathf.Sin(age*2.3f+e.a)-Mathf.Sin(e.a));y+=2*(Mathf.Sin(age*3+e.b)-Mathf.Sin(e.b));}
                    if(e.kind=="spark")
                    {
                        x+=e.m*(Mathf.Sin(age*e.w+e.a)-Mathf.Sin(e.a))*Mathf.Min(1,age*1.5f);
                        vx=Speed(vx,0,kx,age)+e.m*e.w*Mathf.Cos(age*e.w+e.a)*Mathf.Min(1,age*1.5f);
                        vy=Speed(vy,ay,ky,age);
                    }
                    // Quantize at the original pixel scale, not at an arbitrary Unity billboard size.
                    p.position=new Vector3(Mathf.Round(x)/recipe.pixelsPerUnit,-Mathf.Round(y)/recipe.pixelsPerUnit,0);
                    p.velocity=Vector3.zero;
                    if(e.kind=="puff") p.startSize=32f/recipe.pixelsPerUnit*(e.s/2);
                    else if(e.kind=="lick") p.startSize=24f/recipe.pixelsPerUnit*(e.s/2);
                    else if(e.kind=="plume" || e.kind=="spent") p.startSize=32f/recipe.pixelsPerUnit*(e.s/3);
                    else
                    {
                        var c=k>.6f?hot:k>.3f?warm:cool;
                        if(e.kind=="ember" && k<.25f && Mathf.Sin(age*40+e.a)<0) c.a=0;
                        p.startColor=c;
                        if(e.kind=="spark")
                        {
                            float speed=Mathf.Sqrt(vx*vx+vy*vy);
                            float length=speed>40?Mathf.Min(9,1+speed*.022f):1;
                            p.startSize3D=new Vector3(.5f,16f/32*length/7,1);
                            p.rotation=Mathf.Atan2(vx,-vy)*Mathf.Rad2Deg;
                        }
                        else p.startSize=8f/recipe.pixelsPerUnit;
                    }
                    buffer[i]=p;
                }
                ps.SetParticles(buffer,count);
            }
        }

        float Sample(float[] values) { return values[Mathf.FloorToInt(Mathf.Repeat(TimeSeconds,recipe.duration)*recipe.fps)%values.Length]; }
        void UpdateGlow()
        {
            glow.Simulate(.00001f,false,true,false);
            glowCount=0;
            float f=Sample(recipe.flicker), lean=Sample(recipe.lean)*12;
            Glow(lean,-11.2f,87,new Color(1,.712f,.365f),.22f*f*1.4f);
            Glow(lean,-24,58,new Color(1,.712f,.365f),.34f*f*1.4f);
            Glow(0,-6.4f,18.56f,warm,.2f*f*1.4f);
            Glow(0,-2,8,Color.white,.14f*f*1.4f);
            // Independent, small additive particles follow each live ember/puff; never Unity Lights.
            foreach(var ps in secondary)
            {
                int n=ps.GetParticles(buffer);
                for(int i=0;i<n;i++)
                {
                    var e=recipe.events[(int)buffer[i].randomSeed-1];
                    if(e.kind=="plume" || e.kind=="spent" || e.kind=="lick") continue;
                    float k=buffer[i].remainingLifetime/e.life;
                    var c=e.kind=="puff"?warm:(Color)buffer[i].startColor;
                    float radius=e.kind=="puff"?e.s*2.4f+2:e.big?8:4;
                    var pos=buffer[i].position;
                    Glow(pos.x*32,-pos.y*32,radius,c,(e.kind=="puff"?.12f:.35f)*k);
                }
            }
            glow.SetParticles(glowBuffer,glowCount);
            glow.Pause(false);
        }
        void Glow(float x,float y,float radius,Color color,float alpha)
        {
            color.a*=alpha*glowStrength;
            color=color.linear;
            glowBuffer[glowCount++]=new ParticleSystem.Particle { position=new Vector3(x/32,-y/32,0),startSize=radius*2/32,
                startColor=color,startLifetime=10,remainingLifetime=10,velocity=Vector3.zero,randomSeed=8 };
        }
    }
}
