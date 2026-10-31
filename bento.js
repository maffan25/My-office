/* MyOffice — bento.js : kartu bento hidup (hanya MEMBACA localStorage). Aktif bila data-wall=bento. */
(function () {
  'use strict';
  var D = document, root = D.documentElement;
  function lsj(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dd(s) { return Math.round((Date.parse(s + 'T00:00:00') - Date.parse(ymd(new Date()) + 'T00:00:00')) / 864e5); }
  function when(n) { return n < 0 ? Math.abs(n) + ' hari lewat' : n === 0 ? 'Hari ini' : n === 1 ? 'Besok' : n + ' hari lagi'; }
  var DONE = /^(Selesai|Done|Tercapai|Archived|Dibatalkan)$/, PC = { High: '#ef4444', Tinggi: '#ef4444', Medium: '#f59e0b', Sedang: '#f59e0b', Low: '#10b981', Rendah: '#10b981' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /* ---------- kerangka ---------- */
  var box = D.createElement('div'); box.className = 'bento'; box.setAttribute('aria-label', 'Ringkasan');
  box.innerHTML = '<div class="bgrid"><section class="bt b-clock" aria-label="Waktu"><div class="hi" id="bnHi"></div><div class="tm"><span id="bnTm">--:--</span><small id="bnSc"></small></div><div class="dt"><span id="bnDt"></span><br><span id="bnHj" style="opacity:.8"></span></div></section><div class="bdata" id="bnData"></div></div>';
  D.body.appendChild(box);
  var data = box.querySelector('#bnData'), sig = '';

  function ic(h) { var n = D.querySelector('.nav a[href="' + h + '"] .ic'); return n ? n.innerHTML : ''; }
  function link(h, t, cls) { return '<a class="' + (cls || '') + '" href="' + h + '" data-go="' + h + '">' + t + '</a>'; }

  /* ---------- data ---------- */
  function collect() {
    var td = ymd(new Date()), T = lsj('mo-task-v1').task || [], A = lsj('mo-acad-v1'), W = lsj('mo-work-v1'), E = lsj('mo-cal-v1').ev || [], G = lsj('mo-goal-v1');
    var tasks = [];
    T.forEach(function (t) { if (t.title && !DONE.test(t.status || '')) tasks.push({ t: t.title, d: String(t.due || '').slice(0, 10), p: t.priority, s: 'Tugas' }); });
    (A.task || []).forEach(function (t) { if (t.title && !DONE.test(t.status || '')) tasks.push({ t: t.title, d: String(t.deadline || '').slice(0, 10), p: t.priority, s: 'Akademik' }); });
    (W.wtask || []).forEach(function (t) { if (t.title && !DONE.test(t.status || '')) tasks.push({ t: t.title, d: String(t.deadline || '').slice(0, 10), p: t.priority, s: 'Work' }); });
    tasks.sort(function (a, b) { return (a.d || '9999') < (b.d || '9999') ? -1 : (a.d || '9999') > (b.d || '9999') ? 1 : 0; });
    var evs = E.filter(function (e) { return e.title && e.start; }).map(function (e) { var s = String(e.start).slice(0, 10); return { t: e.title, s: s, z: String(e.end || e.start).slice(0, 10), tm: e.startTime || '' }; });
    var ms = G.ms || [], gt = G.gtask || [];
    var goals = (G.goal || []).filter(function (g) { return g.status === 'Berjalan'; }).map(function (g) {
      var p = null;
      if (g.basis === 'num') { if (+g.tgtNum > 0) p = Math.min(100, (+g.curNum || 0) / +g.tgtNum * 100); }
      else if (g.basis === 'tasks') { var t = gt.filter(function (x) { return x.goalId === g.id; }); if (t.length) p = t.filter(function (x) { return x.done; }).length / t.length * 100; }
      else { var m = ms.filter(function (x) { return x.goalId === g.id; }); if (m.length) p = m.filter(function (x) { return x.done; }).length / m.length * 100; }
      return { n: g.name, p: p };
    });
    var exams = (A.exam || []).filter(function (e) { return e.date && (e.score === '' || e.score == null) && dd(String(e.date).slice(0, 10)) >= 0; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return { td: td, tasks: tasks, evs: evs, goals: goals, exams: exams, nT: T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length };
  }

  /* ---------- kartu ---------- */
  function calendar(evs) {
    var n = new Date(), y = n.getFullYear(), m = n.getMonth(), first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), mark = {};
    evs.forEach(function (e) { for (var d = 1; d <= days; d++) { var k = y + '-' + pad(m + 1) + '-' + pad(d); if (k >= e.s && k <= e.z) mark[d] = 1; } });
    var h = ['S', 'S', 'R', 'K', 'J', 'S', 'M'].map(function (x) { return '<span class="h">' + x + '</span>'; }).join(''), c = '';
    for (var i = 0; i < off; i++) c += '<span class="d o"></span>';
    for (var d = 1; d <= days; d++) c += '<span class="d' + (mark[d] ? ' ev' : '') + (d === n.getDate() ? ' today' : '') + '">' + d + '</span>';
    return '<section class="bt b-cal"><h3>' + n.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + link('#calendar', 'Buka →') + '</h3><div class="cal">' + h + c + '</div></section>';
  }
  function render() {
    var d = collect(), td = d.td, h = '';
    var evT = d.evs.filter(function (e) { return e.s <= td && e.z >= td; });
    h += link('#task', '<b>' + d.nT + '</b><span>Tugas aktif</span>', 'bt st tint b-s1') + link('#calendar', '<b>' + evT.length + '</b><span>Agenda hari ini</span>', 'bt st tint b-s2') + link('#goal', '<b>' + d.goals.length + '</b><span>Goal berjalan</span>', 'bt st tint b-s3');
    var tr = d.tasks.slice(0, 5).map(function (t) {
      var n = t.d ? dd(t.d) : null, cls = n == null ? '' : n < 0 ? ' late' : n <= 1 ? ' now' : '';
      return '<li><i class="dot" style="--d:' + (PC[t.p] || '#94a3b8') + '"></i><span class="tt" title="' + esc(t.t) + '">' + esc(t.t) + '</span><span class="bd' + cls + '">' + (n == null ? t.s : when(n)) + '</span></li>';
    }).join('');
    h += '<section class="bt b-task"><h3>Tugas terdekat' + link('#task', 'Semua →') + '</h3>' + (tr ? '<ul class="rows">' + tr + '</ul>' : '<div class="empty">Tidak ada tugas aktif.<br>Nikmati harimu!</div>') + '</section>';
    h += calendar(d.evs);
    var up = d.evs.filter(function (e) { return e.z >= td && dd(e.s) <= 14; }).sort(function (a, b) { return a.s < b.s ? -1 : 1; }).slice(0, 4);
    var ar = up.map(function (e) { var s = e.s < td ? td : e.s, p = s.split('-'); return '<li><span class="dc">' + (+p[2]) + '<small>' + MON[+p[1] - 1] + '</small></span><span class="tt" title="' + esc(e.t) + '">' + esc(e.t) + '</span><span class="bd' + (s === td ? ' now' : '') + '">' + (e.tm ? esc(e.tm) : when(dd(s))) + '</span></li>'; }).join('');
    h += '<section class="bt b-ag"><h3>Agenda' + link('#calendar', 'Kalender →') + '</h3>' + (ar ? '<ul class="rows">' + ar + '</ul>' : '<div class="empty">Tidak ada agenda dalam 2 minggu ke depan.</div>') + '</section>';
    var gr = d.goals.slice(0, 3).map(function (g) {
      return '<li><div class="r"><span>' + esc(g.n) + '</span><em>' + (g.p == null ? '—' : Math.round(g.p) + '%') + '</em></div><div class="pb"><i style="width:' + (g.p || 0) + '%"></i></div></li>';
    }).join('');
    h += '<section class="bt b-goal"><h3>Goal' + link('#goal', 'Semua →') + '</h3>' + (gr ? '<ul class="gl" style="margin:0;padding:0">' + gr + '</ul>' : '<div class="empty">Belum ada goal berjalan.</div>') + '</section>';
    var ex = d.exams[0];
    h += '<section class="bt b-ex"><h3>Ujian berikutnya' + link('#academic', 'Akademik →') + '</h3>' + (ex ? '<div class="ex"><b>' + esc(ex.type || ex.title || ex.name || 'Ujian') + '</b> · ' + when(dd(String(ex.date).slice(0, 10))).toLowerCase() + '</div>' : '<div class="ex muted">Tidak ada ujian terjadwal.</div>') + '</section>';
    h += '<section class="bt b-go"><h3>Pintasan</h3><div class="go">' + [['#work', 'Work Office'], ['#project', 'Project'], ['#finance', 'Finance'], ['#documents', 'Dokumen'], ['#analytics', 'Analytics'], ['#organization', 'Organisasi']].map(function (x) { return '<a href="' + x[0] + '" data-go="' + x[0] + '">' + ic(x[0]) + x[1] + '</a>'; }).join('') + '</div></section>';
    if (h !== sig) { sig = h; data.innerHTML = h; }
  }

  /* ---------- jam & sapaan ---------- */
  var hj = D.getElementById('hijriah'), tz = D.getElementById('zone');
  function tick() {
    var n = new Date(), H = n.getHours();
    D.getElementById('bnTm').textContent = pad(H) + ':' + pad(n.getMinutes());
    D.getElementById('bnSc').textContent = pad(n.getSeconds()) + (tz && tz.textContent ? ' ' + tz.textContent : '');
    D.getElementById('bnHi').textContent = H < 4 ? 'Selamat malam' : H < 11 ? 'Selamat pagi' : H < 15 ? 'Selamat siang' : H < 18 ? 'Selamat sore' : 'Selamat malam';
    D.getElementById('bnDt').textContent = n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    D.getElementById('bnHj').textContent = hj ? hj.textContent : '';
  }

  /* ---------- ukuran area (di bawah menu / di atas menu mobile) ---------- */
  function layout() {
    var nav = D.querySelector('.nav'), top = D.querySelector('.top'), bt = 0, bb = 0;
    if (top) bt = top.getBoundingClientRect().bottom;
    if (nav) { var r = nav.getBoundingClientRect(); if (r.top < innerHeight / 2) bt = Math.max(bt, r.bottom); else bb = innerHeight - r.top; }
    box.style.setProperty('--bt', Math.round(bt + 12) + 'px'); box.style.setProperty('--bb', Math.round(bb) + 'px');
  }

  /* ---------- navigasi ---------- */
  box.addEventListener('click', function (e) {
    var a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault();
    var r = window.MyOffice && MyOffice.routes && MyOffice.routes[a.dataset.go]; if (r) r();
  });

  var timer = 0, on = false;
  function start() { if (on) return; on = true; layout(); tick(); render(); timer = setInterval(function () { tick(); if (new Date().getSeconds() % 5 === 0) render(); }, 1000); }
  function stop() { if (!on) return; on = false; clearInterval(timer); }
  function sync() { if (root.dataset.wall === 'bento') start(); else stop(); }
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-wall'] });
  addEventListener('resize', layout); addEventListener('storage', function () { if (on) render(); });
  setTimeout(layout, 400); sync();
})();
