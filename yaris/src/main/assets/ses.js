// Gece Kaçağı — ses: motor, lastik, siren, efektler ve koddan üretilen müzik (WebAudio, hiç ses dosyası yok)
// v15: baştan yazıldı — silindir vuruşlu motor (harmonik dalga + emme gürültüsü + turbo + egzoz patlaması),
// yankı (konvolüsyon), çok parçalı müzik (melodi üretici, davul geçişleri, filtre açılması, pad nefesi).
(function (G) {
  'use strict';
  let ctx = null, master, sfxG, musG, revIn, noiseBuf, duck;
  let vol = { sfx: 0.8, mus: 0.5 };
  const MUSK = 1.6; // v15: müzik eskiden motorun altında kayboluyordu (0,6 → 1,6)
  let eng = null, skidN = null, sirenN = null;
  let musMode = null, musTimer = 0, nextT = 0, step = 0, bar = 0, song = null;

  function ok() { return !!ctx && ctx.state !== 'closed'; }
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ctx.destination);
      // yankı: üretilmiş darbe yanıtı (2,2 sn, stereo)
      const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      const conv = ctx.createConvolver(); conv.buffer = ir;
      revIn = ctx.createGain(); revIn.gain.value = 1; const revOut = ctx.createGain(); revOut.gain.value = 0.32;
      revIn.connect(conv); conv.connect(revOut); revOut.connect(master);
      sfxG = ctx.createGain(); sfxG.gain.value = vol.sfx; sfxG.connect(master);
      musG = ctx.createGain(); musG.gain.value = vol.mus * MUSK; musG.connect(master);
      duck = ctx.createGain(); duck.gain.value = 1; duck.connect(musG); // pad/bas "nefes" (bas davulda kısılır)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (musMode) { const m = musMode; musMode = null; music(m); }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function setVol(s, m) {
    vol.sfx = Number.isFinite(s) ? s : 0.8; vol.mus = Number.isFinite(m) ? m : 0.5;
    if (ok()) { sfxG.gain.value = vol.sfx; musG.gain.value = vol.mus * MUSK; }
  }
  function noise(loop) { const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = !!loop; if (loop) n.loopStart = Math.random(); return n; }
  function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  function pan(node, p) { if (!ctx.createStereoPanner) return node; const s = ctx.createStereoPanner(); s.pan.value = p; node.connect(s); return s; }

  // ───────── MOTOR ─────────
  // Silindir vuruşları: düşük harmonikleri güçlü, tek-çift dengesiz bir dalga (V8 homurtusu)
  function engWave() {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (k === 1 ? 1 : k === 2 ? 0.75 : k === 4 ? 0.55 : k === 3 ? 0.35 : 0.5 / Math.pow(k, 0.9)) * (k % 2 ? 1 : 1.15);
    return ctx.createPeriodicWave(re, im);
  }
  function engine(rpm, thr, nitro, speed) {
    if (!ok() || vol.sfx <= 0) return;
    const t = ctx.currentTime;
    if (!eng) {
      const wave = engWave();
      const o1 = ctx.createOscillator(); o1.setPeriodicWave(wave);
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth';           // üst ton (emme)
      const sub = ctx.createOscillator(); sub.type = 'sine';             // gövde
      // genlik titreşimi: silindir ateşlemeleri (homurtu)
      const am = ctx.createOscillator(); am.type = 'square'; const amG = ctx.createGain(); amG.gain.value = 0.25;
      const body = ctx.createGain(); body.gain.value = 0.75; am.connect(amG); amG.connect(body.gain);
      const ws = ctx.createWaveShaper(); const c = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; c[i] = Math.tanh(x * 3) * 0.9; } ws.curve = c; ws.oversample = '2x';
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2;
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 180; pk.gain.value = 6; pk.Q.value = 1;
      const g2 = ctx.createGain(); g2.gain.value = 0.18;
      const sg = ctx.createGain(); sg.gain.value = 0.5;
      o1.connect(body); o2.connect(g2); g2.connect(body); sub.connect(sg); sg.connect(lp);
      body.connect(ws); ws.connect(pk); pk.connect(lp);
      const g = ctx.createGain(); g.gain.value = 0; lp.connect(g); g.connect(sfxG);
      const rv = ctx.createGain(); rv.gain.value = 0.06; g.connect(rv); rv.connect(revIn);
      // emme gürültüsü (gaz açıkken hırıltı)
      const ni = noise(true), nbp = ctx.createBiquadFilter(); nbp.type = 'bandpass'; nbp.Q.value = 1.2;
      const nig = ctx.createGain(); nig.gain.value = 0; ni.connect(nbp); nbp.connect(nig); nig.connect(sfxG);
      // turbo ıslığı
      const tu = ctx.createOscillator(); tu.type = 'sine'; const tug = ctx.createGain(); tug.gain.value = 0; tu.connect(tug); tug.connect(sfxG);
      // nitro tıslaması
      const n = noise(true), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
      const ng = ctx.createGain(); ng.gain.value = 0; n.connect(bp); bp.connect(ng); ng.connect(sfxG);
      // rüzgâr
      const w = noise(true), wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 500;
      const wg = ctx.createGain(); wg.gain.value = 0; w.connect(wl); wl.connect(wg); wg.connect(sfxG);
      for (const o of [o1, o2, sub, am, ni, tu, n, w]) o.start();
      eng = { o1, o2, sub, am, lp, g, nig, nbp, tu, tug, ng, wg, wl, lastThr: 0, lastRpm: 0, boost: 0, popT: 0 };
    }
    const e = eng;
    const f = 34 + rpm * 118;                          // ateşleme frekansı
    e.o1.frequency.setTargetAtTime(f, t, 0.025);
    e.o2.frequency.setTargetAtTime(f * 2.01, t, 0.025);
    e.sub.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    e.am.frequency.setTargetAtTime(f * 0.25, t, 0.03);
    e.lp.frequency.setTargetAtTime(260 + rpm * 1500 + thr * 1300, t, 0.05);
    e.g.gain.setTargetAtTime(0.1 + thr * 0.1 + rpm * 0.05, t, 0.04);
    e.nbp.frequency.setTargetAtTime(500 + rpm * 1800, t, 0.05);
    e.nig.gain.setTargetAtTime(thr * (0.02 + rpm * 0.05), t, 0.05);
    // turbo: gazda basınç birikir, ıslık yükselir; gaz bırakılınca "pıssst"
    e.boost += ((thr ? Math.min(1, rpm * 1.3) : 0) - e.boost) * (thr ? 0.04 : 0.25);
    e.tu.frequency.setTargetAtTime(1800 + e.boost * 4200, t, 0.08);
    e.tug.gain.setTargetAtTime(e.boost * 0.016, t, 0.08);
    if (e.lastThr && !thr && e.lastRpm > 0.5) {
      blowOff(t, e.lastRpm);
      e.popT = 0.5 + e.lastRpm * 0.6; // ardından egzoz patlamaları
    }
    if (e.popT > 0) { e.popT -= 0.016; if (!thr && Math.random() < 0.08 + e.popT * 0.1) pop(t + Math.random() * 0.03); }
    e.ng.gain.setTargetAtTime(nitro ? 0.13 : 0, t, 0.08);
    e.wg.gain.setTargetAtTime((speed || 0) * 0.13, t, 0.2);
    e.wl.frequency.setTargetAtTime(300 + (speed || 0) * 1500, t, 0.2);
    e.lastThr = thr; e.lastRpm = rpm;
  }
  function blowOff(t, k) {
    const n = noise(), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(3800, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.35); f.Q.value = 1.5;
    const g = ctx.createGain(); env(g, t, 0.01, 0.09 * k, 0.35); n.connect(f); f.connect(g); g.connect(sfxG); n.start(t); n.stop(t + 0.45);
  }
  function pop(t) { // egzoz patlaması
    const n = noise(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900 + Math.random() * 900;
    const g = ctx.createGain(); env(g, t, 0.002, 0.22 + Math.random() * 0.2, 0.06); n.connect(f); f.connect(g); g.connect(sfxG);
    const rv = ctx.createGain(); rv.gain.value = 0.35; g.connect(rv); rv.connect(revIn); n.start(t); n.stop(t + 0.1);
  }
  function stopEngine() {
    if (!eng) return;
    const t = ctx.currentTime, e = eng; eng = null;
    for (const gn of [e.g, e.ng, e.wg, e.nig, e.tug]) gn.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => { for (const o of [e.o1, e.o2, e.sub, e.am, e.tu]) try { o.stop(); } catch (x) { } }, 400);
  }
  function skid(level) {
    if (!ok()) return;
    if (!skidN) {
      // iki bantlı lastik cıyağı + yavaş titreşim (gerçek lastik sesi sabit değildir)
      const n = noise(true), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 6;
      const n2 = noise(true), bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2600; bp2.Q.value = 9;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(bp.frequency);
      const g = ctx.createGain(); g.gain.value = 0; n.connect(bp); n2.connect(bp2); bp.connect(g); bp2.connect(g); g.connect(sfxG);
      n.start(); n2.start(); lfo.start();
      skidN = { g, bp, bp2 };
    }
    skidN.g.gain.setTargetAtTime(level * 0.2, ctx.currentTime, 0.06);
    skidN.bp.frequency.setTargetAtTime(1000 + level * 700, ctx.currentTime, 0.1);
    skidN.bp2.frequency.setTargetAtTime(2200 + level * 900, ctx.currentTime, 0.1);
  }
  function siren(level) {
    if (!ok()) return;
    if (!sirenN) {
      if (level <= 0) return;
      const o = ctx.createOscillator(); o.type = 'square';
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.42;
      const lg = ctx.createGain(); lg.gain.value = 360; lfo.connect(lg); lg.connect(o.frequency); o.frequency.value = 940;
      const o2 = ctx.createOscillator(); o2.type = 'square';
      const lfo2 = ctx.createOscillator(); lfo2.type = 'triangle'; lfo2.frequency.value = 3.4;
      const lg2 = ctx.createGain(); lg2.gain.value = 300; lfo2.connect(lg2); lg2.connect(o2.frequency); o2.frequency.value = 900;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; // hoparlör kornası rengi
      const g = ctx.createGain(); g.gain.value = 0;
      const g2 = ctx.createGain(); g2.gain.value = 0;
      o.connect(g); o2.connect(g2); g.connect(f); g2.connect(f); f.connect(sfxG);
      const rv = ctx.createGain(); rv.gain.value = 0.5; f.connect(rv); rv.connect(revIn);
      o.start(); lfo.start(); o2.start(); lfo2.start();
      sirenN = { g, g2, f, mix: 0 };
    }
    const t = ctx.currentTime;
    sirenN.mix += 0.0025; const yelp = Math.sin(sirenN.mix) > 0.55;
    sirenN.g.gain.setTargetAtTime(level * (yelp ? 0 : 0.035), t, 0.1);
    sirenN.g2.gain.setTargetAtTime(level * (yelp ? 0.035 : 0), t, 0.1);
    sirenN.f.frequency.setTargetAtTime(900 + level * 2200, t, 0.15); // uzaktan boğuk, yakında parlak
  }

  // ───────── EFEKTLER ─────────
  function tone(f, dur, type, gain, t0, slide, rev) {
    const t = (t0 || ctx.currentTime);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    env(g, t, 0.005, gain || 0.2, dur);
    o.connect(g); g.connect(sfxG); if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(revIn); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(dur, freq, type, gain, t0, q, rev) {
    const t = t0 || ctx.currentTime;
    const n = noise(), f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 800; if (q) f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.004, gain || 0.3, dur);
    n.connect(f); f.connect(g); g.connect(sfxG); if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(revIn); }
    n.start(t); n.stop(t + dur + 0.05);
    return f;
  }
  function metal(t, k) { // metal çarpma tınısı: uyumsuz kısmi tonlar
    for (const m of [1, 2.76, 5.4, 8.93]) tone(220 * m * (0.9 + Math.random() * 0.2), 0.25 + Math.random() * 0.2, 'triangle', 0.05 * k / Math.sqrt(m), t, null, 0.4);
  }
  function glass(t, k) { for (let i = 0; i < 6; i++) tone(2500 + Math.random() * 3500, 0.08 + Math.random() * 0.15, 'sine', 0.04 * k, t + Math.random() * 0.12, null, 0.5); }
  function sfx(name, k) {
    if (!ok() || vol.sfx <= 0) return;
    const t = ctx.currentTime; k = k == null ? 1 : k;
    switch (name) {
      case 'click': tone(1200, 0.035, 'triangle', 0.07); tone(1800, 0.03, 'sine', 0.04, t + 0.015); break;
      case 'tab': tone(700, 0.05, 'triangle', 0.08); tone(1050, 0.06, 'triangle', 0.06, t + 0.035); break;
      case 'buy': [880, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, t + i * 0.06, null, 0.3)); burst(0.15, 6000, 'highpass', 0.05, t + 0.2); break;
      case 'deny': tone(233, 0.14, 'square', 0.07); tone(175, 0.22, 'square', 0.07, t + 0.1); break;
      case 'count': tone(660, 0.22, 'square', 0.1, null, null, 0.3); tone(1320, 0.1, 'sine', 0.05); break;
      case 'go': tone(1320, 0.6, 'square', 0.12, null, null, 0.4); tone(660, 0.6, 'sawtooth', 0.06); tone(990, 0.6, 'triangle', 0.06); break;
      case 'shift': // vites: kısa güç kesintisi + mekanik tık + küçük patlama
        burst(0.05, 3500, 'highpass', 0.08); tone(140, 0.07, 'sawtooth', 0.07, t, 70);
        if (eng) { eng.g.gain.cancelScheduledValues(t); eng.g.gain.setTargetAtTime(0.03, t, 0.01); eng.g.gain.setTargetAtTime(0.2, t + 0.09, 0.03); }
        if (Math.random() < 0.5) pop(t + 0.05);
        break;
      case 'crash': burst(0.6, 900, 'lowpass', 0.5 * k, t, null, 0.4); tone(65, 0.4, 'sine', 0.45 * k, t, 28); burst(0.3, 4000, 'highpass', 0.12 * k, t + 0.03); metal(t + 0.01, k); if (k > 0.6) glass(t + 0.05, k); break;
      case 'bump': burst(0.18, 600, 'lowpass', 0.3 * k); tone(90, 0.15, 'sine', 0.25 * k, t, 50); metal(t, k * 0.4); break;
      case 'scrape': burst(0.25, 3200, 'bandpass', 0.14 * k, t, 3); burst(0.2, 6500, 'bandpass', 0.06 * k, t + 0.03, 6); break;
      case 'whoosh': { const f = burst(0.4, 500, 'bandpass', 0.2, t, 1.2); f.frequency.exponentialRampToValueAtTime(2800, t + 0.32); break; }
      case 'cam': tone(2400, 0.06, 'square', 0.08); burst(0.08, 6000, 'highpass', 0.12, t + 0.02); tone(1800, 0.15, 'sine', 0.1, t + 0.08); break;
      case 'foto': burst(0.05, 5000, 'highpass', 0.2); burst(0.09, 2200, 'bandpass', 0.16, t + 0.07); break;
      case 'kart': tone(520, 0.08, 'triangle', 0.1); tone(780, 0.1, 'triangle', 0.1, t + 0.06, null, 0.3); burst(0.12, 3000, 'highpass', 0.06, t); break;
      case 'cp': tone(988, 0.12, 'triangle', 0.14, null, null, 0.3); tone(1319, 0.28, 'triangle', 0.14, t + 0.1, null, 0.3); break;
      case 'boom': burst(1.0, 400, 'lowpass', 0.55, t, null, 0.5); tone(50, 0.8, 'sine', 0.45, t, 25); metal(t + 0.02, 0.8); break;
      case 'breaker': burst(1.3, 700, 'lowpass', 0.5, t, null, 0.5); for (let i = 0; i < 6; i++) { metal(t + 0.12 + i * 0.11, 0.5); } glass(t + 0.2, 0.8); break;
      case 'spike': burst(0.12, 2000, 'highpass', 0.4); burst(1.0, 5000, 'highpass', 0.14, t + 0.1); tone(400, 0.9, 'sine', 0.05, t + 0.1, 120); break;
      case 'busted': [523, 440, 349, 262].forEach((f, i) => tone(f, 0.35, 'square', 0.1, t + i * 0.22, null, 0.4)); tone(65, 1.2, 'sawtooth', 0.08, t + 0.8); break;
      case 'escape': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, t + i * 0.09, null, 0.4)); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, 'square', 0.07, t + i * 0.09, null, 0.4)); [262, 330, 392, 523].forEach(f => tone(f, 1.4, 'sawtooth', 0.04, t + 0.45, null, 0.5)); break;
      case 'lose': [392, 370, 349, 294].forEach((f, i) => tone(f, 0.4, 'triangle', 0.11, t + i * 0.24, null, 0.4)); break;
      case 'heli': for (let i = 0; i < 10; i++) burst(0.06, 280, 'lowpass', 0.25, t + i * 0.085); break;
      case 'radio': burst(0.12, 2500, 'bandpass', 0.05, t, 4); tone(1800, 0.04, 'square', 0.03, t + 0.12); burst(0.05, 2500, 'bandpass', 0.05, t + 0.25, 4); break;
      case 'heat': tone(880, 0.12, 'square', 0.09, null, null, 0.3); tone(1175, 0.16, 'square', 0.09, t + 0.18, null, 0.3); break;
      case 'odak': tone(160, 0.7, 'sine', 0.3, t, 55, 0.6); burst(0.6, 400, 'lowpass', 0.15, t, null, 0.5); break;
      case 'level': [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, t + i * 0.07, null, 0.4)); break;
      case 'type': tone(1400 + Math.random() * 400, 0.02, 'square', 0.015); break;
      case 'swoosh': { const f = burst(0.5, 300, 'bandpass', 0.16, t, 1, 0.3); f.frequency.exponentialRampToValueAtTime(3000, t + 0.45); break; } // hikâye geçişi
      case 'hit': burst(0.4, 120, 'lowpass', 0.45, t, null, 0.6); tone(45, 0.6, 'sine', 0.4, t, 30); break;                                       // sinematik vuruş
      case 'riser': { const f = burst(1.6, 400, 'bandpass', 0.12, t, 2, 0.5); f.frequency.exponentialRampToValueAtTime(6000, t + 1.5); tone(110, 1.6, 'sawtooth', 0.04, t, 440); break; }
    }
  }

  // ───────── MÜZİK ─────────
  // Her modda birkaç parça; her parça: akor ilerleyişi, tempo, ton, davul deseni, melodi ölçeği.
  const SONGS = {
    menu: [
      { bpm: 96, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], drums: 1, arp: 1, bass: 1, pad: 1, lead: 0.6 },
      { bpm: 90, prog: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], drums: 1, arp: 2, bass: 1, pad: 1.1, lead: 0.5 },
    ],
    yaris: [
      { bpm: 124, prog: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], drums: 2, arp: 2, bass: 2, pad: 0.6, lead: 1 },
      { bpm: 128, prog: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], drums: 2, arp: 2, bass: 3, pad: 0.5, lead: 1 },
      { bpm: 120, prog: [[54, 57, 61], [50, 54, 57], [52, 56, 59], [49, 52, 56]], drums: 2, arp: 1, bass: 2, pad: 0.7, lead: 0.9 },
    ],
    kovala: [
      { bpm: 142, prog: [[52, 55, 59], [53, 57, 60], [52, 55, 59], [50, 53, 57]], drums: 3, arp: 3, bass: 3, pad: 0.4, lead: 0.8, tense: 1 },
      { bpm: 150, prog: [[50, 53, 57], [50, 53, 57], [51, 54, 58], [49, 52, 56]], drums: 3, arp: 3, bass: 4, pad: 0.3, lead: 0.7, tense: 1 },
    ],
    hikaye: [
      { bpm: 76, prog: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [50, 53, 57]], drums: 0, arp: 1, bass: 1, pad: 1.3, lead: 0.4, keys: 1 },
      { bpm: 70, prog: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], drums: 0, arp: 0, bass: 1, pad: 1.4, lead: 0.5, keys: 1 },
    ],
  };
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  function music(mode) {
    if (mode === musMode) return;
    const prev = musMode; musMode = mode;
    if (!ok()) return;
    clearInterval(musTimer);
    if (!mode) return;
    const list = SONGS[mode] || []; song = list[Math.floor(Math.random() * list.length)];
    // geçiş: eski müzik kısa sürede söner, yenisi yükselir
    if (prev) { musG.gain.cancelScheduledValues(ctx.currentTime); musG.gain.setValueAtTime(vol.mus * MUSK * 0.25, ctx.currentTime); musG.gain.setTargetAtTime(vol.mus * MUSK, ctx.currentTime + 0.1, 0.5); }
    nextT = ctx.currentTime + 0.1; step = 0; bar = 0; motif = null;
    musTimer = setInterval(schedule, 30);
  }
  function mtone(f, t, dur, type, gain, cutoff, att, dest, panV, rev) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    let node = o;
    if (cutoff) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 3; o.connect(lp); node = lp; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + (att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    const out = panV ? pan(g, panV) : g;
    out.connect(dest || musG);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; out.connect(r); r.connect(revIn); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.002, 0.55, 0.28); o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.32);
    // pad/bas nefesi (yan zincir sıkıştırma)
    duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(0.35, t); duck.gain.setTargetAtTime(1, t + 0.02, 0.09);
  }
  function snare(t, ghost) {
    const n = noise(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400; const g = ctx.createGain(); env(g, t, 0.002, ghost ? 0.06 : 0.22, 0.17); n.connect(f); f.connect(g); g.connect(musG);
    if (!ghost) { const r = ctx.createGain(); r.gain.value = 0.35; g.connect(r); r.connect(revIn); }
    n.start(t); n.stop(t + 0.22);
    const o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.value = 190; env(g2, t, 0.002, ghost ? 0.04 : 0.14, 0.08); o.connect(g2); g2.connect(musG); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, open, p) { const n = noise(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000; const g = ctx.createGain(); env(g, t, 0.001, 0.05, open ? 0.16 : 0.035); n.connect(f); f.connect(g); pan(g, p || 0.25).connect(musG); n.start(t); n.stop(t + 0.2); }
  function tom(t, f0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.18); env(g, t, 0.002, 0.25, 0.2); o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.25); }
  function crashCym(t) { const n = noise(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000; const g = ctx.createGain(); env(g, t, 0.003, 0.08, 1.4); n.connect(f); f.connect(g); g.connect(musG); const r = ctx.createGain(); r.gain.value = 0.4; g.connect(r); r.connect(revIn); n.start(t); n.stop(t + 1.5); }
  // melodi üretici: akorun notalarından ve doğal minör ölçekten 2 ölçülük motif kurar, 4 ölçüde bir değiştirir
  let motif = null;
  const SCALE = [0, 2, 3, 5, 7, 8, 10];
  function makeMotif(ch) {
    const m = []; let deg = Math.floor(Math.random() * 3) * 2;
    for (let i = 0; i < 32; i++) {
      const on = (i % 4 === 0) || (Math.random() < (i % 2 === 0 ? 0.42 : 0.16));
      if (!on) { m.push(null); continue; }
      deg += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(Math.random() * 8)]; deg = Math.max(-2, Math.min(9, deg));
      const len = Math.random() < 0.3 ? 3 : Math.random() < 0.5 ? 2 : 1;
      m.push({ deg, len });
    }
    return m;
  }
  function degNote(root, deg) { const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7; return root + SCALE[d] + 12 * o; }
  function schedule() {
    if (!ok() || !musMode || !song) return;
    const M = song;
    const s16 = 60 / M.bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      const t = nextT, i = step % 16, ch = M.prog[bar % M.prog.length];
      const sec = Math.floor(bar / 8) % 4;            // bölüm: 0 giriş, 1 ana, 2 ara (sade), 3 doruk
      const fill = bar % 8 === 7 && i >= 12;          // 8. ölçü sonunda davul geçişi
      if (vol.mus > 0) {
        // davul
        if (M.drums && !(sec === 2 && M.drums < 3 && i % 8 !== 0)) {
          if (fill) { tom(t, [220, 180, 150, 120][i - 12]); if (i === 15) snare(t); }
          else {
            if (i % 4 === 0 && (M.drums >= 2 || i % 8 === 0)) kick(t);
            if (M.drums >= 2 && (i === 4 || i === 12)) snare(t);
            if (M.drums >= 2 && (i === 7 || i === 14) && Math.random() < 0.35) snare(t, true);
            if (i % 2 === 1) hat(t, i === 15, i % 4 === 1 ? 0.3 : -0.2);
            if (M.drums >= 3 && (i === 7 || i === 10)) kick(t);
            if (M.drums >= 3 && i % 4 === 2) hat(t, false, -0.35);
          }
          if (i === 0 && bar % 8 === 0 && bar > 0) crashCym(t);
        }
        // bas
        if (M.bass) {
          const root = ch[0] - 24;
          if (M.bass >= 4) { if (i % 1 === 0) mtone(mf(root + (i % 4 === 3 ? 12 : 0)), t, s16 * 0.9, 'sawtooth', 0.1, 520, 0.005, duck); }
          else if (i % 2 === 0) mtone(mf(root + (M.bass >= 2 && i % 4 === 2 ? 12 : 0)), t, s16 * 1.8, 'sawtooth', 0.12, 360 + (M.bass >= 3 ? 400 : 0) + sec * 80, 0.008, duck);
        }
        // arpej (stereo dolaşır, 8 ölçüde bir filtre açılır)
        if (M.arp && sec !== 2) {
          const every = M.arp >= 2 ? 1 : 2;
          if (i % every === 0) {
            const notes = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]];
            const n = notes[(step / every) % notes.length | 0] + 12;
            const sweep = 1400 + ((bar % 8) * 16 + i) / 128 * 3200;
            mtone(mf(n), t, s16 * 1.5, M.arp >= 3 ? 'square' : 'triangle', M.arp >= 3 ? 0.03 : 0.045, sweep, 0.005, null, Math.sin(step * 0.4) * 0.6, 0.15);
          }
        }
        // pad: ölçü başında, iki hafif kaymış ses (koro)
        if (M.pad && i === 0) for (const n of ch) {
          mtone(mf(n), t, s16 * 15.5, 'sawtooth', 0.022 * M.pad, 1000 + sec * 250, 0.45, duck, -0.4, 0.4);
          mtone(mf(n) * 1.006, t, s16 * 15.5, 'sawtooth', 0.018 * M.pad, 1000 + sec * 250, 0.45, duck, 0.4, 0.4);
        }
        // hikâye: piyano benzeri tuşlar
        if (M.keys && (i === 0 || i === 6 || i === 10)) for (const [j, n] of ch.entries()) mtone(mf(n + 12), t + j * 0.03, s16 * 6, 'triangle', 0.04, 2200, 0.004, null, (j - 1) * 0.3, 0.5);
        // melodi (ana ve doruk bölümlerinde)
        if (M.lead && (sec === 1 || sec === 3)) {
          if (!motif || (i === 0 && bar % 4 === 0)) motif = makeMotif(ch);
          const ev = motif[(bar % 2) * 16 + i];
          if (ev) {
            const note = degNote(M.prog[0][0] + 12, ev.deg);
            mtone(mf(note), t, s16 * (ev.len * 1.6 + 0.4), musMode === 'kovala' ? 'square' : 'sawtooth', 0.05 * M.lead, 1800 + sec * 400, 0.01, null, 0.1, 0.35);
            mtone(mf(note) * 2.003, t, s16 * ev.len, 'sine', 0.015 * M.lead, null, 0.01, null, -0.1, 0.3);
          }
        }
        // kovalamacada gerilim
        if (M.tense && i === 8 && bar % 2 === 1) mtone(mf(ch[2] + 12), t, s16 * 6, 'square', 0.035, 1800, 0.01, null, 0, 0.3);
        if (M.tense && bar % 8 === 6 && i === 0) { const f = burst(s16 * 30, 400, 'bandpass', 0.05, t, 2); f.frequency.exponentialRampToValueAtTime(5000, t + s16 * 30); }
      }
      nextT += s16; step++;
      if (step % 16 === 0) bar++;
    }
  }

  G.SES = { unlock, setVol, engine, stopEngine, skid, siren, sfx, music, get ctx() { return ctx; }, _tap: () => master }; // _tap: test için ana çıkış
})(window);
