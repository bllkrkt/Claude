package com.bilal.arackutusu;

import android.content.ContentValues;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Araçlar bölümünün donanım tarafı: sensörler, ses ölçer, mikrofon testi, titreşim, dosya kaydetme. */
final class Hardware implements SensorEventListener {
    private final MainActivity a;
    private final SensorManager sm;
    private String kind = null;
    private long lastPush = 0;
    private final float[] rot = new float[9], ori = new float[3];
    private volatile boolean meterOn = false;
    private volatile boolean micBusy = false;

    Hardware(MainActivity a) {
        this.a = a;
        sm = a.getSystemService(SensorManager.class);
    }

    // ---------------- Sensörler ----------------
    /** kind: light | mag | orient | level. Dönen: sensör var mı. */
    boolean start(String k) {
        stop();
        int type;
        switch (k) {
            case "light": type = Sensor.TYPE_LIGHT; break;
            case "mag": type = Sensor.TYPE_MAGNETIC_FIELD; break;
            case "orient": type = Sensor.TYPE_ROTATION_VECTOR; break;
            case "level": type = Sensor.TYPE_GRAVITY; break;
            case "pressure": type = Sensor.TYPE_PRESSURE; break;
            case "gps": return startGps();
            default: return false;
        }
        Sensor s = sm.getDefaultSensor(type);
        if (s == null && "level".equals(k)) s = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (s == null && "orient".equals(k)) s = sm.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        if (s == null) return false;
        kind = k;
        sm.registerListener(this, s, SensorManager.SENSOR_DELAY_UI);
        return true;
    }

    // ---------------- GPS (hız göstergesi) ----------------
    private android.location.LocationListener gpsL;

    private boolean startGps() {
        android.location.LocationManager lm = a.getSystemService(android.location.LocationManager.class);
        if (lm == null || a.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return false;
        kind = "gps";
        gpsL = l -> {
            JSONArray v = new JSONArray();
            try {
                v.put(l.hasSpeed() ? l.getSpeed() : -1).put(l.hasAltitude() ? l.getAltitude() : JSONObject.NULL).put(l.getAccuracy())
                        .put(l.hasBearing() ? l.getBearing() : JSONObject.NULL).put(l.getLatitude()).put(l.getLongitude()).put(l.getTime());
            } catch (Exception ignored) { }
            a.js("window.__sensor&&window.__sensor('gps'," + v + ")");
        };
        try {
            lm.requestLocationUpdates(android.location.LocationManager.GPS_PROVIDER, 1000, 0, gpsL, android.os.Looper.getMainLooper());
            return true;
        } catch (Exception e) { gpsL = null; return false; }
    }

    void stop() {
        if (gpsL != null) {
            try { a.getSystemService(android.location.LocationManager.class).removeUpdates(gpsL); } catch (Exception ignored) { }
            gpsL = null;
        }
        sm.unregisterListener(this);
        kind = null;
        meterOn = false;
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        long now = SystemClock.elapsedRealtime();
        if (now - lastPush < 90 || kind == null) return;
        lastPush = now;
        JSONArray v = new JSONArray();
        try {
            if ("orient".equals(kind)) {
                SensorManager.getRotationMatrixFromVector(rot, e.values);
                SensorManager.getOrientation(rot, ori);
                double az = (Math.toDegrees(ori[0]) + 360) % 360;
                v.put(az).put(Math.toDegrees(ori[1])).put(Math.toDegrees(ori[2])).put(e.accuracy);
            } else if ("pressure".equals(kind)) {
                v.put((double) e.values[0]).put((double) SensorManager.getAltitude(SensorManager.PRESSURE_STANDARD_ATMOSPHERE, e.values[0]));
            } else if ("mag".equals(kind)) {
                double t = Math.sqrt(e.values[0] * e.values[0] + e.values[1] * e.values[1] + e.values[2] * e.values[2]);
                v.put(t).put(e.accuracy);
            } else {
                for (float f : e.values) v.put((double) f);
            }
        } catch (Exception ignored) { }
        a.js("window.__sensor&&window.__sensor(" + JSONObject.quote(kind) + "," + v + ")");
    }

    @Override
    public void onAccuracyChanged(Sensor s, int acc) { }

    // ---------------- Ses ölçer (dB, kalibre değil) ----------------
    boolean soundMeter() {
        if (a.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return false;
        stop();
        meterOn = true;
        new Thread(() -> {
            int rate = 44100;
            int buf = Math.max(AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT), 4096);
            AudioRecord r;
            try {
                r = new AudioRecord(MediaRecorder.AudioSource.MIC, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, buf);
                r.startRecording();
            } catch (Exception ex) { meterOn = false; return; }
            short[] s = new short[buf / 2];
            while (meterOn) {
                int n = r.read(s, 0, s.length);
                if (n <= 0) continue;
                double sum = 0;
                for (int i = 0; i < n; i++) sum += (double) s[i] * s[i];
                double rms = Math.sqrt(sum / n);
                // Yaklaşık ölçek: dBFS + 90 → kabaca ortam dB(A). Kalibre değildir.
                double db = rms > 0 ? 20 * Math.log10(rms / 32768.0) + 90 : 0;
                a.js("window.__sensor&&window.__sensor('sound',[" + String.format(Locale.US, "%.1f", Math.max(0, db)) + "])");
            }
            try { r.stop(); r.release(); } catch (Exception ignored) { }
        }).start();
        return true;
    }

    // ---------------- Mikrofon testi: 5 sn kaydet, sonra çal ----------------
    boolean micTest() {
        if (micBusy || a.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return false;
        micBusy = true;
        stop();
        new Thread(() -> {
            int rate = 22050, secs = 5;
            short[] data = new short[rate * secs];
            try {
                int buf = Math.max(AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT), 4096);
                AudioRecord r = new AudioRecord(MediaRecorder.AudioSource.MIC, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, buf);
                a.js("window.__micTest&&window.__micTest('rec')");
                r.startRecording();
                int off = 0;
                while (off < data.length) {
                    int n = r.read(data, off, Math.min(2048, data.length - off));
                    if (n <= 0) break;
                    off += n;
                }
                r.stop(); r.release();
                a.js("window.__micTest&&window.__micTest('play')");
                AudioTrack t = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).build())
                        .setAudioFormat(new AudioFormat.Builder().setSampleRate(rate).setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                        .setBufferSizeInBytes(data.length * 2).setTransferMode(AudioTrack.MODE_STATIC).build();
                t.write(data, 0, off);
                t.play();
                Thread.sleep(secs * 1000L + 300);
                t.release();
                a.js("window.__micTest&&window.__micTest('done')");
            } catch (Exception e) {
                a.js("window.__micTest&&window.__micTest('error')");
            } finally {
                micBusy = false;
            }
        }).start();
        return true;
    }

