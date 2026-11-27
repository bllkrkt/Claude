# Efsane Yolu v22 — Komik sohbetler (kısa tasarım)

## Amaç
Kullanıcı oyunda komik sohbetler istemişti; mevcut sistem (SAYS/SAYE/SAYB, `say`/`heroSay`/`stepSay`/`drawSay`) seyrek, tekrarlı ve boss'ların çoğu sessiz olduğu için hissedilmiyor. Ton: **absürt + laf sokma** (kullanıcı seçti).

## Hedefler
- Karşılıklı atışma (düşman ↔ karakter, ara sıra karakter başlatır).
- 22 boss'un hepsine 4 an: giriş, öfke (2. aşama), yenilgi, oyuncuyu yendiği an.
- Yoldaş yorumları (yoldaş türüne göre).
- Sınıfa göre karakter lafları (war/arc/mag/asn).
- Laf havuzu 3–4 katı, aynı laf arka arkaya gelmez; düşman konuşma oranı ~%35; baloncuk yazısı biraz büyük.
- Yeni anlar: kombo kırılması, kusursuz kaçış, Mitik+ eşya, uzun süre ölmeme.
- Ayarlar'da "Konuşmalar" aç/kapa (`SV.talk`, varsayılan açık). Tüm metinler TR + EN.

## Kapsam dışı / yapılmayacak
- Oyunu durduran sohbet ekranı yok (akış bozulmasın).
- Denge, hız, kayıt biçimi değişmez (yalnız `SV.talk` eklenir, varsayılanı `fresh()`'e).

## Yaklaşımlar
1. **Mevcut baloncuk sistemini büyütmek (seçildi):** veri tabloları + küçük tetikleyiciler; risk düşük.
2. Ayrı sohbet/diyalog ekranı: oyunu durdurur, akışa aykırı — elendi.
3. Yalnızca metin sayısını artırmak: atışma/boss anları olmadan "hissedilmeme" sorunu çözülmez — elendi.

## Yapıcıya kalan
Laf metinleri, tetik olasılıkları, cevap gecikmesi (~1–1,6 sn), tekrar önleme yöntemi.
