// Gece Kaçağı — AÇIK ŞEHİR (v15)
// Karaliman'ın ızgara sokaklı merkezi: dünya koordinatında sürüş (yarışla aynı lastik modeli), binalarla çarpışma,
// trafik ışıklı kavşaklar, şeritte giden ve kavşakta dönen trafik, devriye → kovalamaca (görüş hattı, sokak sokak takip),
// takviye, barikat, helikopter, saklanma noktaları, takip kırıcılar, radarlar, mini harita.
// Yarış motorundan (yaris.js) ortak parçaları YARIS.kit() ile alır; döngü YARIS.setCity(this) ile buraya yönlenir.
(function (G) {
  'use strict';
  const KMH = 3.6, GRAV = 9.81;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  // ── şehir ölçüleri ──
  const NB = 8, BLK = 104, RW = 20, P = BLK + RW, LO = [2.4, 6.9]; // blok sayısı, blok, yol genişliği, kavşaklar arası, şerit merkezleri
  const SIZE = NB * P;                                                 // yol merkezleri 0..SIZE
  const SW = 4.5;                                                      // kaldırım
  const rc = i => i * P;                                               // i. yolun merkezi

  let K = null, THREE = null, C = null; // kit, three, şehir durumu

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ───────── HARİTA ÜRETİMİ ─────────
  function genMap(seed) {
    const r = rng(seed);
    const blocks = [], boxes = [], trees = [], hides = [], breakers = [], radars = [];
    const sea = NB - 1; // en güney sıra: liman
    for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) {
      const x0 = rc(bi) + RW / 2, x1 = rc(bi + 1) - RW / 2, z0 = rc(bj) + RW / 2, z1 = rc(bj + 1) - RW / 2;
      const dc = Math.max(Math.abs(bi - 3.5), Math.abs(bj - 3.5));
      let tip = bj === sea ? 'liman' : dc <= 1.5 ? 'merkez' : 'mahalle';
      if ((bi === 1 && bj === 2) || (bi === 6 && bj === 5) || (bi === 5 && bj === 1)) tip = 'park';
      const B = { bi, bj, x0, x1, z0, z1, tip, alley: null, boxes: [] };
      blocks.push(B);
      const ix0 = x0 + SW, ix1 = x1 - SW, iz0 = z0 + SW, iz1 = z1 - SW;
      if (tip === 'park') {
        for (let k = 0; k < 26; k++) { const x = lerp(ix0 + 4, ix1 - 4, r()), z = lerp(iz0 + 4, iz1 - 4, r()); if (Math.abs(x - (x0 + x1) / 2) < 6 || Math.abs(z - (z0 + z1) / 2) < 6) continue; trees.push({ x, z, r: 0.6, h: 5 + r() * 4 }); }
        hides.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 12, ad: 'Park' });
        continue;
      }
      // ara sokak (kestirme): bloğu ortadan böler
      if (tip !== 'liman' && r() < 0.55) B.alley = r() < 0.5 ? 'x' : 'z';
      const AW = 9;
      const lots = [];
      const half = (a0, a1) => [[a0, (a0 + a1) / 2 - (B.alley ? AW / 2 : 0.8)], [(a0 + a1) / 2 + (B.alley ? AW / 2 : 0.8), a1]];
      const xs = B.alley === 'z' ? half(ix0, ix1) : [[ix0, (ix0 + ix1) / 2 - 0.8], [(ix0 + ix1) / 2 + 0.8, ix1]];
      const zs = B.alley === 'x' ? half(iz0, iz1) : [[iz0, (iz0 + iz1) / 2 - 0.8], [(iz0 + iz1) / 2 + 0.8, iz1]];
      for (const [a, b] of xs) for (const [c, d] of zs) lots.push([a, b, c, d]);
      for (const [a, b, c, d] of lots) {
        // her parselde 1–2 bina
        const split = tip !== 'merkez' && r() < 0.5, sx = split && (b - a) > (d - c);
        const parts = split ? (sx ? [[a, (a + b) / 2 - 0.5, c, d], [(a + b) / 2 + 0.5, b, c, d]] : [[a, b, c, (c + d) / 2 - 0.5], [a, b, (c + d) / 2 + 0.5, d]]) : [[a, b, c, d]];
        for (const [px0, px1, pz0, pz1] of parts) {
          const t = r();
          const h = tip === 'merkez' ? 30 + Math.pow(t, 0.8) * 90 : tip === 'liman' ? 9 + t * 8 : 12 + Math.pow(t, 1.3) * 26;
          const box = { x0: px0, x1: px1, z0: pz0, z1: pz1, h: Math.round(h / 3) * 3 + 4.5, glass: tip === 'merkez' && h > 45 && r() < 0.75, style: Math.floor(r() * 64), liman: tip === 'liman' };
          boxes.push(box); B.boxes.push(box);
        }
      }
      if (B.alley && r() < 0.5) hides.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 9, ad: 'Ara sokak' });
    }
    // takip kırıcılar: bazı kavşak köşelerinde iskele/konteyner yığını
    for (let k = 0; k < 9; k++) {
      const i = 1 + Math.floor(r() * (NB - 1)), j = 1 + Math.floor(r() * (NB - 1));
      const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1;
      breakers.push({ x: rc(i) + sx * (RW / 2 + 2.2), z: rc(j) + sz * (RW / 2 + 2.2), sx, sz, up: true, id: k, tip: k % 3 === 0 ? 'konteyner' : 'iskele' });
    }
    // radarlar: uzun düzlüklerde
    for (let k = 0; k < 5; k++) {
      const ax = k % 2 ? 'x' : 'z', line = 1 + Math.floor(r() * (NB - 1)), p = rc(1 + Math.floor(r() * (NB - 2))) + P / 2;
      radars.push(ax === 'x' ? { id: k, x: p, z: rc(line), ax } : { id: k, x: rc(line), z: p, ax });
    }
    return { blocks, boxes, trees, hides, breakers, radars };
  }
  function blockAt(x, z) {
    const bi = Math.floor(x / P), bj = Math.floor(z / P);
    if (bi < 0 || bj < 0 || bi >= NB || bj >= NB) return null;
    return C.map.blocks[bj * NB + bi];
  }
  // (x,z) yakınındaki bina kutuları (3×3 blok)
  function nearBoxes(x, z, out) {
    out.length = 0;
    const bi = Math.floor(x / P), bj = Math.floor(z / P);
    for (let j = bj - 1; j <= bj + 1; j++) for (let i = bi - 1; i <= bi + 1; i++) {
      if (i < 0 || j < 0 || i >= NB || j >= NB) continue;
      for (const b of C.map.blocks[j * NB + i].boxes) out.push(b);
    }
    return out;
  }
  const _nb = [];
  function inBox(x, z, pad) { nearBoxes(x, z, _nb); for (const b of _nb) if (x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad) return b; return null; }
  // görüş hattı: aradaki binalar engelliyor mu (örnekleyerek)
  function los(ax, az, bx, bz, pad) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (pad ? 3 : 6));
    for (let k = 1; k < n; k++) { const t = k / n; if (inBox(lerp(ax, bx, t), lerp(az, bz, t), pad || -0.5)) return false; }
    return true;
  }
  const onMap = (x, z) => x > -RW / 2 && x < SIZE + RW / 2 && z > -RW / 2 && z < SIZE + RW / 2;

  // ───────── SAHNE ─────────
  function buildScene(cfg) {
    const VA = G.VARLIK && G.VARLIK.ready ? G.VARLIK.A : null, q = K.Q();
    const sc = new THREE.Scene();
    const night = cfg.saat === 'gece', eve = cfg.saat === 'aksam';
    const fogC = night ? '#0b1022' : eve ? '#5a4a58' : '#a9b8c8';
    sc.background = new THREE.Color(fogC);
    sc.fog = new THREE.Fog(fogC, night ? 60 : 90, night ? 430 : 520);
    const col = c => new THREE.Color(c);
    // ışık
    sc.add(new THREE.HemisphereLight(night ? 0x5566aa : eve ? 0xffc9a0 : 0xdfe9ff, night ? 0x1a1420 : 0x40382c, night ? 0.55 : 0.85));
    const sun = new THREE.DirectionalLight(night ? 0x8899ff : eve ? 0xffa060 : 0xfff2dc, night ? 0.5 : eve ? 1.3 : 2.0);
    sun.position.set(60, 120, 40);
    if (q >= 1) { sun.castShadow = true; sun.shadow.mapSize.set(q >= 3 ? 4096 : q >= 2 ? 2048 : 1024, q >= 3 ? 4096 : q >= 2 ? 2048 : 1024); const s = sun.shadow.camera; s.left = s.bottom = -60; s.right = s.top = 60; s.near = 1; s.far = 320; sun.shadow.bias = -0.0006; }
    sc.add(sun); sc.add(sun.target);
    // ortam yansıması + gökyüzü
    let env = null;
    try { env = G.DUNYA.envFromSky(K.renderer, { tema: 'merkez' }, cfg.saat, cfg.hava); } catch (e) { env = null; }
    if (!env) env = G.DUNYA.envMap(K.renderer, night ? '#0a0f24' : '#6a8ab0', night ? '#ff2e63' : '#ffd0a0', '#00e5ff');
    K.A3.setEnv(env);
    const skN = G.DUNYA.skyName({ tema: 'merkez' }, cfg.saat, cfg.hava), SKP = VA && VA.sky ? VA.sky[skN] : null;
    if (SKP) {
      const sg = new THREE.SphereGeometry(1400, 40, 20); sg.scale(-1, 1, 1);
      const sm = new THREE.MeshBasicMaterial({ map: SKP.tex, fog: false, depthWrite: false });
      if (night) sm.color.setRGB(0.42, 0.44, 0.55);
      const sky = new THREE.Mesh(sg, sm); sky.renderOrder = -10; sc.add(sky); C.sky = sky;
    }
    // zemin: asfalt
    const span = SIZE + 900;
    const asf = VA ? G.VARLIK.tex('asfalt_diff', span / 8, span / 8) : null;
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(span, span), new THREE.MeshStandardMaterial({ color: night ? '#3a3c44' : '#5a5c62', map: asf, roughness: cfg.hava === 'yagmur' ? 0.35 : 0.88, metalness: cfg.hava === 'yagmur' ? 0.25 : 0, envMap: env }));
    gm.rotation.x = -Math.PI / 2; gm.position.set(SIZE / 2, 0, SIZE / 2); gm.receiveShadow = q >= 1; sc.add(gm);
    // deniz (güney) — liman sırasının ötesi
    const seaZ = SIZE + RW / 2 + 40;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(span, 900), new THREE.MeshStandardMaterial({ color: night ? '#06121e' : '#1c4a66', roughness: 0.15, metalness: 0.6, envMap: env }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(SIZE / 2, -0.8, seaZ + 450); sc.add(sea);
    // kaldırımlar/bloklar (birleştirilmiş), parklar çim
    const mergeBoxes = (list, mat, uvS) => {
      if (!list.length) return null;
      const pos = [], nor = [], uv = [], idx = [];
      for (const [x0, x1, z0, z1, y0, y1] of list) {
        const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        const p = g.attributes.position, n = g.attributes.normal, base = pos.length / 3;
        for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); const ny = Math.abs(n.getY(i)) > 0.5; uv.push((ny ? p.getX(i) : p.getX(i) + p.getZ(i)) / uvS, (ny ? p.getZ(i) : p.getY(i)) / uvS); }
        for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
        g.dispose();
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx);
      const m = new THREE.Mesh(bg, mat); m.receiveShadow = q >= 1; sc.add(m); return m;
    };
    const walk = [], grass = [];
    for (const B of C.map.blocks) {
      if (B.tip === 'park') { walk.push([B.x0, B.x1, B.z0, B.z0 + SW, 0, 0.16], [B.x0, B.x1, B.z1 - SW, B.z1, 0, 0.16], [B.x0, B.x0 + SW, B.z0 + SW, B.z1 - SW, 0, 0.16], [B.x1 - SW, B.x1, B.z0 + SW, B.z1 - SW, 0, 0.16]); grass.push([B.x0 + SW, B.x1 - SW, B.z0 + SW, B.z1 - SW, 0, 0.12]); }
      else if (B.alley) { // ara sokak asfalt kalsın
        const mx = (B.x0 + B.x1) / 2, mz = (B.z0 + B.z1) / 2;
        if (B.alley === 'x') { walk.push([B.x0, B.x1, B.z0, mz - 4.5, 0, 0.16], [B.x0, B.x1, mz + 4.5, B.z1, 0, 0.16]); }
        else { walk.push([B.x0, mx - 4.5, B.z0, B.z1, 0, 0.16], [mx + 4.5, B.x1, B.z0, B.z1, 0, 0.16]); }
      } else walk.push([B.x0, B.x1, B.z0, B.z1, 0, 0.16]);
    }
    // rıhtım duvarı
    walk.push([-RW / 2 - 40, SIZE + RW / 2 + 40, SIZE + RW / 2, SIZE + RW / 2 + 40, -0.8, 0.16]);
    mergeBoxes(walk, new THREE.MeshStandardMaterial({ color: night ? '#77787e' : '#b0b0b4', map: VA ? G.VARLIK.tex('kaldirim_diff', 1, 1) : null, roughness: 0.9 }), 4);
    mergeBoxes(grass, new THREE.MeshStandardMaterial({ color: night ? '#2a4a2a' : '#4f7a3a', map: VA ? G.VARLIK.tex('cim_diff', 1, 1) : null, roughness: 1 }), 6);
    // şehir sınırı: beton bariyerler (kuzey/doğu/batı)
    const wall = [];
    const E = RW / 2 + 1;
    wall.push([-E - 1, SIZE + E + 1, -E - 1, -E, 0, 1.1], [-E - 1, -E, -E, SIZE + E, 0, 1.1], [SIZE + E, SIZE + E + 1, -E, SIZE + E, 0, 1.1]);
    mergeBoxes(wall, new THREE.MeshStandardMaterial({ color: '#c9c3b6', map: VA ? G.VARLIK.tex('beton_diff', 1, 1) : null, roughness: 0.8 }), 3);
    // şerit çizgileri, yaya geçitleri (tek ağ, köşe renkli)
    {
      const pos = [], colA = [], idx = [];
      const quad = (x0, z0, x1, z1, c) => { const b = pos.length / 3; pos.push(x0, 0.02, z0, x1, 0.02, z0, x1, 0.02, z1, x0, 0.02, z1); for (let k = 0; k < 4; k++) colA.push(c[0], c[1], c[2]); idx.push(b, b + 2, b + 1, b, b + 3, b + 2); };
      const W = [0.92, 0.92, 0.9], Y = [0.95, 0.72, 0.15];
      for (let i = 0; i <= NB; i++) for (let k = 0; k < NB; k++) {
        const a = rc(k) + RW / 2, b = rc(k + 1) - RW / 2, c = rc(i);
        // x yönlü yol (z = c) ve z yönlü yol (x = c)
        quad(a, c - 0.32, b, c - 0.18, Y); quad(a, c + 0.18, b, c + 0.32, Y);
        quad(c - 0.32, a, c - 0.18, b, Y); quad(c + 0.18, a, c + 0.32, b, Y);
        for (let s = a + 2; s < b - 3; s += 9) for (const off of [-4.65, 4.65]) { quad(s, c + off - 0.08, s + 3, c + off + 0.08, W); quad(c + off - 0.08, s, c + off + 0.08, s + 3, W); }
      }
      // yaya geçitleri
      for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) {
        const cx = rc(i), cz = rc(j);
        for (let s = -RW / 2 + 1; s < RW / 2 - 1; s += 1.6) {
          for (const sg of [-1, 1]) { quad(cx + s, cz + sg * (RW / 2 + 0.4), cx + s + 0.8, cz + sg * (RW / 2 + 3), W); quad(cx + sg * (RW / 2 + 0.4), cz + s, cx + sg * (RW / 2 + 3), cz + s + 0.8, W); }
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = q >= 1; sc.add(m);
    }
    // binalar: cephe dokulu (pencere boyutu sabit), zemin kat dükkân, cam kuleler, çatı korkuluğu
    {
      const F = VA ? VA.facade : null, NF = F ? F.length : 1;
      const up = Array.from({ length: NF }, () => ({ p: [], n: [], u: [], i: [] })), sh = Array.from({ length: NF }, () => ({ p: [], n: [], u: [], i: [] }));
      const gl = (VA ? VA.glass : [0]).map(() => ({ p: [], n: [], u: [], i: [] })), roof = { p: [], n: [], u: [], i: [] };
      const push = (dst, rf, x0, x1, y0, y1, z0, z1, vS) => {
        const w = x1 - x0, h = y1 - y0, d = z1 - z0;
        const g = new THREE.BoxGeometry(w, h, d); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        const uv = g.attributes.uv, fw = [d, d, w, w, w, w];
        for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; if (f === 2 || f === 3) uv.setXY(i, uv.getX(i) * w / 10, uv.getY(i) * d / 10); else uv.setXY(i, uv.getX(i) * fw[f] / 12, uv.getY(i) * h / vS); }
        const Pp = g.attributes.position, N = g.attributes.normal, ix = g.index;
        for (const [t, faces] of [[dst, [0, 1, 4, 5]], [rf, [2]]]) {
          if (!t) continue;
          for (const f of faces) { const base = t.p.length / 3; for (let k = 0; k < 4; k++) { const i = f * 4 + k; t.p.push(Pp.getX(i), Pp.getY(i), Pp.getZ(i)); t.n.push(N.getX(i), N.getY(i), N.getZ(i)); t.u.push(uv.getX(i), uv.getY(i)); } for (let e = 0; e < 6; e++) t.i.push(base + ix.getX(f * 6 + e) - f * 4); }
        }
        g.dispose();
      };
      for (const b of C.map.boxes) {
        const fi = b.style % NF;
        push(sh[fi], null, b.x0, b.x1, 0, 4.9, b.z0, b.z1, 5.3);
        if (b.glass && VA) push(gl[b.style % gl.length], roof, b.x0 + 0.6, b.x1 - 0.6, 4.45, b.h, b.z0 + 0.6, b.z1 - 0.6, 9);
        else push(up[fi], roof, b.x0, b.x1, 4.45, b.h, b.z0, b.z1, 9);
      }
      const mk = (buf, mat) => {
        if (!buf.p.length) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.u, 2)); g.setIndex(buf.i); g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mat); m.castShadow = q >= 2; m.receiveShadow = q >= 1; sc.add(m);
      };
      const ei = night ? 0.65 : eve ? 0.22 : 0, shade = night ? col('#6a6a78') : col('#ffffff');
      for (let i = 0; i < NF; i++) {
        const f = F ? F[i] : null;
        mk(up[i], new THREE.MeshStandardMaterial({ map: f && f.map, emissiveMap: f && f.emi, emissive: col(f ? '#ffffff' : '#000000'), emissiveIntensity: ei, roughness: 0.82, color: f ? shade : col('#8a8f99') }));
        mk(sh[i], new THREE.MeshStandardMaterial({ map: f && f.shop, emissiveMap: f && f.shopEmi, emissive: col(f ? '#ffffff' : '#000000'), emissiveIntensity: night ? 0.6 : eve ? 0.35 : 0.05, roughness: 0.7, color: f ? shade : col('#6a6f79') }));
      }
      if (VA) VA.glass.forEach((t, i) => mk(gl[i], new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emi, emissive: col('#ffffff'), emissiveIntensity: night ? 0.8 : 0.1, roughness: 0.12, metalness: 0.85, envMap: env, envMapIntensity: 1.3, color: shade })));
      mk(roof, new THREE.MeshStandardMaterial({ color: night ? '#3a3b40' : '#77787c', map: VA ? G.VARLIK.tex('beton_diff', 1, 1) : null, roughness: 0.95 }));
    }
    // ağaçlar
    if (C.map.trees.length) {
      const n = C.map.trees.length;
      const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 1, 6), new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 1 }), n);
      const cr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: night ? '#24402a' : '#3f6e36', map: VA ? VA.leaf : null, roughness: 1 }), n);
      const m = new THREE.Matrix4(), qq = new THREE.Quaternion();
      C.map.trees.forEach((t, i) => {
        m.compose(new THREE.Vector3(t.x, t.h * 0.3, t.z), qq, new THREE.Vector3(1, t.h * 0.6, 1)); tr.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(t.x, t.h * 0.72, t.z), qq, new THREE.Vector3(t.h * 0.33, t.h * 0.38, t.h * 0.33)); cr.setMatrixAt(i, m);
      });
      tr.castShadow = cr.castShadow = q >= 1; sc.add(tr); sc.add(cr);
    }
    // sokak lambaları + gece ışık parlamaları
    {
      const pts = [];
      for (let i = 0; i <= NB; i++) for (let k = 0; k < NB; k++) for (let s = rc(k) + RW / 2 + 12; s < rc(k + 1) - RW / 2 - 6; s += 32) {
        pts.push([s, rc(i) - RW / 2 - 1.2, 1], [s + 16, rc(i) + RW / 2 + 1.2, -1]);     // x yönlü yolun iki kenarı (z = sabit)
      }
      const L = [];
      for (const [s, o, sg] of pts) { L.push({ x: s, z: o, dx: 0, dz: sg }); }
      for (const [s, o, sg] of pts) { L.push({ x: o, z: s, dx: sg, dz: 0 }); }
      const n = L.length;
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 8, 6), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.6, metalness: 0.6 }), n);
      const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.18, 1.2), new THREE.MeshBasicMaterial({ color: night || eve ? new THREE.Color(3, 2.6, 1.9) : new THREE.Color('#c8c8c0') }), n);
      const m = new THREE.Matrix4(), qq = new THREE.Quaternion(), glowP = [];
      L.forEach((l, i) => {
        m.compose(new THREE.Vector3(l.x, 4, l.z), qq, new THREE.Vector3(1, 1, 1)); pole.setMatrixAt(i, m);
        const hx = l.x + l.dx * 1.2, hz = l.z + l.dz * 1.2;
        qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), l.dx ? Math.PI / 2 : 0);
        m.compose(new THREE.Vector3(hx, 7.9, hz), qq, new THREE.Vector3(1, 1, 1)); head.setMatrixAt(i, m); qq.identity();
        glowP.push(hx, 7.6, hz);
      });
      sc.add(pole); sc.add(head);
      if (night || eve) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(glowP, 3));
        sc.add(new THREE.Points(g, new THREE.PointsMaterial({ map: G.DUNYA.glowTex ? G.DUNYA.glowTex() : null, color: 0xffd9a0, size: 7, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
        // yolda ışık havuzları
        const pm = new THREE.InstancedMesh(new THREE.CircleGeometry(5.5, 20), new THREE.MeshBasicMaterial({ color: 0x6a5030, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, map: G.DUNYA.glowTex ? G.DUNYA.glowTex() : null }), n);
        const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        L.forEach((l, i) => { m.compose(new THREE.Vector3(l.x + l.dx * 3, 0.05, l.z + l.dz * 3), rq, new THREE.Vector3(1, 1, 1)); pm.setMatrixAt(i, m); });
        sc.add(pm);
      }
    }
    // trafik ışıkları: her kavşağın 4 köşesinde direk; renkler faza göre (x yönlü / z yönlü iki grup)
    {
      const n = (NB + 1) * (NB + 1) * 2;
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.5, roughness: 0.5 }), n * 2);
      const mkL = () => new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
      const lx = mkL(), lz = mkL();
      const m = new THREE.Matrix4(), qq = new THREE.Quaternion(); let pi = 0, ix = 0, iz = 0;
      for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) {
        const cx = rc(i), cz = rc(j), o = RW / 2 + 1.1;
        // x yönlü trafiğe bakan ışıklar (kavşağın batı/doğu girişlerinde)
        for (const [px, pz, grp] of [[cx - o, cz + o, 'x'], [cx + o, cz - o, 'x'], [cx - o, cz - o, 'z'], [cx + o, cz + o, 'z']]) {
          m.compose(new THREE.Vector3(px, 2.5, pz), qq, new THREE.Vector3(1, 1, 1)); pole.setMatrixAt(pi++, m);
          m.compose(new THREE.Vector3(px, 5.1, pz), qq, new THREE.Vector3(1, 1, 1));
          if (grp === 'x') lx.setMatrixAt(ix++, m); else lz.setMatrixAt(iz++, m);
        }
      }
      pole.count = pi; lx.count = ix; lz.count = iz;
      sc.add(pole); sc.add(lx); sc.add(lz);
      C.tl = { lx, lz };
    }
    // takip kırıcılar (iskele / konteyner yığını, sarı halka işaret)
    for (const b of C.map.breakers) {
      const grp = new THREE.Group(); grp.position.set(b.x, 0, b.z);
      const parts = [];
      if (b.tip === 'konteyner') {
        const cols = ['#b03a2e', '#1f618d', '#d4ac0d', '#196f3d'];
        for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 6), new THREE.MeshStandardMaterial({ color: cols[(b.id + k) % 4], roughness: 0.7, metalness: 0.3 })); m.position.set(0, 1.3 + k * 2.6, 0); m.castShadow = true; grp.add(m); parts.push(m); }
      } else {
        const mat = new THREE.MeshStandardMaterial({ color: '#b8b8b0', metalness: 0.7, roughness: 0.4 });
        for (let k = 0; k < 4; k++) for (const sx of [-1.4, 1.4]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.15), mat); m.position.set(sx, 1.5 + k * 3, 0); grp.add(m); parts.push(m); }
        for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 2.4), new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.9 })); m.position.set(0, 3 + k * 3, 0); grp.add(m); parts.push(m); }
      }
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.2, 32), new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; grp.add(ring);
      sc.add(grp); b.obj = grp; b.parts = parts; b.ring = ring;
    }
    // saklanma noktaları (yerde mavi daire) ve radarlar
    for (const h of C.map.hides) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(h.r - 0.6, h.r, 40), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(h.x, 0.25, h.z); sc.add(ring); h.ring = ring;
    }
    for (const rd of C.map.radars) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: '#333', emissive: new THREE.Color('#ff2e63'), emissiveIntensity: 1.5 }));
      m.position.set(rd.ax === 'x' ? rd.x : rd.x + RW / 2 + 1, 5, rd.ax === 'x' ? rd.z + RW / 2 + 1 : rd.z); sc.add(m);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), new THREE.MeshStandardMaterial({ color: '#222' })); pl.position.set(m.position.x, 2.5, m.position.z); sc.add(pl);
    }
    C.sun = sun; C.env = env;
    return sc;
  }

  // ───────── ARAÇLAR ─────────
  function mkCar(kind, vis, st) {
    const model = K.A3.make(vis);
    if (K.Q() >= 1) model.traverse(o => { if (o.isMesh && !(o.material && o.material.transparent)) o.castShadow = true; });
    C.scene.add(model);
    const L = model.userData.L || 4.4, W = model.userData.W || 1.9;
    return { kind, model, x: 0, z: 0, h: 0, v: 0, vy: 0, yaw: 0, steer: 0, L, W, st, mass: 1300, slip: 0, nitro: 0.6, hp: 100, gone: false, roll: 0, pitch: 0, spin: 0 };
  }
  function syncModel(c, dt) {
    const m = c.model;
    m.position.set(c.x, 0.02, c.z);
    m.rotation.y = c.h + (c.spin || 0);
    // gövde yatışı / eğilmesi
    c.roll = lerp(c.roll, clamp(-(c.yaw || 0) * Math.abs(c.v) * 0.004, -0.07, 0.07), Math.min(1, dt * 6));
    m.rotation.z = c.roll;
    const ud = m.userData;
    if (ud.wheels) for (const w of ud.wheels) { w.rotation.x += c.v * dt / 0.33; if (w.userData.front) w.rotation.y = c.steer * 0.45; }
    if (ud.brake) ud.brake.color.setRGB(c.braking ? 3 : 0.55, c.braking ? 0.1 : 0.04, c.braking ? 0.15 : 0.07);
  }
  function removeCar(c) { c.gone = true; C.scene.remove(c.model); K.A3.dispose(c.model); }
  const fwd = h => [Math.sin(h), Math.cos(h)];
  const rgt = h => [-Math.cos(h), Math.sin(h)];

  // ───────── OYUNCU FİZİĞİ (dünya koordinatı; yarıştaki lastik modelinin aynısı) ─────────
  function playerPhysics(c, dt) {
    const I = K.input, opt = K.opt, st = c.st, D = K.DYN;
    // direksiyon girişi
    let si = opt.tilt ? I.tilt : I.steer;
    si = Math.sign(si) * Math.pow(Math.abs(si), 1.35);
    const vr0 = clamp(Math.abs(c.v) / st.vmax, 0, 1);
    const back = Math.abs(si) < Math.abs(c.steer) || si * c.steer < 0;
    if (opt.steerMode === 'tus' && !opt.tilt && si && Math.abs(c.steer) < 0.4 && si * c.steer >= 0) c.steer = Math.sign(si) * 0.4;
    const sRate = opt.tilt ? 12 : back ? 12 : (opt.steerMode === 'tus' ? 5.5 : 8) - 2.5 * vr0;
    c.steer += clamp(si - c.steer, -sRate * dt, sRate * dt);
    const gas = (opt.autoGas && !I.brake) || I.gas || I.nitro || I.hb ? 1 : 0;
    let vmax = st.vmax;
    c.nitroOn = !!I.nitro && c.nitro > 0.01;
    if (c.nitroOn) { c.nitro = Math.max(0, c.nitro - dt / (3.5 + 1.5 * st.nitro)); vmax *= 1.2 + 0.06 * st.nitro; }
    c.nitroK = lerp(c.nitroK || 0, c.nitroOn ? 1 : 0, Math.min(1, dt * (c.nitroOn ? 6 : 2)));
    // vites (ses ve gösterge için)
    const v01 = Math.max(0, c.v) / vmax, tops = [0, 0.2, 0.36, 0.52, 0.68, 0.84, 1.02];
    let g = 1; while (g < 6 && v01 > tops[g]) g++;
    if (g !== c.gear) { if (g > (c.gear || 1)) K.SES.sfx('shift'); c.gear = g; }
    c.rpm = clamp(0.28 + (v01 - tops[g - 1]) / (tops[g] - tops[g - 1]) * 0.7, 0.2, 1);
    // ivme
    const vr = Math.max(0, c.v) / vmax;
    let acc = 0;
    if (gas && c.v < vmax) acc = st.acc * (1.2 - Math.pow(vr, 1.7) * 1.15) * (vr < 0.12 ? 1.25 : 1);
    if (c.nitroOn) acc = Math.max(acc, 0) + st.acc * (0.95 + 0.3 * st.nitro) * (1.1 - 0.5 * clamp(vr, 0, 1));
    if (c.v > vmax) acc = Math.min(acc, -(c.v - vmax) * (c.nitroK > 0.05 ? 0.25 : 0.8));
    c.braking = !!I.brake;
    if (I.brake) acc = c.v > 0.5 ? -15 * (C.wet ? 0.8 : 1) : -5;
    else if (!gas) acc -= 1.2 + c.v * 0.012;
    c.v += acc * dt;
    if (c.v < -9) c.v = -9;
    if (!gas && !I.brake && Math.abs(c.v) < 0.3) c.v = 0;
    // lastikler
    const hb = I.hb && Math.abs(c.v) > 10;
    const L = D.lf + D.lr, Iz = D.lf * D.lr * 1.1, asst = opt.assist, mu = st.grip * (C.wet ? 0.86 : 1) * GRAV * D.GX;
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) {
      const u = c.v, au = Math.abs(u), w = c.vy, rr = c.yaw, sg = u < 0 ? -1 : 1;
      const beta = Math.atan2(w, Math.max(au, 1));
      let delta = c.steer * 0.6 / (1 + au / 18);
      const bx = Math.sign(beta) * Math.max(0, Math.abs(beta) - 0.14);
      delta += clamp(bx, -0.6, 0.6) * (0.35 + 0.5 * asst) * sg;
      let du = 0, dw, dr;
      if (au < 3) { const rk = u * Math.tan(delta) / L; dr = (rk - rr) * 12; dw = -w * 8; }
      else {
        const lt = clamp(-acc / GRAV * 0.2, -0.16, 0.16);
        const Nf = D.lr / L + lt, Nr = D.lf / L - lt;
        let Df = mu * Nf * 1.02, Dr = mu * Nr * 1.08;
        if (hb) Dr *= 0.38; else if (gas && acc > 0) Dr *= 1 - clamp(acc / (mu * 2.2), 0, 0.18);
        const af = Math.atan2(w + D.lf * rr, au) - delta * sg, ar = Math.atan2(w - D.lr * rr, au);
        const Fyf = K.tire(af, Df), Fyr = K.tire(ar, Dr), cd = Math.cos(delta);
        dw = Fyf * cd + Fyr - rr * u;
        dr = (D.lf * Fyf * cd - D.lr * Fyr) / Iz;
        du = rr * w;
        dr += -rr * (hb ? 0.05 : 0.12) + bx * sg * (hb ? 0.5 : 1.6 + 3 * asst);
        const bm = hb ? 0.85 : 0.55, ab = Math.abs(beta);
        if (ab > bm) dr += Math.sign(beta) * sg * (ab - bm) * 18;
      }
      if (!hb && au > 3) { const al = Math.min(1, h * (2.2 + 1.5 * asst)); const V2 = Math.hypot(c.v, c.vy); c.vy -= c.vy * al; c.v = Math.sign(c.v || 1) * Math.sqrt(Math.max(0, V2 * V2 - c.vy * c.vy)); }
      const V0 = Math.hypot(c.v, c.vy);
      c.v += du * h; c.vy += dw * h; c.yaw += dr * h; c.yaw = clamp(c.yaw, -3.2, 3.2);
      if (au > 6 && Math.abs(beta) > 0.08) { const V1 = Math.hypot(c.v, c.vy), keep = gas ? 0.7 : 0.5; if (V1 < V0 && V1 > 0.1) { const f = (V0 - (V0 - V1) * (1 - keep)) / V1; c.v *= f; c.vy *= f; } }
      // dünya: sağa dönüş başlığı azaltır
      c.h -= c.yaw * h;
      const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h);
      c.x += (fx * c.v + rx * c.vy) * h; c.z += (fz * c.v + rz * c.vy) * h;
    }
    if (hb) c.v *= 1 - dt * 0.12;
    c.slip = -Math.atan2(c.vy, Math.max(Math.abs(c.v), 0.5));
    // drift puanı → nitro
    if (Math.abs(c.slip) > 0.14 && c.v > 11) { c.nitro = Math.min(1, c.nitro + dt * 0.11); C.stats.drift += c.v * Math.abs(c.slip) * dt * 20; }
    if (!c.nitroOn && c.v > st.vmax * 0.8) c.nitro = Math.min(1, c.nitro + dt * 0.012);
    C.stats.mesafe += Math.abs(c.v) * dt; C.stats.enHiz = Math.max(C.stats.enHiz, c.v * KMH);
  }
  // bina/sınır çarpışması: aracı 2 daireyle (ön/arka) temsil et, kutudan dışarı it
  function hitWorld(c, isPl) {
    const [fx, fz] = fwd(c.h), R0 = c.W * 0.55;
    let hit = 0;
    for (const s of [c.L * 0.3, -c.L * 0.3]) {
      const px = c.x + fx * s, pz = c.z + fz * s;
      nearBoxes(px, pz, _nb);
      for (const b of _nb) {
        const cx = clamp(px, b.x0, b.x1), cz = clamp(pz, b.z0, b.z1);
        let dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
        if (d >= R0) continue;
        if (d < 1e-4) { // merkez kutunun içinde: en yakın kenardan çık
          const e = [px - b.x0, b.x1 - px, pz - b.z0, b.z1 - pz], k = e.indexOf(Math.min(...e));
          dx = [-1, 1, 0, 0][k]; dz = [0, 0, -1, 1][k]; d = 0;
        } else { dx /= d; dz /= d; }
        const pen = R0 - d; c.x += dx * pen; c.z += dz * pen;
        hit = Math.max(hit, collideResponse(c, dx, dz, isPl));
      }
      // ağaçlar
      for (const t of C.map.trees) { const dx = px - t.x, dz = pz - t.z, d = Math.hypot(dx, dz); if (d < R0 + t.r && d > 1e-3) { const nx = dx / d, nz = dz / d; c.x += nx * (R0 + t.r - d); c.z += nz * (R0 + t.r - d); hit = Math.max(hit, collideResponse(c, nx, nz, isPl)); } }
    }
    // şehir sınırı (deniz dahil)
    const E = RW / 2 + 0.2 - c.W / 2;
    if (c.x < -E) { c.x = -E; hit = Math.max(hit, collideResponse(c, 1, 0, isPl)); }
    if (c.x > SIZE + E) { c.x = SIZE + E; hit = Math.max(hit, collideResponse(c, -1, 0, isPl)); }
    if (c.z < -E) { c.z = -E; hit = Math.max(hit, collideResponse(c, 0, 1, isPl)); }
    if (c.z > SIZE + E) { c.z = SIZE + E; hit = Math.max(hit, collideResponse(c, 0, -1, isPl)); }
    return hit;
  }
  // duvara çarpma: dünyadaki hızın duvara doğru bileşenini sil (oyuncuda kısmen sek), sürtünme
  function collideResponse(c, nx, nz, isPl) {
    const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h);
    let vx = fx * c.v + rx * (c.vy || 0), vz = fz * c.v + rz * (c.vy || 0);
    const vn = vx * nx + vz * nz;
    if (vn >= 0) return 0;
    const imp = -vn;
    vx -= vn * nx * (isPl ? 1.15 : 1.3); vz -= vn * nz * (isPl ? 1.15 : 1.3);
    const fr = 1 - Math.min(0.35, imp * 0.02); vx *= fr; vz *= fr;
    c.v = vx * fx + vz * fz; c.vy = vx * rx + vz * rz;
    if (isPl) {
      c.yaw *= 0.5;
      if (imp > 3) {
        C.stats.duvar++; C.shake = Math.min(1, C.shake + imp / 25); K.SES.sfx(imp > 10 ? 'crash' : 'scrape', Math.min(1, imp / 20)); vib(imp > 10 ? 60 : 25);
        if (G.EKSTRA && G.EKSTRA.dmg) try { G.EKSTRA.dmg(c, imp); } catch (e) { }
      }
    }
    return imp;
  }
  function vib(ms) { if (K.opt.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

  // araç–araç çarpışması (yönlü dikdörtgen, ayırma ekseni testi)
  function obb(c) { const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h); return { c, fx, fz, rx, rz, hl: c.L / 2, hw: c.W / 2 }; }
  function sat(A, B) {
    const dx = B.c.x - A.c.x, dz = B.c.z - A.c.z;
    let best = 1e9, nx = 0, nz = 0;
    for (const [ax, az] of [[A.fx, A.fz], [A.rx, A.rz], [B.fx, B.fz], [B.rx, B.rz]]) {
      const ra = A.hl * Math.abs(A.fx * ax + A.fz * az) + A.hw * Math.abs(A.rx * ax + A.rz * az);
      const rb = B.hl * Math.abs(B.fx * ax + B.fz * az) + B.hw * Math.abs(B.rx * ax + B.rz * az);
      const d = dx * ax + dz * az, o = ra + rb - Math.abs(d);
      if (o <= 0) return null;
      if (o < best) { best = o; const s = d < 0 ? -1 : 1; nx = ax * s; nz = az * s; }
    }
    return { o: best, nx, nz };
  }
  const worldV = c => { const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h); return [fx * c.v + rx * (c.vy || 0), fz * c.v + rz * (c.vy || 0)]; };
  const setWorldV = (c, vx, vz) => { const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h); c.v = vx * fx + vz * fz; c.vy = vx * rx + vz * rz; };
  function carCollisions() {
    const pl = C.player, all = [pl].concat(C.traffic, C.cops).filter(c => !c.gone);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (Math.abs(a.x - b.x) > 7 || Math.abs(a.z - b.z) > 7) continue;
      if (a !== pl && b !== pl && a.kind === 'traffic' && b.kind === 'traffic') { // trafik kendi arasında: sadece ayır, yavaşlat
        const r = sat(obb(a), obb(b)); if (!r) continue;
        a.x -= r.nx * r.o / 2; a.z -= r.nz * r.o / 2; b.x += r.nx * r.o / 2; b.z += r.nz * r.o / 2; a.v *= 0.9; b.v *= 0.9; continue;
      }
      const r = sat(obb(a), obb(b)); if (!r) continue;
      const ma = a.mass, mb = b.mass, ta = mb / (ma + mb), tb = ma / (ma + mb);
      const fixA = a.block, fixB = b.block;
      a.x -= r.nx * r.o * (fixB ? 1 : fixA ? 0 : ta); a.z -= r.nz * r.o * (fixB ? 1 : fixA ? 0 : ta);
      b.x += r.nx * r.o * (fixA ? 1 : fixB ? 0 : tb); b.z += r.nz * r.o * (fixA ? 1 : fixB ? 0 : tb);
      const [avx, avz] = worldV(a), [bvx, bvz] = worldV(b);
      const rel = (bvx - avx) * r.nx + (bvz - avz) * r.nz; // ayrılma hızı (negatif = yaklaşıyor)
      if (rel >= 0) continue;
      const e = 0.3, imp = -rel;
      const ia = fixA ? 0 : fixB ? 1 : ta, ib = fixB ? 0 : fixA ? 1 : tb;
      setWorldV(a, avx + r.nx * rel * (1 + e) * ia, avz + r.nz * rel * (1 + e) * ia);
      setWorldV(b, bvx - r.nx * rel * (1 + e) * ib, bvz - r.nz * rel * (1 + e) * ib);
      // dönme tekmesi
      a.yaw = (a.yaw || 0) + (Math.random() - 0.5) * imp * 0.05 * ia; b.yaw = (b.yaw || 0) + (Math.random() - 0.5) * imp * 0.05 * ib;
      const ot = a === pl ? b : b === pl ? a : null;
      if (ot) {
        if (imp > 3) { K.SES.sfx(imp > 9 ? 'crash' : 'bump', Math.min(1, imp / 18)); C.shake = Math.min(1, C.shake + imp / 30); vib(imp > 9 ? 50 : 20); }
        if (ot.kind === 'traffic' && imp > 6) { knock(ot, imp, pl); C.stats.carpma++; if (C.purs) C.purs.bounty += 40; else trafficWitness(); }
        if (ot.kind === 'cop' && !ot.disabled) {
          // hasarı çarpan taraf verir: polis sana çarparsa kendisi hurdaya dönmesin
          const [pvx, pvz] = worldV(pl), [ovx, ovz] = worldV(ot), sgn = a === pl ? 1 : -1;
          const pa = Math.max(0, (pvx * r.nx + pvz * r.nz) * sgn), pc = Math.max(0, -(ovx * r.nx + ovz * r.nz) * sgn);
          const share = pa + pc > 0.1 ? pa / (pa + pc) : 0.5;
          ot.hp -= imp * 4.5 * share; C.purs ? C.purs.bounty += 15 : null;
          if (!C.purs) startPursuit(1, 'Polise çarptın!');
          if (ot.hp <= 0) copDown(ot);
        }
      } else if ((a.kind === 'cop' && b.kind === 'traffic') || (b.kind === 'cop' && a.kind === 'traffic')) {
        const t = a.kind === 'traffic' ? a : b; if (imp > 8) knock(t, imp, a.kind === 'cop' ? a : b);
      }
    }
  }
  function knock(t, imp, by) { t.knock = 2.5; t.spinV = (Math.random() < 0.5 ? -1 : 1) * (1.5 + imp * 0.15); t.turn = null; }

  // ───────── TRAFİK ─────────
  // Şerit: eksen ('x': z sabit yol boyunca x'te gider), yol indeksi, yön (±1), şerit (0 iç, 1 dış). Sağdan akış.
  function lanePos(ax, line, dir, lane, p) {
    const off = LO[lane];
    return ax === 'x' ? [p, rc(line) + dir * off] : [rc(line) - dir * off, p];
  }
  const headOf = (ax, dir) => ax === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
  const TRAFFIC_VIS = () => (G.VERI && G.VERI.TRAFFIC) || [];
  function spawnTraffic(near) {
    const pl = C.player, V = TRAFFIC_VIS(); if (!V.length) return null;
    const ty = V[Math.floor(Math.random() * (Math.random() < 0.85 ? Math.min(4, V.length) : V.length))];
    const vis = { govde: ty.govde, model: ty.modeller ? ty.modeller[Math.floor(Math.random() * ty.modeller.length)] : null, renk: ty.renkler[Math.floor(Math.random() * ty.renkler.length)], basit: K.Q() === 0, desen: false };
    // oyuncudan 230–380 m uzakta (sisin içinde), rastgele bir yol parçası
    for (let tries = 0; tries < 30; tries++) {
      const ax = Math.random() < 0.5 ? 'x' : 'z', line = Math.floor(Math.random() * (NB + 1)), dir = Math.random() < 0.5 ? 1 : -1, lane = Math.random() < 0.6 ? 0 : 1;
      const seg = Math.floor(Math.random() * NB), p = rc(seg) + RW / 2 + 6 + Math.random() * (BLK - 12);
      const [x, z] = lanePos(ax, line, dir, lane, p);
      const d = Math.hypot(x - pl.x, z - pl.z);
      if (near ? (d < 60 || d > 300) : (d < 200 || d > 400)) continue;
      if (!near && d < 390 && los(x, z, pl.x, pl.z)) continue; // görüş içinde doğmasın (bina arkası ya da sisin ötesi)
      if (C.traffic.some(o => !o.gone && Math.hypot(o.x - x, o.z - z) < 12)) continue;
      const c = mkCar('traffic', vis, null);
      c.mass = ty.govde === 'kamyon' || ty.govde === 'otobus' ? 6000 : ty.govde === 'van' ? 2200 : 1300;
      Object.assign(c, { ax, line, dir, lane, p, x, z, h: headOf(ax, dir), vT: 9 + Math.random() * 5, v: 8 });
      C.traffic.push(c);
      return c;
    }
    return null;
  }
  // ışık fazı: 0 → x yönlü yeşil, 1 → sarı, 2 → z yönlü yeşil, 3 → sarı
  function lightState(ax) {
    const t = C.t % 22, ph = t < 9 ? 0 : t < 11 ? 1 : t < 20 ? 2 : 3;
    if (ax === 'x') return ph === 0 ? 'g' : ph === 1 ? 'y' : 'r';
    return ph === 2 ? 'g' : ph === 3 ? 'y' : 'r';
  }
  function bez(t, a, b, c) { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; }
  function trafficAI(c, dt) {
    if (c.knock > 0) { // çarpılmış: savrulur, durur
      c.knock -= dt; c.v *= 1 - dt * 1.4; c.vy = (c.vy || 0) * (1 - dt * 2); c.h += (c.spinV || 0) * dt; c.spinV *= 1 - dt * 1.2;
      const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h); c.x += (fx * c.v + rx * c.vy) * dt; c.z += (fz * c.v + rz * c.vy) * dt;
      hitWorld(c, false);
      if (c.knock <= 0) c.wreck = true;
      return;
    }
    if (c.wreck) { c.v = 0; return; } // kenarda kalır, uzaklaşınca silinir
    // öndeki araca göre hız
    let vT = c.vT;
    const [fx, fz] = fwd(c.h);
    for (const o of [C.player].concat(C.traffic, C.cops)) {
      if (o === c || o.gone) continue;
      const dx = o.x - c.x, dz = o.z - c.z, along = dx * fx + dz * fz;
      if (along <= 0 || along > 22) continue;
      const lat = Math.abs(dx * fz - dz * fx);
      if (lat < 2.4) vT = Math.min(vT, Math.max(0, (along - 7) * 0.8));
    }
    if (c.turn) {
      const T = c.turn; T.t += c.v * dt / T.len;
      if (T.t >= 1) { Object.assign(c, { ax: T.ax, line: T.line, dir: T.dir, p: T.p }); c.turn = null; }
      else { const [x, z] = bez(T.t, T.a, T.b, T.c), [x2, z2] = bez(Math.min(1, T.t + 0.02), T.a, T.b, T.c); c.x = x; c.z = z; c.h = Math.atan2(x2 - x, z2 - z); vT = Math.min(vT, 8); }
    }
    if (!c.turn) {
      // sonraki kavşak
      const k = c.dir > 0 ? Math.floor((c.p + RW / 2 - 0.01) / P) + 1 : Math.ceil((c.p - RW / 2 + 0.01) / P) - 1;
      const stopP = rc(k) - c.dir * (RW / 2 + 3.5), dist = (stopP - c.p) * c.dir;
      if (dist < 25 && dist > 0 && !c.dec) {
        // karar ver: düz / sağ / sol (harita içinde kalan)
        const opts = [];
        if (k + c.dir >= 0 && k + c.dir <= NB) opts.push('duz', 'duz');
        const other = c.ax === 'x' ? 'z' : 'x';
        for (const d2 of [1, -1]) { const ln = c.line; if (ln + d2 >= 0 && ln + d2 <= NB) opts.push(d2); }
        c.dec = opts[Math.floor(Math.random() * opts.length)] || 'duz'; c.decK = k; c.decOther = other;
        if (c.dec !== 'duz' && k + c.dir >= 0 && k + c.dir <= NB && Math.random() < 0.3) c.dec = 'duz';
      }
      // kırmızı ışıkta dur
      if (dist > 0 && dist < 30 && c.dec && lightState(c.ax) !== 'g' && !(lightState(c.ax) === 'y' && dist < 8)) vT = Math.min(vT, Math.max(0, dist - 1) * 0.6);
      if (dist <= 0.5 && c.dec) {
        if (c.dec === 'duz') { c.dec = null; c.p += c.dir * 1; }
        else { // dönüş yayı
          const d2 = c.dec, k2 = c.decK, other = c.decOther, lane = c.lane;
          const a = [c.x, c.z];
          let end, ctrl;
          if (c.ax === 'x') { const ex = rc(k2) - d2 * LO[lane], ez = rc(c.line) + d2 * (RW / 2 + 0.5); end = [ex, ez]; ctrl = [ex, c.z]; }
          else { const ex = rc(c.line) + d2 * (RW / 2 + 0.5), ez = rc(k2) + d2 * LO[lane]; end = [ex, ez]; ctrl = [c.x, ez]; }
          const len = Math.hypot(ctrl[0] - a[0], ctrl[1] - a[1]) + Math.hypot(end[0] - ctrl[0], end[1] - ctrl[1]);
          c.turn = { t: 0, a, b: ctrl, c: end, len: Math.max(4, len * 0.85), ax: other, line: k2, dir: d2, p: other === 'x' ? end[0] : end[1] };
          c.dec = null;
        }
      }
    }
    const sp = c.v; c.v = sp + clamp(vT - sp, -9 * dt, 3 * dt);
    c.braking = vT < sp - 0.5;
    if (!c.turn) {
      c.p += c.dir * c.v * dt;
      // şeride yumuşakça otur
      const [tx, tz] = lanePos(c.ax, c.line, c.dir, c.lane, c.p);
      c.x = lerp(c.x, tx, Math.min(1, dt * 4)); c.z = lerp(c.z, tz, Math.min(1, dt * 4));
      const th = headOf(c.ax, c.dir); c.h += wrapA(th - c.h) * Math.min(1, dt * 6);
      // harita dışına çıktıysa (kenar yolun sonu) dön
      if ((c.ax === 'x' ? c.p : c.p) < -RW / 2 + 1 || c.p > SIZE + RW / 2 - 1) { c.dir *= -1; c.h = headOf(c.ax, c.dir); }
    }
  }
  function trafficManage() {
    const pl = C.player, want = Math.round((K.Q() === 0 ? 14 : 24) * (K.opt.traffic == null ? 1 : K.opt.traffic));
    for (const c of C.traffic) if (!c.gone && Math.hypot(c.x - pl.x, c.z - pl.z) > 420) removeCar(c);
    C.traffic = C.traffic.filter(c => !c.gone);
    let n = 0; while (C.traffic.length < want && n++ < 3) spawnTraffic(false);
  }
  function trafficWitness() { // trafiğe çarpmayı yakındaki polis görürse takip başlar
    for (const c of C.cops) if (!c.disabled && Math.hypot(c.x - C.player.x, c.z - C.player.z) < 80 && los(c.x, c.z, C.player.x, C.player.z)) { startPursuit(1, 'Kaza yaptın, polis gördü!'); return; }
  }

  // ───────── POLİS ─────────
  function spawnCop(type, x, z, h, state) {
    const V = G.VERI, ct = V.COPS[type] || V.COPS.devriye;
    const vis = { govde: ct.govde, model: ct.model, renk: type === 'onleyici' ? '#14141c' : type === 'ozel' ? '#1c2230' : '#f5f6fa', basit: K.Q() === 0, desen: false, kaplama: { r: 0.3, m: 0.5 }, polis: true };
    const c = mkCar('cop', vis, null);
    Object.assign(c, { x, z, h, copType: type, hp: ct.can || 100, maxHp: ct.can || 100, mass: ct.kg || 1600, state: state || 'devriye', v: 0, vmax: C.player.st.vmax * (type === 'onleyici' ? 1.03 : 0.97), wp: null, seenT: 0 });
    C.cops.push(c);
    return c;
  }
  function spawnPatrols() {
    for (let k = 0; k < 4; k++) {
      const ax = k % 2 ? 'x' : 'z', line = 1 + Math.floor(Math.random() * (NB - 1)), dir = Math.random() < 0.5 ? 1 : -1, lane = 0;
      const p = rc(1 + Math.floor(Math.random() * (NB - 2))) + P / 2;
      const [x, z] = lanePos(ax, line, dir, lane, p);
      if (Math.hypot(x - C.player.x, z - C.player.z) < 120 || los(x, z, C.player.x, C.player.z)) continue;
      const c = spawnCop('devriye', x, z, headOf(ax, dir), 'devriye');
      Object.assign(c, { ax, line, dir, lane, p, vT: 10 });
    }
  }
  // en yakın kavşak düğümü
  const node = (x, z) => [clamp(Math.round(x / P), 0, NB), clamp(Math.round(z / P), 0, NB)];
  // ızgarada kovalamaca rotası: (i,j) → hedef düğüme doğru bir sonraki düğüm (Manhattan, binaları dolaşır)
  function nextNode(ci, cj, ti, tj) {
    if (ci === ti && cj === tj) return [ti, tj];
    const dx = ti - ci, dz = tj - cj;
    if (Math.abs(dx) >= Math.abs(dz)) return [ci + Math.sign(dx), cj];
    return [ci, cj + Math.sign(dz)];
  }
  function copAI(c, dt) {
    const pl = C.player, p = C.purs;
    if (c.disabled) { c.v *= 1 - dt * 1.5; c.h += (c.spinV || 0) * dt; c.spinV *= 1 - dt; const [fx, fz] = fwd(c.h); c.x += fx * c.v * dt; c.z += fz * c.v * dt; return; }
    if (c.block) { c.v = 0; return; }
    if (c.state === 'devriye') { trafficAI(c, dt); detectPlayer(c); return; }
    // hedef noktası
    let tx, tz, vT = c.vmax;
    const dpl = Math.hypot(pl.x - c.x, pl.z - c.z);
    const see = dpl < 260 && los(c.x, c.z, pl.x, pl.z);
    if (see) { c.lastX = pl.x; c.lastZ = pl.z; if (p) { p.lx = pl.x; p.lz = pl.z; p.seenAt = C.t; } }
    else if (p && p.mode === 'takip' && p.lx != null) { c.lastX = p.lx; c.lastZ = p.lz; } // telsiz: bir polis görünce hepsi bilir
    // takılma kurtarma: binaya gömülüp kaldıysa geri vitese tak, yeniden rota çiz
    if (c.rev > 0) {
      c.rev -= dt; c.v = Math.max(-7, c.v - 20 * dt); c.h += (c.revS || 1) * 1.2 * dt;
      const [fx, fz] = fwd(c.h); c.x += fx * c.v * dt; c.z += fz * c.v * dt; hitWorld(c, false); c.braking = false; return;
    }
    if (Math.abs(c.v) < 2 && dpl > 14) c.stuckT = (c.stuckT || 0) + dt; else c.stuckT = 0;
    if (c.stuckT > 1.2) { c.rev = 1.1; c.revS = Math.random() < 0.5 ? -1 : 1; c.stuckT = 0; c.wp = null; return; }
    // düz çizgiyle dalmak için yol bina köşelerinden geniş açık olmalı; değilse sokaktan dolaş
    const wide = see && (dpl < 25 || los(c.x, c.z, pl.x, pl.z, 2.2));
    if (c.state === 'takip' && wide) {
      const [pvx, pvz] = worldV(pl), lead = clamp(dpl / 40, 0, 1.2);
      tx = pl.x + pvx * lead; tz = pl.z + pvz * lead;
      if (dpl < 30) vT = Math.abs(pl.v) < 6 ? Math.max(0, (dpl - 6) * 1.2) : Math.max(Math.abs(pl.v) + 6, 12); // yakında: hızlıysan çarp, durduysan yanına yanaş ve sıkıştır
    } else {
      // sokak sokak: son görülen yere ızgara üzerinden git
      const gx = c.state === 'ara' && c.lastX == null ? c.x : (c.lastX != null ? c.lastX : pl.x), gz = c.lastZ != null ? c.lastZ : pl.z;
      const [ci, cj] = node(c.x, c.z), [ti, tj] = node(gx, gz);
      const nearNode = Math.hypot(rc(ci) - c.x, rc(cj) - c.z) < 14;
      if (!c.wp || Math.hypot(rc(c.wp[0]) - c.x, rc(c.wp[1]) - c.z) < 16) c.wp = nearNode || (c.wp && Math.hypot(rc(c.wp[0]) - c.x, rc(c.wp[1]) - c.z) < 16) ? nextNode(c.wp ? c.wp[0] : ci, c.wp ? c.wp[1] : cj, ti, tj) : [ci, cj];
      tx = rc(c.wp[0]); tz = rc(c.wp[1]);
      if (c.wp[0] === ti && c.wp[1] === tj && Math.hypot(gx - c.x, gz - c.z) < 30) { tx = gx; tz = gz; if (c.state === 'ara' && Math.hypot(gx - c.x, gz - c.z) < 12) { c.lastX = rc(Math.floor(Math.random() * (NB + 1))); c.lastZ = rc(Math.floor(Math.random() * (NB + 1))); } }
      if (c.state === 'ara') vT = c.vmax * 0.55;
    }
    // yönelme
    const want = Math.atan2(tx - c.x, tz - c.z), dh = wrapA(want - c.h);
    const maxYaw = clamp(1.25 * GRAV * 1.7 / Math.max(6, c.v), 0.6, 3);
    c.yaw = clamp(-dh * 3, -maxYaw, maxYaw); // sağ + (başlık azalır)
    c.h -= c.yaw * dt;
    c.steer = clamp(-dh * 2, -1, 1);
    vT *= 1 - Math.min(0.55, Math.abs(dh) / 2.2);
    const acc = c.v < vT ? 9 : -14;
    c.v = c.v + clamp(vT - c.v, -14 * dt, Math.abs(acc) * dt);
    c.braking = c.v > vT + 1;
    c.vy = (c.vy || 0) * (1 - dt * 6);
    const [fx, fz] = fwd(c.h), [rx, rz] = rgt(c.h);
    c.x += (fx * c.v + rx * c.vy) * dt; c.z += (fz * c.v + rz * c.vy) * dt;
    hitWorld(c, false);
    // ara modunda oyuncuyu görürse takip
    if (c.state === 'ara' && see && dpl < 70 && p && p.mode === 'sogu') resumePursuit();
  }
  function detectPlayer(c) {
    const pl = C.player, d = Math.hypot(pl.x - c.x, pl.z - c.z);
    if (C.purs || d > 75) return;
    if (Math.abs(pl.v) * KMH > 115 && los(c.x, c.z, pl.x, pl.z)) startPursuit(1, 'Hız yaptın, devriye gördü!');
  }
  function copDown(c) {
    if (c.disabled) return;
    c.disabled = true; c.spinV = (Math.random() < 0.5 ? -1 : 1) * 3; c.v *= 0.5;
    C.stats.etkisiz++; if (G.onStat) G.onStat('polis', 1);
    if (C.purs) { C.purs.bounty += 100 * C.purs.heat; C.purs.heatT += 6; }
    popup('POLİS DEVRE DIŞI', '+' + (100 * (C.purs ? C.purs.heat : 1)) + ' ÜN', 1.2, 'iyi');
    K.SES.sfx('boom'); vib(40);
    C.player.nitro = Math.min(1, C.player.nitro + 0.2);
  }
  // ───────── KOVALAMACA ─────────
  function startPursuit(heat, why) {
    if (C.purs) return;
    C.purs = { heat, time: 0, bounty: 0, bust: 0, evade: 0, mode: 'takip', cool: 0, heatT: 0, spawnT: 3, blockT: 18, grace: 2.5 };
    for (const c of C.cops) if (!c.disabled && !c.block) { c.state = 'takip'; c.turn = null; c.vmax = C.player.st.vmax * (c.copType === 'onleyici' ? 1.03 : 0.97); }
    popup('POLİS!', why || 'Takip başladı', 1.6, 'kotu');
    K.SES.music('kovala'); K.SES.sfx('heat');
    $('hud-purs').style.display = 'block';
  }
  function resumePursuit() {
    const p = C.purs; p.mode = 'takip'; p.cool = 0; p.evade = 0;
    for (const c of C.cops) if (!c.disabled && !c.block) c.state = 'takip';
    popup('SENİ GÖRDÜLER!', '', 1.4, 'kotu'); K.SES.sfx('heat');
  }
  function pursuitLogic(dt) {
    const p = C.purs, pl = C.player, H = G.VERI.HEAT[p.heat];
    if (G.onPursTime && Math.floor(p.time) !== Math.floor(p.time + dt)) G.onPursTime(p.time + dt);
    p.time += dt;
    const active = C.cops.filter(c => !c.disabled && !c.block);
    if (p.mode === 'takip') {
      p.bounty += dt * H.un; p.heatT += dt;
      if (p.heatT > 35 + p.heat * 15 && p.heat < 5) { p.heat++; p.heatT = 0; C.stats.maxIsi = Math.max(C.stats.maxIsi, p.heat); popup('ARANMA ' + '★'.repeat(p.heat), '', 1.5, 'kotu'); K.SES.sfx('heat'); }
      // takviye: görüş dışında, 150–260 m uzakta bir kavşaktan
      p.spawnT -= dt;
      if (p.spawnT < 0 && p.evade < 0.3 && active.length < H.max + 1) {
        p.spawnT = 5 + Math.random() * 5;
        for (let t = 0; t < 12; t++) {
          const i = clamp(Math.round(pl.x / P) + Math.floor(Math.random() * 5) - 2, 0, NB), j = clamp(Math.round(pl.z / P) + Math.floor(Math.random() * 5) - 2, 0, NB);
          const x = rc(i), z = rc(j), d = Math.hypot(x - pl.x, z - pl.z);
          if (d < 130 || d > 280 || los(x, z, pl.x, pl.z)) continue;
          const type = H.birim[Math.floor(Math.random() * H.birim.length)];
          spawnCop(type, x, z, Math.atan2(pl.x - x, pl.z - z), 'takip');
          break;
        }
      }
      // barikat: oyuncunun gittiği yönde ilerideki kavşağı kapat
      p.blockT -= dt;
      if (H.barikat && p.blockT < 0) { p.blockT = 24 + Math.random() * 14; if (Math.random() < H.barikat) roadblock(); }
      if (H.heli && !p.heli) makeHeli();
      // yakalanma
      let near = false;
      for (const c of active) if (Math.hypot(c.x - pl.x, c.z - pl.z) < 11) near = true;
      if (p.grace > 0) p.grace -= dt;
      if (near && Math.abs(pl.v) < 5.5 && p.grace <= 0) p.bust = Math.min(1, p.bust + dt / 2.6); else p.bust = Math.max(0, p.bust - dt / (Math.abs(pl.v) < 5.5 ? 3 : 1.2));
      if (p.bust >= 1) { busted(); return; }
      // kaçış: hiçbir polis görmüyorsa (bina arkası / uzak)
      let seen = false;
      for (const c of active) { const d = Math.hypot(c.x - pl.x, c.z - pl.z); if (d < 220 && (d < 25 || los(c.x, c.z, pl.x, pl.z))) { seen = true; break; } }
      if (p.heli && !p.heli.leave) seen = seen || Math.random() < 0.5;
      if (!seen) p.evade = Math.min(1, p.evade + dt / (6 + p.heat * 1.5));
      else p.evade = Math.max(0, p.evade - dt * 0.4);
      if (p.evade >= 1) {
        p.mode = 'sogu'; p.cool = 0; p.evade = 0;
        popup('İZİNİ KAYBETTİRDİN', 'Gizlen... arama sürüyor', 1.8, 'iyi');
        for (const c of active) { c.state = 'ara'; }
        if (p.heli) p.heli.leave = true;
      }
    } else if (p.mode === 'sogu') {
      const hide = C.map.hides.find(h => Math.hypot(h.x - pl.x, h.z - pl.z) < h.r);
      const coolNeed = 12 + p.heat * 3;
      p.cool += dt * (hide ? 2.5 : 1) * (Math.abs(pl.v) < 3 ? 1.3 : 1);
      p.hide = !!hide;
      for (const c of active) { const d = Math.hypot(c.x - pl.x, c.z - pl.z); if (d < 55 && los(c.x, c.z, pl.x, pl.z)) { resumePursuit(); break; } }
      if (p.mode === 'sogu' && p.cool >= coolNeed) escaped();
    }
    // uzaklaşan, geride kalan polisleri temizle
    for (const c of C.cops) if (!c.gone && Math.hypot(c.x - pl.x, c.z - pl.z) > 520) removeCar(c);
    C.cops = C.cops.filter(c => !c.gone);
  }
  function roadblock() {
    const pl = C.player, [fx, fz] = fwd(pl.h);
    // ileride, oyuncunun yönündeki 2. kavşak
    const ax = Math.abs(fx) > Math.abs(fz) ? 'x' : 'z';
    const i = Math.round(pl.x / P), j = Math.round(pl.z / P);
    const ni = ax === 'x' ? clamp(i + Math.sign(fx) * 2, 0, NB) : clamp(Math.round(pl.x / P), 0, NB), nj = ax === 'z' ? clamp(j + Math.sign(fz) * 2, 0, NB) : clamp(Math.round(pl.z / P), 0, NB);
    const cx = rc(ni) - (ax === 'x' ? Math.sign(fx) * (RW / 2 + 4) : 0), cz = rc(nj) - (ax === 'z' ? Math.sign(fz) * (RW / 2 + 4) : 0);
    if (Math.hypot(cx - pl.x, cz - pl.z) < 120 || los(cx, cz, pl.x, pl.z) && Math.hypot(cx - pl.x, cz - pl.z) < 200) return;
    const gap = Math.floor(Math.random() * 4);
    for (let k = 0; k < 4; k++) {
      if (k === gap) continue;
      const o = -RW / 2 + (k + 0.5) * RW / 4;
      const x = ax === 'x' ? cx : cx + o, z = ax === 'z' ? cz : cz + o;
      const c = spawnCop(Math.random() < 0.5 ? 'devriye' : 'ozel', x, z, (ax === 'x' ? 0 : Math.PI / 2) + (k % 2 ? 0.3 : -0.3), 'barikat');
      c.block = true; c.mass = 9000;
    }
    popup('İLERİDE BARİKAT!', 'Boşluğu bul', 1.6, 'kotu'); K.SES.sfx('radio');
  }
  function makeHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshStandardMaterial({ color: '#1a2230', metalness: 0.6, roughness: 0.4 })); body.scale.set(1, 0.8, 2); g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 4), body.material); tail.position.z = -3.6; g.add(tail);
    const rot = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: '#111' })); rot.position.y = 1.2; g.add(rot);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 40, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = -20; g.add(beam);
    C.scene.add(g); C.purs.heli = { g, rot, x: C.player.x - 120, z: C.player.z - 120, leave: false };
    popup('HELİKOPTER!', '', 1.4, 'kotu'); K.SES.sfx('heli');
  }
  function heliStep(dt) {
    const p = C.purs, hl = p && p.heli; if (!hl) return;
    const pl = C.player;
    const tx = hl.leave ? hl.x + (hl.x - pl.x) : pl.x, tz = hl.leave ? hl.z + (hl.z - pl.z) : pl.z;
    hl.x = lerp(hl.x, tx, Math.min(1, dt * (hl.leave ? 0.3 : 0.6))); hl.z = lerp(hl.z, tz, Math.min(1, dt * (hl.leave ? 0.3 : 0.6)));
    hl.g.position.set(hl.x, 42, hl.z); hl.rot.rotation.y += dt * 30;
    if (hl.leave && Math.hypot(hl.x - pl.x, hl.z - pl.z) > 400) { C.scene.remove(hl.g); p.heli = null; }
  }
  function busted() {
    const p = C.purs; K.SES.sfx('busted'); popup('YAKALANDIN!', '', 2.2, 'kotu');
    endPursuit(false);
  }
  function escaped() {
    const p = C.purs;
    popup('KAÇTIN!', '+' + Math.round(p.bounty) + ' ÜN', 2, 'iyi'); K.SES.sfx('escape');
    C.stats.kacis = Math.max(C.stats.kacis, p.heat);
    if (G.onStat) G.onStat('kacis', p.heat);
    endPursuit(true);
  }
  function endPursuit(ok) {
    const p = C.purs; if (!p) return;
    const res = { ok, bounty: Math.round(p.bounty), heat: p.heat, time: p.time, etkisiz: C.stats.etkisiz };
    if (p.heli) { C.scene.remove(p.heli.g); }
    for (const c of C.cops) removeCar(c);
    C.cops = []; C.purs = null;
    $('hud-purs').style.display = 'none';
    K.SES.siren(0); K.SES.music('yaris');
    if (!ok) { C.player.v = 0; C.player.vy = 0; C.player.yaw = 0; }
    setTimeout(() => { if (C) spawnPatrols(); }, 8000);
    if (G.onFreePursuit) G.onFreePursuit(res);
  }

  // ───────── TAKİP KIRICI, SAKLANMA, RADAR ─────────
  function specials(dt) {
    const pl = C.player, spd = Math.abs(pl.v);
    for (const b of C.map.breakers) {
      if (b.debris) { // devrilen parçalar
        for (const d of b.debris) { if (d.y <= 0.3 && d.vy < 0) { d.vy = 0; d.vx *= 0.9; d.vz *= 0.9; d.av *= 0.9; } else d.vy -= 18 * dt; d.m.position.x += d.vx * dt; d.m.position.y = d.y = Math.max(0.3, d.y + d.vy * dt); d.m.position.z += d.vz * dt; d.m.rotation.x += d.av * dt; d.m.rotation.z += d.av * 0.6 * dt; }
        continue;
      }
      if (!b.up) continue;
      b.ring.material.opacity = C.purs ? 0.45 + Math.sin(C.t * 6) * 0.3 : 0.25;
      if (C.purs && spd > 15 && Math.hypot(pl.x - b.x, pl.z - b.z) < 7) {
        b.up = false; b.ring.visible = false;
        b.debris = b.parts.map(m => ({ m, y: m.position.y, vx: (Math.random() - 0.5) * 8 - b.sx * 6, vy: 4 + Math.random() * 6, vz: (Math.random() - 0.5) * 8 - b.sz * 6, av: (Math.random() - 0.5) * 6 }));
        let n = 0;
        for (const c of C.cops) if (!c.disabled && !c.block && Math.hypot(c.x - b.x, c.z - b.z) < 34) { copDown(c); n++; }
        C.shake = 1; K.SES.sfx('breaker'); vib(120);
        C.stats.engel++; if (G.onStat) G.onStat('engel', 1);
        popup('TAKİP KIRICI!', n ? n + ' polis devre dışı' : 'Kaçamadılar mı?', 1.8, 'iyi');
        if (C.purs) C.purs.evade = Math.min(1, C.purs.evade + 0.35);
      }
    }
    for (const h of C.map.hides) h.ring.material.opacity = C.purs && C.purs.mode === 'sogu' ? 0.5 + Math.sin(C.t * 4) * 0.25 : 0.18;
    // radar: önünden geçerken hız ölçülür
    for (const rd of C.map.radars) {
      const along = rd.ax === 'x' ? pl.x - rd.x : pl.z - rd.z, lat = rd.ax === 'x' ? Math.abs(pl.z - rd.z) : Math.abs(pl.x - rd.x);
      const side = Math.sign(along);
      if (lat < RW / 2 && rd.side != null && side !== rd.side && Math.abs(along) < 6) {
        const kmh = Math.round(spd * KMH), best = (C.rec.radar[rd.id] || 0);
        K.SES.sfx('cam');
        if (kmh > best) { C.rec.radar[rd.id] = kmh; popup('RADAR ' + kmh + ' km/s', 'YENİ REKOR!', 1.6, 'iyi'); C.stats.un += Math.round(kmh * 2); }
        else popup('RADAR ' + kmh + ' km/s', 'rekor ' + best, 1.2);
        if (kmh > 160 && !C.purs) for (const c of C.cops) if (c.state === 'devriye' && Math.hypot(c.x - pl.x, c.z - pl.z) < 200) { startPursuit(1, 'Radara yakalandın!'); break; }
      }
      rd.side = side;
    }
  }

  // ───────── KAMERA ─────────
  const cam = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, h: 0, fov: 56, mode: 0 };
  function camStep(dt, snap) {
    const pl = C.player, camera = K.camera;
    const velH = Math.hypot(pl.v, pl.vy) > 3 ? pl.h - Math.atan2(pl.vy || 0, Math.max(Math.abs(pl.v), 0.5)) * 0.55 : pl.h; // gidiş yönüne doğru (driftte araba yan görünür)
    const want = pl.v < -2 ? pl.h + Math.PI : velH;
    cam.h = snap ? want : cam.h + wrapA(want - cam.h) * Math.min(1, dt * 5);
    const dist = cam.mode === 1 ? 8 : 5.6, hgt = cam.mode === 1 ? 2.7 : 1.75;
    const [fx, fz] = fwd(cam.h);
    // binaya girmesin: arkaya doğru boş mesafeyi bul
    let dd = dist;
    for (let s = 1; s <= dist; s += 0.5) if (inBox(pl.x - fx * s, pl.z - fz * s, 0.4)) { dd = Math.max(1.5, s - 0.6); break; }
    const tx = pl.x - fx * dd, tz = pl.z - fz * dd, ty = hgt + (dd < dist ? (dist - dd) * 0.25 : 0);
    const k = snap ? 1 : 1 - Math.pow(0.0006, dt);
    cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k); cam.z = lerp(cam.z, tz, k);
    cam.lx = pl.x + fx * 7; cam.ly = 0.9; cam.lz = pl.z + fz * 7;
    let sx = 0, sy = 0;
    if (C.shake > 0) { sx = (Math.random() - 0.5) * C.shake * 0.5 * K.opt.shake; sy = (Math.random() - 0.5) * C.shake * 0.35 * K.opt.shake; C.shake = Math.max(0, C.shake - dt * 2.2); }
    if (pl.nitroOn) { sx += (Math.random() - 0.5) * 0.05; sy += (Math.random() - 0.5) * 0.05; }
    camera.position.set(cam.x + sx, cam.y + sy, cam.z);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
    const vr = Math.max(0, pl.v) / 90;
    const fovT = 55 + vr * 13 + (pl.nitroOn ? 6 : 0) - (C.odakT > 0 ? 5 : 0);
    cam.fov = lerp(cam.fov, fovT, Math.min(1, dt * 3));
    if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  }

  // ───────── GÖSTERGE ─────────
  const $ = id => document.getElementById(id);
  function popup(big, small, dur, cls) {
    const el = $('hud-pops'); if (!el) return;
    const d = document.createElement('div');
    d.className = 'pop ' + (cls || '');
    d.innerHTML = `<b>${big}</b>${small ? '<small>' + small + '</small>' : ''}`;
    el.appendChild(d);
    while (el.children.length > 3) el.removeChild(el.firstChild);
    setTimeout(() => d.classList.add('out'), (dur || 1.2) * 1000);
    setTimeout(() => d.remove(), (dur || 1.2) * 1000 + 400);
  }
  function buildHud() {
    const opt = K.opt, hud = $('hud');
    hud.innerHTML = `
      <div id="hud-top">
        <div class="hbox"><small>ÜN</small><b id="h-un">0</b></div>
        <div class="hbox"><small>YOL</small><b id="h-km">0.0</b></div>
      </div>
      <canvas id="hud-map" width="150" height="150"></canvas>
      <div id="hud-goal"></div>
      <div id="hud-purs" style="display:none">
        <div id="h-heat">★</div>
        <div class="pbar"><i id="h-bust"></i><span>YAKALANMA</span></div>
        <div class="pbar ev"><i id="h-evade"></i><span id="h-evl">KAÇIŞ</span></div>
        <div id="h-purinfo"></div>
      </div>
      <div id="hud-pops"></div>
      <div id="hud-speedo">
        <svg viewBox="0 0 120 120" id="h-rpm"><circle cx="60" cy="60" r="52" class="rbg"/><circle cx="60" cy="60" r="52" class="rfg" id="h-rpmarc"/></svg>
        <div id="h-spd">0</div><small>${opt.mph ? 'mil/s' : 'km/s'}</small><div id="h-gear">1</div>
        <div class="bar nitro"><i id="h-nit"></i></div>
        <div class="bar odak"><i id="h-odak"></i></div>
      </div>
      <div id="hud-ctl">
        <div id="c-steer" class="${opt.tilt ? 'tilt' : ''}"><span class="l">◀</span><span class="r">▶</span><em>${opt.tilt ? 'EĞ' : opt.steerMode === 'tus' ? 'BAS' : 'KAYDIR'}</em></div>
        <div class="cb" id="c-odak">⏱ ODAK</div>
        <div id="c-right">
          <div class="cb" id="c-nitro">🔥 NİTRO<small>gaz dahil</small></div>
          <div class="cb" id="c-brake">FREN</div>
          <div class="cb" id="c-hb">DRİFT<small>el freni</small></div>
          <div class="cb big" id="c-gas">${opt.autoGas ? 'OTO' : 'GAZ'}</div>
        </div>
      </div>
      <div id="hud-btns"><div class="hb" id="c-pause">❚❚</div><div class="hb" id="c-cam">🎥</div></div>
      <div id="hud-vign"></div>`;
    K.bindControls();
    $('hud-goal').textContent = '🎯 Şehirde dolaş · 115 km/s üstünde devriyenin önünden geçersen kovalamaca başlar';
    setTimeout(() => { const g = $('hud-goal'); if (g) g.textContent = ''; }, 9000);
    C.hud = { spd: $('h-spd'), gear: $('h-gear'), nit: $('h-nit'), odak: $('h-odak'), rpm: $('h-rpmarc'), heat: $('h-heat'), bust: $('h-bust'), evade: $('h-evade'), evl: $('h-evl'), pinfo: $('h-purinfo'), vign: $('hud-vign'), un: $('h-un'), km: $('h-km'), map: $('hud-map').getContext('2d') };
    C.hudT = 0;
  }
  function hudStep(dt) {
    const e = C.hud, pl = C.player, opt = K.opt;
    const kmh = Math.round(Math.abs(pl.v) * KMH);
    e.spd.textContent = opt.mph ? Math.round(kmh * 0.6214) : kmh;
    e.gear.textContent = pl.v < -0.5 ? 'G' : (pl.gear || 1);
    e.nit.style.width = (pl.nitro * 100) + '%'; e.nit.parentNode.classList.toggle('on', !!pl.nitroOn);
    e.odak.style.width = (C.odak * 100) + '%';
    e.rpm.style.strokeDashoffset = (327 * (1 - clamp(pl.rpm || 0, 0, 1.05) * 0.75)).toFixed(1);
    C.hudT -= dt;
    if (C.hudT > 0) return;
    C.hudT = 0.12;
    const p = C.purs;
    e.un.textContent = Math.round(C.stats.un + (p ? p.bounty : 0)).toLocaleString('tr-TR');
    e.km.textContent = (C.stats.mesafe / 1000).toFixed(1);
    if (p) {
      K.setH(e.heat, '★'.repeat(p.heat) + '<span style="opacity:.3">' + '★'.repeat(5 - p.heat) + '</span>');
      e.bust.style.width = (p.bust * 100) + '%';
      e.evade.style.width = (p.mode === 'sogu' ? p.cool / (12 + p.heat * 3) * 100 : p.evade * 100) + '%';
      e.evl.textContent = p.mode === 'sogu' ? (p.hide ? 'SAKLANIYOR ×2,5' : 'GİZLENİYOR') : 'KAÇIŞ';
      e.evade.parentNode.classList.toggle('cool', p.mode === 'sogu');
      K.setH(e.pinfo, `🚓 ${C.cops.filter(c => !c.disabled && !c.block).length} &nbsp; ⏱ ${Math.floor(p.time)} sn &nbsp; 🔥 ${Math.round(p.bounty).toLocaleString('tr-TR')} ÜN`);
      e.vign.className = p.mode === 'takip' ? (Math.floor(C.t * 3) % 2 ? 'red' : 'blue') : '';
    } else e.vign.className = '';
    drawMap();
  }
  function drawMap() {
    const x = C.hud.map, pl = C.player, S = 150, R0 = 260; // oyuncu merkezli 260 m yarıçap
    const sc = S / (R0 * 2), mx = X => S / 2 + (X - pl.x) * sc, my = Z => S / 2 + (Z - pl.z) * sc;
    x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 6.29); x.clip();
    x.fillStyle = 'rgba(8,8,16,.72)'; x.fillRect(0, 0, S, S);
    // yollar
    x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = RW * sc;
    for (let i = 0; i <= NB; i++) { x.beginPath(); x.moveTo(mx(rc(i)), my(-RW)); x.lineTo(mx(rc(i)), my(SIZE + RW)); x.stroke(); x.beginPath(); x.moveTo(mx(-RW), my(rc(i))); x.lineTo(mx(SIZE + RW), my(rc(i))); x.stroke(); }
    x.lineWidth = 9 * sc; x.strokeStyle = 'rgba(255,255,255,.16)';
    for (const B of C.map.blocks) if (B.alley) { x.beginPath(); if (B.alley === 'x') { const z = (B.z0 + B.z1) / 2; x.moveTo(mx(B.x0), my(z)); x.lineTo(mx(B.x1), my(z)); } else { const xx = (B.x0 + B.x1) / 2; x.moveTo(mx(xx), my(B.z0)); x.lineTo(mx(xx), my(B.z1)); } x.stroke(); }
    // deniz
    x.fillStyle = 'rgba(30,90,140,.5)'; x.fillRect(0, my(SIZE + RW / 2), S, S);
    // saklanma, kırıcı, radar
    for (const h of C.map.hides) { x.fillStyle = 'rgba(0,229,255,.55)'; x.beginPath(); x.arc(mx(h.x), my(h.z), 4, 0, 6.29); x.fill(); }
    for (const b of C.map.breakers) if (b.up) { x.fillStyle = '#ffd600'; x.fillRect(mx(b.x) - 2.5, my(b.z) - 2.5, 5, 5); }
    for (const c of C.cops) if (!c.gone && !c.disabled) { x.fillStyle = Math.floor(C.t * 4) % 2 ? '#ff3b3b' : '#2f80ed'; x.beginPath(); x.arc(mx(c.x), my(c.z), 3.2, 0, 6.29); x.fill(); }
    x.restore();
    // oyuncu oku
    x.save(); x.translate(S / 2, S / 2); x.rotate(-pl.h + Math.PI);
    x.fillStyle = '#ff2e63'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(0, 3); x.lineTo(-5, 6); x.closePath(); x.fill(); x.restore();
  }

  // ───────── ANA DÖNGÜ ─────────
  function step(dtReal) {
    if (!C) return;
    const pl = C.player;
    const slowT = C.odakT > 0 ? 0.45 : 1;
    C.slow = lerp(C.slow || 1, slowT, Math.min(1, dtReal * 6));
    const dt = Math.min(0.05, dtReal) * C.slow;
    C.t += dt;
    if (C.odakT > 0) { C.odakT -= dtReal; C.odak = Math.max(0, C.odak - dtReal / 5); if (C.odak <= 0) C.odakT = 0; }
    else C.odak = Math.min(1, C.odak + dt * (Math.abs(pl.slip) > 0.15 || Math.abs(pl.v) > pl.st.vmax * 0.85 ? 0.05 : 0.012));
    playerPhysics(pl, dt);
    hitWorld(pl, true);
    for (const c of C.traffic) if (!c.gone) trafficAI(c, dt);
    for (const c of C.cops) if (!c.gone) copAI(c, dt);
    carCollisions();
    if (C.purs) { pursuitLogic(dt); heliStep(dt); }
    specials(dt);
    C.tmT -= dt; if (C.tmT < 0) { C.tmT = 0.5; trafficManage(); if (!C.purs && C.cops.length < 3) spawnPatrols(); }
    // modeller
    syncModel(pl, dt);
    for (const c of C.traffic) if (!c.gone) syncModel(c, dt);
    for (const c of C.cops) if (!c.gone) {
      syncModel(c, dt);
      const s = c.model.userData.siren;
      if (s && s.length === 2) { const on = (c.state !== 'devriye' || C.purs) && !c.disabled, ph = Math.floor(C.t * 8 + c.x) % 2; s[0].color.setRGB(on && ph ? 6 : 0.2, 0, 0); s[1].color.setRGB(0, 0, on && !ph ? 6 : 0.2); }
    }
    // trafik ışıkları
    const cx = lightState('x'), cz = lightState('z'), cc = s => s === 'g' ? [0.2, 3, 0.6] : s === 'y' ? [3, 2, 0.1] : [3, 0.1, 0.1];
    C.tl.lx.material.color.setRGB(...cc(cx)); C.tl.lz.material.color.setRGB(...cc(cz));
    // güneş/gölge oyuncuyu izler
    C.sun.position.set(pl.x + 60, 120, pl.z + 40); C.sun.target.position.set(pl.x, 0, pl.z); C.sun.target.updateMatrixWorld();
    if (C.sky) C.sky.position.set(K.camera.position.x, 0, K.camera.position.z);
    camStep(dtReal);
    // ses
    const I = K.input;
    K.SES.engine(pl.rpm || 0.2, (I.gas || I.nitro || K.opt.autoGas) && !I.brake ? 1 : 0, pl.nitroOn ? 1 : 0, clamp(pl.v / pl.st.vmax, 0, 1));
    K.SES.skid(clamp(Math.abs(pl.slip) * 2, 0, 1) * (Math.abs(pl.v) > 6 ? 1 : 0));
    let near = 1e9; for (const c of C.cops) if (!c.disabled && (C.purs || c.state !== 'devriye')) near = Math.min(near, Math.hypot(c.x - pl.x, c.z - pl.z));
    K.SES.siren(C.purs && near < 350 ? clamp(1 - near / 350, 0.05, 1) : 0);
    hudStep(dtReal);
    // ekran efektleri
    if (G.POST) {
      const P2 = G.POST.P;
      P2.speed = K.opt.fx === 0 ? 0 : clamp((pl.v - 35) / 55, 0, 1) * 0.8 + (pl.nitroOn ? 0.5 : 0);
      P2.nitro = pl.nitroOn ? 1 : 0; P2.hit = C.shake; P2.odak = C.odakT > 0 ? 1 : 0;
      const sa = C.cfg.saat;
      P2.tint = sa === 'aksam' ? [1.07, 1.0, 0.9] : sa === 'gunduz' ? [1.04, 1.03, 0.93] : [0.94, 1.0, 1.1];
      P2.sat = sa === 'gece' ? 1.05 : 0.92; P2.bloom = sa === 'gunduz' ? 0.4 : 0.6; P2.exposure = sa === 'gece' ? 1.1 : 0.95;
    }
    K.draw(C.scene);
  }

  // ───────── BAŞLAT / BİTİR ─────────
  function start(cfg) {
    K = G.YARIS.kit(); THREE = K.THREE;
    if (G.YARIS.active) G.YARIS.stopRace(true);
    stop(true);
    C = { cfg, t: 0, traffic: [], cops: [], purs: null, shake: 0, odak: 0.5, odakT: 0, tmT: 0, wet: cfg.hava === 'yagmur',
      stats: { mesafe: 0, enHiz: 0, drift: 0, duvar: 0, etkisiz: 0, engel: 0, kacis: 0, maxIsi: 0, carpma: 0, un: 0 }, rec: cfg.rec || { radar: {} } };
    C.map = genMap(cfg.seed || 4242);
    C.scene = buildScene(cfg);
    const pl = C.player = mkCar('player', cfg.oyuncu.vis, cfg.oyuncu.stats);
    // başlangıç: merkeze yakın bir yolun ortasında, kuzeye bakarak
    pl.x = rc(4) + LO[0]; pl.z = rc(5) + P / 2; pl.h = Math.PI; pl.mass = cfg.oyuncu.stats.kg || 1300; pl.isPlayer = true;
    pl.gear = 1; pl.rpm = 0.2;
    for (let k = 0; k < 14; k++) spawnTraffic(true);
    spawnPatrols();
    buildHud();
    K.root.classList.add('racing');
    K.resetInput();
    K.camera.clearViewOffset();
    camStep(0, true);
    G.YARIS.setCity(api);
    K.SES.music('yaris');
    popup('AÇIK ŞEHİR', 'Karaliman · ' + (cfg.saat === 'gece' ? 'gece' : cfg.saat === 'aksam' ? 'akşam' : 'gündüz'), 2.2);
  }
  function stop(silent) {
    if (!C) return null;
    const res = { stats: C.stats, rec: C.rec, purs: C.purs ? { time: C.purs.time, bounty: Math.round(C.purs.bounty) } : null };
    G.YARIS.setCity(null);
    if (C.scene) C.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !(o.material.map && o.material.map.userData && o.material.map.userData.varlik)) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.dispose && m.dispose(); } });
    K.SES.stopEngine(); K.SES.siren(0); K.SES.skid(0);
    $('hud').innerHTML = '';
    K.root.classList.remove('racing');
    C = null;
    if (!silent) K.SES.music('menu');
    return res;
  }
  const api = {
    step,
    odak() { if (!C) return; if (C.odakT > 0) { C.odakT = 0; return; } if (C.odak < 0.25) { popup('ODAK DOLMADI', '', 0.7, 'kotu'); return; } C.odakT = 5; K.SES.sfx('odak'); },
    cam() { cam.mode = (cam.mode + 1) % 2; },
  };
  G.SEHIR = { start, stop, get C() { return C; }, NB, P, RW, SIZE, _dbg: { spawnCop, startPursuit, los, rc },
    // test kancası: ekransız hızlı simülasyon
    _fast(sec) { for (let i = 0; i < sec * 60 && C; i++) { const keep = K.draw; K.draw = () => { }; try { step(1 / 60); } finally { K.draw = keep; } } return C && { x: C.player.x, z: C.player.z, v: C.player.v, purs: !!C.purs, cops: C.cops.length, traffic: C.traffic.length }; },
  };
})(window);
