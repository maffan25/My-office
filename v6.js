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
