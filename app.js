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
      return '<span class="kc-tag" data-k="' + k + '" style="--b:' + KD[k].c + '">' + KD[k].n + (n >= 0 ? ' · ' + hLbl(n) : '') + '</span>';
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
      h += '</div><div class="kc-foot">' + legend() + '<button class="kc-today" data-act="cnav" data-d="0"><i class="kt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle class="kt-o" cx="12" cy="12" r="7.5"/><circle class="kt-d" cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/><path class="kt-t" d="M12 1.800v3.200M12 19v3.200M1.800 12H5M19 12h3.200"/></svg></i><span>Kembali ke hari ini</span></button></div></div>';
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
    ana: '<img class="fn-3d" src="data:image/webp;base64,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" alt="">',
    cam: SV('<path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>'),
    home: '<img class="fn-3d" src="data:image/webp;base64,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" alt="">',
    menu: '<img class="fn-3d" src="data:image/webp;base64,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" alt="">',
    cart: SV('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6"/>'),
    rcp: '<img class="fn-3d" src="data:image/webp;base64,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" alt="">',
    wal: '<img class="fn-3d" src="data:image/webp;base64,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" alt="">',
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
/* GENERATED oleh gen_icons3d.py - ikon 3D berlapis (lihat icons-3d.css untuk gerak) */
window.IC3D={"academic":"<ellipse class=\"sh\" cx=\"50\" cy=\"91.6\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"7.44\" width=\"92.00\" height=\"83.13\"/><g class=\"n-cap\" style=\"transform-origin:50.7px 54.2px\"><image href=\"data:image/webp;base64,UklGRnAeAABXRUJQVlA4WAoAAAAQAAAAywAAbQAAQUxQSGYPAAAB/yckSPD/eGtEpO4TDBpJkjJ9PzDnX/AtCxIi+j8BSuOVzhieCfu+D1JqxGMAlG8dBoC9ffYjbAXAti/CcUe1Vig+OW9gjCHVY5cmSUEhrkFh/xA/z5O5TMmUtt4eV6euTBvwJIBSXj7adFuyfgQkCd6wbVvkRNu2/TjPqmq3uDuDDwkBZtDL3d3d3d3d3d3d3a9xY8g1OBFCiBEIRNu7qs7jR0u6qyu5/kbEBGCdDG3v03nx9HIyx9jw084XtWlCpeOnL2j/B/Q+VWkNWwZjwZlGkmKDB73uNPUO7m/a3FqDnds9tDEjwRAAhWoTikkQxD2ZF7+wr9aQtPEy+m6c87foEFv2enNTcWtpZOrL8w9/8pOf9qD7bwkLgDZStOlT/zwX2+4DhWosS3Hq3PG6m4z7D+x81Os//KpHNHnrWkJi4yQfeE88q/kFQMQEpvDO1hv2P36LL9i65YYHt/S+6A338/GGSQy8cVNzowRAIACeHU/NDd4Qy8IUYvXU3fWH8bcvnwfnEW14EB6ov+FBEYJe52ECkeZFLHb11PBUJjV6pb9p/t833c2+lSxIRsJmeqNDHq19ZwBU/5TtHgAEgKSHLZ7632njKfqf/3DF+6DNt0wFtfDegcSMypgbE+lHykY+CQKCL3t1C4qSp6m3u6nu+Hhw4o6Ldu8rB+/wDAaN+pCvbot9eSELEJHjCKTr7qW17Ob7ppPMDAAk/C95PYpnMpqmhxrjiczZ225f8W+umT/8oA6vtAJb+npDq+OmFokEyElE5KvV9dZ+3a2odX+LduK/F9LTqwxQrK3tRYepCF+5ZOk6STBnrgwnzbHT6ZbWPa2N4dow1W6pH090Pu6RD2zXpE7OID3a4e84HNVqnq8rlxIDPTktMx9funMmr3dffZsXxaVY8voEgQFWUEuLVvLcqi94dTXos5BWnQ96/ouf87RDDzwU1ipHeqzrgQceUBNoNEj1TSVcioKaIjBbK1kA8IU0gRJ1fzggCYUZzLAT6cz07PjE1MjF+f7H7u/tRMdDn/a8w5tDlRI11z/3nR/fWq8RASxSyqW05wxbRETCqGsFQACVwgBQLJ8BZjM9N3/u2MxEx1O621rTWoyCvlgwno7b5SLh8Xcdvt+OBkMnEACue/JDQu4kjvwpKQAQkYAzGYBSqwszd6XUbGf/tmjUgDSCxsrQAqgc5IvU7unYvbveIICQz7LzAZ3uhOZ3XvSC4HAGs7lqXT2zOBvx76qNewXif/36hCeqrLVIva5/f/tAfdBHIJTo29rhUvquL4RQjQxAmanZq2dXFm7Lzs5c+MTX0oefZl/JlUCaL7S5Y8+BLp8uAELJwme4FLwPvCFAVQCAAShzZXH42vgdR49/5/SR97zMHlmQ0mIAQkZ69rXva4+FJQBC6QT3puYjUVEd+QxWmWBm/vT4+ZaPvWkAcashPJsEjMam3UcGowEDBMLa2b0gjOU0Vw3AgB4wJs6le9/7qJgwarv98RRT5IYt9XU6AEJ5lXItCGF4FIOpOvJJLc2mkg97bCOB7KsNfoIW8QsCoczMyWX3AkPMrTJAVQOwUOc8L360n1hZQgIggFBuRm485GLgxC0nMkoDqGogxLWxmhf0EPIJFWVg+oTHzcCrWbnc5RcEUB6vhSpHQG7q+P13ScqrLAOpoSC5GpgTtz+ku6PJ0AvANLkY6ToIoMoAYHNK9fgqpoDc5eMJD9zemm6o79++uc+bZ00Mp4t5tuxghD1EAFUEWJltD4nKMJCbGzqh63B/RTIQ6en15NmTo2ku4u1/wFV1Q5fwMzMAqoCdMyRVggGVGLkj5SWskyQl5cG2GEXJXxtHa0S233PXiC0JVDYGgPIxmK2V8VOTEcI6TwxB8P30Gz8eJx2gclWWWcWX5++7EtSwUUxOz5nwwvkMMDKXT53NNngIG0dW1rIA2GFMdjo9deqMphM2mmLbdj/YQQzm7OXhsaTXiw0otW0JKDiWwdbCzNWTdtQglJfWOWiatsIOYXD26vDJi4YH5SUp/L6cBbCCoLIodj2KDjyP4UQGK3N57EQ8JgnlFXU7W3s3IctYmhLdwXJYly+bBUyT3YmMphd852cRqhyDc6vjsxcWIxLlFk0PffzOtqbtHuL4NWryUjmWllSeNX0hA0uA3IYiD3jbX770eIlKM7O5fOaOm+wQofz++ut39LZ19AHIJiiko4wqneI88+JYhpdumb26opSrmPrOOkmgSjGyMwtn52IGoZKhTFgXQkqAkU9rYxRl22ZOT84dPTU5ncyyaxgyENXhRGv8R8u1EhXuSgEEZzLylbm0cPbsuRNpyx2I9SwD5ACODylCxbukgLMZrDKpyXuTirKq6siICLLg0NXzApWfP5lzGMAAVKZpZ7OdMG2uJhnsfMCjr/PBqbZJDhj+xbzj8hkyFPRaudVs9QhPy8DePU0GVYYB5kLOXPjCMVUNAEgYvhBlOz2SqoECLdsefGNbWKCiDCjLBjso+5OjNlcJSPrCbS89tL/D7wE5TOt80WNv2ByRBKoAA3ZieuyMiYJEygHoef9TdQDkPAAMZnN5+czI6TNXc8pJpEUHW70CIFSQoVITx+6YPJYrNP25P7ADOl7+7JDmESCAHAeAwZxLX5o5aaUsKIeIUFeNCEqAUFlz9u6/jqvNAVGAkkN/MyvHvuseWNMyGJaBoCSAQOQsgAEotRIzarzJrHKEp+1gLQBCpa3Rv8x2PvTwQU8BqIW/20bFAM2n1+4Ieq8f8BNkTY0GAEIUIQfkM1j3d9baS6k0V04JDks4Ueqj1oMfFG0m27KZweb8db1cOQAkSMTqNCDQ3+8FKLi5ngDoPlGAQJUCmKQ3GAmpibRdEdIbehuDRCAnCENrOSCYp/7x+9sXFQDZt1M3nFCYAAr4JUCRwVYCZOfuEAEyHJQQAFUGRCChq7lMjkzmMpFet/9t+xsEnEkIba21lTn14w+8+8vHsyCQ1OLpjGNKFR4NgGjY5AcQGtzlNZoJDKoIAAKBfI01WSOtqBwU3vOa30zUanCs1lRn8+rNvzp5iQ2RB174z1AVlEgARCQsQ4fumdIkqEL5wtvS3jOgd7dncvYayN/5kptms0qAnEKQOrNl2w0Pe9VuDwgAVv/x92oqLgIf/tzRLMOJDObcQm7hlrvOLSybXETosR3dvqgGEJxLRITg2Z8GDu4LECHfUzviBsDUP3467wwADIa9PHHx5B3nFi0GpBbobjpwuFMSCM7lfEAmZmJRDxEKCj5PrsDJ6RQczICyly7897bRDIvW7e0PaN5aZ8Dh2QwDRGACCAUJclV3BWg9UXIQAAabC2dHMqD2HdGYLgBylpoYzgAgrNGHoDvIrojDAAabJgOaQQQiOJxTCYUyCqvRHaAJOJ9RlOB80dHnKQOvno65g2ZgnV2ZWgGvhTF/k3SHQINYZ/TRUzlwCZyXHRkld9B9tL6Qf/GmZ3XrTIUYKs2+xD2TcEmF9Xb5r796So+GfAayc6dDg7nLKZfIjK3y+pJNXvzeM17UWQD24v9+cXzPSwLXLJdYPXaNeT1RF0eZl00U5NU7bh3NTdxzwC9dwro0a2I95bg5uGeggQqQ3vKgDMuGmm1Rl7DP37ECXkdk/8sDW3whcB6CgwDA6kEDmjsgMb2ssJ7WP0B4QYCKiyCRVoB7Ht4r3SF73wlzXZEBgMB85eamAx4UJIo99nUxd7AvTWRKYjAXIAK5EaFw7r5fHs+gKMMK5CxX4Pj/ZlUJTJy4YjIgYzUGQO5TmPnarSeOziouBKjapoxyA6RGrnEJpBZuuycOwHv9wb21XtdC+uStl87M2CjO/pZsxhXYUihRXRua9UkCRKTrIYdujLE7MeJHx81rJ1a4BApk59gNSiVg5eicHwVJq93/uoNwabU4neSl4ysoVZPzlrsAuVsmPChOTS9+DbM75YaOZmGlbS6FQslldgnOI9K9wz6Uauz/mAl35pUVhTUSRGrOdAO2GAWFR/ioJGp84wqzK4EZEBqVAgh7eNkFeOXsaowApszwgg8l8/LcIsOlw0Sri3ZJBGt6nl1gYWgZAFNm/HiTKA3WxHDWtZiiLZ6SAC9NWNUHM2ExAbmRu+sE1mhPj5vuZJshywxFZWkssifTVUYgSALAuDbEhDVbJrsSz5+jlAxLUEkkQunVqiJ/yAgK2e4hIHMi68V6qeZOpFY8HsIaWVu9aFdT4H5H6rp1qmkgcGI4KtcNKDDFNNAaIIJZs5oiTzjSFyWQACg0YE3PZ9cJ0Xz/rR1+IqxZzl+qJq375ieTBAGAd3c/3zepr4WEO1Hb8w40aFgzkT15nqoIwlrMKRTVY5HwLfdeTTO4iNjRrLkSg0GgNQH+Gwa0aoIgr14MJLwXbrlz1DSvZQrJfoNcqfwiFqaqAqRmEwACCBDW8oVZa+mWWS5ADcTrCUFoosrYWs0kbQEQQAAUc/ZKuhC0Ot96AvJvraXqAvHyyZmgRgChIEOhONG6gtDupmqDWrj7b0GvVycC5a3nWlCvOqjkxXSSo0pqBHIjBnMeEahCBIIbKpWNqymKenUSAMhFGICylxdNQEbrdFBlXFTo3o4DeyOtXUGfAAHkAgwwVCY5efHkUBbQNj94k8D6KUNRz3U7e3eHZTAkQQSqHgYUYCfiduLkyJnhhRUJWMud27RyMRgEYrBwDxDI62vaFvTs6A/o9VGCEEXIGVyIFQOZuRRnTp1Ip0ZmUhlmACpNQSoTgVcpJJhyqwHhHgVJkKyp1cJ7twjRtslHAPm8RQigNTG4BDthA2rxdBy8eMslthcWLVaMosnp+hoqD3Dl5rqDQSROjoTgwkQkIwHInu1+Avw7NmkFtJoAysjxZbvI0h1LDJ4/tsIwl7IMZpTK8dHWRqK1MUCYGfNvbc2dOd1IbpRPAAwvAeTpapEFIjf2iTJYZ4cSRRJn4wzYaRsAY+3WQrLRj8JUim0K+0yDPyTO31cvsA4KQj7p9SEqg1pZsLgAYKOiau6/LVvqdaQzfi+oCK0evdVuyBnekdsvRwkVlEHElTuUSIRyMsOpmaGT+u42z4lLg90ECGIFOzv03a+eMXJy+N5MiFB+Cl+3Kd5AAOnSPaqePNFdNzb8Yf65R1ZyRlvdlUumuvqzo6m2+hkpdIFK+gcPzB/rIYiGQz3aRgGAHvNc460d02n/rq6x02lkL2eYiFFp/2bx9zMBwDjyuWdFNxAgMAw9q0TAk0kpMMOZMnPBJEBuet6N3o1ElabHFgMRANCjXtrwpYZONcm8jT9WUDgg5A4AANBIAJ0BKswAbgA+SSCNRSKhoRMIfigoBISzAXID+Z/gB+gCVBp+/AdN10nwH5Ue0DZH7n+FPyg6iFC3bz+x+4f4O+qT9Gf8v3BP1R/1npQfsd7/f2h9Rn68/rr71v+X9YH+H9Qv+1f47rJvQI/ar0wP3c+FD9uv269nr/55zD/Y/xe91HkX+e/H30J8/XuVJb+av3vGr8gtBT+f/6zz5GdPtB5Yv2r/gW335H6CvQz/6v8/+MHvO/PP9T7Bf8v/rv/J4Df9bHIW1sA4Xcvdy+vxiTnTVM7uS3GzC5Ev+9TclNBRR2oxZgXIUFCTAO9K9WuuO5joJvCGDPxxTgxB+MfWDdHEs07J01Hlxl5DAxbvnSdITLGiIgS/7jqVRPbsunOrCBSJzmY4D37Z8odd/5niN8HLayQ6foQGdb1G6//codUboKdr9x1IfpH1+MIRaXhOPiD6cKs46TRY00Kt/C1Awj2qt6W8iQboJO2z2WbTDKYVf6d8Xeh8dRXXz/t5sGfJeIV+Y2WmHyxyhpZCTQn3LXw5AbAG8OUueFwXE22bF8V7cCrPX6Y7j9LVm6oJzlo0eu/zVXTuJdaNxqJmY0TjIeBN2+TMbStwO1UBuC7ahKJ5cajbI5ISw26Xec4kHHwSe+VdvseCjac6gLN1m9dGzTSLbV1Ply8f93SEwphMZ036UDILMuP8fe1A4moRliqFWrpP7TddH55XbV0vyeDMaE+gdpimixRoB5CLaKOefnd8z0dMm4aGgoAKchOWLOXpl7JHnz+MVXs0gIhwgAD+nBPIwABNWDQZ/9E8Gd/QLsunCacSMB3TlxD6RsmDmVVojCfHYRGPFgNO/fZ5YOLHrSGHevn/yJGPIgBHpC2prbMw7/u6ywdKmv5Q0HAWpaDZTnCRtIwqLxwKVzotNPVyWlgm+8zgrtWUGT0ahR75c1xxzmYTvEXs1WTe3z4/31JD0AndbUiXhficTPSWHBqeD14FsBxHALlB9vrAEnvjk31B0UZMTA2SOB0uHipimonIsrN5BVTjRgaAlSh2aFKUPHhCcV3P/yukZwZjHMiugDbnXdcdKMI1y+xgwMgMcdiJrXICppi+7lhO/dbuSOZmM4+2HjTQ/23HTtdPC1UeHHJ0ydZ51dhnVY30EiXwyc+4BJPDtrBHIwvaqzffaLeglWv6Yr0hrKuy/1p2HnBt8E92vtYsLn0Re3fTUrJxVT75a8ThQPRHxaJWKveo1OQ3zQ9NBZPH3nf8aWJl1n0nnK8D3kkP/PpXgEL0iTVpMBH+tN0dmOhibZxVU9oJgh3E5/2rpibj+GNwt3eAZr+aAn5zLIMbI2q4dIwGgbP9LR0LByh9gHADKoUfusWEChMNP3Gx7ztIZuXzE5P8Ra/+blEv+LtrjbTqKD19HZk959qmcAyeN+16R0Ti0l4jtDM+Nu/HjtSrK14hCT2pWHJ7vbZvKycJELT5V8WuFAJXd8x/MLfdUCn/PxBkCSXMslL+/TnB0F6o0eeJ/TgO3+lKxg8GE8uNXY30LBNkL05p/1RRJx8hp63YMOAzsKJ3FyOSSNbJu59K2oqhoz8MB6ZA0pmnb/Toqh01z7rXf37m8ZilXg/z4djHk9CvqtYXsd/DNDeK0f6HvbZsBQwFgE0YeoNNmLIQyFynCoFPXpDzV2ufXjs/ds7nMGuc3LvPdPPx1/Mx25ViNCPi3esQlTTUPZJESWsU6iQaC0QUUUUbQzmhovJdNQQyDsAYzrxi/jiHNJgV4FFxvtiDbslPh/bN6YRGQarPOUieaXGJR/Txy/HnCIsOHGhDzpLz2UnWGQlwZRrajwxcEGQqy/5I00bqNznOSc1EPeZoxBpIX0n/JA2lMCLYLJV/If6+64F7bSCHHZ27/VvtmlB9WGCcbM7Tdc5XUBTPNVBv6CTPBKQPgLCWXOBMOjMTsDgKDevdiHaUxf7auJbvQnBrLkA0COyuPxaSXbGuF3aArmwt1Rh6d4S9htQtxMgFwy+TQkXouN/U27eK7u+FFJbvmeIg/+aSDOVMrlIl37TOadhWPImMo1RmAZXaHzq7WX37OL54c5ZivbiS0tgtl5Qk96R+7i4jfwUHXBMNLNK8zfE0DwADLXoIV7RBxefgctWSqfV896chfZIWV3Zj7RHwvGjP8G7jikVi57fIWIOjEm+V3VmjQy5MZXKzWOmHp1Qe/cHgKBngpi1oLSofQQmXGeomFfrOukMtSSiZAWkxoVMfyBr0Jck9hRmVMffI1GatAF44ILgJyrdHEdy/nQhf2Kpm9y/UL2fRGJUixfYTNyw0Ljh48pKDLd8p5K1rM68TNSfkfzV6yvTC/OdBaBfqSyBdpVVMYFj4exIe+OKciZ9l9iElEt0u66pcpCDMR9ngavK7h4Eq+sbKBvO2o6XV/jb3NmB110MZH/Gq57qRw9SSO2lUjVDrRv1BIcPMbHc4jWhR5xKnXjk4RiDxazLjZ3EnlYcEh0uoH6xj/+9ZZxQohOroKHNX/g9JRbPM3W0Ya9vqL9z68bfP/dN/wPYayBFgVMkOvwDqY6bXNQTcHPQWSqvccPjzuA2KI2EwRExTYir5A4jzfKiPm/9uxFN59bb/5xby/7vzlLK9LTyD1aIfh+36TyWdMWaCQTuZy5zMo9VcDjbzJbEGLo6lAyv9VAObqENlzlI2iybG5QAJ5iiS0dS36NU6xW2UYZfa0u3iP9v/pEt6cvEdSAPrJKB8AgaIv41YEwFbXElRJaUWXipvdqkApdXaH7AwtKJ3wCEEHInHGCkngsKuHEZYXSS1WvYkMp2Hl8a8C0bsRkfTr514sN1X/cju2f3mrrg9M+o1ShnFGR3HV9dY+3tJY3TxGcfDW6rRZhp3MoEMx7l2bKolzRfwH7OhnxZ9DlloH70czeWA+k9+zKd7WaVt/nwOyNrl5TmjUNJXMXWIJBmzzxBj8dqmg/aGWV2OLQtgUHSFqy+Bnd+VCvRdBcc9fOQ0jQ05ZLliHb7WEsDUN3RC5TBIjYGFAJ1rnl8LZiUf9NRjz5aAZ39q9OUDcgWr2ZMyqUnj5UsH5woUOP04O4//9tf+XSNVwkXvf4oxvBj/75H576CuJg9kF0MlBeT+/7e/rkypM9JCmBGdpD0Q2BKn/8/65aaV7bZCC3/cblvh2Py3kAGC3EgI2QfX+7doqCUCYSS8bGupMOjbedNU136eCRt5O2w/ujZifDoHWUcGcvmgH7vwGqIqE3uASCml4tXMs1aSyFkt6zFqGkyj4+VhAsTGzHLqdfbbaPBOed81e7so7CO06QU1ri79Pl5iaRWBetYX4NEUbylIn+I5ZG2fukz7Zt/C+/WJm7LjSvkNKSxkLl98f0H5sP9RTy+zEkk58Z6dTGZI44siv7bPIHGe2eKXLXxDR3tjAhNzaLfCh7rpPODq+alHCnah9U/vL++mDwYqif0mJEmE75+U80p2YvW9h3UlFcKBh5sTR0FbOQoVmlSEpIB2OuCR72NDD4syf6FgFuH/6ABrG8ZbTV0ExyZnerv3fvESwVsRIRFdOYsKN8tSGjSQX2u9M3irQrL4/Ya2Fd/H9Q2+mHgi2dZCgrHyDH+r+Q8g8LM9CyXWKs7JD3a3vf+HL8QLv+eyf0Cc1U3Njk5CGv/hovOmfuydIa5xYPajKMGQkVO/V8MqWgb9w8webTJtHwt73ypOnc7BAYCvOSPuj6D90CtfEMY3giYdiB+bVI1IbMLWoqJ8/PrwbgBDPyxkvxIbc7lTdVBfxOwJCfKy01nUXRtyTiAnXyr0gnS99CCDPCBdOany8/IQ2nP4V6wvb1/VZTWiZ/ka8OV3ZlYvyE5vfQpXo/eyvfUj+/40MOQ+czmm5xOFiSJHVf+6DvfiwjAwNtP1BpKaUDOoeorFoj+CBZb7o+Se+r719IA2JxjVFRVzJDtndd0V2BAHN++K8woEdqAfU5fuFVaDqhZ1gIjV1ZwTHzYDc8cN9KnvqWKD4iDNAhzJuB+2dBCjpUqkq1m+5mdUc6JKb7TMZCQOcwst+jghQo0ZVgPsNQzXfNReFRd5i1yWUJK+MYcA0j43Ys42xnpy8ZsMOa8X/TuYBX3/5j/e3SMbXNaFBPfbowgwmn+bsn8P+VjNwu5UumuJQ28TtOg+2UNZoxkEDK/ThZkHw6NpCfX6ehw99ZR+LfNFcRyCUPaP04G+iRb/+nyhBdPUf9wUjQYKeaAztf/2kGEWQpqpYC9c6ncna5B/ZK+jJOjdpa9GVzknL15xvB0Qg131hcKFRxQyPNwMkFxhXABZVqA4KfikvyxYIWAybv1l/vAoDR/2COwZtiova2FLsyCceEJvatIULIvRUhZLWd6mwSjrOc0qmQeDQdPn1dbHV6e/c9ns3sAC/g/UsJmyPUslk9mupt9+y0xwaP1kYcT2mpPr877H/TA3z94vfb84hXB5yVYv8azfjhnMi1jBVMsNwn81oWGzRWe+3Au2C0QOiUgesm+1ht/pnqrrPC21t1e4LhZ4PWZ2FwoBszJTjyZLe+DzHkqule5zByE51o6HJl6yX8P+EwjJQ+yEhsDkzUMgnD+oSlB7f67KAjrQU61fJvz6SnixLUo4nRkoe3iX0PDb7xbnxI7jq1397mz3e7LY7Wn+PoOOpcbocwmbtT9FlL/8xoFZLqbF+WbIhMx9QpZah8HljL+HtpofzHKejKgPcIct4lfoaNoC9AlSy85QENsiSYGCFI5UYQmAbDsIe7MwqkVw9Dkujeik2wtbpsGtSUmynr8X65amdzzsaakNh4EnOC6W9+I1Ps7qe9SISNPxbziNQS1ZTrglWDCQnP3BoYVnjwRXfTysXEveI1Hels1lhoCNgOJTjoSXXfN6mcRPcokn4JIBn64DI4vQNkj8rWFGZayJ1yf6mDCOSOi7o4aSD85tO+YTp+GXAX1Z7cXL9ExbHsrRnDaA9TOlNP0MSKAIL+vjxIDlkYHzEzeUOnE27va/8UZ/wXtPNf3mCq4HZaQ4l+V/9WjjitptH64Uw7k4cUb0+3Jns1H2//PvtB3pSsFrWdkZf6jCiD3pb4K74sJ0uU98P38x+fF5xr72GDR8Jr2lKKRU2wKSkAAA\" x=\"9.92\" y=\"16.61\" width=\"81.65\" height=\"44.37\"/></g></g>","work":"<ellipse class=\"sh\" cx=\"50\" cy=\"91.1\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"7.85\" width=\"92.00\" height=\"82.30\"/><g class=\"n-tag\" style=\"transform-origin:66.9px 21.9px\"><image href=\"data:image/webp;base64,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\" x=\"52.82\" y=\"18.18\" width=\"28.79\" height=\"57.58\"/></g></g>","org":"<ellipse class=\"sh\" cx=\"50\" cy=\"87.9\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"11.09\" width=\"92.00\" height=\"75.81\"/></g>","project":"<ellipse class=\"sh\" cx=\"50\" cy=\"94.1\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"4.95\" width=\"92.00\" height=\"88.10\"/><g class=\"n-gear\" style=\"transform-origin:71.4px 65.8px\"><image href=\"data:image/webp;base64,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\" x=\"50.45\" y=\"45.10\" width=\"40.76\" height=\"41.65\"/></g></g>","task":"<ellipse class=\"sh\" cx=\"50\" cy=\"94.2\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"4.79\" width=\"92.00\" height=\"88.42\"/></g>","cal":"<ellipse class=\"sh\" cx=\"50\" cy=\"92.1\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,UklGRjQuAABXRUJQVlA4WAoAAAAQAAAA5QAA0QAAQUxQSGkJAAABCUZu2ziCk+nj/f+Dk2nbzhH9nwDslMkJnQhhSXUmhTCndgIhhImoS0AII9YNyCM55C/gtS6Pm+DJn4CRB/EhpAChnAkpYSed7SdIquozhgwFbRs5afnD/tEbACJiArjrCDipF9W65tdF0RrV+CHMObWgwwtsDMjxIgOuUQ3KnRW1FQacL3pmG0mSk71HQwAq/9AIAgvcnVoXI2ICJsDztu1pm23bt++HJFtmapIyc1Om87yYcXpNr7//Ht3zi6mwLJHto9OImADKkmSrtpvufVDMzNKMRxrpj6UvYGYwM/vxi+fL59KB3Wb7Hcdbe+aIiAlQ+aunNWR85Y1D2twFkB5sGES9N6u1aaRcm7ybcHHZ6Y5l1m8+WFCM+OlHP6/Na1mc+IgIym/f3FaLqU8++/H7b2IhglyM4Kefp6WnQmjbm4/mS94AYBALFjT7dfsg0oepm6X5WkqAGEaBWyfmT+pCqqNPPmhSSxCDKURlMtv2iqCfPfz0OLMAMay024/1X1QCo+7oy3dXNUEMLuPa/V0bFbA9/eThNCOGmADK4n2tAJMV11+ddzEx2Ez2uzg148Zo5WJWVRYgh4qgSH1SjhrN5ON3U0MQw872uPhrvEx1dLp5tuQwgjar1w5rGSW69vqjfRLg8BFAO5+Mkql3l87WU4yny6Moj8ZGyqOPP+1SS3A0QLf1fstxTBhVm/fzqQWIMWU6LZPMjgajdvuiLWKCGFUCQH3WykiwOfn0/jQlxrk8amMrI2Cy4uqryyVPjLRE0fSsk6GjW75YKSsLkONE4O/8orPCQaPtPn63bAhizE0B1/oBM+XhfONsyWHkCXLlm7NUhsptXH10AAIcuaemsVJ6DpK472wjgw4J+cufb2CQ4+15Ygmq4Kk/2I1SOzisowgAoUhj5XjHDE4h2NMcHv8+LN4lFQ3CpPrFcUDot2cwKAH5M/EcjtGGZJGnf/2FX/8cjDdfCXbl///3+zCwindHoE0ItyP7fnEgijUSViVc1vvKDILbrQlaBUSMH/0wrMYRLOu2DVc5BHE8BQ1DJNlVPACy2sK4Lvtoif3jtIlsQyTzZgiMwLxZbvoX1U60DTG9LNk3do8dzDuZF+hdeVjaxxWJ9E4M7SPbh75vtk1B85ido76x+XBHYF3Sl1HPEK2UNA/g9zdNz8QQBk5Od3tmp51oSNJc+pXeXEQKIvLjjr2SqqSCwOp2WfolJA0EW0boM1d2PTRM2sT0SfYvMxWBzXnJHjEpjZK6q7pPIEEVwZa+X9CyrB4lPfKNo5a25hljZPZhqyTCZwaxLHZSaJneMwYUqik+2HM5AKilaG/XxkhioGYmhUthed6JlsjsdLUJQXm5RC0B2XyVPaFJHfRs0qgvuiZsbt9AYHPTsifWqKo6q3vid9dEUTCxQT/T8z1NEb50/ZAsoaIg63cle0ESVBTy/RQ9gbLzTPogRWV0ZQ5PfR/i89tUV7K5E/XBd1OrKsJY9iGhkJoCTJn3AurObw9ND8pEtBVvTBmeTC4KbTGqo/A4PcupLDSPMwkOJjFQNvOjiuEBoLJAEQRPQt2k76LQmE5zdYFrn3YMrTuair6ytTg0RHkMfVMEwZMWa2cuNAK0lzl9yAOzZQKDs2hsWMyvt5y9CNtWEhSSvRntBWQPVy4sCmFx21QMS+mEiLyBgGS7ZkhMEjEZ63cbElJ0eBiZDLZJEbLb2XEmI7O1NCQ6B1oMsvzpRAJSfNzFCFhEbRRhOJzuJrQZOdvz4cjOTQ6jy/Z1wWDoS6s1JLVDuCRoNbuyYgOC3uPz8ziYuHF6k6KQUGT64RK1Rog1oSDfydQGJgfLDIVC6D2/3JJQAFBvpogZiPEWeidMYsJgPp9Qb2B10TAIFOcz0Vxz2QZi0giaN0UqYSifnJzkDIGk6iDLVyVCtNNOVIc4N0Gkd3OrO8ReQjBVKbqzu0c+BJCg6szWQRyE9sk4lhBI5QGSJ1wci9poL53vy+LM2X2uPb+3HgDbmdMe49ItDhRSd0R1PZPFvQGZn7VcmEtFfZDYYNGcXJbqI6PaLUq685LaA6ePDSFYL9BfdZQvDADVB4oAJok3IPPGQulOwTeAnDwWDNsbR10AsJm5wrj9GexPUERYEkFoJ13DvBWTm8sRYsrtDAJTFw2SXV1wIUCQQtLvHmUIAOIHBEAHBkF2umuQtyJ3XrkUwoFhgGjbQEC7LmkYEJvrtmwWBptNDxdCAMEgEPBh3oz14EGQfwWChu9vLx8P7tkIA3GyvBG/O35kziCAn3AFIM8ahOHsx2hAUAjEctkVYl7lUACIsyoX0K/8fKaG7Ae/UOwktPQsXxECsFmcRwTKb794NYesJ/SXjhIBu2sXCfP7jYUMsNl+mDRf2YmizYI0KGQ8dT7eg813ETLbCeUgbQHgt0emQzOM43awnMluYvHFDrYChHY6s0Gj7k601O29vh2g0eqf59vawuTgBADZrFqQawtg4kkNkwud9UNsDxMyNRn86lqKVje7/0BzzTqpa5Wm6g0rAaClpI1Pd6Ll+ezLH9eQQABoJTT9Sdw2Tr94eWsW9fpMob+gcYTiu31sG/xk6f7aNw9eDMc/LEeuLL0jAAI0C+qfl3fiPymEa0upH9aFmyc5YUoPgARVMv/6T9OPpyRsGUM2T3Kwut8UmLKxAMxzVETRy9mfpwRgYxLpbkf4+XUGZtspQWueowLkf+qkGEohYOvWQqafdAK/v+kAnxqABDhqqFdrGYxnSYBREwHpya6DbF+WhGsyAMLnOD5CZ/Ewh+V5AhAfA7JykBLN+z2BaZccQCGe5YiI08VugmGnEIiXSyKeX2dgNS8E9DEBEBwFcfTZ13sxikJAispA2vctkR7vOTCpLAESHDQBs0+/Pua2hmcJArawQLK3ZSF7DxURTUoClOc4OALldwnElkxrCLbrHqzf7wvM6noMihcABDgUAuAnCz9gLmzlFICuy4noeJ6S1V0lkCwVgAR7J0DTov/Vw0+9YEASkDQTSHVXken8OALzzhEQvoIB6U/kWQ/7y19P3MIYhiQA8ULE66sGsv++Jvx6yyc0lnhtcekv6CuP5pf1svx5IT2wM65lidcKAZaTCKwe9uSJbBxkL0iSFHHTj+cCoNHnhZrOepkeyxyMSwK0VcInZufsJX98tLBp8sOSBwDNG8QHUucIIxPPMvLyQry1OSouRNtzAOCuhCRhexGxMyL+PyIAVlA4IKQkAADwkwCdASrmANIAPkkei0OioaEXeaa8KASEswM4McAdwD+AfgB+lf8ATT86n4D8ju2s4V5X8uf7F7u/IPaX6a+y/sj+9+8btE+N/4nma89/9D7xvmf/uv2R9236e/7nuFfrh01P3Z9RX7E/s57w3+6/aP3cf2b/ZewR/Wf9D1o3+P/53sQfyD/Lf+z13/3F+Fr+z/8X91faB/+PsAegBwxH9H/DX9ofmT4e/j/yb/dX1/8pfvf3Q5zvYX+29Gf5b+Vf2P94/dD8tfs72o/KbUO/Iv6L/ovyu/KjnrrXeg77x/Wf9p+ZX+J9TD+19Qfs9/yfyk+gX+Z/07/V/nH6wHkX+hewL/Lf7r/z/7l/jv+V/vPpq/wv/P/mfzK9835p/mv/F/ovgO/lH9b/3/94/en/Kf//xgfuX7CX64q5v/p3chj7R79+0mZ65t5UQdPjGau8vDGNKK3k7N6ZgREBKnvIw233TZ32GT3GfWC/6lZz2AhZiXfKGaZdsBMG1PGvbtL2WMxGPGIgFx0p/Zz5RETz0yfbItYWlXWKhka0KxecDRFEB5TEG0uxd3ikezcHKWfv8sWpxxIYh23JQ2bGOaY3MZuocoXczhS2eY0cXsSd88NI42X73wbSJ3yiCClj46IXOdw2H9UzaskBdVFYjqSjUzrB0KKkSqeXeNom1333lxpeGCGA4uHM/24p1y8nJbLYSNB1DxxI6T8oteLEsX0ggKU7+dJaXwGHo0I395WAy42iKRsaj3P3SRaWwSjdPucVplWM8NDdpmIKk4gxykLd8ql2zqP38KtFUt1AvRMRbivZNiwn8FR1QJc+VRhIh588qP1fqXNbRKIMdYWDnegC9rbp0IAbuv0MUIqbNNXp2Enz1gTnkDBvXVs6+Bzw5+siVe8EzP0k8Gs6fwIPv89Qlz6RZhlZi8svzy9wX4Pe7cXmknDEqOwV0V3oe1/6ipgKeyZu7yxlngHZaWC/f1y4bQ6VxNkIGW14nGcoNCAEk5chbrBC84ZShBLqxSdZwiNxV2xljE6wB7/BAtM4AKDWX+81kjFKYjpoXhLB1wQ8u9TxlVjPTqkHOR11iSTyV+06uZ8QyoHs63z17KaNhy3DCfjmAKAn4rjQKTTHUDhNX0LI+4Ba8ZHqTR5GQ3XjYQeBLHRpXY/VR2vhLhj2oC75AnZFslh5ljW7cwnrGwp7RtG8Ukeo16am6XO2IGuxkLuiubMCTCE0Cp9SN44hFybiojebbcksYG0YPF7Q2pzwlwyWEKBwUe5qdnJ7lkERppSlfWpIsxosKBLa1AdjJsrUm+gfwF8jZO5WUvsmfqj6AheZazVZwIiFspI/KPd/4pDZsPZrIC+vBNMOWj+VEc4esvwg300+e93Zt840CpgF8yD0VVWX9ST/UqE2wKwFQ9LvFdqcNWYJhPOB76TugsezkY7gTPqx0UyYbXPpXXg9lLRvE4weNW/iE1GLUPr+CUXFL85KDOOyk4dRmsPmSrwhLIbLg6c7LfWLYBLWujgaIkH1KZNEr61swzFD4o2Rrwrk/o4kCEVbUW5Oi8kMD3FmsaQRediZeFhijlzo3lIgf//+/9AGNyQAAP7+pTYECsI+OBcHoEq2NOdHFkdZnsOnG+xns9zKtp5ZgzGhfRRwg0O6bqrCYVgdVGB61xZnevosX0nBktDly/xqmPMwHuwCimg20C5ayspyDYDKKe+UJ41JXclNxp8MHwvry9emHh8KMMMpagqjW0uiuaSNuVhG1OvB8H4avcZe8MEgip5lgWi/tQCu+8CBYd9t1QWub6CA4ga5nuflVuxm79lgeqnIW7PcSRS8mu/XKIBGPq0whcfWwxS883nW95+B9w6rf+ffDxokJz4/wo9tehXXL3Uv1HqizPfaD+X5lV69gjkQ55SkLYnrni33wS8B01BQvBuC+DM6rSebhMutvkzQRXNgNp+r8RPHz5mO6noYczD5K4xvJ8buJGmULRIzlYkRMTUu5OHmge8Vtr+AbYxQYZ6FAun2BxHOktRTbeMGrN8rujN1bi1X2EgSKCuJteyxjTAoH0diYir7BU/9++2KtQGLT4pKWug7hFeJsfS637kQl3HuGCwAhlhUFpDNPKRNgXm9NhLLDOkym/ziP5ps9TaoazShgDsxGBP9bEXccPzrWhWqQmwz9cCkBXBA6W/hFVbzPwDWobaYN1CWwwRIjaeKY89B9hDh/polQ3Oouy9S3/XzB+r5txg3XtdVlZWxaljbVCB4RdH7+kmmj9QH4PRimxz8RyOsFFL67zOl6NA1a44Hc1adq0tEp5wPXZhGUUZLDyaifR2mcgrgf4rkfRhwfvjfOivWKBZI6pVKdbAfTxv6Ex4fHqjnevpovosDsQEqGLYOjIikz3GqWcvam6FYitjwAtAtduVbvAa9isst1UJ7i54bgr++VO7BcbrXOEHAJ/NnnDLQ0I4qMP9y7BH0HaCS8aOQh3l+UN3H5Hpdb+PhlRFBlYjub7IXhMb06fJIru/6SDEAC7tEwZ53v/uBvrHcfxuzFob0b85BD9ei1sQmhfYk/3LXbRyPdM8lvzSlYMFGp/nXQZIEgam/BRc1KNNVHbb7kb+WDHJbcPfKk397xdWM0XeOQXw7Pw/ITDrWwDdxk/qm5W/chDqosM2EyYOZJxJ50G753JQZnpVi0DsTi2U5bl7zbp5K3lnhogyoKGKl1resf250MVHzHgVHd5AqNpQTKqm2ZY9IQZT0y2gXDYodjooC8dVgLHr3imRs0LSUTyxemqzHyq0xUKc4wx9Kg3rIRNE3XnKKJu9jE8IHE/YYqNbHaUbORS9RqN6APfRAzFnCejl0pUkoEvFnDCWE+9/9We4+ZCNLk+8PXOUzNGhxyE/WbjQRSHcXKMgDZnxSPuf+qTV4j98x2PxkKCc4kPXT/Z5wMCsiOBJCm2PF7Y+05wrUjjntI1dDTI3Mx16JZ55vglSMs9iBbpjOXP13pR0trTbgKEufBYv6qSZAEM4IoWNshxXCj75lYjY7EogyLI73MsRP4cUlqrm56jM9eUdky6Zh/bBFuWhatbPAo56vFui8RpwwBRZ7tCQtmUAGXq6b9wbLLn4FLdCgMEcQLslTHbBndZZI63q1mPZmqX3Bx/jOXW2Wzk2hU8hNpsuq2So5R5GNAtbxtl5wKMUCdfmjZA4J0f6cOsCbZ/XsCwr1FHBWbB0mCRNSKUqqM+mtGE+JgjlYXPZCzISq5vJBhb8ofjaX04PM41Kpcw2z5YrloDikilQBuqZwNAUmDwMLz6XbMFCENwL1v5i0jpZBLwniXHhxNLgOINqobvnvwyS+wEVOztNMFjLiDPOytn4xiWbHXJbTlEHeiH5ANgOSO+sU9BXJ6s6CFa4XeVQWhoar4eswbcbsxbegdFOiwRdCgw8OpPRRz1T1cX7MtCHkQ1MCOIpyA512bO6en3BmqUT8DgUkp9ulECCEgzZldqJgHQq2rJN5Del6mpcwGNnYxb8FAY3sp+oExXtR019W8F2Za4lyHrK0vSLTTY8EStOVN/f11bv0xM211Dv+RZ8eGGkSBgmpSci8BP/R5pSLHuRWG5Q7/1gM45fU8OM82j60RfAxWO5VrFBj7h8hYXdI3dq+cryHlKigB5yA5L3sBBJVZroGj9bFYSZAkZ2za1xcyUJMoXiwhJerJi4SzVEKTaO9zft6+1Y7u5+azsSxjGdsvQ55I6FZQj9dI5kc3ldpShhCgyUniRjbxRGhuxkiQCJ22998cz1sB7qvQEgnpt9RqBFkkge3QQRtWdwx7hIug/eyt1PPXvw4XR4AviZW1zaiOv86iGXFgv2FXuZMT+6DzMWauvw5GVt7NN4fTr9rL8TXv++VGUFwW6eHCwOeStTOk4vF8M5DxgvtEukjoHiNoAwIbtlH2hDghLkQzvP06rh9Gb1JwOjXBujbBE8bX5m5uz6nAxoQJTDhcZ/SQBKO6LL76/p1y9srHibRJKi4QbLXXUFm2ZNSrQ4papv/NqM0Vgq8ilcHNxumY8tkQuQ1ZznqXdmQk54E2ZlMygvTXeILohn9QNk1YWtIIGDE8PA8bosM3cJBprbHTaHfbceRAa+H2UUr3f6nvttrU0xLhDEkMrD7GoJLZ7EaivlREMsc01SY0nRdggBbGTTbj8P36C5UoxPE/JdmRR/y4n4NUoZLzgAj4T+yudalV7GB5Lh03otOfVxLRnRvpYaJ2g2NRSsPzDlaJHex880sfeeBvRO28/z6ARKWMo4M1NcuR20s/GlrkoubsW3pcdybf0FiWSSsBPM0+6hfjDvz1LfWVA1leRt4b4r334qySQWVTUJDkA/AC68x5fC6wU1fkq6td9m8y8nvtuMkXxyz61kx/ZIcO3lOIjzpBFcFgVqWct0SnbFOWSe7CtWRub3efatm7y0U0Awn0JAl46UyvNotlp4N5eQ6QkdUL9A2L8B5x3EvMidHCdnYgVDBewcf+iUYw7FvVZIZe5MUtjw1UJXJC+UrV+BcVUxCMFqp2/qNg8+fPrFyYLIXg93doZmhL+C+NTpuXJAjWHV944q970dj/+mw+m4doUyw6/txziY16pTsiJvXTTRvenJOy2xsyjhiNsRxOEqPX81u5enuS/5p1c74vtA0q7MppiYLh/J6FBL8GwwKSvmrw68Tqpnz+IaDb8GDpIZvePOZ27Mj3xGyG/fPFbV5oeziZZxnn19E7eK51IGjJhgAYshPIFkBDATHHTkg70cDpvtr5kqmV4rEHSDD9y7RT5Dz724kv6SaboHJH2em/7lX8XLdBZU7Pjtv5lO4oWnWBkQZjwPmlldRBMWwP4ZFGbW5F0S07i7M4x6YG/5Q+VQV5uAkFKxDFgeb99iX+TpR1TQQ/RwnGbrRUHv8Bdxvz/hjn1enWZ9/JiUG4SuSDX8f1bGj30FHH0ImyC2HeIdLDRh+c8EYdmz79yPj5+fF/W6BcC5Sgz5n1yYvb38hMBzBoYuF5lERXHVS/kFMG5UThtCVrSxL2Ny0kq3lr2ZrXerghSgQgnZz0XxBJw+dN3Si2K9zLOCmdFMkeOccaEfubNrYPlaRdgPq5Ak7VmQaljTjuWbkVPI8ucky7VQfA7RKUiaaLCB0PRgumagF7I7jh11dcLHl4XiOEfU5TISDLY5wqgITYynb4/6oLkTu6n84B4+CxCv/oct/40yTwtHuka0mko/oyGLGd1bsIH9YxLqpeCVc7h7uKLJarpreUaWYvSBfLM3KoyRvSwJLejtL2aRaHpW6ew7dXI0H3Z4H9kruaakU0GV9mlVd1EonZgWmsfXHdltN4ivkdCAIPVYwo7hbcP92gHgYft4R1dfxQjFDU3eclRFdJv/NBCLNMSGJDkKBi0dNHzYLboASqxr5As70d5w/tiJQ93SI2glEZjmtakK5GLLVY+5UB23My0AOVOWRT/KC6LAe/qA+clV/NAAb4vJyFg0L2upg6jpw6EmD3MVLAXtF0ridXzLrKZb3jwohqC7pJbofrGz2cHWQxkNYyQVrvQicyIkUzqHT1zQH7S/pIIiOYGpDVwoPOEj1lW+ioQ6MDP6QbYHxvOcGDE6fJyCI2c9D0kLDE1oROdxr7a4UYYHW/LjJVOcPDjNM9GM+CYrKYGcgDQCt5FGF4leQ3K7BMvCy/WtciCyNSRvAR4lmr5/BXuJCMR4zkxROIRq6CWCcCKNf5vzKX3h0beyur+tPYYbZEw/4agWlpDGGn5/q24MLv0mKFHlvB7rG9RiDVb1xrBVBlgfP44/uTM8F29NFVJCActMvv69Gz48HjT7mhfdTHzWA+1rJl2lF53S3erlwymfYJtlZKrNkS+UYlDd7/qdnzpMr7CQVj4BIfBY4csiYpDhkw2qcnSN/KFOON5/TN6GbBCEWWIRD5uPorGwZLakRj+daoTzOdyqHp1M6Ancsr7PtRUNqVf53AASPGWaNi8HDbVzquWtI9Hrpygb6hVXfFK/RPn2goJnnY3E9+/mEjrBS/Bp9aFEzkDc2yc8FW2NDNFfkDSFy9FPXFyfpKow74ayyyc1wU8Z5XWgeLdpv7G1u79ZgQn2yN/bEKbukcN7xPgufhlWJM9L2ZC5jwN2GLxGnECmFkW8OY9iZfCzdGgVLucoGq/5d4IxM3+yrIGZqdT30AdiY+5hRQLc/RL9wrnvP/EsHLVPiURQaX2dbzgERx/bOxcbJioaIn8YbZjVKCV9pJf+RO72vSDLW98bUbZCGUdXuBwInt+/req3i0rfOte5/I9hi6YrLLw654eAXPfF9kjvNUbzAtIIY643UmPb4RGa1KwditaTe7yptacFOZDetJMxSejIOw/g7Oqv2IOaz71QtghpLZPisNXwSw5q1133R6SGaPgT2EqMC9CAya2bYFWd7XmulxRCQT3tqRu0DoqM9M6vhtPgwzhUWj3H/jru2P1wQ4d8vTpcRnWdaLDS9YCh1jv5UWfQmRJsqISlKVqtc+EM3R/WQICgibjEK/xp+l4n1dnDvstJLbwCXoktrFMvKF02/klYXlh8Ar4TxB+OVDvhBAjcv2GzT/XqRIwbYfv6bMPmEsJlAVNga8tg+AAVqpL+N5p/XTuR07k0E+j0cjjMfNm/IcXYfpXtWHnN0+V2rx8yMq1pKGj52pMW03bBfkmDQJmcJaYMyjqyQenvH5+Czc7dbH6j8Fzeknx4XW+Nm0A/ziWqKctLw6cjGG8oAtlR64lGJVUM6rqz9zsHKsCkTGbf9B9Tj5Ep2FI/JMqlJYp4+UBARwX6MaFa7BcXeftuRxipj6Rvd6ZNEmGsP5sYP6GLnTm26oHOIPiMB5Ku339EkcTif4647y80+JxujpTY9Rel5c0j4NQzzkB5fUgNHIsc+T9JyBsl//VXsa9wkzK69DzM9FQiBDE4KZ6eGKdBoXU0j66bHJPpl2NDawvaaFHXuZc2j+EyHEHDC8e8Ccd0SC9APMKwe6zBYHMkyULGkWTxWi0eBhBsYIW95Bex76usHYDMc+BcuCino4Y2AnJ6lT+0rDUAyL2/nL8JlHr1+dtMv//bD//2j3//2mNOyOhT/0mkxJpb5++9FMUGvA+tEQr5BON7G+d0v3PkwJ3ZwhF2I//Byu3RrdO7lvkAsaSilr2xBNWND79ol/AVqSC/828LZz5eDjrcdNrf71qFzPZo2PrIEMXN5DROycmyf3+v8tGVvL0rAgg9h/qvFPuj8nRh8YKK1aZiz7iSNGG/uMqGjw1WLpKyNqKeHq+XEDqMl3kxev4yBKZpNhfcNO/Ufya97JqDnqP9+Gf7QaWLTa3ay5hTVstu1Qdh3Hrh0Cb2pLKpxs/wMK9HKl+MlqSPEPKkp6wwdp8+k7/q9434mSRdUQyPqFSNwh8Ap71Dc1T9qq9rRMZd0gbmRdHKxp82EUY5tdqKX5MrX7+pIOCeXkVd+xL/eAiaoXbswAzdssztojdlIwN987YlvNke/o2pjCFDMv0CzVtEHmyyHCJCXGhbyX3yPhSJsbIhWEUXWPeCHiuI1P3/nddZnBAK/NUUxeqd3ZcANhAWVX6MssHbXAJo1qr/OW3JZQXZkEzfXtdl3HJp7skQdrGkp2M8ZkWpbKgZVwIpSojz9s0IzwCPovNsEBC6/SUhnBBII1UGFX3jtbFEjMSCHgbqfUlEOQqtq+DfmpuVEAKDDyX3y01ZeddehFzDLTpbAlZCa09lZHi+hKojL+MxLpg6A10vD+/oR0e3YxgNXxvR7y5qSWE4BlKDKUQh0pFhsJf+vud/sn7ZjK2w5HqqCRkjK+Z+oqzzFFm7U5LhVcia4LbluWFremGmSErBZfdCA0E2C5vvMWT1MxL6+QjnEyTCW17+ByVOrLnZb02+2sjQuDHTOrz9Wi6TKnSXQ82qhQSHjv23pQmWqURm2oPF8SxxkgwJSpm4t9Ramrus+tscXW4Fjyft6FqYuiZc52/rg7WoaD8fAMBwO/aTUYJnzIik5Mrgfw4C4ntSW2GcHiOK+YMjDnsRRGttHdNrNpeKUBrW0S0C0LUovRj3ffDE0Y7ASs1CzV5x1w1CEJf2K7bXxHgmrDezKRZZWWcxLS9hY7SWp9ipvtnrpuq5BtGJorZG+P2wbaxw5zC9AoS0EX7MueL8yvjJWCvBxYJlwG12Tvw9AP3y65hviTHe2vdDLKoS6VMwHX7SQsyx8Lxg5Vn83Ff+aPjFXg99Cm/6qMtVh3BpFQWt15WIuRjd0NbcLHH8fNFfxnqYwUJ5fsGewvKf+ilSkyc2joqBvj55K+hRerjL7MVGjvlMP/Msd64vgLpyv1o0Wb9NhFojQbnIxl9FVI09d90xj5sKYhKbP3V4sYMzgiVqbVGZ3Xwyk9d7nrI5EdhILyKRyXFymZp98LkDlguOAoknWLdxIdAbod3tz/DFxI5n8hQr8eSdjd8XR4VHYXX8SQKP1R7TV2Yi5OSm/v1jIV+PHF1P490IFIi4MBX4XfMgiLcXrfQLlRDHHJvYOxrSz+6357dGEsAighysk+RRgKJXPg/BMk9Jk3fFWeVtWyStkwCksJKfGaom3FbVjy49r+KqbNKVdizTF3hss2ioM9+YFkZwgNiVpIcET4fTGdfU1xYW0f/H6xDfrkun5apB9Y9WMz7ZiXUM6UagMffLAd674FhQsKA80Vh/6oIpDkxOWRtgkkt2WC61XL5XOQZYi9WViuxFwgMqOQim799tLXyPVUH/qzcSrSKYZ1W81+IAdN6OE6dFXeIHzb4Lva5zkBDPMRQP7U/5zeNHZMKAABWKphDRgb9ZrKeYLcNexDaEfmHYd9Pi/XJk0NIFuAmN6EkvPcZHiJwsnGSttJtfHBI1Dif4Fp7a9WmLB5wJihstZpzupwdLsG8nBaWrS8a8276ekgzagLF7SbgEpy6WYiD1evLmlvC0iWXoEkBy5Gu2u6I1RifA0rkmBy1+E2JAh6UslW76UtN+cTwI0iCvKltPreFWQrPNt7XyZtnbT+TaA6PTQWNTUiWco07lhJPVwBUJSzQ36rxnb/lV2GJ26ApL5zw/iAB47JNEd7L0Nxy6/7DStExa1z6Hwl6jYpYwG07UgSMqbAHse7dp01HqkOX+GU0ItRaWCmMh87fKrlbvgqYiPOKnPt2kp+9ZD9PqMv0Rh1UaMHyOHUG0Gi8jjZ96I/TQwXBWU0ZAuA8wB9jSaqP6+HLlP3MlekG8XKVeY81mjjG8mnTV92zllu5B/132WZ2F8hGDlYvtziJQonogdn704QdcbfScNdFVK6B7c35PIddnu6N60fjav402ViFSRn34BayJScoVgjutGSKX88z69IwUpGi8IFExY+XEUWYYnX+59oEER3GODb7zSMEKUruquuNPrQgBU5OKCLKBgQDZsLjPSjompE6DJnE7JIHbiFdKGIIinABLn/7O2rEDvZtZLKjlIsT5bGE2bJlulpDsu7GzhVh79txX5ia4JhrC2lOxSX+WmxhxS1PrWtFm9PWk/rvpralNNfKiIWgD/B5ee0fbW1v2N71xRy+T53qLs176lCmza/yHHcFao82G5/4IKQ0B9LZWQB+bpFc0+Di4pahe34TDyD8WoXkEb7wvLwFSijrETsGWoAauGwRjI6+i0uBsSZVgOO/E+BXW9a30OqqG6aHCQfonow3WgctstNdrf7XhHMHJWDp+rS3WaKSW8J2UCmKdnTgCqpH4ETywNh5gsEgOpbkxTkD707pnSjZ8KtM/imFJgzZpXaqH7UwURl0LwQZdj9gHj2aOOKpL7Kyl5QJBphOVRx9yD3z3YBDolhb6a+mAaiXgh8scsxJtkqbj6vCqcK41M+MRVs233tDrmwC5ctMeL0CXVfYDiTZSh3OVMGSygUtXHYy8soXHroJCmhvf7+kqiuqrtiNUwt4R+WmplmqwOEWrD+RSA8Zy8vFPfYr7aMK6ABNADX46t/5JXRtcHJAfOTbKZFTwiKibZL49jsQSRf3ze2QLeiGJ+kGhsfYLJOy2ZqxYZ9oPFzyjOSGMJ0dzcevy79Wv9CMSgDpg5uioZ/+E//41ZPGuuI/WiIlobmfcHXQ6LUE0p64w8cE/PqpSM6k0gv3pScTL2XB+d3TE2zq72QHRhL0JNRJ2CWlf4XqQ6JnMKpVE8QMhIcSUAaQe0pSNDrqP5wIVGp2/p3qe1sMvorahfOW5XDmxExU8S1dBSTXLleYNZ1MvTduANnBegvdJuQQHgsx9+0uLmv7AhtjnFNWHW6/Oq/3n5ytWvqdoPhmO3qE8/AUd3QXMXMU5ZjwY1v1bJWYBfoPGlQabavJE7HplTU+nJS8yUTTnwPzXCAXOSvsXJttTGlxZTp4T6RPAaJFu6MOUhlS4yJou24sBJ8DWbA5yCB7kxS03gqvZZxAQCXNEoisjG445N4puZw+Rw06z8Lmw5M8eA5CwgcjFXur5cLNfXa0l4HgjCQmG4mWDDOxyHWJM9dvKJhBI8XYAhE1CJOv7mZWHNzQktWu2uSp8cA8FDj2VyE4pDuCRb+joYv6i4DGo+7AFqHUR0Emic8O5O7FkOq7duv9KFguaF0vmap0ohnujp89frfowz314zqexW7UOHrs4T3DUf2b16gATnZkiQ2yK15tcbQDKqUF++aPQE3B9Xjt/S7hP53zRmfGxkB4dtx8OvQAuVi935vCtzoprU6GFKQIp/0DjVrlHCC/H7V9uxvxn8upiocA7QszoVeBIKfLoiwFTaBURcUiLVpxY8j2Q7QX7d0DSWAhrut2ywZORVV36y1UqXe4oqNiACSyQOGoZ0WJ4kpd4aokl/nMdqCvEnoafvVw9VvsRKp9TpG2XQftePDEK8ZHwPPo5JXtbkVBsCBzuQ/Ahg+gMh+AjGU3WPklk4cSA25gtjisyI3hmjw3QjQBmlC9FpjavVpon0c055zH9bRga7rDpA+/s79Yc2TzpCGppZobHpmSgV2D3ehFcLgf83Z5KOhim7F65N7mVwHG4dxS+byEu2kNehZfmGxRObnXoRIits3WIhkrs5qSdkgAf2SFbA8KTxsqCvVdIeXz8hp07YSts3J7NUwJsmIgTxTXnRE9D1iH2WjzcG0sf7SkxpUR+1OiN0r9pko6pd+i1oMlji+XA9CNnUnBmeHn/dwTGnqUUQKB+z3k0/ruHKV0OYlv0RHOFRpLAlDXyVnZggYl0cao53OHU8tkhIcvbjBwe7p2zygMZLJZ5/LjVMc6sEDcDFTC+4rorOoI9rrzb4eLoRNpGMWp0HtzkvGcrosCmLA2+jeK7eO1a3Ieq8qxyvH1brk056FqiJFHDBmOwf9coMZogPZOIr2aSqdVKGcNx1XZa+f9VdZGCFqUbnrIE9wH0YylT2+g+k/9MciJTS7VMO49KciNhtVeQWYnE3/DaQt5tWE2caEkGNhBdi0NO+pnnkAAJbeRBvSDonekKOjx7tvTpUO1YaU5WouREFGKghwmVeb3469Q9EJEJfExKhWcaAuTmZ4zEUpTW2M8tebSpocHKwbU+fFdOrOsSt9WZMtU9NXJnf0pX5TTHk65STR9qNjZqeTurUSYyAeGq6h/PM18l+jV2Bie32zLa74T1wXZTMIsxivAIw+IiGPqQWi2hAOik8B7bJQmYlMJhIYOtIMEORZaxzkKfRGrp4WncWacS9+JSZlLg0QxiJ3+gv94ruONt3N90c2NXbgA1LauZWTENM2NND3eAAABZ62Bf0EbEIk/fHL1wBDgpPd5sG5dHrj22b+iwkQVEH/mo0yWX/RzQ6z+pNAf/bscdH4nw4ZTeoCNKpfqgyyKWnTg/6scMp4A7JxQPA4MCp4bHBko/qhbL0uli294UdCV/C6eHCCxcVUXoHh+4o5oCQk7Vo3/39lhnrNqZVsE7s+SdDzJCkhaI81byx/7qi2vCuOf130R/4Uoc1j1y7fZ59zCUkOKLHXUrSGXaN+6btz9JdC7pz4trZAFe+D5QlvBBVPVygSW4ZLQyRQQCC/Ehq8/+Elx/CV60sr+9IxnW5p+jRKqd2UWx/qMm3P09Mh+hOFp5sdH7q8lbMaQvYrQZFse4SCuTypHYneJhLEK+oiU0LiERrTwxw54fktb8hb4Rb8I9q9lb95CvOk7XG5y+gausgRLPCKnByWLsrdwPcrpNB4H5AdNGuerPVb0JNxc0if2Zgr95sq5V5gAkPQGdKvyrScJ7UVGhMDB1RRN3EfsLlUezt2u7YcI9xPvJe0K9P6CBKZa9XURMDGtEOI4lUAyP2Zc0/laDT3xAY41HsuhtKKuLNjv4z88GV6GlIr8Z+eDK9DM/8TtVJJmSc0+J2qkkzJXcDJ28tXAEaziBWp4BBE35V7B8UIzGq+7JOi5ZvZxPZL/f+xl0ECnidQ7F1E+r8EpEv35u6jmFkUQHGysyHp8vOe7/JNhkVN2zds4z6FWX8Xn6qHsKvUrJQgsKfnh3f9SYEOdGyrsrq6yG4hjf+ZVILZ8ajxlXuJ7B2CRgovaESjgfbAOPVh04AATMuZVkC8K1a8JfT2vX+87OGAafiPGLSyX5zG6gbb/Lp8KnOxQJ516Sxe3qAAA==\" x=\"4.00\" y=\"6.86\" width=\"92.00\" height=\"84.28\"/></g>","fin":"<ellipse class=\"sh\" cx=\"50\" cy=\"96.0\" rx=\"32.3\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"7.51\" y=\"3.00\" width=\"84.97\" height=\"92.00\"/></g>","goal":"<ellipse class=\"sh\" cx=\"50\" cy=\"90.6\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"8.39\" width=\"92.00\" height=\"81.23\"/><g class=\"n-arrow\" style=\"transform-origin:55.2px 46.2px\"><image href=\"data:image/webp;base64,UklGRkIOAABXRUJQVlA4WAoAAAAQAAAAZAAAYQAAQUxQSOMEAAAB78agbSNJ68zyJ33/IYiIXF5Fbsav0RYShKRx5Mggud+M25zKOff5I8GwbdtItdX2/v0HzgPcBhH9n4CRI9vO4Gtc8O3KUZqt6+0AAdbebwYgZWRx0OKH2QMlbf/UNtLvX5LKttKBZmZmZt7NAWYuMmu+B+0ZVszMPNPMEO42SZZUqt9QrESqA0TEBKD6WivksYXTvQW7NwZof3bbad6SRw6vrqH59lu+w2xt5PxiJbD33l7msLblEg9CZL+vFFepIWhREIC8u6XhKJuqFIAAAOPdg26SPFMEBP9jGp6TGGolmFlQD5WLmjBE3yv2aPeoeVlN0LcsXV5zjqWfoqjy4NzYgIXcK0NBIBDHsYOUINyudBZgNkUHLrF+kMus9D557QadIc2cxKzaOx//2KMrvClfILMhSNtJY36cuSG8kIOYVVL8BSuYNhyglm6OidkWKD1Qz4+FlbNmxWrMpUCUeuxAULXEBv6cAALs2qwrZiI/xNw3BmsVk607Qpm76IMXfmelaisXKMx9fuuVT6ce5qCtyoLDC0XmTJiM3//rWsrxKzGYxbZ8ejhACUnmna7lncsR7Ngvrfle2SCQEgAEQJiMsNN3u4+ukHKJEpSY+C+t3T5ky+UtrkuJZiREJYktkSw6vaoCIFQ+OlYivXt3WAERqgHbK9PadQoVFCFKTWNQSSJRfonSa9etVAHxlSAoUXZzlKggW7/craHMuUUV85+nQ7ieyfjdATg/vvqHRvlZNu37GmVnmqPcTCUyKDuja1MslXhpAxVsX5wmS0NQGrlfBdvp5CiPaUZ5iiqye79XooeXEx+VVAMjfmls1LycoJJqydHN9bIIMpWjkjTmjkFJpaEpqKTyGkMEy8F2YohqSpyglAQZIhBUUcIlg5aloJjJe55BNb3V25YrlJBANnrhp4zVSE0Q+uib/yNFCLHRjVtpD9WsSSMApC/k7Q48APJ/BAnknfZvlxZZVDP3YwoKmjtvv5eoju/REgBt3hw16Fzu1gNUlEmQEwWVmX7tqbXLw73LBcGKETHjo5cuRAiGQg/VpF8TLShoJUrHv1GiFzUEQ7uXSXr1l4dNEVRWEpum6JuAqAEoWAAigDeoYbuxRZW1CT32B5tEibJwKnWsBP0n9689tAKnmkRlRP+69+eFJtxaq2kt6FcgCxaNt3OnBPWgZ1BQDS5Z6cGpXLRpmbBIuG5jA06VdnckFBS0g/OGlVvqejJF3wQUB6HgUjWyaG2AgjbqtJHDpYyRCQpK50YHHlwqkvooSu/h1aaFS1mvUQoZr92zcGrLWqKgeN4g3KoGrRYUtIxjcYvN/BRFxdaFcKqYVLGI+HlN4FQOaCUoaI3tEG5tiSEKKglCuFWFqUZBpjY24haLIJMCgtudhHBrlIEoqNdIQjhVhnUgkP4s5mnCqewiJYj+WQ8VnKr81EdBRmMtCJxqA22lSH7/8qiFW1u5JfoXHWQ9A6eqYVUT9M8kjzK41SaSoKifh0K3aJN6LFRLPYFbF0waQb8EskRSwrFbLqTok7BJlPsazl12lzMR9sF3X/x0w4h7vFvkDBAz/t5nozHhXnt9BgFqeTbRtHDxvXfa5H/AVDVzws1/PvtpTAJQg+FCOHv68Sc+bVtLBhvWDriLgEQTt27dTQeHPXcBUFOfvfjcS/cgcDcAVlA4IDgJAACQMACdASplAGIAPkkgjEUioiET6V5EKASEtgQ4AsQH8A/Cv9M/7Ngf7QBwp+MfkB2wF8+pfir/Gv9N8O9Vfrv3G/I3MvOR/9V+Xf+U+Avq58xP9I/136zvmA/Zn9cved/on7Ae8L/UeoB/XuoY9A39ePTC/d34OP24/aL2jv/rnI/877Vf69+Q3RNey2UYe/flZ7P/5z8VeBV/ftZg8I3+f/HPzkb4Dzpfyq5zOgB+a/+F6g3+L/jv2A/wHuP+j/+H+Yf0Hfyr+if7T9d/+x/fvmq6iz9oG37m9KNHXpdjlyfHlWwaIXHu44O5LapbCxL67a6XZQha4pMLDaiIbURgLmR9d6rEnppHis6x72iJqcl9EeJr57vcpTt3OM+y7KgtKgBb5Jq5ud2EvlCaxAdhRXmN+rZD/AROd32YmLlIEb7pO/4MnhhiXM+HQQHE8htEUAa1Ys4NQs9imav/JSg2MkkYikEZ8QygVlKXWMa4KeWQe7bx/FTn1D+ioleFz3QMyZuMLgwU806rvDSgAP7ga2MgDBMjrV3GWyl2eFRWHBGX0X/kDfDmmLxRTU3g9SWpTgDSBcc092Wd5WiW01S1SGbHsT3pwCqWgHsZSIQIQ0OzMxapxNuTxJqzS2NFdk99F+XsV5NX1fy2I2MkLQ8l4rMrGMmSYLWEXPjRlBIZtRqXR1AcdCrRXAPfwVKjiCEDr6p9wYMoPXwHoSvDOIDU+SK0lMNzgtXBdw4InvAay8K9Q6VKuYJidc/E5M0nqd1RYft6l/dWwBvMIW63WND6//xWLD6HhZc+xMBA5fubpoRSX48flP8B8gr+HTY2EFEAuFLnEx2ljENe39hlEZy0PbwZLgd7fLwiGDPMQ4L4owewpcSN3P1UOE92K9NseO6OaF+rDxP13cGFOmttFenO/9WulZ3B9aKAIssrFIry9qV83G8DSs/Xh+SJx39+kN3aeQsckloRW3nzIvo8zpE8gAsXlVngWHJAowgy5/Q1k4aBF/pGnzlZq+qgGsfidu4IVFBlkOvcFLNmK5sFaULRTLcwfy6D6lgYAU6yOQD06W94kChpi+bXlldSlXQGua2T7W0R0Y211hC3CvPCzTYKGcJUN37nruSzW2PIU7IldiXMi/bETNjsdP2nk7YMYazcDuP5VTNajbX1+nOLOpCzmALY2B3mWtORAKvY1CwFXID8FO7Sa1C59KGannmf2c47W0h0Zptm+rl1VZQ2NefK4F/sY83nBV4TnltvXx939Zfw6bb2QRBpByfqWNTTpW8jg9grQWqR6hQLdd1WWRxXFEFSK/rh2r5xqKuSDQMWY/NaA40trbrzdT1uvI4S1Su+SeCf1iVjHC9bIpgmMWP9xVg699NypJvpkZbVbkQAZGEqOjvr0CkA5wJj2vN6LfiNVExG78fvzQjNpxDs9cY/tMcv/vh6tGLKlKVWHuoci8am7JFI6t9WGmaL9WhX31XllcLVLGH/KWohz8VuxMb/tahVRjZAZJlCmdWhRve4GpdRgioNk+7+hGXksejYOcKT1bSGK2stS1dWrZWqxqlx4aDHQtq5z6IuZM80tSCXWw80N+eYPSOMMKTx0xGUbWBJRpTzGR7f396Fa1oH+yN9T2WZUsQkgdtll7fnT5vl7sOG3MB3GNrCGYTFPjJuULzzguDGwv9U6Kc9efff/WyRhY8RsRL//WJ/jGTt/UtmBMJFQpSQXLmynHRUgp9Spv1AXBPiHpLhKQCVocHk3oBa6XLlGwu+L0pSt7WO4dHLyqvzbZTRVYcRMa4eY1buMGaENPnnam7zszpdoGf4DmfIi+AM0TLELqH1vq57um0tNT7cL+ZC/EedzBJmmOKEkVBWUQsvVhOmNU4IhxSAz0JQCNBFefSmCDQ4QoXf9nR4lSzGUuQQYV/8qHFM6sDen1b4KwEShEt7ox1XIDrE8kc5f5ycrhPAt491Pn0NghMu3mIfgCLpMeWp6i4/Pp7DXo9IYK84KFsnqnibAC9WuGsnLxbd2JPA9+NArH3nfqrrx0aKZU0ACgVSgeborSnyYQ7F/u4EiSyx67kFhOOZ9Fty0jDQrTMqJ8RntlDHR/sbOsi9tbn8JL+JoQLj6dOevdE8cxL4udWrPFciP1f1RM1qiU3rxxTz0Q5ueqweIojk8qcY2b/1jr3/2QEwWwtfPR2saq3wPVaGPwRnqqlljDoxhpvivQhOLoR4SJR0Ka1ndCJNNZNSXlBcGoV+0FslHaJ73aZ/6Zor8nNB+JOjZTNKi7T4QJj+BM/xF399mILgorHpX6W932+PUv8fi8IyJ+1kIt0l2ZKGw0fanqnU3o1QSVWeVGD6sbyVcjYMgcGVO3pAVl5ynIZnJCOBHUypR+ySYXditfvRHy2kvebVKBDPrxF9s9S4ic8OBkGpPEWPZt5ti3hA9QVILiHOJ9BhNxl+6kOS0oltJPHBLvdTIymuDcCHYtfzYLsc1nTyKPH3cKmE1PniIy2Mvn940kE+9SUPpK5O5WgDT4zeTGtZmbWMS/h9OyuZslalh5r/TcNzKNNx+ziKsje6HdzW2LFuDd5f1FXlr2SXCtvFBauy7MjkuA68gGkapggSYjgE+tmIj5Rvr+sG8LiuOiyNrjc6VKwSm8Ci9bLpte2pYopH3n/efqtZPPXaiTeF4jYeqsNGNebUKQFaXHFXoQc8dZbrg7fagkbID1OVltvkL9dFrqp3OseuVmYrINZkHb6a5wOY0/qGM2IKIR+X/3j7DllzOYvNWXxgMhMwslE3hcXyh9VWGo6k1maR/lmlTeafXIXwyoOKA5s6eNYigBb/eB+JB+ZY5k010VE89IoR0Wf2uZPWUKocgNv4bsnjCsAYkZGJtpByzObYbArpp+ENnNIS7ZGDOoH1TElYFvVEI6NhgdfKNHM2QnPezd5mAqhi7AeWd9dHCOHM8c0ncP30FedzHmTPj3FTQ3Px+IHMJoVQAsW34mabbJFwiEjvM8TWbpAqYniE5qOq5nzTmLWh55yjFaz0BPQSZqR6GJtAW7ehl3EWa4tIDPFc7lUffayybq9gpwvAEZw/GU3/4q5z/KYuf/pkQic9EjqfffreN96qF2l6CCVjaZvySUbR4ABt/87wqffP2WPLgCjU3wC1QUQD6Rb7AA+soAAAAA==\" x=\"53.49\" y=\"10.13\" width=\"40.76\" height=\"39.59\"/></g></g><g class=\"n-sp\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"12.17\" width=\"27.66\" height=\"69.58\"/></g>","doc":"<ellipse class=\"sh\" cx=\"50\" cy=\"94.2\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"4.00\" y=\"4.85\" width=\"92.00\" height=\"88.31\"/></g><g class=\"n-sp\"><image href=\"data:image/webp;base64,UklGRrIFAABXRUJQVlA4WAoAAAAQAAAATQAAGAAAQUxQSHcCAAABl8WgbSRH71zhD7o8hYjIz+9wRFGi4dowiOkeazjXIIZjMEVYBAvGxNgkyBWiHCFHHgkFbRs5ur35A777xxDR/wmoAujZCk/+6A+ANNu21ra5732SPpGZsQw/cf5DCTOnRsH3vYLZHkBEKHDbRjlmbLs/4IA9/XdyKC0qDhkyneSA7HcoE6Arcb/rI72+msFOfmewe+sKmiE4/tQudjWy+0cj6fn53EyfEoHY3b9s6cuvhiLdiBUDsBbIXp+z7P5obs3odg7JUtmh84Y/vlV4YdIKbwVm8ppLen9Gkk+eEhGkAqJdJOQph5ZnY8UiIoCdjlxCaglGJUprm9itu7j07m3bAS8tutrLYprMrGS3j5nNbi6nsNPXDNtgg/xWJ7EVF8zYbOhiLcss8od7I9nF2UzM5DmVjaHB5mI88JxiR4McTQCBsH4olqCRvz7lktyeJP+hIXliNyBaPkkj5fS7PnG145MXKhBh46Hyf+holGcPp3MzupjZfJKvK4glcBwy3FZLu7VOxLrgETb+RQAisNOxsfdXEzs7ebUmpI30gX2fVa3jqcqgxORXPQLT8tCNoJFOjR2fzcy0R7Kx5Diaqdj2oaqfQuU3QwJtOlQWaiYxMm7lW1JLARzXXC5+LTHpfkzKcwBs/I02JmcnOkS66hIVPhWV36wzqUBjI2QIojZfjwS76ALILTsUDsvMQbfJcIo+gWj1kwv7SMwuBZxU5OKfKzEF72vslmJeoSkksHNo2r1NYO2AgnbMwYeG41bKDhapayc3NtqjrJOuRuwPBy6pesOBjG+eoz1bHIZbChlht+OSnUp8CDaMACcKCTARHY6FPVgPAFZQOCAUAwAAEBIAnQEqTgAZAD5JJI1FIqIhEzwFgCgEhLMATpnQwpvd98ui+vAxk9tX+wHm7/sB74d3pex/+1HpO5oB2Bf0Pln9C75H/6P3gGwlfLf9V/Ov2juZXuDntdCHzn6kX9e/4QfB2CZefhmFWKLL5D5KhkxjoJXyCXq7xJP4cdu062BRCA+UQmAz5i4hKR86XumX/308ONaO71bgAP5aT3H7NEdk1cOjTGLIsghOUnlfS/LJo4JQ/gnoVdKJ3ZuV0jRY+sdim0KYuibab9cFxY2aCFvC0sYVw3cLn/lHKMGvz2BytNVUcGRtD/weZ93/yodef3JAorCjHX+a8PsMXJUKKDZdJzTHQn6j5HQtxXpz5gfZvmN/+MHZ+MEhp94iABd6dAz2ZuYaEInaqYzeK0irvqyYaegST6nl8j+Vdq/2d9y0CI7EQQf/Nl1lmgXiWzhWzzIzPC5kUqS5dsJs/6hPw8u7pk3wbCyPL91llBOC/y/FsmBo8PpnwfjD38cMzvnLNYnEZ4zzTe3/Vs322f3tG0SkOYcj6/RPQgnKN2JTorHTsxj+6WG+nAlw5PZ3keqCK+uzcLdxXu+QBix+Fw7noIjn0m4BxkDifQqWhMKZzQXwPv7tr3psiXhrJApz9ws7Y6v0SQ6Q8W5gC/ipbP9cz3c9N3WjZzITdOTiJvjBGrq+hOBF87WoPv/GV7kvjOSgsZqJNYLH1vSliq/3T0Px8SHRCCuT652COS2K7nc5JWc1dXypIDzV0LMoD/4bEMSPgdEH1PomHLbt4OW+jjaV/5r2dS/gyS8HPDiQHxn3G1uWQO2Vqmvj+R9aJzJssCk44yOXsB/h1nt4mc/DEhFRJdaL7Zetf/+BFU9+pvyiu/uRr0gZvUDKX6hSVXwNY+6yTL44wm/kx2HyFRh0Lv59LIgjOMlU55foMDF3MHPIew/j8K+H4Al4x8ns1V16ljY2/zpuH4gFlVyLn/RsKEb/9PzDLk8EdQqG2PfILnV5y9EOFXg5ImsnLQlH0Nn1MCwlzoGY5x//4iKHgXx0cch5JU8AAAA=\" x=\"38.58\" y=\"15.93\" width=\"31.56\" height=\"10.07\"/></g>","chart":"<ellipse class=\"sh\" cx=\"50\" cy=\"96.0\" rx=\"35.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,UklGRioaAABXRUJQVlA4WAoAAAAQAAAA5AAA5AAAQUxQSPUIAAABp8egbSNJ6yx/2O8dgYjI4bcgS7Z5yEchdxOC/Jhg5LaNozhTtjj7/wdXZ+s1ov8TYEIAvnuOBFw3jikMgJT94AJAV4AI3Vf1FOa4hAfiyFKrGTsJsZvVWqsqVpB7TkmJHMAM3vj/N+TI/7/n85xyd3Un6aDj9DAYz6xt27Zt27Zt49rbWNs2xg52MmGdC93JdtfWnHr7HRETgH8KkqDLlUEQYyiYqLONBvnzwoUxhbTdyla/bp1y4XP5J88mYwiFn7Jz7S3TypyMSSBY/LfpdswQwqisbp2RqhvjJyUIQmF40U5ZERsoE7bbUp+eNjFbbVICIPIVgrVmJOKBkHZtx05jU605J+0LAYAYWaFhRor6R+Fk/fRa45ubLcchCGL0hJOS0HuanpFprV+rwc2mpAAAopiE1ks/XTc9nZ1amXFJAkQMpdM8Y2Zja9JKSAJEPGX5mntOr7EkARBxlalt9l4vLQAQMdbd6PG1ywgijCrQNpG7fa5PIpRq2be92tb6zHInLMHcD7qVrrU91ynCgsHuIejahEeXCIRVQdtZfdL7KjQ6b7Rd0g1AhUBpHYzx78xbGYClw3D/sMbB/PKtL/qJ0qvuz5crjUPnJ9/AAEvX9fEyrRta/MaHO3oo/XDfELQ+WN45jBhMxGHZUG+UTgFK81Iz223gl7tLA1XVp3lyw1oBnIhS15qB3i259/aBD299sWTzoflq9k9vno3YW/nqNR5ib+7tCwzE3va/Xob4e/ur13ixJ3PZM56BuOufsRrCS327ZiriT+aRNpSSv0rXDzrjskxJZDw45tOpiL3WIdt5CDeFjh2yK0JurmZq2DHbIewyB+2edMh2InT63XH8pbsi1ELLal652kO4qWPNN/smYm/H+eWIwY2NiLv29MtrEH8PuWoWYvDaiL91J+L//v9PzhRxiGWrV4ZvjRZHt9wtDy4LW/s2247VLroOwu1lNhzjCsRbq2V6ziXibm5sUiD2eo5A/CXxv+eygIo1FEbaBjDU1Q9AqXjCVHP1GrWE6nxrQYChZV0BoIK4YTRtfER1LkWg94dfFHo/+HIQwcK5/Qj6hxkPCAx8/GXrDEsQAAIFDC7vVhj49rOVqufTRVlXlkvdE14uC7x0PySIERWUAlTvikD1fLbknIxMCb0TfvuuF7y4i2spgPiVCgCUWnFfRkDzjZb97nxj9fsWVnsgiqtefvcC6L4SZe0NrgEQxT6904L+C8dMGABR1O4lcw+HhP5zSJoAiOJ2X/IHxEL2LBxECU9HTDQ/+7r3hx++v7V9FE13wGwo0HO6jAv+Ky8+NWXKmT//PAoAtRcU+BCxMf3sPYjB5jL83///9///1Lj9NnEosXE6DtUcCs0/96lECJJ3QPufeKG+dDeso3+TfnfRqSWLg05d0/hS2XYMCOOeO8eieNx+Vhya9VwmDh2ZgV6SkbT9FtBMJx1FiY3KdaNhYhTVHgbNNDbfJopuhmay5pKjo2iMbjjr/OH3EyJo1UiGx5x82Q+L14+g41cJfi5hMiSpA97ougAR/MmHBX6eG2kzbzty8yaPoXA3e3L+nyZE0Px78pZehEhvemGDbdZqLbMYAlZs8+SHr6WiJ3/wkncR7VUvlmVbV581oYKlA73J+9/5VEsU/eVsRH3F86Bd1bbR6pYoHWCUTznqhGzUVO789L53RJ15wvMgIFKpFaEAjYoZaxz87N/53APAyqFoSC0/tQeRd+r2AAiKPokgBACEtf7zi9zLAVz+0muR8P2ByxD9FkZ2nV9UsSjEaICGS37MAMDZ84+Lgt1PxSqQ2TVGCpa90q2KI7Izp5UbHEXmzO9RsPbWl+71fW8Ulu/7RsjErteeda45gonBUHDrlzpgizC5vNXcfiTV9ZefBorCzD4br6+GOgdGsmxRCFkA+PqckbbbH7j6nXDV3gzg1pcKbRz8PRTpe9F16KF/mB0e+6Q5O2BksmKdNrs41Rut1mAEP63gIAKARkurM4KWy/HtTlFg+pYl0F+Tgjm/36jKrtfuahzp+UZxoCBBu6ZmXPN7PXZHW22N0DjAzjWwKAM9QyYJyoTXNUw/KQWoc25biyiGWvjO8nQeyHqAAKH1MuGwKF1fLGsSBEAK6D9BFDf4+evpDoi4WzGrzUP8NSp8O4g/ECxTsUEBYJGgPCUlGAsw1GnJYgGsrGZMWPGVy6IxNW0dG3FQcajHQPHluP3rGAegOoN0CUT9fvWIhf2fBkYJYOZkd78tCIA6pxa98fNwKWD+8v532WyGUiCfurb08x5VEvR++XLVjAnemAYB2xMEQR0b7htGiYNeI51ItjUL0dzhSz8tBAtQp0JKCNcCa3OuM6kjmakyAYPIpy5RMgQjUlBWZBJtk134beWE8Ow8gtrD8nHJ8OSTwvcly2ZUEMmOZgnhpyQAwQLUFFGzfoMRKgAEIBMS8HJZAXtShwvITJUJSiKf+gF3+vrVDNlohQBkRUYCTusUl8nWCkJ4dgEC1AaKKedePO23U5AEIJO+ZHpGhky0NxsAzIwDCBbiqg7w19wsiygkAOkZoJvLCoCZdauFyFSZACVRmKsqBZSNG2NHwmiFAACn1oPdOtUlq8YnAdBxBQAQXNUoqL5O9BPRLADh+xKibkqSgDl2ggeIZFoCAMk8Rp4CEAwu/eY7G1FOALBcAcBsbLIAq32yB4B2XZIQEqNkFCkAwXDv7MXvvPWDirTRCxIQFRkzL712A2V9zmEBxxXIJxgZClCqf+XQ7O9nv7Rw4cJ+rGJJ5JnlDsxcq4t8c8xED4BM+wRAcgT+JlSBQKkVnQM/fdb94xfLlg4orLIJ0HZEAaOh2QKYmD7eAmDX+gRASYySoVAFEAQKvXP6hr99v3O+ayYloY2CBGBWlguA6TWbCDAzwWchx5EYkQB/nYIqgOHeAaDvp9lDatHLy4PORYMBtJQEQLPcASCqp6cKyTETE4VolHsoZv/SQZXX/dlspfq++a4fA0sHFQLoLZFvehKFGpvtEcrWbBRFCBa/srRA73cLFIL+PgUo6LcgC8Gu8VkE9M7rQ74KFOKhQHED/NdOAFZQOCAOEQAAEFcAnQEq5QDlAD5JII5EIqIhlLnV/CgEhKbuDA7/jSzq/0D8AP0r/wHQAfQAt2h1Pxn5SeCtvj0H5Me2Pb/9N6s1796FnD9Uebj/Xf9X2K/pL/he4L+sf+V9e/pw/lX/Y9Sf8z/wn7Ee8f/sf2j9239+/wnsHf3L/Z9ZJ6DH8a/1Xpn/tT8IX9c/3f7ke0D/9OsA4Uf+lfj74R/478ouzJ93e33MlaS/uPNb/J+IO0t/oPQgZW4OP0P/FfmZ/YvSUjrPKK8LyPj1XP6H/k/dj7rfzD/Mf933Df5V/Tv9t+dX+Z+aTqdP21QJSWPktlwKCXh4A2gn5A7WbsP//7uKKfqDtQSTXXZi58YABP/FIL+hVeyem0n4hrKhukcqbrtMoS8+B6RjDJT6dFJSWPN4Ub6cLtzp2b5sdNwvxQPQ0mVJGY8eKQIhSqK9S9EtcfLgFD8WDajxX9GZ6CEHb3jDr5NnNufp/QIe6H352NXL8Av8X7NLCq41jKW1k4w74Kn9Ww8Xnrns+jGGWv+xQ21Uz+8tSNR6ddT2l8Dx8fs0fOjLjvwcuDefacG3ygLE3afw7FrHyphMyOJ7HCOY5JJWJpufJl/zSCVh3ScrBjX1MM0trL/q6Z/wd4PsfGo4LA/hENv67UQHfBzgEx9AbhLdPgcqle6zGejLUBaK0t8YGTjn0DGVVdk5fzP9Tisa5W2qi12VcNZXiJv1Rcygqrfca0jgcoQD/2QuqpsgUTIzuGfLVDZ/D0cgyqBTsbJvJk75sAUCncvulEf9ND82fjsgMh7uADAYZ3BJre0rAhi/04aVPUc3GPxjho3P7AB/DYSaSDSovUuT5XJB+mm7zbM7R7vv/ThzWEheOF1QCx9Y8FIwYTghL2FWamC9OtH7f3P8qvm+J42/IAnGbo3uq/wT8gZ4stONzgWZxmvZqDSCg98AAP5hkAFOUf+KOixpNjA5hh/c+qn5MD3/GZo6kn8QUjiWhIK0/bouc39nzuu+/ohUqIpK/ZOMsRxKxH5I/Mg+NKPfnS51dW5E2z152R7uxE+QOqILN+F7VtWCk8jbAubdlXWSgXuyUs/+IvfFkyUQx0HhTTqtISjH0Qdz3esPML3wvtbddqLbaVhUWyg3b4yjqhjZUpos8POSlEDD2CTMCsG27G22IIvzyG9yoAH79D8+Bc4p8s6Kn/mJpPgRH66dXX+6irZmpqS4wjDMrCu/5mofdZXaL0/Jeb/qqPexXjnoh3UplU+T53REuo1fYBx4euUWiMucnvi8TdYuEeoGoJFRxUFWDkukYr36PgSa6yVQFYlYbhSdFSf6i090N717vf/LcmknpAH+kIzkFKTNz1WcXxO4FWprClnM7emUwzDFgQ7/NvgcK4CP3z4yqz+UCaGwZdM0/Qf+2cbabkvg0fBnm5oHyD5pBv3mJDWyqux/Gx/af/HJVJrzJrI3F1uV8Xtkzd2Nanu54A1R+nXX6yKT+mbRB9/gZr/E2ojsMXiFGu2J1wuCVAUESFmtDhq403gSF/dYwGFyoDvy6ykUdWRjctUvUC0HNLCm72IZJvNY1kt7PnlyjpXhy9zpZh/0NiGOmrb/jrDr8xWCOvFI5B68D2koJa/LG5//jaeW50DfbVWDY5DyY8yiVYsM8D+A+bj+CigKhL3i6k628MxV8/urSS48uuATsUvtJcOf3wWdC7A+VZ/qJ+eh/zph3XtezeJQ3R7gFr8BQBLfrtoef7jxtJREeOgyZm0Yf/Q43chmGnNyvMJuyGdvrmZqjhEBbZ67EMEMVGHr57bryANAkLUIOjumvkHvSDGBTg8f/yh6qiDP/+UEKdlS9Bhr86CZFJbQymxPtiCljlxB2uANniOQzLIt72HdOAphpdUI7P3w+fXOYB8AWRFBYuC3/q+KP/TD+Woqyf8kORk+ErVue73fx1e+8fmFyik5mE20FXZn6mqF7iTBQASP/PG6AoRP1A7Jbuy59/8Tmg3erT8SoXiDKSfYF9p1WBXuJ9z9v6erQAAAAN4H3nex/mJaRMy41f6v8X/p99DFvhpQc08Ajk1TmHJLUHE6hIx7uiOsv3wgyrPVVElLcluDYH6TaZrI12MW7SWlxE+G5JXqcH3wfsoWAF+tuw7VL/5lxNULrENsrWSvWfluL8VCkc2bLu+QLCEwHaxDX8gO7zzCkbnjsvkKhLSwep8DOigZ5fBQUCK88mT4bilh75KNPpq1ijgB0KdqqPwL6K8f5LfRjyC78AlaR96rMm2xz4sklqAvCGCCkcIHaAHbv+R7m6EL8xB3+pH3LCRr+Xsquwt++rzi8EtNRdrr8WeOc98uHyPGVgAbMtJ1ZLFBf6ovALM9IJqpEArYJRke//wg3dfjl4cP2PWGEKpPSzgFDbEz+Fe/HrEQX3yrjo2CfAWVuvtLEY440esj+fijuCJm0fmBmeEfHu7jxzHgYSCb62giAITLlUI8GJVDsJSc9e/VgJuTkUNlxqgZaVtCBpap08IgeAa1eyn1f/f2Jn2C/1tEBmJkuQcLb1PSTQYNDPHDzZHrkIkcNPxngq04+XXCjNImBd2nUuvMQnKa/Pf0bA9L1rRlTcEBPDwzE6nA/eRppOubpLEavSF6iwhuKy2krOMbHvr3rBoZhviQxULysumCRDMa+7iD0ueMgHcvVmRex7cfSX+awfH2fH0vpoyQ/O2KniupVyq5Ir4D+7ucLanyEH9P00g/y7y7q/VZHsAAAAAAAAGNTUz/IEOLrSQoX1wD7xtE0pBoV2m2GrLYuiV+eR237m2SStl53wAa4RSmeVpdOMTGwBPAABDU1CadHmoubZZDVxAgcBh7fFSd+37CTX/wq5K6KNPkn8HUJ/iUoUgfh83TblsDxzb1EbLnphmPEQFD5RwZw4hPqyF0qZ4ocMYs2NV9NXfqeAw85iHr5MRRxATfhsXkTu8IqS1Gr8M2ilyoVcTF4NQRAsQRjJI/8cuhSVF/EHr2xepI1/G6n65Gz4HrVBkO4tL7DYsf8iV9iFNwQvFLxdiZDlHjeE9nggC0mUDgV6Q5FkxdMmSJXpK3npH7ifVd/Wq/itmeHF9vLXEBux1YIt6ePY3cQJBSPxHQLBRm+Xd61MpYqjnVkMNNjQhEm2VzeIQziEztPkDhaGsnofiJ2PzEw6cUon7SATjyad3dby0TFhH1TM51KaVGemMKIvSbsVi+6FOtPKiJQwj+BEX1Sh3FpCIFIKwCi3EIN+yJ7h3IV7Nc+gAHRo6NS99eevGtD3KV/twJqfZjjQf1KRU3QDyVbL8qQ/8Mfad9EnUrTrtwpolG6M3nn18JTWfMXK8ocUfFfbNjlRQYJ6ft+rorxUlTEu5UTYfPRKgD2DKBIp3dRHlqKBCe85T+bl6OCtwl9iAhmSKYaAZBP9f32gaMVcBQaJK5I546VdKU5F+fgamyvjpKtIPEOe8GavjD/Wg9+CIeAwB6jKu3BxNKhC+z3AmpeE/xBLczsgGreu5JiqF8ZRCmy9auCxZ3s8Bsjc3N26Tv/u6DqB7rENFVV3wUvYaYNHyiYpkKzPeOUf3HMLdEhYY/l9d/mAO+S+h5/3s0QxzwcK61DvfTBv8Z5V/mND06D+AgpbztiPHc/nR8MpA6Q0/nmlRukTZP5zRIpRKHb0tLXgaHELFiS8LqY9FwkvKsCld88sbevZeNc4MZBmOGfMpxFeJtu0WynVu9H3SG34Lz6da5Ox38NWyJHz1qlQVmswvigDck++cIF/QSc29d4J2uCKrzaXr21ShJrrBQa+KhRKZind2DwZ9yA3z4+mFKRUu9R1qKB5m23L6F7wBwfnXWu+tFhda7HGX/omnPXf9+1sPJEQJAX26kKfxXhaNDS4ysmYQmBcL0JRrl53DrPyquJvxXXQVECu2WLvHuoRBeF34hal2wP0eSmQ1TZHAJUAWC7hYSLWyhsLip5//aUAL+kdfHE/xYbPQANTHe8fWXbpqtQDkseByPWPM8Ejp7aZTiAT9H6lAKn7cirAWmuto0RL+rUSBeQSg355VEQDoNKNLaZAwwrRGTiiPs+wlxLFjfwwLTV/W0kdnEtLdGJQsHiy1jENvCuSUSRmKM0RuXaL5r42DS63zjebWMATGWg6Tm3CuVUJhqNu4mLWmFPyWaxUVPhtMNtmEyL1IFNLUJeHA9sRMLf79Tr/ZAn5YWLTuN5jfjcXu9roz3d6ZvEkAJyp4V5wSjsHn53w6VC+kX/8XChY8NQlzpMKuw5JYmh0Il9M4fCbaJ4DNbiP7dP7dOs7z2sESXZoYfqMNfOb6AzV+F2meF/heYPowyRvu2WEOaBBzou1TrIm1BokyMWcaSOuD5i1c8wKOqNDtyFBaZ4ELeRajzWFBB24NP/TevKUt5lyvfQ9kNLLi5J61QP7hPY/f43VdP20Vl8O6OVxYr6DDgCBIRs5jta0N7n2tuiNxBKaL8W3+CovlsxnxaNyBscW2Md0/AvfflKAf352ehmIs72gX0XL4xDuFrejZeJ2fL71uvPihfJPqqIqqPOgQCilViVI8cAosMT8z/OW2mdlSsWrR9aaIgiEiZSbamck6OZ1afUClQ2MqqDm6jk0qK0iX05aJJRZRFxmfcA1DWyBerVcPBc/d8MLGKDP3Pra7QFw1lApyC1nctxOJa26jJOLbc27sG4HRJiyCzbof/yV+p6/MoFqRVzUIORfaVvVYhq9j0d+gnMLgzOFHqvRhHdoubxdHyUJphjZIuC6AHaQDw14j6wOOEjZIlVjsMvW5QyorVAzjG3QOheB2PBpeazUBMchlQzWQlJuoXbgnPXnZVnuCV+rsDf2rAVVJJmhSzxXGwz6wNkAGdcTowR+TUolwupk7177trWJuzIC9VNnWSe+13g6gp5E4fNjTGsNwrrr3uiejNaRzY+gkQn4hxjzfiqDZqVDPsDZERQeibTKEaG9ND4Ij6zf/f1x7YXmZfJK9in/oVf4I3TbQU/bX3ScmNBXhIMn25UDfIIeY+l4TwRuFxGobNsbFvLcNnJr3ScUFRfAFxO+35BuswFycOeT/CajWRBM3/vNuaFzlTH1gECyFSrqUvF19toKQ+ZbZzzJUIIs3esIAqzTjasADR1AViFEHyBU+A+uwmb1AXexBekUTHrvFLxhw6jEgCJxwL9Nf75JEJoRnjMYDsUJ1aIr1pJWbGnSO7Y/bWAKt69tzjReWRZaD67T02A7dvRzmP5QB6YdLvbdxWOcDy3JcfIXvywRsK+5YoNs7Q9o3A3MJNYNKpNZF43HAzObSv6IKTlw9wGLKeKf0aghcsCH+nivSQpA/9EdEkJy7nHKWKHbkfKJW4ifxUbOoLWZF3KpMevu+0uRgIdOAhjprN0/s5Wqn/F1klRmYdVd5SihE7d1X8XXxoYMezRYPUfZSujIP9NWhtF2pn39Geb5BxoPmMV0Y+FA+zNUO9AKQpAsUo/tZZLOGOwLXF1JOT7+VSqVXG0sNrHe38GQZVirsS3BfODf6ujzQf4UsrHqEwQmZoqXvMJstSb6iIxQV3UIj088PGNw3iWnPxDzZezsbCH8ViZP/gDnZ7+YfOravf0awspXvAeQVoLvXnNnShHjl8Etym4ZzCYCVbYA/NvxF2fmGN4mk/n6Knd5ws3piHgbx45rdvCH4XVacCd/gPftgNeMsGy58vCfB2du9kLROl3lSrPTEe//bVkFnnFGoHtnDtb/A7JF3Ijes9cwnH+FpD0+Sv25AwexPey70gAAAAAnmOz2H6kjFRquy0jcTZcNa10czLCHpIJ7rLAoKPmfYwQ2LPtbc1FaGOvlUnRZhwBv/TwS7wnefeR0eU3I2jS7xnIv3svb2gAA==\" x=\"4.00\" y=\"3.00\" width=\"92.00\" height=\"92.00\"/><g class=\"n-arrow\" style=\"transform-origin:21.5px 38.0px\"><image href=\"data:image/webp;base64,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\" x=\"19.69\" y=\"3.60\" width=\"53.09\" height=\"38.01\"/></g><g class=\"n-b0\" style=\"transform-origin:20.6px 76.3px\"><image href=\"data:image/webp;base64,UklGRowIAABXRUJQVlA4WAoAAAAQAAAAMAAAcAAAQUxQSDkDAAANoKxt2+K2eb9/UCwzs8Nyysywzq5HiEfAzMzMbI5Yskaj+f93IVfR/KvSIiImAJa7SlslTnG7/J1FEszN7EzvvmuJ+EGpsHmb+uTRdxdtEKdQ3lw8+HLv68ZJZ8ZPTXlT+XIlu/fzC8edpHDzg91v0vGDqXOL57KHTz31TvfeK8sb6jjOfJZKpnIxl9Rff6naXnr4hu1yu6eNzg/SkKkLwTdPHuYmFq7cHvbbiSFBYRo4+fxkbX3yhju96kCTJFIWtzw9nZ2YH7QTbUikrybXzy/UT7QxJGGjWnpkfb9PEtaG103GmhTYG2y1DGG1cg1htz7xAohVJ19NrjsYL8cVf9O4rgS5NoJqXKh/urriQUYhABIJx5Z8/eulVReQIQIAtY4PjqKlseHo2d7t61kHIICoa3Dy/Z+93eqUMz4evP3nynYmhxMD88f3bUBLLhSkaQ7f+64m82q/DylNBhI6SJ293T+6u0YJBBabHv4/UZQSo2mNqFx+a0mdfHtswKjP9DIT09fN+R5MnIDRjz/F6NcTgONSmeXrdvzjVqRN/uKsElUuOab6Sc0g3msYTYCjqez6ddu6OzAkqQIX8JcWXJm4VFSM/jzs/lAtdQ4Go+SWdjZ0MzHEiCKKEs6GQO7Cigy013j5l/5pKrty/bleJzEkrlEgAsAtZLLnprsF/90fTnHP3rgVd7UhMWYBoHzHFG9ufjLkrj+YaSaGSFUAQPLSBuCfvbM6MCTSFwoIuJVba5qEvc7GPccDUiwq3icJKbA4nI9IgcWqiJgCm4NKrAmrnSljLIMI8fc0xTL2JIRYFf/kbTiwOvnVXRO7qOFY9p9cBWOZu5wMaJF4yFU6xqZwLVpY7tCq9ehMkFAsUr4pxhoWCwWOIcWe4YHxBXb/Hq2GllWTSc+yzSAixaqr7cmiUGz69tPZm7JCUTIkNrQ+/SifE4Sbi8rJuYCkh+j7V5uEE4ZSqKyWXEp6jKt9ovfTn0Yn67fOO6fIEP9CRqBgmAB0r8/OFz/L7NpaJggVh8REfaqshxHFxA5GZbz73q9u6K1uhDg1+uWPJH9ubhTE9ZmRgEGz/vsvUb+vT3MCX+lePJIzUwAAVlA4ICwFAAAwHQCdASoxAHEAPkkijEQioiEUCwaoKASEsgFyA/s30AfwBJYRq/SegY2F5bzd7S/nvw3z754LbX+L/SX30fjneseYD+Qf2b1pPQv6AH9A/1XWd+gB+wHpnfsB8KX7Wftz7Mv/4uyM/V8Dv6X/qras0L+zfsF/rD/v+BGQoOTMnlz3ooczD///787b+T1Uo7AXUTWflyYJsIu9fd038uzvRWT3cLPQs39+4ObPO7m8FkXp59FOAHTJDd2XArmqOqZMl9y5A9rnJahWl9OT6gfP0eAqN65Uk3uzaDEP9upuCi9qePS4SdP4sv2Xh+zONb1sAAD+7y/+uxh5he5ccloST93hcD73/0vIRT2f/9+cXxya/9pmmu8evf0QVGmxpGRGgdDQsT4Nep7uKnnBDjdXgnsucrWQ5qAH5v2ukmRhh9zGVkQ7vl4hN1llexk8JVzIRn82abvG8zqJMUN/adxbIMTf870AuIxaBDo8hfYN4FixwHYUjd+CKV0VGRxJoNmgn4S4X6p+oJOST5vyooqWRncNMXEhOjcTwW2l5C/74BHiZssKDw6VMKl5h//bK/2Bkxe5ax4ITruGwAigOgz3JbtXzOgrp3UIToby8Dt56ekAHnZCEOcfwvvKtR/NKtjBW2Z80nAOFe3CRqUlAF4AhoeZii01dyaPT6Ozcws2L75P060oUF3ofcT+1V+w/dcApEZ6Nv2L/ezehtpYQ5CuQKLvHAoh0yEjHModf7OYdP/hpXyGigdMnV95E33EOgBBl79fG8mRP995mOvmBT+H8xh/n0ArncPKGIur+/DzVSZLjetHCky/8VWdd4F2iBh22jXQ5O/81o/deEt7zVp5rtEsrBkwtScNwqybW/vybXAMkVrv9l1yfSS7TNffKSFJCNQEK/Hfq0NgKTs7SiW9jCQhoCV8dn6o028hd9+5qUf1Rj9d++lM8C4z1rMYwT4vx3IFKxyHx26/1rivc7wJt/yLvf+/uxIFn86Gb+w6uB7EvZmJivyM/XvvbZ6FnvoUqGaXJg50SdwbWp7kQmSIEJsZf0zcN79Qq/SREkrL8almBHZQGK94Kq5oiSOp+TKAuwOJrF/nU3dsfid+hrxiGdeEsQHEKwit6gIJ7/ik7DpV8FFqMFNInZR4HAGVc/bhE7d+Q4hcWNUH3fVrTaOAdarE1rUeWloVNKEuvXv9XQTW8RIBQQBWSgfw/EH/Fv/zMnqZ6jX9vVIhKd/nB5/nNsowAlQrsrIGtC49EPuPrK1TuLLuo0AY+8fan7Z0xYT1ZU8xFrSX/3FCd/QW68NDARDokVlKZ0jdA6lkT3jLiU4lax4oHF5VRy69T0ibx0lxzA80Rk3y5q86uNpYd9AJs+5iprf1xg5tRMrp0bbFiK4JxmdzMb6uJUNPR2loGziYuf198boebhru8VUCX/M4oukvuZR0ohKzixe9Gy7/SOpz6n5J269FcepeUon7cQhb3/pjIRglcOVvh3QnxxqtbTqGxk0R+mLNq7YGQochi6SEPgpu1W1chs5rA8pooGShDY3v2SUWRDvHlzQV7RhOevvKXcGH25aNz2UPHq5Wk5iUKmK2FJ3xoVh+buim6Mmtwa/G3+pKbuwV6Nbpm9HFGB3RGaRzfWhc9ua2SMf0Pk4ryxYPMxLGo+h4q+Pyqm9ganSlmc5w5tm+ZsFRcVrNv//zRD5K/+Lrf/jF/zz7FA6u2EQks9J2vw8EMzwKI/gtxd5yZd8nGB5ghvJaZgvJ8w1c1dMUZ0AUspAA\" x=\"10.94\" y=\"31.35\" width=\"19.61\" height=\"45.55\"/></g><g class=\"n-b1\" style=\"transform-origin:39.3px 76.3px\"><image href=\"data:image/webp;base64,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\" x=\"29.34\" y=\"20.80\" width=\"19.91\" height=\"56.10\"/></g><g class=\"n-b2\" style=\"transform-origin:57.4px 76.3px\"><image href=\"data:image/webp;base64,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\" x=\"48.04\" y=\"14.76\" width=\"18.70\" height=\"62.14\"/></g><g class=\"n-b3\" style=\"transform-origin:75.2px 76.3px\"><image href=\"data:image/webp;base64,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\" x=\"65.53\" y=\"14.76\" width=\"18.40\" height=\"62.14\"/></g></g>","set":"<ellipse class=\"sh\" cx=\"50\" cy=\"96.0\" rx=\"33.1\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"6.49\" y=\"3.00\" width=\"87.03\" height=\"92.00\"/></g><g class=\"n-sp\"><image href=\"data:image/webp;base64,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\" x=\"70.51\" y=\"4.24\" width=\"22.07\" height=\"23.93\"/></g>","clock":"<ellipse class=\"sh\" cx=\"50\" cy=\"96.0\" rx=\"31.0\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"9.15\" y=\"3.00\" width=\"81.70\" height=\"92.00\"/><line class=\"n-hh\" x1=\"51.7\" y1=\"47.8\" x2=\"51.7\" y2=\"30.8\" stroke=\"#27315e\" stroke-width=\"4.4\" stroke-linecap=\"round\" style=\"transform-origin:51.7px 47.8px\"/><line class=\"n-hm\" x1=\"51.7\" y1=\"47.8\" x2=\"51.7\" y2=\"23.8\" stroke=\"#27315e\" stroke-width=\"3.4\" stroke-linecap=\"round\" style=\"transform-origin:51.7px 47.8px\"/><line class=\"n-hs\" x1=\"51.7\" y1=\"47.8\" x2=\"51.7\" y2=\"21.8\" stroke=\"#e0344a\" stroke-width=\"1.6\" stroke-linecap=\"round\" style=\"transform-origin:51.7px 47.8px\"/><circle cx=\"51.7\" cy=\"47.8\" r=\"3.6\" fill=\"#27315e\"/></g>","bell":"<ellipse class=\"sh\" cx=\"50\" cy=\"96.0\" rx=\"31.4\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"8.65\" y=\"3.00\" width=\"82.70\" height=\"92.00\"/><g class=\"n-badge\" style=\"transform-origin:70.7px 19.9px\"><image href=\"data:image/webp;base64,UklGRgAKAABXRUJQVlA4WAoAAAAQAAAARgAARAAAQUxQSMEDAAABZ8agbSNJ58wef9D/HYKIyM0PEbVyiQjjSI5hvM+qcoRp2SlHEDlyrcZTLnlMKGjbyLle8/v5E14YIvofEZZUaw1fMNYRPTOP8tP7veEaG0CyDVUXKGvbnraZ3lcyhVPmf5iZYTlHMMcyR8rMUObWSWzZ0rcIOdJcs46ICcCqqTUBwFmLYFUaM9vajQHI5PzCOlM5/5h1hk824+7OMzEBN/7zxBSnp4+PzrNk96kXNo52It1uawJS5YWb/Ht29Y2pnEfJ+t6Hzxz1WgkJghBABK4o7n6OR8aIH0w2n3r/2ecGiSJALCiA2Emmo7Ex4oHaffGjV59fj0EQSwskbrWztBgbWRWj5188HEQgiCYFhE5id3Nn7EpUO7HdfkKCaJ7UvK8OslWw/8w2FAlihSQIp3daIo2JtPY3FfzUnchVTQnjtBXTC4KMEqfYiHJxpAjQh2lqG8XLqdagXRICr2urlol6T7/68ZEl4bdYOxrLIq2XP//inY8OCe9ldHpsFnCttz77NEs0AfpWnP6rZJ6ters9EIT/YsvUzLGSJYpEiAK5SycyQ0yJmAhVivihmlE+SKTAUOBSVG5qcnojCFckdeMKAIvSkQwHOk5rB+D8ngpBZ9rUANNWxKCYPvNyB4i3N1pgSNCDzYFCvPdshwiZzA72EzBONALP9nZiAAQDU1lC/AcSqpWQDA5s7W+rtBuF1316R69vtxgaoixVprAInSBwez6R0GbaWvA/USCzJDDURekgThC45H+eWzd+rIKbnFy4UqJMMyihKzWs2j3oIGxnVAxkhwcdMqjiVmUQJu2WCklQXlMBjmsbMUK2eRUDQLy1njEcoTkp06lqVCcKDEZMbjjlbJzGCFXgLos1zEx2nz9UYBAEi5MimqXWXnk1Q6ju9G4Nc6Pdt9cJhkBV/0U1j71nuprwn4DCrcaC7KyvJQEA9uZyDQunh0d9+ketylu1mOr3ItA7scW4xJIkqOmbOT99sMsAIiryLNIOTUpdayseidV11QjEalOLHwKR2ignzQAJRUQgq4MUo1rFaFwR9WMBQFYhApHq5HxCNgdIfnzhBIA0B3HF/ejv4wIrlfz4rLieOADSkEN9+/cf53kpq4ErHo+/+vHfvBZAlhNANI6//PPBwUNbTZQkW2mmQYDzBALUI9vm2MJPV7lxvLtx1I16KQGAAgBuPK4ffr1WmvBWqqq781Sv/dyGApAlkwqA+fd0cvvzMbwWq9K27h8NCKjt/sW9APXl2bgajf2aJlSqCbDfvR0DkMoIRJoCAFZQOCAYBgAAcB4AnQEqRwBFAD5BHIpDoqGhGZu/MCgEBLYAXIuqwL/ZPyX9oGvP2D8M8nOXHsN/begj1i+Kr/l+pf5jP13/YD3gv9J6yPQA/XLrNfQA/bP01/2Z+Dv9uP2E9lm8ZPzHLjpH/xX+g/KPltZwFNVeqXoB+nvYH/W3/bcCaaZEKJ4yKGJ+2dWm9YcJFgymxVTk6yRX4lvPdj+CVre1ZvMC5peN4jn/eXVcl/jqJ6ekCyD/gNJ0qm6UX+Ts9DdK991TF7wcdJERWtUHqs4VvsOB1RHbG9W+H/LHAgbl3sqhmsXf4ukEJfyBnuZf1BsthcDiLuEMu/Z3SnSnzggAAP7/nR5//DSumfnTX5fwDdk/BPc3UZDer1/iWVml89KvA/GOTAuL4XE7WjCZQZ7p4a8EH1wn/OiQ8z/KhFM62SMjG0d//luAfOus07y/zHVd7bR/sdAylNngL9T7wtodMM2zwSjjfyQf93oTbdUBjEvF8fVWcdyH8/E49x5ABapzaV4LSjwyi0U6LIRsX5TBIxf8v/snAYnrQmr6C9j84qSY5NhwXPH6AbT/8maIZ7/eL2ZACiqsafX5fj1jXmruX95h7Cum7g45sdpy7Qtd27Je0CX21fcDbmz9TgWLLIXockDzat9nG09vCfw9FSYt1jsrVmQSBzpkYnoqgLVT08dqy7kQQAiEIzIyb73vOb7pz36rAsjhk4/Hp3xOJq+9ZJb6j7pni1cb3H5YReStnFd0VTvODHo/7EMYv/zkp/TKwxfINsQf8y6ulh8X1mAVGdCxDz+z4c7E+FWbnUIx/xggvyuu8zLUgQulvjBviJ6HSOuZ0XlWnk307/rb+D3YAOSIyl6Pbypj8mOHx2FsGWQ08YZuL/X6m4g61WoJK5dUTgqv0mDuUX3XoXySDZG6EMwyge+/nlLV6e5NCfnBDVbVH41HQofFeg17o+iHX3pyrvaQW8ZjxwCIZeJ8IHec7eXm9UVQndxSrhUDWRn82FOcZJY3WFztmfL2IkOXMTpQI9oKftyxTwNmYkykXVRT3ybqi98P3iZtgT3drMHvp3Ugq/ZNRNPj/Ukw9qBI8myh+9zQYHNrWq64Kqh8//9Q9uhsQpMVJWBf9F+8C6x7jAwGgOusJQBOFmCuSHXZ/Y7LNDOLoutQthedzA36/vlj009TL6Nu3Ec+DRnFt9mgRa9DlSHlOnDYuaGo2zGKPa/Ylup7+Fzr9WM2U7ZuMv4xhLqkhYrdg7hQ6lyFLlmHmm2/8fMtl3jhxud+y4ZGmyQZHWHguouoeA/3tBkOye7pWi6ITQuQWZU3CaQnzD/vqeUGIg+NtrZUsSwTo340CJr1rEFj/nvcwExxjUnY6t/jJfoxfBYOpXOtbR311rvWdvQsgF3bKverPXK7LImrJvOTP4kR25waaqF3omQEYwb4rHzp2EebQ95rvX9U5tlUqgG2DmqpqH7a1Bh+wf5shkK0E32NVx+l7LSE7jADujfzQx9Q97JCOKvOTTeuUwgKuSGM1HKs/HeR1nDj93IuHCVkCfj6UbsJLHCi8pixmSdw6QWWwh8IC5jB9kt4COqT6NGfXsef1V8LYV75wpE7CEjLYcLRO7N9CFqFuum/pgJJsxUlb/9cd9P+EDzW6Q9yTf90CdLVfvyPIK/nO9pGNEhln2ZjndE09vQ9e/6nf+Nf++06G82hseXlOfsOpav+aGcxMhA0kx4P+lI0BYje+tYrRj7DW8o0H6Z4hqVFr1QNqeI14HIW0n23wlquN8F6/3AT/oweUpm82uOwWaJHMEMrHIoXAsQudD7U5C7M4Um3BXbk6BPyoomQNYtP+2hqUKKl5owzx7hDC/IUHHINJF+yNWLZOPzICPSFOmFoY3LbMF9r4VnhqeNntdmP5Ay7asgPz0KSP/Phfjne7PWh+8596qBByZ6rX8zHeGKMc1//O//y5nugGxCROrXp8yfKQ+/iX4FkxAoAISSomDusfWjwtreWWf12GRyOvLZpXT9TCgf+bezxzPWN/RR0W2HqQeACPuKff4aelXezFWO0m4MtAOwwqryjbsTMU75fyto+W3QP96BnwCuXwAAA\" x=\"56.20\" y=\"6.79\" width=\"28.60\" height=\"27.91\"/></g></g><g class=\"n-sp\"><image href=\"data:image/webp;base64,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\" x=\"9.69\" y=\"4.38\" width=\"22.74\" height=\"22.40\"/></g>","book":"<ellipse class=\"sh\" cx=\"50\" cy=\"96.0\" rx=\"33.2\" ry=\"5\" fill=\"url(#lg-sh)\"/><g class=\"n-body\"><image href=\"data:image/webp;base64,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\" x=\"6.28\" y=\"3.00\" width=\"87.43\" height=\"92.00\"/></g><g class=\"n-sp\"><image href=\"data:image/webp;base64,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\" x=\"73.49\" y=\"4.30\" width=\"19.25\" height=\"25.45\"/></g>"};
;
/* icons-live.js — ikon 3D vektor berlapis dengan gerak ASLI per bagian.
   Menggantikan gambar PNG (<use href="#i-...">) dengan SVG inline: jarum jam benar-benar berputar, gir berputar,
   batang grafik tumbuh, lonceng berayun, panah menancap di sasaran, dst. Animasi ada di icons-live.css.
   - Hanya berjalan saat ikon terlihat (IntersectionObserver) -> hemat baterai.
   - Mati hanya jika sistem meminta prefers-reduced-motion. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);

  /* ---------- gradasi bersama ---------- */
  var GR = {
    navy: ['#4d5d99', '#1b2447'], navyD: ['#2c3869', '#121833'],
    blue: ['#86b0ff', '#3a63d8'], blueD: ['#5a82ee', '#2848b0'],
    cream: ['#fffcf2', '#f0dfb8'], white: ['#ffffff', '#dde5fb'],
    gold: ['#ffe680', '#f5a623'], goldD: ['#f9b936', '#d58210'],
    red: ['#ff8080', '#e0344a'], pink: ['#ffa6b8', '#e94f6f'],
    brown: ['#dc9560', '#8f4d28'], brownD: ['#b06a3c', '#6a3516'],
    green: ['#74e6a0', '#2fa066'], greenD: ['#46b883', '#1d7650'],
    purple: ['#c9b6ff', '#7f62e6'], purpleD: ['#ab94f7', '#6446cf'],
    orange: ['#ffc56a', '#f47a20'], yellow: ['#ffe680', '#f7b21d'],
    grey: ['#eceef8', '#b9bdd6'], lilac: ['#d6ccff', '#9482ee']
  };
  var defs = '';
  Object.keys(GR).forEach(function (k) {
    defs += '<linearGradient id="lg-' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + GR[k][0] + '"/><stop offset="1" stop-color="' + GR[k][1] + '"/></linearGradient>';
  });
  defs += '<radialGradient id="lg-sh"><stop offset="0" stop-color="#3c4696" stop-opacity=".34"/><stop offset="1" stop-color="#3c4696" stop-opacity="0"/></radialGradient>';
  defs += '<clipPath id="lvc-case"><rect x="10" y="28" width="80" height="58" rx="12"/></clipPath>';
  defs += '<clipPath id="lvc-label"><rect x="38" y="32" width="30" height="18" rx="4"/></clipPath>';
  var holder = document.createElementNS(NS, 'svg');
  holder.setAttribute('width', '0'); holder.setAttribute('height', '0'); holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = '<defs>' + defs + '</defs>';
  document.body.insertBefore(holder, document.body.firstChild);

  var U = function (k) { return 'url(#lg-' + k + ')'; };
  var SH = function (rx) { return '<ellipse class="sh" cx="50" cy="92" rx="' + (rx || 34) + '" ry="5.5" fill="url(#lg-sh)"/>'; };
  var f = function (n) { return +n.toFixed(2); };

  /* gir: poligon bergigi, digambar di koordinat absolut */
  function gear(cx, cy, ro, ri, n) {
    var p = [], s = Math.PI * 2 / n, i, a;
    for (i = 0; i < n; i++) {
      a = i * s - Math.PI / 2;
      [[-.29, ri], [-.17, ro], [.17, ro], [.29, ri]].forEach(function (q) {
        p.push(f(cx + Math.cos(a + q[0] * s) * q[1]) + ' ' + f(cy + Math.sin(a + q[0] * s) * q[1]));
      });
    }
    return 'M' + p.join('L') + 'Z';
  }
  function coin(y) {
    return '<path d="M66 ' + (y + 1) + 'v6a13 5 0 0 0 26 0v-6z" fill="' + U('goldD') + '"/>' +
      '<ellipse cx="79" cy="' + y + '" rx="13" ry="5.2" fill="' + U('gold') + '"/>' +
      '<ellipse cx="79" cy="' + y + '" rx="8" ry="2.9" fill="none" stroke="#d58210" stroke-opacity=".55" stroke-width="1.2"/>';
  }
  function tick12(cx, cy, r) {
    var s = '';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6, big = i % 3 === 0, r1 = r - (big ? 6 : 3.5), r2 = r - 1;
      s += '<path d="M' + f(cx + Math.sin(a) * r1) + ' ' + f(cy - Math.cos(a) * r1) + 'L' + f(cx + Math.sin(a) * r2) + ' ' + f(cy - Math.cos(a) * r2) +
        '" stroke="' + (big ? '#3b4a7a' : '#9aa3c4') + '" stroke-width="' + (big ? 2.4 : 1.4) + '" stroke-linecap="round"/>';
    }
    return s;
  }
  var STAR = function (x, y, s) {
    return '<path d="M' + x + ' ' + (y - s) + 'Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + 'Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="#ffd34d"/>';
  };
  var CHECK = function (cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + U('green') + '"/>' +
      '<path d="M' + (cx - 3) + ' ' + cy + 'l2.6 2.8 4.2-5.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  };

  /* ---------- 14 ikon ---------- */
  var I = {};

  I.academic = SH() +
    '<g class="a-book"><path d="M12 68q0-6 6-6h64q6 0 6 6v14q0 6-6 6H18q-6 0-6-6z" fill="' + U('blue') + '"/>' +
    '<rect x="17" y="66" width="66" height="14" rx="3.5" fill="' + U('cream') + '"/>' +
    '<path d="M22 71h56M22 75.500h56" stroke="#d8c598" stroke-width="1.400" stroke-linecap="round"/>' +
    '<path d="M14 68q0-4 4-4h64" stroke="#fff" stroke-opacity=".55" stroke-width="1.600" stroke-linecap="round" fill="none"/>' +
    '<path class="a-rib" d="M20 80h11v12l-5.500-4-5.500 4z" fill="' + U('red') + '"/></g>' +
    '<g class="a-cap"><path d="M30 44v13q0 9 20 9t20-9V44z" fill="' + U('navyD') + '"/>' +
    '<path d="M6 32L50 14l44 18v6L50 56 6 38z" fill="#121a38"/>' +
    '<path d="M50 14l44 18-44 18L6 32z" fill="' + U('navy') + '"/>' +
    '<path d="M50 18.500l34 13.500-34 13.500L16 32z" fill="#fff" fill-opacity=".09"/>' +
    '<path d="M50 14l44 18" stroke="#fff" stroke-opacity=".35" stroke-width="1.400" fill="none"/>' +
    '<path d="M50 32L80 37" stroke="#f5a623" stroke-width="2.400" stroke-linecap="round" fill="none"/>' +
    '<g class="a-tas"><path d="M80 37v16" stroke="#f5a623" stroke-width="2.400" stroke-linecap="round"/>' +
    '<circle cx="80" cy="53" r="3" fill="' + U('gold') + '"/>' +
    '<path d="M76 55h8l2.500 13h-13z" fill="' + U('gold') + '"/><path d="M78 58v9M80 58v10M82 58v9" stroke="#d58210" stroke-opacity=".5" stroke-width=".8"/></g>' +
    '<circle cx="50" cy="32" r="3.200" fill="' + U('gold') + '"/></g>';

  I.work = SH() +
    '<g class="w-body"><g class="w-han"><path d="M36 32v-8q0-8 8-8h12q8 0 8 8v8" fill="none" stroke="#6a3516" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M36 32v-8q0-8 8-8h12q8 0 8 8v8" fill="none" stroke="' + U('brown') + '" stroke-width="3.200" stroke-linecap="round"/></g>' +
    '<rect x="10" y="28" width="80" height="58" rx="12" fill="' + U('brown') + '"/>' +
    '<path d="M10 52q40 11 80 0v-8H10z" fill="#fff" fill-opacity=".1"/>' +
    '<path d="M12 52q38 10 76 0" fill="none" stroke="#5a2c10" stroke-opacity=".35" stroke-width="2"/>' +
    '<path d="M18 35q32-4 64 0" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="3" stroke-linecap="round"/>' +
    '<g clip-path="url(#lvc-case)"><rect class="w-shine" x="-24" y="26" width="13" height="62" fill="#fff" fill-opacity=".34" transform="skewX(-18)"/></g>' +
    '<rect class="w-clasp" x="42" y="47" width="16" height="15" rx="4.500" fill="' + U('gold') + '"/><rect x="47.500" y="51.500" width="5" height="6" rx="1.500" fill="#b9700b" fill-opacity=".55"/>' +
    '<g class="w-tag"><path d="M71.500 52h5v9h-5z" fill="' + U('blueD') + '"/>' +
    '<rect x="63" y="59" width="22" height="27" rx="4.500" fill="' + U('white') + '"/>' +
    '<circle cx="74" cy="68.500" r="3.800" fill="' + U('blue') + '"/><path d="M66.500 81q0-8 7.500-8t7.500 8z" fill="' + U('blue') + '"/></g></g>';

  I.org = SH(40) +
    '<ellipse cx="50" cy="80" rx="42" ry="12" fill="' + U('grey') + '"/><ellipse cx="50" cy="77" rx="36" ry="8" fill="#e9edfb"/>' +
    '<g class="o-l"><circle cx="24" cy="42" r="9.500" fill="' + U('gold') + '"/><path d="M10 76q0-22 14-22t14 22z" fill="' + U('goldD') + '"/></g>' +
    '<g class="o-r"><circle cx="76" cy="42" r="9.500" fill="' + U('green') + '"/><path d="M62 76q0-22 14-22t14 22z" fill="' + U('greenD') + '"/></g>' +
    '<g class="o-c"><g class="o-ch"><circle cx="50" cy="28" r="13" fill="' + U('blue') + '"/><ellipse cx="45.500" cy="23" rx="4.200" ry="2.600" fill="#fff" fill-opacity=".35"/></g>' +
    '<path d="M24 80q0-30 26-30t26 30z" fill="' + U('blueD') + '"/><path d="M43 51l7 9 7-9z" fill="#fff"/>' +
    '<path d="M48 59h4l1.500 13L50 76l-3.500-4z" fill="#fff"/></g>' +
    '<path d="M8 76q2 16 42 16t42-16q-8 8-42 8T8 76z" fill="' + U('white') + '"/>';

  I.project = SH() +
    '<rect x="12" y="14" width="64" height="74" rx="11" fill="' + U('blue') + '"/>' +
    '<rect x="18" y="24" width="52" height="58" rx="6" fill="' + U('white') + '"/>' +
    '<rect x="29" y="7" width="30" height="15" rx="5.500" fill="' + U('gold') + '"/><circle cx="44" cy="14" r="2.600" fill="#fff"/>' +
    '<g class="pr-c1">' + CHECK(30, 38, 6) + '</g><g class="pr-c2">' + CHECK(30, 53, 6) + '</g><g class="pr-c3">' + CHECK(30, 68, 6) + '</g>' +
    '<rect class="pr-l1" x="41" y="36" width="24" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="pr-l2" x="41" y="51" width="18" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="pr-l3" x="41" y="66" width="22" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<g class="pr-gear"><path d="' + gear(74, 72, 19, 14.500, 8) + '" fill="' + U('orange') + '" stroke="#f89a3a" stroke-width="2.600" stroke-linejoin="round"/>' +
    '<circle cx="74" cy="72" r="8.500" fill="#fff3da"/><circle cx="74" cy="72" r="4.500" fill="' + U('gold') + '"/></g>';

  I.task = SH() +
    '<rect x="8" y="14" width="64" height="74" rx="11" fill="' + U('purple') + '"/>' +
    '<rect x="14" y="24" width="52" height="58" rx="6" fill="' + U('white') + '"/>' +
    '<rect x="25" y="7" width="30" height="15" rx="5.500" fill="' + U('purpleD') + '"/><circle cx="40" cy="14" r="2.600" fill="#fff"/>' +
    '<g class="t-c1">' + CHECK(26, 38, 6) + '</g><g class="t-c2">' + CHECK(26, 53, 6) + '</g><g class="t-c3">' + CHECK(26, 68, 6) + '</g>' +
    '<rect class="t-l1" x="37" y="36" width="25" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="t-l2" x="37" y="51" width="19" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<rect class="t-l3" x="37" y="66" width="23" height="4.200" rx="2.100" fill="#a9b8f0"/>' +
    '<g class="t-pen"><g transform="translate(79 48) rotate(36)">' +
    '<rect x="-6.500" y="-36" width="13" height="10" rx="3.500" fill="' + U('pink') + '"/>' +
    '<rect x="-6.500" y="-27" width="13" height="4.500" fill="' + U('grey') + '"/>' +
    '<rect x="-6.500" y="-23" width="13" height="38" fill="' + U('yellow') + '"/><rect x="-1.500" y="-23" width="3" height="38" fill="#fff" fill-opacity=".35"/>' +
    '<path d="M-6.500 15L0 29l6.500-14z" fill="#ffe4b8"/><path d="M-2.200 24.500L0 29l2.200-4.500z" fill="#3b4256"/></g></g>';

  I.cal = SH() +
    '<g class="c-ring"><rect x="24" y="5" width="8" height="18" rx="4" fill="' + U('purpleD') + '"/></g>' +
    '<g class="c-ring c-r2"><rect x="64" y="5" width="8" height="18" rx="4" fill="' + U('purpleD') + '"/></g>' +
    '<rect x="8" y="14" width="80" height="72" rx="11" fill="' + U('white') + '"/>' +
    '<path d="M8 25q0-11 11-11h58q11 0 11 11v10H8z" fill="' + U('red') + '"/>' +
    '<path d="M16 19q30-3 64 0" stroke="#fff" stroke-opacity=".4" stroke-width="2.200" stroke-linecap="round" fill="none"/>' +
    [0, 1, 2].map(function (r) {
      return [0, 1, 2, 3, 4].map(function (c) {
        if (r === 1 && c === 2) return '';
        return '<rect x="' + (15 + c * 12.500) + '" y="' + (42 + r * 11) + '" width="9.500" height="8" rx="2.300" fill="#e2e7f8"/>';
      }).join('');
    }).join('') +
    '<rect class="c-today" x="40" y="53" width="9.500" height="8" rx="2.300" fill="' + U('red') + '"/>' +
    '<circle cx="70" cy="68" r="21" fill="' + U('blue') + '"/><circle cx="70" cy="68" r="16" fill="' + U('cream') + '"/>' +
    tick12(70, 68, 15.500) +
    '<line class="c-hh" x1="70" y1="68" x2="70" y2="60" stroke="#27315e" stroke-width="3" stroke-linecap="round"/>' +
    '<line class="c-hm" x1="70" y1="68" x2="70" y2="56" stroke="#27315e" stroke-width="2.200" stroke-linecap="round"/>' +
    '<circle cx="70" cy="68" r="2.600" fill="' + U('gold') + '"/>';

  I.fin = SH() +
    '<g class="f-bag"><path d="M38 33C13 46 6 70 12 81q6 10 26 10t26-10C70 70 63 46 38 33z" fill="' + U('green') + '"/>' +
    '<path d="M20 18q9-8 18-1 9-7 18 1l-4 15q-14 6-28 0z" fill="' + U('greenD') + '"/>' +
    '<path d="M25 31q13 8 26 0" fill="none" stroke="' + U('gold') + '" stroke-width="4.500" stroke-linecap="round"/>' +
    '<g class="f-tail"><circle cx="38" cy="36" r="4.500" fill="' + U('gold') + '"/><path d="M36 39l-4 10M40 39l4 10" stroke="#f0a020" stroke-width="3" stroke-linecap="round"/></g>' +
    '<path d="M22 58q-6 12-3 22" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>' +
    '<text class="f-dollar" x="38" y="78" font-size="29" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif">$</text></g>' +
    '<g class="f-c1">' + coin(81) + '</g><g class="f-c2">' + coin(74) + '</g><g class="f-c3">' + coin(67) + '</g><g class="f-c4">' + coin(60) + '</g>' +
    '<g class="f-flip"><circle cx="79" cy="44" r="10.500" fill="' + U('goldD') + '"/><circle cx="79" cy="44" r="8.600" fill="' + U('gold') + '"/>' +
    '<text x="79" y="49" font-size="13" font-weight="800" text-anchor="middle" fill="#c97a0c" font-family="Arial,sans-serif">$</text></g>' +
    '<g class="f-sp f-s1">' + STAR(14, 22, 6) + '</g><g class="f-sp f-s2">' + STAR(92, 22, 5) + '</g>';

  I.goal = SH() +
    '<g class="g-t"><circle cx="46" cy="56" r="38" fill="' + U('red') + '"/><circle cx="46" cy="56" r="29" fill="#fff6ee"/>' +
    '<circle cx="46" cy="56" r="21" fill="' + U('red') + '"/><circle cx="46" cy="56" r="13" fill="#fff6ee"/><circle cx="46" cy="56" r="6.200" fill="' + U('red') + '"/>' +
    '<path d="M16 40q6-14 22-19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.200" stroke-linecap="round"/></g>' +
    '<circle class="g-rip" cx="46" cy="56" r="38" fill="none" stroke="#ff5a6a" stroke-width="3"/>' +
    '<g class="g-ar"><g transform="translate(46 56) rotate(-45)">' +
    '<rect x="2" y="-2.200" width="52" height="4.400" rx="2.200" fill="' + U('blueD') + '"/>' +
    '<path d="M44-2L55-10h8l-6 10 6 10h-8L44 2z" fill="' + U('blue') + '"/><path d="M50-1L58-8h5l-4 8z" fill="#fff" fill-opacity=".4"/></g></g>';

  I.doc = SH() +
    '<path d="M8 32q0-8 8-8h20l6 8h42q8 0 8 8v40q0 8-8 8H16q-8 0-8-8z" fill="' + U('goldD') + '"/>' +
    '<g class="d-pap"><g class="d-p2"><rect x="24" y="12" width="46" height="52" rx="5" fill="' + U('grey') + '" transform="rotate(-7 47 38)"/></g>' +
    '<rect x="28" y="14" width="46" height="52" rx="5" fill="' + U('white') + '"/>' +
    '<path d="M35 25h32M35 33h32M35 41h22" stroke="#a9b8f0" stroke-width="3.600" stroke-linecap="round"/></g>' +
    '<path d="M8 50q0-8 8-8h68q8 0 8 8v30q0 8-8 8H16q-8 0-8-8z" fill="' + U('gold') + '"/>' +
    '<path d="M14 47h72" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>' +
    '<g class="d-cloud"><circle cx="64" cy="67" r="19" fill="' + U('blueD') + '"/>' +
    '<path d="M53.500 72a6.500 6.500 0 0 1 1.500-12.600 9 9 0 0 1 17 2.200 5.700 5.700 0 0 1-.8 10.400z" fill="#fff"/>' +
    '<g class="d-arr"><path d="M64 73V60M58.500 65.500L64 60l5.500 5.500" fill="none" stroke="#3a63d8" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/></g></g>';

  I.chart = SH() +
    '<rect x="6" y="82" width="88" height="10" rx="5" fill="' + U('lilac') + '"/>' +
    '<rect class="h-b1" x="13" y="64" width="15" height="19" rx="2.500" fill="' + U('blue') + '"/>' +
    '<rect class="h-b2" x="32" y="52" width="15" height="31" rx="2.500" fill="' + U('green') + '"/>' +
    '<rect class="h-b3" x="51" y="38" width="15" height="45" rx="2.500" fill="' + U('orange') + '"/>' +
    '<rect class="h-b4" x="70" y="24" width="15" height="59" rx="2.500" fill="' + U('gold') + '"/>' +
    '<path class="h-ln" pathLength="100" d="M10 48Q50 44 76 15" fill="none" stroke="' + U('purpleD') + '" stroke-width="4.400" stroke-linecap="round"/>' +
    '<path class="h-hd" d="M81 8.500L79.500 22.500 67.500 12z" fill="#7a5ae0" stroke="#7a5ae0" stroke-width="2" stroke-linejoin="round"/>';

  I.set = SH() +
    '<g class="s-g1"><path d="' + gear(50, 48, 41, 32, 8) + '" fill="' + U('purple') + '" stroke="#a48df5" stroke-width="3.400" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="48" r="22" fill="#9b82f0"/><circle cx="50" cy="48" r="17" fill="' + U('cream') + '"/>' +
    '<circle cx="50" cy="48" r="9" fill="' + U('gold') + '"/>' +
    '<path d="M24 28q8-12 22-15" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.400" stroke-linecap="round"/></g>' +
    '<g class="s-g2"><path d="' + gear(80, 80, 16, 12, 7) + '" fill="' + U('orange') + '" stroke="#f89a3a" stroke-width="2.600" stroke-linejoin="round"/>' +
    '<circle cx="80" cy="80" r="6.500" fill="#fff3da"/><circle cx="80" cy="80" r="3" fill="' + U('gold') + '"/></g>';

  I.bell = SH() +
    '<g class="b-sp"><path d="M12 22L5 15M19 13L15 5M90 22l7-7M83 12l4-8" stroke="#ffc42e" stroke-width="3.400" stroke-linecap="round"/></g>' +
    '<g class="b-bell"><circle cx="50" cy="12" r="5.500" fill="' + U('gold') + '"/>' +
    '<path d="M50 14C29 14 25 35 25 52c0 12-9 15-13 24h76c-4-9-13-12-13-24 0-17-4-38-25-38z" fill="' + U('gold') + '"/>' +
    '<ellipse cx="50" cy="77" rx="41" ry="10" fill="' + U('goldD') + '"/>' +
    '<path d="M35 28q-5 12-3 28" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4.500" stroke-linecap="round"/>' +
    '<g class="b-clap"><circle cx="50" cy="88" r="8.500" fill="' + U('gold') + '"/><ellipse cx="47" cy="85.500" rx="3" ry="2" fill="#fff" fill-opacity=".5"/></g></g>' +
    '<g class="b-badge"><circle cx="76" cy="26" r="13" fill="' + U('red') + '"/>' +
    '<text x="76" y="31.500" font-size="16" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">1</text></g>';

  I.clock = SH() +
    '<g class="k-top"><circle cx="26" cy="22" r="14.500" fill="' + U('gold') + '"/><circle cx="74" cy="22" r="14.500" fill="' + U('gold') + '"/>' +
    '<ellipse cx="22" cy="17" rx="5" ry="3" fill="#fff" fill-opacity=".45" transform="rotate(-30 22 17)"/><ellipse cx="70" cy="17" rx="5" ry="3" fill="#fff" fill-opacity=".45" transform="rotate(-30 70 17)"/>' +
    '<rect class="k-ham" x="45" y="5" width="10" height="9" rx="3" fill="' + U('blueD') + '"/></g>' +
    '<ellipse cx="28" cy="90" rx="6" ry="4" fill="' + U('goldD') + '"/><ellipse cx="72" cy="90" rx="6" ry="4" fill="' + U('goldD') + '"/>' +
    '<circle cx="50" cy="56" r="37" fill="' + U('blue') + '"/><circle cx="50" cy="56" r="29.500" fill="' + U('cream') + '"/>' +
    '<path d="M24 40q8-14 24-17" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>' +
    tick12(50, 56, 28) +
    '<line class="k-hh" x1="50" y1="56" x2="50" y2="43" stroke="#27315e" stroke-width="4" stroke-linecap="round"/>' +
    '<line class="k-hm" x1="50" y1="56" x2="50" y2="34" stroke="#27315e" stroke-width="3" stroke-linecap="round"/>' +
    '<line class="k-hs" x1="50" y1="62" x2="50" y2="31" stroke="#e0344a" stroke-width="1.600" stroke-linecap="round"/>' +
    '<circle cx="50" cy="56" r="3.800" fill="' + U('gold') + '"/>' +
    '<g class="k-sp"><path d="M90 20l7-6M94 32l8-1" stroke="#ffc42e" stroke-width="3.200" stroke-linecap="round"/></g>';

  I.book = SH() +
    '<rect x="16" y="12" width="66" height="76" rx="9" fill="' + U('greenD') + '"/>' +
    '<rect class="bk-pg" x="76" y="18" width="10" height="64" rx="3" fill="' + U('cream') + '"/>' +
    '<rect x="12" y="10" width="66" height="76" rx="9" fill="' + U('green') + '"/>' +
    '<path d="M12 19q0-9 9-9h6v76h-6q-9 0-9-9z" fill="#13683f" fill-opacity=".28"/>' +
    '<path d="M17 18q18-4 50 0" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="38" y="32" width="30" height="18" rx="4" fill="' + U('cream') + '"/>' +
    '<g clip-path="url(#lvc-label)"><rect class="bk-sh" x="22" y="30" width="8" height="24" fill="#fff" fill-opacity=".8" transform="skewX(-20)"/></g>' +
    '<path class="bk-rib" d="M52 86h12v14l-6-4.500-6 4.500z" fill="' + U('red') + '"/>' +
    '<g class="bk-sp"><path d="M88 18l7-6M92 30l8-1" stroke="#ffc42e" stroke-width="3.200" stroke-linecap="round"/></g>';

  if (window.IC3D) Object.keys(window.IC3D).forEach(function (k) { I[k] = window.IC3D[k]; });   /* ikon 3D baru (icons-3d.js) menggantikan SVG lama */

  /* ---------- pemasangan ---------- */
  var KEY = {
    'i-academic': 'academic', 'i-work': 'work', 'i-org': 'org', 'i-project': 'project', 'i-task': 'task', 'i-cal': 'cal', 'i-fin': 'fin',
    'i-goal': 'goal', 'i-doc': 'doc', 'i-chart': 'chart', 'i-set': 'set', 'i-bell': 'bell', 'i-clock': 'clock', 'i-book': 'book'
  };
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('lv-on', e.isIntersecting && !reduce); });
  }, { rootMargin: '60px' }) : null;

  function mount(u) {
    var id = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace('#', '');
    var k = KEY[id]; if (!k || u._lv) return; u._lv = 1;
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', '100%'); s.setAttribute('height', '100%');
    s.setAttribute('class', 'lv lv-' + k); s.setAttribute('overflow', 'visible'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'none'); s.setAttribute('focusable', 'false');
    s.innerHTML = I[k];
    u.parentNode.replaceChild(s, u);
    if (io) io.observe(s); else if (!reduce) s.classList.add('lv-on');
  }
  var queued = 0;
  function scan(root) {
    var list = (root || document).querySelectorAll('svg use');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }
  function later() { if (queued) return; queued = 1; requestAnimationFrame(function () { queued = 0; scan(); }); }
  scan();
  if ('MutationObserver' in window) new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  window.LiveIcons = { scan: scan, keys: Object.keys(I), svg: function (k) { return '<svg class="lv lv-' + k + ' lv-on" viewBox="0 0 100 100" fill="none" stroke="none" aria-hidden="true">' + I[k] + '</svg>'; } };
})();
;
/* Gerak ikon menu 3D.
   - Muncul: dimainkan saat ikon pertama kali terlihat di layar (bukan saat halaman dimuat, karena menu ada di bawah layar HP).
   - Klik: ikon bergerak dulu (~0,7 dtk), baru modul dibuka.
   Gaya gerak tiap ikon ada di fresh.css (.nav a[href] .ic). */
