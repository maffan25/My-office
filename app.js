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
    if (!cur) { raf = 0; return; }                 // tanpa engine: hentikan loop (hemat CPU)
    raf = requestAnimationFrame(loop);
    if (paused()) { last = now; return; }
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
      if (!raf && !reduce) raf = requestAnimationFrame(loop);
      if (reduce) cur.frame(performance.now(), 0);
      requestAnimationFrame(function () { cv.classList.add('ready'); });
    }
  }
  if (cv) {
    new MutationObserver(select).observe(root, { attributes: true, attributeFilter: ['data-wall'] });
    var rt; window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { if (cur && cur.resize) { cur.resize(); if (reduce) cur.frame(performance.now(), 0); } }, 160);
    });
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

  /* Efek klik (tekan + riak + pantul) ditangani fx.js — duplikat di sini dihapus. */

  var lb = $('liteBtn');
  if (lb) { lb.setAttribute('aria-checked', lite === '1'); lb.addEventListener('click', function () { setLite(lite !== '1', true); }); }

  select();
})();
;
/* =====================================================================
   HUD — Pencarian cepat (Ctrl/Cmd+K atau "/") dan panel Pengingat.
   Membaca data nyata dari localStorage semua modul. Dimuat sebelum
   academic.js supaya klik tombol Cari/Notifikasi tidak jatuh ke
   toast "Coming soon" lama.
   ===================================================================== */
(function () {
  'use strict';
  var MO = window.MyOffice = window.MyOffice || {}; MO.routes = MO.routes || {};
  var $ = function (id) { return document.getElementById(id); };
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var cut = function (v, n) { return String(v || '').slice(0, n); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addD(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function diffD(a, b) { return Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5); }
  function fmt(s) { try { return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); } catch (e) { return s; } }
  var DONE = /^(Selesai|Done|Tercapai)$/, CANC = /^(Dibatalkan|Archived)$/;

  /* ---------- Kumpulkan data dari semua modul ---------- */
  function gather() {
    var out = [], A = ls('mo-acad-v1'), W = ls('mo-work-v1'), O = ls('mo-org-v1'), P = ls('mo-proj-v1'), T = ls('mo-task-v1'), G = ls('mo-goal-v1'), Cal = ls('mo-cal-v1');
    var put = function (mod, route, title, status, due) { if (title) out.push({ mod: mod, route: route, title: String(title), status: status || '', due: cut(due, 10) }); };
    (T.task || []).forEach(function (t) { put('Task', '#task', t.title, t.status, t.due); });
    (A.task || []).forEach(function (t) { put('Tugas kuliah', '#academic', t.title, t.status, t.deadline); });
    (A.course || []).forEach(function (c) { put('Mata kuliah', '#academic', c.name, '', ''); });
    (A.exam || []).forEach(function (e) {
      var c = (A.course || []).filter(function (x) { return x.id === e.courseId; })[0], done = e.score !== '' && e.score != null;
      put('Ujian', '#academic', (e.type || 'Ujian') + (c ? ' — ' + c.name : ''), done ? 'Selesai' : 'Belum', e.date);
    });
    (W.job || []).forEach(function (j) { put('Pekerjaan', '#work', j.title, j.status, j.deadline); });
    (W.wtask || []).forEach(function (t) { put('Tugas kerja', '#work', t.title, t.status, t.deadline); });
    (O.followup || []).forEach(function (f) { put('Organisasi', '#organization', f.task, f.status, f.due); });
    (P.proj || []).forEach(function (p) { put('Proyek', '#project', p.name, p.status, p.target); });
    (P.ptask || []).forEach(function (t) { put('Tugas proyek', '#project', t.title, t.status, t.due); });
    (G.goal || []).forEach(function (g) { put('Goal', '#goal', g.name, g.status, g.deadline); });
    (Cal.ev || []).forEach(function (e) { put('Kalender', '#calendar', e.title, '', e.start); });
    return out;
  }
  function open_(route) { if (MO.routes[route]) MO.routes[route](); else if (MO.msg) MO.msg('Menu', 'Belum tersedia'); }

  var navItems = function () {
    return [].map.call(document.querySelectorAll('.nav a'), function (a) {
      var u = a.querySelector('use');
      return { title: a.textContent.replace(/\s+/g, ' ').trim(), route: a.getAttribute('href'), icon: u ? u.getAttribute('href') : '#i-doc' };
    });
  };
  var svg = function (id) { return '<svg class="ic" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="' + id + '"/></svg>'; };

  /* ================= Pencarian ================= */
  var ov, input, list, sel = 0, rows = [], prevOverflow = '';
  function buildSearch() {
    ov = document.createElement('div'); ov.className = 'sp-ov'; ov.hidden = true;
    ov.innerHTML = '<div class="sp" role="dialog" aria-modal="true" aria-label="Pencarian">' +
      '<div class="sp-in">' + svg('#i-search') + '<input type="text" id="spIn" placeholder="Cari menu, tugas, proyek, goal…" autocomplete="off" spellcheck="false" aria-label="Cari"><kbd>Esc</kbd></div>' +
      '<div class="sp-list" id="spList" role="listbox"></div>' +
      '<div class="sp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span><kbd>Esc</kbd> tutup</span></div></div>';
    document.body.appendChild(ov);
    input = ov.querySelector('input'); list = ov.querySelector('.sp-list');
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeSearch(); });
    input.addEventListener('input', function () { sel = 0; render(); });
    list.addEventListener('mousemove', function (e) { var r = e.target.closest('.sp-r'); if (r) { sel = +r.dataset.i; paint(); } });
    list.addEventListener('click', function (e) { var r = e.target.closest('.sp-r'); if (r) pick(+r.dataset.i); });
  }
  function mark(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.split(/\s+/)[0]);
    if (i < 0 || !q.split(/\s+/)[0]) return esc(text);
    var L = q.split(/\s+/)[0].length;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + L)) + '</mark>' + esc(text.slice(i + L));
  }
  function render() {
    var q = input.value.trim().toLowerCase(), toks = q ? q.split(/\s+/) : [], td = ymd(new Date());
    var menu = navItems().filter(function (m) { var h = m.title.toLowerCase(); return toks.every(function (t) { return h.indexOf(t) >= 0; }); });
    var data = gather(), hit;
    if (toks.length) {
      hit = data.filter(function (d) { var h = (d.title + ' ' + d.mod).toLowerCase(); return toks.every(function (t) { return h.indexOf(t) >= 0; }); })
        .sort(function (a, b) { return (a.title.toLowerCase().indexOf(toks[0]) === 0 ? 0 : 1) - (b.title.toLowerCase().indexOf(toks[0]) === 0 ? 0 : 1); });
    } else {                                           // kosong: tampilkan yang paling mendesak
      hit = data.filter(function (d) { return d.due && d.due >= td && !DONE.test(d.status) && !CANC.test(d.status); })
        .sort(function (a, b) { return a.due.localeCompare(b.due); });
    }
    hit = hit.slice(0, 8);
    rows = menu.slice(0, toks.length ? 6 : 11).map(function (m) { return { g: 'Menu', title: m.title, sub: '', route: m.route, icon: m.icon }; })
      .concat(hit.map(function (d) { return { g: toks.length ? 'Data' : 'Mendatang', title: d.title, sub: d.mod + (d.due ? ' · ' + fmt(d.due) : '') + (d.status ? ' · ' + d.status : ''), route: d.route, icon: '#i-task' }; }));
    var html = '', lastG = '';
    if (!rows.length) html = '<div class="sp-empty">Tidak ada hasil untuk “' + esc(input.value.trim()) + '”.<small>Coba kata kunci lain, misalnya nama tugas atau modul.</small></div>';
    rows.forEach(function (r, i) {
      if (r.g !== lastG) { html += '<div class="sp-g">' + r.g + '</div>'; lastG = r.g; }
      html += '<button type="button" class="sp-r" role="option" data-i="' + i + '" style="--i:' + i + '">' + svg(r.icon) +
        '<span class="sp-t"><b>' + mark(r.title, q) + '</b>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span><i class="sp-go" aria-hidden="true">Buka</i></button>';
    });
    list.innerHTML = html; paint();
  }
  function paint() {
    [].forEach.call(list.querySelectorAll('.sp-r'), function (r) {
      var on = +r.dataset.i === sel; r.classList.toggle('on', on); r.setAttribute('aria-selected', on);
      if (on) { var t = r.offsetTop, b = t + r.offsetHeight; if (t < list.scrollTop) list.scrollTop = t - 30; else if (b > list.scrollTop + list.clientHeight) list.scrollTop = b - list.clientHeight + 8; }
    });
  }
  function pick(i) { var r = rows[i]; if (!r) return; closeSearch(); setTimeout(function () { open_(r.route); }, 60); }
  function openSearch() {
    closeNotif(); if (!ov) buildSearch();
    prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ov.hidden = false; input.value = ''; sel = 0; render(); input.focus();
  }
  function closeSearch() { if (!ov || ov.hidden) return; ov.hidden = true; document.body.style.overflow = prevOverflow; }

  /* ================= Pengingat ================= */
  var np, npOpen = false;
  function buildNotif() {
    np = document.createElement('section'); np.className = 'np'; np.hidden = true; np.setAttribute('role', 'dialog'); np.setAttribute('aria-label', 'Pengingat');
    np.innerHTML = '<header><div><b>Pengingat</b><small id="npSub"></small></div></header><div class="np-body" id="npBody"></div>' +
      '<footer><button type="button" class="np-all">Buka status semua kegiatan</button></footer>';
    document.body.appendChild(np);
    np.addEventListener('click', function (e) {
      var it = e.target.closest('.np-i'); if (it) { var r = it.dataset.r; closeNotif(); setTimeout(function () { open_(r); }, 60); return; }
      if (e.target.closest('.np-all')) { closeNotif(); setTimeout(function () { open_('#settings'); }, 60); }
    });
  }
  function groups() {
    var td = ymd(new Date()), lim = addD(td, 3), L = [], T = [], S = [];
    gather().forEach(function (d) {
      if (!d.due || DONE.test(d.status) || CANC.test(d.status) || d.mod === 'Mata kuliah') return;
      if (d.due < td) L.push(d); else if (d.due === td) T.push(d); else if (d.due <= lim) S.push(d);
    });
    var by = function (a, b) { return a.due.localeCompare(b.due); };
    return { late: L.sort(by), today: T, soon: S.sort(by), td: td };
  }
  function rel(d, td) { var n = diffD(d, td); return n < 0 ? 'Terlambat ' + (-n) + ' hari' : n === 0 ? 'Hari ini' : n === 1 ? 'Besok' : n + ' hari lagi'; }
  function renderNotif() {
    var g = groups(), total = g.late.length + g.today.length + g.soon.length, i = 0, html = '';
    $('npSub').textContent = total ? total + ' perlu perhatian' : 'Semua terkendali';
    [['late', 'Lewat tenggat', g.late], ['today', 'Hari ini', g.today], ['soon', '3 hari ke depan', g.soon]].forEach(function (s) {
      if (!s[2].length) return;
      html += '<div class="np-g ' + s[0] + '">' + s[1] + '<i>' + s[2].length + '</i></div>';
      s[2].forEach(function (d) {
        html += '<button type="button" class="np-i ' + s[0] + '" data-r="' + esc(d.route) + '" style="--i:' + (i++) + '"><span class="np-bar"></span><span class="np-t"><b>' + esc(d.title) + '</b><small>' + esc(d.mod) + ' · ' + fmt(d.due) + '</small></span><em>' + rel(d.due, g.td) + '</em></button>';
      });
    });
    if (!total) html = '<div class="np-empty"><b>Tidak ada tenggat mendesak</b><small>Tugas, ujian, dan acara yang jatuh tempo dalam 3 hari akan muncul di sini.</small></div>';
    $('npBody').innerHTML = html;
  }
  function openNotif() {
    closeSearch(); if (!np) buildNotif(); renderNotif(); np.hidden = false; npOpen = true;
    var b = document.querySelector('.tools button[aria-label="Notifikasi"]'); if (b) b.setAttribute('aria-expanded', 'true');
  }
  function closeNotif() {
    if (!np || np.hidden) return; np.hidden = true; npOpen = false;
    var b = document.querySelector('.tools button[aria-label="Notifikasi"]'); if (b) b.setAttribute('aria-expanded', 'false');
  }
  function badge() {
    var g = groups(), n = g.late.length + g.today.length, d = document.querySelector('.tools .dot');
    if (!d) return;
    d.classList.add('n'); d.hidden = !n; d.textContent = n > 9 ? '9+' : n; d.setAttribute('aria-label', n + ' pengingat');
  }

  /* ---------- Pengait ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tools button');
    if (b) {
      var lab = b.getAttribute('aria-label');
      if (lab === 'Cari') { e.preventDefault(); e.stopImmediatePropagation(); openSearch(); return; }
      if (lab === 'Notifikasi') { e.preventDefault(); e.stopImmediatePropagation(); npOpen ? closeNotif() : openNotif(); return; }
    }
    if (npOpen && np && !np.contains(e.target)) closeNotif();
  }, true);

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName) || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ov && !ov.hidden ? closeSearch() : openSearch(); return; }
    if (e.key === '/' && !typing && !(ov && !ov.hidden)) { e.preventDefault(); openSearch(); return; }
    if (ov && !ov.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(rows.length - 1, sel + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
      return;
    }
    if (npOpen && e.key === 'Escape') { e.stopPropagation(); closeNotif(); }
  }, true);

  badge(); setInterval(badge, 30000);
  window.addEventListener('focus', badge);
  MO.hud = { badge: badge, search: openSearch };
})();
;
/* MyOffice — Academic Management (data tersimpan di localStorage perangkat) */
(function () {
  'use strict';
  var KEY = 'mo-acad-v1';
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var has = function (v) { return v !== '' && v != null && !isNaN(+v); };
  var fmt = function (n) { return n == null ? '—' : String(Math.round(n * 100) / 100); };
  var fdate = function (v, t) {
    if (!v) return '—';
    var d = new Date(v); if (isNaN(d)) return v;
    return d.toLocaleString('id-ID', t === 'd' ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  /* ---------- Data ---------- */
  function seed() {
    return {
      cfg: {
        confirmed: false, normalize: true,
        scale: [{ l: 'A', min: 85, p: 4 }, { l: 'A-', min: 80, p: 3.7 }, { l: 'B+', min: 75, p: 3.3 }, { l: 'B', min: 70, p: 3 },
          { l: 'B-', min: 65, p: 2.7 }, { l: 'C+', min: 60, p: 2.3 }, { l: 'C', min: 55, p: 2 }, { l: 'D', min: 40, p: 1 }, { l: 'E', min: 0, p: 0 }],
        cats: [{ n: 'Tugas', w: 30 }, { n: 'Kuis', w: 10 }, { n: 'UTS', w: 25 }, { n: 'UAS', w: 35 },
          { n: 'Presentasi', w: 0 }, { n: 'Ujian lisan', w: 0 }, { n: 'Ujian praktik', w: 0 }]
      },
      sem: [{ id: uid(), name: 'Ganjil 2026/2027', target: '', notes: '', active: true }],
      course: [], task: [], exam: [], study: []
    };
  }
  var D; try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (!D || !D.cfg) D = seed();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { msg('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } }
  var by = function (arr, id) { return arr.filter(function (x) { return x.id === id; })[0]; };
  var cname = function (id) { var c = by(D.course, id); return c ? c.name : '—'; };

  /* ---------- Perhitungan (sepenuhnya mengikuti konfigurasi) ---------- */
  var TASKTYPES = ['Tugas', 'Proyek', 'Laporan', 'Kuis', 'Presentasi', 'Lainnya'];
  var EXAMTYPES = ['UTS', 'UAS', 'Kuis', 'Presentasi', 'Ujian lisan', 'Ujian praktik'];
  function catOf(type) { return D.cfg.cats.some(function (c) { return c.n === type; }) ? type : 'Tugas'; }
  function scored(cid) {
    var o = [];
    D.task.forEach(function (t) { if (t.courseId === cid && has(t.score)) o.push({ c: catOf(t.type), s: +t.score, w: +t.weight > 0 ? +t.weight : 1 }); });
    D.exam.forEach(function (e) { if (e.courseId === cid && has(e.score)) o.push({ c: e.type, s: +e.score, w: +e.weight > 0 ? +e.weight : 1 }); });
    return o;
  }
  function finalScore(c) {
    if (has(c.manual)) return +c.manual;
    if (!D.cfg.confirmed) return null;
    var it = scored(c.id), num = 0, den = 0, all = 0;
    D.cfg.cats.forEach(function (k) {
      var w = +k.w || 0; all += w;
      var xs = it.filter(function (i) { return i.c === k.n; });
      if (!xs.length || !w) return;
      var sw = 0, ss = 0; xs.forEach(function (i) { sw += i.w; ss += i.s * i.w; });
      num += w * (ss / sw); den += w;
    });
    if (!den) return null;
    return D.cfg.normalize ? num / den : num / (all || 100);
  }
  function letter(s) {
    if (s == null || !D.cfg.confirmed) return null;
    var sc = D.cfg.scale.slice().sort(function (a, b) { return b.min - a.min; });
    return sc.filter(function (r) { return s >= r.min; })[0] || null;
  }
  function ip(cs) {
    var a = 0, b = 0;
    cs.forEach(function (c) { var L = letter(finalScore(c)), k = +c.sks || 0; if (L && k) { a += L.p * k; b += k; } });
    return b ? a / b : null;
  }
  var ptOf = function (l) { var r = D.cfg.scale.filter(function (x) { return x.l === l; })[0]; return r ? r.p : null; };

  /* ---------- Skema form ---------- */
  var activeSems = function (cur) {
    return [['', '— Pilih semester aktif —']].concat(D.sem.filter(function (s) { return s.active || s.id === cur; })
      .map(function (s) { return [s.id, s.name + (s.active ? '' : ' (tidak aktif)')]; }));
  };
  var courseOpts = function () { return [['', '— Pilih mata kuliah —']].concat(D.course.map(function (c) { return [c.id, c.name]; })); };
  var opt = function (a) { return a.map(function (x) { return [x, x]; }); };
  var SPEC = {
    sem: {
      title: 'Semester', def: { active: true }, fields: [
        { k: 'name', l: 'Semester', t: 'text', ph: 'Ganjil 2026/2027', req: 1, full: 1 },
        { k: 'target', l: 'Target IP semester', t: 'number', step: '0.01', min: 0, max: 4 },
        { k: 'active', l: 'Status semester', t: 'select', bool: 1, o: [['true', 'Aktif'], ['false', 'Tidak aktif']] },
        { k: 'notes', l: 'Catatan semester', t: 'textarea', full: 1 }]
    },
    course: {
      title: 'Mata Kuliah', def: {}, fields: [
        { k: 'name', l: 'Nama mata kuliah', t: 'text', req: 1, full: 1 },
        { k: 'code', l: 'Kode mata kuliah', t: 'text' },
        { k: 'sks', l: 'Jumlah SKS', t: 'number', min: 0, step: '1' },
        { k: 'lecturer', l: 'Nama dosen', t: 'text', full: 1 },
        { k: 'schedule', l: 'Jadwal', t: 'text', ph: 'Senin 08:00–09:40' },
        { k: 'room', l: 'Ruangan / tautan kelas', t: 'text', ph: 'R.204 atau https://…' },
        { k: 'semId', l: 'Semester (hanya semester aktif)', t: 'select', req: 1, o: activeSems, full: 1 },
        { k: 'targetGrade', l: 'Target nilai (huruf)', t: 'select', o: function () { return [['', '—']].concat(D.cfg.scale.map(function (r) { return [r.l, r.l]; })); } },
        { k: 'manual', l: 'Nilai akhir manual (0–100, opsional)', t: 'number', min: 0, max: 100 },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }]
    },
    task: {
      title: 'Tugas', def: { status: 'Belum dikerjakan', priority: 'Sedang', type: 'Tugas' }, fields: [
        { k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 },
        { k: 'courseId', l: 'Mata kuliah', t: 'select', o: courseOpts, req: 1 },
        { k: 'type', l: 'Jenis tugas', t: 'select', o: opt(TASKTYPES) },
        { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'deadline', l: 'Deadline', t: 'datetime-local' },
        { k: 'status', l: 'Status', t: 'select', o: opt(['Belum dikerjakan', 'Sedang dikerjakan', 'Selesai']) },
        { k: 'priority', l: 'Prioritas', t: 'select', o: opt(['Rendah', 'Sedang', 'Tinggi']) },
        { k: 'score', l: 'Nilai (jika ada)', t: 'number', min: 0, max: 100 },
        { k: 'weight', l: 'Bobot nilai (jika diketahui)', t: 'number', min: 0 },
        { k: 'link', l: 'Tautan / lampiran', t: 'url', ph: 'https://…' },
        { k: 'notes', l: 'Catatan pengerjaan', t: 'textarea', full: 1 }]
    },
    exam: {
      title: 'Ujian', def: { type: 'UTS' }, fields: [
        { k: 'type', l: 'Jenis ujian', t: 'select', o: opt(EXAMTYPES), req: 1 },
        { k: 'courseId', l: 'Mata kuliah', t: 'select', o: courseOpts, req: 1 },
        { k: 'date', l: 'Tanggal & waktu', t: 'datetime-local' },
        { k: 'room', l: 'Ruangan / tautan', t: 'text' },
        { k: 'topics', l: 'Materi ujian', t: 'textarea', full: 1 },
        { k: 'score', l: 'Nilai (jika ada)', t: 'number', min: 0, max: 100 },
        { k: 'weight', l: 'Bobot nilai (jika diketahui)', t: 'number', min: 0 },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }]
    },
    study: {
      title: 'Waktu Belajar', def: { minutes: 60 }, fields: [
        { k: 'courseId', l: 'Mata kuliah', t: 'select', o: courseOpts, req: 1, full: 1 },
        { k: 'date', l: 'Tanggal', t: 'date', req: 1 },
        { k: 'minutes', l: 'Durasi (menit)', t: 'number', min: 1, step: '1', req: 1 },
        { k: 'notes', l: 'Catatan', t: 'text', full: 1 }]
    }
  };

  /* ---------- DOM dasar (tema Academy dashboard) ---------- */
  function el(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }
  var ov, body, sideEl, subEl, hiEl, dotEl, tab = 'dash', tf = 'Semua', ef = 'Semua', cf = 'Semua', rng = 'Hari ini', q = '', draft = null;
  var T0 = new Date(), cal = { y: T0.getFullYear(), m: T0.getMonth() }, sel = today();
  var TABS = [['dash', 'Dashboard', 'dash'], ['course', 'Mata Kuliah', 'book'], ['sem', 'Semester', 'cal'], ['task', 'Tugas', 'task'],
    ['exam', 'Ujian', 'exam'], ['exam2', 'Exam', 'quiz'], ['ana', 'Analitik', 'chart'], ['cfg', 'Formula Nilai', 'set']];
  var PAGE = { course: 'Mata Kuliah', sem: 'Semester', task: 'Tugas', exam: 'Ujian', exam2: 'Exam', ana: 'Analitik', cfg: 'Formula Nilai' };
  var PALETTE = ['#ffe24a', '#cfe6ff', '#ffd3d3', '#d6f0c4', '#e4d8ff', '#ffe0bd', '#c9f0e8'];
  var ICO = {
    dash: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    task: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    exam: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    set: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    quiz: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 9h8M8 13h4"/><circle cx="16.5" cy="16.5" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    pen: '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    l: '<path d="m15 18-6-6 6-6"/>', r: '<path d="m9 18 6-6-6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    up: '<path d="M7 17 17 7M8 7h9v9"/>', down: '<path d="M17 7 7 17M16 17H7V8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', flat: '<path d="M5 12h14"/>'
  };
  function ic(n) { return '<svg class="ad-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[n] + '</svg>'; }
  var MARK = '<svg class="ad-mk" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="9" height="9" rx="2.5" fill="#1e1b3a"/><rect x="13" y="2" width="9" height="9" rx="2.5" fill="#ffe24a"/><rect x="2" y="13" width="9" height="9" rx="2.5" fill="#ffe24a"/><rect x="13" y="13" width="9" height="9" rx="2.5" fill="#1e1b3a"/></svg>';
  var prof = function () { try { return JSON.parse(localStorage.getItem('mo-settings-v1')) || {}; } catch (e) { return {}; } };
  var ipf = function (v) { return v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2); };
  var fshort = function (v) {
    if (!v) return '—'; var d = new Date(v); if (isNaN(d)) return v;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + (String(v).length > 10 ? ', ' + pad2(d.getHours()) + '.' + pad2(d.getMinutes()) : '');
  };
  var pad2 = function (n) { return ('0' + n).slice(-2); };
  var dstr = function (y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); };
  var DAYS = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

  function build() {
    ov = el('ad-ov', '<section class="ad-win" role="dialog" aria-modal="true" aria-label="Academic Management">' +
      '<aside class="ad-nav"><div class="ad-logo">' + MARK + '<span><small>MYOFFICE</small><b>ACADEMY</b></span></div>' +
      '<nav class="ad-menu" aria-label="Menu Academic">' + TABS.map(function (t) {
        return '<button class="ad-nl" data-act="tab" data-t="' + t[0] + '">' + ic(t[2]) + '<span>' + t[1] + '</span>' + (t[0] === 'task' ? '<span class="ad-bdg" id="acBdg" hidden></span>' : '') + '</button>';
      }).join('') + '</nav>' +
      '<button class="ad-nl ad-closeNav" data-act="close">' + ic('x') + '<span>Tutup</span></button>' +
      '<div class="ad-help"><i>?</i><b>Pusat bantuan</b><p>Bingung cara hitung nilai &amp; IP? Atur formula penilaian kampusmu.</p><button data-act="help">Atur formula</button></div></aside>' +
      '<div class="ad-main"><header class="ad-top"><div class="ad-hi"><h1 id="acHi"></h1><p id="acSub"></p></div>' +
      '<label class="ad-search">' + ic('search') + '<input id="acQ" type="search" placeholder="Cari mata kuliah, tugas, ujian…" aria-label="Cari" autocomplete="off"></label>' +
      '<button class="ad-ib" data-act="bell" aria-label="Pengingat">' + ic('bell') + '<i id="acDot" hidden></i></button>' +
      '<button class="ad-ib" data-act="close" aria-label="Tutup">' + ic('x') + '</button></header>' +
      '<div class="ad-body" id="acBody"></div></div>' +
      '<aside class="ad-side" id="acSide" aria-label="Profil dan jadwal"></aside></section>');
    ov.hidden = true; document.body.appendChild(ov);
    body = ov.querySelector('#acBody'); sideEl = ov.querySelector('#acSide'); subEl = ov.querySelector('#acSub'); hiEl = ov.querySelector('#acHi'); dotEl = ov.querySelector('#acDot');
    ov.addEventListener('click', onClick);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    var qt; ov.addEventListener('input', function (e) { if (e.target.id === 'acQ') { q = e.target.value.trim(); clearTimeout(qt); qt = setTimeout(renderBody, 140); } });
    ov.addEventListener('change', function (e) { if (e.target.id === 'acRng') { rng = e.target.value; renderBody(); } });
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('role') === 'button') e.target.click();
    });
  }
  function open() { if (!ov) build(); ov.hidden = false; document.body.style.overflow = 'hidden'; sel = today(); render(); }
  function close() { if (ov) ov.hidden = true; document.body.style.overflow = ''; }

  /* ---------- Data turunan untuk dashboard ---------- */
  var colOf = function (c) { var i = D.course.indexOf(c); return PALETTE[(i < 0 ? 0 : i) % PALETTE.length]; };
  function ini(c) {
    var s = (c.code || '').replace(/[^A-Za-z0-9]/g, '');
    if (s.length >= 2) return s.slice(0, 2).toUpperCase();
    var w = String(c.name || '?').trim().split(/\s+/);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : (w[0] || '').charAt(1))).toUpperCase();
  }
  function prog(c) {
    var ts = D.task.filter(function (t) { return t.courseId === c.id; }), dn = ts.filter(function (t) { return t.status === 'Selesai'; }).length;
    return { n: ts.length, d: dn, p: ts.length ? Math.round(dn / ts.length * 100) : 0 };
  }
  function hrs(cid) {
    var m = D.study.filter(function (s) { return s.courseId === cid; }).reduce(function (a, s) { return a + (+s.minutes || 0); }, 0);
    return (Math.round(m / 6) / 10) + 'j';
  }
  var inActive = function (c) { var s = by(D.sem, c.semId); return !!(s && s.active); };
  function courseList() {
    return D.course.filter(function (c) {
      var p = prog(c);
      if (cf === 'Aktif') return inActive(c) && !(p.n && p.p === 100);
      if (cf === 'Selesai') return p.n > 0 && p.p === 100;
      return true;
    });
  }
  var pending = function () { return D.task.filter(function (t) { return t.status !== 'Selesai'; }); };
  var isLate = function (t) { return !!(t.deadline && t.status !== 'Selesai' && new Date(t.deadline) < new Date()); };
  function left(dl) {
    if (!dl) return '—';
    var ms = new Date(dl) - new Date(); if (isNaN(ms)) return '—';
    if (ms < 0) return '<span class="neg">Terlambat</span>';
    var m = Math.floor(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
    return d ? d + ' hari ' + h + ' jam' : h ? h + ' jam ' + (m % 60) + ' mnt' : (m % 60) + ' mnt';
  }
  function events() {
    var o = [];
    D.task.forEach(function (t) { if (t.deadline && t.status !== 'Selesai') o.push({ d: t.deadline.slice(0, 10), t: t.deadline.slice(11, 16), title: t.title, sub: cname(t.courseId) + ' · Tenggat tugas', k: 't' }); });
    D.exam.forEach(function (e) { if (e.date) o.push({ d: e.date.slice(0, 10), t: e.date.slice(11, 16), title: e.type + ' · ' + cname(e.courseId), sub: e.room || 'Ujian', k: 'e' }); });
    return o;
  }
  function classesOn(ds) {
    var wd = new Date(ds + 'T00:00:00').getDay(), o = [];
    D.course.forEach(function (c) {
      if (!inActive(c) || !c.schedule) return;
      var s = String(c.schedule).toLowerCase().replace(/['’`]/g, ''), i = s.indexOf(DAYS[wd]);
      if (i < 0) return;
      var m = s.slice(i).match(/(\d{1,2})[:.](\d{2})/);
      o.push({ d: ds, t: m ? pad2(m[1]) + ':' + m[2] : '', title: c.name, sub: (c.room ? c.room + ' · ' : '') + 'Kuliah', k: 'c' });
    });
    return o;
  }

  /* ---------- Render ---------- */
  function render() { renderNav(); renderBody(); renderSide(); }
  function renderNav() {
    var s = prof(), pn = pending().length, late = D.task.filter(isLate).length;
    ov.querySelectorAll('.ad-nl[data-t]').forEach(function (b) { if (b.dataset.t === tab && !q) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var bd = ov.querySelector('#acBdg'); bd.hidden = !pn; bd.textContent = pn > 99 ? '99+' : pn;
    dotEl.hidden = !late;
    hiEl.textContent = 'Halo, ' + (s.nick || 'Mahasiswa') + ' 👋';
    var act = D.sem.filter(function (x) { return x.active; }).map(function (x) { return x.name; });
    subEl.textContent = act.length ? 'Semester aktif: ' + act.join(', ') : 'Belum ada semester aktif';
  }
  function renderBody() {
    var top = body.scrollTop;
    ov.querySelectorAll('.ad-nl[data-t]').forEach(function (b) { if (b.dataset.t === tab && !q) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var v = q ? vSearch() : tab === 'dash' ? vDash() : '<div class="ad-sh"><h2 class="ad-h">' + PAGE[tab] + '</h2></div>' + ({ course: vCourse, sem: vSem, task: vTask, exam: vExam, exam2: function () { return MO.examView ? MO.examView() : ''; }, ana: vAna, cfg: vCfg })[tab]();
    body.innerHTML = v; body.scrollTop = q ? 0 : top;
  }
  var warn = function () {
    return D.cfg.confirmed ? '' : '<div class="ac-warn"><span>Rumus nilai belum dikonfigurasi, jadi huruf mutu, IP, dan IPK belum dihitung. Atur skala nilai dan bobot sesuai kampus Anda.</span><button class="ac-btn sm" data-act="tab" data-t="cfg">Buka Formula Nilai</button></div>';
  };
  var btns = function (e, id) {
    return '<div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="' + e + '" data-id="' + id + '">Edit</button><button class="ac-btn sm danger" data-act="del" data-e="' + e + '" data-id="' + id + '">Hapus</button></div>';
  };
  var empty = function (t) { return '<div class="ac-empty">' + t + '</div>'; };
  var link = function (v) { return /^https?:\/\//i.test(v || '') ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\//i, '').slice(0, 40)) + '</a>' : esc(v); };

  /* ---------- Dashboard ---------- */
  function cCard(c, manage) {
    var p = prog(c), f = finalScore(c), L = letter(f), done = p.n > 0 && p.p === 100;
    var lab = done ? 'Selesai 🎉' : L ? 'Nilai ' + L.l + ' · ' + fmt(f) : p.n ? 'Sedang berjalan' : 'Belum ada tugas';
    var lc = done || L ? 'ok' : p.n ? 'blue' : 'mute';
    return '<div class="ad-cc' + (done ? ' fin' : '') + '" role="button" tabindex="0" data-act="edit" data-e="course" data-id="' + c.id + '" aria-label="Edit ' + esc(c.name) + '">' +
      '<div class="ad-cct"><i class="ad-tile" style="background:' + colOf(c) + '">' + esc(ini(c)) + '</i><div><b>' + esc(c.name) + '</b><small>' + esc(c.lecturer || 'Dosen belum diisi') + '</small></div></div>' +
      '<div class="ad-lv ' + lc + '">' + lab + '</div>' +
      '<div class="ad-c3" title="SKS · tugas selesai · jam belajar"><span>' + ic('book') + esc(c.sks || 0) + ' SKS</span><span>' + ic('check') + p.d + '/' + p.n + '</span><span>' + ic('clock') + hrs(c.id) + '</span></div>' +
      '<div class="ad-pbar" role="progressbar" aria-valuenow="' + p.p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p.p + '%"></i></div>' +
      '<div class="ad-pt">Selesai: <b>' + p.p + '%</b></div>' + (manage ? btns('course', c.id) : '') + '</div>';
  }
  function cTabs() {
    return '<div class="ad-t2"><div>' + ['Semua', 'Aktif', 'Selesai'].map(function (x) { return '<button class="t" data-act="cf" data-v="' + x + '" aria-pressed="' + (x === cf) + '">' + x + '</button>'; }).join('') + '</div>' +
      (tab === 'dash' ? '<button class="ad-more" data-act="tab" data-t="course">Lihat semua</button>' : '') + '</div>';
  }
  var addCard = '<button class="ad-add" data-act="add" data-e="course">' + ic('plus') + 'Tambah mata kuliah</button>';
  var PRI = { Tinggi: ['hi', 'up'], Sedang: ['mid', 'flat'], Rendah: ['lo', 'down'] };
  var PRIO = { Tinggi: 0, Sedang: 1, Rendah: 2 };

  function vDash() {
    var h = warn(), L = courseList();
    h += '<div class="ad-sh"><h2 class="ad-h">Mata Kuliah</h2></div>' + cTabs();
    h += '<div class="ad-cg">' + L.slice(0, 3).map(function (c) { return cCard(c); }).join('') + (L.length < 3 ? addCard : '') + '</div>';

    var up = pending().sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
    h += '<div class="ad-sh"><h2 class="ad-h sm">Tugas Mendatang</h2>' + (up.length > 3 ? '<button class="ad-more" data-act="tab" data-t="task">Lihat semua (' + up.length + ')</button>' : '') + '</div>';
    h += up.length ? up.slice(0, 3).map(function (t) {
      var c = by(D.course, t.courseId);
      return '<div class="ad-as"><i class="ad-tile big" style="background:' + (c ? colOf(c) : PALETTE[0]) + '">' + (c ? esc(ini(c)) : ic('task')) + '</i>' +
        '<div class="ad-tt"><b>' + esc(t.title) + '</b><small>' + esc(cname(t.courseId)) + ' · ' + esc(t.type) + '</small></div>' +
        '<div class="ad-mm"><small>Tenggat</small><b>' + fshort(t.deadline) + '</b></div><div class="ad-mm"><small>Sisa waktu</small><b>' + left(t.deadline) + '</b></div>' +
        '<div class="ad-bt"><button class="ad-bo" data-act="edit" data-e="task" data-id="' + t.id + '">Ubah jadwal</button><button class="ad-bg" data-act="done" data-id="' + t.id + '">Tandai selesai</button></div></div>';
    }).join('') : '<div class="ad-none">' + (D.course.length ? 'Semua tugas sudah beres. Santai dulu ☕' : 'Tambahkan mata kuliah dulu, lalu catat tugasnya.') + '</div>';

    var wk = new Date(); wk.setDate(wk.getDate() + 7); var lim = dstr(wk.getFullYear(), wk.getMonth(), wk.getDate()), td = today();
    var ht = pending().filter(function (t) {
      if (rng === 'Semua') return true; if (!t.deadline) return false;
      var d = t.deadline.slice(0, 10); return rng === 'Hari ini' ? d <= td : d <= lim;
    }).sort(function (a, b) { return (PRIO[a.priority] - PRIO[b.priority]) || (a.deadline || '9').localeCompare(b.deadline || '9'); });
    h += '<div class="ad-sh"><h2 class="ad-h sm">Tugas Prioritas</h2><div class="ad-rg"><select id="acRng" class="ad-sel" aria-label="Rentang waktu">' +
      ['Hari ini', 'Minggu ini', 'Semua'].map(function (x) { return '<option' + (x === rng ? ' selected' : '') + '>' + x + '</option>'; }).join('') +
      '</select><button class="ad-addl" data-act="add" data-e="task">Tambah ' + ic('plus') + '</button></div></div>';
    h += ht.length ? '<div class="ad-hg">' + ht.slice(0, 4).map(function (t, i) {
      var pr = PRI[t.priority] || PRI.Sedang, c = by(D.course, t.courseId), navy = (i === 0 || i === 3);
      return '<div class="ad-ht ' + (navy ? 'navy' : 'yel') + '"><div class="ad-htt"><h4 data-act="edit" data-e="task" data-id="' + t.id + '" role="button" tabindex="0">' + esc(t.title) + '</h4>' +
        '<span class="ad-pri ' + pr[0] + '">' + esc(t.priority || 'Sedang') + ' ' + ic(pr[1]) + '</span></div>' +
        '<p>' + esc(t.desc || t.notes || 'Belum ada deskripsi untuk tugas ini.') + '</p>' +
        '<div class="ln">' + esc(c ? c.name : '—') + '</div>' +
        '<div class="ft"><div class="due">' + ic('cal') + '<span>Tenggat: ' + fdate(t.deadline, 'd') + (isLate(t) ? ' · terlambat' : '') + '</span></div>' +
        '<button class="ad-chk" data-act="done" data-id="' + t.id + '" aria-label="Tandai selesai" title="Tandai selesai">' + ic('check') + '</button></div></div>';
    }).join('') + '</div>' + (ht.length > 4 ? '<p class="ad-sm" style="margin-top:10px">+' + (ht.length - 4) + ' tugas lain di rentang ini. <button class="ad-more" data-act="tab" data-t="task" style="text-decoration:underline">Buka semua tugas</button></p>' : '')
      : '<div class="ad-none">Tidak ada tugas di rentang “' + esc(rng) + '” 🎉</div>';
    return h;
  }

  /* ---------- Mata kuliah (grid) & pencarian ---------- */
  function vCourse() {
    var h = '<div class="ac-bar"><p class="ac-hint">Klik kartu untuk mengedit. Mata kuliah baru hanya bisa ditambahkan ke semester yang berstatus aktif.</p><button class="ac-btn pri" data-act="add" data-e="course">+ Mata kuliah</button></div>' + cTabs();
    var L = courseList();
    if (!D.course.length) return h + empty('Belum ada mata kuliah.');
    if (!L.length) return h + empty('Tidak ada mata kuliah di filter ini.');
    return h + '<div class="ad-cg">' + L.map(function (c) { return cCard(c, true); }).join('') + '</div>';
  }
  function vSearch() {
    var s = q.toLowerCase(), m = function () { for (var i = 0; i < arguments.length; i++) if (String(arguments[i] || '').toLowerCase().indexOf(s) >= 0) return true; return false; };
    var cs = D.course.filter(function (c) { return m(c.name, c.code, c.lecturer, c.room); });
    var ts = D.task.filter(function (t) { return m(t.title, t.desc, t.notes, t.type, cname(t.courseId)); });
    var xs = D.exam.filter(function (e) { return m(e.type, e.topics, e.notes, cname(e.courseId)); });
    var h = '<div class="ad-sh"><h2 class="ad-h">Hasil untuk “' + esc(q) + '”</h2></div>';
    if (!cs.length && !ts.length && !xs.length) return h + empty('Tidak ada yang cocok.');
    if (cs.length) h += '<h3 class="ac-h">Mata kuliah (' + cs.length + ')</h3><div class="ad-cg">' + cs.map(function (c) { return cCard(c); }).join('') + '</div>';
    if (ts.length) h += '<h3 class="ac-h">Tugas (' + ts.length + ')</h3>' + ts.map(function (t) {
      return '<div class="ac-item' + (t.status === 'Selesai' ? ' done' : '') + '"><div><button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + esc(cname(t.courseId)) + ' · ' + fdate(t.deadline) + ' · ' + esc(t.status) + '</small></div></div>';
    }).join('');
    if (xs.length) h += '<h3 class="ac-h">Ujian (' + xs.length + ')</h3>' + xs.map(function (e) {
      return '<div class="ac-item"><div><button class="t" data-act="edit" data-e="exam" data-id="' + e.id + '">' + esc(e.type) + ' — ' + esc(cname(e.courseId)) + '</button><small>' + fdate(e.date) + '</small></div></div>';
    }).join('');
    return h;
  }

  /* ---------- Panel kanan: profil, kalender, jadwal, pengingat ---------- */
  function renderSide() {
    var s = prof(), nm = s.nick || 'Mahasiswa', cs = D.course.filter(inActive), ipS = ip(cs), ipK = ip(D.course);
    var act = D.sem.filter(function (x) { return x.active; })[0];
    var h = '<section class="ad-sec"><div class="ad-sh2"><h3>Profil</h3><button class="ad-pen" data-act="prof" aria-label="Ubah profil">' + ic('pen') + '</button></div>' +
      '<div class="ad-pf"><div class="ad-av"' + (s.photo ? ' style="background-image:url(&quot;' + esc(s.photo) + '&quot;)"' : '') + '>' + (s.photo ? '' : esc(nm.charAt(0).toUpperCase())) + '</div>' +
      '<h4>' + esc(nm) + '</h4><small>' + esc(act ? act.name : 'Belum ada semester aktif') + '</small>' +
      '<div class="ad-ipk"><span>IP semester<b>' + ipf(ipS) + '</b></span><span>IPK<b>' + ipf(ipK) + '</b></span></div></div>';

    var first = new Date(cal.y, cal.m, 1), start = first.getDay(), dim = new Date(cal.y, cal.m + 1, 0).getDate(), rows = Math.ceil((start + dim) / 7), ev = events(), mk = {}, td = today();
    ev.forEach(function (e) { (mk[e.d] = mk[e.d] || {})[e.k] = 1; });
    var cells = '';
    for (var i = 0; i < rows * 7; i++) {
      var dt = new Date(cal.y, cal.m, i - start + 1), ds = dstr(dt.getFullYear(), dt.getMonth(), dt.getDate()), mm = mk[ds];
      cells += '<button class="ad-d' + (dt.getMonth() !== cal.m ? ' out' : '') + (ds === td ? ' td' : '') + (ds === sel ? ' sel' : '') + '" data-act="day" data-v="' + ds + '" aria-label="' + ds + '"' + (ds === sel ? ' aria-pressed="true"' : '') + '>' + dt.getDate() +
        (mm ? '<span class="dt">' + (mm.t ? '<u></u>' : '') + (mm.e ? '<u class="e"></u>' : '') + '</span>' : '') + '</button>';
    }
    h += '</section><section class="ad-sec"><div class="ad-cal"><div class="ad-calh"><span>' + new Date(cal.y, cal.m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</span>' +
      '<div><button data-act="calnav" data-v="-1" aria-label="Bulan sebelumnya">' + ic('l') + '</button><button data-act="calnav" data-v="1" aria-label="Bulan berikutnya">' + ic('r') + '</button></div></div>' +
      '<div class="ad-wd">' + ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="ad-dg">' + cells + '</div></div></section>';

    var list = classesOn(sel).concat(ev.filter(function (e) { return e.d === sel; })).sort(function (a, b) { return (a.t || '99').localeCompare(b.t || '99'); });
    h += '<section class="ad-sec"><div class="ad-sh2"><h3>Jadwal</h3><button class="ad-more" data-act="tab" data-t="exam">Lihat semua</button></div>' +
      '<div class="ad-dl">' + new Date(sel + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>' +
      (list.length ? list.slice(0, 5).map(function (e) {
        return '<div class="ad-sc"><div class="tm">' + (e.t || '—') + '</div><div class="tx"><b>' + esc(e.title) + '</b><small>' + esc(e.sub) + '</small></div></div>';
      }).join('') : '<p class="ad-sm">Tidak ada jadwal di tanggal ini. Isi kolom “Jadwal” mata kuliah (mis. Senin 08:00) agar jam kuliah muncul otomatis.</p>') + '</section>';

    var now = new Date(), rem = [];
    D.exam.forEach(function (e) { if (e.date && new Date(e.date) >= now) rem.push({ w: e.date, t: e.type + ' — ' + cname(e.courseId), late: 0 }); });
    D.task.forEach(function (t) { if (t.status !== 'Selesai' && t.deadline && new Date(t.deadline) - now < 2 * 864e5) rem.push({ w: t.deadline, t: t.title, late: new Date(t.deadline) < now }); });
    rem.sort(function (a, b) { return a.w.localeCompare(b.w); });
    h += '<section class="ad-sec"><div class="ad-sh2"><h3>Pengingat</h3></div>' + (rem.length ? rem.slice(0, 4).map(function (r) {
      return '<div class="ad-rm"><span class="ic' + (r.late ? ' late' : '') + '">' + ic(r.late ? 'bell' : 'cal') + '</span><div><b>' + esc(r.t) + '</b><small>' + (r.late ? 'Terlambat · ' : '') +
        new Date(r.w).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) + '</small></div></div>';
    }).join('') : '<p class="ad-sm">Belum ada ujian mendatang atau tugas yang mendekati tenggat.</p>') + '</section>';
    sideEl.innerHTML = h;
  }

  function vSem() {
    var h = warn() + '<div class="ac-bar"><p class="ac-hint">Atur semester, target IP, catatan, dan status aktif. Daftar mata kuliah beserta dosen dan nilainya muncul di tiap semester.</p><button class="ac-btn pri" data-act="add" data-e="sem">+ Semester</button></div>';
    if (!D.sem.length) h += empty('Belum ada semester. Tambahkan yang pertama.');
    D.sem.forEach(function (s) {
      var cs = D.course.filter(function (c) { return c.semId === s.id; }), v = ip(cs), sks = cs.reduce(function (a, c) { return a + (+c.sks || 0); }, 0);
      h += '<article class="ac-card"><div class="ac-row"><div><h3>Semester: ' + esc(s.name) +
        '<button class="ac-badge ' + (s.active ? 'on' : '') + '" data-act="togsem" data-id="' + s.id + '" title="Klik untuk ubah status">' + (s.active ? 'Aktif' : 'Tidak aktif') + '</button></h3></div>' + btns('sem', s.id) + '</div>' +
        '<div class="ac-meta"><span>Target IP: <b>' + (has(s.target) ? fmt(+s.target) : '—') + '</b></span><span>IP saat ini: <b>' + fmt(v) + '</b></span><span>Mata kuliah: <b>' + cs.length + '</b></span><span>Total SKS: <b>' + sks + '</b></span></div>' +
        (s.notes ? '<div class="ac-notes">' + esc(s.notes) + '</div>' : '');
      if (cs.length) {
        h += '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Mata kuliah</th><th>Dosen</th><th>SKS</th><th>Nilai</th><th>Huruf</th></tr>' +
          cs.map(function (c) { var f = finalScore(c), L = letter(f); return '<tr class="ac-click" data-act="edit" data-e="course" data-id="' + c.id + '"><td>' + esc(c.name) + (c.code ? ' <small>(' + esc(c.code) + ')</small>' : '') + '</td><td>' + esc(c.lecturer || '—') + '</td><td>' + esc(c.sks || '—') + '</td><td>' + fmt(f) + '</td><td>' + (L ? L.l : '—') + '</td></tr>'; }).join('') + '</table></div>';
      } else h += '<p class="ac-hint">Belum ada mata kuliah di semester ini.</p>';
      if (s.active) h += '<div style="margin-top:10px"><button class="ac-btn sm" data-act="add" data-e="course" data-sem="' + s.id + '">+ Mata kuliah</button></div>';
      h += '</article>';
    });
    return h;
  }
  function chips(list, cur, f) {
    return '<div class="ac-chips">' + list.map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x === cur) + '" data-act="filt" data-f="' + f + '" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>';
  }
  function vTask() {
    var L = D.task.filter(function (t) { return tf === 'Semua' || t.status === tf; }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
    var h = '<div class="ac-bar"><p class="ac-hint">Centang kotak untuk menandai tugas selesai. Klik judul untuk mengedit.</p><button class="ac-btn pri" data-act="add" data-e="task">+ Tugas</button></div>' + chips(['Semua', 'Belum dikerjakan', 'Sedang dikerjakan', 'Selesai'], tf, 'tf');
    if (!L.length) return h + empty(D.course.length ? 'Tidak ada tugas.' : 'Tambahkan mata kuliah terlebih dahulu, lalu catat tugasnya.');
    L.forEach(function (t) {
      var late = t.deadline && t.status !== 'Selesai' && new Date(t.deadline) < new Date();
      h += '<div class="ac-item' + (t.status === 'Selesai' ? ' done' : '') + '"><input type="checkbox" data-act="tgtask" data-id="' + t.id + '"' + (t.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div>' +
        '<button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>' +
        '<span class="ac-badge ' + (t.priority === 'Tinggi' ? 'hi' : t.priority === 'Sedang' ? 'mid' : '') + '">' + esc(t.priority) + '</span><span class="ac-badge">' + esc(t.type) + '</span>' + (late ? '<span class="ac-badge late">Terlambat</span>' : '') +
        '<small>' + esc(cname(t.courseId)) + ' · Deadline: ' + fdate(t.deadline) + ' · ' + esc(t.status) + (has(t.score) ? ' · Nilai: ' + t.score : '') + (has(t.weight) ? ' · Bobot: ' + t.weight : '') + '</small>' +
        (t.desc ? '<small>' + esc(t.desc) + '</small>' : '') + (t.link ? '<small>' + link(t.link) + '</small>' : '') + (t.notes ? '<small>Catatan: ' + esc(t.notes) + '</small>' : '') + '</div>' + btns('task', t.id) + '</div>';
    });
    return h;
  }
  function vExam() {
    var L = D.exam.filter(function (e) { return ef === 'Semua' || e.type === ef; }).sort(function (a, b) { return (a.date || '9').localeCompare(b.date || '9'); });
    var h = '<div class="ac-bar"><p class="ac-hint">UTS, UAS, kuis, presentasi, ujian lisan, dan ujian praktik.</p><button class="ac-btn pri" data-act="add" data-e="exam">+ Ujian</button></div>' + chips(['Semua'].concat(EXAMTYPES), ef, 'ef');
    if (!L.length) return h + empty(D.course.length ? 'Tidak ada ujian.' : 'Tambahkan mata kuliah terlebih dahulu.');
    L.forEach(function (e) {
      var past = e.date && new Date(e.date) < new Date();
      h += '<div class="ac-item"><div><button class="t" data-act="edit" data-e="exam" data-id="' + e.id + '">' + esc(e.type) + ' — ' + esc(cname(e.courseId)) + '</button>' + (past ? '' : (e.date ? '<span class="ac-badge mid">Mendatang</span>' : '')) +
        '<small>' + fdate(e.date) + (e.room ? ' · ' + link(e.room) : '') + (has(e.score) ? ' · Nilai: ' + e.score : '') + (has(e.weight) ? ' · Bobot: ' + e.weight : '') + '</small>' +
        (e.topics ? '<small>Materi: ' + esc(e.topics) + '</small>' : '') + (e.notes ? '<small>' + esc(e.notes) + '</small>' : '') + '</div>' + btns('exam', e.id) + '</div>';
    });
    return h;
  }
  function vAna() {
    var act = D.course.filter(function (c) { var s = by(D.sem, c.semId); return s && s.active; });
    var pend = D.task.filter(function (t) { return t.status !== 'Selesai'; }), late = pend.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date(); });
    var up = D.exam.filter(function (e) { return e.date && new Date(e.date) >= new Date(); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    var sc = D.task.filter(function (t) { return has(t.score); }).length + D.exam.filter(function (e) { return has(e.score); }).length;
    var h = warn() + '<div class="ac-grid">' +
      '<div class="ac-stat"><b>' + act.length + '</b><span>Mata kuliah aktif</span></div>' +
      '<div class="ac-stat"><b>' + pend.length + '</b><span>Tugas belum selesai' + (late.length ? ' (' + late.length + ' terlambat)' : '') + '</span></div>' +
      '<div class="ac-stat"><b>' + up.length + '</b><span>Ujian mendatang' + (up[0] ? ' · berikutnya ' + fdate(up[0].date, 'd') : '') + '</span></div>' +
      '<div class="ac-stat"><b>' + sc + '</b><span>Nilai yang sudah dimasukkan</span></div></div>';
    // waktu belajar
    var tot = {}, all = 0; D.study.forEach(function (s) { tot[s.courseId] = (tot[s.courseId] || 0) + (+s.minutes || 0); all += +s.minutes || 0; });
    var ids = Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; }), mx = ids.length ? tot[ids[0]] : 1;
    var hm = function (m) { return Math.floor(m / 60) + 'j ' + (m % 60) + 'm'; };
    h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Distribusi waktu belajar' + (all ? ' · total ' + hm(all) : '') + '</div><button class="ac-btn sm" data-act="add" data-e="study">+ Catat waktu belajar</button></div>';
    h += ids.length ? '<div class="ac-bars">' + ids.map(function (id) { return '<div class="ac-bar2"><span>' + esc(cname(id)) + '</span><div class="ac-track"><i style="width:' + (tot[id] / mx * 100) + '%"></i></div><span>' + hm(tot[id]) + ' (' + Math.round(tot[id] / all * 100) + '%)</span></div>'; }).join('') + '</div>'
      : '<p class="ac-hint">Belum ada catatan waktu belajar.</p>';
    if (D.study.length) h += '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Tanggal</th><th>Mata kuliah</th><th>Durasi</th><th></th></tr>' +
      D.study.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 8).map(function (s) { return '<tr><td>' + fdate(s.date, 'd') + '</td><td>' + esc(cname(s.courseId)) + '</td><td>' + s.minutes + ' mnt</td><td><button class="ac-btn sm" data-act="edit" data-e="study" data-id="' + s.id + '">Edit</button> <button class="ac-btn sm danger" data-act="del" data-e="study" data-id="' + s.id + '">Hapus</button></td></tr>'; }).join('') + '</table></div>';
    // target vs hasil
    h += '<div class="ac-h">Perbandingan target dan hasil</div>';
    if (!D.cfg.confirmed) h += '<p class="ac-hint">Tersedia setelah formula nilai dikonfigurasi.</p>';
    else {
      var rows = act.filter(function (c) { return c.targetGrade || finalScore(c) != null; });
      var top = Math.max.apply(null, D.cfg.scale.map(function (r) { return r.p; }).concat([1]));
      h += rows.length ? '<div class="ac-legend"><span><i></i>Target</span><span><i class="alt"></i>Hasil saat ini</span></div><div class="ac-bars">' + rows.map(function (c) {
        var tp = ptOf(c.targetGrade), L = letter(finalScore(c));
        return '<div class="ac-bar2"><span>' + esc(c.name) + '</span><div class="ac-pair"><div class="ac-track"><i style="width:' + ((tp || 0) / top * 100) + '%"></i></div><div class="ac-track"><i class="alt" style="width:' + ((L ? L.p : 0) / top * 100) + '%"></i></div></div><span>' + esc(c.targetGrade || '—') + ' → ' + (L ? L.l : '—') + '</span></div>';
      }).join('') + '</div>' : '<p class="ac-hint">Isi target nilai atau nilai tugas/ujian agar perbandingan muncul.</p>';
      var sr = D.sem.filter(function (s) { return s.active && has(s.target); });
      if (sr.length) h += '<div class="ac-meta" style="margin-top:14px">' + sr.map(function (s) { return '<span>' + esc(s.name) + ' — target IP <b>' + fmt(+s.target) + '</b>, saat ini <b>' + fmt(ip(D.course.filter(function (c) { return c.semId === s.id; }))) + '</b></span>'; }).join('') + '</div>';
    }
    var ipk = ip(D.course);
    h += '<div class="ac-meta" style="margin-top:10px"><span>IPK (semua semester): <b>' + fmt(ipk) + '</b></span></div>';
    return h;
  }
  function vCfg() {
    if (!draft) draft = JSON.parse(JSON.stringify(D.cfg));
    var c = draft, sum = c.cats.reduce(function (a, k) { return a + (+k.w || 0); }, 0);
    var h = '<div class="ac-bar"><p class="ac-hint">Nilai akhir, huruf mutu, IP, dan IPK hanya dihitung memakai pengaturan ini. Nilai awalnya hanya contoh — sesuaikan dengan aturan kampus/dosen Anda, lalu simpan.</p>' +
      '<span class="ac-badge ' + (D.cfg.confirmed ? 'on' : '') + '">' + (D.cfg.confirmed ? 'Formula aktif' : 'Belum aktif') + '</span></div><div class="ac-cfg" id="cfgForm">';
    h += '<div><div class="ac-h" style="margin-top:0">Skala nilai (huruf mutu)</div><table class="ac-tbl"><tr><th>Huruf</th><th>Nilai min</th><th>Poin</th><th></th></tr>' +
      c.scale.map(function (r, i) { return '<tr><td><input data-s="l" data-i="' + i + '" value="' + esc(r.l) + '"></td><td><input type="number" data-s="min" data-i="' + i + '" value="' + esc(r.min) + '"></td><td><input type="number" step="0.01" data-s="p" data-i="' + i + '" value="' + esc(r.p) + '"></td><td><button class="ac-btn sm danger" data-act="cfgdel" data-k="scale" data-i="' + i + '">×</button></td></tr>'; }).join('') +
      '</table><button class="ac-btn sm" style="margin-top:8px" data-act="cfgadd" data-k="scale">+ Baris</button></div>';
    h += '<div><div class="ac-h" style="margin-top:0">Komponen & bobot nilai akhir (%)</div><table class="ac-tbl"><tr><th>Komponen</th><th>Bobot</th><th></th></tr>' +
      c.cats.map(function (r, i) { return '<tr><td><input data-c="n" data-i="' + i + '" value="' + esc(r.n) + '"></td><td><input type="number" data-c="w" data-i="' + i + '" value="' + esc(r.w) + '"></td><td><button class="ac-btn sm danger" data-act="cfgdel" data-k="cats" data-i="' + i + '">×</button></td></tr>'; }).join('') +
      '</table><button class="ac-btn sm" style="margin-top:8px" data-act="cfgadd" data-k="cats">+ Komponen</button>' +
      '<p class="ac-sum">Total bobot: <b>' + fmt(sum) + '%</b>. Tugas dengan jenis selain nama komponen dihitung sebagai "Tugas"; Kuis, Presentasi, UTS, UAS, dll. mengikuti nama komponen.</p>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12.5px"><input type="checkbox" id="cfgNorm"' + (c.normalize ? ' checked' : '') + ' style="width:auto;margin-top:3px"><span>Abaikan komponen yang belum punya nilai (bobot dinormalisasi). Jika dimatikan, komponen kosong dihitung 0.</span></label></div></div>' +
      '<div class="ac-foot" style="padding:18px 0 0"><button class="ac-btn" data-act="cfgreset">Muat ulang</button><button class="ac-btn pri" data-act="cfgsave">Simpan & aktifkan formula</button></div>';
    return h;
  }
  function readCfg() {
    if (!draft) return;
    body.querySelectorAll('[data-s]').forEach(function (i) { var r = draft.scale[+i.dataset.i]; if (r) r[i.dataset.s] = i.dataset.s === 'l' ? i.value : (i.value === '' ? 0 : +i.value); });
    body.querySelectorAll('[data-c]').forEach(function (i) { var r = draft.cats[+i.dataset.i]; if (r) r[i.dataset.c] = i.dataset.c === 'n' ? i.value : (i.value === '' ? 0 : +i.value); });
    var n = body.querySelector('#cfgNorm'); if (n) draft.normalize = n.checked;
  }

  /* ---------- Form modal ---------- */
  function fld(f, v) {
    var at = 'id="f_' + f.k + '" name="' + f.k + '"' + (f.req ? ' required' : ''), inp;
    if (f.t === 'textarea') inp = '<textarea ' + at + ' rows="3">' + esc(v) + '</textarea>';
    else if (f.t === 'select') {
      var o = typeof f.o === 'function' ? f.o(v) : f.o;
      inp = '<select ' + at + '>' + o.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>';
    } else {
      var x = f.t === 'number' ? ' step="' + (f.step || 'any') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') : '';
      inp = '<input ' + at + ' type="' + f.t + '" value="' + esc(v) + '"' + x + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
    }
    return '<label class="' + (f.full ? 'full' : '') + '"><span>' + f.l + (f.req ? ' *' : '') + '</span>' + inp + '</label>';
  }
  function openForm(ent, id, preset) {
    var sp = SPEC[ent], it = id ? by(D[ent], id) : Object.assign({}, sp.def, preset || {});
    if (ent === 'study' && !id) it.date = today();
    var m = el('ac-ov ac-ov2 ad-skin', '<form class="ac-win ac-form" novalidate><header><h2>' + (id ? 'Edit ' : 'Tambah ') + sp.title + '</h2><button type="button" class="ac-x" data-x aria-label="Tutup">×</button></header>' +
      '<div class="ac-fields">' + sp.fields.map(function (f) { var v = it[f.k]; if (f.bool) v = String(v !== false); return fld(f, v == null ? '' : v); }).join('') + '</div>' +
      '<footer><button type="button" class="ac-btn" data-x>Batal</button><button class="ac-btn pri">Simpan</button></footer></form>');
    document.body.appendChild(m);
    var off = function () { m.remove(); };
    m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
    m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, bad = null, rec = id ? it : { id: uid() };
      sp.fields.forEach(function (fd) {
        var inp = f.elements[fd.k], v = inp.value.trim();
        if (fd.req && !v && !bad) bad = inp;
        rec[fd.k] = fd.bool ? v === 'true' : fd.t === 'number' ? (v === '' ? '' : +v) : v;
      });
      if (bad) { bad.focus(); bad.reportValidity && bad.reportValidity(); return; }
      if (!id) D[ent].push(rec);
      save(); off(); render();
    });
    var first = m.querySelector('input,select,textarea'); if (first) first.focus();
  }
  function del(ent, id) {
    var it = by(D[ent], id); if (!it) return;
    var extra = ent === 'sem' ? ' Semua mata kuliah di semester ini beserta tugas dan ujiannya ikut terhapus.' : ent === 'course' ? ' Tugas, ujian, dan catatan belajarnya ikut terhapus.' : '';
    if (!confirm('Hapus "' + (it.name || it.title || SPEC[ent].title) + '"?' + extra)) return;
    var rm = function (cid) { ['task', 'exam', 'study'].forEach(function (k) { D[k] = D[k].filter(function (x) { return x.courseId !== cid; }); }); };
    if (ent === 'sem') { D.course.filter(function (c) { return c.semId === id; }).forEach(function (c) { rm(c.id); }); D.course = D.course.filter(function (c) { return c.semId !== id; }); }
    if (ent === 'course') rm(id);
    D[ent] = D[ent].filter(function (x) { return x.id !== id; });
    save(); render();
  }

  /* ---------- Event ---------- */
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || !ov.contains(b)) return;
    var a = b.dataset.act, d = b.dataset;
    if (a === 'close') return close();
    if (a === 'tab') {
      if (tab === 'cfg') readCfg();
      tab = d.t; q = ''; var qi = ov.querySelector('#acQ'); if (qi) qi.value = '';
      render(); body.scrollTop = 0; return;
    }
    if (a === 'help') { tab = 'cfg'; q = ''; render(); body.scrollTop = 0; return; }
    if (a === 'bell') { if (tab === 'cfg') readCfg(); tab = 'task'; tf = 'Semua'; q = ''; var q2 = ov.querySelector('#acQ'); if (q2) q2.value = ''; render(); body.scrollTop = 0; return; }
    if (a === 'cf') { cf = d.v; return renderBody(); }
    if (a === 'done') { var dt = by(D.task, d.id); if (dt) { dt.status = 'Selesai'; save(); } return render(); }
    if (a === 'day') { sel = d.v; var dd = new Date(d.v + 'T00:00:00'); cal = { y: dd.getFullYear(), m: dd.getMonth() }; return renderSide(); }
    if (a === 'calnav') { var nd = new Date(cal.y, cal.m + (+d.v), 1); cal = { y: nd.getFullYear(), m: nd.getMonth() }; return renderSide(); }
    if (a === 'prof') { close(); if (MO.routes['#settings']) MO.routes['#settings'](); return; }
    if (a === 'add') {
      if (d.e === 'course' && !D.sem.some(function (s) { return s.active; })) return msg('Belum ada semester aktif', 'Aktifkan atau buat semester terlebih dahulu.');
      if ((d.e === 'task' || d.e === 'exam' || d.e === 'study') && !D.course.length) return msg('Belum ada mata kuliah', 'Tambahkan mata kuliah terlebih dahulu.');
      return openForm(d.e, null, d.sem ? { semId: d.sem } : null);
    }
    if (a === 'edit') return openForm(d.e, d.id);
    if (a === 'del') return del(d.e, d.id);
    if (a === 'togsem') { var s = by(D.sem, d.id); s.active = !s.active; save(); return render(); }
    if (a === 'tgtask') { var t = by(D.task, d.id); t.status = e.target.checked ? 'Selesai' : 'Belum dikerjakan'; save(); return render(); }
    if (a === 'filt') { if (d.f === 'tf') tf = d.v; else ef = d.v; return render(); }
    if (a === 'cfgadd') { readCfg(); draft[d.k].push(d.k === 'scale' ? { l: '', min: 0, p: 0 } : { n: '', w: 0 }); return render(); }
    if (a === 'cfgdel') { readCfg(); draft[d.k].splice(+d.i, 1); return render(); }
    if (a === 'cfgreset') { draft = null; return render(); }
    if (a === 'cfgsave') {
      readCfg();
      var okS = draft.scale.length && draft.scale.every(function (r) { return r.l.trim(); });
      var sum = draft.cats.reduce(function (x, k) { return x + (+k.w || 0); }, 0);
      if (!okS) return msg('Belum bisa disimpan', 'Skala nilai harus berisi minimal satu baris dan semua hurufnya terisi.');
      if (!draft.cats.length || sum <= 0) return msg('Belum bisa disimpan', 'Total bobot komponen harus lebih dari 0.');
      if (!draft.normalize && sum !== 100 && !confirm('Total bobot ' + sum + '%, bukan 100%. Nilai akhir akan dihitung dibagi ' + sum + '. Lanjutkan?')) return;
      draft.confirmed = true; D.cfg = draft; draft = null; save(); msg('Tersimpan', 'Formula nilai aktif dan dipakai di seluruh perhitungan.'); return render();
    }
  }

  /* ---------- Dialog singkat & Coming soon ---------- */
  var MO = window.MyOffice = window.MyOffice || {}; MO.routes = MO.routes || {};
  MO.routes['#academic'] = function () { open(); };
  var dlg, tm;
  function msg(title, text) {
    if (!dlg) { dlg = el('ac-soon', '<div><small></small><b></b></div>'); dlg.hidden = true; document.body.appendChild(dlg); dlg.addEventListener('click', function () { dlg.hidden = true; }); }
    dlg.querySelector('small').textContent = title; dlg.querySelector('b').textContent = text;
    dlg.hidden = false; clearTimeout(tm); tm = setTimeout(function () { dlg.hidden = true; }, 2200);
  }
  MO.msg = function (t, x) { msg(t, x); };
  MO.acadRender = function () { if (ov && !ov.hidden) renderBody(); };
  function soon(label) {
    if (!dlg) msg('', '');
    msg(label || '', 'Coming s0000000n');
    dlg.querySelector('b').style.fontSize = '';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.nav a');
    if (a) {
      e.preventDefault(); e.stopPropagation();
      var h = a.getAttribute('href');
      if (h === '#academic') return open();
      if (MO.routes[h]) return MO.routes[h]();
      return soon(a.textContent.replace(/\s+/g, ' ').trim());
    }
    var t = e.target.closest('.tools button');
    if (t && t.id !== 'themeBtn') {
      if (t.classList.contains('avatar') && MO.routes['#settings']) return MO.routes['#settings']();
      soon(t.getAttribute('aria-label') || '');
    }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (dlg && !dlg.hidden) dlg.hidden = true;
    else if (ov && !ov.hidden && !document.querySelector('.ac-ov2')) close();
  });
})();
;
/* MyOffice — Exam: latihan & ujian pilihan ganda dari bank soal (hasil tersimpan di localStorage) */
(function () {
  'use strict';
  var MO = window.MyOffice = window.MyOffice || {};
  var HK = 'mo-exam-v1', BK = 'mo-exam-banks-v1', LT = ['A', 'B', 'C', 'D', 'E', 'F'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var say = function (t, x) { if (MO.msg) MO.msg(t, x); };
  var rd = function (k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
  var wr = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { say('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } };
  var p2 = function (n) { return ('0' + n).slice(-2); };
  var clock = function (s) { s = Math.max(0, Math.round(s)); return (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + p2(Math.floor(s % 3600 / 60)) + ':' + p2(s % 60); };
  var hist = rd(HK), mine = rd(BK), view = 'lib', cfg = null, S = null, R = null, tm = null, folder = null;
  var gid = function (i) { return document.getElementById(i); };

  function shuf(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rerender(top) { if (MO.acadRender) MO.acadRender(); var b = gid('acBody'); if (b && top !== false) b.scrollTop = 0; }

  /* ---------- Bank soal ---------- */
  function norm(b) {
    if (!b || !Array.isArray(b.questions)) return null;
    var qs = [];
    b.questions.forEach(function (x) {
      if (!x || !x.q || !Array.isArray(x.o) || x.o.length < 2) return;
      var a = typeof x.a === 'string' ? LT.indexOf(x.a.trim().toUpperCase()) : +x.a;
      if (!(a >= 0 && a < x.o.length)) return;
      qs.push({ q: String(x.q), o: x.o.map(String), a: a, e: x.e ? String(x.e) : '' });
    });
    return qs.length ? { id: String(b.id || 'u' + Date.now().toString(36)), title: String(b.title || 'Bank soal'), course: b.course ? String(b.course) : '', questions: qs } : null;
  }
  function banks() {
    var out = [];
    (window.MO_EXAM_BANKS || []).forEach(function (b) { var n = norm(b); if (n) { n.builtin = true; out.push(n); } });
    return out.concat(mine);
  }
  var bankOf = function (id) { return banks().filter(function (b) { return b.id === id; })[0]; };
  function stat(id) {
    var h = hist.filter(function (x) { return x.bank === id && !x.redo; });
    return { n: h.length, best: h.length ? Math.max.apply(null, h.map(function (x) { return x.pct; })) : 0 };
  }

  /* ---------- Tampilan: folder mata kuliah & daftar bank ---------- */
  var FI = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  function groups() {
    var g = {}, order = [];
    banks().forEach(function (b) { var c = b.course || 'Lainnya'; if (!g[c]) { g[c] = []; order.push(c); } g[c].push(b); });
    return order.map(function (c) { return { name: c, banks: g[c] }; });
  }
  function vLib() {
    var bs = banks(), gs = groups(), cur = folder && gs.filter(function (g) { return g.name === folder; })[0];
    if (!cur) folder = null;
    var h = '<div class="ac-bar"><p class="ac-hint">' + (cur ? 'Pilih bank soal, atur mode, lalu mulai.' : 'Pilih folder mata kuliah untuk mulai berlatih.') + '</p><button class="ac-btn pri" data-ex="import">+ Impor soal</button></div>';
    if (S) {
      var dn = S.ans.filter(function (x) { return x >= 0; }).length;
      h += '<div class="ex-resume"><span>Sesi <b>' + esc(S.title) + '</b> masih berjalan, ' + dn + ' dari ' + S.qs.length + ' soal terjawab.</span><button class="ac-btn pri sm" data-ex="resume">Lanjutkan</button></div>';
    }
    if (!bs.length) return h + '<div class="ac-empty">Belum ada bank soal. Impor file JSON untuk mulai berlatih.</div>';
    if (cur) {
      return h + '<button class="ex-back" data-ex="folders">‹ Semua mata kuliah</button><h3 class="ex-fh">' + esc(cur.name) + '</h3><div class="ex-bg">' + cur.banks.map(function (b) {
        var s = stat(b.id);
        return '<article class="ex-bk"><div class="ex-bt"><b>' + esc(b.title) + '</b><small>' + b.questions.length + ' soal</small></div>' +
          '<div class="ex-bs">' + (s.n ? '<div class="ex-bar" role="img" aria-label="Skor terbaik ' + s.best + '"><i style="width:' + s.best + '%"></i></div><small>Skor terbaik <b>' + s.best + '</b>, dikerjakan ' + s.n + 'x</small>' : '<small>Belum pernah dikerjakan</small>') + '</div>' +
          '<div class="ex-ba"><button class="ac-btn pri sm" data-ex="setup" data-id="' + esc(b.id) + '">Mulai</button>' + (b.builtin ? '' : '<button class="ac-btn sm danger" data-ex="delbank" data-id="' + esc(b.id) + '">Hapus</button>') + '</div></article>';
      }).join('') + '</div>';
    }
    h += '<div class="ex-bg">' + gs.map(function (g) {
      var n = g.banks.reduce(function (t, b) { return t + b.questions.length; }, 0);
      return '<button class="ex-fd" data-ex="folder" data-c="' + esc(g.name) + '"><span class="ex-fi">' + FI + '</span><b>' + esc(g.name) + '</b><small>' + g.banks.length + ' bank soal, ' + n + ' soal</small></button>';
    }).join('') + '</div>';
    if (hist.length) {
      h += '<div class="ad-sh"><h2 class="ad-h sm">Riwayat terakhir</h2></div><div class="ex-hist">' + hist.slice(0, 6).map(function (x) {
        return '<div class="ex-hr"><div><b>' + esc(x.title) + '</b><small>' + new Date(x.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ', ' + (x.mode === 'ujian' ? 'ujian' : 'latihan') + '</small></div><span>' + x.correct + '/' + x.n + '</span><b class="ex-hp">' + x.pct + '</b></div>';
      }).join('') + '</div>';
    }
    return h;
  }

  /* ---------- Tampilan: pengaturan ---------- */
  function vSetup() {
    var b = bankOf(cfg.id); if (!b) { view = 'lib'; return vLib(); }
    var N = b.questions.length, ns = [10, 20, 30, 50].filter(function (n) { return n < N; }), cnt = cfg.n === 'all' ? N : Math.min(+cfg.n, N);
    var M = [['latihan', 'Latihan', 'Jawaban benar dan pembahasan langsung muncul setelah kamu memilih.'], ['ujian', 'Ujian', 'Berwaktu. Jawaban bisa diubah, hasil dan pembahasan muncul setelah selesai.']];
    return '<button class="ex-back" data-ex="lib">‹ Kembali ke folder</button><div class="ex-set"><h3>' + esc(b.title) + '</h3><p class="ac-hint">' + N + ' soal tersedia</p>' +
      '<div class="ex-modes">' + M.map(function (m) { return '<button class="ex-mode" data-ex="mode" data-v="' + m[0] + '" aria-pressed="' + (cfg.mode === m[0]) + '"><b>' + m[1] + '</b><span>' + m[2] + '</span></button>'; }).join('') + '</div>' +
      '<div class="ex-row"><label class="ex-f"><span>Jumlah soal</span><select id="exN"><option value="all"' + (cfg.n === 'all' ? ' selected' : '') + '>Semua (' + N + ')</option>' + ns.map(function (n) { return '<option value="' + n + '"' + (String(cfg.n) === String(n) ? ' selected' : '') + '>' + n + ' soal</option>'; }).join('') + '</select></label>' +
      (cfg.mode === 'ujian' ? '<label class="ex-f"><span>Waktu (menit)</span><input id="exMin" type="number" min="1" step="1" value="' + (cfg.min || cnt) + '"' + (cfg.min ? ' data-t="1"' : '') + '></label>' : '') + '</div>' +
      '<label class="ex-ck"><input type="checkbox" id="exSh"' + (cfg.sh ? ' checked' : '') + '><span>Acak urutan soal</span></label>' +
      '<label class="ex-ck"><input type="checkbox" id="exSo"' + (cfg.so ? ' checked' : '') + '><span>Acak urutan pilihan<small>Matikan bila ada pilihan seperti "semua jawaban benar".</small></span></label>' +
      '<button class="ac-btn pri ex-go" data-ex="start">Mulai ' + (cfg.mode === 'ujian' ? 'ujian' : 'latihan') + '</button></div>';
  }
  function readCfg() { if (gid('exN')) { cfg.n = gid('exN').value; cfg.sh = gid('exSh').checked; cfg.so = gid('exSo').checked; } }

  /* ---------- Sesi ---------- */
  function start(id, title, src, o) {
    var idx = src.map(function (_, i) { return i; }); if (o.sh) shuf(idx);
    var qs = idx.slice(0, o.n).map(function (i) {
      var q = src[i], op = q.o.map(function (t, k) { return { t: t, k: k }; }); if (o.so) shuf(op);
      return { q: q.q, o: op.map(function (x) { return x.t; }), a: op.map(function (x) { return x.k; }).indexOf(q.a), e: q.e };
    });
    S = { bank: id, title: title, mode: o.mode, redo: !!o.redo, qs: qs, ans: qs.map(function () { return -1; }), flag: {}, cur: 0, t0: Date.now(), end: o.mode === 'ujian' ? Date.now() + o.min * 6e4 : 0 };
    clearInterval(tm); tm = setInterval(tick, 1000); view = 'run'; rerender();
  }
  var timeTxt = function () { return S.end ? clock((S.end - Date.now()) / 1000) : clock((Date.now() - S.t0) / 1000); };
  function tick() {
    if (!S) return clearInterval(tm);
    if (S.end && Date.now() >= S.end) { say('Waktu habis', 'Jawaban dikumpulkan otomatis.'); return finish(true); }
    var e = gid('exTm'); if (e) { e.textContent = timeTxt(); e.classList.toggle('low', !!S.end && S.end - Date.now() < 6e4); }
  }
  function pick(k) {
    var q = S.qs[S.cur]; if (k >= q.o.length) return;
    if (S.mode === 'latihan') { if (S.ans[S.cur] >= 0) return; S.ans[S.cur] = k; } else S.ans[S.cur] = S.ans[S.cur] === k ? -1 : k;
    rerender(false);
  }
  function go(i) { if (i < 0 || i >= S.qs.length) return; S.cur = i; rerender(); }
  function finish(auto) {
    var un = S.ans.filter(function (x) { return x < 0; }).length;
    if (!auto && un && !confirm(un + ' soal belum dijawab. Selesaikan sekarang?')) return;
    clearInterval(tm);
    var ok = S.qs.filter(function (q, i) { return S.ans[i] === q.a; }).length;
    var r = { bank: S.bank, title: S.title, date: new Date().toISOString(), mode: S.mode, redo: S.redo, n: S.qs.length, correct: ok, pct: Math.round(ok / S.qs.length * 100), dur: Math.round((Date.now() - S.t0) / 1000) };
    hist.unshift(r); hist = hist.slice(0, 200); wr(HK, hist);
    R = { r: r, s: S }; S = null; view = 'res'; rerender();
  }

  /* ---------- Tampilan: mengerjakan ---------- */
  function vRun() {
    var q = S.qs[S.cur], a = S.ans[S.cur], lock = S.mode === 'latihan' && a >= 0, dn = S.ans.filter(function (x) { return x >= 0; }).length;
    var h = '<div class="ex-hd"><div><b>' + esc(S.title) + '</b><small>Mode ' + S.mode + ', ' + dn + ' dari ' + S.qs.length + ' terjawab</small></div><span class="ex-tm" id="exTm" role="timer">' + timeTxt() + '</span><button class="ac-btn" data-ex="quit">Keluar</button><button class="ac-btn pri" data-ex="finish">Selesai</button></div>';
    h += '<div class="ex-cols"><section class="ex-card"><div class="ex-qn">Soal ' + (S.cur + 1) + ' dari ' + S.qs.length + (S.flag[S.cur] ? ', ditandai' : '') + '</div><p class="ex-q">' + esc(q.q) + '</p><div class="ex-opts">' +
      q.o.map(function (t, k) {
        var c = lock ? (k === q.a ? ' ok' : k === a ? ' bad' : ' dim') : k === a ? ' sel' : '';
        return '<button class="ex-o' + c + '" data-ex="pick" data-k="' + k + '"' + (lock ? ' disabled' : '') + '><i>' + LT[k] + '</i><span>' + esc(t) + '</span></button>';
      }).join('') + '</div>';
    if (lock) h += '<div class="ex-exp ' + (a === q.a ? 'ok' : 'bad') + '" role="status"><b>' + (a === q.a ? 'Benar' : 'Belum tepat') + '</b><p>Jawaban yang benar: ' + LT[q.a] + '. ' + esc(q.o[q.a]) + '</p>' + (q.e ? '<p>' + esc(q.e) + '</p>' : '') + '</div>';
    h += '<div class="ex-nv"><button class="ac-btn" data-ex="prev"' + (S.cur ? '' : ' disabled') + '>Sebelumnya</button><button class="ac-btn" data-ex="flag" aria-pressed="' + !!S.flag[S.cur] + '">' + (S.flag[S.cur] ? 'Lepas tanda' : 'Tandai ragu') + '</button><button class="ac-btn pri" data-ex="next"' + (S.cur < S.qs.length - 1 ? '' : ' disabled') + '>Berikutnya</button></div></section>' +
      '<aside class="ex-sheet"><h4>Lembar jawaban</h4><div class="ex-grid">' + S.qs.map(function (x, i) {
        var v = S.ans[i], c = (i === S.cur ? ' cur' : '') + (v >= 0 ? (S.mode === 'latihan' ? (v === x.a ? ' ok' : ' bad') : ' on') : '') + (S.flag[i] ? ' fl' : '');
        return '<button class="ex-g' + c + '" data-ex="go" data-i="' + i + '" aria-label="Soal ' + (i + 1) + (S.flag[i] ? ', ditandai' : '') + '">' + (i + 1) + '</button>';
      }).join('') + '</div><p class="ex-lg">Tanda titik kecil berarti soal ditandai ragu. Pintasan: A–E untuk memilih, panah kiri/kanan untuk pindah soal.</p></aside></div>';
    return h;
  }

  /* ---------- Tampilan: hasil ---------- */
  function vRes() {
    var r = R.r, s = R.s, blank = s.ans.filter(function (x) { return x < 0; }).length, bad = r.n - r.correct - blank;
    var h = '<div class="ex-sum"><div class="ex-pct"><b>' + r.pct + '</b><small>skor dari 100</small></div><div class="ex-st"><h3>' + esc(r.title) + '</h3><p>' + r.correct + ' benar, ' + bad + ' salah, ' + blank + ' kosong</p><p class="ac-hint">Mode ' + r.mode + ', waktu ' + clock(r.dur) + '</p>' +
      '<div class="ex-act">' + (r.n - r.correct ? '<button class="ac-btn pri" data-ex="redo">Ulangi ' + (r.n - r.correct) + ' soal yang belum benar</button>' : '') + (r.redo ? '' : '<button class="ac-btn" data-ex="setup" data-id="' + esc(r.bank) + '">Kerjakan lagi</button>') + '<button class="ac-btn" data-ex="lib">Kembali ke bank soal</button></div></div></div>';
    h += '<div class="ex-strip">' + s.qs.map(function (q, i) { var v = s.ans[i]; return '<button class="ex-g ' + (v < 0 ? 'skip' : v === q.a ? 'ok' : 'bad') + '" data-ex="jump" data-i="' + i + '" aria-label="Soal ' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') + '</div>';
    h += '<div class="ad-sh"><h2 class="ad-h sm">Pembahasan</h2></div>' + s.qs.map(function (q, i) {
      var v = s.ans[i], st = v < 0 ? 'skip' : v === q.a ? 'ok' : 'bad';
      return '<article class="ex-ri ' + st + '" id="exr' + i + '"><header><span>Soal ' + (i + 1) + '</span><em>' + (st === 'ok' ? 'Benar' : st === 'bad' ? 'Salah' : 'Tidak dijawab') + '</em></header><p class="ex-q sm">' + esc(q.q) + '</p><ul class="ex-rl">' +
        q.o.map(function (t, k) { return '<li class="' + (k === q.a ? 'ok' : k === v ? 'bad' : '') + '"><i>' + LT[k] + '</i><span>' + esc(t) + '</span>' + (k === q.a ? '<b>Jawaban benar</b>' : k === v ? '<b>Jawabanmu</b>' : '') + '</li>'; }).join('') + '</ul>' +
        (q.e ? '<div class="ex-exp"><p>' + esc(q.e) + '</p></div>' : '') + '</article>';
    }).join('');
    return h;
  }

  /* ---------- Impor bank soal ---------- */
  function openImport() {
    var m = document.createElement('div'); m.className = 'ex-ov ac-ov2';
    m.innerHTML = '<form class="ex-imp" novalidate><header><h3>Impor bank soal</h3><button type="button" class="ac-x" data-x aria-label="Tutup">×</button></header>' +
      '<p class="ac-hint">Pilih file .json atau tempel isinya. Bank dengan id yang sama akan diperbarui.</p><input type="file" id="exFile" accept=".json,application/json">' +
      '<textarea id="exJson" rows="9" spellcheck="false" aria-label="Isi JSON" placeholder=\'{"id":"bank-1","title":"Judul","course":"Mata kuliah","questions":[{"q":"Soal","o":["Pilihan A","Pilihan B"],"a":0,"e":"Pembahasan"}]}\'></textarea>' +
      '<p class="ex-err" id="exErr" hidden></p><footer><button type="button" class="ac-btn" data-x>Batal</button><button class="ac-btn pri">Impor</button></footer></form>';
    document.body.appendChild(m);
    var off = function () { m.remove(); }, err = m.querySelector('#exErr'), ta = m.querySelector('#exJson');
    m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
    m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
    m.querySelector('#exFile').addEventListener('change', function (e) { var f = e.target.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { ta.value = fr.result; }; fr.readAsText(f); });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data; try { data = JSON.parse(ta.value); } catch (x) { err.textContent = 'Isi bukan JSON yang valid. Periksa tanda kutip dan koma.'; err.hidden = false; return; }
      var ok = (Array.isArray(data) ? data : [data]).map(norm).filter(Boolean);
      if (!ok.length) { err.textContent = 'Tidak ada soal valid. Setiap soal butuh q, o (minimal 2 pilihan), dan a (indeks atau huruf jawaban).'; err.hidden = false; return; }
      ok.forEach(function (b) { mine = mine.filter(function (x) { return x.id !== b.id; }); mine.push(b); });
      wr(BK, mine); off(); say('Tersimpan', ok.length + ' bank soal ditambahkan'); view = 'lib'; rerender();
    });
    ta.focus();
  }

  /* ---------- Event ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ex]'); if (!b) return;
    var a = b.dataset.ex, d = b.dataset;
    if (a === 'import') return openImport();
    if (a === 'lib') { view = 'lib'; return rerender(); }
    if (a === 'folders') { folder = null; view = 'lib'; return rerender(); }
    if (a === 'folder') { folder = d.c; view = 'lib'; return rerender(); }
    if (a === 'setup') { var sb = bankOf(d.id); if (sb) folder = sb.course || 'Lainnya'; cfg = { id: d.id, mode: 'latihan', n: 'all', min: '', sh: true, so: false }; view = 'setup'; return rerender(); }
    if (a === 'mode') { readCfg(); cfg.mode = d.v; return rerender(false); }
    if (a === 'start') {
      readCfg(); var bk = bankOf(cfg.id); if (!bk) return;
      if (S && !confirm('Sesi yang sedang berjalan akan diganti. Lanjutkan?')) return;
      var n = cfg.n === 'all' ? bk.questions.length : Math.min(+cfg.n, bk.questions.length);
      return start(bk.id, bk.title, bk.questions, { mode: cfg.mode, n: n, min: Math.max(1, +cfg.min || n), sh: cfg.sh, so: cfg.so });
    }
    if (a === 'resume') { view = 'run'; return rerender(); }
    if (a === 'delbank') { if (confirm('Hapus bank soal ini dari perangkat? Riwayat skor tetap tersimpan.')) { mine = mine.filter(function (x) { return x.id !== d.id; }); wr(BK, mine); rerender(false); } return; }
    if (a === 'jump') { var t = gid('exr' + d.i); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'redo') {
      var wrong = R.s.qs.filter(function (q, i) { return R.s.ans[i] !== q.a; });
      return start(R.r.bank, R.r.title + ' (ulangi)', wrong, { mode: 'latihan', n: wrong.length, sh: true, so: false, redo: true });
    }
    if (!S) return;
    if (a === 'pick') return pick(+d.k);
    if (a === 'go') return go(+d.i);
    if (a === 'prev') return go(S.cur - 1);
    if (a === 'next') return go(S.cur + 1);
    if (a === 'flag') { S.flag[S.cur] = !S.flag[S.cur]; return rerender(false); }
    if (a === 'finish') return finish(false);
    if (a === 'quit') { if (!confirm('Keluar dari sesi ini? Jawabanmu tidak akan disimpan.')) return; clearInterval(tm); S = null; view = 'lib'; return rerender(); }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'exMin' && cfg) { e.target.dataset.t = '1'; cfg.min = e.target.value; } });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'exN' || !cfg) return;
    var m = gid('exMin'), bk = bankOf(cfg.id); if (m && !m.dataset.t && bk) m.value = e.target.value === 'all' ? bk.questions.length : e.target.value;
  });
  document.addEventListener('keydown', function (e) {
    var t = gid('exTm'); if (!S || view !== 'run' || !t || !t.offsetParent || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key.toLowerCase(), i = 'abcdef'.indexOf(k); if (k.length !== 1) i = -1;
    if (i >= 0 && i < S.qs[S.cur].o.length) { pick(i); e.preventDefault(); }
    else if (e.key === 'ArrowRight') go(S.cur + 1); else if (e.key === 'ArrowLeft') go(S.cur - 1);
  });

  MO.examView = function () { return view === 'setup' && cfg ? vSetup() : view === 'run' && S ? vRun() : view === 'res' && R ? vRes() : vLib(); };
})();
;
/* MyOffice — Work Office, Organization, Project Management (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice = window.MyOffice || {}; MO.routes = MO.routes || {};
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var has = function (v) { return v !== '' && v != null && !isNaN(+v); };
  var fmt = function (n) { return n == null ? '—' : String(Math.round(n * 10) / 10); };
  var rp = function (n) { return 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID'); };
  var fd = function (v) { if (!v) return '—'; var d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  var todayS = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var by = function (a, id) { return a.filter(function (x) { return x.id === id; })[0]; };
  var el = function (c, h) { var d = document.createElement('div'); d.className = c; d.innerHTML = h; return d; };
  var link = function (v) { return /^https?:\/\//i.test(v || '') ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\//i, '').slice(0, 40)) + '</a>' : esc(v || ''); };
  var btns = function (e, id) { return '<div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="' + e + '" data-id="' + id + '">Edit</button><button class="ac-btn sm danger" data-act="del" data-e="' + e + '" data-id="' + id + '">Hapus</button></div>'; };
  var empty = function (t) { return '<div class="ac-empty">' + t + '</div>'; };
  var bar = function (t, b) { return '<div class="ac-bar"><p class="ac-hint">' + t + '</p>' + (b || '') + '</div>'; };
  var add = function (e, label, pk, pv) { return '<button class="ac-btn pri" data-act="add" data-e="' + e + '"' + (pk ? ' data-pk="' + pk + '" data-pv="' + pv + '"' : '') + '>+ ' + label + '</button>'; };
  var chips = function (list, cur, f) { return '<div class="ac-chips">' + list.map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x === cur) + '" data-act="filt" data-f="' + f + '" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>'; };
  var prog = function (p) { return p == null ? '<small>Belum ada data</small>' : '<div class="ac-track"><i style="width:' + Math.min(100, p) + '%"></i></div>'; };
  var opt = function (a) { return a.map(function (x) { return [x, x]; }); };
  var stat = function (b, s) { return '<div class="ac-stat"><b>' + b + '</b><span>' + s + '</span></div>'; };
  var badge = function (t, c) { return '<span class="ac-badge ' + (c || '') + '">' + esc(t) + '</span>'; };

  /* ---------- Kerangka jendela generik ---------- */
  function App(title, key, seed, def) {
    var app = {}, D, ov, body, st = {};
    try { D = JSON.parse(localStorage.getItem(key)); } catch (e) { }
    D = D || seed(); app.D = D; app.st = st;
    var C = def(app), tab = C.tabs[0][0];
    var save = app.save = function () { try { localStorage.setItem(key, JSON.stringify(D)); } catch (e) { MO.msg('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } };

    function build() {
      ov = el('ac-ov' + (C.skin ? ' ' + C.skin : ''), '<section class="ac-win" role="dialog" aria-modal="true" aria-label="' + title + '"><header><div><h2>' + title + '</h2><p></p></div><button class="ac-x" data-act="close" aria-label="Tutup">×</button></header>' +
        (C.tabs.length > 1 ? '<nav class="ac-tabs">' + C.tabs.map(function (t) { return '<button class="ac-tab" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</nav>' : '') + '<div class="ac-body"></div></section>');
      ov.hidden = true; document.body.appendChild(ov); body = ov.querySelector('.ac-body');
      ov.addEventListener('click', onClick);
      ov.addEventListener('input', function (e) {
        var k = e.target.dataset && e.target.dataset.in; if (!k) return;
        st[k] = e.target.value; var pos = e.target.selectionStart; render();
        var n = body.querySelector('[data-in="' + k + '"]'); if (n && n.tagName === 'INPUT' && n.type === 'text' || n && n.type === 'search') { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } }
      });
      ov.addEventListener('change', function (e) {
        var t = e.target, a = t.dataset && t.dataset.chg; if (!a || !C.act) return;
        C.act(a, Object.assign({}, t.dataset, { v: t.value }), t); save(); render();
      });
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden && !document.querySelector('.ac-ov2, .ac-soon:not([hidden])')) close(); });
    }
    function open() { if (!ov) build(); ov.hidden = false; document.body.style.overflow = 'hidden'; render(); ov.querySelector('.ac-x').focus(); }
    function close() { if (ov) ov.hidden = true; document.body.style.overflow = ''; }
    function render() {
      if (app.onChange) app.onChange();
      if (!ov) return;
      C.tabs.forEach(function (t) { var b = ov.querySelector('[data-t="' + t[0] + '"]'); if (b) b.setAttribute('aria-selected', t[0] === tab); });
      ov.querySelector('header p').textContent = C.sub ? C.sub() : '';
      var top = body.scrollTop;
      body.innerHTML = C.tabs.filter(function (t) { return t[0] === tab; })[0][2]();
      body.scrollTop = top;
    }
    function fld(f, v) {
      var at = 'id="f_' + f.k + '" name="' + f.k + '"' + (f.req ? ' required' : ''), inp;
      if (f.t === 'textarea') inp = '<textarea ' + at + ' rows="3">' + esc(v) + '</textarea>';
      else if (f.t === 'select') { var o = typeof f.o === 'function' ? f.o(v) : f.o; inp = '<select ' + at + '>' + o.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>'; }
      else inp = '<input ' + at + ' type="' + f.t + '" value="' + esc(v) + '"' + (f.t === 'number' ? ' step="' + (f.step || 'any') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<label class="' + (f.full ? 'full' : '') + '"><span>' + f.l + (f.req ? ' *' : '') + '</span>' + inp + '</label>';
    }
    function form(ent, id, preset) {
      var sp = C.specs[ent], it = id ? by(D[ent], id) : Object.assign({}, sp.def, preset || {});
      if (!id && ent === 'log') it.date = todayS();
      var before = id ? JSON.parse(JSON.stringify(it)) : null;
      var m = el('ac-ov ac-ov2' + (C.skin ? ' ' + C.skin : ''), '<form class="ac-win ac-form" novalidate><header><h2>' + (id ? 'Edit ' : 'Tambah ') + sp.title + '</h2><button type="button" class="ac-x" data-x aria-label="Tutup">×</button></header><div class="ac-fields">' +
        sp.fields.map(function (f) { var v = it[f.k]; if (f.bool) v = String(!!v); return fld(f, v == null ? '' : v); }).join('') + '</div><footer><button type="button" class="ac-btn" data-x>Batal</button><button class="ac-btn pri">Simpan</button></footer></form>');
      document.body.appendChild(m);
      var off = function () { m.remove(); };
      m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
      m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
      m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
      m.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target, bad = null, rec = id ? Object.assign({}, it) : { id: uid() };
        sp.fields.forEach(function (fd2) {
          var inp = f.elements[fd2.k], v = inp.value.trim();
          if (fd2.req && !v && !bad) bad = inp;
          rec[fd2.k] = fd2.bool ? v === 'true' : fd2.t === 'number' ? (v === '' ? '' : +v) : v;
        });
        if (bad) { bad.focus(); if (bad.reportValidity) bad.reportValidity(); return; }
        var err = C.validate && C.validate(ent, rec, !id); if (err) { MO.msg('Periksa data', err); return; }
        if (id) Object.assign(it, rec); else D[ent].push(rec);
        if (C.saved) C.saved(ent, id ? it : rec, !id, before);
        save(); off(); render();
      });
      var first = m.querySelector('input,select,textarea'); if (first) first.focus();
    }
    function rm(ent, id) {
      ((C.cascade || {})[ent] || []).forEach(function (c) { D[c[0]].filter(function (x) { return x[c[1]] === id; }).forEach(function (x) { rm(c[0], x.id); }); });
      D[ent] = D[ent].filter(function (x) { return x.id !== id; });
    }
    function del(ent, id) {
      var it = by(D[ent], id); if (!it) return;
      var blk = C.canDel && C.canDel(ent, id); if (blk) return MO.msg('Tidak bisa dihapus', blk);
      if (!confirm('Hapus "' + (it.name || it.title || it.item || it.task || C.specs[ent].title) + '"?' + ((C.cascade || {})[ent] ? ' Data turunannya ikut terhapus.' : ''))) return;
      rm(ent, id); if (st.proj === id) st.proj = null; save(); render();
    }
    function onClick(e) {
      var b = e.target.closest('[data-act]'); if (!b || !ov.contains(b)) return;
      var a = b.dataset.act, d = b.dataset;
      if (a === 'close') return close();
      if (a === 'tab') { tab = d.t; return render(); }
      if (a === 'add') {
        var g = C.guard && C.guard(d.e); if (g) return MO.msg(g[0], g[1]);
        var pre = {}; if (d.pk) pre[d.pk] = d.pv; if (d.pre) pre = Object.assign(pre, JSON.parse(d.pre)); return form(d.e, null, pre);
      }
      if (a === 'edit') return form(d.e, d.id);
      if (a === 'del') return del(d.e, d.id);
      if (a === 'filt') { st[d.f] = d.v; return render(); }
      if (C.act) C.act(a, d, e.target, e);
      save(); render();
    }
    app.form = form; app.render = render; app.del = del; app.close = close;
    return { open: open, app: app };
  }

  /* =====================================================
     WORK OFFICE
     ===================================================== */
  var work = App('Work Office', 'mo-work-v1', function () { return { client: [], job: [], wtask: [], log: [], wdoc: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var JS = ['Prospek', 'Berjalan', 'Review', 'Selesai', 'Dibatalkan'], IS = ['Tidak relevan', 'Belum ditagih', 'Sudah ditagih', 'Sudah diterima'], TS = ['Belum dikerjakan', 'Sedang dikerjakan', 'Selesai'];
    var DT = ['Kontrak', 'Invoice', 'Brief', 'Deliverable', 'Lainnya'];
    var jobOpts = function () { return [['', '— Pilih pekerjaan —']].concat(D.job.map(function (j) { return [j.id, j.title]; })); };
    var jn = function (id) { var j = by(D.job, id); return j ? j.title : '—'; };
    var cn = function (id) { var c = by(D.client, id); return c ? c.name : 'Tanpa klien'; };
    var hrs = function (id) { return D.log.filter(function (l) { return l.jobId === id; }).reduce(function (a, l) { return a + (+l.hours || 0); }, 0); };
    var jp = function (id) { var t = D.wtask.filter(function (x) { return x.jobId === id; }); return t.length ? t.filter(function (x) { return x.status === 'Selesai'; }).length / t.length * 100 : null; };
    var specs = {
      client: { title: 'Klien', def: {}, fields: [{ k: 'name', l: 'Nama klien / pemberi kerja', t: 'text', req: 1, full: 1 }, { k: 'contact', l: 'Kontak (email / telepon)', t: 'text', full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      job: { title: 'Pekerjaan', def: { status: 'Berjalan', incomeStatus: 'Tidak relevan' }, fields: [
        { k: 'title', l: 'Nama pekerjaan / proyek', t: 'text', req: 1, full: 1 },
        { k: 'clientId', l: 'Klien', t: 'select', o: function () { return [['', '— Internal / tanpa klien —']].concat(D.client.map(function (c) { return [c.id, c.name]; })); } },
        { k: 'status', l: 'Status', t: 'select', o: opt(JS) },
        { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'deadline', l: 'Tenggat waktu', t: 'date' }, { k: 'estHours', l: 'Estimasi durasi (jam)', t: 'number', min: 0, step: '0.25' },
        { k: 'income', l: 'Pendapatan pekerjaan (Rp)', t: 'number', min: 0 }, { k: 'incomeStatus', l: 'Status pendapatan', t: 'select', o: opt(IS) },
        { k: 'txRef', l: 'Referensi transaksi keuangan (opsional)', t: 'text', full: 1, ph: 'ID/nomor transaksi di modul Finance nanti' },
        { k: 'notes', l: 'Catatan pekerjaan', t: 'textarea', full: 1 }] },
      wtask: { title: 'Tugas', def: { status: 'Belum dikerjakan' }, fields: [
        { k: 'title', l: 'Daftar tugas — judul', t: 'text', req: 1, full: 1 }, { k: 'jobId', l: 'Pekerjaan', t: 'select', o: jobOpts, req: 1 }, { k: 'status', l: 'Status', t: 'select', o: opt(TS) },
        { k: 'deadline', l: 'Tenggat waktu', t: 'date' }, { k: 'estHours', l: 'Estimasi (jam)', t: 'number', min: 0, step: '0.25' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      log: { title: 'Jam Kerja', def: {}, fields: [
        { k: 'jobId', l: 'Pekerjaan', t: 'select', o: jobOpts, req: 1, full: 1 }, { k: 'date', l: 'Tanggal', t: 'date', req: 1 }, { k: 'hours', l: 'Durasi (jam)', t: 'number', req: 1, min: 0, step: '0.25' }, { k: 'notes', l: 'Catatan', t: 'text', full: 1 }] },
      wdoc: { title: 'Dokumen', def: { type: 'Lainnya' }, fields: [
        { k: 'title', l: 'Nama dokumen', t: 'text', req: 1, full: 1 }, { k: 'jobId', l: 'Pekerjaan', t: 'select', o: jobOpts }, { k: 'type', l: 'Jenis', t: 'select', o: opt(DT) },
        { k: 'link', l: 'Tautan / lampiran', t: 'url', full: 1, ph: 'https://…' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] }
    };
    var tabs = [
      ['client', 'Klien', function () {
        return bar('Daftar klien dan pemberi kerja.', add('client', 'Klien')) + (D.client.length ? D.client.map(function (c) {
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(c.name) + '</h3><small style="opacity:.7">' + esc(c.contact || '') + '</small></div>' + btns('client', c.id) + '</div><div class="ac-meta"><span>Pekerjaan: <b>' + D.job.filter(function (j) { return j.clientId === c.id; }).length + '</b></span></div>' + (c.notes ? '<div class="ac-notes">' + esc(c.notes) + '</div>' : '') + '</article>';
        }).join('') : empty('Belum ada klien.'));
      }],
      ['job', 'Pekerjaan', function () {
        var L = D.job.filter(function (j) { return !st.js || st.js === 'Semua' || j.status === st.js; }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
        var h = bar('Progres dihitung dari tugas yang benar-benar selesai.', add('job', 'Pekerjaan')) + chips(['Semua'].concat(JS), st.js || 'Semua', 'js');
        if (!L.length) return h + empty('Belum ada pekerjaan.');
        return h + L.map(function (j) {
          var p = jp(j.id), tn = D.wtask.filter(function (x) { return x.jobId === j.id; }), late = j.deadline && j.deadline < todayS() && j.status !== 'Selesai' && j.status !== 'Dibatalkan', a = hrs(j.id);
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(j.title) + badge(j.status, j.status === 'Selesai' ? 'on' : '') + (late ? badge('Lewat tenggat', 'late') : '') + '</h3><small style="opacity:.7">' + esc(cn(j.clientId)) + '</small></div>' + btns('job', j.id) + '</div>' +
            '<div class="ac-meta"><span>Tenggat: <b>' + fd(j.deadline) + '</b></span><span>Jam: <b>' + fmt(a) + ' / ' + (has(j.estHours) ? fmt(+j.estHours) : '—') + '</b> (aktual / estimasi)</span>' + (+j.income > 0 && j.incomeStatus !== 'Tidak relevan' ? '<span>Pendapatan pekerjaan: <b>' + rp(j.income) + '</b> · ' + esc(j.incomeStatus) + '</span>' : '') + '</div>' +
            prog(p) + (p != null ? '<small>' + tn.filter(function (x) { return x.status === 'Selesai'; }).length + ' dari ' + tn.length + ' tugas selesai (' + fmt(p) + '%)</small>' : '') +
            (j.desc ? '<div class="ac-notes">' + esc(j.desc) + '</div>' : '') + (j.notes ? '<div class="ac-notes">Catatan: ' + esc(j.notes) + '</div>' : '') +
            '<div style="margin-top:8px"><button class="ac-btn sm" data-act="add" data-e="wtask" data-pk="jobId" data-pv="' + j.id + '">+ Tugas</button> <button class="ac-btn sm" data-act="add" data-e="log" data-pk="jobId" data-pv="' + j.id + '">+ Jam kerja</button></div></article>';
        }).join('');
      }],
      ['task', 'Tugas', function () {
        var L = D.wtask.filter(function (t) { return !st.ts || st.ts === 'Semua' || t.status === st.ts; }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
        var h = bar('Centang untuk menandai selesai.', add('wtask', 'Tugas')) + chips(['Semua'].concat(TS), st.ts || 'Semua', 'ts');
        if (!L.length) return h + empty('Belum ada tugas.');
        return h + L.map(function (t) {
          var late = t.deadline && t.deadline < todayS() && t.status !== 'Selesai';
          return '<div class="ac-item' + (t.status === 'Selesai' ? ' done' : '') + '"><input type="checkbox" data-act="tgw" data-id="' + t.id + '"' + (t.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div><button class="t" data-act="edit" data-e="wtask" data-id="' + t.id + '">' + esc(t.title) + '</button>' + (late ? badge('Terlambat', 'late') : '') +
            '<small>' + esc(jn(t.jobId)) + ' · Tenggat: ' + fd(t.deadline) + ' · Estimasi: ' + (has(t.estHours) ? t.estHours + ' jam' : '—') + ' · ' + esc(t.status) + '</small>' + (t.notes ? '<small>' + esc(t.notes) + '</small>' : '') + '</div>' + btns('wtask', t.id) + '</div>';
        }).join('');
      }],
      ['log', 'Jam Kerja', function () {
        var tot = D.log.reduce(function (a, l) { return a + (+l.hours || 0); }, 0), h = bar('Catat jam kerja aktual dan bandingkan dengan estimasi.', add('log', 'Jam kerja'));
        if (!D.log.length) return h + empty('Belum ada catatan jam kerja.');
        h += '<div class="ac-grid">' + stat(fmt(tot), 'Total jam tercatat') + stat(D.job.filter(function (j) { return hrs(j.id) > 0; }).length, 'Pekerjaan dengan jam tercatat') + '</div><div class="ac-bars">';
        D.job.filter(function (j) { return hrs(j.id) > 0; }).forEach(function (j) {
          var a = hrs(j.id), e = +j.estHours || 0, mx = Math.max(a, e, 1);
          h += '<div class="ac-bar2"><span>' + esc(j.title) + '</span><div class="ac-pair"><div class="ac-track"><i style="width:' + a / mx * 100 + '%"></i></div>' + (e ? '<div class="ac-track"><i class="alt" style="width:' + e / mx * 100 + '%"></i></div>' : '') + '</div><span>' + fmt(a) + ' / ' + (e ? fmt(e) : '—') + ' jam</span></div>';
        });
        h += '</div><div class="ac-legend" style="margin-top:8px"><span><i></i>Aktual</span><span><i class="alt"></i>Estimasi</span></div><div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Tanggal</th><th>Pekerjaan</th><th>Jam</th><th>Catatan</th><th></th></tr>' +
          D.log.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function (l) { return '<tr><td>' + fd(l.date) + '</td><td>' + esc(jn(l.jobId)) + '</td><td>' + l.hours + '</td><td>' + esc(l.notes || '') + '</td><td>' + '<button class="ac-btn sm" data-act="edit" data-e="log" data-id="' + l.id + '">Edit</button> <button class="ac-btn sm danger" data-act="del" data-e="log" data-id="' + l.id + '">Hapus</button></td></tr>'; }).join('') + '</table></div>';
        return h;
      }],
      ['doc', 'Dokumen', function () {
        var L = D.wdoc.filter(function (d) { return !st.dt || st.dt === 'Semua' || d.type === st.dt; }), h = bar('Dokumen pendukung pekerjaan.', add('wdoc', 'Dokumen')) + chips(['Semua'].concat(DT), st.dt || 'Semua', 'dt');
        if (!L.length) return h + empty('Belum ada dokumen.');
        return h + L.map(function (d) { return '<div class="ac-item"><div><b>' + esc(d.title) + '</b>' + badge(d.type) + '<small>' + esc(jn(d.jobId)) + (d.link ? ' · ' + link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' + btns('wdoc', d.id) + '</div>'; }).join('');
      }],
      ['inc', 'Pendapatan', function () {
        var js = D.job.filter(function (j) { return +j.income > 0 && j.incomeStatus !== 'Tidak relevan'; });
        var sum = function (s) { return js.filter(function (j) { return j.incomeStatus === s; }).reduce(function (a, j) { return a + +j.income; }, 0); };
        return '<div class="ac-warn" style="border-color:rgba(127,140,170,.5);background:rgba(127,140,170,.1)"><span><b>Dipisahkan dari pemasukan pribadi.</b> Angka di sini hanya pendapatan pekerjaan. Tidak ada yang otomatis masuk ke pemasukan pribadi; hubungan ke modul keuangan nanti lewat referensi transaksi per pekerjaan.</span></div>' +
          '<div class="ac-grid">' + stat(rp(sum('Sudah diterima')), 'Sudah diterima') + stat(rp(sum('Sudah ditagih')), 'Sudah ditagih, belum diterima') + stat(rp(sum('Belum ditagih')), 'Belum ditagih') + '</div>' +
          (js.length ? '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Pekerjaan</th><th>Klien</th><th>Jumlah</th><th>Status</th><th>Ref. transaksi</th></tr>' + js.map(function (j) { return '<tr class="ac-click" data-act="edit" data-e="job" data-id="' + j.id + '"><td>' + esc(j.title) + '</td><td>' + esc(cn(j.clientId)) + '</td><td>' + rp(j.income) + '</td><td>' + esc(j.incomeStatus) + '</td><td>' + esc(j.txRef || '—') + '</td></tr>'; }).join('') + '</table></div>' : empty('Belum ada pekerjaan dengan pendapatan. Isi di form Pekerjaan.'));
      }]
    ];
    return {
      skin: 'wo-skin', specs: specs, tabs: tabs, sub: function () { return 'Pendapatan pekerjaan terpisah dari pemasukan pribadi'; },
      cascade: { client: [], job: [['wtask', 'jobId'], ['log', 'jobId'], ['wdoc', 'jobId']] },
      guard: function (e) { if (['wtask', 'log'].indexOf(e) > -1 && !D.job.length) return ['Belum ada pekerjaan', 'Tambahkan pekerjaan terlebih dahulu.']; },
      act: function (a, d, t) { if (a === 'tgw') { var x = by(D.wtask, d.id); x.status = t.checked ? 'Selesai' : 'Belum dikerjakan'; } }
    };
  });

  /* =====================================================
     ORGANIZATION
     ===================================================== */
  var org = App('Organization', 'mo-org-v1', function () { return { org: [], meeting: [], followup: [], budget: [], odoc: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var FS = ['Belum', 'Berjalan', 'Selesai'], OD = ['Proposal', 'Notulen', 'Laporan pertanggungjawaban', 'Surat', 'Materi presentasi', 'Dokumen lainnya'];
    var orgOpts = function () { return [['', '— Pilih organisasi —']].concat(D.org.map(function (o) { return [o.id, o.name]; })); };
    var on = function (id) { var o = by(D.org, id); return o ? o.name : '—'; };
    var specs = {
      org: { title: 'Organisasi', def: {}, fields: [{ k: 'name', l: 'Nama organisasi', t: 'text', req: 1, full: 1 }, { k: 'period', l: 'Periode kepengurusan', t: 'text', ph: '2025–2026' }, { k: 'role', l: 'Jabatan saya', t: 'text' }, { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      meeting: { title: 'Rapat', def: {}, fields: [{ k: 'title', l: 'Nama rapat', t: 'text', req: 1, full: 1 }, { k: 'orgId', l: 'Organisasi', t: 'select', o: orgOpts, req: 1 }, { k: 'date', l: 'Tanggal rapat', t: 'date', req: 1 }, { k: 'agenda', l: 'Agenda', t: 'textarea', full: 1 }, { k: 'notes', l: 'Catatan rapat', t: 'textarea', full: 1 }, { k: 'decisions', l: 'Keputusan', t: 'textarea', full: 1 }] },
      followup: { title: 'Tindak Lanjut', def: { status: 'Belum' }, fields: [{ k: 'task', l: 'Tindak lanjut', t: 'text', req: 1, full: 1 }, { k: 'meetingId', l: 'Rapat', t: 'select', req: 1, o: function () { return [['', '— Pilih rapat —']].concat(D.meeting.map(function (m) { return [m.id, m.title + ' (' + fd(m.date) + ')']; })); }, full: 1 }, { k: 'pic', l: 'Penanggung jawab', t: 'text' }, { k: 'due', l: 'Tenggat', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: opt(FS) }] },
      budget: { title: 'Pos Anggaran', def: {}, fields: [{ k: 'item', l: 'Pos / keterangan anggaran', t: 'text', req: 1, full: 1 }, { k: 'orgId', l: 'Organisasi', t: 'select', o: orgOpts, req: 1 }, { k: 'date', l: 'Tanggal', t: 'date' }, { k: 'planned', l: 'Rencana anggaran (Rp)', t: 'number', min: 0 }, { k: 'actual', l: 'Pengeluaran aktual (Rp)', t: 'number', min: 0 }, { k: 'proof', l: 'Catatan bukti transaksi', t: 'textarea', full: 1 }, { k: 'link', l: 'Tautan bukti', t: 'url', full: 1 }] },
      odoc: { title: 'Dokumen', def: { type: 'Proposal' }, fields: [{ k: 'title', l: 'Judul dokumen', t: 'text', req: 1, full: 1 }, { k: 'orgId', l: 'Organisasi', t: 'select', o: orgOpts, req: 1 }, { k: 'type', l: 'Jenis', t: 'select', o: opt(OD), req: 1 }, { k: 'date', l: 'Tanggal', t: 'date' }, { k: 'link', l: 'Tautan / lampiran', t: 'url', ph: 'https://…' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] }
    };
    var tabs = [
      ['org', 'Profil', function () {
        return bar('Profil organisasi yang Anda ikuti.', add('org', 'Organisasi')) + (D.org.length ? D.org.map(function (o) {
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(o.name) + '</h3></div>' + btns('org', o.id) + '</div><div class="ac-meta"><span>Periode: <b>' + esc(o.period || '—') + '</b></span><span>Jabatan: <b>' + esc(o.role || '—') + '</b></span><span>Rapat: <b>' + D.meeting.filter(function (m) { return m.orgId === o.id; }).length + '</b></span><span>Dokumen: <b>' + D.odoc.filter(function (m) { return m.orgId === o.id; }).length + '</b></span></div>' + (o.desc ? '<div class="ac-notes">' + esc(o.desc) + '</div>' : '') + (o.notes ? '<div class="ac-notes">Catatan: ' + esc(o.notes) + '</div>' : '') + '</article>';
        }).join('') : empty('Belum ada organisasi.'));
      }],
      ['meet', 'Rapat', function () {
        var h = bar('Agenda, catatan, keputusan, dan tindak lanjut beserta penanggung jawabnya.', add('meeting', 'Rapat'));
        if (!D.meeting.length) return h + empty('Belum ada rapat.');
        return h + D.meeting.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function (m) {
          var fs = D.followup.filter(function (f) { return f.meetingId === m.id; });
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(m.title) + '</h3><small style="opacity:.7">' + esc(on(m.orgId)) + ' · ' + fd(m.date) + '</small></div>' + btns('meeting', m.id) + '</div>' +
            (m.agenda ? '<div class="ac-notes"><b>Agenda</b>\n' + esc(m.agenda) + '</div>' : '') + (m.notes ? '<div class="ac-notes"><b>Catatan</b>\n' + esc(m.notes) + '</div>' : '') + (m.decisions ? '<div class="ac-notes"><b>Keputusan</b>\n' + esc(m.decisions) + '</div>' : '') +
            fs.map(function (f) { return '<div class="ac-item' + (f.status === 'Selesai' ? ' done' : '') + '" style="margin-bottom:6px"><input type="checkbox" data-act="tgf" data-id="' + f.id + '"' + (f.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div><button class="t" data-act="edit" data-e="followup" data-id="' + f.id + '">' + esc(f.task) + '</button><small>PJ: ' + esc(f.pic || '—') + ' · Tenggat: ' + fd(f.due) + ' · ' + esc(f.status) + '</small></div><button class="ac-btn sm danger" data-act="del" data-e="followup" data-id="' + f.id + '">×</button></div>'; }).join('') +
            '<button class="ac-btn sm" data-act="add" data-e="followup" data-pk="meetingId" data-pv="' + m.id + '">+ Tindak lanjut</button></article>';
        }).join('');
      }],
      ['bud', 'Anggaran', function () {
        var h = bar('Selisih = rencana − aktual. Anggaran organisasi tidak tercampur dengan keuangan pribadi.', add('budget', 'Pos anggaran'));
        if (!D.budget.length) return h + empty('Belum ada pos anggaran.');
        return h + D.org.filter(function (o) { return D.budget.some(function (b) { return b.orgId === o.id; }); }).map(function (o) {
          var bs = D.budget.filter(function (b) { return b.orgId === o.id; }), P = 0, A = 0;
          bs.forEach(function (b) { P += +b.planned || 0; A += +b.actual || 0; });
          var diff = function (x) { return '<b style="color:' + (x < 0 ? '#d0443e' : 'inherit') + '">' + (x < 0 ? '−' : '') + rp(Math.abs(x)) + '</b>'; };
          return '<article class="ac-card"><h3>' + esc(o.name) + '</h3><div class="ac-meta"><span>Rencana: <b>' + rp(P) + '</b></span><span>Aktual: <b>' + rp(A) + '</b></span><span>Selisih: ' + diff(P - A) + (P - A < 0 ? ' (melebihi anggaran)' : ' (sisa)') + '</span></div>' +
            '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Pos</th><th>Rencana</th><th>Aktual</th><th>Selisih</th><th>Bukti</th></tr>' + bs.map(function (b) { return '<tr class="ac-click" data-act="edit" data-e="budget" data-id="' + b.id + '"><td>' + esc(b.item) + '</td><td>' + rp(b.planned) + '</td><td>' + rp(b.actual) + '</td><td>' + diff((+b.planned || 0) - (+b.actual || 0)) + '</td><td>' + esc(b.proof || '') + (b.link ? ' ' + link(b.link) : '') + '</td></tr>'; }).join('') + '</table></div></article>';
        }).join('');
      }],
      ['doc', 'Dokumen', function () {
        var L = D.odoc.filter(function (d) { return !st.od || st.od === 'Semua' || d.type === st.od; }), h = bar('Proposal, notulen, LPJ, surat, materi presentasi, dan dokumen lain.', add('odoc', 'Dokumen')) + chips(['Semua'].concat(OD), st.od || 'Semua', 'od');
        if (!L.length) return h + empty('Belum ada dokumen.');
        return h + L.map(function (d) { return '<div class="ac-item"><div><b>' + esc(d.title) + '</b>' + badge(d.type) + '<small>' + esc(on(d.orgId)) + ' · ' + fd(d.date) + (d.link ? ' · ' + link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' + btns('odoc', d.id) + '</div>'; }).join('');
      }]
    ];
    return {
      skin: 'es-skin', specs: specs, tabs: tabs, sub: function () { return D.org.length ? D.org.map(function (o) { return o.name; }).join(' · ') : 'Belum ada organisasi'; },
      cascade: { org: [['meeting', 'orgId'], ['budget', 'orgId'], ['odoc', 'orgId']], meeting: [['followup', 'meetingId']] },
      guard: function (e) {
        if (['meeting', 'budget', 'odoc'].indexOf(e) > -1 && !D.org.length) return ['Belum ada organisasi', 'Tambahkan profil organisasi terlebih dahulu.'];
        if (e === 'followup' && !D.meeting.length) return ['Belum ada rapat', 'Tambahkan rapat terlebih dahulu.'];
      },
      act: function (a, d, t) { if (a === 'tgf') { by(D.followup, d.id).status = t.checked ? 'Selesai' : 'Belum'; } }
    };
  });

  /* =====================================================
     PROJECT MANAGEMENT
     ===================================================== */
  var proj = App('Project Management', 'mo-proj-v1', function () { return { proj: [], ptask: [], ms: [], pfile: [] }; }, function (app) {
    var D = app.D, st = app.st;
    if (!D.promo || !D.promo.length) D.promo = [{ id: 'promo', emoji: '🏁', title: 'Tuntaskan dulu, baru rayakan', text: 'Pilih satu proyek dan selesaikan hari ini.', btn: 'Buka sorotan' }];
    var PC = { Akademik: ['🎓', '#3d6bff', '#8ab4ff'], Pekerjaan: ['💼', '#1d2233', '#4a5675'], Organisasi: ['🏛️', '#0f9d7c', '#6fe0bd'], Pribadi: ['⭐', '#ff6a3d', '#ffb36b'] };
    var pc = function (p) { return PC[p.area] || PC.Pribadi; }, live = function (p) { return p.status !== 'Selesai' && p.status !== 'Dibatalkan'; };
    var PRN = { Tinggi: 0, Sedang: 1, Rendah: 2 }, prk = function (p) { return PRN[p.priority] == null ? 1 : PRN[p.priority]; };
    var AREAS = ['Akademik', 'Pekerjaan', 'Organisasi', 'Pribadi'], PS = ['Rencana', 'Berjalan', 'Ditunda', 'Selesai', 'Dibatalkan'], TS = ['Belum', 'Dikerjakan', 'Selesai'];
    var PV = [['overview', 'Project Overview'], ['board', 'Task Board'], ['timeline', 'Timeline'], ['ms', 'Milestones'], ['files', 'Files & Notes'], ['ana', 'Progress Analytics']];
    var projOpts = function () { return [['', '— Pilih proyek —']].concat(D.proj.map(function (p) { return [p.id, p.name]; })); };
    var log = function (id, m) { var p = by(D.proj, id); if (p) { p.hist = p.hist || []; p.hist.unshift({ t: new Date().toISOString(), m: m }); p.hist = p.hist.slice(0, 100); } };
    var tasksOf = function (id) { return D.ptask.filter(function (t) { return t.projId === id; }); };
    var msOf = function (id) { return D.ms.filter(function (t) { return t.projId === id; }); };
    function pp(p) {
      var ms = p.basis === 'ms', a = ms ? msOf(p.id) : tasksOf(p.id), dn = a.filter(function (x) { return ms ? x.done : x.status === 'Selesai'; }).length;
      return { n: a.length, done: dn, pct: a.length ? dn / a.length * 100 : null, unit: ms ? 'milestone' : 'tugas' };
    }
    var specs = {
      proj: { title: 'Proyek', def: { area: 'Pribadi', status: 'Rencana', priority: 'Sedang', basis: 'tasks' }, fields: [
        { k: 'name', l: 'Nama proyek', t: 'text', req: 1, full: 1 }, { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'area', l: 'Area', t: 'select', o: opt(AREAS) }, { k: 'status', l: 'Status', t: 'select', o: opt(PS) }, { k: 'priority', l: 'Prioritas', t: 'select', o: opt(['Rendah', 'Sedang', 'Tinggi']) },
        { k: 'basis', l: 'Progres dihitung dari', t: 'select', o: [['tasks', 'Tugas yang selesai'], ['ms', 'Milestone yang selesai']] },
        { k: 'start', l: 'Tanggal mulai', t: 'date' }, { k: 'target', l: 'Target selesai', t: 'date' }, { k: 'budget', l: 'Anggaran (Rp, jika perlu)', t: 'number', min: 0, full: 1 }, { k: 'emoji', l: 'Emoji sampul', t: 'text', ph: '🎓' }, { k: 'pin', l: 'Utamakan di banner Sorotan', t: 'select', bool: 1, o: [['false', 'Tidak'], ['true', 'Ya']] }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      ptask: { title: 'Tugas', def: { status: 'Belum' }, fields: [{ k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 }, { k: 'projId', l: 'Proyek', t: 'select', o: projOpts, req: 1 }, { k: 'status', l: 'Status', t: 'select', o: opt(TS) }, { k: 'due', l: 'Tenggat', t: 'date' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      ms: { title: 'Milestone', def: { done: false }, fields: [{ k: 'title', l: 'Milestone', t: 'text', req: 1, full: 1 }, { k: 'projId', l: 'Proyek', t: 'select', o: projOpts, req: 1 }, { k: 'date', l: 'Tanggal target', t: 'date' }, { k: 'done', l: 'Status', t: 'select', bool: 1, o: [['false', 'Belum tercapai'], ['true', 'Tercapai']] }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      promo: { title: 'Kartu Promo', def: {}, fields: [{ k: 'title', l: 'Judul', t: 'text', req: 1, full: 1 }, { k: 'emoji', l: 'Emoji', t: 'text' }, { k: 'btn', l: 'Teks tombol', t: 'text' }, { k: 'text', l: 'Kalimat pendukung', t: 'text', full: 1 }] },
      pfile: { title: 'Dokumen / Catatan', def: { kind: 'Dokumen' }, fields: [{ k: 'title', l: 'Judul', t: 'text', req: 1, full: 1 }, { k: 'projId', l: 'Proyek', t: 'select', o: projOpts, req: 1 }, { k: 'kind', l: 'Jenis', t: 'select', o: opt(['Dokumen', 'Catatan']) }, { k: 'link', l: 'Tautan dokumen', t: 'url', full: 1, ph: 'https://…' }, { k: 'text', l: 'Isi catatan', t: 'textarea', full: 1 }] }
    };

    function banner(p, n) {
      var g = pp(p), c = pc(p);
      return '<section class="pj-ban" style="--c1:' + c[1] + ';--c2:' + c[2] + '"><span class="pj-bem">' + esc(p.emoji || c[0]) + '</span><div class="pj-bt"><span class="pj-tag">' + esc(p.area) + ' · ' + esc(p.status) + '</span><h3>' + esc(p.name) + '</h3><p>' + (g.pct == null ? 'Belum ada ' + g.unit + ' — progres belum bisa dihitung' : g.done + ' dari ' + g.n + ' ' + g.unit + ' selesai (' + fmt(g.pct) + '%)') + '</p><div class="pj-bb"><button class="pj-or" data-act="openp" data-id="' + p.id + '">Buka proyek</button><button class="pj-gh" data-act="edit" data-e="proj" data-id="' + p.id + '">Edit</button></div></div>' +
        (n > 1 ? '<div class="pj-arr"><button data-act="bnav" data-d="-1" aria-label="Sorotan sebelumnya">‹</button><button data-act="bnav" data-d="1" aria-label="Sorotan berikutnya">›</button></div>' : '') + '</section>';
    }
    function list() {
      var ar = st.pa || 'Semua', q = (st.pq || '').toLowerCase().trim(), T = todayS(), set = {}; try { set = JSON.parse(localStorage.getItem('mo-settings-v1')) || {}; } catch (e) { }
      var L = D.proj.filter(function (p) { return (ar === 'Semua' || p.area === ar) && (!q || (p.name + ' ' + (p.desc || '')).toLowerCase().indexOf(q) > -1); });
      var nav = '<nav class="pj-nav"><div class="pj-tabs">' + ['Semua'].concat(AREAS).map(function (x) { return '<button aria-pressed="' + (x === ar) + '" data-act="filt" data-f="pa" data-v="' + x + '">' + (x === 'Semua' ? 'Beranda' : x) + '</button>'; }).join('') + '</div><input type="text" data-in="pq" placeholder="Cari proyek…" value="' + esc(st.pq || '') + '" aria-label="Cari proyek">' + add('proj', 'Proyek') + '</nav>';
      if (!D.proj.length) return nav + empty('Belum ada proyek. Tekan "+ Proyek" untuk memulai.');
      if (!L.length) return nav + empty('Tidak ada proyek yang cocok dengan filter atau pencarian.');
      var lv = L.filter(live), F = (lv.length ? lv : L).slice().sort(function (a, b) { return (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || prk(a) - prk(b) || (a.target || '9').localeCompare(b.target || '9'); });
      var bi = ((st.bi || 0) % F.length + F.length) % F.length, fp = F[bi], ids = {}, it = [];
      L.forEach(function (p) { ids[p.id] = 1; if (live(p) && p.target) it.push({ d: p.target, t: p.name, p: p, e: 'proj', id: p.id, k: 'Target proyek' }); });
      D.ms.forEach(function (m) { if (ids[m.projId] && !m.done && m.date) it.push({ d: m.date, t: m.title, p: by(D.proj, m.projId), e: 'ms', id: m.id, k: 'Milestone' }); });
      D.ptask.forEach(function (t) { if (ids[t.projId] && t.status !== 'Selesai' && t.due) it.push({ d: t.due, t: t.title, p: by(D.proj, t.projId), e: 'ptask', id: t.id, k: 'Tugas' }); });
      it.sort(function (a, b) { return a.d.localeCompare(b.d); });
      var nx = it.filter(function (x) { return x.d >= T; })[0] || it[0];
      var nd = nx && nx.p ? '<section class="pj-nd"><span class="pj-tag">' + nx.k + (nx.d < T ? ' · terlambat' : '') + '</span><h3>' + esc(nx.t) + '</h3><p>' + esc(nx.p.name) + ' · ' + fd(nx.d) + '</p><div class="pj-bb"><button class="pj-or" data-act="openp" data-id="' + nx.p.id + '">Lihat proyek</button><button class="pj-gh" data-act="edit" data-e="' + nx.e + '" data-id="' + nx.id + '">Edit</button></div></section>' : '<section class="pj-nd"><h3>Belum ada tenggat</h3><p>Isi target selesai proyek, tanggal milestone, atau tenggat tugas agar muncul di sini.</p></section>';
      var top = L.filter(live).sort(function (a, b) { return prk(a) - prk(b) || (a.target || '9').localeCompare(b.target || '9'); }).slice(0, 5);
      var tbl = '<section class="pj-top"><h4 class="pj-h">5 proyek teratas</h4><div class="pj-th"><span>No</span><span>Proyek</span><span class="pj-c">Prioritas</span><span class="pj-c">Target</span><span>Progres</span><span></span></div>' + (top.length ? top.map(function (p, i) {
        var g = pp(p), c = pc(p);
        return '<div class="pj-tr' + (i === 0 ? ' hot' : '') + '" data-act="openp" data-id="' + p.id + '"><span>' + (i + 1) + '</span><span class="pj-n"><i style="background:linear-gradient(135deg,' + c[1] + ',' + c[2] + ')">' + esc(p.emoji || c[0]) + '</i><b><button class="t" data-act="openp" data-id="' + p.id + '">' + esc(p.name) + '</button><small>' + esc(p.area) + ' · ' + esc(p.status) + '</small></b></span><span class="pj-c">' + esc(p.priority) + '</span><span class="pj-c">' + fd(p.target) + '</span><span>' + (g.pct == null ? '—' : Math.round(g.pct) + '%') + '</span><span><button class="ac-btn sm" data-act="edit" data-e="proj" data-id="' + p.id + '">Edit</button></span></div>';
      }).join('') : '<p class="ac-hint">Tidak ada proyek aktif pada filter ini.</p>') + '</section>';
      var cards = '<section class="pj-an"><h4 class="pj-h">Progres semua proyek · ' + L.length + '</h4><div class="pj-cards">' + L.map(function (p) {
        var g = pp(p), c = pc(p);
        return '<article class="pj-pc" style="--c1:' + c[1] + ';--c2:' + c[2] + '" data-act="openp" data-id="' + p.id + '"><button class="pj-ed" data-act="edit" data-e="proj" data-id="' + p.id + '" aria-label="Edit ' + esc(p.name) + '">✎</button><span class="pj-pe">' + esc(p.emoji || c[0]) + '</span><button class="t" data-act="openp" data-id="' + p.id + '">' + esc(p.name) + '</button><small>' + (g.pct == null ? 'Belum ada ' + g.unit : g.done + '/' + g.n + ' ' + g.unit) + '</small><em>' + (g.pct == null ? '—' : Math.round(g.pct)) + '</em></article>';
      }).join('') + '</div></section>';
      var ps = D.proj.map(pp).filter(function (g) { return g.pct != null; }), avg = ps.length ? Math.round(ps.reduce(function (a, g) { return a + g.pct; }, 0) / ps.length) : null, P = D.promo[0];
      var side = '<aside class="pj-side"><div class="pj-me"><span class="pj-av" style="' + (set.photo ? 'background-image:url(&quot;' + esc(set.photo) + '&quot;)' : '') + '"></span><b>' + esc(set.nick || 'Pengguna') + '</b><small>Pengelola proyek</small><div class="pj-st"><span>📁 ' + D.proj.filter(live).length + ' <small>aktif</small></span><span>📈 ' + (avg == null ? '—' : avg + '%') + ' <small>rata-rata</small></span><span>✅ ' + D.ptask.filter(function (t) { return t.status === 'Selesai'; }).length + ' <small>tugas selesai</small></span></div></div>' +
        '<div class="pj-promo"><button class="pj-pen" data-act="edit" data-e="promo" data-id="promo" aria-label="Ubah kartu promo">✎</button><span>' + esc(P.emoji || '🏁') + '</span><b>' + esc(P.title) + '</b><small>' + esc(P.text || '') + '</small><button class="pj-or" ' + (fp ? 'data-act="openp" data-id="' + fp.id + '"' : 'data-act="add" data-e="proj"') + '>' + esc(P.btn || 'Buka sorotan') + '</button></div></aside>';
      return nav + '<div class="pj-wrap">' + side + '<div class="pj-main"><div class="pj-row2"><div><h4 class="pj-h">Sorotan</h4>' + banner(fp, F.length) + '</div><div><h4 class="pj-h">Tenggat terdekat</h4>' + nd + '</div></div>' + tbl + cards + '</div></div>';
    }
    function detail(p) {
      var v = st.pv || 'overview';
      var g0 = pp(p), c0 = pc(p);
      var h = '<button class="ac-btn sm ac-back" data-act="openp" data-id="">← Semua proyek</button><section class="pj-hero"><span class="pj-hem">' + esc(p.emoji || c0[0]) + '</span><div class="pj-ht"><h3>' + esc(p.name) + '</h3><div>' + badge(p.area) + badge(p.status, p.status === 'Selesai' ? 'on' : '') + badge(p.priority, p.priority === 'Tinggi' ? 'hi' : p.priority === 'Sedang' ? 'mid' : '') + '</div><div class="pj-bar"><i style="width:' + (g0.pct || 0) + '%"></i></div><small>' + (g0.pct == null ? 'Belum ada ' + g0.unit + ' — progres belum bisa dihitung' : g0.done + ' dari ' + g0.n + ' ' + g0.unit + ' selesai (' + fmt(g0.pct) + '%)') + '</small></div>' + btns('proj', p.id) + '</section>' +
        '<div class="ac-chips pj-tabs">' + PV.map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x[0] === v) + '" data-act="pv" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      return h + ({ overview: vOv, board: vBoard, timeline: vTL, ms: vMs, files: vFiles, ana: vAna })[v](p);
    }
    function vOv(p) {
      var g = pp(p), nm = msOf(p.id).filter(function (m) { return !m.done && m.date; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
      return '<div class="ac-grid">' + stat(g.pct == null ? '—' : fmt(g.pct) + '%', 'Progres (' + g.unit + ' selesai)') + stat(tasksOf(p.id).length, 'Tugas') + stat(msOf(p.id).length, 'Milestone') + stat(has(p.budget) ? rp(p.budget) : '—', 'Anggaran') + '</div>' +
        prog(g.pct) + '<small>' + (g.pct == null ? 'Tambahkan ' + g.unit + ' agar progres bisa dihitung.' : g.done + ' dari ' + g.n + ' ' + g.unit + ' selesai') + '</small>' +
        '<div class="ac-meta" style="margin-top:14px"><span>Area: <b>' + esc(p.area) + '</b></span><span>Status: <b>' + esc(p.status) + '</b></span><span>Prioritas: <b>' + esc(p.priority) + '</b></span><span>Mulai: <b>' + fd(p.start) + '</b></span><span>Target: <b>' + fd(p.target) + '</b></span>' + (nm ? '<span>Milestone berikutnya: <b>' + esc(nm.title) + ' (' + fd(nm.date) + ')</b></span>' : '') + '</div>' +
        (p.desc ? '<div class="ac-notes">' + esc(p.desc) + '</div>' : '') + (p.notes ? '<div class="ac-notes"><b>Catatan</b>\n' + esc(p.notes) + '</div>' : '') +
        '<div class="ac-h">Riwayat perubahan</div>' + ((p.hist || []).length ? '<div class="ac-tblwrap"><table class="ac-tbl">' + p.hist.slice(0, 30).map(function (x) { return '<tr><td style="white-space:nowrap;opacity:.7">' + new Date(x.t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</td><td>' + esc(x.m) + '</td></tr>'; }).join('') + '</table></div>' : '<p class="ac-hint">Belum ada riwayat.</p>');
    }
    function vBoard(p) {
      var T = tasksOf(p.id);
      return bar('Pindahkan tugas dengan tombol panah. Tugas di kolom "Selesai" menambah progres.', add('ptask', 'Tugas', 'projId', p.id)) + '<div class="kb">' + TS.map(function (s, i) {
        return '<div><h4>' + (s === 'Belum' ? 'Belum dikerjakan' : s === 'Dikerjakan' ? 'Sedang dikerjakan' : 'Selesai') + ' · ' + T.filter(function (t) { return t.status === s; }).length + '</h4>' + T.filter(function (t) { return t.status === s; }).map(function (t) {
          var late = t.due && t.due < todayS() && s !== 'Selesai';
          return '<div class="kc"><button class="t" data-act="edit" data-e="ptask" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + (t.due ? 'Tenggat ' + fd(t.due) : 'Tanpa tenggat') + (late ? ' · <b style="color:#d0443e">terlambat</b>' : '') + '</small><div class="ac-acts">' +
            (i > 0 ? '<button class="ac-btn sm" data-act="mv" data-id="' + t.id + '" data-d="-1" aria-label="Mundur">←</button>' : '') + (i < 2 ? '<button class="ac-btn sm" data-act="mv" data-id="' + t.id + '" data-d="1" aria-label="Maju">→</button>' : '') + '<button class="ac-btn sm danger" data-act="del" data-e="ptask" data-id="' + t.id + '">×</button></div></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    function vTL(p) {
      var ms = msOf(p.id).filter(function (m) { return m.date; }), ts = tasksOf(p.id).filter(function (t) { return t.due; });
      var T = function (x) { return new Date(x).getTime(); }, pts = [p.start, p.target].concat(ms.map(function (m) { return m.date; }), ts.map(function (t) { return t.due; })).filter(Boolean).map(T);
      if (pts.length < 2) return empty('Isi tanggal mulai, target selesai, atau tanggal milestone/tugas agar timeline muncul.');
      var now = Date.now(), all = pts.concat([now]), mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx === mn) mx = mn + 864e5;
      var pos = function (t) { return ((t - mn) / (mx - mn) * 96 + 2).toFixed(1); }, nowEl = '<i class="tl-now" style="left:' + pos(now) + '%" title="Hari ini"></i>';
      var h = '<div class="tl-row"><span><b>Proyek</b></span><div class="tl-track">' + (p.start && p.target ? '<i class="tl-bar" style="left:' + pos(T(p.start)) + '%;width:' + (pos(T(p.target)) - pos(T(p.start))) + '%"></i>' : '') + nowEl + '</div></div>';
      ms.forEach(function (m) { h += '<div class="tl-row"><span title="' + esc(m.title) + '">◆ ' + esc(m.title) + '</span><div class="tl-track"><i class="tl-dot d' + (m.done ? ' ok' : '') + '" style="left:' + pos(T(m.date)) + '%"></i>' + nowEl + '</div></div>'; });
      ts.forEach(function (t) { h += '<div class="tl-row"><span title="' + esc(t.title) + '">' + esc(t.title) + '</span><div class="tl-track"><i class="tl-dot' + (t.status === 'Selesai' ? ' ok' : '') + '" style="left:' + pos(T(t.due)) + '%"></i>' + nowEl + '</div></div>'; });
      return h + '<div class="ac-legend" style="margin-top:12px"><span>' + fd(new Date(mn)) + ' → ' + fd(new Date(mx)) + '</span><span style="color:#d0443e">| hari ini</span><span>◆ milestone · ● tugas (hijau = selesai)</span></div>';
    }
    function vMs(p) {
      var L = msOf(p.id).sort(function (a, b) { return (a.date || '9').localeCompare(b.date || '9'); });
      return bar('Centang saat milestone tercapai.', add('ms', 'Milestone', 'projId', p.id)) + (L.length ? L.map(function (m) {
        var late = m.date && m.date < todayS() && !m.done;
        return '<div class="ac-item' + (m.done ? ' done' : '') + '"><input type="checkbox" data-act="tgm" data-id="' + m.id + '"' + (m.done ? ' checked' : '') + ' aria-label="Tercapai"><div><button class="t" data-act="edit" data-e="ms" data-id="' + m.id + '">' + esc(m.title) + '</button>' + (late ? badge('Terlambat', 'late') : '') + '<small>Target: ' + fd(m.date) + '</small>' + (m.notes ? '<small>' + esc(m.notes) + '</small>' : '') + '</div>' + btns('ms', m.id) + '</div>';
      }).join('') : empty('Belum ada milestone.'));
    }
    function vFiles(p) {
      var L = D.pfile.filter(function (f) { return f.projId === p.id; });
      return bar('Dokumen (tautan) dan catatan proyek.', add('pfile', 'Dokumen / catatan', 'projId', p.id)) + (p.notes ? '<div class="ac-card"><b>Catatan proyek</b><div class="ac-notes">' + esc(p.notes) + '</div></div>' : '') +
        (L.length ? L.map(function (f) { return '<div class="ac-item"><div><b>' + esc(f.title) + '</b>' + badge(f.kind) + (f.link ? '<small>' + link(f.link) + '</small>' : '') + (f.text ? '<div class="ac-notes">' + esc(f.text) + '</div>' : '') + '</div>' + btns('pfile', f.id) + '</div>'; }).join('') : empty('Belum ada dokumen atau catatan.'));
    }
    function vAna(p) {
      var T = tasksOf(p.id), M = msOf(p.id), g = pp(p), td = T.filter(function (t) { return t.status === 'Selesai'; }).length, md = M.filter(function (m) { return m.done; }).length;
      var od = T.filter(function (t) { return t.due && t.due < todayS() && t.status !== 'Selesai'; }).length, om = M.filter(function (m) { return m.date && m.date < todayS() && !m.done; }).length;
      var h = '<div class="ac-grid">' + stat(g.pct == null ? '—' : fmt(g.pct) + '%', 'Progres resmi (' + g.unit + ')') + stat(T.length ? fmt(td / T.length * 100) + '%' : '—', 'Tugas selesai (' + td + '/' + T.length + ')') + stat(M.length ? fmt(md / M.length * 100) + '%' : '—', 'Milestone tercapai (' + md + '/' + M.length + ')') + stat(od + om, 'Terlambat (' + od + ' tugas, ' + om + ' milestone)') + '</div>';
      h += '<div class="ac-h">Tugas per status</div><div class="ac-bars">' + TS.map(function (s) { var n = T.filter(function (t) { return t.status === s; }).length; return '<div class="ac-bar2"><span>' + s + '</span><div class="ac-track"><i style="width:' + (T.length ? n / T.length * 100 : 0) + '%"></i></div><span>' + n + '</span></div>'; }).join('') + '</div>';
      if (p.start && p.target && p.target > p.start) {
        var el2 = (Date.now() - new Date(p.start)) / (new Date(p.target) - new Date(p.start)) * 100, e = Math.max(0, Math.min(100, el2));
        h += '<div class="ac-h">Waktu berjalan vs progres</div><div class="ac-legend"><span><i></i>Progres</span><span><i class="alt"></i>Waktu berjalan</span></div><div class="ac-pair"><div class="ac-track"><i style="width:' + (g.pct || 0) + '%"></i></div><div class="ac-track"><i class="alt" style="width:' + e + '%"></i></div></div>' +
          '<p class="ac-hint" style="margin-top:8px">' + (g.pct == null ? 'Progres belum bisa dibandingkan karena belum ada ' + g.unit + '.' : 'Waktu terpakai ' + fmt(e) + '%, progres ' + fmt(g.pct) + '%.') + '</p>';
      }
      return h + '<p class="ac-hint" style="margin-top:14px">Progres resmi = ' + g.unit + ' selesai ÷ total ' + g.unit + '. Dasar perhitungan bisa diubah di Edit proyek.</p>';
    }
    return {
      skin: 'pj-skin', specs: specs, tabs: [['p', 'Proyek', function () { var p = st.proj && by(D.proj, st.proj); if (!p) return list(); var c = pc(p); return '<div class="pj-world" style="--c1:' + c[1] + ';--c2:' + c[2] + '">' + detail(p) + '</div>'; }]],
      sub: function () { return D.proj.length + ' proyek'; },
      cascade: { proj: [['ptask', 'projId'], ['ms', 'projId'], ['pfile', 'projId']] },
      guard: function (e) { if (e !== 'proj' && !D.proj.length) return ['Belum ada proyek', 'Buat proyek terlebih dahulu.']; },
      saved: function (ent, r, isNew, b) {
        var L = { name: 'Nama', area: 'Area', status: 'Status', priority: 'Prioritas', start: 'Mulai', target: 'Target', budget: 'Anggaran', basis: 'Dasar progres' };
        if (ent === 'proj') { if (isNew) { r.hist = []; log(r.id, 'Proyek dibuat'); } else Object.keys(L).forEach(function (k) { if (String(b[k]) !== String(r[k])) log(r.id, L[k] + ': ' + (b[k] || '—') + ' → ' + (r[k] || '—')); }); }
        if (ent === 'ptask') { if (isNew) log(r.projId, 'Tugas ditambahkan: ' + r.title); else if (b.status !== r.status) log(r.projId, 'Tugas "' + r.title + '": ' + b.status + ' → ' + r.status); }
        if (ent === 'ms') { if (isNew) log(r.projId, 'Milestone ditambahkan: ' + r.title); else if (b.done !== r.done) log(r.projId, 'Milestone "' + r.title + '" ' + (r.done ? 'tercapai' : 'dibuka kembali')); }
        if (ent === 'pfile' && isNew) log(r.projId, (r.kind === 'Catatan' ? 'Catatan' : 'Dokumen') + ' ditambahkan: ' + r.title);
      },
      act: function (a, d, t) {
        if (a === 'openp') { st.proj = d.id || null; st.pv = 'overview'; }
        if (a === 'pv') st.pv = d.v;
        if (a === 'bnav') st.bi = (st.bi || 0) + (+d.d);
        if (a === 'mv') { var x = by(D.ptask, d.id), i = Math.max(0, Math.min(2, TS.indexOf(x.status) + +d.d)); if (TS[i] !== x.status) { log(x.projId, 'Tugas "' + x.title + '": ' + x.status + ' → ' + TS[i]); x.status = TS[i]; } }
        if (a === 'tgm') { var m = by(D.ms, d.id); m.done = t.checked; log(m.projId, 'Milestone "' + m.title + '" ' + (m.done ? 'tercapai' : 'dibuka kembali')); }
      }
    };
  });

  MO.kit = { App: App, uid: uid, esc: esc, has: has, fmt: fmt, rp: rp, fd: fd, todayS: todayS, by: by, el: el, link: link, btns: btns, empty: empty, bar: bar, add: add, chips: chips, prog: prog, opt: opt, stat: stat, badge: badge };
  MO.work = work;
  MO.routes['#work'] = work.open;
  MO.org = org;
  MO.routes['#organization'] = org.open;
  MO.routes['#project'] = proj.open;
})();
;
/* MyOffice — Work Office "Arcade" : tampilan kartu geser (coverflow) bertema game-store gelap.
   Memakai data yang sama dengan Work Office lama (localStorage mo-work-v1), semua fitur lama tetap ada. */
(function () {
  'use strict';
  var MO = window.MyOffice; if (!MO || !MO.work || !MO.kit) return;
  var K = MO.kit, esc = K.esc, rp = K.rp, fd = K.fd, fmt = K.fmt, has = K.has, todayS = K.todayS, by = K.by, uid = K.uid;
  var app = MO.work.app, D = app.D;
  ['client', 'job', 'wtask', 'log', 'wdoc'].forEach(function (k) { if (!D[k]) D[k] = []; });

  var JS = ['Prospek', 'Berjalan', 'Review', 'Selesai', 'Dibatalkan'];
  var IS = ['Tidak relevan', 'Belum ditagih', 'Sudah ditagih', 'Sudah diterima'];
  var TS = ['Belum dikerjakan', 'Sedang dikerjakan', 'Selesai'];
  var DT = ['Kontrak', 'Invoice', 'Brief', 'Deliverable', 'Lainnya'];
  var PALETTE = ['#f59e0b', '#8b5cf6', '#1ea7e1', '#ff4757', '#f7c533', '#22c55e', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];
  var SCOL = { Prospek: '#9aa4b8', Berjalan: '#22c55e', Review: '#f7c533', Selesai: '#1ea7e1', Dibatalkan: '#ff4757' };
  var NAV = [['jobs', 'Pekerjaan'], ['clients', 'Klien'], ['tasks', 'Tugas'], ['hours', 'Jam Kerja'], ['docs', 'Dokumen'], ['income', 'Pendapatan']];
  var WTABS = [['tasks', 'Tugas'], ['hours', 'Jam Kerja'], ['docs', 'Dokumen'], ['income', 'Pendapatan'], ['info', 'Info']];

  var S = { view: 'jobs', idx: 0, q: '', fs: '', world: null, wtab: 'tasks', ts: 'Semua', dt: 'Semua' };
  var ov, frame, isOpen = false, pos = 0, drag = null, dragged = false, wheelT = 0;

  /* ---------- helpers ---------- */
  function jobColor(j, i) { return j.color || PALETTE[(i == null ? D.job.indexOf(j) : i) % PALETTE.length]; }
  function lum(hex) { var h = (hex || '#888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function ink(hex) { return lum(hex) > 0.68 ? '#1a1405' : '#fff'; }
  function cn(id) { var c = by(D.client, id); return c ? c.name : ''; }
  function jn(id) { var j = by(D.job, id); return j ? j.title : '—'; }
  function hrs(id) { return D.log.filter(function (l) { return l.jobId === id; }).reduce(function (a, l) { return a + (+l.hours || 0); }, 0); }
  function tOf(id) { return D.wtask.filter(function (t) { return t.jobId === id; }); }
  function prog(id) { var t = tOf(id); return t.length ? t.filter(function (x) { return x.status === 'Selesai'; }).length / t.length * 100 : null; }
  function late(j) { return j.deadline && j.deadline < todayS() && j.status !== 'Selesai' && j.status !== 'Dibatalkan'; }
  function received() { return D.job.filter(function (j) { return j.incomeStatus === 'Sudah diterima'; }).reduce(function (a, j) { return a + (+j.income || 0); }, 0); }
  function save() { app.save(); }
  function guardJobs() { if (!D.job.length) { MO.msg('Belum ada pekerjaan', 'Tambahkan pekerjaan terlebih dahulu.'); return true; } return false; }
  function filtered() {
    var q = S.q.toLowerCase().trim();
    return D.job.filter(function (j) {
      if (S.fs && j.status !== S.fs) return false;
      return !q || (j.title + ' ' + cn(j.clientId) + ' ' + (j.desc || '')).toLowerCase().indexOf(q) > -1;
    });
  }

  /* ---------- ilustrasi bawaan (bila belum ada gambar) ---------- */
  function mascot(i) {
    var v = i % 4, ears = '';
    if (v === 1) ears = '<path d="M52 66 40 22 82 48Z" fill="rgba(255,255,255,.88)"/><path d="M148 66 160 22 118 48Z" fill="rgba(255,255,255,.88)"/>';
    if (v === 2) ears = '<ellipse cx="72" cy="34" rx="14" ry="34" fill="rgba(255,255,255,.88)"/><ellipse cx="128" cy="34" rx="14" ry="34" fill="rgba(255,255,255,.88)"/>';
    if (v === 3) ears = '<path d="M100 2l9 22 24 2-18 16 6 24-21-13-21 13 6-24-18-16 24-2Z" fill="#ffe14d"/>';
    return '<svg class="wo-mascot" viewBox="0 0 200 210" aria-hidden="true">' + ears +
      '<ellipse cx="100" cy="200" rx="62" ry="9" fill="rgba(0,0,0,.18)"/>' +
      '<circle cx="100" cy="112" r="78" fill="rgba(255,255,255,.92)"/>' +
      '<circle cx="100" cy="112" r="78" fill="url(#wg' + i + ')"/>' +
      '<defs><radialGradient id="wg' + i + '" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient></defs>' +
      '<ellipse cx="74" cy="104" rx="9" ry="14" fill="#1b1b2a"/><ellipse cx="126" cy="104" rx="9" ry="14" fill="#1b1b2a"/>' +
      '<circle cx="77" cy="98" r="4" fill="#fff"/><circle cx="129" cy="98" r="4" fill="#fff"/>' +
      '<ellipse cx="58" cy="128" rx="13" ry="8" fill="#ff6b8b" opacity=".55"/><ellipse cx="142" cy="128" rx="13" ry="8" fill="#ff6b8b" opacity=".55"/>' +
      '<path d="M88 130q12 14 24 0" fill="none" stroke="#1b1b2a" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="30" cy="132" r="17" fill="rgba(255,255,255,.92)"/><circle cx="170" cy="132" r="17" fill="rgba(255,255,255,.92)"/></svg>';
  }
  function art(j, i) { return j.img ? '<img class="wo-img" src="' + esc(j.img) + '" alt="" draggable="false">' : mascot(i); }

  /* ---------- kerangka ---------- */
  function build() {
    ov = document.createElement('div'); ov.className = 'wo-ov'; ov.hidden = true;
    ov.innerHTML = '<section class="wo-frame" role="dialog" aria-modal="true" aria-label="Work Office"></section>';
    document.body.appendChild(ov); frame = ov.firstChild;
    ov.addEventListener('click', onClick);
    ov.addEventListener('change', onChange);
    ov.addEventListener('input', onInput);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    ov.addEventListener('keydown', onKey);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !isOpen || document.querySelector('.ac-ov2, .wo-ov2, .ac-soon:not([hidden])')) return;
      if (S.world) { S.world = null; render(); } else close();
    });
    window.addEventListener('resize', function () { if (isOpen && S.view === 'jobs' && !S.world) layout(pos); });
    app.onChange = function () { if (isOpen) render(); };
  }
  function open() { if (!ov) build(); isOpen = true; ov.hidden = false; document.body.style.overflow = 'hidden'; render(); }
  function close() { isOpen = false; if (ov) ov.hidden = true; document.body.style.overflow = ''; }

  function render() {
    if (!isOpen) return;
    var scroll = frame.querySelector('.wo-main'), top = scroll ? scroll.scrollTop : 0;
    var n = D.job.filter(function (j) { return j.status !== 'Selesai' && j.status !== 'Dibatalkan'; }).length;
    var searchOn = S.view === 'jobs' && !S.world;
    frame.innerHTML =
      '<header class="wo-top">' +
        '<div class="wo-l">' + (S.world ? '<button class="wo-back" data-a="back" aria-label="Kembali"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg><span>Pekerjaan</span></button>' :
          '<label class="wo-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input data-in="q" type="search" placeholder="' + (searchOn ? 'Cari pekerjaan' : 'Work Office') + '" value="' + esc(S.q) + '"' + (searchOn ? '' : ' disabled') + ' aria-label="Cari pekerjaan">' +
          '<span class="wo-filt' + (S.fs ? ' on' : '') + '"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg><select data-chg="fs" aria-label="Filter status"' + (searchOn ? '' : ' disabled') + '><option value="">Semua status</option>' + JS.map(function (s) { return '<option' + (S.fs === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></span></label>') + '</div>' +
        '<div class="wo-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg></div>' +
        '<div class="wo-r"><div class="wo-coin" title="Pendapatan pekerjaan yang sudah diterima"><i>$</i><b>' + Math.round(received()).toLocaleString('id-ID') + '</b></div><button class="wo-x" data-a="close" aria-label="Tutup">×</button></div>' +
      '</header>' +
      (S.world ? '' : '<nav class="wo-nav" aria-label="Menu Work Office">' + NAV.map(function (x) { return '<button data-a="nav" data-v="' + x[0] + '" aria-current="' + (S.view === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</nav>') +
      '<div class="wo-main">' + (S.world ? worldHTML() : viewHTML(n)) + '</div>';
    var m = frame.querySelector('.wo-main'); if (m) m.scrollTop = top;
    if (!S.world && S.view === 'jobs') { stage = frame.querySelector('.wo-stage'); bindStage(); pos = clampIdx(S.idx); S.idx = pos; layout(pos); }
  }
  function viewHTML(n) {
    if (S.view === 'jobs') return jobsHTML(n);
    var body = ({ clients: clientsHTML, tasks: function () { return tasksHTML(null); }, hours: function () { return hoursHTML(null); }, docs: function () { return docsHTML(null); }, income: function () { return incomeHTML(null); } })[S.view]();
    var titles = { clients: 'Klien', tasks: 'Semua Tugas', hours: 'Jam Kerja', docs: 'Dokumen', income: 'Pendapatan' };
    return '<div class="wo-page"><h2 class="wo-h2">' + titles[S.view] + '</h2>' + body + '</div>';
  }

  /* ---------- carousel ---------- */
  var stage;
  function jobsHTML(n) {
    var L = filtered(), cards = L.map(function (j, i) { return cardHTML(j, i); }).join('') + '<div class="wo-card add" role="button" tabindex="0" style="--c:#2a2d3a"><div class="wo-plus">+</div><b>Tambah Pekerjaan</b><small>Buat kartu baru</small></div>';
    return '<div class="wo-hero"><span class="wo-gold"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1.5S10 8 12 8Zm0 0c2-4 6-4 6-1.5S14 8 12 8Z"/></svg><b>' + n + ' Aktif</b> • Work Office</span>' +
      '<h1>Pekerjaan Seru</h1><h1 class="two"><span class="cy">Work</span> <span class="rd">Office</span></h1></div>' +
      '<div class="wo-stagewrap"><button class="wo-arr l" data-a="prev" aria-label="Sebelumnya"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<div class="wo-stage" tabindex="0" aria-roledescription="carousel" aria-label="Daftar pekerjaan, geser untuk berpindah">' + cards + '</div>' +
      '<button class="wo-arr r" data-a="next" aria-label="Berikutnya"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div>' +
      '<div class="wo-focus">' + focusHTML() + '</div>';
  }
  function cardHTML(j, i) {
    var c = jobColor(j), p = prog(j.id), sub = cn(j.clientId) || 'Tanpa klien';
    return '<div class="wo-card" data-i="' + i + '" data-id="' + j.id + '" tabindex="-1" style="--c:' + c + ';--t:' + ink(c) + '">' +
      '<div class="wo-ct"><div class="wo-tx"><h3>' + esc(j.title) + '</h3><small>' + esc(sub) + '</small><em class="wo-st" style="--s:' + (SCOL[j.status] || '#999') + '">' + esc(j.status || '—') + '</em>' + (late(j) ? '<em class="wo-st late">Lewat tenggat</em>' : '') + '</div>' +
      '<span class="wo-pill" title="Progres tugas"><i></i>' + (p == null ? '—' : fmt(p) + '%') + '</span></div>' +
      '<div class="wo-art">' + art(j, i) + '</div></div>';
  }
  function focusHTML() {
    var L = filtered(), j = L[pos];
    if (!j) return '<p class="wo-empty">' + (D.job.length ? 'Tidak ada pekerjaan yang cocok dengan pencarian/filter.' : 'Belum ada pekerjaan. Tekan kartu “+” untuk menambah.') + '</p>';
    return '<div class="wo-count">' + (pos + 1) + ' / ' + L.length + '</div>' +
      '<div class="wo-rail" role="group" aria-label="Ubah status pekerjaan">' + JS.map(function (s) { return '<button data-a="jstat" data-id="' + j.id + '" data-s="' + s + '" aria-pressed="' + (j.status === s) + '" style="--s:' + SCOL[s] + '">' + s + '</button>'; }).join('') + '</div>' +
      '<div class="wo-acts"><button class="wo-btn go" data-a="open" data-id="' + j.id + '" style="--c:' + jobColor(j) + '">Masuk dunia ▸</button><button class="wo-btn" data-a="jedit" data-id="' + j.id + '">✎ Edit kartu</button><button class="wo-btn dng" data-a="jdel" data-id="' + j.id + '">Hapus</button></div>';
  }
  function clampIdx(i) { var n = filtered().length; return Math.max(0, Math.min(n, Math.round(i))); } // n = kartu "tambah"
  function cards() { return stage ? [].slice.call(stage.children) : []; }
  function layout(p) {
    var cs = cards(); if (!cs.length) return;
    var w = cs[0].offsetWidth || 220, step = w * 0.74;
    cs.forEach(function (c, i) {
      var off = i - p, a = Math.abs(off), s = Math.max(0.5, 1 - 0.125 * a), x = off * step * (a > 2 ? 0.86 : 1);
      c.style.transform = 'translateX(' + x.toFixed(1) + 'px) translateY(' + (a * 6).toFixed(1) + 'px) rotate(' + (off * 2.6).toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
      c.style.zIndex = String(100 - Math.round(a * 10));
      c.style.opacity = a > 3.2 ? '0' : '1';
      c.style.pointerEvents = a > 3.2 ? 'none' : '';
      c.style.filter = a < .5 ? '' : 'brightness(' + (1 - Math.min(a, 2) * 0.14).toFixed(2) + ')';
      c.classList.toggle('on', a < 0.5);
    });
  }
  function go(i, keep) {
    var n = filtered().length; i = Math.max(0, Math.min(n, i));
    pos = i; S.idx = i; layout(pos); refocus();
  }
  function refocus() { var f = frame.querySelector('.wo-focus'); if (f) f.innerHTML = focusHTML(); }
  function bindStage() {
    stage.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      drag = { x: e.clientX, p: pos, moved: false, id: e.pointerId, lx: e.clientX, lt: performance.now(), v: 0 };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return; var dx = e.clientX - drag.x, w = (cards()[0] || {}).offsetWidth || 220, step = w * 0.74;
      if (!drag.moved && Math.abs(dx) > 7) { drag.moved = true; stage.classList.add('drag'); try { stage.setPointerCapture(drag.id); } catch (x) { } }
      if (!drag.moved) return;
      var now = performance.now(); drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now;
      var n = filtered().length; pos = Math.max(-0.35, Math.min(n + 0.35, drag.p - dx / step)); layout(pos);
    });
    function end() {
      if (!drag) return; var d = drag; drag = null; stage.classList.remove('drag');
      if (d.moved) { dragged = true; setTimeout(function () { dragged = false; }, 0); var w = (cards()[0] || {}).offsetWidth || 220; var t = pos - d.v * 260 / (w * 0.74); go(Math.round(t)); }
    }
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', function (e) {
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0); if (!d) return;
      e.preventDefault(); var t = Date.now(); if (t - wheelT < 260) return; wheelT = t; go(pos + (d > 0 ? 1 : -1));
    }, { passive: false });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(pos + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos - 1); }
      else if (e.key === 'Enter') { var j = filtered()[pos]; if (j) openWorld(j.id); else openJobModal(); }
    });
  }
  function openWorld(id) { S.world = id; S.wtab = 'tasks'; render(); var m = frame.querySelector('.wo-main'); if (m) m.scrollTop = 0; }

  /* ---------- tampilan: klien ---------- */
  function clientsHTML() {
    return '<div class="wo-grid">' + D.client.map(function (c, i) {
      var col = PALETTE[(i + 2) % PALETTE.length], js = D.job.filter(function (j) { return j.clientId === c.id; });
      return '<article class="wo-box wo-client" style="--c:' + col + '"><div class="wo-av" style="color:' + ink(col) + '">' + esc((c.name || '?').trim().charAt(0).toUpperCase()) + '</div><div class="wo-cb"><h3>' + esc(c.name) + '</h3><small>' + esc(c.contact || 'Tanpa kontak') + '</small>' +
        '<div class="wo-tags"><span>' + js.length + ' pekerjaan</span></div>' + (c.notes ? '<p class="wo-note">' + esc(c.notes) + '</p>' : '') + '<div class="wo-row"><button class="wo-mini" data-a="edit" data-e="client" data-id="' + c.id + '">Edit</button><button class="wo-mini dng" data-a="del" data-e="client" data-id="' + c.id + '">Hapus</button></div></div></article>';
    }).join('') + '<button class="wo-box wo-addbox" data-a="add" data-e="client"><span>+</span>Tambah klien</button></div>' + (D.client.length ? '' : '<p class="wo-empty">Belum ada klien.</p>');
  }

  /* ---------- tampilan: tugas ---------- */
  function tasksHTML(jobId) {
    var L = D.wtask.filter(function (t) { return (!jobId || t.jobId === jobId) && (S.ts === 'Semua' || t.status === S.ts); }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
    var pre = jobId ? ' data-pk="jobId" data-pv="' + jobId + '"' : '';
    var h = '<div class="wo-bar"><div class="wo-chips">' + ['Semua'].concat(TS).map(function (x) { return '<button data-a="filt" data-f="ts" data-v="' + x + '" aria-pressed="' + (S.ts === x) + '">' + x + '</button>'; }).join('') + '</div><button class="wo-btn go" data-a="add" data-e="wtask"' + pre + '>+ Tugas</button></div>';
    if (!L.length) return h + '<p class="wo-empty">Belum ada tugas' + (S.ts !== 'Semua' ? ' dengan status ini' : '') + '.</p>';
    return h + L.map(function (t) {
      var lt = t.deadline && t.deadline < todayS() && t.status !== 'Selesai', done = t.status === 'Selesai', j = by(D.job, t.jobId), c = j ? jobColor(j) : '#888';
      return '<div class="wo-item' + (done ? ' done' : '') + '" style="--c:' + c + '"><input type="checkbox" data-chg="tgw" data-id="' + t.id + '"' + (done ? ' checked' : '') + ' aria-label="Selesai"><div class="wo-ib"><button class="wo-t" data-a="edit" data-e="wtask" data-id="' + t.id + '">' + esc(t.title) + '</button>' + (lt ? '<em class="wo-st late">Terlambat</em>' : '') +
        '<small>' + (jobId ? '' : esc(jn(t.jobId)) + ' · ') + 'Tenggat ' + fd(t.deadline) + ' · Estimasi ' + (has(t.estHours) ? t.estHours + ' jam' : '—') + '</small>' + (t.notes ? '<small>' + esc(t.notes) + '</small>' : '') + '</div>' +
        '<select class="wo-sel" data-chg="tst" data-id="' + t.id + '" aria-label="Status tugas">' + TS.map(function (s) { return '<option' + (t.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<button class="wo-mini dng" data-a="del" data-e="wtask" data-id="' + t.id + '" aria-label="Hapus">×</button></div>';
    }).join('');
  }

  /* ---------- tampilan: jam kerja ---------- */
  function hoursHTML(jobId) {
    var logs = D.log.filter(function (l) { return !jobId || l.jobId === jobId; }), tot = logs.reduce(function (a, l) { return a + (+l.hours || 0); }, 0);
    var js = D.job.filter(function (j) { return (!jobId || j.id === jobId) && hrs(j.id) > 0; });
    var pre = jobId ? ' data-pk="jobId" data-pv="' + jobId + '"' : '';
    var h = '<div class="wo-bar"><p class="wo-hint">Catat jam kerja aktual dan bandingkan dengan estimasi.</p><button class="wo-btn go" data-a="add" data-e="log"' + pre + '>+ Jam kerja</button></div>';
    if (!logs.length) return h + '<p class="wo-empty">Belum ada catatan jam kerja.</p>';
    h += '<div class="wo-stats">' + stat(fmt(tot), 'Total jam tercatat') + stat(js.length, 'Pekerjaan dengan jam tercatat') + '</div>';
    h += '<div class="wo-bars">' + js.map(function (j) {
      var a = hrs(j.id), e = +j.estHours || 0, mx = Math.max(a, e, 1);
      return '<div class="wo-b2"><span>' + esc(j.title) + '</span><div><div class="wo-track"><i style="width:' + a / mx * 100 + '%;--c:' + jobColor(j) + '"></i></div>' + (e ? '<div class="wo-track"><i class="alt" style="width:' + e / mx * 100 + '%"></i></div>' : '') + '</div><span>' + fmt(a) + ' / ' + (e ? fmt(e) : '—') + ' jam</span></div>';
    }).join('') + '</div><div class="wo-legend"><span><i></i>Aktual</span><span><i class="alt"></i>Estimasi</span></div>';
    return h + '<div class="wo-tblwrap"><table class="wo-tbl"><tr><th>Tanggal</th><th>Pekerjaan</th><th>Jam</th><th>Catatan</th><th></th></tr>' +
      logs.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function (l) { return '<tr><td>' + fd(l.date) + '</td><td>' + esc(jn(l.jobId)) + '</td><td>' + l.hours + '</td><td>' + esc(l.notes || '') + '</td><td class="r"><button class="wo-mini" data-a="edit" data-e="log" data-id="' + l.id + '">Edit</button> <button class="wo-mini dng" data-a="del" data-e="log" data-id="' + l.id + '">Hapus</button></td></tr>'; }).join('') + '</table></div>';
  }
  function stat(b, s) { return '<div class="wo-stat"><b>' + b + '</b><span>' + s + '</span></div>'; }

  /* ---------- tampilan: dokumen ---------- */
  function docsHTML(jobId) {
    var L = D.wdoc.filter(function (d) { return (!jobId || d.jobId === jobId) && (S.dt === 'Semua' || d.type === S.dt); });
    var pre = jobId ? ' data-pk="jobId" data-pv="' + jobId + '"' : '';
    var h = '<div class="wo-bar"><div class="wo-chips">' + ['Semua'].concat(DT).map(function (x) { return '<button data-a="filt" data-f="dt" data-v="' + x + '" aria-pressed="' + (S.dt === x) + '">' + x + '</button>'; }).join('') + '</div><button class="wo-btn go" data-a="add" data-e="wdoc"' + pre + '>+ Dokumen</button></div>';
    if (!L.length) return h + '<p class="wo-empty">Belum ada dokumen.</p>';
    return h + L.map(function (d) {
      return '<div class="wo-item"><div class="wo-ib"><b>' + esc(d.title) + '</b><em class="wo-st" style="--s:#8b5cf6">' + esc(d.type) + '</em><small>' + (jobId ? '' : esc(jn(d.jobId))) + (d.link ? (jobId ? '' : ' · ') + K.link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' +
        '<button class="wo-mini" data-a="edit" data-e="wdoc" data-id="' + d.id + '">Edit</button><button class="wo-mini dng" data-a="del" data-e="wdoc" data-id="' + d.id + '">Hapus</button></div>';
    }).join('');
  }

  /* ---------- tampilan: pendapatan ---------- */
  function incomeHTML(jobId) {
    var js = D.job.filter(function (j) { return (!jobId || j.id === jobId) && +j.income > 0 && j.incomeStatus !== 'Tidak relevan'; });
    var sum = function (s) { return js.filter(function (j) { return j.incomeStatus === s; }).reduce(function (a, j) { return a + +j.income; }, 0); };
    return '<div class="wo-warn"><b>Dipisahkan dari pemasukan pribadi.</b> Angka di sini hanya pendapatan pekerjaan. Tidak ada yang otomatis masuk ke pemasukan pribadi; hubungan ke modul keuangan nanti lewat referensi transaksi per pekerjaan.</div>' +
      '<div class="wo-stats">' + stat(rp(sum('Sudah diterima')), 'Sudah diterima') + stat(rp(sum('Sudah ditagih')), 'Sudah ditagih, belum diterima') + stat(rp(sum('Belum ditagih')), 'Belum ditagih') + '</div>' +
      (js.length ? '<div class="wo-tblwrap"><table class="wo-tbl"><tr><th>Pekerjaan</th><th>Klien</th><th>Jumlah</th><th>Status</th><th>Ref. transaksi</th></tr>' + js.map(function (j) { return '<tr class="click" data-a="jfull" data-id="' + j.id + '"><td>' + esc(j.title) + '</td><td>' + esc(cn(j.clientId) || 'Tanpa klien') + '</td><td>' + rp(j.income) + '</td><td>' + esc(j.incomeStatus) + '</td><td>' + esc(j.txRef || '—') + '</td></tr>'; }).join('') + '</table></div>' : '<p class="wo-empty">Belum ada pekerjaan dengan pendapatan. Isi di form detail pekerjaan.</p>');
  }

  /* ---------- DUNIA BARU (detail pekerjaan) ---------- */
  function worldHTML() {
    var j = by(D.job, S.world); if (!j) { S.world = null; return viewHTML(0); }
    var i = D.job.indexOf(j), c = jobColor(j, i), p = prog(j.id), tn = tOf(j.id), td = tn.filter(function (x) { return x.status === 'Selesai'; }).length, a = hrs(j.id);
    var body = ({
      tasks: function () { return tasksHTML(j.id); }, hours: function () { return hoursHTML(j.id); }, docs: function () { return docsHTML(j.id); }, income: function () { return incomeHTML(j.id); },
      info: function () { return infoHTML(j); }
    })[S.wtab]();
    return '<div class="wo-world" style="--c:' + c + ';--t:' + ink(c) + '">' +
      '<div class="wo-wh"><div class="wo-wart">' + art(j, i) + '</div><div class="wo-wi">' +
      '<small class="wo-sub">' + esc(cn(j.clientId) || 'Tanpa klien') + '</small><h2>' + esc(j.title) + '</h2>' +
      '<div class="wo-rail sm" role="group" aria-label="Ubah status">' + JS.map(function (s) { return '<button data-a="jstat" data-id="' + j.id + '" data-s="' + s + '" aria-pressed="' + (j.status === s) + '" style="--s:' + SCOL[s] + '">' + s + '</button>'; }).join('') + '</div>' +
      '<div class="wo-xp"><div class="wo-track big"><i style="width:' + (p || 0) + '%"></i></div><span>' + (p == null ? 'Belum ada tugas — progres belum bisa dihitung' : td + ' dari ' + tn.length + ' tugas selesai (' + fmt(p) + '%)') + '</span></div>' +
      '<div class="wo-wbtns"><button class="wo-btn" data-a="jedit" data-id="' + j.id + '">✎ Edit kartu</button><button class="wo-btn" data-a="jfull" data-id="' + j.id + '">Detail lengkap</button></div></div></div>' +
      '<div class="wo-stats w">' + stat(td + '/' + tn.length, 'Tugas selesai') + stat(fmt(a) + (has(j.estHours) ? ' / ' + fmt(+j.estHours) : ''), 'Jam aktual / estimasi') + stat(j.deadline ? fd(j.deadline) : '—', late(j) ? 'Tenggat (lewat!)' : 'Tenggat') + stat(+j.income > 0 && j.incomeStatus !== 'Tidak relevan' ? rp(j.income) : '—', 'Pendapatan' + (j.incomeStatus && j.incomeStatus !== 'Tidak relevan' ? ' · ' + j.incomeStatus : '')) + '</div>' +
      '<nav class="wo-wtabs">' + WTABS.map(function (x) { return '<button data-a="wtab" data-v="' + x[0] + '" aria-current="' + (S.wtab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</nav>' +
      '<div class="wo-wbody">' + body + '</div></div>';
  }
  function infoHTML(j) {
    var rows = [['Klien', cn(j.clientId) || 'Tanpa klien'], ['Status', j.status], ['Tenggat', fd(j.deadline)], ['Estimasi durasi', has(j.estHours) ? j.estHours + ' jam' : '—'], ['Pendapatan', +j.income > 0 ? rp(j.income) + ' · ' + j.incomeStatus : '—'], ['Ref. transaksi', j.txRef || '—']];
    return '<div class="wo-box"><div class="wo-kv">' + rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' +
      (j.desc ? '<p class="wo-note"><b>Deskripsi</b>\n' + esc(j.desc) + '</p>' : '') + (j.notes ? '<p class="wo-note"><b>Catatan</b>\n' + esc(j.notes) + '</p>' : '') +
      '<div class="wo-row"><button class="wo-btn go" data-a="jfull" data-id="' + j.id + '">Edit detail lengkap</button><button class="wo-btn" data-a="jedit" data-id="' + j.id + '">✎ Edit kartu</button><button class="wo-btn dng" data-a="jdel" data-id="' + j.id + '">Hapus pekerjaan</button></div></div>';
  }

  /* ---------- editor kartu (gambar, warna, nama, status) ---------- */
  function openJobModal(id) {
    var ed = id ? by(D.job, id) : null, idx = ed ? D.job.indexOf(ed) : D.job.length;
    var m = { title: ed ? ed.title : '', clientId: ed ? ed.clientId || '' : '', status: ed ? ed.status : 'Berjalan', deadline: ed ? ed.deadline || '' : '', color: ed ? jobColor(ed, idx) : PALETTE[idx % PALETTE.length], img: ed ? ed.img || '' : '' };
    var w = document.createElement('div'); w.className = 'wo-ov2';
    w.innerHTML = '<form class="wo-modal" novalidate><header><h2>' + (ed ? 'Edit Kartu' : 'Pekerjaan Baru') + '</h2><button type="button" class="wo-x" data-x aria-label="Tutup">×</button></header>' +
      '<div class="wo-mbody"><div class="wo-prev"><div class="wo-card on" data-pv style="--c:' + m.color + ';--t:' + ink(m.color) + '"></div></div><div class="wo-fields">' +
      '<label class="full"><span>Nama pekerjaan *</span><input name="title" type="text" value="' + esc(m.title) + '" required maxlength="80"></label>' +
      '<label><span>Klien</span><select name="clientId"><option value="">— Internal / tanpa klien —</option>' + D.client.map(function (c) { return '<option value="' + c.id + '"' + (c.id === m.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Status</span><select name="status">' + JS.map(function (s) { return '<option' + (s === m.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      '<label class="full"><span>Tenggat waktu</span><input name="deadline" type="date" value="' + esc(m.deadline) + '"></label>' +
      '<div class="full"><span class="lb">Warna latar kartu</span><div class="wo-sw">' + PALETTE.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Warna ' + c + '"></button>'; }).join('') + '<label class="wo-cp" title="Warna sendiri"><input type="color" name="color" value="' + m.color + '"></label></div></div>' +
      '<div class="full"><span class="lb">Gambar kartu</span><div class="wo-upl"><label class="wo-btn">Pilih gambar…<input type="file" accept="image/*" hidden name="file"></label><button type="button" class="wo-btn" data-noimg>Hapus gambar</button></div><small class="wo-hint">PNG transparan hasilnya paling bagus. Gambar otomatis dikecilkan agar hemat penyimpanan.</small></div>' +
      '</div></div><footer><button type="button" class="wo-btn" data-x>Batal</button>' + (ed ? '' : '<button type="button" class="wo-btn" data-more>Simpan & isi detail</button>') + '<button class="wo-btn go" style="--c:' + m.color + '">Simpan</button></footer></form>';
    document.body.appendChild(w);
    var f = w.querySelector('form'), more = false;
    function sync() {
      var pv = w.querySelector('[data-pv]'), c = m.color, t = f.elements.title.value || 'Nama pekerjaan', cl = f.elements.clientId.selectedOptions[0];
      pv.style.setProperty('--c', c); pv.style.setProperty('--t', ink(c));
      pv.innerHTML = '<div class="wo-ct"><div class="wo-tx"><h3>' + esc(t) + '</h3><small>' + esc(cl && cl.value ? cl.textContent : 'Tanpa klien') + '</small><em class="wo-st" style="--s:' + (SCOL[f.elements.status.value] || '#999') + '">' + esc(f.elements.status.value) + '</em></div><span class="wo-pill"><i></i>0%</span></div><div class="wo-art">' + (m.img ? '<img class="wo-img" src="' + esc(m.img) + '" alt="">' : mascot(idx)) + '</div>';
      [].forEach.call(w.querySelectorAll('.wo-sw button'), function (b) { b.classList.toggle('on', b.dataset.c === c); });
      w.querySelector('.wo-btn.go').style.setProperty('--c', c);
    }
    sync();
    f.addEventListener('input', function (e) { if (e.target.name === 'color') m.color = e.target.value; sync(); });
    f.addEventListener('change', function (e) {
      if (e.target.name === 'file' && e.target.files[0]) shrink(e.target.files[0], function (d) { m.img = d; sync(); });
      sync();
    });
    w.addEventListener('click', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-x')) w.remove();
      if (t.dataset.c) { m.color = t.dataset.c; f.elements.color.value = m.color; sync(); }
      if (t.hasAttribute('data-noimg')) { m.img = ''; f.elements.file.value = ''; sync(); }
      if (t.hasAttribute('data-more')) { more = true; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    w.addEventListener('mousedown', function (e) { if (e.target === w) w.remove(); });
    w.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); w.remove(); } });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var t = f.elements.title.value.trim(); if (!t) { f.elements.title.focus(); return; }
      var rec = ed || { id: uid(), incomeStatus: 'Tidak relevan' };
      rec.title = t; rec.clientId = f.elements.clientId.value; rec.status = f.elements.status.value; rec.deadline = f.elements.deadline.value; rec.color = m.color; rec.img = m.img;
      if (!ed) { D.job.push(rec); S.q = ''; S.fs = ''; S.idx = D.job.length - 1; }
      save(); w.remove(); render();
      if (more) app.form('job', rec.id);
    });
    f.elements.title.focus();
  }
  function shrink(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var M = 560, k = Math.min(1, M / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        var d = cv.toDataURL('image/webp', 0.86); if (d.indexOf('data:image/webp') !== 0) d = cv.toDataURL('image/png');
        cb(d);
      };
      im.onerror = function () { MO.msg('Gambar gagal dibaca', 'Coba file gambar lain.'); };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- event ---------- */
  function onClick(e) {
    var t = e.target.closest('[data-a]'); if (!t || !ov.contains(t)) return;
    if (dragged) return;
    var a = t.dataset.a, d = t.dataset;
    if (a === 'close') return close();
    if (a === 'back') { S.world = null; return render(); }
    if (a === 'nav') { S.view = d.v; S.world = null; return render(); }
    if (a === 'prev') return go(pos - 1);
    if (a === 'next') return go(pos + 1);
    if (a === 'jadd') return openJobModal();
    if (a === 'open') return openWorld(d.id);
    if (a === 'jedit') return openJobModal(d.id);
    if (a === 'jfull') return app.form('job', d.id);
    if (a === 'jdel') { app.del('job', d.id); if (!by(D.job, d.id)) { S.world = null; S.idx = Math.max(0, S.idx - 1); render(); } return; }
    if (a === 'jstat') { var j = by(D.job, d.id); if (j) { j.status = d.s; save(); if (S.world) render(); else render(); } return; }
    if (a === 'wtab') { S.wtab = d.v; return render(); }
    if (a === 'filt') { S[d.f] = d.v; return render(); }
    if (a === 'add') {
      if (['wtask', 'log'].indexOf(d.e) > -1 && guardJobs()) return;
      var pre = {}; if (d.pk) pre[d.pk] = d.pv; return app.form(d.e, null, pre);
    }
    if (a === 'edit') return app.form(d.e, d.id);
    if (a === 'del') return app.del(d.e, d.id);
  }
  ov_cardClick();
  function ov_cardClick() {
    document.addEventListener('click', function (e) {
      if (!isOpen || dragged) return; var c = e.target.closest && e.target.closest('.wo-stage .wo-card'); if (!c || !ov.contains(c)) return;
      e.stopPropagation();
      var L = filtered(), i = c.classList.contains('add') ? L.length : +c.dataset.i;
      if (i !== Math.round(pos)) return go(i);
      if (c.classList.contains('add')) return openJobModal();
      openWorld(c.dataset.id);
    }, true);
  }
  function onChange(e) {
    var t = e.target, k = t.dataset && t.dataset.chg; if (!k) return;
    if (k === 'fs') { S.fs = t.value; S.idx = 0; return render(); }
    if (k === 'tgw' || k === 'tst') {
      var x = by(D.wtask, t.dataset.id); if (!x) return;
      x.status = k === 'tgw' ? (t.checked ? 'Selesai' : 'Belum dikerjakan') : t.value; save(); render();
    }
  }
  function onInput(e) {
    var t = e.target; if (!t.dataset || t.dataset.in !== 'q') return;
    S.q = t.value; S.idx = 0; var p = t.selectionStart; render();
    var n = frame.querySelector('[data-in="q"]'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (x) { } }
  }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('wo-card') && e.target.classList.contains('add')) { e.preventDefault(); openJobModal(); }
  }

  MO.routes['#work'] = open;
})();
;
/* MyOffice — Organization "eShop" : tampilan terang ala toko game (hero + grid kartu).
   Memakai data Organization lama (localStorage mo-org-v1); semua fitur lama tetap ada. */
(function () {
  'use strict';
  var MO = window.MyOffice; if (!MO || !MO.org || !MO.kit) return;
  var K = MO.kit, esc = K.esc, rp = K.rp, fd = K.fd, by = K.by, uid = K.uid;
  var app = MO.org.app, D = app.D;
  ['org', 'meeting', 'followup', 'budget', 'odoc'].forEach(function (k) { if (!D[k]) D[k] = []; });

  var FS = ['Belum', 'Berjalan', 'Selesai'];
  var OD = ['Proposal', 'Notulen', 'Laporan pertanggungjawaban', 'Surat', 'Materi presentasi', 'Dokumen lainnya'];
  var PALETTE = ['#e60012', '#00a0e9', '#f5a300', '#2db36f', '#8a5cf6', '#ff6fa5', '#14b8a6', '#ff7a1a'];
  var NAV = [['search', 'Cari'], ['orgs', 'Organisasi'], ['meet', 'Rapat'], ['bud', 'Anggaran'], ['docs', 'Dokumen']];
  var WT = [['meet', 'Rapat'], ['bud', 'Anggaran'], ['docs', 'Dokumen'], ['info', 'Info']];

  var S = { view: 'orgs', idx: 0, q: '', world: null, wtab: 'meet', od: 'Semua' };
  var ov, frame, isOpen = false, drag = null, dragged = false;

  function oc(o, i) { return o.color || PALETTE[(i == null ? D.org.indexOf(o) : i) % PALETTE.length]; }
  function lum(h) { h = (h || '#888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return (0.299 * parseInt(h.substr(0, 2), 16) + 0.587 * parseInt(h.substr(2, 2), 16) + 0.114 * parseInt(h.substr(4, 2), 16)) / 255; }
  function ink(h) { return lum(h) > 0.7 ? '#1a1405' : '#fff'; }
  function on(id) { var o = by(D.org, id); return o ? o.name : '—'; }
  function save() { app.save(); }
  function cnt(id, k) { return D[k].filter(function (x) { return x.orgId === id; }).length; }
  function bsum(id) { var P = 0, A = 0; D.budget.forEach(function (b) { if (!id || b.orgId === id) { P += +b.planned || 0; A += +b.actual || 0; } }); return { P: P, A: A }; }
  function guardOrg() { if (!D.org.length) { MO.msg('Belum ada organisasi', 'Tambahkan profil organisasi terlebih dahulu.'); return true; } return false; }
  function filtered() { var q = S.q.toLowerCase().trim(); return D.org.filter(function (o) { return !q || (o.name + ' ' + (o.role || '') + ' ' + (o.period || '') + ' ' + (o.desc || '')).toLowerCase().indexOf(q) > -1; }); }
  var I = {
    cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    role: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/></svg>',
    ppl: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-4.5 11.2-4.5 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .5 3.3 2.7 3.5 6"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
    srch: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  /* ilustrasi bawaan (kantor/gedung di bukit) */
  function scene(i) {
    var v = i % 3;
    return '<svg class="es-scene" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="600" height="340" class="s0"/><circle cx="' + (v === 1 ? 140 : 470) + '" cy="82" r="38" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="130" cy="64" rx="60" ry="16" fill="#fff" opacity=".7"/><ellipse cx="380" cy="104" rx="70" ry="15" fill="#fff" opacity=".6"/>' +
      '<path d="M0 250Q150 170 300 230T600 210V340H0Z" class="s1"/><path d="M0 290Q200 230 380 280T600 260V340H0Z" class="s2"/>' +
      '<g class="s3" transform="translate(' + (v === 2 ? 120 : 330) + ' 120)"><rect x="0" y="40" width="120" height="110" rx="6"/><rect x="30" y="0" width="60" height="50" rx="5"/>' +
      '<g fill="#fff" opacity=".9"><rect x="14" y="58" width="16" height="16" rx="3"/><rect x="52" y="58" width="16" height="16" rx="3"/><rect x="90" y="58" width="16" height="16" rx="3"/><rect x="14" y="90" width="16" height="16" rx="3"/><rect x="90" y="90" width="16" height="16" rx="3"/><rect x="46" y="112" width="28" height="38" rx="3"/><rect x="42" y="14" width="14" height="14" rx="3"/><rect x="64" y="14" width="14" height="14" rx="3"/></g>' +
      '<path d="M60 0V-30" stroke="#fff" stroke-width="4"/><path d="M60-30l30 9-30 9Z" fill="#ffd24a"/></g></svg>';
  }
  function art(o, i) { return o.img ? '<img class="es-img" src="' + esc(o.img) + '" alt="" draggable="false">' : scene(i); }

  /* ---------- kerangka ---------- */
  function build() {
    ov = document.createElement('div'); ov.className = 'es-ov'; ov.hidden = true;
    ov.innerHTML = '<section class="es-frame" role="dialog" aria-modal="true" aria-label="Organization"></section>';
    document.body.appendChild(ov); frame = ov.firstChild;
    ov.addEventListener('click', onClick); ov.addEventListener('change', onChange); ov.addEventListener('input', onInput);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { if (document.querySelector('.ac-ov2, .es-ov2, .ac-soon:not([hidden])')) return; if (S.world) { S.world = null; render(); } else close(); return; }
      if (S.view === 'orgs' && !S.world && !document.querySelector('.ac-ov2, .es-ov2') && /^(ArrowLeft|ArrowRight)$/.test(e.key) && !/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) pick(S.idx + (e.key === 'ArrowRight' ? 1 : -1));
    });
    app.onChange = function () { if (isOpen) render(); };
  }
  function open() { if (!ov) build(); isOpen = true; ov.hidden = false; document.body.style.overflow = 'hidden'; render(); }
  function close() { isOpen = false; if (ov) ov.hidden = true; document.body.style.overflow = ''; }

  function render() {
    if (!isOpen) return;
    var m0 = frame.querySelector('.es-main'), top = m0 ? m0.scrollTop : 0, cur = filtered()[Math.min(S.idx, Math.max(0, filtered().length - 1))];
    var av = cur ? (cur.img ? '<img src="' + esc(cur.img) + '" alt="">' : '<b>' + esc((cur.name || '?').charAt(0).toUpperCase()) + '</b>') : '<b>O</b>';
    frame.innerHTML =
      '<header class="es-top"><div class="es-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg></div>' +
      '<nav class="es-nav" aria-label="Menu Organization">' + (S.world ? '<button class="es-bk" data-a="back">‹ Semua organisasi</button>' : NAV.map(function (x) {
        if (x[0] === 'search') return '<label class="es-sbox' + (S.q ? ' on' : '') + '">' + I.srch + '<input data-in="q" type="search" placeholder="Cari" value="' + esc(S.q) + '" aria-label="Cari organisasi"></label>';
        return '<button data-a="nav" data-v="' + x[0] + '" aria-current="' + (S.view === x[0]) + '">' + x[1] + '</button>';
      }).join('')) + '</nav>' +
      '<div class="es-r"><span class="es-av" title="' + (cur ? esc(cur.name) : '') + '">' + av + '</span><button class="es-x" data-a="close" aria-label="Tutup">×</button></div></header>' +
      '<div class="es-main">' + (S.world ? worldHTML() : viewHTML()) + '</div>';
    var m = frame.querySelector('.es-main'); if (m) m.scrollTop = top;
    var h = frame.querySelector('.es-hero'); if (h) bindHero(h);
  }
  function viewHTML() {
    if (S.view === 'orgs') return orgsHTML();
    var b = ({ meet: function () { return meetHTML(null); }, bud: function () { return budHTML(null); }, docs: function () { return docsHTML(null); } })[S.view]();
    return '<div class="es-page"><h2 class="es-h2">' + ({ meet: 'Rapat', bud: 'Anggaran', docs: 'Dokumen' })[S.view] + '</h2>' + b + '</div>';
  }

  /* ---------- beranda: hero + grid ---------- */
  function orgsHTML() {
    var L = filtered(), i = Math.min(S.idx, Math.max(0, L.length - 1)), o = L[i];
    var grid = '<div class="es-grid">' + L.map(function (x, k) {
      var c = oc(x), isNew = x === D.org[D.org.length - 1] && D.org.length > 1;
      return '<button class="es-card' + (k === i ? ' sel' : '') + '" data-a="pick" data-i="' + k + '" style="--c:' + c + '" aria-pressed="' + (k === i) + '"><span class="es-thumb">' + art(x, D.org.indexOf(x)) + '</span><span class="es-cap">' + esc(x.name) + '</span>' + (isNew ? '<em>BARU</em>' : '') + '</button>';
    }).join('') + '<button class="es-card add" data-a="oadd"><span class="es-thumb"><i>+</i></span><span class="es-cap">Tambah organisasi</span></button></div>';
    if (!o) return '<div class="es-hero empty"><div class="es-txt"><h1>' + (D.org.length ? 'Tidak ada hasil' : 'Belum ada organisasi') + '</h1><p class="es-desc">' + (D.org.length ? 'Coba kata kunci lain.' : 'Tambahkan organisasi pertama kamu untuk mulai mencatat rapat, anggaran, dan dokumen.') + '</p></div></div>' + grid;
    var c = oc(o), b = bsum(o.id);
    return '<div class="es-hero" style="--c:' + c + '"><div class="es-art">' + art(o, D.org.indexOf(o)) + '</div>' +
      '<div class="es-txt"><h1>' + esc(o.name) + '</h1>' +
      '<div class="es-meta">' + I.cal + '<span>' + esc(o.period ? 'Periode ' + o.period : 'Periode belum diisi') + '</span></div>' +
      '<div class="es-meta">' + I.role + '<span>' + esc(o.role ? 'Jabatan: ' + o.role : 'Jabatan belum diisi') + '</span></div>' +
      '<div class="es-meta">' + I.ppl + '<span>' + cnt(o.id, 'meeting') + ' rapat · ' + cnt(o.id, 'odoc') + ' dokumen' + (b.P ? ' · sisa ' + rp(b.P - b.A) : '') + '</span></div>' +
      (o.desc ? '<p class="es-desc">' + esc(o.desc) + '</p>' : '') +
      '<div class="es-btns"><button class="es-buy" data-a="open" data-id="' + o.id + '">' + I.open + '<span>Buka</span></button><button class="es-ghost" data-a="oedit" data-id="' + o.id + '">✎ Edit kartu</button><button class="es-ghost dng" data-a="odel" data-id="' + o.id + '">Hapus</button></div></div>' +
      '<div class="es-dots" role="tablist" aria-label="Pilih organisasi">' + L.map(function (x, k) { return '<button data-a="pick" data-i="' + k + '" aria-selected="' + (k === i) + '" aria-label="' + esc(x.name) + '"></button>'; }).join('') + '</div></div>' + grid;
  }
  function pick(i) { var n = filtered().length; if (!n) return; S.idx = ((i % n) + n) % n; render(); }
  function bindHero(h) {
    h.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; drag = { x: e.clientX, id: e.pointerId }; });
    h.addEventListener('pointerup', function (e) { if (!drag) return; var dx = e.clientX - drag.x; drag = null; if (Math.abs(dx) > 60) { dragged = true; setTimeout(function () { dragged = false; }, 0); pick(S.idx + (dx < 0 ? 1 : -1)); } });
    h.addEventListener('pointercancel', function () { drag = null; });
  }

  /* ---------- Rapat ---------- */
  function meetHTML(orgId) {
    var L = D.meeting.filter(function (m) { return !orgId || m.orgId === orgId; }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var h = '<div class="es-bar"><p class="es-hint">Agenda, catatan, keputusan, dan tindak lanjut beserta penanggung jawabnya.</p><button class="es-buy sm" data-a="add" data-e="meeting"' + (orgId ? ' data-pk="orgId" data-pv="' + orgId + '"' : '') + '>+ Rapat</button></div>';
    if (!L.length) return h + '<p class="es-empty">Belum ada rapat.</p>';
    return h + L.map(function (m) {
      var fs = D.followup.filter(function (f) { return f.meetingId === m.id; }), c = oc(by(D.org, m.orgId) || {}, D.org.indexOf(by(D.org, m.orgId)));
      return '<article class="es-box" style="--c:' + c + '"><div class="es-row"><div><h3>' + esc(m.title) + '</h3><small>' + esc(on(m.orgId)) + ' · ' + fd(m.date) + '</small></div>' + btns('meeting', m.id) + '</div>' +
        (m.agenda ? '<div class="es-notes"><b>Agenda</b>\n' + esc(m.agenda) + '</div>' : '') + (m.notes ? '<div class="es-notes"><b>Catatan</b>\n' + esc(m.notes) + '</div>' : '') + (m.decisions ? '<div class="es-notes"><b>Keputusan</b>\n' + esc(m.decisions) + '</div>' : '') +
        fs.map(function (f) {
          return '<div class="es-item' + (f.status === 'Selesai' ? ' done' : '') + '"><input type="checkbox" data-chg="tgf" data-id="' + f.id + '"' + (f.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div class="es-ib"><button class="es-t" data-a="edit" data-e="followup" data-id="' + f.id + '">' + esc(f.task) + '</button><small>PJ: ' + esc(f.pic || '—') + ' · Tenggat: ' + fd(f.due) + ' · ' + esc(f.status) + '</small></div><button class="es-mini dng" data-a="del" data-e="followup" data-id="' + f.id + '" aria-label="Hapus">×</button></div>';
        }).join('') + '<button class="es-mini" data-a="add" data-e="followup" data-pk="meetingId" data-pv="' + m.id + '">+ Tindak lanjut</button></article>';
    }).join('');
  }
  function btns(e, id) { return '<div class="es-acts"><button class="es-mini" data-a="edit" data-e="' + e + '" data-id="' + id + '">Edit</button><button class="es-mini dng" data-a="del" data-e="' + e + '" data-id="' + id + '">Hapus</button></div>'; }

  /* ---------- Anggaran ---------- */
  function budHTML(orgId) {
    var h = '<div class="es-bar"><p class="es-hint">Selisih = rencana − aktual. Anggaran organisasi tidak tercampur dengan keuangan pribadi.</p><button class="es-buy sm" data-a="add" data-e="budget"' + (orgId ? ' data-pk="orgId" data-pv="' + orgId + '"' : '') + '>+ Pos anggaran</button></div>';
    var os = D.org.filter(function (o) { return (!orgId || o.id === orgId) && D.budget.some(function (b) { return b.orgId === o.id; }); });
    if (!os.length) return h + '<p class="es-empty">Belum ada pos anggaran.</p>';
    var diff = function (x) { return '<b class="' + (x < 0 ? 'neg' : '') + '">' + (x < 0 ? '−' : '') + rp(Math.abs(x)) + '</b>'; };
    return h + os.map(function (o) {
      var bs = D.budget.filter(function (b) { return b.orgId === o.id; }), t = bsum(o.id);
      return '<article class="es-box" style="--c:' + oc(o) + '"><h3>' + esc(o.name) + '</h3><div class="es-stats"><div><span>Rencana</span><b>' + rp(t.P) + '</b></div><div><span>Aktual</span><b>' + rp(t.A) + '</b></div><div><span>Selisih' + (t.P - t.A < 0 ? ' (melebihi)' : ' (sisa)') + '</span>' + diff(t.P - t.A) + '</div></div>' +
        '<div class="es-tblwrap"><table class="es-tbl"><tr><th>Pos</th><th>Rencana</th><th>Aktual</th><th>Selisih</th><th>Bukti</th></tr>' + bs.map(function (b) { return '<tr class="click" data-a="edit" data-e="budget" data-id="' + b.id + '"><td>' + esc(b.item) + '</td><td>' + rp(b.planned) + '</td><td>' + rp(b.actual) + '</td><td>' + diff((+b.planned || 0) - (+b.actual || 0)) + '</td><td>' + esc(b.proof || '') + (b.link ? ' ' + K.link(b.link) : '') + '</td></tr>'; }).join('') + '</table></div></article>';
    }).join('');
  }

  /* ---------- Dokumen ---------- */
  function docsHTML(orgId) {
    var L = D.odoc.filter(function (d) { return (!orgId || d.orgId === orgId) && (S.od === 'Semua' || d.type === S.od); });
    var h = '<div class="es-bar"><div class="es-chips">' + ['Semua'].concat(OD).map(function (x) { return '<button data-a="filt" data-v="' + x + '" aria-pressed="' + (S.od === x) + '">' + x + '</button>'; }).join('') + '</div><button class="es-buy sm" data-a="add" data-e="odoc"' + (orgId ? ' data-pk="orgId" data-pv="' + orgId + '"' : '') + '>+ Dokumen</button></div>';
    if (!L.length) return h + '<p class="es-empty">Belum ada dokumen.</p>';
    return h + L.map(function (d) {
      return '<div class="es-item"><div class="es-ib"><b>' + esc(d.title) + '</b><em class="es-tag">' + esc(d.type) + '</em><small>' + esc(on(d.orgId)) + ' · ' + fd(d.date) + (d.link ? ' · ' + K.link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' + btns('odoc', d.id) + '</div>';
    }).join('');
  }

  /* ---------- dunia organisasi ---------- */
  function worldHTML() {
    var o = by(D.org, S.world); if (!o) { S.world = null; return viewHTML(); }
    var i = D.org.indexOf(o), c = oc(o, i), b = bsum(o.id);
    var body = ({ meet: function () { return meetHTML(o.id); }, bud: function () { return budHTML(o.id); }, docs: function () { return docsHTML(o.id); }, info: function () { return infoHTML(o); } })[S.wtab]();
    return '<div class="es-world" style="--c:' + c + '"><div class="es-hero sm"><div class="es-art">' + art(o, i) + '</div><div class="es-txt"><h1>' + esc(o.name) + '</h1>' +
      '<div class="es-meta">' + I.cal + '<span>' + esc(o.period ? 'Periode ' + o.period : 'Periode belum diisi') + '</span></div><div class="es-meta">' + I.role + '<span>' + esc(o.role ? 'Jabatan: ' + o.role : 'Jabatan belum diisi') + '</span></div>' +
      '<div class="es-btns"><button class="es-buy" data-a="oedit" data-id="' + o.id + '">✎ Edit kartu</button><button class="es-ghost" data-a="ofull" data-id="' + o.id + '">Detail lengkap</button></div></div></div>' +
      '<div class="es-stats top"><div><span>Rapat</span><b>' + cnt(o.id, 'meeting') + '</b></div><div><span>Dokumen</span><b>' + cnt(o.id, 'odoc') + '</b></div><div><span>Rencana anggaran</span><b>' + rp(b.P) + '</b></div><div><span>Sisa anggaran</span><b' + (b.P - b.A < 0 ? ' class="neg"' : '') + '>' + (b.P - b.A < 0 ? '−' : '') + rp(Math.abs(b.P - b.A)) + '</b></div></div>' +
      '<nav class="es-tabs">' + WT.map(function (x) { return '<button data-a="wtab" data-v="' + x[0] + '" aria-current="' + (S.wtab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</nav><div class="es-wbody">' + body + '</div></div>';
  }
  function infoHTML(o) {
    return '<div class="es-box"><div class="es-kv"><div><span>Nama</span><b>' + esc(o.name) + '</b></div><div><span>Periode</span><b>' + esc(o.period || '—') + '</b></div><div><span>Jabatan</span><b>' + esc(o.role || '—') + '</b></div></div>' +
      (o.desc ? '<div class="es-notes"><b>Deskripsi</b>\n' + esc(o.desc) + '</div>' : '') + (o.notes ? '<div class="es-notes"><b>Catatan</b>\n' + esc(o.notes) + '</div>' : '') +
      '<div class="es-acts"><button class="es-buy sm" data-a="ofull" data-id="' + o.id + '">Edit detail lengkap</button><button class="es-ghost" data-a="oedit" data-id="' + o.id + '">✎ Edit kartu</button><button class="es-ghost dng" data-a="odel" data-id="' + o.id + '">Hapus organisasi</button></div></div>';
  }

  /* ---------- editor kartu ---------- */
  function openOrgModal(id) {
    var ed = id ? by(D.org, id) : null, idx = ed ? D.org.indexOf(ed) : D.org.length;
    var m = { color: ed ? oc(ed, idx) : PALETTE[idx % PALETTE.length], img: ed ? ed.img || '' : '' };
    var w = document.createElement('div'); w.className = 'es-ov2';
    w.innerHTML = '<form class="es-modal" novalidate><header><h2>' + (ed ? 'Edit Kartu' : 'Organisasi Baru') + '</h2><button type="button" class="es-x" data-x aria-label="Tutup">×</button></header>' +
      '<div class="es-mbody"><div class="es-prev"><span class="es-card sel" data-pv style="--c:' + m.color + '"></span></div><div class="es-fields">' +
      '<label class="full"><span>Nama organisasi *</span><input name="name" type="text" value="' + esc(ed ? ed.name : '') + '" required maxlength="80"></label>' +
      '<label><span>Periode kepengurusan</span><input name="period" type="text" placeholder="2025–2026" value="' + esc(ed ? ed.period || '' : '') + '"></label>' +
      '<label><span>Jabatan saya</span><input name="role" type="text" value="' + esc(ed ? ed.role || '' : '') + '"></label>' +
      '<div class="full"><span class="lb">Warna latar kartu</span><div class="es-sw">' + PALETTE.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Warna ' + c + '"></button>'; }).join('') + '<label class="es-cp" title="Warna sendiri"><input type="color" name="color" value="' + m.color + '"></label></div></div>' +
      '<div class="full"><span class="lb">Gambar kartu</span><div class="es-upl"><label class="es-ghost">Pilih gambar…<input type="file" accept="image/*" hidden name="file"></label><button type="button" class="es-ghost" data-noimg>Hapus gambar</button></div><small class="es-hint">Gambar lebar (landscape) paling pas. Otomatis dikecilkan agar hemat penyimpanan.</small></div>' +
      '</div></div><footer><button type="button" class="es-ghost" data-x>Batal</button>' + (ed ? '' : '<button type="button" class="es-ghost" data-more>Simpan & isi detail</button>') + '<button class="es-buy sm">Simpan</button></footer></form>';
    document.body.appendChild(w);
    var f = w.querySelector('form'), more = false;
    function sync() {
      var pv = w.querySelector('[data-pv]'); pv.style.setProperty('--c', m.color);
      pv.innerHTML = '<span class="es-thumb">' + (m.img ? '<img class="es-img" src="' + esc(m.img) + '" alt="">' : scene(idx)) + '</span><span class="es-cap">' + esc(f.elements.name.value || 'Nama organisasi') + '</span>';
      [].forEach.call(w.querySelectorAll('.es-sw button'), function (b) { b.classList.toggle('on', b.dataset.c === m.color); });
    }
    sync();
    f.addEventListener('input', function (e) { if (e.target.name === 'color') m.color = e.target.value; sync(); });
    f.addEventListener('change', function (e) { if (e.target.name === 'file' && e.target.files[0]) shrink(e.target.files[0], function (d) { m.img = d; sync(); }); });
    w.addEventListener('click', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-x')) w.remove();
      if (t.dataset.c) { m.color = t.dataset.c; f.elements.color.value = m.color; sync(); }
      if (t.hasAttribute('data-noimg')) { m.img = ''; f.elements.file.value = ''; sync(); }
      if (t.hasAttribute('data-more')) { more = true; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    w.addEventListener('mousedown', function (e) { if (e.target === w) w.remove(); });
    w.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); w.remove(); } });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var n = f.elements.name.value.trim(); if (!n) { f.elements.name.focus(); return; }
      var rec = ed || { id: uid() };
      rec.name = n; rec.period = f.elements.period.value.trim(); rec.role = f.elements.role.value.trim(); rec.color = m.color; rec.img = m.img;
      if (!ed) { D.org.push(rec); S.q = ''; S.idx = D.org.length - 1; }
      save(); w.remove(); render(); if (more) app.form('org', rec.id);
    });
    f.elements.name.focus();
  }
  function shrink(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var M = 900, k = Math.min(1, M / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        var d = cv.toDataURL('image/webp', 0.82); if (d.indexOf('data:image/webp') !== 0) d = cv.toDataURL('image/jpeg', 0.82);
        cb(d);
      };
      im.onerror = function () { MO.msg('Gambar gagal dibaca', 'Coba file gambar lain.'); };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- event ---------- */
  function onClick(e) {
    var t = e.target.closest('[data-a]'); if (!t || !ov.contains(t) || dragged) return;
    var a = t.dataset.a, d = t.dataset;
    if (a === 'close') return close();
    if (a === 'back') { S.world = null; return render(); }
    if (a === 'nav') { S.view = d.v; S.world = null; return render(); }
    if (a === 'pick') return pick(+d.i);
    if (a === 'oadd') return openOrgModal();
    if (a === 'oedit') return openOrgModal(d.id);
    if (a === 'ofull') return app.form('org', d.id);
    if (a === 'open') { S.world = d.id; S.wtab = 'meet'; render(); var m = frame.querySelector('.es-main'); if (m) m.scrollTop = 0; return; }
    if (a === 'odel') { app.del('org', d.id); if (!by(D.org, d.id)) { S.world = null; S.idx = 0; render(); } return; }
    if (a === 'wtab') { S.wtab = d.v; return render(); }
    if (a === 'filt') { S.od = d.v; return render(); }
    if (a === 'add') {
      if (['meeting', 'budget', 'odoc'].indexOf(d.e) > -1 && guardOrg()) return;
      if (d.e === 'followup' && !D.meeting.length) return MO.msg('Belum ada rapat', 'Tambahkan rapat terlebih dahulu.');
      var pre = {}; if (d.pk) pre[d.pk] = d.pv; return app.form(d.e, null, pre);
    }
    if (a === 'edit') return app.form(d.e, d.id);
    if (a === 'del') return app.del(d.e, d.id);
  }
  function onChange(e) {
    var t = e.target; if (t.dataset && t.dataset.chg === 'tgf') { var f = by(D.followup, t.dataset.id); if (f) { f.status = t.checked ? 'Selesai' : 'Belum'; save(); render(); } }
  }
  function onInput(e) {
    var t = e.target; if (!t.dataset || t.dataset.in !== 'q') return;
    S.q = t.value; S.idx = 0; S.view = 'orgs'; var p = t.selectionStart; render();
    var n = frame.querySelector('[data-in="q"]'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (x) { } }
  }

  MO.routes['#organization'] = open;
})();
;
/* MyOffice — Task (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, todayS = K.todayS, by = K.by, empty = K.empty, add = K.add, chips = K.chips, opt = K.opt, badge = K.badge;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var addDays = K.addDays = function (s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dd = K.dd = function (a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 864e5); };
  var PRI = ['Urgent', 'High', 'Medium', 'Low'], PCOL = { Urgent: '#d0443e', High: '#e07b39', Medium: '#d99a2b', Low: '#8aa0b8' }, PR = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  var ST = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Done', 'Archived'], AREAS = ['Akademik', 'Pekerjaan', 'Organisasi', 'Pribadi'];
  var TABS = [['myday', 'My Day'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['all', 'All Tasks'], ['project', 'By Project'], ['area', 'By Area'], ['done', 'Completed']];
  var projects = function () { return ls('mo-proj-v1').proj || []; };
  var sel = function (k, label, o, cur) { return '<select data-in="' + k + '" aria-label="' + label + '" style="width:auto">' + o.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur || '') ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>'; };

  var tasks = K.App('Task', 'mo-task-v1', function () { return { task: [], sub: [], cats: ['Belajar', 'Kerja', 'Rapat', 'Administrasi', 'Kesehatan', 'Rumah', 'Lainnya'] }; }, function (app) {
    var D = app.D, st = app.st; if (!D.cats) D.cats = ['Lainnya'];
    if (!D.dash || !D.dash.length) D.dash = [{ id: 'dash', emoji: '🥳', title: 'Halo', sub: 'Rencanakan hari ini dengan tenang', hint: 'Mulai dari tugas yang paling penting.', btn: 'Tambah tugas' }];
    var DS = D.dash[0];
    var live = function (t) { return t.status !== 'Done' && t.status !== 'Archived'; };
    var pn = function (id) { var p = by(projects(), id); return p ? p.name : ''; };
    var specs = {
      task: { title: 'Tugas', def: { status: 'To Do', priority: 'Medium', area: 'Pribadi' }, fields: [
        { k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 }, { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'status', l: 'Status', t: 'select', o: opt(ST) }, { k: 'priority', l: 'Prioritas', t: 'select', o: opt(PRI) },
        { k: 'area', l: 'Area', t: 'select', o: opt(AREAS) }, { k: 'category', l: 'Kategori', t: 'select', o: function () { return [['', '—']].concat(D.cats.map(function (c) { return [c, c]; })); } },
        { k: 'projId', l: 'Proyek terkait', t: 'select', full: 1, o: function () { return [['', '— Tanpa proyek —']].concat(projects().map(function (p) { return [p.id, p.name]; })); } },
        { k: 'start', l: 'Tanggal mulai', t: 'date' }, { k: 'due', l: 'Tenggat waktu', t: 'date' }, { k: 'dueTime', l: 'Jam tenggat (opsional)', t: 'time' },
        { k: 'estMin', l: 'Estimasi durasi (menit)', t: 'number', min: 0, step: '5' }, { k: 'remindAt', l: 'Pengingat', t: 'datetime-local' },
        { k: 'pin', l: 'Fokus hari ini (My Day)', t: 'select', bool: 1, o: [['false', 'Tidak'], ['true', 'Ya']] }, { k: 'doneAt', l: 'Tanggal selesai', t: 'date' },
        { k: 'goalRef', l: 'Terkait goal / milestone', t: 'select', full: 1, o: function () { return MO.goalOpts ? MO.goalOpts() : [['', '—']]; } },
        { k: 'notes', l: 'Catatan tambahan', t: 'textarea', full: 1 }] },
      dash: { title: 'Sapaan Dashboard', def: {}, fields: [{ k: 'title', l: 'Sapaan', t: 'text', req: 1, full: 1 }, { k: 'emoji', l: 'Emoji', t: 'text', ph: '🥳' }, { k: 'btn', l: 'Teks tombol', t: 'text' }, { k: 'sub', l: 'Kalimat utama', t: 'text', full: 1 }, { k: 'hint', l: 'Kalimat pendukung', t: 'text', full: 1 }] },
      sub: { title: 'Subtugas', def: {}, fields: [{ k: 'title', l: 'Subtugas', t: 'text', req: 1, full: 1 }] }
    };
    function dueTag(t) {
      if (!t.due) return '';
      var tm = t.dueTime ? ' ' + t.dueTime : '';
      if (!live(t)) return '<span class="ac-badge">' + fd(t.due) + '</span>';
      var d = dd(todayS(), t.due);
      if (d < 0) return badge('Terlambat ' + (-d) + ' hari', 'late');
      if (d === 0) return badge('Hari ini' + tm, 'mid');
      if (d <= 2) return badge((d === 1 ? 'Besok' : fd(t.due)) + tm, 'soon');
      return '<span class="ac-badge">' + fd(t.due) + tm + '</span>';
    }
    function card(t) {
      var subs = D.sub.filter(function (s) { return s.taskId === t.id; }), sd = subs.filter(function (s) { return s.done; }).length, done = t.status === 'Done';
      var meta = [t.area, t.category, t.projId && pn(t.projId), has(t.estMin) && t.estMin + ' mnt', t.start && 'Mulai ' + fd(t.start), t.doneAt && done && 'Selesai ' + fd(t.doneAt), t.remindAt && '🔔 ' + new Date(t.remindAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })].filter(Boolean).map(esc).join(' · ');
      return '<div class="ac-item' + (done ? ' done' : '') + '" style="border-left:3px solid ' + PCOL[t.priority] + '"><input type="checkbox" data-act="tgd" data-id="' + t.id + '"' + (done ? ' checked' : '') + ' aria-label="Selesai"><div>' +
        '<button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>' + badge(t.priority) + badge(t.status) + dueTag(t) + '<small>' + meta + '</small>' + (t.desc ? '<small>' + esc(t.desc) + '</small>' : '') + (t.notes ? '<small>Catatan: ' + esc(t.notes) + '</small>' : '') +
        (subs.length ? '<small style="margin-top:6px">Subtugas ' + sd + '/' + subs.length + '</small>' + subs.map(function (s) { return '<div style="display:flex;gap:8px;align-items:center;font-size:12.5px;margin-top:3px"><input type="checkbox" data-act="tgs" data-id="' + s.id + '"' + (s.done ? ' checked' : '') + ' aria-label="Subtugas selesai"><span style="' + (s.done ? 'opacity:.55;text-decoration:line-through' : '') + '">' + esc(s.title) + '</span><button class="ac-btn sm danger" style="padding:0 7px" data-act="del" data-e="sub" data-id="' + s.id + '" aria-label="Hapus subtugas">×</button></div>'; }).join('') : '') +
        '<div class="ac-acts" style="margin-top:8px"><button class="ac-btn sm" data-act="add" data-e="sub" data-pk="taskId" data-pv="' + t.id + '">+ Subtugas</button><button class="ac-btn sm" data-act="arch" data-id="' + t.id + '">' + (t.status === 'Archived' ? 'Pulihkan' : 'Arsipkan') + '</button>' +
        '<select data-chg="mvp" data-id="' + t.id + '" style="width:auto;padding:4px 8px;font-size:12px" aria-label="Pindahkan ke proyek"><option value="">Pindah ke proyek…</option><option value="__none">Tanpa proyek</option>' + projects().map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select>' +
        '<button class="ac-btn sm danger" data-act="del" data-e="task" data-id="' + t.id + '">Hapus</button></div></div></div>';
    }
    function match(t) {
      var q = (st.q || '').toLowerCase().trim(), today = todayS();
      if (q && (t.title + ' ' + (t.desc || '') + ' ' + (t.notes || '') + ' ' + (t.category || '')).toLowerCase().indexOf(q) < 0) return false;
      if (st.fs && t.status !== st.fs) return false; if (st.fp && t.priority !== st.fp) return false; if (st.fc && t.category !== st.fc) return false;
      if (st.fd === 'today' && t.due !== today) return false; if (st.fd === 'week' && !(t.due && t.due >= today && t.due <= addDays(today, 7))) return false;
      if (st.fd === 'late' && !(t.due && t.due < today && live(t))) return false; if (st.fd === 'none' && t.due) return false;
      return true;
    }
    function sorted(L) {
      return L.slice().sort(function (a, b) {
        var da = a.due || '9', db = b.due || '9', pa = PR[a.priority], pb = PR[b.priority];
        return st.so === 'pri' ? (pa - pb) || da.localeCompare(db) : da.localeCompare(db) || (pa - pb);
      });
    }
    function base(id) {
      var today = todayS();
      return D.task.filter(function (t) {
        if (id === 'myday') return live(t) && (t.pin || t.due === today || t.status === 'In Progress' || t.start === today);
        if (id === 'upcoming') return live(t) && t.due && t.due > today && t.due <= addDays(today, 30);
        if (id === 'overdue') return live(t) && t.due && t.due < today;
        if (id === 'done') return t.status === 'Done';
        return st.fs === 'Archived' ? true : t.status !== 'Archived';
      });
    }
    function toolbar(n) {
      var md = st.md || 'Daftar';
      return '<div class="ac-bar"><input type="text" data-in="q" placeholder="Cari tugas…" value="' + esc(st.q || '') + '" style="width:min(260px,100%)" aria-label="Cari tugas"><div class="ac-acts">' + add('task', 'Tugas') + '<button class="ac-btn" data-act="addcat">+ Kategori</button></div></div>' +
        '<div class="ac-chips">' + ['Daftar', 'Kanban', 'Kalender'].map(function (m) { return '<button class="ac-chip" aria-pressed="' + (m === md) + '" data-act="filt" data-f="md" data-v="' + m + '">' + m + '</button>'; }).join('') +
        sel('fs', 'Status', [['', 'Semua status']].concat(opt(ST)), st.fs) + sel('fp', 'Prioritas', [['', 'Semua prioritas']].concat(opt(PRI)), st.fp) + sel('fc', 'Kategori', [['', 'Semua kategori']].concat(D.cats.map(function (c) { return [c, c]; })), st.fc) +
        sel('fd', 'Tenggat', [['', 'Semua tenggat'], ['today', 'Hari ini'], ['week', '7 hari ke depan'], ['late', 'Terlambat'], ['none', 'Tanpa tenggat']], st.fd) + sel('so', 'Urutan', [['due', 'Urut: Tenggat'], ['pri', 'Urut: Prioritas']], st.so) + '</div>' +
        '<p class="ac-hint" style="margin-bottom:10px">' + n + ' tugas</p>';
    }
    function groups(id, L) {
      var today = todayS(), g = [];
      if (id === 'upcoming') {
        [['Besok', 1, 1], ['2–7 hari lagi', 2, 7], ['8–30 hari lagi', 8, 30]].forEach(function (r) { var x = L.filter(function (t) { var d = dd(today, t.due); return d >= r[1] && d <= r[2]; }); if (x.length) g.push([r[0], x]); });
      } else if (id === 'project') {
        var ids = {}; L.forEach(function (t) { ids[t.projId || ''] = 1; });
        Object.keys(ids).sort().forEach(function (k) { g.push([k ? (pn(k) || 'Proyek dihapus') : 'Tanpa proyek', L.filter(function (t) { return (t.projId || '') === k; })]); });
      } else if (id === 'area') {
        AREAS.concat(['']).forEach(function (a) { var x = L.filter(function (t) { return (t.area || '') === a; }); if (x.length) g.push([a || 'Tanpa area', x]); });
      } else g.push([null, L]);
      return g;
    }
    function kanban(L) {
      var cols = ST.slice(0, 5);
      return '<div class="kb kb5">' + cols.map(function (s, i) {
        var x = L.filter(function (t) { return t.status === s; });
        return '<div><h4>' + s + ' · ' + x.length + '</h4>' + x.map(function (t) {
          return '<div class="kc" style="border-left:3px solid ' + PCOL[t.priority] + '"><button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + esc(t.priority) + (t.due ? ' · ' : '') + (t.due ? dueTag(t) : '') + '</small><div class="ac-acts">' +
            (i > 0 ? '<button class="ac-btn sm" data-act="mvs" data-id="' + t.id + '" data-d="-1" aria-label="Mundur">←</button>' : '') + (i < 4 ? '<button class="ac-btn sm" data-act="mvs" data-id="' + t.id + '" data-d="1" aria-label="Maju">→</button>' : '') + '</div></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    function calView(L) {
      var key = st.tm || todayS().slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5), wk = (ls('mo-cal-v1').set || {}).wk; wk = wk == null ? 1 : +wk;
      var first = new Date(y, m - 1, 1), lead = (first.getDay() - wk + 7) % 7, n = new Date(y, m, 0).getDate(), today = todayS();
      var names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], h = '<div class="ac-bar"><div class="ac-acts"><button class="ac-btn sm" data-act="tnav" data-d="-1">←</button><b>' + first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</b><button class="ac-btn sm" data-act="tnav" data-d="1">→</button></div></div><div class="mg">';
      for (var i = 0; i < 7; i++) h += '<div class="mh">' + names[(wk + i) % 7] + '</div>';
      for (i = 0; i < lead; i++) h += '<div class="mc out"></div>';
      for (var d = 1; d <= n; d++) {
        var ds = key + '-' + pad(d), x = L.filter(function (t) { return t.due === ds; });
        h += '<div class="mc' + (ds === today ? ' td' : '') + '"><b>' + d + '</b>' + x.slice(0, 3).map(function (t) { return '<button class="ev tk" style="--c:' + PCOL[t.priority] + '" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>'; }).join('') + (x.length > 3 ? '<div class="more">+' + (x.length - 3) + ' lagi</div>' : '') + '</div>';
      }
      return h + '</div><p class="ac-hint" style="margin-top:8px">Tugas ditampilkan pada tanggal tenggatnya.</p>';
    }
    var AI = { Akademik: '🎓', Pekerjaan: '💼', Organisasi: '🏛️', Pribadi: '⭐' };
    function dash() {
      var T = todayS(), set = ls('mo-settings-v1'), nick = set.nick || '', act = D.task.filter(live), n = 0;
      var td = sorted(base('myday')).slice(0, 5);
      var pgm = st.pg || 'cat', kf = pgm === 'proj' ? function (t) { return t.projId ? pn(t.projId) || 'Proyek dihapus' : 'Tanpa proyek'; } : pgm === 'area' ? function (t) { return t.area || 'Tanpa area'; } : function (t) { return t.category || 'Tanpa kategori'; };
      var M = {}, ks = []; D.task.filter(function (t) { return t.status !== 'Archived'; }).forEach(function (t) { var k = kf(t); if (!M[k]) { M[k] = [0, 0]; ks.push(k); } M[k][1]++; if (t.status === 'Done') M[k][0]++; });
      ks.sort(function (a, b) { return M[b][1] - M[a][1]; });
      var key = st.tm || T.slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5), wk = (ls('mo-cal-v1').set || {}).wk; wk = wk == null ? 1 : +wk;
      var first = new Date(y, m - 1, 1), lead = (first.getDay() - wk + 7) % 7, nd = new Date(y, m, 0).getDate(), nm = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], i;
      var cal = '<div class="tk-cal">'; for (i = 0; i < 7; i++) cal += '<span class="tk-wd">' + nm[(wk + i) % 7] + '</span>'; for (i = 0; i < lead; i++) cal += '<span></span>';
      for (var d = 1; d <= nd; d++) { var ds = key + '-' + pad(d), c = act.filter(function (t) { return t.due === ds; }).length; cal += '<button class="tk-d' + (c ? ' on' : '') + (ds === T ? ' td' : '') + '" data-act="add" data-e="task" data-pre="' + esc(JSON.stringify({ due: ds })) + '" aria-label="Tambah tugas tanggal ' + d + (c ? ', ' + c + ' tugas' : '') + '">' + d + '</button>'; }
      cal += '</div>';
      var up = sorted(act.filter(function (t) { return t.due && t.due >= T && t.due <= addDays(T, 14); })).slice(0, 3);
      var cf = [[78, 12, '#4a9fff'], [90, 28, '#ff5f8d'], [68, 58, '#ffd34d'], [92, 66, '#4a9fff'], [80, 84, '#ff5f8d'], [62, 20, '#ffd34d']].map(function (x) { return '<i style="left:' + x[0] + '%;top:' + x[1] + '%;background:' + x[2] + '"></i>'; }).join('');
      var done = D.task.filter(function (t) { return t.status === 'Done'; }).length;
      return '<div class="tk-grid"><section class="tk-hero"><div class="tk-conf">' + cf + '</div><span class="tk-em">' + esc(DS.emoji || '🥳') + '</span><div><button class="tk-pen" data-act="edit" data-e="dash" data-id="dash" aria-label="Ubah sapaan">✎ Ubah</button><h3>' + esc(DS.title) + (nick ? ', <u>' + esc(nick) + '</u>' : '') + '!</h3><p>' + esc(DS.sub || '') + '</p><small>' + esc(DS.hint || '') + '</small><div><button class="tk-cta" data-act="add" data-e="task">' + esc(DS.btn || 'Tambah tugas') + ' +</button></div></div></section>' +
        '<section class="tk-card"><div class="tk-hd"><h4>Tugas hari ini</h4><button class="tk-va" data-act="tab" data-t="myday">Lihat semua</button></div>' + (td.length ? td.map(function (t) { return '<div class="tk-row"><input type="checkbox" data-act="tgd" data-id="' + t.id + '" aria-label="Selesai"><div><button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + (t.due ? fd(t.due) + (t.dueTime ? ' · ' + t.dueTime : '') : 'Tanpa tenggat') + ' · ' + esc(t.priority) + '</small></div></div>'; }).join('') : '<p class="tk-none">Belum ada tugas untuk hari ini. Tekan tombol di atas untuk menambah.</p>') + '</section>' +
        '<section class="tk-card"><div class="tk-hd"><h4>Progres tugas</h4><div class="tk-sw">' + [['cat', 'Kategori'], ['proj', 'Proyek'], ['area', 'Area']].map(function (o) { return '<button aria-pressed="' + (o[0] === pgm) + '" data-act="filt" data-f="pg" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        (ks.length ? ks.slice(0, 7).map(function (k, j) { var v = M[k]; return '<div class="tk-pr"><span>' + esc(k) + (pgm === 'cat' && D.cats.indexOf(k) > -1 ? ' <button class="tk-mini" data-act="rencat" data-n="' + esc(k) + '" aria-label="Ubah nama kategori ' + esc(k) + '">✎</button>' : '') + '</span><em>' + v[0] + '/' + v[1] + '</em><div class="tk-bar c' + (j % 4) + '"><i style="width:' + v[0] / v[1] * 100 + '%"></i></div></div>'; }).join('') : '<p class="tk-none">Belum ada tugas.</p>') + (pgm === 'cat' ? '<button class="tk-va" data-act="addcat">+ Kategori</button>' : '') + '</section>' +
        '<aside class="tk-side"><div class="tk-me"><span class="tk-av" style="' + (set.photo ? 'background-image:url(&quot;' + esc(set.photo) + '&quot;)' : '') + '"></span><div><b>' + esc(nick || 'Pengguna') + '</b><small>' + act.length + ' aktif · ' + done + ' selesai</small></div></div>' +
        '<div class="tk-card"><div class="tk-nav"><button data-act="tnav" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>' + first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</b><button data-act="tnav" data-d="1" aria-label="Bulan berikutnya">›</button></div>' + cal + '<small class="tk-none">Tekan tanggal untuk menambah tugas.</small></div>' +
        '<div class="tk-hd"><h4>Akan datang</h4><button class="tk-va" data-act="tab" data-t="upcoming">Lihat semua</button></div><small class="tk-none">' + fd(T) + '</small>' + (up.length ? up.map(function (t) { return '<button class="tk-ev" style="--c:' + PCOL[t.priority] + '" data-act="edit" data-e="task" data-id="' + t.id + '"><span><b>' + esc(t.title) + '</b><small>' + fd(t.due) + (t.dueTime ? ' · ' + t.dueTime : '') + '</small></span><i>' + (AI[t.area] || '⭐') + '</i></button>'; }).join('') : '<p class="tk-none">Tidak ada tugas 14 hari ke depan.</p>') + '</aside></div>';
    }
    function view(id) {
      var L = sorted(base(id).filter(match)), md = st.md || 'Daftar', h = toolbar(L.length);
      if (id === 'done') L.sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
      if (md === 'Kalender') return h + calView(L);
      if (!L.length) return h + empty(id === 'overdue' ? 'Tidak ada tugas terlambat.' : 'Tidak ada tugas pada tampilan ini.');
      if (md === 'Kanban') return h + kanban(L);
      return h + groups(id, L).map(function (g) { return (g[0] ? '<div class="ac-h">' + esc(g[0]) + ' · ' + g[1].length + '</div>' : '') + g[1].map(card).join(''); }).join('');
    }
    return {
      skin: 'tk-skin', specs: specs, tabs: [['dash', 'Dashboard', dash]].concat(TABS.map(function (t) { return [t[0], t[1], function () { return view(t[0]); }]; })),
      sub: function () { var n = D.task.filter(function (t) { return live(t) && t.due && t.due < todayS(); }).length; return D.task.filter(live).length + ' tugas aktif' + (n ? ' · ' + n + ' terlambat' : ''); },
      cascade: { task: [['sub', 'taskId']] },
      saved: function (e, r, isNew) {
        if (e === 'task') { if (r.status === 'Done' && !r.doneAt) r.doneAt = todayS(); if (r.status !== 'Done') r.doneAt = ''; }
      },
      act: function (a, d, t) {
        var x;
        if (a === 'tgd') { x = by(D.task, d.id); x.status = t.checked ? 'Done' : 'To Do'; x.doneAt = t.checked ? todayS() : ''; }
        if (a === 'tgs') by(D.sub, d.id).done = t.checked;
        if (a === 'arch') { x = by(D.task, d.id); x.status = x.status === 'Archived' ? 'To Do' : 'Archived'; }
        if (a === 'mvp') { if (d.v) by(D.task, d.id).projId = d.v === '__none' ? '' : d.v; }
        if (a === 'mvs') { x = by(D.task, d.id); var i = Math.max(0, Math.min(4, ST.indexOf(x.status) + +d.d)); x.status = ST[i]; x.doneAt = ST[i] === 'Done' ? todayS() : ''; }
        if (a === 'tnav') { var k = (st.tm || todayS().slice(0, 7)).split('-'), dt = new Date(+k[0], +k[1] - 1 + +d.d, 1); st.tm = dt.getFullYear() + '-' + pad(dt.getMonth() + 1); }
        if (a === 'rencat') { var nn = (prompt('Ubah nama kategori:', d.n) || '').trim(); if (nn && nn !== d.n && D.cats.indexOf(nn) < 0) { D.cats = D.cats.map(function (c) { return c === d.n ? nn : c; }); D.task.forEach(function (t) { if (t.category === d.n) t.category = nn; }); } }
        if (a === 'addcat') { var n = (prompt('Nama kategori baru:') || '').trim(); if (n && D.cats.indexOf(n) < 0) D.cats.push(n); }
      }
    };
  });
  function has(v) { return v !== '' && v != null && !isNaN(+v); }
  MO.routes['#task'] = tasks.open;
})();
;
/* MyOffice — Kalender (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, chips = K.chips, opt = K.opt, badge = K.badge, add = K.add, btns = K.btns, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var MN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], DL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var HM = ['Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban', 'Ramadan', 'Syawal', 'Dzulkaidah', 'Dzulhijjah'];
  var dn = function (s) { var a = s.split('-'); return Math.round(Date.UTC(+a[0], a[1] - 1, +a[2]) / 864e5); };
  var addD = function (s, n) { return new Date((dn(s) + n) * 864e5).toISOString().slice(0, 10); };
  var dow = function (s) { return new Date(dn(s) * 864e5).getUTCDay(); };
  var tmin = function (t) { var a = (t || '0:0').split(':'); return +a[0] * 60 + +a[1]; };
  var hhmm = function (m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); };
  var CF = { wk: 1, tz: 'auto', mode: 'both', hij: 0 };
  var PAL = [['', 'Ikuti jenis & kategori'], ['#4f7cff', 'Biru'], ['#2f9e6b', 'Hijau'], ['#d99a2b', 'Kuning'], ['#d0443e', 'Merah'], ['#8a5fb5', 'Ungu'], ['#d4608f', 'Pink'], ['#5f6b7a', 'Abu-abu']];

  /* ---------- Zona waktu & Hijriah ---------- */
  function nowP() {
    var o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, p = {};
    if (CF.tz && CF.tz !== 'auto') o.timeZone = CF.tz;
    try { new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return { date: p.year + '-' + p.month + '-' + p.day, min: (+p.hour % 24) * 60 + +p.minute }; }
    catch (e) { var d = new Date(); return { date: K.todayS(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function tzOff(ts, tz) {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; });
    return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
  }
  function zUtc(date, time, tz) {
    var a = date.split('-'), t = (time || '00:00').split(':');
    if (!tz || tz === 'auto') return new Date(+a[0], a[1] - 1, +a[2], +t[0], +t[1]).getTime();
    var g = Date.UTC(+a[0], a[1] - 1, +a[2], +t[0], +t[1]); try { return g - tzOff(g, tz); } catch (e) { return g; }
  }
  function hij(s) {
    var d = new Date((dn(s) + (+CF.hij || 0)) * 864e5 + 432e5), p = {};
    try { new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); }
    catch (e) { return null; }
    return { d: +p.day, m: +p.month, y: parseInt(p.relatedYear || p.year, 10) };
  }

  var cal = K.App('Kalender', 'mo-cal-v1', function () {
    return { ev: [], cat: [{ id: 'c1', name: 'Kuliah', color: '#4f7cff' }, { id: 'c2', name: 'Pekerjaan', color: '#d99a2b' }, { id: 'c3', name: 'Organisasi', color: '#8a5fb5' }, { id: 'c4', name: 'Pribadi', color: '#2f9e6b' }, { id: 'c5', name: 'Ibadah', color: '#d4608f' }], set: { wk: 1, tz: 'auto', mode: 'both', hij: 0 } };
  }, function (app) {
    var D = app.D, st = app.st; D.set = Object.assign({ wk: 1, tz: 'auto', mode: 'both', hij: 0 }, D.set); CF = D.set;
    var projects = function () { return ls('mo-proj-v1').proj || []; }, courses = function () { return ls('mo-acad-v1').course || []; }, TK = [];
    /* ---------- Jenis kegiatan, warna blok & api pengingat ---------- */
    var KD = { ujian: { n: 'Ujian', c: '#e5484d', p: 3 }, presentasi: { n: 'Presentasi', c: '#8b5cf6', p: 2 }, penting: { n: 'Kegiatan penting', c: '#f59e0b', p: 1 } };
    var RX = {
      ujian: /\b(ujian|uts|uas|ujikom|kuis|quiz|ulangan|exam|midterm|sidang)\b/i,
      presentasi: /\b(presentasi|presentation|pitch|seminar|paparan|demo day|sempro|semhas|defense)\b/i,
      penting: /\b(penting|urgent|deadline|wajib|interview|wawancara|krusial)\b/i
    };
    var kindOf = function (e) {
      if (e.kind === 'biasa') return '';
      if (KD[e.kind]) return e.kind;
      var s = (e.title || '') + ' ' + ((by(D.cat, e.catId) || {}).name || '');
      return ['ujian', 'presentasi', 'penting'].filter(function (k) { return RX[k].test(s); })[0] || '';
    };
    var color = function (e) { var k = kindOf(e); return e.color || (k && KD[k].c) || (by(D.cat, e.catId) || {}).color || '#4f7cff'; };
    var lo = function (e) {                       /* sisa hari sampai mulai (0 = hari ini / sedang berlangsung), -1 = sudah lewat */
      var t0 = dn(today()), left = dn(e.start) - t0;
      return left >= 0 ? left : (dn(e.end || e.start) >= t0 ? 0 : -1);
    };
    var fl = function (e) { var n = kindOf(e) ? lo(e) : -1; return n >= 0 && n <= 3 ? n : -1; };   /* api hanya H-3 .. hari-H */
    var hLbl = function (n) { return n === 0 ? 'Hari ini' : 'H-' + n; };
    var FIRE = '<svg viewBox="0 0 24 30" aria-hidden="true"><path class="fo" d="M12 0C12 6 20 10 20 20a8 8 0 0 1-16 0C4 15 7 12 8 8c1 2 2 3 2.5 4C11.5 9 11 4 12 0z"/><path class="fm" d="M12 11c0 4 5 6 5 10.500a5 5 0 0 1-10 0C7 19 8.500 17.500 9.500 16c1 1 1.500 1.500 1.800 2 .5-2.500.5-5 .7-7z"/><path class="fi" d="M12 19c0 2 2.500 3 2.500 5a2.500 2.500 0 0 1-5 0c0-1.200 1-2 1.500-3 .5.500.7.800.8 1 .2-1 .2-2 .2-3z"/></svg>';
    var fireEl = function (n) { return '<em class="fire l' + n + '" role="img" aria-label="Api pengingat ' + hLbl(n) + '" title="' + hLbl(n) + '">' + FIRE + '</em>'; };
    var tag = function (e) { var n = fl(e); return n < 0 ? '' : fireEl(n); };
    var kindLbl = function (e) {
      var k = kindOf(e); if (!k) return ''; var n = lo(e);
      return '<span class="kc-tag" style="--b:' + KD[k].c + '">' + KD[k].n + (n >= 0 ? ' · ' + hLbl(n) : '') + '</span>';
    };
    var legend = function () {
      return '<div class="kc-leg"><span>' + fireEl(2).replace('class="fire l2"', 'class="fire l2" style="--fd:1.2s"') + 'Api = H-3 s/d hari-H</span>' +
        Object.keys(KD).map(function (k) { return '<span><s style="--b:' + KD[k].c + '"></s>' + KD[k].n + '</span>'; }).join('') + '<span><s style="--b:#4f7cff"></s>Lainnya (warna kategori)</span></div>';
    };
    function fireBar() {
      var list = D.ev.filter(function (e) { return fl(e) >= 0; }).sort(function (x, y) { return fl(x) - fl(y) || rng(x)[0] - rng(y)[0]; });
      if (!list.length) return '';
      var now = today();
      return '<div class="fire-bar" role="status">' + fireEl(fl(list[0])) + '<div><b>' + list.length + ' kegiatan menyala dalam 3 hari ke depan</b><div class="fb-c">' +
        list.slice(0, 6).map(function (e) { return '<button class="fb-chip" style="--b:' + color(e) + '" data-act="firego" data-d="' + (e.start > now ? e.start : now) + '">' + esc(KD[kindOf(e)].n + ': ' + e.title) + ' · ' + hLbl(fl(e)) + '</button>'; }).join('') + '</div></div></div>';
    }
    var rng = function (e) {
      var s = dn(e.start) * 1440 + (e.allDay ? 0 : tmin(e.startTime)), en = e.allDay ? (dn(e.end || e.start) + 1) * 1440 : (e.endTime ? dn(e.end || e.start) * 1440 + tmin(e.endTime) : s);
      return [s, en];
    };
    var onDay = function (day) { var a = dn(day) * 1440, b = a + 1440; return D.ev.filter(function (e) { var r = rng(e); return r[0] < b && (r[1] > a || (r[1] === r[0] && r[0] >= a)); }); };
    var tasksOn = function (day) { return TK.filter(function (t) { return t.due === day; }); };
    var today = function () { return nowP().date; };
    var tl = function (e) { if (e.allDay) return 'Seharian'; return e.startTime + (e.endTime ? '–' + e.endTime : '') + (e.end && e.end !== e.start ? ' (s/d ' + fd(e.end) + ')' : ''); };
    var small = function (day) { var h = hij(day); return h ? h.d : ''; };
    var dayNum = function (day) {
      var m = +day.slice(8), h = hij(day);
      if (CF.mode === 'hijri' && h) return '<b>' + h.d + '<small>' + m + '</small></b>';
      return '<b>' + m + (CF.mode === 'both' && h ? '<small>' + h.d + '</small>' : '') + '</b>';
    };
    var hijStr = function (a, b) { var x = hij(a), y = hij(b); if (!x || !y) return ''; return (x.m === y.m ? HM[x.m - 1] : HM[x.m - 1] + '–' + HM[y.m - 1]) + ' ' + y.y + ' H'; };
    var mStr = function (a, b) { var x = new Date(dn(a) * 864e5), y = new Date(dn(b) * 864e5); return x.getUTCMonth() === y.getUTCMonth() ? MN[y.getUTCMonth()] + ' ' + y.getUTCFullYear() : MN[x.getUTCMonth()].slice(0, 3) + '–' + MN[y.getUTCMonth()].slice(0, 3) + ' ' + y.getUTCFullYear(); };
    function monthInfo(a) {
      if (CF.mode === 'hijri') {
        var x = hij(a); if (x) { var first = addD(a, -(x.d - 1)), len = 1; while (len < 31) { var y = hij(addD(first, len)); if (!y || y.m !== x.m) break; len++; } return { first: first, len: len }; }
      }
      var yy = +a.slice(0, 4), mm = +a.slice(5, 7); return { first: yy + '-' + pad(mm) + '-01', len: new Date(Date.UTC(yy, mm, 0)).getUTCDate() };
    }
    var specs = {
      ev: { title: 'Acara', def: { allDay: false, catId: 'c4', remind: '15' }, fields: [
        { k: 'title', l: 'Judul acara', t: 'text', req: 1, full: 1 },
        { k: 'catId', l: 'Kategori', t: 'select', o: function () { return [['', '—']].concat(D.cat.map(function (c) { return [c.id, c.name]; })); } },
        { k: 'color', l: 'Warna', t: 'select', o: PAL },
        { k: 'kind', l: 'Jenis kegiatan (api H-3 & warna blok)', t: 'select', o: [['', 'Otomatis (dari judul / kategori)'], ['ujian', 'Ujian'], ['presentasi', 'Presentasi'], ['penting', 'Kegiatan penting'], ['biasa', 'Biasa (tanpa api)']] },
        { k: 'allDay', l: 'Seharian?', t: 'select', bool: 1, o: [['false', 'Tidak (ada jam)'], ['true', 'Ya, seharian']] },
        { k: 'remind', l: 'Pengingat', t: 'select', o: [['', 'Tanpa pengingat'], ['0', 'Tepat waktu'], ['5', '5 menit sebelum'], ['15', '15 menit sebelum'], ['30', '30 menit sebelum'], ['60', '1 jam sebelum'], ['1440', '1 hari sebelum']] },
        { k: 'start', l: 'Tanggal mulai', t: 'date', req: 1 }, { k: 'startTime', l: 'Jam mulai', t: 'time' },
        { k: 'end', l: 'Tanggal selesai', t: 'date' }, { k: 'endTime', l: 'Jam selesai', t: 'time' },
        { k: 'location', l: 'Lokasi', t: 'text', full: 1 },
        { k: 'projId', l: 'Terkait proyek', t: 'select', o: function () { return [['', '—']].concat(projects().map(function (p) { return [p.id, p.name]; })); } },
        { k: 'courseId', l: 'Terkait mata kuliah / jadwal kuliah', t: 'select', o: function () { return [['', '—']].concat(courses().map(function (c) { return [c.id, c.name + (c.schedule ? ' — ' + c.schedule : '')]; })); } },
        { k: 'goalRef', l: 'Terkait goal / milestone (jadwal belajar)', t: 'select', full: 1, o: function () { return MO.goalOpts ? MO.goalOpts() : [['', '—']]; } },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      cat: { title: 'Kategori Acara', def: { color: '#4f7cff' }, fields: [{ k: 'name', l: 'Nama kategori', t: 'text', req: 1, full: 1 }, { k: 'color', l: 'Warna', t: 'select', o: PAL.slice(1) }] }
    };
    function item(e, cls) {
      var rel = [(by(projects(), e.projId) || {}).name, (by(courses(), e.courseId) || {}).name].filter(Boolean).join(' · ');
      return '<button class="ev" style="--c:' + color(e) + '" data-act="edit" data-e="ev" data-id="' + e.id + '" title="' + esc(e.title + ' · ' + tl(e) + (e.location ? ' · ' + e.location : '') + (rel ? ' · ' + rel : '')) + '">' + tag(e) + (e.allDay ? '' : esc(e.startTime) + ' ') + esc(e.title) + '</button>';
    }
    var taskBtn = function (t) { return '<button class="ev tk' + (t.status === 'Done' ? ' dn' : '') + '" style="--c:#8a94a6" data-act="gotask" title="Tenggat tugas' + (t.dueTime ? ' ' + t.dueTime : '') + '">☑ ' + esc(t.title) + '</button>'; };

    function month(a, ttl) {
      var mi = monthInfo(a), first = mi.first, lead = (dow(first) - (+CF.wk) + 7) % 7, now = today(), sel = st.sel || now, i;
      var h = '<div class="kc-wrap"><div class="kc-cal"><div class="kc-nav"><button class="kc-nb" data-act="cnav" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>' + ttl + '</b><button class="kc-nb" data-act="cnav" data-d="1" aria-label="Bulan berikutnya">›</button></div><div class="kc-wk">';
      for (i = 0; i < 7; i++) h += '<span>' + DS[(+CF.wk + i) % 7] + '</span>';
      h += '</div><div class="kc-days">';
      for (i = 0; i < lead; i++) h += '<span class="kc-d out"></span>';
      for (i = 0; i < mi.len; i++) {
        var d = addD(first, i), evs = onDay(d), tks = tasksOn(d), busy = evs.length + tks.length > 0, fn = -1, tint = null, bars = [];
        evs.forEach(function (e) {
          var c = color(e), k = kindOf(e), n = fl(e);
          if (bars.indexOf(c) < 0) bars.push(c);
          if (k && (!tint || KD[k].p > tint.p)) tint = { c: c, p: KD[k].p };
          if (n >= 0 && d === (e.start > now ? e.start : now) && (fn < 0 || n < fn)) fn = n;   /* api di tanggal mulai (atau hari ini jika sedang berlangsung) */
        });
        if (!tint && evs.length) tint = { c: color(evs[0]), p: 0 };
        h += '<button class="kc-d' + (d === now ? ' td' : '') + (d === sel ? ' sel' : '') + (d < now ? ' pst' : '') + '" data-act="selday" data-d="' + d + '" aria-label="' + fd(d) + (busy ? ', ada kegiatan' : '') + (fn >= 0 ? ', api pengingat ' + hLbl(fn) : '') + '"' + (d === sel ? ' aria-pressed="true"' : '') + '>' +
          (fn >= 0 ? '<s class="kc-glow l' + fn + '"></s>' : tint ? '<s class="kc-blk" style="--b:' + tint.c + '"></s>' : '') +
          dayNum(d) + (fn >= 0 ? fireEl(fn) : '') +
          (bars.length ? '<span class="kc-bars">' + bars.slice(0, 4).map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' : (tks.length ? '<u class="kc-dot"></u>' : '')) + '</button>';
      }
      h += '</div><div class="kc-foot">' + legend() + '<button class="kc-today" data-act="cnav" data-d="0">Kembali ke hari ini</button></div></div>';
      var ev = onDay(sel).sort(function (x, y) { return rng(x)[0] - rng(y)[0]; }), tk = tasksOn(sel);
      h += '<aside class="kc-side" aria-live="polite"><small>' + DL[dow(sel)] + ', ' + (+sel.slice(8)) + ' ' + MN[+sel.slice(5, 7) - 1] + ' ' + sel.slice(0, 4) + '</small>';
      if (!ev.length && !tk.length) h += '<p>Belum ada kegiatan pada tanggal ini.</p>';
      ev.forEach(function (e) { h += '<button class="kc-ev" style="--c:' + color(e) + '" data-act="edit" data-e="ev" data-id="' + e.id + '"><i></i><div><b>' + tag(e) + esc(e.title) + '</b><small>' + kindLbl(e) + esc(tl(e)) + (e.location ? ' · ' + esc(e.location) : '') + '</small></div></button>'; });
      tk.forEach(function (t) { h += '<button class="kc-ev" style="--c:#8a94a6" data-act="gotask"><i></i><div><b>' + esc(t.title) + '</b><small>Tenggat tugas · ' + esc(t.status) + (t.dueTime ? ' · ' + t.dueTime : '') + '</small></div></button>'; });
      return h + '<button class="kc-add" data-act="newday" data-d="' + sel + '">+ Tambah kegiatan</button></aside></div>';
    }
    function lanes(S) {
      S.sort(function (x, y) { return x.s - y.s || y.en - x.en; });
      var cl = [], cur = null;
      S.forEach(function (x) {
        if (!cur || x.s >= cur.end) { cur = { end: 0, items: [], ln: [] }; cl.push(cur); }
        var li = -1; cur.ln.forEach(function (e, j) { if (li < 0 && e <= x.s) li = j; });
        if (li < 0) { li = cur.ln.length; cur.ln.push(0); }
        cur.ln[li] = x.en; x.l = li; cur.items.push(x); cur.end = Math.max(cur.end, x.en);
      });
      cl.forEach(function (c) { c.items.forEach(function (x) { x.n = c.ln.length; }); });
    }
    function grid(days) {
      var np = nowP(), h = '<div class="tgw"><div class="tg" style="--n:' + days.length + ';--mw:' + (days.length > 1 ? 640 : 0) + 'px"><div class="lb"></div>';
      days.forEach(function (d) { h += '<div class="hh" data-act="goday" data-d="' + d + '"' + (d === np.date ? ' style="font-weight:600"' : '') + '>' + DS[dow(d)] + '<small>' + +d.slice(8) + (CF.mode !== 'masehi' && hij(d) ? ' · ' + small(d) : '') + '</small></div>'; });
      h += '<div class="lb">Seharian</div>';
      days.forEach(function (d) { h += '<div class="ad">' + onDay(d).filter(function (e) { return e.allDay; }).map(function (e) { return item(e); }).join('') + tasksOn(d).map(taskBtn).join('') + '</div>'; });
      h += '<div class="hours">'; for (var i = 0; i < 24; i++) h += '<div>' + pad(i) + ':00</div>'; h += '</div>';
      days.forEach(function (d) {
        var a = dn(d) * 1440, S = onDay(d).filter(function (e) { return !e.allDay; }).map(function (e) {
          var r = rng(e), s = Math.max(r[0], a) - a, en = r[1] === r[0] ? s + 25 : Math.min(r[1], a + 1440) - a; return { e: e, s: s, en: en };
        });
        lanes(S);
        h += '<div class="col" data-act="slot" data-d="' + d + '">' + S.map(function (x) {
          var hgt = Math.max(20, (x.en - x.s) * 0.8);
          return '<button class="ev" style="--c:' + color(x.e) + ';top:' + (x.s * 0.8) + 'px;height:' + hgt + 'px;left:' + (x.l * 100 / x.n) + '%;width:calc(' + (100 / x.n) + '% - 3px)" data-act="edit" data-e="ev" data-id="' + x.e.id + '"><b>' + tag(x.e) + esc(x.e.title) + '</b>' + (hgt > 34 ? '<br>' + tl(x.e) + (x.e.location ? ' · ' + esc(x.e.location) : '') : '') + '</button>';
        }).join('') + (d === np.date ? '<div class="now" style="top:' + (np.min * 0.8) + 'px"></div>' : '') + '</div>';
      });
      return h + '</div></div><p class="ac-hint" style="margin-top:8px">Acara tanpa jam selesai ditampilkan sebagai penanda singkat. Tugas yang hanya punya tenggat muncul di baris "Seharian", bukan sebagai blok jam.</p>';
    }
    function agenda(a) {
      var h = '', any = false;
      for (var i = 0; i < 30; i++) {
        var d = addD(a, i), ev = onDay(d).sort(function (x, y) { return rng(x)[0] - rng(y)[0]; }), tk = tasksOn(d);
        if (!ev.length && !tk.length) continue; any = true;
        var hh = hij(d);
        h += '<div class="dayh">' + DL[dow(d)] + ', ' + fd(d) + (CF.mode !== 'masehi' && hh ? '<small>' + hh.d + ' ' + HM[hh.m - 1] + ' ' + hh.y + ' H</small>' : '') + '</div>';
        ev.forEach(function (e) {
          var c = by(D.cat, e.catId), rel = [(by(projects(), e.projId) || {}).name, (by(courses(), e.courseId) || {}).name].filter(Boolean).join(' · ');
          h += '<div class="aitem" style="--c:' + color(e) + ';cursor:pointer" data-act="edit" data-e="ev" data-id="' + e.id + '"><span class="tm">' + tl(e) + '</span><div><b>' + tag(e) + esc(e.title) + '</b><small>' + kindLbl(e) + [c && c.name, e.location, rel, e.remind !== '' && e.remind != null ? '🔔 ' + (+e.remind ? e.remind + ' mnt sebelum' : 'tepat waktu') : ''].filter(Boolean).map(esc).join(' · ') + '</small></div></div>';
        });
        tk.forEach(function (t) { h += '<div class="aitem" style="--c:#8a94a6;cursor:pointer" data-act="gotask"><span class="tm">Tenggat</span><div>☑ ' + esc(t.title) + '<small>' + esc(t.status) + (t.dueTime ? ' · ' + t.dueTime : '') + '</small></div></div>'; });
      }
      return any ? h : empty('Tidak ada agenda dalam 30 hari ke depan.');
    }
    function vCal() {
      TK = (ls('mo-task-v1').task || []).filter(function (t) { return t.due && t.status !== 'Archived'; });
      var a = st.d || today(), v = st.v || 'Monthly', ttl = '', body;
      if (v === 'Monthly') {
        var mi = monthInfo(a), last = addD(mi.first, mi.len - 1);
        ttl = CF.mode === 'hijri' ? hijStr(mi.first, last) + ' <small style="opacity:.6">' + mStr(mi.first, last) + '</small>' : mStr(mi.first, last) + (CF.mode === 'both' ? ' <small style="opacity:.6">' + hijStr(mi.first, last) + '</small>' : '');
        body = month(a, ttl);
      } else if (v === 'Weekly') {
        var s = addD(a, -((dow(a) - +CF.wk + 7) % 7)), days = []; for (var i = 0; i < 7; i++) days.push(addD(s, i));
        ttl = fd(days[0]) + ' – ' + fd(days[6]); body = grid(days);
      } else if (v === 'Daily') {
        var hh = hij(a); ttl = DL[dow(a)] + ', ' + fd(a) + (CF.mode !== 'masehi' && hh ? ' <small style="opacity:.6">' + hh.d + ' ' + HM[hh.m - 1] + ' ' + hh.y + ' H</small>' : ''); body = grid([a]);
      } else { ttl = 'Agenda 30 hari dari ' + fd(a); body = agenda(a); }
      body = fireBar() + body;
      if (v === 'Monthly') return '<div class="kc-top"><h3>Kalender kegiatan</h3><p>Pilih tanggal untuk melihat detail kegiatan. Blok warna menandai jenis kegiatan; api menyala 3 hari sebelum ujian, presentasi, atau kegiatan penting.</p></div><div class="kc-tools">' +
        chips(['Daily', 'Weekly', 'Monthly', 'Agenda List'].map(function (x) { return x === 'Agenda List' ? 'Agenda' : x; }), 'Monthly', 'v') + add('ev', 'Acara') + '</div>' + body;
      return '<div class="ac-bar"><div class="ac-acts"><button class="ac-btn sm" data-act="cnav" data-d="-1" aria-label="Sebelumnya">←</button><button class="ac-btn sm" data-act="cnav" data-d="0">Hari ini</button><button class="ac-btn sm" data-act="cnav" data-d="1" aria-label="Berikutnya">→</button></div><b style="font-size:15px">' + ttl + '</b>' + add('ev', 'Acara') + '</div>' +
        chips(['Daily', 'Weekly', 'Monthly', 'Agenda List'].map(function (x) { return x === 'Agenda List' ? 'Agenda' : x; }), v === 'Agenda List' ? 'Agenda' : v, 'v') + body;
    }
    var row = function (l, h) { return '<div class="cfgrow"><label>' + l + '</label>' + h + '</div>'; };
    var sel = function (k, list, cur) { return '<select data-chg="set" data-k="' + k + '" style="max-width:320px">' + list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>'; };
    function vSet() {
      var np = nowP(), tzs = [['auto', 'Otomatis (zona waktu perangkat)'], ['Asia/Jakarta', 'WIB — Jakarta'], ['Asia/Makassar', 'WITA — Makassar'], ['Asia/Jayapura', 'WIT — Jayapura'], ['Asia/Singapore', 'Singapura'], ['Asia/Kuala_Lumpur', 'Kuala Lumpur'], ['Asia/Riyadh', 'Riyadh'], ['Asia/Tokyo', 'Tokyo'], ['Europe/London', 'London'], ['America/New_York', 'New York'], ['UTC', 'UTC']];
      return '<div class="ac-card">' + row('Zona waktu kalender', sel('tz', tzs, CF.tz)) + '<p class="ac-hint" style="margin:-4px 0 12px">Sekarang di zona ini: <b>' + fd(np.date) + ' ' + hhmm(np.min) + '</b>. Jam acara dibaca sebagai waktu di zona ini.</p>' +
        row('Hari pertama dalam seminggu', sel('wk', [[1, 'Senin'], [0, 'Minggu'], [6, 'Sabtu']], CF.wk)) +
        row('Sistem kalender', sel('mode', [['both', 'Masehi + Hijriah'], ['masehi', 'Masehi saja'], ['hijri', 'Hijriah (grid mengikuti bulan Hijriah)']], CF.mode)) +
        row('Koreksi tanggal Hijriah', sel('hij', [[-2, '−2 hari'], [-1, '−1 hari'], [0, 'Tanpa koreksi'], [1, '+1 hari'], [2, '+2 hari']], CF.hij)) +
        '<p class="ac-hint" style="margin:-4px 0 12px">Hijriah dihitung dengan kalender Umm al-Qura. Penetapan awal bulan di Indonesia bisa berbeda satu hari; gunakan koreksi untuk menyesuaikan.</p>' +
        row('Pengingat di browser', '<div><button class="ac-btn sm" data-act="notif">Aktifkan notifikasi browser</button> <small style="opacity:.7">Pengingat hanya berbunyi saat MyOffice terbuka di browser.</small></div>') + '</div>' +
        '<div class="ac-bar"><div class="ac-h" style="margin:0">Kategori acara</div>' + add('cat', 'Kategori') + '</div>' +
        D.cat.map(function (c) { return '<div class="ac-item"><span style="width:14px;height:14px;border-radius:50%;background:' + c.color + ';margin-top:3px;flex:none"></span><div><b>' + esc(c.name) + '</b></div>' + btns('cat', c.id) + '</div>'; }).join('');
    }
    return {
      specs: specs, tabs: [['cal', 'Kalender', vCal], ['set', 'Pengaturan', vSet]],
      sub: function () { var h = hij(today()); return fd(today()) + (CF.mode !== 'masehi' && h ? ' · ' + h.d + ' ' + HM[h.m - 1] + ' ' + h.y + ' H' : '') + ' · ' + (CF.tz === 'auto' ? 'zona perangkat' : CF.tz); },
      validate: function (ent, r) {
        if (ent !== 'ev') return;
        r.end = r.end || r.start;
        if (r.allDay) { r.startTime = r.endTime = ''; if (r.end < r.start) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'; }
        else {
          if (!r.startTime) return 'Isi jam mulai, atau ubah menjadi acara seharian.';
          if (r.endTime) { var x = rng(r); if (x[1] <= x[0]) return 'Waktu selesai harus setelah waktu mulai.'; }
          else if (r.end !== r.start) return 'Acara lintas hari perlu jam selesai.';
        }
      },
      act: function (a, d, t, ev) {
        if (a === 'set') CF[d.k] = (d.k === 'wk' || d.k === 'hij') ? +d.v : d.v;
        if (a === 'cnav') {
          var cur = st.d || today(), v = st.v || 'Monthly', n = +d.d;
          if (!n) { st.d = today(); st.sel = today(); return; }
          if (v === 'Monthly') { var mi = monthInfo(cur); st.d = CF.mode === 'hijri' ? (n > 0 ? addD(mi.first, mi.len) : addD(mi.first, -1)) : new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 10); }
          else st.d = addD(cur, n * (v === 'Weekly' ? 7 : v === 'Daily' ? 1 : 30));
        }
        if (a === 'filt' && d.f === 'v') st.v = d.v === 'Agenda' ? 'Agenda List' : d.v;
        if (a === 'selday') st.sel = d.d;
        if (a === 'firego') { st.d = d.d; st.sel = d.d; }
        if (a === 'goday') { st.d = d.d; st.v = 'Daily'; }
        if (a === 'newday') app.form('ev', null, { start: d.d, end: d.d, allDay: true });
        if (a === 'slot') {
          var col = t.closest('.col'), y = ev.clientY - col.getBoundingClientRect().top, m = Math.max(0, Math.min(1380, Math.floor(y / 0.8 / 30) * 30));
          app.form('ev', null, { start: d.d, end: d.d, startTime: hhmm(m), endTime: hhmm(m + 60), allDay: false });
        }
        if (a === 'gotask' && MO.routes['#task']) MO.routes['#task']();
        if (a === 'notif' && window.Notification) Notification.requestPermission().then(function (p) { MO.msg('Notifikasi', p === 'granted' ? 'Aktif' : 'Tidak diizinkan'); });
      }
    };
  });
  /* ---------- Mesin pengingat (hanya saat halaman terbuka) ---------- */
  function notify(title, text) { MO.msg(title, text); try { if (window.Notification && Notification.permission === 'granted') new Notification(title, { body: text }); } catch (e) { } }
  function check() {
    var now = Date.now(), fired = ls('mo-fired'), ch = false, c = ls('mo-cal-v1'), tz = (c.set || {}).tz;
    (c.ev || []).forEach(function (e) {
      if (e.remind === '' || e.remind == null || !e.start) return;
      var at = zUtc(e.start, e.allDay ? '00:00' : e.startTime, tz) - (+e.remind) * 6e4, k = 'e' + e.id + '@' + at;
      if (at <= now && now - at < 864e5 && !fired[k]) { fired[k] = 1; ch = true; notify('Pengingat acara', e.title + (e.startTime ? ' · ' + e.startTime : '')); }
    });
    (ls('mo-task-v1').task || []).forEach(function (t) {
      if (!t.remindAt || t.status === 'Done' || t.status === 'Archived') return;
      var at = new Date(t.remindAt).getTime(), k = 't' + t.id + '@' + at;
      if (at <= now && now - at < 864e5 && !fired[k]) { fired[k] = 1; ch = true; notify('Pengingat tugas', t.title); }
    });
    if (ch) try { localStorage.setItem('mo-fired', JSON.stringify(fired)); } catch (e) { }
  }
  setTimeout(check, 3000); setInterval(check, 30000);

  MO.routes['#calendar'] = cal.open;
})();
;
/* MyOffice — Finance (tema krem · merah · biru). Data tetap di localStorage 'mo-fin-v1' (kompatibel dengan data lama & Analytics). */
(function () {
  'use strict';
  const MO = window.MyOffice, K = MO.kit, esc = K.esc, rp = K.rp, uid = K.uid, by = K.by, fd = K.fd, today = K.todayS;
  const KEY = 'mo-fin-v1', pad = n => ('0' + n).slice(-2);
  let D; try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  D = D || {}; ['acc', 'tx', 'bud', 'goal', 'con', 'cat', 'item', 'rcp', 'cart'].forEach(k => D[k] = D[k] || []);
  const mkc = (k, a) => a.forEach(n => D.cat.push({ id: uid(), name: n, kind: k, archived: false }));
  if (!D.cat.length) { mkc('Pemasukan', ['Uang saku', 'Gaji', 'Freelance', 'Beasiswa', 'Bisnis', 'Lainnya']); mkc('Pengeluaran', ['Makanan', 'Transportasi', 'Pendidikan', 'Kebutuhan pribadi', 'Hiburan', 'Langganan', 'Kesehatan', 'Organisasi', 'Tabungan', 'Lainnya']); }
  const ICO = { Makanan: '🍜', Transportasi: '🛵', Pendidikan: '📚', 'Kebutuhan pribadi': '🧴', Hiburan: '🎬', Langganan: '📱', Kesehatan: '💊', Organisasi: '🤝', Tabungan: '🐷', Lainnya: '🧾', 'Uang saku': '👛', Gaji: '💼', Freelance: '💻', Beasiswa: '🎓', Bisnis: '🏪' };
  const ic = c => (c && (c.icon || ICO[c.name])) || '🧾';
  if (!D.seeded) {
    const cid = n => (D.cat.find(x => x.name === n) || {}).id;
    [['Nasi + lauk', 'Makanan', 15000], ['Kopi susu', 'Makanan', 18000], ['Makan siang', 'Makanan', 25000], ['Ojek online', 'Transportasi', 20000], ['Bensin', 'Transportasi', 30000], ['Fotokopi', 'Pendidikan', 5000], ['Buku catatan', 'Pendidikan', 25000], ['Kuota internet', 'Langganan', 50000], ['Tiket bioskop', 'Hiburan', 50000], ['Obat warung', 'Kesehatan', 15000], ['Iuran organisasi', 'Organisasi', 10000], ['Sabun & sampo', 'Kebutuhan pribadi', 30000]]
      .forEach(([n, c, p]) => cid(c) && D.item.push({ id: uid(), name: n, catId: cid(c), price: p, uses: 0 })); D.seeded = 1;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { MO.msg('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } };
  const st = { tab: 'home', sub: { riw: 'tx', dom: 'acc' }, m: today().slice(0, 7), cat: '', q: '', tt: '', rng: 6 };
  const mlab = ym => new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const addM = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const pc = (a, b) => b > 0 ? a / b * 100 : 0;
  const cn = id => (by(D.cat, id) || {}).name || '—', an = id => (by(D.acc, id) || {}).name || '—';
  const bal = a => { let b = +a.opening || 0; D.tx.forEach(t => { const x = +t.amount || 0; if (t.accId === a.id) b += t.type === 'Income' ? x : -x; if (t.type === 'Transfer' && t.toAccId === a.id) b += x; }); return b; };
  const sum = (type, m, f) => D.tx.filter(t => t.type === type && t.date.slice(0, 7) === m && (!f || f(t))).reduce((a, t) => a + (+t.amount || 0), 0);
  const expBy = m => { const o = {}; D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === m).forEach(t => o[t.catId] = (o[t.catId] || 0) + (+t.amount || 0)); return o; };
  const budFor = (cid, m) => D.bud.find(b => b.catId === cid && b.month === m) || D.bud.find(b => b.catId === cid && !b.month);
  const got = g => D.con.filter(c => c.goalId === g.id).reduce((a, c) => a + (+c.amount || 0), 0);
  const expCats = () => D.cat.filter(c => c.kind === 'Pengeluaran' && !c.archived);
  const cartN = () => D.cart.reduce((a, l) => a + l.qty, 0), cartT = () => D.cart.reduce((a, l) => a + l.qty * l.price, 0);
  const qtyOf = k => (D.cart.find(l => l.k === k) || {}).qty || 0;
  const hue = s => { let h = 0; String(s).split('').forEach(c => h = (h * 31 + c.charCodeAt(0)) % 360); return h; };
  /* gambar/logo kustom: o.img (data URL) menang atas emoji */
  const ci = (o, fb) => (o && o.img) ? '<img class="fn-im" src="' + o.img + '" alt="" draggable="false">' : (o && o.icon ? esc(o.icon) : fb);
  const cic = c => ci(c, c ? (ICO[c.name] || '🧾') : '🧾');
  const bnm = () => (D.brand && D.brand.name) || 'MyOffice Finance';

  /* ---------- ikon ---------- */
  const SV = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const I = {
    ana: '<img class="fn-3d" src="icons/chart.png" alt="">',
    cam: SV('<path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>'),
    home: '<img class="fn-3d" src="icons/work.png" alt="">',
    menu: '<img class="fn-3d" src="icons/book.png" alt="">',
    cart: SV('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6"/>'),
    rcp: '<img class="fn-3d" src="icons/task.png" alt="">',
    wal: '<img class="fn-3d" src="icons/fin.png" alt="">',
    x: SV('<path d="M18 6 6 18M6 6l12 12"/>'), dl: SV('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'), pr: SV('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>')
  };
  const ART = '<svg viewBox="0 0 170 160" aria-hidden="true"><g>' + [128, 108, 88].map(y => `<path d="M26 ${y}v11a54 17 0 0 0 108 0v-11z" fill="#f0c36b"/><ellipse cx="80" cy="${y}" rx="54" ry="17" fill="#ffe3a0"/><ellipse cx="80" cy="${y}" rx="40" ry="11" fill="none" stroke="#e8b655" stroke-width="2"/>`).join('') + '</g><g transform="rotate(-14 112 52)"><circle cx="112" cy="52" r="32" fill="#d92b2b"/><circle cx="112" cy="52" r="25" fill="none" stroke="#ffe3d3" stroke-width="2.5" stroke-dasharray="3 4"/><text x="112" y="60" text-anchor="middle" font-family="Baloo 2,Arial" font-weight="800" font-size="22" fill="#fff3e6">Rp</text></g><circle cx="30" cy="40" r="5" fill="#fff" opacity=".8"/><circle cx="150" cy="118" r="4" fill="#fff" opacity=".7"/><path d="M40 62l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" opacity=".85"/></svg>';

  /* ---------- kerangka ---------- */
  const R = document.createElement('div'); R.className = 'fn-ov'; R.hidden = true;
  R.innerHTML = '<div class="fn-app" role="dialog" aria-modal="true" aria-label="Finance"><header class="fn-hd"><div class="fn-brand"><button class="fn-logo" data-a="brand" aria-label="Ubah logo dan nama" title="Ubah logo & nama">Rp</button><div><b data-bn>MyOffice Finance</b><small data-bt>Catat hemat, hidup tenang</small></div></div><h2 class="fn-ttl"></h2><div class="fn-hb"><button data-a="goriw" aria-label="Resi" title="Resi">' + I.rcp + '</button><button data-a="close" aria-label="Tutup" title="Tutup">' + I.x + '</button></div></header><main class="fn-v" id="fnv"></main><nav class="fn-nav" aria-label="Menu Finance"></nav><div class="fn-sh" hidden></div></div>';
  document.body.appendChild(R);
  const V = R.querySelector('#fnv'), NAV = R.querySelector('.fn-nav'), SH = R.querySelector('.fn-sh');

  /* ---------- tampilan ---------- */
  const mon = () => `<div class="fn-mon"><button data-a="mon" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>${mlab(st.m)}</b><button data-a="mon" data-d="1" aria-label="Bulan berikutnya">›</button></div>`;
  const empty = (t, b) => `<div class="fn-empty"><i>🧾</i><p>${t}</p>${b || ''}</div>`;
  const meter = p => `<div class="fn-meter"><i class="${p >= 100 ? 'bad' : p >= 80 ? 'warn' : ''}" style="width:${Math.min(100, p)}%"></i></div>`;
  const seg = (k, list) => `<div class="fn-seg">${list.map(([v, l]) => `<button aria-pressed="${st.sub[k] === v}" data-a="sub" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const txRow = t => {
    const tr = t.type === 'Transfer', c = by(D.cat, t.catId), nm = t.desc || (tr ? 'Transfer' : c ? c.name : 'Transaksi');
    return `<button class="fn-row" data-a="edit" data-e="tx" data-id="${t.id}"><i class="fn-ico">${tr ? '🔁' : cic(c)}</i><div><b>${esc(nm)}</b><small>${tr ? esc(an(t.accId)) + ' → ' + esc(an(t.toAccId)) : esc(c ? c.name : '') + ' · ' + esc(an(t.accId))} · ${fd(t.date)}${t.rcpId ? ' · resi' : ''}</small></div><strong class="${tr ? '' : t.type === 'Income' ? 'pos' : 'neg'}">${tr ? '' : t.type === 'Income' ? '+' : '−'}${rp(t.amount)}</strong></button>`;
  };
  const itemCard = i => {
    const c = by(D.cat, i.catId), q = qtyOf(i.id);
    return `<article class="fn-it"><button class="fn-ed" data-a="edit" data-e="item" data-id="${i.id}" aria-label="Ubah ${esc(i.name)}">✎</button><div class="fn-art${i.img ? ' has' : ''}" style="--h:${hue(i.name)}">${ci(i, cic(c))}</div><b>${esc(i.name)}</b><small>${esc(c ? c.name : '')}</small><div class="fn-pr"><span>${rp(i.price)}</span>${q ? `<div class="fn-st"><button data-a="dec" data-k="${i.id}" aria-label="Kurangi">−</button><i>${q}</i><button data-a="inc" data-k="${i.id}" aria-label="Tambah">+</button></div>` : `<button class="fn-plus" data-a="inc" data-k="${i.id}" aria-label="Tambah ${esc(i.name)}">+</button>`}</div></article>`;
  };
  function home() {
    const m = st.m, act = D.acc.filter(a => a.active), total = act.reduce((a, x) => a + bal(x), 0), inc = sum('Income', m), exp = sum('Expense', m), eb = expBy(m);
    const pop = D.item.slice().sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 8);
    let bL = 0, bS = 0; expCats().forEach(c => { const b = budFor(c.id, m); if (b) { bL += +b.limit || 0; bS += eb[c.id] || 0; } });
    const gs = D.goal.filter(g => g.status === 'Aktif'), g0 = gs[0];
    const recent = D.tx.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return mon() + `<div class="fn-hm"><div class="fn-hm-a"><section class="fn-ban"><div><h1>Catat.<br>Hemat.<br>Tenang.</h1><p>Saldo <b>${rp(total)}</b><br>Keluar bulan ini ${rp(exp)} · masuk ${rp(inc)}</p><button class="fn-btn w" data-a="tab" data-t="menu">Catat pengeluaran</button></div>${ART}</section>
    <div class="fn-cats" role="list">${expCats().map(c => `<button role="listitem" class="${st.cat === c.id ? 'on' : ''}" data-a="gocat" data-id="${c.id}"><i>${cic(c)}</i><span>${esc(c.name)}</span><small>${eb[c.id] ? rp(eb[c.id]).replace('Rp ', '') : '–'}</small></button>`).join('')}</div>
    <div class="fn-sec"><h3>Pilihan populer</h3><button class="fn-lnk" data-a="tab" data-t="menu">Lihat semua →</button></div>
    ${pop.length ? `<div class="fn-hs">${pop.map(itemCard).join('')}</div>` : empty('Katalog masih kosong. Tambahkan item pengeluaran yang sering kamu beli.', '<button class="fn-btn" data-a="add" data-e="item">Tambah item</button>')}
    </div><aside class="fn-hm-b"><section class="fn-rw"><span class="fn-seal">${bL ? '📊' : g0 ? '🎯' : '⭐'}</span><div><b>${bL ? 'Anggaran ' + mlab(m) : g0 ? esc(g0.name) : 'Belum ada anggaran'}</b><small>${bL ? 'Terpakai ' + rp(bS) + ' dari ' + rp(bL) : g0 ? 'Terkumpul ' + rp(got(g0)) + ' dari ' + rp(g0.target) : 'Pasang batas belanja supaya uang tidak bocor.'}</small>${bL ? meter(pc(bS, bL)) : g0 ? meter(pc(got(g0), +g0.target)) : ''}</div><button class="fn-btn" data-a="godom" data-v="${bL || !g0 ? 'bud' : 'goal'}">${bL || g0 ? 'Lihat' : 'Atur'}</button></section>
    <div class="fn-sec"><h3>Transaksi terbaru</h3><button class="fn-lnk" data-a="tab" data-t="riw">Riwayat →</button></div>
    ${recent.length ? recent.map(txRow).join('') : empty('Belum ada transaksi. Pilih pengeluaran di Katalog lalu catat.')}</aside></div>`;
  }
  function gridHTML() {
    const q = st.q.toLowerCase(), L = D.item.filter(i => (!st.cat || i.catId === st.cat) && (!q || i.name.toLowerCase().includes(q)));
    return L.length ? L.map(itemCard).join('') : '<div class="fn-empty" style="grid-column:1/-1"><i>🔍</i><p>Tidak ada item yang cocok.</p></div>';
  }
  function menu() {
    return `<div class="fn-search"><input data-in="q" type="search" placeholder="Cari item pengeluaran…" value="${esc(st.q)}" aria-label="Cari item"></div>
    <div class="fn-chips"><button aria-pressed="${!st.cat}" data-a="cat" data-id="">Semua</button>${expCats().map(c => `<button aria-pressed="${st.cat === c.id}" data-a="cat" data-id="${c.id}">${cic(c)} ${esc(c.name)}</button>`).join('')}</div>
    <div class="fn-grid" id="fng">${gridHTML()}</div>
    <div class="fn-two"><button class="fn-btn ghost" data-a="custom">+ Pengeluaran lain</button><button class="fn-btn ghost" data-a="add" data-e="item">+ Item katalog</button></div>
    ${cartN() ? `<button class="fn-pill" data-a="cart">${I.cart}<span>${cartN()} item</span><b>${rp(cartT())}</b></button>` : ''}`;
  }
  function riw() {
    let h = seg('riw', [['tx', 'Transaksi'], ['rcp', 'Resi']]);
    if (st.sub.riw === 'rcp') {
      const L = D.rcp.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      return h + (L.length ? '<div class="fn-lst">' + L.map(r => `<article class="fn-rc"><div><b>${esc(r.no)}</b><small>${fd(r.date)} ${esc(r.time)} · ${r.items.length} item · ${esc(an(r.accId))}</small></div><strong>${rp(r.total)}</strong><div class="fn-acts"><button class="fn-btn sm" data-a="rcp" data-id="${r.id}">Lihat</button><button class="fn-btn sm ghost" data-a="png" data-id="${r.id}">Unduh PNG</button></div></article>`).join('') + '</div>' : empty('Belum ada resi. Resi dibuat otomatis setiap kali kamu mencatat keranjang.', '<button class="fn-btn" data-a="tab" data-t="menu">Pilih pengeluaran</button>'));
    }
    const L = D.tx.filter(t => t.date.slice(0, 7) === st.m && (!st.tt || t.type === st.tt)).sort((a, b) => b.date.localeCompare(a.date));
    let i = 0, o = 0; L.forEach(t => { if (t.type === 'Income') i += +t.amount; if (t.type === 'Expense') o += +t.amount; });
    return h + mon() + `<div class="fn-sum"><div><small>Masuk</small><b class="pos">${rp(i)}</b></div><div><small>Keluar</small><b class="neg">${rp(o)}</b></div><div><small>Bersih</small><b>${i - o < 0 ? '−' : ''}${rp(Math.abs(i - o))}</b></div></div>
    <div class="fn-chips">${[['', 'Semua'], ['Income', 'Pemasukan'], ['Expense', 'Pengeluaran'], ['Transfer', 'Transfer']].map(([v, l]) => `<button aria-pressed="${st.tt === v}" data-a="tt" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="fn-two"><button class="fn-btn" data-a="add" data-e="tx">+ Transaksi</button><button class="fn-btn ghost" data-a="csv">Ekspor CSV</button></div>
    ${L.length ? '<div class="fn-lst">' + L.map(txRow).join('') + '</div>' : empty('Tidak ada transaksi di bulan ini.')}`;
  }
  const NETL = { visa: '<i class="atm-visa">VISA</i>', mc: '<i class="atm-mc"><u></u><u></u></i>', gpn: '<i class="atm-gpn">GPN</i>' };
  const NETD = { Bank: 'visa', Tabungan: 'gpn', 'Rekening lain': 'mc' };
  function atm(a, h) {
    const t = a.type === 'E-wallet' ? 'ew' : a.type === 'Cash' ? 'cs' : 'bk', neg = bal(a) < 0, net = NETL[a.net === 'none' ? '' : a.net || NETD[a.type]] || '';
    const dg = String(a.no || '').replace(/\D/g, ''), no = dg ? (dg.length > 4 ? '•••• •••• •••• ' + dg.slice(-4) : dg) : '•••• •••• •••• ••••', plain = a.img && a.ov === 'off';
    return `<button class="atm t-${t} c${h % 6} ${a.img ? 'has-img' : ''} ${plain ? 'plain' : ''} ${a.active ? '' : 'off'}" data-a="edit" data-e="acc" data-id="${a.id}" aria-label="${esc(a.name)}">
      ${a.img ? `<img class="atm-bg" src="${esc(a.img)}" alt="">` : '<span class="atm-pat"></span>'}<span class="atm-sh"></span>
      ${plain ? '' : `<span class="atm-top"><em>${esc(a.name)}${a.active ? '' : ' · nonaktif'}</em><small>${esc(a.type)}</small></span>
      <span class="atm-mid"><i class="atm-chip"></i><svg class="atm-nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 7a7 7 0 0 1 0 10M12 4.5a11 11 0 0 1 0 15M16 2a15 15 0 0 1 0 20"/></svg></span>
      <span class="atm-no">${no}</span>
      <span class="atm-bot"><span><small>PEMEGANG</small><strong>${esc((a.holder || '').toUpperCase() || '—')}</strong></span>${net}</span>`}
      <b class="atm-bal ${neg ? 'neg' : ''}"><small>Saldo</small>${neg ? '−' : ''}${rp(Math.abs(bal(a)))}</b></button>`;
  }
  function dom() {
    let h = seg('dom', [['acc', 'Akun'], ['bud', 'Anggaran'], ['goal', 'Tabungan'], ['cat', 'Kategori']]); const s = st.sub.dom;
    if (s === 'acc') {
      const act = D.acc.filter(a => a.active), total = act.reduce((a, x) => a + bal(x), 0);
      return h + `<div class="fn-sum one"><div><small>Total saldo · ${act.length} akun aktif</small><b>${rp(total)}</b></div></div><div class="fn-two"><button class="fn-btn" data-a="add" data-e="acc">+ Akun</button></div>` +
        (D.acc.length ? '<div class="atm-grid">' + D.acc.map((a, k) => atm(a, k)).join('') + '</div>' : empty('Belum ada akun. Tambahkan Cash, Bank, atau E-wallet dulu.'));
    }
    if (s === 'bud') {
      const eb = expBy(st.m), rows = expCats().map(c => ({ c, b: budFor(c.id, st.m) })).filter(x => x.b);
      return h + mon() + '<div class="fn-two"><button class="fn-btn" data-a="add" data-e="bud">+ Anggaran</button></div>' + (rows.length ? '<div class="fn-lst">' + rows.map(({ c, b }) => { const sp = eb[c.id] || 0, p = pc(sp, +b.limit); return `<button class="fn-bud" data-a="edit" data-e="bud" data-id="${b.id}"><i class="fn-ico">${cic(c)}</i><div><b>${esc(c.name)}</b><small>${rp(sp)} / ${rp(b.limit)}${b.month ? '' : ' · tiap bulan'}</small>${meter(p)}</div><em class="${p >= 100 ? 'neg' : ''}">${Math.round(p)}%</em></button>`; }).join('') + '</div>' : empty('Belum ada anggaran untuk ' + mlab(st.m) + '.'));
    }
    if (s === 'goal') {
      return h + '<div class="fn-two"><button class="fn-btn" data-a="add" data-e="goal">+ Target</button></div>' + (D.goal.length ? '<div class="fn-lst">' + D.goal.map(g => { const c = got(g), p = pc(c, +g.target), left = g.date ? Math.round((new Date(g.date) - new Date(today())) / 864e5) : null; return `<article class="fn-goal"><button data-a="edit" data-e="goal" data-id="${g.id}"><b>${esc(g.name)}</b><span class="fn-tag">${esc(g.status)}</span><small>${rp(c)} dari ${rp(g.target)} · ${Math.round(p)}%${left != null ? ' · ' + (left >= 0 ? left + ' hari lagi' : 'lewat ' + (-left) + ' hari') : ''}</small>${meter(Math.min(p, 99.9))}</button><button class="fn-btn sm" data-a="add" data-e="con" data-pk="goalId" data-pv="${g.id}">+ Setor</button></article>`; }).join('') + '</div>' : empty('Belum ada target tabungan.'));
    }
    return h + '<div class="fn-two"><button class="fn-btn" data-a="add" data-e="cat">+ Kategori</button></div>' + ['Pengeluaran', 'Pemasukan'].map(k => `<div class="fn-sec"><h3>${k}</h3></div>` + '<div class="fn-lst">' + D.cat.filter(c => c.kind === k).map(c => `<button class="fn-row ${c.archived ? 'off' : ''}" data-a="edit" data-e="cat" data-id="${c.id}"><i class="fn-ico">${cic(c)}</i><div><b>${esc(c.name)}</b>${c.archived ? '<small>Diarsipkan</small>' : ''}</div></button>`).join('') + '</div>').join('');
  }
  const VIEWS = { home, menu, riw, dom, ana: () => (X.views.ana ? X.views.ana() : empty('Modul analisis belum termuat.')) };
  const TT = { home: 'Beranda', menu: 'Katalog', ana: 'Analisis Keuangan', riw: 'Riwayat', dom: 'Dompet' };
  function paintBrand() {
    const b = D.brand || {};
    R.querySelectorAll('.fn-logo').forEach(e => { e.innerHTML = b.img ? '<img class="fn-im" src="' + b.img + '" alt="">' : 'Rp'; });
    R.querySelectorAll('[data-bn]').forEach(e => { e.textContent = b.name || 'MyOffice Finance'; });
    R.querySelectorAll('[data-bt]').forEach(e => { e.textContent = b.tag || 'Catat hemat, hidup tenang'; });
  }
  function render() {
    const top = V.scrollTop;
    V.innerHTML = VIEWS[st.tab](); V.scrollTop = top;
    const n = cartN(), tabs = [['home', 'Beranda', I.home], ['menu', 'Katalog', I.menu], ['cart'], ['ana', 'Analisis', I.ana], ['riw', 'Riwayat', I.rcp, 'sb'], ['dom', 'Dompet', I.wal]];
    NAV.innerHTML = '<div class="fn-sbb"><button class="fn-logo" data-a="brand" aria-label="Ubah logo dan nama">Rp</button><div><b data-bn></b><small data-bt></small></div></div>' +
      tabs.map(t => t[0] === 'cart' ? `<button class="fn-fab" data-a="cart" aria-label="Keranjang, ${n} item">${I.cart}<span class="fn-fl">Keranjang</span>${n ? `<i>${n}</i>` : ''}</button>` : `<button class="${t[3] || ''}" data-a="tab" data-t="${t[0]}" aria-current="${st.tab === t[0]}">${t[2]}<span>${t[1]}</span></button>`).join('');
    const tt = R.querySelector('.fn-ttl'); if (tt) tt.textContent = TT[st.tab] || '';
    paintBrand();
  }

  /* ---------- sheet ---------- */
  const sheet = h => { SH.innerHTML = '<div class="fn-card-sh" role="dialog" aria-modal="true">' + h + '</div>'; SH.hidden = false; const f = SH.querySelector('input,select,textarea'); if (f) f.focus(); };
  const closeSh = () => { SH.hidden = true; SH.innerHTML = ''; };
  const shHead = t => `<header><h2>${t}</h2><button type="button" data-a="xsh" aria-label="Tutup">${I.x}</button></header>`;
  const ask = (t, msg, ok, fn) => { ask.fn = fn; sheet(shHead(t) + `<p class="fn-p">${msg}</p><footer><button type="button" class="fn-btn ghost" data-a="xsh">Batal</button><button type="button" class="fn-btn" data-a="yes">${ok}</button></footer>`); };

  /* ---------- form entitas ---------- */
  const O = a => a.map(x => [x, x]), AT = ['Cash', 'Bank', 'E-wallet', 'Tabungan', 'Rekening lain'], PM = ['Tunai', 'Transfer bank', 'QRIS', 'Kartu debit', 'Kartu kredit', 'E-wallet', 'Lainnya'];
  const accO = v => [['', '— Pilih akun —']].concat(D.acc.filter(a => a.active || a.id === v).map(a => [a.id, a.name + ' (' + a.type + ')']));
  const catO = (kind, v) => [['', '— Pilih kategori —']].concat(D.cat.filter(c => (!kind || c.kind === kind) && (!c.archived || c.id === v)).map(c => [c.id, (kind ? '' : c.kind + ' · ') + c.name]));
  const SP = {
    acc: { t: 'Akun', def: { type: 'Cash', currency: 'IDR', opening: 0, active: true }, f: [['name', 'Nama akun', 'text', 0, 1, 1], ['type', 'Jenis', 'select', O(AT)], ['holder', 'Nama di kartu', 'text', 0, 0, 0], ['no', 'Nomor kartu / rekening (opsional)', 'text'], ['net', 'Logo jaringan', 'select', [['', 'Otomatis'], ['visa', 'Visa'], ['mc', 'Mastercard'], ['gpn', 'GPN'], ['none', 'Tanpa logo']]], ['img', 'Gambar kartu (foto ATM / dompet)', 'cimg'], ['ov', 'Teks & chip di atas gambar', 'select', [['', 'Tampilkan'], ['off', 'Sembunyikan (gambar polos)']]], ['opening', 'Saldo awal (Rp)', 'number'], ['active', 'Status', 'bool', [['true', 'Aktif'], ['false', 'Nonaktif']]]] },
    tx: { t: 'Transaksi', def: { type: 'Expense', date: today(), scope: 'Pribadi' }, f: [['date', 'Tanggal', 'date', 0, 1], ['type', 'Jenis', 'select', O(['Income', 'Expense', 'Transfer']), 1], ['amount', 'Jumlah (Rp)', 'number', 0, 1], ['accId', 'Akun (asal)', 'select', accO, 1], ['toAccId', 'Akun tujuan (Transfer)', 'select', accO], ['catId', 'Kategori', 'select', v => catO('', v)], ['desc', 'Deskripsi', 'text', 0, 0, 1], ['method', 'Metode', 'select', [['', '—']].concat(O(PM))], ['scope', 'Cakupan', 'select', O(['Pribadi', 'Pekerjaan'])], ['notes', 'Catatan', 'textarea', 0, 0, 1]] },
    cat: { t: 'Kategori', def: { kind: 'Pengeluaran', archived: false }, f: [['name', 'Nama kategori', 'text', 0, 1, 1], ['icon', 'Ikon (emoji)', 'text'], ['img', 'Logo / gambar kategori', 'img'], ['kind', 'Jenis', 'select', O(['Pemasukan', 'Pengeluaran'])], ['archived', 'Status', 'bool', [['false', 'Aktif'], ['true', 'Diarsipkan']]]] },
    item: { t: 'Item katalog', def: {}, f: [['name', 'Nama item', 'text', 0, 1, 1], ['catId', 'Kategori', 'select', v => catO('Pengeluaran', v), 1], ['price', 'Harga biasa (Rp)', 'number', 0, 1], ['img', 'Gambar / logo item', 'img'], ['icon', 'Emoji cadangan (opsional)', 'text']] },
    bud: { t: 'Anggaran', def: { month: st.m }, f: [['catId', 'Kategori pengeluaran', 'select', v => catO('Pengeluaran', v), 1, 1], ['limit', 'Batas (Rp)', 'number', 0, 1], ['month', 'Bulan (kosong = tiap bulan)', 'month']] },
    goal: { t: 'Target tabungan', def: { status: 'Aktif' }, f: [['name', 'Nama target', 'text', 0, 1, 1], ['target', 'Jumlah target (Rp)', 'number', 0, 1], ['date', 'Target tanggal', 'date'], ['status', 'Status', 'select', O(['Aktif', 'Tercapai', 'Dibatalkan'])]] },
    con: { t: 'Setoran', def: { date: today() }, f: [['goalId', 'Target', 'select', () => [['', '— Pilih —']].concat(D.goal.map(g => [g.id, g.name])), 1, 1], ['date', 'Tanggal', 'date', 0, 1], ['amount', 'Jumlah (Rp, negatif = tarik)', 'number', 0, 1], ['notes', 'Catatan', 'text', 0, 0, 1]] }
  };
  const fld = ([k, l, t, o, req, full], v) => {
    const at = `name="${k}"${req ? ' required' : ''}`;
    let i; if (t === 'img') return imgFld(k, l, v); if (t === 'cimg') return imgFld(k, l, v, 0, 1); if (t === 'textarea') i = `<textarea ${at} rows="2">${esc(v)}</textarea>`;
    else if (t === 'select' || t === 'bool') { const L = typeof o === 'function' ? o(v) : o; if (t === 'bool') v = String(!!v); i = `<select ${at}>${L.map(p => `<option value="${esc(p[0])}"${String(p[0]) === String(v) ? ' selected' : ''}>${esc(p[1])}</option>`).join('')}</select>`; }
    else i = `<input ${at} type="${t}" value="${esc(v)}"${t === 'number' ? ' step="any"' : ''}>`;
    return `<label class="${full ? 'full' : ''}"><span>${l}${req ? ' *' : ''}</span>${i}</label>`;
  };
  function imgFld(k, l, v, fit, card) {
    return `<div class="full fn-imf" data-img${card ? ' data-card' : ''}><span>${l}</span><div class="fn-imr"><div class="fn-imp">${v ? '<img src="' + esc(v) + '" alt="">' : '<em>Belum ada</em>'}</div><div class="fn-imb"><div class="fn-ibt"><button type="button" class="fn-btn sm" data-a="pickimg">${I.cam} Pilih gambar</button><button type="button" class="fn-btn sm ghost dng" data-a="rmimg">Hapus</button></div>${card ? '<input type="checkbox" data-fit hidden><small>Foto kartu ATM / dompet digital / buku tabungan (rasio kartu 85,6×54 mm). Kosong = desain otomatis.</small>' : `<label class="fn-chk"><input type="checkbox" data-fit${fit ? ' checked' : ''}> Muat utuh tanpa dipotong (cocok untuk logo)</label><small>JPG, PNG, WebP atau SVG. Kosong = pakai emoji.</small>`}</div></div><input type="file" accept="image/*" data-img-in hidden><input type="hidden" name="${k}" value="${esc(v)}"></div>`;
  }
  function toSquare(file, fit, cb) {
    const fr = new FileReader();
    fr.onerror = () => MO.msg('Gagal', 'File gambar tidak bisa dibaca.');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => MO.msg('Gagal', 'Format gambar tidak didukung.');
      im.onload = () => {
        const w = im.naturalWidth || 256, h = im.naturalHeight || 256, S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        if (fit) { const k = Math.min(S / w, S / h); g.drawImage(im, (S - w * k) / 2, (S - h * k) / 2, w * k, h * k); }
        else { const m = Math.min(w, h); g.drawImage(im, (w - m) / 2, (h - m) / 2, m, m, 0, 0, S, S); }
        const keepAlpha = fit || /png|svg|webp|gif/.test(file.type);
        cb(c.toDataURL(keepAlpha ? 'image/webp' : 'image/jpeg', .86));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function toCard(file, cb) {
    const fr = new FileReader();
    fr.onerror = () => MO.msg('Gagal', 'File gambar tidak bisa dibaca.');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => MO.msg('Gagal', 'Format gambar tidak didukung.');
      im.onload = () => {
        const w = im.naturalWidth || 856, h = im.naturalHeight || 540, R = 856 / 540, W = 720, H = Math.round(W / R), c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        let sw = w, sh = w / R; if (sh > h) { sh = h; sw = h * R; }
        g.drawImage(im, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, W, H);
        cb(c.toDataURL('image/jpeg', .86));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function brandSheet() {
    const b = D.brand || {};
    sheet(shHead('Logo & nama aplikasi') + `<form data-f="brand"><div class="fn-flds"><label class="full"><span>Nama</span><input name="name" value="${esc(b.name || '')}" placeholder="MyOffice Finance" maxlength="40"></label><label class="full"><span>Slogan</span><input name="tag" value="${esc(b.tag || '')}" placeholder="Catat hemat, hidup tenang" maxlength="60"></label>${imgFld('img', 'Logo', b.img || '', true)}</div><footer><button type="button" class="fn-btn ghost dng" data-a="rstbrand">Reset</button><button class="fn-btn">Simpan</button></footer></form>`);
  }
  function form(e, id, pre) {
    const sp = SP[e], it = id ? by(D[e], id) : Object.assign({}, sp.def, pre || {});
    sheet(shHead((id ? 'Ubah ' : 'Tambah ') + sp.t) + `<form data-f="ent" data-e="${e}" data-id="${id || ''}"><div class="fn-flds">${sp.f.map(f => fld(f, it[f[0]] == null ? '' : it[f[0]])).join('')}</div><footer>${id ? '<button type="button" class="fn-btn ghost dng" data-a="del" data-e="' + e + '" data-id="' + id + '">Hapus</button>' : ''}<button class="fn-btn">Simpan</button></footer></form>`);
  }
  function canDel(e, id) {
    if (e === 'acc' && D.tx.some(t => t.accId === id || t.toAccId === id)) return 'Akun ini punya transaksi. Ubah statusnya jadi nonaktif.';
    if (e === 'cat' && (D.tx.some(t => t.catId === id) || D.bud.some(b => b.catId === id) || D.item.some(i => i.catId === id))) return 'Kategori ini masih dipakai. Arsipkan saja.';
  }
  function validate(e, r) {
    if (e === 'tx') {
      if (!(+r.amount > 0)) return 'Jumlah harus lebih dari 0.';
      if (r.type === 'Transfer') { if (!r.toAccId) return 'Pilih akun tujuan.'; if (r.toAccId === r.accId) return 'Akun asal dan tujuan tidak boleh sama.'; r.catId = ''; }
      else { const c = by(D.cat, r.catId); if (!c) return 'Pilih kategori.'; if (c.kind !== (r.type === 'Income' ? 'Pemasukan' : 'Pengeluaran')) return 'Kategori "' + c.name + '" tidak cocok dengan jenis transaksi.'; r.toAccId = ''; }
    }
    if (e === 'bud' && !(+r.limit > 0)) return 'Batas anggaran harus lebih dari 0.';
    if (e === 'goal' && !(+r.target > 0)) return 'Jumlah target harus lebih dari 0.';
    if (e === 'item' && !(+r.price >= 0)) return 'Harga tidak valid.';
    if (e === 'con' && !(+r.amount)) return 'Jumlah tidak boleh 0.';
  }
  function onEnt(f) {
    const e = f.dataset.e, id = f.dataset.id, sp = SP[e], it = id ? by(D[e], id) : null, rec = it ? Object.assign({}, it) : { id: uid() };
    sp.f.forEach(([k, , t]) => { const v = f.elements[k].value.trim(); rec[k] = t === 'bool' ? v === 'true' : t === 'number' ? (v === '' ? '' : +v) : v; });
    const err = validate(e, rec); if (err) return MO.msg('Periksa data', err);
    if (it) Object.assign(it, rec); else { if (e === 'item') rec.uses = 0; D[e].push(rec); }
    save(); closeSh(); render();
  }

  /* ---------- keranjang & resi ---------- */
  const lineOf = k => D.cart.find(l => l.k === k);
  function inc(k, d) {
    let l = lineOf(k);
    if (!l) { const i = by(D.item, k); if (!i || d < 0) return; l = { k, name: i.name, catId: i.catId, price: +i.price, qty: 0 }; D.cart.push(l); }
    l.qty += d; if (l.qty <= 0) D.cart = D.cart.filter(x => x !== l); save();
  }
  function cartSheet() {
    if (!D.cart.length) return sheet(shHead('Keranjang') + empty('Keranjang kosong. Pilih pengeluaran di Katalog dulu.', '<button class="fn-btn" data-a="gomenu">Buka Katalog</button>'));
    const act = D.acc.filter(a => a.active);
    sheet(shHead('Keranjang pengeluaran') + `<form data-f="cart"><div class="fn-lines">${D.cart.map(l => `<div class="fn-ln"><i class="fn-ico">${ci(by(D.item, l.k), cic(by(D.cat, l.catId)))}</i><div><b>${esc(l.name)}</b><small>${rp(l.price)}</small></div><div class="fn-st"><button type="button" data-a="cdec" data-k="${l.k}" aria-label="Kurangi">−</button><i>${l.qty}</i><button type="button" data-a="cinc" data-k="${l.k}" aria-label="Tambah">+</button></div><strong>${rp(l.price * l.qty)}</strong></div>`).join('')}</div>
    <div class="fn-flds"><label class="full"><span>Dibayar dari *</span><select name="accId" required>${act.length ? act.map(a => `<option value="${a.id}">${esc(a.name)} · ${rp(bal(a))}</option>`).join('') : '<option value="">Belum ada akun aktif</option>'}</select></label><label><span>Tanggal</span><input type="date" name="date" value="${today()}" required></label><label><span>Metode</span><select name="method">${PM.map(p => `<option>${p}</option>`).join('')}</select></label><label><span>Cakupan</span><select name="scope"><option>Pribadi</option><option>Pekerjaan</option></select></label><label><span>Catatan</span><input type="text" name="note" placeholder="Opsional"></label></div>
    <div class="fn-tot"><span>Total</span><b>${rp(cartT())}</b></div><footer><button type="button" class="fn-btn ghost" data-a="clear">Kosongkan</button><button class="fn-btn"${act.length ? '' : ' disabled'}>Catat &amp; buat resi</button></footer></form>`);
  }
  function customSheet() {
    sheet(shHead('Pengeluaran lain') + `<form data-f="custom"><div class="fn-flds"><label class="full"><span>Nama pengeluaran *</span><input name="name" required placeholder="Mis. Parkir"></label><label class="full"><span>Kategori *</span><select name="catId" required>${catO('Pengeluaran', '').map(p => `<option value="${p[0]}">${esc(p[1])}</option>`).join('')}</select></label><label><span>Harga (Rp) *</span><input type="number" name="price" min="1" step="any" required></label><label><span>Jumlah</span><input type="number" name="qty" min="1" value="1"></label></div><footer><button class="fn-btn">Masukkan ke keranjang</button></footer></form>`);
  }
  function checkout(f) {
    const a = D.acc.find(x => x.id === f.elements.accId.value); if (!a) return MO.msg('Pilih akun', 'Tambahkan akun aktif di Dompet.');
    const date = f.elements.date.value || today(), n = D.rcp.filter(r => r.date === date).length + 1, rid = uid(), now = new Date();
    const r = { id: rid, no: 'RS-' + date.replace(/-/g, '') + '-' + String(n).padStart(3, '0'), date, time: pad(now.getHours()) + ':' + pad(now.getMinutes()), accId: a.id, method: f.elements.method.value, scope: f.elements.scope.value, note: f.elements.note.value.trim(), items: D.cart.map(l => ({ name: l.name, qty: l.qty, price: l.price, catId: l.catId })), total: cartT() };
    D.cart.forEach(l => { D.tx.push({ id: uid(), type: 'Expense', date, amount: l.qty * l.price, accId: a.id, catId: l.catId, desc: l.name + (l.qty > 1 ? ' ×' + l.qty : ''), method: r.method, scope: r.scope, rcpId: rid }); const i = by(D.item, l.k); if (i) i.uses = (i.uses || 0) + l.qty; });
    D.rcp.push(r); D.cart = []; save(); render(); showRcp(r, true);
  }
  const recRows = r => {
    const o = [['No. resi', r.no], ['Tanggal', fd(r.date) + ' ' + r.time], ['Akun', an(r.accId)], ['Metode', r.method || '—'], ['-']];
    r.items.forEach(i => { o.push([i.name, '', 'b']); o.push(['  ' + i.qty + ' x ' + Math.round(i.price).toLocaleString('id-ID'), rp(i.price * i.qty)]); });
    o.push(['-']); o.push(['TOTAL', rp(r.total), 't']); if (r.note) { o.push(['-']); o.push(['Catatan: ' + r.note, '', 'i']); } return o;
  };
  function showRcp(r, fresh) {
    const bars = r.no.split('').map((c, i) => `<i style="width:${1 + (c.charCodeAt(0) + i) % 4}px"></i>`).join('');
    sheet(shHead(fresh ? 'Tercatat! Ini resimu' : 'Resi') + `<div class="fn-paper"><div class="fn-tear"></div><h4>${esc(bnm())}</h4><p class="c">Resi pengeluaran</p>${recRows(r).map(([a, b, o]) => a === '-' ? '<hr>' : `<div class="r ${o || ''}"><span>${esc(a)}</span><span>${esc(b || '')}</span></div>`).join('')}<div class="bc">${bars}</div><p class="c">Terima kasih. Tetap hemat!</p><div class="fn-tear b"></div></div><footer><button class="fn-btn ghost" data-a="print">${I.pr} Cetak / PDF</button><button class="fn-btn" data-a="png" data-id="${r.id}">${I.dl} Unduh PNG</button></footer>`);
  }
  const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
  function png(r) {
    const rows = recRows(r), S = 2, W = 520, LH = 28, H = 150 + rows.length * LH + 130, c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const g = c.getContext('2d'); g.scale(S, S); g.fillStyle = '#fffaf2'; g.fillRect(0, 0, W, H); g.fillStyle = '#d92b2b'; g.fillRect(0, 0, W, 100);
    g.fillStyle = '#fff3e6'; g.textAlign = 'center'; g.font = '800 30px "Baloo 2",Arial,sans-serif'; g.fillText(bnm().slice(0, 28), W / 2, 52); g.font = '700 13px Arial'; g.fillText('RESI PENGELUARAN', W / 2, 78);
    let y = 146;
    rows.forEach(([a, b, o]) => {
      if (a === '-') { g.strokeStyle = '#cdb9a8'; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(32, y - 9); g.lineTo(W - 32, y - 9); g.stroke(); g.setLineDash([]); }
      else { g.fillStyle = o === 'i' ? '#8a7a70' : '#2b1c1c'; g.font = (o === 'b' || o === 't' ? '700 ' : '') + (o === 't' ? '20px' : '15px') + ' "Courier New",monospace'; g.textAlign = 'left'; g.fillText(a.slice(0, 40), 32, y); g.textAlign = 'right'; g.fillText(b || '', W - 32, y); }
      y += LH;
    });
    let x = 32; g.fillStyle = '#2b1c1c'; r.no.split('').forEach((ch, i) => { const w = 1 + (ch.charCodeAt(0) + i) % 4; g.fillRect(x, y + 6, w, 40); x += w + 3; });
    g.textAlign = 'center'; g.fillStyle = '#8a7a70'; g.font = '14px Arial'; g.fillText('Terima kasih. Tetap hemat!', W / 2, y + 78);
    c.toBlob(b => dl(b, r.no + '.png'));
  }
  function csv() {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', rows = [['Tanggal', 'Jenis', 'Kategori', 'Akun', 'Deskripsi', 'Jumlah', 'Metode', 'Cakupan', 'Resi']].concat(D.tx.slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type, cn(t.catId), an(t.accId), t.desc || '', t.amount, t.method || '', t.scope || '', (by(D.rcp, t.rcpId) || {}).no || '']));
    dl(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }), 'transaksi-myoffice.csv');
  }

  /* ---------- event ---------- */
  const A = {
    close() { R.hidden = true; document.body.style.overflow = ''; }, xsh: closeSh,
    tab(d) { st.tab = d.t; render(); V.scrollTop = 0; },
    sub(d) { st.sub[d.k] = d.v; render(); }, goriw() { st.tab = 'riw'; st.sub.riw = 'rcp'; render(); }, gomenu() { closeSh(); st.tab = 'menu'; render(); },
    godom(d) { st.tab = 'dom'; st.sub.dom = d.v; render(); V.scrollTop = 0; },
    mon(d) { st.m = addM(st.m, +d.d); render(); }, tt(d) { st.tt = d.v; render(); },
    gocat(d) { st.cat = d.id; st.tab = 'menu'; render(); V.scrollTop = 0; }, cat(d) { st.cat = d.id; render(); },
    inc(d) { inc(d.k, 1); render(); }, dec(d) { inc(d.k, -1); render(); },
    cinc(d) { inc(d.k, 1); render(); cartSheet(); }, cdec(d) { inc(d.k, -1); render(); cartSheet(); },
    cart() { cartSheet(); }, clear() { D.cart = []; save(); render(); closeSh(); }, custom() { customSheet(); },
    add(d) {
      if (d.e === 'tx' && !D.acc.some(a => a.active)) return MO.msg('Belum ada akun aktif', 'Tambahkan akun dulu di Dompet.');
      if (d.e === 'con' && !D.goal.length) return MO.msg('Belum ada target', 'Buat target tabungan dulu.');
      form(d.e, null, d.pk ? { [d.pk]: d.pv } : null);
    },
    edit(d) { form(d.e, d.id); },
    del(d) {
      const b = canDel(d.e, d.id); if (b) return MO.msg('Tidak bisa dihapus', b);
      ask('Hapus data?', 'Data yang dihapus tidak bisa dikembalikan.', 'Ya, hapus', () => { if (d.e === 'goal') D.con = D.con.filter(c => c.goalId !== d.id); D[d.e] = D[d.e].filter(x => x.id !== d.id); save(); closeSh(); render(); });
    },
    yes() { const f = ask.fn; ask.fn = null; if (f) f(); },
    rcp(d) { showRcp(by(D.rcp, d.id)); }, png(d) { png(by(D.rcp, d.id)); }, csv,
    print() { window.print(); },
    rng(d) { st.rng = +d.v; render(); }, brand() { brandSheet(); },
    rstbrand() { D.brand = {}; save(); paintBrand(); closeSh(); },
    pickimg(d, b) { const w = b.closest('[data-img]'); if (w) w.querySelector('[data-img-in]').click(); },
    rmimg(d, b) { const w = b.closest('[data-img]'); if (!w) return; w.querySelector('input[type=hidden]').value = ''; w.querySelector('.fn-imp').innerHTML = '<em>Belum ada</em>'; }
  };
  R.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && R.contains(b) && A[b.dataset.a]) A[b.dataset.a](b.dataset, b); else if (e.target === SH) closeSh(); });
  R.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (f.dataset.f === 'ent') onEnt(f);
    else if (f.dataset.f === 'brand') { D.brand = { name: f.elements.name.value.trim(), tag: f.elements.tag.value.trim(), img: f.elements.img.value }; save(); paintBrand(); closeSh(); }
    else if (f.dataset.f === 'cart') checkout(f);
    else if (f.dataset.f === 'custom') { const k = 'c' + uid(); D.cart.push({ k, name: f.elements.name.value.trim(), catId: f.elements.catId.value, price: +f.elements.price.value, qty: Math.max(1, +f.elements.qty.value || 1) }); save(); render(); cartSheet(); }
  });
  R.addEventListener('change', e => {
    const t = e.target; if (!t.matches || !t.matches('[data-img-in]') || !t.files || !t.files[0]) return;
    const w = t.closest('[data-img]'), fit = w.querySelector('[data-fit]').checked;
    (w.hasAttribute('data-card') ? (f, _, cb) => toCard(f, cb) : toSquare)(t.files[0], fit, url => { w.querySelector('input[type=hidden]').value = url; w.querySelector('.fn-imp').innerHTML = '<img src="' + url + '" alt="">'; t.value = ''; });
  });
  let fqt; R.addEventListener('input', e => { if (e.target.dataset.in === 'q') { st.q = e.target.value; clearTimeout(fqt); fqt = setTimeout(() => { const g = R.querySelector('#fng'); if (g) g.innerHTML = gridHTML(); }, 120); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !R.hidden) { if (!SH.hidden) closeSh(); else A.close(); } });
  const X = MO.fin = { D, st, views: {}, addM, mlab, pc, mon, empty, meter, txRow, ci, cic, ic, bal, sum, expBy, budFor, got, expCats, cn, an, total: () => D.acc.filter(a => a.active).reduce((a, x) => a + bal(x), 0) };
  function open() { R.hidden = false; document.body.style.overflow = 'hidden'; render(); R.querySelector('.fn-hb button:last-child').focus(); }
  MO.routes['#finance'] = open;
})();
;
/* MyOffice Finance — Analisis keuangan: KPI, skor kesehatan, grafik SVG, proyeksi, dan insight otomatis.
   Membaca data dari finance.js lewat MyOffice.fin (tidak mengubah data apa pun). */
(function () {
  'use strict';
  const MO = window.MyOffice, X = MO && MO.fin; if (!X) return;
  const K = MO.kit, esc = K.esc, rp = K.rp, by = K.by, fd = K.fd, todayS = K.todayS;
  const D = X.D, st = X.st, pad = n => ('0' + n).slice(-2);
  const PAL = ['#1d5fb4', '#d92b2b', '#f08a3c', '#1f9d8a', '#7a5cc7', '#e0a526', '#2f9e5e', '#d8508a', '#6b3d2a', '#5d7287'];
  const GOOD = '#18814b', WARN = '#e8951a', BAD = '#d92b2b';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dec = x => x.toFixed(1).replace('.', ',').replace(/,0$/, '');
  const nice = v => { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const scale = (mn, mx) => { mn = Math.min(0, mn); mx = Math.max(1, mx); const step = nice((mx - mn) / 4); return { step, lo: Math.floor(mn / step + 1e-9) * step, hi: Math.ceil(mx / step - 1e-9) * step }; };
  const short = n => { const a = Math.abs(n), s = n < 0 ? '−' : ''; return a >= 1e9 ? s + dec(a / 1e9) + ' M' : a >= 1e6 ? s + dec(a / 1e6) + ' jt' : a >= 1e3 ? s + Math.round(a / 1e3) + ' rb' : s + Math.round(a); };
  const dim = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const ds = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const mname = (ym, o) => new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', o || { month: 'short' });
  const lab = (m, i) => (i === 0 || m.slice(5) === '01') ? mname(m) + ' ' + m.slice(2, 4) : mname(m);
  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const wd = date => (new Date(date + 'T00:00:00').getDay() + 6) % 7;

  /* ---------- perhitungan ---------- */
  function calc() {
    const m = st.m, pm = X.addM(m, -1), cur = todayS().slice(0, 7), ms = [];
    for (let i = st.rng - 1; i >= 0; i--) ms.push(X.addM(m, -i));
    const inc = X.sum('Income', m), exp = X.sum('Expense', m), pinc = X.sum('Income', pm), pexp = X.sum('Expense', pm);
    const net = inc - exp, sr = inc > 0 ? net / inc * 100 : null, total = X.total();
    const e3 = [0, 1, 2].map(i => X.sum('Expense', X.addM(m, -i))).filter(v => v > 0);
    const avgExp = e3.length ? e3.reduce((a, b) => a + b, 0) / e3.length : 0;
    const runway = avgExp > 0 && total > 0 ? total / avgExp : (avgExp > 0 ? 0 : null);
    const eb = X.expBy(m), pb = X.expBy(pm), n = dim(m), isCur = m === cur, dayNow = isCur ? +todayS().slice(8) : (m < cur ? n : 0);
    const daily = Array(n).fill(0);
    D.tx.forEach(t => { if (t.type === 'Expense' && t.date.slice(0, 7) === m) daily[+t.date.slice(8, 10) - 1] += +t.amount || 0; });
    const avgDay = dayNow ? exp / dayNow : 0, proj = isCur ? avgDay * n : exp;
    const buds = X.expCats().map(c => ({ c, b: X.budFor(c.id, m) })).filter(x => x.b).map(x => { const sp = eb[x.c.id] || 0, lim = +x.b.limit || 0; return { c: x.c, sp, lim, p: X.pc(sp, lim) }; });
    const goals = D.goal.filter(g => g.status === 'Aktif').map(g => ({ g, got: X.got(g), p: X.pc(X.got(g), +g.target) }));
    return { m, pm, cur, ms, inc, exp, pinc, pexp, net, sr, total, avgExp, runway, eb, pb, n, isCur, dayNow, daily, avgDay, proj, buds, goals };
  }

  function health(c) {
    const P = [];
    if (c.sr != null) P.push({ k: 'Tingkat tabungan', w: 30, s: clamp(c.sr / 20 * 100, 0, 100), d: Math.round(c.sr) + '% dari pemasukan (target ≥ 20%)' });
    if (c.runway != null) P.push({ k: 'Dana darurat', w: 25, s: clamp(c.runway / 6 * 100, 0, 100), d: dec(c.runway) + ' bulan pengeluaran (ideal ≥ 6)' });
    if (c.buds.length) { const ok = c.buds.filter(b => b.p <= 100).length; P.push({ k: 'Kepatuhan anggaran', w: 20, s: ok / c.buds.length * 100, d: ok + ' dari ' + c.buds.length + ' anggaran aman' }); }
    if (c.pexp > 0 && c.exp >= 0) { const ch = (c.exp - c.pexp) / c.pexp * 100; P.push({ k: 'Tren pengeluaran', w: 15, s: clamp(75 - ch * 2.5, 0, 100), d: (ch > 0 ? 'naik ' : 'turun ') + Math.abs(Math.round(ch)) + '% dari bulan lalu' }); }
    if (c.goals.length) { const a = c.goals.reduce((x, g) => x + g.p, 0) / c.goals.length; P.push({ k: 'Progres target', w: 10, s: clamp(a, 0, 100), d: Math.round(a) + '% rata-rata target aktif' }); }
    if (!P.length) return null;
    const W = P.reduce((a, p) => a + p.w, 0), score = P.reduce((a, p) => a + p.s * p.w, 0) / W;
    const lv = score >= 80 ? ['Sangat sehat', GOOD] : score >= 65 ? ['Sehat', GOOD] : score >= 50 ? ['Cukup, perlu perhatian', WARN] : score >= 35 ? ['Waspada', WARN] : ['Kritis', BAD];
    const sorted = P.slice().sort((a, b) => b.s - a.s);
    return { score, label: lv[0], col: lv[1], P, best: sorted[0], worst: sorted[sorted.length - 1] };
  }

  function balAt(date) {
    const act = new Set(D.acc.filter(a => a.active).map(a => a.id)); let b = 0;
    D.acc.forEach(a => { if (act.has(a.id)) b += +a.opening || 0; });
    D.tx.forEach(t => {
      if (t.date > date) return; const x = +t.amount || 0;
      if (t.type === 'Income') { if (act.has(t.accId)) b += x; }
      else if (t.type === 'Expense') { if (act.has(t.accId)) b -= x; }
      else if (t.type === 'Transfer') { if (act.has(t.accId)) b -= x; if (act.has(t.toAccId)) b += x; }
    });
    return b;
  }

  function weekdayAvg(ms) {
    const a = ms[0] + '-01', last = ms[ms.length - 1], endS = last + '-' + pad(dim(last)), lim = endS > todayS() ? todayS() : endS;
    const tot = Array(7).fill(0), cnt = Array(7).fill(0);
    if (lim < a) return tot;
    for (let d = new Date(a + 'T00:00:00'); ds(d) <= lim; d.setDate(d.getDate() + 1)) cnt[(d.getDay() + 6) % 7]++;
    D.tx.forEach(t => { if (t.type === 'Expense' && t.date >= a && t.date <= lim) tot[wd(t.date)] += +t.amount || 0; });
    return tot.map((v, i) => cnt[i] ? v / cnt[i] : 0);
  }

  /* ---------- grafik SVG ---------- */
  const grid = (W, L, Rr, T, ph, lo, hi, y, step) => { let s = ''; for (let v = lo; v <= hi + step / 1e3; v += step) { const yy = y(v).toFixed(1); s += `<line x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}" class="an-gl"/><text x="${L - 8}" y="${+yy + 4}" text-anchor="end" class="an-t">${short(v)}</text>`; } return s; };

  function cashflow(ms) {
    const R = ms.map(m => { const i = X.sum('Income', m), e = X.sum('Expense', m); return { m, i, e, n: i - e }; });
    const { lo, hi, step } = scale(Math.min(0, ...R.map(r => r.n)), Math.max(1, ...R.map(r => Math.max(r.i, r.e, r.n))));
    const W = 640, H = 270, L = 54, Rr = 14, T = 16, B = 32, pw = W - L - Rr, ph = H - T - B, y = v => T + ph * (1 - (v - lo) / (hi - lo)), y0 = y(0), gw = pw / R.length, bw = Math.min(30, gw * .3);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Grafik pemasukan, pengeluaran, dan selisih per bulan">` + grid(W, L, Rr, T, ph, lo, hi, y, step) + `<line x1="${L}" x2="${W - Rr}" y1="${y0}" y2="${y0}" class="an-ax"/>`;
    const pts = [];
    R.forEach((r, i) => {
      const cx = L + gw * (i + .5); pts.push([cx, y(r.n), r]);
      [[r.i, '#1d5fb4', -bw - 2, 'Pemasukan'], [r.e, BAD, 2, 'Pengeluaran']].forEach(([v, col, dx, nm]) => { const h = Math.max(0, y0 - y(v)); if (v > 0) s += `<rect class="an-bar" x="${(cx + dx).toFixed(1)}" y="${(y0 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${col}"><title>${nm} ${mname(r.m, { month: 'long', year: 'numeric' })}: ${rp(v)}</title></rect>`; });
      s += `<text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle" class="an-t">${lab(r.m, i)}</text>`;
    });
    s += `<polyline class="an-net" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none"/>`;
    pts.forEach(p => { s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" class="an-dot" stroke="${p[2].n >= 0 ? GOOD : WARN}"><title>Selisih ${mname(p[2].m, { month: 'long', year: 'numeric' })}: ${p[2].n < 0 ? '−' : ''}${rp(Math.abs(p[2].n))}</title></circle>`; });
    return { svg: s + '</svg>', R };
  }

  function area(pts, id, color) {
    const W = 640, H = 250, L = 54, Rr = 22, T = 18, B = 30, pw = W - L - Rr, ph = H - T - B, vs = pts.map(p => p.v);
    const { lo, hi, step } = scale(Math.min(...vs, 0), Math.max(...vs, 1));
    const y = v => T + ph * (1 - (v - lo) / (hi - lo)), x = i => pts.length < 2 ? L + pw / 2 : L + pw * i / (pts.length - 1), y0 = y(0);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join('');
    let s = `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Tren saldo"><defs><linearGradient id="ag${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".34"/><stop offset="1" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs>` + grid(W, L, Rr, T, ph, lo, hi, y, step);
    s += `<path d="${line}L${x(pts.length - 1).toFixed(1)} ${y0.toFixed(1)}L${x(0).toFixed(1)} ${y0.toFixed(1)}Z" fill="url(#ag${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p, i) => { s += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="#fff" stroke="${color}" stroke-width="2.5"><title>${p.l}: ${p.v < 0 ? '−' : ''}${rp(Math.abs(p.v))}</title></circle>`; if (pts.length <= 7 || i === pts.length - 1) s += `<text x="${x(i).toFixed(1)}" y="${(y(p.v) - 10).toFixed(1)}" text-anchor="middle" class="an-t b">${short(p.v)}</text>`; s += `<text x="${x(i).toFixed(1)}" y="${H - 9}" text-anchor="middle" class="an-t">${p.s}</text>`; });
    return s + '</svg>';
  }

  function dailyChart(c) {
    const W = 640, H = 230, L = 54, Rr = 12, T = 14, B = 28, pw = W - L - Rr, ph = H - T - B, sc = scale(0, Math.max(...c.daily, c.avgDay, 1)), hi = sc.hi, step = sc.step, y = v => T + ph * (1 - v / hi), gw = pw / c.n, bw = Math.max(3, gw * .68), top = c.daily.indexOf(Math.max(...c.daily));
    let s = `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Pengeluaran harian">` + grid(W, L, Rr, T, ph, 0, hi, y, step);
    c.daily.forEach((v, i) => { const cx = L + gw * (i + .5), h = Math.max(0, y(0) - y(v)); if (v > 0) s += `<rect class="an-bar" x="${(cx - bw / 2).toFixed(1)}" y="${(y(0) - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2).toFixed(1)}" fill="${i === top ? BAD : '#1d5fb4'}"><title>Tanggal ${i + 1}: ${rp(v)}</title></rect>`; if (i === 0 || (i + 1) % 5 === 0 || (i === c.n - 1 && c.n % 5 >= 3)) s += `<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" class="an-t">${i + 1}</text>`; });
    if (c.avgDay > 0) s += `<line x1="${L}" x2="${W - Rr}" y1="${y(c.avgDay).toFixed(1)}" y2="${y(c.avgDay).toFixed(1)}" class="an-avg"/><text x="${W - Rr}" y="${(y(c.avgDay) - 5).toFixed(1)}" text-anchor="end" class="an-t b" fill="${WARN}">rata-rata ${short(c.avgDay)}/hari</text>`;
    return s + '</svg>';
  }

  function donut(sl, total) {
    const r = 78, C = 2 * Math.PI * r; let off = 0, s = `<svg viewBox="0 0 220 220" class="an-donut" role="img" aria-label="Komposisi pengeluaran per kategori">`;
    sl.forEach(x => { const len = x.v / total * C; s += `<circle cx="110" cy="110" r="${r}" fill="none" stroke="${x.col}" stroke-width="34" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 110 110)"><title>${esc(x.name)}: ${rp(x.v)} (${Math.round(x.v / total * 100)}%)</title></circle>`; off += len; });
    return s + `<text x="110" y="104" text-anchor="middle" class="an-t">Total keluar</text><text x="110" y="128" text-anchor="middle" class="an-dc">${short(total)}</text></svg>`;
  }

  function gauge(score, col) {
    const L = Math.PI * 80;
    return `<svg viewBox="0 0 200 118" class="an-gauge" role="img" aria-label="Skor kesehatan keuangan ${Math.round(score)} dari 100"><path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="var(--cr3)" stroke-width="16" stroke-linecap="round"/><path class="an-arc" d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(score / 100 * L).toFixed(1)} ${L.toFixed(1)}"/><text x="100" y="88" text-anchor="middle" class="an-gs" fill="${col}">${Math.round(score)}</text><text x="100" y="110" text-anchor="middle" class="an-t">dari 100</text></svg>`;
  }

  /* ---------- insight otomatis ---------- */
  function insights(c, h) {
    const L = [], add = (k, t) => L.push({ k, t }), mlb = mname(c.m, { month: 'long' });
    if (c.inc > 0) {
      if (c.sr >= 20) add('good', `Kamu menyisihkan <b>${Math.round(c.sr)}%</b> dari pemasukan bulan ini. Itu di atas target sehat 20%.`);
      else if (c.sr >= 0) add('warn', `Tingkat tabungan baru <b>${Math.round(c.sr)}%</b>. Untuk mencapai 20% sisihkan <b>${rp(c.inc * .2 - c.net)}</b> lagi.`);
      else add('bad', `Pengeluaran melebihi pemasukan sebesar <b>${rp(-c.net)}</b> pada ${mlb}. Uang keluar lebih besar dari yang masuk.`);
    } else if (c.exp > 0) add('warn', `Belum ada pemasukan tercatat di ${mlb}, padahal sudah keluar <b>${rp(c.exp)}</b>. Catat pemasukanmu agar analisis akurat.`);
    const cats = Object.keys(c.eb).map(id => ({ id, v: c.eb[id] })).sort((a, b) => b.v - a.v);
    if (cats.length && c.exp > 0) { const t = cats[0], p = t.v / c.exp * 100, nm = X.cn(t.id); add(p > 50 ? 'warn' : 'info', `Pengeluaran terbesar ada di <b>${esc(nm)}</b>: ${rp(t.v)} (${Math.round(p)}% dari total).${p > 50 ? ' Lebih dari separuh uang keluarmu ada di satu kategori.' : ''}`); }
    if (c.pexp > 0 && c.exp > 0) { const ch = (c.exp - c.pexp) / c.pexp * 100; if (Math.abs(ch) >= 10) add(ch > 0 ? 'warn' : 'good', `Pengeluaran ${ch > 0 ? 'naik' : 'turun'} <b>${Math.abs(Math.round(ch))}%</b> dibanding bulan lalu (${rp(c.pexp)} → ${rp(c.exp)}).`); }
    if (c.runway != null) { const r = c.runway; add(r >= 6 ? 'good' : r >= 3 ? 'info' : r >= 1 ? 'warn' : 'bad', `Total saldo cukup untuk sekitar <b>${dec(r)} bulan</b> pengeluaran (rata-rata ${rp(c.avgExp)}/bulan). ${r >= 6 ? 'Dana daruratmu sudah kuat.' : r >= 3 ? 'Targetkan 6 bulan sebagai dana darurat ideal.' : 'Dana darurat tipis, prioritaskan menabung.'}`); }
    const over = c.buds.filter(b => b.p > 100), near = c.buds.filter(b => b.p >= 80 && b.p <= 100);
    if (over.length) add('bad', `Anggaran <b>${over.map(b => esc(b.c.name)).join(', ')}</b> sudah terlampaui (total lebih ${rp(over.reduce((a, b) => a + b.sp - b.lim, 0))}).`);
    if (near.length) add('warn', `Anggaran <b>${near.map(b => esc(b.c.name)).join(', ')}</b> hampir habis (≥ 80%).`);
    if (c.isCur && c.dayNow >= 5 && c.exp > 0) { add(c.inc > 0 && c.proj > c.inc ? 'warn' : 'info', `Dengan laju sekarang (<b>${rp(c.avgDay)}/hari</b>), pengeluaran akhir bulan diperkirakan <b>${rp(c.proj)}</b>${c.inc > 0 ? (c.proj > c.inc ? ', melebihi pemasukan bulan ini.' : ', masih di bawah pemasukan.') : '.'}`); }
    const wa = weekdayAvg(c.ms), mxW = Math.max(...wa);
    if (mxW > 0) { const i = wa.indexOf(mxW); add('info', `Hari paling boros: <b>${DAYS[i]}</b> (rata-rata ${rp(mxW)} per hari dalam ${st.rng} bulan terakhir).`); }
    const f = {}; D.tx.forEach(t => { if (t.type !== 'Expense' || t.date.slice(0, 7) !== c.m) return; const raw = (t.desc || '').trim(), q = +((raw.match(/×(\d+)$/) || [])[1]) || 1, nm = raw.replace(/ ×\d+$/, '') || X.cn(t.catId), k = nm.toLowerCase(); f[k] = f[k] || { nm, n: 0, v: 0 }; f[k].n += q; f[k].v += +t.amount || 0; });
    const fr = Object.values(f).filter(x => x.n >= 4 && c.exp > 0 && x.v / c.exp >= .05).sort((a, b) => b.v - a.v)[0];
    if (fr) add('warn', `<b>${esc(fr.nm)}</b> kamu beli ${fr.n}× bulan ini, total ${rp(fr.v)} (${Math.round(fr.v / c.exp * 100)}% pengeluaran). Pengeluaran kecil yang berulang paling mudah dihemat.`);
    if (!c.goals.length) add('info', 'Belum ada target tabungan aktif. Target yang jelas membantu uang sisa benar-benar ditabung.');
    const ord = { bad: 0, warn: 1, info: 2, good: 3 };
    return L.sort((a, b) => ord[a.k] - ord[b.k]).slice(0, 8);
  }

  /* ---------- tampilan ---------- */
  const card = (cls, t, sub, body) => `<section class="an-c ${cls}"><h3>${t}</h3>${sub ? `<p class="an-sub">${sub}</p>` : ''}${body}</section>`;
  const chip = (cur, prev, badUp) => { if (!(prev > 0)) return cur > 0 ? '<em class="an-d">bulan lalu belum ada data</em>' : ''; const p = (cur - prev) / prev * 100; if (Math.abs(p) < 1) return '<em class="an-d">stabil vs bulan lalu</em>'; const up = p > 0, good = badUp ? !up : up; return `<em class="an-d ${good ? 'g' : 'b'}">${up ? '▲' : '▼'} ${Math.abs(Math.round(p))}% vs bulan lalu</em>`; };
  const none = t => `<p class="an-none">${t}</p>`;
  const kpi = (cls, t, v, e) => `<div class="an-k ${cls}"><small>${t}</small><b>${v}</b>${e || ''}</div>`;

  function view() {
    const c = calc(), h = health(c), L = c.ms;
    const head = X.mon() + `<div class="fn-chips an-rng" role="group" aria-label="Rentang tren">${[3, 6, 12].map(n => `<button aria-pressed="${st.rng === n}" data-a="rng" data-v="${n}">${n} bulan</button>`).join('')}</div>`;
    if (!D.tx.length) return head + X.empty('Belum ada transaksi, jadi belum ada yang bisa dianalisis. Catat pemasukan dan pengeluaranmu, lalu grafik dan skor kesehatan keuangan akan muncul di sini.', '<button class="fn-btn" data-a="tab" data-t="menu">Catat pengeluaran pertama</button>');
    const act = D.acc.filter(a => a.active);
    let o = `<div class="an-kp">${kpi('main', 'Total saldo', rp(c.total), `<em class="an-d">${act.length} akun aktif${c.runway != null ? ' · cukup ±' + dec(c.runway) + ' bulan' : ''}</em>`)}${kpi('', 'Pemasukan', `<span class="pos">${rp(c.inc)}</span>`, chip(c.inc, c.pinc, false))}${kpi('', 'Pengeluaran', `<span class="neg">${rp(c.exp)}</span>`, chip(c.exp, c.pexp, true))}${kpi('', c.net >= 0 ? 'Sisa bulan ini' : 'Defisit bulan ini', `<span class="${c.net >= 0 ? 'pos' : 'neg'}">${c.net < 0 ? '−' : ''}${rp(Math.abs(c.net))}</span>`, `<em class="an-d">${c.sr != null ? 'Tingkat tabungan ' + Math.round(c.sr) + '%' : 'Belum ada pemasukan'}</em>`)}</div><div class="an">`;

    /* skor kesehatan */
    if (h) {
      const sum = `Kondisi keuanganmu <b style="color:${h.col}">${h.label.toLowerCase()}</b>. ${h.P.length > 1 ? `Yang sudah baik: <b>${h.best.k.toLowerCase()}</b>. Yang perlu dibenahi: <b>${h.worst.k.toLowerCase()}</b>.` : ''}`;
      o += card('s5', 'Skor kesehatan keuangan', 'Gabungan tabungan, dana darurat, anggaran, tren belanja, dan target.', `<div class="an-hl">${gauge(h.score, h.col)}<b class="an-lv" style="color:${h.col}">${h.label}</b></div><p class="an-sum">${sum}</p><div class="an-pt">${h.P.map(p => `<div><span>${p.k}<small>${p.d}</small></span><div class="fn-meter"><i class="${p.s >= 65 ? '' : p.s >= 40 ? 'warn' : 'bad'}" style="width:${p.s}%"></i></div><em>${Math.round(p.s)}</em></div>`).join('')}</div>`);
    } else o += card('s5', 'Skor kesehatan keuangan', '', none('Skor muncul setelah ada pemasukan atau pengeluaran di bulan ini.'));
    const ins = insights(c, h), ic = { good: '✅', warn: '⚠️', bad: '🚨', info: '💡' };
    o += card('s7', 'Temuan otomatis', `Dibaca dari datamu di ${mname(c.m, { month: 'long', year: 'numeric' })}.`, ins.length ? `<ul class="an-ins">${ins.map(i => `<li class="k-${i.k}"><i>${ic[i.k]}</i><span>${i.t}</span></li>`).join('')}</ul>` : none('Belum cukup data untuk membuat temuan.'));

    /* arus kas */
    const cf = cashflow(L);
    o += card('s7', 'Arus kas bulanan', 'Biru = pemasukan, merah = pengeluaran, garis = selisih. Titik hijau berarti kamu surplus, oranye berarti defisit.', `<div class="an-lg"><span class="a">Pemasukan</span><span class="b">Pengeluaran</span><span class="c">Selisih</span></div>${cf.svg}<details class="an-det"><summary>Lihat angka per bulan</summary><div class="an-tw"><table class="an-tb"><thead><tr><th>Bulan</th><th>Masuk</th><th>Keluar</th><th>Selisih</th><th>Tabung</th></tr></thead><tbody>${cf.R.slice().reverse().map(r => `<tr><td>${mname(r.m, { month: 'short', year: 'numeric' })}</td><td>${rp(r.i)}</td><td>${rp(r.e)}</td><td class="${r.n >= 0 ? 'pos' : 'neg'}">${r.n < 0 ? '−' : ''}${rp(Math.abs(r.n))}</td><td>${r.i > 0 ? Math.round(r.n / r.i * 100) + '%' : '–'}</td></tr>`).join('')}</tbody></table></div></details>`);

    /* donut */
    const cats = Object.keys(c.eb).map(id => ({ id, v: c.eb[id] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    let dn; if (cats.length) {
      const top = cats.slice(0, 6).map((x, i) => ({ name: X.cn(x.id), v: x.v, col: PAL[i], cat: by(D.cat, x.id) })), rest = cats.slice(6).reduce((a, x) => a + x.v, 0); if (rest > 0) top.push({ name: 'Lainnya (' + (cats.length - 6) + ')', v: rest, col: '#b9a99c' });
      dn = `<div class="an-dn">${donut(top, c.exp)}<ul class="an-lgd">${top.map(x => `<li><i style="background:${x.col}"></i><span>${x.cat ? X.cic(x.cat) + ' ' : ''}${esc(x.name)}</span><b>${Math.round(x.v / c.exp * 100)}%</b><small>${rp(x.v)}</small></li>`).join('')}</ul></div>`;
    } else dn = none('Belum ada pengeluaran di bulan ini.');
    o += card('s5', 'Ke mana uangmu pergi', 'Porsi pengeluaran per kategori bulan ini.', dn);

    /* tren saldo */
    const pts = L.map((m, i) => { const e = m + '-' + pad(dim(m)), d = e > todayS() ? todayS() : e; return { l: mname(m, { month: 'long', year: 'numeric' }), s: lab(m, i), v: balAt(d) }; });
    const dlt = pts[pts.length - 1].v - pts[0].v;
    o += card('s7', 'Tren total saldo', `Saldo akhir tiap bulan. Dalam ${L.length} bulan terakhir saldo ${dlt >= 0 ? 'naik' : 'turun'} <b class="${dlt >= 0 ? 'pos' : 'neg'}">${rp(Math.abs(dlt))}</b>.`, area(pts, 'nw', '#1d5fb4'));

    /* akun */
    const pos = act.map(a => ({ a, b: X.bal(a) })).sort((x, y) => y.b - x.b), tp = pos.reduce((a, x) => a + Math.max(0, x.b), 0);
    o += card('s5', 'Komposisi saldo per akun', 'Di mana uangmu disimpan.', pos.length ? `<div class="an-bars">${pos.map((x, i) => `<div><span>${esc(x.a.name)}<small>${esc(x.a.type)}</small></span><div class="fn-meter"><i style="width:${tp ? clamp(Math.max(0, x.b) / tp * 100, 0, 100) : 0}%;background:${x.b < 0 ? BAD : PAL[i % PAL.length]}"></i></div><b class="${x.b < 0 ? 'neg' : ''}">${x.b < 0 ? '−' : ''}${rp(Math.abs(x.b))}</b></div>`).join('')}</div>` : none('Belum ada akun aktif.'));

    /* harian + proyeksi */
    const mxD = Math.max(...c.daily), topDay = mxD > 0 ? c.daily.indexOf(mxD) + 1 : 0;
    o += card('s8', 'Pengeluaran harian', 'Batang merah = hari paling boros. Garis putus-putus = rata-rata harian.', c.exp > 0 ? dailyChart(c) : none('Belum ada pengeluaran di bulan ini.'));
    const tb = c.buds.reduce((a, b) => a + b.lim, 0), pr = (l, v, cl) => `<div><span>${l}</span><b class="${cl || ''}">${v}</b></div>`;
    o += card('s4', c.isCur ? 'Proyeksi akhir bulan' : 'Ringkasan bulan', c.isCur ? `Hari ke-${c.dayNow} dari ${c.n}, diperkirakan dari laju belanjamu.` : 'Statistik pengeluaran bulan terpilih.', `<div class="an-pr">${pr('Rata-rata per hari', rp(c.isCur ? c.avgDay : c.exp / c.n))}${pr(c.isCur ? 'Perkiraan total keluar' : 'Total keluar', rp(c.proj), c.inc > 0 && c.proj > c.inc ? 'neg' : '')}${c.isCur && c.inc > 0 ? pr('Perkiraan sisa', (c.inc - c.proj < 0 ? '−' : '') + rp(Math.abs(c.inc - c.proj)), c.inc - c.proj >= 0 ? 'pos' : 'neg') : ''}${topDay ? pr('Hari terboros', 'Tgl ' + topDay + ' · ' + rp(mxD)) : ''}${tb ? pr('Total anggaran', rp(tb)) : ''}${pr('Jumlah transaksi', D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === c.m).length + ' keluar')}</div>`);

    /* anggaran */
    o += card('s6', 'Anggaran vs realisasi', 'Seberapa banyak batas belanja sudah terpakai.', c.buds.length ? `<div class="an-bd">${c.buds.sort((a, b) => b.p - a.p).map(b => `<div><i class="fn-ico">${X.cic(b.c)}</i><div><b>${esc(b.c.name)}</b><small>${rp(b.sp)} / ${rp(b.lim)}</small>${X.meter(b.p)}</div><em class="${b.p > 100 ? 'neg' : b.p >= 80 ? 'wn' : 'pos'}">${Math.round(b.p)}%<small>${b.p > 100 ? 'Melebihi' : b.p >= 80 ? 'Hampir habis' : 'Aman'}</small></em></div>`).join('')}</div>` : none('Belum ada anggaran untuk bulan ini.') + '<button class="fn-btn sm" data-a="godom" data-v="bud">Atur anggaran</button>');

    /* pola hari */
    const wa = weekdayAvg(L), mw = Math.max(...wa);
    o += card('s6', 'Pola belanja per hari', `Rata-rata pengeluaran tiap hari dalam ${L.length} bulan terakhir.`, mw > 0 ? `<div class="an-bars wk">${wa.map((v, i) => `<div><span>${DAYS[i]}</span><div class="fn-meter"><i class="${v === mw ? 'bad' : ''}" style="width:${v / mw * 100}%"></i></div><b>${rp(v)}</b></div>`).join('')}</div>` : none('Belum cukup data.'));

    /* tabel kategori */
    const ids = Array.from(new Set(Object.keys(c.eb).concat(Object.keys(c.pb)))).map(id => ({ id, a: c.eb[id] || 0, b: c.pb[id] || 0 })).sort((x, y) => y.a - x.a || y.b - x.b);
    o += card('s7', 'Kategori: bulan ini vs bulan lalu', 'Merah = pengeluaran naik, hijau = turun.', ids.length ? `<div class="an-tw"><table class="an-tb"><thead><tr><th>Kategori</th><th>Bulan ini</th><th class="hm">Bulan lalu</th><th>Ubah</th></tr></thead><tbody>${ids.map(r => { const d = r.b > 0 ? (r.a - r.b) / r.b * 100 : null; return `<tr><td>${X.cic(by(D.cat, r.id))} ${esc(X.cn(r.id))}<small>${c.exp ? Math.round(r.a / c.exp * 100) : 0}% dari total</small></td><td>${rp(r.a)}</td><td class="hm">${rp(r.b)}</td><td class="${d == null ? '' : d > 0 ? 'neg' : d < 0 ? 'pos' : ''}">${d == null ? (r.a > 0 ? 'baru' : '–') : (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(Math.round(d)) + '%'}</td></tr>`; }).join('')}</tbody></table></div>` : none('Belum ada data pengeluaran.'));

    /* top 5 */
    const t5 = D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === c.m).sort((a, b) => (+b.amount || 0) - (+a.amount || 0)).slice(0, 5);
    o += card('s5', '5 pengeluaran terbesar', 'Transaksi tunggal paling besar bulan ini.', t5.length ? t5.map(X.txRow).join('') : none('Belum ada pengeluaran.'));

    /* sumber pemasukan */
    const ib = {}; D.tx.filter(t => t.type === 'Income' && t.date.slice(0, 7) === c.m).forEach(t => ib[t.catId] = (ib[t.catId] || 0) + (+t.amount || 0));
    const il = Object.keys(ib).map(id => ({ id, v: ib[id] })).sort((a, b) => b.v - a.v);
    o += card('s5', 'Sumber pemasukan', 'Dari mana uang masuk bulan ini.', il.length ? `<div class="an-bars">${il.map((x, i) => `<div><span>${X.cic(by(D.cat, x.id))} ${esc(X.cn(x.id))}</span><div class="fn-meter"><i style="width:${x.v / c.inc * 100}%;background:${PAL[(i + 3) % PAL.length]}"></i></div><b>${rp(x.v)}</b></div>`).join('')}</div>` : none('Belum ada pemasukan bulan ini.'));

    /* target */
    const avgC = g => { const mm = [0, 1, 2].map(i => X.addM(c.cur, -i)), v = D.con.filter(x => x.goalId === g.id && mm.includes(x.date.slice(0, 7))).reduce((a, x) => a + (+x.amount || 0), 0) / 3; return v; };
    o += card('s7', 'Progres target tabungan', 'Estimasi dihitung dari rata-rata setoran 3 bulan terakhir.', c.goals.length ? `<div class="an-gl2">${c.goals.map(x => { const left = Math.max(0, +x.g.target - x.got), ac = avgC(x.g), mo = ac > 0 ? Math.ceil(left / ac) : null; let est = x.p >= 100 ? 'Target tercapai 🎉' : mo ? 'Estimasi tercapai ±' + mo + ' bulan lagi' : 'Belum ada setoran rutin'; if (x.g.date && x.p < 100) { const dl = Math.round((new Date(x.g.date) - new Date(todayS())) / 864e5); est += ' · batas ' + fd(x.g.date) + (dl < 0 ? ' (lewat)' : ''); } return `<div><div class="an-gh"><b>${esc(x.g.name)}</b><em>${Math.round(x.p)}%</em></div>${X.meter(Math.min(x.p, 100))}<small>${rp(x.got)} dari ${rp(x.g.target)} · ${est}</small></div>`; }).join('')}</div>` : none('Belum ada target tabungan aktif.') + '<button class="fn-btn sm" data-a="godom" data-v="goal">Buat target</button>');

    return head + o + '</div><p class="an-foot">Semua angka dihitung dari data di perangkat ini. Transfer antar akun tidak dihitung sebagai pemasukan atau pengeluaran.</p>';
  }

  X.views.ana = view;
})();
;
/* MyOffice — Goal (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, empty = K.empty, bar = K.bar, add = K.add, btns = K.btns, opt = K.opt, badge = K.badge, chips = K.chips, prog = K.prog, has = K.has;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var HZ = ['Harian', 'Mingguan', 'Bulanan', 'Semesteran', 'Tahunan', 'Jangka panjang'];
  var LC = ['Akademik', 'Karier / Pekerjaan', 'Keuangan', 'Spiritual', 'Kesehatan', 'Relasi & sosial', 'Pengembangan diri', 'Bisnis', 'Lainnya'];
  var GS = ['Belum mulai', 'Berjalan', 'Ditunda', 'Tercapai', 'Dibatalkan'], TS = ['Belum', 'Dikerjakan', 'Selesai'];

  /* Dipakai Task & Kalender untuk menautkan item ke goal/milestone */
  MO.goalOpts = function () {
    var g = ls('mo-goal-v1'), o = [['', '—']];
    (g.goal || []).forEach(function (x) { o.push([x.id, '🎯 ' + x.name]); (g.ms || []).filter(function (m) { return m.goalId === x.id; }).forEach(function (m) { o.push([m.id, '   ↳ ' + m.name]); }); });
    return o;
  };

  var goals = K.App('Goal', 'mo-goal-v1', function () { return { goal: [], ms: [], gtask: [], rev: [] }; }, function (app) {
    var D = app.D, st = app.st, today = K.todayS;
    if (!D.pf || !D.pf.length) D.pf = [{ id: 'pf', level: 3, min: 15, xp: 40, claims: [] }];
    var PF = D.pf[0]; if (!PF.claims) PF.claims = [];
    var LV = [0, ['🌱', 'Santai', 'Pelan tapi pasti', 5, 10], ['⭐', 'Stabil', 'Konsisten tiap hari', 10, 25], ['🚀', 'Intens', 'Progres nyata', 15, 40], ['🔥', 'Maksimal', 'Tantang batasmu', 30, 80]];
    var LB = ['Baru mulai', 'Mulai terasa', 'Separuh jalan', 'Hampir sampai', 'Tercapai!'];
    var CAT = { 'Akademik': ['📚', '#3d7ff5', '#7fb2ff'], 'Karier / Pekerjaan': ['💼', '#7a5af0', '#a98fff'], 'Keuangan': ['💰', '#f2a900', '#ffd24d'], 'Spiritual': ['🕌', '#0f9f7a', '#55d3ae'], 'Kesehatan': ['💪', '#ee4f6a', '#ff98a8'], 'Relasi & sosial': ['🤝', '#ff8433', '#ffbd7a'], 'Pengembangan diri': ['🚀', '#1f9bf0', '#7ccffd'], 'Bisnis': ['📈', '#0db0b0', '#6fe3d6'], 'Lainnya': ['🎯', '#66769a', '#a9b5cf'] };
    var cat = function (g) { return CAT[g.cat] || CAT['Lainnya']; };
    var CH = '<svg class="gq-chest" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1H3z" fill="#b8621f"/><rect x="3" y="11" width="18" height="9" rx="2" fill="#7a3d12"/><rect x="10" y="10" width="4" height="6" rx="1" fill="#ffcf3f"/></svg>';
    var dstr = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    /* XP nyata: tugas 10, milestone 30, evaluasi 5, hadiah misi 20. Streak = hari beruntun yang punya aktivitas bertanggal. */
    function xpInfo() {
      var e = [], tot = 0, td = 0, days = {}, t = today();
      D.ms.forEach(function (m) { if (m.done) e.push([m.doneAt || '', 30]); });
      D.gtask.forEach(function (x) { if (x.status === 'Selesai') e.push([x.doneAt || '', 10]); });
      D.rev.forEach(function (r) { e.push([r.date || '', 5]); });
      PF.claims.forEach(function (c) { e.push([c, 20]); });
      e.forEach(function (x) { tot += x[1]; if (x[0]) days[x[0]] = 1; if (x[0] === t) td += x[1]; });
      var sk = 0, d = new Date(); if (!days[t]) d.setDate(d.getDate() - 1);
      while (days[dstr(d)]) { sk++; d.setDate(d.getDate() - 1); }
      return { tot: tot, td: td, streak: sk, lv: Math.floor(tot / 100) + 1, into: tot % 100 };
    }
    var msOf = function (gid) { return D.ms.filter(function (m) { return m.goalId === gid; }); };
    var extT = function () { return (ls('mo-task-v1').task || []).filter(function (t) { return t.goalRef; }); };
    var extE = function () { return (ls('mo-cal-v1').ev || []).filter(function (e) { return e.goalRef; }); };
    /* Tugas pendukung = tugas milik goal + tugas dari modul Task yang ditautkan */
    function tasksOf(gid, mid) {
      var ids = [gid].concat(msOf(gid).map(function (m) { return m.id; }));
      var own = D.gtask.filter(function (t) { return mid ? t.msId === mid : t.goalId === gid; }).map(function (t) { return { id: t.id, title: t.title, done: t.status === 'Selesai', due: t.due, own: 1, st: t.status }; });
      var ext = extT().filter(function (t) { return mid ? t.goalRef === mid : ids.indexOf(t.goalRef) > -1; }).map(function (t) { return { id: t.id, title: t.title, done: t.status === 'Done', due: t.due, own: 0, st: t.status }; });
      return own.concat(ext);
    }
    function pg(g) {
      var b = g.basis || 'ms';
      if (b === 'num') return has(g.tgtNum) && +g.tgtNum > 0 ? { pct: Math.min(100, (+g.curNum || 0) / +g.tgtNum * 100), txt: (+g.curNum || 0) + ' / ' + g.tgtNum + ' ' + (g.unit || '') } : { pct: null, txt: 'Isi angka target di Edit goal' };
      if (b === 'tasks') { var t = tasksOf(g.id), d = t.filter(function (x) { return x.done; }).length; return t.length ? { pct: d / t.length * 100, txt: d + ' dari ' + t.length + ' tugas selesai' } : { pct: null, txt: 'Belum ada tugas pendukung' }; }
      var m = msOf(g.id), dn = m.filter(function (x) { return x.done; }).length; return m.length ? { pct: dn / m.length * 100, txt: dn + ' dari ' + m.length + ' milestone tercapai' } : { pct: null, txt: 'Belum ada milestone' };
    }
    var late = function (g) { return g.deadline && g.deadline < today() && g.status !== 'Tercapai' && g.status !== 'Dibatalkan'; };
    var goalOpt = function () { return [['', '— Pilih goal —']].concat(D.goal.map(function (g) { return [g.id, g.name]; })); };
    var specs = {
      goal: { title: 'Goal', def: { horizon: 'Bulanan', cat: 'Pengembangan diri', status: 'Belum mulai', basis: 'ms' }, fields: [
        { k: 'name', l: 'Nama goal', t: 'text', req: 1, full: 1 }, { k: 'why', l: 'Alasan / tujuan', t: 'textarea', full: 1 },
        { k: 'horizon', l: 'Horizon', t: 'select', o: opt(HZ) }, { k: 'cat', l: 'Kategori kehidupan', t: 'select', o: opt(LC) },
        { k: 'target', l: 'Target yang ingin dicapai', t: 'textarea', full: 1 }, { k: 'deadline', l: 'Deadline', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: opt(GS) },
        { k: 'basis', l: 'Progres dihitung dari', t: 'select', full: 1, o: [['ms', 'Milestone yang tercapai'], ['tasks', 'Tugas pendukung yang selesai'], ['num', 'Angka target (mis. dana terkumpul)']] },
        { k: 'tgtNum', l: 'Angka target (jika dasar = angka)', t: 'number', min: 0 }, { k: 'curNum', l: 'Angka saat ini', t: 'number' }, { k: 'unit', l: 'Satuan', t: 'text', ph: 'Rp / halaman / jam' }] },
      ms: { title: 'Milestone', def: { done: false }, fields: [
        { k: 'name', l: 'Milestone', t: 'text', req: 1, full: 1 }, { k: 'goalId', l: 'Goal', t: 'select', o: goalOpt, req: 1 }, { k: 'due', l: 'Tenggat', t: 'date' },
        { k: 'done', l: 'Status', t: 'select', bool: 1, o: [['false', 'Belum tercapai'], ['true', 'Tercapai']] }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      gtask: { title: 'Tugas Pendukung', def: { status: 'Belum' }, fields: [
        { k: 'title', l: 'Tugas', t: 'text', req: 1, full: 1 }, { k: 'goalId', l: 'Goal', t: 'select', o: goalOpt, req: 1 },
        { k: 'msId', l: 'Milestone (opsional)', t: 'select', o: function () { return [['', '— Tanpa milestone —']].concat(D.ms.map(function (m) { return [m.id, (by(D.goal, m.goalId) || {}).name + ' ↳ ' + m.name]; })); } },
        { k: 'due', l: 'Tenggat', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: opt(TS) }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      pf: { title: 'Target Harian', def: {}, fields: [{ k: 'level', l: 'Intensitas', t: 'select', full: 1, o: [['1', '🌱 Santai'], ['2', '⭐ Stabil'], ['3', '🚀 Intens'], ['4', '🔥 Maksimal']] }, { k: 'min', l: 'Menit belajar per hari', t: 'number', min: 1 }, { k: 'xp', l: 'Target XP per hari', t: 'number', min: 1 }] },
      rev: { title: 'Evaluasi', def: { mood: 'Sesuai rencana' }, fields: [
        { k: 'goalId', l: 'Goal', t: 'select', o: goalOpt, req: 1 }, { k: 'date', l: 'Tanggal', t: 'date', req: 1 }, { k: 'mood', l: 'Kondisi', t: 'select', o: opt(['Sesuai rencana', 'Perlu perhatian', 'Tertinggal']) },
        { k: 'note', l: 'Catatan evaluasi', t: 'textarea', req: 1, full: 1 }] }
    };
    var meta = function (g) { return badge(g.horizon) + badge(g.cat) + badge(g.status, g.status === 'Tercapai' ? 'on' : '') + (late(g) ? badge('Lewat deadline', 'late') : ''); };

    function hero() {
      var X = xpInfo(), L = LV[PF.level] || LV[3], p = Math.min(100, X.td / (+PF.xp || 1) * 100);
      return '<section class="gq-hero"><div class="gq-top"><span class="gq-lbl"><i>◎</i>Target harian</span><span class="gq-streak">🔥 ' + (X.streak ? X.streak + ' hari beruntun' : 'Mulai streak hari ini') + '</span></div>' +
        '<div class="gq-lv"><span class="gq-em">' + L[0] + '</span><div><b>' + L[1] + '!</b><small>' + L[2] + '</small></div></div>' +
        '<div class="gq-bar g"><i style="width:' + p + '%"></i></div><p class="gq-cap">' + (p >= 100 ? 'Target hari ini tercapai 🎉' : X.td + ' / ' + PF.xp + ' XP hari ini') + '</p>' +
        '<div class="gq-pop"><div><span class="gq-dot v">🕒</span><b>' + PF.min + '</b> Menit / hari</div><div><span class="gq-dot o">⭐</span><b>' + PF.xp + '</b> XP / hari</div></div>' +
        '<div class="gq-set"><button class="gq-rb" data-act="pfstep" data-dir="-1" aria-label="Turunkan intensitas"' + (PF.level <= 1 ? ' disabled' : '') + '>−</button><button class="gq-main" data-act="edit" data-e="pf" data-id="pf"><i>' + PF.level + '</i>Atur target</button><button class="gq-rb" data-act="pfstep" data-dir="1" aria-label="Naikkan intensitas"' + (PF.level >= 4 ? ' disabled' : '') + '>+</button></div></section>';
    }
    function lvlCard() {
      var X = xpInfo();
      return '<section class="gq-lvl"><div class="gq-sh"><b>Lv ' + X.lv + '</b></div><div><b>' + X.tot + ' XP</b><div class="gq-bar b"><i style="width:' + X.into + '%"></i></div><small>' + X.into + ' / 100 XP menuju level berikutnya</small></div></section>';
    }
    function quest() {
      var X = xpInfo(), t = today(), c1 = D.ms.filter(function (m) { return m.done && m.doneAt === t; }).length + D.gtask.filter(function (x) { return x.status === 'Selesai' && x.doneAt === t; }).length, c3 = D.rev.filter(function (r) { return r.date === t; }).length;
      var Q = [['⚡', 'Selesaikan 1 tugas atau milestone', Math.min(c1, 1), 1], ['🎯', 'Raih ' + PF.xp + ' XP hari ini', Math.min(X.td, +PF.xp), +PF.xp], ['📝', 'Tulis 1 evaluasi', Math.min(c3, 1), 1]];
      var all = Q.every(function (q) { return q[2] >= q[3]; }), got = PF.claims.indexOf(t) > -1;
      return '<section class="gq-panel"><h3 class="gq-h">Misi harian' + (all ? ' selesai!' : '') + '</h3>' + Q.map(function (q) {
        return '<div class="gq-q"><span class="gq-qi">' + q[0] + '</span><div><b>' + q[1] + '</b><div class="gq-qb"><div class="gq-bar y"><i style="width:' + q[2] / q[3] * 100 + '%"></i></div>' + CH + '<em>' + q[2] + ' / ' + q[3] + '</em></div></div></div>';
      }).join('') + '<button class="ac-btn pri gq-claim" data-act="claim"' + (all && !got ? '' : ' disabled') + '>' + (got ? 'Hadiah diklaim ✓' : 'Klaim hadiah +20 XP') + '</button></section>';
    }
    function tile(g) {
      var p = pg(g), c = cat(g);
      return '<article class="gq-goal" style="--c1:' + c[1] + ';--c2:' + c[2] + '" data-act="opg" data-id="' + g.id + '"><span class="gq-gi">' + c[0] + '</span><div class="gq-gm"><h3><button class="t" data-act="opg" data-id="' + g.id + '">' + esc(g.name) + '</button></h3><div class="gq-gb">' + meta(g) + '</div>' +
        '<div class="gq-bar g"><i style="width:' + (p.pct || 0) + '%"></i></div><small>' + p.txt + (p.pct != null ? ' (' + Math.round(p.pct) + '%)' : '') + (g.deadline ? ' · deadline ' + fd(g.deadline) : '') + '</small>' + (g.why ? '<div class="ac-notes" style="margin:6px 0 0">' + esc(g.why) + '</div>' : '') + '</div>' +
        '<div class="gq-ga"><button class="ac-btn sm" data-act="edit" data-e="goal" data-id="' + g.id + '">Edit</button><span class="gq-go">Masuk ›</span></div></article>';
    }
    function cele() {
      var c = st.cele, g = c && by(D.goal, c.g); if (!g) return '';
      var p = pg(g), pc = Math.round(p.pct || 0), m = c.id && by(D.ms, c.id), ml = msOf(g.id), tk = tasksOf(g.id), win = c.k === 'goal' || !m, cf = '';
      var dn = function (a) { return a.filter(function (x) { return x.done; }).length; };
      for (var i = 0; i < 16; i++) cf += '<i style="left:' + (i * 6.2 + 2) + '%;animation-delay:' + (i % 5) * 0.35 + 's"></i>';
      var T = [['🎯', 'Milestone', dn(ml) + ' / ' + ml.length], ['✅', 'Tugas selesai', dn(tk) + ' / ' + tk.length], ['🗓', 'Deadline', fd(g.deadline)]];
      return '<div class="gq-cele ' + (win ? 'win' : 'ms') + '" role="dialog" aria-modal="true" aria-label="Pencapaian"><div class="gq-cc">' + (win ? '<div class="gq-conf">' + cf + '</div><div class="gq-trophy">🏆</div><h3>Goal tercapai!</h3><p>' + esc(g.name) + ' — setiap langkah kecilmu sudah sampai.</p>' : '<div class="gq-shield"><b>LEVEL UP</b></div><h3>Milestone tercapai: ' + esc(m.name) + '</h3><p>+30 XP. Kamu makin dekat ke ' + esc(g.name) + '.</p>') +
        '<div class="gq-bar ' + (win ? 'g' : 'p') + '"><i style="width:' + pc + '%"></i></div><small>' + pc + '% · ' + p.txt + '</small><div class="gq-dets">' + T.map(function (x) { return '<div><span>' + x[0] + '</span><small>' + x[1] + '</small><b>' + x[2] + '</b></div>'; }).join('') + '</div>' +
        '<div class="gq-cb">' + (win && g.status !== 'Tercapai' ? '<button class="ac-btn pri" data-act="cele-ok" data-id="' + g.id + '">Tandai goal tercapai</button>' : '') + '<button class="ac-btn" data-act="cele-x">Lanjut</button></div></div></div>';
    }
    function list() {
      var hz = st.hz || 'Semua', L = D.goal.filter(function (g) { return hz === 'Semua' || g.horizon === hz; });
      var h = bar('Target pada berbagai horizon. Progres dihitung dari milestone, tugas, atau angka sesuai dasar yang Anda pilih — bukan angka acak.', add('goal', 'Goal')) + chips(['Semua'].concat(HZ), hz, 'hz');
      if (!L.length) h += empty('Belum ada goal. Mulai dengan satu target, lalu pecah menjadi milestone.');
      HZ.forEach(function (z) {
        var x = L.filter(function (g) { return g.horizon === z; }); if (!x.length) return;
        h += '<div class="ac-h">' + z + ' · ' + x.length + '</div>' + x.map(tile).join('');
      });
      return '<div class="gq-grid"><aside>' + hero() + lvlCard() + quest() + '</aside><div>' + h + '</div></div>' + cele();
    }
    function taskLine(t) {
      return '<div class="ac-item' + (t.done ? ' done' : '') + '" style="margin:4px 0;padding:8px 10px"><input type="checkbox" ' + (t.own ? 'data-act="tgt" data-id="' + t.id + '"' : 'disabled title="Ubah statusnya di modul Task"') + (t.done ? ' checked' : '') + ' aria-label="Selesai"><div><button class="t" ' + (t.own ? 'data-act="edit" data-e="gtask" data-id="' + t.id + '"' : 'data-act="gotask"') + '>' + esc(t.title) + '</button>' + (t.own ? '' : badge('dari Task')) + '<small>' + (t.due ? 'Tenggat ' + fd(t.due) + ' · ' : '') + esc(t.st) + '</small></div>' + (t.own ? '<button class="ac-btn sm danger" data-act="del" data-e="gtask" data-id="' + t.id + '" aria-label="Hapus">×</button>' : '') + '</div>';
    }
    var evLine = function (e) { return '<div class="ac-item" style="margin:4px 0;padding:8px 10px"><div><b>🗓 ' + esc(e.title) + '</b><small>' + fd(e.start) + (e.startTime ? ' · ' + e.startTime + (e.endTime ? '–' + e.endTime : '') : ' · seharian') + '</small></div><button class="ac-btn sm" data-act="gocal">Kalender</button></div>'; };
    function detail(g) {
      var p = pg(g), ms = msOf(g.id).sort(function (a, b) { return (a.due || '9').localeCompare(b.due || '9'); }), E = extE();
      var c = cat(g), pc = p.pct == null ? 0 : p.pct, lvl = pc >= 100 ? 5 : 1 + Math.floor(pc / 25), nx = ms.filter(function (m) { return !m.done; })[0], tk0 = tasksOf(g.id);
      var h = '<button class="ac-btn sm ac-back" data-act="opg" data-id="">← Semua goal</button><section class="gq-wh"><span class="gq-fl a">' + c[0] + '</span><span class="gq-fl b">✨</span><span class="gq-fl c">⭐</span>' +
        '<div class="gq-wtop"><span class="gq-wem">' + c[0] + '</span><div><h3>' + esc(g.name) + '</h3><div class="gq-gb">' + meta(g) + '</div></div>' + btns('goal', g.id) + '</div>' +
        '<div class="gq-bar w"><i style="width:' + pc + '%"></i></div><div class="gq-wl"><b>Level ' + lvl + ' · ' + LB[lvl - 1] + '</b><span>' + Math.round(pc) + '%</span></div><p class="gq-wn">' + p.txt + (nx ? ' · Selanjutnya: ' + esc(nx.name) : '') + '</p>' +
        '<div class="gq-wst"><div><small>Milestone</small><b>' + ms.filter(function (m) { return m.done; }).length + ' / ' + ms.length + '</b></div><div><small>Tugas selesai</small><b>' + tk0.filter(function (x) { return x.done; }).length + ' / ' + tk0.length + '</b></div><div><small>Deadline</small><b>' + fd(g.deadline) + '</b></div></div></section>' +
        (g.basis === 'num' ? '<div class="ac-meta"><span>Angka: <b>' + (+g.curNum || 0) + ' / ' + (g.tgtNum || '—') + ' ' + esc(g.unit || '') + '</b></span></div>' : '') +
        (g.why ? '<div class="ac-notes"><b>Alasan / tujuan</b>\n' + esc(g.why) + '</div>' : '') + (g.target ? '<div class="ac-notes"><b>Target</b>\n' + esc(g.target) + '</div>' : '');
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Goal breakdown · Milestone</div>' + add('ms', 'Milestone', 'goalId', g.id) + '</div>';
      h += ms.length ? ms.map(function (m) {
        var T = tasksOf(g.id, m.id), ev = E.filter(function (e) { return e.goalRef === m.id; }), pre = esc(JSON.stringify({ goalId: g.id, msId: m.id })), lt = m.due && m.due < today() && !m.done;
        var dn = T.filter(function (x) { return x.done; }).length, tot = T.length || 1, cur = T.length ? dn : (m.done ? 1 : 0), w = m.done ? 100 : cur / tot * 100;
        return '<div class="gq-ms' + (m.done ? ' done' : '') + '"><div class="gq-mh"><span class="gq-mi">' + (m.done ? '🏆' : '🎯') + '</span><div class="ac-item' + (m.done ? ' done' : '') + '"><input type="checkbox" data-act="tgm" data-id="' + m.id + '"' + (m.done ? ' checked' : '') + ' aria-label="Tercapai"><div><button class="t" data-act="edit" data-e="ms" data-id="' + m.id + '">' + esc(m.name) + '</button>' + (lt ? badge('Lewat tenggat', 'late') : '') + '<small>' + (m.due ? 'Tenggat ' + fd(m.due) + ' · ' : '') + dn + '/' + T.length + ' tugas · ' + ev.length + ' jadwal belajar · +30 XP</small>' + (m.notes ? '<small>' + esc(m.notes) + '</small>' : '') + '</div></div>' + btns('ms', m.id) + '</div>' +
          '<div class="gq-qb"><div class="gq-bar y"><i style="width:' + w + '%"></i></div>' + CH + '<em>' + cur + ' / ' + tot + '</em></div>' +
          '<div class="tree">' + T.map(taskLine).join('') + ev.map(evLine).join('') + '<button class="ac-btn sm" data-act="add" data-e="gtask" data-pre="' + pre + '">+ Tugas</button> <button class="ac-btn sm" data-act="gocal">+ Jadwal belajar (Kalender)</button></div></div>';
      }).join('') : empty('Belum ada milestone. Pecah goal ini di bawah, atau tambahkan satu per satu.');
      var loose = tasksOf(g.id).filter(function (t) { return t.own ? !by(D.gtask, t.id).msId : !ms.some(function (m) { return extT().some(function (x) { return x.id === t.id && x.goalRef === m.id; }); }); });
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Tugas pendukung (tanpa milestone)</div>' + add('gtask', 'Tugas', 'goalId', g.id) + '</div>' + (loose.length ? loose.map(taskLine).join('') : '<p class="ac-hint">Tidak ada.</p>');
      var ge = E.filter(function (e) { return e.goalRef === g.id; });
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Jadwal belajar untuk goal ini</div><button class="ac-btn sm" data-act="gocal">Buka Kalender</button></div>' + (ge.length ? ge.map(evLine).join('') : '<p class="ac-hint">Buat acara di Kalender dan pilih goal/milestone pada kolom "Terkait goal / milestone". Tugas dari modul Task ditautkan dengan cara yang sama.</p>');
      h += '<div class="ac-card" style="margin-top:14px"><b>Pecah target menjadi milestone</b><p class="ac-hint" style="margin:4px 0 8px">Satu baris = satu milestone. Tenggat opsional dengan format <i>nama | 2026-12-31</i>.</p><textarea rows="4" placeholder="Menguasai kosakata dasar\nMenyelesaikan materi nahwu dasar\nMenyelesaikan materi sharaf dasar\nMembaca teks sederhana\nMeningkatkan pemahaman teks tanpa harakat" style="width:100%"></textarea><div style="margin-top:8px"><button class="ac-btn pri" data-act="bulk" data-id="' + g.id + '">Buat milestone</button></div></div>';
      var rv = D.rev.filter(function (r) { return r.goalId === g.id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Catatan evaluasi</div>' + add('rev', 'Evaluasi', 'goalId', g.id) + '</div>' + (rv.length ? rv.map(function (r) { return '<div class="ac-item"><div><b>' + fd(r.date) + '</b> ' + badge(r.mood, r.mood === 'Sesuai rencana' ? 'on' : r.mood === 'Tertinggal' ? 'late' : 'mid') + '<div class="ac-notes" style="margin:4px 0 0">' + esc(r.note) + '</div></div>' + btns('rev', r.id) + '</div>'; }).join('') : '<p class="ac-hint">Belum ada evaluasi. Catat secara berkala apa yang berjalan dan apa yang perlu diubah.</p>');
      return h;
    }
    return {
      skin: 'gq-skin', specs: specs, tabs: [['g', 'Goals', function () {
        var g = st.g && by(D.goal, st.g); if (!g) return list();
        var c = cat(g), fr = st.fresh; st.fresh = false;
        return '<div class="gq-world' + (fr ? ' fresh' : '') + '" style="--c1:' + c[1] + ';--c2:' + c[2] + '">' + detail(g) + '</div>' + cele();
      }]],
      sub: function () { var a = D.goal.filter(function (g) { return g.status === 'Berjalan'; }).length; return D.goal.length + ' goal · ' + a + ' berjalan'; },
      cascade: { goal: [['ms', 'goalId'], ['gtask', 'goalId'], ['rev', 'goalId']], ms: [['gtask', 'msId']] },
      guard: function (e) { if (e !== 'goal' && !D.goal.length) return ['Belum ada goal', 'Buat goal terlebih dahulu.']; },
      validate: function (e, r) {
        if (e === 'pf') { r.level = Math.max(1, Math.min(4, +r.level || 3)); if (!(+r.min > 0 && +r.xp > 0)) return 'Menit dan XP per hari harus lebih dari 0.'; }
        if (e === 'goal' && r.basis === 'num' && !(+r.tgtNum > 0)) return 'Dasar progres "angka" membutuhkan angka target lebih dari 0.';
        if (e === 'gtask' && r.msId) { var m = by(D.ms, r.msId); if (m) r.goalId = m.goalId; }
      },
      act: function (a, d, t) {
        if (a === 'opg') { st.g = d.id || null; st.fresh = !!d.id; }
        if (a === 'pfstep') { var lv = Math.max(1, Math.min(4, (+PF.level || 3) + (+d.dir))); PF.level = lv; PF.min = LV[lv][3]; PF.xp = LV[lv][4]; }
        if (a === 'claim' && PF.claims.indexOf(today()) < 0) PF.claims.push(today());
        if (a === 'cele-x') st.cele = null;
        if (a === 'cele-ok') { var cg = by(D.goal, d.id); if (cg) cg.status = 'Tercapai'; st.cele = null; }
        if (a === 'tgm') {
          var m0 = by(D.ms, d.id), g1 = by(D.goal, m0.goalId), b0 = g1 ? pg(g1).pct : 0;
          m0.done = t.checked; m0.doneAt = t.checked ? today() : '';
          if (t.checked && g1) { var a0 = pg(g1).pct; st.cele = { k: a0 >= 100 && !(b0 >= 100) ? 'goal' : 'ms', id: m0.id, g: g1.id }; }
        }
        if (a === 'tgt') {
          var k0 = by(D.gtask, d.id), g0 = by(D.goal, k0.goalId), b1 = g0 ? pg(g0).pct : 0;
          k0.status = t.checked ? 'Selesai' : 'Belum'; k0.doneAt = t.checked ? today() : '';
          if (t.checked && g0 && pg(g0).pct >= 100 && !(b1 >= 100)) st.cele = { k: 'goal', g: g0.id };
        }
        if (a === 'gotask' && MO.routes['#task']) MO.routes['#task']();
        if (a === 'gocal' && MO.routes['#calendar']) MO.routes['#calendar']();
        if (a === 'bulk') {
          var ta = t.closest('.ac-card').querySelector('textarea'), n = 0;
          ta.value.split('\n').forEach(function (ln) {
            var p = ln.split('|'), nm = p[0].trim(), due = (p[1] || '').trim(); if (!nm) return;
            D.ms.push({ id: K.uid(), goalId: d.id, name: nm, due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '', done: false, notes: '' }); n++;
          });
          if (n) MO.msg('Milestone dibuat', n + ' milestone ditambahkan');
        }
      }
    };
  });
  MO.routes['#goal'] = goals.open;
})();
;
/* MyOffice — Document Center. Metadata di localStorage, isi berkas asli di IndexedDB browser.
   Tampilan: perpustakaan rak buku (readowl.css) — folder = rak, dokumen = sampul buku. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, empty = K.empty;
  var dbp;
  function db() {
    return dbp || (dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('mo-docs', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function tx(mode, fn) {
    return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('files', mode), q = fn(t.objectStore('files')); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); });
  }
  var put = function (id, b) { return tx('readwrite', function (s) { return s.put(b, id); }); };
  var get = function (id) { return tx('readonly', function (s) { return s.get(id); }); };
  var rmb = function (id) { return tx('readwrite', function (s) { return s.delete(id); }).catch(function () { }); };
  var size = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; };
  var SKIN = 'rd-skin';
  var PER_ROW = 6;

  /* ---------- Jenis berkas → warna sampul ---------- */
  var PAL = {
    pdf: ['#d2634a', '#9b3125'], doc: ['#4a7cc0', '#2a4f8c'], xls: ['#58a275', '#2f6e4a'], ppt: ['#e79442', '#b85a1d'],
    img: ['#45a2b0', '#26667a'], av: ['#8264b8', '#523a88'], txt: ['#fdf8ee', '#eadcc0'], zip: ['#7a8190', '#474e5c'], oth: ['#a08672', '#664f3f']
  };
  function kind(f) {
    var t = f.type || '', n = f.name.toLowerCase(), s = t + ' ' + n;
    return /^image\//.test(t) ? 'img' : /pdf/.test(s) ? 'pdf' : /word|\.docx?$|\.odt$|\.rtf$/.test(s) ? 'doc' : /sheet|excel|\.xlsx?$|\.csv$|\.ods$/.test(s) ? 'xls'
      : /presentation|powerpoint|\.pptx?$|\.odp$/.test(s) ? 'ppt' : /^(audio|video)\//.test(t) ? 'av' : /zip|rar|7z|tar|gz/.test(s) ? 'zip' : /^text\/|\.(txt|md|json)$/.test(s) ? 'txt' : 'oth';
  }
  var hash = function (s) { var h = 0, i; for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  var extOf = function (f) { var m = /\.([a-z0-9]{1,5})$/i.exec(f.name); return (m ? m[1] : (f.type || '').split('/').pop() || 'file').slice(0, 5).toUpperCase(); };
  var baseName = function (f) { return f.name.replace(/\.[a-z0-9]{1,5}$/i, ''); };

  /* ---------- Ikon ---------- */
  var IC = {
    lib: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
    up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    fnew: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6l-4 1 1-4z"/>',
    del: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    go: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  var ic = function (n, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; };
  var LOGO = '<svg class="rd-owl" viewBox="0 0 64 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11 11 3l7 5M57 11 53 3l-7 5"/><circle cx="20" cy="19" r="9"/><circle cx="44" cy="19" r="9"/><path d="M29 18.5c1.8-1.6 4.2-1.6 6 0"/><circle cx="20" cy="19" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="19" r="3" fill="currentColor" stroke="none"/></svg>';

  /* ---------- Thumbnail gambar (dibaca dari IndexedDB, di-cache) ---------- */
  var thumbs = {}, vis = [];
  var thumbable = function (f) { return /^image\/(png|jpe?g|webp|gif|avif)$/.test(f.type || '') && f.size < 12e6; };
  /* Sampul dibuat dari versi KECIL gambar (maks. 360px), bukan berkas aslinya yang bisa belasan MB.
     Didekode terkecil lewat createImageBitmap, diproses satu per satu agar halaman tidak tersendat. */
  var tq = [], tbusy = false;
  function mkThumb(b) {
    if (!window.createImageBitmap) return Promise.resolve(b);
    return createImageBitmap(b, { resizeWidth: 360, resizeQuality: 'medium' }).then(function (bm) {
      var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
      c.getContext('2d').drawImage(bm, 0, 0); if (bm.close) bm.close();
      return new Promise(function (res) { c.toBlob(function (t) { res(t || b); }, 'image/webp', .82); });
    }).catch(function () { return b; });
  }
  function pumpThumbs() {
    if (tbusy || !tq.length) return; tbusy = true;
    var f = tq.shift();
    get(f.id).then(function (b) { return b ? mkThumb(b) : null; }).then(function (t) {
      if (!t || !(f.id in thumbs)) return;
      var u = URL.createObjectURL(t); thumbs[f.id] = u;
      Array.prototype.forEach.call(document.querySelectorAll('.rd-cover[data-id="' + f.id + '"]'), function (n) { n.style.setProperty('--img', "url('" + u + "')"); n.classList.add('has-img'); });
    }).catch(function () { delete thumbs[f.id]; }).then(function () { tbusy = false; setTimeout(pumpThumbs, 30); });
  }
  function fetchThumbs() {
    vis.forEach(function (f) {
      if (!thumbable(f) || f.id in thumbs) return;
      thumbs[f.id] = null; tq.push(f);
    });
    pumpThumbs();
  }
  function dropThumb(id) { if (thumbs[id]) URL.revokeObjectURL(thumbs[id]); delete thumbs[id]; }

  /* Tombol unggah via label+input agar dialog berkas tidak hilang karena render ulang */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.rd-skin label[data-pick]')) { e.preventDefault(); e.target.querySelector('input').click(); }
  });
  var readSettings = function () { try { return JSON.parse(localStorage.getItem('mo-settings-v1')) || {}; } catch (e) { return {}; } };

  var docs = K.App('Document Center', 'mo-docs-v1', function () { return { folder: [], file: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var path = function (id) { var o = [], f; while (id && (f = by(D.folder, id)) && o.length < 20) { o.unshift(f); id = f.parentId; } return o; };
    var pstr = function (id) { return path(id).map(function (f) { return f.name; }).join(' / ') || 'Dokumen'; };
    var kids = function (id) { var o = [id]; D.folder.filter(function (f) { return f.parentId === id; }).forEach(function (f) { o = o.concat(kids(f.id)); }); return o; };
    var folderOpts = function () { return [['', 'Dokumen (utama)']].concat(D.folder.map(function (f) { return [f.id, pstr(f.id)]; })); };
    var specs = {
      folder: { title: 'Folder', def: {}, fields: [{ k: 'name', l: 'Nama folder', t: 'text', req: 1, full: 1 }, { k: 'parentId', l: 'Letak', t: 'select', full: 1, o: folderOpts }] },
      file: { title: 'Dokumen', def: {}, fields: [{ k: 'name', l: 'Nama dokumen', t: 'text', req: 1, full: 1 }, { k: 'folderId', l: 'Folder', t: 'select', full: 1, o: folderOpts }, { k: 'tags', l: 'Tag (pisahkan koma)', t: 'text', full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] }
    };
    var tagList = function (f) { return (f.tags || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
    var byName = function (a, b) { return a.name.localeCompare(b.name); };
    var itemCount = function (id) { return D.file.filter(function (x) { return x.folderId === id; }).length; };

    /* ----- Sampul buku ----- */
    function cover(f, extra) {
      var k = kind(f), p = PAL[k], pat = hash(f.name) % 4, img = thumbs[f.id];
      vis.push(f);
      var tip = f.name + '\n' + size(f.size) + ' · ' + fd(f.added) + (f.tags ? '\n#' + tagList(f).join(' #') : '') + (f.notes ? '\n' + f.notes : '');
      return '<button class="rd-cover k-' + k + ' p' + pat + (img ? ' has-img' : '') + (extra ? ' ' + extra : '') + '" style="--c1:' + p[0] + ';--c2:' + p[1] + (img ? ";--img:url('" + img + "')" : '') + '" data-act="view" data-id="' + f.id + '" title="' + esc(tip) + '" aria-label="Buka ' + esc(f.name) + '">' +
        '<i class="rd-art"></i><i class="rd-ext">' + esc(extOf(f)) + '</i><b class="rd-name">' + esc(baseName(f)) + '</b>' +
        (k === 'txt' && f.idx ? '<span class="rd-snip">' + esc(f.idx.slice(0, 200)) + '</span>' : '') + '</button>';
    }
    function tools(f) {
      var b = function (a, ico, lb, cls, e) { return '<button class="' + (cls || '') + '" data-act="' + a + '"' + (e ? ' data-e="' + e + '"' : '') + ' data-id="' + f.id + '" aria-label="' + lb + ' ' + esc(f.name) + '" title="' + lb + '">' + ic(ico, 2) + '</button>'; };
      return '<div class="rd-tools">' + b('dl', 'dl', 'Unduh') + b('edit', 'edit', 'Edit', '', 'file') + b('delfile', 'del', 'Hapus', 'danger') + '</div>';
    }
    var book = function (f, i) { return '<div class="rd-book" style="--i:' + Math.min(i, 14) + '">' + cover(f) + tools(f) + '</div>'; };
    var ghost = function (label) { return '<label class="rd-book rd-ghost" data-pick tabindex="0" role="button" title="Unggah dokumen ke rak ini"><span class="rd-plus">' + ic('plus', 1.6) + '</span><em>' + label + '</em><input type="file" multiple hidden data-chg="upload"></label>'; };
    var row = function (inner) { return '<div class="rd-shelf"><div class="rd-shelf-in">' + inner + '<i class="rd-ledge"></i></div></div>'; };
    function chunk(a, n) { var o = [], i; for (i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

    /* ----- Rak ----- */
    function shelf(title, sub, files, o) {
      o = o || {};
      var head = '<div class="rd-sh"><h3>' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h3><div class="rd-sh-acts">' +
        (o.folder ? '<button class="rd-ib" data-act="edit" data-e="folder" data-id="' + o.folder.id + '" aria-label="Ubah nama atau letak rak ' + esc(o.folder.name) + '" title="Edit rak">' + ic('edit', 1.8) + '</button><button class="rd-ib danger" data-act="delfolder" data-id="' + o.folder.id + '" aria-label="Hapus rak ' + esc(o.folder.name) + '" title="Hapus rak">' + ic('del', 1.8) + '</button>' : '') +
        (o.open ? '<button class="rd-more" data-act="cd" data-id="' + o.open + '">' + (o.more || 'Buka rak') + ic('go', 1.8) + '</button>' : '') + '</div></div>';
      var rows = chunk(files, PER_ROW), i = 0, body = '';
      if (!rows.length) rows = [[]];
      rows.forEach(function (r, ri) {
        var last = ri === rows.length - 1;
        body += row(r.map(function (f) { return book(f, i++); }).join('') + (o.add && last ? ghost('Unggah') : '') + (!r.length && !o.add ? '<span class="rd-void">Rak kosong</span>' : ''));
      });
      return '<section class="rd-sec">' + head + body + '</section>';
    }
    function emptyState() {
      return '<section class="rd-sec rd-empty"><div class="rd-empty-in"><div class="rd-empty-books"><i class="rd-eb e1"></i><i class="rd-eb e2"></i><i class="rd-eb e3"></i><i class="rd-ledge"></i></div>' +
        '<h3>Rak ini masih kosong</h3><p>Unggah dokumen pertama Anda, atau buat folder untuk menyusun rak baru. Berkas disimpan aman di browser ini.</p>' +
        '<div class="rd-empty-acts"><label class="rd-btn pri" data-pick tabindex="0" role="button">' + ic('up') + 'Unggah dokumen<input type="file" multiple hidden data-chg="upload"></label>' +
        '<button class="rd-btn" data-act="add" data-e="folder" data-pre="' + esc(JSON.stringify({ parentId: st.f || '' })) + '">' + ic('fnew') + 'Folder baru</button></div></div></section>';
    }
    function shelvesView(cur) {
      var sub = D.folder.filter(function (f) { return (f.parentId || '') === cur; }).sort(byName),
        fl = D.file.filter(function (f) { return (f.folderId || '') === cur; }).sort(byName), h = '';
      if (!sub.length && !fl.length) return emptyState();
      if (!cur && D.file.length >= 4) {
        var nw = D.file.slice().sort(function (a, b) { return new Date(b.added) - new Date(a.added); }).slice(0, PER_ROW);
        h += shelf('Baru diunggah', '', nw, {});
      }
      h += shelf(cur ? (by(D.folder, cur) || {}).name : 'Dokumen', fl.length + ' dokumen', fl, { add: true });
      sub.forEach(function (f) {
        var inside = D.file.filter(function (x) { return x.folderId === f.id; }).sort(byName), nsub = D.folder.filter(function (x) { return x.parentId === f.id; }).length;
        h += shelf(f.name, inside.length + ' dokumen' + (nsub ? ' · ' + nsub + ' sub-rak' : ''), inside.slice(0, PER_ROW), { folder: f, open: f.id, more: inside.length > PER_ROW ? 'Seluruh rak (' + inside.length + ')' : 'Buka rak' });
      });
      return h;
    }

    /* ----- Grid (Semua / Terbaru / hasil cari) ----- */
    function folderCover(f) {
      return '<button class="rd-cover k-fold p' + (hash(f.name) % 4) + '" style="--c1:#b07a45;--c2:#7a4a24" data-act="cd" data-id="' + f.id + '" title="' + esc(pstr(f.id)) + '" aria-label="Buka rak ' + esc(f.name) + '"><i class="rd-art"></i><i class="rd-ext">RAK</i><b class="rd-name">' + esc(f.name) + '</b><span class="rd-fico">' + ic('folder', 1.5) + '</span></button>';
    }
    function card(f, i) {
      var tg = tagList(f);
      return '<div class="rd-card" style="--i:' + Math.min(i, 14) + '"><div class="rd-book">' + cover(f) + tools(f) + '</div><div class="rd-cap"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b><small>' + size(f.size) + ' · ' + fd(f.added) + '</small>' +
        '<small class="loc">' + esc(pstr(f.folderId)) + '</small>' + (tg.length ? '<small class="tg">#' + tg.map(esc).join(' #') + '</small>' : '') + '</div></div>';
    }
    function gridView(title, note, files, folders, none) {
      var i = 0, g = (folders || []).map(function (f) { return '<div class="rd-card"><div class="rd-book">' + folderCover(f) + '</div><div class="rd-cap"><b>' + esc(f.name) + '</b><small>' + itemCount(f.id) + ' dokumen</small><small class="loc">' + esc(pstr(f.parentId)) + '</small></div></div>'; }).join('') +
        files.map(function (f) { return card(f, i++); }).join('');
      return '<section class="rd-sec"><div class="rd-sh"><h3>' + esc(title) + '<small>' + esc(note) + '</small></h3></div>' + (g ? '<div class="rd-grid">' + g + '</div>' : '<div class="rd-none">' + none + '</div>') + '</section>';
    }

    /* ----- Kerangka: sidebar + panel ----- */
    function side(view, cur, q) {
      var last = D.last && by(D.file, D.last.id), me = readSettings(), nm = me.nick || 'Pengguna';
      var nav = function (v, ico, lb, on) { return '<button class="rd-nav' + (on ? ' on' : '') + '" data-act="rdv" data-v="' + v + '"' + (v === 'shelves' ? ' data-root="1"' : '') + (on ? ' aria-current="page"' : '') + '>' + ic(ico, 1.6) + '<span>' + lb + '</span></button>'; };
      var q0 = !q;
      return '<aside class="rd-side"><div class="rd-logo">' + LOGO + '<b>Document Center</b></div><nav class="rd-navs" aria-label="Menu Document Center">' +
        nav('shelves', 'lib', 'Perpustakaan', q0 && view === 'shelves') + nav('recent', 'clock', 'Terbaru', q0 && view === 'recent') + nav('all', 'grid', 'Semua dokumen', q0 && view === 'all') +
        '<label class="rd-nav" data-pick tabindex="0" role="button">' + ic('up', 1.6) + '<span>Unggah</span><input type="file" multiple hidden data-chg="upload"></label>' +
        '<button class="rd-nav" data-act="add" data-e="folder" data-pre="' + esc(JSON.stringify({ parentId: cur })) + '">' + ic('fnew', 1.6) + '<span>Folder baru</span></button></nav>' +
        (last ? '<div class="rd-resume"><small>Terakhir dibuka</small>' + cover(last, 'mini') + '<span title="' + esc(last.name) + '">' + esc(baseName(last)) + '</span></div>' : '<div class="rd-resume none"></div>') +
        '<button class="rd-me" data-act="rdme" aria-label="Buka pengaturan profil"><i class="rd-av"' + (me.photo ? ' style="background-image:url(&quot;' + esc(me.photo) + '&quot;)"' : '') + '></i><span>' + esc(nm) + '</span>' + ic('chev', 1.8) + '</button></aside>';
    }
    function topbar(view, q) {
      var t = function (v, lb, on) { return '<button class="rd-tab" role="tab" aria-selected="' + on + '" data-act="rdv" data-v="' + v + '">' + lb + '</button>'; };
      return '<div class="rd-top"><div class="rd-tabs" role="tablist">' + t('shelves', 'Rak', !q && view === 'shelves') + t('all', 'Semua dokumen', !q && view !== 'shelves') + '</div>' +
        '<label class="rd-search">' + ic('search', 1.7) + '<input type="text" data-in="dq" placeholder="Cari nama, tag, catatan, atau isi berkas teks…" value="' + esc(st.dq || '') + '" aria-label="Cari dokumen" autocomplete="off"></label></div>';
    }

    function vDocs() {
      var old = document.querySelector('.rd-main');
      if (old && !st.reset && (st.lq || '') === (st.dq || '')) st.rs = old.scrollTop; else st.rs = 0;
      st.reset = 0; st.lq = st.dq || '';
      vis = [];
      var q = (st.dq || '').toLowerCase().trim(), cur = st.f || '', view = st.view || 'shelves';
      if (cur && !by(D.folder, cur)) cur = st.f = '';
      var total = D.file.reduce(function (a, f) { return a + (+f.size || 0); }, 0), main, crumbs = '';
      if (q) {
        var F = D.file.filter(function (f) { return (f.name + ' ' + (f.tags || '') + ' ' + (f.notes || '') + ' ' + (f.idx || '')).toLowerCase().indexOf(q) > -1; }).sort(byName),
          Fo = D.folder.filter(function (f) { return f.name.toLowerCase().indexOf(q) > -1; }).sort(byName);
        main = gridView('Hasil pencarian', (F.length + Fo.length) + ' hasil untuk “' + (st.dq || '').trim() + '”', F, Fo, 'Tidak ada hasil. Pencarian isi berkas hanya untuk berkas teks (.txt, .md, .csv, .json).');
      } else if (view === 'all') {
        main = gridView('Semua dokumen', D.file.length + ' berkas', D.file.slice().sort(byName), null, 'Belum ada dokumen. Unggah dokumen pertama Anda lewat menu Unggah.');
      } else if (view === 'recent') {
        main = gridView('Terbaru', '24 berkas terakhir diunggah', D.file.slice().sort(function (a, b) { return new Date(b.added) - new Date(a.added); }).slice(0, 24), null, 'Belum ada dokumen. Unggah dokumen pertama Anda lewat menu Unggah.');
      } else {
        main = shelvesView(cur);
        crumbs = '<nav class="rd-crumbs" aria-label="Lokasi rak"><button class="rd-crumb' + (cur ? '' : ' on') + '" data-act="cd" data-id="">Dokumen</button>' + path(cur).map(function (f, i, a) { return '<span aria-hidden="true">/</span><button class="rd-crumb' + (i === a.length - 1 ? ' on' : '') + '" data-act="cd" data-id="' + f.id + '">' + esc(f.name) + '</button>'; }).join('') + '</nav>';
      }
      var info = '<div class="rd-info">' + (crumbs || '<span></span>') + '<small>' + D.file.length + ' dokumen · ' + D.folder.length + ' folder · ' + size(total) + ' di browser ini</small></div>';
      var html = '<div class="rd">' + side(view, cur, q) + '<div class="rd-panel"><div class="rd-main">' + topbar(view, q) + info + main + '</div></div></div>';
      setTimeout(function () { var m = document.querySelector('.rd-main'); if (m && st.rs) m.scrollTop = st.rs; fetchThumbs(); }, 0);
      return html;
    }

    function viewer(f, blob) {
      var url = URL.createObjectURL(blob), t = f.type || blob.type || '';
      var done = function (b) {
        var m = el2('ac-ov ac-ov2 ' + SKIN, '<div class="ac-win vw"><header><div><h2 style="font-size:20px">' + esc(f.name) + '</h2><p>' + size(f.size) + ' · ' + esc(t || 'berkas') + '</p></div><button class="ac-x" data-x aria-label="Tutup">×</button></header><div class="ac-body">' + b + '</div><div class="ac-foot"><a class="ac-btn" href="' + url + '" target="_blank" rel="noopener">Buka di tab baru</a><a class="ac-btn pri" href="' + url + '" download="' + esc(f.name) + '">Unduh</a></div></div>');
        document.body.appendChild(m);
        var cx = m.querySelector('.ac-x'); if (cx) cx.focus();
        var off = function () { m.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); };
        m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
        m.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-x]')) off(); });
        m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
      };
      if (/^image\//.test(t)) done('<img src="' + url + '" alt="">');
      else if (/pdf/.test(t)) done('<iframe src="' + url + '" title="' + esc(f.name) + '"></iframe><p class="ac-hint" style="margin-top:8px">Jika PDF tidak tampil di perangkat ini, gunakan "Buka di tab baru" atau "Unduh".</p>');
      else if (/^video\//.test(t)) done('<video src="' + url + '" controls style="width:100%;max-height:68dvh"></video>');
      else if (/^audio\//.test(t)) done('<audio src="' + url + '" controls style="width:100%"></audio>');
      else if (/^text\//.test(t) || /\.(txt|md|csv|json)$/i.test(f.name)) blob.text().then(function (x) { done('<pre>' + esc(x.slice(0, 200000)) + '</pre>'); });
      else done(empty('Jenis berkas ini tidak bisa dipratinjau di browser. Gunakan "Unduh" untuk membukanya dengan aplikasi yang sesuai.'));
    }
    var el2 = K.el;
    function download(f, blob) { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 10000); }
    function withBlob(id, fn) { var f = by(D.file, id); if (!f) return; get(id).then(function (b) { if (!b) return MO.msg('Berkas tidak ditemukan', 'Isinya hilang dari penyimpanan browser.'); fn(f, b); }).catch(function () { MO.msg('Gagal', 'Penyimpanan browser tidak dapat dibaca.'); }); }
    return {
      skin: SKIN,
      specs: specs, tabs: [['d', 'Dokumen', vDocs]], sub: function () { return D.file.length + ' dokumen · ' + D.folder.length + ' folder'; },
      cascade: { folder: [] },
      act: function (a, d, t, ev) {
        if (a === 'cd') { st.f = d.id || ''; st.dq = ''; st.view = 'shelves'; st.reset = 1; }
        if (a === 'rdv') { st.view = d.v; st.dq = ''; if (d.root) st.f = ''; st.reset = 1; }
        if (a === 'rdme') {
          var ov = ev && ev.target.closest('.ac-ov'), x = ov && ov.querySelector('[data-act="close"]');
          if (x) x.click(); setTimeout(function () { if (MO.routes['#settings']) MO.routes['#settings'](); }, 60);
        }
        if (a === 'view') { D.last = { id: d.id, t: Date.now() }; withBlob(d.id, viewer); }
        if (a === 'dl') withBlob(d.id, download);
        if (a === 'upload') {
          var fs = Array.prototype.slice.call(t.files || []); t.value = ''; if (!fs.length) return;
          if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
          MO.msg('Mengunggah…', fs.length + ' berkas');
          Promise.all(fs.map(function (f) {
            var id = K.uid(), m = { id: id, name: f.name, size: f.size, type: f.type || '', folderId: st.f || '', added: new Date().toISOString(), notes: '', tags: '', idx: '' };
            return put(id, f).then(function () {
              if ((/^text\//.test(f.type) || /\.(txt|md|csv|json)$/i.test(f.name)) && f.size < 2e6) return f.text().then(function (x) { m.idx = x.slice(0, 20000); return m; });
              return m;
            });
          })).then(function (ms) { ms.forEach(function (m) { D.file.push(m); }); app.save(); app.render(); MO.msg('Selesai', ms.length + ' dokumen tersimpan'); })
            .catch(function () { MO.msg('Gagal mengunggah', 'Penyimpanan browser penuh atau diblokir.'); });
        }
        if (a === 'delfile') { var f = by(D.file, d.id); if (f && confirm('Hapus "' + f.name + '" dari Document Center?')) { rmb(f.id); dropThumb(f.id); if (D.last && D.last.id === f.id) D.last = null; D.file = D.file.filter(function (x) { return x.id !== f.id; }); } }
        if (a === 'delfolder') {
          var ids = kids(d.id), fl = D.file.filter(function (x) { return ids.indexOf(x.folderId) > -1; });
          if (confirm('Hapus folder ini beserta ' + (ids.length - 1) + ' subfolder dan ' + fl.length + ' dokumen di dalamnya?')) {
            fl.forEach(function (x) { rmb(x.id); dropThumb(x.id); if (D.last && D.last.id === x.id) D.last = null; }); D.file = D.file.filter(function (x) { return ids.indexOf(x.folderId) < 0; }); D.folder = D.folder.filter(function (x) { return ids.indexOf(x.id) < 0; });
            if (ids.indexOf(st.f) > -1) st.f = '';
          }
        }
      },
      validate: function (e, r) { if (e === 'folder' && r.parentId && r.id && kids(r.id).indexOf(r.parentId) > -1) return 'Folder tidak bisa dipindahkan ke dalam dirinya sendiri.'; }
    };
  });
  MO.routes['#documents'] = docs.open;
})();
;
/* MyOffice — Analytics. Membaca data semua modul (hanya baca) dan menyusun grafik + analisis berbasis aturan. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, rp = K.rp, stat = K.stat, empty = K.empty, by = K.by, btns = K.btns, add = K.add, bar = K.bar;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var sum = function (a, f) { return a.reduce(function (s, x) { return s + (+f(x) || 0); }, 0); };
  var n1 = function (n) { return String(Math.round(n * 10) / 10); };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var addM = function (ym, n) { var d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };
  var mlab = function (ym) { return new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'short' }); };
  var addD = function (s, n) { return new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); };
  var cut = function (v, n) { return String(v || '').slice(0, n); };
  var short = function (v) { var a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1e6 ? n1(a / 1e6) + 'jt' : a >= 1e3 ? Math.round(a / 1e3) + 'rb' : Math.round(a)); };

  /* kolom grafik: labels, a (utama), b (opsional); fmt untuk label nilai */
  function vb(labels, a, b, f) {
    var mx = Math.max.apply(null, a.concat(b || [], [0.0001]));
    return '<div class="vb">' + labels.map(function (l, i) { return '<div><span>' + (f ? f(a[i]) : n1(a[i])) + '</span><div class="bs"><i style="height:' + a[i] / mx * 100 + '%"></i>' + (b ? '<i class="alt" style="height:' + b[i] / mx * 100 + '%"></i>' : '') + '</div><span>' + esc(l) + '</span></div>'; }).join('') + '</div>';
  }
  function hb(rows, f) {
    if (!rows.length) return '<p class="ac-hint">Belum ada data.</p>';
    var mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([0.0001]));
    return '<div class="ac-bars">' + rows.map(function (r) { return '<div class="ac-bar2"><span>' + esc(r[0]) + '</span><div class="ac-track"><i style="width:' + r[1] / mx * 100 + '%"></i></div><span>' + (f ? f(r[1]) : n1(r[1])) + '</span></div>'; }).join('') + '</div>';
  }
  var LBL = {};
  var H = function (t) { return '<div class="ac-h">' + esc(LBL[t] || t) + '</div>'; };
  var HK = ['Skor kondisi', 'Pengeluaran per kategori', 'Status tugas', 'Angka utama', 'Capaian', 'Pintasan', 'Analisis otomatis', 'Catatan saya', 'IP per semester (batang oranye = target)', 'Nilai akhir mata kuliah aktif', 'Distribusi huruf mutu', 'Status tugas kuliah', 'Waktu belajar per mata kuliah (jam)', 'Arus kas 6 bulan (batang gelap = pemasukan, oranye = pengeluaran)', 'Pemasukan pribadi vs pendapatan pekerjaan (bulan ini)', 'Pengeluaran per kategori (bulan ini)', 'Saldo per akun aktif', 'Progres target tabungan (%)', 'Jam kerja tercatat per pekerjaan', 'Pendapatan pekerjaan menurut status (terpisah dari pemasukan pribadi)', 'Pekerjaan menurut status', 'Progres proyek (tugas/milestone selesai, %)', 'Tindak lanjut rapat organisasi', 'Tugas selesai per minggu (8 minggu terakhir)', 'Task menurut status', 'Tugas aktif per area', 'Goal berjalan menurut horizon'];
  var wrap = function (h) { var p = h.split('<div class="ac-h">'); return p[0] + p.slice(1).map(function (x) { return '<section class="an-sec"><div class="ac-h">' + x + '</section>'; }).join(''); };
  var ART = '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="anG" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#FFE98F"/><stop offset="1" stop-color="#FFB52E"/></radialGradient></defs><rect width="400" height="300" fill="url(#anG)"/><g fill="#FFF6C9" opacity=".75"><rect x="52" y="120" width="34" height="90" rx="17"/><rect x="96" y="90" width="34" height="120" rx="17"/><rect x="270" y="100" width="34" height="110" rx="17"/><rect x="314" y="70" width="34" height="140" rx="17"/></g><circle cx="200" cy="120" r="82" fill="#FFD23F"/><circle cx="168" cy="108" r="11" fill="#3b2a12"/><circle cx="232" cy="108" r="11" fill="#3b2a12"/><circle cx="171" cy="104" r="4" fill="#fff"/><circle cx="235" cy="104" r="4" fill="#fff"/><circle cx="140" cy="140" r="14" fill="#FF8F5A" opacity=".8"/><circle cx="260" cy="140" r="14" fill="#FF8F5A" opacity=".8"/><path d="M178 138q22 30 44 0z" fill="#3b2a12"/></svg>';
  var seed = function () {
    return {
      cfg: { maxWeekHours: 45, ipTarget: 3, overdueMax: 3, spendRise: 20, budgetWarn: 80 }, title: 'Analytics', sub: 'Membaca data dari semua modul · hanya baca', lbl: {}, hid: {},
      theme: { bg1: '#D5D8E4', bg2: '#C3C7D7', a1: '#6C5CE7', a2: '#FF6A1F', ink: '#1E1B4B' },
      hero: [{ id: 'h', title: 'Total saldo', big: 'c2', meta: 'Pengeluaran bulan ini', big2: 'c3', cta: 'Buka analisis keuangan', ctaTab: 'fin', img: '' }],
      card: [
        { id: 'c1', icon: '🎓', title: 'IPK', src: 'ipk', val: '', color: '0', tab: 'acad', note: 'Dihitung dari formula nilai di Academic Management. Aktifkan formula agar angkanya muncul.' },
        { id: 'c2', icon: '💰', title: 'Total saldo', src: 'saldo', val: '', color: '1', tab: 'fin', note: 'Jumlah saldo semua akun aktif di menu Financial.' },
        { id: 'c3', icon: '🧾', title: 'Pengeluaran bulan ini', src: 'spend', val: '', color: '2', tab: 'fin', note: 'Total pengeluaran sejak tanggal 1 bulan ini.' },
        { id: 'c4', icon: '✅', title: 'Tugas aktif', src: 'tasks', val: '', color: '3', tab: 'prod', note: 'Tugas di menu Task yang belum selesai atau diarsipkan.' },
        { id: 'c5', icon: '📚', title: 'Mata kuliah aktif', src: 'courses', val: '', color: '4', tab: 'acad', note: 'Mata kuliah pada semester yang sedang aktif.' },
        { id: 'c6', icon: '🎯', title: 'Goal berjalan', src: 'goals', val: '', color: '0', tab: '', note: 'Goal berstatus Berjalan di menu Goals.' }],
      note: [], chart: []
    };
  };
  var AUTOOPT = [['manual', 'Isi manual'], ['courses', 'Otomatis: mata kuliah aktif'], ['ipk', 'Otomatis: IPK'], ['tasks', 'Otomatis: tugas aktif'], ['saldo', 'Otomatis: total saldo'], ['spend', 'Otomatis: pengeluaran bulan ini'], ['goals', 'Otomatis: goal berjalan']];
  var TABOPT = [['', 'Tidak ada'], ['ins', 'Ringkasan & Analisis'], ['acad', 'Akademik'], ['fin', 'Keuangan'], ['work', 'Kerja & Proyek'], ['prod', 'Produktivitas'], ['mine', 'Grafik Saya'], ['cfg', 'Pengaturan']];
  var COL = [['0', 'Lavender'], ['1', 'Peach'], ['2', 'Mint'], ['3', 'Pink'], ['4', 'Putih']];
  var readImg = function (f, cb) { var r = new FileReader(); r.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .85)); }; im.src = r.result; }; r.readAsDataURL(f); };
  var parseRows = function (t) { var o = []; String(t || '').split('\n').forEach(function (l) { var i = l.lastIndexOf(':'); if (i < 0) return; var n = l.slice(i + 1).split(',').map(parseFloat); if (isNaN(n[0])) return; o.push({ l: l.slice(0, i).trim() || '—', a: n[0], b: isNaN(n[1]) ? null : n[1] }); }); return o; };
  var score = function (I) { var g = 0, f = 0, n = 0; I.forEach(function (x) { if (x[1] === 'Belum cukup data') return; n++; if (x[0] === 'good') g++; else if (x[0] === 'info') f += .5; }); return n ? Math.round((g + f) / n * 100) / 10 : null; };

  var an = K.App('Analytics', 'mo-an-v1', seed, function (app) {
    var D = app.D, st = app.st, S0 = seed(); Object.keys(S0).forEach(function (k) { if (D[k] == null) D[k] = S0[k]; });
    D.cfg = Object.assign({}, S0.cfg, D.cfg); D.theme = Object.assign({}, S0.theme, D.theme); LBL = D.lbl;
    if (D.v !== 2) { D.v = 2; var im = D.hero[0] && D.hero[0].img; D.theme = S0.theme; D.hero = S0.hero; D.hero[0].img = im || ''; }
    var today = K.todayS;

    /* ---------- Akademik: memakai konfigurasi formula yang Anda simpan ---------- */
    function acad() {
      var A = ls('mo-acad-v1'), cfg = A.cfg || {}, ok = !!cfg.confirmed, C = A.course || [], T = A.task || [], X = A.exam || [], has = function (v) { return v !== '' && v != null && !isNaN(+v); };
      var catOf = function (t) { return (cfg.cats || []).some(function (c) { return c.n === t; }) ? t : 'Tugas'; };
      function fs(c) {
        if (has(c.manual)) return +c.manual; if (!ok) return null;
        var it = [], num = 0, den = 0, all = 0;
        T.forEach(function (t) { if (t.courseId === c.id && has(t.score)) it.push({ c: catOf(t.type), s: +t.score, w: +t.weight > 0 ? +t.weight : 1 }); });
        X.forEach(function (e) { if (e.courseId === c.id && has(e.score)) it.push({ c: e.type, s: +e.score, w: +e.weight > 0 ? +e.weight : 1 }); });
        (cfg.cats || []).forEach(function (k) {
          var w = +k.w || 0; all += w; var xs = it.filter(function (i) { return i.c === k.n; }); if (!xs.length || !w) return;
          var sw = 0, ss = 0; xs.forEach(function (i) { sw += i.w; ss += i.s * i.w; }); num += w * ss / sw; den += w;
        });
        return den ? (cfg.normalize ? num / den : num / (all || 100)) : null;
      }
      var lt = function (s) { if (s == null || !ok) return null; return (cfg.scale || []).slice().sort(function (a, b) { return b.min - a.min; }).filter(function (r) { return s >= r.min; })[0] || null; };
      var ip = function (cs) { var a = 0, b = 0; cs.forEach(function (c) { var L = lt(fs(c)), k = +c.sks || 0; if (L && k) { a += L.p * k; b += k; } }); return b ? a / b : null; };
      return { A: A, ok: ok, C: C, T: T, X: X, fs: fs, lt: lt, ip: ip, ipk: ip(C) };
    }
    /* ---------- Keuangan ---------- */
    function fin() {
      var F = ls('mo-fin-v1'), tx = F.tx || [], acc = (F.acc || []).filter(function (a) { return a.active; });
      var bal = function (a) { var b = +a.opening || 0; tx.forEach(function (t) { var x = +t.amount || 0; if (t.accId === a.id) b += t.type === 'Income' ? x : -x; if (t.type === 'Transfer' && t.toAccId === a.id) b += x; }); return b; };
      var m = function (type, ym, f) { return sum(tx.filter(function (t) { return t.type === type && cut(t.date, 7) === ym && (!f || f(t)); }), function (t) { return t.amount; }); };
      return { F: F, tx: tx, acc: acc, bal: bal, m: m, total: sum(acc, bal) };
    }

    /* ---------- Analisis (aturan sederhana, ambang bisa diatur) ---------- */
    function insights() {
      var c = D.cfg, I = [], td = today(), wk0 = addD(td, -6), ym = td.slice(0, 7);
      var W = ls('mo-work-v1'), P = ls('mo-proj-v1'), TK = ls('mo-task-v1'), O = ls('mo-org-v1'), G = ls('mo-goal-v1'), a = acad(), f = fin();
      var workH = sum((W.log || []).filter(function (l) { return l.date >= wk0 && l.date <= td; }), function (l) { return l.hours; });
      var studyH = sum((a.A.study || []).filter(function (s) { return s.date >= wk0 && s.date <= td; }), function (s) { return s.minutes; }) / 60;
      if (workH + studyH > 0) {
        if (workH + studyH > c.maxWeekHours) I.push(['warn', 'Beban kerja dan belajar tinggi', '7 hari terakhir tercatat ' + n1(workH + studyH) + ' jam (kerja ' + n1(workH) + ' + belajar ' + n1(studyH) + '), di atas ambang ' + c.maxWeekHours + ' jam. Sisihkan waktu istirahat dan tunda hal yang tidak mendesak.']);
        else I.push(['good', 'Beban masih terkendali', n1(workH + studyH) + ' jam tercatat dalam 7 hari terakhir (ambang ' + c.maxWeekHours + ' jam).']);
      }
      if (a.ok && a.ipk != null) {
        var low = a.C.map(function (x) { return { n: x.name, L: a.lt(a.fs(x)) }; }).filter(function (x) { return x.L; }).sort(function (p, q) { return p.L.p - q.L.p; }).slice(0, 3);
        if (a.ipk >= c.ipTarget) I.push(['good', 'IPK sesuai target', 'IPK ' + n1(Math.round(a.ipk * 100) / 100) + ' ≥ target ' + c.ipTarget + '. Pertahankan ritme belajar.']);
        else I.push(['warn', 'IPK di bawah target', 'IPK ' + (Math.round(a.ipk * 100) / 100) + ' < target ' + c.ipTarget + '.' + (low.length ? ' Mata kuliah yang perlu dipelajari lagi: ' + low.map(function (x) { return x.n + ' (' + x.L.l + ')'; }).join(', ') + '.' : '')]);
      } else if (!a.ok && a.C.length) I.push(['info', 'Formula nilai belum aktif', 'Aktifkan formula di Academic Management → Formula Nilai agar IP/IPK dan analisis akademik bisa dihitung.']);
      var od = sum((TK.task || []), function (t) { return t.due && t.due < td && t.status !== 'Done' && t.status !== 'Archived' ? 1 : 0; }) + sum(a.T, function (t) { return t.status !== 'Selesai' && t.deadline && cut(t.deadline, 10) < td ? 1 : 0; }) + sum(W.wtask || [], function (t) { return t.status !== 'Selesai' && t.deadline && t.deadline < td ? 1 : 0; }) + sum(O.followup || [], function (t) { return t.status !== 'Selesai' && t.due && t.due < td ? 1 : 0; }) + sum(P.ptask || [], function (t) { return t.status !== 'Selesai' && t.due && t.due < td ? 1 : 0; });
      if (od > c.overdueMax) I.push(['warn', od + ' tugas lewat tenggat', 'Jumlahnya melebihi ambang ' + c.overdueMax + '. Pilih 1–3 yang paling penting, selesaikan, lalu jadwalkan ulang sisanya.']);
      else if (od > 0) I.push(['info', od + ' tugas lewat tenggat', 'Masih dalam batas ' + c.overdueMax + '. Tinjau di Task → Overdue.']);
      var ex = (a.X || []).filter(function (e) { return e.date && cut(e.date, 10) >= td && cut(e.date, 10) <= addD(td, 7); });
      if (ex.length) I.push(['info', ex.length + ' ujian dalam 7 hari', ex.map(function (e) { var cc = a.C.filter(function (x) { return x.id === e.courseId; })[0]; return e.type + ' ' + (cc ? cc.name : ''); }).join(', ') + '. Jadwalkan sesi belajar di Kalender.']);
      if (f.tx.length) {
        var cur = f.m('Expense', ym), prev = f.m('Expense', addM(ym, -1));
        if (prev > 0 && (cur - prev) / prev * 100 > c.spendRise) I.push(['warn', 'Pengeluaran naik ' + Math.round((cur - prev) / prev * 100) + '%', rp(prev) + ' → ' + rp(cur) + ' dibanding bulan lalu (ambang ' + c.spendRise + '%). Periksa kategori terbesar di Financial.']);
        else if (prev > 0 && cur <= prev) I.push(['good', 'Pengeluaran tidak naik', 'Bulan ini ' + rp(cur) + ' vs bulan lalu ' + rp(prev) + '.']);
        f.acc.forEach(function (x) { if (f.bal(x) < 0) I.push(['warn', 'Saldo "' + x.name + '" minus', 'Saldo saat ini ' + rp(f.bal(x)) + '. Periksa transaksi atau lakukan transfer.']); });
        var eb = {}; f.tx.filter(function (t) { return t.type === 'Expense' && cut(t.date, 7) === ym; }).forEach(function (t) { eb[t.catId] = (eb[t.catId] || 0) + (+t.amount || 0); });
        ((f.F.bud || [])).forEach(function (b) {
          var m = b.month || ym; if (m !== ym || !(+b.limit > 0)) return; var p = (eb[b.catId] || 0) / b.limit * 100;
          if (p >= c.budgetWarn) { var ct = (f.F.cat || []).filter(function (x) { return x.id === b.catId; })[0]; I.push([p >= 100 ? 'warn' : 'info', 'Anggaran ' + (ct ? ct.name : '') + ' ' + Math.round(p) + '%', p >= 100 ? 'Sudah melewati batas anggaran bulan ini.' : 'Mendekati batas (ambang ' + c.budgetWarn + '%).']); }
        });
      }
      var rcv = sum((W.job || []).filter(function (j) { return j.incomeStatus === 'Sudah ditagih'; }), function (j) { return j.income; });
      if (rcv > 0) I.push(['info', 'Ada tagihan pekerjaan belum diterima', rp(rcv) + ' berstatus "Sudah ditagih". Pantau pembayarannya.']);
      (G.goal || []).forEach(function (g) {
        if (g.status === 'Tercapai' || g.status === 'Dibatalkan') return;
        if (g.deadline && g.deadline < td) I.push(['warn', 'Goal lewat deadline: ' + g.name, 'Perbarui status, geser deadline, atau evaluasi penyebabnya.']);
        else if (!(G.ms || []).some(function (m) { return m.goalId === g.id; }) && (g.basis || 'ms') === 'ms') I.push(['info', 'Goal belum dipecah: ' + g.name, 'Buat milestone agar progres bisa dilacak.']);
      });
      if (!I.length) I.push(['info', 'Belum cukup data', 'Isi data di modul Academic, Work, Task, Financial, atau Goal. Analisis akan muncul otomatis.']);
      return I;
    }
    function autoVals() {
      var a = acad(), f = fin(), T = ls('mo-task-v1').task || [], ym = today().slice(0, 7), G = ls('mo-goal-v1').goal || [];
      return {
        courses: String(a.C.filter(function (c) { var s = (a.A.sem || []).filter(function (x) { return x.id === c.semId; })[0]; return s && s.active; }).length),
        ipk: a.ok && a.ipk != null ? String(Math.round(a.ipk * 100) / 100) : '—',
        tasks: String(T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length),
        saldo: rp(f.total), spend: rp(f.m('Expense', ym)), goals: String(G.filter(function (g) { return g.status === 'Berjalan'; }).length)
      };
    }
    function look() {
      var T = D.theme, s = document.getElementById('an-theme'); if (!s) { s = document.createElement('style'); s.id = 'an-theme'; document.head.appendChild(s); }
      s.textContent = 'html:root .ac-ov.an-skin:not(.ad-skin){--an-bg1:' + T.bg1 + ';--an-bg2:' + T.bg2 + ';--an-a1:' + T.a1 + ';--an-a2:' + T.a2 + ';--an-ink:' + T.ink + '}';
      var h = document.querySelector('.ac-ov.an-skin:not(.ac-ov2) header h2'); if (h) h.textContent = D.title || 'Analytics';
    }
    var specs = {
      hero: { title: 'Dua Kartu Gradasi', def: {}, fields: [{ k: 'title', l: 'Kartu 1: label', t: 'text', req: 1 }, { k: 'big', l: 'Kartu 1: angka dari kartu', t: 'select', o: function () { return D.card.map(function (c) { return [c.id, c.icon + ' ' + c.title]; }); } }, { k: 'meta', l: 'Kartu 2: label', t: 'text', req: 1 }, { k: 'big2', l: 'Kartu 2: angka dari kartu', t: 'select', o: function () { return D.card.map(function (c) { return [c.id, c.icon + ' ' + c.title]; }); } }, { k: 'cta', l: 'Teks tombol ↗ pada kartu 1', t: 'text', req: 1 }, { k: 'ctaTab', l: 'Tombol ↗ membuka tab', t: 'select', o: TABOPT.slice(1) }] },
      card: { title: 'Kartu Angka', def: { src: 'manual', color: '0', icon: '⭐', tab: '' }, fields: [{ k: 'title', l: 'Judul kartu', t: 'text', req: 1 }, { k: 'icon', l: 'Ikon (emoji)', t: 'text' }, { k: 'src', l: 'Sumber angka', t: 'select', o: AUTOOPT }, { k: 'val', l: 'Angka manual (dipakai bila sumber = Isi manual)', t: 'text' }, { k: 'color', l: 'Warna kartu', t: 'select', o: COL }, { k: 'tab', l: 'Tombol ▶ membuka tab', t: 'select', o: TABOPT }, { k: 'note', l: 'Penjelasan', t: 'textarea', full: 1 }] },
      note: { title: 'Catatan', def: { kind: 'info' }, fields: [{ k: 'title', l: 'Judul', t: 'text', req: 1, full: 1 }, { k: 'text', l: 'Isi catatan', t: 'textarea', full: 1 }, { k: 'kind', l: 'Jenis', t: 'select', o: [['good', 'Positif'], ['warn', 'Perhatian'], ['info', 'Info']] }] },
      chart: { title: 'Grafik', def: { kind: 'hb', unit: '' }, fields: [{ k: 'title', l: 'Judul grafik', t: 'text', req: 1, full: 1 }, { k: 'kind', l: 'Bentuk', t: 'select', o: [['hb', 'Batang mendatar'], ['vb', 'Kolom tegak']] }, { k: 'unit', l: 'Satuan (jam, %, Rp, ...)', t: 'text' }, { k: 'data', l: 'Data: satu baris "Label: nilai" (kolom tegak boleh "Label: nilai, nilai2")', t: 'textarea', full: 1 }] }
    };
    var P5 = ['var(--an-ink)', 'var(--an-a1)', '#B8B2F0', 'var(--an-a2)'], PS = ['#FF9A9A', '#8FD3F4', '#B7E43A', '#FF8FB1', '#FFB347'];
    var gauge = function (p) { var L = Math.PI * 90; return '<svg class="bn-gauge" viewBox="0 0 220 130" aria-hidden="true"><path class="gt" d="M20 110A90 90 0 0 1 200 110"/><path class="gf" d="M20 110A90 90 0 0 1 200 110" style="stroke-dasharray:' + L + ';stroke-dashoffset:' + L * (1 - Math.max(0, Math.min(1, p))) + '"/><text x="20" y="127">0</text><text x="200" y="127" text-anchor="end">100</text></svg>'; };
    var donut = function (parts, big) {
      var C = 2 * Math.PI * 60, tot = sum(parts, function (x) { return x.v; }), acc = 0;
      var arcs = parts.filter(function (x) { return x.v > 0; }).map(function (x) { var l = x.v / tot * C, r = '<circle cx="80" cy="80" r="60" style="stroke:' + x.c + ';stroke-dasharray:' + Math.max(0, l - 3) + ' ' + C + ';stroke-dashoffset:' + (-acc) + '"/>'; acc += l; return r; }).join('');
      return '<div class="bn-donut"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="dt" cx="80" cy="80" r="60"/>' + arcs + '</svg><b>' + big + '</b></div>';
    };
    var spark = function (v) { var mx = Math.max.apply(null, v.concat([1])), pt = v.map(function (x, i) { return [8 + i * 184 / Math.max(1, v.length - 1), 62 - x / mx * 50]; }), e = pt[pt.length - 1]; return '<svg class="bn-spark" viewBox="0 0 200 70" aria-hidden="true"><path d="' + pt.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('') + '"/><circle cx="' + e[0] + '" cy="' + e[1] + '" r="6"/></svg>'; };
    var vIns = function () {
      var q = (st.q || '').toLowerCase(), AV = autoVals(), h0 = D.hero[0] || {}, all = insights(), I = all.filter(function (i) { return !D.hid[i[1]]; }), nh = all.length - I.length, f = fin(), td = today(), ym = td.slice(0, 7);
      var hit = function (x) { return !q || String(x).toLowerCase().indexOf(q) >= 0; }, Tt = function (t) { return esc(LBL[t] || t); }, hd = function (t, x) { return '<h4>' + Tt(t) + (x || '') + '</h4>'; };
      var cv = function (c) { return c ? (c.src && c.src !== 'manual' && AV[c.src] != null ? AV[c.src] : (c.val || '—')) : '—'; };
      var cnt = { good: 0, info: 0, warn: 0 }; all.forEach(function (i) { if (i[1] !== 'Belum cukup data') cnt[i[0]]++; });
      var n = cnt.good + cnt.info + cnt.warn, sc = score(all), pc = function (x) { return n ? Math.round(x / n * 100) : 0; }, mxc = Math.max(cnt.good, cnt.info, cnt.warn, 1);
      var pill = function (l, v, k) { return '<div class="bn-pill"><i class="p' + k + '" style="width:' + Math.max(34, v / mxc * 100) + '%"></i><span>' + l + '</span><em>' + v + '</em></div>'; };
      var gaugeC = '<section class="bn-c">' + hd('Skor kondisi') + '<div class="bn-gw">' + gauge(sc == null ? 0 : sc / 10) + '<div class="bn-gc"><div><b>' + (sc == null ? '—' : Math.round(sc * 10) + '%') + '</b><small><i class="bdot" style="background:var(--an-a1)"></i>Skor</small></div><div><b>' + pc(cnt.warn) + '%</b><small><i class="bdot" style="background:var(--an-a2)"></i>Perhatian</small></div></div></div>' + pill('Positif', cnt.good, 0) + pill('Info', cnt.info, 1) + pill('Perhatian', cnt.warn, 3) + '</section>';
      var ms = []; for (var k = 5; k >= 0; k--) ms.push(addM(ym, -k));
      var ex = ms.map(function (m) { return f.m('Expense', m); }), inc = ms.map(function (m) { return f.m('Income', m); }), mx = Math.max.apply(null, ex.concat([1]));
      var b1 = by(D.card, h0.big) || D.card[0], b2 = by(D.card, h0.big2) || D.card[1] || D.card[0];
      var g1 = '<section class="bn-c bn-g1"' + (h0.img ? ' style="background-image:linear-gradient(135deg,rgba(201,184,247,.8),rgba(255,216,188,.8)),url(' + h0.img + ')"' : '') + '><label class="an-up" title="Ganti foto latar">📷<input type="file" accept="image/*" data-chg="img" hidden></label>' + (h0.img ? '<button class="an-up r" data-act="imgdel" aria-label="Hapus foto latar">✕</button>' : '') + '<button class="bn-ico" data-act="tab" data-t="' + esc(h0.ctaTab || 'fin') + '" title="' + esc(h0.cta) + '" aria-label="' + esc(h0.cta) + '">↗</button><b class="bn-big">' + esc(cv(b1)) + '</b><p>' + esc(h0.title) + '</p><div class="bn-mb" aria-hidden="true">' + ex.slice(1).map(function (x, i) { return '<i style="height:' + Math.max(8, x / mx * 100) + '%;opacity:' + (.45 + i * .14) + '"></i>'; }).join('') + '</div><button class="an-edit" data-act="edit" data-e="hero" data-id="h" aria-label="Edit kartu gradasi">✎</button></section>';
      var T = ls('mo-task-v1').task || [], dn = T.filter(function (t) { return t.status === 'Done'; }).length, lt = T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived' && t.due && t.due < td; }).length, ac = T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length - lt, tt = dn + lt + ac;
      var tc = '<section class="bn-c">' + hd('Status tugas') + donut([{ v: lt, c: '#F2644E' }, { v: ac, c: '#B58BEA' }, { v: dn, c: '#2DB67C' }], tt ? Math.round(dn / tt * 100) + '%' : '—') + '<div class="bn-lg"><span><i style="background:#2DB67C"></i>Selesai ' + dn + '</span><span><i style="background:#B58BEA"></i>Aktif ' + ac + '</span><span><i style="background:#F2644E"></i>Terlambat ' + lt + '</span></div></section>';
      var tabs = [['acad', 'Akademik'], ['fin', 'Keuangan'], ['work', 'Kerja & Proyek'], ['prod', 'Produktivitas'], ['mine', 'Grafik Saya']];
      var pls = '<section class="bn-c">' + hd('Pintasan') + '<div class="bn-pills">' + tabs.map(function (t, i) { return '<button class="bn-pl p' + (i % 4) + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></section>';
      var cn = {}; (f.F.cat || []).forEach(function (c) { cn[c.id] = c.name; }); var eb = {};
      f.tx.filter(function (t) { return t.type === 'Expense' && cut(t.date, 7) === ym; }).forEach(function (t) { var kk = cn[t.catId] || 'Lainnya'; eb[kk] = (eb[kk] || 0) + (+t.amount || 0); });
      var er = Object.keys(eb).map(function (kk) { return [kk, eb[kk]]; }).sort(function (a, b) { return b[1] - a[1]; }), top = er.slice(0, 3), rest = sum(er.slice(3), function (r) { return r[1]; }); if (rest > 0) top.push(['Lainnya', rest]);
      var et = sum(top, function (r) { return r[1]; });
      var dom = '<section class="bn-c">' + hd('Pengeluaran per kategori') + donut(top.map(function (r, i) { return { v: r[1], c: P5[i] }; }), et ? Math.round(top[0][1] / et * 100) + '%' : '—') + '<div class="bn-lg">' + (top.length ? top.map(function (r, i) { return '<span><i style="background:' + P5[i] + '"></i>' + esc(r[0]) + '</span>'; }).join('') : '<span>Belum ada pengeluaran bulan ini</span>') + '</div></section>';
      var gt = st.gt || 'Proyek', rows = [];
      if (gt === 'Proyek') { var PR = ls('mo-proj-v1'); rows = (PR.proj || []).map(function (p) { var ms2 = p.basis === 'ms', a = ms2 ? (PR.ms || []).filter(function (x) { return x.projId === p.id; }) : (PR.ptask || []).filter(function (x) { return x.projId === p.id; }), v = a.length ? a.filter(function (x) { return ms2 ? x.done : x.status === 'Selesai'; }).length / a.length * 100 : 0; return [p.name, v, Math.round(v) + '%']; }); }
      else if (gt === 'Area') { var ar = {}; T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).forEach(function (t) { ar[t.area || '—'] = (ar[t.area || '—'] || 0) + 1; }); rows = Object.keys(ar).map(function (kk) { return [kk, ar[kk], String(ar[kk])]; }); }
      else { var a0 = acad(); rows = a0.C.map(function (c) { return [c.name, a0.fs(c)]; }).filter(function (r) { return r[1] != null; }).map(function (r) { return [r[0], r[1], n1(r[1])]; }); }
      rows = rows.slice(0, 5); var rmx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([0.0001]));
      var gn = '<section class="bn-c">' + hd('Capaian', '<span class="bn-tabs">' + ['Proyek', 'Area', 'Nilai'].map(function (t) { return '<button data-act="gt" data-v="' + t + '" aria-pressed="' + (t === gt) + '">' + t + '</button>'; }).join('') + '</span>') + (rows.length ? rows.map(function (r, i) { return '<div class="bn-gr"><span>' + esc(r[0]) + '</span><div class="bn-gb"><i style="width:' + Math.max(14, r[1] / rmx * 100) + '%;background:' + PS[i % 5] + '">' + esc(r[2]) + '</i></div></div>'; }).join('') : '<p class="ac-hint">Belum ada data untuk ' + gt.toLowerCase() + '.</p>') + '</section>';
      var cards = D.card.filter(function (c) { return hit(c.title + ' ' + c.note); });
      var rec = '<section class="bn-c">' + hd('Angka utama', '<button class="bn-add" data-act="add" data-e="card" aria-label="Tambah kartu angka">+</button>') + (cards.length ? cards.map(function (c) { return '<div class="bn-row"><i class="bn-ic c' + esc(c.color) + '">' + esc(c.icon) + '</i><div><b>' + esc(c.title) + '</b><small>' + esc(cut(c.note, 38)) + '</small></div><strong>' + esc(cv(c)) + '</strong><button class="bn-ed" data-act="edit" data-e="card" data-id="' + c.id + '" aria-label="Edit ' + esc(c.title) + '">✎</button></div>'; }).join('') : '<p class="ac-hint">' + (D.card.length ? 'Tidak ada kartu yang cocok.' : 'Belum ada kartu.') + '</p>') + '</section>';
      var g2 = '<section class="bn-c bn-g2"><button class="bn-ico" data-act="tab" data-t="' + esc(h0.ctaTab || 'fin') + '" aria-label="' + esc(h0.cta) + '">▥</button><b class="bn-big">' + esc(cv(b2)) + '</b><p>' + esc(h0.meta) + '</p>' + spark(inc) + '</section>';
      var ins = I.filter(function (i) { return hit(i[1] + ' ' + i[2]); }).map(function (i) { return '<div class="ins ' + i[0] + '"><b>' + esc(i[1]) + '</b>' + esc(i[2]) + '<button class="an-x" data-act="hid" data-k="' + esc(i[1]) + '">Sembunyikan</button></div>'; }).join('');
      var notes = D.note.filter(function (x) { return hit(x.title + ' ' + x.text); }).map(function (x) { return '<div class="ins ' + esc(x.kind) + ' mine"><b>' + esc(x.title) + '</b>' + esc(x.text) + '<div class="ac-acts" style="margin-top:8px">' + btns('note', x.id) + '</div></div>'; }).join('');
      var wide = '<section class="bn-c bn-wide">' + hd('Analisis otomatis') + '<p class="ac-hint" style="margin-bottom:12px">Analisis memakai aturan sederhana dengan ambang yang bisa Anda ubah di tab Pengaturan. Ini bantuan membaca data, bukan saran profesional.</p>' + (ins || '<p class="ac-hint">Tidak ada analisis yang cocok.</p>') + (nh ? '<button class="an-x" data-act="unhid">Tampilkan ' + nh + ' analisis yang disembunyikan</button>' : '') + hd('Catatan saya') + notes + '<div class="ac-acts">' + add('note', 'Catatan') + '</div></section>';
      return '<div class="an-search"><span aria-hidden="true">🔍</span><input type="search" data-in="q" value="' + esc(st.q || '') + '" placeholder="Cari angka, analisis, atau catatan" aria-label="Cari"></div><div class="bn"><div class="bn-col">' + gaugeC + rec + '</div><div class="bn-col">' + g1 + tc + pls + '</div><div class="bn-col">' + dom + gn + g2 + '</div></div>' + wide;
    };
    var vAcad = function () {
      var a = acad(), S = a.A.sem || [];
      if (!a.C.length) return empty('Belum ada data akademik.');
      var h = a.ok ? '' : '<div class="ac-warn"><span>Formula nilai belum diaktifkan, sehingga IP/IPK tidak dihitung.</span></div>';
      var sr = S.map(function (s) { return { s: s, v: a.ip(a.C.filter(function (c) { return c.semId === s.id; })) }; }).filter(function (x) { return x.v != null; });
      h += H('IP per semester (batang oranye = target)') + (sr.length ? vb(sr.map(function (x) { return x.s.name; }), sr.map(function (x) { return x.v; }), sr.map(function (x) { return +x.s.target || 0; }), function (v) { return n1(Math.round(v * 100) / 100); }) : '<p class="ac-hint">Belum ada IP yang bisa dihitung.</p>');
      var act = a.C.filter(function (c) { var s = S.filter(function (x) { return x.id === c.semId; })[0]; return s && s.active; });
      h += H('Nilai akhir mata kuliah aktif') + hb(act.map(function (c) { return [c.name, a.fs(c)]; }).filter(function (r) { return r[1] != null; }), n1);
      var dist = {}; a.C.forEach(function (c) { var L = a.lt(a.fs(c)); if (L) dist[L.l] = (dist[L.l] || 0) + 1; });
      h += H('Distribusi huruf mutu') + hb(Object.keys(dist).map(function (k) { return [k, dist[k]]; }), String);
      var st = {}; (a.T).forEach(function (t) { st[t.status] = (st[t.status] || 0) + 1; });
      h += H('Status tugas kuliah') + hb(Object.keys(st).map(function (k) { return [k, st[k]]; }), String);
      var sd = {}; (a.A.study || []).forEach(function (s) { var c = a.C.filter(function (x) { return x.id === s.courseId; })[0]; if (c) sd[c.name] = (sd[c.name] || 0) + (+s.minutes || 0); });
      h += H('Waktu belajar per mata kuliah (jam)') + hb(Object.keys(sd).map(function (k) { return [k, sd[k] / 60]; }), n1);
      return wrap(h);
    };
    var vFin = function () {
      var f = fin(), ym = today().slice(0, 7);
      if (!f.tx.length && !f.acc.length) return empty('Belum ada data keuangan.');
      var ms = []; for (var i = 5; i >= 0; i--) ms.push(addM(ym, -i));
      var h = H('Arus kas 6 bulan (batang gelap = pemasukan, oranye = pengeluaran)') + vb(ms.map(mlab), ms.map(function (m) { return f.m('Income', m); }), ms.map(function (m) { return f.m('Expense', m); }), short);
      h += H('Pemasukan pribadi vs pendapatan pekerjaan (bulan ini)') + hb([['Pemasukan pribadi', f.m('Income', ym, function (t) { return t.scope !== 'Pekerjaan'; })], ['Pendapatan pekerjaan', f.m('Income', ym, function (t) { return t.scope === 'Pekerjaan'; })]], rp);
      var eb = {}, cn = {}; (f.F.cat || []).forEach(function (c) { cn[c.id] = c.name; });
      f.tx.filter(function (t) { return t.type === 'Expense' && cut(t.date, 7) === ym; }).forEach(function (t) { eb[cn[t.catId] || '—'] = (eb[cn[t.catId] || '—'] || 0) + (+t.amount || 0); });
      h += H('Pengeluaran per kategori (bulan ini)') + hb(Object.keys(eb).map(function (k) { return [k, eb[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), rp);
      h += H('Saldo per akun aktif') + hb(f.acc.map(function (x) { return [x.name, Math.max(0, f.bal(x))]; }), rp);
      var gs = (f.F.goal || []).filter(function (g) { return g.status === 'Aktif'; });
      h += H('Progres target tabungan (%)') + hb(gs.map(function (g) { var c = sum((f.F.con || []).filter(function (x) { return x.goalId === g.id; }), function (x) { return x.amount; }); return [g.name, Math.min(100, c / (+g.target || 1) * 100)]; }), function (v) { return Math.round(v) + '%'; });
      return wrap(h);
    };
    var vWork = function () {
      var W = ls('mo-work-v1'), P = ls('mo-proj-v1'), O = ls('mo-org-v1');
      if (!(W.job || []).length && !(P.proj || []).length && !(O.org || []).length) return empty('Belum ada data pekerjaan, proyek, atau organisasi.');
      var h = H('Jam kerja tercatat per pekerjaan');
      h += hb((W.job || []).map(function (j) { return [j.title, sum((W.log || []).filter(function (l) { return l.jobId === j.id; }), function (l) { return l.hours; })]; }).filter(function (r) { return r[1] > 0; }), n1);
      var inc = {}; (W.job || []).forEach(function (j) { if (+j.income > 0 && j.incomeStatus !== 'Tidak relevan') inc[j.incomeStatus] = (inc[j.incomeStatus] || 0) + +j.income; });
      h += H('Pendapatan pekerjaan menurut status (terpisah dari pemasukan pribadi)') + hb(Object.keys(inc).map(function (k) { return [k, inc[k]]; }), rp);
      var st = {}; (W.job || []).forEach(function (j) { st[j.status] = (st[j.status] || 0) + 1; });
      h += H('Pekerjaan menurut status') + hb(Object.keys(st).map(function (k) { return [k, st[k]]; }), String);
      h += H('Progres proyek (tugas/milestone selesai, %)') + hb((P.proj || []).map(function (p) { var ms = p.basis === 'ms', a = ms ? (P.ms || []).filter(function (x) { return x.projId === p.id; }) : (P.ptask || []).filter(function (x) { return x.projId === p.id; }); return [p.name, a.length ? a.filter(function (x) { return ms ? x.done : x.status === 'Selesai'; }).length / a.length * 100 : 0]; }), function (v) { return Math.round(v) + '%'; });
      var fu = O.followup || []; h += H('Tindak lanjut rapat organisasi') + hb(['Belum', 'Berjalan', 'Selesai'].map(function (s) { return [s, fu.filter(function (x) { return x.status === s; }).length]; }), String);
      return wrap(h);
    };
    var vProd = function () {
      var T = (ls('mo-task-v1').task || []), td = today(), ws = [], i;
      for (i = 7; i >= 0; i--) ws.push(addD(td, -7 * i));
      var h = H('Tugas selesai per minggu (8 minggu terakhir)') + vb(ws.map(function (w) { return w.slice(5); }), ws.map(function (w) { return T.filter(function (t) { return t.status === 'Done' && t.doneAt >= w && t.doneAt < addD(w, 7); }).length; }), null, String);
      var st = {}; T.forEach(function (t) { st[t.status] = (st[t.status] || 0) + 1; });
      h += H('Task menurut status') + hb(Object.keys(st).map(function (k) { return [k, st[k]]; }), String);
      var ar = {}; T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).forEach(function (t) { ar[t.area || '—'] = (ar[t.area || '—'] || 0) + 1; });
      h += H('Tugas aktif per area') + hb(Object.keys(ar).map(function (k) { return [k, ar[k]]; }), String);
      var G = ls('mo-goal-v1'), gs = (G.goal || []).filter(function (g) { return g.status !== 'Dibatalkan'; });
      h += H('Goal berjalan menurut horizon') + hb(['Harian', 'Mingguan', 'Bulanan', 'Semesteran', 'Tahunan', 'Jangka panjang'].map(function (z) { return [z, gs.filter(function (g) { return g.horizon === z; }).length]; }).filter(function (r) { return r[1] > 0; }), String);
      var E = (ls('mo-cal-v1').ev || []).filter(function (e) { return !e.allDay && e.start >= addD(td, -6) && e.start <= td && e.endTime; });
      var hrs = sum(E, function (e) { var s = e.startTime.split(':'), t = e.endTime.split(':'); return ((+t[0] * 60 + +t[1]) - (+s[0] * 60 + +s[1])) / 60; });
      return wrap(h) + '<p class="ac-hint" style="margin-top:12px">Jam acara terjadwal 7 hari terakhir (yang punya jam selesai): <b>' + n1(hrs) + ' jam</b>.</p>';
    };
    var vMine = function () {
      var h = bar('Buat grafik sendiri dari data yang Anda ketik. Satu baris = satu batang, formatnya “Label: nilai”.', add('chart', 'Grafik'));
      if (!D.chart.length) return h + empty('Belum ada grafik. Tekan “+ Grafik” untuk membuat yang pertama.');
      return h + D.chart.map(function (c) {
        var r = parseRows(c.data), f = c.unit === 'Rp' ? rp : function (v) { return n1(v) + (c.unit ? ' ' + c.unit : ''); }, two = r.some(function (x) { return x.b != null; });
        var g = !r.length ? '<p class="ac-hint">Data belum valid. Tulis satu baris per batang, contoh “Senin: 5”.</p>' : c.kind === 'vb' ? vb(r.map(function (x) { return x.l; }), r.map(function (x) { return x.a; }), two ? r.map(function (x) { return x.b || 0; }) : null, f) : hb(r.map(function (x) { return [x.l, x.a]; }), f);
        return '<section class="an-sec"><div class="ac-row"><div class="ac-h">' + esc(c.title) + '</div>' + btns('chart', c.id) + '</div>' + g + '</section>';
      }).join('');
    };
    var vCfg = function () {
      var T = D.theme, cols = [['bg1', 'Warna latar atas'], ['bg2', 'Warna latar bawah'], ['a1', 'Tombol: warna awal'], ['a2', 'Tombol & aksen: warna akhir'], ['ink', 'Warna teks']];
      var rows = [['maxWeekHours', 'Ambang jam kerja + belajar per minggu', 'jam'], ['ipTarget', 'Target IPK untuk analisis', 'skala 4'], ['overdueMax', 'Batas tugas terlambat sebelum diberi peringatan', 'tugas'], ['spendRise', 'Kenaikan pengeluaran yang dianggap tinggi', '%'], ['budgetWarn', 'Peringatan anggaran mulai dari', '%']];
      var tx = function (l, k, v) { return '<div class="cfgrow w"><label>' + l + '</label><input type="text" value="' + esc(v) + '" data-chg="txt" data-k="' + k + '"></div>'; };
      return '<section class="an-sec"><div class="ac-h">Warna tema</div>' + cols.map(function (c) { return '<div class="cfgrow"><label>' + c[1] + '</label><input type="color" value="' + esc(T[c[0]]) + '" data-chg="theme" data-k="' + c[0] + '"></div>'; }).join('') + '<div class="ac-acts" style="margin-top:10px"><button class="ac-btn sm" data-act="themereset">Kembalikan warna bawaan</button></div></section>' +
        '<section class="an-sec"><div class="ac-h">Judul jendela</div>' + tx('Judul', 'title', D.title) + tx('Keterangan di bawah judul', 'sub', D.sub) + '</section>' +
        '<section class="an-sec"><div class="ac-h">Nama judul grafik &amp; bagian</div><p class="ac-hint" style="margin-bottom:8px">Ubah teks, kosongkan kolom untuk memakai nama bawaan.</p>' + HK.map(function (k) { return '<div class="cfgrow w"><label>' + esc(k) + '</label><input type="text" value="' + esc(LBL[k] || '') + '" placeholder="' + esc(k) + '" data-chg="lbl" data-k="' + esc(k) + '"></div>'; }).join('') + '</section>' +
        '<section class="an-sec"><div class="ac-h">Ambang analisis</div><p class="ac-hint" style="margin-bottom:8px">Ambang ini milik Anda; analisis tidak memakai angka tersembunyi.</p>' + rows.map(function (r) { return '<div class="cfgrow"><label>' + r[1] + '</label><div><input type="number" step="any" min="0" value="' + D.cfg[r[0]] + '" data-chg="cfg" data-k="' + r[0] + '" style="max-width:120px"> <small>' + r[2] + '</small></div></div>'; }).join('') + '</section>' +
        '<div class="ac-acts"><button class="ac-btn danger" data-act="resetall">Kembalikan tampilan Ringkasan ke bawaan</button></div>';
    };
    return {
      skin: 'an-skin', specs: specs, tabs: [['ins', 'Ringkasan & Analisis', vIns], ['acad', 'Akademik', vAcad], ['fin', 'Keuangan', vFin], ['work', 'Kerja & Proyek', vWork], ['prod', 'Produktivitas', vProd], ['mine', 'Grafik Saya', vMine], ['cfg', 'Pengaturan', vCfg]],
      sub: function () { look(); return D.sub; },
      act: function (a, d, t) {
        if (a === 'cfg') { var v = parseFloat(d.v); if (!isNaN(v) && v >= 0) D.cfg[d.k] = v; }
        else if (a === 'gt') st.gt = d.v;
        else if (a === 'hid') D.hid[d.k] = 1;
        else if (a === 'unhid') D.hid = {};
        else if (a === 'img') { var f = t && t.files && t.files[0]; if (f) readImg(f, function (u) { D.hero[0].img = u; app.save(); app.render(); }); }
        else if (a === 'imgdel') D.hero[0].img = '';
        else if (a === 'theme') { if (/^#[0-9a-f]{6}$/i.test(d.v)) D.theme[d.k] = d.v; }
        else if (a === 'themereset') D.theme = seed().theme;
        else if (a === 'lbl') { var x = String(d.v).trim(); if (x) LBL[d.k] = x; else delete LBL[d.k]; }
        else if (a === 'txt') { D[d.k] = String(d.v).trim() || seed()[d.k]; }
        else if (a === 'resetall') { if (confirm('Kembalikan hero, kartu angka, warna, dan nama bagian ke bawaan? Catatan dan grafik Anda tidak dihapus.')) { var S = seed(); ['hero', 'card', 'theme', 'hid'].forEach(function (k) { D[k] = S[k]; }); Object.keys(LBL).forEach(function (k) { delete LBL[k]; }); D.title = S.title; D.sub = S.sub; } }
      }
    };
  });
  MO.routes['#analytics'] = an.open;
})();
;
/* MyOffice — Settings: profil, status kegiatan, cadangan data */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, chips = K.chips, badge = K.badge, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var cut = function (v, n) { return String(v || '').slice(0, n); };

  /* Terapkan nama panggilan & foto ke halaman utama */
  function apply() {
    var s = ls('mo-settings-v1'), i = document.querySelector('.avatar i'), h = document.getElementById('hiName');
    if (i) i.style.background = s.photo ? 'url("' + s.photo + '") center/cover no-repeat' : '';
    if (h) h.textContent = 'Assalamu’alaikum,' + (s.nick ? ' ' + s.nick + ',' : '');
  }
  apply();

  var GROUPS = ['Belum berjalan', 'Sedang berjalan', 'Menunggu / ditunda', 'Lewat tenggat', 'Selesai', 'Dibatalkan / arsip'];
  var DONE = /^(Selesai|Done|Tercapai)$/, CANC = /^(Dibatalkan|Archived)$/, RUN = /^(Sedang dikerjakan|In Progress|Berjalan|Dikerjakan|Review)$/, WAIT = /^(Ditunda|Waiting)$/;
  function cls(status, due, td) {
    if (DONE.test(status)) return GROUPS[4]; if (CANC.test(status)) return GROUPS[5];
    if (due && cut(due, 10) < td) return GROUPS[3];
    if (WAIT.test(status)) return GROUPS[2]; if (RUN.test(status)) return GROUPS[1]; return GROUPS[0];
  }
  function gather() {
    var td = K.todayS(), out = [], A = ls('mo-acad-v1'), W = ls('mo-work-v1'), O = ls('mo-org-v1'), P = ls('mo-proj-v1'), T = ls('mo-task-v1'), G = ls('mo-goal-v1');
    var put = function (mod, route, title, status, due) { out.push({ mod: mod, route: route, title: title, status: status, due: due, g: cls(status, due, td) }); };
    (T.task || []).forEach(function (t) { put('Task', '#task', t.title, t.status, t.due); });
    (A.task || []).forEach(function (t) { put('Tugas kuliah', '#academic', t.title, t.status, t.deadline); });
    (A.exam || []).forEach(function (e) {
      var c = (A.course || []).filter(function (x) { return x.id === e.courseId; })[0], d = cut(e.date, 10);
      put('Ujian', '#academic', e.type + (c ? ' — ' + c.name : ''), (d && d < td) || (e.score !== '' && e.score != null) ? 'Selesai' : 'Belum', d && d >= td ? '' : '');
    });
    (W.job || []).forEach(function (j) { put('Pekerjaan', '#work', j.title, j.status, j.deadline); });
    (W.wtask || []).forEach(function (t) { put('Tugas kerja', '#work', t.title, t.status, t.deadline); });
    (O.followup || []).forEach(function (f) { put('Organisasi', '#organization', f.task, f.status === 'Belum' ? 'Belum' : f.status, f.due); });
    (P.proj || []).forEach(function (p) { put('Proyek', '#project', p.name, p.status, p.target); });
    (P.ptask || []).forEach(function (t) { put('Tugas proyek', '#project', t.title, t.status, t.due); });
    (G.goal || []).forEach(function (g) { put('Goal', '#goal', g.name, g.status, g.deadline); });
    return out;
  }

  var set = K.App('Settings', 'mo-settings-v1', function () { return { nick: '', photo: '' }; }, function (app) {
    var D = app.D, st = app.st;
    function vProf() {
      var nm = D.nick || 'Pengguna';
      return '<div class="ac-card"><div class="pv"><div class="ph" style="' + (D.photo ? 'background-image:url(&quot;' + D.photo + '&quot;)' : '') + '"></div><div><h3 style="font-size:18px">' + esc(nm) + '</h3><small style="opacity:.7">Sapaan di beranda: Assalamu’alaikum, ' + esc(D.nick || '…') + ',</small></div></div>' +
        '<div class="cfgrow"><label>Nama panggilan</label><div style="display:flex;gap:8px"><input type="text" maxlength="30" value="' + esc(D.nick) + '" placeholder="Nama panggilan" aria-label="Nama panggilan"><button class="ac-btn pri" data-act="savenick">Simpan</button></div></div>' +
        '<div class="cfgrow"><label>Foto profil</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="ac-btn" style="cursor:pointer;display:inline-block">Pilih foto<input type="file" accept="image/*" hidden data-chg="photo"></label>' + (D.photo ? '<button class="ac-btn danger" data-act="rmphoto">Hapus foto</button>' : '') + '</div></div>' +
        '<p class="ac-hint">Foto dipotong persegi dan dikecilkan, disimpan hanya di browser ini.</p></div>';
    }
    function vStat() {
      var all = gather(), g = st.sg || 'Semua', L = all.filter(function (x) { return g === 'Semua' || x.g === g; }).sort(function (a, b) { return (a.due || '9').localeCompare(b.due || '9'); });
      var h = '<p class="ac-hint" style="margin-bottom:10px">Ringkasan kegiatan dari semua modul. Klik item untuk membuka modulnya.</p><div class="ac-chips">' + ['Semua'].concat(GROUPS).map(function (x) { var n = x === 'Semua' ? all.length : all.filter(function (i) { return i.g === x; }).length; return '<button class="ac-chip" aria-pressed="' + (x === g) + '" data-act="filt" data-f="sg" data-v="' + x + '">' + x + ' (' + n + ')</button>'; }).join('') + '</div>';
      if (!L.length) return h + empty('Tidak ada kegiatan pada status ini.');
      return h + L.map(function (x) {
        return '<div class="ac-item"><div><button class="t" data-act="go" data-r="' + x.route + '">' + esc(x.title) + '</button>' + badge(x.mod) + (x.g === GROUPS[3] ? badge('Lewat tenggat', 'late') : '') + '<small>' + esc(x.status) + (x.due ? ' · tenggat ' + fd(cut(x.due, 10)) : '') + '</small></div></div>';
      }).join('');
    }
    function vData() {
      var keys = Object.keys(localStorage).filter(function (k) { return k.indexOf('mo-') === 0 && k !== 'mo-fired'; });
      return '<div class="ac-card"><b>Cadangan data</b><p class="ac-hint" style="margin:4px 0 10px">Semua data tersimpan hanya di browser ini (' + keys.length + ' kelompok data). Buat cadangan agar tidak hilang jika data browser dibersihkan. File di Document Center tidak ikut dicadangkan.</p><div class="ac-acts"><button class="ac-btn pri" data-act="export">Unduh cadangan (.json)</button><label class="ac-btn" style="cursor:pointer;display:inline-block">Pulihkan dari cadangan<input type="file" accept="application/json,.json" hidden data-chg="import"></label></div></div>' +
        '<div class="ac-card"><b>Hapus semua data</b><p class="ac-hint" style="margin:4px 0 10px">Menghapus seluruh data MyOffice di browser ini, termasuk dokumen. Tidak bisa dibatalkan.</p><button class="ac-btn danger" data-act="wipe">Hapus semua data</button></div>';
    }
    return {
      specs: {}, tabs: [['prof', 'Profil', vProf], ['stat', 'Status Kegiatan', vStat], ['data', 'Data & Cadangan', vData]],
      sub: function () { return D.nick ? 'Halo, ' + D.nick : 'Atur profil Anda'; },
      act: function (a, d, t) {
        if (a === 'savenick') { D.nick = t.parentNode.querySelector('input').value.trim().slice(0, 30); app.save(); apply(); }
        if (a === 'rmphoto') { D.photo = ''; app.save(); apply(); }
        if (a === 'go' && MO.routes[d.r]) MO.routes[d.r]();
        if (a === 'photo') {
          var f = t.files && t.files[0]; t.value = ''; if (!f) return;
          var r = new FileReader();
          r.onload = function () {
            var im = new Image();
            im.onload = function () {
              var s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 256;
              c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 256, 256);
              D.photo = c.toDataURL('image/jpeg', 0.85); app.save(); app.render(); apply();
            };
            im.onerror = function () { MO.msg('Gagal', 'File bukan gambar yang valid.'); };
            im.src = r.result;
          };
          r.readAsDataURL(f);
        }
        if (a === 'export') {
          var o = { app: 'MyOffice', exported: new Date().toISOString(), data: {} };
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mo-') === 0 && k !== 'mo-fired') o.data[k] = localStorage.getItem(k); });
          var u = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })), l = document.createElement('a');
          l.href = u; l.download = 'myoffice-cadangan-' + K.todayS() + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
        }
        if (a === 'import') {
          var fl = t.files && t.files[0]; t.value = ''; if (!fl) return;
          fl.text().then(function (x) {
            var o = JSON.parse(x); if (!o || o.app !== 'MyOffice' || !o.data) throw 0;
            if (!confirm('Pulihkan ' + Object.keys(o.data).length + ' kelompok data? Data saat ini akan ditimpa.')) return;
            Object.keys(o.data).forEach(function (k) { if (k.indexOf('mo-') === 0) localStorage.setItem(k, o.data[k]); });
            location.reload();
          }).catch(function () { MO.msg('Gagal', 'Berkas cadangan tidak valid.'); });
        }
        if (a === 'wipe' && confirm('Hapus SEMUA data MyOffice di browser ini?') && confirm('Yakin? Tindakan ini tidak bisa dibatalkan.')) {
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mo-') === 0) localStorage.removeItem(k); });
          try { indexedDB.deleteDatabase('mo-docs'); } catch (e) { }
          location.reload();
        }
      }
    };
  });
  MO.routes['#settings'] = set.open;
})();
;
/* =====================================================================
   MyOffice — PREMIUM UI layer (JS)
   Menghias jendela menu yang dibuat modul lain: warna identitas, ikon,
   sidebar, indikator tab yang bergeser, animasi buka dari ikon menu,
   dan hitung-naik angka statistik. Tidak mengubah data/logika modul.
   ===================================================================== */
(function () {
  'use strict';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var svg = function (p, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };

  /* ---------- Identitas tiap menu ---------- */
  var MODS = [
    { k: 'academic', m: /academic/, sym: 'i-academic', a: '#5b7cff', b: '#8b5cf6' },
    { k: 'work', m: /work/, sym: 'i-work', a: '#0ea5a4', b: '#3b82f6' },
    { k: 'org', m: /organi/, sym: 'i-org', a: '#a855f7', b: '#ec4899' },
    { k: 'project', m: /project/, sym: 'i-project', a: '#f97316', b: '#ef4444' },
    { k: 'task', m: /task/, sym: 'i-task', a: '#3b82f6', b: '#06b6d4' },
    { k: 'cal', m: /kalender|calendar/, sym: 'i-cal', a: '#ec4899', b: '#f97316' },
    { k: 'fin', m: /financ|keuangan/, sym: 'i-fin', a: '#10b981', b: '#0ea5e9' },
    { k: 'goal', m: /goal/, sym: 'i-goal', a: '#f43f5e', b: '#f59e0b' },
    { k: 'doc', m: /document/, sym: 'i-doc', a: '#a8642b', b: '#c78a4c' },
    { k: 'ana', m: /analytic/, sym: 'i-chart', a: '#06b6d4', b: '#6366f1' },
    { k: 'set', m: /setting/, sym: 'i-set', a: '#64748b', b: '#6366f1' }
  ];
  var DEF = { k: 'x', sym: 'i-project', a: '#5b7cff', b: '#8b5cf6' };
  function modOf(label) {
    label = (label || '').toLowerCase();
    for (var i = 0; i < MODS.length; i++) if (MODS[i].m.test(label)) return MODS[i];
    return DEF;
  }

  /* ---------- Ikon tab ---------- */
  var I = {
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    check: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>',
    done: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    pen: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6l-4 1 1-4z"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    bank: '<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3 3 8h18z"/>',
    swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".6" fill="currentColor"/>',
    goal: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    next: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    layers: '<path d="m12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8z"/><path d="m22 17.7-9.2 4.1a2 2 0 0 1-1.6 0L2 17.7M22 12.7l-9.2 4.1a2 2 0 0 1-1.6 0L2 12.7"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    dot: '<circle cx="12" cy="12" r="3.2"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  var TI = [
    [/analisis|analitik|analytics/, 'chart'], [/semester|kalender|calendar/, 'cal'], [/mata kuliah/, 'book'], [/ujian/, 'pen'],
    [/formula|pengaturan|ambang/, 'sliders'], [/klien/, 'users'], [/jam kerja/, 'clock'], [/pekerjaan/, 'briefcase'],
    [/dokumen/, 'folder'], [/pendapatan/, 'coins'], [/profil/, 'user'], [/rapat/, 'msg'], [/anggaran/, 'pie'],
    [/ringkasan|overview/, 'dash'], [/akun/, 'bank'], [/transaksi/, 'swap'], [/kategori/, 'tag'], [/tabungan/, 'goal'],
    [/my day/, 'sun'], [/upcoming/, 'next'], [/overdue/, 'alert'], [/all tasks/, 'list'], [/by project/, 'layers'],
    [/by area/, 'grid'], [/completed|selesai/, 'done'], [/tugas|task/, 'check'], [/status/, 'flag'], [/data|cadangan/, 'db'],
    [/keuangan/, 'coins'], [/akademik/, 'book'], [/kerja/, 'briefcase'], [/produktivitas/, 'trend']
  ];
  function tabIcon(label) {
    label = (label || '').toLowerCase();
    for (var i = 0; i < TI.length; i++) if (TI[i][0].test(label)) return I[TI[i][1]];
    return I.dot;
  }

  /* ---------- Dekorasi jendela ---------- */
  function fixClose(ov) {
    Array.prototype.forEach.call(ov.querySelectorAll('.ac-x'), function (b) {
      if (b.textContent.trim() === '×') b.innerHTML = svg(I.x, 2);
    });
  }
  function inherit(ov) {
    var src = document.querySelector('.ac-ov[data-mod]:not(.ac-ov2):not([hidden])');
    if (!src) return;
    ov.dataset.mod = src.dataset.mod;
    ov.style.setProperty('--ac', src.style.getPropertyValue('--ac'));
    ov.style.setProperty('--ac2', src.style.getPropertyValue('--ac2'));
  }
  function decorate(ov) {
    if (ov.__pm) return; ov.__pm = 1;
    var win = ov.querySelector('.ac-win'); if (!win) return;
    if (ov.classList.contains('ac-ov2')) { inherit(ov); fixClose(ov); return; }

    var m = modOf(win.getAttribute('aria-label'));
    ov.dataset.mod = m.k;
    ov.style.setProperty('--ac', m.a); ov.style.setProperty('--ac2', m.b);

    var hd = win.querySelector(':scope > header');
    if (hd) hd.insertAdjacentHTML('afterbegin', '<span class="ac-ico">' + svg('<use href="#' + m.sym + '"/>', 1.6) + '</span>');
    fixClose(ov);

    var nav = win.querySelector(':scope > .ac-tabs');
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll('.ac-tab'), function (b) {
        b.insertAdjacentHTML('afterbegin', svg(tabIcon(b.textContent), 1.7).replace('<svg ', '<svg class="ac-ti" '));
      });
      nav.insertAdjacentHTML('afterbegin', '<div class="ac-brand"><span class="ac-bd"></span><div><b>MyOffice</b><small>Plan · Execute · Achieve</small></div></div><i class="ac-ind"></i>');
      nav.insertAdjacentHTML('beforeend', '<div class="ac-side-foot"><kbd>Esc</kbd><span>untuk menutup</span></div>');
      new MutationObserver(function () { place(ov); }).observe(nav, { attributes: true, attributeFilter: ['aria-selected'], subtree: true });
    }
  }

  /* ---------- Indikator tab ---------- */
  function place(ov) {
    var nav = ov.querySelector('.ac-win > .ac-tabs'); if (!nav) return;
    var ind = nav.querySelector('.ac-ind'), s = nav.querySelector('.ac-tab[aria-selected="true"]');
    if (!ind || !s || !s.offsetWidth) return;
    ind.style.width = s.offsetWidth + 'px'; ind.style.height = s.offsetHeight + 'px';
    ind.style.transform = 'translate(' + s.offsetLeft + 'px,' + s.offsetTop + 'px)';
    if (!ind.__init) { ind.__init = 1; requestAnimationFrame(function () { requestAnimationFrame(function () { ind.classList.add('on'); }); }); }
    if (getComputedStyle(nav).flexDirection === 'row') {
      var l = Math.max(0, s.offsetLeft - (nav.clientWidth - s.offsetWidth) / 2);
      if (nav.scrollTo) nav.scrollTo({ left: l, behavior: reduce || !ind.__init ? 'auto' : 'smooth' }); else nav.scrollLeft = l;
    }
  }

  /* ---------- Hitung-naik angka statistik ---------- */
  function countUp(root) {
    if (reduce) return;
    Array.prototype.forEach.call(root.querySelectorAll('.ac-stat b'), function (b) {
      if (b.children.length) return;
      var t = b.textContent.trim(), rp = /^(Rp\s?)(-?[\d.]+)$/.exec(t), pl = /^(-?\d+(?:\.(\d+))?)(%?)$/.exec(t), to, fmt;
      if (rp) { to = +rp[2].replace(/\./g, ''); fmt = function (v) { return rp[1] + Math.round(v).toLocaleString('id-ID'); }; }
      else if (pl) { to = parseFloat(pl[1]); var d = pl[2] ? pl[2].length : 0; fmt = function (v) { return v.toFixed(d) + pl[3]; }; }
      else return;
      if (!isFinite(to) || Math.abs(to) < 2) return;
      var t0 = null, dur = 850;
      (function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        b.textContent = p < 1 ? fmt(to * e) : t;
        if (p < 1 && b.isConnected) requestAnimationFrame(step);
      })(performance.now());
    });
  }
  function enter(ov) {
    var b = ov.querySelector('.ac-body'); if (!b) return;
    b.classList.remove('ac-enter'); void b.offsetWidth; b.classList.add('ac-enter');
    clearTimeout(b.__t); b.__t = setTimeout(function () { b.classList.remove('ac-enter'); }, 1100);
    countUp(b);
  }

  /* ---------- Animasi buka dari ikon menu ---------- */
  var last = null;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.nav a, .avatar');
    if (a) { var r = a.getBoundingClientRect(); last = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: Date.now() }; }
  }, true);

  function launch(ov) {
    var win = ov.querySelector('.ac-win'); if (!win) return;
    var r = win.getBoundingClientRect();
    if (last && Date.now() - last.t < 1500) {
      ov.style.setProperty('--ox', (last.x - r.left) + 'px'); ov.style.setProperty('--oy', (last.y - r.top) + 'px');
    } else { ov.style.removeProperty('--ox'); ov.style.removeProperty('--oy'); }
    ov.classList.remove('ac-launch'); void ov.offsetWidth; ov.classList.add('ac-launch');
    clearTimeout(ov.__lt); ov.__lt = setTimeout(function () { ov.classList.remove('ac-launch'); }, 900);
    enter(ov); place(ov);
  }
  function watch(ov) {
    if (ov.classList.contains('ac-ov2')) return;
    new MutationObserver(function () { if (!ov.hidden) launch(ov); }).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
    /* pindah tab: animasi isi sekali */
    ov.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.ac-tab')) setTimeout(function () { enter(ov); }, 0);
    }, true);
    if (!ov.hidden) launch(ov);
  }
  function adopt(n) {
    if (n.nodeType !== 1 || !n.classList.contains('ac-ov')) return;
    decorate(n); watch(n);
  }

  new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, adopt); });
  }).observe(document.body, { childList: true });
  Array.prototype.forEach.call(document.querySelectorAll('.ac-ov'), adopt);

  var rz; window.addEventListener('resize', function () {
    clearTimeout(rz); rz = setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.ac-ov:not(.ac-ov2):not([hidden])'), place);
    }, 80);
  });
})();
;
(function(){
var D=document,calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* blob: [warna, opasitas, x, y, ukuran, durasi, dx, dy] */
var Wd={
academic:{b:[['#f6c25b',.5,'8%','8%',520,17,150,90],['#9fb8e8',.42,'78%','70%',560,20,-140,-90],['#f1b9a8',.38,'35%','95%',440,18,120,-110]],r:['rgba(246,194,91,.35)',.5],p:[10,'#fff6dc',.7,4,14]},
work:{b:[['#2fb7a6',.3,'18%','12%',620,18,200,80],['#5b6fd6',.24,'50%','100%',640,20,-160,-90]],au:[[ '#2fe0c0','12%',.34,-10],['#5b8cf0','38%',.3,12],['#b58cf0','62%',.26,-14],['#e8c07a','82%',.18,10]],st:[24,'#bfeee8'],sh:2,spot:'rgba(79,195,184,.14)'},
org:{b:[['#8fcfb0',.5,'12%','10%',520,18,140,90],['#f0d58c',.42,'85%','25%',460,20,-130,80],['#b8e0d0',.45,'55%','92%',560,19,100,-100]],r:['rgba(255,255,255,.55)',.45],l:[10,['#6fb58f','#8fcfb0','#e6c36a','#4f9a7a']]},
project:{b:[['#e58a63',.36,'88%','8%',560,18,-140,90],['#f2cf9a',.44,'10%','55%',520,20,130,-60]],au:[['#e9825a','20%',.3,22],['#f2b07a','55%',.28,-20],['#c9667a','80%',.2,24]]},
task:{b:[['#5865f2',.32,'85%','8%',620,19,-160,110],['#a06cf0',.24,'10%','60%',560,21,150,-80]],st:[34,'#dfe4ff'],sh:2,spot:'rgba(140,158,255,.16)',au:[['#6a78ff','30%',.2,8],['#a06cf0','70%',.18,-10]]},
calendar:{b:[['#ffc9a6',.5,'12%','10%',560,17,130,80],['#f5a3b3',.38,'88%','45%',520,20,-130,60]],sun:1,f:[3,'#ffe9d6',.7]},
finance:{b:[['#5eead4',.42,'90%','8%',560,18,-130,80],['#7aa7ff',.34,'8%','70%',560,21,130,-80]],sp:[14,'#a7f3d0'],sheen:1,p:[8,'#a7f3d0',.6,3,8]},
goal:{b:[['#8fdcf0',.5,'15%','8%',560,17,120,80],['#b6ecd2',.38,'55%','100%',560,19,100,-80]],sun:1,r:['rgba(255,236,160,.45)',.4],c:[6,'#fff',.85]},
documents:{b:[['#ffd9a0',.6,'88%','6%',560,18,-110,90,1],['#e8b27a',.3,'10%','80%',520,21,100,-80]],p:[9,'#fff3d6',.75,4,22]},
analytics:{b:[['#b7a8f5',.45,'12%','10%',580,18,150,80],['#f6a99a',.34,'88%','55%',520,20,-130,-60]],w:[['#8a7bf0',.5,'6%',38],['#f08f78',.45,'0%',30],['#6fcfbf',.4,'-4%',46]]},
settings:{b:[['#a9c1d9',.5,'12%','10%',560,20,120,70]],f:[4,'#e9f1f8',.75]}};
function el(c,s,t){var e=D.createElement(t||'div');e.className=c;for(var k in s)e.style.setProperty(k,s[k]);return e}
function r(a,b){return a+Math.random()*(b-a)}
function K(){return D.documentElement.dataset.lite==='1'||matchMedia('(pointer:coarse)').matches?.5:1}
function add(a,n,c,f){n=Math.max(1,Math.round(n*K()));for(var i=0;i<n;i++)a.appendChild(el(c,f(i)))}
function build(n){
  var w=Wd[n],a=el('wx-amb');if(!w)return a;
  w.b.forEach(function(b){var e=el('wx-b'+(b[8]?' wx-breathe':''),{'--c':b[0],'--o':b[1],'--x':b[2],'--y':b[3],'--s':b[4]+'px','--t':b[5]+'s','--dx':b[6]+'px','--dy':b[7]+'px'});a.appendChild(e)});
  if(w.r)a.appendChild(el('wx-r',{'--c':w.r[0],'--o':w.r[1]}));
  if(w.au)w.au.forEach(function(u,i){a.appendChild(el('wx-au',{'--c':u[0],'--x':u[1],'--o':u[2],'--r':u[3]+'deg','--t':r(14,22)+'s','--d':-i*4+'s'}))});
  if(w.w)w.w.forEach(function(u,i){var s=D.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 1600 200');s.setAttribute('preserveAspectRatio','none');s.setAttribute('class','wx-w');
    s.style.cssText='--c:'+u[0]+';--o:'+u[1]+';--y:'+u[2]+';--t:'+(u[3]+i*6)+'s;--d:-'+i*7+'s';
    s.innerHTML='<path d="M0 100 C260 20 540 180 800 100 C1060 20 1340 180 1600 100"/>';a.appendChild(s)});
  if(w.p)add(a,w.p[0],'wx-p',function(){return{'--c':w.p[1],'--o':w.p[2],'--x':r(3,97)+'%','--s':r(w.p[3],w.p[4])*.5+'px','--t':r(14,26)+'s','--d':-r(0,26)+'s','--dx':r(-60,60)+'px'}});
  if(w.st)add(a,w.st[0],'wx-s',function(){return{'--c':w.st[1],'--o':r(.3,.85),'--x':r(2,98)+'%','--y':r(2,98)+'%','--s':r(1.5,3)+'px','--t':r(2.5,6)+'s','--d':-r(0,6)+'s'}});
  if(w.sh)add(a,w.sh,'wx-sh',function(i){return{'--x':r(40,90)+'%','--y':r(4,30)+'%','--t':r(9,15)+'s','--d':-i*5+'s'}});
  if(w.sp)add(a,w.sp[0],'wx-sp',function(){return{'--c':w.sp[1],'--o':r(.5,.95),'--x':r(3,95)+'%','--y':r(5,95)+'%','--s':r(10,22)+'px','--t':r(3,6)+'s','--d':-r(0,6)+'s'}});
  if(w.sheen)a.appendChild(el('wx-sheen'));
  if(w.l)add(a,w.l[0],'wx-l',function(i){return{'--c':w.l[1][i%w.l[1].length],'--o':r(.5,.85),'--x':r(2,96)+'%','--s':r(12,22)+'px','--t':r(12,22)+'s','--d':-r(0,22)+'s','--dx':r(-140,140)+'px','--rot':r(240,600)+'deg'}});
  if(w.c)add(a,w.c[0],'wx-c',function(){return{'--c':w.c[1],'--o':w.c[2]-r(0,.25),'--y':r(4,70)+'%','--s':r(260,520)+'px','--t':r(60,110)+'s','--d':-r(0,100)+'s'}});
  if(w.f)add(a,w.f[0],'wx-f',function(i){return{'--c':w.f[1],'--o':w.f[2]-r(0,.25),'--y':(i*24+r(-6,10))+'%','--s':r(620,980)+'px','--t':r(34,60)+'s','--d':-r(0,40)+'s'}});
  if(w.sun){var d=new Date(),h=d.getHours()+d.getMinutes()/60,night=h<5.5||h>18.5,x=10+Math.max(0,Math.min(1,(h-5.5)/13))*80;
    a.appendChild(el('wx-sun',{'--x':x+'%','--c':night?'#cdd8ff':(h>16.5?'#ffb27a':'#ffd98a'),'--o':night?.45:.7}))}
  if(w.spot)a.appendChild(el('wx-spot',{'--c':w.spot}));
  return a;
}
function world(ov){
  var c=ov.className+'',f=ov.firstElementChild;if(!f||/ac-ov2|ac-form|\bvw\b/.test(c+' '+f.className))return null;
  if(/\bad-ov\b/.test(c))return'academic';if(/\bwo-ov\b/.test(c))return'work';if(/\bes-ov\b/.test(c))return'org';if(/\bfn-ov\b/.test(c))return'finance';
  if(/pj-skin/.test(c))return'project';if(/tk-skin/.test(c))return'task';if(/gq-skin/.test(c))return'goal';if(/rd-skin/.test(c))return'documents';if(/an-skin/.test(c))return'analytics';
  if(!/\bac-ov\b/.test(c))return null;
  return /kalender|calendar/i.test((ov.querySelector('header')||ov).textContent.slice(0,80))?'calendar':'settings';
}
function spot(win){
  var s=win.querySelector('.wx-spot');if(!s||calm||win._sp)return;win._sp=1;var q=0,x=0,y=0;
  win.addEventListener('pointermove',function(e){x=e.clientX;y=e.clientY;if(q)return;q=requestAnimationFrame(function(){q=0;var b=win.getBoundingClientRect();var a=win.querySelector('.wx-spot');if(a){a.style.setProperty('--mx',(x-b.left)+'px');a.style.setProperty('--my',(y-b.top)+'px')}})},{passive:true});
}
/* Jika modul menggambar ulang isi jendela dan latar terhapus, pasang kembali */
function guard(win,n){
  if(win._wg)return;win._wg=1;
  new MutationObserver(function(){if(!win.querySelector(':scope>.wx-amb')){win.appendChild(build(n));spot(win)}}).observe(win,{childList:true});
}
var pend=0;
function scan(){
  pend=0;
  D.querySelectorAll('[class$="-ov"],[class*="-ov "]').forEach(function(ov){
    var vis=!ov.hidden&&getComputedStyle(ov).display!=='none';
    if(!vis){if(ov.classList.contains('wx-live'))ov.classList.remove('wx-live','wx-open');return}
    if(ov.classList.contains('wx-live'))return;
    var n=world(ov);if(!n)return;
    ov.dataset.wx=n;ov.classList.add('wx-live');
    var win=ov.firstElementChild;
    if(!win.querySelector(':scope>.wx-amb')){win.appendChild(build(n));spot(win)}
    guard(win,n);
    if(!calm){ov.classList.add('wx-open');setTimeout(function(){ov.classList.remove('wx-open')},1700)}
  });
}
function sched(){if(!pend){pend=1;requestAnimationFrame(scan)}}
new MutationObserver(sched).observe(D.body,{childList:true});
new MutationObserver(sched).observe(D.body,{attributes:true,attributeFilter:['hidden'],subtree:false,childList:false}); /* hanya anak langsung <body> (overlay); subtree:true memicu pemindaian penuh tiap elemen di dalam menu di-hide/show */
addEventListener('hashchange',sched);
sched();
})();
;
/* =====================================================================
   MyOffice — POLISH (JS ringan, dimuat paling akhir)
   1. Menandai perangkat sentuh  -> CSS mematikan efek berat di HP
   2. Penguncian scroll yang andal (satu sumber kebenaran)
   3. Animasi dijeda saat tab tersembunyi
   4. Tanggal ringkas di layar sempit supaya kartu info tidak patah baris
   5. Latar foto (assets/bg.jpg) hanya dipakai bila file memang ada
   Tidak menyentuh data pengguna.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement, body = document.body;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () { } }; };
  var on = function (m, f) { if (m.addEventListener) m.addEventListener('change', f); else if (m.addListener) m.addListener(f); };

  /* ---------- 1. Sentuh / layar kecil ---------- */
  var coarse = mq('(hover: none) and (pointer: coarse)');
  function flagTouch() { root.classList.toggle('touch', !!coarse.matches); }
  flagTouch(); on(coarse, flagTouch);

  /* ---------- 2. Kunci scroll ----------
     Sebelumnya tiap menu mengatur body.style.overflow sendiri-sendiri; menutup
     satu lapisan membuka kunci walau lapisan lain (form, pencarian) masih ada,
     sehingga halaman di belakangnya bisa tergulir. Di sini kuncinya mengikuti
     kenyataan: terkunci selama ada lapisan yang tampil. */
  var LAYER = /(^|\s)(ac-ov|ad-ov|wo-ov|es-ov|fn-ov|ac-ov2|wo-ov2|es-ov2|ac-soon|sp-ov)(\s|$)/;
  function anyLayer() {
    var c = body.children;
    for (var i = 0; i < c.length; i++) {
      var n = c[i];
      if (n.nodeType !== 1 || n.hidden) continue;
      if (!LAYER.test(n.className || '')) continue;
      if (n.offsetParent === null && getComputedStyle(n).position !== 'fixed') continue;
      if (getComputedStyle(n).display === 'none') continue;
      return true;
    }
    return false;
  }
  var lockQ = 0;
  function syncLock() {
    lockQ = 0;
    var want = anyLayer();
    if (want && body.style.overflow !== 'hidden') body.style.overflow = 'hidden';
    else if (!want && body.style.overflow === 'hidden') body.style.overflow = '';
    root.classList.toggle('win-open', want);
  }
  function schedLock() { if (!lockQ) lockQ = requestAnimationFrame(syncLock); }
  new MutationObserver(schedLock).observe(body, { childList: true, attributes: true, attributeFilter: ['hidden', 'class'], subtree: false });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setTimeout(schedLock, 60); });
  document.addEventListener('click', function () { setTimeout(schedLock, 80); }, true);
  schedLock();

  /* ---------- 3. Tab tersembunyi: jeda animasi CSS ---------- */
  function vis() { root.classList.toggle('is-hidden', document.hidden); }
  document.addEventListener('visibilitychange', vis); vis();

  /* ---------- 4. Tanggal ringkas di layar sempit ---------- */
  var narrow = mq('(max-width: 420px)');
  var masehi = document.getElementById('masehi'), busy = false, full = '';
  function shorten() {
    if (!masehi || busy) return;
    busy = true;
    try {
      if (narrow.matches) {
        var d = new Date();
        var short = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
        if (masehi.textContent !== short) { full = masehi.textContent; masehi.textContent = short; }
      } else if (full && masehi.textContent !== full) {
        masehi.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) { }
    busy = false;
  }
  if (masehi) {
    new MutationObserver(function () { if (!busy) shorten(); }).observe(masehi, { childList: true, characterData: true, subtree: true });
    on(narrow, shorten); shorten();
  }

  /* ---------- 5. Foto latar opsional ----------
     Paket tidak menyertakan assets/bg.jpg. Hanya saat "Danau Senja" dipilih
     file diperiksa; jika ada, dipakai (lewat CSS), jika tidak, ilustrasi SVG
     tetap tampil dan tidak ada permintaan 404 saat halaman dibuka. */
})();
;
/* MyOffice — V6: ringkasan hari ini + lonceng notifikasi. Hanya membaca data, tidak mengubahnya. */
(function () {
  'use strict';
  var D = document, $ = function (i) { return D.getElementById(i); };
  function ls(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function data() {
    var td = today(), T = ls('mo-task-v1').task || [], E = ls('mo-cal-v1').ev || [], G = ls('mo-goal-v1').goal || [];
    var act = T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; });
    var due = act.filter(function (t) { return t.due && String(t.due).slice(0, 10) <= td; });
    var ev = E.filter(function (e) { var s = String(e.start || '').slice(0, 10), z = String(e.end || e.start || '').slice(0, 10); return s && s <= td && z >= td; });
    var goals = G.filter(function (g) { return g.status === 'Berjalan'; });
    return { act: act, due: due, ev: ev, goals: goals, td: td };
  }

  /* ---------- Ringkasan di beranda ---------- */
  var hero = D.querySelector('.hero'), info = D.querySelector('.hero .info');
  var box = D.createElement('div'); box.className = 'today'; box.id = 'today'; box.setAttribute('aria-label', 'Ringkasan hari ini');
  box.innerHTML = [['#task', 'tTask', 'Tugas aktif'], ['#calendar', 'tEv', 'Agenda hari ini'], ['#goal', 'tGoal', 'Goal berjalan']].map(function (c) {
    return '<a class="tchip" href="' + c[0] + '"><b id="' + c[1] + '">0</b><span>' + c[2] + '</span></a>';
  }).join('');
  if (hero && info) info.insertAdjacentElement('afterend', box);
  box.addEventListener('click', function (e) {          // buka lewat router, sama seperti dock
    var a = e.target.closest('a'); if (!a) return; e.preventDefault();
    var r = window.MyOffice && MyOffice.routes && MyOffice.routes[a.getAttribute('href')]; if (r) r();
  });

  /* ---------- Lonceng ---------- */
  var bell = D.querySelector('.tools button[aria-label="Notifikasi"]'), dot = bell && bell.querySelector('.dot');
  var pn = D.createElement('aside'); pn.className = 'notif'; pn.id = 'notif'; pn.setAttribute('aria-label', 'Notifikasi');
  D.body.appendChild(pn);

  function refresh() {
    var d = data();
    $('tTask').textContent = d.act.length; $('tEv').textContent = d.ev.length; $('tGoal').textContent = d.goals.length;
    var n = d.due.length + d.ev.length;
    if (dot) dot.hidden = n === 0;
    if (bell) bell.setAttribute('aria-label', n ? 'Notifikasi (' + n + ')' : 'Notifikasi');
    return d;
  }
  function render() {
    var d = refresh(), h = '';
    d.due.slice(0, 6).forEach(function (t) {
      var late = String(t.due).slice(0, 10) < d.td;
      h += '<li><a href="#task"><span class="nk">✅</span><span class="nt"><b>' + esc(t.title || 'Tugas') + '</b><small>Tugas · tenggat ' + esc(String(t.due).slice(0, 10)) + '</small></span><span class="nw' + (late ? '' : ' ok') + '">' + (late ? 'Terlambat' : 'Hari ini') + '</span></a></li>';
    });
    d.ev.slice(0, 6).forEach(function (e) {
      h += '<li><a href="#calendar"><span class="nk">📅</span><span class="nt"><b>' + esc(e.title || 'Agenda') + '</b><small>Agenda' + (e.startTime ? ' · ' + esc(e.startTime) : '') + '</small></span><span class="nw ok">Hari ini</span></a></li>';
    });
    pn.innerHTML = '<h2>Notifikasi <small>' + (d.due.length + d.ev.length) + ' item</small></h2>' +
      (h ? '<ul>' + h + '</ul>' : '<div class="ne">Semua beres 🎉<br>Tidak ada tugas jatuh tempo atau agenda hari ini.</div>');
  }
  function toggle(o) {
    var open = o === undefined ? !pn.classList.contains('open') : o;
    if (open) { render(); var p = $('panel'); if (p) p.classList.remove('open'); }
    pn.classList.toggle('open', open);
  }
  // fase capture di window: berjalan sebelum handler "Coming soon" milik academic.js
  window.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tools button[aria-label^="Notifikasi"]');
    if (b) { e.stopImmediatePropagation(); e.preventDefault(); toggle(); return; }
    if (pn.classList.contains('open')) {
      var a = e.target.closest && e.target.closest('#notif a');
      if (a) { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); var r = MyOffice.routes && MyOffice.routes[a.getAttribute('href')]; if (r) r(); }
      else if (!pn.contains(e.target)) toggle(false);
    }
  }, true);
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  var th = $('themeBtn'); if (th) th.addEventListener('click', function () { toggle(false); });

  // data berubah saat jendela menu ditutup / tab kembali aktif
  new MutationObserver(function () { if (!D.documentElement.classList.contains('win-open')) refresh(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['class'] });
  D.addEventListener('visibilitychange', function () { if (!D.hidden) refresh(); });
  refresh();
})();
;
/* MyOffice — fx.js: animasi klik universal (tekan + pantul + riak) untuk semua tombol.
   Memakai delegasi event sehingga ikut berlaku pada tombol yang dibuat belakangan oleh render ulang. */
(function () {
  'use strict';
  if (window.__fxClick) return; window.__fxClick = 1;
  var D = document;
  var SEL = 'button,[role=button],[role=tab],a[href],summary,label.ac-chip,.chip,.wall,.es-card,.kc-d,.tk-d,.ad-d,[data-act],[data-a],input[type=checkbox],input[type=radio],input[type=submit],input[type=button]';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)');
  var canWA = typeof Element !== 'undefined' && !!Element.prototype.animate;
  var held = null;

  function target(e) {
    var t = e.target; if (!t || !t.closest) return null;
    var el = t.closest(SEL); if (!el) return null;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('fx-off') || el.closest('.fx-off')) return null;
    return el;
  }
  function depth(el) {
    var r = el.getBoundingClientRect(), m = Math.min(r.width, r.height);
    return m > 160 ? .985 : m > 70 ? .965 : m > 30 ? .93 : .85;
  }
  function ripple(el, x, y) {
    var r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    var cs = getComputedStyle(el), host = D.createElement('div'), dot = D.createElement('i');
    host.className = 'fx-ripple-host'; dot.className = 'fx-ripple';
    host.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border-radius:' + cs.borderRadius + ';color:' + cs.color;
    var cx = x == null ? r.width / 2 : Math.max(0, Math.min(r.width, x - r.left)), cy = y == null ? r.height / 2 : Math.max(0, Math.min(r.height, y - r.top));
    var rad = Math.max(Math.hypot(cx, cy), Math.hypot(r.width - cx, cy), Math.hypot(cx, r.height - cy), Math.hypot(r.width - cx, r.height - cy));
    dot.style.cssText = 'left:' + (cx - rad) + 'px;top:' + (cy - rad) + 'px;width:' + rad * 2 + 'px;height:' + rad * 2 + 'px';
    host.appendChild(dot); D.body.appendChild(host);
    setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 650);
  }
  function press(el) {
    if (!canWA || reduce.matches) return null;
    try { return el.animate([{ scale: '1' }, { scale: String(depth(el)) }], { duration: 110, easing: 'ease-out', fill: 'forwards' }); } catch (e) { return null; }
  }
  function release(el, a) {
    if (!canWA || reduce.matches) return;
    try {
      if (a) a.cancel();
      var d = depth(el);
      el.animate([{ scale: String(d) }, { scale: String(1 + (1 - d) * .55), offset: .55 }, { scale: '1' }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    } catch (e) { }
  }
  function end() { if (held) { var h = held; held = null; release(h.el, h.a); } }

  D.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var el = target(e); if (!el) return;
    if (el.matches('input[type=checkbox],input[type=radio]')) return;
    end(); ripple(el, e.clientX, e.clientY); held = { el: el, a: press(el) };
  }, true);
  ['pointerup', 'pointercancel', 'dragstart', 'contextmenu'].forEach(function (n) { D.addEventListener(n, end, true); });
  addEventListener('blur', end);

  /* keyboard (Enter / Space) → klik tanpa pointer */
  D.addEventListener('click', function (e) {
    if (e.detail !== 0) return;
    var el = target(e); if (!el || el.matches('input[type=checkbox],input[type=radio]')) return;
    ripple(el, null, null); release(el, press(el));
  }, true);

  /* centang / radio / switch */
  D.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.matches || !t.matches('input[type=checkbox],input[type=radio]')) return;
    if (reduce.matches) return;
    t.classList.remove('fx-check'); void t.offsetWidth; t.classList.add('fx-check');
    setTimeout(function () { t.classList.remove('fx-check'); }, 340);
  }, true);
})();
;
/* Latar bintang bergerak untuk bagian paling atas (hero) dan paling bawah (footer).
   Ringan: canvas hanya berjalan saat terlihat, jeda saat tab disembunyikan atau jendela ASTA terbuka. */
(function () {
  "use strict";
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var DPR = Math.min(window.devicePixelRatio || 1, 1.25);
  var TINT = ["255,255,255", "255,255,255", "255,255,255", "248,210,74", "248,210,74", "150,230,205"];

  var SPR = {};
  function sprite(c) {                              /* titik bulat dipra-render sekali per warna */
    if (SPR[c]) return SPR[c];
    var k = document.createElement("canvas"); k.width = k.height = 32;
    var g = k.getContext("2d"); g.fillStyle = "rgb(" + c + ")"; g.beginPath(); g.arc(16, 16, 15, 0, 6.2832); g.fill();
    return (SPR[c] = k);
  }

  function Field(host, density, shoot, cap) {
    var cv = document.createElement("canvas"), cx = cv.getContext("2d");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block";
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.style.isolation = "isolate";
    host.appendChild(cv);
    var W = 0, H = 0, stars = [], star = null, nextShoot = 2 + Math.random() * 3, visible = false, last = 0, raf = 0, acc = 0, t = 0;

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function seed() {
      var n = Math.max(24, Math.min(cap || 150, Math.round(W * H / density)));
      if (document.documentElement.dataset.lite === "1") n = Math.round(n / 2);
      stars = [];
      for (var i = 0; i < n; i++) {
        var z = Math.random();                       /* 0 jauh ... 1 dekat */
        stars.push({
          x: Math.random() * W, y: Math.random() * H, z: z,
          r: 0.55 + z * 1.35, v: 3 + z * 13,
          ph: Math.random() * 6.28, sp: rnd(0.6, 2.2),
          c: TINT[(Math.random() * TINT.length) | 0],
          sparkle: z > 0.86
        });
      }
    }
    function size() {
      var r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cx.setTransform(DPR, 0, 0, DPR, 0, 0); seed(); draw(0);
    }
    function draw(dt) {
      cx.clearRect(0, 0, W, H);
      t += dt;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.v * dt * 0.8; s.y -= s.v * dt * 0.45;      /* melayang pelan ke kanan atas */
        if (s.x > W + 4) s.x = -4; if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
        var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.ph + t * s.sp));
        cx.globalAlpha = a * (0.55 + s.z * 0.45); cx.drawImage(sprite(s.c), s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); cx.globalAlpha = 1;
        if (s.sparkle) {
          var L = 3 + 4 * a; cx.strokeStyle = "rgba(" + s.c + "," + (a * 0.55).toFixed(3) + ")"; cx.lineWidth = 0.8;
          cx.beginPath(); cx.moveTo(s.x - L, s.y); cx.lineTo(s.x + L, s.y); cx.moveTo(s.x, s.y - L); cx.lineTo(s.x, s.y + L); cx.stroke();
        }
      }
      if (shoot && !reduce && document.documentElement.dataset.lite !== "1") {
        if (!star) { nextShoot -= dt; if (nextShoot <= 0) { star = { x: rnd(W * 0.35, W * 1.05), y: rnd(-10, H * 0.35), life: 0, len: rnd(90, 150), sp: rnd(520, 700) }; nextShoot = rnd(5, 9); } }
        else {
          star.life += dt; var d = star.sp * dt; star.x -= d * 0.86; star.y += d * 0.5;
          var f = Math.max(0, 1 - star.life / 1.1), tx = star.x + star.len * 0.86, ty = star.y - star.len * 0.5;
          var g = cx.createLinearGradient(star.x, star.y, tx, ty);
          g.addColorStop(0, "rgba(255,244,190," + (0.95 * f).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,244,190,0)");
          cx.strokeStyle = g; cx.lineWidth = 1.6; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(star.x, star.y); cx.lineTo(tx, ty); cx.stroke();
          if (star.life > 1.1 || star.x < -160 || star.y > H + 160) star = null;
        }
      }
    }
    function paused() { var ai = document.getElementById("ai-app"); return document.hidden || document.documentElement.classList.contains("win-open") || (ai && !ai.hidden); }
    function loop(now) {
      raf = 0; if (!visible) return;
      if (paused()) { last = 0; raf = requestAnimationFrame(loop); return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      acc += dt;
      var fps = document.documentElement.dataset.lite === "1" ? 20 : 30;
      if (acc >= 1 / fps) { draw(acc); acc = 0; }              /* 30 gambar/detik cukup untuk gerak pelan */
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { rootMargin: "80px" }).observe(host);
    } else { visible = true; start(); }
    if ("ResizeObserver" in window) new ResizeObserver(function () { if (Math.abs(host.clientWidth - W) > 1 || Math.abs(host.clientHeight - H) > 1) size(); }).observe(host);
    window.addEventListener("resize", size);
    size();
  }

  /* MyOffice: satu langit bintang di belakang seluruh aplikasi */
  var sky = document.querySelector(".bg .stack");
  if (sky) Field(sky, 6500, true, 240);
})();
;
/* perf.js — penjaga kelancaran: deteksi FPS otomatis, class .touch, dan pemuatan bank soal saat idle. */
(function () {
  'use strict';
  var root = document.documentElement;
  var MO = window.MyOffice = window.MyOffice || {};
  var saved = null; try { saved = localStorage.getItem('mo-lite'); } catch (e) { }

  /* layar sentuh → class .touch (dipakai v6.css) */
  try { if (matchMedia('(pointer:coarse)').matches) root.classList.add('touch'); } catch (e) { }

  /* ---- Probe FPS: ukur ±2 dtk; jika rata-rata frame lambat, otomatis aktifkan mode hemat ---- */
  var probing = false;
  function probe(ms) {
    if (probing || saved !== null || root.dataset.lite === '1' || document.hidden) return;
    probing = true;
    var n = 0, sum = 0, last = 0, t0 = 0;
    (function f(now) {
      if (document.hidden) { probing = false; return; }
      if (!t0) t0 = now;
      if (last) { var d = now - last; if (d < 250) { sum += d; n++; } }   // abaikan lonjakan jeda tab
      last = now;
      if (now - t0 < ms) return requestAnimationFrame(f);
      probing = false;
      if (n > 20 && sum / n > 26 && MO.cosmos && MO.cosmos.setLite) MO.cosmos.setLite(true, false);  // < ±38 fps
    })(0);
  }
  window.addEventListener('load', function () { setTimeout(function () { probe(2200); }, 1200); });
  new MutationObserver(function () {                      // jendela modul baru dibuka → ukur lagi
    if (root.classList.contains('win-open')) setTimeout(function () { probe(1800); }, 700);
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ---- Bank soal (±190 KB) dimuat saat browser menganggur, bukan menghambat tampilan awal ---- */
  var banksLoaded = false;
  MO.loadBanks = function () {
    if (banksLoaded) return; banksLoaded = true;
    var s = document.createElement('script'); s.src = 'banks.js'; s.async = false; document.head.appendChild(s);
  };
  window.addEventListener('load', function () {
    (window.requestIdleCallback || function (f) { return setTimeout(f, 900); })(MO.loadBanks, { timeout: 2500 });
  });
})();
;
/* MyOffice — SOFT UI: beranda baru (sapaan, strip tanggal, agenda) + pewarnaan tiap menu.
   Hanya membaca data dari localStorage; tidak mengubah data atau logika menu. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.dataset.theme = 'pagi'; root.dataset.wall = 'soft';
  var tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', '#eef1f7');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var DAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var addDays = function (d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };
  var sameDay = function (a, b) { return key(a) === key(b); };

  /* ---------- Warna per menu untuk semua jenis jendela ---------- */
  var BY_CLASS = { 'ad-ov': 'academic', 'ex-ov': 'academic', 'wo-ov': 'work', 'es-ov': 'org', 'fn-ov': 'fin', 'sp-ov': 'set' };
  function tag(el) {
    if (!el || el.nodeType !== 1) return;
    var cl = el.classList, k = null;
    if (cl.contains('ac-ov')) k = el.dataset.mod || null;
    else for (var c in BY_CLASS) if (cl.contains(c)) { k = BY_CLASS[c]; break; }
    if (!k && (cl.contains('ac-ov2') || /-ov2?$/.test(String(typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '').split(' ')[0] || ''))) {
      var open = document.querySelector('[data-sf]:not([hidden]):not(.ac-ov2)'); k = open ? open.dataset.sf : null;
    }
    if (k && el.dataset.sf !== k) el.dataset.sf = k;
  }
  function tagAll() { Array.prototype.forEach.call(document.querySelectorAll('.ac-ov,.ad-ov,.wo-ov,.es-ov,.fn-ov,.ex-ov,.sp-ov,.es-ov2,.wo-ov2'), tag); }
  tagAll();
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'childList') Array.prototype.forEach.call(m.addedNodes, function (n) { tag(n); });
      else tag(m.target);
    });
    tagAll();
  }).observe(document.body, { childList: true, attributes: true, attributeFilter: ['data-mod', 'hidden'], subtree: true });

  /* ---------- Beranda ---------- */
  var hero = $('.hero'); if (!hero) return;
  var info = $('.info'), navWrap = $('.nav-wrap'), quote = $('.quote');
  var grid = document.createElement('div'); grid.className = 'sf-grid';
  var phone = document.createElement('section'); phone.className = 'sf-phone'; phone.setAttribute('aria-label', 'Agenda harian');
  var side = document.createElement('div'); side.className = 'sf-side';
  phone.innerHTML =
    '<div class="sf-hello"><div><small>Hello,</small><h1 id="sfName"></h1></div><div class="sf-ava" id="sfAva" role="button" tabindex="0" aria-label="Pengaturan akun"></div></div>' +
    '<p class="sf-quote"></p>' +
    '<div class="sf-days" id="sfDays" role="tablist" aria-label="Pilih tanggal"></div>' +
    '<div class="sf-bar"><button type="button" class="sf-today" id="sfToday">Hari ini</button>' +
    '<div class="sf-arrows"><button type="button" id="sfPrev" aria-label="Minggu sebelumnya"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>' +
    '<button type="button" id="sfNext" aria-label="Minggu berikutnya"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button></div></div>' +
    '<div class="sf-list" id="sfList"></div>';
  $('.sf-quote', phone).textContent = quote ? quote.textContent.replace(/\s+/g, ' ').trim() : '';
  if (info) side.appendChild(info);
  if (navWrap) side.appendChild(navWrap);
  grid.appendChild(phone); grid.appendChild(side); hero.appendChild(grid);

  var fab = document.createElement('button'); fab.type = 'button'; fab.className = 'sf-fab'; fab.setAttribute('aria-label', 'Tambah tugas');
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  document.body.appendChild(fab);
  var go = function (h) { var a = document.querySelector('.nav a[href="' + h + '"]'); if (a) a.click(); else location.hash = h; };
  fab.addEventListener('click', function () { go('#task'); });

  /* nama & foto */
  function nick() {
    var s = ls('mo-settings-v1'); return (s.nick || '').trim() || 'Sobat';
  }
  function paintName() {
    var s = ls('mo-settings-v1'), n = nick(), ava = $('#sfAva');
    $('#sfName').textContent = n;
    if (s.photo) { ava.style.backgroundImage = 'url("' + s.photo + '")'; ava.textContent = ''; }
    else { ava.style.backgroundImage = ''; ava.textContent = n.charAt(0).toUpperCase(); }
  }
  paintName();
  var hi = document.getElementById('hiName');
  if (hi) new MutationObserver(paintName).observe(hi, { childList: true, characterData: true, subtree: true });
  $('#sfAva').addEventListener('click', function () { go('#settings'); });
  $('#sfAva').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('#settings'); } });

  /* ---------- Data agenda ---------- */
  var AREA_ICON = { Akademik: '📚', Pekerjaan: '💼', Organisasi: '🤝', Pribadi: '🌿' };
  var TINTS = [['#dff3ff', '#ffffff'], ['#ffe9d6', '#ffffff'], ['#ffe0e4', '#ffffff'], ['#dff7ec', '#ffffff'], ['#ece4ff', '#ffffff']];
  function iconFor(title, area, kind) {
    var s = (title || '').toLowerCase();
    if (kind === 'ujian' || /ujian|uts|uas|kuis|quiz|sidang/.test(s)) return '✍️';
    if (kind === 'presentasi' || /presentasi|seminar|pitch/.test(s)) return '🎤';
    if (/rapat|meeting|diskusi/.test(s)) return '💬';
    if (/kuliah|kelas|belajar|baca|study/.test(s)) return '📖';
    if (/olahraga|lari|gym/.test(s)) return '🏃';
    if (/bayar|keuangan|uang/.test(s)) return '💳';
    return AREA_ICON[area] || '💡';
  }
  function minutes(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : 9999; }
  function addMin(t, n) { var v = minutes(t) + n; if (v >= 9999) return ''; v = v % 1440; return pad(Math.floor(v / 60)) + ':' + pad(v % 60); }

  function itemsFor(d) {
    var ds = key(d), td = key(new Date()), out = [];
    var T = ls('mo-task-v1'), C = ls('mo-cal-v1');
    (T.task || []).forEach(function (t) {
      if (!t || t.status === 'Archived') return;
      var done = t.status === 'Done', due = (t.due || '').slice(0, 10);
      var late = !done && due && due < td && ds === td;
      if (!(due === ds || late || (done && (t.doneAt || '').slice(0, 10) === ds && !due))) return;
      var time = t.dueTime ? (t.estMin ? t.dueTime + ' – ' + addMin(t.dueTime, +t.estMin) : t.dueTime) : 'Sepanjang hari';
      var tags = [t.area || 'Tugas']; if (late) tags.push('Terlambat'); else if (t.priority && t.priority !== 'Medium') tags.push(t.priority); else if (t.category) tags.push(t.category);
      out.push({ title: t.title || 'Tugas', time: time, tags: tags, done: done, icon: iconFor(t.title, t.area), go: '#task', sort: t.dueTime ? minutes(t.dueTime) : 5000 });
    });
    (C.ev || []).forEach(function (e) {
      if (!e || !e.start) return;
      var s = e.start.slice(0, 10), en = (e.end || e.start).slice(0, 10);
      if (!(s <= ds && ds <= en)) return;
      var cat = (C.cat || []).filter(function (c) { return c.id === e.catId; })[0];
      var time = e.allDay === true || e.allDay === 'true' || !e.startTime ? 'Sepanjang hari' : (e.endTime ? e.startTime + ' – ' + e.endTime : e.startTime);
      var tags = [cat ? cat.name : 'Acara']; if (e.kind && e.kind !== 'biasa') tags.push(e.kind.charAt(0).toUpperCase() + e.kind.slice(1)); else if (e.location) tags.push(e.location);
      out.push({ title: e.title || 'Acara', time: time, tags: tags, done: false, icon: iconFor(e.title, '', e.kind), go: '#calendar', sort: e.startTime ? minutes(e.startTime) : 4000 });
    });
    out.sort(function (a, b) { return a.sort - b.sort; });
    return out;
  }

  /* ---------- Strip tanggal ---------- */
  var today = new Date(), sel = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var start = addDays(sel, -1), lastSig = '';
  function renderDays() {
    var h = '';
    for (var i = 0; i < 7; i++) {
      var d = addDays(start, i), has = itemsFor(d).length > 0;
      h += '<button type="button" role="tab" class="sf-day' + (sameDay(d, sel) ? ' on' : '') + (has ? ' has' : '') + (sameDay(d, new Date()) ? ' now' : '') +
        '" data-d="' + key(d) + '" aria-selected="' + sameDay(d, sel) + '"><b>' + d.getDate() + '</b><span>' + DAY[d.getDay()] + '</span><i></i></button>';
    }
    $('#sfDays').innerHTML = h;
    var isToday = sameDay(sel, new Date());
    $('#sfToday').textContent = isToday ? 'Hari ini' : DAY[sel.getDay()] + ', ' + sel.getDate() + ' ' + MON[sel.getMonth()];
  }
  function renderList() {
    var list = itemsFor(sel), box = $('#sfList'), h = '';
    if (!list.length) {
      var isToday = sameDay(sel, new Date());
      h = '<div class="sf-empty"><span class="sf-ic" style="--c1:#dff3ff">🌤️</span><div><b>' + (isToday ? 'Hari ini masih lapang' : 'Belum ada agenda') + '</b>Tekan tombol + untuk menambah tugas, atau buka menu Calendar untuk membuat acara.</div></div>';
    } else list.slice(0, 8).forEach(function (it, i) {
      var t = TINTS[i % TINTS.length];
      h += '<button type="button" class="sf-card" data-go="' + it.go + '"><span class="sf-ic" style="--c1:' + t[0] + ';--c2:' + t[1] + '">' + it.icon + '</span>' +
        '<span class="sf-tx"><b>' + esc(it.title) + '</b><small>' + esc(it.time) + '</small><span class="sf-tags">' +
        it.tags.slice(0, 2).map(function (x, k) { return '<span class="sf-tag t' + ((i + k) % 5) + '">' + esc(x) + '</span>'; }).join('') + '</span></span>' +
        (it.done ? '<span class="sf-chk"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>' : '') + '</button>';
    });
    box.innerHTML = h;
  }
  function render(force) {
    var sig = key(sel) + '|' + key(start) + '|' + JSON.stringify(ls('mo-task-v1').task || []).length + '|' + JSON.stringify(ls('mo-cal-v1').ev || []).length +
      '|' + (localStorage.getItem('mo-task-v1') || '').length + '|' + (localStorage.getItem('mo-cal-v1') || '').length;
    if (!force && sig === lastSig) return; lastSig = sig; renderDays(); renderList();
  }
  $('#sfDays').addEventListener('click', function (e) {
    var b = e.target.closest('.sf-day'); if (!b) return; var p = b.dataset.d.split('-');
    sel = new Date(+p[0], +p[1] - 1, +p[2]); render(true);
  });
  $('#sfList').addEventListener('click', function (e) { var b = e.target.closest('.sf-card'); if (b) go(b.dataset.go); });
  $('#sfToday').addEventListener('click', function () { sel = new Date(); sel = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate()); start = addDays(sel, -1); render(true); });
  $('#sfPrev').addEventListener('click', function () { start = addDays(start, -7); sel = addDays(sel, -7); render(true); });
  $('#sfNext').addEventListener('click', function () { start = addDays(start, 7); sel = addDays(sel, 7); render(true); });
  window.addEventListener('storage', function () { render(); });
  setInterval(function () { if (!document.hidden) render(); }, 2500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  render(true);
})();
;
