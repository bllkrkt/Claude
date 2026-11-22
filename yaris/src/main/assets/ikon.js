// Gece Kaçağı v8 — oyunun kendi simge seti (emoji yerine). 24×24 çizgi simgeler, renk currentColor ya da simgenin rengi.
// Kaynakta emoji yazmak = simge kullanmak: ekrana giren her yazıdaki emoji IKON.h() ile SVG'ye çevrilir
// (sayfadaki değişiklikleri bir MutationObserver izler). EŞLEMEDE OLMAYAN EMOJİ EKLEME — test (yaris-e2e) yakalar.
(function (G) {
  'use strict';
  const D = 'stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="currentColor" stroke="none"';
  const p = (d, f) => `<path d="${d}" ${f ? F : ''}/>`;
  const c = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" ${f ? F : ''}/>`;
  const checker = () => { let s = ''; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) s += `<rect x="${5 + i * 3.5}" y="${4 + j * 2.5}" width="3.5" height="2.5" ${F}/>`; return s; };
  // ad: [içerik, renk]
  const S = {
    para: [p('M9.5 3h5l-1.5 3h-2z') + p('M8 7h8c2.5 2 4 5 4 8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5c0-3 1.5-6 4-8z') + p('M14 11.6c-.5-.8-1.2-1.1-2-1.1-1.2 0-2 .6-2 1.4 0 2 4 1 4 3 0 .8-.8 1.4-2 1.4-.8 0-1.6-.3-2-1M12 9.6v.9M12 16.3v1'), '#ffc83d'],
    ates: [p('M12 2.5c1 3 5.5 5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.7 1.3-4.4 2.7-5.4.2 1.6 1 2.7 2.1 3.2 0-3.2-.5-5.6.7-8.3z') + p('M12 20a2.3 2.3 0 0 1-2.3-2.3c0-1.5 1.2-2.4 2.3-3.4 1.1 1 2.3 1.9 2.3 3.4A2.3 2.3 0 0 1 12 20z'), '#ff7a2f'],
    liste: [p('M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h3'), '#e8d9b0'],
    sure: [c(12, 13.5, 7.5) + p('M12 13.5V10M10 2.5h4M12 2.5V6M18.5 6.5L20 5'), ''],
    oynat: [p('M8 5l11 7-11 7z', 1), ''],
    geri: [p('M16 5L5 12l11 7z', 1), ''],
    yukari: [p('M12 5l7 13H5z', 1), ''],
    yildiz: [p('M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z', 1), ''],
    yildizA: [p('M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z', 1), '#ffd23f'],
    duraklat: [`<rect x="6" y="5" width="4" height="14" rx="1" ${F}/><rect x="14" y="5" width="4" height="14" rx="1" ${F}/>`, ''],
    atla: [p('M4 5l8 7-8 7zM12 5l8 7-8 7z', 1), ''],
    tekrar: [p('M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5'), ''],
    tamam: [p('M5 12.5l4.5 4.5L19 7.5'), ''],
    tamamY: [c(12, 12, 9.5) + p('M7.5 12.5l3 3 6-6.5'), '#3ddc84'],
    gunes: [c(12, 12, 4) + p('M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8'), '#ffc83d'],
    ay: [p('M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'), '#c9d6ff'],
    aksam: [p('M2 18h20M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M4.5 9.5l2 2M19.5 9.5l-2 2M7 21h10'), '#ff9a5a'],
    sehir: [p('M3 21V11h5v10M8 21V6h6v15M14 21v-8h7v8M10.5 9.5h1M10.5 13h1M10.5 16.5h1M17 16h1M18 3.5a2.2 2.2 0 1 0 2.8 2.8 2 2 0 0 1-2.8-2.8z'), '#9fb4ff'],
    yagmur: [p('M7 15a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 17.8 8.6 3.3 3.3 0 0 1 17 15zM8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2'), '#8fc7ff'],
    sis: [p('M4 7h12M6 11h14M3 15h12M8 19h11'), '#cfd8dc'],
    kilic: [p('M4 4l9.5 9.5M12 15.5l3.5-3.5M14 17l-2.5-2.5M16 16l4 4M20 4l-9.5 9.5M12 15.5L8.5 12M10 17l2.5-2.5M8 16l-4 4'), ''],
    disli: [c(12, 12, 3) + p('M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8') + c(12, 12, 6.8), ''],
    simsek: [p('M13.5 2L4 14h7l-1.5 8L19 10h-7z', 1), '#ffe14d'],
    noktaB: [c(12, 12, 6, 1), '#e6e6e6'], noktaK: [c(12, 12, 6, 1), '#ff4d5a'], noktaS: [c(12, 12, 6, 1), '#ffd23f'],
    noktaY: [c(12, 12, 6, 1), '#3ddc84'], noktaM: [c(12, 12, 6, 1), '#4d9bff'],
    kamera: [p('M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5z'), ''],
    boya: [p('M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z') + c(7.5, 11.5, 1.3, 1) + c(9.8, 7.3, 1.3, 1) + c(14.6, 7.3, 1.3, 1), '#ff6fa5'],
    klaket: [p('M4 10h16v10H4zM4 10l1.6-5.5 14.4 0L18.6 10M10 4.5L8.4 10M15.4 4.5L13.8 10'), ''],
    hedef: [c(12, 12, 9) + c(12, 12, 5) + c(12, 12, 1.6, 1), '#ff5a6e'],
    bayrak: [p('M5 21V4M5 4h14v10H5') + checker(), ''],
    kupa: [p('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z'), '#ffc83d'],
    bariyer: [p('M3 8h18v5H3zM6 13v7M18 13v7M7.5 8l-3 5M13 8l-3 5M18.5 8l-3 5'), '#ffb020'],
    dukkan: [p('M4 10v10h16V10M3 4h18l1 5H2zM10 20v-6h4v6'), ''],
    el: [p('M9 11V5a1.5 1.5 0 0 1 3 0v5M12 9.5a1.5 1.5 0 0 1 3 0v1M15 10a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L4 15.5a1.6 1.6 0 0 1 2.4-2L9 16'), ''],
    tac: [p('M3 8l4.5 4 4.5-7 4.5 7L21 8l-2 11H5zM5 19h14'), '#ffc83d'],
    hayalet: [p('M5 21V11a7 7 0 0 1 14 0v10l-2.3-2-2.4 2-2.3-2-2.4 2-2.3-2z') + c(9.5, 11, 1.2, 1) + c(14.5, 11, 1.2, 1), '#bfe9ff'],
    drift: [p('M3 8.5h10a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7'), '#cfe8ff'],
    disket: [p('M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7'), ''],
    takvim: [p('M4 6h16v15H4zM4 10.5h16M8.5 3v5M15.5 3v5M8 14.5h2M14 14.5h2M8 17.5h2'), ''],
    grafik: [p('M4 20h16M7 17v-6M12 17V7M17 17v-9'), ''],
    pano: [p('M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M8 11h8M8 15h5'), ''],
    kutu: [p('M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5L12 12l9-4.5M12 12v9M7.5 5.2l9 4.6'), '#d9a35a'],
    telefon: [p('M7 2.5h10a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1zM11 18.5h2'), ''],
    foto: [p('M3 8h4l2-3h6l2 3h4v12H3z') + c(12, 13.5, 3.6), ''],
    kestirme: [p('M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.5 4-3.5M13 10.5C14.2 8.5 15.4 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3'), '#ffd23f'],
    dongu: [p('M4 11V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H4M7 21l-3-3 3-3'), ''],
    kontak: [p('M8 15.5a3.5 3.5 0 1 1 0-.01M10.5 13l9-9M16 7.5l2.5 2.5M14 9.5l2 2'), '#ffd600'],
    kart: [p('M5 4h10l4 4v12H5zM9 11l3-3 3 3-3 3z'), '#ff2e63'],
    kilit: [p('M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11M12 15v2'), ''],
    anahtar: [p('M15 3.5a5 5 0 0 0-4.6 6.9l-6.9 6.9a1.9 1.9 0 0 0 2.7 2.7l6.9-6.9A5 5 0 0 0 20.5 9l-3 .5-3-3z'), '#b8c4cf'],
    harita: [p('M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14'), ''],
    uzgun: [c(12, 12, 9) + p('M9 10h.01M15 10h.01M8.5 16.5a4.5 4.5 0 0 1 7 0'), '#ffd23f'],
    gergin: [c(12, 12, 9) + p('M8 13.5h8v3.5H8zM10.7 13.5V17M13.3 13.5V17M9 9.5h.01M15 9.5h.01'), '#ffd23f'],
    polis: [p('M3 16v-3l2-5h14l2 5v3zM3 16v3h3v-3M18 16v3h3v-3M7 12.5h.01M17 12.5h.01M10 4.5h4V8h-4z'), '#6ea8ff'],
    araba: [p('M3 16v-3l2.5-5h13l2.5 5v3zM3 16v2.5h3V16M18 16v2.5h3V16M7 12.5h.01M17 12.5h.01M5.5 11.5h13'), ''],
    spor: [p('M2 16.5l1.5-3.5 5-2.5h6l5 3 2.5 1v2H2zM8.5 10.5l1.5-2.5h4l2 2.5') + c(7, 16.5, 2) + c(17, 16.5, 2), '#ff5a6e'],
    isik: [p('M8 2h8v20H8z') + c(12, 6.5, 1.8) + c(12, 12, 1.8) + c(12, 17.5, 1.8), ''],
    siren: [p('M6 18v-6a6 6 0 0 1 12 0v6M4 18h16v3H4zM12 2v2M3.5 6l1.5 1M20.5 6L19 7M10 12a2 2 0 0 1 2-2'), '#ff4d5a'],
    ucus: [p('M2 20h20M3.5 14.5L6 16l4.5-2.5-4-5 2-1 6.5 3.5 4-2.2a1.5 1.5 0 0 1 1.5 2.6L7 19z'), '#8fd3ff'],
    parca: [p('M5 5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4z'), '#ffcc33'],
    tugla: [p('M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19'), '#e07a5f'],
    kafatasi: [p('M12 3a7 7 0 0 0-7 7c0 2.3 1 4 2.5 5v3h9v-3c1.5-1 2.5-2.7 2.5-5a7 7 0 0 0-7-7zM10 18v3M14 18v3') + c(9.3, 10.5, 1.4, 1) + c(14.7, 10.5, 1.4, 1), ''],
    capa: [c(12, 5, 2.3) + p('M12 7.3V21M8 11h8M4 13a8 8 0 0 0 16 0M4 13l-1.5 2M20 13l1.5 2'), '#56ccf2'],
    makas: [c(6, 6, 3) + c(6, 18, 3) + p('M8.2 8.2L20 20M8.2 15.8L20 4'), ''],
    ok: [p('M4 12h15M13 6l6 6-6 6'), ''],
    lastik: [c(12, 12, 9) + c(12, 12, 3.5) + p('M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21'), ''],
    turbo: [p('M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6 8 8 0 0 1 8-8'), '#8fd3ff'],
    kasirga: [p('M3 5h18M5 9h14M7.5 13h9M9.5 17h5M11 21h2.5'), '#bb6bd9'],
    maske: [p('M4 5c3 1.5 13 1.5 16 0v6a8 8 0 0 1-16 0zM8 10.5c.9-.7 2-.7 3 0M13 10.5c.9-.7 2-.7 3 0M9.5 15a3.5 3.5 0 0 0 5 0'), '#dfe6e9'],
    kosan: [c(14.5, 4, 2) + p('M7 21l3-6 3 2v5M10 15l1.5-6 3.5 2.5 3 .5M11.5 9L8 10l-2 3'), ''],
    yilan: [p('M16 4.5a2.5 2.5 0 0 1 0 5H9a3.5 3.5 0 0 0 0 7h7a2 2 0 0 1 0 4H5M18.5 7h2l1-1M20.5 7l1 1') + c(16.5, 6.5, 0.9, 1), '#e1b12c'],
    civciv: [p('M5.5 14l2.2 2 2.1-2 2.2 2 2.1-2 2.2 2 2.2-2M5.5 14a6.5 6.5 0 0 0 13 0M8.3 10.3a3.7 3.7 0 0 1 7.4 0M15.7 10.3l1.8.5-1.5 1') + c(13.3, 9.3, 0.9, 1), '#f2c94c'],
    memur: [p('M5 9l7-4 7 4-1.5 2h-11zM7.5 11v1.5a4.5 4.5 0 0 0 9 0V11M6 21a6 6 0 0 1 12 0M12 7v.01'), '#2f80ed'],
    telsiz: [p('M4 9h16v12H4zM8 9l9-5.5M7 13h3M7 17h3') + c(15, 15, 2.5), '#9aa5ad'],
    patlama: [p('M12 2l2 6 6-2-3 5 5 3-6 1 1 6-5-4-4 5v-6l-6-1 5-3-3-5 6 2z'), '#ff8a3d'],
    kalp: [p('M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z'), '#b46cff'],
    kisi: [c(12, 8, 4) + p('M4 21a8 8 0 0 1 16 0'), '#ff2e63'],
    sapka: [p('M4 14a8 8 0 0 1 16 0zM4 14h17.5M12 6v.01M9 18.5a3 3 0 0 0 6 0'), '#56ccf2'],
    tilki: [p('M4 4l4 5h8l4-5 1 8-9 9-9-9zM11 16h2M9.5 12.5h.01M14.5 12.5h.01'), '#ff8a3d'],
    stetoskop: [p('M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2') + c(20, 11, 2), '#eb5757'],
    somun: [p('M12 2.5l8 4.6v9.8L12 21.5l-8-4.6V7.1z') + c(12, 12, 3), '#b8c4cf'],
    tuy: [p('M20 4C10 4 5 10 5 19M5 19l3-3M20 4c0 8-5 13-12 13M10.5 13.5l4.5-4.5'), '#e8f1ff'],
  };
  // emoji (ve sembol) → simge adı. Uzun diziler önce eşlenir.
  const E = {
    '💰': 'para', '🔥': 'ates', '📜': 'liste', '⏱': 'sure', '▶': 'oynat', '◀': 'geri', '▲': 'yukari', '★': 'yildiz', '⭐': 'yildizA',
    '❚❚': 'duraklat', '❚': 'duraklat', '⏭': 'atla', '↻': 'tekrar', '✓': 'tamam', '✅': 'tamamY', '☀': 'gunes', '🌞': 'gunes', '🌙': 'ay',
    '🌇': 'aksam', '🌅': 'aksam', '🌃': 'sehir', '🌧': 'yagmur', '🌫': 'sis', '⚔': 'kilic', '⚙': 'disli', '⚡': 'simsek',
    '⚪': 'noktaB', '🔴': 'noktaK', '🟡': 'noktaS', '🟢': 'noktaY', '🔵': 'noktaM', '🎥': 'kamera', '🎨': 'boya', '🎬': 'klaket',
    '🎯': 'hedef', '🏁': 'bayrak', '🏆': 'kupa', '🏗': 'bariyer', '🚧': 'bariyer', '🏪': 'dukkan', '👆': 'el', '👑': 'tac',
    '👻': 'hayalet', '💨': 'drift', '💾': 'disket', '📅': 'takvim', '📊': 'grafik', '📋': 'pano', '📦': 'kutu', '📱': 'telefon',
    '📸': 'foto', '🔑': 'kontak', '🎴': 'kart', '🔀': 'kestirme', '🔁': 'dongu', '🔒': 'kilit', '🔧': 'anahtar', '🗺': 'harita', '😔': 'uzgun', '😬': 'gergin',
    '🚓': 'polis', '🚔': 'polis', '🚗': 'araba', '🏎': 'spor', '🚦': 'isik', '🚨': 'siren', '🛫': 'ucus', '🧩': 'parca', '🧱': 'tugla',
    '🏴‍☠': 'kafatasi', '☠': 'kafatasi', '🏴': 'kafatasi', '⚓': 'capa', '✂': 'makas', '➡': 'ok', '⭕': 'lastik', '🛞': 'lastik',
    '🌀': 'turbo', '🌪': 'kasirga', '🎭': 'maske', '🏃': 'kosan', '🐍': 'yilan', '🐣': 'civciv', '👮‍♀': 'memur', '👮': 'memur',
    '📻': 'telsiz', '💥': 'patlama', '💜': 'kalp', '🧑': 'kisi', '🧢': 'sapka', '🦊': 'tilki', '🩺': 'stetoskop', '🔩': 'somun', '🪶': 'tuy',
  };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RX = new RegExp('(?:' + Object.keys(E).sort((a, b) => b.length - a.length).map(esc).join('|') + ')[\\uFE0F\\u200D]*', 'gu');
  // Tanınmayan emoji yakalayıcı (test için)
  const ANY = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FA}]/u;
  const cache = {};
  function svg(name) {
    if (cache[name]) return cache[name];
    const s = S[name]; if (!s) return '';
    return (cache[name] = `<i class="ik"${s[1] ? ` style="color:${s[1]}"` : ''}><svg viewBox="0 0 24 24" ${D} aria-hidden="true">${s[0]}</svg></i>`);
  }
  // metindeki emojileri simgeye çevir (HTML dizesi döner)
  function h(txt) { return String(txt).replace(RX, m => svg(E[m.replace(/[️]/g, '').replace(/‍$/, '')]) || ''); }

  // sayfadaki metin düğümlerini dönüştür
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, svg: 1, SVG: 1, CANVAS: 1 };
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { conv(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [];
    let n; while ((n = w.nextNode())) { RX.lastIndex = 0; if (RX.test(n.nodeValue)) list.push(n); }
    list.forEach(conv);
  }
  function conv(n) {
    const par = n.parentNode; if (!par || SKIP[par.nodeName]) return;
    RX.lastIndex = 0; if (!RX.test(n.nodeValue)) return;
    const t = document.createElement('template'); t.innerHTML = h(n.nodeValue.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]));
    par.replaceChild(t.content, n);
  }
  function watch() {
    scan(document.body);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') conv(m.target);
        else for (const a of m.addedNodes) scan(a);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);

  G.IKON = { h, svg, names: Object.keys(S), ANY, find: () => { // ekranda kalan emoji var mı (test)
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), out = [];
    let n; while ((n = w.nextNode())) if (ANY.test(n.nodeValue) && !SKIP[n.parentNode.nodeName]) out.push(n.nodeValue.slice(0, 30));
    return out;
  } };
})(window);
