/* MyOffice — Settings: profil, status kegiatan, cadangan data */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, chips = K.chips, badge = K.badge, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var cut = function (v, n) { return String(v || '').slice(0, n); };

  /* Terapkan nama panggilan & foto ke halaman utama */
  function apply() {
    var s = ls('mo-settings-v1'), i = document.querySelector('.avatar i'), h = document.getElementById('hiName');
    if (i) i.style.background = s.photo ? 'url("' + s.photo + '") center/cover no-repeat' : '';
    if (h) h.textContent = 'Assalamu’alaikum,' + (s.nick ? ' ' + s.nick + ',' : '');
  }
  apply();

  var GROUPS = ['Belum berjalan', 'Sedang berjalan', 'Menunggu / ditunda', 'Lewat tenggat', 'Selesai', 'Dibatalkan / arsip'];
  var DONE = /^(Selesai|Done|Tercapai)$/, CANC = /^(Dibatalkan|Archived)$/, RUN = /^(Sedang dikerjakan|In Progress|Berjalan|Dikerjakan|Review)$/, WAIT = /^(Ditunda|Waiting)$/;
  function cls(status, due, td) {
    if (DONE.test(status)) return GROUPS[4]; if (CANC.test(status)) return GROUPS[5];
    if (due && cut(due, 10) < td) return GROUPS[3];
    if (WAIT.test(status)) return GROUPS[2]; if (RUN.test(status)) return GROUPS[1]; return GROUPS[0];
  }
  function gather() {
    var td = K.todayS(), out = [], A = ls('mo-acad-v1'), W = ls('mo-work-v1'), O = ls('mo-org-v1'), P = ls('mo-proj-v1'), T = ls('mo-task-v1'), G = ls('mo-goal-v1');
    var put = function (mod, route, title, status, due) { out.push({ mod: mod, route: route, title: title, status: status, due: due, g: cls(status, due, td) }); };
    (T.task || []).forEach(function (t) { put('Task', '#task', t.title, t.status, t.due); });
    (A.task || []).forEach(function (t) { put('Tugas kuliah', '#academic', t.title, t.status, t.deadline); });
    (A.exam || []).forEach(function (e) {
      var c = (A.course || []).filter(function (x) { return x.id === e.courseId; })[0], d = cut(e.date, 10);
      put('Ujian', '#academic', e.type + (c ? ' — ' + c.name : ''), (d && d < td) || (e.score !== '' && e.score != null) ? 'Selesai' : 'Belum', d && d >= td ? '' : '');
    });
    (W.job || []).forEach(function (j) { put('Pekerjaan', '#work', j.title, j.status, j.deadline); });
    (W.wtask || []).forEach(function (t) { put('Tugas kerja', '#work', t.title, t.status, t.deadline); });
    (O.followup || []).forEach(function (f) { put('Organisasi', '#organization', f.task, f.status === 'Belum' ? 'Belum' : f.status, f.due); });
    (P.proj || []).forEach(function (p) { put('Proyek', '#project', p.name, p.status, p.target); });
    (P.ptask || []).forEach(function (t) { put('Tugas proyek', '#project', t.title, t.status, t.due); });
    (G.goal || []).forEach(function (g) { put('Goal', '#goal', g.name, g.status, g.deadline); });
    return out;
  }

  var set = K.App('Settings', 'mo-settings-v1', function () { return { nick: '', photo: '' }; }, function (app) {
    var D = app.D, st = app.st;
    function vProf() {
      var nm = D.nick || 'Pengguna';
      return '<div class="ac-card"><div class="pv"><div class="ph" style="' + (D.photo ? 'background-image:url(&quot;' + D.photo + '&quot;)' : '') + '"></div><div><h3 style="font-size:18px">' + esc(nm) + '</h3><small style="opacity:.7">Sapaan di beranda: Assalamu’alaikum, ' + esc(D.nick || '…') + ',</small></div></div>' +
        '<div class="cfgrow"><label>Nama panggilan</label><div style="display:flex;gap:8px"><input type="text" maxlength="30" value="' + esc(D.nick) + '" placeholder="Nama panggilan" aria-label="Nama panggilan"><button class="ac-btn pri" data-act="savenick">Simpan</button></div></div>' +
        '<div class="cfgrow"><label>Foto profil</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="ac-btn" style="cursor:pointer;display:inline-block">Pilih foto<input type="file" accept="image/*" hidden data-chg="photo"></label>' + (D.photo ? '<button class="ac-btn danger" data-act="rmphoto">Hapus foto</button>' : '') + '</div></div>' +
        '<p class="ac-hint">Foto dipotong persegi dan dikecilkan, disimpan hanya di browser ini.</p></div>';
    }
    function vStat() {
      var all = gather(), g = st.sg || 'Semua', L = all.filter(function (x) { return g === 'Semua' || x.g === g; }).sort(function (a, b) { return (a.due || '9').localeCompare(b.due || '9'); });
      var h = '<p class="ac-hint" style="margin-bottom:10px">Ringkasan kegiatan dari semua modul. Klik item untuk membuka modulnya.</p><div class="ac-chips">' + ['Semua'].concat(GROUPS).map(function (x) { var n = x === 'Semua' ? all.length : all.filter(function (i) { return i.g === x; }).length; return '<button class="ac-chip" aria-pressed="' + (x === g) + '" data-act="filt" data-f="sg" data-v="' + x + '">' + x + ' (' + n + ')</button>'; }).join('') + '</div>';
      if (!L.length) return h + empty('Tidak ada kegiatan pada status ini.');
      return h + L.map(function (x) {
        return '<div class="ac-item"><div><button class="t" data-act="go" data-r="' + x.route + '">' + esc(x.title) + '</button>' + badge(x.mod) + (x.g === GROUPS[3] ? badge('Lewat tenggat', 'late') : '') + '<small>' + esc(x.status) + (x.due ? ' · tenggat ' + fd(cut(x.due, 10)) : '') + '</small></div></div>';
      }).join('');
    }
    function vData() {
      var keys = Object.keys(localStorage).filter(function (k) { return k.indexOf('mo-') === 0 && k !== 'mo-fired'; });
      return '<div class="ac-card"><b>Cadangan data</b><p class="ac-hint" style="margin:4px 0 10px">Semua data tersimpan hanya di browser ini (' + keys.length + ' kelompok data). Buat cadangan agar tidak hilang jika data browser dibersihkan. File di Document Center tidak ikut dicadangkan.</p><div class="ac-acts"><button class="ac-btn pri" data-act="export">Unduh cadangan (.json)</button><label class="ac-btn" style="cursor:pointer;display:inline-block">Pulihkan dari cadangan<input type="file" accept="application/json,.json" hidden data-chg="import"></label></div></div>' +
        '<div class="ac-card"><b>Hapus semua data</b><p class="ac-hint" style="margin:4px 0 10px">Menghapus seluruh data MyOffice di browser ini, termasuk dokumen. Tidak bisa dibatalkan.</p><button class="ac-btn danger" data-act="wipe">Hapus semua data</button></div>';
    }
    return {
      specs: {}, tabs: [['prof', 'Profil', vProf], ['stat', 'Status Kegiatan', vStat], ['data', 'Data & Cadangan', vData]],
      sub: function () { return D.nick ? 'Halo, ' + D.nick : 'Atur profil Anda'; },
      act: function (a, d, t) {
        if (a === 'savenick') { D.nick = t.parentNode.querySelector('input').value.trim().slice(0, 30); app.save(); apply(); }
        if (a === 'rmphoto') { D.photo = ''; app.save(); apply(); }
        if (a === 'go' && MO.routes[d.r]) MO.routes[d.r]();
        if (a === 'photo') {
          var f = t.files && t.files[0]; t.value = ''; if (!f) return;
          var r = new FileReader();
          r.onload = function () {
            var im = new Image();
            im.onload = function () {
              var s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 256;
              c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 256, 256);
              D.photo = c.toDataURL('image/jpeg', 0.85); app.save(); app.render(); apply();
            };
            im.onerror = function () { MO.msg('Gagal', 'File bukan gambar yang valid.'); };
            im.src = r.result;
          };
          r.readAsDataURL(f);
        }
        if (a === 'export') {
          var o = { app: 'MyOffice', exported: new Date().toISOString(), data: {} };
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mo-') === 0 && k !== 'mo-fired') o.data[k] = localStorage.getItem(k); });
          var u = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })), l = document.createElement('a');
          l.href = u; l.download = 'myoffice-cadangan-' + K.todayS() + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
        }
        if (a === 'import') {
          var fl = t.files && t.files[0]; t.value = ''; if (!fl) return;
          fl.text().then(function (x) {
            var o = JSON.parse(x); if (!o || o.app !== 'MyOffice' || !o.data) throw 0;
            if (!confirm('Pulihkan ' + Object.keys(o.data).length + ' kelompok data? Data saat ini akan ditimpa.')) return;
            Object.keys(o.data).forEach(function (k) { if (k.indexOf('mo-') === 0) localStorage.setItem(k, o.data[k]); });
            location.reload();
          }).catch(function () { MO.msg('Gagal', 'Berkas cadangan tidak valid.'); });
        }
        if (a === 'wipe' && confirm('Hapus SEMUA data MyOffice di browser ini?') && confirm('Yakin? Tindakan ini tidak bisa dibatalkan.')) {
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mo-') === 0) localStorage.removeItem(k); });
          try { indexedDB.deleteDatabase('mo-docs'); } catch (e) { }
          location.reload();
        }
      }
    };
  });
  MO.routes['#settings'] = set.open;
})();
