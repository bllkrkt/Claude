import { createRequire } from 'module';import path from 'path';
const require = createRequire(import.meta.url);const { chromium } = require('playwright');
// Yeni oyuncunun ilk dakikaları: açılış ekranı, sekme kilitleri, rehber işaretleri, Macera rozeti
// node rpg-ilk-dakika.mjs ../rpg/src/main/assets/index.html <çıktı klasörü>
const [html, out = '.'] = process.argv.slice(2);const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'tr-TR' });
const p = await ctx.newPage();
const HIZLI = !!process.env.HIZLI;
if (HIZLI) await p.addInitScript(() => { Object.defineProperty(window, 'S3D', { get() { return undefined }, set() { } }); });const errors = [];p.on('pageerror', e => errors.push(String(e)));p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.addInitScript(() => { window.__noRnd = 1; });
await p.goto('file://' + path.resolve(html));await p.waitForTimeout(1200);
const _click = p.click.bind(p);
p.click = async (sel, o = {}) => { await p.evaluate(() => { if (document.querySelector('#leg.on')) ACT.legClose(); }); return _click(sel, o); };
const sh = n => HIZLI ? Promise.resolve() : p.screenshot({ path: path.join(out, n + '.png') });const ev = f => p.evaluate(f);const res = {};
const waitFor = async (fn, ms) => { const e = Date.now() + ms; while (Date.now() < e) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(150); } return false; };
await p.click('#tPlay');await p.waitForTimeout(600);await sh('1-karsilama');
await p.click('[data-a=pickCls][data-v=war]');await p.waitForTimeout(500);
await ev(() => { if (document.querySelector('#sheet [data-a=claimLogin]')) claimLogin(); for (let i = 0; i < 3; i++) closeSheet(); Q.length = 0; });
res.locks = await ev(() => ['hero', 'quest', 'shop', 'adv'].map(t => document.querySelector('#tabs [data-v=' + t + ']').classList.contains('lk')));
res.coachHit = await waitFor(() => coachK === 'hit' && !document.getElementById('coach').hidden, 3000);await sh('2-rehber-vur');
await p.click('#tabs [data-v=shop]');res.lockToast = await ev(() => tab === 'battle' && /seviyede açılır/.test(document.getElementById('toasts').innerText));
for (let i = 0; i < 8; i++) { await p.click('#bHit'); await p.waitForTimeout(90); }
res.hitDone = await waitFor(() => S.tut.hit === 1, 2000);
await ev(() => { S.tot.kills = Math.max(S.tot.kills, 3); R.cd[0] = 0; });res.coachSkill = await waitFor(() => coachK === 'skill', 3000);await sh('3-rehber-yetenek');
await p.click('#skills .skb[data-sk="0"]');res.skillDone = await waitFor(() => S.tut.skill === 1, 2000);
await ev(() => { const it = makeItem(3, 1, 'weapon'); it.st.atk = 999; S.inv.push(it); updAll(); });res.coachBag = await waitFor(() => coachK === 'bag', 3000);await sh('4-rehber-canta');
await p.click('#tabs [data-v=inv]');await p.waitForTimeout(500);res.coachEq = await waitFor(() => coachK === 'equip', 3000);await sh('5-rehber-kusan');
await p.click('[data-a=eqBest]');await p.waitForTimeout(300);res.eqDone = await ev(() => S.tut.equip === 1);
await p.click('#tabs [data-v=battle]');
await ev(() => { addXp(xpNeed(S.lvl) + 5); });await p.waitForTimeout(600);await ev(() => { for (let i = 0; i < 3; i++) closeSheet(); Q.length = 0; });
res.heroOpen = await ev(() => !document.querySelector('#tabs [data-v=hero]').classList.contains('lk'));res.coachHero = await waitFor(() => coachK === 'hero', 3000);await sh('6-rehber-kahraman');
await p.click('#tabs [data-v=hero]');await p.waitForTimeout(500);res.coachStat = await waitFor(() => coachK === 'stat', 3000);await sh('7-rehber-stat');
while (await ev(() => S.pts > 0)) { await p.click('#s-hero .plus[data-a=stat]'); await p.waitForTimeout(80); }
res.statDone = await waitFor(() => S.tut.stat === 1, 2000);
await ev(() => { S.lvl = 6; S.tot.boss = 1; updAll(); });await p.waitForTimeout(400);await p.click('#tabs [data-v=battle]');await p.waitForTimeout(300);await sh('8-sekmeler-acik');
res.allOpen = await ev(() => !document.querySelector('#tabs .lk') && S.tu.adv === 1);
res.advDot1 = await ev(() => !document.getElementById('dAdv').hidden);await p.click('#tabs [data-v=adv]');await p.waitForTimeout(300);await p.click('#tabs [data-v=battle]');await p.waitForTimeout(200);
res.advDot2 = await ev(() => document.getElementById('dAdv').hidden);
// baloncuğa dokununca kapanır ve gösterdiği pencereyi açar
await ev(() => { closeSheet(); Q.length = 0; S.tut.mon = 0; S.autoAtk = false; go('battle'); spawn(); M.int = 1e9; M.max = M.hp = 1e9; });
res.coachMon = await waitFor(() => coachK === 'mon', 3000);
await p.click('#coach .cb');await p.waitForTimeout(300);
res.coachTap = await ev(() => S.tut.mon === 1 && !!document.querySelector('#sheetBg.on') && /defter|bestiary/i.test(document.getElementById('sheet').innerText));
if (!res.coachTap) console.log('DBG', await ev(() => JSON.stringify({ m: S.tut.mon, on: !!document.querySelector('#sheetBg.on'), tx: document.getElementById('sheet').innerText.slice(0, 80), ck: coachK })));
for (const [k, v] of Object.entries(res)) if (k !== 'locks' && k !== 'heroOpen' && v !== true) errors.push(k + ' hatalı');
if (!res.locks.every(Boolean)) errors.push('sekmeler başta kilitli değil');
console.log('durum', JSON.stringify(res));console.log('errors', JSON.stringify(errors));await b.close();process.exit(errors.length ? 1 : 0);
