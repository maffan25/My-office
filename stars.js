/* Latar bintang bergerak untuk bagian paling atas (hero) dan paling bawah (footer).
   Ringan: canvas hanya berjalan saat terlihat, jeda saat tab disembunyikan atau jendela ASTA terbuka. */
(function () {
  "use strict";
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var TINT = ["255,255,255", "255,255,255", "255,255,255", "248,210,74", "248,210,74", "150,230,205"];

  function Field(host, density, shoot, cap) {
    var cv = document.createElement("canvas"), cx = cv.getContext("2d");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block";
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.style.isolation = "isolate";
    host.appendChild(cv);
    var W = 0, H = 0, stars = [], star = null, nextShoot = 2 + Math.random() * 3, visible = false, last = 0, raf = 0, acc = 0, t = 0;

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function seed() {
      var n = Math.max(24, Math.min(cap || 150, Math.round(W * H / density)));
      if (document.documentElement.dataset.lite === "1") n = Math.round(n / 2);
      stars = [];
      for (var i = 0; i < n; i++) {
        var z = Math.random();                       /* 0 jauh ... 1 dekat */
        stars.push({
          x: Math.random() * W, y: Math.random() * H, z: z,
          r: 0.55 + z * 1.35, v: 3 + z * 13,
          ph: Math.random() * 6.28, sp: rnd(0.6, 2.2),
          c: TINT[(Math.random() * TINT.length) | 0],
          sparkle: z > 0.86
        });
      }
    }
    function size() {
      var r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cx.setTransform(DPR, 0, 0, DPR, 0, 0); seed(); draw(0);
    }
    function draw(dt) {
      cx.clearRect(0, 0, W, H);
      t += dt;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.v * dt * 0.8; s.y -= s.v * dt * 0.45;      /* melayang pelan ke kanan atas */
        if (s.x > W + 4) s.x = -4; if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
        var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.ph + t * s.sp));
        cx.fillStyle = "rgba(" + s.c + "," + (a * (0.55 + s.z * 0.45)).toFixed(3) + ")";
        cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.2832); cx.fill();
        if (s.sparkle) {
          var L = 3 + 4 * a; cx.strokeStyle = "rgba(" + s.c + "," + (a * 0.55).toFixed(3) + ")"; cx.lineWidth = 0.8;
          cx.beginPath(); cx.moveTo(s.x - L, s.y); cx.lineTo(s.x + L, s.y); cx.moveTo(s.x, s.y - L); cx.lineTo(s.x, s.y + L); cx.stroke();
        }
      }
      if (shoot && !reduce && document.documentElement.dataset.lite !== "1") {
        if (!star) { nextShoot -= dt; if (nextShoot <= 0) { star = { x: rnd(W * 0.35, W * 1.05), y: rnd(-10, H * 0.35), life: 0, len: rnd(90, 150), sp: rnd(520, 700) }; nextShoot = rnd(5, 9); } }
        else {
          star.life += dt; var d = star.sp * dt; star.x -= d * 0.86; star.y += d * 0.5;
          var f = Math.max(0, 1 - star.life / 1.1), tx = star.x + star.len * 0.86, ty = star.y - star.len * 0.5;
          var g = cx.createLinearGradient(star.x, star.y, tx, ty);
          g.addColorStop(0, "rgba(255,244,190," + (0.95 * f).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,244,190,0)");
          cx.strokeStyle = g; cx.lineWidth = 1.6; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(star.x, star.y); cx.lineTo(tx, ty); cx.stroke();
          if (star.life > 1.1 || star.x < -160 || star.y > H + 160) star = null;
        }
      }
    }
    function paused() { var ai = document.getElementById("ai-app"); return document.hidden || document.documentElement.classList.contains("win-open") || (ai && !ai.hidden); }
    function loop(now) {
      raf = 0; if (!visible) return;
      if (paused()) { last = 0; raf = requestAnimationFrame(loop); return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      acc += dt;
      if (acc >= 1 / 40) { draw(acc); acc = 0; }               /* ~40 gambar per detik */
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { rootMargin: "80px" }).observe(host);
    } else { visible = true; start(); }
    if ("ResizeObserver" in window) new ResizeObserver(function () { if (Math.abs(host.clientWidth - W) > 1 || Math.abs(host.clientHeight - H) > 1) size(); }).observe(host);
    window.addEventListener("resize", size);
    size();
  }

  /* MyOffice: satu langit bintang di belakang seluruh aplikasi */
  var sky = document.querySelector(".bg .stack");
  if (sky) Field(sky, 6500, true, 240);
})();
