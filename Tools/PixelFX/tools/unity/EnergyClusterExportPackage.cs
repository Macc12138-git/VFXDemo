// One-shot native package export. No scene edits, runtime scripts, or project settings.
using System;using System.IO;using System.Linq;using System.Security.Cryptography;
using UnityEngine;using UnityEditor;using UnityEngine.SceneManagement;using Newtonsoft.Json;
public static class EnergyClusterExportPackage {
 static string Hash(string path){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
 public static string Run(){
  var scene=SceneManager.GetActiveScene();if(Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||Application.productName!="VFXDemo"||scene.path!="Assets/Scenes/VFXWorkbench.unity"||Application.isPlaying||EditorApplication.isCompiling)throw new Exception("Wrong target/state");
  const string root="Assets/PixelFX/EnergyCluster";const string prefabPath=root+"/Prefabs/VFX_EnergyCluster_Loop.prefab";
  string desktop=Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);if(desktop!="/Users/user/Desktop")throw new Exception("Unexpected desktop");
  string package=Path.Combine(desktop,"VFX_EnergyCluster_V6_HaloFixed.unitypackage");if(File.Exists(package))package=Path.Combine(desktop,"VFX_EnergyCluster_V6_HaloFixed_"+DateTime.Now.ToString("yyyyMMdd_HHmmss")+".unitypackage");if(File.Exists(package))throw new Exception("Export already exists; refusing overwrite");
  var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);if(prefab==null)throw new Exception("Missing prefab");
  var dependencies=AssetDatabase.GetDependencies(prefabPath,true);var externalAssets=dependencies.Where(p=>p.StartsWith("Assets/")&&!p.StartsWith(root+"/")).ToArray();if(externalAssets.Length>0)throw new Exception("Unexpected external dependencies: "+string.Join(",",externalAssets));
  if(prefab.GetComponentsInChildren<Component>(true).Any(c=>c==null)||prefab.GetComponentsInChildren<MonoBehaviour>(true).Length>0)throw new Exception("Missing component/runtime script");
  var assets=AssetDatabase.FindAssets("",new[]{root}).Select(AssetDatabase.GUIDToAssetPath).Where(p=>!AssetDatabase.IsValidFolder(p)).OrderBy(p=>p).ToArray();
  if(assets.Count(p=>p.EndsWith(".prefab"))!=1||assets.Any(p=>p.EndsWith(".cs")||p.EndsWith(".unity")||p.Contains("/Editor/")||p.Contains("/Scenes/")))throw new Exception("Unexpected package contents");
  if(dependencies.Where(p=>p.StartsWith("Assets/")).Any(p=>!assets.Contains(p)))throw new Exception("Dependency omitted");
  var shader=AssetDatabase.LoadAssetAtPath<Shader>(root+"/Shaders/EnergyClusterHybrid.shader");if(!shader.isSupported||ShaderUtil.ShaderHasError(shader))throw new Exception("Shader not ready");
  bool dirtyBefore=scene.isDirty;string sceneHash=Hash(scene.path);
  var assetHashes=assets.Select(p=>new{path=p,guid=AssetDatabase.AssetPathToGUID(p),sha256=Hash(p),metaSha256=Hash(p+".meta")}).ToArray();
  AssetDatabase.ExportPackage(assets,package,ExportPackageOptions.Default);
  if(!File.Exists(package)||new FileInfo(package).Length==0)throw new Exception("Package export failed");
  if(scene.isDirty!=dirtyBefore||Hash(scene.path)!=sceneHash||assetHashes.Any(a=>Hash(a.path)!=a.sha256||Hash(a.path+".meta")!=a.metaSha256))throw new Exception("Source changed during export");
  string reportDir=Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Exports/EnergyCluster/V6/Packages");Directory.CreateDirectory(reportDir);
  var report=new{success=true,package,bytes=new FileInfo(package).Length,sha256=Hash(package),unity=Application.unityVersion,pipeline="URP 17.3.0",scope="Current HaloFixed EnergyCluster only; no explosion, demo, scene, scripts, or project settings",assets=assetHashes,dependencies,scenePreserved=true,sourceAssetsPreserved=true,sceneDirty=scene.isDirty};
  string reportPath=Path.Combine(reportDir,Path.GetFileNameWithoutExtension(package)+".json");File.WriteAllText(reportPath,JsonConvert.SerializeObject(report,Formatting.Indented));
  return JsonConvert.SerializeObject(new{report.success,package,report.bytes,report.sha256,assetCount=assets.Length,report.scenePreserved,report.sourceAssetsPreserved,reportPath});
 }
}
