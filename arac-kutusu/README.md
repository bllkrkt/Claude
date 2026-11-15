# Araç Kutusu (Xiaomi / HyperOS)

Türkçe telefon araç kutusu: Temizlik, Güvenlik kontrolü, Gizli ayarlar, Tek tık ayarlar, Araçlar (45+ araç: tools.js + tools2.js), Telefon durumu, Ekran süresi, Xiaomi rehberi, Ayarlar (tema, şarj izleyici, widget, yedek).
Uygulamanın İNTERNET izni yoktur (bilerek): hiçbir veri dışarı çıkamaz.
Bu depodaki Takip Temizleme uygulamasından bağımsızdır (paket: `com.bilal.arackutusu`).

- Arayüz: `app/src/main/assets/index.html` (ana bölümler) + `tools.js` (Araçlar) + `lib/` (qrcode-generator MIT, jsQR Apache-2.0)
- Java: `Bridge` (JS köprüsü), `Cleaner`, `AppScanner`, `Shortcuts`, `Toggles`, `ShizukuHelper`, `DeviceInfo`, `Hardware` (sensör/mikrofon), `Scheduler` (zamanlanmış modlar + kısayollar), `ApplyModeActivity`, `ModeTile1-3`, `CaffeineTile`, `Extras` (ekran süresi, rehber, konum), `ChargeService` (şarj izleyici), `StatusWidget`
- Derleme: `.github/workflows/arac-kutusu.yml` → APK "Releases" sayfasına `arac-kutusu-vX.Y` etiketiyle konur.
- Her sürümde `app/build.gradle` içinde `versionCode` +1 ve `versionName` güncellenir.
- İmza: GitHub gizli değişkenleri `ARAC_KUTUSU_KEYSTORE` (base64) ve `ARAC_KUTUSU_KEYSTORE_PASSWORD`, takma ad `arackutusu`.
  Yoksa her derleme geçici anahtarla imzalanır (güncelleme için eski sürüm silinmeli).
- Arayüz testi: `node tests/ui-test.mjs app/src/main/assets/index.html <klasör>` (sahte köprüyle tüm ekranlar).
