/* MyOffice — Document Center. Metadata di localStorage, isi berkas asli di IndexedDB browser.
   Tampilan: perpustakaan rak buku (readowl.css) — folder = rak, dokumen = sampul buku. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, empty = K.empty;
  var dbp;
  function db() {
    return dbp || (dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('mo-docs', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function tx(mode, fn) {
    return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('files', mode), q = fn(t.objectStore('files')); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); });
  }
  var put = function (id, b) { return tx('readwrite', function (s) { return s.put(b, id); }); };
  var get = function (id) { return tx('readonly', function (s) { return s.get(id); }); };
  var rmb = function (id) { return tx('readwrite', function (s) { return s.delete(id); }).catch(function () { }); };
  var size = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; };
  var SKIN = 'rd-skin';
  var PER_ROW = 6;

  /* ---------- Jenis berkas → warna sampul ---------- */
  var PAL = {
    pdf: ['#d2634a', '#9b3125'], doc: ['#4a7cc0', '#2a4f8c'], xls: ['#58a275', '#2f6e4a'], ppt: ['#e79442', '#b85a1d'],
    img: ['#45a2b0', '#26667a'], av: ['#8264b8', '#523a88'], txt: ['#fdf8ee', '#eadcc0'], zip: ['#7a8190', '#474e5c'], oth: ['#a08672', '#664f3f']
  };
  function kind(f) {
    var t = f.type || '', n = f.name.toLowerCase(), s = t + ' ' + n;
    return /^image\//.test(t) ? 'img' : /pdf/.test(s) ? 'pdf' : /word|\.docx?$|\.odt$|\.rtf$/.test(s) ? 'doc' : /sheet|excel|\.xlsx?$|\.csv$|\.ods$/.test(s) ? 'xls'
      : /presentation|powerpoint|\.pptx?$|\.odp$/.test(s) ? 'ppt' : /^(audio|video)\//.test(t) ? 'av' : /zip|rar|7z|tar|gz/.test(s) ? 'zip' : /^text\/|\.(txt|md|json)$/.test(s) ? 'txt' : 'oth';
  }
  var hash = function (s) { var h = 0, i; for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  var extOf = function (f) { var m = /\.([a-z0-9]{1,5})$/i.exec(f.name); return (m ? m[1] : (f.type || '').split('/').pop() || 'file').slice(0, 5).toUpperCase(); };
  var baseName = function (f) { return f.name.replace(/\.[a-z0-9]{1,5}$/i, ''); };

  /* ---------- Ikon ---------- */
  var IC = {
    lib: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
    up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    fnew: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6l-4 1 1-4z"/>',
    del: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    go: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  var ic = function (n, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; };
  var LOGO = '<svg class="rd-owl" viewBox="0 0 64 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11 11 3l7 5M57 11 53 3l-7 5"/><circle cx="20" cy="19" r="9"/><circle cx="44" cy="19" r="9"/><path d="M29 18.5c1.8-1.6 4.2-1.6 6 0"/><circle cx="20" cy="19" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="19" r="3" fill="currentColor" stroke="none"/></svg>';

  /* ---------- Thumbnail gambar (dibaca dari IndexedDB, di-cache) ---------- */
  var thumbs = {}, vis = [];
  var thumbable = function (f) { return /^image\/(png|jpe?g|webp|gif|avif)$/.test(f.type || '') && f.size < 12e6; };
  function fetchThumbs() {
    vis.forEach(function (f) {
      if (!thumbable(f) || f.id in thumbs) return;
      thumbs[f.id] = null;
      get(f.id).then(function (b) {
        if (!b) return;
        var u = URL.createObjectURL(b); thumbs[f.id] = u;
        Array.prototype.forEach.call(document.querySelectorAll('.rd-cover[data-id="' + f.id + '"]'), function (n) { n.style.setProperty('--img', "url('" + u + "')"); n.classList.add('has-img'); });
      }).catch(function () { delete thumbs[f.id]; });
    });
  }
  function dropThumb(id) { if (thumbs[id]) URL.revokeObjectURL(thumbs[id]); delete thumbs[id]; }

  /* Tombol unggah via label+input agar dialog berkas tidak hilang karena render ulang */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.rd-skin label[data-pick]')) { e.preventDefault(); e.target.querySelector('input').click(); }
  });
  var readSettings = function () { try { return JSON.parse(localStorage.getItem('mo-settings-v1')) || {}; } catch (e) { return {}; } };

  var docs = K.App('Document Center', 'mo-docs-v1', function () { return { folder: [], file: [] }; }, function (app) {
    var D = app.D, st = app.st;
    var path = function (id) { var o = [], f; while (id && (f = by(D.folder, id)) && o.length < 20) { o.unshift(f); id = f.parentId; } return o; };
    var pstr = function (id) { return path(id).map(function (f) { return f.name; }).join(' / ') || 'Dokumen'; };
    var kids = function (id) { var o = [id]; D.folder.filter(function (f) { return f.parentId === id; }).forEach(function (f) { o = o.concat(kids(f.id)); }); return o; };
    var folderOpts = function () { return [['', 'Dokumen (utama)']].concat(D.folder.map(function (f) { return [f.id, pstr(f.id)]; })); };
    var specs = {
      folder: { title: 'Folder', def: {}, fields: [{ k: 'name', l: 'Nama folder', t: 'text', req: 1, full: 1 }, { k: 'parentId', l: 'Letak', t: 'select', full: 1, o: folderOpts }] },
      file: { title: 'Dokumen', def: {}, fields: [{ k: 'name', l: 'Nama dokumen', t: 'text', req: 1, full: 1 }, { k: 'folderId', l: 'Folder', t: 'select', full: 1, o: folderOpts }, { k: 'tags', l: 'Tag (pisahkan koma)', t: 'text', full: 1 }, { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] }
    };
    var tagList = function (f) { return (f.tags || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
    var byName = function (a, b) { return a.name.localeCompare(b.name); };
    var itemCount = function (id) { return D.file.filter(function (x) { return x.folderId === id; }).length; };

    /* ----- Sampul buku ----- */
    function cover(f, extra) {
      var k = kind(f), p = PAL[k], pat = hash(f.name) % 4, img = thumbs[f.id];
      vis.push(f);
      var tip = f.name + '\n' + size(f.size) + ' · ' + fd(f.added) + (f.tags ? '\n#' + tagList(f).join(' #') : '') + (f.notes ? '\n' + f.notes : '');
      return '<button class="rd-cover k-' + k + ' p' + pat + (img ? ' has-img' : '') + (extra ? ' ' + extra : '') + '" style="--c1:' + p[0] + ';--c2:' + p[1] + (img ? ";--img:url('" + img + "')" : '') + '" data-act="view" data-id="' + f.id + '" title="' + esc(tip) + '" aria-label="Buka ' + esc(f.name) + '">' +
        '<i class="rd-art"></i><i class="rd-ext">' + esc(extOf(f)) + '</i><b class="rd-name">' + esc(baseName(f)) + '</b>' +
        (k === 'txt' && f.idx ? '<span class="rd-snip">' + esc(f.idx.slice(0, 200)) + '</span>' : '') + '</button>';
    }
    function tools(f) {
      var b = function (a, ico, lb, cls, e) { return '<button class="' + (cls || '') + '" data-act="' + a + '"' + (e ? ' data-e="' + e + '"' : '') + ' data-id="' + f.id + '" aria-label="' + lb + ' ' + esc(f.name) + '" title="' + lb + '">' + ic(ico, 2) + '</button>'; };
      return '<div class="rd-tools">' + b('dl', 'dl', 'Unduh') + b('edit', 'edit', 'Edit', '', 'file') + b('delfile', 'del', 'Hapus', 'danger') + '</div>';
    }
    var book = function (f, i) { return '<div class="rd-book" style="--i:' + Math.min(i, 14) + '">' + cover(f) + tools(f) + '</div>'; };
    var ghost = function (label) { return '<label class="rd-book rd-ghost" data-pick tabindex="0" role="button" title="Unggah dokumen ke rak ini"><span class="rd-plus">' + ic('plus', 1.6) + '</span><em>' + label + '</em><input type="file" multiple hidden data-chg="upload"></label>'; };
    var row = function (inner) { return '<div class="rd-shelf"><div class="rd-shelf-in">' + inner + '<i class="rd-ledge"></i></div></div>'; };
    function chunk(a, n) { var o = [], i; for (i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

    /* ----- Rak ----- */
    function shelf(title, sub, files, o) {
      o = o || {};
      var head = '<div class="rd-sh"><h3>' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h3><div class="rd-sh-acts">' +
        (o.folder ? '<button class="rd-ib" data-act="edit" data-e="folder" data-id="' + o.folder.id + '" aria-label="Ubah nama atau letak rak ' + esc(o.folder.name) + '" title="Edit rak">' + ic('edit', 1.8) + '</button><button class="rd-ib danger" data-act="delfolder" data-id="' + o.folder.id + '" aria-label="Hapus rak ' + esc(o.folder.name) + '" title="Hapus rak">' + ic('del', 1.8) + '</button>' : '') +
        (o.open ? '<button class="rd-more" data-act="cd" data-id="' + o.open + '">' + (o.more || 'Buka rak') + ic('go', 1.8) + '</button>' : '') + '</div></div>';
      var rows = chunk(files, PER_ROW), i = 0, body = '';
      if (!rows.length) rows = [[]];
      rows.forEach(function (r, ri) {
        var last = ri === rows.length - 1;
        body += row(r.map(function (f) { return book(f, i++); }).join('') + (o.add && last ? ghost('Unggah') : '') + (!r.length && !o.add ? '<span class="rd-void">Rak kosong</span>' : ''));
      });
      return '<section class="rd-sec">' + head + body + '</section>';
    }
    function emptyState() {
      return '<section class="rd-sec rd-empty"><div class="rd-empty-in"><div class="rd-empty-books"><i class="rd-eb e1"></i><i class="rd-eb e2"></i><i class="rd-eb e3"></i><i class="rd-ledge"></i></div>' +
        '<h3>Rak ini masih kosong</h3><p>Unggah dokumen pertama Anda, atau buat folder untuk menyusun rak baru. Berkas disimpan aman di browser ini.</p>' +
        '<div class="rd-empty-acts"><label class="rd-btn pri" data-pick tabindex="0" role="button">' + ic('up') + 'Unggah dokumen<input type="file" multiple hidden data-chg="upload"></label>' +
        '<button class="rd-btn" data-act="add" data-e="folder" data-pre="' + esc(JSON.stringify({ parentId: st.f || '' })) + '">' + ic('fnew') + 'Folder baru</button></div></div></section>';
    }
    function shelvesView(cur) {
      var sub = D.folder.filter(function (f) { return (f.parentId || '') === cur; }).sort(byName),
        fl = D.file.filter(function (f) { return (f.folderId || '') === cur; }).sort(byName), h = '';
      if (!sub.length && !fl.length) return emptyState();
      if (!cur && D.file.length >= 4) {
        var nw = D.file.slice().sort(function (a, b) { return new Date(b.added) - new Date(a.added); }).slice(0, PER_ROW);
        h += shelf('Baru diunggah', '', nw, {});
      }
      h += shelf(cur ? (by(D.folder, cur) || {}).name : 'Dokumen', fl.length + ' dokumen', fl, { add: true });
      sub.forEach(function (f) {
        var inside = D.file.filter(function (x) { return x.folderId === f.id; }).sort(byName), nsub = D.folder.filter(function (x) { return x.parentId === f.id; }).length;
        h += shelf(f.name, inside.length + ' dokumen' + (nsub ? ' · ' + nsub + ' sub-rak' : ''), inside.slice(0, PER_ROW), { folder: f, open: f.id, more: inside.length > PER_ROW ? 'Seluruh rak (' + inside.length + ')' : 'Buka rak' });
      });
      return h;
    }

    /* ----- Grid (Semua / Terbaru / hasil cari) ----- */
    function folderCover(f) {
      return '<button class="rd-cover k-fold p' + (hash(f.name) % 4) + '" style="--c1:#b07a45;--c2:#7a4a24" data-act="cd" data-id="' + f.id + '" title="' + esc(pstr(f.id)) + '" aria-label="Buka rak ' + esc(f.name) + '"><i class="rd-art"></i><i class="rd-ext">RAK</i><b class="rd-name">' + esc(f.name) + '</b><span class="rd-fico">' + ic('folder', 1.5) + '</span></button>';
    }
    function card(f, i) {
      var tg = tagList(f);
      return '<div class="rd-card" style="--i:' + Math.min(i, 14) + '"><div class="rd-book">' + cover(f) + tools(f) + '</div><div class="rd-cap"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b><small>' + size(f.size) + ' · ' + fd(f.added) + '</small>' +
        '<small class="loc">' + esc(pstr(f.folderId)) + '</small>' + (tg.length ? '<small class="tg">#' + tg.map(esc).join(' #') + '</small>' : '') + '</div></div>';
    }
    function gridView(title, note, files, folders, none) {
      var i = 0, g = (folders || []).map(function (f) { return '<div class="rd-card"><div class="rd-book">' + folderCover(f) + '</div><div class="rd-cap"><b>' + esc(f.name) + '</b><small>' + itemCount(f.id) + ' dokumen</small><small class="loc">' + esc(pstr(f.parentId)) + '</small></div></div>'; }).join('') +
        files.map(function (f) { return card(f, i++); }).join('');
      return '<section class="rd-sec"><div class="rd-sh"><h3>' + esc(title) + '<small>' + esc(note) + '</small></h3></div>' + (g ? '<div class="rd-grid">' + g + '</div>' : '<div class="rd-none">' + none + '</div>') + '</section>';
    }

    /* ----- Kerangka: sidebar + panel ----- */
    function side(view, cur, q) {
      var last = D.last && by(D.file, D.last.id), me = readSettings(), nm = me.nick || 'Pengguna';
      var nav = function (v, ico, lb, on) { return '<button class="rd-nav' + (on ? ' on' : '') + '" data-act="rdv" data-v="' + v + '"' + (v === 'shelves' ? ' data-root="1"' : '') + (on ? ' aria-current="page"' : '') + '>' + ic(ico, 1.6) + '<span>' + lb + '</span></button>'; };
      var q0 = !q;
      return '<aside class="rd-side"><div class="rd-logo">' + LOGO + '<b>Document Center</b></div><nav class="rd-navs" aria-label="Menu Document Center">' +
        nav('shelves', 'lib', 'Perpustakaan', q0 && view === 'shelves') + nav('recent', 'clock', 'Terbaru', q0 && view === 'recent') + nav('all', 'grid', 'Semua dokumen', q0 && view === 'all') +
        '<label class="rd-nav" data-pick tabindex="0" role="button">' + ic('up', 1.6) + '<span>Unggah</span><input type="file" multiple hidden data-chg="upload"></label>' +
        '<button class="rd-nav" data-act="add" data-e="folder" data-pre="' + esc(JSON.stringify({ parentId: cur })) + '">' + ic('fnew', 1.6) + '<span>Folder baru</span></button></nav>' +
        (last ? '<div class="rd-resume"><small>Terakhir dibuka</small>' + cover(last, 'mini') + '<span title="' + esc(last.name) + '">' + esc(baseName(last)) + '</span></div>' : '<div class="rd-resume none"></div>') +
        '<button class="rd-me" data-act="rdme" aria-label="Buka pengaturan profil"><i class="rd-av"' + (me.photo ? ' style="background-image:url(&quot;' + esc(me.photo) + '&quot;)"' : '') + '></i><span>' + esc(nm) + '</span>' + ic('chev', 1.8) + '</button></aside>';
    }
    function topbar(view, q) {
      var t = function (v, lb, on) { return '<button class="rd-tab" role="tab" aria-selected="' + on + '" data-act="rdv" data-v="' + v + '">' + lb + '</button>'; };
      return '<div class="rd-top"><div class="rd-tabs" role="tablist">' + t('shelves', 'Rak', !q && view === 'shelves') + t('all', 'Semua dokumen', !q && view !== 'shelves') + '</div>' +
        '<label class="rd-search">' + ic('search', 1.7) + '<input type="text" data-in="dq" placeholder="Cari nama, tag, catatan, atau isi berkas teks…" value="' + esc(st.dq || '') + '" aria-label="Cari dokumen" autocomplete="off"></label></div>';
    }

    function vDocs() {
      var old = document.querySelector('.rd-main');
      if (old && !st.reset && (st.lq || '') === (st.dq || '')) st.rs = old.scrollTop; else st.rs = 0;
      st.reset = 0; st.lq = st.dq || '';
      vis = [];
      var q = (st.dq || '').toLowerCase().trim(), cur = st.f || '', view = st.view || 'shelves';
      if (cur && !by(D.folder, cur)) cur = st.f = '';
      var total = D.file.reduce(function (a, f) { return a + (+f.size || 0); }, 0), main, crumbs = '';
      if (q) {
        var F = D.file.filter(function (f) { return (f.name + ' ' + (f.tags || '') + ' ' + (f.notes || '') + ' ' + (f.idx || '')).toLowerCase().indexOf(q) > -1; }).sort(byName),
          Fo = D.folder.filter(function (f) { return f.name.toLowerCase().indexOf(q) > -1; }).sort(byName);
        main = gridView('Hasil pencarian', (F.length + Fo.length) + ' hasil untuk “' + (st.dq || '').trim() + '”', F, Fo, 'Tidak ada hasil. Pencarian isi berkas hanya untuk berkas teks (.txt, .md, .csv, .json).');
      } else if (view === 'all') {
        main = gridView('Semua dokumen', D.file.length + ' berkas', D.file.slice().sort(byName), null, 'Belum ada dokumen. Unggah dokumen pertama Anda lewat menu Unggah.');
      } else if (view === 'recent') {
        main = gridView('Terbaru', '24 berkas terakhir diunggah', D.file.slice().sort(function (a, b) { return new Date(b.added) - new Date(a.added); }).slice(0, 24), null, 'Belum ada dokumen. Unggah dokumen pertama Anda lewat menu Unggah.');
      } else {
        main = shelvesView(cur);
        crumbs = '<nav class="rd-crumbs" aria-label="Lokasi rak"><button class="rd-crumb' + (cur ? '' : ' on') + '" data-act="cd" data-id="">Dokumen</button>' + path(cur).map(function (f, i, a) { return '<span aria-hidden="true">/</span><button class="rd-crumb' + (i === a.length - 1 ? ' on' : '') + '" data-act="cd" data-id="' + f.id + '">' + esc(f.name) + '</button>'; }).join('') + '</nav>';
      }
      var info = '<div class="rd-info">' + (crumbs || '<span></span>') + '<small>' + D.file.length + ' dokumen · ' + D.folder.length + ' folder · ' + size(total) + ' di browser ini</small></div>';
      var html = '<div class="rd">' + side(view, cur, q) + '<div class="rd-panel"><div class="rd-main">' + topbar(view, q) + info + main + '</div></div></div>';
      setTimeout(function () { var m = document.querySelector('.rd-main'); if (m && st.rs) m.scrollTop = st.rs; fetchThumbs(); }, 0);
      return html;
    }

    function viewer(f, blob) {
      var url = URL.createObjectURL(blob), t = f.type || blob.type || '';
      var done = function (b) {
        var m = el2('ac-ov ac-ov2 ' + SKIN, '<div class="ac-win vw"><header><div><h2 style="font-size:20px">' + esc(f.name) + '</h2><p>' + size(f.size) + ' · ' + esc(t || 'berkas') + '</p></div><button class="ac-x" data-x aria-label="Tutup">×</button></header><div class="ac-body">' + b + '</div><div class="ac-foot"><a class="ac-btn" href="' + url + '" target="_blank" rel="noopener">Buka di tab baru</a><a class="ac-btn pri" href="' + url + '" download="' + esc(f.name) + '">Unduh</a></div></div>');
        document.body.appendChild(m);
        var cx = m.querySelector('.ac-x'); if (cx) cx.focus();
        var off = function () { m.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); };
        m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
        m.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-x]')) off(); });
        m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
      };
      if (/^image\//.test(t)) done('<img src="' + url + '" alt="">');
      else if (/pdf/.test(t)) done('<iframe src="' + url + '" title="' + esc(f.name) + '"></iframe><p class="ac-hint" style="margin-top:8px">Jika PDF tidak tampil di perangkat ini, gunakan "Buka di tab baru" atau "Unduh".</p>');
      else if (/^video\//.test(t)) done('<video src="' + url + '" controls style="width:100%;max-height:68dvh"></video>');
      else if (/^audio\//.test(t)) done('<audio src="' + url + '" controls style="width:100%"></audio>');
      else if (/^text\//.test(t) || /\.(txt|md|csv|json)$/i.test(f.name)) blob.text().then(function (x) { done('<pre>' + esc(x.slice(0, 200000)) + '</pre>'); });
      else done(empty('Jenis berkas ini tidak bisa dipratinjau di browser. Gunakan "Unduh" untuk membukanya dengan aplikasi yang sesuai.'));
    }
    var el2 = K.el;
    function download(f, blob) { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 10000); }
    function withBlob(id, fn) { var f = by(D.file, id); if (!f) return; get(id).then(function (b) { if (!b) return MO.msg('Berkas tidak ditemukan', 'Isinya hilang dari penyimpanan browser.'); fn(f, b); }).catch(function () { MO.msg('Gagal', 'Penyimpanan browser tidak dapat dibaca.'); }); }
    return {
      skin: SKIN,
      specs: specs, tabs: [['d', 'Dokumen', vDocs]], sub: function () { return D.file.length + ' dokumen · ' + D.folder.length + ' folder'; },
      cascade: { folder: [] },
      act: function (a, d, t, ev) {
        if (a === 'cd') { st.f = d.id || ''; st.dq = ''; st.view = 'shelves'; st.reset = 1; }
        if (a === 'rdv') { st.view = d.v; st.dq = ''; if (d.root) st.f = ''; st.reset = 1; }
        if (a === 'rdme') {
          var ov = ev && ev.target.closest('.ac-ov'), x = ov && ov.querySelector('[data-act="close"]');
          if (x) x.click(); setTimeout(function () { if (MO.routes['#settings']) MO.routes['#settings'](); }, 60);
        }
        if (a === 'view') { D.last = { id: d.id, t: Date.now() }; withBlob(d.id, viewer); }
        if (a === 'dl') withBlob(d.id, download);
        if (a === 'upload') {
          var fs = Array.prototype.slice.call(t.files || []); t.value = ''; if (!fs.length) return;
          if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
          MO.msg('Mengunggah…', fs.length + ' berkas');
          Promise.all(fs.map(function (f) {
            var id = K.uid(), m = { id: id, name: f.name, size: f.size, type: f.type || '', folderId: st.f || '', added: new Date().toISOString(), notes: '', tags: '', idx: '' };
            return put(id, f).then(function () {
              if ((/^text\//.test(f.type) || /\.(txt|md|csv|json)$/i.test(f.name)) && f.size < 2e6) return f.text().then(function (x) { m.idx = x.slice(0, 20000); return m; });
              return m;
            });
          })).then(function (ms) { ms.forEach(function (m) { D.file.push(m); }); app.save(); app.render(); MO.msg('Selesai', ms.length + ' dokumen tersimpan'); })
            .catch(function () { MO.msg('Gagal mengunggah', 'Penyimpanan browser penuh atau diblokir.'); });
        }
        if (a === 'delfile') { var f = by(D.file, d.id); if (f && confirm('Hapus "' + f.name + '" dari Document Center?')) { rmb(f.id); dropThumb(f.id); if (D.last && D.last.id === f.id) D.last = null; D.file = D.file.filter(function (x) { return x.id !== f.id; }); } }
        if (a === 'delfolder') {
          var ids = kids(d.id), fl = D.file.filter(function (x) { return ids.indexOf(x.folderId) > -1; });
          if (confirm('Hapus folder ini beserta ' + (ids.length - 1) + ' subfolder dan ' + fl.length + ' dokumen di dalamnya?')) {
            fl.forEach(function (x) { rmb(x.id); dropThumb(x.id); if (D.last && D.last.id === x.id) D.last = null; }); D.file = D.file.filter(function (x) { return ids.indexOf(x.folderId) < 0; }); D.folder = D.folder.filter(function (x) { return ids.indexOf(x.id) < 0; });
            if (ids.indexOf(st.f) > -1) st.f = '';
          }
        }
      },
      validate: function (e, r) { if (e === 'folder' && r.parentId && r.id && kids(r.id).indexOf(r.parentId) > -1) return 'Folder tidak bisa dipindahkan ke dalam dirinya sendiri.'; }
    };
  });
  MO.routes['#documents'] = docs.open;
})();
