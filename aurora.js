/* MyOffice — aurora.js : rumbai aurora kecil-kecil yang berkibar seperti bendera.
   Puluhan pita mungil menempel di pinggir kiri & kanan layar, ujungnya meruncing
   dan berkibar bergelombang tertiup angin (hijau -> teal -> ungu pucat).
   Ada embusan angin pelan yang membuat kibarannya naik-turun. Di belakang bintang. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement, TAU = 6.2832, N = 26;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block';
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild);

  var G = [104, 232, 172], T = [86, 200, 214], V = [176, 148, 236];
  var SCH = [[G, T, V], [G, T, T], [T, V, V], [G, G, T]];
  /* deretan bendera: nilai acak tetap (deterministik) agar tata letaknya stabil */
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var F = [];
  [-1, 1].forEach(function (side) {
    var n = 9;
    for (var i = 0; i < n; i++) F.push({
      side: side, y: (i + .5 + (rnd() - .5) * .7) / n,            /* posisi menempel di tepi (pecahan tinggi) */
      len: .07 + rnd() * .12,                                      /* panjang (pecahan lebar) */
      th: .016 + rnd() * .026,                                     /* lebar pangkal (pecahan tinggi) */
      amp: .010 + rnd() * .022, k: 1.1 + rnd() * 1.3, sp: 1.5 + rnd() * 1.3, ph: rnd() * TAU,
      lift: (rnd() - .6) * .05, c: SCH[Math.floor(rnd() * SCH.length)], a: .55 + rnd() * .4, dl: rnd() * 2.6
    });
  });
  var w = 0, h = 0, t = 12, raf = 0, last = 0, t0 = 0;

  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(240, Math.min(1100, Math.round(r.width / 1.5))); h = Math.max(140, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; draw(99);
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, a).toFixed(3) + ')'; }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function flag(f, ts, wind) {
    var grow = reduce ? 1 : ease((ts - f.dl) / 2.4); if (grow <= 0) return;
    var dir = -f.side, ax = f.side < 0 ? -2 : w + 2, ay = f.y * h, L = w * f.len * grow * (.92 + .08 * wind);
    var P = [], U = [], D = [], i, s;
    for (i = 0; i <= N; i++) {
      s = i / N;
      var fl = Math.sin(s * f.k * TAU - t * f.sp + f.ph) * f.amp * h * Math.pow(s, 1.1) * (.7 + .6 * wind);   /* kibaran: makin kuat ke ujung */
      P.push([ax - dir * -s * L * 1, ay + fl + f.lift * h * s * s]);
    }
    for (i = 0; i <= N; i++) {
      s = i / N;
      var a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / m, ny = dx / m, th = h * f.th * Math.pow(1 - s, .85) * (.9 + .1 * Math.sin(s * 9 - t * 2 + f.ph)) * grow;
      U.push([P[i][0] + nx * th / 2, P[i][1] + ny * th / 2]); D.push([P[i][0] - nx * th / 2, P[i][1] - ny * th / 2]);
    }
    var tip = P[N], al = f.a * ease(grow * 1.5);
    var gr = cx.createLinearGradient(ax, ay, tip[0], tip[1]);
    gr.addColorStop(0, rgba(f.c[0], al)); gr.addColorStop(.5, rgba(f.c[1], al * .8)); gr.addColorStop(1, rgba(f.c[2], 0));
    cx.fillStyle = gr;
    [[1.9, .13], [1, .36], [.42, .5]].forEach(function (p) {         /* halo lebar, badan, inti terang */
      cx.globalAlpha = p[1]; cx.beginPath();
      for (i = 0; i <= N; i++) { var x = P[i][0] + (U[i][0] - P[i][0]) * p[0], y = P[i][1] + (U[i][1] - P[i][1]) * p[0]; if (i) cx.lineTo(x, y); else cx.moveTo(x, y); }
      for (i = N; i >= 0; i--) cx.lineTo(P[i][0] + (D[i][0] - P[i][0]) * p[0], P[i][1] + (D[i][1] - P[i][1]) * p[0]);
      cx.closePath(); cx.fill();
    });
  }
  function draw(ts) {
    cx.clearRect(0, 0, w, h); cx.globalCompositeOperation = 'lighter';
    var wind = .5 + .5 * Math.sin(t * .35) * Math.sin(t * .13 + 1), lite = root.dataset.lite === '1';
    for (var i = 0; i < F.length; i++) { if (lite && i % 2) continue; flag(F[i], ts, wind); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
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
