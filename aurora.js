/* MyOffice — aurora.js : tirai aurora lembut di belakang bintang.
   Tiga tirai (hijau, teal, ungu pucat) bergelombang pelan, digambar di kanvas
   beresolusi rendah (ringan) lalu diperhalus oleh peskalaan browser. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement, TAU = 6.2832;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block;opacity:0;transition:opacity 2.5s ease';
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild);

  /* y/amp/hgt = pecahan tinggi kanvas; f = jumlah gelombang; s = kecepatan; a = kekuatan */
  var CUR = [
    { y: .30, amp: .07, hgt: .44, col: [96, 226, 170], a: .50, f: [1.7, 4.3], s: [.16, .10], ph: 0 },
    { y: .24, amp: .06, hgt: .38, col: [84, 190, 200], a: .34, f: [1.3, 3.6], s: [.12, .18], ph: 2.1 },
    { y: .34, amp: .08, hgt: .30, col: [166, 136, 226], a: .22, f: [2.2, 5.1], s: [.09, .15], ph: 4.2 }
  ];
  CUR.forEach(function (c) {                       /* sprite gradasi vertikal 1x64 per warna */
    var s = document.createElement('canvas'); s.width = 1; s.height = 64;
    var g = s.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64), k = c.col.join(',');
    gr.addColorStop(0, 'rgba(' + k + ',0)'); gr.addColorStop(.55, 'rgba(' + k + ',.55)'); gr.addColorStop(.86, 'rgba(' + k + ',1)'); gr.addColorStop(1, 'rgba(' + k + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 1, 64); c.spr = s;
  });

  var w = 0, h = 0, t = 38, raf = 0, last = 0, started = false;
  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(80, Math.min(520, Math.round(r.width / 4))); h = Math.max(50, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; draw();
  }
  function draw() {
    cx.clearRect(0, 0, w, h);
    var lite = root.dataset.lite === '1', n = lite ? 2 : CUR.length, step = lite ? 3 : 2;
    cx.globalCompositeOperation = 'lighter';
    /* cahaya dasar yang lembut di balik tirai */
    var gl = cx.createRadialGradient(w * .5, h * .3, 0, w * .5, h * .3, w * .6), br = .06 + .03 * Math.sin(t * .12);
    gl.addColorStop(0, 'rgba(90,200,170,' + br.toFixed(3) + ')'); gl.addColorStop(1, 'rgba(90,200,170,0)');
    cx.globalAlpha = 1; cx.fillStyle = gl; cx.fillRect(0, 0, w, h);
    for (var i = 0; i < n; i++) {
      var c = CUR[i], breath = .65 + .35 * Math.sin(t * .11 + c.ph);
      for (var x = 0; x < w; x += step) {
        var u = x / w;
        var wave = Math.sin(u * c.f[0] * TAU + t * c.s[0] + c.ph) * .6 + Math.sin(u * c.f[1] * TAU - t * c.s[1] + c.ph * 1.7) * .4;
        var k = .5 + .5 * Math.sin(u * c.f[1] * 2.3 * TAU + t * c.s[1] * 1.7 + c.ph);
        var ray = .7 + .3 * Math.sin(x * .9 + c.ph + t * .5);
        var edge = Math.pow(Math.sin(Math.PI * u), .6);
        var al = c.a * Math.pow(k, 1.5) * ray * breath * edge;
        if (al < .01) continue;
        var base = h * (c.y + c.amp * wave), hg = h * c.hgt * (.7 + .5 * k);
        cx.globalAlpha = al; cx.drawImage(c.spr, 0, 0, 1, 64, x, base - hg, step, hg * 1.12);
      }
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    if (!started) { started = true; cv.style.opacity = '1'; }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = 0; return; }
    var gap = root.dataset.lite === '1' ? 66 : 33;
    if (!last) last = now;
    if (now - last < gap) return;
    t += Math.min(.1, (now - last) / 1000); last = now; draw();
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(host); else addEventListener('resize', size);
  size();
  if (!reduce) raf = requestAnimationFrame(loop);
})();
