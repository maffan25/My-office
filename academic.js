/* MyOffice — Academic Management (data tersimpan di localStorage perangkat) */
(function () {
  'use strict';
  var KEY = 'mo-acad-v1';
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var has = function (v) { return v !== '' && v != null && !isNaN(+v); };
  var fmt = function (n) { return n == null ? '—' : String(Math.round(n * 100) / 100); };
  var fdate = function (v, t) {
    if (!v) return '—';
    var d = new Date(v); if (isNaN(d)) return v;
    return d.toLocaleString('id-ID', t === 'd' ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  /* ---------- Data ---------- */
  function seed() {
    return {
      cfg: {
        confirmed: false, normalize: true,
        scale: [{ l: 'A', min: 85, p: 4 }, { l: 'A-', min: 80, p: 3.7 }, { l: 'B+', min: 75, p: 3.3 }, { l: 'B', min: 70, p: 3 },
          { l: 'B-', min: 65, p: 2.7 }, { l: 'C+', min: 60, p: 2.3 }, { l: 'C', min: 55, p: 2 }, { l: 'D', min: 40, p: 1 }, { l: 'E', min: 0, p: 0 }],
        cats: [{ n: 'Tugas', w: 30 }, { n: 'Kuis', w: 10 }, { n: 'UTS', w: 25 }, { n: 'UAS', w: 35 },
          { n: 'Presentasi', w: 0 }, { n: 'Ujian lisan', w: 0 }, { n: 'Ujian praktik', w: 0 }]
      },
      sem: [{ id: uid(), name: 'Ganjil 2026/2027', target: '', notes: '', active: true }],
      course: [], task: [], exam: [], study: []
    };
  }
  var D; try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (!D || !D.cfg) D = seed();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { msg('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } }
  var by = function (arr, id) { return arr.filter(function (x) { return x.id === id; })[0]; };
  var cname = function (id) { var c = by(D.course, id); return c ? c.name : '—'; };

  /* ---------- Perhitungan (sepenuhnya mengikuti konfigurasi) ---------- */
  var TASKTYPES = ['Tugas', 'Proyek', 'Laporan', 'Kuis', 'Presentasi', 'Lainnya'];
  var EXAMTYPES = ['UTS', 'UAS', 'Kuis', 'Presentasi', 'Ujian lisan', 'Ujian praktik'];
  function catOf(type) { return D.cfg.cats.some(function (c) { return c.n === type; }) ? type : 'Tugas'; }
  function scored(cid) {
    var o = [];
    D.task.forEach(function (t) { if (t.courseId === cid && has(t.score)) o.push({ c: catOf(t.type), s: +t.score, w: +t.weight > 0 ? +t.weight : 1 }); });
    D.exam.forEach(function (e) { if (e.courseId === cid && has(e.score)) o.push({ c: e.type, s: +e.score, w: +e.weight > 0 ? +e.weight : 1 }); });
    return o;
  }
  function finalScore(c) {
    if (has(c.manual)) return +c.manual;
    if (!D.cfg.confirmed) return null;
    var it = scored(c.id), num = 0, den = 0, all = 0;
    D.cfg.cats.forEach(function (k) {
      var w = +k.w || 0; all += w;
      var xs = it.filter(function (i) { return i.c === k.n; });
      if (!xs.length || !w) return;
      var sw = 0, ss = 0; xs.forEach(function (i) { sw += i.w; ss += i.s * i.w; });
      num += w * (ss / sw); den += w;
    });
    if (!den) return null;
    return D.cfg.normalize ? num / den : num / (all || 100);
  }
  function letter(s) {
    if (s == null || !D.cfg.confirmed) return null;
    var sc = D.cfg.scale.slice().sort(function (a, b) { return b.min - a.min; });
    return sc.filter(function (r) { return s >= r.min; })[0] || null;
  }
  function ip(cs) {
    var a = 0, b = 0;
    cs.forEach(function (c) { var L = letter(finalScore(c)), k = +c.sks || 0; if (L && k) { a += L.p * k; b += k; } });
    return b ? a / b : null;
  }
  var ptOf = function (l) { var r = D.cfg.scale.filter(function (x) { return x.l === l; })[0]; return r ? r.p : null; };

  /* ---------- Skema form ---------- */
  var activeSems = function (cur) {
    return [['', '— Pilih semester aktif —']].concat(D.sem.filter(function (s) { return s.active || s.id === cur; })
      .map(function (s) { return [s.id, s.name + (s.active ? '' : ' (tidak aktif)')]; }));
  };
  var courseOpts = function () { return [['', '— Pilih mata kuliah —']].concat(D.course.map(function (c) { return [c.id, c.name]; })); };
  var opt = function (a) { return a.map(function (x) { return [x, x]; }); };
  var SPEC = {
    sem: {
      title: 'Semester', def: { active: true }, fields: [
        { k: 'name', l: 'Semester', t: 'text', ph: 'Ganjil 2026/2027', req: 1, full: 1 },
        { k: 'target', l: 'Target IP semester', t: 'number', step: '0.01', min: 0, max: 4 },
        { k: 'active', l: 'Status semester', t: 'select', bool: 1, o: [['true', 'Aktif'], ['false', 'Tidak aktif']] },
        { k: 'notes', l: 'Catatan semester', t: 'textarea', full: 1 }]
    },
    course: {
      title: 'Mata Kuliah', def: {}, fields: [
        { k: 'name', l: 'Nama mata kuliah', t: 'text', req: 1, full: 1 },
        { k: 'code', l: 'Kode mata kuliah', t: 'text' },
        { k: 'sks', l: 'Jumlah SKS', t: 'number', min: 0, step: '1' },
        { k: 'lecturer', l: 'Nama dosen', t: 'text', full: 1 },
        { k: 'schedule', l: 'Jadwal', t: 'text', ph: 'Senin 08:00–09:40' },
        { k: 'room', l: 'Ruangan / tautan kelas', t: 'text', ph: 'R.204 atau https://…' },
        { k: 'semId', l: 'Semester (hanya semester aktif)', t: 'select', req: 1, o: activeSems, full: 1 },
        { k: 'targetGrade', l: 'Target nilai (huruf)', t: 'select', o: function () { return [['', '—']].concat(D.cfg.scale.map(function (r) { return [r.l, r.l]; })); } },
        { k: 'manual', l: 'Nilai akhir manual (0–100, opsional)', t: 'number', min: 0, max: 100 },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }]
    },
    task: {
      title: 'Tugas', def: { status: 'Belum dikerjakan', priority: 'Sedang', type: 'Tugas' }, fields: [
        { k: 'title', l: 'Judul tugas', t: 'text', req: 1, full: 1 },
        { k: 'courseId', l: 'Mata kuliah', t: 'select', o: courseOpts, req: 1 },
        { k: 'type', l: 'Jenis tugas', t: 'select', o: opt(TASKTYPES) },
        { k: 'desc', l: 'Deskripsi', t: 'textarea', full: 1 },
        { k: 'deadline', l: 'Deadline', t: 'datetime-local' },
        { k: 'status', l: 'Status', t: 'select', o: opt(['Belum dikerjakan', 'Sedang dikerjakan', 'Selesai']) },
        { k: 'priority', l: 'Prioritas', t: 'select', o: opt(['Rendah', 'Sedang', 'Tinggi']) },
        { k: 'score', l: 'Nilai (jika ada)', t: 'number', min: 0, max: 100 },
        { k: 'weight', l: 'Bobot nilai (jika diketahui)', t: 'number', min: 0 },
        { k: 'link', l: 'Tautan / lampiran', t: 'url', ph: 'https://…' },
        { k: 'notes', l: 'Catatan pengerjaan', t: 'textarea', full: 1 }]
    },
    exam: {
      title: 'Ujian', def: { type: 'UTS' }, fields: [
        { k: 'type', l: 'Jenis ujian', t: 'select', o: opt(EXAMTYPES), req: 1 },
        { k: 'courseId', l: 'Mata kuliah', t: 'select', o: courseOpts, req: 1 },
        { k: 'date', l: 'Tanggal & waktu', t: 'datetime-local' },
        { k: 'room', l: 'Ruangan / tautan', t: 'text' },
        { k: 'topics', l: 'Materi ujian', t: 'textarea', full: 1 },
        { k: 'score', l: 'Nilai (jika ada)', t: 'number', min: 0, max: 100 },
        { k: 'weight', l: 'Bobot nilai (jika diketahui)', t: 'number', min: 0 },
        { k: 'notes', l: 'Catatan', t: 'textarea', full: 1 }]
    },
    study: {
      title: 'Waktu Belajar', def: { minutes: 60 }, fields: [
        { k: 'courseId', l: 'Mata kuliah', t: 'select', o: courseOpts, req: 1, full: 1 },
        { k: 'date', l: 'Tanggal', t: 'date', req: 1 },
        { k: 'minutes', l: 'Durasi (menit)', t: 'number', min: 1, step: '1', req: 1 },
        { k: 'notes', l: 'Catatan', t: 'text', full: 1 }]
    }
  };

  /* ---------- DOM dasar ---------- */
  function el(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }
  var ov, body, subEl, tab = 'sem', tf = 'Semua', ef = 'Semua', draft = null;
  var TABS = [['sem', 'Semester'], ['course', 'Mata Kuliah'], ['task', 'Tugas'], ['exam', 'Ujian'], ['ana', 'Analitik'], ['cfg', 'Formula Nilai']];

  function build() {
    ov = el('ac-ov', '<section class="ac-win" role="dialog" aria-modal="true" aria-label="Academic Management">' +
      '<header><div><h2>Academic Management</h2><p id="acSub"></p></div><button class="ac-x" data-act="close" aria-label="Tutup">×</button></header>' +
      '<nav class="ac-tabs" role="tablist">' + TABS.map(function (t) { return '<button class="ac-tab" role="tab" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</nav>' +
      '<div class="ac-body" id="acBody"></div></section>');
    ov.hidden = true; document.body.appendChild(ov);
    body = ov.querySelector('#acBody'); subEl = ov.querySelector('#acSub');
    ov.addEventListener('click', onClick);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
  }
  function open() { if (!ov) build(); ov.hidden = false; document.body.style.overflow = 'hidden'; render(); ov.querySelector('.ac-x').focus(); }
  function close() { if (ov) ov.hidden = true; document.body.style.overflow = ''; }

  /* ---------- Render ---------- */
  function render() {
    TABS.forEach(function (t) { ov.querySelector('[data-t="' + t[0] + '"]').setAttribute('aria-selected', t[0] === tab); });
    var act = D.sem.filter(function (s) { return s.active; }).map(function (s) { return s.name; });
    subEl.textContent = act.length ? 'Semester aktif: ' + act.join(', ') : 'Belum ada semester aktif';
    var top = body.scrollTop;
    body.innerHTML = ({ sem: vSem, course: vCourse, task: vTask, exam: vExam, ana: vAna, cfg: vCfg })[tab]();
    body.scrollTop = top;
  }
  var warn = function () {
    return D.cfg.confirmed ? '' : '<div class="ac-warn"><span>Rumus nilai belum dikonfigurasi, jadi huruf mutu, IP, dan IPK belum dihitung. Atur skala nilai dan bobot sesuai kampus Anda.</span><button class="ac-btn sm" data-act="tab" data-t="cfg">Buka Formula Nilai</button></div>';
  };
  var btns = function (e, id) {
    return '<div class="ac-acts"><button class="ac-btn sm" data-act="edit" data-e="' + e + '" data-id="' + id + '">Edit</button><button class="ac-btn sm danger" data-act="del" data-e="' + e + '" data-id="' + id + '">Hapus</button></div>';
  };
  var empty = function (t) { return '<div class="ac-empty">' + t + '</div>'; };
  var link = function (v) { return /^https?:\/\//i.test(v || '') ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\//i, '').slice(0, 40)) + '</a>' : esc(v); };

  function vSem() {
    var h = warn() + '<div class="ac-bar"><p class="ac-hint">Atur semester, target IP, catatan, dan status aktif. Daftar mata kuliah beserta dosen dan nilainya muncul di tiap semester.</p><button class="ac-btn pri" data-act="add" data-e="sem">+ Semester</button></div>';
    if (!D.sem.length) h += empty('Belum ada semester. Tambahkan yang pertama.');
    D.sem.forEach(function (s) {
      var cs = D.course.filter(function (c) { return c.semId === s.id; }), v = ip(cs), sks = cs.reduce(function (a, c) { return a + (+c.sks || 0); }, 0);
      h += '<article class="ac-card"><div class="ac-row"><div><h3>Semester: ' + esc(s.name) +
        '<button class="ac-badge ' + (s.active ? 'on' : '') + '" data-act="togsem" data-id="' + s.id + '" title="Klik untuk ubah status">' + (s.active ? 'Aktif' : 'Tidak aktif') + '</button></h3></div>' + btns('sem', s.id) + '</div>' +
        '<div class="ac-meta"><span>Target IP: <b>' + (has(s.target) ? fmt(+s.target) : '—') + '</b></span><span>IP saat ini: <b>' + fmt(v) + '</b></span><span>Mata kuliah: <b>' + cs.length + '</b></span><span>Total SKS: <b>' + sks + '</b></span></div>' +
        (s.notes ? '<div class="ac-notes">' + esc(s.notes) + '</div>' : '');
      if (cs.length) {
        h += '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Mata kuliah</th><th>Dosen</th><th>SKS</th><th>Nilai</th><th>Huruf</th></tr>' +
          cs.map(function (c) { var f = finalScore(c), L = letter(f); return '<tr class="ac-click" data-act="edit" data-e="course" data-id="' + c.id + '"><td>' + esc(c.name) + (c.code ? ' <small>(' + esc(c.code) + ')</small>' : '') + '</td><td>' + esc(c.lecturer || '—') + '</td><td>' + esc(c.sks || '—') + '</td><td>' + fmt(f) + '</td><td>' + (L ? L.l : '—') + '</td></tr>'; }).join('') + '</table></div>';
      } else h += '<p class="ac-hint">Belum ada mata kuliah di semester ini.</p>';
      if (s.active) h += '<div style="margin-top:10px"><button class="ac-btn sm" data-act="add" data-e="course" data-sem="' + s.id + '">+ Mata kuliah</button></div>';
      h += '</article>';
    });
    return h;
  }
  function vCourse() {
    var h = '<div class="ac-bar"><p class="ac-hint">Mata kuliah baru hanya bisa ditambahkan ke semester yang berstatus aktif.</p><button class="ac-btn pri" data-act="add" data-e="course">+ Mata kuliah</button></div>';
    if (!D.course.length) return h + empty('Belum ada mata kuliah.');
    D.course.forEach(function (c) {
      var s = by(D.sem, c.semId), f = finalScore(c), L = letter(f);
      h += '<article class="ac-card"><div class="ac-row"><div><h3>' + esc(c.name) + (c.code ? ' <small>· ' + esc(c.code) + '</small>' : '') + '</h3><small style="opacity:.7">' + esc(s ? s.name : 'Tanpa semester') + '</small></div>' + btns('course', c.id) + '</div>' +
        '<div class="ac-meta"><span>Dosen: <b>' + esc(c.lecturer || '—') + '</b></span><span>SKS: <b>' + esc(c.sks || '—') + '</b></span><span>Jadwal: <b>' + esc(c.schedule || '—') + '</b></span><span>Ruang/kelas: <b>' + (c.room ? link(c.room) : '—') + '</b></span></div>' +
        '<div class="ac-meta"><span>Target nilai: <b>' + esc(c.targetGrade || '—') + '</b></span><span>Nilai akhir: <b>' + fmt(f) + (L ? ' (' + L.l + ')' : '') + '</b></span></div>' +
        (c.notes ? '<div class="ac-notes">' + esc(c.notes) + '</div>' : '') + '</article>';
    });
    return h;
  }
  function chips(list, cur, f) {
    return '<div class="ac-chips">' + list.map(function (x) { return '<button class="ac-chip" aria-pressed="' + (x === cur) + '" data-act="filt" data-f="' + f + '" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>';
  }
  function vTask() {
    var L = D.task.filter(function (t) { return tf === 'Semua' || t.status === tf; }).sort(function (a, b) { return (a.deadline || '9').localeCompare(b.deadline || '9'); });
    var h = '<div class="ac-bar"><p class="ac-hint">Centang kotak untuk menandai tugas selesai. Klik judul untuk mengedit.</p><button class="ac-btn pri" data-act="add" data-e="task">+ Tugas</button></div>' + chips(['Semua', 'Belum dikerjakan', 'Sedang dikerjakan', 'Selesai'], tf, 'tf');
    if (!L.length) return h + empty(D.course.length ? 'Tidak ada tugas.' : 'Tambahkan mata kuliah terlebih dahulu, lalu catat tugasnya.');
    L.forEach(function (t) {
      var late = t.deadline && t.status !== 'Selesai' && new Date(t.deadline) < new Date();
      h += '<div class="ac-item' + (t.status === 'Selesai' ? ' done' : '') + '"><input type="checkbox" data-act="tgtask" data-id="' + t.id + '"' + (t.status === 'Selesai' ? ' checked' : '') + ' aria-label="Selesai"><div>' +
        '<button class="t" data-act="edit" data-e="task" data-id="' + t.id + '">' + esc(t.title) + '</button>' +
        '<span class="ac-badge ' + (t.priority === 'Tinggi' ? 'hi' : t.priority === 'Sedang' ? 'mid' : '') + '">' + esc(t.priority) + '</span><span class="ac-badge">' + esc(t.type) + '</span>' + (late ? '<span class="ac-badge late">Terlambat</span>' : '') +
        '<small>' + esc(cname(t.courseId)) + ' · Deadline: ' + fdate(t.deadline) + ' · ' + esc(t.status) + (has(t.score) ? ' · Nilai: ' + t.score : '') + (has(t.weight) ? ' · Bobot: ' + t.weight : '') + '</small>' +
        (t.desc ? '<small>' + esc(t.desc) + '</small>' : '') + (t.link ? '<small>' + link(t.link) + '</small>' : '') + (t.notes ? '<small>Catatan: ' + esc(t.notes) + '</small>' : '') + '</div>' + btns('task', t.id) + '</div>';
    });
    return h;
  }
  function vExam() {
    var L = D.exam.filter(function (e) { return ef === 'Semua' || e.type === ef; }).sort(function (a, b) { return (a.date || '9').localeCompare(b.date || '9'); });
    var h = '<div class="ac-bar"><p class="ac-hint">UTS, UAS, kuis, presentasi, ujian lisan, dan ujian praktik.</p><button class="ac-btn pri" data-act="add" data-e="exam">+ Ujian</button></div>' + chips(['Semua'].concat(EXAMTYPES), ef, 'ef');
    if (!L.length) return h + empty(D.course.length ? 'Tidak ada ujian.' : 'Tambahkan mata kuliah terlebih dahulu.');
    L.forEach(function (e) {
      var past = e.date && new Date(e.date) < new Date();
      h += '<div class="ac-item"><div><button class="t" data-act="edit" data-e="exam" data-id="' + e.id + '">' + esc(e.type) + ' — ' + esc(cname(e.courseId)) + '</button>' + (past ? '' : (e.date ? '<span class="ac-badge mid">Mendatang</span>' : '')) +
        '<small>' + fdate(e.date) + (e.room ? ' · ' + link(e.room) : '') + (has(e.score) ? ' · Nilai: ' + e.score : '') + (has(e.weight) ? ' · Bobot: ' + e.weight : '') + '</small>' +
        (e.topics ? '<small>Materi: ' + esc(e.topics) + '</small>' : '') + (e.notes ? '<small>' + esc(e.notes) + '</small>' : '') + '</div>' + btns('exam', e.id) + '</div>';
    });
    return h;
  }
  function vAna() {
    var act = D.course.filter(function (c) { var s = by(D.sem, c.semId); return s && s.active; });
    var pend = D.task.filter(function (t) { return t.status !== 'Selesai'; }), late = pend.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date(); });
    var up = D.exam.filter(function (e) { return e.date && new Date(e.date) >= new Date(); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    var sc = D.task.filter(function (t) { return has(t.score); }).length + D.exam.filter(function (e) { return has(e.score); }).length;
    var h = warn() + '<div class="ac-grid">' +
      '<div class="ac-stat"><b>' + act.length + '</b><span>Mata kuliah aktif</span></div>' +
      '<div class="ac-stat"><b>' + pend.length + '</b><span>Tugas belum selesai' + (late.length ? ' (' + late.length + ' terlambat)' : '') + '</span></div>' +
      '<div class="ac-stat"><b>' + up.length + '</b><span>Ujian mendatang' + (up[0] ? ' · berikutnya ' + fdate(up[0].date, 'd') : '') + '</span></div>' +
      '<div class="ac-stat"><b>' + sc + '</b><span>Nilai yang sudah dimasukkan</span></div></div>';
    // waktu belajar
    var tot = {}, all = 0; D.study.forEach(function (s) { tot[s.courseId] = (tot[s.courseId] || 0) + (+s.minutes || 0); all += +s.minutes || 0; });
    var ids = Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; }), mx = ids.length ? tot[ids[0]] : 1;
    var hm = function (m) { return Math.floor(m / 60) + 'j ' + (m % 60) + 'm'; };
    h += '<div class="ac-bar"><div class="ac-h" style="margin:0">Distribusi waktu belajar' + (all ? ' · total ' + hm(all) : '') + '</div><button class="ac-btn sm" data-act="add" data-e="study">+ Catat waktu belajar</button></div>';
    h += ids.length ? '<div class="ac-bars">' + ids.map(function (id) { return '<div class="ac-bar2"><span>' + esc(cname(id)) + '</span><div class="ac-track"><i style="width:' + (tot[id] / mx * 100) + '%"></i></div><span>' + hm(tot[id]) + ' (' + Math.round(tot[id] / all * 100) + '%)</span></div>'; }).join('') + '</div>'
      : '<p class="ac-hint">Belum ada catatan waktu belajar.</p>';
    if (D.study.length) h += '<div class="ac-tblwrap"><table class="ac-tbl"><tr><th>Tanggal</th><th>Mata kuliah</th><th>Durasi</th><th></th></tr>' +
      D.study.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 8).map(function (s) { return '<tr><td>' + fdate(s.date, 'd') + '</td><td>' + esc(cname(s.courseId)) + '</td><td>' + s.minutes + ' mnt</td><td><button class="ac-btn sm" data-act="edit" data-e="study" data-id="' + s.id + '">Edit</button> <button class="ac-btn sm danger" data-act="del" data-e="study" data-id="' + s.id + '">Hapus</button></td></tr>'; }).join('') + '</table></div>';
    // target vs hasil
    h += '<div class="ac-h">Perbandingan target dan hasil</div>';
    if (!D.cfg.confirmed) h += '<p class="ac-hint">Tersedia setelah formula nilai dikonfigurasi.</p>';
    else {
      var rows = act.filter(function (c) { return c.targetGrade || finalScore(c) != null; });
      var top = Math.max.apply(null, D.cfg.scale.map(function (r) { return r.p; }).concat([1]));
      h += rows.length ? '<div class="ac-legend"><span><i></i>Target</span><span><i class="alt"></i>Hasil saat ini</span></div><div class="ac-bars">' + rows.map(function (c) {
        var tp = ptOf(c.targetGrade), L = letter(finalScore(c));
        return '<div class="ac-bar2"><span>' + esc(c.name) + '</span><div class="ac-pair"><div class="ac-track"><i style="width:' + ((tp || 0) / top * 100) + '%"></i></div><div class="ac-track"><i class="alt" style="width:' + ((L ? L.p : 0) / top * 100) + '%"></i></div></div><span>' + esc(c.targetGrade || '—') + ' → ' + (L ? L.l : '—') + '</span></div>';
      }).join('') + '</div>' : '<p class="ac-hint">Isi target nilai atau nilai tugas/ujian agar perbandingan muncul.</p>';
      var sr = D.sem.filter(function (s) { return s.active && has(s.target); });
      if (sr.length) h += '<div class="ac-meta" style="margin-top:14px">' + sr.map(function (s) { return '<span>' + esc(s.name) + ' — target IP <b>' + fmt(+s.target) + '</b>, saat ini <b>' + fmt(ip(D.course.filter(function (c) { return c.semId === s.id; }))) + '</b></span>'; }).join('') + '</div>';
    }
    var ipk = ip(D.course);
    h += '<div class="ac-meta" style="margin-top:10px"><span>IPK (semua semester): <b>' + fmt(ipk) + '</b></span></div>';
    return h;
  }
  function vCfg() {
    if (!draft) draft = JSON.parse(JSON.stringify(D.cfg));
    var c = draft, sum = c.cats.reduce(function (a, k) { return a + (+k.w || 0); }, 0);
    var h = '<div class="ac-bar"><p class="ac-hint">Nilai akhir, huruf mutu, IP, dan IPK hanya dihitung memakai pengaturan ini. Nilai awalnya hanya contoh — sesuaikan dengan aturan kampus/dosen Anda, lalu simpan.</p>' +
      '<span class="ac-badge ' + (D.cfg.confirmed ? 'on' : '') + '">' + (D.cfg.confirmed ? 'Formula aktif' : 'Belum aktif') + '</span></div><div class="ac-cfg" id="cfgForm">';
    h += '<div><div class="ac-h" style="margin-top:0">Skala nilai (huruf mutu)</div><table class="ac-tbl"><tr><th>Huruf</th><th>Nilai min</th><th>Poin</th><th></th></tr>' +
      c.scale.map(function (r, i) { return '<tr><td><input data-s="l" data-i="' + i + '" value="' + esc(r.l) + '"></td><td><input type="number" data-s="min" data-i="' + i + '" value="' + esc(r.min) + '"></td><td><input type="number" step="0.01" data-s="p" data-i="' + i + '" value="' + esc(r.p) + '"></td><td><button class="ac-btn sm danger" data-act="cfgdel" data-k="scale" data-i="' + i + '">×</button></td></tr>'; }).join('') +
      '</table><button class="ac-btn sm" style="margin-top:8px" data-act="cfgadd" data-k="scale">+ Baris</button></div>';
    h += '<div><div class="ac-h" style="margin-top:0">Komponen & bobot nilai akhir (%)</div><table class="ac-tbl"><tr><th>Komponen</th><th>Bobot</th><th></th></tr>' +
      c.cats.map(function (r, i) { return '<tr><td><input data-c="n" data-i="' + i + '" value="' + esc(r.n) + '"></td><td><input type="number" data-c="w" data-i="' + i + '" value="' + esc(r.w) + '"></td><td><button class="ac-btn sm danger" data-act="cfgdel" data-k="cats" data-i="' + i + '">×</button></td></tr>'; }).join('') +
      '</table><button class="ac-btn sm" style="margin-top:8px" data-act="cfgadd" data-k="cats">+ Komponen</button>' +
      '<p class="ac-sum">Total bobot: <b>' + fmt(sum) + '%</b>. Tugas dengan jenis selain nama komponen dihitung sebagai "Tugas"; Kuis, Presentasi, UTS, UAS, dll. mengikuti nama komponen.</p>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12.5px"><input type="checkbox" id="cfgNorm"' + (c.normalize ? ' checked' : '') + ' style="width:auto;margin-top:3px"><span>Abaikan komponen yang belum punya nilai (bobot dinormalisasi). Jika dimatikan, komponen kosong dihitung 0.</span></label></div></div>' +
      '<div class="ac-foot" style="padding:18px 0 0"><button class="ac-btn" data-act="cfgreset">Muat ulang</button><button class="ac-btn pri" data-act="cfgsave">Simpan & aktifkan formula</button></div>';
    return h;
  }
  function readCfg() {
    if (!draft) return;
    body.querySelectorAll('[data-s]').forEach(function (i) { var r = draft.scale[+i.dataset.i]; if (r) r[i.dataset.s] = i.dataset.s === 'l' ? i.value : (i.value === '' ? 0 : +i.value); });
    body.querySelectorAll('[data-c]').forEach(function (i) { var r = draft.cats[+i.dataset.i]; if (r) r[i.dataset.c] = i.dataset.c === 'n' ? i.value : (i.value === '' ? 0 : +i.value); });
    var n = body.querySelector('#cfgNorm'); if (n) draft.normalize = n.checked;
  }

  /* ---------- Form modal ---------- */
  function fld(f, v) {
    var at = 'id="f_' + f.k + '" name="' + f.k + '"' + (f.req ? ' required' : ''), inp;
    if (f.t === 'textarea') inp = '<textarea ' + at + ' rows="3">' + esc(v) + '</textarea>';
    else if (f.t === 'select') {
      var o = typeof f.o === 'function' ? f.o(v) : f.o;
      inp = '<select ' + at + '>' + o.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>';
    } else {
      var x = f.t === 'number' ? ' step="' + (f.step || 'any') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') : '';
      inp = '<input ' + at + ' type="' + f.t + '" value="' + esc(v) + '"' + x + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
    }
    return '<label class="' + (f.full ? 'full' : '') + '"><span>' + f.l + (f.req ? ' *' : '') + '</span>' + inp + '</label>';
  }
  function openForm(ent, id, preset) {
    var sp = SPEC[ent], it = id ? by(D[ent], id) : Object.assign({}, sp.def, preset || {});
    if (ent === 'study' && !id) it.date = today();
    var m = el('ac-ov ac-ov2', '<form class="ac-win ac-form" novalidate><header><h2>' + (id ? 'Edit ' : 'Tambah ') + sp.title + '</h2><button type="button" class="ac-x" data-x aria-label="Tutup">×</button></header>' +
      '<div class="ac-fields">' + sp.fields.map(function (f) { var v = it[f.k]; if (f.bool) v = String(v !== false); return fld(f, v == null ? '' : v); }).join('') + '</div>' +
      '<footer><button type="button" class="ac-btn" data-x>Batal</button><button class="ac-btn pri">Simpan</button></footer></form>');
    document.body.appendChild(m);
    var off = function () { m.remove(); };
    m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
    m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, bad = null, rec = id ? it : { id: uid() };
      sp.fields.forEach(function (fd) {
        var inp = f.elements[fd.k], v = inp.value.trim();
        if (fd.req && !v && !bad) bad = inp;
        rec[fd.k] = fd.bool ? v === 'true' : fd.t === 'number' ? (v === '' ? '' : +v) : v;
      });
      if (bad) { bad.focus(); bad.reportValidity && bad.reportValidity(); return; }
      if (!id) D[ent].push(rec);
      save(); off(); render();
    });
    var first = m.querySelector('input,select,textarea'); if (first) first.focus();
  }
  function del(ent, id) {
    var it = by(D[ent], id); if (!it) return;
    var extra = ent === 'sem' ? ' Semua mata kuliah di semester ini beserta tugas dan ujiannya ikut terhapus.' : ent === 'course' ? ' Tugas, ujian, dan catatan belajarnya ikut terhapus.' : '';
    if (!confirm('Hapus "' + (it.name || it.title || SPEC[ent].title) + '"?' + extra)) return;
    var rm = function (cid) { ['task', 'exam', 'study'].forEach(function (k) { D[k] = D[k].filter(function (x) { return x.courseId !== cid; }); }); };
    if (ent === 'sem') { D.course.filter(function (c) { return c.semId === id; }).forEach(function (c) { rm(c.id); }); D.course = D.course.filter(function (c) { return c.semId !== id; }); }
    if (ent === 'course') rm(id);
    D[ent] = D[ent].filter(function (x) { return x.id !== id; });
    save(); render();
  }

  /* ---------- Event ---------- */
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || !ov.contains(b)) return;
    var a = b.dataset.act, d = b.dataset;
    if (a === 'close') return close();
    if (a === 'tab') { if (tab === 'cfg') readCfg(); tab = d.t; return render(); }
    if (a === 'add') {
      if (d.e === 'course' && !D.sem.some(function (s) { return s.active; })) return msg('Belum ada semester aktif', 'Aktifkan atau buat semester terlebih dahulu.');
      if ((d.e === 'task' || d.e === 'exam' || d.e === 'study') && !D.course.length) return msg('Belum ada mata kuliah', 'Tambahkan mata kuliah terlebih dahulu.');
      return openForm(d.e, null, d.sem ? { semId: d.sem } : null);
    }
    if (a === 'edit') return openForm(d.e, d.id);
    if (a === 'del') return del(d.e, d.id);
    if (a === 'togsem') { var s = by(D.sem, d.id); s.active = !s.active; save(); return render(); }
    if (a === 'tgtask') { var t = by(D.task, d.id); t.status = e.target.checked ? 'Selesai' : 'Belum dikerjakan'; save(); return render(); }
    if (a === 'filt') { if (d.f === 'tf') tf = d.v; else ef = d.v; return render(); }
    if (a === 'cfgadd') { readCfg(); draft[d.k].push(d.k === 'scale' ? { l: '', min: 0, p: 0 } : { n: '', w: 0 }); return render(); }
    if (a === 'cfgdel') { readCfg(); draft[d.k].splice(+d.i, 1); return render(); }
    if (a === 'cfgreset') { draft = null; return render(); }
    if (a === 'cfgsave') {
      readCfg();
      var okS = draft.scale.length && draft.scale.every(function (r) { return r.l.trim(); });
      var sum = draft.cats.reduce(function (x, k) { return x + (+k.w || 0); }, 0);
      if (!okS) return msg('Belum bisa disimpan', 'Skala nilai harus berisi minimal satu baris dan semua hurufnya terisi.');
      if (!draft.cats.length || sum <= 0) return msg('Belum bisa disimpan', 'Total bobot komponen harus lebih dari 0.');
      if (!draft.normalize && sum !== 100 && !confirm('Total bobot ' + sum + '%, bukan 100%. Nilai akhir akan dihitung dibagi ' + sum + '. Lanjutkan?')) return;
      draft.confirmed = true; D.cfg = draft; draft = null; save(); msg('Tersimpan', 'Formula nilai aktif dan dipakai di seluruh perhitungan.'); return render();
    }
  }

  /* ---------- Dialog singkat & Coming soon ---------- */
  var dlg, tm;
  function msg(title, text) {
    if (!dlg) { dlg = el('ac-soon', '<div><small></small><b></b></div>'); dlg.hidden = true; document.body.appendChild(dlg); dlg.addEventListener('click', function () { dlg.hidden = true; }); }
    dlg.querySelector('small').textContent = title; dlg.querySelector('b').textContent = text;
    dlg.hidden = false; clearTimeout(tm); tm = setTimeout(function () { dlg.hidden = true; }, 2200);
  }
  function soon(label) {
    if (!dlg) msg('', '');
    msg(label || '', 'Coming s0000000n');
    dlg.querySelector('b').style.fontSize = '';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.nav a');
    if (a) {
      e.preventDefault(); e.stopPropagation();
      if (a.getAttribute('href') === '#academic') return open();
      return soon(a.textContent.replace(/\s+/g, ' ').trim());
    }
    var t = e.target.closest('.tools button');
    if (t && t.id !== 'themeBtn') soon(t.getAttribute('aria-label') || '');
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (dlg && !dlg.hidden) dlg.hidden = true;
    else if (ov && !ov.hidden && !document.querySelector('.ac-ov2')) close();
  });
})();