    // ---------------- Titreşim ----------------
    void vibrate(JSONArray pattern) {
        Vibrator v = a.getSystemService(Vibrator.class);
        if (v == null || !v.hasVibrator()) return;
        long[] p = new long[pattern.length() + 1];
        p[0] = 0;
        for (int i = 0; i < pattern.length(); i++) p[i + 1] = pattern.optLong(i);
        v.vibrate(VibrationEffect.createWaveform(p, -1));
    }

    // ---------------- İndirilenler/AracKutusu klasörüne kaydet ----------------
    String saveText(String name, String text) throws Exception {
        return saveStream(name, "text/plain", new java.io.ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
    }

    String saveBytes(String name, String mime, byte[] data) throws Exception {
        return saveStream(name, mime, new java.io.ByteArrayInputStream(data));
    }

    private String saveStream(String name, String mime, InputStream in) throws Exception {
        ContentValues cv = new ContentValues();
        cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
        cv.put(MediaStore.Downloads.MIME_TYPE, mime);
        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/AracKutusu");
        Uri u = a.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
        if (u == null) throw new Exception("Dosya oluşturulamadı");
        try (OutputStream out = a.getContentResolver().openOutputStream(u); InputStream i = in) {
            byte[] b = new byte[1 << 16];
            int n;
            while ((n = i.read(b)) > 0) out.write(b, 0, n);
        }
        return "İndirilenler/AracKutusu/" + name;
    }

    /** Yüklü uygulamanın APK'sını İndirilenler/AracKutusu'ya kopyalar. */
    JSONObject backupApk(String pkg) throws Exception {
        PackageManager pm = a.getPackageManager();
        PackageInfo p = pm.getPackageInfo(pkg, 0);
        ApplicationInfo ai = p.applicationInfo;
        String label = String.valueOf(ai.loadLabel(pm)).replaceAll("[^\\p{L}\\p{N} ._-]", "").trim();
        String name = (label.isEmpty() ? pkg : label) + "-" + (p.versionName == null ? "" : p.versionName.replaceAll("[^0-9A-Za-z._-]", "")) + ".apk";
        String path = saveStream(name, "application/vnd.android.package-archive", new FileInputStream(new File(ai.sourceDir)));
        JSONObject o = new JSONObject().put("path", path);
        o.put("split", ai.splitSourceDirs != null && ai.splitSourceDirs.length > 0);
        return o;
    }

    // ---------------- Belge tarayıcı: JPEG sayfalardan PDF ----------------
    String makePdf(JSONArray pages, String name) throws Exception {
        android.graphics.pdf.PdfDocument doc = new android.graphics.pdf.PdfDocument();
        try {
            for (int i = 0; i < pages.length(); i++) {
                String b64 = pages.getString(i);
                if (b64.contains(",")) b64 = b64.substring(b64.indexOf(',') + 1);
                byte[] jpg = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
                android.graphics.Bitmap bm = android.graphics.BitmapFactory.decodeByteArray(jpg, 0, jpg.length);
                if (bm == null) continue;
                int W = 595, H = 842; // A4, 72 dpi nokta
                android.graphics.pdf.PdfDocument.Page pg = doc.startPage(new android.graphics.pdf.PdfDocument.PageInfo.Builder(W, H, i + 1).create());
                float sc = Math.min((W - 24f) / bm.getWidth(), (H - 24f) / bm.getHeight());
                float w = bm.getWidth() * sc, h = bm.getHeight() * sc;
                android.graphics.Canvas cv = pg.getCanvas();
                cv.drawColor(0xFFFFFFFF);
                cv.drawBitmap(bm, null, new android.graphics.RectF((W - w) / 2, (H - h) / 2, (W + w) / 2, (H + h) / 2),
                        new android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG));
                doc.finishPage(pg);
                bm.recycle();
            }
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            doc.writeTo(out);
            String n = name.replaceAll("[^\\p{L}\\p{N} ._-]", "").trim();
            if (n.isEmpty()) n = "Belge";
            return saveBytes(n + " " + new java.text.SimpleDateFormat("yyyy-MM-dd HH.mm", java.util.Locale.US).format(new java.util.Date()) + ".pdf",
                    "application/pdf", out.toByteArray());
        } finally { doc.close(); }
    }

