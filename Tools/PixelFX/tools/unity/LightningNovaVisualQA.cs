// Deterministic EDIT-MODE review only. This does not prove real playback.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;
using UnityEngine.Profiling;
using Newtonsoft.Json;
public static class LightningNovaVisualQA {
 const string Root="Assets/PixelFX/LightningNova/";
 static string Out=Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/LightningNova/V1.3");
 static List<object> results=new List<object>();
 static Texture2D Render(bool flat,float time,string name,float elevation=24,float yaw=0,bool light=false,int seed=69,string only=null,string mute=null,string palette=null){
  var scene=EditorSceneManager.NewPreviewScene();GameObject g=null;RenderTexture rt=null;var mats=new List<Material>();Texture2D image=null;var old=RenderTexture.active;
  try {
   g=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"Prefabs/LightningNova_"+(flat?"2D":"3D")+".prefab"),scene);
   foreach(var ps in g.GetComponentsInChildren<ParticleSystem>()){ps.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);ps.useAutoRandomSeed=false;ps.randomSeed=(uint)seed;}
   var map=new Dictionary<Material,Material>();foreach(var r in g.GetComponentsInChildren<ParticleSystemRenderer>()){if(r.sharedMaterial==null)continue;if(!map.ContainsKey(r.sharedMaterial)){var mat=new Material(r.sharedMaterial);map[r.sharedMaterial]=mat;mats.Add(mat);if(mute!=null){var c=mat.GetColor(mute);c.a=0;mat.SetColor(mute,c);}if(palette!=null){mat.SetColor("_Core",new Color(1,.9f,.3f));mat.SetColor("_Body",new Color(1,.12f,.45f));mat.SetColor("_Edge",new Color(.45f,.02f,.8f));mat.SetColor("_Spark",new Color(.5f,1,.12f));}}r.sharedMaterial=map[r.sharedMaterial];if(only!=null)r.enabled=r.name==only;}
   var cg=new GameObject("QA Camera");SceneManager.MoveGameObjectToScene(cg,scene);var cam=cg.AddComponent<Camera>();cam.scene=scene;cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=light?new Color(.6f,.6f,.6f,1):new Color(.022f,.032f,.055f,1);cam.orthographic=true;cam.orthographicSize=3.8f;cam.nearClipPlane=.05f;cam.farClipPlane=100;cam.allowHDR=false;cam.allowMSAA=false;
   var focus=new Vector3(0,1.55f,0);cam.transform.position=flat?focus+new Vector3(0,0,-12):focus+Quaternion.Euler(elevation,yaw,0)*new Vector3(0,0,-12);cam.transform.LookAt(focus);
   foreach(var p in g.GetComponentsInChildren<ParticleSystem>()){p.Simulate(0,false,true,false);for(float elapsed=0;elapsed<time;elapsed+=.002f)p.Simulate(Mathf.Min(.002f,time-elapsed),false,false,false);}
   rt=new RenderTexture(768,640,24,RenderTextureFormat.ARGB32);rt.Create();cam.targetTexture=rt;cam.Render();RenderTexture.active=rt;image=new Texture2D(768,640,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,768,640),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Out,name+".png"),image.EncodeToPNG());
   var pixels=image.GetPixels32();var bg=pixels[0];int visible=0,minX=768,minY=640,maxX=0,maxY=0;foreach(var index in Enumerable.Range(0,pixels.Length)){var p=pixels[index];if(Math.Abs(p.r-bg.r)+Math.Abs(p.g-bg.g)+Math.Abs(p.b-bg.b)>15){visible++;minX=Math.Min(minX,index%768);maxX=Math.Max(maxX,index%768);minY=Math.Min(minY,index/768);maxY=Math.Max(maxY,index/768);}}
   results.Add(new{name,time,flat,elevation,yaw,seed,only,mute,palette,visible,bounds=new[]{minX,minY,maxX,maxY},particles=g.GetComponentsInChildren<ParticleSystem>().Sum(p=>p.particleCount)});return image;
  }finally{RenderTexture.active=old;if(rt!=null){rt.Release();UnityEngine.Object.DestroyImmediate(rt);}foreach(var m in mats)UnityEngine.Object.DestroyImmediate(m);EditorSceneManager.ClosePreviewScene(scene);}
 }
 static int Diff(Texture2D a,Texture2D b){var pa=a.GetPixels32();var pb=b.GetPixels32();return Enumerable.Range(0,pa.Length).Count(i=>Math.Abs(pa[i].r-pb[i].r)+Math.Abs(pa[i].g-pb[i].g)+Math.Abs(pa[i].b-pb[i].b)>8);}
 public static string Run(){
  if(Application.isPlaying||Application.productName!="VFXDemo")throw new Exception("Wrong state");Directory.CreateDirectory(Out);
  var structures=new List<object>();foreach(var flat in new[]{true,false}){var path=Root+"Prefabs/LightningNova_"+(flat?"2D":"3D")+".prefab";var g=AssetDatabase.LoadAssetAtPath<GameObject>(path);structures.Add(new{path,components=g.GetComponentsInChildren<Component>(true).Select(x=>x==null?"MISSING":x.GetType().Name).Distinct().ToArray(),systems=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{name=p.name,duration=p.main.duration,loop=p.main.loop,autoSeed=p.useAutoRandomSeed,bursts=p.emission.burstCount,textureSheet=p.textureSheetAnimation.enabled,lights=p.lights.enabled,streams=p.GetComponent<ParticleSystemRenderer>().activeVertexStreamsCount}).ToArray()});}
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"Shaders/LightningNovaNative.shader");if(ShaderUtil.ShaderHasError(shader))throw new Exception("Shader compilation errors: "+string.Join("; ",ShaderUtil.GetShaderMessages(shader).Select(x=>x.message)));
  foreach(var flat in new[]{true,false})foreach(var t in new[]{.112f,.165f,.24f,.305f,.44f,.94f,1.21f})UnityEngine.Object.DestroyImmediate(Render(flat,t,(flat?"2D":"3D")+"_"+Mathf.RoundToInt(t*1000)));
  foreach(var angle in new[]{5f,60f,85f})UnityEngine.Object.DestroyImmediate(Render(false,.24f,"3D_Angle"+angle,angle,35));
  foreach(var seed in new[]{22,143,329})UnityEngine.Object.DestroyImmediate(Render(false,.24f,"3D_Seed"+seed,24,0,false,seed));
  UnityEngine.Object.DestroyImmediate(Render(false,.165f,"3D_LightBackground",24,0,true));UnityEngine.Object.DestroyImmediate(Render(false,.24f,"3D_RingsOnly",24,0,false,69,"OrbitOuter"));UnityEngine.Object.DestroyImmediate(Render(false,.24f,"3D_SparksOnly",24,0,false,69,"EjectedCharges"));
  var paletteTests=new List<object>();foreach(var prop in new[]{"_Core","_Body","_Edge","_Spark"}){float time=prop=="_Spark"?.4f:.165f;var a=Render(false,time,"Palette_Default"+prop);var b=Render(false,time,"Palette_Mute"+prop,24,0,false,69,null,prop);paletteTests.Add(new{prop,changedPixels=Diff(a,b)});UnityEngine.Object.DestroyImmediate(a);UnityEngine.Object.DestroyImmediate(b);}
  UnityEngine.Object.DestroyImmediate(Render(false,.165f,"Palette_Red",24,0,false,69,null,null,"red"));
  var report=new{method="Edit Mode deterministic native Simulate for static review only",structures,shaderSupported=shader.isSupported,shaderErrors=ShaderUtil.GetShaderMessages(shader),paletteTests,samples=results,resourceMemory=new{meshes=AssetDatabase.FindAssets("t:Mesh",new[]{Root.TrimEnd('/')}).Sum(id=>Profiler.GetRuntimeMemorySizeLong(AssetDatabase.LoadMainAssetAtPath(AssetDatabase.GUIDToAssetPath(id)))),materials=AssetDatabase.FindAssets("t:Material",new[]{Root.TrimEnd('/')}).Sum(id=>Profiler.GetRuntimeMemorySizeLong(AssetDatabase.LoadMainAssetAtPath(AssetDatabase.GUIDToAssetPath(id))))}};
  File.WriteAllText(Path.Combine(Out,"VisualAndStructure.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(report);
 }
}
