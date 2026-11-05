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
using PixelFX.Brazier.Particles;

namespace PixelFX.Brazier.AnimatedParticles.Editor
{
    public static class BrazierAnimatedSetup
    {
        const string Root="Assets/PixelFX/Brazier/AnimatedParticles";
        const string ScenePath=Root+"/Scenes/BrazierAnimatedShowcase.unity";
        const string SourceScene="Assets/PixelFX/Brazier/Scenes/BrazierShowcase.unity";
        const string Preview="BrazierAnimatedPreviews";
        static readonly string[] Layers={"01_Flames","02_Sparks","03_Smoke","04_Glow"};
        static void Verify()
        {
            if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets" || Application.productName!="VFXDemo"
                || !(GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset)) throw new Exception("Wrong Unity target or render pipeline.");
        }

        [MenuItem("Tools/PixelFX/Brazier Animated Particles/Build Source Driven Version %#&u")]
        public static void Build()
        {
            Verify();
            if(EditorApplication.isPlayingOrWillChangePlaymode) throw new Exception("Exit Play Mode before building.");
            foreach(var folder in new[]{"Materials","Prefabs","Scenes"}) Directory.CreateDirectory(Root+"/"+folder);
            AssetDatabase.Refresh();
            var full=MakePrefab(true);var pure=MakePrefab(false);
            AssetDatabase.SaveAssets();
            if(!File.Exists(ScenePath) && !AssetDatabase.CopyAsset(SourceScene,ScenePath)) throw new Exception("Could not copy stage.");
            // User explicitly authorized discarding all unsaved scene edits. Old saved scenes remain intact.
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var scene=EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
            Replace(scene,"Brazier",full);Replace(scene,"BrazierFlame",pure);
            Replace(scene,"BrazierAnimatedParticles",full);Replace(scene,"BrazierAnimatedFlameParticles",pure);
            EditorSceneManager.SaveScene(scene);
            foreach(var d in Drivers()) d.Seek(.8f);
            Selection.activeObject=pure;
            EditorGUIUtility.PingObject(pure);
            EditorApplication.ExecuteMenuItem("Window/General/Game");
            Validate();Capture();
            Debug.Log("[Brazier Animated] Source-driven particle prefabs built. Old assets kept; unsaved old scene edits discarded as requested.");
        }

