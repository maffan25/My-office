/* MyOffice Finance — Analisis keuangan: KPI, skor kesehatan, grafik SVG, proyeksi, dan insight otomatis.
   Membaca data dari finance.js lewat MyOffice.fin (tidak mengubah data apa pun). */
(function () {
  'use strict';
  const MO = window.MyOffice, X = MO && MO.fin; if (!X) return;
  const K = MO.kit, esc = K.esc, rp = K.rp, by = K.by, fd = K.fd, todayS = K.todayS;
  const D = X.D, st = X.st, pad = n => ('0' + n).slice(-2);
  const PAL = ['#1d5fb4', '#d92b2b', '#f08a3c', '#1f9d8a', '#7a5cc7', '#e0a526', '#2f9e5e', '#d8508a', '#6b3d2a', '#5d7287'];
  const GOOD = '#18814b', WARN = '#e8951a', BAD = '#d92b2b';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dec = x => x.toFixed(1).replace('.', ',').replace(/,0$/, '');
  const nice = v => { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const scale = (mn, mx) => { mn = Math.min(0, mn); mx = Math.max(1, mx); const step = nice((mx - mn) / 4); return { step, lo: Math.floor(mn / step + 1e-9) * step, hi: Math.ceil(mx / step - 1e-9) * step }; };
  const short = n => { const a = Math.abs(n), s = n < 0 ? '−' : ''; return a >= 1e9 ? s + dec(a / 1e9) + ' M' : a >= 1e6 ? s + dec(a / 1e6) + ' jt' : a >= 1e3 ? s + Math.round(a / 1e3) + ' rb' : s + Math.round(a); };
  const dim = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const ds = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const mname = (ym, o) => new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', o || { month: 'short' });
  const lab = (m, i) => (i === 0 || m.slice(5) === '01') ? mname(m) + ' ' + m.slice(2, 4) : mname(m);
  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const wd = date => (new Date(date + 'T00:00:00').getDay() + 6) % 7;

  /* ---------- perhitungan ---------- */
  function calc() {
    const m = st.m, pm = X.addM(m, -1), cur = todayS().slice(0, 7), ms = [];
    for (let i = st.rng - 1; i >= 0; i--) ms.push(X.addM(m, -i));
    const inc = X.sum('Income', m), exp = X.sum('Expense', m), pinc = X.sum('Income', pm), pexp = X.sum('Expense', pm);
    const net = inc - exp, sr = inc > 0 ? net / inc * 100 : null, total = X.total();
    const e3 = [0, 1, 2].map(i => X.sum('Expense', X.addM(m, -i))).filter(v => v > 0);
    const avgExp = e3.length ? e3.reduce((a, b) => a + b, 0) / e3.length : 0;
    const runway = avgExp > 0 && total > 0 ? total / avgExp : (avgExp > 0 ? 0 : null);
    const eb = X.expBy(m), pb = X.expBy(pm), n = dim(m), isCur = m === cur, dayNow = isCur ? +todayS().slice(8) : (m < cur ? n : 0);
    const daily = Array(n).fill(0);
    D.tx.forEach(t => { if (t.type === 'Expense' && t.date.slice(0, 7) === m) daily[+t.date.slice(8, 10) - 1] += +t.amount || 0; });
    const avgDay = dayNow ? exp / dayNow : 0, proj = isCur ? avgDay * n : exp;
    const buds = X.expCats().map(c => ({ c, b: X.budFor(c.id, m) })).filter(x => x.b).map(x => { const sp = eb[x.c.id] || 0, lim = +x.b.limit || 0; return { c: x.c, sp, lim, p: X.pc(sp, lim) }; });
    const goals = D.goal.filter(g => g.status === 'Aktif').map(g => ({ g, got: X.got(g), p: X.pc(X.got(g), +g.target) }));
    return { m, pm, cur, ms, inc, exp, pinc, pexp, net, sr, total, avgExp, runway, eb, pb, n, isCur, dayNow, daily, avgDay, proj, buds, goals };
  }

  function health(c) {
    const P = [];
    if (c.sr != null) P.push({ k: 'Tingkat tabungan', w: 30, s: clamp(c.sr / 20 * 100, 0, 100), d: Math.round(c.sr) + '% dari pemasukan (target ≥ 20%)' });
    if (c.runway != null) P.push({ k: 'Dana darurat', w: 25, s: clamp(c.runway / 6 * 100, 0, 100), d: dec(c.runway) + ' bulan pengeluaran (ideal ≥ 6)' });
    if (c.buds.length) { const ok = c.buds.filter(b => b.p <= 100).length; P.push({ k: 'Kepatuhan anggaran', w: 20, s: ok / c.buds.length * 100, d: ok + ' dari ' + c.buds.length + ' anggaran aman' }); }
    if (c.pexp > 0 && c.exp >= 0) { const ch = (c.exp - c.pexp) / c.pexp * 100; P.push({ k: 'Tren pengeluaran', w: 15, s: clamp(75 - ch * 2.5, 0, 100), d: (ch > 0 ? 'naik ' : 'turun ') + Math.abs(Math.round(ch)) + '% dari bulan lalu' }); }
    if (c.goals.length) { const a = c.goals.reduce((x, g) => x + g.p, 0) / c.goals.length; P.push({ k: 'Progres target', w: 10, s: clamp(a, 0, 100), d: Math.round(a) + '% rata-rata target aktif' }); }
    if (!P.length) return null;
    const W = P.reduce((a, p) => a + p.w, 0), score = P.reduce((a, p) => a + p.s * p.w, 0) / W;
    const lv = score >= 80 ? ['Sangat sehat', GOOD] : score >= 65 ? ['Sehat', GOOD] : score >= 50 ? ['Cukup, perlu perhatian', WARN] : score >= 35 ? ['Waspada', WARN] : ['Kritis', BAD];
    const sorted = P.slice().sort((a, b) => b.s - a.s);
    return { score, label: lv[0], col: lv[1], P, best: sorted[0], worst: sorted[sorted.length - 1] };
  }

  function balAt(date) {
    const act = new Set(D.acc.filter(a => a.active).map(a => a.id)); let b = 0;
    D.acc.forEach(a => { if (act.has(a.id)) b += +a.opening || 0; });
    D.tx.forEach(t => {
      if (t.date > date) return; const x = +t.amount || 0;
      if (t.type === 'Income') { if (act.has(t.accId)) b += x; }
      else if (t.type === 'Expense') { if (act.has(t.accId)) b -= x; }
      else if (t.type === 'Transfer') { if (act.has(t.accId)) b -= x; if (act.has(t.toAccId)) b += x; }
    });
    return b;
  }

  function weekdayAvg(ms) {
    const a = ms[0] + '-01', last = ms[ms.length - 1], endS = last + '-' + pad(dim(last)), lim = endS > todayS() ? todayS() : endS;
    const tot = Array(7).fill(0), cnt = Array(7).fill(0);
    if (lim < a) return tot;
    for (let d = new Date(a + 'T00:00:00'); ds(d) <= lim; d.setDate(d.getDate() + 1)) cnt[(d.getDay() + 6) % 7]++;
    D.tx.forEach(t => { if (t.type === 'Expense' && t.date >= a && t.date <= lim) tot[wd(t.date)] += +t.amount || 0; });
    return tot.map((v, i) => cnt[i] ? v / cnt[i] : 0);
  }

  /* ---------- grafik SVG ---------- */
  const grid = (W, L, Rr, T, ph, lo, hi, y, step) => { let s = ''; for (let v = lo; v <= hi + step / 1e3; v += step) { const yy = y(v).toFixed(1); s += `<line x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}" class="an-gl"/><text x="${L - 8}" y="${+yy + 4}" text-anchor="end" class="an-t">${short(v)}</text>`; } return s; };

  function cashflow(ms) {
    const R = ms.map(m => { const i = X.sum('Income', m), e = X.sum('Expense', m); return { m, i, e, n: i - e }; });
    const { lo, hi, step } = scale(Math.min(0, ...R.map(r => r.n)), Math.max(1, ...R.map(r => Math.max(r.i, r.e, r.n))));
    const W = 640, H = 270, L = 54, Rr = 14, T = 16, B = 32, pw = W - L - Rr, ph = H - T - B, y = v => T + ph * (1 - (v - lo) / (hi - lo)), y0 = y(0), gw = pw / R.length, bw = Math.min(30, gw * .3);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Grafik pemasukan, pengeluaran, dan selisih per bulan">` + grid(W, L, Rr, T, ph, lo, hi, y, step) + `<line x1="${L}" x2="${W - Rr}" y1="${y0}" y2="${y0}" class="an-ax"/>`;
    const pts = [];
    R.forEach((r, i) => {
      const cx = L + gw * (i + .5); pts.push([cx, y(r.n), r]);
      [[r.i, '#1d5fb4', -bw - 2, 'Pemasukan'], [r.e, BAD, 2, 'Pengeluaran']].forEach(([v, col, dx, nm]) => { const h = Math.max(0, y0 - y(v)); if (v > 0) s += `<rect class="an-bar" x="${(cx + dx).toFixed(1)}" y="${(y0 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${col}"><title>${nm} ${mname(r.m, { month: 'long', year: 'numeric' })}: ${rp(v)}</title></rect>`; });
      s += `<text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle" class="an-t">${lab(r.m, i)}</text>`;
    });
    s += `<polyline class="an-net" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none"/>`;
    pts.forEach(p => { s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" class="an-dot" stroke="${p[2].n >= 0 ? GOOD : WARN}"><title>Selisih ${mname(p[2].m, { month: 'long', year: 'numeric' })}: ${p[2].n < 0 ? '−' : ''}${rp(Math.abs(p[2].n))}</title></circle>`; });
    return { svg: s + '</svg>', R };
  }

  function area(pts, id, color) {
    const W = 640, H = 250, L = 54, Rr = 22, T = 18, B = 30, pw = W - L - Rr, ph = H - T - B, vs = pts.map(p => p.v);
    const { lo, hi, step } = scale(Math.min(...vs, 0), Math.max(...vs, 1));
    const y = v => T + ph * (1 - (v - lo) / (hi - lo)), x = i => pts.length < 2 ? L + pw / 2 : L + pw * i / (pts.length - 1), y0 = y(0);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join('');
    let s = `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Tren saldo"><defs><linearGradient id="ag${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".34"/><stop offset="1" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs>` + grid(W, L, Rr, T, ph, lo, hi, y, step);
    s += `<path d="${line}L${x(pts.length - 1).toFixed(1)} ${y0.toFixed(1)}L${x(0).toFixed(1)} ${y0.toFixed(1)}Z" fill="url(#ag${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p, i) => { s += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="#fff" stroke="${color}" stroke-width="2.5"><title>${p.l}: ${p.v < 0 ? '−' : ''}${rp(Math.abs(p.v))}</title></circle>`; if (pts.length <= 7 || i === pts.length - 1) s += `<text x="${x(i).toFixed(1)}" y="${(y(p.v) - 10).toFixed(1)}" text-anchor="middle" class="an-t b">${short(p.v)}</text>`; s += `<text x="${x(i).toFixed(1)}" y="${H - 9}" text-anchor="middle" class="an-t">${p.s}</text>`; });
    return s + '</svg>';
  }

  function dailyChart(c) {
    const W = 640, H = 230, L = 54, Rr = 12, T = 14, B = 28, pw = W - L - Rr, ph = H - T - B, sc = scale(0, Math.max(...c.daily, c.avgDay, 1)), hi = sc.hi, step = sc.step, y = v => T + ph * (1 - v / hi), gw = pw / c.n, bw = Math.max(3, gw * .68), top = c.daily.indexOf(Math.max(...c.daily));
    let s = `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Pengeluaran harian">` + grid(W, L, Rr, T, ph, 0, hi, y, step);
    c.daily.forEach((v, i) => { const cx = L + gw * (i + .5), h = Math.max(0, y(0) - y(v)); if (v > 0) s += `<rect class="an-bar" x="${(cx - bw / 2).toFixed(1)}" y="${(y(0) - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2).toFixed(1)}" fill="${i === top ? BAD : '#1d5fb4'}"><title>Tanggal ${i + 1}: ${rp(v)}</title></rect>`; if (i === 0 || (i + 1) % 5 === 0 || (i === c.n - 1 && c.n % 5 >= 3)) s += `<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" class="an-t">${i + 1}</text>`; });
    if (c.avgDay > 0) s += `<line x1="${L}" x2="${W - Rr}" y1="${y(c.avgDay).toFixed(1)}" y2="${y(c.avgDay).toFixed(1)}" class="an-avg"/><text x="${W - Rr}" y="${(y(c.avgDay) - 5).toFixed(1)}" text-anchor="end" class="an-t b" fill="${WARN}">rata-rata ${short(c.avgDay)}/hari</text>`;
    return s + '</svg>';
  }

  function donut(sl, total) {
    const r = 78, C = 2 * Math.PI * r; let off = 0, s = `<svg viewBox="0 0 220 220" class="an-donut" role="img" aria-label="Komposisi pengeluaran per kategori">`;
    sl.forEach(x => { const len = x.v / total * C; s += `<circle cx="110" cy="110" r="${r}" fill="none" stroke="${x.col}" stroke-width="34" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 110 110)"><title>${esc(x.name)}: ${rp(x.v)} (${Math.round(x.v / total * 100)}%)</title></circle>`; off += len; });
    return s + `<text x="110" y="104" text-anchor="middle" class="an-t">Total keluar</text><text x="110" y="128" text-anchor="middle" class="an-dc">${short(total)}</text></svg>`;
  }

  function gauge(score, col) {
    const L = Math.PI * 80;
    return `<svg viewBox="0 0 200 118" class="an-gauge" role="img" aria-label="Skor kesehatan keuangan ${Math.round(score)} dari 100"><path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="var(--cr3)" stroke-width="16" stroke-linecap="round"/><path class="an-arc" d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(score / 100 * L).toFixed(1)} ${L.toFixed(1)}"/><text x="100" y="88" text-anchor="middle" class="an-gs" fill="${col}">${Math.round(score)}</text><text x="100" y="110" text-anchor="middle" class="an-t">dari 100</text></svg>`;
  }

  /* ---------- insight otomatis ---------- */
  function insights(c, h) {
    const L = [], add = (k, t) => L.push({ k, t }), mlb = mname(c.m, { month: 'long' });
    if (c.inc > 0) {
      if (c.sr >= 20) add('good', `Kamu menyisihkan <b>${Math.round(c.sr)}%</b> dari pemasukan bulan ini. Itu di atas target sehat 20%.`);
      else if (c.sr >= 0) add('warn', `Tingkat tabungan baru <b>${Math.round(c.sr)}%</b>. Untuk mencapai 20% sisihkan <b>${rp(c.inc * .2 - c.net)}</b> lagi.`);
      else add('bad', `Pengeluaran melebihi pemasukan sebesar <b>${rp(-c.net)}</b> pada ${mlb}. Uang keluar lebih besar dari yang masuk.`);
    } else if (c.exp > 0) add('warn', `Belum ada pemasukan tercatat di ${mlb}, padahal sudah keluar <b>${rp(c.exp)}</b>. Catat pemasukanmu agar analisis akurat.`);
    const cats = Object.keys(c.eb).map(id => ({ id, v: c.eb[id] })).sort((a, b) => b.v - a.v);
    if (cats.length && c.exp > 0) { const t = cats[0], p = t.v / c.exp * 100, nm = X.cn(t.id); add(p > 50 ? 'warn' : 'info', `Pengeluaran terbesar ada di <b>${esc(nm)}</b>: ${rp(t.v)} (${Math.round(p)}% dari total).${p > 50 ? ' Lebih dari separuh uang keluarmu ada di satu kategori.' : ''}`); }
    if (c.pexp > 0 && c.exp > 0) { const ch = (c.exp - c.pexp) / c.pexp * 100; if (Math.abs(ch) >= 10) add(ch > 0 ? 'warn' : 'good', `Pengeluaran ${ch > 0 ? 'naik' : 'turun'} <b>${Math.abs(Math.round(ch))}%</b> dibanding bulan lalu (${rp(c.pexp)} → ${rp(c.exp)}).`); }
    if (c.runway != null) { const r = c.runway; add(r >= 6 ? 'good' : r >= 3 ? 'info' : r >= 1 ? 'warn' : 'bad', `Total saldo cukup untuk sekitar <b>${dec(r)} bulan</b> pengeluaran (rata-rata ${rp(c.avgExp)}/bulan). ${r >= 6 ? 'Dana daruratmu sudah kuat.' : r >= 3 ? 'Targetkan 6 bulan sebagai dana darurat ideal.' : 'Dana darurat tipis, prioritaskan menabung.'}`); }
    const over = c.buds.filter(b => b.p > 100), near = c.buds.filter(b => b.p >= 80 && b.p <= 100);
    if (over.length) add('bad', `Anggaran <b>${over.map(b => esc(b.c.name)).join(', ')}</b> sudah terlampaui (total lebih ${rp(over.reduce((a, b) => a + b.sp - b.lim, 0))}).`);
    if (near.length) add('warn', `Anggaran <b>${near.map(b => esc(b.c.name)).join(', ')}</b> hampir habis (≥ 80%).`);
    if (c.isCur && c.dayNow >= 5 && c.exp > 0) { add(c.inc > 0 && c.proj > c.inc ? 'warn' : 'info', `Dengan laju sekarang (<b>${rp(c.avgDay)}/hari</b>), pengeluaran akhir bulan diperkirakan <b>${rp(c.proj)}</b>${c.inc > 0 ? (c.proj > c.inc ? ', melebihi pemasukan bulan ini.' : ', masih di bawah pemasukan.') : '.'}`); }
    const wa = weekdayAvg(c.ms), mxW = Math.max(...wa);
    if (mxW > 0) { const i = wa.indexOf(mxW); add('info', `Hari paling boros: <b>${DAYS[i]}</b> (rata-rata ${rp(mxW)} per hari dalam ${st.rng} bulan terakhir).`); }
    const f = {}; D.tx.forEach(t => { if (t.type !== 'Expense' || t.date.slice(0, 7) !== c.m) return; const raw = (t.desc || '').trim(), q = +((raw.match(/×(\d+)$/) || [])[1]) || 1, nm = raw.replace(/ ×\d+$/, '') || X.cn(t.catId), k = nm.toLowerCase(); f[k] = f[k] || { nm, n: 0, v: 0 }; f[k].n += q; f[k].v += +t.amount || 0; });
    const fr = Object.values(f).filter(x => x.n >= 4 && c.exp > 0 && x.v / c.exp >= .05).sort((a, b) => b.v - a.v)[0];
    if (fr) add('warn', `<b>${esc(fr.nm)}</b> kamu beli ${fr.n}× bulan ini, total ${rp(fr.v)} (${Math.round(fr.v / c.exp * 100)}% pengeluaran). Pengeluaran kecil yang berulang paling mudah dihemat.`);
    if (!c.goals.length) add('info', 'Belum ada target tabungan aktif. Target yang jelas membantu uang sisa benar-benar ditabung.');
    const ord = { bad: 0, warn: 1, info: 2, good: 3 };
    return L.sort((a, b) => ord[a.k] - ord[b.k]).slice(0, 8);
  }

  /* ---------- tampilan ---------- */
  const card = (cls, t, sub, body) => `<section class="an-c ${cls}"><h3>${t}</h3>${sub ? `<p class="an-sub">${sub}</p>` : ''}${body}</section>`;
  const chip = (cur, prev, badUp) => { if (!(prev > 0)) return cur > 0 ? '<em class="an-d">bulan lalu belum ada data</em>' : ''; const p = (cur - prev) / prev * 100; if (Math.abs(p) < 1) return '<em class="an-d">stabil vs bulan lalu</em>'; const up = p > 0, good = badUp ? !up : up; return `<em class="an-d ${good ? 'g' : 'b'}">${up ? '▲' : '▼'} ${Math.abs(Math.round(p))}% vs bulan lalu</em>`; };
  const none = t => `<p class="an-none">${t}</p>`;
  const kpi = (cls, t, v, e) => `<div class="an-k ${cls}"><small>${t}</small><b>${v}</b>${e || ''}</div>`;

  function view() {
    const c = calc(), h = health(c), L = c.ms;
    const head = X.mon() + `<div class="fn-chips an-rng" role="group" aria-label="Rentang tren">${[3, 6, 12].map(n => `<button aria-pressed="${st.rng === n}" data-a="rng" data-v="${n}">${n} bulan</button>`).join('')}</div>`;
    if (!D.tx.length) return head + X.empty('Belum ada transaksi, jadi belum ada yang bisa dianalisis. Catat pemasukan dan pengeluaranmu, lalu grafik dan skor kesehatan keuangan akan muncul di sini.', '<button class="fn-btn" data-a="tab" data-t="menu">Catat pengeluaran pertama</button>');
    const act = D.acc.filter(a => a.active);
    let o = `<div class="an-kp">${kpi('main', 'Total saldo', rp(c.total), `<em class="an-d">${act.length} akun aktif${c.runway != null ? ' · cukup ±' + dec(c.runway) + ' bulan' : ''}</em>`)}${kpi('', 'Pemasukan', `<span class="pos">${rp(c.inc)}</span>`, chip(c.inc, c.pinc, false))}${kpi('', 'Pengeluaran', `<span class="neg">${rp(c.exp)}</span>`, chip(c.exp, c.pexp, true))}${kpi('', c.net >= 0 ? 'Sisa bulan ini' : 'Defisit bulan ini', `<span class="${c.net >= 0 ? 'pos' : 'neg'}">${c.net < 0 ? '−' : ''}${rp(Math.abs(c.net))}</span>`, `<em class="an-d">${c.sr != null ? 'Tingkat tabungan ' + Math.round(c.sr) + '%' : 'Belum ada pemasukan'}</em>`)}</div><div class="an">`;

    /* skor kesehatan */
    if (h) {
      const sum = `Kondisi keuanganmu <b style="color:${h.col}">${h.label.toLowerCase()}</b>. ${h.P.length > 1 ? `Yang sudah baik: <b>${h.best.k.toLowerCase()}</b>. Yang perlu dibenahi: <b>${h.worst.k.toLowerCase()}</b>.` : ''}`;
      o += card('s5', 'Skor kesehatan keuangan', 'Gabungan tabungan, dana darurat, anggaran, tren belanja, dan target.', `<div class="an-hl">${gauge(h.score, h.col)}<b class="an-lv" style="color:${h.col}">${h.label}</b></div><p class="an-sum">${sum}</p><div class="an-pt">${h.P.map(p => `<div><span>${p.k}<small>${p.d}</small></span><div class="fn-meter"><i class="${p.s >= 65 ? '' : p.s >= 40 ? 'warn' : 'bad'}" style="width:${p.s}%"></i></div><em>${Math.round(p.s)}</em></div>`).join('')}</div>`);
    } else o += card('s5', 'Skor kesehatan keuangan', '', none('Skor muncul setelah ada pemasukan atau pengeluaran di bulan ini.'));
    const ins = insights(c, h), ic = { good: '✅', warn: '⚠️', bad: '🚨', info: '💡' };
    o += card('s7', 'Temuan otomatis', `Dibaca dari datamu di ${mname(c.m, { month: 'long', year: 'numeric' })}.`, ins.length ? `<ul class="an-ins">${ins.map(i => `<li class="k-${i.k}"><i>${ic[i.k]}</i><span>${i.t}</span></li>`).join('')}</ul>` : none('Belum cukup data untuk membuat temuan.'));

    /* arus kas */
    const cf = cashflow(L);
    o += card('s7', 'Arus kas bulanan', 'Biru = pemasukan, merah = pengeluaran, garis = selisih. Titik hijau berarti kamu surplus, oranye berarti defisit.', `<div class="an-lg"><span class="a">Pemasukan</span><span class="b">Pengeluaran</span><span class="c">Selisih</span></div>${cf.svg}<details class="an-det"><summary>Lihat angka per bulan</summary><div class="an-tw"><table class="an-tb"><thead><tr><th>Bulan</th><th>Masuk</th><th>Keluar</th><th>Selisih</th><th>Tabung</th></tr></thead><tbody>${cf.R.slice().reverse().map(r => `<tr><td>${mname(r.m, { month: 'short', year: 'numeric' })}</td><td>${rp(r.i)}</td><td>${rp(r.e)}</td><td class="${r.n >= 0 ? 'pos' : 'neg'}">${r.n < 0 ? '−' : ''}${rp(Math.abs(r.n))}</td><td>${r.i > 0 ? Math.round(r.n / r.i * 100) + '%' : '–'}</td></tr>`).join('')}</tbody></table></div></details>`);

    /* donut */
    const cats = Object.keys(c.eb).map(id => ({ id, v: c.eb[id] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    let dn; if (cats.length) {
      const top = cats.slice(0, 6).map((x, i) => ({ name: X.cn(x.id), v: x.v, col: PAL[i], cat: by(D.cat, x.id) })), rest = cats.slice(6).reduce((a, x) => a + x.v, 0); if (rest > 0) top.push({ name: 'Lainnya (' + (cats.length - 6) + ')', v: rest, col: '#b9a99c' });
      dn = `<div class="an-dn">${donut(top, c.exp)}<ul class="an-lgd">${top.map(x => `<li><i style="background:${x.col}"></i><span>${x.cat ? X.cic(x.cat) + ' ' : ''}${esc(x.name)}</span><b>${Math.round(x.v / c.exp * 100)}%</b><small>${rp(x.v)}</small></li>`).join('')}</ul></div>`;
    } else dn = none('Belum ada pengeluaran di bulan ini.');
    o += card('s5', 'Ke mana uangmu pergi', 'Porsi pengeluaran per kategori bulan ini.', dn);

    /* tren saldo */
    const pts = L.map((m, i) => { const e = m + '-' + pad(dim(m)), d = e > todayS() ? todayS() : e; return { l: mname(m, { month: 'long', year: 'numeric' }), s: lab(m, i), v: balAt(d) }; });
    const dlt = pts[pts.length - 1].v - pts[0].v;
    o += card('s7', 'Tren total saldo', `Saldo akhir tiap bulan. Dalam ${L.length} bulan terakhir saldo ${dlt >= 0 ? 'naik' : 'turun'} <b class="${dlt >= 0 ? 'pos' : 'neg'}">${rp(Math.abs(dlt))}</b>.`, area(pts, 'nw', '#1d5fb4'));

    /* akun */
    const pos = act.map(a => ({ a, b: X.bal(a) })).sort((x, y) => y.b - x.b), tp = pos.reduce((a, x) => a + Math.max(0, x.b), 0);
    o += card('s5', 'Komposisi saldo per akun', 'Di mana uangmu disimpan.', pos.length ? `<div class="an-bars">${pos.map((x, i) => `<div><span>${esc(x.a.name)}<small>${esc(x.a.type)}</small></span><div class="fn-meter"><i style="width:${tp ? clamp(Math.max(0, x.b) / tp * 100, 0, 100) : 0}%;background:${x.b < 0 ? BAD : PAL[i % PAL.length]}"></i></div><b class="${x.b < 0 ? 'neg' : ''}">${x.b < 0 ? '−' : ''}${rp(Math.abs(x.b))}</b></div>`).join('')}</div>` : none('Belum ada akun aktif.'));

    /* harian + proyeksi */
    const mxD = Math.max(...c.daily), topDay = mxD > 0 ? c.daily.indexOf(mxD) + 1 : 0;
    o += card('s8', 'Pengeluaran harian', 'Batang merah = hari paling boros. Garis putus-putus = rata-rata harian.', c.exp > 0 ? dailyChart(c) : none('Belum ada pengeluaran di bulan ini.'));
    const tb = c.buds.reduce((a, b) => a + b.lim, 0), pr = (l, v, cl) => `<div><span>${l}</span><b class="${cl || ''}">${v}</b></div>`;
    o += card('s4', c.isCur ? 'Proyeksi akhir bulan' : 'Ringkasan bulan', c.isCur ? `Hari ke-${c.dayNow} dari ${c.n}, diperkirakan dari laju belanjamu.` : 'Statistik pengeluaran bulan terpilih.', `<div class="an-pr">${pr('Rata-rata per hari', rp(c.isCur ? c.avgDay : c.exp / c.n))}${pr(c.isCur ? 'Perkiraan total keluar' : 'Total keluar', rp(c.proj), c.inc > 0 && c.proj > c.inc ? 'neg' : '')}${c.isCur && c.inc > 0 ? pr('Perkiraan sisa', (c.inc - c.proj < 0 ? '−' : '') + rp(Math.abs(c.inc - c.proj)), c.inc - c.proj >= 0 ? 'pos' : 'neg') : ''}${topDay ? pr('Hari terboros', 'Tgl ' + topDay + ' · ' + rp(mxD)) : ''}${tb ? pr('Total anggaran', rp(tb)) : ''}${pr('Jumlah transaksi', D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === c.m).length + ' keluar')}</div>`);

    /* anggaran */
    o += card('s6', 'Anggaran vs realisasi', 'Seberapa banyak batas belanja sudah terpakai.', c.buds.length ? `<div class="an-bd">${c.buds.sort((a, b) => b.p - a.p).map(b => `<div><i class="fn-ico">${X.cic(b.c)}</i><div><b>${esc(b.c.name)}</b><small>${rp(b.sp)} / ${rp(b.lim)}</small>${X.meter(b.p)}</div><em class="${b.p > 100 ? 'neg' : b.p >= 80 ? 'wn' : 'pos'}">${Math.round(b.p)}%<small>${b.p > 100 ? 'Melebihi' : b.p >= 80 ? 'Hampir habis' : 'Aman'}</small></em></div>`).join('')}</div>` : none('Belum ada anggaran untuk bulan ini.') + '<button class="fn-btn sm" data-a="godom" data-v="bud">Atur anggaran</button>');

    /* pola hari */
    const wa = weekdayAvg(L), mw = Math.max(...wa);
    o += card('s6', 'Pola belanja per hari', `Rata-rata pengeluaran tiap hari dalam ${L.length} bulan terakhir.`, mw > 0 ? `<div class="an-bars wk">${wa.map((v, i) => `<div><span>${DAYS[i]}</span><div class="fn-meter"><i class="${v === mw ? 'bad' : ''}" style="width:${v / mw * 100}%"></i></div><b>${rp(v)}</b></div>`).join('')}</div>` : none('Belum cukup data.'));

    /* tabel kategori */
    const ids = Array.from(new Set(Object.keys(c.eb).concat(Object.keys(c.pb)))).map(id => ({ id, a: c.eb[id] || 0, b: c.pb[id] || 0 })).sort((x, y) => y.a - x.a || y.b - x.b);
    o += card('s7', 'Kategori: bulan ini vs bulan lalu', 'Merah = pengeluaran naik, hijau = turun.', ids.length ? `<div class="an-tw"><table class="an-tb"><thead><tr><th>Kategori</th><th>Bulan ini</th><th class="hm">Bulan lalu</th><th>Ubah</th></tr></thead><tbody>${ids.map(r => { const d = r.b > 0 ? (r.a - r.b) / r.b * 100 : null; return `<tr><td>${X.cic(by(D.cat, r.id))} ${esc(X.cn(r.id))}<small>${c.exp ? Math.round(r.a / c.exp * 100) : 0}% dari total</small></td><td>${rp(r.a)}</td><td class="hm">${rp(r.b)}</td><td class="${d == null ? '' : d > 0 ? 'neg' : d < 0 ? 'pos' : ''}">${d == null ? (r.a > 0 ? 'baru' : '–') : (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(Math.round(d)) + '%'}</td></tr>`; }).join('')}</tbody></table></div>` : none('Belum ada data pengeluaran.'));

    /* top 5 */
    const t5 = D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === c.m).sort((a, b) => (+b.amount || 0) - (+a.amount || 0)).slice(0, 5);
    o += card('s5', '5 pengeluaran terbesar', 'Transaksi tunggal paling besar bulan ini.', t5.length ? t5.map(X.txRow).join('') : none('Belum ada pengeluaran.'));

    /* sumber pemasukan */
    const ib = {}; D.tx.filter(t => t.type === 'Income' && t.date.slice(0, 7) === c.m).forEach(t => ib[t.catId] = (ib[t.catId] || 0) + (+t.amount || 0));
    const il = Object.keys(ib).map(id => ({ id, v: ib[id] })).sort((a, b) => b.v - a.v);
    o += card('s5', 'Sumber pemasukan', 'Dari mana uang masuk bulan ini.', il.length ? `<div class="an-bars">${il.map((x, i) => `<div><span>${X.cic(by(D.cat, x.id))} ${esc(X.cn(x.id))}</span><div class="fn-meter"><i style="width:${x.v / c.inc * 100}%;background:${PAL[(i + 3) % PAL.length]}"></i></div><b>${rp(x.v)}</b></div>`).join('')}</div>` : none('Belum ada pemasukan bulan ini.'));

    /* target */
    const avgC = g => { const mm = [0, 1, 2].map(i => X.addM(c.cur, -i)), v = D.con.filter(x => x.goalId === g.id && mm.includes(x.date.slice(0, 7))).reduce((a, x) => a + (+x.amount || 0), 0) / 3; return v; };
    o += card('s7', 'Progres target tabungan', 'Estimasi dihitung dari rata-rata setoran 3 bulan terakhir.', c.goals.length ? `<div class="an-gl2">${c.goals.map(x => { const left = Math.max(0, +x.g.target - x.got), ac = avgC(x.g), mo = ac > 0 ? Math.ceil(left / ac) : null; let est = x.p >= 100 ? 'Target tercapai 🎉' : mo ? 'Estimasi tercapai ±' + mo + ' bulan lagi' : 'Belum ada setoran rutin'; if (x.g.date && x.p < 100) { const dl = Math.round((new Date(x.g.date) - new Date(todayS())) / 864e5); est += ' · batas ' + fd(x.g.date) + (dl < 0 ? ' (lewat)' : ''); } return `<div><div class="an-gh"><b>${esc(x.g.name)}</b><em>${Math.round(x.p)}%</em></div>${X.meter(Math.min(x.p, 100))}<small>${rp(x.got)} dari ${rp(x.g.target)} · ${est}</small></div>`; }).join('')}</div>` : none('Belum ada target tabungan aktif.') + '<button class="fn-btn sm" data-a="godom" data-v="goal">Buat target</button>');

    return head + o + '</div><p class="an-foot">Semua angka dihitung dari data di perangkat ini. Transfer antar akun tidak dihitung sebagai pemasukan atau pengeluaran.</p>';
  }

  X.views.ana = view;
})();
