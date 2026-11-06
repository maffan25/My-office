/* Gerak ikon menu 3D.
   - Muncul: dimainkan saat ikon pertama kali terlihat di layar (bukan saat halaman dimuat, karena menu ada di bawah layar HP).
   - Klik: ikon bergerak dulu (~0,7 dtk), baru modul dibuka.
   Gaya gerak tiap ikon ada di fresh.css (.nav a[href] .ic). */
(function () {
  var nav = document.querySelector('.nav'); if (!nav) return;
  var root = document.documentElement, links = [].slice.call(nav.querySelectorAll('a'));
  var mm = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)');
  if (mm && mm.matches) return;
  root.classList.add('mo-anim');
  var icOf = function (a) { return a.querySelector('.ic'); };

  /* ---- muncul saat terlihat ---- */
  var show = function (a, i) { var ic = icOf(a); if (!ic || ic._in) return; ic._in = 1; ic.style.setProperty('--d', (i * 0.13).toFixed(2) + 's'); ic.classList.add('ic-in'); };
  if ('IntersectionObserver' in window) {
    var seen = 0, io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target, seen++ % 4 + Math.floor(links.indexOf(e.target) / 4) * 0); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    links.forEach(function (a) { io.observe(a); });
  } else links.forEach(show);

  /* ---- klik: gerak dulu, lalu buka ---- */
  var play = function (a) {
    var ic = icOf(a); if (!ic) return;
    ic.classList.remove('ic-go'); void ic.getBoundingClientRect(); ic.classList.add('ic-go');
    clearTimeout(ic._t); ic._t = setTimeout(function () { ic.classList.remove('ic-go'); }, 1300);
  };
  window.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.nav a'); if (!a || !nav.contains(a)) return;
    if (a._pass) { a._pass = 0; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (a._busy) return; a._busy = 1; play(a);
    setTimeout(function () { a._busy = 0; a._pass = 1; a.click(); }, 650);
  }, true);
})();
