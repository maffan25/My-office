/* MyOffice — aurora.js : pita aurora halus yang masuk dari sisi layar.
   Pita melengkung dan bergelombang pelan, terang di tepi tempatnya muncul lalu memudar
   ke arah tengah (hijau -> teal -> ungu pucat). Kanvas beresolusi rendah agar ringan
   dan otomatis lembut; berada di belakang bintang. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement, TAU = 6.2832, PI = Math.PI;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block';
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild);

  var G = [96, 228, 168], T = [80, 196, 208], V = [172, 142, 232];
  /* dir: 1 = dari kiri, -1 = dari kanan. y0/rise/len/th = pecahan tinggi/lebar kanvas. */
  var RB = [
    { dir: 1,  y0: .58, rise: .46, len: .92, th: .20, c: [G, T, V], a: 1,   k: [1.0, 2.2], A: [.050, .022], sp: [.20, .13], ph: 0,   dl: 0 },
    { dir: 1,  y0: .72, rise: .34, len: .78, th: .12, c: [T, V, V], a: .75, k: [1.4, 2.9], A: [.040, .020], sp: [.16, .21], ph: 2.3, dl: 1.4 },
    { dir: -1, y0: .46, rise: .30, len: .70, th: .15, c: [G, T, V], a: .85, k: [1.2, 2.5], A: [.045, .020], sp: [.18, .12], ph: 4.1, dl: 2.6 }
  ];
  var N = 44, w = 0, h = 0, t = 30, raf = 0, last = 0, t0 = 0;

  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(100, Math.min(560, Math.round(r.width / 3.5))); h = Math.max(60, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; draw();
  }
  function col(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function ribbon(r, ts) {
    var grow = reduce ? 1 : ease((ts - r.dl) / 5), breathe = .84 + .16 * Math.sin(t * .09 + r.ph);
    if (grow <= 0) return;
    var L = w * r.len * grow * breathe, sx = r.dir > 0 ? -w * .04 : w * 1.04, P = [], i, s;
    for (i = 0; i <= N; i++) {
      s = i / N;
      var wav = r.A[0] * Math.sin(s * r.k[0] * TAU + t * r.sp[0] + r.ph) + r.A[1] * Math.sin(s * r.k[1] * TAU - t * r.sp[1] + r.ph * 1.7);
      P.push([sx + r.dir * s * L, h * (r.y0 - r.rise * Math.pow(s, 1.15) * grow + wav * (.4 + s))]);
    }
    /* tepi atas & bawah pita dari titik tengah + normal */
    var up = [], dn = [];
    for (i = 0; i <= N; i++) {
      s = i / N;
      var a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / m, ny = dx / m, th = h * r.th * (.45 + .55 * Math.pow(Math.sin(PI * Math.min(1, s * .85 + .08)), .8)) * (.82 + .18 * Math.sin(s * 8 + t * .5 + r.ph)) * grow;
      up.push([P[i][0] + nx * th / 2, P[i][1] + ny * th / 2]); dn.push([P[i][0] - nx * th / 2, P[i][1] - ny * th / 2]);
    }
    var x1 = sx, x2 = sx + r.dir * L, y1 = P[0][1], y2 = P[N][1], al = .9 * r.a * ease(grow * 1.6);
    var gr = cx.createLinearGradient(x1, y1, x2, y2);
    gr.addColorStop(0, col(r.c[0], 0)); gr.addColorStop(.1, col(r.c[0], al)); gr.addColorStop(.5, col(r.c[1], al * .72)); gr.addColorStop(.85, col(r.c[2], al * .34)); gr.addColorStop(1, col(r.c[2], 0));
    cx.fillStyle = gr;
    for (var j = 0; j < 5; j++) {                    /* lapisan menyempit = inti terang, tepi lembut */
      var k = 1 - j * .19; cx.globalAlpha = .27;
      cx.beginPath();
      for (i = 0; i <= N; i++) { var px = P[i][0] + (up[i][0] - P[i][0]) * k, py = P[i][1] + (up[i][1] - P[i][1]) * k; if (i) cx.lineTo(px, py); else cx.moveTo(px, py); }
      for (i = N; i >= 0; i--) cx.lineTo(P[i][0] + (dn[i][0] - P[i][0]) * k, P[i][1] + (dn[i][1] - P[i][1]) * k);
      cx.closePath(); cx.fill();
    }
    /* cahaya lembut di tepi tempat pita muncul */
    var gx = sx + r.dir * w * .06, gl = cx.createRadialGradient(gx, P[0][1], 0, gx, P[0][1], w * .3);
    gl.addColorStop(0, col(r.c[0], .13 * al)); gl.addColorStop(1, col(r.c[0], 0));
    cx.globalAlpha = 1; cx.fillStyle = gl; cx.fillRect(0, 0, w, h);
  }
  function draw(ts) {
    ts = ts == null ? 99 : ts;
    cx.clearRect(0, 0, w, h); cx.globalCompositeOperation = 'lighter';
    var n = root.dataset.lite === '1' ? 2 : RB.length;
    for (var i = 0; i < n; i++) ribbon(RB[i], ts);
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
