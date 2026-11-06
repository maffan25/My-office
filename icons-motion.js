/* Gerak ikon menu 3D: muncul (saat pertama tampil) + klik. Gaya per ikon ada di fresh.css (.nav a[href] .ic). */
(function () {
  const nav = document.querySelector('.nav'); if (!nav) return;
  const go = a => {
    const ic = a.querySelector('.ic'); if (!ic) return;
    ic.classList.remove('ic-go'); void ic.getBoundingClientRect(); ic.classList.add('ic-go');
    clearTimeout(ic._t); ic._t = setTimeout(() => ic.classList.remove('ic-go'), 1100);
  };
  nav.addEventListener('pointerdown', e => { const a = e.target.closest('a'); if (a && nav.contains(a)) go(a); });
  nav.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const a = e.target.closest('a'); if (a) go(a); } });
})();
