package com.bilal.kamera;

import android.app.Activity;
import android.app.PendingIntent;
import android.app.RecoverableSecurityException;
import android.content.ContentUris;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Size;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.exifinterface.media.ExifInterface;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.ViewPager2;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Bu uygulamayla çekilen fotoğraf ve videolar: kaydırarak gez, yakınlaştır, paylaş, sil. */
public class GalleryActivity extends AppCompatActivity {
    static final class Item { Uri uri; boolean video; long date; String name; long size; }

    private final List<Item> items = new ArrayList<>();
    private ViewPager2 pager;
    private TextView title, empty;
    private View top, bottom;
    private boolean chrome = true;
    private final ExecutorService bg = Executors.newFixedThreadPool(2);
    private final Handler ui = new Handler(Looper.getMainLooper());
    private Item pendingDelete;
    private ActivityResultLauncher<IntentSenderRequest> deleteLauncher;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_gallery);
        pager = findViewById(R.id.pager);
        title = findViewById(R.id.galTitle);
        empty = findViewById(R.id.galEmpty);
        top = findViewById(R.id.galTop);
        bottom = findViewById(R.id.galBottom);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.galRoot), (v, in) -> {
            Insets i = in.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            top.setPadding(top.getPaddingLeft(), i.top, top.getPaddingRight(), 0);
            bottom.setPadding(0, 0, 0, i.bottom);
            return in;
        });
        deleteLauncher = registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), r -> {
            if (r.getResultCode() == Activity.RESULT_OK && pendingDelete != null) removeItem(pendingDelete);
            pendingDelete = null;
        });
        findViewById(R.id.galBack).setOnClickListener(v -> finish());
        findViewById(R.id.galShare).setOnClickListener(v -> share());
        findViewById(R.id.galEdit).setOnClickListener(v -> edit());
        findViewById(R.id.galInfo).setOnClickListener(v -> info());
        findViewById(R.id.galDelete).setOnClickListener(v -> confirmDelete());
        findViewById(R.id.galOpen).setOnClickListener(v -> openExternal());
        pager.setAdapter(new Adapter());
        pager.setOffscreenPageLimit(1);
        pager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override public void onPageSelected(int pos) { updateTitle(); }
        });
        load();
    }

    @Override
    protected void onDestroy() { super.onDestroy(); bg.shutdown(); }

    private void load() {
        bg.execute(() -> {
            List<Item> list = new ArrayList<>();
            Uri[] bases = {MediaStore.Images.Media.EXTERNAL_CONTENT_URI, MediaStore.Video.Media.EXTERNAL_CONTENT_URI};
            for (int k = 0; k < 2; k++) {
                try (Cursor c = getContentResolver().query(bases[k],
                        new String[]{MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DATE_ADDED, MediaStore.MediaColumns.DISPLAY_NAME,
                                MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.MIME_TYPE},
                        MediaStore.MediaColumns.OWNER_PACKAGE_NAME + "=?", new String[]{getPackageName()}, null)) {
                    while (c != null && c.moveToNext()) {
                        String mime = c.getString(4);
                        if (mime != null && mime.contains("dng")) continue; // RAW dosyaları galeride JPEG eşiyle temsil edilir
                        Item it = new Item();
                        it.uri = ContentUris.withAppendedId(bases[k], c.getLong(0));
                        it.date = c.getLong(1);
                        it.name = c.getString(2);
                        it.size = c.getLong(3);
                        it.video = k == 1;
                        list.add(it);
                    }
                } catch (Exception ignored) {}
            }
            Collections.sort(list, (a, b) -> Long.compare(b.date, a.date));
            ui.post(() -> {
                items.clear();
                items.addAll(list);
                pager.getAdapter().notifyDataSetChanged();
                empty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
                updateTitle();
            });
        });
    }

    private Item current() {
        int p = pager.getCurrentItem();
        return p >= 0 && p < items.size() ? items.get(p) : null;
    }

    private void updateTitle() {
        Item it = current();
        if (it == null) { title.setText(""); return; }
        title.setText(new SimpleDateFormat("d MMMM yyyy · HH:mm", new Locale("tr")).format(new Date(it.date * 1000))
                + "\n" + (pager.getCurrentItem() + 1) + " / " + items.size());
    }

    private void toggleChrome() {
        chrome = !chrome;
        float a = chrome ? 1f : 0f;
        top.animate().alpha(a).setDuration(180).start();
        bottom.animate().alpha(a).setDuration(180).start();
        top.setClickable(chrome);
    }

    private void share() {
        Item it = current();
        if (it == null) return;
        Intent i = new Intent(Intent.ACTION_SEND).setType(it.video ? "video/*" : "image/*")
                .putExtra(Intent.EXTRA_STREAM, it.uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(i, "Paylaş"));
    }

    private void edit() {
        Item it = current();
        if (it == null) return;
        Intent i = new Intent(Intent.ACTION_EDIT).setDataAndType(it.uri, it.video ? "video/*" : "image/*")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try { startActivity(Intent.createChooser(i, "Düzenle")); } catch (Exception e) { openExternal(); }
    }

    private void openExternal() {
        Item it = current();
        if (it == null) return;
        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(it.uri, it.video ? "video/*" : "image/*")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivity(i); } catch (Exception ignored) {}
    }

    private void info() {
        Item it = current();
        if (it == null) return;
        bg.execute(() -> {
            StringBuilder s = new StringBuilder();
            s.append(it.name).append('\n');
            s.append(String.format(Locale.US, "%.1f MB", it.size / 1048576f)).append('\n');
            if (!it.video) {
                try (InputStream in = getContentResolver().openInputStream(it.uri)) {
                    ExifInterface e = new ExifInterface(in);
                    int w = e.getAttributeInt(ExifInterface.TAG_IMAGE_WIDTH, 0), h = e.getAttributeInt(ExifInterface.TAG_IMAGE_LENGTH, 0);
                    if (w > 0) s.append(w).append(" × ").append(h).append(String.format(Locale.US, "  (%.1f MP)", w * (float) h / 1e6f)).append('\n');
                    String p = PostProcessor.params(e, null);
                    if (!p.isEmpty()) s.append(p).append('\n');
                    double[] ll = e.getLatLong();
                    if (ll != null) s.append(String.format(Locale.US, "Konum: %.5f, %.5f", ll[0], ll[1])).append('\n');
                } catch (Exception ignored) {}
            }
            ui.post(() -> new AlertDialog.Builder(this).setTitle("Bilgi").setMessage(s.toString().trim())
                    .setPositiveButton("Tamam", null).show());
        });
    }

    private void confirmDelete() {
        Item it = current();
        if (it == null) return;
        new AlertDialog.Builder(this).setTitle(it.video ? "Video silinsin mi?" : "Fotoğraf silinsin mi?")
                .setNegativeButton("Vazgeç", null)
                .setPositiveButton("Sil", (d, w) -> delete(it)).show();
    }

    private void delete(Item it) {
        try {
            getContentResolver().delete(it.uri, null, null);
            removeItem(it);
        } catch (RecoverableSecurityException e) {
            pendingDelete = it;
            deleteLauncher.launch(new IntentSenderRequest.Builder(e.getUserAction().getActionIntent().getIntentSender()).build());
        } catch (SecurityException e) {
            if (android.os.Build.VERSION.SDK_INT < 30) return;
            try {
                PendingIntent pi = MediaStore.createDeleteRequest(getContentResolver(), Collections.singletonList(it.uri));
                pendingDelete = it;
                deleteLauncher.launch(new IntentSenderRequest.Builder(pi.getIntentSender()).build());
            } catch (Exception ignored) {}
        }
    }

    private void removeItem(Item it) {
        int i = items.indexOf(it);
        if (i < 0) return;
        items.remove(i);
        pager.getAdapter().notifyItemRemoved(i);
        empty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
        updateTitle();
        setResult(RESULT_OK);
    }

    class Adapter extends RecyclerView.Adapter<Holder> {
        @NonNull @Override
        public Holder onCreateViewHolder(@NonNull ViewGroup parent, int type) {
            FrameLayout f = new FrameLayout(parent.getContext());
            f.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            ZoomImageView iv = new ZoomImageView(parent.getContext());
            f.addView(iv, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            ImageView play = new ImageView(parent.getContext());
            play.setImageResource(R.drawable.ic_play);
            play.setBackgroundResource(R.drawable.bg_round);
            int s = Math.round(72 * getResources().getDisplayMetrics().density);
            play.setPadding(s / 4, s / 4, s / 4, s / 4);
            f.addView(play, new FrameLayout.LayoutParams(s, s, Gravity.CENTER));
            return new Holder(f, iv, play);
        }

        @Override
        public void onBindViewHolder(@NonNull Holder h, int pos) {
            Item it = items.get(pos);
            h.item = it;
            h.image.setImageDrawable(null);
            h.play.setVisibility(it.video ? View.VISIBLE : View.GONE);
            h.play.setOnClickListener(v -> openExternal());
            h.image.setOnTap(GalleryActivity.this::toggleChrome);
            int w = getResources().getDisplayMetrics().widthPixels, hh = getResources().getDisplayMetrics().heightPixels;
            bg.execute(() -> {
                Bitmap bmp = null;
                try {
                    if (it.video) bmp = getContentResolver().loadThumbnail(it.uri, new Size(w, hh), null);
                    else {
                        bmp = ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), it.uri), (d, info, src) -> {
                            // Yakınlaştırma için ekranın 2 katına kadar çözünürlük
                            int max = Math.max(w, hh) * 2;
                            int big = Math.max(info.getSize().getWidth(), info.getSize().getHeight());
                            if (big > max) d.setTargetSampleSize(Math.max(1, big / max));
                            d.setAllocator(ImageDecoder.ALLOCATOR_HARDWARE);
                        });
                    }
                } catch (Exception ignored) {}
                Bitmap fb = bmp;
                ui.post(() -> { if (h.item == it && fb != null) h.image.setImageBitmap(fb); });
            });
        }

        @Override public int getItemCount() { return items.size(); }
    }

    static class Holder extends RecyclerView.ViewHolder {
        final ZoomImageView image;
        final ImageView play;
        Item item;
        Holder(View v, ZoomImageView i, ImageView p) { super(v); image = i; play = p; }
    }
}
