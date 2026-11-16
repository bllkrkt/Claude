// İngilizce denetim: oyunu İngilizce açar, her sekmeyi ve pencereyi gezer, ekranda kalan Türkçe yazıları listeler
// node rpg-ingilizce.mjs ../rpg/src/main/assets/index.html <çıktı klasörü>  → errors [] görmelisin
import { createRequire } from 'module';import path from 'path';import fs from 'fs';
const require = createRequire(import.meta.url);const { chromium } = require('playwright');
const [html, out = '.'] = process.argv.slice(2);const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'en-US' });
const p = await ctx.newPage();const errors = [];p.on('pageerror', e => errors.push(String(e)));p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.addInitScript(() => { window.__noRnd = 1; window.__noTitle = 1; window.__allTabs = 1; });
await p.goto('file://' + path.resolve(html));await p.waitForTimeout(900);
const found = new Map();
const TRW = /[çğıöşüÇĞİÖŞÜ]|\b(ve|ile|bir|için|kat|seviye|altın|elmas|canavar|eşya|kuşan|yok|var|sat|erit|kapat|tamam|devam|açık|kapalı|günlük|ödül|görev)\b/i;
async function grab(tag) { const t = await p.evaluate(() => { const vis = e => e && (e.offsetParent || getComputedStyle(e).position === 'fixed'); const parts = [];
    for (const id of ['hud', 'tabs', 'pbox', 'skills', 'hitRow', 'top', 'sheet', 'toasts', 'bgInfo', 'banner', 'title']) { const e = document.getElementById(id); if (vis(e)) parts.push(e.innerText); }
    const sc = document.querySelector('.scr.on'); if (sc) parts.push(sc.innerText); return parts.join('\n'); });
  for (const line of t.split('\n')) { const l = line.trim(); if (l && TRW.test(l)) { if (!found.has(l)) found.set(l, tag); } } }
const sh = n => p.screenshot({ path: path.join(out, 'en-' + n + '.png') });
await p.evaluate(() => { ACT.pickCls('war'); Q.length = 0; closeSheet(); S.lvl = 45; S.pts = 6; S.gold = 5e6; S.gems = 900; S.ess = 500; S.potions = 5; S.tot.boss = 9; S.reb.n = 1; S.reb.souls = 40;
  for (const sl of SLOTS) { const it = makeItem(60, 3, sl.k); S.eq[sl.k] = it; } for (let i = 0; i < 8; i++) S.inv.push(makeItem(55, i % 4)); S.pets.wolf = 12; S.pets.owl = 5; S.pet = 'wolf'; S.runes = { 'atk:2': 3, 'crit:1': 4 };
  S.maxF = ZONES.map((_, i) => i < 3 ? 30 : i === 3 ? 12 : 0); S.zone = 1; S.floors[1] = 14; S.bst = { 'Boz Kurt': 60, 'Yaban Domuzu': 12 }; calc(); S.hp = P.hp; setStage(); renderSkillBar(); spawn(); updAll(); });
await p.waitForTimeout(500); await grab('savas'); await sh('savas');
const tabs = { inv: [null, 'rune'], hero: ['stat', 'skill', 'pet', 'tal', 'reb'], adv: [null], quest: [null], shop: [null] };
for (const [t, segs] of Object.entries(tabs)) for (const sg of segs) { await p.evaluate(([t, sg]) => { go(t); if (sg && t === 'hero') ACT.heroSeg(sg); if (sg && t === 'inv') ACT.invSeg(sg); }, [t, sg]); await p.waitForTimeout(250);
  for (let y = 0; y < 4; y++) { await grab(t + (sg ? '/' + sg : '')); await p.evaluate(() => { const e = document.querySelector('.scr.on'); e.scrollTop += 700; }); await p.waitForTimeout(80); }
  await p.evaluate(() => { document.querySelector('.scr.on').scrollTop = 0; }); await sh(t + (sg ? '-' + sg : '')); }
const sheets = ['settings', 'about', 'backup', 'map', 'bst', 'autoJ', 'invUp', 'aa', 'skin', 'reset', 'bulk', 'monInfo', 'statInfo'];
await p.evaluate(() => { closeSheet(); go('battle'); zoneInfo(1); }); await p.waitForTimeout(200); await grab('pencere/zoneInfo');
for (const a of sheets) { await p.evaluate(a => { closeSheet(); go('battle'); try { ACT[a] && ACT[a](); } catch (e) { console.error('ACT ' + a + ' ' + e) } }, a); await p.waitForTimeout(200); await grab('pencere/' + a); }
await p.evaluate(() => { closeSheet(); itemSheet(S.inv[0]); }); await p.waitForTimeout(150); await grab('esya'); await sh('esya');
await p.evaluate(() => { closeSheet(); itemSheet(S.eq.weapon); }); await p.waitForTimeout(150); await grab('esya-efsanevi');
for (const f of ['news11', 'news10', 'news8', 'news7', 'loginSheet', 'introSheet']) { await p.evaluate(f => { closeSheet(); S.daily.claimed = false; try { window[f] ? window[f]() : eval(f + '()'); } catch (e) { } }, f); await p.waitForTimeout(150); await grab('pencere/' + f); }
await p.evaluate(() => { closeSheet(); Q.length = 0; go('battle'); spawn(); M.max = M.hp = 1e9; M.int = 1e9; weakShow(); evShow(); }); await p.waitForTimeout(300); await grab('savas2');
for (const k of ['fount', 'smith', 'chest', 'shop']) { await p.evaluate(k => { closeSheet(); evShow(); evOn = k; evOpen(); }, k); await p.waitForTimeout(150); await grab('olay/' + k); }
await p.evaluate(() => { closeSheet(); ACT.fate(); }); await p.waitForTimeout(400); await p.evaluate(() => { M.hp = 1; attack(5, { src: 'tap' }); }); await p.waitForTimeout(900); await grab('kader'); await sh('kader');
await p.evaluate(() => { closeSheet(); fateEnd(); }); await p.waitForTimeout(200); await grab('kader-son'); await p.evaluate(() => ACT.fateDone());
await p.evaluate(() => { closeSheet(); spawn(); addTrait(M); updAll(); }); await p.waitForTimeout(200); await grab('tur'); await sh('tur');
await p.evaluate(() => { closeSheet(); S.hp = 1; spawn(); M.int = 1e9; M.tr = null; monsterHit(50); }); await p.waitForTimeout(300); await grab('yenilgi');
const list = [...found.entries()].map(([l, t]) => t + ' | ' + l);
fs.writeFileSync(path.join(out, 'kalan-turkce.txt'), list.join('\n'));
const IZIN = ['Türkçe', 'Efsane Avcısı'];
for (const [l, t] of found) if (!IZIN.some(x => l.includes(x))) errors.push('Türkçe kaldı (' + t + '): ' + l);
console.log('errors', JSON.stringify(errors));await b.close();process.exit(errors.length ? 1 : 0);
