# Takip Temizleme — Proje devir notu

Bu dosya claude.ai sohbetinden Claude Code'a aktarılan projenin tam bağlamıdır. Her oturumda önce bunu oku.

## Kullanıcı ve iletişim
- Kullanıcı **Türkçe** konuşur, samimi bir dil kullanır ("kanka"). Yanıtları Türkçe, kısa ve net ver.
- **DİL KURALI (kullanıcının kesin isteği, her zaman geçerli):** Kullanıcının ekranında görünen HER ŞEY Türkçe olmalı: cevaplar, çalışırken yazılan ara durum notları ("şimdi şunu yapıyorum" gibi), araç çağrılarının açıklamaları, soru pencereleri, dosya başlıkları/açıklamaları. Tek bir İngilizce cümle bile yazma. Commit mesajları da Türkçe. Sadece kod, komut ve dosya adları olduğu gibi kalır.
- Teknik değil; sonuç odaklı. Kod anlatmak yerine "ne değişti, telefonda nasıl görünecek" söyle.
- Telefonu **Android**. APK'yı kendisi yükleyip kuruyor (Play Store yok).
- Durumu: Instagram'da ~860 takip, ~640 takipçi (ilk verdiği sayılar). Hedefi takip sayısını takipçi sayısına indirmek (ilk hedef 639).

## Ürün nedir
Instagram veri dışa aktarımını (ZIP / following.json / followers_1.json) okuyup kişiyi **tek tek önüne getiren**, takipten çıkarmayı kullanıcının **Instagram uygulamasında elle** yaptığı bir yardımcı uygulama. Uygulama Instagram'a hiç istek atmaz.

### Kesin kurallar (kullanıcı istese bile)
- **Otomasyon / scraping yok.** Otomatik takipten çıkarma, hesap açık mı diye Instagram'a toplu istek atma, şifre isteme yok. Instagram Kullanım Şartları otomatik erişimi yasaklıyor ve hesap kısıtlaması riski var. Kullanıcı "kapalı hesapları otomatik kontrol et" istedi; reddedildi, yerine manuel "Hesap kapalı" butonu + profil sayısı farkından tahmin eklendi.
- Güvenlik freni (günlük limit, bekleme süresi, ani hız uyarısı) kaldırılmamalı.

## Teknik özet (AYRINTI: `app/NOTLAR.md` — bu uygulamada çalışmadan önce oku)
- Tüm uygulama `app/src/main/assets/index.html` (tek dosya); WebView kabuğu + JS köprüsü `MainActivity.java`; widget, hatırlatıcı.
- Derleme `./gradlew assembleDebug` → kullanıcıya `TakipTemizleme-vN.apk`. versionCode her sürümde +1 (şu an 6).
- **İmza:** `app/keystore/debug.keystore` (SHA-256 `50b4d264…6b86`) ASLA değişmez; değişirse kullanıcının verisi gider.
- Veri formatında geriye uyumluluk şart (localStorage `takip-temizleme-v2`). Test: `tests/e2e.mjs`.
- Sürümler v1–v6 (son: etiket/not, widget, ZIP64). Fikirler: widget telefonda doğrulanmadı; release/R8 APK.

---

# İkinci proje: Efsane Avcısı (RPG oyunu)

Aynı depoda, Takip Temizleme'den tamamen bağımsız ikinci bir Android uygulaması. Kullanıcı kod bilmiyor; telefonda oynanan Türkçe bir RPG istedi. v2'de "aklına gelen ne varsa sormadan ekle" dedi.

