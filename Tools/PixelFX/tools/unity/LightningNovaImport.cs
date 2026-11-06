// One-time authoring command. Kept outside Assets; not a runtime or Editor dependency.
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
public static class LightningNovaImport
{
 [Serializable] public class Recipe{public string effect,version,sourceHash;public MeshData[] meshes;}
 [Serializable] public class MeshData{public string name;public float[] data;}
 const string Root="Assets/PixelFX/LightningNova";
 static readonly string Project=Directory.GetParent(Application.dataPath).FullName;
 static string Evidence=>Path.Combine(Project,"VFXWork/Previews/LightningNova/V1.3");
 static Dictionary<string,Mesh> meshes=new Dictionary<string,Mesh>();
 static ParticleSystem.MinMaxCurve Const(float f)=>new ParticleSystem.MinMaxCurve(f,f);
 static ParticleSystem.MinMaxCurve Curve(params float[] values){var keys=new List<Keyframe>();for(int i=0;i<values.Length;i+=2)keys.Add(new Keyframe(values[i],values[i+1]));return new ParticleSystem.MinMaxCurve(1,new AnimationCurve(keys.ToArray()));}
 static ParticleSystem.Burst B(float t,int n)=>new ParticleSystem.Burst(t,(short)n);
 static ParticleSystem Make(Transform parent,string name,string mesh,Material mat,float life,params ParticleSystem.Burst[] bursts){
  var g=new GameObject(name);g.transform.SetParent(parent,false);var p=g.AddComponent<ParticleSystem>();p.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
  var m=p.main;m.duration=1.2f;m.loop=false;m.playOnAwake=true;m.startLifetime=life;m.startSpeed=0;m.startSize3D=true;m.startSizeX=Const(1);m.startSizeY=Const(1);m.startSizeZ=Const(1);m.startRotation3D=true;m.startRotationX=Const(0);m.startRotationY=Const(0);m.startRotationZ=Const(0);m.startColor=Color.white;m.simulationSpace=ParticleSystemSimulationSpace.Local;m.scalingMode=ParticleSystemScalingMode.Hierarchy;m.maxParticles=128;m.cullingMode=ParticleSystemCullingMode.AlwaysSimulate;
  var e=p.emission;e.enabled=bursts.Length>0;e.rateOverTime=0;e.SetBursts(bursts);var shape=p.shape;shape.enabled=false;
  var r=g.GetComponent<ParticleSystemRenderer>();r.enabled=mesh!=null;r.alignment=ParticleSystemRenderSpace.Local;if(mesh!=null){r.renderMode=ParticleSystemRenderMode.Mesh;r.mesh=meshes[mesh];r.sharedMaterial=mat;r.enableGPUInstancing=false;r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;r.lightProbeUsage=LightProbeUsage.Off;r.reflectionProbeUsage=ReflectionProbeUsage.Off;r.sortMode=ParticleSystemSortMode.Distance;r.localBounds=new Bounds(new Vector3(0,2,0),new Vector3(9,8,9));
   r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Normal,ParticleSystemVertexStream.Tangent,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV,ParticleSystemVertexStream.UV2,ParticleSystemVertexStream.UV3,ParticleSystemVertexStream.UV4,ParticleSystemVertexStream.AgePercent,ParticleSystemVertexStream.InvStartLifetime,ParticleSystemVertexStream.StableRandomXY,ParticleSystemVertexStream.SizeXYZ});}
  p.useAutoRandomSeed=false;p.randomSeed=69;return p;
 }
 static void RandomRotation(ParticleSystem p,bool flat){var m=p.main;if(flat)m.startRotationZ=new ParticleSystem.MinMaxCurve(0,Mathf.PI*2);else m.startRotationY=new ParticleSystem.MinMaxCurve(0,Mathf.PI*2);p.useAutoRandomSeed=true;}
 static Material MaterialFor(Shader shader,bool flat,bool additive){var m=new Material(shader){name=(flat?"2D":"3D")+(additive?"_Additive":"_Color")};m.SetFloat("_Flat",flat?1:0);m.SetFloat("_Additive",additive?1:0);m.SetFloat("_DstBlend",additive?1:10);m.SetFloat("_Seed",69);m.SetFloat("_Radius",2.5f);m.SetFloat("_Intensity",1);m.SetFloat("_Glow",.65f);Color c;ColorUtility.TryParseHtmlString("#f5ffff",out c);m.SetColor("_Core",c);ColorUtility.TryParseHtmlString("#73eaff",out c);m.SetColor("_Body",c);ColorUtility.TryParseHtmlString("#387bfa",out c);m.SetColor("_Edge",c);ColorUtility.TryParseHtmlString("#bcf7ff",out c);m.SetColor("_Spark",c);AssetDatabase.CreateAsset(m,Root+"/Materials/"+m.name+".mat");return m;}
 static GameObject Build(bool flat,Shader shader){
  var color=MaterialFor(shader,flat,false);var glow=MaterialFor(shader,flat,true);var g=new GameObject(flat?"LightningNova_2D":"LightningNova_3D");Make(g.transform,"Playback",null,null,1.2f);
  Make(g.transform,"Leader","Leader",color,.045f,B(.055f,1));
  Make(g.transform,"MainStrike","MainBolt",color,.108f,B(.1f,1));
  var echo=Make(g.transform,"Restrikes","MainBolt",color,.04f,B(.23f,1),B(.355f,1));var em=echo.main;em.startColor=new Color(1,1,1,.28f);
  Make(g.transform,"CrownRelease","Crown",color,.175f,B(.1f,1));
  Make(g.transform,"ImpactRelease","Impact",color,.175f,B(.1f,1));
  Make(g.transform,"OrbitOuter","OrbitOuter",color,.36f,B(.118f,1));Make(g.transform,"OrbitInner","OrbitInner",color,.36f,B(.146f,1));Make(g.transform,"DescendingWhips","DescendingWhips",color,.235f,B(.135f,1));
  Make(g.transform,"MainStrikeGlow","MainBolt",glow,.108f,B(.1f,1));Make(g.transform,"OrbitalGlow","OrbitalLight",glow,.4f,B(.118f,1));
  Make(g.transform,"GroundCharge","GroundCharge",glow,.1f,B(0,1));Make(g.transform,"GroundFlash","GroundFlash",glow,.18f,B(.1f,1));
  var arcs=Make(g.transform,"SecondaryCurrents","Arc",color,.25f,B(.15f,6),B(.2f,6),B(.25f,5));var am=arcs.main;am.startLifetime=new ParticleSystem.MinMaxCurve(.15f,.36f);RandomRotation(arcs,flat);var sh=arcs.shape;sh.enabled=true;sh.shapeType=ParticleSystemShapeType.Circle;sh.radius=2;sh.radiusThickness=.45f;sh.rotation=flat?Vector3.zero:new Vector3(90,0,0);sh.scale=flat?new Vector3(1,.406737f,1):Vector3.one;sh.position=new Vector3(0,.08f,0);
  var sparks=Make(g.transform,"EjectedCharges","Spark",color,.5f,B(.13f,14),B(.18f,14),B(.23f,10));var sm=sparks.main;sm.startLifetime=new ParticleSystem.MinMaxCurve(.25f,.71f);sm.startSizeX=new ParticleSystem.MinMaxCurve(.045f,.12f);sm.startSizeY=sm.startSizeX;sm.startSizeZ=sm.startSizeX;sm.gravityModifier=.98f;RandomRotation(sparks,flat);
  var ss=sparks.shape;ss.enabled=true;ss.shapeType=ParticleSystemShapeType.Sphere;ss.radius=.08f;ss.scale=flat?new Vector3(1,1,0):Vector3.one;ss.position=new Vector3(0,.25f,0);
  var velocity=sparks.velocityOverLifetime;velocity.enabled=true;velocity.space=ParticleSystemSimulationSpace.Local;velocity.x=new ParticleSystem.MinMaxCurve(-4,4);velocity.y=new ParticleSystem.MinMaxCurve(1,3.5f);velocity.z=flat?Const(0):new ParticleSystem.MinMaxCurve(-4,4);
  var drag=sparks.limitVelocityOverLifetime;drag.enabled=true;drag.drag=1.8f;drag.multiplyDragByParticleSize=false;drag.multiplyDragByParticleVelocity=false;
  var size=sparks.sizeOverLifetime;size.enabled=true;size.size=Curve(0,1,1,.12f);var col=sparks.colorOverLifetime;col.enabled=true;var grad=new Gradient();grad.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},new[]{new GradientAlphaKey(0,0),new GradientAlphaKey(1,.06f),new GradientAlphaKey(.6f,.55f),new GradientAlphaKey(0,1)});col.color=grad;
  var tail=Make(g.transform,"ResidualSnap","Arc",color,.06f,B(.42f,2),B(.55f,1),B(.7f,1),B(.82f,1));var tm=tail.main;tm.startSizeX=Const(.5f);tm.startSizeY=Const(.5f);tm.startSizeZ=Const(.5f);tm.startColor=new Color(1,1,1,.65f);RandomRotation(tail,flat);var ts=tail.shape;ts.enabled=true;ts.shapeType=ParticleSystemShapeType.Sphere;ts.radius=.2f;ts.scale=flat?new Vector3(1,1,0):Vector3.one;ts.position=new Vector3(0,.16f,0);
  foreach(var p in g.GetComponentsInChildren<ParticleSystem>())p.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);
  var saved=PrefabUtility.SaveAsPrefabAsset(g,Root+"/Prefabs/"+g.name+".prefab");UnityEngine.Object.DestroyImmediate(g);return saved;
 }
 public static string Run(){
  var scene=SceneManager.GetActiveScene();if(Application.dataPath!=Path.Combine(Project,"Assets")||Application.productName!="VFXDemo"||scene.path!="Assets/Scenes/VFXWorkbench.unity"||Application.isPlaying||scene.isDirty)throw new Exception("Target/scene is not the verified clean workbench.");
  if(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/LightningNova_3D.prefab")!=null)throw new Exception("Preserve existing prefab; explicit versioned update required.");
  Directory.CreateDirectory(Evidence);Directory.CreateDirectory(Path.Combine(Project,"VFXWork/Backups/LightningNova/V1.3"));
  var before=new{scene=scene.path,dirty=scene.isDirty,roots=scene.GetRootGameObjects().Select(g=>new{name=g.name,id=g.GetInstanceID(),active=g.activeSelf,position=g.transform.position.ToString(),rotation=g.transform.rotation.ToString(),scale=g.transform.localScale.ToString()}),camera=EditorJsonUtility.ToJson(Camera.main),background=Application.runInBackground};
  if(!File.Exists(Path.Combine(Evidence,"Before.json")))File.WriteAllText(Path.Combine(Evidence,"Before.json"),JsonConvert.SerializeObject(before,Formatting.Indented));var backup=Path.Combine(Project,"VFXWork/Backups/LightningNova/V1.3/VFXWorkbench-before.unity");if(!File.Exists(backup))File.Copy(Path.Combine(Project,scene.path),backup,false);
  foreach(var dir in new[]{"Meshes","Materials","Prefabs","Docs"})Directory.CreateDirectory(Path.Combine(Project,Root,dir));AssetDatabase.Refresh();
  var recipe=JsonConvert.DeserializeObject<Recipe>(File.ReadAllText(Path.Combine(Project,"VFXWork/Exports/LightningNova/V1.3/native-recipe.json")));
  if(recipe.sourceHash!="0fae2726a83fdac40a742a7510d6dc89cdc23f4199bbaba8937da57e2c28b664")throw new Exception("Wrong source.");
  foreach(var data in recipe.meshes){int n=data.data.Length/8;var existing=AssetDatabase.LoadAssetAtPath<Mesh>(Root+"/Meshes/"+data.name+".asset");if(existing!=null){if(existing.vertexCount!=n)throw new Exception("Partial mesh mismatch: "+data.name);meshes.Add(data.name,existing);continue;}var verts=new Vector3[n];var normals=Enumerable.Repeat(Vector3.up,n).ToArray();var tangents=Enumerable.Repeat(new Vector4(1,0,0,1),n).ToArray();var m=new Mesh{name=data.name,indexFormat=IndexFormat.UInt32};m.vertices=verts;m.normals=normals;m.tangents=tangents;m.colors32=Enumerable.Repeat(new Color32(255,255,255,255),n).ToArray();for(int c=0;c<4;c++){var uv=new List<Vector2>();for(int i=0;i<n;i++)uv.Add(new Vector2(data.data[i*8+c*2],data.data[i*8+c*2+1]));m.SetUVs(c,uv);}m.SetTriangles(Enumerable.Range(0,n).ToArray(),0);m.bounds=new Bounds(new Vector3(0,2,0),new Vector3(8,7,8));AssetDatabase.CreateAsset(m,Root+"/Meshes/"+data.name+".asset");meshes.Add(data.name,m);}
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"/Shaders/LightningNovaNative.shader");if(shader==null||ShaderUtil.ShaderHasError(shader))throw new Exception("Shader errors: "+JsonConvert.SerializeObject(ShaderUtil.GetShaderMessages(shader)));
  var a=Build(true,shader);var b=Build(false,shader);AssetDatabase.SaveAssets();
  // Keep existing camera and scene objects unchanged. The 3D sample alone is tilted for this front workbench camera.
  var left=(GameObject)PrefabUtility.InstantiatePrefab(a,scene);left.name="LightningNova_2D_Demo";left.transform.position=new Vector3(-3.1f,-.35f,0);
  var right=(GameObject)PrefabUtility.InstantiatePrefab(b,scene);right.name="LightningNova_3D_Demo";right.transform.position=new Vector3(3.1f,-.35f,0);right.transform.rotation=Quaternion.Euler(30,-22,0);
  foreach(var g in new[]{left,right})foreach(var p in g.GetComponentsInChildren<ParticleSystem>()){var main=p.main;main.duration=1.9f;main.loop=true;PrefabUtility.RecordPrefabInstancePropertyModifications(p);}
  EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);Selection.activeGameObject=right;
  var report=new{success=true,source=recipe.sourceHash,prefabs=new[]{AssetDatabase.GetAssetPath(a),AssetDatabase.GetAssetPath(b)},systemsPerPrefab=b.GetComponentsInChildren<ParticleSystem>().Length,meshes=meshes.Count,shaderMessages=ShaderUtil.GetShaderMessages(shader),roots=scene.GetRootGameObjects().Select(g=>g.name),dirty=scene.isDirty};File.WriteAllText(Path.Combine(Evidence,"Import.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(report);
 }
}
