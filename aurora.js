/* MyOffice — aurora.js : cahaya aurora kabur yang menyebar dari tepi layar.
   Tanpa garis atau bentuk tegas: hanya gumpalan cahaya lembut (hijau, teal, ungu pucat)
   yang bergeser dan "bernapas" pelan di sisi kiri & kanan, di belakang bintang.
   Kanvas beresolusi rendah supaya ringan dan otomatis halus. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block';
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild);

  var G = [100, 226, 170], T = [84, 196, 210], V = [170, 142, 230];
  /* side: -1 kiri, 1 kanan | y,r = pecahan tinggi | reach = seberapa jauh masuk (pecahan lebar) | a = kekuatan */
  var B = [
    { side: -1, y: .22, r: .55, reach: .22, c: G, a: .34, sp: .07, ph: 0 },
    { side: -1, y: .52, r: .62, reach: .30, c: T, a: .26, sp: .05, ph: 1.8 },
    { side: -1, y: .82, r: .50, reach: .20, c: V, a: .22, sp: .06, ph: 3.4 },
    { side: 1,  y: .30, r: .58, reach: .26, c: T, a: .28, sp: .06, ph: 2.6 },
    { side: 1,  y: .64, r: .56, reach: .24, c: V, a: .24, sp: .05, ph: 4.4 },
    { side: 1,  y: .10, r: .45, reach: .18, c: G, a: .20, sp: .08, ph: 5.5 }
  ];
  var w = 0, h = 0, t = 20, raf = 0, last = 0, t0 = 0;

  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(80, Math.min(400, Math.round(r.width / 5))); h = Math.max(50, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; draw(99);
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function draw(ts) {
    cx.clearRect(0, 0, w, h); cx.globalCompositeOperation = 'lighter';
    var fade = reduce ? 1 : Math.min(1, ts / 4), n = root.dataset.lite === '1' ? 3 : B.length;
    for (var i = 0; i < n; i++) {
      var b = B[i], s = Math.sin(t * b.sp + b.ph), s2 = Math.sin(t * b.sp * 1.4 + b.ph * 2.1);
      var inward = w * b.reach * (.55 + .45 * s);                       /* seberapa jauh cahaya masuk dari tepi */
      var x = b.side < 0 ? -w * .04 + inward * .35 : w * 1.04 - inward * .35;
      var y = h * (b.y + .07 * s2), R = h * b.r * (1 + .12 * s2);
      var al = b.a * (.62 + .38 * Math.sin(t * .1 + b.ph)) * fade;
      cx.save(); cx.translate(x, y); cx.scale(Math.max(.4, w * b.reach * 1.6 / R), 1);   /* lonjong: menyebar ke dalam */
      var g = cx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, rgba(b.c, al)); g.addColorStop(.4, rgba(b.c, al * .5)); g.addColorStop(.75, rgba(b.c, al * .14)); g.addColorStop(1, rgba(b.c, 0));
      cx.fillStyle = g; cx.fillRect(-R * 3, -R, R * 6, R * 2); cx.restore();
    }
    cx.globalCompositeOperation = 'source-over';
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = 0; return; }
    if (!t0) t0 = now; if (!last) last = now;
    if (now - last < (root.dataset.lite === '1' ? 100 : 50)) return;   /* gerakan lambat: 20 fps sudah mulus */
    t += Math.min(.15, (now - last) / 1000); last = now; draw((now - t0) / 1000);
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(host); else addEventListener('resize', size);
  size();
  if (!reduce) raf = requestAnimationFrame(loop);
})();
