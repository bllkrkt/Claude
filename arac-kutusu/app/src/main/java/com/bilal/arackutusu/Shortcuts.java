package com.bilal.arackutusu;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Menülerde gizli veya zor bulunan ayar ekranları. Her kısayolun birden fazla adayı vardır
 * (MIUI/HyperOS sürümüne göre adlar değişiyor); telefonda açılabilen ilk aday kullanılır,
 * hiçbiri açılamıyorsa kısayol gizlenir.
 */
final class Shortcuts {
    static final class Item {
        final String id, group, title, desc;
        final List<Intent> cands = new ArrayList<>();
        Item(String id, String group, String title, String desc) { this.id = id; this.group = group; this.title = title; this.desc = desc; }
        Item cmp(String pkg, String cls) { cands.add(new Intent().setComponent(new ComponentName(pkg, cls))); return this; }
        Item act(String action) { cands.add(new Intent(action)); return this; }
        Item actPkg(String action, String pkg) { cands.add(new Intent(action, Uri.parse("package:" + pkg))); return this; }
    }

    private Shortcuts() { }

    static final String X = "Xiaomi / HyperOS";
    static final String H = "Android'in gizli ekranları";
    static final String P = "İzin ve erişim ekranları";
    static final String S = "Bağlantı ve sistem";

