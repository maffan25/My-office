#!/usr/bin/env python3
"""Bundel file sumber -> app.css, app.js, banks.js, index.html.  Jalankan:  python3 build.py"""
import re, os
H = os.path.dirname(os.path.abspath(__file__)); S = H
rd = lambda f: open(os.path.join(S, f), encoding='utf-8').read()

src = rd('index.src.html')
css = re.findall(r'<link rel="stylesheet" href="([^"]+\.css)">', src)
css.append('perf.css')
core = re.findall(r'<script src="([^"]+\.js)"></script>', src)
banks = [f for f in core if f.startswith('exam-bank')]
core = [f for f in core if f not in banks] + ['perf.js']

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
out = out.replace('href="app.css"','href="app.css?v=candy2"').replace('src="app.js"','src="app.js?v=candy2"')
open(os.path.join(H, 'index.html'), 'w', encoding='utf-8').write(out)
print('css', len(css), 'js', len(core), 'banks', len(banks))
