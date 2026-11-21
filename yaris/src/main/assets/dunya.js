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
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
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
  function checkerTex() {
    const THREE = T3(), c = cvs(64, 16), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#eee'; x.fillRect(i * 4, j * 4, 4, 4); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
  }
  function textTex(txt, bg, fg, w, h) {
    const THREE = T3(), c = cvs(w || 256, h || 64), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = fg; x.font = `bold ${Math.round(c.height * 0.6)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(txt, c.width / 2, c.height / 2 + 2);
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
  function ribbon(T, d1, d2, yOff, vLen, every, yOff2) {
    const THREE = T3(), N = T.N + (T.loop ? 1 : 0), st = every || 1;
    const pos = [], uv = [], idx = [];
    let n = 0;
    for (let i = 0; i < N; i += st) {
      const k = i % T.N, h = T.hd[k], nx = -Math.cos(h), nz = Math.sin(h);
      const x = T.px[k], z = T.pz[k], y = T.py[k];
      pos.push(x + nx * d1, y + yOff, z + nz * d1, x + nx * d2, y + (yOff2 != null ? yOff2 : yOff), z + nz * d2);
      const v = (i * T.step) / vLen;
      uv.push(0, v, 1, v);
      if (n > 0) { const a = (n - 1) * 2, b = n * 2; idx.push(a, b, a + 1, a + 1, b, b + 1); }
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

  function placeAlong(T, every, offs, fn, r) {
    for (let s = 10; s < T.L - 10; s += every * (0.7 + r() * 0.6)) {
      for (const side of offs) fn(s, side);
    }
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
    const sky = SKY[opts.saat || 'gece'](zone);
    const wet = opts.hava === 'yagmur';
    const objs = [], anim = [], disposables = [];
    const add = o => { scene.add(o); objs.push(o); return o; };

    // merkez ve yarıçap
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, minY = 1e9;
    for (let i = 0; i < T.N; i++) { minX = Math.min(minX, T.px[i]); maxX = Math.max(maxX, T.px[i]); minZ = Math.min(minZ, T.pz[i]); maxZ = Math.max(maxZ, T.pz[i]); minY = Math.min(minY, T.py[i]); }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, rad = Math.max(maxX - minX, maxZ - minZ) / 2 + 400;

    // ── gökyüzü ──
    const fogCol = col(wet ? mix(sky.fog, '#3a4048', 0.5).getStyle() : sky.fog);
    const fogNear = opts.hava === 'sis' ? 20 : wet ? 60 : 120, fogFar = opts.hava === 'sis' ? 260 : wet ? 520 : 900;
    scene.fog = new THREE.Fog(fogCol, fogNear, fogFar);
    scene.background = col(sky.hor);
    const skyG = new THREE.SphereGeometry(1600, 24, 12);
    const cTop = col(sky.top), cHor = col(sky.hor), sc = [];
    const sp = skyG.attributes.position;
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) / 1600; const c = cHor.clone().lerp(cTop, Math.pow(Math.max(0, y), 0.55)); if (y < 0) c.copy(fogCol); sc.push(c.r, c.g, c.b); }
    skyG.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    const skyM = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyM.renderOrder = -10; add(skyM);
    if (sky.stars > 0 && opts.hava !== 'sis') {
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

    function glowPoints(arr, c, size) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ map: glow, color: c, size, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    }
    // ── ışıklar ──
    const hemi = add(new THREE.HemisphereLight(col(sky.top).lerp(col('#ffffff'), 0.3), col(zone.zemin), sky.amb));
    const sun = new THREE.DirectionalLight(col(sky.sunCol), sky.sun);
    sun.position.copy(sunDir).multiplyScalar(100); add(sun); add(sun.target);

    // ── zemin ──
    const groundCol = tema === 'sahil' ? (opts.saat === 'gece' ? '#3a3428' : '#c8b090') : tema === 'dag' ? '#1e2a1c' : zone.zemin;
    const gM = new THREE.MeshLambertMaterial({ color: mix(groundCol, sky.fog, 0.15) });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(rad * 2.2, rad * 2.2), gM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(cx, minY - 0.6, cz); add(ground);
    // yol kenarındaki yakın zemin (yükseltiyi takip eder)
    const sideM = new THREE.MeshLambertMaterial({ color: mix(groundCol, '#000', 0.1), side: THREE.DoubleSide });
    add(new THREE.Mesh(ribbon(T, -W / 2 - 3, -W / 2 - 90, -0.02, 10, 2, -0.6 - (tema === 'dag' ? 2 : 0)), sideM));
    add(new THREE.Mesh(ribbon(T, W / 2 + 3, W / 2 + 90, -0.02, 10, 2, -0.6 - (tema === 'dag' ? 2 : 0)), sideM));

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
    const roadM = q >= 1 ? new THREE.MeshStandardMaterial({ map: rt, roughness: wet ? 0.28 : 0.85, metalness: wet ? 0.35 : 0.05, envMap: opts.env, envMapIntensity: wet ? 1.2 : 0.3 })
      : new THREE.MeshLambertMaterial({ map: rt });
    add(new THREE.Mesh(ribbon(T, -W / 2, W / 2, 0, 16), roadM));
    // kaldırım / bordür
    const curbM = new THREE.MeshLambertMaterial({ color: tema === 'dag' ? '#5a5a55' : '#8a8a90', side: THREE.DoubleSide });
    const walkM = new THREE.MeshLambertMaterial({ color: tema === 'dag' ? '#3a3a30' : '#55555c', side: THREE.DoubleSide });
    for (const sg of [-1, 1]) {
      add(new THREE.Mesh(ribbon(T, sg * W / 2, sg * (W / 2 + 0.01), 0, 10, 2, 0.18), curbM));
      add(new THREE.Mesh(ribbon(T, sg * W / 2, sg * (W / 2 + 3), 0.18, 10, 2), walkM));
    }
    // köprü / dağ: bariyerler
    if (tema === 'dag' || tema === 'otoyol' || tema === 'sahil') {
      const bm = new THREE.MeshLambertMaterial({ color: tema === 'otoyol' ? '#9a9aa2' : '#c8ccd0', side: THREE.DoubleSide });
      for (const sg of [-1, 1]) add(new THREE.Mesh(ribbon(T, sg * (W / 2 + 0.3), sg * (W / 2 + 0.31), 0.18, 10, 2, tema === 'otoyol' ? 1.1 : 0.85), bm));
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
    const poleG = new THREE.CylinderGeometry(0.12, 0.16, 8, 6); poleG.translate(0, 4, 0);
    const poleM = new THREE.MeshLambertMaterial({ color: '#2a2a30' });
    const poles = new THREE.InstancedMesh(poleG, poleM, nL);
    const armG = new THREE.BoxGeometry(0.15, 0.15, 2.6); armG.translate(0, 8, 1.2);
    const arms = new THREE.InstancedMesh(armG, poleM, nL);
    const lampCol = col(zone.isik);
    const headG = new THREE.BoxGeometry(0.5, 0.15, 0.8); headG.translate(0, 7.9, 2.3);
    const heads = new THREE.InstancedMesh(headG, new THREE.MeshBasicMaterial({ color: sky.lamps > 0 ? lampCol : col('#555') }), nL);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1), o = {};
    const lampPos = [];
    let li = 0;
    for (let s = 5; s < T.L - 5 && li < nL - 1; s += lampEvery) {
      for (const sg of (tema === 'dag' ? [s % (lampEvery * 2) < lampEvery ? 1 : -1] : [-1, 1])) {
        G.PIST.sample(T, s + (sg > 0 ? lampEvery / 2 : 0), sg * (W / 2 + 1.2), o);
        const yaw = o.h + (sg > 0 ? Math.PI / 2 : -Math.PI / 2);
        q4.setFromAxisAngle(v3.set(0, 1, 0), yaw + Math.PI);
        m4.compose(new THREE.Vector3(o.x, o.y + 0.18, o.z), q4, s3);
        poles.setMatrixAt(li, m4); arms.setMatrixAt(li, m4); heads.setMatrixAt(li, m4);
        G.PIST.sample(T, s + (sg > 0 ? lampEvery / 2 : 0), sg * (W / 2 - 1.3), o);
        lampPos.push([o.x, o.y, o.z, s]);
        li++;
      }
    }
    poles.count = arms.count = heads.count = li;
    add(poles); add(arms); add(heads);
    // ışık havuzları (yola düşen ışık) ve parıltılar
    if (sky.lamps > 0) {
      const poolG = new THREE.PlaneGeometry(14, 14); poolG.rotateX(-Math.PI / 2);
      const poolM = new THREE.MeshBasicMaterial({ map: glow, color: lampCol.clone().multiplyScalar(0.5 * sky.lamps * (wet ? 1.5 : 1)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const pools = new THREE.InstancedMesh(poolG, poolM, lampPos.length);
      const gp = [];
      lampPos.forEach((p, i) => {
        m4.makeTranslation(p[0], p[1] + 0.06, p[2]); pools.setMatrixAt(i, m4);
        gp.push(p[0], p[1] + 7.7, p[2]);
      });
      pools.renderOrder = 3; add(pools);
      add(glowPoints(gp, lampCol, 3.5));
    }

    // ── binalar ──
    const isNight = opts.saat === 'gece';
    const bTone = zone.bina;
    const bins = [[0, 0.33], [0.33, 0.7], [0.7, 1.01]];
    const hMin = zone.yuk[0], hMax = zone.yuk[1];
    if (tema !== 'dag') {
      const placed = [[], [], []];
      const gap = tema === 'merkez' ? 16 : tema === 'otoyol' ? 34 : 22;
      for (let s = 0; s < T.L; s += gap * (0.8 + r() * 0.5)) {
        for (const sg of [-1, 1]) {
          if (tema === 'sahil' && sg > 0) continue; // deniz tarafı boş
          if (tema === 'otoyol' && r() < 0.5) continue;
          const w = 10 + r() * (tema === 'merkez' ? 18 : 14), dpt = 10 + r() * 14;
          const back = W / 2 + 6 + dpt / 2 + r() * (tema === 'otoyol' ? 60 : 8);
          G.PIST.sample(T, s, sg * back, o);
          if (G.PIST.roadDist(T, o.x, o.z) < W / 2 + 4 + Math.max(w, dpt) / 2) continue;
          const t = Math.pow(r(), tema === 'merkez' ? 0.8 : 1.6);
          const h = hMin + (hMax - hMin) * t;
          const bi = t < 0.33 ? 0 : t < 0.7 ? 1 : 2;
          placed[bi].push([o.x, o.y, o.z, o.h, w, h, dpt, Math.floor(r() * bTone.length)]);
          // ikinci sıra (daha arkada, daha yüksek)
          if (tema === 'merkez' && r() < 0.6) {
            G.PIST.sample(T, s + 5, sg * (back + dpt + 8), o);
            if (G.PIST.roadDist(T, o.x, o.z) > W / 2 + 20) placed[2].push([o.x, o.y, o.z, o.h, w * 1.2, h * 1.4 + 20, dpt, Math.floor(r() * bTone.length)]);
          }
        }
      }
      const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
      placed.forEach((arr, bi) => {
        if (!arr.length) return;
        const rows = [4, 10, 24][bi];
        const [tex, emi] = windowTex(4, rows, isNight ? 0.38 : 0.12, '#9a9aa0'); tex.repeat.set(2, 1); emi.repeat.set(2, 1); disposables.push(tex, emi);
        const bm = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: emi, emissive: col('#ffffff'), emissiveIntensity: isNight ? 1.2 : opts.saat === 'aksam' ? 0.6 : 0 });
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
          const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(b[4] * 0.9, 12), 3), new THREE.MeshBasicMaterial({ map: tx, color: isNight ? 0xffffff : 0x999999 }));
          // tabela yola baksın
          G.PIST.sample(T, 0, 0, o);
          const ang = b[3];
          m.position.set(b[0], b[1] + Math.min(b[5] - 3, 6 + (i % 4) * 4), b[2]);
          m.rotation.y = ang;
          // binanın yola bakan yüzüne it
          const toRoad = Math.atan2(-(b[0] - cx), -(b[2] - cz));
          m.lookAt(m.position.x + Math.sin(ang + Math.PI / 2), m.position.y, m.position.z + Math.cos(ang + Math.PI / 2));
          const ri = G.PIST.roadDist(T, m.position.x + Math.sin(ang + Math.PI / 2) * 5, m.position.z + Math.cos(ang + Math.PI / 2) * 5);
          const rj = G.PIST.roadDist(T, m.position.x - Math.sin(ang + Math.PI / 2) * 5, m.position.z - Math.cos(ang + Math.PI / 2) * 5);
          const sgn = ri < rj ? 1 : -1;
          m.lookAt(m.position.x + sgn * Math.sin(ang + Math.PI / 2), m.position.y, m.position.z + sgn * Math.cos(ang + Math.PI / 2));
          m.position.x += sgn * Math.sin(ang + Math.PI / 2) * (b[6] / 2 + 0.2);
          m.position.z += sgn * Math.cos(ang + Math.PI / 2) * (b[6] / 2 + 0.2);
          void toRoad;
          add(m);
        }
      }
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
          if (G.PIST.roadDist(T, o.x, o.z) < W / 2 + 6) continue;
          const stack = 1 + Math.floor(r() * 3);
          for (let k = 0; k < stack; k++) put(o.x, o.y - 0.3 + k * 2.6, o.z, o.h + (r() < 0.5 ? 0 : Math.PI / 2), 2.4, 2.6, 6 + (r() < 0.5 ? 6 : 0), cc[Math.floor(r() * cc.length)]);
        }
      });
      // vinçler
      for (let i = 0; i < 6; i++) {
        G.PIST.sample(T, (i + 0.5) * T.L / 6, (i % 2 ? 1 : -1) * (W / 2 + 40), o);
        if (G.PIST.roadDist(T, o.x, o.z) < 25) continue;
        const cr = new THREE.Group(), cm = new THREE.MeshLambertMaterial({ color: '#e0a020' });
        for (const dx of [-4, 4]) for (const dz of [-4, 4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.8, 38, 0.8), cm); l.position.set(dx, 19, dz); cr.add(l); }
        const top = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 60), cm); top.position.set(0, 39, 10); cr.add(top);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), new THREE.MeshLambertMaterial({ color: '#444' })); cab.position.set(0, 36, 0); cr.add(cab);
        const lt = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: glow, color: 0xff3030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); lt.position.set(0, 42, 38); cr.add(lt);
        cr.position.set(o.x, o.y, o.z); cr.rotation.y = o.h + r() * 2; add(cr);
      }
    } else if (tema === 'sanayi') {
      const chim = [];
      for (let s = 50; s < T.L; s += 130 * (0.6 + r())) { const sg = r() < 0.5 ? -1 : 1; G.PIST.sample(T, s, sg * (W / 2 + 30 + r() * 40), o); if (G.PIST.roadDist(T, o.x, o.z) > 22) chim.push([o.x, o.y, o.z, 25 + r() * 35]); }
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
      for (let s = 80; s < T.L; s += 210 * (0.6 + r())) { const sg = r() < 0.5 ? -1 : 1; G.PIST.sample(T, s, sg * (W / 2 + 16 + r() * 10), o); if (G.PIST.roadDist(T, o.x, o.z) > W / 2 + 10) tk.push([o.x, o.y, o.z]); }
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
        if (G.PIST.roadDist(T, o.x, o.z) < W / 2 + 4) continue;
        pines.push([o.x, o.y - 0.5 - (off - W / 2) * 0.03, o.z, 6 + r() * 9]);
      }
      const pg = new THREE.ConeGeometry(1, 1, 7); pg.translate(0, 0.5, 0);
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
      for (let s = 0; s < T.L && rk < 300; s += 30 * (0.5 + r())) { const sg = r() < 0.5 ? -1 : 1; G.PIST.sample(T, s, sg * (W / 2 + 4 + r() * 20), o); if (G.PIST.roadDist(T, o.x, o.z) < W / 2 + 3) continue; const sz = 1 + r() * 3; e.set(r() * 3, r() * 3, r() * 3); q4.setFromEuler(e); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q4, new THREE.Vector3(sz, sz * 0.7, sz)); rocks.setMatrixAt(rk++, m4); }
      rocks.count = rk; add(rocks);
    }
    // otoyol tabelaları
    if (tema === 'otoyol' || tema === 'merkez') {
      for (let s = 300; s < T.L - 100; s += 600) {
        G.PIST.sample(T, s, 0, o);
        const gg = new THREE.Group(), pm = new THREE.MeshLambertMaterial({ color: '#555' });
        for (const sg of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), pm); p.position.set(sg * (W / 2 + 1), 3.5, 0); gg.add(p); }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 0.4, 0.4), pm); beam.position.y = 7; gg.add(beam);
        const tx = textTex(['KARALİMAN ↑', 'KÖPRÜ 2 KM', 'LİMAN ←', 'ÇIKIŞ 7'][Math.floor(s / 600) % 4], '#0b5e2a', '#ffffff', 256, 64); disposables.push(tx);
        const sgn = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.3), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); sgn.position.y = 8.4; sgn.rotation.y = Math.PI; gg.add(sgn);
        gg.position.set(o.x, o.y, o.z); gg.rotation.y = o.h; add(gg);
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
    function update(dt, cam) {
      time += dt;
      for (const f of anim) f(time);
      skyGroup.position.set(cam.position.x, 0, cam.position.z);
      sun.position.set(cam.position.x + sunDir.x * 100, cam.position.y + sunDir.y * 100, cam.position.z + sunDir.z * 100);
      sun.target.position.copy(cam.position);
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
          if (x.geometry) x.geometry.dispose();
          const ms = Array.isArray(x.material) ? x.material : x.material ? [x.material] : [];
          ms.forEach(m => { if (m.map && disposables.indexOf(m.map) < 0) m.map.dispose(); m.dispose(); });
        });
      }
      disposables.forEach(t => t.dispose());
      scene.fog = null;
    }
    return { update, dispose, addLine, addGate, addCheckpoint, addSpeedCam, addBreaker, addRoadblock, remove, glow, sky, isNight, minY, wet };
  }

  G.DUNYA = { build, envMap, SKY, glowTex };
})(window);
