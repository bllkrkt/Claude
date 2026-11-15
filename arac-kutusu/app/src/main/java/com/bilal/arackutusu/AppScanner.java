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
}
