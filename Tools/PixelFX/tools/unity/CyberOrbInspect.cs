using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Newtonsoft.Json;
public static class CyberOrbInspect {
 public static string Run(){
  var s=SceneManager.GetActiveScene();
  if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.productName!="VFXDemo"||s.path!="Assets/Scenes/VFXWorkbench.unity"||Application.isPlaying)throw new Exception("Wrong target/state");
  var result=new{dataPath=Application.dataPath,product=Application.productName,scene=s.path,dirty=s.isDirty,unity=Application.unityVersion,
   pipeline=GraphicsSettings.currentRenderPipeline?.name,colorSpace=QualitySettings.activeColorSpace.ToString(),api=SystemInfo.graphicsDeviceType.ToString(),device=SystemInfo.graphicsDeviceName,
   roots=s.GetRootGameObjects().Select(g=>new{name=g.name,id=g.GetInstanceID(),active=g.activeSelf,pos=g.transform.position.ToString(),rot=g.transform.rotation.ToString(),scale=g.transform.localScale.ToString()}),
   cameras=UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsInactive.Include,FindObjectsSortMode.None).Select(c=>new{name=c.name,pos=c.transform.position.ToString(),rot=c.transform.rotation.ToString(),ortho=c.orthographic,size=c.orthographicSize,background=c.backgroundColor.ToString(),hdr=c.allowHDR,width=c.pixelWidth,height=c.pixelHeight,json=EditorJsonUtility.ToJson(c)}),
   assetExists=AssetDatabase.IsValidFolder("Assets/PixelFX/CyberOrb")};
  var json=JsonConvert.SerializeObject(result,Formatting.Indented);var dir=Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/CyberOrb/V3.2");Directory.CreateDirectory(dir);
  if(!File.Exists(Path.Combine(dir,"Before.json")))File.WriteAllText(Path.Combine(dir,"Before.json"),json);
  var back=Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Backups/CyberOrb/V3.2");Directory.CreateDirectory(back);
  if(!File.Exists(Path.Combine(back,"VFXWorkbench-before.snapshot")))File.Copy(Path.Combine(Directory.GetParent(Application.dataPath).FullName,s.path),Path.Combine(back,"VFXWorkbench-before.snapshot"));
  return json;
 }
}