(function () {
  var nav = document.querySelector('.nav'); if (!nav) return;
  var root = document.documentElement, links = [].slice.call(nav.querySelectorAll('a'));
  var mm = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)');
  if (mm && mm.matches) return;
  root.classList.add('mo-anim');
  var icOf = function (a) { return a.querySelector('.ic'); };

  /* ---- muncul saat terlihat ---- */
  var show = function (a, i) { var ic = icOf(a); if (!ic || ic._in) return; ic._in = 1; ic.style.setProperty('--d', (i * 0.13).toFixed(2) + 's'); ic.classList.add('ic-in'); };
  if ('IntersectionObserver' in window) {
    var seen = 0, io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target, seen++ % 4 + Math.floor(links.indexOf(e.target) / 4) * 0); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    links.forEach(function (a) { io.observe(a); });
  } else links.forEach(show);

  /* ---- klik: gerak dulu, lalu buka ---- */
  var play = function (a) {
    var ic = icOf(a); if (!ic) return;
    ic.classList.remove('ic-go'); void ic.getBoundingClientRect(); ic.classList.add('ic-go');
    clearTimeout(ic._t); ic._t = setTimeout(function () { ic.classList.remove('ic-go'); }, 1300);
  };
  window.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.nav a'); if (!a || !nav.contains(a)) return;
    if (a._pass) { a._pass = 0; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (a._busy) return; a._busy = 1; play(a);
    setTimeout(function () { a._busy = 0; a._pass = 1; a.click(); }, 650);
  }, true);
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
