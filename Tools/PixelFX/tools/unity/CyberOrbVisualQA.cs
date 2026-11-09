// Edit-mode deterministic still review only, not evidence of real playback.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.Profiling;
using Newtonsoft.Json;
public static class CyberOrbVisualQA {
 const string Root="Assets/PixelFX/CyberOrb/";
 static string Out=>Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/CyberOrb/V3.2");
 static List<object> samples=new List<object>();
 static void Hide(GameObject g){foreach(var t in g.GetComponentsInChildren<Transform>()){t.gameObject.layer=31;t.gameObject.hideFlags=HideFlags.HideAndDontSave;}}
 static Texture2D Render(string prefab,float time,string name,bool light=false,string property=null,Color? color=null,float? value=null,int seed=42,bool small=false,string only=null){
  GameObject g=null,cg=null;RenderTexture rt=null;var old=RenderTexture.active;var mats=new List<Material>();
  try{
   g=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"Prefabs/CyberOrb_"+prefab+".prefab"));Hide(g);
   foreach(var ps in g.GetComponentsInChildren<ParticleSystem>()){ps.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);ps.useAutoRandomSeed=false;ps.randomSeed=(uint)seed;}
   if(property!=null)foreach(var r in g.GetComponentsInChildren<ParticleSystemRenderer>()){var m=new Material(r.sharedMaterial);mats.Add(m);if(color.HasValue)m.SetColor(property,color.Value);if(value.HasValue)m.SetFloat(property,value.Value);r.sharedMaterial=m;}
   if(only!=null)foreach(var renderer in g.GetComponentsInChildren<ParticleSystemRenderer>())renderer.enabled=renderer.name==only;
   var top=g.GetComponentsInChildren<ParticleSystem>().Where(p=>p.transform.parent==null||p.transform.parent.GetComponent<ParticleSystem>()==null).ToArray();foreach(var p in top){p.Simulate(0,true,true,false);for(float t=0;t<time;t+=.002f)p.Simulate(Mathf.Min(.002f,time-t),true,false,false);}
   cg=new GameObject("CyberOrb_TemporaryReviewCamera"){hideFlags=HideFlags.HideAndDontSave};var cam=cg.AddComponent<Camera>();cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=light?new Color(.85f,.875f,.89f,1):new Color(.03137f,.06275f,.12549f,1);cam.cullingMask=1<<31;cam.orthographic=true;cam.orthographicSize=small?3:.6f;cam.nearClipPlane=.05f;cam.farClipPlane=20;cam.allowHDR=false;cam.allowMSAA=false;cam.transform.position=new Vector3(-.15f,0,-10);
   rt=new RenderTexture(640,360,24,RenderTextureFormat.ARGB32);rt.Create();cam.targetTexture=rt;cam.Render();RenderTexture.active=rt;var image=new Texture2D(640,360,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,640,360),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Out,name+".png"),image.EncodeToPNG());
   var pix=image.GetPixels32();var bg=pix[0];int visible=0;foreach(var p in pix)if(Math.Abs(p.r-bg.r)+Math.Abs(p.g-bg.g)+Math.Abs(p.b-bg.b)>12)visible++;
   samples.Add(new{name,prefab,time,light,seed,property,visible,center=pix[180*640+365].ToString(),background=bg.ToString(),systems=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{p.name,count=p.particleCount,time=p.time}).ToArray()});return image;
  }finally{RenderTexture.active=old;if(rt!=null){rt.Release();UnityEngine.Object.DestroyImmediate(rt);}foreach(var m in mats)UnityEngine.Object.DestroyImmediate(m);if(g!=null)UnityEngine.Object.DestroyImmediate(g);if(cg!=null)UnityEngine.Object.DestroyImmediate(cg);}
 }
 static int Diff(Texture2D a,Texture2D b){var pa=a.GetPixels32();var pb=b.GetPixels32();int n=0;for(int i=0;i<pa.Length;i++)if(Math.Abs(pa[i].r-pb[i].r)+Math.Abs(pa[i].g-pb[i].g)+Math.Abs(pa[i].b-pb[i].b)>8)n++;return n;}
 public static string Run(){
  if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||SceneManager.GetActiveScene().path!="Assets/Scenes/VFXWorkbench.unity")throw new Exception("Wrong target/state");
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"Shaders/CyberOrbNative.shader");if(!shader.isSupported||ShaderUtil.ShaderHasError(shader))throw new Exception("Shader failed");
  var baseline=Render("ProjectileVisual",1,"Flight_Dark");UnityEngine.Object.DestroyImmediate(Render("ProjectileVisual",1,"Flight_Light",true));UnityEngine.Object.DestroyImmediate(Render("ProjectileVisual",1,"Flight_GameSize",false,null,null,null,42,true));
  foreach(var t in new[]{0f,.016f,.05f,.09f,.15f,.21f})UnityEngine.Object.DestroyImmediate(Render("Impact",t,"Impact_"+Mathf.RoundToInt(t*1000)));
  UnityEngine.Object.DestroyImmediate(Render("Impact",.016f,"Impact_Light",true));foreach(var seed in new[]{1,179})UnityEngine.Object.DestroyImmediate(Render("Impact",.07f,"Impact_Seed"+seed,false,null,null,null,seed));
  UnityEngine.Object.DestroyImmediate(Render("Impact",.09f,"Shard_Only",false,null,null,null,42,false,"Shards"));UnityEngine.Object.DestroyImmediate(Render("Impact",.09f,"Shard_SolidProbe",false,"_Role",null,2,42,false,"Shards"));
  var tests=new List<object>();foreach(var prop in new[]{"_Core","_Outline","_Rim","_Trail"}){var muted=Render("ProjectileVisual",1,"Mute"+prop,false,prop,new Color(1,.1f,.4f,0));var changed=Render("ProjectileVisual",1,"Recolor"+prop,false,prop,new Color(1,.1f,.4f,1));tests.Add(new{prop,mutePixels=Diff(baseline,muted),huePixels=Diff(baseline,changed)});UnityEngine.Object.DestroyImmediate(muted);UnityEngine.Object.DestroyImmediate(changed);}
  var noGlow=Render("ProjectileVisual",1,"Glow_Off",false,"_Glow",null,0);tests.Add(new{prop="_Glow",changedPixels=Diff(baseline,noGlow)});UnityEngine.Object.DestroyImmediate(noGlow);UnityEngine.Object.DestroyImmediate(baseline);
  var structure=new[]{"ProjectileVisual","Impact","Shot"}.Select(n=>{var go=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"Prefabs/CyberOrb_"+n+".prefab");var components=go.GetComponentsInChildren<Component>(true).Select(c=>c==null?"MISSING":c.GetType().Name).ToArray();if(components.Contains("MISSING")||go.GetComponentsInChildren<MonoBehaviour>(true).Length>0)throw new Exception("Runtime script/missing dependency");return new{name=n,components=components.Distinct(),systems=go.GetComponentsInChildren<ParticleSystem>().Select(p=>new{p.name,loop=p.main.loop,lifeMin=p.main.startLifetime.constantMin,lifeMax=p.main.startLifetime.constantMax,space=p.main.simulationSpace.ToString(),autoSeed=p.useAutoRandomSeed,subEmitters=p.subEmitters.subEmittersCount,textureSheet=p.textureSheetAnimation.enabled,lights=p.lights.enabled,material=p.GetComponent<ParticleSystemRenderer>().sharedMaterial.name}).ToArray()};}).ToArray();
  var report=new{method="Static Edit Mode native Simulate, not actual playback",shaderMessages=ShaderUtil.GetShaderMessages(shader),structure,paletteTests=tests,samples,resourceMemory=new{meshes=AssetDatabase.FindAssets("t:Mesh",new[]{Root.TrimEnd('/')}).Sum(id=>Profiler.GetRuntimeMemorySizeLong(AssetDatabase.LoadMainAssetAtPath(AssetDatabase.GUIDToAssetPath(id)))),materials=AssetDatabase.FindAssets("t:Material",new[]{Root.TrimEnd('/')}).Sum(id=>Profiler.GetRuntimeMemorySizeLong(AssetDatabase.LoadMainAssetAtPath(AssetDatabase.GUIDToAssetPath(id)))),textures=0},sceneDirty=SceneManager.GetActiveScene().isDirty};File.WriteAllText(Path.Combine(Out,"VisualAndStructure.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(report);
 }
}
