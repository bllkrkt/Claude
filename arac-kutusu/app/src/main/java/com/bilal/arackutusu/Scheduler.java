package com.bilal.arackutusu;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Zamanlanmış modlar: seçilen saatte ve günlerde modu otomatik uygular, bildirim gösterir.
 * Telefon yeniden başlayınca alarmlar tekrar kurulur. Xiaomi'de "Otomatik başlatma" açık olmalı.
 */
public class Scheduler extends BroadcastReceiver {
    static final String ACTION = "com.bilal.arackutusu.ZAMANLAYICI";
    static final String CH = "zamanlayici";

    static JSONArray list(Context c) {
        try { return new JSONArray(c.getSharedPreferences(Toggles.PREFS, 0).getString("schedules", "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    static void save(Context c, JSONArray a) {
        c.getSharedPreferences(Toggles.PREFS, 0).edit().putString("schedules", a.toString()).apply();
        rescheduleAll(c);
    }

    private static PendingIntent pi(Context c, String id) {
        Intent i = new Intent(c, Scheduler.class).setAction(ACTION).putExtra("id", id);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean exactAllowed(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
    }

    static void rescheduleAll(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        android.content.SharedPreferences p = c.getSharedPreferences(Toggles.PREFS, 0);
        // Önce eski alarmları iptal et
        for (String old : p.getString("schedIds", "").split(",")) if (!old.isEmpty()) am.cancel(pi(c, old));
        JSONArray a = list(c);
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < a.length(); i++) {
            JSONObject s = a.optJSONObject(i);
            if (s == null) continue;
            String id = s.optString("id");
            ids.append(id).append(',');
            if (!s.optBoolean("on", true)) continue;
            long t = next(s);
            if (t <= 0) continue;
            if (exactAllowed(c)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi(c, id));
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi(c, id));
        }
        // Hatırlatıcılar (ilaç, sulama, fatura…)
        JSONArray r = reminders(c);
        for (int i = 0; i < r.length(); i++) {
            JSONObject s = r.optJSONObject(i);
            if (s == null) continue;
            String id = "r:" + s.optString("id");
            ids.append(id).append(',');
            if (!s.optBoolean("on", true)) continue;
            long t = next(s);
            if (t <= 0) continue;
            if (exactAllowed(c)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi(c, id));
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi(c, id));
        }
        p.edit().putString("schedIds", ids.toString()).apply();
    }

    /** Sonraki tetiklenme zamanı. days: 1=Pazartesi … 7=Pazar; boşsa her gün. */
    static long next(JSONObject s) {
        JSONArray days = s.optJSONArray("days");
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.set(Calendar.HOUR_OF_DAY, s.optInt("h"));
        cal.set(Calendar.MINUTE, s.optInt("m"));
        long now = System.currentTimeMillis();
        for (int k = 0; k < 8; k++) {
            if (cal.getTimeInMillis() > now + 1000) {
                int dow = (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7 + 1; // Pazartesi=1
                boolean ok = days == null || days.length() == 0;
                if (!ok) for (int j = 0; j < days.length(); j++) if (days.optInt(j) == dow) { ok = true; break; }
                if (ok) return cal.getTimeInMillis();
            }
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }
        return -1;
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(a)
                || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
            rescheduleAll(c);
            if (ChargeService.enabled(c)) try { c.startForegroundService(new Intent(c, ChargeService.class)); } catch (Exception ignored) { }
            StatusWidget.updateAll(c);
            return;
        }
        if (!ACTION.equals(a)) return;
        final PendingResult pr = goAsync();
        final Context app = c.getApplicationContext();
        final String id = intent.getStringExtra("id");
        if (id != null && id.startsWith("r:")) {
            try {
                JSONArray r = reminders(app);
                for (int i = 0; i < r.length(); i++) {
                    JSONObject s = r.getJSONObject(i);
                    if (!("r:" + s.optString("id")).equals(id)) continue;
                    remind(app, s);
                    if (s.optBoolean("once")) { s.put("on", false); app.getSharedPreferences(Toggles.PREFS, 0).edit().putString("reminders", r.toString()).apply(); }
                }
            } catch (Exception ignored) { }
            rescheduleAll(app);
            pr.finish();
            return;
        }
        new Thread(() -> {
            try {
                JSONArray l = list(app);
                for (int i = 0; i < l.length(); i++) {
                    JSONObject s = l.optJSONObject(i);
                    if (s == null || !s.optString("id").equals(id)) continue;
                    JSONObject m = Toggles.findMode(app, s.optString("mode"));
                    if (m != null) {
                        JSONObject r = Toggles.applyMode(app, m);
                        int failed = r.optInt("failed");
                        notify(app, (m.optString("emoji") + " " + m.optString("name")).trim() + " otomatik uygulandı",
                                failed > 0 ? failed + " ayar izin olmadığı için atlandı. Ayrıntı için uygulamayı aç." : "Zamanlayıcı: "
                                        + String.format("%02d:%02d", s.optInt("h"), s.optInt("m")));
                    }
                }
            } finally {
                rescheduleAll(app);
                pr.finish();
            }
        }).start();
    }

    static JSONArray reminders(Context c) {
        try { return new JSONArray(c.getSharedPreferences(Toggles.PREFS, 0).getString("reminders", "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    static void saveReminders(Context c, JSONArray a) {
        c.getSharedPreferences(Toggles.PREFS, 0).edit().putString("reminders", a.toString()).apply();
        rescheduleAll(c);
    }

    static void remind(Context c, JSONObject s) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel("hatirlatici") == null) {
            NotificationChannel ch = new NotificationChannel("hatirlatici", "Hatırlatıcılar", NotificationManager.IMPORTANCE_HIGH);
            ch.enableVibration(true);
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        String note = s.optString("note");
        Notification n = new Notification.Builder(c, "hatirlatici")
                .setSmallIcon(R.drawable.ic_tile)
                .setContentTitle((s.optString("emoji", "⏰") + " " + s.optString("text")).trim())
                .setContentText(note.isEmpty() ? String.format("%02d:%02d hatırlatıcısı", s.optInt("h"), s.optInt("m")) : note)
                .setAutoCancel(true)
                .setContentIntent(PendingIntent.getActivity(c, 5, open, PendingIntent.FLAG_IMMUTABLE))
                .build();
        try { nm.notify(1000 + Math.abs(s.optString("id").hashCode() % 100000), n); } catch (SecurityException ignored) { }
    }

    static void notify(Context c, String title, String body) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CH) == null)
            nm.createNotificationChannel(new NotificationChannel(CH, "Zamanlanmış modlar", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        Notification n = new Notification.Builder(c, CH)
                .setSmallIcon(R.drawable.ic_tile)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(PendingIntent.getActivity(c, 1, open, PendingIntent.FLAG_IMMUTABLE))
                .build();
        try { nm.notify(42, n); } catch (SecurityException ignored) { }
    }

    // ---------------- Ana ekran kısayolları ----------------
    static Intent modeIntent(Context c, String id) {
        return new Intent(c, ApplyModeActivity.class).setAction(Intent.ACTION_VIEW).putExtra("mode", id)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    }

    private static ShortcutInfo shortcut(Context c, JSONObject m) {
        String name = (m.optString("emoji") + " " + m.optString("name")).trim();
        return new ShortcutInfo.Builder(c, "mod-" + m.optString("id"))
                .setShortLabel(name.length() > 24 ? name.substring(0, 24) : name)
                .setLongLabel(m.optString("name") + " modunu uygula")
                .setIcon(Icon.createWithResource(c, R.mipmap.ic_launcher))
                .setIntent(modeIntent(c, m.optString("id")))
                .build();
    }

    /** Uygulama simgesine basılı tutunca çıkan menüye ilk 4 modu koyar. */
    static void updateDynamic(Context c) {
        try {
            ShortcutManager sm = c.getSystemService(ShortcutManager.class);
            JSONArray modes = Toggles.modes(c);
            List<ShortcutInfo> l = new ArrayList<>();
            for (int i = 0; i < modes.length() && l.size() < Math.min(4, sm.getMaxShortcutCountPerActivity()); i++)
                l.add(shortcut(c, modes.getJSONObject(i)));
            sm.setDynamicShortcuts(l);
        } catch (Exception ignored) { }
    }

    static boolean pin(Context c, String id) {
        try {
            ShortcutManager sm = c.getSystemService(ShortcutManager.class);
            JSONObject m = Toggles.findMode(c, id);
            if (m == null || !sm.isRequestPinShortcutSupported()) return false;
            return sm.requestPinShortcut(shortcut(c, m), null);
        } catch (Exception e) { return false; }
    }
}
