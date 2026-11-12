using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Text.RegularExpressions;using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;using UnityEditor.SceneManagement;using Newtonsoft.Json;using Newtonsoft.Json.Linq;
public static class BlueWispSceneCheck {
 static string ObjectKey(UnityEngine.Object o){
  if(o==null)return "null";var asset=AssetDatabase.GetAssetPath(o);if(!string.IsNullOrEmpty(asset))return asset+"|"+o.GetType().FullName+"|"+o.name;
  var go=o as GameObject;var c=o as Component;if(c!=null)go=c.gameObject;
  if(go!=null){var names=new List<string>();for(var t=go.transform;t!=null;t=t.parent)names.Add(t.name);names.Reverse();return string.Join("/",names)+"|"+o.GetType().FullName;}
  return o.GetType().FullName+"|"+o.name;
 }
 static JToken Canonical(Component c){var json=EditorJsonUtility.ToJson(c);json=Regex.Replace(json,"\"instanceID\":(-?\\d+)",m=>"\"instanceRef\":"+JsonConvert.SerializeObject(ObjectKey(EditorUtility.InstanceIDToObject(int.Parse(m.Groups[1].Value)))));return JToken.Parse(json);}
 static Dictionary<string,JToken> Collect(Scene s){var result=new Dictionary<string,JToken>();foreach(var root in s.GetRootGameObjects())foreach(var t in root.GetComponentsInChildren<Transform>(true)){
  var key=ObjectKey(t.gameObject);result[key+"|active"]=new JValue(t.gameObject.activeSelf);result[key+"|layer"]=new JValue(t.gameObject.layer);result[key+"|tag"]=new JValue(t.gameObject.tag);
  var components=t.GetComponents<Component>();for(int i=0;i<components.Length;i++){var c=components[i];if(c==null){result[key+"|missing"+i]=new JValue(true);continue;}result[key+"|"+i+"|"+c.GetType().FullName]=Canonical(c);}
 }return result;}
 static void Diff(string path,JToken a,JToken b,List<object> diffs){if(JToken.DeepEquals(a,b))return;
  if(a is JObject oa&&b is JObject ob){foreach(var key in oa.Properties().Select(p=>p.Name).Union(ob.Properties().Select(p=>p.Name)))Diff(path+"."+key,oa[key],ob[key],diffs);return;}
  if(a is JArray aa&&b is JArray ab&&aa.Count==ab.Count){for(int i=0;i<aa.Count;i++)Diff(path+"["+i+"]",aa[i],ab[i],diffs);return;}
  diffs.Add(new{path,saved=a?.ToString(Formatting.None),current=b?.ToString(Formatting.None)});
 }
 public static string Run(){
  var active=SceneManager.GetActiveScene();if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||active.path!="Assets/Scenes/VFXWorkbench.unity")throw new Exception("Wrong target/state");
  bool dirtyBefore=active.isDirty;var current=Collect(active);var preview=EditorSceneManager.OpenPreviewScene(active.path);Dictionary<string,JToken> saved;
  try{saved=Collect(preview);}finally{EditorSceneManager.ClosePreviewScene(preview);}
  var diffs=new List<object>();foreach(var key in saved.Keys.Intersect(current.Keys))Diff(key,saved[key],current[key],diffs);
  var added=current.Keys.Except(saved.Keys).ToArray();var removed=saved.Keys.Except(current.Keys).ToArray();bool finalizedEquivalentScene=false;
  // Only finish this import's pending Undo record when the live scene matches the saved scene.
  // A user/component edit is left dirty and is never saved by this cleanup.
  if(active.isDirty&&diffs.Count==0&&added.Length==0&&removed.Length==0&&Undo.GetCurrentGroupName()=="Space BlueWisp sample"){
   Undo.FlushUndoRecordObjects();if(!EditorSceneManager.SaveScene(active))throw new Exception("Could not finalize equivalent imported scene.");finalizedEquivalentScene=true;
  }
  var report=new{success=true,scene=active.path,dirtyBefore,dirtyAfter=active.isDirty,undoGroup=Undo.GetCurrentGroupName(),finalizedEquivalentScene,savedRecords=saved.Count,currentRecords=current.Count,added,removed,differences=diffs};
  var dir=Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/BlueWisp/V3");File.WriteAllText(Path.Combine(dir,"SceneLiveVsSaved.json"),JsonConvert.SerializeObject(report,Formatting.Indented));return JsonConvert.SerializeObject(report);
 }
}
