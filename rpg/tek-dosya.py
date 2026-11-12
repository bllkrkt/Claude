#!/usr/bin/env python3
"""Fontları ve 3B motoru gömerek oyunun tarayıcıda tek başına açılan tek dosyalık halini üretir.
Kullanım: python3 rpg/tek-dosya.py EfsaneAvcisi.html"""
import base64, pathlib, sys
kok = pathlib.Path(__file__).parent / 'src/main/assets'
html = (kok / 'index.html').read_text(encoding='utf-8')
for f in ('jakarta-latin-ext.woff2', 'jakarta-latin.woff2'):
    b64 = base64.b64encode((kok / 'fonts' / f).read_bytes()).decode()
    html = html.replace('url(fonts/%s)' % f, 'url(data:font/woff2;base64,%s)' % b64)
for js in ('lib/three.min.js', 'sahne3d.js'):
    kod = (kok / js).read_text(encoding='utf-8')
    assert '</script' not in kod, js
    etiket = '<script src="%s"></script>' % js
    assert etiket in html, js
    html = html.replace(etiket, '<script>' + kod + '</script>')
pathlib.Path(sys.argv[1]).write_text(html, encoding='utf-8')
print('yazıldı:', sys.argv[1])
