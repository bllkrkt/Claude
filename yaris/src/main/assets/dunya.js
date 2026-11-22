// Gece Kaçağı — 3B dünya: yol, kaldırım, binalar, bölgeye özel süsler, gökyüzü, hava durumu
(function (G) {
  'use strict';
  const T3 = () => G.THREE;

  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function col(hex) { return new (T3().Color)(hex); }
  function mix(a, b, t) { return col(a).lerp(col(b), t); }

  // ───── dokular ─────
  function roadTex(W, wet) {
    const THREE = T3(), c = cvs(256, 512), x = c.getContext('2d');
    x.fillStyle = wet ? '#1b1c20' : '#2a2b30'; x.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 2600; i++) { const v = 30 + Math.random() * 40; x.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; x.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
    // yamalar / lastik izleri
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(40 + Math.random() * 170, Math.random() * 512, 8 + Math.random() * 12, 60 + Math.random() * 200); }
    const lanes = Math.max(2, Math.round(W / 3.5)), px = m => 4 + (m / W) * 248;
    x.fillStyle = '#e8e8e0'; x.fillRect(px(0.25), 0, 5, 512); x.fillRect(px(W - 0.25) - 5, 0, 5, 512);
    for (let l = 1; l < lanes; l++) {
      const mx = px(l * W / lanes);
      if (l === lanes / 2 && lanes >= 4) { x.fillStyle = '#f2c94c'; x.fillRect(mx - 5, 0, 3, 512); x.fillRect(mx + 2, 0, 3, 512); }
      else { x.fillStyle = '#e8e8e0'; for (let y = 0; y < 512; y += 128) x.fillRect(mx - 2, y, 4, 64); }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  // [renk dokusu, ışıma dokusu]: duvar ışımaz, sadece yanan pencereler parlar
  function windowTex(cols, rows, lit, tone) {
    const THREE = T3(), c = cvs(128, 256), x = c.getContext('2d'), e = cvs(128, 256), y = e.getContext('2d');
    x.fillStyle = tone || '#555'; x.fillRect(0, 0, 128, 256);
    y.fillStyle = '#000'; y.fillRect(0, 0, 128, 256);
    const cw = 128 / cols, ch = 256 / rows;
    // kat bantları (cephe ayrıntısı)
    x.fillStyle = 'rgba(0,0,0,0.18)'; for (let j = 0; j < rows; j++) x.fillRect(0, j * ch + ch * 0.86, 128, ch * 0.08);
    x.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i <= cols; i++) x.fillRect(i * cw - 1, 0, 2, 256);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (j === rows - 1 && rows > 3) { // zemin kat: aydınlık vitrin
        const shop = ['#c8a060', '#6a90b0', '#b07090', '#80a070', '#303038'][Math.floor(Math.random() * 5)];
        x.fillStyle = '#1a1a22'; x.fillRect(i * cw + 2, j * ch + ch * 0.15, cw - 4, ch * 0.7);
        x.fillStyle = shop; x.fillRect(i * cw + 4, j * ch + ch * 0.45, cw - 8, ch * 0.4);
        if (lit > 0.2 && shop !== '#303038') { y.globalAlpha = 0.45; y.fillStyle = shop; y.fillRect(i * cw + 4, j * ch + ch * 0.45, cw - 8, ch * 0.4); y.globalAlpha = 1; }
        continue;
      }
      const on = Math.random() < lit;
      const w = ['#ffd98a', '#ffe9b8', '#9fd8ff', '#ffb36b', '#fff1d0'][Math.floor(Math.random() * 5)];
      x.fillStyle = on ? w : 'rgba(20,24,36,0.9)';
      x.fillRect(i * cw + cw * 0.18, j * ch + ch * 0.2, cw * 0.64, ch * 0.55);
      if (on) { y.fillStyle = w; y.fillRect(i * cw + cw * 0.18, j * ch + ch * 0.2, cw * 0.64, ch * 0.55); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const te = new THREE.CanvasTexture(e); te.wrapS = te.wrapT = THREE.RepeatWrapping;
    return [t, te];
  }
  function glowTex() {
    const THREE = T3(), c = cvs(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  function stripeTex() {
    const THREE = T3(), c = cvs(64, 64), x = c.getContext('2d');
    x.fillStyle = '#f5c400'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#111';
    for (let i = -64; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 8, 0); x.lineTo(i + 72, 64); x.lineTo(i + 64, 64); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  let ARW = null;
  function arrowTex() {
    if (ARW) return ARW;
    const THREE = T3(), c = cvs(64, 96), x = c.getContext('2d');
    x.fillStyle = 'rgba(255,214,0,0.9)'; x.beginPath(); x.moveTo(32, 2); x.lineTo(62, 40); x.lineTo(42, 40); x.lineTo(42, 94); x.lineTo(22, 94); x.lineTo(22, 40); x.lineTo(2, 40); x.fill();
    return (ARW = new THREE.CanvasTexture(c));
  }
  function checkerTex() {
    const THREE = T3(), c = cvs(64, 16), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#eee'; x.fillRect(i * 4, j * 4, 4, 4); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
  }
  // v9: çizilmiş ok / yıldız (yazı karakteri değil). dir: 0 yukarı, 1 sağ, 2 aşağı, 3 sol; 'u' sağa-yukarı
  function drawArrow(x, cx, cy, sz, dir) {
    x.save(); x.translate(cx, cy); x.rotate(dir === 'u' ? Math.PI / 4 : dir * Math.PI / 2);
    const hw = sz * 0.5, sw = sz * 0.15, hl = sz * 0.46;
    x.beginPath(); x.moveTo(0, -sz / 2); x.lineTo(hw, -sz / 2 + hl); x.lineTo(sw, -sz / 2 + hl); x.lineTo(sw, sz / 2);
    x.lineTo(-sw, sz / 2); x.lineTo(-sw, -sz / 2 + hl); x.lineTo(-hw, -sz / 2 + hl); x.closePath(); x.fill(); x.restore();
  }
  function drawStar(x, cx, cy, r) {
    x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill();
  }
  // yazı + {<} {>} {^} {v} {/} (sağa-yukarı) {*} (yıldız) simgeleri; opt.frame: beyaz çerçeve
  function textTex(txt, bg, fg, w, h, opt) {
    const THREE = T3(), c = cvs(w || 256, h || 64), x = c.getContext('2d'), H = c.height;
    x.fillStyle = bg; x.fillRect(0, 0, c.width, H);
    const pad = opt && opt.frame ? H * 0.12 : 0;
    if (pad) { x.strokeStyle = fg; x.lineWidth = Math.max(2, H * 0.05); x.strokeRect(pad * 0.6, pad * 0.6, c.width - pad * 1.2, H - pad * 1.2); }
    const parts = String(txt).split(/(\{[<>^v\/*]\})/).filter(Boolean);
    let fs = Math.round(H * (pad ? 0.5 : 0.6));
    const tokW = () => fs * 1.05, gap = () => fs * 0.25;
    const measure = () => { x.font = `bold ${fs}px sans-serif`; return parts.reduce((a, p) => a + (/^\{.\}$/.test(p) ? tokW() + gap() : x.measureText(p).width), 0); };
    let tw = measure(); while (tw > c.width - pad * 3 - 8 && fs > 8) { fs -= 2; tw = measure(); }
    x.fillStyle = fg; x.textAlign = 'left'; x.textBaseline = 'middle';
    let cx = (c.width - tw) / 2; const cy = H / 2 + 2;
    for (const p of parts) {
      const m = /^\{(.)\}$/.exec(p);
      if (!m) { x.fillText(p, cx, cy); cx += x.measureText(p).width; continue; }
      const k = m[1], mid = cx + gap() / 2 + tokW() / 2;
      if (k === '*') drawStar(x, mid, H / 2, fs * 0.48);
      else drawArrow(x, mid, H / 2, fs * 0.92, { '^': 0, '>': 1, 'v': 2, '<': 3, '/': 'u' }[k]);
      cx += tokW() + gap();
    }
    return new THREE.CanvasTexture(c);
  }
  // Ufuk silüeti (bölgeye göre gökdelen ya da dağ)
  function skylineTex(kind, color) {
    const THREE = T3(), c = cvs(2048, 256), x = c.getContext('2d');
    x.clearRect(0, 0, 2048, 256);
    x.fillStyle = color;
    if (kind === 'dag' || kind === 'sahil') {
      x.beginPath(); x.moveTo(0, 256);
      let y = 150;
      for (let i = 0; i <= 2048; i += 16) { y += (Math.random() - 0.5) * (kind === 'dag' ? 40 : 14); y = Math.max(kind === 'dag' ? 30 : 150, Math.min(220, y)); x.lineTo(i, y); }
      x.lineTo(2048, 256); x.fill();
    } else {
      for (let i = 0; i < 2048;) {
        const w = 20 + Math.random() * 60, h = (kind === 'merkez' || kind === 'otoyol' ? 60 : 20) + Math.random() * (kind === 'merkez' || kind === 'otoyol' ? 170 : 70);
        x.fillRect(i, 256 - h, w, h);
        if (Math.random() < 0.3) x.fillRect(i + w / 2 - 1, 256 - h - 20, 2, 20);
        // pencere ışıkları
        x.fillStyle = 'rgba(255,220,150,0.5)';
        for (let k = 0; k < h / 6; k++) if (Math.random() < 0.3) x.fillRect(i + 3 + Math.random() * (w - 6), 256 - h + 4 + Math.random() * (h - 8), 2, 2);
        x.fillStyle = color;
        i += w + Math.random() * 6;
      }
      if (kind === 'liman') { // vinç silüetleri
        for (let k = 0; k < 6; k++) { const bx = 200 + k * 320; x.fillRect(bx, 80, 6, 176); x.fillRect(bx - 60, 80, 140, 6); x.fillRect(bx + 60, 86, 3, 60); }
      }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping;
    return t;
  }
  // Araba yansımaları için ortam haritası (gökyüzü renkleri + ışık şeritleri)
  function envMap(renderer, top, hor, lamp) {
    const THREE = T3(), c = cvs(256, 128), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, top); g.addColorStop(0.5, hor); g.addColorStop(0.55, '#111'); g.addColorStop(1, '#050505');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    x.fillStyle = lamp; for (let i = 0; i < 9; i++) x.fillRect(i * 30 + 6, 40 + (i % 3) * 6, 10, 4);
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(0, 20, 256, 3);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromEquirectangular(t);
    t.dispose(); pm.dispose();
    return rt.texture;
  }

  // ───── şerit (yol boyunca uzanan bant) geometrisi ─────
  // d1..d2 arası yanal bant, y0 yükseklik farkı, vScale doku tekrarı (m)
  function ribbon(T, d1, d2, yOff, vLen, every, yOff2, skip) {
    const THREE = T3(), N = T.N + (T.loop ? 1 : 0), st = every || 1;
    const pos = [], uv = [], idx = [];
    let n = 0;
    for (let i = 0; i < N; i += st) {
      if (skip && skip(i * T.step)) { n = 0; continue; }
      const k = i % T.N, h = T.hd[k], nx = -Math.cos(h), nz = Math.sin(h);
      const x = T.px[k], z = T.pz[k], y = T.py[k];
      pos.push(x + nx * d1, y + yOff, z + nz * d1, x + nx * d2, y + (yOff2 != null ? yOff2 : yOff), z + nz * d2);
      const v = (i * T.step) / vLen;
      uv.push(0, v, 1, v);
      const base = pos.length / 3 - 2;
      if (n > 0) { const a = base - 2, b = base; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // d1<d2 iken yüz yönü aşağı bakabilir: iki taraflı çiz
    return g;
  }

  // ağaç tacı: farklı boyda dört yaprak kümesi (tek geometri, yaprak dokusu için UV'li)
  function crownGeo() {
    const THREE = T3(), pos = [], nor = [], uv = [], idx = [];
    [[0, 3.7, 0, 1.45], [0.75, 3.3, 0.3, 1.0], [-0.7, 3.4, -0.25, 1.05], [0.1, 4.5, -0.1, 0.95]].forEach(([x0, y0, z0, rr], k) => {
      const g = new THREE.IcosahedronGeometry(rr, 1);
      const P = g.attributes.position, base = pos.length / 3;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), j = 1 + (Math.sin(x * 7 + y * 5 + k) * 0.08);
        pos.push(x0 + x * j, y0 + y * j * 0.85, z0 + z * j);
        const l = Math.hypot(x, y, z) || 1; nor.push(x / l, y / l, z / l);
        uv.push(Math.atan2(z, x) / Math.PI * 1.5 + k * 0.3, y / rr * 0.8 + k * 0.2);
      }
      for (let i = 0; i < P.count; i++) idx.push(base + i);
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setIndex(idx);
    return out;
  }
  // üç katlı çam silüeti (tek geometri)
  function mergeCones() {
    const THREE = T3(), pos = [], idx = [];
    [[0, 0.55, 1.0], [0.32, 0.45, 0.78], [0.6, 0.4, 0.55]].forEach(([y0, h, r]) => {
      const c = new THREE.ConeGeometry(r, h, 8, 1, true); c.translate(0, y0 + h / 2, 0);
      const base = pos.length / 3, P = c.attributes.position;
      for (let i = 0; i < P.count; i++) pos.push(P.getX(i), P.getY(i), P.getZ(i));
      for (let i = 0; i < c.index.count; i++) idx.push(base + c.index.getX(i));
      c.dispose();
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function placeAlong(T, every, offs, fn, r) {
    for (let s = 10; s < T.L - 10; s += every * (0.7 + r() * 0.6)) {
      for (const side of offs) fn(s, side);
    }
  }

  function skyName(zone, saat, hava) {
    if (hava === 'yagmur' || hava === 'sis') return saat === 'gece' ? 'gece' : 'kapali';
    if (zone.tema === 'dag') return 'dag';
    return saat || 'gunduz';
  }
  function envFromSky(renderer, zone, saat, hava) {
    const THREE = T3(), V = G.VARLIK; if (!V || !V.ready) return null;
    const sn = skyName(zone, saat, hava), sk = V.A.sky[sn]; if (!sk) return null;
    let t;
    if (saat === 'gece') {
      // gece: yansıma kaynağı karartılır (yoksa camlar ve yol parlak gökyüzünü yansıtıp bembeyaz olur)
      const im = V.A.img['sky_' + sn], c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, 512, 256);
      x.fillStyle = sn === 'gece' ? 'rgba(4,6,14,0.72)' : 'rgba(4,6,18,0.9)'; x.fillRect(0, 0, 512, 256);
      t = new THREE.CanvasTexture(c);
    } else { t = sk.tex.clone(); t.needsUpdate = true; }
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(t);
    pm.dispose(); t.dispose();
    return rt.texture;
  }
  const SKY = {
    gece: (z) => ({ top: z.gok[0], hor: z.gok[1], fog: z.sis, amb: 0.42, sun: 0.22, sunCol: '#8fa8ff', lamps: 1, stars: 1 }),
    aksam: (z) => ({ top: '#2a2058', hor: '#ff9a5a', fog: '#7a4a5a', amb: 0.8, sun: 0.9, sunCol: '#ffb37a', lamps: 0.6, stars: 0.2 }),
    gunduz: (z) => ({ top: '#3a7bd5', hor: '#cfe6ff', fog: '#a8c4dc', amb: 1.0, sun: 1.3, sunCol: '#fff4e0', lamps: 0, stars: 0 }),
  };

  /**
   * Sahneyi kurar. opts: {saat, hava, q (0-2), renderer}
   */
  function build(scene, T, zone, opts) {
    const THREE = T3(), q = opts.q, r = G.PIST.rng((T.def.seed || 1) * 7 + 3);
    const W = T.W, tema = zone.tema;
    const P_curv = s0 => G.PIST.maxCurv(T, s0 - 20, 40);
    const SC = opts.shortcuts || [], RAMPS = opts.ramps || [];
    // en yakın yol mesafesi (ana yol eşdeğeri): kestirme yolları da dahil
    const rd = (x, z) => { let d = G.PIST.roadDist(T, x, z); for (const k of SC) d = Math.min(d, G.PIST.roadDist(k.T, x, z) + (W - k.T.W) / 2); return d; };
    // kestirme ağzı: ana yolun o yanında bu s aralığında boşluk var
    const gapAt = (s, side) => SC.some(k => k.side === side && ((s > k.sA - 10 && s < k.sA + 18) || (s > k.sB - 18 && s < k.sB + 10)));
    const sky = SKY[opts.saat || 'gece'](zone);
    const wet = opts.hava === 'yagmur';
    const VA = G.VARLIK && G.VARLIK.ready ? G.VARLIK.A : null;   // gerçek varlıklar (fotoğraf dokuları/gökyüzü/modeller)
    const skN = skyName(zone, opts.saat, opts.hava), SKP = VA ? VA.sky[skN] : null;
    const night = opts.saat === 'gece';
    const skyDark = night && skN !== 'gece';  // gündüz fotoğrafı gece için karartılır (ay ışığı)
    const objs = [], anim = [], disposables = [];
    const cull = [];  // [nesne, merkez x, z, yarıçap²]
    const SH = q >= 1;  // gerçek zamanlı gölgeler
    const add = o => {
      scene.add(o); objs.push(o);
      if (SH && (o.isMesh || o.isInstancedMesh) && o.material && !Array.isArray(o.material) && !o.material.transparent && !o.material.isMeshBasicMaterial) {
        o.receiveShadow = true;
        if (o.isInstancedMesh || o.userData.cast) o.castShadow = true;
      }
      if (o.isInstancedMesh) {
        // r149'da örnek dönüşümleri sınır küresine katılmaz: kendi ayıklamamızı yap
        o.frustumCulled = false;
        const n = o.count, mm = new THREE.Matrix4(); let sx = 0, sz = 0;
        for (let i = 0; i < n; i++) { o.getMatrixAt(i, mm); sx += mm.elements[12]; sz += mm.elements[14]; }
        if (n) { sx /= n; sz /= n; let rr = 0; for (let i = 0; i < n; i++) { o.getMatrixAt(i, mm); rr = Math.max(rr, Math.hypot(mm.elements[12] - sx, mm.elements[14] - sz)); } cull.push([o, sx, sz, rr]); }
      }
      return o;
    };
    // örnekleri 250 m'lik bölgelere böl (yakındakiler çizilsin)
    const chunk = list => {
      const m = new Map();
      for (const b of list) { const k = Math.floor(b[0] / 250) + ',' + Math.floor(b[2] / 250); if (!m.has(k)) m.set(k, []); m.get(k).push(b); }
      return [...m.values()];
    };

    // merkez ve yarıçap
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, minY = 1e9;
    for (let i = 0; i < T.N; i++) { minX = Math.min(minX, T.px[i]); maxX = Math.max(maxX, T.px[i]); minZ = Math.min(minZ, T.pz[i]); maxZ = Math.max(maxZ, T.pz[i]); minY = Math.min(minY, T.py[i]); }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, rad = Math.max(maxX - minX, maxZ - minZ) / 2 + 400;

    // ── gökyüzü ──
    let fogCol = col(wet ? mix(sky.fog, '#3a4048', 0.5).getStyle() : sky.fog);
    if (SKP) { fogCol = new THREE.Color().setRGB(SKP.hz[0], SKP.hz[1], SKP.hz[2]).convertSRGBToLinear(); if (skyDark) fogCol.multiplyScalar(0.12); else if (night) fogCol.multiplyScalar(0.5); }
    const fogNear = opts.hava === 'sis' ? 20 : wet ? 60 : SKP ? 180 : 120, fogFar = opts.hava === 'sis' ? 260 : wet ? 520 : SKP ? 1300 : 900;
    scene.fog = new THREE.Fog(fogCol, fogNear * (q >= 3 ? 1.3 : 1), fogFar * (q >= 3 && opts.hava !== 'sis' ? 1.35 : 1)); // v11: Ultra'da daha uzağı gör
    scene.background = col(sky.hor);
    const skyG = new THREE.SphereGeometry(1600, 24, 12);
    const cTop = col(sky.top), cHor = col(sky.hor), sc = [];
    const sp = skyG.attributes.position;
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) / 1600; const c = cHor.clone().lerp(cTop, Math.pow(Math.max(0, y), 0.55)); if (y < 0) c.copy(fogCol); sc.push(c.r, c.g, c.b); }
    skyG.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    const skyM = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyM.renderOrder = -10; add(skyM);
    if (sky.stars > 0 && opts.hava !== 'sis' && !SKP) {
      const sv = [];
      for (let i = 0; i < 700; i++) { const a = r() * 6.28, e = 0.15 + r() * 1.3; sv.push(Math.cos(a) * Math.cos(e) * 1500, Math.sin(e) * 1500, Math.sin(a) * Math.cos(e) * 1500); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
      const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 * sky.stars }));
      add(st);
    }
    // ay / güneş
    const glow = glowTex(); disposables.push(glow);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: opts.saat === 'gece' ? 0xdfe8ff : opts.saat === 'aksam' ? 0xffa060 : 0xffffee, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    moon.scale.setScalar(opts.saat === 'aksam' ? 420 : 160);
    const sunDir = new THREE.Vector3(-0.5, opts.saat === 'aksam' ? 0.12 : 0.55, -0.7).normalize();
    moon.position.copy(sunDir).multiplyScalar(1400); moon.renderOrder = -9;
    const skyGroup = new THREE.Group(); add(skyGroup);
    skyGroup.add(moon);
    // ufuk silüeti halkası
    const silCol = opts.saat === 'gunduz' ? '#6a7a8a' : opts.saat === 'aksam' ? '#3a2040' : '#0a0a16';
    const silT = skylineTex(tema, silCol); silT.repeat.set(3, 1); disposables.push(silT);
    const sil = new THREE.Mesh(new THREE.CylinderGeometry(1250, 1250, tema === 'dag' ? 520 : 300, 48, 1, true),
      new THREE.MeshBasicMaterial({ map: silT, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sil.position.y = (tema === 'dag' ? 260 : 150) - 40 + minY; sil.renderOrder = -8;
    skyGroup.add(sil);
    skyM.parent && skyM.parent.remove(skyM); skyGroup.add(skyM);
    if (SKP) {
      // gerçek gökyüzü fotoğrafı (kamerayla birlikte gezer, ufuk göz hizasında)
      moon.visible = false; sil.visible = false; skyM.visible = false;
      const sg = new THREE.SphereGeometry(1500, 48, 24); sg.scale(-1, 1, 1);
      const sm = new THREE.MeshBasicMaterial({ map: SKP.tex, fog: false, depthWrite: false });
      if (skyDark) sm.color.setRGB(0.1, 0.13, 0.24); else if (night) sm.color.setRGB(0.45, 0.45, 0.5);
      const ph = new THREE.Mesh(sg, sm); ph.renderOrder = -10; ph.rotation.y = r() * 6.28; skyGroup.add(ph);
      skyGroup.userData.photo = ph;
    }

    function glowPoints(arr, c, size) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ map: glow, color: c, size, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    }
    // ── ışıklar ──
    let hemiSky = col(sky.top).lerp(col('#ffffff'), 0.3), hemiI = sky.amb, sunI = sky.sun, sunC = col(sky.sunCol);
    if (SKP) {
      const ph = skyGroup.userData.photo, a = ph.rotation.y;
      const sx = SKP.sun[0], sz = SKP.sun[2];
      // küre döndürüldüğü için güneş yönü de döner (ölçek -1: x ters)
      sunDir.set(-(sx * Math.cos(a) + sz * Math.sin(a)), Math.max(0.18, SKP.sun[1]), -(-sx * Math.sin(a) + sz * Math.cos(a))).normalize();
      hemiSky = new THREE.Color().setRGB(SKP.top[0], SKP.top[1], SKP.top[2]).convertSRGBToLinear().lerp(col('#ffffff'), 0.35);
      const P = { gunduz: [0.75, 1.7, '#fff3dc'], aksam: [0.6, 1.5, '#ffc08a'], gece: [0.3, 0.12, '#8fa8ff'], kapali: [0.95, 0.45, '#e8eef5'], dag: [0.75, 1.7, '#fff6e6'] }[skN];
      hemiI = P[0]; sunI = P[1]; sunC = col(P[2]);
      if (skyDark) { hemiI = 0.28; sunI = 0.35; sunC = col('#9ab0ff'); hemiSky = col('#4a5a90'); }
    }
    const hemi = add(new THREE.HemisphereLight(hemiSky, col(zone.zemin), hemiI));
    const sun = new THREE.DirectionalLight(sunC, sunI);
    if (SH && sunI > 0.3) {
      sun.castShadow = true;
      const ms = q >= 3 ? 4096 : q >= 2 ? 2048 : 1024;
      sun.shadow.mapSize.set(ms, ms);
      const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 320;
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    }
    sun.position.copy(sunDir).multiplyScalar(100); add(sun); add(sun.target);

    // ── zemin ──
    const groundCol = tema === 'sahil' ? (opts.saat === 'gece' ? '#3a3428' : '#c8b090') : tema === 'dag' ? '#1e2a1c' : zone.zemin;
    const gName = tema === 'dag' || tema === 'otoyol' ? 'cim_diff' : tema === 'sahil' ? 'toprak_diff' : 'beton_diff';
    const groundTex = VA ? G.VARLIK.tex(gName, rad * 2.2 / 14, rad * 2.2 / 14) : null;
    if (groundTex) disposables.push(groundTex);
    const gM = VA ? new THREE.MeshLambertMaterial({ map: groundTex, color: tema === 'sahil' ? col('#d8c8a0') : gName === 'beton_diff' ? col(night ? '#3a3a3e' : '#6a6a6e') : night ? col('#666') : col('#cfcfcf') })
      : new THREE.MeshLambertMaterial({ color: mix(groundCol, sky.fog, 0.15) });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(rad * 2.2, rad * 2.2), gM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(cx, minY - 0.6, cz); add(ground);
    // yol kenarındaki yakın zemin (yükseltiyi takip eder)
    let sideM = new THREE.MeshLambertMaterial({ color: mix(groundCol, '#000', 0.1), side: THREE.DoubleSide });
    if (VA) {
      const sn = tema === 'dag' ? 'kaya_diff' : tema === 'otoyol' ? 'cim_diff' : tema === 'sahil' ? 'toprak_diff' : 'beton_diff';
      const st = G.VARLIK.tex(sn, 8, 1); disposables.push(st);
      sideM = new THREE.MeshLambertMaterial({ map: st, side: THREE.DoubleSide, color: col(sn === 'beton_diff' ? (night ? '#3a3a3e' : '#707074') : night ? '#777' : '#d8d8d8') });
    }
    if (tema === 'dag' && VA) {
      const gm2 = new THREE.MeshLambertMaterial({ map: G.VARLIK.tex('cim_diff', 2, 1), side: THREE.DoubleSide, color: col(night ? '#555' : '#bdbdbd') });
      add(new THREE.Mesh(ribbon(T, -W / 2 - 3, -W / 2 - 14, -0.02, 10, 2, 0.4), gm2));       // çimenli banket
      add(new THREE.Mesh(ribbon(T, -W / 2 - 14, -W / 2 - 80, 0.4, 10, 2, 32), sideM));      // yükselen kaya yamacı
      add(new THREE.Mesh(ribbon(T, W / 2 + 3, W / 2 + 90, -0.02, 10, 2, -12), gm2));        // uçuruma inen çimenli yamaç
    } else {
      add(new THREE.Mesh(ribbon(T, -W / 2 - 3, -W / 2 - 90, -0.02, 10, 2, -0.6 - (tema === 'dag' ? 2 : 0)), sideM));
      add(new THREE.Mesh(ribbon(T, W / 2 + 3, W / 2 + 90, -0.02, 10, 2, -0.6 - (tema === 'dag' ? 2 : 0)), sideM));
    }

    // su (liman, sahil, otoyol köprüsü)
    let water = null;
    if (tema === 'liman' || tema === 'sahil' || tema === 'otoyol') {
      const wc = opts.saat === 'gunduz' ? '#2a6a9a' : opts.saat === 'aksam' ? '#5a3a6a' : '#0a1428';
      const wm = q >= 1 ? new THREE.MeshStandardMaterial({ color: wc, roughness: 0.15, metalness: 0.6, envMap: opts.env })
        : new THREE.MeshLambertMaterial({ color: wc });
      water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), wm);
      water.rotation.x = -Math.PI / 2;
      // suyu pistin bir yanına yerleştir
      const off = tema === 'otoyol' ? 0 : rad * 0.9;
      water.position.set(cx + off, minY - (tema === 'otoyol' ? 14 : 1.2), cz + (tema === 'otoyol' ? 0 : off * 0.3));
      add(water);
      if (tema === 'otoyol') ground.visible = false;
    }

    // ── yol ──
    const rt = roadTex(W, wet); rt.repeat.set(1, 1); disposables.push(rt);
    const roadM = q >= 1 ? new THREE.MeshStandardMaterial({ map: rt, roughness: wet ? 0.32 : 0.85, metalness: wet ? 0.3 : 0.05, envMap: opts.env, envMapIntensity: wet ? 0.55 : 0.25 })
      : new THREE.MeshLambertMaterial({ map: rt });
    if (VA) {
      const ad = G.VARLIK.tex('asfalt_diff', W / 7, 1), an = G.VARLIK.tex('asfalt_nor_gl', W / 7, 1), ar = G.VARLIK.tex('asfalt_rough', W / 7, 1);
      disposables.push(ad, an, ar);
      const rM = new THREE.MeshStandardMaterial({ map: ad, normalMap: an, roughnessMap: ar, roughness: wet ? 0.35 : 1, metalness: wet ? 0.15 : 0, color: wet ? col('#58585c') : col('#8a8a8c'), envMap: opts.env, envMapIntensity: wet ? 1.1 : 0.35, side: THREE.DoubleSide });
      rM.normalScale.set(0.8, 0.8);
      add(new THREE.Mesh(ribbon(T, -W / 2, W / 2, 0, 7), rM));
      // şerit çizgileri
      const lane = (d, w, dashed, c, h) => {
        const cv2 = cvs(16, 128), x2 = cv2.getContext('2d');
        x2.fillStyle = '#fff';
        if (dashed) x2.fillRect(0, 0, 16, 40); else x2.fillRect(0, 0, 16, 128);
        x2.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 160; i++) { x2.globalAlpha = Math.random() * 0.5; x2.fillRect(Math.random() * 16, Math.random() * 128, 2, 3); }
        const at = new THREE.CanvasTexture(cv2); at.wrapT = THREE.RepeatWrapping; disposables.push(at);
        const mt = new THREE.MeshStandardMaterial({ color: c, map: at, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, emissive: c, emissiveIntensity: night ? 0.15 : 0, side: THREE.DoubleSide });
        const m = new THREE.Mesh(ribbon(T, d - w / 2, d + w / 2, 0.015, dashed ? 12 : 30), mt); m.renderOrder = 1; return add(m);
      };
      const nl0 = Math.max(2, Math.round(W / 3.5));
      lane(-W / 2 + 0.35, 0.15, false, col('#e8e8e0')); lane(W / 2 - 0.35, 0.15, false, col('#e8e8e0'));
      for (let l = 1; l < nl0; l++) {
        const d = -W / 2 + l * W / nl0;
        if (l === nl0 / 2 && nl0 >= 4) { lane(d - 0.12, 0.1, false, col('#e8b820')); lane(d + 0.12, 0.1, false, col('#e8b820')); }
        else lane(d, 0.13, true, col('#e8e8e0'));
      }
    } else add(new THREE.Mesh(ribbon(T, -W / 2, W / 2, 0, 16), roadM));
    // kaldırım / bordür
    let curbM = new THREE.MeshLambertMaterial({ color: tema === 'dag' ? '#5a5a55' : '#8a8a90', side: THREE.DoubleSide });
    let walkM = new THREE.MeshLambertMaterial({ color: tema === 'dag' ? '#3a3a30' : '#55555c', side: THREE.DoubleSide });
    if (VA) {
      const ct = G.VARLIK.tex('beton_diff', 1, 1), kt = G.VARLIK.tex('kaldirim_diff', 1, 1), kn = G.VARLIK.tex('kaldirim_nor_gl', 1, 1); disposables.push(ct, kt, kn);
      curbM = new THREE.MeshLambertMaterial({ map: ct, color: col('#d8d8d8'), side: THREE.DoubleSide });
      walkM = tema === 'dag' ? new THREE.MeshLambertMaterial({ map: G.VARLIK.tex('toprak_diff', 1, 1), side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ map: kt, normalMap: kn, roughness: 0.9, color: night ? col('#aaaaaa') : col('#ffffff'), side: THREE.DoubleSide });
    }
    for (const sg of [-1, 1]) {
      add(new THREE.Mesh(ribbon(T, sg * W / 2, sg * (W / 2 + 0.01), 0, 10, 2, 0.18), curbM));
      add(new THREE.Mesh(ribbon(T, sg * W / 2, sg * (W / 2 + 3), 0.18, VA ? 3 : 10, 2), walkM));
    }
    // köprü / dağ: bariyerler
    if (tema === 'dag' || tema === 'otoyol' || tema === 'sahil') {
      const bm = VA ? new THREE.MeshLambertMaterial({ map: G.VARLIK.tex('beton_diff', 1, 1), color: col('#c8c8c8'), side: THREE.DoubleSide })
        : new THREE.MeshLambertMaterial({ color: tema === 'otoyol' ? '#9a9aa2' : '#c8ccd0', side: THREE.DoubleSide });
      for (const sg of [-1, 1]) add(new THREE.Mesh(ribbon(T, sg * (W / 2 + 0.3), sg * (W / 2 + 0.31), 0.18, 10, 2, tema === 'otoyol' ? 1.1 : 0.85, s0 => gapAt(s0, sg)), bm));
      if (tema === 'otoyol') { // köprü ayakları
        const pg = new THREE.BoxGeometry(3, 30, 3), pm = new THREE.MeshLambertMaterial({ color: '#5a5a66' });
        const n = Math.floor(T.L / 60), im = new THREE.InstancedMesh(pg, pm, n * 2), m4 = new THREE.Matrix4(), o = {};
        let k = 0;
        for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
          G.PIST.sample(T, i * 60, sg * (W / 2 - 1), o);
          m4.makeTranslation(o.x, o.y - 15.3, o.z); im.setMatrixAt(k++, m4);
        }
        add(im);
      }
    }

    // ── sokak lambaları ──
    const lampEvery = tema === 'dag' ? 70 : 38;
    const nL = Math.floor(T.L / lampEvery) * 2;
    // cadde lambası: konik direk + kavisli kol + yassı başlık
    const poleG = new THREE.CylinderGeometry(0.08, 0.15, 8, q >= 1 ? 10 : 6); poleG.translate(0, 4, 0);
    const baseG = new THREE.CylinderGeometry(0.22, 0.26, 0.6, 8); baseG.translate(0, 0.3, 0); poleG.dispose();
    const poleM = q >= 1 ? new THREE.MeshStandardMaterial({ color: '#5a5e66', roughness: 0.45, metalness: 0.8, envMap: opts.env }) : new THREE.MeshLambertMaterial({ color: '#4a4e56' });
    const pg2 = new THREE.CylinderGeometry(0.08, 0.15, 8, q >= 1 ? 10 : 6); pg2.translate(0, 4, 0);
    const poles = new THREE.InstancedMesh(pg2, poleM, nL);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 7.6, 0), new THREE.Vector3(0, 8.6, 0.4), new THREE.Vector3(0, 8.45, 2.2));
    const armG = new THREE.TubeGeometry(curve, 8, 0.06, 6, false);
    const arms = new THREE.InstancedMesh(armG, poleM, nL);
    const lampCol = col(zone.isik);
    const headG = new THREE.BoxGeometry(0.42, 0.14, 0.95); headG.translate(0, 8.4, 2.55);
    const housing = new THREE.InstancedMesh(headG, poleM, nL);
    const bases = new THREE.InstancedMesh(baseG, poleM, nL);
    const lensG = new THREE.BoxGeometry(0.34, 0.04, 0.8); lensG.translate(0, 8.32, 2.55); const headG2 = lensG;
    const heads = new THREE.InstancedMesh(headG2, new THREE.MeshBasicMaterial({ color: sky.lamps > 0 ? lampCol.clone().multiplyScalar(1.8) : col('#555') }), nL);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1), o = {};
    const lampPos = [], lampMats = [];
    let li = 0;
    for (let s = 5; s < T.L - 5 && li < nL - 1; s += lampEvery) {
      for (const sg of (tema === 'dag' ? [s % (lampEvery * 2) < lampEvery ? 1 : -1] : [-1, 1])) {
        if (gapAt(s + (sg > 0 ? lampEvery / 2 : 0), sg)) continue;
        G.PIST.sample(T, s + (sg > 0 ? lampEvery / 2 : 0), sg * (W / 2 + 1.2), o);
        const yaw = o.h + (sg > 0 ? Math.PI / 2 : -Math.PI / 2);
        q4.setFromAxisAngle(v3.set(0, 1, 0), yaw + Math.PI);
        m4.compose(new THREE.Vector3(o.x, o.y + 0.18, o.z), q4, s3);
        poles.setMatrixAt(li, m4); arms.setMatrixAt(li, m4); heads.setMatrixAt(li, m4); housing.setMatrixAt(li, m4); bases.setMatrixAt(li, m4);
        lampMats.push(m4.clone());
        G.PIST.sample(T, s + (sg > 0 ? lampEvery / 2 : 0), sg * (W / 2 - 1.3), o);
        lampPos.push([o.x, o.y, o.z, s]);
        li++;
      }
    }
    poles.count = arms.count = heads.count = housing.count = bases.count = li;
    // gerçek lamba modeli (örneklemeli çizim): her parça için bir InstancedMesh
    const instModel = (name, mats, scale) => {
      const md = VA && VA.model[name]; if (!md || !mats.length) return false;
      if (mats.length > 12 && !instModel.flat) { const groups = chunk(mats.map(m => [m.elements[12], 0, m.elements[14], m])); instModel.flat = true; for (const gp of groups) instModel(name, gp.map(x => x[3]), scale); instModel.flat = false; return true; }
      const sc = new THREE.Matrix4().makeScale(scale, scale, scale), mm = new THREE.Matrix4();
      for (const part of md.parts) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, mats.length);
        mats.forEach((m, i) => { mm.multiplyMatrices(m, sc); im.setMatrixAt(i, mm); });
        add(im);
      }
      return true;
    };
    const lampScale = 1.75;
    if (q >= 1 && instModel('street_lamp_01', lampMats, lampScale)) { /* model kullanıldı */ }
    else { add(poles); add(arms); add(heads); add(housing); add(bases); }
    const lampModel = q >= 1 && VA && VA.model.street_lamp_01;
    // ışık havuzları (yola düşen ışık) ve parıltılar
    if (sky.lamps > 0) {
      const poolG = new THREE.PlaneGeometry(14, 14); poolG.rotateX(-Math.PI / 2);
      const poolM = new THREE.MeshBasicMaterial({ map: glow, color: lampCol.clone().multiplyScalar(0.32 * sky.lamps * (wet ? 1.5 : 1)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const pools = new THREE.InstancedMesh(poolG, poolM, lampPos.length);
      const gp = [];
      lampPos.forEach((p, i) => {
        m4.makeTranslation(p[0], p[1] + 0.06, p[2]); pools.setMatrixAt(i, m4);
        if (!lampModel) gp.push(p[0], p[1] + 7.7, p[2]);
      });
      pools.renderOrder = 3; add(pools);
      if (lampModel) for (const m of lampMats) { const e = m.elements; gp.push(e[12], e[13] + 3.45 * lampScale, e[14]); }
      add(glowPoints(gp, lampCol.clone().multiplyScalar(0.8), lampModel ? 2.2 : 3.2));
    }

    // ── binalar ──
    const isNight = opts.saat === 'gece';
    const bTone = zone.bina;
    const bins = [[0, 0.33], [0.33, 0.7], [0.7, 1.01]];
    const hMin = zone.yuk[0], hMax = zone.yuk[1];
    // v12: bina ayrıntıları (buildCity doldurur, örnekli çizim aşağıda "v12 bina ayrıntıları" bloğunda)
    const DET = { ac: [], bal: [], rail: [], awn: [], awnC: [], neon: [] };
    if (tema !== 'dag' && VA) buildCity();
    if (tema !== 'dag' && !VA) {
      const placed = [[], [], []];
      const gap = tema === 'merkez' ? 16 : tema === 'otoyol' ? 34 : 22;
      for (let s = 0; s < T.L; s += gap * (0.8 + r() * 0.5)) {
        for (const sg of [-1, 1]) {
          if (tema === 'sahil' && sg > 0) continue; // deniz tarafı boş
          if (tema === 'otoyol' && r() < 0.5) continue;
          const w = 10 + r() * (tema === 'merkez' ? 18 : 14), dpt = 10 + r() * 14;
          const back = W / 2 + 6 + dpt / 2 + r() * (tema === 'otoyol' ? 60 : 8);
          G.PIST.sample(T, s, sg * back, o);
          if (rd(o.x, o.z) < W / 2 + 4 + Math.max(w, dpt) / 2) continue;
          const t = Math.pow(r(), tema === 'merkez' ? 0.8 : 1.6);
          const h = hMin + (hMax - hMin) * t;
          const bi = t < 0.33 ? 0 : t < 0.7 ? 1 : 2;
          placed[bi].push([o.x, o.y, o.z, o.h, w, h, dpt, Math.floor(r() * bTone.length)]);
          // ikinci sıra (daha arkada, daha yüksek)
          if (tema === 'merkez' && r() < 0.6) {
            G.PIST.sample(T, s + 5, sg * (back + dpt + 8), o);
            if (rd(o.x, o.z) > W / 2 + 20) placed[2].push([o.x, o.y, o.z, o.h, w * 1.2, h * 1.4 + 20, dpt, Math.floor(r() * bTone.length)]);
          }
        }
      }
      const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
      placed.forEach((arr, bi) => {
        if (!arr.length) return;
        const rows = [4, 10, 24][bi];
        const [tex, emi] = windowTex(4, rows, isNight ? 0.3 : 0.12, '#8a8a92'); tex.repeat.set(2, 1); emi.repeat.set(2, 1); disposables.push(tex, emi);
        const bm = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: emi, emissive: col('#ffffff'), emissiveIntensity: isNight ? 0.75 : opts.saat === 'aksam' ? 0.45 : 0 });
        const im = new THREE.InstancedMesh(bg, bm, arr.length);
        const cc = new THREE.Color();
        arr.forEach((b, i) => {
          q4.setFromAxisAngle(v3.set(0, 1, 0), b[3]);
          m4.compose(new THREE.Vector3(b[0], b[1] - 0.5, b[2]), q4, new THREE.Vector3(b[4], b[5], b[6]));
          im.setMatrixAt(i, m4);
          cc.set(bTone[b[7]]); if (!isNight) cc.lerp(col('#ffffff'), 0.25);
          im.setColorAt(i, cc);
        });
        add(im);
        // çatı detayları (anten, su deposu)
        if (bi >= 1 && q >= 1) {
          const rg = new THREE.BoxGeometry(1, 1, 1); rg.translate(0, 0.5, 0);
          const rim = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: '#333338' }), arr.length);
          arr.forEach((b, i) => {
            q4.setFromAxisAngle(v3.set(0, 1, 0), b[3]);
            m4.compose(new THREE.Vector3(b[0], b[1] + b[5] - 0.5, b[2]), q4, new THREE.Vector3(b[4] * 0.3, 2 + (i % 3), b[6] * 0.3));
            rim.setMatrixAt(i, m4);
          });
          add(rim);
          // kırmızı uyarı ışıkları (gökdelen tepeleri)
          if (bi === 2 && isNight) {
            const rp = []; arr.forEach(b => rp.push(b[0], b[1] + b[5] + 3, b[2]));
            const rl = add(glowPoints(rp, col('#ff2020'), 3));
            anim.push(t => { rl.material.opacity = 0.4 + 0.6 * (Math.sin(t * 2.5) > 0 ? 1 : 0.2); });
          }
        }
      });
      // neon tabelalar (merkez, liman)
      if ((tema === 'merkez' || tema === 'liman' || tema === 'otoyol') && placed[1].length + placed[2].length) {
        const words = tema === 'merkez' ? ['OTEL', 'NEON', 'KEBAP', 'SİNEMA', 'BAR', '24 SAAT', 'DİSKO', 'ÇAY', 'BURGER', 'KULÜP'] : tema === 'liman' ? ['LİMAN', 'BALIK', 'DEPO 7', 'İSKELE', 'MEYHANE'] : ['KARALİMAN', 'ÇIKIŞ 12', 'MERKEZ →'];
        const cols = ['#ff2e63', '#00e5ff', '#ffea00', '#7c4dff', '#00e676', '#ff6d00'];
        const all = placed[1].concat(placed[2]);
        for (let i = 0; i < all.length; i += 3) {
          const b = all[i], wd = words[i % words.length], c = cols[i % cols.length];
          const tx = textTex(wd, '#050505', c, 256, 64); disposables.push(tx);
          const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(b[4] * 0.9, 12), 3), new THREE.MeshBasicMaterial({ map: tx, color: isNight ? col('#ffffff').multiplyScalar(2.6) : col('#aaaaaa') }));
          // tabela yola baksın
          G.PIST.sample(T, 0, 0, o);
          const ang = b[3];
          m.position.set(b[0], b[1] + Math.min(b[5] - 3, 6 + (i % 4) * 4), b[2]);
          m.rotation.y = ang;
          // binanın yola bakan yüzüne it
          const toRoad = Math.atan2(-(b[0] - cx), -(b[2] - cz));
          m.lookAt(m.position.x + Math.sin(ang + Math.PI / 2), m.position.y, m.position.z + Math.cos(ang + Math.PI / 2));
          const ri = rd(m.position.x + Math.sin(ang + Math.PI / 2) * 5, m.position.z + Math.cos(ang + Math.PI / 2) * 5);
          const rj = rd(m.position.x - Math.sin(ang + Math.PI / 2) * 5, m.position.z - Math.cos(ang + Math.PI / 2) * 5);
          const sgn = ri < rj ? 1 : -1;
          m.lookAt(m.position.x + sgn * Math.sin(ang + Math.PI / 2), m.position.y, m.position.z + sgn * Math.cos(ang + Math.PI / 2));
          m.position.x += sgn * Math.sin(ang + Math.PI / 2) * (b[6] / 2 + 0.2);
          m.position.z += sgn * Math.cos(ang + Math.PI / 2) * (b[6] / 2 + 0.2);
          void toRoad;
          add(m);
        }
      }
    }

    // Gerçek cepheli binalar: yol boyunca kesintisiz cadde, dünya ölçekli doku (pencere boyutu sabit)
    function buildCity() {
      const F = VA.facade, NB = F.length;
      const bk = F.map(() => ({ up: { p: [], n: [], u: [], i: [] }, sh: { p: [], n: [], u: [], i: [] } }));
      const roof = { p: [], n: [], u: [], i: [] };
      const trim = { p: [], n: [], u: [], i: [] };   // korkuluk ve çatı yapıları (beton)
      const gl = VA.glass.map(() => ({ p: [], n: [], u: [], i: [] }));
      const tmpM = new THREE.Matrix4(), tq = new THREE.Quaternion(), ty = new THREE.Vector3(0, 1, 0);
      const pushBox = (dst, rf, x, y, z, yaw, w, h, d, vScale, vOff) => {
        const g = new THREE.BoxGeometry(w, h, d);
        const uv = g.attributes.uv;
        // yüz sırası: +x, -x, +y, -y, +z, -z (her biri 4 köşe)
        const fw = [d, d, w, w, w, w];
        for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
          const i = f * 4 + k;
          if (f === 2 || f === 3) uv.setXY(i, uv.getX(i) * w / 10, uv.getY(i) * d / 10);
          else uv.setXY(i, uv.getX(i) * fw[f] / 12, vOff + uv.getY(i) * h / vScale);
        }
        tq.setFromAxisAngle(ty, yaw); tmpM.compose(new THREE.Vector3(x, y, z), tq, new THREE.Vector3(1, 1, 1));
        g.applyMatrix4(tmpM);
        const P = g.attributes.position, N = g.attributes.normal, idx = g.index;
        for (const [target, faces] of [[dst, [0, 1, 4, 5]], [rf, [2]]]) {
          if (!target) continue;
          for (const f of faces) {
            const base = target.p.length / 3;
            for (let k = 0; k < 4; k++) { const i = f * 4 + k; target.p.push(P.getX(i), P.getY(i), P.getZ(i)); target.n.push(N.getX(i), N.getY(i), N.getZ(i)); target.u.push(uv.getX(i), uv.getY(i)); }
            for (let e = 0; e < 6; e++) target.i.push(base + idx.getX(f * 6 + e) - f * 4);
          }
        }
        g.dispose();
      };
      const H = { liman: [7, 16], sanayi: [9, 22], merkez: [20, 75], sahil: [7, 14], otoyol: [24, 60] }[tema] || [8, 20];
      let nb = 0;
      for (const sg of [-1, 1]) {
        if (tema === 'sahil' && sg > 0) continue;
        let s0 = 4;
        while (s0 < T.L - 4 && nb < 700) {
          const w = [12, 18, 24, 18, 12][Math.floor(r() * 5)], d = 12 + r() * 10;
          const sm = s0 + w / 2;
          const front = W / 2 + 3.3 + (tema === 'otoyol' ? 40 + r() * 40 : tema === 'liman' || tema === 'sanayi' ? r() * 6 : 0);
          G.PIST.sample(T, sm, sg * (front + d / 2), o);
          const h0 = o.h, cx0 = o.x, cz0 = o.z, by = o.y;
          // köşeler yola girmesin
          let ok = !gapAt(sm, sg) && !(tema === 'otoyol' && r() < 0.4);
          const fx = Math.sin(h0), fz = Math.cos(h0), rx = -Math.cos(h0), rz = Math.sin(h0);
          for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
            if (!ok) break;
            const px = cx0 + fx * a * w / 2 + rx * b * d / 2, pz = cz0 + fz * a * w / 2 + rz * b * d / 2;
            if (rd(px, pz) < W / 2 + 2.9) ok = false;
          }
          if (ok) {
            const t = Math.pow(r(), tema === 'merkez' ? 0.9 : 1.4), h = Math.round((H[0] + (H[1] - H[0]) * t) / 3) * 3 + 4.5;
            const fi = Math.floor(r() * NB), B = bk[fi];
            const tall = (tema === 'merkez' || tema === 'otoyol') && h > 28 && r() < 0.65;
            pushBox(B.sh, null, cx0, by + 2.25 - 0.4, cz0, h0, w, 4.5 + 0.8, d, 5.3, 0);
            // v7: üst katlar zemin katın tam üstünden başlar (eskiden aradan 40 cm'lik yarık görünüyordu)
            pushBox(tall ? gl[Math.floor(r() * gl.length)] : B.up, roof, cx0, by + 4.45 + (h - 4.45) / 2, cz0, h0, w, h - 4.45, d, 9, 0);
            const top = by + h;
            // çatı korkuluğu (dört kenar) ve çatı yapıları
            for (const [ox, oz, ww, dd] of [[0, d / 2 - 0.15, w, 0.3], [0, -d / 2 + 0.15, w, 0.3], [w / 2 - 0.15, 0, 0.3, d], [-w / 2 + 0.15, 0, 0.3, d]])
              pushBox(trim, trim, cx0 + fx * ox + rx * oz, top + 0.45, cz0 + fz * ox + rz * oz, h0, ww, 0.9, dd, 3, 0);
            if (q >= 1) {
              const n = 1 + Math.floor(r() * 3);
              for (let k = 0; k < n; k++) {
                const ox = (r() - 0.5) * w * 0.6, oz = (r() - 0.5) * d * 0.5, kind = r();
                const sw = kind < 0.4 ? 2.5 : kind < 0.75 ? 1.5 : 3.5, sh2 = kind < 0.4 ? 2.2 : kind < 0.75 ? 1.2 : 3.2;
                pushBox(trim, trim, cx0 + fx * ox + rx * oz, top + sh2 / 2, cz0 + fz * ox + rz * oz, h0, sw, sh2, sw * (kind < 0.75 ? 1 : 1.4), 3, 0);
              }
            }
            nb++;
            // v12: yola bakan cephede klima, balkon, tente, dikey neon tabela
            if (q >= 1) {
              const ox0 = sg * Math.cos(h0), oz0 = -sg * Math.sin(h0), yawO = Math.atan2(ox0, oz0); // dışa (yola) bakan yön
              const fcx = cx0 + ox0 * d / 2, fcz = cz0 + oz0 * d / 2;
              const at = (along, out) => [fcx + fx * along + ox0 * out, fcz + fz * along + oz0 * out];
              if (!tall) {
                const floors = Math.floor((h - 6) / 3);
                const nAc = Math.min(8, Math.floor(floors * w / 12 * 0.6 * (q >= 3 ? 1.5 : 1)));
                for (let k = 0; k < nAc && DET.ac.length < 3500; k++) { const al = (r() - 0.5) * (w - 2), fl = 1 + Math.floor(r() * floors); const [x, z] = at(al, 0.28); DET.ac.push([x, by + 4.5 + fl * 3 + 0.4, z, yawO, 1, 1, 1]); }
                if (q >= 2 && r() < 0.45 && floors >= 2) {
                  const cols = Math.max(1, Math.floor(w / 6));
                  for (let fl = 1; fl < floors; fl++) for (let ci = 0; ci < cols; ci++) {
                    if (DET.bal.length > 2600) break;
                    const al = -w / 2 + (ci + 0.5) * w / cols, [x, z] = at(al, 0.55), [x2, z2] = at(al, 1.08), yb = by + 4.5 + fl * 3;
                    DET.bal.push([x, yb, z, yawO, 1, 1, 1]); DET.rail.push([x2, yb + 0.5, z2, yawO, 1, 1, 1]);
                  }
                }
              }
              const nAw = Math.floor(w / 6);
              for (let k = 0; k < nAw && r() < 0.8; k++) { const al = -w / 2 + (k + 0.5) * w / nAw, [x, z] = at(al, 0); DET.awn.push([x, by + 3.6, z, yawO, 1, 1, 1]); DET.awnC.push(['#c0392b', '#1e7a4a', '#2c5aa0', '#d68a1a', '#7b2d8b', '#222'][Math.floor(r() * 6)]); }
              if ((tema === 'merkez' || tema === 'liman' || tema === 'sahil') && r() < 0.22 && DET.neon.length < 34) { const sd = r() < 0.5 ? -1 : 1, [x, z] = at(sd * (w / 2 - 1.2), 0.9); DET.neon.push([x, by + 7 + r() * 4, z, h0]); }
            }
            // merkezde arkada ikinci sıra yüksek bloklar
            if (tema === 'merkez' && r() < 0.7) {
              G.PIST.sample(T, sm, sg * (front + d + 6 + d / 2), o);
              if (rd(o.x, o.z) > W / 2 + d) { const h2 = h + 20 + Math.round(r() * 40); const f2 = bk[Math.floor(r() * NB)]; pushBox(f2.up, roof, o.x, o.y + h2 / 2, o.z, o.h, w, h2, d, 9, 0); nb++; }
            }
          }
          s0 += w + (r() < 0.25 ? 3 + r() * 4 : 0.3);
        }
      }
      const mkMesh = (buf, mat) => {
        if (!buf.p.length) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.u, 2));
        g.setIndex(buf.i); g.computeBoundingSphere();
        const mh = new THREE.Mesh(g, mat); mh.userData.cast = true; add(mh);
      };
      const ei = night ? 0.6 : opts.saat === 'aksam' ? 0.2 : 0;
      const shade = night ? col('#6a6a78') : col('#ffffff');
      F.forEach((f, i) => {
        mkMesh(bk[i].up, new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emi, emissive: col('#ffffff'), emissiveIntensity: ei, roughness: 0.82, color: shade }));
        mkMesh(bk[i].sh, new THREE.MeshStandardMaterial({ map: f.shop, emissiveMap: f.shopEmi, emissive: col('#ffffff'), emissiveIntensity: night ? 0.55 : opts.saat === 'aksam' ? 0.35 : 0.05, roughness: 0.7, color: shade }));
      });
      const rt2 = G.VARLIK.tex('beton_diff', 1, 1); disposables.push(rt2);
      mkMesh(roof, new THREE.MeshLambertMaterial({ map: rt2, color: col('#77777a') }));
      mkMesh(trim, new THREE.MeshLambertMaterial({ map: rt2, color: col(night ? '#55555a' : '#a8a8aa') }));
      // cam kuleler: gökyüzünü yansıtır
      VA.glass.forEach((gv, i) => mkMesh(gl[i], new THREE.MeshStandardMaterial({ map: gv.map, emissiveMap: gv.emi, emissive: col('#ffffff'), emissiveIntensity: night ? 0.7 : 0, roughness: 0.12, metalness: 0.75, envMap: opts.env, envMapIntensity: 1.3 })));
    }

    // ── bölgeye özel süsler ──
    const instBox = (n, color, fnm) => {
      const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
      const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: color || '#ffffff' }), n);
      let k = 0; fnm((x, y, z, h, sx, sy, sz, c) => {
        if (k >= n) return;
        q4.setFromAxisAngle(v3.set(0, 1, 0), h); m4.compose(new THREE.Vector3(x, y, z), q4, new THREE.Vector3(sx, sy, sz));
        im.setMatrixAt(k, m4); if (c) im.setColorAt(k, col(c)); k++;
      });
      im.count = k; add(im); return im;
    };
    if (tema === 'liman') {
      const cc = ['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad', '#16a085', '#7f8c8d'];
      instBox(1400, null, put => {
        for (let s = 0; s < T.L; s += 26 * (0.6 + r())) for (const sg of [-1, 1]) {
          if (r() < 0.35) continue;
          const off = W / 2 + 7 + r() * 30;
          G.PIST.sample(T, s, sg * off, o);
          if (rd(o.x, o.z) < W / 2 + 6) continue;
          const stack = 1 + Math.floor(r() * 3);
          for (let k = 0; k < stack; k++) put(o.x, o.y - 0.3 + k * 2.6, o.z, o.h + (r() < 0.5 ? 0 : Math.PI / 2), 2.4, 2.6, 6 + (r() < 0.5 ? 6 : 0), cc[Math.floor(r() * cc.length)]);
        }
      });
      // vinçler
      for (let i = 0; i < 6; i++) {
        G.PIST.sample(T, (i + 0.5) * T.L / 6, (i % 2 ? 1 : -1) * (W / 2 + 40), o);
        if (rd(o.x, o.z) < 25) continue;
        const cr = new THREE.Group(), cm = new THREE.MeshLambertMaterial({ color: '#e0a020' });
        for (const dx of [-4, 4]) for (const dz of [-4, 4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.8, 38, 0.8), cm); l.position.set(dx, 19, dz); cr.add(l); }
        const top = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 60), cm); top.position.set(0, 39, 10); cr.add(top);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), new THREE.MeshLambertMaterial({ color: '#444' })); cab.position.set(0, 36, 0); cr.add(cab);
        const lt = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: glow, color: 0xff3030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); lt.position.set(0, 42, 38); cr.add(lt);
        cr.position.set(o.x, o.y, o.z); cr.rotation.y = o.h + r() * 2; add(cr);
      }
    } else if (tema === 'sanayi') {
      const chim = [];
      for (let s = 50; s < T.L; s += 130 * (0.6 + r())) { const sg = r() < 0.5 ? -1 : 1; G.PIST.sample(T, s, sg * (W / 2 + 30 + r() * 40), o); if (rd(o.x, o.z) > 22) chim.push([o.x, o.y, o.z, 25 + r() * 35]); }
      const cg = new THREE.CylinderGeometry(1.4, 2.2, 1, 10); cg.translate(0, 0.5, 0);
      const cim = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: '#6a5a50' }), Math.max(1, chim.length));
      chim.forEach((c, i) => { m4.compose(new THREE.Vector3(c[0], c[1], c[2]), q4.identity(), new THREE.Vector3(1, c[3], 1)); cim.setMatrixAt(i, m4); });
      cim.count = chim.length; add(cim);
      // baca dumanı
      const smT = glow;
      chim.slice(0, 14).forEach((c, i) => {
        for (let k = 0; k < 4; k++) {
          const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smT, color: isNight ? 0x555555 : 0xbbbbbb, transparent: true, opacity: 0.35, depthWrite: false }));
          sm.scale.setScalar(10); sm.position.set(c[0], c[1] + c[3] + 3 + k * 6, c[2]); add(sm);
          const ph = r() * 10;
          anim.push(t => { const u = ((t * 0.25 + ph + k * 0.25) % 1); sm.position.y = c[1] + c[3] + 2 + u * 26; sm.scale.setScalar(6 + u * 18); sm.material.opacity = 0.4 * (1 - u); });
        }
        const rl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff2020, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        rl.scale.setScalar(4); rl.position.set(c[0], c[1] + c[3] + 0.5, c[2]); add(rl);
        anim.push(t => { rl.material.opacity = Math.sin(t * 3 + i) > 0 ? 1 : 0.15; });
      });
      // tanklar
      const tg = new THREE.CylinderGeometry(6, 6, 9, 14); tg.translate(0, 4.5, 0);
      const tk = [];
      for (let s = 80; s < T.L; s += 210 * (0.6 + r())) { const sg = r() < 0.5 ? -1 : 1; G.PIST.sample(T, s, sg * (W / 2 + 16 + r() * 10), o); if (rd(o.x, o.z) > W / 2 + 10) tk.push([o.x, o.y, o.z]); }
      if (tk.length) { const tim = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: '#b0b4b8' }), tk.length); tk.forEach((t, i) => { m4.makeTranslation(t[0], t[1], t[2]); tim.setMatrixAt(i, m4); }); add(tim); }
    } else if (tema === 'sahil' || tema === 'merkez' || tema === 'otoyol') {
      // palmiyeler (sahil) / ağaçlar (merkez refüj)
      if (tema === 'sahil') {
        const pal = [];
        for (let s = 0; s < T.L; s += 18 * (0.7 + r())) for (const sg of [-1, 1]) { if (r() < 0.3) continue; G.PIST.sample(T, s, sg * (W / 2 + 2 + r() * 4), o); pal.push([o.x, o.y + 0.18, o.z, 7 + r() * 5, r() * 6.28, (r() - 0.5) * 0.3]); }
        const trG = new THREE.CylinderGeometry(0.18, 0.32, 1, 6); trG.translate(0, 0.5, 0);
        const tr = new THREE.InstancedMesh(trG, new THREE.MeshLambertMaterial({ color: '#7a5a3a' }), pal.length);
        const lfG = new THREE.ConeGeometry(3.2, 1.4, 7, 1, true); lfG.translate(0, -0.4, 0);
        const lf = new THREE.InstancedMesh(lfG, new THREE.MeshLambertMaterial({ color: isNight ? '#1a4a2a' : '#2a8a3a', side: THREE.DoubleSide }), pal.length);
        const e = new THREE.Euler();
        pal.forEach((p, i) => {
          e.set(p[5], p[4], p[5] * 0.5); q4.setFromEuler(e);
          m4.compose(new THREE.Vector3(p[0], p[1], p[2]), q4, new THREE.Vector3(1, p[3], 1)); tr.setMatrixAt(i, m4);
          const top = new THREE.Vector3(0, p[3], 0).applyQuaternion(q4);
          m4.compose(new THREE.Vector3(p[0] + top.x, p[1] + top.y, p[2] + top.z), q4, new THREE.Vector3(1, 1, 1)); lf.setMatrixAt(i, m4);
        });
        add(tr); add(lf);
      }
    }
    if (tema === 'dag') {
      // çam ormanı ve kayalar
      const pines = [];
      for (let s = 0; s < T.L; s += 7) for (const sg of [-1, 1]) {
        if (r() < 0.25) continue;
        const off = W / 2 + 5 + Math.pow(r(), 0.7) * 70;
        G.PIST.sample(T, s, sg * off, o);
        if (rd(o.x, o.z) < W / 2 + 4) continue;
        pines.push([o.x, o.y - 0.5 - (off - W / 2) * 0.03, o.z, 6 + r() * 9]);
      }
      const pg = mergeCones();
      const pm = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: isNight ? '#0e2a1a' : '#1f5a32' }), pines.length);
      const tg = new THREE.CylinderGeometry(0.2, 0.25, 1, 5); tg.translate(0, 0.5, 0);
      const tm = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: '#4a3020' }), pines.length);
      pines.forEach((p, i) => {
        m4.compose(new THREE.Vector3(p[0], p[1] + p[3] * 0.25, p[2]), q4.identity(), new THREE.Vector3(p[3] * 0.32, p[3], p[3] * 0.32)); pm.setMatrixAt(i, m4);
        m4.compose(new THREE.Vector3(p[0], p[1], p[2]), q4.identity(), new THREE.Vector3(1, p[3] * 0.3, 1)); tm.setMatrixAt(i, m4);
      });
      add(pm); add(tm);
      const rg = new THREE.DodecahedronGeometry(1, 0);
      const rocks = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: '#6a665e' }), 300);
      let rk = 0; const e = new THREE.Euler();
      for (let s = 0; s < T.L && rk < 300; s += 30 * (0.5 + r())) { const sg = r() < 0.5 ? -1 : 1; G.PIST.sample(T, s, sg * (W / 2 + 4 + r() * 20), o); if (rd(o.x, o.z) < W / 2 + 3) continue; const sz = 1 + r() * 3; e.set(r() * 3, r() * 3, r() * 3); q4.setFromEuler(e); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q4, new THREE.Vector3(sz, sz * 0.7, sz)); rocks.setMatrixAt(rk++, m4); }
      rocks.count = rk; add(rocks);
    }
    // otoyol tabelaları
    if (tema === 'otoyol' || tema === 'merkez') {
      for (let s = 300; s < T.L - 100; s += 600) {
        G.PIST.sample(T, s, 0, o);
        const gg = new THREE.Group(), pm = new THREE.MeshLambertMaterial({ color: '#555' });
        for (const sg of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), pm); p.position.set(sg * (W / 2 + 1), 3.5, 0); gg.add(p); }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 0.4, 0.4), pm); beam.position.y = 7; gg.add(beam);
        const tx = textTex(['KARALİMAN {^}', 'KÖPRÜ 2 KM {^}', '{<} LİMAN', 'ÇIKIŞ 7 {/}', 'MERKEZ {>}', '{<} SANAYİ', 'SAHİL {/}'][Math.floor(s / 600) % 7], '#0b5e2a', '#ffffff', 320, 80, { frame: 1 }); disposables.push(tx);
        const sgn = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.3), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); sgn.position.y = 8.4; sgn.rotation.y = Math.PI; gg.add(sgn);
        gg.position.set(o.x, o.y, o.z); gg.rotation.y = o.h; add(gg);
      }
    }

    // ── sokak ayrıntıları: park etmiş arabalar, ağaçlar, musluk/çöp kutusu/bank, yaya geçidi, rögar ──
    const inst = (geo, mtl, list, colors, flat) => {
      if (!list.length) return null;
      if (list.length > 24 && !flat) {
        const ci = colors ? new Map(list.map((b, i) => [b, colors[i]])) : null; let last = null;
        for (const part of chunk(list)) last = inst(geo, mtl, part, ci ? part.map(b => ci.get(b)) : null, true);
        return last;
      }
      const im = new THREE.InstancedMesh(geo, mtl, list.length), e = new THREE.Euler(), cc = new THREE.Color();
      list.forEach((b, i) => {
        e.set(b[7] || 0, b[3], 0); q4.setFromEuler(e);
        m4.compose(new THREE.Vector3(b[0], b[1], b[2]), q4, new THREE.Vector3(b[4], b[5], b[6])); im.setMatrixAt(i, m4);
        if (colors) im.setColorAt(i, cc.set(colors[i]));
      });
      return add(im);
    };
    // ── v12 bina ayrıntıları ──
    if (DET.ac.length) {
      const acG = new THREE.BoxGeometry(0.9, 0.62, 0.5);
      inst(acG, new THREE.MeshLambertMaterial({ color: night ? '#6a6d72' : '#c9ccd0' }), DET.ac);
    }
    if (DET.bal.length) {
      inst(new THREE.BoxGeometry(2.6, 0.16, 1.1), new THREE.MeshLambertMaterial({ color: night ? '#55565a' : '#bdbab2' }), DET.bal);
      inst(new THREE.BoxGeometry(2.6, 0.95, 0.05), new THREE.MeshStandardMaterial({ color: '#2a3340', roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.75, envMap: opts.env }), DET.rail);
    }
    if (DET.awn.length) {
      const ag2 = new THREE.PlaneGeometry(3.4, 1.4); ag2.rotateX(-Math.PI / 2); ag2.translate(0, 0, 0.7); ag2.rotateX(0.38);
      inst(ag2, new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }), DET.awn, DET.awnC);
    }
    if (DET.neon.length) {
      const NW = { merkez: ['OTEL', 'BAR', 'KULÜP', 'SİNEMA', 'DİSKO', 'NEON'], liman: ['BALIK', 'İSKELE', 'MEYHANE', 'OTEL'], sahil: ['PLAJ', 'OTEL', 'KAFE', 'DONDURMA'] }[tema] || ['OTEL'];
      const NC = ['#ff2e63', '#00e5ff', '#ffea00', '#b46cff', '#00e676', '#ff6d00'];
      DET.neon.forEach((n, i) => {
        const word = NW[i % NW.length], c = NC[(i * 7) % NC.length];
        const cv = cvs(64, 32 + word.length * 52), x = cv.getContext('2d');
        x.fillStyle = '#0a0a10'; x.fillRect(0, 0, cv.width, cv.height); x.strokeStyle = c; x.lineWidth = 4; x.strokeRect(4, 4, 56, cv.height - 8);
        x.fillStyle = c; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        [...word].forEach((ch, j) => x.fillText(ch, 32, 42 + j * 52));
        const t = new THREE.CanvasTexture(cv); disposables.push(t);
        const hgt = 1.15 * cv.height / 64;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, hgt), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, color: col('#ffffff').multiplyScalar(night ? 2.4 : opts.saat === 'aksam' ? 1.4 : 0.85) }));
        m.position.set(n[0], n[1] + hgt / 2, n[2]); m.rotation.y = n[3] + Math.PI; add(m);
      });
    }
    // v12: yağmurda yolda su birikintileri (gökyüzünü ve ışıkları yansıtır)
    if (wet && q >= 1) {
      const pd = [], cg2 = new THREE.CircleGeometry(1, 18); cg2.rotateX(-Math.PI / 2);
      for (let s0 = 30; s0 < T.L - 20; s0 += 6 + r() * 14) {
        G.PIST.sample(T, s0, (r() - 0.5) * (W - 2), o);
        pd.push([o.x, o.y + 0.025, o.z, o.h + r(), 0.8 + r() * 2.2, 1, 0.5 + r() * 1.3]);
      }
      inst(cg2, new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.04, metalness: 0.95, envMap: opts.env, envMapIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), pd);
    }
    // ── v9: yol tabelaları, viraj uyarıları, reklam panoları, şerit okları ──
    {
      const signY = s0 => { G.PIST.sample(T, s0, 0, o); return o.y; };
      // viraj uyarı levhaları (sarı-siyah ok dizisi, keskin virajın dış kenarında)
      const chevTex = dir => {
        const c = cvs(64, 80), x = c.getContext('2d');
        x.fillStyle = '#111'; x.fillRect(0, 0, 64, 80); x.fillStyle = '#ffd600'; x.fillRect(4, 4, 56, 72);
        x.strokeStyle = '#111'; x.lineWidth = 11; x.lineJoin = 'miter'; x.beginPath();
        if (dir < 0) { x.moveTo(42, 14); x.lineTo(20, 40); x.lineTo(42, 66); } else { x.moveTo(22, 14); x.lineTo(44, 40); x.lineTo(22, 66); }
        x.stroke(); const t = new THREE.CanvasTexture(c); disposables.push(t); return t;
      };
      const chevL = [], chevR = [], poles = [];
      for (let s0 = 60; s0 < T.L - 60; s0 += 4) {
        const k = G.PIST.curvAt(T, s0);
        if (Math.abs(k) < 0.011) continue;
        const run = []; let e = s0; while (e < T.L - 60 && Math.abs(G.PIST.curvAt(T, e)) >= 0.009) { run.push(e); e += 4; }
        if (run.length >= 6) {
          const sg = k > 0 ? 1 : -1; // sola dönen virajın dışı = sağ
          for (let x0 = run[0]; x0 <= run[run.length - 1]; x0 += 13) {
            if (gapAt(x0, sg)) continue;
            G.PIST.sample(T, x0, sg * (W / 2 + 1.4), o);
            (k > 0 ? chevL : chevR).push([o.x, o.y + 1.55, o.z, o.h + Math.PI, 1, 1, 1]);
            poles.push([o.x, o.y + 0.5, o.z, o.h, 1, 1, 1]);
          }
        }
        s0 = e + 30;
      }
      const cg = new THREE.PlaneGeometry(0.9, 1.15);
      inst(cg, new THREE.MeshBasicMaterial({ map: chevTex(-1), color: col(night ? '#e6e6e6' : '#ffffff') }), chevL);
      inst(cg, new THREE.MeshBasicMaterial({ map: chevTex(1), color: col(night ? '#e6e6e6' : '#ffffff') }), chevR);
      // hız sınırı levhaları
      const lim = { merkez: 50, liman: 50, sanayi: 70, sahil: 70, dag: 60, otoyol: 120 }[tema] || 70;
      const sc = cvs(128, 128), sx = sc.getContext('2d');
      sx.fillStyle = '#d01818'; sx.beginPath(); sx.arc(64, 64, 62, 0, 7); sx.fill();
      sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(64, 64, 47, 0, 7); sx.fill();
      sx.fillStyle = '#111'; sx.font = `bold ${lim >= 100 ? 44 : 56}px sans-serif`; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillText(String(lim), 64, 68);
      const st = new THREE.CanvasTexture(sc); disposables.push(st);
      const lims = [];
      for (let s0 = 220; s0 < T.L - 100; s0 += 520) {
        const sg = 1; if (gapAt(s0, sg)) continue;
        G.PIST.sample(T, s0, sg * (W / 2 + 1.6), o);
        lims.push([o.x, o.y + 2.6, o.z, o.h + Math.PI, 1, 1, 1]); poles.push([o.x, o.y + 1.1, o.z, o.h, 1, 2.2, 1]);
      }
      inst(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ map: st, transparent: true, color: col(night ? '#dddddd' : '#ffffff') }), lims);
      const pg = new THREE.BoxGeometry(0.08, 1, 0.08); pg.translate(0, 0, 0);
      inst(pg, new THREE.MeshLambertMaterial({ color: '#8a8f96' }), poles);
      // rampa uyarısı
      for (const rp of RAMPS) {
        if (rp.sc) continue;
        const sg = rp.d0 > 0 ? 1 : -1;
        G.PIST.sample(T, rp.s0 - 45, sg * (W / 2 + 1.6), o);
        const g = new THREE.Group();
        const pl2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.1), new THREE.MeshLambertMaterial({ color: '#8a8f96' })); pl2.position.y = 1.5; g.add(pl2);
        const tx = textTex('RAMPA {^}', '#ffd600', '#111', 256, 80, { frame: 1 }); disposables.push(tx);
        const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshBasicMaterial({ map: tx })); bd.position.y = 3.1; bd.rotation.y = Math.PI; g.add(bd);
        g.position.set(o.x, o.y, o.z); g.rotation.y = o.h; add(g);
      }
      // yol üstü şerit okları (beyaz)
      const ac = cvs(64, 128), ax = ac.getContext('2d'); ax.fillStyle = 'rgba(240,240,240,0.85)'; drawArrow(ax, 32, 64, 120, 0);
      const at = new THREE.CanvasTexture(ac); disposables.push(at);
      const nl = Math.max(2, Math.round(W / 3.5)), lw = W / nl, arrs = [];
      for (let s0 = 140; s0 < T.L - 80; s0 += 260) {
        if (G.PIST.maxCurv(T, s0 - 10, 20) > 0.008) continue;
        for (let i = 0; i < nl; i++) { G.PIST.sample(T, s0, -W / 2 + (i + 0.5) * lw, o); arrs.push([o.x, o.y + 0.035, o.z, o.h + Math.PI, 1, 1, 1]); }
      }
      const ag = new THREE.PlaneGeometry(1.1, 2.6); ag.rotateX(-Math.PI / 2);
      inst(ag, new THREE.MeshBasicMaterial({ map: at, transparent: true, depthWrite: false, color: col(night ? '#bbbbbb' : '#ffffff') }), arrs);
      // reklam panoları (kurgusal markalar). Şehirde kaldırımda ışıklı pano, açık arazide dev pano
      const ADS = [['TURBO KOLA', 'Serinliği hisset', '#c62828', '#ffffff', 'daire'], ['KARALİMAN FM 98.4', 'Gecenin sesi', '#4a148c', '#00e5ff', 'dalga'],
        ['ŞİMŞEK LASTİK', 'Virajda bile yapışır', '#212121', '#ffd600', 'simsek'], ['GECE BURGER', '24 saat açık', '#e65100', '#fff3e0', 'daire'],
        ['KALKAN SİGORTA', 'Hasar mı? Biz varız', '#0d47a1', '#ffffff', 'kalkan'], ['NEON PİZZA', 'Kapına 20 dakikada', '#00695c', '#ff4081', 'dalga'],
        ['BORA OTO SERVİS', 'Sanayi Sitesi No: 7', '#37474f', '#ffb300', 'anahtar'], ['KARALİMAN EMNİYETİ', 'Hız öldürür. Yavaşla.', '#1a237e', '#ffffff', 'yildiz']];
      const adTex = ad => {
        const c = cvs(512, 256), x = c.getContext('2d');
        const gr = x.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, ad[2]); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
        x.fillStyle = ad[3]; x.globalAlpha = 0.9;
        if (ad[4] === 'daire') { x.beginPath(); x.arc(430, 128, 80, 0, 7); x.fill(); }
        else if (ad[4] === 'dalga') { x.lineWidth = 10; x.strokeStyle = ad[3]; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(440, 128, 30 + i * 28, -0.8, 0.8); x.stroke(); } }
        else if (ad[4] === 'simsek') { x.beginPath(); x.moveTo(450, 30); x.lineTo(395, 140); x.lineTo(435, 140); x.lineTo(410, 230); x.lineTo(480, 110); x.lineTo(440, 110); x.closePath(); x.fill(); }
        else if (ad[4] === 'kalkan') { x.beginPath(); x.moveTo(430, 40); x.lineTo(490, 65); x.quadraticCurveTo(485, 180, 430, 220); x.quadraticCurveTo(375, 180, 370, 65); x.closePath(); x.fill(); }
        else if (ad[4] === 'anahtar') { x.lineWidth = 26; x.lineCap = 'round'; x.strokeStyle = ad[3]; x.beginPath(); x.moveTo(380, 200); x.lineTo(460, 80); x.stroke(); x.beginPath(); x.arc(462, 70, 30, 0, 7); x.fill(); }
        else drawStar(x, 430, 128, 85);
        x.globalAlpha = 1; x.fillStyle = '#ffffff'; x.textBaseline = 'middle';
        let fs = 58; x.font = `900 ${fs}px sans-serif`; while (x.measureText(ad[0]).width > 340 && fs > 20) { fs -= 2; x.font = `900 ${fs}px sans-serif`; }
        x.fillText(ad[0], 24, 100); x.font = '600 30px sans-serif'; x.fillStyle = ad[3]; x.fillText(ad[1], 26, 170);
        x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(24, 132, 120, 5);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; disposables.push(t); return t;
      };
      const adMats = ADS.map(ad => { const t = adTex(ad); return new THREE.MeshLambertMaterial({ map: t, emissive: col('#ffffff'), emissiveMap: t, emissiveIntensity: night ? 0.95 : opts.saat === 'aksam' ? 0.45 : 0.12 }); });
      const open = tema === 'otoyol' || tema === 'dag' || tema === 'sahil';
      const frameM = new THREE.MeshLambertMaterial({ color: '#2a2d33' }), poleG = new THREE.BoxGeometry(0.25, 1, 0.25);
      let ai = Math.floor(r() * ADS.length), placedAd = 0;
      for (let s0 = 180; s0 < T.L - 120 && placedAd < 40; s0 += open ? 300 + r() * 200 : 110 + r() * 90) {
        const sg = tema === 'sahil' ? 1 : (r() < 0.5 ? -1 : 1);
        if (gapAt(s0, sg)) continue;
        const big = open, back = big ? W / 2 + 11 : W / 2 + 2.3;
        G.PIST.sample(T, s0, sg * back, o);
        if (rd(o.x, o.z) < back - 0.5) continue; // virajın içinde yola taşmasın
        const g = new THREE.Group(), m = adMats[ai++ % ADS.length];
        const bw = big ? 11 : 2.6, bh = big ? 5.2 : 1.3, by = big ? 7 : 1.55;
        const fr = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, bh + 0.3, 0.25), frameM); fr.position.set(0, by, 0.14); g.add(fr);
        const pnl = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), m); pnl.position.set(0, by, 0); pnl.rotation.y = Math.PI; g.add(pnl);
        for (const px of big ? [-bw * 0.3, bw * 0.3] : [-bw * 0.42, bw * 0.42]) { const pp = new THREE.Mesh(poleG, frameM); pp.scale.y = by - bh / 2; pp.position.set(px, (by - bh / 2) / 2, 0.14); g.add(pp); }
        if (big && night) { const lt = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.15, 0.5), new THREE.MeshBasicMaterial({ color: col('#fff4d0').multiplyScalar(2) })); lt.position.set(0, by + bh / 2 + 0.25, -0.3); g.add(lt); }
        g.position.set(o.x, o.y, o.z); g.rotation.y = o.h + sg * (big ? 0.45 : 0.25);
        add(g); placedAd++;
      }
      // otobüs durakları (şehirde): çatı, arka cam, bank, yan reklam, DURAK levhası
      if (!open) {
        const roofM = new THREE.MeshLambertMaterial({ color: '#3a3f47' }), glassM = new THREE.MeshLambertMaterial({ color: '#9fc4d8', transparent: true, opacity: 0.35 });
        const benchM = new THREE.MeshLambertMaterial({ color: '#7a5634' });
        const dtx = textTex('DURAK', '#1565c0', '#ffffff', 128, 64, { frame: 1 }); disposables.push(dtx);
        const dM = new THREE.MeshBasicMaterial({ map: dtx, side: THREE.DoubleSide });
        for (let s0 = 350; s0 < T.L - 150; s0 += 650 + r() * 250) {
          const sg = r() < 0.5 ? -1 : 1; if (gapAt(s0, sg)) continue;
          G.PIST.sample(T, s0, sg * (W / 2 + 2.2), o);
          if (rd(o.x, o.z) < W / 2 + 1.6) continue;
          const g = new THREE.Group(), side = sg; // cam dış tarafta (z = -side), levha yol tarafında
          const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
          box(4.2, 0.12, 1.8, 0, 2.5, 0, roofM);
          box(4.0, 2.2, 0.05, 0, 1.3, side * -0.85, glassM);
          for (const x of [-2, 2]) box(0.08, 2.5, 0.08, x, 1.25, side * -0.85, roofM);
          box(2.6, 0.08, 0.45, 0, 0.5, side * -0.55, benchM);
          const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), adMats[Math.floor(r() * adMats.length)]); ad.position.set(2.05, 1.3, 0); ad.rotation.y = Math.PI / 2; g.add(ad);
          const sgn = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), dM); sgn.position.set(-2.1, 2.85, 0.6 * side); g.add(sgn);
          g.position.set(o.x, o.y, o.z); g.rotation.y = o.h + Math.PI / 2; // yerel +x geriye, +z sürücünün soluna bakar
          add(g);
        }
      }
    }
    const city = tema !== 'dag' && tema !== 'otoyol';
    if (city && q >= 1) {
      const PC = ['#c0392b', '#2c3e50', '#bdc3c7', '#7f8c8d', '#ecf0f1', '#2980b9', '#16a085', '#8e44ad', '#d35400', '#111111', '#f1c40f'];
      const parked = [], pcol = [];
      for (let s0 = 40; s0 < T.L - 40; s0 += q >= 3 ? 7 + r() * 15 : 9 + r() * 22) {
        const sg = r() < 0.5 ? -1 : 1;
        if (gapAt(s0, sg) || r() < (q >= 3 ? 0.2 : 0.35)) continue;
        if (RAMPS.some(rp => !rp.sc && Math.abs(rp.s0 - s0) < 20)) continue;
        G.PIST.sample(T, s0, sg * (W / 2 + 1.6), o);
        if (rd(o.x, o.z) < W / 2 + 1) continue;
        parked.push([o.x, o.y + 0.18, o.z, o.h + (r() < 0.5 ? 0 : Math.PI), 1, 1, 1]); pcol.push(PC[Math.floor(r() * PC.length)]);
      }
      const [pb, pcab, PB] = G.ARABA3D.parkGeo('sedan');
      pb.scale(0.82, 0.92, 0.82); pcab.scale(0.82, 0.92, 0.82);
      inst(pb, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.5, envMap: opts.env, envMapIntensity: 0.9 }), parked, pcol);
      inst(pcab, new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.1, metalness: 0.9, envMap: opts.env }), parked);
      const wg = new THREE.CylinderGeometry(0.3, 0.3, 1.55, 10); wg.rotateZ(Math.PI / 2);
      const whl = []; parked.forEach(b => { for (const dz of [-1.2, 1.2]) { const sx = Math.sin(b[3]), cz = Math.cos(b[3]); whl.push([b[0] + sx * dz, b[1] + 0.3, b[2] + cz * dz, b[3], 1, 1, 1]); } });
      inst(wg, new THREE.MeshLambertMaterial({ color: '#111' }), whl);
      void PB;
      // ağaçlar (sahil hariç: orada palmiye var)
      if (tema !== 'sahil') {
        const tr = [];
        for (let s0 = 20; s0 < T.L - 20; s0 += 24 + r() * 20) for (const sg of [-1, 1]) {
          if (gapAt(s0, sg) || r() < 0.4) continue;
          G.PIST.sample(T, s0, sg * (W / 2 + 2.6), o);
          if (rd(o.x, o.z) < W / 2 + 2) continue;
          tr.push([o.x, o.y + 0.18, o.z, r() * 6, 1, 0.8 + r() * 0.5, 1]);
        }
        const tg = new THREE.CylinderGeometry(0.12, 0.18, 2.6, 6); tg.translate(0, 1.3, 0);
        inst(tg, new THREE.MeshLambertMaterial({ color: '#4a3324' }), tr);
        const fg = crownGeo();
        const fcol = tr.map(() => ['#d8e8c8', '#ffffff', '#c8d8b0', '#e8f0d0'][Math.floor(r() * 4)]);
        inst(fg, VA && VA.leaf ? new THREE.MeshLambertMaterial({ map: VA.leaf, color: isNight ? '#56606a' : '#ffffff' }) : new THREE.MeshLambertMaterial({ color: isNight ? '#8899aa' : '#ffffff', flatShading: true }), tr, fcol);
        // ağaç dibinde saksı
        const pg = new THREE.CylinderGeometry(0.75, 0.8, 0.35, 8); pg.translate(0, 0.17, 0);
        inst(pg, new THREE.MeshLambertMaterial({ color: '#6a6a70' }), tr);
      }
      // küçük eşyalar
      const hyd = [], bin = [], bench = [];
      for (let s0 = 15; s0 < T.L - 15; s0 += 18 + r() * 25) {
        const sg = r() < 0.5 ? -1 : 1; if (gapAt(s0, sg)) continue;
        G.PIST.sample(T, s0, sg * (W / 2 + 0.7), o);
        const k = r(), b = [o.x, o.y + 0.18, o.z, o.h + (sg > 0 ? -Math.PI / 2 : Math.PI / 2), 1, 1, 1];
        (k < 0.35 ? hyd : k < 0.7 ? bin : bench).push(b);
      }
      const toMats = list => list.map(b => { const mm = new THREE.Matrix4(); q4.setFromAxisAngle(v3.set(0, 1, 0), b[3]); mm.compose(new THREE.Vector3(b[0], b[1], b[2]), q4, new THREE.Vector3(1, 1, 1)); return mm; });
      // gerçek modeller sadece hafif olanlar ve seyrek: çöp kutusu kümesi, elektrik kutusu
      const binM = bin.filter((b, i) => i % 3 === 0), boxM = hyd.filter((b, i) => i % 3 === 1);
      const okBin = VA && q >= 1 && instModel('metal_trash_can', toMats(binM), 1);
      const okBox = VA && q >= 1 && instModel('utility_box_01', toMats(boxM), 1.3);
      const hg = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8); hg.translate(0, 0.35, 0);
      const hc = new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); hc.translate(0, 0.7, 0);
      const hydM = new THREE.MeshStandardMaterial({ color: '#b8202a', roughness: 0.5, metalness: 0.3 });
      const hydL = okBox ? hyd.filter((b, i) => i % 3 !== 1) : hyd;
      const okHyd = VA && q >= 1 && instModel('fire_hydrant', toMats(hydL), 1.1);
      if (!okHyd) { inst(hg, hydM, hydL); inst(hc, hydM, hydL); }
      const bg = new THREE.CylinderGeometry(0.28, 0.24, 0.9, 12); bg.translate(0, 0.45, 0);
      inst(bg, new THREE.MeshStandardMaterial({ color: '#2a4a3a', roughness: 0.6, metalness: 0.5 }), okBin ? bin.filter((b, i) => i % 3 !== 0) : bin);
      const beg = new THREE.BoxGeometry(1.6, 0.08, 0.45); beg.translate(0, 0.45, 0);
      const bkg = new THREE.BoxGeometry(1.6, 0.4, 0.06); bkg.translate(0, 0.7, -0.2);
      const benchM = new THREE.MeshLambertMaterial({ color: '#6a4a30' });
      const okBench = VA && q >= 1 && instModel('modular_street_seating', toMats(bench), 0.7);
      if (!okBench) { inst(beg, benchM, bench); inst(bkg, benchM, bench); }
    }
    // yaya geçitleri ve rögar kapakları (yol üstü çıkartma)
    if (city) {
      const zc = cvs(128, 64), zx = zc.getContext('2d');
      zx.clearRect(0, 0, 128, 64); zx.fillStyle = 'rgba(240,240,230,0.85)';
      for (let i = 0; i < 128; i += 16) zx.fillRect(i + 2, 0, 9, 64);
      const zt = new THREE.CanvasTexture(zc); disposables.push(zt);
      const zm = new THREE.MeshLambertMaterial({ map: zt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      for (let s0 = 150; s0 < T.L - 100; s0 += 260 + r() * 200) {
        if (P_curv(s0) > 0.006) continue;
        G.PIST.sample(T, s0, 0, o);
        const zz = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 3.5), zm);
        zz.rotation.x = -Math.PI / 2; zz.rotation.z = o.h + Math.PI; zz.position.set(o.x, o.y + 0.03, o.z); zz.renderOrder = 1; add(zz);
      }
      const mh = [];
      for (let s0 = 30; s0 < T.L - 30; s0 += 40 + r() * 60) { G.PIST.sample(T, s0, (r() - 0.5) * W * 0.7, o); mh.push([o.x, o.y + 0.025, o.z, 0, 1, 1, 1]); }
      const mg = new THREE.CircleGeometry(0.45, 12); mg.rotateX(-Math.PI / 2);
      inst(mg, new THREE.MeshStandardMaterial({ color: '#202024', roughness: 0.4, metalness: 0.8, envMap: opts.env, polygonOffset: true, polygonOffsetFactor: -2 }), mh);
    }
    // bulutlar
    if (opts.hava !== 'sis' && q >= 1 && !SKP) {
      const cc = cvs(512, 512), cx2 = cc.getContext('2d');
      for (let i = 0; i < 70; i++) {
        const x0 = Math.random() * 512, y0 = Math.random() * 512, rr = 30 + Math.random() * 70;
        const g = cx2.createRadialGradient(x0, y0, 0, x0, y0, rr);
        g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        cx2.fillStyle = g; cx2.fillRect(x0 - rr, y0 - rr, rr * 2, rr * 2);
      }
      const ct = new THREE.CanvasTexture(cc); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(2, 2); disposables.push(ct);
      const cloudCol = opts.saat === 'gece' ? mix(zone.gok[0], '#3a3550', 0.5) : opts.saat === 'aksam' ? col('#ffb0a0') : col('#ffffff');
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshBasicMaterial({ map: ct, color: cloudCol, transparent: true, opacity: (opts.hava === 'yagmur' ? 0.8 : 0.5) * (opts.saat === 'gece' ? 0.6 : 1), fog: false, depthWrite: false }));
      cl.rotation.x = Math.PI / 2; cl.position.y = 420; cl.renderOrder = -7; skyGroup.add(cl);
      anim.push(t => { ct.offset.x = t * 0.004; });
    }

    // ── kestirmeler (ara sokak) ──
    if (SC.length) {
      const c = cvs(128, 256), x = c.getContext('2d');
      x.fillStyle = tema === 'dag' ? '#4a3f30' : '#3a3a40'; x.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 900; i++) { const v = 40 + Math.random() * 50; x.fillStyle = `rgba(${v},${v - 5},${v - 10},0.6)`; x.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
      x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) x.fillRect(Math.random() * 110, Math.random() * 256, 14, 30 + Math.random() * 60);
      x.fillStyle = '#ffd600'; for (let y = 0; y < 256; y += 64) { x.beginPath(); x.moveTo(64, y + 6); x.lineTo(86, y + 30); x.lineTo(42, y + 30); x.fill(); }
      const at = new THREE.CanvasTexture(c); at.wrapT = THREE.RepeatWrapping; disposables.push(at);
      const aM = new THREE.MeshLambertMaterial({ map: at });
      const w2 = document.createElement('canvas'); w2.width = 256; w2.height = 64; const wx = w2.getContext('2d');
      wx.fillStyle = tema === 'dag' ? '#5a4a3a' : '#5a5560'; wx.fillRect(0, 0, 256, 64);
      wx.strokeStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 256; i += 32) { wx.beginPath(); wx.moveTo(i, 0); wx.lineTo(i, 64); wx.stroke(); }
      const gcols = ['#ff2e63', '#00e5ff', '#ffd600', '#7c4dff', '#00e676'];
      for (let i = 0; i < 6; i++) { wx.fillStyle = gcols[i % 5]; wx.globalAlpha = 0.7; wx.font = 'bold 22px sans-serif'; if (i === 3) drawStar(wx, 22 + i * 42, 24 + (i % 2) * 18, 12); else wx.fillText(['KAÇ', 'GECE', 'HIZ', '', 'K.L', 'GAZ'][i], 10 + i * 42, 30 + (i % 2) * 18); }
      wx.globalAlpha = 1;
      const wt = new THREE.CanvasTexture(w2); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; disposables.push(wt);
      const wM = new THREE.MeshLambertMaterial({ map: wt, side: THREE.DoubleSide });
      for (const k of SC) {
        const K = k.T, w = K.W;
        add(new THREE.Mesh(ribbon(K, -w / 2, w / 2, 0.02, 12), aM));
        for (const sg of [-1, 1]) {
          // duvarlar: ağızlarda (ilk/son 14 m) yok
          const wall = ribbon(K, sg * (w / 2 + 0.2), sg * (w / 2 + 0.21), 0, 8, 2, 2.4, s0 => s0 < 14 || s0 > K.L - 14);
          add(new THREE.Mesh(wall, wM));
          add(new THREE.Mesh(ribbon(K, sg * w / 2, sg * (w / 2 + 6), -0.05, 10, 2, -0.05, s0 => s0 < 14 || s0 > K.L - 14), sideM));
        }
        // sokak lambası parıltıları (turuncu)
        const lp = [];
        for (let s0 = 20; s0 < K.L - 15; s0 += 28) { G.PIST.sample(K, s0, (s0 / 28 | 0) % 2 ? w / 2 - 0.5 : -w / 2 + 0.5, o); lp.push(o.x, o.y + 4.5, o.z); }
        if (lp.length) {
          add(glowPoints(lp, col('#ff9a3a').multiplyScalar(2), 4));
          const pm = new THREE.MeshBasicMaterial({ map: glow, color: col('#ff9a3a').multiplyScalar(0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
          const pls = []; for (let i = 0; i < lp.length; i += 3) pls.push([lp[i], lp[i + 1] - 4.4, lp[i + 2], 0, 12, 1, 12]);
          const pg2 = new THREE.PlaneGeometry(1, 1); pg2.rotateX(-Math.PI / 2);
          inst(pg2, pm, pls);
        }
        // girişte tabela: ana yol kenarında, ok ile
        G.PIST.sample(T, k.sA - 35, k.side * (W / 2 + 1.5), o);
        const sg = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), new THREE.MeshLambertMaterial({ color: '#333' })); pole.position.y = 2; sg.add(pole);
        const tx = textTex(k.side < 0 ? '{<} KESTİRME' : 'KESTİRME {>}', '#111', '#ffd600', 256, 64, { frame: 1 }); disposables.push(tx);
        const bd = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); bd.position.y = 4.2; bd.rotation.y = Math.PI; sg.add(bd);
        sg.position.set(o.x, o.y, o.z); sg.rotation.y = o.h; add(sg);
        // ağızda yere çizili sarı oklar
        for (let i = 0; i < 3; i++) {
          G.PIST.sample(T, k.sA - 20 + i * 8, k.side * (W / 2 - 2), o);
          const ar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ map: arrowTex(), transparent: true, depthWrite: false }));
          ar.rotation.x = -Math.PI / 2; ar.rotation.z = o.h + Math.PI - k.side * 0.6; ar.position.set(o.x, o.y + 0.04, o.z); add(ar);
        }
      }
    }
    // ── rampalar ──
    if (RAMPS.length) {
      const rc = cvs(64, 128), rx = rc.getContext('2d');
      rx.fillStyle = '#2a2a30'; rx.fillRect(0, 0, 64, 128);
      rx.fillStyle = '#ffd600'; for (let y = 0; y < 128; y += 32) { rx.beginPath(); rx.moveTo(4, y + 28); rx.lineTo(32, y + 6); rx.lineTo(60, y + 28); rx.lineTo(60, y + 18); rx.lineTo(32, y - 4); rx.lineTo(4, y + 18); rx.fill(); }
      const rtx = new THREE.CanvasTexture(rc); disposables.push(rtx);
      const topM = new THREE.MeshLambertMaterial({ map: rtx }), sM = new THREE.MeshLambertMaterial({ color: '#444450' });
      for (const rp of RAMPS) {
        const K = rp.sc ? rp.sc.T : T;
        G.PIST.sample(K, rp.s0, rp.d0, o);
        const w = rp.w / 2, L = rp.len, H = rp.h;
        // üçgen prizma: yerel x = sol (−d), z = ileri
        const v = [w, 0, 0, -w, 0, 0, w, H, L, -w, H, L, w, 0, L, -w, 0, L];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1], 2));
        g.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 5, 2, 5, 3, 0, 4, 2, 1, 3, 5]);
        g.addGroup(0, 6, 0); g.addGroup(6, 12, 1);
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, [topM, sM]);
        m.position.set(o.x, o.y + 0.02, o.z); m.rotation.y = o.h; add(m);
      }
    }

    // ── yağmur ──
    let rain = null;
    if (wet) {
      const n = q >= 2 ? 2600 : q === 1 ? 1500 : 700, rp = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80; rp.set([x, y, z, x + 0.1, y - 1.2, z + 0.2], i * 6); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
      rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9fb0c8, transparent: true, opacity: 0.45 }));
      rain.frustumCulled = false; add(rain);
    }

    // ── yapıcı yardımcılar (yarış kodu kullanır) ──
    const stripe = stripeTex(); disposables.push(stripe);
    const checker = checkerTex(); disposables.push(checker);

    function addLine(s, color) {
      G.PIST.sample(T, s, 0, o);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), new THREE.MeshLambertMaterial({ map: checker, color: color || 0xffffff }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = o.h; m.position.set(o.x, o.y + 0.03, o.z);
      checker.repeat.set(W / 4, 1); checker.wrapS = THREE.RepeatWrapping;
      return add(m);
    }
    function addGate(s, text, color) {
      G.PIST.sample(T, s, 0, o);
      const g = new THREE.Group(), c = col(color || '#ff2e63');
      const pm = new THREE.MeshLambertMaterial({ color: '#222' });
      for (const sg of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), pm); p.position.set(sg * (W / 2 + 0.8), 3.5, 0); g.add(p); }
      const tx = textTex(text, '#0a0a10', c.getStyle(), 512, 64); disposables.push(tx);
      const b = new THREE.Mesh(new THREE.BoxGeometry(W + 2.4, 1.6, 0.4), [pm, pm, pm, pm, new THREE.MeshBasicMaterial({ map: tx }), new THREE.MeshBasicMaterial({ map: tx })]);
      b.position.y = 7; g.add(b);
      const glowB = new THREE.Mesh(new THREE.BoxGeometry(W + 2.4, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: c })); glowB.position.y = 6.15; g.add(glowB);
      g.position.set(o.x, o.y, o.z); g.rotation.y = o.h;
      return add(g);
    }
    function addCheckpoint(s, color) {
      G.PIST.sample(T, s, 0, o);
      const g = new THREE.Group(), c = col(color || '#00e5ff');
      const m = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 1, 0.35, 6, 32, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
      g.add(m);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(W / 2 + 1, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
      g.add(fill);
      g.position.set(o.x, o.y, o.z); g.rotation.y = o.h;
      return add(g);
    }
    function addSpeedCam(s) {
      G.PIST.sample(T, s, W / 2 + 1.6, o);
      const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 0.25), new THREE.MeshLambertMaterial({ color: '#888' })); p.position.y = 2.25; g.add(p);
      const bx = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1), new THREE.MeshLambertMaterial({ color: '#f2c94c' })); bx.position.y = 4.6; g.add(bx);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      fl.scale.setScalar(14); fl.position.y = 4.6; g.add(fl);
      g.position.set(o.x, o.y + 0.18, o.z); g.rotation.y = o.h;
      g.userData.flash = fl;
      return add(g);
    }
    // takip engeli: yol kenarında yıkılabilir yapı (su kulesi / tabela / iskele)
    function addBreaker(s, side, kind) {
      G.PIST.sample(T, s, side * (W / 2 + 2.2), o);
      const piv = new THREE.Group();
      const sm = new THREE.MeshLambertMaterial({ map: stripe });
      const k = kind || ['kule', 'tabela', 'iskele'][Math.floor(r() * 3)];
      if (k === 'kule') {
        for (const dx of [-1.5, 1.5]) for (const dz of [-1.5, 1.5]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.4), sm); l.position.set(dx, 4.5, dz); piv.add(l); }
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4.5, 12), new THREE.MeshLambertMaterial({ color: '#7f8c8d' })); tank.position.y = 11; piv.add(tank);
      } else if (k === 'tabela') {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 12, 0.7), sm); p.position.y = 6; piv.add(p);
        const tx = textTex('BENZİN', '#c0392b', '#ffffff', 256, 64); disposables.push(tx);
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 9), [new THREE.MeshBasicMaterial({ map: tx }), new THREE.MeshBasicMaterial({ map: tx }), sm, sm, sm, sm]); b.position.set(0, 12, 0); piv.add(b);
      } else {
        for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 8, 0.35), sm); l.position.set(0, 4, -3 + i * 2); piv.add(l); }
        const pl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 8), new THREE.MeshLambertMaterial({ color: '#8a6a40' })); pl.position.y = 8; piv.add(pl);
        for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: '#a07a50' })); b.position.set((i % 2 - 0.5), 8.8, -2.5 + i); piv.add(b); }
      }
      // işaret: yerde sarı halka
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 24), new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25;
      const g = new THREE.Group(); g.add(piv); g.add(ring);
      g.position.set(o.x, o.y + 0.18, o.z); g.rotation.y = o.h;
      g.userData = { piv, ring, side, fall: 0 };
      return add(g);
    }
    function addRoadblock(s, gapD, spikes) {
      const g = new THREE.Group();
      G.PIST.sample(T, s, 0, o);
      g.position.set(o.x, o.y, o.z); g.rotation.y = o.h;
      const spikeM = new THREE.MeshLambertMaterial({ color: '#333' });
      let spike = null;
      if (spikes) {
        spike = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.6), new THREE.MeshLambertMaterial({ color: '#b0b0b0' })); spike.add(base);
        for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), spikeM); c.position.set(-2 + i * 0.3, 0.12, 0); spike.add(c); }
        spike.position.set(-gapD, 0.05, -3); // yerel x = -d (sağ = -x)
        g.add(spike);
      }
      return add(g);
    }
    function remove(obj) { if (!obj) return; scene.remove(obj); const i = objs.indexOf(obj); if (i >= 0) objs.splice(i, 1); }

    let time = 0;
    const _fw = new THREE.Vector3();
    function update(dt, cam) {
      time += dt;
      for (const f of anim) f(time);
      // mesafe ayıklaması
      const cxp = cam.position.x, czp = cam.position.z, far = (scene.fog ? scene.fog.far : 900) + 100;
      for (const c of cull) { const d = Math.hypot(c[1] - cxp, c[2] - czp) - c[3]; c[0].visible = d < far; }
      skyGroup.position.set(cam.position.x, SKP ? cam.position.y - 25 : 0, cam.position.z);
      // gölge kutusu kameranın biraz önünü kapsasın; titremesin diye ızgaraya oturt
      cam.getWorldDirection(_fw);
      const fx = Math.round((cam.position.x + _fw.x * 22) / 0.5) * 0.5, fz = Math.round((cam.position.z + _fw.z * 22) / 0.5) * 0.5, fy = Math.round(cam.position.y);
      sun.target.position.set(fx, fy, fz);
      sun.position.set(fx + sunDir.x * 150, fy + sunDir.y * 150, fz + sunDir.z * 150);
      if (rain) {
        rain.position.set(cam.position.x, cam.position.y - 10, cam.position.z);
        const p = rain.geometry.attributes.position, a = p.array;
        for (let i = 0; i < a.length; i += 6) {
          a[i + 1] -= 32 * dt; a[i + 4] -= 32 * dt;
          if (a[i + 1] < 0) { a[i + 1] += 40; a[i + 4] += 40; }
        }
        p.needsUpdate = true;
      }
      if (water && tema !== 'otoyol') water.material.color && (water.position.y = minY - 1.2 + Math.sin(time * 0.6) * 0.08);
    }
    function dispose() {
      for (const ob of objs) {
        scene.remove(ob);
        ob.traverse && ob.traverse(x => {
          // ortak gerçek varlıklar (VARLIK) silinmez: sonraki yarışlarda da kullanılıyor
          if (x.geometry && !x.geometry.userData.varlik) x.geometry.dispose();
          const ms = Array.isArray(x.material) ? x.material : x.material ? [x.material] : [];
          ms.forEach(m => {
            if (m.userData.varlik) return;
            for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'alphaMap']) { const t = m[k]; if (t && !t.userData.varlik && disposables.indexOf(t) < 0) t.dispose(); }
            m.dispose();
          });
        });
      }
      disposables.forEach(t => { if (!t.userData.varlik) t.dispose(); });
      scene.fog = null;
    }
    return { update, dispose, addLine, addGate, addCheckpoint, addSpeedCam, addBreaker, addRoadblock, remove, glow, sky, isNight, minY, wet };
  }

  G.DUNYA = { build, envMap, envFromSky, skyName, SKY, glowTex };
})(window);
