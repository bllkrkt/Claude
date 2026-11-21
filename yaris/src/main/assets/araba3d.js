// Gece Kaçağı — koddan üretilen düşük poligonlu araba modelleri
// Araba ekseni: ileri +z, sağ -x (pist.js ile aynı), yukarı +y. Zemin y=0.
(function (G) {
  'use strict';
  const T3 = () => G.THREE;

  // Gövde profilleri: [u (uzunluk, arka - → ön +), v (yükseklik)]
  const BODY = {
    hatch: { L: 4.0, W: 1.78, r: 0.32, wb: 1.28, b: [[-2.0, 0.3], [2.0, 0.3], [2.04, 0.55], [1.9, 0.78], [1.2, 0.9], [-1.78, 0.96], [-2.02, 0.86]], c: [[1.16, 0.9], [0.42, 1.42], [-1.5, 1.46], [-1.86, 0.96]] },
    coupe: { L: 4.4, W: 1.86, r: 0.34, wb: 1.42, b: [[-2.2, 0.28], [2.2, 0.28], [2.26, 0.5], [2.1, 0.68], [0.9, 0.82], [-1.6, 0.88], [-2.22, 0.82]], c: [[0.86, 0.82], [0.0, 1.25], [-0.9, 1.27], [-1.66, 0.88]] },
    sedan: { L: 4.7, W: 1.86, r: 0.34, wb: 1.5, b: [[-2.35, 0.3], [2.35, 0.3], [2.4, 0.55], [2.25, 0.75], [1.1, 0.88], [-1.6, 0.92], [-2.36, 0.88]], c: [[1.06, 0.88], [0.35, 1.4], [-0.95, 1.42], [-1.62, 0.92]] },
    muscle: { L: 4.8, W: 1.92, r: 0.36, wb: 1.52, b: [[-2.4, 0.3], [2.4, 0.3], [2.44, 0.7], [2.3, 0.86], [0.9, 0.95], [-1.8, 0.97], [-2.42, 0.95]], c: [[0.86, 0.95], [0.15, 1.38], [-0.9, 1.38], [-1.72, 0.97]] },
    super: { L: 4.5, W: 1.98, r: 0.35, wb: 1.42, b: [[-2.25, 0.25], [2.25, 0.25], [2.32, 0.42], [1.6, 0.6], [0.7, 0.75], [-1.7, 0.86], [-2.26, 0.8]], c: [[0.76, 0.75], [-0.05, 1.12], [-0.9, 1.14], [-1.76, 0.86]] },
    wedge: { L: 4.4, W: 1.96, r: 0.35, wb: 1.4, b: [[-2.2, 0.25], [2.26, 0.25], [2.26, 0.38], [0.6, 0.72], [-1.9, 0.86], [-2.22, 0.84]], c: [[0.56, 0.72], [-0.35, 1.08], [-1.2, 1.08], [-1.86, 0.86]] },
    suv: { L: 4.8, W: 1.98, r: 0.42, wb: 1.5, b: [[-2.4, 0.45], [2.4, 0.45], [2.46, 0.9], [2.2, 1.15], [1.2, 1.25], [-2.4, 1.3], [-2.44, 1.0]], c: [[1.15, 1.25], [0.5, 1.86], [-2.3, 1.9], [-2.4, 1.3]] },
    van: { L: 5.0, W: 1.98, r: 0.36, wb: 1.7, b: [[-2.5, 0.35], [2.5, 0.35], [2.56, 1.0], [1.6, 1.22], [1.1, 2.05], [-2.5, 2.1]], c: [[1.56, 1.24], [1.12, 1.98], [0.8, 1.98], [0.8, 1.24]], cw: 1.02 },
  };
  BODY.polis = BODY.sedan; BODY.taksi = BODY.sedan; BODY.polisgt = BODY.coupe; BODY.polissuv = BODY.suv; BODY.polissuper = BODY.super;

  // ortak malzeme önbelleği
  const MC = {};
  function mat(key, make) { return MC[key] || (MC[key] = make()); }
  let ENV = null, Q = 2; // kalite 0..2
  function setEnv(e) { ENV = e; for (const k in MC) if (MC[k].envMap !== undefined && MC[k].isMeshStandardMaterial) { MC[k].envMap = e; MC[k].needsUpdate = true; } }
  function setQuality(q) { Q = q; }

  function shapeOf(pts) {
    const THREE = T3(), s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  }
  // profilin üst yüzeyi: verilen u için en yüksek v
  function topAt(pts, u) {
    let best = -1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[0] - u) * (b[0] - u) <= 0 && a[0] !== b[0]) {
        const t = (u - a[0]) / (b[0] - a[0]), v = a[1] + (b[1] - a[1]) * t;
        if (v > best) best = v;
      }
    }
    return best;
  }
  function extrude(pts, width, bevel) {
    const THREE = T3();
    const g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: width, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: Q >= 2 ? 2 : 1, curveSegments: 1 });
    g.rotateY(-Math.PI / 2); // u → z, derinlik → -x
    g.translate(width / 2, 0, 0);
    return g;
  }

  // Yan desen dokusu (kaporta yan yüzü; UV metre cinsinden u,v)
  function vinylTex(body, color, vinyl, accent) {
    const THREE = T3(), cv = document.createElement('canvas');
    cv.width = 512; cv.height = 192;
    const c = cv.getContext('2d'), L = body.L;
    const X = u => (u / L + 0.5) * 512, Y = v => 192 - v / 1.5 * 192;
    c.fillStyle = color; c.fillRect(0, 0, 512, 192);
    // kapı çizgisi ve hafif alt gölge
    const gr = c.createLinearGradient(0, Y(0.3), 0, Y(1.0));
    gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)');
    c.fillStyle = gr; c.fillRect(0, 0, 512, 192);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(0.75), Y(0.35)); c.lineTo(X(0.75), Y(0.85)); c.moveTo(X(-0.7), Y(0.35)); c.lineTo(X(-0.7), Y(0.88)); c.stroke();
    const ac = accent || '#ffffff';
    c.fillStyle = ac; c.strokeStyle = ac;
    if (vinyl === 2) { c.fillRect(0, Y(0.66), 512, 10); c.fillRect(0, Y(0.6), 512, 4); }
    else if (vinyl === 3) { // alev
      c.fillStyle = '#ff6d00';
      for (let i = 0; i < 7; i++) {
        const y0 = Y(0.38 + i * 0.065), len = 120 + Math.sin(i * 1.7) * 60 + i * 12;
        c.beginPath(); c.moveTo(X(L / 2), y0 - 6); c.quadraticCurveTo(X(L / 2) - len * 0.6, y0 - 22, X(L / 2) - len, y0 - 4);
        c.quadraticCurveTo(X(L / 2) - len * 0.5, y0 + 8, X(L / 2), y0 + 8); c.fill();
      }
      c.fillStyle = '#ffd600';
      for (let i = 0; i < 5; i++) {
        const y0 = Y(0.42 + i * 0.07), len = 70 + i * 14;
        c.beginPath(); c.moveTo(X(L / 2), y0 - 3); c.quadraticCurveTo(X(L / 2) - len * 0.6, y0 - 12, X(L / 2) - len, y0);
        c.quadraticCurveTo(X(L / 2) - len * 0.5, y0 + 5, X(L / 2), y0 + 5); c.fill();
      }
    } else if (vinyl === 4) { // kaplan
      c.fillStyle = 'rgba(10,10,10,0.85)';
      for (let i = 0; i < 12; i++) {
        const x = 30 + i * 40, w = 10 + (i % 3) * 5;
        c.beginPath(); c.moveTo(x, Y(0.3)); c.lineTo(x + w, Y(0.3)); c.lineTo(x + w * 2.2, Y(0.62 + (i % 2) * 0.12)); c.lineTo(x + w * 0.6, Y(0.52)); c.fill();
      }
    } else if (vinyl === 5) { // yarış numarası (aynada da aynı görünsün diye 0/1/8)
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(X(0.05), Y(0.6), 34, 0, 7); c.fill();
      c.fillStyle = '#111'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('88', X(0.05), Y(0.6) + 2);
      c.fillStyle = ac; c.fillRect(0, Y(0.36), 512, 6);
    } else if (vinyl === 6) { // şimşek
      c.lineWidth = 9; c.lineJoin = 'miter'; c.beginPath();
      c.moveTo(X(L / 2 - 0.2), Y(0.62)); c.lineTo(X(1.0), Y(0.7)); c.lineTo(X(0.6), Y(0.5)); c.lineTo(X(-0.3), Y(0.66)); c.lineTo(X(-0.6), Y(0.46)); c.lineTo(X(-L / 2), Y(0.6)); c.stroke();
    } else if (vinyl === 7) { // dama
      const sz = 10;
      for (let x = 0; x < 512; x += sz) for (let k = 0; k < 2; k++) if (((x / sz) + k) % 2 === 0) c.fillRect(x, Y(0.44) + k * sz, sz, sz);
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / L, 1 / 1.5); t.offset.set(0.5, 0);
    t.anisotropy = 4;
    return t;
  }

  function wheel(r, w, rim, rimColor) {
    const THREE = T3(), g = new THREE.Group();
    const tireM = mat('tire', () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9, metalness: 0 }));
    const seg = Q >= 2 ? 18 : 12;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, seg), tireM);
    tire.rotation.z = Math.PI / 2; g.add(tire);
    const rimM = mat('rim' + rimColor, () => new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.25, metalness: 0.9, envMap: ENV }));
    const rr = r * 0.68;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, w + 0.02, seg), rim && rim.kol === 0 ? rimM : mat('rimdark', () => new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6, metalness: 0.5 })));
    disc.rotation.z = Math.PI / 2; g.add(disc);
    const kol = rim ? rim.kol : 5;
    if (kol > 0 && Q >= 1) {
      const sw = rim.ince ? 0.035 : 0.07;
      for (let i = 0; i < kol; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, rr * 1.9, sw), rimM);
        sp.rotation.x = (i / kol) * Math.PI; g.add(sp);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.25, rr * 0.25, w + 0.06, 8), rimM);
    hub.rotation.z = Math.PI / 2; g.add(hub);
    return g;
  }

  /**
   * opt: {govde, renk, kaplama(FINISH), jant, jantRenk, kit, spoiler, neon, vinyl, cam, aksan, polis, basit}
   * dönüş: Group; userData: {wheels:[], brake: mat, lights: [..], siren: [mats], L, W}
   */
  function make(opt) {
    const THREE = T3();
    const type = opt.govde || 'coupe';
    if (type === 'kamyon') return makeTruck(opt);
    if (type === 'otobus') return makeBus(opt);
    const B = BODY[type] || BODY.coupe;
    const grp = new THREE.Group();
    const color = opt.renk || '#cccccc';
    const fin = opt.kaplama || { r: 0.32, m: 0.35 };
    const simple = opt.basit || Q === 0;   // trafik araçları ve zayıf telefon: basit malzeme
    const wallM = simple
      ? new THREE.MeshLambertMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, roughness: fin.r, metalness: fin.m, envMap: ENV, envMapIntensity: 1.1 });
    let sideM = wallM;
    if (!opt.basit && (opt.vinyl || opt.desen !== false)) {
      const vt = vinylTex(B, color, opt.vinyl || 0, opt.aksan);
      sideM = simple ? new THREE.MeshLambertMaterial({ map: vt })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, map: vt, roughness: fin.r, metalness: fin.m, envMap: ENV, envMapIntensity: 1.1 });
    }
    const body = new THREE.Mesh(extrude(B.b, B.W, simple ? 0 : 0.04), [sideM, wallM]);
    grp.add(body);
    // cam (kabin)
    const tint = opt.cam || 0;
    const glassM = mat('glass' + tint + (simple ? 's' : ''), () => simple ? new THREE.MeshLambertMaterial({ color: [0x223040, 0x141a22, 0x08080a][tint] })
      : new THREE.MeshStandardMaterial({ color: [0x2a3a4c, 0x161c26, 0x07070a][tint], roughness: 0.05, metalness: 0.9, envMap: ENV, envMapIntensity: 1.4 }));
    const cw = B.W * (B.cw || 0.86);
    const cab = new THREE.Mesh(extrude(B.c, cw, 0), glassM);
    grp.add(cab);
    // tavan (kaporta rengi, camın üstünde ince levha)
    if (type !== 'van') {
      const rp = B.c, u1 = rp[1][0] - 0.05, u2 = rp[2][0] + 0.05;
      const ht = Math.min(rp[1][1], rp[2][1]);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.94, 0.05, Math.abs(u1 - u2)), wallM);
      roof.position.set(0, ht + 0.01, (u1 + u2) / 2); grp.add(roof);
    }
    // farlar & stoplar
    const headM = mat('head', () => new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    const brakeM = new THREE.MeshBasicMaterial({ color: 0x8a0a12 });
    const fz = B.L / 2 + 0.02, fy = topAt(B.b, B.L / 2 - 0.15) - 0.12;
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), headM);
      h.position.set(sx * (B.W / 2 - 0.3), Math.max(0.45, fy), fz); grp.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.05), brakeM);
      t.position.set(sx * (B.W / 2 - 0.32), topAt(B.b, -B.L / 2 + 0.1) - 0.14, -B.L / 2 - 0.02); grp.add(t);
    }
    // ön ızgara + plaka
    const darkM = mat('dark', () => new THREE.MeshLambertMaterial({ color: 0x0c0c0e }));
    const gril = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.5, 0.12, 0.05), darkM);
    gril.position.set(0, 0.38, fz); grp.add(gril);
    const plM = mat('plate', () => new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.03), plM);
    pl.position.set(0, 0.42, -B.L / 2 - 0.03); grp.add(pl);
    // tekerlekler
    const wheels = [];
    const rimDef = opt.jant || { kol: 5 };
    for (const sz of [1, -1]) for (const sx of [-1, 1]) {
      const w = wheel(B.r, 0.26, rimDef, opt.jantRenk || '#c8ccd4');
      w.position.set(sx * (B.W / 2 - 0.055), B.r, sz * B.wb);
      w.userData.front = sz > 0;
      grp.add(w); wheels.push(w);
    }
    // çamurluk boşlukları (tekerleğin üstünde koyu yarım daire), marşpiyel, aynalar
    const archM = mat('arch', () => new THREE.MeshBasicMaterial({ color: 0x060608, side: THREE.DoubleSide }));
    const archG = new THREE.CircleGeometry(B.r + 0.07, 12, 0, Math.PI);
    for (const sz of [1, -1]) for (const sx of [-1, 1]) {
      const a = new THREE.Mesh(archG, archM);
      a.rotation.y = sx * Math.PI / 2;
      a.position.set(sx * (B.W / 2 + 0.046), B.r, sz * B.wb);
      grp.add(a);
    }
    if (!opt.basit) {
      const rk = new THREE.Mesh(new THREE.BoxGeometry(B.W + 0.1, 0.09, Math.max(0.2, B.wb * 2 - B.r * 2.5)), darkM);
      rk.position.set(0, 0.3, 0); grp.add(rk);
      const mz = B.c[0][0] - 0.12, my = B.c[0][1] + 0.1;
      for (const sx of [-1, 1]) { const mr = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.12), wallM); mr.position.set(sx * (cw / 2 + 0.1), my, mz); grp.add(mr); }
    }
    // gövde kiti
    const kit = opt.kit || 0;
    if (kit > 0) {
      const km = kit === 3 ? darkM : wallM;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(B.W + 0.04, 0.07, 0.3), km); sp.position.set(0, 0.22, B.L / 2 - 0.05); grp.add(sp);
      for (const sx of [-1, 1]) {
        const sk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, B.wb * 1.3), km); sk.position.set(sx * (B.W / 2 + 0.02), 0.28, 0); grp.add(sk);
      }
      const df = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.8, 0.1, 0.25), darkM); df.position.set(0, 0.24, -B.L / 2 + 0.05); grp.add(df);
      if (kit >= 2) for (const sz of [1, -1]) for (const sx of [-1, 1]) {
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, B.r * 2.6), wallM);
        fl.position.set(sx * (B.W / 2 + 0.04), B.r * 2 - 0.02, sz * B.wb); grp.add(fl);
      }
      if (kit === 3) { // kaput havalandırması
        const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), darkM);
        sc.position.set(0, topAt(B.b, B.L / 2 - 0.9) + 0.03, B.L / 2 - 0.9); grp.add(sc);
      }
    }
    // rüzgârlık
    const spl = opt.spoiler || 0;
    if (spl > 0) {
      const ry = topAt(B.b, -B.L / 2 + 0.25), rz = -B.L / 2 + 0.25;
      if (spl === 1) { const s = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.86, 0.05, 0.16), wallM); s.position.set(0, ry + 0.03, rz); s.rotation.x = -0.3; grp.add(s); }
      else if (spl === 2) { const s = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.92, 0.12, 0.3), wallM); s.position.set(0, ry + 0.06, rz + 0.05); s.rotation.x = -0.45; grp.add(s); }
      else {
        const hgt = spl === 3 ? 0.22 : 0.4, wd = spl === 3 ? B.W * 0.9 : B.W * 1.02;
        for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, hgt, 0.12), darkM); p.position.set(sx * wd * 0.33, ry + hgt / 2, rz); grp.add(p); }
        const wg = new THREE.Mesh(new THREE.BoxGeometry(wd, 0.05, spl === 4 ? 0.38 : 0.3), spl === 4 ? darkM : wallM); wg.position.set(0, ry + hgt, rz - 0.05); wg.rotation.x = 0.12; grp.add(wg);
        if (spl === 4) for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.42), darkM); e.position.set(sx * wd / 2, ry + hgt + 0.02, rz - 0.05); grp.add(e); }
      }
    }
    // üst şerit (çift şerit deseni)
    if ((opt.vinyl === 1 || opt.vinyl === 5) && !opt.basit) {
      const stM = mat('stripe' + (opt.aksan || '#fff'), () => new THREE.MeshStandardMaterial({ color: opt.aksan || '#ffffff', roughness: 0.4, metalness: 0.2 }));
      for (let u = -B.L / 2 + 0.08; u < B.L / 2 - 0.05; u += 0.25) {
        const vb = topAt(B.b, u), vc = topAt(B.c, u) || -1;
        const isCab = vc > vb + 0.05;
        const y = isCab ? vc + 0.03 : vb + 0.005;
        if (isCab && u > B.c[1][0] - 0.1) continue; // ön camın üstüne koyma
        for (const sx of [-1, 1]) {
          const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.26), stM);
          s.position.set(sx * 0.16, y, u); grp.add(s);
        }
      }
    }
    // neon
    let neonM = null;
    if (opt.neon) {
      neonM = new THREE.MeshBasicMaterial({ color: opt.neon, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
      const n = new THREE.Mesh(new THREE.PlaneGeometry(B.W + 1.4, B.L + 1.4), neonM);
      n.rotation.x = -Math.PI / 2; n.position.y = 0.03; n.renderOrder = 2; grp.add(n);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.9, 0.03, B.L * 0.85), new THREE.MeshBasicMaterial({ color: opt.neon }));
      strip.position.y = 0.2; grp.add(strip);
    }
    // gölge lekesi
    const shM = mat('shadow', () => new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, map: blobTex() }));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(B.W * 1.5, B.L * 1.25), shM);
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.renderOrder = 1; grp.add(sh);
    // polis ışık çubuğu / taksi lambası
    const siren = [];
    if (type.startsWith('polis')) {
      const rp = B.c, ht = Math.min(rp[1][1], rp[2][1]), zc = (rp[1][0] + rp[2][0]) / 2;
      const base = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.8, 0.08, 0.26), darkM); base.position.set(0, ht + 0.06, zc); grp.add(base);
      const rM = new THREE.MeshBasicMaterial({ color: 0x400000 }), bM = new THREE.MeshBasicMaterial({ color: 0x000040 });
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.36, 0.1, 0.22), rM); r1.position.set(cw * 0.2, ht + 0.13, zc); grp.add(r1);
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.36, 0.1, 0.22), bM); b1.position.set(-cw * 0.2, ht + 0.13, zc); grp.add(b1);
      siren.push(rM, bM);
      // kapıda beyaz bant
      if (type !== 'polissuper') {
        const bandM = mat('copband', () => new THREE.MeshLambertMaterial({ color: 0xf5f6fa }));
        for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, B.L * 0.55), bandM); b.position.set(sx * (B.W / 2 + 0.035), 0.62, 0.1); grp.add(b); }
      }
    } else if (type === 'taksi') {
      const rp = B.c, ht = Math.min(rp[1][1], rp[2][1]), zc = (rp[1][0] + rp[2][0]) / 2;
      const tk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.24), mat('taxisign', () => new THREE.MeshBasicMaterial({ color: 0xfff3a0 })));
      tk.position.set(0, ht + 0.1, zc); grp.add(tk);
    }
    grp.userData = { wheels, brake: brakeM, siren, L: B.L, W: B.W, neon: neonM, body };
    return grp;
  }

  function makeTruck(opt) {
    const THREE = T3(), g = new THREE.Group();
    const cM = new THREE.MeshLambertMaterial({ color: opt.renk || '#c0392b' });
    const boxM = mat('cargo', () => new THREE.MeshLambertMaterial({ color: 0xdfe4ea }));
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.1, 1.9), cM); cab.position.set(0, 1.45, 2.6); g.add(cab);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 0.05), mat('glass1s', () => new THREE.MeshLambertMaterial({ color: 0x141a22 })));
    gl.position.set(0, 1.9, 3.56); g.add(gl);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.7, 6.2), boxM); box.position.set(0, 1.85, -1.6); g.add(box);
    const wheels = [];
    for (const z of [2.6, -0.6, -3.4]) for (const sx of [-1, 1]) {
      const w = wheel(0.5, 0.36, { kol: 0 }, '#888'); w.position.set(sx * 1.1, 0.5, z); g.add(w); wheels.push(w);
    }
    const brakeM = new THREE.MeshBasicMaterial({ color: 0x8a0a12 });
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), brakeM); t.position.set(sx * 1.0, 0.8, -4.72); g.add(t);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.05), mat('head', () => new THREE.MeshBasicMaterial({ color: 0xfff6d8 }))); h.position.set(sx * 0.85, 0.9, 3.57); g.add(h);
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 10), mat('shadow', () => new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.55, depthWrite: false, map: blobTex() })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    g.userData = { wheels, brake: brakeM, siren: [], L: 9.4, W: 2.4 };
    return g;
  }
  function makeBus(opt) {
    const THREE = T3(), g = new THREE.Group();
    const cM = new THREE.MeshLambertMaterial({ color: opt.renk || '#2d98da' });
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.8, 11), cM); b.position.y = 1.75; g.add(b);
    const wM = new THREE.MeshBasicMaterial({ color: 0xffe8a8 });
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 9.4), wM); w.position.set(sx * 1.26, 2.3, -0.3); g.add(w); }
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.3, 0.05), mat('glass1s', () => new THREE.MeshLambertMaterial({ color: 0x141a22 }))); f.position.set(0, 2.2, 5.52); g.add(f);
    const wheels = [];
    for (const z of [3.8, -3.6]) for (const sx of [-1, 1]) { const w = wheel(0.52, 0.34, { kol: 0 }, '#777'); w.position.set(sx * 1.12, 0.52, z); g.add(w); wheels.push(w); }
    const brakeM = new THREE.MeshBasicMaterial({ color: 0x8a0a12 });
    for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), brakeM); t.position.set(sx * 1.0, 0.9, -5.52); g.add(t); }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 12.5), mat('shadow', () => new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.55, depthWrite: false, map: blobTex() })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    g.userData = { wheels, brake: brakeM, siren: [], L: 11, W: 2.5 };
    return g;
  }

  let BLOB = null;
  function blobTex() {
    if (BLOB) return BLOB;
    const THREE = T3(), c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (BLOB = new THREE.CanvasTexture(c));
  }

  function dispose(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) {
        let shared = false; for (const k in MC) if (MC[k] === m) shared = true;
        if (!shared) { if (m.map && m.map !== BLOB) m.map.dispose(); m.dispose(); }
      }
    });
  }

  G.ARABA3D = { make, dispose, setEnv, setQuality, BODY, blobTex };
})(window);
