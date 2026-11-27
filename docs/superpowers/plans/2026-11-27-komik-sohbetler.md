# Komik sohbetler (Efsane Yolu v22) Uygulama Planı

> Yürütme: kullanıcı "başla" dedi; CLAUDE.md token tasarrufu gereği bu oturumda doğrudan (native) uygulanır.

**Amaç:** Konuşma baloncuklarını absürt + laf sokan, karşılıklı, boss/yoldaş/sınıfa özel hâle getirmek.
**Mimari:** `yan/src/main/assets/index.html` içinde açılış satırının hemen önüne "v22 SOHBET" bloğu: veri tabloları (TR+EN çiftleri `L2()` ile EN'e yazılır) ve `say/heroSay/stepSay` yeniden tanımı (sonraki function bildirimi öncekini ezer). Birkaç yerinde tek satırlık tetik eklenir.
**Tasarım:** `docs/superpowers/specs/2026-11-27-komik-sohbetler-design.md`

## Genel kısıtlar
- Kullanıcıya görünen her metin `T()` ile ve EN karşılığıyla. Kayıt biçimi aynı; yalnız `SV.talk` (0/1, yoksa 1 sayılır).
- Denge/hız değişmez; boss/oyuncu ölümünde akış beklemez.

## Gözden geçirme odağı
1. `SV.talk=0` iken hiçbir baloncuk çıkmamalı (bekleyen cevaplar dahil).
2. Ölü varlığa bağlı baloncuk: boss yenilgi lafı ölü boss'ta kaybolmamalı (vekil nesne).
3. Yoldaşı olmayan oyuncuda yoldaş lafı denenince hata olmamalı.
4. İngilizcede çevirisi eksik laf kalmamalı.
5. Aynı laf arka arkaya gelmemeli (son 3 hatırlanır).

### Görev 1: Veri + motor
- `SAYC[war|arc|mag|asn]`, `SAYS` ek anahtarlar (cbrk, dodge, loot, streak, bossr, win), `SAYX[düşman]=[[düşman, cevap]]`, `SAYR=[[karakter, düşman cevabı]]`, `SAYB4[boss]={in,rage,lose,win}` (22 boss), `SAYP[peri|baykus|golgek|tilki|ejder]={pit,hurt,chest,boss,idle}`.
- `pickN(a,key)`, `say(e,tx,d)`, `sayQ(e,tx,gecikme,d)`, `heroSay(k,force)`, `petSay(k)`, `bossTalk(an)`, `stepSay(dir)`.
- Test: `tests/yan-sohbet.mjs` — her boss 4 an, her düşman türü atışma, EN eksiksiz, `SV.talk=0` sessiz, atışma cevabı gelir.

### Görev 2: Tetikler + ayar + baloncuk boyu
- Boss öfke/ölüm/oyuncu ölümü, kusursuz kaçış, Mitik+ eşya, Ayarlar "Konuşmalar", `drawSay` yazı 11→13px.
- Doğrulama: `yan-sohbet.mjs`, `yan-e2e.mjs`, `yan-canta.mjs`, `yan-mod.mjs` → `errors []`.
