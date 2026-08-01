"""
生成 PWA 图标：渐变圆角底 + 白色「廷」字
直接解析系统 TTF 字体的 glyf 轮廓来渲染真实字形（纯标准库，无需 Pillow）
"""
import struct, zlib, math, os

CHAR = '廷'
FONT_CANDIDATES = [
    r'C:\Windows\Fonts\Dengb.ttf',    # 等线 Bold，笔画干净
    r'C:\Windows\Fonts\simhei.ttf',   # 黑体
    r'C:\Windows\Fonts\Deng.ttf',
]

# ---------------------------------------------------------------- TTF 解析
class TTF:
    def __init__(self, path):
        self.b = open(path, 'rb').read()
        tag = self.b[:4]
        off = 0
        if tag == b'ttcf':                       # TrueType Collection
            off = struct.unpack('>I', self.b[12:16])[0]
        num = struct.unpack('>H', self.b[off+4:off+6])[0]
        self.tables = {}
        p = off + 12
        for _ in range(num):
            t, _cs, o, l = struct.unpack('>4sIII', self.b[p:p+16])
            self.tables[t] = (o, l)
            p += 16
        ho = self.tables[b'head'][0]
        self.upem = struct.unpack('>H', self.b[ho+18:ho+20])[0]
        self.loc_fmt = struct.unpack('>h', self.b[ho+50:ho+52])[0]
        mo = self.tables[b'maxp'][0]
        self.num_glyphs = struct.unpack('>H', self.b[mo+4:mo+6])[0]

    def glyph_id(self, ch):
        cp = ord(ch)
        co, _ = self.tables[b'cmap']
        n = struct.unpack('>H', self.b[co+2:co+4])[0]
        best = None
        for i in range(n):
            pid, eid, off = struct.unpack('>HHI', self.b[co+4+i*8: co+12+i*8])
            if (pid, eid) in ((3, 1), (3, 10), (0, 3), (0, 4)):
                best = co + off
                if (pid, eid) == (3, 1):
                    break
        if best is None:
            raise RuntimeError('no usable cmap')
        fmt = struct.unpack('>H', self.b[best:best+2])[0]
        if fmt != 4:
            raise RuntimeError('cmap format %d unsupported' % fmt)
        segx2 = struct.unpack('>H', self.b[best+6:best+8])[0]
        seg = segx2 // 2
        ends = struct.unpack('>%dH' % seg, self.b[best+14: best+14+segx2])
        so = best + 16 + segx2
        starts = struct.unpack('>%dH' % seg, self.b[so: so+segx2])
        do = so + segx2
        deltas = struct.unpack('>%dh' % seg, self.b[do: do+segx2])
        ro = do + segx2
        ranges = struct.unpack('>%dH' % seg, self.b[ro: ro+segx2])
        for i in range(seg):
            if starts[i] <= cp <= ends[i]:
                if ranges[i] == 0:
                    return (cp + deltas[i]) & 0xFFFF
                gi_off = ro + i*2 + ranges[i] + (cp - starts[i]) * 2
                g = struct.unpack('>H', self.b[gi_off: gi_off+2])[0]
                return 0 if g == 0 else (g + deltas[i]) & 0xFFFF
        return 0

    def _loca(self, gid):
        lo, _ = self.tables[b'loca']
        if self.loc_fmt == 0:
            a, b = struct.unpack('>HH', self.b[lo+gid*2: lo+gid*2+4])
            return a*2, b*2
        a, b = struct.unpack('>II', self.b[lo+gid*4: lo+gid*4+8])
        return a, b

    def contours(self, gid, depth=0):
        """返回 [[(x,y,on_curve), ...], ...]"""
        s, e = self._loca(gid)
        if s == e or depth > 4:
            return []
        go = self.tables[b'glyf'][0] + s
        nc = struct.unpack('>h', self.b[go:go+2])[0]
        if nc < 0:                                # 复合字形
            out, p = [], go + 10
            while True:
                flags, gi = struct.unpack('>HH', self.b[p:p+4]); p += 4
                if flags & 1:
                    a1, a2 = struct.unpack('>hh', self.b[p:p+4]); p += 4
                else:
                    a1, a2 = struct.unpack('>bb', self.b[p:p+2]); p += 2
                sx = sy = 1.0; s01 = s10 = 0.0
                if flags & 8:
                    sx = sy = f2d(self.b, p); p += 2
                elif flags & 0x40:
                    sx = f2d(self.b, p); sy = f2d(self.b, p+2); p += 4
                elif flags & 0x80:
                    sx = f2d(self.b, p); s01 = f2d(self.b, p+2)
                    s10 = f2d(self.b, p+4); sy = f2d(self.b, p+6); p += 8
                dx, dy = (a1, a2) if flags & 2 else (0, 0)
                for c in self.contours(gi, depth+1):
                    out.append([(x*sx + y*s10 + dx, x*s01 + y*sy + dy, on) for (x, y, on) in c])
                if not (flags & 0x20):
                    break
            return out

        p = go + 10
        ends = struct.unpack('>%dH' % nc, self.b[p: p+nc*2]); p += nc*2
        npt = ends[-1] + 1
        il = struct.unpack('>H', self.b[p:p+2])[0]; p += 2 + il
        flags = []
        while len(flags) < npt:
            f = self.b[p]; p += 1
            flags.append(f)
            if f & 8:
                r = self.b[p]; p += 1
                flags += [f] * r
        xs, v = [], 0
        for f in flags:
            if f & 2:
                d = self.b[p]; p += 1
                v += d if f & 16 else -d
            elif not (f & 16):
                v += struct.unpack('>h', self.b[p:p+2])[0]; p += 2
            xs.append(v)
        ys, v = [], 0
        for f in flags:
            if f & 4:
                d = self.b[p]; p += 1
                v += d if f & 32 else -d
            elif not (f & 32):
                v += struct.unpack('>h', self.b[p:p+2])[0]; p += 2
            ys.append(v)
        out, st = [], 0
        for en in ends:
            out.append([(xs[i], ys[i], bool(flags[i] & 1)) for i in range(st, en+1)])
            st = en + 1
        return out


