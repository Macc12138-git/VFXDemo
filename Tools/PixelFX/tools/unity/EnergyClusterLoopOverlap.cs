// Correct only the new import's native handoff. No runtime script or asset rebuild.
using System;using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;
public static class EnergyClusterLoopOverlap {
 public static string Run(){
  if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||SceneManager.GetActiveScene().isDirty)throw new Exception("Protect target/state.");
  const string path="Assets/PixelFX/EnergyCluster/Prefabs/VFX_EnergyCluster_Loop.prefab";var g=PrefabUtility.LoadPrefabContents(path);
  foreach(var p in g.GetComponentsInChildren<ParticleSystem>()){
   var main=p.main;main.maxParticles=2;main.startLifetime=.50f;
   var col=p.colorOverLifetime;col.enabled=true;var gradient=new Gradient();gradient.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},new[]{new GradientAlphaKey(0,0),new GradientAlphaKey(1,.04f),new GradientAlphaKey(1,.96f),new GradientAlphaKey(0,1)});col.color=gradient;
  }
  PrefabUtility.SaveAsPrefabAsset(g,path);PrefabUtility.UnloadPrefabContents(g);AssetDatabase.SaveAssets();return "Native .48s births / .50s lifetime / .02s crossfade installed on the newly imported prefab only.";
 }
}
