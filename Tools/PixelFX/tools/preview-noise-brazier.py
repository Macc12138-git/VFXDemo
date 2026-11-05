"""Review-only GIF from the CPU reference. Not a Unity asset or material input."""
from pathlib import Path
from PIL import Image

root = Path("Tools/PixelFX/output/hd/noise-brazier")
paths = sorted((root / "frames").glob("frame-*.png"))
if len(paths) != 120:
    raise SystemExit("Render --frames true first; expected 120 review frames")
frames = []
for path in paths:
    image = Image.open(path).convert("RGBA")
    background = Image.new("RGBA", image.size, "#151820")
    background.alpha_composite(image)
    frames.append(background.convert("RGB"))
palette = frames[0].quantize(colors=224, method=Image.Quantize.MEDIANCUT)
quantized = [image.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for image in frames]
# GIF delays are multiples of 10ms: 70+70+60 reproduces 15fps without drift.
quantized[0].save(root / "preview.gif", save_all=True, append_images=quantized[1:], duration=[70, 70, 60] * 40, loop=0, disposal=2)
print(root / "preview.gif")