def f2d(b, p):
    return struct.unpack('>h', b[p:p+2])[0] / 16384.0


def flatten(contour, steps=10):
    """TrueType 二次贝塞尔 -> 折线点列"""
    if not contour:
        return []
    pts = contour[:]
    # 保证以 on-curve 点开头
    if not pts[0][2]:
        oni = next((i for i, q in enumerate(pts) if q[2]), None)
        if oni is None:                                   # 全是控制点：插入隐含中点
            mx = (pts[0][0] + pts[-1][0]) / 2.0
            my = (pts[0][1] + pts[-1][1]) / 2.0
            pts = [(mx, my, True)] + pts
        else:
            pts = pts[oni:] + pts[:oni]
    out = [(pts[0][0], pts[0][1])]
    i, n = 1, len(pts)
    cur = (pts[0][0], pts[0][1])
    while i <= n:
        px, py, on = pts[i % n]
        if on:
            out.append((px, py)); cur = (px, py); i += 1
            continue
        nx, ny, non = pts[(i+1) % n]
        if not non:                                       # 两控制点间插隐含中点
            nx, ny = (px + nx) / 2.0, (py + ny) / 2.0
            adv = 1
        else:
            adv = 2
        for s in range(1, steps+1):
            t = s / steps; mt = 1 - t
            out.append((mt*mt*cur[0] + 2*mt*t*px + t*t*nx,
                        mt*mt*cur[1] + 2*mt*t*py + t*t*ny))
        cur = (nx, ny); i += adv
    return out


