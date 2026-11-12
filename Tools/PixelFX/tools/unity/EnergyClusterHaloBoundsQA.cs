// Scoped, one-shot Editor QA. Kept outside Assets; never a runtime dependency.
using System;using System.IO;using System.Linq;using System.Collections.Generic;
using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;using Newtonsoft.Json;
public static class EnergyClusterHaloBoundsQA {
 const string Phase = "Before";
 const string Root="Assets/PixelFX/EnergyCluster";
 static string Out=>Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/EnergyCluster/V6/HaloBoundsFix");
 static object Capture(float time,string name,Color bg,string only=null,float size=2.56f){
  var g=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/VFX_EnergyCluster_Loop.prefab"));
  GameObject cg=null;RenderTexture rt=null;var previous=RenderTexture.active;
  try{
   foreach(var t in g.GetComponentsInChildren<Transform>()){t.gameObject.layer=31;t.gameObject.hideFlags=HideFlags.HideAndDontSave;}
   foreach(var r in g.GetComponentsInChildren<ParticleSystemRenderer>())if(only!=null)r.enabled=r.name==only;
   foreach(var p in g.GetComponentsInChildren<ParticleSystem>()){p.Simulate(0,false,true,false);for(float elapsed=0;elapsed<time;elapsed+=.002f)p.Simulate(Mathf.Min(.002f,time-elapsed),false,false,false);}
   cg=new GameObject("HaloBounds_TemporaryCapture"){hideFlags=HideFlags.HideAndDontSave};var cam=cg.AddComponent<Camera>();cam.orthographic=true;cam.orthographicSize=size;cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=bg;cam.cullingMask=1<<31;cam.transform.position=new Vector3(0,0,-10);cam.allowHDR=false;cam.allowMSAA=false;
   rt=new RenderTexture(512,512,24,RenderTextureFormat.ARGB32);rt.Create();cam.targetTexture=rt;cam.Render();RenderTexture.active=rt;
   var image=new Texture2D(512,512,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,512,512),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Out,Phase+"_"+name+".png"),image.EncodeToPNG());var pixels=image.GetPixels32();var corner=pixels[0];UnityEngine.Object.DestroyImmediate(image);
   return new{name,time,only,size,background=corner.ToString(),particles=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{p.name,p.particleCount}).ToArray()};
  }finally{RenderTexture.active=previous;if(rt!=null){rt.Release();UnityEngine.Object.DestroyImmediate(rt);}UnityEngine.Object.DestroyImmediate(g);if(cg!=null)UnityEngine.Object.DestroyImmediate(cg);}
 }
 static object Describe(GameObject g){return new{g.name,position=g.transform.localPosition.ToString("R"),rotation=g.transform.localRotation.ToString("R"),scale=g.transform.localScale.ToString("R"),systems=g.GetComponentsInChildren<ParticleSystem>(true).Select(p=>new{p.name,json=EditorJsonUtility.ToJson(p),renderer=EditorJsonUtility.ToJson(p.GetComponent<ParticleSystemRenderer>())}).ToArray(),scripts=g.GetComponentsInChildren<MonoBehaviour>(true).Length};}
 public static string Run(){
  if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||SceneManager.GetActiveScene().path!="Assets/Scenes/VFXWorkbench.unity")throw new Exception("Wrong target/state");
  Directory.CreateDirectory(Out);var scene=SceneManager.GetActiveScene();var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/VFX_EnergyCluster_Loop.prefab");var halo=prefab.GetComponentsInChildren<ParticleSystem>().Single(p=>p.name=="Halo");
  var temp=new GameObject("MaxSizeProbe"){hideFlags=HideFlags.HideAndDontSave};temp.AddComponent<ParticleSystem>();var rr=temp.GetComponent<ParticleSystemRenderer>();rr.maxParticleSize=1.5f;float maxSizeProbe=rr.maxParticleSize;UnityEngine.Object.DestroyImmediate(temp);
  if(Phase=="Before")foreach(var path in new[]{Root+"/Shaders/EnergyClusterHybrid.shader",Root+"/Prefabs/VFX_EnergyCluster_Loop.prefab",scene.path}){var backup=Path.Combine(Out,Path.GetFileName(path)+".before");if(!File.Exists(backup))File.Copy(path,backup,false);}
  var sceneInstances=scene.GetRootGameObjects().Where(g=>g.name==prefab.name).Select(g=>new{state=Describe(g),overrides=PrefabUtility.GetPropertyModifications(g).Select(m=>new{target=m.target==null?null:m.target.name,type=m.target==null?null:m.target.GetType().Name,m.propertyPath,m.value,objectReference=m.objectReference==null?null:AssetDatabase.GetAssetPath(m.objectReference)}).ToArray()}).ToArray();
  var samples=new List<object>();var dark=new Color(22/255f,24/255f,32/255f,1);samples.Add(Capture(.144f,"Dark",dark));samples.Add(Capture(.144f,"Black",Color.black));samples.Add(Capture(.144f,"Light",new Color(.86f,.88f,.9f,1)));samples.Add(Capture(.144f,"Halo",dark,"Halo"));samples.Add(Capture(.144f,"Shell",dark,"Shell"));samples.Add(Capture(.144f,"GameSize",dark,size:4.9f));samples.Add(Capture(.144f,"Close",dark,size:1.28f));samples.Add(Capture(.144f,"SizeClamp",dark,size:.64f));
  foreach(float t in new[]{.024f,.288f,.456f,.492f})samples.Add(Capture(t,"Time"+Mathf.RoundToInt(t*1000),dark));
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"/Shaders/EnergyClusterHybrid.shader");
  var report=new{phase=Phase,method="Padded static native Simulate captures. Real Play is separate.",maxSizeProbe,shader.isSupported,messages=ShaderUtil.GetShaderMessages(shader),prefab=Describe(prefab),sceneInstances,scene=scene.path,sceneDirty=scene.isDirty,cameras=scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<Camera>(true)).Select(c=>new{c.name,json=EditorJsonUtility.ToJson(c),transform=EditorJsonUtility.ToJson(c.transform)}).ToArray(),samples};
  File.WriteAllText(Path.Combine(Out,Phase+".json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(new{Phase,maxSizeProbe,shader.isSupported,shaderErrors=ShaderUtil.GetShaderMessages(shader).Length,sceneDirty=scene.isDirty,haloSize=halo.main.startSize.constant,sceneInstances=sceneInstances.Length});
 }
}
