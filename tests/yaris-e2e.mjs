// Gece Kaçağı uçtan uca test: açılış → hikâye → ilk yarış → menüler → farklı yarış türleri
// Kullanım: node yaris-e2e.mjs ../yaris/src/main/assets/index.html <çıktı klasörü>
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'path';
const html = path.resolve(process.argv[2] || '../yaris/src/main/assets/index.html');
const out = process.argv[3] || '/tmp/yaris-test';
const HIZLI = !!process.env.HIZLI;
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 400 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
// gerçek dokular/modeller dosyadan (file://) yüklenemez: küçük bir yerel sunucu aç
const http = require('http'), fs = require('fs');
const root = path.dirname(html);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
await page.goto('http://127.0.0.1:' + srv.address().port + '/' + path.basename(html));
await page.waitForFunction(() => document.getElementById('tapStart').textContent.indexOf('DOKUN') >= 0, null, { timeout: 90000 });
console.log('varlıklar', await page.evaluate(() => window.VARLIK && window.VARLIK.ready));
await page.waitForTimeout(1500);
const shot = async n => { if (!HIZLI) await page.screenshot({ path: `${out}/${n}.png` }); };
await shot('01-acilis');
await page.click('#title');
await page.waitForTimeout(400);
await shot('02-hikaye');
await page.click('#dlgSkip');
await page.waitForTimeout(2500);
// ilk yarış başladı mı
const dbg = () => page.evaluate(() => window.YARIS._dbg());
console.log('yarış', JSON.stringify(await dbg()));
await page.waitForTimeout(4200);
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(3000);
await shot('03-yaris');
await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(1500); await page.keyboard.up('ShiftLeft');
await shot('04-nitro');
console.log('3 sn sonra', JSON.stringify(await dbg()));
await page.keyboard.up('ArrowUp');
// yarışı otomatik pilotla hızlıca bitir: oyuncuyu bitişe ışınla
await page.evaluate(() => { const R = window.YARIS.R; R.player.lap = R.laps - 1; R.player.s = R.T.L - 30; });
await page.keyboard.down('ArrowUp');
await page.waitForFunction(() => document.getElementById('res').classList.contains('on'), null, { timeout: 30000 }).catch(() => {});
await page.keyboard.up('ArrowUp');
console.log('bitiş', JSON.stringify(await dbg()), JSON.stringify(errors.slice(0,3)));
await shot('05-sonuc');
console.log('sonuç ekranı', await page.evaluate(() => document.getElementById('res').classList.contains('on')), await page.evaluate(() => document.getElementById('resBig').textContent));
await page.click('#rCont');
await page.waitForTimeout(300);
await page.click('#dlgSkip').catch(() => {});
await page.waitForTimeout(600);
await page.evaluate(() => window.A.closeModal());
for (const t of ['kariyer', 'hizli', 'serbest', 'meydan', 'garaj', 'gunluk', 'basarim', 'ayar']) {
  await page.evaluate(t => window.A.tab(t), t);
  await page.waitForTimeout(250);
  await shot('06-menu-' + t);
}
await page.evaluate(() => { window.A.tab('garaj'); window.A.gt('gorunum'); });
await page.evaluate(() => { window.A.dr('vinyl', 3); window.A.dr('neon', 2); window.A.dr('spoiler', 4); window.A.dr('kit', 2); });
await page.waitForTimeout(400);
await shot('07-garaj-gorunum');
await page.evaluate(() => window.A.drUndo());
// tüm yarış türlerini kısa kısa dene
const types = [['drag', 'l4'], ['eleme', 'l3'], ['hiz', 'l5'], ['gise', 'l2'], ['drift', 'l1'], ['kovala', 'l2'], ['kacis', 'm2'], ['sprint', 'd2'], ['devre', 'h1']];
for (const [tip, pist] of types) {
  await page.evaluate(([tip, pist]) => {
    const A = window.A; A.S.kar.rakip = 1; // tüm bölgeler açık
    A.tab('hizli'); A.qr('tip', tip); const tr = window.VERI.TRACKS.find(t => t.id === pist); A.qr('bolge', tr.bolge); A.qr('pist', pist);
    if (tip === 'devre' || tip === 'sprint') { A.qr('hava', 'yagmur'); A.qr('polis', 3); }
    if (tip === 'drift') A.qr('saat', 'gunduz');
    if (tip === 'hiz') A.qr('saat', 'aksam');
    A.qrStart();
  }, [tip, pist]);
  await page.waitForTimeout(5000);
  await page.keyboard.down('ArrowUp');
  if (tip === 'drag') { for (let i = 0; i < 4; i++) { await page.waitForTimeout(700); await page.keyboard.press('KeyQ'); } }
  else if (tip === 'drift') { await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Space'); await page.waitForTimeout(1500); await page.keyboard.up('Space'); await page.keyboard.up('ArrowLeft'); }
  else await page.waitForTimeout(2500);
  if (tip === 'kovala' || tip === 'kacis') await page.evaluate(() => { const R = window.YARIS.R; R.purs.heat = 4; R.purs.blockT = 0; R.purs.heatT = 0; });
  await page.waitForTimeout(1500);
  await shot('08-' + tip);
  const d = await dbg();
  console.log(tip, JSON.stringify(d));
  await page.keyboard.up('ArrowUp');
  await page.evaluate(() => { window.YARIS.stopRace(); window.A.goMenu(); });
}
// serbest sürüş
await page.evaluate(() => { window.A.tab('serbest'); window.A.frStart(); });
await page.waitForTimeout(2500);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(3000); await page.keyboard.up('ArrowUp');
await shot('09-serbest');
console.log('serbest', JSON.stringify(await dbg()));
await page.evaluate(() => { window.YARIS.stopRace(); window.A.goMenu(); });
// kayıt geri yükleme
await page.reload(); await page.waitForFunction(() => document.getElementById('tapStart').textContent.indexOf('DOKUN') >= 0, null, { timeout: 90000 });
console.log('kayıt', await page.evaluate(() => JSON.stringify({ para: window.A.S.para, bitti: Object.keys(window.A.S.kar.bitti).length, ilk: window.A.S.ilk })));
console.log('errors', JSON.stringify(errors.slice(0, 10)));
await browser.close(); srv.close();
