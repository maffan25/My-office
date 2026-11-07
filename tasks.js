/* MyOffice — Task v3: To Do list, acara, dan proyek.
   Subtugas dibuat bersama tugas dan langsung muncul. Tugas bertanggal otomatis tampil di kalender Task dan kalender umum.
   Data tetap di localStorage 'mo-task-v1'. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, todayS = K.todayS, by = K.by, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var addDays = K.addDays = function (s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dd = K.dd = function (a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 864e5); };

  /* ---------- label, ikon, warna (sumber tunggal) ---------- */
  var PRIS = ['Urgent', 'High', 'Medium', 'Low'];
  var PMETA = {
    Urgent: { l: 'Urgent', ico: '🔥', c: 'urgent' },
    High: { l: 'Tinggi', ico: '❗', c: 'high' },
    Medium: { l: 'Sedang', ico: '🌱', c: 'medium' },
    Low: { l: 'Santai', ico: '☕', c: 'low' }
  };
  var PCAL = { Urgent: '#ff7a6b', High: '#f0b000', Medium: '#3d9be9', Low: '#a0673f' };
  var KIND = { todo: { l: 'To Do list', ico: '📝' }, event: { l: 'Acara', ico: '📅' }, project: { l: 'Proyek', ico: '🗂️' } };
  var STS = [['To Do', 'Belum'], ['In Progress', 'Sedang'], ['Done', 'Selesai']];
  var STL = { 'To Do': 'Belum dikerjakan', 'In Progress': 'Sedang dikerjakan', Done: 'Selesai' };

  function nst(t) { var s = t.status; if (s === 'Done') return 'Done'; if (s === 'In Progress' || s === 'Waiting') return 'In Progress'; return 'To Do'; }
  var live = function (t) { return t.status !== 'Done' && t.status !== 'Archived'; };
  var kindOf = function (t) { return t.kind || 'todo'; };
  function mk(o) {
    return Object.assign({ id: K.uid(), kind: 'todo', title: '', status: 'To Do', priority: 'Medium', due: '', dueTime: '', endTime: '', category: '', desc: '', pin: false, doneAt: '', parentId: '', remindAt: '', goalRef: '', projId: '' }, o);
  }
  function dueInfo(t) {
    if (!t.due) return null;
    var tm = t.dueTime ? ' · ' + t.dueTime : '';
    if (!live(t)) return { text: fd(t.due) + tm, c: '#8b93ad' };
    var d = dd(todayS(), t.due);
    if (d < 0) return { text: 'Terlambat ' + (-d) + ' hari', c: '#e5484d' };
    if (d === 0) return { text: 'Hari ini' + tm, c: '#c98a00' };
    if (d === 1) return { text: 'Besok' + tm, c: '#3b7de8' };
    return { text: fd(t.due) + tm, c: '#8b93ad' };
  }
  var sortTasks = function (L) {
    return L.slice().sort(function (a, b) { return (a.due || '9').localeCompare(b.due || '9') || (PRIS.indexOf(a.priority) - PRIS.indexOf(b.priority)); });
  };

  /* Event acara ke kalender umum (tugas biasa tetap lewat jalur tugas). */
  K.taskEvents = function () {
    return (ls('mo-task-v1').task || []).filter(function (t) { return t.due && t.kind === 'event' && !t.parentId && t.status !== 'Archived'; }).map(function (t) {
      return { id: 'tk-' + t.id, tk: 1, title: (t.status === 'Done' ? '✓ ' : '📅 ') + t.title, start: t.due, end: t.due, startTime: t.dueTime || '', endTime: t.endTime || '', allDay: !t.dueTime, kind: 'biasa', catId: 'c1', remind: '', location: '', desc: '' };
    });
  };

  var tasks = K.App('Task', 'mo-task-v1', function () { return { task: [], sub: [], cats: ['Belajar', 'Kerja', 'Rapat', 'Administrasi', 'Kesehatan', 'Rumah', 'Lainnya'] }; }, function (app) {
    var D = app.D, st = app.st;
    if (!D.cats) D.cats = ['Lainnya'];
    if (!D.sub) D.sub = [];
    D.task.forEach(function (t) { if (!t.kind) t.kind = 'todo'; });
    st.md = st.md || 'Daftar';

    var children = function (pid) { return D.task.filter(function (t) { return t.parentId === pid; }); };
    var top = function () { return D.task.filter(function (t) { return !t.parentId && t.status !== 'Archived'; }); };
    var prog = function (p) { var k = children(p.id); return k.length ? k.filter(function (x) { return nst(x) === 'Done'; }).length / k.length * 100 : (nst(p) === 'Done' ? 100 : 0); };
    var subsOf = function (id) { return D.sub.filter(function (s) { return s.taskId === id; }); };
    var setStatus = function (x, s) { x.status = s; x.doneAt = s === 'Done' ? (x.doneAt || todayS()) : ''; };
    var syncParent = function (x) {
      if (!x.parentId) return;
      var p = by(D.task, x.parentId); if (!p) return;
      var k = children(p.id), all = k.length && k.every(function (c) { return nst(c) === 'Done'; }), any = k.some(function (c) { return nst(c) !== 'To Do'; });
      setStatus(p, all ? 'Done' : (any ? 'In Progress' : 'To Do'));
    };
    var removeTask = function (id) {
      children(id).forEach(function (c) { removeTask(c.id); });
      D.sub = D.sub.filter(function (s) { return s.taskId !== id; });
      D.task = D.task.filter(function (t) { return t.id !== id; });
    };
    var blankDraft = function () { return { kind: 'todo', title: '', due: '', dueTime: '', endTime: '', priority: 'Medium', category: '', subs: [] }; };

    var specs = { task: { title: 'Tugas', def: {}, fields: [{ k: 'title', l: 'Judul', t: 'text', req: 1, full: 1 }] } };

    /* ---------- pembantu tampilan ---------- */
    function bar(title) { return '<div class="tk3-vh"><button class="tk3-back" data-act="nav" data-v="">‹ Kembali</button><b>' + esc(title) + '</b></div>'; }
    function addForm(f, act, id, ph) {
      return '<form class="tk3-addf" data-f="' + f + '" onsubmit="return false"><input name="v" maxlength="120" autocomplete="off" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '"><button type="submit" data-act="' + act + '" data-id="' + id + '">+</button></form>';
    }
    function statSeg(t) {
      var s = nst(t);
      return '<div class="tk3-stat" role="group">' + STS.map(function (x) {
        return '<button aria-pressed="' + (s === x[0]) + '" class="s-' + x[0].replace(' ', '') + '" data-act="tst" data-id="' + t.id + '" data-s="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>';
    }
    function bubble(t) {
      var k = kindOf(t);
      return '<span class="tk3-ico" aria-hidden="true">' + (k === 'project' ? KIND.project.ico : (PMETA[t.priority] || PMETA.Medium).ico) + '</span>';
    }
    function note(t) {
      var k = kindOf(t), pm = PMETA[t.priority] || PMETA.Medium, done = nst(t) === 'Done', di = dueInfo(t);
      var subs = subsOf(t.id), sd = subs.filter(function (s) { return s.done; }).length, kids = k === 'project' ? children(t.id) : [];
      var h = '<article class="tk3-note p-' + pm.c + (done ? ' is-done' : '') + '">' + bubble(t) +
        '<div class="tk3-row">' +
        (k === 'project' ? '<button class="tk3-tt" data-act="nav" data-v="proj" data-id="' + t.id + '">' + esc(t.title) + '</button>'
          : '<input type="checkbox" class="tk3-chk" data-act="tgd" data-id="' + t.id + '"' + (done ? ' checked' : '') + ' aria-label="Tandai selesai">' +
            '<button class="tk3-tt" data-act="nav" data-v="detail" data-id="' + t.id + '">' + esc(t.title) + '</button>') +
        '</div><div class="tk3-meta"><span class="tk3-pl">' + pm.l + '</span><span class="tk3-kd">' + KIND[k].l + '</span>' +
        (di ? '<span class="tk3-due" style="--c:' + di.c + '">' + esc(di.text) + '</span>' : '') +
        (subs.length ? '<span class="tk3-kd">' + sd + '/' + subs.length + ' subtugas</span>' : '') +
        (kids.length ? '<span class="tk3-kd">' + kids.filter(function (x) { return nst(x) === 'Done'; }).length + '/' + kids.length + ' tugas</span>' : '') + '</div>';
      if (done) h += '<button class="tk3-ib tk3-trash" data-act="rmtask" data-id="' + t.id + '" aria-label="Hapus">🗑️</button>';
      if (k === 'project') h += '<div class="tk3-bar"><i style="width:' + Math.round(prog(t)) + '%"></i></div>';
      else if (subs.length) h += '<div class="tk3-bar"><i style="width:' + Math.round(sd / subs.length * 100) + '%"></i></div>';
      return h + '</article>';
    }
    function list(L, msg) { return L.length ? L.map(note).join('') : empty(msg || 'Belum ada di sini.'); }
    function tile(label, n, cls) { return '<div class="tk3-tile ' + cls + '"><small>' + label + '</small><b data-cnt="' + n + '" data-lab="' + label + '">' + n + '</b></div>'; }

    /* ---------- Hari ini ---------- */
    function home() {
      var T = todayS(), A = top().filter(function (t) { return live(t) && kindOf(t) !== 'project'; }), seen = {};
      var take = function (x) { return x.filter(function (t) { if (seen[t.id]) return false; seen[t.id] = 1; return true; }); };
      var late = take(sortTasks(A.filter(function (t) { return t.due && t.due < T; })));
      var focus = take(sortTasks(A.filter(function (t) { return t.due === T || t.pin || nst(t) === 'In Progress'; })));
      var soon = take(sortTasks(A.filter(function (t) { return t.due && t.due > T && dd(T, t.due) <= 14; })));
      var none = take(sortTasks(A.filter(function (t) { return !t.due; })));
      var projs = top().filter(function (t) { return kindOf(t) === 'project' && nst(t) !== 'Done'; });
      var n = { todo: A.filter(function (t) { return nst(t) === 'To Do'; }).length, prog: A.filter(function (t) { return nst(t) === 'In Progress'; }).length, late: late.length, done: D.task.filter(function (t) { return nst(t) === 'Done'; }).length };
      var set = ls('mo-settings-v1'), photo = set.photo ? ' style="background-image:url(&quot;' + esc(set.photo) + '&quot;)"' : '';
      var grp = function (title, L, cls) { return L.length ? '<section class="tk3-grp ' + cls + '"><h4>' + title + ' <span>' + L.length + '</span></h4>' + list(L) + '</section>' : ''; };
      return '<section class="tk3-hero"><span class="tk3-conf" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
        '<div class="tk3-hero-t"><p class="tk3-hi">Halo' + (set.nick ? ', <b>' + esc(set.nick) + '</b>' : '') + '!</p><h3>Rencanakan hari ini dengan tenang</h3>' +
        '<small>' + fd(T) + '</small><div><button class="tk3-cta" data-act="nav" data-v="new">Tambah baru +</button></div></div>' +
        '<button class="tk3-av" data-act="photo" aria-label="Ganti foto profil"><span' + photo + '></span><small>Ganti</small></button></section>' +
        '<div class="tk3-tiles">' + tile('Belum', n.todo, 't-lav') + tile('Sedang', n.prog, 't-yel') + tile('Terlambat', n.late, 't-pink') + tile('Selesai', n.done, 't-grn') + '</div>' +
        '<form class="tk3-quick" data-f="qt" onsubmit="return false"><input name="qt" maxlength="120" autocomplete="off" placeholder="Tulis tugas cepat, lalu Enter" aria-label="Tugas cepat"><button type="submit" data-act="quick" data-due="today">Simpan</button></form>' +
        (projs.length ? '<section class="tk3-grp k-proj"><h4>Proyek aktif <span>' + projs.length + '</span></h4>' + list(projs) + '</section>' : '') +
        grp('Terlambat', late, 'g-late') + grp('Fokus hari ini', focus, 'g-focus') + grp('14 hari ke depan', soon, 'g-soon') + grp('Tanpa tenggat', none, 'g-none') +
        (!late.length && !focus.length && !soon.length && !none.length && !projs.length ? empty('Belum ada tugas. Tulis di kolom di atas atau tekan Tambah baru.') : '');
    }

    /* ---------- Semua: daftar & kalender ---------- */
    function filtered() {
      var q = (st.q || '').toLowerCase().trim();
      return top().filter(function (t) {
        if (st.fk && kindOf(t) !== st.fk) return false;
        if (st.fp && t.priority !== st.fp) return false;
        if (q && (t.title + ' ' + (t.desc || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
    }
    function all() {
      var md = st.md || 'Daftar', fk = st.fk || '', fp = st.fp || '';
      var chip = function (f, items, cur) { return items.map(function (x) { return '<button class="tk3-f" aria-pressed="' + (x[0] === cur) + '" data-act="filt" data-f="' + f + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join(''); };
      var head = '<form class="tk3-search" onsubmit="return false"><input type="search" data-in="q" value="' + esc(st.q || '') + '" placeholder="Cari…" aria-label="Cari"></form>' +
        '<div class="tk3-tabs2">' + ['Daftar', 'Kalender'].map(function (m) { return '<button aria-pressed="' + (m === md) + '" data-act="filt" data-f="md" data-v="' + m + '">' + m + '</button>'; }).join('') + '</div>' +
        '<div class="tk3-fr">' + chip('fk', [['', 'Semua'], ['todo', 'To Do'], ['event', 'Acara'], ['project', 'Proyek']], fk) + '</div>' +
        '<div class="tk3-fr">' + chip('fp', [['', 'Semua warna']].concat(PRIS.map(function (p) { return [p, PMETA[p].l]; })), fp) + '</div>' +
        '<button class="tk3-cta sm" data-act="nav" data-v="new">+ Tambah baru</button>';
      if (md === 'Kalender') return head + calView();
      var L = sortTasks(filtered());
      return head + '<p class="tk3-hint">' + L.length + ' item</p>' + list(L);
    }
    function calView() {
      var T = todayS(), key = st.tm || T.slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5), sd = st.sd || T;
      var wk = (ls('mo-cal-v1').set || {}).wk; wk = wk == null ? 1 : +wk;
      var first = new Date(y, m - 1, 1), lead = (first.getDay() - wk + 7) % 7, n = new Date(y, m, 0).getDate();
      var names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      var h = '<div class="tk3-cn"><button data-act="tnav" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>' + first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</b><button data-act="tnav" data-d="1" aria-label="Bulan berikutnya">›</button><button class="tk3-today" data-act="tnav" data-d="0">Hari ini</button></div><div class="tk3-grid">';
      for (var i = 0; i < 7; i++) h += '<span class="tk3-wd">' + names[(wk + i) % 7] + '</span>';
      for (i = 0; i < lead; i++) h += '<span></span>';
      for (var d = 1; d <= n; d++) {
        var ds = key + '-' + pad(d), x = top().filter(function (t) { return t.due === ds; });
        h += '<button class="tk3-day' + (ds === T ? ' td' : '') + (ds === sd ? ' sel' : '') + '" data-act="tday" data-d="' + ds + '">' + d +
          (x.length ? '<span class="tk3-dots">' + x.slice(0, 3).map(function (t) { return '<i style="background:' + (PCAL[t.priority] || '#8b93ad') + '"></i>'; }).join('') + '</span>' : '') + '</button>';
      }
      var on = top().filter(function (t) { return t.due === sd; });
      return h + '</div><div class="tk3-dayh"><b>' + fd(sd) + '</b><button class="tk3-cta sm" data-act="nav" data-v="new" data-due="' + sd + '">+ Di tanggal ini</button></div>' + list(sortTasks(on), 'Tidak ada tugas di tanggal ini.');
    }

    /* ---------- Riwayat ---------- */
    function hist() {
      var L = D.task.filter(function (t) { return nst(t) === 'Done' && t.status !== 'Archived'; }).sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
      var T = todayS(), wk = L.filter(function (t) { return t.doneAt && dd(t.doneAt, T) <= 6 && dd(t.doneAt, T) >= 0; }).length;
      var groups = {}, order = [];
      L.forEach(function (t) { var k = t.doneAt || 'Tanpa tanggal'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(t); });
      return '<div class="tk3-tiles two">' + tile('Selesai', L.length, 't-grn') + tile('7 hari terakhir', wk, 't-lav') + '</div>' +
        (order.length ? order.map(function (k) {
          return '<section class="tk3-grp g-hist"><h4>' + (k === 'Tanpa tanggal' ? k : fd(k)) + ' <span>' + groups[k].length + '</span></h4>' +
            groups[k].map(function (t) {
              var par = t.parentId ? by(D.task, t.parentId) : null;
              return '<div class="tk3-hist"><input type="checkbox" class="tk3-chk" checked data-act="tgd" data-id="' + t.id + '" aria-label="Kembalikan ke daftar"><div><span class="tk3-htt">' + esc(t.title) + '</span><small>' + KIND[kindOf(t)].l + (par ? ' · dari ' + esc(par.title) : '') + ' · ketuk kotak untuk mengembalikan</small></div><button class="tk3-ib tk3-trash" data-act="rmtask" data-id="' + t.id + '" aria-label="Hapus">🗑️</button></div>';
            }).join('') + '</section>';
        }).join('') : empty('Belum ada yang selesai. Tugas yang selesai akan muncul di sini.'));
    }

    /* ---------- tampilan penuh: tambah baru, detail, proyek ---------- */
    function vNew() {
      var dr = st.draft || (st.draft = blankDraft());
      var isEv = dr.kind === 'event', isPr = dr.kind === 'project';
      var kinds = ['todo', 'event', 'project'].map(function (k) {
        return '<button class="tk3-kind' + (dr.kind === k ? ' on' : '') + '" data-act="dk" data-v="' + k + '"><span>' + KIND[k].ico + '</span>' + KIND[k].l + '</button>';
      }).join('');
      var pris = PRIS.map(function (p) {
        return '<button class="tk3-pri p-' + PMETA[p].c + (dr.priority === p ? ' on' : '') + '" data-act="dpri" data-v="' + p + '"><span>' + PMETA[p].ico + '</span>' + PMETA[p].l + '</button>';
      }).join('');
      var subs = dr.subs.map(function (s, i) { return '<span class="tk3-chipx">' + esc(s) + '<button data-act="dsubdel" data-v="' + i + '" aria-label="Hapus">×</button></span>'; }).join('');
      return bar('Tambah baru') + '<div class="tk3-vw" data-draft>' +
        '<div class="tk3-kinds">' + kinds + '</div>' +
        '<form class="tk3-newf" onsubmit="return false"><input class="tk3-big" name="dt" value="' + esc(dr.title) + '" maxlength="120" placeholder="' + (isPr ? 'Nama proyek…' : isEv ? 'Nama acara…' : 'Apa yang mau dikerjakan?') + '">' +
        '<div class="tk3-row2"><label>Tanggal' + (isEv ? '' : ' (opsional)') + '<input type="date" name="dd" value="' + esc(dr.due) + '"></label>' +
        (isEv ? '<label>Mulai<input type="time" name="dtm" value="' + esc(dr.dueTime) + '"></label><label>Selesai<input type="time" name="dend" value="' + esc(dr.endTime) + '"></label>' : (isPr ? '' : '<label>Jam<input type="time" name="dtm" value="' + esc(dr.dueTime) + '"></label>')) + '</div>' +
        '<p class="tk3-lbl">Warna & tingkat</p><div class="tk3-pris">' + pris + '</div>' +
        '<label class="tk3-sm">Kategori<select name="dcat"><option value="">—</option>' + D.cats.map(function (c) { return '<option value="' + esc(c) + '"' + (c === dr.category ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
        '<button type="submit" class="tk3-cta save" data-act="savenew">Simpan</button></form>' +
        '<p class="tk3-lbl">' + (isPr ? 'Tugas di dalam proyek' : 'Subtugas') + ' <small>langsung tersimpan bersama item ini</small></p>' +
        '<div class="tk3-chipsx">' + (subs || '<span class="tk3-none">Belum ada</span>') + '</div>' +
        addForm('ds', 'dsub', '', isPr ? 'Tambah tugas, lalu Enter' : 'Tambah subtugas, lalu Enter') + '</div>';
    }
    function vDetail() {
      var t = by(D.task, st.tid); if (!t) { st.view = ''; return home(); }
      var k = kindOf(t), pm = PMETA[t.priority] || PMETA.Medium, subs = subsOf(t.id);
      return bar(KIND[k].l) + '<div class="tk3-vw">' +
        '<section class="tk3-big-n p-' + pm.c + '"><span class="tk3-ico big">' + pm.ico + '</span><h2>' + esc(t.title) + '</h2><p>' + KIND[k].l + ' · ' + pm.l + '</p></section>' +
        '<p class="tk3-lbl">Status</p>' + statSeg(t) +
        '<div class="tk3-row2"><label>Tanggal<input type="date" value="' + esc(t.due) + '" data-chg="tdue" data-id="' + t.id + '"></label><label>Jam<input type="time" value="' + esc(t.dueTime) + '" data-chg="ttime" data-id="' + t.id + '"></label></div>' +
        '<p class="tk3-lbl">Warna & tingkat</p><div class="tk3-pris">' + PRIS.map(function (p) { return '<button class="tk3-pri p-' + PMETA[p].c + (t.priority === p ? ' on' : '') + '" data-act="tpri" data-id="' + t.id + '" data-v="' + p + '"><span>' + PMETA[p].ico + '</span>' + PMETA[p].l + '</button>'; }).join('') + '</div>' +
        '<p class="tk3-lbl">Subtugas</p>' + (subs.length ? subs.map(function (s) {
          return '<div class="tk3-srow"><input type="checkbox" data-act="tgs" data-id="' + s.id + '"' + (s.done ? ' checked' : '') + '><span class="' + (s.done ? 'is-done' : '') + '">' + esc(s.title) + '</span><button class="tk3-ib" data-act="sdel" data-id="' + s.id + '" aria-label="Hapus">×</button></div>';
        }).join('') : '<p class="tk3-none">Belum ada subtugas.</p>') +
        addForm('sadd', 'sadd', t.id, 'Tambah subtugas, lalu Enter') +
        '<button class="tk3-danger" data-act="rmtask" data-id="' + t.id + '">Hapus ' + KIND[k].l.toLowerCase() + '</button></div>';
    }
    function vProj() {
      var p = by(D.task, st.pid); if (!p) { st.view = ''; return home(); }
      var kids = children(p.id), done = kids.filter(function (x) { return nst(x) === 'Done'; }).length, pct = Math.round(prog(p));
      return bar('Proyek') + '<div class="tk3-vw">' +
        '<section class="tk3-big-n p-medium"><span class="tk3-ico big">🗂️</span><h2>' + esc(p.title) + '</h2><p>' + done + ' dari ' + kids.length + ' tugas selesai · ' + pct + '%</p><div class="tk3-bar big"><i style="width:' + pct + '%"></i></div></section>' +
        '<div class="tk3-row2"><label>Tenggat<input type="date" value="' + esc(p.due) + '" data-chg="tdue" data-id="' + p.id + '"></label></div>' +
        '<p class="tk3-lbl">Tugas di dalam proyek</p>' +
        (kids.length ? kids.map(function (c) {
          return '<div class="tk3-kid' + (nst(c) === 'Done' ? ' is-done' : '') + '"><div class="tk3-kidt"><span>' + esc(c.title) + '</span><button class="tk3-ib tk3-trash" data-act="rmtask" data-id="' + c.id + '" aria-label="Hapus">' + (nst(c) === 'Done' ? '🗑️' : '×') + '</button></div>' + statSeg(c) + '</div>';
        }).join('') : '<p class="tk3-none">Belum ada tugas. Tambahkan di bawah.</p>') +
        addForm('padd', 'padd', p.id, 'Tambah tugas ke proyek, lalu Enter') +
        '<button class="tk3-danger" data-act="rmtask" data-id="' + p.id + '">Hapus proyek</button></div>';
    }
    function views() { return st.view === 'new' ? vNew() : st.view === 'detail' ? vDetail() : st.view === 'proj' ? vProj() : ''; }
    function wrap(fn) { return function () { return st.view ? views() : fn(); }; }

    /* ---------- aksi ---------- */
    function readDraft(root) {
      var dr = st.draft || (st.draft = blankDraft());
      if (!root) return dr;
      var g = function (n) { var e = root.querySelector('[name=' + n + ']'); return e ? e.value : null; }, v;
      if ((v = g('dt')) !== null) dr.title = v;
      if ((v = g('dd')) !== null) dr.due = v;
      if ((v = g('dtm')) !== null) dr.dueTime = v;
      if ((v = g('dend')) !== null) dr.endTime = v;
      if ((v = g('dcat')) !== null) dr.category = v;
      return dr;
    }
    function formValue(t) { var f = t.closest('form'), i = f && f.querySelector('input[name=v]'); return i ? i.value.trim().slice(0, 120) : ''; }

    function actImpl(a, d, t) {
        var x, root = t.closest ? t.closest('.tk3-vw') : null, v, dr;
        if (a === 'nav') {
          st.view = d.v || '';
          if (d.v === 'detail') st.tid = d.id;
          if (d.v === 'proj') st.pid = d.id;
          if (d.v === 'new') { st.draft = blankDraft(); if (d.due) st.draft.due = d.due; }
          return;
        }
        if (a === 'dk') { readDraft(root); st.draft.kind = d.v; return; }
        if (a === 'dpri') { readDraft(root); st.draft.priority = d.v; return; }
        if (a === 'dsub') {
          readDraft(root); v = formValue(t);
          if (v) st.draft.subs.push(v);
          st.focus = 'ds'; return;
        }
        if (a === 'dsubdel') { readDraft(root); st.draft.subs.splice(+d.v, 1); return; }
        if (a === 'savenew') {
          dr = readDraft(root);
          if (!dr.title.trim()) { MO.msg('Judul kosong', 'Tulis nama dulu ya.'); return; }
          var item = mk({ kind: dr.kind, title: dr.title.trim().slice(0, 120), priority: dr.priority, due: dr.due || '', dueTime: dr.dueTime || '', endTime: dr.endTime || '', category: dr.category || '' });
          if (item.kind === 'project') item.status = 'To Do';
          D.task.push(item);
          if (item.kind === 'project') dr.subs.forEach(function (s) { D.task.push(mk({ title: s, kind: 'todo', parentId: item.id })); });
          else dr.subs.forEach(function (s) { D.sub.push({ id: K.uid(), taskId: item.id, title: s, done: false }); });
          st.draft = null; st.view = '';
          return;
        }
        if (a === 'quick') {
          v = (root || t.closest('form')).querySelector('input[name=qt]'); var q = v ? v.value.trim() : '';
          if (!q) { if (v) v.focus(); return; }
          D.task.push(mk({ title: q.slice(0, 120), due: d.due === 'today' ? todayS() : '' }));
          st.focus = 'qt'; return;
        }
        if (a === 'tgd') { x = by(D.task, d.id); if (!x) return; setStatus(x, t.checked ? 'Done' : 'To Do'); syncParent(x); return; }
        if (a === 'tst') { x = by(D.task, d.id); if (!x) return; setStatus(x, d.s); syncParent(x); return; }
        if (a === 'tgs') { x = by(D.sub, d.id); if (x) x.done = t.checked; return; }
        if (a === 'sdel') { D.sub = D.sub.filter(function (s) { return s.id !== d.id; }); return; }
        if (a === 'sadd') { v = formValue(t); if (v) { D.sub.push({ id: K.uid(), taskId: d.id, title: v, done: false }); st.focus = 'sadd'; } return; }
        if (a === 'padd') {
          v = formValue(t);
          if (v) { D.task.push(mk({ title: v, kind: 'todo', parentId: d.id })); st.focus = 'padd'; }
          return;
        }
        if (a === 'tdue') { x = by(D.task, d.id); if (x) x.due = d.v; return; }
        if (a === 'ttime') { x = by(D.task, d.id); if (x) x.dueTime = d.v; return; }
        if (a === 'tpri') { x = by(D.task, d.id); if (x) x.priority = d.v; return; }
        if (a === 'rmtask') {
          x = by(D.task, d.id); if (!x) return;
          if (!confirm('Hapus "' + x.title + '"?' + (kindOf(x) === 'project' ? ' Semua tugas di dalamnya ikut terhapus.' : ''))) return;
          var par = x.parentId; removeTask(d.id);
          if (par) { var p = by(D.task, par); if (p) syncParent({ parentId: par }); }
          if (st.tid === d.id || st.pid === d.id) st.view = '';
          return;
        }
        if (a === 'tnav') {
          if (+d.d === 0) { st.tm = todayS().slice(0, 7); st.sd = todayS(); }
          else { var k = (st.tm || todayS().slice(0, 7)).split('-'), dt = new Date(+k[0], +k[1] - 1 + +d.d, 1); st.tm = dt.getFullYear() + '-' + pad(dt.getMonth() + 1); }
          return;
        }
        if (a === 'tday') { st.sd = d.d; st.tm = d.d.slice(0, 7); return; }
        if (a === 'photo') {
          var fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
          fi.onchange = function () {
            var f = fi.files && fi.files[0]; if (!f) return;
            var r = new FileReader();
            r.onload = function () {
              var im = new Image();
              im.onload = function () {
                var s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 256;
                c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 256, 256);
                if (MO.setPhoto) MO.setPhoto(c.toDataURL('image/jpeg', 0.85));
                app.render();
              };
              im.src = r.result;
            };
            r.readAsDataURL(f);
          };
          fi.click();
          return;
        }
      }
    function pendingFocus() {
      if (!st.focus) return;
      var f = st.focus; st.focus = '';
      setTimeout(function () { var el = document.querySelector('form[data-f="' + f + '"] input'); if (el) el.focus(); }, 0);
    }
    return {
      skin: 'tk3-skin', specs: specs,
      tabs: [['hari', 'Hari ini', wrap(home)], ['semua', 'Semua', wrap(all)], ['riwayat', 'Riwayat', wrap(hist)]],
      sub: function () { var n = D.task.filter(function (t) { return !t.parentId && live(t) && t.due && t.due < todayS(); }).length; return top().filter(live).length + ' aktif' + (n ? ' · ' + n + ' terlambat' : ''); },
      cascade: { task: [['sub', 'taskId']] },
      act: function (a, d, t) { actImpl(a, d, t); pendingFocus(); }
    };
  });

  /* angka menghitung dari 0 saat pertama kali terlihat */
  var seenCnt = {};
  function countUp(el) {
    var to = +el.getAttribute('data-cnt'), key = el.getAttribute('data-lab') || ('' + to);
    if (!isFinite(to) || seenCnt[key] !== undefined) return;
    seenCnt[key] = to;
    var suf = el.getAttribute('data-suf') || '', t0 = null;
    el.textContent = '0' + suf;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / 2600), e = 1 - Math.pow(1 - k, 2);
      el.textContent = Math.round(to * e) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if (window.MutationObserver) new MutationObserver(function () { document.querySelectorAll('b[data-cnt]').forEach(countUp); }).observe(document.body, { childList: true, subtree: true });

  MO.routes['#task'] = tasks.open;
})();
