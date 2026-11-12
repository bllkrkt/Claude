// Efsane Avcısı oyun testi: node rpg-e2e.mjs ../rpg/src/main/assets/index.html <çıktı klasörü>
// Telefon boyutunda: tanıtım → sınıf seçimi → günlük ödül → savaş (yetenek, iksir, kombo) → çanta/demirci →
// kahraman (stat/yetenek/yoldaş) → görevler → dükkan → harita → sen yokken kazancı → v1 kaydından geçiş → geri tuşu
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
const url = 'file://' + path.resolve(html);
await p.goto(url);
await p.waitForTimeout(400);
const shot = n => p.screenshot({ path: path.join(out, 'rpg-' + n + '.png') });
const check = (c, msg) => { if (!c) errors.push(msg); };
check(await p.evaluate(() => !!D3), '3B sahne açılmadı');
await shot('01-tanitim');
await p.click('[data-a=pickCls][data-v=war]');
await p.waitForTimeout(500);
await shot('02-gunluk-odul');
check(await p.evaluate(() => !!document.querySelector('[data-a=claimLogin]')), 'günlük ödül penceresi çıkmadı');
await p.click('#sheet [data-a=claimLogin]');
await p.waitForTimeout(400);

// açık pencereleri oyuncu gibi kapat
const clear = () => p.evaluate(() => {
  for (let k = 0; k < 4; k++) {
    if (document.querySelector('#leg.on')) ACT.legClose();
    if (!document.querySelector('#sheetBg.on')) continue;
    if (document.querySelector('#sheet [data-a=revive]')) ACT.revive();
    else if (document.querySelector('#sheet [data-a=offTake]')) ACT.offTake('1');
    else if (document.querySelector('#sheet [data-a=arenaDone]')) ACT.arenaDone();
    else if (document.querySelector('#sheet [data-a=claimLogin]')) claimLogin();
    else if (document.querySelector('#sheet [data-a=pickCls]')) ACT.pickCls('war');
    else closeSheet();
  }
});
async function play(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await clear();
    await p.evaluate(() => {
      if (S.hp < P.hp * .4 && S.potions) usePotion();
      for (let i = 0; i < 4; i++) if (S.lvl >= CLS[S.cls].sk[i].lv) useSkill(i);
      document.getElementById('bHit').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    await p.waitForTimeout(110);
  }
}
const autoGear = () => p.evaluate(() => {
  for (let i = 0; i < 20; i++) { const it = S.inv.find(x => power(x) > power(S.eq[x.slot])); if (!it) break; ACT.equip(it.id); }
  while (S.pts > 0) ACT.stat(['str', 'vit', 'agi'][S.pts % 3]);
  closeSheet();
});
await play(2500); await shot('03-savas');
await play(20000); await clear(); await autoGear(); await p.waitForTimeout(300); await clear();
check(await p.evaluate(() => S.lvl >= 3 && !!S.pets.wolf), 'kurt hediyesi gelmedi');
await play(1500); await shot('04-savas-yoldas');

// çanta + demirci
await p.evaluate(() => { S.gold += 200000; S.ess += 300; S.gems += 500; S.inv.push(makeItem(5, 2, 'gloves')); updAll(); });
await p.click('[data-v=inv]'); await p.waitForTimeout(300); await shot('05-canta');
await p.click('#s-inv .it[data-a=item]'); await p.waitForTimeout(400); await shot('06-esya-demirci');
const up0 = await p.evaluate(() => { const it = S.eq.weapon || S.inv[0]; for (let i = 0; i < 8; i++) ACT.forge(it.id); closeSheet(); return it.up; });
check(up0 > 0, 'demirci geliştirme çalışmadı');
await p.evaluate(() => { ACT.item((S.eq.weapon || S.inv[0]).id); }); await p.waitForTimeout(400); await shot('07-gelistirilmis');
await p.evaluate(() => closeSheet());
await p.click('[data-a=bulk]'); await p.waitForTimeout(300); await shot('08-toplu');
await p.evaluate(() => closeSheet());

// kahraman
await p.click('[data-v=hero]'); await p.waitForTimeout(300); await shot('09-kahraman-stat');
await p.click('[data-a=heroSeg][data-v=skill]'); await p.evaluate(() => { S.lvl = Math.max(S.lvl, 22); updAll(); ACT.skUp('0'); ACT.skUp('0'); renderSkillBar(); });
await p.waitForTimeout(200); await shot('10-kahraman-yetenek');
await p.click('[data-a=heroSeg][data-v=pet]'); await p.click('[data-a=petBuy][data-v=dragon]'); await p.waitForTimeout(300); await clear();
await p.evaluate(() => { ACT.petFeed(); ACT.petFeed(); });
await p.waitForTimeout(200); await shot('11-kahraman-yoldas');
check(await p.evaluate(() => S.pet === 'dragon' && S.pets.dragon === 3), 'yoldaş alma/besleme çalışmadı');

// görevler + dükkan
await p.click('[data-v=quest]'); await p.waitForTimeout(300); await shot('12-gorevler');
await p.evaluate(() => { for (const a of ACH) ACT.achClaim(a.k); S.daily.q.forEach((q, i) => { q.p = q.n; ACT.qClaim(String(i)); }); ACT.qBonus(); });
await p.waitForTimeout(300); await clear(); await shot('13-gorevler-alindi');
await p.click('[data-v=shop]'); await p.waitForTimeout(300); await shot('14-dukkan');
await p.click('[data-a=chestGem][data-v="2"]'); await p.waitForTimeout(600); await clear();
await p.evaluate(() => legendary(makeItem(40, 3, 'weapon'))); await p.waitForTimeout(700); await shot('15-efsanevi');
await p.evaluate(() => ACT.legClose());

// harita + farklı bölgeler
await p.click('[data-v=battle]');
await p.evaluate(() => { S.maxF = [30, 30, 30, 30, 10, 0, 5, 30]; S.floors[6] = 3; S.floors[7] = 30; updAll(); });
await p.click('.zinfo'); await p.waitForTimeout(300); await shot('16-harita');
await p.evaluate(() => { ACT.zone('4'); S.floors[4] = 10; S.kills = 0; spawn(); });
await p.waitForTimeout(700); await shot('17-volkan-boss');
await p.evaluate(() => { ACT.zone('3'); }); await p.waitForTimeout(500);
await p.evaluate(() => { useSkill(1); for (let i = 0; i < 30; i++) { R.combo = i; } R.comboLast = performance.now(); R.combo = 34; showCombo(); });
await p.waitForTimeout(300); await shot('18-buzul-kalkan-kombo');
await p.evaluate(() => { S.hp = Math.round(P.hp * .2); updPl(); }); await p.waitForTimeout(200); await shot('19-dusuk-can');
await p.evaluate(() => { S.hp = P.hp; updPl(); ACT.settings(); }); await p.waitForTimeout(300); await shot('20-ayarlar');
await p.evaluate(() => closeSheet());

// yeni bölgeler
await p.evaluate(() => { ACT.zone('6'); }); await p.waitForTimeout(400); await p.evaluate(() => { M.int = 1e9; }); await p.waitForTimeout(900); await shot('38-gok-tapinagi');
await p.evaluate(() => { ACT.zone('7'); }); await p.waitForTimeout(400); await p.evaluate(() => { M.int = 1e9; }); await p.waitForTimeout(1100); await shot('39-hiclik-boss');
// oto saldırı: dokunmadan canavarın canı azalmalı
await p.evaluate(() => { S.tot.boss = Math.max(1, S.tot.boss); aaCheck(); }); await p.waitForTimeout(300);
check(await p.evaluate(() => /Oto saldırı açıldı/.test(document.getElementById('sheet').innerText)), 'oto saldırı penceresi çıkmadı');
await shot('40a-oto-acildi'); await clear();
check(await p.evaluate(() => aaOpen() && S.autoAtk), 'oto saldırı açılmadı');
await p.evaluate(() => { ACT.zone('0'); S.floors[0] = 3; S.kills = 0; spawn(); M.int = 1e9; M.max = M.hp = 1e9; S.autoSk = true; R.cd = [0, 0, 0, 0]; closeSheet(); });
await p.waitForTimeout(2500);
check(await p.evaluate(() => M.hp < 1e9 && S.tot.skills > 0), 'oto saldırı/oto yetenek vurmadı');
await shot('40-oto-saldiri');
await p.evaluate(() => { ACT.aa(); }); check(await p.evaluate(() => !S.autoAtk), 'oto saldırı kapatılamadı'); await p.evaluate(() => { ACT.aa(); });
// kostüm + yoldaş evrimi + müzik
await p.evaluate(() => { S.gems += 500; ACT.skin('gold'); S.pets[S.pet] = 9; S.gold += 1e7; ACT.petFeed(); });
check(await p.evaluate(() => S.skin === 'gold' && S.skins.gold && petStage(S.pets[S.pet]) === 1 && /Ulu/.test(pName(S.pet))), 'kostüm ya da evrim çalışmadı');
await p.waitForTimeout(1200); await clear(); await shot('41-altin-kostum-evrim');
await p.click('[data-v=hero]'); await p.click('[data-a=heroSeg][data-v=stat]'); await p.waitForTimeout(300); await shot('42-kostumler');
await p.click('[data-a=heroSeg][data-v=pet]'); await p.waitForTimeout(300); await shot('43-evrim-karti');
await p.click('[data-v=battle]'); await p.mouse.click(200, 400); await p.waitForTimeout(1500);
check(await p.evaluate(() => S.set.music && musI > 0), 'müzik çalmadı');

// eşya setleri: 6 parça Kurt Avcısı
await p.evaluate(() => { ACT.zone('0'); for (const s of SLOTS) { const it = makeItem(30, 2, s.k, 'wolf'); S.inv.push(it); ACT.equip(it.id); } closeSheet(); });
check(await p.evaluate(() => setBonus().n.wolf === 6 && setBonus().o.atkP === 30), 'set bonusu hesaplanmadı');
await p.click('[data-v=inv]'); await p.waitForTimeout(300); await shot('25-set-canta');
await p.evaluate(() => ACT.item(S.eq.weapon.id)); await p.waitForTimeout(400); await shot('26-set-esya');
await p.evaluate(() => closeSheet());
await p.click('[data-v=hero]'); await p.click('[data-a=heroSeg][data-v=stat]'); await p.waitForTimeout(300); await shot('27-set-kahraman');

// zamanlı boss: süre dolunca bir kat geri
await p.click('[data-v=battle]');
await p.evaluate(() => { S.zone = 0; S.maxF[0] = 30; S.floors[0] = 20; S.kills = 0; setStage(); spawn(); M.int = 1e9; M.max = M.hp = 1e12; });
await p.waitForTimeout(900); await shot('28-zamanli-boss');
await p.evaluate(() => { M.timer = 120; }); await p.waitForTimeout(500);
check(await p.evaluate(() => /Süre doldu/.test(document.getElementById('sheet').innerText) && S.floors[0] === 19), 'boss süresi dolunca kat geri gitmedi');
await shot('29-boss-sure-doldu'); await clear();

// boss arenası
await p.click('[data-v=quest]'); await p.waitForTimeout(300); await shot('30-arena-kart');
await p.click('#s-quest [data-a=arena]'); await p.waitForTimeout(900);
await p.evaluate(() => { M.int = 1e9; for (let i = 0; i < 8; i++) attack(3, { src: 'tap' }); arenaDmg = Math.max(arenaDmg, arenaTier(4) + 5); updMon(); });
await p.waitForTimeout(500); await shot('31-arena-savas');
await p.evaluate(() => { M.timer = 60; }); await p.waitForTimeout(500);
check(await p.evaluate(() => S.arena.left === 2 && S.arena.best >= 4 && /Süre doldu/.test(document.getElementById('sheet').innerText)), 'arena sonucu hatalı');
await shot('32-arena-sonuc'); await clear();

// yeniden doğuş
await p.evaluate(() => { S.maxF[1] = 25; for (const s of SLOTS) S.eq[s.k].lk = true; S.reb.up.start = 1; updAll(); });
await p.click('[data-v=hero]'); await p.click('[data-a=heroSeg][data-v=reb]'); await p.waitForTimeout(300); await shot('33-dogus');
await p.click('[data-a=reb]'); await p.waitForTimeout(300); await shot('34-dogus-onay');
await p.click('[data-a=rebOk]'); await p.waitForTimeout(800);
const rb = await p.evaluate(() => ({ lvl: S.lvl, souls: S.reb.souls, n: S.reb.n, eq: Object.keys(S.eq).length, f: S.floors[0], gold: S.gold, cls: S.cls }));
check(rb.lvl === 1 && rb.souls > 0 && rb.n === 1 && rb.eq === 6 && rb.f >= 6 && rb.gold < 500 && rb.cls === 'war', 'yeniden doğuş hatalı: ' + JSON.stringify(rb));
await shot('35-dogus-sonrasi');
await p.evaluate(() => { const a0 = P.atk; ACT.soulUp('atk'); window.__a = [a0, P.atk]; });
check(await p.evaluate(() => S.reb.up.atk === 1 && window.__a[1] > window.__a[0]), 'Ruh Ağacı çalışmadı');
await p.click('[data-v=hero]'); await p.click('[data-a=heroSeg][data-v=reb]'); await p.waitForTimeout(300); await shot('36-ruh-agaci');
await p.click('[data-v=battle]');

// 2B'ye geçiş ve geri
await p.evaluate(() => { save = () => {}; S.set.d3 = false; localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({}, S, { lastSeen: Date.now() }))); });
await p.reload(); await p.waitForTimeout(600); await clear();
check(await p.evaluate(() => !D3 && !document.getElementById('c3d')), '2B moda geçilemedi');
await shot('37-2b-mod');
await p.evaluate(() => { S.set.d3 = true; save(true); }); await p.reload(); await p.waitForTimeout(600); await clear();
check(await p.evaluate(() => !!D3), '3B moda dönülemedi');

