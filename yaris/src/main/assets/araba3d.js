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

  // ── geometri birleştirme (çizim çağrısını azaltır) ──
  function mergeGeos(list) {
    const THREE = T3(), pos = [], nor = [], uv = [], idx = [];
    for (const { g, m } of list) {
      const gg = g.index ? g : g; const P = gg.attributes.position, N = gg.attributes.normal, U = gg.attributes.uv;
      const base = pos.length / 3, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); } else nor.push(0, 1, 0);
        if (U) uv.push(U.getX(i), U.getY(i)); else uv.push(0, 0);
      }
      if (gg.index) for (let i = 0; i < gg.index.count; i++) idx.push(base + gg.index.getX(i));
      else for (let i = 0; i < P.count; i++) idx.push(base + i);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setIndex(idx);
    return out;
  }
  // grubun doğrudan çocuklarından aynı malzemeyi paylaşan sabit parçaları tek ağda birleştir
  function compact(grp, keep) {
    const THREE = T3(), by = new Map();
    for (const c of grp.children.slice()) {
      if (!c.isMesh || Array.isArray(c.material) || keep.has(c)) continue;
      if (!by.has(c.material)) by.set(c.material, []);
      by.get(c.material).push(c);
    }
    for (const [mtl, arr] of by) {
      if (arr.length < 2) continue;
      const list = arr.map(c => { c.updateMatrix(); return { g: c.geometry, m: c.matrix.clone() }; });
      const mesh = new THREE.Mesh(mergeGeos(list), mtl);
      mesh.renderOrder = Math.max(...arr.map(c => c.renderOrder));
      for (const c of arr) { grp.remove(c); c.geometry.dispose(); }
      grp.add(mesh);
    }
  }

  // ── kesit gövde ──
  function halfW(B, u) {
    const e = 0.62, L2 = B.L / 2, a = Math.abs(u);
    let p = 1;
    if (a > L2 - e) { const t = Math.min(1, (a - (L2 - e)) / e); p = Math.sqrt(Math.max(0.0, 1 - t * t * 0.72)); }
    const arch = 0.04 * Math.exp(-Math.pow((a - B.wb) / 0.42, 2));
    return B.W / 2 * p + arch;
  }
  function botAt(B, u) { const a = Math.abs(u), L2 = B.L / 2; return (B.gc || 0.22) + Math.max(0, a - (L2 - 0.55)) * 0.32; }
  function loftBody(B) {
    const THREE = T3(), N = Q >= 1 ? 30 : 20, pos = [], uv = [], idx = [];
    let ring = 0;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), u = (-B.L / 2 + B.L * (0.5 - 0.5 * Math.cos(Math.PI * t))) * 0.999;
      const bot = botAt(B, u);
      let top = topAt(B.b, u); if (top < bot + 0.12) top = bot + 0.12;
      const hw = halfW(B, u), hgt = top - bot;
      const R = [[hw * 0.9, bot], [hw, bot + Math.min(0.1, hgt * 0.2)], [hw * 1.005, bot + hgt * 0.5], [hw * 0.975, top - Math.min(0.08, hgt * 0.2)], [hw * 0.86, top], [0, top + 0.025]];
      const pts = R.concat(R.slice(0, 5).reverse().map(p => [-p[0], p[1]]));
      ring = pts.length;
      pts.forEach(([x, y], j) => { pos.push(x, y, u); uv.push(u / B.L + 0.5, j >= 4 && j <= 6 ? 0.985 : y / 1.5); });
    }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < ring; j++) {
      const j2 = (j + 1) % ring, A = i * ring + j, Bv = i * ring + j2, C = (i + 1) * ring + j, D = (i + 1) * ring + j2;
      idx.push(A, Bv, C, Bv, D, C);
    }
    // uç kapaklar
    for (const [i, front] of [[0, false], [N - 1, true]]) {
      let cy = 0; for (let j = 0; j < ring; j++) cy += pos[(i * ring + j) * 3 + 1]; cy /= ring;
      const ci = pos.length / 3; pos.push(0, cy, pos[i * ring * 3 + 2]); uv.push(front ? 1 : 0, cy / 1.5);
      for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring; if (front) idx.push(ci, a, b); else idx.push(ci, b, a); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function loftCabin(B, van) {
    const THREE = T3(), M = Q >= 1 ? 16 : 10, c = B.c, pos = [], uv = [], gi = [], ri = [];
    const uS = c[3][0], uE = c[0][0];
    const roofA = Math.min(c[1][0], c[2][0]) + 0.04, roofB = Math.max(c[1][0], c[2][0]) - 0.04;
    for (let i = 0; i < M; i++) {
      const u = uS + (uE - uS) * (i / (M - 1));
      const base = topAt(B.b, u) - 0.03;
      let roof = topAt(c, u); if (roof < base + 0.03) roof = base + 0.03;
      const hwB = halfW(B, u) * (van ? 0.99 : 0.86), hwT = hwB * (van ? 0.95 : 0.76);
      const pts = [[hwB, base], [hwB * 0.985, base + 0.055], [hwT, roof - 0.04], [hwT * 0.88, roof], [0, roof + 0.015], [-hwT * 0.88, roof], [-hwT, roof - 0.04], [-hwB * 0.985, base + 0.055], [-hwB, base]];
      for (const [x, y] of pts) { pos.push(x, y, u); uv.push(0, 0); }
    }
    const ring = 9, ti = [];
    for (let i = 0; i < M - 1; i++) {
      const u = uS + (uE - uS) * ((i + 0.5) / (M - 1)), roofZone = u > roofA && u < roofB;
      for (let j = 0; j < ring - 1; j++) {
        const A = i * ring + j, Bv = i * ring + j + 1, C = (i + 1) * ring + j, D = (i + 1) * ring + j + 1;
        const tgt = (j === 0 || j === ring - 2) ? ti : (roofZone && j >= 2 && j <= 5 ? ri : gi);
        tgt.push(A, Bv, C, Bv, D, C);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(gi.concat(ri, ti)); g.addGroup(0, gi.length, 0); g.addGroup(gi.length, ri.length, 1); g.addGroup(gi.length + ri.length, ti.length, 2);
    g.computeVertexNormals();
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
    if (kol > 0 && Q >= 1 && !(rim && rim.basit)) {
      const sw = rim.ince ? 0.035 : 0.07;
      for (let i = 0; i < kol; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, rr * 1.9, sw), rimM);
        sp.rotation.x = (i / kol) * Math.PI; g.add(sp);
      }
    }
    if (Q >= 1 && !(rim && rim.basit)) {
      const disc2 = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.78, rr * 0.78, 0.03, 14), mat('disc', () => new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.4, metalness: 0.9 })));
      disc2.rotation.z = Math.PI / 2; disc2.position.x = 0; g.add(disc2);
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.08, rr * 0.5, rr * 0.35), mat('caliper', () => new THREE.MeshStandardMaterial({ color: 0xd01830, roughness: 0.5 })));
      cal.position.set(0, rr * 0.55, 0); g.userData.cal = cal; g.add(cal);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.25, rr * 0.25, w + 0.06, 8), rimM);
    hub.rotation.z = Math.PI / 2; g.add(hub);
    compact(g, new Set());
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
      : Q >= 2 ? new THREE.MeshPhysicalMaterial({ color, roughness: fin.r, metalness: fin.m, envMap: ENV, envMapIntensity: 1.2, clearcoat: fin.id === 'mat' ? 0 : 1, clearcoatRoughness: 0.07 })
      : new THREE.MeshStandardMaterial({ color, roughness: fin.r, metalness: fin.m, envMap: ENV, envMapIntensity: 1.1 });
    let sideM = wallM;
    if (!opt.basit && (opt.vinyl || opt.desen !== false)) {
      const vt = vinylTex(B, color, opt.vinyl || 0, opt.aksan);
      sideM = simple ? new THREE.MeshLambertMaterial({ map: vt })
        : Q >= 2 ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: vt, roughness: fin.r, metalness: fin.m, envMap: ENV, envMapIntensity: 1.2, clearcoat: fin.id === 'mat' ? 0 : 1, clearcoatRoughness: 0.07 })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, map: vt, roughness: fin.r, metalness: fin.m, envMap: ENV, envMapIntensity: 1.1 });
    }
    // gövde: kesitlerden örülmüş kavisli kabuk (yuvarlak burun/kuyruk, şişkin çamurluklar)
    const body = new THREE.Mesh(loftBody(B), sideM);
    grp.add(body);
    // kabin: eğimli yan camlar + kaporta renginde tavan
    const tint = opt.cam || 0;
    const glassM = mat('glass' + tint + (simple ? 's' : ''), () => simple ? new THREE.MeshLambertMaterial({ color: [0x223040, 0x141a22, 0x08080a][tint] })
      : new THREE.MeshStandardMaterial({ color: [0x2a3a4c, 0x161c26, 0x07070a][tint], roughness: 0.04, metalness: 0.95, envMap: ENV, envMapIntensity: 1.6 }));
    const cw = B.W * (B.cw || 0.86);
    const trimM = mat('trim', () => new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.35, metalness: 0.4 }));
    const cab = new THREE.Mesh(loftCabin(B, type === 'van'), [glassM, wallM, trimM]);
    grp.add(cab);
    // farlar (HDR: ekran efektleriyle parlar) & LED stop şeridi
    const headM = mat('head', () => { const m = new THREE.MeshBasicMaterial({ color: 0xfff6d8 }); m.color.multiplyScalar(4); return m; });
    const drlM = mat('drl', () => { const m = new THREE.MeshBasicMaterial({ color: 0xbfe6ff }); m.color.multiplyScalar(2.2); return m; });
    const brakeM = new THREE.MeshBasicMaterial({ color: 0x8a0a12 });
    const darkM = mat('dark', () => new THREE.MeshLambertMaterial({ color: 0x0c0c0e }));
    const fu = B.L / 2 - 0.16, fy = topAt(B.b, fu) - 0.09, fhw = halfW(B, fu);
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.085, 0.16), headM);
      h.position.set(sx * fhw * 0.62, Math.max(0.42, fy), fu + 0.08); h.rotation.y = sx * 0.25; grp.add(h);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.12), darkM);
      hb.position.set(sx * fhw * 0.62, Math.max(0.42, fy), fu + 0.03); hb.rotation.y = sx * 0.25; grp.add(hb);
      if (type === 'super' || type === 'wedge' || type === 'coupe') {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.05), drlM);
        d.position.set(sx * fhw * 0.6, Math.max(0.42, fy) - 0.075, fu + 0.12); d.rotation.y = sx * 0.25; grp.add(d);
      }
    }
    const ru = -B.L / 2 + 0.06, ry = topAt(B.b, ru + 0.06) - 0.12, rhw = halfW(B, ru + 0.05);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(rhw * 1.7, 0.05, 0.06), brakeM); bar.position.set(0, ry, ru - 0.02); grp.add(bar);
    const lensM = mat('lens', () => new THREE.MeshStandardMaterial({ color: 0x3a0408, roughness: 0.1, metalness: 0.5, envMap: ENV }));
    const bu = -B.L / 2 + 0.05, bb = botAt(B, bu);
    const bump = new THREE.Mesh(new THREE.BoxGeometry(halfW(B, bu + 0.1) * 1.9, 0.2, 0.14), trimM); bump.position.set(0, bb + 0.12, bu + 0.04); grp.add(bump);
    const fu2 = B.L / 2 - 0.05, fb = botAt(B, fu2);
    const intake = new THREE.Mesh(new THREE.BoxGeometry(halfW(B, fu2 - 0.1) * 1.4, 0.13, 0.12), trimM); intake.position.set(0, fb + 0.12, fu2 - 0.04); grp.add(intake);
    if (!opt.basit) {
      const c3 = B.c, rz = c3[2][0] - 0.02, rh = topAt(c3, rz);
      const third = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.04), brakeM); third.position.set(0, rh - 0.03, rz - 0.05); grp.add(third);
    }
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.08), brakeM); t.position.set(sx * rhw * 0.68, ry - 0.03, ru); grp.add(t);
      const lc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.19, 0.06), lensM); lc.position.set(sx * rhw * 0.68, ry - 0.03, ru + 0.03); grp.add(lc);
      // egzoz ucu
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.16, 10), mat('chrome', () => new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 1, envMap: ENV })));
      ex.rotation.x = Math.PI / 2; ex.position.set(sx * 0.38, 0.3, -B.L / 2 + 0.02); grp.add(ex);
    }
    // ön ızgara + plaka
    const gril = new THREE.Mesh(new THREE.BoxGeometry(fhw * 0.9, 0.12, 0.08), darkM);
    gril.position.set(0, 0.36, B.L / 2 - 0.08); grp.add(gril);
    const plM = mat('plate', () => new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.03), plM);
    pl.position.set(0, 0.4, -B.L / 2 + 0.01); grp.add(pl);
    // tekerlekler
    const wheels = [];
    const rimDef = opt.jant || { kol: 5 };
    for (const sz of [1, -1]) for (const sx of [-1, 1]) {
      const w = wheel(B.r, 0.26, opt.basit ? { kol: 0, basit: 1 } : rimDef, opt.jantRenk || '#c8ccd4');
      w.position.set(sx * (halfW(B, B.wb) - 0.07), B.r, sz * B.wb);
      w.userData.front = sz > 0;
      grp.add(w); wheels.push(w);
    }
    // çamurluk boşlukları (tekerleğin üstünde koyu yarım daire), marşpiyel, aynalar
    const archM = mat('arch', () => new THREE.MeshBasicMaterial({ color: 0x060608, side: THREE.DoubleSide }));
    const archG = new THREE.CircleGeometry(B.r + 0.07, 12, 0, Math.PI);
    for (const sz of [1, -1]) for (const sx of [-1, 1]) {
      const a = new THREE.Mesh(archG, archM);
      a.rotation.y = sx * Math.PI / 2;
      a.position.set(sx * (halfW(B, B.wb) * 1.005 + 0.012), B.r, sz * B.wb);
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
      const fw = halfW(B, B.L / 2 - 0.3) * 1.9;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.05, 0.34), darkM); sp.position.set(0, 0.2, B.L / 2 - 0.22); grp.add(sp);
      for (const sx of [-1, 1]) {
        const sk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, B.wb * 1.25), km); sk.position.set(sx * (halfW(B, 0) + 0.02), 0.27, 0); grp.add(sk);
      }
      const df = new THREE.Mesh(new THREE.BoxGeometry(halfW(B, -B.L / 2 + 0.3) * 1.6, 0.08, 0.3), darkM); df.position.set(0, 0.22, -B.L / 2 + 0.2); grp.add(df);
      for (let i = -2; i <= 2; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.3), darkM); fin.position.set(i * 0.2, 0.26, -B.L / 2 + 0.2); grp.add(fin); }
      if (kit >= 2) for (const sz of [1, -1]) for (const sx of [-1, 1]) {
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(B.r * 1.32, B.r * 1.32, 0.12, 14, 1, true, 0, Math.PI), wallM);
        fl.rotation.z = Math.PI / 2; fl.material = wallM;
        fl.position.set(sx * (halfW(B, B.wb) + 0.03), B.r, sz * B.wb); grp.add(fl);
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
      neonM = new THREE.MeshBasicMaterial({ color: opt.neon, map: blobTex(), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
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
    compact(grp, new Set(wheels));
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

  // park etmiş arabalar için tek parça geometri (gövde + kabin), örneklemeli çizim için
  function parkGeo(type) {
    const B = BODY[type] || BODY.sedan, q0 = Q; Q = 0;
    const b = loftBody(B), c = loftCabin(B, type === 'van');
    Q = q0;
    c.clearGroups();
    return [b, c, B];
  }
  G.ARABA3D = { make, dispose, setEnv, setQuality, BODY, blobTex, parkGeo };
})(window);
