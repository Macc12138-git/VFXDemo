// One-time authoring command, never an Assets/Editor or runtime dependency.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;
using Newtonsoft.Json;
public static class CyberOrbImport {
 const string Root="Assets/PixelFX/CyberOrb";
 static string Project=>Directory.GetParent(Application.dataPath).FullName;
 [Serializable] public class Recipe{public string sourceHash;public MeshData[] meshes;}
 [Serializable] public class MeshData{public string name;public float[] vertices,uv,tags;public int[] triangles;}
 static Dictionary<string,Mesh> meshes=new Dictionary<string,Mesh>();
 static Dictionary<int,Material> mats=new Dictionary<int,Material>();
 static ParticleSystem.MinMaxCurve C(float v)=>new ParticleSystem.MinMaxCurve(v);
 static ParticleSystem.MinMaxCurve Curve(Func<float,float> f,int n=24){var keys=new List<Keyframe>();for(int i=0;i<=n;i++){float t=(float)i/n,v=f(t),d=(f(Mathf.Min(1,t+.0001f))-f(Mathf.Max(0,t-.0001f)))/.0002f;keys.Add(new Keyframe(t,v,d,d));}return new ParticleSystem.MinMaxCurve(1,new AnimationCurve(keys.ToArray()));}
 static Color ColorOf(string hex){Color c;ColorUtility.TryParseHtmlString(hex,out c);return c;}
 static void Alpha(ParticleSystem p,Func<float,float> f){var col=p.colorOverLifetime;col.enabled=true;var g=new Gradient();var a=Enumerable.Range(0,8).Select(i=>new GradientAlphaKey(f(i/7f),i/7f)).ToArray();g.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},a);col.color=g;}
 static ParticleSystem Make(Transform parent,string name,string mesh,int role,float life,float duration,bool loop,bool awake=true){
  var go=new GameObject(name);if(parent!=null)go.transform.SetParent(parent,false);var p=go.AddComponent<ParticleSystem>();p.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
  var m=p.main;m.duration=duration;m.loop=loop;m.playOnAwake=awake;m.startLifetime=life;m.startSpeed=0;m.startSize=1;m.startColor=Color.white;m.startRotation3D=false;m.startRotation=0;m.simulationSpace=ParticleSystemSimulationSpace.Local;m.scalingMode=ParticleSystemScalingMode.Hierarchy;m.maxParticles=8;m.cullingMode=ParticleSystemCullingMode.AlwaysSimulate;m.stopAction=ParticleSystemStopAction.None;
  var e=p.emission;e.enabled=true;e.rateOverTime=0;e.rateOverDistance=0;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});var sh=p.shape;sh.enabled=false;
  p.useAutoRandomSeed=false;p.randomSeed=42;
  var r=go.GetComponent<ParticleSystemRenderer>();r.sharedMaterial=mats[role];r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;r.lightProbeUsage=LightProbeUsage.Off;r.reflectionProbeUsage=ReflectionProbeUsage.Off;r.sortingOrder=role==1||role==4?0:1;r.sortMode=ParticleSystemSortMode.Distance;r.alignment=ParticleSystemRenderSpace.Local;
  r.renderMode=ParticleSystemRenderMode.Mesh;r.mesh=mesh==null?null:meshes[mesh];r.enableGPUInstancing=false;r.localBounds=new Bounds(new Vector3(3,0,0),new Vector3(9,4,4));
  r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV,ParticleSystemVertexStream.UV2,ParticleSystemVertexStream.AgePercent,ParticleSystemVertexStream.InvStartLifetime});
  return p;
 }
 static GameObject Impact(Transform parent=null,bool awake=true){
  var flash=Make(parent,"CyberOrb_Impact","ImpactFlash",2,.085f,.2f,false,awake);var m=flash.main;m.simulationSpace=ParticleSystemSimulationSpace.World;
  var size=flash.sizeOverLifetime;size.enabled=true;size.size=Curve(q=>(.7f+.3f*(1-Mathf.Pow(1-Mathf.Clamp01(q*.085f/.012f),3)))*(1-.55f*q));
  Alpha(flash,q=>1-Mathf.Clamp01((q*.085f-.022f)/.063f));
  var shards=Make(flash.transform,"Shards",null,3,.15f,.2f,false,false);var sm=shards.main;sm.simulationSpace=ParticleSystemSimulationSpace.World;sm.startLifetime=new ParticleSystem.MinMaxCurve(.13f,.18f);sm.startSpeed=new ParticleSystem.MinMaxCurve(3.3f,4.5f);sm.startSize=new ParticleSystem.MinMaxCurve(.033f,.041f);sm.maxParticles=4;
  // Unity synchronizes unused Y/Z size-curve modes to X on load even in 1D mode.
  var sy=sm.startSizeY;sy.mode=sm.startSize.mode;sm.startSizeY=sy;var sz=sm.startSizeZ;sz.mode=sm.startSize.mode;sm.startSizeZ=sz;
  var se=shards.emission;se.SetBursts(new[]{new ParticleSystem.Burst(.009f,4)});
  var shape=shards.shape;shape.enabled=true;shape.shapeType=ParticleSystemShapeType.Circle;shape.radius=.042f;shape.radiusThickness=0;shape.arc=180;shape.arcMode=ParticleSystemShapeMultiModeValue.BurstSpread;shape.arcSpread=0;shape.rotation=new Vector3(0,0,90);shape.alignToDirection=false;
  var velocity=shards.velocityOverLifetime;velocity.enabled=true;velocity.speedModifier=Curve(q=>(1-q)*(1-q));
  var sr=shards.GetComponent<ParticleSystemRenderer>();sr.renderMode=ParticleSystemRenderMode.Stretch;sr.lengthScale=2.8f;sr.velocityScale=0;sr.cameraVelocityScale=0;sr.freeformStretching=true;sr.rotateWithStretchDirection=true;sr.alignment=ParticleSystemRenderSpace.View;
  var ss=shards.sizeOverLifetime;ss.enabled=true;ss.size=Curve(q=>1-.75f*q);Alpha(shards,q=>Mathf.Pow(1-q,.85f));shards.useAutoRandomSeed=true;
  var tail=Make(flash.transform,"ResidualWake","ResidualTail",4,.035f,.2f,false,false);var tm=tail.main;tm.simulationSpace=ParticleSystemSimulationSpace.World;var ts=tail.sizeOverLifetime;ts.enabled=true;ts.separateAxes=true;ts.x=Curve(q=>1-q);ts.y=Curve(q=>Mathf.Sqrt(1-q));ts.z=C(1);Alpha(tail,q=>1-q);
  var sub=flash.subEmitters;sub.enabled=true;sub.AddSubEmitter(shards,ParticleSystemSubEmitterType.Birth,ParticleSystemSubEmitterProperties.InheritNothing,1);sub.AddSubEmitter(tail,ParticleSystemSubEmitterType.Birth,ParticleSystemSubEmitterProperties.InheritNothing,1);
  return flash.gameObject;
 }
 static GameObject Projectile(){
  var root=new GameObject("CyberOrb_ProjectileVisual");
  Make(root.transform,"BodyAndWake","BodyTrail",0,4,4,true);
  Make(root.transform,"CompactGlow","CompactGlow",1,4,4,true);
  return root;
 }
 static GameObject Save(GameObject g){foreach(var p in g.GetComponentsInChildren<ParticleSystem>())p.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);var asset=PrefabUtility.SaveAsPrefabAsset(g,Root+"/Prefabs/"+g.name+".prefab");UnityEngine.Object.DestroyImmediate(g);return asset;}
 public static string Run(){
  var scene=SceneManager.GetActiveScene();if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.productName!="VFXDemo"||scene.path!="Assets/Scenes/VFXWorkbench.unity"||scene.isDirty||Application.isPlaying)throw new Exception("Wrong target/dirty scene");
  if(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/CyberOrb_ProjectileVisual.prefab")!=null)throw new Exception("Preserve existing prefab; create a new version before rebuilding");
  var existing=scene.GetRootGameObjects().Select(g=>new{g,active=g.activeSelf,transform=EditorJsonUtility.ToJson(g.transform),camera=g.GetComponent<Camera>()==null?null:EditorJsonUtility.ToJson(g.GetComponent<Camera>())}).ToArray();
  var recipe=JsonConvert.DeserializeObject<Recipe>(File.ReadAllText(Path.Combine(Project,"VFXWork/Exports/CyberOrb/V3.2/native-recipe.json")));if(recipe.sourceHash!="2c2c883a4a53931d287b4a32b7b0729ce421bb08723e38a83050ba5644b6450d")throw new Exception("Wrong source");
  foreach(var d in new[]{"Meshes","Materials","Prefabs","Docs"})Directory.CreateDirectory(Path.Combine(Project,Root,d));AssetDatabase.Refresh();
  foreach(var d in recipe.meshes){var mesh=new Mesh{name=d.name};mesh.vertices=Enumerable.Range(0,d.vertices.Length/3).Select(i=>new Vector3(d.vertices[i*3],d.vertices[i*3+1],d.vertices[i*3+2])).ToArray();mesh.SetUVs(0,Enumerable.Range(0,d.uv.Length/2).Select(i=>new Vector2(d.uv[i*2],d.uv[i*2+1])).ToList());mesh.SetUVs(1,Enumerable.Range(0,d.tags.Length/2).Select(i=>new Vector2(d.tags[i*2],d.tags[i*2+1])).ToList());mesh.triangles=d.triangles;mesh.RecalculateBounds();mesh.RecalculateNormals();AssetDatabase.CreateAsset(mesh,Root+"/Meshes/"+d.name+".asset");meshes[d.name]=mesh;}
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"/Shaders/CyberOrbNative.shader");if(shader==null||ShaderUtil.ShaderHasError(shader))throw new Exception("Shader unavailable/errors");
  var names=new[]{"BodyAndWake","CompactGlow","ImpactFlash","Shards","ResidualWake"};for(int i=0;i<5;i++){var mat=new Material(shader){name=names[i]};mat.SetFloat("_Role",i);mat.SetFloat("_DstBlend",i==1?1:10);mat.SetColor("_Core",ColorOf("#f4feff"));mat.SetColor("_Outline",ColorOf("#9edfff"));mat.SetColor("_Rim",ColorOf("#65e5ff"));mat.SetColor("_Trail",ColorOf("#2674ff"));AssetDatabase.CreateAsset(mat,Root+"/Materials/"+mat.name+".mat");mats[i]=mat;}
  var visual=Save(Projectile());var impact=Save(Impact());AssetDatabase.SaveAssets();
  var demo=new GameObject("CyberOrb_Demo");var close=(GameObject)PrefabUtility.InstantiatePrefab(visual,scene);close.transform.SetParent(demo.transform,false);close.name="Closeup_3x";close.transform.localPosition=new Vector3(-3,3.2f,0);close.transform.localScale=Vector3.one*3;
  var hitDemo=(GameObject)PrefabUtility.InstantiatePrefab(impact,scene);hitDemo.transform.SetParent(demo.transform,false);hitDemo.name="Impact_3x";hitDemo.transform.localPosition=new Vector3(3,3.2f,0);hitDemo.transform.localScale=Vector3.one*3;var hm=hitDemo.GetComponent<ParticleSystem>().main;hm.duration=1.1f;hm.loop=true;PrefabUtility.RecordPrefabInstancePropertyModifications(hitDemo.GetComponent<ParticleSystem>());
  foreach(var old in existing){if(old.g==null||old.active!=old.g.activeSelf||old.transform!=EditorJsonUtility.ToJson(old.g.transform)||old.camera!=(old.g.GetComponent<Camera>()==null?null:EditorJsonUtility.ToJson(old.g.GetComponent<Camera>())))throw new Exception("Pre-existing object changed; do not save");}
  EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);Selection.activeGameObject=demo;
  var result=new{success=true,prefabs=new[]{AssetDatabase.GetAssetPath(visual),AssetDatabase.GetAssetPath(impact)},shader=shader.isSupported,shaderMessages=ShaderUtil.GetShaderMessages(shader),scene=scene.path,oldRootsPreserved=true,sceneDirty=scene.isDirty};
  File.WriteAllText(Path.Combine(Project,"VFXWork/Previews/CyberOrb/V3.2/Import.json"),JsonConvert.SerializeObject(result,Formatting.Indented));return JsonConvert.SerializeObject(result);
 }
}
