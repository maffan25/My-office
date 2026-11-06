#!/usr/bin/env python3
"""Membuat icons-3d.js dari lembar ikon (sheet) -> lapisan bergerak (WebP base64). Jalankan: python3 gen_icons3d.py [lembar.png]"""
import sys, json, io, base64, numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
H0 = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
SHEET = sys.argv[1] if len(sys.argv) > 1 else H0 + '/icons/_sheet.png'
meta = json.load(open(H0 + '/icons/_meta.json'))
sheet = np.array(Image.open(SHEET).convert('RGB')); SH_, SW_ = sheet.shape[:2]
R, G, B = [sheet[..., i].astype(int) for i in range(3)]
yy, xx = np.mgrid[:SH_, :SW_]
box = lambda x0, y0, x1, y1: (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
dist = lambda cx, cy, r: (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
navy = (np.maximum(np.maximum(R, G), B) < 125) & (B >= R)
gold = (R > 200) & (G > 140) & (B < 130)
red = (R > 200) & (G < 120)
_hsv = cv2.cvtColor(sheet, cv2.COLOR_RGB2HSV); hh, ss, vv = [_hsv[..., i].astype(int) for i in range(3)]
orange = (hh >= 5) & (hh <= 22) & (ss > 110) & (vv > 170)   # hue OpenCV 0-179: oranye
blue = (B > R + 60) & (B > 150)
purple = (B > 190) & (R < 200) & (G < 150) & (B > G + 50)
# parts: ikon -> [(nama, mask, titik-putar sheet, clear_alpha)]
_arrow = ndi.binary_dilation(box(80, 655, 268, 790) & purple, iterations=6)   # panah ungu tidak boleh ikut batang
P = {
 'academic': [('cap', 'hull:214', box(95, 45, 410, 228) & (navy | gold), (255, 205), 0)],
 'work': [('tag', '', box(612, 95, 705, 280) & ((B > R + 10) | (np.min(sheet, 2) > 225)), (655, 105), 0)],
 'project': [('gear', 'close', box(1300, 165, 1455, 315) & orange, (1380, 238), 0)],
 'set': [('gear', '', box(0, 0, SW_, SH_) & ~box(559, 0, SW_, 742), (502, 810), 1)],
 'goal': [('arrow', '', box(1070, 360, 1215, 500) & blue, (1075, 490), 0)],
 'bell': [('badge', '', dist(1138, 745, 40), (1138, 745), 0)],
 'chart': [('arrow', 'close', box(80, 655, 268, 790) & purple, (90, 775), 1)] +
          [('b%d' % i, '', box(a, 700, b, 905) & ~_arrow, ((a + b) // 2, 898), 1) for i, (a, b) in enumerate([(57, 117), (117, 178), (178, 237), (237, 297)])],
}
CLOCK = (788, 820)
out = {}
def webp(arr):
    b = io.BytesIO(); Image.fromarray(arr, 'RGBA').save(b, 'WEBP', quality=86, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
for name, (x0, y0, w, h) in meta.items():
    a8 = np.array(Image.open(f'{H0}/icons/{name}.png').convert('RGBA'))
    rgb = a8[..., :3].copy(); al = a8[..., 3].astype(np.float32) / 255
    sl = (slice(y0, y0 + h), slice(x0, x0 + w))
    parts = []   # (cls, mask_local, origin_local)
    for cls, mode, m, org, clr in P.get(name, []):
        m = m[sl] & (al > .3)
        if cls != 'arrow' or name == 'goal':
            pass
        if mode.startswith('hull'):      # cangkang cembung seluruh bagian (menangkap sorotan/bayangan), kecuali bagian bawah yang bukan milik bagian ini
            cut = int(mode.split(':')[1]) - y0
            cs, _ = cv2.findContours(ndi.binary_dilation(m, iterations=3).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            hm = np.zeros(m.shape, np.uint8); cv2.fillPoly(hm, [cv2.convexHull(np.vstack(cs))], 1)
            book = (np.arange(h)[:, None] + y0 >= 190) & ((B[sl] > R[sl] + 60) & (B[sl] > 160))   # sampul buku biru bukan bagian topi
            m = (hm.astype(bool) & (al > .3) & ~book) & ((np.arange(h)[:, None] < cut) | ndi.binary_dilation(m, iterations=2))
        elif mode == 'close':
            m = ndi.binary_closing(ndi.binary_dilation(m, iterations=1), structure=cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)).astype(bool))
            l2, k = ndi.label(m)
            if k > 1: sz = ndi.sum(m, l2, range(1, k + 1)); m = l2 == 1 + int(np.argmax(sz))
        if name == 'set' and cls == 'gear':   # buang tepi pucat (sisa latar putih) di pinggiran gir
            sa = rgb.max(2).astype(int) - rgb.min(2); ring = m & ~ndi.binary_erosion(m, iterations=7)
            m = m & ~(ring & (sa < 55)); m = ndi.binary_opening(m, iterations=2)
        if cls == 'gear':
            gy, gx = np.where(m); org = (gx.mean() + x0, gy.mean() + y0)
        parts.append((cls, m, (org[0] - x0, org[1] - y0), clr))
    if name == 'clock':
        d = dist(*CLOCK, 66)[sl] & (np.max(sheet, 2)[sl] < 120) & ~dist(*CLOCK, 9)[sl]
        parts.append(('hands', d, None, 0))
    # kilau: komponen kecil yang terpisah dari badan
    lab, n = ndi.label(al > .5)
    if n > 1:
        sz = ndi.sum(al > .5, lab, range(1, n + 1)); big = 1 + int(np.argmax(sz))
        sp = np.isin(lab, [i + 1 for i in range(n) if i + 1 != big and sz[i] > 100 and sz[i] < .15 * sz[big - 1] and (np.ptp(rgb[lab == i + 1], axis=1).mean() > 90)])
        if sp.any(): parts.append(('sp', ndi.binary_dilation(sp, iterations=2), None, 1))
    base_rgb, base_al = rgb.copy(), al.copy()
    for cls, m, org, clr in parts:
        md = ndi.binary_dilation(m, iterations=3)
        base_rgb = cv2.inpaint(base_rgb, md.astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA)
        if clr: base_al[md & (np.arange(h)[:, None] + y0 < 898 if cls[0] == 'b' and name == 'chart' else True)] = 0
    s = 92.0 / max(w, h); ox = (100 - w * s) / 2; oy = (100 - h * s) / 2 - 1
    sc = 230.0 / max(w, h)
    def img(rgb_, al_, x, y, ww, hh):
        r = cv2.resize(np.dstack([rgb_, (al_ * 255).astype(np.uint8)]), (max(1, int(ww * sc)), max(1, int(hh * sc))), interpolation=cv2.INTER_AREA)
        return '<image href="%s" x="%.2f" y="%.2f" width="%.2f" height="%.2f"/>' % (webp(r), ox + x * s, oy + y * s, ww * s, hh * s)
    svg = '<ellipse class="sh" cx="50" cy="%.1f" rx="%.1f" ry="5" fill="url(#lg-sh)"/>' % (oy + h * s + 1, w * s * .38)
    body = img(base_rgb, base_al, 0, 0, w, h)
    sp_svg = ''
    for cls, m, org, clr in parts:
        if cls == 'hands': continue
        ys, xs = np.where(m)
        by0, by1, bx0, bx1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
        by0, bx0 = max(by0, 0), max(bx0, 0); by1, bx1 = min(by1, h), min(bx1, w)
        pa = cv2.GaussianBlur(ndi.binary_dilation(m, iterations=1).astype(np.float32), (0, 0), .8)[by0:by1, bx0:bx1] * al[by0:by1, bx0:bx1]
        tag = img(rgb[by0:by1, bx0:bx1], pa, bx0, by0, bx1 - bx0, by1 - by0)
        st = ''
        if org: st = ' style="transform-origin:%.1fpx %.1fpx"' % (ox + org[0] * s, oy + org[1] * s)
        g = '<g class="n-%s"%s>%s</g>' % (cls, st, tag)
        if cls == 'sp': sp_svg = g
        else: body += g
    if name == 'clock':
        cx, cy = ox + (CLOCK[0] - x0) * s, oy + (CLOCK[1] - y0) * s
        L = lambda cls, ln, wd, col: '<line class="%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round" style="transform-origin:%.1fpx %.1fpx"/>' % (cls, cx, cy, cx, cy - ln, col, wd, cx, cy)
        body += L('n-hh', 17, 4.4, '#27315e') + L('n-hm', 24, 3.4, '#27315e') + L('n-hs', 26, 1.6, '#e0344a') + '<circle cx="%.1f" cy="%.1f" r="3.6" fill="#27315e"/>' % (cx, cy)
    out[name] = svg + '<g class="n-body">' + body + '</g>' + sp_svg
open(H0 + '/icons-3d.js', 'w', encoding='utf-8').write('/* GENERATED oleh gen_icons3d.py - ikon 3D berlapis (lihat icons-3d.css untuk gerak) */\nwindow.IC3D=' + json.dumps(out, separators=(',', ':')) + ';\n')
print({k: len(v) // 1024 for k, v in out.items()})
