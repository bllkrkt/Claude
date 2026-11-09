package com.bilal.kamera;

import android.graphics.ColorMatrix;

/** Renk filtreleri: vizörde canlı, fotoğrafta kayıttan sonra uygulanır. */
public final class Filters {
    private Filters() {}

    public static final String[] NAMES = {"Doğal", "Canlı", "Sıcak", "Soğuk", "Film", "Dram", "S/B", "S/B Sert", "Sepya", "Retro", "Belge"};
    /** Filtre çubuğundaki renk örneği */
    public static final int[] SWATCH = {0xFF9E9E9E, 0xFFFF7043, 0xFFFFB74D, 0xFF64B5F6, 0xFFBCAAA4, 0xFF5D4037, 0xFFBDBDBD, 0xFF424242, 0xFFA1887F, 0xFF4DB6AC, 0xFFFFFFFF};
    public static final boolean[] VIGNETTE = {false, false, false, false, true, true, false, true, true, true, false};

    public static int count() { return NAMES.length; }

    /** null = filtre yok */
    public static ColorMatrix matrix(int i) {
        ColorMatrix m = new ColorMatrix();
        switch (i) {
            case 1: m.setSaturation(1.35f); m.postConcat(contrast(1.08f, 0)); return m;
            case 2: m.setScale(1.08f, 1.0f, 0.88f, 1f); m.postConcat(saturation(1.1f)); return m;
            case 3: m.setScale(0.92f, 1.0f, 1.1f, 1f); return m;
            case 4: m.setSaturation(0.82f); m.postConcat(contrast(0.88f, 14)); m.postConcat(scale(1.04f, 1.0f, 0.95f)); return m;
            case 5: m.setSaturation(0.75f); m.postConcat(contrast(1.3f, -6)); return m;
            case 6: m.setSaturation(0f); m.postConcat(contrast(1.1f, 0)); return m;
            case 7: m.setSaturation(0f); m.postConcat(contrast(1.45f, -10)); return m;
            case 8: m.setSaturation(0f); m.postConcat(scale(1.07f, 0.95f, 0.78f)); m.postConcat(contrast(0.95f, 8)); return m;
            case 9: {
                m.set(new float[]{
                        0.9f, 0.15f, 0.05f, 0, 10,
                        0.05f, 0.85f, 0.1f, 0, 6,
                        0.05f, 0.15f, 0.7f, 0, 22,
                        0, 0, 0, 1, 0});
                m.postConcat(contrast(0.92f, 0));
                return m;
            }
            case 10: m.setSaturation(0f); m.postConcat(contrast(1.7f, 38)); return m; // belge: beyaz kâğıt, koyu yazı
            default: return null;
        }
    }

    private static ColorMatrix contrast(float c, float add) {
        float t = 128f * (1f - c) + add;
        return new ColorMatrix(new float[]{c, 0, 0, 0, t, 0, c, 0, 0, t, 0, 0, c, 0, t, 0, 0, 0, 1, 0});
    }

    private static ColorMatrix saturation(float s) { ColorMatrix m = new ColorMatrix(); m.setSaturation(s); return m; }

    private static ColorMatrix scale(float r, float g, float b) { ColorMatrix m = new ColorMatrix(); m.setScale(r, g, b, 1f); return m; }
}
