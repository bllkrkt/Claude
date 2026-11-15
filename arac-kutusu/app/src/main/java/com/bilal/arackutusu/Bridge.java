package com.bilal.arackutusu;

import android.app.StatusBarManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ResolveInfo;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import rikka.shizuku.Shizuku;

/** JavaScript köprüsü: window.AndroidBridge.sync(metot, json) ve .async(id, metot, json) */
public class Bridge {
    private final MainActivity a;
    private final ExecutorService pool = Executors.newFixedThreadPool(3);
    private final Shizuku.OnRequestPermissionResultListener permL;
    private final Shizuku.OnBinderReceivedListener binderL;

    Bridge(MainActivity a) {
        this.a = a;
        permL = (code, res) -> a.js("window.__onResume&&window.__onResume()");
        binderL = () -> a.js("window.__onResume&&window.__onResume()");
        try {
            Shizuku.addRequestPermissionResultListener(permL);
            Shizuku.addBinderReceivedListenerSticky(binderL);
        } catch (Throwable ignored) { }
    }

    void shutdown() {
        pool.shutdownNow();
        try {
            Shizuku.removeRequestPermissionResultListener(permL);
            Shizuku.removeBinderReceivedListener(binderL);
        } catch (Throwable ignored) { }
    }

    @JavascriptInterface
    public String sync(String method, String args) {
        try {
            JSONObject in = args == null || args.isEmpty() ? new JSONObject() : new JSONObject(args);
            Object r = doSync(method, in);
            return r == null ? "null" : r instanceof String ? JSONObject.quote((String) r) : r.toString();
        } catch (Throwable t) {
            return err(t);
        }
    }

    @JavascriptInterface
    public void async(final String id, final String method, final String args) {
        pool.execute(() -> {
            String out;
            try {
                JSONObject in = args == null || args.isEmpty() ? new JSONObject() : new JSONObject(args);
                Object r = doAsync(id, method, in);
                out = r == null ? "null" : r.toString();
            } catch (Throwable t) {
                out = err(t);
            }
            a.js("window.__done(" + JSONObject.quote(id) + "," + out + ")");
        });
    }

    private static String err(Throwable t) {
        return "{\"error\":" + JSONObject.quote(t.getClass().getSimpleName() + ": " + t.getMessage()) + "}";
    }

    private void progress(String id, String text) {
        a.js("window.__progress&&window.__progress(" + JSONObject.quote(id) + "," + JSONObject.quote(text) + ")");
    }

