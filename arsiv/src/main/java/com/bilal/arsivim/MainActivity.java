package com.bilal.arsivim;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/index.html";
    private static final int PICK_REQ = 61;
    private static final Pattern RANGE = Pattern.compile("bytes=(\\d*)-(\\d*)");

    private WebView webView;
    private volatile boolean pageReady = false;
    private SharedPreferences prefs;

    /** Kayıtlı bir ZIP (Instagram büyük arşivleri birden çok parçaya böler). */
    static final class Arc {
        String uri, name; long size; boolean copied, temp;
        ParcelFileDescriptor pfd; FileChannel ch; ZipIndex idx; String err;
    }
    private final List<Arc> arcs = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("arsivim", MODE_PRIVATE);
        loadArcs();
        if (prefs.getBoolean("secure", false)) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0B0C12);
        setContentView(webView);

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
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        // İnternete çıkış sayfadaki Content-Security-Policy ile kapalı: veri sadece telefondaki ZIP'ten okunur.

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) {
                    String p = u.getPath() == null ? "" : u.getPath();
                    if (p.startsWith("/zipidx")) return indexResponse();
                    if (p.startsWith("/zip/")) return entryResponse(p.substring(5), req.getRequestHeaders());
                }
                return loader.shouldInterceptRequest(u);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) { pageReady = true; }
        });

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    // ---------------- Arşiv listesi ----------------

    private void loadArcs() {
        try {
            JSONArray a = new JSONArray(prefs.getString("arcs", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Arc r = new Arc();
                r.uri = o.getString("uri"); r.name = o.optString("name", "arşiv.zip");
                r.size = o.optLong("size"); r.copied = o.optBoolean("copied");
                arcs.add(r);
            }
        } catch (Exception ignored) { }
    }

    private void saveArcs() {
        JSONArray a = new JSONArray();
        synchronized (arcs) {
            for (Arc r : arcs) {
                if (r.temp) continue; // bu oturumluk açılanlar kaydedilmez
                try {
                    JSONObject o = new JSONObject();
                    o.put("uri", r.uri); o.put("name", r.name); o.put("size", r.size); o.put("copied", r.copied);
                    a.put(o);
                } catch (Exception ignored) { }
            }
        }
        prefs.edit().putString("arcs", a.toString()).apply();
    }

    private void openArc(Arc r) {
        if (r.idx != null || r.err != null) return;
        try {
            if (r.uri.startsWith("file:")) {
                r.ch = new RandomAccessFile(new File(Uri.parse(r.uri).getPath()), "r").getChannel();
            } else {
                r.pfd = getContentResolver().openFileDescriptor(Uri.parse(r.uri), "r");
                if (r.pfd == null) throw new IOException("Dosya açılamadı");
                r.ch = new FileInputStream(r.pfd.getFileDescriptor()).getChannel();
            }
            r.idx = new ZipIndex(r.ch);
            if (r.size <= 0) r.size = r.idx.size;
        } catch (SecurityException e) {
            r.err = "İzin kaybolmuş. Bu ZIP'i kaldırıp yeniden ekle.";
        } catch (Exception e) {
            r.err = e.getMessage() == null ? "Dosya okunamadı" : e.getMessage();
        }
    }

    private void closeArc(Arc r) {
        try { if (r.ch != null) r.ch.close(); } catch (Exception ignored) { }
        try { if (r.pfd != null) r.pfd.close(); } catch (Exception ignored) { }
        r.ch = null; r.pfd = null; r.idx = null;
    }

    private void handleIntent(Intent intent) {
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
        intent.setAction(Intent.ACTION_MAIN);
        addUris(uris, false);
    }

    /** Seçilen ZIP'leri ekler. Doğrudan okunamayan (bulut vb.) dosyalar uygulamanın içine kopyalanır. */
    private void addUris(final List<Uri> uris, final boolean persistable) {
        toast("ZIP okunuyor…");
        new Thread(() -> {
            int added = 0; String lastErr = null;
            for (Uri u : uris) {
                Arc r = new Arc();
                r.uri = u.toString(); r.name = displayName(u); r.size = fileSize(u);
                boolean persisted = false;
                if (persistable) {
                    try {
                        getContentResolver().takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        persisted = true;
                    } catch (Exception ignored) { }
                }
                synchronized (arcs) {
                    boolean dup = false;
                    for (Arc o : arcs) if (o.name.equals(r.name) && o.size == r.size && r.size > 0) dup = true;
                    if (dup) continue;
                }
                openArc(r);
                if (r.idx == null) {
                    // Konum bazlı okunamıyor → uygulamaya kopyala
                    closeArc(r);
                    try {
                        File f = copyIn(u, r.name);
                        r.uri = Uri.fromFile(f).toString(); r.copied = true; r.err = null; r.size = f.length();
                        openArc(r);
                    } catch (Exception e) { r.err = "Kopyalanamadı: " + e.getMessage(); }
                } else if (!persisted) {
                    r.temp = true; // "Paylaş / Birlikte aç" ile gelen dosyaların izni geçicidir
                }
                if (r.idx == null) { lastErr = r.name + ": " + r.err; closeArc(r); if (r.copied) new File(Uri.parse(r.uri).getPath()).delete(); continue; }
                synchronized (arcs) { arcs.add(r); }
                added++;
            }
            saveArcs();
            final int n = added; final String err = lastErr;
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) return;
                if (err != null) Toast.makeText(this, err, Toast.LENGTH_LONG).show();
                if (n > 0 && pageReady) webView.evaluateJavascript("window.__onArchives && window.__onArchives()", null);
            });
        }, "arsiv-ekle").start();
    }

    private File copyIn(Uri u, String name) throws IOException {
        File dir = new File(getFilesDir(), "arsivler");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("Klasör oluşturulamadı");
        File f = new File(dir, System.currentTimeMillis() + "-" + name.replaceAll("[^A-Za-z0-9._-]", "_"));
        runOnUiThread(() -> toast("ZIP uygulamaya kopyalanıyor, biraz sürebilir…"));
        try (InputStream in = getContentResolver().openInputStream(u); OutputStream os = new FileOutputStream(f)) {
            if (in == null) throw new IOException("Dosya açılamadı");
            byte[] buf = new byte[1 << 16];
            int r;
            while ((r = in.read(buf)) > 0) os.write(buf, 0, r);
        } catch (IOException e) {
            f.delete();
            throw e;
        }
        return f;
    }

    // ---------------- WebView'a ZIP içeriğini sunma ----------------

    private WebResourceResponse indexResponse() {
        StringBuilder sb = new StringBuilder(1 << 16);
        sb.append("{\"archives\":[");
        synchronized (arcs) {
            for (int i = 0; i < arcs.size(); i++) {
                Arc r = arcs.get(i);
                openArc(r);
                if (i > 0) sb.append(',');
                sb.append("{\"name\":").append(JSONObject.quote(r.name))
                  .append(",\"size\":").append(r.size)
                  .append(",\"temp\":").append(r.temp)
                  .append(",\"copied\":").append(r.copied)
                  .append(",\"ok\":").append(r.idx != null)
                  .append(",\"err\":").append(r.err == null ? "null" : JSONObject.quote(r.err)).append('}');
            }
            sb.append("],\"entries\":[");
            boolean first = true;
            for (int i = 0; i < arcs.size(); i++) {
                ZipIndex z = arcs.get(i).idx;
                if (z == null) continue;
                for (int k = 0; k < z.count(); k++) {
                    if (!first) sb.append(',');
                    first = false;
                    sb.append('[').append(i).append(',').append(JSONObject.quote(z.names.get(k))).append(',').append(z.usize(k)).append(']');
                }
            }
        }
        sb.append("]}");
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-store");
        return new WebResourceResponse("application/json", "utf-8", 200, "OK", h,
                new ByteArrayInputStream(sb.toString().getBytes(StandardCharsets.UTF_8)));
    }

    private WebResourceResponse entryResponse(String path, Map<String, String> reqHeaders) {
        try {
            int slash = path.indexOf('/');
            int a = Integer.parseInt(path.substring(0, slash));
            String name = path.substring(slash + 1);
            ZipIndex z;
            synchronized (arcs) {
                if (a < 0 || a >= arcs.size()) return notFound();
                openArc(arcs.get(a));
                z = arcs.get(a).idx;
            }
            if (z == null) return notFound();
            int i = z.find(name);
            if (i < 0) return notFound();
            long total = z.usize(i);
            String mime = mimeOf(name);
            Map<String, String> h = new HashMap<>();
            h.put("Accept-Ranges", "bytes");
            h.put("Cache-Control", "max-age=86400");
            String range = null;
            if (reqHeaders != null) for (Map.Entry<String, String> e : reqHeaders.entrySet())
                if ("range".equalsIgnoreCase(e.getKey())) range = e.getValue();
            InputStream in = z.open(i);
            if (range != null) {
                Matcher m = RANGE.matcher(range);
                if (m.find() && total > 0) {
                    long start = m.group(1).isEmpty() ? Math.max(0, total - Long.parseLong(m.group(2))) : Long.parseLong(m.group(1));
                    long end = (m.group(1).isEmpty() || m.group(2).isEmpty()) ? total - 1 : Math.min(total - 1, Long.parseLong(m.group(2)));
                    if (start >= total || start > end) { in.close(); return notFound(); }
                    long skipped = 0;
                    while (skipped < start) {
                        long k = in.skip(start - skipped);
                        if (k <= 0) { if (in.read() < 0) break; k = 1; }
                        skipped += k;
                    }
                    h.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
                    h.put("Content-Length", String.valueOf(end - start + 1));
                    return new WebResourceResponse(mime, null, 206, "Partial Content", h, new Limited(in, end - start + 1));
                }
            }
            h.put("Content-Length", String.valueOf(total));
            return new WebResourceResponse(mime, mime.startsWith("text/") || mime.contains("json") ? "utf-8" : null, 200, "OK", h, in);
        } catch (Exception e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    static final class Limited extends InputStream {
        private final InputStream in; private long left;
        Limited(InputStream in, long n) { this.in = in; this.left = n; }
        @Override public int read() throws IOException { if (left <= 0) return -1; int r = in.read(); if (r >= 0) left--; return r; }
        @Override public int read(byte[] b, int o, int l) throws IOException {
            if (left <= 0) return -1;
            int r = in.read(b, o, (int) Math.min(l, left));
            if (r > 0) left -= r;
            return r;
        }
        @Override public void close() throws IOException { in.close(); }
    }

    static String mimeOf(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        String ext = n.substring(n.lastIndexOf('.') + 1);
        switch (ext) {
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "heic": return "image/heic";
            case "mp4": return n.contains("/audio/") ? "audio/mp4" : "video/mp4";
            case "mov": return "video/quicktime";
            case "webm": return "video/webm";
            case "m4a": return "audio/mp4";
            case "aac": return "audio/aac";
            case "mp3": return "audio/mpeg";
            case "ogg": case "opus": return "audio/ogg";
            case "wav": return "audio/wav";
            case "json": return "application/json";
            case "html": case "htm": return "text/html";
            case "txt": case "csv": return "text/plain";
            default: return "application/octet-stream";
        }
    }

    // ---------------- Yardımcılar ----------------

    private String displayName(Uri uri) {
        String n = uri.getLastPathSegment();
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) { String d = c.getString(0); if (d != null) n = d; }
        } catch (Exception ignored) { }
        if (n != null && n.contains("/")) n = n.substring(n.lastIndexOf('/') + 1);
        return n == null ? "arşiv.zip" : n;
    }

    private long fileSize(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst() && !c.isNull(0)) return c.getLong(0);
        } catch (Exception ignored) { }
        return 0;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            toast("Bağlantı açılamadı");
        }
    }

    private void toast(String m) { Toast.makeText(this, m, Toast.LENGTH_SHORT).show(); }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_REQ || resultCode != RESULT_OK || data == null) return;
        List<Uri> uris = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) for (int k = 0; k < clip.getItemCount(); k++) uris.add(clip.getItemAt(k).getUri());
        else if (data.getData() != null) uris.add(data.getData());
        if (!uris.isEmpty()) addUris(uris, true);
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

    @Override
    protected void onDestroy() {
        synchronized (arcs) { for (Arc r : arcs) closeArc(r); }
        super.onDestroy();
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

    private Uri insertDownload(String name, String mime) {
        ContentValues v = new ContentValues();
        v.put(MediaStore.Downloads.DISPLAY_NAME, name);
        v.put(MediaStore.Downloads.MIME_TYPE, mime);
        v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Arsivim");
        return getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
    }

    private String writeOut(String name, String mime, InputStream in) throws IOException {
        try (InputStream src = in) {
            OutputStream os;
            String shown;
            if (Build.VERSION.SDK_INT >= 29) {
                Uri uri = insertDownload(name, mime);
                if (uri == null) return "";
                os = getContentResolver().openOutputStream(uri);
                shown = "İndirilenler/Arsivim/" + name;
            } else {
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) return "";
                File f = new File(dir, name);
                os = new FileOutputStream(f);
                shown = f.getAbsolutePath();
            }
            if (os == null) return "";
            try (OutputStream o = os) {
                byte[] buf = new byte[1 << 16];
                int r;
                while ((r = src.read(buf)) > 0) o.write(buf, 0, r);
            }
            return shown;
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void pickArchives() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip", "application/x-zip-compressed", "application/octet-stream"});
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                try { startActivityForResult(i, PICK_REQ); } catch (ActivityNotFoundException e) { toast("Dosya seçici açılamadı"); }
            });
        }

        @JavascriptInterface
        public void removeArchive(int i) {
            synchronized (arcs) {
                if (i < 0 || i >= arcs.size()) return;
                Arc r = arcs.remove(i);
                closeArc(r);
                if (r.copied) new File(Uri.parse(r.uri).getPath()).delete();
                else if (!r.temp) {
                    try { getContentResolver().releasePersistableUriPermission(Uri.parse(r.uri), Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) { }
                }
            }
            saveArcs();
        }

        @JavascriptInterface
        public void moveArchive(int from, int to) {
            synchronized (arcs) {
                if (from < 0 || from >= arcs.size() || to < 0 || to >= arcs.size()) return;
                arcs.add(to, arcs.remove(from));
            }
            saveArcs();
        }

        @JavascriptInterface
        public String saveEntry(int a, String name, String outName) {
            try {
                ZipIndex z;
                synchronized (arcs) { if (a < 0 || a >= arcs.size()) return ""; z = arcs.get(a).idx; }
                if (z == null) return "";
                int i = z.find(name);
                if (i < 0) return "";
                return writeOut(outName, mimeOf(name), z.open(i));
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public String saveText(String name, String text, String mime) {
            try {
                return writeOut(name, mime, new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
            } catch (Exception e) { return ""; }
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
        public void setBars(String hex, boolean light) {
            runOnUiThread(() -> { try { applyBars(Color.parseColor(hex), light); } catch (Exception ignored) { } });
        }

        @JavascriptInterface
        public void setSecure(boolean on) {
            prefs.edit().putBoolean("secure", on).apply();
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            });
        }

        @JavascriptInterface
        public boolean isSecure() { return prefs.getBoolean("secure", false); }
    }
}
