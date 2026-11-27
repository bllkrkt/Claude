// Efsane Yolu yağmur testi: node yan-yagmur.mjs <index.html (mutlak yol)> <çıktı klasörü>
// Telefonda damlalar ikişer ikişer "//" diziliyordu (konum damla sırasından düz formülle). Bu test her ekran boyutunda yan yana çift oranını ölçer.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path'; import fs from 'fs';
const html = path.resolve(process.argv[2] || '../yan/src/main/assets/index.html');
const out = process.argv[3] || '/tmp/yan-yagmur'; fs.mkdirSync(out, { recursive: true });
const errors = [];
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 720, height: 360 }, deviceScaleFactor: 1, locale: 'tr-TR' })).newPage();
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
await pg.goto('file://' + html); await pg.waitForTimeout(800);
const r = await pg.evaluate(() => {
  if (typeof rainPts !== 'function') return { yok: 1 };
  let kotu = 0, enKotu = 0;
  for (let W = 600; W <= 960; W += 6) for (let H = 300; H <= 440; H += 8) for (const t of [1.3, 2.9, 4.1, 7.7]) {
    const P = rainPts(75, t, W, H, 0); let c = 0;
    for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) if (j !== i && P[i][3] === P[j][3] && Math.abs(P[i][1] - P[j][1]) < 6 && Math.abs(P[i][0] - P[j][0]) < 14) { c++; break; }
    const o = c / P.length; enKotu = Math.max(enKotu, o); if (o > .2) kotu++;
  }
  return { kotu, enKotu: Math.round(enKotu * 100) };
});
if (r.yok) errors.push('KONTROL: rainPts tanımlı değil');
else { console.log('en kötü yan yana çift oranı: %' + r.enKotu); if (r.kotu) errors.push('KONTROL: ' + r.kotu + ' ekran boyutunda damlaların %20\'den fazlası yan yana çift'); }
// Görsel: 1. bölümde yağmuru zorla, ekran görüntüsü al
await pg.click('[data-a=chap]'); await pg.waitForTimeout(150); await pg.click('[data-a=go][data-v="0"]'); await pg.waitForTimeout(500);
if (await pg.evaluate(() => __T.state) === 'story') { await pg.evaluate(() => storyEnd()); await pg.waitForTimeout(300); }
await pg.evaluate(() => { __T.L.wx = 'rain'; __T.P.inv = 99; }); await pg.waitForTimeout(900);
await pg.screenshot({ path: out + '/yagmur.png' });
await pg.evaluate(() => { __T.L.wx = 'storm'; }); await pg.waitForTimeout(400);
await pg.screenshot({ path: out + '/firtina.png' });
console.log('errors', JSON.stringify(errors));
await b.close();
