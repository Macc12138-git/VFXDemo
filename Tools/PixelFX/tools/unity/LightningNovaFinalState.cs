using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;
using Newtonsoft.Json;
public static class LightningNovaFinalState {
 public static string Run(){
  var s=SceneManager.GetActiveScene();if(Application.isPlaying||Application.dataPath!="/Users/user/Desktop/VFXDemo/VFXDemo/Assets"||s.path!="Assets/Scenes/VFXWorkbench.unity")throw new Exception("Wrong scope/state");
  var roots=s.GetRootGameObjects();if(roots.Any(g=>g.name.StartsWith("QA_")||g.name.StartsWith("FrameProbe_")||g.name.StartsWith("Performance_")))throw new Exception("Temporary objects remain");
  var shader=AssetDatabase.LoadAssetAtPath<Shader>("Assets/PixelFX/LightningNova/Shaders/LightningNovaNative.shader");
  var prefabs=new[]{"2D","3D"}.Select(v=>{var path="Assets/PixelFX/LightningNova/Prefabs/LightningNova_"+v+".prefab";var g=AssetDatabase.LoadAssetAtPath<GameObject>(path);return new{path,components=g.GetComponentsInChildren<Component>(true).Select(c=>c==null?"MISSING":c.GetType().Name).Distinct().ToArray(),systems=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{name=p.name,loop=p.main.loop,duration=p.main.duration,seed=p.randomSeed,autoSeed=p.useAutoRandomSeed,emission=p.emission.enabled,lights=p.lights.enabled,sheet=p.textureSheetAnimation.enabled,alignment=p.GetComponent<ParticleSystemRenderer>().alignment.ToString()}).ToArray()};}).ToArray();
  var report=new{success=!s.isDirty&&!ShaderUtil.ShaderHasError(shader)&&roots.Length==3,dataPath=Application.dataPath,product=Application.productName,scene=s.path,dirty=s.isDirty,playing=Application.isPlaying,paused=EditorApplication.isPaused,background=Application.runInBackground,roots=roots.Select(g=>new{name=g.name,active=g.activeSelf,position=g.transform.position.ToString(),rotation=g.transform.eulerAngles.ToString(),scale=g.transform.localScale.ToString(),components=g.GetComponentsInChildren<Component>(true).Select(c=>c==null?"MISSING":c.GetType().Name).Distinct().ToArray(),systems=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{name=p.name,duration=p.main.duration,loop=p.main.loop,autoSeed=p.useAutoRandomSeed}).ToArray()}).ToArray(),prefabs,shaderSupported=shader.isSupported,shaderErrors=ShaderUtil.GetShaderMessages(shader).Where(m=>m.severity==UnityEditor.Rendering.ShaderCompilerMessageSeverity.Error).Select(m=>m.message).ToArray(),materials=AssetDatabase.FindAssets("t:Material",new[]{"Assets/PixelFX/LightningNova"}).Select(id=>AssetDatabase.GUIDToAssetPath(id)).ToArray()};
  File.WriteAllText(Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/LightningNova/V1.3/FinalState.json"),JsonConvert.SerializeObject(report,Formatting.Indented));Selection.activeGameObject=roots.FirstOrDefault(g=>g.name=="LightningNova_3D_Demo");return JsonConvert.SerializeObject(new{report.success,report.scene,report.dirty,roots=roots.Select(g=>g.name),report.shaderErrors});
 }
}
