package com.bilal.arackutusu;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.webkit.MimeTypeMap;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Arrays;
import java.util.Locale;

/** Dosya yöneticisi, fotoğraf küçültme ve Wi-Fi bilgisi. Sadece dahili depolamada çalışır. */
final class FileOps {
    private FileOps() { }

    static String root() throws Exception { return Cleaner.root().getCanonicalPath(); }

    /** Yol dahili depolama içinde mi? Android/data ve obb'ye girilmez. */
    static File safe(String p) throws Exception {
        File f = new File(p).getCanonicalFile();
        String r = root();
        if (!(f.getPath().equals(r) || f.getPath().startsWith(r + "/"))) throw new Exception("Bu konuma erişilemez");
        if (f.getPath().startsWith(r + "/Android/data") || f.getPath().startsWith(r + "/Android/obb")) throw new Exception("Android bu klasöre erişime izin vermiyor");
        return f;
    }

    static JSONObject list(String path, boolean hidden) throws Exception {
        File d = path == null || path.isEmpty() ? new File(root()) : safe(path);
        File[] kids = d.listFiles();
        JSONArray a = new JSONArray();
        if (kids != null) {
            Arrays.sort(kids, (x, y) -> x.isDirectory() != y.isDirectory() ? (x.isDirectory() ? -1 : 1)
                    : x.getName().compareToIgnoreCase(y.getName()));
            for (File k : kids) {
                if (!hidden && k.getName().startsWith(".")) continue;
                JSONObject o = new JSONObject();
                o.put("name", k.getName());
                o.put("path", k.getPath());
                o.put("dir", k.isDirectory());
                o.put("mtime", k.lastModified());
                if (k.isDirectory()) {
                    String[] c = k.list();
                    o.put("count", c == null ? 0 : c.length);
                } else o.put("size", k.length());
                a.put(o);
            }
        }
        return new JSONObject().put("path", d.getPath()).put("root", root()).put("items", a)
                .put("free", Cleaner.root().getUsableSpace());
    }

