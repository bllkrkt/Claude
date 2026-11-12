// Efsane Avcısı oyun testi: node rpg-e2e.mjs ../rpg/src/main/assets/index.html <çıktı klasörü>
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [html, out = '.'] = process.argv.slice(2);
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('file://' + path.resolve(html));
const shot = n => p.screenshot({ path: path.join(out, 'rpg-' + n + '.png') });
await shot('01-hosgeldin');
await p.click('[data-a=start]');
// oyuncu gibi oyna: vur, yetenek kullan, can azalınca iksir iç, öldüyse devam et
async function play(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await p.evaluate(() => {
      if (document.querySelector('#leg.on')) ACT.legClose();
      if (document.querySelector('[data-a=revive]')) ACT.revive();
      if (S.hp < P.hp * .4 && S.potions) usePotion();
      skill(); attack();
    });
    await p.waitForTimeout(110);
  }
}
await play(1500); await shot('02-savas');
await play(25000);
// en iyi eşyaları kuşan, puanları dağıt
const autoGear = () => p.evaluate(() => {
  for (let i = 0; i < 20; i++) { const it = S.inv.find(x => power(x) > power(S.eq[x.slot])); if (!it) break; ACT.equip(it.id); }
  while (S.pts > 0) ACT.stat(['str', 'vit', 'agi'][S.pts % 3]);
});
await p.click('[data-v=inv]'); await shot('03-canta');
await p.click('#s-inv .it[data-a=item]'); await p.waitForTimeout(400); await shot('04-esya-karsilastirma');
await p.evaluate(() => closeSheet());
await autoGear();
await p.click('[data-v=char]'); await shot('05-karakter');
await p.evaluate(() => { S.gold += 50000; updAll(); });
await p.click('[data-v=shop]'); await shot('06-dukkan');
await p.click('[data-a=chest][data-v="1"]'); await p.waitForTimeout(500); await shot('07-sandik');
await p.evaluate(() => closeSheet());
await p.evaluate(() => legendary(makeItem(20, 3, 'weapon'))); await p.waitForTimeout(700); await shot('08-efsanevi');
await p.evaluate(() => ACT.legClose());
await p.click('[data-v=map]'); await shot('09-harita');
await p.click('[data-v=battle]');
for (let i = 0; i < 6; i++) { await play(10000); await autoGear(); }
await shot('10-ilerleme');
const st = await p.evaluate(() => ({ lvl: S.lvl, zone: S.zone, floor: S.floors[S.zone], maxF: S.maxF, kills: S.tot.kills, boss: S.tot.boss, inv: S.inv.length, atk: P.atk, hp: P.hp }));
// kalıcılık: yenile, aynı seviyeden devam etmeli
await p.evaluate(() => save(true)); await p.reload();
const lvl2 = await p.evaluate(() => S.lvl);
if (lvl2 !== st.lvl) errors.push('kayıt yüklenmedi: ' + lvl2 + ' != ' + st.lvl);
if (await p.evaluate(() => window.__onBack())) errors.push('savaş ekranında geri tuşu yutuldu');
console.log('durum', JSON.stringify(st));
console.log('errors', JSON.stringify(errors));
await b.close();
process.exit(errors.length ? 1 : 0);
