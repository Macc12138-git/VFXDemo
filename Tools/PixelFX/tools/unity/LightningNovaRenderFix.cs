using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;
public static class LightningNovaRenderFix {
 public static string Run(){
  if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.isPlaying)throw new Exception("Wrong target");
  var s=SceneManager.GetActiveScene();if(s.isDirty)throw new Exception("Protect dirty scene");if(s.path!="Assets/Scenes/VFXWorkbench.unity")s=EditorSceneManager.OpenScene("Assets/Scenes/VFXWorkbench.unity");
  foreach(var id in AssetDatabase.FindAssets("t:Mesh",new[]{"Assets/PixelFX/LightningNova/Meshes"})){var m=AssetDatabase.LoadAssetAtPath<Mesh>(AssetDatabase.GUIDToAssetPath(id));m.colors32=Enumerable.Repeat(new Color32(255,255,255,255),m.vertexCount).ToArray();EditorUtility.SetDirty(m);}
  foreach(var suffix in new[]{"2D","3D"}){var path="Assets/PixelFX/LightningNova/Prefabs/LightningNova_"+suffix+".prefab";var g=PrefabUtility.LoadPrefabContents(path);foreach(var r in g.GetComponentsInChildren<ParticleSystemRenderer>())r.alignment=ParticleSystemRenderSpace.Local;PrefabUtility.SaveAsPrefabAsset(g,path);PrefabUtility.UnloadPrefabContents(g);}
  AssetDatabase.SaveAssets();return "Corrected Mesh Color32 and local-space alignment; workbench reopened.";
 }
}
