/* MyOffice — Task (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, todayS = K.todayS, by = K.by, empty = K.empty, add = K.add, chips = K.chips, opt = K.opt, badge = K.badge;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var addDays = K.addDays = function (s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dd = K.dd = function (a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 864e5); };
  var PRI = ['Urgent', 'High', 'Medium', 'Low'], PCOL = { Urgent: '#de9b88', High: '#e39f8c', Medium: '#da9684', Low: '#8cc4d0' }, PR = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  var ST = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Done', 'Archived'], AREAS = ['Akademik', 'Pekerjaan', 'Organisasi', 'Pribadi'];
  var TABS = [['myday', 'My Day'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['all', 'All Tasks'], ['project', 'By Project'], ['area', 'By Area'], ['done', 'Completed']];
  var projects = function () { return ls('mo-proj-v1').proj || []; };
  var sel = function (k, label, o, cur) { return '<select data-in="' + k + '" aria-label="' + label + '" style="width:auto">' + o.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur || '') ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>'; };

  var tasks = K.App('Task', 'mo-task-v1', function () { return { task: [], sub: [], cats: ['Belajar', 'Kerja', 'Rapat', 'Administrasi', 'Kesehatan', 'Rumah', 'Lainnya'] }; }, function (app) {
    var D = app.D, st = app.st; if (!D.cats) D.cats = ['Lainnya'];
    if (!D.dash || !D.dash.length) D.dash = [{ id: 'dash', emoji: '🥳', title: 'Halo', sub: 'Rencanakan hari ini dengan tenang', hint: 'Mulai dari tugas yang paling penting.', btn: 'Tambah tugas' }];
    var DS = D.dash[0];
    var live = function (t) { return t.status !== 'Done' && t.status !== 'Archived'; };
    var pn = function (id) { var p = by(projects(), id); return p ? p.name : ''; };
    var specs = {
      task: { title: 'Tugas', def: { status: 'To Do', priority: 'Medium', area: 'Pribadi' }, fields: [
        { k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 }, { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'status', l: 'Status', t: 'select', o: opt(ST) }, { k: 'priority', l: 'Prioritas', t: 'select', o: opt(PRI) },
        { k: 'area', l: 'Area', t: 'select', o: opt(AREAS) }, { k: 'category', l: 'Kategori', t: 'select', o: function () { return [['', '—']].concat(D.cats.map(function (c) { return [c, c]; })); } },
        { k: 'projId', l: 'Proyek terkait', t: 'select', full: 1, o: function () { return [['', '— Tanpa proyek —']].concat(projects().map(function (p) { return [p.id, p.name]; })); } },
        { k: 'start', l: 'Tanggal mulai', t: 'date' }, { k: 'due', l: 'Tenggat waktu', t: 'date' }, { k: 'dueTime', l: 'Jam tenggat (opsional)', t: 'time' },
        { k: 'estMin', l: 'Estimasi durasi (menit)', t: 'number', min: 0, step: '5' }, { k: 'remindAt', l: 'Pengingat', t: 'datetime-local' },
        { k: 'pin', l: 'Fokus hari ini (My Day)', t: 'select', bool: 1, o: [['false', 'Tidak'], ['true', 'Ya']] }, { k: 'doneAt', l: 'Tanggal selesai', t: 'date' },
        { k: 'goalRef', l: 'Terkait goal / milestone', t: 'select', full: 1, o: function () { return MO.goalOpts ? MO.goalOpts() : [['', '—']]; } },
        { k: 'notes', l: 'Catatan tambahan', t: 'textarea', full: 1 }] },
      dash: { title: 'Sapaan Dashboard', def: {}, fields: [{ k: 'title', l: 'Sapaan', t: 'text', req: 1, full: 1 }, { k: 'emoji', l: 'Emoji', t: 'text', ph: '🥳' }, { k: 'btn', l: 'Teks tombol', t: 'text' }, { k: 'sub', l: 'Kalimat utama', t: 'text', full: 1 }, { k: 'hint', l: 'Kalimat pendukung', t: 'text', full: 1 }] },
      sub: { title: 'Subtugas', def: {}, fields: [{ k: 'title', l: 'Subtugas', t: 'text', req: 1, full: 1 }] }
    };
    function dueTag(t) {
      if (!t.due) return '';
      var tm = t.dueTime ? ' ' + t.dueTime : '';
      if (!live(t)) return '<span class="ac-badge">' + fd(t.due) + '</span>';
      var d = dd(todayS(), t.due);
      if (d < 0) return badge('Terlambat ' + (-d) + ' hari', 'late');
      if (d === 0) return badge('Hari ini' + tm, 'mid');
      if (d <= 2) return badge((d === 1 ? 'Besok' : fd(t.due)) + tm, 'soon');
      return '<span class="ac-badge">' + fd(t.due) + tm + '</span>';
    }
    function card(t) {
      var subs = D.sub.filter(function (s) { return s.taskId === t.id; }), sd = subs.filter(function (s) { return s.done; }).length, done = t.status === 'Done';
      var meta = [t.area, t.category, t.projId && pn(t.projId), has(t.estMin) && t.estMin + ' mnt', t.start && 'Mulai ' + fd(t.start), t.doneAt && done && 'Selesai ' + fd(t.doneAt), t.remindAt && '🔔 ' + new Date(t.remindAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })].filter(Boolean).map(esc).join(' · ');
      return '<div class="ac-item' + (done ? ' done' : '') + '" style="border-left:3px solid ' + PCOL[t.priority] + '"><input type="checkbox" data-act="tgd" data-id="' + t.id + '"' + (done ? ' checked' : '') + ' aria-label="Selesai"><div>' +
        '<button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>' + badge(t.priority) + badge(t.status) + dueTag(t) + '<small>' + meta + '</small>' + (t.desc ? '<small>' + esc(t.desc) + '</small>' : '') + (t.notes ? '<small>Catatan: ' + esc(t.notes) + '</small>' : '') +
        (subs.length ? '<small style="margin-top:6px">Subtugas ' + sd + '/' + subs.length + '</small>' + subs.map(function (s) { return '<div style="display:flex;gap:8px;align-items:center;font-size:12.5px;margin-top:3px"><input type="checkbox" data-act="tgs" data-id="' + s.id + '"' + (s.done ? ' checked' : '') + ' aria-label="Subtugas selesai"><span style="' + (s.done ? 'opacity:.55;text-decoration:line-through' : '') + '">' + esc(s.title) + '</span><button class="ac-btn sm danger" style="padding:0 7px" data-act="del" data-e="sub" data-id="' + s.id + '" aria-label="Hapus subtugas">×</button></div>'; }).join('') : '') +
        '<div class="ac-acts" style="margin-top:8px"><button class="ac-btn sm" data-act="add" data-e="sub" data-pk="taskId" data-pv="' + t.id + '">+ Subtugas</button><button class="ac-btn sm" data-act="arch" data-id="' + t.id + '">' + (t.status === 'Archived' ? 'Pulihkan' : 'Arsipkan') + '</button>' +
        '<select data-chg="mvp" data-id="' + t.id + '" style="width:auto;padding:4px 8px;font-size:12px" aria-label="Pindahkan ke proyek"><option value="">Pindah ke proyek…</option><option value="__none">Tanpa proyek</option>' + projects().map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select>' +
        '<button class="ac-btn sm danger" data-act="del" data-e="task" data-id="' + t.id + '">Hapus</button></div></div></div>';
    }
    function match(t) {
      var q = (st.q || '').toLowerCase().trim(), today = todayS();
      if (q && (t.title + ' ' + (t.desc || '') + ' ' + (t.notes || '') + ' ' + (t.category || '')).toLowerCase().indexOf(q) < 0) return false;
      if (st.fs && t.status !== st.fs) return false; if (st.fp && t.priority !== st.fp) return false; if (st.fc && t.category !== st.fc) return false;
      if (st.fd === 'today' && t.due !== today) return false; if (st.fd === 'week' && !(t.due && t.due >= today && t.due <= addDays(today, 7))) return false;
      if (st.fd === 'late' && !(t.due && t.due < today && live(t))) return false; if (st.fd === 'none' && t.due) return false;
      return true;
    }
    function sorted(L) {
      return L.slice().sort(function (a, b) {
        var da = a.due || '9', db = b.due || '9', pa = PR[a.priority], pb = PR[b.priority];
        return st.so === 'pri' ? (pa - pb) || da.localeCompare(db) : da.localeCompare(db) || (pa - pb);
      });
    }
    function base(id) {
      var today = todayS();
      return D.task.filter(function (t) {
        if (id === 'myday') return live(t) && (t.pin || t.due === today || t.status === 'In Progress' || t.start === today);
        if (id === 'upcoming') return live(t) && t.due && t.due > today && t.due <= addDays(today, 30);
        if (id === 'overdue') return live(t) && t.due && t.due < today;
        if (id === 'done') return t.status === 'Done';
        return st.fs === 'Archived' ? true : t.status !== 'Archived';
      });
    }
    function toolbar(n) {
      var md = st.md || 'Daftar';
      return '<div class="ac-bar"><input type="text" data-in="q" placeholder="Cari tugas…" value="' + esc(st.q || '') + '" style="width:min(260px,100%)" aria-label="Cari tugas"><div class="ac-acts">' + add('task', 'Tugas') + '<button class="ac-btn" data-act="addcat">+ Kategori</button></div></div>' +
        '<div class="ac-chips">' + ['Daftar', 'Kanban', 'Kalender'].map(function (m) { return '<button class="ac-chip" aria-pressed="' + (m === md) + '" data-act="filt" data-f="md" data-v="' + m + '">' + m + '</button>'; }).join('') +
        sel('fs', 'Status', [['', 'Semua status']].concat(opt(ST)), st.fs) + sel('fp', 'Prioritas', [['', 'Semua prioritas']].concat(opt(PRI)), st.fp) + sel('fc', 'Kategori', [['', 'Semua kategori']].concat(D.cats.map(function (c) { return [c, c]; })), st.fc) +
        sel('fd', 'Tenggat', [['', 'Semua tenggat'], ['today', 'Hari ini'], ['week', '7 hari ke depan'], ['late', 'Terlambat'], ['none', 'Tanpa tenggat']], st.fd) + sel('so', 'Urutan', [['due', 'Urut: Tenggat'], ['pri', 'Urut: Prioritas']], st.so) + '</div>' +
        '<p class="ac-hint" style="margin-bottom:10px">' + n + ' tugas</p>';
    }
    function groups(id, L) {
      var today = todayS(), g = [];
      if (id === 'upcoming') {
        [['Besok', 1, 1], ['2–7 hari lagi', 2, 7], ['8–30 hari lagi', 8, 30]].forEach(function (r) { var x = L.filter(function (t) { var d = dd(today, t.due); return d >= r[1] && d <= r[2]; }); if (x.length) g.push([r[0], x]); });
      } else if (id === 'project') {
        var ids = {}; L.forEach(function (t) { ids[t.projId || ''] = 1; });
        Object.keys(ids).sort().forEach(function (k) { g.push([k ? (pn(k) || 'Proyek dihapus') : 'Tanpa proyek', L.filter(function (t) { return (t.projId || '') === k; })]); });
      } else if (id === 'area') {
        AREAS.concat(['']).forEach(function (a) { var x = L.filter(function (t) { return (t.area || '') === a; }); if (x.length) g.push([a || 'Tanpa area', x]); });
      } else g.push([null, L]);
      return g;
    }
    function kanban(L) {
      var cols = ST.slice(0, 5);
      return '<div class="kb kb5">' + cols.map(function (s, i) {
        var x = L.filter(function (t) { return t.status === s; });
        return '<div><h4>' + s + ' · ' + x.length + '</h4>' + x.map(function (t) {
          return '<div class="kc" style="border-left:3px solid ' + PCOL[t.priority] + '"><button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + esc(t.priority) + (t.due ? ' · ' : '') + (t.due ? dueTag(t) : '') + '</small><div class="ac-acts">' +
            (i > 0 ? '<button class="ac-btn sm" data-act="mvs" data-id="' + t.id + '" data-d="-1" aria-label="Mundur">←</button>' : '') + (i < 4 ? '<button class="ac-btn sm" data-act="mvs" data-id="' + t.id + '" data-d="1" aria-label="Maju">→</button>' : '') + '</div></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    function calView(L) {
      var key = st.tm || todayS().slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5), wk = (ls('mo-cal-v1').set || {}).wk; wk = wk == null ? 1 : +wk;
      var first = new Date(y, m - 1, 1), lead = (first.getDay() - wk + 7) % 7, n = new Date(y, m, 0).getDate(), today = todayS();
      var names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], h = '<div class="ac-bar"><div class="ac-acts"><button class="ac-btn sm" data-act="tnav" data-d="-1">←</button><b>' + first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</b><button class="ac-btn sm" data-act="tnav" data-d="1">→</button></div></div><div class="mg">';
      for (var i = 0; i < 7; i++) h += '<div class="mh">' + names[(wk + i) % 7] + '</div>';
      for (i = 0; i < lead; i++) h += '<div class="mc out"></div>';
      for (var d = 1; d <= n; d++) {
        var ds = key + '-' + pad(d), x = L.filter(function (t) { return t.due === ds; });
        h += '<div class="mc' + (ds === today ? ' td' : '') + '"><b>' + d + '</b>' + x.slice(0, 3).map(function (t) { return '<button class="ev tk" style="--c:' + PCOL[t.priority] + '" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>'; }).join('') + (x.length > 3 ? '<div class="more">+' + (x.length - 3) + ' lagi</div>' : '') + '</div>';
      }
      return h + '</div><p class="ac-hint" style="margin-top:8px">Tugas ditampilkan pada tanggal tenggatnya.</p>';
    }
    var AI = { Akademik: '🎓', Pekerjaan: '💼', Organisasi: '🏛️', Pribadi: '⭐' };
    function dash() {
      var T = todayS(), set = ls('mo-settings-v1'), nick = set.nick || '', act = D.task.filter(live), n = 0;
      var td = sorted(base('myday')).slice(0, 5);
      var pgm = st.pg || 'cat', kf = pgm === 'proj' ? function (t) { return t.projId ? pn(t.projId) || 'Proyek dihapus' : 'Tanpa proyek'; } : pgm === 'area' ? function (t) { return t.area || 'Tanpa area'; } : function (t) { return t.category || 'Tanpa kategori'; };
      var M = {}, ks = []; D.task.filter(function (t) { return t.status !== 'Archived'; }).forEach(function (t) { var k = kf(t); if (!M[k]) { M[k] = [0, 0]; ks.push(k); } M[k][1]++; if (t.status === 'Done') M[k][0]++; });
      ks.sort(function (a, b) { return M[b][1] - M[a][1]; });
      var key = st.tm || T.slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5), wk = (ls('mo-cal-v1').set || {}).wk; wk = wk == null ? 1 : +wk;
      var first = new Date(y, m - 1, 1), lead = (first.getDay() - wk + 7) % 7, nd = new Date(y, m, 0).getDate(), nm = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], i;
      var cal = '<div class="tk-cal">'; for (i = 0; i < 7; i++) cal += '<span class="tk-wd">' + nm[(wk + i) % 7] + '</span>'; for (i = 0; i < lead; i++) cal += '<span></span>';
      for (var d = 1; d <= nd; d++) { var ds = key + '-' + pad(d), c = act.filter(function (t) { return t.due === ds; }).length; cal += '<button class="tk-d' + (c ? ' on' : '') + (ds === T ? ' td' : '') + '" data-act="add" data-e="task" data-pre="' + esc(JSON.stringify({ due: ds })) + '" aria-label="Tambah tugas tanggal ' + d + (c ? ', ' + c + ' tugas' : '') + '">' + d + '</button>'; }
      cal += '</div>';
      var up = sorted(act.filter(function (t) { return t.due && t.due >= T && t.due <= addDays(T, 14); })).slice(0, 3);
      var cf = [[78, 12, '#8fc6d1'], [90, 28, '#f2c0af'], [68, 58, '#eeb7a6'], [92, 66, '#8fc6d1'], [80, 84, '#f2c0af'], [62, 20, '#eeb7a6']].map(function (x) { return '<i style="left:' + x[0] + '%;top:' + x[1] + '%;background:' + x[2] + '"></i>'; }).join('');
      var done = D.task.filter(function (t) { return t.status === 'Done'; }).length;
      return '<div class="tk-grid"><section class="tk-hero"><div class="tk-conf">' + cf + '</div><span class="tk-em">' + esc(DS.emoji || '🥳') + '</span><div><button class="tk-pen" data-act="edit" data-e="dash" data-id="dash" aria-label="Ubah sapaan">✎ Ubah</button><h3>' + esc(DS.title) + (nick ? ', <u>' + esc(nick) + '</u>' : '') + '!</h3><p>' + esc(DS.sub || '') + '</p><small>' + esc(DS.hint || '') + '</small><div><button class="tk-cta" data-act="add" data-e="task">' + esc(DS.btn || 'Tambah tugas') + ' +</button></div></div></section>' +
        '<section class="tk-card"><div class="tk-hd"><h4>Tugas hari ini</h4><button class="tk-va" data-act="tab" data-t="myday">Lihat semua</button></div>' + (td.length ? td.map(function (t) { return '<div class="tk-row"><input type="checkbox" data-act="tgd" data-id="' + t.id + '" aria-label="Selesai"><div><button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + (t.due ? fd(t.due) + (t.dueTime ? ' · ' + t.dueTime : '') : 'Tanpa tenggat') + ' · ' + esc(t.priority) + '</small></div></div>'; }).join('') : '<p class="tk-none">Belum ada tugas untuk hari ini. Tekan tombol di atas untuk menambah.</p>') + '</section>' +
        '<section class="tk-card"><div class="tk-hd"><h4>Progres tugas</h4><div class="tk-sw">' + [['cat', 'Kategori'], ['proj', 'Proyek'], ['area', 'Area']].map(function (o) { return '<button aria-pressed="' + (o[0] === pgm) + '" data-act="filt" data-f="pg" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        (ks.length ? ks.slice(0, 7).map(function (k, j) { var v = M[k]; return '<div class="tk-pr"><span>' + esc(k) + (pgm === 'cat' && D.cats.indexOf(k) > -1 ? ' <button class="tk-mini" data-act="rencat" data-n="' + esc(k) + '" aria-label="Ubah nama kategori ' + esc(k) + '">✎</button>' : '') + '</span><em>' + v[0] + '/' + v[1] + '</em><div class="tk-bar c' + (j % 4) + '"><i style="width:' + v[0] / v[1] * 100 + '%"></i></div></div>'; }).join('') : '<p class="tk-none">Belum ada tugas.</p>') + (pgm === 'cat' ? '<button class="tk-va" data-act="addcat">+ Kategori</button>' : '') + '</section>' +
        '<aside class="tk-side"><div class="tk-me"><span class="tk-av" style="' + (set.photo ? 'background-image:url(&quot;' + esc(set.photo) + '&quot;)' : '') + '"></span><div><b>' + esc(nick || 'Pengguna') + '</b><small>' + act.length + ' aktif · ' + done + ' selesai</small></div></div>' +
        '<div class="tk-card"><div class="tk-nav"><button data-act="tnav" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>' + first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + '</b><button data-act="tnav" data-d="1" aria-label="Bulan berikutnya">›</button></div>' + cal + '<small class="tk-none">Tekan tanggal untuk menambah tugas.</small></div>' +
        '<div class="tk-hd"><h4>Akan datang</h4><button class="tk-va" data-act="tab" data-t="upcoming">Lihat semua</button></div><small class="tk-none">' + fd(T) + '</small>' + (up.length ? up.map(function (t) { return '<button class="tk-ev" style="--c:' + PCOL[t.priority] + '" data-act="edit" data-e="task" data-id="' + t.id + '"><span><b>' + esc(t.title) + '</b><small>' + fd(t.due) + (t.dueTime ? ' · ' + t.dueTime : '') + '</small></span><i>' + (AI[t.area] || '⭐') + '</i></button>'; }).join('') : '<p class="tk-none">Tidak ada tugas 14 hari ke depan.</p>') + '</aside></div>';
    }
    function view(id) {
      var L = sorted(base(id).filter(match)), md = st.md || 'Daftar', h = toolbar(L.length);
      if (id === 'done') L.sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
      if (md === 'Kalender') return h + calView(L);
      if (!L.length) return h + empty(id === 'overdue' ? 'Tidak ada tugas terlambat.' : 'Tidak ada tugas pada tampilan ini.');
      if (md === 'Kanban') return h + kanban(L);
      return h + groups(id, L).map(function (g) { return (g[0] ? '<div class="ac-h">' + esc(g[0]) + ' · ' + g[1].length + '</div>' : '') + g[1].map(card).join(''); }).join('');
    }
    return {
      skin: 'tk-skin', specs: specs, tabs: [['dash', 'Dashboard', dash]].concat(TABS.map(function (t) { return [t[0], t[1], function () { return view(t[0]); }]; })),
      sub: function () { var n = D.task.filter(function (t) { return live(t) && t.due && t.due < todayS(); }).length; return D.task.filter(live).length + ' tugas aktif' + (n ? ' · ' + n + ' terlambat' : ''); },
      cascade: { task: [['sub', 'taskId']] },
      saved: function (e, r, isNew) {
        if (e === 'task') { if (r.status === 'Done' && !r.doneAt) r.doneAt = todayS(); if (r.status !== 'Done') r.doneAt = ''; }
      },
      act: function (a, d, t) {
        var x;
        if (a === 'tgd') { x = by(D.task, d.id); x.status = t.checked ? 'Done' : 'To Do'; x.doneAt = t.checked ? todayS() : ''; }
        if (a === 'tgs') by(D.sub, d.id).done = t.checked;
        if (a === 'arch') { x = by(D.task, d.id); x.status = x.status === 'Archived' ? 'To Do' : 'Archived'; }
        if (a === 'mvp') { if (d.v) by(D.task, d.id).projId = d.v === '__none' ? '' : d.v; }
        if (a === 'mvs') { x = by(D.task, d.id); var i = Math.max(0, Math.min(4, ST.indexOf(x.status) + +d.d)); x.status = ST[i]; x.doneAt = ST[i] === 'Done' ? todayS() : ''; }
        if (a === 'tnav') { var k = (st.tm || todayS().slice(0, 7)).split('-'), dt = new Date(+k[0], +k[1] - 1 + +d.d, 1); st.tm = dt.getFullYear() + '-' + pad(dt.getMonth() + 1); }
        if (a === 'rencat') { var nn = (prompt('Ubah nama kategori:', d.n) || '').trim(); if (nn && nn !== d.n && D.cats.indexOf(nn) < 0) { D.cats = D.cats.map(function (c) { return c === d.n ? nn : c; }); D.task.forEach(function (t) { if (t.category === d.n) t.category = nn; }); } }
        if (a === 'addcat') { var n = (prompt('Nama kategori baru:') || '').trim(); if (n && D.cats.indexOf(n) < 0) D.cats.push(n); }
      }
    };
  });
  function has(v) { return v !== '' && v != null && !isNaN(+v); }
  MO.routes['#task'] = tasks.open;
})();
