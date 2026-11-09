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

# İkinci uygulama: Kamera+ (`kamera/` modülü)

Kullanıcı Xiaomi 15T Pro'sundaki (HyperOS, Android 15) varsayılan kamerayı beğenmedi; ayrı bir kamera uygulaması istedi. Takip Temizleme ile ilgisi yok, aynı Gradle projesinde ikinci modül.

- Paket: `com.bilal.kamera`, ad "Kamera+", minSdk 29, targetSdk 35, Java + CameraX **1.5.3** (1.6 compileSdk 36 istiyor, bilerek 1.5'te).
- Derleme: `./gradlew :kamera:assembleDebug` → `kamera/build/outputs/apk/debug/kamera-debug.apk` → kullanıcıya `Kamera-vN.apk` adıyla ver. Her sürümde `kamera/build.gradle` `versionCode`'u artır (şu an 4 / "4.0").
- **İmza:** `kamera/keystore/kamera.keystore` (alias `kamera`, şifre `android`, SHA-256 `5a137987…6c86`). Git'e konmaz; v1'de kullanıcıya `kamera-imza-anahtari.keystore` olarak gönderildi. Yeni oturumda yoksa kullanıcıdan iste; yoksa yeni anahtar = kullanıcı eskisini silip kurar (sadece ayarlar gider, fotoğraflar DCIM'de kalır).
- Emülatör yok (KVM yok); gerçek testi kullanıcı telefonda yapıyor. Derlemeden sonra `dexdump … | grep bilal` ile sınıfları doğrula.

## Dosyalar
- `MainActivity.java` — tüm kamera ekranı: modlar, bağlama (`bindCamera`, hata olursa `bindCamera(true)` ile sade ayarlarla tekrar), çekim, video, pro kontroller, jestler, ses tuşları.
- `Caps.java` — telefonun yeteneklerini okuyup `cap_<back|front>_*` anahtarlarıyla kaydeder (çözünürlükler, Ultra HDR/RAW, ZSL, video kaliteleri, 60fps, sabitleme, 10-bit HDR, üretici eklenti modları). Ayarlar ekranı seçenekleri bunlardan üretir. "Kamera bilgisi" metni de burada.
- `SettingsActivity.java` + `res/xml/prefs.xml` — ayarlar (PreferenceFragmentCompat). `P.java` anahtarlar.
- `ShutterView`, `OverlayView` (ızgara, su terazisi, odak halkası), `HistogramView`.

## Özellikler (v1)
Modlar: PRO · GECE · PORTRE · FOTOĞRAF · VİDEO (Gece/Portre/HDR yalnızca telefon CameraX Extensions açıyorsa görünür). Lens çipleri (0.6/1/2/5/10, zoom aralığına göre), sıkıştırma ile zoom, çipe uzun bas = zoom kaydırıcı. Dokun = odak + EV kaydırıcı, uzun bas = AE/AF kilit. Sağa/sola kaydır = mod, yukarı/aşağı = kamera çevir. Flaş (kapalı/oto/açık/fener, ön kamerada ekran flaşı), zamanlayıcı 3/5/10, en-boy 4:3/16:9/1:1/TAM, ızgara (3×3/4×4/altın oran), su terazisi, deklanşör sesi, ses tuşları (deklanşör/zoom/normal).
Pro: EV, ISO, enstantane, elle odak, beyaz dengesi (Camera2 interop) + canlı ISO/enstantane gösterimi + histogram.
Fotoğraf ayarları: çözünürlük (telefonun gerçek boyutlarından), JPEG kalitesi, biçim (JPEG/Ultra HDR/RAW+JPEG), çekim önceliği (kalite/hız/ZSL), ön kamera ayna.
Video: 4K/1080p/720p/480p, 30/60 fps, bit hızı, sabitleme, 10-bit HLG, ses, duraklat/devam.
Kayıt: `DCIM/Camera` (varsayılan) veya `DCIM/KameraPlus`. Küçük resim → galeride açar.

## v2 (kullanıcı v1'i denedi: "portrede zoom çalışmıyor, çok sade")
- **Dijital zoom (üretici modları):** Gece/Portre/Akıllı sahnede Xiaomi zoom'u yok sayıyor. Bu modlarda `extActive=true`: vizör `previewView.setScale` ile büyür, kayıttan sonra `PostProcessor` ortadan kırpar (1×–4×).
- **Akıllı sahne:** Fotoğraf modunda üst düğme; HDR eklentisi yoksa `ExtensionMode.AUTO` kullanılır (bu telefonda HDR yok, Oto var).
- **Filtreler (`Filters.java`):** 10 renk filtresi, vizörde canlı (PreviewView'ın TextureView'ına `setLayerPaint` + vinyet `OverlayView`), fotoğrafa kayıttan sonra uygulanır. Videoda yok.
- **`PostProcessor.java`:** JPEG'i açar → EXIF yönüne göre döndürür → kırpma/filtre/vinyet/filigran → aynı URI'ye yazar, EXIF'i (ISO, enstantane, GPS…) geri koyar. RAW (DNG) dosyasına dokunmaz. Ultra HDR kazanç haritası bu işlemde kaybolur.
- **Filigran:** Ayarlar → Filigran: köşede yazı / beyaz çerçeve (telefon adı + mm, f/, enstantane, ISO, tarih). Yazı özelleştirilebilir.
- **Seri çekim:** deklanşöre basılı tut (en fazla 60).
- **QR okuma:** Fotoğraf modunda ImageAnalysis + ZXing; sarı çip → bağlantıyı aç / kopyala / paylaş, Wi-Fi şifresini gösterir. Bağlama başarısız olursa önce analiz çıkarılarak tekrar denenir (`noAnalysis`).
- **Uygulama içi galeri (`GalleryActivity`):** küçük resme dokun → kaydırarak gez, yakınlaştır (`ZoomImageView`), paylaş, düzenle, bilgi, sil. Küçük resme uzun bas = sistem galerisi.
- **Konum:** Ayarlar'dan açılır (varsayılan kapalı), EXIF'e GPS yazar.

## v3 (kullanıcı: "ekleyebildiğin her şeyi ekle")
- **AĞIR ÇEKİM modu (`M_SLOWMO`):** CameraX `HighSpeedVideoSessionConfig` (deneysel) + `bindToLifecycle(SessionConfig)`, slow-motion açık, ses yok. Desteklenen hızlar `Caps.slowMoFps()`; telefon açmıyorsa mod görünmez. Ayar: `slowmo_fps`. `isVideoMode()` = video veya ağır çekim.
- **Video sırasında fotoğraf:** video bağlamasına ImageCapture eklenir (sağdaki kamera düğmesi). Bağlanamazsa `noSnapshot` ile fotoğrafsız tekrar denenir.
- **Kayıtta ses seviyesi çubuğu** (`VideoRecordEvent.Status` → audio amplitude).
- **Aralıklı çekim:** zamanlayıcı düğmesine uzun bas → 2 sn/5 sn/10 sn/30 sn/1 dk. Deklanşör durdurur.
- **Alkışla/sesle çek:** ayar `sound_trigger`; AudioRecord ile ortam ortalamasının 5 katı ve >18000 tepe → çek (3 sn bekleme). Video modlarında kapalı.
- **Pro: Tepe (odak tepe noktası, kırmızı) ve Zebra (patlayan beyazlar)** çipleri; analiz görüntüsünden `OverlayView.setPeaking` ile çizilir. Pro modda analiz her zaman bağlanır.
- **Belge filtresi** (11. filtre), **orijinali de sakla** ayarı (`keep_original`).
- **Kısayollar** (`res/xml/shortcuts.xml`: Selfie, Video, Ağır çekim, Pro), **hızlı ayar kutucuğu** (`KameraTile`), **kilit ekranından açılma** (`STILL_IMAGE_CAMERA_SECURE`; galeri/ayarlar için kilit açtırılır).

## v4 (kullanıcı v3'ü denedi: "çalışmayan bir şey yok"; zoom geçişleri donuk, modlar kaydırılsın, renkler ayarlansın)
- **Yumuşak zoom:** `animateZoom()` lens çiplerinde logaritmik animasyon (ayar `smooth_zoom`). Çip güncellemesi hafifletildi (stil yalnızca etkin çip değişince). Fiziksel lens değişimindeki kısa takılma Xiaomi'nin donanım katmanından, tamamen giderilemez.
- **`ZoomBar`:** lens şeridinde parmakla sağa/sola sürükleme = akıcı zoom. Lens eşiği geçince titreşim.
- **Kaydırmalı mod seçimi:** `modeScroll` kaydırılıp bırakılınca ortadaki mod seçilir (`onModeScrollIdle`); yalnızca kullanıcı dokunuşuyla başlayan kaydırmada (`modeUserScroll`).
- **Görünüm ayarları:** `accent_color` (9 renk, `P.accent()`), `shutter_style` (beyaz / renkli iç / renkli halka). Tüm vurgu renkleri `accent` alanından; `applyAccent()`.
- **Galeri ızgarası:** "Tümü" düğmesi → 3 sütun küçük resim (LruCache), dokun → o çekime git.
- Kayıt noktası yanıp söner.

## Kullanıcının telefonundan okunan yetenekler (v1 "Kamera bilgisi")
Arka: en fazla 4096×3072 (13 MP; 50 MP üçüncü parti uygulamaya kapalı), LEVEL 3, ISO 50–6400, enstantane 1/20000–30", 23mm f/1.6, elle odak var, RAW var, 3 fiziksel lens, zoom 0.6×–10×, Ultra HDR ve RAW+JPEG var, video 4K/60fps/sabitleme/10-bit. Eklentiler: Gece, Portre, Oto (HDR yok).
Ön: 3280×2464 (8 MP), ISO 50–6400, 1/10000–1/2, 21mm f/2.2, sabit odak, 1080p, 60 fps yok. Eklentiler aynı.

## Bilinen sınır
Xiaomi, üçüncü parti uygulamalara tüm lensleri/özellikleri açmayabilir (geniş açı, 50 MP, gece modu vb.). Uygulama ne açıksa onu otomatik kullanır; Ayarlar → Kamera bilgisi ne açık olduğunu gösterir. Kullanıcıdan bu ekranın içeriğini istemek sonraki geliştirmeler için faydalı.
