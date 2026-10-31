/* MyOffice — aurora.js : tiga pita aurora kecil sebagai hiasan di pinggir langit.
   Satu pita = satu bentuk halus (tanpa garis/sinar), redup, berkibar pelan seperti kain sutra tipis
   yang menempel di tepi layar: gelombang merambat ke ujung, makin bergoyang di ujungnya.
   Hijau lembut -> teal -> ungu pucat. Di belakang bintang. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement, TAU = 6.2832, N = 40;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block;filter:blur(2.5px)';
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild);

  var G = [112, 214, 172], T = [100, 190, 204], V = [162, 142, 212];
  /* side: -1 kiri / 1 kanan | y = posisi di tepi (pecahan tinggi) | len = panjang (pecahan lebar) | th = tebal (pecahan tinggi)
     amp = besar kibaran | k = jumlah gelombang | sp = kecepatan | a = kekuatan (kecil = redup) */
  var R = [
    { side: -1, y: .34, len: .17, th: .052, amp: .030, k: 1.35, sp: .95, rise: -.045, c: [G, T, V], a: .42, ph: 0.4, dl: 0 },
    { side: 1,  y: .24, len: .14, th: .042, amp: .026, k: 1.60, sp: 1.10, rise: -.030, c: [T, G, V], a: .36, ph: 2.9, dl: 1.6 },
    { side: -1, y: .64, len: .12, th: .036, amp: .024, k: 1.50, sp: .85, rise: -.025, c: [G, T, T], a: .30, ph: 5.2, dl: 3.2 }
  ];
  var w = 0, h = 0, t = 20, raf = 0, last = 0, t0 = 0;

  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(320, Math.min(900, Math.round(r.width / 1.6))); h = Math.max(180, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; draw(99);
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, a).toFixed(3) + ')'; }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function ribbon(r, ts) {
    var grow = reduce ? 1 : ease((ts - r.dl) / 5); if (grow <= 0) return;
    var dir = -r.side, ax = r.side < 0 ? -3 : w + 3, ay = r.y * h, L = w * r.len * grow;
    var breath = .78 + .22 * Math.sin(t * .22 + r.ph), P = [], U = [], D = [], i, s;
    for (i = 0; i <= N; i++) {
      s = i / N;
      /* kibaran kain: gelombang merambat ke ujung + sedikit gelombang kedua yang lebih lambat */
      var fl = (Math.sin(s * r.k * TAU - t * r.sp + r.ph) + .35 * Math.sin(s * r.k * 2.1 * TAU - t * r.sp * .6 + r.ph * 1.7)) * r.amp * h * Math.pow(s, 1.15);
      P.push([ax + dir * s * L, ay + fl + r.rise * h * s * s]);
    }
    for (i = 0; i <= N; i++) {
      s = i / N;
      var a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.sqrt(dx * dx + dy * dy) || 1;
      var th = h * r.th * Math.pow(Math.sin(Math.PI * Math.min(1, .5 + s * .5)), .9) * (1 - .15 * s) * grow;      /* tebal halus, ujung membulat meruncing */
      U.push([P[i][0] - dy / m * th / 2, P[i][1] + dx / m * th / 2]); D.push([P[i][0] + dy / m * th / 2, P[i][1] - dx / m * th / 2]);
    }
    var tip = P[N], al = r.a * breath * ease(grow * 1.5);
    var gr = cx.createLinearGradient(ax, ay, tip[0], tip[1]);
    gr.addColorStop(0, rgba(r.c[0], al)); gr.addColorStop(.5, rgba(r.c[1], al * .8)); gr.addColorStop(1, rgba(r.c[2], 0));
    cx.fillStyle = gr;
    [[2.0, .22], [1.0, .55], [.45, .35]].forEach(function (p) {                  /* halo tipis, badan, inti lembut */
      cx.globalAlpha = p[1]; cx.beginPath();
      for (i = 0; i <= N; i++) { var x = P[i][0] + (U[i][0] - P[i][0]) * p[0], y = P[i][1] + (U[i][1] - P[i][1]) * p[0]; if (i) cx.lineTo(x, y); else cx.moveTo(x, y); }
      for (i = N; i >= 0; i--) cx.lineTo(P[i][0] + (D[i][0] - P[i][0]) * p[0], P[i][1] + (D[i][1] - P[i][1]) * p[0]);
      cx.closePath(); cx.fill();
    });
  }
  function draw(ts) {
    cx.clearRect(0, 0, w, h); cx.globalCompositeOperation = 'lighter';
    var n = root.dataset.lite === '1' ? 2 : R.length;
    for (var i = 0; i < n; i++) ribbon(R[i], ts);
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