// sen yokken kazancı: 3 saat önce kapatılmış gibi
const lvlBefore = await p.evaluate(() => { save(true); const o = JSON.parse(localStorage.getItem(SAVE_KEY)); o.lastSeen = Date.now() - 3 * 3600e3; o.daily.day = ''; localStorage.setItem(SAVE_KEY, JSON.stringify(o)); save = () => {}; return S.lvl; });
await p.reload(); await p.waitForTimeout(500);
await shot('21-sen-yokken');
check(await p.evaluate(() => !!document.querySelector('#sheet [data-a=offTake]')), 'sen yokken penceresi çıkmadı');
const g0 = await p.evaluate(() => S.gold);
await p.evaluate(() => ACT.offTake('1')); await p.waitForTimeout(400);
check(await p.evaluate(g => S.gold > g, g0), 'sen yokken altını eklenmedi');
check(await p.evaluate(() => !!document.querySelector('#sheet [data-a=claimLogin]')), 'yeni gün ödül penceresi çıkmadı');
await shot('22-ertesi-gun-odul');
await clear();
check(await p.evaluate(l => S.lvl >= l, lvlBefore), 'kayıt yüklenmedi');

// v1 kaydından geçiş: kullanıcının telefonundaki eski kayıt biçimi
await p.evaluate(() => { save(true); save = () => {}; localStorage.setItem(SAVE_KEY, JSON.stringify({
  v: 1, lvl: 12, xp: 40, gold: 1234, pts: 2, st: { str: 5, vit: 4, agi: 3, luck: 0 }, hp: 300, potions: 4,
  eq: { weapon: { id: 3, slot: 'weapon', r: 2, L: 9, n: 'Kadim Balta', e: '🪓', st: { atk: 20, crit: 3.1 } } },
  inv: [{ id: 5, slot: 'ring', r: 1, L: 8, n: 'Sağlam Yüzük', e: '💍', st: { gold: 6, hp: 18 } }],
  zone: 0, floors: [18, 1, 1, 1, 1, 1], maxF: [18, 0, 0, 0, 0, 0], kills: 2, auto: true, nextId: 9, seen: true,
  tot: { kills: 300, boss: 1, leg: 0, gold: 5000 }, set: { sound: false, vib: true } })); });
