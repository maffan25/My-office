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
