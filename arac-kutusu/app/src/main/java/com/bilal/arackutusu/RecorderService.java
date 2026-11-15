package com.bilal.arackutusu;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.database.Cursor;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.provider.MediaStore;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Ses kaydedici. Kayıt bir "ön plan hizmeti" olarak çalışır: ekran kapansa da devam eder,
 * bildirim çubuğunda "Kaydediliyor" yazar ve oradan durdurulabilir.
 * Dosyalar Kayıtlar/AracKutusu (eski Android'de Müzik/AracKutusu) klasörüne .m4a olarak kaydedilir.
 */
public class RecorderService extends Service {
    static final String CH = "ses_kaydi", STOP = "com.bilal.arackutusu.KAYDI_DURDUR";
    static volatile boolean recording = false;
    static volatile long startedAt = 0;
    static volatile MediaRecorder rec;
    private static Uri uri;
    private static ParcelFileDescriptor pfd;
    static volatile String lastError = null;

    static String folder() {
        return Build.VERSION.SDK_INT >= 31 ? Environment.DIRECTORY_RECORDINGS + "/AracKutusu" : Environment.DIRECTORY_MUSIC + "/AracKutusu";
    }

    @Override
    public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int id) {
        if (intent != null && STOP.equals(intent.getAction())) { stopRec(this); stopSelf(); return START_NOT_STICKY; }
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CH, "Ses kaydı", NotificationManager.IMPORTANCE_LOW));
        PendingIntent stop = PendingIntent.getService(this, 3, new Intent(this, RecorderService.class).setAction(STOP), PendingIntent.FLAG_IMMUTABLE);
        PendingIntent open = PendingIntent.getActivity(this, 4, new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, CH).setSmallIcon(R.drawable.ic_tile).setContentTitle("🔴 Kaydediliyor")
                .setContentText("Durdurmak için dokun veya uygulamaya dön").setUsesChronometer(true).setWhen(System.currentTimeMillis())
                .setOngoing(true).setContentIntent(open)
                .addAction(new Notification.Action.Builder(null, "Durdur", stop).build()).build();
        try {
            if (Build.VERSION.SDK_INT >= 30) startForeground(9, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            else startForeground(9, n);
        } catch (Exception e) { lastError = "Kayıt başlatılamadı: " + e.getMessage(); stopSelf(); return START_NOT_STICKY; }
        String name = intent == null ? null : intent.getStringExtra("name");
        if (!startRec(this, name == null ? "Kayıt" : name)) stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() { stopRec(this); super.onDestroy(); }

    private static boolean startRec(Context c, String name) {
        if (recording) return true;
        try {
            String file = name.replaceAll("[^\\p{L}\\p{N} ._-]", "").trim();
            if (file.isEmpty()) file = "Kayıt";
            file += " " + new java.text.SimpleDateFormat("yyyy-MM-dd HH.mm", java.util.Locale.US).format(new java.util.Date()) + ".m4a";
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Audio.Media.DISPLAY_NAME, file);
            cv.put(MediaStore.Audio.Media.MIME_TYPE, "audio/mp4");
            cv.put(MediaStore.Audio.Media.RELATIVE_PATH, folder());
            cv.put(MediaStore.Audio.Media.IS_PENDING, 1);
            uri = c.getContentResolver().insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("Dosya oluşturulamadı");
            pfd = c.getContentResolver().openFileDescriptor(uri, "w");
            MediaRecorder r = Build.VERSION.SDK_INT >= 31 ? new MediaRecorder(c) : new MediaRecorder();
            r.setAudioSource(MediaRecorder.AudioSource.MIC);
            r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            r.setAudioEncodingBitRate(128000);
            r.setAudioSamplingRate(44100);
            r.setAudioChannels(1);
            r.setOutputFile(pfd.getFileDescriptor());
            r.prepare();
            r.start();
            rec = r;
            recording = true;
            startedAt = SystemClock.elapsedRealtime();
            lastError = null;
            return true;
        } catch (Exception e) {
            lastError = "Kayıt başlatılamadı: " + e.getMessage();
            cleanup(c, true);
            return false;
        }
    }

    static void stopRec(Context c) {
        if (!recording) return;
        recording = false;
        boolean ok = true;
        try { rec.stop(); } catch (Exception e) { ok = false; lastError = "Kayıt çok kısa veya bozuk, silindi"; }
        cleanup(c, !ok);
    }

    private static void cleanup(Context c, boolean deleteFile) {
        try { if (rec != null) rec.release(); } catch (Exception ignored) { }
        rec = null;
        try { if (pfd != null) pfd.close(); } catch (Exception ignored) { }
        pfd = null;
        if (uri != null) {
            try {
                if (deleteFile) c.getContentResolver().delete(uri, null, null);
                else {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Audio.Media.IS_PENDING, 0);
                    c.getContentResolver().update(uri, cv, null, null);
                }
            } catch (Exception ignored) { }
        }
        uri = null;
    }

    static JSONObject state() throws Exception {
        int amp = 0;
        try { if (recording && rec != null) amp = rec.getMaxAmplitude(); } catch (Exception ignored) { }
        return new JSONObject().put("on", recording).put("ms", recording ? SystemClock.elapsedRealtime() - startedAt : 0)
                .put("amp", amp).put("error", lastError == null ? JSONObject.NULL : lastError);
    }

    static JSONArray list(Context c) throws Exception {
        JSONArray a = new JSONArray();
        String[] cols = {MediaStore.Audio.Media._ID, MediaStore.Audio.Media.DISPLAY_NAME, MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE, MediaStore.Audio.Media.DATE_ADDED};
        try (Cursor cu = c.getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cols,
                MediaStore.Audio.Media.RELATIVE_PATH + " LIKE ?", new String[]{"%AracKutusu%"}, MediaStore.Audio.Media.DATE_ADDED + " DESC")) {
            if (cu != null) while (cu.moveToNext()) {
                a.put(new JSONObject().put("id", cu.getLong(0)).put("name", cu.getString(1)).put("dur", cu.getLong(2))
                        .put("size", cu.getLong(3)).put("date", cu.getLong(4) * 1000));
            }
        }
        return a;
    }

    static Uri uriOf(long id) { return ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id); }

    static boolean delete(Context c, long id) {
        try { return c.getContentResolver().delete(uriOf(id), null, null) > 0; } catch (Exception e) { return false; }
    }

    static boolean share(Context c, long id) {
        try {
            Intent i = new Intent(Intent.ACTION_SEND).setType("audio/mp4").putExtra(Intent.EXTRA_STREAM, uriOf(id))
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            c.startActivity(Intent.createChooser(i, "Kaydı paylaş").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (Exception e) { return false; }
    }

    static boolean rename(Context c, long id, String name) {
        try {
            String n = name.replaceAll("[^\\p{L}\\p{N} ._-]", "").trim();
            if (n.isEmpty()) return false;
            if (!n.toLowerCase(java.util.Locale.ROOT).endsWith(".m4a")) n += ".m4a";
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Audio.Media.DISPLAY_NAME, n);
            return c.getContentResolver().update(uriOf(id), cv, null, null) > 0;
        } catch (Exception e) { return false; }
    }
}
