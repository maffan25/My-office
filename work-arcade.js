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
