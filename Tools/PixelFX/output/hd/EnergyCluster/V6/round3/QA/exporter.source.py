#!/usr/bin/env python3
"""Reference-derived grayscale+alpha shell, not newly drawn artwork or original layers.

Preserve reference curves and fine tips; no binary mask, SDF or component removal.
Static radial color profiles drive the independent realtime volume/halo. No Assets writes.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import argparse
import hashlib
import json
import numpy as np

p = argparse.ArgumentParser()
p.add_argument('--output', type=Path, required=True)
p.add_argument('--round', type=int, default=1)
a = p.parse_args()
out = a.output
assert not (out/'manifest.json').exists(), 'Preserve completed rounds; select a fresh output directory.'
src = Path('Tools/PixelFX/output/hd/EnergyCluster/V3')
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
source_paths = sorted((src / 'Frames').glob('*.png'))
source_hashes = {str(path): sha(path) for path in source_paths}
for folder in ['Textures', 'QA', 'Frames']:
    (out / folder).mkdir(parents=True, exist_ok=True)

bg = np.array([5, 7, 22], dtype=float) / 255
original = []
for path in source_paths:
    rgba = np.asarray(Image.open(path).convert('RGBA'), dtype=float) / 255
    original.append(rgba[..., :3] * rgba[..., 3:4] + bg * (1 - rgba[..., 3:4]))
original = np.stack(original)
yy, xx = np.mgrid[:512, :512]
radius = np.hypot(xx + .5 - 256, yy + .5 - 252.5)
profile = np.zeros((256, 3))
for i in range(256):
    values = original[:, (radius >= i) & (radius < i + 1)]
    profile[i] = np.percentile(values.reshape(-1,3), 12, axis=0) if values.size else bg
for k in range(3):
    profile[:, k] = np.convolve(np.pad(profile[:, k], (3, 3), mode='edge'), np.ones(7)/7, mode='valid')
# Remove the constant white dot from the static color profile; retain its diffuse cyan light.
profile[:26] = np.linspace(np.array([.27, .71, 1.]), profile[26], 26)
if a.round >= 2:
    # A temporal low percentile still contains the almost permanent bright rim.
    # The realtime body must be smooth; local rim brightness stays with the shell data.
    profile[26:] = np.minimum.accumulate(profile[26:],axis=0)
profile = np.maximum(profile, bg)
cell, cols, rows, crop = 256, 5, 4, (80, 80, 432, 432)
q = (np.arange(256) + .5) * (176 / 256)
radial = np.stack([np.interp(q, np.arange(256), profile[:, k]) for k in range(3)], axis=-1)
smooth = lambda lo, hi, x: (lambda t: t*t*(3-2*t))(np.clip((x-lo)/(hi-lo), 0, 1))
split = 1 - smooth(94, 126, q)
volume_delta = (radial - bg) * split[:, None]
halo_delta = (radial - bg) * (1 - split[:, None])
alpha = np.clip(np.max(volume_delta / (1-bg), axis=-1), 0, 1)
volume_profile = np.concatenate([volume_delta + bg * alpha[:, None], alpha[:, None]], axis=-1)
# Both profile textures are opaque DATA encodings, premultiplied RGB values are intentional.
vp = np.rint(np.clip(volume_profile, 0, 1)*255).astype(np.uint8)
hp = np.rint(np.clip(np.concatenate([halo_delta, np.zeros((256,1))], axis=-1),0,1)*255).astype(np.uint8)
core_profile = 1-smooth(19.6,20.5,q)
if a.round >= 2:
    # Calibrate the static circular edge to clear-frame samples, not a guessed radius cutout.
    clear_red=np.mean(original[:5,...,0],axis=0)
    rd=[]
    for rr in q:
        mask=(radius>=max(0,rr-.45))&(radius<rr+.45)
        rd.append(np.mean(clear_red[mask]) if mask.any() else np.interp(rr,np.arange(256),profile[:,0]))
    rd=np.asarray(rd)
    core_profile=np.clip((rd-radial[:,0])/np.maximum(.01,.984-radial[:,0]),0,1)*(1-smooth(22,25,q))
cp=np.rint(core_profile*255).astype(np.uint8)
cp_rgba=np.stack([cp,cp,cp,cp],axis=-1)
Image.fromarray(vp[None,...]).save(out/'Textures/EnergyCluster_VolumeProfile.png')
Image.fromarray(hp[None,...]).save(out/'Textures/EnergyCluster_HaloProfile.png')
Image.fromarray(cp_rgba[None,...]).save(out/'Textures/EnergyCluster_CoreProfile.png')
(out/'Textures/EnergyCluster_Profiles.rgba').write_bytes(vp.tobytes()+hp.tobytes()+cp_rgba.tobytes())

def sample_profile(r, data):
    return np.stack([np.interp(r*256/176-.5, np.arange(256), data[:,k]/255) for k in range(4)],axis=-1)

def base_field(r):
    v = sample_profile(r, vp); h = sample_profile(r,hp)
    c = v[...,:3] + bg*(1-v[...,3:4]) + h[...,:3]
    core = np.interp(r*256/176-.5,np.arange(256),cp/255)
    return c*(1-core[...,None])+np.array([.984,.988,1.])*core[...,None]

baseline = base_field(radius)
atlas = np.zeros((rows*cell,cols*cell,2),dtype=np.uint8)
ref_atlas = Image.new('RGBA',(cols*cell,rows*cell))
contact = Image.new('RGB',(cols*cell,rows*(cell+20)),tuple((bg*255).astype(int)))
comparison = Image.new('RGB',(1024,4*280),tuple((bg*255).astype(int)))
draw, cd = ImageDraw.Draw(contact),ImageDraw.Draw(comparison)
stats=[]
for i,frame in enumerate(original):
    r0 = baseline[...,0]
    delta = frame[...,0]-r0
    positive = np.maximum(0,delta)/np.maximum(.08,1-r0)
    negative = np.maximum(0,-delta)/np.maximum(.12,r0-.40)
    # Negative contrast inside the bright core preserves an occluding blue membrane.
    core_zone=1-smooth(20,24,radius)
    if a.round >= 3:
        positive*=smooth(21,25,radius)
        core_alpha=np.interp(radius*256/176-.5,np.arange(256),cp/255)
        core_zone=smooth(.55,.95,core_alpha)
    energy=np.clip(positive+negative*core_zone,0,1)
    gate=smooth(.012,.065,energy)
    opacity=np.sqrt(energy)*gate
    tone=np.clip(r0+delta/np.maximum(opacity,1e-8),0,1)
    tone[opacity==0]=0
    # Round controls are deliberately separate, inspect actual results before changing them.
    if a.round >= 2:
        # A soft neighborhood support only removes broad low-contrast volume residue.
        # It does not replace the continuous final gray/opacity with a binary silhouette.
        support=Image.fromarray(np.uint8(energy>.16)*255).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(2))
        opacity*=np.asarray(support)/255
    gray=np.rint(np.stack([tone,opacity],axis=-1)*255).astype(np.uint8)
    # LA resampling is premultiplied by Pillow; raw stored channels are straight gray+alpha.
    tile=Image.fromarray(gray,mode='LA').crop(crop).resize((256,256),Image.Resampling.LANCZOS)
    tile_data=np.array(tile);tile_data[tile_data[...,1]==0,0]=0
    tile=Image.fromarray(tile_data,mode='LA')
    tile.save(out/'Frames'/f'EnergyCluster_Shell_{i:03}.png')
    atlas[i//cols*256:(i//cols+1)*256,i%cols*256:(i%cols+1)*256]=tile_data
    tone2,alpha2=tile_data[...,0]/255,tile_data[...,1]/255
    sy,sx=np.mgrid[:256,:256]; rr=np.hypot((sx+.5)*352/256+80-256,(sy+.5)*352/256+80-252.5)
    base=base_field(rr)
    shell=np.stack([tone2,.45+.55*tone2,np.ones_like(tone2)],axis=-1)
    bloom=np.zeros_like(alpha2)
    if a.round >= 3:
        lum=tone2*alpha2
        bloom=sum(np.roll(lum,(dy,dx),axis=(0,1)) for dx,dy in [(-2,-2),(2,-2),(-2,2),(2,2)])/4*.30
    c=np.clip((base+bloom[...,None]*np.array([.08,.25,1.]))*(1-alpha2[...,None])+shell*alpha2[...,None],0,1)
    shell_only=bg*(1-alpha2[...,None])+shell*alpha2[...,None]
    ref=Image.fromarray(np.rint(frame*255).astype(np.uint8)).crop(crop).resize((256,256),Image.Resampling.LANCZOS)
    ref_atlas.paste(ref,(i%cols*256,i//cols*256))
    x,y=i%cols*256,i//cols*276
    contact.paste(Image.fromarray(np.rint(shell_only*255).astype(np.uint8)),(x,y+20));draw.text((x+7,y+4),f'{i:02} / GRAY + ALPHA / SHELL',fill=(155,195,220))
    if i in [0,6,12,18]:
        row=[0,6,12,18].index(i)*280
        for j,(label,img) in enumerate([('REFERENCE',ref),('HYBRID',Image.fromarray(np.rint(c*255).astype(np.uint8))),('SHELL ONLY',Image.fromarray(np.rint(shell_only*255).astype(np.uint8))),('STATIC BASE',Image.fromarray(np.rint(base*255).astype(np.uint8)))]):
            comparison.paste(img,(j*256,row+24));cd.text((j*256+8,row+5),f'{label} / {i:02}',fill=(160,195,220))
    stats.append({'frame':i,'softAlphaPixels':int(((alpha2>0)&(alpha2<1)).sum()),'grayscaleValues':len(np.unique(tile_data[...,0])),'meanAbsRGB8':float(np.abs(c-np.asarray(ref)/255).mean()*255)})
Image.fromarray(atlas,mode='LA').save(out/'Textures/EnergyCluster_ShellGrayAlpha.png')
(out/'Textures/EnergyCluster_ShellGrayAlpha.rg').write_bytes(atlas.tobytes())
ref_atlas.save(out/'QA/Reference_Cropped.png')
contact.save(out/'QA/shell-contact.png');comparison.save(out/'QA/comparison.png')
assert source_hashes=={str(path):sha(path) for path in source_paths}
manifest={'effect':'EnergyCluster','version':f'6.0-gray-alpha-round{a.round}','stage':'authoring / NOT Unity','provenance':'Reference-derived grayscale and alpha shell, approximate separation, not original artist layers or newly drawn animation',
 'frameCount':20,'fps':20/.48,'duration':.48,'loop':True,'originalDuration':.8,'timeScaleVsOriginal':.8/.48,'cellSize':[256,256],'atlasSize':[1280,1024],'columns':5,'rows':4,'pivot':[.5,.5],
 'source':source_hashes,'uniformCropFromV3Frame':list(crop),'coreSourceCenter':[256,252.5],
 'shell':{'pngMode':'LA','channels':'L=continuous gray tone, A=continuous opacity; NOT signed distance','raw':'Textures/EnergyCluster_ShellGrayAlpha.rg','targetFormat':'R8G8_UNorm (RG16), actual Unity format unverified','colorSpace':'linear data','filter':'Bilinear','wrap':'Clamp','mipmaps':False,'rawBytes':atlas.nbytes,'pngBytes':(out/'Textures/EnergyCluster_ShellGrayAlpha.png').stat().st_size},
 'profiles':{'raw':'Textures/EnergyCluster_Profiles.rgba','dimensions':[256,1],'count':3,'bytes':vp.nbytes+hp.nbytes+cp_rgba.nbytes,'description':'Static radial premultiplied display RGB+opacity for volume; additive RGB for halo; core alpha. No temporal frames.'},
 'metrics':stats,'limitations':['R-channel background subtraction is approximate','Shell tone uses blue-white palette reconstruction, not exact original RGB','Core occlusion inferred from negative contrast','Reference-derived connected and detached tips remain in the shell frames','No Unity shader/API/PC performance validation']}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(out/'QA/exporter.source.py').write_text(Path(__file__).read_text())
print(json.dumps({'output':str(out),'shellBytes':atlas.nbytes,'pngBytes':manifest['shell']['pngBytes'],'meanRGB8':np.mean([s['meanAbsRGB8'] for s in stats])}))
