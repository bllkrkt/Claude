#!/usr/bin/env bash
# Efsane Avcısı testlerinin hepsini paralel çalıştırır, her biri için tek satır özet basar.
#   ./rpg-hepsi.sh            → hızlı mod (3B ve ekran görüntüsü yok, ~2 dk) — her değişiklikten sonra
#   TAM=1 ./rpg-hepsi.sh      → tam mod (3B + ekran görüntüleri, ~8 dk) — görsel/3B değişikliklerinde
# Ekran görüntüleri ve günlükler: $CIKTI (varsayılan /tmp/rpg-test)
cd "$(dirname "$0")"
HTML=../rpg/src/main/assets/index.html
CIKTI=${CIKTI:-/tmp/rpg-test}; mkdir -p "$CIKTI"
if [ -n "$TAM" ]; then unset HIZLI; else export HIZLI=1; fi
bas=$(date +%s)
node rpg-e2e.mjs "$HTML" "$CIKTI" > "$CIKTI/ana.log" 2>&1 &
node rpg-ilk-dakika.mjs "$HTML" "$CIKTI" > "$CIKTI/ilk-dakika.log" 2>&1 &
node rpg-ingilizce.mjs "$HTML" "$CIKTI" > "$CIKTI/ingilizce.log" 2>&1 &
wait
sonuc=0
for t in ana ilk-dakika ingilizce; do
  satir=$(grep -m1 '^errors' "$CIKTI/$t.log")
  if [ "$satir" = "errors []" ]; then echo "✅ $t"; else sonuc=1; echo "❌ $t: ${satir:-çöktü, bkz. $CIKTI/$t.log}" | cut -c1-400; fi
done
echo "süre: $(( $(date +%s)-bas )) sn ($([ -n "$TAM" ] && echo tam || echo hızlı) mod)"
exit $sonuc
