// One-time removal authorized by the author; preserves the two production prefabs.
using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Security.Cryptography;
using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;using UnityEditor.SceneManagement;using Newtonsoft.Json;
public static class CyberOrbRemoveDemo {
 const string Asset="Assets/PixelFX/CyberOrb/Prefabs/CyberOrb_Shot.prefab";
 static string Hash(string path){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
 public static string Run(){
  var scene=SceneManager.GetActiveScene();if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.productName!="VFXDemo"||Application.isPlaying||scene.path!="Assets/Scenes/VFXWorkbench.unity"||scene.isDirty)throw new Exception("Wrong target/state or unsaved author changes; nothing removed");
  if(AssetDatabase.AssetPathToGUID(Asset)!="c7bc716572d17422b825ec3d8bd7a174"||AssetDatabase.LoadAssetAtPath<GameObject>(Asset)==null)throw new Exception("Unexpected target asset; nothing removed");
  var all=scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<Transform>(true)).Select(t=>t.gameObject).ToArray();
  var instances=all.Where(g=>PrefabUtility.IsAnyPrefabInstanceRoot(g)&&PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(g)==Asset).ToArray();
  if(instances.Length!=1||instances[0].name!="NativeFlight_ToImpact"||instances[0].transform.parent==null||instances[0].transform.parent.name!="CyberOrb_Demo")throw new Exception("Unexpected instance ownership; nothing removed");
  var target=instances[0];var parent=target.transform.parent;
  var preserved=all.Where(g=>g!=target&&!g.transform.IsChildOf(target.transform)).SelectMany(g=>g.GetComponents<Component>()).Where(c=>c!=null&&c!=parent).Select(c=>new{component=c,json=EditorJsonUtility.ToJson(c)}).ToArray();
  var project=Directory.GetParent(Application.dataPath).FullName;
  var kept=Directory.GetFiles(Path.Combine(project,"Assets/PixelFX/CyberOrb"),"*",SearchOption.AllDirectories).Where(p=>p!=Path.Combine(project,Asset)&&p!=Path.Combine(project,Asset+".meta")).ToDictionary(p=>p,Hash);
  var backup=Path.Combine(project,"VFXWork/Backups/CyberOrb/V3.2/RemoveDemo-2026-11-07");if(Directory.Exists(backup))throw new Exception("Backup already exists; inspect before retry");Directory.CreateDirectory(backup);
  File.Copy(Path.Combine(project,Asset),Path.Combine(backup,"CyberOrb_Shot.prefab.snapshot"));File.Copy(Path.Combine(project,Asset+".meta"),Path.Combine(backup,"CyberOrb_Shot.meta.snapshot"));File.Copy(Path.Combine(project,scene.path),Path.Combine(backup,"VFXWorkbench-before.snapshot"));
  Undo.SetCurrentGroupName("Remove CyberOrb flight demonstration");Undo.DestroyObjectImmediate(target);
  if(preserved.Any(x=>x.component==null||EditorJsonUtility.ToJson(x.component)!=x.json))throw new Exception("Unexpected retained component change; deletion remains undoable and scene not saved");
  if(!EditorSceneManager.SaveScene(scene))throw new Exception("Scene save failed; asset preserved");
  if(!AssetDatabase.DeleteAsset(Asset))throw new Exception("Asset removal failed; backup preserved");
  bool unchanged=kept.All(x=>File.Exists(x.Key)&&Hash(x.Key)==x.Value);
  var remaining=AssetDatabase.FindAssets("t:Prefab",new[]{"Assets/PixelFX/CyberOrb"}).Select(AssetDatabase.GUIDToAssetPath).OrderBy(p=>p).ToArray();
  bool valid=unchanged&&!scene.isDirty&&remaining.Length==2&&!File.Exists(Path.Combine(project,Asset))&&!File.Exists(Path.Combine(project,Asset+".meta"))&&parent.childCount==2;
  var result=new{success=valid,removedAsset=Asset,removedInstance="CyberOrb_Demo/NativeFlight_ToImpact",backup,preservedComponents=preserved.Length,retainedAssetsUnchanged=unchanged,remainingPrefabs=remaining,scene=scene.path,sceneDirty=scene.isDirty,remainingChildren=Enumerable.Range(0,parent.childCount).Select(i=>parent.GetChild(i).name).ToArray(),retainedHashes=kept.ToDictionary(x=>x.Key.Substring(project.Length+1),x=>x.Value)};
  File.WriteAllText(Path.Combine(project,"VFXWork/Previews/CyberOrb/V3.2/DemoRemoval-2026-11-07.json"),JsonConvert.SerializeObject(result,Formatting.Indented));Selection.activeGameObject=parent.gameObject;return JsonConvert.SerializeObject(new{result.success,result.removedAsset,result.removedInstance,result.backup,result.retainedAssetsUnchanged,result.remainingPrefabs,result.sceneDirty});
 }
}
