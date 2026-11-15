package com.bilal.arackutusu;

import android.content.SharedPreferences;
import android.provider.Settings;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.widget.Toast;

/** "Kafein": ekran zaman aşımını geçici olarak 30 dakikaya çıkarır; tekrar dokununca eski değere döner. */
public class CaffeineTile extends TileService {
    static final int LONG = 30 * 60 * 1000;

    @Override
    public void onStartListening() { refresh(); }

    private boolean active() { return getSharedPreferences(Toggles.PREFS, 0).getInt("caffeineOld", -1) >= 0; }

    private void refresh() {
        Tile t = getQsTile();
        if (t == null) return;
        t.setLabel("Kafein");
        t.setState(active() ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        if (android.os.Build.VERSION.SDK_INT >= 29) t.setSubtitle(active() ? "Ekran 30 dk açık" : "Kapalı");
        t.updateTile();
    }

    @Override
    public void onClick() {
        if (!Settings.System.canWrite(this)) {
            Toast.makeText(this, "Araç Kutusu'nu aç → Tek tık ayarlar → \"Sistem ayarlarını değiştirme\" iznini ver", Toast.LENGTH_LONG).show();
            return;
        }
        SharedPreferences p = getSharedPreferences(Toggles.PREFS, 0);
        int old = p.getInt("caffeineOld", -1);
        if (old >= 0) {
            Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, old);
            p.edit().remove("caffeineOld").apply();
            Toast.makeText(this, "Kafein kapandı: ekran zaman aşımı eski haline döndü", Toast.LENGTH_SHORT).show();
        } else {
            int cur = Settings.System.getInt(getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, 30000);
            p.edit().putInt("caffeineOld", cur).apply();
            Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, LONG);
            Toast.makeText(this, "Kafein açık: ekran 30 dakika kapanmayacak", Toast.LENGTH_SHORT).show();
        }
        refresh();
    }
}
