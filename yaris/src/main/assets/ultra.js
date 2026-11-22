// Gece Kaçağı v11 — görsel ekler: gerçek far ışığı + huzme, polis çakar ışığı, lastik izleri, hız rüzgârı çizgileri
// yaris.js: start sonunda ULTRA.start(R, api), stepRace'te ULTRA.frame(dt), stopRace'te ULTRA.stop()
(function (G) {
  'use strict';
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  let R = null, A = null, THREE = null;
  const v1 = { x: 0, y: 0, z: 0 };

  function start(r, api) {
    stop();
    R = r; A = api; THREE = api.THREE;
    const q = api.Q(), night = r.world.isNight || r.cfg.saat === 'aksam';
    const u = r.ux = { objs: [], disp: [], q, night };
    const add = o => { r.scene.add(o); u.objs.push(o); return o; };
    const pl = r.player, m = pl.model;
    // ── farlar: gece/akşam gerçek spot ışık (yolu aydınlatır) + hacimsel huzme ──
    if (q >= 2) {
      const sp = new THREE.SpotLight(0xfff1d6, night ? (r.cfg.saat === 'gece' ? 24 : 10) : 0, 85, 0.5, 0.6, 1.2);
      sp.position.set(0, 0.8, pl.L * 0.45); sp.target.position.set(0, -0.6, pl.L * 0.45 + 20);
      m.add(sp); m.add(sp.target); u.head = sp;
      // polis çakarı: en yakın aktif polisi izleyen nokta ışık (renk sırayla kırmızı/mavi)
      u.siren = new THREE.PointLight(0xff2030, 0, 28, 1.6); add(u.siren);
    }
    if (night && q >= 1) {
      // huzme: içi boş koni, katkılı karışım, uca doğru sönen doku
      const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.15, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); // uç (araba) parlak, uzak sönük
      x.fillStyle = g; x.fillRect(0, 0, 4, 64);
      const t = new THREE.CanvasTexture(c); u.disp.push(t);
      const cg = new THREE.ConeGeometry(2.4, 16, 20, 1, true); cg.translate(0, -8, 0); cg.rotateX(-Math.PI / 2); u.disp.push(cg);
      const cm = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0xfff0d0).multiplyScalar(0.28), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
      u.disp.push(cm);
      u.beams = [];
      for (const c2 of r.racers) {
        const mm = c2.model; if (!mm) continue;
        for (const sx of [-0.55, 0.55]) {
          const b = new THREE.Mesh(cg, cm); b.position.set(sx * c2.W * 0.75, 0.75, c2.L * 0.48); b.rotation.x = 0.05; b.renderOrder = 4;
          mm.add(b); u.beams.push(b);
        }
      }
    }
    // ── lastik izleri: halka tampon (en eski iz siliniyor) ──
    const N = q >= 3 ? 900 : q >= 2 ? 600 : q >= 1 ? 300 : 0;
    if (N) {
      const sg = new THREE.PlaneGeometry(0.26, 1); sg.rotateX(-Math.PI / 2); u.disp.push(sg);
      const sm = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: r.wet ? 0.18 : 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
      u.disp.push(sm);
      const im = new THREE.InstancedMesh(sg, sm, N); im.frustumCulled = false; im.count = 0; im.renderOrder = 2;
      add(im); u.skid = { im, n: N, i: 0, last: [null, null], t: 0 };
    }
    // ── v12: yağmurda yola düşen damla halkaları ──
    if (r.wet && q >= 1) {
      const rg = new THREE.RingGeometry(0.6, 0.85, 14); rg.rotateX(-Math.PI / 2); u.disp.push(rg);
      u.drops = [];
      for (let i = 0; i < (q >= 3 ? 70 : 40); i++) {
        const mt = new THREE.MeshBasicMaterial({ color: 0xc8dcff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        u.disp.push(mt); const m2 = new THREE.Mesh(rg, mt); m2.visible = false; add(m2); u.drops.push({ m: m2, life: Math.random() * 0.4 });
      }
    }
    // ── hız rüzgârı çizgileri (kameranın çevresinde, hızla geriye akar) ──
    if (q >= 1) {
      const M = q >= 3 ? 70 : 40, pos = new Float32Array(M * 6);
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const lm = new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const ls = new THREE.LineSegments(lg, lm); ls.frustumCulled = false; add(ls); u.disp.push(lg, lm);
      u.wind = { ls, pos, M, p: [] };
      for (let i = 0; i < M; i++) u.wind.p.push({ x: 0, y: 0, z: 0, life: 0 });
    }
  }
  function stop() {
    if (!R || !R.ux) { R = null; return; }
    const u = R.ux;
    for (const o of u.objs) R.scene.remove(o);
    if (u.head) { u.head.parent && u.head.parent.remove(u.head.target); u.head.parent && u.head.parent.remove(u.head); }
    if (u.beams) for (const b of u.beams) b.parent && b.parent.remove(b);
    for (const d of u.disp) try { d.dispose(); } catch (e) { }
    R = null;
  }

  const m4 = () => (G.__m4 || (G.__m4 = new THREE.Matrix4()));
  const _q = () => (G.__q4 || (G.__q4 = new THREE.Quaternion()));
  function skidFrame(dt) {
    const u = R.ux, sk = u.skid; if (!sk) return;
    const pl = R.player, ws = pl.model.userData.wheels || [];
    const hard = pl.air <= 0 && Math.abs(pl.v) > 6 && (Math.abs(pl.slip || 0) > 0.1 || (A.input.brake && pl.v > 14) || (pl.launchSpin > 0) || Math.abs(pl.a) > 0.35);
    sk.t -= dt;
    if (sk.t > 0) return;
    sk.t = 0.04;
    const rear = ws.filter(w => !w.userData.front);
    if (!hard || rear.length < 2) { sk.last = [null, null]; return; }
    const V = new THREE.Vector3(), M = m4(), Qn = _q(), up = new THREE.Vector3(0, 1, 0);
    rear.slice(0, 2).forEach((w, k) => {
      w.getWorldPosition(V);
      const y = (pl.wy != null ? pl.wy : V.y - 0.3) + 0.03;
      const cur = { x: V.x, z: V.z, y };
      const lp = sk.last[k];
      if (lp) {
        const dx = cur.x - lp.x, dz = cur.z - lp.z, L = Math.hypot(dx, dz);
        if (L > 0.05 && L < 6) {
          Qn.setFromAxisAngle(up, Math.atan2(dx, dz));
          M.compose(new THREE.Vector3((cur.x + lp.x) / 2, (cur.y + lp.y) / 2, (cur.z + lp.z) / 2), Qn, new THREE.Vector3(1, 1, L));
          sk.im.setMatrixAt(sk.i, M); sk.i = (sk.i + 1) % sk.n; sk.im.count = Math.max(sk.im.count, sk.i === 0 ? sk.n : sk.i);
          sk.im.instanceMatrix.needsUpdate = true;
        }
      }
      sk.last[k] = cur;
    });
  }
  function windFrame(dt) {
    const w = R.ux.wind; if (!w) return;
    const pl = R.player, cam = A.camera();
    const k = clamp((pl.v - 38) / 30, 0, 1) * 0.7 + (pl.nitroOn ? 0.35 : 0) + (pl.draft || 0) * 0.5;
    w.ls.material.opacity = clamp(k, 0, 0.75) * 0.5;
    if (k <= 0.02) { w.ls.visible = false; return; }
    w.ls.visible = true;
    const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), upv = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const sp = pl.v * 1.4 + 20;
    for (let i = 0; i < w.M; i++) {
      const p = w.p[i];
      p.life -= dt;
      if (p.life <= 0) {
        const ang = Math.random() * Math.PI * 2, rad = 2.5 + Math.random() * 5, dist = 14 + Math.random() * 22;
        p.x = cam.position.x + fw.x * dist + rt.x * Math.cos(ang) * rad + upv.x * Math.sin(ang) * rad * 0.6;
        p.y = cam.position.y + fw.y * dist + rt.y * Math.cos(ang) * rad + upv.y * Math.sin(ang) * rad * 0.6;
        p.z = cam.position.z + fw.z * dist + rt.z * Math.cos(ang) * rad + upv.z * Math.sin(ang) * rad * 0.6;
        p.life = 0.3 + Math.random() * 0.3;
      }
      p.x -= fw.x * sp * dt; p.y -= fw.y * sp * dt; p.z -= fw.z * sp * dt;
      const L = 1.2 + pl.v * 0.05, j = i * 6;
      w.pos[j] = p.x; w.pos[j + 1] = p.y; w.pos[j + 2] = p.z;
      w.pos[j + 3] = p.x - fw.x * L; w.pos[j + 4] = p.y - fw.y * L; w.pos[j + 5] = p.z - fw.z * L;
    }
    w.ls.geometry.attributes.position.needsUpdate = true;
  }
  function sirenFrame() {
    const s = R.ux.siren; if (!s) return;
    let best = null, bd = 140;
    for (const c of R.cops) { if (c.disabled || !c.model.visible) continue; const d = Math.abs(A.ds(R.player, c)); if (d < bd) { bd = d; best = c; } }
    if (!best || !R.purs) { s.intensity = 0; return; }
    const ph = Math.floor(R.t * 8) % 4;
    s.color.setHex(ph < 2 ? 0xff2030 : 0x2a5cff);
    s.intensity = (R.ux.night ? 9 : 3) * (ph % 2 ? 0.6 : 1);
    best.model.getWorldPosition(s.position); s.position.y += 2.2;
  }
  const _o = {};
  function dropFrame(dt) {
    const ds = R.ux.drops; if (!ds) return;
    const pl = R.player, T = pl.sc ? pl.sc.T : R.T, sl = pl.sc ? pl.ss : pl.s;
    for (const d of ds) {
      d.life -= dt;
      if (d.life <= 0) {
        A.P().sample(T, sl + 2 + Math.random() * 45, (Math.random() - 0.5) * (T.W - 0.6), _o);
        d.m.position.set(_o.x, _o.y + 0.04, _o.z); d.life = d.max = 0.28 + Math.random() * 0.2; d.m.visible = true;
      }
      const k = 1 - d.life / d.max;
      d.m.scale.setScalar(0.15 + k * 0.35); d.m.material.opacity = (1 - k) * 0.55;
    }
  }
  function frame(dt) {
    if (!R || !R.ux) return;
    skidFrame(dt); windFrame(dt); sirenFrame(); dropFrame(dt);
    if (R.ux.head) R.ux.head.visible = R.player.model.visible;
  }
  G.ULTRA = { start, stop, frame };
})(window);
