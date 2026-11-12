import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {draw,render,background,meta,options,poseAt} from '../src/hd/blue-wisp-v3.js';
const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const {createCanvas,loadImage}=await import(pathToFileURL(resolve(args['canvas-module'])).href);
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),round=args.round??'final';assert(/^[a-z0-9-]+$/.test(round));
const out=resolve(root,'output/hd/BlueWisp/V3',round);await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
function image(t,o={},bg='transparent',W=960,H=600,scale=1){const c=createCanvas(W,H);render(c,t,o,{background:bg,scale});return c;}
const raw=(t,o={})=>image(t,o).getContext('2d').getImageData(0,0,960,600).data;
const fingerprint=(t,o={})=>hash(raw(t,o));
const blank=Object.fromEntries(Object.keys(meta.options.layers).map(k=>[k,false]));
assert.equal(poseAt(0),0);assert.equal(poseAt(.069999),0);assert.equal(poseAt(.07),1);assert.equal(poseAt(.14),2);assert.equal(poseAt(.21),3);assert.equal(poseAt(.28),0);
const hashes=[];
for(let pose=0;pose<4;pose++){
  hashes.push(fingerprint(pose*.07));assert.equal(fingerprint(pose*.07),fingerprint(pose*.07+.069),'each pose holds without any interpolation or drift');
  assert.equal(fingerprint(pose*.07),fingerprint(pose*.07+.28),'exact repeating geometry');
}
assert.equal(new Set(hashes).size,4,'four distinct key poses');assert(raw(0,{layers:blank}).every(v=>v===0));
for(const key of Object.keys(blank))assert.notEqual(fingerprint(0),fingerprint(0,{layers:{[key]:false}}),key+' visible');
for(const key of ['edge','blue','cyan','pale','core'])assert.notEqual(fingerprint(0),fingerprint(0,{[key]:'#ff8844'}),key+' recolor');
let edgeAlpha=0;
for(const radius of [90,132,170])for(let i=0;i<4;i++){
 const d=raw(i*.07,{radius});for(let x=0;x<960;x++)edgeAlpha+=d[x*4+3]+d[((599*960+x)*4)+3];
 for(let y=0;y<600;y++)edgeAlpha+=d[y*960*4+3]+d[(y*960+959)*4+3];
}assert.equal(edgeAlpha,0,'default and radius endpoints fit');
const ref=await loadImage(resolve(root,'output/hd/BlueWisp/References/four-pose-reference.png'));
// Comparison uses the same original source coordinate frame and scale, not independent fitting.
const compare=createCanvas(1440,700),cg=compare.getContext('2d');background(cg,1440,700,'gray');
for(let pose=0;pose<4;pose++){
 const x=pose*360;
 cg.fillStyle='#abc5d8';cg.font='14px sans-serif';cg.fillText(`POSE ${pose+1} / ${pose*70}ms`,x+15,24);
 cg.imageSmoothingEnabled=false;
 cg.drawImage(ref,pose*150,0,150,135,x+5,49,350,315);
 cg.imageSmoothingEnabled=true;
 cg.save();cg.translate(x+(366-300)*350/150+5,399+(198-130)*315/135);cg.scale(350/150,315/135);
 // Author geometry uses a 4px conceptual landmark spacing, with origin at (366,198).
 draw(cg,pose*.07,{radius:46});cg.restore();
 cg.fillStyle='#96b0c3';cg.font='12px sans-serif';cg.fillText('REFERENCE',x+15,47);cg.fillText('HD REDRAW',x+15,390);
}
await writeFile(resolve(out,'reference-comparison.png'),compare.toBuffer('image/png'));
const contact=createCanvas(1440,520),g=contact.getContext('2d');background(g,1440,520,'gray');
for(let i=0;i<4;i++){
 g.save();g.translate(i*360+145,255);g.scale(.88,.88);draw(g,i*.07);g.restore();
 g.fillStyle='#bed2db';g.font='13px sans-serif';g.fillText(`POSE ${i+1} / ${i*70} ms`,i*360+15,28);
}
await writeFile(resolve(out,'contact.png'),contact.toBuffer('image/png'));
await writeFile(resolve(out,'hero.png'),image(0,{},'gray').toBuffer('image/png'));
const small=createCanvas(960,400),sg=small.getContext('2d');background(sg,960,400,'gray');
for(const [j,size]of [48,88,132].entries())for(let i=0;i<4;i++){
 sg.save();sg.translate(i*240+95,[45,150,310][j]);sg.scale(size/264,size/264);draw(sg,i*.07);sg.restore();
}await writeFile(resolve(out,'game-size.png'),small.toBuffer('image/png'));
const report={version:meta.version,round,options:options(),checks:'PASS',durationMs:280,poseHoldMs:70,
 fourDistinctPoses:true,noInterpolation:true,noGlobalPulse:true,exactLoop:true,edgeAlpha,resources:{flipbookTextures:0,referencePixelsInPlayback:0},
 composition:Array.from({length:4},(_,pose)=>{
   const body=raw(pose*.07,{glow:0,layers:{...blank,body:true}}),white=raw(pose*.07,{glow:0,layers:{...blank,core:true}});
   const area=d=>{let a=0;for(let i=3;i<d.length;i+=4)a+=d[i]/255;return a;};
   return {pose,bodyArea:area(body),whiteArea:area(white),whiteRatio:area(white)/area(body)};
 }),sourceSha256:hash(await readFile(resolve(root,'src/hd/blue-wisp-v3.js'))),
 notTested:['Unity rendering/native assembly','batching','target CPU/GPU/memory budget'],
 visual:'Reference comparison is a QA image, not a runtime atlas. Similarity still requires author review.'};
await copyFile(resolve(root,'src/hd/blue-wisp-v3.js'),resolve(out,'blue-wisp-v3.source.js'));
await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,...report},null,2));
