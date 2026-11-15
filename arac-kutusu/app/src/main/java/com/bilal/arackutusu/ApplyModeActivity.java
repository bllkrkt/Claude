package com.bilal.arackutusu;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Toast;

import org.json.JSONObject;

/** Ana ekran kısayolu: arayüz açmadan modu uygular ve kapanır. */
public class ApplyModeActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        String id = getIntent().getStringExtra("mode");
        JSONObject m = id == null ? null : Toggles.findMode(this, id);
        if (m == null) {
            Toast.makeText(this, "Bu mod silinmiş. Kısayolu kaldırabilirsin.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        final android.content.Context app = getApplicationContext();
        new Thread(() -> {
            JSONObject r = Toggles.applyMode(app, m);
            int failed = r.optInt("failed");
            String msg = r.optString("name") + " uygulandı" + (failed > 0 ? " · " + failed + " ayar izin olmadığı için atlandı" : "");
            runOnUiThread(() -> {
                Toast.makeText(app, msg, Toast.LENGTH_LONG).show();
                finish();
            });
        }).start();
    }
}
