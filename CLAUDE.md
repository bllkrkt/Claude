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

## Mimari
```
app/src/main/assets/index.html   ← TÜM uygulama (tek dosya, vanilla JS + CSS, ~1100 satır)
app/src/main/assets/fonts/       ← Plus Jakarta Sans (latin + latin-ext, Türkçe karakterler için ikisi de lazım)
app/src/main/java/.../MainActivity.java     ← WebView kabuğu + JS köprüsü
app/src/main/java/.../ReminderReceiver.java ← günlük bildirim (AlarmManager, açılışta yeniden kurulur)
app/src/main/java/.../ProgressWidget.java   ← ana ekran widget'ı (res/layout/widget.xml, res/xml/widget_info.xml)
app/src/main/res/                ← adaptive ikon (gradyan), bildirim ikonu, splash teması
app/keystore/debug.keystore      ← İMZA ANAHTARI — silme/değiştirme (aşağıya bak)
tests/                           ← Playwright uçtan uca test + sahte veri üretici
```

### WebView
- Sayfa `WebViewAssetLoader` ile `https://appassets.androidplatform.net/assets/index.html` adresinden yüklenir (gerçek origin → localStorage kalıcı).
- Dış linkler `shouldOverrideUrlLoading` ile Intent'e gider. `instagram://user?username=X` açılamazsa `https://www.instagram.com/X/`'e düşer.
- Kenardan kenara (targetSdk 35): sistem çubuğu boşlukları WebView'a padding olarak verilir.

### JS köprüsü (`window.AndroidBridge`)
| Metot | Ne yapar |
|---|---|
| `saveFile(name, text)` → yol | Yedeği İndirilenler'e yazar (MediaStore) |
| `takeSharedFiles()` → JSON | "Paylaş / Birlikte aç" ile gelen ZIP/JSON'dan çıkarılan takip dosyaları |
| `setBars(hex, light)` | Durum/gezinme çubuğu rengi (tema) |
| `ensureNotifications()` → bool | Android 13+ bildirim izni ister |
| `setReminder(on,h,m,title,body)` | Günlük hatırlatıcıyı kurar/iptal eder |
| `shareText(title, text)` | Paylaş menüsü |
| `updateWidget(has, day, today, limit, left, pct)` | Widget verisini kaydeder ve yeniler (gün değişince widget bugünü 0 gösterir) |
| `pinWidget()` → bool | Ana ekrana widget ekleme penceresi (desteklemiyorsa false → JS elle ekleme talimatı gösterir) |
JS tarafı: `window.__onShared()` (yeni paylaşılan dosya), `window.__onBack()` (geri tuşu; true dönerse Activity kapanmaz).
Tarayıcıda (köprü yokken) her şey çalışır; sadece Android'e özel özellikler gizlenir.

### Veri modeli (localStorage anahtarı `takip-temizleme-v2`)
- `people[u] = {u, at(sn, takip tarihi), followsMe: true|false|null, status: 'pending'|'keep'|'done'|'closed', doneAt, closedAt, again, lostAt, manualFollows, label?, note?}`
  - `label`: `arkadas|aile|unlu|marka|is` (LABELS), `note`: en fazla 140 karakter. İkisi de isteğe bağlı; yoksa alan hiç yazılmaz.
