/* REVISI 4 — efek angka menghitung naik (count up) untuk seluruh modul.
   Angka statistik dihitung dari 0 (atau dari nilai sebelumnya) ke nilai akhir, tiap kali muncul / berubah. */
(function () {
  'use strict';
  if (window.MOCountUp) return;
  window.MOCountUp = true;

  var SEL = [
    '.tchip b',                                   /* Beranda: Tugas aktif, Agenda, Goal */
    '.ac-stat b', '.dv-stats b',                  /* Academic, Project */
    '.tk3-tile b',                                /* Task */
    '.fn-sum b', '.an-k b',                       /* Finance, Analisis keuangan */
    '.wo-stat b',                                 /* Work */
    '.es-stats b',                                /* Organization */
    '.gq-pop b', '.gq-lvl b',                     /* Goal */
    '.fn-ban p b', '.cu', '.fn-cats small', '.fn-bud em', '.fn-rc strong',   /* Finance: banner, kategori, persen label, resi */
    '.bn-big'                                     /* Analytics */
  ].join(',');

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = 1300;
  /* teks harus berbentuk: [tanda][Rp ]angka[%|XP|jam|…][ / angka] — selain itu (tanggal, jam, dll) dilewati */
  var RE = /^([−\-+]?[\s ]?(?:Rp\.?[\s ]?)?)(\d[\d.,]*)((?:[\s ]?(?:%|XP|jam|menit|hari|x))?(?:[\s ]?\/[\s ]?\d[\d.,]*)?)$/;
  var recent = {};                                /* kunci -> {t, val, at}: cegah animasi ulang saat render ulang cepat */

  function parse(txt) {
    var m = RE.exec(txt); if (!m) return null;
    var raw = m[2], v, fmt;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {            /* 1.234.567 (format Indonesia) */
      var dc = (raw.split(',')[1] || '').length;
      v = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
      fmt = function (x) { return x.toLocaleString('id-ID', { minimumFractionDigits: dc, maximumFractionDigits: dc }); };
    } else if (/^\d+,\d+$/.test(raw)) {                      /* 3,5 */
      var dd = raw.split(',')[1].length; v = parseFloat(raw.replace(',', '.'));
      fmt = function (x) { return x.toFixed(dd).replace('.', ','); };
    } else if (/^\d+\.\d+$/.test(raw)) {                     /* 12.5 */
      var de = raw.split('.')[1].length; v = parseFloat(raw);
      fmt = function (x) { return x.toFixed(de); };
    } else if (/^\d+$/.test(raw)) {                          /* 12 */
      v = parseInt(raw, 10); fmt = function (x) { return String(Math.round(x)); };
    } else return null;
    if (!isFinite(v)) return null;
    return { pre: m[1], suf: m[3], v: v, f: function (x) { return m[1] + fmt(x) + m[3]; } };
  }

  function keyOf(el) {
    var root = el.closest('.fn-app,.ac-ov,#today,.app') || document.body, i = 0, n = el;
    var lab = (el.parentElement && (el.parentElement.textContent || '').replace(el.textContent, '').trim().slice(0, 40)) || '';
    var all = root.querySelectorAll(SEL); for (i = 0; i < all.length; i++) if (all[i] === el) break;
    return (root.id || root.className || 'x').toString().slice(0, 30) + '|' + lab + '|' + i;
  }

  function run(el, p, from) {
    var t0 = null, to = p.v;
    el.__cuRun = true;
    el.textContent = p.f(from);
    (function step(ts) {
      if (!el.isConnected) { el.__cuRun = false; return; }
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / DUR), e = 1 - Math.pow(1 - k, 3);
      if (k < 1) { el.textContent = p.f(from + (to - from) * e); requestAnimationFrame(step); }
      else { el.__cuRun = false; el.__cuFinal = p.f(to); el.textContent = el.__cuFinal; }
    })(performance.now());
  }

  function consider(el) {
    if (el.__cuRun || el.children.length) return;
    var txt = el.textContent.trim();
    if (!txt || txt === el.__cuFinal) return;
    var p = parse(txt); if (!p) return;
    el.__cuFinal = txt;
    if (reduce || Math.abs(p.v) < 1 && p.v === 0) { el.__cuVal = p.v; return; }
    var from = 0, key = keyOf(el), r = recent[key], now = Date.now();
    if (el.__cuVal !== undefined) from = el.__cuVal;                       /* elemen sama berganti nilai: hitung dari nilai lama */
    else if (r && now - r.at < 4000) {                                     /* render ulang cepat */
      if (r.t === txt) { el.__cuVal = p.v; return; }
      from = r.val;
    }
    el.__cuVal = p.v; recent[key] = { t: txt, val: p.v, at: now };
    if (from === p.v) return;
    run(el, p, from);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) { if (node && node.nodeType === 3) node = node.parentElement; else return; }
    if (!node) return;
    if (node.matches && node.matches(SEL)) consider(node);
    if (node.querySelectorAll) { var l = node.querySelectorAll(SEL); for (var i = 0; i < l.length; i++) consider(l[i]); }
    var up = node.closest && node.closest(SEL); if (up && up !== node) consider(up);
  }

  function start() {
    scan(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') scan(m.target.parentElement);
        else { if (m.target.nodeType === 1 && m.target.matches && m.target.matches(SEL)) scan(m.target); for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]); }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    /* modul yang dibuka lagi (tampil kembali): ulangi hitungan angkanya */
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('a[href^="#"], .nav a, .tchip, .avatar')) return;
      setTimeout(function () { Object.keys(recent).forEach(function (k) { delete recent[k]; }); document.querySelectorAll(SEL).forEach(function (el) { if (!el.__cuRun) { el.__cuFinal = null; el.__cuVal = undefined; } }); scan(document.body); }, 120);
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
