# Sketchfab'dan inen araba GLB'lerini oyuna uygun küçük GLB'ye çevirir.
# Kullanım: python3 -I araba_cevir.py <girdi.glb> <çıktı klasörü> <ad> [sadelestir(0..1)]
# - Ağaç dönüşümleri pişirilir, araba +Z'ye bakacak, tabanı y=0'da, ortalanmış olur.
# - Parçalar türüne göre gruplanır (boya, cam, stop, far, sinyal, plaka, lastik...); rozetler atılır.
# - Dokular içerik özetiyle adlandırılıp <çıktı>/dok/ içine bir kez yazılır (bütün arabalar paylaşır).
# - Malzeme bilgisi her ağın extras alanında: {tur, base, orm, ormuv, renk, metal, puruz, saydam, teker}
import json, struct, sys, os, hashlib, io, re
import numpy as np
from PIL import Image

src, out, ad = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out + '/dok', exist_ok=True)
b = open(src, 'rb').read()
n = struct.unpack('<I', b[12:16])[0]
J = json.loads(b[20:20 + n])
off = 20 + n
L = struct.unpack('<I', b[off:off + 4])[0]
BIN = b[off + 8:off + 8 + L]

CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

def acc(i):
    a = J['accessors'][i]; bv = J['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']]); nc = NC[a['type']]
    st = bv.get('byteStride', dt.itemsize * nc)
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(BIN, dtype=np.uint8, count=st * (a['count'] - 1) + dt.itemsize * nc, offset=base)
    if st == dt.itemsize * nc:
        arr = np.frombuffer(raw.tobytes(), dtype=dt).reshape(-1, nc)
    else:
        arr = np.stack([np.frombuffer(raw[k * st:k * st + dt.itemsize * nc].tobytes(), dtype=dt) for k in range(a['count'])])
    if a.get('normalized'):
        arr = arr.astype(np.float32) / np.iinfo(dt).max
    return arr.astype(np.float32 if arr.dtype.kind == 'f' or a.get('normalized') else np.uint32)

def nodemat(nd):
    if 'matrix' in nd: return np.array(nd['matrix'], dtype=np.float64).reshape(4, 4).T
    M = np.eye(4)
    if 'scale' in nd: M = np.diag(list(nd['scale']) + [1]) @ M
    if 'rotation' in nd:
        x, y, z, w = nd['rotation']
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        R4 = np.eye(4); R4[:3, :3] = R; M = R4 @ M
    if 'translation' in nd:
        T = np.eye(4); T[:3, 3] = nd['translation']; M = T @ M
    return M

# görüntüler: özet -> dosya
IMGH = {}
def img(i, alpha):
    im = J['images'][i]; bv = J['bufferViews'][im['bufferView']]; s = bv.get('byteOffset', 0)
    data = BIN[s:s + bv['byteLength']]
    h = hashlib.md5(data).hexdigest()[:10]
    if (h, alpha) in IMGH: return IMGH[(h, alpha)]
    P = Image.open(io.BytesIO(data))
    sz = 512
    if alpha and P.mode in ('RGBA', 'LA', 'P'):
        f = h + '.png'
        if not os.path.exists(out + '/dok/' + f): P.convert('RGBA').resize((sz, sz), Image.LANCZOS).save(out + '/dok/' + f, optimize=True)
    else:
        f = h + '.jpg'
        if not os.path.exists(out + '/dok/' + f): P.convert('RGB').resize((sz, sz), Image.LANCZOS).save(out + '/dok/' + f, quality=86)
    IMGH[(h, alpha)] = f
    return f

def tex(ti):
    if not ti: return None, 0
    return J['textures'][ti['index']]['source'], ti.get('texCoord', 0)

WHEEL = re.compile(r'wh?e+l+[a-z]*_?(?P<t>fl|fr|rl|rr)(?![a-z])', re.I)
def kindOf(node, matname, blend):
    nn = node.lower(); mn = matname.lower()
    if 'badge' in nn or 'carbadge' in mn: return None
    if 'numberplate' in mn or 'numberplate' in nn or re.search(r'(^|_)np_', nn): return 'plaka'
    if 'interior' in mn and 'steering' in nn: return 'ic'
    if 'lights_and_glass' in mn:
        if re.search(r'glass|windshield|window|windscreen', nn) and not re.search(r'head|tail|brake|light|blinker|reverse', nn): return 'cam'
        if re.search(r'glass', nn): return 'lens'
        if re.search(r'brake|taillight|tail_light', nn): return 'stop'
        if re.search(r'headlight|head_light|foglight|fog', nn): return 'far'
        if re.search(r'blinker|indicator|turn', nn): return 'sinyal'
        if re.search(r'siren|lightbar|beacon', nn): return 'siren'
        return 'isik'
    if re.search(r'siren|lightbar|beacon', nn): return 'siren'
    if 'tire' in mn or 'tyre' in mn or 'wheel' in mn: return 'lastik'
    if 'ucb_' in mn: return 'orj'
    if 'body' in mn or 'paint' in mn: return 'boya'
    return 'orj'

