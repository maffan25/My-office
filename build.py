#!/usr/bin/env python3
"""Bundel file sumber -> app.css, app.js, banks.js, index.html.  Jalankan:  python3 build.py"""
import re, os
H = os.path.dirname(os.path.abspath(__file__)); S = H
rd = lambda f: open(os.path.join(S, f), encoding='utf-8').read()

src = rd('index.src.html')
css = re.findall(r'<link rel="stylesheet" href="([^"]+\.css)">', src)
css.append('perf.css')
css = [f for f in css if f not in ('soft.css','final.css','fresh.css','icons-live.css','icons-3d.css','cal-polish.css','cekricek.css','work-noir.css','beresin.css','redesign.css','revisi.css','tasks.css','revisi2.css','revisi3.css','revisi4.css','revisi5.css','revisi6.css','sync.css')] + ['soft.css','final.css','fresh.css','icons-live.css','icons-3d.css','cal-polish.css','cekricek.css','work-noir.css','beresin.css','redesign.css','revisi.css','tasks.css','revisi2.css','revisi3.css','revisi4.css','revisi5.css','revisi6.css','sync.css']   # soft lalu final (perbaikan layout & kontras) selalu paling akhir
core = re.findall(r'<script src="([^"]+\.js)"></script>', src)
banks = [f for f in core if f.startswith('exam-bank')]
core = [f for f in core if f not in banks and f != 'soft.js'] + ['perf.js', 'soft.js']

def mincss(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\s*([{};,])\s*', r'\1', t)
    return t.strip()
open(os.path.join(H, 'app.css'), 'w', encoding='utf-8').write('\n'.join(mincss(rd(f)) for f in css))
open(os.path.join(H, 'app.js'), 'w', encoding='utf-8').write(';\n'.join(rd(f) for f in core) + ';\n')
open(os.path.join(H, 'banks.js'), 'w', encoding='utf-8').write(';\n'.join(rd(f) for f in banks) + ';\n')

out = re.sub(r'(<link rel="stylesheet" href="[^"]+\.css">\s*)+', '<link rel="stylesheet" href="app.css">\n', src)
out = re.sub(r'(<script src="[^"]+\.js"></script>\s*)+', '<script src="app.js" defer></script>\n', out)

# Font: hanya yang dibutuhkan di layar pertama dimuat dulu; sisanya setelah halaman tampil
fonts = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?<noscript>.*?</noscript>', out, flags=re.S)
G = 'https://fonts.googleapis.com/css2?'
crit = G + 'family=Chakra+Petch:wght@500;600&family=Inter:wght@300;400;500;600;700&display=swap'
rest = G + ('family=Anton&family=Baloo+2:wght@600;700;800&family=EB+Garamond:wght@400;500&family=Fraunces:opsz,wght@9..144,600;9..144,700'
            '&family=Nunito:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800'
            '&family=Sora:wght@400;500;600;700&display=swap')
new = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
       f'<link rel="stylesheet" href="{crit}">\n'
       f'<link rel="stylesheet" href="{rest}" media="print" onload="this.media=\'all\'">\n'
       f'<noscript><link rel="stylesheet" href="{rest}"></noscript>')
out = out.replace(fonts.group(0), new)
open(os.path.join(H, 'index.html'), 'w', encoding='utf-8').write(out)
# EMBED_ICONS: ikon 3D ditanam sebagai data (WebP) agar tidak bergantung pada folder icons/ atau path relatif
import base64, io
from PIL import Image
def _uri(n):
    im = Image.open(os.path.join(H, 'icons', n + '.png')).convert('RGBA').resize((144, 144), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
for fn in ('index.html', 'app.js'):
    t = rd(fn)
    t = re.sub(r'icons/([a-z]+)\.png', lambda m: _uri(m.group(1)), t)
    open(os.path.join(H, fn), 'w', encoding='utf-8').write(t)
print('css', len(css), 'js', len(core), 'banks', len(banks))