- `base = {following, followers, at}` — sayaç bu andan sonra bırakılan/kapalı işaretlenenleri düşer. `startFollowing` ilerleme yüzdesinin sabit başlangıcı.
- `log['YYYY-MM-DD']` günlük bırakılan sayısı; `history` son 300 işlem; `changes` takipçi değişimleri (kaybedilen/kazanılan); `followerSnap` son takipçi listesi; `fans`; `requests`; `badges`; `milestones`; `importInfo`; `dismissed` (kapatılan uyarılar); `settings`.
- Eski sürüm anahtarı `bilal-sade-final-v1` (Meta AI'ın yaptığı ilk araç) ilk açılışta taşınır (base 860/640, hedef 639).
- **Veri formatını değiştirirsen geriye uyumluluk koru**: kullanıcının telefonunda gerçek veri var.

### Instagram dosya formatı (parseEntries)
Kullanıcı adı sırasıyla: `string_list_data[0].value` → `title` → `href` (son parça, `_u/` temizlenir). 2024+ formatında following kayıtlarında `value` yok, ad `title`'da. `following.json` = `{relationships_following:[...]}`, `followers_1.json` = düz dizi (`followers_2.json`… olabilir). `pending_follow_requests.json` = gönderilmiş istekler. ZIP tarayıcıda `DecompressionStream('deflate-raw')` ile, tamamı belleğe alınmadan okunur (ZIP64 destekli: 65.535+ dosya / 4 GB+). "Paylaş" ile gelen ZIP Java tarafında arka plan thread'inde okunur. HTML biçimli ZIP'te açık hata mesajı verilir.

**Bilinen tuzak:** Veri indirmede varsayılan tarih aralığı "Son 1 yıl" → eski takipçiler dosyada yok → seni takip edenler "takip etmiyor" görünür. Uygulama bunu sezip uyarır; kullanıcıya "Tarih aralığı: Tüm zamanlar" seçmesini söyle.

## Ekranlar (4 sekme)
1. **Odak**: ilerleme halkası, kart destesi (sağa kaydır = bıraktım, sola = atla, yukarı = koru), "Hesap kapalı", "Beni takip ediyor", kuyruk filtresi (takip etmeyen / seni bırakan / hepsi), bekleme sayacı.
2. **Kişiler**: arama, filtre çipleri (takip etmeyen, seni bırakan, bekleyen, karşılıklı, korunan, bırakılan, kapalı, hâlâ takipte, hayranların, istekler, geçmiş), sıralama, basılı tut → toplu seçim, listeyi paylaş.
3. **Analiz**: 7/30 gün grafik, kartlar, takipçi değişimleri, dağılım, 12 rozet.
4. **Ayarlar**: veri yükleme, profil sayıları, hedef, günlük limit / bekleme / yeni takipleri atla / ani hız, hatırlatıcı, tema, yedek, gizlilik, tümünü sil.

## Derleme
Gereken: JDK 17+, Android SDK (platform 35, build-tools 35). `local.properties` içinde `sdk.dir=...`.
```bash
./gradlew assembleDebug
# çıktı: app/build/outputs/apk/debug/app-debug.apk → kullanıcıya TakipTemizleme-vN.apk adıyla ver
```
- Her sürümde `app/build.gradle` içindeki `versionCode`'u 1 artır, `versionName`'i güncelle (şu an 6 / "6.0").
- **İmza:** APK `app/keystore/debug.keystore` ile imzalanır (SHA-256 `50b4d264…6b86`). Kullanıcının telefonundaki sürüm bu anahtarla imzalı. Anahtar değişirse güncelleme kurulmaz ve kullanıcı uygulamayı silmek zorunda kalır → **tüm verisi gider**. Asla değiştirme.
- Emülatör yoksa APK'nın içinde sınıfların olduğunu doğrula (geçmişte Java dosyası yanlış klasöre yazıldığı için açılmayan bir APK gönderildi):
  `dexdump app/build/outputs/apk/debug/app-debug.apk | grep "Class descriptor" | grep bilal`

## Test
```bash
cd tests && python3 make-test-zips.py
npm i -D playwright && npx playwright install chromium
node e2e.mjs ../app/src/main/assets/index.html instagram-test.zip instagram-test-2.zip .
```
390×844 telefon boyutunda tanıtım → ZIP yükleme → kaydırma → toplu seçim → ikinci yükleme (30 takipten çıkan) → analiz → ayarlar → açık tema → geri tuşu → yenileme sonrası kalıcılık test edilir; ekran görüntüleri kaydedilir. `errors []` görmelisin. Değişiklikten sonra ekran görüntülerine bakarak görsel kontrol yap.

## Sürüm geçmişi
- **v1**: Meta AI aracının WebView'a sarılmış hali (bozuk: MainActivity yanlış klasördeydi).
- **v2**: Baştan yazım — odak modu, geri takip etmeyenler, ZIP, limit, geri al, istatistik.
- **v3**: Kapalı hesap durumu, "beni takip ediyor" düzeltmesi, eksik dosya uyarıları.
- **v4**: Profesyonel yeniden tasarım — kart destesi + kaydırma, tanıtım, tema, takipten çıkanlar, hayranlar, toplu seçim, rozet/konfeti, hatırlatıcı bildirim, paylaşım, geçmiş, yeni ikon.
- **v5**: Haftalık otomatik yedek (Android; açılışta son yedek 7 günden eskiyse İndirilenler'e yazar, Ayarlar → Yedek → "Otomatik yedek" ile kapatılabilir, `settings.autoBackup`, varsayılan açık). Kullanıcı v4'ü gerçek telefonda denedi.
- **v6**: Kişilere etiket (Arkadaş/Aile/Ünlü/Marka/İş) + not; kartta, listede ve aramada görünür, "Etiketli" filtresi. Ana ekran widget'ı. Yukarı kaydırma = Koru dokunmatikte düzeldi (`.pcard` `touch-action:none`). Paylaş ile gelen büyük ZIP arka planda okunuyor. ZIP64 desteği.

## Sıradaki fikirler (kullanıcı onaylamadı, öneri olarak sun)
- Widget gerçek telefonda görsel olarak kontrol edilmedi; kullanıcıdan geri bildirim al
- Release imzalı / küçültülmüş (R8) APK

---

# İkinci proje: Efsane Avcısı (RPG oyunu)

Aynı depoda, Takip Temizleme'den tamamen bağımsız ikinci bir Android uygulaması. Kullanıcı kod bilmiyor; telefonda oynanan Türkçe bir RPG istedi. v2'de "aklına gelen ne varsa sormadan ekle" dedi.

- `rpg/src/main/assets/index.html` ← oyun mantığı + arayüz (vanilla JS + CSS). Font: `assets/fonts/` (Plus Jakarta Sans).
- `rpg/src/main/assets/sahne3d.js` ← 3B savaş sahnesi (`window.S3D`): tüm modeller koddan low-poly (HERO/PETM/MON listeleri, canavar adıyla eşleşir; listede olmayan ad emoji sprite'a düşer), 6 bölge ortamı (ZD), parçacıklar, efektler. `lib/three.min.js` = Three.js r149 (UMD, MIT).
- WebGL yoksa ya da Ayarlar → "2B grafik" seçiliyse (`S.set.d3=false`) eski emoji sahnesi kullanılır; `D3` null olur. Oyun kodu 3B'ye sadece `if(D3)D3.xxx()` çağrılarıyla bağlı.
- `rpg/tek-dosya.py EfsaneAvcisi.html` ← fontları ve 3B betikleri gömüp tarayıcıda açılan tek dosyalık hali üretir (APK'ya alternatif olarak kullanıcıya verilir).
- `rpg/src/main/java/com/bilal/efsaneavcisi/MainActivity.java` ← WebView kabuğu (dikey kilit, geri tuşu `window.__onBack()`, arka plan `window.__pause/__resume`, ekran çökerse `onRenderProcessGone` ile baştan kurar, yedek dosyası için dosya seçici). Köprü `window.AndroidBridge` (JS'te `BR`; tarayıcıda yok): `saveFile(ad, metin)` → İndirilenler'e yazar, yolu döndürür; `keepOn(bool)` → ekranı açık tutar/bırakır (JS `keepUpd()` karar verir); `pruneBackups(önek, kaç)` → uygulamanın yazdığı, adı önekle başlayan yedeklerden en yeni N tanesini bırakır.
- `rpg/keystore/oyun.keystore` ← oyunun imza anahtarı (depoda, SHA-256 `4b6cadc0…632a`). **Değiştirme**: değişirse güncelleme kurulmaz, oyun kaydı gider.
- Derleme: `./gradlew :rpg:assembleDebug` → `rpg/build/outputs/apk/debug/rpg-debug.apk` → kullanıcıya `EfsaneAvcisi-vN.apk` adıyla ver. Her sürümde `rpg/build.gradle` içinde `versionCode` +1 (şu an 18 / "18.0"; oyundaki `VER` sabitini de aynı yap).
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
`tests/rpg-denge-sim.mjs` oyunu hızlandırılmış saatle sanal oyuncuyla oynatır (3B ve görsel efektler kapalı; 20 simüle dk ≈ 10 gerçek dk). v15 hedefi ve ölçülen: 1. bölge ~13 dk, rebirth eşiği (en iyi kat 50) ~22 dk, ölüm/boss başarısızlığı boss katlarında yığılır (20. ve 30. kat), 30 dk'da 3. bölge. ÖNCEKİ hâl: 20 dk'da 4 bölge, sıfır ölüm (oyuncu sıkılıyordu). Ders: canavar 1,8 sn'de bir vurur; canavar bundan hızlı ölürse saldırı formülü önemsizleşir — zorluğu can/hasar oranı belirler. Formüller: `mHp=(20+13g+g^1.85)*(1+.02*max(0,g-10))`, `mAtk=(4+1.25g+.026g²)*1.35`, savunma `dmgRed(lv)=k/(k+def)`, `k=60+6*lv`, boss canı ×(10+3*min(3,kat/10)), boss vuruşu ×1.45, `KPF`=6, `xpNeed=24+14n+4.6n²`.

## Sürüm geçmişi
- **v18**: Kullanıcı "tekrar tara, eksikleri hallet, takıl" dedi. 🎪 Haftalık etkinlik (`WEV` 4 etkinlik, `wkNo()` UTC hafta, `curEv/evIs`; Altın Ay altın +%50, Elit Avı elit 3× sık ve 3× jeton, Hazine Haftası düşme ×1,5, Boss Festivali boss canı -%20 ve 5 jeton; jeton `wevAdd` (normal ¼, elit 1, boss 3; çevrimdışı öldürme başına 0,08); 10 basamaklı ödül yolu `WTR`/`wtrGive`, `S.wev={wk,tok,cl}`; hafta dönünce `weekCheck` alınmamışları otomatik verir; Macera'da en üstte `wevCard`, Macera rozeti ödül hazırsa yanar). 🏷️ Unvanlar (`TTL` 15 unvan, `titleCheck` döngüde, `S.titles`, `S.title`; üst çubukta sınıf adının yanında, başlık ekranı kartında; Kahraman → Stat'ta seçim; sonuncusu etkinliği bitirince). Pencere kapanışı: `closeSheet` gölge kopyayı kaydırıp söndürür (`.sheetGhost`; mantık hemen kapanır, testleri etkilemez; `window.__noAnim` ile kapatılır).
- **v17**: HATA (kullanıcı bildirdi): rehber baloncuğu VUR'un üstünde takılı kalıyordu (v16'daki "istatistiklerine dokun" işareti ince stat çubuğunu gösteriyordu, baloncuğa dokunmak bir şey yapmıyordu). Artık baloncuk dokunulabilir (`coachTap`: kapanır + gösterdiği pencereyi açar, "dokun · tamam" yazar) ve hiçbir işaret 15 sn'den uzun kalmaz (`coachAt`). Testlere hızlı mod (`HIZLI=1`) ve `tests/rpg-hepsi.sh`.
- **v16**: Kullanıcı "oynanış güzel ama oyun içi detaylar yetersiz" dedi → bilgi katmanı. Canavar kartı (`monInfo`, canavar adına dokun `#mName[data-a=monInfo]`; can, vuruşu savunma dahil, saldırı aralığı, kaç vuruşta yener / kaç saniyede yenersin (`estDps`, `hitsPerSec`, `petDps`), kazanır/zorlu kararı, ekler `AFXD`, tür, boss: süre/özel saldırı `BSP`/aşama `BPH`/öfke, defter yıldızı). Ayrıntılı istatistik (`statInfo`, `#pSt` dokun; saldırı/dayanıklılık/ganimet, şu anki canavara karşı savunma yüzdesi, etkin güçler: efsanevi `P.e`, kader `FB`, setler, yoldaş, rünler; son olaylar). Olay günlüğü `S.elog` (son 25, `logEv`: boss, ölüm, kaçan boss, her 5 seviye, efsanevi, yeni bölge). Bölge bilgisi (`zoneInfo`, haritada ℹ️; hikâye `STORY`, canavarlar görülmemişse ???, boss'lar ve hamleleri, zorluk tahmini: 30 sn'de 30. kat boss'unu kesme oranı). Keşif için iki tek seferlik rehber (`S.tut.mon`, `S.tut.st`; eski oyuncularda da bir kez çıkar).
- **v15**: Denge baştan (simülasyonla 4 tur ayar; yukarıdaki bölüm). Bölge boss'larına aşamalar (`BPH`, `bossPhase`, `M.zb`, `M.phN`; %66 ve %33 canda; bölgeye göre kalkan / şifa ayini (`M.hlP`,`M.hlB`, boss'ta bir kez) / çılgınlık (`M.frz`) / dondurma (`R.frozen`, `#frz`, 6 dokunuşla kırılır, `unfreeze`)). HATA: ölüm penceresi "Devam et" dışında kapanınca oyun ölü durumda takılıyordu → döngüde 0,6 sn sonra kendiliğinden diriliş (`deadT`). Eski oyunculara `news15` (`S.nv`=15).
- **v14**: Profesyonelleştirme 3. aşama: tam İngilizce. Metinler araçla çıkarıldı (ekranda görünen ~940 dize), 4 ajana paralel çevirtildi (terim sözlüğüyle), koda `T()` olarak otomatik bağlandı; elle: şablon metinler, boşluklu tek kelimeler (" sn", " dk"…), sabit HTML (`data-t`), kat kalıpları (`kn`), rakip adları (İngilizce fantastik adlar). Ayarlardaki "çeviri sürüyor" notu kaldırıldı. Türkçe oyuncuda hiçbir şey değişmez (`T` Türkçede metni aynen döndürür). Yeni test `tests/rpg-ingilizce.mjs`.
- **v13**: Profesyonelleştirme 2. aşama (cila, kullanıcı "kafana göre takıl" dedi). Sekmeler seviyeyle açılır (`TABU`: Kahraman Sv2, Görev Sv3, Dükkan Sv4, Macera Sv6 ya da ilk boss; `tabOpen`, `tabCheck`; kilitli sekme soluk + 🔒, dokununca uyarı; açılınca bir kez duyuru `S.tu`, simge zıplar `.nw`; eski oyuncularda açılışta sessizce açılır). Rehber işaretleri (`coach/coachDone/tutTick`, `#coach`, `S.tut`: hit→skill→bag→equip→hero→stat; eski oyuncularda hepsi tamam sayılır). Rozet: Macera "!" günde bir kez (`S.advDay`), kilitli sekmede rozet yok. Düğme tık sesi (tıklama dağıtıcısında), altın/elmas artınca sayaç zıplar (`pillBump`). Zayıf telefon: yeni oyuncuda `detFx()` (bellek/çekirdek) ile efekt seviyesi; savaşta kare hızı izlenir (`fpsLoop`), iki kez 22 fps altı → bir kez "akıcılaştırayım mı?" (`S.perfAsk`, `ACT.perfLow`; `__noRnd` iken kapalı). Karşılama penceresi kısaldı ve iki dilli.
- **v12**: Profesyonelleştirme 1. aşama. Dil sistemi: `T(metin,...)` (anahtar Türkçe metnin kendisi, `{0}` yer tutucular; çevirisi yoksa Türkçe kalır), `EN` sözlüğü, `S.set.lang` (yeni oyuncuda telefon diline göre `detLang()`; eski kayıtlar da telefon diline göre alır), `applyLang()` sabit HTML'de `data-t` olanları çevirir. Açılış ekranı `#title` (`showTitle/renderTitle/titleGo`, `titleOn` iken `paused()` ve `busy()` doğru → sıradaki pencereler Oyna'ya basınca açılır; `body.ttl` iken pencereler başlığın üstünde çıkar; `window.__noTitle` ile kapatılır). Ayarlar iki dilli yeniden yazıldı + dil seçimi; `ACT.about` (gizlilik, yapım, lisanslar; `licShow` lisans dosyalarını okur: `lib/three-LICENSE.txt`, `fonts/OFL.txt`). `VER` sabiti. Mağaza: `rpg/magaza/gizlilik.html` (TR/EN), `rpg/magaza/magaza-metni.md`. Test: `locale: 'tr-TR'`, açılış ekranı yalnızca ilk yüklemede (`window.name`), sonra `__noTitle`.
- **v11**: Kullanıcı "çanta çok çabuk doluyor, oyun basit ve sıkıcı, görüntüyü iyileştir" dedi. ÇANTA: `invMax()` (50 + `S.invX`, altın/💎 ile +10, en fazla 150; `INV_MAX` sabiti sadece temizlik sınırı), oto temizlik (`S.set.autoJ` 0–3 nadirlik eşiği, `S.set.autoJM` sell/melt, `isJunk`; set parçası ve kuşanılandan güçlü olan girer; sadece düşen eşyada: `giveItem(it,true)`), dolu çantada Epik+ en zayıf kilitsiz eşyanın yerine geçer, seviyeyle çöp oranı azalır. OYNANIŞ: 🔮 Kader Yolu (`fateOn`, `FB` güçler, `FBL`, `fateOffer/fatePick/fateEnd`, `fatePend` çift seçimi önler, `S.fate.best`; Sv8'de açılır, `busyMode` içinde), canavar türleri (`TRT`: kalkanlı `M.sh`, sürü `M.pack`, şifacı `M.hlC/hlT`, bombacı `M.bomb`+zamanlayıcı; `addTrait`, ödül `M.rwM`), efsanevi özel güçleri (`LEGP`, `it.leg`; eski efsanevilere `cleanItem` id'den güç atar; etkiler `P.e` üzerinden `calc/attack/monsterHit/useSkill`), 🎯 zayıf nokta (`weakShow/weakHit/weakFollow`, `#weak`; 3B'de halkayı `S3D.weakSpot` çizer, HTML düğmesi görünmez dokunma alanı), ❗ yol olayları (`evShow/evOpen`, `#evBtn`: tüccar/lanetli sandık/çeşme/demirci), 📖 Canavar Defteri (`S.bst`, `BST_T`, `bstBonus` kalıcı saldırı+can), 📜 bölge görev zinciri (`ZQ`, `S.zq[bölge]={s,p}`, Görev sekmesinin başında). Rastgele türler/olaylar `TRAITS` ile kapatılabilir: testte `window.__noRnd=1` (addInitScript). 3B (ayrı ajan): katmanlı arka plan siluetleri, güneş/ay, bulutlar, zemin süsleri (InstancedMesh), bölgeye göre sis/ışık, kenar ışığı, canlı bekleme animasyonları, temas gölgeleri; yeni isteğe bağlı API'ler `shieldFx(on)`, `bolt()`, `weakSpot(on)`, `weakPos()`, `setAura(renk)`, `packCount(n)` (spawn sıfırlamaz, oyun her doğuşta çağırır). Eski oyunculara `news11` (`S.nv`=11). Not: kullanıcının 5 saatlik kullanım sınırı bu sürümde doldu; çok ajan + uzun test sınırı hızlı tüketiyor.
- **v10**: v9 sonrası ikinci tarama, 10 madde. Menüdeyken savaş pürüzleri: çanta eşya gelince 3 sn'de bir yenilenir (`menuDirty`), efsanevi kutlaması menüde açılmaz, savaşa dönünce gösterilir (`pendLeg`), sekme değişince boss uyarılı saldırısı iptal olur, menüde boss/seviye sessiz bildirim. Altta menü savaş özeti (`#bgInfo`, `bgSt`; testte sekme seçicisi `#tabs [data-v=...]` olmalı). 🧪 Oto iksir (`S.set.autoPot`, can <%30, varsayılan açık; testte kapalı başlanır). Ekran: `keepUpd()` — savaşta, ölü değilken ve (oto saldırı sürüyor ya da son 3 dk dokunulmuş) ise açık. Kayıt yazılamazsa bir kez uyarı (`saveWarn`). Otomatik yedekler `EfsaneAvcisi-oto-yedek-*` adıyla, son 3'ü kalır. Android: çökme toparlama sağlamlaştı (10 sn içinde ikinci çökmede kapanır), `onDestroy`. Eski oyunculara `news10` (`S.nv`=10). Kullanıcı hız için ajanlara bölmemi istedi: oyun tek dosya olduğundan sadece Android tarafı ayrı ajana verilebildi.
- **v9**: Sistem taraması sonrası 13 madde (kullanıcı "hepsini ekle" dedi). HATALAR: mod (kule/arena/zindan/düello) sırasında yedek yükleme/sıfırlama modu temizler (`clearModes`); baykuş etkisi süreyi kısaltmaz; yedek/kayıt doğrulaması (`sanitize`, `cleanItem`; `restoreCode` bozuk kodda eski kayda döner; okunamayan kayıt `efsane-avcisi-v1-bozuk` anahtarına saklanır); 3B takılma (model ışıkları `PL` işaretçisi + `ML` havuzu/`relight`, açılışta "tutucu" meshlerle shader'lar önceden derlenir — YENİ malzeme türü eklersen tutucu da ekle); render süreci çökmesi toparlanır. YENİ: dosyaya yedek + dosyadan yükleme + haftalık otomatik yedek (`bkFile`, `autoBk`, `S.lastBk`, `S.set.autoBk`), efekt yoğunluğu (`S.set.fx` 0/1/2 → `S3D.setQuality`, `FXF()`), ekran parlaması anahtarı (`S.set.flash`), ayrı efekt/müzik ses seviyesi (`S.set.vol/mvol`, `outS/outM`), menüdeyken savaş sürer (`S.set.bgFight`, varsayılan açık; savaş sekmesi dışında görsel efekt/ses üretilmez, boss özel saldırısı beklemez, mod sırasında durur), ekran sadece savaşta açık kalır, Kule "Hızlı geç" (`towerSkipN`, `towerRw`), SERİ nidası sadece 3 ve 5'in katlarında, sekme rozetleri "!". Testte `S.set.bgFight=false` ile başlanır.
- **v1**: İlk oynanabilir sürüm.
- **v2**: Sınıflar, yetenekler, kombo, demirci, yoldaşlar, günlük ödül/görev/başarım, elmas, sen yokken kazanç, elit canavar, baştan görsel tasarım. v1 kayıtları korunur (açılışta sınıf seçtirilir).
- **v8**: Vuruş hissi (kullanıcı "vuruş hissi basit" dedi): 3'lü kombo (`R.step`, `swing()` adımı döndürür; 3. vuruş BİTİRİCİ, `P.fin` çarpanı), sınıfa özel 3B saldırı (`S3D.heroAttack(step)`: Savaşçı kılıç izi `slashArc` + bitiricide zıplama, Okçu ok `shot('arrow')`, Büyücü küre `shot('orb')`), vuruş donması (`stopT`/`hitStop`), kamera FOV darbesi (`punch`), canavar geri savrulma/ezilme (idle'da `u.kb/u.sq/u.tl`, saldırı eğimi `u.rx`), parçalanarak ölüm (`debris`, `xpOrbs`), boss ölümünde ağır çekim (`ts/tsT/focus`) ve sonraki canavar 1350 ms sonra (`spawnT`, `spawn()` bekleyeni iptal eder), WebAudio gürültü+bas katmanlı sesler (`sfx`), hasara göre büyüyen/savrulan sayılar, ekran parlaması (`scrFlash`), kombo nidaları ve öldürme serisi altın bonusu (`shout`, `R.streak`). PERFORMANS: geçici ışıklar sabit 4'lü havuzdan (`LP`, `light()`); ışık sayısı değişirse three.js tüm shader'ları yeniden derler → takılma, yeni geçici PointLight EKLEME. YENİ: 🌳 Ustalık ağacı (`TAL`, her 5 seviyede 1 puan, dal kilidi 3/6/9 puan, doğuşta sıfırlanır), 🗼 Sonsuz Kule (`towerOn`, `towerEnd`, `S.tower.best`, sınırsız deneme, ilk geçiş ödülü), yoldaş özel yetenekleri (`PSK`, `petSkill`, `S3D.petSkill`), 🎲 stat yeniden zar (`rrCost`, `reroll`). Testte zamanlayıcıya bağlı adımlar `waitFor` ile bekler (yazılımsal 3B yavaş).
- **v7**: HATA: 30. kat boss'u (ör. Orman Devi) sonrası oyun aynı katta kalıp boss'u tekrar doğuruyordu → artık sonraki bölgeye geçer (`kill()`), 30. katta ▶ sonraki bölgeye götürür, en yüksek kata ▶ ile çıkınca Oto ilerle yeniden açılır. YENİ: 6. sekme 🏰 Macera (`renderAdv`): Boss Arenası + 3 Zindan (`DUNG`, 45 sn, günde 2 hak; `dungOn`, `dungKill`, `endDung`) + Düello Ligi (`duelOn`, `genOpps`, `duelEnd`; gölge rakipler oyuncunun gücüne göre, `LEAGUES` kupa ligleri, günde 5 maç). Boss/düello özel saldırısı: uyarı + 🛡️ SAVUN düğmesi (`startTele`/`block`/`bossSpecial`, 3× hasar; savuşturunca 2 sn sersemletme + karşı saldırı), %50 canda öfke (`enrage`). Elit ekleri (`AFX`). Rünler (`RUNES` 7 tür × I–V; `it.sock`, yuva sayısı nadirliğe göre; `S.runes`; 3→1 birleştirme). Hikâye (`STORY`, Bilge Ozan) ve boss replikleri (`QUOTE`, `say()`). Çanta/Kahraman'da dönen 3B karakter vitrini (`S3D.showcase`). Eski oyunculara bir kez `news7` (`S.nv`). Kullanıcı "oyun hâlâ basit, aklına gelen her şeyi ekle" dedi.
- **v6**: Kuşanılan eşyalar 3B karakterde görünür (`gearOf()` → `S3D.setHero(cls, skin, gear)` → `applyGear`): silah tipi eşyanın emojisinden (kılıç/balta/çekiç/mızrak/yay/asa), zırh (plaka/giysi/cübbe), kask (miğfer/taç/büyücü şapkası), eldiven, bot, yüzük (dönen mücevher). Klasik kostümde nadirlik rengi (`RC`/`RM`), Epik+ silah parlar; kostüm seçiliyse renk kostümden. Kahraman silahı yukarıda tutar.
- **v5**: Oto saldırı hız ayarı (⚔️ OTO düğmesi → pencere; `AAS` 5 kademe: Sakin/Normal her zaman, Hızlı Sv20, Çok hızlı Sv40, Fırtına 1 doğuş; `S.aaSp`), Çanta'da tek tıkla "⚡ En iyileri kuşan" (`bestList`) ve "⚒️ Toplu geliştir" (`upPlan`: Güvenli = herkes +5'e kadar, Sonuna kadar = riskli denemeler dahil). Kullanıcı tek tıkla iş gören kolaylıkları seviyor.
- **v4**: Oto saldırı (ilk boss'tan sonra; `aaOpen`, `AA_MS`=400 ms, titreşimsiz) ve oto yetenek (Sv15; `autoSkill`), WebAudio ile bölgeye göre üretilen müzik (`MUS`, `music()`), 2 yeni bölge (Gök Tapınağı, Hiçlik → 8 bölge, sonuncusu sonsuz; eski kayıtta Kale 30'u geçmişse sonraki bölge açılır), yoldaş evrimi (Sv10/Sv20, `petStage`), 3B kostümler (`SKINS`, `S.skin`). Kullanıcı isteği: "her saldırı için tuşa basmayayım".
- **v3**: Gerçek 3B grafik (Three.js, koddan modeller), eşya setleri, zamanlı boss + Boss Arenası, yeniden doğuş + Ruh Ağacı, 2B/3B ayarı.

## Sıradaki fikirler (öneri olarak sun)
- (Yapıldı: haftalık etkinlik v18, ustalık v8, yoldaş yetenekleri v8, bölge görev zinciri v11, sonsuz kule v8, zar atma v8.) Yeni fikirler: ses cilası, sezonluk sıralama/rekor tablosu, yeni sınıf, yeni bölge, eşya efsanevi güçlerine 3B görsel.
