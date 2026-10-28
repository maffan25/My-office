/* MyOffice — Kalender (data di localStorage perangkat) */
(function () {
  'use strict';
  var MO = window.MyOffice, K = MO.kit, esc = K.esc, fd = K.fd, by = K.by, chips = K.chips, opt = K.opt, badge = K.badge, add = K.add, btns = K.btns, empty = K.empty;
  var ls = function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var MN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], DL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var HM = ['Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban', 'Ramadan', 'Syawal', 'Dzulkaidah', 'Dzulhijjah'];
  var dn = function (s) { var a = s.split('-'); return Math.round(Date.UTC(+a[0], a[1] - 1, +a[2]) / 864e5); };
  var addD = function (s, n) { return new Date((dn(s) + n) * 864e5).toISOString().slice(0, 10); };
  var dow = function (s) { return new Date(dn(s) * 864e5).getUTCDay(); };
  var tmin = function (t) { var a = (t || '0:0').split(':'); return +a[0] * 60 + +a[1]; };
  var hhmm = function (m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); };
  var CF = { wk: 1, tz: 'auto', mode: 'both', hij: 0 };
  var PAL = [['', 'Ikuti kategori'], ['#4f7cff', 'Biru'], ['#2f9e6b', 'Hijau'], ['#d99a2b', 'Kuning'], ['#d0443e', 'Merah'], ['#8a5fb5', 'Ungu'], ['#d4608f', 'Pink'], ['#5f6b7a', 'Abu-abu']];

  /* ---------- Zona waktu & Hijriah ---------- */
  function nowP() {
    var o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, p = {};
    if (CF.tz && CF.tz !== 'auto') o.timeZone = CF.tz;
    try { new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return { date: p.year + '-' + p.month + '-' + p.day, min: (+p.hour % 24) * 60 + +p.minute }; }
    catch (e) { var d = new Date(); return { date: K.todayS(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function tzOff(ts, tz) {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; });
    return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
  }
  function zUtc(date, time, tz) {
    var a = date.split('-'), t = (time || '00:00').split(':');
    if (!tz || tz === 'auto') return new Date(+a[0], a[1] - 1, +a[2], +t[0], +t[1]).getTime();
    var g = Date.UTC(+a[0], a[1] - 1, +a[2], +t[0], +t[1]); try { return g - tzOff(g, tz); } catch (e) { return g; }
  }
  function hij(s) {
    var d = new Date((dn(s) + (+CF.hij || 0)) * 864e5 + 432e5), p = {};
    try { new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); }
    catch (e) { return null; }
    return { d: +p.day, m: +p.month, y: parseInt(p.relatedYear || p.year, 10) };
  }

  var cal = K.App('Kalender', 'mo-cal-v1', function () {
    return { ev: [], cat: [{ id: 'c1', name: 'Kuliah', color: '#4f7cff' }, { id: 'c2', name: 'Pekerjaan', color: '#d99a2b' }, { id: 'c3', name: 'Organisasi', color: '#8a5fb5' }, { id: 'c4', name: 'Pribadi', color: '#2f9e6b' }, { id: 'c5', name: 'Ibadah', color: '#d4608f' }], set: { wk: 1, tz: 'auto', mode: 'both', hij: 0 } };
  }, function (app) {
    var D = app.D, st = app.st; D.set = Object.assign({ wk: 1, tz: 'auto', mode: 'both', hij: 0 }, D.set); CF = D.set;
    var projects = function () { return ls('mo-proj-v1').proj || []; }, courses = function () { return ls('mo-acad-v1').course || []; }, TK = [];
    var color = function (e) { return e.color || (by(D.cat, e.catId) || {}).color || '#4f7cff'; };
    var rng = function (e) {
      var s = dn(e.start) * 1440 + (e.allDay ? 0 : tmin(e.startTime)), en = e.allDay ? (dn(e.end || e.start) + 1) * 1440 : (e.endTime ? dn(e.end || e.start) * 1440 + tmin(e.endTime) : s);
      return [s, en];
    };
    var onDay = function (day) { var a = dn(day) * 1440, b = a + 1440; return D.ev.filter(function (e) { var r = rng(e); return r[0] < b && (r[1] > a || (r[1] === r[0] && r[0] >= a)); }); };
    var tasksOn = function (day) { return TK.filter(function (t) { return t.due === day; }); };
    var today = function () { return nowP().date; };
    var tl = function (e) { if (e.allDay) return 'Seharian'; return e.startTime + (e.endTime ? '–' + e.endTime : '') + (e.end && e.end !== e.start ? ' (s/d ' + fd(e.end) + ')' : ''); };
    var small = function (day) { var h = hij(day); return h ? h.d : ''; };
    var dayNum = function (day) {
      var m = +day.slice(8), h = hij(day);
      if (CF.mode === 'hijri' && h) return '<b>' + h.d + '<small>' + m + '</small></b>';
      return '<b>' + m + (CF.mode === 'both' && h ? '<small>' + h.d + '</small>' : '') + '</b>';
    };
    var hijStr = function (a, b) { var x = hij(a), y = hij(b); if (!x || !y) return ''; return (x.m === y.m ? HM[x.m - 1] : HM[x.m - 1] + '–' + HM[y.m - 1]) + ' ' + y.y + ' H'; };
    var mStr = function (a, b) { var x = new Date(dn(a) * 864e5), y = new Date(dn(b) * 864e5); return x.getUTCMonth() === y.getUTCMonth() ? MN[y.getUTCMonth()] + ' ' + y.getUTCFullYear() : MN[x.getUTCMonth()].slice(0, 3) + '–' + MN[y.getUTCMonth()].slice(0, 3) + ' ' + y.getUTCFullYear(); };
    function monthInfo(a) {
      if (CF.mode === 'hijri') {
        var x = hij(a); if (x) { var first = addD(a, -(x.d - 1)), len = 1; while (len < 31) { var y = hij(addD(first, len)); if (!y || y.m !== x.m) break; len++; } return { first: first, len: len }; }
      }
      var yy = +a.slice(0, 4), mm = +a.slice(5, 7); return { first: yy + '-' + pad(mm) + '-01', len: new Date(Date.UTC(yy, mm, 0)).getUTCDate() };
    }
    var specs = {
      ev: { title: 'Acara', def: { allDay: false, catId: 'c4', remind: '15' }, fields: [
        { k: 'title', l: 'Judul acara', t: 'text', req: 1, full: 1 },
        { k: 'catId', l: 'Kategori', t: 'select', o: function () { return [['', '—']].concat(D.cat.map(function (c) { return [c.id, c.name]; })); } },
        { k: 'color', l: 'Warna', t: 'select', o: PAL },
        { k: 'allDay', l: 'Seharian?', t: 'select', bool: 1, o: [['false', 'Tidak (ada jam)'], ['true', 'Ya, seharian']] },
        { k: 'remind', l: 'Pengingat', t: 'select', o: [['', 'Tanpa pengingat'], ['0', 'Tepat waktu'], ['5', '5 menit sebelum'], ['15', '15 menit sebelum'], ['30', '30 menit sebelum'], ['60', '1 jam sebelum'], ['1440', '1 hari sebelum']] },
        { k: 'start', l: 'Tanggal mulai', t: 'date', req: 1 }, { k: 'startTime', l: 'Jam mulai', t: 'time' },
        { k: 'end', l: 'Tanggal selesai', t: 'date' }, { k: 'endTime', l: 'Jam selesai', t: 'time' },
        { k: 'location', l: 'Lokasi', t: 'text', full: 1 },
        { k: 'projId', l: 'Terkait proyek', t: 'select', o: function () { return [['', '—']].concat(projects().map(function (p) { return [p.id, p.name]; })); } },
        { k: 'courseId', l: 'Terkait mata kuliah / jadwal kuliah', t: 'select', o: function () { return [['', '—']].concat(courses().map(function (c) { return [c.id, c.name + (c.schedule ? ' — ' + c.schedule : '')]; })); } },
        { k: 'goalRef', l: 'Terkait goal / milestone (jadwal belajar)', t: 'select', full: 1, o: function () { return MO.goalOpts ? MO.goalOpts() : [['', '—']]; } },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }] },
      cat: { title: 'Kategori Acara', def: { color: '#4f7cff' }, fields: [{ k: 'name', l: 'Nama kategori', t: 'text', req: 1, full: 1 }, { k: 'color', l: 'Warna', t: 'select', o: PAL.slice(1) }] }
    };
    function item(e, cls) {
      var rel = [(by(projects(), e.projId) || {}).name, (by(courses(), e.courseId) || {}).name].filter(Boolean).join(' · ');
      return '<button class="ev" style="--c:' + color(e) + '" data-act="edit" data-e="ev" data-id="' + e.id + '" title="' + esc(e.title + ' · ' + tl(e) + (e.location ? ' · ' + e.location : '') + (rel ? ' · ' + rel : '')) + '">' + (e.allDay ? '' : esc(e.startTime) + ' ') + esc(e.title) + '</button>';
    }
    var taskBtn = function (t) { return '<button class="ev tk' + (t.status === 'Done' ? ' dn' : '') + '" style="--c:#8a94a6" data-act="gotask" title="Tenggat tugas' + (t.dueTime ? ' ' + t.dueTime : '') + '">☑ ' + esc(t.title) + '</button>'; };

    function month(a, ttl) {
      var mi = monthInfo(a), first = mi.first, lead = (dow(first) - (+CF.wk) + 7) % 7, now = today(), sel = st.sel || now, i;
      var h = '<div class="kc-wrap"><div class="kc-cal"><div class="kc-nav"><button class="kc-nb" data-act="cnav" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>' + ttl + '</b><button class="kc-nb" data-act="cnav" data-d="1" aria-label="Bulan berikutnya">›</button></div><div class="kc-wk">';
      for (i = 0; i < 7; i++) h += '<span>' + DS[(+CF.wk + i) % 7] + '</span>';
      h += '</div><div class="kc-days">';
      for (i = 0; i < lead; i++) h += '<span class="kc-d out"></span>';
      for (i = 0; i < mi.len; i++) {
        var d = addD(first, i), busy = onDay(d).length + tasksOn(d).length > 0;
        h += '<button class="kc-d' + (d === now ? ' td' : '') + (d === sel ? ' sel' : '') + '" data-act="selday" data-d="' + d + '" aria-label="' + fd(d) + (busy ? ', ada kegiatan' : '') + '"' + (d === sel ? ' aria-pressed="true"' : '') + '>' + dayNum(d) + (busy ? '<u class="kc-dot"></u>' : '') + '</button>';
      }
      h += '</div><div class="kc-foot"><span><i></i>Ada kegiatan</span><button class="kc-today" data-act="cnav" data-d="0">Kembali ke hari ini</button></div></div>';
      var ev = onDay(sel).sort(function (x, y) { return rng(x)[0] - rng(y)[0]; }), tk = tasksOn(sel);
      h += '<aside class="kc-side" aria-live="polite"><small>' + DL[dow(sel)] + ', ' + (+sel.slice(8)) + ' ' + MN[+sel.slice(5, 7) - 1] + ' ' + sel.slice(0, 4) + '</small>';
      if (!ev.length && !tk.length) h += '<p>Belum ada kegiatan pada tanggal ini.</p>';
      ev.forEach(function (e) { h += '<button class="kc-ev" style="--c:' + color(e) + '" data-act="edit" data-e="ev" data-id="' + e.id + '"><i></i><div><b>' + esc(e.title) + '</b><small>' + esc(tl(e)) + (e.location ? ' · ' + esc(e.location) : '') + '</small></div></button>'; });
      tk.forEach(function (t) { h += '<button class="kc-ev" style="--c:#8a94a6" data-act="gotask"><i></i><div><b>' + esc(t.title) + '</b><small>Tenggat tugas · ' + esc(t.status) + (t.dueTime ? ' · ' + t.dueTime : '') + '</small></div></button>'; });
      return h + '<button class="kc-add" data-act="newday" data-d="' + sel + '">+ Tambah kegiatan</button></aside></div>';
    }
    function lanes(S) {
      S.sort(function (x, y) { return x.s - y.s || y.en - x.en; });
      var cl = [], cur = null;
      S.forEach(function (x) {
        if (!cur || x.s >= cur.end) { cur = { end: 0, items: [], ln: [] }; cl.push(cur); }
        var li = -1; cur.ln.forEach(function (e, j) { if (li < 0 && e <= x.s) li = j; });
        if (li < 0) { li = cur.ln.length; cur.ln.push(0); }
        cur.ln[li] = x.en; x.l = li; cur.items.push(x); cur.end = Math.max(cur.end, x.en);
      });
      cl.forEach(function (c) { c.items.forEach(function (x) { x.n = c.ln.length; }); });
    }
    function grid(days) {
      var np = nowP(), h = '<div class="tgw"><div class="tg" style="--n:' + days.length + ';--mw:' + (days.length > 1 ? 640 : 0) + 'px"><div class="lb"></div>';
      days.forEach(function (d) { h += '<div class="hh" data-act="goday" data-d="' + d + '"' + (d === np.date ? ' style="font-weight:600"' : '') + '>' + DS[dow(d)] + '<small>' + +d.slice(8) + (CF.mode !== 'masehi' && hij(d) ? ' · ' + small(d) : '') + '</small></div>'; });
      h += '<div class="lb">Seharian</div>';
      days.forEach(function (d) { h += '<div class="ad">' + onDay(d).filter(function (e) { return e.allDay; }).map(function (e) { return item(e); }).join('') + tasksOn(d).map(taskBtn).join('') + '</div>'; });
      h += '<div class="hours">'; for (var i = 0; i < 24; i++) h += '<div>' + pad(i) + ':00</div>'; h += '</div>';
      days.forEach(function (d) {
        var a = dn(d) * 1440, S = onDay(d).filter(function (e) { return !e.allDay; }).map(function (e) {
          var r = rng(e), s = Math.max(r[0], a) - a, en = r[1] === r[0] ? s + 25 : Math.min(r[1], a + 1440) - a; return { e: e, s: s, en: en };
        });
        lanes(S);
        h += '<div class="col" data-act="slot" data-d="' + d + '">' + S.map(function (x) {
          var hgt = Math.max(20, (x.en - x.s) * 0.8);
          return '<button class="ev" style="--c:' + color(x.e) + ';top:' + (x.s * 0.8) + 'px;height:' + hgt + 'px;left:' + (x.l * 100 / x.n) + '%;width:calc(' + (100 / x.n) + '% - 3px)" data-act="edit" data-e="ev" data-id="' + x.e.id + '"><b>' + esc(x.e.title) + '</b>' + (hgt > 34 ? '<br>' + tl(x.e) + (x.e.location ? ' · ' + esc(x.e.location) : '') : '') + '</button>';
        }).join('') + (d === np.date ? '<div class="now" style="top:' + (np.min * 0.8) + 'px"></div>' : '') + '</div>';
      });
      return h + '</div></div><p class="ac-hint" style="margin-top:8px">Acara tanpa jam selesai ditampilkan sebagai penanda singkat. Tugas yang hanya punya tenggat muncul di baris "Seharian", bukan sebagai blok jam.</p>';
    }
    function agenda(a) {
      var h = '', any = false;
      for (var i = 0; i < 30; i++) {
        var d = addD(a, i), ev = onDay(d).sort(function (x, y) { return rng(x)[0] - rng(y)[0]; }), tk = tasksOn(d);
        if (!ev.length && !tk.length) continue; any = true;
        var hh = hij(d);
        h += '<div class="dayh">' + DL[dow(d)] + ', ' + fd(d) + (CF.mode !== 'masehi' && hh ? '<small>' + hh.d + ' ' + HM[hh.m - 1] + ' ' + hh.y + ' H</small>' : '') + '</div>';
        ev.forEach(function (e) {
          var c = by(D.cat, e.catId), rel = [(by(projects(), e.projId) || {}).name, (by(courses(), e.courseId) || {}).name].filter(Boolean).join(' · ');
          h += '<div class="aitem" style="--c:' + color(e) + ';cursor:pointer" data-act="edit" data-e="ev" data-id="' + e.id + '"><span class="tm">' + tl(e) + '</span><div><b>' + esc(e.title) + '</b><small>' + [c && c.name, e.location, rel, e.remind !== '' && e.remind != null ? '🔔 ' + (+e.remind ? e.remind + ' mnt sebelum' : 'tepat waktu') : ''].filter(Boolean).map(esc).join(' · ') + '</small></div></div>';
        });
        tk.forEach(function (t) { h += '<div class="aitem" style="--c:#8a94a6;cursor:pointer" data-act="gotask"><span class="tm">Tenggat</span><div>☑ ' + esc(t.title) + '<small>' + esc(t.status) + (t.dueTime ? ' · ' + t.dueTime : '') + '</small></div></div>'; });
      }
      return any ? h : empty('Tidak ada agenda dalam 30 hari ke depan.');
    }
    function vCal() {
      TK = (ls('mo-task-v1').task || []).filter(function (t) { return t.due && t.status !== 'Archived'; });
      var a = st.d || today(), v = st.v || 'Monthly', ttl = '', body;
      if (v === 'Monthly') {
        var mi = monthInfo(a), last = addD(mi.first, mi.len - 1);
        ttl = CF.mode === 'hijri' ? hijStr(mi.first, last) + ' <small style="opacity:.6">' + mStr(mi.first, last) + '</small>' : mStr(mi.first, last) + (CF.mode === 'both' ? ' <small style="opacity:.6">' + hijStr(mi.first, last) + '</small>' : '');
        body = month(a, ttl);
      } else if (v === 'Weekly') {
        var s = addD(a, -((dow(a) - +CF.wk + 7) % 7)), days = []; for (var i = 0; i < 7; i++) days.push(addD(s, i));
        ttl = fd(days[0]) + ' – ' + fd(days[6]); body = grid(days);
      } else if (v === 'Daily') {
        var hh = hij(a); ttl = DL[dow(a)] + ', ' + fd(a) + (CF.mode !== 'masehi' && hh ? ' <small style="opacity:.6">' + hh.d + ' ' + HM[hh.m - 1] + ' ' + hh.y + ' H</small>' : ''); body = grid([a]);
      } else { ttl = 'Agenda 30 hari dari ' + fd(a); body = agenda(a); }
      if (v === 'Monthly') return '<div class="kc-top"><h3>Kalender kegiatan</h3><p>Pilih tanggal untuk melihat detail kegiatan. Titik emas menandai hari yang memiliki agenda.</p></div><div class="kc-tools">' +
        chips(['Daily', 'Weekly', 'Monthly', 'Agenda List'].map(function (x) { return x === 'Agenda List' ? 'Agenda' : x; }), 'Monthly', 'v') + add('ev', 'Acara') + '</div>' + body;
      return '<div class="ac-bar"><div class="ac-acts"><button class="ac-btn sm" data-act="cnav" data-d="-1" aria-label="Sebelumnya">←</button><button class="ac-btn sm" data-act="cnav" data-d="0">Hari ini</button><button class="ac-btn sm" data-act="cnav" data-d="1" aria-label="Berikutnya">→</button></div><b style="font-size:15px">' + ttl + '</b>' + add('ev', 'Acara') + '</div>' +
        chips(['Daily', 'Weekly', 'Monthly', 'Agenda List'].map(function (x) { return x === 'Agenda List' ? 'Agenda' : x; }), v === 'Agenda List' ? 'Agenda' : v, 'v') + body;
    }
    var row = function (l, h) { return '<div class="cfgrow"><label>' + l + '</label>' + h + '</div>'; };
    var sel = function (k, list, cur) { return '<select data-chg="set" data-k="' + k + '" style="max-width:320px">' + list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>'; };
    function vSet() {
      var np = nowP(), tzs = [['auto', 'Otomatis (zona waktu perangkat)'], ['Asia/Jakarta', 'WIB — Jakarta'], ['Asia/Makassar', 'WITA — Makassar'], ['Asia/Jayapura', 'WIT — Jayapura'], ['Asia/Singapore', 'Singapura'], ['Asia/Kuala_Lumpur', 'Kuala Lumpur'], ['Asia/Riyadh', 'Riyadh'], ['Asia/Tokyo', 'Tokyo'], ['Europe/London', 'London'], ['America/New_York', 'New York'], ['UTC', 'UTC']];
      return '<div class="ac-card">' + row('Zona waktu kalender', sel('tz', tzs, CF.tz)) + '<p class="ac-hint" style="margin:-4px 0 12px">Sekarang di zona ini: <b>' + fd(np.date) + ' ' + hhmm(np.min) + '</b>. Jam acara dibaca sebagai waktu di zona ini.</p>' +
        row('Hari pertama dalam seminggu', sel('wk', [[1, 'Senin'], [0, 'Minggu'], [6, 'Sabtu']], CF.wk)) +
        row('Sistem kalender', sel('mode', [['both', 'Masehi + Hijriah'], ['masehi', 'Masehi saja'], ['hijri', 'Hijriah (grid mengikuti bulan Hijriah)']], CF.mode)) +
        row('Koreksi tanggal Hijriah', sel('hij', [[-2, '−2 hari'], [-1, '−1 hari'], [0, 'Tanpa koreksi'], [1, '+1 hari'], [2, '+2 hari']], CF.hij)) +
        '<p class="ac-hint" style="margin:-4px 0 12px">Hijriah dihitung dengan kalender Umm al-Qura. Penetapan awal bulan di Indonesia bisa berbeda satu hari; gunakan koreksi untuk menyesuaikan.</p>' +
        row('Pengingat di browser', '<div><button class="ac-btn sm" data-act="notif">Aktifkan notifikasi browser</button> <small style="opacity:.7">Pengingat hanya berbunyi saat MyOffice terbuka di browser.</small></div>') + '</div>' +
        '<div class="ac-bar"><div class="ac-h" style="margin:0">Kategori acara</div>' + add('cat', 'Kategori') + '</div>' +
        D.cat.map(function (c) { return '<div class="ac-item"><span style="width:14px;height:14px;border-radius:50%;background:' + c.color + ';margin-top:3px;flex:none"></span><div><b>' + esc(c.name) + '</b></div>' + btns('cat', c.id) + '</div>'; }).join('');
    }
    return {
      specs: specs, tabs: [['cal', 'Kalender', vCal], ['set', 'Pengaturan', vSet]],
      sub: function () { var h = hij(today()); return fd(today()) + (CF.mode !== 'masehi' && h ? ' · ' + h.d + ' ' + HM[h.m - 1] + ' ' + h.y + ' H' : '') + ' · ' + (CF.tz === 'auto' ? 'zona perangkat' : CF.tz); },
      validate: function (ent, r) {
        if (ent !== 'ev') return;
        r.end = r.end || r.start;
        if (r.allDay) { r.startTime = r.endTime = ''; if (r.end < r.start) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'; }
        else {
          if (!r.startTime) return 'Isi jam mulai, atau ubah menjadi acara seharian.';
          if (r.endTime) { var x = rng(r); if (x[1] <= x[0]) return 'Waktu selesai harus setelah waktu mulai.'; }
          else if (r.end !== r.start) return 'Acara lintas hari perlu jam selesai.';
        }
      },
      act: function (a, d, t, ev) {
        if (a === 'set') CF[d.k] = (d.k === 'wk' || d.k === 'hij') ? +d.v : d.v;
        if (a === 'cnav') {
          var cur = st.d || today(), v = st.v || 'Monthly', n = +d.d;
          if (!n) { st.d = today(); st.sel = today(); return; }
          if (v === 'Monthly') { var mi = monthInfo(cur); st.d = CF.mode === 'hijri' ? (n > 0 ? addD(mi.first, mi.len) : addD(mi.first, -1)) : new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 10); }
          else st.d = addD(cur, n * (v === 'Weekly' ? 7 : v === 'Daily' ? 1 : 30));
        }
        if (a === 'filt' && d.f === 'v') st.v = d.v === 'Agenda' ? 'Agenda List' : d.v;
        if (a === 'selday') st.sel = d.d;
        if (a === 'goday') { st.d = d.d; st.v = 'Daily'; }
        if (a === 'newday') app.form('ev', null, { start: d.d, end: d.d, allDay: true });
        if (a === 'slot') {
          var col = t.closest('.col'), y = ev.clientY - col.getBoundingClientRect().top, m = Math.max(0, Math.min(1380, Math.floor(y / 0.8 / 30) * 30));
          app.form('ev', null, { start: d.d, end: d.d, startTime: hhmm(m), endTime: hhmm(m + 60), allDay: false });
        }
        if (a === 'gotask' && MO.routes['#task']) MO.routes['#task']();
        if (a === 'notif' && window.Notification) Notification.requestPermission().then(function (p) { MO.msg('Notifikasi', p === 'granted' ? 'Aktif' : 'Tidak diizinkan'); });
      }
    };
  });
  /* ---------- Mesin pengingat (hanya saat halaman terbuka) ---------- */
  function notify(title, text) { MO.msg(title, text); try { if (window.Notification && Notification.permission === 'granted') new Notification(title, { body: text }); } catch (e) { } }
  function check() {
    var now = Date.now(), fired = ls('mo-fired'), ch = false, c = ls('mo-cal-v1'), tz = (c.set || {}).tz;
    (c.ev || []).forEach(function (e) {
      if (e.remind === '' || e.remind == null || !e.start) return;
      var at = zUtc(e.start, e.allDay ? '00:00' : e.startTime, tz) - (+e.remind) * 6e4, k = 'e' + e.id + '@' + at;
      if (at <= now && now - at < 864e5 && !fired[k]) { fired[k] = 1; ch = true; notify('Pengingat acara', e.title + (e.startTime ? ' · ' + e.startTime : '')); }
    });
    (ls('mo-task-v1').task || []).forEach(function (t) {
      if (!t.remindAt || t.status === 'Done' || t.status === 'Archived') return;
      var at = new Date(t.remindAt).getTime(), k = 't' + t.id + '@' + at;
      if (at <= now && now - at < 864e5 && !fired[k]) { fired[k] = 1; ch = true; notify('Pengingat tugas', t.title); }
    });
    if (ch) try { localStorage.setItem('mo-fired', JSON.stringify(fired)); } catch (e) { }
  }
  setTimeout(check, 3000); setInterval(check, 30000);

  MO.routes['#calendar'] = cal.open;
})();
