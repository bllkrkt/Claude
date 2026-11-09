package com.bilal.kamera;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;

/** Deklanşör: fotoğrafta beyaz, videoda kırmızı daire; kayıtta kare; işlemde dönen halka. */
public class ShutterView extends View {
    public static final int PHOTO = 0, VIDEO = 1, RECORDING = 2;
    private int state = PHOTO;
    private boolean busy;
    private float press = 0f, morph = 0f, spin = 0f;
    private final Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint arc = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF r = new RectF();
    private ValueAnimator spinAnim;
    private int photoColor = 0xFFFFFFFF, ringColor = 0xFFFFFFFF;

    /** style: "white" klasik, "accent" renkli iç daire, "ring" renkli dış halka */
    public void setLook(int accent, String style) {
        photoColor = "accent".equals(style) ? accent : 0xFFFFFFFF;
        ringColor = "ring".equals(style) ? accent : 0xFFFFFFFF;
        arc.setColor("ring".equals(style) ? 0xFFFFFFFF : accent);
        ring.setColor(ringColor);
        invalidate();
    }

    public ShutterView(Context c, AttributeSet a) {
        super(c, a);
        float d = getResources().getDisplayMetrics().density;
        ring.setStyle(Paint.Style.STROKE);
        ring.setStrokeWidth(4 * d);
        ring.setColor(0xFFFFFFFF);
        arc.setStyle(Paint.Style.STROKE);
        arc.setStrokeWidth(4 * d);
        arc.setStrokeCap(Paint.Cap.ROUND);
        arc.setColor(0xFFFFC83D);
        setClickable(true);
    }

    public void setState(int s) {
        if (s == state) return;
        float from = state == RECORDING ? 1f : 0f, to = s == RECORDING ? 1f : 0f;
        state = s;
        ValueAnimator va = ValueAnimator.ofFloat(from, to).setDuration(220);
        va.addUpdateListener(v -> { morph = (float) v.getAnimatedValue(); invalidate(); });
        va.start();
        invalidate();
    }

    public void setBusy(boolean b) {
        if (busy == b) return;
        busy = b;
        if (b) {
            spinAnim = ValueAnimator.ofFloat(0, 360).setDuration(900);
            spinAnim.setRepeatCount(ValueAnimator.INFINITE);
            spinAnim.addUpdateListener(v -> { spin = (float) v.getAnimatedValue(); invalidate(); });
            spinAnim.start();
        } else if (spinAnim != null) {
            spinAnim.cancel();
        }
        invalidate();
    }

    private Runnable holdStart, holdEnd;
    private boolean holding;
    private final Runnable holdTrigger = () -> {
        if (holdStart != null) { holding = true; performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS); holdStart.run(); }
    };

    /** Basılı tutunca start, bırakınca end çağrılır (seri çekim). */
    public void setOnHold(Runnable start, Runnable end) { holdStart = start; holdEnd = end; }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (!isEnabled()) return false;
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                animPress(1f);
                holding = false;
                if (holdStart != null) postDelayed(holdTrigger, 450);
                return true;
            case MotionEvent.ACTION_UP:
                animPress(0f);
                removeCallbacks(holdTrigger);
                if (holding) { holding = false; if (holdEnd != null) holdEnd.run(); }
                else performClick();
                return true;
            case MotionEvent.ACTION_CANCEL:
                animPress(0f);
                removeCallbacks(holdTrigger);
                if (holding) { holding = false; if (holdEnd != null) holdEnd.run(); }
                return true;
        }
        return true;
    }

    @Override
    public boolean performClick() { return super.performClick(); }

    private void animPress(float to) {
        ValueAnimator va = ValueAnimator.ofFloat(press, to).setDuration(120);
        va.addUpdateListener(v -> { press = (float) v.getAnimatedValue(); invalidate(); });
        va.start();
    }

    @Override
    protected void onDraw(Canvas c) {
        float w = getWidth(), h = getHeight(), cx = w / 2, cy = h / 2;
        float d = getResources().getDisplayMetrics().density;
        float outer = Math.min(w, h) / 2 - ring.getStrokeWidth();
        c.drawCircle(cx, cy, outer, ring);
        if (busy) {
            r.set(cx - outer, cy - outer, cx + outer, cy + outer);
            c.drawArc(r, spin, 90, false, arc);
        }
        float inner = outer - 6 * d - press * 4 * d;
        int color = state == PHOTO ? photoColor : 0xFFFF3B30;
        if (busy) color = (color & 0x00FFFFFF) | 0x88000000;
        fill.setColor(color);
        // Daireden yuvarlak köşeli kareye geçiş
        float half = inner - morph * inner * 0.45f;
        float corner = half - morph * (half - 6 * d);
        r.set(cx - half, cy - half, cx + half, cy + half);
        c.drawRoundRect(r, corner, corner, fill);
    }
}
