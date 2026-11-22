// Gece Kaçağı — gerçek varlıklar: Poly Haven (CC0) dokuları, gökyüzü fotoğrafları, sokak modelleri.
// Açılışta bir kez yüklenir. Yüklenemezse oyun eski (koddan üretilen) görünümle çalışmaya devam eder.
(function (G) {
  'use strict';
  const TEX = ['asfalt_diff', 'asfalt_nor_gl', 'asfalt_rough', 'kaldirim_diff', 'kaldirim_nor_gl', 'beton_diff', 'tugla_diff', 'tugla2_diff', 'siva_diff', 'siva2_diff', 'kaplama_diff', 'cephe_diff', 'kaya_diff', 'toprak_diff', 'cim_diff'];
  const SKY = ['gunduz', 'aksam', 'gece', 'kapali', 'dag'];
  const MODELS = ['metal_trash_can', 'utility_box_01', 'street_lamp_01', 'fire_hydrant', 'modular_street_seating'];  // gltfpack ile sadeleştirildi
  const A = { tex: {}, img: {}, sky: {}, model: {}, facade: [], ready: false };

  function loadImg(url) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('yüklenemedi: ' + url)); im.src = url; });
  }
  // gökyüzü fotoğrafında güneşi (en parlak bölge) ve ufuk rengini bul
  function analyzeSky(im) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 128, 64);
    const d = x.getImageData(0, 0, 128, 64).data;
    let best = -1, bu = 0, bv = 0;
    for (let v = 0; v < 30; v++) for (let u = 0; u < 128; u++) {
      const i = (v * 128 + u) * 4, l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      if (l > best) { best = l; bu = u; bv = v; }
    }
    // ufuk rengi: ufkun biraz üstü
    let r = 0, g = 0, b = 0, n = 0;
    for (let v = 26; v < 31; v++) for (let u = 0; u < 128; u++) { const i = (v * 128 + u) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const hz = [r / n / 255, g / n / 255, b / n / 255];
    let tr = 0, tg = 0, tb = 0; n = 0;
    for (let v = 2; v < 8; v++) for (let u = 0; u < 128; u++) { const i = (v * 128 + u) * 4; tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; n++; }
    const top = [tr / n / 255, tg / n / 255, tb / n / 255];
    // eşdikdörtgen → yön (three.js küre UV'si: u=0 → -x ... )
    const phi = (bu / 128) * Math.PI * 2, theta = (bv / 64) * Math.PI;
    const dir = [-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)];
    return { sun: dir, sunL: best / 255, hz, top };
  }

  // Gerçek duvar dokusundan pencereli cephe üret (12 m genişlik × 9 m yükseklik = 4 pencere × 3 kat)
  function makeFacade(wall, style) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    const e = document.createElement('canvas'); e.width = e.height = S;
    const y = e.getContext('2d');
    // duvar: gerçek doku iki kez döşenir
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) x.drawImage(wall, i * S / 2, j * S / 2, S / 2, S / 2);
    if (style.tint) { x.fillStyle = style.tint; x.globalAlpha = 0.35; x.fillRect(0, 0, S, S); x.globalAlpha = 1; }
    y.fillStyle = '#000'; y.fillRect(0, 0, S, S);
    const cols = 4, rows = 3, cw = S / cols, rh = S / rows;
    // kat silmeleri
    x.fillStyle = 'rgba(0,0,0,0.25)'; for (let j = 1; j < rows; j++) x.fillRect(0, j * rh - 3, S, 6);
    x.fillStyle = 'rgba(255,255,255,0.18)'; for (let j = 1; j < rows; j++) x.fillRect(0, j * rh - 6, S, 3);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const wx = i * cw + cw * style.mx, wy = j * rh + rh * 0.2, ww = cw * (1 - 2 * style.mx), wh = rh * style.h;
      // pencere çerçevesi
      x.fillStyle = style.frame; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
      // cam: gökyüzü yansıması gradyanı
      const gr = x.createLinearGradient(0, wy, 0, wy + wh);
      gr.addColorStop(0, '#9ab4c8'); gr.addColorStop(0.45, '#506a80'); gr.addColorStop(1, '#1c2630');
      x.fillStyle = gr; x.fillRect(wx, wy, ww, wh);
      // perde / içerisi
      const k = Math.random();
      if (k < 0.3) { x.fillStyle = ['rgba(230,220,200,0.55)', 'rgba(160,60,50,0.45)', 'rgba(220,210,150,0.5)'][Math.floor(Math.random() * 3)]; x.fillRect(wx, wy, ww, wh * (0.3 + Math.random() * 0.6)); }
      // yansıma çizgisi
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(wx + ww * 0.1, wy + wh); x.lineTo(wx + ww * 0.45, wy); x.lineTo(wx + ww * 0.6, wy); x.lineTo(wx + ww * 0.25, wy + wh); x.fill();
      // kayıt / kayıtlar
      x.fillStyle = style.frame; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      if (style.h > 0.5) x.fillRect(wx, wy + wh * 0.4, ww, 3);
      // denizlik
      x.fillStyle = 'rgba(220,220,215,0.9)'; x.fillRect(wx - 8, wy + wh + 5, ww + 16, 6);
      // gece ışığı
      if (Math.random() < 0.38) { const lc = ['#ffd890', '#ffe7b8', '#fff2d8', '#ffc070', '#d8ecff'][Math.floor(Math.random() * 5)]; y.fillStyle = lc; y.fillRect(wx, wy, ww, wh); }
    }
    return { c, e };
  }
  // zemin kat dükkân cephesi (12 m × 4.5 m)
  function makeShop(wall) {
    const S = 512, c = document.createElement('canvas'); c.width = S; c.height = 192;
    const x = c.getContext('2d'), e = document.createElement('canvas'); e.width = S; e.height = 192;
    const y = e.getContext('2d'); y.fillStyle = '#000'; y.fillRect(0, 0, S, 192);
    x.drawImage(wall, 0, 0, S / 2, 192); x.drawImage(wall, S / 2, 0, S / 2, 192);
    const aw = ['#b22234', '#1f5f8b', '#2e7d32', '#6d4c41', '#37474f', '#c77700'];
    for (let i = 0; i < 2; i++) {
      const sx = i * S / 2 + 16, sw = S / 2 - 32;
      x.fillStyle = '#222'; x.fillRect(sx - 4, 52, sw + 8, 136);
      const gr = x.createLinearGradient(0, 56, 0, 188); gr.addColorStop(0, '#5a7080'); gr.addColorStop(1, '#141c22');
      x.fillStyle = gr; x.fillRect(sx, 56, sw, 128);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(sx + sw * 0.15, 56, 12, 128);
      // tente
      x.fillStyle = aw[Math.floor(Math.random() * aw.length)]; x.fillRect(sx - 8, 30, sw + 16, 24);
      x.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < sw; k += 24) x.fillRect(sx + k, 30, 12, 24);
      // tabela
      x.fillStyle = '#111'; x.fillRect(sx + sw * 0.2, 4, sw * 0.6, 22);
      x.fillStyle = '#eee'; x.font = 'bold 16px sans-serif'; x.textAlign = 'center';
      const w = ['KAFE', 'BERBER', 'MARKET', 'OTO YEDEK', 'BÜFE', 'FIRIN', 'ECZANE', 'LOKANTA', 'ELEKTRONİK', 'ÇİÇEKÇİ'][Math.floor(Math.random() * 10)];
      x.fillText(w, sx + sw / 2, 21);
      y.fillStyle = ['#ffd890', '#fff0d0', '#c8e8ff'][Math.floor(Math.random() * 3)]; y.globalAlpha = 0.7; y.fillRect(sx, 56, sw, 128); y.globalAlpha = 1;
      y.fillStyle = '#ffffff'; y.fillRect(sx + sw * 0.2, 4, sw * 0.6, 22);
    }
    return { c, e };
  }

  // cam giydirme cephe (ofis kulesi): 12 m × 9 m modül, ince alüminyum kayıtlar
  function makeGlass(tone) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'), e = document.createElement('canvas'); e.width = e.height = S;
    const y = e.getContext('2d'); y.fillStyle = '#000'; y.fillRect(0, 0, S, S);
    const cols = 6, rows = 3, cw = S / cols, rh = S / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const g = x.createLinearGradient(0, j * rh, 0, j * rh + rh);
      const v = 0.85 + Math.random() * 0.3;
      g.addColorStop(0, tone[0]); g.addColorStop(1, tone[1]);
      x.globalAlpha = 1; x.fillStyle = g; x.fillRect(i * cw, j * rh, cw, rh);
      x.globalAlpha = 0.12 * v; x.fillStyle = '#fff'; x.fillRect(i * cw, j * rh, cw, rh * 0.25);
      if (Math.random() < 0.3) { y.fillStyle = ['#fff2d8', '#e8f0ff', '#ffe0a8'][Math.floor(Math.random() * 3)]; y.globalAlpha = 0.8; y.fillRect(i * cw + 3, j * rh + rh * 0.3, cw - 6, rh * 0.55); }
    }
    x.globalAlpha = 1; x.fillStyle = '#b8bcc4';
    for (let i = 0; i <= cols; i++) x.fillRect(i * cw - 2, 0, 4, S);
    for (let j = 0; j <= rows; j++) x.fillRect(0, j * rh - 4, S, 8);
    x.fillStyle = 'rgba(40,44,52,0.9)'; for (let j = 0; j < rows; j++) x.fillRect(0, j * rh + rh * 0.86, S, rh * 0.1);
    return { c, e };
  }
  // yaprak dokusu
  function makeLeaf() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#2f5a24'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const g = 60 + Math.random() * 90; x.fillStyle = `rgb(${Math.round(g * 0.45)},${Math.round(g)},${Math.round(g * 0.3)})`;
      x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 1 + Math.random() * 2.5, Math.random() * 3, 0, 7); x.fill();
    }
    for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
    return c;
  }

  // Araba modelini oyuna hazırla: tekerlekler ayrı, gövde malzemeye göre birleşik; boya/cam/ışık malzemeleri işaretli
  function prepCar(g) {
    const THREE = G.THREE;
    g.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g.scene);
    const off = new THREE.Matrix4().makeTranslation(0, -box.min.y, -(box.min.z + box.max.z) / 2);
    const groups = new Map(); // anahtar: grup|malzeme
    const wheelPos = {};
    const kindOf = (o, m) => {
      const n = (m && m.name) || '';
      if (/^Paint 1/.test(n)) return 'boya';
      if (/^Paint 2/.test(n) || n === 'Panel Sides') return 'boya2';
      if (n === 'Glass') return 'cam';
      if (n === 'Brakelight') return 'stop';
      if (n === 'Headlight') return 'far';
      if (n === 'Signallight') return 'sinyal';
      if (/^Rim/.test(n)) return 'jant';
      return 'orj';
    };
    g.scene.traverse(o => {
      if (/^Wheel(Front|Rear)[LR]$/.test(o.name)) { const v = new THREE.Vector3(); o.getWorldPosition(v); v.applyMatrix4(off); wheelPos[o.name] = v; }
    });
    g.scene.traverse(o => {
      if (!o.isMesh || /Pedal|Engine|Axles/.test(o.name)) return;
      let w = null, p = o;
      while (p) { if (/^Wheel(Front|Rear)[LR]$/.test(p.name)) { w = p.name; break; } p = p.parent; }
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld); geo.applyMatrix4(off);
      if (w) geo.translate(-wheelPos[w].x, -wheelPos[w].y, -wheelPos[w].z);
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      const kind = kindOf(o, o.material);
      const key = (w || 'govde') + '|' + (kind === 'orj' ? o.material.uuid : kind);
      if (!groups.has(key)) groups.set(key, { w, kind, mat: o.material, geos: [] });
      groups.get(key).geos.push(geo);
    });
    const merge = list => {
      const pos = [], nor = [], uv = [], idx = [];
      for (const gg of list) {
        const base = pos.length / 3, P = gg.attributes.position, N = gg.attributes.normal, U = gg.attributes.uv;
        for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); if (N) nor.push(N.getX(i), N.getY(i), N.getZ(i)); else nor.push(0, 1, 0); uv.push(U.getX(i), U.getY(i)); }
        if (gg.index) for (let i = 0; i < gg.index.count; i++) idx.push(base + gg.index.getX(i)); else for (let i = 0; i < P.count; i++) idx.push(base + i);
        gg.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      out.setIndex(idx); out.userData.varlik = 1; out.computeBoundingSphere();
      return out;
    };
    const parts = [];
    for (const v of groups.values()) {
      const m = v.mat;
      if (v.kind === 'orj') {
        // kırılma (transmission) pahalı: kapat; ortak malzeme silinmesin
        if (m.transmission) m.transmission = 0;
        m.userData.varlik = 1; for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m[k]) m[k].userData.varlik = 1;
      }
      parts.push({ w: v.w, kind: v.kind, mat: m, geo: merge(v.geos) });
    }
    const size = new THREE.Vector3(); box.getSize(size);
    return { parts, wheelPos, L: size.z, W: 2.0, r: wheelPos.WheelFrontL ? wheelPos.WheelFrontL.y : 0.5 };
  }

  // ── Gerçek araba modelleri (DanielZhabotinsky, CC BY 4.0; rozetler/plakalar çıkarıldı, polis kaplaması değiştirildi) ──
  // varlik-indir/araba_cevir.py ile hazırlanır: her ağın extras'ında tür + doku adları; dokular model/araba/dok/ altında ortak.
  const ARABALAR = ['serce', 'pusula', 'kumru', 'ruzgar', 'sahin', 'bozkurt', 'atmaca', 'volta', 'karakurt', 'yildirim', 'volkan', 'gecekusu',
    'firtina', 'kuzgun', 'kobra', 'polis', 'polisgt', 'polissuv', 'polissuper', 't_sedan1', 't_sedan2', 't_hatch2', 'taksi', 'van', 'kamyon'];
  const TAKMA = { ejder: 'konsept', hayalet: 'konsept' };
  const CARS = {}, DOK = {};
  let carCb = null, onceki = Promise.resolve();
  function dok(n, srgb) {
    if (!n) return null;
    const k = n + (srgb ? '|s' : '');
    if (DOK[k]) return DOK[k];
    const THREE = G.THREE, t = new THREE.TextureLoader().load('model/araba/dok/' + n);
    t.flipY = false; if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.userData.varlik = 1;
    return (DOK[k] = t);
  }
  const TEKER = { FL: 'WheelFrontL', FR: 'WheelFrontR', RL: 'WheelRearL', RR: 'WheelRearR' };
  function prepCar2(g) {
    const THREE = G.THREE, ex = g.parser.json.extras || {};
    const wheelPos = {};
    for (const k in ex.teker || {}) { const v = ex.teker[k]; wheelPos[TEKER[k]] = new THREE.Vector3(v[0], v[1], v[2]); }
    const parts = []; let ao = null;
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const e = o.userData || {}, geo = o.geometry;
      if (e.base) dok(e.base, true); if (e.orm) dok(e.orm, false);  // dokuları şimdiden indir
      geo.userData.varlik = 1;
      if (!geo.attributes.uv2 && geo.attributes.uv) geo.setAttribute('uv2', geo.attributes.uv);
      if (o.material) o.material.dispose();
      let kind = e.tur;
      if (kind === 'boya' && e.base) kind = 'orj';            // kaplamalı gövde (polis, taksi): kendi dokusu
      else if (kind === 'boya') { if (e.orm) ao = e.orm; }
      else if (!['cam', 'far', 'sinyal', 'stop', 'sirenK', 'sirenM', 'plaka'].includes(kind)) kind = 'orj';
      parts.push({ w: e.teker ? TEKER[e.teker] : null, kind, ex: e, geo });
    });
    const b = ex.boy || [2, 1.4, 4.5];
    return { parts, wheelPos, L: b[2], W: b[0], ao: ao ? dok(ao, false) : null, dok, yeni: true };
  }
  // id'nin modeli hazırsa döndürür; değilse yüklemeyi başlatır ve null döner (o arada eski çizim kullanılır)
  function car(id) {
    id = TAKMA[id] || id;
    if (id === 'konsept') return A.car || null;
    if (!ARABALAR.includes(id) || !G.GLTFLoader) return null;
    const c = CARS[id];
    if (c && c.C) return c.C;
    if (!c) loadCar(id);
    return null;
  }
  function loadCar(id) {
    if (CARS[id]) return CARS[id].p;
    const c = CARS[id] = {};
    // sırayla yükle: telefonu aynı anda onlarca dosyayla boğma
    c.p = onceki = onceki.then(() => new Promise(res => {
      new G.GLTFLoader().load('model/araba/' + id + '.glb', g => {
        try { c.C = prepCar2(g); } catch (e) { console.warn('araba hazırlanamadı', id, e); }
        res(); if (c.C && carCb) try { carCb(id); } catch (e) { }
      }, undefined, e => { console.warn('araba yüklenemedi', id, e); res(); });
    }));
    return c.p;
  }
  function preloadCars(first) {
    for (const id of first || []) car(id);
    for (const id of ARABALAR) car(id);
  }

  async function load(progress) {
    const THREE = G.THREE;
    const tl = new THREE.TextureLoader();
    let done = 0, total = TEX.length + SKY.length + MODELS.length;
    const step = () => { done++; if (progress) progress(done / total); };
    const jobs = [];
    for (const t of TEX) jobs.push(loadImg('tex/' + t + '.jpg').then(im => { A.img[t] = im; step(); }));
    for (const s of SKY) jobs.push(loadImg('sky/' + s + '.jpg').then(im => { A.img['sky_' + s] = im; A.sky[s] = Object.assign({ name: s }, analyzeSky(im)); step(); }));
    if (G.GLTFLoader) {
      const gl = new G.GLTFLoader();
      for (const m of MODELS) jobs.push(new Promise(res => {
        gl.load('model/' + m + '/' + m + '.gltf', g => {
          const parts = [];
          g.scene.updateMatrixWorld(true);
          g.scene.traverse(o => { if (o.isMesh) { const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.userData.varlik = 1; o.material.userData.varlik = 1; if (o.material.map) o.material.map.userData.varlik = 1; parts.push({ geo, mat: o.material }); } });
          const box = new THREE.Box3().setFromObject(g.scene);
          A.model[m] = { parts, box };
          step(); res();
        }, undefined, e => { console.warn('model yüklenemedi', m, e); step(); res(); });
      }));
    }
    // gerçek araba modeli (Khronos CarConcept, CC-BY 4.0, Eric Chadwick / DGG; logolar çıkarıldı, sadeleştirildi)
    if (G.GLTFLoader) jobs.push(new Promise(res => {
      new G.GLTFLoader().load('model/araba/konsept.glb', g => { try { A.car = prepCar(g); } catch (e) { console.warn('araba modeli hazırlanamadı', e); } res(); }, undefined, e => { console.warn('araba modeli yüklenemedi', e); res(); });
    }));
    await Promise.all(jobs);
    // dokular (her biri kendi tekrar ayarıyla kopyalanabilir)
    const mk = (im, srgb) => { const t = new THREE.Texture(im); t.userData.varlik = 1; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; return t; };
    // asfalt: gri tonlama + hafif koyulaştırma (sıcak ışıkta kahverengi görünmesin)
    { const im = A.img.asfalt_diff, c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) * 0.92; a[i] = l; a[i + 1] = l; a[i + 2] = l * 1.03; }
      x.putImageData(d, 0, 0); A.img.asfalt_diff = c; }
    for (const t of TEX) A.tex[t] = mk(A.img[t], !/nor|rough/.test(t));
    for (const s of SKY) { const t = mk(A.img['sky_' + s], true); t.wrapT = THREE.ClampToEdgeWrapping; A.sky[s].tex = t; }
    // cepheler: 6 farklı tarz
    const styles = [
      ['tugla_diff', { frame: '#e8e4dc', mx: 0.2, h: 0.6 }], ['siva_diff', { frame: '#5a4a3a', mx: 0.22, h: 0.55 }],
      ['siva2_diff', { frame: '#f2f2f2', mx: 0.18, h: 0.6, tint: '#e0b080' }], ['kaplama_diff', { frame: '#2a2a2e', mx: 0.08, h: 0.7 }],
      ['cephe_diff', { frame: '#1a1c20', mx: 0.06, h: 0.72 }], ['tugla2_diff', { frame: '#f0ece0', mx: 0.24, h: 0.52 }],
      ['beton_diff', { frame: '#3a3c40', mx: 0.12, h: 0.62 }],
    ];
    for (const [w, st] of styles) {
      const f = makeFacade(A.img[w], st), sh = makeShop(A.img[w]);
      const ct = new THREE.CanvasTexture(f.c), et = new THREE.CanvasTexture(f.e), cs = new THREE.CanvasTexture(sh.c), es = new THREE.CanvasTexture(sh.e);
      for (const t of [ct, et, cs, es]) { t.userData.varlik = 1; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; }
      A.facade.push({ map: ct, emi: et, shop: cs, shopEmi: es, wall: A.tex[w] });
    }
    A.glass = [['#5a7e98', '#1c2c3c'], ['#6a8a80', '#1c2e2c'], ['#7a8090', '#262a34'], ['#4a6a8a', '#101a28']].map(t => {
      const g = makeGlass(t), m = new THREE.CanvasTexture(g.c), e = new THREE.CanvasTexture(g.e);
      for (const k of [m, e]) { k.userData.varlik = 1; k.wrapS = k.wrapT = THREE.RepeatWrapping; k.anisotropy = 4; k.encoding = THREE.sRGBEncoding; }
      return { map: m, emi: e };
    });
    const lf = new THREE.CanvasTexture(makeLeaf()); lf.userData.varlik = 1; lf.wrapS = lf.wrapT = THREE.RepeatWrapping; lf.encoding = THREE.sRGBEncoding;
    A.leaf = lf;
    A.ready = true;
    return A;
  }
  function tex(name, rx, ry) {
    const t0 = A.tex[name]; if (!t0) return null;
    const t = t0.clone(); t.userData = { varlik: 1 }; t.needsUpdate = true; t.repeat.set(rx || 1, ry || 1); return t;
  }
  G.VARLIK = { load, tex, A, car, loadCar, preloadCars, ARABALAR, get ready() { return A.ready; }, set onCar(f) { carCb = f; } };
})(window);
