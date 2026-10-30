/* MyOffice — Organization "eShop" : tampilan terang ala toko game (hero + grid kartu).
   Memakai data Organization lama (localStorage mo-org-v1); semua fitur lama tetap ada. */
(function () {
  'use strict';
  var MO = window.MyOffice; if (!MO || !MO.org || !MO.kit) return;
  var K = MO.kit, esc = K.esc, rp = K.rp, fd = K.fd, by = K.by, uid = K.uid;
  var app = MO.org.app, D = app.D;
  ['org', 'meeting', 'followup', 'budget', 'odoc'].forEach(function (k) { if (!D[k]) D[k] = []; });

  var FS = ['Belum', 'Berjalan', 'Selesai'];
  var OD = ['Proposal', 'Notulen', 'Laporan pertanggungjawaban', 'Surat', 'Materi presentasi', 'Dokumen lainnya'];
  var PALETTE = ['#cc8a78', '#6aa3b0', '#d3907e', '#707f6f', '#92c8d4', '#f4c5b5', '#5e96a2', '#e39f8c'];
  var NAV = [['search', 'Cari'], ['orgs', 'Organisasi'], ['meet', 'Rapat'], ['bud', 'Anggaran'], ['docs', 'Dokumen']];
  var WT = [['meet', 'Rapat'], ['bud', 'Anggaran'], ['docs', 'Dokumen'], ['info', 'Info']];

  var S = { view: 'orgs', idx: 0, q: '', world: null, wtab: 'meet', od: 'Semua' };
  var ov, frame, isOpen = false, drag = null, dragged = false;

  function oc(o, i) { return o.color || PALETTE[(i == null ? D.org.indexOf(o) : i) % PALETTE.length]; }
  function lum(h) { h = (h || '#888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return (0.299 * parseInt(h.substr(0, 2), 16) + 0.587 * parseInt(h.substr(2, 2), 16) + 0.114 * parseInt(h.substr(4, 2), 16)) / 255; }
  function ink(h) { return lum(h) > 0.7 ? '#674239' : '#fff'; }
  function on(id) { var o = by(D.org, id); return o ? o.name : '—'; }
  function save() { app.save(); }
  function cnt(id, k) { return D[k].filter(function (x) { return x.orgId === id; }).length; }
  function bsum(id) { var P = 0, A = 0; D.budget.forEach(function (b) { if (!id || b.orgId === id) { P += +b.planned || 0; A += +b.actual || 0; } }); return { P: P, A: A }; }
  function guardOrg() { if (!D.org.length) { MO.msg('Belum ada organisasi', 'Tambahkan profil organisasi terlebih dahulu.'); return true; } return false; }
  function filtered() { var q = S.q.toLowerCase().trim(); return D.org.filter(function (o) { return !q || (o.name + ' ' + (o.role || '') + ' ' + (o.period || '') + ' ' + (o.desc || '')).toLowerCase().indexOf(q) > -1; }); }
  var I = {
    cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    role: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/></svg>',
    ppl: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-4.5 11.2-4.5 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .5 3.3 2.7 3.5 6"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
    srch: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  /* ilustrasi bawaan (kantor/gedung di bukit) */
  function scene(i) {
    var v = i % 3;
    return '<svg class="es-scene" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="600" height="340" class="s0"/><circle cx="' + (v === 1 ? 140 : 470) + '" cy="82" r="38" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="130" cy="64" rx="60" ry="16" fill="#fff" opacity=".7"/><ellipse cx="380" cy="104" rx="70" ry="15" fill="#fff" opacity=".6"/>' +
      '<path d="M0 250Q150 170 300 230T600 210V340H0Z" class="s1"/><path d="M0 290Q200 230 380 280T600 260V340H0Z" class="s2"/>' +
      '<g class="s3" transform="translate(' + (v === 2 ? 120 : 330) + ' 120)"><rect x="0" y="40" width="120" height="110" rx="6"/><rect x="30" y="0" width="60" height="50" rx="5"/>' +
      '<g fill="#fff" opacity=".9"><rect x="14" y="58" width="16" height="16" rx="3"/><rect x="52" y="58" width="16" height="16" rx="3"/><rect x="90" y="58" width="16" height="16" rx="3"/><rect x="14" y="90" width="16" height="16" rx="3"/><rect x="90" y="90" width="16" height="16" rx="3"/><rect x="46" y="112" width="28" height="38" rx="3"/><rect x="42" y="14" width="14" height="14" rx="3"/><rect x="64" y="14" width="14" height="14" rx="3"/></g>' +
      '<path d="M60 0V-30" stroke="#fff" stroke-width="4"/><path d="M60-30l30 9-30 9Z" fill="#edb6a4"/></g></svg>';
  }
  function art(o, i) { return o.img ? '<img class="es-img" src="' + esc(o.img) + '" alt="" draggable="false">' : scene(i); }

  /* ---------- kerangka ---------- */
  function build() {
    ov = document.createElement('div'); ov.className = 'es-ov'; ov.hidden = true;
    ov.innerHTML = '<section class="es-frame" role="dialog" aria-modal="true" aria-label="Organization"></section>';
    document.body.appendChild(ov); frame = ov.firstChild;
    ov.addEventListener('click', onClick); ov.addEventListener('change', onChange); ov.addEventListener('input', onInput);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { if (document.querySelector('.ac-ov2, .es-ov2, .ac-soon:not([hidden])')) return; if (S.world) { S.world = null; render(); } else close(); return; }
      if (S.view === 'orgs' && !S.world && !document.querySelector('.ac-ov2, .es-ov2') && /^(ArrowLeft|ArrowRight)$/.test(e.key) && !/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) pick(S.idx + (e.key === 'ArrowRight' ? 1 : -1));
    });
    app.onChange = function () { if (isOpen) render(); };
  }
  function open() { if (!ov) build(); isOpen = true; ov.hidden = false; document.body.style.overflow = 'hidden'; render(); }
  function close() { isOpen = false; if (ov) ov.hidden = true; document.body.style.overflow = ''; }

  function render() {
    if (!isOpen) return;
    var m0 = frame.querySelector('.es-main'), top = m0 ? m0.scrollTop : 0, cur = filtered()[Math.min(S.idx, Math.max(0, filtered().length - 1))];
    var av = cur ? (cur.img ? '<img src="' + esc(cur.img) + '" alt="">' : '<b>' + esc((cur.name || '?').charAt(0).toUpperCase()) + '</b>') : '<b>O</b>';
    frame.innerHTML =
      '<header class="es-top"><div class="es-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg></div>' +
      '<nav class="es-nav" aria-label="Menu Organization">' + (S.world ? '<button class="es-bk" data-a="back">‹ Semua organisasi</button>' : NAV.map(function (x) {
        if (x[0] === 'search') return '<label class="es-sbox' + (S.q ? ' on' : '') + '">' + I.srch + '<input data-in="q" type="search" placeholder="Cari" value="' + esc(S.q) + '" aria-label="Cari organisasi"></label>';
        return '<button data-a="nav" data-v="' + x[0] + '" aria-current="' + (S.view === x[0]) + '">' + x[1] + '</button>';
      }).join('')) + '</nav>' +
      '<div class="es-r"><span class="es-av" title="' + (cur ? esc(cur.name) : '') + '">' + av + '</span><button class="es-x" data-a="close" aria-label="Tutup">×</button></div></header>' +
      '<div class="es-main">' + (S.world ? worldHTML() : viewHTML()) + '</div>';
    var m = frame.querySelector('.es-main'); if (m) m.scrollTop = top;
    var h = frame.querySelector('.es-hero'); if (h) bindHero(h);
  }
  function viewHTML() {
    if (S.view === 'orgs') return orgsHTML();
    var b = ({ meet: function () { return meetHTML(null); }, bud: function () { return budHTML(null); }, docs: function () { return docsHTML(null); } })[S.view]();
    return '<div class="es-page"><h2 class="es-h2">' + ({ meet: 'Rapat', bud: 'Anggaran', docs: 'Dokumen' })[S.view] + '</h2>' + b + '</div>';
  }

  /* ---------- beranda: hero + grid ---------- */
  function orgsHTML() {
    var L = filtered(), i = Math.min(S.idx, Math.max(0, L.length - 1)), o = L[i];
    var grid = '<div class="es-grid">' + L.map(function (x, k) {
      var c = oc(x), isNew = x === D.org[D.org.length - 1] && D.org.length > 1;
      return '<button class="es-card' + (k === i ? ' sel' : '') + '" data-a="pick" data-i="' + k + '" style="--c:' + c + '" aria-pressed="' + (k === i) + '"><span class="es-thumb">' + art(x, D.org.indexOf(x)) + '</span><span class="es-cap">' + esc(x.name) + '</span>' + (isNew ? '<em>BARU</em>' : '') + '</button>';
    }).join('') + '<button class="es-card add" data-a="oadd"><span class="es-thumb"><i>+</i></span><span class="es-cap">Tambah organisasi</span></button></div>';
    if (!o) return '<div class="es-hero empty"><div class="es-txt"><h1>' + (D.org.length ? 'Tidak ada hasil' : 'Belum ada organisasi') + '</h1><p class="es-desc">' + (D.org.length ? 'Coba kata kunci lain.' : 'Tambahkan organisasi pertama kamu untuk mulai mencatat rapat, anggaran, dan dokumen.') + '</p></div></div>' + grid;
    var c = oc(o), b = bsum(o.id);
    return '<div class="es-hero" style="--c:' + c + '"><div class="es-art">' + art(o, D.org.indexOf(o)) + '</div>' +
      '<div class="es-txt"><h1>' + esc(o.name) + '</h1>' +
      '<div class="es-meta">' + I.cal + '<span>' + esc(o.period ? 'Periode ' + o.period : 'Periode belum diisi') + '</span></div>' +
      '<div class="es-meta">' + I.role + '<span>' + esc(o.role ? 'Jabatan: ' + o.role : 'Jabatan belum diisi') + '</span></div>' +
      '<div class="es-meta">' + I.ppl + '<span>' + cnt(o.id, 'meeting') + ' rapat · ' + cnt(o.id, 'odoc') + ' dokumen' + (b.P ? ' · sisa ' + rp(b.P - b.A) : '') + '</span></div>' +
      (o.desc ? '<p class="es-desc">' + esc(o.desc) + '</p>' : '') +
      '<div class="es-btns"><button class="es-buy" data-a="open" data-id="' + o.id + '">' + I.open + '<span>Buka</span></button><button class="es-ghost" data-a="oedit" data-id="' + o.id + '">✎ Edit kartu</button><button class="es-ghost dng" data-a="odel" data-id="' + o.id + '">Hapus</button></div></div>' +
      '<div class="es-dots" role="tablist" aria-label="Pilih organisasi">' + L.map(function (x, k) { return '<button data-a="pick" data-i="' + k + '" aria-selected="' + (k === i) + '" aria-label="' + esc(x.name) + '"></button>'; }).join('') + '</div></div>' + grid;
  }
  function pick(i) { var n = filtered().length; if (!n) return; S.idx = ((i % n) + n) % n; render(); }
  function bindHero(h) {
    h.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; drag = { x: e.clientX, id: e.pointerId }; });
    h.addEventListener('pointerup', function (e) { if (!drag) return; var dx = e.clientX - drag.x; drag = null; if (Math.abs(dx) > 60) { dragged = true; setTimeout(function () { dragged = false; }, 0); pick(S.idx + (dx < 0 ? 1 : -1)); } });
    h.addEventListener('pointercancel', function () { drag = null; });
  }

  /* ---------- Rapat ---------- */
  function meetHTML(orgId) {
    var L = D.meeting.filter(function (m) { return !orgId || m.orgId === orgId; }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var h = '<div class="es-bar"><p class="es-hint">Agenda, catatan, keputusan, dan tindak lanjut beserta penanggung jawabnya.</p><button class="es-buy sm" data-a="add" data-e="meeting"' + (orgId ? ' data-pk="orgId" data-pv="' + orgId + '"' : '') + '>+ Rapat</button></div>';
    if (!L.length) return h + '<p class="es-empty">Belum ada rapat.</p>';
    return h + L.map(function (m) {
      var fs = D.followup.filter(function (f) { return f.meetingId === m.id; }), c = oc(by(D.org, m.orgId) || {}, D.org.indexOf(by(D.org, m.orgId)));
      return '<article class="es-box" style="--c:' + c + '"><div class="es-row"><div><h3>' + esc(m.title) + '</h3><small>' + esc(on(m.orgId)) + ' · ' + fd(m.date) + '</small></div>' + btns('meeting', m.id) + '</div>' +
        (m.agenda ? '<div class="es-notes"><b>Agenda</b>\n' + esc(m.agenda) + '</div>' : '') + (m.notes ? '<div class="es-notes"><b>Catatan</b>\n' + esc(m.notes) + '</div>' : '') + (m.decisions ? '<div class="es-notes"><b>Keputusan</b>\n' + esc(m.decisions) + '</div>' : '') +
        fs.map(function (f) {
          return '<div class="es-item' + (f.status === 'Selesai' ? ' done' : '') + '"><input type="checkbox" data-chg="tgf" data-id="' + f.id + '"' + (f.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div class="es-ib"><button class="es-t" data-a="edit" data-e="followup" data-id="' + f.id + '">' + esc(f.task) + '</button><small>PJ: ' + esc(f.pic || '—') + ' · Tenggat: ' + fd(f.due) + ' · ' + esc(f.status) + '</small></div><button class="es-mini dng" data-a="del" data-e="followup" data-id="' + f.id + '" aria-label="Hapus">×</button></div>';
        }).join('') + '<button class="es-mini" data-a="add" data-e="followup" data-pk="meetingId" data-pv="' + m.id + '">+ Tindak lanjut</button></article>';
    }).join('');
  }
  function btns(e, id) { return '<div class="es-acts"><button class="es-mini" data-a="edit" data-e="' + e + '" data-id="' + id + '">Edit</button><button class="es-mini dng" data-a="del" data-e="' + e + '" data-id="' + id + '">Hapus</button></div>'; }

  /* ---------- Anggaran ---------- */
  function budHTML(orgId) {
    var h = '<div class="es-bar"><p class="es-hint">Selisih = rencana − aktual. Anggaran organisasi tidak tercampur dengan keuangan pribadi.</p><button class="es-buy sm" data-a="add" data-e="budget"' + (orgId ? ' data-pk="orgId" data-pv="' + orgId + '"' : '') + '>+ Pos anggaran</button></div>';
    var os = D.org.filter(function (o) { return (!orgId || o.id === orgId) && D.budget.some(function (b) { return b.orgId === o.id; }); });
    if (!os.length) return h + '<p class="es-empty">Belum ada pos anggaran.</p>';
    var diff = function (x) { return '<b class="' + (x < 0 ? 'neg' : '') + '">' + (x < 0 ? '−' : '') + rp(Math.abs(x)) + '</b>'; };
    return h + os.map(function (o) {
      var bs = D.budget.filter(function (b) { return b.orgId === o.id; }), t = bsum(o.id);
      return '<article class="es-box" style="--c:' + oc(o) + '"><h3>' + esc(o.name) + '</h3><div class="es-stats"><div><span>Rencana</span><b>' + rp(t.P) + '</b></div><div><span>Aktual</span><b>' + rp(t.A) + '</b></div><div><span>Selisih' + (t.P - t.A < 0 ? ' (melebihi)' : ' (sisa)') + '</span>' + diff(t.P - t.A) + '</div></div>' +
        '<div class="es-tblwrap"><table class="es-tbl"><tr><th>Pos</th><th>Rencana</th><th>Aktual</th><th>Selisih</th><th>Bukti</th></tr>' + bs.map(function (b) { return '<tr class="click" data-a="edit" data-e="budget" data-id="' + b.id + '"><td>' + esc(b.item) + '</td><td>' + rp(b.planned) + '</td><td>' + rp(b.actual) + '</td><td>' + diff((+b.planned || 0) - (+b.actual || 0)) + '</td><td>' + esc(b.proof || '') + (b.link ? ' ' + K.link(b.link) : '') + '</td></tr>'; }).join('') + '</table></div></article>';
    }).join('');
  }

  /* ---------- Dokumen ---------- */
  function docsHTML(orgId) {
    var L = D.odoc.filter(function (d) { return (!orgId || d.orgId === orgId) && (S.od === 'Semua' || d.type === S.od); });
    var h = '<div class="es-bar"><div class="es-chips">' + ['Semua'].concat(OD).map(function (x) { return '<button data-a="filt" data-v="' + x + '" aria-pressed="' + (S.od === x) + '">' + x + '</button>'; }).join('') + '</div><button class="es-buy sm" data-a="add" data-e="odoc"' + (orgId ? ' data-pk="orgId" data-pv="' + orgId + '"' : '') + '>+ Dokumen</button></div>';
    if (!L.length) return h + '<p class="es-empty">Belum ada dokumen.</p>';
    return h + L.map(function (d) {
      return '<div class="es-item"><div class="es-ib"><b>' + esc(d.title) + '</b><em class="es-tag">' + esc(d.type) + '</em><small>' + esc(on(d.orgId)) + ' · ' + fd(d.date) + (d.link ? ' · ' + K.link(d.link) : '') + '</small>' + (d.notes ? '<small>' + esc(d.notes) + '</small>' : '') + '</div>' + btns('odoc', d.id) + '</div>';
    }).join('');
  }

  /* ---------- dunia organisasi ---------- */
  function worldHTML() {
    var o = by(D.org, S.world); if (!o) { S.world = null; return viewHTML(); }
    var i = D.org.indexOf(o), c = oc(o, i), b = bsum(o.id);
    var body = ({ meet: function () { return meetHTML(o.id); }, bud: function () { return budHTML(o.id); }, docs: function () { return docsHTML(o.id); }, info: function () { return infoHTML(o); } })[S.wtab]();
    return '<div class="es-world" style="--c:' + c + '"><div class="es-hero sm"><div class="es-art">' + art(o, i) + '</div><div class="es-txt"><h1>' + esc(o.name) + '</h1>' +
      '<div class="es-meta">' + I.cal + '<span>' + esc(o.period ? 'Periode ' + o.period : 'Periode belum diisi') + '</span></div><div class="es-meta">' + I.role + '<span>' + esc(o.role ? 'Jabatan: ' + o.role : 'Jabatan belum diisi') + '</span></div>' +
      '<div class="es-btns"><button class="es-buy" data-a="oedit" data-id="' + o.id + '">✎ Edit kartu</button><button class="es-ghost" data-a="ofull" data-id="' + o.id + '">Detail lengkap</button></div></div></div>' +
      '<div class="es-stats top"><div><span>Rapat</span><b>' + cnt(o.id, 'meeting') + '</b></div><div><span>Dokumen</span><b>' + cnt(o.id, 'odoc') + '</b></div><div><span>Rencana anggaran</span><b>' + rp(b.P) + '</b></div><div><span>Sisa anggaran</span><b' + (b.P - b.A < 0 ? ' class="neg"' : '') + '>' + (b.P - b.A < 0 ? '−' : '') + rp(Math.abs(b.P - b.A)) + '</b></div></div>' +
      '<nav class="es-tabs">' + WT.map(function (x) { return '<button data-a="wtab" data-v="' + x[0] + '" aria-current="' + (S.wtab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</nav><div class="es-wbody">' + body + '</div></div>';
  }
  function infoHTML(o) {
    return '<div class="es-box"><div class="es-kv"><div><span>Nama</span><b>' + esc(o.name) + '</b></div><div><span>Periode</span><b>' + esc(o.period || '—') + '</b></div><div><span>Jabatan</span><b>' + esc(o.role || '—') + '</b></div></div>' +
      (o.desc ? '<div class="es-notes"><b>Deskripsi</b>\n' + esc(o.desc) + '</div>' : '') + (o.notes ? '<div class="es-notes"><b>Catatan</b>\n' + esc(o.notes) + '</div>' : '') +
      '<div class="es-acts"><button class="es-buy sm" data-a="ofull" data-id="' + o.id + '">Edit detail lengkap</button><button class="es-ghost" data-a="oedit" data-id="' + o.id + '">✎ Edit kartu</button><button class="es-ghost dng" data-a="odel" data-id="' + o.id + '">Hapus organisasi</button></div></div>';
  }

  /* ---------- editor kartu ---------- */
  function openOrgModal(id) {
    var ed = id ? by(D.org, id) : null, idx = ed ? D.org.indexOf(ed) : D.org.length;
    var m = { color: ed ? oc(ed, idx) : PALETTE[idx % PALETTE.length], img: ed ? ed.img || '' : '' };
    var w = document.createElement('div'); w.className = 'es-ov2';
    w.innerHTML = '<form class="es-modal" novalidate><header><h2>' + (ed ? 'Edit Kartu' : 'Organisasi Baru') + '</h2><button type="button" class="es-x" data-x aria-label="Tutup">×</button></header>' +
      '<div class="es-mbody"><div class="es-prev"><span class="es-card sel" data-pv style="--c:' + m.color + '"></span></div><div class="es-fields">' +
      '<label class="full"><span>Nama organisasi *</span><input name="name" type="text" value="' + esc(ed ? ed.name : '') + '" required maxlength="80"></label>' +
      '<label><span>Periode kepengurusan</span><input name="period" type="text" placeholder="2025–2026" value="' + esc(ed ? ed.period || '' : '') + '"></label>' +
      '<label><span>Jabatan saya</span><input name="role" type="text" value="' + esc(ed ? ed.role || '' : '') + '"></label>' +
      '<div class="full"><span class="lb">Warna latar kartu</span><div class="es-sw">' + PALETTE.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Warna ' + c + '"></button>'; }).join('') + '<label class="es-cp" title="Warna sendiri"><input type="color" name="color" value="' + m.color + '"></label></div></div>' +
      '<div class="full"><span class="lb">Gambar kartu</span><div class="es-upl"><label class="es-ghost">Pilih gambar…<input type="file" accept="image/*" hidden name="file"></label><button type="button" class="es-ghost" data-noimg>Hapus gambar</button></div><small class="es-hint">Gambar lebar (landscape) paling pas. Otomatis dikecilkan agar hemat penyimpanan.</small></div>' +
      '</div></div><footer><button type="button" class="es-ghost" data-x>Batal</button>' + (ed ? '' : '<button type="button" class="es-ghost" data-more>Simpan & isi detail</button>') + '<button class="es-buy sm">Simpan</button></footer></form>';
    document.body.appendChild(w);
    var f = w.querySelector('form'), more = false;
    function sync() {
      var pv = w.querySelector('[data-pv]'); pv.style.setProperty('--c', m.color);
      pv.innerHTML = '<span class="es-thumb">' + (m.img ? '<img class="es-img" src="' + esc(m.img) + '" alt="">' : scene(idx)) + '</span><span class="es-cap">' + esc(f.elements.name.value || 'Nama organisasi') + '</span>';
      [].forEach.call(w.querySelectorAll('.es-sw button'), function (b) { b.classList.toggle('on', b.dataset.c === m.color); });
    }
    sync();
    f.addEventListener('input', function (e) { if (e.target.name === 'color') m.color = e.target.value; sync(); });
    f.addEventListener('change', function (e) { if (e.target.name === 'file' && e.target.files[0]) shrink(e.target.files[0], function (d) { m.img = d; sync(); }); });
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
      e.preventDefault(); var n = f.elements.name.value.trim(); if (!n) { f.elements.name.focus(); return; }
      var rec = ed || { id: uid() };
      rec.name = n; rec.period = f.elements.period.value.trim(); rec.role = f.elements.role.value.trim(); rec.color = m.color; rec.img = m.img;
      if (!ed) { D.org.push(rec); S.q = ''; S.idx = D.org.length - 1; }
      save(); w.remove(); render(); if (more) app.form('org', rec.id);
    });
    f.elements.name.focus();
  }
  function shrink(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var M = 900, k = Math.min(1, M / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        var d = cv.toDataURL('image/webp', 0.82); if (d.indexOf('data:image/webp') !== 0) d = cv.toDataURL('image/jpeg', 0.82);
        cb(d);
      };
      im.onerror = function () { MO.msg('Gambar gagal dibaca', 'Coba file gambar lain.'); };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- event ---------- */
  function onClick(e) {
    var t = e.target.closest('[data-a]'); if (!t || !ov.contains(t) || dragged) return;
    var a = t.dataset.a, d = t.dataset;
    if (a === 'close') return close();
    if (a === 'back') { S.world = null; return render(); }
    if (a === 'nav') { S.view = d.v; S.world = null; return render(); }
    if (a === 'pick') return pick(+d.i);
    if (a === 'oadd') return openOrgModal();
    if (a === 'oedit') return openOrgModal(d.id);
    if (a === 'ofull') return app.form('org', d.id);
    if (a === 'open') { S.world = d.id; S.wtab = 'meet'; render(); var m = frame.querySelector('.es-main'); if (m) m.scrollTop = 0; return; }
    if (a === 'odel') { app.del('org', d.id); if (!by(D.org, d.id)) { S.world = null; S.idx = 0; render(); } return; }
    if (a === 'wtab') { S.wtab = d.v; return render(); }
    if (a === 'filt') { S.od = d.v; return render(); }
    if (a === 'add') {
      if (['meeting', 'budget', 'odoc'].indexOf(d.e) > -1 && guardOrg()) return;
      if (d.e === 'followup' && !D.meeting.length) return MO.msg('Belum ada rapat', 'Tambahkan rapat terlebih dahulu.');
      var pre = {}; if (d.pk) pre[d.pk] = d.pv; return app.form(d.e, null, pre);
    }
    if (a === 'edit') return app.form(d.e, d.id);
    if (a === 'del') return app.del(d.e, d.id);
  }
  function onChange(e) {
    var t = e.target; if (t.dataset && t.dataset.chg === 'tgf') { var f = by(D.followup, t.dataset.id); if (f) { f.status = t.checked ? 'Selesai' : 'Belum'; save(); render(); } }
  }
  function onInput(e) {
    var t = e.target; if (!t.dataset || t.dataset.in !== 'q') return;
    S.q = t.value; S.idx = 0; S.view = 'orgs'; var p = t.selectionStart; render();
    var n = frame.querySelector('[data-in="q"]'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (x) { } }
  }

  MO.routes['#organization'] = open;
})();
