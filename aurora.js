/* MyOffice — aurora.js : tiga tirai aurora realistis yang muncul dari sisi langit.
   Meniru aurora asli: garis dasar bergelombang (lipatan tirai) yang merambat pelan,
   sinar-sinar halus naik dari tepi bawah yang terang (putih-hijau -> hijau -> teal -> ungu di ujung),
   terang di sisi asal lalu memudar (perspektif), dan kecerahan yang berdenyut tak beraturan.
   Makin jauh dari tepi, lipatannya makin "berkibar". Di belakang bintang. */
(function () {
  'use strict';
  var host = document.querySelector('.bg .stack'); if (!host) return;
  var root = document.documentElement, TAU = 6.2832, SP = 128;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;display:block';
  host.style.isolation = 'isolate'; host.insertBefore(cv, host.firstChild);

  /* sprite gradasi vertikal: atas (ujung sinar) -> bawah (tepi dasar yang terang) */
  function sprite(top, mid, base) {
    var s = document.createElement('canvas'); s.width = 1; s.height = SP;
    var g = s.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, SP);
    gr.addColorStop(0, 'rgba(' + top + ',0)'); gr.addColorStop(.24, 'rgba(' + top + ',.22)');
    gr.addColorStop(.58, 'rgba(' + mid + ',.55)'); gr.addColorStop(.90, 'rgba(' + base + ',1)'); gr.addColorStop(1, 'rgba(' + base + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 1, SP); return s;
  }
  var SPR = {
    green: sprite('150,112,224', '84,226,152', '178,255,214'),
    teal: sprite('120,150,232', '84,208,196', '170,250,226'),
    rose: sprite('214,120,176', '96,224,168', '184,255,210')
  };
  /* side: -1 muncul dari kiri, 1 dari kanan | len = jangkauan (pecahan lebar) | y0 di tepi, y1 di ujung (pecahan tinggi) */
  var CU = [
    { side: -1, len: .60, y0: .52, y1: .30, hm: .36, spr: SPR.green, a: .80, f: [1.3, 2.9], v: [.34, .22], A: [.040, .018], ph: 0,   dl: 0 },
    { side: 1,  len: .46, y0: .44, y1: .24, hm: .30, spr: SPR.rose,  a: .66, f: [1.1, 2.4], v: [.28, .40], A: [.036, .016], ph: 2.7, dl: 1.8 },
    { side: -1, len: .38, y0: .70, y1: .52, hm: .20, spr: SPR.teal,  a: .52, f: [1.6, 3.4], v: [.40, .26], A: [.030, .014], ph: 5.1, dl: 3.4 }
  ];
  var w = 0, h = 0, t = 40, raf = 0, last = 0, t0 = 0;

  function size() {
    var r = host.getBoundingClientRect();
    w = Math.max(320, Math.min(900, Math.round(r.width / 2))); h = Math.max(180, Math.round(w * r.height / Math.max(1, r.width)));
    cv.width = w; cv.height = h; draw(99);
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function curtain(c, ts) {
    var grow = reduce ? 1 : ease((ts - c.dl) / 4.5); if (grow <= 0) return;
    var L = w * c.len * (.6 + .4 * grow), step = 2, edge = c.side < 0 ? 0 : w;
    var breath = .72 + .28 * Math.sin(t * .13 + c.ph) * Math.sin(t * .047 + c.ph * .6 + 1);     /* denyut lambat tak beraturan */
    function base(s) {                                                                          /* garis dasar: lipatan merambat, makin liar ke ujung */
      var amp = .35 + .95 * s;
      return h * (c.y0 + (c.y1 - c.y0) * ease(s) + amp * (c.A[0] * Math.sin(s * c.f[0] * TAU - t * c.v[0] + c.ph) + c.A[1] * Math.sin(s * c.f[1] * TAU + t * c.v[1] + c.ph * 1.9)));
    }
    cx.globalAlpha = 1;
    for (var d = 0; d < L; d += step) {
      var s = d / L, x = edge + c.side * -d;
      x = c.side < 0 ? d : w - d;
      var yb = base(s), slope = Math.abs(base(Math.min(1, s + .012)) - base(Math.max(0, s - .012))) / (.024 * h);
      var fold = 1 + Math.min(1.1, slope * 5);                                                  /* lipatan yang dilihat dari samping tampak lebih terang */
      var env = Math.pow(1 - s, .85) * ease(s * 14 + .15);                                      /* terang di sisi asal, memudar ke ujung */
      var patch = .5 + .5 * Math.sin(s * 3.3 * TAU + t * .21 + c.ph * 2.2);                     /* gumpalan terang yang bergeser */
      var ray = .78 + .14 * Math.sin(d * .55 + t * .6 + c.ph) + .08 * Math.sin(d * 1.7 - t * .9);   /* sinar halus, tidak seragam */
      var k = .30 + .70 * Math.pow(patch, 1.3);
      var al = c.a * env * k * ray * breath * Math.min(1.5, fold) * (reduce ? 1 : ease(grow * 1.4));
      if (al < .012) continue;
      var hg = h * c.hm * (.42 + .58 * k) * (1 - .4 * s) * (.8 + .2 * ray);
      cx.globalAlpha = Math.min(.92, al);
      cx.drawImage(c.spr, 0, 0, 1, SP, x, yb - hg, step + .8, hg * 1.1);
    }
    /* kabut tipis di sisi asal supaya tirai terasa menyatu dengan langit */
    var g = cx.createLinearGradient(edge, 0, edge + (c.side < 0 ? 1 : -1) * L * .8, 0), a = .055 * c.a * breath;
    g.addColorStop(0, 'rgba(110,230,170,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(110,230,170,0)');
    cx.globalAlpha = 1; cx.fillStyle = g; cx.fillRect(c.side < 0 ? 0 : w - L, h * (c.y1 - c.hm), L, h * (c.y0 - c.y1 + c.hm * 1.2));
  }
  function draw(ts) {
    cx.clearRect(0, 0, w, h); cx.globalCompositeOperation = 'lighter';
    var n = root.dataset.lite === '1' ? 2 : CU.length;
    for (var i = 0; i < n; i++) curtain(CU[i], ts);
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
