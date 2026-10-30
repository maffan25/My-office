/* =====================================================================
   MyOffice — PREMIUM UI layer (JS)
   Menghias jendela menu yang dibuat modul lain: warna identitas, ikon,
   sidebar, indikator tab yang bergeser, animasi buka dari ikon menu,
   dan hitung-naik angka statistik. Tidak mengubah data/logika modul.
   ===================================================================== */
(function () {
  'use strict';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var svg = function (p, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };

  /* ---------- Identitas tiap menu ---------- */
  var MODS = [
    { k: 'academic', m: /academic/, sym: 'i-academic', a: '#95cad5', b: '#92c8d4' },
    { k: 'work', m: /work/, sym: 'i-work', a: '#548a96', b: '#86bfcc' },
    { k: 'org', m: /organi/, sym: 'i-org', a: '#90c6d2', b: '#e9ac9a' },
    { k: 'project', m: /project/, sym: 'i-project', a: '#df9b88', b: '#e9ab99' },
    { k: 'task', m: /task/, sym: 'i-task', a: '#86bfcc', b: '#649ca9' },
    { k: 'cal', m: /kalender|calendar/, sym: 'i-cal', a: '#e9ac9a', b: '#df9b88' },
    { k: 'fin', m: /financ|keuangan/, sym: 'i-fin', a: '#5d94a1', b: '#70a9b6' },
    { k: 'goal', m: /goal/, sym: 'i-goal', a: '#e9ab99', b: '#d89582' },
    { k: 'doc', m: /document/, sym: 'i-doc', a: '#c38271', b: '#e09d8a' },
    { k: 'ana', m: /analytic/, sym: 'i-chart', a: '#649ca9', b: '#93c9d4' },
    { k: 'set', m: /setting/, sym: 'i-set', a: '#7b877a', b: '#93c9d4' }
  ];
  var DEF = { k: 'x', sym: 'i-project', a: '#95cad5', b: '#92c8d4' };
  function modOf(label) {
    label = (label || '').toLowerCase();
    for (var i = 0; i < MODS.length; i++) if (MODS[i].m.test(label)) return MODS[i];
    return DEF;
  }

  /* ---------- Ikon tab ---------- */
  var I = {
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    check: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>',
    done: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    pen: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6l-4 1 1-4z"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    bank: '<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3 3 8h18z"/>',
    swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".6" fill="currentColor"/>',
    goal: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    next: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    layers: '<path d="m12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8z"/><path d="m22 17.7-9.2 4.1a2 2 0 0 1-1.6 0L2 17.7M22 12.7l-9.2 4.1a2 2 0 0 1-1.6 0L2 12.7"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    dot: '<circle cx="12" cy="12" r="3.2"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  var TI = [
    [/analisis|analitik|analytics/, 'chart'], [/semester|kalender|calendar/, 'cal'], [/mata kuliah/, 'book'], [/ujian/, 'pen'],
    [/formula|pengaturan|ambang/, 'sliders'], [/klien/, 'users'], [/jam kerja/, 'clock'], [/pekerjaan/, 'briefcase'],
    [/dokumen/, 'folder'], [/pendapatan/, 'coins'], [/profil/, 'user'], [/rapat/, 'msg'], [/anggaran/, 'pie'],
    [/ringkasan|overview/, 'dash'], [/akun/, 'bank'], [/transaksi/, 'swap'], [/kategori/, 'tag'], [/tabungan/, 'goal'],
    [/my day/, 'sun'], [/upcoming/, 'next'], [/overdue/, 'alert'], [/all tasks/, 'list'], [/by project/, 'layers'],
    [/by area/, 'grid'], [/completed|selesai/, 'done'], [/tugas|task/, 'check'], [/status/, 'flag'], [/data|cadangan/, 'db'],
    [/keuangan/, 'coins'], [/akademik/, 'book'], [/kerja/, 'briefcase'], [/produktivitas/, 'trend']
  ];
  function tabIcon(label) {
    label = (label || '').toLowerCase();
    for (var i = 0; i < TI.length; i++) if (TI[i][0].test(label)) return I[TI[i][1]];
    return I.dot;
  }

  /* ---------- Dekorasi jendela ---------- */
  function fixClose(ov) {
    Array.prototype.forEach.call(ov.querySelectorAll('.ac-x'), function (b) {
      if (b.textContent.trim() === '×') b.innerHTML = svg(I.x, 2);
    });
  }
  function inherit(ov) {
    var src = document.querySelector('.ac-ov[data-mod]:not(.ac-ov2):not([hidden])');
    if (!src) return;
    ov.dataset.mod = src.dataset.mod;
    ov.style.setProperty('--ac', src.style.getPropertyValue('--ac'));
    ov.style.setProperty('--ac2', src.style.getPropertyValue('--ac2'));
  }
  function decorate(ov) {
    if (ov.__pm) return; ov.__pm = 1;
    var win = ov.querySelector('.ac-win'); if (!win) return;
    if (ov.classList.contains('ac-ov2')) { inherit(ov); fixClose(ov); return; }

    var m = modOf(win.getAttribute('aria-label'));
    ov.dataset.mod = m.k;
    ov.style.setProperty('--ac', m.a); ov.style.setProperty('--ac2', m.b);

    var hd = win.querySelector(':scope > header');
    if (hd) hd.insertAdjacentHTML('afterbegin', '<span class="ac-ico">' + svg('<use href="#' + m.sym + '"/>', 1.6) + '</span>');
    fixClose(ov);

    var nav = win.querySelector(':scope > .ac-tabs');
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll('.ac-tab'), function (b) {
        b.insertAdjacentHTML('afterbegin', svg(tabIcon(b.textContent), 1.7).replace('<svg ', '<svg class="ac-ti" '));
      });
      nav.insertAdjacentHTML('afterbegin', '<div class="ac-brand"><span class="ac-bd"></span><div><b>MyOffice</b><small>Plan · Execute · Achieve</small></div></div><i class="ac-ind"></i>');
      nav.insertAdjacentHTML('beforeend', '<div class="ac-side-foot"><kbd>Esc</kbd><span>untuk menutup</span></div>');
      new MutationObserver(function () { place(ov); }).observe(nav, { attributes: true, attributeFilter: ['aria-selected'], subtree: true });
    }
  }

  /* ---------- Indikator tab ---------- */
  function place(ov) {
    var nav = ov.querySelector('.ac-win > .ac-tabs'); if (!nav) return;
    var ind = nav.querySelector('.ac-ind'), s = nav.querySelector('.ac-tab[aria-selected="true"]');
    if (!ind || !s || !s.offsetWidth) return;
    ind.style.width = s.offsetWidth + 'px'; ind.style.height = s.offsetHeight + 'px';
    ind.style.transform = 'translate(' + s.offsetLeft + 'px,' + s.offsetTop + 'px)';
    if (!ind.__init) { ind.__init = 1; requestAnimationFrame(function () { requestAnimationFrame(function () { ind.classList.add('on'); }); }); }
    if (getComputedStyle(nav).flexDirection === 'row') {
      var l = Math.max(0, s.offsetLeft - (nav.clientWidth - s.offsetWidth) / 2);
      if (nav.scrollTo) nav.scrollTo({ left: l, behavior: reduce || !ind.__init ? 'auto' : 'smooth' }); else nav.scrollLeft = l;
    }
  }

  /* ---------- Hitung-naik angka statistik ---------- */
  function countUp(root) {
    if (reduce) return;
    Array.prototype.forEach.call(root.querySelectorAll('.ac-stat b'), function (b) {
      if (b.children.length) return;
      var t = b.textContent.trim(), rp = /^(Rp\s?)(-?[\d.]+)$/.exec(t), pl = /^(-?\d+(?:\.(\d+))?)(%?)$/.exec(t), to, fmt;
      if (rp) { to = +rp[2].replace(/\./g, ''); fmt = function (v) { return rp[1] + Math.round(v).toLocaleString('id-ID'); }; }
      else if (pl) { to = parseFloat(pl[1]); var d = pl[2] ? pl[2].length : 0; fmt = function (v) { return v.toFixed(d) + pl[3]; }; }
      else return;
      if (!isFinite(to) || Math.abs(to) < 2) return;
      var t0 = null, dur = 850;
      (function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        b.textContent = p < 1 ? fmt(to * e) : t;
        if (p < 1 && b.isConnected) requestAnimationFrame(step);
      })(performance.now());
    });
  }
  function enter(ov) {
    var b = ov.querySelector('.ac-body'); if (!b) return;
    b.classList.remove('ac-enter'); void b.offsetWidth; b.classList.add('ac-enter');
    clearTimeout(b.__t); b.__t = setTimeout(function () { b.classList.remove('ac-enter'); }, 1100);
    countUp(b);
  }

  /* ---------- Animasi buka dari ikon menu ---------- */
  var last = null;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.nav a, .avatar');
    if (a) { var r = a.getBoundingClientRect(); last = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: Date.now() }; }
  }, true);

  function launch(ov) {
    var win = ov.querySelector('.ac-win'); if (!win) return;
    var r = win.getBoundingClientRect();
    if (last && Date.now() - last.t < 1500) {
      ov.style.setProperty('--ox', (last.x - r.left) + 'px'); ov.style.setProperty('--oy', (last.y - r.top) + 'px');
    } else { ov.style.removeProperty('--ox'); ov.style.removeProperty('--oy'); }
    ov.classList.remove('ac-launch'); void ov.offsetWidth; ov.classList.add('ac-launch');
    clearTimeout(ov.__lt); ov.__lt = setTimeout(function () { ov.classList.remove('ac-launch'); }, 900);
    enter(ov); place(ov);
  }
  function watch(ov) {
    if (ov.classList.contains('ac-ov2')) return;
    new MutationObserver(function () { if (!ov.hidden) launch(ov); }).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
    /* pindah tab: animasi isi sekali */
    ov.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.ac-tab')) setTimeout(function () { enter(ov); }, 0);
    }, true);
    if (!ov.hidden) launch(ov);
  }
  function adopt(n) {
    if (n.nodeType !== 1 || !n.classList.contains('ac-ov')) return;
    decorate(n); watch(n);
  }

  new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, adopt); });
  }).observe(document.body, { childList: true });
  Array.prototype.forEach.call(document.querySelectorAll('.ac-ov'), adopt);

  var rz; window.addEventListener('resize', function () {
    clearTimeout(rz); rz = setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.ac-ov:not(.ac-ov2):not([hidden])'), place);
    }, 80);
  });
})();
