package com.bilal.arackutusu;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.hardware.display.DisplayManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.BatteryManager;
import android.os.Build;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.view.Display;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

/** Telefon durumu: pil, bellek, işlemci, ekran, sistem. Sadece okur. */
final class DeviceInfo {
    private DeviceInfo() { }

    static JSONObject battery(Context c) throws Exception {
        JSONObject o = new JSONObject();
        Intent b = c.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        BatteryManager bm = c.getSystemService(BatteryManager.class);
        if (b != null) {
            int lv = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), sc = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
            o.put("level", lv < 0 ? JSONObject.NULL : Math.round(lv * 100f / sc));
            o.put("temp", b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0);
            o.put("voltage", b.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0));
            o.put("tech", b.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY));
            int st = b.getIntExtra(BatteryManager.EXTRA_STATUS, 0);
            o.put("status", st == BatteryManager.BATTERY_STATUS_CHARGING ? "Şarj oluyor" : st == BatteryManager.BATTERY_STATUS_FULL ? "Dolu"
                    : st == BatteryManager.BATTERY_STATUS_DISCHARGING || st == BatteryManager.BATTERY_STATUS_NOT_CHARGING ? "Şarjda değil" : "Bilinmiyor");
            o.put("charging", st == BatteryManager.BATTERY_STATUS_CHARGING);
            int pl = b.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
            o.put("plug", pl == BatteryManager.BATTERY_PLUGGED_AC ? "Adaptör" : pl == BatteryManager.BATTERY_PLUGGED_USB ? "USB"
                    : pl == BatteryManager.BATTERY_PLUGGED_WIRELESS ? "Kablosuz" : "");
            int h = b.getIntExtra(BatteryManager.EXTRA_HEALTH, 0);
            o.put("health", h == BatteryManager.BATTERY_HEALTH_GOOD ? "İyi" : h == BatteryManager.BATTERY_HEALTH_OVERHEAT ? "Aşırı ısınmış"
                    : h == BatteryManager.BATTERY_HEALTH_DEAD ? "Ölü" : h == BatteryManager.BATTERY_HEALTH_COLD ? "Soğuk"
                    : h == BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE ? "Aşırı voltaj" : "Bilinmiyor");
            if (Build.VERSION.SDK_INT >= 34) {
                int cyc = b.getIntExtra(BatteryManager.EXTRA_CYCLE_COUNT, -1);
                if (cyc >= 0) o.put("cycles", cyc);
            }
        }
        if (bm != null) {
            int now = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW);
            if (now != Integer.MIN_VALUE && now != 0) o.put("currentMa", Math.abs(now) > 20000 ? now / 1000 : now);
            int cc = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER);
            if (cc > 0) o.put("chargeMah", cc / 1000);
            if (Build.VERSION.SDK_INT >= 28 && bm.isCharging()) {
                long rem = bm.computeChargeTimeRemaining();
                if (rem > 0) o.put("fullInMin", rem / 60000);
            }
        }
        double design = designCapacity(c);
        if (design > 0) o.put("designMah", Math.round(design));
        return o;
    }

    /** Tasarım kapasitesi: Android'in gizli PowerProfile sınıfından okunur; okunamazsa 0. */
    private static double designCapacity(Context c) {
        try {
            Class<?> pp = Class.forName("com.android.internal.os.PowerProfile");
            Object p = pp.getConstructor(Context.class).newInstance(c);
            return (double) pp.getMethod("getBatteryCapacity").invoke(p);
        } catch (Throwable t) { return 0; }
    }

    static JSONObject all(Context c) throws Exception {
        JSONObject o = new JSONObject();
        o.put("battery", battery(c));

        ActivityManager am = c.getSystemService(ActivityManager.class);
        ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(mi);
        o.put("ramTotal", mi.totalMem);
        o.put("ramFree", mi.availMem);
        o.put("ramLow", mi.lowMemory);

        o.put("storageTotal", Cleaner.root().getTotalSpace());
        o.put("storageFree", Cleaner.root().getUsableSpace());

        JSONObject cpu = new JSONObject();
        int cores = Runtime.getRuntime().availableProcessors();
        cpu.put("cores", cores);
        long maxF = 0;
        for (int i = 0; i < cores; i++) maxF = Math.max(maxF, readLong("/sys/devices/system/cpu/cpu" + i + "/cpufreq/cpuinfo_max_freq"));
        if (maxF > 0) cpu.put("maxMhz", maxF / 1000);
        cpu.put("soc", Build.VERSION.SDK_INT >= 31 ? (Build.SOC_MANUFACTURER + " " + Build.SOC_MODEL).trim() : Build.HARDWARE);
        cpu.put("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "");
        o.put("cpu", cpu);

        JSONObject scr = new JSONObject();
        DisplayManager dm = c.getSystemService(DisplayManager.class);
        Display d = dm.getDisplay(Display.DEFAULT_DISPLAY);
        if (d != null) {
            Display.Mode m = d.getMode();
            scr.put("w", m.getPhysicalWidth());
            scr.put("h", m.getPhysicalHeight());
            scr.put("hz", Math.round(d.getRefreshRate()));
            float max = 0;
            for (Display.Mode x : d.getSupportedModes()) max = Math.max(max, x.getRefreshRate());
            scr.put("maxHz", Math.round(max));
            DisplayMetrics met = c.getResources().getDisplayMetrics();
            scr.put("dpi", met.densityDpi);
            if (Build.VERSION.SDK_INT >= 24) scr.put("hdr", d.isHdr());
        }
        o.put("screen", scr);

        JSONObject sys = new JSONObject();
        sys.put("brand", Build.MANUFACTURER);
        sys.put("model", Build.MODEL);
        sys.put("device", Build.DEVICE);
        sys.put("android", Build.VERSION.RELEASE);
        sys.put("sdk", Build.VERSION.SDK_INT);
        sys.put("patch", Build.VERSION.SECURITY_PATCH);
        sys.put("kernel", System.getProperty("os.version"));
        sys.put("build", Build.DISPLAY);
        sys.put("uptimeMin", SystemClock.elapsedRealtime() / 60000);
        sys.put("bootloader", Build.BOOTLOADER);
        o.put("system", sys);

        SensorManager sm = c.getSystemService(SensorManager.class);
        JSONArray sens = new JSONArray();
        if (sm != null) {
            List<Sensor> l = sm.getSensorList(Sensor.TYPE_ALL);
            for (Sensor s : l) sens.put(s.getName());
        }
        o.put("sensors", sens);

        ConnectivityManager cm = c.getSystemService(ConnectivityManager.class);
        String net = "Bağlantı yok";
        try {
            NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
            if (nc != null) {
                if (nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) net = "Wi-Fi";
                else if (nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) net = "Mobil veri";
                else if (nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) net = "Ethernet";
                if (nc.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) net += " (VPN)";
            }
        } catch (Exception ignored) { }
        o.put("network", net);
        KeyguardManager km = c.getSystemService(KeyguardManager.class);
        o.put("secureLock", km != null && km.isDeviceSecure());
        return o;
    }

    private static long readLong(String p) {
        try { return Long.parseLong(new String(Files.readAllBytes(new File(p).toPath())).trim()); }
        catch (Exception e) { return 0; }
    }
}
