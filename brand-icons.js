/* brand-icons.js — logo di dalam tiap menu = ikon 3D milik menu itu sendiri (sama dengan ikon di beranda).
   Memakai window.IC3D (icons-3d.js). Tanpa latar; ukurannya diatur di beresin.css. */
(function () {
  'use strict';
  var MAP = { academic: 'academic', work: 'work', org: 'org', project: 'project', task: 'task', cal: 'cal', fin: 'fin', goal: 'goal', doc: 'doc', ana: 'chart', set: 'set' };
  function icon(k, cls) {
    var d = window.IC3D && window.IC3D[k];
    if (!d) return '';
    return '<svg viewBox="0 0 100 100" class="lv lv-' + k + ' lv-on bi ' + (cls || '') + '" overflow="visible" aria-hidden="true" focusable="false" fill="none" stroke="none">' + d + '</svg>';
  }
  window.MOBrandIcon = icon;

  function apply() {
    var r = document;
    [['.wo-logo', 'work'], ['.es-logo', 'org']].forEach(function (p) {
      r.querySelectorAll(p[0] + ':not([data-bi])').forEach(function (e) { e.setAttribute('data-bi', 1); e.innerHTML = icon(p[1]); });
    });
    r.querySelectorAll('.ad-logo svg.ad-mk:not(.bi)').forEach(function (e) {
      var t = document.createElement('div'); t.innerHTML = icon('academic', 'ad-mk'); if (t.firstChild) e.replaceWith(t.firstChild);
    });
    r.querySelectorAll('.rd-logo svg.rd-owl:not(.bi)').forEach(function (e) {
      var t = document.createElement('div'); t.innerHTML = icon('doc', 'rd-owl'); if (t.firstChild) e.replaceWith(t.firstChild);
    });
    r.querySelectorAll('.ac-brand .ac-bd:not([data-bi])').forEach(function (e) {
      var o = e.closest('[data-sf]'), k = o && MAP[o.getAttribute('data-sf')];
      if (!k) return; e.setAttribute('data-bi', 1); e.innerHTML = icon(k);
    });
  }
  var q = 0;
  function sched() { if (q) return; q = requestAnimationFrame(function () { q = 0; apply(); }); }
  function start() { apply(); new MutationObserver(sched).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
