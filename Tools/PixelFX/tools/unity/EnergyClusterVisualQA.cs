// Deterministic static captures only. Real engine playback is tested separately.
using System;using System.IO;using System.Linq;using System.Collections.Generic;
using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;using UnityEngine.Profiling;
using Newtonsoft.Json;
public static class EnergyClusterVisualQA {
 const string Root="Assets/PixelFX/EnergyCluster";
 static string Out=>Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/EnergyCluster/V6");
 static List<object> samples=new List<object>();
 static Texture2D Render(float time,string name,string only=null,string property=null,Color? color=null,float? value=null,bool light=false,float size=1.28f){
  var g=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/VFX_EnergyCluster_Loop.prefab"));
  GameObject cg=null;RenderTexture rt=null;var previous=RenderTexture.active;var mats=new List<Material>();
  try{
   foreach(var t in g.GetComponentsInChildren<Transform>()){t.gameObject.layer=31;t.gameObject.hideFlags=HideFlags.HideAndDontSave;}
   foreach(var r in g.GetComponentsInChildren<ParticleSystemRenderer>()){
    if(only!=null)r.enabled=r.name==only;
    if(property!=null){var m=new Material(r.sharedMaterial);mats.Add(m);r.sharedMaterial=m;if(color.HasValue)m.SetColor(property,color.Value);if(value.HasValue)m.SetFloat(property,value.Value);}
   }
   foreach(var p in g.GetComponentsInChildren<ParticleSystem>()){p.Simulate(0,false,true,false);for(float elapsed=0;elapsed<time;elapsed+=.002f)p.Simulate(Mathf.Min(.002f,time-elapsed),false,false,false);}
   cg=new GameObject("EnergyCluster_TemporaryCapture"){hideFlags=HideFlags.HideAndDontSave};var cam=cg.AddComponent<Camera>();cam.orthographic=true;cam.orthographicSize=size;cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=light?new Color(220/255f,224/255f,228/255f,1):new Color(5/255f,7/255f,22/255f,1);cam.cullingMask=1<<31;cam.transform.position=new Vector3(0,0,-10);cam.allowHDR=false;cam.allowMSAA=false;
   rt=new RenderTexture(256,256,24,RenderTextureFormat.ARGB32);rt.Create();cam.targetTexture=rt;cam.Render();RenderTexture.active=rt;
   var image=new Texture2D(256,256,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,256,256),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Out,name+".png"),image.EncodeToPNG());
   var pixels=image.GetPixels32();var bg=pixels[0];int visible=pixels.Count(p=>Math.Abs(p.r-bg.r)+Math.Abs(p.g-bg.g)+Math.Abs(p.b-bg.b)>10);
   samples.Add(new{name,time,only,property,visible,background=bg.ToString(),center=pixels[128*256+128].ToString(),systems=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{p.name,p.time,p.particleCount,age=Age(p)}).ToArray()});return image;
  }finally{RenderTexture.active=previous;if(rt!=null){rt.Release();UnityEngine.Object.DestroyImmediate(rt);}foreach(var m in mats)UnityEngine.Object.DestroyImmediate(m);UnityEngine.Object.DestroyImmediate(g);if(cg!=null)UnityEngine.Object.DestroyImmediate(cg);}
 }
 static float Age(ParticleSystem p){var a=new ParticleSystem.Particle[1];return p.GetParticles(a)>0?a[0].startLifetime-a[0].remainingLifetime:-1;}
 static int Diff(Texture2D a,Texture2D b){var x=a.GetPixels32();var y=b.GetPixels32();return Enumerable.Range(0,x.Length).Count(i=>Math.Abs(x[i].r-y[i].r)+Math.Abs(x[i].g-y[i].g)+Math.Abs(x[i].b-y[i].b)>8);}
 public static string Run(){
  if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||SceneManager.GetActiveScene().path!="Assets/Scenes/VFXWorkbench.unity")throw new Exception("Wrong target/state.");
  var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/VFX_EnergyCluster_Loop.prefab");var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"/Shaders/EnergyClusterHybrid.shader");
  var baseline=Render(.144f,"Unity_Default");foreach(var t in new[]{.024f,.288f,.456f})UnityEngine.Object.DestroyImmediate(Render(t,"Unity_Time"+Mathf.RoundToInt(t*1000)));
  UnityEngine.Object.DestroyImmediate(Render(.144f,"Unity_Light",light:true));UnityEngine.Object.DestroyImmediate(Render(.144f,"Unity_GameSize",size:3.84f));
  foreach(var layer in new[]{"Volume","Halo","Core","ShellGlow","Shell"})UnityEngine.Object.DestroyImmediate(Render(.144f,"Layer_"+layer,layer));
  var tests=new List<object>();
  foreach(var prop in new[]{"_ShellHot","_ShellCool","_CoreColor","_BodyColor","_InnerColor","_GlowColor"}){
   var off=Render(.144f,"Mute"+prop,property:prop,color:new Color(1,.05f,.3f,0));var hue=Render(.144f,"Color"+prop,property:prop,color:new Color(1,.05f,.3f,1));tests.Add(new{prop,mutedPixels=Diff(baseline,off),recoloredPixels=Diff(baseline,hue)});UnityEngine.Object.DestroyImmediate(off);UnityEngine.Object.DestroyImmediate(hue);
  }
  var start=Render(.12f,"Loop_Start");var end=Render(.60f,"Loop_Repeat");int loopDiff=Diff(start,end);UnityEngine.Object.DestroyImmediate(start);UnityEngine.Object.DestroyImmediate(end);UnityEngine.Object.DestroyImmediate(baseline);
  var components=prefab.GetComponentsInChildren<Component>(true).Select(c=>c==null?"MISSING":c.GetType().Name).Distinct().ToArray();
  var report=new{method="Edit-mode native Simulate / isolated static review, not real playback",shaderSupported=shader.isSupported,shaderMessages=ShaderUtil.GetShaderMessages(shader),components,scripts=prefab.GetComponentsInChildren<MonoBehaviour>(true).Length,loopDiff,tests,samples,
   systems=prefab.GetComponentsInChildren<ParticleSystem>().Select(p=>new{p.name,p.main.duration,p.main.loop,lifetime=p.main.startLifetime.constant,p.main.maxParticles,p.main.simulationSpace,sheet=p.textureSheetAnimation.enabled,lights=p.lights.enabled,streams=p.GetComponent<ParticleSystemRenderer>().activeVertexStreamsCount,material=AssetDatabase.GetAssetPath(p.GetComponent<ParticleSystemRenderer>().sharedMaterial)}).ToArray(),
   textures=AssetDatabase.FindAssets("t:Texture2D",new[]{Root}).Select(id=>{var t=AssetDatabase.LoadAssetAtPath<Texture2D>(AssetDatabase.GUIDToAssetPath(id));return new{t.name,t.width,t.height,format=t.format.ToString(),t.isReadable,mipCount=t.mipmapCount,bytes=Profiler.GetRuntimeMemorySizeLong(t)};}).ToArray(),dirty=SceneManager.GetActiveScene().isDirty};
  File.WriteAllText(Path.Combine(Out,"VisualAndStructure.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(new{shader.isSupported,components,loopDiff,tests,report.textures,report.dirty});
 }
}
