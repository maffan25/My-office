/* MyOffice — Analytics. Membaca data semua modul (hanya baca) dan menyusun grafik + analisis berbasis aturan. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, rp = K.rp, stat = K.stat, empty = K.empty, by = K.by, btns = K.btns, add = K.add, bar = K.bar;
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
  var LBL = {};
  var H = function (t) { return '<div class="ac-h">' + esc(LBL[t] || t) + '</div>'; };
  var HK = ['Skor kondisi', 'Pengeluaran per kategori', 'Status tugas', 'Angka utama', 'Capaian', 'Pintasan', 'Analisis otomatis', 'Catatan saya', 'IP per semester (batang oranye = target)', 'Nilai akhir mata kuliah aktif', 'Distribusi huruf mutu', 'Status tugas kuliah', 'Waktu belajar per mata kuliah (jam)', 'Arus kas 6 bulan (batang gelap = pemasukan, oranye = pengeluaran)', 'Pemasukan pribadi vs pendapatan pekerjaan (bulan ini)', 'Pengeluaran per kategori (bulan ini)', 'Saldo per akun aktif', 'Progres target tabungan (%)', 'Jam kerja tercatat per pekerjaan', 'Pendapatan pekerjaan menurut status (terpisah dari pemasukan pribadi)', 'Pekerjaan menurut status', 'Progres proyek (tugas/milestone selesai, %)', 'Tindak lanjut rapat organisasi', 'Tugas selesai per minggu (8 minggu terakhir)', 'Task menurut status', 'Tugas aktif per area', 'Goal berjalan menurut horizon'];
  var wrap = function (h) { var p = h.split('<div class="ac-h">'); return p[0] + p.slice(1).map(function (x) { return '<section class="an-sec"><div class="ac-h">' + x + '</section>'; }).join(''); };
  var ART = '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="anG" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#f6cdbe"/><stop offset="1" stop-color="#e7a996"/></radialGradient></defs><rect width="400" height="300" fill="url(#anG)"/><g fill="#feefde" opacity=".75"><rect x="52" y="120" width="34" height="90" rx="17"/><rect x="96" y="90" width="34" height="120" rx="17"/><rect x="270" y="100" width="34" height="110" rx="17"/><rect x="314" y="70" width="34" height="140" rx="17"/></g><circle cx="200" cy="120" r="82" fill="#ebb19f"/><circle cx="168" cy="108" r="11" fill="#805145"/><circle cx="232" cy="108" r="11" fill="#805145"/><circle cx="171" cy="104" r="4" fill="#fff"/><circle cx="235" cy="104" r="4" fill="#fff"/><circle cx="140" cy="140" r="14" fill="#f0bdac" opacity=".8"/><circle cx="260" cy="140" r="14" fill="#f0bdac" opacity=".8"/><path d="M178 138q22 30 44 0z" fill="#805145"/></svg>';
  var seed = function () {
    return {
      cfg: { maxWeekHours: 45, ipTarget: 3, overdueMax: 3, spendRise: 20, budgetWarn: 80 }, title: 'Analytics', sub: 'Membaca data dari semua modul · hanya baca', lbl: {}, hid: {},
      theme: { bg1: '#c2e2e8', bg2: '#b3dae2', a1: '#8dc4d0', a2: '#e4a28f', ink: '#406d77' },
      hero: [{ id: 'h', title: 'Total saldo', big: 'c2', meta: 'Pengeluaran bulan ini', big2: 'c3', cta: 'Buka analisis keuangan', ctaTab: 'fin', img: '' }],
      card: [
        { id: 'c1', icon: '🎓', title: 'IPK', src: 'ipk', val: '', color: '0', tab: 'acad', note: 'Dihitung dari formula nilai di Academic Management. Aktifkan formula agar angkanya muncul.' },
        { id: 'c2', icon: '💰', title: 'Total saldo', src: 'saldo', val: '', color: '1', tab: 'fin', note: 'Jumlah saldo semua akun aktif di menu Financial.' },
        { id: 'c3', icon: '🧾', title: 'Pengeluaran bulan ini', src: 'spend', val: '', color: '2', tab: 'fin', note: 'Total pengeluaran sejak tanggal 1 bulan ini.' },
        { id: 'c4', icon: '✅', title: 'Tugas aktif', src: 'tasks', val: '', color: '3', tab: 'prod', note: 'Tugas di menu Task yang belum selesai atau diarsipkan.' },
        { id: 'c5', icon: '📚', title: 'Mata kuliah aktif', src: 'courses', val: '', color: '4', tab: 'acad', note: 'Mata kuliah pada semester yang sedang aktif.' },
        { id: 'c6', icon: '🎯', title: 'Goal berjalan', src: 'goals', val: '', color: '0', tab: '', note: 'Goal berstatus Berjalan di menu Goals.' }],
      note: [], chart: []
    };
  };
  var AUTOOPT = [['manual', 'Isi manual'], ['courses', 'Otomatis: mata kuliah aktif'], ['ipk', 'Otomatis: IPK'], ['tasks', 'Otomatis: tugas aktif'], ['saldo', 'Otomatis: total saldo'], ['spend', 'Otomatis: pengeluaran bulan ini'], ['goals', 'Otomatis: goal berjalan']];
  var TABOPT = [['', 'Tidak ada'], ['ins', 'Ringkasan & Analisis'], ['acad', 'Akademik'], ['fin', 'Keuangan'], ['work', 'Kerja & Proyek'], ['prod', 'Produktivitas'], ['mine', 'Grafik Saya'], ['cfg', 'Pengaturan']];
  var COL = [['0', 'Lavender'], ['1', 'Peach'], ['2', 'Mint'], ['3', 'Pink'], ['4', 'Putih']];
  var readImg = function (f, cb) { var r = new FileReader(); r.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .85)); }; im.src = r.result; }; r.readAsDataURL(f); };
  var parseRows = function (t) { var o = []; String(t || '').split('\n').forEach(function (l) { var i = l.lastIndexOf(':'); if (i < 0) return; var n = l.slice(i + 1).split(',').map(parseFloat); if (isNaN(n[0])) return; o.push({ l: l.slice(0, i).trim() || '—', a: n[0], b: isNaN(n[1]) ? null : n[1] }); }); return o; };
  var score = function (I) { var g = 0, f = 0, n = 0; I.forEach(function (x) { if (x[1] === 'Belum cukup data') return; n++; if (x[0] === 'good') g++; else if (x[0] === 'info') f += .5; }); return n ? Math.round((g + f) / n * 100) / 10 : null; };

  var an = K.App('Analytics', 'mo-an-v1', seed, function (app) {
    var D = app.D, st = app.st, S0 = seed(); Object.keys(S0).forEach(function (k) { if (D[k] == null) D[k] = S0[k]; });
    D.cfg = Object.assign({}, S0.cfg, D.cfg); D.theme = Object.assign({}, S0.theme, D.theme); LBL = D.lbl;
    if (D.v !== 2) { D.v = 2; var im = D.hero[0] && D.hero[0].img; D.theme = S0.theme; D.hero = S0.hero; D.hero[0].img = im || ''; }
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
    function autoVals() {
      var a = acad(), f = fin(), T = ls('mo-task-v1').task || [], ym = today().slice(0, 7), G = ls('mo-goal-v1').goal || [];
      return {
        courses: String(a.C.filter(function (c) { var s = (a.A.sem || []).filter(function (x) { return x.id === c.semId; })[0]; return s && s.active; }).length),
        ipk: a.ok && a.ipk != null ? String(Math.round(a.ipk * 100) / 100) : '—',
        tasks: String(T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length),
        saldo: rp(f.total), spend: rp(f.m('Expense', ym)), goals: String(G.filter(function (g) { return g.status === 'Berjalan'; }).length)
      };
    }
    function look() {
      var T = D.theme, s = document.getElementById('an-theme'); if (!s) { s = document.createElement('style'); s.id = 'an-theme'; document.head.appendChild(s); }
      s.textContent = 'html:root .ac-ov.an-skin:not(.ad-skin){--an-bg1:' + T.bg1 + ';--an-bg2:' + T.bg2 + ';--an-a1:' + T.a1 + ';--an-a2:' + T.a2 + ';--an-ink:' + T.ink + '}';
      var h = document.querySelector('.ac-ov.an-skin:not(.ac-ov2) header h2'); if (h) h.textContent = D.title || 'Analytics';
    }
    var specs = {
      hero: { title: 'Dua Kartu Gradasi', def: {}, fields: [{ k: 'title', l: 'Kartu 1: label', t: 'text', req: 1 }, { k: 'big', l: 'Kartu 1: angka dari kartu', t: 'select', o: function () { return D.card.map(function (c) { return [c.id, c.icon + ' ' + c.title]; }); } }, { k: 'meta', l: 'Kartu 2: label', t: 'text', req: 1 }, { k: 'big2', l: 'Kartu 2: angka dari kartu', t: 'select', o: function () { return D.card.map(function (c) { return [c.id, c.icon + ' ' + c.title]; }); } }, { k: 'cta', l: 'Teks tombol ↗ pada kartu 1', t: 'text', req: 1 }, { k: 'ctaTab', l: 'Tombol ↗ membuka tab', t: 'select', o: TABOPT.slice(1) }] },
      card: { title: 'Kartu Angka', def: { src: 'manual', color: '0', icon: '⭐', tab: '' }, fields: [{ k: 'title', l: 'Judul kartu', t: 'text', req: 1 }, { k: 'icon', l: 'Ikon (emoji)', t: 'text' }, { k: 'src', l: 'Sumber angka', t: 'select', o: AUTOOPT }, { k: 'val', l: 'Angka manual (dipakai bila sumber = Isi manual)', t: 'text' }, { k: 'color', l: 'Warna kartu', t: 'select', o: COL }, { k: 'tab', l: 'Tombol ▶ membuka tab', t: 'select', o: TABOPT }, { k: 'note', l: 'Penjelasan', t: 'textarea', full: 1 }] },
      note: { title: 'Catatan', def: { kind: 'info' }, fields: [{ k: 'title', l: 'Judul', t: 'text', req: 1, full: 1 }, { k: 'text', l: 'Isi catatan', t: 'textarea', full: 1 }, { k: 'kind', l: 'Jenis', t: 'select', o: [['good', 'Positif'], ['warn', 'Perhatian'], ['info', 'Info']] }] },
      chart: { title: 'Grafik', def: { kind: 'hb', unit: '' }, fields: [{ k: 'title', l: 'Judul grafik', t: 'text', req: 1, full: 1 }, { k: 'kind', l: 'Bentuk', t: 'select', o: [['hb', 'Batang mendatar'], ['vb', 'Kolom tegak']] }, { k: 'unit', l: 'Satuan (jam, %, Rp, ...)', t: 'text' }, { k: 'data', l: 'Data: satu baris "Label: nilai" (kolom tegak boleh "Label: nilai, nilai2")', t: 'textarea', full: 1 }] }
    };
    var P5 = ['var(--an-ink)', 'var(--an-a1)', '#b7dce4', 'var(--an-a2)'], PS = ['#f7d0c1', '#a8d4de', '#dfc095', '#f6cdbe', '#edb4a3'];
    var gauge = function (p) { var L = Math.PI * 90; return '<svg class="bn-gauge" viewBox="0 0 220 130" aria-hidden="true"><path class="gt" d="M20 110A90 90 0 0 1 200 110"/><path class="gf" d="M20 110A90 90 0 0 1 200 110" style="stroke-dasharray:' + L + ';stroke-dashoffset:' + L * (1 - Math.max(0, Math.min(1, p))) + '"/><text x="20" y="127">0</text><text x="200" y="127" text-anchor="end">100</text></svg>'; };
    var donut = function (parts, big) {
      var C = 2 * Math.PI * 60, tot = sum(parts, function (x) { return x.v; }), acc = 0;
      var arcs = parts.filter(function (x) { return x.v > 0; }).map(function (x) { var l = x.v / tot * C, r = '<circle cx="80" cy="80" r="60" style="stroke:' + x.c + ';stroke-dasharray:' + Math.max(0, l - 3) + ' ' + C + ';stroke-dashoffset:' + (-acc) + '"/>'; acc += l; return r; }).join('');
      return '<div class="bn-donut"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="dt" cx="80" cy="80" r="60"/>' + arcs + '</svg><b>' + big + '</b></div>';
    };
    var spark = function (v) { var mx = Math.max.apply(null, v.concat([1])), pt = v.map(function (x, i) { return [8 + i * 184 / Math.max(1, v.length - 1), 62 - x / mx * 50]; }), e = pt[pt.length - 1]; return '<svg class="bn-spark" viewBox="0 0 200 70" aria-hidden="true"><path d="' + pt.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('') + '"/><circle cx="' + e[0] + '" cy="' + e[1] + '" r="6"/></svg>'; };
    var vIns = function () {
      var q = (st.q || '').toLowerCase(), AV = autoVals(), h0 = D.hero[0] || {}, all = insights(), I = all.filter(function (i) { return !D.hid[i[1]]; }), nh = all.length - I.length, f = fin(), td = today(), ym = td.slice(0, 7);
      var hit = function (x) { return !q || String(x).toLowerCase().indexOf(q) >= 0; }, Tt = function (t) { return esc(LBL[t] || t); }, hd = function (t, x) { return '<h4>' + Tt(t) + (x || '') + '</h4>'; };
      var cv = function (c) { return c ? (c.src && c.src !== 'manual' && AV[c.src] != null ? AV[c.src] : (c.val || '—')) : '—'; };
      var cnt = { good: 0, info: 0, warn: 0 }; all.forEach(function (i) { if (i[1] !== 'Belum cukup data') cnt[i[0]]++; });
      var n = cnt.good + cnt.info + cnt.warn, sc = score(all), pc = function (x) { return n ? Math.round(x / n * 100) : 0; }, mxc = Math.max(cnt.good, cnt.info, cnt.warn, 1);
      var pill = function (l, v, k) { return '<div class="bn-pill"><i class="p' + k + '" style="width:' + Math.max(34, v / mxc * 100) + '%"></i><span>' + l + '</span><em>' + v + '</em></div>'; };
      var gaugeC = '<section class="bn-c">' + hd('Skor kondisi') + '<div class="bn-gw">' + gauge(sc == null ? 0 : sc / 10) + '<div class="bn-gc"><div><b>' + (sc == null ? '—' : Math.round(sc * 10) + '%') + '</b><small><i class="bdot" style="background:var(--an-a1)"></i>Skor</small></div><div><b>' + pc(cnt.warn) + '%</b><small><i class="bdot" style="background:var(--an-a2)"></i>Perhatian</small></div></div></div>' + pill('Positif', cnt.good, 0) + pill('Info', cnt.info, 1) + pill('Perhatian', cnt.warn, 3) + '</section>';
      var ms = []; for (var k = 5; k >= 0; k--) ms.push(addM(ym, -k));
      var ex = ms.map(function (m) { return f.m('Expense', m); }), inc = ms.map(function (m) { return f.m('Income', m); }), mx = Math.max.apply(null, ex.concat([1]));
      var b1 = by(D.card, h0.big) || D.card[0], b2 = by(D.card, h0.big2) || D.card[1] || D.card[0];
      var g1 = '<section class="bn-c bn-g1"' + (h0.img ? ' style="background-image:linear-gradient(135deg,rgba(189,223,231,0.8),rgba(249,216,202,0.8)),url(' + h0.img + ')"' : '') + '><label class="an-up" title="Ganti foto latar">📷<input type="file" accept="image/*" data-chg="img" hidden></label>' + (h0.img ? '<button class="an-up r" data-act="imgdel" aria-label="Hapus foto latar">✕</button>' : '') + '<button class="bn-ico" data-act="tab" data-t="' + esc(h0.ctaTab || 'fin') + '" title="' + esc(h0.cta) + '" aria-label="' + esc(h0.cta) + '">↗</button><b class="bn-big">' + esc(cv(b1)) + '</b><p>' + esc(h0.title) + '</p><div class="bn-mb" aria-hidden="true">' + ex.slice(1).map(function (x, i) { return '<i style="height:' + Math.max(8, x / mx * 100) + '%;opacity:' + (.45 + i * .14) + '"></i>'; }).join('') + '</div><button class="an-edit" data-act="edit" data-e="hero" data-id="h" aria-label="Edit kartu gradasi">✎</button></section>';
      var T = ls('mo-task-v1').task || [], dn = T.filter(function (t) { return t.status === 'Done'; }).length, lt = T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived' && t.due && t.due < td; }).length, ac = T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length - lt, tt = dn + lt + ac;
      var tc = '<section class="bn-c">' + hd('Status tugas') + donut([{ v: lt, c: '#ebb2a0' }, { v: ac, c: '#a1d1db' }, { v: dn, c: '#68a0ad' }], tt ? Math.round(dn / tt * 100) + '%' : '—') + '<div class="bn-lg"><span><i style="background:#68a0ad"></i>Selesai ' + dn + '</span><span><i style="background:#a1d1db"></i>Aktif ' + ac + '</span><span><i style="background:#ebb2a0"></i>Terlambat ' + lt + '</span></div></section>';
      var tabs = [['acad', 'Akademik'], ['fin', 'Keuangan'], ['work', 'Kerja & Proyek'], ['prod', 'Produktivitas'], ['mine', 'Grafik Saya']];
      var pls = '<section class="bn-c">' + hd('Pintasan') + '<div class="bn-pills">' + tabs.map(function (t, i) { return '<button class="bn-pl p' + (i % 4) + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></section>';
      var cn = {}; (f.F.cat || []).forEach(function (c) { cn[c.id] = c.name; }); var eb = {};
      f.tx.filter(function (t) { return t.type === 'Expense' && cut(t.date, 7) === ym; }).forEach(function (t) { var kk = cn[t.catId] || 'Lainnya'; eb[kk] = (eb[kk] || 0) + (+t.amount || 0); });
      var er = Object.keys(eb).map(function (kk) { return [kk, eb[kk]]; }).sort(function (a, b) { return b[1] - a[1]; }), top = er.slice(0, 3), rest = sum(er.slice(3), function (r) { return r[1]; }); if (rest > 0) top.push(['Lainnya', rest]);
      var et = sum(top, function (r) { return r[1]; });
      var dom = '<section class="bn-c">' + hd('Pengeluaran per kategori') + donut(top.map(function (r, i) { return { v: r[1], c: P5[i] }; }), et ? Math.round(top[0][1] / et * 100) + '%' : '—') + '<div class="bn-lg">' + (top.length ? top.map(function (r, i) { return '<span><i style="background:' + P5[i] + '"></i>' + esc(r[0]) + '</span>'; }).join('') : '<span>Belum ada pengeluaran bulan ini</span>') + '</div></section>';
      var gt = st.gt || 'Proyek', rows = [];
      if (gt === 'Proyek') { var PR = ls('mo-proj-v1'); rows = (PR.proj || []).map(function (p) { var ms2 = p.basis === 'ms', a = ms2 ? (PR.ms || []).filter(function (x) { return x.projId === p.id; }) : (PR.ptask || []).filter(function (x) { return x.projId === p.id; }), v = a.length ? a.filter(function (x) { return ms2 ? x.done : x.status === 'Selesai'; }).length / a.length * 100 : 0; return [p.name, v, Math.round(v) + '%']; }); }
      else if (gt === 'Area') { var ar = {}; T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).forEach(function (t) { ar[t.area || '—'] = (ar[t.area || '—'] || 0) + 1; }); rows = Object.keys(ar).map(function (kk) { return [kk, ar[kk], String(ar[kk])]; }); }
      else { var a0 = acad(); rows = a0.C.map(function (c) { return [c.name, a0.fs(c)]; }).filter(function (r) { return r[1] != null; }).map(function (r) { return [r[0], r[1], n1(r[1])]; }); }
      rows = rows.slice(0, 5); var rmx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([0.0001]));
      var gn = '<section class="bn-c">' + hd('Capaian', '<span class="bn-tabs">' + ['Proyek', 'Area', 'Nilai'].map(function (t) { return '<button data-act="gt" data-v="' + t + '" aria-pressed="' + (t === gt) + '">' + t + '</button>'; }).join('') + '</span>') + (rows.length ? rows.map(function (r, i) { return '<div class="bn-gr"><span>' + esc(r[0]) + '</span><div class="bn-gb"><i style="width:' + Math.max(14, r[1] / rmx * 100) + '%;background:' + PS[i % 5] + '">' + esc(r[2]) + '</i></div></div>'; }).join('') : '<p class="ac-hint">Belum ada data untuk ' + gt.toLowerCase() + '.</p>') + '</section>';
      var cards = D.card.filter(function (c) { return hit(c.title + ' ' + c.note); });
      var rec = '<section class="bn-c">' + hd('Angka utama', '<button class="bn-add" data-act="add" data-e="card" aria-label="Tambah kartu angka">+</button>') + (cards.length ? cards.map(function (c) { return '<div class="bn-row"><i class="bn-ic c' + esc(c.color) + '">' + esc(c.icon) + '</i><div><b>' + esc(c.title) + '</b><small>' + esc(cut(c.note, 38)) + '</small></div><strong>' + esc(cv(c)) + '</strong><button class="bn-ed" data-act="edit" data-e="card" data-id="' + c.id + '" aria-label="Edit ' + esc(c.title) + '">✎</button></div>'; }).join('') : '<p class="ac-hint">' + (D.card.length ? 'Tidak ada kartu yang cocok.' : 'Belum ada kartu.') + '</p>') + '</section>';
      var g2 = '<section class="bn-c bn-g2"><button class="bn-ico" data-act="tab" data-t="' + esc(h0.ctaTab || 'fin') + '" aria-label="' + esc(h0.cta) + '">▥</button><b class="bn-big">' + esc(cv(b2)) + '</b><p>' + esc(h0.meta) + '</p>' + spark(inc) + '</section>';
      var ins = I.filter(function (i) { return hit(i[1] + ' ' + i[2]); }).map(function (i) { return '<div class="ins ' + i[0] + '"><b>' + esc(i[1]) + '</b>' + esc(i[2]) + '<button class="an-x" data-act="hid" data-k="' + esc(i[1]) + '">Sembunyikan</button></div>'; }).join('');
      var notes = D.note.filter(function (x) { return hit(x.title + ' ' + x.text); }).map(function (x) { return '<div class="ins ' + esc(x.kind) + ' mine"><b>' + esc(x.title) + '</b>' + esc(x.text) + '<div class="ac-acts" style="margin-top:8px">' + btns('note', x.id) + '</div></div>'; }).join('');
      var wide = '<section class="bn-c bn-wide">' + hd('Analisis otomatis') + '<p class="ac-hint" style="margin-bottom:12px">Analisis memakai aturan sederhana dengan ambang yang bisa Anda ubah di tab Pengaturan. Ini bantuan membaca data, bukan saran profesional.</p>' + (ins || '<p class="ac-hint">Tidak ada analisis yang cocok.</p>') + (nh ? '<button class="an-x" data-act="unhid">Tampilkan ' + nh + ' analisis yang disembunyikan</button>' : '') + hd('Catatan saya') + notes + '<div class="ac-acts">' + add('note', 'Catatan') + '</div></section>';
      return '<div class="an-search"><span aria-hidden="true">🔍</span><input type="search" data-in="q" value="' + esc(st.q || '') + '" placeholder="Cari angka, analisis, atau catatan" aria-label="Cari"></div><div class="bn"><div class="bn-col">' + gaugeC + rec + '</div><div class="bn-col">' + g1 + tc + pls + '</div><div class="bn-col">' + dom + gn + g2 + '</div></div>' + wide;
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
      return wrap(h);
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
      return wrap(h);
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
      return wrap(h);
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
      return wrap(h) + '<p class="ac-hint" style="margin-top:12px">Jam acara terjadwal 7 hari terakhir (yang punya jam selesai): <b>' + n1(hrs) + ' jam</b>.</p>';
    };
    var vMine = function () {
      var h = bar('Buat grafik sendiri dari data yang Anda ketik. Satu baris = satu batang, formatnya “Label: nilai”.', add('chart', 'Grafik'));
      if (!D.chart.length) return h + empty('Belum ada grafik. Tekan “+ Grafik” untuk membuat yang pertama.');
      return h + D.chart.map(function (c) {
        var r = parseRows(c.data), f = c.unit === 'Rp' ? rp : function (v) { return n1(v) + (c.unit ? ' ' + c.unit : ''); }, two = r.some(function (x) { return x.b != null; });
        var g = !r.length ? '<p class="ac-hint">Data belum valid. Tulis satu baris per batang, contoh “Senin: 5”.</p>' : c.kind === 'vb' ? vb(r.map(function (x) { return x.l; }), r.map(function (x) { return x.a; }), two ? r.map(function (x) { return x.b || 0; }) : null, f) : hb(r.map(function (x) { return [x.l, x.a]; }), f);
        return '<section class="an-sec"><div class="ac-row"><div class="ac-h">' + esc(c.title) + '</div>' + btns('chart', c.id) + '</div>' + g + '</section>';
      }).join('');
    };
    var vCfg = function () {
      var T = D.theme, cols = [['bg1', 'Warna latar atas'], ['bg2', 'Warna latar bawah'], ['a1', 'Tombol: warna awal'], ['a2', 'Tombol & aksen: warna akhir'], ['ink', 'Warna teks']];
      var rows = [['maxWeekHours', 'Ambang jam kerja + belajar per minggu', 'jam'], ['ipTarget', 'Target IPK untuk analisis', 'skala 4'], ['overdueMax', 'Batas tugas terlambat sebelum diberi peringatan', 'tugas'], ['spendRise', 'Kenaikan pengeluaran yang dianggap tinggi', '%'], ['budgetWarn', 'Peringatan anggaran mulai dari', '%']];
      var tx = function (l, k, v) { return '<div class="cfgrow w"><label>' + l + '</label><input type="text" value="' + esc(v) + '" data-chg="txt" data-k="' + k + '"></div>'; };
      return '<section class="an-sec"><div class="ac-h">Warna tema</div>' + cols.map(function (c) { return '<div class="cfgrow"><label>' + c[1] + '</label><input type="color" value="' + esc(T[c[0]]) + '" data-chg="theme" data-k="' + c[0] + '"></div>'; }).join('') + '<div class="ac-acts" style="margin-top:10px"><button class="ac-btn sm" data-act="themereset">Kembalikan warna bawaan</button></div></section>' +
        '<section class="an-sec"><div class="ac-h">Judul jendela</div>' + tx('Judul', 'title', D.title) + tx('Keterangan di bawah judul', 'sub', D.sub) + '</section>' +
        '<section class="an-sec"><div class="ac-h">Nama judul grafik &amp; bagian</div><p class="ac-hint" style="margin-bottom:8px">Ubah teks, kosongkan kolom untuk memakai nama bawaan.</p>' + HK.map(function (k) { return '<div class="cfgrow w"><label>' + esc(k) + '</label><input type="text" value="' + esc(LBL[k] || '') + '" placeholder="' + esc(k) + '" data-chg="lbl" data-k="' + esc(k) + '"></div>'; }).join('') + '</section>' +
        '<section class="an-sec"><div class="ac-h">Ambang analisis</div><p class="ac-hint" style="margin-bottom:8px">Ambang ini milik Anda; analisis tidak memakai angka tersembunyi.</p>' + rows.map(function (r) { return '<div class="cfgrow"><label>' + r[1] + '</label><div><input type="number" step="any" min="0" value="' + D.cfg[r[0]] + '" data-chg="cfg" data-k="' + r[0] + '" style="max-width:120px"> <small>' + r[2] + '</small></div></div>'; }).join('') + '</section>' +
        '<div class="ac-acts"><button class="ac-btn danger" data-act="resetall">Kembalikan tampilan Ringkasan ke bawaan</button></div>';
    };
    return {
      skin: 'an-skin', specs: specs, tabs: [['ins', 'Ringkasan & Analisis', vIns], ['acad', 'Akademik', vAcad], ['fin', 'Keuangan', vFin], ['work', 'Kerja & Proyek', vWork], ['prod', 'Produktivitas', vProd], ['mine', 'Grafik Saya', vMine], ['cfg', 'Pengaturan', vCfg]],
      sub: function () { look(); return D.sub; },
      act: function (a, d, t) {
        if (a === 'cfg') { var v = parseFloat(d.v); if (!isNaN(v) && v >= 0) D.cfg[d.k] = v; }
        else if (a === 'gt') st.gt = d.v;
        else if (a === 'hid') D.hid[d.k] = 1;
        else if (a === 'unhid') D.hid = {};
        else if (a === 'img') { var f = t && t.files && t.files[0]; if (f) readImg(f, function (u) { D.hero[0].img = u; app.save(); app.render(); }); }
        else if (a === 'imgdel') D.hero[0].img = '';
        else if (a === 'theme') { if (/^#[0-9a-f]{6}$/i.test(d.v)) D.theme[d.k] = d.v; }
        else if (a === 'themereset') D.theme = seed().theme;
        else if (a === 'lbl') { var x = String(d.v).trim(); if (x) LBL[d.k] = x; else delete LBL[d.k]; }
        else if (a === 'txt') { D[d.k] = String(d.v).trim() || seed()[d.k]; }
        else if (a === 'resetall') { if (confirm('Kembalikan hero, kartu angka, warna, dan nama bagian ke bawaan? Catatan dan grafik Anda tidak dihapus.')) { var S = seed(); ['hero', 'card', 'theme', 'hid'].forEach(function (k) { D[k] = S[k]; }); Object.keys(LBL).forEach(function (k) { delete LBL[k]; }); D.title = S.title; D.sub = S.sub; } }
      }
    };
  });
  MO.routes['#analytics'] = an.open;
})();
