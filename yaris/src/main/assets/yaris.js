// Gece Kaçağı — yarış motoru: fizik, yapay zekâ, trafik, polis, yarış türleri, kamera, efektler, gösterge, kontroller
// Araçlar pist uzayında yaşar: s = pist boyunca mesafe, d = yanal kayma (sağ +), a = yola göre açı (sağ +)
(function (G) {
  'use strict';
  const P = () => G.PIST, V = () => G.VERI, A3 = () => G.ARABA3D, SES = () => G.SES || { engine() {}, skid() {}, siren() {}, sfx() {}, music() {}, stopEngine() {} };
  const KMH = 3.6, GRAV = 9.81;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (id) => document.getElementById(id);

  let THREE, renderer, camera, scene, canvas, root;
  let Q = 2;                // grafik kalitesi
  let R = null;             // etkin yarış durumu
  let SHOW = null;          // vitrin (garaj) durumu
  let raf = 0, lastT = 0, running = false, paused = false;
  let CITY = null; // v15: açık şehir modu (sehir.js) — etkinken yarış yerine o çalışır
  const fpsW = { t: 0, n: 0 };
  const tmp = {}, tmp2 = {};
  const input = { steer: 0, gas: 0, brake: 0, nitro: 0, hb: 0, odak: 0, tilt: 0, laneL: 0, laneR: 0, shift: 0, gUp: 0, gDn: 0 };
  const opt = { klasik: false, autoGas: false, assist: 0.5, tilt: false, cam: 0, vib: true, tiltSens: 1, fx: 2,
    steerSens: 1, steerMode: 'kaydir', manual: false, traffic: 1, shake: 1 }; // v10: direksiyon hassasiyeti/tipi, elle vites, trafik çarpanı, sarsıntı

  // ───────── kurulum ─────────
  function init(cv, rootEl, quality) {
    THREE = G.THREE; canvas = cv; root = rootEl; Q = quality;
    // renkler sRGB olarak yorumlansın (yoksa her şey soluk/beyaz görünür)
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    if (!THREE.CanvasTexture.__srgb) {
      const CT = THREE.CanvasTexture;
      const P2 = function (a, b, c, d, e, f, g, h, i) { const t = new CT(a, b, c, d, e, f, g, h, i); t.encoding = THREE.sRGBEncoding; return t; };
      P2.prototype = CT.prototype; P2.__srgb = true;
      THREE.CanvasTexture = P2;
    }
    renderer = new THREE.WebGLRenderer({ canvas, antialias: Q >= 1, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.5, 2000);
    try { if (G.POST) G.POST.init(renderer, Q); } catch (e) { console.warn('ekran efektleri kapalı', e); }
    setQuality(Q);
    window.addEventListener('resize', resize);
    resize();
    A3().setQuality(Q);
    return true;
  }
  function setQuality(q) {
    Q = q;
    if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 0 ? 0.8 : q === 1 ? 1.1 : q === 2 ? 1.6 : 2.2));
    if (G.POST && G.POST.ok) G.POST.setQuality(q);
    if (renderer) { renderer.shadowMap.enabled = q >= 1; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    if (G.ARABA3D) A3().setQuality(q);
    resize();
  }
  function resize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    let dt = Math.min(0.1, (t - lastT) / 1000 || 0.016); lastT = t;
    if (PH && R) { photoFrame(dt); return; }
    if (paused) return;
    if (CITY) { CITY.step(dt); return; }
    // kare hızı bekçisi: yüksek grafikte telefon yetişemiyorsa bir kademe düşür
    if (R && R.phase === 'yaris' && Q >= 2) {
      fpsW.t += dt; fpsW.n++;
      if (fpsW.t > 6) { const f = fpsW.n / fpsW.t; fpsW.t = 0; fpsW.n = 0; if (f < (Q >= 3 ? 40 : 27) && G.onLowFps) G.onLowFps(f); }
    }
    if (R) stepRace(dt);
    else if (SHOW) stepShow(dt);
  }
  function draw(sc) {
    if (Q >= 1 && G.POST && G.POST.ok) G.POST.render(sc, camera);
    else renderer.render(sc, camera);
  }
  function startLoop() { if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(loop); } }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  // ───────── VİTRİN (garaj / ana menü arka planı) ─────────
  function showroom(vis, mode) {
    if (R) return;
    if (!SHOW) {
      const sc = new THREE.Scene();
      sc.background = new THREE.Color('#07070d');
      sc.fog = new THREE.Fog('#07070d', 14, 40);
      const env = G.DUNYA.envMap(renderer, '#1a1030', '#ff2e63', '#00e5ff');
      A3().setEnv(env);
      sc.add(new THREE.HemisphereLight(0x8899ff, 0x220022, 0.6));
      const d1 = new THREE.DirectionalLight(0xffffff, 1.4); d1.position.set(4, 8, 5); sc.add(d1);
      const d2 = new THREE.DirectionalLight(0xff2e63, 1.0); d2.position.set(-6, 3, -4); sc.add(d2);
      const d3 = new THREE.DirectionalLight(0x00e5ff, 0.8); d3.position.set(6, 2, -6); sc.add(d3);
      // dönen platform + ızgara zemin
      const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#0d0d16', roughness: 0.25, metalness: 0.6, envMap: env }));
      fl.rotation.x = -Math.PI / 2; sc.add(fl);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#191926', roughness: 0.3, metalness: 0.8, envMap: env }));
      plat.position.y = 0.06; sc.add(plat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.04, 6, 64), new THREE.MeshBasicMaterial({ color: 0xff2e63 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; sc.add(ring);
      const grid = new THREE.GridHelper(60, 30, 0x2a1a40, 0x16101f); grid.position.y = 0.01; sc.add(grid);
      // arka planda neon şeritler
      for (let i = 0; i < 7; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6 + (i % 3) * 2, 0.15), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff2e63 : 0x00e5ff }));
        const a = -1.2 + i * 0.4; b.position.set(Math.sin(a) * 14, 3, -Math.cos(a) * 14); sc.add(b);
      }
      SHOW = { sc, env, car: null, ang: 0.6, drag: 0, mode: 'menu', t: 0, plat, ring };
      bindShowDrag();
    }
    if (!SHOW.real && G.VARLIK && G.VARLIK.ready) realShowroom();
    A3().setEnv(SHOW.env);  // yarıştan dönünce yarışın (silinmiş) ortam haritası kalmasın
    SHOW.mode = mode || 'menu';
    if (vis) setShowCar(vis);
    root.classList.add('show');
    startLoop();
  }
  // gerçekçi stüdyo garaj: beton zemin, nötr ışık, kapalı hava yansımaları
  function realShowroom() {
    const S = SHOW, old = S.sc;
    const sc = new THREE.Scene();
    sc.background = new THREE.Color('#1a1b1e'); sc.fog = new THREE.Fog('#1a1b1e', 16, 42);
    const env = G.DUNYA.envFromSky(renderer, { tema: 'liman' }, 'gunduz', 'yagmur') || S.env;
    A3().setEnv(env);
    sc.add(new THREE.HemisphereLight(0xdfe6ef, 0x2a2a2c, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 10, 6); sc.add(key);
    key.castShadow = Q >= 1; key.shadow.mapSize.set(1024, 1024); const kc = key.shadow.camera; kc.left = kc.bottom = -6; kc.right = kc.top = 6; kc.near = 1; kc.far = 30; key.shadow.bias = -0.0005;
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.6); fill.position.set(-7, 4, -3); sc.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8d0, 0.8); rim.position.set(0, 5, -9); sc.add(rim);
    const ft = G.VARLIK.tex('beton_diff', 8, 8);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ map: ft, color: '#3e3e42', roughness: 0.5, metalness: 0.1, envMap: env, envMapIntensity: 0.5 }));
    fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#2a2b2f', roughness: 0.35, metalness: 0.7, envMap: env }));
    plat.position.y = 0.06; plat.receiveShadow = true; sc.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.03, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; sc.add(ring);
    // tavanda şerit ışıklar (yansımalarda görünür)
    for (let i = -2; i <= 2; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); l.position.set(i * 2.2, 7, 0); sc.add(l); }
    // arka duvar
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 12, 48, 1, true), new THREE.MeshStandardMaterial({ map: G.VARLIK.tex('beton_diff', 10, 2), color: '#3a3a3e', side: THREE.BackSide, roughness: 0.9 }));
    wall.position.y = 6; sc.add(wall);
    S.sc = sc; S.env = env; S.plat = plat; S.ring = ring; S.real = true; S.key = key;
    if (S.car) { old.remove(S.car); sc.add(S.car); }
    old.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  function carReady(id) {
    if (SHOW && SHOW.vis && SHOW.vis.model === id && !R) setShowCar(SHOW.vis);
  }
  function setShowCar(vis) {
    if (!SHOW) return;
    SHOW.vis = vis;
    if (SHOW.car) { SHOW.sc.remove(SHOW.car); A3().dispose(SHOW.car); }
    SHOW.car = A3().make(vis);
    SHOW.car.position.y = 0.12;
    if (SHOW.real && Q >= 1) SHOW.car.traverse(o => { if (o.isMesh && !(o.material && o.material.transparent)) o.castShadow = true; });
    SHOW.sc.add(SHOW.car);
  }
  function bindShowDrag() {
    let down = false, lx = 0;
    canvas.addEventListener('pointerdown', e => { if (!SHOW || R) return; down = true; lx = e.clientX; });
    window.addEventListener('pointerup', () => { down = false; });
    window.addEventListener('pointermove', e => { if (!down || !SHOW || R) return; SHOW.ang += (e.clientX - lx) * 0.01; SHOW.drag = 1.5; lx = e.clientX; });
  }
  // v15: hikâye sinematik çekimleri (u: 0→1 çekim ilerlemesi) → [kamera x,y,z, bakış x,y,z, fov]
  const SHOTS = [
    u => [Math.sin(0.65) * (7.8 - 2.2 * u), 0.55 + 0.2 * u, Math.cos(0.65) * (7.8 - 2.2 * u), 0, 0.75, 0, 38],          // alçak ön 3/4, yaklaşır
    u => [-5.5 + 11 * u, 1.0, 4.6, 0, 0.8, 0, 34],                                                                       // yandan kayan takip
    u => [Math.sin(Math.PI + 0.5 + 0.25 * u) * 6.2, 0.45, Math.cos(Math.PI + 0.5 + 0.25 * u) * 6.2, 0, 0.9, 0, 36],      // arkadan alçak (stoplar)
    u => [Math.sin(0.3 + 0.6 * u) * 9.5, 5.5 - 1.2 * u, Math.cos(0.3 + 0.6 * u) * 9.5, 0, 0.4, 0, 44],                   // yukarıdan dönen
    u => [Math.sin(0.15) * (4.2 - 0.6 * u), 0.7, Math.cos(0.15) * (4.2 - 0.6 * u), 0, 0.62, 0.9, 30],                   // far/ızgara yakın çekim
    u => [Math.sin(-0.9 - 0.3 * u) * 5.2, 1.7, Math.cos(-0.9 - 0.3 * u) * 5.2, 0, 0.6, 0, 40],                          // sol omuz
  ];
  const _cp = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, f: 40, ok: false };
  function cine(shot) { if (!SHOW) return; SHOW.shot = shot; SHOW.st = 0; }
  function stepShow(dt) {
    const S = SHOW; S.t += dt;
    if (S.mode === 'sinema') {
      S.st = (S.st || 0) + dt;
      const u = 1 - Math.pow(1 - Math.min(1, S.st / 7), 2);
      const v = SHOTS[(S.shot || 0) % SHOTS.length](u);
      const k = _cp.ok ? Math.min(1, dt * (S.st < 0.6 ? 5 : 2.5)) : 1; _cp.ok = true;
      _cp.x += (v[0] - _cp.x) * k; _cp.y += (v[1] - _cp.y) * k; _cp.z += (v[2] - _cp.z) * k;
      _cp.lx += (v[3] - _cp.lx) * k; _cp.ly += (v[4] - _cp.ly) * k; _cp.lz += (v[5] - _cp.lz) * k; _cp.f += (v[6] - _cp.f) * k;
      if (S.car) { S.car.rotation.y = 0; for (const w of S.car.userData.wheels) w.rotation.x = 0; }
      S.plat.rotation.y = 0;
      camera.clearViewOffset();
      camera.position.set(_cp.x, _cp.y + Math.sin(S.t * 0.7) * 0.03, _cp.z); camera.lookAt(_cp.lx, _cp.ly, _cp.lz);
      camera.fov = _cp.f; camera.updateProjectionMatrix();
      if (G.POST) { const P2 = G.POST.P; P2.speed = 0; P2.nitro = 0; P2.hit = S.hit || 0; P2.odak = 0; P2.tint = S.tint || [1.02, 0.98, 1.06]; P2.bloom = 0.9; P2.exposure = 1.0; }
      if (S.hit) S.hit = Math.max(0, S.hit - dt * 1.5);
      draw(S.sc);
      return;
    }
    _cp.ok = false;
    if (S.drag > 0) S.drag -= dt; else S.ang += dt * 0.25;
    if (S.car) {
      S.car.rotation.y = S.ang;
      for (const w of S.car.userData.wheels) w.rotation.x = 0;
    }
    S.plat.rotation.y = S.ang;
    const m = S.mode;
    const dist = m === 'garaj' ? 7.4 : 8.6, h = m === 'garaj' ? 2.0 : 1.6;
    const off = m === 'menu' ? 2.4 : m === 'garaj' ? 1.7 : 0;
    camera.position.set(Math.sin(0.5) * dist, h, Math.cos(0.5) * dist);
    camera.lookAt(0, 0.7, 0);
    const w = window.innerWidth, hh = window.innerHeight;
    const shift = m === 'garaj' ? 0.2 : m === 'menu' ? -0.17 : 0;
    camera.setViewOffset(w, hh, w * shift, hh * (m === 'garaj' ? -0.04 : 0), w, hh);
    camera.fov = 45; camera.updateProjectionMatrix();
    void off;
    if (!S.real) S.ring.material.color.setHSL((S.t * 0.05) % 1, 1, 0.55);
    if (G.POST) { const P2 = G.POST.P; P2.speed = 0; P2.nitro = 0; P2.hit = 0; P2.odak = 0; P2.tint = [1, 1, 1]; P2.bloom = 0.8; P2.exposure = 1.05; }
    draw(S.sc);
  }
  function hideShow() { root.classList.remove('show'); }

  // ───────── YARIŞ KURULUMU ─────────
  /**
   * cfg: {tip, pist (def), bolge (zone), tur, oyuncu:{stats, vis, ad}, rakipler:[{ad, stats, vis, zor, renk}],
   *       polis (başlangıç aranma 0-5), hedef, hava, saat, trafik (0..1), zor, cb:{onFinish, onPause}}
   */
  function start(cfg) {
    stopRace(true);
    hideShow();
    const Z = cfg.bolge;
    const noJump = cfg.tip === 'drag';
    const T = P().build(Object.assign({ stil: Z.stil, tepe: Z.tepe, W: Z.W || 14, zipla: noJump ? 0 : (Z.zipla != null ? Z.zipla : 2) }, cfg.pist));
    // kestirmeler (ara sokaklar) ve rampalar
    const rr = P().rng((cfg.pist.seed || 1) * 13 + 5);
    const shortcuts = noJump || cfg.tip === 'drift' ? [] : P().shortcuts(T, 3, rr).filter(k => !(Z.tema === 'dag' && k.side < 0)); // dağda sol yan kaya yamacı
    shortcuts.forEach((k, i) => {
      k.id = i;
      const hs = scHeights(T, k, Z.tema);
      k.T = P().build({ poly: k.poly, tip: 'acik', W: 10, stil: 'sehir', seed: 7 + i, yFn: (x, L) => { const f = clamp(x / L, 0, 1) * (hs.length - 1), j = Math.min(hs.length - 2, Math.floor(f)); return hs[j] + (hs[j + 1] - hs[j]) * (f - j); } });
    });
    const ramps = [];
    if (!noJump) {
      const nearSc = s0 => shortcuts.some(k => Math.abs(s0 - k.sA) < 120 || Math.abs(s0 - k.sB) < 120);
      let last = -999;
      const maxR = Math.min(5, Math.floor(T.L / 900) + 1);
      for (let s0 = 300; s0 < T.L - 250 && ramps.length < maxR; s0 += 30) {
        if (s0 - last < 550 || nearSc(s0) || (T.bumps || []).some(b => Math.abs(b - s0) < 150)) continue;
        if (P().maxCurv(T, s0 - 30, 140) > 0.0035) continue;
        const nl0 = Math.max(2, Math.round(T.W / 3.5)), lw = T.W / nl0;
        const lane = rr() < 0.5 ? nl0 - 1 : rr() < 0.5 ? 0 : Math.floor(nl0 / 2);
        ramps.push({ sc: null, s0, len: 9, d0: -T.W / 2 + (lane + 0.5) * lw, w: lw * 1.25, h: 1.5 + rr() * 0.4 });
        last = s0;
      }
      for (const k of shortcuts) {
        const m = k.T.L / 2;
        if (P().maxCurv(k.T, m - 20, 55) < 0.014) ramps.push({ sc: k, s0: m - 6, len: 8, d0: 0, w: k.T.W - 1, h: 1.9 });
      }
    }
    scene = new THREE.Scene();
    const sky = G.DUNYA.SKY[cfg.saat || 'gece'](Z);
    const env = G.DUNYA.envFromSky(renderer, Z, cfg.saat, cfg.hava) || G.DUNYA.envMap(renderer, sky.top, sky.hor, Z.isik);
    A3().setEnv(env);
    const world = G.DUNYA.build(scene, T, Z, { saat: cfg.saat, hava: cfg.hava, q: Q, env, renderer, shortcuts, ramps });
    const nl = Math.max(2, Math.round(T.W / 3.5));
    R = {
      cfg, T, world, env, scene, t: 0, phase: 'geri', count: 3.6, nl,
      cars: [], racers: [], cops: [], traffic: [], fx: [], pops: [], breakers: [], blocks: [], cams: [], cps: [], gates: [],
      player: null, finished: false, result: null, slow: 1, shake: 0, odak: 1, odakT: 0,
      laps: cfg.tip === 'eleme' ? Math.max(1, (cfg.rakipler || []).length) : (cfg.tur || 1), eleme: { out: [], cross: {} },
      stats: { kilpayi: 0, carpma: 0, duvar: 0, mukemmel: 0, enHiz: 0, driftEn: 0, etkisiz: 0, barikat: 0, engel: 0, kacis: 0, mesafe: 0, hizToplam: 0, maxIsi: 0 },
      drift: { on: false, pts: 0, combo: 0, mult: 1, total: 0, t: 0 },
      purs: null, radioT: 6, camMode: opt.cam, wet: cfg.hava === 'yagmur',
      shortcuts, ramps,
    };
    R.stats.kestirme = 0; R.stats.ucus = 0;
    const grip = R.wet ? 0.86 : 1;
    R.gripMul = grip;
    // ── oyuncu ──
    R.cars = allCars;
    const pl = mkCar('racer', cfg.oyuncu.vis, cfg.oyuncu.stats);
    pl.ai = { lineBias: 0, nitroT: 99, lane: 0 };
    pl.isPlayer = true; pl.ad = cfg.oyuncu.ad || 'Sen'; pl.renk = '#ffffff';
    R.player = pl;
    const isDrag = cfg.tip === 'drag';
    const solo = cfg.tip === 'gise' || cfg.tip === 'drift' || cfg.tip === 'kovala' || cfg.tip === 'kacis' || cfg.tip === 'serbest';
    // ızgara: oyuncu arkada ortada başlar (hep geriden gelme hissi)
    const rk = solo ? [] : (cfg.rakipler || []);
    const lane = i => -T.W / 2 + (i + 0.5) * T.W / nl;
    const startS = T.loop ? -5 : 30;
    const grid = [];
    for (let i = 0; i <= rk.length; i++) grid.push({ s: startS - Math.floor(i / 2) * 9, d: (i % 2 ? 1 : -1) * T.W * 0.2 });
    if (isDrag) for (let i = 0; i <= rk.length; i++) grid[i] = { s: startS, d: lane(i % nl) };
    // v15: oyuncu iki sıranın ortasındaki boş koridorda başlar (önceden bir rakibin tam arkasındaydı → kalkışta arkadan çarpıyordu)
    const pg = isDrag ? grid[1 % grid.length] : solo ? { s: startS, d: T.W * 0.22 } : { s: grid[rk.length].s, d: 0 };
    place(pl, pg.s, pg.d);
    R.racers.push(pl);
    rk.forEach((o, i) => {
      const c = mkCar('racer', o.vis, o.stats);
      c.ad = o.ad; c.renk = o.renk || '#ff2e63'; c.zor = o.zor || 0.9; c.rival = !!o.rival;
      const gpos = isDrag ? grid[i >= 1 ? i + 1 : 0] : grid[i];
      place(c, gpos.s, gpos.d);
      c.ai = { lineBias: (Math.random() - 0.5) * 3, nitroT: 2 + Math.random() * 6, lane: Math.round((gpos.d + T.W / 2) / (T.W / nl) - 0.5) };
      R.racers.push(c);
    });
    if (isDrag) pl.lane = Math.round((pl.d + T.W / 2) / (T.W / nl) - 0.5);
    // ── bitiş, kapılar ──
    R.finishS = T.loop ? T.L : T.L - 60;
    if (T.loop) world.addLine(0.5);
    else { world.addLine(startS + 3); R.gates.push(world.addGate(R.finishS, 'BİTİŞ', '#ff2e63')); }
    if (cfg.tip === 'hiz') {
      const n = 5;
      for (let i = 0; i < n; i++) {
        // en düz noktayı ara (radar virajda olmasın)
        let best = T.L * (0.15 + i * 0.16), bk = 1;
        for (let x = -120; x <= 120; x += 10) { const s0 = T.L * (0.15 + i * 0.16) + x, k = P().maxCurv(T, s0 - 150, 160); if (k < bk) { bk = k; best = s0; } }
        R.cams.push({ s: best, obj: world.addSpeedCam(best), hits: {} });
      }
    }
    if (cfg.tip === 'gise') {
      const n = 6;
      for (let i = 1; i <= n; i++) { const s = i === n ? R.finishS : (R.finishS - startS) * i / n + startS; R.cps.push({ s, obj: i === n ? null : world.addCheckpoint(s, '#00e5ff'), done: false }); }
      const ref = (a, b) => { let t = 0; for (let s = a; s < b; s += 4) { const k = Math.abs(P().curvAt(T, s)); t += 4 / Math.min(pl.st.vmax * 0.9, Math.sqrt(pl.st.grip * R.gripMul * GRAV * 1.12 / Math.max(0.0008, k))); } return t; };
      const mul = 1.32 - 0.14 * (cfg.zor || 0.85);
      R.cpBudget = R.cps.map((c, i) => ref(i ? R.cps[i - 1].s : startS, c.s) * mul);
      R.timeLeft = R.cpBudget[0] + 8;
    }
    if (cfg.tip === 'drift') { R.driftTarget = cfg.hedef && cfg.hedef.t === 'puan' ? cfg.hedef.n : Math.round(T.L * R.laps * 1.2 / 500) * 500; }
    // ── takip engelleri (polisli modlarda) ──
    const copMode = cfg.tip === 'kovala' || cfg.tip === 'kacis' || cfg.tip === 'serbest' || cfg.polis > 0;
    if (copMode) {
      for (let s = 400; s < T.L - 200; s += 420 + Math.random() * 300) {
        const side = Math.random() < 0.5 ? -1 : 1;
        R.breakers.push({ s, side, obj: world.addBreaker(s, side), used: false, fall: 0 });
      }
    }
    initFx();
    buildHud();
    R.minimap = buildMinimap();
    // ── trafik ──
    const dens = cfg.trafik != null ? cfg.trafik : (isDrag ? 0.5 : cfg.tip === 'drift' || cfg.tip === 'eleme' || cfg.tip === 'devre' || cfg.tip === 'gise' ? 0.35 : 0.7);
    R.trafficN = Math.round((Q === 0 ? 8 : 14) * dens * (T.W / 14) * (cfg.trafik === 0 || cfg.tip === 'drift' ? 0 : opt.traffic));
    for (let i = 0; i < R.trafficN; i++) spawnTraffic(true, i);
    // ── polis ──
    if (cfg.tip === 'kovala' || cfg.tip === 'kacis') startPursuit(cfg.tip === 'kacis' ? (cfg.hedef && cfg.hedef.n) || cfg.polis || 3 : Math.max(1, cfg.polis || (cfg.hedef && cfg.hedef.t === 'kac' ? cfg.hedef.n : 1)), true);
    if (cfg.tip === 'serbest') { R.phase = 'yaris'; R.count = 0; spawnPatrols(); }
    R.sprintCopsAt = cfg.polis > 0 && !copMode ? 0 : null;
    if (cfg.polis > 0 && cfg.tip !== 'kovala' && cfg.tip !== 'kacis' && cfg.tip !== 'serbest') R.sprintCopsAt = T.L * (0.25 + Math.random() * 0.2);
    camera.clearViewOffset();
    camera.fov = 56; camera.updateProjectionMatrix();
    snapCam();
    SES().music(copMode && cfg.tip !== 'serbest' ? 'kovala' : 'yaris');
    root.classList.add('racing');
    if (cfg.tip !== 'serbest') countdown();
    else popup('SERBEST SÜRÜŞ', 'Polis devriyelerinin yanından hızlı geçersen peşine düşerler', 2.5);
    R.wake = true;
    if (G.EKSTRA) G.EKSTRA.start(R, exApi());
    if (G.ULTRA) try { G.ULTRA.start(R, Object.assign(exApi(), { Q: () => Q, camera: () => camera, ds, input })); } catch (e) { console.warn('ultra', e); }
    startLoop();
  }
  // v7 ekleri (ekstra.js) için motor yardımcıları
  function exApi() {
    return { THREE, P, A3, SES, popup, vib, smokeFront, setH,
      dsS: t => { // oyuncudan bu nesneye ana yol boyunca mesafe (kestirmedekiler için yaklaşık)
        const pl = R.player, T = R.T;
        let s = t.sc ? t.sc.sA + t.s * (t.sc.sB - t.sc.sA) / t.sc.T.L : t.s;
        let x = s - pl.s; if (T.loop) { if (x > T.L / 2) x -= T.L; else if (x < -T.L / 2) x += T.L; } return x;
      } };
  }
  function smokeFront(c, big) {
    const r = R; const s = r.smoke && r.smoke.find(q => q.life <= 0); if (!s) return;
    P().sample(trk(c), loc(c) + c.L * 0.32, c.d, tmp); if (c.wy != null) tmp.y = c.wy;
    s.s.position.set(tmp.x, tmp.y + 1.0, tmp.z); s.s.visible = true;
    s.life = s.max = big ? 1.6 : 1.1; s.grow = big ? 4 : 2.5;
    s.vx = (Math.random() - 0.5) * 0.8; s.vy = 1.6; s.vz = (Math.random() - 0.5) * 0.8;
    s.s.material.color.setHex(big ? 0x222222 : 0x777777);
  }

  // v7: kestirme yolunun yüksekliği — ana yolun kenar zemini (dunya.js'teki yan şeritler) kestirmenin üstünde kalmasın,
  // yoksa araba yere gömülmüş gibi görünüyordu. Her noktada onu örten en yüksek zeminin biraz üstü alınır.
  function scHeights(T, k, tema) {
    const W = T.W, poly = k.poly, n = poly.length, out = new Float32Array(n), dag = tema === 'dag';
    const prof = (sg, x) => { // yol kenarından x m uzaktaki zeminin yol yüksekliğine göre farkı (dunya.js ile aynı)
      if (dag) { if (sg < 0) { if (x <= 11) return -0.02 + 0.42 * x / 11; return null; } return -0.02 - 11.98 * Math.min(1, x / 87); }
      return -0.02 - 0.58 * Math.min(1, x / 87);
    };
    for (let i = 0; i < n; i++) {
      const lin = k.yA + (k.yB - k.yA) * i / (n - 1);
      let best = -1e9;
      for (let j = 0; j < T.N; j += 2) {
        const dx = poly[i][0] - T.px[j], dz = poly[i][1] - T.pz[j];
        if (dx * dx + dz * dz > 110 * 110) continue;
        const h = T.hd[j], t = dx * Math.sin(h) + dz * Math.cos(h);
        if (Math.abs(t) > T.step * 1.6) continue;
        const d = dx * -Math.cos(h) + dz * Math.sin(h), x = Math.abs(d) - (W / 2 + 3);
        if (x < -3 || x > 87) continue;
        const pf = prof(Math.sign(d), Math.max(0, x));
        if (pf == null) continue;
        best = Math.max(best, T.py[j] + pf);
      }
      out[i] = best > -1e8 ? Math.max(lin - 1.5, best + 0.08) : lin;
    }
    // ağızlarda ana yola tam otursun, arası yumuşak
    out[0] = k.yA; out[n - 1] = k.yB;
    for (let it = 0; it < 3; it++) { const c = out.slice(); for (let i = 1; i < n - 1; i++) out[i] = Math.max(c[i], (c[i - 1] + 2 * c[i] + c[i + 1]) / 4); }
    return out;
  }
  function mkCar(kind, vis, st) {
    const m = A3().make(vis);
    if (Q >= 1) m.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && !o.material.transparent) { o.castShadow = true; o.receiveShadow = !o.material.isMeshBasicMaterial; } else if (o.isMesh && Array.isArray(o.material)) { o.castShadow = true; } });
    scene.add(m);
    const c = { kind, s: 0, d: 0, v: 0, a: 0, lap: 0, model: m, L: m.userData.L, W: m.userData.W, st: st || null, mass: (st && st.kg) || 1400,
      nitro: kind === 'racer' ? 0.6 : 0, nitroOn: false, steer: 0, slip: 0, gear: 1, rpm: 0, done: false, finishT: 0, prog: 0, hp: 100, disabled: false, spin: 0, spike: 0, y: 0, wheelRot: 0, hitT: 0, pass: {} };
    return c;
  }
  function place(c, s, d) { c.dTs = null; c.lv = null; c.lap = R.T.loop && s < 0 ? -1 : 0; c.s = P().wrap(R.T, s); c.d = d; c.prevS = c.s; syncModel(c, 0); }

  // ── statlar: veri → fizik ──
  // st: {vmax (m/s), acc (m/s²), grip (g), nitro, kg}
  function statsOf(car, parts, mul) {
    const p = parts || {}, V0 = V();
    let hiz = car.hiz, ivme = car.ivme, tutus = car.tutus, nit = car.nitro;
    for (const part of V0.PARTS) {
      const lv = p[part.id] || 0;
      if (part.etki.hiz) hiz *= 1 + part.etki.hiz * lv;
      if (part.etki.ivme) ivme /= 1 + part.etki.ivme * lv;
      if (part.etki.tutus) tutus *= 1 + part.etki.tutus * lv;
      if (part.etki.nitro) nit *= 1 + part.etki.nitro * lv;
    }
    mul = mul || 1;
    return { vmax: hiz / KMH * mul, acc: (100 / KMH) / ivme * 1.18 * mul, grip: tutus, nitro: nit, kg: car.kg, hiz, ivme, tutus };
  }

  // ───────── geri sayım ─────────
  function countdown() {
    R.phase = 'geri'; R.count = 3.99;
    const el = $('hud-count'); el.style.display = 'block';
  }

  // ───────── ANA ADIM ─────────
  function stepRace(dtReal) {
    const r = R;
    // odak modu (ağır çekim)
    if (r.slowHit > 0) r.slowHit -= dtReal;
    const slowTarget = r.slowHit > 0 ? 0.3 : r.odakT > 0 ? 0.45 : 1;
    r.slow = lerp(r.slow, slowTarget, Math.min(1, dtReal * 6));
    const dt = dtReal * r.slow;
    r.t += dt;
    if (r.phase === 'geri') {
      const prev = Math.ceil(r.count);
      r.count -= dtReal;
      const now = Math.ceil(r.count);
      const el = $('hud-count');
      if (now !== prev || r.wake) { r.wake = false; el.textContent = now > 0 ? now : 'GAZ!'; el.className = 'cnt pulse'; void el.offsetWidth; el.className = 'cnt'; SES().sfx(now > 0 ? 'count' : 'go'); }
      // geri sayımda gaz: motor bağırsın
      // v11: mükemmel kalkış — geri sayımda gazla devri yeşil bölgede tut
      const pl0 = r.player, lb = $('hud-launch');
      if (!opt.autoGas && r.cfg.tip !== 'serbest') {
        pl0.rpm = clamp(pl0.rpm + (input.gas || input.nitro ? 0.8 : -1.1) * dtReal, 0.15, 1);
        if (lb) { lb.style.display = ''; $('h-lrpm').style.left = (pl0.rpm * 100) + '%'; lb.classList.toggle('ok', pl0.rpm >= 0.6 && pl0.rpm <= 0.82); }
      } else pl0.rpm = lerp(pl0.rpm, input.gas || opt.autoGas ? 0.85 : 0.2, dtReal * 4);
      SES().engine(r.player.rpm, input.gas ? 1 : 0, 0, 1);
      if (r.count <= 0 && !opt.autoGas) {
        const pl0 = r.player, lb = $('hud-launch'); if (lb) lb.style.display = 'none';
        if (pl0.rpm >= 0.6 && pl0.rpm <= 0.82) { pl0.launch = 1.8; popup('MÜKEMMEL KALKIŞ', '+itiş', 1.2, 'iyi'); SES().sfx('odak'); r.stats.kalkis = 1; }
        else if (pl0.rpm > 0.92) { pl0.launchSpin = 0.9; popup('PATİNAJ', 'devir çok yüksekti', 1, 'kotu'); }
      }
      if (r.count <= 0) { r.phase = 'yaris'; r.count = 0; r.goT = r.t; setTimeout(() => { if ($('hud-count')) $('hud-count').style.display = 'none'; }, 700); radio('basla'); }
    }
    const steps = Math.max(1, Math.ceil(dt / 0.017));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) simulate(h);
    updateFx(dtReal);
    for (const c of r.cars()) syncModel(c, dtReal);
    if (G.EKSTRA) G.EKSTRA.frame(dtReal);
    updateCamera(dtReal);
    if (G.ULTRA) G.ULTRA.frame(dtReal);
    r.world.update(dtReal, camera);
    updateHud(dtReal);
    G.__camQ = camera.quaternion;
    if (G.POST) {
      const P2 = G.POST.P, pl = r.player;
      P2.speed = opt.fx === 0 ? 0 : clamp((pl.v - 35) / 55, 0, 1) * 0.8 + (pl.nitroOn ? 0.5 : 0);
      P2.nitro = pl.nitroOn ? 1 : 0; P2.hit = r.shake; P2.odak = r.odakT > 0 ? 1 : 0;
      const sa = r.cfg.saat;
      // sinematik filtre: gündüz sıcak sarı-yeşil, akşam turuncu, gece soğuk mavi
      P2.tint = sa === 'aksam' ? [1.07, 1.0, 0.9] : sa === 'gunduz' ? [1.04, 1.03, 0.93] : [0.94, 1.0, 1.1];
      P2.sat = sa === 'gece' ? 1.05 : 0.92;
      P2.bloom = sa === 'gunduz' ? 0.4 : sa === 'aksam' ? 0.5 : 0.55;
      P2.exposure = sa === 'gece' ? 1.1 : 0.95;
    }
    draw(r.scene);
  }

  function allCars() { return R.racers.concat(R.cops, R.traffic); }
  // araç ana yolda mı kestirmede mi: pist ve yerel konum
  function trk(c) { return c.sc ? c.sc.T : R.T; }
  function loc(c) { return c.sc ? c.ss : c.s; }
  function moveS(c, x) {
    if (c.sc) {
      const k = c.sc;
      c.ss += x;
      c.s = k.sA + clamp(c.ss / k.T.L, 0, 1) * (k.sB - k.sA);
      if (c.ss >= k.T.L - 3) exitShortcut(c);
      else if (c.ss < 0) { c.ss = 0; c.v = Math.max(0, c.v); }
    } else { c.s += x; wrapS(c); }
  }
  function normA(x) { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; }
  // dünya konumunu korurak aracı başka bir yola taşı (yakın örnekte en yakın noktayı ara)
  function rebase(c, T2, sGuess, win) {
    P().sample(trk(c), loc(c), c.d, tmp);
    const wx = tmp.x, wz = tmp.z, H = tmp.h - c.a;
    let best = sGuess, bd = 1e9;
    for (let x = Math.max(0, sGuess - win); x <= Math.min(T2.L - 0.1, sGuess + win); x += 1) {
      P().sample(T2, x, 0, tmp2); const d = (tmp2.x - wx) * (tmp2.x - wx) + (tmp2.z - wz) * (tmp2.z - wz);
      if (d < bd) { bd = d; best = x; }
    }
    P().sample(T2, best, 0, tmp2);
    const nx = -Math.cos(tmp2.h), nz = Math.sin(tmp2.h);
    const d = (wx - tmp2.x) * nx + (wz - tmp2.z) * nz;
    return { s: best, d, a: normA(tmp2.h - H) };
  }
  function enterShortcut(c, k) {
    const p = rebase(c, k.T, 6, 12);
    c.sc = k; c.ss = p.s; c.d = clamp(p.d, -k.T.W / 2 + c.W / 2, k.T.W / 2 - c.W / 2); c.a = clamp(p.a, -0.9, 0.9); c.dTs = null; c.lv = null;
    if (c.isPlayer) { R.stats.kestirme++; popup('KESTİRME!', '+' + k.kaz + ' m', 1, 'orta'); SES().sfx('whoosh'); }
  }
  function exitShortcut(c) {
    const k = c.sc, p = rebase(c, R.T, k.sB, 25);
    c.sc = null; c.s = p.s;
    const lim = R.T.W / 2 + 0.2 - c.W / 2;
    c.d = clamp(p.d, -lim, lim); c.a = clamp(p.a, -0.9, 0.9); c.dTs = null; c.lv = null;
  }
  // rampa yüksekliği (aracın bulunduğu yolda)
  function rampH(c) {
    const rs = R.ramps; if (!rs.length) return 0;
    const sl = loc(c);
    for (const rp of rs) {
      if (rp.sc !== (c.sc || null)) continue;
      const x = sl - rp.s0;
      if (x >= 0 && x <= rp.len && Math.abs(c.d - rp.d0) < rp.w / 2) return rp.h * x / rp.len;
    }
    return 0;
  }
  // dikey fizik: tepeden ya da rampadan hızla geçen araç havalanır
  const GA = 24;
  function vert(c, dt) {
    P().sample(trk(c), loc(c), c.d, tmp2);
    const ys = tmp2.y + rampH(c);
    if (c.wy == null) { c.wy = ys; c.vy = 0; c.air = 0; c.gvy = 0; return; }
    if (c.air > 0) {
      c.air += dt; c.vy -= GA * dt; c.wy += c.vy * dt;
      if (c.wy <= ys) land(c, ys);
    } else {
      const vyr = (ys - c.wy) / dt;
      if (c.gvy - vyr > GA * dt * 1.4 + 0.4 && c.v > 16 && c.gvy > -2) { c.air = dt; c.vy = c.gvy; c.wy += c.vy * dt; c.airS = loc(c); }
      else { c.wy = ys; c.gvy = clamp(vyr, -30, 30); }
    }
  }
  function land(c, ys) {
    const hard = -c.vy;
    const t = c.air;
    c.wy = ys; c.air = 0; c.gvy = 0; c.vy = 0;
    c.bounce = Math.min(0.25, hard * 0.02);
    if (!c.isPlayer) return;
    if (hard > 7) { R.shake = Math.min(1, R.shake + hard / 25); SES().sfx('bump', Math.min(1, hard / 15)); vib(40); c.v *= 0.97; }
    if (t > 0.45) {
      const m = Math.round(Math.abs(loc(c) - (c.airS || loc(c))));
      R.stats.ucus = Math.max(R.stats.ucus, m);
      c.nitro = Math.min(1, c.nitro + t * 0.18);
      popup('UÇUŞ! ' + m + ' m', t.toFixed(1) + ' sn · +NİTRO', 1.2, 'iyi');
      if (G.onStat) G.onStat('ucus', m);
    }
  }

  function simulate(dt) {
    const r = R, pl = r.player, T = r.T;
    if (r.phase === 'yaris' || r.phase === 'bitti') {
      if (!pl.done || r.cfg.tip === 'serbest') playerPhysics(pl, dt);
      else aiRacer(pl, dt, true);
      for (const c of r.racers) if (!c.isPlayer && !c.out) aiRacer(c, dt);
    } else {
      // geri sayımda yerinde dur
      for (const c of r.racers) { c.v = 0; }
    }
    for (const c of r.traffic) trafficAI(c, dt);
    for (const c of r.cops) copAI(c, dt);
    for (const c of r.racers) if (!c.out) vert(c, dt);
    for (const c of r.cops) if (!c.block) vert(c, dt);
    collisions(dt);
    if (G.EKSTRA && r.phase !== 'geri') G.EKSTRA.step(dt);
    for (const c of r.racers) progress(c, dt);
    if (r.phase === 'yaris') {
      modeLogic(dt);
      if (r.purs) pursuitLogic(dt);
      else if (r.cfg.tip === 'serbest') patrolLogic(dt);
      else if (r.sprintCopsAt != null && pl.s > r.sprintCopsAt && !r.purs) { startPursuit(r.cfg.polis, false); r.sprintCopsAt = null; }
      trafficRecycle();
      breakerLogic(dt);
      blockLogic(dt);
      // odak
      if (r.odakT > 0) { r.odakT -= dt / r.slow; r.odak = Math.max(0, r.odak - dt / r.slow / 5); if (r.odak <= 0) r.odakT = 0; }
      else r.odak = Math.min(1, r.odak + dt / 40);
      r.stats.enHiz = Math.max(r.stats.enHiz, pl.v * KMH);
      r.radioT -= dt;
      if (r.radioT < 0 && r.cfg.tip !== 'serbest') { r.radioT = 14 + Math.random() * 10; if (r.racers.length > 1) radio(position(pl) === 1 ? 'onde' : 'geride'); }
    }
  }

  // ───────── OYUNCU FİZİĞİ ─────────
  function playerPhysics(c, dt) {
    const r = R, T = trk(c), st = c.st;
    const isDrag = r.cfg.tip === 'drag';
    // giriş
    // v10: direksiyon — orta bölgede ince, uçta sert; hız arttıkça direksiyon daha yavaş döner, bırakınca hızlı toplanır
    let steerIn = opt.tilt ? input.tilt : input.steer;
    steerIn = Math.sign(steerIn) * Math.pow(Math.abs(steerIn), 1.35);
    const vr0 = clamp(Math.abs(c.v) / st.vmax, 0, 1);
    const back = Math.abs(steerIn) < Math.abs(c.steer) || steerIn * c.steer < 0;
    // v13: tuşa basınca direksiyon anında %40'tan başlar (eskiden sıfırdan yavaşça dönüyordu → geç tepki, sonra fazla dönme)
    if (opt.steerMode === 'tus' && !opt.tilt && steerIn && Math.abs(c.steer) < 0.4 && steerIn * c.steer >= 0) c.steer = Math.sign(steerIn) * 0.4;
    const sRate = opt.tilt ? 12 : (back ? 12 : (opt.steerMode === 'tus' ? 5.5 : 8) - 2.5 * vr0);
    c.steer += clamp(steerIn - c.steer, -sRate * dt, sRate * dt);
    // v7: nitro ve drift tuşu gazı da verir (sağ başparmak tek tuşta kalabilsin)
    const gas = (opt.autoGas && !input.brake) || input.gas || input.nitro || (input.hb && !isDrag) ? 1 : 0;
    const spikeMul = c.spike > 0 ? 0.5 : 1;
    if (c.spike > 0) c.spike -= dt;
    let vmax = st.vmax * spikeMul;
    // nitro
    c.nitroOn = !!input.nitro && c.nitro > 0.01 && r.phase === 'yaris';
    if (c.nitroOn) { c.nitro = Math.max(0, c.nitro - dt / (3.5 + 1.5 * st.nitro)); vmax *= 1.2 + 0.06 * st.nitro; }
    c.nitroK = lerp(c.nitroK || 0, c.nitroOn ? 1 : 0, Math.min(1, dt * (c.nitroOn ? 6 : 2)));
    // v11: süzülme (rüzgâr tüneli) — öndeki aracın hemen arkasında hava direnci azalır, nitro dolar
    let dr = 0;
    if (!isDrag && r.phase === 'yaris' && c.v > 20) for (const o of r.racers.concat(r.traffic)) {
      if (o === c || o.out || o.gone || (o.dir || 1) < 0 || (o.sc || null) !== (c.sc || null) || Math.abs(o.v) < 12) continue;
      const x = ds(c, o);
      if (x > 4 && x < 32 && Math.abs(o.d - c.d) < 1.7) dr = Math.max(dr, 1 - (x - 4) / 28);
    }
    c.draft = lerp(c.draft || 0, dr, Math.min(1, dt * 3));
    if (c.draft > 0.05) { vmax *= 1 + 0.05 * c.draft; c.nitro = Math.min(1, c.nitro + dt * 0.06 * c.draft); }
    if (c.draft > 0.6 && !c.draftMsg) { c.draftMsg = true; popup('SÜZÜLME', 'rüzgâr tünelindesin', 0.9, 'orta'); }
    else if (c.draft < 0.2) c.draftMsg = false;
    // vites ve devir
    let accMul = 1;
    if (isDrag) accMul = dragGear(c, dt, vmax);
    else if (opt.manual) accMul = manualGear(c, dt, vmax);
    else autoGear(c, vmax);
    // ivme
    const vr = Math.max(0, c.v) / vmax;
    let acc = 0;
    if (gas && c.v < vmax) acc = st.acc * (1.15 - Math.pow(vr, 1.7) * 1.15 + 0.05) * accMul * (vr < 0.12 ? 1.25 : 1);
    // nitro: hız ne olursa olsun belirgin itiş (en yüksek hızdayken de)
    if (c.nitroOn) acc = Math.max(acc, 0) + st.acc * (0.95 + 0.3 * st.nitro) * (1.1 - 0.5 * clamp(vr, 0, 1));
    if (c.draft > 0.05 && gas) acc += st.acc * 0.4 * c.draft;
    if (c.launch > 0) { c.launch -= dt; if (gas) acc += st.acc * 0.75; }              // mükemmel kalkış itişi
    if (c.launchSpin > 0) { c.launchSpin -= dt; acc *= 0.45; if (Math.random() < 0.5) smokeAt(c, false, 0); } // patinaj
    if (c.v > vmax) acc = Math.min(acc, -(c.v - vmax) * (c.nitroK > 0.05 ? 0.25 : 0.8)); // nitro bitince hız yavaşça düşsün
    if (input.brake) {
      if (c.v > 0.5) acc = -15 * (r.wet ? 0.8 : 1);
      else acc = -5; // geri vites
    } else if (!gas) acc -= 1.2 + c.v * 0.012;
    c.v += acc * dt;
    if (c.v < -9) c.v = -9;
    if (c.air) c.v -= acc * dt * 0.95; // havadayken gaz/fren etkisiz
    if (!gas && !input.brake && Math.abs(c.v) < 0.3) c.v = 0;
    // direksiyon
    let sdot = 0;
    if (!isDrag && !opt.klasik && !c.spinOut) {
      // v14: gerçek araç dinamiği (ön/arka aks, lastik kayması, ağırlık aktarımı)
      const grip = st.grip * r.gripMul * (c.spike > 0 ? 0.75 : 1);
      sdot = dynStep(c, dt, grip, P().curvAt(T, loc(c)), acc, gas, input.hb && Math.abs(c.v) > 10);
    } else {
    // direksiyon
    const grip = st.grip * r.gripMul * (c.spike > 0 ? 0.75 : 1);
    const spd = Math.max(Math.abs(c.v), 4);
    // v10: dönüş gücü — eskiden orta hızda virajı ancak tam kilitle dönebiliyordu
    let yawMax = clamp(grip * GRAV * 1.55 / spd, 0.42, 1.9);
    const drifting = (input.hb && Math.abs(c.v) > 12 && !isDrag);
    if (drifting) yawMax *= 1.65;
    let yaw = c.steer * yawMax * (c.v < 0 ? -1 : 1);
    if (isDrag) { // şerit değiştirme
      const laneW = T.W / r.nl;
      if (input.laneL) { c.lane = Math.max(0, c.lane - 1); input.laneL = 0; SES().sfx('whoosh'); }
      if (input.laneR) { c.lane = Math.min(r.nl - 1, c.lane + 1); input.laneR = 0; SES().sfx('whoosh'); }
      const tgt = -T.W / 2 + (c.lane + 0.5) * laneW;
      const want = clamp((tgt - c.d) * 0.9, -6, 6);
      c.a = Math.asin(clamp(want / Math.max(c.v, 5), -0.5, 0.5));
      yaw = 0;
    }
    // sürüş yardımı: virajı kısmen kendisi takip etsin, araba yola hizalansın
    const k = P().curvAt(T, loc(c));
    if (c.air) yaw = 0;
    if (!isDrag && !c.air) {
      const asst = opt.assist;
      yaw += -k * c.v * asst * 0.9;
      // bırakınca yola yumuşakça hizalan (eskiden bir anda düzleşiyordu)
      yaw += -c.a * asst * (Math.abs(c.steer) < 0.1 ? 1.3 : 0.12);
    }
    // dönüş ataleti: gerçek dönüş hızı hedefe ~0,1 sn'de ulaşır (ani savrulma yok, ağırlık hissi)
    if (!isDrag) {
      c.w = c.w == null ? yaw : c.w + (yaw - c.w) * Math.min(1, dt / (drifting ? 0.16 : 0.09));
      yaw = c.w;
    }
    // kayma (drift) — görsel gövde açısı ve puan
    const D = r.drift;
    const slipTarget = drifting ? clamp(c.steer * 0.75 + c.a * 0.4, -0.85, 0.85) : 0;
    c.slip = lerp(c.slip, slipTarget, Math.min(1, dt * (drifting ? 3 : 5)));
    if (drifting) {
      c.v *= 1 - dt * (0.22 + 0.12 * Math.abs(c.steer));
      if (Math.abs(c.slip) > 0.12 && c.v > 11) {
        if (!D.on) { D.on = true; D.pts = 0; D.t = 0; }
        D.t += dt;
        D.pts += c.v * Math.abs(c.slip) * dt * 20 * D.mult;
        c.nitro = Math.min(1, c.nitro + dt * 0.11);
        if (D.t > 2.5 * D.mult && D.mult < 5) D.mult++;
      }
    } else if (D.on && Math.abs(c.slip) < 0.1) endDrift(true);
    // yola göre açı
    sdot = c.v * Math.cos(c.a) / Math.max(0.3, 1 + k * c.d);
    c.a += (yaw + k * sdot) * dt;
    c.a = clamp(c.a, -1.1, 1.1);
    c.d += c.v * Math.sin(c.a) * dt;
    moveS(c, sdot * dt);
    c.ba = null;
    }
    if (c.ba != null) c._a = c.a;
    walls(c, dt);
    // nitro dolumu: yüksek hız ve hava akımı
    if (!c.nitroOn && c.v > st.vmax * 0.8) c.nitro = Math.min(1, c.nitro + dt * 0.012);
    r.stats.mesafe += Math.abs(sdot) * dt;
    if (c.v * KMH > 300 && G.onAch) G.onAch('hiz300');
  }

  // ───────── v14 ARAÇ DİNAMİĞİ (Most Wanted tarzı arcade ayarlı bisiklet modeli) ─────────
  // Pist uzayında: c.ba = gövdenin yola göre açısı (sağ +), c.yaw = dönüş hızı (rad/sn, sağ +),
  // c.v = gövde ileri hızı. Hareket yönü c.a = ba + β (β = atan2(vy, v)); c.slip = ba − a (gövde ile gidiş arasındaki açı, görsel ve drift puanı).
  const DYN = { lf: 1.2, lr: 1.4, B: 10, C: 1.45, GX: 1.5 }; // GX: arcade yanal tutuş çarpanı (v15; gerçek araba ~0,9g, oyun ~1,35g)
  const tire = (al, D) => -D * Math.sin(DYN.C * Math.atan(DYN.B * al));
  // ───────── v16 ARCADE SÜRÜŞ ÇEKİRDEĞİ (yarış ve açık şehir ortak) ─────────
  // Lastik fiziği yerine oyuncunun kontrolünde bir model (Most Wanted tarzı):
  //  • Gövdenin dönüş hızı DOĞRUDAN direksiyondan gelir: hedef = direksiyon × en çok dönüş(hız); 0,07 sn'de oturur, aşma/salınım yok.
  //    En çok dönüş = min(hız / 5,8 m (en dar dönüş), yanal tutuş / hız); el freninde ×1,55. Araba asla kendi kendine dönmeye başlamaz.
  //  • Kayma açısı (gövde − gidiş, sağ +): kayma' = dönüş − A·kayma. Normalde A=9 → virajda 2–3°; el freninde A=1,1 → 30–40° drift;
  //    bırakınca A hızla 9'a döner → ~0,3 sn'de toparlanır. Kayma ±0,95 ile sınırlı.
  //  • Çarpışma/duvar gidiş yönünü değiştirirse gövde de onunla döner, kayma yarıya iner (araba kendini hemen toplar).
  function arcadeCore(c, dt, grip, hb, extraR) {
    const sp = Math.abs(c.v), sg = c.v < 0 ? -1 : 1;
    const aLat = grip * GRAV * 1.45;
    let rMax = Math.min(sp / 5.8, aLat / Math.max(sp, 1));
    if (hb && sp > 10) rMax *= 2.3;
    const tgt = c.air ? 0 : (c.steer || 0) * rMax * sg;
    c.yaw = (c.yaw || 0) + (tgt - (c.yaw || 0)) * Math.min(1, dt / 0.07);
    const r = c.air ? 0 : c.yaw + (extraR || 0);
    const aT = hb && sp > 10 ? 1.3 : sp < 3 ? 25 : 9;
    c.alignA = c.alignA == null ? 9 : c.alignA + (aT - c.alignA) * Math.min(1, dt * (aT < c.alignA ? 10 : 4));
    let s = c.slip || 0;
    if (!c.air) s += (r - c.alignA * s) * dt;
    s = clamp(s, -0.95, 0.95);
    if (sp < 1) s *= 1 - Math.min(1, dt * 10);
    c.slip = s;
    // kayarken hafif hız kaybı (el freninde daha çok)
    if (Math.abs(s) > 0.12 && !c.air) c.v -= sg * Math.min(sp, Math.abs(s) * (hb ? 1.6 : 1.4) * dt);
    return r;
  }
  function dynStep(c, dt, grip, k, acc, gas, hb) {
    const asst = opt.assist;
    // dış etkiler (çarpışma, duvar, kestirme girişi) gidiş açısını değiştirdiyse gövde de onunla döner, kayma azalır
    if (c.ba == null || c._a == null) { c.ba = c.a + (c.slip || 0); c.yaw = 0; }
    else if (c.a !== c._a) { c.ba += c.a - c._a; c.slip = (c.slip || 0) * 0.5; c.yaw *= 0.3; c.ba = c.a + c.slip; }
    // NOT: c.vy bu motorda DİKEY hızdır (zıplama/iniş); burada dokunulmaz (v14–v15'te yanlışlıkla yanal hız olarak kullanılıyordu → araba havada kalıyordu)
    // sürüş yardımı: yolun virajını kısmen kendisi döner; direksiyon bırakılınca yola hizalanır
    let ex = 0;
    if (!c.air && asst > 0) { ex += asst * -k * c.v * 0.9; if (Math.abs(c.steer) < 0.1) ex += asst * -c.a * 1.3; }
    const r = arcadeCore(c, dt, grip, hb, ex);
    const sdot = c.v * Math.cos(c.a) / Math.max(0.3, 1 + k * c.d);
    c.ba = clamp(c.ba + (r + k * sdot) * dt, -1.5, 1.5);
    c.a = clamp(c.ba - c.slip, -1.25, 1.25);
    c.slip = c.ba - c.a;
    c.d += c.v * Math.sin(c.a) * dt;
    moveS(c, sdot * dt);
    if (hb) c.v *= 1 - dt * 0.05;
    c.w = c.yaw;
    const D = R.drift;
    if (Math.abs(c.slip) > 0.14 && c.v > 11 && !c.air) {
      if (!D.on) { D.on = true; D.pts = 0; D.t = 0; }
      D.t += dt;
      D.pts += c.v * Math.abs(c.slip) * dt * 20 * D.mult;
      c.nitro = Math.min(1, c.nitro + dt * 0.11);
      if (D.t > 2.5 * D.mult && D.mult < 5) D.mult++;
    } else if (D.on && Math.abs(c.slip) < 0.1) endDrift(true);
    return sdot;
  }
  function endDrift(bank) {
    const D = R.drift;
    if (!D.on) return;
    const pts = Math.round(D.pts);
    if (bank && pts > 50) {
      D.total += pts; R.stats.driftEn = Math.max(R.stats.driftEn, pts);
      popup('+' + pts.toLocaleString('tr-TR'), D.mult > 1 ? 'DRIFT x' + D.mult : 'DRIFT', 1.1, 'drift');
      if (pts >= 5000 && G.onAch) G.onAch('drift');
    } else if (!bank && pts > 50) popup('DRIFT KAYBOLDU', '', 1, 'kotu');
    D.on = false; D.pts = 0; D.mult = 1; D.t = 0;
  }

  function autoGear(c, vmax) {
    const v = Math.max(0, c.v) / vmax;
    const tops = [0, 0.2, 0.36, 0.52, 0.68, 0.84, 1.02];
    let g = 1; while (g < 6 && v > tops[g]) g++;
    if (g !== c.gear) { if (g > c.gear && R.phase === 'yaris') SES().sfx('shift'); c.gear = g; }
    const lo = tops[g - 1], hi = tops[g];
    c.rpm = clamp(0.28 + (v - lo) / (hi - lo) * 0.7, 0.2, 1);
  }
  // v10: yarışlarda elle vites (Ayarlar). Devir sınırında ivme kesilir, yüksek viteste düşük hızda güç azalır
  function manualGear(c, dt, vmax) {
    const tops = [0, 0.2, 0.36, 0.52, 0.68, 0.84, 1.02];
    if (input.gUp) { input.gUp = 0; if (c.gear < 6) { c.gear++; SES().sfx('shift'); } }
    if (input.gDn) { input.gDn = 0; if (c.gear > 1) { c.gear--; SES().sfx('shift'); } }
    const v = Math.max(0, c.v) / vmax, g = c.gear, lo = tops[g - 1], hi = tops[g];
    c.rpm = clamp(0.28 + (v - lo) / (hi - lo) * 0.7, 0.15, 1.05);
    if (v > hi * 1.0 && g < 6) { c.limiter = (c.limiter || 0) + dt; return 0.04; } // kesici
    c.limiter = 0;
    if (v < lo * 0.7) return 0.45 + 0.4 * v / Math.max(0.01, lo * 0.7); // vites fazla yüksek: bayıyor
    return 1.06; // doğru viteste küçük bir avantaj
  }
  // Drag: elle vites. Dönüş: ivme çarpanı
  function dragGear(c, dt, vmax) {
    const tops = [0, 0.22, 0.4, 0.56, 0.71, 0.86, 1.02];
    const v = Math.max(0, c.v) / vmax, g = c.gear;
    const lo = g === 1 ? 0 : tops[g - 1] * 0.75, hi = tops[g];
    c.rpm = clamp(0.2 + (v - lo) / (hi - lo) * 0.8, 0.15, 1.05);
    if (input.shift) {
      input.shift = 0;
      if (g < 6) {
        const rp = c.rpm;
        let msg, cls, boost = 0;
        if (rp >= 0.86 && rp <= 0.97) { msg = 'MÜKEMMEL VİTES'; cls = 'iyi'; boost = 1.2; R.stats.mukemmel++; c.nitro = Math.min(1, c.nitro + 0.15); }
        else if (rp >= 0.74) { msg = 'İYİ VİTES'; cls = 'orta'; boost = 0.4; }
        else { msg = 'ERKEN VİTES'; cls = 'kotu'; boost = -0.6; }
        c.gear++; c.shiftBoost = boost;
        popup(msg, '', 0.8, cls);
        SES().sfx('shift');
      }
    }
    if (c.shiftBoost) { const b = c.shiftBoost; c.shiftBoost = b > 0 ? Math.max(0, b - dt) : Math.min(0, b + dt * 0.8); }
    if (c.rpm >= 1.0) { // devir sınırında
      c.limiter = (c.limiter || 0) + dt;
      return 0.05;
    }
    c.limiter = 0;
    const eff = 0.55 + 0.5 * Math.sin(clamp(c.rpm, 0, 1) * Math.PI * 0.55);
    return eff * (1 + (c.shiftBoost || 0) * 0.5) * (g === 1 ? 1.15 : 1);
  }

  function wrapS(c) {
    const T = R.T;
    if (T.loop) {
      if (c.s >= T.L) { c.s -= T.L; c.lap++; if (c.lap > (c.maxLap == null ? -9 : c.maxLap)) { c.maxLap = c.lap; c.lapEvent = 1; } }
      else if (c.s < 0) { c.s += T.L; c.lap--; }
    } else c.s = clamp(c.s, 0, T.L - 1);
  }

  function scAt(c) { // ana yolda bu noktada bir kestirme girişi var mı
    if (c.sc || !R.shortcuts.length) return null;
    for (const k of R.shortcuts) { const x = c.s - k.sA; if (Math.sign(c.d) === k.side && x > -8 && x < 14) return k; }
    return null;
  }
  function walls(c, dt) {
    const T = trk(c), lim = T.W / 2 + 0.2 - c.W / 2;
    if (Math.abs(c.d) > lim) {
      const k = scAt(c);
      if (k && (c.isPlayer || c.kind === 'racer')) { enterShortcut(c, k); return; }
      const sg = Math.sign(c.d);
      c.d = sg * lim;
      const into = Math.sin(c.a) * sg; // duvara doğru bileşen
      if (into > 0) {
        const imp = Math.abs(c.v) * into;
        if (G.EKSTRA) G.EKSTRA.dmg(c, imp);
        c.a = -c.a * (c.isPlayer ? 0.1 : 0.25);   // v13: oyuncu duvardan sekmez, duvara paralel kayar
        c.v *= 1 - Math.min(c.isPlayer ? 0.3 : 0.45, into * (c.isPlayer ? 0.7 : 0.9)) - 0.01;
        if (c.isPlayer && imp > 3) {
          R.stats.duvar++;
          R.shake = Math.min(1, R.shake + imp / 25);
          sparks(c, sg, imp);
          SES().sfx(imp > 10 ? 'crash' : 'scrape', Math.min(1, imp / 20));
          vib(imp > 10 ? 60 : 25);
          if (R.drift.on) endDrift(false);
        }
      } else c.v *= 1 - dt * (c.isPlayer ? 0.22 : 0.5); // v13: duvar sürtmesi eskiden saniyede hızın yarısını alıyordu
      if (c.isPlayer && Math.abs(c.v) > 8) { c.scrapeT = 0.1; }
    }
  }

  // ───────── YAPAY ZEKÂ ─────────
  function aiRacer(c, dt, autopilot) {
    const r = R, T = r.T, st = c.st;
    const pl = r.player;
    let skill = autopilot ? 0.85 : c.zor;
    // lastik bandı: oyuncudan çok gerideyse hızlan, çok öndeyse hafif yavaşla
    let band = 1;
    if (!autopilot && !c.done) {
      const gap = pl.prog - c.prog;
      const bandK = r.cfg.bant != null ? r.cfg.bant : 1;
      if (gap > 90) band = 1 + Math.min(0.04, (gap - 90) / 2500) * bandK; // v16: geride kalan rakip daha az hızlanır
      else if (gap < -100) band = 1 - Math.min(0.08, (-gap - 100) / 2000) * bandK;
    }
    if (r.cfg.tip === 'drag') return aiDrag(c, dt, skill * band);
    if (c.spinOut > 0) { // savrulmuş: döner, yavaşlar, sonra toparlanır
      c.spinOut -= dt; c.v *= 1 - dt * 1.3; c.spin = (c.spin || 0) + c.spinV * dt; c.spinV *= 1 - dt * 1.2;
      c.a *= 1 - dt * 2; advance(c, dt);
      if (c.spinOut <= 0) { c.spin = 0; c.spinV = 0; c.recT = 3; } // v16: savrulduktan sonra 3 sn toparlanma
      return;
    }
    if (c.recT > 0) c.recT -= dt;
    const vmax = st.vmax * skill * band * (c.spike > 0 ? 0.55 : 1) * (c.recT > 0 ? 0.85 : 1);
    const look = 25 + c.v * 1.6;
    const Tl = trk(c), sl = loc(c);
    const kmax = P().maxCurv(Tl, sl, look);
    const vCorner = Math.sqrt(st.grip * r.gripMul * GRAV * 1.12 / Math.max(0.0008, kmax)) * (0.82 + skill * 0.12);
    let vT = Math.min(vmax, vCorner);
    if (c.done) vT = Math.min(vT, 18);
    // nitro
    c.ai.nitroT -= dt;
    let nitro = false;
    if (c.ai.nitroT < 0 && kmax < 0.006 && c.nitro > 0.2 && !c.done) { nitro = true; c.nitro -= dt * 0.25; if (c.nitro <= 0.2) c.ai.nitroT = 6 + Math.random() * 8; }
    else c.nitro = Math.min(1, c.nitro + dt * 0.03);
    c.nitroOn = nitro;
    if (nitro) vT = Math.min(vT * 1.15, vCorner * 1.05);
    let acc = st.acc * (1.15 - Math.pow(clamp(c.v / vmax, 0, 1), 1.7) * 1.1) * (nitro ? 1.6 : 1);
    // v15: kalkışta rakipler en az oyuncu kadar hızlı çıkar (yavaş rakibin arkasına yığılma olmasın)
    if (r.phase === 'yaris' && r.t - (r.goT || 0) < 4 && !autopilot && !(c.recT > 0)) { acc = Math.max(acc, pl.st.acc * 1.25 * (pl.launch > 0 ? 1.7 : 1)); }
    if (c.recT > 0 || c.wallT > 0) acc *= 0.5; // kazadan sonra tam güçle fırlamasın
    if (c.v < vT) c.v = Math.min(vT, c.v + acc * dt);
    else c.v = Math.max(vT, c.v - 13 * dt);
    // çizgi: virajın içi
    const cs = P().curvSign(Tl, sl, look * 0.8);
    let dT = -Math.sign(cs) * Math.min(1, Math.abs(cs) * 55) * (Tl.W / 2 - 2.2) + (c.sc ? 0 : c.ai.lineBias);
    // kestirmeye girme kararı (her girişte bir kez)
    if (!c.sc && !autopilot) for (const k of R.shortcuts) {
      const x = k.sA - c.s;
      if (x > 0 && x < 70) {
        c.ai.take = c.ai.take || {};
        const key = k.id + ':' + c.lap;
        if (c.ai.take[key] == null) c.ai.take[key] = Math.random() < 0.25 + skill * 0.3;
        if (c.ai.take[key]) dT = k.side * T.W;
      }
    }
    // önündekinden kaç
    const ahead = nearestAhead(c, 28);
    if (ahead) {
      const left = ahead.d - (ahead.W + c.W) / 2 - 0.8, right = ahead.d + (ahead.W + c.W) / 2 + 0.8;
      const lim = Tl.W / 2 - c.W / 2 - 0.3;
      let goL;
      if (c.ai.avoid === ahead && c.ai.goL != null && (c.ai.goL ? left > -lim : right < lim)) goL = c.ai.goL; // karar verdiği yandan geç (titreme olmasın)
      else goL = Math.abs(clamp(left, -lim, lim) - c.d) < Math.abs(clamp(right, -lim, lim) - c.d) ? left > -lim : !(right < lim);
      c.ai.avoid = ahead; c.ai.goL = goL;
      dT = goL ? clamp(left, -lim, lim) : clamp(right, -lim, lim);
      if (Math.abs(ahead.d - c.d) < (ahead.W + c.W) / 2 && ahead.v < c.v) c.v = Math.max(ahead.v * 0.98, c.v - 9 * dt);
    }
    moveLateral(c, dT, dt, 5.5);
    advance(c, dt);
  }
  function aiDrag(c, dt, skill) {
    const T = R.T, st = c.st;
    const vmax = st.vmax * skill;
    const acc = st.acc * (1.15 - Math.pow(clamp(c.v / vmax, 0, 1), 1.7) * 1.1) * (0.92 + skill * 0.1);
    c.v = Math.min(vmax, c.v + acc * dt);
    c.rpm = 0.5 + 0.4 * Math.sin(R.t * 3 + c.s * 0.01);
    const laneW = T.W / R.nl;
    const ahead = nearestAhead(c, 40);
    if (ahead && Math.abs(ahead.d - c.d) < 2) {
      const cand = [c.ai.lane - 1, c.ai.lane + 1].filter(l => l >= 0 && l < R.nl);
      c.ai.lane = cand[Math.floor(Math.random() * cand.length)];
    }
    moveLateral(c, -T.W / 2 + (c.ai.lane + 0.5) * laneW, dt, 6);
    advance(c, dt);
  }
  // v7: hedef çizgi yumuşatılır, yanal hız ivme sınırıyla değişir → rakip/polis bir anda sağa-sola fırlamaz
  function moveLateral(c, dT, dt, maxRate) {
    if (c.dTs == null) c.dTs = c.d;
    c.dTs += (dT - c.dTs) * Math.min(1, dt * 3);
    if (c.lv == null) c.lv = Math.sin(c.a) * Math.max(c.v, 3);
    const want = clamp((c.dTs - c.d) * 1.0, -maxRate, maxRate);
    const latAcc = 6 + Math.min(7, Math.abs(c.v) * 0.12); // m/s² (yaklaşık 0,6–1,3 g)
    c.lv += clamp(want - c.lv, -latAcc * dt, latAcc * dt);
    c.lv = clamp(c.lv, -maxRate, maxRate);
    c.a = Math.asin(clamp(c.lv / Math.max(c.v, 3), -0.6, 0.6));
  }
  function advance(c, dt) {
    const T = trk(c), k = P().curvAt(T, loc(c));
    const sdot = c.v * Math.cos(c.a) / Math.max(0.3, 1 + k * c.d);
    c.d += c.v * Math.sin(c.a) * dt;
    moveS(c, sdot * dt);
    const T2 = trk(c), lim = T2.W / 2 + 0.2 - c.W / 2;
    if (Math.abs(c.d) > lim) {
      const sc = c.kind === 'racer' ? scAt(c) : null;
      if (sc) enterShortcut(c, sc); else c.d = Math.sign(c.d) * lim;
    }
  }
  // pist boyunca öndeki en yakın araç (döngüde sarma hesaba katılır)
  function ds(a, b) { // b, a'nın ne kadar önünde
    let x = b.s - a.s;
    if (R.T.loop) { if (x > R.T.L / 2) x -= R.T.L; else if (x < -R.T.L / 2) x += R.T.L; }
    return x;
  }
  function nearestAhead(c, range) {
    let best = null, bd = range;
    for (const o of allCars()) {
      if (o === c || o.gone || o.sc !== c.sc) continue;
      const x = ds(c, o);
      if (x > 0 && x < bd && Math.abs(o.d - c.d) < (o.W + c.W) / 2 + 1.2) { bd = x; best = o; }
    }
    return best;
  }

  // ───────── TRAFİK ─────────
  // v15: araçlar görüş mesafesinin (sis) arkasında doğar → ekranda birden belirmez
  function visD() { const f = scene && scene.fog ? scene.fog.far : 900; return Math.min(f + 40, 780); }
  function spawnTraffic(initial, idx) {
    const r = R, T = r.T, V0 = V();
    const ty = V0.TRAFFIC[Math.floor(Math.random() * (Math.random() < 0.85 ? 4 : V0.TRAFFIC.length))];
    const c = mkCar('traffic', { govde: ty.govde, model: ty.modeller ? ty.modeller[Math.floor(Math.random() * ty.modeller.length)] : null, renk: ty.renkler[Math.floor(Math.random() * ty.renkler.length)], basit: true }, null);
    c.mass = ty.govde === 'kamyon' || ty.govde === 'otobus' ? 6000 : ty.govde === 'van' ? 2200 : 1300;
    trafficReset(c, initial, idx);
    r.traffic.push(c);
    return c;
  }
  function trafficReset(c, initial, idx) {
    const r = R, T = r.T, pl = r.player, nl = r.nl;
    const lane = Math.floor(Math.random() * nl);
    const onc = r.cfg.tip !== 'drag' && lane < nl / 2 && T.W < 18; // sol şeritler karşıdan gelir
    c.dir = onc ? -1 : 1;
    c.lane = lane;
    c.d = -T.W / 2 + (lane + 0.5) * T.W / nl;
    c.vT = (r.cfg.tip === 'drag' ? 14 : 11) + Math.random() * 8;
    c.v = c.vT * c.dir;
    let base = initial ? (r.cfg.tip === 'drag' ? 150 + idx * 70 : 120 + idx * (900 / Math.max(1, r.trafficN))) : visD() + Math.random() * 250;
    if (initial && onc) base += 350; // karşıdan gelenler başlangıç çizgisine çarpmasın
    c.s = P().wrap(T, pl.s + base + Math.random() * 40);
    // sprint sonunda yer yoksa: oyuncunun arkasına (kamera görmez); önüne koyup göz önünde belirtme
    if (!T.loop && c.s > T.L - 80) c.s = Math.max(2, pl.s - 300 - Math.random() * 200);
    c.a = 0; c.knock = 0; c.spin = 0; c.gone = false; c.passed = false; c.y = 0;
    c.model.visible = true;
  }
  function trafficAI(c, dt) {
    if (c.knock > 0) { // çarpılmış: savrulup durur
      c.knock -= dt; c.v *= 1 - dt * 1.5; c.spin += c.spinV * dt; c.spinV *= 1 - dt;
      c.d += c.dv * dt; c.dv *= 1 - dt * 2;
      advanceRaw(c, dt);
      return;
    }
    if (c.spin) { c.spin *= 1 - dt * 1.5; if (Math.abs(c.spin) < 0.01) c.spin = 0; }
    // öndekine yaklaşınca yavaşla
    let vT = c.vT;
    const pl = R.player;
    const x = ds(c, pl) * c.dir;
    if (x > 0 && x < 18 && Math.abs(pl.d - c.d) < 2.2 && Math.abs(pl.v) < c.vT) vT = Math.max(0, Math.abs(pl.v) - 2);
    const sp = Math.abs(c.v);
    c.v = c.dir * (sp + clamp(vT - sp, -8 * dt, 3 * dt));
    advanceRaw(c, dt);
  }
  function advanceRaw(c, dt) {
    const T = R.T;
    c.s += c.v * dt;
    if (T.loop) c.s = ((c.s % T.L) + T.L) % T.L;
    const lim = T.W / 2 + 0.2 - c.W / 2;
    if (Math.abs(c.d) > lim) c.d = Math.sign(c.d) * lim;
  }
  // v10: trafik yoğunluğu yarış içinde değişebilir (Ayarlar)
  function trafficBase() { const cfg = R.cfg, isDrag = cfg.tip === 'drag'; if (cfg.tip === 'drift') return 0; // v15: drift görevlerinde trafik yok
    const dens = cfg.trafik != null ? cfg.trafik : (isDrag ? 0.5 : cfg.tip === 'drift' || cfg.tip === 'eleme' || cfg.tip === 'devre' || cfg.tip === 'gise' ? 0.35 : 0.7); return (Q === 0 ? 8 : 14) * dens * (R.T.W / 14); }
  function setTraffic() {
    if (!R) return;
    const want = R.cfg.trafik === 0 ? 0 : Math.round(trafficBase() * opt.traffic);
    while (R.traffic.length > want) { const c = R.traffic.pop(); scene.remove(c.model); A3().dispose(c.model); }
    for (let i = R.traffic.length; i < want; i++) spawnTraffic(false, i);
    R.trafficN = want;
  }
  function trafficRecycle() {
    const pl = R.player, T = R.T;
    for (const c of R.traffic) {
      const x = ds(pl, c);
      if (x < -140 || x > visD() + 400 || (!T.loop && (c.s >= T.L - 30 || c.s <= 2))) trafficReset(c, false);
      // kıl payı
      if (!c.passed && x < 0 && x > -10) {
        c.passed = true;
        const gap = Math.abs(c.d - pl.d) - (c.W + pl.W) / 2;
        if (gap < 1.3 && gap > -0.2 && pl.v > 22 && c.knock <= 0) {
          R.stats.kilpayi++;
          pl.nitro = Math.min(1, pl.nitro + 0.12);
          popup('KIL PAYI!', '+NİTRO', 0.9, 'iyi');
          SES().sfx('whoosh');
          if (G.onStat) G.onStat('kilpayi', 1);
        }
      }
      if (x > 0) c.passed = false;
    }
  }

  // ───────── ÇARPIŞMALAR ─────────
  function collisions(dt) {
    const cs = allCars().filter(c => !c.gone);
    const n = cs.length;
    for (let i = 0; i < n; i++) {
      const a = cs[i];
      for (let j = i + 1; j < n; j++) {
        const b = cs[j];
        if (a.kind === 'traffic' && b.kind === 'traffic') continue;
        if ((a.out || b.out) || a.sc !== b.sc) continue;
        if (Math.abs((a.wy || 0) - (b.wy || 0)) > 1.6 && (a.air || b.air)) continue;
        const x = ds(a, b);
        const ox = (a.L + b.L) / 2 - Math.abs(x);
        if (ox <= 0) continue;
        const y = b.d - a.d;
        const oy = (a.W + b.W) / 2 - Math.abs(y);
        if (oy <= 0) continue;
        hit(a, b, x, y, ox, oy);
      }
    }
  }
  function hit(a, b, x, y, ox, oy) {
    const ma = a.mass, mb = b.mass, ta = mb / (ma + mb), tb = ma / (ma + mb);
    let imp;
    const fixedB = b.block, fixedA = a.block;
    // v15: kalkışın ilk 3 saniyesinde oyuncu-rakip teması yumuşak: sekme/hasar yok, arkadaki öndekinin hızına iner
    const pl0 = R.player;
    if (R.phase === 'yaris' && R.t - (R.goT || 0) < 3 && ((a === pl0 && b.kind === 'racer') || (b === pl0 && a.kind === 'racer')) && ox < oy * 1.4) {
      const sg = Math.sign(x) || 1;
      a.s -= sg * ox * ta; b.s += sg * ox * tb;
      if (sg > 0 && a.v > b.v) a.v = b.v; else if (sg < 0 && b.v > a.v) b.v = a.v;
      return;
    }
    if (ox < oy * 1.4) { // önden/arkadan
      const sg = Math.sign(x) || 1; // b önde ise +
      const va = a.v, vb = b.v;
      if (!fixedA) a.s -= sg * ox * (fixedB ? 1 : ta);
      if (!fixedB) b.s += sg * ox * (fixedA ? 0 : tb);
      imp = Math.abs(va - vb);
      // hız aktarımı (arkadaki yavaşlar, öndeki itilir)
      const rel = (sg > 0 ? va - vb : vb - va);
      if (rel > 0) {
        const e = 0.35;
        const tot = (ma * va + mb * vb) / (ma + mb);
        if (!fixedA) a.v = tot + (va - tot) * -e * 0.5 + (fixedB ? -va * 0.6 : 0);
        if (!fixedB) b.v = tot + (vb - tot) * -e * 0.5;
        if (fixedB) a.v = va * 0.25;
        if (fixedA) b.v = vb * 0.25;
        // v16: arkadan çarpılan araç (oyuncu değilse) çarpmadan hız kazanmaz — eskiden rakip itilip daha da hızlanıyordu
        const front = sg > 0 ? b : a, fv = sg > 0 ? vb : va;
        if (!front.isPlayer && !front.block && front.v > fv) front.v = fv * 0.97;
      }
    } else { // yandan
      const sg = Math.sign(y) || 1;
      if (!fixedA) a.d -= sg * oy * (fixedB ? 1 : ta);
      if (!fixedB) b.d += sg * oy * (fixedA ? 0 : tb);
      imp = Math.abs(a.v * Math.sin(a.a) - b.v * Math.sin(b.a)) + 2;
      a.a -= sg * 0.08 * ta; b.a += sg * 0.08 * tb;
      a.v *= 0.995; b.v *= 0.995;
    }
    if (G.EKSTRA && imp > 3) { G.EKSTRA.dmg(a, imp * (b.mass / a.mass)); G.EKSTRA.dmg(b, imp * (a.mass / b.mass)); }
    // v11: rakibi savurma — oyuncu sert vurursa rakip döner, yavaşlar; oyuncu nitro kazanır, kısa ağır çekim
    {
      const pl0 = R.player, ot = a === pl0 ? b : b === pl0 ? a : null;
      if (ot && ot.kind === 'racer' && !ot.out && !(ot.spinOut > 0) && imp > 8 && pl0.v >= ot.v - 2 && R.phase === 'yaris') {
        ot.spinOut = 2.4; ot.spinV = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 2.5);
        R.stats.savurma = (R.stats.savurma || 0) + 1;
        pl0.nitro = Math.min(1, pl0.nitro + 0.25);
        popup('SAVURDUN!', (ot.ad || 'Rakip') + ' döndü · +NİTRO', 1.3, 'iyi');
        R.slowHit = 0.55; R.shake = Math.min(1, R.shake + 0.5); SES().sfx('crash', 1); vib(90);
      }
    }
    const pl = R.player;
    const involvesPl = a === pl || b === pl;
    const other = a === pl ? b : a;
    if (imp > 2) {
      if (other.kind === 'traffic' && involvesPl && other.knock <= 0) {
        other.knock = 3; other.spinV = (Math.random() - 0.5) * 6; other.dv = (other.d - pl.d > 0 ? 1 : -1) * imp * 0.25;
        R.stats.carpma++;
        if (R.cfg.tip === 'drag' && imp > 24) { wreck(); }
      }
      // polis hasarı
      for (const [c, o] of [[a, b], [b, a]]) {
        if (c.kind === 'cop' && !c.disabled && (o === pl || o.kind === 'traffic' || o.kind === 'cop')) {
          const dmg = imp * (o.mass / c.mass) * (o === pl ? 2.6 : 1.2);
          c.hp -= dmg;
          if (c.hp <= 0) disableCop(c, o === pl ? 'carp' : 'kaza');
        }
      }
      if (involvesPl) {
        R.shake = Math.min(1, R.shake + imp / 22);
        if (imp > 4) { sparks(pl, Math.sign(other.d - pl.d), imp); SES().sfx(imp > 12 ? 'crash' : 'bump', Math.min(1, imp / 25)); vib(imp > 12 ? 80 : 30); }
        if (R.drift.on && imp > 5) endDrift(false);
      }
    }
  }

  // drag yarışında kafa kafaya kaza = yarış biter
  function wreck() {
    if (R.finished) return;
    popup('KAZA!', 'Araban hasar gördü', 2, 'kotu');
    SES().sfx('crash', 1);
    finish(false, { kaza: true });
  }

  // ───────── İLERLEME, SIRALAMA ─────────
  function progress(c) {
    const T = R.T;
    c.prog = T.loop ? c.lap * T.L + c.s : c.s;
    if (c.lapEvent) { c.lapEvent = 0; onLap(c); }
    if (!c.done && !c.out) {
      const totalNeed = T.loop ? R.laps * T.L : R.finishS;
      if (R.cfg.tip !== 'serbest' && R.cfg.tip !== 'kovala' && R.cfg.tip !== 'kacis' && R.cfg.tip !== 'eleme' && c.prog >= totalNeed) {
        c.done = true; c.finishT = R.t;
        R.order = R.order || []; R.order.push(c);
        if (c.isPlayer) onPlayerFinish();
      }
    }
  }
  function position(c) {
    let p = 1;
    for (const o of R.racers) if (o !== c && !o.out && (o.done && !c.done ? true : (!o.done && c.done ? false : (o.done && c.done ? o.finishT < c.finishT : o.prog > c.prog)))) p++;
    return p;
  }
  function onLap(c) {
    const r = R;
    if (c.isPlayer && G.EKSTRA) G.EKSTRA.lap(c);
    if (c.lap < 1) return; // başlangıç çizgisini ilk geçiş tur sayılmaz
    if (c.isPlayer && r.T.loop && r.cfg.tip !== 'serbest' && r.cfg.tip !== 'kovala' && r.cfg.tip !== 'kacis') {
      if (c.lap < r.laps) { popup(c.lap === r.laps - 1 ? 'SON TUR' : 'TUR ' + (c.lap + 1) + '/' + r.laps, '', 1.3); if (c.lap === r.laps - 1) radio('son'); SES().sfx('cp'); }
    }
    if (r.cfg.tip === 'eleme' && !c.out) {
      const lapN = c.lap;
      const list = r.eleme.cross[lapN] || (r.eleme.cross[lapN] = []);
      if (list.indexOf(c) >= 0) return;
      list.push(c);
      const alive = r.racers.filter(o => !o.out);
      if (list.length === alive.length - 1) {
        const last = alive.find(o => list.indexOf(o) < 0);
        eliminate(last);
      }
    }
  }
  function eliminate(c) {
    const r = R;
    c.out = true; r.eleme.out.push(c);
    if (c.isPlayer) { popup('ELENDİN', '', 2, 'kotu'); finish(false); return; }
    popup(c.ad + ' ELENDİ', '', 1.6, 'iyi');
    SES().sfx('cp');
    c.v *= 0.5; c.model.visible = false; c.gone = true;
    const alive = r.racers.filter(o => !o.out);
    if (alive.length === 1 && alive[0].isPlayer) finish(true, { pos: 1 });
  }
  function onPlayerFinish() {
    const r = R, tip = r.cfg.tip, pos = position(r.player);
    if (tip === 'hiz') {
      const totals = r.racers.map(c => ({ c, t: r.cams.reduce((a, cam) => a + (cam.hits[c.id || c.ad] || estimateCam(c)), 0) }));
      totals.sort((a, b) => b.t - a.t);
      const pp = totals.findIndex(x => x.c === r.player) + 1;
      const tot = Math.round(totals.find(x => x.c === r.player).t);
      finish(pp === 1, { pos: pp, toplam: tot });
    } else if (tip === 'gise') finish(true, { pos: 1, kalan: r.timeLeft });
    else if (tip === 'drift') { endDrift(true); finish(r.drift.total >= r.driftTarget, { pos: r.drift.total >= r.driftTarget ? 1 : 2, puan: Math.round(r.drift.total) }); }
    else finish(pos === 1, { pos });
  }
  function estimateCam(c) { return c.st.vmax * KMH * 0.8; }

  // ───────── YARIŞ TÜRÜ KURALLARI ─────────
  function modeLogic(dt) {
    const r = R, pl = r.player, tip = r.cfg.tip;
    if (tip === 'hiz') {
      for (const cam of r.cams) for (const c of r.racers) {
        const key = c.isPlayer ? 'sen' : c.ad;
        if (cam.hits[key] == null && c.prog >= cam.s) {
          cam.hits[key] = c.v * KMH * (c.isPlayer ? 1 : 0.88);
          if (c.isPlayer) {
            r.stats.hizToplam += c.v * KMH;
            popup(Math.round(c.v * KMH) + ' km/s', 'RADAR', 1.2, 'iyi');
            SES().sfx('cam');
            const f = cam.obj.userData.flash; f.material.opacity = 1;
          }
        }
      }
      for (const cam of r.cams) { const f = cam.obj.userData.flash; if (f.material.opacity > 0) f.material.opacity = Math.max(0, f.material.opacity - dt * 3); }
      // anahtarları düzelt (onPlayerFinish 'sen' anahtarını okur)
      for (const cam of r.cams) if (cam.hits.sen != null) cam.hits[pl.ad] = cam.hits.sen;
    }
    if (tip === 'gise' && !r.finished) {
      r.timeLeft -= dt;
      const cp = r.cps.find(c => !c.done);
      if (cp && pl.prog >= cp.s) {
        cp.done = true;
        const i = r.cps.indexOf(cp);
        if (i < r.cps.length - 1) { const add = r.cpBudget[i + 1]; r.timeLeft += add; popup('+' + add.toFixed(1) + ' sn', 'KONTROL NOKTASI', 1.2, 'iyi'); SES().sfx('cp'); if (cp.obj) cp.obj.visible = false; }
      }
      if (r.timeLeft <= 0) { r.timeLeft = 0; popup('SÜRE BİTTİ', '', 2, 'kotu'); finish(false); }
    }
    if (tip === 'drift' && r.drift.on && !input.hb && Math.abs(pl.slip) < 0.08) endDrift(true);
    if (tip === 'kovala' && r.purs) {
      const h = r.cfg.hedef || { t: 'sure', n: 60 };
      const val = goalVal(h);
      if (val >= (h.n || 1)) { popup('HEDEF TAMAM!', '', 2, 'iyi'); finish(true, { pos: 1, kovala: true }); }
    }
    if (tip === 'serbest') r.stats.km = r.stats.mesafe / 1000;
  }
  function goalVal(h) {
    const s = R.stats;
    switch (h.t) {
      case 'sure': return R.purs ? R.purs.time : 0;
      case 'etkisiz': return s.etkisiz;
      case 'engel': return s.engel;
      case 'barikat': return s.barikat;
      case 'kac': return s.kacis;
      default: return 0;
    }
  }
  function goalText(h) {
    const n = h.n || 1;
    return { sure: `Kovalamacada ${n} sn dayan`, etkisiz: `${n} polis aracını devre dışı bırak`, engel: `${n} takip engeli yık`, barikat: `${n} barikattan geç`, kac: `${n} yıldız aranırken kaç` }[h.t] || '';
  }

  // ───────── POLİS ─────────
  function startPursuit(heat, fromStart) {
    const r = R;
    heat = clamp(heat || 1, 1, 5);
    r.purs = { heat, heatT: 0, time: 0, bust: 0, evade: 0, cool: 0, mode: 'takip', bounty: 0, spawnT: fromStart ? 0 : 1.5, blockT: 12, heli: null, scanT: 2, lost: false };
    r.stats.maxIsi = Math.max(r.stats.maxIsi, heat);
    if (!fromStart) { popup('POLİS!', 'Takip başladı', 1.6, 'kotu'); SES().music('kovala'); }
    r.purs.race = !['kovala', 'kacis', 'serbest'].includes(r.cfg.tip);
    for (let i = 0; i < Math.min(2, V().HEAT[heat].max); i++) spawnCop(fromStart ? (i === 0 ? -150 : -210) : (i === 0 ? -90 : -140));
    if (fromStart) spawnCop(visD());
    r.purs.grace = fromStart ? 4 : 1;
    scanner(heat);
    $('hud-purs').style.display = 'block';
  }
  function spawnCop(offs, opts) {
    const r = R, pl = r.player, H = V().HEAT[r.purs ? r.purs.heat : 1];
    const tn = (opts && opts.type) || H.birim[Math.floor(Math.random() * H.birim.length)];
    const ct = V().COPS[tn];
    // polis, oyuncunun arabasından (önleyici hariç) biraz yavaş: düzlükte kaçmak mümkün olsun
    const cap = pl.st.vmax * (tn === 'onleyici' ? 1.03 : r.cfg.tip === 'kovala' ? 1.0 : 0.95);
    const c = mkCar('cop', { govde: ct.govde, model: ct.model, renk: tn === 'onleyici' ? '#14141c' : tn === 'ozel' ? '#1c2230' : '#f5f6fa', basit: Q === 0, desen: false, kaplama: { r: 0.3, m: 0.5 } }, { vmax: Math.min(ct.hiz / KMH, cap), acc: 9, grip: 1.1, nitro: 1, kg: ct.kg });
    c.copType = tn; c.hp = ct.can; c.maxHp = ct.can; c.mass = ct.kg;
    c.s = P().wrap(r.T, pl.s + offs); c.d = (Math.random() - 0.5) * r.T.W * 0.6;
    c.v = offs < 0 ? pl.v * 0.9 : 0;
    c.state = offs < 0 ? 'takip' : 'bekle';
    if (opts && opts.block) { c.block = true; c.v = 0; c.state = 'barikat'; c.mass = 9000; c.d = opts.d; }
    if (opts && opts.patrol) { c.state = 'devriye'; c.v = 0; c.d = opts.d; }
    c.a = 0; c.id = Math.random(); c.dTs = null; c.lv = null;
    if (r.purs && r.purs.race && !c.block) {
      // yarıştaki polis bazen rakip yarışçıların peşine düşer
      const others = r.racers.filter(x => !x.isPlayer && !x.out);
      if (others.length && Math.random() < 0.5) c.target = others[Math.floor(Math.random() * others.length)];
    }
    r.cops.push(c);
    return c;
  }
  function copAI(c, dt) {
    const r = R, pl = r.player, T = r.T;
    if (c.disabled) {
      c.v *= 1 - dt * 1.2; c.spin += c.spinV * dt; c.spinV *= 1 - dt * 0.8;
      advanceRaw(c, dt);
      c.deadT += dt;
      if (c.deadT > 8 || Math.abs(ds(pl, c)) > 400) removeCop(c);
      return;
    }
    if (c.state === 'barikat') { c.v = 0; return; }
    const tg = c.target && !c.target.out && !c.target.done ? c.target : pl;
    const x = ds(c, tg); // hedef ne kadar önde
    if (c.state === 'devriye' || c.state === 'bekle') {
      c.v = 0;
      if (c.state === 'bekle' && r.purs && r.purs.mode === 'takip' && x < 30) c.state = 'takip';
      return;
    }
    if (c.state === 'ara') { // arama modu: yavaşça dolaş, oyuncuyu görürse tekrar takip
      c.v = lerp(c.v, 18, dt);
      advance(c, dt);
      return;
    }
    // takip
    const vmax = c.st.vmax * (tg.v > c.st.vmax * 0.9 ? 1.02 : 1);
    let vT, dT = tg.d;
    if (x > 8) vT = Math.min(vmax, tg.v + clamp(x * 0.25, 6, 30));
    else if (x > -6) { vT = tg.v + (x > 0 ? 3 : -2); dT = tg.d + (c.d > tg.d ? 1.2 : -1.2) * (x < 4 ? 0.4 : 1); }
    else { vT = Math.max(8, tg.v * 0.8); dT = tg.d; } // önünde: fren yaparak kapat
    // virajda da yavaşlamalı
    const kmax = P().maxCurv(T, c.s, 20 + c.v);
    vT = Math.min(vT, Math.sqrt(1.15 * GRAV * 1.12 / Math.max(0.0008, kmax)) * 1.05);
    const acc = c.st.acc * (1.1 - Math.pow(clamp(c.v / vmax, 0, 1), 1.6));
    if (c.v < vT) c.v = Math.min(vT, c.v + acc * dt * 1.2); else c.v = Math.max(vT, c.v - 12 * dt);
    const ahead = nearestAhead(c, 22);
    if (ahead && ahead !== pl && ahead.kind !== 'cop') dT = ahead.d > 0 ? ahead.d - 3 : ahead.d + 3;
    moveLateral(c, dT, dt, 7);
    advance(c, dt);
    if (c.spike > 0) { c.spike -= dt; c.v *= 1 - dt * 0.8; }
  }
  function disableCop(c, why) {
    if (c.disabled) return;
    c.disabled = true; c.deadT = 0; c.spinV = (Math.random() - 0.5) * 8;
    const r = R;
    r.stats.etkisiz++;
    if (G.onStat) G.onStat('polis', 1);
    if (r.purs) { r.purs.bounty += 100 * r.purs.heat; r.purs.heatT += 6; }
    popup('POLİS DEVRE DIŞI', '+' + (100 * (r.purs ? r.purs.heat : 1)) + ' ÜN', 1.2, 'iyi');
    SES().sfx('boom'); vib(40);
    smokeAt(c, 1);
    scanner('etkisiz');
  }
  function removeCop(c) {
    const r = R; c.gone = true;
    r.scene.remove(c.model); A3().dispose(c.model);
    const i = r.cops.indexOf(c); if (i >= 0) r.cops.splice(i, 1);
  }

  function pursuitLogic(dt) {
    const r = R, p = r.purs, pl = r.player, H = V().HEAT[p.heat];
    // v15: en uzun kovalamaca süresi canlı kaydedilir (yarış/sürüş yarıda bırakılsa da sayılır)
    if (G.onPursTime && Math.floor(p.time) !== Math.floor(p.time + dt)) G.onPursTime(p.time + dt);
    if (p.mode === 'takip') {
      p.time += dt;
      p.bounty += dt * H.un;
      p.heatT += dt;
      // aranma artışı
      const need = 40 + p.heat * 15;
      if (p.heatT > need && p.heat < 5 && r.cfg.tip !== 'kacis' && !p.race) { p.heat++; p.heatT = 0; r.stats.maxIsi = Math.max(r.stats.maxIsi, p.heat); popup('ARANMA ' + '★'.repeat(p.heat), '', 1.5, 'kotu'); scanner(p.heat); SES().sfx('heat'); }
      // takviye birimler
      p.spawnT -= dt;
      const active = r.cops.filter(c => !c.disabled && !c.block && c.state === 'takip');
      if (p.spawnT < 0 && p.evade < 0.25 && active.length < (p.race ? Math.min(2, H.max) : H.max)) { p.spawnT = 6 + Math.random() * 5; spawnCop(Math.random() < 0.65 ? -180 - Math.random() * 80 : visD() + Math.random() * 150); }
      // barikat
      p.blockT -= dt;
      if (H.barikat && p.blockT < 0) { p.blockT = 26 + Math.random() * 16; if (Math.random() < H.barikat * (p.race ? 0.4 : 1)) makeRoadblock(Math.random() < H.civi); }
      // helikopter
      if (H.heli && !p.heli) makeHeli();
      // yakalanma
      let near = false;
      for (const c of r.cops) if (!c.disabled && !pl.sc && Math.abs(ds(pl, c)) < 9 && Math.abs(c.d - pl.d) < 4) near = true;
      if (p.grace > 0) p.grace -= dt;
      if (near && Math.abs(pl.v) < 5.5 && p.grace <= 0) p.bust = Math.min(1, p.bust + dt / 2.8);
      else p.bust = Math.max(0, p.bust - dt / 1.2);
      if (p.bust >= 1) { busted(); return; }
      // kaçış
      let seen = false;
      for (const c of r.cops) if (!c.disabled && c.state !== 'bekle' && !pl.sc && Math.abs(ds(pl, c)) < 170) seen = true;
      if (!seen) p.evade = Math.min(1, p.evade + dt / (5 + p.heat * 1.3) * (p.heli ? 0.55 : 1));
      else p.evade = Math.max(0, p.evade - dt * 0.4);
      if (p.evade >= 1) {
        p.mode = 'sogu'; p.cool = 0; p.evade = 0;
        popup('İZİNİ KAYBETTİRDİN', 'Gizlen... arama sürüyor', 1.8, 'iyi');
        scanner('kayip');
        for (const c of r.cops) if (!c.disabled && !c.block) c.state = 'ara';
        if (p.heli) { p.heli.leave = true; }
      }
    } else if (p.mode === 'sogu') {
      const coolNeed = 8 + p.heat * 3;
      p.cool += dt; p.time += dt; // v15: gizlenirken de kovalamaca sürüyor sayılır
      // aramadaki birim yakınsa tekrar yakalar
      for (const c of r.cops) if (!c.disabled && (c.state === 'ara' || c.state === 'devriye') && Math.abs(ds(pl, c)) < 55) {
        p.mode = 'takip'; p.cool = 0; popup('SENİ GÖRDÜLER!', '', 1.4, 'kotu');
        for (const k of r.cops) if (!k.disabled && !k.block) k.state = 'takip';
        SES().sfx('heat');
        break;
      }
      if (p.mode === 'sogu' && p.cool >= coolNeed) escaped();
    }
    // telsiz
    p.scanT -= dt;
    if (p.scanT < 0) { p.scanT = 9 + Math.random() * 8; if (p.mode === 'takip') scanner(p.heat); }
  }
  function busted() {
    const r = R;
    SES().sfx('busted');
    popup('YAKALANDIN!', '', 2.2, 'kotu');
    r.purs.mode = 'bitti';
    if (r.cfg.tip === 'serbest') { endPursuitFree(false); return; }
    finish(false, { yakalandi: true });
  }
  function escaped() {
    const r = R, p = r.purs;
    r.stats.kacis = Math.max(r.stats.kacis, p.heat);
    popup('KAÇTIN!', '+' + Math.round(p.bounty) + ' ÜN', 2, 'iyi');
    SES().sfx('escape');
    if (G.onStat) G.onStat('kacis', p.heat);
    if (r.cfg.tip === 'kacis') { finish(true, { pos: 1, kacti: true }); return; }
    if (r.cfg.tip === 'kovala') {
      const h = r.cfg.hedef || {};
      if (h.t === 'kac') { finish(true, { pos: 1 }); return; }
      // hedef tamamlanmadan kaçtı: yeni takip başlat (hedef sürsün)
      r.purs.mode = 'takip'; r.purs.evade = 0; spawnCop(-160); spawnCop(visD());
      popup('YENİ BİRİMLER!', goalText(h), 2, 'kotu');
      return;
    }
    if (r.cfg.tip === 'serbest') { endPursuitFree(true); return; }
    // yarış sırasındaki takip bitti
    endPursuitQuiet();
  }
  function endPursuitQuiet() {
    const r = R;
    r.freeBounty = (r.freeBounty || 0) + (r.purs ? r.purs.bounty : 0);
    for (const c of r.cops.slice()) if (!c.block) removeCop(c);
    if (r.purs && r.purs.heli) { r.scene.remove(r.purs.heli.obj); }
    r.purs = null;
    $('hud-purs').style.display = 'none';
    SES().siren(0);
    SES().music('yaris');
  }
  function endPursuitFree(ok) {
    const r = R, p = r.purs;
    const res = { ok, bounty: Math.round(p.bounty), heat: p.heat, time: p.time, etkisiz: r.stats.etkisiz };
    if (G.onFreePursuit) G.onFreePursuit(res);
    endPursuitQuiet();
    r.stats.etkisiz = 0;
    if (!ok) { r.player.v = 0; }
  }
  function spawnPatrols() {
    const r = R;
    r.patrolT = 0;
    for (let i = 0; i < 4; i++) spawnPatrolAhead(i === 0 ? 250 : visD() * 0.6 + i * 600); // ilki yarış başlamadan görünür
  }
  function spawnPatrolAhead(off) {
    const r = R, T = r.T;
    const d = (Math.random() < 0.5 ? -1 : 1) * (T.W / 2 - 1.3);
    const c = spawnCop(off, { patrol: true, d, type: 'devriye' });
    return c;
  }
  function patrolLogic(dt) {
    const r = R, pl = r.player;
    r.patrolT = (r.patrolT || 0) + dt;
    let n = 0;
    for (const c of r.cops) {
      if (c.state !== 'devriye') continue;
      n++;
      const x = ds(pl, c);
      if (x < -200) { removeCop(c); continue; }
      if (Math.abs(x) < 45 && pl.v * KMH > 125) {
        // yakalandın: takip başlasın
        startPursuit(1, false);
        c.state = 'takip';
        return;
      }
    }
    if (n < 3 && r.patrolT > 4) { r.patrolT = 0; spawnPatrolAhead(visD() + Math.random() * 300); }
  }
  function makeRoadblock(spikes) {
    const r = R, T = r.T, pl = r.player;
    const s = P().wrap(T, pl.s + Math.max(420, visD()));
    if (!T.loop && s > R.finishS - 100) return;
    const nl = r.nl, gap = Math.floor(Math.random() * nl);
    const laneW = T.W / nl;
    const cars = [];
    for (let i = 0; i < nl; i++) {
      if (i === gap) continue;
      const d = -T.W / 2 + (i + 0.5) * laneW;
      const c = spawnCop(s - pl.s, { block: true, d, type: Math.random() < 0.5 ? 'devriye' : 'ozel' });
      c.s = s; c.a = (i % 2 ? 1 : -1) * 1.2;
      cars.push(c);
    }
    const gd = -T.W / 2 + (gap + 0.5) * laneW;
    const obj = r.world.addRoadblock(s, gd, spikes);
    r.blocks.push({ s, gap: gd, spikes, cars, obj, passed: false });
    popup('İLERİDE BARİKAT!', spikes ? 'Çivili şerit olabilir' : 'Boşluğu bul', 1.6, 'kotu');
    scanner(3);
  }
  function blockLogic() {
    const r = R, pl = r.player;
    for (const b of r.blocks.slice()) {
      const x = ds(pl, { s: b.s });
      if (!b.passed && x < -3) {
        b.passed = true; r.stats.barikat++;
        if (G.onStat) G.onStat('barikat', 1);
        if (r.purs) { r.purs.bounty += 250; r.purs.heatT += 8; }
        popup('BARİKAT GEÇİLDİ', '+250 ÜN', 1.2, 'iyi');
      }
      // çivili şerit: boşluktaki 4 m bant
      if (b.spikes && !b.spiked && !pl.sc && !pl.air && Math.abs(x + 3) < 1.6 && Math.abs(pl.d - b.gap) < 2.3) {
        b.spiked = true; pl.spike = 9;
        popup('LASTİKLER PATLADI!', 'Hız düştü', 1.6, 'kotu'); SES().sfx('spike'); vib(120);
      }
      for (const c of r.cops) if (b.spikes && !c.block && !c.disabled && Math.abs(ds(c, { s: b.s }) - 3) < 1.6 && Math.abs(c.d - b.gap) < 2.3) c.spike = 6;
      if (x < -160) {
        for (const c of b.cars) if (!c.gone) removeCop(c);
        r.world.remove(b.obj);
        r.blocks.splice(r.blocks.indexOf(b), 1);
      }
    }
  }
  function makeHeli() {
    const r = R, g = new THREE.Group();
    const bm = new THREE.MeshLambertMaterial({ color: '#1c2230' });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), bm); body.scale.set(1, 0.8, 1.6); g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 5), bm); tail.position.z = -3.6; g.add(tail);
    const rot = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: 0x333333 })); rot.position.y = 1.4; g.add(rot);
    const rot2 = rot.clone(); rot2.rotation.y = Math.PI / 2; g.add(rot2);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 34, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = -17; g.add(cone);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 })); red.position.set(0, -0.8, 2.3); g.add(red);
    r.scene.add(g);
    r.purs.heli = { obj: g, rot, rot2, red, t: 0, leave: false };
    popup('HELİKOPTER!', 'Kaçış zorlaştı', 1.4, 'kotu');
    SES().sfx('heli');
  }

  // takip engelleri
  function breakerLogic(dt) {
    const r = R, pl = r.player, T = r.T;
    for (const b of r.breakers) {
      if (b.used) {
        if (b.fall < 1) { b.fall = Math.min(1, b.fall + dt * 1.6); b.obj.userData.piv.rotation.z = b.side * -b.fall * b.fall * 1.45; }
        continue;
      }
      const x = ds(pl, { s: b.s });
      const ringD = b.side * (T.W / 2 + 2.2);
      if (!pl.sc && Math.abs(x) < 4 && Math.abs(pl.d - ringD) < 5.5 && pl.v > 12) {
        b.used = true; b.obj.userData.ring.visible = false;
        r.stats.engel++;
        if (G.onStat) G.onStat('engel', 1);
        SES().sfx('breaker'); vib(70); r.shake = 0.8;
        let k = 0;
        for (const c of r.cops) { const cx = ds(pl, c); if (!c.disabled && !c.block && cx < 12 && cx > -90) { disableCop(c, 'engel'); k++; } }
        if (r.purs) r.purs.bounty += 200;
        popup('TAKİP ENGELİ!', k ? k + ' polis durdu' : '', 1.4, 'iyi');
        if (k) scanner('engel');
      }
    }
  }

  // ───────── BİTİŞ ─────────
  function finish(win, extra) {
    const r = R;
    if (r.finished) return;
    r.finished = true;
    r.phase = 'bitti';
    endDrift(true);
    const res = Object.assign({ win, pos: position(r.player), time: r.t, pursTime: r.purs ? r.purs.time : 0, stats: r.stats, bounty: Math.round((r.purs ? r.purs.bounty : 0) + (r.freeBounty || 0)), driftTotal: Math.round(r.drift.total), laps: r.laps }, extra || {});
    res.order = (r.order || []).map(c => c.ad);
    if (G.EKSTRA) G.EKSTRA.finish(res);
    r.result = res;
    SES().sfx(win ? 'win' : 'lose');
    r.player.done = true;
    setTimeout(() => { if (R === r && r.cfg.cb && r.cfg.cb.onFinish) r.cfg.cb.onFinish(res); }, 2200);
  }
  function quit() {
    // serbest sürüşten ya da duraklat menüsünden çıkış
    const r = R; if (!r) return null;
    const res = { win: false, quit: true, stats: r.stats, bounty: Math.round(r.freeBounty || 0) };
    return res;
  }

  function stopRace(silent) { PH = null;
    if (!R) return;
    const r = R;
    if (G.EKSTRA) try { G.EKSTRA.stop(); } catch (e) { }
    if (G.ULTRA) try { G.ULTRA.stop(); } catch (e) { }
    R = null;
    try { r.world.dispose(); } catch (e) { }
    for (const c of r.racers.concat(r.cops, r.traffic)) { r.scene.remove(c.model); A3().dispose(c.model); }
    if (r.fxObjs) for (const o of r.fxObjs) { r.scene.remove(o); o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }
    if (r.env) r.env.dispose();
    root.classList.remove('racing');
    const hud = $('hud'); if (hud) hud.innerHTML = '';
    SES().stopEngine(); SES().siren(0); SES().skid(0);
    if (!silent) SES().music('menu');
  }

  // ───────── MODEL SENKRONU ─────────
  const _q = { x: 0, y: 0, z: 0 };
  function syncModel(c, dt) {
    const m = c.model;
    P().sample(trk(c), loc(c), c.d, tmp);
    const baseY = c.wy != null ? c.wy : tmp.y + rampH(c);
    if (c.bounce) c.bounce = Math.max(0, c.bounce - dt * 0.8);
    m.position.set(tmp.x, baseY + 0.02 - (c.bounce || 0) * 0.5, tmp.z);
    const dir = c.kind === 'traffic' && c.dir < 0 ? Math.PI : 0;
    let head = tmp.h - c.a - c.slip + dir + (c.spin || 0);
    // v10: gövde yönü yumuşak izlenir (çarpışma itmeleri ve şerit değişiminde ani dönüş görünmesin)
    const hv0 = c.hv;
    if (c.hv == null || dt === 0 || c.spin) c.hv = head;
    else { let dh = head - c.hv; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; c.hv += dh * Math.min(1, dt * (c.isPlayer ? 16 : 9)); }
    if (hv0 != null && dt > 0) { let d2 = c.hv - hv0; while (d2 > Math.PI) d2 -= 2 * Math.PI; while (d2 < -Math.PI) d2 += 2 * Math.PI; c.yr = lerp(c.yr || 0, clamp(d2 / dt, -3, 3), Math.min(1, dt * 8)); }
    head = c.hv;
    m.rotation.set(0, 0, 0);
    m.rotation.y = head;
    // eğim + yuvarlanma
    if (c.air > 0) m.rotateX(-Math.atan2(c.vy, Math.max(8, c.v)) * 0.75);
    else if (c.wy != null && rampH(c) > 0) m.rotateX(-0.17);
    else m.rotateX(-Math.atan(tmp.p) * (dir ? -1 : 1) + (c.bounce || 0) * 0.3);
    // v11: gaz/frende gövde eğilmesi (gazda burun kalkar, frende eğilir)
    if (c.kind !== 'traffic' && dt > 0) {
      const ac = c.lastV2 != null ? (c.v - c.lastV2) / dt : 0; c.lastV2 = c.v;
      c.pitch = lerp(c.pitch || 0, clamp(-ac * 0.0045, -0.045, 0.06), Math.min(1, dt * 5));
      m.rotateX(c.pitch);
    }
    // gövde yatışı: dönüş hızı × hız (virajda dışa yatar)
    if (c.isPlayer || c.kind === 'racer' || c.kind === 'cop') {
      c.roll = lerp(c.roll || 0, clamp((c.yr || 0) * c.v * 0.0045 - (c.slip || 0) * 0.05, -0.075, 0.075), Math.min(1, dt * 6));
      m.rotateZ(c.roll);
    }
    // tekerlekler
    c.wheelRot += c.v * dt / 0.34;
    const ws = m.userData.wheels;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      w.rotation.set(0, 0, 0);
      if (w.userData.front && c.isPlayer) w.rotation.y = -c.steer * 0.45;
      else if (w.userData.front && c.kind !== 'traffic') w.rotation.y = -c.a * 1.4;
      w.rotateX(c.wheelRot);
    }
    // stop lambaları
    const braking = c.isPlayer ? (input.brake && c.v > 1) : (c.kind !== 'traffic' && c.lastV != null && c.v < c.lastV - 0.05);
    m.userData.brake.color.setHex(braking ? 0xff2030 : 0xc0101c).multiplyScalar(braking ? 4 : (R.world.isNight ? 1.4 : 0.6));
    c.lastV = c.v;
    // siren
    const sr = m.userData.siren;
    if (sr.length && !c.disabled) {
      const ph = Math.floor((R.t + (c.id || 0) * 3) * 8) % 4;
      sr[0].color.setHex(ph < 2 ? 0xff1020 : 0x300000).multiplyScalar(ph < 2 ? 5 : 1);
      sr[1].color.setHex(ph >= 2 ? 0x2050ff : 0x000030).multiplyScalar(ph >= 2 ? 6 : 1);
    } else if (sr.length) { sr[0].color.setHex(0x200000); sr[1].color.setHex(0x000020); }
    // görünürlük (uzaktakileri çizme)
    if (!c.gone) m.visible = !c.out && Math.abs(ds(R.player, c)) < 900;
  }

  // ───────── KAMERA ─────────
  const camPos = { x: 0, y: 0, z: 0 }, camLook = { x: 0, y: 0, z: 0 };
  let camFov = 56;
  function camTarget(out, look) {
    const pl = R.player, T = trk(pl);
    P().sample(T, loc(pl), pl.d, tmp);
    const cy = pl.wy != null ? pl.wy : tmp.y;
    const head0 = tmp.h - pl.a - pl.slip * 0.55, mode = R.camMode;
    // v13: kamera arabanın dönüşünü hafif geriden izler; anlık yön değişimi ekranda görünür, direksiyon hissi artar
    if (R.camH == null || mode === 2 || Math.abs(R.camH - head0) > 1) R.camH = head0;
    const head = R.camH;
    const dist = mode === 1 ? 7.6 : mode === 2 ? -0.6 : 5.2, hgt = mode === 1 ? 2.5 : mode === 2 ? 1.05 : 1.55;
    const back = R.cfg.tip === 'serbest' && pl.v < 0 ? -1 : 1;
    out.x = tmp.x - Math.sin(head) * dist * back; out.z = tmp.z - Math.cos(head) * dist * back; out.y = cy + hgt * (pl.air ? 0.8 : 1);
    // yol yükseltisine göre kamera zemin altına girmesin
    P().sample(T, loc(pl) - dist, pl.d, tmp2);
    out.y = Math.max(out.y, tmp2.y + hgt * 0.8);
    const la = mode === 2 ? 12 : 7;
    look.x = tmp.x + Math.sin(head) * la; look.z = tmp.z + Math.cos(head) * la; look.y = cy + (mode === 2 ? 0.9 : 0.85);
  }
  function snapCam() { if (R) R.camH = null;
    camTarget(camPos, camLook);
    camera.position.set(camPos.x, camPos.y, camPos.z);
    camera.lookAt(camLook.x, camLook.y, camLook.z);
  }
  const _t = { x: 0, y: 0, z: 0 }, _l = { x: 0, y: 0, z: 0 };
  function updateCamera(dt) {
    const r = R, pl = r.player;
    if (r.camH != null && r.camMode !== 2) { P().sample(trk(pl), loc(pl), pl.d, tmp); const h0 = tmp.h - pl.a - pl.slip * 0.55; r.camH += (h0 - r.camH) * Math.min(1, dt * 7); }
    camTarget(_t, _l);
    const k = r.camMode === 2 ? 1 : 1 - Math.pow(0.0008, dt);
    camPos.x = lerp(camPos.x, _t.x, k); camPos.y = lerp(camPos.y, _t.y, k * 0.9); camPos.z = lerp(camPos.z, _t.z, k);
    camLook.x = lerp(camLook.x, _l.x, Math.min(1, k * 1.6)); camLook.y = lerp(camLook.y, _l.y, Math.min(1, k * 1.6)); camLook.z = lerp(camLook.z, _l.z, Math.min(1, k * 1.6));
    let sx = 0, sy = 0;
    if (r.shake > 0) { sx = (Math.random() - 0.5) * r.shake * 0.5 * opt.shake; sy = (Math.random() - 0.5) * r.shake * 0.35 * opt.shake; r.shake = Math.max(0, r.shake - dt * 2.2); }
    if (pl.nitroOn) { sx += (Math.random() - 0.5) * 0.05; sy += (Math.random() - 0.5) * 0.05; }
    camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z);
    camera.lookAt(camLook.x, camLook.y, camLook.z);
    const vr = Math.max(0, pl.v) / 90;
    const fovT = 55 + vr * 11 + (pl.nitroOn ? 6 : 0) - (r.odakT > 0 ? 5 : 0);
    camFov = lerp(camFov, fovT, Math.min(1, dt * 3));
    if (Math.abs(camera.fov - camFov) > 0.05) { camera.fov = camFov; camera.updateProjectionMatrix(); }
  }

  // ───────── EFEKTLER ─────────
  function initFx() {
    const r = R;
    r.fxObjs = [];
    // kıvılcımlar (Points)
    const n = 120;
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(n * 3).fill(-9999);
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const spk = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffc060, size: 0.35, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    spk.frustumCulled = false;
    r.scene.add(spk); r.fxObjs.push(spk);
    r.spark = { obj: spk, p: [], n };
    for (let i = 0; i < n; i++) r.spark.p.push({ x: 0, y: -9999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    // duman (sprite havuzu)
    r.smoke = [];
    const glow = r.world.glow;
    const smokeN = Q === 0 ? 16 : 40;
    for (let i = 0; i < smokeN; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xcccccc, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false; r.scene.add(s); r.fxObjs.push(s);
      r.smoke.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 1 });
    }
    // nitro alevleri
    const pl = r.player;
    const flM = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    r.flames = [];
    for (const sx of [-0.35, 0.35]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 8, 1, true), flM);
      f.rotation.x = -Math.PI / 2; f.position.set(sx, 0.38, -pl.L / 2 - 0.6);
      f.visible = false; pl.model.add(f); r.flames.push(f);
    }
    // farlar (gece) — yola düşen ışık konisi
    if (r.world.sky.lamps > 0.3 || r.cfg.hava === 'sis') {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const x = c.getContext('2d'), g = x.createRadialGradient(32, 128, 4, 32, 90, 90);
      g.addColorStop(0, 'rgba(255,250,230,0.9)'); g.addColorStop(1, 'rgba(255,250,230,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(26, 128); x.lineTo(38, 128); x.lineTo(64, 0); x.lineTo(0, 0); x.fill();
      const tx = new THREE.CanvasTexture(c);
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(9, 22), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      hl.rotation.x = -Math.PI / 2; hl.rotation.z = Math.PI; hl.position.set(0, 0.05, pl.L / 2 + 11);
      hl.renderOrder = 3;
      pl.model.add(hl);
      for (const c2 of r.racers) if (!c2.isPlayer) { const h2 = hl.clone(); h2.material = hl.material.clone(); h2.material.opacity = 0.35; c2.model.add(h2); }
    }
    // hız çizgileri
    const ln = 60, lg = new THREE.BufferGeometry(), lp = new Float32Array(ln * 6);
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    lines.frustumCulled = false; r.scene.add(lines); r.fxObjs.push(lines);
    r.lines = { obj: lines, seed: [] };
    for (let i = 0; i < ln; i++) r.lines.seed.push([(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, Math.random()]);
  }
  function sparks(c, side, imp) {
    if (opt.fx === 0) return;
    const r = R; P().sample(trk(c), loc(c), c.d + side * c.W / 2, tmp); if (c.wy != null) tmp.y = c.wy;
    const n = Math.min(24, 4 + imp | 0);
    for (let i = 0; i < n; i++) {
      const p = r.spark.p.find(q => q.life <= 0); if (!p) break;
      p.x = tmp.x; p.y = tmp.y + 0.4; p.z = tmp.z;
      const sp = c.v * 0.6;
      p.vx = Math.sin(tmp.h) * sp + (Math.random() - 0.5) * 6; p.vz = Math.cos(tmp.h) * sp + (Math.random() - 0.5) * 6; p.vy = 2 + Math.random() * 4;
      p.life = 0.4 + Math.random() * 0.4;
    }
  }
  function smokeAt(c, big, side) {
    const r = R; const s = r.smoke.find(q => q.life <= 0); if (!s) return;
    P().sample(trk(c), loc(c) - (side ? c.L * 0.4 : 0), c.d + (side || 0), tmp); if (c.wy != null) tmp.y = c.wy;
    s.s.position.set(tmp.x, tmp.y + 0.4, tmp.z); s.s.visible = true;
    s.life = s.max = big ? 2.2 : 0.9; s.grow = big ? 7 : 3.4;
    s.vx = (Math.random() - 0.5) * 1.5; s.vy = big ? 2.5 : 0.8; s.vz = (Math.random() - 0.5) * 1.5;
    s.s.material.color.setHex(big ? 0x333333 : 0xdddddd);
  }
  function updateFx(dt) {
    const r = R, pl = r.player;
    // kıvılcım
    const a = r.spark.obj.geometry.attributes.position.array;
    r.spark.p.forEach((p, i) => {
      if (p.life > 0) { p.life -= dt; p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.life <= 0) p.y = -9999; }
      a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z;
    });
    r.spark.obj.geometry.attributes.position.needsUpdate = true;
    // duman
    for (const s of r.smoke) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const u = 1 - s.life / s.max;
      s.s.position.x += s.vx * dt; s.s.position.y += s.vy * dt; s.s.position.z += s.vz * dt;
      s.s.scale.setScalar(0.8 + u * s.grow);
      s.s.material.opacity = 0.45 * (1 - u);
      if (s.life <= 0) s.s.visible = false;
    }
    // lastik dumanı: drift veya kalkış
    r.smokeT = (r.smokeT || 0) - dt;
    const burn = r.phase === 'yaris' && (Math.abs(pl.slip) > 0.2 && pl.v > 10 || (pl.v < 10 && pl.v > 0.5 && (input.gas || opt.autoGas) && r.t < 4) || (pl.spike > 0 && pl.v > 10));
    if (burn && opt.fx > 0 && r.smokeT < 0) { r.smokeT = opt.fx === 2 ? 0.04 : 0.09; smokeAt(pl, false, -0.8); smokeAt(pl, false, 0.8); }
    for (const c of r.cops) if (c.disabled && Math.random() < dt * 4) smokeAt(c, true);
    SES().skid(r.phase === 'yaris' ? clamp(Math.abs(pl.slip) * 2 + (pl.scrapeT > 0 ? 0.6 : 0), 0, 1) : 0);
    if (pl.scrapeT > 0) pl.scrapeT -= dt;
    // nitro alevi
    for (const f of r.flames) { f.visible = pl.nitroOn; if (pl.nitroOn) { f.scale.set(1, 0.7 + Math.random() * 0.7, 1); } }
    // hız çizgileri (nitro veya çok hızlı)
    const lm = r.lines.obj.material;
    const want = pl.nitroOn ? 0.55 : pl.v > 70 ? 0.2 : 0;
    lm.opacity = lerp(lm.opacity, want, dt * 5);
    if (lm.opacity > 0.02) {
      const la = r.lines.obj.geometry.attributes.position.array;
      const fw = new THREE.Vector3(); camera.getWorldDirection(fw);
      const up = camera.up, rt = new THREE.Vector3().crossVectors(fw, up).normalize();
      const u2 = new THREE.Vector3().crossVectors(rt, fw);
      r.lines.seed.forEach((s, i) => {
        s[2] -= dt * 2.2; if (s[2] < 0) { s[2] += 1; s[0] = (Math.random() - 0.5) * 2; s[1] = (Math.random() - 0.5) * 2; }
        const dpt = 2 + s[2] * 18, rr = 3.2;
        const cx = camera.position.x + fw.x * dpt + rt.x * s[0] * rr + u2.x * s[1] * rr * 0.6;
        const cy = camera.position.y + fw.y * dpt + rt.y * s[0] * rr + u2.y * s[1] * rr * 0.6;
        const cz = camera.position.z + fw.z * dpt + rt.z * s[0] * rr + u2.z * s[1] * rr * 0.6;
        la.set([cx, cy, cz, cx - fw.x * 3, cy - fw.y * 3, cz - fw.z * 3], i * 6);
      });
      r.lines.obj.geometry.attributes.position.needsUpdate = true;
    }
    // helikopter
    if (r.purs && r.purs.heli) {
      const h = r.purs.heli; h.t += dt;
      P().sample(r.T, pl.s + 30, pl.d, tmp);
      const tgt = new THREE.Vector3(tmp.x, tmp.y + (h.leave ? 60 + h.t * 10 : 26), tmp.z);
      h.obj.position.lerp(tgt, Math.min(1, dt * (h.leave ? 0.5 : 1.2)));
      h.obj.rotation.y = tmp.h + Math.PI;
      h.rot.rotation.y += dt * 30; h.rot2.rotation.y += dt * 30;
      h.red.visible = Math.floor(h.t * 2) % 2 === 0;
      if (h.leave && h.obj.position.y > tmp.y + 90) { r.scene.remove(h.obj); r.purs.heli = null; }
    }
    // siren sesi: en yakın polis
    let near = 1e9;
    for (const c of r.cops) if (!c.disabled && c.state !== 'devriye') near = Math.min(near, Math.abs(ds(pl, c)));
    SES().siren(r.purs && near < 400 ? clamp(1 - near / 400, 0.05, 1) : 0);
    // motor
    if (r.phase !== 'geri') SES().engine(pl.rpm, (input.gas || input.nitro || opt.autoGas) && !input.brake ? 1 : 0, pl.nitroOn ? 1 : 0, clamp(pl.v / pl.st.vmax, 0, 1));
    // neon titreşimi
    if (pl.model.userData.neon) pl.model.userData.neon.opacity = 0.6 + Math.sin(r.t * 6) * 0.1;
  }

  // ───────── GÖSTERGE (HUD) ─────────
  function buildHud() {
    const r = R, tip = r.cfg.tip, hud = $('hud');
    const drag = tip === 'drag';
    const solo = !r.racers.some(c => !c.isPlayer);
    hud.innerHTML = `
      <div id="hud-top">
        <div class="hbox" id="hud-pos" ${solo ? 'style="display:none"' : ''}><b id="h-pos">1</b><small id="h-posn">/1</small></div>
        <div class="hbox" id="hud-lap"><small id="h-lapl">TUR</small><b id="h-lap">1/1</b></div>
        <div class="hbox" id="hud-time"><small id="h-timel">SÜRE</small><b id="h-time">0:00.0</b></div>
        <div class="hbox hwide" id="hud-extra" style="display:none"><small id="h-exl"></small><b id="h-ex"></b></div>
      </div>
      <canvas id="hud-map" width="150" height="150"></canvas>
      <div id="hud-goal"></div>
      <div id="hud-purs" style="display:none">
        <div id="h-heat">★</div>
        <div class="pbar"><i id="h-bust"></i><span>YAKALANMA</span></div>
        <div class="pbar ev"><i id="h-evade"></i><span id="h-evl">KAÇIŞ</span></div>
        <div id="h-purinfo"></div>
      </div>
      <div id="hud-scan"></div>
      <div id="hud-radio"></div>
      <div id="hud-pops"></div>
      <div id="hud-count" class="cnt" style="display:none">3</div>
      <div id="hud-launch" style="display:none"><div class="lz"></div><i id="h-lrpm"></i><span>GAZLA DEVRİ YEŞİLDE TUT</span></div>
      <div id="hud-drift" style="display:none"><b id="h-dpts">0</b><small id="h-dmul">x1</small></div>
      <div id="hud-speedo">
        <svg viewBox="0 0 120 120" id="h-rpm"><circle cx="60" cy="60" r="52" class="rbg"/><circle cx="60" cy="60" r="52" class="rfg" id="h-rpmarc"/></svg>
        <div id="h-spd">0</div><small>${opt.mph ? 'mil/s' : 'km/s'}</small><div id="h-gear">1</div>
        <div class="bar nitro"><i id="h-nit"></i></div>
        <div class="bar odak"><i id="h-odak"></i></div>
      </div>
      <div id="hud-ctl">
        <div id="c-steer" class="${opt.tilt && !drag ? 'tilt' : ''}"><span class="l">◀</span><span class="r">▶</span><em>${opt.tilt && !drag ? 'EĞ' : opt.steerMode === 'tus' ? 'BAS' : 'KAYDIR'}</em></div>
        <div class="cb" id="c-odak">⏱ ODAK</div>${opt.manual && !drag ? '<div class="cb gb" id="c-gdn">−<small>vites</small></div><div class="cb gb" id="c-gup">+<small>vites</small></div>' : ''}
        <div id="c-right">
          <div class="cb" id="c-nitro">🔥 NİTRO<small>gaz dahil</small></div>
          <div class="cb" id="c-brake">FREN</div>
          <div class="cb" id="c-hb">${drag ? 'VİTES ▲' : 'DRİFT'}${drag ? '' : '<small>el freni</small>'}</div>
          <div class="cb big" id="c-gas">${opt.autoGas ? 'OTO' : 'GAZ'}</div>
        </div>
      </div>
      <div id="hud-btns"><div class="hb" id="c-pause">❚❚</div><div class="hb" id="c-cam">🎥</div></div>
      <div id="hud-vign"></div>`;
    $('hud-lap').style.display = r.T.loop && tip !== 'serbest' && tip !== 'kovala' && tip !== 'kacis' ? '' : 'none';
    if (tip === 'gise') { $('h-timel').textContent = 'KALAN'; }
    if (tip === 'hiz') { $('hud-extra').style.display = ''; $('h-exl').textContent = 'RADAR TOPLAMI'; }
    if (tip === 'drift') { $('hud-extra').style.display = ''; $('h-exl').textContent = 'PUAN / HEDEF'; $('hud-drift').style.display = ''; }
    if (tip === 'serbest') { $('hud-extra').style.display = ''; $('h-exl').textContent = 'YOL'; $('hud-time').style.display = 'none'; }
    if (tip === 'kovala' && r.cfg.hedef) $('hud-goal').textContent = '🎯 ' + goalText(r.cfg.hedef);
    if (tip === 'kacis') $('hud-goal').textContent = '🎯 Kaçış çubuğunu doldur ve gizlen';
    bindControls();
    r.hudEl = { pos: $('h-pos'), posn: $('h-posn'), lap: $('h-lap'), time: $('h-time'), ex: $('h-ex'), spd: $('h-spd'), gear: $('h-gear'), nit: $('h-nit'), odak: $('h-odak'),
      rpm: $('h-rpmarc'), heat: $('h-heat'), bust: $('h-bust'), evade: $('h-evade'), evl: $('h-evl'), pinfo: $('h-purinfo'), dpts: $('h-dpts'), dmul: $('h-dmul'), drift: $('hud-drift'), vign: $('hud-vign'), map: $('hud-map').getContext('2d') };
    r.hudT = 0;
  }
  // v8: emoji yerine simge (ikon.js); sadece değişince yaz (her karede DOM'u yormasın)
  function setH(el, html) { if (el._h === html) return; el._h = html; el.innerHTML = G.IKON ? G.IKON.h(html) : html; }
  function fmtT(t) { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function updateHud(dt) {
    if (R.phase !== 'geri' && R.hudEl && !R.hudEl.lHid) { const lb = $('hud-launch'); if (lb) lb.style.display = 'none'; R.hudEl.lHid = 1; }
    const r = R, e = r.hudEl, pl = r.player, tip = r.cfg.tip;
    r.hudT -= dt;
    const kmh = Math.round(Math.abs(pl.v) * KMH);
    e.spd.textContent = opt.mph ? Math.round(kmh * 0.6214) : kmh;
    e.gear.textContent = pl.v < -0.5 ? 'G' : pl.gear; e.gear.classList.toggle('lim', !!(opt.manual && pl.limiter > 0));
    e.nit.style.width = (pl.nitro * 100) + '%';
    e.nit.parentNode.classList.toggle('on', pl.nitroOn);
    e.odak.style.width = (r.odak * 100) + '%';
    const rp = clamp(pl.rpm, 0, 1.05);
    e.rpm.style.strokeDashoffset = (327 * (1 - rp * 0.75)).toFixed(1);
    e.rpm.classList.toggle('red', rp > 0.92);
    e.rpm.classList.toggle('perfect', tip === 'drag' && rp >= 0.86 && rp <= 0.97);
    if (r.hudT <= 0) {
      r.hudT = 0.1;
      const alive = r.racers.filter(c => !c.out).length;
      e.pos.textContent = position(pl); e.posn.textContent = '/' + alive;
      if (r.T.loop) e.lap.textContent = Math.min(r.laps, pl.lap + 1) + '/' + r.laps;
      e.time.textContent = tip === 'gise' ? fmtT(r.timeLeft) : fmtT(r.t);
      if (tip === 'gise') e.time.parentNode.classList.toggle('warn', r.timeLeft < 5);
      if (tip === 'hiz') e.ex.textContent = Math.round(r.stats.hizToplam) + ' km/s';
      if (tip === 'drift') e.ex.textContent = Math.round(r.drift.total).toLocaleString('tr-TR') + ' / ' + r.driftTarget.toLocaleString('tr-TR');
      if (tip === 'serbest') e.ex.textContent = (r.stats.mesafe / 1000).toFixed(1) + ' km';
      drawMap();
    }
    const D = r.drift;
    if (tip === 'drift' || D.on) {
      e.drift.style.display = D.on ? '' : (tip === 'drift' ? '' : 'none');
      e.dpts.textContent = Math.round(D.pts).toLocaleString('tr-TR');
      e.dmul.textContent = 'x' + D.mult;
      e.drift.classList.toggle('live', D.on);
    }
    if (r.purs) {
      const p = r.purs;
      setH(e.heat, '★'.repeat(p.heat) + '<span>' + '★'.repeat(5 - p.heat) + '</span>');
      e.bust.style.width = (p.bust * 100) + '%';
      e.evade.style.width = (p.mode === 'sogu' ? p.cool / (8 + p.heat * 3) * 100 : p.evade * 100) + '%';
      e.evl.textContent = p.mode === 'sogu' ? 'GİZLENİYOR' : 'KAÇIŞ';
      e.evade.parentNode.classList.toggle('cool', p.mode === 'sogu');
      setH(e.pinfo, `🚓 ${r.cops.filter(c => !c.disabled && !c.block).length} &nbsp; ⏱ ${Math.floor(p.time)} sn &nbsp; 🔥 ${Math.round(p.bounty).toLocaleString('tr-TR')} ÜN`);
      e.vign.className = p.mode === 'takip' ? (Math.floor(r.t * 3) % 2 ? 'red' : 'blue') : '';
    } else e.vign.className = pl.nitroOn ? 'nit' : '';
  }
  function buildMinimap() {
    const T = R.T, c = document.createElement('canvas'); c.width = c.height = 150;
    const x = c.getContext('2d');
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < T.N; i++) { minX = Math.min(minX, T.px[i]); maxX = Math.max(maxX, T.px[i]); minZ = Math.min(minZ, T.pz[i]); maxZ = Math.max(maxZ, T.pz[i]); }
    const sc = 130 / Math.max(maxX - minX, maxZ - minZ, 1);
    const ox = 75 - (minX + maxX) / 2 * sc, oz = 75 - (minZ + maxZ) / 2 * sc;
    const X = wx => 150 - (wx * sc + ox), Y = wz => 150 - (wz * sc + oz); // ekranda sağ = sürücünün sağı ile uyumlu olsun
    x.lineCap = x.lineJoin = 'round';
    for (const [w, col] of [[7, 'rgba(0,0,0,0.6)'], [3.5, 'rgba(255,255,255,0.75)']]) {
      x.strokeStyle = col; x.lineWidth = w; x.beginPath();
      for (let i = 0; i < T.N; i += 3) { const px = X(T.px[i]), py = Y(T.pz[i]); i ? x.lineTo(px, py) : x.moveTo(px, py); }
      if (T.loop) x.closePath();
      x.stroke();
    }
    x.strokeStyle = 'rgba(255,214,0,0.9)'; x.lineWidth = 2.5; x.setLineDash([4, 3]);
    for (const k of R.shortcuts) { x.beginPath(); k.poly.forEach((p, i) => i ? x.lineTo(X(p[0]), Y(p[1])) : x.moveTo(X(p[0]), Y(p[1]))); x.stroke(); }
    x.setLineDash([]);
    return { img: c, X, Y };
  }
  function drawMap() {
    const r = R, m = r.minimap, x = r.hudEl.map;
    x.clearRect(0, 0, 150, 150);
    x.drawImage(m.img, 0, 0);
    const dot = (c, col, sz) => { if (c.sc) P().sample(c.sc.T, c.ss, c.d, tmp); else P().sample(r.T, c.s, c.d, tmp); x.fillStyle = col; x.beginPath(); x.arc(m.X(tmp.x), m.Y(tmp.z), sz, 0, 7); x.fill(); };
    if (!r.T.loop) { P().sample(r.T, r.finishS, 0, tmp); x.fillStyle = '#ff2e63'; x.fillRect(m.X(tmp.x) - 4, m.Y(tmp.z) - 4, 8, 8); }
    for (const b of r.breakers) if (!b.used) dot(b, '#ffd600', 2.2);
    for (const cp of r.cps) if (!cp.done) { dot(cp, '#00e5ff', 3.5); break; }
    for (const c of r.cops) if (!c.disabled) dot(c, Math.floor(r.t * 4) % 2 ? '#ff3040' : '#3070ff', 3.2);
    for (const c of r.racers) if (!c.isPlayer && !c.out) dot(c, c.renk || '#ff2e63', 3.4);
    dot(r.player, '#ffffff', 4.6);
  }

  // anlık yazılar
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
  function radio(kind) {
    const lines = V().RADIO[kind]; if (!lines) return;
    const el = $('hud-radio'); if (!el) return;
    el.innerHTML = `<b>🧢 Bora:</b> ${lines[Math.floor(Math.random() * lines.length)]}`;
    el.className = 'on';
    clearTimeout(el._t); el._t = setTimeout(() => { el.className = ''; }, 3200);
  }
  function scanner(kind) {
    const lines = V().SCANNER[kind]; if (!lines) return;
    const el = $('hud-scan'); if (!el) return;
    el.innerHTML = `<b>📻 POLİS:</b> ${lines[Math.floor(Math.random() * lines.length)]}`;
    el.className = 'on';
    SES().sfx('radio');
    clearTimeout(el._t); el._t = setTimeout(() => { el.className = ''; }, 3600);
  }
  function vib(ms) { if (opt.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

  // ───────── KONTROLLER ─────────
  let keysBound = false;
  function bindControls() {
    const hold = (id, key, onDown) => {
      const el = $(id); if (!el) return;
      const set = v => { if (key) input[key] = v; el.classList.toggle('on', !!v); };
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId); set(1); onDown && onDown(); });
      el.addEventListener('pointerup', e => { e.preventDefault(); set(0); });
      el.addEventListener('pointercancel', () => set(0));
      el.addEventListener('lostpointercapture', () => set(0));
    };
    const drag = !!R && R.cfg.tip === 'drag';
    hold('c-odak', null, () => { if (CITY && CITY.odak) CITY.odak(); else odak(); });
    hold('c-gup', null, () => { input.gUp = 1; }); hold('c-gdn', null, () => { input.gDn = 1; });
    // v7: sağ tuş kümesi tek dokunma alanı — parmak kaldırmadan GAZ ↔ NİTRO ↔ DRİFT ↔ FREN arasında kaydırılabilir
    const rb = $('c-right'), ptr = {};
    const keys = { 'c-gas': 'gas', 'c-brake': 'brake', 'c-nitro': 'nitro', 'c-hb': drag ? null : 'hb' };
    const refresh = () => {
      const on = {}; for (const p in ptr) if (ptr[p]) on[ptr[p]] = 1;
      for (const id in keys) { const el = $(id); if (!el) continue; el.classList.toggle('on', !!on[id]); if (keys[id]) input[keys[id]] = on[id] ? 1 : 0; }
    };
    const pick = e => {
      let el = document.elementFromPoint(e.clientX, e.clientY);
      while (el && el !== rb && !(el.id in keys)) el = el.parentElement;
      return el && el !== rb ? el.id : null;
    };
    const setP = (e, id) => { if (!id || id === ptr[e.pointerId]) return; ptr[e.pointerId] = id; if (drag && id === 'c-hb') input.shift = 1; refresh(); };
    rb.addEventListener('pointerdown', e => { e.preventDefault(); rb.setPointerCapture && rb.setPointerCapture(e.pointerId); ptr[e.pointerId] = null; setP(e, pick(e)); });
    rb.addEventListener('pointermove', e => { if (e.pointerId in ptr) setP(e, pick(e)); });
    const endP = e => { if (!(e.pointerId in ptr)) return; delete ptr[e.pointerId]; refresh(); };
    rb.addEventListener('pointerup', endP); rb.addEventListener('pointercancel', endP); rb.addEventListener('lostpointercapture', endP);
    $('c-pause').onclick = () => G.onPauseReq && G.onPauseReq();
    $('c-cam').onclick = cycleCam;
    // direksiyon bölgesi: parmağın konumu = direksiyon açısı (sürükleyerek)
    const st = $('c-steer');
    let sid = null, sx0 = 0;
    const calc = e => {
      const rc = st.getBoundingClientRect();
      const cx = rc.left + rc.width / 2;
      if (opt.steerMode === 'tus') return e.clientX < cx ? -1 : 1; // tuş modu: yarıya basınca yavaşça tam kilide gider
      let v = (e.clientX - cx) / (rc.width * 0.32 / (opt.steerSens || 1));
      if (Math.abs(v) < 0.12) v = 0;
      return clamp(v, -1, 1);
    };
    st.addEventListener('pointerdown', e => {
      e.preventDefault(); sid = e.pointerId; st.setPointerCapture && st.setPointerCapture(e.pointerId); sx0 = e.clientX;
      if (drag) { const rc = st.getBoundingClientRect(); if (e.clientX < rc.left + rc.width / 2) input.laneL = 1; else input.laneR = 1; return; }
      if (!opt.tilt) input.steer = calc(e);
      st.classList.toggle('L', input.steer < 0); st.classList.toggle('R', input.steer > 0);
    });
    st.addEventListener('pointermove', e => { if (e.pointerId !== sid || drag || opt.tilt) return; input.steer = calc(e); st.classList.toggle('L', input.steer < 0); st.classList.toggle('R', input.steer > 0); });
    const up = e => { if (e.pointerId !== sid) return; sid = null; input.steer = 0; st.classList.remove('L', 'R'); };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    if (!keysBound) {
      keysBound = true;
      const km = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'hb', ShiftLeft: 'nitro', ShiftRight: 'nitro', KeyN: 'nitro' };
      const kd = {};
      window.addEventListener('keydown', e => {
        if (!R && !CITY) return;
        const drg = !!R && R.cfg.tip === 'drag';
        if (km[e.code]) { input[km[e.code]] = 1; if (e.code === 'Space') e.preventDefault(); }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') { kd.l = 1; if (drg && !e.repeat) input.laneL = 1; }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') { kd.r = 1; if (drg && !e.repeat) input.laneR = 1; }
        if (drg && (e.code === 'KeyQ' || e.code === 'Space') && !e.repeat) input.shift = 1;
        if (e.code === 'KeyE' && !e.repeat) { if (CITY && CITY.odak) CITY.odak(); else odak(); }
        if (e.code === 'KeyC' && !e.repeat) cycleCam();
        if (e.code === 'Escape' && G.onPauseReq) G.onPauseReq();
        input.steer = (kd.r ? 1 : 0) - (kd.l ? 1 : 0);
      });
      window.addEventListener('keyup', e => {
        if (km[e.code]) input[km[e.code]] = 0;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') kd.l = 0;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') kd.r = 0;
        if (R || CITY) input.steer = (kd.r ? 1 : 0) - (kd.l ? 1 : 0);
      });
      // eğerek sürüş
      window.addEventListener('deviceorientation', e => {
        if (!opt.tilt) return;
        const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
        let v = ang === 90 ? e.beta : ang === -90 || ang === 270 ? -e.beta : e.gamma;
        if (v == null) return;
        input.tilt = clamp(v / (28 / opt.tiltSens), -1, 1);
      });
    }
  }
  function odak() {
    if (!R || R.phase !== 'yaris') return;
    if (R.odakT > 0) { R.odakT = 0; return; }
    if (R.odak < 0.25) { popup('ODAK DOLMADI', '', 0.7, 'kotu'); return; }
    R.odakT = 5; SES().sfx('odak');
  }
  function cycleCam() { if (CITY && CITY.cam) { CITY.cam(); return; } if (!R) return; R.camMode = (R.camMode + 1) % 3; opt.cam = R.camMode; if (G.onCam) G.onCam(R.camMode); snapCam(); }
  function resetInput() { for (const k in input) input[k] = 0; }

  // ───────── v13 FOTOĞRAF MODU: yarış donar, kamera oyuncunun etrafında serbestçe döner ─────────
  let PH = null;
  function photo(on) {
    if (!R) return null;
    if (!on) { PH = null; if (R.player.model) R.player.model.visible = true; camera.fov = camFov; camera.updateProjectionMatrix(); return null; }
    const pm = R.player.model, c = pm.position, dx = camera.position.x - c.x, dz = camera.position.z - c.z;
    PH = { yaw: Math.atan2(dx, dz), pitch: 0.18, dist: Math.max(4, Math.min(14, Math.hypot(dx, dz))), fov: 50, roll: 0, gizle: false };
    return PH;
  }
  function photoFrame(dt) {
    const r = R, pm = r.player.model, c = pm.position;
    pm.visible = !PH.gizle;
    PH.pitch = clamp(PH.pitch, -0.05, 1.35); PH.dist = clamp(PH.dist, 2.6, 30);
    const cp = Math.cos(PH.pitch), y0 = c.y + 0.7;
    camera.position.set(c.x + Math.sin(PH.yaw) * cp * PH.dist, y0 + Math.sin(PH.pitch) * PH.dist + 0.25, c.z + Math.cos(PH.yaw) * cp * PH.dist);
    camera.up.set(Math.sin(PH.roll) * Math.cos(PH.yaw), Math.cos(PH.roll), -Math.sin(PH.roll) * Math.sin(PH.yaw));
    camera.lookAt(c.x, y0, c.z);
    camera.up.set(0, 1, 0);
    if (Math.abs(camera.fov - PH.fov) > 0.05) { camera.fov = PH.fov; camera.updateProjectionMatrix(); }
    if (G.POST) { const P2 = G.POST.P; P2.speed = 0; P2.hit = 0; P2.odak = 0; }
    r.world.update(0, camera);
    draw(r.scene);
  }
  // o anki kareyi çizip filtreli JPEG olarak döndürür
  function photoShot(filter, cerceve) {
    if (!R || !PH) return null;
    photoFrame(0);
    const w = canvas.width, h = canvas.height, o = document.createElement('canvas'); o.width = w; o.height = h;
    const g = o.getContext('2d');
    g.filter = filter || 'none'; g.drawImage(canvas, 0, 0); g.filter = 'none';
    if (cerceve) {
      const vg = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h * 0.07); g.fillRect(0, h * 0.93, w, h * 0.07);
    }
    g.font = `800 ${Math.round(h * 0.03)}px "Plus Jakarta Sans", sans-serif`; g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillText('GECE KAÇAĞI', w - h * 0.03, h * (cerceve ? 0.905 : 0.965));
    return o.toDataURL('image/jpeg', 0.92);
  }

  function pause(v) { paused = v; if (v) { SES().stopEngine(); SES().siren(0); SES().skid(0); resetInput(); } else lastT = performance.now(); }

  // sanal sürücü: yarış çizgisi + viraj öncesi fren (test için)
  function botDrive(r, skill) {
    const pl = r.player, T = r.T;
    r.t += 1 / 60;
    const look = 20 + pl.v * 1.4;
    const TL = trk(pl), sl = loc(pl);
    const cs = P().curvSign(TL, sl, look * 0.8);
    const dT = -Math.sign(cs) * Math.min(1, Math.abs(cs) * 50) * (TL.W / 2 - 2.5);
    const ahead = nearestAhead(pl, 30);
    let tgt = dT;
    if (ahead) tgt = ahead.d > pl.d ? ahead.d - 3 : ahead.d + 3;
    for (const b of r.blocks) { const x = ds(pl, { s: b.s }); if (x > 0 && x < 160) tgt = b.gap + (b.spikes ? 0 : 0); }
    if (!pl.sc) for (const k of r.shortcuts) { const x = k.sA - pl.s; if (x > 0 && x < 60) tgt = k.side * T.W; }
    // v10: direksiyon eğrisi ve daha güçlü dönüşe uyum (insan gibi: aynı dönüş için daha az, eğriyi telafi eden giriş)
    const st0 = clamp(((tgt - pl.d) * 0.12 - pl.a * 2.2 + (P().curvAt(TL, sl + 10) * -pl.v * 0.25) * (1 - opt.assist)) / 1.38, -1, 1);
    input.steer = Math.sign(st0) * Math.pow(Math.abs(st0), 1 / 1.35);
    if (!opt.klasik && r.cfg.tip !== 'drag') { // v16 arcade: gereken dönüş hızı ÷ o hızdaki en çok dönüş = direksiyon
      const k0 = P().curvAt(TL, sl + 4), sp = Math.max(3, Math.abs(pl.v));
      const rMax = Math.min(sp / 5.8, pl.st.grip * r.gripMul * GRAV * 1.45 / sp) * (input.hb ? 2.3 : 1);
      const aD = clamp((tgt - pl.d) * 0.05, -0.2, 0.2);
      const rWant = -k0 * pl.v * (1 - 0.9 * opt.assist) + (aD - pl.a) * 1.6;
      const sd = clamp(rWant / rMax, -1, 1);
      input.steer = Math.sign(sd) * Math.pow(Math.abs(sd), 1 / 1.35);
    }
    const kmax = P().maxCurv(TL, sl, 25 + pl.v * 1.5);
    const vC = Math.sqrt(pl.st.grip * r.gripMul * GRAV * (opt.klasik ? 1.12 : 1.3) / Math.max(0.0008, kmax)) * skill; // v16: arcade modelde araba virajı daha hızlı alır
    input.gas = pl.v < vC ? 1 : 0; input.brake = pl.v > vC + 4 ? 1 : 0;
    input.nitro = kmax < 0.006 && pl.nitro > 0.3 ? 1 : 0;
    input.hb = 0;
    if (r.cfg.tip === 'drag') {
      if (pl.rpm > 0.9) input.shift = 1;
      const a2 = nearestAhead(pl, 110);
      const laneD = -T.W / 2 + (pl.lane + 0.5) * T.W / r.nl;
      if (a2 && Math.abs(a2.d - pl.d) < 2.5 && Math.abs(laneD - pl.d) < 0.4) { if (pl.lane > 0) input.laneL = 1; else input.laneR = 1; }
    }
    if (r.cfg.tip === 'drift' && Math.abs(P().curvAt(T, pl.s + 15)) > 0.005 && pl.v > 13) { input.hb = 1; input.gas = 1; input.brake = 0; }
  }

  // dışa açık
  G.YARIS = { carReady,
    init, setQuality, start, stopRace, showroom, setShowCar, hideShow, pause, cine, cineFx: (hit, tint) => { if (SHOW) { if (hit != null) SHOW.hit = hit; if (tint) SHOW.tint = tint; } }, photo, photoShot, get PH() { return PH; }, quit, statsOf, opt, input,
    setTraffic, refreshHud: () => { if (R) { buildHud(); R.wake = true; } },
    get active() { return !!R || !!CITY; }, get city() { return CITY; },
    // v15: açık şehir için ortak parçalar
    kit: () => ({ THREE, renderer, camera, canvas, opt, input, draw, A3: A3(), SES: SES(), startLoop, hideShow, root, Q: () => Q, setH, bindControls, resetInput, $, DYN, tire, arcadeCore }),
    setCity: c => { CITY = c; if (c) { hideShow(); startLoop(); } }, get R() { return R; }, goalText, get _ren() { return renderer; }, get _show() { return SHOW; },
    // test kancası: ekransız hızlı simülasyon (sanal sürücü ile)
    _fast: (sec, bot) => {
      const r = R; if (!r) return null;
      if (r.phase === 'geri') { r.phase = 'yaris'; r.count = 0; }
      const h = 1 / 60;
      for (let i = 0; i < sec * 60 && R === r && !r.finished; i++) {
        if (bot) botDrive(r, bot);
        simulate(h);
        if (r.odakT > 0) r.odakT = 0;
      }
      return { t: r.t, pos: position(r.player), fin: r.finished, res: r.result, prog: r.player.prog, wall: r.stats.duvar, v: r.player.v };
    },
    _dbg: () => R && { s: R.player.s, v: R.player.v, lap: R.player.lap, phase: R.phase, pos: position(R.player), cops: R.cops.length, purs: !!R.purs, fin: R.finished },
  };
})(window);
