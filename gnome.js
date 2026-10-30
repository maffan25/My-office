/* =====================================================================
   MyOffice — gnome.js : pulau kurcaci hidup.
   Air terjun mengalir, burung terbang, angin berhembus (kurcaci berpegangan
   pada tali), dan kurcaci tanpa wajah mengobrol tentang tugas/agenda/goal
   nyata dari localStorage. Hanya MEMBACA data; aktif bila data-wall=kurcaci.
   ===================================================================== */
(function () {
  'use strict';
  var D = document, root = D.documentElement, W0 = 1585, H0 = 992;
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var stack = D.querySelector('.bg .stack'); if (!stack) return;
  function el(t, c, h) { var e = D.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function X(x) { return (x / W0 * 100).toFixed(3) + '%'; }
  function Y(y) { return (y / H0 * 100).toFixed(3) + '%'; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function lsj(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }

  /* ---------- Panggung ---------- */
  var art = el('div', 'gs'), ui = el('div', 'gs gs-ui');
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = '<img class="gs-bg" src="assets/island.jpg" alt="" draggable="false">';
  stack.appendChild(art); D.body.appendChild(ui);

  /* logo jamur di pojok kiri atas */
  var brand = D.querySelector('.brand');
  if (brand) brand.insertAdjacentHTML('afterbegin', '<svg class="mush" viewBox="0 0 40 40" aria-hidden="true"><path d="M5 22C5 11 12 4 20 4s15 7 15 18c0 1.5-1 2-2.5 2h-25C6 24 5 23.500 5 22z" fill="#c8302a"/><path d="M5 22C5 11 12 4 20 4s15 7 15 18" fill="none" stroke="#8f1c16" stroke-width="1.200"/><circle cx="14" cy="13" r="3" fill="#fff4e2"/><circle cx="25" cy="10" r="2.400" fill="#fff4e2"/><circle cx="28" cy="18" r="2" fill="#fff4e2"/><path d="M14 24h12v6c0 3-3 5-6 5s-6-2-6-5z" fill="#f6e3c8"/></svg>');

  /* ---------- Air terjun ---------- */
  function poly(pts) { return 'polygon(' + pts.map(function (p) { return (p[0] / W0 * 100).toFixed(2) + '% ' + (p[1] / H0 * 100).toFixed(2) + '%'; }).join(',') + ')'; }
  [[[772, 408], [846, 408], [852, 452], [764, 452]],
   [[721, 668], [829, 668], [836, 740], [840, 800], [838, 846], [719, 846], [716, 790], [718, 730]],
   [[722, 897], [836, 897], [842, 950], [830, 992], [738, 992], [726, 950]]].forEach(function (p) {
    var f = el('div', 'wf', '<i></i><i></i><i></i>'); f.style.clipPath = f.style.webkitClipPath = poly(p); art.appendChild(f);
  });
  [[778, 986, 11], [820, 990, 9], [740, 988, 8]].forEach(function (m, i) {
    var s = el('div', 'mist'); s.style.cssText = 'left:' + X(m[0]) + ';top:' + Y(m[1]) + ';width:' + m[2] + 'cqw;height:' + (m[2] * .6) + 'cqw;animation-delay:-' + i * 1.1 + 's'; art.appendChild(s);
  });

  /* ---------- Kurcaci: kepala dianimasikan, badan tetap di gambar ---------- */
  var GN = [
    { k: 'g1', x: 609, y: 254, w: 85, h: 84, hx: 640, hy: 350, ax: 586, ay: 362, d: 5.6, a: .8, grp: 0 },
    { k: 'g2', x: 440, y: 347, w: 57, h: 69, hx: 452, hy: 428, ax: 408, ay: 446, d: 4.2, a: 1.1, grp: 0 },
    { k: 'g3', x: 1015, y: 297, w: 65, h: 100, hx: 1040, hy: 378, ax: 996, ay: 388, d: 5, a: .7, grp: 0 },
    { k: 'g4', x: 316, y: 745, w: 54, h: 88, hx: 338, hy: 836, ax: 286, ay: 852, d: 4.6, a: 1, grp: 1 },
    { k: 'g5', x: 1295, y: 761, w: 57, h: 81, hx: 1320, hy: 832, ax: 1274, ay: 846, d: 4.1, a: 1, grp: 1 },
    { k: 'g6', x: 1384, y: 755, w: 60, h: 81, hx: 1406, hy: 828, ax: 1362, ay: 846, d: 5.2, a: 1.2, grp: 1 }];
  var ropes = '<svg class="rope" viewBox="0 0 1585 992" preserveAspectRatio="none">';
  GN.forEach(function (g) {
    var n = el('div', 'gn', '<div class="gn-in"><img src="assets/' + g.k + '.png" alt="" draggable="false"></div>');
    n.style.cssText = 'left:' + X(g.x) + ';top:' + Y(g.y) + ';width:' + (g.w / W0 * 100).toFixed(3) + '%;--d:' + g.d + 's;--a:' + g.a + ';--dl:-' + rnd(0, 4).toFixed(1) + 's';
    art.appendChild(n); g.n = n;
    var b = el('div', 'bub'); b.style.left = X(g.x + g.w / 2); b.style.top = Y(g.y); ui.appendChild(b); g.b = b;
    ropes += '<path d="M' + g.ax + ' ' + (g.ay - 8) + ' L' + g.hx + ' ' + g.hy + '" stroke="#c89b5b" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      '<rect x="' + (g.ax - 3.5) + '" y="' + (g.ay - 18) + '" width="7" height="24" rx="3.500" fill="#8a5a35"/>' +
      '<circle cx="' + g.hx + '" cy="' + g.hy + '" r="4.500" fill="#f0c79a" stroke="#b98a5e" stroke-width="1.200"/>';
  });
  art.insertAdjacentHTML('beforeend', ropes + '</svg>');

  /* ---------- Teks hidup di papan kayu ---------- */
  function put(cls, x, y, txt, c) { var e = el('div', 'pl ' + cls + (c ? ' c' : ''), txt); e.style.left = X(x); e.style.top = Y(y); ui.appendChild(e); return e; }
  var tTime = put('pl-time', 683, 494, '--:--'), tDate = put('pl-date', 686, 527, ''),
      tSec = put('pl-sec', 947, 500, '', 1), tZone = put('pl-sec', 947, 516, 'WIB', 1);
  var nums = [662, 798, 927].map(function (x) { return put('pl-num', x, 611, '0', 1); });
  [[649, 'Tugas aktif'], [779, 'Agenda hari ini'], [917, 'Goal berjalan']].forEach(function (l) { put('pl-lbl', l[0], 636, l[1], 1); });
  var hits = [[650, '#task', 'Tugas aktif'], [783, '#calendar', 'Agenda hari ini'], [917, '#goal', 'Goal berjalan']].map(function (h) {
    var a = el('a', 'pl-hit'); a.href = h[1]; a.style.cssText = 'left:' + X(h[0]) + ';top:' + Y(620) + ';width:' + (125 / W0 * 100) + '%;height:' + (62 / H0 * 100) + '%';
    a.addEventListener('click', function (e) { e.preventDefault(); var r = window.MyOffice && MyOffice.routes && MyOffice.routes[h[1]]; if (r) r(); });
    ui.appendChild(a); return a;
  });
  var tzEl = D.getElementById('zone');
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function counts() {
    var td = today(), T = lsj('mo-task-v1').task || [], E = lsj('mo-cal-v1').ev || [], G = lsj('mo-goal-v1').goal || [];
    return {
      t: T.filter(function (t) { return t.status !== 'Done' && t.status !== 'Archived'; }).length,
      e: E.filter(function (e) { var s = String(e.start || '').slice(0, 10), z = String(e.end || e.start || '').slice(0, 10); return s && s <= td && z >= td; }).length,
      g: G.filter(function (g) { return g.status === 'Berjalan'; }).length
    };
  }
  var cTick = 0;
  function tick() {
    var d = new Date();
    tTime.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    tSec.textContent = tTime.textContent + ':' + pad(d.getSeconds());
    tDate.textContent = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (tzEl && tzEl.textContent) tZone.textContent = tzEl.textContent;
    if (cTick++ % 3 === 0) {
      var c = counts(), v = [c.t, c.e, c.g];
      nums.forEach(function (n, i) { n.textContent = v[i]; });
      hits.forEach(function (a, i) { a.setAttribute('aria-label', ['Tugas aktif: ', 'Agenda hari ini: ', 'Goal berjalan: '][i] + v[i]); });
    }
  }

  /* ---------- Burung, daun, garis angin ---------- */
  var SW = W0, S = 1, items = [], w = 0, lastW = -1, isG = false, gust = null;
  var BIRD = '<svg viewBox="0 0 60 40"><path class="wing b" d="M24 18C19 6 10 4 5 8c7 1 13 6 16 14z" fill="#c9805a"/><path d="M17 21L3 25l1 4 14-3z" fill="#7a3a24"/><ellipse cx="30" cy="22" rx="14" ry="8" fill="#9a4f31"/><ellipse cx="36" cy="25" rx="8" ry="5.500" fill="#d9442f"/><circle cx="43" cy="17" r="6.500" fill="#9a4f31"/><circle cx="45.500" cy="19.500" r="4" fill="#d9442f"/><path d="M49 16l7 2.500-7 1.500z" fill="#f2b04c"/><circle cx="46" cy="15.500" r="1.200" fill="#2a1410"/><path class="wing" d="M28 19C22 3 11 1 4 6c9 2 15 8 19 17z" fill="#a85a3a"/></svg>';
  function build() {
    if (reduce) return;
    var lite = root.dataset.lite === '1';
    [[.12, 1, 60], [.22, 1, 78], [.33, -1, 48], [.43, 1, 66], [.07, -1, 55]].slice(0, lite ? 3 : 5).forEach(function (b) {
      var e = el('div', 'brd', BIRD); art.appendChild(e);
      items.push({ t: 'b', e: e, x: rnd(0, W0), y0: b[0], dir: b[1], sp: b[2], amp: rnd(8, 22), f: rnd(.8, 1.6), ph: rnd(0, 6), sz: rnd(.028, .038) });
    });
    var cols = ['#4f8a3c', '#6aa84f', '#c8453a', '#e8a0a8', '#d9a441'];
    for (var i = 0; i < (lite ? 8 : 18); i++) {
      var l = el('i', 'lf'); l.style.background = pick(cols); art.appendChild(l);
      items.push({ t: 'l', e: l, x: rnd(0, W0), y: rnd(40, H0 - 60), sp: rnd(14, 34), k: rnd(.8, 1.6), ph: rnd(0, 6), r: rnd(60, 220) });
    }
    for (var j = 0; j < 7; j++) {
      var q = el('b', 'wl'); art.appendChild(q);
      items.push({ t: 'w', e: q, x: rnd(-400, W0), y: rnd(60, H0 - 80), len: rnd(160, 380), sp: rnd(900, 1500) });
    }
  }
  function size() { SW = art.clientWidth || W0; S = SW / W0; }
  var last = 0, raf = 0, tt = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(.05, (t - last) / 1000 || 0); last = t; tt += dt;
    var tgt = 0;
    if (gust) { gust.t += dt; tgt = Math.max(0, Math.min(1, gust.t / 1.3, (gust.dur - gust.t) / 1.6)); if (gust.t >= gust.dur) { gust = null; endGust(); } }
    w += (tgt - w) * Math.min(1, dt * 6);
    if (Math.abs(w - lastW) > .004) { art.style.setProperty('--w', w.toFixed(3)); lastW = w; }
    var g = w > .12; if (g !== isG) { isG = g; art.classList.toggle('gust', g); }
    var H = SW * H0 / W0;
    items.forEach(function (o) {
      if (o.t === 'b') {
        var v = o.dir > 0 ? o.sp * (1 + w * 2.2) : o.sp * (1 - .6 * w);
        o.x += o.dir * v * S * dt; var wd = SW * o.sz;
        if (o.dir > 0 && o.x > SW + 80) o.x = -wd - 40; if (o.dir < 0 && o.x < -wd - 80) o.x = SW + 40;
        var y = o.y0 * H + Math.sin(tt * o.f + o.ph) * o.amp * S - w * 6 * Math.sin(tt * 9 + o.ph);
        o.e.style.width = wd + 'px'; o.e.style.transform = 'translate3d(' + o.x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scaleX(' + o.dir + ')';
      } else if (o.t === 'l') {
        o.x += (o.sp + w * 260 * o.k) * S * dt; if (o.x > SW + 20) { o.x = -20; o.y = rnd(40, H0 - 60); }
        var yy = o.y * S + Math.sin(tt * 1.3 + o.ph) * 18 * S + w * 24 * Math.sin(tt * 5 + o.ph);
        o.e.style.transform = 'translate3d(' + (o.x * S).toFixed(1) + 'px,' + yy.toFixed(1) + 'px,0) rotate(' + ((tt * o.r + o.ph * 50) % 360).toFixed(0) + 'deg)';
      } else {
        o.e.style.opacity = (w * .6).toFixed(2); if (w < .03) { o.x = -o.len - rnd(0, 600); return; }
        o.x += o.sp * dt * S * (.6 + w); if (o.x > SW + 40) { o.x = -o.len * S; o.y = rnd(60, H0 - 80); }
        o.e.style.width = o.len * S + 'px'; o.e.style.transform = 'translate3d(' + o.x.toFixed(1) + 'px,' + (o.y * S).toFixed(1) + 'px,0)';
      }
    });
  }

  /* ---------- Obrolan: data nyata ---------- */
  var DONE = /^(Selesai|Done|Tercapai|Archived|Dibatalkan)$/;
  function dd(s) { return Math.round((Date.parse(s + 'T00:00:00') - Date.parse(today() + 'T00:00:00')) / 864e5); }
  function when(n) { return n < 0 ? Math.abs(n) + ' hari terlambat' : n === 0 ? 'hari ini' : n === 1 ? 'besok' : n + ' hari lagi'; }
  function q(t) { t = String(t || ''); return '“' + (t.length > 32 ? t.slice(0, 31) + '…' : t) + '”'; }
  function dialogs() {
    var T = lsj('mo-task-v1').task || [], A = lsj('mo-acad-v1'), Wk = lsj('mo-work-v1'), E = lsj('mo-cal-v1').ev || [], G = lsj('mo-goal-v1').goal || [];
    var c = counts(), td = today(), h = new Date().getHours(), dow = new Date().getDay(), L = [];
    var tasks = [];
    T.forEach(function (t) { if (t.title && !DONE.test(t.status || '')) tasks.push({ t: t.title, d: String(t.due || '').slice(0, 10) }); });
    (A.task || []).forEach(function (t) { if (t.title && !DONE.test(t.status || '')) tasks.push({ t: t.title, d: String(t.deadline || '').slice(0, 10) }); });
    (Wk.wtask || []).forEach(function (t) { if (t.title && !DONE.test(t.status || '')) tasks.push({ t: t.title, d: String(t.deadline || '').slice(0, 10) }); });
    var dated = tasks.filter(function (t) { return t.d; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var late = dated.filter(function (t) { return t.d < td; }), soon = dated.filter(function (t) { return t.d >= td; })[0];
    if (c.t) L.push(['Ada ' + c.t + ' tugas aktif nih. Yuk dicicil satu-satu.', soon ? 'Yang paling dekat: ' + q(soon.t) + ', ' + when(dd(soon.d)) + '.' : 'Belum ada yang bertenggat, tapi jangan ditunda ya.', 'Siap! Kita semangati dia.']);
    else L.push(['Tugas aktif kosong. Hebat sekali!', 'Waktunya santai, atau mulai goal baru?']);
    if (late.length) L.push(['Hei, ' + q(late[0].t) + ' sudah lewat ' + Math.abs(dd(late[0].d)) + ' hari!', 'Waduh. Kerjakan duluan sebelum yang lain menumpuk.']);
    if (soon) L.push(['Catat ya: ' + q(soon.t) + ' tenggatnya ' + when(dd(soon.d)) + '.', 'Sudah mulai dikerjakan belum?']);
    var evT = E.filter(function (e) { var s = String(e.start || '').slice(0, 10), z = String(e.end || e.start || '').slice(0, 10); return s && s <= td && z >= td; });
    if (evT.length) L.push(['Hari ini ada ' + evT.length + ' agenda: ' + q(evT[0].title) + (evT[0].startTime ? ' pukul ' + evT[0].startTime : '') + '.', 'Jangan sampai terlewat!']);
    else L.push(['Agenda hari ini kosong.', 'Pas untuk mencicil tugas atau goal.']);
    var nx = E.filter(function (e) { var s = String(e.start || '').slice(0, 10); return s > td; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; })[0];
    if (nx) L.push(['Agenda berikutnya: ' + q(nx.title) + ', ' + when(dd(String(nx.start).slice(0, 10))) + '.', 'Sudah disiapkan belum?']);
    var gl = G.filter(function (g) { return g.status === 'Berjalan' && g.name; });
    if (gl.length) L.push(['Goal ' + q(pick(gl).name) + ' masih berjalan.', 'Langkah kecil tiap hari, lama-lama sampai juga!']);
    (A.exam || []).filter(function (e) { return e.date && (e.score === '' || e.score == null) && dd(String(e.date).slice(0, 10)) >= 0; }).slice(0, 1).forEach(function (e) {
      L.push(['Ujian ' + (e.type || '') + ' ' + when(dd(String(e.date).slice(0, 10))) + '.', 'Ayo siapkan catatan dari sekarang.']);
    });
    if (h >= 4 && h < 10) L.push(['Selamat pagi! Hari ini mau mulai dari mana?', 'Yang paling penting dulu, ya.']);
    else if (h < 15) L.push(['Sudah makan siang? Jangan lupa istirahat.', 'Setelah itu lanjut lagi, pelan-pelan.']);
    else if (h < 18) L.push(['Sore hari, saatnya cek progres tugas.', 'Sisanya bisa dilanjut besok.']);
    else L.push(['Hari sudah gelap. Yuk rapikan catatan hari ini.', 'Istirahat cukup biar besok segar.']);
    if (dow === 5) L.push(['Hari Jumat! Selesaikan yang ringan dulu.', 'Lalu rehat. Akhir pekan sudah dekat.']);
    if (dow === 1) L.push(['Awal minggu! Susun prioritas dulu.', 'Tiga tugas utama saja cukup.']);
    L.push(['Ikannya belum ada yang menyambar...', 'Sabar. Sambil menunggu, cek tugas: ada ' + c.t + '.']);
    L.push(['Kayu bakar sudah cukup untuk malam ini.', 'Bagus! Tinggal tugas-tugasnya yang dicicil.']);
    return L;
  }

  var E_ = 0, on = false, hist = [], timers = [];
  function later(fn, ms) { var ep = E_; var id = setTimeout(function () { if (ep === E_ && on) fn(); }, ms); timers.push(id); }
  function hideAll() { GN.forEach(function (g) { g.b.classList.remove('on', 'shout'); g.n.classList.remove('talk'); }); }
  function say(g, text, done, shout) {
    var b = g.b, ep = E_, k = 0; b.textContent = ''; b.classList.toggle('shout', !!shout); b.classList.add('on'); g.n.classList.add('talk');
    (function ty() {
      if (ep !== E_) return;
      if (reduce) k = text.length; else { k = Math.min(text.length, k + 2); }
      b.textContent = text.slice(0, k);
      if (k < text.length) return void later(ty, 38);
      g.n.classList.remove('talk');
      later(function () { b.classList.remove('on'); later(done, 380); }, (shout ? 1500 : 2300) + text.length * 48);
    })();
  }
  function run(gr) {
    var mem = GN.filter(function (g) { return g.grp === gr; });
    (function next() {
      var cand = dialogs(), d = pick(cand.filter(function (x) { return hist.indexOf(x[0]) < 0; }).concat(cand)); hist.push(d[0]); if (hist.length > 8) hist.shift();
      var i = 0, last = -1;
      (function line() {
        if (i >= d.length) return later(next, rnd(2500, 5500));
        var s; do { s = Math.floor(Math.random() * mem.length); } while (s === last && mem.length > 1); last = s;
        say(mem[s], d[i++], line);
      })();
    })();
  }
  function startTalk() { E_++; hideAll(); later(function () { run(0); }, 1200); later(function () { run(1); }, 4200); }

  /* ---------- Angin ---------- */
  var SHOUT = ['Pegangan yang kencang!', 'Wuaa, anginnya kuat!', 'Jangan lepas talinya!', 'Topiku mau terbang!', 'Tahan, tahan!', 'Aku tidak mau terbang!'];
  function startGust() {
    if (!on || reduce) return;
    gust = { t: 0, dur: rnd(6.5, 8.5) }; E_++; hideAll();
    GN.slice().sort(function () { return Math.random() - .5; }).slice(0, 4).forEach(function (g, i) {
      later(function () { say(g, pick(SHOUT), function () { }, true); }, 500 + i * 900);
    });
  }
  var gTimer = 0;
  function schedGust(ms) { clearTimeout(gTimer); if (!reduce) gTimer = setTimeout(startGust, ms); }
  function endGust() {
    E_++; hideAll();
    later(function () { say(pick(GN), 'Fiuh... anginnya reda juga.', function () { }); }, 600);
    later(startTalk, 4200);
    schedGust(rnd(24000, 40000));
  }

  /* ---------- Hidup / mati mengikuti wallpaper ---------- */
  var tickId = 0;
  function start() {
    if (on) return; on = true; size();
    tick(); tickId = setInterval(tick, 1000);
    if (!reduce) { last = performance.now(); raf = requestAnimationFrame(frame); }
    startTalk();
    schedGust(11000);
  }
  function stop() {
    if (!on) return; on = false; E_++; cancelAnimationFrame(raf); clearInterval(tickId);
    timers.forEach(clearTimeout); timers = []; clearTimeout(gTimer); gust = null; hideAll();
  }
  function sync() { if (root.dataset.wall === 'kurcaci') start(); else stop(); }
  build();
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-wall'] });
  addEventListener('resize', size);
  D.addEventListener('visibilitychange', function () { last = performance.now(); });
  sync();
})();