# ---------------------------------------------------------------- 光栅化
def coverage(polys, size, ss=4):
    """非零环绕规则扫描线填充，ss×ss 超采样 -> 每像素 0..1 覆盖率"""
    H = size * ss
    cov = [0.0] * (size * size)
    edges = []
    for poly in polys:
        for i in range(len(poly)):
            x0, y0 = poly[i]
            x1, y1 = poly[(i+1) % len(poly)]
            if y0 != y1:
                edges.append((x0*ss, y0*ss, x1*ss, y1*ss))
    if not edges:
        return cov
    for sy in range(H):
        yc = sy + 0.5
        xs = []
        for (x0, y0, x1, y1) in edges:
            if (y0 <= yc < y1) or (y1 <= yc < y0):
                t = (yc - y0) / (y1 - y0)
                xs.append((x0 + t*(x1 - x0), 1 if y1 > y0 else -1))
        if not xs:
            continue
        xs.sort()
        wind = 0
        row = sy // ss
        for k in range(len(xs) - 1):
            wind += xs[k][1]
            if wind != 0:
                xa, xb = xs[k][0], xs[k+1][0]
                if xb <= xa:
                    continue
                a, b = int(math.floor(xa)), int(math.ceil(xb))
                for sx in range(max(0, a), min(H, b)):
                    l = max(xa, sx); r = min(xb, sx + 1)
                    if r > l:
                        col = sx // ss
                        if 0 <= col < size:
                            cov[row*size + col] += (r - l) / (ss*ss)
    return [min(1.0, c) for c in cov]


def lerp(a, b, t):
    return a + (b - a) * t


def write_png(path, size, rgba):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw += rgba[y*size*4:(y+1)*size*4]
    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
           + chunk(b'IEND', b''))
    open(path, 'wb').write(png)


def make(size, path, glyph_polys, bbox):
    (gx0, gy0, gx1, gy1) = bbox
    gw, gh = gx1 - gx0, gy1 - gy0
    box = size * 0.60                                  # 字占画布比例
    sc = box / max(gw, gh)
    ox = (size - gw*sc) / 2.0 - gx0*sc
    oy = (size - gh*sc) / 2.0 - gy0*sc
    polys = [[(x*sc + ox, size - (y*sc + oy)) for (x, y) in p] for p in glyph_polys]
    cov = coverage(polys, size, ss=4)

    r_out = size * 0.225
    c0, c1, c2 = (99, 102, 241), (168, 85, 247), (236, 72, 153)
    out = bytearray(size*size*4)
    for y in range(size):
        for x in range(size):
            fx, fy = x/size, y/size
            t = fx*0.55 + fy*0.45
            if t < 0.5:
                k = t/0.5
                rr, gg, bb = lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)
            else:
                k = (t-0.5)/0.5
                rr, gg, bb = lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)
            dx = max(r_out - x, x - (size - r_out), 0.0)
            dy = max(r_out - y, y - (size - r_out), 0.0)
            dist = math.hypot(dx, dy)
            a = 1.0 if dist <= r_out - 1 else max(0.0, min(1.0, r_out - dist))
            ink = cov[y*size + x]
            rr = lerp(rr, 255, ink); gg = lerp(gg, 255, ink); bb = lerp(bb, 255, ink)
            i = (y*size + x)*4
            out[i] = int(rr); out[i+1] = int(gg); out[i+2] = int(bb); out[i+3] = int(a*255)
    write_png(path, size, out)
    print('wrote', path, size)


font = next((f for f in FONT_CANDIDATES if os.path.exists(f)), None)
if not font:
    raise SystemExit('no font found')
print('font:', font)
t = TTF(font)
gid = t.glyph_id(CHAR)
print('glyph id:', gid, 'upem:', t.upem)
polys = [flatten(c) for c in t.contours(gid) if len(c) > 1]
polys = [p for p in polys if len(p) > 2]
xs = [x for p in polys for (x, _) in p]
ys = [y for p in polys for (_, y) in p]
bbox = (min(xs), min(ys), max(xs), max(ys))
print('contours:', len(polys), 'bbox:', bbox)

here = os.path.dirname(os.path.abspath(__file__))
make(192, os.path.join(here, 'icon-192.png'), polys, bbox)
make(512, os.path.join(here, 'icon-512.png'), polys, bbox)
