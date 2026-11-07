/* MyOffice — Revisi 5
   A. Notifikasi sungguhan: satu mesin untuk lonceng (angka = jumlah pengingat) + panel.
      Sumber: Task & To-do, Kalender, Academic (tugas, ujian), Work, Organization, Project, Goal.
      Aturan:
        • Tenggat (tugas/to-do/pekerjaan/goal...) : terlambat · hari ini · besok
        • Kegiatan/acara/ujian berjam : muncul H-1 jam (atau sesuai pengingat yang lebih awal), lalu "sedang berlangsung"
        • Kegiatan seharian : muncul pada hari-H (ujian/presentasi/penting juga H-1)
      Angka di lonceng = jumlah item di panel; hilang otomatis saat selesai / lewat.
   B. Logo Beresin bergerak (ikon) + tulisan "Beresin" muncul/hilang dari kiri seperti mengetik (lihat revisi5.css). */
(function () {
  'use strict';
  var D = document;
  function ls(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDay(s, n) { var a = s.split('-'); return ymd(new Date(+a[0], a[1] - 1, +a[2] + n, 12)); }
  function dayDiff(a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+x[0], x[1] - 1, +x[2]) - Date.UTC(+y[0], y[1] - 1, +y[2])) / 864e5); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DONE = /^(Selesai|Done|Tercapai|Completed)$/i, CANC = /^(Dibatalkan|Archived|Batal|Cancelled)$/i;
  var fin = function (s) { return DONE.test(s || '') || CANC.test(s || ''); };

  /* ---------- waktu ---------- */
  function parse(v) {                                   // "2026-11-07" atau "2026-11-07T14:30"
    var m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(String(v || ''));
    return m ? { d: m[1], t: m[2] != null ? pad(+m[2]) + ':' + m[3] : '' } : null;
  }
  function tzOff(ts, tz) {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; });
    return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
  }
  function ms(date, time, tz) {                         // sama dengan zUtc milik Kalender
    var a = date.split('-'), t = (time || '00:00').split(':');
    if (!tz || tz === 'auto') return new Date(+a[0], a[1] - 1, +a[2], +t[0], +t[1]).getTime();
    var g = Date.UTC(+a[0], a[1] - 1, +a[2], +t[0], +t[1]);
    try { return g - tzOff(g, tz); } catch (e) { return g; }
  }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fd(s) { var a = s.split('-'); return +a[2] + ' ' + BLN[a[1] - 1]; }
  function dur(x) {
    var m = Math.max(1, Math.round(x / 6e4));
    if (m < 60) return m + ' menit';
    var h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return h + ' jam' + (r ? ' ' + r + ' mnt' : '');
    var d = Math.floor(h / 24); return d + ' hari';
  }

  /* ---------- aturan penilaian ---------- */
  var RANK = { now: 0, soon: 1, late: 2, today: 3, tmr: 4 };

  function deadline(due, now, tz) {                     // tugas/to-do/pekerjaan: terlambat · hari ini · besok
    var p = parse(due); if (!p) return null;
    var td = ymd(new Date(now)), n = dayDiff(p.d, td);
    if (p.t) {
      var at = ms(p.d, p.t, tz), diff = at - now;
      if (diff < 0) return { c: 'late', chip: 'Terlambat', sub: 'Tenggat ' + p.t + ' · lewat ' + dur(-diff), s: at };
      if (n === 0) return diff <= 36e5 ? { c: 'soon', chip: dur(diff) + ' lagi', sub: 'Tenggat ' + p.t, s: at } : { c: 'today', chip: 'Hari ini', sub: 'Tenggat ' + p.t + ' · ' + dur(diff) + ' lagi', s: at };
      if (n === 1) return { c: 'tmr', chip: 'Besok', sub: 'Tenggat besok ' + p.t, s: at };
      return null;
    }
    if (n < 0) return { c: 'late', chip: n === -1 ? 'Kemarin' : 'Terlambat', sub: 'Tenggat ' + fd(p.d) + ' · lewat ' + (-n) + ' hari', s: ms(p.d, '23:59') };
    if (n === 0) return { c: 'today', chip: 'Hari ini', sub: 'Tenggat hari ini', s: ms(p.d, '23:59') };
    if (n === 1) return { c: 'tmr', chip: 'Besok', sub: 'Tenggat besok', s: ms(p.d, '23:59') };
    return null;
  }

  function event(sd, st, ed, et, lead, dayLead, now, tz) {   // kegiatan: H-1 jam, lalu sedang berlangsung
    if (!sd) return null;
    var td = ymd(new Date(now)), ld = dayDiff(sd, td), endD = ed || sd;
    if (!st) {                                                // seharian
      if (ld <= 0 && dayDiff(endD, td) >= 0) return { c: 'today', chip: ld < 0 ? 'Berlangsung' : 'Hari ini', sub: ld < 0 ? 'Acara beberapa hari · s/d ' + fd(endD) : 'Seharian', s: ms(sd, '00:00', tz) };
      if (ld === 1 && dayLead) return { c: 'tmr', chip: 'Besok', sub: 'Seharian', s: ms(sd, '00:00', tz) };
      return null;
    }
    var s = ms(sd, st, tz), e = et ? ms(endD, et, tz) : s;
    if (e < s) e = s;
    var over = Math.max(e, s + 30 * 6e4);                     // acara tanpa jam selesai dianggap berlangsung 30 menit
    if (now >= s && now <= over) return { c: 'now', chip: 'Berlangsung', sub: st + (et ? '–' + et : '') + ' · sedang berlangsung', s: s };
    if (now < s && now >= s - lead * 6e4) return { c: 'soon', chip: dur(s - now) + ' lagi', sub: 'Mulai ' + st + (et ? '–' + et : ''), s: s };
    if (dayLead && ld === 1) return { c: 'tmr', chip: 'Besok', sub: 'Besok ' + st, s: s };
    return null;
  }

  /* ---------- kumpulkan ---------- */
  function collect() {
    var now = Date.now(), out = [];
    function put(k, id, title, label, route, icon, r) {
      if (!r || !title) return;
      out.push({ k: k + ':' + id, title: String(title), label: label, route: route, icon: icon, c: r.c, chip: r.chip, sub: r.sub, s: r.s });
    }
    var T = ls('mo-task-v1').task || [], C = ls('mo-cal-v1'), A = ls('mo-acad-v1'), W = ls('mo-work-v1'), O = ls('mo-org-v1'), P = ls('mo-proj-v1'), G = ls('mo-goal-v1');
    var tz = (C.set || {}).tz;

    T.forEach(function (t) {
      if (fin(t.status)) return;
      var kind = t.kind || 'todo', r = null, lab = kind === 'event' ? 'Kegiatan' : kind === 'project' ? 'Proyek' : 'To-do';
      if (kind === 'event') r = event(t.due, t.dueTime, t.due, t.endTime, 60, false, now);
      else r = deadline(t.due ? t.due + (t.dueTime ? 'T' + t.dueTime : '') : '', now);
      if (!r && t.remindAt) {                                   // pengingat khusus yang sudah waktunya
        var ra = new Date(t.remindAt).getTime();
        if (ra <= now && now - ra < 864e5) r = { c: 'soon', chip: 'Pengingat', sub: 'Pengingat ' + pad(new Date(ra).getHours()) + ':' + pad(new Date(ra).getMinutes()), s: ra };
      }
      put('t', t.id, t.title, lab, '#task', kind === 'event' ? '📅' : kind === 'project' ? '🗂️' : '✅', r);
    });

    (C.ev || []).forEach(function (e) {
      if (e.tk || e.ax || !e.start) return;
      var imp = /ujian|presentasi|penting/.test(e.kind || '');
      var lead = Math.max(60, +e.remind || 0);
      var r = event(String(e.start).slice(0, 10), e.allDay ? '' : e.startTime, String(e.end || e.start).slice(0, 10), e.allDay ? '' : e.endTime, lead, imp, now, tz);
      var lab = e.kind === 'ujian' ? 'Ujian' : e.kind === 'presentasi' ? 'Presentasi' : e.kind === 'penting' ? 'Penting' : 'Acara';
      put('c', e.id, e.title, lab, '#calendar', '📅', r);
    });

    var courses = {}; (A.course || []).forEach(function (c) { courses[c.id] = c; });
    (A.task || []).forEach(function (x) {
      if (fin(x.status) || x.done) return;
      var c = courses[x.courseId];
      put('at', x.id, x.title + (c ? ' (' + c.name + ')' : ''), 'Tugas kuliah', '#academic', '🎓', deadline(x.deadline, now));
    });
    (A.exam || []).forEach(function (x) {
      var c = courses[x.courseId], p = parse(x.date); if (!p) return;
      if (x.done || (x.score !== '' && x.score != null)) return;
      put('ae', x.id, (x.type || 'Ujian') + (c ? ' — ' + c.name : ''), x.type === 'Presentasi' ? 'Presentasi' : 'Ujian', '#academic', '📝', event(p.d, p.t, p.d, '', 60, true, now));
    });

    (W.job || []).forEach(function (j) { if (!fin(j.status)) put('wj', j.id, j.title, 'Pekerjaan', '#work', '💼', deadline(j.deadline, now)); });
    (W.wtask || []).forEach(function (j) { if (!fin(j.status)) put('wt', j.id, j.title, 'Tugas kerja', '#work', '💼', deadline(j.deadline, now)); });
    (O.followup || []).forEach(function (f) { if (!fin(f.status)) put('of', f.id, f.task, 'Organisasi', '#organization', '👥', deadline(f.due, now)); });
    (P.ptask || []).forEach(function (t) { if (!fin(t.status)) put('pt', t.id, t.title, 'Tugas proyek', '#project', '🗂️', deadline(t.due, now)); });
    (P.proj || []).forEach(function (p) { if (!fin(p.status)) put('pp', p.id, p.name, 'Proyek', '#project', '🗂️', deadline(p.target, now)); });
    (G.goal || []).forEach(function (g) { if (!fin(g.status)) put('g', g.id, g.name, 'Goal', '#goal', '🎯', deadline(g.deadline, now)); });

    out.sort(function (a, b) { return (RANK[a.c] - RANK[b.c]) || (a.s - b.s); });
    return out;
  }

  /* ---------- tampilan ---------- */
  var bell = D.querySelector('.tools button[aria-label^="Notifikasi"]');
  var dot = bell && bell.querySelector('.dot');
  var pn = D.getElementById('notif');
  if (!pn) { pn = D.createElement('aside'); pn.className = 'notif'; pn.id = 'notif'; D.body.appendChild(pn); }
  pn.setAttribute('aria-label', 'Notifikasi'); pn.setAttribute('role', 'dialog');
  var last = -1, items = [];

  var GROUPS = [['soon', 'Segera', ['now', 'soon']], ['late', 'Lewat tenggat', ['late']], ['today', 'Hari ini', ['today']], ['tmr', 'Besok', ['tmr']]];

  function paintBadge(n) {
    if (bell) { bell.setAttribute('aria-label', 'Notifikasi'); bell.title = n ? n + ' pengingat' : 'Notifikasi'; }
    if (!dot) return;
    dot.classList.add('n'); dot.hidden = !n;
    dot.textContent = n > 99 ? '99+' : n;
    dot.setAttribute('aria-label', n + ' pengingat');
    if (n !== last && last >= 0 && n > 0) { dot.classList.remove('bump'); void dot.offsetWidth; dot.classList.add('bump'); }
    if (bell && n > last && last >= 0) { bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); setTimeout(function () { bell.classList.remove('ring'); }, 1600); }
  }
  function render() {
    var h = '', i = 0;
    GROUPS.forEach(function (g) {
      var L = items.filter(function (x) { return g[2].indexOf(x.c) > -1; });
      if (!L.length) return;
      h += '<div class="nf-g c-' + g[0] + '"><span>' + g[1] + '</span><i>' + L.length + '</i></div><ul>';
      L.forEach(function (x) {
        h += '<li style="--i:' + (i++ > 12 ? 12 : i) + '"><a href="' + x.route + '" class="nf-i c-' + x.c + '"><span class="nk">' + x.icon + '</span><span class="nt"><b>' + esc(x.title) + '</b><small>' + esc(x.label) + ' · ' + esc(x.sub) + '</small></span><span class="nw c-' + x.c + '">' + esc(x.chip) + '</span></a></li>';
      });
      h += '</ul>';
    });
    pn.innerHTML = '<h2>Notifikasi <small>' + (items.length ? items.length + ' pengingat' : 'tidak ada') + '</small></h2>' +
      (h || '<div class="ne">Semua beres 🎉<br>Tidak ada tenggat, tugas, atau kegiatan yang dekat.</div>');
  }
  function refresh() {
    items = collect();
    paintBadge(items.length); last = items.length;
    if (pn.classList.contains('open')) render();
    return items;
  }
  function toggle(o) {
    var open = o === undefined ? !pn.classList.contains('open') : o;
    if (open) { refresh(); render(); var p = D.getElementById('panel'); if (p) p.classList.remove('open'); }
    pn.classList.toggle('open', open);
    if (bell) bell.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // capture di window → jalan sebelum penangan "Coming soon" / lama
  window.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tools button[aria-label^="Notifikasi"]');
    if (b) { e.stopImmediatePropagation(); e.preventDefault(); toggle(); return; }
    if (pn.classList.contains('open')) {
      var a = e.target.closest && e.target.closest('#notif a');
      if (a) { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); var r = window.MyOffice && MyOffice.routes && MyOffice.routes[a.getAttribute('href')]; if (r) r(); }
      else if (!pn.contains(e.target)) toggle(false);
    }
  }, true);
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  var th = D.getElementById('themeBtn'); if (th) th.addEventListener('click', function () { toggle(false); });

  // data berubah → hitung ulang (tanpa menunggu): setiap penyimpanan 'mo-*', antar-tab, fokus, dan tiap 20 dtk (H-1 jam akurat)
  var tm = 0; function soon() { clearTimeout(tm); tm = setTimeout(refresh, 250); }
  try {
    var _set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k) { var r = _set.apply(this, arguments); if (/^mo-/.test(k) && k !== 'mo-fired') soon(); return r; };
  } catch (e) { }
  window.addEventListener('storage', soon);
  window.addEventListener('focus', soon);
  D.addEventListener('visibilitychange', function () { if (!D.hidden) refresh(); });
  setInterval(function () { if (!D.hidden) refresh(); }, 20000);
  setTimeout(refresh, 400); refresh();
  window.BeresinNotif = { refresh: refresh, items: function () { return items; } };

  /* ================= B. Logo Beresin bergerak ================= */
  var brand = D.querySelector('.brand');
  if (brand && !brand.getAttribute('data-mv')) {
    brand.setAttribute('data-mv', '1');
    var svg = brand.querySelector('svg'), path = svg && svg.querySelector('path'), NS = 'http://www.w3.org/2000/svg';
    if (path) {
      path.id = 'bsMark'; svg.setAttribute('overflow', 'visible');
      var defs = svg.querySelector('defs') || svg.insertBefore(D.createElementNS(NS, 'defs'), svg.firstChild);
      defs.insertAdjacentHTML('beforeend',
        '<clipPath id="bsMarkClip"><use href="#bsMark"/></clipPath>' +
        '<linearGradient id="bsShineG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>');
      path.insertAdjacentHTML('afterend',
        '<g clip-path="url(#bsMarkClip)"><g transform="skewX(-18)"><rect class="bs-shine" x="-50" y="-10" width="34" height="120" fill="url(#bsShineG)"/></g></g>' +
        '<path class="bs-spark" d="M86 6l2.6 6.4L95 15l-6.4 2.6L86 24l-2.6-6.4L77 15l6.4-2.6z" fill="#ffc42e"/>' +
        '<circle class="bs-spark s2" cx="94" cy="34" r="2.6" fill="#7fdcff"/>');
      svg.classList.add('bs-live');
    }
    // teks → huruf per huruf
    var node = null; brand.childNodes.forEach(function (n) { if (n.nodeType === 3 && /\S/.test(n.nodeValue)) node = n; });
    if (node) {
      var word = node.nodeValue.trim(), sp = D.createElement('span');
      sp.className = 'brand-t'; sp.setAttribute('aria-hidden', 'true');
      sp.innerHTML = word.split('').map(function (ch, i) { return '<b class="bl" style="--i:' + i + '">' + esc(ch) + '</b>'; }).join('');
      node.parentNode.replaceChild(sp, node);
      brand.style.setProperty('--n', word.length);
    }
  }
})();
