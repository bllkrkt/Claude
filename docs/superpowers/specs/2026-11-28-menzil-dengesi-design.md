# Efsane Yolu v24 — Menzil dengesi (kısa tasarım)

Sorun (kullanıcı): Okçu/Büyücü uzaktan, hiç yaklaşmadan canavar ve boss kesiyor; çok kolay.
Ölçüm: ok ~12 karo, küre ~10 karo, tam hasar; normal atışlar düşman mermilerini havada kesiyor; boss'lar uzaktakine karşı bir şey yapmıyor.

Yaklaşımlar: (1) yalnız uzaklık cezası, (2) yalnız düşman tepkisi, (3) karışım — **kullanıcı 3'ü seçti**.
Kararlar: menzil ~9 karo (ok 297 px, küre 288 px, ateş topu 301 px); 130 px'e kadar tam hasar, 300 px'te %65 (`rngMul`);
düşman mermisini sadece kombonun 3. vuruşu keser (`q.cut`); boss, oyuncu 200 px'ten uzakta 3,2 sn (2. aşamada 2,2 sn) kalınca
uyarıp (0,55 sn yanıp sönme + "!") yanına atılır (`gcStep`, temas hasarı ×1,1). Savaşçı ve özel saldırılar (ok yağmuru, meteor) değişmez.
Test: `tests/yan-menzil.mjs`.
