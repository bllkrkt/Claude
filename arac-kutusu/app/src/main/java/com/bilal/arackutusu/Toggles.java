package com.bilal.arackutusu;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.media.AudioManager;
import android.net.wifi.WifiManager;
import android.os.PowerManager;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

/** Tek tık ayarlar ve hazır modlar. Her işlem sonucu dürüstçe döner: oldu / izin yok / desteklenmiyor. */
final class Toggles {
    static final String PREFS = "arac_kutusu";

    private Toggles() { }

    // ---------- İzin durumları ----------
    static boolean canWrite(Context c) { return Settings.System.canWrite(c); }

    static boolean dndAccess(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        return nm != null && nm.isNotificationPolicyAccessGranted();
    }

    static boolean secure(Context c) {
        return c.checkSelfPermission(Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED;
    }

    // ---------- Parlaklık ----------
    /** Xiaomi bazı modellerde 0-255 yerine 0-2047/4095 aralığı kullanır; gerçek üst sınırı bul. */
    static int brightnessMax(Context c) {
        int max = 255;
        try {
            int id = Resources.getSystem().getIdentifier("config_screenBrightnessSettingMaximum", "integer", "android");
            if (id != 0) max = Math.max(max, Resources.getSystem().getInteger(id));
        } catch (Exception ignored) { }
        try {
            int cur = Settings.System.getInt(c.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS);
            while (cur > max) max = max * 2 + 1;
        } catch (Exception ignored) { }
        SharedPreferences p = c.getSharedPreferences(PREFS, 0);
        int seen = p.getInt("bmax", 0);
        if (seen > max) max = seen; else if (max > seen) p.edit().putInt("bmax", max).apply();
        return max;
    }

    static JSONObject state(Context c) {
        JSONObject o = new JSONObject();
        try {
            int max = brightnessMax(c);
            int b = Settings.System.getInt(c.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, -1);
            o.put("brightness", b < 0 ? JSONObject.NULL : Math.max(1, Math.round(b * 100f / max)));
            o.put("autoBrightness", Settings.System.getInt(c.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS_MODE, 0) == 1);
            o.put("timeout", Settings.System.getInt(c.getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, 30000) / 1000);
            AudioManager am = c.getSystemService(AudioManager.class);
            int r = am.getRingerMode();
            o.put("ringer", r == AudioManager.RINGER_MODE_SILENT ? "silent" : r == AudioManager.RINGER_MODE_VIBRATE ? "vibrate" : "normal");
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            o.put("dnd", nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL);
            o.put("anim", (double) Settings.Global.getFloat(c.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f));
            WifiManager wm = c.getApplicationContext().getSystemService(WifiManager.class);
            o.put("wifi", wm != null && wm.isWifiEnabled());
            PowerManager pm = c.getSystemService(PowerManager.class);
            o.put("saver", pm != null && pm.isPowerSaveMode());
        } catch (Exception ignored) { }
        return o;
    }

    // ---------- Tek ayar uygula ----------
    /** Sonuç: {key, label, ok, msg, need?} need = "write" | "dnd" | "shizuku" */
    static JSONObject set(Context c, String key, Object v) {
        JSONObject r = new JSONObject();
        try {
            r.put("key", key);
            r.put("label", label(key, v));
            switch (key) {
                case "brightness": brightness(c, v, r); break;
                case "timeout": timeout(c, v, r); break;
                case "ringer": ringer(c, String.valueOf(v), r); break;
                case "dnd": dnd(c, Boolean.TRUE.equals(v) || "true".equals(String.valueOf(v)), r); break;
                case "anim": anim(c, Double.parseDouble(String.valueOf(v)), r); break;
                case "wifi": shellToggle(c, r, bool(v) ? "svc wifi enable" : "svc wifi disable"); break;
                case "bt": shellToggle(c, r, bool(v) ? "svc bluetooth enable || cmd bluetooth_manager enable"
                        : "svc bluetooth disable || cmd bluetooth_manager disable"); break;
                case "saver": saver(c, bool(v), r); break;
                default: fail(r, "Bilinmeyen ayar", null);
            }
        } catch (Exception e) {
            try { fail(r, "Hata: " + e.getMessage(), null); } catch (Exception ignored) { }
        }
        return r;
    }

    private static boolean bool(Object v) { return Boolean.TRUE.equals(v) || "true".equals(String.valueOf(v)); }

    private static void ok(JSONObject r, String msg) throws Exception { r.put("ok", true); r.put("msg", msg); }

    private static void fail(JSONObject r, String msg, String need) throws Exception {
        r.put("ok", false); r.put("msg", msg); if (need != null) r.put("need", need);
    }

    private static void brightness(Context c, Object v, JSONObject r) throws Exception {
        if (!canWrite(c)) { fail(r, "\"Sistem ayarlarını değiştirme\" izni gerekli", "write"); return; }
        if ("auto".equals(String.valueOf(v))) {
            Settings.System.putInt(c.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS_MODE, 1);
            ok(r, "Otomatik parlaklık açıldı");
            return;
        }
        int pct = Math.max(1, Math.min(100, (int) Math.round(Double.parseDouble(String.valueOf(v)))));
        int max = brightnessMax(c);
        Settings.System.putInt(c.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS_MODE, 0);
        Settings.System.putInt(c.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, Math.max(1, Math.round(max * pct / 100f)));
        ok(r, "Parlaklık %" + pct);
    }

    private static void timeout(Context c, Object v, JSONObject r) throws Exception {
        if (!canWrite(c)) { fail(r, "\"Sistem ayarlarını değiştirme\" izni gerekli", "write"); return; }
        int sec = (int) Double.parseDouble(String.valueOf(v));
        Settings.System.putInt(c.getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, sec * 1000);
        int back = Settings.System.getInt(c.getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, -1);
        if (back == sec * 1000) ok(r, "Ekran " + human(sec) + " sonra kapanacak");
        else fail(r, "Telefon bu süreyi kabul etmedi", null);
    }

    private static void ringer(Context c, String v, JSONObject r) throws Exception {
        AudioManager am = c.getSystemService(AudioManager.class);
        int mode = "silent".equals(v) ? AudioManager.RINGER_MODE_SILENT
                : "vibrate".equals(v) ? AudioManager.RINGER_MODE_VIBRATE : AudioManager.RINGER_MODE_NORMAL;
        try {
            am.setRingerMode(mode);
        } catch (SecurityException e) {
            fail(r, "\"Rahatsız etmeyin erişimi\" izni gerekli", "dnd");
            return;
        }
        if (am.getRingerMode() == mode) ok(r, "Zil: " + ("silent".equals(v) ? "sessiz" : "vibrate".equals(v) ? "titreşim" : "normal"));
        else if (!dndAccess(c)) fail(r, "\"Rahatsız etmeyin erişimi\" izni gerekli", "dnd");
        else fail(r, "Telefon zil modunu değiştirmedi", null);
    }

    private static void dnd(Context c, boolean on, JSONObject r) throws Exception {
        if (!dndAccess(c)) { fail(r, "\"Rahatsız etmeyin erişimi\" izni gerekli", "dnd"); return; }
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        nm.setInterruptionFilter(on ? NotificationManager.INTERRUPTION_FILTER_PRIORITY : NotificationManager.INTERRUPTION_FILTER_ALL);
        ok(r, on ? "Rahatsız etmeyin açıldı" : "Rahatsız etmeyin kapandı");
    }

    private static void anim(Context c, double v, JSONObject r) throws Exception {
        String s = String.format(Locale.US, "%.2f", v);
        if (secure(c)) {
            try {
                Settings.Global.putFloat(c.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, (float) v);
                Settings.Global.putFloat(c.getContentResolver(), Settings.Global.TRANSITION_ANIMATION_SCALE, (float) v);
                Settings.Global.putFloat(c.getContentResolver(), Settings.Global.WINDOW_ANIMATION_SCALE, (float) v);
                ok(r, "Animasyon hızı " + animName(v));
                return;
            } catch (SecurityException ignored) { }
        }
        if (!ShizukuHelper.ready()) { fail(r, "Android bunu normal uygulamalara izin vermiyor; Shizuku gerekli", "shizuku"); return; }
        String[] res = ShizukuHelper.run("settings put global animator_duration_scale " + s
                + " && settings put global transition_animation_scale " + s
                + " && settings put global window_animation_scale " + s);
        float back = Settings.Global.getFloat(c.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, -1f);
        if (Math.abs(back - v) < 0.01) ok(r, "Animasyon hızı " + animName(v));
        else fail(r, "Shizuku komutu başarısız: " + (res == null ? "" : res[1]), null);
    }

    private static void saver(Context c, boolean on, JSONObject r) throws Exception {
        if (!ShizukuHelper.ready()) { fail(r, "Android bunu normal uygulamalara izin vermiyor; Shizuku gerekli", "shizuku"); return; }
        ShizukuHelper.run("settings put global low_power " + (on ? 1 : 0) + " 2>&1; cmd power set-mode " + (on ? 1 : 0) + " 2>&1");
        try { Thread.sleep(600); } catch (InterruptedException ignored) { }
        PowerManager pm = c.getSystemService(PowerManager.class);
        if (pm.isPowerSaveMode() == on) ok(r, on ? "Pil tasarrufu açıldı" : "Pil tasarrufu kapandı");
        else fail(r, "Bu telefon sistem pil tasarrufunu komutla değiştirmeye izin vermedi (Xiaomi kendi pil modunu kullanıyor olabilir)", null);
    }

    private static void shellToggle(Context c, JSONObject r, String cmd) throws Exception {
        if (!ShizukuHelper.ready()) {
            fail(r, "Android 10+ uygulamaların Wi-Fi/Bluetooth'u doğrudan açıp kapatmasına izin vermiyor; Shizuku gerekli (ya da paneli aç)", "shizuku");
            return;
        }
        String[] res = ShizukuHelper.run(cmd);
        if (res != null && "0".equals(res[0])) ok(r, "Komut uygulandı");
        else fail(r, "Komut başarısız: " + (res == null ? "" : res[1]), null);
    }

    // ---------- Etiketler ----------
    static String human(int sec) {
        if (sec < 60) return sec + " sn";
        if (sec < 3600) return (sec / 60) + " dk";
        return (sec / 3600) + " sa";
    }

    static String animName(double v) {
        if (v == 0) return "kapalı";
        return String.format(Locale.US, "%sx", (v == Math.floor(v)) ? String.valueOf((int) v) : String.valueOf(v)).replace('.', ',');
    }

    static String label(String key, Object v) {
        switch (key) {
            case "brightness": return "Parlaklık";
            case "timeout": return "Ekran zaman aşımı";
            case "ringer": return "Zil modu";
            case "dnd": return "Rahatsız etmeyin";
            case "anim": return "Animasyon hızı";
            case "wifi": return "Wi-Fi";
            case "bt": return "Bluetooth";
            case "saver": return "Pil tasarrufu";
            default: return key;
        }
    }

    // ---------- Modlar ----------
    static final String[] ORDER = {"brightness", "timeout", "ringer", "dnd", "anim", "wifi", "bt", "saver"};

    static JSONArray defaultModes() {
        try {
            return new JSONArray("["
                    + "{\"id\":\"gece\",\"name\":\"Gece modu\",\"emoji\":\"🌙\",\"set\":{\"brightness\":8,\"timeout\":30,\"ringer\":\"vibrate\",\"dnd\":true}},"
                    + "{\"id\":\"pil\",\"name\":\"Pil tasarrufu\",\"emoji\":\"🔋\",\"set\":{\"brightness\":30,\"timeout\":30,\"anim\":0.5}},"
                    + "{\"id\":\"oyun\",\"name\":\"Oyun modu\",\"emoji\":\"🎮\",\"set\":{\"brightness\":100,\"timeout\":600,\"dnd\":true,\"anim\":0.5}},"
                    + "{\"id\":\"normal\",\"name\":\"Normal\",\"emoji\":\"☀️\",\"set\":{\"brightness\":\"auto\",\"timeout\":60,\"ringer\":\"normal\",\"dnd\":false,\"anim\":1}}"
                    + "]");
        } catch (Exception e) { return new JSONArray(); }
    }

    static JSONArray modes(Context c) {
        String s = c.getSharedPreferences(PREFS, 0).getString("modes", null);
        if (s != null) try { return new JSONArray(s); } catch (Exception ignored) { }
        return defaultModes();
    }

    static void saveModes(Context c, JSONArray modes) {
        c.getSharedPreferences(PREFS, 0).edit().putString("modes", modes.toString()).apply();
    }

    static JSONObject findMode(Context c, String id) {
        JSONArray a = modes(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject m = a.optJSONObject(i);
            if (m != null && id.equals(m.optString("id"))) return m;
        }
        return null;
    }

    /** Kutucuk yuvası (1-3) → mod kimliği. Varsayılan: gece, pil, oyun. */
    static String tileMode(Context c, int slot) {
        String def = slot == 1 ? "gece" : slot == 2 ? "pil" : "oyun";
        return c.getSharedPreferences(PREFS, 0).getString("tile" + slot, def);
    }

    static void setTileMode(Context c, int slot, String id) {
        c.getSharedPreferences(PREFS, 0).edit().putString("tile" + slot, id).apply();
    }

    static String lastMode(Context c) { return c.getSharedPreferences(PREFS, 0).getString("lastMode", ""); }

    static JSONObject applyMode(Context c, JSONObject mode) {
        JSONObject out = new JSONObject();
        JSONArray res = new JSONArray();
        int okCount = 0, failCount = 0;
        JSONObject set = mode.optJSONObject("set");
        if (set != null) {
            for (String k : ORDER) {
                if (!set.has(k) || set.isNull(k)) continue;
                JSONObject r = set(c, k, set.opt(k));
                res.put(r);
                if (r.optBoolean("ok")) okCount++; else failCount++;
            }
        }
        c.getSharedPreferences(PREFS, 0).edit().putString("lastMode", mode.optString("id")).apply();
        try {
            out.put("name", mode.optString("name"));
            out.put("results", res);
            out.put("ok", okCount);
            out.put("failed", failCount);
        } catch (Exception ignored) { }
        return out;
    }
}
