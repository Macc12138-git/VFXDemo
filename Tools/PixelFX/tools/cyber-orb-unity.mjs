#!/usr/bin/env node
// Trusted, project-local one-time commands only. Nothing here ships with the effect.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [endpoint,stage]=process.argv.slice(2);
const code=readFileSync(`Tools/PixelFX/tools/unity/CyberOrb${stage}.cs`,'utf8');
let raw;try{raw=JSON.parse(execFileSync(process.execPath,['Tools/unity-vfx-mcp.mjs',endpoint,'execute_code',JSON.stringify({code,safety_checks:false,skip_refresh:true})],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']}));}catch(error){console.error(error.stderr?.split('\n').slice(0,10).join('\n')??error.message);process.exit(1);}
for(const item of raw.content??[])if(item.type==='text'){const result=JSON.parse(item.text);if(result.data?.result){try{result.data.result=JSON.parse(result.data.result);}catch{}}console.log(JSON.stringify(result,null,2));}
