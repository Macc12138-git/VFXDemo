// Temporary in-memory Editor callback; never attached to a runtime object.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;
using Newtonsoft.Json;
public static class LightningNovaLiveQA {
 static string Out=Path.Combine(Directory.GetParent(Application.dataPath).FullName,"VFXWork/Previews/LightningNova/V1.3");
 static List<GameObject> clones=new List<GameObject>();static List<GameObject> demos=new List<GameObject>();static List<bool> active=new List<bool>();static List<object> samples=new List<object>();static List<uint[]> seeds=new List<uint[]>();static bool background;static EditorWindow focused;static int stage=-1,frame=-1,mark;static double begin;static int drained,restored,ended,reactivated;
 static ParticleSystem[] Systems()=>clones.SelectMany(g=>g.GetComponentsInChildren<ParticleSystem>()).ToArray();
 static void Play(){foreach(var p in Systems()){p.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear);p.Play(false);}seeds.Add(Systems().Where(p=>p.useAutoRandomSeed).Select(p=>p.randomSeed).ToArray());}
 static void Sample(string label){samples.Add(new{label,stage,engineAge=Time.timeAsDouble-begin,engineFrame=Time.frameCount,instances=clones.Select(g=>new{name=g.name,systems=g.GetComponentsInChildren<ParticleSystem>().Select(p=>new{name=p.name,time=p.time,count=p.particleCount,playing=p.isPlaying,emission=p.emission.enabled,seed=p.randomSeed,particles=Particles(p)}).ToArray()}).ToArray()});}
 static object[] Particles(ParticleSystem p){var list=new ParticleSystem.Particle[p.particleCount];int n=p.GetParticles(list);return list.Take(Math.Min(n,2)).Select(x=>(object)new{position=new[]{x.position.x,x.position.y,x.position.z},remaining=x.remainingLifetime,life=x.startLifetime}).ToArray();}
 static void Capture(string name){var cam=Camera.main;var old=cam.targetTexture;var prev=RenderTexture.active;var rt=new RenderTexture(1280,768,24);rt.Create();try{cam.targetTexture=rt;cam.Render();RenderTexture.active=rt;var image=new Texture2D(1280,768,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,1280,768),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Out,name+".png"),image.EncodeToPNG());UnityEngine.Object.DestroyImmediate(image);}finally{cam.targetTexture=old;RenderTexture.active=prev;rt.Release();UnityEngine.Object.DestroyImmediate(rt);}}
 static void Finish(string error=null){EditorApplication.update-=Tick;foreach(var g in clones)if(g!=null)UnityEngine.Object.Destroy(g);for(int i=0;i<demos.Count;i++)if(demos[i]!=null)demos[i].SetActive(active[i]);Application.runInBackground=background;if(focused!=null)focused.Focus();File.WriteAllText(Path.Combine(Out,"LivePlayback.json"),JsonConvert.SerializeObject(new{success=error==null&&ended==0&&drained==0&&restored>0&&reactivated>0,error,method="Real Play Mode; engine age and native particle data, no Simulate/Emit/SetParticles",ended,drained,restored,reactivated,seeds,samples,restoredBackground=Application.runInBackground},Formatting.Indented));}
 static void Tick(){try{if(!Application.isPlaying){Finish("Play Mode stopped");return;}if(frame==Time.frameCount)return;frame=Time.frameCount;double age=Time.timeAsDouble-begin;
  if(stage<0&&age>.8){Play();stage=0;begin=Time.timeAsDouble;}
  else if(stage==0){float[] marks={.08f,.112f,.17f,.24f,.31f,.55f,.94f,1.3f};if(mark<marks.Length&&age>=marks[mark]){Sample("oneshot_"+marks[mark]);if(mark==2)Capture("Live_Workbench_Observed");mark++;}if(age>1.4){ended=Systems().Sum(p=>p.particleCount);foreach(var p in Systems()){var m=p.main;m.loop=true;}Play();stage=1;begin=Time.timeAsDouble;}}
  else if(stage==1&&age>.32){Sample("before_emission_off");foreach(var p in Systems()){var e=p.emission;e.enabled=false;}stage=2;begin=Time.timeAsDouble;}
  else if(stage==2&&age>1.3){drained=Systems().Sum(p=>p.particleCount);Sample("emission_off_drained");foreach(var p in Systems()){var e=p.emission;e.enabled=p.name!="Playback";}stage=3;begin=Time.timeAsDouble;}
  else if(stage==3&&age>1.25){restored=Systems().Sum(p=>p.particleCount);Sample("emission_restored");Play();stage=4;begin=Time.timeAsDouble;}
  else if(stage==4&&age>.3){Sample("stop_play_reuse");foreach(var g in clones)g.transform.position+=Vector3.right*100;stage=5;begin=Time.timeAsDouble;}
  else if(stage==5&&age>.15){foreach(var g in clones)g.transform.position-=Vector3.right*100;Sample("returned_from_offscreen");Play();stage=6;begin=Time.timeAsDouble;}
  else if(stage==6&&age>.27){Sample("final_restart");foreach(var g in clones)g.SetActive(false);stage=7;begin=Time.timeAsDouble;}
  else if(stage==7&&age>.15){foreach(var g in clones)g.SetActive(true);stage=8;begin=Time.timeAsDouble;}
  else if(stage==8&&age>.27){reactivated=Systems().Sum(p=>p.particleCount);Sample("root_disable_enable");Finish();}
 }catch(Exception e){Finish(e.ToString());}}
 public static string Run(){if(!Application.isPlaying||Application.productName!="VFXDemo"||SceneManager.GetActiveScene().path!="Assets/Scenes/VFXWorkbench.unity")throw new Exception("Wrong target/state");background=Application.runInBackground;Application.runInBackground=true;focused=EditorWindow.focusedWindow;EditorWindow.GetWindow(typeof(Editor).Assembly.GetType("UnityEditor.GameView")).Focus();
  foreach(var root in SceneManager.GetActiveScene().GetRootGameObjects().Where(g=>g.name=="LightningNova_2D_Demo"||g.name=="LightningNova_3D_Demo")){demos.Add(root);active.Add(root.activeSelf);root.SetActive(false);}
  foreach(var flat in new[]{true,false}){var g=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/PixelFX/LightningNova/Prefabs/LightningNova_"+(flat?"2D":"3D")+".prefab"));g.name=flat?"QA_2D":"QA_3D";g.transform.position=new Vector3(flat?-3.1f:3.1f,-.35f,0);if(!flat)g.transform.rotation=Quaternion.Euler(30,-22,0);clones.Add(g);}Play();begin=Time.timeAsDouble;EditorApplication.update+=Tick;return "Real playback scheduled (~6 seconds engine time).";}
}
