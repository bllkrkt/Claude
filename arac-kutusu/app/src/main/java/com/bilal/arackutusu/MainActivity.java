package com.bilal.arackutusu;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/index.html";

    WebView webView;
    private Bridge bridge;
    Hardware hw;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0E1116);
        setContentView(webView);

        // Kenardan kenara ekran (Android 15): içerik sistem çubuklarının altında kalmasın
        webView.setOnApplyWindowInsetsListener((v, insets) -> {
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
                .addPathHandler("/icon/", this::appIcon)
                .addPathHandler("/thumb/", this::thumbnail)
                .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);

        hw = new Hardware(this);
        bridge = new Bridge(this);
        // QR okuyucu: sayfa kamera isterse, uygulamanın kamera izni varsa ver
        webView.setWebChromeClient(new android.webkit.WebChromeClient() {
            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest req) {
                runOnUiThread(() -> {
                    boolean cam = checkSelfPermission(android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                    java.util.List<String> ok = new java.util.ArrayList<>();
                    for (String r : req.getResources())
                        if (android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && cam) ok.add(r);
                    if (ok.isEmpty()) req.deny(); else req.grant(ok.toArray(new String[0]));
                });
            }
        });
        webView.addJavascriptInterface(bridge, "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });
        webView.loadUrl(START_URL);
        new Thread(() -> { Scheduler.updateDynamic(this); Scheduler.rescheduleAll(this); }).start();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // İzin ekranından dönünce arayüz durumu yenilesin
        if (webView != null) webView.evaluateJavascript("window.__onResume&&window.__onResume()", null);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (hw != null) hw.stop(); // arka planda sensör/mikrofon çalışmasın
        if (webView != null) webView.evaluateJavascript("window.__onPause&&window.__onPause()", null);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        String p = perms.length > 0 ? perms[0] : "";
        js("window.__onPerm&&window.__onPerm(" + org.json.JSONObject.quote(p) + "," + ok + ")");
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript("window.__onBack?window.__onBack():false", v -> {
            if (!"true".equals(v)) finish();
        });
    }

    @Override
    protected void onDestroy() {
        if (bridge != null) bridge.shutdown();
        super.onDestroy();
    }

    void js(String code) {
        runOnUiThread(() -> { if (webView != null) webView.evaluateJavascript(code, null); });
    }

    // ---- /icon/<paket> : uygulama ikonu PNG ----
    private WebResourceResponse appIcon(String path) {
        try {
            Drawable d = getPackageManager().getApplicationIcon(path);
            int sz = 96;
            Bitmap b = Bitmap.createBitmap(sz, sz, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(b);
            d.setBounds(0, 0, sz, sz);
            d.draw(c);
            return png(b, Bitmap.CompressFormat.PNG, "image/png");
        } catch (PackageManager.NameNotFoundException e) {
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    // ---- /thumb/<base64url yol> : fotoğraf küçük resmi (sadece dahili depolama içinden) ----
    private WebResourceResponse thumbnail(String path) {
        try {
            String p = new String(Base64.decode(path, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING), StandardCharsets.UTF_8);
            File f = new File(p).getCanonicalFile();
            String root = Environment.getExternalStorageDirectory().getCanonicalPath();
            if (!f.getPath().startsWith(root + "/") || !f.isFile()) return null;
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(f.getPath(), o);
            int sample = 1;
            while (o.outWidth / (sample * 2) >= 220 && o.outHeight / (sample * 2) >= 220) sample *= 2;
            o = new BitmapFactory.Options();
            o.inSampleSize = sample;
            Bitmap b = BitmapFactory.decodeFile(f.getPath(), o);
            if (b == null) return null;
            return png(b, Bitmap.CompressFormat.JPEG, "image/jpeg");
        } catch (Exception e) {
            return null;
        }
    }

    private static WebResourceResponse png(Bitmap b, Bitmap.CompressFormat fmt, String mime) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        b.compress(fmt, 80, out);
        return new WebResourceResponse(mime, null, new ByteArrayInputStream(out.toByteArray()));
    }
}
