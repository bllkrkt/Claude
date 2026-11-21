// Efsane Yolu v5 çanta/beceri/yoldaş/duvar testi: node yan-canta.mjs <index.html> <çıktı klasörü>  → son satır "errors []"
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path'; import fs from 'fs';
const html = path.resolve(process.argv[2] || '../yan/src/main/assets/index.html');
const out = process.argv[3] || '/tmp/yan-canta'; fs.mkdirSync(out, { recursive: true });
const errors = [], b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
const wait = ms => pg.waitForTimeout(ms), ev = (f, a) => pg.evaluate(f, a), check = (ok, msg) => { if (!ok) errors.push('KONTROL: ' + msg); };
await pg.goto('file://' + html); await wait(500);
await ev(() => localStorage.clear()); await pg.reload(); await wait(500);
// oyuna gir, eşya ver
await pg.click('[data-a=chap]'); await wait(150); await pg.click('[data-a=go][data-v="0"]'); await wait(500);
if (await ev(() => __T.state) === 'story') { await pg.click('#sskip'); await wait(300); }
check(await ev(() => __T.state) === 'play', 'oyun başlamadı');
await ev(() => { const T = __T; T.SV.gold = 99999; T.SV.oz = 500; for (let i = 0; i < 18; i++) T.gainItem(T.mkItem(i % 5)); for (const k of ['kok', 'kara', 'cadi']) T.gainItem(T.mkTrophy(k)); T.gainXP(5000); });
const s1 = await ev(() => ({ n: __T.SV.inv.length, lv: __T.SV.plv, eq: Object.values(__T.SV.eq).filter(Boolean).length, pw: Object.keys(__T.stats().pw).length }));
check(s1.n >= 20 && s1.lv > 3 && s1.eq >= 5 && s1.pw >= 1, 'eşya/seviye: ' + JSON.stringify(s1));
await ev(() => __T.ACT.pause()); await wait(150); await pg.click('[data-a=bag]'); await wait(250);
await pg.screenshot({ path: out + '/1-canta.png' });
// ayrıntı + güçlendir + kilit + dövme
const id = await ev(() => __T.SV.inv.find(i => i.r >= 2 && __T.SV.eq[i.s] !== i.id).id);
await pg.click(`.tl[data-v="${id}"]`); await wait(150); await pg.screenshot({ path: out + '/2-ayrinti.png' });
for (let i = 0; i < 8; i++) { await pg.click('[data-a=up]'); await wait(40); }
check(await ev(i => __T.SV.inv.find(x => x.id === i).u, id) >= 4, 'güçlendirme');
await pg.click('[data-a=rf]'); await wait(80); await pg.click('[data-a=lock]'); await wait(80);
check(await ev(i => __T.SV.inv.find(x => x.id === i).lk, id) === 1, 'kilit');
check(await pg.$('[data-a=sell]') === null, 'kilitli eşya satılabiliyor');
await pg.click('[data-a=eq]'); await wait(80);
check(await ev(i => Object.values(__T.SV.eq).includes(i), id), 'takma');
await pg.click('[data-a=dback]'); await wait(80);
// filtre, sıralama, toplu sat
await pg.click('[data-a=bf][data-v=r]'); await wait(80); await pg.click('[data-a=bsort]'); await wait(80);
await pg.click('[data-a=bf][data-v=all]'); await wait(80);
const n0 = await ev(() => __T.SV.inv.length); await pg.click('[data-a=bulk][data-v=sell]'); await wait(80); await pg.click('[data-a=bulk][data-v=sell]'); await wait(80);
check(await ev(() => __T.SV.inv.length) < n0, 'toplu sat');
await pg.click('[data-a=bagx]'); await wait(80); check(await ev(() => __T.SV.bagX) === 1, 'çanta genişletme');
// v6: en iyileri tak, toplu güçlendir, birleştir
await pg.click('[data-a=best]'); await wait(80);
const u0 = await ev(() => Object.values(__T.SV.eq).map(i => __T.SV.inv.find(x => x.id === i)).filter(Boolean).reduce((a, i) => a + (i.u | 0), 0));
await pg.click('[data-a=bup]'); await wait(80);
check(await ev(() => Object.values(__T.SV.eq).map(i => __T.SV.inv.find(x => x.id === i)).filter(Boolean).reduce((a, i) => a + (i.u | 0), 0)) > u0, 'toplu güçlendirme');
await ev(() => { for (let i = 0; i < 6; i++) __T.gainItem(__T.mkItem(0, { r: 0, s: 'w' })); __T.reBag(); });
await pg.click('[data-a=mmode]'); await wait(80);
const ids = await ev(() => __T.SV.inv.filter(i => i.r === 0 && !i.lk && !Object.values(__T.SV.eq).includes(i.id)).slice(0, 3).map(i => i.id));
for (const i of ids) { await pg.click(`.tl[data-v="${i}"]`); await wait(40); }
await pg.screenshot({ path: out + '/2b-birlestir.png' });
const n1 = await ev(() => __T.SV.inv.length); await pg.click('[data-a=mgo]'); await wait(100);
check(await ev(() => __T.SV.inv.length) === n1 - 2 && await ev(() => __T.SV.inv.find(i => i.id === __T.DET).r) === 1, 'birleştirme');
await pg.click('[data-a=dback]'); await wait(60); await pg.click('[data-a=mmode]'); await wait(60); await pg.click('[data-a=amrg]'); await wait(60); await pg.click('[data-a=amrg]'); await wait(80);
check(await ev(() => __T.SV.dq.q.length) === 3, 'günlük görev oluşmadı');
// beceriler
await pg.click('[data-a=btab][data-v=skl]'); await wait(120);
const a0 = await ev(() => __T.stats().atk); await pg.click('[data-a=sk][data-v=str]'); await wait(80);
check(await ev(() => __T.stats().atk) > a0, 'beceri saldırı');
await pg.screenshot({ path: out + '/3-beceri.png' });
// yoldaş
await ev(() => { __T.SV.pets.peri = 1; __T.SV.pets.ejder = 2; }); await pg.click('[data-a=btab][data-v=pet]'); await wait(150);
await pg.click('[data-a=pet][data-v=ejder]'); await wait(80); await pg.click('[data-a=pup][data-v=ejder]'); await wait(80);
check(await ev(() => __T.SV.pet === 'ejder' && __T.SV.pets.ejder === 3), 'yoldaş seç/besle');
await pg.screenshot({ path: out + '/4-yoldas.png' });
await pg.click('[data-a=back]'); await wait(100); check(await ev(() => __T.menu) === 'pause', 'çantadan geri');
await pg.click('[data-a=resume]'); await wait(100);
// yoldaş saldırısı: düşman yanına ışınla
await ev(() => { window.__g = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 50); const e = __T.ENS.find(e => !e.dead); __T.tp(e.x / 32 - 3); });
const k0 = await ev(() => __T.ENS.filter(e => !e.dead).length); await wait(3500);
check(await ev(() => __T.ENS.filter(e => !e.dead).length) < k0 || await ev(() => __T.ENS.some(e => e.burn > 0 || e.hp < e.mhp)), 'yoldaş saldırmadı');
await pg.screenshot({ path: out + '/5-yoldas-oyun.png' });
// duvar kayması: soldaki harita sınırına bas
await ev(() => { __T.tp(1, 5); __T.P.vy = 50; __T.I.l = 1; }); await wait(250);
const w = await ev(() => ({ wall: __T.P.wall, vy: __T.P.vy })); await ev(() => { __T.P.jb = .12; }); await wait(60);
const w2 = await ev(() => ({ vx: __T.P.vx, vy: __T.P.vy })); await ev(() => { __T.I.l = 0; clearInterval(window.__g); });
check(w.wall === -1 && w.vy <= 120, 'duvar kayması: ' + JSON.stringify(w)); check(w2.vx > 0 && w2.vy < 0, 'duvardan zıplama: ' + JSON.stringify(w2));
// günlük görevler
await ev(() => { __T.SV.dq.q.forEach(q => q.p = q.t); __T.ACT.pause(); }); await wait(100); await pg.click('[data-a=dq]'); await wait(120);
const gq = await ev(() => __T.SV.gold); for (let i = 0; i < 3; i++) { await pg.click(`[data-a=dqc][data-v="${i}"]`); await wait(60); } await pg.click('[data-a=dqb]'); await wait(80);
check(await ev(() => __T.SV.gold) > gq && await ev(() => __T.SV.dq.b) === 1, 'görev ödülü');
await pg.screenshot({ path: out + '/5b-gorev.png' }); await pg.click('[data-a=back]'); await wait(80);
check(await ev(() => __T.menu) === 'pause', 'görevlerden geri');
// İngilizce çanta
await ev(() => { __T.SV.lang = 'en'; localStorage.setItem('efsane-yolu-v1', JSON.stringify(__T.SV)); }); await pg.reload(); await wait(500);
await pg.click('[data-a=dq]'); await wait(120); { const x = await ev(() => document.querySelector('#scr').innerText); const bd = x.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd, 'EN görev: ' + (bd || []).slice(0, 3).join(' / ')); } await pg.click('[data-a=back]'); await wait(80);
await pg.click('[data-a=bag]'); await wait(200); await pg.screenshot({ path: out + '/6-en.png' });
const tx = await ev(() => document.querySelector('#scr').innerText);
const bad = tx.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bad, 'İngilizcede Türkçe: ' + (bad || []).slice(0, 4).join(' / '));
for (const t of ['skl', 'pet']) { await pg.click(`[data-a=btab][data-v=${t}]`); await wait(120); const x = await ev(() => document.querySelector('#scr').innerText); const bd = x.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd, 'EN ' + t + ': ' + (bd || []).slice(0, 4).join(' / ')); }
await pg.click('[data-a=btab][data-v=inv]'); await wait(100); await pg.click('.tl:not(.em)'); await wait(100);
const dx = await ev(() => document.querySelector('#scr').innerText); const bd2 = dx.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd2, 'EN ayrıntı: ' + (bd2 || []).slice(0, 4).join(' / '));
await b.close();
console.log('errors', JSON.stringify(errors));
