/* =====================================================================
   COSMOS — bintang bergerak + bintang jatuh, sapaan glitch bergantian,
   percikan & cincin saat klik. Tanpa dependensi.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var TAU = Math.PI * 2;

  /* ================= 1. LATAR BINTANG ================= */
  var cv = $('cosmos'), ctx = cv && cv.getContext('2d');
  var W = 0, H = 0, dpr = 1, layers = [], meteors = [], flares = [];
  var px = 0, py = 0, tx = 0, ty = 0;       // parallax pointer (smoothed / target)
  var last = 0, nextMeteor = 0, raf = 0;
  var COLORS = ['255,255,255', '255,255,255', '190,212,255', '160,190,255', '255,226,196'];

  function isOn() { return root.dataset.wall === 'angkasa'; }

  function seed() {
    var area = W * H, k = Math.min(1.4, Math.max(.5, area / 1.3e6));
    // depth: makin besar = makin dekat (bergerak lebih cepat & lebih besar)
    var spec = [
      { n: 520 * k, s: [.35, .9],  v: 2.2, depth: .25, a: [.25, .7] },
      { n: 190 * k, s: [.7, 1.4],  v: 5.5, depth: .6,  a: [.4, .9] },
      { n: 55 * k,  s: [1.2, 2.2], v: 11,  depth: 1.1, a: [.6, 1]  }
    ];
    layers = spec.map(function (L, li) {
      var stars = [];
      for (var i = 0; i < L.n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: rand(L.s[0], L.s[1]), a: rand(L.a[0], L.a[1]),
          c: COLORS[(Math.random() * COLORS.length) | 0],
          p: rand(0, TAU), f: rand(.6, 2.4),
          flare: li === 2 && Math.random() < .22
        });
      }
      return { stars: stars, v: L.v, depth: L.depth };
    });
  }

  function resize() {
    if (!cv) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduce) drawStatic();
  }

  function spawnMeteor(big) {
    // muncul dari sisi atas/kanan, melesat diagonal ke kiri-bawah
    var ang = rand(.42, .78);                      // sudut turun (rad) dari horizontal
    var fromTop = Math.random() < .6;
    var x = fromTop ? rand(W * .25, W * 1.05) : W + 40;
    var y = fromTop ? -30 : rand(0, H * .45);
    var sp = big ? rand(1100, 1500) : rand(750, 1250);
    meteors.push({
      x: x, y: y, vx: -Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      len: big ? rand(260, 380) : rand(110, 240),
      w: big ? rand(2.2, 3) : rand(1.1, 1.9),
      life: 0, max: big ? 1.5 : rand(.9, 1.4),
      hue: Math.random() < .5 ? '170,235,255' : '255,255,255'
    });
  }

  function drawStar(s, ox, oy, t, L) {
    var x = s.x + ox, y = s.y + oy;
    var tw = .62 + .38 * Math.sin(t * s.f + s.p);
    var al = s.a * tw;
    if (s.r < 1) {
      ctx.fillStyle = 'rgba(' + s.c + ',' + al.toFixed(3) + ')';
      ctx.fillRect(x, y, s.r * 1.6, s.r * 1.6);
      return;
    }
    // halo lembut + inti
    var g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4.2);
    g.addColorStop(0, 'rgba(' + s.c + ',' + al.toFixed(3) + ')');
    g.addColorStop(.25, 'rgba(' + s.c + ',' + (al * .35).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + s.c + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s.r * 4.2, 0, TAU); ctx.fill();
    if (s.flare) {
      var l = s.r * (6 + 3 * tw);
      ctx.strokeStyle = 'rgba(' + s.c + ',' + (al * .55).toFixed(3) + ')';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
      ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
      ctx.stroke();
    }
  }

  function wrap(v, max) { return v < 0 ? v + max : v >= max ? v - max : v; }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!isOn() || document.hidden) { last = now; return; }
    var dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    var t = now / 1000;
    px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);

    ctx.clearRect(0, 0, W, H);
    for (var li = 0; li < layers.length; li++) {
      var L = layers[li], sx = px * L.depth * -22, sy = py * L.depth * -14;
      for (var i = 0; i < L.stars.length; i++) {
        var s = L.stars[i];
        // drift perlahan: ke kiri dan sedikit turun, lapis dekat lebih cepat
        s.x = wrap(s.x - L.v * dt, W); s.y = wrap(s.y + L.v * .22 * dt, H);
        drawStar(s, sx, sy, t, L);
      }
    }

    // bintang jatuh
    if (now > nextMeteor) {
      var burst = Math.random() < .18;
      spawnMeteor(Math.random() < .22);
      if (burst) setTimeout(function () { if (isOn()) spawnMeteor(false); }, rand(120, 380));
      nextMeteor = now + rand(1800, 5200);
    }
    for (var m = meteors.length - 1; m >= 0; m--) {
      var o = meteors[m];
      o.life += dt; o.x += o.vx * dt; o.y += o.vy * dt;
      var k = o.life / o.max;
      if (k >= 1 || o.x < -o.len || o.y > H + o.len) { meteors.splice(m, 1); continue; }
      var fade = k < .12 ? k / .12 : 1 - Math.pow((k - .12) / .88, 1.6);
      var sp = Math.hypot(o.vx, o.vy), ux = o.vx / sp, uy = o.vy / sp;
      var tx2 = o.x - ux * o.len, ty2 = o.y - uy * o.len;
      var gr = ctx.createLinearGradient(o.x, o.y, tx2, ty2);
      gr.addColorStop(0, 'rgba(' + o.hue + ',' + (fade).toFixed(3) + ')');
      gr.addColorStop(.35, 'rgba(120,170,255,' + (fade * .45).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(120,120,255,0)');
      ctx.lineCap = 'round'; ctx.strokeStyle = gr; ctx.lineWidth = o.w;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tx2, ty2); ctx.stroke();
      // kepala bercahaya
      var hg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.w * 7);
      hg.addColorStop(0, 'rgba(255,255,255,' + fade.toFixed(3) + ')');
      hg.addColorStop(.4, 'rgba(' + o.hue + ',' + (fade * .35).toFixed(3) + ')');
      hg.addColorStop(1, 'rgba(' + o.hue + ',0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(o.x, o.y, o.w * 7, 0, TAU); ctx.fill();
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    layers.forEach(function (L) { L.stars.forEach(function (s) { drawStar(s, 0, 0, 0, L); }); });
  }

  if (cv) {
    resize();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    if (!reduce) {
      window.addEventListener('pointermove', function (e) {
        tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2;
      }, { passive: true });
      nextMeteor = performance.now() + 1400;   // bintang jatuh pertama muncul cepat
      raf = requestAnimationFrame(frame);
    }
    requestAnimationFrame(function () { cv.classList.add('ready'); });
  }

  /* ================= 2. SAPAAN GLITCH ================= */
  var gl = $('glitch'), greet = $('greet'), src = $('hiName'), dotsBox = $('greetDots');
  var GLYPH = '!<>-_\\/[]{}=+*^?#%&01';
  var idx = -1, current = '', busy = false, holdTimer = 0, microTimer = 0, dots = [];

  function dayWord() {
    var h = new Date().getHours();
    return h < 4 ? 'Selamat dini hari' : h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function phrases() {
    var raw = (src && src.textContent || 'Assalamu’alaikum,').trim().replace(/,\s*$/, '');
    var m = raw.match(/^Assalamu’alaikum,?\s*(.*)$/);
    var name = m ? m[1].trim() : '';
    return [
      raw,
      'Semangat hari ini!',
      dayWord() + (name ? ', ' + name : ''),
      'Siap meluncur?',
      'Selamat datang di MyOffice',
      'Plan · Execute · Achieve'
    ];
  }

  function setText(t) { gl.textContent = t; gl.setAttribute('data-text', t); }

  function scramble(to, done) {
    if (reduce) { setText(to); current = to; return done && done(); }
    busy = true;
    var from = current, len = Math.max(from.length, to.length), t0 = performance.now(), dur = 650 + len * 9;
    gl.classList.add('on'); greet.classList.remove('scan'); void greet.offsetWidth; greet.classList.add('scan');
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), out = '';
      for (var i = 0; i < len; i++) {
        var a = from.charAt(i), b = to.charAt(i);
        var lock = (i / len) * .8 + .1;              // huruf kiri selesai lebih dulu
        if (p >= lock + .12) out += b;
        else if (b === ' ' && a === ' ') out += ' ';
        else out += GLYPH.charAt((Math.random() * GLYPH.length) | 0);
      }
      // jangan biarkan panjang string melebihi target saat hampir selesai
      if (p > .9) out = out.slice(0, to.length);
      setText(out);
      if (p < 1) requestAnimationFrame(step);
      else {
        setText(to); current = to; busy = false;
        setTimeout(function () { gl.classList.remove('on'); }, 160);
        done && done();
      }
    })(t0);
  }

  function mark(i) { dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); }

  function next() {
    clearTimeout(holdTimer);
    var list = phrases();
    if (dots.length !== list.length && dotsBox) {
      dotsBox.innerHTML = ''; dots = list.map(function () { var d = document.createElement('i'); dotsBox.appendChild(d); return d; });
    }
    idx = (idx + 1) % list.length;
    mark(idx);
    scramble(list[idx], function () { holdTimer = setTimeout(next, 3600); });
  }

  // glitch mikro acak saat teks sedang ditahan
  function micro() {
    microTimer = setTimeout(micro, rand(1400, 3400));
    if (reduce || busy || document.hidden) return;
    gl.classList.add('on');
    setTimeout(function () { if (!busy) gl.classList.remove('on'); }, rand(130, 260));
  }

  if (gl && greet) {
    // sinkronkan sapaan bila Settings mengubah nama panggilan
    if (src && window.MutationObserver) new MutationObserver(function () { /* diambil saat giliran berikutnya */ })
      .observe(src, { childList: true, characterData: true, subtree: true });
    greet.addEventListener('click', function () { if (!busy) next(); });
    setTimeout(function () {
      current = '';
      next();
      if (!reduce) microTimer = setTimeout(micro, 2600);
    }, 380);                                        // beri waktu settings.js menerapkan nama
  }

  /* ================= 3. KLIK: CINCIN + PERCIKAN ================= */
  var fx = $('fx'), fctx = fx && fx.getContext('2d'), sparks = [], fxOn = false, fw = 0, fh = 0, fdpr = 1;
  function fxResize() {
    fdpr = Math.min(window.devicePixelRatio || 1, 2); fw = innerWidth; fh = innerHeight;
    fx.width = fw * fdpr; fx.height = fh * fdpr; fctx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
  }
  if (fx) { fxResize(); window.addEventListener('resize', fxResize); }

  var SPARK_COLORS = ['75,232,255', '255,79,216', '155,123,255', '255,255,255'];
  function burst(x, y) {
    if (reduce || !fx) return;
    var n = 26;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU + rand(-.2, .2), v = rand(90, 330);
      sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(.45, .95),
        r: rand(1, 2.8), c: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0], star: Math.random() < .4 });
    }
    for (var r = 0; r < 2; r++) {
      var ring = document.createElement('i'); ring.className = 'ring' + (r ? ' b' : '');
      ring.style.left = x + 'px'; ring.style.top = y + 'px';
      document.body.appendChild(ring);
      setTimeout(function (el) { el.remove(); }.bind(null, ring), 1100);
    }
    if (!fxOn) { fxOn = true; lastFx = performance.now(); requestAnimationFrame(fxFrame); }
  }
  var lastFx = 0;
  function fxFrame(now) {
    var dt = Math.min(.05, (now - lastFx) / 1000); lastFx = now;
    fctx.clearRect(0, 0, fw, fh);
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i]; s.life += dt;
      if (s.life >= s.max) { sparks.splice(i, 1); continue; }
      var k = s.life / s.max, drag = Math.pow(.02, dt);
      s.vx *= drag; s.vy = s.vy * drag + 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      var al = 1 - k, r = s.r * (1 - k * .5);
      fctx.fillStyle = 'rgba(' + s.c + ',' + al.toFixed(3) + ')';
      fctx.shadowColor = 'rgba(' + s.c + ',.9)'; fctx.shadowBlur = 8;
      if (s.star) {
        fctx.beginPath();
        fctx.moveTo(s.x, s.y - r * 3); fctx.lineTo(s.x + r * .7, s.y - r * .7); fctx.lineTo(s.x + r * 3, s.y);
        fctx.lineTo(s.x + r * .7, s.y + r * .7); fctx.lineTo(s.x, s.y + r * 3); fctx.lineTo(s.x - r * .7, s.y + r * .7);
        fctx.lineTo(s.x - r * 3, s.y); fctx.lineTo(s.x - r * .7, s.y - r * .7); fctx.closePath(); fctx.fill();
      } else { fctx.beginPath(); fctx.arc(s.x, s.y, r, 0, TAU); fctx.fill(); }
    }
    fctx.shadowBlur = 0;
    if (sparks.length) requestAnimationFrame(fxFrame);
    else { fxOn = false; fctx.clearRect(0, 0, fw, fh); }
  }

  var HIT = 'button,.nav a,.chip,.wall,.ac-btn,.ac-tab,.ac-x,[role=button],[role=tab]';
  // capture: tetap jalan walau handler modul memanggil stopPropagation()
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest(HIT);
    if (!t) return;
    var x = e.clientX, y = e.clientY;
    if (!x && !y) { var b = t.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2; } // klik via keyboard
    burst(x, y);
    var cls = t.matches('.nav a') || t.matches('.tools button') || t.matches('.chip,.wall,.ac-btn,.ac-tab') ? 'fire' : '';
    if (cls) {
      t.classList.remove(cls); void t.offsetWidth; t.classList.add(cls);
      setTimeout(function () { t.classList.remove(cls); }, 700);
    }
  }, true);
})();
