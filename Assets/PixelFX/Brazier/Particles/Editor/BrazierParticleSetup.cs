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

namespace PixelFX.Brazier.Particles.Editor
{
    public static class BrazierParticleSetup
    {
        const string Root = "Assets/PixelFX/Brazier/Particles";
        const string SourceScene = "Assets/PixelFX/Brazier/Scenes/BrazierShowcase.unity";
        const string ScenePath = Root + "/Scenes/BrazierParticlesShowcase.unity";
        static readonly string[] Layers = { "01_Flames", "02_Sparks", "03_Smoke", "04_Glow" };
        static SourceRecipe recipe;

        [Serializable] class SourceRecipe
        {
            public float duration, pixelsPerUnit;
            public int seed;
            public SourceTongue[] tongues;
            public SourceEmitter sparks, embers, smoke, flamePuffs, detachedLicks, smokeFromPuffs;
        }
        [Serializable] class SourceTongue
        {
            public float x, y, height, halfWidth;
            public bool back;
        }
        [Serializable] class SourceEmitter
        {
            public float rate, accelerationX, accelerationY, dragX, dragY;
            public float[] lifetime, startX, startY, velocityX, velocityY, radius;
        }

        static SourceRecipe ReadRecipe()
        {
            return JsonUtility.FromJson<SourceRecipe>(File.ReadAllText(Root + "/Textures/BrazierSourceRecipe.json"));
        }

        static void VerifyTarget()
        {
            if (Application.dataPath != "/Users/user/Desktop/VFXDemo/VFXDemo/Assets" || Application.productName != "VFXDemo")
                throw new InvalidOperationException("Particle assembly is restricted to VFXDemo.");
            if (!(GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset))
                throw new InvalidOperationException("URP is required.");
        }

        [MenuItem("Tools/PixelFX/Brazier Particles/Build Native Particle Version %#&g")]
        public static void Build()
        {
            VerifyTarget();
            recipe = ReadRecipe();
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new Exception("Exit Play Mode first.");
            for (int i = 0; i < SceneManager.sceneCount; i++)
                if (SceneManager.GetSceneAt(i).isDirty) throw new Exception("Save your scene edits first. No scene was overwritten.");
            foreach (var folder in new[] { "Materials", "Prefabs", "Scenes" }) Directory.CreateDirectory(Root + "/" + folder);
            AssetDatabase.Refresh();
            var shader = Shader.Find("PixelFX/Brazier Native Particle URP");
            if (!shader || ShaderUtil.ShaderHasError(shader)) throw new Exception("Particle shader compilation failed.");

            var flame = Material("Flames", "FlameVariants", false, 10, shader);
            var puffs = Material("FlamePuffs", "FirePuff", false, 11, shader);
            var sparks = Material("Sparks", "SparkVariants", true, 20, shader);
            var smoke = Material("Smoke", "SmokePuff", false, 0, shader);
            var glow = Material("Glow", "SoftGlow", true, 30, shader);
            var prop = Material("BrazierProp", "BrazierProp", false, 8, shader);
            var full = Prefab("BrazierParticles", true, flame, puffs, sparks, smoke, glow, prop);
            var pure = Prefab("BrazierFlameParticles", false, flame, puffs, sparks, smoke, glow, prop);
            AssetDatabase.SaveAssets();

            // Copy the user's saved stage only once. Never regenerate their stage or overwrite
            // subsequent particle-showcase edits when rebuilding the native particle prefabs.
            bool firstBuild = !File.Exists(ScenePath);
            if (firstBuild && !AssetDatabase.CopyAsset(SourceScene, ScenePath)) throw new Exception("Could not copy the saved stage.");
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            if (firstBuild)
            {
                Replace(scene, "Brazier", full);
                Replace(scene, "BrazierFlame", pure);
                EditorSceneManager.SaveScene(scene);
            }
            foreach (var ps in Systems(scene)) ps.Simulate(2.7f, false, true, true);
            Selection.activeObject = pure;
            EditorGUIUtility.PingObject(pure);
            EditorApplication.ExecuteMenuItem("Window/General/Game");
            Validate();
            Debug.Log("[Brazier Particles] Native particle assembly complete. Four independent layers; zero VFX Lights.");
        }

