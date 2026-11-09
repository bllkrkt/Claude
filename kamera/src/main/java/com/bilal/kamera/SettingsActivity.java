package com.bilal.kamera;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Size;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.preference.ListPreference;
import androidx.preference.Preference;
import androidx.preference.PreferenceFragmentCompat;
import androidx.preference.SwitchPreferenceCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class SettingsActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (getSupportActionBar() != null) getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        if (b == null) getSupportFragmentManager().beginTransaction().replace(android.R.id.content, new Frag()).commit();
    }

    @Override
    public boolean onSupportNavigateUp() { finish(); return true; }

    public static class Frag extends PreferenceFragmentCompat {
        @Override
        public void onCreatePreferences(Bundle b, String rootKey) {
            setPreferencesFromResource(R.xml.prefs, rootKey);
            SharedPreferences sp = P.sp(requireContext());
            fillMp((ListPreference) findPreference(P.PHOTO_MP_BACK), sp, "back");
            fillMp((ListPreference) findPreference(P.PHOTO_MP_FRONT), sp, "front");

            // Fotoğraf biçimi: telefonun desteklediklerini göster
            ListPreference fmt = findPreference(P.PHOTO_FORMAT);
            String fs = sp.getString(P.cap("back", "formats"), "");
            List<String> fe = new ArrayList<>(), fv = new ArrayList<>();
            fe.add("JPEG (standart)"); fv.add("jpeg");
            if (has(fs, 1)) { fe.add("Ultra HDR (parlak ekranlarda daha canlı)"); fv.add("uhdr"); }
            if (has(fs, 3)) { fe.add("RAW (DNG) + JPEG"); fv.add("raw"); }
            set(fmt, fe, fv);

            ListPreference cm = findPreference(P.CAPTURE_MODE);
            List<String> ce = new ArrayList<>(), cv = new ArrayList<>();
            ce.add("En yüksek kalite"); cv.add("quality");
            ce.add("Hızlı çekim"); cv.add("latency");
            if (sp.getBoolean(P.cap("back", "zsl"), false)) { ce.add("Sıfır gecikme (ZSL)"); cv.add("zsl"); }
            set(cm, ce, cv);

            // Video kalitesi
            ListPreference vq = findPreference(P.VIDEO_QUALITY);
            String q = sp.getString(P.cap("back", "vq"), "");
            List<String> qe = new ArrayList<>(), qv = new ArrayList<>();
            for (int i = 0; i < Caps.Q_KEYS.length; i++) {
                if (q.isEmpty() || ("," + q + ",").contains("," + Caps.Q_KEYS[i] + ",")) { qe.add(Caps.Q_NAMES[i]); qv.add(Caps.Q_KEYS[i]); }
            }
            set(vq, qe, qv);

            ListPreference fps = findPreference(P.VIDEO_FPS);
            if (!sp.getBoolean(P.cap("back", "fps60"), true)) {
                List<String> e = new ArrayList<>(), v = new ArrayList<>();
                e.add("30 fps"); v.add("30");
                set(fps, e, v);
                fps.setSummary("Bu telefonda uygulamalara yalnızca 30 fps açık");
            }
            ListPreference slow = findPreference(P.SLOWMO_FPS);
            String sl = sp.getString(P.cap("back", "slowmo"), null);
            if (slow != null && sl != null) {
                List<String> e = new ArrayList<>(), v = new ArrayList<>();
                for (String x : sl.split(",")) {
                    if (x.trim().isEmpty()) continue;
                    int f = Integer.parseInt(x.trim());
                    e.add(f + " fps (" + Math.max(1, f / 30) + " kat yavaş)"); v.add(String.valueOf(f));
                }
                if (v.isEmpty()) { slow.setEnabled(false); slow.setSummary("Bu telefon uygulamalara ağır çekim açmıyor"); }
                else set(slow, e, v);
            }
            SwitchPreferenceCompat stab = findPreference(P.VIDEO_STAB);
            if (!sp.getBoolean(P.cap("back", "stab"), true)) { stab.setEnabled(false); stab.setSummary("Telefon desteklemiyor"); }
            SwitchPreferenceCompat hdr = findPreference(P.VIDEO_HDR);
            if (!sp.getBoolean(P.cap("back", "hlg"), false)) { hdr.setEnabled(false); hdr.setChecked(false); hdr.setSummary("Telefon bu uygulamaya 10-bit HDR açmıyor"); }

            ListPreference acc = findPreference(P.ACCENT);
            if (acc != null) {
                acc.setSummaryProvider(pp -> {
                    ListPreference l = (ListPreference) pp;
                    CharSequence name = l.getEntry() != null ? l.getEntry() : "Sarı";
                    android.text.SpannableString ss = new android.text.SpannableString("●  " + name);
                    ss.setSpan(new android.text.style.ForegroundColorSpan(P.accent(requireContext())), 0, 1, 0);
                    return ss;
                });
                acc.setOnPreferenceChangeListener((pp, v) -> { pp.getPreferenceManager().getSharedPreferences().edit().putString(P.ACCENT, (String) v).apply(); return true; });
            }
            Preference info = findPreference(P.CAM_INFO);
            info.setOnPreferenceClickListener(p -> {
                String t = sp.getString(P.CAP_INFO_TEXT, "");
                if (t.isEmpty()) t = Caps.fallbackInfo(requireContext());
                new AlertDialog.Builder(requireContext()).setTitle("Kamera bilgisi").setMessage(t).setPositiveButton("Tamam", null).show();
                return true;
            });
            Preference reset = findPreference("reset");
            reset.setOnPreferenceClickListener(p -> {
                new AlertDialog.Builder(requireContext()).setTitle("Ayarlar sıfırlansın mı?")
                        .setMessage("Tüm kamera ayarları varsayılana döner. Fotoğraflarınız silinmez.")
                        .setNegativeButton("Vazgeç", null)
                        .setPositiveButton("Sıfırla", (d, w) -> {
                            SharedPreferences.Editor e = sp.edit();
                            for (String k : sp.getAll().keySet()) if (!k.startsWith("cap_")) e.remove(k);
                            e.apply();
                            requireActivity().recreate();
                        }).show();
                return true;
            });
        }

        private static boolean has(String csv, int v) {
            return ("," + csv + ",").contains("," + v + ",");
        }

        private static void set(ListPreference p, List<String> e, List<String> v) {
            if (p == null) return;
            p.setEntries(e.toArray(new String[0]));
            p.setEntryValues(v.toArray(new String[0]));
            if (!v.contains(p.getValue())) p.setValue(v.get(0));
        }

        /** Telefonun gerçek çözünürlüklerinden megapiksel seçenekleri üretir. */
        private void fillMp(ListPreference p, SharedPreferences sp, String facing) {
            if (p == null) return;
            List<Size> sizes = P.parseSizes(sp.getString(P.cap(facing, "sizes"), ""));
            List<String> e = new ArrayList<>(), v = new ArrayList<>();
            Size max = P.pick(sizes, 4f / 3f, 0);
            e.add(max != null ? "En yüksek (" + label(max) + ")" : "En yüksek"); v.add("0");
            List<Integer> seen = new ArrayList<>();
            if (max != null) seen.add(P.mp(max));
            for (Size s : sizes) {
                if (Math.abs(s.getWidth() / (float) s.getHeight() - 4f / 3f) > 0.03f) continue;
                int mp = P.mp(s);
                if (mp < 2 || seen.contains(mp)) continue;
                boolean close = false;
                for (int x : seen) if (Math.abs(x - mp) < Math.max(2, x * 0.25f)) close = true;
                if (close) continue;
                seen.add(mp);
                e.add(label(s)); v.add(String.valueOf(mp));
                if (e.size() >= 5) break;
            }
            set(p, e, v);
        }

        private static String label(Size s) {
            return String.format(Locale.US, "%d MP · %d×%d", P.mp(s), s.getWidth(), s.getHeight());
        }
    }
}
