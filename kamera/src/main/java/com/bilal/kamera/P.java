package com.bilal.kamera;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Size;

import androidx.preference.PreferenceManager;

import java.util.ArrayList;
import java.util.List;

/** Ayar anahtarları ve küçük yardımcılar. */
public final class P {
    private P() {}

    // Fotoğraf
    public static final String PHOTO_MP_BACK = "photo_mp_back";
    public static final String PHOTO_MP_FRONT = "photo_mp_front";
    public static final String JPEG_QUALITY = "jpeg_quality";
    public static final String CAPTURE_MODE = "capture_mode";
    public static final String PHOTO_FORMAT = "photo_format";
    public static final String MIRROR_FRONT = "mirror_front";
    public static final String SHUTTER_SOUND = "shutter_sound";
    // Video
    public static final String VIDEO_QUALITY = "video_quality";
    public static final String VIDEO_FPS = "video_fps";
    public static final String VIDEO_STAB = "video_stab";
    public static final String VIDEO_HDR = "video_hdr";
    public static final String VIDEO_AUDIO = "video_audio";
    public static final String VIDEO_BITRATE = "video_bitrate";
    // Genel
    public static final String GRID = "grid";
    public static final String LEVEL = "level";
    public static final String VOLUME_KEYS = "volume_keys";
    public static final String MAX_BRIGHTNESS = "max_brightness";
    public static final String SAVE_FOLDER = "save_folder";
    public static final String HISTOGRAM = "histogram";
    public static final String CAM_INFO = "cam_info";
    // Son durum
    public static final String ST_MODE = "st_mode";
    public static final String ST_FLASH = "st_flash";
    public static final String ST_TIMER = "st_timer";
    public static final String ST_ASPECT = "st_aspect";
    public static final String ST_HDR = "st_hdr";
    public static final String ST_FRONT = "st_front";
    public static final String ST_FILTER = "st_filter";
    // v2
    public static final String WATERMARK = "watermark";
    public static final String WATERMARK_TEXT = "watermark_text";
    public static final String LOCATION = "location";
    public static final String QR = "qr";
    // v3
    public static final String SOUND_TRIGGER = "sound_trigger";
    public static final String KEEP_ORIGINAL = "keep_original";
    public static final String SLOWMO_FPS = "slowmo_fps";
    public static final String VIDEO_SNAPSHOT = "video_snapshot";
    // v4: görünüm
    public static final String ACCENT = "accent_color";
    public static final String SHUTTER_STYLE = "shutter_style";
    public static final String SMOOTH_ZOOM = "smooth_zoom";

    /** Kullanıcının seçtiği vurgu rengi (düğmeler, seçili mod, odak halkası). */
    public static int accent(Context c) {
        try { return android.graphics.Color.parseColor(sp(c).getString(ACCENT, "#FFC83D")); }
        catch (Exception e) { return 0xFFFFC83D; }
    }
    // Telefonun yetenekleri (kameradan okunur, ayarlar ekranı bunlara göre seçenek gösterir)
    public static String cap(String facing, String what) { return "cap_" + facing + "_" + what; }
    public static final String CAP_INFO_TEXT = "cap_info_text";

    public static SharedPreferences sp(Context c) { return PreferenceManager.getDefaultSharedPreferences(c); }

    public static int i(SharedPreferences sp, String k, int def) {
        try { return Integer.parseInt(sp.getString(k, String.valueOf(def))); } catch (Exception e) { return def; }
    }

    public static List<Size> parseSizes(String s) {
        List<Size> out = new ArrayList<>();
        if (s == null || s.isEmpty()) return out;
        for (String p : s.split(",")) {
            try { out.add(Size.parseSize(p.trim())); } catch (Exception ignored) {}
        }
        return out;
    }

    public static String joinSizes(List<Size> l) {
        StringBuilder b = new StringBuilder();
        for (Size s : l) { if (b.length() > 0) b.append(','); b.append(s.getWidth()).append('x').append(s.getHeight()); }
        return b.toString();
    }

    public static int mp(Size s) { return Math.round(s.getWidth() * (float) s.getHeight() / 1_000_000f); }

    /** İstenen en-boy oranında (yatay oran, örn. 4/3) hedef megapiksele en yakın boyut. targetMp 0 = en büyük. */
    public static Size pick(List<Size> sizes, float aspect, int targetMp) {
        Size best = null;
        for (Size s : sizes) {
            float a = s.getWidth() / (float) s.getHeight();
            if (Math.abs(a - aspect) > 0.03f) continue;
            if (best == null) { best = s; continue; }
            long area = (long) s.getWidth() * s.getHeight(), bArea = (long) best.getWidth() * best.getHeight();
            if (targetMp <= 0) { if (area > bArea) best = s; }
            else {
                float d = Math.abs(area / 1e6f - targetMp), bd = Math.abs(bArea / 1e6f - targetMp);
                if (d < bd - 0.01f || (Math.abs(d - bd) <= 0.01f && area > bArea)) best = s;
            }
        }
        return best;
    }
}
