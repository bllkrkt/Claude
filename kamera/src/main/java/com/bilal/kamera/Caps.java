package com.bilal.kamera;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.util.Range;
import android.util.Size;
import android.util.SizeF;

import androidx.camera.camera2.interop.Camera2CameraInfo;
import androidx.camera.camera2.interop.ExperimentalCamera2Interop;
import androidx.camera.core.CameraInfo;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.DynamicRange;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.Preview;
import androidx.camera.extensions.ExtensionMode;
import androidx.camera.extensions.ExtensionsManager;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.Quality;
import androidx.camera.video.Recorder;
import androidx.camera.video.VideoCapabilities;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Telefonun kamera yeteneklerini okur ve ayarlara kaydeder. */
@SuppressLint("UnsafeOptInUsageError")
@androidx.annotation.OptIn(markerClass = ExperimentalCamera2Interop.class)
public final class Caps {
    private Caps() {}

    public static final Quality[] QUALITIES = {Quality.UHD, Quality.FHD, Quality.HD, Quality.SD};
    public static final String[] Q_KEYS = {"UHD", "FHD", "HD", "SD"};
    public static final String[] Q_NAMES = {"4K (2160p)", "Full HD (1080p)", "HD (720p)", "SD (480p)"};

    public static Quality quality(String key) {
        for (int i = 0; i < Q_KEYS.length; i++) if (Q_KEYS[i].equals(key)) return QUALITIES[i];
        return Quality.FHD;
    }

