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
// v7: sınıflar ve menzilli saldırı
for (const k of ['arc', 'mag']) {
  await ev(k => { __T.SV.cls = k; window.__g = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 50); const e = __T.ENS.find(e => !e.dead && !e.fly); __T.tp(e.x / 32 - 4, Math.floor((e.y + e.h) / 32)); __T.P.face = 1; window.__e = e; window.__h0 = e.hp; }, k);
  await wait(200); for (let i = 0; i < 6; i++) { await ev(() => { __T.P.ab = .15; }); await wait(120); }
  await ev(() => { __T.P.en = 100; __T.P.sb = .12; }); await wait(900);
  await pg.screenshot({ path: out + '/5c-' + k + '.png' });
  check(await ev(() => window.__e.dead || window.__e.hp < window.__h0), k + ' menzilli saldırı vurmadı');
  await ev(() => clearInterval(window.__g));
}
await ev(() => { __T.SV.cls = 'war'; });
// setler: aynı setten 2 eşya → bonus
const sb = await ev(() => { const T = __T; const i1 = T.mkItem(2, { s: 'h', st: 'kristal' }), i2 = T.mkItem(2, { s: 'b', st: 'kristal' }); T.SV.inv.push(i1, i2); T.SV.eq.h = i1.id; T.SV.eq.b = i2.id; const a = T.stats().crit; i2.st = 'alev'; const b = T.stats().crit; i2.st = 'kristal'; return a - b; });
check(sb >= 8 || await ev(() => __T.stats().crit) === 60, 'set bonusu yok: ' + sb);
check(await ev(() => __T.ENS.every(e => e.mhp > 0)), 'düşman mhp yok');
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
// v8: yeni bölümler, kostüm, başarım, yoldaş evrimi
await ev(() => { __T.ACT.home(); }); await wait(200);
const gd = await ev(() => __T.SV.gold); await pg.click('[data-a=login]'); await wait(120); await pg.screenshot({ path: out + '/6b-gunluk.png' }); await pg.click('[data-a=dlc]'); await wait(120);
check(await ev(() => __T.SV.dl.n === 1) && await ev(() => __T.SV.gold) > gd, 'günlük ödül'); await pg.click('[data-a=back]'); await wait(100);
await ev(() => { for (const i of [0,1,2,4,5,6,7,8,9,10]) __T.SV.lvs[i].done = 1; }); await pg.click('[data-a=chap]'); await wait(200);
await pg.screenshot({ path: out + '/7-harita.png' });
for (const ch of [12, 13, 14, 15, 16, 17]) {
  if (ch !== 12) { await pg.click('[data-a=chap]'); await wait(150); }
  await pg.click(`[data-a=msel2][data-v="${ch}"]`); await wait(100); await pg.click(`[data-a=go][data-v="${ch}"]`); await wait(400);
  if (await ev(() => __T.state) === 'story') { await pg.screenshot({ path: out + '/8-hikaye' + ch + '.png' }); await pg.click('#sskip'); await wait(300); }
  check(await ev(ch => __T.state === 'play' && __T.CH === ch, ch), 'bölüm başlamadı ' + ch);
  check(await ev(ch => __T.ENS.some(e => ({12:'star',13:'crab',14:'cog',15:'scorp',16:'wisp',17:'shade'})[ch] === e.t), ch), 'yeni düşman yok ' + ch);
  await ev(ch => { const e = __T.ENS.find(e => e.t === ({12:'star',13:'jelly',14:'clock',15:'scorp',16:'wisp',17:'star'})[ch]) || __T.ENS[0]; window.__g0 = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 50); __T.tp(e.x / 32 - 3, Math.floor((e.y + e.h) / 32) + 1); }, ch); await wait(1500); await pg.screenshot({ path: out + '/8b-dusman' + ch + '.png' }); await ev(() => clearInterval(window.__g0));
  await ev(() => { window.__g = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 50); __T.tp(__T.L.arena.gate - 2); }); await wait(300);
  await ev(() => { __T.I.r = 1; }); await wait(1200); await ev(() => { __T.I.r = 0; });
  check(await ev(() => !!__T.G.boss), 'boss başlamadı ' + ch); await wait(1500);
  for (const a of {12:['sweep','ring'],13:['erupt','whirl'],14:['hands','ring'],15:['erupt','hands'],16:['ring','whirl'],17:['sweep','burst']}[ch]) { await ev(a => { const B = __T.G.boss; B.st = a; B.n = 0; B.stT = 0; }, a); await wait(1300); }
  await pg.screenshot({ path: out + '/9b-saldiri' + ch + '.png' }); await pg.screenshot({ path: out + '/9-boss' + ch + '.png' });
  await ev(() => { __T.hitBoss(1); window.__k = setInterval(() => { const B = __T.G.boss; if (B && !B.dead && B.st !== 'intro') { B.hp = Math.min(B.hp, 1); __T.P.x = B.x - 24; __T.P.y = B.y + B.h - 30; __T.P.face = 1; __T.P.ab = .15; } }, 60); });
  for (let i = 0; i < 40 && !(await ev(() => __T.G.won)); i++) await wait(250); await ev(() => clearInterval(window.__k)); check(await ev(() => __T.G.won), 'boss yenilmedi ' + ch);
  await ev(ch => { clearInterval(window.__g); __T.SV.lvs[ch].done = 1; __T.ACT.home(); }, ch); await wait(200);
}
check(await ev(() => __T.SV.pets.tilki === 1), 'tilki açılmadı');
// v10: zorluk, haftalık etkinlik, istatistik
check(/Haftanın etkinliği/.test(await pg.textContent('#title')), 'haftalık etkinlik görünmüyor');
const h1 = await ev(() => { __T.loadChapter(15); return __T.diff(); }); await pg.click('[data-a=set]'); await wait(100); await pg.click('[data-a=difc]'); await wait(80);
const h2 = await ev(() => ({ d: __T.SV.dif, h: __T.diff() })); check(h2.d === 2 && h2.h > h1 * 1.5, 'kâbus zorluğu: ' + JSON.stringify(h2) + ' ' + h1);
await pg.click('[data-a=difc]'); await wait(80); check(await ev(() => __T.SV.dif) === 0, 'kolay zorluğu'); await pg.click('[data-a=difc]'); await wait(80); await pg.click('[data-a=back]'); await wait(100);
await pg.click('[data-a=dq]'); await wait(100); await pg.click('[data-a=qtab][data-v=st]'); await wait(100); await pg.screenshot({ path: out + '/12-istatistik.png' });
check(/Oynama süresi/.test(await ev(() => document.querySelector('#scr').innerText)), 'istatistik yok'); await pg.click('[data-a=back]'); await wait(100);
await ev(() => { __T.SV.gold += 5000; __T.SV.kills = Math.max(100, __T.SV.kills); __T.SV.pet = 'tilki'; __T.SV.pets.tilki = 4; }); await pg.click('[data-a=bag]'); await wait(150); await pg.click('[data-a=btab][data-v=pet]'); await wait(100);
await pg.click('[data-a=pup][data-v=tilki]'); await wait(100); check(await ev(() => __T.SV.pets.tilki) === 5, 'evrim besleme');
await pg.click('[data-a=btab][data-v=cls]'); await wait(100); await pg.click('[data-a=buysk][data-v=gece]'); await wait(100);
check(await ev(() => __T.SV.skin === 'gece'), 'kostüm alınamadı'); await pg.screenshot({ path: out + '/10-kostum.png' });
await pg.click('[data-a=back]'); await wait(100); await pg.click('[data-a=dq]'); await wait(100); await pg.click('[data-a=qtab][data-v=ach]'); await wait(100);
const g8 = await ev(() => __T.SV.gold); await pg.click('[data-a=achc][data-v=k100]'); await wait(100);
check(await ev(() => __T.SV.ach.k100 === 1) && await ev(() => __T.SV.gold) > g8, 'başarım ödülü'); await pg.screenshot({ path: out + '/11-basarim.png' });
await pg.click('[data-a=back]'); await wait(100);
// İngilizce çanta
await ev(() => { __T.SV.lang = 'en'; localStorage.setItem('efsane-yolu-v1', JSON.stringify(__T.SV)); }); await pg.reload(); await wait(500);
await pg.click('[data-a=dq]'); await wait(120); await pg.click('[data-a=qtab][data-v=st]'); await wait(80); { const y = await ev(() => document.querySelector('#scr').innerText); const bd = y.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd, 'EN istatistik: ' + (bd || []).slice(0, 3).join(' / ')); } await pg.click('[data-a=qtab][data-v=ach]'); await wait(100); { const x = await ev(() => document.querySelector('#scr').innerText); const bd = x.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd, 'EN görev: ' + (bd || []).slice(0, 3).join(' / ')); } await pg.click('[data-a=back]'); await wait(80);
await pg.click('[data-a=bag]'); await wait(200); await pg.screenshot({ path: out + '/6-en.png' });
const tx = await ev(() => document.querySelector('#scr').innerText);
const bad = tx.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bad, 'İngilizcede Türkçe: ' + (bad || []).slice(0, 4).join(' / '));
for (const t of ['skl', 'pet', 'cls']) { await pg.click(`[data-a=btab][data-v=${t}]`); await wait(120); const x = await ev(() => document.querySelector('#scr').innerText); const bd = x.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd, 'EN ' + t + ': ' + (bd || []).slice(0, 4).join(' / ')); }
await pg.click('[data-a=btab][data-v=inv]'); await wait(100); await pg.click('.tl:not(.em)'); await wait(100);
const dx = await ev(() => document.querySelector('#scr').innerText); const bd2 = dx.match(/[^\n]*[ığüşöçİĞÜŞÖÇ][^\n]*/g); check(!bd2, 'EN ayrıntı: ' + (bd2 || []).slice(0, 4).join(' / '));
await b.close();
console.log('errors', JSON.stringify(errors));
