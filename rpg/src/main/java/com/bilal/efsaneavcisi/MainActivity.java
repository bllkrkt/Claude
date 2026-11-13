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

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0E0F1A);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        setContentView(web);

        // Kenardan kenara ekran: oyun durum/gezinme çubuğunun altında kalmasın
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars());
                top = i.top; bottom = i.bottom;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(0, top, 0, bottom);
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
