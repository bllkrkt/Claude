// Gece Kaçağı sürüş ölçümü (v16): arcade modelin her durumda kontrollü olduğunu sayılarla gösterir.
// Kullanım: node yaris-surus.mjs ../yaris/src/main/assets/index.html
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'path';
const html = path.resolve(process.argv[2] || '../yaris/src/main/assets/index.html');
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 400 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const http = require('http'), fs = require('fs');
const root = path.dirname(html);
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200); r.end(d); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
await page.goto('http://127.0.0.1:' + srv.address().port + '/' + path.basename(html));
await page.waitForFunction(() => document.getElementById('tapStart').textContent.indexOf('DOKUN') >= 0, null, { timeout: 90000 });
const W = ms => page.waitForTimeout(ms);
await page.click('#title'); await W(500);
for (let i = 0; i < 8; i++) { if (await page.evaluate(() => document.getElementById('dlg').classList.contains('on'))) { await page.click('#dlgSkip'); await W(400); } }
await page.evaluate(() => { window.YARIS.stopRace(); window.A.closeModal && window.A.closeModal(); });
const run = async (asst) => page.evaluate(async (asst) => {
  const A = window.A; A.set('yardim', asst); A.tab('hizli'); A.qr('tip', 'sprint'); A.qr('rakip', 1); A.qrStart();
  await new Promise(r => setTimeout(r, 2500));
  const Y = window.YARIS, I = Y.input, r = Y.R, pl = r.player, out = [];
  r.phase = 'yaris'; r.count = 0; r.traffic.length = 0;
  const rv = r.racers.find(c => !c.isPlayer); rv.s = pl.s - 3000; rv.out = true;
  pl.st.vmax = 70;
  const reset = (kmh, d) => { for (const k in I) I[k] = 0; pl.v = kmh / 3.6; pl.vy = 0; pl.yaw = 0; pl.a = 0; pl.ba = 0; pl._a = 0; pl.slip = 0; pl.d = d || 0; pl.steer = 0; pl.alignA = 9; pl.sc = null; };
  const sim = (sec, f) => { const rec = []; for (let i = 0; i < sec * 60; i++) { if (f) f(i / 60); Y._fast(1 / 60, 0); rec.push({ t: i / 60, yaw: pl.yaw || 0, slip: pl.slip || 0, v: pl.v, a: pl.a, d: pl.d }); } return rec; };
  const osc = rec => { let n = 0; for (let i = 20; i < rec.length - 1; i++) { const d1 = rec[i].yaw - rec[i - 1].yaw, d2 = rec[i + 1].yaw - rec[i].yaw; if (d1 * d2 < -1e-6 && Math.abs(d1) > 0.004) n++; } return n; };
  const mx = (rec, k) => Math.max(...rec.map(e => Math.abs(e[k])));
  // 1) sabit tam direksiyon (duvara değmemesi için 1,2 sn)
  for (const kmh of [40, 80, 120, 160]) {
    reset(kmh, -4); I.gas = 1;
    const rec = sim(1.2, () => { I.steer = 1; });
    const last = rec[rec.length - 1];
    out.push(`tam direksiyon ${kmh} km/s: dönüş ${last.yaw.toFixed(2)} rad/sn, yanal ${(last.yaw * last.v / 9.81).toFixed(2)}g, en çok kayma ${mx(rec, 'slip').toFixed(2)}, salınım ${osc(rec)}, hız ${(last.v * 3.6).toFixed(0)}`);
  }
  // 2) slalom 110 km/s
  reset(110, 0); I.gas = 1;
  let rec = sim(5, t => { I.steer = Math.sin(t * 2 * Math.PI / 1.4) > 0 ? 0.7 : -0.7; });
  out.push(`slalom 110 km/s: en çok kayma ${mx(rec, 'slip').toFixed(2)}, en çok dönüş ${mx(rec, 'yaw').toFixed(2)}, en çok açı ${mx(rec, 'a').toFixed(2)}, duvar ${r.stats.duvar}`);
  // 3) el freni drifti + bırakma (duvarlar geçici uzak: sadece arabanın davranışı ölçülür)
  const W0 = r.T.W; r.T.W = 400;
  reset(90, -3); I.gas = 1;
  rec = sim(0.9, () => { I.steer = 0.8; I.hb = 1; });
  const dMax = mx(rec, 'slip');
  I.hb = 0;
  const rec2 = sim(1.5, t => { I.steer = 0; });
  const rt = (rec2.find(e => Math.abs(e.slip) < 0.08) || { t: 9 }).t;
  out.push(`el freni 90 km/s: en çok kayma ${dMax.toFixed(2)} rad (${(dMax * 57.3).toFixed(0)}°), bırakınca ${rt.toFixed(2)} sn'de toparlandı, hız ${(rec2[rec2.length - 1].v * 3.6).toFixed(0)}, toparlanmada en çok dönüş ${mx(rec2, 'yaw').toFixed(2)}`);
  // 3b) oyuncu gibi drift: virajda el freni + direksiyon 3 sn → drift puanı birikmeli
  reset(85, -2); I.gas = 1; const D0 = r.drift.total || 0;
  rec = sim(3, t => { I.hb = t < 2.4 ? 1 : 0; I.steer = t < 2.4 ? 0.6 : -0.2; });
  const vEnd = pl.v; sim(0.6);
  out.push(`drift 3 sn: en çok kayma ${(mx(rec, 'slip') * 57.3).toFixed(0)}°, kazanılan puan ${Math.round((r.drift.total || 0) - D0 + (r.drift.pts || 0))}, drift sonu hız ${(vEnd * 3.6).toFixed(0)} km/s (85'ten), dönülen açı ${(rec.reduce((q, e) => q + e.yaw / 60, 0) * 57.3).toFixed(0)}°`);
  r.T.W = W0;
  // 4) duvara 30° çarpma
  const T = r.T; reset(100, 0); pl.a = 0.5; pl.ba = 0.5; pl._a = 0.5; I.gas = 1;
  const d0 = r.stats.duvar;
  rec = sim(2, () => { I.steer = 0; });
  const hitI = rec.findIndex((e, i) => i > 0 && Math.abs(e.a) < Math.abs(rec[i - 1].a) - 0.2);
  const after = hitI >= 0 ? rec.slice(hitI) : rec;
  const st = (after.find(e => Math.abs(e.slip) < 0.08) || { t: 9 }).t - (after[0] ? after[0].t : 0);
  out.push(`duvara 30° 100 km/s: çarpma ${r.stats.duvar - d0 > 0 ? 'var' : 'yok'}, sonrası kayma en çok ${mx(after, 'slip').toFixed(2)}, ${st.toFixed(2)} sn'de toparlandı, salınım ${osc(after)}, hız ${(rec[rec.length - 1].v * 3.6).toFixed(0)}`);
  // 5) rakibe arkadan çarpma: çarpma anında rakibin hızı artmamalı
  rv.out = false; reset(110, 0); rv.s = pl.s + 9; rv.d = 0.4; rv.v = 70 / 3.6; rv.a = 0; I.gas = 1;
  let before = null, jump = 0, ci = -1;
  rec = sim(1.2, t => { const gap = rv.s - pl.s; if (ci < 0 && gap < (rv.L + pl.L) / 2 + 0.3) { ci = Math.round(t * 60); before = rv.v; } if (ci >= 0 && Math.round(t * 60) <= ci + 3) jump = Math.max(jump, rv.v - before); });
  out.push(`rakibe arkadan 110→70 km/s: ${ci >= 0 ? 'çarptı' : 'çarpmadı'}, çarpmada rakibin hız artışı ${(jump * 3.6).toFixed(1)} km/s (≤0 olmalı), oyuncu kayma en çok ${mx(rec, 'slip').toFixed(2)}, salınım ${osc(rec)}`);
  window.YARIS.stopRace();
  return out;
}, asst);
for (const a of [0, 2]) { console.log('── sürüş yardımı ' + ['kapalı', 'az', 'orta'][a]); console.log((await run(a)).join('\n')); }
// 6) tekerlek aksları: her gerçek modelde tekerlek parçalarının kutusu merkezde mi
const wh = await page.evaluate(async () => {
  const V = window.VARLIK, out = [];
  for (const id of V.ARABALAR) {
    const C = await new Promise(res => { const c = V.car(id); if (c) return res(c); const t0 = Date.now(); const iv = setInterval(() => { const c2 = V.car(id); if (c2 || Date.now() - t0 > 15000) { clearInterval(iv); res(c2); } }, 100); });
    if (!C) { out.push(id + ' yüklenmedi'); continue; }
    let worst = 0;
    const g = {};
    for (const p of C.parts) if (p.w) { p.geo.computeBoundingBox(); const b = p.geo.boundingBox; (g[p.w] = g[p.w] || b.clone()).union(b); }
    for (const k in g) { const c = g[k].getCenter(new window.THREE.Vector3()); worst = Math.max(worst, c.length()); }
    out.push(id + ' ' + (worst * 100).toFixed(1) + 'cm');
  }
  return out;
});
console.log('── tekerlek aksı kayması (0 olmalı): ' + wh.join(', '));
console.log('errors', errors.slice(0, 5));
await browser.close(); srv.close();
