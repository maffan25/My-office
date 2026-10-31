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
    var pix = false;
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

  /* ================= Bounce saat diklik: semua tombol & elemen yang bisa diklik =================
     Memakai Web Animations (composite:add) sehingga tidak bentrok dengan transform/animasi CSS lain
     dan tetap jalan di jendela modul. Elemen kecil memantul lebih kuat, kartu besar lebih halus. */
  var HIT = 'button,a[href],summary,label,input[type=checkbox],input[type=radio],input[type=range],input[type=color],input[type=file],input[type=submit],[role=button],[role=tab],[role=switch],[role=checkbox],[role=menuitem],[role=option],.nav a,.chip,.wall,.ac-btn,.ac-tab,.ac-x';
  var SKIP = '.ac-ov,.ad-ov,.ac-win,.ad-win,.app,main,[data-nobounce]';
  function okSize(n) { var r = n.getBoundingClientRect(); return r.width && r.width <= 700 && r.height <= 420; }
  function hitOf(n) {
    if (!n || n.nodeType !== 1) return null;
    var h = n.closest(HIT);                                   /* tombol/tautan terdekat */
    if (!h || h.matches(SKIP) || h.disabled || h.getAttribute('aria-disabled') === 'true') h = null;
    if (h) return okSize(h) ? h : null;
    var best = null;                                          /* elemen lain yang berkursor pointer (kartu, hari kalender, dst.) */
    for (var i = 0; n && n.nodeType === 1 && n !== document.body && i < 8; i++, n = n.parentElement) {
      if (n.matches(SKIP)) break;
      if (getComputedStyle(n).cursor === 'pointer') best = n; else if (best) break;
    }
    return best && okSize(best) ? best : null;
  }
  /* Modul menggambar ulang isinya saat diklik: cari padanan elemen yang sama di DOM baru */
  function sig(el) {
    var cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(function (c) { return c && !/^(bnc|on|open|sel|active)$/.test(c); });
    var base = el.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : ''), txt = (el.textContent || '').trim();
    var root = el.closest('.ac-ov,.ad-ov,.wo-ov,.es-ov,.fn-ov,.fn-app,.app') || document;
    function list(r) {
      try { return [].filter.call(r.querySelectorAll(base), function (n) { return !txt || (n.textContent || '').trim() === txt; }); } catch (x) { return []; }
    }
    var i = list(root).indexOf(el);
    return i < 0 ? null : { root: root, list: list, i: i };
  }
  function bounce(el) {
    if (!el.animate) return;
    var r = el.getBoundingClientRect(), big = r.width > 260 || r.height > 90, nav = el.matches('.nav a');
    var s = big ? [.975, 1.012] : [.88, 1.07], ty = nav ? [2, -4] : [0, 0];
    function f(o, sc, y) { return { offset: o, transform: 'translateY(' + y + 'px) scale(' + sc + ')', easing: 'ease-in-out' }; }
    if (el.__bnc) el.__bnc.cancel();
    var an = el.__bnc = el.animate([f(0, 1, 0), f(.28, s[0], ty[0]), f(.62, s[1], ty[1]), f(1, 1, 0)], { duration: 420, composite: 'add' });
    an.onfinish = an.oncancel = function () { if (el.__bnc === an) el.__bnc = null; };
  }
  document.addEventListener('click', function (e) {
    if (reduce) return;
    var t = hitOf(e.target); if (!t) return;
    var g = sig(t); bounce(t);
    if (g) [30, 100].forEach(function (d) {
      setTimeout(function () {
        if (t.isConnected || g.done) return;
        var r = g.root.isConnected ? g.root : document, n = g.list(r)[g.i];
        if (n && n !== t) { g.done = 1; bounce(n); }
      }, d);
    });
  }, true);

  var lb = $('liteBtn');
  if (lb) { lb.setAttribute('aria-checked', lite === '1'); lb.addEventListener('click', function () { setLite(lite !== '1', true); }); }

  select();
})();