    private Object doSync(String m, JSONObject in) throws Exception {
        switch (m) {
            case "info": return info();
            case "openPerm": return openPerm(in.optString("which"));
            case "shizukuRequest": ShizukuHelper.request(); return true;
            case "appSettings": return start(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + in.optString("pkg"))));
            case "uninstall": return start(new Intent(Intent.ACTION_DELETE, Uri.parse("package:" + in.optString("pkg"))));
            case "overlaySettings":
                return start(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + in.optString("pkg"))))
                        || start(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION));
            case "openShortcut": return Shortcuts.open(a, in.optString("id"));
            case "playProtect": return start(playProtect());
            case "panel": return panel(in.optString("which"));
            case "state": return Toggles.state(a);
            case "modes": {
                JSONObject o = new JSONObject();
                o.put("modes", Toggles.modes(a));
                o.put("tiles", new JSONArray().put(Toggles.tileMode(a, 1)).put(Toggles.tileMode(a, 2)).put(Toggles.tileMode(a, 3)));
                o.put("last", Toggles.lastMode(a));
                return o;
            }
            case "saveModes": {
                if (in.has("modes")) Toggles.saveModes(a, in.getJSONArray("modes"));
                JSONArray t = in.optJSONArray("tiles");
                if (t != null) for (int i = 0; i < 3 && i < t.length(); i++) Toggles.setTileMode(a, i + 1, t.optString(i));
                refreshTiles();
                return true;
            }
            case "resetModes": Toggles.saveModes(a, Toggles.defaultModes()); refreshTiles(); return Toggles.modes(a);
            case "installed":
                try { a.getPackageManager().getPackageInfo(in.optString("pkg"), 0); return true; }
                catch (Exception e) { return false; }
            case "toast": Toast.makeText(a, in.optString("text"), Toast.LENGTH_SHORT).show(); return true;
            default: throw new IllegalArgumentException("Bilinmeyen metot: " + m);
        }
    }

    private Object doAsync(String id, String m, JSONObject in) throws Exception {
        switch (m) {
            case "scanClean":
                if (!Cleaner.hasAccess()) return new JSONObject().put("error", "noaccess");
                return Cleaner.scan(a, in.optLong("minLarge", 100L << 20), t -> progress(id, t));
            case "delete": return Cleaner.delete(a, in.getJSONArray("paths"));
            case "scanApps": return AppScanner.scan(a, in.optBoolean("system"), in.optInt("unusedDays", 60), t -> progress(id, t));
            case "shortcuts": return Shortcuts.list(a);
            case "set": return Toggles.set(a, in.getString("key"), in.get("value"));
            case "applyMode": {
                JSONObject mode = in.optJSONObject("mode");
                if (mode == null) mode = Toggles.findMode(a, in.optString("id"));
                if (mode == null) return new JSONObject().put("error", "Mod bulunamadı");
                JSONObject r = Toggles.applyMode(a, mode);
                refreshTiles();
                return r;
            }
            case "grantSecure": {
                String[] r = ShizukuHelper.run("pm grant " + a.getPackageName() + " android.permission.WRITE_SECURE_SETTINGS 2>&1");
                JSONObject o = new JSONObject();
                o.put("ok", Toggles.secure(a));
                o.put("out", r == null ? "Shizuku hazır değil" : r[1]);
                return o;
            }
            case "addTile": return addTile(id, in.optInt("slot", 1));
            default: throw new IllegalArgumentException("Bilinmeyen metot: " + m);
        }
    }

    private JSONObject info() throws Exception {
        JSONObject o = new JSONObject();
        o.put("brand", Build.MANUFACTURER);
        o.put("model", Build.MODEL);
        o.put("android", Build.VERSION.RELEASE);
        o.put("sdk", Build.VERSION.SDK_INT);
        String hyper = prop("ro.mi.os.version.name"), miui = prop("ro.miui.ui.version.name");
        o.put("os", !hyper.isEmpty() ? "HyperOS " + hyper.replace("OS", "") : !miui.isEmpty() ? "MIUI " + miui.replace("V", "") : "");
        o.put("xiaomi", !hyper.isEmpty() || !miui.isEmpty() || "Xiaomi".equalsIgnoreCase(Build.MANUFACTURER));
        o.put("files", Cleaner.hasAccess());
        o.put("usage", AppScanner.usageAccess(a));
        o.put("write", Toggles.canWrite(a));
        o.put("dnd", Toggles.dndAccess(a));
        o.put("secure", Toggles.secure(a));
        o.put("devOn", Settings.Global.getInt(a.getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1);
        o.put("shizuku", ShizukuHelper.status(a));
        o.put("playProtect", resolves(playProtect()));
        o.put("canAddTile", Build.VERSION.SDK_INT >= 33);
        o.put("freeBytes", Cleaner.root().getUsableSpace());
        o.put("totalBytes", Cleaner.root().getTotalSpace());
        return o;
    }

    private static String prop(String k) {
        try {
            Class<?> c = Class.forName("android.os.SystemProperties");
            Object v = c.getMethod("get", String.class, String.class).invoke(null, k, "");
            return v == null ? "" : String.valueOf(v);
        } catch (Throwable t) { return ""; }
    }

    private boolean openPerm(String which) {
        Uri me = Uri.parse("package:" + a.getPackageName());
        switch (which) {
            case "files": return start(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, me))
                    || start(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
            case "usage": return start(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, me))
                    || start(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS));
            case "write": return start(new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, me));
            case "dnd": return start(new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS));
            case "shizukuApp": {
                Intent i = a.getPackageManager().getLaunchIntentForPackage(ShizukuHelper.PKG);
                return i != null && start(i);
            }
            case "shizukuStore":
                return start(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + ShizukuHelper.PKG)));
            case "shizukuDownload":
                return start(new Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/RikkaApps/Shizuku/releases/latest")));
            case "wirelessDebug":
                return start(new Intent("android.settings.WIRELESS_DEBUGGING_SETTINGS"))
                        || start(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));
            case "dev": return start(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));
            case "about": return start(new Intent(Settings.ACTION_DEVICE_INFO_SETTINGS));
            case "a11y": return start(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
            case "admins": return Shortcuts.open(a, "admins") || start(new Intent(Settings.ACTION_SECURITY_SETTINGS));
            case "notifAccess": return start(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
            default: return false;
        }
    }

    private Intent playProtect() {
        return new Intent().setComponent(new ComponentName("com.google.android.gms",
                "com.google.android.gms.security.settings.VerifyAppsSettingsActivity"));
    }

    private boolean panel(String which) {
        switch (which) {
            case "wifi": return start(new Intent(Settings.Panel.ACTION_WIFI)) || start(new Intent(Settings.ACTION_WIFI_SETTINGS));
            case "internet": return start(new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY)) || start(new Intent(Settings.ACTION_WIRELESS_SETTINGS));
            case "bt": return start(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS));
            case "volume": return start(new Intent(Settings.Panel.ACTION_VOLUME)) || start(new Intent(Settings.ACTION_SOUND_SETTINGS));
            case "display": return start(new Intent(Settings.ACTION_DISPLAY_SETTINGS));
            default: return false;
        }
    }

    private boolean resolves(Intent i) {
        List<ResolveInfo> r = a.getPackageManager().queryIntentActivities(i, 0);
        for (ResolveInfo ri : r) {
            ActivityInfo ai = ri.activityInfo;
            if (ai != null && ai.exported && ai.enabled) return true;
        }
        return false;
    }

    /** Ekranı açmayı dener; açamazsa false döner, uygulama çökmez. */
    private boolean start(Intent i) {
        try {
            if (!resolves(i)) return false;
            a.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void refreshTiles() {
        for (Class<?> c : new Class<?>[]{ModeTile1.class, ModeTile2.class, ModeTile3.class}) {
            try { android.service.quicksettings.TileService.requestListeningState(a, new ComponentName(a, c)); }
            catch (Exception ignored) { }
        }
    }

    private Object addTile(String id, int slot) throws Exception {
        if (Build.VERSION.SDK_INT < 33) return new JSONObject().put("result", "unsupported");
        Class<?> cls = slot == 2 ? ModeTile2.class : slot == 3 ? ModeTile3.class : ModeTile1.class;
        JSONObject m = Toggles.findMode(a, Toggles.tileMode(a, slot));
        String label = m == null ? "Mod " + slot : m.optString("name");
        final Object lock = new Object();
        final int[] res = {Integer.MIN_VALUE};
        a.runOnUiThread(() -> {
            try {
                StatusBarManager sbm = a.getSystemService(StatusBarManager.class);
                sbm.requestAddTileService(new ComponentName(a, cls), label, Icon.createWithResource(a, R.drawable.ic_tile),
                        a.getMainExecutor(), code -> { synchronized (lock) { res[0] = code; lock.notifyAll(); } });
            } catch (Exception e) {
                synchronized (lock) { res[0] = -999; lock.notifyAll(); }
            }
        });
        synchronized (lock) {
            long end = System.currentTimeMillis() + 120000;
            while (res[0] == Integer.MIN_VALUE && System.currentTimeMillis() < end) lock.wait(1000);
        }
        int c = res[0];
        String r = c == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED ? "added"
                : c == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED ? "already"
                : c == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_NOT_ADDED ? "declined" : "unsupported";
        return new JSONObject().put("result", r);
    }
}
