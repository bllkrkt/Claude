package com.bilal.arackutusu;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;

/**
 * Şarj izleyici: açıkken bildirim çubuğunda durur, pil olaylarını dinler.
 * Şarj sınırına (ör. %80) gelince, pil azalınca ve aşırı ısınınca uyarır. Android bunu ancak
 * sürekli bir bildirimle yapmamıza izin veriyor; bu yüzden kalıcı bildirim var.
 */
public class ChargeService extends Service {
    static final String CH_RUN = "sarj_izleyici", CH_ALERT = "sarj_uyari";
    private BroadcastReceiver rec;
    private String lastAlert = "";

    static boolean enabled(Context c) { return c.getSharedPreferences(Toggles.PREFS, 0).getBoolean("chargeOn", false); }

    static void setEnabled(Context c, boolean on) {
        c.getSharedPreferences(Toggles.PREFS, 0).edit().putBoolean("chargeOn", on).apply();
        Intent i = new Intent(c, ChargeService.class);
        if (on) c.startForegroundService(i); else c.stopService(i);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CH_RUN, "Şarj izleyici (sürekli)", NotificationManager.IMPORTANCE_MIN));
        NotificationChannel al = new NotificationChannel(CH_ALERT, "Şarj uyarıları", NotificationManager.IMPORTANCE_HIGH);
        al.enableVibration(true);
        nm.createNotificationChannel(al);
        Notification n = running("Pil izleniyor");
        if (Build.VERSION.SDK_INT >= 34) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(7, n);
        rec = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) { onBattery(i); }
        };
        registerReceiver(rec, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!enabled(this)) { stopSelf(); return START_NOT_STICKY; }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (rec != null) try { unregisterReceiver(rec); } catch (Exception ignored) { }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) { return null; }

    private Notification running(String text) {
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return new Notification.Builder(this, CH_RUN)
                .setSmallIcon(R.drawable.ic_tile)
                .setContentTitle("Şarj izleyici")
                .setContentText(text)
                .setOngoing(true)
                .setContentIntent(PendingIntent.getActivity(this, 2, open, PendingIntent.FLAG_IMMUTABLE))
                .build();
    }

    private void onBattery(Intent b) {
        SharedPreferences p = getSharedPreferences(Toggles.PREFS, 0);
        int lv = Math.round(b.getIntExtra(BatteryManager.EXTRA_LEVEL, 0) * 100f / b.getIntExtra(BatteryManager.EXTRA_SCALE, 100));
        int st = b.getIntExtra(BatteryManager.EXTRA_STATUS, 0);
        boolean charging = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
        double temp = b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0;
        int limit = p.getInt("chargeLimit", 80), low = p.getInt("chargeLow", 20), hot = p.getInt("chargeHot", 45);

        // Pil geçmişi: seviye değiştikçe kaydet (son 7 gün)
        if (lv != p.getInt("histLast", -1)) {
            try {
                org.json.JSONArray h = new org.json.JSONArray(p.getString("battHist", "[]"));
                long now = System.currentTimeMillis();
                h.put(new org.json.JSONArray().put(now).put(lv).put(charging ? 1 : 0).put(temp));
                org.json.JSONArray k = new org.json.JSONArray();
                for (int i = Math.max(0, h.length() - 1500); i < h.length(); i++)
                    if (now - h.getJSONArray(i).getLong(0) < 7 * 86400000L) k.put(h.get(i));
                p.edit().putString("battHist", k.toString()).putInt("histLast", lv).apply();
            } catch (Exception ignored) { }
        }
        getSystemService(NotificationManager.class).notify(7, running("%" + lv + (charging ? " · şarj oluyor" : "") + " · " + temp + " °C"
                + (charging ? " · sınır %" + limit : "")));

        String key = null, title = null, body = null;
        if (charging && lv >= limit) { key = "limit"; title = "Pil %" + lv + " oldu"; body = "Şarj aletini çıkarabilirsin. Pili %" + limit + "'de tutmak ömrünü uzatır."; }
        else if (!charging && lv <= low) { key = "low"; title = "Pil azaldı: %" + lv; body = "Şarja tak veya Pil tasarrufu modunu aç."; }
        if (temp >= hot) { key = "hot"; title = "Pil çok sıcak: " + temp + " °C"; body = "Telefonu kılıfından çıkar, oyun/şarjı bir süre durdur, güneşten uzak tut."; }
        if (key == null) { lastAlert = ""; return; }
        if (key.equals(lastAlert)) return; // aynı uyarıyı tekrar tekrar gönderme
        lastAlert = key;
        Notification n = new Notification.Builder(this, CH_ALERT)
                .setSmallIcon(R.drawable.ic_tile).setContentTitle(title).setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body)).setAutoCancel(true).build();
        try { getSystemService(NotificationManager.class).notify(8, n); } catch (SecurityException ignored) { }
        StatusWidget.updateAll(this);
    }
}
