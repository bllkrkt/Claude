// Gece Kaçağı v7 ekleri: hasar görseli, kırılabilir engeller, serbest sürüş gizli parçaları, hayalet yarış
// yaris.js her yarışta EKSTRA.start(R, api) çağırır; api = yarış motorunun iç yardımcıları
(function (G) {
  'use strict';
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const GKEY = 'gece-kacagi-hayalet';
  let R = null, A = null, THREE = null;
  const o1 = {}, o2 = {};

  // ───────── hayalet kayıtları (ana kayıttan ayrı, büyük olabilir) ─────────
  let GH = null;
  function ghosts() {
    if (GH) return GH;
    try { GH = JSON.parse(localStorage.getItem(GKEY) || '{}') || {}; } catch (e) { GH = {}; }
    return GH;
  }
  function saveGhosts() { try { localStorage.setItem(GKEY, JSON.stringify(GH)); } catch (e) { } }
  function ghostOf(id) { const g = ghosts()[id]; return g && g.p && g.p.length >= 10 ? g : null; }

  // ───────── ortak dokular ─────────
  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texWood() {
    const c = cvs(64, 64), x = c.getContext('2d');
    x.fillStyle = '#a0703a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#b07e44' : '#946634'; x.fillRect(0, i * 16 + 1, 64, 14); }
    x.strokeStyle = '#5a3a1a'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 60);
    x.beginPath(); x.moveTo(4, 4); x.lineTo(60, 60); x.stroke();
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  function texStripe(a, b, n, vert) {
    const c = cvs(64, 64), x = c.getContext('2d');
    for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; if (vert) x.fillRect(0, i * 64 / n, 64, 64 / n); else x.fillRect(i * 64 / n, 0, 64 / n, 64); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

  // ───────── başlat / bitir ─────────
  function start(r, api) {
    stop();
    R = r; A = api; THREE = api.THREE;
    r.ex = { props: [], flying: [], tokens: [], disp: [], ghost: null, rec: null, laps: [], kirik: 0, lapT0: null, objs: [] };
    if (r.cfg.tip !== 'drag') buildProps();
    if (r.cfg.koleksiyon) buildTokens(r.cfg.koleksiyon);
    if (r.cfg.pistId && r.cfg.tip !== 'drag' && r.cfg.tip !== 'serbest' && r.cfg.tip !== 'kovala' && r.cfg.tip !== 'kacis') {
      r.ex.rec = { buf: [], t: 0, on: false };
      if (r.cfg.hayalet) buildGhost(ghostOf(r.cfg.pistId));
      if (!r.T.loop) beginRec(); // sprintte yarış başından kaydet
    }
    r.player.dmg = 0;
    for (const c of r.racers) { c.dmg = 0; prepDmg(c); }
  }
  function stop() {
    if (!R || !R.ex) { R = null; return; }
    const ex = R.ex, sc = R.scene;
    for (const o of ex.objs) sc.remove(o);
    for (const d of ex.disp) try { d.dispose(); } catch (e) { }
    if (ex.ghost) { sc.remove(ex.ghost.m); ex.ghost.mats.forEach(m => m.dispose()); }
    R = null;
  }
  const add = o => { R.scene.add(o); R.ex.objs.push(o); return o; };

  // ───────── HASAR ─────────
  // boya malzemeleri (araç başına ayrı) karartılır, pürüzlenir; ağır hasarda kaputtan duman çıkar
  function prepDmg(c) {
    const ms = [];
    c.model.traverse(o => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material;
      if (ms.indexOf(m) >= 0 || m.userData.varlik || m.transparent || m.isMeshBasicMaterial) return;
      if (c.model.userData.paints ? c.model.userData.paints.indexOf(m) < 0 : true) return;
      ms.push(m);
    });
    c.dmgM = ms.map(m => ({ m, col: m.color.clone(), r: m.roughness != null ? m.roughness : 0.5, cc: m.clearcoat || 0 }));
    c.dmgV = 0;
  }
  const DCOL = { r: 0.16, g: 0.14, b: 0.12 };
  function dmg(c, imp) {
    if (!c || c.dmg == null || imp < 3) return;
    const before = c.dmg;
    c.dmg = Math.min(1, c.dmg + (imp - 2) * 0.0045);
    if (c.isPlayer) {
      if (before < 0.5 && c.dmg >= 0.5) A.popup('HASAR %50', 'Araban yıpranıyor', 1.2, 'kotu');
      if (before < 0.85 && c.dmg >= 0.85) A.popup('AĞIR HASAR', 'Kaputtan duman çıkıyor', 1.4, 'kotu');
    }
  }
  function dmgFrame(c, dt) {
    if (!c.dmgM || c.dmg == null) return;
    if (Math.abs(c.dmgV - c.dmg) > 0.004) {
      c.dmgV = lerp(c.dmgV, c.dmg, Math.min(1, dt * 5));
      const k = c.dmgV * 0.55;
      for (const d of c.dmgM) {
        d.m.color.setRGB(lerp(d.col.r, DCOL.r, k), lerp(d.col.g, DCOL.g, k), lerp(d.col.b, DCOL.b, k));
        if (d.m.roughness != null) d.m.roughness = lerp(d.r, 0.85, c.dmgV);
        if (d.m.clearcoat != null) d.m.clearcoat = d.cc * (1 - c.dmgV * 0.9);
      }
    }
    // duman / kıvılcım
    if (c.dmg > 0.55 && c.model.visible) {
      c.dmgSm = (c.dmgSm || 0) - dt;
      if (c.dmgSm < 0) { c.dmgSm = c.dmg > 0.85 ? 0.12 : 0.3; A.smokeFront(c, c.dmg > 0.85); }
    }
  }

  // ───────── KIRILABİLİR ENGELLER ─────────
  function buildProps() {
    const r = R, T = r.T, rng = A.P().rng((r.cfg.pist.seed || 1) * 7 + 3);
    const woodT = texWood(), coneT = texStripe('#ff6a00', '#f4f4f4', 6, true), barT = texStripe('#e8e8e8', '#d01818', 8, false);
    const mats = {
      kasa: new THREE.MeshLambertMaterial({ map: woodT }),
      koni: new THREE.MeshLambertMaterial({ map: coneT }),
      bariyer: new THREE.MeshLambertMaterial({ map: barT }),
      ayak: new THREE.MeshLambertMaterial({ color: '#444' }),
    };
    const geo = {
      kasa: new THREE.BoxGeometry(1.1, 1.1, 1.1).translate(0, 0.55, 0),
      koni: new THREE.ConeGeometry(0.28, 0.8, 10, 1, true).translate(0, 0.4, 0),
      bariyer: new THREE.BoxGeometry(2.2, 0.32, 0.1).translate(0, 0.85, 0),
      ayak: new THREE.BoxGeometry(0.08, 0.9, 0.5).translate(0, 0.45, 0),
    };
    r.ex.disp.push(woodT, coneT, barT, ...Object.values(mats), ...Object.values(geo));
    const near = s0 => (r.ramps || []).some(p => !p.sc && Math.abs(p.s0 - s0) < 40) || (r.shortcuts || []).some(k => Math.abs(k.sA - s0) < 40 || Math.abs(k.sB - s0) < 40);
    const mk = (kind, Tk, sc, s, d, yaw) => {
      let m;
      if (kind === 'bariyer') {
        m = new THREE.Group();
        m.add(new THREE.Mesh(geo.bariyer, mats.bariyer));
        for (const x of [-0.95, 0.95]) { const f = new THREE.Mesh(geo.ayak, mats.ayak); f.position.x = x; m.add(f); }
      } else m = new THREE.Mesh(geo[kind], mats[kind]);
      A.P().sample(Tk, s, d, o1);
      m.position.set(o1.x, o1.y, o1.z); m.rotation.y = o1.h + (yaw || 0);
      add(m);
      const L = kind === 'bariyer' ? 0.5 : kind === 'kasa' ? 1.1 : 0.5, W = kind === 'bariyer' ? 2.2 : kind === 'kasa' ? 1.1 : 0.5;
      r.ex.props.push({ kind, m, s, d, sc, L, W, alive: true });
    };
    const L = r.T.L, endS = T.loop ? L - 60 : L - 120;
    for (let s = 160; s < endS; s += 120 + rng() * 160) {
      if (near(s)) continue;
      const u = rng(), sg = rng() < 0.5 ? -1 : 1;
      if (u < 0.4) { // koni dizisi (şerit kapatma)
        const d0 = sg * (T.W / 2 - 1.2 - rng() * 2);
        for (let i = 0; i < 5; i++) mk('koni', T, null, s + i * 3, d0 - sg * i * 0.45);
      } else if (u < 0.75) { // kasa yığını yol kenarında
        const d0 = sg * (T.W / 2 - 0.9);
        const n = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < n; i++) mk('kasa', T, null, s + i * 1.25, d0 - sg * (i % 2) * 1.15, rng() * 0.4);
      } else { // yol çalışması bariyeri
        const d0 = sg * (T.W / 2 - 1.6);
        mk('bariyer', T, null, s, d0, Math.PI / 2);
        mk('koni', T, null, s - 3, d0); mk('koni', T, null, s + 3, d0);
      }
    }
    // kestirmelerin içinde kasa yığınları (klasik ara sokak)
    for (const k of r.shortcuts || []) {
      const K = k.T, n = 2 + Math.floor(rng() * 2);
      for (let j = 0; j < n; j++) {
        const s = K.L * (0.3 + 0.4 * j / Math.max(1, n - 1)), sg = j % 2 ? 1 : -1;
        for (let i = 0; i < 3; i++) mk('kasa', K, k, s + (i % 2) * 1.2, sg * (K.W / 2 - 0.9 - (i > 1 ? 1.15 : 0)), rng() * 0.5);
      }
    }
  }
  function propHits() {
    const r = R, ex = r.ex;
    const cars = r.racers.filter(c => !c.out).concat(r.cops.filter(c => !c.disabled && !c.block));
    for (const p of ex.props) {
      if (!p.alive) continue;
      for (const c of cars) {
        if ((c.sc || null) !== p.sc) continue;
        const sl = p.sc ? c.ss : c.s;
        let x = p.s - sl;
        if (!p.sc && r.T.loop) { if (x > r.T.L / 2) x -= r.T.L; else if (x < -r.T.L / 2) x += r.T.L; }
        if (Math.abs(x) > (c.L + p.L) / 2 || Math.abs(p.d - c.d) > (c.W + p.W) / 2) continue;
        if (c.air > 0 && (c.wy || 0) > p.m.position.y + 1.2) continue;
        smash(p, c);
        break;
      }
    }
  }
  function smash(p, c) {
    const r = R;
    p.alive = false;
    const v = Math.abs(c.v), heavy = p.kind === 'kasa' ? 1 : p.kind === 'bariyer' ? 0.7 : 0.25;
    // dünya yönü: aracın gidişi
    A.P().sample(p.sc ? p.sc.T : r.T, p.s, p.d, o1);
    const h = o1.h - (c.a || 0), fx = Math.sin(h), fz = Math.cos(h);
    const side = (Math.random() - 0.5) * 2;
    const sp = v * (0.75 + Math.random() * 0.35) / (0.6 + heavy * 0.5);
    r.ex.flying.push({ m: p.m, vx: fx * sp - fz * side * 3, vz: fz * sp + fx * side * 3, vy: 3 + v * 0.12 + Math.random() * 3,
      rx: (Math.random() - 0.5) * 14, ry: (Math.random() - 0.5) * 10, rz: (Math.random() - 0.5) * 14, gy: o1.y, t: 0 });
    c.v *= 1 - 0.035 * heavy;
    if (c.isPlayer) {
      r.ex.kirik++; r.stats.kirik = r.ex.kirik;
      dmg(c, 3 + 4 * heavy);
      A.SES().sfx(heavy > 0.5 ? 'bump' : 'scrape', 0.6);
      A.vib(heavy > 0.5 ? 30 : 12);
      r.shake = Math.min(1, r.shake + 0.12 * heavy);
      if (r.ex.kirik % 5 === 0) A.popup('PARAMPARÇA x' + r.ex.kirik, '', 0.9, 'orta');
    }
  }
  function flyFrame(dt) {
    const ex = R.ex;
    for (let i = ex.flying.length - 1; i >= 0; i--) {
      const f = ex.flying[i], m = f.m;
      f.t += dt;
      f.vy -= 20 * dt;
      m.position.x += f.vx * dt; m.position.y += f.vy * dt; m.position.z += f.vz * dt;
      m.rotation.x += f.rx * dt; m.rotation.y += f.ry * dt; m.rotation.z += f.rz * dt;
      if (m.position.y < f.gy) { // yere çarp, sek
        m.position.y = f.gy; f.vy = -f.vy * 0.35; f.vx *= 0.6; f.vz *= 0.6; f.rx *= 0.6; f.ry *= 0.6; f.rz *= 0.6;
      }
      if (f.t > 3.5) { m.scale.multiplyScalar(Math.max(0, 1 - dt * 3)); if (f.t > 4.5) { m.visible = false; ex.flying.splice(i, 1); } }
    }
  }

  // ───────── GİZLİ PARÇALAR (serbest sürüş) ─────────
  const KOL_N = 10;
  function buildTokens(kol) {
    const r = R, T = r.T, rng = A.P().rng(4242 + kol.bolge * 97);
    const have = kol.have || [];
    const gm = new THREE.MeshStandardMaterial({ color: '#ffcc33', emissive: new THREE.Color('#ffaa00').multiplyScalar(1.6), metalness: 0.6, roughness: 0.3 });
    const gg = new THREE.OctahedronGeometry(0.7, 0);
    const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcc33').multiplyScalar(1.5), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const bg = new THREE.CylinderGeometry(0.5, 0.9, 40, 10, 1, true).translate(0, 20, 0);
    r.ex.disp.push(gm, gg, bm, bg);
    const spots = [];
    const scs = r.shortcuts || [];
    // 1) kestirmelerin ortası, 2) rampaların ardında havada, 3) yol kenarları
    for (const k of scs) spots.push({ sc: k, s: k.T.L * (0.35 + rng() * 0.3), d: (rng() - 0.5) * 4, up: 0.9 });
    for (const p of (r.ramps || []).filter(p => !p.sc)) spots.push({ sc: null, s: p.s0 + p.len + 14, d: p.d0, up: 3.4, hava: true });
    let guard = 0;
    while (spots.length < KOL_N && guard++ < 400) {
      const s = 200 + rng() * (T.L - 400);
      if (spots.some(q => !q.sc && Math.abs(q.s - s) < 350)) continue;
      const sg = rng() < 0.5 ? -1 : 1;
      spots.push({ sc: null, s, d: sg * (T.W / 2 - 1), up: 0.9 });
    }
    spots.slice(0, KOL_N).forEach((q, id) => {
      if (have.indexOf(id) >= 0) return;
      const Tk = q.sc ? q.sc.T : T;
      A.P().sample(Tk, q.s, q.d, o1);
      const g = new THREE.Group();
      const gem = new THREE.Mesh(gg, gm); gem.position.y = q.up; g.add(gem);
      const beam = new THREE.Mesh(bg, bm); g.add(beam);
      g.position.set(o1.x, o1.y, o1.z);
      add(g);
      r.ex.tokens.push({ id, sc: q.sc, s: q.s, d: q.d, up: q.up, hava: q.hava, g, gem, beam, y0: o1.y, alive: true });
    });
    r.ex.kolN = KOL_N; r.ex.kolHave = have.length;
  }
  function tokenHits() {
    const r = R, pl = r.player;
    for (const t of r.ex.tokens) {
      if (!t.alive || (pl.sc || null) !== t.sc) continue;
      let x = t.s - (t.sc ? pl.ss : pl.s);
      if (!t.sc && r.T.loop) { if (x > r.T.L / 2) x -= r.T.L; else if (x < -r.T.L / 2) x += r.T.L; }
      if (Math.abs(x) > 3.2 || Math.abs(t.d - pl.d) > 2.6) continue;
      const py = pl.wy != null ? pl.wy : t.y0;
      if (t.hava && py < t.y0 + 1.6) continue; // havadaki parça: rampadan uçarak alınır
      t.alive = false; t.g.visible = false;
      r.ex.kolHave++;
      A.SES().sfx('cp'); A.vib(40);
      A.popup('🧩 GİZLİ PARÇA', r.ex.kolHave + ' / ' + r.ex.kolN, 1.6, 'iyi');
      if (r.cfg.cb && r.cfg.cb.onCollect) r.cfg.cb.onCollect(t.id, r.ex.kolHave, r.ex.kolN);
    }
  }
  function tokenFrame(dt) {
    const r = R, t0 = r.t;
    for (const t of r.ex.tokens) {
      if (!t.alive) continue;
      const far = Math.abs(A.dsS(t)) ;
      t.g.visible = far < 700;
      if (!t.g.visible) continue;
      t.gem.rotation.y = t0 * 2.2; t.gem.position.y = t.up + Math.sin(t0 * 3 + t.id) * 0.18;
      t.beam.visible = far < 260; // gizli: ışık sütunu ancak yakındayken görünür
    }
    const el = r.hudEl && document.getElementById('hud-goal');
    if (el && r.cfg.koleksiyon) {
      A.setH(el, '🧩 Gizli parça ' + r.ex.kolHave + '/' + r.ex.kolN);
    }
  }

  // ───────── HAYALET ─────────
  function buildGhost(g) {
    if (!g) return;
    const m = A.A3().make(Object.assign({}, g.vis || {}, { neon: 0 }));
    const mats = [];
    m.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const src = Array.isArray(o.material) ? o.material : [o.material];
      const cl = src.map(s => { const c = s.clone(); c.userData = {}; c.transparent = true; c.opacity = 0.32; c.depthWrite = false; if (c.color) c.color.lerp(new THREE.Color('#7fd8ff'), 0.45); mats.push(c); return c; });
      o.material = Array.isArray(o.material) ? cl : cl[0];
      o.castShadow = false; o.receiveShadow = false; o.renderOrder = 3;
    });
    m.visible = false;
    R.scene.add(m);
    R.ex.ghost = { m, mats, g, t: -1 };
  }
  function beginRec() { const rc = R.ex.rec; if (!rc) return; rc.buf = []; rc.t = 0; rc.acc = 0; rc.on = true; R.ex.lapT0 = R.t; }
  function recFrame(dt) {
    const rc = R.ex.rec; if (!rc || !rc.on || R.phase !== 'yaris') return;
    rc.t += dt; rc.acc -= dt;
    if (rc.acc > 0) return;
    rc.acc = 0.1;
    const pl = R.player, m = pl.model;
    rc.buf.push(Math.round(m.position.x * 10), Math.round(m.position.y * 10), Math.round(m.position.z * 10), Math.round(m.rotation.y * 100), Math.round(pl.s * 10));
    if (rc.buf.length > 5 * 6000) rc.on = false; // 10 dakikadan uzun kaydetme
  }
  // oyuncu başlangıç çizgisini geçti: lap = yeni başlayan turun sırası (0 = ilk tur)
  function lap(c) {
    const r = R; if (!r || !r.ex || !c.isPlayer || !r.T.loop) return;
    const ex = r.ex;
    if (ex.lapT0 != null && c.lap >= 1) {
      const lt = r.t - ex.lapT0;
      ex.laps.push(lt);
      keepGhost(lt);
      const best = Math.min(...ex.laps);
      if (r.cfg.hayalet || ex.laps.length > 1) A.popup('TUR ' + fmtT(lt), lt <= best + 1e-6 && ex.laps.length > 1 ? 'en iyi tur' : '', 1.3, lt <= best + 1e-6 ? 'iyi' : '');
    }
    if (!r.finished) { beginRec(); if (ex.ghost) ex.ghost.t = 0; }
  }
  // en iyi süre ise hayaleti sakla
  function keepGhost(time) {
    const r = R, rc = r.ex.rec, id = r.cfg.pistId;
    if (!rc || !id || rc.buf.length < 50 || !rc.on) return false;
    const old = ghosts()[id];
    if (old && old.t <= time) return false;
    const vis = r.cfg.oyuncu && r.cfg.oyuncu.vis;
    GH[id] = { t: Math.round(time * 100) / 100, p: rc.buf.slice(), vis: vis ? JSON.parse(JSON.stringify(vis)) : null, ad: r.cfg.oyuncu && r.cfg.oyuncu.ad };
    saveGhosts();
    r.ex.newGhost = true;
    return true;
  }
  function ghostFrame(dt) {
    const gh = R.ex.ghost; if (!gh) return;
    if (!R.T.loop && R.phase === 'yaris' && gh.t < 0) gh.t = 0;
    if (gh.t < 0 || R.phase === 'geri') { gh.m.visible = false; return; }
    gh.t += dt * (R.slow || 1);
    const p = gh.g.p, n = p.length / 5, f = gh.t / 0.1, i = Math.floor(f);
    if (i >= n - 1) { gh.m.visible = false; return; }
    const u = f - i, a = i * 5, b = a + 5;
    let dh = p[b + 3] - p[a + 3]; while (dh > 314) dh -= 628; while (dh < -314) dh += 628;
    gh.m.position.set(lerp(p[a], p[b], u) / 10, lerp(p[a + 1], p[b + 1], u) / 10, lerp(p[a + 2], p[b + 2], u) / 10);
    gh.m.rotation.set(0, (p[a + 3] + dh * u) / 100, 0);
    const pp = R.player.model.position;
    const dx = pp.x - gh.m.position.x, dz = pp.z - gh.m.position.z;
    gh.m.visible = dx * dx + dz * dz > 9; // üst üste binince gizle (göz yormasın)
    // fark göstergesi
    const el = document.getElementById('hud-goal');
    if (el) {
      const ps = R.player.s, rc = R.ex.rec;
      // hayaletin oyuncunun bulunduğu noktadaki zamanı
      let lo = 0, hi = n - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (p[mid * 5 + 4] / 10 < ps) lo = mid + 1; else hi = mid; }
      if (rc && rc.on && lo > 0 && lo < n - 1) {
        const dlt = (rc.t) - lo * 0.1;
        const txt = '👻 ' + (dlt >= 0 ? '+' : '−') + Math.abs(dlt).toFixed(1) + ' sn';
        A.setH(el, txt); el.style.color = dlt > 0 ? '#ff6b81' : '#5dffa0';
      }
    }
  }
  function fmtT(t) { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }

  // ───────── kare / adım ─────────
  function step(dt) {
    if (!R || !R.ex) return;
    if (R.ex.props.length) propHits();
    if (R.ex.tokens.length) tokenHits();
    recFrame(dt);
  }
  function frame(dt) {
    if (!R || !R.ex) return;
    flyFrame(dt);
    if (R.ex.tokens.length) tokenFrame(dt);
    ghostFrame(dt);
    for (const c of R.racers) dmgFrame(c, dt);
    // uzak engelleri çizme
    R.ex.cull = (R.ex.cull || 0) - dt;
    if (R.ex.cull < 0) {
      R.ex.cull = 0.5;
      for (const p of R.ex.props) if (p.alive) p.m.visible = Math.abs(A.dsS(p)) < 320;
    }
  }
  // yarış bitti: sprintte tüm süre, döngüde tur süreleri
  function finish(res) {
    if (!R || !R.ex) return;
    const ex = R.ex;
    res.kirik = ex.kirik;
    res.hasar = Math.round((R.player.dmg || 0) * 100);
    if (ex.laps.length) res.turlar = ex.laps.slice();
    if (!R.T.loop && ex.rec && R.player.done && !res.yakalandi) { res.sprintT = ex.rec.t; keepGhost(ex.rec.t); }
    res.yeniHayalet = !!ex.newGhost;
  }

  G.EKSTRA = { start, stop, step, frame, lap, finish, dmg, ghostOf, ghosts, KOL_N, fmtT };
})(window);