    static List<Item> all(Context c) {
        String me = c.getPackageName();
        List<Item> l = new ArrayList<>();
        l.add(new Item("autostart", X, "Otomatik başlatma",
                "Hangi uygulamaların kendiliğinden açılabileceğini seç. Bildirimi geç gelen uygulamalar (WhatsApp vb.) için aç.")
                .cmp("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                .cmp("com.miui.securitycenter", "com.miui.appmanager.AppManagerMainActivity"));
        l.add(new Item("battery_apps", X, "Uygulama başına pil kısıtlaması",
                "Her uygulama için \"Kısıtlama yok / Akıllı / Arka planı kısıtla\" seç. Geç gelen bildirimlerin asıl çözümü.")
                .cmp("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsContainerManagementActivity")
                .cmp("com.miui.securitycenter", "com.miui.powercenter.legacypowerrank.PowerDetailActivity"));
        l.add(new Item("battery_opt", X, "Pil optimizasyonu (Android listesi)",
                "Android'in kendi \"pil optimizasyonunu yok say\" listesi. Xiaomi'nin kısıtlamasından ayrıdır.")
                .act(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        l.add(new Item("perm_mgr", X, "İzin yöneticisi (Xiaomi)",
                "Xiaomi'ye özel izinler: arka planda pencere açma, kilit ekranında gösterme, kısayol oluşturma.")
                .cmp("com.miui.securitycenter", "com.miui.permcenter.MainAcitivty")
                .cmp("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsTabActivity")
                .cmp("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity"));
        l.add(new Item("firewall", X, "Uygulama internet izinleri",
                "Bir uygulamanın mobil veri veya Wi-Fi kullanmasını tamamen engelle (Xiaomi güvenlik duvarı).")
                .cmp("com.miui.securitycenter", "com.miui.networkassistant.ui.activity.FirewallActivity")
                .cmp("com.miui.securitycenter", "com.miui.networkassistant.ui.NetworkAssistantActivity"));
        l.add(new Item("power", X, "Pil ve performans", "Xiaomi pil ekranı: pil tasarrufu, performans modu, pil kullanımı.")
                .cmp("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")
                .cmp("com.miui.powerkeeper", "com.miui.powerkeeper.ui.framework.PowerCenterActivity"));
        l.add(new Item("security", X, "Güvenlik uygulaması", "Xiaomi Güvenlik: temizleyici, virüs taraması, uygulama kilidi.")
                .cmp("com.miui.securitycenter", "com.miui.securityscan.MainActivity"));
        l.add(new Item("xspace", X, "İkinci alan / uygulama klonlama", "Aynı uygulamadan iki tane (ör. iki WhatsApp hesabı).")
                .cmp("com.miui.securitycore", "com.miui.xspace.ui.activity.XSpaceSettingActivity")
                .cmp("com.miui.securitycore", "com.miui.securityspace.ui.activity.SpaceSettingActivity"));
        l.add(new Item("cit", X, "Donanım testi (CIT)", "Ekran, dokunmatik, hoparlör, sensör testleri. Arayıcıdaki *#*#6484#*#* kodunun ekranı.")
                .cmp("com.miui.cit", "com.miui.cit.CitLauncherActivity"));
        l.add(new Item("xapps", X, "Uygulama yöneticisi (Xiaomi)", "Xiaomi'nin uygulama listesi: toplu kaldırma, önbellek temizleme, izinler.")
                .cmp("com.miui.securitycenter", "com.miui.appmanager.AppManagerMainActivity"));
        l.add(new Item("xcleaner", X, "Xiaomi Temizleyici", "Diğer uygulamaların önbelleğini temizleyebilen Xiaomi aracı (Android bunu bize izin vermiyor).")
                .cmp("com.miui.cleanmaster", "com.miui.optimizecenter.MainActivity")
                .cmp("com.miui.securitycenter", "com.miui.optimizecenter.MainActivity"));
        l.add(new Item("dev", H, "Geliştirici seçenekleri",
                "Animasyon hızı, USB hata ayıklama, arka plan sınırı. Kapalıysa: Ayarlar → Telefon hakkında → OS sürümüne 7 kez dokun.")
                .act(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)
                .cmp("com.android.settings", "com.android.settings.Settings$DevelopmentSettingsDashboardActivity"));
        l.add(new Item("radio", H, "Telefon bilgisi / şebeke testi",
                "Sinyal gücü, tercih edilen ağ türü. *#*#4636#*#* kodunun ekranı.")
                .cmp("com.android.phone", "com.android.phone.settings.RadioInfo")
                .cmp("com.android.settings", "com.android.settings.RadioInfo")
                .cmp("com.android.settings", "com.android.settings.Settings$TestingSettingsActivity"));
        l.add(new Item("usage", H, "Kullanım istatistikleri", "Hangi uygulamayı en son ne zaman, ne kadar kullandın.")
                .cmp("com.android.settings", "com.android.settings.UsageStatsActivity"));
        l.add(new Item("notif_hist", H, "Bildirim geçmişi", "Sildiğin bildirimleri tekrar gör (önce bu ekrandan açman gerekir).")
                .act("android.settings.NOTIFICATION_HISTORY")
                .cmp("com.android.settings", "com.android.settings.Settings$NotificationHistoryActivity")
                .cmp("com.android.settings", "com.android.settings.notification.history.NotificationHistoryActivity"));
        l.add(new Item("running", H, "Çalışan hizmetler", "Şu an arka planda çalışan uygulamalar ve kullandıkları bellek.")
                .cmp("com.android.settings", "com.android.settings.Settings$DevRunningServicesActivity")
                .cmp("com.android.settings", "com.android.settings.Settings$RunningServicesActivity"));
        l.add(new Item("defaults", H, "Varsayılan uygulamalar", "Tarayıcı, arama, SMS, ana ekran uygulamasını değiştir.")
                .act(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS));
        l.add(new Item("all_apps", H, "Tüm uygulamalar (sistem dahil)", "Android'in ham uygulama listesi.")
                .act(Settings.ACTION_MANAGE_ALL_APPLICATIONS_SETTINGS));
        l.add(new Item("privacy", H, "Gizlilik paneli", "Son 24 saatte kamera, mikrofon ve konumu hangi uygulama kullandı.")
                .act("android.intent.action.REVIEW_PERMISSION_USAGE")
                .act("android.settings.PRIVACY_SETTINGS"));
        l.add(new Item("battery_use", S, "Pil kullanımı", "Pili en çok hangi uygulama tüketiyor.")
                .act(Intent.ACTION_POWER_USAGE_SUMMARY));
        l.add(new Item("storage", S, "Depolama", "Telefonun kendi depolama ekranı.")
                .act(Settings.ACTION_INTERNAL_STORAGE_SETTINGS));
        l.add(new Item("data_usage", S, "Veri kullanımı", "Mobil veri kullanımı ve kotası.")
                .act(Settings.ACTION_DATA_USAGE_SETTINGS));
        l.add(new Item("hotspot", S, "Kişisel erişim noktası", "Telefonu modem olarak kullan (hotspot).")
                .cmp("com.android.settings", "com.android.settings.Settings$TetherSettingsActivity")
                .cmp("com.android.settings", "com.android.settings.TetherSettings"));
        l.add(new Item("vpn", S, "VPN", "VPN bağlantıları ve \"her zaman açık VPN\".")
                .act(Settings.ACTION_VPN_SETTINGS));
        l.add(new Item("location", S, "Konum", "Konum ve konum izni olan uygulamalar.")
                .act(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
        l.add(new Item("nfc", S, "NFC", "Temassız ödeme ve NFC.")
                .act(Settings.ACTION_NFC_SETTINGS));
        l.add(new Item("lock", S, "Ekran kilidi ve güvenlik", "PIN, parmak izi, yüz tanıma.")
                .act(Settings.ACTION_SECURITY_SETTINGS));
        l.add(new Item("lang", S, "Dil ve klavye", "Sistem dili, klavye ayarları.")
                .act(Settings.ACTION_LOCALE_SETTINGS));
        l.add(new Item("date", S, "Tarih ve saat", "Otomatik saat, saat dilimi.")
                .act(Settings.ACTION_DATE_SETTINGS));
        l.add(new Item("alarms", P, "Alarmlar ve hatırlatıcılar", "Tam zamanında çalışabilen uygulamalar (zamanlanmış modlar için gerekli).")
                .actPkg(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, me));
        l.add(new Item("usage_access", P, "Kullanım erişimi", "Hangi uygulamalar senin uygulama kullanımını görebiliyor.")
                .act(Settings.ACTION_USAGE_ACCESS_SETTINGS));
        l.add(new Item("notif_access", P, "Bildirim erişimi", "Bildirimlerini okuyabilen uygulamalar.")
                .act(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        l.add(new Item("a11y", P, "Erişilebilirlik", "Ekranı okuyup senin yerine dokunabilen uygulamalar.")
                .act(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        l.add(new Item("admins", P, "Cihaz yöneticileri", "Cihaz yöneticisi yetkisi olan uygulamalar.")
                .cmp("com.android.settings", "com.android.settings.Settings$DeviceAdminSettingsActivity")
                .cmp("com.android.settings", "com.android.settings.DeviceAdminSettings"));
        l.add(new Item("overlay", P, "Diğer uygulamaların üstünde gösterme", "Ekrana pencere çizebilen uygulamalar.")
                .act(Settings.ACTION_MANAGE_OVERLAY_PERMISSION));
        l.add(new Item("unknown_src", P, "Bilinmeyen uygulama yükleme", "APK kurabilen uygulamalar (tarayıcı, dosya yöneticisi…).")
                .act(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES));
        l.add(new Item("all_files", P, "Tüm dosyalara erişim", "Telefondaki bütün dosyaları görebilen uygulamalar.")
                .act(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
        l.add(new Item("dnd_access", P, "Rahatsız etmeyin erişimi", "Sessiz modu değiştirebilen uygulamalar.")
                .act(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS));
        l.add(new Item("write_settings", P, "Sistem ayarlarını değiştirme", "Parlaklık gibi ayarları değiştirebilen uygulamalar.")
                .act(Settings.ACTION_MANAGE_WRITE_SETTINGS));
        l.add(new Item("my_app", P, "Araç Kutusu'nun izinleri", "Bu uygulamanın kendi ayar sayfası.")
                .actPkg(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, me));
        return l;
    }

    /** Telefonda açılabilen aday var mı? Dışa açık (exported) ve izin istemeyen bir ekran olmalı. */
    static Intent resolve(Context c, Item it) {
        List<Intent> l = resolveAll(c, it);
        return l.isEmpty() ? null : l.get(0);
    }

    static List<Intent> resolveAll(Context c, Item it) {
        List<Intent> res = new ArrayList<>();
        PackageManager pm = c.getPackageManager();
        for (Intent i : it.cands) {
            List<ResolveInfo> r = pm.queryIntentActivities(i, PackageManager.MATCH_DEFAULT_ONLY);
            if (r.isEmpty() && i.getComponent() != null) r = pm.queryIntentActivities(i, 0);
            for (ResolveInfo ri : r) {
                ActivityInfo a = ri.activityInfo;
                if (a == null || !a.exported || !a.enabled) continue;
                if (a.permission != null && c.checkSelfPermission(a.permission) != PackageManager.PERMISSION_GRANTED) continue;
                Intent out = new Intent(i);
                if (out.getComponent() == null) out.setComponent(new ComponentName(a.packageName, a.name));
                res.add(out.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                break;
            }
        }
        return res;
    }

    static JSONObject list(Context c) throws Exception {
        JSONArray ok = new JSONArray(), hidden = new JSONArray();
        for (Item it : all(c)) {
            JSONObject o = new JSONObject();
            o.put("id", it.id); o.put("group", it.group); o.put("title", it.title); o.put("desc", it.desc);
            if (resolve(c, it) != null) ok.put(o); else hidden.put(o);
        }
        JSONObject res = new JSONObject();
        res.put("items", ok);
        res.put("hidden", hidden);
        res.put("devEnabled", Settings.Global.getInt(c.getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1);
        return res;
    }

    /** Açmayı dener; çökmez. Başarısızsa false. */
    static boolean open(Context c, String id) {
        for (Item it : all(c)) {
            if (!it.id.equals(id)) continue;
            // Bir aday açılmazsa sıradakini dene (bazı HyperOS sürümleri ekranı engelliyor)
            for (Intent i : resolveAll(c, it)) {
                try { c.startActivity(i); return true; } catch (Exception ignored) { }
            }
            return false;
        }
        return false;
    }
}
