package com.bilal.arackutusu;

import android.os.Handler;
import android.os.Looper;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.widget.Toast;

import org.json.JSONObject;

/** Bildirim çubuğu kutucuğu: dokununca seçili modu uygular. 3 yuva vardır (Android kutucukları önceden tanımlı olmalı). */
public abstract class BaseTile extends TileService {
    abstract int slot();

    @Override
    public void onStartListening() { refresh(); }

    @Override
    public void onTileAdded() { refresh(); }

    void refresh() {
        Tile t = getQsTile();
        if (t == null) return;
        JSONObject m = Toggles.findMode(this, Toggles.tileMode(this, slot()));
        if (m == null) {
            t.setLabel("Mod seçilmedi");
            t.setState(Tile.STATE_UNAVAILABLE);
        } else {
            t.setLabel(m.optString("name"));
            t.setState(m.optString("id").equals(Toggles.lastMode(this)) ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
            if (android.os.Build.VERSION.SDK_INT >= 29) t.setSubtitle("Araç Kutusu");
        }
        t.updateTile();
    }

    @Override
    public void onClick() {
        final JSONObject m = Toggles.findMode(this, Toggles.tileMode(this, slot()));
        if (m == null) return;
        final Handler h = new Handler(Looper.getMainLooper());
        new Thread(() -> {
            JSONObject r = Toggles.applyMode(getApplicationContext(), m);
            int failed = r.optInt("failed");
            String msg = r.optString("name") + " uygulandı"
                    + (failed > 0 ? " · " + failed + " ayar izin olmadığı için atlandı (uygulamayı aç)" : "");
            h.post(() -> {
                Toast.makeText(getApplicationContext(), msg, Toast.LENGTH_LONG).show();
                refresh();
            });
        }).start();
    }
}
