package com.bilal.efsaneyolu;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.ViewTreeObserver;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/** Oyunun tamamı assets/index.html içinde; bu sınıf onu yatay tam ekranda gösteren kabuk + küçük bir JS köprüsü. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final long RECREATE_GAP_MS = 10000;
    private static long lastRecreate = 0;
    private WebView web;
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
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B090E);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        final android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(0xFF0B090E);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        root.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override public boolean onPreDraw() {
                if (!ready) return false;
                root.getViewTreeObserver().removeOnPreDrawListener(this);
                return true;
            }
        });
        new Handler(Looper.getMainLooper()).postDelayed(() -> { ready = true; root.invalidate(); }, 6000);
        web.setOnLongClickListener(v -> true);
        web.setLongClickable(false);
        web.setHapticFeedbackEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        if (Build.VERSION.SDK_INT >= 26) web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        immersive();

        // Kamera çentiği / gezinme çizgisi boşlukları: oyun onların altına girmesin
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top = 0, bottom = 0, left = 0, right = 0;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.displayCutout());
                left = i.left; right = i.right; top = i.top; bottom = i.bottom;
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
            // Ekran süreci çökerse uygulama kapanmasın: baştan kur (kayıt localStorage'da kalır)
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (web == view) web = null;
                detach(view);
                try { view.destroy(); } catch (Exception ignored) { }
                try {
                    long now = SystemClock.elapsedRealtime();
                    boolean loop = lastRecreate != 0 && now - lastRecreate < RECREATE_GAP_MS;
                    lastRecreate = now;
                    if (loop) finish(); else recreate();
                } catch (Exception e) {
                    try { finish(); } catch (Exception ignored) { }
                }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }

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
        final WebView w = web;
        web = null;
        if (w != null) {
            detach(w);
            try { w.destroy(); } catch (Exception ignored) { }
        }
        super.onDestroy();
    }

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

        /** Kısa titreşim (ms). */
        @JavascriptInterface
        public void vib(int ms) {
            try {
                final Vibrator v = vibrator;
                if (v == null || !v.hasVibrator()) return;
                long d = Math.max(10, Math.min(300, ms));
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
                else v.vibrate(d);
            } catch (Exception ignored) { }
        }
    }
}
