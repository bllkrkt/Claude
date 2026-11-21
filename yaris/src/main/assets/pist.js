// Gece Kaçağı — pist üretici (saf matematik; 3B'den bağımsız, node'da da çalışır)
// Pist = 2 m aralıklı merkez çizgisi örnekleri. Araçlar (s = pist boyunca mesafe, d = yanal kayma) uzayında yaşar.
(function (G) {
  'use strict';
  const STEP = 2;

  // Tohumlu rastgele (aynı pist hep aynı çıksın)
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Kapalı Catmull-Rom eğrisi → yoğun çokgen
  function catmull(ctrl, closed, perSeg) {
    const out = [], n = ctrl.length;
    const P = i => closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 0; j < perSeg; j++) {
        const t = j / perSeg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    if (!closed) out.push(ctrl[n - 1].slice());
    return out;
  }

  // Çokgeni eşit aralıklarla yeniden örnekle
  function resample(poly, closed) {
    const pts = closed ? poly.concat([poly[0]]) : poly;
    const out = [[pts[0][0], pts[0][1]]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      let ax = pts[i - 1][0], az = pts[i - 1][1];
      const bx = pts[i][0], bz = pts[i][1];
      let seg = Math.hypot(bx - ax, bz - az);
      while (carry + seg >= STEP) {
        const t = (STEP - carry) / seg;
        ax = ax + (bx - ax) * t; az = az + (bz - az) * t;
        out.push([ax, az]);
        seg = Math.hypot(bx - ax, bz - az); carry = 0;
      }
      carry += seg;
    }
    if (closed) {
      // son nokta başlangıca çok yakınsa at (döngüde tekrar olmasın)
      const l = out[out.length - 1];
      if (Math.hypot(l[0] - out[0][0], l[1] - out[0][1]) < STEP * 0.6) out.pop();
    }
    return out;
  }

  // Basit eğri kayıtlı çizgi: düzlük / viraj parçalarıyla ilerleyen açık pist
  function openPath(r, len, style) {
    const pts = [[0, 0]];
    let x = 0, z = 0, h = 0, total = 0;
    const maxDev = style === 'otoyol' ? 0.9 : style === 'dag' ? 1.9 : 1.5; // ana yönden en fazla sapma (rad)
    let first = true;
    while (total < len) {
      let segLen, curv = 0;
      if (first) { segLen = 140; first = false; }
      else if (r() < (style === 'otoyol' ? 0.5 : style === 'dag' ? 0.25 : 0.4)) segLen = 60 + r() * (style === 'otoyol' ? 320 : 180);
      else {
        let ang = (0.3 + r() * (style === 'dag' ? 1.9 : style === 'blok' ? 1.4 : 1.1)) * (r() < 0.5 ? -1 : 1);
        if (style === 'blok') ang = (r() < 0.5 ? -1 : 1) * (Math.PI / 2) * (0.8 + r() * 0.3);
        if (Math.abs(h + ang) > maxDev) ang = -ang;
        const rad = style === 'otoyol' ? 250 + r() * 300 : style === 'dag' ? 32 + r() * 70 : style === 'blok' ? 26 + r() * 25 : 55 + r() * 130;
        segLen = Math.abs(ang) * rad; curv = ang / segLen;
      }
      const n = Math.max(1, Math.round(segLen / STEP));
      for (let i = 0; i < n; i++) {
        h += curv * STEP;
        x += Math.sin(h) * STEP; z += Math.cos(h) * STEP;
        pts.push([x, z]);
      }
      total += n * STEP;
    }
    // ani virajları biraz yumuşat
    return smooth(pts, 3, false);
  }

  function smooth(pts, it, closed) {
    let p = pts;
    for (let k = 0; k < it; k++) {
      const q = p.map(a => a.slice()), n = p.length;
      for (let i = 0; i < n; i++) {
        if (!closed && (i === 0 || i === n - 1)) continue;
        const a = p[(i - 1 + n) % n], b = p[(i + 1) % n];
        q[i][0] = (a[0] + 2 * p[i][0] + b[0]) / 4; q[i][1] = (a[1] + 2 * p[i][1] + b[1]) / 4;
      }
      p = q;
    }
    return p;
  }

  // Kapalı devre kontrol noktaları
  function loopCtrl(r, R, style) {
    const n = style === 'blok' ? 8 : 9 + Math.floor(r() * 6);
    const c = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + (r() - 0.5) * (style === 'blok' ? 0.05 : 0.35);
      let rr = R * (0.72 + r() * 0.5);
      let x = Math.cos(th), z = Math.sin(th);
      if (style === 'blok') { // köşeli şehir blokları (süperelips)
        const p = 0.25;
        x = Math.sign(x) * Math.pow(Math.abs(x), p); z = Math.sign(z) * Math.pow(Math.abs(z), p);
        rr = R * (0.85 + r() * 0.3);
      }
      if (style === 'dag') rr = R * (0.55 + r() * 0.75);
      c.push([x * rr * (style === 'otoyol' ? 1.6 : 1), z * rr]);
    }
    // bazen içeri doğru keskin bir viraj (firkete)
    if (style !== 'otoyol' && r() < 0.6) {
      const i = Math.floor(r() * n);
      c[i] = [c[i][0] * 0.55, c[i][1] * 0.55];
    }
    return c;
  }

  /**
   * def: {seed, tip:'dongu'|'acik'|'duz', uzun (m), stil:'sehir'|'blok'|'dag'|'otoyol'|'sahil', tepe (m, yükselti genliği), W (yol genişliği)}
   */
  function build(def) {
    const r = rng(def.seed || 1);
    const style = def.stil || 'sehir';
    let poly, loop = def.tip === 'dongu';
    if (def.tip === 'duz') {
      poly = [];
      const n = Math.round((def.uzun || 1000) / STEP) + 120;
      for (let i = 0; i < n; i++) poly.push([Math.sin(i * STEP / 400) * 6, i * STEP]);
    } else if (loop) {
      const R = (def.uzun || 2500) / (2 * Math.PI) * 0.92;
      poly = catmull(loopCtrl(r, R, style), true, 40);
      poly = resample(poly, true);
      poly = smooth(poly, style === 'blok' ? 2 : 4, true);
    } else {
      poly = openPath(r, def.uzun || 2500, style);
    }
    poly = resample(poly, loop);
    const N = poly.length;
    const px = new Float32Array(N), pz = new Float32Array(N), py = new Float32Array(N);
    const tx = new Float32Array(N), tz = new Float32Array(N), hd = new Float32Array(N), k = new Float32Array(N);
    for (let i = 0; i < N; i++) { px[i] = poly[i][0]; pz[i] = poly[i][1]; }
    for (let i = 0; i < N; i++) {
      const a = loop ? (i - 1 + N) % N : Math.max(0, i - 1), b = loop ? (i + 1) % N : Math.min(N - 1, i + 1);
      let dx = px[b] - px[a], dz = pz[b] - pz[a];
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      tx[i] = dx; tz[i] = dz; hd[i] = Math.atan2(dx, dz);
    }
    for (let i = 0; i < N; i++) {
      const a = loop ? (i - 1 + N) % N : Math.max(0, i - 1), b = loop ? (i + 1) % N : Math.min(N - 1, i + 1);
      let dh = hd[b] - hd[a];
      while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      k[i] = dh / ((b - a + (loop && b < a ? N : 0)) * STEP || STEP);
    }
    // eğriliği yumuşat (araç fiziğinde sarsıntı olmasın)
    for (let it = 0; it < 4; it++) {
      const c = k.slice();
      for (let i = 0; i < N; i++) {
        const a = loop ? (i - 1 + N) % N : Math.max(0, i - 1), b = loop ? (i + 1) % N : Math.min(N - 1, i + 1);
        k[i] = (c[a] + 2 * c[i] + c[b]) / 4;
      }
    }
    const L = N * STEP;
    // Yükselti: döngüde periyodik olsun diye tam sayı dalga
    const A = def.tepe != null ? def.tepe : 2;
    const m1 = Math.max(1, Math.round(L / 900)), m2 = Math.max(2, Math.round(L / 330));
    const f1 = r() * 6.28, f2 = r() * 6.28;
    for (let i = 0; i < N; i++) {
      const s = i * STEP;
      let y = A * Math.sin(s / L * 2 * Math.PI * m1 + f1) + A * 0.35 * Math.sin(s / L * 2 * Math.PI * m2 + f2);
      if (!loop) y *= Math.min(1, s / 120);
      if (def.tip === 'duz') y = 0;
      py[i] = y;
    }
    if (def.tip === 'duz') for (let i = 0; i < N; i++) k[i] = 0;
    const W = def.W || 14;
    const T = { N, L, loop, px, pz, py, tx, tz, hd, k, W, step: STEP, stil: style, def };
    T.grid = makeGrid(T);
    return T;
  }

  // Bina yerleştirmek için: bir noktaya en yakın yol mesafesi
  function makeGrid(T) {
    const C = 24, g = new Map();
    for (let i = 0; i < T.N; i += 2) {
      const key = Math.floor(T.px[i] / C) + ',' + Math.floor(T.pz[i] / C);
      let a = g.get(key); if (!a) g.set(key, a = []); a.push(i);
    }
    return { C, g };
  }
  function roadDist(T, x, z) {
    const { C, g } = T.grid, cx = Math.floor(x / C), cz = Math.floor(z / C);
    let best = 1e9;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const a = g.get((cx + i) + ',' + (cz + j)); if (!a) continue;
      for (const n of a) { const d = Math.hypot(T.px[n] - x, T.pz[n] - z); if (d < best) best = d; }
    }
    return best;
  }

  // s'yi pist aralığına getir
  function wrap(T, s) { return T.loop ? ((s % T.L) + T.L) % T.L : Math.max(0, Math.min(T.L - 0.01, s)); }

  // s, d → dünya konumu ve yön (out nesnesine yazar, çöp üretmesin)
  function sample(T, s, d, out) {
    s = wrap(T, s);
    const f = s / STEP, i = Math.floor(f), t = f - i;
    const j = T.loop ? (i + 1) % T.N : Math.min(T.N - 1, i + 1);
    const x = T.px[i] + (T.px[j] - T.px[i]) * t, z = T.pz[i] + (T.pz[j] - T.pz[i]) * t;
    const y = T.py[i] + (T.py[j] - T.py[i]) * t;
    let dh = T.hd[j] - T.hd[i];
    while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    const h = T.hd[i] + dh * t;
    // yön = (sin h, cos h); sürücünün sağı = (-cos h, sin h). d>0 = sağ. k>0 = sola dönen viraj.
    const nx = -Math.cos(h), nz = Math.sin(h);
    out.x = x + nx * d; out.z = z + nz * d; out.y = y; out.h = h;
    out.k = T.k[i] + (T.k[j] - T.k[i]) * t;
    // eğim (araç burnu yukarı/aşağı)
    out.p = (T.py[j] - T.py[i]) / STEP;
    return out;
  }
  function curvAt(T, s) { s = wrap(T, s); return T.k[Math.floor(s / STEP) % T.N]; }
  // ileri bakışta en sert eğrilik (yapay zekâ fren noktası için)
  function maxCurv(T, s, ahead) {
    let m = 0;
    for (let x = 0; x <= ahead; x += 6) { const c = Math.abs(curvAt(T, s + x)); if (c > m) m = c; }
    return m;
  }
  // ileride en sert virajın işareti ve mesafesi (iç çizgi için)
  function curvSign(T, s, ahead) {
    let m = 0, sg = 0;
    for (let x = 8; x <= ahead; x += 8) { const c = curvAt(T, s + x); if (Math.abs(c) > m) { m = Math.abs(c); sg = Math.sign(c); } }
    return sg * m;
  }

  G.PIST = { build, sample, wrap, curvAt, maxCurv, curvSign, roadDist, rng, STEP };
})(typeof window !== 'undefined' ? window : globalThis);
