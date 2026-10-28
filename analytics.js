/* MyOffice — Analytics. Membaca data semua modul (hanya baca) dan menyusun grafik + analisis berbasis aturan. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, rp = K.rp, stat = K.stat, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var sum = function (a, f) { return a.reduce(function (s, x) { return s + (+f(x) || 0); }, 0); };
  var n1 = function (n) { return String(Math.round(n * 10) / 10); };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var addM = function (ym, n) { var d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };
  var mlab = function (ym) { return new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'short' }); };
  var addD = function (s, n) { return new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); };
  var cut = function (v, n) { return String(v || '').slice(0, n); };
  var short = function (v) { var a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1e6 ? n1(a / 1e6) + 'jt' : a >= 1e3 ? Math.round(a / 1e3) + 'rb' : Math.round(a)); };

  /* kolom grafik: labels, a (utama), b (opsional); fmt untuk label nilai */
  function vb(labels, a, b, f) {
    var mx = Math.max.apply(null, a.concat(b || [], [0.0001]));
    return '<div class="vb">' + labels.map(function (l, i) { return '<div><span>' + (f ? f(a[i]) : n1(a[i])) + '</span><div class="bs"><i style="height:' + a[i] / mx * 100 + '%"></i>' + (b ? '<i class="alt" style="height:' + b[i] / mx * 100 + '%"></i>' : '') + '</div><span>' + esc(l) + '</span></div>'; }).join('') + '</div>';
  }
  function hb(rows, f) {
    if (!rows.length) return '<p class="ac-hint">Belum ada data.</p>';
    var mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([0.0001]));
    return '<div class="ac-bars">' + rows.map(function (r) { return '<div class="ac-bar2"><span>' + esc(r[0]) + '</span><div class="ac-track"><i style="width:' + r[1] / mx * 100 + '%"></i></div><span>' + (f ? f(r[1]) : n1(r[1])) + '</span></div>'; }).join('') + '</div>';
  }
  var H = function (t) { return '<div class="ac-h">' + t + '</div>'; };

  var an = K.App('Analytics', 'mo-an-v1', function () { return { cfg: { maxWeekHours: 45, ipTarget: 3, overdueMax: 3, spendRise: 20, budgetWarn: 80 } }; }, function (app) {
    var D = app.D; D.cfg = Object.assign({ maxWeekHours: 45, ipTarget: 3, overdueMax: 3, spendRise: 20, budgetWarn: 80 }, D.cfg);
    var today = K.todayS;

    /* ---------- Akademik: memakai konfigurasi formula yang Anda simpan ---------- */
    function acad() {
      var A = ls('mo-acad-v1'), cfg = A.cfg || {}, ok = !!cfg.confirmed, C = A.course || [], T = A.task || [], X = A.exam || [], has = function (v) { return v !== '' && v != null && !isNaN(+v); };
      var catOf = function (t) { return (cfg.cats || []).some(function (c) { return c.n === t; }) ? t : 'Tugas'; };
      function fs(c) {
        if (has(c.manual)) return +c.manual; if (!ok) return null;
        var it = [], num = 0, den = 0, all = 0;
        T.forEach(function (t) { if (t.courseId === c.id && has(t.score)) it.push({ c: catOf(t.type), s: +t.score, w: +t.weight > 0 ? +t.weight : 1 }); });
        X.forEach(function (e) { if (e.courseId === c.id && has(e.score)) it.push({ c: e.type, s: +e.score, w: +e.weight > 0 ? +e.weight : 1 }); });
        (cfg.cats || []).forEach(function (k) {
          var w = +k.w || 0; all += w; var xs = it.filter(function (i) { return i.c === k.n; }); if (!xs.length || !w) return;
          var sw = 0, ss = 0; xs.forEach(function (i) { sw += i.w; ss += i.s * i.w; }); num += w * ss / sw; den += w;
        });
        return den ? (cfg.normalize ? num / den : num / (all || 100)) : null;
      }
      var lt = function (s) { if (s == null || !ok) return null; return (cfg.scale || []).slice().sort(function (a, b) { return b.min - a.min; }).filter(function (r) { return s >= r.min; })[0] || null; };
      var ip = function (cs) { var a = 0, b = 0; cs.forEach(function (c) { var L = lt(fs(c)), k = +c.sks || 0; if (L && k) { a += L.p * k; b += k; } }); return b ? a / b : null; };
      return { A: A, ok: ok, C: C, T: T, X: X, fs: fs, lt: lt, ip: ip, ipk: ip(C) };
    }
    /* ---------- Keuangan ---------- */
    function fin() {
      var F = ls('mo-fin-v1'), tx = F.tx || [], acc = (F.acc || []).filter(function (a) { return a.active; });
      var bal = function (a) { var b = +a.opening || 0; tx.forEach(function (t) { var x = +t.amount || 0; if (t.accId === a.id) b += t.type === 'Income' ? x : -x; if (t.type === 'Transfer' && t.toAccId === a.id) b += x; }); return b; };
      var m = function (type, ym, f) { return sum(tx.filter(function (t) { return t.type === type && cut(t.date, 7) === ym && (!f || f(t)); }), function (t) { return t.amount; }); };
      return { F: F, tx: tx, acc: acc, bal: bal, m: m, total: sum(acc, bal) };
    }

    /* ---------- Analisis (aturan sederhana, ambang bisa diatur) ---------- */
    function insights() {
      var c = D.cfg, I = [], td = today(), wk0 = addD(td, -6), ym = td.slice(0, 7);
      var W = ls('mo-work-v1'), P = ls('mo-proj-v1'), TK = ls('mo-task-v1'), O = ls('mo-org-v1'), G = ls('mo-goal-v1'), a = acad(), f = fin();
      var workH = sum((W.log || []).filter(function (l) { return l.date >= wk0 && l.date <= td; }), function (l) { return l.hours; });
      var studyH = sum((a.A.study || []).filter(function (s) { return s.date >= wk0 && s.date <= td; }), function (s) { return s.minutes; }) / 60;
      if (workH + studyH > 0) {
        if (workH + studyH > c.maxWeekHours) I.push(['warn', 'Beban kerja dan belajar tinggi', '7 hari terakhir tercatat ' + n1(workH + studyH) + ' jam (kerja ' + n1(workH) + ' + belajar ' + n1(studyH) + '), di atas ambang ' + c.maxWeekHours + ' jam. Sisihkan waktu istirahat dan tunda hal yang tidak mendesak.']);
        else I.push(['good', 'Beban masih terkendali', n1(workH + studyH) + ' jam tercatat dalam 7 hari terakhir (ambang ' + c.maxWeekHours + ' jam).']);
      }
      if (a.ok && a.ipk != null) {
        var low = a.C.map(function (x) { return { n: x.name, L: a.lt(a.fs(x)) }; }).filter(function (x) { return x.L; }).sort(function (p, q) { return p.L.p - q.L.p; }).slice(0, 3);
        if (a.ipk >= c.ipTarget) I.push(['good', 'IPK sesuai target', 'IPK ' + n1(Math.round(a.ipk * 100) / 100) + ' ≥ target ' + c.ipTarget + '. Pertahankan ritme belajar.']);
        else I.push(['warn', 'IPK di bawah target', 'IPK ' + (Math.round(a.ipk * 100) / 100) + ' < target ' + c.ipTarget + '.' + (low.length ? ' Mata kuliah yang perlu dipelajari lagi: ' + low.map(function (x) { return x.n + ' (' + x.L.l + ')'; }).join(', ') + '.' : '')]);
      } else if (!a.ok && a.C.length) I.push(['info', 'Formula nilai belum aktif', 'Aktifkan formula di Academic Management → Formula Nilai agar IP/IPK dan analisis akademik bisa dihitung.']);
      var od = sum((TK.task || []), function (t) { return t.due && t.due < td && t.status !== 'Done' && t.status !== 'Archived' ? 1 : 0; }) + sum(a.T, function (t) { return t.status !== 'Selesai' && t.deadline && cut(t.deadline, 10) < td ? 1 : 0; }) + sum(W.wtask || [], function (t) { return t.status !== 'Selesai' && t.deadline && t.deadline < td ? 1 : 0; }) + sum(O.followup || [], function (t) { return t.status !== 'Selesai' && t.due && t.due < td ? 1 : 0; }) + sum(P.ptask || [], function (t) { return t.status !== 'Selesai' && t.due && t.due < td ? 1 : 0; });
      if (od > c.overdueMax) I.push(['warn', od + ' tugas lewat tenggat', 'Jumlahnya melebihi ambang ' + c.overdueMax + '. Pilih 1–3 yang paling penting, selesaikan, lalu jadwalkan ulang sisanya.']);
      else if (od > 0) I.push(['info', od + ' tugas lewat tenggat', 'Masih dalam batas ' + c.overdueMax + '. Tinjau di Task → Overdue.']);
      var ex = (a.X || []).filter(function (e) { return e.date && cut(e.date, 10) >= td && cut(e.date, 10) <= addD(td, 7); });
      if (ex.length) I.push(['info', ex.length + ' ujian dalam 7 hari', ex.map(function (e) { var cc = a.C.filter(function (x) { return x.id === e.courseId; })[0]; return e.type + ' ' + (cc ? cc.name : ''); }).join(', ') + '. Jadwalkan sesi belajar di Kalender.']);
      if (f.tx.length) {
        var cur = f.m('Expense', ym), prev = f.m('Expense', addM(ym, -1));
        if (prev > 0 && (cur - prev) / prev * 100 > c.spendRise) I.push(['warn', 'Pengeluaran naik ' + Math.round((cur - prev) / prev * 100) + '%', rp(prev) + ' → ' + rp(cur) + ' dibanding bulan lalu (ambang ' + c.spendRise + '%). Periksa kategori terbesar di Financial.']);
        else if (prev > 0 && cur <= prev) I.push(['good', 'Pengeluaran tidak naik', 'Bulan ini ' + rp(cur) + ' vs bulan lalu ' + rp(prev) + '.']);
        f.acc.forEach(function (x) { if (f.bal(x) < 0) I.push(['warn', 'Saldo "' + x.name + '" minus', 'Saldo saat ini ' + rp(f.bal(x)) + '. Periksa transaksi atau lakukan transfer.']); });
        var eb = {}; f.tx.filter(function (t) { return t.type === 'Expense' && cut(t.date, 7) === ym; }).forEach(function (t) { eb[t.catId] = (eb[t.catId] || 0) + (+t.amount || 0); });
        ((f.F.bud || [])).forEach(function (b) {
          var m = b.month || ym; if (m !== ym || !(+b.limit > 0)) return; var p = (eb[b.catId] || 0) / b.limit * 100;
          if (p >= c.budgetWarn) { var ct = (f.F.cat || []).filter(function (x) { return x.id === b.catId; })[0]; I.push([p >= 100 ? 'warn' : 'info', 'Anggaran ' + (ct ? ct.name : '') + ' ' + Math.round(p) + '%', p >= 100 ? 'Sudah melewati batas anggaran bulan ini.' : 'Mendekati batas (ambang ' + c.budgetWarn + '%).']); }
        });
      }
      var rcv = sum((W.job || []).filter(function (j) { return j.incomeStatus === 'Sudah ditagih'; }), function (j) { return j.income; });
      if (rcv > 0) I.push(['info', 'Ada tagihan pekerjaan belum diterima', rp(rcv) + ' berstatus "Sudah ditagih". Pantau pembayarannya.']);
      (G.goal || []).forEach(function (g) {
        if (g.status === 'Tercapai' || g.status === 'Dibatalkan') return;
        if (g.deadline && g.deadline < td) I.push(['warn', 'Goal lewat deadline: ' + g.name, 'Perbarui status, geser deadline, atau evaluasi penyebabnya.']);
        else if (!(G.ms || []).some(function (m) { return m.goalId === g.id; }) && (g.basis || 'ms') === 'ms') I.push(['info', 'Goal belum dipecah: ' + g.name, 'Buat milestone agar progres bisa dilacak.']);
      });
      if (!I.length) I.push(['info', 'Belum cukup data', 'Isi data di modul Academic, Work, Task, Financial, atau Goal. Analisis akan muncul otomatis.']);
      return I;
    }
    var vIns = function () {
      var a = acad(), f = fin(), T = ls('mo-task-v1').task || [], td = today(), ym = td.slice(0, 7), G = (ls('mo-goal-v1').goal || []);
      var act = a.C.filter(function (c) { var s = (a.A.sem || []).filter(function (x) { return x.id === c.semId; })[0]; return s && s.active; }).length;
      return '<p class="ac-hint" style="margin-bottom:12px">Analisis memakai aturan sederhana dengan ambang yang bisa Anda ubah di tab Ambang Analisis. Ini bantuan membaca data, bukan saran profesional.</p><div class="ac-grid">' +
        stat(act, 'Mata kuliah aktif') + stat(a.ok && a.ipk != null ? (Math.round(a.ipk * 100) / 100) : '—', 'IPK (sesuai formula)') + stat(T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length, 'Tugas aktif (Task)') + stat(rp(f.total), 'Total saldo') + stat(rp(f.m('Expense', ym)), 'Pengeluaran bulan ini') + stat(G.filter(function (g) { return g.status === 'Berjalan'; }).length, 'Goal berjalan') + '</div>' +
        insights().map(function (i) { return '<div class="ins ' + i[0] + '"><b>' + esc(i[1]) + '</b>' + esc(i[2]) + '</div>'; }).join('');
    };
    var vAcad = function () {
      var a = acad(), S = a.A.sem || [];
      if (!a.C.length) return empty('Belum ada data akademik.');
      var h = a.ok ? '' : '<div class="ac-warn"><span>Formula nilai belum diaktifkan, sehingga IP/IPK tidak dihitung.</span></div>';
      var sr = S.map(function (s) { return { s: s, v: a.ip(a.C.filter(function (c) { return c.semId === s.id; })) }; }).filter(function (x) { return x.v != null; });
      h += H('IP per semester (batang oranye = target)') + (sr.length ? vb(sr.map(function (x) { return x.s.name; }), sr.map(function (x) { return x.v; }), sr.map(function (x) { return +x.s.target || 0; }), function (v) { return n1(Math.round(v * 100) / 100); }) : '<p class="ac-hint">Belum ada IP yang bisa dihitung.</p>');
      var act = a.C.filter(function (c) { var s = S.filter(function (x) { return x.id === c.semId; })[0]; return s && s.active; });
      h += H('Nilai akhir mata kuliah aktif') + hb(act.map(function (c) { return [c.name, a.fs(c)]; }).filter(function (r) { return r[1] != null; }), n1);
      var dist = {}; a.C.forEach(function (c) { var L = a.lt(a.fs(c)); if (L) dist[L.l] = (dist[L.l] || 0) + 1; });
      h += H('Distribusi huruf mutu') + hb(Object.keys(dist).map(function (k) { return [k, dist[k]]; }), String);
      var st = {}; (a.T).forEach(function (t) { st[t.status] = (st[t.status] || 0) + 1; });
      h += H('Status tugas kuliah') + hb(Object.keys(st).map(function (k) { return [k, st[k]]; }), String);
      var sd = {}; (a.A.study || []).forEach(function (s) { var c = a.C.filter(function (x) { return x.id === s.courseId; })[0]; if (c) sd[c.name] = (sd[c.name] || 0) + (+s.minutes || 0); });
      h += H('Waktu belajar per mata kuliah (jam)') + hb(Object.keys(sd).map(function (k) { return [k, sd[k] / 60]; }), n1);
      return h;
    };
    var vFin = function () {
      var f = fin(), ym = today().slice(0, 7);
      if (!f.tx.length && !f.acc.length) return empty('Belum ada data keuangan.');
      var ms = []; for (var i = 5; i >= 0; i--) ms.push(addM(ym, -i));
      var h = H('Arus kas 6 bulan (batang gelap = pemasukan, oranye = pengeluaran)') + vb(ms.map(mlab), ms.map(function (m) { return f.m('Income', m); }), ms.map(function (m) { return f.m('Expense', m); }), short);
      h += H('Pemasukan pribadi vs pendapatan pekerjaan (bulan ini)') + hb([['Pemasukan pribadi', f.m('Income', ym, function (t) { return t.scope !== 'Pekerjaan'; })], ['Pendapatan pekerjaan', f.m('Income', ym, function (t) { return t.scope === 'Pekerjaan'; })]], rp);
      var eb = {}, cn = {}; (f.F.cat || []).forEach(function (c) { cn[c.id] = c.name; });
      f.tx.filter(function (t) { return t.type === 'Expense' && cut(t.date, 7) === ym; }).forEach(function (t) { eb[cn[t.catId] || '—'] = (eb[cn[t.catId] || '—'] || 0) + (+t.amount || 0); });
      h += H('Pengeluaran per kategori (bulan ini)') + hb(Object.keys(eb).map(function (k) { return [k, eb[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), rp);
      h += H('Saldo per akun aktif') + hb(f.acc.map(function (x) { return [x.name, Math.max(0, f.bal(x))]; }), rp);
      var gs = (f.F.goal || []).filter(function (g) { return g.status === 'Aktif'; });
      h += H('Progres target tabungan (%)') + hb(gs.map(function (g) { var c = sum((f.F.con || []).filter(function (x) { return x.goalId === g.id; }), function (x) { return x.amount; }); return [g.name, Math.min(100, c / (+g.target || 1) * 100)]; }), function (v) { return Math.round(v) + '%'; });
      return h;
    };
    var vWork = function () {
      var W = ls('mo-work-v1'), P = ls('mo-proj-v1'), O = ls('mo-org-v1');
      if (!(W.job || []).length && !(P.proj || []).length && !(O.org || []).length) return empty('Belum ada data pekerjaan, proyek, atau organisasi.');
      var h = H('Jam kerja tercatat per pekerjaan');
      h += hb((W.job || []).map(function (j) { return [j.title, sum((W.log || []).filter(function (l) { return l.jobId === j.id; }), function (l) { return l.hours; })]; }).filter(function (r) { return r[1] > 0; }), n1);
      var inc = {}; (W.job || []).forEach(function (j) { if (+j.income > 0 && j.incomeStatus !== 'Tidak relevan') inc[j.incomeStatus] = (inc[j.incomeStatus] || 0) + +j.income; });
      h += H('Pendapatan pekerjaan menurut status (terpisah dari pemasukan pribadi)') + hb(Object.keys(inc).map(function (k) { return [k, inc[k]]; }), rp);
      var st = {}; (W.job || []).forEach(function (j) { st[j.status] = (st[j.status] || 0) + 1; });
      h += H('Pekerjaan menurut status') + hb(Object.keys(st).map(function (k) { return [k, st[k]]; }), String);
      h += H('Progres proyek (tugas/milestone selesai, %)') + hb((P.proj || []).map(function (p) { var ms = p.basis === 'ms', a = ms ? (P.ms || []).filter(function (x) { return x.projId === p.id; }) : (P.ptask || []).filter(function (x) { return x.projId === p.id; }); return [p.name, a.length ? a.filter(function (x) { return ms ? x.done : x.status === 'Selesai'; }).length / a.length * 100 : 0]; }), function (v) { return Math.round(v) + '%'; });
      var fu = O.followup || []; h += H('Tindak lanjut rapat organisasi') + hb(['Belum', 'Berjalan', 'Selesai'].map(function (s) { return [s, fu.filter(function (x) { return x.status === s; }).length]; }), String);
      return h;
    };
    var vProd = function () {
      var T = (ls('mo-task-v1').task || []), td = today(), ws = [], i;
      for (i = 7; i >= 0; i--) ws.push(addD(td, -7 * i));
      var h = H('Tugas selesai per minggu (8 minggu terakhir)') + vb(ws.map(function (w) { return w.slice(5); }), ws.map(function (w) { return T.filter(function (t) { return t.status === 'Done' && t.doneAt >= w && t.doneAt < addD(w, 7); }).length; }), null, String);
      var st = {}; T.forEach(function (t) { st[t.status] = (st[t.status] || 0) + 1; });
      h += H('Task menurut status') + hb(Object.keys(st).map(function (k) { return [k, st[k]]; }), String);
      var ar = {}; T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).forEach(function (t) { ar[t.area || '—'] = (ar[t.area || '—'] || 0) + 1; });
      h += H('Tugas aktif per area') + hb(Object.keys(ar).map(function (k) { return [k, ar[k]]; }), String);
      var G = ls('mo-goal-v1'), gs = (G.goal || []).filter(function (g) { return g.status !== 'Dibatalkan'; });
      h += H('Goal berjalan menurut horizon') + hb(['Harian', 'Mingguan', 'Bulanan', 'Semesteran', 'Tahunan', 'Jangka panjang'].map(function (z) { return [z, gs.filter(function (g) { return g.horizon === z; }).length]; }).filter(function (r) { return r[1] > 0; }), String);
      var E = (ls('mo-cal-v1').ev || []).filter(function (e) { return !e.allDay && e.start >= addD(td, -6) && e.start <= td && e.endTime; });
      var hrs = sum(E, function (e) { var s = e.startTime.split(':'), t = e.endTime.split(':'); return ((+t[0] * 60 + +t[1]) - (+s[0] * 60 + +s[1])) / 60; });
      return h + '<p class="ac-hint" style="margin-top:12px">Jam acara terjadwal 7 hari terakhir (yang punya jam selesai): <b>' + n1(hrs) + ' jam</b>.</p>';
    };
    var vCfg = function () {
      var rows = [['maxWeekHours', 'Ambang jam kerja + belajar per minggu', 'jam'], ['ipTarget', 'Target IPK untuk analisis', 'skala 4'], ['overdueMax', 'Batas tugas terlambat sebelum diberi peringatan', 'tugas'], ['spendRise', 'Kenaikan pengeluaran yang dianggap tinggi', '%'], ['budgetWarn', 'Peringatan anggaran mulai dari', '%']];
      return '<p class="ac-hint" style="margin-bottom:12px">Ambang ini milik Anda; analisis tidak memakai angka tersembunyi.</p><div class="ac-card">' + rows.map(function (r) { return '<div class="cfgrow"><label>' + r[1] + '</label><div><input type="number" step="any" min="0" value="' + D.cfg[r[0]] + '" data-chg="cfg" data-k="' + r[0] + '" style="max-width:140px"> <small>' + r[2] + '</small></div></div>'; }).join('') + '</div>';
    };
    return {
      specs: {}, tabs: [['ins', 'Ringkasan & Analisis', vIns], ['acad', 'Akademik', vAcad], ['fin', 'Keuangan', vFin], ['work', 'Kerja & Proyek', vWork], ['prod', 'Produktivitas', vProd], ['cfg', 'Ambang Analisis', vCfg]],
      sub: function () { return 'Membaca data dari semua modul · hanya baca'; },
      act: function (a, d) { if (a === 'cfg') { var v = parseFloat(d.v); if (!isNaN(v) && v >= 0) D.cfg[d.k] = v; } }
    };
  });
  MO.routes['#analytics'] = an.open;
})();
