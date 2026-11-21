# Gece Kaçağı — teknik notlar

Kurgusal liman şehri Karaliman'da geçen, hikâyeli sokak yarışı + polis kovalamacası oyunu (Android, yatay ekran).
Kullanıcı "NFS Most Wanted'a benzeyen, çok çeşitli" bir oyun istedi. **Tür ve mekanikler benzer olabilir; ama başka bir oyunun
adı, karakterleri, "Blacklist" gibi isimleri, gerçek araba markaları kullanılmaz.** Her şey kurgusal ve özgün kalmalı.

## Dosyalar (`yaris/src/main/assets/`)
| Dosya | Ne yapar |
|---|---|
| `index.html` | Ekran iskeleti (açılış, menü, diyalog, sonuç, duraklat, modal) + betik sırası |
| `stil.css` | Tüm arayüz + yarış göstergesi (HUD) + dokunmatik kontroller |
| `pist.js` | `PIST.build(def)` pist üretici (saf matematik, node'da çalışır). Pist = 2 m aralıklı merkez çizgisi; `sample(T,s,d,out)` |
| `veri.js` | `VERI`: arabalar, parçalar, görünüm seçenekleri, bölgeler, pistler, etkinlik türleri, karakterler, Gece Listesi, hikâye, polis telsizi, kariyer planı (`careerEvents`), meydan okumalar, başarımlar, polis/aranma tablosu |
| `ses.js` | `SES`: WebAudio ile motor (devir), lastik, siren, efektler ve koddan synthwave müzik (`menu/yaris/kovala/hikaye`) |
| `araba3d.js` | `ARABA3D.make(opt)`: profilden ekstrüzyonla araba modeli (8 gövde + kamyon/otobüs), jant, kit, rüzgârlık, neon, desen dokusu, polis ışığı |
| `dunya.js` | `DUNYA.build(scene,T,zone,opts)`: yol, kaldırım, binalar (instanced), bölge süsleri, gökyüzü, sis, yağmur, lambalar; kapı/radar/kontrol noktası/takip engeli/barikat üreticileri |
| `yaris.js` | `YARIS`: yarış motoru — fizik, yapay zekâ, trafik, polis, yarış türleri, kamera, efektler, HUD, kontroller, vitrin (garaj sahnesi) |
| `oyun.js` | `A`: kayıt, kariyer, garaj, menüler, hikâye diyalogu, ödüller, günlük, başarımlar, ayarlar |
| `lib/three.min.js` | Three.js r149 (MIT). `fonts/` Plus Jakarta Sans (OFL) |

## Koordinatlar ve fizik
- Araç durumu pist uzayında: `s` (pist boyunca m), `d` (yanal, **sağ +**), `a` (yola göre açı, sağ +), `v` (m/s).
- Pist yönü `h = atan2(dx,dz)`; sürücünün sağı `(-cos h, sin h)`; `k>0` = sola dönen viraj.
- `a' = yaw + k·ṡ`, `ṡ = v·cos a / (1 + k·d)`, `d' = v·sin a`. Duvar = yol kenarı (`W/2`).
- Sürüş yardımı (`opt.assist`) virajı kısmen kendisi takip eder; el freni = drift (gövde kayma açısı `slip`, puan, nitro dolumu).
- Döngü pistte herkes çizginin gerisinde (`s<0` → `lap=-1`) başlar; tur olayı sadece yeni en yüksek turda (`maxLap`).
- Renkler: `THREE.ColorManagement.legacyMode=false` ve tüm `CanvasTexture`'lar sRGB (yaris.init içinde yamalı). Bunu kaldırırsan her şey soluk/beyaz görünür.

## Yarış türleri (`cfg.tip`)
devre, sprint, drag (elle vites `input.shift`, şerit değiştirme, trafiğe sert çarpma = kaza), hiz (radar toplamı),
eleme (tur sayısı = rakip sayısı, her turun sonuncusu elenir), gise (kontrol noktası süresi pistin viraj hızlarından hesaplanır),
drift (puan hedefi), kovala (hedef: sure/etkisiz/engel/barikat/kac), kacis, serbest (büyük halka, devriye; 125 km/s üstünde polisin yanından geçince takip).
Kariyer "Liste Düellosu" = rakiple 1'e 1 sprint + devre (ikisi de kazanılmalı).

## Polis
Aranma 1–5 (`VERI.HEAT`), birim türleri (`VERI.COPS`), takviye, barikat (+çivili şerit), helikopter (4★+), takip engelleri (sarı halka),
yakalanma çubuğu (yavaş + polis yakın), kaçış çubuğu → gizlenme → kaçtın. Polis hızı oyuncunun arabasına göre sınırlı (önleyici hariç).
Yarış içindeki polis (`purs.race`) daha hafif ve yarısı rakip yarışçıları hedefler.

## Kayıt
localStorage `gece-kacagi-v1` (nesne `S`, `S.v=1`). Alan eklerken `fresh()` içine varsayılan koy; `load()` eski kayıtları birleştirir.
**Geriye uyumluluk şart.**

## Derleme
- `./gradlew :yaris:assembleDebug` → `yaris/build/outputs/apk/debug/yaris-debug.apk` → kullanıcıya `GeceKacagi-vN.apk`.
- Her sürümde `yaris/build.gradle` `versionCode` +1 ve `oyun.js` içindeki `VER`.
- İmza: `yaris/keystore/kacak.keystore` (SHA-256 `d9b78046…e49dbb`). **Değiştirme** (değişirse güncelleme kurulmaz, kayıt gider).
- Android SDK oturumda yoksa: komut satırı araçlarını `~/android-sdk`'ya kur, `local.properties` içine `sdk.dir=...` yaz.
- Maven 429 verirse biraz bekleyip yeniden dene.

## Testler (`tests/`)
- `HIZLI=1 node yaris-e2e.mjs ../yaris/src/main/assets/index.html <klasör>` → `errors []` görmelisin (~3 dk). `HIZLI` olmadan ekran görüntüsü de alır.
- `node yaris-denge.mjs [beceri]` → sanal sürücü (`YARIS._fast(sn, beceri)`) tüm kariyer etkinliklerini ekransız oynar; kazanma sayısı ve kayıp nedenleri.
  v1 ölçümü: beceri 0.9 → 22/50, 1.0 → 32/50 (telefonda dokunmatik oyuncu için "Normal" zorluk; Ayarlar'da Kolay/Zor var).
- Test makinesi WebGL'i yavaş çalıştırır (5–20 kare/sn); oyun içi süre gerçek süreden yavaş akar, bu normal.

## Sürümler
- v1: ilk sürüm — 17 araba, 7 parça × 4 seviye, görünüm (16 boya, 5 kaplama, 6 jant, kit, rüzgârlık, neon, 8 desen, cam),
  6 bölge, 26 pist + serbest sürüş halkası, 10 yarış türü, 10 rakipli Gece Listesi + hikâye (abla Defne, Bora, Komiser Sert, Kobra),
  polis sistemi, 10 meydan okuma, 20 başarım, günlük giriş + görevler, ayarlar (dokun/eğ, oto gaz, yardım, kamera, grafik).

## Fikirler (sıradaki)
- Yol ayrımları / kestirmeler, köprüden atlama rampaları, gizli koleksiyon parçaları (serbest sürüşte).
- Rakip arabalarına özel görünüm ve "pembe kâğıt" yerine özgün bir ödül sistemi; hasar görseli.
- Hayalet yarış (en iyi turunu kaydet), fotoğraf modu, sezonluk rekor tablosu.
- Telefonda performans ölçümü; release/R8 APK.
