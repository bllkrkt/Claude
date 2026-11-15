package com.bilal.arackutusu;

import android.app.Notification;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Bildirim geçmişi: kullanıcı "Bildirim erişimi" verirse gelen bildirimlerin başlık ve metnini
 * SADECE bu telefonda saklar (son 1000). Silinen mesajları sonradan görmek için. Hiçbir yere gönderilmez.
 */
public class NotifLog extends NotificationListenerService {
    static final int MAX = 1000;

    static File file(Context c) { return new File(c.getFilesDir(), "bildirim-gecmisi.json"); }

    static boolean enabled(Context c) {
        String s = Settings.Secure.getString(c.getContentResolver(), "enabled_notification_listeners");
        return s != null && s.contains(new ComponentName(c, NotifLog.class).flattenToString());
    }

    static boolean paused(Context c) { return c.getSharedPreferences(Toggles.PREFS, 0).getBoolean("notifLogPaused", false); }

    static synchronized JSONArray read(Context c) {
        try { return new JSONArray(new String(Files.readAllBytes(file(c).toPath()), StandardCharsets.UTF_8)); }
        catch (Exception e) { return new JSONArray(); }
    }

    static synchronized void write(Context c, JSONArray a) {
        try (FileOutputStream o = new FileOutputStream(file(c))) { o.write(a.toString().getBytes(StandardCharsets.UTF_8)); }
        catch (Exception ignored) { }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (paused(this) || sbn.getPackageName().equals(getPackageName())) return;
            Notification n = sbn.getNotification();
            if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0 || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            Bundle x = n.extras;
            CharSequence title = x.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = x.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (text == null) text = x.getCharSequence(Notification.EXTRA_TEXT);
            if (title == null && text == null) return;
            String t = title == null ? "" : title.toString(), b = text == null ? "" : text.toString();
            String pkg = sbn.getPackageName();
            synchronized (NotifLog.class) {
                JSONArray a = read(this);
                // Aynı bildirimin güncellemelerini tekrar kaydetme
                for (int i = Math.max(0, a.length() - 30); i < a.length(); i++) {
                    JSONObject o = a.getJSONObject(i);
                    if (pkg.equals(o.optString("p")) && t.equals(o.optString("t")) && b.equals(o.optString("b"))) return;
                }
                String label = pkg;
                try { PackageManager pm = getPackageManager(); label = String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0))); } catch (Exception ignored) { }
                a.put(new JSONObject().put("p", pkg).put("a", label).put("t", t).put("b", b).put("at", sbn.getPostTime()));
                JSONArray out = new JSONArray();
                for (int i = Math.max(0, a.length() - MAX); i < a.length(); i++) out.put(a.get(i));
                write(this, out);
            }
        } catch (Exception ignored) { }
    }
}
