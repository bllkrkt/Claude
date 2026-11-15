package com.bilal.arackutusu;

import android.content.Context;
import android.content.pm.PackageManager;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

import rikka.shizuku.Shizuku;

/**
 * Shizuku: telefonda "kabuk (shell)" yetkisiyle komut çalıştırmayı sağlayan ayrı bir uygulama.
 * Kablosuz hata ayıklama ile başlatılır, telefon yeniden başlayınca tekrar başlatılması gerekir.
 */
final class ShizukuHelper {
    static final String PKG = "moe.shizuku.privileged.api";
    static final int REQ = 7001;

    private ShizukuHelper() { }

    static boolean installed(Context c) {
        try { c.getPackageManager().getPackageInfo(PKG, 0); return true; }
        catch (PackageManager.NameNotFoundException e) { return false; }
    }

    static boolean running() {
        try { return Shizuku.pingBinder(); } catch (Throwable t) { return false; }
    }

    static boolean granted() {
        try {
            if (!running() || Shizuku.isPreV11()) return false;
            return Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED;
        } catch (Throwable t) { return false; }
    }

    static boolean ready() { return granted(); }

    static void request() {
        try { if (running() && !granted()) Shizuku.requestPermission(REQ); } catch (Throwable ignored) { }
    }

    static JSONObject status(Context c) {
        JSONObject o = new JSONObject();
        try {
            o.put("installed", installed(c));
            o.put("running", running());
            o.put("granted", granted());
        } catch (Exception ignored) { }
        return o;
    }

    /** Kabuk komutu çalıştırır. Dönen: [çıkış kodu, çıktı]. Shizuku hazır değilse null. */
    static String[] run(String cmd) {
        if (!ready()) return null;
        try {
            // Shizuku.newProcess API'de gizli; resmi istemci kütüphanesinde mevcut, yansıma ile çağrılır
            Method m = Shizuku.class.getDeclaredMethod("newProcess", String[].class, String[].class, String.class);
            m.setAccessible(true);
            Process p = (Process) m.invoke(null, new String[]{"sh", "-c", cmd}, null, null);
            String out = read(p.getInputStream()) + read(p.getErrorStream());
            boolean done = p.waitFor(8, TimeUnit.SECONDS);
            int code = done ? p.exitValue() : -1;
            if (!done) p.destroy();
            return new String[]{String.valueOf(code), out.trim()};
        } catch (Throwable t) {
            return new String[]{"-1", String.valueOf(t.getMessage())};
        }
    }

    private static String read(InputStream in) {
        try {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            return b.toString(StandardCharsets.UTF_8.name());
        } catch (Exception e) { return ""; }
    }
}
