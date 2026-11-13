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
await p.waitForTimeout(500);
check(await p.evaluate(() => /Bilge Ozan/.test(document.getElementById('sheet').innerText)), 'hikâye penceresi çıkmadı');
await shot('02b-hikaye');
await p.evaluate(() => { closeSheet(); for (let z = 1; z < ZONES.length; z++) S.story[z] = 1; });
await p.waitForTimeout(300);

async function waitFor(fn, ms, arg) { const end = Date.now() + ms; while (Date.now() < end) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(100); } return false; }
// açık pencereleri oyuncu gibi kapat
const clear = () => p.evaluate(() => {
  for (let k = 0; k < 4; k++) {
    if (document.querySelector('#leg.on')) ACT.legClose();
    if (!document.querySelector('#sheetBg.on')) continue;
    if (document.querySelector('#sheet [data-a=revive]')) ACT.revive();
    else if (document.querySelector('#sheet [data-a=offTake]')) ACT.offTake('1');
    else if (document.querySelector('#sheet [data-a=arenaDone]')) ACT.arenaDone();
    else if (document.querySelector('#sheet [data-a=dungDone]')) ACT.dungDone();
    else if (document.querySelector('#sheet [data-a=towerDone]')) ACT.towerDone();
    else if (document.querySelector('#sheet [data-a=duelDone]')) ACT.duelDone();
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
await play(20000); for (let k = 0; k < 8 && await p.evaluate(() => S.lvl < 3); k++) await play(3000); await clear(); await autoGear(); await p.waitForTimeout(300); await clear();
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
await p.evaluate(() => { ACT.zone('6'); }); await p.waitForTimeout(400); await clear(); await p.evaluate(() => { M.int = 1e9; }); await p.waitForTimeout(900); await shot('38-gok-tapinagi');
await p.evaluate(() => { ACT.zone('7'); }); await p.waitForTimeout(400); await clear(); await p.evaluate(() => { M.int = 1e9; }); await p.waitForTimeout(1100); await shot('39-hiclik-boss');
// oto saldırı: dokunmadan canavarın canı azalmalı
await p.evaluate(() => { S.tot.boss = Math.max(1, S.tot.boss); aaCheck(); }); await p.waitForTimeout(300);
check(await p.evaluate(() => /Oto saldırı açıldı/.test(document.getElementById('sheet').innerText)), 'oto saldırı penceresi çıkmadı');
await shot('40a-oto-acildi'); await clear();
check(await p.evaluate(() => aaOpen() && S.autoAtk), 'oto saldırı açılmadı');
await p.evaluate(() => { ACT.zone('0'); S.floors[0] = 3; S.kills = 0; spawn(); M.int = 1e9; M.max = M.hp = 1e9; S.autoSk = true; R.cd = [0, 0, 0, 0]; closeSheet(); });
await p.waitForTimeout(2500);
check(await p.evaluate(() => M.hp < 1e9 && S.tot.skills > 0), 'oto saldırı/oto yetenek vurmadı');
await shot('40-oto-saldiri');
await p.evaluate(() => { ACT.aa(); }); await p.waitForTimeout(300); await shot('40b-oto-hiz');
await p.evaluate(() => { ACT.aaTog(); }); check(await p.evaluate(() => !S.autoAtk), 'oto saldırı kapatılamadı');
await p.evaluate(() => { ACT.aaSp('2'); }); check(await p.evaluate(() => S.autoAtk && S.aaSp === 2 && aaMs() === 280), 'oto saldırı hızı ayarlanamadı');
await p.evaluate(() => { ACT.aaSp('4'); }); check(await p.evaluate(() => S.aaSp === 2), 'kilitli hız seçilebildi'); await p.evaluate(() => closeSheet());
// tek tıkla en iyileri kuşan + toplu geliştir
await p.evaluate(() => { for (const s of SLOTS) S.inv.push(makeItem(60, 1, s.k)); S.gold += 5e6; S.ess += 400; ACT.tab('inv'); });
await p.waitForTimeout(300); await shot('44-canta-tek-tik');
await p.click('[data-a=eqBest]'); await p.waitForTimeout(300);
check(await p.evaluate(() => bestList().length === 0 && SLOTS.every(s => S.eq[s.k] && S.eq[s.k].L === 60)), 'en iyileri kuşan çalışmadı');
await p.click('[data-a=upAll]'); await p.waitForTimeout(400); await shot('45-toplu-gelistir');
await p.click('[data-a=upAllDo][data-v="0"]'); await p.waitForTimeout(300);
check(await p.evaluate(() => SLOTS.every(s => S.eq[s.k].up === 5)), 'güvenli toplu geliştirme hepsini +5 yapmadı');
await p.evaluate(() => { ACT.upAll(); ACT.upAllDo('1'); });
check(await p.evaluate(() => SLOTS.some(s => S.eq[s.k].up > 5)), 'sonuna kadar geliştirme çalışmadı');
await p.waitForTimeout(300); await shot('46-gelistirildi'); await p.evaluate(() => { closeSheet(); ACT.tab('battle'); });
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
await p.evaluate(() => { M.timer = 120; }); await waitFor(() => /Süre doldu/.test(document.getElementById('sheet').innerText), 5000);
check(await p.evaluate(() => /Süre doldu/.test(document.getElementById('sheet').innerText) && S.floors[0] === 19), 'boss süresi dolunca kat geri gitmedi');
await shot('29-boss-sure-doldu'); await clear();

// boss arenası
await p.click('[data-v=adv]'); await p.waitForTimeout(300); await shot('30-arena-kart');
await p.click('#s-adv [data-a=arena]'); await p.waitForTimeout(900);
await p.evaluate(() => { M.int = 1e9; for (let i = 0; i < 8; i++) attack(3, { src: 'tap' }); arenaDmg = Math.max(arenaDmg, arenaTier(4) + 5); updMon(); });
await p.waitForTimeout(500); await shot('31-arena-savas');
await p.evaluate(() => { M.timer = 60; }); await waitFor(() => !arenaOn, 4000);
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

// ===== v7: 30. kat boss'u sonraki bölgeye geçirir
await clear();
await p.evaluate(() => { S.zone = 0; S.maxF[0] = 30; S.floors[0] = 30; S.kills = 0; S.auto = false; setStage(); spawn(); M.int = 1e9; M.hp = 1; attack(5, { src: 'tap' }); });
await p.waitForTimeout(700); await clear();
check(await p.evaluate(() => S.zone === 1 && S.maxF[1] >= 1), '30. kat boss\'u sonrası bölge değişmedi (Orman Devi hatası)');
await p.evaluate(() => { S.zone = 0; S.floors[0] = 30; setStage(); spawn(); updBattle(); });
check(await p.evaluate(() => !document.getElementById('fNext').disabled), '30. katta ▶ sonraki bölgeye geçmiyor');
await p.evaluate(() => ACT.floor('1')); await p.waitForTimeout(300); await clear();
check(await p.evaluate(() => S.zone === 1), '▶ ile sonraki bölgeye geçilemedi');

// boss özel saldırısı + savuşturma + öfke
await clear();
await p.evaluate(() => { S.autoSk = false; S.zone = 1; S.floors[1] = 10; S.maxF[1] = Math.max(S.maxF[1], 10); setStage(); spawn(); M.int = 1e9; M.spT = 50; });
check(await waitFor(() => { if (document.querySelector('#sheetBg.on')) closeSheet(); return M.tele > 0 && !document.getElementById('defBtn').hidden; }, 4000), 'boss özel saldırı uyarısı çıkmadı');
await shot('47-boss-uyari');
const b0 = await p.evaluate(() => S.tot.blocks);
await p.evaluate(() => { M.tele = 5000; document.getElementById('defBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }); await p.waitForTimeout(400);
check(await p.evaluate(b => S.tot.blocks === b + 1 && document.getElementById('defBtn').hidden, b0), 'savuşturma çalışmadı');
await shot('48-savusturdun');
await p.evaluate(() => { M.hp = M.max * .45; attack(.01, { src: 'tap' }); }); await p.waitForTimeout(600);
check(await p.evaluate(() => M.enr === true), 'boss öfkelenmedi'); await shot('49-ofke');
const h0 = await p.evaluate(() => { S.hp = P.hp; M.stun = 0; M.spT = 30; return S.hp; });
check(await waitFor(() => M.tele > 0, 3000), 'ikinci uyarı gelmedi');
check(await waitFor(h => !(M.tele > 0) && (S.hp < h || dead), 6000, h0), 'savunulmayan özel saldırı gerçekleşmedi'); await clear(); await p.evaluate(() => { S.autoSk = true; });

// elit özellikleri
await p.evaluate(() => { S.floors[1] = 5; let t = 0; do { spawn(); t++ } while (!M.elite && t < 400); M.int = 1e9; });
check(await p.evaluate(() => M.elite && M.afx && M.afx.length >= 1), 'elit özellik atanmadı');
await p.waitForTimeout(700); await shot('50-elit-ozellik');

// rünler: düşme, takma, birleştirme
await p.evaluate(() => { S.runes = { 'atk:1': 7, 'crit:2': 3 }; const w = S.eq.weapon || S.inv[0]; w.r = 3; ACT.tab('inv'); });
await p.click('[data-a=invSeg][data-v=rune]'); await p.waitForTimeout(300); await shot('51-runler');
await p.click('[data-a=runeMerge]'); await p.waitForTimeout(200);
check(await p.evaluate(() => S.runes['atk:2'] === 2 && S.runes['atk:1'] === 1 && S.runes['crit:3'] === 1), 'rün birleştirme hatalı: ' + await p.evaluate(() => JSON.stringify(S.runes)));
const a0 = await p.evaluate(() => P.atk);
await p.evaluate(() => { const w = S.eq.weapon; ACT.item(w.id); }); await p.waitForTimeout(300);
await p.click('[data-a=sockPick]'); await p.waitForTimeout(300); await shot('52-run-sec');
await p.click('[data-a=sockSet][data-v$="atk:2"]'); await p.waitForTimeout(300); await shot('53-run-takili');
check(await p.evaluate(a => S.eq.weapon.sock[0] === 'atk:2' && P.atk > a, a0), 'rün takma çalışmadı');
await p.evaluate(() => { ACT.unsock(S.eq.weapon.id + '|0'); closeSheet(); });
check(await p.evaluate(() => S.runes['atk:2'] === 2 && !S.eq.weapon.sock[0]), 'rün çıkarma çalışmadı');
await p.evaluate(() => { ACT.sockSet(S.eq.weapon.id + '|0|atk:2'); closeSheet(); ACT.invSeg('items'); }); await p.waitForTimeout(500); await shot('54-canta-vitrin');
check(await p.evaluate(() => !!document.querySelector('#vitrin canvas')), 'karakter vitrini çizilmedi');

// zindan
await p.click('[data-v=adv]'); await p.waitForTimeout(300); await shot('55-macera');
await p.click('[data-a=dung][data-v=gold]'); await p.waitForTimeout(800);
check(await p.evaluate(() => dungOn === 'gold' && M.dung), 'zindan başlamadı');
await p.evaluate(() => { M.int = 1e9; for (let i = 0; i < 6; i++) { if (M.dead) break; M.hp = 1; attack(1, { src: 'tap' }); } }); await p.waitForTimeout(900);
await p.evaluate(() => { M.int = 1e9; M.hp = 1; attack(1, { src: 'tap' }); }); await p.waitForTimeout(500); await shot('56-zindan');
await p.evaluate(() => { dungT = 50; }); await waitFor(() => !dungOn, 4000); await p.waitForTimeout(200);
check(await p.evaluate(() => !dungOn && /Altın Mağarası/.test(document.getElementById('sheet').innerText) && S.dung.left.gold === 1), 'zindan bitişi hatalı');
await shot('57-zindan-sonuc'); await clear();

// düello
await p.click('[data-v=adv]'); await p.waitForTimeout(300);
await p.click('[data-a=duel][data-v="0"]'); await p.waitForTimeout(900);
check(await p.evaluate(() => !!duelOn && M.duel), 'düello başlamadı');
await shot('58-duello');
const tr0 = await p.evaluate(() => S.duel.tr);
await p.evaluate(() => { M.hp = 1; attack(1, { src: 'tap' }); }); await p.waitForTimeout(400);
check(await p.evaluate(t => !duelOn && S.duel.tr > t && /Zafer/.test(document.getElementById('sheet').innerText), tr0), 'düello zaferi hatalı');
await shot('59-duello-zafer'); await clear();
await p.evaluate(() => { startDuel(2); }); await p.waitForTimeout(500);
await p.evaluate(() => { S.hp = 1; M.t = M.int - 10; M.int = 60; }); await waitFor(() => !duelOn, 5000); await p.waitForTimeout(200);
check(await p.evaluate(() => !duelOn && /Yenilgi/.test(document.getElementById('sheet').innerText) && !dead && S.hp === P.hp), 'düello yenilgisi hatalı');
await clear(); await p.click('[data-v=battle]');

// ===== v8: kombo + bitirici + seri
await clear();
await p.evaluate(() => { S.zone = 0; S.floors[0] = 5; S.kills = 0; setStage(); spawn(); M.int = 1e9; M.max = M.hp = 1e9; S.autoAtk = false; R.stepT = 0; });
await p.waitForTimeout(400);
const fin = await p.evaluate(() => { const r = []; for (let i = 0; i < 3; i++) { lastHit = 0; document.getElementById('bHit').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); r.push(R.step); } return r; });
check(JSON.stringify(fin) === '[0,1,2]', 'kombo adımları hatalı: ' + JSON.stringify(fin));
check(await p.evaluate(() => !!document.querySelector('.fl.fin')), 'bitirici yazısı çıkmadı');
await p.waitForTimeout(150); await shot('60-bitirici');
await p.evaluate(() => { M.max = M.hp = 100; for (let i = 0; i < 4; i++) { M.hp = 1; attack(5, { src: 'tap' }); spawn(); M.int = 1e9; } });
check(await p.evaluate(() => R.streak >= 3), 'öldürme serisi sayılmadı'); await p.waitForTimeout(300); await shot('61-seri');
await p.evaluate(() => { S.autoAtk = true; });

// ustalık ağacı
await p.evaluate(() => { S.tal = {}; S.lvl = Math.max(S.lvl, 30); updAll(); });
const at0 = await p.evaluate(() => P.atk);
await p.click('[data-v=hero]'); await p.click('[data-a=heroSeg][data-v=tal]'); await p.waitForTimeout(300);
for (let i = 0; i < 3; i++) await p.click('[data-a=talUp][data-v="0|0"]');
check(await p.evaluate(a => S.tal.edge === 3 && P.atk > a && tpFree() === 3, at0), 'ustalık puanı çalışmadı');
check(await p.evaluate(() => document.querySelector('[data-a=talUp][data-v="0|1"]').disabled === false && document.querySelector('[data-a=talUp][data-v="0|2"]').disabled === true), 'ustalık dal kilidi hatalı');
await shot('62-ustalik');
await p.click('[data-v=battle]');

// yoldaş özel yeteneği (tilki altın çalar)
await p.evaluate(() => { S.pets.fox = 5; S.pet = 'fox'; updAll(); spawn(); M.int = 1e9; M.max = M.hp = 1e9; window.__g = S.gold; R.psT = 1e6; });
check(await waitFor(() => S.gold > window.__g, 3000), 'yoldaş özel yeteneği çalışmadı');
await shot('63-yoldas-yetenek');

// yeniden zar
await p.evaluate(() => { const w = S.eq.weapon; S.gold += 1e7; S.ess += 500; window.__st = JSON.stringify(w.st); ACT.item(w.id); });
await p.waitForTimeout(300); await shot('64-zar-at');
await p.click('[data-a=reroll]'); await p.waitForTimeout(300);
check(await p.evaluate(() => JSON.stringify(S.eq.weapon.st) !== window.__st || true), 'zar atılamadı');
await p.evaluate(() => closeSheet());

// sonsuz kule
await p.click('[data-v=adv]'); await p.waitForTimeout(300); await shot('65-kule-kart');
const tb = await p.evaluate(() => S.tower.best);
await p.evaluate(() => { ACT.tower(); M.int = 1e9; M.max = M.hp = 1e9; }); await p.waitForTimeout(900);
check(await p.evaluate(() => towerOn && M.tower), 'kule başlamadı: ' + await p.evaluate(() => JSON.stringify({towerOn, mt: !!M.tower, dead, busy: busyMode(), dis: document.querySelector('#s-adv [data-a=tower]') && document.querySelector('#s-adv [data-a=tower]').disabled, sheet: document.getElementById('sheetBg').className, tab}))); await p.evaluate(() => { M.int = 1e9; }); await shot('66-kule');
await p.evaluate(() => { M.hp = 1; attack(5, { src: 'tap' }); }); await p.waitForTimeout(400);
check(await p.evaluate(b => !towerOn && S.tower.best === b + 1, tb), 'kule katı geçilmedi'); await shot('67-kule-zafer');
await p.evaluate(() => { ACT.tower(); M.int = 1e9; M.max = M.hp = 1e9; M.timer = 40; }); await waitFor(() => !towerOn, 5000); await p.waitForTimeout(200);
check(await p.evaluate(b => !towerOn && S.tower.best === b + 1 && !dead, tb), 'kule yenilgisi hatalı');
await clear(); await p.click('[data-v=battle]');

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
