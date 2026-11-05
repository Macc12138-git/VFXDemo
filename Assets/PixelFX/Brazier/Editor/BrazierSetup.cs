using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering.Universal;

namespace PixelFX.Brazier.Editor
{
    // A task-local setup utility. No network listener and no arbitrary-code command execution.
    [InitializeOnLoad]
    public static class BrazierSetup
    {
        const string ExpectedDataPath = "/Users/user/Desktop/VFXDemo/VFXDemo/Assets";
        const string ReportPath = "Library/PixelFX_Brazier_Identity.json";
        const string Root = "Assets/PixelFX/Brazier";
        const string Showcase = Root + "/Scenes/BrazierShowcase.unity";

        static BrazierSetup()
        {
            EditorApplication.delayCall += WriteIdentity;
        }

        static void WriteIdentity()
        {
            if (Application.dataPath != ExpectedDataPath) return;
            var scene = SceneManager.GetActiveScene();
            var report = new Identity
            {
                dataPath = Application.dataPath,
                product = Application.productName,
                unityVersion = Application.unityVersion,
                scene = scene.path,
                dirty = scene.isDirty,
                isPlaying = EditorApplication.isPlaying,
                pipeline = GraphicsSettings.currentRenderPipeline == null ? "Built-in" : GraphicsSettings.currentRenderPipeline.name,
                roots = Array.ConvertAll(scene.GetRootGameObjects(), x => x.name),
            };
            File.WriteAllText(ReportPath, JsonUtility.ToJson(report, true));
            Debug.Log("[PixelFX Brazier] Target verified: " + report.dataPath + " / " + report.scene);
        }

        static void VerifyTarget()
        {
            if (Application.dataPath != ExpectedDataPath || Application.productName != "VFXDemo")
                throw new InvalidOperationException("Brazier setup is restricted to the VFXDemo project.");
            if (!(GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset))
                throw new InvalidOperationException("The Brazier showcase requires URP.");
        }

        [MenuItem("Tools/PixelFX/Brazier/Assemble Prefabs and Showcase %#&b")]
        public static void Assemble()
        {
            VerifyTarget();
            if (EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Exit Play Mode before assembling assets.");
            for (int i = 0; i < SceneManager.sceneCount; i++)
                if (SceneManager.GetSceneAt(i).isDirty)
                    throw new InvalidOperationException("Save the current scenes before assembling. No scenes were changed.");

            foreach (var folder in new[] { "Materials", "Meshes", "Prefabs", "Scenes" })
                Directory.CreateDirectory(Root + "/" + folder);
            AssetDatabase.Refresh();
            var shader = Shader.Find("PixelFX/Brazier Flipbook URP");
            if (!shader || ShaderUtil.ShaderHasError(shader))
                throw new InvalidOperationException("Brazier shader is missing or has compilation errors.");

            var full = CreatePrefab("Brazier", 136, 25, shader);
            var flame = CreatePrefab("BrazierFlame", 111, 0, shader);
            CreateShowcase(full, flame);
            AssetDatabase.SaveAssets();
            WriteIdentity();
            Validate();
            Selection.activeObject = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Prefabs/BrazierFlame.prefab");
            EditorGUIUtility.PingObject(Selection.activeObject);
            EditorApplication.ExecuteMenuItem("Window/General/Game");
            Debug.Log("[PixelFX Brazier] Assembly complete. Open BrazierShowcase and press Play.");
        }

        static GameObject CreatePrefab(string name, float pivotY, float lightHeight, Shader shader)
        {
            var color = MakeMaterial(name + "_Color", shader, false);
            var glow = MakeMaterial(name + "_Light", shader, true);
            var meshPath = Root + "/Meshes/" + name + ".asset";
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            if (!mesh)
            {
                mesh = new Mesh { name = name + "_AnchoredCard" };
                AssetDatabase.CreateAsset(mesh, meshPath);
            }
            float left = -56f / 32, right = 56f / 32;
            float bottom = -(148 - pivotY) / 32, top = pivotY / 32;
            mesh.Clear();
            mesh.vertices = new[] { new Vector3(left, bottom, 0), new Vector3(left, top, 0),
                new Vector3(right, top, 0), new Vector3(right, bottom, 0) };
            mesh.uv = new[] { Vector2.zero, Vector2.up, Vector2.one, Vector2.right };
            mesh.triangles = new[] { 0, 1, 2, 0, 2, 3 };
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            EditorUtility.SetDirty(mesh);

            var root = new GameObject(name);
            var animation = root.AddComponent<BrazierFlipbook>();
            animation.colorLayer = MakeCard(root.transform, "Color - flame, smoke, sparks", mesh, color, 0);
            animation.glowLayer = MakeCard(root.transform, "Additive glow", mesh, glow, 1);
            var lightObject = new GameObject("Fire point light");
            lightObject.transform.SetParent(root.transform, false);
            lightObject.transform.localPosition = new Vector3(0, lightHeight / 32 + 0.35f, -0.1f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1, 0.43f, 0.13f);
            light.intensity = animation.lightIntensity;
            light.range = 4;
            light.shadows = LightShadows.None;
            animation.fireLight = light;
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, Root + "/Prefabs/" + name + ".prefab");
            UnityEngine.Object.DestroyImmediate(root);
            return prefab;
        }

