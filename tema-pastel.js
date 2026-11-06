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
