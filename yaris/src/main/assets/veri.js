// Gece Kaçağı — oyun verisi: arabalar, parçalar, görünüm, bölgeler, pistler, rakipler, hikâye, kariyer
(function (G) {
  'use strict';

  // ───────── ARABALAR (hepsi kurgusal) ─────────
  // hiz: en yüksek km/s, ivme: 0-100 sn, tutus: yanal tutuş (g), nitro: nitro gücü (1 = normal), kg
  // govde: 3B gövde tipi
  const CARS = [
    { id: 'serce', ad: 'Serçe 1.6', sinif: 'D', govde: 'hatch', hiz: 186, ivme: 9.6, tutus: 0.92, nitro: 1.0, kg: 1050, fiyat: 0, renk: '#e8e8e8', yazi: 'Ucuz, hafif, affedici. Herkes bir yerden başlar.' },
    { id: 'pusula', ad: 'Pusula GT', sinif: 'D', govde: 'coupe', hiz: 198, ivme: 8.9, tutus: 0.95, nitro: 1.0, kg: 1180, fiyat: 9000, renk: '#2f80ed', yazi: 'Dengeli küçük kupe. Virajları sever.' },
    { id: 'kumru', ad: 'Kumru S', sinif: 'D', govde: 'sedan', hiz: 205, ivme: 8.4, tutus: 0.9, nitro: 1.05, kg: 1320, fiyat: 12000, renk: '#9b51e0', yazi: 'Ağır ama düz yolda şaşırtır.' },
    { id: 'ruzgar', ad: 'Rüzgar Turbo', sinif: 'C', govde: 'hatch', hiz: 222, ivme: 6.9, tutus: 1.02, nitro: 1.1, kg: 1150, fiyat: 24000, renk: '#f2c94c', yazi: 'Turbolu sıcak hatchback. Çıkışta roket.' },
    { id: 'sahin', ad: 'Şahin RS', sinif: 'C', govde: 'coupe', hiz: 232, ivme: 6.5, tutus: 1.0, nitro: 1.05, kg: 1290, fiyat: 31000, renk: '#eb5757', yazi: 'Arkadan itişli, kontrollü kayar.' },
    { id: 'bozkurt', ad: 'Bozkurt V8', sinif: 'C', govde: 'muscle', hiz: 241, ivme: 5.9, tutus: 0.9, nitro: 1.15, kg: 1610, fiyat: 36000, renk: '#27ae60', yazi: 'Kaba kuvvet. Düzlükte kral, virajda inatçı.' },
    { id: 'atmaca', ad: 'Kızıl Atmaca', sinif: 'B', govde: 'sedan', hiz: 252, ivme: 5.4, tutus: 1.05, nitro: 1.1, kg: 1480, fiyat: 52000, renk: '#c0392b', yazi: 'Dört kapılı canavar. Polis bile kıskanır.' },
    { id: 'volta', ad: 'Volta E', sinif: 'B', govde: 'wedge', hiz: 248, ivme: 4.6, tutus: 1.08, nitro: 0.95, kg: 1700, fiyat: 61000, renk: '#56ccf2', yazi: 'Elektrikli. Anında tork, sessiz kaçış.' },
    { id: 'karakurt', ad: 'Karakurt V10', sinif: 'B', govde: 'muscle', hiz: 268, ivme: 4.5, tutus: 0.98, nitro: 1.2, kg: 1650, fiyat: 74000, renk: '#111111', yazi: 'Siyah, yüksek sesli, korkutucu.' },
    { id: 'yildirim', ad: 'Yıldırım R', sinif: 'A', govde: 'coupe', hiz: 281, ivme: 4.0, tutus: 1.14, nitro: 1.1, kg: 1420, fiyat: 98000, renk: '#f2994a', yazi: 'Pist için doğmuş. Çok hassas direksiyon.' },
    { id: 'volkan', ad: 'Volkan GT', sinif: 'A', govde: 'super', hiz: 296, ivme: 3.7, tutus: 1.12, nitro: 1.15, kg: 1450, fiyat: 128000, renk: '#ff2e63', yazi: 'Orta motorlu süper araba.' },
    { id: 'gecekusu', ad: 'Gece Kuşu', sinif: 'A', govde: 'wedge', hiz: 305, ivme: 3.6, tutus: 1.1, nitro: 1.2, kg: 1390, fiyat: 150000, renk: '#3d3d6b', yazi: 'Köşeli, alçak, radara görünmez gibi.' },
    { id: 'firtina', ad: 'Fırtına S', sinif: 'S', govde: 'super', hiz: 322, ivme: 3.1, tutus: 1.2, nitro: 1.2, kg: 1380, fiyat: 215000, renk: '#bb6bd9', yazi: 'Hiper sınıfa ilk adım.' },
    { id: 'ejder', ad: 'Ejder X', sinif: 'S', govde: 'wedge', hiz: 338, ivme: 2.9, tutus: 1.22, nitro: 1.25, kg: 1340, fiyat: 290000, renk: '#00b894', yazi: 'Efsane. Gözünü kırpmadan 300.' },
    { id: 'kuzgun', ad: 'Kuzgun GTR', sinif: 'S', govde: 'coupe', hiz: 333, ivme: 2.8, tutus: 1.25, nitro: 1.3, kg: 1360, fiyat: 0, renk: '#1e3799', yazi: 'Ablanın arabası. Kobra\'nın garajından geri alındı.', ozel: 'kuzgun' },
    { id: 'kobra', ad: 'Kobra RX', sinif: 'S', govde: 'super', hiz: 345, ivme: 2.7, tutus: 1.24, nitro: 1.3, kg: 1330, fiyat: 0, renk: '#e1b12c', yazi: 'Listenin 1 numarasının arabası. Artık senin.', ozel: 'kobra' },
    { id: 'hayalet', ad: 'Hayalet', sinif: 'S', govde: 'super', hiz: 352, ivme: 2.6, tutus: 1.28, nitro: 1.35, kg: 1290, fiyat: 450000, renk: '#dfe6e9', yazi: 'Söylenti mi gerçek mi? Kariyeri bitirenlere.', ozel: 'son' },
  ];
  const CLASS_ORDER = { D: 0, C: 1, B: 2, A: 3, S: 4 };

  // ───────── PERFORMANS PARÇALARI ─────────
  const PARTS = [
    { id: 'motor', ad: 'Motor', ik: '⚙️', yazi: 'En yüksek hız ve ivme', etki: { hiz: 0.045, ivme: 0.04 } },
    { id: 'turbo', ad: 'Turbo', ik: '🌀', yazi: 'İvme', etki: { ivme: 0.065 } },
    { id: 'sanziman', ad: 'Şanzıman', ik: '🔩', yazi: 'Hız ve ivme', etki: { hiz: 0.025, ivme: 0.03 } },
    { id: 'lastik', ad: 'Lastik', ik: '⭕', yazi: 'Yol tutuşu', etki: { tutus: 0.05 } },
    { id: 'suspansiyon', ad: 'Süspansiyon', ik: '🛞', yazi: 'Viraj ve denge', etki: { tutus: 0.035, ivme: 0.01 } },
    { id: 'nitro', ad: 'Nitro', ik: '🔥', yazi: 'Nitro süresi ve gücü', etki: { nitro: 0.12 } },
    { id: 'hafiflik', ad: 'Hafifletme', ik: '🪶', yazi: 'Ağırlık azalır: ivme + tutuş', etki: { ivme: 0.025, tutus: 0.02 } },
  ];
  const PART_LV = ['Stok', 'Sokak', 'Spor', 'Yarış', 'Efsane'];
  const PART_COST = [0, 1500, 4000, 9000, 18000]; // sınıf çarpanıyla
  const CLASS_MUL = { D: 1, C: 1.6, B: 2.4, A: 3.4, S: 4.6 };

  // ───────── GÖRÜNÜM ─────────
  const PAINTS = [
    ['#e8e8e8', 'Buz Beyazı'], ['#111111', 'Gece Siyahı'], ['#7f8c8d', 'Füme'], ['#c0392b', 'Kan Kırmızı'], ['#ff2e63', 'Neon Pembe'],
    ['#f2994a', 'Turuncu'], ['#f2c94c', 'Hardal'], ['#27ae60', 'Yarış Yeşili'], ['#00b894', 'Turkuaz'], ['#2f80ed', 'Okyanus'],
    ['#1e3799', 'Lacivert'], ['#9b51e0', 'Mor'], ['#56ccf2', 'Buz Mavisi'], ['#e1b12c', 'Altın'], ['#6d4c41', 'Bronz'], ['#a3cb38', 'Asit Yeşili'],
  ];
  const FINISH = [
    { id: 'parlak', ad: 'Parlak', r: 0.32, m: 0.35, fiyat: 0 },
    { id: 'metalik', ad: 'Metalik', r: 0.22, m: 0.75, fiyat: 800 },
    { id: 'mat', ad: 'Mat', r: 0.85, m: 0.1, fiyat: 1200 },
    { id: 'krom', ad: 'Krom', r: 0.06, m: 1.0, fiyat: 6000 },
    { id: 'inci', ad: 'İnci', r: 0.18, m: 0.55, fiyat: 3000, sheen: 1 },
  ];
  const RIMS = [
    { id: 0, ad: 'Stok', kol: 5, fiyat: 0 }, { id: 1, ad: 'Yıldız', kol: 5, ince: 1, fiyat: 900 }, { id: 2, ad: 'Ağ', kol: 10, ince: 1, fiyat: 1500 },
    { id: 3, ad: 'Disk', kol: 0, fiyat: 1300 }, { id: 4, ad: 'Üçlü', kol: 3, fiyat: 1800 }, { id: 5, ad: 'Turbin', kol: 14, ince: 1, fiyat: 2600 },
  ];
  const RIM_COLORS = [['#c8ccd4', 'Gümüş'], ['#1a1a1a', 'Siyah'], ['#e1b12c', 'Altın'], ['#ff2e63', 'Pembe'], ['#56ccf2', 'Mavi'], ['#ffffff', 'Beyaz']];
  const KITS = [{ id: 0, ad: 'Stok', fiyat: 0 }, { id: 1, ad: 'Sokak Kiti', fiyat: 2500 }, { id: 2, ad: 'Geniş Gövde', fiyat: 6000 }, { id: 3, ad: 'Yarış Kiti', fiyat: 9000 }];
  const SPOILERS = [{ id: 0, ad: 'Yok', fiyat: 0 }, { id: 1, ad: 'Dudak', fiyat: 700 }, { id: 2, ad: 'Ördek Kuyruk', fiyat: 1400 }, { id: 3, ad: 'Orta Kanat', fiyat: 2200 }, { id: 4, ad: 'GT Kanat', fiyat: 4200 }];
  const NEONS = [[null, 'Yok'], ['#ff2e63', 'Pembe'], ['#00e5ff', 'Camgöbeği'], ['#7c4dff', 'Mor'], ['#00e676', 'Yeşil'], ['#ffea00', 'Sarı'], ['#ff6d00', 'Turuncu'], ['#ffffff', 'Beyaz']];
  const VINYLS = [
    { id: 0, ad: 'Yok', fiyat: 0 }, { id: 1, ad: 'Çift Şerit', fiyat: 1200 }, { id: 2, ad: 'Yan Şerit', fiyat: 1000 }, { id: 3, ad: 'Alev', fiyat: 3000 },
    { id: 4, ad: 'Kaplan', fiyat: 3500 }, { id: 5, ad: 'Yarış No', fiyat: 1500 }, { id: 6, ad: 'Şimşek', fiyat: 2800 }, { id: 7, ad: 'Dama', fiyat: 2400 },
  ];
  const TINTS = [[0, 'Şeffaf'], [1, 'Füme'], [2, 'Simsiyah']];
  const NEON_PRICE = 2000, PAINT_PRICE = 500, RIMCOL_PRICE = 400, TINT_PRICE = 600;

  // ───────── BÖLGELER (her biri farklı ortam) ─────────
  // gok: [üst, ufuk] renkleri; isik: sokak lambası rengi; bina: bina renk aralığı
  const ZONES = [
    { id: 0, ad: 'Liman', yazi: 'Konteynerler, vinçler, sodyum lambalar. Her şey burada başlar.', gok: ['#0b0f2a', '#e0703a'], sis: '#2a1a24', isik: '#ffb347', zemin: '#2b2b30', bina: ['#3b3f4a', '#5a4a42', '#2f3b4a'], yuk: [8, 22], tema: 'liman', stil: 'sehir', tepe: 1.5 },
    { id: 1, ad: 'Sanayi', yazi: 'Bacalar, depolar, kırık asfalt. Kurallar burada eğilir.', gok: ['#0d1a12', '#7a8a3a'], sis: '#1c2418', isik: '#d9ff66', zemin: '#2c2e26', bina: ['#4a4a3a', '#3a3f3a', '#5a5040'], yuk: [10, 26], tema: 'sanayi', stil: 'blok', tepe: 1 },
    { id: 2, ad: 'Merkez', yazi: 'Gökdelenler ve neon tabelalar. Şehrin kalbi gece atar.', gok: ['#07071a', '#5a2a8a'], sis: '#140d26', isik: '#9fd8ff', zemin: '#26262e', bina: ['#232838', '#2c2244', '#1d3040'], yuk: [30, 110], tema: 'merkez', stil: 'blok', tepe: 2 },
    { id: 3, ad: 'Sahil', yazi: 'Palmiyeler, deniz kokusu, sonsuz gün batımı.', gok: ['#2a1650', '#ff8c5a'], sis: '#4a2a4a', isik: '#ffd27f', zemin: '#3a3030', bina: ['#e8d8c0', '#d0b8a0', '#f0e0d0'], yuk: [6, 16], tema: 'sahil', stil: 'sehir', tepe: 4 },
    { id: 4, ad: 'Dağ Yolu', yazi: 'Çam ormanı, uçurum, firketeler. Fren unutulmaz.', gok: ['#0a1428', '#3a5a7a'], sis: '#1a2430', isik: '#fff2cc', zemin: '#26302a', bina: ['#4a3a2a', '#3a2a20'], yuk: [5, 9], tema: 'dag', stil: 'dag', tepe: 14 },
    { id: 5, ad: 'Otoyol', yazi: 'Körfez köprüsü ve sekiz şeritli hız. Son durak.', gok: ['#050510', '#b03060'], sis: '#1a0a1a', isik: '#ffffff', zemin: '#22222a', bina: ['#2a2a3a', '#3a2a3a'], yuk: [20, 70], tema: 'otoyol', stil: 'otoyol', tepe: 6, W: 20 },
  ];

  // ───────── PİSTLER ─────────
  // tip: dongu (devre/eleme/drift), acik (sprint/hız/gişe/kovalamaca), duz (drag)
  const TRACKS = [
    // Liman
    { id: 'l1', ad: 'Rıhtım Turu', bolge: 0, tip: 'dongu', seed: 11, uzun: 2200 },
    { id: 'l2', ad: 'Konteyner Koşusu', bolge: 0, tip: 'acik', seed: 12, uzun: 2800 },
    { id: 'l3', ad: 'Vinç Altı', bolge: 0, tip: 'dongu', seed: 13, uzun: 1800 },
    { id: 'l4', ad: 'Liman Düzlüğü', bolge: 0, tip: 'duz', seed: 14, uzun: 800 },
    { id: 'l5', ad: 'Fener Yolu', bolge: 0, tip: 'acik', seed: 15, uzun: 3600 },
    // Sanayi
    { id: 's1', ad: 'Baca Devresi', bolge: 1, tip: 'dongu', seed: 21, uzun: 2600 },
    { id: 's2', ad: 'Döküm Yolu', bolge: 1, tip: 'acik', seed: 22, uzun: 3200 },
    { id: 's3', ad: 'Depo Labirenti', bolge: 1, tip: 'dongu', seed: 23, uzun: 2000 },
    { id: 's4', ad: 'Ray Hattı', bolge: 1, tip: 'duz', seed: 24, uzun: 1000 },
    // Merkez
    { id: 'm1', ad: 'Neon Bulvarı', bolge: 2, tip: 'dongu', seed: 31, uzun: 2800 },
    { id: 'm2', ad: 'Gökdelen Sprinti', bolge: 2, tip: 'acik', seed: 32, uzun: 3400 },
    { id: 'm3', ad: 'Meydan Çemberi', bolge: 2, tip: 'dongu', seed: 33, uzun: 2100 },
    { id: 'm4', ad: 'Kule Caddesi', bolge: 2, tip: 'duz', seed: 34, uzun: 1000 },
    { id: 'm5', ad: 'Gece Çarşısı', bolge: 2, tip: 'acik', seed: 35, uzun: 4200 },
    // Sahil
    { id: 'h1', ad: 'Palmiye Kıyısı', bolge: 3, tip: 'dongu', seed: 41, uzun: 3200 },
    { id: 'h2', ad: 'Gün Batımı Sprinti', bolge: 3, tip: 'acik', seed: 42, uzun: 4400 },
    { id: 'h3', ad: 'Mendirek', bolge: 3, tip: 'duz', seed: 43, uzun: 1200 },
    { id: 'h4', ad: 'Kumsal Virajları', bolge: 3, tip: 'dongu', seed: 44, uzun: 2500 },
    // Dağ
    { id: 'd1', ad: 'Çam Firketesi', bolge: 4, tip: 'dongu', seed: 51, uzun: 3000 },
    { id: 'd2', ad: 'Uçurum İnişi', bolge: 4, tip: 'acik', seed: 52, uzun: 4600 },
    { id: 'd3', ad: 'Kartal Yuvası', bolge: 4, tip: 'acik', seed: 53, uzun: 3800 },
    { id: 'd4', ad: 'Sis Devresi', bolge: 4, tip: 'dongu', seed: 54, uzun: 2400 },
    // Otoyol
    { id: 'o1', ad: 'Körfez Köprüsü', bolge: 5, tip: 'acik', seed: 61, uzun: 5200 },
    { id: 'o2', ad: 'Halka Yol', bolge: 5, tip: 'dongu', seed: 62, uzun: 4200 },
    { id: 'o3', ad: 'Gişe Hattı', bolge: 5, tip: 'duz', seed: 63, uzun: 1400 },
    { id: 'o4', ad: 'Son Kaçış', bolge: 5, tip: 'acik', seed: 64, uzun: 6500 },
    // Serbest sürüş için büyük şehir halkası (tüm bölgelerden geçer)
    { id: 'serbest', ad: 'Karaliman Çevre Yolu', bolge: -1, tip: 'dongu', seed: 99, uzun: 9000 },
  ];

  // ───────── ETKİNLİK TÜRLERİ ─────────
  const TYPES = {
    devre: { ad: 'Devre', ik: '🔁', yazi: 'Birkaç tur, ilk gelen kazanır.' },
    sprint: { ad: 'Sprint', ik: '➡️', yazi: 'A noktasından B noktasına. Geri dönüş yok.' },
    drag: { ad: 'Drag', ik: '🚦', yazi: 'Düz yol, elle vites. Yeşil bölgede vites at, trafikten şerit değiştirerek kaç.' },
    hiz: { ad: 'Hız Tuzağı', ik: '📸', yazi: 'Radarlardan olabildiğince hızlı geç. Toplam hız kazanır.' },
    eleme: { ad: 'Eleme', ik: '✂️', yazi: 'Her turun sonunda sonuncu elenir.' },
    gise: { ad: 'Gişe', ik: '⏱️', yazi: 'Zamana karşı. Her kontrol noktası süre ekler.' },
    drift: { ad: 'Drift', ik: '💨', yazi: 'El frenini çek, kaydır, puan topla. Duvara çarpma.' },
    duello: { ad: 'Düello', ik: '⚔️', yazi: 'Bire bir. Sadece sen ve o.' },
    kovala: { ad: 'Kovalamaca', ik: '🚨', yazi: 'Polisle oyna. Hedefi tamamla, yakalanma.' },
    kacis: { ad: 'Kaçış', ik: '🏃', yazi: 'Peşinde polis var. İzini kaybettir.' },
    rakip: { ad: 'Liste Düellosu', ik: '👑', yazi: 'Gece Listesi rakibi. İki yarışı da kazan.' },
  };

  // ───────── KARAKTERLER ─────────
  const CHARS = {
    sen: { ad: 'Sen', renk: '#ff2e63', bas: '🧑' },
    bora: { ad: 'Bora', renk: '#56ccf2', bas: '🧢', unvan: 'Tamirci, eski dost' },
    sert: { ad: 'Komiser Nazlı Sert', renk: '#2f80ed', bas: '👮‍♀️', unvan: 'Karaliman Emniyeti' },
    kobra: { ad: 'Kaan "Kobra" Demir', renk: '#e1b12c', bas: '🐍', unvan: 'Gece Listesi #1' },
    defne: { ad: 'Defne', renk: '#bb6bd9', bas: '🦊', unvan: 'Abla' },
    telsiz: { ad: 'Polis Telsizi', renk: '#7f8c8d', bas: '📻' },
  };

  // ───────── GECE LİSTESİ (10 → 1) ─────────
  // gerek: listeyi açmak için etkinlik sayısı, ün, aranma hedefleri
  const RIVALS = [
    { no: 10, ad: 'Emre "Çaylak" Taş', lakap: 'Çaylak', bas: '🐣', renk: '#f2c94c', bolge: 0, araba: 'ruzgar', zor: 0.82, ozet: 'Liman\'ın en gürültülü çocuğu. Yeteneğinden çok ağzı hızlı.',
      soz: ['Abi sen kimsin ya? Bu liman benim.', 'Tamam, tamam... Bu seferlik şanslıydın.'], kovala: [{ t: 'sure', n: 30 }] },
    { no: 9, ad: 'Deniz "Martı" Kaya', lakap: 'Martı', bas: '⚓', renk: '#56ccf2', bolge: 0, araba: 'pusula', zor: 0.86, ozet: 'Gündüz rıhtım işçisi, gece konteynerlerin arasında hayalet.',
      soz: ['Liman gece başka kokar. Bakalım burnun alıyor mu.', 'Martılar bile senin kadar hızlı uçmuyor.'], kovala: [{ t: 'etkisiz', n: 2 }] },
    { no: 8, ad: '"Paslı" Hakan', lakap: 'Paslı', bas: '🔧', renk: '#a1887f', bolge: 1, araba: 'bozkurt', zor: 0.88, ozet: 'Eski usul V8 ustası. Elektronik ona göre hilekârlık.',
      soz: ['Senin yaşındayken ben bu yolları çoktan aşındırmıştım.', 'Pas tuttum ama hâlâ ayaktayım. Helal olsun.'], kovala: [{ t: 'sure', n: 60 }, { t: 'engel', n: 1 }] },
    { no: 7, ad: 'Selin "Volt" Arın', lakap: 'Volt', bas: '⚡', renk: '#00e5ff', bolge: 1, araba: 'volta', zor: 0.9, ozet: 'Mühendis. Yarışları veriyle kazanır, hiç gülmez.',
      soz: ['Hesaplarıma göre kazanma ihtimalin %12.', 'Veride hata var... Ya da sen bir anomalisin.'], kovala: [{ t: 'etkisiz', n: 4 }, { t: 'barikat', n: 1 }] },
    { no: 6, ad: 'Murat "Doktor" Erk', lakap: 'Doktor', bas: '🩺', renk: '#eb5757', bolge: 2, araba: 'atmaca', zor: 0.92, ozet: 'Gündüz cerrah, gece sokakların sessiz cerrahı. Hata yapmaz.',
      soz: ['Teşhisim: aşırı özgüven. Tedavisi: yenilgi.', 'Bu sefer bıçak sendeydi.'], kovala: [{ t: 'sure', n: 90 }, { t: 'kac', n: 3 }] },
    { no: 5, ad: 'Asya "Neon" Yıldız', lakap: 'Neon', bas: '💜', renk: '#ff2e63', bolge: 2, araba: 'gecekusu', zor: 0.94, ozet: 'Milyonlarca takipçi. Her yarışı canlı yayında.',
      soz: ['Hadi millet, bu çaylağı canlı yayında ezelim!', 'Yayını kapatın... Kapatın dedim!'], kovala: [{ t: 'etkisiz', n: 6 }, { t: 'engel', n: 2 }] },
    { no: 4, ad: '"Kaptan" Rıza', lakap: 'Kaptan', bas: '🏴‍☠️', renk: '#6d4c41', bolge: 3, araba: 'karakurt', zor: 0.95, ozet: 'Sahilin kaçakçısı. Polisle oynamayı yarıştan çok sever.',
      soz: ['Denizde de karada da kaptan benim evlat.', 'Rüzgâr senden yana esti bu gece.'], kovala: [{ t: 'sure', n: 120 }, { t: 'kac', n: 4 }] },
    { no: 3, ad: 'Ece "Fırtına" Demirel', lakap: 'Fırtına', bas: '🌪️', renk: '#bb6bd9', bolge: 4, araba: 'yildirim', zor: 0.96, ozet: 'Dağ yollarının drift kraliçesi. Firketede fren yapmaz.',
      soz: ['Dağ seni affetmez. Ben hiç affetmem.', 'Firketeleri benden iyi biliyormuşsun...'], kovala: [{ t: 'etkisiz', n: 10 }, { t: 'barikat', n: 3 }] },
    { no: 2, ad: '"Gölge"', lakap: 'Gölge', bas: '🎭', renk: '#dfe6e9', bolge: 5, araba: 'firtina', zor: 0.98, ozet: 'Kimse yüzünü görmedi. Sadece kasklı bir siluet.',
      soz: ['...', 'Büyümüşsün. Artık hazırsın.'], kovala: [{ t: 'sure', n: 180 }, { t: 'kac', n: 5 }] },
    { no: 1, ad: 'Kaan "Kobra" Demir', lakap: 'Kobra', bas: '🐍', renk: '#e1b12c', bolge: 5, araba: 'kobra', zor: 1.0, ozet: 'Gece Listesi\'nin kurucusu. Karaliman\'ın gizli patronu.',
      soz: ['Ablanın arabası garajımda güzel duruyor. Gelip almak ister misin?', 'Bu... bu olamaz. Kimse Kobra\'yı yenemez!'], kovala: [{ t: 'etkisiz', n: 15 }, { t: 'sure', n: 240 }] },
  ];

  // ───────── HİKÂYE SAHNELERİ ─────────
  // Her satır: [konuşan, metin]
  const STORY = {
    giris: [
      ['anlatici', 'Karaliman. Gündüz liman şehri, gece başka bir dünya.'],
      ['anlatici', 'Üç yıl önce ablan Defne, şehrin en hızlı sürücüsüydü. Sonra bir gece Kobra\'yla yarıştı... ve ortadan kayboldu.'],
      ['anlatici', 'Polis kazayı ona yıktı. Arabası Kuzgun GTR, Kobra\'nın garajına "ganimet" diye girdi.'],
      ['bora', 'Geldin demek. Ablanın tek bıraktığı şey bu eski Serçe. Motoru hâlâ çalışıyor, ben baktım.'],
      ['bora', 'Kobra\'ya ulaşmanın tek yolu Gece Listesi. On kişi, onu da sen yeneceksin.'],
      ['sen', 'Ablama ne olduğunu öğreneceğim. Ve Kuzgun\'u geri alacağım.'],
      ['bora', 'O zaman önce şehir seni tanısın. Liman\'da bir ısınma yarışı var. Hadi bakalım.'],
    ],
    ilkYaris: [
      ['bora', 'Fena değil! Bak, el frenini virajda çek, kayarken nitro dolar.'],
      ['bora', 'Liste rakiplerine meydan okumak için o bölgedeki yarışları kazanman ve Ün toplaman lazım.'],
      ['bora', 'Ün nasıl toplanır? Yarış kazanarak... ve polisi peşine takarak. Polis ne kadar kızarsa şehir o kadar konuşur.'],
      ['telsiz', 'Merkez, Liman\'da yasa dışı yarış ihbarı. Beyaz bir hatchback... kim bu çocuk?'],
      ['sert', 'Yeni bir yüz. Dosyasını açın. Gece Listesi\'ne tırmanmak isteyen herkes eninde sonunda benim masama düşer.'],
    ],
    ilkKovala: [
      ['bora', 'Polis! Panik yok. Uzaklaş, arkadan gelenleri duvara bindir, kaçış çubuğu dolunca kaybolursun.'],
      ['bora', 'Yol kenarında sarı işaretli şeyler görürsen içinden geç: üstlerine yıkılır, peşindekileri durdurur.'],
    ],
    rakipSonra: {
      10: [['bora', 'Liste\'de ilk isim düştü! Şehir adını konuşmaya başladı.'], ['sert', 'Çaylak\'ı yendi demek. İzlemeye devam edin.']],
      9: [['bora', 'Martı\'yı da geçtin. Liman artık senin. Sanayi bölgesi açıldı.'], ['anlatici', 'Martı ayrılırken fısıldar: "Abladan haber var. Kobra\'nın yalan söylediğini bilen biri var: Gölge."']],
      8: [['bora', 'Paslı Hakan bile şapka çıkardı. Bu ihtiyar ablanı tanırmış.'], ['anlatici', 'Hakan: "O gece Defne\'nin frenleriyle biri oynamıştı. Kobra\'nın adamları..."']],
      7: [['bora', 'Volt\'un verileri çöktü, hahaha! Merkez seni bekliyor.'], ['sert', 'Bu sürücü sıradan değil. Bütün birimlere: beyaz zamanı bitti, onu yakalayın.']],
      6: [['bora', 'Doktor\'u ameliyat ettin kanka.'], ['anlatici', 'Doktor bir zarf uzatır: "Kaza raporu. Orijinali. İçinde Kobra\'nın arabasının boya izleri var."']],
      5: [['bora', 'Neon\'un yayını rekor kırdı: senin zaferinle. Artık herkes seni tanıyor.'], ['sert', 'Bütün şehir onu izliyor. O zaman biz de canlı yayında yakalarız.']],
      4: [['bora', 'Kaptan bile denizden döndü, sahil senin.'], ['anlatici', 'Kaptan Rıza: "Ablan ölmedi evlat. Kaçmak zorunda kaldı. Dağda biri seni bekliyor."']],
      3: [['bora', 'Fırtına\'yı dağda yendin! Şimdi sadece iki kişi kaldı: Gölge... ve Kobra.']],
      2: [['anlatici', 'Gölge kaskını çıkarır. Saçlarını savuran rüzgârda tanıdık bir yüz...'], ['defne', 'Büyümüşsün kardeşim. Üç yıldır Gölge olarak saklanıyordum. Kobra beni öldü sanıyor.'], ['defne', 'Rapor sende mi? Güzel. Komiser Sert\'e götüreceğiz. Ama önce Kobra\'yı yen ki karşısına çıkacak cesareti kalmasın.'], ['bora', 'Bu gece Kobra. Köprüde. Hazırsan ben hazırım.']],
      1: [['kobra', 'Nasıl... Bir çaylak... Kobra\'yı...'], ['defne', 'Bitti Kaan. Raporu polis gördü.'], ['sert', 'Kaan Demir, üç yıl önceki kaza için gözaltındasın. Ve sen...'], ['sert', '...sen de yakalanacaksın. Ama önce bana yetişmem gerekiyor. Bütün birimler, köprüyü kapatın!'], ['bora', 'Kanka, son kaçış! Kuzgun\'u al ve şehirden çık!']],
    },
    final: [
      ['anlatici', 'Karaliman\'ın ışıkları dikiz aynasında küçülüyor.'],
      ['defne', 'Kuzgun hâlâ senin gibi kükrüyor. Babam gurur duyardı.'],
      ['sert', '(Telsizde) Tüm birimler geri çekilsin... İzini kaybettik. Bu seferlik.'],
      ['bora', 'Gece Listesi\'nin tek bir ismi kaldı kanka: seninki. Şehir senin!'],
      ['anlatici', 'TEBRİKLER! Hikâyeyi bitirdin. Serbest sürüş, meydan okumalar ve yeni arabalar seni bekliyor. Hayalet satışa çıktı.'],
    ],
  };

  // Polis telsizi satırları (kovalamaca sırasında)
  const SCANNER = {
    1: ['Devriye, hız sınırını aşan bir araç var, takibe alıyorum.', 'Plakayı okuyamıyorum, çok hızlı.', 'Merkez, şüpheli araç batıya gidiyor.'],
    2: ['İkinci birim takipte, sürücü durmuyor!', 'Bu bir yarış aracı, motoruna bak!', 'Tüm devriyeler dikkat, kırmızı ışık ihlali.'],
    3: ['Barikat hazırlayın! Çivili şerit kullanma izni verildi.', 'Otoyol birimleri yolda.', 'Şüpheli çok tehlikeli, mesafeyi koruyun.'],
    4: ['Helikopter havada, şüpheliyi görüyorum!', 'Özel birim devrede, zırhlı araçlar yola çıktı.', 'Bu sürücüyü ne pahasına olursa olsun durdurun!'],
    5: ['Komiser Sert bizzat yönetiyor. Kaçış yok!', 'Tüm şehir birimleri aynı kanalda!', 'Önleyici birim, hedefi kilitledim.'],
    kayip: ['Görüş kaybedildi! Son görülen konum...', 'Nereye gitti bu? Az önce buradaydı!', 'Merkez, şüpheliyi kaybettik.'],
    engel: ['Birim devre dışı! Üstümüze bir şey yıkıldı!', 'Yol kapandı, geçemiyoruz!'],
    etkisiz: ['Araç hasarlı, takibi bırakıyorum!', 'Birim düştü, birim düştü!', 'Lanet olsun, motorum gitti!'],
  };

  // Yarış sırasında Bora'nın telsiz cümleleri
  const RADIO = {
    basla: ['Göster kendini kanka!', 'Nitroyu erken harcama.', 'Bu pisti ezbere biliyorsun, rahat ol.', 'Gaz!'],
    onde: ['Öndesin, böyle devam!', 'Arkana bakma, aynada küçülüyorlar.'],
    geride: ['Hadi, daha kötü değilsin!', 'Kayarak nitro doldur, yetiş onlara!'],
    son: ['Son tur!', 'Son düzlük, her şeyini ver!'],
  };

  // ───────── KARİYER ─────────
  // Her rakip için bölgedeki etkinlikler (sırayla açılır). Ödül = para, Ün.
  function careerEvents() {
    const ev = [];
    const Z = { 0: ['l1', 'l2', 'l3', 'l4', 'l5'], 1: ['s1', 's2', 's3', 's4'], 2: ['m1', 'm2', 'm3', 'm4', 'm5'], 3: ['h1', 'h2', 'h3', 'h4'], 4: ['d1', 'd2', 'd3', 'd4'], 5: ['o1', 'o2', 'o3', 'o4'] };
    const plan = {
      10: [['devre', 'l1', 2], ['sprint', 'l2'], ['drag', 'l4']],
      9: [['hiz', 'l5'], ['eleme', 'l3', 4], ['kovala', 'l2', 0, { t: 'sure', n: 40 }], ['gise', 'l5']],
      8: [['devre', 's1', 2], ['drift', 's3'], ['sprint', 's2'], ['drag', 's4']],
      7: [['eleme', 's3', 4], ['hiz', 's2'], ['kacis', 's2'], ['gise', 's2'], ['devre', 's3', 3]],
      6: [['devre', 'm1', 2], ['sprint', 'm2'], ['drag', 'm4'], ['drift', 'm3'], ['kovala', 'm5', 0, { t: 'etkisiz', n: 3 }]],
      5: [['hiz', 'm5'], ['eleme', 'm3', 4], ['gise', 'm2'], ['devre', 'm3', 3], ['sprint', 'm5']],
      4: [['devre', 'h1', 2], ['sprint', 'h2'], ['drag', 'h3'], ['drift', 'h4'], ['kacis', 'h2'], ['hiz', 'h2']],
      3: [['sprint', 'd2'], ['drift', 'd1'], ['devre', 'd4', 3], ['gise', 'd3'], ['eleme', 'd1', 4], ['kovala', 'd3', 0, { t: 'engel', n: 2 }]],
      2: [['sprint', 'o1'], ['devre', 'o2', 2], ['drag', 'o3'], ['hiz', 'o4'], ['kacis', 'o1'], ['gise', 'o4']],
      1: [['sprint', 'o4'], ['devre', 'o2', 3], ['eleme', 'd4', 4], ['drift', 'm1'], ['kovala', 'o1', 0, { t: 'sure', n: 120 }], ['hiz', 'o1']],
    };
    for (const r of RIVALS) {
      const p = plan[r.no], tier = 10 - r.no; // 0..9
      p.forEach((e, i) => {
        const [tip, pist, tur, hedef] = e;
        ev.push({
          id: 'k' + r.no + '_' + i, rakipNo: r.no, tip, pist, tur: tur || (tip === 'devre' ? 2 : tip === 'eleme' ? 4 : 1), hedef,
          zor: (r.no === 10 && i === 0 ? 0.6 : 0.66 + tier * 0.028 + i * 0.006), rakipSay: tip === 'duello' ? 1 : tip === 'drag' ? 3 : tip === 'eleme' ? 5 : 4,
          para: Math.round((1400 + tier * 1600) * (1 + i * 0.08) / 100) * 100, un: 250 + tier * 180 + i * 30,
          polis: (tip === 'sprint' || tip === 'hiz' || tip === 'gise') && tier >= 2 ? Math.min(3, 1 + Math.floor(tier / 4)) : 0,
          hava: (i + r.no) % 4 === 0 ? 'yagmur' : (i + r.no) % 5 === 0 ? 'sis' : 'acik',
          saat: r.bolge === 3 ? 'aksam' : (i % 3 === 2 ? 'aksam' : 'gece'),
        });
      });
    }
    return ev;
  }
  // Rakibi açmak için gereken: tüm bölge etkinlikleri + Ün + aranma hedefleri
  function rivalUn(no) { return [0, 32000, 26000, 20000, 15000, 11000, 7600, 5000, 3000, 1500, 400][no]; }

  // ───────── MEYDAN OKUMALAR (hikâye dışı seri) ─────────
  const CHALLENGES = [
    { id: 'c1', ad: 'Kıl Payı', yazi: 'Sprintte 10 kıl payı geçiş yap', tip: 'sprint', pist: 'l2', hedef: { t: 'kilpayi', n: 10 }, para: 3000 },
    { id: 'c2', ad: 'Kayan Usta', yazi: 'Drift: 25.000 puan', tip: 'drift', pist: 'l3', hedef: { t: 'puan', n: 25000 }, para: 3500 },
    { id: 'c3', ad: 'Işık Hızı', yazi: 'Hız tuzağında toplam 1000 km/s', tip: 'hiz', pist: 'm2', hedef: { t: 'toplam', n: 1000 }, para: 5000 },
    { id: 'c4', ad: 'Duvar Örme', yazi: 'Kovalamaca: 8 polis aracını devre dışı bırak', tip: 'kovala', pist: 's2', hedef: { t: 'etkisiz', n: 8 }, para: 8000 },
    { id: 'c5', ad: 'Mükemmel Start', yazi: 'Drag: 3 mükemmel vites', tip: 'drag', pist: 'm4', hedef: { t: 'mukemmel', n: 3 }, para: 4000 },
    { id: 'c6', ad: 'Hayalet Mod', yazi: '5 yıldız aranmadan kaç', tip: 'kacis', pist: 'o1', hedef: { t: 'kac', n: 5 }, isi: 5, para: 20000 },
    { id: 'c7', ad: 'Temiz Tur', yazi: 'Devrede hiç duvara çarpmadan kazan', tip: 'devre', pist: 'h4', hedef: { t: 'temiz' }, para: 9000 },
    { id: 'c8', ad: 'Dağ Kartalı', yazi: 'Gişe: Kartal Yuvası\'nı 15 sn kala bitir', tip: 'gise', pist: 'd3', hedef: { t: 'kalan', n: 15 }, para: 12000 },
    { id: 'c9', ad: 'Barikat Delici', yazi: 'Kovalamaca: 4 barikattan geç', tip: 'kovala', pist: 'o4', hedef: { t: 'barikat', n: 4 }, isi: 3, para: 15000 },
    { id: 'c10', ad: 'Gece Kralı', yazi: 'Eleme: Kule Caddesi yerine Meydan Çemberi, 6 rakip', tip: 'eleme', pist: 'm3', hedef: { t: 'birinci' }, rakipSay: 6, tur: 6, para: 18000 },
  ];

  // ───────── BAŞARIMLAR ─────────
  const ACHS = [
    { id: 'ilk', ad: 'İlk Zafer', yazi: 'Bir yarış kazan', ik: '🏁' },
    { id: 'on', ad: 'Seri Galip', yazi: '10 yarış kazan', ik: '🏆' },
    { id: 'elli', ad: 'Sokak Efsanesi', yazi: '50 yarış kazan', ik: '👑' },
    { id: 'kac1', ad: 'Kaçak', yazi: 'Bir polis kovalamacasından kaç', ik: '🚨' },
    { id: 'kac5', ad: 'Aranan Adam', yazi: '5 yıldızdan kaç', ik: '⭐' },
    { id: 'pol10', ad: 'Hurdacı', yazi: 'Toplam 25 polis aracını devre dışı bırak', ik: '🚓' },
    { id: 'pol100', ad: 'Polis Kâbusu', yazi: 'Toplam 100 polis aracını devre dışı bırak', ik: '💥' },
    { id: 'engel', ad: 'Yıkıcı', yazi: '10 takip engeli yık', ik: '🏗️' },
    { id: 'hiz300', ad: '300 Kulübü', yazi: '300 km/s hıza çık', ik: '⚡' },
    { id: 'drift', ad: 'Kaydırma Ustası', yazi: 'Tek driftte 5.000 puan', ik: '💨' },
    { id: 'kil', ad: 'Kıl Payı', yazi: 'Toplam 100 kıl payı geçiş', ik: '😬' },
    { id: 'garaj5', ad: 'Koleksiyoncu', yazi: '5 arabaya sahip ol', ik: '🚗' },
    { id: 'garaj10', ad: 'Galerici', yazi: '10 arabaya sahip ol', ik: '🏎️' },
    { id: 'efsane', ad: 'Tam Donanım', yazi: 'Bir arabanın tüm parçalarını Efsane yap', ik: '🔧' },
    { id: 'liste5', ad: 'Yarı Yol', yazi: 'Gece Listesi\'nde 5. sıraya çık', ik: '📜' },
    { id: 'liste1', ad: 'Bir Numara', yazi: 'Kobra\'yı yen', ik: '🐍' },
    { id: 'son', ad: 'Özgürlük', yazi: 'Hikâyeyi bitir', ik: '🌅' },
    { id: 'milyon', ad: 'Milyoner', yazi: 'Toplam 1.000.000 💰 kazan', ik: '💰' },
    { id: 'un', ad: 'Şehrin Dilinde', yazi: '50.000 Ün', ik: '🔥' },
    { id: 'serbest', ad: 'Gece Gezgini', yazi: 'Serbest sürüşte 20 km yol yap', ik: '🌃' },
  ];

  // Trafik araçları
  const TRAFFIC = [
    { govde: 'sedan', renkler: ['#bdc3c7', '#7f8c8d', '#2c3e50', '#95a5a6', '#d35400'] },
    { govde: 'hatch', renkler: ['#ecf0f1', '#e74c3c', '#3498db', '#16a085'] },
    { govde: 'taksi', renkler: ['#f1c40f'] },
    { govde: 'van', renkler: ['#ffffff', '#bdc3c7', '#34495e'] },
    { govde: 'kamyon', renkler: ['#c0392b', '#2980b9', '#27ae60', '#f39c12'] },
    { govde: 'otobus', renkler: ['#2d98da', '#eb3b5a'] },
  ];

  // Polis araçları (aranma seviyesine göre)
  const COPS = {
    devriye: { ad: 'Devriye', govde: 'polis', hiz: 215, can: 60, kg: 1500 },
    otoyol: { ad: 'Otoyol Birimi', govde: 'polisgt', hiz: 260, can: 70, kg: 1450 },
    ozel: { ad: 'Özel Birim', govde: 'polissuv', hiz: 235, can: 140, kg: 2400 },
    onleyici: { ad: 'Önleyici', govde: 'polissuper', hiz: 310, can: 80, kg: 1400 },
  };
  const HEAT = [
    null,
    { birim: ['devriye'], max: 2, barikat: 0, civi: 0, heli: 0, un: 6 },
    { birim: ['devriye', 'devriye', 'otoyol'], max: 3, barikat: 0.5, civi: 0, heli: 0, un: 12 },
    { birim: ['devriye', 'otoyol', 'ozel'], max: 4, barikat: 1, civi: 0.4, heli: 0, un: 20 },
    { birim: ['otoyol', 'ozel', 'onleyici'], max: 5, barikat: 1, civi: 0.6, heli: 1, un: 32 },
    { birim: ['ozel', 'onleyici', 'onleyici'], max: 6, barikat: 1, civi: 0.8, heli: 1, un: 48 },
  ];

  G.VERI = { CARS, CLASS_ORDER, PARTS, PART_LV, PART_COST, CLASS_MUL, PAINTS, FINISH, RIMS, RIM_COLORS, KITS, SPOILERS, NEONS, VINYLS, TINTS,
    NEON_PRICE, PAINT_PRICE, RIMCOL_PRICE, TINT_PRICE, ZONES, TRACKS, TYPES, CHARS, RIVALS, STORY, SCANNER, RADIO, careerEvents, rivalUn,
    CHALLENGES, ACHS, TRAFFIC, COPS, HEAT };
})(typeof window !== 'undefined' ? window : globalThis);
