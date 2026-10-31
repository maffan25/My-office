/* MyOffice — aurora.js : aurora realistis, tiga tirai dari sisi langit.
   - Garis dasar tirai digerakkan noise halus (bukan sinus berulang): lipatan merambat tak beraturan.
   - Sinar-sinar tipis dari noise, miring menyatu ke satu arah (perspektif korona), tepi bawah terang.
   - Warna fisik: putih-hijau di dasar, hijau 557 nm di badan, teal lalu ungu/merah muda di ujung.
   - Kecerahan berdenyut + "badai" kecerahan sesekali + kelip halus.
   - Pendaran (bloom) lembut di sekeliling cahaya. Di belakang bintang. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement, SP = 160;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function mk(css) { var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block;' + css; return c; }
  var cv = mk(''), cx = cv.getContext('2d'), bv = mk('filter:blur(10px);opacity:.75;'), bx = bv.getContext('2d');
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild); host.insertBefore(bv, host.firstChild);

  /* ---- noise nilai 1D/2D (halus, deterministik) ---- */
  function hs(n) { n = Math.sin(n) * 43758.5453; return n - Math.floor(n); }
  function h2(x, y) { return hs(x * 127.1 + y * 311.7); }
  function n2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* ---- sprite sinar: ujung (atas) -> tepi dasar terang (bawah) ---- */
  function sprite(stops) {
    var s = document.createElement('canvas'); s.width = 1; s.height = SP;
    var g = s.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, SP);
    stops.forEach(function (p) { gr.addColorStop(p[0], 'rgba(' + p[1] + ',' + p[2] + ')'); });
    g.fillStyle = gr; g.fillRect(0, 0, 1, SP); return s;
  }
  var SPR = {
    green: sprite([[0, '150,96,206', 0], [.14, '160,96,206', .10], [.34, '90,196,196', .22], [.56, '84,232,156', .46], [.78, '110,250,170', .72], [.92, '200,255,228', 1], [1, '200,255,228', 0]]),
    rose: sprite([[0, '224,110,170', 0], [.14, '220,110,172', .13], [.34, '120,170,214', .20], [.56, '90,228,160', .44], [.78, '120,250,176', .70], [.92, '206,255,230', 1], [1, '206,255,230', 0]]),
    teal: sprite([[0, '120,140,230', 0], [.16, '130,136,230', .10], [.38, '80,200,210', .24], [.60, '90,236,190', .46], [.80, '130,252,206', .70], [.92, '212,255,238', 1], [1, '212,255,238', 0]])
  };
  /* side: -1 dari kiri, 1 dari kanan | len = jangkauan (pecahan lebar) | y0 di tepi, y1 di ujung | hm = tinggi sinar */
  var CU = [
    { side: -1, len: .62, y0: .54, y1: .30, hm: .40, spr: SPR.green, a: .78, f: [1.25, 2.6], v: [.20, .30], A: [.060, .030], ph: 1.3, dl: 0 },
    { side: 1,  len: .48, y0: .46, y1: .22, hm: .34, spr: SPR.rose,  a: .62, f: [1.05, 2.2], v: [.17, .26], A: [.055, .028], ph: 6.8, dl: 2.2 },
    { side: -1, len: .40, y0: .72, y1: .50, hm: .24, spr: SPR.teal,  a: .50, f: [1.5, 3.0],  v: [.24, .18], A: [.045, .024], ph: 11.4, dl: 4.2 }
  ];
  var w = 0, h = 0, bw = 0, bh = 0, t = 60, raf = 0, last = 0, t0 = 0;

  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(320, Math.min(640, Math.round(r.width / 2.2))); h = Math.max(180, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; bw = Math.round(w / 4); bh = Math.round(h / 4); bv.width = bw; bv.height = bh; draw(99);
  }

  function curtain(c, ts, step) {
    var grow = reduce ? 1 : ease((ts - c.dl) / 5); if (grow <= 0) return;
    var L = w * c.len * (.55 + .45 * grow), dir = c.side < 0 ? 1 : -1, prev = null;
    var breath = .70 + .30 * Math.sin(t * .12 + c.ph) * Math.sin(t * .041 + c.ph * .7 + 1);
    var surge = 1 + .55 * Math.pow(Math.max(0, Math.sin(t * .065 + c.ph * 1.3)), 8);               /* "badai" kecerahan sesekali */
    for (var d = 0; d < L; d += step) {
      var s = d / L, x = c.side < 0 ? d : w - d, g = .4 + 1.1 * s;                                  /* makin jauh dari tepi, makin bergoyang */
      var disp = (n2(s * c.f[0] * 2 - t * c.v[0] + c.ph, c.ph) - .5) * 2 * c.A[0] * g + (n2(s * c.f[1] * 3 + t * c.v[1], c.ph + 9) - .5) * 2 * c.A[1] * g;
      var yb = h * (c.y0 + (c.y1 - c.y0) * ease(s) + disp);
      var slope = prev == null ? 0 : Math.abs(yb - prev) / step; prev = yb;
      var fold = 1 + Math.min(1, slope * 2.4);                                                      /* lipatan tampak dari samping lebih terang */
      var env = Math.pow(1 - s, .9) * ease(d / (L * .07) + .15);
      var patch = ease((n2(s * 3.4 + t * .05 + c.ph, c.ph * 2 + t * .018) - .25) * 1.7);            /* gumpalan terang yang bergeser */
      var k = .22 + .78 * patch;
      var r = n2(d * .45 + c.ph, t * .38) * .6 + n2(d * 1.35 + 7, t * .9) * .4;                     /* sinar tipis tak seragam */
      var ray = .42 + .85 * r, flick = .93 + .07 * Math.sin(t * 6.5 + d * .31 + c.ph);
      var al = c.a * env * k * ray * breath * fold * surge * flick * (reduce ? 1 : ease(grow * 1.4));
      if (al < .012) continue;
      var hg = h * c.hm * (.38 + .62 * k) * (1 - .35 * s) * (.72 + .4 * r);
      var lean = -dir * (.08 + .30 * s);                                                            /* sinar miring menyatu (korona) */
      cx.globalAlpha = Math.min(.95, al);
      cx.setTransform(1, 0, lean, 1, x, yb);
      cx.drawImage(c.spr, 0, 0, 1, SP, 0, -hg, step + .7, hg * 1.09);
    }
    cx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function draw(ts) {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, w, h); cx.globalCompositeOperation = 'lighter';
    var lite = root.dataset.lite === '1', n = lite ? 2 : CU.length, step = lite ? 2 : 1;
    for (var i = 0; i < n; i++) curtain(CU[i], ts, step);
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    if (lite) { bv.style.display = 'none'; } else { bv.style.display = 'block'; bx.clearRect(0, 0, bw, bh); bx.drawImage(cv, 0, 0, bw, bh); }   /* pendaran: salinan kecil yang dikaburkan */
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = 0; return; }
    if (!t0) t0 = now; if (!last) last = now;
    if (now - last < (root.dataset.lite === '1' ? 66 : 33)) return;
    t += Math.min(.1, (now - last) / 1000); last = now; draw((now - t0) / 1000);
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(host); else addEventListener('resize', size);
  size();
  if (!reduce) raf = requestAnimationFrame(loop);
})();