groups = {}  # anahtar -> dict
def visit(ni, PM, path):
    nd = J['nodes'][ni]; M = PM @ nodemat(nd); name = nd.get('name', '')
    path = path + [name]
    if 'mesh' in nd:
        for pr in J['meshes'][nd['mesh']]['primitives']:
            if pr.get('mode', 4) != 4: continue
            m = J['materials'][pr['material']] if 'material' in pr else {'name': 'yok'}
            pb = m.get('pbrMetallicRoughness', {})
            blend = m.get('alphaMode') == 'BLEND'
            # Sketchfab ağ adı: Parça_Malzeme_0 -> malzeme kısmını at
            full = name
            suf = '_' + m.get('name', '') + '_0'
            if full.endswith(suf): full = full[:-len(suf)]
            kind = kindOf(full, m.get('name', ''), blend)
            if kind is None: continue
            wm = WHEEL.search(full) if 'steer' not in full.lower() else None
            wheel = ('W%d' % ni) if wm else None  # etiketi sonra konumdan ver
            if re.search(r'caliper', full, re.I): wheel = None
            bi, buv = tex(pb.get('baseColorTexture'))
            oi, ouv = tex(m.get('occlusionTexture') or pb.get('metallicRoughnessTexture'))
            base = img(bi, blend) if bi is not None else None
            orm = img(oi, False) if oi is not None else None
            cf = pb.get('baseColorFactor', [1, 1, 1, 1])
            ex = {'tur': kind, 'base': base, 'orm': orm, 'ormuv': ouv, 'renk': [round(c, 3) for c in cf],
                  'metal': round(pb.get('metallicFactor', 1), 3), 'puruz': round(pb.get('roughnessFactor', 1), 3),
                  'saydam': blend, 'teker': wheel}
            key = json.dumps(ex, sort_keys=True)
            P = acc(pr['attributes']['POSITION']).astype(np.float64)
            Nn = acc(pr['attributes']['NORMAL']).astype(np.float64) if 'NORMAL' in pr['attributes'] else np.zeros_like(P)
            U0 = acc(pr['attributes']['TEXCOORD_%d' % buv]) if 'TEXCOORD_%d' % buv in pr['attributes'] else np.zeros((len(P), 2), np.float32)
            U1 = acc(pr['attributes']['TEXCOORD_%d' % ouv]) if 'TEXCOORD_%d' % ouv in pr['attributes'] else U0
            I = acc(pr['indices']).reshape(-1) if 'indices' in pr else np.arange(len(P), dtype=np.uint32)
            Ph = np.c_[P, np.ones(len(P))] @ M.T
            N3 = Nn @ np.linalg.inv(M[:3, :3])  # satır vektörü: n·M⁻¹ (ters-devrik dönüşüm)
            N3 /= np.maximum(np.linalg.norm(N3, axis=1, keepdims=True), 1e-9)
            if np.linalg.det(M[:3, :3]) < 0: I = I.reshape(-1, 3)[:, ::-1].reshape(-1)
            g = groups.setdefault(key, {'ex': ex, 'P': [], 'N': [], 'U0': [], 'U1': [], 'I': [], 'n': 0})
            g['I'].append(I.astype(np.uint32) + g['n']); g['n'] += len(P)
            g['P'].append(Ph[:, :3]); g['N'].append(N3); g['U0'].append(U0); g['U1'].append(U1)
    for c in nd.get('children', []): visit(c, M, path)

for r in J['scenes'][J.get('scene', 0)]['nodes']: visit(r, np.eye(4), [])

for g in groups.values():
    for k in ('P', 'N', 'U0', 'U1', 'I'): g[k] = np.concatenate(g[k])

allP = np.concatenate([g['P'] for g in groups.values()])
mn, mx = allP.min(0), allP.max(0)
# uzun yatay eksen Z olsun
ext = mx - mn
R = np.eye(3)
if ext[0] > ext[2]: R = np.array([[0, 0, -1], [0, 1, 0], [1, 0, 0]], float)  # x -> z
def cen(kinds):
    ps = [g['P'] for g in groups.values() if g['ex']['tur'] in kinds]
    return np.concatenate(ps).mean(0) @ R.T if ps else None
front = cen(('far',)); back = cen(('stop',))
flip = False
if front is not None and back is not None: flip = front[2] < back[2]
elif front is not None: flip = front[2] < (allP.mean(0) @ R.T)[2]
if flip: R = np.diag([-1, 1, -1]) @ R
for g in groups.values():
    g['P'] = g['P'] @ R.T; g['N'] = g['N'] @ R.T
