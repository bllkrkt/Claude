# Polis kaplamasındaki yazı/bayrakları siler; beyaz paneller beyaz, gerisi lacivert olur (üst kısımdaki ayrıntı atlası korunur)
import sys
from PIL import Image, ImageFilter
import numpy as np
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(np.int32); H, W, _ = a.shape
    lum = a.mean(2); sat = a.max(2) - a.min(2)
    white = Image.fromarray(((lum > 200) & (sat < 40)).astype(np.uint8) * 255)
    closed = np.asarray(white.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(11))) > 128
    out = a.copy(); y0 = int(H * 0.3)
    reg = np.zeros((H, W), bool); reg[y0:] = True
    out[reg & closed] = [236, 238, 240]
    out[reg & ~closed] = [20, 33, 61]
    Image.fromarray(out.astype(np.uint8)).save(f, quality=88)
    print('tamam', f)
