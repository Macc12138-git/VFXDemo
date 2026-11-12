#!/usr/bin/env node
// Trusted one-time authoring commands; all C# stays outside Assets.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const[endpoint,stage]=process.argv.slice(2);
if(!['Import','VisualQA','LiveQA','Performance','FrameEvents','FinalState'].includes(stage))throw Error('Unknown BlueWisp stage');
const code=readFileSync(`Tools/PixelFX/tools/unity/BlueWisp${stage}.cs`,'utf8');
const raw=JSON.parse(execFileSync(process.execPath,['Tools/unity-vfx-mcp.mjs',endpoint,'execute_code',JSON.stringify({code,safety_checks:false,skip_refresh:true})],{encoding:'utf8',maxBuffer:12*1024*1024}));
for(const item of raw.content??[])if(item.type==='text'){const r=JSON.parse(item.text);if(r.data?.result){try{r.data.result=JSON.parse(r.data.result);}catch{}}console.log(JSON.stringify(r,null,2));if(!r.success)process.exitCode=1;}
