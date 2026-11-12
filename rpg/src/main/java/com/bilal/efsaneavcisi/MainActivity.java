package com.bilal.efsaneavcisi;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/** Oyunun tamamı assets/index.html içinde; bu sınıf sadece onu tam ekran gösteren kabuk. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;

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

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !HOST.equals(req.getUrl().getHost());
            }
        });
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }

    // Arka plana alınınca oyun durur; dönünce "sen yokken" kazancı hesaplanır
    @Override protected void onPause() {
        web.evaluateJavascript("window.__pause&&window.__pause()", null);
        super.onPause(); web.onPause();
    }
    @Override protected void onResume() {
        super.onResume(); web.onResume();
        web.evaluateJavascript("window.__resume&&window.__resume()", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__onBack&&window.__onBack())?'1':'0'", v -> {
            if (v == null || !v.contains("1")) moveTaskToBack(true);
        });
    }
}
