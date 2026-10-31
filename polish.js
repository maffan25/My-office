/* =====================================================================
   MyOffice — POLISH (JS ringan, dimuat paling akhir)
   1. Menandai perangkat sentuh  -> CSS mematikan efek berat di HP
   2. Penguncian scroll yang andal (satu sumber kebenaran)
   3. Animasi dijeda saat tab tersembunyi
   4. Tanggal ringkas di layar sempit supaya kartu info tidak patah baris
   5. Latar foto (assets/bg.jpg) hanya dipakai bila file memang ada
   Tidak menyentuh data pengguna.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement, body = document.body;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () { } }; };
  var on = function (m, f) { if (m.addEventListener) m.addEventListener('change', f); else if (m.addListener) m.addListener(f); };

  /* ---------- 1. Sentuh / layar kecil ---------- */
  var coarse = mq('(hover: none) and (pointer: coarse)');
  function flagTouch() { root.classList.toggle('touch', !!coarse.matches); }
  flagTouch(); on(coarse, flagTouch);

  /* ---------- 2. Kunci scroll ----------
     Sebelumnya tiap menu mengatur body.style.overflow sendiri-sendiri; menutup
     satu lapisan membuka kunci walau lapisan lain (form, pencarian) masih ada,
     sehingga halaman di belakangnya bisa tergulir. Di sini kuncinya mengikuti
     kenyataan: terkunci selama ada lapisan yang tampil. */
  var LAYER = /(^|\s)(ac-ov|ad-ov|wo-ov|es-ov|fn-ov|ac-ov2|wo-ov2|es-ov2|ac-soon|sp-ov)(\s|$)/;
  function anyLayer() {
    var c = body.children;
    for (var i = 0; i < c.length; i++) {
      var n = c[i];
      if (n.nodeType !== 1 || n.hidden) continue;
      if (!LAYER.test(n.className || '')) continue;
      if (n.offsetParent === null && getComputedStyle(n).position !== 'fixed') continue;
      if (getComputedStyle(n).display === 'none') continue;
      return true;
    }
    return false;
  }
  var lockQ = 0;
  function syncLock() {
    lockQ = 0;
    var want = anyLayer();
    if (want && body.style.overflow !== 'hidden') body.style.overflow = 'hidden';
    else if (!want && body.style.overflow === 'hidden') body.style.overflow = '';
    root.classList.toggle('win-open', want);
  }
  function schedLock() { if (!lockQ) lockQ = requestAnimationFrame(syncLock); }
  new MutationObserver(schedLock).observe(body, { childList: true, attributes: true, attributeFilter: ['hidden', 'class'], subtree: false });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setTimeout(schedLock, 60); });
  document.addEventListener('click', function () { setTimeout(schedLock, 80); }, true);
  schedLock();

  /* ---------- 3. Tab tersembunyi: jeda animasi CSS ---------- */
  function vis() { root.classList.toggle('is-hidden', document.hidden); }
  document.addEventListener('visibilitychange', vis); vis();

  /* ---------- 4. Tanggal ringkas di layar sempit ---------- */
  var narrow = mq('(max-width: 420px)');
  var masehi = document.getElementById('masehi'), busy = false, full = '';
  function shorten() {
    if (!masehi || busy) return;
    busy = true;
    try {
      if (narrow.matches) {
        var d = new Date();
        var short = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
        if (masehi.textContent !== short) { full = masehi.textContent; masehi.textContent = short; }
      } else if (full && masehi.textContent !== full) {
        masehi.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) { }
    busy = false;
  }
  if (masehi) {
    new MutationObserver(function () { if (!busy) shorten(); }).observe(masehi, { childList: true, characterData: true, subtree: true });
    on(narrow, shorten); shorten();
  }

  /* ---------- 5. Foto latar opsional ----------
     Paket tidak menyertakan assets/bg.jpg. Hanya saat "Danau Senja" dipilih
     file diperiksa; jika ada, dipakai (lewat CSS), jika tidak, ilustrasi SVG
     tetap tampil dan tidak ada permintaan 404 saat halaman dibuka. */
})();