    /** Arka ve ön kameranın yeteneklerini yazar. */
    public static void probe(Context ctx, ProcessCameraProvider provider, ExtensionsManager ext) {
        SharedPreferences.Editor e = P.sp(ctx).edit();
        StringBuilder info = new StringBuilder();
        for (int f = 0; f < 2; f++) {
            String facing = f == 0 ? "back" : "front";
            CameraSelector sel = f == 0 ? CameraSelector.DEFAULT_BACK_CAMERA : CameraSelector.DEFAULT_FRONT_CAMERA;
            CameraInfo ci;
            try {
                if (!provider.hasCamera(sel)) continue;
                ci = provider.getCameraInfo(sel);
            } catch (Exception ex) { continue; }
            info.append(f == 0 ? "ARKA KAMERA\n" : "\nÖN KAMERA\n");
            try {
                Camera2CameraInfo c2 = Camera2CameraInfo.from(ci);
                StreamConfigurationMap map = c2.getCameraCharacteristic(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                List<Size> sizes = new ArrayList<>(), hi = new ArrayList<>();
                if (map != null) {
                    Size[] s = map.getOutputSizes(ImageFormat.JPEG);
                    if (s != null) sizes.addAll(Arrays.asList(s));
                    Size[] h = map.getHighResolutionOutputSizes(ImageFormat.JPEG);
                    if (h != null) { hi.addAll(Arrays.asList(h)); sizes.addAll(hi); }
                }
                Collections.sort(sizes, (a, b) -> Long.compare((long) b.getWidth() * b.getHeight(), (long) a.getWidth() * a.getHeight()));
                e.putString(P.cap(facing, "sizes"), P.joinSizes(sizes));
                e.putString(P.cap(facing, "hisizes"), P.joinSizes(hi));
                if (!sizes.isEmpty()) info.append("En yüksek fotoğraf: ").append(sizes.get(0).getWidth()).append('×').append(sizes.get(0).getHeight())
                        .append(" (").append(P.mp(sizes.get(0))).append(" MP)\n");
                Integer level = c2.getCameraCharacteristic(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL);
                info.append("Donanım seviyesi: ").append(levelName(level)).append('\n');
                Range<Integer> iso = c2.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE);
                if (iso != null) info.append("ISO: ").append(iso.getLower()).append(" – ").append(iso.getUpper()).append('\n');
                Range<Long> exp = c2.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE);
                if (exp != null) info.append("Enstantane: ").append(shutterText(exp.getUpper())).append(" – ").append(shutterText(exp.getLower())).append('\n');
                float[] fl = c2.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);
                float[] ap = c2.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES);
                SizeF sensor = c2.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE);
                if (fl != null && fl.length > 0) {
                    info.append("Odak uzaklığı: ").append(String.format(Locale.US, "%.2f mm", fl[0]));
                    if (sensor != null) {
                        double diag = Math.hypot(sensor.getWidth(), sensor.getHeight());
                        info.append(String.format(Locale.US, " (~%d mm eşdeğer)", Math.round(fl[0] * 43.27 / diag)));
                    }
                    info.append('\n');
                }
                if (ap != null && ap.length > 0) info.append(String.format(Locale.US, "Diyafram: f/%.1f\n", ap[0]));
                Float minF = c2.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE);
                info.append("Elle odak: ").append(minF != null && minF > 0 ? "var" : "yok").append('\n');
                int[] caps = c2.getCameraCharacteristic(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);
                boolean manual = false, raw = false;
                if (caps != null) for (int c : caps) {
                    if (c == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_SENSOR) manual = true;
                    if (c == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW) raw = true;
                }
                e.putBoolean(P.cap(facing, "manual"), manual);
                info.append("Elle ISO/enstantane: ").append(manual ? "var" : "yok").append('\n');
                info.append("RAW (DNG): ").append(raw ? "kamera destekliyor" : "yok").append('\n');
                info.append("Fiziksel lens sayısı: ").append(Math.max(1, ci.getPhysicalCameraInfos().size())).append('\n');
            } catch (Exception ex) { info.append("Ayrıntı okunamadı\n"); }

            try {
                Float zMax = ci.getZoomState().getValue() != null ? ci.getZoomState().getValue().getMaxZoomRatio() : null;
                Float zMin = ci.getZoomState().getValue() != null ? ci.getZoomState().getValue().getMinZoomRatio() : null;
                if (zMax != null) info.append(String.format(Locale.US, "Yakınlaştırma: %.1f× – %.0f×\n", zMin, zMax));
            } catch (Exception ignored) {}

            try {
                Set<Integer> formats = ImageCapture.getImageCaptureCapabilities(ci).getSupportedOutputFormats();
                StringBuilder fs = new StringBuilder();
                for (Integer x : formats) { if (fs.length() > 0) fs.append(','); fs.append(x); }
                e.putString(P.cap(facing, "formats"), fs.toString());
                info.append("Ultra HDR fotoğraf: ").append(formats.contains(ImageCapture.OUTPUT_FORMAT_JPEG_ULTRA_HDR) ? "var" : "yok").append('\n');
                info.append("RAW + JPEG kayıt: ").append(formats.contains(ImageCapture.OUTPUT_FORMAT_RAW_JPEG) ? "var" : "yok").append('\n');
            } catch (Exception ex) { e.putString(P.cap(facing, "formats"), ""); }
            e.putBoolean(P.cap(facing, "zsl"), safeZsl(ci));

            try {
                VideoCapabilities vc = Recorder.getVideoCapabilities(ci);
                List<Quality> qs = vc.getSupportedQualities(DynamicRange.SDR);
                StringBuilder q = new StringBuilder(), qn = new StringBuilder();
                for (int i = 0; i < QUALITIES.length; i++) if (qs.contains(QUALITIES[i])) {
                    if (q.length() > 0) { q.append(','); qn.append(", "); }
                    q.append(Q_KEYS[i]); qn.append(Q_NAMES[i].split(" ")[0]);
                }
                e.putString(P.cap(facing, "vq"), q.toString());
                boolean stab = vc.isStabilizationSupported() || Preview.getPreviewCapabilities(ci).isStabilizationSupported();
                e.putBoolean(P.cap(facing, "stab"), stab);
                boolean hlg = vc.getSupportedDynamicRanges().contains(DynamicRange.HLG_10_BIT);
                e.putBoolean(P.cap(facing, "hlg"), hlg);
                boolean fps60 = false;
                for (Range<Integer> r : ci.getSupportedFrameRateRanges()) if (r.getUpper() >= 60) fps60 = true;
                e.putBoolean(P.cap(facing, "fps60"), fps60);
                info.append("Video: ").append(qn.length() > 0 ? qn : "?").append('\n');
                info.append("60 fps: ").append(fps60 ? "var" : "yok").append(" · Sabitleme: ").append(stab ? "var" : "yok")
                        .append(" · HDR video (10-bit): ").append(hlg ? "var" : "yok").append('\n');
            } catch (Exception ignored) {}

            if (ext != null) {
                StringBuilder xs = new StringBuilder();
                int[] modes = {ExtensionMode.NIGHT, ExtensionMode.BOKEH, ExtensionMode.HDR, ExtensionMode.FACE_RETOUCH, ExtensionMode.AUTO};
                String[] names = {"Gece", "Portre", "HDR", "Güzellik", "Oto"};
                for (int i = 0; i < modes.length; i++) {
                    boolean ok = false;
                    try { ok = ext.isExtensionAvailable(sel, modes[i]); } catch (Exception ignored) {}
                    if (ok) { if (xs.length() > 0) xs.append(", "); xs.append(names[i]); }
                }
                info.append("Üretici özel modları: ").append(xs.length() > 0 ? xs : "telefon bu uygulamaya açmıyor").append('\n');
            }
        }
        e.putString(P.CAP_INFO_TEXT, info.toString().trim());
        e.apply();
    }

    private static boolean safeZsl(CameraInfo ci) { try { return ci.isZslSupported(); } catch (Exception e) { return false; } }

    static String levelName(Integer l) {
        if (l == null) return "?";
        switch (l) {
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY: return "Eski (LEGACY)";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED: return "Sınırlı (LIMITED)";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_FULL: return "Tam (FULL)";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_3: return "En üst (LEVEL 3)";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_EXTERNAL: return "Harici";
            default: return String.valueOf(l);
        }
    }

    /** Nanosaniyeyi "1/250" ya da "2\"" biçiminde yazar. */
    public static String shutterText(long ns) {
        double s = ns / 1e9;
        if (s >= 0.95) return (s == Math.floor(s) ? String.valueOf((long) s) : String.format(Locale.US, "%.1f", s)) + "\"";
        return "1/" + Math.round(1 / s);
    }

    /** Kamera açılmadan da çalışan basit bilgi (CameraManager ile). */
    public static String fallbackInfo(Context ctx) {
        try {
            CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
            return "Kamera sayısı: " + cm.getCameraIdList().length + "\nAyrıntılar için kamerayı bir kez açın.";
        } catch (Exception e) { return "Bilgi okunamadı."; }
    }
}
