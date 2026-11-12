// One-time authoring command; never imported as an Editor/runtime script.
using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Security.Cryptography;
using UnityEngine;using UnityEditor;using UnityEngine.Rendering;using UnityEngine.SceneManagement;using UnityEditor.SceneManagement;using Newtonsoft.Json;
public static class BlueWispImport {
 const string Root="Assets/PixelFX/BlueWisp/V3";
 static string Project=>Directory.GetParent(Application.dataPath).FullName;
 static string Out=>Path.Combine(Project,"VFXWork/Previews/BlueWisp/V3");
 [Serializable] public class Recipe{public string sourceHash;public float duration;public MeshData[] meshes;}
 [Serializable] public class MeshData{public string name;public float[][] vertices,uv,uv2;public float[] alpha;public int[] triangles;}
 static string Hash(byte[] b){using(var s=SHA256.Create())return BitConverter.ToString(s.ComputeHash(b)).Replace("-","").ToLowerInvariant();}
 static void Scope(){if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.productName!="VFXDemo"||SceneManager.GetActiveScene().path!="Assets/Scenes/VFXWorkbench.unity"||Application.isPlaying||SceneManager.GetActiveScene().isDirty)throw new Exception("Unverified target or dirty scene; preserve state.");}
 static Color C(string value){Color c;ColorUtility.TryParseHtmlString(value,out c);return c;}
 static ParticleSystem Make(GameObject g,Mesh mesh,Material mat,bool light){
  var p=g.AddComponent<ParticleSystem>();p.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
  var m=p.main;m.duration=.28f;m.loop=true;m.startLifetime=.28f;m.startSpeed=0;m.startSize=1;m.startRotation=0;m.startColor=Color.white;m.maxParticles=1;m.playOnAwake=true;m.prewarm=false;m.simulationSpace=ParticleSystemSimulationSpace.Local;m.scalingMode=ParticleSystemScalingMode.Hierarchy;m.cullingMode=ParticleSystemCullingMode.AlwaysSimulate;m.stopAction=ParticleSystemStopAction.None;
  var e=p.emission;e.enabled=true;e.rateOverTime=0;e.rateOverDistance=0;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});var sh=p.shape;sh.enabled=false;p.useAutoRandomSeed=false;p.randomSeed=13;
  var r=g.GetComponent<ParticleSystemRenderer>();r.renderMode=ParticleSystemRenderMode.Mesh;r.mesh=mesh;r.alignment=ParticleSystemRenderSpace.Local;r.sharedMaterial=mat;r.enableGPUInstancing=false;r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;r.lightProbeUsage=LightProbeUsage.Off;r.reflectionProbeUsage=ReflectionProbeUsage.Off;r.sortingOrder=light?1:0;r.localBounds=new Bounds(new Vector3(.25f,0,0),new Vector3(5.2f,4.8f,.1f));r.maxParticleSize=1;
  r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV,ParticleSystemVertexStream.UV2,ParticleSystemVertexStream.AgePercent});return p;
 }
 public static string Run(){
  Scope();var scene=SceneManager.GetActiveScene();var prefabPath=Root+"/Prefabs/VFX_BlueWisp_V3_Loop.prefab";
  if(AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath)!=null)throw new Exception("Existing prefab: do not overwrite author settings.");
  if(Hash(File.ReadAllBytes(Path.Combine(Project,"Tools/PixelFX/src/hd/blue-wisp-v3.js")))!="5544592adce52f7642784c7fe17f17e54f9862260988012668748cd5e65aa45c")throw new Exception("Selected V3.0.2 source changed.");
  Directory.CreateDirectory(Out);var snapshot=Path.Combine(Out,"VFXWorkbench-before.snapshot");if(!File.Exists(snapshot))File.Copy(Path.Combine(Project,scene.path),snapshot,false);
  var prior=scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<Component>(true)).Where(c=>c!=null).Select(c=>new{component=c,json=EditorJsonUtility.ToJson(c)}).ToArray();
  File.WriteAllText(Path.Combine(Out,"Before.json"),JsonConvert.SerializeObject(new{dataPath=Application.dataPath,product=Application.productName,unity=Application.unityVersion,scene=scene.path,dirty=scene.isDirty,roots=scene.GetRootGameObjects().Select(g=>new{g.name,active=g.activeSelf,transform=EditorJsonUtility.ToJson(g.transform)}),components=prior.Select(x=>new{name=x.component.name,type=x.component.GetType().FullName,x.json}),background=Application.runInBackground},Formatting.Indented));
  foreach(var d in new[]{"Meshes","Materials","Prefabs","Docs"})Directory.CreateDirectory(Path.Combine(Project,Root,d));AssetDatabase.Refresh();
  var recipe=JsonConvert.DeserializeObject<Recipe>(File.ReadAllText(Path.Combine(Project,"VFXWork/Exports/BlueWisp/V3/native-recipe.json")));
  if(recipe.sourceHash!="5544592adce52f7642784c7fe17f17e54f9862260988012668748cd5e65aa45c")throw new Exception("Wrong recipe.");
  var meshes=new Dictionary<string,Mesh>();foreach(var data in recipe.meshes){
   var path=Root+"/Meshes/"+data.name+".asset";if(AssetDatabase.LoadMainAssetAtPath(path)!=null)throw new Exception("Preserve existing mesh: "+path);
   var mesh=new Mesh{name=data.name,indexFormat=IndexFormat.UInt32};mesh.vertices=data.vertices.Select(v=>new Vector3(v[0],v[1],v[2])).ToArray();mesh.colors32=data.alpha.Select(a=>new Color32(255,255,255,(byte)Mathf.RoundToInt(a*255))).ToArray();mesh.SetUVs(0,data.uv.Select(v=>new Vector2(v[0],v[1])).ToList());mesh.SetUVs(1,data.uv2.Select(v=>new Vector2(v[0],v[1])).ToList());mesh.triangles=data.triangles;mesh.RecalculateBounds();AssetDatabase.CreateAsset(mesh,path);meshes[data.name]=mesh;
  }
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"/Shaders/BlueWispNative.shader");if(shader==null||!shader.isSupported||ShaderUtil.ShaderHasError(shader))throw new Exception("Shader unavailable: "+JsonConvert.SerializeObject(shader==null?null:ShaderUtil.GetShaderMessages(shader)));
  var mats=new Material[2];for(int i=0;i<2;i++){
   var mat=new Material(shader){name=i==0?"BlueWisp_Colors":"BlueWisp_Glow"};mat.SetFloat("_LightOnly",i);mat.SetFloat("_DstBlend",i==0?10:1);mat.SetFloat("_Glow",.28f);
   foreach(var pair in new[]{new[]{"_Edge","#0e54cb"},new[]{"_Blue","#1096ff"},new[]{"_Cyan","#10eeff"},new[]{"_Pale","#b5ffff"},new[]{"_Core","#ffffff"},new[]{"_GlowColor","#10afff"}})mat.SetColor(pair[0],C(pair[1]));
   AssetDatabase.CreateAsset(mat,Root+"/Materials/"+mat.name+".mat");mats[i]=mat;
  }
  var root=new GameObject("VFX_BlueWisp_V3_Loop");Make(root,meshes["BlueWisp_AuthoredPoses"],mats[0],false);var glow=new GameObject("MicroGlow");glow.transform.SetParent(root.transform,false);Make(glow,meshes["BlueWisp_StaticGlow"],mats[1],true);
  foreach(var p in root.GetComponentsInChildren<ParticleSystem>())p.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);
  var prefab=PrefabUtility.SaveAsPrefabAsset(root,prefabPath);UnityEngine.Object.DestroyImmediate(root);AssetDatabase.SaveAssets();
  var instance=(GameObject)PrefabUtility.InstantiatePrefab(prefab,scene);Undo.RegisterCreatedObjectUndo(instance,"Import BlueWisp V3");instance.transform.position=new Vector3(-4,2.1f,0);PrefabUtility.RecordPrefabInstancePropertyModifications(instance.transform);
  foreach(var old in prior)if(old.component==null||old.json!=EditorJsonUtility.ToJson(old.component))throw new Exception("A pre-existing component changed; scene was not saved.");
  EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);Selection.activeGameObject=instance;
  var report=new{success=true,dataPath=Application.dataPath,scene=scene.path,dirty=scene.isDirty,prefab=prefabPath,sourceHash=recipe.sourceHash,priorComponentsUnchanged=prior.Length,systems=2,meshes=meshes.Select(k=>new{name=k.Key,vertices=k.Value.vertexCount,triangles=k.Value.triangles.Length/3}),textures=0,runtimeScripts=0,shaderSupported=shader.isSupported,shaderMessages=ShaderUtil.GetShaderMessages(shader)};
  File.WriteAllText(Path.Combine(Out,"Import.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(report);
 }
}