        static Material Material(string name, string textureName, bool additive, int order, Shader shader)
        {
            string texturePath = Root + "/Textures/" + textureName + ".png";
            var importer = (TextureImporter)AssetImporter.GetAtPath(texturePath);
            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = true;
            importer.alphaIsTransparency = false;
            importer.mipmapEnabled = false;
            importer.filterMode = textureName == "SoftGlow" ? FilterMode.Bilinear : FilterMode.Point;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.npotScale = TextureImporterNPOTScale.None;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.maxTextureSize = 512;
            importer.SaveAndReimport();
            string path = Root + "/Materials/" + name + ".mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!mat) { mat = new Material(shader) { name = name }; AssetDatabase.CreateAsset(mat, path); }
            mat.shader = shader;
            mat.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);
            mat.SetColor("_Tint", Color.white);
            mat.SetFloat("_Intensity", 1);
            mat.SetFloat("_FaceCamera", 1);
            mat.EnableKeyword("_FACECAMERA_ON");
            mat.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
            mat.SetFloat("_DstBlend", (float)(additive ? BlendMode.One : BlendMode.OneMinusSrcAlpha));
            mat.renderQueue = 3000 + order;
            EditorUtility.SetDirty(mat);
            return mat;
        }

        static Transform Group(Transform parent, string name, Vector3 position)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = position;
            return go.transform;
        }

        static void FaceLayer(Transform layer, Material material)
        {
            layer.gameObject.AddComponent<ParticleLayerFacing>().facingMaterial = material;
        }

        static ParticleSystem Emitter(Transform parent, string name, Material mat, uint seed, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            ps.useAutoRandomSeed = false;
            ps.randomSeed = seed;
            var main = ps.main;
            main.duration = recipe.duration;
            main.loop = true;
            main.prewarm = true;
            main.playOnAwake = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.18f, 0.3f);
            main.startSpeed = 0;
            main.startRotation = 0;
            main.startColor = Color.white;
            main.startSize = 1;
            main.maxParticles = 128;
            main.simulationSpace = ParticleSystemSimulationSpace.Local;
            main.scalingMode = ParticleSystemScalingMode.Hierarchy;
            main.cullingMode = ParticleSystemCullingMode.AlwaysSimulate;
            var shape = ps.shape; shape.enabled = false;
            var lights = ps.lights; lights.enabled = false;
            var emission = ps.emission; emission.rateOverTime = 0;
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = mat;
            r.renderMode = ParticleSystemRenderMode.Billboard;
            r.alignment = ParticleSystemRenderSpace.View;
            r.allowRoll = false;
            r.sortMode = ParticleSystemSortMode.Distance;
            r.sortingOrder = order;
            r.shadowCastingMode = ShadowCastingMode.Off;
            r.receiveShadows = false;
            r.lightProbeUsage = LightProbeUsage.Off;
            r.reflectionProbeUsage = ReflectionProbeUsage.Off;
            r.minParticleSize = 0;
            r.maxParticleSize = 1;
            r.SetActiveVertexStreams(new List<ParticleSystemVertexStream> {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color, ParticleSystemVertexStream.UV });
            var facing = go.AddComponent<ParticleMaterialFacing>();
            var layer = parent.GetComponent<ParticleLayerFacing>();
            if (layer) facing.alignmentMaterial = layer.facingMaterial;
            facing.ApplyMaterial();
            return ps;
        }

        static void Rate(ParticleSystem ps, float rate) { var emission = ps.emission; emission.rateOverTime = rate; }
        static ParticleSystem.MinMaxCurve Random(float min, float max) { return new ParticleSystem.MinMaxCurve(min, max); }
        static void Size(ParticleSystem ps, float minX, float maxX, float minY, float maxY)
        {
            var main = ps.main; main.startSize3D = true;
            main.startSizeX = Random(minX, maxX); main.startSizeY = Random(minY, maxY); main.startSizeZ = 1;
        }
        static void Box(ParticleSystem ps, Vector3 size)
        {
            var shape = ps.shape; shape.enabled = true; shape.shapeType = ParticleSystemShapeType.Box; shape.scale = size;
        }
        static void Velocity(ParticleSystem ps, float minX, float maxX, float minY, float maxY, float minZ = -0.02f, float maxZ = 0.02f)
        {
            var v = ps.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.Local;
            v.x = Random(minX, maxX); v.y = Random(minY, maxY); v.z = Random(minZ, maxZ);
        }

        // Original drift uses v(t)=a/k+(v0-a/k)*exp(-k*t). Native curves are normalized to
        // particle lifetime; mean lifetime preserves that equation for the central lifetime.
        // The source recipe records this approximation for randomized lifetime particles.
        static AnimationCurve DriftCurve(float initial, float acceleration, float drag, float lifetime)
        {
            var keys = new Keyframe[17];
            for (int i = 0; i < keys.Length; i++)
            {
                float normalized = i / 16f, time = normalized * lifetime;
                float terminal = drag > 0 ? acceleration / drag : 0;
                float value = drag > 0 ? terminal + (initial - terminal) * Mathf.Exp(-drag * time) : initial + acceleration * time;
                float slope = (acceleration - drag * value) * lifetime;
                keys[i] = new Keyframe(normalized, value, slope, slope);
            }
            return new AnimationCurve(keys);
        }

        static void SourceMotion(ParticleSystem ps, SourceEmitter source)
        {
            var main = ps.main; main.startLifetime = Random(source.lifetime[0], source.lifetime[1]);
            Rate(ps, source.rate);
            ps.transform.localPosition = new Vector3((source.startX[0]+source.startX[1])*0.5f, (source.startY[0]+source.startY[1])*0.5f, 0);
            Box(ps, new Vector3(source.startX[1]-source.startX[0], source.startY[1]-source.startY[0], 0));
            float lifetime = (source.lifetime[0]+source.lifetime[1])*0.5f;
            var v = ps.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.Local;
            v.x = new ParticleSystem.MinMaxCurve(1,
                DriftCurve(source.velocityX[0],source.accelerationX,source.dragX,lifetime),
                DriftCurve(source.velocityX[1],source.accelerationX,source.dragX,lifetime));
            v.y = new ParticleSystem.MinMaxCurve(1,
                DriftCurve(source.velocityY[0],source.accelerationY,source.dragY,lifetime),
                DriftCurve(source.velocityY[1],source.accelerationY,source.dragY,lifetime));
            v.z = new ParticleSystem.MinMaxCurve(1, AnimationCurve.Constant(0,1,0), AnimationCurve.Constant(0,1,0));
        }
        static void Noise(ParticleSystem ps, float x, float y, float z, float frequency)
        {
            var noise = ps.noise; noise.enabled = true; noise.separateAxes = true;
            noise.strengthX = x; noise.strengthY = y; noise.strengthZ = z;
            noise.frequency = frequency; noise.scrollSpeed = 0.8f; noise.damping = true;
            noise.quality = ParticleSystemNoiseQuality.High;
        }
        static void SizeLife(ParticleSystem ps, params Keyframe[] keys)
        {
            var size = ps.sizeOverLifetime; size.enabled = true; size.size = new ParticleSystem.MinMaxCurve(1, new AnimationCurve(keys));
        }
        static void Colors(ParticleSystem ps, GradientColorKey[] colors, params GradientAlphaKey[] alpha)
        {
            var gradient = new Gradient(); gradient.SetKeys(colors, alpha);
            var module = ps.colorOverLifetime; module.enabled = true; module.color = gradient;
        }
        static GradientColorKey C(float r, float g, float b, float time) { return new GradientColorKey(new Color(r, g, b), time); }
        static GradientAlphaKey A(float alpha, float time) { return new GradientAlphaKey(alpha, time); }
        static Keyframe K(float time, float value) { return new Keyframe(time, value); }

        static void FlameVariants(ParticleSystem ps)
        {
            var texture = ps.textureSheetAnimation; texture.enabled = true;
            texture.mode = ParticleSystemAnimationMode.Grid;
            texture.numTilesX = 1; texture.numTilesY = 8;
            texture.animation = ParticleSystemAnimationType.SingleRow;
            texture.rowMode = ParticleSystemAnimationRowMode.Random;
            texture.frameOverTime = 0;
            texture.startFrame = 0;
        }

        static void SparkVariant(ParticleSystem ps, int row)
        {
            var texture = ps.textureSheetAnimation; texture.enabled = true;
            texture.mode = ParticleSystemAnimationMode.Grid;
            texture.numTilesX = 1; texture.numTilesY = 2;
            texture.animation = ParticleSystemAnimationType.SingleRow;
            texture.rowMode = ParticleSystemAnimationRowMode.Custom;
            texture.rowIndex = row; texture.frameOverTime = 0; texture.startFrame = 0;
        }

        static GameObject Prefab(string name, bool withProp, Material flame, Material puffMaterial, Material sparks, Material smoke, Material glow, Material prop)
        {
            var root = new GameObject(name);
            float baseY = withProp ? 25f / 32 : 0;
            var fireLayer = Group(root.transform, Layers[0], new Vector3(0, baseY, 0));
            FaceLayer(fireLayer, flame);
            // Read the eleven roots and base proportions extracted from the actual JS source.
            for (int i = 0; i < recipe.tongues.Length; i++)
            {
                var tongue = recipe.tongues[i];
                var ps = Emitter(fireLayer, "Tongue_" + (i + 1).ToString("00"), flame, (uint)(100 + i * 31), 10 + i);
                float height = tongue.height * 48 / 35;
                float width = tongue.halfWidth * recipe.pixelsPerUnit / 5.2f;
                ps.transform.localPosition = new Vector3(tongue.x, tongue.y - height * 3 / 48, 0);
                ps.GetComponent<ParticleSystemRenderer>().pivot = new Vector3(0, 0.5f, 0);
                Rate(ps, 7);
                Size(ps, width * 0.9f, width * 1.1f, height * 0.82f, height * 1.18f);
                FlameVariants(ps);
                Velocity(ps, -0.015f, 0.015f, 0.02f, 0.06f);
                Noise(ps, 0.022f, 0.01f, 0.008f, 3);
                SizeLife(ps, K(0, 0.82f), K(0.25f, 1), K(0.7f, 0.9f), K(1, 0.55f));
                Colors(ps, new[] { C(1,1,1,0), C(1,0.85f,0.6f,1) }, A(0,0), A(1,0.1f), A(1,0.72f), A(0,1));
            }
            var licks = Emitter(fireLayer, "Detached flame licks", flame, 406, 24);
            SourceMotion(licks, recipe.detachedLicks);
            Size(licks, 0.08f, 0.18f, 0.12f, 0.3f); FlameVariants(licks);
            SizeLife(licks, K(0,1), K(0.5f,0.75f), K(1,0));
            Colors(licks, new[] { C(1,1,1,0), C(1,0.5f,0.2f,1) }, A(1,0), A(0,1));
            var puffs = Emitter(fireLayer, "Flame puffs", puffMaterial, 408, 23);
            SourceMotion(puffs, recipe.flamePuffs);
            Size(puffs,0.16f,0.3f,0.16f,0.3f);
            SizeLife(puffs,K(0,0.55f),K(0.15f,0.91f),K(0.5f,0.725f),K(1,0.45f));
            Colors(puffs,new[] { C(1,1,1,0), C(1,0.45f,0.16f,1) },A(1,0),A(1,0.7f),A(0,1));

            var sparkLayer = Group(root.transform, Layers[1], new Vector3(0, baseY, 0));
            FaceLayer(sparkLayer, sparks);
            var streaks = Emitter(sparkLayer, "Rising sparks", sparks, 602, 30);
            SourceMotion(streaks, recipe.sparks);
            var main = streaks.main;
            Size(streaks, 0.15f, 0.24f, 0.18f, 0.32f); SparkVariant(streaks, 1);
            Noise(streaks, 0.12f, 0.025f, 0.06f, 1.7f);
            SizeLife(streaks, K(0,1), K(0.7f,0.6f), K(1,0.1f));
            Colors(streaks, new[] { C(1,1,1,0), C(1,0.65f,0.2f,0.6f), C(1,0.2f,0.03f,1) }, A(0,0), A(1,0.05f), A(1,0.55f), A(0,1));
            var floating = Emitter(sparkLayer, "Floating embers", sparks, 704, 31);
            SourceMotion(floating, recipe.embers);
            Size(floating, 0.12f, 0.22f, 0.12f, 0.22f); SparkVariant(floating, 0);
            Noise(floating, 0.2f, 0.07f, 0.07f, 1.2f);
            Colors(floating, new[] { C(1,1,1,0), C(1,0.3f,0.05f,1) }, A(1,0), A(0.8f,0.65f), A(0,1));

            var smokeLayer = Group(root.transform, Layers[2], new Vector3(0, baseY, 0));
            FaceLayer(smokeLayer, smoke);
            var plume = Emitter(smokeLayer, "Rising smoke puffs", smoke, 812, 0);
            SourceMotion(plume, recipe.smoke);
            main = plume.main; main.startSize = Random(recipe.smoke.radius[0]*2.2f, recipe.smoke.radius[1]*2.2f);
            Noise(plume, 0.12f, 0.025f, 0.045f, 1.2f);
            SizeLife(plume, K(0,0.65f), K(0.4f,1.26f), K(1,1.5f));
            Colors(plume, new[] { C(1,0.87f,0.78f,0), C(0.7f,0.65f,0.8f,1) }, A(0,0), A(0.35f,0.14f), A(0.15f,0.6f), A(0,1));
            var wisps = Emitter(smokeLayer,"Smoke from spent flame puffs",smoke,816,1);
            SourceMotion(wisps,recipe.smokeFromPuffs);
            main = wisps.main; main.startSize = Random(0.09f,0.16f);
            Noise(wisps,0.07f,0.025f,0,1.4f);
            SizeLife(wisps,K(0,0.65f),K(0.4f,1.26f),K(1,1.5f));
            Colors(wisps,new[] { C(0.85f,0.8f,0.83f,0), C(0.6f,0.58f,0.67f,1) }, A(0,0), A(0.28f,0.15f), A(0.14f,0.6f), A(0,1));

            var glowLayer = Group(root.transform, Layers[3], new Vector3(0, baseY, 0));
            FaceLayer(glowLayer, glow);
            var halo = Emitter(glowLayer, "Warm halo - additive only", glow, 918, 40);
            halo.transform.localPosition = new Vector3(0, 0.42f, 0);
            main = halo.main; main.startLifetime = Random(0.5f,0.75f); main.startSize = Random(2.2f,2.8f);
            Rate(halo, 5);
            Colors(halo, new[] { C(1,0.65f,0.25f,0), C(1,0.4f,0.12f,1) }, A(0,0), A(0.12f,0.25f), A(0.08f,0.6f), A(0,1));
            SizeLife(halo, K(0,0.8f), K(0.5f,1), K(1,1.1f));
            var heart = Emitter(glowLayer, "Hot core glow - additive only", glow, 922, 41);
            heart.transform.localPosition = new Vector3(0, 0.25f, 0);
            main = heart.main; main.startLifetime = Random(0.3f,0.45f); main.startSize = Random(0.9f,1.3f);
            Rate(heart, 7);
            Colors(heart, new[] { C(1,0.83f,0.43f,0), C(1,0.6f,0.2f,1) }, A(0,0), A(0.18f,0.25f), A(0,1));

            if (withProp)
            {
                var holder = Group(root.transform, "00_BrazierProp", new Vector3(0, -3f / 32, 0));
                FaceLayer(holder, prop);
                var body = Emitter(holder, "Static iron bowl and stand", prop, 1002, 8);
                main = body.main; main.startLifetime = 3;
                Size(body, 1.5f,1.5f,1.25f,1.25f);
                body.GetComponent<ParticleSystemRenderer>().pivot = new Vector3(0,0.5f,0);
                var emission = body.emission; emission.SetBursts(new[] { new ParticleSystem.Burst(0,1) });
            }
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, Root + "/Prefabs/" + name + ".prefab");
            UnityEngine.Object.DestroyImmediate(root);
            return prefab;
        }

        static void Replace(Scene scene, string oldName, GameObject prefab)
        {
            var old = scene.GetRootGameObjects().FirstOrDefault(x => x.name == oldName);
            if (!old) throw new Exception("Missing original effect instance: " + oldName);
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab, scene);
            instance.transform.SetPositionAndRotation(old.transform.position, Quaternion.identity);
            instance.transform.localScale = old.transform.localScale;
            UnityEngine.Object.DestroyImmediate(old);
        }

        static ParticleSystem[] Systems(Scene scene)
        {
            return scene.GetRootGameObjects().SelectMany(x => x.GetComponentsInChildren<ParticleSystem>()).ToArray();
        }

        [MenuItem("Tools/PixelFX/Brazier Particles/Validate Native Particles %#&j")]
        public static void Validate()
        {
            VerifyTarget();
            recipe = ReadRecipe();
            var shader = Shader.Find("PixelFX/Brazier Native Particle URP");
            if (!shader || ShaderUtil.ShaderHasError(shader)) throw new Exception("Particle shader has errors.");
            foreach (var name in new[] { "BrazierParticles", "BrazierFlameParticles" })
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Prefabs/" + name + ".prefab");
                if (!prefab || prefab.GetComponentsInChildren<Light>(true).Length != 0
                    || prefab.GetComponentsInChildren<BrazierFlipbook>(true).Length != 0
                    || prefab.GetComponentsInChildren<MeshRenderer>(true).Length != 0)
                    throw new Exception("Unexpected Light, mesh card, or flipbook driver on " + name);
                foreach (var layer in Layers)
                {
                    var group = prefab.transform.Find(layer);
                    if (!group || !group.GetComponent<ParticleLayerFacing>()
                        || !group.GetComponent<ParticleLayerFacing>().facingMaterial)
                        throw new Exception("Missing layer/facing layout: " + layer);
                }
                foreach (var ps in prefab.GetComponentsInChildren<ParticleSystem>(true))
                {
                    var r = ps.GetComponent<ParticleSystemRenderer>();
                    if (ps.lights.enabled || r.alignment != ParticleSystemRenderSpace.View || r.allowRoll
                        || !r.sharedMaterial || !r.sharedMaterial.mainTexture || !ps.GetComponent<ParticleMaterialFacing>())
                        throw new Exception("Invalid native particle configuration: " + ps.name);
                    if (ps.textureSheetAnimation.enabled && ps.textureSheetAnimation.frameOverTime.constant != 0)
                        throw new Exception("Unexpected baked animation on " + ps.name);
                    SourceEmitter source = ps.name == "Rising sparks" ? recipe.sparks
                        : ps.name == "Floating embers" ? recipe.embers : ps.name == "Rising smoke puffs" ? recipe.smoke
                        : ps.name == "Flame puffs" ? recipe.flamePuffs : ps.name == "Detached flame licks" ? recipe.detachedLicks
                        : ps.name == "Smoke from spent flame puffs" ? recipe.smokeFromPuffs : null;
                    if (source != null)
                    {
                        if (!Mathf.Approximately(ps.emission.rateOverTime.constant,source.rate)
                            || !Mathf.Approximately(ps.main.startLifetime.constantMin,source.lifetime[0])
                            || !Mathf.Approximately(ps.main.startLifetime.constantMax,source.lifetime[1])
                            || !Mathf.Approximately(ps.velocityOverLifetime.y.curveMin.Evaluate(0),source.velocityY[0])
                            || !Mathf.Approximately(ps.velocityOverLifetime.y.curveMax.Evaluate(0),source.velocityY[1]))
                            throw new Exception("Source recipe mapping mismatch: " + ps.name);
                    }
                }
            }
            var scene = SceneManager.GetActiveScene();
            var systems = Systems(scene);
            var report = new Report {
                dataPath = Application.dataPath, scene = scene.path, isPlaying = Application.isPlaying,
                shaderPassed = true, noVfxLights = true, fourLayersPassed = true, sourceRecipePassed = true,
                facingSwitchPassed = TestFacingSwitch(systems.First()),
                systems = Array.ConvertAll(systems, x => x.transform.parent.name + "/" + x.name),
                particleCounts = Array.ConvertAll(systems, x => x.particleCount),
                simulationTimes = Array.ConvertAll(systems, x => x.time), timestamp = DateTime.Now.ToString("O")
            };
            File.WriteAllText("Library/PixelFX_BrazierParticles_Validation.json", JsonUtility.ToJson(report, true));
            Debug.Log("[Brazier Particles] Validation passed. Play=" + report.isPlaying + "; systems=" + systems.Length
                + "; alive=" + systems.Sum(x => x.particleCount) + "; material facing toggle=" + report.facingSwitchPassed);
        }

        static bool TestFacingSwitch(ParticleSystem ps)
        {
            var r = ps.GetComponent<ParticleSystemRenderer>();
            var original = r.sharedMaterial;
            var binding = ps.GetComponent<ParticleMaterialFacing>();
            var originalControl = binding.alignmentMaterial;
            var temporary = new Material(original);
            try
            {
                r.sharedMaterial = temporary;
                binding.alignmentMaterial = temporary;
                temporary.SetFloat("_FaceCamera", 0);
                ps.GetComponent<ParticleMaterialFacing>().ApplyMaterial();
                if (r.alignment != ParticleSystemRenderSpace.Local) throw new Exception("Facing OFF failed.");
                temporary.SetFloat("_FaceCamera", 1);
                ps.GetComponent<ParticleMaterialFacing>().ApplyMaterial();
                if (r.alignment != ParticleSystemRenderSpace.View || r.allowRoll) throw new Exception("Facing ON failed.");
                return true;
            }
            finally
            {
                r.sharedMaterial = original;
                binding.alignmentMaterial = originalControl;
                ps.GetComponent<ParticleMaterialFacing>().ApplyMaterial();
                UnityEngine.Object.DestroyImmediate(temporary);
            }
        }

        [Serializable]
        class Report
        {
            public string dataPath, scene, timestamp;
            public bool isPlaying, shaderPassed, noVfxLights, fourLayersPassed, facingSwitchPassed, sourceRecipePassed;
            public string[] systems;
            public int[] particleCounts;
            public float[] simulationTimes;
        }

        [MenuItem("Tools/PixelFX/Brazier Particles/Capture Native Particle Preview %#&k")]
        public static void Capture()
        {
            VerifyTarget();
            if (SceneManager.GetActiveScene().path != ScenePath) throw new Exception("Open the native particle showcase.");
            Directory.CreateDirectory("BrazierParticlePreviews");
            var original = Camera.main;
            var cameraGo = new GameObject("Temporary particle preview camera") { hideFlags = HideFlags.HideAndDontSave };
            var camera = cameraGo.AddComponent<Camera>();
            camera.CopyFrom(original); camera.enabled = false;
            camera.transform.SetPositionAndRotation(original.transform.position, original.transform.rotation);
            camera.GetUniversalAdditionalCameraData().renderPostProcessing = false;
            try
            {
                Render(camera, "Combined");
                var center = new Vector3(0,1.5f,0);
                camera.transform.position = center + Quaternion.Euler(55,30,0) * new Vector3(0,0,-10);
                camera.transform.LookAt(center);
                Render(camera, "ObliqueCamera55deg");
                var pure = SceneManager.GetActiveScene().GetRootGameObjects().First(x => x.name == "BrazierFlameParticles");
                var renderers = Systems(SceneManager.GetActiveScene()).Select(x => x.GetComponent<ParticleSystemRenderer>()).ToArray();
                var enabled = Array.ConvertAll(renderers, x => x.enabled);
                camera.transform.position = pure.transform.position + new Vector3(0,1.3f,-6);
                camera.transform.rotation = Quaternion.identity;
                camera.orthographic = true; camera.orthographicSize = 1.7f;
                try
                {
                    foreach (var layer in Layers)
                    {
                        for (int i = 0; i < renderers.Length; i++)
                            renderers[i].enabled = enabled[i] && renderers[i].transform.IsChildOf(pure.transform.Find(layer));
                        Render(camera, layer);
                    }
                }
                finally { for (int i = 0; i < renderers.Length; i++) renderers[i].enabled = enabled[i]; }
            }
            finally { UnityEngine.Object.DestroyImmediate(cameraGo); }
            Validate();
            Debug.Log("[Brazier Particles] Combined, oblique-camera and four isolated layer previews captured.");
        }

        static void Render(Camera camera, string name)
        {
            var target = RenderTexture.GetTemporary(1280,720,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);
            var previous = RenderTexture.active;
            Texture2D image = null;
            try
            {
                camera.aspect = 1280f / 720;
                RenderPipeline.SubmitRenderRequest(camera, new UniversalRenderPipeline.SingleCameraRequest { destination = target });
                RenderTexture.active = target;
                image = new Texture2D(1280,720,TextureFormat.RGBA32,false);
                image.ReadPixels(new Rect(0,0,1280,720),0,0); image.Apply();
                File.WriteAllBytes("BrazierParticlePreviews/" + name + ".png", image.EncodeToPNG());
            }
            finally
            {
                RenderTexture.active = previous; RenderTexture.ReleaseTemporary(target);
                if (image) UnityEngine.Object.DestroyImmediate(image);
            }
        }
    }
}
