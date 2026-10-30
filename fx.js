/* MyOffice — fx.js: animasi klik universal (tekan + pantul + riak) untuk semua tombol.
   Memakai delegasi event sehingga ikut berlaku pada tombol yang dibuat belakangan oleh render ulang. */
(function () {
  'use strict';
  if (window.__fxClick) return; window.__fxClick = 1;
  var D = document;
  var SEL = 'button,[role=button],[role=tab],a[href],summary,label.ac-chip,.chip,.wall,.es-card,.kc-d,.tk-d,.ad-d,[data-act],[data-a],input[type=checkbox],input[type=radio],input[type=submit],input[type=button]';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)');
  var canWA = typeof Element !== 'undefined' && !!Element.prototype.animate;
  var held = null;

  function target(e) {
    var t = e.target; if (!t || !t.closest) return null;
    var el = t.closest(SEL); if (!el) return null;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('fx-off') || el.closest('.fx-off')) return null;
    return el;
  }
  function depth(el) {
    var r = el.getBoundingClientRect(), m = Math.min(r.width, r.height);
    return m > 160 ? .985 : m > 70 ? .965 : m > 30 ? .93 : .85;
  }
  function ripple(el, x, y) {
    var r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    var cs = getComputedStyle(el), host = D.createElement('div'), dot = D.createElement('i');
    host.className = 'fx-ripple-host'; dot.className = 'fx-ripple';
    host.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border-radius:' + cs.borderRadius + ';color:' + cs.color;
    var cx = x == null ? r.width / 2 : Math.max(0, Math.min(r.width, x - r.left)), cy = y == null ? r.height / 2 : Math.max(0, Math.min(r.height, y - r.top));
    var rad = Math.max(Math.hypot(cx, cy), Math.hypot(r.width - cx, cy), Math.hypot(cx, r.height - cy), Math.hypot(r.width - cx, r.height - cy));
    dot.style.cssText = 'left:' + (cx - rad) + 'px;top:' + (cy - rad) + 'px;width:' + rad * 2 + 'px;height:' + rad * 2 + 'px';
    host.appendChild(dot); D.body.appendChild(host);
    setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 650);
  }
  function press(el) {
    if (!canWA || reduce.matches) return null;
    try { return el.animate([{ scale: '1' }, { scale: String(depth(el)) }], { duration: 110, easing: 'ease-out', fill: 'forwards' }); } catch (e) { return null; }
  }
  function release(el, a) {
    if (!canWA || reduce.matches) return;
    try {
      if (a) a.cancel();
      var d = depth(el);
      el.animate([{ scale: String(d) }, { scale: String(1 + (1 - d) * .55), offset: .55 }, { scale: '1' }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    } catch (e) { }
  }
  function end() { if (held) { var h = held; held = null; release(h.el, h.a); } }

  D.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var el = target(e); if (!el) return;
    if (el.matches('input[type=checkbox],input[type=radio]')) return;
    end(); ripple(el, e.clientX, e.clientY); held = { el: el, a: press(el) };
  }, true);
  ['pointerup', 'pointercancel', 'dragstart', 'contextmenu'].forEach(function (n) { D.addEventListener(n, end, true); });
  addEventListener('blur', end);

  /* keyboard (Enter / Space) → klik tanpa pointer */
  D.addEventListener('click', function (e) {
    if (e.detail !== 0) return;
    var el = target(e); if (!el || el.matches('input[type=checkbox],input[type=radio]')) return;
    ripple(el, null, null); release(el, press(el));
  }, true);

  /* centang / radio / switch */
  D.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.matches || !t.matches('input[type=checkbox],input[type=radio]')) return;
    if (reduce.matches) return;
    t.classList.remove('fx-check'); void t.offsetWidth; t.classList.add('fx-check');
    setTimeout(function () { t.classList.remove('fx-check'); }, 340);
  }, true);
})();
