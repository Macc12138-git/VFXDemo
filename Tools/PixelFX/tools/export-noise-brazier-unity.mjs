#!/usr/bin/env node
// Authorized static-resource export. Review frames/GIFs are never runtime inputs.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {meta,presets} from '../src/hd/noise-brazier.js';
const flags={};for(let i=2;i<process.argv.length;i+=2)flags[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const library=resolve(dirname(fileURLToPath(import.meta.url)),'..'),project=resolve(library,'../..');
const out=resolve(flags.out??join(project,'VFXWork/Exports/Brazier/NoiseRealtime'));
if(out===join(project,'Assets')||out.startsWith(join(project,'Assets')+'/'))throw Error('Staging must remain outside Assets.');
const {createCanvas}=await import(flags['canvas-module']?pathToFileURL(resolve(flags['canvas-module'])).href:'@napi-rs/canvas');
mkdirSync(out,{recursive:true});
const write=(name,bytes)=>{const p=join(out,name),b=Buffer.from(bytes);if(!existsSync(p)||!readFileSync(p).equals(b))writeFileSync(p,b);};
const hash=p=>createHash('sha256').update(readFileSync(join(project,p))).digest('hex');
const art=join(library,'src/hd/noise-brazier-art');
const files=['FlowNoise.png','SmokePuff.png','SparkStreak.png','PropBack.png','PropFront.png'];
for(const file of files)write(file,readFileSync(join(art,file)));
// Reproduce the source's two-stop white radial glow as an independent static stamp.
const c=createCanvas(256,256),g=c.getContext('2d'),gradient=g.createRadialGradient(128,128,0,128,128,128);
gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.35,'rgba(255,255,255,.35)');gradient.addColorStop(1,'rgba(255,255,255,0)');
g.fillStyle=gradient;g.fillRect(0,0,256,256);write('SoftGlow.png',c.toBuffer('image/png'));
const source='Tools/PixelFX/src/hd/noise-brazier.js',shader='Tools/PixelFX/src/hd/noise-brazier.frag',secondary='Tools/PixelFX/src/hd/noise-brazier-secondary.js';
const options={...presets.fierce};
const manifest={version:1,sourceVersion:meta.version,source,sourceSha256:hash(source),shader,shaderSha256:hash(shader),secondary,secondarySha256:hash(secondary),
 authorInstruction:'接下来导入到unity中',preset:'fierce',seed:options.seed,options,pixelsPerUnit:128,sourceSize:meta.size,pivot:meta.pivot,
 baseDuration:8,duration:8/options.flow,textureAnimation:false,framesPerTexture:1,atlas:false,frames:1,
 textures:[...files,'SoftGlow.png'].map(file=>({file,sha256:createHash('sha256').update(readFileSync(join(out,file))).digest('hex')})),
 coreRect:{x:270,y:238,width:485,height:624,anchorX:512,anchorY:855},
 mapping:{core:'One native burst particle, source grayscale sampled in ported URP shader. Native Custom1.x clock; SAME source flow/stretch/warp/mask/erosion/ramp. No baked flame texture.',
 sparks:'Native continuous Emission, Box birth domain, decaying velocity curves, Noise, lifetime cooling/fade, Stretched Billboard using the original static X-oriented streak.',
 embers:'Same one static streak, rectangular Billboard, slow velocity and noise, cooling and size variation.',
 smoke:'Original one static puff, continuous native Emission, Box, upward velocity/force, Noise, random rotation, separate-axis growth, gray color/alpha envelope.',
 glow:'Three additive native static particles. No Light component.',prop:'Two ordinary static SpriteRenderers; mouth anchor (512,855).'},
 differences:['Native random births and Noise approximate analytic seeded particle identities, sinusoidal wander, and trajectories.',
 'Random lifetime velocity curves use reference lifetimes; not every source exponential path is identical.',
 'Streak hot head is approximated by native color/brightness; not a second scheduled particle.',
 'Linear-space Unity alpha/additive composition can differ slightly from browser Canvas.',
 'Changing core material Flow also requires matching Core Main duration/lifetime to 8/Flow for seamless native clock restart.'],
 import:{noise:'Linear data, Mirror, Bilinear, no mipmaps, uncompressed',stamps:'Static RGBA, Clamp, Bilinear, no mipmaps, uncompressed',props:'Single Sprite, PPU 128, mouth pivot x .5 / y 1-87/512'},
 status:'authorized-for-unity-import'};
write('manifest.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify({out,staticPNGs:6,preset:manifest.preset,sourceVersion:meta.version,framesPerTexture:1,atlas:false}));
