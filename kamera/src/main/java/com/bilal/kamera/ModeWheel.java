package com.bilal.kamera;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.widget.HorizontalScrollView;

/** Mod şeridi: parmağın ne zaman değip kalktığını ve kaydırmayı bildirir (çocuk yazılar dokunuşu yutsa bile). */
public class ModeWheel extends HorizontalScrollView {
    public interface Listener { void onTouchStart(); void onTouchEnd(); void onScrolled(); }

    private Listener listener;

    public ModeWheel(Context c, AttributeSet a) { super(c, a); }

    public void setListener(Listener l) { listener = l; }

    @Override
    public boolean dispatchTouchEvent(MotionEvent e) {
        if (listener != null) {
            int a = e.getActionMasked();
            if (a == MotionEvent.ACTION_DOWN) listener.onTouchStart();
            else if (a == MotionEvent.ACTION_UP || a == MotionEvent.ACTION_CANCEL) listener.onTouchEnd();
        }
        return super.dispatchTouchEvent(e);
    }

    @Override
    protected void onScrollChanged(int l, int t, int ol, int ot) {
        super.onScrollChanged(l, t, ol, ot);
        if (listener != null) listener.onScrolled();
    }
}
