# Side-by-side CLASSIC (default) | PREMIUM (option) pairs for Telegram, labelled.
import sys, os
from PIL import Image, ImageDraw, ImageFont
S = '/mnt/c/Users/pete/Documents/MciPro/mockups/premium-20261015/shots'
OUT = '/mnt/c/Users/pete/Documents/MciPro/mockups/premium-20261015/pairs'
os.makedirs(OUT, exist_ok=True)
def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
def pair(name, title, crop_h=None):
    a = Image.open(f'{S}/{name}-classic.png').convert('RGB')
    b = Image.open(f'{S}/{name}-premium.png').convert('RGB')
    if crop_h: a = a.crop((0, 0, a.width, min(a.height, crop_h))); b = b.crop((0, 0, b.width, min(b.height, crop_h)))
    gap, head = 24, 92
    W = a.width + b.width + gap * 3; H = max(a.height, b.height) + head + gap
    im = Image.new('RGB', (W, H), (236, 240, 237)); d = ImageDraw.Draw(im)
    f = font(22 if a.width < 500 else 30); f2 = font(16 if a.width < 500 else 22)
    d.text((gap, 14), 'CLASSIC  (default)', fill=(31, 41, 55), font=f)
    d.text((gap * 2 + a.width, 14), 'PREMIUM  (option)', fill=(5, 122, 85), font=f)
    d.text((gap, 54), title, fill=(107, 122, 112), font=f2)
    im.paste(a, (gap, head)); im.paste(b, (gap * 2 + a.width, head))
    p = f'{OUT}/{name}.png'; im.save(p, optimize=True); print(p, im.size)
for n, t, c in [
    ('golfer-home-360', 'Golfer home 360', None), ('golfer-home-393', 'Golfer home 393', None),
    ('golfer-play-393', 'Play Golf 393', None), ('golfer-teetimes-393', 'Tee Times 393', None),
    ('golfer-schedule-360', 'Schedule 360', None), ('organizer-home-360', 'Organizer home 360', None),
    ('proshop-home-360', 'Pro shop home 360', None), ('caddie-home-360', 'Caddie home 360', None),
]:
    if os.path.exists(f'{S}/{n}-premium.png'): pair(n, t, c)

def stacked(name, title):
    a = Image.open(f'{S}/{name}-classic.png').convert('RGB'); b = Image.open(f'{S}/{name}-premium.png').convert('RGB')
    gap, head = 20, 54
    W = a.width + gap * 2; H = a.height + b.height + head * 2 + gap * 3
    im = Image.new('RGB', (W, H), (236, 240, 237)); d = ImageDraw.Draw(im); f = font(28); f2 = font(20)
    d.text((gap, 12), 'CLASSIC  (default)', fill=(31, 41, 55), font=f)
    d.text((W - gap - d.textlength(title, font=f2), 16), title, fill=(107, 122, 112), font=f2)
    im.paste(a, (gap, head))
    y2 = head + a.height + gap
    d.text((gap, y2 + 12), 'PREMIUM  (option)', fill=(5, 122, 85), font=f)
    im.paste(b, (gap, y2 + head))
    p = f'{OUT}/{name}.png'; im.save(p, optimize=True); print(p, im.size)
for n, t in [('golfer-home-1366', 'Golfer home 1366'), ('golfer-teetimes-1366', 'Tee Times 1366'),
             ('organizer-home-1366', 'Organizer home 1366'), ('proshop-home-1366', 'Pro shop POS 1366')]:
    if os.path.exists(f'{S}/{n}-premium.png'): stacked(n, t)
