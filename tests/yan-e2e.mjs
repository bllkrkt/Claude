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
await pg.goto('file://' + html); await wait(600);
await pg.screenshot({ path: out + '/1-baslik.png' });
await pg.click('[data-a=new]'); await wait(300);
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
await ev(() => { clearInterval(window.__bot); __T.I.r = 0; __T.SV.lv.cp = 2; __T.tp(150); }); await wait(1500);
check(await ev(() => __T.SV.lv.cp) === 2, 'kontrol noktası');
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
await ev(() => { clearInterval(window.__god); __T.tp(184); }); await wait(800);
check(await ev(() => __T.state) === 'win', 'bölüm bitmedi: ' + await ev(() => __T.state));
await pg.screenshot({ path: out + '/6-zafer.png' });
check(await ev(() => __T.SV.lv.done) === 1, 'tamamlama kaydı');
// Ölüm akışı
await pg.click('[data-a=new]'); await wait(300);
await ev(() => { __T.P.inv = 0; __T.P.dashT = 0; __T.P.hp = 1; __T.tp(58, 10); }); await wait(1800);
check(await ev(() => __T.state) === 'dead' && await ev(() => __T.menu) === 'dead', 'ölüm ekranı');
await pg.click('[data-a=respawn]'); await wait(300);
check(await ev(() => __T.state) === 'play' && await ev(() => __T.P.hp === __T.P.mhp), 'yeniden doğma');
// Kayıt + İngilizce
await ev(() => __T.ACT.pause()); await pg.click('[data-a=set]'); await pg.click('[data-a=lang]'); await wait(900);
await pg.screenshot({ path: out + '/7-ingilizce.png' });
const t = await pg.textContent('#title');
check(/Legend Road/.test(t), 'İngilizce başlık yok: ' + t.slice(0, 60));
const tr = await pg.evaluate(() => [...document.querySelectorAll('#scr button')].map(b => b.textContent).join('|'));
check(!/[ığüşöçİĞÜŞÖÇ]/.test(tr), 'İngilizcede Türkçe kaldı: ' + tr);
console.log('hasar alındı (boss):', Math.round(hpAfter));
await b.close();
console.log('errors', JSON.stringify(errors));
