/* MyOffice — Document Center. Metadata di localStorage, isi berkas asli di IndexedDB browser. */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, empty = K.empty, badge = K.badge;
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
  var icon = function (f) { var t = f.type || '', n = f.name.toLowerCase(); return /^image\//.test(t) ? '🖼️' : /pdf/.test(t) ? '📕' : /word|\.docx?$/.test(t + n) ? '📘' : /sheet|excel|\.xlsx?$|\.csv$/.test(t + n) ? '📗' : /presentation|powerpoint|\.pptx?$/.test(t + n) ? '📙' : /^(audio|video)\//.test(t) ? '🎞️' : /^text\//.test(t) ? '📝' : '📄'; };

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
    function fileRow(f, showPath) {
      return '<div class="ac-item"><div><button class="t" data-act="view" data-id="' + f.id + '">' + icon(f) + ' ' + esc(f.name) + '</button><small>' + size(f.size) + ' · ' + esc((f.type || 'berkas').split('/').pop()) + ' · ' + fd(f.added) + (showPath ? ' · 📁 ' + esc(pstr(f.folderId)) : '') + (f.tags ? ' · #' + esc(f.tags.split(',').map(function (x) { return x.trim(); }).filter(Boolean).join(' #')) : '') + '</small>' + (f.notes ? '<small>' + esc(f.notes) + '</small>' : '') + '</div><div class="ac-acts"><button class="ac-btn sm" data-act="view" data-id="' + f.id + '">Buka</button><button class="ac-btn sm" data-act="dl" data-id="' + f.id + '">Unduh</button><button class="ac-btn sm" data-act="edit" data-e="file" data-id="' + f.id + '">Edit</button><button class="ac-btn sm danger" data-act="delfile" data-id="' + f.id + '">Hapus</button></div></div>';
    }
    function vDocs() {
      var q = (st.dq || '').toLowerCase().trim(), cur = st.f || '', total = D.file.reduce(function (a, f) { return a + (+f.size || 0); }, 0);
      var crumbs = '<button class="ac-chip" data-act="cd" data-id="">📁 Dokumen</button>' + path(cur).map(function (f) { return '<button class="ac-chip" data-act="cd" data-id="' + f.id + '">' + esc(f.name) + '</button>'; }).join('');
      var h = '<div class="tb"><input type="text" data-in="dq" placeholder="Cari nama, tag, catatan, atau isi berkas teks…" value="' + esc(st.dq || '') + '" aria-label="Cari dokumen" style="flex:3 1 220px"><button class="ac-btn" data-act="add" data-e="folder" data-pre="' + esc(JSON.stringify({ parentId: cur })) + '">+ Folder</button><label class="ac-btn pri" style="cursor:pointer;display:inline-block">Unggah dokumen<input type="file" multiple hidden data-chg="upload"></label></div>';
      if (q) {
        var F = D.file.filter(function (f) { return (f.name + ' ' + (f.tags || '') + ' ' + (f.notes || '') + ' ' + (f.idx || '')).toLowerCase().indexOf(q) > -1; }), Fo = D.folder.filter(function (f) { return f.name.toLowerCase().indexOf(q) > -1; });
        h += '<p class="ac-hint" style="margin-bottom:8px">' + (F.length + Fo.length) + ' hasil untuk "' + esc(st.dq) + '"</p>';
        return h + (Fo.map(function (f) { return '<div class="ac-item"><div><button class="t" data-act="cd" data-id="' + f.id + '">📁 ' + esc(f.name) + '</button><small>' + esc(pstr(f.parentId)) + '</small></div></div>'; }).join('') + F.map(function (f) { return fileRow(f, true); }).join('') || empty('Tidak ada hasil.'));
      }
      var sub = D.folder.filter(function (f) { return (f.parentId || '') === cur; }).sort(function (a, b) { return a.name.localeCompare(b.name); }), fl = D.file.filter(function (f) { return (f.folderId || '') === cur; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      h += '<div class="ac-chips">' + crumbs + '</div><p class="ac-hint" style="margin-bottom:8px">' + D.file.length + ' dokumen · ' + size(total) + ' tersimpan di browser ini. Pencarian isi berkas hanya untuk berkas teks (.txt, .md, .csv, .json).</p>';
      h += sub.map(function (f) { var n = D.file.filter(function (x) { return x.folderId === f.id; }).length + D.folder.filter(function (x) { return x.parentId === f.id; }).length; return '<div class="ac-item"><div><button class="t" data-act="cd" data-id="' + f.id + '">📁 ' + esc(f.name) + '</button><small>' + n + ' item</small></div><div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="folder" data-id="' + f.id + '">Edit</button><button class="ac-btn sm danger" data-act="delfolder" data-id="' + f.id + '">Hapus</button></div></div>'; }).join('') + fl.map(function (f) { return fileRow(f); }).join('');
      return h + (sub.length || fl.length ? '' : empty('Folder ini kosong. Unggah dokumen atau buat folder baru.'));
    }
    function viewer(f, blob) {
      var url = URL.createObjectURL(blob), t = f.type || blob.type || '', body;
      var done = function (b) {
        var m = el2('ac-ov ac-ov2', '<div class="ac-win vw"><header><div><h2 style="font-size:20px">' + esc(f.name) + '</h2><p>' + size(f.size) + ' · ' + esc(t || 'berkas') + '</p></div><button class="ac-x" data-x aria-label="Tutup">×</button></header><div class="ac-body">' + b + '</div><div class="ac-foot"><a class="ac-btn" href="' + url + '" target="_blank" rel="noopener">Buka di tab baru</a><a class="ac-btn pri" href="' + url + '" download="' + esc(f.name) + '">Unduh</a></div></div>');
        document.body.appendChild(m);
        var off = function () { m.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); };
        m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
        m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
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
      specs: specs, tabs: [['d', 'Dokumen', vDocs]], sub: function () { return D.file.length + ' dokumen · ' + D.folder.length + ' folder'; },
      cascade: { folder: [] },
      act: function (a, d, t) {
        if (a === 'cd') { st.f = d.id || ''; st.dq = ''; }
        if (a === 'view') withBlob(d.id, viewer);
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
        if (a === 'delfile') { var f = by(D.file, d.id); if (f && confirm('Hapus "' + f.name + '" dari Document Center?')) { rmb(f.id); D.file = D.file.filter(function (x) { return x.id !== f.id; }); } }
        if (a === 'delfolder') {
          var ids = kids(d.id), fl = D.file.filter(function (x) { return ids.indexOf(x.folderId) > -1; });
          if (confirm('Hapus folder ini beserta ' + (ids.length - 1) + ' subfolder dan ' + fl.length + ' dokumen di dalamnya?')) {
            fl.forEach(function (x) { rmb(x.id); }); D.file = D.file.filter(function (x) { return ids.indexOf(x.folderId) < 0; }); D.folder = D.folder.filter(function (x) { return ids.indexOf(x.id) < 0; });
            if (ids.indexOf(st.f) > -1) st.f = '';
          }
        }
      },
      validate: function (e, r) { if (e === 'folder' && r.parentId && r.id && kids(r.id).indexOf(r.parentId) > -1) return 'Folder tidak bisa dipindahkan ke dalam dirinya sendiri.'; }
    };
  });
  MO.routes['#documents'] = docs.open;
})();
