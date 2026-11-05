import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, rmSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const cli=join(project,'Tools/vfx.mjs');
const run=(...args)=>spawnSync(process.execPath,[cli,...args],{cwd:tmpdir(),encoding:'utf8'});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function snapshots(dir) {
  return Object.fromEntries(readdirSync(dir,{withFileTypes:true}).flatMap(x=>{
    const path=join(dir,x.name);
    return x.isDirectory()?Object.entries(snapshots(path)):[[path,hash(path)]];
  }));
}
function decodeOwnPNG(file) {
  const png=readFileSync(file),width=png.readUInt32BE(16),height=png.readUInt32BE(20),parts=[];
  for(let offset=8;offset<png.length;) {
    const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
    if(type==='IDAT')parts.push(png.subarray(offset+8,offset+8+size));offset+=size+12;
  }
  const raw=inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(width*height*4),stride=width*4;
  for(let y=0;y<height;y++) {
    assert.equal(raw[y*(stride+1)],1,'our PNG writer uses Sub filtering');
    for(let x=0;x<stride;x++)pixels[y*stride+x]=(raw[y*(stride+1)+1+x]+(x>=4?pixels[y*stride+x-4]:0))&255;
  }
  return {width,height,pixels};
}

test('project-local CLI works from another cwd without old checkout paths',()=>{
  const result=run('doctor');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS/);
  const list=run('list','brazier');assert.equal(list.status,0,list.stderr);assert.match(list.stdout,/fire\/brazier/);
  const check=run('check','fire/brazier');assert.equal(check.status,0,check.stderr);assert.match(check.stdout,/1 pass/);
});

test('staging cannot target Unity Assets through the public entry',()=>{
  const target=join(project,'Assets/__VFXWorkbenchMustNotWrite');
  assert.equal(existsSync(target),false);
  const result=run('export-brazier','--out',target);
  assert.notEqual(result.status,0);assert.match(result.stderr,/不能直接写入 Assets/);assert.equal(existsSync(target),false);
});

test('new effect can be indexed and rendered in an isolated project, with no Unity writes',()=>{
  const temp=mkdtempSync(join(tmpdir(),'vfxdemo-authoring-'));
  try {
    const copy=join(temp,'Tools/PixelFX');mkdirSync(copy,{recursive:true});
    for(const name of ['src','tools','docs','README.md','package.json'])cpSync(join(project,'Tools/PixelFX',name),join(copy,name),{recursive:true});
    cpSync(cli,join(temp,'Tools/vfx.mjs'));
    const isolated=(...args)=>spawnSync(process.execPath,[join(temp,'Tools/vfx.mjs'),...args],{cwd:tmpdir(),encoding:'utf8'});
    const make=isolated('new','fire/workbench-test','--loop');assert.equal(make.status,0,make.stderr);
    const index=isolated('index');assert.equal(index.status,0,index.stderr);
    assert.match(readFileSync(join(copy,'src/fx/index.js'),'utf8'),/fire\/workbench-test/);
    const render=isolated('render','fire/workbench-test','--no-actor');assert.equal(render.status,0,render.stderr);
    assert.ok(existsSync(join(copy,'records/fire/workbench-test/contact.png')));
    assert.equal(existsSync(join(temp,'Assets')),false);
  } finally { rmSync(temp,{recursive:true}); }
});

test('Brazier staging is native-oriented, deterministic and leaves accepted Unity assets untouched',()=>{
  const accepted=join(project,'Assets/PixelFX/Brazier/InspectorParticles');
  const before=snapshots(accepted),temp=mkdtempSync(join(tmpdir(),'vfxdemo-native-export-'));
  try {
    const first=run('export-brazier','--out',temp);assert.equal(first.status,0,first.stderr);
    const manifest=JSON.parse(readFileSync(join(temp,'BrazierInspectorManifest.json'),'utf8'));
    assert.equal(manifest.pixelsPerUnit,32);assert.equal(manifest.seed,8);
    assert.equal(manifest.atlases.filter(x=>x.name.startsWith('Tongue_')).length,11);
    const tongue=manifest.atlases.find(x=>x.name==='Tongue_01');
    assert.deepEqual([tongue.width,tongue.height,tongue.frames,tongue.cols,tongue.rows],[64,64,90,10,9]);
    const smoke=manifest.atlases.find(x=>x.name==='SmokePlume');assert.equal(smoke.frames,64);
    const spark=decodeOwnPNG(join(temp,'Spark.png')),opaque=[];
    for(let i=0;i<16*16;i++)if(spark.pixels[i*4+3])opaque.push([i%16,Math.floor(i/16)]);
    assert.deepEqual(opaque,[[7,8],[8,8],[9,8]]);assert.equal(manifest.files['Spark.png'],hash(join(temp,'Spark.png')));
    const recipe=JSON.parse(readFileSync(join(temp,'BrazierAnimatedRecipe.json'),'utf8'));
    assert.equal(recipe.tongues.length,11);assert.ok(recipe.events.length>500);
    assert.equal(manifest.sourceHashes.brazier,hash(join(project,'Tools/PixelFX/src/fx/fire/brazier.js')));
    assert.ok(!readdirSync(temp).some(x=>/\.(cs|prefab|unity)$/.test(x)));
    const stats=Object.fromEntries(readdirSync(temp).map(n=>[n,statSync(join(temp,n)).mtimeMs]));
    const hashes=snapshots(temp);
    const second=run('export-brazier','--out',temp);assert.equal(second.status,0,second.stderr);
    assert.deepEqual(snapshots(temp),hashes);
    for(const [name,mtime] of Object.entries(stats))assert.equal(statSync(join(temp,name)).mtimeMs,mtime,`${name} timestamp changed`);
    assert.deepEqual(snapshots(accepted),before);
  } finally { rmSync(temp,{recursive:true}); }
});
