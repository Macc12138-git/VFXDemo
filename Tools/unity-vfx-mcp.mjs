#!/usr/bin/env node
// Explicit-endpoint local MCP client. No default endpoint; never guesses another editor.
import { readFileSync } from 'node:fs';
const [endpoint,method='identity',argument='{}']=process.argv.slice(2);
if(!endpoint||!/^http:\/\/127\.0\.0\.1:\d+\/mcp$/.test(endpoint))throw Error('Supply an explicit localhost MCP endpoint.');
let seq=0,session;
async function rpc(method,params){
  const headers={'content-type':'application/json',accept:'application/json, text/event-stream'};
  if(session)headers['mcp-session-id']=session;
  const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:++seq,method,params}),signal:AbortSignal.timeout(180000)});
  session=response.headers.get('mcp-session-id')??session;
  const body=await response.text();if(!response.ok)throw Error(`${response.status} ${body}`);
  const payload=body.startsWith('data:')?JSON.parse(body.split('\n').find(line=>line.startsWith('data:')).slice(5)):JSON.parse(body);
  if(payload.error)throw Error(JSON.stringify(payload.error));return payload.result;
}
await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'VFXDemo-scoped-authoring',version:'1'}});
if(method==='list'){const data=await rpc('tools/list',{});console.log(JSON.stringify(data,null,2));}
else if(method==='identity')console.log(JSON.stringify(await rpc('tools/call',{name:'execute_code',arguments:{code:'using UnityEngine; using UnityEditor; using UnityEngine.SceneManagement; public static class ScopeIdentity { public static string Run(){var s=SceneManager.GetActiveScene(); return JsonUtility.ToJson(new ScopeInfo { dataPath=Application.dataPath, product=Application.productName, scene=s.path, sceneDirty=s.isDirty, playing=Application.isPlaying, compiling=EditorApplication.isCompiling });} [System.Serializable] public class ScopeInfo {public string dataPath,product,scene;public bool sceneDirty,playing,compiling;} }',safety_checks:true}}),null,2));
else{
  let args=method==='code-file'?{code:readFileSync(argument,'utf8'),safety_checks:true}:JSON.parse(argument);
  console.log(JSON.stringify(await rpc('tools/call',{name:method==='code-file'?'execute_code':method,arguments:args}),null,2));
}
