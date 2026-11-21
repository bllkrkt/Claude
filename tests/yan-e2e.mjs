// Efsane Yolu (yan görünüm) tarayıcı testi: node yan-e2e.mjs <index.html> <çıktı klasörü>
// Son satırda "errors []" görmelisin. Ekran görüntüleri: başlık, oyun, boss, zafer, çanta, İngilizce.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path'; import fs from 'fs';
const html = path.resolve(process.argv[2] || '../yan/src/main/assets/index.html');
const out = process.argv[3] || '/tmp/yan-test'; fs.mkdirSync(out, { recursive: true });
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
const wait = ms => pg.waitForTimeout(ms);
const ev = (f, a) => pg.evaluate(f, a);
const check = (ok, msg) => { if (!ok) errors.push('KONTROL: ' + msg); };
const skip = async (shot) => { await wait(400); if (await ev(() => __T.state) === 'story') { await wait(900); if (shot) await pg.screenshot({ path: out + '/' + shot + '.png' }); await pg.click('#sskip'); await wait(300); } };
await pg.goto('file://' + html); await wait(600);
await pg.screenshot({ path: out + '/1-baslik.png' });
await pg.click('[data-a=chap]'); await wait(150); await pg.click('[data-a=go][data-v="0"]'); await skip('h1-giris');
check(await ev(() => __T.state) === 'play', 'oyun başlamadı');
// Basit bot: sağa koşar, engel/çukur/düşman görünce zıplar, düşman yakınsa vurur
await ev(() => { const T = __T, TS = 32; window.__bot = setInterval(() => {
  const P = T.P; if (T.state !== 'play') return; T.I.r = 1;
  const fx = Math.floor((P.x + P.w + 20) / TS), fy = Math.floor((P.y + P.h + 4) / TS), wy = Math.floor((P.y + P.h - 8) / TS);
  const g = (x, y) => (x < 0 || y < 0 || y >= T.L.g.length) ? 0 : T.L.g[y][x];
  const pit = !g(fx, fy) && !g(fx, fy + 1) && !g(fx, fy + 2) && !g(fx, fy + 3), wall = g(fx, wy) === 1 || g(fx, wy) === 3 || g(fx, wy + 1) === 3;
  const near = T.ENS.find(e => !e.dead && Math.abs(e.x - P.x) < 60 && Math.abs(e.y - P.y) < 50);
  if (near) { P.ab = .15; }
  if ((pit || wall || (near && near.t === 'slime' && Math.random() < .1)) && P.on) { P.jb = .12; T.I.jh = 1; setTimeout(() => T.I.jh = 0, 260); }
  else if (pit && !P.on && P.vy > 60 && P.jumps > 0) { P.jb = .12; T.I.jh = 1; setTimeout(() => T.I.jh = 0, 200); }
  if (P.en >= 100 && near) P.sb = .12;
}, 50); });
await wait(9000);
await pg.screenshot({ path: out + '/2-oyun.png' });
const st1 = await ev(() => ({ x: __T.P.x / 32 | 0, hp: __T.P.hp, kills: __T.G.kills, gold: __T.SV.gold }));
console.log('bot 9 sn sonra:', JSON.stringify(st1));
check(st1.x > 20, 'bot ilerleyemedi');
// Menüler: duraklat → çanta → ayarlar
await ev(() => __T.ACT.pause()); await wait(200);
check(await ev(() => __T.menu) === 'pause', 'duraklatma açılmadı');
await pg.click('[data-a=bag]'); await wait(200); await pg.screenshot({ path: out + '/3-canta.png' });
await pg.click('[data-a=back]'); await wait(100); await pg.click('[data-a=set]'); await wait(100); await pg.click('[data-a=back]'); await wait(100);
check(await ev(() => __T.menu) === 'pause', 'geri dönüş bozuk');
await pg.click('[data-a=resume]'); await wait(100);
// Boss: arenaya ışınla
await ev(() => { clearInterval(window.__bot); __T.I.r = 0; __T.LV.cp = 2; __T.tp(150); }); await wait(1500);
check(await ev(() => __T.LV.cp) === 2, 'kontrol noktası');
await ev(() => { __T.I.r = 1; }); await wait(1400); await ev(() => { __T.I.r = 0; });
check(await ev(() => !!__T.G.boss), 'boss başlamadı');
await wait(4500); await pg.screenshot({ path: out + '/4-boss.png' });
const hpAfter = await ev(() => __T.P.hp);
await ev(() => { __T.hitBoss(.55); }); await wait(2500);
check(await ev(() => __T.G.boss && __T.G.boss.ph === 2), 'boss 2. aşamaya geçmedi');
await pg.screenshot({ path: out + '/5-boss2.png' });
// Boss'u bitir: ölümsüz ol, boss'un yanına git, vur
await ev(() => { __T.hitBoss(1); const B = __T.G.boss; window.__god = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; if (__T.G.boss && !__T.G.boss.dead) { __T.P.x = __T.G.boss.x - 24; __T.P.face = 1; __T.P.ab = .15; } }, 60); });
await wait(5000);
check(await ev(() => __T.G.won), 'boss ölmedi / kapı açılmadı');
await ev(() => { clearInterval(window.__god); __T.tp(__T.L.exit.x); }); await wait(500); await skip('h2-bitis');
check(await ev(() => __T.state) === 'win', 'bölüm bitmedi: ' + await ev(() => __T.state));
await pg.screenshot({ path: out + '/6-zafer.png' });
check(await ev(() => __T.LV.done) === 1, 'tamamlama kaydı');
// Ölüm akışı
await pg.click('[data-a=new]'); await wait(300);
// Yeniden doğma: kontrol noktasının gerisindeki düşmanlar doğmamalı + konuşma/dükkân
await ev(() => { __T.LV.cp = 1; __T.ACT.respawn(); }); await wait(200);
check(await ev(() => __T.ENS.every(e => e.x > __T.L.cps[1].x)), 'kontrol noktası gerisinde düşman doğdu');
await ev(() => { __T.tp(131); }); await wait(400);
check(await ev(() => !!__T.G.npc), 'köylü bulunamadı'); await pg.click('#talk'); await wait(200);
await pg.screenshot({ path: out + '/h3-konusma.png' });
const g0 = await ev(() => __T.SV.gold); await pg.click('[data-a=tnext]'); await pg.click('[data-a=tnext]'); await wait(200);
check(await ev(() => __T.SV.gold) > g0, 'köylü ödülü');
await ev(() => { __T.tp(67); __T.SV.gold += 100; }); await wait(400); await pg.click('#talk'); await pg.click('[data-a=tnext]'); await wait(150);
await pg.screenshot({ path: out + '/h4-dukkan.png' }); const g1 = await ev(() => __T.SV.gold); await pg.click('[data-a=buy][data-v="0"]');
check(await ev(() => __T.SV.gold) < g1, 'dükkândan alınamadı'); await pg.click('[data-a=tclose]'); await wait(100);
await ev(() => { __T.tp(46, 7); }); await wait(500); check(await ev(() => __T.SV.pages.includes(0)), 'sayfa alınamadı');
await ev(() => { __T.LV.cp = -1; __T.ACT.respawn(); }); await wait(200);
await ev(() => { __T.P.inv = 0; __T.P.dashT = 0; __T.P.hp = 1; __T.tp(58, 10); }); await wait(1800);
check(await ev(() => __T.state) === 'dead' && await ev(() => __T.menu) === 'dead', 'ölüm ekranı');
await pg.click('[data-a=respawn]'); await wait(300);
check(await ev(() => __T.state) === 'play' && await ev(() => __T.P.hp === __T.P.mhp), 'yeniden doğma');
// 2. bölüm: Kristal Mağara
await ev(() => __T.ACT.pause()); await pg.click('[data-a=home]'); await wait(200);
await pg.click('[data-a=chap]'); await wait(150); await pg.screenshot({ path: out + '/8-bolumler.png' });
await pg.click('[data-a=go][data-v="1"]'); await skip();
check(await ev(() => __T.CH) === 1 && await ev(() => __T.state) === 'play', '2. bölüm açılmadı');
await ev(() => { const T = __T, TS = 32; window.__bot = setInterval(() => {
  const P = T.P; if (T.state !== 'play') return; T.I.r = 1;
  const fx = Math.floor((P.x + P.w + 20) / TS), fy = Math.floor((P.y + P.h + 4) / TS), wy = Math.floor((P.y + P.h - 8) / TS);
  const g = (x, y) => (x < 0 || y < 0 || y >= T.L.g.length) ? 0 : T.L.g[y][x];
  const pit = !g(fx, fy) && !g(fx, fy + 1) && !g(fx, fy + 2) && !g(fx, fy + 3), wall = g(fx, wy) === 1 || g(fx, wy) === 3 || g(fx, wy + 1) === 3;
  const near = T.ENS.find(e => !e.dead && Math.abs(e.x - P.x) < 60 && Math.abs(e.y - P.y) < 60);
  if (near) P.ab = .15; if (P.en >= 100 && near) P.sb = .12;
  if ((pit || wall) && P.on) { P.jb = .12; T.I.jh = 1; setTimeout(() => T.I.jh = 0, 260); }
  else if (pit && !P.on && P.vy > 60 && P.jumps > 0) { P.jb = .12; }
}, 50); });
await wait(8000); await pg.screenshot({ path: out + '/9-magara.png' });
console.log('mağara 8 sn:', JSON.stringify(await ev(() => ({ x: __T.P.x / 32 | 0, hp: Math.round(__T.P.hp), en: __T.P.en, state: __T.state }))));
await ev(() => { clearInterval(window.__bot); __T.I.r = 0; if (__T.state !== 'play') __T.ACT.respawn(); __T.LV.cp = 2; __T.tp(158); }); await wait(500);
await ev(() => { __T.I.r = 1; }); await wait(1600); await ev(() => { __T.I.r = 0; });
check(await ev(() => __T.G.boss && __T.G.boss.kind) === 'golem', 'golem başlamadı');
await ev(() => { window.__g2 = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 60); });
await wait(6000); await pg.screenshot({ path: out + '/10-golem.png' });
await ev(() => __T.hitBoss(.55)); await wait(3000);
check(await ev(() => __T.G.boss && __T.G.boss.ph === 2), 'golem 2. aşama');
await pg.screenshot({ path: out + '/11-golem2.png' });
await ev(() => { __T.hitBoss(1); clearInterval(window.__g2); window.__god = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; const B = __T.G.boss; if (B && !B.dead) { __T.P.x = B.x - 24; __T.P.y = B.y + B.h - 30; __T.P.face = 1; __T.P.ab = .15; } }, 60); });
await wait(5000);
check(await ev(() => __T.G.won), 'golem ölmedi');
await ev(() => { clearInterval(window.__god); __T.tp(__T.L.exit.x); }); await wait(500); await skip();
check(await ev(() => __T.state) === 'win', '2. bölüm bitmedi');
await pg.screenshot({ path: out + '/12-zafer2.png' });
check(await ev(() => __T.SV.lvs[1].done) === 1 && await ev(() => __T.SV.lvs[1].star & 1) === 1, '2. bölüm kaydı/yıldız');
// 3. bölüm: Lav Kalesi
await pg.click('[data-a=go][data-v="2"]'); await skip('h5-kale');
check(await ev(() => __T.CH) === 2 && await ev(() => __T.state) === 'play', '3. bölüm açılmadı');
await ev(() => { const T = __T, TS = 32; window.__bot = setInterval(() => {
  const P = T.P; if (T.state !== 'play') return; T.I.r = 1;
  const fx = Math.floor((P.x + P.w + 20) / TS), fy = Math.floor((P.y + P.h + 4) / TS), wy = Math.floor((P.y + P.h - 8) / TS);
  const g = (x, y) => (x < 0 || y < 0 || y >= T.L.g.length) ? 0 : T.L.g[y][x];
  const pit = !g(fx, fy) || g(fx, fy + 1) === 5, wall = g(fx, wy) === 1 || g(fx, wy) === 3;
  const near = T.ENS.find(e => !e.dead && Math.abs(e.x - P.x) < 70 && Math.abs(e.y - P.y) < 80);
  if (near) P.ab = .15; if (P.en >= 100 && near) P.sb = .12;
  if ((pit || wall) && P.on) { P.jb = .12; T.I.jh = 1; setTimeout(() => T.I.jh = 0, 260); }
  else if (pit && !P.on && P.vy > 60 && P.jumps > 0) { P.jb = .12; }
}, 50); });
await wait(8000); await pg.screenshot({ path: out + '/h6-lav.png' });
console.log('kale 8 sn:', JSON.stringify(await ev(() => ({ x: __T.P.x / 32 | 0, hp: Math.round(__T.P.hp), state: __T.state }))));
await ev(() => { clearInterval(window.__bot); __T.I.r = 0; if (__T.state !== 'play') __T.ACT.respawn(); __T.tp(85); }); await wait(1500);
check(await ev(() => __T.ENS.some(e => e.t === 'mimic' && e.st === 'awake')), 'mimik uyanmadı');
await pg.screenshot({ path: out + '/h7-mimik.png' });
await ev(() => { __T.LV.cp = 2; __T.tp(161); window.__g3 = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 60); }); await wait(400);
await ev(() => { __T.I.r = 1; }); await wait(1600); await ev(() => { __T.I.r = 0; });
check(await ev(() => __T.G.boss && __T.G.boss.kind) === 'kara', 'kara şövalye başlamadı');
await wait(7000); await pg.screenshot({ path: out + '/h8-kara.png' });
await ev(() => { __T.hitBoss(.55); }); await wait(4000); await pg.screenshot({ path: out + '/h9-kara2.png' });
await ev(() => { clearInterval(window.__g3); window.__god = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; const B = __T.G.boss; if (B && !B.dead) { B.hp = Math.min(B.hp, 1); __T.P.x = B.x - 24; __T.P.y = B.y + B.h - 30; __T.P.face = 1; __T.P.ab = .15; } }, 60); });
await wait(5000); check(await ev(() => __T.G.won), 'kara şövalye ölmedi');
await ev(() => { clearInterval(window.__god); __T.tp(__T.L.exit.x); }); await wait(500); await skip('h10-son');
check(await ev(() => __T.state) === 'win', '3. bölüm bitmedi');
// Boss Arenası
await pg.click('[data-a=home]'); await wait(200); await pg.click('[data-a=chap]'); await wait(100); await pg.click('[data-a=go][data-v="3"]'); await skip();
check(await ev(() => __T.L.rush.length) === 3, 'arenada 3 boss yok');
await ev(() => { __T.I.r = 1; window.__god = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; const B = __T.G.boss; if (B && !B.dead && B.st !== 'intro') { B.hp = Math.min(B.hp, 1); __T.I.r = 0; __T.P.x = B.x - 24; __T.P.y = B.y + B.h - 30; __T.P.face = 1; __T.P.ab = .15; } }, 60); });
await wait(22000); check(await ev(() => __T.G.won), 'arena bitmedi: ' + await ev(() => __T.L.ri));
await ev(() => { clearInterval(window.__god); __T.tp(__T.L.exit.x); }); await wait(800);
check(await ev(() => __T.state) === 'win', 'arena kazanılmadı');
// Yeni bölümler (4–10) ve Sonsuz Yol
const playCh = async (i, tag) => {
  await ev(i => __T.ACT.go(String(i)), i); await skip(tag + '-giris');
  check(await ev(() => __T.state) === 'play', tag + ' başlamadı');
  await ev(() => { const T = __T, TS = 32; window.__bot = setInterval(() => {
    const P = T.P; if (T.state !== 'play') return; T.I.r = 1;
    const fx = Math.floor((P.x + P.w + 20) / TS), fy = Math.floor((P.y + P.h + 4) / TS), wy = Math.floor((P.y + P.h - 8) / TS);
    const g = (x, y) => (x < 0 || y < 0 || y >= T.L.g.length) ? 0 : T.L.g[y][x];
    const pit = !g(fx, fy) || g(fx, fy + 1) === 5, wall = g(fx, wy) === 1 || g(fx, wy) === 3 || g(fx, wy) === 7;
    const near = T.ENS.find(e => !e.dead && Math.abs(e.x - P.x) < 70 && Math.abs(e.y - P.y) < 80);
    if (near) P.ab = .15; if (P.en >= 100 && near) P.sb = .12;
    if ((pit || wall) && P.on) { P.jb = .12; T.I.jh = 1; setTimeout(() => T.I.jh = 0, 260); } else if (pit && !P.on && P.vy > 60 && P.jumps > 0) P.jb = .12;
  }, 50); });
  await wait(6000); await pg.screenshot({ path: out + '/' + tag + '-oyun.png' });
  const st = await ev(() => ({ x: __T.P.x / 32 | 0, hp: Math.round(__T.P.hp), s: __T.state, W: __T.L.g[0].length, n: __T.ENS.length }));
  console.log(tag, JSON.stringify(st));
  await ev(() => { clearInterval(window.__bot); __T.I.r = 0; if (__T.state !== 'play') __T.ACT.respawn(); window.__gd = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; }, 60); __T.tp(__T.L.arena.gate - 2); });
  await wait(300); await ev(() => { __T.I.r = 1; }); await wait(1800); await ev(() => { __T.I.r = 0; });
  check(await ev(() => !!__T.G.boss), tag + ' boss başlamadı');
  await wait(5500); await pg.screenshot({ path: out + '/' + tag + '-boss.png' });
  await ev(() => { __T.hitBoss(.55); }); await wait(2500);
  await ev(() => { clearInterval(window.__gd); window.__god = setInterval(() => { __T.P.inv = 5; __T.P.hp = __T.P.mhp; const B = __T.G.boss; if (B && !B.dead) { B.hp = Math.min(B.hp, 1); __T.P.x = B.x - 24; __T.P.y = AG0() ; __T.P.face = 1; __T.P.ab = .15; } function AG0(){ return Math.min(B.y + B.h - 30, 11 * 32 - 30); } }, 60); });
  await wait(4500); check(await ev(() => __T.G.won), tag + ' boss ölmedi');
  await ev(() => { clearInterval(window.__god); __T.tp(__T.L.exit.x); }); await wait(500); await skip();
  check(await ev(() => __T.state) === 'win', tag + ' bitmedi: ' + await ev(() => __T.state));
};
for (const i of [4, 5, 6, 7, 8, 9, 10]) await playCh(i, 'b' + i);
await pg.screenshot({ path: out + '/b10-son.png' });
const f0 = await ev(() => __T.SV.endl.floor); await playCh(11, 'sonsuz');
check(await ev(() => __T.SV.endl.floor) === f0 + 1, 'sonsuz yol katı artmadı');
await ev(() => __T.ACT.go('11')); await wait(300); check(await ev(() => __T.state) === 'play', 'sonsuz yol 2. kat');
await ev(() => __T.ACT.pause());
// Kayıt + İngilizce
await pg.click('[data-a=home]'); await wait(200); await pg.click('[data-a=chap]'); await wait(150); await pg.screenshot({ path: out + '/bolumler10.png' }); await pg.click('[data-a=back]'); await wait(100);
await pg.click('[data-a=jour]'); await wait(150); await pg.screenshot({ path: out + '/h11-gunluk.png' }); await pg.click('[data-a=back]'); await wait(100);
await pg.click('[data-a=set]'); await pg.click('[data-a=lang]'); await wait(900);
await pg.screenshot({ path: out + '/7-ingilizce.png' });
const t = await pg.textContent('#title');
check(/Legend Road/.test(t), 'İngilizce başlık yok: ' + t.slice(0, 60));
// v1 kaydından geçiş
const mig = await pg.evaluate(() => { localStorage.setItem('efsane-yolu-v1', JSON.stringify({ v: 1, lang: 'en', gold: 77, uid: 5, inv: [{ id: 1, s: 'w', r: 2, b: 0, p: 2, atk: 9, hp: 0, crit: 0, u: 1 }], eq: { w: 1, a: 0, c: 0 }, lv: { cp: 1, done: 2, best: 99, chest: [0], coin: [1, 2] } })); return true; });
await pg.reload(); await wait(600);
const m2 = await ev(() => ({ g: __T.SV.gold, cp: __T.SV.lvs[0].cp, d: __T.SV.lvs[0].done, l2: __T.SV.lvs[1].cp, atk: __T.stats().atk }));
check(m2.g === 77 && m2.cp === 1 && m2.d === 2 && m2.l2 === -1 && m2.atk > 15, 'v1 kayıt geçişi: ' + JSON.stringify(m2));
const tr = await pg.evaluate(() => [...document.querySelectorAll('#scr button')].map(b => b.textContent).join('|'));
check(!/[ığüşöçİĞÜŞÖÇ]/.test(tr), 'İngilizcede Türkçe kaldı: ' + tr);
console.log('hasar alındı (boss):', Math.round(hpAfter));
await b.close();
console.log('errors', JSON.stringify(errors));
