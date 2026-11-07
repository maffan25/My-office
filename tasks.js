/* MyOffice — Task (versi ringkas): tambah cepat, subtugas, riwayat selesai, kanban & kalender berwarna.
   Data tetap di localStorage 'mo-task-v1' dengan field yang sama seperti sebelumnya. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, todayS = K.todayS, by = K.by, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var addDays = K.addDays = function (s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dd = K.dd = function (a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 864e5); };

  /* ---------- label & warna (sumber tunggal) ---------- */
  var PRI = ['Urgent', 'High', 'Medium', 'Low'];
  var PLBL = { Urgent: 'Urgent', High: 'Tinggi', Medium: 'Sedang', Low: 'Santai' };
  var PCOL = { Urgent: '#ff6b8a', High: '#ff9f5a', Medium: '#ffd45e', Low: '#6ee7c7' };
  var ST = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Done', 'Archived'];
  var SLBL = { Inbox: 'Masuk', 'To Do': 'Akan dikerjakan', 'In Progress': 'Sedang dikerjakan', Waiting: 'Menunggu', Done: 'Selesai', Archived: 'Diarsipkan' };
  var SCOL = { Inbox: '#94a3c4', 'To Do': '#a78bfa', 'In Progress': '#fbbf24', Waiting: '#f472b6', Done: '#34d399', Archived: '#64748b' };
  var COLS = ['To Do', 'In Progress', 'Waiting', 'Done'];
  var PRI_OPT = PRI.map(function (p) { return [p, PLBL[p]]; });
  var ST_OPT = ST.map(function (s) { return [s, SLBL[s]]; });
  var projects = function () { return ls('mo-proj-v1').proj || []; };
  var live = function (t) { return t.status !== 'Done' && t.status !== 'Archived'; };
  var sortTasks = function (L) {
    return L.slice().sort(function (a, b) {
      var da = a.due || '9', db = b.due || '9';
      return da.localeCompare(db) || (PRI.indexOf(a.priority) - PRI.indexOf(b.priority));
    });
  };
  function chip(text, c) { return '<span class="tk2-chip" style="--c:' + c + '">' + esc(text) + '</span>'; }
  function dueInfo(t) {
    if (!t.due) return null;
    var tm = t.dueTime ? ' · ' + t.dueTime : '';
    if (!live(t)) return { text: fd(t.due) + tm, c: '#94a3c4' };
    var d = dd(todayS(), t.due);
    if (d < 0) return { text: 'Terlambat ' + (-d) + ' hari', c: '#ff6b8a' };
    if (d === 0) return { text: 'Hari ini' + tm, c: '#ffd45e' };
    if (d === 1) return { text: 'Besok' + tm, c: '#7cc4ff' };
    return { text: fd(t.due) + tm, c: '#94a3c4' };
  }

  var tasks = K.App('Task', 'mo-task-v1', function () { return { task: [], sub: [], cats: ['Belajar', 'Kerja', 'Rapat', 'Administrasi', 'Kesehatan', 'Rumah', 'Lainnya'] }; }, function (app) {
    var D = app.D, st = app.st;
    if (!D.cats) D.cats = ['Lainnya'];
    if (!D.sub) D.sub = [];
    var pn = function (id) { var p = by(projects(), id); return p ? p.name : ''; };

    var specs = {
      task: { title: 'Tugas', def: { status: 'To Do', priority: 'Medium' }, fields: [
        { k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 },
        { k: 'status', l: 'Status', t: 'select', o: ST_OPT },
        { k: 'priority', l: 'Prioritas', t: 'select', o: PRI_OPT },
        { k: 'due', l: 'Tenggat', t: 'date' },
        { k: 'dueTime', l: 'Jam (opsional)', t: 'time' },
        { k: 'category', l: 'Kategori', t: 'select', o: function () { return [['', '—']].concat(D.cats.map(function (c) { return [c, c]; })); } },
        { k: 'projId', l: 'Proyek', t: 'select', o: function () { return [['', '— Tanpa proyek —']].concat(projects().map(function (p) { return [p.id, p.name]; })); } },
        { k: 'pin', l: 'Fokus hari ini', t: 'select', bool: 1, o: [['false', 'Tidak'], ['true', 'Ya']] },
        { k: 'desc', l: 'Catatan', t: 'textarea', full: 1 },
        { k: 'remindAt', l: 'Pengingat', t: 'datetime-local' },
        { k: 'goalRef', l: 'Terkait goal', t: 'select', full: 1, o: function () { return MO.goalOpts ? MO.goalOpts() : [['', '—']]; } }
      ] },
      sub: { title: 'Subtugas', def: {}, fields: [{ k: 'title', l: 'Subtugas', t: 'text', req: 1, full: 1 }] }
    };

    /* ---------- bagian kecil ---------- */
    function quick(due) {
      return '<form class="tk2-quick" onsubmit="return false"><span class="tk2-qi" aria-hidden="true">＋</span>' +
        '<input name="qt" maxlength="120" placeholder="Tulis tugas, lalu tekan Enter" autocomplete="off" aria-label="Tugas baru">' +
        '<button type="submit" class="tk2-qgo" data-act="quick" data-due="' + due + '">Simpan</button></form>';
    }
    function tile(label, n, c) { return '<div class="tk2-tile" style="--c:' + c + '"><small>' + label + '</small><b>' + n + '</b></div>'; }
    function bar(p) { return '<div class="tk2-bar"><i style="width:' + Math.round(p) + '%"></i></div>'; }

    /* ---------- kartu tugas (dipakai di semua tampilan) ---------- */
    function card(t, mode) {
      var done = t.status === 'Done', subs = D.sub.filter(function (s) { return s.taskId === t.id; }), sd = subs.filter(function (s) { return s.done; }).length;
      var pc = PCOL[t.priority] || '#94a3c4', sc = SCOL[t.status] || '#94a3c4', di = dueInfo(t);
      var open = !!(st.exp && st.exp[t.id]);
      var h = '<article class="tk2-ticket' + (done ? ' is-done' : '') + '" style="--p:' + pc + ';--s:' + sc + '">' +
        '<div class="tk2-row"><input type="checkbox" class="tk2-chk" data-act="tgd" data-id="' + t.id + '"' + (done ? ' checked' : '') + ' aria-label="Tandai selesai"><div class="tk2-main">' +
        '<button class="tk2-title" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>' +
        '<div class="tk2-meta">' + chip(PLBL[t.priority] || t.priority, pc) + chip(SLBL[t.status] || t.status, sc) +
        (di ? '<span class="tk2-due" style="--c:' + di.c + '">' + esc(di.text) + '</span>' : '') +
        (t.category ? '<span class="tk2-cat">' + esc(t.category) + '</span>' : '') +
        (t.projId && pn(t.projId) ? '<span class="tk2-cat">' + esc(pn(t.projId)) + '</span>' : '') +
        (subs.length ? '<span class="tk2-cat">' + sd + '/' + subs.length + ' subtugas</span>' : '') + '</div></div>' +
        '<div class="tk2-acts"><button class="tk2-ib" data-act="exp" data-id="' + t.id + '" aria-expanded="' + open + '" aria-label="Subtugas">' + (open ? '▴' : '▾') + '</button>' +
        '<button class="tk2-ib danger" data-act="del" data-e="task" data-id="' + t.id + '" aria-label="Hapus tugas">×</button></div></div>';
      if (mode === 'kanban') {
        var i = COLS.indexOf(t.status === 'Inbox' ? 'To Do' : t.status);
        h += '<div class="tk2-move">' + (i > 0 ? '<button data-act="mvs" data-id="' + t.id + '" data-s="' + COLS[i - 1] + '">‹ ' + SLBL[COLS[i - 1]] + '</button>' : '<span></span>') +
          (i < COLS.length - 1 ? '<button data-act="mvs" data-id="' + t.id + '" data-s="' + COLS[i + 1] + '">' + SLBL[COLS[i + 1]] + ' ›</button>' : '<span></span>') + '</div>';
      }
      if (open) {
        h += '<div class="tk2-subs">' + (subs.length ? bar(sd / subs.length * 100) + subs.map(function (s) {
          return '<div class="tk2-srow"><input type="checkbox" data-act="tgs" data-id="' + s.id + '"' + (s.done ? ' checked' : '') + ' aria-label="Subtugas selesai"><span class="' + (s.done ? 'is-done' : '') + '">' + esc(s.title) + '</span><button class="tk2-ib danger" data-act="sdel" data-id="' + s.id + '" aria-label="Hapus subtugas">×</button></div>';
        }).join('') : '<p class="tk2-none">Belum ada subtugas.</p>') +
          '<form class="tk2-sadd" data-tid="' + t.id + '" onsubmit="return false"><input name="st" maxlength="120" placeholder="Tambah subtugas, lalu Enter" autocomplete="off" aria-label="Subtugas baru"><button type="submit" data-act="sadd" data-id="' + t.id + '">+ Tambah</button></form></div>';
      }
      return h + '</article>';
    }
    function list(L, mode) { return L.length ? L.map(function (t) { return card(t, mode); }).join('') : empty('Belum ada tugas di sini.'); }

    /* ---------- Hari ini ---------- */
    function home() {
      var T = todayS(), A = D.task.filter(live), seen = {}, late, focus, soon, none, n = { todo: 0, prog: 0, late: 0, done: 0 };
      var take = function (x) { return x.filter(function (t) { if (seen[t.id]) return false; seen[t.id] = 1; return true; }); };
      late = take(sortTasks(A.filter(function (t) { return t.due && t.due < T; })));
      focus = take(sortTasks(A.filter(function (t) { return t.due === T || t.pin || t.status === 'In Progress'; })));
      soon = take(sortTasks(A.filter(function (t) { return t.due && t.due > T && dd(T, t.due) <= 14; })));
      none = take(sortTasks(A.filter(function (t) { return !t.due; })));
      n.todo = A.filter(function (t) { return t.status === 'To Do' || t.status === 'Inbox'; }).length;
      n.prog = A.filter(function (t) { return t.status === 'In Progress'; }).length;
      n.late = late.length; n.done = D.task.filter(function (t) { return t.status === 'Done'; }).length;
      var all = D.task.filter(function (t) { return t.status !== 'Archived'; }), pct = all.length ? n.done / all.length * 100 : 0;
      var set = ls('mo-settings-v1'), photo = set.photo ? ' style="background-image:url(&quot;' + esc(set.photo) + '&quot;)"' : '';
      var group = function (title, L, tone) {
        return '<section class="tk2-group tone-' + tone + '"><div class="tk2-gh"><h4>' + title + '</h4><span>' + L.length + '</span></div>' + list(L) + '</section>';
      };
      return '<div class="tk2-head"><div><p class="tk2-hi">Halo' + (set.nick ? ', <b>' + esc(set.nick) + '</b>' : '') + '</p><h3>' + fd(T) + '</h3></div>' +
        '<button class="tk2-av" data-act="photo" aria-label="Ganti foto profil"><span class="tk2-avi"' + photo + '></span><small>Ganti</small></button></div>' +
        '<div class="tk2-tiles">' + tile('Akan dikerjakan', n.todo, '#a78bfa') + tile('Sedang dikerjakan', n.prog, '#fbbf24') + tile('Terlambat', n.late, '#f472b6') + tile('Selesai', n.done, '#34d399') + '</div>' +
        '<div class="tk2-overall"><span>Progres keseluruhan</span><b>' + Math.round(pct) + '%</b></div>' + bar(pct) +
        quick('today') +
        (late.length ? group('Terlambat', late, 'late') : '') + (focus.length ? group('Fokus hari ini', focus, 'focus') : '') +
        (soon.length ? group('14 hari ke depan', soon, 'soon') : '') + (none.length ? group('Tanpa tenggat', none, 'none') : '') +
        (!late.length && !focus.length && !soon.length && !none.length ? empty('Belum ada tugas aktif. Tulis tugas di kolom atas.') : '');
    }

    /* ---------- Semua: daftar / kanban / kalender ---------- */
    function filtered() {
      var q = (st.q || '').toLowerCase().trim();
      return D.task.filter(function (t) {
        if (st.fs ? t.status !== st.fs : t.status === 'Archived') return false;
        if (st.fp && t.priority !== st.fp) return false;
        if (q && (t.title + ' ' + (t.desc || '') + ' ' + (t.category || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
    }
    function toolbar() {
      var md = st.md || 'Daftar', fs = st.fs || '', fp = st.fp || '';
      var chips = function (f, items, cur) {
        return items.map(function (x) { return '<button class="tk2-f" aria-pressed="' + (x[0] === cur) + '" data-act="filt" data-f="' + f + '" data-v="' + x[0] + '"' + (x[2] ? ' style="--c:' + x[2] + '"' : '') + '>' + x[1] + '</button>'; }).join('');
      };
      return quick('') +
        '<div class="tk2-bar2"><input type="search" data-in="q" value="' + esc(st.q || '') + '" placeholder="Cari tugas…" aria-label="Cari tugas"></div>' +
        '<div class="tk2-sgm">' + ['Daftar', 'Kanban', 'Kalender'].map(function (m) { return '<button aria-pressed="' + (m === md) + '" data-act="filt" data-f="md" data-v="' + m + '">' + m + '</button>'; }).join('') + '</div>' +
        '<div class="tk2-fr">' + chips('fs', [['', 'Semua'], ['To Do', 'Akan dikerjakan', SCOL['To Do']], ['In Progress', 'Sedang dikerjakan', SCOL['In Progress']], ['Waiting', 'Menunggu', SCOL.Waiting], ['Done', 'Selesai', SCOL.Done]], fs) + '</div>' +
        '<div class="tk2-fr">' + chips('fp', [['', 'Semua prioritas']].concat(PRI.map(function (p) { return [p, PLBL[p], PCOL[p]]; })), fp) + '</div>';
    }
    function kanban(L) {
      return '<div class="tk2-kb">' + COLS.map(function (s) {
        var x = L.filter(function (t) { return t.status === s || (s === 'To Do' && t.status === 'Inbox'); });
        return '<div class="tk2-col" style="--c:' + SCOL[s] + '"><div class="tk2-colh"><b>' + SLBL[s] + '</b><span>' + x.length + '</span></div>' +
          (x.length ? x.map(function (t) { return card(t, 'kanban'); }).join('') : '<p class="tk2-none">Kosong</p>') + '</div>';
      }).join('') + '</div>';
    }
    function calView() {
      var T = todayS(), key = st.tm || T.slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5), sd = st.sd || T;
      var wk = (ls('mo-cal-v1').set || {}).wk; wk = wk == null ? 1 : +wk;
      var first = new Date(y, m - 1, 1), lead = (first.getDay() - wk + 7) % 7, n = new Date(y, m, 0).getDate();
      var names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], h = '<div class="tk2-cn"><button data-act="tnav" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>' + first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</b><button data-act="tnav" data-d="1" aria-label="Bulan berikutnya">›</button><button class="tk2-today" data-act="tnav" data-d="0">Hari ini</button></div><div class="tk2-grid">';
      for (var i = 0; i < 7; i++) h += '<span class="tk2-wd">' + names[(wk + i) % 7] + '</span>';
      for (i = 0; i < lead; i++) h += '<span></span>';
      for (var d = 1; d <= n; d++) {
        var ds = key + '-' + pad(d), x = D.task.filter(function (t) { return t.due === ds && t.status !== 'Archived'; });
        h += '<button class="tk2-day' + (ds === T ? ' td' : '') + (ds === sd ? ' sel' : '') + '" data-act="tday" data-d="' + ds + '" aria-label="' + d + ', ' + x.length + ' tugas">' + d +
          (x.length ? '<span class="tk2-dots">' + x.slice(0, 3).map(function (t) { return '<i style="background:' + (PCOL[t.priority] || '#94a3c4') + '"></i>'; }).join('') + '</span>' : '') + '</button>';
      }
      var on = D.task.filter(function (t) { return t.due === sd && t.status !== 'Archived'; });
      return h + '</div><div class="tk2-dayh"><b>' + fd(sd) + '</b><button class="tk2-qgo" data-act="add" data-e="task" data-pre="' + esc(JSON.stringify({ due: sd })) + '">+ Tugas</button></div>' +
        list(sortTasks(on));
    }
    function all() {
      var md = st.md || 'Daftar', L = sortTasks(filtered());
      var head = toolbar();
      if (md === 'Kalender') return head + calView();
      if (md === 'Kanban') return head + kanban(L);
      return head + '<p class="tk2-hint">' + L.length + ' tugas</p>' + list(L);
    }

    /* ---------- Riwayat ---------- */
    function hist() {
      var L = D.task.filter(function (t) { return t.status === 'Done'; }).sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
      var T = todayS(), wk = L.filter(function (t) { return t.doneAt && dd(t.doneAt, T) <= 6 && dd(t.doneAt, T) >= 0; }).length;
      var groups = {}, order = [];
      L.forEach(function (t) { var k = t.doneAt || 'Tanpa tanggal'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(t); });
      return '<div class="tk2-tiles two">' + tile('Selesai', L.length, '#34d399') + tile('7 hari terakhir', wk, '#7cc4ff') + '</div>' +
        (order.length ? order.map(function (k) {
          return '<section class="tk2-group"><div class="tk2-gh"><h4>' + (k === 'Tanpa tanggal' ? k : fd(k)) + '</h4><span>' + groups[k].length + '</span></div>' +
            groups[k].map(function (t) {
              return '<div class="tk2-hist"><input type="checkbox" class="tk2-chk" checked data-act="tgd" data-id="' + t.id + '" aria-label="Batalkan selesai"><div><span class="tk2-htitle">' + esc(t.title) + '</span><small>' + (t.category ? esc(t.category) + ' · ' : '') + 'hapus centang untuk mengembalikan</small></div></div>';
            }).join('') + '</section>';
        }).join('') : empty('Belum ada tugas yang selesai. Riwayat akan muncul di sini.'));
    }

    return {
      skin: 'tk2-skin', specs: specs,
      tabs: [['hari', 'Hari ini', home], ['semua', 'Semua', all], ['riwayat', 'Riwayat', hist]],
      sub: function () { var n = D.task.filter(function (t) { return live(t) && t.due && t.due < todayS(); }).length; return D.task.filter(live).length + ' aktif' + (n ? ' · ' + n + ' terlambat' : ''); },
      cascade: { task: [['sub', 'taskId']] },
      saved: function (e, r) {
        if (e === 'task') { if (r.status === 'Done' && !r.doneAt) r.doneAt = todayS(); if (r.status !== 'Done') r.doneAt = ''; }
      },
      act: function (a, d, t) {
        var x, form;
        if (a === 'quick') {
          form = t.closest('form'); var inp = form && form.querySelector('input[name=qt]'), v = inp ? inp.value.trim() : '';
          if (!v) { if (inp) inp.focus(); return; }
          D.task.push({ id: K.uid(), title: v.slice(0, 120), status: 'To Do', priority: 'Medium', due: d.due === 'today' ? todayS() : '', dueTime: '', category: '', pin: false, desc: '', doneAt: '' });
          st.focus = 'qt';
        }
        if (a === 'tgd') { x = by(D.task, d.id); if (!x) return; x.status = t.checked ? 'Done' : 'To Do'; x.doneAt = t.checked ? todayS() : ''; }
        if (a === 'tgs') { x = by(D.sub, d.id); if (x) x.done = t.checked; }
        if (a === 'sadd') {
          form = t.closest('form'); var si = form && form.querySelector('input'), sv = si ? si.value.trim() : '';
          if (!sv) return;
          D.sub.push({ id: K.uid(), taskId: d.id, title: sv.slice(0, 120), done: false });
          st.exp = st.exp || {}; st.exp[d.id] = 1; st.focus = 'sub:' + d.id;
        }
        if (a === 'sdel') { D.sub = D.sub.filter(function (s) { return s.id !== d.id; }); }
        if (a === 'exp') { st.exp = st.exp || {}; st.exp[d.id] = !st.exp[d.id]; }
        if (a === 'mvs') { x = by(D.task, d.id); if (x) { x.status = d.s; x.doneAt = d.s === 'Done' ? todayS() : ''; } }
        if (a === 'tnav') {
          if (+d.d === 0) { st.tm = todayS().slice(0, 7); st.sd = todayS(); }
          else { var k = (st.tm || todayS().slice(0, 7)).split('-'), dt = new Date(+k[0], +k[1] - 1 + +d.d, 1); st.tm = dt.getFullYear() + '-' + pad(dt.getMonth() + 1); }
        }
        if (a === 'tday') { st.sd = d.d; st.tm = d.d.slice(0, 7); }
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
        }
        if (st.focus) {
          var fo = st.focus; st.focus = '';
          setTimeout(function () {
            var el = fo === 'qt' ? document.querySelector('.tk2-quick input') : document.querySelector('.tk2-sadd[data-tid="' + fo.slice(4) + '"] input');
            if (el) el.focus();
          }, 0);
        }
      }
    };
  });

  MO.routes['#task'] = tasks.open;
})();
