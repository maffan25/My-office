/* MyOffice — Financial (data di localStorage perangkat; mata uang utama Rupiah) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, by = K.by, empty = K.empty, bar = K.bar, add = K.add, btns = K.btns, opt = K.opt, badge = K.badge, stat = K.stat, rp = K.rp, fd = K.fd;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var nowM = function () { return K.todayS().slice(0, 7); };
  var addM = function (ym, n) { var d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };
  var mlab = function (ym) { return new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }); };
  var mfull = function (ym) { return new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); };
  var pc = function (a, b) { return b > 0 ? a / b * 100 : 0; };
  var sel = function (k, label, o, cur) { return '<select data-in="' + k + '" aria-label="' + label + '" style="width:auto">' + o.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur || '') ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>'; };
  var meter = function (p) { var c = p >= 100 ? '#d0443e' : p >= 80 ? '#d99a2b' : 'var(--ink)'; return '<div class="ac-track"><i style="width:' + Math.min(100, p) + '%;background:' + c + '"></i></div>'; };

  var fin = K.App('Financial', 'mo-fin-v1', function () {
    var mk = function (k, a) { return a.map(function (n) { return { id: K.uid(), name: n, kind: k, archived: false }; }); };
    return { acc: [], tx: [], bud: [], goal: [], con: [],
      cat: mk('Pemasukan', ['Uang saku', 'Gaji', 'Freelance', 'Beasiswa', 'Bisnis', 'Lainnya']).concat(mk('Pengeluaran', ['Makanan', 'Transportasi', 'Pendidikan', 'Kebutuhan pribadi', 'Hiburan', 'Langganan', 'Kesehatan', 'Organisasi', 'Tabungan', 'Lainnya'])) };
  }, function (app) {
    var D = app.D, st = app.st;
    var AT = ['Cash', 'Bank', 'E-wallet', 'Tabungan', 'Rekening lain'], PM = ['Tunai', 'Transfer bank', 'QRIS', 'Kartu debit', 'Kartu kredit', 'E-wallet', 'Lainnya'];
    var cn = function (id) { var c = by(D.cat, id); return c ? c.name : '—'; }, an = function (id) { var a = by(D.acc, id); return a ? a.name : '—'; };
    var ym = function () { return st.m || nowM(); };
    var scoped = function (t) { return !st.sc || st.sc === 'Semua' || t.scope === st.sc; };
    var bal = function (a) { var b = +a.opening || 0; D.tx.forEach(function (t) { var x = +t.amount || 0; if (t.accId === a.id) b += t.type === 'Income' ? x : -x; if (t.type === 'Transfer' && t.toAccId === a.id) b += x; }); return b; };
    /* Transfer TIDAK pernah dihitung sebagai pemasukan/pengeluaran */
    var sum = function (type, m, f) { return D.tx.filter(function (t) { return t.type === type && t.date.slice(0, 7) === m && (!f || f(t)); }).reduce(function (a, t) { return a + (+t.amount || 0); }, 0); };
    var expBy = function (m) { var o = {}; D.tx.filter(function (t) { return t.type === 'Expense' && t.date.slice(0, 7) === m && scoped(t); }).forEach(function (t) { o[t.catId] = (o[t.catId] || 0) + (+t.amount || 0); }); return o; };
    var incSc = function (m) { return sum('Income', m, scoped); };
    var budFor = function (cid, m) { return D.bud.filter(function (b) { return b.catId === cid && b.month === m; })[0] || D.bud.filter(function (b) { return b.catId === cid && !b.month; })[0]; };
    var collected = function (g) { return D.con.filter(function (c) { return c.goalId === g.id; }).reduce(function (a, c) { return a + (+c.amount || 0); }, 0); };
    var catOpts = function (v) { return [['', '— Pilih kategori —']].concat(D.cat.filter(function (c) { return !c.archived || c.id === v; }).map(function (c) { return [c.id, c.kind + ' · ' + c.name + (c.archived ? ' (arsip)' : '')]; })); };
    var accOpts = function (v) { return [['', '— Pilih akun —']].concat(D.acc.filter(function (a) { return a.active || a.id === v; }).map(function (a) { return [a.id, a.name + ' (' + a.type + ')']; })); };

    var specs = {
      acc: { title: 'Akun', def: { type: 'Cash', currency: 'IDR', opening: 0, active: true }, fields: [
        { k: 'name', l: 'Nama akun', t: 'text', req: 1, full: 1 }, { k: 'type', l: 'Jenis', t: 'select', o: opt(AT) }, { k: 'currency', l: 'Mata uang', t: 'select', o: [['IDR', 'Rupiah (IDR)']] },
        { k: 'opening', l: 'Saldo awal (Rp)', t: 'number' }, { k: 'active', l: 'Status', t: 'select', bool: 1, o: [['true', 'Aktif'], ['false', 'Nonaktif']] }] },
      tx: { title: 'Transaksi', def: { type: 'Expense', scope: 'Pribadi' }, fields: [
        { k: 'date', l: 'Tanggal', t: 'date', req: 1 }, { k: 'type', l: 'Jenis transaksi', t: 'select', req: 1, o: opt(['Income', 'Expense', 'Transfer']) },
        { k: 'amount', l: 'Jumlah (Rp)', t: 'number', req: 1, min: 0 }, { k: 'accId', l: 'Akun (asal)', t: 'select', req: 1, o: accOpts },
        { k: 'toAccId', l: 'Akun tujuan (khusus Transfer)', t: 'select', o: accOpts }, { k: 'catId', l: 'Kategori (Income/Expense)', t: 'select', o: catOpts },
        { k: 'desc', l: 'Deskripsi', t: 'text', full: 1 }, { k: 'method', l: 'Metode pembayaran', t: 'select', o: [['', '—']].concat(opt(PM)) },
        { k: 'scope', l: 'Sumber / cakupan (dipisah di laporan)', t: 'select', o: opt(['Pribadi', 'Pekerjaan']) },
        { k: 'jobRef', l: 'Terkait pekerjaan (Work Office)', t: 'select', full: 1, o: function () { return [['', '—']].concat((ls('mo-work-v1').job || []).map(function (j) { return [j.id, j.title]; })); } },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }, { k: 'proof', l: 'Bukti transaksi (tautan / nama berkas)', t: 'text', full: 1 }] },
      cat: { title: 'Kategori', def: { kind: 'Pengeluaran', archived: false }, fields: [
        { k: 'name', l: 'Nama kategori', t: 'text', req: 1, full: 1 }, { k: 'kind', l: 'Jenis', t: 'select', o: opt(['Pemasukan', 'Pengeluaran']) }, { k: 'archived', l: 'Status', t: 'select', bool: 1, o: [['false', 'Aktif'], ['true', 'Diarsipkan']] }] },
      bud: { title: 'Anggaran', def: {}, fields: [
        { k: 'catId', l: 'Kategori pengeluaran', t: 'select', req: 1, full: 1, o: function (v) { return [['', '— Pilih —']].concat(D.cat.filter(function (c) { return c.kind === 'Pengeluaran' && (!c.archived || c.id === v); }).map(function (c) { return [c.id, c.name]; })); } },
        { k: 'limit', l: 'Batas anggaran (Rp)', t: 'number', req: 1, min: 0 }, { k: 'month', l: 'Bulan (kosong = berlaku tiap bulan)', t: 'month' }] },
      goal: { title: 'Target Tabungan', def: { status: 'Aktif' }, fields: [
        { k: 'name', l: 'Nama target', t: 'text', req: 1, full: 1 }, { k: 'target', l: 'Jumlah target (Rp)', t: 'number', req: 1, min: 0 }, { k: 'date', l: 'Target tanggal', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', o: opt(['Aktif', 'Tercapai', 'Dibatalkan']) }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      con: { title: 'Kontribusi', def: {}, fields: [
        { k: 'goalId', l: 'Target', t: 'select', req: 1, full: 1, o: function () { return [['', '— Pilih target —']].concat(D.goal.map(function (g) { return [g.id, g.name]; })); } },
        { k: 'date', l: 'Tanggal', t: 'date', req: 1 }, { k: 'amount', l: 'Jumlah (Rp, negatif = penarikan)', t: 'number', req: 1 }, { k: 'notes', l: 'Catatan', t: 'text', full: 1 }] }
    };

    /* ---------- Ringkasan & analitik ---------- */
    function vSum() {
      var m = ym(), pm = addM(m, -1), sc = st.sc || 'Semua';
      var inc = incSc(m), exp = sum('Expense', m, scoped), expP = sum('Expense', pm, scoped), incP = incSc(pm), net = inc - exp;
      var iPers = sum('Income', m, function (t) { return t.scope !== 'Pekerjaan'; }), iWork = sum('Income', m, function (t) { return t.scope === 'Pekerjaan'; });
      var act = D.acc.filter(function (a) { return a.active; }), total = act.reduce(function (a, x) { return a + bal(x); }, 0);
      var eb = expBy(m), ids = Object.keys(eb).sort(function (a, b) { return eb[b] - eb[a]; });
      var bl = [], bLim = 0, bSpent = 0;
      D.cat.filter(function (c) { return c.kind === 'Pengeluaran'; }).forEach(function (c) { var b = budFor(c.id, m); if (b) { var sp = eb[c.id] || 0; bLim += +b.limit || 0; bSpent += sp; bl.push({ c: c, b: b, sp: sp, p: pc(sp, +b.limit) }); } });
      var gs = D.goal.filter(function (g) { return g.status === 'Aktif'; }), gT = gs.reduce(function (a, g) { return a + (+g.target || 0); }, 0), gC = gs.reduce(function (a, g) { return a + collected(g); }, 0);
      var short = function (n) { n = Math.abs(n); return n >= 1e9 ? (n / 1e9).toFixed(1).replace('.0', '') + ' M' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' jt' : n >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(Math.round(n)); };
      var chg = function (a, b) { return b > 0 ? Math.round((a - b) / b * 100) : null; };
      var chip = function (v, upGood) { if (v == null) return ''; var up = v >= 0; return '<em class="fx-chip ' + (up === upGood ? 'g' : 'b') + '">' + (up ? '+' : '−') + Math.abs(v) + '%</em>'; };
      var PAL = ['#c7f26b', '#b7a6ff', '#ff9f6b', '#6bd5ff', '#ff6b8b', '#8a93ad'];
      var hue = function (s) { var h = 0; String(s).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; }); return h; };
      var months = []; for (var i = 5; i >= 0; i--) months.push(addM(m, -i));
      var mi = months.map(function (x) { return incSc(x); }), me = months.map(function (x) { return sum('Expense', x, scoped); }), mx = Math.max.apply(null, mi.concat(me, [1]));

      /* donut */
      var top = ids.slice(0, 5), rest = ids.slice(5).reduce(function (a, id) { return a + eb[id]; }, 0), seg = top.map(function (id, k) { return { n: cn(id), v: eb[id], c: PAL[k] }; });
      if (rest > 0) seg.push({ n: 'Lainnya', v: rest, c: PAL[5] });
      var acc0 = 0, stops = seg.map(function (s) { var a = acc0, b = acc0 + pc(s.v, exp); acc0 = b; return s.c + ' ' + a + '% ' + b + '%'; }).join(',');
      var donut = seg.length ? '<div class="fx-donut" style="--g:conic-gradient(' + stops + ')"><div><small>Total</small><b>' + short(exp) + '</b></div></div><ul class="fx-leg">' + seg.map(function (s) { return '<li><i style="background:' + s.c + '"></i><span>' + esc(s.n) + '</span><b>' + Math.round(pc(s.v, exp)) + '%</b></li>'; }).join('') + '</ul>' : '<div class="fx-none">Belum ada pengeluaran bulan ini. Catat transaksi pertama untuk melihat pembagiannya.</div>';

      /* arus kas */
      var flow = '<div class="fx-flow">' + months.map(function (x, k) { var on = x === m; return '<div class="' + (on ? 'on' : '') + '"><div class="fx-cols"><i class="in" style="height:' + Math.max(3, mi[k] / mx * 100) + '%"></i><i class="ex" style="height:' + Math.max(3, me[k] / mx * 100) + '%">' + (on ? '<u>' + short(me[k]) + '</u>' : '') + '</i></div><span>' + mlab(x) + '</span></div>'; }).join('') + '</div>';

      /* transaksi terbaru */
      var rec = D.tx.filter(function (t) { return t.type === 'Transfer' || scoped(t); }).sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 6);
      var feed = rec.length ? rec.map(function (t) {
        var tr = t.type === 'Transfer', nm = t.desc || (tr ? 'Transfer' : cn(t.catId));
        return '<div class="fx-tx" data-act="edit" data-e="tx" data-id="' + t.id + '"><i style="--h:' + hue(nm) + '">' + esc(nm.charAt(0).toUpperCase()) + '</i><div><b>' + esc(nm) + '</b><small>' + (tr ? esc(an(t.accId)) + ' → ' + esc(an(t.toAccId)) : esc(cn(t.catId)) + ' · ' + esc(an(t.accId))) + ' · ' + fd(t.date) + '</small></div><strong class="' + (tr ? '' : t.type === 'Income' ? 'pos' : 'neg') + '">' + (tr ? '' : t.type === 'Income' ? '+' : '−') + rp(t.amount) + '</strong></div>';
      }).join('') : '<div class="fx-none">Belum ada transaksi.</div>';

      var h = '<div class="ac-bar fx-bar"><div class="ac-chips" style="margin:0">' + ['Semua', 'Pribadi', 'Pekerjaan'].map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x === sc) + '" data-act="filt" data-f="sc" data-v="' + x + '">' + x + '</button>'; }).join('') + '</div><input type="month" data-in="m" value="' + m + '" style="width:auto" aria-label="Bulan"></div>';
      h += '<div class="fx-b">' +
        '<section class="fx-hero"><small>Total saldo · ' + act.length + ' akun aktif</small><b>' + rp(total) + '</b><p>' + (net < 0 ? '−' : '+') + rp(Math.abs(net)) + ' arus kas bersih ' + mfull(m) + '</p><div class="fx-hb"><button class="ac-btn" data-act="add" data-e="tx">Catat transaksi</button><button class="ac-btn" data-act="tab" data-t="acc">Kelola akun</button></div></section>' +
        '<section class="fx-t fx-in"><small>Pemasukan</small><b>' + rp(inc) + '</b>' + chip(chg(inc, incP), true) + '<span>pribadi ' + short(iPers) + ' · kerja ' + short(iWork) + '</span></section>' +
        '<section class="fx-t fx-out"><small>Pengeluaran</small><b>' + rp(exp) + '</b>' + chip(chg(exp, expP), false) + '<span>bulan lalu ' + short(expP) + '</span></section>' +
        '<section class="fx-p fx-w6"><h4>Arus kas 6 bulan<span><i class="in"></i>Masuk<i class="ex"></i>Keluar</span></h4>' + flow + '</section>' +
        '<section class="fx-p fx-w6"><h4>Pembagian pengeluaran<span>' + mfull(m) + '</span></h4><div class="fx-split">' + donut + '</div></section>' +
        '<section class="fx-p fx-w5"><h4>Anggaran<span>' + (bl.length ? 'sisa ' + rp(bLim - bSpent) : '') + '</span></h4>' + (bl.length ? bl.slice(0, 5).map(function (x) { return '<div class="fx-m"><div><b>' + esc(x.c.name) + '</b><small>' + rp(x.sp) + ' / ' + rp(x.b.limit) + '</small></div>' + meter(x.p) + '<em>' + Math.round(x.p) + '%</em></div>'; }).join('') : '<div class="fx-none">Belum ada anggaran bulan ini.</div>') + '</section>' +
        '<section class="fx-p fx-w5"><h4>Target tabungan<span>' + (gs.length ? Math.round(pc(gC, gT)) + '% terkumpul' : '') + '</span></h4>' + (gs.length ? gs.slice(0, 5).map(function (g) { var p = pc(collected(g), +g.target); return '<div class="fx-m"><div><b>' + esc(g.name) + '</b><small>' + rp(collected(g)) + ' / ' + rp(g.target) + '</small></div>' + meter(Math.min(p, 99.9)) + '<em>' + Math.round(p) + '%</em></div>'; }).join('') : '<div class="fx-none">Belum ada target aktif.</div>') + '</section>' +
        '<section class="fx-p fx-w12"><h4>Transaksi terbaru<button class="fx-lnk" data-act="tab" data-t="tx">Lihat semua</button></h4><div class="fx-feed">' + feed + '</div></section></div>';
      var qa = [['Berapa saldo yang kumiliki?', rp(total)], ['Berapa uang yang masuk bulan ini?', rp(inc) + ' (' + sc + ')'], ['Berapa uang yang keluar?', rp(exp) + ' (' + sc + ')'],
        ['Pengeluaran terbesar berasal dari mana?', ids.length ? esc(cn(ids[0])) + ' — ' + rp(eb[ids[0]]) + ' (' + Math.round(pc(eb[ids[0]], exp)) + '%)' : 'Belum ada pengeluaran'],
        ['Berapa anggaran yang tersisa?', bl.length ? rp(bLim - bSpent) + ' dari ' + rp(bLim) : 'Belum ada anggaran'],
        ['Berapa target tabunganku?', gs.length ? rp(gC) + ' dari ' + rp(gT) + ' (' + Math.round(pc(gC, gT)) + '%)' : 'Belum ada target aktif'],
        ['Apakah pengeluaranku meningkat?', expP > 0 ? (exp > expP ? 'Naik ' : exp < expP ? 'Turun ' : 'Sama ') + Math.abs(chg(exp, expP)) + '% dari ' + mfull(pm) : 'Belum ada pembanding']];
      h += '<details class="fx-qa"><summary>Jawaban cepat &amp; perbandingan bulanan</summary><div class="qa">' + qa.map(function (q) { return '<div><b>' + q[0] + '</b><br>' + q[1] + '</div>'; }).join('') + '</div>' +
        '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Bulan</th><th class="num">Pemasukan pribadi</th><th class="num">Pendapatan pekerjaan</th><th class="num">Pengeluaran</th><th class="num">Arus bersih</th></tr>' + months.slice().reverse().map(function (x) {
          var a = sum('Income', x, function (t) { return t.scope !== 'Pekerjaan'; }), b = sum('Income', x, function (t) { return t.scope === 'Pekerjaan'; }), e = sum('Expense', x, scoped), n = incSc(x) - e;
          return '<tr><td>' + mfull(x) + '</td><td class="num">' + rp(a) + '</td><td class="num">' + rp(b) + '</td><td class="num">' + rp(e) + '</td><td class="num ' + (n < 0 ? 'neg' : 'pos') + '">' + (n < 0 ? '−' : '') + rp(Math.abs(n)) + '</td></tr>'; }).join('') + '</table></div></details>';
      return h;
    }
    function vAcc() {
      var act = D.acc.filter(function (a) { return a.active; }), total = act.reduce(function (a, x) { return a + bal(x); }, 0);
      var h = bar('Saldo = saldo awal + pemasukan − pengeluaran ± transfer. Hanya akun aktif yang masuk total.', add('acc', 'Akun'));
      if (!D.acc.length) return h + empty('Belum ada akun. Tambahkan Cash, Bank, E-wallet, atau Tabungan.');
      return h + '<div class="ac-grid">' + stat(rp(total), 'Total saldo (akun aktif)') + stat(act.length, 'Akun aktif') + '</div><div class="fx-cards">' + D.acc.map(function (a) {
        var used = D.tx.some(function (t) { return t.accId === a.id || t.toAccId === a.id; });
        var k = Math.abs(a.name.split('').reduce(function (h, c) { return (h * 31 + c.charCodeAt(0)) | 0; }, 7)), v = bal(a);
        return '<article class="fx-card' + (a.active ? '' : ' off') + '" style="--h:' + (k % 360) + '"><div class="fx-ct"><span>' + esc(a.type) + '</span><i class="fx-chipic"></i></div><b class="' + (v < 0 ? 'neg' : '') + '">' + rp(v) + '</b><p>' + esc(a.name) + '</p><small>' + esc(a.currency || 'IDR') + ' · saldo awal ' + rp(a.opening) + ' · ' + (a.active ? 'Aktif' : 'Nonaktif') + '</small><div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="acc" data-id="' + a.id + '">Edit</button><button class="ac-btn sm" data-act="tgacc" data-id="' + a.id + '">' + (a.active ? 'Nonaktifkan' : 'Aktifkan') + '</button>' + (used ? '' : '<button class="ac-btn sm danger" data-act="del" data-e="acc" data-id="' + a.id + '">Hapus</button>') + '</div></article>';
      }).join('') + '</div>';
    }
    function vTx() {
      var q = (st.tq || '').toLowerCase(), m = ym();
      var L = D.tx.filter(function (t) { return (st.allm || t.date.slice(0, 7) === m) && (!st.tt || t.type === st.tt) && (!st.ta || t.accId === st.ta || t.toAccId === st.ta) && (!st.tc || t.catId === st.tc) && (!q || ((t.desc || '') + ' ' + (t.notes || '') + ' ' + cn(t.catId)).toLowerCase().indexOf(q) > -1); }).sort(function (a, b) { return b.date.localeCompare(a.date); });
      var i = 0, o = 0; L.forEach(function (t) { if (t.type === 'Income') i += +t.amount; if (t.type === 'Expense') o += +t.amount; });
      var h = bar('Klik baris untuk mengedit.', add('tx', 'Transaksi')) + '<div class="tb"><input type="text" data-in="tq" placeholder="Cari transaksi…" value="' + esc(st.tq || '') + '" style="width:min(240px,100%)" aria-label="Cari">' +
        (st.allm ? '' : '<input type="month" data-in="m" value="' + m + '" style="width:auto" aria-label="Bulan">') + '<button class="ac-chip" aria-pressed="' + !!st.allm + '" data-act="filt" data-f="allm" data-v="' + (st.allm ? '' : '1') + '">Semua bulan</button>' +
        sel('tt', 'Jenis', [['', 'Semua jenis'], ['Income', 'Income'], ['Expense', 'Expense'], ['Transfer', 'Transfer']], st.tt) + sel('ta', 'Akun', [['', 'Semua akun']].concat(D.acc.map(function (a) { return [a.id, a.name]; })), st.ta) + sel('tc', 'Kategori', [['', 'Semua kategori']].concat(D.cat.map(function (c) { return [c.id, c.name]; })), st.tc) + '</div>' +
        '<p class="ac-hint" style="margin-bottom:8px">' + L.length + ' transaksi · masuk <b class="pos">' + rp(i) + '</b> · keluar <b class="neg">' + rp(o) + '</b> (transfer tidak dihitung)</p>';
      if (!L.length) return h + empty('Tidak ada transaksi.');
      return h + '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Jumlah</th><th></th></tr>' + L.map(function (t) {
        var tr = t.type === 'Transfer', amt = tr ? '<span>' + rp(t.amount) + '</span>' : '<span class="' + (t.type === 'Income' ? 'pos' : 'neg') + '">' + (t.type === 'Income' ? '+' : '−') + rp(t.amount) + '</span>';
        return '<tr class="ac-click" data-act="edit" data-e="tx" data-id="' + t.id + '"><td>' + fd(t.date) + '</td><td><b>' + esc(t.desc || (tr ? 'Transfer' : cn(t.catId))) + '</b>' + (t.scope === 'Pekerjaan' && !tr ? badge('Pekerjaan') : '') + '<br><small style="opacity:.7">' + (tr ? esc(an(t.accId)) + ' → ' + esc(an(t.toAccId)) : esc(cn(t.catId)) + ' · ' + esc(an(t.accId))) + (t.method ? ' · ' + esc(t.method) : '') + (t.proof ? ' · bukti: ' + K.link(t.proof) : '') + '</small></td><td class="num">' + amt + '</td><td><button class="ac-btn sm danger" data-act="del" data-e="tx" data-id="' + t.id + '" aria-label="Hapus">×</button></td></tr>';
      }).join('') + '</table></div>';
    }
    function vCat() {
      var list = function (k) {
        return D.cat.filter(function (c) { return c.kind === k; }).map(function (c) {
          return '<div class="ac-item' + (c.archived ? ' done' : '') + '"><div><b>' + esc(c.name) + '</b>' + (c.archived ? badge('Arsip') : '') + '</div><div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="cat" data-id="' + c.id + '">Edit</button><button class="ac-btn sm" data-act="arc" data-id="' + c.id + '">' + (c.archived ? 'Aktifkan' : 'Arsipkan') + '</button><button class="ac-btn sm danger" data-act="del" data-e="cat" data-id="' + c.id + '">Hapus</button></div></div>';
        }).join('');
      };
      return bar('Tambah, ubah, atau arsipkan kategori sesuai kebutuhan. Kategori yang sudah dipakai tidak bisa dihapus, hanya diarsipkan.', add('cat', 'Kategori')) + '<div class="ac-h" style="margin-top:0">Pemasukan</div>' + list('Pemasukan') + '<div class="ac-h">Pengeluaran</div>' + list('Pengeluaran');
    }
    function vBud() {
      var m = ym(), eb = expBy(m), rows = [], L = 0, S = 0;
      D.cat.filter(function (c) { return c.kind === 'Pengeluaran'; }).forEach(function (c) { var b = budFor(c.id, m); if (b) { var sp = eb[c.id] || 0, lim = +b.limit || 0; rows.push({ c: c, b: b, sp: sp, lim: lim }); L += lim; S += sp; } });
      var h = bar('Terpakai dihitung otomatis dari transaksi Expense pada bulan terpilih. Transfer tidak dihitung.', add('bud', 'Anggaran')) + '<div class="tb"><input type="month" data-in="m" value="' + m + '" style="width:auto" aria-label="Bulan"></div>';
      if (!rows.length) return h + empty('Belum ada anggaran untuk ' + mfull(m) + '.');
      return h + '<div class="ac-grid">' + stat(rp(L), 'Total anggaran') + stat(rp(S), 'Terpakai') + stat('<span class="' + (L - S < 0 ? 'neg' : '') + '">' + (L - S < 0 ? '−' : '') + rp(Math.abs(L - S)) + '</span>', 'Sisa') + '</div><div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Kategori</th><th class="num">Anggaran</th><th class="num">Terpakai</th><th class="num">Sisa</th><th style="min-width:110px">Progres</th><th></th></tr>' + rows.map(function (x) {
        var p = pc(x.sp, x.lim);
        return '<tr class="ac-click" data-act="edit" data-e="bud" data-id="' + x.b.id + '"><td>' + esc(x.c.name) + (x.b.month ? '' : ' <small style="opacity:.6">(tiap bulan)</small>') + '</td><td class="num">' + rp(x.lim) + '</td><td class="num">' + rp(x.sp) + '</td><td class="num ' + (x.lim - x.sp < 0 ? 'neg' : '') + '">' + (x.lim - x.sp < 0 ? '−' : '') + rp(Math.abs(x.lim - x.sp)) + '</td><td>' + meter(p) + '<small>' + Math.round(p) + '%</small></td><td><button class="ac-btn sm danger" data-act="del" data-e="bud" data-id="' + x.b.id + '" aria-label="Hapus">×</button></td></tr>';
      }).join('') + '</table></div>';
    }
    function vGoal() {
      var h = bar('Kontribusi dicatat terpisah dan tidak mengubah saldo akun. Untuk memindahkan uang ke rekening tabungan, gunakan transaksi Transfer.', add('goal', 'Target'));
      if (!D.goal.length) return h + empty('Belum ada target tabungan.');
      return h + D.goal.map(function (g) {
        var c = collected(g), p = pc(c, +g.target), cs = D.con.filter(function (x) { return x.goalId === g.id; }).sort(function (a, b) { return b.date.localeCompare(a.date); }), left = g.date ? Math.round((new Date(g.date) - new Date(K.todayS())) / 864e5) : null, rem = Math.max(0, (+g.target) - c);
        return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(g.name) + badge(g.status, g.status === 'Tercapai' ? 'on' : '') + '</h3></div>' + btns('goal', g.id) + '</div>' + meter(Math.min(p, 99.9)) +
          '<div class="ac-meta"><span>Terkumpul: <b>' + rp(c) + '</b> / ' + rp(g.target) + ' (' + Math.round(p) + '%)</span><span>Kurang: <b>' + rp(rem) + '</b></span>' + (g.date ? '<span>Target: <b>' + fd(g.date) + '</b>' + (left != null ? ' (' + (left >= 0 ? left + ' hari lagi' : 'lewat ' + (-left) + ' hari') + ')' : '') + '</span>' : '') + (g.date && left > 0 && rem > 0 ? '<span>Perlu ± <b>' + rp(rem / Math.max(1, left / 30)) + '</b>/bulan</span>' : '') + '</div>' + (g.notes ? '<div class="ac-notes">' + esc(g.notes) + '</div>' : '') +
          cs.slice(0, 5).map(function (x) { return '<div class="ac-item" style="margin-bottom:6px"><div><small style="margin:0">' + fd(x.date) + ' · <b class="' + (x.amount < 0 ? 'neg' : 'pos') + '">' + (x.amount < 0 ? '−' : '+') + rp(Math.abs(x.amount)) + '</b>' + (x.notes ? ' · ' + esc(x.notes) : '') + '</small></div><div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="con" data-id="' + x.id + '">Edit</button><button class="ac-btn sm danger" data-act="del" data-e="con" data-id="' + x.id + '" aria-label="Hapus">×</button></div></div>'; }).join('') +
          '<button class="ac-btn sm" data-act="add" data-e="con" data-pk="goalId" data-pv="' + g.id + '">+ Kontribusi</button></article>';
      }).join('');
    }
    return {
      specs: specs, cascade: { goal: [['con', 'goalId']] },
      tabs: [['sum', 'Ringkasan', vSum], ['acc', 'Akun', vAcc], ['tx', 'Transaksi', vTx], ['cat', 'Kategori', vCat], ['bud', 'Anggaran', vBud], ['goal', 'Tabungan', vGoal]],
      sub: function () { return 'Mata uang utama: Rupiah (IDR) · ' + D.acc.length + ' akun'; },
      guard: function (e) {
        if (e === 'tx' && !D.acc.some(function (a) { return a.active; })) return ['Belum ada akun aktif', 'Tambahkan akun terlebih dahulu di tab Akun.'];
        if (e === 'con' && !D.goal.length) return ['Belum ada target', 'Buat target tabungan terlebih dahulu.'];
      },
      canDel: function (e, id) {
        if (e === 'acc' && D.tx.some(function (t) { return t.accId === id || t.toAccId === id; })) return 'Akun ini punya transaksi. Nonaktifkan saja.';
        if (e === 'cat' && (D.tx.some(function (t) { return t.catId === id; }) || D.bud.some(function (b) { return b.catId === id; }))) return 'Kategori ini sudah dipakai. Arsipkan saja.';
      },
      validate: function (e, r) {
        if (e === 'tx') {
          if (!(+r.amount > 0)) return 'Jumlah harus lebih dari 0.';
          if (r.type === 'Transfer') { if (!r.toAccId) return 'Pilih akun tujuan untuk transfer.'; if (r.toAccId === r.accId) return 'Akun asal dan tujuan tidak boleh sama.'; r.catId = ''; }
          else { var c = by(D.cat, r.catId); if (!c) return 'Pilih kategori.'; if (c.kind !== (r.type === 'Income' ? 'Pemasukan' : 'Pengeluaran')) return 'Kategori "' + c.name + '" bukan kategori ' + (r.type === 'Income' ? 'pemasukan' : 'pengeluaran') + '.'; r.toAccId = ''; }
          if (r.scope !== 'Pekerjaan') r.jobRef = '';
        }
        if (e === 'bud' && !(+r.limit > 0)) return 'Batas anggaran harus lebih dari 0.';
        if (e === 'goal' && !(+r.target > 0)) return 'Jumlah target harus lebih dari 0.';
        if (e === 'con' && !(+r.amount)) return 'Jumlah kontribusi tidak boleh 0.';
      },
      act: function (a, d) {
        if (a === 'tgacc') { var x = by(D.acc, d.id); x.active = !x.active; }
        if (a === 'arc') { var c = by(D.cat, d.id); c.archived = !c.archived; }
      }
    };
  });
  MO.routes['#finance'] = fin.open;
})();