- `rpg/src/main/assets/index.html` ← oyun mantığı + arayüz (vanilla JS + CSS). Font: `assets/fonts/` (Plus Jakarta Sans gövde `J`, Cinzel başlık `C`).
- `rpg/src/main/assets/simgeler.js` ← EMOJİSİZ OYUN (kullanıcı "hiç emoji kalmasın" dedi): ekrana giren her metindeki emoji MutationObserver ile kodla çizilmiş SVG'ye (`<i class="em">`) çevrilir; tablo `E` (emoji→çizim). Kodda emoji yazmaya devam edebilirsin ama YENİ bir emoji kullanırsan `E`'ye karşılık ekle (yoksa altın nokta çıkar). `tests/rpg-e2e.mjs` her ekranda emoji kalırsa hata verir. `[data-t]` metinleri dil anahtarı için önce `dataset.tr`'ye saklanır.
- `rpg/src/main/assets/ikonlar.js` ← kodla çizilen SVG ikonlar (`window.ICO`: `item(it)`, `slot(k)`, `tab(k)`, `cur(k)`, `cls(k)`, `skill(emoji)`); ortak gradyanlar `ICO.init()` ile bir kez eklenir. Yeni eşya adı/emojisi eklersen `BYE` tablosuna şekil ver.
- `rpg/src/main/assets/sahne3d.js` ← 3B savaş sahnesi (`window.S3D`): tüm modeller koddan low-poly (HERO/PETM/MON listeleri, canavar adıyla eşleşir; listede olmayan ad emoji sprite'a düşer), 6 bölge ortamı (ZD), parçacıklar, efektler. `lib/three.min.js` = Three.js r149 (UMD, MIT).
- WebGL yoksa ya da Ayarlar → "2B grafik" seçiliyse (`S.set.d3=false`) eski emoji sahnesi kullanılır; `D3` null olur. Oyun kodu 3B'ye sadece `if(D3)D3.xxx()` çağrılarıyla bağlı.
- `rpg/tek-dosya.py EfsaneAvcisi.html` ← fontları ve 3B betikleri gömüp tarayıcıda açılan tek dosyalık hali üretir (APK'ya alternatif olarak kullanıcıya verilir).
- `rpg/src/main/java/com/bilal/efsaneavcisi/MainActivity.java` ← WebView kabuğu (dikey kilit, geri tuşu `window.__onBack()`, arka plan `window.__pause/__resume`, ekran çökerse `onRenderProcessGone` ile baştan kurar, yedek dosyası için dosya seçici). Köprü `window.AndroidBridge` (JS'te `BR`; tarayıcıda yok): `saveFile(ad, metin)` → İndirilenler'e yazar, yolu döndürür; `keepOn(bool)` → ekranı açık tutar/bırakır (JS `keepUpd()` karar verir); `pruneBackups(önek, kaç)` → uygulamanın yazdığı, adı önekle başlayan yedeklerden en yeni N tanesini bırakır.
- `rpg/keystore/oyun.keystore` ← oyunun imza anahtarı (depoda, SHA-256 `4b6cadc0…632a`). **Değiştirme**: değişirse güncelleme kurulmaz, oyun kaydı gider.
- v28'DEN İTİBAREN KULLANICIYA `./gradlew :rpg:assembleRelease` → `rpg/build/outputs/apk/release/rpg-release.apk` verilir (aynı imza, R8, hata ayıklama kapalı; `proguard-rules.pro` JS köprüsünü korur; lint kapalı çünkü ağdan indirilemiyor). Debug derlemesi testler için.
- Derleme: (yeni makinede SDK yoksa: commandlinetools'u dl.google.com'dan indir, `sdkmanager "platforms;android-35" "build-tools;35.0.0"`, kökte `local.properties` → `sdk.dir=...`) `./gradlew :rpg:assembleDebug` → `rpg/build/outputs/apk/debug/rpg-debug.apk` → kullanıcıya `EfsaneAvcisi-vN.apk` adıyla ver. Her sürümde `rpg/build.gradle` içinde `versionCode` +1 (şu an 32 / "32.0"; oyundaki `VER` sabitini de aynı yap).
- Dil: `lang-en.js` (`window.EN_DICT`, ~1.000 çeviri) + index.html'deki küçük `EN`. `LANG` betiğin en başında kayıttan okunur (veri tabloları tanımlanırken çevrilsin diye); dil değişince kayıt + sayfa yeniden yüklenir. Kimlik olarak kullanılan adlar (canavar adları: `S.bst` anahtarı ve 3B model eşleşmesi; eşya adı parçaları `PRE`/`names`; `'Elit '`) koddaki Türkçe hâliyle kalır, ekranda `tn()` (canavar/rakip), `itN()`/`iName()` (eşya), `kn()` ("Floor 5") ile çevrilir. İngilizcede `%25` → `25%` dönüşümünü bir MutationObserver yapar (`pctFix`); sayılar `NLOC()`/`fmt` ile K/M/B.
- **TEST (kullanıcı "testler çok uzun ve çok token harcıyor" dedi):** her değişiklikten sonra `tests/rpg-hepsi.sh` (üç testi paralel, HIZLI modda: 3B ve ekran görüntüsü yok, ~2 dk; sadece 3 satır özet basar — günlükleri ancak hata varsa oku). 3B/görsel değişiklikte `TAM=1 tests/rpg-hepsi.sh` (~8 dk) ve ekran görüntülerine bak. Denge simülasyonunu sadece denge değişince çalıştır.
- Test ayrıntısı: `cd tests && node rpg-e2e.mjs ../rpg/src/main/assets/index.html <çıktı klasörü>` → `errors []` görmelisin, ekran görüntülerine bak. Test v1 kaydından geçişi de dener. Yeni oyuncu akışı (açılış, sekme kilitleri, rehber): `node rpg-ilk-dakika.mjs ../rpg/src/main/assets/index.html <çıktı klasörü>`. Ana testte `window.__allTabs=1` ve başta `S.set.fx=2` (test makinesi zayıf telefon sayılıyor).
- Kayıt: localStorage `efsane-avcisi-v1` (nesne `S`, `S.v`=2). Alan eklerken `fresh()` içine varsayılan koy; `applySave` eski kayıtları birleştirir. **Geriye uyumluluğu koru** (kullanıcının telefonunda gerçek kayıt var).

## Oyun içeriği (v2)
- Savaş: dokun/VUR + kombo (+%50'ye kadar), 3 sınıf (Savaşçı/Okçu/Büyücü; `CLS`) × 4 yetenek (Sv 1/5/12/20 açılır, altınla Sv20'ye kadar), iksir, elit canavar (%7), boss her 10. kat, 6 bölge × 30 kat (son bölge sonsuz).
- Eşya: 6 yuva, 4 nadirlik, rastgele stat; Demirci +15'e kadar (`upCost`, `upRate`; başarısızlıkta sadece malzeme gider), Erit → 💠 Öz, kilit 🔒, toplu sat/erit, yuva filtresi.
- Yoldaşlar (`PETS`): 1,5 sn'de bir saldırır + pasif bonus; Kurt Sv3 hediye, diğerleri 💎; altınla beslenir (Sv30).
- Günlük giriş ödülü (7 gün döngü), 3 günlük görev + hepsi bonusu, başarımlar (💎 verir). Para birimleri: 💰 altın, 💎 elmas, 💠 öz.
- Sen yokken kazanç: en fazla 8 saat, yoldaş varsa daha çok; 💎15 ile 2 katı.
- Görsel: bölgeye göre gökyüzü/zemin/parçacık, kesik/kıvılcım/patlama efekti, uçan altın, hayalet can barı, boss/seviye/bölge afişi, konfeti, düşük can kırmızı kenar, nadirlik parıltıları.

## Oyun içeriği (v3 ekleri)
- Eşya setleri (`SETS`, 5 set, 2/4/6 parça bonusu; Epik %35, Efsanevi %60 ihtimalle sete ait; 💎60 Set Sandığı).
- Zamanlı boss (`BOSS_T` 30 sn; süre dolarsa bir kat geri) ve günlük 3 haklı Boss Arenası (Kadim Ejder, 30 sn, `ARENA_T` 6 kademe ödül).
- Yeniden doğuş (`S.reb`): Mağara 20. kat (gBest≥50) sonrası açılır; 🔮 Ruh Taşı = (gBest/10)^1.5; Ruh Ağacı (`SOUL`) kalıcı bonuslar; kilitli en iyi 6 eşya korunur.

## Profesyonelleştirme yol haritası (kullanıcı v12'de istedi)
Kararlar: **Google Play**'de yayın, **Türkçe + İngilizce**, **para kazanma yok** (reklamsız, satın almasız).
1. ✅ Temel (v12): dil sistemi, açılış ekranı, Hakkında/lisanslar, gizlilik politikası + mağaza metinleri (`rpg/magaza/`).
2. Cila: ✅ (v13) rehber, sekme kilitleri, rozet sadeleştirme, düğme sesi, zayıf telefon algılama. KALAN: ses cilası. (Denge v15'te, pencere kapanış animasyonu v18'de yapıldı.)
3. ✅ (v14) Tam İngilizce. YENİ METİN EKLERKEN: ekranda görünen her Türkçe dizeyi `T('...')` ile sar ve İngilizcesini `lang-en.js`'e (anahtar = Türkçe metnin kendisi) ekle; araya sayı/isim girecekse `T('… {0} …',x)` kullan. Kontrol: `tests/rpg-ingilizce.mjs`.
- Kullanıcı v14 sonrası "şimdilik Play'e yüklemeyeceğim, oyunu geliştirmeye odaklan" dedi → 4. aşama (yayın) bekliyor.
4. Yayın: imza kararı (mevcut `oyun.keystore` depoda duruyor; depo herkese açıksa Play için YENİ yükleme anahtarı şart → kullanıcının telefonundaki sürüm Play'den güncellenemez, kayıt yedek dosyasıyla taşınır), AAB + R8 küçültme, mağaza görselleri (512 simge, 1024×500 öne çıkan görsel, TR/EN ekran görüntüleri), gizlilik sayfasının herkese açık adresi (ör. GitHub Pages), iletişim e-postası (kullanıcı verecek; e-postasını kendiliğinden yazma).

## Denge (v15) — değiştirirsen simülasyonla ölç
`tests/rpg-denge-sim.mjs` oyunu hızlandırılmış saatle sanal oyuncuyla oynatır (3B ve görsel efektler kapalı; 20 simüle dk ≈ 10 gerçek dk). v15 hedefi ve ölçülen: 1. bölge ~13 dk, rebirth eşiği (en iyi kat 50) ~22 dk, ölüm/boss başarısızlığı boss katlarında yığılır (20. ve 30. kat), 30 dk'da 3. bölge. ÖNCEKİ hâl: 20 dk'da 4 bölge, sıfır ölüm (oyuncu sıkılıyordu). Ders: canavar 1,8 sn'de bir vurur; canavar bundan hızlı ölürse saldırı formülü önemsizleşir — zorluğu can/hasar oranı belirler. Formüller: `mHp=(20+13g+g^1.85)*(1+.02*max(0,g-10))`, `mAtk=(4+1.25g+.026g²)*1.35`, savunma `dmgRed(lv)=k/(k+def)`, `k=60+6*lv`, boss canı ×(12+4*min(3,kat/10)) (v20), boss vuruşu ×1.45, `KPF`=8 (v20), normal canavar XP ×0,8 (v20), `xpNeed=24+14n+4.6n²`, ileri bölge normal canavar canı ×`nHp(g)=1+max(0,g-120)*.02` (v20). v20 dalgalı ölçüm (Altın Ay haftası): 1. bölge ~13 dk, 30. kat boss'unda 6 başarısız deneme, en iyi kat 50'ye 20. dk'da. v22 (element + ağır darbe; element statı `3+.04L`, ağır darbe ×2, G≥30'da ×2,4): 1. bölge ~10 dk, en iyi kat 50'ye 18. dk, 22. dk'da 3. bölge.

## Sürüm geçmişi (kısa — AYRINTI: `rpg/GECMIS.md`, bir sistemi değiştirmeden önce oradan ilgili sürümü oku)
- v1–v8: temel oyun, sınıflar, eşya/demirci, yoldaş, 3B (Three.js), set, boss/arena, doğuş, oto saldırı, müzik, 8 bölge, kostüm, Macera sekmesi (zindan/düello), rün, hikâye, vuruş hissi, ustalık, kule.
- v9–v10: tarama düzeltmeleri, yedek dosyası/oto yedek, efekt/ses ayarları, menüde savaş, oto iksir.
- v11: çanta (oto temizlik/büyütme), Kader Yolu, canavar türleri, efsanevi güçler, zayıf nokta, yol olayları, defter, bölge görevi.
- v12–v14: profesyonelleştirme: açılış ekranı, dil sistemi `T()`, rehber/sekme kilitleri, tam İngilizce (`lang-en.js`).
- v15: denge baştan (simülasyon), boss aşamaları. v16: canavar kartı/istatistik/bölge bilgisi. v17: rehber baloncuğu hatası, hızlı test. v18: haftalık etkinlik, unvanlar.
- v19: Batık Şehir (indeks 7; kayıt geçişi `S.zv`), Suikastçı, efsanevi güç görselleri, ortam sesleri.
- v20: ekran taşması (WebView FrameLayout içinde), DALGA SAVAŞI (`W`, `mkMon`, `waveNext`, `hitW`, `waveHit`, `S3D.wave*`), denge yeniden.
- v32: EZELİ DÜŞMAN (`S.nem`, `nemBorn/nemRoll/nemMon/nemWin/nemLose/nemFlee`, Macera `nemCard`), SEZON tablosu (`S.sez`, `sezAdd/sezCheck/sezCard`, 14 gün, gölge rakipler), yeni canavar türleri zehirci/yansıtıcı/çağırıcı (`TRX`, `trTick`), ULTİ dalı (`TAL` k:ult), kaçış serisi (`dgStreak`). Ayrıntı GECMIS.md.
- v25: v22-emojisiz dalı ile v22–v24 (ULTİ/kaçınma) dalı BİRLEŞTİRİLDİ (iki ayrı oturum paralel çalışmıştı; telefondaki sürüm v24'tü, v22 APK "paket geçersiz" verdi = düşük versionCode). Sınıf dalları: hepsi `TAL` içinde `cls` alanıyla (Suikastçı 'Gölge' onların, war/arc/mag benim), `talCls` puan iadesi.
- v22b (emojisiz): BÜYÜK YENİLENME (ayrıntı GECMIS.md): SVG ikonlar + koyu-altın tema (CSS sonunda "v22 TEMA"), element sistemi (`ELM`, `ZW`, `elSet/elemDmg/elProc/elTick`), normal canavarlarda ağır darbe (`M.hv`), sınıfa özel 4. yetenek dalı (`CTAL`, `TAL[3]` getter), yeni statlar fire/ice/poi/lit/spd, tuzak/hazine odası olayı, çanta sıralama (`INVS`, `S.set.invS`).
- v24: ULTİ (`ULT`, `R.ult` 0–100, `ultAdd`, `useUlt`, `#ultBtn`, 3B `S3D.ult(cls,cb)`; Sv8'de açılır, oto yetenek zor anda kullanır) ve KAÇINMA (`chOk`, `chargeStart/chargeEnd`, `M.ch`/`M.chOn`, `dodgeSwipe`; normal canavar %16 güçlü saldırı ×1,5, kaydırma ile kaç, son 480 ms = MÜKEMMEL; 3B `S3D.charge`, `S3D.roll`; sahne `touch-action:none`, kaydırma `pointermove` ile).
- v23: toplu sandık (`chestN`, `chestBulk`, en fazla 10, tek özet), sarsıntı azaltıldı + Ayarlar "Ekran sarsıntısı" (`S.set.shake`, `D3.setShake`, 3B kamera titremesi sinüs).
- v22: Batık Mabet zindanı (`DUNG.deep`, kilit `dungOk`, sandık `M.chest`), yoldaş 3B evrimi (`petEvo`), Suikastçı Gölge dalı (`TAL` cls:'asn', `talCls`, `vanReady`), CANLI SAVAŞ 3B (`liveTick`, `LV`, `lvNudge`, `streak`, `launch`, `dust`; HP/MP/PP her karede hareket eder).
- v21: yeni müzik motoru (`MZ`, `musStep`, `note`, `drum`; ses kartı saatine göre), sınıf vuruş sesleri (`clsHit`), `sfx('coin'|'bossIn')`, `fanfare('level')`, arayüz tema katmanı (CSS sonunda "v21 TEMA"), 3B görsel yenileme (yuvarlak ayrıntılı modeller, ACES ışık, parıltı havuzu `FX.pop`).

## TOKEN TASARRUFU (kullanıcı uyardı: konuşma çok uzayınca kullanım hızlı doluyor)
- Uzun işten sonra kullanıcıya yeni oturum açmasını öner; bu dosya devir için yeterli olmalı.
- Ekran görüntüsünü sadece görsel değişiklikte oku, birleşik ve küçük (deviceScaleFactor 1) al. Komut çıktılarını kısa tut (grep/cut). Testte `tests/rpg-hepsi.sh` (3 satır özet).
- Ajanlara tam dosya yolu ve net kabul ölçütü ver; raporlarını kısa iste.

## Sıradaki fikirler (öneri olarak sun)
- (Yapıldı: haftalık etkinlik v18, ustalık v8, yoldaş yetenekleri v8, bölge görev zinciri v11, sonsuz kule v8, zar atma v8.) Yeni fikirler (v32 sonrası): ezeli düşmana 3B taç/yara izi görseli, ezeli düşmanlar arası hiyerarşi (Derebeyi altına adam toplar), sezon kozmetik ödülleri, gerçek çevrimiçi tablo (sunucu gerekir)ları.

# Üçüncü proje: Efsane Yolu (yandan görünümlü oyun) — kullanıcı v32 sonrası istedi
Kullanıcı "karakter sağa koşar, zıplar, düşmanla karşılaşır" türü istedi; karar: Efsane Avcısı'na DOKUNMADAN **ayrı uygulama**, önce küçük deneme sürümü, telefondaki hissine göre büyüt.
- Modül `yan/` (paket `com.bilal.efsaneyolu`, telefonda ayrı simge "Efsane Yolu"), **yatay ekran** (`sensorLandscape`).
- `yan/src/main/assets/index.html` ← tüm oyun: Canvas 2D, sabit adımlı (60/sn) fizik, tek dosya. Fontlar `fonts/` (rpg'den kopya).
- İmza: `yan/keystore/yol.keystore` (SHA-256 `19d3e3c4…af46`) **değiştirme**.
- Derleme: `./gradlew :yan:assembleDebug` → `yan/build/outputs/apk/debug/yan-debug.apk` → kullanıcıya `EfsaneYolu-vN.apk`. Her sürümde `yan/build.gradle` versionCode +1 ve oyundaki `VER`. (Şu an 5 / "5.0".) SDK yoksa /opt/android-sdk'ye kur, `local.properties` içine `sdk.dir`.
- Test: `cd tests && node yan-e2e.mjs ../yan/src/main/assets/index.html /tmp/yan-test` (~40 sn; bot koşar, boss'a ışınlar, bitirir, ölüm/menü/İngilizce dener) → `errors []`.
- Kayıt: localStorage `efsane-yolu-v1` (`SV`, alan eklerken `fresh()`'e varsayılan koy). v2'den beri bölüm başına ilerleme `SV.lvs[i]` (`lvF()`: cp/done/best/chest/coin/star/dth/rt), etkin bölüm `CH`, kısayol `LV`; v1'in `SV.lv`'si `lvs[0]`'a taşınır (test eder). Dil: `T()` + dosya içindeki `EN` sözlüğü; yeni metni `T('...')` ile sar, EN'e ekle.
- Kod haritası: harita `buildLevel()` (karo 0 boş/1 toprak/2 tek yönlü platform/3 diken/4 kapı; `fill/plat/spike/coins/en/sign` yardımcıları, `L.cps` kontrol noktası, `L.movers` hareketli kütük, `L.chests`, `L.arena`), oyuncu `stepPlayer` (koyote süresi, zıplama tamponu, değişken zıplama, kaçış `dashT` dokunulmazlık, 3'lü kombo `ATKD`, `swingHit`), düşmanlar `mkEnemy/stepEnemies` (slime/bat/archer), boss `bossStart/stepBoss` (Kök Devi: walk/slam şok dalgası/roots kök/seeds tohum, %50'de 2. aşama), mermiler `PRJ`, toplanabilir `PICK`, eşya `mkItem/gainItem/stats` (3 yuva w/a/c, 4 nadirlik, Demirci `upCost`), arayüz `SCR`/`ACT`, dokunmatik `TP/pickAct` (sol %42 hareket, sağ en yakın düğme, parmak düğmeler arasında kayabilir), test kancası `window.__T`.
- v2 ekleri: bölümler `BUILD=[lvl1,lvl2]` + `loadChapter(n)` (tema `THM[n]`: gökyüzü/arka plan katmanları/karo renkleri; mağara `cave:1`, tavan `ceil()`), bölüm seçimi `SCR.chap`, 3 yıldız (bitir / `L.par` altında / ölmeden; `LV.star` bit maskesi), çift zıplama (`P.jumps`), enerji `P.en` + ÖZEL düğmesi `#bs` → Kılıç Dalgası (mermi `pw`), kırılabilir kasa (`L.crates`, `breakCrate`), mağara düşmanları spider (tavandan iner) ve beetle (önden zırhlı, hücum edip duvara çarpınca sersemler), boss `aiGolem` (yürü / kristal yağmuru `shard` / hücum→duvara çarpıp sersemleme / `gem` saçma), 2. bölüm zorluğu ×1,7.
- v3 ekleri: HİKÂYE `STORY` (anahtar `i0..i2` bölüm girişi, `o0..o2` bitiş; sahne = tema `th`, dekor `bg` village/dark/castle/dawn/none, oyuncular `a:[tür, ekran x oranı, yön, ek]`; `playStory/storyTap/storyEnd/drawStory/drawActor`, görüldü `SV.seen`), hikâye sayfaları `PAGES` + `L.pages` → `SV.pages`, `SCR.jour` Günlük (sayfalar + sahneleri yeniden izle). NPC `npc()` sage/merch/vill (`drawNPC`, `PORT` portre SVG, `#talk` düğmesi/E tuşu, `SCR.talk`, tüccar `SHOP()`, köylü ödülü bir kez `SV.fl`). 3. bölüm `lvl3` Lav Kalesi (`lava()` karo 5, çöken platform `crumb()` karo 6 + `crumble/stepCrumble`, ateş deliği `jet()`), düşmanlar imp (ateş topu `fb`), knight (önden blok, savurunca açık), mimic (sandık kılığı); boss `aiKara`/`drawKara` (dash/leap ateş dalgası/pillars ateş sütunu `root`+`fire`/volley). Ekstra `lvlR` Boss Arenası (bölüm indeksi 3, `L.rush` sırayla, `G.next` sonraki boss), boss tablosu `BK`. HATA DÜZELTMESİ: `spawnAll` kontrol noktasının gerisindeki düşmanları doğurmaz. `NCH=3` ana bölüm.
- v4 ekleri: BÖLÜM İNDEKSLERİ: 0–2 elle çizilmiş (lvl1-3), 3 = Boss Arenası (`lvlR`), 4–10 = ÜRETİLEN bölümler (`GCH[i]` ayarları + `genL(ci,cfg,seed)`; sabit tohum → harita hep aynı, sandık/altın kimlikleri kaymaz), 11 = Sonsuz Yol (`genEndless`, `SV.endl` floor/best/seed; kazanınca kat +1). Ana sıra `ORD=[0,1,2,4..10]`, bölüm→boss `CHB`, zorluk `tier()`/`TIERM`, düşman hasarı `dmgM()` (canından yavaş artar). Üretici parçaları (seg): flat/pit/liq/steps/tower/spikes/mover/crumbs/jets/wind/spring/icis. Yeni karolar: 7 = yay mantarı (katı, zıplatır). Yeni tehlikeler: rüzgâr `L.winds`, sarkıt `L.icis`/`stepIcis`, buz kayganlığı `L.ice`, karanlık `L.dark` (oyuncu çevresi görünür), tema sıvısı `TH.liq`. Yeni düşmanlar wolf/frog/mummy/harpy/spore/shade (`FLY` uçanlar). Yeni bosslar `BK` içinde `atk` listesiyle genel yapay zekâ `aiGen` (walk/slam/rain/burst/pillars/volley/dash/leap/swoop/blink/summon), çizimler `BDR` + `drawGB`. Temalar `THM[4..10]` (`mus` müzik modu, arka plan türleri 6 kumul/7 harabe/8 bulut/9 mantar/10 kuru ağaç). Hikâye `i4..i10`/`o4..o10` (Gölge Kral), sayfalar 6–19 (`pgCh`). DİKKAT: `PAGES` sırasına sadece SONA ekle (kayıtlı sayfa numaraları).
- v5 ekleri (BÜYÜK ÇANTA GÜNCELLEMESİ): 6 yuva `SL` w/h/a/b/r/c (Silah/Kask/Zırh/Çizme/Yüzük/Tılsım), 5. nadirlik Mitik (`RC[4]`), ek özellikler `it.ax` (`AFX`: atk/hp/crit/cd/def/spd/ls/en/gold/boss; `rollAx`), efsanevi güçler `it.pw` (`PWR`: burn/nova/dashd/vamp/twin/thunder/shield/magnet/jump3/phoenix; oyunda `PW(k)`), boss ganimetleri `TRO` (her boss'a özel Mitik; ilk yenişte kesin, sonra %12; `SV.tro`, `mkTrophy`), kilit `it.lk`, yeni işareti `it.nw`, öz `SV.oz` (parçala `ozOf`, Demirci +5 üstü öz ister + şans `upRate`, en fazla +15 `MAXU`, yeniden dövme `rfOz`), çanta kapasitesi `bagCap()` 30+6·`SV.bagX`. KARAKTER SEVİYESİ `SV.plv/xp` (`xpNeed`, `gainXP`; eski kayıtta `SV.kills*6`'dan hesaplanır), BECERİLER `SKL`/`SV.sk` (seviye başına 1 puan, `spFree`). YOLDAŞLAR `PETS` peri/baykus/ejder/golgek (`SV.pets` seviye, `SV.pet` seçili; boss yenince açılır `from`; `stepPet/drawPet/dps`, mermi `pp`). Yanma `burnE/stepBurn`. DUVAR KAYMASI/ZIPLAMASI (`wallP`, `P.wcoy/wd/wjT`). Çanta arayüzü `bagH` (sol `bagLeft`: seviye+karakter+statlar; sağ sekmeler `BT` inv/skl/pet, ayrıntı `DET`/`detH`, filtre `BF`, sıralama `BSORT`, toplu `BULK` iki dokunuşla), yeniden çizim `reBag()` (kaydırmayı korur), eylemler `ACT5` (`Object.assign(ACT,ACT5)`). Test: `node yan-canta.mjs ../yan/src/main/assets/index.html <klasör>` (~30 sn).
- Tekrar oynama: her bitiriş `SV.lv.done`++ → düşmanlar ×(1+0,3·done), ganimet daha iyi.
- v1 (deneme): 1 bölüm (Zümrüt Orman, ~196 karo, 3 kontrol noktası, 2 sandık), 3 düşman, 1 boss, eşya/çanta/demirci, WebAudio efekt + basit müzik, TR/EN.
- Sıradaki fikirler (kullanıcı "sormadan ekle, bir dünya bölüm ekle" dedi): yeni bölüm eklemek kolay: `CHN`'e ad, `GCH`'e ayar, `THM`'ye tema, `BK`/`BDR`'ye boss, `ORD`/`CHB`'ye ekle, `SV.lvs` uzunluğunu artır. Diğer (v5 sonrası): sınıflar (Okçu/Büyücü), harita seçimi ekranı, eşya setleri, yoldaş evrimi/yetenekleri, günlük görevler, kostümler.

## (ESKİ NOT) Yandan görünüm planı
Kullanıcı "yandan görünümlü (karakter sağa koşar, zıplar, düşmanla karşılaşır) farklı bir oyuna çevirelim" dedi; ona bunun büyük iş olduğu, savaş/kontrolün baştan yazılacağı, mevcut dokun-vur/dalga/oto saldırı/sen yokken kazanç sisteminin bu türe uymadığı söylendi, kabul etti.
- ÖNERİLEN YOL (ilk iş kullanıcıya bunu kısaca teyit ettir): mevcut oyunu ve telefondaki kaydı BOZMA. Yan görünüm oyunu aynı depoda AYRI bir modül olarak başla (ör. `yan/`, ayrı paket adı → telefonda ayrı uygulama), ya da Efsane Avcısı içinde ayrı bir "mod" olarak. Taşınabilecekler: eşya/nadirlik/set, yoldaş, ezeli düşman fikri, sınıflar, simge sistemi (`simgeler.js`, `ikonlar.js`), dil sistemi `T()`, tema.
- Teknik öneri: tek `index.html` + Canvas 2D (ya da mevcut Three.js ile 2.5B yan kamera), sabit adımlı fizik (yerçekimi, zıplama, çarpışma), dokunmatik kontroller (sol: hareket, sağ: zıpla/vur/kaçış), bölüm bazlı haritalar (oda + kontrol noktası), boss odaları. Önce küçük oynanabilir bir dikey dilim (1 bölüm, 3 düşman türü, 1 boss) yap, APK ver, kullanıcının telefondaki hissine göre büyüt.
- DİKKAT: GitHub'daki varsayılan dal `claude/android-sdk-apk-setup-eckfhk` ESKİ (v21). Efsane Avcısı v32 + Efsane Yolu v5: `ccr-00052f72-yd5ln4` dalında (en güncel). Yeni oturum bu daldan devam etmeli.
