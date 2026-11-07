/* Beresin — Sambung Perangkat: kode sambung (teks) + QR animasi, PIN opsional (AES-GCM) */
(function () {
  'use strict';
  var Q = window.__QR, S = { parts: {}, n: 0, sid: '' }, $ = function (s) { return document.querySelector(s); };
  var b64 = function (u) { var s = ''; for (var i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  var unb = function (t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  var pipe = function (u, C, m) { return new Response(new Blob([u]).stream().pipeThrough(new C(m))).arrayBuffer().then(function (b) { return new Uint8Array(b); }); };
  var gz = function (u) { return pipe(u, CompressionStream, 'gzip'); }, gun = function (u) { return pipe(u, DecompressionStream, 'gzip'); };
  var kd = function (pin, salt, use) { return crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']).then(function (k) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, [use]); }); };
  function msg(t, bad) { var e = $('#sy-msg'); if (e) { e.textContent = t; e.className = 'ac-hint sy-msg' + (bad ? ' bad' : ''); } }

  function make(pin) {
    var o = { app: 'Beresin', t: Date.now(), d: {} };
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mo-') === 0 && k !== 'mo-fired') o.d[k] = localStorage.getItem(k); });
    return gz(new TextEncoder().encode(JSON.stringify(o))).then(function (z) {
      if (!pin) return 'BRS1.' + b64(z);
      var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      return kd(pin, salt, 'encrypt').then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, z); }).then(function (c) {
        var c8 = new Uint8Array(c), a = new Uint8Array(28 + c8.length); a.set(salt); a.set(iv, 16); a.set(c8, 28); return 'BRS2.' + b64(a);
      });
    });
  }
  function read(code, pin) {
    var m = /^BRS([12])\.(.+)$/.exec(code.replace(/\s+/g, '')); if (!m) return Promise.reject('fmt');
    var u = unb(m[2]), p = m[1] === '1' ? Promise.resolve(u) : kd(pin || '', u.subarray(0, 16), 'decrypt').then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(16, 28) }, k, u.subarray(28)); }).then(function (b) { return new Uint8Array(b); }).catch(function () { throw 'pin'; });
    return p.then(gun).then(function (z) { var o = JSON.parse(new TextDecoder().decode(z)); if (o.app !== 'Beresin' || !o.d) throw 'fmt'; return o; });
  }
  /* gabung: item ber-id baru ditambahkan; data lokal tidak ditimpa */
  function merge(k, inc) {
    var a, b; try { a = JSON.parse(localStorage.getItem(k)); b = JSON.parse(inc); } catch (e) { return inc; }
    if (!a || typeof a !== 'object' || !b || typeof b !== 'object') return inc;
    Object.keys(b).forEach(function (p) {
      var x = a[p], y = b[p];
      if (Array.isArray(x) && Array.isArray(y)) { var ids = {}; x.forEach(function (i) { if (i && i.id != null) ids[i.id] = 1; }); y.forEach(function (i) { if (!(i && i.id != null && ids[i.id])) x.push(i); }); }
      else if (x == null || x === '') a[p] = y;
    });
    return JSON.stringify(a);
  }

  var timer = 0, stream = 0, scanT = 0;
  function draw(txt) {
    var q = new Q(-1, 1), c = $('#sy-qr'); q.addData(txt); q.make(); if (!c) return;
    var n = q.getModuleCount(), sc = Math.max(2, Math.floor(320 / (n + 8))), z = (n + 8) * sc, g = c.getContext('2d'); c.width = c.height = z;
    g.fillStyle = '#fff'; g.fillRect(0, 0, z, z); g.fillStyle = '#14213d';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + 4) * sc, (r + 4) * sc, sc, sc);
  }
  function streamQR(code) {
    clearInterval(timer); var sid = Math.random().toString(36).slice(2, 6), L = 600, P = [], i = 0;
    for (var j = 0; j < code.length; j += L) P.push(code.slice(j, j + L));
    var tick = function () { draw('BRS|' + sid + '|' + i + '|' + P.length + '|' + P[i]); $('#sy-qp').textContent = 'QR ' + (i + 1) + ' / ' + P.length + (P.length > 1 ? ' — arahkan kamera perangkat tujuan, biarkan berputar' : ''); i = (i + 1) % P.length; };
    tick(); if (P.length > 1) timer = setInterval(tick, 700);
  }
  function stopScan() { clearInterval(scanT); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = 0; var v = $('#sy-vid'); if (v) v.hidden = true; }
  function scan() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return msg('Browser ini belum bisa memindai QR. Pakai kode teks (salin–tempel).', 1);
    var det = new BarcodeDetector({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (st) {
      stream = st; var v = $('#sy-vid'); v.srcObject = st; v.hidden = false; v.play(); S.parts = {}; S.sid = ''; msg('Memindai… arahkan ke QR di perangkat asal.');
      scanT = setInterval(function () {
        det.detect(v).then(function (rs) {
          rs.forEach(function (b) {
            var m = /^BRS\|(\w+)\|(\d+)\|(\d+)\|([\s\S]*)$/.exec(b.rawValue); if (!m) return;
            if (S.sid !== m[1]) { S.sid = m[1]; S.parts = {}; } S.n = +m[3]; S.parts[m[2]] = m[4];
            var got = Object.keys(S.parts).length; msg('Diterima ' + got + ' dari ' + S.n + ' bagian…');
            if (got === S.n) { var c = ''; for (var i = 0; i < S.n; i++) c += S.parts[i]; stopScan(); $('#sy-in').value = c; msg('Kode lengkap diterima. Tekan “Terapkan”.'); }
          });
        }).catch(function () { });
      }, 250);
    }).catch(function () { msg('Kamera tidak bisa dibuka. Izinkan akses kamera.', 1); });
  }

  var A = {
    make: function () {
      var pin = ($('#sy-pin').value || '').trim(); msg('Menyiapkan kode…');
      make(pin).then(function (c) { $('#sy-out').hidden = false; $('#sy-code').value = c; streamQR(c); msg(pin ? 'Kode terkunci PIN. Beri tahu PIN ke perangkat tujuan secara terpisah.' : 'Kode dibuat tanpa PIN — jangan bagikan ke orang lain.'); }).catch(function () { msg('Gagal membuat kode.', 1); });
    },
    copy: function () { var t = $('#sy-code').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { msg('Kode disalin.'); }).catch(function () { $('#sy-code').select(); document.execCommand('copy'); msg('Kode disalin.'); }); },
    share: function () { var t = $('#sy-code').value; if (navigator.share) navigator.share({ title: 'Kode sambung Beresin', text: t }).catch(function () { }); else A.copy(); },
    stop: function () { clearInterval(timer); $('#sy-out').hidden = true; $('#sy-code').value = ''; },
    scan: scan,
    apply: function () {
      var code = $('#sy-in').value.trim(); if (!code) return msg('Tempel atau pindai kode sambung dulu.', 1);
      read(code, $('#sy-pin2').value.trim()).then(function (o) {
        var ow = $('#sy-mode').value === 'o', ks = Object.keys(o.d);
        if (!confirm((ow ? 'TIMPA semua data di perangkat ini dengan ' : 'Gabungkan ') + ks.length + ' kelompok data dari perangkat asal?')) return;
        ks.forEach(function (k) { if (k.indexOf('mo-') === 0) localStorage.setItem(k, ow || localStorage.getItem(k) == null ? o.d[k] : merge(k, o.d[k])); });
        msg('Berhasil. Memuat ulang…'); setTimeout(function () { location.reload(); }, 600);
      }).catch(function (e) { msg(e === 'pin' ? 'PIN salah atau kode rusak.' : 'Kode tidak valid.', 1); });
    }
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-sy]'); if (b && A[b.dataset.sy]) A[b.dataset.sy](); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopScan(); });

  window.BeresinSync = {
    html: function () {
      return '<div class="ac-card sy-card"><div class="sy-h"><i class="sy-ic">⇄</i><div><b>Kirim dari perangkat ini</b><p class="ac-hint">Buat kode sambung atau QR, lalu terima di HP/laptop lain.</p></div></div>' +
        '<div class="sy-row"><input id="sy-pin" type="password" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="PIN pengaman (opsional)" aria-label="PIN"><button class="ac-btn pri" data-sy="make">Buat kode sambung</button></div>' +
        '<div id="sy-out" hidden><div class="sy-qrbox"><canvas id="sy-qr" aria-label="QR sambung"></canvas></div><div id="sy-qp" class="ac-hint sy-qp"></div><textarea id="sy-code" readonly rows="3"></textarea>' +
        '<div class="ac-acts"><button class="ac-btn" data-sy="copy">Salin</button><button class="ac-btn" data-sy="share">Bagikan</button><button class="ac-btn danger" data-sy="stop">Tutup</button></div></div></div>' +
        '<div class="ac-card sy-card"><div class="sy-h"><i class="sy-ic">⬇</i><div><b>Terima di perangkat ini</b><p class="ac-hint">Tempel kode atau pindai QR dari perangkat asal.</p></div></div>' +
        '<textarea id="sy-in" rows="3" placeholder="Tempel kode sambung (BRS1… / BRS2…)"></textarea>' +
        '<div class="sy-row"><input id="sy-pin2" type="password" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="PIN (jika ada)" aria-label="PIN"><select id="sy-mode" aria-label="Mode"><option value="m">Gabung (aman)</option><option value="o">Timpa semua</option></select></div>' +
        '<video id="sy-vid" hidden playsinline muted></video><div class="ac-acts"><button class="ac-btn" data-sy="scan">Pindai QR</button><button class="ac-btn pri" data-sy="apply">Terapkan</button></div>' +
        '<p id="sy-msg" class="ac-hint sy-msg"></p><p class="ac-hint">Yang disambungkan: semua modul (Task, Academic, Finance, Goal, Kalender, dll). File di Document Center tidak ikut.</p></div>';
    }
  };
})();
