package com.bilal.kamera;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.util.AttributeSet;
import android.view.View;

/** Pro modda parlaklık histogramı. */
public class HistogramView extends View {
    private float[] bins;
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path path = new Path();

    public HistogramView(Context c, AttributeSet a) {
        super(c, a);
        fill.setColor(0xCCFFFFFF);
        bg.setColor(0x66000000);
    }

    public void setBins(float[] b) { bins = b; invalidate(); }

    @Override
    protected void onDraw(Canvas c) {
        float w = getWidth(), h = getHeight(), d = getResources().getDisplayMetrics().density;
        c.drawRoundRect(0, 0, w, h, 8 * d, 8 * d, bg);
        if (bins == null || bins.length < 2) return;
        float pad = 4 * d, iw = w - 2 * pad, ih = h - 2 * pad;
        path.reset();
        path.moveTo(pad, h - pad);
        for (int i = 0; i < bins.length; i++) {
            float x = pad + iw * i / (bins.length - 1);
            path.lineTo(x, h - pad - ih * Math.min(1f, bins[i]));
        }
        path.lineTo(w - pad, h - pad);
        path.close();
        c.drawPath(path, fill);
    }
}
