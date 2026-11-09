package com.bilal.kamera;

import android.content.ContentResolver;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import androidx.exifinterface.media.ExifInterface;

import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Kaydedilmiş JPEG'e sonradan işlem: dijital zoom kırpması, renk filtresi, vinyet, filigran/çerçeve.
 * Kamera bilgileri (EXIF) korunur; görüntü dik çevrildiği için yön "normal" yazılır.
 */
public final class PostProcessor {
    private PostProcessor() {}

    public static final class Job {
        public Uri uri;
        public float zoom = 1f;          // >1 ise ortadan kırpılır
        public int filter = 0;
        public int watermark = 0;        // 0 kapalı, 1 yazı, 2 çerçeve
        public String brand = "";
        public String lens = "";         // "23mm f/1.6"
        public int quality = 95;
    }

    public static boolean needed(Job j) {
        return j.zoom > 1.01f || Filters.matrix(j.filter) != null || Filters.VIGNETTE[j.filter] || j.watermark != 0;
    }

    /** Başarılıysa küçük önizleme bitmap'i döner. */
    public static Bitmap run(Context ctx, Job j) throws Exception {
        ContentResolver cr = ctx.getContentResolver();
        // 1) Eski EXIF bilgilerini oku
        ExifInterface old;
        try (InputStream in = cr.openInputStream(j.uri)) { old = new ExifInterface(in); }
        int orient = old.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);

        // 2) Çöz (bellek için gerekirse yarı boyuta in)
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        try (InputStream in = cr.openInputStream(j.uri)) { BitmapFactory.decodeStream(in, null, o); }
        int sw = o.outWidth, sh = o.outHeight;
        if (sw <= 0 || sh <= 0) throw new IllegalStateException("çözülemedi");
        int cropW = Math.round(sw / Math.max(1f, j.zoom)), cropH = Math.round(sh / Math.max(1f, j.zoom));
        Rect crop = new Rect((sw - cropW) / 2, (sh - cropH) / 2, (sw - cropW) / 2 + cropW, (sh - cropH) / 2 + cropH);
        long maxPixels = Runtime.getRuntime().maxMemory() / 12; // iki bitmap + pay
        o = new BitmapFactory.Options();
        o.inSampleSize = 1;
        while ((long) sw * sh / ((long) o.inSampleSize * o.inSampleSize) > maxPixels) o.inSampleSize *= 2;
        Bitmap src;
        if (j.zoom > 1.01f) {
            try (InputStream in = cr.openInputStream(j.uri)) {
                @SuppressWarnings("deprecation") android.graphics.BitmapRegionDecoder rd = android.graphics.BitmapRegionDecoder.newInstance(in, false);
                src = rd.decodeRegion(crop, o);
                rd.recycle();
            }
        } else {
            try (InputStream in = cr.openInputStream(j.uri)) { src = BitmapFactory.decodeStream(in, null, o); }
        }
        if (src == null) throw new IllegalStateException("çözülemedi");

