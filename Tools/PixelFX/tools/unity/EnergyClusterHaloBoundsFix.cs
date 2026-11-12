// One-time targeted edit; does not rebuild the effect or write scene settings.
using System;using System.Linq;using System.IO;
using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;using Newtonsoft.Json;
public static class EnergyClusterHaloBoundsFix {
 public static string Run(){
  if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||SceneManager.GetActiveScene().path!="Assets/Scenes/VFXWorkbench.unity"||SceneManager.GetActiveScene().isDirty)throw new Exception("Wrong target/state or unsaved scene changes");
  const string path="Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab";
  var root=PrefabUtility.LoadPrefabContents(path);
  try{
   var halo=root.GetComponentsInChildren<ParticleSystem>(true).Single(p=>p.name=="Halo");var main=halo.main;var renderer=halo.GetComponent<ParticleSystemRenderer>();
   if(main.startSize3D||main.startSize.mode!=ParticleSystemCurveMode.Constant||Mathf.Abs(main.startSize.constant-2.56f)>.0001f||Mathf.Abs(renderer.maxParticleSize-1f)>.0001f)throw new Exception("Halo changed since baseline; refusing to overwrite author settings");
   float before=main.startSize.constant;main.startSizeMultiplier*=1.5f;renderer.maxParticleSize*=1.5f;
   PrefabUtility.SaveAsPrefabAsset(root,path);
   return JsonConvert.SerializeObject(new{changed="Halo only",startSizeBefore=before,startSizeAfter=main.startSize.constant,renderer.maxParticleSize,sceneDirty=SceneManager.GetActiveScene().isDirty});
  }finally{PrefabUtility.UnloadPrefabContents(root);}
 }
}
