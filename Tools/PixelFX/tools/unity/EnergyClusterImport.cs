// One-time scoped authoring; kept outside Assets. Not an effect runtime dependency.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using UnityEngine;
using UnityEditor;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;
using Newtonsoft.Json;
public static class EnergyClusterImport {
 const string Root="Assets/PixelFX/EnergyCluster";
 const string Source="Tools/PixelFX/output/hd/EnergyCluster/V6/final";
 static string Project=>Directory.GetParent(Application.dataPath).FullName;
 static string Out=>Path.Combine(Project,"VFXWork/Previews/EnergyCluster/V6");
 static string Hash(byte[] b){using(var s=SHA256.Create())return BitConverter.ToString(s.ComputeHash(b)).Replace("-","").ToLowerInvariant();}
 static Color C(string s){Color c;ColorUtility.TryParseHtmlString(s,out c);return c;}
 static Texture2D Texture(string name,byte[] raw,int w,int h,TextureFormat format){
  var t=new Texture2D(w,h,format,false,true){name=name,wrapMode=TextureWrapMode.Clamp,filterMode=FilterMode.Bilinear,anisoLevel=0};
  t.LoadRawTextureData(raw);t.Apply(false,true);AssetDatabase.CreateAsset(t,Root+"/Textures/"+name+".asset");return t;
 }
 public static string Run(){
  var scene=SceneManager.GetActiveScene();
  if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.productName!="VFXDemo"||scene.path!="Assets/Scenes/VFXWorkbench.unity"||scene.isDirty||Application.isPlaying)throw new Exception("Wrong project/state; protect scene.");
  if(AssetDatabase.IsValidFolder(Root+"/Prefabs"))throw new Exception("Existing EnergyCluster assets must not be rebuilt.");
  Directory.CreateDirectory(Out);
  var oldRoots=scene.GetRootGameObjects().Select(g=>new{g,active=g.activeSelf,transform=EditorJsonUtility.ToJson(g.transform),components=g.GetComponents<Component>().Select(c=>c==null?"MISSING":EditorJsonUtility.ToJson(c)).ToArray()}).ToArray();
  var raw=File.ReadAllBytes(Path.Combine(Project,Source,"Textures/EnergyCluster_ShellGrayAlpha.rg"));
  var profile=File.ReadAllBytes(Path.Combine(Project,Source,"Textures/EnergyCluster_Profiles.rgba"));
  var source=File.ReadAllBytes(Path.Combine(Project,"Tools/PixelFX/src/hd/energy-cluster-v6.js"));
  if(Hash(source)!="3fae51f92d2f11a9cfa446325f7ab87af37e56723500a057dc30e427b1b0b8f7"||Hash(raw)!="7d953a1f7ade42c693bcae07fb745830a0861c6eeebb2f29f390c9c43def3670"||raw.Length!=1280*1024*2||profile.Length!=3072)throw new Exception("Approved source mismatch.");
  if(!SystemInfo.SupportsTextureFormat(TextureFormat.RG16))throw new Exception("RG16 unsupported; do not silently double atlas storage.");
  File.WriteAllText(Path.Combine(Out,"Before.json"),JsonConvert.SerializeObject(new{dataPath=Application.dataPath,scene=scene.path,dirty=scene.isDirty,roots=oldRoots.Select(x=>new{x.g.name,x.active,x.transform}),camera=EditorJsonUtility.ToJson(Camera.main)},Formatting.Indented));
  File.Copy(Path.Combine(Project,scene.path),Path.Combine(Out,"VFXWorkbench-before.snapshot"),false);
  foreach(var d in new[]{"Textures","Materials","Prefabs","Docs"})Directory.CreateDirectory(Path.Combine(Project,Root,d));AssetDatabase.Refresh();
  var shell=Texture("EnergyCluster_ShellGrayAlpha",raw,1280,1024,TextureFormat.RG16);
  var profiles=Texture("EnergyCluster_Profiles",profile,256,3,TextureFormat.RGBA32);
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(Root+"/Shaders/EnergyClusterHybrid.shader");
  if(shader==null||!shader.isSupported||ShaderUtil.ShaderHasError(shader))throw new Exception("Shader unavailable: "+JsonConvert.SerializeObject(shader==null?null:ShaderUtil.GetShaderMessages(shader)));
  var root=new GameObject("VFX_EnergyCluster_Loop");
  var names=new[]{"Volume","Halo","Core","ShellGlow","Shell"};
  for(int role=0;role<5;role++){
   var mat=new Material(shader){name="EnergyCluster_"+names[role]};mat.SetTexture("_Shell",shell);mat.SetTexture("_Profiles",profiles);
   mat.SetFloat("_Role",role);mat.SetFloat("_DstBlend",role==1||role==3?1:10);mat.SetFloat("_Cycle",.48f);
   foreach(var entry in new[]{new[]{"_ShellHot","#ffffff"},new[]{"_ShellCool","#0073ff"},new[]{"_CoreColor","#fbfcff"},new[]{"_BodyColor","#2458ff"},new[]{"_InnerColor","#45b5ff"},new[]{"_GlowColor","#1440ff"}})mat.SetColor(entry[0],C(entry[1]));
   AssetDatabase.CreateAsset(mat,Root+"/Materials/"+mat.name+".mat");
   var go=new GameObject(names[role]);go.transform.SetParent(root.transform,false);var p=go.AddComponent<ParticleSystem>();p.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
   var m=p.main;m.duration=.48f;m.loop=true;m.startLifetime=.50f;m.startSpeed=0;m.startSize=2.56f;m.startColor=Color.white;m.maxParticles=2;m.playOnAwake=true;m.prewarm=false;m.simulationSpace=ParticleSystemSimulationSpace.Local;m.scalingMode=ParticleSystemScalingMode.Hierarchy;m.cullingMode=ParticleSystemCullingMode.AlwaysSimulate;m.stopAction=ParticleSystemStopAction.None;
   var col=p.colorOverLifetime;col.enabled=true;var envelope=new Gradient();envelope.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},new[]{new GradientAlphaKey(0,0),new GradientAlphaKey(1,.04f),new GradientAlphaKey(1,.96f),new GradientAlphaKey(0,1)});col.color=envelope;
   var e=p.emission;e.rateOverTime=0;e.rateOverDistance=0;e.SetBursts(new[]{new ParticleSystem.Burst(0,1)});var sh=p.shape;sh.enabled=false;p.useAutoRandomSeed=false;p.randomSeed=37;
   var r=go.GetComponent<ParticleSystemRenderer>();r.sharedMaterial=mat;r.renderMode=ParticleSystemRenderMode.Billboard;r.alignment=ParticleSystemRenderSpace.View;r.allowRoll=false;r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;r.lightProbeUsage=LightProbeUsage.Off;r.reflectionProbeUsage=ReflectionProbeUsage.Off;r.sortingOrder=role;r.localBounds=new Bounds(Vector3.zero,Vector3.one*3);
   r.maxParticleSize=1;
   r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV,ParticleSystemVertexStream.UV2,ParticleSystemVertexStream.AgePercent,ParticleSystemVertexStream.InvStartLifetime});
  }
  foreach(var p in root.GetComponentsInChildren<ParticleSystem>())p.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);
  var prefab=PrefabUtility.SaveAsPrefabAsset(root,Root+"/Prefabs/VFX_EnergyCluster_Loop.prefab");UnityEngine.Object.DestroyImmediate(root);AssetDatabase.SaveAssets();
  var instance=(GameObject)PrefabUtility.InstantiatePrefab(prefab,scene);instance.transform.position=new Vector3(0,-1.4f,0);Selection.activeGameObject=instance;
  foreach(var before in oldRoots)if(before.active!=before.g.activeSelf||before.transform!=EditorJsonUtility.ToJson(before.g.transform)||!before.components.SequenceEqual(before.g.GetComponents<Component>().Select(c=>c==null?"MISSING":EditorJsonUtility.ToJson(c))))throw new Exception("Pre-existing scene object changed; do not save.");
  EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);
  var report=new{success=true,prefab=AssetDatabase.GetAssetPath(prefab),scene=scene.path,dirty=scene.isDirty,sourceHash=Hash(source),shellHash=Hash(raw),profilesHash=Hash(profile),shellFormat=shell.format.ToString(),shellReadable=shell.isReadable,profilesReadable=profiles.isReadable,systems=5,staticProfiles=true,animatedShellOnly=true,frameCount=20,cellSize=256,duration=.48f,scriptComponents=0,shaderMessages=ShaderUtil.GetShaderMessages(shader),priorRootsPreserved=true,explosionImported=false};
  File.WriteAllText(Path.Combine(Out,"Import.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(report);
 }
}
