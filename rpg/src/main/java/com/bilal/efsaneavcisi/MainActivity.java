package com.bilal.efsaneavcisi;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.Display;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.view.WindowInsetsController;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONArray;
import org.json.JSONObject;
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
    private android.widget.FrameLayout root;
    /** Oyun sayfası hazır olana kadar sistem açılış ekranı kalsın (en fazla SPLASH_MAX ms). */
    private volatile boolean pageReady = false;
    private static final long SPLASH_MAX = 3500;
    private static final int NOTIF_REQ = 42;
    private static final int[] NOTIF_IDS = {1, 2, 3, 4};
    /** Tam ekran (sistem çubukları gizli, kenardan kaydırınca geçici görünür); oyun ayarından değişir. */
    private boolean immersive = true;
    private boolean highFps = true;
    private AudioManager audio;
    private AudioFocusRequest focusReq;
    private final AudioManager.OnAudioFocusChangeListener focusL = f -> {
        // Telefon araması, sesli mesaj vb. gelince oyun sesi susar; odak geri gelince açılır
        final boolean duck = f == AudioManager.AUDIOFOCUS_LOSS || f == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT;
        runOnUiThread(() -> js("window.__duck&&window.__duck(" + (duck ? 1 : 0) + ")"));
    };

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0E0F1A);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        // WebView kendi iç boşluğunu (padding) yok sayar; bu yüzden onu bir çerçeveye koyup boşluğu çerçeveye veriyoruz.
        // Böylece oyun saat/şarj çubuğunun ve alttaki gezinme çizgisinin altına girmez.
        root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(0xFF0E0F1A);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // Sayfa çizilmeye hazır olana kadar açılış ekranını tut (beyaz/boş kare görünmesin)
        final long t0 = SystemClock.uptimeMillis();
        root.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override public boolean onPreDraw() {
                if (pageReady || SystemClock.uptimeMillis() - t0 > SPLASH_MAX) {
                    root.getViewTreeObserver().removeOnPreDrawListener(this);
                    return true;
                }
                return false;
            }
        });
        root.postDelayed(() -> { pageReady = true; root.invalidate(); }, SPLASH_MAX);
        // Yerel uygulama hissi: uzun basma menüsü/metin seçimi yok, kaydırma çubuğu yok, titreşimi oyun yönetir
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);
        web.setHapticFeedbackEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        if (Build.VERSION.SDK_INT >= 26) web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        NotifReceiver.channel(this);
        applyImmersive();

        // Kenardan kenara ekran: durum çubuğu, gezinme çubuğu ve kamera çentiği boşlukları
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom, left = 0, right = 0;
            if (Build.VERSION.SDK_INT >= 30) {
                // Tam ekranda yalnızca kamera çentiği kadar boşluk: çubuklar kaydırınca belirse de oyun yerinden oynamaz
                android.graphics.Insets i = insets.getInsets(immersive ? WindowInsets.Type.displayCutout()
                        : WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                top = i.top; bottom = i.bottom; left = i.left; right = i.right;
            } else {
                if (immersive) {
                    top = 0; bottom = 0;
                    if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                        top = insets.getDisplayCutout().getSafeInsetTop(); bottom = insets.getDisplayCutout().getSafeInsetBottom();
                    }
                } else { top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom(); }
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
        // Android'in "koyu tema zorlaması" oyunun renklerini bozmasın
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING))
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(s, false);
        } catch (Throwable ignored) { }

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

    // Arka plana alınınca oyun durur; dönünce "sen yokken" kazancı hesaplanır
    @Override protected void onPause() {
        final WebView w = web;
        if (w != null) {
            try { w.evaluateJavascript("window.__pause&&window.__pause()", null); } catch (Exception ignored) { }
        }
        super.onPause();
        abandonFocusAudio();
        if (w != null) {
            try { w.onPause(); } catch (Exception ignored) { }
        }
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    @Override protected void onResume() {
        super.onResume();
        requestFocusAudio();
        try { ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).cancelAll(); } catch (Exception ignored) { }
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

    private void js(String code) {
        final WebView w = web;
        if (w == null) return;
        try { w.evaluateJavascript(code, null); } catch (Exception ignored) { }
    }

    /** Tam ekranı uygular ya da kaldırır; kenar boşlukları yeniden hesaplanır. */
    private void applyImmersive() {
        try {
            Window win = getWindow();
            if (Build.VERSION.SDK_INT >= 30) {
                win.setDecorFitsSystemWindows(false);
                WindowInsetsController c = win.getInsetsController();
                if (c != null) {
                    if (immersive) {
                        c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                        c.hide(WindowInsets.Type.systemBars());
                    } else c.show(WindowInsets.Type.systemBars());
                }
            } else {
                int f = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
                if (immersive) f |= View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
                win.getDecorView().setSystemUiVisibility(f);
            }
            if (root != null) root.requestApplyInsets();
        } catch (Exception ignored) { }
    }

    /** Ekranın desteklediği en yüksek yenileme hızını ister (90/120 Hz); kapalıysa sistem seçer. */
    private void applyHz() {
        try {
            Display d = Build.VERSION.SDK_INT >= 30 ? getDisplay() : getWindowManager().getDefaultDisplay();
            if (d == null) return;
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            int id = 0;
            if (highFps) {
                Display.Mode cur = d.getMode(), best = cur;
                for (Display.Mode m : d.getSupportedModes())
                    if (m.getPhysicalWidth() == cur.getPhysicalWidth() && m.getPhysicalHeight() == cur.getPhysicalHeight()
                            && m.getRefreshRate() > best.getRefreshRate()) best = m;
                id = best.getModeId();
            }
            if (lp.preferredDisplayModeId != id) { lp.preferredDisplayModeId = id; getWindow().setAttributes(lp); }
        } catch (Exception ignored) { }
    }

    private void requestFocusAudio() {
        try {
            if (audio == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                if (focusReq == null) focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                        .setWillPauseWhenDucked(false).setOnAudioFocusChangeListener(focusL).build();
                audio.requestAudioFocus(focusReq);
            } else audio.requestAudioFocus(focusL, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        } catch (Exception ignored) { }
    }

    private void abandonFocusAudio() {
        try {
            if (audio == null) return;
            if (Build.VERSION.SDK_INT >= 26) { if (focusReq != null) audio.abandonAudioFocusRequest(focusReq); }
            else audio.abandonAudioFocus(focusL);
        } catch (Exception ignored) { }
    }

    private Vibrator vibrator() {
        try {
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                return vm != null ? vm.getDefaultVibrator() : null;
            }
            return (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        } catch (Exception e) { return null; }
    }

    private PendingIntent notifPi(int id, String title, String body, int flags) {
        Intent i = new Intent(this, NotifReceiver.class).putExtra("id", id);
        if (title != null) i.putExtra("t", title).putExtra("b", body);
        return PendingIntent.getBroadcast(this, id, i, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code != NOTIF_REQ) return;
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        js("window.__notifRes&&window.__notifRes(" + ok + ")");
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
        /** Sayfa ilk kez çizildi: açılış ekranı kalkabilir. */
        @JavascriptInterface
        public void ready() {
            pageReady = true;
            runOnUiThread(() -> { if (root != null) root.invalidate(); });
        }

        @JavascriptInterface
        public void setImmersive(final boolean on) {
            runOnUiThread(() -> { if (isFinishing()) return; immersive = on; applyImmersive(); });
        }

        @JavascriptInterface
        public void setHighFps(final boolean on) {
            runOnUiThread(() -> { if (isFinishing()) return; highFps = on; applyHz(); });
        }

        /** Kısa dokunsal geri bildirim: 0 = tık (düğme), 1 = net tık, 2 = ağır vuruş. */
        @JavascriptInterface
        public void haptic(int kind) {
            Vibrator v = vibrator();
            if (v == null || !v.hasVibrator()) return;
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    v.vibrate(VibrationEffect.createPredefined(kind <= 0 ? VibrationEffect.EFFECT_TICK
                            : kind == 1 ? VibrationEffect.EFFECT_CLICK : VibrationEffect.EFFECT_HEAVY_CLICK));
                } else if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(kind <= 0 ? 8 : 18, kind >= 2 ? 255 : 120));
                else v.vibrate(kind <= 0 ? 8 : 18);
            } catch (Exception ignored) { }
        }

        /** Oyunun titreşim deseni ("40" ya da "40,40,120": titret, bekle, titret...). Kısa olanlar keskin tık olur. */
        @JavascriptInterface
        public void vibe(String csv) {
            Vibrator v = vibrator();
            if (v == null || !v.hasVibrator() || csv == null) return;
            try {
                String[] p = csv.split(",");
                long[] t = new long[p.length + 1];
                int[] a = new int[p.length + 1];
                for (int i = 0; i < p.length; i++) {
                    long ms = Math.max(0, Math.min(1000, Math.round(Double.parseDouble(p[i].trim()))));
                    t[i + 1] = ms;
                    // tek sıralar titreşim; uzun titreşim daha güçlü
                    a[i + 1] = i % 2 == 0 ? (int) Math.min(255, 90 + ms * 2) : 0;
                }
                if (p.length == 1 && t[1] <= 25 && Build.VERSION.SDK_INT >= 29) {
                    v.vibrate(VibrationEffect.createPredefined(t[1] <= 12 ? VibrationEffect.EFFECT_TICK : VibrationEffect.EFFECT_CLICK));
                } else if (Build.VERSION.SDK_INT >= 26) {
                    if (v.hasAmplitudeControl()) v.vibrate(VibrationEffect.createWaveform(t, a, -1));
                    else v.vibrate(VibrationEffect.createWaveform(t, -1));
                } else v.vibrate(t, -1);
            } catch (Exception ignored) { }
        }

        /** Bildirim izni: varsa true; Android 13+'ta yoksa izin penceresini açar ve false döner (sonuç __notifRes ile gelir). */
        @JavascriptInterface
        public boolean askNotif() {
            try {
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    runOnUiThread(() -> requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIF_REQ));
                    return false;
                }
                NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                return nm == null || nm.areNotificationsEnabled();
            } catch (Exception e) { return false; }
        }

        /** Hatırlatmaları kurar: [{id,at(ms),t,b}]; önce eskilerin hepsini iptal eder. "[]" = hepsini iptal. */
        @JavascriptInterface
        public void schedule(String json) {
            try {
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (am == null) return;
                for (int id : NOTIF_IDS) {
                    PendingIntent old = notifPi(id, null, null, PendingIntent.FLAG_NO_CREATE);
                    if (old != null) { am.cancel(old); old.cancel(); }
                }
                JSONArray arr = new JSONArray(json == null ? "[]" : json);
                for (int i = 0; i < arr.length() && i < 8; i++) {
                    JSONObject o = arr.getJSONObject(i);
                    int id = o.optInt("id", 1);
                    long at = o.optLong("at", 0);
                    if (at <= System.currentTimeMillis()) continue;
                    am.set(AlarmManager.RTC, at, notifPi(id, o.optString("t"), o.optString("b"), PendingIntent.FLAG_UPDATE_CURRENT));
                }
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
