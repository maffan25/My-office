/* MyOffice — Goal (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, empty = K.empty, bar = K.bar, add = K.add, btns = K.btns, opt = K.opt, badge = K.badge, chips = K.chips, prog = K.prog, has = K.has;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var HZ = ['Harian', 'Mingguan', 'Bulanan', 'Semesteran', 'Tahunan', 'Jangka panjang'];
  var LC = ['Akademik', 'Karier / Pekerjaan', 'Keuangan', 'Spiritual', 'Kesehatan', 'Relasi & sosial', 'Pengembangan diri', 'Bisnis', 'Lainnya'];
  var GS = ['Belum mulai', 'Berjalan', 'Ditunda', 'Tercapai', 'Dibatalkan'], TS = ['Belum', 'Dikerjakan', 'Selesai'];

  /* Dipakai Task & Kalender untuk menautkan item ke goal/milestone */
  MO.goalOpts = function () {
    var g = ls('mo-goal-v1'), o = [['', '—']];
    (g.goal || []).forEach(function (x) { o.push([x.id, '🎯 ' + x.name]); (g.ms || []).filter(function (m) { return m.goalId === x.id; }).forEach(function (m) { o.push([m.id, '   ↳ ' + m.name]); }); });
    return o;
  };

  var goals = K.App('Goal', 'mo-goal-v1', function () { return { goal: [], ms: [], gtask: [], rev: [] }; }, function (app) {
    var D = app.D, st = app.st, today = K.todayS;
    if (!D.pf || !D.pf.length) D.pf = [{ id: 'pf', level: 3, min: 15, xp: 40, claims: [] }];
    var PF = D.pf[0]; if (!PF.claims) PF.claims = [];
    var LV = [0, ['🌱', 'Santai', 'Pelan tapi pasti', 5, 10], ['⭐', 'Stabil', 'Konsisten tiap hari', 10, 25], ['🚀', 'Intens', 'Progres nyata', 15, 40], ['🔥', 'Maksimal', 'Tantang batasmu', 30, 80]];
    var LB = ['Baru mulai', 'Mulai terasa', 'Separuh jalan', 'Hampir sampai', 'Tercapai!'];
    var CAT = { 'Akademik': ['📚', '#86c0cc', '#a5d3dd'], 'Karier / Pekerjaan': ['💼', '#8fc6d2', '#add7e0'], 'Keuangan': ['💰', '#d18f7d', '#eeb7a6'], 'Spiritual': ['🕌', '#528894', '#83bdca'], 'Kesehatan': ['💪', '#ebb09e', '#f6cfc0'], 'Relasi & sosial': ['🤝', '#e8ab99', '#f4c8b8'], 'Pengembangan diri': ['🚀', '#79b5c2', '#a3d2dc'], 'Bisnis': ['📈', '#588f9b', '#92c8d4'], 'Lainnya': ['🎯', '#73aeba', '#a2d2dc'] };
    var cat = function (g) { return CAT[g.cat] || CAT['Lainnya']; };
    var CH = '<svg class="gq-chest" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1H3z" fill="#c58372"/><rect x="3" y="11" width="18" height="9" rx="2" fill="#a16556"/><rect x="10" y="10" width="4" height="6" rx="1" fill="#ebb19f"/></svg>';
    var dstr = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    /* XP nyata: tugas 10, milestone 30, evaluasi 5, hadiah misi 20. Streak = hari beruntun yang punya aktivitas bertanggal. */
    function xpInfo() {
      var e = [], tot = 0, td = 0, days = {}, t = today();
      D.ms.forEach(function (m) { if (m.done) e.push([m.doneAt || '', 30]); });
      D.gtask.forEach(function (x) { if (x.status === 'Selesai') e.push([x.doneAt || '', 10]); });
      D.rev.forEach(function (r) { e.push([r.date || '', 5]); });
      PF.claims.forEach(function (c) { e.push([c, 20]); });
      e.forEach(function (x) { tot += x[1]; if (x[0]) days[x[0]] = 1; if (x[0] === t) td += x[1]; });
      var sk = 0, d = new Date(); if (!days[t]) d.setDate(d.getDate() - 1);
      while (days[dstr(d)]) { sk++; d.setDate(d.getDate() - 1); }
      return { tot: tot, td: td, streak: sk, lv: Math.floor(tot / 100) + 1, into: tot % 100 };
    }
    var msOf = function (gid) { return D.ms.filter(function (m) { return m.goalId === gid; }); };
    var extT = function () { return (ls('mo-task-v1').task || []).filter(function (t) { return t.goalRef; }); };
    var extE = function () { return (ls('mo-cal-v1').ev || []).filter(function (e) { return e.goalRef; }); };
    /* Tugas pendukung = tugas milik goal + tugas dari modul Task yang ditautkan */
    function tasksOf(gid, mid) {
      var ids = [gid].concat(msOf(gid).map(function (m) { return m.id; }));
      var own = D.gtask.filter(function (t) { return mid ? t.msId === mid : t.goalId === gid; }).map(function (t) { return { id: t.id, title: t.title, done: t.status === 'Selesai', due: t.due, own: 1, st: t.status }; });
      var ext = extT().filter(function (t) { return mid ? t.goalRef === mid : ids.indexOf(t.goalRef) > -1; }).map(function (t) { return { id: t.id, title: t.title, done: t.status === 'Done', due: t.due, own: 0, st: t.status }; });
      return own.concat(ext);
    }
    function pg(g) {
      var b = g.basis || 'ms';
      if (b === 'num') return has(g.tgtNum) && +g.tgtNum > 0 ? { pct: Math.min(100, (+g.curNum || 0) / +g.tgtNum * 100), txt: (+g.curNum || 0) + ' / ' + g.tgtNum + ' ' + (g.unit || '') } : { pct: null, txt: 'Isi angka target di Edit goal' };
      if (b === 'tasks') { var t = tasksOf(g.id), d = t.filter(function (x) { return x.done; }).length; return t.length ? { pct: d / t.length * 100, txt: d + ' dari ' + t.length + ' tugas selesai' } : { pct: null, txt: 'Belum ada tugas pendukung' }; }
      var m = msOf(g.id), dn = m.filter(function (x) { return x.done; }).length; return m.length ? { pct: dn / m.length * 100, txt: dn + ' dari ' + m.length + ' milestone tercapai' } : { pct: null, txt: 'Belum ada milestone' };
    }
    var late = function (g) { return g.deadline && g.deadline < today() && g.status !== 'Tercapai' && g.status !== 'Dibatalkan'; };
    var goalOpt = function () { return [['', '— Pilih goal —']].concat(D.goal.map(function (g) { return [g.id, g.name]; })); };
    var specs = {
      goal: { title: 'Goal', def: { horizon: 'Bulanan', cat: 'Pengembangan diri', status: 'Belum mulai', basis: 'ms' }, fields: [
        { k: 'name', l: 'Nama goal', t: 'text', req: 1, full: 1 }, { k: 'why', l: 'Alasan / tujuan', t: 'textarea', full: 1 },
        { k: 'horizon', l: 'Horizon', t: 'select', o: opt(HZ) }, { k: 'cat', l: 'Kategori kehidupan', t: 'select', o: opt(LC) },
        { k: 'target', l: 'Target yang ingin dicapai', t: 'textarea', full: 1 }, { k: 'deadline', l: 'Deadline', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: opt(GS) },
        { k: 'basis', l: 'Progres dihitung dari', t: 'select', full: 1, o: [['ms', 'Milestone yang tercapai'], ['tasks', 'Tugas pendukung yang selesai'], ['num', 'Angka target (mis. dana terkumpul)']] },
        { k: 'tgtNum', l: 'Angka target (jika dasar = angka)', t: 'number', min: 0 }, { k: 'curNum', l: 'Angka saat ini', t: 'number' }, { k: 'unit', l: 'Satuan', t: 'text', ph: 'Rp / halaman / jam' }] },
      ms: { title: 'Milestone', def: { done: false }, fields: [
        { k: 'name', l: 'Milestone', t: 'text', req: 1, full: 1 }, { k: 'goalId', l: 'Goal', t: 'select', o: goalOpt, req: 1 }, { k: 'due', l: 'Tenggat', t: 'date' },
        { k: 'done', l: 'Status', t: 'select', bool: 1, o: [['false', 'Belum tercapai'], ['true', 'Tercapai']] }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      gtask: { title: 'Tugas Pendukung', def: { status: 'Belum' }, fields: [
        { k: 'title', l: 'Tugas', t: 'text', req: 1, full: 1 }, { k: 'goalId', l: 'Goal', t: 'select', o: goalOpt, req: 1 },
        { k: 'msId', l: 'Milestone (opsional)', t: 'select', o: function () { return [['', '— Tanpa milestone —']].concat(D.ms.map(function (m) { return [m.id, (by(D.goal, m.goalId) || {}).name + ' ↳ ' + m.name]; })); } },
        { k: 'due', l: 'Tenggat', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: opt(TS) }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      pf: { title: 'Target Harian', def: {}, fields: [{ k: 'level', l: 'Intensitas', t: 'select', full: 1, o: [['1', '🌱 Santai'], ['2', '⭐ Stabil'], ['3', '🚀 Intens'], ['4', '🔥 Maksimal']] }, { k: 'min', l: 'Menit belajar per hari', t: 'number', min: 1 }, { k: 'xp', l: 'Target XP per hari', t: 'number', min: 1 }] },
      rev: { title: 'Evaluasi', def: { mood: 'Sesuai rencana' }, fields: [
        { k: 'goalId', l: 'Goal', t: 'select', o: goalOpt, req: 1 }, { k: 'date', l: 'Tanggal', t: 'date', req: 1 }, { k: 'mood', l: 'Kondisi', t: 'select', o: opt(['Sesuai rencana', 'Perlu perhatian', 'Tertinggal']) },
        { k: 'note', l: 'Catatan evaluasi', t: 'textarea', req: 1, full: 1 }] }
    };
    var meta = function (g) { return badge(g.horizon) + badge(g.cat) + badge(g.status, g.status === 'Tercapai' ? 'on' : '') + (late(g) ? badge('Lewat deadline', 'late') : ''); };

    function hero() {
      var X = xpInfo(), L = LV[PF.level] || LV[3], p = Math.min(100, X.td / (+PF.xp || 1) * 100);
      return '<section class="gq-hero"><div class="gq-top"><span class="gq-lbl"><i>◎</i>Target harian</span><span class="gq-streak">🔥 ' + (X.streak ? X.streak + ' hari beruntun' : 'Mulai streak hari ini') + '</span></div>' +
        '<div class="gq-lv"><span class="gq-em">' + L[0] + '</span><div><b>' + L[1] + '!</b><small>' + L[2] + '</small></div></div>' +
        '<div class="gq-bar g"><i style="width:' + p + '%"></i></div><p class="gq-cap">' + (p >= 100 ? 'Target hari ini tercapai 🎉' : X.td + ' / ' + PF.xp + ' XP hari ini') + '</p>' +
        '<div class="gq-pop"><div><span class="gq-dot v">🕒</span><b>' + PF.min + '</b> Menit / hari</div><div><span class="gq-dot o">⭐</span><b>' + PF.xp + '</b> XP / hari</div></div>' +
        '<div class="gq-set"><button class="gq-rb" data-act="pfstep" data-dir="-1" aria-label="Turunkan intensitas"' + (PF.level <= 1 ? ' disabled' : '') + '>−</button><button class="gq-main" data-act="edit" data-e="pf" data-id="pf"><i>' + PF.level + '</i>Atur target</button><button class="gq-rb" data-act="pfstep" data-dir="1" aria-label="Naikkan intensitas"' + (PF.level >= 4 ? ' disabled' : '') + '>+</button></div></section>';
    }
    function lvlCard() {
      var X = xpInfo();
      return '<section class="gq-lvl"><div class="gq-sh"><b>Lv ' + X.lv + '</b></div><div><b>' + X.tot + ' XP</b><div class="gq-bar b"><i style="width:' + X.into + '%"></i></div><small>' + X.into + ' / 100 XP menuju level berikutnya</small></div></section>';
    }
    function quest() {
      var X = xpInfo(), t = today(), c1 = D.ms.filter(function (m) { return m.done && m.doneAt === t; }).length + D.gtask.filter(function (x) { return x.status === 'Selesai' && x.doneAt === t; }).length, c3 = D.rev.filter(function (r) { return r.date === t; }).length;
      var Q = [['⚡', 'Selesaikan 1 tugas atau milestone', Math.min(c1, 1), 1], ['🎯', 'Raih ' + PF.xp + ' XP hari ini', Math.min(X.td, +PF.xp), +PF.xp], ['📝', 'Tulis 1 evaluasi', Math.min(c3, 1), 1]];
      var all = Q.every(function (q) { return q[2] >= q[3]; }), got = PF.claims.indexOf(t) > -1;
      return '<section class="gq-panel"><h3 class="gq-h">Misi harian' + (all ? ' selesai!' : '') + '</h3>' + Q.map(function (q) {
        return '<div class="gq-q"><span class="gq-qi">' + q[0] + '</span><div><b>' + q[1] + '</b><div class="gq-qb"><div class="gq-bar y"><i style="width:' + q[2] / q[3] * 100 + '%"></i></div>' + CH + '<em>' + q[2] + ' / ' + q[3] + '</em></div></div></div>';
      }).join('') + '<button class="ac-btn pri gq-claim" data-act="claim"' + (all && !got ? '' : ' disabled') + '>' + (got ? 'Hadiah diklaim ✓' : 'Klaim hadiah +20 XP') + '</button></section>';
    }
    function tile(g) {
      var p = pg(g), c = cat(g);
      return '<article class="gq-goal" style="--c1:' + c[1] + ';--c2:' + c[2] + '" data-act="opg" data-id="' + g.id + '"><span class="gq-gi">' + c[0] + '</span><div class="gq-gm"><h3><button class="t" data-act="opg" data-id="' + g.id + '">' + esc(g.name) + '</button></h3><div class="gq-gb">' + meta(g) + '</div>' +
        '<div class="gq-bar g"><i style="width:' + (p.pct || 0) + '%"></i></div><small>' + p.txt + (p.pct != null ? ' (' + Math.round(p.pct) + '%)' : '') + (g.deadline ? ' · deadline ' + fd(g.deadline) : '') + '</small>' + (g.why ? '<div class="ac-notes" style="margin:6px 0 0">' + esc(g.why) + '</div>' : '') + '</div>' +
        '<div class="gq-ga"><button class="ac-btn sm" data-act="edit" data-e="goal" data-id="' + g.id + '">Edit</button><span class="gq-go">Masuk ›</span></div></article>';
    }
    function cele() {
      var c = st.cele, g = c && by(D.goal, c.g); if (!g) return '';
      var p = pg(g), pc = Math.round(p.pct || 0), m = c.id && by(D.ms, c.id), ml = msOf(g.id), tk = tasksOf(g.id), win = c.k === 'goal' || !m, cf = '';
      var dn = function (a) { return a.filter(function (x) { return x.done; }).length; };
      for (var i = 0; i < 16; i++) cf += '<i style="left:' + (i * 6.2 + 2) + '%;animation-delay:' + (i % 5) * 0.35 + 's"></i>';
      var T = [['🎯', 'Milestone', dn(ml) + ' / ' + ml.length], ['✅', 'Tugas selesai', dn(tk) + ' / ' + tk.length], ['🗓', 'Deadline', fd(g.deadline)]];
      return '<div class="gq-cele ' + (win ? 'win' : 'ms') + '" role="dialog" aria-modal="true" aria-label="Pencapaian"><div class="gq-cc">' + (win ? '<div class="gq-conf">' + cf + '</div><div class="gq-trophy">🏆</div><h3>Goal tercapai!</h3><p>' + esc(g.name) + ' — setiap langkah kecilmu sudah sampai.</p>' : '<div class="gq-shield"><b>LEVEL UP</b></div><h3>Milestone tercapai: ' + esc(m.name) + '</h3><p>+30 XP. Kamu makin dekat ke ' + esc(g.name) + '.</p>') +
        '<div class="gq-bar ' + (win ? 'g' : 'p') + '"><i style="width:' + pc + '%"></i></div><small>' + pc + '% · ' + p.txt + '</small><div class="gq-dets">' + T.map(function (x) { return '<div><span>' + x[0] + '</span><small>' + x[1] + '</small><b>' + x[2] + '</b></div>'; }).join('') + '</div>' +
        '<div class="gq-cb">' + (win && g.status !== 'Tercapai' ? '<button class="ac-btn pri" data-act="cele-ok" data-id="' + g.id + '">Tandai goal tercapai</button>' : '') + '<button class="ac-btn" data-act="cele-x">Lanjut</button></div></div></div>';
    }
    function list() {
      var hz = st.hz || 'Semua', L = D.goal.filter(function (g) { return hz === 'Semua' || g.horizon === hz; });
      var h = bar('Target pada berbagai horizon. Progres dihitung dari milestone, tugas, atau angka sesuai dasar yang Anda pilih — bukan angka acak.', add('goal', 'Goal')) + chips(['Semua'].concat(HZ), hz, 'hz');
      if (!L.length) h += empty('Belum ada goal. Mulai dengan satu target, lalu pecah menjadi milestone.');
      HZ.forEach(function (z) {
        var x = L.filter(function (g) { return g.horizon === z; }); if (!x.length) return;
        h += '<div class="ac-h">' + z + ' · ' + x.length + '</div>' + x.map(tile).join('');
      });
      return '<div class="gq-grid"><aside>' + hero() + lvlCard() + quest() + '</aside><div>' + h + '</div></div>' + cele();
    }
    function taskLine(t) {
      return '<div class="ac-item' + (t.done ? ' done' : '') + '" style="margin:4px 0;padding:8px 10px"><input type="checkbox" ' + (t.own ? 'data-act="tgt" data-id="' + t.id + '"' : 'disabled title="Ubah statusnya di modul Task"') + (t.done ? ' checked' : '') + ' aria-label="Selesai"><div><button class="t" ' + (t.own ? 'data-act="edit" data-e="gtask" data-id="' + t.id + '"' : 'data-act="gotask"') + '>' + esc(t.title) + '</button>' + (t.own ? '' : badge('dari Task')) + '<small>' + (t.due ? 'Tenggat ' + fd(t.due) + ' · ' : '') + esc(t.st) + '</small></div>' + (t.own ? '<button class="ac-btn sm danger" data-act="del" data-e="gtask" data-id="' + t.id + '" aria-label="Hapus">×</button>' : '') + '</div>';
    }
    var evLine = function (e) { return '<div class="ac-item" style="margin:4px 0;padding:8px 10px"><div><b>🗓 ' + esc(e.title) + '</b><small>' + fd(e.start) + (e.startTime ? ' · ' + e.startTime + (e.endTime ? '–' + e.endTime : '') : ' · seharian') + '</small></div><button class="ac-btn sm" data-act="gocal">Kalender</button></div>'; };
    function detail(g) {
      var p = pg(g), ms = msOf(g.id).sort(function (a, b) { return (a.due || '9').localeCompare(b.due || '9'); }), E = extE();
      var c = cat(g), pc = p.pct == null ? 0 : p.pct, lvl = pc >= 100 ? 5 : 1 + Math.floor(pc / 25), nx = ms.filter(function (m) { return !m.done; })[0], tk0 = tasksOf(g.id);
      var h = '<button class="ac-btn sm ac-back" data-act="opg" data-id="">← Semua goal</button><section class="gq-wh"><span class="gq-fl a">' + c[0] + '</span><span class="gq-fl b">✨</span><span class="gq-fl c">⭐</span>' +
        '<div class="gq-wtop"><span class="gq-wem">' + c[0] + '</span><div><h3>' + esc(g.name) + '</h3><div class="gq-gb">' + meta(g) + '</div></div>' + btns('goal', g.id) + '</div>' +
        '<div class="gq-bar w"><i style="width:' + pc + '%"></i></div><div class="gq-wl"><b>Level ' + lvl + ' · ' + LB[lvl - 1] + '</b><span>' + Math.round(pc) + '%</span></div><p class="gq-wn">' + p.txt + (nx ? ' · Selanjutnya: ' + esc(nx.name) : '') + '</p>' +
        '<div class="gq-wst"><div><small>Milestone</small><b>' + ms.filter(function (m) { return m.done; }).length + ' / ' + ms.length + '</b></div><div><small>Tugas selesai</small><b>' + tk0.filter(function (x) { return x.done; }).length + ' / ' + tk0.length + '</b></div><div><small>Deadline</small><b>' + fd(g.deadline) + '</b></div></div></section>' +
        (g.basis === 'num' ? '<div class="ac-meta"><span>Angka: <b>' + (+g.curNum || 0) + ' / ' + (g.tgtNum || '—') + ' ' + esc(g.unit || '') + '</b></span></div>' : '') +
        (g.why ? '<div class="ac-notes"><b>Alasan / tujuan</b>\n' + esc(g.why) + '</div>' : '') + (g.target ? '<div class="ac-notes"><b>Target</b>\n' + esc(g.target) + '</div>' : '');
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Goal breakdown · Milestone</div>' + add('ms', 'Milestone', 'goalId', g.id) + '</div>';
      h += ms.length ? ms.map(function (m) {
        var T = tasksOf(g.id, m.id), ev = E.filter(function (e) { return e.goalRef === m.id; }), pre = esc(JSON.stringify({ goalId: g.id, msId: m.id })), lt = m.due && m.due < today() && !m.done;
        var dn = T.filter(function (x) { return x.done; }).length, tot = T.length || 1, cur = T.length ? dn : (m.done ? 1 : 0), w = m.done ? 100 : cur / tot * 100;
        return '<div class="gq-ms' + (m.done ? ' done' : '') + '"><div class="gq-mh"><span class="gq-mi">' + (m.done ? '🏆' : '🎯') + '</span><div class="ac-item' + (m.done ? ' done' : '') + '"><input type="checkbox" data-act="tgm" data-id="' + m.id + '"' + (m.done ? ' checked' : '') + ' aria-label="Tercapai"><div><button class="t" data-act="edit" data-e="ms" data-id="' + m.id + '">' + esc(m.name) + '</button>' + (lt ? badge('Lewat tenggat', 'late') : '') + '<small>' + (m.due ? 'Tenggat ' + fd(m.due) + ' · ' : '') + dn + '/' + T.length + ' tugas · ' + ev.length + ' jadwal belajar · +30 XP</small>' + (m.notes ? '<small>' + esc(m.notes) + '</small>' : '') + '</div></div>' + btns('ms', m.id) + '</div>' +
          '<div class="gq-qb"><div class="gq-bar y"><i style="width:' + w + '%"></i></div>' + CH + '<em>' + cur + ' / ' + tot + '</em></div>' +
          '<div class="tree">' + T.map(taskLine).join('') + ev.map(evLine).join('') + '<button class="ac-btn sm" data-act="add" data-e="gtask" data-pre="' + pre + '">+ Tugas</button> <button class="ac-btn sm" data-act="gocal">+ Jadwal belajar (Kalender)</button></div></div>';
      }).join('') : empty('Belum ada milestone. Pecah goal ini di bawah, atau tambahkan satu per satu.');
      var loose = tasksOf(g.id).filter(function (t) { return t.own ? !by(D.gtask, t.id).msId : !ms.some(function (m) { return extT().some(function (x) { return x.id === t.id && x.goalRef === m.id; }); }); });
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Tugas pendukung (tanpa milestone)</div>' + add('gtask', 'Tugas', 'goalId', g.id) + '</div>' + (loose.length ? loose.map(taskLine).join('') : '<p class="ac-hint">Tidak ada.</p>');
      var ge = E.filter(function (e) { return e.goalRef === g.id; });
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Jadwal belajar untuk goal ini</div><button class="ac-btn sm" data-act="gocal">Buka Kalender</button></div>' + (ge.length ? ge.map(evLine).join('') : '<p class="ac-hint">Buat acara di Kalender dan pilih goal/milestone pada kolom "Terkait goal / milestone". Tugas dari modul Task ditautkan dengan cara yang sama.</p>');
      h += '<div class="ac-card" style="margin-top:14px"><b>Pecah target menjadi milestone</b><p class="ac-hint" style="margin:4px 0 8px">Satu baris = satu milestone. Tenggat opsional dengan format <i>nama | 2026-12-31</i>.</p><textarea rows="4" placeholder="Menguasai kosakata dasar\nMenyelesaikan materi nahwu dasar\nMenyelesaikan materi sharaf dasar\nMembaca teks sederhana\nMeningkatkan pemahaman teks tanpa harakat" style="width:100%"></textarea><div style="margin-top:8px"><button class="ac-btn pri" data-act="bulk" data-id="' + g.id + '">Buat milestone</button></div></div>';
      var rv = D.rev.filter(function (r) { return r.goalId === g.id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
      h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Catatan evaluasi</div>' + add('rev', 'Evaluasi', 'goalId', g.id) + '</div>' + (rv.length ? rv.map(function (r) { return '<div class="ac-item"><div><b>' + fd(r.date) + '</b> ' + badge(r.mood, r.mood === 'Sesuai rencana' ? 'on' : r.mood === 'Tertinggal' ? 'late' : 'mid') + '<div class="ac-notes" style="margin:4px 0 0">' + esc(r.note) + '</div></div>' + btns('rev', r.id) + '</div>'; }).join('') : '<p class="ac-hint">Belum ada evaluasi. Catat secara berkala apa yang berjalan dan apa yang perlu diubah.</p>');
      return h;
    }
    return {
      skin: 'gq-skin', specs: specs, tabs: [['g', 'Goals', function () {
        var g = st.g && by(D.goal, st.g); if (!g) return list();
        var c = cat(g), fr = st.fresh; st.fresh = false;
        return '<div class="gq-world' + (fr ? ' fresh' : '') + '" style="--c1:' + c[1] + ';--c2:' + c[2] + '">' + detail(g) + '</div>' + cele();
      }]],
      sub: function () { var a = D.goal.filter(function (g) { return g.status === 'Berjalan'; }).length; return D.goal.length + ' goal · ' + a + ' berjalan'; },
      cascade: { goal: [['ms', 'goalId'], ['gtask', 'goalId'], ['rev', 'goalId']], ms: [['gtask', 'msId']] },
      guard: function (e) { if (e !== 'goal' && !D.goal.length) return ['Belum ada goal', 'Buat goal terlebih dahulu.']; },
      validate: function (e, r) {
        if (e === 'pf') { r.level = Math.max(1, Math.min(4, +r.level || 3)); if (!(+r.min > 0 && +r.xp > 0)) return 'Menit dan XP per hari harus lebih dari 0.'; }
        if (e === 'goal' && r.basis === 'num' && !(+r.tgtNum > 0)) return 'Dasar progres "angka" membutuhkan angka target lebih dari 0.';
        if (e === 'gtask' && r.msId) { var m = by(D.ms, r.msId); if (m) r.goalId = m.goalId; }
      },
      act: function (a, d, t) {
        if (a === 'opg') { st.g = d.id || null; st.fresh = !!d.id; }
        if (a === 'pfstep') { var lv = Math.max(1, Math.min(4, (+PF.level || 3) + (+d.dir))); PF.level = lv; PF.min = LV[lv][3]; PF.xp = LV[lv][4]; }
        if (a === 'claim' && PF.claims.indexOf(today()) < 0) PF.claims.push(today());
        if (a === 'cele-x') st.cele = null;
        if (a === 'cele-ok') { var cg = by(D.goal, d.id); if (cg) cg.status = 'Tercapai'; st.cele = null; }
        if (a === 'tgm') {
          var m0 = by(D.ms, d.id), g1 = by(D.goal, m0.goalId), b0 = g1 ? pg(g1).pct : 0;
          m0.done = t.checked; m0.doneAt = t.checked ? today() : '';
          if (t.checked && g1) { var a0 = pg(g1).pct; st.cele = { k: a0 >= 100 && !(b0 >= 100) ? 'goal' : 'ms', id: m0.id, g: g1.id }; }
        }
        if (a === 'tgt') {
          var k0 = by(D.gtask, d.id), g0 = by(D.goal, k0.goalId), b1 = g0 ? pg(g0).pct : 0;
          k0.status = t.checked ? 'Selesai' : 'Belum'; k0.doneAt = t.checked ? today() : '';
          if (t.checked && g0 && pg(g0).pct >= 100 && !(b1 >= 100)) st.cele = { k: 'goal', g: g0.id };
        }
        if (a === 'gotask' && MO.routes['#task']) MO.routes['#task']();
        if (a === 'gocal' && MO.routes['#calendar']) MO.routes['#calendar']();
        if (a === 'bulk') {
          var ta = t.closest('.ac-card').querySelector('textarea'), n = 0;
          ta.value.split('\n').forEach(function (ln) {
            var p = ln.split('|'), nm = p[0].trim(), due = (p[1] || '').trim(); if (!nm) return;
            D.ms.push({ id: K.uid(), goalId: d.id, name: nm, due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '', done: false, notes: '' }); n++;
          });
          if (n) MO.msg('Milestone dibuat', n + ' milestone ditambahkan');
        }
      }
    };
  });
  MO.routes['#goal'] = goals.open;
})();
