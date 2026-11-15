// Arayüz testi: sahte AndroidBridge ile tüm ekranları gezer, ekran görüntüsü alır, JS hatalarını raporlar.
// Kullanım: node ui-test.mjs ../app/src/main/assets/index.html <çıktı klasörü>
import { chromium } from 'playwright';
import path from 'path';
const [,, html, out='.'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => {
  const GB = 1024 ** 3, MB = 1024 ** 2, now = Date.now(), d = 86400000;
  let info = { brand: 'Xiaomi', model: '23090RA98G', android: '14', sdk: 34, os: 'HyperOS 1.0.5', xiaomi: true, files: true, usage: false,
    write: true, dnd: false, secure: false, devOn: false, shizuku: { installed: false, running: false, granted: false }, playProtect: true,
    canAddTile: true, notif: false, exact: true, canPin: true, version: '2.0', freeBytes: 18.3 * GB, totalBytes: 256 * GB };
  let modes = null; let sched = [{ id: 's1', h: 23, m: 30, days: [], mode: 'gece', on: true }];
  const f = (rel, size, ago, extra) => Object.assign({ path: '/storage/emulated/0/' + rel, rel, name: rel.split('/').pop(), size, mtime: now - ago * d, img: /\.(jpe?g|png)$/.test(rel) }, extra || {});
  const scan = { files: 48211, bytes: 92 * GB, freeBytes: 18.3 * GB, totalSpace: 256 * GB, largeTotal: 3,
    large: [f('Movies/tatil-2023.mp4', 3.2 * GB, 400), f('Download/pubg-obb-yedek.zip', 1.8 * GB, 200), f('WhatsApp/Media/WhatsApp Video/VID-2024.mp4', 412 * MB, 90)],
    dupes: [[f('DCIM/Camera/IMG_20240101.jpg', 4.1 * MB, 300), f('Pictures/WhatsApp/IMG-20240101-WA0003.jpg', 4.1 * MB, 299)],
            [f('DCIM/Screenshots/Screenshot_1.png', 1.2 * MB, 30), f('Download/Screenshot_1.png', 1.2 * MB, 29), f('Pictures/Screenshot_1 (1).png', 1.2 * MB, 20)]],
    dupeWaste: 6.5 * MB,
    apks: [f('Download/TakipTemizleme-v5.apk', 3.1 * MB, 20, { app: 'Takip Temizleme', ver: '5.0', installed: 'newer' }),
           f('Download/spotify-mod.apk', 71 * MB, 120, { app: 'Spotify', ver: '8.9.1', installed: 'no' }),
           f('Download/eski.apk', 2 * MB, 500, { broken: true })],
    empty: [f('Telegram/Telegram Documents', 0, 100, { dir: true }), f('tmp', 0, 10, { dir: true })],
    cats: [['Fotoğraf', 21], ['Video', 38], ['Ses', 3], ['Belge', 1], ['APK', 0.1], ['Arşiv', 4], ['Diğer', 25]].map(([t, g]) => ({ t, bytes: g * GB, count: 100 })),
    topDirs: [{ name: 'DCIM', bytes: 30 * GB }, { name: 'Android/media/com.whatsapp', bytes: 12 * GB }, { name: 'Download', bytes: 6 * GB }],
    junk: [f('DCIM/.thumbnails/123.jpg', 80 * 1024, 30), f('log/debug.log', 2 * MB, 40)],
    oldDl: [f('Download/fatura-2025.pdf', 300 * 1024, 200)], shots: [f('DCIM/Screenshots/Screenshot_2025.jpg', 900 * 1024, 300)],
    waOld: [f('Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video/VID-2024.mp4', 40 * MB, 400)] };
  const apps = { scanned: 87, usage: false, apps: [
    { pkg: 'com.fake.cleaner', label: 'Süper Temizleyici Pro', system: false, installer: 'APK dosyası', installedDays: 40, version: '2.1', score: 8,
      risks: [{ k: 'a11y', t: 'Erişilebilirlik açık', lv: 3, why: 'Ekranda gördüğün her şeyi okuyabilir.' }, { k: 'overlay', t: 'Diğer uygulamaların üstünde gösterme', lv: 2, why: 'Sahte giriş ekranı çizebilir.' }, { k: 'unknown', t: 'Bilinmeyen kaynak', lv: 2, why: 'APK dosyasından kuruldu.' }] },
    { pkg: 'com.truecaller', label: 'Truecaller', system: false, installer: 'Google Play', installedDays: 300, version: '14', score: 5,
      risks: [{ k: 'sms', t: 'SMS izni', lv: 3, why: 'SMS okuyabilir.' }, { k: 'notif', t: 'Bildirim erişimi', lv: 2, why: 'Bildirimleri okur.' }] },
    { pkg: 'com.miui.find', label: 'Cihazımı Bul', system: true, installer: 'Bilinmiyor', installedDays: 500, version: '1', score: 3,
      risks: [{ k: 'admin', t: 'Cihaz yöneticisi', lv: 3, why: 'Ekranı kilitleyebilir.' }] }] };
  const shortcuts = { devEnabled: false, items: [
    { id: 'autostart', group: 'Xiaomi / HyperOS', title: 'Otomatik başlatma', desc: 'Hangi uygulamaların kendiliğinden açılabileceğini seç.' },
    { id: 'battery_apps', group: 'Xiaomi / HyperOS', title: 'Uygulama başına pil kısıtlaması', desc: 'Kısıtlama yok / Akıllı / Arka planı kısıtla.' },
    { id: 'dev', group: "Android'in gizli ekranları", title: 'Geliştirici seçenekleri', desc: 'Animasyon hızı, USB hata ayıklama.' },
    { id: 'radio', group: "Android'in gizli ekranları", title: 'Telefon bilgisi / şebeke testi', desc: 'Sinyal gücü.' },
    { id: 'usage_access', group: 'İzin ve erişim ekranları', title: 'Kullanım erişimi', desc: 'Kullanımını görebilenler.' }],
    hidden: [{ id: 'cit', group: 'Xiaomi / HyperOS', title: 'Donanım testi (CIT)' }] };
  const state = { brightness: 42, autoBrightness: false, timeout: 30, ringer: 'normal', dnd: false, anim: 1, wifi: true, saver: false };
  const syncM = (m, a) => {
    switch (m) {
      case 'info': return info;
      case 'state': return state;
      case 'modes': if (!modes) modes = { modes: [
        { id: 'gece', name: 'Gece modu', emoji: '🌙', set: { brightness: 8, timeout: 30, ringer: 'vibrate', dnd: true } },
        { id: 'pil', name: 'Pil tasarrufu', emoji: '🔋', set: { brightness: 30, timeout: 30, anim: 0.5 } },
        { id: 'oyun', name: 'Oyun modu', emoji: '🎮', set: { brightness: 100, timeout: 600, dnd: true, anim: 0.5 } }], tiles: ['gece', 'pil', 'oyun'], last: 'gece' }; return modes;
      case 'saveModes': if (a.modes) modes.modes = a.modes; if (a.tiles) modes.tiles = a.tiles; return true;
      case 'installed': return true;
      case 'device': return { battery: { level: 76, temp: 31.5, voltage: 4012, tech: 'Li-poly', status: 'Şarjda değil', charging: false, plug: '', health: 'İyi', cycles: 212, currentMa: -340, chargeMah: 3600, designMah: 5000 },
        ramTotal: 8 * GB, ramFree: 2.9 * GB, storageTotal: 256 * GB, storageFree: 18 * GB, cpu: { cores: 8, maxMhz: 3000, soc: 'Mediatek MT6895', abi: 'arm64-v8a' },
        screen: { w: 1080, h: 2400, hz: 60, maxHz: 120, dpi: 440, hdr: true }, system: { brand: 'Xiaomi', model: '23090RA98G', device: 'duchamp', android: '14', sdk: 34, patch: '2026-05-01', kernel: '5.10.198-android12', build: 'OS1.0.5.0', uptimeMin: 3000 },
        sensors: ['Accelerometer', 'Gyroscope'], network: 'Wi-Fi', secureLock: true };
      case 'phoneChecks': return { score: 72, checks: [{ k: 'lock', ok: true, t: 'Ekran kilidi', d: 'PIN var.', w: 3 }, { k: 'patch', ok: false, t: 'Güvenlik yaması', d: '2026-05-01 (6 ay önce)', w: 2 }, { k: 'adb', ok: false, t: 'USB hata ayıklama', d: 'Açık.', w: 1 }] };
      case 'schedules': return sched;
      case 'saveSchedules': sched = a.list; return true;
      case 'torch': return { ok: true, msg: 'Fener açık' };
      default: return true;
    }
  };
  const asyncM = (id, m, a) => {
    switch (m) {
      case 'scanClean': window.__progress(id, '12000 dosya tarandı…'); return scan;
      case 'scanApps': return apps;
      case 'shortcuts': return shortcuts;
      case 'delete': return { freed: a.paths.length * 3 * MB, done: a.paths.length, deleted: a.paths, failed: [], freeBytes: 19 * GB };
      case 'set': return a.key === 'anim' ? { ok: false, need: 'shizuku', msg: 'Shizuku gerekli', label: 'Animasyon hızı' } : { ok: true, msg: 'Tamam' };
      case 'applyMode': return { name: 'Gece modu', ok: 3, failed: 1, results: [
        { label: 'Parlaklık', ok: true, msg: 'Parlaklık %8' }, { label: 'Ekran zaman aşımı', ok: true, msg: 'Ekran 30 sn sonra kapanacak' },
        { label: 'Zil modu', ok: true, msg: 'Zil: titreşim' }, { label: 'Rahatsız etmeyin', ok: false, need: 'dnd', msg: '"Rahatsız etmeyin erişimi" izni gerekli' }] };
      case 'addTile': return { result: 'added' };
      case 'permAudit': return { groups: [{ k: 'camera', t: 'Kamera', apps: [{ pkg: 'com.instagram.android', label: 'Instagram' }] }, { k: 'mic', t: 'Mikrofon', apps: [] }] };
      case 'appList': return { usage: true, total: 30 * GB, cache: 2 * GB, apps: [
        { pkg: 'com.whatsapp', label: 'WhatsApp', app: 120 * MB, data: 4 * GB, cache: 300 * MB, lastUsed: Date.now(), installed: Date.now() - 900 * d, enabled: true },
        { pkg: 'com.old.game', label: 'Eski Oyun', app: 1.5 * GB, data: 200 * MB, cache: 10 * MB, lastUsed: Date.now() - 200 * d, installed: Date.now() - 400 * d, enabled: true }] };
    }
    return null;
  };
  window.AndroidBridge = {
    sync: (m, a) => JSON.stringify(syncM(m, JSON.parse(a))),
    async: (id, m, a) => setTimeout(() => window.__done(id, asyncM(id, m, JSON.parse(a))), 50),
  };
});
await page.goto('file://' + path.resolve(html));
const shot = async n => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, n + '.png'), fullPage: true }); };
const tap = async t => { await page.getByText(t, { exact: false }).first().click(); await page.waitForTimeout(200); };
const back = async () => { await page.evaluate(() => window.__onBack()); await page.waitForTimeout(150); };
await shot('01-ana');
await tap('Temizlik'); await tap('Taramayı başlat'); await page.waitForTimeout(400); await shot('02-temizlik');
await tap('Kopya fotoğraflar'); await tap('Her gruptan en eskiyi koru'); await shot('03-kopyalar');
await tap("Eski APK'lar"); await shot('04-apk');
await page.locator('#dock .btn').click(); await shot('05-sil-onay');
await page.locator('#delGo').click(); await page.waitForTimeout(400); await shot('06-silindi');
await back(); await back();
await tap('Güvenlik kontrolü'); await tap('Uygulamaları tara'); await page.waitForTimeout(300);
await page.locator('.app .head').first().click(); await shot('07-guvenlik');
await back();
await tap('Gizli ayarlar'); await page.waitForTimeout(400); await shot('08-gizli');
await back();
await tap('Tek tık ayarlar'); await shot('09-tektik');
await page.getByRole('button', { name: 'Uygula' }).first().click(); await page.waitForTimeout(300); await shot('10-mod-sonuc');
await back();
await page.getByRole('button', { name: 'Düzenle' }).first().click(); await shot('11-mod-duzenle');
await back();
await page.getByRole('button', { name: 'Kur', exact: true }).click(); await shot('12-shizuku');
await back(); await back();
await tap("Android'in izin vermedikleri"); await shot('13-sinirlar');
await back();
await tap('Telefon durumu'); await shot('14-telefon'); await back();
await tap('Hakkında ve güncelleme'); await shot('15-hakkinda'); await back();
await tap('Temizlik'); await tap('Yeniden tara'); await page.waitForTimeout(300); await tap('Çöp dosyalar'); await shot('16-cop');
await tap('Uygulama yöneticisi'); await page.waitForTimeout(300); await page.locator('.chk').nth(1).click(); await shot('17-uygulamalar'); await back(); await back();
await tap('Güvenlik kontrolü'); await tap('İzin denetimi'); await page.waitForTimeout(300); await page.locator('.app .head').first().click(); await shot('18-izinler'); await back(); await back();
await tap('Gizli ayarlar'); await page.waitForTimeout(300); await page.locator('.search input').fill('pil'); await shot('19-gizli-arama'); await back();
await tap('Tek tık ayarlar'); await tap('Zamanlama ekle'); await shot('20-zamanlayici'); await back(); await back();
const stillHome = await page.evaluate(() => window.__onBack());
console.log('anasayfada geri =', stillHome, '(false olmalı)');
console.log('errors', errors);
await browser.close();
