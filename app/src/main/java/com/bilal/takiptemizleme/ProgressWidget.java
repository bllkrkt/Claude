package com.bilal.takiptemizleme;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Ana ekran widget'ı: bugün bırakılan / günlük limit, hedefe kalan ve ilerleme çubuğu. Veriyi sayfa (JS) gönderir. */
public class ProgressWidget extends AppWidgetProvider {
    private static final String PREFS = "widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        render(ctx, mgr, ids);
    }

    static void save(Context ctx, boolean has, String day, int today, int limit, int left, int pct) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean("has", has).putString("day", day).putInt("today", today)
                .putInt("limit", limit).putInt("left", left).putInt("pct", pct).apply();
        refresh(ctx);
    }

    static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        if (mgr == null) return;
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, ProgressWidget.class));
        if (ids != null && ids.length > 0) render(ctx, mgr, ids);
    }

    /** Ana ekrana widget ekleme penceresini açar (Android 8+ ve destekleyen başlatıcılar). */
    static boolean requestPin(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return false;
        AppWidgetManager mgr = ctx.getSystemService(AppWidgetManager.class);
        if (mgr == null || !mgr.isRequestPinAppWidgetSupported()) return false;
        return mgr.requestPinAppWidget(new ComponentName(ctx, ProgressWidget.class), null, null);
    }

    private static void render(Context ctx, AppWidgetManager mgr, int[] ids) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean has = p.getBoolean("has", false);
        String todayKey = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        int today = todayKey.equals(p.getString("day", "")) ? p.getInt("today", 0) : 0; // gece yarısı sıfırlanır
        int limit = p.getInt("limit", 0), left = p.getInt("left", -1), pct = p.getInt("pct", 0);

        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget);
        if (!has) {
            v.setTextViewText(R.id.w_big, "–");
            v.setTextViewText(R.id.w_sub, "bugün");
            v.setTextViewText(R.id.w_left, "Başlamak için dokun");
            v.setProgressBar(R.id.w_bar, 100, 0, false);
        } else {
            v.setTextViewText(R.id.w_big, limit > 0 ? today + " / " + limit : String.valueOf(today));
            v.setTextViewText(R.id.w_sub, limit > 0 && today >= limit ? "bugünlük limit doldu" : "bugün bırakılan");
            v.setTextViewText(R.id.w_left, left < 0 ? "Hedef için takipçi sayın gerekli"
                    : left == 0 ? "Hedefe ulaştın 🎉" : "Hedefe " + left + " kişi · %" + pct);
            v.setProgressBar(R.id.w_bar, 100, Math.max(0, Math.min(100, pct)), false);
        }
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 9, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.w_root, pi);
        mgr.updateAppWidget(ids, v);
    }
}