    static String mime(File f) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(Uri.fromFile(f).toString()).toLowerCase(Locale.ROOT);
        String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return m == null ? "*/*" : m;
    }

    private static Uri uri(Context c, File f) {
        return FileProvider.getUriForFile(c, c.getPackageName() + ".files", f);
    }

    static boolean open(Context c, String p) throws Exception {
        File f = safe(p);
        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri(c, f), mime(f))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        c.startActivity(Intent.createChooser(i, "Şununla aç").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return true;
    }

    static boolean share(Context c, String p) throws Exception {
        File f = safe(p);
        Intent i = new Intent(Intent.ACTION_SEND).setType(mime(f)).putExtra(Intent.EXTRA_STREAM, uri(c, f))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        c.startActivity(Intent.createChooser(i, "Paylaş").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return true;
    }

    static JSONObject rename(Context c, String p, String name) throws Exception {
        File f = safe(p);
        if (name.isEmpty() || name.contains("/") || name.equals(".") || name.equals("..")) throw new Exception("Geçersiz ad");
        File t = new File(f.getParentFile(), name);
        if (t.exists()) throw new Exception("Bu adda bir dosya zaten var");
        if (!f.renameTo(t)) throw new Exception("Yeniden adlandırılamadı");
        MediaScannerConnection.scanFile(c, new String[]{f.getPath(), t.getPath()}, null, null);
        return new JSONObject().put("path", t.getPath());
    }

    static JSONObject mkdir(String parent, String name) throws Exception {
        File d = safe(parent);
        if (name.isEmpty() || name.contains("/")) throw new Exception("Geçersiz ad");
        File n = new File(d, name);
        if (n.exists()) throw new Exception("Bu adda bir klasör zaten var");
        if (!n.mkdir()) throw new Exception("Klasör oluşturulamadı");
        return new JSONObject().put("path", n.getPath());
    }

    /** Dosyayı veya klasörü (içiyle birlikte) siler. Ana klasör ve standart klasörler silinmez. */
    static JSONObject delete(Context c, JSONArray paths) throws Exception {
        String r = root();
        long freed = 0;
        int done = 0;
        JSONArray failed = new JSONArray();
        for (int i = 0; i < paths.length(); i++) {
            File f;
            try { f = safe(paths.getString(i)); } catch (Exception e) { failed.put(paths.getString(i)); continue; }
            String rel = f.getPath().equals(r) ? "" : f.getPath().substring(r.length() + 1);
            if (rel.isEmpty() || (!rel.contains("/") && Arrays.asList("Android", "DCIM", "Download", "Pictures", "Music", "Movies", "Documents").contains(rel))) {
                failed.put(f.getPath()); continue;
            }
            long[] sz = {0};
            if (deleteTree(f, sz)) { done++; freed += sz[0]; } else failed.put(f.getPath());
            MediaScannerConnection.scanFile(c, new String[]{f.getPath()}, null, null);
        }
        return new JSONObject().put("done", done).put("freed", freed).put("failed", failed);
    }

    private static boolean deleteTree(File f, long[] sz) {
        if (f.isDirectory() && !isLink(f)) {
            File[] k = f.listFiles();
            if (k != null) for (File x : k) if (!deleteTree(x, sz)) return false;
        } else sz[0] += f.length();
        return f.delete();
    }

    private static boolean isLink(File f) {
        try { return !f.getCanonicalPath().equals(f.getAbsolutePath()); } catch (Exception e) { return true; }
    }

    /** Klasördeki alt klasörlerin toplam boyutları (en fazla ~8 sn). */
    static JSONObject folderSizes(String path) throws Exception {
        File d = safe(path);
        File[] kids = d.listFiles();
        JSONObject o = new JSONObject();
        long deadline = System.currentTimeMillis() + 8000;
        if (kids != null) for (File k : kids) {
            if (!k.isDirectory()) continue;
            long[] sz = {0};
            boolean full = sizeOf(k, sz, deadline);
            o.put(k.getPath(), full ? sz[0] : -sz[0] - 1);
        }
        return o;
    }

    private static boolean sizeOf(File f, long[] sz, long deadline) {
        if (System.currentTimeMillis() > deadline) return false;
        File[] k = f.listFiles();
        if (k == null) return true;
        boolean ok = true;
        for (File x : k) {
            if (x.isDirectory()) { if (!isLink(x) && !sizeOf(x, sz, deadline)) ok = false; }
            else sz[0] += x.length();
        }
        return ok;
    }

    // ---------------- Fotoğraf küçültme ----------------
    /** Fotoğrafı en uzun kenar maxPx olacak şekilde küçültür ve JPEG kalitesiyle yeniden kaydeder. replace=true ise orijinalin yerine yazar. */
    static JSONObject compress(Context c, String p, int maxPx, int quality, boolean replace) throws Exception {
        File f = safe(p);
        long before = f.length();
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getPath(), o);
        int w = o.outWidth, h = o.outHeight;
        if (w <= 0) throw new Exception("Fotoğraf okunamadı");
        int sample = 1;
        while (Math.max(w, h) / (sample * 2) >= maxPx) sample *= 2;
        o = new BitmapFactory.Options();
        o.inSampleSize = sample;
        Bitmap b = BitmapFactory.decodeFile(f.getPath(), o);
        if (b == null) throw new Exception("Fotoğraf okunamadı");
        float scale = Math.min(1f, maxPx / (float) Math.max(b.getWidth(), b.getHeight()));
        ExifInterface ex = new ExifInterface(f.getPath());
        int rot = ex.getAttributeInt(ExifInterface.TAG_ORIENTATION, 1);
        float deg = rot == 6 ? 90 : rot == 3 ? 180 : rot == 8 ? 270 : 0;
        if (scale < 1f || deg != 0) {
            Matrix m = new Matrix();
            m.postScale(scale, scale);
            m.postRotate(deg);
            Bitmap nb = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), m, true);
            if (nb != b) b.recycle();
            b = nb;
        }
        String date = ex.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL);
        String name = f.getName().replaceAll("\\.[^.]+$", "");
        File out = replace ? new File(f.getParentFile(), ".ak-tmp-" + System.nanoTime() + ".jpg") : new File(f.getParentFile(), name + "-kucuk.jpg");
        try (FileOutputStream fo = new FileOutputStream(out)) { b.compress(Bitmap.CompressFormat.JPEG, quality, fo); }
        b.recycle();
        long after = out.length();
        if (after >= before) { // küçülmediyse dokunma
            out.delete();
            return new JSONObject().put("skipped", true).put("before", before).put("after", before);
        }
        try { // çekim tarihini koru
            ExifInterface ne = new ExifInterface(out.getPath());
            if (date != null) { ne.setAttribute(ExifInterface.TAG_DATETIME_ORIGINAL, date); ne.setAttribute(ExifInterface.TAG_DATETIME, date); }
            ne.saveAttributes();
        } catch (Exception ignored) { }
        long mtime = f.lastModified();
        File finalF = out;
        if (replace) {
            File target = new File(f.getParentFile(), name + ".jpg");
            if (!f.delete()) { out.delete(); throw new Exception("Orijinal silinemedi"); }
            if (!out.renameTo(target)) throw new Exception("Kaydedilemedi");
            finalF = target;
        }
        finalF.setLastModified(mtime);
        MediaScannerConnection.scanFile(c, new String[]{f.getPath(), finalF.getPath()}, null, null);
        return new JSONObject().put("before", before).put("after", after).put("path", finalF.getPath());
    }

    /** DCIM ve Pictures altındaki büyük fotoğraflar (küçültmeye aday). */
    static JSONObject bigPhotos(long min) throws Exception {
        java.util.List<File> l = new java.util.ArrayList<>();
        java.util.ArrayDeque<File> st = new java.util.ArrayDeque<>();
        st.push(new File(root(), "DCIM")); st.push(new File(root(), "Pictures"));
        while (!st.isEmpty()) {
            File d = st.pop();
            File[] k = d.listFiles();
            if (k == null) continue;
            for (File x : k) {
                if (x.getName().startsWith(".")) continue;
                if (x.isDirectory()) { if (!isLink(x)) st.push(x); continue; }
                String n = x.getName().toLowerCase(Locale.ROOT);
                if ((n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png")) && x.length() >= min && !n.endsWith("-kucuk.jpg")) l.add(x);
            }
        }
        l.sort((a, b) -> Long.compare(b.length(), a.length()));
        JSONArray a = new JSONArray();
        long tot = 0;
        for (File f : l) {
            tot += f.length();
            if (a.length() < 600) a.put(new JSONObject().put("path", f.getPath()).put("name", f.getName()).put("size", f.length()).put("mtime", f.lastModified())
                    .put("rel", f.getPath().substring(root().length() + 1)).put("img", true));
        }
        return new JSONObject().put("items", a).put("total", tot).put("count", l.size());
    }

    // ---------------- Wi-Fi ----------------
    @SuppressWarnings("deprecation")
    static JSONObject wifi(Context c) throws Exception {
        WifiManager wm = c.getApplicationContext().getSystemService(WifiManager.class);
        JSONObject o = new JSONObject();
        if (wm == null || !wm.isWifiEnabled()) return o.put("on", false);
        WifiInfo wi = wm.getConnectionInfo();
        o.put("on", true);
        if (wi == null || wi.getNetworkId() == -1) return o.put("connected", false);
        o.put("connected", true);
        o.put("rssi", wi.getRssi());
        o.put("level", WifiManager.calculateSignalLevel(wi.getRssi(), 5));
        o.put("speed", wi.getLinkSpeed());
        o.put("freq", wi.getFrequency());
        String ssid = wi.getSSID();
        o.put("ssid", ssid == null || ssid.contains("unknown ssid") ? "" : ssid.replace("\"", ""));
        int ip = wi.getIpAddress();
        o.put("ip", (ip & 255) + "." + (ip >> 8 & 255) + "." + (ip >> 16 & 255) + "." + (ip >> 24 & 255));
        if (android.os.Build.VERSION.SDK_INT >= 30) o.put("std", wi.getWifiStandard());
        return o;
    }
}
