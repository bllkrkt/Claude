// Gece Kaçağı — ses: motor, lastik, siren, efektler ve koddan üretilen müzik (WebAudio, hiç ses dosyası yok)
(function (G) {
  'use strict';
  let ctx = null, master, sfxG, musG, noiseBuf;
  let vol = { sfx: 0.8, mus: 0.5 };
  let eng = null, skidN = null, sirenN = null;
  let musMode = null, musTimer = 0, nextT = 0, step = 0, bar = 0;

  function ok() { return !!ctx && ctx.state !== 'closed'; }
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      sfxG = ctx.createGain(); sfxG.gain.value = vol.sfx; sfxG.connect(master);
      musG = ctx.createGain(); musG.gain.value = vol.mus * 0.6; musG.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (musMode) { const m = musMode; musMode = null; music(m); }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function setVol(s, m) {
    vol.sfx = s; vol.mus = m;
    if (ok()) { sfxG.gain.value = s; musG.gain.value = m * 0.6; }
  }
  function noise(loop) { const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = !!loop; return n; }
  function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }

  // ───────── MOTOR ─────────
  function engine(rpm, thr, nitro, speed) {
    if (!ok() || vol.sfx <= 0) return;
    const t = ctx.currentTime;
    if (!eng) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sawtooth';
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
      const g = ctx.createGain(); g.gain.value = 0;
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      const ws = ctx.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.5); } ws.curve = c;
      o1.connect(ws); o2.connect(g2); g2.connect(ws); o3.connect(ws); ws.connect(lp); lp.connect(g); g.connect(sfxG);
      // nitro tıslaması
      const n = noise(true), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
      const ng = ctx.createGain(); ng.gain.value = 0; n.connect(bp); bp.connect(ng); ng.connect(sfxG);
      // rüzgâr
      const w = noise(true), wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 500;
      const wg = ctx.createGain(); wg.gain.value = 0; w.connect(wl); wl.connect(wg); wg.connect(sfxG);
      o1.start(); o2.start(); o3.start(); n.start(); w.start();
      eng = { o1, o2, o3, lp, g, ng, wg, wl };
    }
    const f = 38 + rpm * 125;
    eng.o1.frequency.setTargetAtTime(f, t, 0.03);
    eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    eng.o3.frequency.setTargetAtTime(f * 1.505, t, 0.03);
    eng.lp.frequency.setTargetAtTime(300 + rpm * 1400 + thr * 900, t, 0.05);
    eng.g.gain.setTargetAtTime(0.09 + thr * 0.09 + rpm * 0.04, t, 0.05);
    eng.ng.gain.setTargetAtTime(nitro ? 0.12 : 0, t, 0.08);
    eng.wg.gain.setTargetAtTime((speed || 0) * 0.12, t, 0.2);
    eng.wl.frequency.setTargetAtTime(300 + (speed || 0) * 1400, t, 0.2);
  }
  function stopEngine() {
    if (!eng) return;
    const t = ctx.currentTime;
    eng.g.gain.setTargetAtTime(0, t, 0.05); eng.ng.gain.setTargetAtTime(0, t, 0.05); eng.wg.gain.setTargetAtTime(0, t, 0.05);
    const e = eng; eng = null;
    setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.o3.stop(); } catch (x) { } }, 400);
  }
  function skid(level) {
    if (!ok()) return;
    if (!skidN) {
      const n = noise(true), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 2.5;
      const g = ctx.createGain(); g.gain.value = 0; n.connect(bp); bp.connect(g); g.connect(sfxG); n.start();
      skidN = { g, bp };
    }
    skidN.g.gain.setTargetAtTime(level * 0.18, ctx.currentTime, 0.06);
    skidN.bp.frequency.setTargetAtTime(1100 + level * 600, ctx.currentTime, 0.1);
  }
  function siren(level) {
    if (!ok()) return;
    if (!sirenN) {
      if (level <= 0) return;
      const o = ctx.createOscillator(); o.type = 'sine';
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.45;
      const lg = ctx.createGain(); lg.gain.value = 380; lfo.connect(lg); lg.connect(o.frequency); o.frequency.value = 980;
      const o2 = ctx.createOscillator(); o2.type = 'triangle';
      const lfo2 = ctx.createOscillator(); lfo2.type = 'square'; lfo2.frequency.value = 3.2;
      const lg2 = ctx.createGain(); lg2.gain.value = 160; lfo2.connect(lg2); lg2.connect(o2.frequency); o2.frequency.value = 760;
      const g = ctx.createGain(); g.gain.value = 0;
      const g2 = ctx.createGain(); g2.gain.value = 0;
      o.connect(g); o2.connect(g2); g.connect(sfxG); g2.connect(sfxG);
      o.start(); lfo.start(); o2.start(); lfo2.start();
      sirenN = { g, g2, mix: 0 };
    }
    const t = ctx.currentTime;
    sirenN.mix += 0.002; const yelp = Math.sin(sirenN.mix) > 0.6;
    sirenN.g.gain.setTargetAtTime(level * (yelp ? 0.02 : 0.07), t, 0.1);
    sirenN.g2.gain.setTargetAtTime(level * (yelp ? 0.05 : 0), t, 0.1);
  }

  // ───────── EFEKTLER ─────────
  function tone(f, dur, type, gain, t0, slide) {
    const t = (t0 || ctx.currentTime);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    env(g, t, 0.005, gain || 0.2, dur);
    o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(dur, freq, type, gain, t0, q) {
    const t = t0 || ctx.currentTime;
    const n = noise(), f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 800; if (q) f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.004, gain || 0.3, dur);
    n.connect(f); f.connect(g); g.connect(sfxG); n.start(t); n.stop(t + dur + 0.05);
    return f;
  }
  function sfx(name, k) {
    if (!ok() || vol.sfx <= 0) return;
    const t = ctx.currentTime; k = k == null ? 1 : k;
    switch (name) {
      case 'click': tone(900, 0.05, 'square', 0.06); break;
      case 'tab': tone(600, 0.04, 'triangle', 0.08); tone(900, 0.05, 'triangle', 0.06, t + 0.03); break;
      case 'buy': [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, t + i * 0.07)); break;
      case 'deny': tone(220, 0.15, 'square', 0.08); tone(180, 0.2, 'square', 0.08, t + 0.1); break;
      case 'count': tone(660, 0.18, 'square', 0.12); break;
      case 'go': tone(1320, 0.5, 'square', 0.14); tone(660, 0.5, 'sawtooth', 0.06); break;
      case 'shift': burst(0.07, 3000, 'highpass', 0.08); tone(120, 0.08, 'sawtooth', 0.08, t, 70); break;
      case 'crash': burst(0.5, 900, 'lowpass', 0.5 * k); tone(70, 0.35, 'sine', 0.4 * k, t, 30); burst(0.25, 4000, 'highpass', 0.12 * k, t + 0.03); break;
      case 'bump': burst(0.18, 600, 'lowpass', 0.3 * k); tone(90, 0.15, 'sine', 0.25 * k, t, 50); break;
      case 'scrape': burst(0.2, 3500, 'bandpass', 0.15 * k, t, 3); break;
      case 'whoosh': { const f = burst(0.35, 600, 'bandpass', 0.18, t, 1.2); f.frequency.exponentialRampToValueAtTime(2600, t + 0.3); break; }
      case 'cam': tone(2400, 0.06, 'square', 0.08); burst(0.08, 6000, 'highpass', 0.12, t + 0.02); tone(1800, 0.15, 'sine', 0.1, t + 0.08); break;
      case 'cp': tone(988, 0.12, 'triangle', 0.15); tone(1319, 0.25, 'triangle', 0.15, t + 0.1); break;
      case 'boom': burst(0.9, 400, 'lowpass', 0.55); tone(55, 0.7, 'sine', 0.45, t, 28); break;
      case 'breaker': burst(1.2, 700, 'lowpass', 0.5); for (let i = 0; i < 5; i++) tone(300 + Math.random() * 600, 0.15, 'square', 0.05, t + 0.15 + i * 0.12, 80); break;
      case 'spike': burst(0.12, 2000, 'highpass', 0.4); burst(0.8, 5000, 'highpass', 0.12, t + 0.1); break;
      case 'busted': [523, 440, 349, 262].forEach((f, i) => tone(f, 0.3, 'square', 0.12, t + i * 0.2)); break;
      case 'escape': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, t + i * 0.1)); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'square', 0.08, t + i * 0.09)); [262, 330, 392].forEach(f => tone(f, 1.0, 'sawtooth', 0.05, t + 0.45)); break;
      case 'lose': [392, 370, 349, 294].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, t + i * 0.22)); break;
      case 'heli': for (let i = 0; i < 8; i++) burst(0.06, 300, 'lowpass', 0.25, t + i * 0.09); break;
      case 'radio': burst(0.12, 2500, 'bandpass', 0.05, t, 4); burst(0.05, 2500, 'bandpass', 0.05, t + 0.25, 4); break;
      case 'heat': tone(880, 0.12, 'square', 0.1); tone(880, 0.12, 'square', 0.1, t + 0.2); break;
      case 'odak': tone(160, 0.6, 'sine', 0.3, t, 60); burst(0.5, 400, 'lowpass', 0.15); break;
      case 'level': [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.13, t + i * 0.08)); break;
      case 'type': tone(1400 + Math.random() * 400, 0.02, 'square', 0.02); break;
    }
  }

  // ───────── MÜZİK (synthwave) ─────────
  // Akorlar: A minör ilerleyişler. Her mod farklı tempo/yoğunluk.
  const MODES = {
    menu: { bpm: 96, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], drums: 1, arp: 1, bass: 1, pad: 1 },
    yaris: { bpm: 124, prog: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], drums: 2, arp: 2, bass: 2, pad: 0.6 },
    kovala: { bpm: 142, prog: [[52, 55, 59], [53, 57, 60], [52, 55, 59], [50, 53, 57]], drums: 3, arp: 3, bass: 3, pad: 0.4 },
    hikaye: { bpm: 80, prog: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [50, 53, 57]], drums: 0, arp: 1, bass: 1, pad: 1.2 },
  };
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  function music(mode) {
    if (mode === musMode) return;
    musMode = mode;
    if (!ok()) return;
    clearInterval(musTimer);
    if (!mode || vol.mus <= 0 && false) return;
    nextT = ctx.currentTime + 0.1; step = 0; bar = 0;
    musTimer = setInterval(schedule, 30);
  }
  function mtone(f, t, dur, type, gain, cutoff, att) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    let node = o;
    if (cutoff) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 4; o.connect(lp); node = lp; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + (att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(musG); o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); env(g, t, 0.002, 0.5, 0.25); o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.3); }
  function snare(t) { const n = noise(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = ctx.createGain(); env(g, t, 0.002, 0.22, 0.16); n.connect(f); f.connect(g); g.connect(musG); n.start(t); n.stop(t + 0.2); const o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.value = 190; env(g2, t, 0.002, 0.15, 0.08); o.connect(g2); g2.connect(musG); o.start(t); o.stop(t + 0.1); }
  function hat(t, open) { const n = noise(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000; const g = ctx.createGain(); env(g, t, 0.001, 0.06, open ? 0.15 : 0.04); n.connect(f); f.connect(g); g.connect(musG); n.start(t); n.stop(t + 0.2); }
  function schedule() {
    if (!ok() || !musMode) return;
    const M = MODES[musMode]; if (!M) return;
    const s16 = 60 / M.bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      const t = nextT, i = step % 16, ch = M.prog[bar % M.prog.length];
      if (vol.mus > 0) {
        // davul
        if (M.drums) {
          if (i % 4 === 0 && (M.drums >= 2 || i % 8 === 0)) kick(t);
          if (M.drums >= 2 && (i === 4 || i === 12)) snare(t);
          if (M.drums >= 1 && i % 2 === 1) hat(t, i === 15);
          if (M.drums >= 3 && (i === 7 || i === 10)) kick(t);
          if (M.drums >= 3 && i % 4 === 2) hat(t);
        }
        // bas: sekizlik
        if (M.bass && i % 2 === 0) {
          const root = ch[0] - 24 + (M.bass >= 2 && i % 4 === 2 ? 12 : 0);
          mtone(mf(root), t, s16 * 1.8, 'sawtooth', 0.12, 380 + (M.bass >= 3 ? 400 : 0));
        }
        // arpej
        if (M.arp) {
          const every = M.arp >= 2 ? 1 : 2;
          if (i % every === 0) {
            const notes = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]];
            const n = notes[(step / every) % notes.length | 0] + 12;
            mtone(mf(n), t, s16 * 1.5, M.arp >= 3 ? 'square' : 'triangle', M.arp >= 3 ? 0.035 : 0.05, 2600);
          }
        }
        // pad: ölçü başında
        if (M.pad && i === 0) for (const n of ch) { mtone(mf(n), t, s16 * 15, 'sawtooth', 0.025 * M.pad, 900, 0.4); mtone(mf(n) * 1.005, t, s16 * 15, 'sawtooth', 0.02 * M.pad, 900, 0.4); }
        // kovalamacada gerilim notası
        if (musMode === 'kovala' && i === 8 && bar % 2 === 1) mtone(mf(ch[2] + 12), t, s16 * 6, 'square', 0.04, 1800);
      }
      nextT += s16; step++;
      if (step % 16 === 0) bar++;
    }
  }

  G.SES = { unlock, setVol, engine, stopEngine, skid, siren, sfx, music, get ctx() { return ctx; } };
})(window);
