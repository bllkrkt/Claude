package com.bilal.arackutusu;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Ana ekran widget'ı: pil ve boş alan + kutucuklara atanmış 3 mod için tek dokunuş butonu. */
public class StatusWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, StatusWidget.class));
            if (ids.length > 0) for (int id : ids) m.updateAppWidget(id, views(c));
        } catch (Exception ignored) { }
    }

    static RemoteViews views(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        Intent b = c.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        int lv = b == null ? 0 : Math.round(b.getIntExtra(BatteryManager.EXTRA_LEVEL, 0) * 100f / b.getIntExtra(BatteryManager.EXTRA_SCALE, 100));
        boolean ch = b != null && b.getIntExtra(BatteryManager.EXTRA_STATUS, 0) == BatteryManager.BATTERY_STATUS_CHARGING;
        double t = b == null ? 0 : b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0;
        v.setTextViewText(R.id.w_batt, "%" + lv + (ch ? " ⚡" : ""));
        v.setTextViewText(R.id.w_info, Math.round(t) + "°C · " + (Cleaner.root().getUsableSpace() >> 30) + " GB boş");
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.w_head, PendingIntent.getActivity(c, 10, open, PendingIntent.FLAG_IMMUTABLE));
        int[] btn = {R.id.w_m1, R.id.w_m2, R.id.w_m3};
        String last = Toggles.lastMode(c);
        for (int i = 0; i < 3; i++) {
            JSONObject m = Toggles.findMode(c, Toggles.tileMode(c, i + 1));
            if (m == null) { v.setTextViewText(btn[i], "—"); continue; }
            String id = m.optString("id");
            v.setTextViewText(btn[i], (m.optString("emoji") + "\n" + m.optString("name")).trim());
            v.setInt(btn[i], "setBackgroundResource", id.equals(last) ? R.drawable.widget_btn_on : R.drawable.widget_btn);
            v.setOnClickPendingIntent(btn[i], PendingIntent.getActivity(c, 20 + i, Scheduler.modeIntent(c, id),
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        }
        return v;
    }
}
