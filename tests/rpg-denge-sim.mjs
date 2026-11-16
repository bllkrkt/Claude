// node rpg-denge-sim.mjs ../rpg/src/main/assets/index.html <dakika> <çıktı.json> <erken dokunma/sn>  (yavaştır: 20 dk ≈ 10 dk sürer)
// Denge simülasyonu: oyunu hızlandırılmış saatle, sanal bir oyuncuyla saatlerce oynatır ve ilerlemeyi kaydeder
import { createRequire } from 'module';import path from 'path';import fs from 'fs';
const require = createRequire(import.meta.url);const { chromium } = require('playwright');
const [html, mins = '120', out = 'sim.json', tapRate = '4'] = process.argv.slice(2);
const b = await chromium.launch();const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
const p = await ctx.newPage();const errors = [];p.on('pageerror', e => errors.push(String(e)));
await p.clock.install({ time: new Date('2026-11-16T10:00:00') });
await p.addInitScript(() => { window.__noTitle = 1; Object.defineProperty(window, 'S3D', { get() { return undefined }, set() { } }); });
await p.goto('file://' + path.resolve(html));await p.clock.runFor(500);
await p.evaluate(() => { ACT.pickCls('war'); window.__st = { deaths: 0, bossFail: 0, upg: 0 }; const d = die; die = function () { __st.deaths++; return d.apply(this, arguments) }; const bf = bossFail; bossFail = function () { __st.bossFail++; return bf.apply(this, arguments) }; S.set.autoJ = 2; S.set.bgFight = true; S.set.sound = false; S.set.music = false;
  add = e => e; fxSparks = () => { }; fxCoins = () => { }; confetti = () => { }; shake = () => { }; floatTxt = () => { }; fxBoom = () => { }; fxSlash = () => { }; scrFlash = () => { }; shout = () => { }; banner = () => { }; say = () => { }; lootMsg = () => { }; toast = () => { }; });
await p.evaluate(() => { window.brain_ = (tapsPerSec) => {
  // pencereleri bir oyuncu gibi kapat
  for (let k = 0; k < 6; k++) { if (document.querySelector('#leg.on')) ACT.legClose(); if (!document.querySelector('#sheetBg.on')) break; const q = s => document.querySelector('#sheet [data-a=' + s + ']');
    if (q('claimLogin')) claimLogin(); else if (q('offTake')) ACT.offTake('1'); else if (q('revive')) ACT.revive(); else if (q('fatePick')) q('fatePick').click(); else if (q('pickCls')) ACT.pickCls('war'); else closeSheet(); }
  if (dead) ACT.revive();
  if (R.frozen > 0) { for (let i = 0; i < 6; i++) { lastHit = 0; tap({ preventDefault() { } }); } }
  // gelişim kararları
  if (S.pts > 0) { while (S.pts > 0) ACT.stat(['str', 'str', 'vit', 'agi'][S.pts % 4]); }
  if (tpFree() > 0) { for (let bi = 0; bi < 3; bi++) for (let ni = 0; ni < 4; ni++) { try { ACT.talUp(bi + '|' + ni) } catch (e) { } } }
  const l = bestList(); if (l.length) ACT.eqBest();
  if (Math.random() < .2) { try { const g0 = S.gold; upPlan(false, true); if (S.gold < g0) __st.upg++ } catch (e) { } }
  if (CLS[S.cls]) for (let i = 0; i < 4; i++) { const s = skInfo(i); if (S.lvl >= s.lv && S.gold > skCost(S.skl[i]) * 3 && S.skl[i] < 20) ACT.skUp(i); }
  if (S.pet && S.pets[S.pet] < 30 && S.gold > petCost(S.pets[S.pet]) * 3) ACT.petFeed();
  if (S.potions < 3 && S.gold > 2000) { try { ACT.buyPot && ACT.buyPot('1') } catch (e) { } }
  if (aaOpen()) S.autoAtk = true; if (asOpen()) S.autoSk = true;
  S.auto = true; if (tab !== 'battle') go('battle');
  // düşük canda iksir
  if (S.hp < P.hp * .35 && S.potions) usePotion();
  // erken oyunda dokunma (oto saldırı yokken)
  if (!aaOpen() && tapsPerSec > 0 && M && !M.dead) { for (let i = 0; i < tapsPerSec; i++) { const st = swing(false); attack(st === 2 ? P.fin : 1, { src: 'tap', fin: st === 2 }); } }
  for (let i = 0; i < 4; i++) if (S.lvl >= CLS[S.cls].sk[i].lv) useSkill(i);
}; });
const log = [];const total = +mins * 60;const tp = +tapRate;
let aa = false;
for (let sec = 1; sec <= total; sec++) {
  if (aa && sec % 8) continue;
  await p.clock.runFor(aa ? 8000 : 1000);aa = await p.evaluate(t => { brain_(t); return aaOpen(); }, tp);
  if (sec % 60 === 0) { const r = await p.evaluate(() => ({ lvl: S.lvl, z: S.zone, f: S.floors[S.zone], best: gBest(), gold: Math.round(S.gold), gems: S.gems, ess: S.ess, pow: cpow(), atk: P.atk, hp: P.hp, kills: S.tot.kills, boss: S.tot.boss, deaths: __st.deaths, bossFail: __st.bossFail, inv: S.inv.length, eqR: SLOTS.map(s => S.eq[s.k] ? S.eq[s.k].r : -1).join(''), up: SLOTS.map(s => S.eq[s.k] ? S.eq[s.k].up : 0).join(','), aa: aaOpen(), mHp: M ? Math.round(M.max) : 0 }));
    r.min = sec / 60; log.push(r); if (r.min % 5 === 0) console.log(JSON.stringify(r)); }
}
fs.writeFileSync(out, JSON.stringify({ log, errors }));console.log('errors', JSON.stringify(errors.slice(0, 5)));await b.close();
