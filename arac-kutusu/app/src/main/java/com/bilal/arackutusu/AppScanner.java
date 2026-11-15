package com.bilal.arackutusu;

import android.app.AppOpsManager;
import android.app.admin.DevicePolicyManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * İzin ve kaynak tabanlı risk listesi. Virüs imzası taramaz — bu bir antivirüs değildir.
 */
final class AppScanner {
    private static final Set<String> TRUSTED = new HashSet<>(Arrays.asList(
            "com.android.vending", "com.xiaomi.market", "com.xiaomi.mipicks", "com.xiaomi.discover",
            "com.google.android.feedback", "com.miui.global.packageinstaller.market"));
    private static final Set<String> FILE_INSTALLERS = new HashSet<>(Arrays.asList(
            "com.google.android.packageinstaller", "com.android.packageinstaller", "com.miui.packageinstaller"));

    private AppScanner() { }

    static boolean usageAccess(Context c) {
        AppOpsManager ao = c.getSystemService(AppOpsManager.class);
        int m = ao.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.getPackageName());
        return m == AppOpsManager.MODE_ALLOWED;
    }

    static JSONObject scan(Context c, boolean includeSystem, int unusedDays, Cleaner.Progress pr) throws Exception {
        PackageManager pm = c.getPackageManager();
        AppOpsManager ao = c.getSystemService(AppOpsManager.class);
        long now = System.currentTimeMillis();
        long day = 86400000L;

        // Etkin erişilebilirlik hizmetleri ve bildirim dinleyicileri
        Set<String> a11y = pkgsFromSetting(c, Settings.Secure.getString(c.getContentResolver(), "enabled_accessibility_services"));
        Set<String> notif = pkgsFromSetting(c, Settings.Secure.getString(c.getContentResolver(), "enabled_notification_listeners"));
        Set<String> admins = new HashSet<>();
        DevicePolicyManager dpm = c.getSystemService(DevicePolicyManager.class);
        List<ComponentName> act = dpm == null ? null : dpm.getActiveAdmins();
        if (act != null) for (ComponentName cn : act) admins.add(cn.getPackageName());

        boolean usage = usageAccess(c);
        Map<String, Long> lastUsed = new HashMap<>();
        if (usage) {
            UsageStatsManager um = c.getSystemService(UsageStatsManager.class);
            Map<String, UsageStats> m = um.queryAndAggregateUsageStats(now - 730 * day, now);
            for (Map.Entry<String, UsageStats> e : m.entrySet()) {
                long t = e.getValue().getLastTimeUsed();
                if (Build.VERSION.SDK_INT >= 29) t = Math.max(t, e.getValue().getLastTimeVisible());
                if (t > 0) lastUsed.put(e.getKey(), t);
            }
        }
        Set<String> launchable = new HashSet<>();
        for (ResolveInfo ri : pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0))
            launchable.add(ri.activityInfo.packageName);

        List<PackageInfo> pkgs = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS);
        JSONArray out = new JSONArray();
        int scanned = 0;
        int[] counts = new int[8];
        for (PackageInfo p : pkgs) {
            if (p.packageName.equals(c.getPackageName())) continue;
            ApplicationInfo ai = p.applicationInfo;
            if (ai == null) continue;
            boolean system = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            if (system && !includeSystem) continue;
            scanned++;
            if (scanned % 25 == 0) pr.on(scanned + " uygulama incelendi…");

            Set<String> granted = new HashSet<>(), requested = new HashSet<>();
            if (p.requestedPermissions != null) {
                for (int i = 0; i < p.requestedPermissions.length; i++) {
                    requested.add(p.requestedPermissions[i]);
                    if (p.requestedPermissionsFlags != null && (p.requestedPermissionsFlags[i] & PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0)
                        granted.add(p.requestedPermissions[i]);
                }
            }

            JSONArray risks = new JSONArray();
            int score = 0;
            String pk = p.packageName;

            if (granted.contains("android.permission.READ_SMS") || granted.contains("android.permission.RECEIVE_SMS")
                    || granted.contains("android.permission.SEND_SMS")) {
                risks.put(risk("sms", "SMS izni", 3, "SMS'lerini okuyabilir veya gönderebilir. Banka ve giriş onay kodlarını görebilir, "
                        + "ücretli numaralara mesaj atabilir. Mesajlaşma uygulaması değilse gerek yok."));
                score += 3; counts[0]++;
            }
            if (a11y.contains(pk)) {
                risks.put(risk("a11y", "Erişilebilirlik açık", 3, "Ekranda gördüğün her şeyi (şifreler dahil) okuyabilir ve senin yerine dokunabilir. "
                        + "Kötü amaçlı uygulamaların en çok istediği izindir. Tanımıyorsan kapat."));
                score += 3; counts[1]++;
            }
            if (admins.contains(pk)) {
                risks.put(risk("admin", "Cihaz yöneticisi", 3, "Ekranı kilitleyebilir, şifre kuralı koyabilir, bazıları telefonu sıfırlayabilir. "
                        + "Kaldırılmasını da zorlaştırır: önce \"Yönetici yetkisini kapat\", sonra kaldır."));
                score += 3; counts[2]++;
            }
            if (requested.contains("android.permission.SYSTEM_ALERT_WINDOW")) {
                Boolean on = op(ao, AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW, ai.uid, pk);
                if (on == null || on) {
                    risks.put(risk("overlay", on == null ? "Üstte gösterme (istiyor)" : "Diğer uygulamaların üstünde gösterme", 2,
                            "Başka uygulamaların üstüne pencere açabilir. Kötüye kullanılırsa bankanın üstüne sahte giriş ekranı çizebilir."
                                    + (on == null ? " (İznin verilip verilmediği bu telefonda okunamadı.)" : "")));
                    score += 2; counts[3]++;
                }
            }
            if (notif.contains(pk)) {
                risks.put(risk("notif", "Bildirim erişimi", 2, "Gelen tüm bildirimlerini okuyabilir: mesaj içerikleri, tek kullanımlık kodlar."));
                score += 2;
            }
            if (granted.contains("android.permission.ACCESS_BACKGROUND_LOCATION")) {
                risks.put(risk("loc", "Arka planda konum", 1, "Uygulama kapalıyken bile konumunu alabilir."));
                score += 1;
            }

            if (!system && requested.contains("android.permission.REQUEST_INSTALL_PACKAGES")) {
                Boolean on = op(ao, "android:request_install_packages", ai.uid, pk);
                if (Boolean.TRUE.equals(on)) {
                    risks.put(risk("install", "APK yükleyebilir", 2, "Başka uygulama kurma ekranı açabilir. Tarayıcı veya dosya yöneticisi değilse "
                            + "bu izni kapat: kötü amaçlı uygulamalar kendine \"güncelleme\" diye zararlı APK indirir."));
                    score += 2; counts[6]++;
                }
            }

            String installer = null;
            try {
                if (Build.VERSION.SDK_INT >= 30) {
                    InstallSourceInfo is = pm.getInstallSourceInfo(pk);
                    installer = is.getInstallingPackageName();
                } else installer = pm.getInstallerPackageName(pk);
            } catch (Exception ignored) { }
            String installerLabel = installerLabel(pm, installer);
            if (!system && (installer == null || !TRUSTED.contains(installer))) {
                String why = installer != null && FILE_INSTALLERS.contains(installer)
                        ? "Mağazadan değil, bir APK dosyasından kuruldu. Kaynağını biliyorsan sorun değil; bilmiyorsan dikkat."
                        : installer == null
                        ? "Nereden kurulduğu kayıtlı değil (bilgisayardan/ADB ile veya eski bir yedekten kurulmuş olabilir)."
                        : "Resmi mağaza dışından kuruldu: " + installerLabel + ".";
                risks.put(risk("unknown", "Bilinmeyen kaynak", 2, why));
                score += 2; counts[4]++;
            }

            int installedDays = (int) ((now - p.firstInstallTime) / day);
            if (!system && installedDays < 7 && risks.length() > 0) {
                risks.put(risk("new", "Yeni yüklendi", 1, installedDays + " gün önce kuruldu. Bilerek kurduğundan emin ol."));
                score += 1;
            }
            Integer unused = null;
            if (usage && launchable.contains(pk) && installedDays >= unusedDays) {
                Long t = lastUsed.get(pk);
                int d = t == null ? -1 : (int) ((now - t) / day);
                if (t == null || d >= unusedDays) {
                    unused = d;
                    risks.put(risk("unused", t == null ? "Kayıtlarda hiç açılmamış" : d + " gündür açılmadı", 1,
                            "Kullanmadığın uygulama boşuna yer kaplar ve izinlerini arka planda kullanmaya devam edebilir. Gerekmiyorsa kaldır."));
                    score += 1; counts[5]++;
                }
            }

            if (risks.length() == 0) continue;
            JSONObject o = new JSONObject();
            o.put("pkg", pk);
            o.put("label", String.valueOf(ai.loadLabel(pm)));
            o.put("system", system);
            o.put("installer", installerLabel);
            o.put("installedDays", installedDays);
            o.put("unusedDays", unused == null ? JSONObject.NULL : unused);
            o.put("version", p.versionName);
            o.put("risks", risks);
            o.put("score", score);
            out.put(o);
        }
        // Puanı yüksek olan en üstte
        JSONObject[] arr = new JSONObject[out.length()];
        for (int i = 0; i < arr.length; i++) arr[i] = out.getJSONObject(i);
        Arrays.sort(arr, (a, b) -> b.optInt("score") - a.optInt("score"));
        JSONArray sorted = new JSONArray();
        for (JSONObject o : arr) sorted.put(o);

        JSONObject res = new JSONObject();
        res.put("apps", sorted);
        res.put("scanned", scanned);
        res.put("usage", usage);
        return res;
    }

    private static JSONObject risk(String k, String title, int level, String why) throws Exception {
        JSONObject o = new JSONObject();
        o.put("k", k); o.put("t", title); o.put("lv", level); o.put("why", why);
        return o;
    }

    /** Başka bir uygulamanın özel izni açık mı? Okunamazsa null (dürüstçe "bilinmiyor" gösterilir). */
    private static Boolean op(AppOpsManager ao, String op, int uid, String pkg) {
        try {
            int m = ao.unsafeCheckOpNoThrow(op, uid, pkg);
            if (m == AppOpsManager.MODE_ALLOWED) return true;
            return false; // reddedilmiş veya hiç verilmemiş (varsayılan)
        } catch (Exception e) { return null; }
    }

    private static Set<String> pkgsFromSetting(Context c, String s) {
        Set<String> out = new HashSet<>();
        if (s == null) return out;
        for (String part : s.split(":")) {
            ComponentName cn = ComponentName.unflattenFromString(part);
            if (cn != null) out.add(cn.getPackageName());
        }
        return out;
    }

    private static String installerLabel(PackageManager pm, String installer) {
        if (installer == null) return "Bilinmiyor";
        switch (installer) {
            case "com.android.vending": return "Google Play";
            case "com.xiaomi.market": case "com.xiaomi.mipicks": case "com.xiaomi.discover": return "Xiaomi GetApps";
            case "com.google.android.packageinstaller": case "com.android.packageinstaller": case "com.miui.packageinstaller":
                return "APK dosyası";
        }
        try { return String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(installer, 0))); }
        catch (Exception e) { return installer; }
    }

    // ---------------- Telefon güvenlik kontrol listesi ----------------
    static JSONObject phoneChecks(Context c) throws Exception {
        JSONArray a = new JSONArray();
        android.app.KeyguardManager km = c.getSystemService(android.app.KeyguardManager.class);
        boolean lock = km != null && km.isDeviceSecure();
        a.put(check("lock", lock, "Ekran kilidi", lock ? "PIN, desen veya şifre var." : "Telefonun kilitsiz! Kaybolursa her şeye erişilir.", 3));
        int months = -1;
        try {
            java.time.LocalDate pd = java.time.LocalDate.parse(Build.VERSION.SECURITY_PATCH);
            months = (int) java.time.temporal.ChronoUnit.MONTHS.between(pd, java.time.LocalDate.now());
        } catch (Exception ignored) { }
        boolean patch = months >= 0 && months <= 6;
        a.put(check("patch", patch, "Güvenlik yaması", months < 0 ? "Okunamadı." : "Tarih: " + Build.VERSION.SECURITY_PATCH + " (" + months + " ay önce)"
                + (patch ? "" : ". Ayarlar → Telefon hakkında → güncellemeleri kontrol et."), 2));
        boolean adb = Settings.Global.getInt(c.getContentResolver(), Settings.Global.ADB_ENABLED, 0) == 1;
        a.put(check("adb", !adb, "USB hata ayıklama", adb ? "Açık. Shizuku kullanmıyorsan kapat: bilgisayara takılınca risk oluşturur." : "Kapalı.", 1));
        boolean dev = Settings.Global.getInt(c.getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1;
        a.put(check("dev", !dev, "Geliştirici seçenekleri", dev ? "Açık. Kullanmıyorsan kapatabilirsin (zararı yok ama gereksiz)." : "Kapalı.", 0));
        boolean enc = false;
        try {
            android.app.admin.DevicePolicyManager dpm = c.getSystemService(android.app.admin.DevicePolicyManager.class);
            int st = dpm.getStorageEncryptionStatus();
            enc = st == android.app.admin.DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE
                    || st == android.app.admin.DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER
                    || st == android.app.admin.DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY;
        } catch (Exception ignored) { }
        a.put(check("enc", enc, "Depolama şifrelemesi", enc ? "Açık." : "Kapalı veya okunamadı.", 2));
        Set<String> a11y = pkgsFromSetting(c, Settings.Secure.getString(c.getContentResolver(), "enabled_accessibility_services"));
        a11y.remove(c.getPackageName());
        a.put(check("a11y", a11y.isEmpty(), "Erişilebilirlik hizmetleri", a11y.isEmpty() ? "Hiçbiri açık değil." : a11y.size() + " uygulamada açık. Aşağıdaki taramada gör.", 2));
        int total = 0, lost = 0;
        for (int i = 0; i < a.length(); i++) {
            JSONObject x = a.getJSONObject(i);
            total += x.getInt("w");
            if (!x.getBoolean("ok")) lost += x.getInt("w");
        }
        JSONObject o = new JSONObject();
        o.put("checks", a);
        o.put("score", Math.round(100f * (total - lost) / Math.max(1, total)));
        return o;
    }

    private static JSONObject check(String k, boolean ok, String t, String d, int w) throws Exception {
        return new JSONObject().put("k", k).put("ok", ok).put("t", t).put("d", d).put("w", w);
    }

    // ---------------- İzin denetimi: hangi izin hangi uygulamalarda açık ----------------
    static final String[][] GROUPS = {
            {"camera", "Kamera", "android.permission.CAMERA"},
            {"mic", "Mikrofon", "android.permission.RECORD_AUDIO"},
            {"loc", "Konum", "android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"},
            {"bgloc", "Arka planda konum", "android.permission.ACCESS_BACKGROUND_LOCATION"},
            {"contacts", "Kişiler", "android.permission.READ_CONTACTS"},
            {"sms", "SMS", "android.permission.READ_SMS", "android.permission.SEND_SMS", "android.permission.RECEIVE_SMS"},
            {"calls", "Arama kayıtları", "android.permission.READ_CALL_LOG"},
            {"phone", "Telefon", "android.permission.CALL_PHONE", "android.permission.READ_PHONE_STATE"},
            {"files", "Fotoğraf ve dosyalar", "android.permission.READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_VIDEO", "android.permission.READ_EXTERNAL_STORAGE"},
            {"calendar", "Takvim", "android.permission.READ_CALENDAR"},
            {"body", "Vücut sensörleri", "android.permission.BODY_SENSORS"},
            {"nearby", "Yakındaki cihazlar", "android.permission.BLUETOOTH_SCAN", "android.permission.NEARBY_WIFI_DEVICES"},
    };

    static JSONObject permAudit(Context c, boolean includeSystem) throws Exception {
        PackageManager pm = c.getPackageManager();
        Map<String, JSONArray> by = new HashMap<>();
        for (String[] g : GROUPS) by.put(g[0], new JSONArray());
        for (PackageInfo p : pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)) {
            ApplicationInfo ai = p.applicationInfo;
            if (ai == null || p.requestedPermissions == null || p.packageName.equals(c.getPackageName())) continue;
            boolean system = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            if (system && !includeSystem) continue;
            Set<String> granted = new HashSet<>();
            for (int i = 0; i < p.requestedPermissions.length; i++)
                if (p.requestedPermissionsFlags != null && (p.requestedPermissionsFlags[i] & PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0)
                    granted.add(p.requestedPermissions[i]);
            String label = null;
            for (String[] g : GROUPS) {
                for (int i = 2; i < g.length; i++) {
                    if (granted.contains(g[i])) {
                        if (label == null) label = String.valueOf(ai.loadLabel(pm));
                        by.get(g[0]).put(new JSONObject().put("pkg", p.packageName).put("label", label).put("system", system));
                        break;
                    }
                }
            }
        }
        JSONArray out = new JSONArray();
        for (String[] g : GROUPS) {
            JSONArray apps = by.get(g[0]);
            JSONObject[] arr = new JSONObject[apps.length()];
            for (int i = 0; i < arr.length; i++) arr[i] = apps.getJSONObject(i);
            Arrays.sort(arr, (x, y) -> x.optString("label").compareToIgnoreCase(y.optString("label")));
            JSONArray sorted = new JSONArray();
            for (JSONObject x : arr) sorted.put(x);
            out.put(new JSONObject().put("k", g[0]).put("t", g[1]).put("apps", sorted));
        }
        return new JSONObject().put("groups", out);
    }

    // ---------------- Uygulama yöneticisi: boyut, son kullanım, kurulum ----------------
    static JSONObject appList(Context c, boolean includeSystem, Cleaner.Progress pr) throws Exception {
        PackageManager pm = c.getPackageManager();
        boolean usage = usageAccess(c);
        long now = System.currentTimeMillis(), day = 86400000L;
        Map<String, Long> lastUsed = new HashMap<>();
        if (usage) {
            UsageStatsManager um = c.getSystemService(UsageStatsManager.class);
            for (Map.Entry<String, UsageStats> e : um.queryAndAggregateUsageStats(now - 730 * day, now).entrySet()) {
                long t = Math.max(e.getValue().getLastTimeUsed(), Build.VERSION.SDK_INT >= 29 ? e.getValue().getLastTimeVisible() : 0);
                if (t > 0) lastUsed.put(e.getKey(), t);
            }
        }
        android.app.usage.StorageStatsManager ssm = c.getSystemService(android.app.usage.StorageStatsManager.class);
        Set<String> launchable = new HashSet<>();
        for (ResolveInfo ri : pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0))
            launchable.add(ri.activityInfo.packageName);
        JSONArray arr = new JSONArray();
        long totalApp = 0, totalCache = 0;
        int n = 0;
        for (PackageInfo p : pm.getInstalledPackages(0)) {
            ApplicationInfo ai = p.applicationInfo;
            if (ai == null || p.packageName.equals(c.getPackageName())) continue;
            boolean system = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            if (system && !includeSystem) continue;
            if (system && !launchable.contains(p.packageName)) continue;
            if (++n % 20 == 0) pr.on(n + " uygulama okundu…");
            JSONObject o = new JSONObject();
            o.put("pkg", p.packageName);
            o.put("label", String.valueOf(ai.loadLabel(pm)));
            o.put("system", system);
            o.put("installed", p.firstInstallTime);
            o.put("updated", p.lastUpdateTime);
            o.put("version", p.versionName);
            o.put("enabled", ai.enabled);
            Long t = lastUsed.get(p.packageName);
            o.put("lastUsed", t == null ? JSONObject.NULL : t);
            if (usage && ssm != null) {
                try {
                    android.app.usage.StorageStats st = ssm.queryStatsForPackage(ai.storageUuid, p.packageName, android.os.Process.myUserHandle());
                    o.put("app", st.getAppBytes());
                    o.put("data", st.getDataBytes());
                    o.put("cache", st.getCacheBytes());
                    totalApp += st.getAppBytes() + st.getDataBytes();
                    totalCache += st.getCacheBytes();
                } catch (Exception ignored) { }
            } else {
                try { o.put("app", new java.io.File(ai.sourceDir).length()); } catch (Exception ignored) { }
            }
            arr.put(o);
        }
        return new JSONObject().put("apps", arr).put("usage", usage).put("total", totalApp).put("cache", totalCache);
    }
}
