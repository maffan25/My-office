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

  /* ---------- Lonceng: dipindah ke revisi5.js (BeresinNotif) ---------- */
  function refresh() {
    var d = data();
    $('tTask').textContent = d.act.length; $('tEv').textContent = d.ev.length; $('tGoal').textContent = d.goals.length;
    if (window.BeresinNotif) BeresinNotif.refresh();
    return d;
  }
  // data berubah saat jendela menu ditutup / tab kembali aktif
  new MutationObserver(function () { if (!D.documentElement.classList.contains('win-open')) refresh(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['class'] });
  D.addEventListener('visibilitychange', function () { if (!D.hidden) refresh(); });
  refresh();
})();