allP = np.concatenate([g['P'] for g in groups.values()])
mn, mx = allP.min(0), allP.max(0)
shift = np.array([-(mn[0] + mx[0]) / 2, -mn[1], -(mn[2] + mx[2]) / 2])
wheels = {}
for g in groups.values():
    g['P'] = g['P'] + shift
for g in groups.values():
    w = g['ex']['teker']
    if w:
        wheels.setdefault(w, []).append(g['P'])
# tekerlek gruplarını konumdan etiketle ve birleştir
def lab(c): return ('F' if c[2] > 0 else 'R') + ('L' if c[0] > 0 else 'R')
merged = {}
for key, g in list(groups.items()):
    w = g['ex']['teker']
    if not w: continue
    c = (g['P'].min(0) + g['P'].max(0)) / 2
    nw = lab(c); del groups[key]
    ex = dict(g['ex']); ex['teker'] = nw
    k2 = json.dumps(ex, sort_keys=True)
    if k2 in merged:
        m = merged[k2]; m['I'] = np.concatenate([m['I'], g['I'] + m['n']]); m['n'] += g['n']
        for a in ('P', 'N', 'U0', 'U1'): m[a] = np.concatenate([m[a], g[a]])
    else:
        g['ex'] = ex; merged[k2] = g
WC2 = {}
for k2, g in merged.items():
    w = g['ex']['teker']
    c = (g['P'].min(0) + g['P'].max(0)) / 2
    if w not in WC2: WC2[w] = c
for k2, g in merged.items():
    g['P'] = g['P'] - WC2[g['ex']['teker']]; groups[k2] = g
# siren: sol yarı kırmızı, sağ yarı mavi
for key, g in list(groups.items()):
    if g['ex']['tur'] != 'siren': continue
    del groups[key]
    T = g['I'].reshape(-1, 3); cx = g['P'][T].mean(1)[:, 0]
    for nm, sel in (('sirenK', cx >= 0), ('sirenM', cx < 0)):
        if not sel.any(): continue
        ex = dict(g['ex']); ex['tur'] = nm
        h = dict(g); h['ex'] = ex; h['I'] = T[sel].reshape(-1)
        groups[json.dumps(ex, sort_keys=True)] = h
size = mx - mn

# basit sadeleştirme yok (modeller zaten ~20 bin üçgen); çıktı GLB yaz
buf = bytearray(); bvs = []; accs = []; meshes = []; nodes = []
def addacc(arr, comp, typ, target=None, minmax=False):
    global buf
    while len(buf) % 4: buf += b'\0'
    data = arr.tobytes(); bvs.append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(data)} | ({'target': target} if target else {}))
    buf += data
    a = {'bufferView': len(bvs) - 1, 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
    if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
tris = 0
for g in groups.values():
    ex = g['ex']
    P = g['P'].astype(np.float32); N = g['N'].astype(np.float32)
    attrs = {'POSITION': addacc(P, 5126, 'VEC3', 34962, True), 'NORMAL': addacc(N, 5126, 'VEC3', 34962),
             'TEXCOORD_0': addacc(g['U0'].astype(np.float32), 5126, 'VEC2', 34962)}
    if ex['orm'] and ex['ormuv'] != 0 and not np.array_equal(g['U0'], g['U1']):
        attrs['TEXCOORD_1'] = addacc(g['U1'].astype(np.float32), 5126, 'VEC2', 34962)
    I = g['I']
    ia = addacc(I.astype(np.uint16) if g['n'] < 65536 else I.astype(np.uint32), 5123 if g['n'] < 65536 else 5125, 'SCALAR', 34963)
    tris += len(I) // 3
    meshes.append({'name': ex['tur'], 'primitives': [{'attributes': attrs, 'indices': ia}], 'extras': ex})
    nodes.append({'name': ex['tur'] + ('_' + ex['teker'] if ex['teker'] else ''), 'mesh': len(meshes) - 1})
while len(buf) % 4: buf += b'\0'
G = {'asset': {'version': '2.0', 'generator': 'araba_cevir.py'}, 'scene': 0,
     'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': meshes,
     'accessors': accs, 'bufferViews': bvs, 'buffers': [{'byteLength': len(buf)}],
     'extras': {'boy': [round(float(v), 3) for v in size], 'teker': {k: [round(float(x), 3) for x in v] for k, v in WC2.items()}}}
js = json.dumps(G, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(buf), 0x004E4942) + bytes(buf)
open(out + '/' + ad + '.glb', 'wb').write(glb)
kinds = {}
for g in groups.values(): kinds[g['ex']['tur']] = kinds.get(g['ex']['tur'], 0) + len(g['I']) // 3
print(ad, 'üçgen', tris, 'boy', [round(float(v), 2) for v in size], 'teker', sorted(WC2), 'çevrildi' if flip else '', kinds, len(glb) // 1024, 'KB')
