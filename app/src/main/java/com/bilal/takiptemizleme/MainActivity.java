package com.bilal.takiptemizleme;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.view.WindowInsetsController;

import androidx.webkit.WebViewAssetLoader;

import android.content.ClipData;
import android.database.Cursor;
import android.provider.OpenableColumns;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/assets/index.html";
    private static final int FILE_REQ = 41;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private final List<JSONObject> sharedFiles = new ArrayList<>();
    private volatile boolean pageReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0A0B0F);
        setContentView(webView);

        // Android 15 kenardan kenara ekran: içerik durum/gezinme çubuğunun altında kalmasın
        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                top = i.top; bottom = i.bottom;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(0, top, 0, bottom);
            return insets;
        });

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(APP_HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // localStorage — liste kalıcı kalır
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportMultipleWindows(false);

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (APP_HOST.equals(uri.getHost())) return false;
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*"); // .json dosyaları çoğu telefonda türsüz görünür
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(i, "JSON dosyası seç"), FILE_REQ);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);
        handleShareIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShareIntent(intent);
    }

    /**
     * "Paylaş" veya "Birlikte aç" ile gelen ZIP/JSON dosyalarından takip dosyalarını çıkarır.
     * Okuma arka planda yapılır: tüm medyayla indirilmiş yüzlerce MB'lık ZIP ekranı dondurmasın.
     */
    private void handleShareIntent(Intent intent) {
        if (intent == null) return;
        List<Uri> uris = new ArrayList<>();
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action) && intent.getData() != null) uris.add(intent.getData());
        else if (Intent.ACTION_SEND.equals(action)) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (u != null) uris.add(u);
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) uris.addAll(list);
        }
        if (uris.isEmpty()) return;
        intent.setAction(Intent.ACTION_MAIN); // döndürünce tekrar işlenmesin
        Toast.makeText(this, "Dosya okunuyor…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            int found = 0;
            for (Uri u : uris) {
                try { found += extract(u); } catch (Exception ignored) { }
            }
            final int n = found;
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) return;
                if (n == 0) Toast.makeText(this, "Dosyada takip bilgisi bulunamadı", Toast.LENGTH_LONG).show();
                // Sayfa hazır değilse açılışta kendisi alır (takeSharedFiles).
                else if (pageReady) webView.evaluateJavascript("window.__onShared && window.__onShared()", null);
            });
        }, "share-reader").start();
    }

    private int extract(Uri uri) throws Exception {
        String name = displayName(uri);
        boolean zip = name.toLowerCase().endsWith(".zip");
        if (!zip) {
            String type = getContentResolver().getType(uri);
            zip = type != null && type.contains("zip");
        }
        int n = 0;
        if (zip) {
            try (InputStream in = getContentResolver().openInputStream(uri);
                 ZipInputStream zin = new ZipInputStream(in)) {
                ZipEntry e;
                while ((e = zin.getNextEntry()) != null) {
                    String base = e.getName().toLowerCase();
                    base = base.substring(base.lastIndexOf('/') + 1);
                    if (base.matches("(following(_\\d+)?|followers(_\\d+)?|pending_follow_requests)\\.json")) {
                        addShared(e.getName(), readAll(zin));
                        n++;
                    }
                }
            }
        } else {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                addShared(name, readAll(in));
                n++;
            }
        }
        return n;
    }

    private void addShared(String name, String text) throws Exception {
        JSONObject o = new JSONObject();
        o.put("name", name);
        o.put("text", text);
        synchronized (sharedFiles) { sharedFiles.add(o); }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int r;
        while ((r = in.read(buf)) > 0) bo.write(buf, 0, r);
        return bo.toString("UTF-8");
    }

    private String displayName(Uri uri) {
        String n = uri.getLastPathSegment();
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) { String d = c.getString(0); if (d != null) n = d; }
        } catch (Exception ignored) { }
        return n == null ? "dosya" : n;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            // instagram:// açılamazsa (uygulama yoksa) web profiline düş
            if ("instagram".equals(uri.getScheme())) {
                String user = uri.getQueryParameter("username");
                if (user != null) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW,
                                Uri.parse("https://www.instagram.com/" + user + "/")));
                        return;
                    } catch (ActivityNotFoundException ignored) { }
                }
            }
            Toast.makeText(this, "Bağlantı açılamadı", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQ || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null && clip.getItemCount() > 0) {
                result = new Uri[clip.getItemCount()];
                for (int k = 0; k < clip.getItemCount(); k++) result[k] = clip.getItemAt(k).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        webView.saveState(out);
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("(window.__onBack && window.__onBack()) ? 1 : 0", r -> {
            if (!"1".equals(r)) MainActivity.super.onBackPressed();
        });
    }

    private void applyBars(int color, boolean light) {
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);
        getWindow().getDecorView().setBackgroundColor(color);
        webView.setBackgroundColor(color);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(light ? mask : 0, mask);
            }
        } else {
            View d = getWindow().getDecorView();
            int f = d.getSystemUiVisibility();
            f = light ? (f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            if (Build.VERSION.SDK_INT >= 26) f = light ? (f | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
            d.setSystemUiVisibility(f);
        }
    }

    /** Sayfadaki "Yedekle" butonu yedeği İndirilenler klasörüne bununla yazar. */
    private class Bridge {
        @JavascriptInterface
        public void setBars(String hex, boolean light) {
            runOnUiThread(() -> { try { applyBars(Color.parseColor(hex), light); } catch (Exception ignored) { } });
        }

        @JavascriptInterface
        public boolean ensureNotifications() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 51));
                return false;
            }
            return true;
        }

        @JavascriptInterface
        public void setReminder(boolean on, int h, int m, String title, String body) {
            ReminderReceiver.save(MainActivity.this, on, h, m, title, body);
            ReminderReceiver.ensureChannel(MainActivity.this);
            ReminderReceiver.schedule(MainActivity.this);
        }

        @JavascriptInterface
        public void updateWidget(boolean has, String day, int today, int limit, int left, int pct) {
            ProgressWidget.save(MainActivity.this, has, day, today, limit, left, pct);
        }

        @JavascriptInterface
        public boolean pinWidget() {
            try { return ProgressWidget.requestPin(MainActivity.this); } catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, title);
                i.putExtra(Intent.EXTRA_TEXT, text);
                try { startActivity(Intent.createChooser(i, title)); } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public String takeSharedFiles() {
            JSONArray a = new JSONArray();
            synchronized (sharedFiles) {
                for (JSONObject o : sharedFiles) a.put(o);
                sharedFiles.clear();
            }
            return a.toString();
        }

        @JavascriptInterface
        public String saveFile(String name, String content) {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(MediaStore.Downloads.MIME_TYPE, "application/json");
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
    }
}
