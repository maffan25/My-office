#!/usr/bin/env python3
"""Membuat icons-3d.js: tiap ikon = satu gambar utuh (WebP base64) dari icons/<nama>.png. Jalankan: python3 gen_icons3d.py
Gerak (naik-turun pelan) ada di icons-3d.css. Potong ikon dari lembar dengan cut_icons.py."""
import os, json, io, base64
from PIL import Image
H0 = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(H0 + '/icons/_meta.json'))
out = {}
for name, (x0, y0, w, h) in meta.items():
    im = Image.open(f'{H0}/icons/{name}.png').convert('RGBA')
    sc = 230.0 / max(w, h); im = im.resize((max(1, int(w * sc)), max(1, int(h * sc))), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6)
    s = 92.0 / max(w, h); ox = (100 - w * s) / 2; oy = (100 - h * s) / 2 - 1
    out[name] = ('<ellipse class="sh" cx="50" cy="%.1f" rx="%.1f" ry="5" fill="url(#lg-sh)"/>' % (oy + h * s + 1, w * s * .38) +
                 '<g class="n-body"><image href="data:image/webp;base64,%s" x="%.2f" y="%.2f" width="%.2f" height="%.2f"/></g>' % (base64.b64encode(b.getvalue()).decode(), ox, oy, w * s, h * s))
open(H0 + '/icons-3d.js', 'w', encoding='utf-8').write('/* GENERATED oleh gen_icons3d.py */\nwindow.IC3D=' + json.dumps(out, separators=(',', ':')) + ';\n')
print({k: len(v) // 1024 for k, v in out.items()})
