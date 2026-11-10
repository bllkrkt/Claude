package com.bilal.arsivim;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.zip.Inflater;
import java.util.zip.InflaterInputStream;

/**
 * ZIP'in sadece içindekiler tablosunu (central directory) okur; dosyaları açmadan listeler.
 * İstenen dosya, ZIP'in tamamı belleğe alınmadan doğrudan diskten açılır.
 * ZIP64 destekli (65.535+ dosya, 4 GB+ arşiv). Android'e bağımlı değildir (masaüstünde test edilebilir).
 */
final class ZipIndex {
    private static final long MAX32 = 0xFFFFFFFFL;

    final FileChannel ch;
    final long size;
    final ArrayList<String> names = new ArrayList<>();
    private final ArrayList<long[]> meta = new ArrayList<>(); // {lho, csize, usize, method}
    private final HashMap<String, Integer> byName = new HashMap<>();

    ZipIndex(FileChannel ch) throws IOException {
        this.ch = ch;
        this.size = ch.size();
        if (size < 22) throw new IOException("Bu dosya ZIP değil");
        int tailLen = (int) Math.min(size, 65557 + 22);
        ByteBuffer tail = read(size - tailLen, tailLen);
        int eocd = -1;
        for (int i = tailLen - 22; i >= 0; i--) if (tail.getInt(i) == 0x06054b50) { eocd = i; break; }
        if (eocd < 0) throw new IOException("ZIP okunamadı (dosya eksik inmiş olabilir)");
        long count = tail.getShort(eocd + 10) & 0xFFFF;
        long cdSize = tail.getInt(eocd + 12) & MAX32;
        long cdOff = tail.getInt(eocd + 16) & MAX32;
        if ((count == 0xFFFF || cdSize == MAX32 || cdOff == MAX32) && eocd >= 20 && tail.getInt(eocd - 20) == 0x07064b50) {
            long e64 = tail.getLong(eocd - 12);
            ByteBuffer z = read(e64, 56);
            if (z.getInt(0) == 0x06064b50) { count = z.getLong(32); cdSize = z.getLong(40); cdOff = z.getLong(48); }
        }
        if (cdSize > Integer.MAX_VALUE || cdOff + cdSize > size) throw new IOException("ZIP içindekiler tablosu bozuk");
        ByteBuffer cd = read(cdOff, (int) cdSize);
        int p = 0;
        for (long i = 0; i < count && p + 46 <= cd.limit(); i++) {
            if (cd.getInt(p) != 0x02014b50) break;
            int method = cd.getShort(p + 10) & 0xFFFF;
            long csize = cd.getInt(p + 20) & MAX32;
            long usize = cd.getInt(p + 24) & MAX32;
            int nl = cd.getShort(p + 28) & 0xFFFF, xl = cd.getShort(p + 30) & 0xFFFF, cl = cd.getShort(p + 32) & 0xFFFF;
            long lho = cd.getInt(p + 42) & MAX32;
            byte[] nb = new byte[nl];
            for (int k = 0; k < nl; k++) nb[k] = cd.get(p + 46 + k);
            String name = new String(nb, StandardCharsets.UTF_8);
            if (usize == MAX32 || csize == MAX32 || lho == MAX32) {
                int q = p + 46 + nl, end = q + xl;
                while (q + 4 <= end) {
                    int id = cd.getShort(q) & 0xFFFF, len = cd.getShort(q + 2) & 0xFFFF;
                    if (id == 1) {
                        int o = q + 4;
                        if (usize == MAX32) { usize = cd.getLong(o); o += 8; }
                        if (csize == MAX32) { csize = cd.getLong(o); o += 8; }
                        if (lho == MAX32) lho = cd.getLong(o);
                        break;
                    }
                    q += 4 + len;
                }
            }
            p += 46 + nl + xl + cl;
            if (name.endsWith("/")) continue; // klasör kaydı
            byName.put(name, names.size());
            names.add(name);
            meta.add(new long[]{lho, csize, usize, method});
        }
    }

    int count() { return names.size(); }
    int find(String name) { Integer i = byName.get(name); return i == null ? -1 : i; }
    long usize(int i) { return meta.get(i)[2]; }

    /** Dosyanın açılmış (sıkıştırması çözülmüş) içeriğini akış olarak verir. */
    InputStream open(int i) throws IOException {
        long[] m = meta.get(i);
        ByteBuffer lh = read(m[0], 30);
        if (lh.getInt(0) != 0x04034b50) throw new IOException("ZIP kaydı bozuk");
        long start = m[0] + 30 + (lh.getShort(26) & 0xFFFF) + (lh.getShort(28) & 0xFFFF);
        if (m[3] == 0) return new ChannelStream(ch, start, m[1], false);
        if (m[3] == 8) {
            final Inflater inf = new Inflater(true);
            return new InflaterInputStream(new ChannelStream(ch, start, m[1], true), inf, 65536) {
                private boolean closed;
                @Override public void close() throws IOException {
                    if (closed) return;
                    closed = true;
                    super.close();
                    inf.end();
                }
            };
        }
        throw new IOException("Desteklenmeyen sıkıştırma türü: " + m[3]);
    }

    private ByteBuffer read(long pos, int len) throws IOException {
        ByteBuffer b = ByteBuffer.allocate(len).order(ByteOrder.LITTLE_ENDIAN);
        while (b.hasRemaining()) {
            int r = ch.read(b, pos + b.position());
            if (r < 0) throw new EOFException();
        }
        b.flip();
        return b;
    }

    /** Kanalın bir bölümünü konum tabanlı okur; birden çok iş parçacığı aynı kanalı güvenle paylaşır. */
    static final class ChannelStream extends InputStream {
        private final FileChannel ch;
        private long pos;
        private long left;
        private boolean pad; // Inflater(nowrap) sonda fazladan bir bayt ister

        ChannelStream(FileChannel ch, long start, long len, boolean pad) {
            this.ch = ch; this.pos = start; this.left = len; this.pad = pad;
        }

        @Override public int read() throws IOException {
            byte[] one = new byte[1];
            int r = read(one, 0, 1);
            return r <= 0 ? -1 : one[0] & 0xFF;
        }

        @Override public int read(byte[] b, int off, int len) throws IOException {
            if (len == 0) return 0;
            if (left <= 0) {
                if (pad) { pad = false; b[off] = 0; return 1; }
                return -1;
            }
            int n = (int) Math.min(len, left);
            int r = ch.read(ByteBuffer.wrap(b, off, n), pos);
            if (r <= 0) return -1;
            pos += r; left -= r;
            return r;
        }

        @Override public long skip(long n) {
            long s = Math.max(0, Math.min(n, left));
            pos += s; left -= s;
            return s;
        }

        @Override public int available() { return (int) Math.min(Integer.MAX_VALUE, Math.max(0, left)); }
    }
}