        // 3) Döndür + filtre tek çizimde
        Matrix m = exifMatrix(orient, src.getWidth(), src.getHeight());
        RectF bounds = new RectF(0, 0, src.getWidth(), src.getHeight());
        m.mapRect(bounds);
        int dw = Math.round(bounds.width()), dh = Math.round(bounds.height());
        m.postTranslate(-bounds.left, -bounds.top);
        int frame = j.watermark == 2 ? Math.round(Math.min(dw, dh) * 0.11f) : 0;
        Bitmap dst = Bitmap.createBitmap(dw, dh + frame, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(dst);
        Paint p = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
        android.graphics.ColorMatrix cm = Filters.matrix(j.filter);
        if (cm != null) p.setColorFilter(new ColorMatrixColorFilter(cm));
        c.drawBitmap(src, m, p);
        src.recycle();

        if (Filters.VIGNETTE[j.filter]) {
            Paint v = new Paint(Paint.ANTI_ALIAS_FLAG);
            float r = (float) Math.hypot(dw, dh) / 2f;
            v.setShader(new RadialGradient(dw / 2f, dh / 2f, r, new int[]{0x00000000, 0x00000000, 0x8C000000},
                    new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP));
            c.drawRect(0, 0, dw, dh, v);
        }

        String params = params(old, j.lens);
        if (j.watermark == 1) drawTextMark(c, dw, dh, j.brand, params);
        else if (j.watermark == 2) drawFrame(c, dw, dh, frame, j.brand, params, old);

        // 4) Üzerine yaz
        try (OutputStream out = cr.openOutputStream(j.uri, "wt")) {
            dst.compress(Bitmap.CompressFormat.JPEG, j.quality, out);
        }
        // 5) EXIF'i geri yaz
        try (ParcelFileDescriptor pfd = cr.openFileDescriptor(j.uri, "rw")) {
            ExifInterface ne = new ExifInterface(pfd.getFileDescriptor());
            for (String t : TAGS) {
                String v = old.getAttribute(t);
                if (v != null) ne.setAttribute(t, v);
            }
            ne.setAttribute(ExifInterface.TAG_ORIENTATION, String.valueOf(ExifInterface.ORIENTATION_NORMAL));
            ne.setAttribute(ExifInterface.TAG_IMAGE_WIDTH, String.valueOf(dst.getWidth()));
            ne.setAttribute(ExifInterface.TAG_IMAGE_LENGTH, String.valueOf(dst.getHeight()));
            ne.saveAttributes();
        } catch (Exception ignored) {}

        float s = 320f / Math.max(dst.getWidth(), dst.getHeight());
        Bitmap thumb = Bitmap.createScaledBitmap(dst, Math.max(1, Math.round(dst.getWidth() * s)), Math.max(1, Math.round(dst.getHeight() * s)), true);
        dst.recycle();
        return thumb;
    }

    private static final String[] TAGS = {
            ExifInterface.TAG_DATETIME, ExifInterface.TAG_DATETIME_ORIGINAL, ExifInterface.TAG_DATETIME_DIGITIZED,
            ExifInterface.TAG_OFFSET_TIME, ExifInterface.TAG_OFFSET_TIME_ORIGINAL, ExifInterface.TAG_SUBSEC_TIME_ORIGINAL,
            ExifInterface.TAG_MAKE, ExifInterface.TAG_MODEL, ExifInterface.TAG_SOFTWARE,
            ExifInterface.TAG_EXPOSURE_TIME, ExifInterface.TAG_F_NUMBER, ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY,
            ExifInterface.TAG_FOCAL_LENGTH, ExifInterface.TAG_FOCAL_LENGTH_IN_35MM_FILM, ExifInterface.TAG_FLASH,
            ExifInterface.TAG_WHITE_BALANCE, ExifInterface.TAG_EXPOSURE_BIAS_VALUE, ExifInterface.TAG_APERTURE_VALUE,
            ExifInterface.TAG_SHUTTER_SPEED_VALUE, ExifInterface.TAG_METERING_MODE, ExifInterface.TAG_DIGITAL_ZOOM_RATIO,
            ExifInterface.TAG_GPS_LATITUDE, ExifInterface.TAG_GPS_LATITUDE_REF, ExifInterface.TAG_GPS_LONGITUDE,
            ExifInterface.TAG_GPS_LONGITUDE_REF, ExifInterface.TAG_GPS_ALTITUDE, ExifInterface.TAG_GPS_ALTITUDE_REF,
            ExifInterface.TAG_GPS_TIMESTAMP, ExifInterface.TAG_GPS_DATESTAMP, ExifInterface.TAG_GPS_PROCESSING_METHOD};

    static Matrix exifMatrix(int orient, int w, int h) {
        Matrix m = new Matrix();
        switch (orient) {
            case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: m.setScale(-1, 1); break;
            case ExifInterface.ORIENTATION_ROTATE_180: m.setRotate(180); break;
            case ExifInterface.ORIENTATION_FLIP_VERTICAL: m.setScale(1, -1); break;
            case ExifInterface.ORIENTATION_TRANSPOSE: m.setRotate(90); m.postScale(-1, 1); break;
            case ExifInterface.ORIENTATION_ROTATE_90: m.setRotate(90); break;
            case ExifInterface.ORIENTATION_TRANSVERSE: m.setRotate(-90); m.postScale(-1, 1); break;
            case ExifInterface.ORIENTATION_ROTATE_270: m.setRotate(-90); break;
            default: break;
        }
        return m;
    }

