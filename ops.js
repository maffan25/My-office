/* MyOffice — OPS layer (JS): rel navigasi + beranda "Hari ini". Hanya MEMBACA localStorage. */
(function () {
  'use strict';
  var D = document, MO = window.MyOffice = window.MyOffice || {}; MO.routes = MO.routes || {};
  var $ = function (s) { return D.querySelector(s); };
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var days = function (a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); };
  var short = function (s) { return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); };
  var DONE = /^(Selesai|Done|Tercapai|Dibatalkan|Archived)$/, PR = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  var PC = { Urgent: '#ff6b6b', High: '#ff9f5a', Medium: '#f2c94c', Low: '#8aa0b8' };
  var MAIN = '.ac-ov,.ad-ov,.wo-ov,.es-ov,.fn-ov,.sp-ov', ALL = MAIN + ',.ac-ov2,.wo-ov2,.es-ov2';
  var NAV = [['', 'Beranda', 'i-home'], ['#academic', 'Akademik', 'i-academic'], ['#work', 'Kerja', 'i-work'], ['#organization', 'Organisasi', 'i-org'],
    ['#project', 'Proyek', 'i-project'], ['#task', 'Tugas', 'i-task'], ['#calendar', 'Kalender', 'i-cal'], ['#finance', 'Keuangan', 'i-fin'],
    ['#goal', 'Goal', 'i-goal'], ['#documents', 'Dokumen', 'i-doc'], ['#analytics', 'Analitik', 'i-chart'], ['#settings', 'Pengaturan', 'i-set']];
  var ic = function (id) { return '<svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  /* ---------- Rel navigasi ---------- */
  var rail = D.createElement('nav'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Menu utama');
  var mk = $('.brand svg'); if (mk) { var m = mk.cloneNode(true); m.setAttribute('class', 'mk'); m.setAttribute('stroke', 'currentColor'); rail.appendChild(m); }
  rail.insertAdjacentHTML('beforeend', NAV.map(function (n, i) {
    return '<button type="button" data-r="' + n[0] + '" data-l="' + n[1] + '" aria-label="' + n[1] + '"' + (i === NAV.length - 1 ? ' class="last"' : '') + '>' + ic(n[2]) + '<span>' + n[1] + '</span></button>';
  }).join(''));
  D.body.appendChild(rail);
  var sym = D.querySelector('svg defs');
  if (sym) sym.insertAdjacentHTML('beforeend', '<symbol id="i-home" viewBox="0 0 24 24"><path d="m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></symbol>');

  function mark(r) {
    [].forEach.call(rail.querySelectorAll('button'), function (b) { if (b.dataset.r === (r || '')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function go(r) {
    [].forEach.call(D.querySelectorAll(ALL), function (o) { o.hidden = true; });
    D.body.style.overflow = '';
    if (r && MO.routes[r]) MO.routes[r]();
    mark(r); if (!r) render();
  }
  rail.addEventListener('click', function (e) { var b = e.target.closest('button[data-r]'); if (b) go(b.dataset.r); });
  mark('');

  /* ---------- Data hari ini ---------- */
  function gather() {
    var td = ymd(new Date()), T = ls('mo-task-v1').task || [], A = ls('mo-acad-v1').task || [], W = ls('mo-work-v1').wtask || [];
    var items = [];
    var put = function (list, mod, route, due, pri) { list.forEach(function (t) { var d = String(t[due] || '').slice(0, 10); if (t.title && d && !DONE.test(t.status || '')) items.push({ t: t.title, d: d, p: pri ? t[pri] : '', mod: mod, r: route }); }); };
    put(T, 'Tugas', '#task', 'due', 'priority'); put(A, 'Kuliah', '#academic', 'deadline'); put(W, 'Kerja', '#work', 'deadline');
    items.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : (PR[a.p] == null ? 9 : PR[a.p]) - (PR[b.p] == null ? 9 : PR[b.p]); });
    var E = (ls('mo-cal-v1').ev || []).filter(function (e) { var s = String(e.start || '').slice(0, 10), z = String(e.end || e.start || '').slice(0, 10); return s && s <= td && z >= td; });
    E.sort(function (a, b) { return String(a.start) < String(b.start) ? -1 : 1; });
    return { td: td, now: items.filter(function (i) { return i.d <= td; }), soon: items.filter(function (i) { var n = days(td, i.d); return n > 0 && n <= 7; }),
      ev: E, goals: (ls('mo-goal-v1').goal || []).filter(function (g) { return g.status === 'Berjalan'; }) };
  }
  function row(r, color, title, sub, right, late) {
    return '<button type="button" class="ro-row" data-r="' + r + '"><i style="--c:' + color + '"></i><span><b>' + esc(title) + '</b><small' + (late ? ' class="late"' : '') + '>' + esc(sub) + '</small></span>' + (right ? '<time>' + esc(right) + '</time>' : '') + '</button>';
  }
  function card(title, n, body, empty, route, cta, hot) {
    return '<section class="ro-card"><h2>' + title + '<em' + (hot ? ' class="hot"' : '') + '>' + n + '</em></h2>' + (body || '<p class="ro-empty">' + empty + '<button type="button" data-r="' + route + '">' + cta + '</button></p>') + '</section>';
  }

  /* ---------- Beranda ---------- */
  var home = D.createElement('div'); home.className = 'ro'; home.id = 'ro';
  (D.querySelector('.app') || D.body).appendChild(home);
  var cl, hj;
  function greet() { var h = new Date().getHours(), s = ls('mo-settings-v1'), n = s.name || s.nama || s.fullName || '';
    return (h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam') + (n ? ', ' + esc(String(n).split(' ')[0]) : ''); }
  function render() {
    var g = gather(), late = g.now.filter(function (i) { return i.d < g.td; }).length;
    var sub = g.now.length ? g.now.length + ' hal perlu dikerjakan hari ini' + (late ? ', ' + late + ' terlambat' : '') : 'Tidak ada tugas yang jatuh tempo hari ini';
    var nowH = g.now.slice(0, 7).map(function (i) { var n = days(g.td, i.d); return row(i.r, PC[i.p] || '#8aa0b8', i.t, i.mod + (i.p ? ' · ' + i.p : ''), n < 0 ? 'Terlambat ' + (-n) + ' hari' : 'Hari ini', n < 0); }).join('');
    var soonH = g.soon.slice(0, 6).map(function (i) { return row(i.r, PC[i.p] || '#8aa0b8', i.t, i.mod, short(i.d)); }).join('');
    var evH = g.ev.slice(0, 6).map(function (e) { var s = String(e.start); return row('#calendar', '#f08f78', e.title || 'Acara', s.length > 10 ? 'Mulai ' + s.slice(11, 16) : 'Seharian', ''); }).join('');
    var goalH = g.goals.slice(0, 5).map(function (x) { return row('#goal', '#8fdcf0', x.title, 'Sedang berjalan', ''); }).join('');
    home.innerHTML =
      '<header class="ro-head"><div><h1>' + greet() + '</h1><p>' + esc((hj ? hj : '') ) + '</p><p>' + sub + '</p></div><div class="ro-clock" id="roClock">--:--<small id="roDate"></small></div></header>' +
      '<div class="ro-quick"><button type="button" data-r="#task">' + ic('i-task') + 'Tambah tugas</button><button type="button" data-r="#calendar">' + ic('i-cal') + 'Atur agenda</button><button type="button" data-r="#finance">' + ic('i-fin') + 'Catat uang</button></div>' +
      '<div class="ro-grid"><div class="ro-col">' + card('Perlu dikerjakan', g.now.length, nowH, 'Semua beres. Tambahkan tugas baru atau rencanakan hari berikutnya.', '#task', 'Tambah tugas', late) +
      card('7 hari ke depan', g.soon.length, soonH, 'Belum ada tenggat dalam seminggu ke depan.', '#task', 'Lihat semua tugas') + '</div>' +
      '<div class="ro-col">' + card('Agenda hari ini', g.ev.length, evH, 'Belum ada agenda untuk hari ini.', '#calendar', 'Buka kalender') +
      card('Goal berjalan', g.goals.length, goalH, 'Belum ada goal yang sedang berjalan.', '#goal', 'Buat goal') + '</div></div>';
    tick(true);
  }
  function tick(force) {
    var d = new Date(), c = $('#roClock'); if (!c) return;
    var t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (c.firstChild.nodeValue !== t || force) { c.firstChild.nodeValue = t; var dt = $('#roDate'); if (dt) dt.textContent = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + (($('#zone') || {}).textContent || ''); }
  }
  home.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) go(b.dataset.r); });
  hj = ($('#hijriah') || {}).textContent;
  render(); setInterval(function () { hj = ($('#hijriah') || {}).textContent || hj; tick(); }, 15000);

  /* Segarkan saat kembali ke beranda (jendela ditutup) atau tab aktif lagi */
  var t0; new MutationObserver(function () {
    clearTimeout(t0); t0 = setTimeout(function () {
      var open = [].some.call(D.querySelectorAll(MAIN), function (o) { return !o.hidden; });
      if (!open) { mark(''); render(); }
    }, 120);
  }).observe(D.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  D.addEventListener('visibilitychange', function () { if (!D.hidden && !D.querySelector(MAIN + ':not([hidden])')) render(); });
})();
