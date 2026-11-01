/* perf.js — penjaga kelancaran: deteksi FPS otomatis, class .touch, dan pemuatan bank soal saat idle. */
(function () {
  'use strict';
  var root = document.documentElement;
  var MO = window.MyOffice = window.MyOffice || {};
  var saved = null; try { saved = localStorage.getItem('mo-lite'); } catch (e) { }

  /* layar sentuh → class .touch (dipakai v6.css) */
  try { if (matchMedia('(pointer:coarse)').matches) root.classList.add('touch'); } catch (e) { }

  /* ---- Probe FPS: ukur ±2 dtk; jika rata-rata frame lambat, otomatis aktifkan mode hemat ---- */
  var probing = false;
  function probe(ms) {
    if (probing || saved !== null || root.dataset.lite === '1' || document.hidden) return;
    probing = true;
    var n = 0, sum = 0, last = 0, t0 = 0;
    (function f(now) {
      if (document.hidden) { probing = false; return; }
      if (!t0) t0 = now;
      if (last) { var d = now - last; if (d < 250) { sum += d; n++; } }   // abaikan lonjakan jeda tab
      last = now;
      if (now - t0 < ms) return requestAnimationFrame(f);
      probing = false;
      if (n > 20 && sum / n > 26 && MO.cosmos && MO.cosmos.setLite) MO.cosmos.setLite(true, false);  // < ±38 fps
    })(0);
  }
  window.addEventListener('load', function () { setTimeout(function () { probe(2200); }, 1200); });
  new MutationObserver(function () {                      // jendela modul baru dibuka → ukur lagi
    if (root.classList.contains('win-open')) setTimeout(function () { probe(1800); }, 700);
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ---- Bank soal (±190 KB) dimuat saat browser menganggur, bukan menghambat tampilan awal ---- */
  var banksLoaded = false;
  MO.loadBanks = function () {
    if (banksLoaded) return; banksLoaded = true;
    var s = document.createElement('script'); s.src = 'banks.js'; s.async = false; document.head.appendChild(s);
  };
  window.addEventListener('load', function () {
    (window.requestIdleCallback || function (f) { return setTimeout(f, 900); })(MO.loadBanks, { timeout: 2500 });
  });
})();
