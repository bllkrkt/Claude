package com.bilal.efsaneavcisi;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;

/**
 * v28: oyun kapalıyken iki hatırlatma.
 *  1) Çıktıktan 8 saat sonra: "sen yokken" ganimet sınırı doldu.
 *  2) Ertesi gün akşam 19:00: günlük giriş ödülü hazır.
 * Oyuna dönünce ikisi de iptal edilir. Metinler oyunun dilinde (MainActivity.Bridge.notifTexts).
 */
public class GameAlarm extends BroadcastReceiver {
    static final String CH = "oyun";

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        try {
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CH) == null) {
                NotificationChannel ch = new NotificationChannel(CH, "Efsane Avcısı", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("Ganimet ve günlük ödül hatırlatmaları");
                nm.createNotificationChannel(ch);
            }
        } catch (Exception ignored) { }
    }

    private static PendingIntent pi(Context c, int id) {
        Intent i = new Intent(c, GameAlarm.class).putExtra("id", id);
        return PendingIntent.getBroadcast(c, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            long now = System.currentTimeMillis();
            am.set(AlarmManager.RTC_WAKEUP, now + 8L * 3600 * 1000, pi(c, 1));
            Calendar k = Calendar.getInstance();
            k.add(Calendar.DAY_OF_YEAR, 1);
            k.set(Calendar.HOUR_OF_DAY, 19); k.set(Calendar.MINUTE, 0); k.set(Calendar.SECOND, 0);
            am.set(AlarmManager.RTC_WAKEUP, k.getTimeInMillis(), pi(c, 2));
        } catch (Exception ignored) { }
    }

    static void cancelAll(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am != null) { am.cancel(pi(c, 1)); am.cancel(pi(c, 2)); }
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) { nm.cancel(1); nm.cancel(2); }
        } catch (Exception ignored) { }
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        try {
            int id = intent.getIntExtra("id", 1);
            SharedPreferences p = c.getSharedPreferences("oyun", Context.MODE_PRIVATE);
            String t = id == 1 ? p.getString("n1t", "Ganimetin doldu!") : p.getString("n2t", "Günlük ödülün hazır");
            String b = id == 1 ? p.getString("n1b", "Sen yokken kahramanın savaşmaya devam etti. Gel, topla!")
                               : p.getString("n2b", "Bugünün giriş ödülü seni bekliyor.");
            channel(c);
            Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent tap = PendingIntent.getActivity(c, 10 + id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder nb = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            nb.setSmallIcon(R.drawable.ic_notif).setContentTitle(t).setContentText(b)
              .setStyle(new Notification.BigTextStyle().bigText(b))
              .setAutoCancel(true).setContentIntent(tap).setColor(0xFFF2C35A);
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(id, nb.build());
        } catch (Exception ignored) { }
    }
}
