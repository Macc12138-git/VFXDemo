using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace PixelFX.Brazier.InspectorParticles.Editor
{
    // Editor-only asset authoring / QA. Nothing in this file is attached to any object or runs in a build.
    public static class BrazierInspectorSetup
    {
        const string Root="Assets/PixelFX/Brazier/InspectorParticles";
        const string Art="Assets/PixelFX/Brazier/AnimatedParticles/Textures";
        const string ScenePath=Root+"/Scenes/BrazierInspectorShowcase.unity";
        const string Preview="BrazierInspectorPreviews";
        static readonly string[] Layers={"01_Flames","02_Sparks","03_Smoke","04_Glow"};
        [Serializable] class Recipe { public Tongue[] tongues; public SourceEvent[] events; public float[] flicker; }
        [Serializable] class Tongue { public float dx,y,h,w,env; }
        [Serializable] class SourceEvent { public int tongue; public string kind; public float x,y,s; }
        static Recipe recipe;

        static void Verify()
        {
            if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets" || Application.productName!="VFXDemo"
                || !(GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset)) throw new Exception("Not the intended VFXDemo URP project.");
        }

        [MenuItem("Tools/PixelFX/Brazier Inspector Only/Build Script-Free Version")]
        public static void Build()
        {
            Verify();
            if(EditorApplication.isPlayingOrWillChangePlaymode) throw new Exception("Exit Play Mode before authoring assets.");
            for(int i=0;i<SceneManager.sceneCount;i++) if(SceneManager.GetSceneAt(i).isDirty) throw new Exception("Save or discard scene edits before rebuilding.");
            foreach(var dir in new[]{"Materials","Textures","Prefabs","Scenes"})Directory.CreateDirectory(Root+"/"+dir);
            AssetDatabase.Refresh();
            recipe=JsonUtility.FromJson<Recipe>(File.ReadAllText(Art+"/BrazierAnimatedRecipe.json"));
            if(recipe.tongues.Length!=11)throw new Exception("Expected eleven source tongues.");
            var full=MakePrefab(true);var pure=MakePrefab(false);AssetDatabase.SaveAssets();
            if(!File.Exists(ScenePath) && !AssetDatabase.CopyAsset("Assets/PixelFX/Brazier/Scenes/BrazierShowcase.unity",ScenePath))throw new Exception("Stage copy failed.");
            var scene=EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
            Replace(scene,"Brazier",full);Replace(scene,"BrazierFlame",pure);
            Replace(scene,"BrazierInspectorParticles",full);Replace(scene,"BrazierInspectorFlameParticles",pure);
            EditorSceneManager.SaveScene(scene);
            Validate();Capture();
            Selection.activeGameObject=SceneRoots().First(x=>x.name=="BrazierInspectorFlameParticles");
            EditorApplication.ExecuteMenuItem("Window/General/Game");
            Debug.Log("[Brazier Inspector] Built native-only prefabs. No MonoBehaviours, Animator, Timeline, source-clock or runtime recipe dependency.");
        }

        static Transform Group(Transform parent,string name,Vector3 position=default)
        {
            var go=new GameObject(name);go.transform.SetParent(parent,false);go.transform.localPosition=position;return go.transform;
        }
        static Material Material(string name,string texture,bool additive,int order,bool sprite=false)
        {
            string tp=Root+"/Textures/"+texture+".png";
            if(!File.Exists(tp) && !AssetDatabase.CopyAsset(Art+"/"+texture+".png",tp))throw new Exception("Missing artwork: "+texture);
            if(texture=="Spark")
            {
                // Stretched Billboard's length axis is texture X, unlike the old vertical stamp.
                var stamp=new Texture2D(16,16,TextureFormat.RGBA32,false);var pixels=new Color32[256];
                for(int x=7;x<=9;x++)pixels[8*16+x]=new Color32(255,255,255,255);
                stamp.SetPixels32(pixels);stamp.Apply();var bytes=stamp.EncodeToPNG();UnityEngine.Object.DestroyImmediate(stamp);
                if(!File.ReadAllBytes(tp).SequenceEqual(bytes)){File.WriteAllBytes(tp,bytes);AssetDatabase.ImportAsset(tp,ImportAssetOptions.ForceSynchronousImport);}
            }
            var importer=(TextureImporter)AssetImporter.GetAtPath(tp);
            importer.textureType=sprite?TextureImporterType.Sprite:TextureImporterType.Default;
            importer.sRGBTexture=true;importer.alphaIsTransparency=false;importer.mipmapEnabled=false;
            importer.filterMode=texture=="SoftGlow"?FilterMode.Bilinear:FilterMode.Point;
            importer.wrapMode=TextureWrapMode.Clamp;importer.npotScale=TextureImporterNPOTScale.None;
            importer.textureCompression=TextureImporterCompression.Uncompressed;importer.maxTextureSize=2048;
            if(sprite)
            {
                importer.spriteImportMode=SpriteImportMode.Single;importer.spritePixelsPerUnit=32;
                var settings=new TextureImporterSettings();importer.ReadTextureSettings(settings);
                settings.spriteAlignment=(int)SpriteAlignment.Custom;settings.spritePivot=new Vector2(.5f,3f/40);importer.SetTextureSettings(settings);
            }
            importer.SaveAndReimport();
            var shader=Shader.Find("PixelFX/Brazier Inspector Particle URP");
            if(!shader || ShaderUtil.ShaderHasError(shader))throw new Exception("Inspector particle shader error.");
            string path=Root+"/Materials/"+name+".mat";
            var m=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(!m){m=new Material(shader){name=name};AssetDatabase.CreateAsset(m,path);}
            m.shader=shader;m.mainTexture=AssetDatabase.LoadAssetAtPath<Texture2D>(tp);
            m.SetColor("_Tint",Color.white);m.SetFloat("_Intensity",1);
            m.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);m.SetFloat("_DstBlend",(float)(additive?BlendMode.One:BlendMode.OneMinusSrcAlpha));
            m.renderQueue=3000+order;EditorUtility.SetDirty(m);return m;
        }

        static ParticleSystem Emitter(Transform parent,string name,Material material,int order,uint seed)
        {
            var go=new GameObject(name);if(parent)go.transform.SetParent(parent,false);
            var ps=go.AddComponent<ParticleSystem>();ps.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);
            ps.useAutoRandomSeed=false;ps.randomSeed=seed;
            var main=ps.main;main.duration=3;main.loop=true;main.prewarm=true;main.playOnAwake=true;
            main.startLifetime=1;main.startSpeed=0;main.startSize=1;main.startColor=Color.white;
            main.startRotation=0;main.maxParticles=128;main.simulationSpace=ParticleSystemSimulationSpace.Local;
            main.scalingMode=ParticleSystemScalingMode.Hierarchy;main.cullingMode=ParticleSystemCullingMode.AlwaysSimulate;
            var emission=ps.emission;emission.rateOverTime=0;
            var shape=ps.shape;shape.enabled=false;var lights=ps.lights;lights.enabled=false;
            var r=ps.GetComponent<ParticleSystemRenderer>();r.sharedMaterial=material;
            r.renderMode=ParticleSystemRenderMode.Billboard;r.alignment=ParticleSystemRenderSpace.View;r.allowRoll=false;
            r.sortingOrder=order;r.sortMode=ParticleSystemSortMode.OldestInFront;
            r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;
            r.lightProbeUsage=LightProbeUsage.Off;r.reflectionProbeUsage=ReflectionProbeUsage.Off;
            r.minParticleSize=0;r.maxParticleSize=1;
            r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV});
            return ps;
        }
        static void Rate(ParticleSystem ps,float value){var e=ps.emission;e.rateOverTime=value;}
        static void Life(ParticleSystem ps,float min,float max){var m=ps.main;m.startLifetime=new ParticleSystem.MinMaxCurve(min,max);}
        static void Box(ParticleSystem ps,float width,float height,float depth=.015f)
        {
            var s=ps.shape;s.enabled=true;s.shapeType=ParticleSystemShapeType.Box;s.scale=new Vector3(width,height,depth);
        }
        static void Size(ParticleSystem ps,float min,float max){var m=ps.main;m.startSize=new ParticleSystem.MinMaxCurve(min,max);}
        static void Animate(ParticleSystem ps,int cols,int rows)
        {
            var t=ps.textureSheetAnimation;t.enabled=true;t.mode=ParticleSystemAnimationMode.Grid;
            t.numTilesX=cols;t.numTilesY=rows;t.animation=ParticleSystemAnimationType.WholeSheet;
            t.timeMode=ParticleSystemAnimationTimeMode.Lifetime;t.cycleCount=1;t.startFrame=0;
            t.frameOverTime=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Linear(0,0,1,1));
        }
        static AnimationCurve Drift(float v,float a,float drag,float life)
        {
            var keys=new Keyframe[33];
            for(int i=0;i<keys.Length;i++)
            {
                float u=i/32f,t=u*life,terminal=drag>0?a/drag:0;
                float value=drag>0?terminal+(v-terminal)*Mathf.Exp(-drag*t):v+a*t;
                float tangent=(a-drag*value)*life;
                keys[i]=new Keyframe(u,value/32,tangent/32,tangent/32);
            }
            return new AnimationCurve(keys);
        }
        static void Motion(ParticleSystem ps,float vx0,float vx1,float vy0,float vy1,float ax,float ay,float kx,float ky,float referenceLife)
        {
            var v=ps.velocityOverLifetime;v.enabled=true;v.space=ParticleSystemSimulationSpace.Local;
            v.x=new ParticleSystem.MinMaxCurve(1,Drift(vx0,ax,kx,referenceLife),Drift(vx1,ax,kx,referenceLife));
            // Source coordinates point down, Unity y points up.
            v.y=new ParticleSystem.MinMaxCurve(1,Drift(-vy1,-ay,ky,referenceLife),Drift(-vy0,-ay,ky,referenceLife));
            v.z=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Constant(0,1,0),AnimationCurve.Constant(0,1,0));
        }
        static void Noise(ParticleSystem ps,float x,float y,float z,float frequency)
        {
            var n=ps.noise;n.enabled=true;n.separateAxes=true;n.strengthX=x;n.strengthY=y;n.strengthZ=z;
            n.frequency=frequency;n.scrollSpeed=.45f;n.damping=true;n.quality=ParticleSystemNoiseQuality.High;
            n.octaveCount=2;
        }
        static void Fade(ParticleSystem ps,float alpha=.8f)
        {
            var g=new Gradient();g.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(new Color(1,.55f,.2f),1)},
                new[]{new GradientAlphaKey(alpha,0),new GradientAlphaKey(alpha,.55f),new GradientAlphaKey(0,1)});
            var c=ps.colorOverLifetime;c.enabled=true;c.color=g;
        }
        static ParticleSystem SpentSmoke(Transform layer,int i,Material material)
        {
            var ps=Emitter(layer,"SpentSmoke_"+(i+1).ToString("00")+" - Death sub-emitter",material,1,(uint)(1600+i));
            var main=ps.main;main.loop=false;main.prewarm=false;main.playOnAwake=false;main.maxParticles=32;main.simulationSpace=ParticleSystemSimulationSpace.World;
            Life(ps,.8f,1.4f);Size(ps,.1f,.16f);Animate(ps,8,8);
            var e=ps.emission;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});
            var inherit=ps.inheritVelocity;inherit.enabled=true;inherit.mode=ParticleSystemInheritVelocityMode.Initial;inherit.curve=.6f;
            var f=ps.forceOverLifetime;f.enabled=true;f.space=ParticleSystemSimulationSpace.Local;f.x=3f/32;f.y=16f/32;
            var limit=ps.limitVelocityOverLifetime;limit.enabled=true;limit.limit=100;limit.dampen=0;limit.drag=1.6f;
            limit.multiplyDragByParticleSize=false;limit.multiplyDragByParticleVelocity=false;
            Noise(ps,.025f,.007f,.012f,.8f);
            return ps;
        }
        static void Glow(Transform layer,string name,Material material,Vector3 position,float radius,Color color,float alpha,uint seed)
        {
            var ps=Emitter(layer,name,material,60,seed);ps.transform.localPosition=position;
            var m=ps.main;m.prewarm=false;m.maxParticles=1;m.startLifetime=3;m.startSize=radius*2/32;
            color.a=alpha;m.startColor=color.linear;
            var e=ps.emission;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});
            // Eight visible alpha keys carry a slow flicker. No runtime color sampling.
            var a=new GradientAlphaKey[8];
            for(int j=0;j<8;j++){float u=j/7f;int frame=j==7?0:Mathf.FloorToInt(u*90)%90;a[j]=new GradientAlphaKey(recipe.flicker[frame],u);}
            var g=new Gradient();g.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},a);
            var c=ps.colorOverLifetime;c.enabled=true;c.color=g;
        }

        static GameObject MakePrefab(bool prop)
        {
            string name=prop?"BrazierInspectorParticles":"BrazierInspectorFlameParticles";
            var rootPS=Emitter(null,name,null,0,8);var root=rootPS.gameObject;
            var emission=rootPS.emission;emission.enabled=false;var main=rootPS.main;main.prewarm=false;main.maxParticles=1;
            root.GetComponent<ParticleSystemRenderer>().enabled=false;
            var mouth=Group(root.transform,"Firemouth - fixed anchor",new Vector3(0,prop?25f/32:0,0));
            var layers=Layers.Select(n=>Group(mouth,n)).ToArray();
            var puffMat=Material("FirePuff","FirePuff",false,40);var lickMat=Material("DetachedLick","DetachedLick",false,39);
            var plumeMat=Material("SmokePlume","SmokePlume",false,0);var spentMat=Material("SmokeSpent","SmokeSpent",false,1);
            var sparkMat=Material("Sparks","Spark",false,50);var emberMat=Material("Embers","Ember",false,51);
            var glowMat=Material("Glow","SoftGlow",true,60);
            for(int i=0;i<11;i++)
            {
                string n="Tongue_"+(i+1).ToString("00");var t=recipe.tongues[i];
                var ps=Emitter(layers[0],n+" - animated core",Material(n,n,false,10+i),10+i,(uint)(100+i));
                main=ps.main;main.prewarm=false;main.startLifetime=3;main.startSize=2;main.maxParticles=1;
                var e=ps.emission;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});Animate(ps,10,9);
                ps.GetComponent<ParticleSystemRenderer>().pivot=new Vector3(0,60f/64-.5f,0);
                var source=recipe.events.Where(x=>x.kind=="puff" && x.tongue==i).ToArray();
                float x=source.Average(x=>x.x),y=source.Average(x=>x.y);
                // A visible, editable emitter volume approximates the moving source tip envelope.
                float sx=Mathf.Clamp(source.Max(q=>q.x)-source.Min(q=>q.x),1.5f,5f);
                float sy=Mathf.Clamp(source.Max(q=>q.y)-source.Min(q=>q.y),2,9);
                var puff=Emitter(layers[0],"Puffs_"+(i+1).ToString("00")+" - tip volume",puffMat,40,(uint)(400+i*31));
                puff.transform.localPosition=new Vector3(x/32,-y/32,0);Box(puff,sx/32,sy/32);
                Rate(puff,8);Life(puff,.14f,.3f);Size(puff,.8f*(.8f+.6f*t.env)/2,1.6f*(.8f+.6f*t.env)/2);
                Animate(puff,8,8);Motion(puff,-4,4,-30,-15,0,-95,5,3.2f,.22f);
                var smoke=SpentSmoke(layers[2],i,spentMat);
                var sub=puff.subEmitters;sub.enabled=true;sub.AddSubEmitter(smoke,ParticleSystemSubEmitterType.Death,ParticleSystemSubEmitterProperties.InheritNothing,.45f);
                var lick=Emitter(layers[0],"Licks_"+(i+1).ToString("00")+" - tip volume",lickMat,39,(uint)(900+i*17));
                lick.transform.localPosition=puff.transform.localPosition+Vector3.up*2/32;
                Box(lick,sx/32,sy/32);Rate(lick,4);Life(lick,.26f,.26f);
                Size(lick,24f/32*.9f*(.8f+.5f*t.env)/2,24f/32*1.6f*(.8f+.5f*t.env)/2);
                Animate(lick,8,8);Motion(lick,-3,3,-22,-12,0,0,0,0,.26f);
            }
            var plume=Emitter(layers[2],"Rising smoke - Emission 14 per second",plumeMat,0,2208);
            plume.transform.localPosition=new Vector3(0,28.6f/32,0);Box(plume,9.8f/32,6f/32,.045f);
            Rate(plume,14);Life(plume,1.6f,2.4f);Size(plume,.7f,1.1f);Animate(plume,8,8);
            Motion(plume,-2,2,-17,-10,3,-20,1.6f,1,2);Noise(plume,.055f,.008f,.02f,.8f);
            for(int side=-1;side<=1;side+=2)
            {
                var spark=Emitter(layers[1],side<0?"Fast sparks - left":"Fast sparks - right",sparkMat,50,(uint)(2400+side));
                spark.transform.localPosition=new Vector3(side*4f/32,11f/32,0);Box(spark,8f/32,14f/32,.05f);
                Rate(spark,10);Life(spark,.7f,1.7f);Size(spark,16f/32,16f/32);
                Motion(spark,side<0?-40:0,side<0?0:40,-150,-70,0,-22,1.9f,1.9f,1.2f);
                Noise(spark,.07f,.012f,.025f,1.5f);Fade(spark);
                var r=spark.GetComponent<ParticleSystemRenderer>();r.renderMode=ParticleSystemRenderMode.Stretch;
                r.cameraVelocityScale=0;r.velocityScale=.01f;r.lengthScale=.65f;r.freeformStretching=true;r.rotateWithStretchDirection=true;
                var shrink=spark.sizeOverLifetime;shrink.enabled=true;shrink.separateAxes=true;
                shrink.x=new ParticleSystem.MinMaxCurve(1,new AnimationCurve(new Keyframe(0,1),new Keyframe(.25f,.9f),new Keyframe(.6f,.45f),new Keyframe(1,.2f)));
                shrink.y=1;shrink.z=1;
                var colors=spark.colorOverLifetime;var g=new Gradient();g.SetKeys(new[]{new GradientColorKey(new Color(1,.95f,.65f),0),new GradientColorKey(new Color(1,.55f,.16f),.6f),new GradientColorKey(new Color(.8f,.13f,.08f),1)},new[]{new GradientAlphaKey(1,0),new GradientAlphaKey(1,.65f),new GradientAlphaKey(0,1)});colors.color=g;
            }
            var embers=Emitter(layers[1],"Floating embers - Emission 10 per second",emberMat,51,2608);
            embers.transform.localPosition=new Vector3(0,17.6f/32,0);Box(embers,14f/32,16f/32,.05f);
            Rate(embers,10);Life(embers,1.1f,2.4f);Size(embers,.25f,.25f);
            Motion(embers,-15,15,-60,-25,0,-30,1.6f,1.6f,1.75f);Noise(embers,.12f,.025f,.03f,1.2f);Fade(embers);
            Glow(layers[3],"Broad warm wash",glowMat,new Vector3(0,11.2f/32,0),87,new Color(1,.712f,.365f),.22f*1.4f*.45f,2801);
            Glow(layers[3],"Upper warm wash",glowMat,new Vector3(0,24f/32,0),58,new Color(1,.712f,.365f),.34f*1.4f*.45f,2802);
            Glow(layers[3],"Hot base glow",glowMat,new Vector3(0,6.4f/32,0),18.56f,new Color(1,.886f,.42f),.2f*1.4f*.45f,2803);
            Glow(layers[3],"White heart glow",glowMat,new Vector3(0,2f/32,0),8,Color.white,.14f*1.4f*.45f,2804);
            if(prop)
            {
                var holder=Group(root.transform,"00_BrazierProp - ordinary SpriteRenderers");
                for(int i=0;i<2;i++)
                {
                    string n=i==0?"PropBack":"PropFront";var mat=Material(n,n,false,i==0?2:30,true);
                    var sr=Group(holder,n).gameObject.AddComponent<SpriteRenderer>();sr.sprite=AssetDatabase.LoadAssetAtPath<Sprite>(Root+"/Textures/"+n+".png");sr.sharedMaterial=mat;sr.sortingOrder=i==0?2:30;
                }
            }
            var prefab=PrefabUtility.SaveAsPrefabAsset(root,Root+"/Prefabs/"+name+".prefab");UnityEngine.Object.DestroyImmediate(root);return prefab;
        }

        static void Replace(Scene scene,string name,GameObject prefab)
        {
            var old=scene.GetRootGameObjects().FirstOrDefault(x=>x.name==name);if(!old)return;
            var position=old.transform.position;var scale=old.transform.localScale;UnityEngine.Object.DestroyImmediate(old);
            var instance=(GameObject)PrefabUtility.InstantiatePrefab(prefab,scene);instance.transform.SetPositionAndRotation(position,Quaternion.identity);instance.transform.localScale=scale;
        }
        static GameObject[] SceneRoots(){return SceneManager.GetActiveScene().GetRootGameObjects().Where(x=>x.name=="BrazierInspectorParticles" || x.name=="BrazierInspectorFlameParticles").ToArray();}
        static ParticleSystem[] MainSystems(GameObject root)
        {
            var all=root.GetComponentsInChildren<ParticleSystem>(true);
            var subs=new HashSet<ParticleSystem>(all.SelectMany(p=>Enumerable.Range(0,p.subEmitters.subEmittersCount).Select(i=>p.subEmitters.GetSubEmitterSystem(i))));
            return all.Where(x=>!subs.Contains(x)).ToArray();
        }
        static void Simulate(float time,bool restart)
        {
            foreach(var root in SceneRoots())
            {
                if(restart)root.GetComponent<ParticleSystem>().Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
                foreach(var ps in MainSystems(root)){ps.Simulate(time,false,restart,true);ps.Pause(false);}
            }
        }

        [Serializable] class Report
        {
            public string dataPath,product,scene,timestamp;
            public bool passed,isPlaying,noMonoBehaviours,noAnimator,noRecipeDependency,noVfxLights;
            public int systemsPerEffect,deathSubEmitters,particles;
            public string[] componentTypes;
            public int[] counts;
        }
        [MenuItem("Tools/PixelFX/Brazier Inspector Only/Validate Script-Free Prefabs")]
        public static void Validate()
        {
            Verify();var roots=SceneRoots();if(roots.Length!=2)throw new Exception("Open the Inspector-only showcase.");
            foreach(var n in new[]{"BrazierInspectorParticles","BrazierInspectorFlameParticles"})
            {
                var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/"+n+".prefab");
                foreach(var target in new[]{prefab,roots.First(x=>x.name==n)})
                {
                    var components=target.GetComponentsInChildren<Component>(true);
                    if(components.Any(x=>x==null || !(x is Transform || x is ParticleSystem || x is ParticleSystemRenderer || x is SpriteRenderer)))throw new Exception("Only native rendering/particle components allowed: "+n);
                    if(target.GetComponentsInChildren<MonoBehaviour>(true).Length!=0 || target.GetComponentsInChildren<Light>(true).Length!=0)throw new Exception("Unexpected script or Light.");
                    var systems=target.GetComponentsInChildren<ParticleSystem>(true);
                    foreach(var ps in systems)
                    {
                        var r=ps.GetComponent<ParticleSystemRenderer>();
                        if(ps.lights.enabled || ps.main.stopAction==ParticleSystemStopAction.Callback)throw new Exception("Light/callback dependency.");
                        if(r.enabled && (!r.sharedMaterial || !r.sharedMaterial.mainTexture || r.alignment!=ParticleSystemRenderSpace.View || r.allowRoll))throw new Exception("Invalid native billboard: "+ps.name);
                    }
                    if(systems.Count(x=>x.name.StartsWith("Tongue_"))!=11 || systems.Count(x=>x.subEmitters.subEmittersCount==1)!=11)throw new Exception("Tongue/death-link count mismatch.");
                    foreach(var p in systems.Where(x=>x.subEmitters.subEmittersCount>0))
                    {
                        var sub=p.subEmitters;var child=sub.GetSubEmitterSystem(0);
                        if(sub.GetSubEmitterType(0)!=ParticleSystemSubEmitterType.Death || !Mathf.Approximately(sub.GetSubEmitterEmitProbability(0),.45f) || !child.transform.IsChildOf(target.transform.Find("Firemouth - fixed anchor/03_Smoke")))throw new Exception("Invalid native death sub-emitter.");
                    }
                    foreach(var layer in Layers)if(!target.transform.Find("Firemouth - fixed anchor/"+layer))throw new Exception("Missing layer: "+layer);
                }
                var deps=AssetDatabase.GetDependencies(Root+"/Prefabs/"+n+".prefab",true);
                if(deps.Any(x=>x.EndsWith(".cs") || x.EndsWith(".json") || x.Contains("AnimatedParticles") || x.Contains("/Runtime/")))throw new Exception("Runtime script/recipe/old-version dependency.");
            }
            var full=roots.First(x=>x.name=="BrazierInspectorParticles");
            if(full.GetComponentsInChildren<SpriteRenderer>(true).Length!=2 || roots.First(x=>x!=full).GetComponentsInChildren<SpriteRenderer>(true).Length!=0)throw new Exception("Prop rendering mismatch.");
            var psAll=roots.SelectMany(x=>x.GetComponentsInChildren<ParticleSystem>(true)).ToArray();
            File.WriteAllText("Library/PixelFX_BrazierInspector_Validation.json",JsonUtility.ToJson(new Report{
                dataPath=Application.dataPath,product=Application.productName,scene=SceneManager.GetActiveScene().path,timestamp=DateTime.Now.ToString("O"),passed=true,isPlaying=Application.isPlaying,
                noMonoBehaviours=true,noAnimator=true,noRecipeDependency=true,noVfxLights=true,systemsPerEffect=psAll.Length/2,deathSubEmitters=11,particles=psAll.Sum(x=>x.particleCount),
                componentTypes=full.GetComponentsInChildren<Component>(true).Select(x=>x.GetType().Name).Distinct().ToArray(),counts=psAll.Select(x=>x.particleCount).ToArray()},true));
            Debug.Log("[Brazier Inspector] PASS: zero attached scripts; no old version/recipe dependency; eleven cores and eleven native 45% Death sub-emitters; native View billboards; no VFX Lights.");
        }

        [MenuItem("Tools/PixelFX/Brazier Inspector Only/Capture Native Preview")]
        public static void Capture()
        {
            Verify();Directory.CreateDirectory(Preview);Simulate(3.8f,true);
            var roots=SceneRoots();var full=roots.First(x=>x.name=="BrazierInspectorParticles");var pure=roots.First(x=>x!=full);
            var go=new GameObject("Temporary Inspector-only capture camera"){hideFlags=HideFlags.HideAndDontSave};var camera=go.AddComponent<Camera>();
            camera.CopyFrom(Camera.main);camera.enabled=false;camera.GetUniversalAdditionalCameraData().renderPostProcessing=false;
            camera.transform.SetPositionAndRotation(Camera.main.transform.position,Camera.main.transform.rotation);
            try
            {
                Render(camera,"Combined",1280,720);
                camera.orthographic=true;camera.orthographicSize=74f/32;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(36/255f,34/255f,43/255f);
                camera.transform.SetPositionAndRotation(full.transform.position+new Vector3(0,62f/32,-10),Quaternion.identity);
                Render(camera,"SourcePhase_0.8",448,592);
                var all=SceneManager.GetActiveScene().GetRootGameObjects().SelectMany(x=>x.GetComponentsInChildren<Renderer>()).ToArray();var enabled=Array.ConvertAll(all,x=>x.enabled);
                try
                {
                    camera.transform.position=pure.transform.position+new Vector3(0,37f/32,-10);
                    foreach(var layer in Layers)
                    {
                        var t=pure.transform.Find("Firemouth - fixed anchor/"+layer);
                        for(int i=0;i<all.Length;i++)all[i].enabled=enabled[i]&&all[i].transform.IsChildOf(t);
                        Render(camera,layer,448,592);
                    }
                    // Confirm a Death sub-emitter really emits; not merely a serialized link.
                    foreach(var ps in pure.GetComponentsInChildren<ParticleSystem>())
                        if(ps.name.StartsWith("SpentSmoke_"))Debug.Log("[Brazier Inspector] Live sub-smoke "+ps.name+": "+ps.particleCount);
                }
                finally{for(int i=0;i<all.Length;i++)all[i].enabled=enabled[i];}
                camera.orthographicSize=2.1f;var center=full.transform.position+new Vector3(0,1.5f,0);
                camera.transform.position=center+Quaternion.Euler(55,30,0)*new Vector3(0,0,-10);camera.transform.LookAt(center);Render(camera,"Oblique55deg",640,640);
            }
            finally{UnityEngine.Object.DestroyImmediate(go);}
            Validate();
        }
        static void Render(Camera camera,string name,int width,int height)
        {
            var rt=RenderTexture.GetTemporary(width,height,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);var previous=RenderTexture.active;Texture2D image=null;
            try
            {
                camera.aspect=(float)width/height;RenderPipeline.SubmitRenderRequest(camera,new UniversalRenderPipeline.SingleCameraRequest{destination=rt});
                RenderTexture.active=rt;image=new Texture2D(width,height,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,width,height),0,0);image.Apply();File.WriteAllBytes(Preview+"/"+name+".png",image.EncodeToPNG());
            }
            finally{RenderTexture.active=previous;RenderTexture.ReleaseTemporary(rt);if(image)UnityEngine.Object.DestroyImmediate(image);}
        }

        [MenuItem("Tools/PixelFX/Brazier Inspector Only/Capture Native Motion")]
        public static void MotionCapture()
        {
            Verify();Directory.CreateDirectory(Preview+"/Motion");
            var go=new GameObject("Temporary native motion camera"){hideFlags=HideFlags.HideAndDontSave};var camera=go.AddComponent<Camera>();
            camera.CopyFrom(Camera.main);camera.enabled=false;camera.GetUniversalAdditionalCameraData().renderPostProcessing=false;
            camera.transform.SetPositionAndRotation(Camera.main.transform.position,Camera.main.transform.rotation);
            try
            {
                Simulate(3,true);
                for(int frame=0;frame<90;frame++){Render(camera,"Motion/Frame_"+frame.ToString("000"),960,540);Simulate(1f/30,false);}
            }
            finally{UnityEngine.Object.DestroyImmediate(go);Simulate(3.8f,true);}
            Validate();Debug.Log("[Brazier Inspector] Captured 90 native simulation frames. No SetParticles/Emit/Update bridge used.");
        }

        [Serializable] class LiveReport
        {
            public bool passed,isPlaying,motionObserved,emissionZeroStops,emissionRestores;
            public int deathSmokeParticles,coreParticles,embersBefore,embersOff,embersRestored;
            public string scene;
        }
        [MenuItem("Tools/PixelFX/Brazier Inspector Only/Verify Live Playback and Emission")]
        public static void VerifyLivePlayback()
        {
            Verify();if(!Application.isPlaying)throw new Exception("Enter Play Mode first; this check observes actual engine playback.");
            var root=SceneRoots().First(x=>x.name=="BrazierInspectorFlameParticles");
            var ember=root.GetComponentsInChildren<ParticleSystem>().First(x=>x.name.StartsWith("Floating embers"));
            var sample=new ParticleSystem.Particle[128];int initial=ember.GetParticles(sample);
            if(initial==0)throw new Exception("Wait for particle startup before checking.");
            Vector3 before=sample[0].position;float oldRate=ember.emission.rateOverTime.constant;
            var report=new LiveReport{isPlaying=true,embersBefore=initial,scene=SceneManager.GetActiveScene().path};
            int stage=0;double at=EditorApplication.timeSinceStartup;EditorApplication.CallbackFunction tick=null;
            tick=()=>
            {
                if(!Application.isPlaying || !ember){EditorApplication.update-=tick;return;}
                double elapsed=EditorApplication.timeSinceStartup-at;
                if(elapsed<(stage==0?.5:3))return;
                if(stage==0)
                {
                    int count=ember.GetParticles(sample);report.motionObserved=count>0 && Vector3.Distance(before,sample[0].position)>.001f;
                    var emission=ember.emission;emission.rateOverTime=0;
                }
                else if(stage==1)
                {
                    report.embersOff=ember.particleCount;report.emissionZeroStops=report.embersOff==0;
                    var emission=ember.emission;emission.rateOverTime=oldRate;
                }
                else
                {
                    EditorApplication.update-=tick;report.embersRestored=ember.particleCount;report.emissionRestores=report.embersRestored>0;
                    var all=root.GetComponentsInChildren<ParticleSystem>();
                    report.deathSmokeParticles=all.Where(x=>x.name.StartsWith("SpentSmoke_")).Sum(x=>x.particleCount);
                    report.coreParticles=all.Where(x=>x.name.StartsWith("Tongue_")).Sum(x=>x.particleCount);
                    report.passed=report.motionObserved && report.emissionZeroStops && report.emissionRestores && report.deathSmokeParticles>0 && report.coreParticles==11;
                    File.WriteAllText("Library/PixelFX_BrazierInspector_LivePlayback.json",JsonUtility.ToJson(report,true));
                    Validate();Debug.Log("[Brazier Inspector] Actual Play Mode / native Emission check: "+report.passed);return;
                }
                stage++;at=EditorApplication.timeSinceStartup;
            };
            EditorApplication.update+=tick;
        }
    }
}
