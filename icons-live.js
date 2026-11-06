/* icons-live.js — ikon 3D vektor berlapis dengan gerak ASLI per bagian.
   Menggantikan gambar PNG (<use href="#i-...">) dengan SVG inline: jarum jam benar-benar berputar, gir berputar,
   batang grafik tumbuh, lonceng berayun, panah menancap di sasaran, dst. Animasi ada di icons-live.css.
   - Hanya berjalan saat ikon terlihat (IntersectionObserver) -> hemat baterai.
   - Mati hanya jika sistem meminta prefers-reduced-motion. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);

  /* ---------- gradasi bersama ---------- */
  var GR = {
    navy: ['#4d5d99', '#1b2447'], navyD: ['#2c3869', '#121833'],
    blue: ['#86b0ff', '#3a63d8'], blueD: ['#5a82ee', '#2848b0'],
    cream: ['#fffcf2', '#f0dfb8'], white: ['#ffffff', '#dde5fb'],
    gold: ['#ffe680', '#f5a623'], goldD: ['#f9b936', '#d58210'],
    red: ['#ff8080', '#e0344a'], pink: ['#ffa6b8', '#e94f6f'],
    brown: ['#dc9560', '#8f4d28'], brownD: ['#b06a3c', '#6a3516'],
    green: ['#74e6a0', '#2fa066'], greenD: ['#46b883', '#1d7650'],
    purple: ['#c9b6ff', '#7f62e6'], purpleD: ['#ab94f7', '#6446cf'],
    orange: ['#ffc56a', '#f47a20'], yellow: ['#ffe680', '#f7b21d'],
    grey: ['#eceef8', '#b9bdd6'], lilac: ['#d6ccff', '#9482ee']
  };
  var defs = '';
  Object.keys(GR).forEach(function (k) {
    defs += '<linearGradient id="lg-' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + GR[k][0] + '"/><stop offset="1" stop-color="' + GR[k][1] + '"/></linearGradient>';
  });
  defs += '<radialGradient id="lg-sh"><stop offset="0" stop-color="#3c4696" stop-opacity=".34"/><stop offset="1" stop-color="#3c4696" stop-opacity="0"/></radialGradient>';
  defs += '<clipPath id="lvc-case"><rect x="10" y="28" width="80" height="58" rx="12"/></clipPath>';
  defs += '<clipPath id="lvc-label"><rect x="38" y="32" width="30" height="18" rx="4"/></clipPath>';
  var holder = document.createElementNS(NS, 'svg');
  holder.setAttribute('width', '0'); holder.setAttribute('height', '0'); holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = '<defs>' + defs + '</defs>';
  document.body.insertBefore(holder, document.body.firstChild);

  var U = function (k) { return 'url(#lg-' + k + ')'; };
  var SH = function (rx) { return '<ellipse class="sh" cx="50" cy="92" rx="' + (rx || 34) + '" ry="5.5" fill="url(#lg-sh)"/>'; };
  var f = function (n) { return +n.toFixed(2); };

  /* gir: poligon bergigi, digambar di koordinat absolut */
  function gear(cx, cy, ro, ri, n) {
    var p = [], s = Math.PI * 2 / n, i, a;
    for (i = 0; i < n; i++) {
      a = i * s - Math.PI / 2;
      [[-.29, ri], [-.17, ro], [.17, ro], [.29, ri]].forEach(function (q) {
        p.push(f(cx + Math.cos(a + q[0] * s) * q[1]) + ' ' + f(cy + Math.sin(a + q[0] * s) * q[1]));
      });
    }
    return 'M' + p.join('L') + 'Z';
  }
  function coin(y) {
    return '<path d="M66 ' + (y + 1) + 'v6a13 5 0 0 0 26 0v-6z" fill="' + U('goldD') + '"/>' +
      '<ellipse cx="79" cy="' + y + '" rx="13" ry="5.2" fill="' + U('gold') + '"/>' +
      '<ellipse cx="79" cy="' + y + '" rx="8" ry="2.9" fill="none" stroke="#d58210" stroke-opacity=".55" stroke-width="1.2"/>';
  }
  function tick12(cx, cy, r) {
    var s = '';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6, big = i % 3 === 0, r1 = r - (big ? 6 : 3.5), r2 = r - 1;
      s += '<path d="M' + f(cx + Math.sin(a) * r1) + ' ' + f(cy - Math.cos(a) * r1) + 'L' + f(cx + Math.sin(a) * r2) + ' ' + f(cy - Math.cos(a) * r2) +
        '" stroke="' + (big ? '#3b4a7a' : '#9aa3c4') + '" stroke-width="' + (big ? 2.4 : 1.4) + '" stroke-linecap="round"/>';
    }
    return s;
  }
  var STAR = function (x, y, s) {
    return '<path d="M' + x + ' ' + (y - s) + 'Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + 'Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="#ffd34d"/>';
  };
  var CHECK = function (cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + U('green') + '"/>' +
      '<path d="M' + (cx - 3) + ' ' + cy + 'l2.6 2.8 4.2-5.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  };

  /* ---------- 14 ikon ---------- */
  var I = {};

  I.academic = SH() +
    '<g class="a-book"><path d="M12 68q0-6 6-6h64q6 0 6 6v14q0 6-6 6H18q-6 0-6-6z" fill="' + U('blue') + '"/>' +
    '<rect x="17" y="66" width="66" height="14" rx="3.5" fill="' + U('cream') + '"/>' +
    '<path d="M22 71h56M22 75.500h56" stroke="#d8c598" stroke-width="1.400" stroke-linecap="round"/>' +
    '<path d="M14 68q0-4 4-4h64" stroke="#fff" stroke-opacity=".55" stroke-width="1.600" stroke-linecap="round" fill="none"/>' +
    '<path class="a-rib" d="M20 80h11v12l-5.500-4-5.500 4z" fill="' + U('red') + '"/></g>' +
    '<g class="a-cap"><path d="M30 44v13q0 9 20 9t20-9V44z" fill="' + U('navyD') + '"/>' +
    '<path d="M6 32L50 14l44 18v6L50 56 6 38z" fill="#121a38"/>' +
    '<path d="M50 14l44 18-44 18L6 32z" fill="' + U('navy') + '"/>' +
    '<path d="M50 18.500l34 13.500-34 13.500L16 32z" fill="#fff" fill-opacity=".09"/>' +
    '<path d="M50 14l44 18" stroke="#fff" stroke-opacity=".35" stroke-width="1.400" fill="none"/>' +
    '<path d="M50 32L80 37" stroke="#f5a623" stroke-width="2.400" stroke-linecap="round" fill="none"/>' +
    '<g class="a-tas"><path d="M80 37v16" stroke="#f5a623" stroke-width="2.400" stroke-linecap="round"/>' +
    '<circle cx="80" cy="53" r="3" fill="' + U('gold') + '"/>' +
    '<path d="M76 55h8l2.500 13h-13z" fill="' + U('gold') + '"/><path d="M78 58v9M80 58v10M82 58v9" stroke="#d58210" stroke-opacity=".5" stroke-width=".8"/></g>' +
    '<circle cx="50" cy="32" r="3.200" fill="' + U('gold') + '"/></g>';

  I.work = SH() +
    '<g class="w-body"><g class="w-han"><path d="M36 32v-8q0-8 8-8h12q8 0 8 8v8" fill="none" stroke="#6a3516" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M36 32v-8q0-8 8-8h12q8 0 8 8v8" fill="none" stroke="' + U('brown') + '" stroke-width="3.200" stroke-linecap="round"/></g>' +
    '<rect x="10" y="28" width="80" height="58" rx="12" fill="' + U('brown') + '"/>' +
    '<path d="M10 52q40 11 80 0v-8H10z" fill="#fff" fill-opacity=".1"/>' +
    '<path d="M12 52q38 10 76 0" fill="none" stroke="#5a2c10" stroke-opacity=".35" stroke-width="2"/>' +
    '<path d="M18 35q32-4 64 0" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="3" stroke-linecap="round"/>' +
    '<g clip-path="url(#lvc-case)"><rect class="w-shine" x="-24" y="26" width="13" height="62" fill="#fff" fill-opacity=".34" transform="skewX(-18)"/></g>' +
    '<rect class="w-clasp" x="42" y="47" width="16" height="15" rx="4.500" fill="' + U('gold') + '"/><rect x="47.500" y="51.500" width="5" height="6" rx="1.500" fill="#b9700b" fill-opacity=".55"/>' +
    '<g class="w-tag"><path d="M71.500 52h5v9h-5z" fill="' + U('blueD') + '"/>' +
    '<rect x="63" y="59" width="22" height="27" rx="4.500" fill="' + U('white') + '"/>' +
    '<circle cx="74" cy="68.500" r="3.800" fill="' + U('blue') + '"/><path d="M66.500 81q0-8 7.500-8t7.500 8z" fill="' + U('blue') + '"/></g></g>';

  I.org = SH(40) +
    '<ellipse cx="50" cy="80" rx="42" ry="12" fill="' + U('grey') + '"/><ellipse cx="50" cy="77" rx="36" ry="8" fill="#e9edfb"/>' +
    '<g class="o-l"><circle cx="24" cy="42" r="9.500" fill="' + U('gold') + '"/><path d="M10 76q0-22 14-22t14 22z" fill="' + U('goldD') + '"/></g>' +
    '<g class="o-r"><circle cx="76" cy="42" r="9.500" fill="' + U('green') + '"/><path d="M62 76q0-22 14-22t14 22z" fill="' + U('greenD') + '"/></g>' +
    '<g class="o-c"><g class="o-ch"><circle cx="50" cy="28" r="13" fill="' + U('blue') + '"/><ellipse cx="45.500" cy="23" rx="4.200" ry="2.600" fill="#fff" fill-opacity=".35"/></g>' +
    '<path d="M24 80q0-30 26-30t26 30z" fill="' + U('blueD') + '"/><path d="M43 51l7 9 7-9z" fill="#fff"/>' +
    '<path d="M48 59h4l1.500 13L50 76l-3.500-4z" fill="#fff"/></g>' +
    '<path d="M8 76q2 16 42 16t42-16q-8 8-42 8T8 76z" fill="' + U('white') + '"/>';

  I.project = SH() +
    '<rect x="12" y="14" width="64" height="74" rx="11" fill="' + U('blue') + '"/>' +
    '<rect x="18" y="24" width="52" height="58" rx="6" fill="' + U('white') + '"/>' +
    '<rect x="29" y="7" width="30" height="15" rx="5.500" fill="' + U('gold') + '"/><circle cx="44" cy="14" r="2.600" fill="#fff"/>' +
    '<g class="pr-c1">' + CHECK(30, 38, 6) + '</g><g class="pr-c2">' + CHECK(30, 53, 6) + '</g><g class="pr-c3">' + CHECK(30, 68, 6) + '</g>' +
    '<rect class="pr-l1" x="41" y="36" width="24" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="pr-l2" x="41" y="51" width="18" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="pr-l3" x="41" y="66" width="22" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<g class="pr-gear"><path d="' + gear(74, 72, 19, 14.500, 8) + '" fill="' + U('orange') + '" stroke="#f89a3a" stroke-width="2.600" stroke-linejoin="round"/>' +
    '<circle cx="74" cy="72" r="8.500" fill="#fff3da"/><circle cx="74" cy="72" r="4.500" fill="' + U('gold') + '"/></g>';

  I.task = SH() +
    '<rect x="8" y="14" width="64" height="74" rx="11" fill="' + U('purple') + '"/>' +
    '<rect x="14" y="24" width="52" height="58" rx="6" fill="' + U('white') + '"/>' +
    '<rect x="25" y="7" width="30" height="15" rx="5.500" fill="' + U('purpleD') + '"/><circle cx="40" cy="14" r="2.600" fill="#fff"/>' +
    '<g class="t-c1">' + CHECK(26, 38, 6) + '</g><g class="t-c2">' + CHECK(26, 53, 6) + '</g><g class="t-c3">' + CHECK(26, 68, 6) + '</g>' +
    '<rect class="t-l1" x="37" y="36" width="25" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="t-l2" x="37" y="51" width="19" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="t-l3" x="37" y="66" width="23" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<g class="t-pen"><g transform="translate(79 48) rotate(36)">' +
    '<rect x="-6.500" y="-36" width="13" height="10" rx="3.500" fill="' + U('pink') + '"/>' +
    '<rect x="-6.500" y="-27" width="13" height="4.500" fill="' + U('grey') + '"/>' +
    '<rect x="-6.500" y="-23" width="13" height="38" fill="' + U('yellow') + '"/><rect x="-1.500" y="-23" width="3" height="38" fill="#fff" fill-opacity=".35"/>' +
    '<path d="M-6.500 15L0 29l6.500-14z" fill="#ffe4b8"/><path d="M-2.200 24.500L0 29l2.200-4.500z" fill="#3b4256"/></g></g>';

  I.cal = SH() +
    '<g class="c-ring"><rect x="24" y="5" width="8" height="18" rx="4" fill="' + U('purpleD') + '"/></g>' +
    '<g class="c-ring c-r2"><rect x="64" y="5" width="8" height="18" rx="4" fill="' + U('purpleD') + '"/></g>' +
    '<rect x="8" y="14" width="80" height="72" rx="11" fill="' + U('white') + '"/>' +
    '<path d="M8 25q0-11 11-11h58q11 0 11 11v10H8z" fill="' + U('red') + '"/>' +
    '<path d="M16 19q30-3 64 0" stroke="#fff" stroke-opacity=".4" stroke-width="2.200" stroke-linecap="round" fill="none"/>' +
    [0, 1, 2].map(function (r) {
      return [0, 1, 2, 3, 4].map(function (c) {
        if (r === 1 && c === 2) return '';
        return '<rect x="' + (15 + c * 12.500) + '" y="' + (42 + r * 11) + '" width="9.500" height="8" rx="2.300" fill="#e2e7f8"/>';
      }).join('');
    }).join('') +
    '<rect class="c-today" x="40" y="53" width="9.500" height="8" rx="2.300" fill="' + U('red') + '"/>' +
    '<circle cx="70" cy="68" r="21" fill="' + U('blue') + '"/><circle cx="70" cy="68" r="16" fill="' + U('cream') + '"/>' +
    tick12(70, 68, 15.500) +
    '<line class="c-hh" x1="70" y1="68" x2="70" y2="60" stroke="#27315e" stroke-width="3" stroke-linecap="round"/>' +
    '<line class="c-hm" x1="70" y1="68" x2="70" y2="56" stroke="#27315e" stroke-width="2.200" stroke-linecap="round"/>' +
    '<circle cx="70" cy="68" r="2.600" fill="' + U('gold') + '"/>';

  I.fin = SH() +
    '<g class="f-bag"><path d="M38 33C13 46 6 70 12 81q6 10 26 10t26-10C70 70 63 46 38 33z" fill="' + U('green') + '"/>' +
    '<path d="M20 18q9-8 18-1 9-7 18 1l-4 15q-14 6-28 0z" fill="' + U('greenD') + '"/>' +
    '<path d="M25 31q13 8 26 0" fill="none" stroke="' + U('gold') + '" stroke-width="4.500" stroke-linecap="round"/>' +
    '<g class="f-tail"><circle cx="38" cy="36" r="4.500" fill="' + U('gold') + '"/><path d="M36 39l-4 10M40 39l4 10" stroke="#f0a020" stroke-width="3" stroke-linecap="round"/></g>' +
    '<path d="M22 58q-6 12-3 22" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>' +
    '<text class="f-dollar" x="38" y="78" font-size="29" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif">$</text></g>' +
    '<g class="f-c1">' + coin(81) + '</g><g class="f-c2">' + coin(74) + '</g><g class="f-c3">' + coin(67) + '</g><g class="f-c4">' + coin(60) + '</g>' +
    '<g class="f-flip"><circle cx="79" cy="44" r="10.500" fill="' + U('goldD') + '"/><circle cx="79" cy="44" r="8.600" fill="' + U('gold') + '"/>' +
    '<text x="79" y="49" font-size="13" font-weight="800" text-anchor="middle" fill="#c97a0c" font-family="Arial,sans-serif">$</text></g>' +
    '<g class="f-sp f-s1">' + STAR(14, 22, 6) + '</g><g class="f-sp f-s2">' + STAR(92, 22, 5) + '</g>';

  I.goal = SH() +
    '<g class="g-t"><circle cx="46" cy="56" r="38" fill="' + U('red') + '"/><circle cx="46" cy="56" r="29" fill="#fff6ee"/>' +
    '<circle cx="46" cy="56" r="21" fill="' + U('red') + '"/><circle cx="46" cy="56" r="13" fill="#fff6ee"/><circle cx="46" cy="56" r="6.200" fill="' + U('red') + '"/>' +
    '<path d="M16 40q6-14 22-19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.200" stroke-linecap="round"/></g>' +
    '<circle class="g-rip" cx="46" cy="56" r="38" fill="none" stroke="#ff5a6a" stroke-width="3"/>' +
    '<g class="g-ar"><g transform="translate(46 56) rotate(-45)">' +
    '<rect x="2" y="-2.200" width="52" height="4.400" rx="2.200" fill="' + U('blueD') + '"/>' +
    '<path d="M44-2L55-10h8l-6 10 6 10h-8L44 2z" fill="' + U('blue') + '"/><path d="M50-1L58-8h5l-4 8z" fill="#fff" fill-opacity=".4"/></g></g>';

  I.doc = SH() +
    '<path d="M8 32q0-8 8-8h20l6 8h42q8 0 8 8v40q0 8-8 8H16q-8 0-8-8z" fill="' + U('goldD') + '"/>' +
    '<g class="d-pap"><g class="d-p2"><rect x="24" y="12" width="46" height="52" rx="5" fill="' + U('grey') + '" transform="rotate(-7 47 38)"/></g>' +
    '<rect x="28" y="14" width="46" height="52" rx="5" fill="' + U('white') + '"/>' +
    '<path d="M35 25h32M35 33h32M35 41h22" stroke="#a9b8f0" stroke-width="3.600" stroke-linecap="round"/></g>' +
    '<path d="M8 50q0-8 8-8h68q8 0 8 8v30q0 8-8 8H16q-8 0-8-8z" fill="' + U('gold') + '"/>' +
    '<path d="M14 47h72" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>' +
    '<g class="d-cloud"><circle cx="64" cy="67" r="19" fill="' + U('blueD') + '"/>' +
    '<path d="M53.500 72a6.500 6.500 0 0 1 1.500-12.600 9 9 0 0 1 17 2.200 5.700 5.700 0 0 1-.8 10.400z" fill="#fff"/>' +
    '<g class="d-arr"><path d="M64 73V60M58.500 65.500L64 60l5.500 5.500" fill="none" stroke="#3a63d8" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/></g></g>';

  I.chart = SH() +
    '<rect x="6" y="82" width="88" height="10" rx="5" fill="' + U('lilac') + '"/>' +
    '<rect class="h-b1" x="13" y="64" width="15" height="19" rx="2.500" fill="' + U('blue') + '"/>' +
    '<rect class="h-b2" x="32" y="52" width="15" height="31" rx="2.500" fill="' + U('green') + '"/>' +
    '<rect class="h-b3" x="51" y="38" width="15" height="45" rx="2.500" fill="' + U('orange') + '"/>' +
    '<rect class="h-b4" x="70" y="24" width="15" height="59" rx="2.500" fill="' + U('gold') + '"/>' +
    '<path class="h-ln" pathLength="100" d="M10 48Q50 44 76 15" fill="none" stroke="' + U('purpleD') + '" stroke-width="4.400" stroke-linecap="round"/>' +
    '<path class="h-hd" d="M81 8.500L79.500 22.500 67.500 12z" fill="#7a5ae0" stroke="#7a5ae0" stroke-width="2" stroke-linejoin="round"/>';

  I.set = SH() +
    '<g class="s-g1"><path d="' + gear(50, 48, 41, 32, 8) + '" fill="' + U('purple') + '" stroke="#a48df5" stroke-width="3.400" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="48" r="22" fill="#9b82f0"/><circle cx="50" cy="48" r="17" fill="' + U('cream') + '"/>' +
    '<circle cx="50" cy="48" r="9" fill="' + U('gold') + '"/>' +
    '<path d="M24 28q8-12 22-15" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.400" stroke-linecap="round"/></g>' +
    '<g class="s-g2"><path d="' + gear(80, 80, 16, 12, 7) + '" fill="' + U('orange') + '" stroke="#f89a3a" stroke-width="2.600" stroke-linejoin="round"/>' +
    '<circle cx="80" cy="80" r="6.500" fill="#fff3da"/><circle cx="80" cy="80" r="3" fill="' + U('gold') + '"/></g>';

  I.bell = SH() +
    '<g class="b-sp"><path d="M12 22L5 15M19 13L15 5M90 22l7-7M83 12l4-8" stroke="#ffc42e" stroke-width="3.400" stroke-linecap="round"/></g>' +
    '<g class="b-bell"><circle cx="50" cy="12" r="5.500" fill="' + U('gold') + '"/>' +
    '<path d="M50 14C29 14 25 35 25 52c0 12-9 15-13 24h76c-4-9-13-12-13-24 0-17-4-38-25-38z" fill="' + U('gold') + '"/>' +
    '<ellipse cx="50" cy="77" rx="41" ry="10" fill="' + U('goldD') + '"/>' +
    '<path d="M35 28q-5 12-3 28" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4.500" stroke-linecap="round"/>' +
    '<g class="b-clap"><circle cx="50" cy="88" r="8.500" fill="' + U('gold') + '"/><ellipse cx="47" cy="85.500" rx="3" ry="2" fill="#fff" fill-opacity=".5"/></g></g>' +
    '<g class="b-badge"><circle cx="76" cy="26" r="13" fill="' + U('red') + '"/>' +
    '<text x="76" y="31.500" font-size="16" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">1</text></g>';

  I.clock = SH() +
    '<g class="k-top"><circle cx="26" cy="22" r="14.500" fill="' + U('gold') + '"/><circle cx="74" cy="22" r="14.500" fill="' + U('gold') + '"/>' +
    '<ellipse cx="22" cy="17" rx="5" ry="3" fill="#fff" fill-opacity=".45" transform="rotate(-30 22 17)"/><ellipse cx="70" cy="17" rx="5" ry="3" fill="#fff" fill-opacity=".45" transform="rotate(-30 70 17)"/>' +
    '<rect class="k-ham" x="45" y="5" width="10" height="9" rx="3" fill="' + U('blueD') + '"/></g>' +
    '<ellipse cx="28" cy="90" rx="6" ry="4" fill="' + U('goldD') + '"/><ellipse cx="72" cy="90" rx="6" ry="4" fill="' + U('goldD') + '"/>' +
    '<circle cx="50" cy="56" r="37" fill="' + U('blue') + '"/><circle cx="50" cy="56" r="29.500" fill="' + U('cream') + '"/>' +
    '<path d="M24 40q8-14 24-17" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>' +
    tick12(50, 56, 28) +
    '<line class="k-hh" x1="50" y1="56" x2="50" y2="43" stroke="#27315e" stroke-width="4" stroke-linecap="round"/>' +
    '<line class="k-hm" x1="50" y1="56" x2="50" y2="34" stroke="#27315e" stroke-width="3" stroke-linecap="round"/>' +
    '<line class="k-hs" x1="50" y1="62" x2="50" y2="31" stroke="#e0344a" stroke-width="1.600" stroke-linecap="round"/>' +
    '<circle cx="50" cy="56" r="3.800" fill="' + U('gold') + '"/>' +
    '<g class="k-sp"><path d="M90 20l7-6M94 32l8-1" stroke="#ffc42e" stroke-width="3.200" stroke-linecap="round"/></g>';

  I.book = SH() +
    '<rect x="16" y="12" width="66" height="76" rx="9" fill="' + U('greenD') + '"/>' +
    '<rect class="bk-pg" x="76" y="18" width="10" height="64" rx="3" fill="' + U('cream') + '"/>' +
    '<rect x="12" y="10" width="66" height="76" rx="9" fill="' + U('green') + '"/>' +
    '<path d="M12 19q0-9 9-9h6v76h-6q-9 0-9-9z" fill="#13683f" fill-opacity=".28"/>' +
    '<path d="M17 18q18-4 50 0" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="38" y="32" width="30" height="18" rx="4" fill="' + U('cream') + '"/>' +
    '<g clip-path="url(#lvc-label)"><rect class="bk-sh" x="22" y="30" width="8" height="24" fill="#fff" fill-opacity=".8" transform="skewX(-20)"/></g>' +
    '<path class="bk-rib" d="M52 86h12v14l-6-4.500-6 4.500z" fill="' + U('red') + '"/>' +
    '<g class="bk-sp"><path d="M88 18l7-6M92 30l8-1" stroke="#ffc42e" stroke-width="3.200" stroke-linecap="round"/></g>';

  if (window.IC3D) Object.keys(window.IC3D).forEach(function (k) { I[k] = window.IC3D[k]; });   /* ikon 3D baru (icons-3d.js) menggantikan SVG lama */

  /* ---------- pemasangan ---------- */
  var KEY = {
    'i-academic': 'academic', 'i-work': 'work', 'i-org': 'org', 'i-project': 'project', 'i-task': 'task', 'i-cal': 'cal', 'i-fin': 'fin',
    'i-goal': 'goal', 'i-doc': 'doc', 'i-chart': 'chart', 'i-set': 'set', 'i-bell': 'bell', 'i-clock': 'clock', 'i-book': 'book'
  };
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('lv-on', e.isIntersecting && !reduce); });
  }, { rootMargin: '60px' }) : null;

  function mount(u) {
    var id = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace('#', '');
    var k = KEY[id]; if (!k || u._lv) return; u._lv = 1;
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', '100%'); s.setAttribute('height', '100%');
    s.setAttribute('class', 'lv lv-' + k); s.setAttribute('overflow', 'visible'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'none'); s.setAttribute('focusable', 'false');
    s.innerHTML = I[k];
    u.parentNode.replaceChild(s, u);
    if (io) io.observe(s); else if (!reduce) s.classList.add('lv-on');
  }
  var queued = 0;
  function scan(root) {
    var list = (root || document).querySelectorAll('svg use');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }
  function later() { if (queued) return; queued = 1; requestAnimationFrame(function () { queued = 0; scan(); }); }
  scan();
  if ('MutationObserver' in window) new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  window.LiveIcons = { scan: scan, keys: Object.keys(I), svg: function (k) { return '<svg class="lv lv-' + k + ' lv-on" viewBox="0 0 100 100" fill="none" stroke="none" aria-hidden="true">' + I[k] + '</svg>'; } };
})();
