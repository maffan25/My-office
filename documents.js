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
    pdf: ['#ff8a75', '#e5484d'], doc: ['#4aa8ff', '#2f6fe0'], xls: ['#3fd6a0', '#12a07a'], ppt: ['#ffbe55', '#f08a1c'],
    img: ['#2fd0e0', '#0e8fb0'], av: ['#a58bff', '#6a47e6'], txt: ['#fbfffd', '#d3efe6'], zip: ['#7f93a8', '#475b70'], oth: ['#86c5b8', '#3f8379']
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
    plus: '<path d="M12 5v14M5 12h14"/>',
    img: '<rect width="18" height="18" x="3" y="3" rx="2.5"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    book: '<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H9a3 3 0 0 1 3 3v15a2.5 2.5 0 0 0-2.5-2.5H3.5A1.5 1.5 0 0 1 2 17z"/><path d="M22 4.5A1.5 1.5 0 0 0 20.5 3H15a3 3 0 0 0-3 3v15a2.5 2.5 0 0 1 2.5-2.5h6a1.5 1.5 0 0 0 1.5-1.5z"/>',
    zin: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
    zout: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3M8 11h6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  var ic = function (n, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; };
  var LOGO = '<svg class="rd-owl" viewBox="0 0 64 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11 11 3l7 5M57 11 53 3l-7 5"/><circle cx="20" cy="19" r="9"/><circle cx="44" cy="19" r="9"/><path d="M29 18.5c1.8-1.6 4.2-1.6 6 0"/><circle cx="20" cy="19" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="19" r="3" fill="currentColor" stroke="none"/></svg>';

  /* ---------- Thumbnail gambar (dibaca dari IndexedDB, di-cache) ---------- */
  var thumbs = {}, vis = [];
  var thumbable = function (f) { return !!f.cover || (/^image\/(png|jpe?g|webp|gif|avif)$/.test(f.type || '') && f.size < 12e6); };
  var coverKey = function (f) { return f.cover ? 'cv-' + f.id : f.id; };
  /* Sampul dibuat dari versi KECIL gambar (maks. 360px), bukan berkas aslinya yang bisa belasan MB.
     Didekode terkecil lewat createImageBitmap, diproses satu per satu agar halaman tidak tersendat. */
  var tq = [], tbusy = false;
  function mkThumb(b) {
    if (!window.createImageBitmap) return Promise.resolve(b);
    return createImageBitmap(b, { resizeWidth: 520, resizeQuality: 'medium' }).then(function (bm) {
      var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
      c.getContext('2d').drawImage(bm, 0, 0); if (bm.close) bm.close();
      return new Promise(function (res) { c.toBlob(function (t) { res(t || b); }, 'image/webp', .82); });
    }).catch(function () { return b; });
  }
  function pumpThumbs() {
    if (tbusy || !tq.length) return; tbusy = true;
    var f = tq.shift();
    get(coverKey(f)).then(function (b) { return b ? mkThumb(b) : null; }).then(function (t) {
      if (!t || !(f.id in thumbs)) return;
      var u = URL.createObjectURL(t); thumbs[f.id] = u;
      Array.prototype.forEach.call(document.querySelectorAll('.rd-cover[data-id="' + f.id + '"],.rd-cover[data-fid="' + f.id + '"]'), function (n) { n.style.setProperty('--img', "url('" + u + "')"); n.classList.add('has-img'); });
    }).catch(function () { delete thumbs[f.id]; }).then(function () { tbusy = false; setTimeout(pumpThumbs, 30); });
  }
  function fetchThumbs() {
    vis.forEach(function (f) {
      if (!thumbable(f) || f.id in thumbs) return;
      thumbs[f.id] = null; tq.push(f);
    });
    pumpThumbs();
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
        '<i class="rd-art"></i><i class="rd-ext">' + esc(extOf(f)) + '</i>' + (f.rating ? '<i class="rd-rb">★ ' + f.rating + '</i>' : '') + '<b class="rd-name">' + esc(baseName(f)) + '</b>' +
        (k === 'txt' && f.idx && !f.cover ? '<span class="rd-snip">' + esc(f.idx.slice(0, 200)) + '</span>' : '') + '</button>';
    }
    function tools(f) {
      var b = function (a, ico, lb, cls, e) { return '<button class="' + (cls || '') + '" data-act="' + a + '"' + (e ? ' data-e="' + e + '"' : '') + ' data-id="' + f.id + '" aria-label="' + lb + ' ' + esc(f.name) + '" title="' + lb + '">' + ic(ico, 2) + '</button>'; };
      return '<div class="rd-tools">' + b('dl', 'dl', 'Unduh') + b('cvr', 'img', 'Ubah sampul') + b('edit', 'edit', 'Edit', '', 'file') + b('delfile', 'del', 'Hapus', 'danger') + '</div>';
    }
    var book = function (f, i) { return '<div class="rd-book" style="--i:' + Math.min(i, 14) + '">' + cover(f) + tools(f) + '</div>'; };
    var ghost = function (label) { return '<label class="rd-book rd-ghost" data-pick tabindex="0" role="button" title="Unggah dokumen ke rak ini"><span class="rd-plus">' + ic('plus', 1.6) + '</span><em>' + label + '</em><input type="file" multiple hidden data-chg="upload"></label>'; };
    var row = function (inner) { return '<div class="rd-shelf"><div class="rd-shelf-in">' + inner + '<i class="rd-ledge"></i></div></div>'; };
    function chunk(a, n) { var o = [], i; for (i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

    /* ----- Rak ----- */
    function shelf(title, sub, files, o) {
      o = o || {};
      var head = '<div class="rd-sh"><h3>' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h3><div class="rd-sh-acts">' +
        (o.folder ? '<button class="rd-ib" data-act="fcv" data-id="' + o.folder.id + '" aria-label="Ubah sampul rak ' + esc(o.folder.name) + '" title="Ubah sampul rak">' + ic('img', 1.8) + '</button>' + (o.folder.cover ? '<button class="rd-ib" data-act="fcvx" data-id="' + o.folder.id + '" aria-label="Hapus sampul rak ' + esc(o.folder.name) + '" title="Hapus sampul rak">' + ic('x', 1.8) + '</button>' : '') + '<button class="rd-ib" data-act="edit" data-e="folder" data-id="' + o.folder.id + '" aria-label="Ubah nama atau letak rak ' + esc(o.folder.name) + '" title="Edit rak">' + ic('edit', 1.8) + '</button><button class="rd-ib danger" data-act="delfolder" data-id="' + o.folder.id + '" aria-label="Hapus rak ' + esc(o.folder.name) + '" title="Hapus rak">' + ic('del', 1.8) + '</button>' : '') +
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
      var img = thumbs[f.id]; if (f.cover) vis.push(f);
      return '<button class="rd-cover k-fold p' + (hash(f.name) % 4) + (img ? ' has-img' : '') + '" data-fid="' + f.id + '" style="--c1:#2fd0b4;--c2:#0b8f9c' + (img ? ";--img:url('" + img + "')" : '') + '" data-act="cd" data-id="' + f.id + '" title="' + esc(pstr(f.id)) + '" aria-label="Buka rak ' + esc(f.name) + '"><i class="rd-art"></i><i class="rd-ext">RAK</i><b class="rd-name">' + esc(f.name) + '</b><span class="rd-fico">' + ic('folder', 1.5) + '</span></button>';
    }
    function stars(n) { var o = '', i; for (i = 1; i <= 5; i++) o += '<i class="' + (i <= n ? 'on' : '') + '">★</i>'; return o; }
    function card(f, i) {
      var tg = tagList(f);
      return '<div class="rd-card" style="--i:' + Math.min(i, 14) + '"><div class="rd-book">' + cover(f) + tools(f) + '</div><div class="rd-cap"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b>' +
        '<span class="rd-cm"><em>' + esc(extOf(f)) + '</em>' + size(f.size) + '</span><span class="rd-cm dt">' + fd(f.added) + '</span>' +
        '<span class="rd-cl" title="' + esc(pstr(f.folderId)) + '">' + ic('folder', 1.8) + '<span>' + esc(pstr(f.folderId)) + '</span></span>' +
        '<span class="rd-cs' + (f.rating ? '' : ' none') + '" aria-label="Rating ' + (f.rating || 0) + ' dari 5">' + stars(f.rating || 0) + '</span>' +
        (tg.length ? '<span class="rd-ct">' + tg.slice(0, 2).map(function (t) { return '<i>#' + esc(t) + '</i>'; }).join('') + (tg.length > 2 ? '<i>+' + (tg.length - 2) + '</i>' : '') + '</span>' : '') + '</div></div>';
    }
    function gridView(title, note, files, folders, none) {
      var i = 0, g = (folders || []).map(function (f) { return '<div class="rd-card"><div class="rd-book">' + folderCover(f) + '</div><div class="rd-cap"><b>' + esc(f.name) + '</b><span class="rd-cm"><em>RAK</em>' + itemCount(f.id) + ' dokumen</span><span class="rd-cl" title="' + esc(pstr(f.parentId)) + '">' + ic('folder', 1.8) + '<span>' + esc(pstr(f.parentId)) + '</span></span></div></div>'; }).join('') +
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

    /* ----- Sampul kustom: gambar dikecilkan lalu disimpan di IndexedDB (kunci cv-<id>) ----- */
    function mkCover(file) {
      if (!window.createImageBitmap) return Promise.resolve(file);
      return createImageBitmap(file, { resizeWidth: 640, resizeQuality: 'high' }).then(function (bm) {
        var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
        c.getContext('2d').drawImage(bm, 0, 0); if (bm.close) bm.close();
        return new Promise(function (res) { c.toBlob(function (t) { res(t || file); }, 'image/webp', .9); });
      }).catch(function () { return file; });
    }
    function setCover(o, file) {
      if (!file) return Promise.resolve();
      if (!/^image\//.test(file.type || '')) { MO.msg('Bukan gambar', 'Pilih berkas gambar (JPG, PNG, atau WEBP) untuk sampul.'); return Promise.resolve(); }
      return mkCover(file).then(function (b) { return put('cv-' + o.id, b); }).then(function () {
        o.cover = Date.now(); dropThumb(o.id); app.save(); app.render(); MO.msg('Sampul diubah', 'Sampul baru sudah dipasang.');
      }).catch(function () { MO.msg('Gagal', 'Sampul tidak dapat disimpan di browser ini.'); });
    }
    function clearCover(o) { rmb('cv-' + o.id); delete o.cover; dropThumb(o.id); app.save(); app.render(); }
    function pickCover(o, done) {
      var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.style.display = 'none'; document.body.appendChild(i);
      i.addEventListener('change', function () { var f = i.files && i.files[0]; i.remove(); if (f) setCover(o, f).then(done); });
      i.addEventListener('cancel', function () { i.remove(); });
      i.click();
    }

    /* ----- Halaman keterangan: sampul besar, info, rating, tombol Baca & Unduh ----- */
    var kindName = { pdf: 'Dokumen PDF', doc: 'Dokumen Word', xls: 'Lembar kerja', ppt: 'Presentasi', img: 'Gambar', av: 'Audio / video', txt: 'Teks', zip: 'Arsip', oth: 'Berkas' };
    var readable = function (f) { var k = kind(f); return k === 'pdf' || k === 'img' || k === 'txt' || k === 'av'; };
    function detail(f) {
      var k = kind(f), p = PAL[k], tg = tagList(f), cur = f.rating || 0, urls = [];
      var ov = el2('ac-ov ac-ov2 ' + SKIN + ' rd-det-ov', '<div class="rd-det" role="dialog" aria-modal="true" aria-label="Keterangan ' + esc(f.name) + '"><button class="rd-det-x" data-x aria-label="Tutup">' + ic('x', 2) + '</button>' +
        '<div class="rd-det-cv"><div class="rd-book"><div class="rd-cover k-' + k + ' p' + (hash(f.name) % 4) + '" style="--c1:' + p[0] + ';--c2:' + p[1] + '"><i class="rd-art"></i><i class="rd-ext">' + esc(extOf(f)) + '</i><b class="rd-name">' + esc(baseName(f)) + '</b></div></div></div>' +
        '<div class="rd-det-bd"><h2 class="rd-det-t">' + esc(f.name) + '</h2><p class="rd-det-sub">' + kindName[k] + ' · ' + size(f.size) + '</p>' +
        '<div class="rd-rate" role="radiogroup" aria-label="Rating dokumen"></div>' +
        '<dl class="rd-meta"><div><dt>Jenis</dt><dd>' + esc(extOf(f)) + '</dd></div><div><dt>Ukuran</dt><dd>' + size(f.size) + '</dd></div><div><dt>Diunggah</dt><dd>' + fd(f.added) + '</dd></div><div><dt>Letak</dt><dd title="' + esc(pstr(f.folderId)) + '">' + esc(pstr(f.folderId)) + '</dd></div></dl>' +
        (tg.length ? '<div class="rd-det-tags">' + tg.map(function (t) { return '<i>#' + esc(t) + '</i>'; }).join('') + '</div>' : '') +
        (f.notes ? '<p class="rd-det-notes">' + esc(f.notes) + '</p>' : '') +
        '<div class="rd-det-acts"><button class="rd-btn pri" data-do="read"' + (readable(f) ? '' : ' disabled title="Jenis berkas ini tidak bisa dibaca di browser, silakan unduh"') + '>' + ic('book', 1.8) + 'Baca</button><button class="rd-btn" data-do="dl">' + ic('dl', 1.8) + 'Unduh</button></div>' +
        (readable(f) ? '' : '<p class="rd-det-hint">Jenis berkas ini belum bisa dibaca langsung di browser. Unduh untuk membukanya dengan aplikasi yang sesuai.</p>') +
        '<div class="rd-det-more"><button data-do="cover">' + ic('img', 1.8) + 'Ubah sampul</button>' + (f.cover ? '<button data-do="nocover">' + ic('x', 1.8) + 'Hapus sampul</button>' : '') + '<button data-do="edit">' + ic('edit', 1.8) + 'Edit keterangan</button></div></div></div>');
      document.body.appendChild(ov);
      var rate = ov.querySelector('.rd-rate');
      function drawRate() {
        var h = '', i; for (i = 1; i <= 5; i++) h += '<button role="radio" aria-checked="' + (i === cur) + '" class="' + (i <= cur ? 'on' : '') + '" data-n="' + i + '" aria-label="' + i + ' bintang">★</button>';
        rate.innerHTML = h + '<span>' + (cur ? cur + ' / 5' : 'Belum dinilai') + '</span>';
      }
      drawRate();
      /* sampul sebenarnya (gambar kustom, atau gambar itu sendiri) dimuat belakangan */
      var cv = ov.querySelector('.rd-cover');
      if (f.cover || k === 'img') get(f.cover ? 'cv-' + f.id : f.id).then(function (b) {
        if (!b || !ov.isConnected) return; var u = URL.createObjectURL(b); urls.push(u); cv.style.setProperty('--img', "url('" + u + "')"); cv.classList.add('has-img');
      }).catch(function () { });
      var off = function () { ov.remove(); urls.forEach(function (u) { URL.revokeObjectURL(u); }); };
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) off(); });
      ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
      ov.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('button'); if (!t) return;
        if (t.hasAttribute('data-x')) return off();
        if (t.dataset.n) { var n = +t.dataset.n; cur = cur === n ? 0 : n; f.rating = cur; if (!cur) delete f.rating; app.save(); drawRate(); app.render(); return; }
        var d = t.dataset.do; if (!d) return;
        if (d === 'read') withBlob(f.id, reader);
        if (d === 'dl') withBlob(f.id, download);
        if (d === 'cover') pickCover(f, function () { off(); detail(by(D.file, f.id) || f); });
        if (d === 'nocover') { clearCover(f); off(); detail(f); }
        if (d === 'edit') { off(); var eb = document.querySelector('.rd-skin [data-act="edit"][data-e="file"][data-id="' + f.id + '"]'); if (eb) eb.click(); }
      });
      var first = ov.querySelector('[data-do="read"]:not([disabled])') || ov.querySelector('[data-do="dl"]'); if (first) first.focus();
    }

    /* ----- Pembaca di dalam aplikasi (tanpa tab baru) dengan zoom in / out ----- */
    var pdfLib = null;
    function loadPdfJs() {
      if (pdfLib) return pdfLib;
      var base = document.baseURI;
      return (pdfLib = import(new URL('pdfjs/pdf.min.mjs', base).href).then(function (m) {
        m.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.min.mjs', base).href; return m;
      }).catch(function (e) { pdfLib = null; throw e; }));
    }
    function reader(f, blob) {
      var k = kind(f), t = f.type || blob.type || '', url = URL.createObjectURL(blob), z = 1, ZMIN = .5, ZMAX = 4, apply = function () { }, cleanup = [];
      var ov = el2('ac-ov ac-ov2 ' + SKIN + ' rd-rdr-ov', '<div class="rd-rdr" role="dialog" aria-modal="true" aria-label="Membaca ' + esc(f.name) + '">' +
        '<header class="rd-rdr-h"><div class="rd-rdr-ti"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b><small class="rd-rdr-pg"></small></div>' +
        '<div class="rd-zoom" role="group" aria-label="Zoom"><button data-z="out" aria-label="Perkecil" title="Perkecil (−)">' + ic('zout', 1.9) + '</button><button class="pct" data-z="fit" aria-label="Kembali ke ukuran awal" title="Ukuran awal (0)">100%</button><button data-z="in" aria-label="Perbesar" title="Perbesar (+)">' + ic('zin', 1.9) + '</button></div>' +
        '<button class="rd-rdr-b" data-do="dl" title="Unduh">' + ic('dl', 1.9) + '<span>Unduh</span></button><button class="rd-rdr-b x" data-x aria-label="Tutup pembaca" title="Tutup">' + ic('x', 2) + '</button></header>' +
        '<div class="rd-rdr-body" tabindex="0"><div class="rd-rdr-doc"></div></div></div>');
      document.body.appendChild(ov);
      var body = ov.querySelector('.rd-rdr-body'), doc = ov.querySelector('.rd-rdr-doc'), pct = ov.querySelector('.pct'), pgl = ov.querySelector('.rd-rdr-pg');
      var setZ = function (v) { z = Math.max(ZMIN, Math.min(ZMAX, Math.round(v * 100) / 100)); pct.textContent = Math.round(z * 100) + '%'; apply(); };
      var off = function () { cleanup.forEach(function (fn) { try { fn(); } catch (e) { } }); ov.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 3000); };
      ov.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-x')) return off();
        if (b.dataset.do === 'dl') return download(f, blob);
        if (b.dataset.z === 'in') setZ(z + .25); if (b.dataset.z === 'out') setZ(z - .25); if (b.dataset.z === 'fit') setZ(1);
      });
      ov.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); off(); }
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZ(z + .25); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZ(z - .25); }
        else if (e.key === '0') { e.preventDefault(); setZ(1); }
      });
      body.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZ(z + (e.deltaY < 0 ? .15 : -.15)); } }, { passive: false });
      body.focus();

      if (k === 'img') {
        doc.innerHTML = '<img class="rd-rdr-img" src="' + url + '" alt="' + esc(f.name) + '" draggable="false">';
        apply = function () { doc.firstChild.style.width = (z * 100) + '%'; };
      } else if (/^video\//.test(t)) { doc.innerHTML = '<video src="' + url + '" controls style="width:100%;max-height:78dvh;border-radius:14px;background:#000"></video>'; ov.querySelector('.rd-zoom').style.display = 'none'; }
      else if (/^audio\//.test(t)) { doc.innerHTML = '<audio src="' + url + '" controls style="width:100%"></audio>'; ov.querySelector('.rd-zoom').style.display = 'none'; }
      else if (k === 'txt') {
        blob.text().then(function (x) { doc.innerHTML = '<pre class="rd-rdr-txt">' + esc(x.slice(0, 400000)) + '</pre>'; apply(); });
        apply = function () { var p = doc.querySelector('pre'); if (p) p.style.fontSize = (14 * z) + 'px'; };
      } else if (k === 'pdf') {
        doc.innerHTML = '<div class="rd-rdr-load">Memuat dokumen…</div>';
        blob.arrayBuffer().then(function (buf) { return loadPdfJs().then(function (lib) { return lib.getDocument({ data: buf }).promise; }); })
          .then(function (pdf) { if (!ov.isConnected) { pdf.destroy(); return; } cleanup.push(function () { pdf.destroy(); }); renderPdf(pdf); })
          .catch(function () { pdfFallback(); });
      } else { doc.innerHTML = '<div class="rd-rdr-load">Jenis berkas ini tidak bisa dibaca di browser. Gunakan tombol Unduh.</div>'; ov.querySelector('.rd-zoom').style.display = 'none'; }

      /* PDF: tiap halaman digambar ke kanvas saat terlihat; zoom menggambar ulang dengan ketajaman penuh */
      function renderPdf(pdf) {
        doc.innerHTML = ''; doc.classList.add('pdf');
        var pages = [], io, dpr = Math.min(2, window.devicePixelRatio || 1), n = pdf.numPages, timer = 0;
        var baseW = function () { return Math.min(body.clientWidth - 36, 940); };
        pgl.textContent = 'Halaman 1 dari ' + n;
        io = new IntersectionObserver(function (es) { es.forEach(function (e) { var p = e.target.__p; p.vis = e.isIntersecting; if (p.vis) draw(p); }); }, { root: body, rootMargin: '700px 0px' });
        cleanup.push(function () { io.disconnect(); clearTimeout(timer); pages.forEach(function (p) { if (p.task) p.task.cancel(); }); });
        function size1(p) { var w = baseW() * z; p.box.style.width = w + 'px'; p.box.style.height = (w * p.h / p.w) + 'px'; }
        function draw(p) {
          var w = baseW() * z, key = Math.round(w);
          if (p.done === key) return; if (p.task) { p.task.cancel(); p.task = null; }
          var vp = p.page.getViewport({ scale: w / p.w * dpr }), c = p.cv || (p.cv = document.createElement('canvas'));
          var tmp = document.createElement('canvas'); tmp.width = Math.floor(vp.width); tmp.height = Math.floor(vp.height);
          p.task = p.page.render({ canvasContext: tmp.getContext('2d'), viewport: vp });
          p.task.promise.then(function () {
            p.task = null; p.done = key; c.width = tmp.width; c.height = tmp.height; c.getContext('2d').drawImage(tmp, 0, 0);
            c.style.width = '100%'; c.style.height = '100%'; if (!c.parentNode) p.box.appendChild(c); p.box.classList.add('ok');
          }).catch(function () { });
        }
        apply = function () { pages.forEach(function (p) { size1(p); }); clearTimeout(timer); timer = setTimeout(function () { pages.forEach(function (p) { if (p.vis) draw(p); }); }, 140); };
        var chain = Promise.resolve(), i;
        function add(no) {
          return pdf.getPage(no).then(function (pg) {
            var v = pg.getViewport({ scale: 1 }), box = document.createElement('div'); box.className = 'rd-pg'; box.setAttribute('data-no', no);
            var p = { page: pg, w: v.width, h: v.height, box: box, vis: false }; box.__p = p; pages.push(p); size1(p); doc.appendChild(box); io.observe(box);
          });
        }
        for (i = 1; i <= n; i++) (function (no) { chain = chain.then(function () { return ov.isConnected ? add(no) : null; }); })(i);
        body.addEventListener('scroll', function () {
          var mid = body.scrollTop + body.clientHeight * .35, cur = 1; pages.forEach(function (p) { if (p.box.offsetTop <= mid) cur = +p.box.getAttribute('data-no'); });
          pgl.textContent = 'Halaman ' + cur + ' dari ' + n;
        }, { passive: true });
        var rz = function () { apply(); }; window.addEventListener('resize', rz); cleanup.push(function () { window.removeEventListener('resize', rz); });
      }
      /* Cadangan bila pdf.js tidak bisa dimuat (mis. dibuka langsung dari file://): penampil PDF bawaan browser, tetap di dalam halaman ini */
      function pdfFallback() {
        doc.innerHTML = '<div class="rd-rdr-fb"><iframe src="' + url + '#toolbar=0&navpanes=0" title="' + esc(f.name) + '"></iframe></div>';
        var fr = doc.firstChild; pgl.textContent = '';
        apply = function () { fr.style.transform = 'scale(' + z + ')'; fr.style.width = (100 / z) + '%'; fr.style.height = (100 / z) + '%'; };
        apply();
      }
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
        if (a === 'view') { var vf = by(D.file, d.id); if (vf) { D.last = { id: d.id, t: Date.now() }; detail(vf); } }
        if (a === 'cvr') { var cf = by(D.file, d.id); if (cf) pickCover(cf); }
        if (a === 'fcv') { var cfo = by(D.folder, d.id); if (cfo) pickCover(cfo); }
        if (a === 'fcvx') { var cfx = by(D.folder, d.id); if (cfx) clearCover(cfx); }
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
        if (a === 'delfile') { var f = by(D.file, d.id); if (f && confirm('Hapus "' + f.name + '" dari Document Center?')) { rmb(f.id); rmb('cv-' + f.id); dropThumb(f.id); if (D.last && D.last.id === f.id) D.last = null; D.file = D.file.filter(function (x) { return x.id !== f.id; }); } }
        if (a === 'delfolder') {
          var ids = kids(d.id), fl = D.file.filter(function (x) { return ids.indexOf(x.folderId) > -1; });
          if (confirm('Hapus folder ini beserta ' + (ids.length - 1) + ' subfolder dan ' + fl.length + ' dokumen di dalamnya?')) {
            fl.forEach(function (x) { rmb(x.id); rmb('cv-' + x.id); dropThumb(x.id); if (D.last && D.last.id === x.id) D.last = null; }); D.file = D.file.filter(function (x) { return ids.indexOf(x.folderId) < 0; }); D.folder = D.folder.filter(function (x) { return ids.indexOf(x.id) < 0; });
            ids.forEach(function (i) { rmb('cv-' + i); dropThumb(i); });
            if (ids.indexOf(st.f) > -1) st.f = '';
          }
        }
      },
      validate: function (e, r) { if (e === 'folder' && r.parentId && r.id && kids(r.id).indexOf(r.parentId) > -1) return 'Folder tidak bisa dipindahkan ke dalam dirinya sendiri.'; }
    };
  });
  MO.routes['#documents'] = docs.open;
})();
