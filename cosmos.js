/* =====================================================================
   COSMOS v2 — manajer latar (Angkasa / Pixel), sapaan glitch, bounce klik.
   Ringan: sprite dipra-render, 30 fps (20 fps di mode hemat), berhenti
   saat tab tersembunyi atau jendela modul terbuka. Tanpa dependensi.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var TAU = Math.PI * 2;
  var S = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };
  var MO = window.MyOffice = window.MyOffice || {};

  /* ================= Mode hemat ================= */
  var lite = S.get('mo-lite');
  if (lite === null) lite = ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) ? '1' : '0';
  function setLite(v, save) {
    lite = v ? '1' : '0'; root.dataset.lite = lite;
    if (save) S.set('mo-lite', lite);
    var b = $('liteBtn'); if (b) b.setAttribute('aria-checked', lite === '1');
    if (cur && cur.resize) cur.resize();          // jumlah bintang menyesuaikan
  }
  root.dataset.lite = lite;

  /* ================= Manajer engine ================= */
  var cv = $('cosmos'), ctx = cv && cv.getContext('2d');
  var engines = {}, cur = null, curName = '', raf = 0, last = 0, slow = 0, nFrames = 0;
  MO.cosmos = {
    register: function (name, eng) { engines[name] = eng; if (root.dataset.wall === name) select(); },
    cv: cv, ctx: ctx, reduce: reduce, rand: rand, TAU: TAU,
    isLite: function () { return lite === '1'; },
    setLite: setLite
  };

  function paused() { return document.hidden || document.body.style.overflow === 'hidden'; }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!cur || paused()) { last = now; return; }
    var step = lite === '1' ? 50 : 33;
    if (now - last < step - 2) return;
    var dt = Math.min(.06, (now - last) / 1000); last = now;
    var t0 = performance.now();
    cur.frame(now, dt);
    // pengaman: jika perangkat lambat, otomatis pindah ke mode hemat
    if (lite !== '1') {
      var cost = performance.now() - t0;
      slow += cost > 14 ? 1 : -1; if (slow < 0) slow = 0;
      if (++nFrames > 90 && slow > 60) setLite(true, false);
    }
  }

  function select() {
    var name = root.dataset.wall, e = engines[name] || null;
    if (e === cur) return;
    if (cur && cur.stop) cur.stop();
    cur = e; curName = name;
    if (!cv) return;
    cv.classList.remove('ready', 'px');
    if (cur) {
      cur.start();
      if (reduce) cur.frame(performance.now(), 0);
      requestAnimationFrame(function () { cv.classList.add('ready'); });
    }
  }
  if (cv) {
    new MutationObserver(select).observe(root, { attributes: true, attributeFilter: ['data-wall'] });
    var rt; window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { if (cur && cur.resize) { cur.resize(); if (reduce) cur.frame(performance.now(), 0); } }, 160);
    });
    if (!reduce) raf = requestAnimationFrame(loop);
  }

  /* ================= Engine: Angkasa ================= */
  var Stars = (function () {
    var W = 0, H = 0, far, mid, sprites = [], near = [], twink = [], meteors = [], flares = [];
    var ox = [0, 0], oy = [0, 0], px = 0, py = 0, tx = 0, ty = 0, nextMeteor = 0, tm = 0;
    var fx = null, fxA = null, fxB = null;          // lapisan bintang statis digerakkan CSS (GPU), bukan JS per frame
    var COLORS = ['255,255,255', '255,255,255', '190,212,255', '160,190,255', '255,226,196'];

    function glow(c, r) {                         // sprite halo bintang, dibuat sekali
      var d = Math.ceil(r * 8), o = document.createElement('canvas'); o.width = o.height = d;
      var x = o.getContext('2d'), g = x.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
      g.addColorStop(0, 'rgba(' + c + ',1)'); g.addColorStop(.22, 'rgba(' + c + ',.4)'); g.addColorStop(1, 'rgba(' + c + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, d, d); return o;
    }
    function layer(n, rmin, rmax, aMin, aMax) {   // satu kanvas penuh berisi bintang statis
      var o = document.createElement('canvas'); o.width = W; o.height = H; var x = o.getContext('2d');
      for (var i = 0; i < n; i++) {
        var r = rand(rmin, rmax);
        x.fillStyle = 'rgba(' + COLORS[(Math.random() * COLORS.length) | 0] + ',' + rand(aMin, aMax).toFixed(2) + ')';
        x.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, r, r);
      }
      return o;
    }
    function build() {
      var k = Math.min(1.4, Math.max(.5, W * H / 1.3e6)) * (lite === '1' ? .55 : 1);
      far = layer(520 * k, .8, 1.1, .25, .7);
      mid = layer(150 * k, 1, 2, .4, .9);
      sprites = COLORS.slice(0, 5).map(function (c) { return glow(c, 3); });
      near = []; twink = [];
      var nn = Math.round(36 * k), nt = Math.round(26 * k), i;
      for (i = 0; i < nn; i++) near.push({ x: Math.random() * W, y: Math.random() * H, s: sprites[(Math.random() * 5) | 0], z: rand(.5, 1.1), p: rand(0, TAU), f: rand(.6, 2), flare: Math.random() < .25 });
      for (i = 0; i < nt; i++) twink.push({ x: Math.random() * W, y: Math.random() * H, s: sprites[(Math.random() * 5) | 0], z: rand(.3, .55), p: rand(0, TAU), f: rand(.8, 2.4) });
    }
    function wrap(cls) {
      var w = document.createElement('div'), i = document.createElement('i');
      w.className = 'sf-wrap'; i.className = 'sf ' + cls; w.appendChild(i);
      return { w: w, s: i, u: '' };
    }
    function paint(o, canvas) {
      if (!canvas.toBlob) { o.s.style.backgroundImage = 'url("' + canvas.toDataURL() + '")'; return; }
      canvas.toBlob(function (b) {
        if (!b) return;
        var u = URL.createObjectURL(b), old = o.u; o.u = u;
        o.s.style.backgroundImage = 'url("' + u + '")';
        if (old) URL.revokeObjectURL(old);
      });
    }
    function mount() {
      if (!fx) {
        fx = document.createElement('div'); fx.id = 'starfx'; fx.setAttribute('aria-hidden', 'true');
        fxA = wrap('sf-far'); fxB = wrap('sf-mid'); fx.appendChild(fxA.w); fx.appendChild(fxB.w);
        cv.parentNode.insertBefore(fx, cv);
      }
      fx.style.display = '';
      fx.style.setProperty('--W', W + 'px'); fx.style.setProperty('--H', H + 'px');
      paint(fxA, far); paint(fxB, mid);
    }
    function size() {
      W = window.innerWidth; H = window.innerHeight; cv.width = W; cv.height = H;
      cv.style.cssText = 'left:0;top:0;width:100%;height:100%;transform:none';
      build(); mount();
    }
    function tile(o, x, y) {                       // geser + bungkus layer statis
      x = ((x % W) + W) % W; y = ((y % H) + H) % H;
      ctx.drawImage(o, -x, -y); ctx.drawImage(o, W - x, -y); ctx.drawImage(o, -x, H - y); ctx.drawImage(o, W - x, H - y);
    }
    function spawn(big) {
      var ang = rand(.42, .78), top = Math.random() < .6, sp = big ? rand(1100, 1500) : rand(750, 1250);
      meteors.push({ x: top ? rand(W * .25, W * 1.05) : W + 40, y: top ? -30 : rand(0, H * .45),
        vx: -Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: big ? rand(260, 380) : rand(110, 240),
        w: big ? rand(2.2, 3) : rand(1.1, 1.9), life: 0, max: big ? 1.5 : rand(.9, 1.4),
        hue: Math.random() < .5 ? '170,235,255' : '255,255,255' });
    }
    function onMove(e) { tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2; }

    function frame(now, dt) {
      px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);
      tm = now / 1000;
      ctx.clearRect(0, 0, W, H);
      ox[0] += 2.2 * dt; oy[0] -= .5 * dt; ox[1] += 5.5 * dt; oy[1] -= 1.2 * dt;
      if (fxA) {                                    // paralaks pointer: hanya transform (compositor), tanpa gambar ulang
        fxA.w.style.transform = 'translate3d(' + (-px * 5).toFixed(1) + 'px,' + (-py * 3).toFixed(1) + 'px,0)';
        fxB.w.style.transform = 'translate3d(' + (-px * 13).toFixed(1) + 'px,' + (-py * 8).toFixed(1) + 'px,0)';
      }
      var i, s, a, x, y;
      for (i = 0; i < twink.length; i++) {
        s = twink[i]; a = .35 + .65 * Math.abs(Math.sin(tm * s.f + s.p));
        x = ((s.x - ox[1] - px * 13 * s.z) % W + W) % W; y = ((s.y + oy[1] * -1 - py * 8 * s.z) % H + H) % H;
        ctx.globalAlpha = a * .8; ctx.drawImage(s.s, x - 12, y - 12, 24, 24);
      }
      for (i = 0; i < near.length; i++) {
        s = near[i]; a = .55 + .45 * Math.sin(tm * s.f + s.p);
        x = ((s.x - ox[1] * 1.8 * s.z - px * 24 * s.z) % W + W) % W; y = ((s.y + oy[1] * -1.8 * s.z - py * 14 * s.z) % H + H) % H;
        ctx.globalAlpha = a; ctx.drawImage(s.s, x - 12 * s.z * 1.4, y - 12 * s.z * 1.4, 24 * s.z * 1.4, 24 * s.z * 1.4);
        if (s.flare) {
          var l = 5 + 4 * a; ctx.globalAlpha = a * .5; ctx.strokeStyle = '#fff'; ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.moveTo(x, y - l); ctx.lineTo(x, y + l); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // bintang jatuh
      if (now > nextMeteor) {
        spawn(Math.random() < .22);
        if (Math.random() < .18 && lite !== '1') setTimeout(function () { spawn(false); }, rand(120, 380));
        nextMeteor = now + rand(1800, 5200) * (lite === '1' ? 1.5 : 1);
      }
      for (var m = meteors.length - 1; m >= 0; m--) {
        var o = meteors[m]; o.life += dt; o.x += o.vx * dt; o.y += o.vy * dt;
        var k = o.life / o.max;
        if (k >= 1 || o.x < -o.len || o.y > H + o.len) { meteors.splice(m, 1); continue; }
        var f = k < .12 ? k / .12 : 1 - Math.pow((k - .12) / .88, 1.6), sp = Math.hypot(o.vx, o.vy);
        var x2 = o.x - o.vx / sp * o.len, y2 = o.y - o.vy / sp * o.len;
        var g = ctx.createLinearGradient(o.x, o.y, x2, y2);
        g.addColorStop(0, 'rgba(' + o.hue + ',' + f.toFixed(2) + ')'); g.addColorStop(.35, 'rgba(120,170,255,' + (f * .45).toFixed(2) + ')'); g.addColorStop(1, 'rgba(120,120,255,0)');
        ctx.lineCap = 'round'; ctx.strokeStyle = g; ctx.lineWidth = o.w;
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = f; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x, o.y, o.w * 1.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    return {
      start: function () { size(); meteors = []; nextMeteor = performance.now() + 1400; window.addEventListener('pointermove', onMove, { passive: true }); },
      stop: function () { window.removeEventListener('pointermove', onMove); meteors = []; if (fx) fx.style.display = 'none'; },
      resize: size, frame: frame
    };
  })();
  MO.cosmos.register('angkasa', Stars);

  /* ================= Sapaan glitch ================= */
  var gl = $('glitch'), greet = $('greet'), src = $('hiName'), dotsBox = $('greetDots');
  var GLYPH = '!<>-_\\/[]{}=+*^?#%&01';
  var idx = -1, current = '', busy = false, holdTimer = 0, dots = [];

  function dayWord() {
    var h = new Date().getHours();
    return h < 4 ? 'Selamat dini hari' : h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function phrases() {
    var raw = (src && src.textContent || 'Assalamu’alaikum,').trim().replace(/,\s*$/, '');
    var m = raw.match(/^Assalamu’alaikum,?\s*(.*)$/), name = m ? m[1].trim() : '';
    var pix = root.dataset.wall === 'pixel';
    return [raw, 'Semangat hari ini!', dayWord() + (name ? ', ' + name : ''),
      pix ? 'Ayo lari, jangan lompat sendiri' : 'Siap meluncur?', 'Selamat datang di MyOffice', 'Plan · Execute · Achieve'];
  }
  function setText(t) { gl.textContent = t; gl.setAttribute('data-text', t); }

  function scramble(to, done) {
    if (reduce) { setText(to); current = to; return done && done(); }
    busy = true;
    var from = current, len = Math.max(from.length, to.length), t0 = performance.now(), dur = 600 + len * 8, lastDraw = 0;
    gl.classList.add('on'); greet.classList.remove('scan'); void greet.offsetWidth; greet.classList.add('scan');
    (function step(now) {
      if (now - lastDraw < 42 && now - t0 < dur) return requestAnimationFrame(step);   // ±24 gambar/detik cukup
      lastDraw = now;
      var p = Math.min(1, (now - t0) / dur), out = '';
      for (var i = 0; i < len; i++) {
        var b = to.charAt(i), lock = (i / len) * .8 + .1;
        if (p >= lock + .12) out += b;
        else if (b === ' ' && from.charAt(i) === ' ') out += ' ';
        else out += GLYPH.charAt((Math.random() * GLYPH.length) | 0);
      }
      if (p > .9) out = out.slice(0, to.length);
      setText(out);
      if (p < 1) requestAnimationFrame(step);
      else { setText(to); current = to; busy = false; setTimeout(function () { gl.classList.remove('on'); }, 140); done && done(); }
    })(t0);
  }
  function mark(i) { dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); }
  function next() {
    clearTimeout(holdTimer);
    var list = phrases();
    if (dots.length !== list.length && dotsBox) {
      dotsBox.innerHTML = ''; dots = list.map(function () { var d = document.createElement('i'); dotsBox.appendChild(d); return d; });
    }
    idx = (idx + 1) % list.length; mark(idx);
    scramble(list[idx], function () { holdTimer = setTimeout(next, 3800); });
  }
  function micro() {                               // glitch kilat sesekali saat teks ditahan
    setTimeout(micro, rand(4000, 8000));
    if (reduce || lite === '1' || busy || document.hidden || paused()) return;
    gl.classList.add('on'); setTimeout(function () { if (!busy) gl.classList.remove('on'); }, 180);
  }
  if (gl && greet) {
    greet.addEventListener('click', function () { if (!busy) next(); });
    setTimeout(function () { current = ''; next(); setTimeout(micro, 3000); }, 380);
  }

  /* ================= Bounce ringan saat diklik ================= */
  var HIT = 'button,.nav a,.chip,.wall,.ac-btn,.ac-tab,.ac-x,[role=button],[role=tab],[role=switch]';
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest(HIT);
    if (!t || reduce) return;
    t.classList.remove('bnc'); void t.offsetWidth; t.classList.add('bnc');
    setTimeout(function () { t.classList.remove('bnc'); }, 460);
  }, true);

  var lb = $('liteBtn');
  if (lb) { lb.setAttribute('aria-checked', lite === '1'); lb.addEventListener('click', function () { setLite(lite !== '1', true); }); }

  select();
})();
