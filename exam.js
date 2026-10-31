/* MyOffice — Exam: latihan & ujian pilihan ganda dari bank soal (hasil tersimpan di localStorage) */
(function () {
  'use strict';
  var MO = window.MyOffice = window.MyOffice || {};
  var HK = 'mo-exam-v1', BK = 'mo-exam-banks-v1', LT = ['A', 'B', 'C', 'D', 'E', 'F'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var say = function (t, x) { if (MO.msg) MO.msg(t, x); };
  var rd = function (k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
  var wr = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { say('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } };
  var p2 = function (n) { return ('0' + n).slice(-2); };
  var clock = function (s) { s = Math.max(0, Math.round(s)); return (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + p2(Math.floor(s % 3600 / 60)) + ':' + p2(s % 60); };
  var hist = rd(HK), mine = rd(BK), view = 'lib', cfg = null, S = null, R = null, tm = null;
  var gid = function (i) { return document.getElementById(i); };

  function shuf(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rerender(top) { if (MO.acadRender) MO.acadRender(); var b = gid('acBody'); if (b && top !== false) b.scrollTop = 0; }

  /* ---------- Bank soal ---------- */
  function norm(b) {
    if (!b || !Array.isArray(b.questions)) return null;
    var qs = [];
    b.questions.forEach(function (x) {
      if (!x || !x.q || !Array.isArray(x.o) || x.o.length < 2) return;
      var a = typeof x.a === 'string' ? LT.indexOf(x.a.trim().toUpperCase()) : +x.a;
      if (!(a >= 0 && a < x.o.length)) return;
      qs.push({ q: String(x.q), o: x.o.map(String), a: a, e: x.e ? String(x.e) : '' });
    });
    return qs.length ? { id: String(b.id || 'u' + Date.now().toString(36)), title: String(b.title || 'Bank soal'), course: b.course ? String(b.course) : '', questions: qs } : null;
  }
  function banks() {
    var out = [];
    (window.MO_EXAM_BANKS || []).forEach(function (b) { var n = norm(b); if (n) { n.builtin = true; out.push(n); } });
    return out.concat(mine);
  }
  var bankOf = function (id) { return banks().filter(function (b) { return b.id === id; })[0]; };
  function stat(id) {
    var h = hist.filter(function (x) { return x.bank === id && !x.redo; });
    return { n: h.length, best: h.length ? Math.max.apply(null, h.map(function (x) { return x.pct; })) : 0 };
  }

  /* ---------- Tampilan: daftar bank ---------- */
  function vLib() {
    var bs = banks(), h = '<div class="ac-bar"><p class="ac-hint">Latihan dan ujian pilihan ganda dari bank soal. Pilih satu bank soal, atur mode, lalu mulai.</p><button class="ac-btn pri" data-ex="import">+ Impor soal</button></div>';
    if (S) {
      var dn = S.ans.filter(function (x) { return x >= 0; }).length;
      h += '<div class="ex-resume"><span>Sesi <b>' + esc(S.title) + '</b> masih berjalan, ' + dn + ' dari ' + S.qs.length + ' soal terjawab.</span><button class="ac-btn pri sm" data-ex="resume">Lanjutkan</button></div>';
    }
    if (!bs.length) return h + '<div class="ac-empty">Belum ada bank soal. Impor file JSON untuk mulai berlatih.</div>';
    h += '<div class="ex-bg">' + bs.map(function (b) {
      var s = stat(b.id);
      return '<article class="ex-bk"><div class="ex-bt"><b>' + esc(b.title) + '</b><small>' + (b.course ? esc(b.course) + ', ' : '') + b.questions.length + ' soal</small></div>' +
        '<div class="ex-bs">' + (s.n ? '<div class="ex-bar" role="img" aria-label="Skor terbaik ' + s.best + '"><i style="width:' + s.best + '%"></i></div><small>Skor terbaik <b>' + s.best + '</b>, dikerjakan ' + s.n + 'x</small>' : '<small>Belum pernah dikerjakan</small>') + '</div>' +
        '<div class="ex-ba"><button class="ac-btn pri sm" data-ex="setup" data-id="' + esc(b.id) + '">Mulai</button>' + (b.builtin ? '' : '<button class="ac-btn sm danger" data-ex="delbank" data-id="' + esc(b.id) + '">Hapus</button>') + '</div></article>';
    }).join('') + '</div>';
    if (hist.length) {
      h += '<div class="ad-sh"><h2 class="ad-h sm">Riwayat terakhir</h2></div><div class="ex-hist">' + hist.slice(0, 6).map(function (x) {
        return '<div class="ex-hr"><div><b>' + esc(x.title) + '</b><small>' + new Date(x.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ', ' + (x.mode === 'ujian' ? 'ujian' : 'latihan') + '</small></div><span>' + x.correct + '/' + x.n + '</span><b class="ex-hp">' + x.pct + '</b></div>';
      }).join('') + '</div>';
    }
    return h;
  }

  /* ---------- Tampilan: pengaturan ---------- */
  function vSetup() {
    var b = bankOf(cfg.id); if (!b) { view = 'lib'; return vLib(); }
    var N = b.questions.length, ns = [10, 20, 30, 50].filter(function (n) { return n < N; }), cnt = cfg.n === 'all' ? N : Math.min(+cfg.n, N);
    var M = [['latihan', 'Latihan', 'Jawaban benar dan pembahasan langsung muncul setelah kamu memilih.'], ['ujian', 'Ujian', 'Berwaktu. Jawaban bisa diubah, hasil dan pembahasan muncul setelah selesai.']];
    return '<button class="ex-back" data-ex="lib">‹ Semua bank soal</button><div class="ex-set"><h3>' + esc(b.title) + '</h3><p class="ac-hint">' + N + ' soal tersedia</p>' +
      '<div class="ex-modes">' + M.map(function (m) { return '<button class="ex-mode" data-ex="mode" data-v="' + m[0] + '" aria-pressed="' + (cfg.mode === m[0]) + '"><b>' + m[1] + '</b><span>' + m[2] + '</span></button>'; }).join('') + '</div>' +
      '<div class="ex-row"><label class="ex-f"><span>Jumlah soal</span><select id="exN"><option value="all"' + (cfg.n === 'all' ? ' selected' : '') + '>Semua (' + N + ')</option>' + ns.map(function (n) { return '<option value="' + n + '"' + (String(cfg.n) === String(n) ? ' selected' : '') + '>' + n + ' soal</option>'; }).join('') + '</select></label>' +
      (cfg.mode === 'ujian' ? '<label class="ex-f"><span>Waktu (menit)</span><input id="exMin" type="number" min="1" step="1" value="' + (cfg.min || cnt) + '"' + (cfg.min ? ' data-t="1"' : '') + '></label>' : '') + '</div>' +
      '<label class="ex-ck"><input type="checkbox" id="exSh"' + (cfg.sh ? ' checked' : '') + '><span>Acak urutan soal</span></label>' +
      '<label class="ex-ck"><input type="checkbox" id="exSo"' + (cfg.so ? ' checked' : '') + '><span>Acak urutan pilihan<small>Matikan bila ada pilihan seperti "semua jawaban benar".</small></span></label>' +
      '<button class="ac-btn pri ex-go" data-ex="start">Mulai ' + (cfg.mode === 'ujian' ? 'ujian' : 'latihan') + '</button></div>';
  }
  function readCfg() { if (gid('exN')) { cfg.n = gid('exN').value; cfg.sh = gid('exSh').checked; cfg.so = gid('exSo').checked; } }

  /* ---------- Sesi ---------- */
  function start(id, title, src, o) {
    var idx = src.map(function (_, i) { return i; }); if (o.sh) shuf(idx);
    var qs = idx.slice(0, o.n).map(function (i) {
      var q = src[i], op = q.o.map(function (t, k) { return { t: t, k: k }; }); if (o.so) shuf(op);
      return { q: q.q, o: op.map(function (x) { return x.t; }), a: op.map(function (x) { return x.k; }).indexOf(q.a), e: q.e };
    });
    S = { bank: id, title: title, mode: o.mode, redo: !!o.redo, qs: qs, ans: qs.map(function () { return -1; }), flag: {}, cur: 0, t0: Date.now(), end: o.mode === 'ujian' ? Date.now() + o.min * 6e4 : 0 };
    clearInterval(tm); tm = setInterval(tick, 1000); view = 'run'; rerender();
  }
  var timeTxt = function () { return S.end ? clock((S.end - Date.now()) / 1000) : clock((Date.now() - S.t0) / 1000); };
  function tick() {
    if (!S) return clearInterval(tm);
    if (S.end && Date.now() >= S.end) { say('Waktu habis', 'Jawaban dikumpulkan otomatis.'); return finish(true); }
    var e = gid('exTm'); if (e) { e.textContent = timeTxt(); e.classList.toggle('low', !!S.end && S.end - Date.now() < 6e4); }
  }
  function pick(k) {
    var q = S.qs[S.cur]; if (k >= q.o.length) return;
    if (S.mode === 'latihan') { if (S.ans[S.cur] >= 0) return; S.ans[S.cur] = k; } else S.ans[S.cur] = S.ans[S.cur] === k ? -1 : k;
    rerender(false);
  }
  function go(i) { if (i < 0 || i >= S.qs.length) return; S.cur = i; rerender(); }
  function finish(auto) {
    var un = S.ans.filter(function (x) { return x < 0; }).length;
    if (!auto && un && !confirm(un + ' soal belum dijawab. Selesaikan sekarang?')) return;
    clearInterval(tm);
    var ok = S.qs.filter(function (q, i) { return S.ans[i] === q.a; }).length;
    var r = { bank: S.bank, title: S.title, date: new Date().toISOString(), mode: S.mode, redo: S.redo, n: S.qs.length, correct: ok, pct: Math.round(ok / S.qs.length * 100), dur: Math.round((Date.now() - S.t0) / 1000) };
    hist.unshift(r); hist = hist.slice(0, 200); wr(HK, hist);
    R = { r: r, s: S }; S = null; view = 'res'; rerender();
  }

  /* ---------- Tampilan: mengerjakan ---------- */
  function vRun() {
    var q = S.qs[S.cur], a = S.ans[S.cur], lock = S.mode === 'latihan' && a >= 0, dn = S.ans.filter(function (x) { return x >= 0; }).length;
    var h = '<div class="ex-hd"><div><b>' + esc(S.title) + '</b><small>Mode ' + S.mode + ', ' + dn + ' dari ' + S.qs.length + ' terjawab</small></div><span class="ex-tm" id="exTm" role="timer">' + timeTxt() + '</span><button class="ac-btn" data-ex="quit">Keluar</button><button class="ac-btn pri" data-ex="finish">Selesai</button></div>';
    h += '<div class="ex-cols"><section class="ex-card"><div class="ex-qn">Soal ' + (S.cur + 1) + ' dari ' + S.qs.length + (S.flag[S.cur] ? ', ditandai' : '') + '</div><p class="ex-q">' + esc(q.q) + '</p><div class="ex-opts">' +
      q.o.map(function (t, k) {
        var c = lock ? (k === q.a ? ' ok' : k === a ? ' bad' : ' dim') : k === a ? ' sel' : '';
        return '<button class="ex-o' + c + '" data-ex="pick" data-k="' + k + '"' + (lock ? ' disabled' : '') + '><i>' + LT[k] + '</i><span>' + esc(t) + '</span></button>';
      }).join('') + '</div>';
    if (lock) h += '<div class="ex-exp ' + (a === q.a ? 'ok' : 'bad') + '" role="status"><b>' + (a === q.a ? 'Benar' : 'Belum tepat') + '</b><p>Jawaban yang benar: ' + LT[q.a] + '. ' + esc(q.o[q.a]) + '</p>' + (q.e ? '<p>' + esc(q.e) + '</p>' : '') + '</div>';
    h += '<div class="ex-nv"><button class="ac-btn" data-ex="prev"' + (S.cur ? '' : ' disabled') + '>Sebelumnya</button><button class="ac-btn" data-ex="flag" aria-pressed="' + !!S.flag[S.cur] + '">' + (S.flag[S.cur] ? 'Lepas tanda' : 'Tandai ragu') + '</button><button class="ac-btn pri" data-ex="next"' + (S.cur < S.qs.length - 1 ? '' : ' disabled') + '>Berikutnya</button></div></section>' +
      '<aside class="ex-sheet"><h4>Lembar jawaban</h4><div class="ex-grid">' + S.qs.map(function (x, i) {
        var v = S.ans[i], c = (i === S.cur ? ' cur' : '') + (v >= 0 ? (S.mode === 'latihan' ? (v === x.a ? ' ok' : ' bad') : ' on') : '') + (S.flag[i] ? ' fl' : '');
        return '<button class="ex-g' + c + '" data-ex="go" data-i="' + i + '" aria-label="Soal ' + (i + 1) + (S.flag[i] ? ', ditandai' : '') + '">' + (i + 1) + '</button>';
      }).join('') + '</div><p class="ex-lg">Tanda titik kecil berarti soal ditandai ragu. Pintasan: A–E untuk memilih, panah kiri/kanan untuk pindah soal.</p></aside></div>';
    return h;
  }

  /* ---------- Tampilan: hasil ---------- */
  function vRes() {
    var r = R.r, s = R.s, blank = s.ans.filter(function (x) { return x < 0; }).length, bad = r.n - r.correct - blank;
    var h = '<div class="ex-sum"><div class="ex-pct"><b>' + r.pct + '</b><small>skor dari 100</small></div><div class="ex-st"><h3>' + esc(r.title) + '</h3><p>' + r.correct + ' benar, ' + bad + ' salah, ' + blank + ' kosong</p><p class="ac-hint">Mode ' + r.mode + ', waktu ' + clock(r.dur) + '</p>' +
      '<div class="ex-act">' + (r.n - r.correct ? '<button class="ac-btn pri" data-ex="redo">Ulangi ' + (r.n - r.correct) + ' soal yang belum benar</button>' : '') + (r.redo ? '' : '<button class="ac-btn" data-ex="setup" data-id="' + esc(r.bank) + '">Kerjakan lagi</button>') + '<button class="ac-btn" data-ex="lib">Kembali ke bank soal</button></div></div></div>';
    h += '<div class="ex-strip">' + s.qs.map(function (q, i) { var v = s.ans[i]; return '<button class="ex-g ' + (v < 0 ? 'skip' : v === q.a ? 'ok' : 'bad') + '" data-ex="jump" data-i="' + i + '" aria-label="Soal ' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') + '</div>';
    h += '<div class="ad-sh"><h2 class="ad-h sm">Pembahasan</h2></div>' + s.qs.map(function (q, i) {
      var v = s.ans[i], st = v < 0 ? 'skip' : v === q.a ? 'ok' : 'bad';
      return '<article class="ex-ri ' + st + '" id="exr' + i + '"><header><span>Soal ' + (i + 1) + '</span><em>' + (st === 'ok' ? 'Benar' : st === 'bad' ? 'Salah' : 'Tidak dijawab') + '</em></header><p class="ex-q sm">' + esc(q.q) + '</p><ul class="ex-rl">' +
        q.o.map(function (t, k) { return '<li class="' + (k === q.a ? 'ok' : k === v ? 'bad' : '') + '"><i>' + LT[k] + '</i><span>' + esc(t) + '</span>' + (k === q.a ? '<b>Jawaban benar</b>' : k === v ? '<b>Jawabanmu</b>' : '') + '</li>'; }).join('') + '</ul>' +
        (q.e ? '<div class="ex-exp"><p>' + esc(q.e) + '</p></div>' : '') + '</article>';
    }).join('');
    return h;
  }

  /* ---------- Impor bank soal ---------- */
  function openImport() {
    var m = document.createElement('div'); m.className = 'ex-ov ac-ov2';
    m.innerHTML = '<form class="ex-imp" novalidate><header><h3>Impor bank soal</h3><button type="button" class="ac-x" data-x aria-label="Tutup">×</button></header>' +
      '<p class="ac-hint">Pilih file .json atau tempel isinya. Bank dengan id yang sama akan diperbarui.</p><input type="file" id="exFile" accept=".json,application/json">' +
      '<textarea id="exJson" rows="9" spellcheck="false" aria-label="Isi JSON" placeholder=\'{"id":"bank-1","title":"Judul","course":"Mata kuliah","questions":[{"q":"Soal","o":["Pilihan A","Pilihan B"],"a":0,"e":"Pembahasan"}]}\'></textarea>' +
      '<p class="ex-err" id="exErr" hidden></p><footer><button type="button" class="ac-btn" data-x>Batal</button><button class="ac-btn pri">Impor</button></footer></form>';
    document.body.appendChild(m);
    var off = function () { m.remove(); }, err = m.querySelector('#exErr'), ta = m.querySelector('#exJson');
    m.addEventListener('mousedown', function (e) { if (e.target === m) off(); });
    m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) off(); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); off(); } });
    m.querySelector('#exFile').addEventListener('change', function (e) { var f = e.target.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { ta.value = fr.result; }; fr.readAsText(f); });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data; try { data = JSON.parse(ta.value); } catch (x) { err.textContent = 'Isi bukan JSON yang valid. Periksa tanda kutip dan koma.'; err.hidden = false; return; }
      var ok = (Array.isArray(data) ? data : [data]).map(norm).filter(Boolean);
      if (!ok.length) { err.textContent = 'Tidak ada soal valid. Setiap soal butuh q, o (minimal 2 pilihan), dan a (indeks atau huruf jawaban).'; err.hidden = false; return; }
      ok.forEach(function (b) { mine = mine.filter(function (x) { return x.id !== b.id; }); mine.push(b); });
      wr(BK, mine); off(); say('Tersimpan', ok.length + ' bank soal ditambahkan'); view = 'lib'; rerender();
    });
    ta.focus();
  }

  /* ---------- Event ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ex]'); if (!b) return;
    var a = b.dataset.ex, d = b.dataset;
    if (a === 'import') return openImport();
    if (a === 'lib') { view = 'lib'; return rerender(); }
    if (a === 'setup') { cfg = { id: d.id, mode: 'latihan', n: 'all', min: '', sh: true, so: false }; view = 'setup'; return rerender(); }
    if (a === 'mode') { readCfg(); cfg.mode = d.v; return rerender(false); }
    if (a === 'start') {
      readCfg(); var bk = bankOf(cfg.id); if (!bk) return;
      if (S && !confirm('Sesi yang sedang berjalan akan diganti. Lanjutkan?')) return;
      var n = cfg.n === 'all' ? bk.questions.length : Math.min(+cfg.n, bk.questions.length);
      return start(bk.id, bk.title, bk.questions, { mode: cfg.mode, n: n, min: Math.max(1, +cfg.min || n), sh: cfg.sh, so: cfg.so });
    }
    if (a === 'resume') { view = 'run'; return rerender(); }
    if (a === 'delbank') { if (confirm('Hapus bank soal ini dari perangkat? Riwayat skor tetap tersimpan.')) { mine = mine.filter(function (x) { return x.id !== d.id; }); wr(BK, mine); rerender(false); } return; }
    if (a === 'jump') { var t = gid('exr' + d.i); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'redo') {
      var wrong = R.s.qs.filter(function (q, i) { return R.s.ans[i] !== q.a; });
      return start(R.r.bank, R.r.title + ' (ulangi)', wrong, { mode: 'latihan', n: wrong.length, sh: true, so: false, redo: true });
    }
    if (!S) return;
    if (a === 'pick') return pick(+d.k);
    if (a === 'go') return go(+d.i);
    if (a === 'prev') return go(S.cur - 1);
    if (a === 'next') return go(S.cur + 1);
    if (a === 'flag') { S.flag[S.cur] = !S.flag[S.cur]; return rerender(false); }
    if (a === 'finish') return finish(false);
    if (a === 'quit') { if (!confirm('Keluar dari sesi ini? Jawabanmu tidak akan disimpan.')) return; clearInterval(tm); S = null; view = 'lib'; return rerender(); }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'exMin' && cfg) { e.target.dataset.t = '1'; cfg.min = e.target.value; } });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'exN' || !cfg) return;
    var m = gid('exMin'), bk = bankOf(cfg.id); if (m && !m.dataset.t && bk) m.value = e.target.value === 'all' ? bk.questions.length : e.target.value;
  });
  document.addEventListener('keydown', function (e) {
    var t = gid('exTm'); if (!S || view !== 'run' || !t || !t.offsetParent || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key.toLowerCase(), i = 'abcdef'.indexOf(k); if (k.length !== 1) i = -1;
    if (i >= 0 && i < S.qs[S.cur].o.length) { pick(i); e.preventDefault(); }
    else if (e.key === 'ArrowRight') go(S.cur + 1); else if (e.key === 'ArrowLeft') go(S.cur - 1);
  });

  MO.examView = function () { return view === 'setup' && cfg ? vSetup() : view === 'run' && S ? vRun() : view === 'res' && R ? vRes() : vLib(); };
})();
