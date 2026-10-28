/* =====================================================================
   PIXEL — senja 8-bit: T-Rex berlari & melompati kaktus, kawanan burung,
   ayam berjalan, tiga lapis gunung bersalju, matahari retro, awan.
   Digambar di kanvas resolusi rendah lalu diperbesar (image-rendering:pixelated),
   jadi sangat murah: ±50 ribu piksel per frame.
   ===================================================================== */
(function () {
  'use strict';
  var MO = window.MyOffice = window.MyOffice || {};
  var C = MO.cosmos; if (!C) return;
  var rand = C.rand, TAU = C.TAU;

  /* ---------- Palet ---------- */
  var SKY = ['#1b1446', '#271a5c', '#36227a', '#512d8e', '#7c3a95', '#b44d80', '#e8645f', '#ff8c5a', '#ffb868', '#ffd98a'];
  var COL = {
    sun1: '#fff0a8', sun2: '#ffd36b', sun3: '#ff9d5c', sun4: '#ff6f5c',
    m1: '#5a3f8f', m1s: '#f7d9ff', m2: '#3d2b72', m2s: '#d9b8ff', m3: '#271a52',
    ground: '#2b1b4e', ground2: '#3a2766', line: '#ff9d5c', dash: '#5b4290'
  };

  /* ---------- Sprite (piksel = karakter) ---------- */
  function sprite(rows, map, shade) {
    var h = rows.length, w = 0, i, j; rows.forEach(function (r) { if (r.length > w) w = r.length; });
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d');
    for (j = 0; j < h; j++) for (i = 0; i < rows[j].length; i++) {
      var ch = rows[j].charAt(i), col = map[ch]; if (!col) continue;
      if (shade && ch === '#') {
        var below = rows[j + 1] ? rows[j + 1].charAt(i) : '.', above = rows[j - 1] ? rows[j - 1].charAt(i) : '.';
        if (below === '.' || below === '') col = shade.dark; else if (above === '.' || above === '') col = shade.light;
      }
      x.fillStyle = col; x.fillRect(i, j, 1, 1);
    }
    return c;
  }

  var DINO_BODY = [
    '..........########....',
    '.........##########...',
    '.........#w########...',
    '.........##########...',
    '.........##########...',
    '.........#######......',
    '.........#####........',
    '.........#####........',
    '.........######.......',
    '#........#######......',
    '##......#########.....',
    '###....##########.#...',
    '####..###########.##..',
    '.#################....',
    '..###############.....',
    '...##############.....',
    '.....############.....'
  ];
  var DINO_LEGS_A = [
    '......#####..#####....',
    '......####....####....',
    '......####.....###....',
    '......###......###....',
    '......####.....####...'
  ];
  var DINO_LEGS_B = [
    '......#####..#####....',
    '......####...####.....',
    '......####..###.......',
    '......###.............',
    '......####............'
  ];
  var DM = { '#': '#78e07f', w: '#ffffff' }, DSH = { dark: '#3fa85a', light: '#a8f5a0' };

  var CHICK = [
    '.....RR.......',
    '....RWW.......',
    '....WKWY......',
    '....WWWR......',
    '....WWW.......',
    'W..WWWWWWW....',
    'WW.WWWWWWWW...',
    '.WWWWWWWWWW...',
    '..WWWGWWWWW...',
    '...WWGGWWW....',
    '....WWWWWW....'
  ];
  var CHICK_LEGS_A = ['.....Y..Y.....', '.....Y..YY....'];
  var CHICK_LEGS_B = ['.....Y..Y.....', '....YY...Y....'];
  var CM = { R: '#ff4d4d', W: '#fffaf0', K: '#1a1030', Y: '#ffd23f', G: '#d6cfe0' };

  var BIRD_A = ['#.......#', '##.....##', '.##.#.##.', '..#####..', '....#....'];
  var BIRD_B = ['....#....', '..#####..', '.#######.', '##..#..##', '#...#...#'];
  var BM = { '#': '#140b2e' };

  var CACT = [
    '...###...', '...###...', '#..###..#', '#..###..#', '##.###.##',
    '.#######.', '...###...', '...###...', '...###...', '...###...'
  ];
  var CACM = { '#': '#46b86a' }, CSH = { dark: '#2f8a4e', light: '#7be39a' };

  var CLOUD = [
    '....####........',
    '..########..##..',
    '.############### ',
    '################.',
    '.##############..'
  ];
  var CLM = { '#': 'rgba(255,170,190,.55)' };

  /* ---------- Keadaan ---------- */
  var cv, ctx, s = 5, LW = 0, LH = 0, gy = 0, t = 0;
  var skyC, grdC, mtn = [], sprDino = [], sprChick = [], sprBird = [], sprCact, sprCloud, stars = [];
  var dino, cacti, birds, clouds, chicken, nextCactus, nextBird, off = [0, 0, 0, 0];
  var SPEED = 86;

  function build() {
    var i, x;
    // sprite
    sprDino = [sprite(DINO_BODY.concat(DINO_LEGS_A), DM, DSH), sprite(DINO_BODY.concat(DINO_LEGS_B), DM, DSH)];
    sprChick = [sprite(CHICK.concat(CHICK_LEGS_A), CM), sprite(CHICK.concat(CHICK_LEGS_B), CM)];
    sprBird = [sprite(BIRD_A, BM), sprite(BIRD_B, BM)];
    sprCact = sprite(CACT, CACM, CSH); sprCloud = sprite(CLOUD, CLM);

    // langit berpita dengan dither di batas pita
    skyC = document.createElement('canvas'); skyC.width = LW; skyC.height = LH; x = skyC.getContext('2d');
    var nb = SKY.length, bh = gy / nb, y;
    for (y = 0; y < gy; y++) {
      var b = Math.min(nb - 1, (y / bh) | 0), edge = y - b * bh;
      x.fillStyle = SKY[b]; x.fillRect(0, y, LW, 1);
      if (b < nb - 1 && edge > bh - 3) {            // dither papan catur ke pita berikutnya
        x.fillStyle = SKY[b + 1];
        for (i = (y & 1); i < LW; i += 2) x.fillRect(i, y, 1, 1);
      }
    }
    // gunung: tiga lapis periodik (bisa digulung tanpa sambungan)
    mtn = [
      ridge(LW, gy, .46, COL.m1, COL.m1s, 3, 5, .62),
      ridge(LW, gy, .32, COL.m2, COL.m2s, 2, 6, .72),
      ridge(LW, gy, .2, COL.m3, null, 4, 7, 1)
    ];
    // tanah
    grdC = document.createElement('canvas'); grdC.width = LW; grdC.height = LH; x = grdC.getContext('2d');
    x.fillStyle = COL.ground; x.fillRect(0, gy, LW, LH - gy);
    x.fillStyle = COL.line; x.fillRect(0, gy, LW, 1);
    x.fillStyle = COL.ground2; x.fillRect(0, gy + 1, LW, 2);
    x.fillStyle = COL.dash;
    for (i = 0; i < LW; i += (rand(6, 18) | 0)) x.fillRect(i, gy + 4 + ((Math.random() * 3) | 0), (rand(2, 6) | 0), 1);
    for (i = 0; i < LW; i += (rand(8, 22) | 0)) x.fillRect(i, gy + 10 + ((Math.random() * (LH - gy - 12 > 0 ? LH - gy - 12 : 1)) | 0), (rand(1, 4) | 0), 1);

    stars = [];
    for (i = 0; i < 46; i++) stars.push({ x: (Math.random() * LW) | 0, y: (Math.random() * gy * .5) | 0, p: rand(0, TAU), f: rand(.8, 2.6) });
  }

  // punggung gunung: puncak lancip = 1-|sin|, k bilangan bulat agar periodik
  function ridge(w, base, hFrac, body, snow, k1, k2, snowLine) {
    var c = document.createElement('canvas'); c.width = w; c.height = LH; var x = c.getContext('2d');
    var amp = base * hFrac, ph1 = rand(0, TAU), ph2 = rand(0, TAU), i, y;
    for (i = 0; i < w; i++) {
      var a = 1 - Math.abs(Math.sin(i / w * Math.PI * k1 + ph1)), b = 1 - Math.abs(Math.sin(i / w * Math.PI * k2 + ph2));
      var hh = (a * .72 + b * .28) * amp, top = Math.round(base - hh);
      x.fillStyle = body; x.fillRect(i, top, 1, base - top + 1);
      if (snow && hh > amp * snowLine) {                       // salju di dekat puncak, tepi bawahnya bergerigi
        var sd = Math.round((hh - amp * snowLine) * .9) + ((i * 7 + k1) % 3 === 0 ? 1 : 0);
        x.fillStyle = snow; x.fillRect(i, top, 1, sd);
      }
      if (i % 2 === 0 && hh > 3) { x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(i, top + 2, 1, base - top - 1); } // sisi gelap bergaris
    }
    return c;
  }

  function reset() {
    dino = { x: Math.round(LW * .2), y: 0, vy: 0, air: false, f: 0, ft: 0 };
    cacti = []; birds = []; clouds = [];
    for (var i = 0; i < 4; i++) clouds.push({ x: rand(0, LW), y: rand(LH * .08, gy * .45), v: rand(4, 9) });
    chicken = { x: rand(LW * .1, LW * .5), y: gy + Math.max(9, (LH - gy) * .42), f: 0, ft: 0, wait: 0 };
    nextCactus = 1.4; nextBird = 2.5;
  }

  function size() {
    var W = window.innerWidth, H = window.innerHeight;
    s = Math.max(3, Math.min(6, Math.round(W / 280)));
    LW = Math.ceil(W / s) + 2; LH = Math.ceil(H / s) + 1;
    gy = Math.round(LH * (H / W > 1.3 ? .9 : .8));      // layar tinggi (HP): tanah lebih rendah agar T-Rex tidak tertutup kartu
    cv.width = LW; cv.height = LH;
    cv.style.cssText = 'left:50%;bottom:0;top:auto;width:' + (LW * s) + 'px;height:' + (LH * s) + 'px;transform:translateX(-50%)';
    cv.classList.add('px');
    ctx.imageSmoothingEnabled = false;
    build(); reset();
  }

  function scroll(layer, o) {                        // gulung periodik, 2 salinan
    var x = -(o % LW | 0); ctx.drawImage(layer, x, 0); ctx.drawImage(layer, x + LW, 0);
  }

  function sun() {
    var cx = Math.round(LW * .74), cy = gy - Math.round(LH * .2), r = Math.round(LH * .12), y, dx;
    for (y = -r; y <= r; y++) {
      if (y > 0 && ((y / 2 | 0) % 3 === 2)) continue;            // sela horizontal ala matahari retro
      dx = Math.round(Math.sqrt(r * r - y * y));
      ctx.fillStyle = y < -r * .35 ? COL.sun1 : y < r * .2 ? COL.sun2 : y < r * .6 ? COL.sun3 : COL.sun4;
      ctx.fillRect(cx - dx, cy + y, dx * 2 + 1, 1);
    }
  }

  function frame(now, dt) {
    t += dt; var i, o;
    ctx.drawImage(skyC, 0, 0);
    // bintang berkedip
    ctx.fillStyle = '#fff';
    for (i = 0; i < stars.length; i++) { o = stars[i]; if (Math.sin(t * o.f + o.p) > .15) ctx.fillRect(o.x, o.y, 1, 1); }
    sun();
    // awan
    for (i = 0; i < clouds.length; i++) {
      o = clouds[i]; o.x -= o.v * dt; if (o.x < -20) { o.x = LW + 4; o.y = rand(LH * .08, gy * .45); }
      ctx.drawImage(sprCloud, o.x | 0, o.y | 0);
    }
    // gunung berparalaks
    off[0] += 3 * dt; off[1] += 8 * dt; off[2] += 20 * dt; off[3] += SPEED * dt;
    scroll(mtn[0], off[0]); scroll(mtn[1], off[1]); scroll(mtn[2], off[2]);

    // burung
    nextBird -= dt;
    if (nextBird <= 0) {
      var n = 1 + ((Math.random() * 5) | 0), by = rand(LH * .1, gy * .5), sp = rand(22, 38), bx = LW + 12;
      for (i = 0; i < n; i++) birds.push({ x: bx + i * 9, y: by + Math.abs(i - (n - 1) / 2) * 4 + (i % 2) * 1, v: sp, p: rand(0, TAU) });
      nextBird = rand(5, 10);
    }
    var fl = (t * 6 | 0) & 1;
    for (i = birds.length - 1; i >= 0; i--) {
      o = birds[i]; o.x -= o.v * dt;
      if (o.x < -12) { birds.splice(i, 1); continue; }
      ctx.drawImage(sprBird[(fl + (i & 1)) & 1], o.x | 0, (o.y + Math.sin(t * 2 + o.p) * 1.5) | 0);
    }

    // tanah
    ctx.drawImage(grdC, 0, 0, LW, LH);
    // garis tanah & kerikil bergulir: gambar ulang potongan tanah dengan offset
    ctx.drawImage(grdC, 0, gy + 3, LW, LH - gy - 3, -(off[3] % LW | 0), gy + 3, LW, LH - gy - 3);
    ctx.drawImage(grdC, 0, gy + 3, LW, LH - gy - 3, LW - (off[3] % LW | 0), gy + 3, LW, LH - gy - 3);

    // kaktus
    nextCactus -= dt;
    if (nextCactus <= 0) {
      cacti.push({ x: LW + 6, n: Math.random() < .3 ? 2 : 1 });
      nextCactus = rand(2.2, 4.6);
    }
    var jumpNow = false, cw = 9, dw = 19;                     // jarak depan T-Rex (kepala) dari x sprite
    for (i = cacti.length - 1; i >= 0; i--) {
      o = cacti[i]; o.x -= SPEED * dt;
      var wid = o.n === 2 ? cw * 2 + 1 : cw;
      if (o.x < -wid - 4) { cacti.splice(i, 1); continue; }
      ctx.drawImage(sprCact, o.x | 0, gy - CACT.length + 1);
      if (o.n === 2) ctx.drawImage(sprCact, (o.x + cw + 1) | 0, gy - CACT.length + 1);
      var gap = o.x - (dino.x + dw);
      if (!dino.air && gap > -2 && gap < SPEED * .17) jumpNow = true;
    }
    // T-Rex: lompat otomatis
    if (jumpNow) { dino.air = true; dino.vy = 112; }
    if (dino.air) {
      dino.y += dino.vy * dt; dino.vy -= 320 * dt;
      if (dino.y <= 0) { dino.y = 0; dino.vy = 0; dino.air = false; }
    }
    dino.ft += dt; if (dino.ft > .11) { dino.ft = 0; dino.f ^= 1; }
    ctx.drawImage(sprDino[dino.air ? 0 : dino.f], dino.x, (gy - 22 + 1 - dino.y) | 0);

    // ayam berjalan di depan
    o = chicken;
    if (o.wait > 0) { o.wait -= dt; }
    else {
      o.x += 17 * dt; o.ft += dt; if (o.ft > .16) { o.ft = 0; o.f ^= 1; }
      if (o.x > LW + 14) { o.x = -20; o.wait = rand(2, 6); o.y = gy + Math.max(9, (LH - gy) * rand(.3, .6)); }
    }
    ctx.drawImage(sprChick[o.f], o.x | 0, (o.y - 13 + (o.f ? 0 : 1)) | 0);
  }

  C.register('pixel', {
    start: function () { cv = C.cv; ctx = C.ctx; t = 0; size(); },
    stop: function () { cv.classList.remove('px'); },
    resize: function () { size(); },
    frame: frame
  });
})();
