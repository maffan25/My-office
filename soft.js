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
