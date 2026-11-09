package com.bilal.kamera;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.util.AttributeSet;
import android.view.View;

/** Vizör üstü çizimler: ızgara, su terazisi, odak halkası. */
public class OverlayView extends View {
    private int grid = 0;              // 0 kapalı, 3 = 3x3, 4 = 4x4, -1 altın oran
    private boolean levelOn;
    private float levelDeg = Float.NaN; // telefonun yataydan sapması (derece)
    private float uiRotation = 0;       // arayüz dönüşü (0/90/180/-90)
    private float fx = -1, fy, fAnim = 1f;
    private boolean fLocked;
    private final Paint gp = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint lp = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fp = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Runnable hideFocus = () -> { fx = -1; invalidate(); };

    public OverlayView(Context c, AttributeSet a) {
        super(c, a);
        float d = getResources().getDisplayMetrics().density;
        gp.setColor(0x66FFFFFF);
        gp.setStrokeWidth(Math.max(1, 0.8f * d));
        lp.setStrokeWidth(1.6f * d);
        lp.setStrokeCap(Paint.Cap.ROUND);
        fp.setStyle(Paint.Style.STROKE);
        fp.setStrokeWidth(1.6f * d);
        fp.setColor(0xFFFFC83D);
    }

    public void setGrid(int g) { grid = g; invalidate(); }
    public void setLevelEnabled(boolean on) { levelOn = on; invalidate(); }
    public void setLevel(float deg) { levelDeg = deg; if (levelOn) invalidate(); }
    public void setUiRotation(float r) { uiRotation = r; invalidate(); }

    public void showFocus(float x, float y, boolean locked) {
        fx = x; fy = y; fLocked = locked;
        removeCallbacks(hideFocus);
        ValueAnimator va = ValueAnimator.ofFloat(1.5f, 1f).setDuration(250);
        va.addUpdateListener(v -> { fAnim = (float) v.getAnimatedValue(); invalidate(); });
        va.start();
        if (!locked) postDelayed(hideFocus, 2500);
    }

    public void clearFocus() { removeCallbacks(hideFocus); fx = -1; invalidate(); }

    @Override
    protected void onDraw(Canvas c) {
        float w = getWidth(), h = getHeight(), d = getResources().getDisplayMetrics().density;
        if (grid == 3 || grid == 4) {
            for (int i = 1; i < grid; i++) {
                c.drawLine(w * i / grid, 0, w * i / grid, h, gp);
                c.drawLine(0, h * i / grid, w, h * i / grid, gp);
            }
        } else if (grid == -1) {
            float g = 0.382f;
            c.drawLine(w * g, 0, w * g, h, gp); c.drawLine(w * (1 - g), 0, w * (1 - g), h, gp);
            c.drawLine(0, h * g, w, h * g, gp); c.drawLine(0, h * (1 - g), w, h * (1 - g), gp);
        }
        if (levelOn && !Float.isNaN(levelDeg)) {
            boolean ok = Math.abs(levelDeg) < 1f;
            lp.setColor(ok ? 0xFF4CD964 : 0xCCFFFFFF);
            float cx = w / 2, cy = h / 2, len = 70 * d;
            c.save();
            c.rotate(uiRotation, cx, cy);
            // sabit referans uçları
            c.drawLine(cx - len - 16 * d, cy, cx - len - 4 * d, cy, lp);
            c.drawLine(cx + len + 4 * d, cy, cx + len + 16 * d, cy, lp);
            c.rotate(ok ? 0 : levelDeg, cx, cy);
            c.drawLine(cx - len, cy, cx + len, cy, lp);
            c.restore();
        }
        if (fx >= 0) {
            float r = 34 * d * fAnim;
            fp.setColor(fLocked ? 0xFFFF9500 : 0xFFFFC83D);
            c.drawCircle(fx, fy, r, fp);
            c.drawCircle(fx, fy, 3 * d, fp);
        }
    }
}