        static Renderer MakeCard(Transform parent, string name, Mesh mesh, Material material, int sortingOrder)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            renderer.lightProbeUsage = LightProbeUsage.Off;
            renderer.reflectionProbeUsage = ReflectionProbeUsage.Off;
            renderer.sortingOrder = sortingOrder;
            return renderer;
        }

        static Material MakeMaterial(string name, Shader shader, bool additive)
        {
            string texturePath = Root + "/Textures/" + name + ".png";
            var importer = (TextureImporter)AssetImporter.GetAtPath(texturePath);
            if (!importer) throw new FileNotFoundException(texturePath);
            importer.textureType = TextureImporterType.Default;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.filterMode = FilterMode.Point;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.mipmapEnabled = false;
            importer.npotScale = TextureImporterNPOTScale.None;
            importer.maxTextureSize = 2048;
            importer.sRGBTexture = !additive;
            importer.alphaSource = TextureImporterAlphaSource.FromInput;
            importer.alphaIsTransparency = false;
            importer.SaveAndReimport();

            var path = Root + "/Materials/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!material)
            {
                material = new Material(shader) { name = name };
                AssetDatabase.CreateAsset(material, path);
            }
            material.shader = shader;
            material.SetTexture("_MainTex", AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath));
            material.SetColor("_Tint", Color.white);
            material.SetFloat("_Intensity", 1);
            material.SetFloat("_SrcBlend", (float)(additive ? BlendMode.One : BlendMode.SrcAlpha));
            material.SetFloat("_DstBlend", (float)(additive ? BlendMode.One : BlendMode.OneMinusSrcAlpha));
            material.renderQueue = additive ? 3001 : 3000;
            EditorUtility.SetDirty(material);
            return material;
        }

        static Material StageMaterial(string name, Color color)
        {
            var path = Root + "/Materials/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!material)
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = name };
                AssetDatabase.CreateAsset(material, path);
            }
            material.SetColor("_BaseColor", color);
            material.SetFloat("_Smoothness", 0.18f);
            EditorUtility.SetDirty(material);
            return material;
        }

        static void CreateShowcase(GameObject full, GameObject flame)
        {
            var oldScenes = new Scene[SceneManager.sceneCount];
            for (int i = 0; i < oldScenes.Length; i++) oldScenes[i] = SceneManager.GetSceneAt(i);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
            SceneManager.SetActiveScene(scene);
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.26f, 0.29f, 0.38f);
            RenderSettings.fog = false;

            var cameraGo = new GameObject("Main Camera");
            cameraGo.tag = "MainCamera";
            var camera = cameraGo.AddComponent<Camera>();
            cameraGo.AddComponent<AudioListener>();
            camera.orthographic = true;
            camera.orthographicSize = 2.8f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 40;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.042f, 0.043f, 0.065f);
            camera.transform.position = new Vector3(0, 3.6f, -10);
            camera.transform.LookAt(new Vector3(0, 1.8f, 0));
            camera.allowHDR = true;
            camera.GetUniversalAdditionalCameraData().renderPostProcessing = false;
            var key = new GameObject("Soft stage light").AddComponent<Light>();
            key.type = LightType.Directional;
            key.intensity = 0.75f;
            key.color = new Color(0.65f, 0.72f, 1);
            key.transform.rotation = Quaternion.Euler(45, -30, 0);

            var floor = StageMaterial("Showcase_Stone", new Color(0.12f, 0.14f, 0.2f));
            var plinth = StageMaterial("Showcase_Plinth", new Color(0.2f, 0.22f, 0.29f));
            Cube("Display floor", new Vector3(0, -0.15f, 1), new Vector3(30, 0.15f, 16), floor);
            Cube("Full brazier plinth", new Vector3(-1.8f, -0.035f, 0), new Vector3(1.6f, 0.08f, 1.25f), plinth);
            Cube("Flame demonstration pedestal", new Vector3(1.8f, 0.36f, 0.12f), new Vector3(1.05f, 0.8f, 0.9f), plinth);
            var a = (GameObject)PrefabUtility.InstantiatePrefab(full, scene);
            a.transform.position = new Vector3(-1.8f, 0.02f, 0);
            var b = (GameObject)PrefabUtility.InstantiatePrefab(flame, scene);
            b.transform.position = new Vector3(1.8f, 0.77f, 0);
            b.GetComponent<BrazierFlipbook>().phaseOffset = 0.37f;
            Label("PIXELFX / BRAZIER", new Vector3(0, 4.45f, 0), 0.18f, camera);
            Label("FULL BRAZIER", new Vector3(-1.8f, -0.32f, -0.7f), 0.105f, camera);
            Label("FLAME ONLY", new Vector3(1.8f, -0.32f, -0.7f), 0.105f, camera);
            Label("30 FPS  /  3 SECOND LOOP  /  COLOR + ADDITIVE GLOW", new Vector3(0, -0.66f, -0.7f), 0.065f, camera);
            EditorSceneManager.SaveScene(scene, Showcase);
            foreach (var old in oldScenes) EditorSceneManager.CloseScene(old, true);
            var sceneView = SceneView.lastActiveSceneView;
            if (sceneView) sceneView.LookAt(new Vector3(0, 1.7f, 0), camera.transform.rotation, 5.5f, true);
        }

        static void Cube(string name, Vector3 position, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = position;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = material;
            UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());
        }

        static void Label(string text, Vector3 position, float size, Camera camera)
        {
            var go = new GameObject(text);
            go.transform.position = position;
            go.transform.rotation = camera.transform.rotation;
            var label = go.AddComponent<TextMesh>();
            label.text = text;
            label.anchor = TextAnchor.MiddleCenter;
            label.alignment = TextAlignment.Center;
            label.fontSize = 64;
            label.characterSize = size * 0.2f;
            label.color = new Color(0.77f, 0.76f, 0.81f);
        }

        [MenuItem("Tools/PixelFX/Brazier/Update Showcase Presentation")]
        public static void UpdatePresentation()
        {
            VerifyTarget();
            var scene = SceneManager.GetActiveScene();
            if (scene.path != Showcase || EditorApplication.isPlaying)
                throw new InvalidOperationException("Open the showcase in Edit Mode first.");
            bool hadUnsavedChanges = scene.isDirty;
            foreach (var root in scene.GetRootGameObjects())
            {
                var label = root.GetComponent<TextMesh>();
                if (!label) continue;
                if (label.text == "PIXELFX / BRAZIER") label.characterSize = 0.036f;
                else if (label.text == "FULL BRAZIER" || label.text == "FLAME ONLY") label.characterSize = 0.021f;
                else if (label.text == "30 FPS  /  3 SECOND LOOP  /  COLOR + ADDITIVE GLOW") label.characterSize = 0.013f;
            }
            foreach (var name in new[] { "Brazier_Light", "BrazierFlame_Light" })
            {
                var material = AssetDatabase.LoadAssetAtPath<Material>(Root + "/Materials/" + name + ".mat");
                material.SetFloat("_Intensity", 1);
                EditorUtility.SetDirty(material);
            }
            AssetDatabase.SaveAssets();
            if (!hadUnsavedChanges) EditorSceneManager.SaveScene(scene);
            Debug.Log("[PixelFX Brazier] Presentation updated without rebuilding scene objects.");
        }

        [MenuItem("Tools/PixelFX/Brazier/Validate Current Assembly %#&v")]
        public static void Validate()
        {
            VerifyTarget();
            var shader = Shader.Find("PixelFX/Brazier Flipbook URP");
            if (!shader || ShaderUtil.ShaderHasError(shader)) throw new Exception("Flipbook shader failed.");
            foreach (var name in new[] { "Brazier", "BrazierFlame" })
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Prefabs/" + name + ".prefab");
                if (!prefab) throw new Exception("Missing prefab: " + name);
                var animation = prefab.GetComponent<BrazierFlipbook>();
                if (!animation || !animation.colorLayer || !animation.glowLayer || !animation.fireLight
                    || animation.frameCount != 90 || animation.framesPerSecond != 30)
                    throw new Exception("Incomplete prefab: " + name);
                if (GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(prefab) != 0)
                    throw new Exception("Missing script on " + name);
                foreach (var renderer in prefab.GetComponentsInChildren<MeshRenderer>())
                {
                    if (!renderer.sharedMaterial || !renderer.sharedMaterial.mainTexture)
                        throw new Exception("Missing material/texture on " + name);
                    var texture = renderer.sharedMaterial.mainTexture;
                    var importer = (TextureImporter)AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(texture));
                    if (texture.width != 1160 || texture.height != 1368 || importer.mipmapEnabled
                        || importer.filterMode != FilterMode.Point || importer.textureCompression != TextureImporterCompression.Uncompressed)
                        throw new Exception("Invalid atlas import on " + name);
                }
            }
            var instances = UnityEngine.Object.FindObjectsByType<BrazierFlipbook>(FindObjectsSortMode.None);
            var report = new Validation
            {
                dataPath = Application.dataPath, scene = SceneManager.GetActiveScene().path,
                isPlaying = Application.isPlaying, shaderPassed = true, prefabsPassed = true,
                instanceNames = Array.ConvertAll(instances, x => x.name),
                currentFrames = Array.ConvertAll(instances, x => x.CurrentFrame),
                timestamp = DateTime.Now.ToString("O")
            };
            File.WriteAllText("Library/PixelFX_Brazier_Validation.json", JsonUtility.ToJson(report, true));
            Debug.Log("[PixelFX Brazier] Validation passed. Playing=" + report.isPlaying
                + "; frames=" + string.Join(",", report.currentFrames));
        }

        [Serializable]
        class Validation
        {
            public string dataPath, scene, timestamp;
            public bool isPlaying, shaderPassed, prefabsPassed;
            public string[] instanceNames;
            public int[] currentFrames;
        }

        [MenuItem("Tools/PixelFX/Brazier/Capture Showcase Preview %#&p")]
        public static void CapturePreview()
        {
            VerifyTarget();
            if (SceneManager.GetActiveScene().path != Showcase)
                throw new InvalidOperationException("Open the Brazier showcase before capturing.");
            var camera = Camera.main;
            if (!camera) throw new InvalidOperationException("No showcase camera.");
            var target = RenderTexture.GetTemporary(1280, 720, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
            var previous = RenderTexture.active;
            var previousAspect = camera.aspect;
            Texture2D image = null;
            try
            {
                camera.aspect = 1280f / 720;
                RenderPipeline.SubmitRenderRequest(camera, new UniversalRenderPipeline.SingleCameraRequest { destination = target });
                RenderTexture.active = target;
                image = new Texture2D(1280, 720, TextureFormat.RGBA32, false);
                image.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0);
                image.Apply();
                File.WriteAllBytes("BrazierPreview.png", image.EncodeToPNG());
            }
            finally
            {
                camera.aspect = previousAspect;
                RenderTexture.active = previous;
                RenderTexture.ReleaseTemporary(target);
                if (image) UnityEngine.Object.DestroyImmediate(image);
            }
            Validate();
            Debug.Log("[PixelFX Brazier] Preview saved: " + Path.GetFullPath("BrazierPreview.png"));
        }

        [Serializable]
        class Identity
        {
            public string dataPath, product, unityVersion, scene, pipeline;
            public bool dirty, isPlaying;
            public string[] roots;
        }
    }
}
