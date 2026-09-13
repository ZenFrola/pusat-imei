"""Generate gambar QRIS placeholder untuk website jasa."""
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

img = qrcode.make(
    "QRIS-PLACEHOLDER|Ganti gambar ini dengan QRIS asli Anda di Panel Admin > Pengaturan",
    error_correction=ERROR_CORRECT_H,
    box_size=12,
    border=2,
)
img = img.convert("RGB")

w, h = img.size
canvas = Image.new("RGB", (w, h + 90), (255, 255, 255))
draw = ImageDraw.Draw(canvas)
draw.rectangle([0, 0, w, 60], fill=(200, 30, 45))
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
except Exception:
    font = ImageFont.load_default()
    small = font
draw.text((w // 2, 30), "QRIS", anchor="mm", fill=(255, 255, 255), font=font)
canvas.paste(img, (0, 90))
draw.text((w // 2, h + 60), "Contoh QRIS - ganti di Panel Admin", anchor="mm", fill=(80, 80, 80), font=small)

canvas.save("/home/z/my-project/public/qris-placeholder.png")
print("QRIS placeholder tersimpan:", canvas.size)