    // ---------------- Depolama hız testi ----------------
    JSONObject storageBench(Cleaner.Progress pr) throws Exception {
        File f = new File(a.getExternalFilesDir(null), "hiz-testi.tmp");
        int mb = 256;
        byte[] buf = new byte[1 << 20];
        new java.util.Random().nextBytes(buf);
        long t0 = System.nanoTime();
        try (java.io.FileOutputStream o = new java.io.FileOutputStream(f)) {
            for (int i = 0; i < mb; i++) { o.write(buf); if (i % 32 == 0) pr.on("Yazma testi… %" + (i * 100 / mb)); }
            o.getFD().sync();
        }
        double w = mb / ((System.nanoTime() - t0) / 1e9);
        t0 = System.nanoTime();
        try (FileInputStream in = new FileInputStream(f)) {
            int n, i = 0;
            while ((n = in.read(buf)) > 0) { if (++i % 32 == 0) pr.on("Okuma testi… %" + (i * 100 / mb)); }
        }
        double r = mb / ((System.nanoTime() - t0) / 1e9);
        // Rastgele 4K yazma (uygulama açılış hızını en çok etkileyen)
        java.util.Random rnd = new java.util.Random();
        byte[] small = new byte[4096];
        int ops = 0;
        pr.on("Küçük dosya testi…");
        t0 = System.nanoTime();
        try (java.io.RandomAccessFile ra = new java.io.RandomAccessFile(f, "rw")) {
            while (System.nanoTime() - t0 < 1_500_000_000L) {
                ra.seek((long) rnd.nextInt(mb * 256) * 4096);
                ra.write(small);
                if (++ops % 64 == 0) ra.getFD().sync();
            }
            ra.getFD().sync();
        }
        double iops = ops / ((System.nanoTime() - t0) / 1e9);
        f.delete();
        return new JSONObject().put("write", w).put("read", r).put("iops", iops);
    }

    JSONObject screen() throws Exception {
        android.util.DisplayMetrics m = a.getResources().getDisplayMetrics();
        return new JSONObject().put("xdpi", m.xdpi).put("ydpi", m.ydpi).put("density", m.density);
    }

    static JSONObject hasSensors(Context c) throws Exception {
        SensorManager sm = c.getSystemService(SensorManager.class);
        return new JSONObject()
                .put("light", sm.getDefaultSensor(Sensor.TYPE_LIGHT) != null)
                .put("mag", sm.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null)
                .put("orient", sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) != null || sm.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) != null)
                .put("level", sm.getDefaultSensor(Sensor.TYPE_GRAVITY) != null || sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null)
                .put("pressure", sm.getDefaultSensor(Sensor.TYPE_PRESSURE) != null)
                .put("gps", c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS))
                .put("flash", c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH))
                .put("vibrator", c.getSystemService(Vibrator.class) != null && c.getSystemService(Vibrator.class).hasVibrator());
    }
}
