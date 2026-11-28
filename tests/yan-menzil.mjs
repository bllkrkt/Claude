// Efsane Yolu menzil dengesi testi (v24): node yan-menzil.mjs <index.html (mutlak yol)> <çıktı klasörü>
// Okçu/Büyücü uzaktan bedava kesiyordu: uzaklık cezası, mermi kesmenin sadece 3. vuruşta olması, boss'un uzaktaki oyuncuya atılması.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path'; import fs from 'fs';
const html = path.resolve(process.argv[2] || '../yan/src/main/assets/index.html');
const out = process.argv[3] || '/tmp/yan-menzil'; fs.mkdirSync(out, { recursive: true });
const errors = [];
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, locale: 'tr-TR' })).newPage();
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
const wait = ms => pg.waitForTimeout(ms), ev = (f, a) => pg.evaluate(f, a);
const check = (ok, msg) => { if (!ok) errors.push('KONTROL: ' + msg); };
await pg.goto('file://' + html); await wait(800);
// 1) uzaklık cezası
const f = await ev(() => typeof rngMul !== 'function' ? null : [rngMul({ x0: 0, x: 100 }), rngMul({ x0: 0, x: 300 }), rngMul({ x0: 500, x: 100 }), rngMul({ x: 50 })]);
check(f, 'rngMul tanımlı değil');
if (f) {
  check(f[0] === 1, 'yakında hasar tam değil: ' + f[0]);
  check(Math.abs(f[1] - .65) < .03, 'menzil sonunda hasar ~%65 değil: ' + f[1]);
  check(Math.abs(f[2] - f[1]) < .03, 'sola atışta ceza farklı: ' + f[2]);
  check(f[3] === 1, 'başlangıcı olmayan mermide ceza var: ' + f[3]);
}
// 2) oyuna gir, okçu ve büyücü atışları
await pg.click('[data-a=chap]'); await wait(150); await pg.click('[data-a=go][data-v="0"]'); await wait(500);
if (await ev(() => __T.state) === 'story') { await ev(() => storyEnd()); await wait(300); }
const sh = await ev(() => { const o = {}; for (const c of ['arc', 'mag']) { __T.SV.cls = c; for (const cb of [0, 2]) { __T.P.combo = cb; const n0 = PRJ.length; shoot(); const q = PRJ[PRJ.length - 1]; o[c + cb] = { x0: q.x0 != null, cut: !!q.cut, menzil: Math.round(Math.abs(q.vx) * q.life) }; PRJ.length = n0; } } __T.SV.cls = 'war'; return o; });
for (const k in sh) { check(sh[k].x0, k + ': mermide başlangıç noktası yok'); check(sh[k].menzil <= 310, k + ': menzil çok uzun ' + sh[k].menzil); }
check(!sh.arc0.cut && !sh.mag0.cut, 'normal atış düşman mermisini hâlâ kesiyor');
check(sh.arc2.cut && sh.mag2.cut, '3. vuruş düşman mermisini kesmiyor');
// 3) boss: oyuncu uzakta oyalanınca yanına atılır
await ev(() => { __T.SV.cls = 'arc'; __T.LV.cp = 2; __T.tp(150); __T.P.hp = __T.P.mhp; }); await wait(1200);
await ev(() => { __T.I.r = 1; }); await wait(1400); await ev(() => { __T.I.r = 0; });
check(await ev(() => !!__T.G.boss), 'boss başlamadı');
const r = await ev(() => new Promise(res => { let gc = false, enUzak = 0, sonra = 1e9; const t0 = performance.now();
  const iv = setInterval(() => { const B = __T.G.boss, P = __T.P; if (!B) return; P.inv = 5; P.hp = P.mhp;
    if (!gc) { P.x = (B.x + B.w / 2 < (L.arena.x0 + L.arena.wall) * 16) ? L.arena.wall * 32 - 40 : L.arena.x0 * 32 + 12; }
    const d = Math.abs(P.x + P.w / 2 - B.x - B.w / 2); if (!gc) enUzak = Math.max(enUzak, d);
    if (B.st === 'gc') { gc = true; if (BUB.some(q => q.e === B)) window.__gcSay = 1; } if (BUB.some(q => q.e === P) && gc) window.__gcRep = 1; if (gc) sonra = Math.min(sonra, d);
    if (performance.now() - t0 > 9000 || (gc && B.st !== 'gc')) { clearInterval(iv); res({ gc, enUzak: Math.round(enUzak), sonra: Math.round(sonra) }); } }, 50); }));
console.log('boss:', JSON.stringify(r));
check(r.enUzak > 200, 'test oyuncuyu uzakta tutamadı');
check(r.gc, 'boss uzaktaki oyuncuya atılmadı');
await wait(900);
check(await ev(() => window.__gcSay === 1), 'boss atılırken laf atmadı');
check(await ev(() => window.__gcRep === 1 || BUB.some(q => q.e === __T.P)), 'karakter boss\'a cevap vermedi');
check(r.sonra < 140, 'boss atıldıktan sonra yeterince yaklaşmadı: ' + r.sonra);
await pg.screenshot({ path: out + '/boss.png' });
console.log('errors', JSON.stringify(errors));
await b.close();
