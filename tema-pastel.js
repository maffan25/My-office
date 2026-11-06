/* TEMA PASTEL — menandai menu yang sedang dibuka di <html data-menu="...">
   supaya CSS tema-pastel.css bisa memberi warna karakter tiap menu. */
(function () {
  function wire() {
    var M = window.MyOffice;
    if (!M || !M.routes) return;
    Object.keys(M.routes).forEach(function (k) {
      var fn = M.routes[k];
      if (typeof fn !== 'function' || fn.__tema) return;
      var name = k.replace(/^#/, '');
      var wrapped = function () {
        document.documentElement.setAttribute('data-menu', name);
        return fn.apply(this, arguments);
      };
      wrapped.__tema = true;
      M.routes[k] = wrapped;
    });
  }
  wire();
  document.addEventListener('DOMContentLoaded', wire);
})();

/* Deteksi kontras: teks di atas latar gelap (termasuk gradien) dibuat putih */
(function () {
  var OV = '.ac-ov:not([hidden]),.ad-ov:not([hidden]),.wo-ov:not([hidden]),.es-ov:not([hidden]),.fn-ov:not([hidden])';
  function parse(c) { var m = c && c.match(/[\d.]+/g); if (!m) return null; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] }; }
  function lum(p) { return (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255; }
  function effectiveLum(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      var cs = getComputedStyle(e), p = parse(cs.backgroundColor);
      if (p && p.a > 0.5) return lum(p);
      var bi = cs.backgroundImage;
      if (bi && bi.indexOf('gradient') > -1) {
        var cols = bi.match(/rgba?\([^)]*\)/g) || [], s = 0, n = 0;
        cols.forEach(function (c) { var q = parse(c); if (q && q.a > 0.5) { s += lum(q); n++; } });
        if (n) return s / n;
      }
    }
    return 1;
  }
  function scan() {
    document.querySelectorAll(OV).forEach(function (root) {
      root.querySelectorAll('*').forEach(function (el) {
        var text = false;
        for (var i = 0; i < el.childNodes.length; i++) {
          var n = el.childNodes[i];
          if (n.nodeType === 3 && n.nodeValue.trim()) { text = true; break; }
        }
        if (!text) return;
        var dark = effectiveLum(el) < 0.42;
        if (dark) el.setAttribute('data-tdark', '');
        else if (el.hasAttribute('data-tdark')) el.removeAttribute('data-tdark');
      });
    });
  }
  var t = null;
  function queue() { clearTimeout(t); t = setTimeout(scan, 60); }
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  queue();
})();
