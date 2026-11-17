package com.bilal.efsaneavcisi;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Oyundan çıkınca kurulan yerel hatırlatmaları (hazine doldu, ücretsiz sandık, günlük ödül, sezon sonu) gösterir. */
public class NotifReceiver extends BroadcastReceiver {
    static final String CH = "oyun";

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CH) != null) return;
        NotificationChannel ch = new NotificationChannel(CH, "Oyun hatırlatmaları", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Hazine, sandık, günlük ödül ve sezon hatırlatmaları");
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onReceive(Context c, Intent in) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || !nm.areNotificationsEnabled()) return;
            channel(c);
            int id = in.getIntExtra("id", 1);
            Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 100 + id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            b.setSmallIcon(R.drawable.ic_stat)
                    .setColor(0xFFFFCF4A)
                    .setContentTitle(in.getStringExtra("t"))
                    .setContentText(in.getStringExtra("b"))
                    .setStyle(new Notification.BigTextStyle().bigText(in.getStringExtra("b")))
                    .setContentIntent(pi)
                    .setAutoCancel(true);
            nm.notify(id, b.build());
        } catch (Exception ignored) {
            // Bildirim gösterilemezse sessizce geç
        }
    }
}
