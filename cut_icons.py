#!/usr/bin/env python3
"""Potong lembar ikon -> icons/<nama>.png (transparan) + icons/_meta.json. Jalankan: python3 cut_icons.py [lembar.png]"""
import sys, os, json, numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
H0 = os.path.dirname(os.path.abspath(__file__))
src = np.array(Image.open(sys.argv[1] if len(sys.argv) > 1 else H0 + '/icons/_sheet.png').convert('RGB')); H, W = src.shape[:2]
mx = src.max(2).astype(int); mn = src.min(2).astype(int)
core = ((mx - mn) > 38) | (mn < 205)
E_ = lambda k: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)).astype(bool)
core = ndi.binary_fill_holes(ndi.binary_closing(core, structure=E_(9)))
core = ndi.binary_opening(core, iterations=2)
meta = json.load(open(H0 + '/icons/_meta.json'))
XLIM = {'goal': (918, 9999)}                     # buang serpihan ikon tetangga
CLOSE = {'org': 41, 'doc': 35, 'set': 25, 'task': 21}   # tutup cekungan (bagian putih/pucat)
for name, (x0, y0, w, h) in meta.items():
    m = core[y0:y0 + h, x0:x0 + w].copy()
    if name == 'set':     # gir ungu: pakai kejenuhan rendah agar sorotan pucat ikut, bayangan tidak
        m = ndi.binary_fill_holes(ndi.binary_closing(((mx - mn)[y0:y0 + h, x0:x0 + w] > 27), structure=E_(9)))
        sp = np.zeros(m.shape, bool); sp[:78, 205:] = True      # kilau kuning: hanya piksel kuning, tanpa halo putih
        sl_ = (slice(y0, y0 + h), slice(x0, x0 + w)); Rr, Gg, Bb = [src[sl_][..., i].astype(int) for i in range(3)]
        m = (m & ~sp) | (ndi.binary_dilation((Rr > 225) & (Gg > 140) & (Bb < 140) & sp, iterations=1))
    if name in XLIM: m[:, :max(0, XLIM[name][0] - x0)] = False
    if name in CLOSE:
        mp = np.pad(m, 40); mp = ndi.binary_closing(mp, structure=E_(CLOSE[name])); m = ndi.binary_fill_holes(mp)[40:-40, 40:-40]
    m = ndi.binary_opening(m, iterations=4 if name == 'set' else 2)
    if name == 'set': m = ndi.binary_erosion(m, iterations=2)   # buang tepi putih agar gir bersih saat berputar
    if name == 'cal':     # badan putih kalender: cangkang cembung
        l1, k1 = ndi.label(m); big = l1 == 1 + int(np.argmax(ndi.sum(m, l1, range(1, k1 + 1))))
        cs, _ = cv2.findContours(big.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hm = np.zeros(m.shape, np.uint8); cv2.fillPoly(hm, [cv2.convexHull(max(cs, key=cv2.contourArea))], 1)
        m = cv2.erode(hm, np.ones((5, 5))).astype(bool) | (m & ~big)
    l2, k = ndi.label(m)
    if k > 1:
        sz = ndi.sum(m, l2, range(1, k + 1)); m = np.isin(l2, [i + 1 for i, s in enumerate(sz) if s > 150])
    a = cv2.GaussianBlur(cv2.erode(m.astype(np.float32), np.ones((3, 3))), (0, 0), 0.8)
    rgb = src[y0:y0 + h, x0:x0 + w].astype(np.float32); al = np.clip(a, 0.001, 1)[..., None]
    rgb = np.clip((rgb - (1 - al) * 255) / al, 0, 255)
    Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA').save(f'{H0}/icons/{name}.png')
