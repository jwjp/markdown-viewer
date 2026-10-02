"""Generate the installer icons. Requires Pillow."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
output = root / "src-tauri" / "icons"
output.mkdir(parents=True, exist_ok=True)
scale = 4
size = 512
image = Image.new("RGBA", (size * scale, size * scale))
draw = ImageDraw.Draw(image)

def rect(box):
    return tuple(round(value * scale) for value in box)

draw.rounded_rectangle(rect((8, 8, 504, 504)), radius=108 * scale, fill="#212e42")
draw.rounded_rectangle(rect((128, 82, 384, 430)), radius=18 * scale, fill="#ffffff")
draw.polygon([tuple(round(v * scale) for v in point) for point in [(316, 82), (384, 150), (316, 150)]], fill="#d8e6f4")
draw.line([tuple(round(v * scale) for v in point) for point in [(169, 321), (169, 216), (205, 260), (241, 216), (241, 321)]], fill="#3a78e8", width=20 * scale, joint="curve")
draw.line([tuple(round(v * scale) for v in point) for point in [(274, 264), (309, 310), (344, 264)]], fill="#3a78e8", width=20 * scale, joint="curve")
draw.line([tuple(round(v * scale) for v in point) for point in [(309, 310), (309, 214)]], fill="#3a78e8", width=20 * scale)

icon = image.resize((size, size), Image.Resampling.LANCZOS)
for pixels, name in [(32, "32x32.png"), (128, "128x128.png"), (256, "128x128@2x.png")]:
    icon.resize((pixels, pixels), Image.Resampling.LANCZOS).save(output / name)
icon.save(output / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
