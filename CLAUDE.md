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

- `rpg/src/main/assets/index.html` ← oyun mantığı + arayüz (vanilla JS + CSS). Font: `assets/fonts/` (Plus Jakarta Sans).
- `rpg/src/main/assets/sahne3d.js` ← 3B savaş sahnesi (`window.S3D`): tüm modeller koddan low-poly (HERO/PETM/MON listeleri, canavar adıyla eşleşir; listede olmayan ad emoji sprite'a düşer), 6 bölge ortamı (ZD), parçacıklar, efektler. `lib/three.min.js` = Three.js r149 (UMD, MIT).
- WebGL yoksa ya da Ayarlar → "2B grafik" seçiliyse (`S.set.d3=false`) eski emoji sahnesi kullanılır; `D3` null olur. Oyun kodu 3B'ye sadece `if(D3)D3.xxx()` çağrılarıyla bağlı.
- `rpg/tek-dosya.py EfsaneAvcisi.html` ← fontları ve 3B betikleri gömüp tarayıcıda açılan tek dosyalık hali üretir (APK'ya alternatif olarak kullanıcıya verilir).
- `rpg/src/main/java/com/bilal/efsaneavcisi/MainActivity.java` ← WebView kabuğu (dikey kilit, geri tuşu `window.__onBack()`, arka plan `window.__pause/__resume`, ekran çökerse `onRenderProcessGone` ile baştan kurar, yedek dosyası için dosya seçici). Köprü `window.AndroidBridge` (JS'te `BR`; tarayıcıda yok): `saveFile(ad, metin)` → İndirilenler'e yazar, yolu döndürür; `keepOn(bool)` → ekranı açık tutar/bırakır (JS `keepUpd()` karar verir); `pruneBackups(önek, kaç)` → uygulamanın yazdığı, adı önekle başlayan yedeklerden en yeni N tanesini bırakır.
- `rpg/keystore/oyun.keystore` ← oyunun imza anahtarı (depoda, SHA-256 `4b6cadc0…632a`). **Değiştirme**: değişirse güncelleme kurulmaz, oyun kaydı gider.
- Derleme: `./gradlew :rpg:assembleDebug` → `rpg/build/outputs/apk/debug/rpg-debug.apk` → kullanıcıya `EfsaneAvcisi-vN.apk` adıyla ver. Her sürümde `rpg/build.gradle` içinde `versionCode` +1 (şu an 21 / "21.0"; oyundaki `VER` sabitini de aynı yap).
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
`tests/rpg-denge-sim.mjs` oyunu hızlandırılmış saatle sanal oyuncuyla oynatır (3B ve görsel efektler kapalı; 20 simüle dk ≈ 10 gerçek dk). v15 hedefi ve ölçülen: 1. bölge ~13 dk, rebirth eşiği (en iyi kat 50) ~22 dk, ölüm/boss başarısızlığı boss katlarında yığılır (20. ve 30. kat), 30 dk'da 3. bölge. ÖNCEKİ hâl: 20 dk'da 4 bölge, sıfır ölüm (oyuncu sıkılıyordu). Ders: canavar 1,8 sn'de bir vurur; canavar bundan hızlı ölürse saldırı formülü önemsizleşir — zorluğu can/hasar oranı belirler. Formüller: `mHp=(20+13g+g^1.85)*(1+.02*max(0,g-10))`, `mAtk=(4+1.25g+.026g²)*1.35`, savunma `dmgRed(lv)=k/(k+def)`, `k=60+6*lv`, boss canı ×(12+4*min(3,kat/10)) (v20), boss vuruşu ×1.45, `KPF`=8 (v20), normal canavar XP ×0,8 (v20), `xpNeed=24+14n+4.6n²`, ileri bölge normal canavar canı ×`nHp(g)=1+max(0,g-120)*.02` (v20). v20 dalgalı ölçüm (Altın Ay haftası): 1. bölge ~13 dk, 30. kat boss'unda 6 başarısız deneme, en iyi kat 50'ye 20. dk'da.

## Sürüm geçmişi (kısa — AYRINTI: `rpg/GECMIS.md`, bir sistemi değiştirmeden önce oradan ilgili sürümü oku)
- v1–v8: temel oyun, sınıflar, eşya/demirci, yoldaş, 3B (Three.js), set, boss/arena, doğuş, oto saldırı, müzik, 8 bölge, kostüm, Macera sekmesi (zindan/düello), rün, hikâye, vuruş hissi, ustalık, kule.
- v9–v10: tarama düzeltmeleri, yedek dosyası/oto yedek, efekt/ses ayarları, menüde savaş, oto iksir.
- v11: çanta (oto temizlik/büyütme), Kader Yolu, canavar türleri, efsanevi güçler, zayıf nokta, yol olayları, defter, bölge görevi.
- v12–v14: profesyonelleştirme: açılış ekranı, dil sistemi `T()`, rehber/sekme kilitleri, tam İngilizce (`lang-en.js`).
- v15: denge baştan (simülasyon), boss aşamaları. v16: canavar kartı/istatistik/bölge bilgisi. v17: rehber baloncuğu hatası, hızlı test. v18: haftalık etkinlik, unvanlar.
- v19: Batık Şehir (indeks 7; kayıt geçişi `S.zv`), Suikastçı, efsanevi güç görselleri, ortam sesleri.
- v20: ekran taşması (WebView FrameLayout içinde), DALGA SAVAŞI (`W`, `mkMon`, `waveNext`, `hitW`, `waveHit`, `S3D.wave*`), denge yeniden.
- v21: yeni müzik motoru (`MZ`, `musStep`, `note`, `drum`; ses kartı saatine göre), sınıf vuruş sesleri (`clsHit`), `sfx('coin'|'bossIn')`, `fanfare('level')`, arayüz tema katmanı (CSS sonunda "v21 TEMA"), 3B görsel yenileme (yuvarlak ayrıntılı modeller, ACES ışık, parıltı havuzu `FX.pop`).

# Üçüncü proje: Gece Kaçağı (hikâyeli yarış oyunu)

Aynı depoda, diğer ikisinden bağımsız Android uygulaması (`yaris/`, paket `com.bilal.gecekacagi`, **yatay ekran**). Kullanıcı "NFS Most Wanted'a benzeyen hikâyeli, çok çeşitli bir yarış oyunu" istedi; boyut/süre sınırı yok.
- **Kural:** tür ve mekanikler benzer olabilir ama başka oyunun adı, karakterleri, "Blacklist" gibi adları, gerçek araba markaları kullanılmaz. Her şey kurgusal (şehir Karaliman, "Gece Listesi", Kobra, abla Defne, Bora, Komiser Sert).
- AYRINTI: `yaris/NOTLAR.md` — bu oyunda çalışmadan önce oku (dosyalar, koordinatlar/fizik, polis, kayıt, testler, sürümler).
- Derleme `./gradlew :yaris:assembleDebug` → kullanıcıya `GeceKacagi-vN.apk`. versionCode her sürümde +1 (şu an 14) + `oyun.js` `VER`.
- İmza `yaris/keystore/kacak.keystore` (SHA-256 `d9b78046…e49dbb`) ASLA değişmez.
- Kayıt localStorage `gece-kacagi-v1`; geriye uyumluluk şart.
- Test: `cd tests && HIZLI=1 node yaris-e2e.mjs ../yaris/src/main/assets/index.html /tmp/yt` (`errors []`); denge: `node yaris-denge.mjs 0.9`.
- Bu oturumda Android SDK yoksa `~/android-sdk`'ya komut satırı araçlarıyla kur (bkz. NOTLAR).

## TOKEN TASARRUFU (kullanıcı uyardı: konuşma çok uzayınca kullanım hızlı doluyor)
- Uzun işten sonra kullanıcıya yeni oturum açmasını öner; bu dosya devir için yeterli olmalı.
- Ekran görüntüsünü sadece görsel değişiklikte oku, birleşik ve küçük (deviceScaleFactor 1) al. Komut çıktılarını kısa tut (grep/cut). Testte `tests/rpg-hepsi.sh` (3 satır özet).
- Ajanlara tam dosya yolu ve net kabul ölçütü ver; raporlarını kısa iste.

## Sıradaki fikirler (öneri olarak sun)
- (Yapıldı: haftalık etkinlik v18, ustalık v8, yoldaş yetenekleri v8, bölge görev zinciri v11, sonsuz kule v8, zar atma v8.) Yeni fikirler: sezonluk rekor tablosu, Suikastçı'ya özel ustalık dalı, Batık Şehir'e özel zindan, yoldaşlara 3B evrim görselleri.
