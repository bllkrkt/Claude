package com.bilal.efsaneavcisi;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowInsetsController;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;

/** Oyunun tamamı assets/index.html içinde; bu sınıf onu tam ekran gösteren kabuk + küçük bir JS köprüsü. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int FILE_REQ = 41;
    /** Çökme sonrası art arda yeniden kurmayı sınırlamak için: bu süre içinde ikinci çökmede uygulama kapanır. */
    private static final long RECREATE_GAP_MS = 10000;
    /** Son yeniden kurmanın zamanı (elapsedRealtime); 0 = hiç olmadı. Activity yeniden kurulsa da kalsın diye static. */
    private static long lastRecreate = 0;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    /** v28: oyun ilk karesini çizene kadar Android'in açılış ekranı ekranda kalır (boş/yarım sayfa görünmez). */
    private volatile boolean ready = false;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        try { vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE); } catch (Exception ignored) { }
        GameAlarm.cancelAll(this);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B090E);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        // WebView kendi iç boşluğunu (padding) yok sayar; bu yüzden onu bir çerçeveye koyup boşluğu çerçeveye veriyoruz.
        // Böylece oyun saat/şarj çubuğunun ve alttaki gezinme çizgisinin altına girmez.
        final android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(0xFF0B090E);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // Oyun hazır olana kadar (en çok 6 sn) çizimi beklet: bu sırada sistemin açılış ekranı görünür
        root.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override public boolean onPreDraw() {
                if (!ready) return false;
                root.getViewTreeObserver().removeOnPreDrawListener(this);
                return true;
            }
        });
        new Handler(Looper.getMainLooper()).postDelayed(() -> { ready = true; root.invalidate(); }, 6000);
        // Uzun basınca seçim/menü çıkmasın, kaydırma çubuğu görünmesin (oyun hissi)
        web.setOnLongClickListener(v -> true);
        web.setLongClickable(false);
        web.setHapticFeedbackEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        if (Build.VERSION.SDK_INT >= 26) web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        immersive();
        askNotifications();

        // Kenardan kenara ekran: durum çubuğu, gezinme çubuğu ve kamera çentiği boşlukları
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom, left = 0, right = 0;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                top = i.top; bottom = i.bottom; left = i.left; right = i.right;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(left, top, right, bottom);
            return insets;
        });

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // localStorage — oyun kaydı kalıcı
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setOffscreenPreRaster(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !HOST.equals(req.getUrl().getHost());
            }
            // 3B yoğunken bellek daralıp oyun ekranı çökerse uygulama kapanmasın: ekranı baştan kur.
            // Kayıt localStorage'da olduğu için ilerleme kaybolmaz.
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // Yok edilecek WebView'a artık kimse dokunmasın: önce alanı boşalt, ekrandan sök, sonra yok et
                if (web == view) web = null;
                closeFileCallback();
                detach(view);
                try { view.destroy(); } catch (Exception ignored) { }
                try {
                    long now = SystemClock.elapsedRealtime();
                    boolean loop = lastRecreate != 0 && now - lastRecreate < RECREATE_GAP_MS;
                    lastRecreate = now;
                    // Kısa sürede ikinci çökme: sonsuz yeniden kurma döngüsüne girme, uygulamayı kapat
                    if (loop) finish(); else recreate();
                } catch (Exception e) {
                    try { finish(); } catch (Exception ignored) { }
                }
                return true;
            }
        });

        // Yedek dosyasını geri yüklemek için dosya seçici
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Yedek dosyasını seç"), FILE_REQ);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQ || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    /** Tam ekran oyun modu: durum ve gezinme çubukları gizli; kenardan kaydırınca bir süreliğine görünür. */
    private void immersive() {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                getWindow().setDecorFitsSystemWindows(false);
                WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
            }
        } catch (Exception ignored) { }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    /** Android 13+ bildirim izni: bir kez sorulur. */
    private void askNotifications() {
        try {
            GameAlarm.channel(this);
            if (Build.VERSION.SDK_INT < 33) return;
            SharedPreferences p = getSharedPreferences("oyun", MODE_PRIVATE);
            if (p.getBoolean("bildirimSoruldu", false)) return;
            p.edit().putBoolean("bildirimSoruldu", true).apply();
            if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED)
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try { requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 77); } catch (Exception ignored) { }
                }, 4000);
        } catch (Exception ignored) { }
    }

    // Uygulamadan çıkınca bildirimler kurulur (ganimet doldu / günlük ödül), dönünce iptal edilir
    @Override protected void onStop() {
        super.onStop();
        GameAlarm.schedule(this);
    }
    @Override protected void onStart() {
        super.onStart();
        GameAlarm.cancelAll(this);
    }

    // Arka plana alınınca oyun durur; dönünce "sen yokken" kazancı hesaplanır
    @Override protected void onPause() {
        final WebView w = web;
        if (w != null) {
            try { w.evaluateJavascript("window.__pause&&window.__pause()", null); } catch (Exception ignored) { }
        }
        super.onPause();
        if (w != null) {
            try { w.onPause(); } catch (Exception ignored) { }
        }
    }
    @Override protected void onResume() {
        super.onResume();
        final WebView w = web;
        if (w == null) return;
        try {
            w.onResume();
            w.evaluateJavascript("window.__resume&&window.__resume()", null);
        } catch (Exception ignored) { }
    }

    @Override
    public void onBackPressed() {
        final WebView w = web;
        if (w == null) { moveTaskToBack(true); return; }
        try {
            w.evaluateJavascript("(window.__onBack&&window.__onBack())?'1':'0'", v -> {
                if (v == null || !v.contains("1")) moveTaskToBack(true);
            });
        } catch (Exception e) {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        closeFileCallback();
        final WebView w = web;
        web = null;
        if (w != null) {
            detach(w);
            try { w.destroy(); } catch (Exception ignored) { }
        }
        super.onDestroy();
    }

    /** Bekleyen dosya seçici isteği varsa boş sonuçla kapatır. */
    private void closeFileCallback() {
        final ValueCallback<Uri[]> cb = fileCallback;
        fileCallback = null;
        if (cb != null) {
            try { cb.onReceiveValue(null); } catch (Exception ignored) { }
        }
    }

    /** WebView'u ekrandaki ebeveyninden çıkarır. */
    private static void detach(WebView v) {
        if (v == null) return;
        try {
            ViewParent p = v.getParent();
            if (p instanceof ViewGroup) ((ViewGroup) p).removeView(v);
        } catch (Exception ignored) { }
    }

    private class Bridge {
        /** Oyun ilk ekranını hazırladı: açılış ekranı kalkar. */
        @JavascriptInterface
        public void ready() {
            runOnUiThread(() -> {
                ready = true;
                try { if (web != null && web.getParent() instanceof View) ((View) web.getParent()).invalidate(); } catch (Exception ignored) { }
            });
        }

        /** Gerçek titreşim motoru: "40" tek darbe, "30,40,60" bekle-titre-bekle dizisi. Süreye göre şiddet. */
        @JavascriptInterface
        public void vib(String pat) {
            try {
                final Vibrator v = vibrator;
                if (v == null || pat == null || pat.isEmpty() || !v.hasVibrator()) return;
                String[] a = pat.split(",");
                if (Build.VERSION.SDK_INT >= 26) {
                    if (a.length == 1) {
                        long ms = Math.max(5, Math.min(400, Long.parseLong(a[0].trim())));
                        int amp = (int) Math.min(255, 70 + ms * 3);
                        v.vibrate(VibrationEffect.createOneShot(ms, amp));
                    } else {
                        long[] t = new long[a.length + 1];
                        int[] amp = new int[a.length + 1];
                        t[0] = 0; amp[0] = 0;
                        for (int i = 0; i < a.length; i++) {
                            t[i + 1] = Math.max(1, Math.min(600, Long.parseLong(a[i].trim())));
                            amp[i + 1] = (i % 2 == 0) ? (int) Math.min(255, 90 + t[i + 1] * 2) : 0;
                        }
                        v.vibrate(VibrationEffect.createWaveform(t, amp, -1));
                    }
                } else {
                    long[] t = new long[a.length + 1];
                    for (int i = 0; i < a.length; i++) t[i + 1] = Long.parseLong(a[i].trim());
                    v.vibrate(a.length == 1 ? new long[]{0, t[1]} : t, -1);
                }
            } catch (Exception ignored) { }
        }

        /** Bildirim metinleri oyunun dilinde saklanır. */
        @JavascriptInterface
        public void notifTexts(String lootTitle, String lootBody, String dailyTitle, String dailyBody) {
            try {
                getSharedPreferences("oyun", MODE_PRIVATE).edit()
                        .putString("n1t", lootTitle).putString("n1b", lootBody)
                        .putString("n2t", dailyTitle).putString("n2b", dailyBody).apply();
            } catch (Exception ignored) { }
        }

        /** Yedeği İndirilenler klasörüne yazar; yazılan yeri döndürür, olmazsa boş metin. */
        @JavascriptInterface
        public String saveFile(String name, String content) {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(MediaStore.Downloads.MIME_TYPE, "text/plain");
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) return "";
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                        if (os == null) return "";
                        os.write(bytes);
                    }
                    return "İndirilenler/" + name;
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir == null) return "";
                    File f = new File(dir, name);
                    try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); }
                    return f.getAbsolutePath();
                }
            } catch (Exception e) {
                return "";
            }
        }

        /** Ekranı yalnızca savaş ekranındayken açık tutar (menülerde pil harcamasın). */
        @JavascriptInterface
        public void keepOn(final boolean on) {
            runOnUiThread(() -> {
                // Ekran çöküp kapanırken ya da Activity biterken gelen çağrıyı yok say
                if (web == null || isFinishing() || isDestroyed()) return;
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        /**
         * Bu uygulamanın saveFile ile yazdığı, adı prefix ile başlayan dosyalardan en yeni keep tanesini
         * bırakıp gerisini siler. Silinen dosya sayısını döndürür; hiçbir durumda hata fırlatmaz.
         */
        @JavascriptInterface
        public int pruneBackups(String prefix, int keep) {
            int deleted = 0;
            try {
                if (prefix == null || prefix.isEmpty() || keep < 1) return 0;
                if (Build.VERSION.SDK_INT >= 29) {
                    // İzin olmadığı için sorgu yalnızca bu uygulamanın oluşturduğu dosyaları döndürür
                    final Uri base = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                    ArrayList<Long> ids = new ArrayList<>();
                    try (Cursor c = getContentResolver().query(base,
                            new String[]{MediaStore.Downloads._ID, MediaStore.Downloads.DISPLAY_NAME,
                                    MediaStore.Downloads.DATE_ADDED},
                            MediaStore.Downloads.DISPLAY_NAME + " LIKE ?",
                            new String[]{prefix + "%"},
                            MediaStore.Downloads.DATE_ADDED + " DESC, " + MediaStore.Downloads._ID + " DESC")) {
                        if (c == null) return 0;
                        while (c.moveToNext()) {
                            String n = c.getString(1);
                            // LIKE içindeki % ve _ fazladan eşleşme getirebilir; adı burada kesin doğrula
                            if (n != null && n.startsWith(prefix)) ids.add(c.getLong(0));
                        }
                    }
                    for (int i = keep; i < ids.size(); i++) {
                        try {
                            if (getContentResolver().delete(ContentUris.withAppendedId(base, ids.get(i)), null, null) > 0)
                                deleted++;
                        } catch (Exception ignored) {
                            // Silinemeyen (ör. yetki hatası) dosyayı atla, diğerleriyle devam et
                        }
                    }
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir == null) return 0;
                    File[] all = dir.listFiles();
                    if (all == null) return 0;
                    ArrayList<File> list = new ArrayList<>();
                    for (File f : all) if (f.isFile() && f.getName().startsWith(prefix)) list.add(f);
                    // Sıralama sırasında değer değişmesin diye zamanları önce bir kez oku
                    final int n = list.size();
                    long[][] order = new long[n][2];
                    for (int i = 0; i < n; i++) { order[i][0] = list.get(i).lastModified(); order[i][1] = i; }
                    Arrays.sort(order, (a, b2) -> Long.compare(b2[0], a[0]));
                    for (int i = keep; i < n; i++) {
                        try {
                            if (list.get((int) order[i][1]).delete()) deleted++;
                        } catch (Exception ignored) { }
                    }
                }
            } catch (Throwable t) {
                // Ne olursa olsun JS tarafına hata sızmasın
            }
            return deleted;
        }
    }
}
