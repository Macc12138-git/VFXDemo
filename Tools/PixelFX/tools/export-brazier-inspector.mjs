#!/usr/bin/env node
// Editor-only staging for the approved native Brazier case, not a runtime event player.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if(args.length !== 2 || args[0] !== '--out') {
  console.error('Usage: node tools/export-brazier-inspector.mjs --out /path/to/staging');process.exit(1);
}
const target = resolve(args[1]);
const result = spawnSync(process.execPath,[join(here,'export-brazier-animated-particles.mjs'),target,'--inspector'],{cwd:join(here,'..'),stdio:'inherit'});
if(result.error)throw result.error;
if(result.status !== 0)process.exit(result.status ?? 1);
const writeChanged=(name,data)=>{
  const path=join(target,name),bytes=Buffer.from(data);
  if(!existsSync(path)||!readFileSync(path).equals(bytes))writeFileSync(path,bytes);
};
const recipe=JSON.parse(readFileSync(join(target,'BrazierAnimatedRecipe.json'),'utf8'));
// Keep the compatible filename, but explicitly mark event data as authoring-only.
const manifest={
  schema:'vfxdemo.brazier-inspector-staging.v1',effect:'fire/brazier',seed:recipe.seed,
  duration:recipe.duration,fps:recipe.fps,pixelsPerUnit:recipe.pixelsPerUnit,
  sourceCanvas:[112,148],sourceOrigin:[56,136],sourceMouth:[0,-25],sourceCoordinates:'x right, y down',
  sourceHashes:recipe.sourceHashes,atlases:recipe.atlases,
  runtime:'Unity native ParticleSystem; no attached scripts or runtime recipe reader',
  recipe:'BrazierAnimatedRecipe.json — editor sampling only, not a runtime scheduler',
  blending:{alpha:['Tongue_*','FirePuff','DetachedLick','SmokePlume','SmokeSpent','Spark','Ember','PropBack','PropFront'],additive:['SoftGlow']},
  imports:{filtering:'Point except SoftGlow Bilinear',compression:'none',mipmaps:false,wrap:'Clamp'},
  envelopesBaked:['Tongue shape','FirePuff cooling/size/alpha','DetachedLick cooling/size/alpha','SmokePlume size/alpha','SmokeSpent size/alpha'],
  sparks:{canvas:[16,16],lengthAxis:'texture X',opaquePixels:3,lengthScale:.65,velocityScale:.01},
  layers:['Flames','Sparks','Smoke','Glow'],prop:'ordinary SpriteRenderer, not particles',
  notes:['Per-element atlases; SourcePhase_0.8 and SourceAndCoreContact are comparison images only.',
    'Core atlas offsets are baked; use a common fixed mouth anchor and do not add tongue offsets twice.',
    'Use native Death Sub Emitters for cooling smoke, not recipe events at runtime.',
    'Native Noise, emitter volumes and lifetime curves are approximations, not source-frame identity.',
    'This command stages files only; no Unity asset import or prefab rebuild is performed.'],
  files:Object.fromEntries(readdirSync(target).filter(n=>n.endsWith('.png')||n==='BrazierAnimatedRecipe.json').sort()
    .map(n=>[n,createHash('sha256').update(readFileSync(join(target,n))).digest('hex')]))
};
writeChanged('BrazierInspectorManifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Native authoring staging: ${target}\nNo Unity Assets/scene/prefab writes. Import still requires the author's explicit instruction.`);
