package com.bilal.kamera;

import android.content.Context;
import android.graphics.Matrix;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.util.AttributeSet;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.AppCompatImageView;

/** İki parmakla yakınlaştırma, sürükleme ve çift dokunuşla büyütme yapan resim görünümü. */
public class ZoomImageView extends AppCompatImageView {
    private final Matrix base = new Matrix(), user = new Matrix(), draw = new Matrix();
    private float scale = 1f;
    private final ScaleGestureDetector sd;
    private final GestureDetector gd;
    private Runnable onTap;

    public ZoomImageView(Context c) { this(c, null); }

    public ZoomImageView(Context c, AttributeSet a) {
        super(c, a);
        setScaleType(ScaleType.MATRIX);
        sd = new ScaleGestureDetector(c, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override public boolean onScale(@NonNull ScaleGestureDetector d) {
                float ns = Math.max(1f, Math.min(8f, scale * d.getScaleFactor()));
                float f = ns / scale;
                scale = ns;
                user.postScale(f, f, d.getFocusX(), d.getFocusY());
                fix();
                return true;
            }
        });
        gd = new GestureDetector(c, new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onScroll(MotionEvent e1, @NonNull MotionEvent e2, float dx, float dy) {
                if (scale <= 1.01f) return false;
                user.postTranslate(-dx, -dy);
                fix();
                return true;
            }
            @Override public boolean onDoubleTap(@NonNull MotionEvent e) {
                if (scale > 1.01f) { user.reset(); scale = 1f; }
                else { scale = 2.5f; user.setScale(2.5f, 2.5f, e.getX(), e.getY()); }
                fix();
                return true;
            }
            @Override public boolean onSingleTapConfirmed(@NonNull MotionEvent e) {
                if (onTap != null) onTap.run();
                return true;
            }
        });
    }

    public void setOnTap(Runnable r) { onTap = r; }
    public boolean isZoomed() { return scale > 1.01f; }
    public void resetZoom() { user.reset(); scale = 1f; fix(); }

    @Override
    public void setImageDrawable(Drawable d) {
        super.setImageDrawable(d);
        user.reset();
        scale = 1f;
        computeBase();
    }

    @Override
    protected void onSizeChanged(int w, int h, int ow, int oh) {
        super.onSizeChanged(w, h, ow, oh);
        computeBase();
    }

    private void computeBase() {
        Drawable d = getDrawable();
        if (d == null || getWidth() == 0) return;
        base.setRectToRect(new RectF(0, 0, d.getIntrinsicWidth(), d.getIntrinsicHeight()),
                new RectF(0, 0, getWidth(), getHeight()), Matrix.ScaleToFit.CENTER);
        fix();
    }

    /** Resmin kenarlarının ekrana boşluk bırakmasını engeller. */
    private void fix() {
        Drawable d = getDrawable();
        if (d == null) return;
        draw.set(base);
        draw.postConcat(user);
        RectF r = new RectF(0, 0, d.getIntrinsicWidth(), d.getIntrinsicHeight());
        draw.mapRect(r);
        float dx = 0, dy = 0, w = getWidth(), h = getHeight();
        if (r.width() <= w) dx = (w - r.width()) / 2 - r.left;
        else if (r.left > 0) dx = -r.left;
        else if (r.right < w) dx = w - r.right;
        if (r.height() <= h) dy = (h - r.height()) / 2 - r.top;
        else if (r.top > 0) dy = -r.top;
        else if (r.bottom < h) dy = h - r.bottom;
        user.postTranslate(dx, dy);
        draw.postTranslate(dx, dy);
        setImageMatrix(draw);
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        sd.onTouchEvent(e);
        gd.onTouchEvent(e);
        if (getParent() != null) getParent().requestDisallowInterceptTouchEvent(isZoomed() || e.getPointerCount() > 1);
        return true;
    }
}
