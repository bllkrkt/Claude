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
