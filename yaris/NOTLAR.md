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
| `post.js` | `POST`: ekran efektleri — sahne HDR doku hedefine çizilir; parlama (bloom, 2 seviye), hız bulanıklığı, nitro renk kayması, vinyet, ACES + sRGB. Grafik Düşük'te kapalı (`draw()` doğrudan çizer) |
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

## Kestirmeler, rampalar, uçuş (v2)
- `PIST.shortcuts(T,3,rng)`: virajın içinden geçen Bezier ara yol (`{sA,sB,side,poly}`), kendi pisti `k.T` (W=10). Araç kestirmedeyken `c.sc=k`, yerel konum `c.ss`; `c.s` ana yol eşdeğerine eşlenir (sıralama/mesafe aynı kalır). Giriş: ana yol kenarına `sA` civarında çarpınca `enterShortcut`; çıkış `exitShortcut` (dünya konumu korunur, `rebase`). Farklı yoldaki araçlar çarpışmaz; polis kestirmedeki oyuncuyu göremez/yakalayamaz.
- Yardımcılar: `trk(c)`, `loc(c)`, `moveS(c,x)`. Yeni fizik kodunda `R.T`/`c.s` yerine bunları kullan.
- Rampalar `R.ramps` (`{sc,s0,len,d0,w,h}`), tepeler `T.bumps` (`zipla` bölge değeri). Dikey fizik `vert()`: `c.wy`, `c.vy`, `c.air`; yol aşağı kıvrılınca ya da rampa bitince havalanır, inişte `land()` (uçuş ≥0,45 sn → nitro + "UÇUŞ" yazısı).

## Grafik (v2)
- Araba gövdesi `loftBody`/`loftCabin`: profilden kesit örme (yuvarlak uçlar, çamurluk şişkinliği, eğimli yan cam). Yüksek kalitede clearcoat (MeshPhysical). Farlar/stoplar/siren HDR renk (parlama efektiyle ışır).
- Çevre: park etmiş arabalar (`ARABA3D.parkGeo`, örneklemeli), ağaç, musluk, çöp kutusu, bank, yaya geçidi, rögar, bulut katmanı, zemin kat vitrinleri.
- Kalite otomatik: bellek ≥6 GB ve ≥8 çekirdek → Yüksek; yarışta 6 sn ortalama <27 kare/sn ise `onLowFps` Orta'ya düşürür.

