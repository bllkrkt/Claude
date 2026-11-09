package com.bilal.kamera;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.ViewConfiguration;
import android.widget.LinearLayout;

/** Lens düğmeleri şeridi: dokununca düğme seçilir, parmakla sağa/sola sürükleyince akıcı yakınlaştırır. */
public class ZoomBar extends LinearLayout {
    public interface OnDrag { void onDrag(float dx); void onDragEnd(); }

    private OnDrag listener;
    private float downX, lastX;
    private boolean dragging;
    private final int slop;

    public ZoomBar(Context c, AttributeSet a) {
        super(c, a);
        slop = ViewConfiguration.get(c).getScaledTouchSlop();
    }

    public void setOnDrag(OnDrag l) { listener = l; }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent e) {
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN: downX = lastX = e.getX(); dragging = false; break;
            case MotionEvent.ACTION_MOVE:
                if (!dragging && Math.abs(e.getX() - downX) > slop) { dragging = true; lastX = e.getX(); getParent().requestDisallowInterceptTouchEvent(true); }
                break;
        }
        return dragging;
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN: return true;
            case MotionEvent.ACTION_MOVE:
                if (listener != null) listener.onDrag(e.getX() - lastX);
                lastX = e.getX();
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (dragging && listener != null) listener.onDragEnd();
                dragging = false;
                return true;
        }
        return true;
    }
}
