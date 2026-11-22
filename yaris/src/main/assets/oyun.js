// Gece Kaçağı — oyun akışı: kayıt, kariyer, garaj, menüler, hikâye, ödüller
(function () {
  'use strict';
  const VER = '8.0';
  const KEY = 'gece-kacagi-v1';
  const V = window.VERI, Y = window.YARIS, SES = window.SES;
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString('tr-TR');
  const CAR = id => V.CARS.find(c => c.id === id);
  const TRK = id => V.TRACKS.find(t => t.id === id);
  const RIV = no => V.RIVALS.find(r => r.no === no);
  const EVENTS = V.careerEvents();
  const BR = window.AndroidBridge || null;
  const CH = Object.assign({ anlatici: { ad: '', renk: '#ffffff', bas: '🎬' } }, V.CHARS);
  const NAMES = ['Turbo Ali', 'Gece Selim', 'Kara Mehmet', 'Lastik Cem', 'Nitro Zeynep', 'Duman Kerem', 'Viraj Ayşe', 'Piston Oğuz', 'Kıvılcım Ece', 'Fren Yok Hasan', 'Asfalt Can', 'Gölgesiz Berk', 'Hız Seda', 'Yıldız Tolga', 'Şimşek Naz', 'Rampa Burak', 'Egzoz Deniz', 'Vites Umut'];

  // ───────── KAYIT ─────────
  function newCar(id) {
    const c = CAR(id);
    return { parca: {}, gor: { renk: c.renk, kaplama: 'parlak', jant: 0, jantRenk: 0, kit: 0, spoiler: 0, neon: 0, vinyl: 0, aksan: '#ffffff', cam: 1 }, sahip: {} };
  }
  function fresh() {
    return {
      v: 1, para: 2500, un: 0, sec: 'serce', arabalar: { serce: newCar('serce') },
      kar: { bitti: {}, rakip: 10, rk: {}, sahne: {}, final: false, son: false },
      ar: { sure: 0, etkisiz: 0, engel: 0, barikat: 0, kac: 0 },
      ist: { yaris: 0, gal: 0, polis: 0, engel: 0, barikat: 0, kilpayi: 0, enHiz: 0, km: 0, kazanc: 0, kacis: 0, yakalanma: 0, drift: 0, sure: 0, kestirme: 0, ucus: 0, kirik: 0 },
      kol: {}, rek: {}, // v7: serbest sürüş gizli parçaları (bölge → bulunanlar), pist rekorları (pist → {tur, sure})
      bas: {}, mo: {}, gun: { tarih: '', seri: 0, alindi: '', gorev: [], gtarih: '' },
      set: { ses: 0.8, muzik: 0.5, q: -1, kontrol: 'dokun', hassas: 1, otoGaz: false, yardim: 2, kamera: 0, titresim: true, zorluk: 1, efekt: 2 },
      ilk: true,
    };
  }
  let S = fresh();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw), d = fresh();
        // eksik alanları varsayılanlarla tamamla (eski kayıtlar bozulmasın)
        S = Object.assign(fresh(), o);
        for (const k of ['kar', 'ar', 'ist', 'gun', 'set', 'kol', 'rek']) S[k] = Object.assign(d[k], o[k] || {});
        if (!S.arabalar || !Object.keys(S.arabalar).length) S.arabalar = { serce: newCar('serce') };
        for (const id in S.arabalar) { const d = newCar(CAR(id) ? id : 'serce'); S.arabalar[id] = Object.assign(d, S.arabalar[id]); S.arabalar[id].gor = Object.assign(d.gor, S.arabalar[id].gor); }
        if (!S.arabalar[S.sec]) S.sec = Object.keys(S.arabalar)[0] || 'serce';
        if (!S.arabalar.serce && !Object.keys(S.arabalar).length) S.arabalar.serce = newCar('serce');
      }
    } catch (e) { console.warn('kayıt okunamadı', e); }
  }
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }, 150);
  }
  function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

  // ───────── YARDIMCI ─────────
  function toast(msg, cls) {
    const t = $('toast'), d = document.createElement('div');
    d.className = cls || ''; d.innerHTML = msg; t.appendChild(d);
    while (t.children.length > 3) t.removeChild(t.firstChild);
    setTimeout(() => d.remove(), 2600);
  }
  function modal(html) { $('mbox').innerHTML = html; $('modal').classList.add('on'); }
  function closeModal() { $('modal').classList.remove('on'); }
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  function confirmBox(text, yes, cb) {
    modal(`<h2>Emin misin?</h2><p>${text}</p><div class="row" style="justify-content:flex-end"><button class="btn alt" onclick="A.closeModal()">Vazgeç</button><button class="btn" id="cfYes">${yes}</button></div>`);
    $('cfYes').onclick = () => { closeModal(); cb(); };
  }
  function click() { SES.sfx('click'); }

  // ───────── ARABA: görünüm + statlar ─────────
  function visOf(id, gor) {
    const c = CAR(id), g = gor || S.arabalar[id].gor;
    return {
      model: id, govde: c.govde, renk: g.renk, kaplama: V.FINISH.find(f => f.id === g.kaplama) || V.FINISH[0], jant: V.RIMS[g.jant] || V.RIMS[0],
      jantRenk: (V.RIM_COLORS[g.jantRenk] || V.RIM_COLORS[0])[0], kit: g.kit, spoiler: g.spoiler, neon: (V.NEONS[g.neon] || V.NEONS[0])[0],
      vinyl: g.vinyl, aksan: g.aksan, cam: g.cam,
    };
  }
  function statsFor(id, parca) { return Y.statsOf(CAR(id), parca || S.arabalar[id].parca); }
  function classOpen(sinif) {
    const r = S.kar.rakip;
    return { D: true, C: r <= 8, B: r <= 6, A: r <= 4, S: r <= 2 }[sinif];
  }
  function carBuyable(c) {
    if (c.ozel === 'kuzgun' || c.ozel === 'kobra') return false;
    if (c.ozel === 'son') return S.kar.son;
    return classOpen(c.sinif);
  }
  // performans puanı (0-1000): kartlarda göstermek için
  function perf(st) { return Math.round((st.hiz / 360) * 400 + (3 / st.ivme) * 330 + (st.tutus / 1.4) * 270); }

  // ───────── EKRANLAR ─────────
  let cur = 'kariyer';
  function show(id) {
    for (const el of document.querySelectorAll('.scr')) el.classList.toggle('on', el.id === id);
  }
  function goMenu(tab) {
    show('menu');
    cur = tab || cur;
    Y.showroom(visOf(S.sec), cur === 'garaj' ? 'garaj' : 'menu');
    SES.music('menu');
    renderTop(); renderNav(); renderPanel();
  }
  function renderTop() {
    $('cPara').querySelector('span').textContent = fmt(S.para);
    $('cUn').querySelector('span').textContent = fmt(S.un);
    $('cRank').querySelector('span').textContent = S.kar.rakip > 0 ? '#' + S.kar.rakip + ' hedef' : (S.kar.son ? 'ŞAMPİYON' : 'FİNAL');
  }
  const NAV = [
    ['kariyer', '📜', 'Kariyer'], ['hizli', '🏁', 'Hızlı Yarış'], ['serbest', '🌃', 'Serbest Sürüş'], ['meydan', '🎯', 'Meydan Okuma'],
    ['rekor', '⏱', 'Rekorlar'], ['garaj', '🔧', 'Garaj'], ['gunluk', '📅', 'Günlük'], ['basarim', '🏆', 'Başarımlar'], ['ayar', '⚙️', 'Ayarlar'],
  ];
  function renderNav() {
    const dotG = gunlukDot();
    $('nav').innerHTML = NAV.map(([id, ik, ad]) => `<div class="nb ${cur === id ? 'on' : ''}" onclick="A.tab('${id}')"><i>${ik}</i>${ad}${id === 'gunluk' && dotG ? '<span class="dot"></span>' : ''}</div>`).join('');
  }
  function tab(id) {
    if (cur === 'garaj' && id !== 'garaj') garajRevert();
    cur = id; SES.sfx('tab');
    Y.showroom(visOf(S.sec), id === 'garaj' ? 'garaj' : 'menu');
    renderNav(); renderPanel();
  }
  function renderPanel() {
    const p = $('panel');
    p.classList.toggle('narrow', cur === 'garaj');
    $('menu').classList.toggle('compact', cur === 'garaj');
    p.innerHTML = ({ kariyer: pKariyer, hizli: pHizli, serbest: pSerbest, meydan: pMeydan, rekor: pRekor, garaj: pGaraj, gunluk: pGunluk, basarim: pBasarim, ayar: pAyar })[cur]();
    p.scrollTop = 0;
  }

  // ───────── KARİYER ─────────
  function rivalEvents(no) { return EVENTS.filter(e => e.rakipNo === no); }
  function rivalReq(no) {
    const r = RIV(no), evs = rivalEvents(no);
    const done = evs.filter(e => S.kar.bitti[e.id]).length;
    const need = V.rivalUn(no);
    const reqs = [{ ad: `Bölge yarışları (${done}/${evs.length})`, ok: done >= evs.length, p: done / evs.length },
      { ad: `Ün: ${fmt(Math.min(S.un, need))} / ${fmt(need)}`, ok: S.un >= need, p: Math.min(1, S.un / need) }];
    for (const k of r.kovala) {
      const have = S.ar[k.t] || 0;
      const ad = { sure: `En uzun kovalamaca: ${Math.floor(have)}/${k.n} sn`, etkisiz: `Devre dışı polis: ${have}/${k.n}`, engel: `Yıkılan takip engeli: ${have}/${k.n}`, barikat: `Geçilen barikat: ${have}/${k.n}`, kac: `${k.n} yıldızdan kaçış (en iyi: ${have}★)` }[k.t];
      reqs.push({ ad: '🚨 ' + ad, ok: have >= k.n, p: Math.min(1, have / k.n) });
    }
    return { reqs, ok: reqs.every(x => x.ok) };
  }
  function evCard(e) {
    const T = V.TYPES[e.tip], tr = TRK(e.pist), Z = V.ZONES[tr.bolge];
    const done = S.kar.bitti[e.id];
    const tags = (e.hava === 'yagmur' ? '<span class="tag rain">🌧 Yağmur</span>' : e.hava === 'sis' ? '<span class="tag fog">🌫 Sis</span>' : '') + (e.polis ? '<span class="tag cop">🚨 Polis</span>' : '');
    const extra = e.tip === 'devre' || e.tip === 'eleme' ? ` · ${e.tur} tur` : e.tip === 'kovala' && e.hedef ? ` · ${Y.goalText(e.hedef)}` : '';
    return `<div class="card ${done ? 'done' : ''}" onclick="A.startEv('${e.id}')"><span class="ik">${T.ik}</span><div class="t">${T.ad}${tags}</div><div class="s">${tr.ad} · ${Z.ad}${extra}</div><div class="rw">💰 ${fmt(done ? e.para * 0.4 : e.para)} · 🔥 ${fmt(done ? e.un * 0.3 : e.un)} Ün</div></div>`;
  }
  function pKariyer() {
    const k = S.kar;
    let h = '';
    // Gece Listesi
    h += `<div class="pane"><h2>📜 Gece Listesi <small>Kobra'ya ulaşmak için hepsini yen</small></h2><div class="bl">`;
    for (let no = 1; no <= 10; no++) {
      const r = RIV(no), beat = no > k.rakip || (k.rakip === 0), curR = no === k.rakip;
      const known = no >= k.rakip - 1 || beat;
      h += `<div class="r ${beat ? 'beat' : ''} ${curR ? 'cur' : ''} ${!known ? 'lock' : ''}" onclick="A.rivInfo(${no})"><span class="n">#${no}</span><div class="f">${r.bas}</div><div class="a">${known ? r.lakap : '???'}</div></div>`;
    }
    h += `</div></div>`;
    if (k.rakip > 0) {
      const r = RIV(k.rakip), rq = rivalReq(k.rakip), Z = V.ZONES[r.bolge], rp = k.rk[k.rakip] || [];
      h += `<div class="pane"><div class="rivhead"><div class="face" style="background:${r.renk}33;color:${r.renk}">${r.bas}</div><div><div class="mut" style="font-size:12px;font-weight:800">SIRADAKİ HEDEF · #${r.no} · ${Z.ad.toUpperCase()}</div><div class="nm">${r.ad}</div><div class="mut" style="font-size:13px">${r.ozet}</div><div class="mut" style="font-size:12px;margin-top:2px">🚗 ${CAR(r.araba).ad} <span class="tag ${CAR(r.araba).sinif}">${CAR(r.araba).sinif}</span></div></div></div>
        <div class="req">${rq.reqs.map(x => `<span>${x.ad}</span><span class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : Math.round(x.p * 100) + '%'}</span><div class="prog"><i style="width:${x.p * 100}%"></i></div>`).join('')}</div>
        <div class="row" style="justify-content:space-between"><span class="mut" style="font-size:12.5px">${rq.ok ? 'Hazırsın. İki yarışı da kazanmalısın.' : 'Ün için yarış kazan ve polisle oyna. Kovalamaca hedefleri her türlü takipte sayılır.'}</span>
        <button class="btn ${rq.ok ? '' : 'off'}" onclick="A.rivalRace()">⚔️ MEYDAN OKU ${rp.filter(Boolean).length ? '(' + rp.filter(Boolean).length + '/2)' : ''}</button></div></div>`;
      h += `<div class="pane"><h2>${V.ZONES[r.bolge].ad} Yarışları <small>${V.ZONES[r.bolge].yazi}</small></h2><div class="grid">${rivalEvents(k.rakip).map(evCard).join('')}</div></div>`;
    } else if (!k.son) {
      h += `<div class="pane"><h2>🏁 SON KAÇIŞ</h2><p>Kobra düştü. Komiser Sert bütün şehri kapattı. Kuzgun GTR seninle — şehirden çık!</p><button class="btn big" onclick="A.finalEscape()">KAÇ! 🚨</button></div>`;
    } else {
      h += `<div class="pane"><h2>👑 Şehrin Yeni Efsanesi</h2><p class="mut">Hikâyeyi bitirdin. Bütün yarışlar tekrar oynanabilir, Hayalet galeride. Meydan okumaları ve serbest sürüşü dene!</p><button class="btn alt" onclick="A.replayStory()">Final sahnesini tekrar izle</button></div>`;
    }
    // önceki bölgeler
    const past = V.RIVALS.filter(r => r.no > k.rakip).sort((a, b) => a.no - b.no);
    if (past.length) {
      h += `<div class="pane"><h2>Tekrar Oyna <small>Ödüller azaltılmış</small></h2>`;
      for (const r of past) h += `<h3>#${r.no} ${r.lakap} · ${V.ZONES[r.bolge].ad}</h3><div class="grid">${rivalEvents(r.no).map(evCard).join('')}</div>`;
      h += `</div>`;
    }
    h += `<div class="pane"><h2>🚓 Polis Dosyan</h2><div class="grid sm">
      ${stat('En uzun takip', Math.floor(S.ar.sure) + ' sn')}${stat('Devre dışı polis', S.ar.etkisiz)}${stat('Yıkılan engel', S.ar.engel)}${stat('Geçilen barikat', S.ar.barikat)}${stat('En yüksek kaçış', S.ar.kac + '★')}${stat('Yakalanma', S.ist.yakalanma)}</div></div>`;
    return h;
  }
  function stat(a, b) { return `<div class="card" style="cursor:default"><div class="s">${a}</div><div class="t">${b}</div></div>`; }
  function rivInfo(no) {
    const r = RIV(no), k = S.kar, beat = no > k.rakip || k.rakip === 0;
    if (!(no >= k.rakip - 1 || beat)) { toast('🔒 Bu isim henüz bilinmiyor'); return; }
    const c = CAR(r.araba);
    modal(`<div class="rivhead"><div class="face" style="background:${r.renk}33;color:${r.renk}">${r.bas}</div><div><div class="mut" style="font-weight:800">#${r.no} · ${V.ZONES[r.bolge].ad}</div><div class="nm">${r.ad}</div></div></div>
      <p>${r.ozet}</p><p class="mut">“${r.soz[0]}”</p><p>🚗 ${c.ad} <span class="tag ${c.sinif}">${c.sinif}</span></p>
      ${beat ? '<p style="color:var(--grn);font-weight:800">✓ YENİLDİ</p>' : ''}<div class="row" style="justify-content:flex-end"><button class="btn alt" onclick="A.closeModal()">Kapat</button></div>`);
  }

  // ───────── YARIŞ BAŞLATMA ─────────
  const DIFF = [{ ad: 'Kolay', z: 0.92, bant: 1.4 }, { ad: 'Normal', z: 1, bant: 1 }, { ad: 'Zor', z: 1.05, bant: 0.6 }];
  function aiCars(tier, n, avoid) {
    const cls = ['D', 'D', 'C', 'C', 'B', 'B', 'A', 'A', 'A', 'S'][Math.max(0, Math.min(9, tier))];
    const pool = V.CARS.filter(c => c.sinif === cls && !c.ozel);
    const lv = [0, 1, 1, 2, 2, 2, 3, 3, 3, 4][Math.max(0, Math.min(9, tier))];
    const out = [];
    const names = NAMES.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      const parca = {}; for (const p of V.PARTS) parca[p.id] = lv;
      const pc = V.PAINTS[Math.floor(Math.random() * V.PAINTS.length)][0];
      out.push({ ad: names[i % names.length], stats: Y.statsOf(c, parca), renk: pc,
        vis: { model: c.id, govde: c.govde, renk: pc, kaplama: V.FINISH[Math.floor(Math.random() * 3)], jant: V.RIMS[Math.floor(Math.random() * 6)], jantRenk: V.RIM_COLORS[Math.floor(Math.random() * 3)][0], kit: Math.floor(Math.random() * 3), spoiler: Math.floor(Math.random() * 5), neon: Math.random() < 0.4 ? V.NEONS[1 + Math.floor(Math.random() * 6)][0] : null, vinyl: Math.floor(Math.random() * 8), aksan: '#ffffff', cam: 1, basit: S.set.q === 0 } });
    }
    return out;
  }
  function pistDef(tr, tip) {
    if (tip === 'kovala' || tip === 'kacis') return { seed: tr.seed + 500, tip: 'dongu', uzun: 5200 + tr.bolge * 300 };
    return { seed: tr.seed, tip: tr.tip, uzun: tr.uzun };
  }
  function baseCfg(o) {
    const d = DIFF[S.set.zorluk] || DIFF[1];
    const tr = TRK(o.pist), Z = tr.bolge >= 0 ? V.ZONES[tr.bolge] : V.ZONES[2];
    return {
      tip: o.tip, pist: pistDef(tr, o.tip), bolge: Z, tur: o.tur || 1, pistId: o.pist,
      oyuncu: { ad: S.isim || 'Sen', vis: visOf(S.sec), stats: statsFor(S.sec) },
      rakipler: o.rakipler || [], polis: o.polis || 0, hedef: o.hedef, hava: o.hava || 'acik', saat: o.saat || 'gunduz',
      zor: (o.zor || 0.85) * d.z, bant: d.bant, trafik: o.trafik,
      cb: { onFinish: res => onFinish(res) },
    };
  }
  let lastRun = null; // tekrar için
  function run(meta, cfg) {
    lastRun = { meta, cfg };
    SES.unlock();
    applyOpts();
    show('none');
    Y.start(cfg);
  }
  function startEv(id) {
    click();
    const e = EVENTS.find(x => x.id === id);
    if (!e) return;
    if (e.rakipNo < S.kar.rakip) { toast('🔒 Önce önceki rakipleri yen'); return; }
    const go = () => {
      const tier = 10 - e.rakipNo;
      const d = DIFF[S.set.zorluk] || DIFF[1];
      const rk = ['gise', 'drift', 'kovala', 'kacis'].includes(e.tip) ? [] : aiCars(tier, e.rakipSay).map(r => Object.assign(r, { zor: e.zor * d.z }));
      const cfg = baseCfg({ tip: e.tip, pist: e.pist, tur: e.tur, rakipler: rk, polis: e.tip === 'kacis' ? 2 + Math.floor(tier / 3) : e.polis, hedef: e.hedef, hava: e.hava, saat: e.saat, zor: e.zor });
      run({ kind: 'kariyer', ev: e }, cfg);
    };
    if ((e.tip === 'kovala' || e.tip === 'kacis' || e.polis) && !S.kar.sahne.ilkKovala) { S.kar.sahne.ilkKovala = 1; save(); story(V.STORY.ilkKovala, go); }
    else go();
  }
  function rivalRace() {
    click();
    const no = S.kar.rakip, r = RIV(no);
    if (!rivalReq(no).ok) { toast('Önce gereksinimleri tamamla'); return; }
    const rp = S.kar.rk[no] || [false, false];
    const idx = rp[0] ? 1 : 0;
    const zoneTracks = V.TRACKS.filter(t => t.bolge === r.bolge);
    const tr = idx === 0 ? zoneTracks.find(t => t.tip === 'acik') : zoneTracks.find(t => t.tip === 'dongu');
    const c = CAR(r.araba), d = DIFF[S.set.zorluk] || DIFF[1];
    const parca = {}; for (const p of V.PARTS) parca[p.id] = Math.min(4, Math.floor((10 - no) / 2.2) + 1);
    const rival = { ad: r.lakap, rival: true, renk: r.renk, zor: r.zor * d.z, stats: Y.statsOf(c, parca),
      vis: { model: c.id, govde: c.govde, renk: r.renk, kaplama: V.FINISH[1], jant: V.RIMS[(no % 5) + 1], jantRenk: V.RIM_COLORS[(no % 3)][0], kit: 1 + (no % 3), spoiler: 1 + (no % 4), neon: V.NEONS[1 + (no % 7)][0], vinyl: 1 + (no % 7), aksan: '#ffffff', cam: 2 } };
    const lines = idx === 0 ? [['rakip', r.soz[0]]] : [['bora', 'Bir yarış kaldı kanka. ' + r.lakap + ' köpürmüş, dikkat!']];
    story(lines, () => {
      const cfg = baseCfg({ tip: idx === 0 ? 'sprint' : 'devre', pist: tr.id, tur: idx === 0 ? 1 : 2, rakipler: [rival], polis: no <= 6 && idx === 0 ? 1 : 0, saat: r.bolge === 3 ? 'aksam' : 'gece', zor: r.zor });
      cfg.bant = d.bant * 0.6;
      run({ kind: 'rakip', no, idx }, cfg);
    }, r);
  }
  function finalEscape() {
    click();
    const cfg = baseCfg({ tip: 'kacis', pist: 'o4', polis: 5, hedef: { t: 'kac', n: 5 }, saat: 'gece', zor: 1 });
    run({ kind: 'final' }, cfg);
  }

  // ───────── SONUÇLAR ─────────
  function onFinish(res) {
    const m = lastRun.meta, st = res.stats;
    const lines = [];
    let para = 0, un = 0;
    S.ist.yaris++;
    S.ist.enHiz = Math.max(S.ist.enHiz, st.enHiz);
    S.ist.km += st.mesafe / 1000;
    S.ist.drift += res.driftTotal || 0;
    S.ist.kestirme = (S.ist.kestirme || 0) + (st.kestirme || 0);
    if (res.win) S.ist.gal++;
    const pursTime = res.pursTime || 0;
    S.ar.sure = Math.max(S.ar.sure, pursTime);
    S.ist.sure = Math.max(S.ist.sure, pursTime);
    // kovalamaca ödülü
    if (res.bounty > 0) { un += res.bounty; para += res.bounty * 0.25; lines.push(['🚨 Kovalamaca ödülü', fmt(res.bounty) + ' Ün']); }
    if (res.yakalandi) {
      const fine = Math.min(S.para, 600 + (st.maxIsi || 1) * 900);
      S.para -= fine; S.ist.yakalanma++;
      lines.push(['🚔 Yakalandın — ceza', '-' + fmt(fine) + ' 💰']);
      un = Math.round(un * 0.5);
    }
    let nextStory = null;
    if (m.kind === 'kariyer') {
      const e = m.ev, first = !S.kar.bitti[e.id];
      if (res.win) {
        para += first ? e.para : e.para * 0.4; un += first ? e.un : e.un * 0.3;
        S.kar.bitti[e.id] = true;
        if (first && e.id === 'k10_0' && !S.kar.sahne.ilkYaris) nextStory = 'ilkYaris';
      } else { un += e.un * 0.1; if (e.id === 'k10_0' && !S.kar.sahne.ilkYaris) nextStory = 'ilkYaris'; }
    } else if (m.kind === 'rakip') {
      const rp = S.kar.rk[m.no] || [false, false];
      if (res.win) { rp[m.idx] = true; para += 3000 + (10 - m.no) * 1500; un += 400 + (10 - m.no) * 200; }
      S.kar.rk[m.no] = rp;
      if (rp[0] && rp[1]) nextStory = 'rakip';
    } else if (m.kind === 'final') {
      if (res.win) nextStory = 'final';
    } else if (m.kind === 'hizli') {
      if (res.win) { para += 400 + m.z * 350; un += 60 + m.z * 40; }
    } else if (m.kind === 'meydan') {
      const c = m.ch, ok = challengeOk(c, res);
      if (ok && !S.mo[c.id]) { S.mo[c.id] = 1; para += c.para; lines.push(['🎯 Meydan okuma tamam!', '']); }
      else if (ok) lines.push(['🎯 Tekrar başardın', '']);
      else lines.push(['🎯 Hedef tutmadı', '']);
      res.win = ok;
    }
    // v7: pist rekorları, kırılan engeller
    const pid = lastRun.cfg.pistId;
    if (pid && !res.yakalandi && !res.kaza && (lastRun.cfg.tip !== 'kovala' && lastRun.cfg.tip !== 'kacis')) {
      const rk = S.rek[pid] || (S.rek[pid] = {});
      if (res.turlar && res.turlar.length) { const b = Math.min(...res.turlar); if (!rk.tur || b < rk.tur - 0.005) { const eski = rk.tur; rk.tur = Math.round(b * 100) / 100; lines.push(['⏱ YENİ TUR REKORU', fmtTime(b) + (eski ? ' (' + (b - eski).toFixed(2) + ' sn)' : '')]); if (eski && m.kind === 'zaman') unlock('hayalet'); } }
      if (res.sprintT && (!rk.sure || res.sprintT < rk.sure - 0.005)) { const eski = rk.sure; rk.sure = Math.round(res.sprintT * 100) / 100; lines.push(['⏱ YENİ PİST REKORU', fmtTime(res.sprintT) + (eski ? ' (' + (res.sprintT - eski).toFixed(2) + ' sn)' : '')]); if (eski && m.kind === 'zaman') unlock('hayalet'); }
    }
    if (res.kirik) { para += res.kirik * 10; S.ist.kirik = (S.ist.kirik || 0) + res.kirik; if (S.ist.kirik >= 100) unlock('kirici'); }
    para = Math.round(para); un = Math.round(un);
    S.para += para; S.un += un; S.ist.kazanc += Math.max(0, para);
    if (res.win) dailyProg('kazan', 1);
    dailyProg('km', st.mesafe / 1000);
    if (res.driftTotal) dailyProg('drift', res.driftTotal);
    checkAch();
    saveNow();
    // ekran
    const big = $('resBig'), sub = $('resSub');
    const tip = lastRun.cfg.tip;
    let title, subt;
    if (res.yakalandi) { title = 'YAKALANDIN'; subt = 'Komiser Sert gülümsüyor...'; }
    else if (res.kaza) { title = 'KAZA'; subt = 'Drag yarışında trafiğe çarptın'; }
    else if (tip === 'kovala' || tip === 'kacis') { title = res.win ? 'KAÇTIN!' : 'BAŞARISIZ'; subt = res.win ? 'Polis izini kaybetti' : ''; }
    else if (tip === 'drift') { title = res.win ? 'HEDEF TAMAM' : 'YETMEDİ'; subt = fmt(res.puan || 0) + ' puan'; }
    else if (tip === 'gise') { title = res.win ? 'BAŞARDIN' : 'SÜRE BİTTİ'; subt = res.win ? (res.kalan || 0).toFixed(1) + ' sn kala' : ''; }
    else { title = res.win ? '1. SIRA' : (res.pos ? res.pos + '. SIRA' : 'KAYBETTİN'); subt = V.TYPES[tip] ? V.TYPES[tip].ad + ' · ' + fmtTime(res.time) : ''; }
    if (m.kind === 'meydan') title = res.win ? 'BAŞARDIN' : 'OLMADI';
    if (m.kind === 'zaman') { title = res.yeniHayalet ? 'YENİ REKOR!' : 'BİTTİ'; res.win = !!res.yeniHayalet; subt = res.turlar && res.turlar.length ? 'En iyi tur ' + fmtTime(Math.min(...res.turlar)) : fmtTime(res.sprintT || res.time); }
    big.textContent = title; big.className = 'big ' + (res.win ? 'w' : 'l'); sub.textContent = subt;
    const L = [];
    if (tip === 'hiz') L.push(['📸 Radar toplamı', fmt(res.toplam || st.hizToplam) + ' km/s']);
    L.push(['⚡ En yüksek hız', Math.round(st.enHiz) + ' km/s']);
    if (st.kilpayi) L.push(['😬 Kıl payı', st.kilpayi]);
    if (res.driftTotal) L.push(['💨 Drift puanı', fmt(res.driftTotal)]);
    if (st.mukemmel) L.push(['🚦 Mükemmel vites', st.mukemmel]);
    if (st.duvar) L.push(['🧱 Duvar çarpması', st.duvar]);
    if (st.kestirme) L.push(['🔀 Kestirme', st.kestirme]);
    if (st.ucus) L.push(['🛫 En uzun uçuş', st.ucus + ' m']);
    if (st.etkisiz) L.push(['🚓 Devre dışı polis', st.etkisiz]);
    if (st.engel) L.push(['🏗️ Yıkılan engel', st.engel]);
    if (st.barikat) L.push(['🚧 Geçilen barikat', st.barikat]);
    if (res.kirik) L.push(['📦 Kırılan kasa/koni', res.kirik + ' (+' + fmt(res.kirik * 10) + ' 💰)']);
    if (res.hasar) L.push(['🔧 Araç hasarı', '%' + res.hasar]);
    if (res.turlar && res.turlar.length > 1) L.push(['🔁 En iyi tur', fmtTime(Math.min(...res.turlar))]);
    $('resLines').innerHTML = L.concat(lines).map(([a, b]) => `<div class="ln"><span>${a}</span><b>${b}</b></div>`).join('') +
      `<div class="ln rw"><span>Kazanç</span><b>${para >= 0 ? '+' : ''}${fmt(para)} 💰 · +${fmt(un)} 🔥</b></div>`;
    const cont = () => {
      Y.stopRace();
      if (nextStory === 'ilkYaris') { S.kar.sahne.ilkYaris = 1; save(); story(V.STORY.ilkYaris, () => { goMenu('kariyer'); hint(); }); }
      else if (nextStory === 'rakip') defeatRival(m.no);
      else if (nextStory === 'final') finale();
      else goMenu();
    };
    $('resBtns').innerHTML = `<button class="btn big" id="rCont">DEVAM ▶</button>` + (nextStory ? '' : `<button class="btn alt big" id="rAgain">TEKRAR ↻</button>`);
    $('rCont').onclick = () => { click(); cont(); };
    const hc = document.getElementById('hud-ctl'); if (hc) hc.style.display = 'none';
    const hs = document.getElementById('hud-speedo'); if (hs) hs.style.display = 'none';
    if ($('rAgain')) $('rAgain').onclick = () => { click(); restart(); };
    show('res');
  }
  function fmtTime(t) { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
  function restart() {
    if (!lastRun) return;
    const { meta, cfg } = lastRun;
    // oyuncu arabası değişmiş olabilir
    cfg.oyuncu = { ad: S.isim || 'Sen', vis: visOf(S.sec), stats: statsFor(S.sec) };
    show('none'); paused(false);
    run(meta, cfg);
  }
  function defeatRival(no) {
    const r = RIV(no);
    S.kar.rakip = no - 1;
    const c = CAR(r.araba);
    let gift = '';
    if (no === 1) { // Kobra'nın arabası hediye
      if (!S.arabalar.kobra) S.arabalar.kobra = newCar('kobra');
      gift = 'Kobra RX artık senin!';
    } else gift = `${c.ad} artık galeride satışta.`;
    if (G_ach('liste5') && no <= 5) unlock('liste5');
    if (no === 1) unlock('liste1');
    saveNow();
    const lines = [['rakip', r.soz[1]]].concat(V.STORY.rakipSonra[no] || []);
    story(lines, () => {
      goMenu('kariyer');
      toast(`👑 #${no} ${r.lakap} yenildi! ${gift}`, 'ach');
      const nz = no - 1 > 0 ? RIV(no - 1) : null;
      if (nz && nz.bolge !== r.bolge) setTimeout(() => toast(`🗺️ Yeni bölge açıldı: ${V.ZONES[nz.bolge].ad}`, 'ach'), 900);
      const cls = { 9: 'C', 7: 'B', 5: 'A', 3: 'S' }[no];
      if (cls) setTimeout(() => toast(`🚗 Galeride ${cls} sınıfı arabalar açıldı!`, 'ach'), 1800);
    }, r);
  }
  function G_ach() { return true; }
  function finale() {
    S.kar.son = true;
    if (!S.arabalar.kuzgun) S.arabalar.kuzgun = newCar('kuzgun');
    unlock('son');
    saveNow();
    SES.music('hikaye');
    story(V.STORY.final, () => { goMenu('kariyer'); toast('🌅 Kuzgun GTR garajında! Hayalet galeride.', 'ach'); });
  }
  function replayStory() { story(V.STORY.giris.concat(V.STORY.final), () => goMenu()); }

  // ───────── HİKÂYE DİYALOĞU ─────────
  let dl = null;
  function story(lines, done, rival) {
    show('dlg');
    if (!Y.active) Y.showroom(visOf(S.sec), 'menu');
    SES.music('hikaye');
    dl = { lines, i: 0, done, rival, typing: 0 };
    stepDlg();
  }
  function stepDlg() {
    if (!dl) return;
    if (dl.i >= dl.lines.length) { const d = dl.done; dl = null; d && d(); return; }
    const [who, text] = dl.lines[dl.i];
    let c = CH[who];
    if (who === 'rakip' && dl.rival) c = { ad: dl.rival.ad, renk: dl.rival.renk, bas: dl.rival.bas, unvan: 'Gece Listesi #' + dl.rival.no };
    if (!c) c = CH.anlatici;
    const box = $('dlg');
    box.classList.toggle('nar', who === 'anlatici');
    $('dlgFace').textContent = c.bas; $('dlgFace').style.color = c.renk;
    $('dlgWho').innerHTML = (c.ad === 'Sen' ? (S.isim || 'Sen') : c.ad) + (c.unvan ? `<small>${c.unvan}</small>` : '');
    $('dlgWho').style.color = c.renk;
    const say = $('dlgSay');
    say.textContent = '';
    clearInterval(dl.typing);
    let k = 0;
    dl.full = text;
    dl.typing = setInterval(() => {
      k += 2; say.textContent = text.slice(0, k);
      if (k % 6 === 0) SES.sfx('type');
      if (k >= text.length) { clearInterval(dl.typing); dl.typing = 0; }
    }, 22);
  }
  $('dlg').addEventListener('click', e => {
    if (!dl || e.target.id === 'dlgSkip') return;
    if (dl.typing) { clearInterval(dl.typing); dl.typing = 0; $('dlgSay').textContent = dl.full; return; }
    dl.i++; stepDlg();
  });
  $('dlgSkip').onclick = e => { e.stopPropagation(); if (!dl) return; clearInterval(dl.typing); const d = dl.done; dl = null; d && d(); };

  // ───────── HIZLI YARIŞ ─────────
  const QR = { tip: 'devre', bolge: 0, pist: 'l1', tur: 2, rakip: 4, zor: 1, hava: 'acik', saat: 'gunduz', polis: 0 };
  function maxZone() { return S.kar.rakip > 0 ? RIV(S.kar.rakip).bolge : 5; }
  function trackOk(t, tip) {
    if (tip === 'drag') return t.tip === 'duz';
    if (tip === 'devre' || tip === 'eleme' || tip === 'drift') return t.tip === 'dongu';
    return t.tip === 'acik';
  }
  function pHizli() {
    const types = ['devre', 'sprint', 'drag', 'hiz', 'eleme', 'gise', 'drift', 'duello', 'kovala', 'kacis'];
    const mz = maxZone();
    if (QR.bolge > mz) QR.bolge = 0;
    const tracks = V.TRACKS.filter(t => t.bolge === QR.bolge && (QR.tip === 'kovala' || QR.tip === 'kacis' || QR.tip === 'duello' ? t.tip !== 'duz' : trackOk(t, QR.tip)));
    if (!tracks.find(t => t.id === QR.pist)) QR.pist = tracks[0] ? tracks[0].id : null;
    const opt = (k, val, label, extra) => `<div class="o ${QR[k] === val ? 'on' : ''}" onclick="A.qr('${k}',${typeof val === 'string' ? `'${val}'` : val})">${label}${extra || ''}</div>`;
    const solo = ['gise', 'drift', 'kovala', 'kacis'].includes(QR.tip);
    let h = `<div class="pane"><h2>🏁 Hızlı Yarış <small>Kariyeri etkilemez, küçük ödül verir</small></h2>
      <h3>Tür</h3><div class="sw">${types.map(t => opt('tip', t, V.TYPES[t].ik + ' ' + V.TYPES[t].ad)).join('')}</div>
      <p class="mut" style="font-size:13px">${V.TYPES[QR.tip].yazi}</p>
      <h3>Bölge</h3><div class="sw">${V.ZONES.map((z, i) => i <= mz ? opt('bolge', i, z.ad) : `<div class="o" style="opacity:.4">🔒 ${z.ad}</div>`).join('')}</div>
      <h3>Pist</h3><div class="sw">${tracks.map(t => opt('pist', t.id, t.ad, `<small>${(t.uzun / 1000).toFixed(1)} km</small>`)).join('') || '<span class="mut">Bu bölgede uygun pist yok</span>'}</div>`;
    if (['devre', 'eleme', 'drift'].includes(QR.tip)) h += `<h3>Tur</h3><div class="sw">${[1, 2, 3, 4, 5].map(n => opt('tur', n, n)).join('')}</div>`;
    if (!solo && QR.tip !== 'duello') h += `<h3>Rakip sayısı</h3><div class="sw">${(QR.tip === 'drag' ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7]).map(n => opt('rakip', n, n)).join('')}</div>`;
    h += `<h3>Rakip seviyesi</h3><div class="sw">${['Çaylak', 'Sokak', 'Usta', 'Efsane'].map((n, i) => opt('zor', i, n)).join('')}</div>
      <h3>Hava · Saat</h3><div class="sw">${opt('hava', 'acik', '☀️ Açık')}${opt('hava', 'yagmur', '🌧 Yağmur')}${opt('hava', 'sis', '🌫 Sis')} &nbsp; ${opt('saat', 'gece', '🌙 Gece')}${opt('saat', 'aksam', '🌇 Akşam')}${opt('saat', 'gunduz', '🌞 Gündüz')}</div>`;
    if (!['kovala', 'kacis', 'drag', 'drift'].includes(QR.tip)) h += `<h3>Polis</h3><div class="sw">${[[0, 'Yok'], [1, '★'], [3, '★★★'], [5, '★★★★★']].map(([n, l]) => opt('polis', n, l)).join('')}</div>`;
    if (QR.tip === 'kacis') h += `<h3>Başlangıç aranma</h3><div class="sw">${[1, 2, 3, 4, 5].map(n => opt('polis', n, '★'.repeat(n))).join('')}</div>`;
    h += `<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn big" onclick="A.qrStart()">BAŞLA ▶</button></div></div>`;
    return h;
  }
  function qr(k, v) { QR[k] = v; click(); renderPanel(); }
  function qrStart() {
    click();
    if (!QR.pist) { toast('Pist seç'); return; }
    const tier = [1, 4, 7, 9][QR.zor], zor = [0.8, 0.88, 0.95, 1.0][QR.zor];
    const solo = ['gise', 'drift', 'kovala', 'kacis'].includes(QR.tip);
    const n = QR.tip === 'duello' ? 1 : QR.tip === 'eleme' ? Math.max(2, QR.rakip) : QR.rakip;
    const d = DIFF[S.set.zorluk] || DIFF[1];
    const rk = solo ? [] : aiCars(tier, n).map(r => Object.assign(r, { zor: zor * d.z }));
    const tip = QR.tip === 'duello' ? (TRK(QR.pist).tip === 'dongu' ? 'devre' : 'sprint') : QR.tip;
    const hedef = QR.tip === 'kovala' ? { t: 'sure', n: 90 } : QR.tip === 'kacis' ? { t: 'kac', n: Math.max(1, QR.polis) } : null;
    const tur = QR.tip === 'eleme' ? n : QR.tur;
    const cfg = baseCfg({ tip, pist: QR.pist, tur, rakipler: rk, polis: QR.tip === 'kacis' ? Math.max(1, QR.polis) : QR.tip === 'kovala' ? 1 : QR.polis, hedef, hava: QR.hava, saat: QR.saat, zor });
    run({ kind: 'hizli', z: QR.bolge }, cfg);
  }

  // ───────── REKORLAR + HAYALET YARIŞ (v7) ─────────
  function pRekor() {
    const mz = maxZone(), G2 = window.EKSTRA;
    let h = `<div class="pane"><h2>⏱ Rekorlar <small>Hayaletle yarış</small></h2>
      <p>Her pistte en iyi turun (döngüde) ya da en iyi sürenin (sprintte) kaydedilir. <b>Hayaletle Sür</b> dersen rakipsiz, trafiksiz pistte kendi en iyi sürüşünün yarı saydam hayaletine karşı yarışırsın; üstte farkı (+/− sn) görürsün. Rekoru her yarışta kırabilirsin.</p>`;
    V.ZONES.forEach((z, zi) => {
      if (zi > mz) return;
      const ts = V.TRACKS.filter(t => t.bolge === zi && t.tip !== 'duz');
      if (!ts.length) return;
      h += `<h3>${z.ad}</h3><div class="rkl">` + ts.map(t => {
        const r = S.rek[t.id] || {}, gh = G2 && G2.ghostOf(t.id);
        const best = t.tip === 'dongu' ? r.tur : r.sure;
        return `<div class="rk"><div><b>${t.ad}</b><small>${t.tip === 'dongu' ? 'Döngü · en iyi tur' : 'Sprint · en iyi süre'} · ${(t.uzun / 1000).toFixed(1)} km</small></div>
          <div class="rkt">${best ? fmtTime(best) : '—'}${gh ? ' 👻' : ''}</div><button class="btn" onclick="A.ttStart('${t.id}')">${gh ? 'Hayaletle Sür' : 'Süre Koy'} ▶</button></div>`;
      }).join('') + '</div>';
    });
    return h + '</div>';
  }
  function ttStart(id) {
    click();
    const tr = TRK(id);
    const cfg = baseCfg({ tip: tr.tip === 'dongu' ? 'devre' : 'sprint', pist: id, tur: tr.tip === 'dongu' ? 3 : 1, rakipler: [], polis: 0, trafik: 0, saat: tr.bolge === 3 ? 'aksam' : 'gece', zor: 1 });
    cfg.hayalet = true;
    run({ kind: 'zaman', id }, cfg);
  }

  // ───────── SERBEST SÜRÜŞ ─────────
  const FR = { bolge: 2, saat: 'gunduz', hava: 'acik' };
  function pSerbest() {
    const mz = maxZone();
    const o = (k, v, l) => `<div class="o ${FR[k] === v ? 'on' : ''}" onclick="A.fr('${k}',${typeof v === 'string' ? `'${v}'` : v})">${l}</div>`;
    if (FR.bolge > mz) FR.bolge = 0;
    return `<div class="pane"><h2>🌃 Serbest Sürüş <small>${S.ist.km.toFixed(1)} km yol yaptın</small></h2>
      <p>Karaliman'ın büyük çevre yolunda istediğin kadar dolaş. Trafik, devriye arabaları ve takip engelleri var. Bir polisin yanından <b>125 km/s</b> üstünde geçersen kovalamaca başlar; kaçarsan Ün ve para kazanırsın, kovalamaca hedeflerine de sayılır.</p>
      <h3>Bölge</h3><div class="sw">${V.ZONES.map((z, i) => i <= mz ? o('bolge', i, z.ad) : `<div class="o" style="opacity:.4">🔒 ${z.ad}</div>`).join('')}</div>
      <p class="mut">🧩 Her bölgeye ${window.EKSTRA ? EKSTRA.KOL_N : 10} gizli parça saklandı: kestirmelerin içinde, rampaların ardında havada ve yol kenarlarında. Yakına gelince ışık sütunu görünür. Bulunan: ${V.ZONES.map((z, i) => i <= mz ? `<b>${z.ad} ${(S.kol[i] || []).length}/${window.EKSTRA ? EKSTRA.KOL_N : 10}</b>` : '').filter(Boolean).join(' · ')}</p>
      <h3>Saat · Hava</h3><div class="sw">${o('saat', 'gece', '🌙 Gece')}${o('saat', 'aksam', '🌇 Akşam')}${o('saat', 'gunduz', '🌞 Gündüz')} &nbsp; ${o('hava', 'acik', '☀️ Açık')}${o('hava', 'yagmur', '🌧 Yağmur')}${o('hava', 'sis', '🌫 Sis')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn big" onclick="A.frStart()">SÜR ▶</button></div></div>`;
  }
  function fr(k, v) { FR[k] = v; click(); renderPanel(); }
  function frStart() {
    click();
    const Z = V.ZONES[FR.bolge];
    const d = DIFF[S.set.zorluk] || DIFF[1];
    const cfg = {
      tip: 'serbest', pist: { seed: 99 + FR.bolge * 17, tip: 'dongu', uzun: 8000 }, bolge: Z, tur: 1,
      oyuncu: { ad: S.isim || 'Sen', vis: visOf(S.sec), stats: statsFor(S.sec) }, rakipler: [], polis: 0, hava: FR.hava, saat: FR.saat, zor: d.z, trafik: 0.8,
      koleksiyon: { bolge: FR.bolge, have: S.kol[FR.bolge] || (S.kol[FR.bolge] = []) },
      cb: { onFinish: () => { }, onCollect: (id, n, N) => onCollect(FR.bolge, id, N) },
    };
    run({ kind: 'serbest' }, cfg);
  }
  // v7: gizli parça bulundu
  function onCollect(b, id, N) {
    const a = S.kol[b] || (S.kol[b] = []);
    if (a.indexOf(id) >= 0) return;
    a.push(id);
    S.para += 500; S.un += 100; S.ist.kazanc += 500;
    toast(`🧩 Gizli parça ${a.length}/${N} · +500 💰 · +100 🔥`, 'ach');
    if (a.length >= N) {
      S.para += 10000; S.un += 2500; S.ist.kazanc += 10000;
      setTimeout(() => toast(`🏆 <b>${V.ZONES[b].ad}</b> bölgesinin bütün parçaları! +10.000 💰 · +2.500 🔥`, 'ach'), 900);
      unlock('parca1');
    }
    save();
  }
  // serbest sürüşte biten kovalamaca
  window.onFreePursuit = res => {
    if (res.ok) {
      const p = Math.round(res.bounty * 0.25);
      S.un += res.bounty; S.para += p; S.ist.kazanc += p;
      toast(`🚨 Kaçtın! +${fmt(res.bounty)} Ün · +${fmt(p)} 💰`, 'ach');
    } else {
      const fine = Math.min(S.para, 600 + res.heat * 900);
      S.para -= fine; S.ist.yakalanma++;
      S.un += Math.round(res.bounty * 0.5);
      toast(`🚔 Yakalandın! Ceza: -${fmt(fine)} 💰`);
    }
    S.ar.sure = Math.max(S.ar.sure, res.time);
    checkAch(); save();
  };
  window.onStat = (k, n) => {
    if (k === 'kilpayi') { S.ist.kilpayi += n; dailyProg('kilpayi', n); }
    if (k === 'polis') { S.ist.polis += n; S.ar.etkisiz += n; dailyProg('polis', n); }
    if (k === 'engel') { S.ist.engel += n; S.ar.engel += n; }
    if (k === 'barikat') { S.ist.barikat += n; S.ar.barikat += n; }
    if (k === 'ucus') { S.ist.ucus = Math.max(S.ist.ucus || 0, n); if (n >= 60) unlock('ucus'); }
    if (k === 'kacis') { S.ist.kacis++; S.ar.kac = Math.max(S.ar.kac, n); dailyProg('kacis', 1); }
    save();
  };
  window.onAch = id => unlock(id);

  // ───────── MEYDAN OKUMA ─────────
  function pMeydan() {
    const mz = maxZone();
    return `<div class="pane"><h2>🎯 Meydan Okumalar <small>${Object.keys(S.mo).length}/${V.CHALLENGES.length} tamam</small></h2><div class="grid">` +
      V.CHALLENGES.map(c => {
        const tr = TRK(c.pist), lock = tr.bolge > mz;
        return `<div class="card ${S.mo[c.id] ? 'done' : ''} ${lock ? 'lock' : ''}" onclick="A.chStart('${c.id}')"><span class="ik">${V.TYPES[c.tip].ik}</span><div class="t">${c.ad}</div><div class="s">${c.yazi}</div><div class="s">${tr.ad} · ${V.ZONES[tr.bolge].ad}${lock ? ' 🔒' : ''}</div><div class="rw">💰 ${fmt(c.para)}</div></div>`;
      }).join('') + `</div></div>`;
  }
  function challengeOk(c, res) {
    const h = c.hedef, st = res.stats;
    switch (h.t) {
      case 'kilpayi': return st.kilpayi >= h.n && !res.yakalandi;
      case 'puan': return (res.driftTotal || 0) >= h.n;
      case 'toplam': return st.hizToplam >= h.n;
      case 'etkisiz': return st.etkisiz >= h.n;
      case 'mukemmel': return st.mukemmel >= h.n && res.win;
      case 'kac': return res.win;
      case 'temiz': return res.win && st.duvar === 0;
      case 'kalan': return res.win && (res.kalan || 0) >= h.n;
      case 'barikat': return st.barikat >= h.n;
      case 'birinci': return res.win;
    }
    return res.win;
  }
  function chStart(id) {
    click();
    const c = V.CHALLENGES.find(x => x.id === id), tr = TRK(c.pist);
    if (tr.bolge > maxZone()) { toast('🔒 Bu bölge kariyerde henüz açılmadı'); return; }
    const solo = ['gise', 'drift', 'kovala', 'kacis'].includes(c.tip);
    const d = DIFF[S.set.zorluk] || DIFF[1];
    const n = c.rakipSay || (c.tip === 'drag' ? 3 : 4);
    const rk = solo ? [] : aiCars(Math.min(9, tr.bolge * 2), n).map(r => Object.assign(r, { zor: 0.86 * d.z }));
    const hedef = c.tip === 'kovala' ? c.hedef : c.tip === 'kacis' ? { t: 'kac', n: c.isi || 3 } : c.tip === 'drift' ? c.hedef : null;
    const cfg = baseCfg({ tip: c.tip, pist: c.pist, tur: c.tur || (c.tip === 'devre' ? 2 : c.tip === 'eleme' ? n : 2), rakipler: rk, polis: c.isi || (c.tip === 'kovala' ? 1 : 0), hedef, zor: 0.86 });
    if (c.hedef.t === 'kilpayi') cfg.trafik = 1;
    run({ kind: 'meydan', ch: c }, cfg);
  }

  // ───────── GARAJ ─────────
  let gTab = 'arabalar', gSub = 'boya', draft = null;
  function garajRevert() { if (draft) { draft = null; Y.setShowCar(visOf(S.sec)); } }
  function pGaraj() {
    const tabs = [['arabalar', '🚗 Arabalarım'], ['galeri', '🏪 Galeri'], ['perf', '⚙️ Performans'], ['gorunum', '🎨 Görünüm']];
    let h = `<div class="pane"><div class="tabs">${tabs.map(([id, l]) => `<div class="tb ${gTab === id ? 'on' : ''}" onclick="A.gt('${id}')">${l}</div>`).join('')}</div>`;
    h += ({ arabalar: gArabalar, galeri: gGaleri, perf: gPerf, gorunum: gGorunum })[gTab]();
    return h + '</div>';
  }
  function gt(id) { if (gTab === 'gorunum' && id !== 'gorunum') garajRevert(); gTab = id; click(); renderPanel(); }
  function statBars(st, base) {
    const row = (l, v, mx, b, txt) => `<div class="st"><span style="text-align:left">${l}</span><div class="b">${b != null && b < v ? `<u style="left:${b / mx * 100}%;width:${(v - b) / mx * 100}%"></u>` : ''}<i style="width:${Math.min(b != null ? Math.min(b, v) : v, mx) / mx * 100}%"></i></div><span>${txt}</span></div>`;
    return row('Hız', st.hiz, 380, base && base.hiz, Math.round(st.hiz)) + row('İvme', 10 / st.ivme, 4.2, base && 10 / base.ivme, st.ivme.toFixed(1) + 's') + row('Tutuş', st.tutus, 1.6, base && base.tutus, st.tutus.toFixed(2)) + row('Nitro', st.nitro, 2.2, base && base.nitro, st.nitro.toFixed(2));
  }
  function gArabalar() {
    const ids = Object.keys(S.arabalar);
    return `<div class="grid">` + ids.map(id => {
      const c = CAR(id), st = statsFor(id);
      return `<div class="card ${S.sec === id ? 'sel' : ''}" onclick="A.selCar('${id}')"><div class="t">${c.ad} <span class="tag ${c.sinif}">${c.sinif}</span></div><div class="s">Performans: ${perf(st)}</div>${statBars(st)}</div>`;
    }).join('') + `</div>` + (ids.length > 1 && !CAR(S.sec).ozel && S.sec !== 'serce' ? `<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn alt sm" onclick="A.sellCar()">Seçili arabayı sat (${fmt(sellPrice(S.sec))} 💰)</button></div>` : '');
  }
  function sellPrice(id) {
    const c = CAR(id), mul = V.CLASS_MUL[c.sinif];
    let p = c.fiyat * 0.5;
    for (const k in S.arabalar[id].parca) for (let l = 1; l <= S.arabalar[id].parca[k]; l++) p += V.PART_COST[l] * mul * 0.3;
    return Math.round(p / 100) * 100;
  }
  function selCar(id) { S.sec = id; save(); click(); Y.setShowCar(visOf(id)); renderPanel(); }
  function sellCar() {
    const id = S.sec; if (Object.keys(S.arabalar).length < 2) return;
    confirmBox(`${CAR(id).ad} satılsın mı? ${fmt(sellPrice(id))} 💰 alacaksın.`, 'Sat', () => {
      S.para += sellPrice(id); delete S.arabalar[id]; S.sec = Object.keys(S.arabalar)[0];
      saveNow(); SES.sfx('buy'); Y.setShowCar(visOf(S.sec)); renderTop(); renderPanel();
    });
  }
  function gGaleri() {
    const list = V.CARS.filter(c => !S.arabalar[c.id] && c.ozel !== 'kuzgun' && c.ozel !== 'kobra').sort((a, b) => a.fiyat - b.fiyat);
    if (!list.length) return '<p class="mut">Galerideki her şey senin! 👑</p>';
    return `<div class="grid">` + list.map(c => {
      const ok = carBuyable(c), st = Y.statsOf(c, {});
      const why = c.ozel === 'son' ? 'Hikâyeyi bitir' : `#${{ C: 9, B: 7, A: 5, S: 3 }[c.sinif]} rakibi yen`;
      return `<div class="card ${ok ? '' : 'lock'}" onclick="A.prevCar('${c.id}')"><div class="t">${c.ad} <span class="tag ${c.sinif}">${c.sinif}</span></div><div class="s">${c.yazi}</div>${statBars(st)}<div class="row" style="justify-content:space-between;margin-top:6px"><span class="price">${fmt(c.fiyat)} 💰</span>${ok ? `<button class="btn sm ${S.para < c.fiyat ? 'off' : ''}" onclick="event.stopPropagation();A.buyCar('${c.id}')">SATIN AL</button>` : `<span class="mut" style="font-size:12px">🔒 ${why}</span>`}</div></div>`;
    }).join('') + `</div>`;
  }
  function prevCar(id) { const c = CAR(id); Y.setShowCar({ model: id, govde: c.govde, renk: c.renk, kaplama: V.FINISH[1], jant: V.RIMS[0], jantRenk: '#c8ccd4', cam: 1 }); click(); setTimeout(() => { if (cur === 'garaj' && gTab === 'galeri') { } }, 0); }
  function buyCar(id) {
    const c = CAR(id);
    if (!carBuyable(c) || S.para < c.fiyat) { SES.sfx('deny'); return; }
    S.para -= c.fiyat; S.arabalar[id] = newCar(id); S.sec = id;
    saveNow(); SES.sfx('buy'); toast(`🚗 ${c.ad} garajında!`, 'ach');
    checkAch(); Y.setShowCar(visOf(id)); gTab = 'arabalar'; renderTop(); renderPanel();
  }
  function gPerf() {
    const id = S.sec, c = CAR(id), my = S.arabalar[id], mul = V.CLASS_MUL[c.sinif];
    const st = statsFor(id), base = Y.statsOf(c, {});
    let h = `<div class="t" style="font-weight:800;font-size:16px;margin-bottom:6px">${c.ad} <span class="tag ${c.sinif}">${c.sinif}</span> <span class="mut" style="font-size:13px">Performans ${perf(st)}</span></div>${statBars(st, base)}<div style="height:8px"></div>`;
    for (const p of V.PARTS) {
      const lv = my.parca[p.id] || 0, nx = lv + 1, cost = nx <= 4 ? Math.round(V.PART_COST[nx] * mul / 50) * 50 : 0;
      h += `<div class="part"><span class="ik">${p.ik}</span><div><div class="nm">${p.ad} · <span class="mut" style="font-weight:700">${V.PART_LV[lv]}</span></div><div class="ds">${p.yazi}</div><div class="pips">${[1, 2, 3, 4].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</div></div>
        ${nx <= 4 ? `<button class="btn sm ${S.para < cost ? 'off' : ''}" onclick="A.buyPart('${p.id}')">${V.PART_LV[nx]}<br><small>${fmt(cost)} 💰</small></button>` : '<span class="ok" style="color:var(--grn);font-weight:800">MAKS</span>'}</div>`;
    }
    return h;
  }
  function buyPart(pid) {
    const id = S.sec, c = CAR(id), my = S.arabalar[id], lv = my.parca[pid] || 0;
    if (lv >= 4) return;
    const cost = Math.round(V.PART_COST[lv + 1] * V.CLASS_MUL[c.sinif] / 50) * 50;
    if (S.para < cost) { SES.sfx('deny'); return; }
    S.para -= cost; my.parca[pid] = lv + 1;
    if (V.PARTS.every(p => (my.parca[p.id] || 0) >= 4)) unlock('efsane');
    saveNow(); SES.sfx('buy'); renderTop(); renderPanel();
  }
  // görünüm: taslak üzerinde dene, "Uygula" ile öde
  function gGorunum() {
    const id = S.sec, my = S.arabalar[id];
    if (!draft) draft = JSON.parse(JSON.stringify(my.gor));
    const subs = [['boya', 'Boya'], ['jant', 'Jant'], ['kit', 'Gövde Kiti'], ['spoiler', 'Rüzgârlık'], ['neon', 'Neon'], ['vinyl', 'Desen'], ['cam', 'Cam']];
    let h = `<div class="tabs">${subs.map(([k, l]) => `<div class="tb ${gSub === k ? 'on' : ''}" onclick="A.gs('${k}')">${l}</div>`).join('')}</div>`;
    const own = k => my.sahip[k] || false;
    const pr = (k, p) => p && !own(k) ? `<small>${fmt(p)} 💰</small>` : '<small style="color:var(--grn)">✓</small>';
    if (gSub === 'boya') {
      h += `<h3>Renk <span class="price">${fmt(V.PAINT_PRICE)} 💰</span></h3><div class="sw">${V.PAINTS.map(([c, n]) => `<div class="c ${draft.renk === c ? 'on' : ''}" style="background:${c}" title="${n}" onclick="A.dr('renk','${c}')"></div>`).join('')}</div>
        <h3>Kaplama</h3><div class="sw">${V.FINISH.map(f => `<div class="o ${draft.kaplama === f.id ? 'on' : ''}" onclick="A.dr('kaplama','${f.id}')">${f.ad}${pr('kap' + f.id, f.fiyat)}</div>`).join('')}</div>`;
    } else if (gSub === 'jant') {
      h += `<h3>Model</h3><div class="sw">${V.RIMS.map(r => `<div class="o ${draft.jant === r.id ? 'on' : ''}" onclick="A.dr('jant',${r.id})">${r.ad}${pr('jant' + r.id, r.fiyat)}</div>`).join('')}</div>
        <h3>Renk <span class="price">${fmt(V.RIMCOL_PRICE)} 💰</span></h3><div class="sw">${V.RIM_COLORS.map(([c, n], i) => `<div class="c ${draft.jantRenk === i ? 'on' : ''}" style="background:${c}" title="${n}" onclick="A.dr('jantRenk',${i})"></div>`).join('')}</div>`;
    } else if (gSub === 'kit') h += `<div class="sw">${V.KITS.map(k => `<div class="o ${draft.kit === k.id ? 'on' : ''}" onclick="A.dr('kit',${k.id})">${k.ad}${pr('kit' + k.id, k.fiyat)}</div>`).join('')}</div>`;
    else if (gSub === 'spoiler') h += `<div class="sw">${V.SPOILERS.map(k => `<div class="o ${draft.spoiler === k.id ? 'on' : ''}" onclick="A.dr('spoiler',${k.id})">${k.ad}${pr('spl' + k.id, k.fiyat)}</div>`).join('')}</div>`;
    else if (gSub === 'neon') h += `<p class="mut" style="font-size:12.5px">Gece yarışlarında aracın altını aydınlatır.</p><div class="sw">${V.NEONS.map(([c, n], i) => `<div class="o ${draft.neon === i ? 'on' : ''}" onclick="A.dr('neon',${i})" style="${c ? 'border-color:' + c : ''}">${n}${pr('neon' + i, i ? V.NEON_PRICE : 0)}</div>`).join('')}</div>`;
    else if (gSub === 'vinyl') h += `<div class="sw">${V.VINYLS.map(k => `<div class="o ${draft.vinyl === k.id ? 'on' : ''}" onclick="A.dr('vinyl',${k.id})">${k.ad}${pr('vin' + k.id, k.fiyat)}</div>`).join('')}</div>
        <h3>Desen rengi</h3><div class="sw">${['#ffffff', '#111111', '#ff2e63', '#00e5ff', '#ffd600', '#00e676', '#ff6d00', '#7c4dff'].map(c => `<div class="c ${draft.aksan === c ? 'on' : ''}" style="background:${c}" onclick="A.dr('aksan','${c}')"></div>`).join('')}</div>`;
    else if (gSub === 'cam') h += `<div class="sw">${V.TINTS.map(([v, n]) => `<div class="o ${draft.cam === v ? 'on' : ''}" onclick="A.dr('cam',${v})">${n}${pr('cam' + v, v ? V.TINT_PRICE : 0)}</div>`).join('')}</div>`;
    const cost = draftCost();
    const changed = JSON.stringify(draft) !== JSON.stringify(my.gor);
    h += `<div class="row" style="justify-content:space-between;margin-top:14px;border-top:1px solid var(--line);padding-top:10px"><span>Toplam: <span class="price">${fmt(cost)} 💰</span></span><div class="row"><button class="btn alt sm ${changed ? '' : 'off'}" onclick="A.drUndo()">Geri al</button><button class="btn ${changed && S.para >= cost ? '' : 'off'}" onclick="A.drApply()">UYGULA</button></div></div>`;
    return h;
  }
  function gs(k) { gSub = k; click(); renderPanel(); }
  function dr(k, v) { draft[k] = v; click(); Y.setShowCar(visOf(S.sec, draft)); renderPanel(); }
  function draftCost() {
    const my = S.arabalar[S.sec], g = my.gor, d = draft; let c = 0;
    const own = k => my.sahip[k];
    if (d.renk !== g.renk) c += V.PAINT_PRICE;
    if (d.kaplama !== g.kaplama && !own('kap' + d.kaplama)) c += V.FINISH.find(f => f.id === d.kaplama).fiyat;
    if (d.jant !== g.jant && !own('jant' + d.jant)) c += V.RIMS[d.jant].fiyat;
    if (d.jantRenk !== g.jantRenk) c += V.RIMCOL_PRICE;
    if (d.kit !== g.kit && !own('kit' + d.kit)) c += V.KITS[d.kit].fiyat;
    if (d.spoiler !== g.spoiler && !own('spl' + d.spoiler)) c += V.SPOILERS[d.spoiler].fiyat;
    if (d.neon !== g.neon && d.neon && !own('neon' + d.neon)) c += V.NEON_PRICE;
    if (d.vinyl !== g.vinyl && !own('vin' + d.vinyl)) c += V.VINYLS[d.vinyl].fiyat;
    if (d.aksan !== g.aksan) c += 300;
    if (d.cam !== g.cam && d.cam && !own('cam' + d.cam)) c += V.TINT_PRICE;
    return c;
  }
  function drApply() {
    const my = S.arabalar[S.sec], cost = draftCost();
    if (S.para < cost) { SES.sfx('deny'); return; }
    S.para -= cost;
    const d = draft;
    Object.assign(my.sahip, { ['kap' + d.kaplama]: 1, ['jant' + d.jant]: 1, ['kit' + d.kit]: 1, ['spl' + d.spoiler]: 1, ['neon' + d.neon]: 1, ['vin' + d.vinyl]: 1, ['cam' + d.cam]: 1 });
    my.gor = JSON.parse(JSON.stringify(d));
    saveNow(); SES.sfx('buy'); toast('🎨 Yeni görünüm uygulandı'); renderTop(); renderPanel();
  }
  function drUndo() { draft = JSON.parse(JSON.stringify(S.arabalar[S.sec].gor)); Y.setShowCar(visOf(S.sec)); click(); renderPanel(); }

  // ───────── GÜNLÜK ─────────
  const DAILY_R = [1000, 1500, 2000, 3000, 4000, 5000, 10000];
  const DTASK = [
    { t: 'kazan', ad: '{n} yarış kazan', n: [2, 3, 4], p: 1500 },
    { t: 'polis', ad: '{n} polis aracını devre dışı bırak', n: [2, 4, 6], p: 2000 },
    { t: 'kilpayi', ad: '{n} kıl payı geçiş yap', n: [5, 10, 15], p: 1500 },
    { t: 'drift', ad: 'Toplam {n} drift puanı topla', n: [5000, 10000, 20000], p: 1800 },
    { t: 'km', ad: '{n} km yol yap', n: [10, 20, 30], p: 1200 },
    { t: 'kacis', ad: '{n} kovalamacadan kaç', n: [1, 2, 3], p: 2500 },
  ];
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function ensureDaily() {
    const g = S.gun, t = today();
    if (g.gtarih !== t) {
      g.gtarih = t;
      const r = window.PIST.rng(Number(t.replace(/-/g, '')));
      const picks = DTASK.slice().sort(() => r() - 0.5).slice(0, 3);
      g.gorev = picks.map(x => { const lv = Math.floor(r() * 3); return { t: x.t, n: x.n[lv], p: x.p * (1 + lv * 0.5), have: 0, ok: 0 }; });
      save();
    }
  }
  function gunlukDot() { ensureDaily(); return S.gun.alindi !== today() || S.gun.gorev.some(g => g.have >= g.n && !g.ok); }
  function dailyProg(t, n) { ensureDaily(); for (const g of S.gun.gorev) if (g.t === t && !g.ok) g.have = Math.min(g.n, g.have + n); }
  function pGunluk() {
    ensureDaily();
    const g = S.gun, can = g.alindi !== today();
    const day = can ? (g.seri % 7) : ((g.seri - 1) % 7 + 7) % 7;
    let h = `<div class="pane"><h2>📅 Günlük Giriş <small>Seri: ${g.seri} gün</small></h2><div class="grid sm">` +
      DAILY_R.map((r, i) => `<div class="card ${i < day || (!can && i === day) ? 'done' : ''} ${i === day && can ? 'sel' : ''}" style="text-align:center;cursor:default"><div class="s">${i + 1}. gün</div><div class="t">${fmt(r)} 💰</div></div>`).join('') +
      `</div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn ${can ? '' : 'off'}" onclick="A.claimDaily()">${can ? 'ÖDÜLÜ AL' : 'Yarın tekrar gel'}</button></div></div>`;
    h += `<div class="pane"><h2>📋 Günün Görevleri</h2>` + g.gorev.map((x, i) => {
      const d = DTASK.find(k => k.t === x.t);
      const txt = d.ad.replace('{n}', fmt(x.n));
      return `<div class="part"><span class="ik">${x.ok ? '✅' : '🎯'}</span><div><div class="nm">${txt}</div><div class="prog" style="margin-top:5px"><i style="width:${x.have / x.n * 100}%"></i></div><div class="ds">${fmt(Math.floor(x.have))} / ${fmt(x.n)}</div></div>${x.ok ? '<span style="color:var(--grn);font-weight:800">ALINDI</span>' : `<button class="btn sm ${x.have >= x.n ? 'yel' : 'off'}" onclick="A.claimTask(${i})">${fmt(x.p)} 💰</button>`}</div>`;
    }).join('') + `</div>`;
    return h;
  }
  function claimDaily() {
    const g = S.gun, t = today();
    if (g.alindi === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yest = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    if (g.alindi !== yest) g.seri = 0;
    const r = DAILY_R[g.seri % 7];
    g.seri++; g.alindi = t; S.para += r;
    saveNow(); SES.sfx('buy'); toast(`📅 +${fmt(r)} 💰`, 'ach'); renderTop(); renderNav(); renderPanel();
  }
  function claimTask(i) {
    const x = S.gun.gorev[i]; if (!x || x.ok || x.have < x.n) return;
    x.ok = 1; S.para += Math.round(x.p);
    saveNow(); SES.sfx('buy'); toast(`🎯 +${fmt(x.p)} 💰`, 'ach'); renderTop(); renderNav(); renderPanel();
  }

  // ───────── BAŞARIMLAR ─────────
  function unlock(id) {
    if (S.bas[id]) return;
    const a = V.ACHS.find(x => x.id === id); if (!a) return;
    S.bas[id] = Date.now(); S.para += 2000;
    toast(`${a.ik} Başarım: <b>${a.ad}</b> (+2.000 💰)`, 'ach'); SES.sfx('level');
    save();
  }
  function checkAch() {
    const i = S.ist, n = Object.keys(S.arabalar).length;
    if (i.gal >= 1) unlock('ilk'); if (i.gal >= 10) unlock('on'); if (i.gal >= 50) unlock('elli');
    if (i.kacis >= 1) unlock('kac1'); if (S.ar.kac >= 5) unlock('kac5');
    if (i.polis >= 25) unlock('pol10'); if (i.polis >= 100) unlock('pol100');
    if (i.engel >= 10) unlock('engel'); if (i.enHiz >= 300) unlock('hiz300'); if (i.kilpayi >= 100) unlock('kil');
    if (n >= 5) unlock('garaj5'); if (n >= 10) unlock('garaj10');
    if (S.kar.rakip <= 5) unlock('liste5'); if (S.kar.rakip <= 0) unlock('liste1');
    if (i.kazanc >= 1e6) unlock('milyon'); if (S.un >= 50000) unlock('un'); if (i.km >= 20) unlock('serbest'); if ((i.kestirme || 0) >= 20) unlock('kestirme');
  }
  function pBasarim() {
    const i = S.ist;
    return `<div class="pane"><h2>🏆 Başarımlar <small>${Object.keys(S.bas).length}/${V.ACHS.length}</small></h2><div class="grid">` +
      V.ACHS.map(a => `<div class="card ${S.bas[a.id] ? 'done' : 'lock'}" style="cursor:default"><span class="ik">${a.ik}</span><div class="t">${a.ad}</div><div class="s">${a.yazi}</div></div>`).join('') + `</div></div>
      <div class="pane"><h2>📊 İstatistikler</h2><div class="grid sm">${stat('Yarış', i.yaris)}${stat('Galibiyet', i.gal)}${stat('En yüksek hız', Math.round(i.enHiz) + ' km/s')}${stat('Toplam yol', i.km.toFixed(1) + ' km')}${stat('Kıl payı', i.kilpayi)}${stat('Drift puanı', fmt(i.drift))}${stat('Kaçış', i.kacis)}${stat('Kestirme', i.kestirme || 0)}${stat('En uzun uçuş', (i.ucus || 0) + ' m')}${stat('Polis', i.polis)}${stat('Toplam kazanç', fmt(i.kazanc) + ' 💰')}${stat('Ün', fmt(S.un))}</div></div>`;
  }

  // ───────── AYARLAR ─────────
  function pAyar() {
    const s = S.set;
    const o = (k, v, l) => `<div class="o ${s[k] === v ? 'on' : ''}" onclick="A.set('${k}',${typeof v === 'string' ? `'${v}'` : v})">${l}</div>`;
    return `<div class="pane"><h2>⚙️ Ayarlar</h2>
      <h3>Kontrol</h3><div class="sw">${o('kontrol', 'dokun', '👆 Dokun-kaydır')}${o('kontrol', 'egme', '📱 Telefonu eğ')}</div>
      ${s.kontrol === 'egme' ? `<h3>Eğme hassasiyeti</h3><div class="sw">${o('hassas', 0.7, 'Düşük')}${o('hassas', 1, 'Orta')}${o('hassas', 1.4, 'Yüksek')}</div>` : ''}
      <h3>Otomatik gaz</h3><div class="sw">${o('otoGaz', false, 'Kapalı')}${o('otoGaz', true, 'Açık (fren basınca durur)')}</div>
      <h3>Sürüş yardımı</h3><div class="sw">${o('yardim', 0, 'Kapalı')}${o('yardim', 1, 'Az')}${o('yardim', 2, 'Orta')}${o('yardim', 3, 'Çok')}</div>
      <h3>Zorluk</h3><div class="sw">${DIFF.map((d, i) => o('zorluk', i, d.ad)).join('')}</div>
      <h3>Kamera</h3><div class="sw">${o('kamera', 0, 'Yakın')}${o('kamera', 1, 'Uzak')}${o('kamera', 2, 'Tampon')}</div>
      <h3>Grafik</h3><div class="sw">${o('q', 0, 'Düşük')}${o('q', 1, 'Orta')}${o('q', 2, 'Yüksek')}</div>
      <h3>Efektler</h3><div class="sw">${o('efekt', 0, 'Az')}${o('efekt', 1, 'Orta')}${o('efekt', 2, 'Çok')}</div>
      <h3>Ses efektleri</h3><div class="sw">${[0, 0.4, 0.8, 1].map(v => o('ses', v, v ? Math.round(v * 100) + '%' : 'Kapalı')).join('')}</div>
      <h3>Müzik</h3><div class="sw">${[0, 0.3, 0.5, 0.8].map(v => o('muzik', v, v ? Math.round(v * 100) + '%' : 'Kapalı')).join('')}</div>
      <h3>Titreşim</h3><div class="sw">${o('titresim', true, 'Açık')}${o('titresim', false, 'Kapalı')}</div>
      <h3>Sürücü adı</h3><div class="row"><span>${S.isim || '(yok)'}</span><button class="btn alt sm" onclick="A.askName()">Değiştir</button></div>
      <h3>Kayıt</h3><div class="row"><button class="btn alt sm" onclick="A.backup()">Yedek dosyası kaydet</button><button class="btn alt sm" onclick="A.resetAll()" style="color:var(--red)">Kariyeri sıfırla</button></div>
      <p class="mut" style="font-size:12px;margin-top:14px">Gece Kaçağı v${VER} · Tüm arabalar, karakterler ve şehir kurgusaldır. Three.js (MIT) kullanır. Dokular, gökyüzü fotoğrafları ve sokak modelleri: Poly Haven (CC0). Süper araba modeli: “Car Concept”, Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0 (logolar çıkarıldı, sadeleştirildi, boyası değiştirildi). Diğer araba, polis ve trafik modelleri: Daniel Zhabotinsky (sketchfab.com/DanielZhabotinsky), CC BY 4.0 (rozetler ve plakalar çıkarıldı, polis kaplaması değiştirildi, boyalar oyunda yeniden renklendirildi). Reklam yok, internet gerekmez.</p></div>`;
  }
  function set(k, v) {
    S.set[k] = v; click(); save(); applyOpts();
    if (k === 'q') { Y.setQuality(v); Y.setShowCar(visOf(S.sec)); }
    renderPanel();
  }
  function applyOpts() {
    const s = S.set, o = Y.opt;
    o.tilt = s.kontrol === 'egme'; o.tiltSens = s.hassas; o.autoGas = s.otoGaz; o.assist = [0, 0.3, 0.55, 0.8][s.yardim]; o.cam = s.kamera; o.vib = s.titresim; o.fx = s.efekt;
    SES.setVol(s.ses, s.muzik);
  }
  window.onCam = m => { S.set.kamera = m; save(); };
  window.onLowFps = f => {
    if (S.set.q < 2) return;
    S.set.q = 1; save(); Y.setQuality(1);
    toast('⚙️ Telefon zorlandı (' + Math.round(f) + ' kare/sn): grafik Orta\'ya alındı. Ayarlar\'dan değiştirebilirsin.');
  };
  function askName() {
    modal(`<h2>Sürücü adın</h2><p class="mut">Hikâyede ve yarışlarda görünür.</p><input id="nmIn" maxlength="14" value="${(S.isim || '').replace(/"/g, '')}" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--line);background:#1a1830;color:#fff;font:inherit;font-size:18px;user-select:text;-webkit-user-select:text"><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" id="nmOk">Tamam</button></div>`);
    const inp = $('nmIn'); setTimeout(() => inp.focus(), 50);
    $('nmOk').onclick = () => { S.isim = inp.value.trim().slice(0, 14); save(); closeModal(); renderPanel(); };
  }
  function backup() {
    const txt = JSON.stringify(S), name = 'GeceKacagi-yedek-' + today() + '.txt';
    if (BR && BR.saveFile) { const p = BR.saveFile(name, txt); toast(p ? '💾 Kaydedildi: ' + p : 'Kaydedilemedi'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = name; a.click();
    toast('💾 Yedek indirildi');
  }
  function resetAll() {
    confirmBox('Bütün ilerleme, arabalar ve para silinecek.', 'SIFIRLA', () => {
      localStorage.removeItem(KEY); S = fresh(); saveNow(); location.reload();
    });
  }

  // ───────── DURAKLAT ─────────
  let isPaused = false;
  function paused(v) {
    isPaused = v; Y.pause(v);
    $('pause').classList.toggle('on', v);
  }
  window.onPauseReq = () => { if (!Y.active || (Y.R && Y.R.finished)) return; paused(!isPaused); };
  $('pResume').onclick = () => { click(); paused(false); };
  $('pRestart').onclick = () => { click(); paused(false); restart(); };
  $('pCam').onclick = () => { click(); const r = Y.R; if (r) { r.camMode = (r.camMode + 1) % 3; S.set.kamera = r.camMode; save(); toast('🎥 ' + ['Yakın', 'Uzak', 'Tampon'][r.camMode]); } };
  $('pQuit').onclick = () => {
    click(); paused(false);
    const q = Y.quit();
    if (lastRun && lastRun.meta.kind === 'serbest' && q) { S.ist.km += q.stats.mesafe / 1000; dailyProg('km', q.stats.mesafe / 1000); S.ist.enHiz = Math.max(S.ist.enHiz, q.stats.enHiz); checkAch(); saveNow(); }
    Y.stopRace(); goMenu();
  };
  window.__onBack = () => {
    if ($('modal').classList.contains('on')) { closeModal(); return true; }
    if (Y.active) { if (!(Y.R && Y.R.finished)) paused(!isPaused); return true; }
    if ($('dlg').classList.contains('on')) { $('dlgSkip').click(); return true; }
    if ($('menu').classList.contains('on') && cur !== 'kariyer') { tab('kariyer'); return true; }
    return false;
  };
  window.__pause = () => { if (Y.active && !isPaused && !(Y.R && Y.R.finished)) paused(true); try { SES.ctx && SES.ctx.suspend(); } catch (e) { } saveNow(); };
  window.__resume = () => { try { SES.ctx && SES.ctx.resume(); } catch (e) { } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.__pause(); else window.__resume(); });

  function hint() {
    modal(`<h2>Nasıl oynanır?</h2>
      <p>👆 <b>Sol alt:</b> parmağını koy ve sağa sola kaydır — direksiyon.<br>🟢 <b>GAZ</b> · 🔴 <b>FREN</b> (durunca geri vites)<br>🔵 <b>NİTRO:</b> virajda kayarak, kıl payı geçişlerle ve mükemmel viteslerle dolar.<br>⚪ <b>EL FRENİ:</b> virajda basılı tut, kay, drift puanı topla.<br>🟡 <b>ODAK:</b> zamanı yavaşlatır.</p>
      <p>🔀 Sarı <b>KESTİRME</b> tabelalarını gör: yolun o kenarına sür, ara sokağa gir, mesafe kazan (polis de seni orada göremez). 🛫 Rampalardan ve tepelerden hızla geç, havada kaldıkça nitro dolar.</p>
      <p>🚨 Polisten kaçmak için uzaklaş, sarı halkalı <b>takip engellerinin</b> içinden geç, barikatlarda boşluğu bul. Kaçış çubuğu dolunca gizlen.</p>
      <p class="mut">Ayarlar'dan otomatik gaz, eğerek sürüş ve sürüş yardımını değiştirebilirsin.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" onclick="A.closeModal()">Anladım</button></div>`);
  }

  // ───────── AÇILIŞ ─────────
  function pickQuality() {
    if (S.set.q >= 0) return S.set.q;
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    const q = mem <= 3 || cores <= 4 ? 0 : mem < 6 || cores < 8 ? 1 : 2;
    S.set.q = q; save();
    return q;
  }
  function boot() {
    load();
    $('ver').textContent = 'v' + VER;
    let ok = false;
    try { ok = Y.init($('gl'), document.body, pickQuality()); } catch (e) { console.error(e); }
    if (!ok) { document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#fff">Bu cihazda 3B grafik (WebGL) açılamadı. 😔</div>'; return; }
    applyOpts();
    Y.showroom(visOf(S.sec), 'menu');
    let ready = false;
    $('tapStart').textContent = 'YÜKLENİYOR… %0';
    const done = () => { ready = true; Y.showroom(visOf(S.sec), 'menu'); $('tapStart').textContent = S.ilk ? 'YENİ OYUN — DOKUN' : 'DEVAM ET — DOKUN'; };
    // gerçek araba modelleri: önce seçili araba, sonra kalanlar arka planda; yüklenen araba vitrindeyse yenilenir
    const VR = window.VARLIK;
    const sonra = () => { if (VR.ARABALAR && VR.ARABALAR.includes(S.sec)) return VR.loadCar(S.sec); };
    if (VR) {
      VR.onCar = id => { if (Y.carReady) Y.carReady(id); };
      VR.load(f => { $('tapStart').textContent = 'YÜKLENİYOR… %' + Math.round(f * 100); })
        .then(sonra).then(() => { done(); VR.preloadCars && VR.preloadCars(); }, e => { console.warn('gerçek varlıklar yüklenemedi', e); done(); });
    }
    else done();
    $('title').addEventListener('click', () => {
      if (!ready) return;
      SES.unlock(); SES.sfx('go');
      if (S.ilk) {
        S.ilk = false; save();
        story(V.STORY.giris, () => startEv('k10_0'));
      } else goMenu('kariyer');
    });
    // ilk dokunuşta sesi aç
    document.addEventListener('pointerdown', () => SES.unlock(), { once: true });
  }

  window.A = { tab, ttStart, startEv, rivalRace, finalEscape, rivInfo, closeModal, qr, qrStart, fr, frStart, chStart, gt, selCar, sellCar, prevCar, buyCar, buyPart, gs, dr, drApply, drUndo,
    claimDaily, claimTask, set, askName, backup, resetAll, replayStory, get S() { return S; }, goMenu, _events: EVENTS };
  boot();
})();
