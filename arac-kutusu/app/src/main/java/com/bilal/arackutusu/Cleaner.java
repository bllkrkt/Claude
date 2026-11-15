package com.bilal.arackutusu;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.os.Environment;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.RandomAccessFile;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Dosya tarama ve silme. Hiçbir şeyi kendiliğinden silmez; sadece kullanıcının onayladığı yolları siler. */
final class Cleaner {
    interface Progress { void on(String text); }

    private static final Set<String> IMG = new HashSet<>(Arrays.asList("jpg", "jpeg", "png", "heic", "heif", "webp", "gif", "bmp"));
    // Bu klasörler boş olsa bile listelenmez (sistem/uygulamalar bekler)
    private static final Set<String> KEEP_TOP = new HashSet<>(Arrays.asList(
            "Alarms", "Audiobooks", "DCIM", "Documents", "Download", "Movies", "Music", "Notifications",
            "Pictures", "Podcasts", "Recordings", "Ringtones", "Android", "MIUI"));

    private Cleaner() { }

    static File root() { return Environment.getExternalStorageDirectory(); }

    static boolean hasAccess() { return Environment.isExternalStorageManager(); }

    static JSONObject scan(Context c, long minLarge, Progress pr) throws Exception {
        String rootPath = root().getCanonicalPath();
        File root = new File(rootPath); // gerçek yoldan başla: bağlantı (symlink) tespiti doğru çalışsın
        List<File> large = new ArrayList<>();
        Map<Long, List<File>> imgsBySize = new HashMap<>();
        List<File> apks = new ArrayList<>();
        List<File> emptyDirs = new ArrayList<>();
        String downloadPath = new File(root, Environment.DIRECTORY_DOWNLOADS).getCanonicalPath();

        // Klasör ağacı: post-order ile boş klasörleri bul
        Map<String, Boolean> hasContent = new HashMap<>();
        List<File> order = new ArrayList<>();
        ArrayDeque<File> walk = new ArrayDeque<>();
        walk.push(root);
        long count = 0;
        long totalBytes = 0;
        while (!walk.isEmpty()) {
            File dir = walk.pop();
            String dp = dir.getPath();
            if (dp.startsWith(rootPath + "/Android/data") || dp.startsWith(rootPath + "/Android/obb")) continue;
            File[] kids = dir.listFiles();
            order.add(dir);
            if (kids == null) { hasContent.put(dp, true); continue; } // okunamıyor: dokunma
            boolean anyFile = false;
            for (File k : kids) {
                if (k.isDirectory()) {
                    if (isLink(k)) anyFile = true; else walk.push(k); // bağlantılı klasöre girme (döngü olmasın)
                    continue;
                }
                anyFile = true;
                count++;
                long len = k.length();
                totalBytes += len;
                if (len >= minLarge) large.add(k);
                String ext = ext(k.getName());
                if (IMG.contains(ext) && len > 10 * 1024) {
                    List<File> l = imgsBySize.get(len);
                    if (l == null) imgsBySize.put(len, l = new ArrayList<>());
                    l.add(k);
                }
                if ("apk".equals(ext) && dp.startsWith(downloadPath)) apks.add(k);
                if (count % 2000 == 0) pr.on(count + " dosya tarandı…");
            }
            hasContent.put(dp, anyFile);
        }
        pr.on(count + " dosya tarandı. Kopyalar karşılaştırılıyor…");

        // Boş klasörler: alt ağaçta hiç dosya yoksa boştur. Ters sırada (derinden yukarı) hesapla.
        for (int i = order.size() - 1; i >= 0; i--) {
            File d = order.get(i);
            if (Boolean.TRUE.equals(hasContent.get(d.getPath()))) {
                File p = d.getParentFile();
                while (p != null && !Boolean.TRUE.equals(hasContent.get(p.getPath())) && hasContent.containsKey(p.getPath())) {
                    hasContent.put(p.getPath(), true);
                    p = p.getParentFile();
                }
            }
        }
        for (File d : order) {
            if (d.getPath().equals(root.getPath())) continue;
            if (Boolean.TRUE.equals(hasContent.get(d.getPath()))) continue;
            File parent = d.getParentFile();
            boolean parentEmpty = parent != null && !parent.getPath().equals(root.getPath())
                    && Boolean.FALSE.equals(hasContent.get(parent.getPath()));
            if (parentEmpty) continue; // sadece en üstteki boş klasörü göster
            String rel = d.getPath().substring(root.getPath().length() + 1);
            String top = rel.contains("/") ? rel.substring(0, rel.indexOf('/')) : rel;
            if (!rel.contains("/") && KEEP_TOP.contains(top)) continue;
            if (top.equals("Android")) continue;
            emptyDirs.add(d);
        }

        // Kopya fotoğraflar: aynı boyut → hızlı özet → tam MD5 (birebir aynı dosyalar)
        JSONArray dupes = new JSONArray();
        long dupeWaste = 0;
        int checked = 0;
        for (List<File> same : imgsBySize.values()) {
            if (same.size() < 2) continue;
            Map<String, List<File>> byHash = new HashMap<>();
            for (File f : same) {
                String h = hash(f);
                if (h == null) continue;
                List<File> l = byHash.get(h);
                if (l == null) byHash.put(h, l = new ArrayList<>());
                l.add(f);
                if (++checked % 50 == 0) pr.on(checked + " fotoğraf karşılaştırıldı…");
            }
            for (List<File> g : byHash.values()) {
                if (g.size() < 2) continue;
                g.sort((a, b) -> Long.compare(a.lastModified(), b.lastModified()));
                JSONArray ga = new JSONArray();
                for (File f : g) ga.put(file(f, root));
                dupes.put(ga);
                dupeWaste += g.get(0).length() * (g.size() - 1);
            }
        }

        large.sort((a, b) -> Long.compare(b.length(), a.length()));
        JSONArray la = new JSONArray();
        for (int i = 0; i < Math.min(400, large.size()); i++) la.put(file(large.get(i), root));

        PackageManager pm = c.getPackageManager();
        JSONArray aa = new JSONArray();
        apks.sort((a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (File f : apks) {
            JSONObject o = file(f, root);
            try {
                PackageInfo pi = pm.getPackageArchiveInfo(f.getPath(), 0);
                if (pi != null) {
                    pi.applicationInfo.sourceDir = f.getPath();
                    pi.applicationInfo.publicSourceDir = f.getPath();
                    o.put("app", String.valueOf(pi.applicationInfo.loadLabel(pm)));
                    o.put("pkg", pi.packageName);
                    o.put("ver", pi.versionName);
                    try {
                        PackageInfo inst = pm.getPackageInfo(pi.packageName, 0);
                        long a = inst.getLongVersionCode(), b = pi.getLongVersionCode();
                        o.put("installed", a == b ? "same" : a > b ? "newer" : "older");
                    } catch (PackageManager.NameNotFoundException e) { o.put("installed", "no"); }
                } else o.put("broken", true);
            } catch (Exception e) { o.put("broken", true); }
            aa.put(o);
        }

        JSONArray ea = new JSONArray();
        for (File d : emptyDirs) {
            JSONObject o = new JSONObject();
            o.put("path", d.getPath());
            o.put("rel", d.getPath().substring(root.getPath().length() + 1));
            o.put("name", d.getName());
            o.put("size", 0);
            o.put("dir", true);
            o.put("mtime", d.lastModified());
            ea.put(o);
        }

        JSONObject out = new JSONObject();
        out.put("large", la);
        out.put("largeTotal", large.size());
        out.put("dupes", dupes);
        out.put("dupeWaste", dupeWaste);
        out.put("apks", aa);
        out.put("empty", ea);
        out.put("files", count);
        out.put("bytes", totalBytes);
        out.put("freeBytes", root.getUsableSpace());
        out.put("totalSpace", root.getTotalSpace());
        return out;
    }

    private static JSONObject file(File f, File root) throws Exception {
        JSONObject o = new JSONObject();
        o.put("path", f.getPath());
        o.put("rel", f.getPath().substring(root.getPath().length() + 1));
        o.put("name", f.getName());
        o.put("size", f.length());
        o.put("mtime", f.lastModified());
        o.put("img", IMG.contains(ext(f.getName())));
        return o;
    }

    private static String ext(String n) {
        int i = n.lastIndexOf('.');
        return i < 0 ? "" : n.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    private static boolean isLink(File f) {
        try { return !f.getCanonicalPath().equals(f.getAbsolutePath()); } catch (Exception e) { return true; }
    }

    private static String hash(File f) {
        try (FileInputStream in = new FileInputStream(f)) {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] buf = new byte[1 << 16];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
            StringBuilder sb = new StringBuilder();
            for (byte b : md.digest()) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) { return null; }
    }

    /** Sadece dahili depolamadaki yolları siler. Klasörler yalnızca içinde hiç dosya yoksa silinir. */
    static JSONObject delete(Context c, JSONArray paths) throws Exception {
        String root = root().getCanonicalPath() + "/";
        long freed = 0;
        int done = 0;
        JSONArray failed = new JSONArray();
        JSONArray deleted = new JSONArray();
        List<String> scan = new ArrayList<>();
        for (int i = 0; i < paths.length(); i++) {
            String p = paths.getString(i);
            File f = new File(p);
            String canon;
            try { canon = f.getCanonicalPath(); } catch (Exception e) { failed.put(p); continue; }
            if (!canon.startsWith(root) || canon.startsWith(root + "Android/data") || canon.startsWith(root + "Android/obb")) {
                failed.put(p); continue;
            }
            if (f.isDirectory()) {
                if (deleteEmptyTree(f)) { done++; deleted.put(p); } else failed.put(p);
            } else if (f.isFile()) {
                long len = f.length();
                if (f.delete()) { freed += len; done++; deleted.put(p); scan.add(p); } else failed.put(p);
            } else {
                deleted.put(p); // zaten yok
            }
        }
        if (!scan.isEmpty()) MediaScannerConnection.scanFile(c, scan.toArray(new String[0]), null, null);
        JSONObject o = new JSONObject();
        o.put("freed", freed);
        o.put("done", done);
        o.put("deleted", deleted);
        o.put("failed", failed);
        o.put("freeBytes", root().getUsableSpace());
        return o;
    }

    private static boolean deleteEmptyTree(File d) {
        File[] kids = d.listFiles();
        if (kids == null) return false;
        for (File k : kids) {
            if (!k.isDirectory() || isLink(k)) return false; // içinde dosya çıktı: silme
            if (!deleteEmptyTree(k)) return false;
        }
        return d.delete();
    }
}
