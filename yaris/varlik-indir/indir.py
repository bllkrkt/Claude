# Poly Haven'dan (CC0) gerçek dokuları, gökyüzü fotoğraflarını ve sokak modellerini indirip oyuna uygun boyuta küçültür.
# Kullanım: python3 indir.py  → ../src/main/assets/tex, sky, model
import json, os, sys, urllib.request, io
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'main', 'assets')
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'gece-kacagi-varlik/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r: return r.read()
def save_img(data, path, size=None, q=82):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    if size: im = im.resize(size, Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'JPEG', quality=q, optimize=True)
SKIES = {'gunduz': 'zwartkops_straight_afternoon', 'aksam': 'zwartkops_straight_sunset', 'gece': 'shanghai_bund',
         'kapali': 'urban_street_03', 'dag': 'versveldpas', 'dag_gece': 'narrow_moonlit_road'}
TEX = {  # ad: (polyhaven id, haritalar, boyut)
    'asfalt': ('asphalt_02', ['diff', 'nor_gl', 'rough'], 1024),
    'kaldirim': ('square_concrete_pavers', ['diff', 'nor_gl'], 512),
    'beton': ('concrete_wall_008', ['diff'], 512),
    'tugla': ('brick_wall_02', ['diff'], 512),
    'tugla2': ('red_brick_03', ['diff'], 512),
    'siva': ('white_plaster_02', ['diff'], 512),
    'siva2': ('yellow_plaster', ['diff'], 512),
    'kaplama': ('exterior_wall_cladding', ['diff'], 512),
    'cephe': ('concrete_tile_facade', ['diff'], 512),
    'kaya': ('rock_wall_13', ['diff'], 512),
    'toprak': ('gravel_ground_01', ['diff'], 512),
    'cim': ('aerial_grass_rock', ['diff'], 512),
}
MODELS = ['metal_trash_can', 'utility_box_01']  # diğerleri telefona fazla ağır (30-86 bin üçgen)
def main():
    for k, sid in SKIES.items():
        p = f'{OUT}/sky/{k}.jpg'
        if os.path.exists(p): continue
        d = get(f'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/{sid}.jpg')
        save_img(d, p, (2048, 1024), 85); print('gökyüzü', k, sid)
    for k, (tid, maps, sz) in TEX.items():
        files = json.loads(get(f'https://api.polyhaven.com/files/{tid}'))
        for m in maps:
            p = f'{OUT}/tex/{k}_{m}.jpg'
            if os.path.exists(p): continue
            key = {'diff': 'Diffuse', 'nor_gl': 'nor_gl', 'rough': 'Rough'}[m]
            node = files.get(key) or files.get(m)
            url = node['1k']['jpg']['url']
            save_img(get(url), p, (sz, sz)); print('doku', k, m)
    for mid in MODELS:
        d = f'{OUT}/model/{mid}'
        if os.path.exists(d + '/' + mid + '.gltf'): continue
        files = json.loads(get(f'https://api.polyhaven.com/files/{mid}'))
        g = files['gltf']['1k']['gltf']
        os.makedirs(d, exist_ok=True)
        open(f'{d}/{mid}.gltf', 'wb').write(get(g['url']))
        for rel, info in g.get('include', {}).items():
            fp = os.path.join(d, rel); os.makedirs(os.path.dirname(fp), exist_ok=True)
            data = get(info['url'])
            if rel.endswith('.jpg') or rel.endswith('.png'):
                im = Image.open(io.BytesIO(data)); fmt = 'PNG' if rel.endswith('.png') else 'JPEG'
                im = im.resize((512, 512), Image.LANCZOS) if im.width > 512 else im
                if fmt == 'JPEG': im = im.convert('RGB')
                im.save(fp, fmt, **({'quality': 85} if fmt == 'JPEG' else {}))
            else: open(fp, 'wb').write(data)
        print('model', mid)
main()
