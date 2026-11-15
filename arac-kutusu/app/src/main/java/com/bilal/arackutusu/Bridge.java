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
                Scheduler.updateDynamic(a);
                return true;
            }
            case "resetModes": Toggles.saveModes(a, Toggles.defaultModes()); refreshTiles(); return Toggles.modes(a);
            case "device": return DeviceInfo.all(a);
            case "battery": return DeviceInfo.battery(a);
            case "phoneChecks": return AppScanner.phoneChecks(a);
            case "torch": return Toggles.torch(a, in.optBoolean("on"));
            case "schedules": return Scheduler.list(a);
            case "saveSchedules": Scheduler.save(a, in.getJSONArray("list")); return true;
            case "pinMode": return Scheduler.pin(a, in.optString("id"));
            case "askNotif":
                if (Build.VERSION.SDK_INT >= 33) a.runOnUiThread(() -> a.requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 5));
                return true;
            case "openUrl": {
                String u = in.optString("url");
                return u.startsWith("https://github.com/") && start(new Intent(Intent.ACTION_VIEW, Uri.parse(u)));
            }
            case "copy": {
                android.content.ClipboardManager cb = a.getSystemService(android.content.ClipboardManager.class);
                cb.setPrimaryClip(android.content.ClipData.newPlainText("Araç Kutusu", in.optString("text")));
                return true;
            }
            case "sensorStart": return a.hw.start(in.optString("kind"));
            case "sensorStop": a.hw.stop(); return true;
            case "soundMeter": return a.hw.soundMeter();
            case "tuner": return a.hw.tuner();
            case "micTest": return a.hw.micTest();
            case "vibrate": a.hw.vibrate(in.optJSONArray("p") == null ? new JSONArray().put(400) : in.optJSONArray("p")); return true;
            case "screen": return a.hw.screen();
            case "sensors": return Hardware.hasSensors(a);
            case "hasPerm": return a.checkSelfPermission(in.optString("perm")) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            case "askPerm": {
                String perm = in.optString("perm");
                if (!java.util.Arrays.asList("android.permission.CAMERA", "android.permission.RECORD_AUDIO",
                        "android.permission.READ_CONTACTS", "android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION",
                        "android.permission.POST_NOTIFICATIONS").contains(perm)) return false;
                a.runOnUiThread(() -> a.requestPermissions(new String[]{perm}, 9));
                return true;
            }
            case "saveText": return a.hw.saveText(in.optString("name"), in.optString("text"));
            case "addCaffeine": return addTileCls(CaffeineTile.class, "Kafein", R.drawable.ic_coffee);
            case "charge": {
                android.content.SharedPreferences p = a.getSharedPreferences(Toggles.PREFS, 0);
                return new JSONObject().put("on", ChargeService.enabled(a)).put("limit", p.getInt("chargeLimit", 80))
                        .put("low", p.getInt("chargeLow", 20)).put("hot", p.getInt("chargeHot", 45));
            }
            case "setCharge": {
                android.content.SharedPreferences.Editor e = a.getSharedPreferences(Toggles.PREFS, 0).edit();
                if (in.has("limit")) e.putInt("chargeLimit", in.getInt("limit"));
                if (in.has("low")) e.putInt("chargeLow", in.getInt("low"));
                if (in.has("hot")) e.putInt("chargeHot", in.getInt("hot"));
                e.apply();
                if (in.has("on")) ChargeService.setEnabled(a, in.getBoolean("on"));
                return true;
            }
            case "pinWidget": {
                android.appwidget.AppWidgetManager wm = android.appwidget.AppWidgetManager.getInstance(a);
                return wm.isRequestPinAppWidgetSupported() && wm.requestPinAppWidget(new ComponentName(a, StatusWidget.class), null, null);
            }
            case "setBars": {
                int col = android.graphics.Color.parseColor(in.optString("color", "#0E1116"));
                boolean light = in.optBoolean("light");
                a.runOnUiThread(() -> {
                    a.getWindow().setStatusBarColor(col);
                    a.getWindow().setNavigationBarColor(col);
                    a.webView.setBackgroundColor(col);
                    a.root.setBackgroundColor(col);
                    if (Build.VERSION.SDK_INT >= 30) {
                        int f = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                        a.getWindow().getInsetsController().setSystemBarsAppearance(light ? f : 0, f);
                    }
                });
                return true;
            }
            case "pickFile": a.runOnUiThread(a::pickFile); return true;
            case "fsList": return FileOps.list(in.optString("path"), in.optBoolean("hidden"));
            case "fsOpen": try { return FileOps.open(a, in.optString("path")); } catch (Exception e) { return false; }
            case "fsShare": try { return FileOps.share(a, in.optString("path")); } catch (Exception e) { return false; }
            case "fsRename": return FileOps.rename(a, in.optString("path"), in.optString("name").trim());
            case "fsMkdir": return FileOps.mkdir(in.optString("path"), in.optString("name").trim());
            case "wifi": return FileOps.wifi(a);
            case "battHist": return new JSONArray(a.getSharedPreferences(Toggles.PREFS, 0).getString("battHist", "[]"));
            case "recStart": {
                RecorderService.lastError = null;
                a.startForegroundService(new Intent(a, RecorderService.class).putExtra("name", in.optString("name")));
                return true;
            }
            case "recStop": a.startService(new Intent(a, RecorderService.class).setAction(RecorderService.STOP)); return true;
            case "recState": return RecorderService.state();
            case "recList": return RecorderService.list(a);
            case "recDelete": return RecorderService.delete(a, in.optLong("id"));
            case "recShare": return RecorderService.share(a, in.optLong("id"));
            case "recRename": return RecorderService.rename(a, in.optLong("id"), in.optString("name"));
            case "reminders": return Scheduler.reminders(a);
            case "saveReminders": Scheduler.saveReminders(a, in.getJSONArray("list")); return true;
            case "testReminder": Scheduler.remind(a, in.getJSONObject("r")); return true;
            case "openContact": return Extras.openContact(a, in.optLong("id"));
            case "openGeo": {
                String q = in.optDouble("lat") + "," + in.optDouble("lon");
                return start(new Intent(Intent.ACTION_VIEW, Uri.parse("geo:" + q + "?q=" + q + "(" + Uri.encode(in.optString("label", "Konum")) + ")")))
                        || start(new Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + q + "&mode=w")));
            }
            case "notifLog": {
                JSONObject o = new JSONObject().put("enabled", NotifLog.enabled(a)).put("paused", NotifLog.paused(a));
                return o.put("items", in.optBoolean("items") ? NotifLog.read(a) : new JSONArray());
            }
            case "screenBoost": { // sadece bu uygulama açıkken: ekranı en parlak yap ve kapanmasın
                boolean on = in.optBoolean("on");
                a.runOnUiThread(() -> {
                    android.view.WindowManager.LayoutParams lp = a.getWindow().getAttributes();
                    lp.screenBrightness = on ? 1f : android.view.WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                    a.getWindow().setAttributes(lp);
                    if (on) a.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else a.getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                });
                return true;
            }
            case "notifLogClear": NotifLog.write(a, new JSONArray()); return true;
            case "notifLogPause": a.getSharedPreferences(Toggles.PREFS, 0).edit().putBoolean("notifLogPaused", in.optBoolean("on")).apply(); return true;
            case "notifLogOpen":
                if (Build.VERSION.SDK_INT >= 30 && start(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                        .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, new ComponentName(a, NotifLog.class).flattenToString()))) return true;
                return start(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
            case "shareText": {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, in.optString("text"));
                return start(Intent.createChooser(i, in.optString("title", "Paylaş")));
            }
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
            case "permAudit": return AppScanner.permAudit(a, in.optBoolean("system"));
            case "appList": return AppScanner.appList(a, in.optBoolean("system"), t -> progress(id, t));
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
            case "backupApk": return a.hw.backupApk(in.optString("pkg"));
            case "screenTime": return Extras.screenTime(a);
            case "dataUsage": return Extras.dataUsage(a, in.optLong("start"));
            case "folderSizes": return FileOps.folderSizes(in.optString("path"));
            case "fsDelete": return FileOps.delete(a, in.getJSONArray("paths"));
            case "makePdf": return new JSONObject().put("path", a.hw.makePdf(in.getJSONArray("pages"), in.optString("name")));
            case "bench": return a.hw.storageBench(t -> progress(id, t));
            case "cpuBench": {
                int cores = Runtime.getRuntime().availableProcessors();
                long[] cnt = new long[cores];
                Thread[] th = new Thread[cores];
                final long end = System.nanoTime() + 2_000_000_000L;
                for (int i = 0; i < cores; i++) {
                    final int k = i;
                    th[i] = new Thread(() -> { long n = 0; double x = 1.0001; while (System.nanoTime() < end) { for (int j = 0; j < 20000; j++) x = x * 1.0000001 + Math.sqrt(x) * 1e-9; n++; } cnt[k] = n + (x > 1e300 ? 1 : 0); });
                    th[i].start();
                }
                long single = 0, total = 0;
                for (int i = 0; i < cores; i++) { th[i].join(); total += cnt[i]; single = Math.max(single, cnt[i]); }
                return new JSONObject().put("single", single).put("multi", total).put("cores", cores);
            }
            case "bigPhotos": return FileOps.bigPhotos(in.optLong("min", 3L << 20));
            case "compress": {
                JSONArray ps = in.getJSONArray("paths"), res = new JSONArray();
                long saved = 0;
                for (int i = 0; i < ps.length(); i++) {
                    progress(id, (i + 1) + " / " + ps.length() + " fotoğraf küçültülüyor…");
                    try {
                        JSONObject r = FileOps.compress(a, ps.getString(i), in.optInt("max", 2560), in.optInt("q", 85), in.optBoolean("replace"));
                        saved += r.optLong("before") - r.optLong("after");
                        res.put(r.put("src", ps.getString(i)));
                    } catch (Exception e) { res.put(new JSONObject().put("src", ps.getString(i)).put("error", e.getMessage())); }
                }
                return new JSONObject().put("results", res).put("saved", saved);
            }
            case "contacts": return Extras.contactsInfo(a);
            case "exportVcf": return new JSONObject().put("path", Extras.exportVcf(a, a.hw));
            case "location": return Extras.location(a, in.optBoolean("precise"));
            case "birthdays": return Extras.birthdays(a);
            case "saveFile": return new JSONObject().put("path", a.hw.saveBytes(in.optString("name"), in.optString("mime", "text/plain"),
                    in.optString("text").getBytes(java.nio.charset.StandardCharsets.UTF_8)));
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
        o.put("notif", a.getSystemService(android.app.NotificationManager.class).areNotificationsEnabled());
        o.put("exact", Scheduler.exactAllowed(a));
        try { o.put("version", a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName); } catch (Exception ignored) { }
        o.put("canPin", a.getSystemService(android.content.pm.ShortcutManager.class).isRequestPinShortcutSupported());
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
            case "autostart": return Shortcuts.open(a, "autostart");
            case "batteryApps": return Shortcuts.open(a, "battery_apps") || Shortcuts.open(a, "battery_opt");
            case "exactAlarm": return Build.VERSION.SDK_INT >= 31 && start(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, me));
            case "appNotif": return start(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, a.getPackageName()));
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

    private boolean addTileCls(Class<?> cls, String label, int icon) {
        if (Build.VERSION.SDK_INT < 33) return false;
        a.runOnUiThread(() -> {
            try {
                a.getSystemService(StatusBarManager.class).requestAddTileService(new ComponentName(a, cls), label,
                        Icon.createWithResource(a, icon), a.getMainExecutor(), c -> { });
            } catch (Exception ignored) { }
        });
        return true;
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
