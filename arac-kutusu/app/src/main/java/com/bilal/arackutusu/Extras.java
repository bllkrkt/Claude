package com.bilal.arackutusu;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.provider.ContactsContract;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Ekran süresi, rehber yedeği/kopya kişiler, konum. */
final class Extras {
    private Extras() { }

    // ---------------- Ekran süresi ----------------
    static JSONObject screenTime(Context c) throws Exception {
        if (!AppScanner.usageAccess(c)) return new JSONObject().put("error", "nousage");
        UsageStatsManager um = c.getSystemService(UsageStatsManager.class);
        PackageManager pm = c.getPackageManager();
        Set<String> launch = new HashSet<>();
        for (ResolveInfo ri : pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0))
            launch.add(ri.activityInfo.packageName);
        // Ana ekran uygulaması sayılmasın
        ResolveInfo home = pm.resolveActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0);
        String homePkg = home != null && home.activityInfo != null ? home.activityInfo.packageName : "";

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        long todayStart = cal.getTimeInMillis();
        long start = todayStart - 6 * 86400000L, now = System.currentTimeMillis();

        long[] dayTotal = new long[7];
        int[] unlocks = new int[7];
        Map<String, Long> todayApps = new HashMap<>();
        Map<String, Long> weekApps = new HashMap<>();
        Map<String, Long> openSince = new HashMap<>();
        UsageEvents ev = um.queryEvents(start, now);
        UsageEvents.Event e = new UsageEvents.Event();
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e);
            String p = e.getPackageName();
            int t = e.getEventType();
            long ts = e.getTimeStamp();
            if (t == UsageEvents.Event.KEYGUARD_HIDDEN) {
                int d = (int) ((ts - start) / 86400000L);
                if (d >= 0 && d < 7) unlocks[d]++;
                continue;
            }
            if (!launch.contains(p) || p.equals(homePkg) || p.equals(c.getPackageName())) continue;
            if (t == UsageEvents.Event.ACTIVITY_RESUMED) {
                if (!openSince.containsKey(p)) openSince.put(p, ts);
            } else if (t == UsageEvents.Event.ACTIVITY_PAUSED || t == UsageEvents.Event.ACTIVITY_STOPPED) {
                Long s = openSince.remove(p);
                if (s != null) add(s, ts, p, start, todayStart, dayTotal, todayApps, weekApps);
            } else if (t == UsageEvents.Event.SCREEN_NON_INTERACTIVE) {
                for (Map.Entry<String, Long> x : openSince.entrySet()) add(x.getValue(), ts, x.getKey(), start, todayStart, dayTotal, todayApps, weekApps);
                openSince.clear();
            }
        }
        for (Map.Entry<String, Long> x : openSince.entrySet()) add(x.getValue(), now, x.getKey(), start, todayStart, dayTotal, todayApps, weekApps);

        JSONArray days = new JSONArray();
        for (int i = 0; i < 7; i++) days.put(new JSONObject().put("start", start + i * 86400000L).put("ms", dayTotal[i]).put("unlocks", unlocks[i]));
        JSONObject o = new JSONObject();
        o.put("days", days);
        o.put("today", top(pm, todayApps));
        o.put("week", top(pm, weekApps));
        return o;
    }

    private static void add(long s, long eTs, String p, long start, long todayStart, long[] dayTotal, Map<String, Long> today, Map<String, Long> week) {
        if (eTs <= s || eTs - s > 6 * 3600000L) return; // 6 saatten uzun tek oturum: büyük ihtimalle kayıp olay, sayma
        long ms = eTs - s;
        int d = (int) ((s - start) / 86400000L);
        if (d >= 0 && d < 7) dayTotal[d] += ms;
        week.put(p, (week.containsKey(p) ? week.get(p) : 0) + ms);
        if (s >= todayStart) today.put(p, (today.containsKey(p) ? today.get(p) : 0) + ms);
    }

    private static JSONArray top(PackageManager pm, Map<String, Long> m) throws Exception {
        List<Map.Entry<String, Long>> l = new ArrayList<>(m.entrySet());
        l.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));
        JSONArray a = new JSONArray();
        for (int i = 0; i < Math.min(25, l.size()); i++) {
            String p = l.get(i).getKey();
            String label = p;
            try { label = String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(p, 0))); } catch (Exception ignored) { }
            a.put(new JSONObject().put("pkg", p).put("label", label).put("ms", l.get(i).getValue()));
        }
        return a;
    }

    // ---------------- Rehber ----------------
    static JSONObject contactsInfo(Context c) throws Exception {
        ContentResolver cr = c.getContentResolver();
        int total = 0, noNumber = 0;
        try (Cursor cu = cr.query(ContactsContract.Contacts.CONTENT_URI,
                new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.HAS_PHONE_NUMBER}, null, null, null)) {
            if (cu != null) while (cu.moveToNext()) { total++; if (cu.getInt(1) == 0) noNumber++; }
        }
        // Aynı numaraya kayıtlı birden fazla kişi
        Map<String, Set<String>> byNum = new TreeMap<>();
        try (Cursor cu = cr.query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        ContactsContract.CommonDataKinds.Phone.CONTACT_ID}, null, null, null)) {
            if (cu != null) while (cu.moveToNext()) {
                String n = cu.getString(0) == null ? "" : cu.getString(0).replaceAll("[^0-9]", "");
                if (n.length() < 7) continue;
                String key = n.length() > 10 ? n.substring(n.length() - 10) : n;
                Set<String> s = byNum.get(key);
                if (s == null) byNum.put(key, s = new HashSet<>());
                s.add(cu.getString(2) + "\u0001" + (cu.getString(1) == null ? "(adsız)" : cu.getString(1)));
            }
        }
        JSONArray dup = new JSONArray();
        for (Map.Entry<String, Set<String>> x : byNum.entrySet()) {
            if (x.getValue().size() < 2) continue;
            JSONArray names = new JSONArray();
            for (String s : x.getValue()) names.put(s.substring(s.indexOf('\u0001') + 1));
            dup.put(new JSONObject().put("num", x.getKey()).put("names", names));
        }
        return new JSONObject().put("total", total).put("noNumber", noNumber).put("dupes", dup);
    }

    static String exportVcf(Context c, Hardware hw) throws Exception {
        ContentResolver cr = c.getContentResolver();
        StringBuilder keys = new StringBuilder();
        int n = 0;
        try (Cursor cu = cr.query(ContactsContract.Contacts.CONTENT_URI, new String[]{ContactsContract.Contacts.LOOKUP_KEY}, null, null, null)) {
            if (cu != null) while (cu.moveToNext()) {
                if (keys.length() > 0) keys.append(':');
                keys.append(cu.getString(0));
                n++;
            }
        }
        if (n == 0) throw new Exception("Rehberde kişi yok");
        Uri u = Uri.withAppendedPath(ContactsContract.Contacts.CONTENT_MULTI_VCARD_URI, Uri.encode(keys.toString()));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (InputStream in = cr.openAssetFileDescriptor(u, "r").createInputStream()) {
            byte[] b = new byte[1 << 16];
            int r;
            while ((r = in.read(b)) > 0) out.write(b, 0, r);
        }
        String name = "rehber-" + new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date()) + ".vcf";
        return hw.saveBytes(name, "text/x-vcard", out.toByteArray()) + " (" + n + " kişi)";
    }

    // ---------------- Doğum günleri (rehberden) ----------------
    static JSONArray birthdays(Context c) throws Exception {
        JSONArray a = new JSONArray();
        String[] cols = {ContactsContract.CommonDataKinds.Event.DISPLAY_NAME, ContactsContract.CommonDataKinds.Event.START_DATE, ContactsContract.CommonDataKinds.Event.CONTACT_ID};
        try (Cursor cu = c.getContentResolver().query(ContactsContract.Data.CONTENT_URI, cols,
                ContactsContract.Data.MIMETYPE + "=? AND " + ContactsContract.CommonDataKinds.Event.TYPE + "=?",
                new String[]{ContactsContract.CommonDataKinds.Event.CONTENT_ITEM_TYPE, String.valueOf(ContactsContract.CommonDataKinds.Event.TYPE_BIRTHDAY)}, null)) {
            Set<String> seen = new HashSet<>();
            if (cu != null) while (cu.moveToNext()) {
                String key = cu.getString(2) + cu.getString(1);
                if (!seen.add(key)) continue;
                a.put(new JSONObject().put("name", cu.getString(0) == null ? "(adsız)" : cu.getString(0)).put("date", cu.getString(1)).put("cid", cu.getLong(2)));
            }
        }
        return a;
    }

    static boolean openContact(Context c, long id) {
        try {
            c.startActivity(new Intent(Intent.ACTION_VIEW, Uri.withAppendedPath(ContactsContract.Contacts.CONTENT_URI, String.valueOf(id)))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (Exception e) { return false; }
    }

    // ---------------- Konum (namaz vakitleri / kıble / park yeri) ----------------
    static JSONObject location(Context c) throws Exception { return location(c, false); }

    static JSONObject location(Context c, boolean precise) throws Exception {
        LocationManager lm = c.getSystemService(LocationManager.class);
        if (lm == null) return new JSONObject().put("error", "Konum servisi yok");
        if (Build.VERSION.SDK_INT >= 28 && !lm.isLocationEnabled()) return new JSONObject().put("error", "off");
        Location best = null;
        for (String p : lm.getProviders(true)) {
            try {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            } catch (SecurityException ignored) { }
        }
        if ((precise || best == null || System.currentTimeMillis() - best.getTime() > 6 * 3600000L) && Build.VERSION.SDK_INT >= 30) {
            String prov = precise && lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER
                    : lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ? LocationManager.NETWORK_PROVIDER : LocationManager.GPS_PROVIDER;
            final Location[] got = {null};
            CountDownLatch latch = new CountDownLatch(1);
            try {
                lm.getCurrentLocation(prov, null, c.getMainExecutor(), l -> { got[0] = l; latch.countDown(); });
                latch.await(20, TimeUnit.SECONDS);
            } catch (SecurityException ignored) { }
            if (got[0] != null) best = got[0];
        }
        if (best == null) return new JSONObject().put("error", "Konum bulunamadı");
        return new JSONObject().put("lat", best.getLatitude()).put("lon", best.getLongitude()).put("acc", best.getAccuracy()).put("age", System.currentTimeMillis() - best.getTime());
    }
}
