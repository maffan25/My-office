/* MyOffice — Work Office, Organization, Project Management (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice = window.MyOffice || {}; MO.routes = MO.routes || {};
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var has = function (v) { return v !== '' && v != null && !isNaN(+v); };
  var fmt = function (n) { return n == null ? '—' : String(Math.round(n * 10) / 10); };
  var rp = function (n) { return 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID'); };
  var fd = function (v) { if (!v) return '—'; var d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  var todayS = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var by = function (a, id) { return a.filter(function (x) { return x.id === id; })[0]; };
  var el = function (c, h) { var d = document.createElement('div'); d.className = c; d.innerHTML = h; return d; };
  var link = function (v) { return /^https?:\/\//i.test(v || '') ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\//i, '').slice(0, 40)) + '</a>' : esc(v || ''); };
  var btns = function (e, id) { return '<div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="' + e + '" data-id="' + id + '">Edit</button><button class="ac-btn sm danger" data-act="del" data-e="' + e + '" data-id="' + id + '">Hapus</button></div>'; };
  var empty = function (t) { return '<div class="ac-empty">' + t + '</div>'; };
  var bar = function (t, b) { return '<div class="ac-bar"><p class="ac-hint">' + t + '</p>' + (b || '') + '</div>'; };
  var add = function (e, label, pk, pv) { return '<button class="ac-btn pri" data-act="add" data-e="' + e + '"' + (pk ? ' data-pk="' + pk + '" data-pv="' + pv + '"' : '') + '>+ ' + label + '</button>'; };
  var chips = function (list, cur, f) { return '<div class="ac-chips">' + list.map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x === cur) + '" data-act="filt" data-f="' + f + '" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>'; };
  var prog = function (p) { return p == null ? '<small>Belum ada data</small>' : '<div class="ac-track"><i style="width:' + Math.min(100, p) + '%"></i></div>'; };
  var opt = function (a) { return a.map(function (x) { return [x, x]; }); };
  var stat = function (b, s) { return '<div class="ac-stat"><b>' + b + '</b><span>' + s + '</span></div>'; };
  var badge = function (t, c) { return '<span class="ac-badge ' + (c || '') + '">' + esc(t) + '</span>'; };

  /* ---------- Kerangka jendela generik ---------- */
  function App(title, key, seed, def) {
    var app = {}, D, ov, body, st = {};
    try { D = JSON.parse(localStorage.getItem(key)); } catch (e) { }
    D = D || seed(); app.D = D; app.st = st;
    var C = def(app), tab = C.tabs[0][0];
    var save = app.save = function () { try { localStorage.setItem(key, JSON.stringify(D)); } catch (e) { MO.msg('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } };

    function build() {
      ov = el('ac-ov', '<section class="ac-win" role="dialog" aria-modal="true" aria-label="' + title + '"><header><div><h2>' + title + '</h2><p></p></div><button class="ac-x" data-act="close" aria-label="Tutup">×</button></header>' +
        (C.tabs.length > 1 ? '<nav class="ac-tabs">' + C.tabs.map(function (t) { return '<button class="ac-tab" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</nav>' : '') + '<div class="ac-body"></div></section>');
      ov.hidden = true; document.body.appendChild(ov); body = ov.querySelector('.ac-body');
      ov.addEventListener('click', onClick);
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden && !document.querySelector('.ac-ov2, .ac-soon:not([hidden])')) close(); });
    }
    function open() { if (!ov) build(); ov.hidden = false; document.body.style.overflow = 'hidden'; render(); ov.querySelector('.ac-x').focus(); }
    function close() { if (ov) ov.hidden = true; document.body.style.overflow = ''; }
    function render() {
      C.tabs.forEach(function (t) { var b = ov.querySelector('[data-t="' + t[0] + '"]'); if (b) b.setAttribute('aria-selected', t[0] === tab); });
      ov.querySelector('header p').textContent = C.sub ? C.sub() : '';
      var top = body.scrollTop;
      body.innerHTML = C.tabs.filter(function (t) { return t[0] === tab; })[0][2]();
      body.scrollTop = top;
    }
    function fld(f, v) {
      var at = 'id="f_' + f.k + '" name="' + f.k + '"' + (f.req ? ' required' : ''), inp;
      if (f.t === 'textarea') inp = '<textarea ' + at + ' rows="3">' + esc(v) + '</textarea>';
      else if (f.t === 'select') { var o = typeof f.o === 'function' ? f.o(v) : f.o; inp = '<select ' + at + '>' + o.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>'; }
      else inp = '<input ' + at + ' type="' + f.t + '" value="' + esc(v) + '"' + (f.t === 'number' ? ' step="' + (f.step || 'any') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<label class="' + (f.full ? 'full' : '') + '"><span>' + f.l + (f.req ? ' *' : '') + '</span>' + inp + '</label>';
    }
    function form(ent, id, preset) {
      var sp = C.specs[ent], it = id ? by(D[ent], id) : Object.assign({}, sp.def, preset || {});
      if (!id && ent === 'log') it.date = todayS();
      var before = id ? JSON.parse(JSON.stringify(it)) : null;
      var m = el('ac-ov ac-ov2', '<form class="ac-win ac-form" novalidate><header><h2>' + (id ? 'Edit ' : 'Tambah ') + sp.title + '</h2><button type="button" class="ac-x" data-x aria-label="Tutup">×</button></header><div class="ac-fields">' +
        sp.fields.map(function (f) { var v = it[f.k]; if (f.bool) v = String(!!v); return fld(f, v == null ? '' : v); }).join('') + '</div><footer><button type="button" class="ac-btn" data-x>Batal</button><button class="ac-btn pri">Simpan</button></footer></form>');
      document.body.appendChild(m);
      var off = function () { m.remove(); };
      m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
      m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
      m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
      m.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target, bad = null, rec = id ? it : { id: uid() };
        sp.fields.forEach(function (fd2) {
          var inp = f.elements[fd2.k], v = inp.value.trim();
          if (fd2.req && !v && !bad) bad = inp;
          rec[fd2.k] = fd2.bool ? v === 'true' : fd2.t === 'number' ? (v === '' ? '' : +v) : v;
        });
        if (bad) { bad.focus(); if (bad.reportValidity) bad.reportValidity(); return; }
        if (!id) D[ent].push(rec);
        if (C.saved) C.saved(ent, rec, !id, before);
        save(); off(); render();
      });
      var first = m.querySelector('input,select,textarea'); if (first) first.focus();
    }
    function rm(ent, id) {
      ((C.cascade || {})[ent] || []).forEach(function (c) { D[c[0]].filter(function (x) { return x[c[1]] === id; }).forEach(function (x) { rm(c[0], x.id); }); });
      D[ent] = D[ent].filter(function (x) { return x.id !== id; });
    }
    function del(ent, id) {
      var it = by(D[ent], id); if (!it) return;
      if (!confirm('Hapus "' + (it.name || it.title || it.item || it.task || C.specs[ent].title) + '"?' + ((C.cascade || {})[ent] ? ' Data turunannya ikut terhapus.' : ''))) return;
      rm(ent, id); if (st.proj === id) st.proj = null; save(); render();
    }
    function onClick(e) {
      var b = e.target.closest('[data-act]'); if (!b || !ov.contains(b)) return;
      var a = b.dataset.act, d = b.dataset;
      if (a === 'close') return close();
      if (a === 'tab') { tab = d.t; return render(); }
      if (a === 'add') {
        var g = C.guard && C.guard(d.e); if (g) return MO.msg(g[0], g[1]);
        var pre = {}; if (d.pk) pre[d.pk] = d.pv; return form(d.e, null, pre);
      }
      if (a === 'edit') return form(d.e, d.id);
      if (a === 'del') return del(d.e, d.id);
      if (a === 'filt') { st[d.f] = d.v; return render(); }
      if (C.act) C.act(a, d, e.target);
      save(); render();
    }
    return { open: open };
  }

  /* =====================================================
     WORK OFFICE
     ===================================================== */
  var work = App('Work Office', 'mo-work-v1', function () { return { client: [], job: [], wtask: [], log: [], wdoc: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var JS = ['Prospek', 'Berjalan', 'Review', 'Selesai', 'Dibatalkan'], IS = ['Tidak relevan', 'Belum ditagih', 'Sudah ditagih', 'Sudah diterima'], TS = ['Belum dikerjakan', 'Sedang dikerjakan', 'Selesai'];
    var DT = ['Kontrak', 'Invoice', 'Brief', 'Deliverable', 'Lainnya'];
    var jobOpts = function () { return [['', '— Pilih pekerjaan —']].concat(D.job.map(function (j) { return [j.id, j.title]; })); };
    var jn = function (id) { var j = by(D.job, id); return j ? j.title : '—'; };
    var cn = function (id) { var c = by(D.client, id); return c ? c.name : 'Tanpa klien'; };
    var hrs = function (id) { return D.log.filter(function (l) { return l.jobId === id; }).reduce(function (a, l) { return a + (+l.hours || 0); }, 0); };
    var jp = function (id) { var t = D.wtask.filter(function (x) { return x.jobId === id; }); return t.length ? t.filter(function (x) { return x.status === 'Selesai'; }).length / t.length * 100 : null; };
    var specs = {
      client: { title: 'Klien', def: {}, fields: [{ k: 'name', l: 'Nama klien / pemberi kerja', t: 'text', req: 1, full: 1 }, { k: 'contact', l: 'Kontak (email / telepon)', t: 'text', full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      job: { title: 'Pekerjaan', def: { status: 'Berjalan', incomeStatus: 'Tidak relevan' }, fields: [
        { k: 'title', l: 'Nama pekerjaan / proyek', t: 'text', req: 1, full: 1 },
        { k: 'clientId', l: 'Klien', t: 'select', o: function () { return [['', '— Internal / tanpa klien —']].concat(D.client.map(function (c) { return [c.id, c.name]; })); } },
        { k: 'status', l: 'Status', t: 'select', o: opt(JS) },
        { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'deadline', l: 'Tenggat waktu', t: 'date' }, { k: 'estHours', l: 'Estimasi durasi (jam)', t: 'number', min: 0, step: '0.25' },
        { k: 'income', l: 'Pendapatan pekerjaan (Rp)', t: 'number', min: 0 }, { k: 'incomeStatus', l: 'Status pendapatan', t: 'select', o: opt(IS) },
        { k: 'txRef', l: 'Referensi transaksi keuangan (opsional)', t: 'text', full: 1, ph: 'ID/nomor transaksi di modul Finance nanti' },
        { k: 'notes', l: 'Catatan pekerjaan', t: 'textarea', full: 1 }] },
      wtask: { title: 'Tugas', def: { status: 'Belum dikerjakan' }, fields: [
        { k: 'title', l: 'Daftar tugas — judul', t: 'text', req: 1, full: 1 }, { k: 'jobId', l: 'Pekerjaan', t: 'select', o: jobOpts, req: 1 }, { k: 'status', l: 'Status', t: 'select', o: opt(TS) },
        { k: 'deadline', l: 'Tenggat waktu', t: 'date' }, { k: 'estHours', l: 'Estimasi (jam)', t: 'number', min: 0, step: '0.25' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      log: { title: 'Jam Kerja', def: {}, fields: [
        { k: 'jobId', l: 'Pekerjaan', t: 'select', o: jobOpts, req: 1, full: 1 }, { k: 'date', l: 'Tanggal', t: 'date', req: 1 }, { k: 'hours', l: 'Durasi (jam)', t: 'number', req: 1, min: 0, step: '0.25' }, { k: 'notes', l: 'Catatan', t: 'text', full: 1 }] },
      wdoc: { title: 'Dokumen', def: { type: 'Lainnya' }, fields: [
        { k: 'title', l: 'Nama dokumen', t: 'text', req: 1, full: 1 }, { k: 'jobId', l: 'Pekerjaan', t: 'select', o: jobOpts }, { k: 'type', l: 'Jenis', t: 'select', o: opt(DT) },
        { k: 'link', l: 'Tautan / lampiran', t: 'url', full: 1, ph: 'https://…' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] }
    };
    var tabs = [
      ['client', 'Klien', function () {
        return bar('Daftar klien dan pemberi kerja.', add('client', 'Klien')) + (D.client.length ? D.client.map(function (c) {
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(c.name) + '</h3><small style="opacity:.7">' + esc(c.contact || '') + '</small></div>' + btns('client', c.id) + '</div><div class="ac-meta"><span>Pekerjaan: <b>' + D.job.filter(function (j) { return j.clientId === c.id; }).length + '</b></span></div>' + (c.notes ? '<div class="ac-notes">' + esc(c.notes) + '</div>' : '') + '</article>';
        }).join('') : empty('Belum ada klien.'));
      }],
      ['job', 'Pekerjaan', function () {
        var L = D.job.filter(function (j) { return !st.js || st.js === 'Semua' || j.status === st.js; }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
        var h = bar('Progres dihitung dari tugas yang benar-benar selesai.', add('job', 'Pekerjaan')) + chips(['Semua'].concat(JS), st.js || 'Semua', 'js');
        if (!L.length) return h + empty('Belum ada pekerjaan.');
        return h + L.map(function (j) {
          var p = jp(j.id), tn = D.wtask.filter(function (x) { return x.jobId === j.id; }), late = j.deadline && j.deadline < todayS() && j.status !== 'Selesai' && j.status !== 'Dibatalkan', a = hrs(j.id);
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(j.title) + badge(j.status, j.status === 'Selesai' ? 'on' : '') + (late ? badge('Lewat tenggat', 'late') : '') + '</h3><small style="opacity:.7">' + esc(cn(j.clientId)) + '</small></div>' + btns('job', j.id) + '</div>' +
            '<div class="ac-meta"><span>Tenggat: <b>' + fd(j.deadline) + '</b></span><span>Jam: <b>' + fmt(a) + ' / ' + (has(j.estHours) ? fmt(+j.estHours) : '—') + '</b> (aktual / estimasi)</span>' + (+j.income > 0 && j.incomeStatus !== 'Tidak relevan' ? '<span>Pendapatan pekerjaan: <b>' + rp(j.income) + '</b> · ' + esc(j.incomeStatus) + '</span>' : '') + '</div>' +
            prog(p) + (p != null ? '<small>' + tn.filter(function (x) { return x.status === 'Selesai'; }).length + ' dari ' + tn.length + ' tugas selesai (' + fmt(p) + '%)</small>' : '') +
            (j.desc ? '<div class="ac-notes">' + esc(j.desc) + '</div>' : '') + (j.notes ? '<div class="ac-notes">Catatan: ' + esc(j.notes) + '</div>' : '') +
            '<div style="margin-top:8px"><button class="ac-btn sm" data-act="add" data-e="wtask" data-pk="jobId" data-pv="' + j.id + '">+ Tugas</button> <button class="ac-btn sm" data-act="add" data-e="log" data-pk="jobId" data-pv="' + j.id + '">+ Jam kerja</button></div></article>';
        }).join('');
      }],
      ['task', 'Tugas', function () {
        var L = D.wtask.filter(function (t) { return !st.ts || st.ts === 'Semua' || t.status === st.ts; }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
        var h = bar('Centang untuk menandai selesai.', add('wtask', 'Tugas')) + chips(['Semua'].concat(TS), st.ts || 'Semua', 'ts');
        if (!L.length) return h + empty('Belum ada tugas.');
        return h + L.map(function (t) {
          var late = t.deadline && t.deadline < todayS() && t.status !== 'Selesai';
          return '<div class="ac-item' + (t.status === 'Selesai' ? ' done' : '') + '"><input type="checkbox" data-act="tgw" data-id="' + t.id + '"' + (t.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div><button class="t" data-act="edit" data-e="wtask" data-id="' + t.id + '">' + esc(t.title) + '</button>' + (late ? badge('Terlambat', 'late') : '') +
            '<small>' + esc(jn(t.jobId)) + ' · Tenggat: ' + fd(t.deadline) + ' · Estimasi: ' + (has(t.estHours) ? t.estHours + ' jam' : '—') + ' · ' + esc(t.status) + '</small>' + (t.notes ? '<small>' + esc(t.notes) + '</small>' : '') + '</div>' + btns('wtask', t.id) + '</div>';
        }).join('');
      }],
      ['log', 'Jam Kerja', function () {
        var tot = D.log.reduce(function (a, l) { return a + (+l.hours || 0); }, 0), h = bar('Catat jam kerja aktual dan bandingkan dengan estimasi.', add('log', 'Jam kerja'));
        if (!D.log.length) return h + empty('Belum ada catatan jam kerja.');
        h += '<div class="ac-grid">' + stat(fmt(tot), 'Total jam tercatat') + stat(D.job.filter(function (j) { return hrs(j.id) > 0; }).length, 'Pekerjaan dengan jam tercatat') + '</div><div class="ac-bars">';
        D.job.filter(function (j) { return hrs(j.id) > 0; }).forEach(function (j) {
          var a = hrs(j.id), e = +j.estHours || 0, mx = Math.max(a, e, 1);
          h += '<div class="ac-bar2"><span>' + esc(j.title) + '</span><div class="ac-pair"><div class="ac-track"><i style="width:' + a / mx * 100 + '%"></i></div>' + (e ? '<div class="ac-track"><i class="alt" style="width:' + e / mx * 100 + '%"></i></div>' : '') + '</div><span>' + fmt(a) + ' / ' + (e ? fmt(e) : '—') + ' jam</span></div>';
        });
        h += '</div><div class="ac-legend" style="margin-top:8px"><span><i></i>Aktual</span><span><i class="alt"></i>Estimasi</span></div><div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Tanggal</th><th>Pekerjaan</th><th>Jam</th><th>Catatan</th><th></th></tr>' +
          D.log.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function (l) { return '<tr><td>' + fd(l.date) + '</td><td>' + esc(jn(l.jobId)) + '</td><td>' + l.hours + '</td><td>' + esc(l.notes || '') + '</td><td>' + '<button class="ac-btn sm" data-act="edit" data-e="log" data-id="' + l.id + '">Edit</button> <button class="ac-btn sm danger" data-act="del" data-e="log" data-id="' + l.id + '">Hapus</button></td></tr>'; }).join('') + '</table></div>';
        return h;
      }],
      ['doc', 'Dokumen', function () {
        var L = D.wdoc.filter(function (d) { return !st.dt || st.dt === 'Semua' || d.type === st.dt; }), h = bar('Dokumen pendukung pekerjaan.', add('wdoc', 'Dokumen')) + chips(['Semua'].concat(DT), st.dt || 'Semua', 'dt');
        if (!L.length) return h + empty('Belum ada dokumen.');
        return h + L.map(function (d) { return '<div class="ac-item"><div><b>' + esc(d.title) + '</b>' + badge(d.type) + '<small>' + esc(jn(d.jobId)) + (d.link ? ' · ' + link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' + btns('wdoc', d.id) + '</div>'; }).join('');
      }],
      ['inc', 'Pendapatan', function () {
        var js = D.job.filter(function (j) { return +j.income > 0 && j.incomeStatus !== 'Tidak relevan'; });
        var sum = function (s) { return js.filter(function (j) { return j.incomeStatus === s; }).reduce(function (a, j) { return a + +j.income; }, 0); };
        return '<div class="ac-warn" style="border-color:rgba(127,140,170,.5);background:rgba(127,140,170,.1)"><span><b>Dipisahkan dari pemasukan pribadi.</b> Angka di sini hanya pendapatan pekerjaan. Tidak ada yang otomatis masuk ke pemasukan pribadi; hubungan ke modul keuangan nanti lewat referensi transaksi per pekerjaan.</span></div>' +
          '<div class="ac-grid">' + stat(rp(sum('Sudah diterima')), 'Sudah diterima') + stat(rp(sum('Sudah ditagih')), 'Sudah ditagih, belum diterima') + stat(rp(sum('Belum ditagih')), 'Belum ditagih') + '</div>' +
          (js.length ? '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Pekerjaan</th><th>Klien</th><th>Jumlah</th><th>Status</th><th>Ref. transaksi</th></tr>' + js.map(function (j) { return '<tr class="ac-click" data-act="edit" data-e="job" data-id="' + j.id + '"><td>' + esc(j.title) + '</td><td>' + esc(cn(j.clientId)) + '</td><td>' + rp(j.income) + '</td><td>' + esc(j.incomeStatus) + '</td><td>' + esc(j.txRef || '—') + '</td></tr>'; }).join('') + '</table></div>' : empty('Belum ada pekerjaan dengan pendapatan. Isi di form Pekerjaan.'));
      }]
    ];
    return {
      specs: specs, tabs: tabs, sub: function () { return 'Pendapatan pekerjaan terpisah dari pemasukan pribadi'; },
      cascade: { client: [], job: [['wtask', 'jobId'], ['log', 'jobId'], ['wdoc', 'jobId']] },
      guard: function (e) { if (['wtask', 'log'].indexOf(e) > -1 && !D.job.length) return ['Belum ada pekerjaan', 'Tambahkan pekerjaan terlebih dahulu.']; },
      act: function (a, d, t) { if (a === 'tgw') { var x = by(D.wtask, d.id); x.status = t.checked ? 'Selesai' : 'Belum dikerjakan'; } }
    };
  });

  /* =====================================================
     ORGANIZATION
     ===================================================== */
  var org = App('Organization', 'mo-org-v1', function () { return { org: [], meeting: [], followup: [], budget: [], odoc: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var FS = ['Belum', 'Berjalan', 'Selesai'], OD = ['Proposal', 'Notulen', 'Laporan pertanggungjawaban', 'Surat', 'Materi presentasi', 'Dokumen lainnya'];
    var orgOpts = function () { return [['', '— Pilih organisasi —']].concat(D.org.map(function (o) { return [o.id, o.name]; })); };
    var on = function (id) { var o = by(D.org, id); return o ? o.name : '—'; };
    var specs = {
      org: { title: 'Organisasi', def: {}, fields: [{ k: 'name', l: 'Nama organisasi', t: 'text', req: 1, full: 1 }, { k: 'period', l: 'Periode kepengurusan', t: 'text', ph: '2025–2026' }, { k: 'role', l: 'Jabatan saya', t: 'text' }, { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      meeting: { title: 'Rapat', def: {}, fields: [{ k: 'title', l: 'Nama rapat', t: 'text', req: 1, full: 1 }, { k: 'orgId', l: 'Organisasi', t: 'select', o: orgOpts, req: 1 }, { k: 'date', l: 'Tanggal rapat', t: 'date', req: 1 }, { k: 'agenda', l: 'Agenda', t: 'textarea', full: 1 }, { k: 'notes', l: 'Catatan rapat', t: 'textarea', full: 1 }, { k: 'decisions', l: 'Keputusan', t: 'textarea', full: 1 }] },
      followup: { title: 'Tindak Lanjut', def: { status: 'Belum' }, fields: [{ k: 'task', l: 'Tindak lanjut', t: 'text', req: 1, full: 1 }, { k: 'meetingId', l: 'Rapat', t: 'select', req: 1, o: function () { return [['', '— Pilih rapat —']].concat(D.meeting.map(function (m) { return [m.id, m.title + ' (' + fd(m.date) + ')']; })); }, full: 1 }, { k: 'pic', l: 'Penanggung jawab', t: 'text' }, { k: 'due', l: 'Tenggat', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: opt(FS) }] },
      budget: { title: 'Pos Anggaran', def: {}, fields: [{ k: 'item', l: 'Pos / keterangan anggaran', t: 'text', req: 1, full: 1 }, { k: 'orgId', l: 'Organisasi', t: 'select', o: orgOpts, req: 1 }, { k: 'date', l: 'Tanggal', t: 'date' }, { k: 'planned', l: 'Rencana anggaran (Rp)', t: 'number', min: 0 }, { k: 'actual', l: 'Pengeluaran aktual (Rp)', t: 'number', min: 0 }, { k: 'proof', l: 'Catatan bukti transaksi', t: 'textarea', full: 1 }, { k: 'link', l: 'Tautan bukti', t: 'url', full: 1 }] },
      odoc: { title: 'Dokumen', def: { type: 'Proposal' }, fields: [{ k: 'title', l: 'Judul dokumen', t: 'text', req: 1, full: 1 }, { k: 'orgId', l: 'Organisasi', t: 'select', o: orgOpts, req: 1 }, { k: 'type', l: 'Jenis', t: 'select', o: opt(OD), req: 1 }, { k: 'date', l: 'Tanggal', t: 'date' }, { k: 'link', l: 'Tautan / lampiran', t: 'url', ph: 'https://…' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] }
    };
    var tabs = [
      ['org', 'Profil', function () {
        return bar('Profil organisasi yang Anda ikuti.', add('org', 'Organisasi')) + (D.org.length ? D.org.map(function (o) {
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(o.name) + '</h3></div>' + btns('org', o.id) + '</div><div class="ac-meta"><span>Periode: <b>' + esc(o.period || '—') + '</b></span><span>Jabatan: <b>' + esc(o.role || '—') + '</b></span><span>Rapat: <b>' + D.meeting.filter(function (m) { return m.orgId === o.id; }).length + '</b></span><span>Dokumen: <b>' + D.odoc.filter(function (m) { return m.orgId === o.id; }).length + '</b></span></div>' + (o.desc ? '<div class="ac-notes">' + esc(o.desc) + '</div>' : '') + (o.notes ? '<div class="ac-notes">Catatan: ' + esc(o.notes) + '</div>' : '') + '</article>';
        }).join('') : empty('Belum ada organisasi.'));
      }],
      ['meet', 'Rapat', function () {
        var h = bar('Agenda, catatan, keputusan, dan tindak lanjut beserta penanggung jawabnya.', add('meeting', 'Rapat'));
        if (!D.meeting.length) return h + empty('Belum ada rapat.');
        return h + D.meeting.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function (m) {
          var fs = D.followup.filter(function (f) { return f.meetingId === m.id; });
          return '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(m.title) + '</h3><small style="opacity:.7">' + esc(on(m.orgId)) + ' · ' + fd(m.date) + '</small></div>' + btns('meeting', m.id) + '</div>' +
            (m.agenda ? '<div class="ac-notes"><b>Agenda</b>\n' + esc(m.agenda) + '</div>' : '') + (m.notes ? '<div class="ac-notes"><b>Catatan</b>\n' + esc(m.notes) + '</div>' : '') + (m.decisions ? '<div class="ac-notes"><b>Keputusan</b>\n' + esc(m.decisions) + '</div>' : '') +
            fs.map(function (f) { return '<div class="ac-item' + (f.status === 'Selesai' ? ' done' : '') + '" style="margin-bottom:6px"><input type="checkbox" data-act="tgf" data-id="' + f.id + '"' + (f.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div><button class="t" data-act="edit" data-e="followup" data-id="' + f.id + '">' + esc(f.task) + '</button><small>PJ: ' + esc(f.pic || '—') + ' · Tenggat: ' + fd(f.due) + ' · ' + esc(f.status) + '</small></div><button class="ac-btn sm danger" data-act="del" data-e="followup" data-id="' + f.id + '">×</button></div>'; }).join('') +
            '<button class="ac-btn sm" data-act="add" data-e="followup" data-pk="meetingId" data-pv="' + m.id + '">+ Tindak lanjut</button></article>';
        }).join('');
      }],
      ['bud', 'Anggaran', function () {
        var h = bar('Selisih = rencana − aktual. Anggaran organisasi tidak tercampur dengan keuangan pribadi.', add('budget', 'Pos anggaran'));
        if (!D.budget.length) return h + empty('Belum ada pos anggaran.');
        return h + D.org.filter(function (o) { return D.budget.some(function (b) { return b.orgId === o.id; }); }).map(function (o) {
          var bs = D.budget.filter(function (b) { return b.orgId === o.id; }), P = 0, A = 0;
          bs.forEach(function (b) { P += +b.planned || 0; A += +b.actual || 0; });
          var diff = function (x) { return '<b style="color:' + (x < 0 ? '#d0443e' : 'inherit') + '">' + (x < 0 ? '−' : '') + rp(Math.abs(x)) + '</b>'; };
          return '<article class="ac-card"><h3>' + esc(o.name) + '</h3><div class="ac-meta"><span>Rencana: <b>' + rp(P) + '</b></span><span>Aktual: <b>' + rp(A) + '</b></span><span>Selisih: ' + diff(P - A) + (P - A < 0 ? ' (melebihi anggaran)' : ' (sisa)') + '</span></div>' +
            '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Pos</th><th>Rencana</th><th>Aktual</th><th>Selisih</th><th>Bukti</th></tr>' + bs.map(function (b) { return '<tr class="ac-click" data-act="edit" data-e="budget" data-id="' + b.id + '"><td>' + esc(b.item) + '</td><td>' + rp(b.planned) + '</td><td>' + rp(b.actual) + '</td><td>' + diff((+b.planned || 0) - (+b.actual || 0)) + '</td><td>' + esc(b.proof || '') + (b.link ? ' ' + link(b.link) : '') + '</td></tr>'; }).join('') + '</table></div></article>';
        }).join('');
      }],
      ['doc', 'Dokumen', function () {
        var L = D.odoc.filter(function (d) { return !st.od || st.od === 'Semua' || d.type === st.od; }), h = bar('Proposal, notulen, LPJ, surat, materi presentasi, dan dokumen lain.', add('odoc', 'Dokumen')) + chips(['Semua'].concat(OD), st.od || 'Semua', 'od');
        if (!L.length) return h + empty('Belum ada dokumen.');
        return h + L.map(function (d) { return '<div class="ac-item"><div><b>' + esc(d.title) + '</b>' + badge(d.type) + '<small>' + esc(on(d.orgId)) + ' · ' + fd(d.date) + (d.link ? ' · ' + link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' + btns('odoc', d.id) + '</div>'; }).join('');
      }]
    ];
    return {
      specs: specs, tabs: tabs, sub: function () { return D.org.length ? D.org.map(function (o) { return o.name; }).join(' · ') : 'Belum ada organisasi'; },
      cascade: { org: [['meeting', 'orgId'], ['budget', 'orgId'], ['odoc', 'orgId']], meeting: [['followup', 'meetingId']] },
      guard: function (e) {
        if (['meeting', 'budget', 'odoc'].indexOf(e) > -1 && !D.org.length) return ['Belum ada organisasi', 'Tambahkan profil organisasi terlebih dahulu.'];
        if (e === 'followup' && !D.meeting.length) return ['Belum ada rapat', 'Tambahkan rapat terlebih dahulu.'];
      },
      act: function (a, d, t) { if (a === 'tgf') { by(D.followup, d.id).status = t.checked ? 'Selesai' : 'Belum'; } }
    };
  });

  /* =====================================================
     PROJECT MANAGEMENT
     ===================================================== */
  var proj = App('Project Management', 'mo-proj-v1', function () { return { proj: [], ptask: [], ms: [], pfile: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var AREAS = ['Akademik', 'Pekerjaan', 'Organisasi', 'Pribadi'], PS = ['Rencana', 'Berjalan', 'Ditunda', 'Selesai', 'Dibatalkan'], TS = ['Belum', 'Dikerjakan', 'Selesai'];
    var PV = [['overview', 'Project Overview'], ['board', 'Task Board'], ['timeline', 'Timeline'], ['ms', 'Milestones'], ['files', 'Files & Notes'], ['ana', 'Progress Analytics']];
    var projOpts = function () { return [['', '— Pilih proyek —']].concat(D.proj.map(function (p) { return [p.id, p.name]; })); };
    var log = function (id, m) { var p = by(D.proj, id); if (p) { p.hist = p.hist || []; p.hist.unshift({ t: new Date().toISOString(), m: m }); p.hist = p.hist.slice(0, 100); } };
    var tasksOf = function (id) { return D.ptask.filter(function (t) { return t.projId === id; }); };
    var msOf = function (id) { return D.ms.filter(function (t) { return t.projId === id; }); };
    function pp(p) {
      var ms = p.basis === 'ms', a = ms ? msOf(p.id) : tasksOf(p.id), dn = a.filter(function (x) { return ms ? x.done : x.status === 'Selesai'; }).length;
      return { n: a.length, done: dn, pct: a.length ? dn / a.length * 100 : null, unit: ms ? 'milestone' : 'tugas' };
    }
    var specs = {
      proj: { title: 'Proyek', def: { area: 'Pribadi', status: 'Rencana', priority: 'Sedang', basis: 'tasks' }, fields: [
        { k: 'name', l: 'Nama proyek', t: 'text', req: 1, full: 1 }, { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'area', l: 'Area', t: 'select', o: opt(AREAS) }, { k: 'status', l: 'Status', t: 'select', o: opt(PS) }, { k: 'priority', l: 'Prioritas', t: 'select', o: opt(['Rendah', 'Sedang', 'Tinggi']) },
        { k: 'basis', l: 'Progres dihitung dari', t: 'select', o: [['tasks', 'Tugas yang selesai'], ['ms', 'Milestone yang selesai']] },
        { k: 'start', l: 'Tanggal mulai', t: 'date' }, { k: 'target', l: 'Target selesai', t: 'date' }, { k: 'budget', l: 'Anggaran (Rp, jika perlu)', t: 'number', min: 0, full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      ptask: { title: 'Tugas', def: { status: 'Belum' }, fields: [{ k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 }, { k: 'projId', l: 'Proyek', t: 'select', o: projOpts, req: 1 }, { k: 'status', l: 'Status', t: 'select', o: opt(TS) }, { k: 'due', l: 'Tenggat', t: 'date' }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      ms: { title: 'Milestone', def: { done: false }, fields: [{ k: 'title', l: 'Milestone', t: 'text', req: 1, full: 1 }, { k: 'projId', l: 'Proyek', t: 'select', o: projOpts, req: 1 }, { k: 'date', l: 'Tanggal target', t: 'date' }, { k: 'done', l: 'Status', t: 'select', bool: 1, o: [['false', 'Belum tercapai'], ['true', 'Tercapai']] }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      pfile: { title: 'Dokumen / Catatan', def: { kind: 'Dokumen' }, fields: [{ k: 'title', l: 'Judul', t: 'text', req: 1, full: 1 }, { k: 'projId', l: 'Proyek', t: 'select', o: projOpts, req: 1 }, { k: 'kind', l: 'Jenis', t: 'select', o: opt(['Dokumen', 'Catatan']) }, { k: 'link', l: 'Tautan dokumen', t: 'url', full: 1, ph: 'https://…' }, { k: 'text', l: 'Isi catatan', t: 'textarea', full: 1 }] }
    };

    function list() {
      var ar = st.pa || 'Semua', L = D.proj.filter(function (p) { return ar === 'Semua' || p.area === ar; });
      var h = bar('Proyek dari akademik, pekerjaan, organisasi, atau pribadi. Progres hanya dihitung dari tugas/milestone yang benar-benar selesai.', add('proj', 'Proyek')) + chips(['Semua'].concat(AREAS), ar, 'pa');
      if (!L.length) return h + empty('Belum ada proyek.');
      return h + L.map(function (p) {
        var g = pp(p);
        return '<article class="ac-card"><div class="ac-row"><div><h3><button class="t" style="font-size:15px;font-weight:500;background:none;border:0;color:inherit;cursor:pointer;font-family:inherit;padding:0" data-act="openp" data-id="' + p.id + '">' + esc(p.name) + '</button>' + badge(p.area) + badge(p.status, p.status === 'Selesai' ? 'on' : '') + badge(p.priority, p.priority === 'Tinggi' ? 'hi' : p.priority === 'Sedang' ? 'mid' : '') + '</h3></div><button class="ac-btn sm" data-act="openp" data-id="' + p.id + '">Buka</button></div>' +
          '<div class="ac-meta"><span>Mulai: <b>' + fd(p.start) + '</b></span><span>Target: <b>' + fd(p.target) + '</b></span></div>' + prog(g.pct) + '<small>' + (g.pct == null ? 'Belum ada ' + g.unit + ' — progres belum bisa dihitung' : g.done + ' dari ' + g.n + ' ' + g.unit + ' selesai (' + fmt(g.pct) + '%)') + '</small></article>';
      }).join('');
    }
    function detail(p) {
      var v = st.pv || 'overview';
      var h = '<button class="ac-btn sm ac-back" data-act="openp" data-id="">← Semua proyek</button><div class="ac-row" style="margin-bottom:10px"><h3 style="font-family:var(--serif);font-weight:400;font-size:22px">' + esc(p.name) + '</h3>' + btns('proj', p.id) + '</div>' +
        '<div class="ac-chips">' + PV.map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x[0] === v) + '" data-act="pv" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      return h + ({ overview: vOv, board: vBoard, timeline: vTL, ms: vMs, files: vFiles, ana: vAna })[v](p);
    }
    function vOv(p) {
      var g = pp(p), nm = msOf(p.id).filter(function (m) { return !m.done && m.date; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
      return '<div class="ac-grid">' + stat(g.pct == null ? '—' : fmt(g.pct) + '%', 'Progres (' + g.unit + ' selesai)') + stat(tasksOf(p.id).length, 'Tugas') + stat(msOf(p.id).length, 'Milestone') + stat(has(p.budget) ? rp(p.budget) : '—', 'Anggaran') + '</div>' +
        prog(g.pct) + '<small>' + (g.pct == null ? 'Tambahkan ' + g.unit + ' agar progres bisa dihitung.' : g.done + ' dari ' + g.n + ' ' + g.unit + ' selesai') + '</small>' +
        '<div class="ac-meta" style="margin-top:14px"><span>Area: <b>' + esc(p.area) + '</b></span><span>Status: <b>' + esc(p.status) + '</b></span><span>Prioritas: <b>' + esc(p.priority) + '</b></span><span>Mulai: <b>' + fd(p.start) + '</b></span><span>Target: <b>' + fd(p.target) + '</b></span>' + (nm ? '<span>Milestone berikutnya: <b>' + esc(nm.title) + ' (' + fd(nm.date) + ')</b></span>' : '') + '</div>' +
        (p.desc ? '<div class="ac-notes">' + esc(p.desc) + '</div>' : '') + (p.notes ? '<div class="ac-notes"><b>Catatan</b>\n' + esc(p.notes) + '</div>' : '') +
        '<div class="ac-h">Riwayat perubahan</div>' + ((p.hist || []).length ? '<div class="ac-tblwrap"><table class="ac-tbl">' + p.hist.slice(0, 30).map(function (x) { return '<tr><td style="white-space:nowrap;opacity:.7">' + new Date(x.t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</td><td>' + esc(x.m) + '</td></tr>'; }).join('') + '</table></div>' : '<p class="ac-hint">Belum ada riwayat.</p>');
    }
    function vBoard(p) {
      var T = tasksOf(p.id);
      return bar('Pindahkan tugas dengan tombol panah. Tugas di kolom "Selesai" menambah progres.', add('ptask', 'Tugas', 'projId', p.id)) + '<div class="kb">' + TS.map(function (s, i) {
        return '<div><h4>' + (s === 'Belum' ? 'Belum dikerjakan' : s === 'Dikerjakan' ? 'Sedang dikerjakan' : 'Selesai') + ' · ' + T.filter(function (t) { return t.status === s; }).length + '</h4>' + T.filter(function (t) { return t.status === s; }).map(function (t) {
          var late = t.due && t.due < todayS() && s !== 'Selesai';
          return '<div class="kc"><button class="t" data-act="edit" data-e="ptask" data-id="' + t.id + '">' + esc(t.title) + '</button><small>' + (t.due ? 'Tenggat ' + fd(t.due) : 'Tanpa tenggat') + (late ? ' · <b style="color:#d0443e">terlambat</b>' : '') + '</small><div class="ac-acts">' +
            (i > 0 ? '<button class="ac-btn sm" data-act="mv" data-id="' + t.id + '" data-d="-1" aria-label="Mundur">←</button>' : '') + (i < 2 ? '<button class="ac-btn sm" data-act="mv" data-id="' + t.id + '" data-d="1" aria-label="Maju">→</button>' : '') + '<button class="ac-btn sm danger" data-act="del" data-e="ptask" data-id="' + t.id + '">×</button></div></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    function vTL(p) {
      var ms = msOf(p.id).filter(function (m) { return m.date; }), ts = tasksOf(p.id).filter(function (t) { return t.due; });
      var T = function (x) { return new Date(x).getTime(); }, pts = [p.start, p.target].concat(ms.map(function (m) { return m.date; }), ts.map(function (t) { return t.due; })).filter(Boolean).map(T);
      if (pts.length < 2) return empty('Isi tanggal mulai, target selesai, atau tanggal milestone/tugas agar timeline muncul.');
      var now = Date.now(), all = pts.concat([now]), mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx === mn) mx = mn + 864e5;
      var pos = function (t) { return ((t - mn) / (mx - mn) * 96 + 2).toFixed(1); }, nowEl = '<i class="tl-now" style="left:' + pos(now) + '%" title="Hari ini"></i>';
      var h = '<div class="tl-row"><span><b>Proyek</b></span><div class="tl-track">' + (p.start && p.target ? '<i class="tl-bar" style="left:' + pos(T(p.start)) + '%;width:' + (pos(T(p.target)) - pos(T(p.start))) + '%"></i>' : '') + nowEl + '</div></div>';
      ms.forEach(function (m) { h += '<div class="tl-row"><span title="' + esc(m.title) + '">◆ ' + esc(m.title) + '</span><div class="tl-track"><i class="tl-dot d' + (m.done ? ' ok' : '') + '" style="left:' + pos(T(m.date)) + '%"></i>' + nowEl + '</div></div>'; });
      ts.forEach(function (t) { h += '<div class="tl-row"><span title="' + esc(t.title) + '">' + esc(t.title) + '</span><div class="tl-track"><i class="tl-dot' + (t.status === 'Selesai' ? ' ok' : '') + '" style="left:' + pos(T(t.due)) + '%"></i>' + nowEl + '</div></div>'; });
      return h + '<div class="ac-legend" style="margin-top:12px"><span>' + fd(new Date(mn)) + ' → ' + fd(new Date(mx)) + '</span><span style="color:#d0443e">| hari ini</span><span>◆ milestone · ● tugas (hijau = selesai)</span></div>';
    }
    function vMs(p) {
      var L = msOf(p.id).sort(function (a, b) { return (a.date || '9').localeCompare(b.date || '9'); });
      return bar('Centang saat milestone tercapai.', add('ms', 'Milestone', 'projId', p.id)) + (L.length ? L.map(function (m) {
        var late = m.date && m.date < todayS() && !m.done;
        return '<div class="ac-item' + (m.done ? ' done' : '') + '"><input type="checkbox" data-act="tgm" data-id="' + m.id + '"' + (m.done ? ' checked' : '') + ' aria-label="Tercapai"><div><button class="t" data-act="edit" data-e="ms" data-id="' + m.id + '">' + esc(m.title) + '</button>' + (late ? badge('Terlambat', 'late') : '') + '<small>Target: ' + fd(m.date) + '</small>' + (m.notes ? '<small>' + esc(m.notes) + '</small>' : '') + '</div>' + btns('ms', m.id) + '</div>';
      }).join('') : empty('Belum ada milestone.'));
    }
    function vFiles(p) {
      var L = D.pfile.filter(function (f) { return f.projId === p.id; });
      return bar('Dokumen (tautan) dan catatan proyek.', add('pfile', 'Dokumen / catatan', 'projId', p.id)) + (p.notes ? '<div class="ac-card"><b>Catatan proyek</b><div class="ac-notes">' + esc(p.notes) + '</div></div>' : '') +
        (L.length ? L.map(function (f) { return '<div class="ac-item"><div><b>' + esc(f.title) + '</b>' + badge(f.kind) + (f.link ? '<small>' + link(f.link) + '</small>' : '') + (f.text ? '<div class="ac-notes">' + esc(f.text) + '</div>' : '') + '</div>' + btns('pfile', f.id) + '</div>'; }).join('') : empty('Belum ada dokumen atau catatan.'));
    }
    function vAna(p) {
      var T = tasksOf(p.id), M = msOf(p.id), g = pp(p), td = T.filter(function (t) { return t.status === 'Selesai'; }).length, md = M.filter(function (m) { return m.done; }).length;
      var od = T.filter(function (t) { return t.due && t.due < todayS() && t.status !== 'Selesai'; }).length, om = M.filter(function (m) { return m.date && m.date < todayS() && !m.done; }).length;
      var h = '<div class="ac-grid">' + stat(g.pct == null ? '—' : fmt(g.pct) + '%', 'Progres resmi (' + g.unit + ')') + stat(T.length ? fmt(td / T.length * 100) + '%' : '—', 'Tugas selesai (' + td + '/' + T.length + ')') + stat(M.length ? fmt(md / M.length * 100) + '%' : '—', 'Milestone tercapai (' + md + '/' + M.length + ')') + stat(od + om, 'Terlambat (' + od + ' tugas, ' + om + ' milestone)') + '</div>';
      h += '<div class="ac-h">Tugas per status</div><div class="ac-bars">' + TS.map(function (s) { var n = T.filter(function (t) { return t.status === s; }).length; return '<div class="ac-bar2"><span>' + s + '</span><div class="ac-track"><i style="width:' + (T.length ? n / T.length * 100 : 0) + '%"></i></div><span>' + n + '</span></div>'; }).join('') + '</div>';
      if (p.start && p.target && p.target > p.start) {
        var el2 = (Date.now() - new Date(p.start)) / (new Date(p.target) - new Date(p.start)) * 100, e = Math.max(0, Math.min(100, el2));
        h += '<div class="ac-h">Waktu berjalan vs progres</div><div class="ac-legend"><span><i></i>Progres</span><span><i class="alt"></i>Waktu berjalan</span></div><div class="ac-pair"><div class="ac-track"><i style="width:' + (g.pct || 0) + '%"></i></div><div class="ac-track"><i class="alt" style="width:' + e + '%"></i></div></div>' +
          '<p class="ac-hint" style="margin-top:8px">' + (g.pct == null ? 'Progres belum bisa dibandingkan karena belum ada ' + g.unit + '.' : 'Waktu terpakai ' + fmt(e) + '%, progres ' + fmt(g.pct) + '%.') + '</p>';
      }
      return h + '<p class="ac-hint" style="margin-top:14px">Progres resmi = ' + g.unit + ' selesai ÷ total ' + g.unit + '. Dasar perhitungan bisa diubah di Edit proyek.</p>';
    }
    return {
      specs: specs, tabs: [['p', 'Proyek', function () { var p = st.proj && by(D.proj, st.proj); return p ? detail(p) : list(); }]],
      sub: function () { return D.proj.length + ' proyek'; },
      cascade: { proj: [['ptask', 'projId'], ['ms', 'projId'], ['pfile', 'projId']] },
      guard: function (e) { if (e !== 'proj' && !D.proj.length) return ['Belum ada proyek', 'Buat proyek terlebih dahulu.']; },
      saved: function (ent, r, isNew, b) {
        var L = { name: 'Nama', area: 'Area', status: 'Status', priority: 'Prioritas', start: 'Mulai', target: 'Target', budget: 'Anggaran', basis: 'Dasar progres' };
        if (ent === 'proj') { if (isNew) { r.hist = []; log(r.id, 'Proyek dibuat'); } else Object.keys(L).forEach(function (k) { if (String(b[k]) !== String(r[k])) log(r.id, L[k] + ': ' + (b[k] || '—') + ' → ' + (r[k] || '—')); }); }
        if (ent === 'ptask') { if (isNew) log(r.projId, 'Tugas ditambahkan: ' + r.title); else if (b.status !== r.status) log(r.projId, 'Tugas "' + r.title + '": ' + b.status + ' → ' + r.status); }
        if (ent === 'ms') { if (isNew) log(r.projId, 'Milestone ditambahkan: ' + r.title); else if (b.done !== r.done) log(r.projId, 'Milestone "' + r.title + '" ' + (r.done ? 'tercapai' : 'dibuka kembali')); }
        if (ent === 'pfile' && isNew) log(r.projId, (r.kind === 'Catatan' ? 'Catatan' : 'Dokumen') + ' ditambahkan: ' + r.title);
      },
      act: function (a, d, t) {
        if (a === 'openp') { st.proj = d.id || null; st.pv = 'overview'; }
        if (a === 'pv') st.pv = d.v;
        if (a === 'mv') { var x = by(D.ptask, d.id), i = Math.max(0, Math.min(2, TS.indexOf(x.status) + +d.d)); if (TS[i] !== x.status) { log(x.projId, 'Tugas "' + x.title + '": ' + x.status + ' → ' + TS[i]); x.status = TS[i]; } }
        if (a === 'tgm') { var m = by(D.ms, d.id); m.done = t.checked; log(m.projId, 'Milestone "' + m.title + '" ' + (m.done ? 'tercapai' : 'dibuka kembali')); }
      }
    };
  });

  MO.routes['#work'] = work.open;
  MO.routes['#organization'] = org.open;
  MO.routes['#project'] = proj.open;
})();