await p.reload(); await p.waitForTimeout(500);
await shot('23-v1-gecis');
check(await p.evaluate(() => !!document.querySelector('#sheet [data-a=pickCls]')), 'v1 kaydında sınıf seçimi çıkmadı');
await p.click('[data-a=pickCls][data-v=mag]'); await p.waitForTimeout(400); await clear();
const mig = await p.evaluate(() => ({ lvl: S.lvl, gold: S.gold, w: S.eq.weapon && S.eq.weapon.up, cls: S.cls, wolf: !!S.pets.wolf, inv: S.inv.length }));
check(mig.lvl === 12 && mig.w === 0 && mig.cls === 'mag' && mig.wolf && mig.inv === 1, 'v1 geçişi hatalı: ' + JSON.stringify(mig));
await play(3000); await clear(); await shot('24-v1-sonrasi-buyucu');
await p.evaluate(() => { ACT.tab('inv'); }); await p.waitForTimeout(200);
check(await p.evaluate(() => window.__onBack() === true && tab === 'battle'), 'geri tuşu sekmeden savaşa dönmedi');
check(await p.evaluate(() => window.__onBack() === false), 'savaş ekranında geri tuşu yutuldu');
console.log('durum', JSON.stringify(mig));
console.log('errors', JSON.stringify(errors));
await b.close();
process.exit(errors.length ? 1 : 0);
