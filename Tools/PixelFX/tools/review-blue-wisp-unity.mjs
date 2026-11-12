import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {draw,background} from '../src/hd/blue-wisp-v3.js';
const{createCanvas,loadImage}=await import(pathToFileURL(resolve(process.argv[2])).href);
const out=resolve('VFXWork/Previews/BlueWisp/V3'),sheet=createCanvas(1200,1050),g=sheet.getContext('2d');background(g,1200,1050,'gray');
const report=[];
for(let i=0;i<4;i++){
 const src=createCanvas(600,500),s=src.getContext('2d');background(s,600,500,'gray');s.translate(300,250);draw(s,i*.07+.035);
 const unity=await loadImage(resolve(out,`Pose${i+1}.png`)),u=createCanvas(600,500);u.getContext('2d').drawImage(unity,0,0);
 const a=s.getImageData(0,0,600,500).data,b=u.getContext('2d').getImageData(0,0,600,500).data;let total=0,n=0,changed=0;
 const colors=d=>{const counts=new Map();for(let j=0;j<d.length;j+=4){const key=[d[j],d[j+1],d[j+2]].join(',');counts.set(key,(counts.get(key)??0)+1);}return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,7);};
 for(let j=0;j<a.length;j+=4){if(Math.abs(a[j]-69)+Math.abs(a[j+1]-69)+Math.abs(a[j+2]-69)>30){n++;const d=Math.abs(a[j]-b[j])+Math.abs(a[j+1]-b[j+1])+Math.abs(a[j+2]-b[j+2]);total+=d;if(d>45)changed++;}}
 report.push({pose:i,foregroundMaeRgb:total/n/3,foregroundFractionAbove45:changed/n,sourceTopColors:colors(a),unityTopColors:colors(b)});
 const x=(i%2)*600,y=Math.floor(i/2)*525;g.fillStyle='#bedbe5';g.font='13px sans-serif';g.fillText(`POSE ${i+1} / CANVAS LEFT · UNITY RIGHT`,x+18,y+24);g.drawImage(src,x,y+35,300,250);g.drawImage(unity,x+300,y+35,300,250);
 g.drawImage(src,190,100,340,300,x+15,y+300,270,210);g.drawImage(unity,190,100,340,300,x+315,y+300,270,210);
}
writeFileSync(resolve(out,'CanvasUnityComparison.png'),sheet.toBuffer('image/png'));writeFileSync(resolve(out,'CanvasUnityComparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.map(x=>({pose:x.pose,mae:x.foregroundMaeRgb,changed:x.foregroundFractionAbove45})),null,2));