    /** "23mm  f/1.6  1/120s  ISO 200" */
    static String params(ExifInterface e, String lensFallback) {
        StringBuilder b = new StringBuilder();
        int f35 = e.getAttributeInt(ExifInterface.TAG_FOCAL_LENGTH_IN_35MM_FILM, 0);
        if (f35 > 0) b.append(f35).append("mm");
        double fn = e.getAttributeDouble(ExifInterface.TAG_F_NUMBER, 0);
        if (fn > 0) b.append(b.length() > 0 ? "  " : "").append(String.format(Locale.US, "f/%.1f", fn));
        if (b.length() == 0 && lensFallback != null) b.append(lensFallback);
        double ex = e.getAttributeDouble(ExifInterface.TAG_EXPOSURE_TIME, 0);
        if (ex > 0) b.append("  ").append(Caps.shutterText(Math.round(ex * 1e9))).append(ex < 0.95 ? "s" : "");
        int iso = e.getAttributeInt(ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY, 0);
        if (iso > 0) b.append("  ISO ").append(iso);
        return b.toString().trim();
    }

    private static void drawTextMark(Canvas c, int w, int h, String brand, String params) {
        float base = Math.min(w, h);
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setColor(Color.WHITE);
        t.setShadowLayer(base * 0.006f, 0, base * 0.002f, 0x99000000);
        float pad = base * 0.035f;
        t.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        t.setTextSize(base * 0.032f);
        float y2 = h - pad;
        Paint s = new Paint(t);
        s.setTypeface(Typeface.DEFAULT);
        s.setTextSize(base * 0.022f);
        s.setColor(0xE6FFFFFF);
        c.drawText(params, pad, y2, s);
        c.drawText(brand, pad, y2 - s.getTextSize() * 1.45f, t);
    }

    private static void drawFrame(Canvas c, int w, int h, int fh, String brand, String params, ExifInterface e) {
        Paint bg = new Paint();
        bg.setColor(Color.WHITE);
        c.drawRect(0, h, w, h + fh, bg);
        float pad = fh * 0.42f;
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setColor(0xFF111111);
        t.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        t.setTextSize(fh * 0.27f);
        Paint s = new Paint(Paint.ANTI_ALIAS_FLAG);
        s.setColor(0xFF777777);
        s.setTextSize(fh * 0.19f);
        float cy = h + fh / 2f;
        c.drawText(brand, pad, cy - fh * 0.04f, t);
        String date = e.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL);
        String ds = "";
        try {
            if (date != null) ds = new SimpleDateFormat("d MMMM yyyy  HH:mm", new Locale("tr"))
                    .format(new SimpleDateFormat("yyyy:MM:dd HH:mm:ss", Locale.US).parse(date));
        } catch (Exception ignored) {}
        if (ds.isEmpty()) ds = new SimpleDateFormat("d MMMM yyyy  HH:mm", new Locale("tr")).format(new Date());
        c.drawText(ds, pad, cy + fh * 0.24f, s);
        // sağda parametreler
        Paint r = new Paint(t);
        r.setTextAlign(Paint.Align.RIGHT);
        r.setTypeface(Typeface.DEFAULT);
        r.setTextSize(fh * 0.22f);
        c.drawText(params, w - pad, cy + fh * 0.08f, r);
        // ayraç çizgisi
        float pw = r.measureText(params);
        Paint line = new Paint();
        line.setColor(0xFFDDDDDD);
        line.setStrokeWidth(Math.max(2, fh * 0.012f));
        float lx = w - pad - pw - fh * 0.3f;
        if (lx > pad + t.measureText(brand) + fh * 0.3f) c.drawLine(lx, cy - fh * 0.22f, lx, cy + fh * 0.22f, line);
    }
}
