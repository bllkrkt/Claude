// Efsane Yolu v22 komik sohbet testi: node yan-sohbet.mjs <index.html (mutlak yol)> <çıktı klasörü>
// Son satırda "errors []" görmelisin.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path'; import fs from 'fs';
const html = path.resolve(process.argv[2] || '../yan/src/main/assets/index.html');
const out = process.argv[3] || '/tmp/yan-sohbet'; fs.mkdirSync(out, { recursive: true });
const errors = [];
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, locale: 'tr-TR' })).newPage();
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
const wait = ms => pg.waitForTimeout(ms), ev = (f, a) => pg.evaluate(f, a);
const check = (ok, msg) => { if (!ok) errors.push('KONTROL: ' + msg); };
await pg.goto('file://' + html); await wait(800);

// 1) Veri: her boss 4 an, her düşman türü atışma, sınıf ve yoldaş lafları, EN eksiksiz
const r = await ev(() => {
  const o = { eksikBoss: [], eksikDus: [], eksikEN: [], eksikSinif: [], eksikPet: [] };
  if (typeof SAYB4 === 'undefined') return { yok: 1 };
  for (const k in BK) for (const a of ['in', 'rage', 'lose', 'win']) if (!SAYB4[k] || !(SAYB4[k][a] || []).length) o.eksikBoss.push(k + '.' + a);
  for (const t of ['slime','bat','archer','knight','mimic','wolf','frog','mummy','harpy','spore','shade','spider','beetle','imp','gob','star','crab','jelly','cog','clock','scorp','wisp','storm','skel'])
    if (!SAYX[t] || SAYX[t].length < 2) o.eksikDus.push(t);
  for (const c of ['war', 'arc', 'mag', 'asn']) if (!SAYC[c] || SAYC[c].length < 3) o.eksikSinif.push(c);
  for (const p in PETS) for (const a of ['pit', 'hurt', 'chest', 'boss', 'idle']) if (!SAYP[p] || !(SAYP[p][a] || []).length) o.eksikPet.push(p + '.' + a);
  const all = [];
  const walk = v => { if (typeof v === 'string') all.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  [SAYS, SAYC, SAYX, SAYR, SAYB4, SAYP, typeof SAYGC === 'undefined' ? [] : SAYGC].forEach(walk);
  o.gc = typeof SAYGC !== 'undefined' && SAYGC.length >= 6 && SAYGC.every(p => p.length === 2);
  for (const s of all) if (!EN[s]) o.eksikEN.push(s);
  o.toplam = all.length; return o;
});
check(!r.yok, 'SAYB4 tanımlı değil');
if (!r.yok) {
  check(!r.eksikBoss.length, 'boss lafı eksik: ' + r.eksikBoss.join(','));
  check(!r.eksikDus.length, 'düşman atışması eksik: ' + r.eksikDus.join(','));
  check(!r.eksikSinif.length, 'sınıf lafı eksik: ' + r.eksikSinif.join(','));
  check(!r.eksikPet.length, 'yoldaş lafı eksik: ' + r.eksikPet.join(','));
  check(!r.eksikEN.length, 'İngilizcesi eksik: ' + r.eksikEN.slice(0, 5).join(' | '));
  check(r.gc, 'boss atılma atışmaları (SAYGC) eksik');
  console.log('toplam laf:', r.toplam);
}

// 2) Oyunda: atışma cevabı gelir, tekrar önleme, kapalıyken sessiz
await pg.click('[data-a=chap]'); await wait(150); await pg.click('[data-a=go][data-v="0"]'); await wait(500);
if (await ev(() => __T.state) === 'story') { await ev(() => storyEnd()); await wait(300); }
check(await ev(() => __T.state) === 'play', 'oyun başlamadı');
if (!r.yok) {
  await ev(() => { __T.SV.talk = 1; __T.P.inv = 99; BUB = []; G.rq = []; const e = { x: __T.P.x + 60, y: __T.P.y, w: 20, h: 20, t: 'slime' }; window.__e = e; banter(e, 'x'); });
  check(await ev(() => BUB.some(q => q.e === window.__e)), 'düşman lafı çıkmadı');
  await wait(2200);
  check(await ev(() => BUB.some(q => q.e === __T.P)), 'karakter cevap vermedi');
  await pg.screenshot({ path: out + '/atisma.png' });
  const tekrar = await ev(() => { const a = ['a', 'b', 'c', 'd', 'e']; let ok = true, son = []; for (let i = 0; i < 40; i++) { const x = pickN(a, 'test'); if (son.includes(x)) ok = false; son.push(x); if (son.length > 3) son.shift(); } return ok; });
  check(tekrar, 'aynı laf son 3 içinde tekrar etti');
  await ev(() => { __T.SV.talk = 0; BUB = []; G.rq = []; heroSay('pit', 1); banter(window.__e, 'x'); petSay('pit'); bossTalk('rage'); });
  await wait(2200);
  check(await ev(() => BUB.length === 0), 'konuşmalar kapalıyken baloncuk çıktı');
  await ev(() => { __T.SV.talk = 1; __T.SV.pet = null; petSay('pit'); });
}
console.log('errors', JSON.stringify(errors));
await b.close();