        static Transform Group(Transform parent,string name)
        {
            var go=new GameObject(name);go.transform.SetParent(parent,false);return go.transform;
        }
        static Material Mat(string name,string texture,bool additive,int order,bool sprite=false)
        {
            string texturePath=Root+"/Textures/"+texture+".png";
            var ti=(TextureImporter)AssetImporter.GetAtPath(texturePath);
            ti.textureType=sprite?TextureImporterType.Sprite:TextureImporterType.Default;
            ti.sRGBTexture=true;ti.alphaIsTransparency=false;ti.mipmapEnabled=false;
            ti.filterMode=texture=="SoftGlow"?FilterMode.Bilinear:FilterMode.Point;
            ti.wrapMode=TextureWrapMode.Clamp;ti.npotScale=TextureImporterNPOTScale.None;
            ti.textureCompression=TextureImporterCompression.Uncompressed;ti.maxTextureSize=2048;
            if(sprite){ti.spritePixelsPerUnit=32;ti.spriteImportMode=SpriteImportMode.Single;
                var settings=new TextureImporterSettings();ti.ReadTextureSettings(settings);settings.spriteAlignment=(int)SpriteAlignment.Custom;settings.spritePivot=new Vector2(.5f,3f/40);ti.SetTextureSettings(settings);}
            ti.SaveAndReimport();
            var shader=Shader.Find("PixelFX/Brazier Native Particle URP");
            if(!shader || ShaderUtil.ShaderHasError(shader)) throw new Exception("Particle shader unavailable.");
            string path=Root+"/Materials/"+name+".mat";
            var m=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(!m){m=new Material(shader){name=name};AssetDatabase.CreateAsset(m,path);}
            m.mainTexture=AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);m.SetColor("_Tint",Color.white);
            m.SetFloat("_Intensity",1);m.SetFloat("_FaceCamera",1);
            m.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);m.SetFloat("_DstBlend",(float)(additive?BlendMode.One:BlendMode.OneMinusSrcAlpha));
            m.renderQueue=3000+order;EditorUtility.SetDirty(m);return m;
        }
        static ParticleSystem Emitter(Transform parent,string name,Material material,int order)
        {
            var go=new GameObject(name);go.transform.SetParent(parent,false);
            var ps=go.AddComponent<ParticleSystem>();ps.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);
            ps.useAutoRandomSeed=false;ps.randomSeed=8;
            var main=ps.main;main.duration=3;main.loop=true;main.prewarm=false;main.playOnAwake=false;
            main.startSpeed=0;main.startSize=1;main.startLifetime=3;main.startColor=Color.white;
            main.maxParticles=512;main.simulationSpace=ParticleSystemSimulationSpace.Local;
            main.scalingMode=ParticleSystemScalingMode.Hierarchy;main.cullingMode=ParticleSystemCullingMode.AlwaysSimulate;
            var emission=ps.emission;emission.rateOverTime=0;
            var shape=ps.shape;shape.enabled=false;var lights=ps.lights;lights.enabled=false;
            var r=go.GetComponent<ParticleSystemRenderer>();r.sharedMaterial=material;
            r.renderMode=ParticleSystemRenderMode.Billboard;r.alignment=ParticleSystemRenderSpace.View;r.allowRoll=false;
            r.sortingOrder=order;r.sortMode=ParticleSystemSortMode.OldestInFront;
            r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;
            r.lightProbeUsage=LightProbeUsage.Off;r.reflectionProbeUsage=ReflectionProbeUsage.Off;
            r.minParticleSize=0;r.maxParticleSize=1;
            r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV});
            var binding=go.AddComponent<ParticleMaterialFacing>();
            var layout=parent.GetComponent<BrazierCameraLayout>();binding.alignmentMaterial=layout?layout.facingMaterial:material;
            return ps;
        }
        static void Animate(ParticleSystem ps,int cols,int rows)
        {
            var t=ps.textureSheetAnimation;t.enabled=true;t.mode=ParticleSystemAnimationMode.Grid;
            t.numTilesX=cols;t.numTilesY=rows;t.animation=ParticleSystemAnimationType.WholeSheet;
            t.timeMode=ParticleSystemAnimationTimeMode.Lifetime;t.cycleCount=1;
            t.frameOverTime=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Linear(0,0,1,1));t.startFrame=0;
        }
        static GameObject MakePrefab(bool prop)
        {
            string name=prop?"BrazierAnimatedParticles":"BrazierAnimatedFlameParticles";
            var root=new GameObject(name);var mouth=Group(root.transform,"Firemouth - fixed world anchor");
            mouth.localPosition=prop?new Vector3(0,25f/32,0):Vector3.zero;
            var flameMaterial=Mat("Tongue_01","Tongue_01",false,10);
            var puffMaterial=Mat("FirePuff","FirePuff",false,40);
            var lickMaterial=Mat("DetachedLick","DetachedLick",false,39);
            var smokeMaterial=Mat("SmokePlume","SmokePlume",false,0);
            var spentMaterial=Mat("SmokeSpent","SmokeSpent",false,1);
            var sparkMaterial=Mat("Sparks","Spark",false,50);
            var emberMaterial=Mat("Embers","Ember",false,51);
            var crossMaterial=Mat("EmberCross","EmberCross",false,52);
            var glowMaterial=Mat("Glow","SoftGlow",true,60);
            var controls=new[]{flameMaterial,sparkMaterial,smokeMaterial,glowMaterial};
            var layers=new Transform[4];
            for(int i=0;i<4;i++){layers[i]=Group(mouth,Layers[i]);layers[i].gameObject.AddComponent<BrazierCameraLayout>().facingMaterial=controls[i];}
            var tongues=new ParticleSystem[11];
            for(int i=0;i<11;i++)
            {
                string n="Tongue_"+(i+1).ToString("00");var mat=i==0?flameMaterial:Mat(n,n,false,10+i);
                var ps=Emitter(layers[0],n,mat,10+i);tongues[i]=ps;
                var main=ps.main;main.maxParticles=1;main.startLifetime=3;main.startSize=2;
                var e=ps.emission;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});
                ps.GetComponent<ParticleSystemRenderer>().pivot=new Vector3(0,60f/64-.5f,0);Animate(ps,10,9);
            }
            var d=root.AddComponent<BrazierSourceParticles>();d.glowStrength=.45f;d.sourceRecipe=AssetDatabase.LoadAssetAtPath<TextAsset>(Root+"/Textures/BrazierAnimatedRecipe.json");d.tongues=tongues;
            d.puffs=Emitter(layers[0],"Tip-born fire puffs",puffMaterial,40);Animate(d.puffs,8,8);
            d.licks=Emitter(layers[0],"Tip-born detached licks",lickMaterial,39);Animate(d.licks,8,8);
            d.plume=Emitter(layers[2],"Source plume",smokeMaterial,0);Animate(d.plume,8,8);
            d.spentSmoke=Emitter(layers[2],"Linked fire-to-smoke",spentMaterial,1);Animate(d.spentSmoke,8,8);
            d.sparks=Emitter(layers[1],"Source rising streaks",sparkMaterial,50);
            var sparkMain=d.sparks.main;sparkMain.startSize3D=true;
            d.sparks.GetComponent<ParticleSystemRenderer>().pivot=new Vector3(0,0,0);
            d.embers=Emitter(layers[1],"Source floating embers",emberMaterial,51);
            d.crosses=Emitter(layers[1],"Source cross embers",crossMaterial,52);
            d.glow=Emitter(layers[3],"Warm wash and particle halos - no Light",glowMaterial,60);
            if(prop)
            {
                var body=Group(root.transform,"00_BrazierProp - SpriteRenderers, not particles");
                for(int i=0;i<2;i++)
                {
                    string n=i==0?"PropBack":"PropFront";
                    var mat=Mat(n,n,false,i==0?2:30,true);var holder=Group(body,n);
                    var sr=holder.gameObject.AddComponent<SpriteRenderer>();sr.sprite=AssetDatabase.LoadAssetAtPath<Sprite>(Root+"/Textures/"+n+".png");
                    sr.sharedMaterial=mat;sr.sortingOrder=i==0?2:30;
                }
            }
            var prefab=PrefabUtility.SaveAsPrefabAsset(root,Root+"/Prefabs/"+name+".prefab");UnityEngine.Object.DestroyImmediate(root);return prefab;
        }

        static void Replace(Scene scene,string oldName,GameObject prefab)
        {
            var old=scene.GetRootGameObjects().FirstOrDefault(x=>x.name==oldName);
            if(!old)return;
            var position=old.transform.position;var scale=old.transform.localScale;
            UnityEngine.Object.DestroyImmediate(old);
            var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab,scene);go.transform.SetPositionAndRotation(position,Quaternion.identity);go.transform.localScale=scale;
        }
        static BrazierSourceParticles[] Drivers() {return SceneManager.GetActiveScene().GetRootGameObjects().SelectMany(x=>x.GetComponentsInChildren<BrazierSourceParticles>()).ToArray();}

        [MenuItem("Tools/PixelFX/Brazier Animated Particles/Validate %#&n")]
        public static void Validate()
        {
            Verify();var drivers=Drivers();
            if(drivers.Length!=2)throw new Exception("Expected full and standalone versions.");
            foreach(var d in drivers)
            {
                if(d.tongues.Length!=11 || d.GetComponentsInChildren<Light>(true).Length!=0)throw new Exception("Missing tongues or unwanted VFX Light.");
                foreach(var ps in d.GetComponentsInChildren<ParticleSystem>(true))
                {
                    var r=ps.GetComponent<ParticleSystemRenderer>();
                    if(ps.lights.enabled || !r.sharedMaterial || !r.sharedMaterial.mainTexture || r.allowRoll || r.alignment!=ParticleSystemRenderSpace.View)throw new Exception("Invalid particle: "+ps.name);
                }
                foreach(var ps in d.tongues)if(!ps.textureSheetAnimation.enabled || ps.textureSheetAnimation.numTilesX!=10 || ps.main.maxParticles!=1)throw new Exception("Core tongue atlas mismatch.");
                var mouth=d.transform.Find("Firemouth - fixed world anchor");
                foreach(var n in Layers)if(!mouth.Find(n) || mouth.Find(n).localPosition!=Vector3.zero)throw new Exception("Invalid layer anchor.");
                var test=d.puffs.GetComponent<ParticleMaterialFacing>();var m=test.alignmentMaterial;var temporary=new Material(m);
                test.alignmentMaterial=temporary;temporary.SetFloat("_FaceCamera",0);test.ApplyMaterial();
                if(d.puffs.GetComponent<ParticleSystemRenderer>().alignment!=ParticleSystemRenderSpace.Local)throw new Exception("Facing OFF failed.");
                temporary.SetFloat("_FaceCamera",1);test.ApplyMaterial();test.alignmentMaterial=m;test.ApplyMaterial();UnityEngine.Object.DestroyImmediate(temporary);
            }
            var prop=drivers.First(x=>x.name=="BrazierAnimatedParticles").transform.Find("00_BrazierProp - SpriteRenderers, not particles");
            if(!prop || prop.GetComponentsInChildren<ParticleSystem>().Length!=0 || prop.GetComponentsInChildren<SpriteRenderer>().Length!=2)throw new Exception("Prop must be ordinary SpriteRenderers.");
            File.WriteAllText("Library/PixelFX_BrazierAnimated_Validation.json",JsonUtility.ToJson(new Report{dataPath=Application.dataPath,scene=SceneManager.GetActiveScene().path,passed=true,isPlaying=Application.isPlaying,systems=drivers.Sum(x=>x.GetComponentsInChildren<ParticleSystem>().Length),particles=drivers.Sum(x=>x.GetComponentsInChildren<ParticleSystem>().Sum(p=>p.particleCount)),timestamp=DateTime.Now.ToString("O")},true));
            Debug.Log("[Brazier Animated] PASS: 11 core tongues per effect, four layers, native animated particles, material facing toggle, SpriteRenderer prop, zero VFX Lights.");
        }
        [Serializable] class Report { public string dataPath,scene,timestamp;public bool passed,isPlaying;public int systems,particles; }

        [MenuItem("Tools/PixelFX/Brazier Animated Particles/Capture Comparison %#&m")]
        public static void Capture()
        {
            Verify();Directory.CreateDirectory(Preview);
            var drivers=Drivers();foreach(var d in drivers)d.Seek(.8f);
            var pure=drivers.First(x=>x.name=="BrazierAnimatedFlameParticles");
            var full=drivers.First(x=>x.name=="BrazierAnimatedParticles");
            var go=new GameObject("Temporary animated particle preview"){hideFlags=HideFlags.HideAndDontSave};var camera=go.AddComponent<Camera>();
            camera.CopyFrom(Camera.main);camera.enabled=false;camera.GetUniversalAdditionalCameraData().renderPostProcessing=false;
            camera.transform.SetPositionAndRotation(Camera.main.transform.position,Camera.main.transform.rotation);
            try
            {
                Render(camera,"Combined",1280,720);
                camera.orthographic=true;camera.orthographicSize=74f/32;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(36/255f,34/255f,43/255f);
                camera.transform.SetPositionAndRotation(full.transform.position+new Vector3(0,62f/32,-10),Quaternion.identity);
                Render(camera,"SourcePhase_0.8",448,592);
                var all=SceneManager.GetActiveScene().GetRootGameObjects().SelectMany(x=>x.GetComponentsInChildren<Renderer>()).ToArray();var state=Array.ConvertAll(all,x=>x.enabled);
                try
                {
                    camera.transform.position=pure.transform.position+new Vector3(0,37f/32,-10);
                    for(int layer=0;layer<4;layer++)
                    {
                        var t=pure.transform.Find("Firemouth - fixed world anchor/"+Layers[layer]);
                        for(int j=0;j<all.Length;j++)all[j].enabled=state[j]&&all[j].transform.IsChildOf(t);
                        Render(camera,Layers[layer],448,592);
                    }
                }
                finally{for(int j=0;j<all.Length;j++)all[j].enabled=state[j];}
                var center=full.transform.position+new Vector3(0,1.5f,0);
                camera.orthographicSize=2.1f;camera.transform.position=center+Quaternion.Euler(55,30,0)*new Vector3(0,0,-10);camera.transform.LookAt(center);
                var anchor=full.transform.Find("Firemouth - fixed world anchor").position;
                Render(camera,"Oblique55deg",640,640);
                if(Vector3.Distance(anchor,full.transform.Find("Firemouth - fixed world anchor").position)>.0001f)throw new Exception("Firemouth moved with camera.");
            }
            finally{UnityEngine.Object.DestroyImmediate(go);}
            Validate();Debug.Log("[Brazier Animated] Captured source-phase comparison, four isolated layers and 55 degree camera preview.");
        }
        static void Render(Camera camera,string name,int w,int h)
        {
            var target=RenderTexture.GetTemporary(w,h,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);var previous=RenderTexture.active;Texture2D image=null;
            try{camera.aspect=(float)w/h;RenderPipeline.SubmitRenderRequest(camera,new UniversalRenderPipeline.SingleCameraRequest{destination=target});RenderTexture.active=target;
                image=new Texture2D(w,h,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,w,h),0,0);image.Apply();File.WriteAllBytes(Preview+"/"+name+".png",image.EncodeToPNG());}
            finally{RenderTexture.active=previous;RenderTexture.ReleaseTemporary(target);if(image)UnityEngine.Object.DestroyImmediate(image);}
        }

        [MenuItem("Tools/PixelFX/Brazier Animated Particles/Check Motion and Capture Animation %#&h")]
        public static void Motion()
        {
            Verify();var drivers=Drivers();var full=drivers.First(x=>x.name=="BrazierAnimatedParticles");
            foreach(var d in drivers)d.Seek(.8f);
            var before=full.puffs.GetParticles(new ParticleSystem.Particle[512]);
            for(int step=0;step<180;step++)foreach(var d in drivers)d.StepForPreview(1f/30);
            float time=full.TimeSeconds;
            int[] live=full.GetComponentsInChildren<ParticleSystem>().Select(x=>x.particleCount).ToArray();
            foreach(var d in drivers)d.Seek(time);
            int[] sought=full.GetComponentsInChildren<ParticleSystem>().Select(x=>x.particleCount).ToArray();
            if(!live.SequenceEqual(sought))throw new Exception("Continuous simulation diverged from source seek: "+string.Join(",",live)+" vs "+string.Join(",",sought));
            var go=new GameObject("Temporary motion camera"){hideFlags=HideFlags.HideAndDontSave};var camera=go.AddComponent<Camera>();
            camera.CopyFrom(Camera.main);camera.enabled=false;camera.GetUniversalAdditionalCameraData().renderPostProcessing=false;
            camera.transform.SetPositionAndRotation(Camera.main.transform.position,Camera.main.transform.rotation);
            Directory.CreateDirectory(Preview+"/Motion");
            try
            {
                foreach(var d in drivers)d.Seek(0);
                for(int frame=0;frame<90;frame++)
                {
                    Render(camera,"Motion/Frame_"+frame.ToString("000"),960,540);
                    foreach(var d in drivers)d.StepForPreview(1f/30);
                }
            }
            finally{UnityEngine.Object.DestroyImmediate(go);foreach(var d in drivers)d.Seek(.8f);}
            Validate();
            File.WriteAllText("Library/PixelFX_BrazierAnimated_Motion.json","{\"continuousTwoLoopsMatchedSeek\":true,\"frames\":90,\"fps\":30,\"time\":"+time.ToString(System.Globalization.CultureInfo.InvariantCulture)+"}");
            Debug.Log("[Brazier Animated] Motion PASS: 180 continuous steps match source seek; 90 animation frames captured.");
        }
    }
}