## Gerçek varlıklar (v3)
- `varlik.js` (`VARLIK`): açılışta Poly Haven (CC0) fotoğraf dokuları (`tex/`), gökyüzü fotoğrafları (`sky/`, ton eşlenmiş JPG, 2048×1024) ve hafif sokak modelleri (`model/`, glTF; `lib/GLTFLoader.js` r149 ESM'den genel betiğe çevrildi) yüklenir. Gökyüzünden güneş yönü/ufuk rengi çıkarılır; gerçek duvar dokularından pencereli cephe + dükkân cephesi üretilir. Yüklenemezse (ör. file://) eski koddan üretilen görünüme düşer.
- İndirme betiği: `yaris/varlik-indir/indir.py`. Ağır modeller (lamba, musluk, bariyer, bank: 25-86 bin üçgen) telefona fazla geldiği için çıkarıldı; gltfpack ile sadeleştirme izni yoktu.
- ÖNEMLİ: VARLIK dokuları/modelleri `userData.varlik` ile işaretli; sahne temizliğinde silinmez (silinirse sonraki yarışta yol kaybolur). Yol/şerit malzemesi `DoubleSide` (şerit geometrisinin yüzü aşağı bakıyor).
- `post.js` sahne hedefinde 24 bit derinlik dokusu kullanır (16 bit uzakta iç içe geçiyordu). Kamera: yakın/alçak (5.2 m geri, 1.55 m yukarı, FOV 55-72). Kariyer çoğunlukla gündüz/akşam; gündüz filtresi sıcak sarı.
- Testler artık kendi yerel sunucusunu açar (`yaris-e2e.mjs`), `varlıklar true` yazmalı.

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

- v2: kestirmeler (AI da kullanır), rampalar ve tepelerden uçuş, kavisli yeni araba modelleri, ekran efektleri (bloom, hız bulanıklığı), sokak ayrıntıları, kayıt birleştirme hatası düzeltildi (iç içe varsayılanlar kayboluyordu). Denge: beceri 0.9 → 37/49 (kestirme kullanan sanal sürücü).

- v3: gerçek fotoğraf dokuları, gökyüzü fotoğrafları, gerçek cepheli caddeler, şerit çizgileri, yakın kamera, sinematik filtre, çizim yükü düşürüldü (parça birleştirme, bölgesel ayıklama).

- v4: gerçek zamanlı gölgeler (güneş, kamerayı izleyen 90 m kutu; Orta 1024 / Yüksek 2048), Merkez/Otoyol cam kuleler (`VA.glass`, yansımalı), çatı korkuluğu ve çatı yapıları, yaprak dokulu ağaç tacı (`crownGeo`), arabalarda cam çıtası, büyük stop grupları, tampon bandı, üçüncü stop; garaj gerçekçi stüdyo (`realShowroom`); yarıştan dönünce garajın silinmiş ortam haritası kullanması düzeltildi; `inst` bölme sonsuz döngüsü düzeltildi.
- Gerçek araba modeli araştırıldı: Khronos CarConcept (CC-BY, 213 bin üçgen, 12 MB, logolu) telefona fazla ağır → kullanılmadı.

- v5: gltfpack (npm `gltfpack@0.21.0`, kullanıcı izin verdi; `-si <oran> -sa -noq -kn`) ile sadeleştirilmiş modeller geri geldi: cadde lambası (1,5 bin üçgen), yangın musluğu (3 bin), bank (1,4 bin). Gerçek süper araba: Khronos "CarConcept" (CC BY 4.0, Eric Chadwick / DGG) → plaka ve lastik yanağındaki logolar değiştirildi, direksiyon amblemi silindi, dokular ≤512, 15,9 bin üçgen, `model/araba/konsept.glb` (1,5 MB). `VARLIK.prepCar` tekerlekleri ayırır, gövdeyi malzemeye göre birleştirir; `ARABA3D.makeReal` sadece `super` ve `wedge` gövdelerde (Orta/Yüksek grafikte) kullanır, boya/cam/far/stop/jant oyunun malzemeleriyle değişir (kit, rüzgârlık, desen bu gövdede yok). Künye Ayarlar'da. Gece yansıma kaynağı karartıldı (`envFromSky`).

- Kalıcı izin: `.claude/settings.json` → `Bash(npx gltfpack *)` (kullanıcı istedi). Aracı `npx gltfpack ...` biçiminde çalıştır; geçici klasör yolu her oturumda değişir.
- Model araştırması (v5 sonrası): OpenGameArt'taki CC0/CC-BY araba paketleri ya çizgi film tarzı ya çok kaba (PSX Style Cars: 300-470 üçgen, 128 px doku) ya da gerçek araba taklidi ("Low Poly American Muscle" dosya adı 67camaro, "Muscle Car 3D Model" Mustang benzeri) → kullanılmadı. Poly Pizza/Free3D erişime kapalı, Sketchfab indirme hesap ister. Kullanıcı Sketchfab'dan serbest lisanslı bir model indirip gönderirse aynı yöntemle (logo temizleme + gltfpack + `prepCar`) eklenebilir.

## Fikirler (sıradaki)
- Gizli koleksiyon parçaları (serbest sürüşte), kırılabilir engeller (kasalar, çitler).
- Rakip arabalarına özel görünüm ve "pembe kâğıt" yerine özgün bir ödül sistemi; hasar görseli.
- Hayalet yarış (en iyi turunu kaydet), fotoğraf modu, sezonluk rekor tablosu.
- Telefonda performans ölçümü; release/R8 APK.
